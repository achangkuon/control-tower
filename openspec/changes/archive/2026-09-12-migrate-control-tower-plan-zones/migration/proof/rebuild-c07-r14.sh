#!/usr/bin/env bash
set -euo pipefail
umask 077

# ABI: rebuild-c07-r14.sh ROOT PROOF_ROOT DOC_GUARD DOC_GUARD_SHA256.
# ROOT is the repository checkout; PROOF_ROOT exists, is empty, and is the caller's cwd.
# DOC_GUARD is an executable external hook whose exact SHA-256 is authenticated before use.
usage() { printf '%s\n' 'usage: rebuild-c07-r14.sh ROOT PROOF_ROOT DOC_GUARD DOC_GUARD_SHA256'; }
if [[ ${1:-} == --help ]]; then usage; exit 0; fi
if (( $# != 4 )); then usage >&2; exit 64; fi
ROOT=$1
PROOF_ROOT=$2
DOC_GUARD=$3
DOC_GUARD_SHA256=$4
LOGICAL_PARENT=e6b7e673f671e6bba30f9a600bf0333a1cd90af2
ASSEMBLY_HEAD=39bc8c27c0478321156761c35437123cecdde3ed
SOURCE_COMMIT=43130ad40af06f3ed05671000719217bee74f0a5
SCRIPT_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/$(basename -- "${BASH_SOURCE[0]}")"
if [[ ! "$ROOT" = /* || ! -d "$ROOT" ]]; then printf '%s\n' 'ROOT must be an existing absolute directory' >&2; exit 64; fi
if [[ ! "$PROOF_ROOT" = /* ]]; then printf '%s\n' 'PROOF_ROOT must be an absolute directory' >&2; exit 64; fi
if [[ -e "$PROOF_ROOT" ]] && [[ -n "$(find "$PROOF_ROOT" -mindepth 1 -print -quit)" ]]; then printf '%s\n' 'PROOF_ROOT must be absent or empty' >&2; exit 64; fi
if [[ ! -x "$DOC_GUARD" ]]; then printf '%s\n' 'DOC_GUARD must be executable' >&2; exit 64; fi
if [[ ! "$DOC_GUARD_SHA256" =~ ^[0-9a-f]{64}$ ]]; then printf '%s\n' 'DOC_GUARD_SHA256 must be 64 lowercase hexadecimal characters' >&2; exit 64; fi
if [[ "$(sha256sum "$DOC_GUARD" | awk '{print $1}')" != "$DOC_GUARD_SHA256" ]]; then printf '%s\n' 'DOC_GUARD_SHA256 mismatch' >&2; exit 64; fi
PD="$PROOF_ROOT/.c07-private-git"
OUT="$PROOF_ROOT/.c07-output"
PI="$PD/c07-r14.index"
common_run() { env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_OPTIONAL_LOCKS "$@"; }
common_git() { common_run git -C "$ROOT" "$@"; }
common_bun() { common_run bun "$@"; }
COMMON_GIT="$(common_git rev-parse --git-common-dir)"
[[ "$COMMON_GIT" = /* ]] || COMMON_GIT="$ROOT/$COMMON_GIT"
COMMON_GIT="$(cd -- "$COMMON_GIT" && pwd -P)"

private_run() {
  env GIT_DIR="$PD" GIT_WORK_TREE="$PROOF_ROOT" GIT_INDEX_FILE="$PI" GIT_OPTIONAL_LOCKS=0 "$@"
}
private_git() { private_run git "$@"; }
digest() { sha256sum "$1" | awk '{print $1}'; }

test ! -e "$PD"
test ! -e "$OUT"
test -x "$DOC_GUARD"
test ! -e "$ROOT/openspec/plan.yaml"
test ! -e "$ROOT/openspec/ROADMAP.md"
test ! -d "$ROOT/openspec/archive/legacy-planning"
common_git cat-file -e "$LOGICAL_PARENT^{commit}"
common_git cat-file -e "$ASSEMBLY_HEAD^{commit}"
common_git cat-file -e "$SOURCE_COMMIT^{commit}"

mkdir -p "$OUT"
common_git for-each-ref --format='%(refname) %(objectname)' | sort > "$OUT/common-refs-before.txt"
common_git cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype) %(objectsize)' | sort > "$OUT/common-objects-before.txt"
sha256sum "$OUT/common-refs-before.txt" "$OUT/common-objects-before.txt" > "$OUT/common-before.sha256"

common_run git init --bare -q "$PD"
common_run git --git-dir="$PD" config core.bare false
mkdir -p "$PD/objects/info"
printf '%s\n' "$COMMON_GIT/objects" > "$PD/objects/info/alternates"
: > "$PI"

common_bun -e '
  const p = Bun.YAML.parse(await Bun.file(process.argv[1]).text())
  const root = process.argv[2]
  const candidate = "openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml"
  const output = async (cmd, args) => (await Bun.$`${cmd} ${args}`.cwd(root).text()).trim()
  const blob = await output("git", ["hash-object", candidate])
  const sha256 = (await output("sha256sum", [candidate])).split(/\s+/)[0]
  if (p.assembly_head !== "39bc8c27c0478321156761c35437123cecdde3ed") throw new Error("candidate-inputs assembly_head drift")
  if (p.proof_logical_parent !== "e6b7e673f671e6bba30f9a600bf0333a1cd90af2") throw new Error("candidate-inputs proof_logical_parent drift")
  if (p.canonical_promotion_source?.blob !== blob || p.canonical_promotion_source?.sha256 !== sha256) throw new Error("candidate-inputs candidate identity drift")
  const c = p.candidate_partition_contract
  if (c?.full_sessions !== 75 || c?.future_successors !== 7 || c?.satisfied_history !== 4 || c?.activation_records !== 86) throw new Error("candidate-inputs partition drift")
  for (const input of p.archive_evidence_inputs ?? []) {
    if (input.mode !== "100644" || input.blob !== await output("git", ["hash-object", input.source])) throw new Error(`candidate input drift: ${input.source}`)
  }
  console.log(JSON.stringify({ candidate_blob: blob, candidate_sha256: sha256, partition: "75/7/4=86" }))
' "$ROOT/openspec/changes/migrate-control-tower-plan-zones/migration/candidate-inputs.yaml" "$ROOT" > "$OUT/candidate-inputs-check.json"

common_bun -e '
  const inventoryPath = process.argv[1]
  const root = process.argv[2]
  const y = Bun.YAML.parse(await Bun.file(inventoryPath).text())
  const discovery = y.session_discovery
  const basePattern = "^#{1,6}[[:space:]]+Sesión[[:space:]]+S?[1-9][0-9]*(\\.[1-9][0-9]*)*([[:space:]]|—|-|$)"
  const supplementPattern = "^#{1,6}[[:space:]]+Sesión[[:space:]]+S?9\\.(9|10)([[:space:]]|—|-|$)"
  const expectedBaseCommand = `git grep -nE \x27${basePattern}\x27 43130ad40af06f3ed05671000719217bee74f0a5 -- openspec/plans | sort -V`
  const expectedSupplementCommand = `git grep -nE \x27${supplementPattern}\x27 e6b7e673f671e6bba30f9a600bf0333a1cd90af2 -- openspec/plans/plan-9/STATUS.md`
  if (discovery?.base?.commit !== "43130ad40af06f3ed05671000719217bee74f0a5" || discovery.base.command !== expectedBaseCommand || discovery.base.row_count !== 72) throw new Error("base discovery contract drift")
  if (discovery?.plan_9_supplement?.commit !== "e6b7e673f671e6bba30f9a600bf0333a1cd90af2" || discovery.plan_9_supplement.command !== expectedSupplementCommand || discovery.plan_9_supplement.row_count !== 2) throw new Error("Plan 9 supplement contract drift")
  if (JSON.stringify(discovery.plan_9_supplement.replace_session_ids) !== JSON.stringify(["S9.9"]) || JSON.stringify(discovery.plan_9_supplement.add_session_ids) !== JSON.stringify(["S9.10"])) throw new Error("Plan 9 merge operation drift")
  if (discovery?.merge?.unique_session_id_count !== 73 || discovery.row_count !== 73) throw new Error("merged discovery count drift")
  const output = async (args) => (await Bun.$`git ${args}`.cwd(root).text()).trim()
  const parseRows = async (text) => Promise.all(text.split(/\n/).filter(Boolean).map(async (line) => {
    const match = line.match(/^([0-9a-f]{40}):(.*?):([0-9]+):(.*)$/)
    if (!match) throw new Error(`unparseable git grep row: ${line}`)
    const [, source_commit, source_path, source_line, source_heading] = match
    const heading = source_heading.match(/^#{1,6}\s+Sesión\s+S?([1-9][0-9]*(?:\.[1-9][0-9]*)*)(?:\s|—|-|$)/)
    if (!heading) throw new Error(`unparseable Session heading: ${source_heading}`)
    const source_blob = await output(["rev-parse", `${source_commit}:${source_path}`])
    return { session_id: `S${heading[1]}`, source_commit, source_path, source_blob, source_line: Number(source_line), source_heading }
  }))
  const baseText = (await Bun.$`git grep -nE ${basePattern} ${discovery.base.commit} -- openspec/plans | sort -V`.cwd(root).text()).trim()
  const base = await parseRows(baseText)
  const supplement = await parseRows(await output(["grep", "-nE", supplementPattern, discovery.plan_9_supplement.commit, "--", discovery.plan_9_supplement.path]))
  if (base.length !== 72) throw new Error(`base discovery produced ${base.length}, expected 72`)
  if (JSON.stringify(supplement.map((row) => row.session_id)) !== JSON.stringify(["S9.9", "S9.10"])) throw new Error("supplement must produce exactly S9.9 then S9.10")
  const merged = []
  for (const row of base) {
    if (row.session_id === "S9.9") merged.push(...supplement)
    else merged.push(row)
  }
  if (new Set(merged.map((row) => row.session_id)).size !== 73 || merged.length !== 73) throw new Error("merged discovery is not 73 unique Session IDs")
  const declared = y.sessions.map((row) => ({
    session_id: row.session_id,
    source_commit: row.source_commit ?? y.source_commit,
    source_path: row.source_path,
    source_blob: row.source_blob,
    source_line: row.source_line,
    source_heading: row.source_heading,
  }))
  const mismatch = merged.findIndex((row, index) => JSON.stringify(row) !== JSON.stringify(declared[index]))
  if (mismatch !== -1 || merged.length !== declared.length) throw new Error(`declared inventory mismatch at row ${mismatch}: derived=${JSON.stringify(merged[mismatch])} declared=${JSON.stringify(declared[mismatch])}`)
  console.log(JSON.stringify({ base: base.length, supplement: supplement.length, replace: ["S9.9"], add: ["S9.10"], merged: merged.length, unique: 73, inventory_exact: true }))
' "$ROOT/openspec/changes/migrate-control-tower-plan-zones/migration/source-inventory.yaml" "$ROOT" > "$OUT/session-discovery-check.json"

private_git read-tree "$ASSEMBLY_HEAD"
for receipt in \
  openspec/changes/migrate-control-tower-plan-zones/migration/equivalence-manifest.yaml \
  openspec/changes/migrate-control-tower-plan-zones/migration/proof/c07-radar-results.yaml \
  openspec/changes/migrate-control-tower-plan-zones/migration/proof/c07-doc-close-results.yaml
do
  private_git update-index --force-remove -- "$receipt"
done
for path in \
  openspec/changes/migrate-control-tower-plan-zones/migration/source-inventory.yaml \
  openspec/changes/migrate-control-tower-plan-zones/migration/sessions/plan-9.yaml \
  openspec/changes/migrate-control-tower-plan-zones/migration/lineage.yaml \
  openspec/changes/migrate-control-tower-plan-zones/migration/partition.yaml \
  openspec/changes/migrate-control-tower-plan-zones/migration/archive-inventory.yaml \
  openspec/changes/migrate-control-tower-plan-zones/migration/candidate-inputs.yaml \
  openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml \
  openspec/changes/migrate-control-tower-plan-zones/migration/proof/rebuild-c07-r14.sh
do
  blob="$(private_git hash-object -w "$ROOT/$path")"
  private_git update-index --add --cacheinfo "100644,$blob,$path"
done

PLAN_BLOB="$(private_git hash-object -w "$ROOT/openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml")"
CANDIDATE_INPUTS_BLOB="$(private_git hash-object -w "$ROOT/openspec/changes/migrate-control-tower-plan-zones/migration/candidate-inputs.yaml")"
private_git update-index --add --cacheinfo "100644,$PLAN_BLOB,openspec/plan.yaml"

common_bun -e '
  const y = Bun.YAML.parse(await Bun.file(process.argv[1]).text())
  for (const e of y.entries) console.log(`${e.source_commit ?? y.source_commit}\t${e.source_path}\t${e.destination}\t${e.activation_treatment}`)
' "$ROOT/openspec/changes/migrate-control-tower-plan-zones/migration/archive-inventory.yaml" |
while IFS=$'\t' read -r source_commit source_path destination treatment; do
  entry="$(common_git ls-tree "$source_commit" -- "$source_path")"
  mode="$(awk '{print $1}' <<<"$entry")"
  blob="$(awk '{print $3}' <<<"$entry")"
  test "$mode" = 100644
  test -n "$blob"
  private_git update-index --add --cacheinfo "$mode,$blob,$destination"
  if [[ "$treatment" = retire-active-view-and-archive-byte-faithfully ]]; then
    private_git update-index --force-remove -- "$source_path"
  fi
done

run_radar() {
  local output_name=$1
  shift
  (
    cd "$PROOF_ROOT/agent-workflows/tools/radar"
    private_run go run . "$@"
  ) > "$OUT/$output_name.stdout" 2> "$OUT/$output_name.stderr"
}

printf '%s\n' 'C07 r14 bootstrap ROADMAP placeholder; replaced only by Radar output.' > "$PROOF_ROOT/.c07-bootstrap-roadmap.md"
BOOT_BLOB="$(private_git hash-object -w "$PROOF_ROOT/.c07-bootstrap-roadmap.md")"
private_git update-index --add --cacheinfo "100644,$BOOT_BLOB,openspec/ROADMAP.md"
BOOT_TREE="$(private_git write-tree)"
BOOT_COMMIT="$(private_run env GIT_AUTHOR_NAME='C07 private proof' GIT_AUTHOR_EMAIL='c07-proof@local.invalid' GIT_COMMITTER_NAME='C07 private proof' GIT_COMMITTER_EMAIL='c07-proof@local.invalid' git commit-tree "$BOOT_TREE" -p "$LOGICAL_PARENT" -m 'c07 r14 private bootstrap subject')"
private_git update-ref --no-deref HEAD "$BOOT_COMMIT"
private_git checkout-index -a -f

run_radar bootstrap-render render -f "$PROOF_ROOT/openspec/plan.yaml" -o "$PROOF_ROOT/openspec/ROADMAP.bootstrap.md" -C "$PROOF_ROOT"

ROADMAP_BLOB="$(private_git hash-object -w "$PROOF_ROOT/openspec/ROADMAP.bootstrap.md")"
private_git update-index --add --cacheinfo "100644,$ROADMAP_BLOB,openspec/ROADMAP.md"
FINAL_TREE="$(private_git write-tree)"
FINAL_COMMIT="$(private_run env GIT_AUTHOR_NAME='C07 private proof' GIT_AUTHOR_EMAIL='c07-proof@local.invalid' GIT_COMMITTER_NAME='C07 private proof' GIT_COMMITTER_EMAIL='c07-proof@local.invalid' git commit-tree "$FINAL_TREE" -p "$LOGICAL_PARENT" -m 'c07 r14 radar execution subject')"
private_git update-ref --no-deref HEAD "$FINAL_COMMIT"
private_git checkout-index -a -f

run_radar radar-check check -f "$PROOF_ROOT/openspec/plan.yaml" -C "$PROOF_ROOT"
run_radar radar-status status -f "$PROOF_ROOT/openspec/plan.yaml" -C "$PROOF_ROOT"
run_radar radar-zonas zonas -f "$PROOF_ROOT/openspec/plan.yaml" -C "$PROOF_ROOT"
run_radar radar-render-first render -f "$PROOF_ROOT/openspec/plan.yaml" -o "$PROOF_ROOT/openspec/ROADMAP.first.md" -C "$PROOF_ROOT"
run_radar radar-render-second render -f "$PROOF_ROOT/openspec/plan.yaml" -o "$PROOF_ROOT/openspec/ROADMAP.second.md" -C "$PROOF_ROOT"
private_run bun "$PROOF_ROOT/openspec/changes/migrate-control-tower-plan-zones/migration/proof/verify-activation-partition.mjs" > "$OUT/p1.stdout" 2> "$OUT/p1.stderr"

cmp -s "$PROOF_ROOT/openspec/ROADMAP.first.md" "$PROOF_ROOT/openspec/ROADMAP.second.md"
cmp -s "$PROOF_ROOT/openspec/ROADMAP.first.md" "$PROOF_ROOT/openspec/ROADMAP.md"
grep -Eiq 'no editar|do not edit' "$PROOF_ROOT/openspec/ROADMAP.md"
grep -Eq 'S101.*BLOQUEADO' "$OUT/radar-status.stdout"
grep -A1 -E '^### S9\.10 ' "$PROOF_ROOT/openspec/ROADMAP.md" | grep -Fq 'Estado derivado: 🔴 BLOQUEADO'

private_run bun -e '
  const p = Bun.YAML.parse(await Bun.file(process.argv[1]).text())
  const s910 = p.sesiones.find((s) => s.id === "S9.10")
  const s101 = p.sesiones.find((s) => s.id === "S101")
  const d = s910?.decisiones?.find((d) => d.tipo === "escala" && d.alcanza === "primer-modulo")
  if (JSON.stringify(d?.contamina) !== JSON.stringify(["S101"])) throw new Error("S9.10 contamina must be exactly [S101]")
  if (JSON.stringify(s101?.depende_de) !== JSON.stringify(["S100", "S9.10"])) throw new Error("S101 dependencies drifted")
  console.log(JSON.stringify({ s910: "BLOQUEADO-by-decision", s101: "BLOQUEADO-by-dependency" }))
' "$PROOF_ROOT/openspec/plan.yaml" > "$OUT/semantic-check.json"

: > "$PD/.claude-doc-guard"
(
  cd "$PROOF_ROOT"
  printf '%s' '{"tool_name":"Bash","tool_input":{"command":"git push"}}' | private_run timeout 8 "$DOC_GUARD" ship-check
  printf '%s' "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$PROOF_ROOT/openspec/plan.yaml\"}}" | private_run timeout 8 "$DOC_GUARD" doc-check
  printf '%s' '{"last_assistant_message":"C07 proof"}' | private_run timeout 8 "$DOC_GUARD" stop-gate
) > "$OUT/doc-plan.stdout" 2> "$OUT/doc-plan.stderr"
grep -Fxq 'docs_source=plan' "$PD/.claude-doc-guard"
! grep -q '"decision":"block"' "$OUT/doc-plan.stdout"
cp "$PD/.claude-doc-guard" "$OUT/doc-plan.state"

: > "$PD/.claude-doc-guard"
(
  cd "$PROOF_ROOT"
  printf '%s' '{"tool_name":"Bash","tool_input":{"command":"git push"}}' | private_run timeout 8 "$DOC_GUARD" ship-check
  printf '%s' '{"last_assistant_message":"nada que registrar"}' | private_run timeout 8 "$DOC_GUARD" stop-gate
) > "$OUT/doc-nothing.stdout" 2> "$OUT/doc-nothing.stderr"
grep -Fxq 'docs_source=declaration' "$PD/.claude-doc-guard"
! grep -q '"decision":"block"' "$OUT/doc-nothing.stdout"
cp "$PD/.claude-doc-guard" "$OUT/doc-nothing.state"

! private_git symbolic-ref -q HEAD
private_git for-each-ref --format='%(refname) %(objectname)' > "$OUT/private-refs.txt"
test ! -s "$OUT/private-refs.txt"
private_git rev-parse HEAD > "$OUT/private-head.txt"
private_git ls-tree -r "$FINAL_TREE" > "$OUT/path-mode-blob-inputs.txt"
PATH_MODE_BLOB_SHA256="$(digest "$OUT/path-mode-blob-inputs.txt")"
PATH_MODE_BLOB_COUNT="$(wc -l < "$OUT/path-mode-blob-inputs.txt" | tr -d ' ')"
printf 'logical_parent=%s\nassembly_head=%s\nsource_commit=%s\nbootstrap_tree=%s\nbootstrap_commit=%s\nradar_execution_subject_tree=%s\nradar_execution_subject_commit=%s\nplan_blob=%s\ncandidate_inputs_blob=%s\nroadmap_blob=%s\npath_mode_blob_count=%s\npath_mode_blob_sha256=%s\n' "$LOGICAL_PARENT" "$ASSEMBLY_HEAD" "$SOURCE_COMMIT" "$BOOT_TREE" "$BOOT_COMMIT" "$FINAL_TREE" "$FINAL_COMMIT" "$PLAN_BLOB" "$CANDIDATE_INPUTS_BLOB" "$ROADMAP_BLOB" "$PATH_MODE_BLOB_COUNT" "$PATH_MODE_BLOB_SHA256" > "$OUT/subject.env"

# The AFTER common-Git comparison intentionally runs with private routing variables removed.
common_git for-each-ref --format='%(refname) %(objectname)' | sort > "$OUT/common-refs-after.txt"
common_git cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype) %(objectsize)' | sort > "$OUT/common-objects-after.txt"
cmp -s "$OUT/common-refs-before.txt" "$OUT/common-refs-after.txt"
cmp -s "$OUT/common-objects-before.txt" "$OUT/common-objects-after.txt"
sha256sum "$OUT/common-refs-after.txt" "$OUT/common-objects-after.txt" > "$OUT/common-after.sha256"

SCRIPT_SHA256="$(digest "$SCRIPT_PATH")"
CANDIDATE_SHA256="$(digest "$ROOT/openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml")"
CANDIDATE_INPUTS_SHA256="$(digest "$ROOT/openspec/changes/migrate-control-tower-plan-zones/migration/candidate-inputs.yaml")"
ROADMAP_SHA256="$(digest "$PROOF_ROOT/openspec/ROADMAP.md")"
HEAD_TREE="$(common_git rev-parse "$ASSEMBLY_HEAD^{tree}")"
WORKSPACE_DIFF_SHA256="$(common_git diff HEAD --binary | sha256sum | awk '{print $1}')"
cat > "$OUT/attestation.yaml" <<EOF
schema: c07-r14-private-proof-attestation
schema_version: 1
evidence_status: pass
failed_evidence_revision_remediated: sha256:ca45aa11a6753fe682b4abb0a3bac8259c44a5168b25e94c0267d288a9af4207
proof_root: $PROOF_ROOT
receipt_exclusions: [migration/equivalence-manifest.yaml, migration/proof/c07-radar-results.yaml, migration/proof/c07-doc-close-results.yaml]
workspace: {head: $ASSEMBLY_HEAD, head_tree: $HEAD_TREE, diff_sha256_before_repository_receipts: $WORKSPACE_DIFF_SHA256}
inputs:
  source_commit: $SOURCE_COMMIT
  logical_parent: $LOGICAL_PARENT
  assembly_head: $ASSEMBLY_HEAD
  candidate: {mode: "100644", blob: $PLAN_BLOB, sha256: $CANDIDATE_SHA256}
  candidate_inputs: {mode: "100644", blob: $CANDIDATE_INPUTS_BLOB, sha256: $CANDIDATE_INPUTS_SHA256}
  partition: "75/7/4=86"
radar_execution_subject:
  commit: $FINAL_COMMIT
  tree: $FINAL_TREE
  semantics: technical-non-product-non-activating-not-package-or-candidate-identity
  private_git: {git_dir: $PD, head: detached, refs: 0, object_writes: private-r14-only}
  path_mode_blob_inputs: {count: $PATH_MODE_BLOB_COUNT, sha256: $PATH_MODE_BLOB_SHA256}
content:
  roadmap: {mode: "100644", blob: $ROADMAP_BLOB, sha256: $ROADMAP_SHA256}
commands:
  candidate_inputs_check: {command: "bun structural identity check", exit: 0, stdout_sha256: $(digest "$OUT/candidate-inputs-check.json")}
  session_discovery: {command: "declared base 72 plus Plan 9 supplement merge", exit: 0, result: "72+2-replace-1=73 unique", stdout_sha256: $(digest "$OUT/session-discovery-check.json")}
  p1: {command: "bun verify-activation-partition.mjs", exit: 0, stdout_sha256: $(digest "$OUT/p1.stdout"), stderr_sha256: $(digest "$OUT/p1.stderr")}
  radar_check: {command: "go run . check -f openspec/plan.yaml -C proof-root", exit: 0, stdout_sha256: $(digest "$OUT/radar-check.stdout"), stderr_sha256: $(digest "$OUT/radar-check.stderr")}
  radar_status: {command: "go run . status -f openspec/plan.yaml -C proof-root", exit: 0, stdout_sha256: $(digest "$OUT/radar-status.stdout"), stderr_sha256: $(digest "$OUT/radar-status.stderr")}
  radar_zonas: {command: "go run . zonas -f openspec/plan.yaml -C proof-root", exit: 0, stdout_sha256: $(digest "$OUT/radar-zonas.stdout"), stderr_sha256: $(digest "$OUT/radar-zonas.stderr")}
  render: {first_equals_second: true, first_equals_roadmap: true, generated_notice: true, roadmap_sha256: $ROADMAP_SHA256}
  semantic: {s910: BLOQUEADO, s101: BLOQUEADO, stdout_sha256: $(digest "$OUT/semantic-check.json")}
  doc_close_plan: {push_performed: false, docs_source: plan, state_sha256: $(digest "$OUT/doc-plan.state")}
  doc_close_nothing: {push_performed: false, docs_source: declaration, state_sha256: $(digest "$OUT/doc-nothing.state")}
common_git_nonmutation:
  environment: "GIT_DIR,GIT_WORK_TREE,GIT_INDEX_FILE,GIT_OPTIONAL_LOCKS unset"
  refs: {before_after_equal: true, sha256: $(digest "$OUT/common-refs-before.txt")}
  objects: {before_after_equal: true, sha256: $(digest "$OUT/common-objects-before.txt")}
proof_script: {path: openspec/changes/migrate-control-tower-plan-zones/migration/proof/rebuild-c07-r14.sh, sha256: $SCRIPT_SHA256}
forbidden: [c08, c09, activation, commit, push]
EOF

sha256sum "$SCRIPT_PATH" "$OUT/path-mode-blob-inputs.txt" "$OUT/session-discovery-check.json" "$OUT/radar-check.stdout" "$OUT/radar-status.stdout" "$OUT/radar-zonas.stdout" "$PROOF_ROOT/openspec/ROADMAP.md" "$OUT/p1.stdout" "$OUT/doc-plan.state" "$OUT/doc-nothing.state" "$OUT/attestation.yaml" > "$OUT/hashes.txt"
printf 'r14 C07 proof PASS\n'
