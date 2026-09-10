#!/usr/bin/env bash
set -euo pipefail
umask 077

# ABI: reproduce-c08.sh ROOT WORK_ROOT.
# C08 reproduction: rebuild the C07 manifest-listed recipe/content/evidence in the delivery
# checkout using a PRIVATE Git index and a PRIVATE Git directory, then declare readiness.
# It computes no package OID, writes no object into the common store, creates no canonical
# path in the active worktree, and never commits or pushes.
usage() { printf '%s\n' 'usage: reproduce-c08.sh ROOT WORK_ROOT'; }
if [[ ${1:-} == --help ]]; then usage; exit 0; fi
if (( $# != 2 )); then usage >&2; exit 64; fi
ROOT=$1
WORK_ROOT=$2
CHANGE=openspec/changes/migrate-control-tower-plan-zones
MIG="$CHANGE/migration"
if [[ ! "$ROOT" = /* || ! -d "$ROOT" ]]; then printf '%s\n' 'ROOT must be an existing absolute directory' >&2; exit 64; fi
if [[ ! "$WORK_ROOT" = /* ]]; then printf '%s\n' 'WORK_ROOT must be an absolute directory' >&2; exit 64; fi
if [[ -e "$WORK_ROOT" ]] && [[ -n "$(find "$WORK_ROOT" -mindepth 1 -print -quit)" ]]; then printf '%s\n' 'WORK_ROOT must be absent or empty' >&2; exit 64; fi

PD="$WORK_ROOT/.c08-private-git"
OUT="$WORK_ROOT/.c08-output"
PI="$PD/c08.index"
common_run() { env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_OPTIONAL_LOCKS "$@"; }
common_git() { common_run git -C "$ROOT" "$@"; }
private_run() { env GIT_DIR="$PD" GIT_WORK_TREE="$WORK_ROOT" GIT_INDEX_FILE="$PI" GIT_OPTIONAL_LOCKS=0 "$@"; }
private_git() { private_run git "$@"; }
digest() { sha256sum "$1" | awk '{print $1}'; }

# Preconditions: the active worktree must still be free of canonical paths and clean.
test ! -e "$ROOT/openspec/plan.yaml"
test ! -e "$ROOT/openspec/ROADMAP.md"
test ! -d "$ROOT/openspec/archive/legacy-planning"
test -z "$(common_git status --porcelain=v1)"

COMMON_GIT="$(common_git rev-parse --git-common-dir)"
[[ "$COMMON_GIT" = /* ]] || COMMON_GIT="$ROOT/$COMMON_GIT"
COMMON_GIT="$(cd -- "$COMMON_GIT" && pwd -P)"
HEAD_COMMIT="$(common_git rev-parse HEAD)"

mkdir -p "$OUT"
common_git for-each-ref --format='%(refname) %(objectname)' | sort > "$OUT/common-refs-before.txt"
common_git cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype)' | sort > "$OUT/common-objects-before.txt"

common_run git init --bare -q "$PD"
common_run git --git-dir="$PD" config core.bare false
mkdir -p "$PD/objects/info"
printf '%s\n' "$COMMON_GIT/objects" > "$PD/objects/info/alternates"
: > "$PI"

# 1. Start from the delivery checkout's own HEAD, not from a synthetic assembly head.
private_git read-tree "$HEAD_COMMIT"

# 2. Promote the proven candidate plan and verify it against the C07 manifest.
PLAN_BLOB="$(private_git hash-object -w "$ROOT/$MIG/candidate/plan.yaml")"
private_git update-index --add --cacheinfo "100644,$PLAN_BLOB,openspec/plan.yaml"

# 3. Materialize the index into the work root so Radar can render the ROADMAP from it.
BOOT_TREE="$(private_git write-tree)"
BOOT_COMMIT="$(private_run env GIT_AUTHOR_NAME='C08 reproduction' GIT_AUTHOR_EMAIL='c08@local.invalid' \
  GIT_COMMITTER_NAME='C08 reproduction' GIT_COMMITTER_EMAIL='c08@local.invalid' \
  git commit-tree "$BOOT_TREE" -m 'c08 private reproduction subject')"
private_git update-ref --no-deref HEAD "$BOOT_COMMIT"
private_git checkout-index -a -f

( cd "$WORK_ROOT/agent-workflows/tools/radar" && private_run go run . render \
    -f "$WORK_ROOT/openspec/plan.yaml" -o "$WORK_ROOT/openspec/ROADMAP.generated.md" -C "$WORK_ROOT" ) \
  > "$OUT/render.stdout" 2> "$OUT/render.stderr"
ROADMAP_BLOB="$(private_git hash-object -w "$WORK_ROOT/openspec/ROADMAP.generated.md")"
private_git update-index --add --cacheinfo "100644,$ROADMAP_BLOB,openspec/ROADMAP.md"

# 4. Copy every archive destination byte-faithfully and retire the active legacy views.
common_run bun -e '
  const y = Bun.YAML.parse(await Bun.file(process.argv[1]).text())
  for (const e of y.entries) console.log(`${e.source_commit ?? y.source_commit}\t${e.source_path}\t${e.destination}\t${e.activation_treatment}`)
' "$ROOT/$MIG/archive-inventory.yaml" > "$OUT/archive-plan.tsv"

ARCHIVE_COPIES=0
ARCHIVE_RETIREMENTS=0
while IFS=$'\t' read -r source_commit source_path destination treatment; do
  entry="$(common_git ls-tree "$source_commit" -- "$source_path")"
  mode="$(awk '{print $1}' <<<"$entry")"
  blob="$(awk '{print $3}' <<<"$entry")"
  test "$mode" = 100644
  test -n "$blob"
  private_git update-index --add --cacheinfo "$mode,$blob,$destination"
  ARCHIVE_COPIES=$((ARCHIVE_COPIES + 1))
  if [[ "$treatment" = retire-active-view-and-archive-byte-faithfully ]]; then
    private_git update-index --force-remove -- "$source_path"
    ARCHIVE_RETIREMENTS=$((ARCHIVE_RETIREMENTS + 1))
  fi
done < "$OUT/archive-plan.tsv"

# 5. Verify content identity against the frozen C07 manifest. No package OID is computed.
common_run bun -e '
  const m = Bun.YAML.parse(await Bun.file(process.argv[1]).text())
  const [planBlob, roadmapBlob, copies, retirements] = process.argv.slice(2)
  const fail = []
  if (m.content.plan.blob !== planBlob) fail.push(`plan blob ${planBlob} != manifest ${m.content.plan.blob}`)
  if (m.content.roadmap.blob !== roadmapBlob) fail.push(`roadmap blob ${roadmapBlob} != manifest ${m.content.roadmap.blob}`)
  if (m.content.archives.entries !== Number(copies)) fail.push(`archive copies ${copies} != manifest ${m.content.archives.entries}`)
  if (m.content.archives.retirements !== Number(retirements)) fail.push(`retirements ${retirements} != manifest ${m.content.archives.retirements}`)
  if (m.radar_execution_subject.commit !== undefined) fail.push("manifest must not bind a subject commit OID")
  if (fail.length) { console.error(fail.join("\n")); process.exit(1) }
  console.log(JSON.stringify({ plan: planBlob, roadmap: roadmapBlob, copies: Number(copies), retirements: Number(retirements), manifest_recipe: m.radar_execution_subject.recipe_sha256 }))
' "$ROOT/$MIG/equivalence-manifest.yaml" "$PLAN_BLOB" "$ROADMAP_BLOB" "$ARCHIVE_COPIES" "$ARCHIVE_RETIREMENTS" > "$OUT/content-check.json"

# 6. Record the readiness projection. diff --cached compares HEAD against the private index.
private_git diff --cached --name-status "$HEAD_COMMIT" > "$OUT/name-status.txt"
private_git diff --cached --numstat "$HEAD_COMMIT" > "$OUT/numstat.txt"
private_git ls-files > "$OUT/activation-paths.txt"
ACTIVATION_COUNT="$(wc -l < "$OUT/activation-paths.txt" | tr -d ' ')"

# 7. Deferred C07 finding: compare the real activation tree against partition.yaml.
common_run bun -e '
  const y = Bun.YAML.parse(await Bun.file(process.argv[1]).text())
  const observed = Number(process.argv[2])
  const declared = y.validation?.expected?.tracked_files
  console.log(JSON.stringify({ declared, observed, agrees: declared === observed,
    note: "the activation tree includes the proof script and the three C07 receipts, which the C07 subject excluded" }))
' "$ROOT/$MIG/partition.yaml" "$ACTIVATION_COUNT" > "$OUT/partition-crosscheck.json"

# 8. Nothing may have reached the common store, the real index, or the active worktree.
common_git for-each-ref --format='%(refname) %(objectname)' | sort > "$OUT/common-refs-after.txt"
common_git cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype)' | sort > "$OUT/common-objects-after.txt"
cmp -s "$OUT/common-refs-before.txt" "$OUT/common-refs-after.txt"
cmp -s "$OUT/common-objects-before.txt" "$OUT/common-objects-after.txt"
test -z "$(common_git status --porcelain=v1)"
test ! -e "$ROOT/openspec/plan.yaml"
test ! -e "$ROOT/openspec/ROADMAP.md"

SCRIPT_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/$(basename -- "${BASH_SOURCE[0]}")"
cat > "$OUT/readiness.yaml" <<EOF
schema: c08-reproduction-readiness
schema_version: 1
readiness: ready
package_identity: not-computed-c09-alone-owns-final-package-identity
delivery_checkout_head: $HEAD_COMMIT
content:
  plan: {mode: "100644", blob: $PLAN_BLOB, target: openspec/plan.yaml}
  roadmap: {mode: "100644", blob: $ROADMAP_BLOB, target: openspec/ROADMAP.md, generation: radar-deterministic-render}
  archives: {copies: $ARCHIVE_COPIES, retirements: $ARCHIVE_RETIREMENTS}
activation_projection:
  paths: $ACTIVATION_COUNT
  name_status_sha256: $(digest "$OUT/name-status.txt")
  numstat_sha256: $(digest "$OUT/numstat.txt")
isolation:
  private_git: {git_dir: $PD, index: $PI, object_writes: private-c08-only}
  common_git: {refs_before_after_equal: true, objects_before_after_equal: true}
  active_worktree: {clean: true, canonical_paths_absent: true}
proof_script: {path: $MIG/proof/reproduce-c08.sh, sha256: $(digest "$SCRIPT_PATH")}
forbidden: [package-oid, commit, push, canonical-path-materialization, c09-activation]
EOF

printf 'C08 reproduction READY\n'
