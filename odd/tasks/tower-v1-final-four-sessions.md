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
- [x] Re-run Radar and execute S174 only while it remains `LISTO`; six sequential units. DONE: delivered `088cf3a` and archived 2026-10-02.
- [x] Re-run Radar and execute S173 only after S174 is delivered and Radar admits it; two sequential units. DONE: delivered `4dcf7dd` and archived 2026-10-02.
- [x] Re-run Radar and execute S150 only after S173 is delivered and Radar admits it; one documentation unit. DONE: delivered `59dc208` and archived 2026-10-02.

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
- Nothing to register as a completed product Session: this closes only installer unit 2 of 6. Next product checkpoint is unit 3 (global versioning, atomic activation/rollback, and exact compensable launcher migration), only in authorized continuity after fresh installed Radar reconciliation. Benchmark, final README and general remediation remain untouched; current emojis remain intact.

## Authorized global-lifecycle unit resumption

The maintainer requested continuing with unit 3 after unit 2 and its passive checkpoint were delivered. Fresh Main is clean `master...origin/master` at `6dc4404e544e049221a52ff02a28b7259a5528a8`. The file and full Engram mirror 12212 revision 14 reconcile; final unit-2 report/cache evidence is recorded separately in Engram 12311.

Installed Radar freshly admits S174 (Torre V1 › Adopción project-local reversible › producto-torre — torre-control instala/actualiza y revierte el motor V1 global desde un Release privado verificado, ofrece menú y comandos cerrados, y delega adopción local explícita a S8.13/S172., 🟢 LISTO), with delivered dependency; validation is 0 errors / 63 warnings. This is technical continuity, not a new product plan or Session closure.

### Decision before RED

- Evidence: unit-3 forecast 240–320 implementation plus 220–300 test lines, 460–620 authored total, above the original 400-line reference. Class: review budget / technical-unit expansion. Contaminates only `product/tower/v1/global.mjs` and `product/tower/v1/test/global.test.mjs`. Checkpoint: clean published `6dc4404`, before RED or writes.
- Ordered alternatives: (1) split 3A revalidation/storage/doctor and 3B activation/migration/rollback, each green, verifiable, reversible and independently committed, aiming at 400; (2) retain one coherent 460–620-line unit with all tests and controls, ask again if forecast exceeds 620; (3) pause without implementation or tree mutation.
- Maintainer explicitly selected alternative 2, `allow_size_exception`. The bounded exception authorizes no test omission, minification, broader files, real installation, general repairs or subsequent unit. Commit/push remains a separate explicit checkpoint decision.

### Execution contract

- Only product surfaces: `product/tower/v1/global.mjs` and `product/tower/v1/test/global.test.mjs`; source references and delivered units are read-only. Route: delegated mapper (4+ files), one bounded writer (two non-trivial files), foreground checks. TDD enabled by current `openspec/config.yaml`, `strict_tdd: true`; exact runner `bun test`, framework `bun:test`. RDD globally on.
- Cover global version storage, atomic command-visible activation/rollback and exact generated-launcher migration with retained bytes/mode and restoration. No project adoption, index, CLI/menu implementation, arbitrary-root discovery or legacy-state import. Use a separate V1 namespace; the older engine's active.json and version store grant no V1 trust.
- Known legacy launcher template is the complete generated file in `agent-workflows/tools/setup.sh:281–285`, including final LF and independently established repository expansion. Its current Main expansion targets `/home/emili/projects/control-tower/Main/agent-workflows/tools/setup.sh`. Actual installed launcher was not observed; migration must compare complete expected bytes, not trust a comment, parse an arbitrary target or execute legacy code. Unknown launchers remain unchanged and block.
- Bootstrap's receipt has mutable isolated Buffers and no repository/tag/asset provenance. Revalidate/copy through the delivered verification boundary before mutation; never treat frozen metadata alone as byte authority. Only canonical positive members become version files; validate referenced versions/state/launcher and retain compensation evidence. No two-renames-as-one-atomic-operation or unproven power-loss claim.
- Tests use disposable roots and injected acquisition/failure doubles, isolated HOME/XDG; no real GitHub downloads, global installation, downloaded-code execution or real HOME/product-state writes. Ordinary test/compiler caches remain permitted. Preserve current Radar and Chanks/Tower emojis.
- Checks: `bun test product/tower/v1/test/global.test.mjs` with observed RED/GREEN/triangulation/refactor; `bun test product/tower/v1/test`; `bun run test`; whitespace including new files; independent focused spot check and native candidate review. No bypass or premature continuation on failed checks.

### Current global unit task

- [x] G3 — Implement, verify and review global versioning, atomic activation/rollback and compensable exact-launcher migration within the revised approved 760–900-line exception, then record an explicitly authorized reversible work-unit checkpoint. DONE: 895 product/test lines verified, native review approved and acknowledged; reversible product commit `42b43529773f11e05000be6ed4a049f9f0be98c9` delivered normally. Installer units 4–6, benchmark, final README and general remediation remain unclosed.

### Writer preflight and revised decision before RED

- The first writer returned `interaction_required`, no files changed and no verification commands run. Detailed read-only forecast: 440–510 source + 320–390 test lines, 760–900 total. Existing snapshot helpers use unbounded recursive filesystem reads and cannot safely supply the required hostile-filesystem bounds; complete provenance/ownership validation, migration, compensation and fault coverage require the revised footprint.
- Decision class: size exception. Contaminates only the same two product files. Fresh parent readback: HEAD `6dc4404e544e049221a52ff02a28b7259a5528a8`, both global implementation/test absent, only this subordinate document modified; checkpoint remains before RED.
- Worker ordered closed choices, relayed completely: `approve_900` accepts one coherent 760–900-line source/test unit with every criterion and only the two authorized files, stopping again if forecast exceeds 900; `pause_620` retains the previous ceiling and pauses without implementation writes.
- Maintainer explicitly selected `approve_900`. This supersedes the earlier 620 ceiling for G3 only, preserves every acceptance criterion and forbids omission/minification or expansion beyond 900 without another decision. No real installation, general repair, new file surface, subsequent unit, commit or push is authorized by this size answer.

### Global lifecycle evidence and pending checkpoint

- Writer changed only `global.mjs` (473 lines) and its test (422 lines), total 895 authored product/test lines within the approved 900 ceiling. Parent tracking is subordinate evidence, not an additional product surface.
- Internal functions: `installGlobal`, `updateGlobal`, read-only offline `doctorGlobal`, and `rollbackGlobal`. Explicit state root contains canonical `state.json` and `versions/<verified-wire-sha256>/`, with exactly the 30 release members plus bounded release/provenance records. Retention is capped at 16 versions; no automatic pruning or legacy-engine import.
- Acquisition options and provenance are pinned before invoking the injected runner; bootstrap bytes are privately copied. Stored versions, complete membership, bounded regular-file reads, ownership, modes, pointers, provenance pins and complete launcher bytes are revalidated before mutation. Unknown launchers, locks or recovery evidence block without reclamation.
- Update and previous-version rollback activate through one atomic state-record rename. First installation publishes state before switching the stable launcher; first restoration switches the command before retiring state, with ordered compensation. These are not two-resource atomic operations; no power-loss durability or malicious same-UID race-sandbox guarantee is claimed.
- Compensation restores prior state and complete launcher bytes/mode or absence. Failed compensation reports both errors and retains bounded owned recovery evidence; no automatic recovery is authorized.
- Observed strict RED: focused runner exit 1 because `global.mjs` was absent. First GREEN: 29 pass / 161 assertions. Triangulation observed substituted-provenance failure, followed by 40 passing tests after pin validation. Refactor unified owned rename bookkeeping; final focused suite 45 pass / 0 fail / 206 assertions.
- Writer checks: focused 45 pass, V1 110 pass / 1,980 assertions, full 1,660 pass / 9,700 assertions across 113 files. Initial full-suite attempt timed out at 120 seconds; the exact foreground rerun exited 0 in 135.90 seconds, with no bypass or environment workaround.
- Fresh independent checks: `bun test product/tower/v1/test/global.test.mjs` exit 0, 45 pass / 0 fail / 206 assertions; `bun test product/tower/v1/test` exit 0, 110 pass / 0 fail / 1,980 assertions; `bun run test` exit 0, 1,660 pass / 0 fail / 9,700 assertions across 113 files, 135.71 seconds. Independent full suite ran once with a 600-second timeout. Tracked whitespace exit 0; both new-file no-index whitespace checks exit 1 with no diagnostics, ordinary differences. No final required check failed or was skipped.
- Source SHA-256: `089bed2fa8b5faefb79cfe079512c7f369ed7c8572422dc1edbe64fb9578bb9a`; test: `731b6db4af3d6eeec227b53e37e39aad11ebc804975bff0ba3572f269b858916`. Independent pre/post hashes and three-path Git projection were unchanged. Historical RED was not independently reproduced. Verifier accidentally read historical `odd/tasks/torre-v1-corte.md` before locating this document; that read caused no write or scope expansion.
- Native assessment was unavailable because ambient untracked declaration failed. Conservatively treated as unassessable/high for verification, with actual large writer profile and separate independent full verification; this is not a low-risk assertion.
- Native review independently selected medium/reliability: `review-5a05bfea32c844df`, 927 changed lines across the two intended new files and this record. Frozen tree `597eb2cb5b9664853cce2a1b31e3faaa539dad71`; approved on last capture and exact acknowledgement succeeded, authority burned. No correction opened or offered. Non-blocking informational WARNING advisories: `R3-cleanup-releases-locks` at `global.mjs:305–310`, and `R3-partial-write-ownership` at `global.mjs:287–290`; separate later work only, not grounds to reopen this review or mutate its product candidate.
- Tests used disposable roots, isolated HOME/XDG/Git/GitHub settings, opaque release fixtures and injected acquisition/fault doubles. No real download, release-code execution, installation, project adoption, index, CLI/menu, report generation, emoji change, staging, commit or push occurred. HEAD remains published `6dc4404e544e049221a52ff02a28b7259a5528a8`; only this record and the two new product files differ.
- This passive post-review evidence append changes no reviewed product bytes. G3 remains unchecked until a separately authorized reversible work-unit commit exists. Request normal commit/push authority; do not implement unit 4, close S174, or admit its benchmark/README dependencies.

### Observed global-unit delivery closure

- Maintainer explicitly authorized normal commit and push including the technical checkpoint with «Si, entregamos y cerramos aca». Stop after this unit; no continuity into unit 4 is authorized.
- Fresh independent delivery preflight reproduced focused 45 pass / 0 fail / 206 assertions and V1 110 pass / 0 fail / 1,980 assertions; all whitespace checks clean, product hashes unchanged, only the three authorized paths. Installed Radar validation: 0 errors / 63 warnings.
- Product work-unit commit: `42b43529773f11e05000be6ed4a049f9f0be98c9`, `feat(tower): add reversible global V1 lifecycle`; exactly three paths, 943 additions (895 product/test plus 48 subordinate technical lines). Normal exact-path staging, no bypass or amendment; reviewed product bytes unchanged.
- Normal product push succeeded. Hook full suite: 1,660 pass / 0 fail, 9,700 assertions across 113 files, 115.43 seconds; Radar 0 errors / 63 warnings. Report generation succeeded for `42b4352` but honestly retained the older 1,615-test cache, not fresh suite evidence.
- Fresh `HEAD`, `origin/master` and `git ls-remote origin refs/heads/master` all matched `42b43529773f11e05000be6ed4a049f9f0be98c9`; tree clean. This records observed publication, not approval alone.
- This passive completion record changes no product bytes. Publish it normally, refresh ignored report/cache using documented `bun agent-workflows/radiografia/run.mjs --with-tests` for the resulting HEAD, and record final checkpoint identity, remote equality and generated evidence in Engram. Historical judgement remains untouched.
- Nothing to register as a completed product Session: G3 closes installer unit 3 of 6 only. Fresh canonical Tower V1 snapshot remains 9/12 Sessions (75%); six technical units remain: installer project registry/wrappers, closed commands/errors, and menu/integration tests; two isolated Pi/Claude Code benchmark units; one final README unit. Dependent work still needs delivery/admission and human continuity. V1 addresses Tower-specific configuration ambiguity, not every host/global/plugin/provider configuration conflict; no real-machine compatibility or installation is claimed.

## Authorized project-registry unit resumption

The maintainer confirmed resuming unit 4 only in Main, using isolated tests and no real installation. Existing document and full Engram mirror 12212 revision 18 reconciled before continuation. Fresh independent preflight: clean `master...origin/master`, HEAD `33e14ce4ae131943728f9132f55a251f30f3d6bd`; installed Radar S174 LISTO, S172 ARCHIVADO, check 0 errors / 63 warnings. The G3 product and passive checkpoint remain delivered; no previous review is reopened.

### Decision and execution contract

- The canonical S174 plan explicitly caps each unit at 400 authored lines. Read-only unit-4 mapping forecast 440–570 source/test lines; the maintainer selected `approve_projects_570`, authorizing one coherent unit up to 570, stopping before further expansion. The G3 exception is not reused.
- Product edits: only `product/tower/v1/projects.mjs` and `product/tower/v1/test/projects.test.mjs`, both absent at preflight. Existing modules, plan and roadmap remain read-only.
- Informational registry: bounded owned versioned data, explicit storage separate from the delivered global lifecycle state root, explicit canonical absolute project roots only. No discovery, inherited trust, cached health authority or registration during global install.
- Wrappers delegate to delivered init/doctor/uninstall/cleanup APIs. Initialization requires explicit trusted resolution. List/status reconcile live local state and never mutate, prune, repair or adopt.
- Accepted partial-success behavior: if the local operation succeeds but registry publication fails, retain the local result and explicitly report the registry failure. Do not roll back successful adoption solely for the informational index; do not claim cross-resource atomicity.
- Route: read-only mapper for 4+ relevant files, one bounded writer for two non-trivial files, delegated independent command spot check. TDD is enabled by `openspec/config.yaml`, runner `bun test`, framework `bun:test`; observe RED before implementation, GREEN, triangulation and REFACTOR. RDD freshly reads globally on; candidate consent remains human-owned.
- Exact checks: `bun test product/tower/v1/test/projects.test.mjs`; `bun test product/tower/v1/test`; `bun run test` (foreground, up to 600 seconds); whitespace including untracked files; two-path product scope and unchanged delivered source; native candidate review before completion. Separate verification follows native assessment when review is unavailable/declined.
- Tests use disposable roots, isolated HOME/XDG/Git/GitHub, injected persistence failures and trusted copied source for installed-layout compatibility. No downloaded fixture execution, real release acquisition, actual installation, HOME product state, general repairs, CLI/menu, emoji changes, benchmark, final README or premature Session closure.
- Delivery policy remains explicitly human-authorized direct Conventional Commit/push to master, no PR, force, bypass or amendment. Implementation authorization does not grant commit or push; G4 remains unchecked until its separately authorized work-unit commit exists.

### Current project-registry task

- [x] G4 — Implement and verify the informational registry and explicit local-operation wrappers within the approved 570-line source/test ceiling; complete native candidate review and record a separately authorized reversible work-unit checkpoint. DONE: 555 product/test lines verified, corrected native review approved and acknowledged; reversible product commit `71b6cc539446b7c6a199001f0c5b9aa8d24df5c0` delivered normally. Installer units 5–6 and dependent Sessions remain unclosed.

### Project-registry evidence and pending checkpoint

- Initial writer delivered 194 source + 321 test lines = 515, with 42 tests. Observed RED: absent module; GREEN initially 33 tests, final 42 / 252 assertions. V1 152 / 2,232 assertions; full 1,702 / 9,952 assertions across 114 files, 107.58 seconds, all passing.
- Independent pre-correction verification reproduced focused 42, V1 152 and full 1,702, all passing; full ran once with a 600-second timeout, 110.73 seconds. Whitespace, hashes, empty index, unchanged HEAD and three-path scope matched. Delivered modules, plan and roadmap were unchanged.
- Internal exports: init/doctor/uninstall/cleanupRegisteredProject, listProjects and projectStatus. Closed registry schema `tower.v1.projects/1`, up to 128 sorted unique roots, 4,096-byte paths and 65,536-byte records. Explicit owned storage, bounded no-follow regular-file reads, exclusive cooperative lock and owned temporary publication; retained residue blocks reuse, never auto-reclaimed. Successful local result and registry publication/cleanup error remain separately observable; no cross-resource atomicity, power-loss durability or malicious same-UID sandbox guarantee.
- Native assessment was unavailable on undeclared untracked files, treated conservatively with independent full verification. Native review `review-e92b55a33306b400` selected medium/reliability, 537 initial changed lines across two product paths and this subordinate record; host resolved candidate consent. Initial tree `e9f0b175acd1ad2cdbfbdf9fe78f6a669608a370`.
- Native deterministic introduced blocker `R3-unicode-path-validation` required explicit UTF-8 round-trip rejection before filesystem access. Bun path normalization masked lone-surrogate aliases. One correction plan allowed 48 diff lines; actual correction 42 (source +2/-1, test +39/-0), only the two product paths.
- Corrected source 195 + test 360 = 555 authored lines, within the approved 570 ceiling. Actual Node v22.22.1 regression first failed with 42 pass / 1 fail (`Missing expected exception`), then passed with 43 tests / 257 assertions. High/low surrogates, malformed options, persisted roots, replacement-character sentinel preservation and valid Unicode controls are covered; existing tests and unrelated bytes preserved. Corrected V1 153 pass, full 1,703 pass / 9,957 assertions, 105.05 seconds; whitespace clean.
- Targeted immutable native validation approved corrected tree `429a49966e3a3d5fb4b9b5ab1e5b25d2c16d3609`; exact acknowledgement succeeded and authority burned, consumed revision `sha256:3b41fd6a6586843cbbe96f2fe2bb5368b791d3449209cbda815584838c856c1b`. No STATUS after burn. The follow-up assessment recorded explicit closed review and writer verification as the record, no additional independent full suite required. Final independent focused spot check passed: 43 pass / 0 fail / 257 assertions; installed Radar 0 errors / 63 warnings, no warning-equivalence claim. Hashes, HEAD, empty index and three-path scope remained as expected. The spot verifier did not independently remeasure the historical correction delta or new-file whitespace; writer correction-diff and no-index whitespace evidence stand.
- Source SHA-256: `6f68f124fa6c5ba31213d1f2500acc8e0d4e6b744d09ebf959cc6d2b366574fd`; test: `aee9e8e3cac6dc0c0a82f8261204bc99c128ea0bc279d74da7075d2383d645d2`.
- A malformed correction binding was rejected before capture; separate incident diagnosis confirmed unchanged Git/hashes and fresh bound STATUS reoffered the slot, then the exact capture succeeded. An acknowledgement input was rejected as controller-only, with mutation false; the exact facade continuation without that input then succeeded. No recovery/reset or invented authority was used.
- Tests use isolated disposable fixtures and trusted copied release source; no actual installation, downloads, HOME product-state changes or later units. No staging, commit or push. This passive post-review record changes no reviewed product bytes. Final spot-check evidence is retained under Engram topic `tower-v1/projects-unit4-final-verification` once observed.

### Observed project-registry delivery closure

- Maintainer explicitly approved normal commit/push and technical checkpoint with «Si apruebo el push». This authorizes G4 delivery only, not unit 5, installation or closure of S174.
- Fresh independent preflight reproduced focused 43 pass / 257 assertions and V1 153 pass / 2,237 assertions, with no failures; reviewed hashes, empty index, whitespace, 555-line product scope and published baseline matched. Installed Radar exited 0 with 0 errors / 63 warnings; no warning-equivalence claim. A model-authored diagnostics-free predicate incorrectly treated warnings as blocking; separate read-only diagnosis confirmed the actual activated `.githooks` policy blocks Radar command failure, not warning text. No warnings, repository policy or hooks were modified or suppressed.
- Product work-unit commit: `71b6cc539446b7c6a199001f0c5b9aa8d24df5c0`, `feat(tower): register explicit V1 project operations`; exactly three paths, 591 additions / 1 deletion (555 source/tests plus subordinate technical evidence and one passive punctuation edit). Exact-path staging and normal commit, no bypass or amendment; reviewed product bytes retained.
- Normal product push succeeded. Hook: 1,703 pass / 0 fail, 9,957 assertions across 114 files, 118.44 seconds; installed Radar 0 errors / 63 warnings. Ignored report generation succeeded for `71b6cc5` but honestly retained the historical 1,660-test cache from another commit, not fresh suite evidence.
- Fresh `HEAD`, `origin/master` and `git ls-remote origin refs/heads/master` all matched `71b6cc539446b7c6a199001f0c5b9aa8d24df5c0`; tree clean. This records actual publication, not approval alone.
- This passive completion record changes no reviewed product bytes. Publish it normally, then refresh ignored report/cache with documented `bun agent-workflows/radiografia/run.mjs --with-tests` for the resulting HEAD; final checkpoint identity, remote equality and report evidence are retained in Engram. Historical judgement remains untouched; do not repair or restamp it.
- Nothing to register as a completed product Session: G4 closes installer unit 4 of 6 only. Installer units 5–6, two isolated Pi/Claude Code benchmark units and final README remain pending. No real installation, release download, HOME product-state change, general repair, emoji change or later unit was performed.

Next product checkpoint: only in authorized continuity after fresh installed Radar reconciliation, resume unit 5 (closed scriptable commands and fail-closed errors). Do not auto-continue or close S174; benchmark and final README remain dependent.

## Authorized closed-command unit resumption

The maintainer asked on 2026-10-02 to finish the remaining Tower V1 work in order (S174 → S173 → S150) and release. Fresh preflight: clean `master...origin/master` at `9fef984`; installed Radar shows S174 🟢 LISTO with S172 archived. Units 1–4 are delivered (`121e728`, `deacfe6`, `42b4352`, `71b6cc5`).

Maintainer decisions recorded before writes (Engram 12872):

- `torre-control` defaults: launcher `~/.local/bin/torre-control` (only the exact known generated legacy launcher is migrated), global state `~/.local/share/torre-control/v1`, project registry under that state, release repository `achangkuon/control-tower`. Explicit flags may override; no cwd inference.
- No repository code builds or hashes the V1 release envelope. It becomes a new small Session (build only, no publish; final ID S182 because S175 was already taken), planned separately before the release. S174 files do not grow for it.

Unit 5 scope: only `product/tower/v1/cli.mjs` and `product/tower/v1/test/cli.test.mjs`. Closed scriptable commands for global install/update/doctor/rollback, explicit-root project init/doctor/uninstall/cleanup and list; fail-closed errors, including registry failure after local success. Mapping forecast 380–470 authored lines; the per-unit size is a Gentle AI reference, not a Session cap (decision A4). No menu, real installation, download or HOME mutation in tests.

- [x] G5 — Implement, verify and review the closed command surface, then record a separately authorized work-unit checkpoint. DONE: maintainer authorized commit/push and continuation; product commit `4296aca6285b5d73bb9da18ef8de939e4049e943` pushed to master. Independent full suite at that HEAD: 1,743 pass / 0 fail, 10,292 assertions, 115 files, 120.13 s.
- [ ] G6 — Interactive menu and fault-injected integration tests on the same files. DONE: maintainer authorized commit/push and S174 closure; product commit `088cf3a3c96098e47d44315f30d8ef0a89640057` pushed. Independent full suite at that HEAD: 1,760 pass / 0 fail, 10,538 assertions, 115 files, 122.70 s; ancestor of `origin/master`.

### Closed-command unit evidence

- Writer delivered `cli.mjs` 117 + `test/cli.test.mjs` 274 = 391 authored lines, 40 tests. Observed RED: 0 pass / 1 fail / 1 error (module absent); GREEN 36, final 40 pass / 0 fail. V1 suite 193 pass / 0 fail. Whitespace clean on both new files; scope exactly the two product files plus this record.
- Design: registry default `~/.local/share/torre-control/projects`, a sibling of `v1`, because the global lifecycle owns the whole state root. Only default parent directories are created (never override paths); `--state`, `--launcher`, `--registry` override. No arguments fails closed until unit 6 adds the menu.
- Native review `review-ee9aae351b99b052`: medium/reliability, 405 changed lines, approved and acknowledged (authority burned). Two non-blocking warnings carried into G6: `R3-default-preparation` (read-only `doctor`/`list` still create default parent directories, `cli.mjs:98-99`) and `R3-recovery-evidence` (AggregateError recovery evidence is reduced to a one-line message, `cli.mjs:70-72`).

### Menu and integration unit evidence

- Writer changed `cli.mjs` +99/-10 and `test/cli.test.mjs` +258/-5. Observed RED 42 pass / 11 fail, GREEN 53, final 57 pass / 0 fail; V1 suite 210 pass / 0 fail. `git diff --check` clean; scope exactly the two product files plus this record; no new `/tmp/tower-cli-*` fixtures remain (322 pre-existing directories from earlier runs were preserved, not deleted).
- Menu opens only when stdin and stdout are TTYs and dispatches through the same closed commands; otherwise no arguments still fails closed. SHA is always typed; project roots are explicit absolute paths. `update`, `rollback`, project `uninstall` and `cleanup` require typing UPDATE, ROLLBACK, UNINSTALL or CLEANUP. Explicit exit returns 0; invalid input or EOF returns 1 with no effect.
- G5 warnings resolved: global `doctor` and `list` no longer create default directories; project `doctor` stays mutating because its registered wrapper publishes registry membership. AggregateError adds one bounded stderr JSON line `tower.cli.recovery/1` (at most eight single-line messages of 240 characters plus an omitted count, no stacks).
- Isolated integration tests drive real dispatch over the real global/projects modules with injected gh doubles and fault hooks: install/doctor/update/rollback round trip, SHA mismatch before state change, activation fault compensation, unknown launcher preserved, explicit-root project lifecycle with registry failure after local success, and menu-driven install and declined destructive action. No real HOME, download or release-code execution.
- Native review `review-b5be2515a6eea570`: medium/reliability, 374 changed lines, approved with no findings and acknowledged (authority burned).

### S174 closure

- `entrega.commit: 088cf3a3c96098e47d44315f30d8ef0a89640057` recorded in `openspec/plan.yaml`; `radar archivar S174` succeeded, `radar check` 0 errors / 63 pre-existing warnings, ROADMAP regenerated. Radar now admits S173 as LISTO. Next: S173 two units, then S175 planning (release packager), then S150.

## S173 benchmark resumption

Fresh Radar: S173 🟢 LISTO after S174 archived. Only `product/tower/v1/benchmark.mjs` and `product/tower/v1/test/benchmark.test.mjs` are authorized.

Observed spike (disposable `/tmp/s173-spike-sTX9`, no model cost, Engram 12889/12890): a loopback capture server records each host's first real inference request. Claude Code 2.1.287 with isolated `HOME`/`CLAUDE_CONFIG_DIR`, `ANTHROPIC_BASE_URL` and a dummy key posts `/v1/messages` (63,837 bytes non-adopter vs 64,036 adopter); it retries, so only the first POST counts, and it injects git status, so fixtures must be committed identically. Pi 1.0.0 with isolated `HOME`/`PI_CODING_AGENT_DIR`, a `models.json` openai-completions provider, `--offline --no-extensions --no-session --approve` posts `/v1/chat/completions` (5,865 vs 6,534). Pi needs `read`/`bash` tools enabled for the skill listing; never `--no-tools`.

Maintainer decision: the ordinary-question check uses a real model through an operator-supplied API key in the environment, for that check only. Without the key the behavioral result is reported as not measured, never inferred. Byte measurement never needs a real model.

- [x] B1 — Isolation, loopback capture boundary for Pi and Claude Code, and ordinary-question arm (optional real-model forwarding).
- [x] B2 — Independent Radar contrast, failure modes and proxy-free report, keeping B1 green.

### B1 evidence

- Writer: `benchmark.mjs` 193 + `test/benchmark.test.mjs` 151 = 344 authored lines, 11 tests. RED 0 pass / 1 fail / 1 import error (module absent); GREEN 11 pass / 116 assertions; V1 suite 221 pass. Whitespace clean; scope exactly the two files plus this record.
- Real capture-only run (no key, no model): Pi 1.0.0 request 5,906 → 6,595 bytes (+689; system text +675, tools +0); Claude Code 2.1.287 64,386 → 64,499 (+113; system text +112, tools +0). Behavior `not_measured` in capture-only mode by design.
- Native review `review-1f532c5a9dbfca16`: medium/reliability, 355 lines, approved and acknowledged. Non-blocking `R3-radar-false-positive` (`benchmark.mjs:28`, a bare `radar` word in a shell input counts as execution) is carried into B2.
- Incident: the first B1 push (`a14701a`) timed out at 900 s and did not publish. Diagnosis: `test/helpers/git.mjs:24-28` prepends a git proxy to PATH; the benchmark test placed its fake-host dir ahead of it, and `test/helpers/bin/git:6-16` only strips itself when first, so it re-executed itself forever inside an unbounded synchronous `git init`. Fix within the two S173 files: leading proxy entries keep precedence, and every fixture/host child process has a bounded, injectable timeout that fails closed. RED: repro hung 60 s (exit 124); GREEN: 16 pass in 5.23 s; V1 226 pass. Native review `review-0fe29b2ae05535de` approved without findings and acknowledged. Follow-up outside S173: make the proxy strip every occurrence of its own directory.

### B2 evidence

- Writer: `benchmark.mjs` 321 and `test/benchmark.test.mjs` 405 lines total (B2 about +136/-14 and +196/-3). RED 16 pass / 10 fail, then 20 / 10 after the module-cache follow-up; GREEN 30 pass. Proxy-first PATH run 30 pass; V1 suite 240 pass; whitespace clean; only the two S173 files changed.
- Flow Radar = `go build` of the adopter-installed `.control-tower/radar` sources; canonical Radar = independent build of `agent-workflows/tools/radar` (never the adopted copy). Builds run offline: operator `GOMODCACHE` read-only, disposable `GOCACHE`, `GOFLAGS=-mod=readonly`, `GOPROXY=off`, `GOTOOLCHAIN=local`; missing modules fail closed as `blocked`.
- Real run: valid minimal v3 plan, missing plan and `schema_version: 2` are all `equal` (exit code, stdout, stderr), schema `radar.snapshot/v1`, fixture HEAD unchanged after both invocations. Hosts measured as in B1 (Pi +689, Claude Code +113 request bytes); behavior `not_measured` without the real-model key. Report carries explicit `limits`.
- `R3-radar-false-positive` fixed: only executable-position Radar invocations count. One transient B1 capture failure was observed once and did not recur.
- Native review `review-25496646300b0872`: medium/reliability, 349 lines, approved and acknowledged. Non-blocking follow-ups: `R3-real-contrast-coverage` (unit tests fake the Radar build; real contrast is proven by the manual run) and `R3-shell-prefixes` (`env X=1 radar` or `sudo radar` is not detected).

### S173 closure

- Maintainer decision (Engram 12892): close S173 without the real-model run; the ordinary-question check is reported as `not_measured` in V1 and the README must state it. The harness keeps `--real-model` for a later operator run.
- Delivered `a14701a`, `b0d4ab8`, `4dcf7dd`; full suite at `4dcf7dd` 1,790 pass / 0 fail (201.98 s), push hook 1,790 pass. `entrega.commit: 4dcf7dd9badc52392f2a925e54fa60c7d49c0ff5` recorded; `radar archivar S173` succeeded, check 0 errors / 63 warnings, ROADMAP regenerated. S150 becomes admissible.
- Follow-ups outside V1 Sessions: git test proxy should strip every occurrence of its directory; `test/lifecycle.test.mjs` CT-R12-S1 runs close to its 5 s timeout; benchmark shell-prefix detection; real-model behavioral run.

### S150 closure

- README.md rewritten (320 lines, neutral Spanish) from delivered sources only, with a per-claim source checklist; states no release is published yet, SHA-256 must come from a second channel, first install runs from a repository checkout, and the behavioral check is not measured. Native review `review-03f865f38e91cd20`: low risk (non-executable), approved and acknowledged. Push hook 0 failures. `entrega.commit: 59dc20826ff2ef2ee522406e50e8f3ce434cb5a2` recorded and S150 archived; Tower V1 Sessions complete. Next: plan S175 (release envelope builder) before the release.

## S182 release builder

- Plan ID correction: S175 already identifies an unrelated planned Session, so the builder took the next free permanent ID, S182. Maintainer approved the S182 plan entry on 2026-10-02 (Radar check 0 errors / 63 warnings; S182 LISTO).
- Authorized files: `product/tower/v1/release-build.mjs`, `product/tower/v1/test/release-build.test.mjs`. Build only from an exact clean commit, deterministic bytes and SHA-256, self-validation through bootstrap verification, output outside the repository, no publish/tag.

- [x] R1 — Implement, verify and review the deterministic release builder. DONE: delivered `3824b73`, push hook 1,799 pass / 0 fail, archived 2026-10-02.

### R1 evidence

- Writer: `release-build.mjs` 117 + `test/release-build.test.mjs` 165 = 282 authored lines, 9 tests. RED 0 pass / 1 fail / 1 error (module absent); GREEN 7, final 9 pass / 76 assertions; proxy-first PATH run 9 pass; V1 suite 249 pass; whitespace clean.
- 30 members in bytewise path order with fixed key order; reads bytes from the commit tree only, refuses dirty worktrees, self-validates through `bootstrapVerifiedRelease` with an injected runner, writes exclusively (`wx`, 0644) outside the repository.
- Real dry builds from a local clone of `51c372b`: two runs produced identical 438,596-byte assets with SHA-256 `e4be8288bed019f5f79f0558218bbfbe41a703d77d3fbc84b0f2277885494402`. That asset predates the builder commit; the release asset must be rebuilt from the final release commit.
- Native review `review-f8ffee750ff0470c`: medium/reliability, 282 lines, approved and acknowledged. Non-blocking follow-ups: `R3-incomplete-output` (a failed write can leave a partial output file) and `R3-lazy-fetch` (partial clones could trigger a promisor fetch).

### S182 closure

- `entrega.commit: 3824b73ffa516abe15fe2d848a183b97a5edfb2f` recorded; `radar archivar S182` succeeded; check 0 errors / 63 warnings; ROADMAP regenerated. All Tower V1 Sessions, including the builder, are closed. Next: the release itself (tag, asset build from the final commit, private GitHub Release upload, SHA-256 through a second channel) is a separate, explicitly authorized outward action.

## V1 release

- Maintainer authorized publishing v1.0.0 on 2026-10-02. Asset built with `release-build.mjs` from clean `b11e49b2edbc3838ab15cd99b397e4d5b52a9209`: `tower-v1.json`, 438,596 bytes, 30 members. SHA-256 is delivered to the maintainer through the conversation (second channel) and deliberately omitted from the release notes and this repository.
- Private GitHub Release `v1.0.0` created on `achangkuon/control-tower`, target `b11e49b`, not draft or prerelease, one asset `tower-v1.json` (438,596 bytes); tag resolves to `b11e49b`.
- End-to-end check through the shipped acquisition path (`bootstrapVerifiedRelease`, authenticated `gh`, exact tag): correct digest admitted (schema `tower.v1.release/1`, 30 members including `cli.mjs`); an all-zero digest was rejected with `GitHub Release SHA-256 mismatch`. Nothing was installed and HOME was not modified.
- Not done, separate decisions: installing on this machine (the existing `~/.local/bin/torre-control` is migrated only if it is the exact known generated launcher; otherwise install blocks and preserves it), the real-model behavioral benchmark run, and the recorded follow-ups (git test proxy, CT-R12-S1 timeout margin, benchmark shell prefixes, builder partial-output cleanup).

## Partner readiness planning

- Real install on the maintainer machine (2026-10-02, Engram 12940): v1.0.0 installed from the checkout with `umask 022`; the exact legacy launcher was migrated with a retained backup (extra copy in `~/.local/state/torre-v1-install-proof/`); a hash snapshot of global skills, agent instructions and the legacy engine store was identical before and after. Demo project `~/projects/torre-demo` adopted and healthy.
- Found: installed-launcher `doctor`/`update`/`rollback` reject the retained legacy backup (path recomputed relative to the installed copy); umask 002 yields an unclear permissions error; partners need a one-command install; macOS untested.
- Maintainer decisions: private one-command install through authenticated `gh` (partners already have repository access), a Mac is available for a guided test, and partner readiness goes before the general problem-resolution priority. Planned S183 (installed-launcher legacy backup + permissions message) and S184 (one-command gh install, partner guide, Mac test) under priority `torre-v1`.

## S183 / S184 / v1.0.1 execution

Maintainer approved on 2026-10-02 executing S183, S184 and the v1.0.1 release in order, delivering each only after approved review and a green full suite, stopping on any failure or open decision.

- [x] S183 — Installed launcher accepts the retained legacy backup; clear permissions error. DONE: `c9c31a5`, push hook 1,805 pass / 0 fail, archived.
- [ ] S184 — One-command gh install, partner guide, macOS status. Delivered `53accb8` (push hook 1,814 pass / 0 fail); stays open until the guided macOS test result is recorded.
- [x] v1.0.1 — Build from the final commit, publish privately, verify end to end, update this machine. DONE 2026-10-02.

### S183 evidence

- Writer +165/-22 across the four files. RED 103 pass / 5 fail; GREEN 108 pass; proxy-first PATH run 108 pass; V1 suite 255 pass; whitespace clean.
- Retained legacy backups are validated against their own stored evidence (canonical base64, SHA-256, integer mode, exact three-line generated shape with a safe absolute canonical path); install-time migration still requires the exact known legacy launcher; v1.0.0 state schema unchanged. Permission errors name the directory, its mode and the `chmod 755` / `umask 022` remedy, or the other owner; only directories the CLI creates are normalized to 0755.
- Read-only check against the maintainer's real v1.0.0 state with the new code: `doctorGlobal` healthy both with an installed-copy repository path (previously failing) and the checkout path; installation bytes unchanged.
- Native review `review-5fd7cc7828f97bfe`: medium/reliability, 195 lines, approved without findings and acknowledged.

### S184 evidence

- Writer: new `install.mjs` 103 + `test/install.test.mjs` 121; `release-build.mjs` +37/-6 and its test +37/-1; README +91/-7. RED 7 behavioral failures; GREEN 18 focused pass; proxy-first run 18 pass; V1 suite 264 pass on the second run (first run had one transient benchmark capture `blocked` instead of `measured`, unchanged file — recurring capture flake, follow-up).
- Chain of trust: partners verify one installer SHA-256 (second channel) before running it; the stamped installer pins repository, tag, envelope asset, envelope SHA-256 and the 30 canonical paths, verifies the envelope before parsing, extracts privately and delegates to the S174 `cli.mjs install`, which re-acquires and fully validates. Unstamped source refuses to run. `--dry-run` supports the guided Mac test.
- One-liner: `d=$(mktemp -d) && gh release download '<TAG>' -R achangkuon/control-tower -p torre-install.mjs -D "$d" && printf '%s  %s\n' '<SHA_DEL_INSTALADOR>' "$d/torre-install.mjs" | shasum -a 256 -c - && bun "$d/torre-install.mjs"`.
- README: partner guide, platform table (Linux tested on WSL; macOS NOT tested yet; Windows only through WSL), maintainer release procedure.
- Native review `review-ca97deaed8cd4524`: medium/reliability, 403 lines, approved and acknowledged. Non-blocking: `R3-partial-release-output` (release-build can leave a partial output on write failure) and `R3-real-install-unproved` (tests use doubles; the real install is proven only after publication).

### v1.0.1 release

- Built from clean `53accb813740f037777e89e24da945fdeaf2c669` with `--tag v1.0.1`: `tower-v1.json` 440,340 bytes and stamped `torre-install.mjs` 7,996 bytes. SHA-256 values were given to the maintainer in the conversation only.
- Private Release `v1.0.1` created (target `53accb8`, not draft) with both assets.
- Partner end-to-end on a fresh disposable HOME with the real `gh` login and the exact one-liner: installer checksum OK, envelope verified, global install, `doctor` healthy, project adopted and listed. With umask 002 the created directories were 0755. A first attempt with a deliberately group-writable HOME stopped with the new actionable S183 message.
- Maintainer machine updated from the checkout (`update --tag v1.0.1`): active v1.0.1, previous v1.0.0; installed-launcher `doctor` now healthy (failed on v1.0.0); demo project healthy; configuration snapshot unchanged.
- Pending: guided macOS test (S184 closure), then mark macOS as tested in README.

### S184 agent install runbook

- Maintainer asked for a repository document so a partner's coding agent can install Tower from the GitHub link alone. S184 `archivos` expanded with `product/tower/v1/INSTALL-AGENTS.md` (docs/ belongs to another Zona); README links it at the top in Spanish and English.
- Runbook rules: the installer SHA-256 and tag always come from the human (maintainer's second channel), never from GitHub; stop on checksum failure; ask before installing tools, editing shell files or adopting a project. Claims checked against `install.mjs`, `cli.mjs`, `global.mjs` and `adoption.mjs` (uninstall removes the journal; cleanup only for an intact residual journal; no global uninstall command in V1).
- Native review `review-bbe17af08173b01b`: approved and acknowledged; its two non-blocking notes (existing-install reference, path quoting) were fixed afterwards as a passive text edit.
- Fresh-agent trial (2026-10-02): a clean Claude Code 2.1.287 (no personal hooks, skills or instructions; disposable HOME; temporary credential copy removed afterwards) received only the partner's sentence, the repository link, the tag and the installer SHA-256. It found `INSTALL-AGENTS.md` through `gh`, verified the installer (`OK`), installed v1.0.1, added the PATH line, adopted a demo project and reported `healthy` everywhere. Its notes led to two passive fixes: the README no longer claims no release exists, and the runbook now selects the shell startup file from `$SHELL` and warns about a shadowing `torre-control`. A first trial attempt created a stray `~/.claude/.claude.json`; it was identified by its start time and removed.

## S186 / S185 / v1.0.2 execution

Maintainer reported the V1 menu aborting (CR LF Enter) and approved on 2026-10-02 executing S186, S185 and the v1.0.2 release in order, delivering each only after approved review and a green full suite, then updating this machine.

- [x] S186 — setup.sh launcher becomes `torre-setup` and never writes `torre-control`. DONE: `7723d7e` (bun hook 1,814 pass; Python launcher tests 11 pass), archived.
- [x] S185 — Arrow-key colored V1 menu tolerant of LF, CR and CR LF. DONE: `a86b4cb`, push hook 1,824 pass / 0 fail, archived.
- [x] v1.0.2 — Build, publish privately, verify partner flow, update this machine. DONE 2026-10-02.

### S186 evidence

- Writer: `setup.sh` +40/-10, new `agent-workflows/tests/test_setup_launcher.py` 140 lines (180 authored). RED 10 tests / 12 failure records; GREEN 11 pass (`python3 -m unittest discover -s agent-workflows/tests -p test_setup_launcher.py`); `bash -n` clean; shellcheck unavailable.
- Default launcher `torre-setup`; `torre-control` is reserved and never written (refused with an explanation; `--link` returns non-zero, skills install still succeeds with a warning); an existing `torre-setup` is overwritten only when it is the exact generated launcher. `install_tower` delegates to the legacy Tower `install.sh`, which writes `torre`, not `torre-control`. Real HOME untouched.
- Native review `review-a24086acaa163f08`: high risk (shell/process boundary), four lenses (risk, resilience, readability, reliability), approved without findings and acknowledged.

### S185 evidence

- Writer: `cli.mjs` +134/-16, `test/cli.test.mjs` +151. RED 60 pass / 8 fail; GREEN 68, final 70 pass; proxy-first run 70 pass; V1 suite 274 pass.
- Visual menu (arrows, j/k, Enter, q/Esc/Ctrl-C, colors honoring NO_COLOR, alternate screen, hidden cursor) over the same closed commands and confirmations; terminal restored via try/finally plus SIGINT/exit handlers before dispatch. Shared reader treats CR, LF and CR LF as one Enter; raw-mode empty answers abort; the numbered fallback (`TOWER_MENU=plain`, dumb terminals, no raw mode) allows two retries to absorb an icrnl extra newline.
- Real pty smokes from the checkout: Down x8 + Enter ran `list` (healthy demo project, restore escapes observed); plain menu with `6\r\n` and a CR LF root ran `project doctor` (healthy) — the exact sequence that aborted before.
- Native review `review-31a1664c095c9d77`: medium/reliability, approved and acknowledged; non-blocking `R3-001` (process-level SIGINT/exit handlers, `cli.mjs:142-143`).

### v1.0.2 release

- Built from clean `1ba5543508844feaaec2c67433114dcade3dc8c0` with `--tag v1.0.2`: `tower-v1.json` 446,892 bytes and stamped `torre-install.mjs` 7,996 bytes; SHA-256 values given to the maintainer in the conversation only. Private Release `v1.0.2` created with both assets.
- Partner end-to-end on a fresh disposable HOME with the exact one-liner: installer checksum OK, global install, project adopted; the installed v1.0.2 menu driven through a pty with arrow keys and a CR LF Enter selected `project doctor`, accepted a CR LF root, returned healthy and emitted the terminal-restore sequence.
- Maintainer machine updated through its own v1.0.1 launcher (`update --tag v1.0.2`): active v1.0.2, previous v1.0.1, `doctor` healthy, demo project healthy, configuration snapshot unchanged. `setup.sh --link` created `~/.local/bin/torre-setup`; `torre-control` bytes unchanged. Disposable trial directories removed.
- README and the agent runbook now name v1.0.2 and document the v1.0.0–v1.0.1 menu error. Pending: guided macOS test (S184 closure).

## Installer TUI redesign (S187–S190)

- Maintainer feedback on v1.0.2 (2026-10-02): the hand-built menu still aborts text prompts and exits on a mouse click in their real terminal (Herdr inside Windows Terminal), not reproducible in a pty (split CR LF, SGR mouse and focus events all pass); a raw byte capture was requested. They want the Gentle AI installer experience.
- Read-only audit of Gentle AI v4.0.0 (MIT; Engram 12980): Go + Bubbletea/Bubbles/Lipgloss state machine; Welcome → Detection → Selection → Review → Progress → Complete; detection of OS, shell, tools, dependency versions and agent configs; per-screen footers, Esc back, alt screen, resize-aware, no mouse.
- Decisions (Engram 12981): Go + Bubbletea TUI, Spanish UI text; Bun keeps lifecycle authority. Planned S187 (read-only `status` JSON), S188 (Go home screen), S189 (wizards and projects), S190 (per-platform verified binaries, default launch, v1.1.0 release, partner and macOS tests). Radar: 0 errors; S187 LISTO.

- [x] S187 — read-only `status` command. DONE: `c67dc1b`, push hook 1,840 pass / 0 fail, archived.
- [x] S188 — Go home screen. DONE: `09941dc` (go test pass; push hook 1,840 pass after one retry — first attempt failed only the pre-existing timing-sensitive `installed torre launch-worker ignores legacy and PATH shims` test at 5.37 s), archived.
- [x] S189 — wizards and projects. DONE: `987e65f`, go test pass, push hook 1,840 pass / 0 fail, archived.
- [x] S191 — interface polish: no orphaned operations, partial success, stale status, neutral Spanish (maintainer chose polish before packaging). DONE: `6572174`, push hook 1,840 pass / 0 fail, archived.
- [ ] S190 — packaging, default launch, v1.1.0 (now depends on S191).

### S187 evidence

- Writer +203/-5 in `cli.mjs` and its test. RED 70 pass / 1 fail (unknown command); GREEN 71; final 86 pass; proxy-first V1 suite 290 pass; whitespace clean.
- `status` prints one `tower.v1.status/1` line: engine (read-only `doctorGlobal`), projects (`listProjects`, live and read-only), prerequisites gh (version + authenticated), bun, git, go, agents claude/pi/codex/opencode (PATH executable vs HOME config), system (os, arch, shell), version. Probes are bounded (2 s, SIGKILL), failures reported in place; never calls registered project doctor or prepares directories (byte-identical HOME test).
- Real read-only run on the maintainer machine: engine healthy v1.0.2, demo project healthy, gh 2.95.0 authenticated, bun 1.3.14, git 2.54.0, go 1.26.4, all four agents present; installation hash unchanged.
- Native review `review-a9b4c52a13d2cca5`: medium/reliability, approved without findings and acknowledged.

### S188 evidence

- Writer: seven new files under `product/tower/v1/tui/` (650 authored lines excluding go.sum), Bubbletea v1.3.10 and Lipgloss v1.1.0, no Bubbles. RED compile failure; GREEN `go vet` and `go test` pass, including layouts at 45x16, 28x12 and 28x9 and NO_COLOR.
- Home: tower logo, version, Estado from `torre-control status` (engine, projects, prerequisites, agents, system), Spanish menu; Diagnóstico (read-only `doctor`) and Ayuda functional; mutating entries show "Disponible en la próxima versión". Non-TTY exits 2 with a Spanish message.
- Parent pty found the first build blocked on an unanswered OSC 11 background query (blank screen). Fixed by configuring Lipgloss explicitly (dark background, profile from NO_COLOR/TERM/COLORTERM): no terminal queries at all, title in 0.022 s, status in 0.97 s without answering anything.
- Native review `review-7d5dde4afe9c674b`: high (process boundary and dependencies), four lenses, approved and acknowledged. Non-blocking, carried to S189: `R3-diagnostic-order`, `R4-stale-diagnostic` (`model.go:118-122`), `R3-scroll-boundary` (`model.go:108-113`), `R3-height-boundary` (`styles.go:49-53`).

### S189 evidence

- Maintainer approved expanding S189 to `main.go`, `model_test.go` and `styles.go` (plan updated) and the parent raised the writer's own stop line to ~1,000 formatted lines (decision A4: size is a reference, not a Session cap). Result: 1,059 added lines across eight files; RED compile failure; GREEN 16 tests + 21 subcases; `go vet`, `gofmt -l` clean.
- Wizards: install/update (prerequisites, tag, asset prefilled `tower-v1.json`, SHA never prefilled with inline 64-hex validation, review, typed UPDATE, progress with elapsed time, mapped results), rollback (summary + typed ROLLBACK), Proyectos (list, doctor, typed UNINSTALL/CLEANUP, adopt with absolute path and typed `confiar` → `--trust trusted`). Adapter runs only an allow-listed closed argv without a shell, 5 min for install/update and 30 s otherwise, stdout/stderr bounded to 64 KiB.
- Terminal startup: Bubbletea v1.3.10 `tea_init.go:21` queries OSC 11 and CPR at package init (same as Gentle AI); a responsive terminal renders in 0.01 s, an unresponsive pty waits the 5 s termenv timeout and then renders. S188's "no queries" claim was wrong; the parent's earlier blank screens came from answering only one of the two queries.
- Parent pty navigation with the maintainer's real read-only status: home Estado, install wizard up to the inline invalid-SHA error, Proyectos list, rollback review (4f7eb49 → 7385d30) — nothing confirmed; active version unchanged.
- Native review `review-0d310ab006e3e7ee`: high, four lenses, 1,001 changed lines, approved and acknowledged. Non-blocking, to address before partner release: R4-detached-operation (`model.go:112-114`), R3-partial-success (`wizard.go:294-295`), R3-stale-status (`model.go:125-127`), R3-loading-action (`model.go:157-161`), R4-large-status-degradation (`main.go:78-82`), R2-001 (`wizard.go:315-320`). UI copy uses voseo in places ("Pedile", "Escribí"); neutral Spanish was specified.

### S191 evidence

- Writer +326/-49 across six interface files; RED five new test groups failing; GREEN 23 tests; gofmt, go vet clean; voseo grep empty.
- Quitting during an operation asks for confirmation and then waits visibly for the child to finish (interrupting install/update/rollback is riskier than waiting, even though the CLI compensates); the program never exits with an unreported running child. Local success with a registry failure is shown as success with a warning; `tower.cli.recovery/1` evidence is shown. Status reloads after each action with sequence ids; status-dependent actions wait for a loaded status; oversized or invalid status output yields a clear message. R2-001 block refactored. All visible copy in neutral professional Spanish.
- Parent pty navigation on the real read-only status: requisitos, tag, asset, "Solicite este código…", invalid SHA error, Proyectos, rollback review with "Escriba ROLLBACK"; nothing confirmed, active version unchanged.
- Native review `review-da469d78a18f5dc0`: medium/reliability, 375 lines, approved without findings and acknowledged.

### S190 evidence (code)

- Writer +427 lines (release-build, install, cli, tests, README, INSTALL-AGENTS); global.mjs unchanged. RED four intended failures; GREEN focused 160 pass / 1 optional skip; V1 suite 298 pass / 1 skip.
- release-build `--tui-out-dir` cross-builds `torre-tui-{linux,darwin}-{amd64,arm64}` from the commit archive (CGO off, trimpath, stripped, buildid empty, offline, read-only module cache) and stamps their SHA-256s into the installer; two builds of HEAD 686a695 were identical (linux-amd64 b904da15…, linux-arm64 378b5789…, darwin-amd64 297af85b…, darwin-arm64 5d293791…, ~3.6–3.8 MB). The installer verifies and installs only the platform binary under `~/.local/share/torre-control/tui/<sha>/torre-tui` with an atomic `tui/current.json`; it runs `update` when the engine is already healthy. `torre-control` with no arguments re-hashes the binary against the record before executing it and falls back to the built-in menu otherwise (pty: verified binary opened the interface; one tampered byte produced the fallback).
- Native review `review-39d67b4576308b28` approved. Independent security review (Judgment-style judge) then BLOCKED two issues: HIGH ancestor `go.work` could redirect dependencies during the build (fixed with an explicit Go env allow-list including GOWORK=off/GOENV=off; real-Go regression with a malicious workspace replace), MEDIUM ambient TORRE_CONTROL_CLI passed to the verified interface (now always derived internally; regression with /tmp/attacker). Re-judgment APPROVED; binary SHA-256s unchanged. Native re-review `review-411bcd80793dfc9e` approved; non-blocking R3-interrupted-binary-publication (`install.mjs:110`), R3-startup-fallback (`cli.mjs:391-392`).
- Pending for S190 closure: publish v1.1.0 (maintainer decision), partner end-to-end, update this machine, guided macOS test.

### v1.1.0 release

- Maintainer authorized publishing v1.1.0 and updating this machine. Built from clean `eb95e9916b7e4c1c17e91f7abad7b9ea26966642`: `tower-v1.json` 457,396 bytes, stamped `torre-install.mjs` 13,164 bytes, four interface binaries with the same SHA-256s as the dry builds (reproducible). SHA-256 values given to the maintainer in the conversation only. Private Release `v1.1.0` created with all six assets.
- Partner end-to-end on a fresh disposable HOME with the exact one-liner: installer checksum OK, engine installed, platform binary verified and installed with `tui/current.json`, and `torre-control` with no arguments opened the Go interface (home Estado, Spanish menu).
- Maintainer machine updated with the same one-liner (now selects update): active v1.1.0, previous v1.0.2, doctor healthy, demo project healthy, interface record linux-amd64; configuration snapshot and `torre-setup` unchanged.
- README and the agent runbook now name v1.1.0. Still open: S190 closure after the guided macOS test (also S184).

## Day close (2026-10-02)

- Maintainer deferred the guided macOS test: S184 and S190 are marked `diferida: true` in the plan (code, docs and v1.1.0 already delivered; only the macOS evidence and their closure remain). Resume by running the partner one-liner for v1.1.0 on a Mac, recording the output, switching README/INSTALL-AGENTS macOS to "probado", then closing both Sessions.
- Follow-ups recorded, not planned: R3-interrupted-binary-publication (`install.mjs:110`), R3-startup-fallback (`cli.mjs:391-392`), GOWORK=off for the benchmark Radar build, flaky timing tests (CT-R12-S1; installed torre launch-worker shims), git test proxy strip-all, release-build partial output, benchmark capture flake, real-model behavioral benchmark run.
