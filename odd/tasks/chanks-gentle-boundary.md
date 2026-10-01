# Chanks / Gentle AI boundary

> Subordinate ODD execution record. `openspec/plan.yaml` remains the sole product-plan authority. This work closes no enumerated Session: the maintainer authorized it directly in conversation on 2026-10-01, outside any plan Session.

## Objective

Make the maintainer's personal configuration (Chanks instruction blocks and skills) stop colliding with Gentle AI, so his flow stays usable as a parallel-work layer on top of Gentle AI.

## Problem

Three audits (2026-09-09, 2026-09-25, 2026-09-29) found the same collisions and none was applied to the personal files. Chanks text prescribes how to implement, review, verify, delegate and commit, and five blocks claim precedence over Gentle AI managed content. V2 machinery (Herdr dispatch, Pi Intercom, sealed unattended execution) is loaded in every conversation. No skill teaches V1 parallel implementation.

## Approved rule

Chanks decides what is worked on and what runs in parallel. Gentle AI decides how it is implemented, reviewed and delivered. If they collide, Gentle wins.

Stage ownership: 1 Definir, 2 Preparar, 3 Paralelo and 5 Cerrar belong to Chanks. Stage 4 Implementar y revisar belongs to Gentle AI; Chanks only hands over the Session and receives the commit.

## Accepted consequences

- "Review before committing", the `--base-ref` ban and "ask before exceeding 400 lines" are removed: they are about the how.
- Herdr dispatch, Intercom and sealed unattended execution are V2. `chanks-3-despacho-herdr` is kept and modified to be V2-only.
- Gentle AI managed content is never edited.
- Hermes is handled last, once the result is defined for the other agents.

## Constraints

- Edit the repo sources that generate the installed files, never only the installed copies.
- One unit at a time, each with its own check and its own work-unit commit.
- No reinstall or skill sync without asking first: it crashes open Pi sessions.
- No push, merge to `master` or installation without explicit maintainer authorization.
- Isolated worktree `Worktrees/chanks-frontera`, branch `feat/chanks-gentle-boundary`; another conversation is working in `Main`.
- TDD: strict, from `openspec/config.yaml` (`strict_tdd: true`, `rules.apply.tdd: true`). Primary runner: `bun test`; companion Python runner: `python3 -m unittest discover -s agent-workflows/tests -p 'test_*.py'`; Radar runner: `go test ./...` in its tool directory.

## Tasks and completed historical units

All dates below are 2026-10-01. Completed source units remain local; source completion is not live activation or delivery approval.

- [x] T0 — Delegated read-only provenance, tests, Radar mechanics and repository mapping.
- [x] T1a — Delegated global-manual-block cleanup outside the repo (no commit). Claude 97774 → 87592 B; OpenCode 47691 → 35420 B; Pi 26613 → 17703 B. Backups: `~/.claude/.skill-backups/boundary-2026-10-01/`. Removed precedence/HOW claims, SDD gatekeeper, sealed-consent/native-checking/Intercom/ODD-compat blocks; review lifecycle retains sync protection. Parent verified six Claude Gentle-managed blocks byte-identical and `manual-blocks.py save`/`check` OK for claude, opencode, pi, hermes (codex has nothing stored).
- [x] T1b — `2c825b3`: delegated writer, strict TDD; removed repository gatekeeper template/installer entry and 400-line asks in canon/planner/delivery/adoption/AGENTS. Ten files, +73/-141. RED: six builder failures plus gatekeeper inventory test. Python 290 with unchanged 76 environmental failures; focused builder 22 OK / JS 2 pass; Bun workflows 356 and full 1660 pass; whitespace clean. Independent verifier pass with minor findings; normalized installer 98 OK. Native high `process_boundary` due; candidate declined.
- [x] T2 — `8615fe5`: delegated writer, strict TDD; routing block 7.9KB →1279B, same marker/installer; admission JSON intact in kickoff reference, no production block consumer; nested owned-block rejection restored. Normalized RED 16 failures/3 errors; remaining GREEN failure only pre-existing startup-policy. Raw Python 297/75 environmental failures; focused 64 OK; Bun 356/full 1660 pass. Deferred dispatch assertions (~25) restored/pinned through T5.
- [x] T3a — `f8d700f`: delegated writer, strict Go TDD; `radar marcar <ID> --worktree`, `--listo` local witness, `desmarcar`, preserving Herdr markers in existing etapa/main. Human chose `EN CURSO` for resumption rather than leaving `LISTO`. Fourteen refusal cases with filesystem snapshots; `go test -count=1 ./...` OK, gofmt clean, Bun 1660 pass, disposable smoke stages 3→4→5→3. Native medium/`slice_budget_reached`, declined.
- [x] T3b — `8fa49e0`: delegated writer, strict TDD; approved `chanks-3-paralelo` (63 lines/3453B), registry/README and block pointer (1305B). V1 subagents, worktree per human-approved Session, Radar marking, serial integration, plan closure. RED 10 errors/GREEN 10 OK; normalized Python 307 only pre-existing startup failure; Bun 1660 pass. Live Radar activation not exercised.
- [x] T4 — `ab959f5`: delegated writer, strict TDD; 38 files +399/-558. Stages 1/2/5 slimmed while retaining staged skills; stage 4 hands over/receives commit; kickoff owns admission/installed-Radar rule; support 13104→7815B; closure 9986→2606B; stale stage 6/7/flow names removed. RED 71 assertions across 32 builder tests plus visible-message/issue-patch failures; no RED claimed for retargeted installer assertions. Normalized Python 316 only pre-existing failure; focused 59 OK; Bun 356/full 1660 pass; whitespace clean. Writer used small Python rewrite scripts. Independent verification FAILED: lost worker/issue handoffs, readiness, generic Notion support, residual planning HOW, weak parallel/`.py` activation coverage and stale installed files. T5/T4a/T4b recover these known source defects; live activation remains T6.
- [x] T3c — `9c70299`: delegated writer, strict TDD; human-approved file/resource/worktree collision refusals and missing branches; parallel record carries Session ID for stage 5. Independent verifier passed with findings; deferred Radar defects listed below, not silently fixed.
- [x] T5 — `bec4ec17b6b2f88691a9afe8e8315810b7cbb165`: delegated preparation/writer; V2-only explicit activation for Herdr/manual/unattended/jornada, no default model invocation; restored worker/issue handoffs and pool consumers. Functional proof and native approval/ack below.
- [x] T4a — `55fae88c93a336117f157fffd2585fcb52ff4846`: delegated preparation/writer; restore single-Session readiness, optional generic Notion support and planning boundary; strengthen activation/parallel/`.py` tests. Acceptance: reachable stage 5, no lost generic capability or Chanks-owned implementation/review policy. Checks and exact-candidate decline below. Forecast 350–650 authored lines.
- [x] T4b — `935123c9a4bf3041f9321b192c045022d43cc5a6`: delegated mapping/writer; ownership-based reversible stale-file retirement preserving unmanaged content/path protections. Isolated fixtures only; RED/GREEN, Python baseline comparison, Bun and whitespace proof below. Forecast 150–300, refined 200–350 authored lines. Distinct range native review approved and acknowledged; no installation/delivery authority.
- [ ] T6 — Human-gated integration into Main/master, install skills and Radar, propagate/verify Claude Code, OpenCode, Pi and Codex; Hermes last. Resolve open Pi sessions before reinstall. Separate authorization still required for push.

## Mapping, authorization and recovery boundaries

Initial mapping (historical, not current installed-state proof): installer generated required session-routing and optional gatekeeper blocks; other manual blocks lived only globally. The 26 skills/canon sources are in `agent-workflows/skills/`; frozen SHA-pinned `product/tower/generic/` is never edited. Codex had no manual blocks; initial code reading predicted missing required seed would refuse installation, not executed. Installer renders `{{REPO_ROOT}}`; reinstall must run from Main, not this worktree. Initial Radar derives `EN CURSO` from live `radar.despacho/v1` under `<git-common-dir>/chanks/despachos/`; absent marker stays `LISTO` and closes via `entrega.commit`. T3 adds local marking/readiness.

Initial baseline: Python 291/76 failures/errors (installer 75, Herdr 1; mode-related), workflows Bun 356 pass; full Bun initially unavailable without node_modules. Four source tool modes remain 775, installer expects 755. Normalize only disposable fixtures, never silently chmod live sources. Persistent normalized startup-policy failure and unavailable native-SDD-binary skip are NOT fixed.

Branch point: `33e14ce4ae131943728f9132f55a251f30f3d6bd` (origin/master). Six historical commits T1b/T2/T3a/T3b/T4/T3c were each declined for their own native candidate; declines do not authorize later candidates or disable RDD. A whole-branch review was offered but never granted. RDD remains on from global deciding source; initial continuation boundary 9c70299 advances only on actual native terminal authority.

The maintainer authorized local continuation after usage-limit recovery, later `Dale, continuamos` for T4b. Neither authorizes installation, skill propagation, merge, push, remote operations or further global-instruction edits. Keep inherited work, one coherent checked work-unit commit at a time. T4 was reopened after independent failure; T5/T4a/T4b source recovery is complete. Existing Spanish-facing artifacts retain their language; this subordinate technical record is English.

Route evidence: T1a/T1b/T2/T3/T4/T5 each used bounded delegated writers (2+ non-trivial files); T5/T4a/T4b also delegated preparation/mapping (4+ file and preparation triggers). T5 inherited 597 authored lines before correction. Strict TDD source/runners above; historical inherited T5 RED not observed by Codex, never invented. T6 parent coordinates after human confirmation.

Delivery strategy: `exception-ok` under repository no-PR/no-chained-PR policy; coherent units, no code golf/artificial 400-line splitting or Chanks size prompts. No remote delivery authorized. Running work-unit churn: T5 +2623/-1065=3688 (accumulated branch diff 3610); T4a 4096; T4b 4543. Generated files excluded; no PR slices. Task evidence working edits are excluded from frozen committed-only review.

Mirror: `odd/chanks-gentle-boundary/tasks`, observation#12383, locator `Worktrees/chanks-frontera/odd/tasks/chanks-gentle-boundary.md`. Earlier saves failed with “multiple active runtime sessions match the current project”; no invented session identity. Parent owns mirror reconciliation/readback.

## Deferred Radar findings (not authorized by skills recovery)

T3c verification found:
- Concurrent colliding `radar marcar` check-then-write race: 19/20 trials retained both markers.
- Recreating an orphan marker's worktree can revive it and bypass collision guard.
- Marker IDs absent from plan are ignored by worktree/branch guard.
- Live Session without declared `archivos` blocks every other Session (intended, undocumented).
- Parallel skill's `odd/tasks/<id>*.md` wording is looser than `tareasCerradas`.

These remain pending a separate decision; they are not part of the known skills completion estimate. No reliable minute estimate is promised before activation conditions.

## T5 verification (2026-10-01, Codex)

Delegated writer retained inherited worker seal/handoff, issue-patch closure and pool declaration; fixed three oversized descriptions, four misplaced V2 headings, unattended pointer, broken night-mode link and retired pool locator. Four V2 skills require explicit human activation and `disable-model-invocation:true`; execution schema unchanged, historical policy constants inert, consent human-owned.

Observed new RED: Herdr 74 tests/13 contract failures plus existing mode error; separate night-link regression failed then passed. No inherited historical RED claimed. Final:
- Focused normalized `PYTHONPATH=agent-workflows/tests python3 -m unittest test_builder_flow test_chanks_jornada test_coordinador_manual test_despacho_herdr test_issue_patch_flow`: 171 OK.
- Full Python discovery: raw baseline 318/3 failures/73 errors/1 skip; candidate 339/2 failures/73 errors/1 skip, no new names. Normalized 318→339 both one `GenuineCompositionTests.test_fresh_normal_startup_and_policy` failure and native-SDD-binary skip; startup difference environmental, not fixed. Four live tool modes 775 unchanged.
- Workflows Bun 356/0 (5.40s), full 1660/0 (189.04s), whitespace clean.
- 18 behavior/instruction paths,+529/-91=620 authored lines excluding record. Runtime harness N/A for reference/instruction unit; no live Herdr dispatch/agent activation.
- Rollback 14 tracked behavior/test paths to 9c70299 and remove four new Herdr reference/handoff files, preserving earlier commits/record.
- Existing skill-body/section style debt and global registry refresh remain incomplete; no install/sync/merge/push.
- Evidence `/tmp/chanks-t5-fixtures-hsnyek8h`, `/tmp/chanks-t5-*-final.log`, `/tmp/chanks-t5-baseline-{raw,normalized}.log`; durable Engram#12385/#12386 bugfixes,#12387 completion.

## T5 commit and concluded native review

Local commit `bec4ec17b6b2f88691a9afe8e8315810b7cbb165`, `fix(skills): isolate V2 flows and restore worker handoffs`: 19 paths,+576/-97=673 authored lines including record, 620 behavior/test lines. Native assessment medium `executable_change` in AGENTS, due `slice_budget_reached`; exact preflight/relay followed. Candidate only `9c70299..bec4ec1`, not whole branch.

Maintainer answered `si`, grant Engram#12389; fresh STATUS matched target/lineage/committed-only trees, saved granted invocation started `review-reliability` with correction budget 200. Concluded consent JSON is replaced by this identity/result summary, not a new recovery prompt.

- Target: `sha256:90349e7ce88da673ba1c2a423cfeb24cbefd228a6e19ce4c581eaf0153b3e837`; lineage `review-ee5f719b2f10238d`.
- Base tree: `710e8d1025dc88a8445b2641d98bbcbfa8667a80`; candidate tree: `220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0`; evidence diff: `sha256:391b845cbd5c2624848d34b515f0a1643dc7996bc278080fd5d8e3e84bec779d`.
- Provider context: `rctx2_b76f7822b05adc834780bf66c43b236b3f6e785f9d03b6e81a5ba0a7b4a235c0`.
- Capture subject: `sha256:223a6b95386b8044c9d0a4a76ceca6cde86be1a1dab718027b1b5674f9516ffb`; expected revision: `sha256:2dc1b689b11878d9f7a9b137e361bfee91f697dd0458870edc624ff6810af278`.
- Result: `sha256:1967dc39ed7dd1fee95f0d4d53ca8f0191f903c7a8fe4ce4c82000130eb93104`; consumed revision: `sha256:abe42ce09855c05831d368c712a7d9d46fe1c6107b79f0fb152b71b1bf91c7ea`.

Compiled Codex rejected `capture-result --materialize` (`not_started`, `retry_safe:true`); provider-carried arguments were executed without that unsupported flag, preserving every binding/agent. Native runtime materialized its reviewer internally; no parent-authored result substituted.

Native reviewer inspected all 19 immutable patches, no findings, no commands/external-file reads. Final `state:approved`; exact acknowledgement succeeded, `action:acknowledged`, `authority:burned`. Reviewed boundary advances 9c70299→bec4ec1. Approval covers T5 only, not T4/whole branch, and does not independently establish runtime activation/dispatch or grant installation/delivery. T6 remains deferred.

## T4a verification (2026-10-01)

Delegated preparation/writer restored shared single-Session readiness: exact lowercase `odd/tasks/<id>.md` or `odd/tasks/<id>-<feature>.md`, immutable same-branch commit, at least one checked/no unchecked task, observed checks/outcome and Session/checkout identity precede installed `radar marcar <ID> --listo -C <repo>`; `radar etapa` must offer stage 5, refusals stay pending. `--listo` does not prove completion or grant technical review authority. CodeGraph verified source/CLI compatibility; no installed command run.

Generic Notion map/schema restored from `ab959f5^`, payload unchanged except stage 7→5 metadata. Optional reference requires local-policy precedence, valid config, explicit documentary authorization/readback. Control Tower prohibition/absent `.session-doc.json` intact; no Notion/global-config operation. Removed planning HOW; strengthened activation/parallel/`.py` coverage, narrowed digest exception to canonical admission, retained legacy SDD helper. Exact `StageFiveSkillInventoryTests` expectation restores three assets; installer untouched. Twelve paths,+292/-28=320 authored lines excluding record.

Observed RED 50 tests/four contract failures/one missing-asset error; additional exact inventory RED. Focused builder/parallel/legacy bridge 61 OK plus existing SDD-binary skip. Full discovery raw 339/3 failures/73 errors/1 skip →344/2 failures/73 errors/1 skip, no new names; normalized 339→344 both existing startup-policy failure and unavailable-native-SDD skip. Modes 775 unchanged; environmental startup difference not fixed.

Workflows Bun 356 pass; full 1660/0; whitespace/local references/JSON syntax/historical payload comparison clean. External Draft7 validator unavailable (`jsonschema` absent), nothing installed. Runtime harness N/A; live agent/Notion activation deferred, not proven by text tests. Evidence `/tmp/chanks-t4a-*`, `/tmp/chanks-t4a-fixtures-w9f61eb0`, Engram#12390–#12392.

Rollback eight tracked behavior/test paths to bec4ec1, remove four new/restored readiness/Notion files, preserve earlier seven commits/record. Writer started no review/install/sync/merge/push.

## T4a commit and concluded candidate decline

Local `55fae88c93a336117f157fffd2585fcb52ff4846`, `fix(chanks): restore session readiness and optional closure support`: 13 paths,+377/-31=408 authored lines including record, 320 behavior/test. Running churn 4096.

Native high `process_boundary/shell_process` in `test_install.py`, due `high_risk`, only `bec4ec1..55fae88`. Test edit changed restored-asset inventory only; no installer/process-launch source changed, but native risk was never lowered. Exact preflight/relay returned:
- Target `sha256:00b4a8986d014e420f65fe3defd427813850d9d24f0eecd0bddb1171d9bae884`, lineage `review-b750dd44d1c01659`.
- Base tree `220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0`, candidate tree `22d9349fd0baa6de6b8e4ed69db916ee3fef7f0e`, diff evidence `sha256:571c67e671ebcb2e0ab3cf36da1d80c99747c7ed6c1dcef421bd87cc3733a843`.

Maintainer answered `omitimos` for ONLY this exact candidate. Fresh STATUS matched; saved declined invocation returned `action:declined`, `consent:declined_this_candidate`, `lenses_required:false`. No review record/approval or test rerun; Engram#12394. Concluded consent JSON is summarized here, never re-prompt this exact declined target. Global RDD stays on; reviewed boundary remains bec4ec1. A distinct later range containing T4b needs its own consent. Neither answer authorizes installation/delivery or changes RDD mode.

## T4b authorized design and checks (2026-10-01)

After `Dale, continuamos`, delegated preparation/4+ file mapping found no per-file ownership manifest; whole-skill retirement already uses `os.replace` in `<runtime-root>/.retired-skills/`. Chosen: immutable historical path/SHA256 tombstones for four removed files and a guarded reversible file helper, not a mutable ownership database or recursive deletion. Tradeoff: future removals require registry maintenance; unknown/modified files survive.

T4b surface: `agent-workflows/tools/install.py`, `agent-workflows/tests/test_install.py`, `agent-workflows/README.md`. Delegated writer after mapping: multiple non-trivial files. Forecast 200–350, advisory only. Parent owns record/review. Strict TDD from config; focused `PYTHONPATH=agent-workflows/tests python3 -m unittest test_install`, primary Bun/full Python above.

Owned tombstones, relative to each runtime skill root:
- `chanks-0-agente-soporte/assets/assignment-readonly.md`: `1066822ccc072dc21cd5dd67965cbbcf0a03b186d276a70b593d26e4e0c8d72f` (`1b3a53b`) or `9b35256b723d835665783739526a12497bf037c822521c498850a3bf253bc622` (`f7612de`).
- `chanks-0-agente-soporte/references/contrato-no-interferencia.md`: `c9f5b2db842d9b4751ab2a86a94cd7c30d7d538f433f4165674a5db88d6edf61` (`1b3a53b`) or `b2c15bc842cc310b06489f3160d4e75a9ca111cf59bab525d1024000de7e981e` (`f7612de`).
- `chanks-0-agente-soporte/references/unidad-ejecutable.md`: `2d78b7322467476ce1e8c127f5ce746c62e9adb392d4ec8c8d4bac2cd8baf322` (`1b3a53b`) or `a5362b5289abf87269ffbf879ab55976205cf0485cfa2c4e4132b20e5626a612` (`f7612de`).
- `chanks-5-session-doc/references/links.md`: `6d75a865769a7561193f06bb5f2f86f39d65b1911e6337a0a11077c863b6885b` (`929ac91`).

Digests recovered directly from immutable Git blobs; `ab959f5` removed these files. Restored Notion assets are current source, never retirement candidates. Current source inventory excludes a tombstone even if that path returns later.

Preflight validates every known destination and archive ancestor before any source/manual write: reject symlink components, wrong types and path escapes. Plan `retired-skill-file` only for a regular file whose content matches a known historical digest. Missing, modified and unlisted files remain untouched. At the end of successful apply, revalidate path and digest and move exact historical copies into collision-safe `.retired-skills/files/` backups preserving relative identity. Reuse the archive surface, not the whole-directory helper; do not inherit its unguarded archive-parent behavior or expand into unrelated whole-skill refactoring. Do not delete empty directories.

Acceptance/check scope: all four historical paths/variants across four runtimes; preserve modified/unlisted/current-source/Notion files; reject symlink file/parents/archive or wrong types before writes with sentinels intact; preserve digest changes and failed earlier apply; collision backups/idempotency. Copied installer/temporary-home CLI dry-run/check/apply proof only, no real HOME activation. Focused/full raw-normalized Python, workflows/full Bun, whitespace checks below; no live chmod. Mapping Engram#12397/#12398. T6 remains human-gated.

## T4b functional verification (2026-10-01)

Implemented exactly three behavior/test/doc paths: `agent-workflows/tools/install.py` +76, `agent-workflows/tests/test_install.py` +249, `agent-workflows/README.md` +24 = 349 authored additions. Immutable historical path+digest tombstones gate retirement; current-source overlap excludes reintroduced/restored files. Modified, unlisted and missing copies survive. Known file/archive destinations are guarded in preflight; after ordinary apply succeeds the helper revalidates path/digest and archives matched bytes in private collision-safe timestamp directories. Concurrent-writer protection is explicitly not guaranteed: install without other processes editing the same skill paths. No recursive cleanup or mutable ownership manifest.

Strict-TDD evidence: `PYTHONPATH=agent-workflows/tests python3 -m unittest test_install.RetiredSkillFileTests` observed RED before production edits (10 tests, nine failures/two errors through subcases). Final regression class 11 OK. Disposable mode-normalized full installer suite 115 OK. Full discovery raw baseline 344/candidate 355 both three failures/73 errors/one skip; normalized baseline 344/candidate 355 both one existing `GenuineCompositionTests.test_fresh_normal_startup_and_policy` failure and one unavailable-native-SDD-binary skip. Exact failure/error names unchanged. Four live source modes remain 775; no live chmod.

`bun test ./agent-workflows`: 356 pass/zero fail. Initial clean-HOME full Bun failed 1654 pass/six failures/one error because its harness lacked the default core facade and Go cache. Its Go build inadvertently downloaded public yaml.v3 into the disposable cache; this violated the worker's no-network scope and was disclosed, not hidden. No credentials/real HOME/cache used. Corrected real copied-source facade, disposable dependency cache, `GOPROXY=off`, `GOTOOLCHAIN=local` gave fail-closed eight pass and pre-push twelve pass. Worker full Bun reported 1660/0 but a zsh logging tail failed (`status` is read-only); inner exit was not claimed. Parent reran the unchanged candidate directly without that wrapper: `env HOME=/tmp/t4b-proof-73txulhi/bun-home GOMODCACHE=/tmp/t4b-proof-73txulhi/home/go/pkg/mod GOCACHE=/tmp/t4b-proof-73txulhi/bun-home/.cache/go-build GOPROXY=off GOTOOLCHAIN=local bun test`, actual exit 0, 1660 pass/zero fail/9700 expectations/113 files (113.62s). Whitespace clean. Final verification offline; no claim of zero network activity across the earlier failed attempt.

Real black-box CLI proof uses only a copied installer and temporary `--home`. Two rounds seed all seven immutable Git-blob versions across four runtime roots: each dry-run exits 0/check exits 1 and detects sixteen historical copies without mutation; each isolated apply exits 0 and produces sixteen byte-identical archives; subsequent check exits 0. Parent independently read the artifact and hashed all 32 backups: exactly the seven expected historical digests, no unknown content. Evidence: `/tmp/t4b-proof-73txulhi/historical-cli-evidence.json`, `bun-all-parent-direct.log` and raw/normalized fixture logs. This proves installer behavior in isolated homes, not live agent activation.

Rollback: remove only these three T4b source diffs; runtime rollback inspects a private backup and restores its original relative path without overwriting newer user content. Parent task record excluded from source rollback. Engram bugfix #12401, environment discoveries #12407/#12408, completion #12409. No real installation, propagation, merge or push.

## T4b commit and native range review

## T6 local integration checkpoint (2026-10-01)

Authorized local merge of feature checkpoint `6a15f7e00ea8d91995d39bb8ee1bc3c8c34987d9` into clean Main `8ee9a2bdf3cc992176746752783c743946f4906d` completed without conflicts and is pending its conventional merge commit. Recovery ref `recovery/chanks-boundary-pre-t6` preserves the premerge Main. Three unrelated new Tower paths remain unchanged. Delegated ordinary integrated checks: offline full Bun exit 0, 1703 pass/zero fail, 9957 expectations/114 files (130.06s); offline Radar `go test -count=1 ./...` exit 0 (15.174s). Main Python discovery exit 1, 355 tests/one inherited `GenuineCompositionTests.test_fresh_normal_startup_and_policy` failure (missing `PI_SOURCE`/`QUIET_SOURCE`), one unavailable native-SDD-binary skip, zero errors (57.292s). No chmod or source correction. Both whitespace checks clean; staged/unstaged candidate bytes preserved by test worker. Evidence `/tmp/chanks-t6-integrated-tests-J8VTmi`.

Scoped deployment driver is being prepared/proved externally with disposable homes; no live installation yet. Native merged-candidate assessment follows commit against premerge Main, not the earlier feature receipt. T6 remains unchecked until actual canonical/routing/archive/Radar/registry/Hermes evidence is observed. No push or remote work.

Local work-unit `935123c9a4bf3041f9321b192c045022d43cc5a6`, `fix(installer): archive only recognized obsolete skill files`: four paths, +444/-3 = 447 authored lines including the execution record; 349 source/tests/docs. Running work-unit churn from branch point: 4543 (previous 4096 plus 447). Known source recovery T4/T4a/T4b/T5 is functionally complete; native approval/acknowledgement is recorded below. T6 is not activated.

Native assessment against last actually reviewed boundary `bec4ec1`: high `process_boundary` in `test_install.py`, `high_risk` due. Candidate `bec4ec1..935123c` includes T4a plus T4b, fifteen paths/851 accumulated changed lines, not the whole feature branch or a replay of declined T4a-only target. Exact preflight STATUS and start consent relay executed.

Target `sha256:2a716d266c2c60e3bbad338ea7c604e7918360988948e819258ab063c4989955`, lineage `review-d1ecf057a0866f4c`, base tree `220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0`, candidate tree `df9ffd2a7a557d6cb191fd2c86747e789e35b247`. Candidate consent remains human-owned; neither answer changes global RDD or authorizes installation, integration or push. The postcommit task evidence is the sole dirty file, excluded from committed-only selectors.

Remaining delivery: after this candidate decision/gate, T6 requires explicit authorization to bring the result into Main/master, install skills and Radar, propagate and verify four agents, Hermes last; open Pi sessions must be addressed before reinstall. Push remains separately unauthorized. Radar race/orphan findings remain deferred outside known skills source completion.

## Current checkpoint and next step (2026-10-01)

T6 authorization update: the maintainer explicitly answered `SI` to local integration, installation and agent verification, without push, after disclosure of open-Pi disruption. Grant recorded in Engram #12425. T6 is now authorized but not completed: reconcile clean Main `8ee9a2b` with feature `935123c`, preserve unrelated Tower work, install only from Main, verify Claude/OpenCode/Pi/Codex, then Hermes last. No remote execution or transfer is authorized. Route: delegated preparation mapping (4+ files, installation-boundary research); bounded delegated deployment after evidence reconciliation. Strict TDD source/runners unchanged; deployment/configuration checks are ordinary functional checks unless a source correction is required. Rollback requires pre-install backups and exact merge/install identities. Historical pending-authorization paragraphs below describe the earlier checkpoint, not the current grant.

T6 mapping (Engram #12429): clean Main `8ee9a2b` has two new Tower commits with three nonoverlapping paths; read-only three-tree inspection found no conflicts. Main source executables are already 755, so no chmod is needed. Use guarded existing installer helpers for canonical files/routing and recognized file retirement, not default apply (changes Pi controls), setup (pulls remotely), or broad sync (deletes whole skills and reaches Windows/Hermes). Preserve unmanaged files and all surrounding instruction bytes; seed absent Codex/Hermes routing append-only. Validate scoped driver in disposable home before live deployment. Back up exact affected paths, modes and absent-path inventory; install Radar offline from Main, verify in disposable Git fixture, regenerate local registry without starting an agent. Hermes separate final stage, with intact archival of its two retired directories. Fresh authenticated/model-session activation is not inferred from filesystem/fixture checks. Integration gets independent native assessment against Main `8ee9a2b`; source-review receipts do not approve merged bytes. Rollback aborts uncommitted merge or reverts exact integration commit; runtime restoration is guarded against overwriting newer edits.

Maintainer answered `revisamos` for ONLY `bec4ec1..935123c`; grant Engram#12417. Parent completed native review `review-d1ecf057a0866f4c`, all four lenses zero findings; final approved, exact acknowledgement returned `authority:burned`. Result Engram#12421. Reviewed boundary now `935123c9a4bf3041f9321b192c045022d43cc5a6`, not merely functionally verified. No source changes/new commits.

Consumed revision `sha256:fc89b19c6323185ed2bc7646c534850fc37b8d31c716d6a49a07d5debfd400c0`; target unchanged. Native result hashes:
- Risk: `sha256:590fe4d201215c69308b1c85992c66145851a3c676bd851b97dd5ffb3694a7dd`.
- Resilience: `sha256:e408d919098a9b8046b9b39a29dcd7a2e2fe121a71e69c3c3e500144d8769dc8`.
- Readability: `sha256:2f79eb34b920a9eb43560539afb862c8bd17a2f29deef639b1708aa02cc025ac`.
- Reliability: `sha256:d8dc9d1643d3ae1aff9b8837bef71015b31da8e160d0dcdd9c67ffe3675641b4`.

All lenses inspected 15 immutable patches, no commands/external reads/test reruns. Review does not prove live activation. Parent owns native authority/mirror; no parent-authored reviewer substitute. The original consent envelope below is preserved verbatim for identity recovery, now concluded, not a prompt/replay permission. Doc-only working edits remain outside frozen committed-only candidate.

Next: request separate explicit T6 authorization for integration into Main/master, safe open-Pi handling, Main-based skills/Radar install, propagation/verification of four agents, Hermes last. `revisamos` grants NONE of these, nor push/remote permission. Deferred Radar findings stay outside scope. Persistent Python failures/skip, unavailable schema validator and pending live activation remain disclosed.

### T4b pending-range native consent envelope (exact)

```json
{
  "schema": "gentle-ai.review-integration.consent/v3",
  "contract": "gentle-ai.review-integration/v2",
  "operation": "review.start",
  "action": "consent_required",
  "agent": "codex",
  "blocking": true,
  "target_identity": "sha256:2a716d266c2c60e3bbad338ea7c604e7918360988948e819258ab063c4989955",
  "projection": "workspace",
  "risk_level": "high",
  "changed_files": 15,
  "changed_lines": 851,
  "headline": "Gentle AI can review this change before you call it done.",
  "reason": "Review can help detect execution issues in these changes.",
  "value": "Reviewing takes a little longer and makes the result safer.",
  "risk_evidence": [
    "code that starts other processes in agent-workflows/tests/test_install.py"
  ],
  "choices": [
    {
      "answer": "granted",
      "label": "Review this change",
      "effect": "Reviews only this change; later medium- or high-risk changes ask again, and delivery needs separate approval.",
      "invocation": "gentle-ai review start --contract gentle-ai.review-integration/v2 --cwd /home/emili/projects/control-tower/Worktrees/chanks-frontera --target sha256:2a716d266c2c60e3bbad338ea7c604e7918360988948e819258ab063c4989955 --target-evidence v1:base-diff:workspace:220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0:df9ffd2a7a557d6cb191fd2c86747e789e35b247:sha256:79f5ebdb81b510f9a57ff9af3ba039205c41d3df3b4c0cb68acb5ee868569c98 --projection workspace --agent codex --lineage review-d1ecf057a0866f4c --base-ref 220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0 --committed-only --consent granted"
    },
    {
      "answer": "declined",
      "label": "Skip this time",
      "effect": "Skips only this change; no review record is created, and future reviews stay enabled.",
      "invocation": "gentle-ai review start --contract gentle-ai.review-integration/v2 --cwd /home/emili/projects/control-tower/Worktrees/chanks-frontera --target sha256:2a716d266c2c60e3bbad338ea7c604e7918360988948e819258ab063c4989955 --target-evidence v1:base-diff:workspace:220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0:df9ffd2a7a557d6cb191fd2c86747e789e35b247:sha256:79f5ebdb81b510f9a57ff9af3ba039205c41d3df3b4c0cb68acb5ee868569c98 --projection workspace --agent codex --lineage review-d1ecf057a0866f4c --base-ref 220f50b4a7390dc1cbfcce35fdf0b7cc44df1ce0 --committed-only --consent declined"
    }
  ],
  "off_path": {
    "note": "To turn reviews off for good, run 'gentle-ai review mode disable'.",
    "command": "gentle-ai review mode disable"
  }
}
```
