# Tower V1 final four-session planning

## Goal

Make the remaining Tower V1 work explicit and executable in the canonical plan, with the dependency chain `S172 -> S174 -> S173 -> S150`.

## Authorized edit surface

- `openspec/plan.yaml`
- `openspec/ROADMAP.md` (generated only by `radar render`)
- `odd/tasks/tower-v1-final-four-sessions.md`

No product implementation, installer execution, HOME/global-state mutation, commit, push, or release was authorized by the original planning unit. The separately authorized resumption below closes the preserved release-acquisition unit and delivers it with the three local planning commits; it does not authorize general remediation or premature closure of the installer Session.

## Decisions

- S172 exposes a dedicated `cleanup` command; it does not widen `uninstall`.
- S174 makes `torre-control` a private-release global installer/updater, keeps global engine state separate from project-local adoption, opens an interactive menu without arguments, and also provides closed scriptable subcommands.
- S173 measures context bytes actually observed by isolated Pi and Claude Code runs. Static file-byte counts may explain results but cannot replace host evidence.
- S150 documents only delivered behavior and measured evidence.

## Tasks

- [x] Derive the executable S172 cleanup plan.
- [x] Derive the executable S174 installer/update plan.
- [x] Derive the executable S173 adopter/non-adopter benchmark plan.
- [x] Derive the executable S150 final README plan.
- [x] Integrate the four Sessions, regenerate `openspec/ROADMAP.md`, and verify Radar output and dependencies.

## Verification

- `$HOME/.local/bin/radar check -C /home/emili/projects/control-tower/Main`
- `$HOME/.local/bin/radar render -C /home/emili/projects/control-tower/Main`
- Fresh `radar status`, `radar faltan`, and per-Session inspection for S172, S174, S173, and S150.
- Review the final diff and confirm no files outside the authorized edit surface changed.

## Evidence

Baseline at `c837aa3121bec2a4dac9ad8ff206499a3e55d086`: clean tracked `master`, `radar check` reported 0 errors and 63 warnings, Tower V1 reported 8/11, S172/S173/S150 were incomplete, and S174 did not exist. This task document was already untracked before integration.

Observed after integration (all commands exit 0): `$HOME/.local/bin/radar check -C /home/emili/projects/control-tower/Main` → 0 errors/63 pre-existing warnings; `$HOME/.local/bin/radar render -C /home/emili/projects/control-tower/Main` → ROADMAP regenerated; the same check → 0 errors/63 warnings. `radar status --json` and `radar faltan` → Tower V1 8/12 (66%), S172 LISTO, S174/S173/S150 PLANIFICADO; `radar sesion` for each confirmed S172→S174→S173→S150 via dependencies `[S8.13]`, `[S172]`, `[S174]`, `[S173]`. `git diff --check` → clean; status showed only plan.yaml, generated ROADMAP.md and the pre-existing untracked task document.

## Sequential execution

- [x] Deliver the reviewed planning candidate (`262d1cebc65da96db5f46131f6748231ad86fd94`).
- [x] Implement, verify, review, deliver, and archive S172 (`8caaacf33e98ce236676533198761723154d6eef`; native review `review-99464decff2e806b`).
- [ ] Re-run Radar and execute S174 only while it remains `LISTO`; six sequential units.
- [ ] Re-run Radar and execute S173 only after S174 is delivered and Radar admits it; two sequential units.
- [ ] Re-run Radar and execute S150 only after S173 is delivered and Radar admits it; one documentation unit.

S172 strict-TDD evidence: the focused suite first failed with 19 pass / 3 fail because `cleanupProject` and the `cleanup` CLI did not exist, then passed with 23 pass / 0 fail. Independent verification passed; the reviewed diff was 126 authored lines across the two authorized files. The pre-push suite passed 1602 tests. Tests used disposable roots and isolated HOME/XDG/TMP state only. Radar archived S172 and admitted S174; the 63 existing warnings remain unchanged.

## Authorized release-unit resumption

The maintainer requested resuming the pending V1 work in Main and then delivering all local changes. This explicitly includes planning commits `f0db260d19f0c0e436973ae673ec75fc8f472871`, `b7eedd246c7e876367f6ccb1e1c6a33fcc56515b`, and `6443a82256131bf578142313715ce89a361015b2`. The prior concurrent-planning delivery ownership blocker is resolved by this request; no implicit publication of another session's work is involved.

Fresh external Radar identifies the applicable Session as:

S174 (Torre V1 › Adopción project-local reversible › producto-torre — torre-control instala/actualiza y revierte el motor V1 global desde un Release privado verificado, ofrece menú y comandos cerrados, y delega adopción local explícita a S8.13/S172., 🟢 LISTO)

This is technical execution continuity, not another product backlog. The Session's remaining five installer units, dependent benchmark and final README remain unclosed; the delivery below closes no product Session (nothing to register as a completed Session).

### Scope, routing and checks

- Preserved unit: `product/tower/v1/release.mjs` and `product/tower/v1/test/release.test.mjs`; 144 authored lines, one reversible code-and-tests commit.
- Delivery strategy: sequential direct commits to `master`, the repository's explicit policy; no PR, force push, bypass, stash, deletion or parking of unfinished files.
- TDD: enabled by `openspec/config.yaml` (`strict_tdd: true`), Bun / `bun:test`, configured runner `bun test`. This resumption validates pre-existing implementation; no new historical RED evidence is asserted. Prior handoff records implementation with strict TDD and 5 focused/57 V1 passing tests, which are historical until rerun.
- Route: delegated read-only mapping (4+ files) and command-capable independent verification. Any required multi-file product correction must go to one bounded writer and retain configured RED/GREEN/REFACTOR.
- Exact checks: `bun test product/tower/v1/test/release.test.mjs`; `bun test product/tower/v1/test`; whitespace validation including the two untracked files; native review under the user-owned enabled RDD switch; clean-tree readback before `git push origin master`.
- Delivery suite and report: normal pre-push runs `bun run test`, external Radar validation, and radiografia generation. Report is nonblocking; suite/plan failures are not bypassed. No real GitHub download, installer or HOME/global-state mutation is authorized by these isolated tests.

### Resume tasks

- [x] R1 — Verify, native-review and commit the preserved release-acquisition unit. DONE; delegated verification plus native review, parent exact-path staging/commit. Work-unit commit: `121e728d11f36b4a51344bc98f55f155387b910b`; focused/V1 checks passed, tree matches reviewed bytes, 144-line source-and-test unit retained.
- [x] R2 — Deliver the release unit with all three local planning commits through normal push. DONE; parent normal push and delegated suite/report/remote readback. Delivery evidence: `9dd697ec214c41b60133c4bc94b8c75ebb15438e` on remote master, clean tree, all requested commits verified ancestors. Work-unit checkpoint `9dd697ec214c41b60133c4bc94b8c75ebb15438e`. Hook suite 1607 pass / 0 fail; Radar 0 errors / 63 warnings; documented `--with-tests` generation exit 0 refreshed the ignored report/cache for that same HEAD. No Session closure claimed.

### Fresh reconciliation evidence

- Main: `master`, HEAD `6443a82256131bf578142313715ce89a361015b2`, three commits ahead of `origin/master`; no tracked diff; only the preserved release source and test are untracked.
- SHA-256 source: `d7410c1ce18a76c694fe3e81fd1881cea8b3db983fe4a41d6ffd527126db5d08`.
- SHA-256 test: `7cefe0a0f3a16d1b073ddc25f0aed230b25d47ddd0e29ffe05845e08df077e61`.
- Both hashes match the prior session's preservation record exactly.
- Installed `/home/emili/.local/bin/radar` freshly reports admission LISTO, 0 errors / 63 warnings. No warning-equivalence assertion was independently tested.
- `core.hooksPath` is `.githooks`; RDD globally on; no peers currently advertised.
- Fresh independent GREEN: focused 5 pass / 0 fail (93 assertions); V1 57 pass / 0 fail (1,218 assertions). Both commands exit 0. Original RED output remains unavailable; no new TDD-history assertion is made.
- Tracked and no-index whitespace checks produced no diagnostics; no-index exit 1 means ordinary differences from `/dev/null`. Hashes and Git status remained unchanged through tests.
- Native review `review-826bb1daca1cf79b`: medium, reliability lens; approved and acknowledged, authority burned. Reviewed tree `2098df099fd652861a46d68925d216657feb4e3f` matches the staged and committed tree exactly. One non-blocking informational advisory `R3-host-binding` at `release.mjs:44-45`; no correction was offered.
- Native assessment unavailable: ambient assessment rejected untracked declaration; committed-range assessment reported schema incompatibility. Treated conservatively, not as low risk; independent functional verification and terminal native review already completed.
- After product commit, Main is clean and ahead of origin by four commits. This passive checkpoint records observed evidence without amending the reviewed product candidate.

### Observed delivery closure

- Normal push succeeded without bypass, publishing the three planning commits, product commit and evidence checkpoint. `HEAD`, `origin/master` and `git ls-remote origin refs/heads/master` all matched `9dd697ec214c41b60133c4bc94b8c75ebb15438e`; ancestry checks for all four requested content commits exited 0.
- Delivery hook: 1607 pass / 0 fail, 8,938 assertions across 111 files; external Radar 0 errors / 63 warnings. Report generation succeeded but initially displayed a historical suite cache.
- Documented `bun agent-workflows/radiografia/run.mjs --with-tests` subsequently exited 0 and reproduced 1607 pass / 0 fail, 8,938 assertions, 111 files. Ignored report/cache now carry delivery HEAD `9dd697e`; historical judgement remains honestly labeled outdated and was not re-stamped or repaired.
- Repository remained clean after report verification. General planning was delivered unchanged; no general remediation, benchmark, final README, global installation or premature product Session closure was performed.
- Preserve the current Radar and Chanks/Tower skill emojis. The maintainer explicitly says they work and are not friction; slimming V1 removes ambiguity, not useful visual identities.

This final passive completion record does not amend the reviewed product commit. Publish it normally and regenerate ignored report evidence for its resulting HEAD. Next product checkpoint: the installer remains admitted; resume its second of six sequential units from fresh external Radar, then dependent host benchmark and final README. Do not start general remediation now.

## Authorized bootstrap-unit resumption

The maintainer selected Main and requested only the second installer unit, manifest and bounded bootstrap intake, after published `4464d6f7303ecf9b9e61f60db0ab89f4faa43132`. Do not repeat planning, acquisition unit 1, or implement general remediation. Preserve current Radar and Chanks/Tower emojis.

### Reconciliation and execution contract

- Actual task file and full Engram observation 12212 matched before this append. Fresh independent Git readback: clean `master...origin/master`, HEAD `4464d6f7303ecf9b9e61f60db0ab89f4faa43132`.
- Installed Radar freshly confirms S174 (Torre V1 › Adopción project-local reversible › producto-torre — torre-control instala/actualiza y revierte el motor V1 global desde un Release privado verificado, ofrece menú y comandos cerrados, y delega adopción local explícita a S8.13/S172., 🟢 LISTO), depending on delivered S172; check 0 errors / 63 warnings.
- Product edit surface: only `product/tower/v1/bootstrap.mjs` and `product/tower/v1/test/bootstrap.test.mjs`. This subordinate document records technical continuity, not Session closure.
- Route: delegated mapping (4+ files), one bounded writer (two non-trivial files), foreground checks. A scoped read-only assumption challenge rejected treating the 22-member local adoption bundle as a complete global runtime: adoption also needs its JS modules and canonical source layout.
- Internal global-release membership: canonical source paths of existing `BUNDLE_MEMBERS`, plus adoption/bundle/project-files and the five declared bootstrap/release/global/projects/cli modules. A distinct closed release schema prevents confusion with the local bundle. Future-module fixtures do not claim those modules are delivered.
- Acquire and manually supplied SHA-256 verification must precede all interpretation. Validate exact paths, regular-file type, fields, canonical encoding, safe lengths, per-member digests and bounded aggregate content. Return validated in-memory bytes only; no extraction, execution, build, activation, adoption, real download or HOME/global-state mutation.
- TDD enabled by current `openspec/config.yaml` (`strict_tdd: true`), runner `bun test`, framework `bun:test`: observe RED before implementation, then GREEN and REFACTOR.
- Checks: `bun test product/tower/v1/test/bootstrap.test.mjs`; `bun test product/tower/v1/test`; `bun run test`; whitespace validation including new files; independent focused spot check; native review under freshly observed global RDD on. Do not bypass failed checks.
- Forecast: approximately 300–380 authored product/test lines, sequential direct-work-unit strategy under repository policy. Ask before implementation over 400. No new commit or push permission is inferred from historical delivery authority; request explicit authorization at checkpoint if needed.

### Current unit task

- [x] B2 — Implement and verify the positive global-release manifest and bounded bootstrap intake, complete candidate review, and record an authorized work-unit checkpoint. DONE: product commit `deacfe6e850b91945229ed8a01648d21f487dc86` verified and delivered normally. Remaining installer units and dependent Sessions stay unclosed.

### Bootstrap evidence and checkpoint

- Writer changed only the two product paths: bootstrap 119 new lines, test 193, total 312 authored. Internal schema `tower.v1.release/1`, exactly 30 canonical regular files; bounds 16 MiB acquisition, 1 MiB per member, 8 MiB decoded aggregate. Duplicate-key/container/scalar preflight and complete manifest limits precede member decoding. Metadata is frozen, returned Buffers are mutable and isolated.
- Observed strict RED: focused runner exit 1 because bootstrap was absent. GREEN: 8 pass / 551 assertions; triangulation and post-refactor: 8 pass / 556 assertions. `bun test product/tower/v1/test` → 65 pass / 0 fail; `bun run test` → 1615 pass / 0 fail, by writer. No historical RED invented.
- Independent spot check: focused 8 pass / 0 fail / 556 assertions, exit 0. Tracked whitespace check exit 0; both no-index whitespace checks exit 1 with no diagnostics (ordinary differences). Full/V1 suites were not independently repeated; writer results stand.
- Native assessment failed on untracked-declaration handling; conservatively treated as high for separate verification, never low. Native review selected both intended new paths plus this subordinate record: medium/reliability, `review-7b876e9332a8b415`, approved and acknowledged; returned authority burned. Reviewed tree `f1a256074782c263515b679bf507265efb59ea40`. No product correction. This passive evidence append follows review and changes no reviewed product bytes.
- Source SHA-256: `39b3f31702ec582f68e7edc5ca54d2ed73839d9d89d139dc1fb68b1b78719a9c`; test: `18e2581d762edbe2dbb4dc28bcfc6bc090bad954e7120a7d7d045ff364993849`.
- Final pre-checkpoint Git: `master...origin/master`, HEAD remains `4464d6f7303ecf9b9e61f60db0ab89f4faa43132`; only parent task document and two new product files changed, no staging. Tests used injected runners and fixture bytes, no real downloads, code execution from release, installation or HOME/global-state effects. Emojis unchanged.
- Maintainer explicitly authorized normal commit and push with «si, entreguemos». Product work-unit commit: `deacfe6e850b91945229ed8a01648d21f487dc86`, `feat(tower): validate bounded global release bootstrap`; exactly three paths, 342 additions (312 product/test plus 30 subordinate technical lines). No bypass or amendment.
- Fresh independent delivery preflight repeated focused 8 pass / 556 assertions and V1 65 pass / 1,774 assertions, no failures; all whitespace checks were clean and both product hashes matched the reviewed bytes.
- Normal product push succeeded. Hook: 1615 pass / 0 fail, 9,494 assertions across 112 files; installed Radar 0 errors / 63 warnings; ignored report generated successfully but still displayed the honestly labeled historical suite cache (1607 from another commit). Committed-range native assessment remained schema-incompatible, not a low-risk result; independent verification and the prior terminal native review stand.
- Fresh `HEAD`, `origin/master` and `git ls-remote origin refs/heads/master` all matched `deacfe6e850b91945229ed8a01648d21f487dc86`; tree clean. `release.mjs`, plan.yaml and ROADMAP had no delta from the published baseline; source/test hashes unchanged.
- This passive delivery record changes no reviewed product bytes. Publish it normally, then refresh ignored report/cache with documented `bun agent-workflows/radiografia/run.mjs --with-tests` for its resulting HEAD; record the final identity and report result in Engram. Historical judgement stays untouched.
- Nothing to register as a completed product Session: this closes only installer unit 2 of 6. Next product checkpoint is unit 3 (global versioning, atomic activation/rollback and exact compensable launcher migration), only in authorized continuity after fresh installed Radar reconciliation. Benchmark, final README and general remediation remain untouched; current emojis remain intact.
