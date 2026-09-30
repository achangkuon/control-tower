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

- [ ] R1 — Verify, native-review and commit the preserved release-acquisition unit. IN PROGRESS; route delegated verification plus native review, parent exact-path staging/commit. Acceptance: focused/V1 checks observed, reviewed bytes match committed tree, 144-line source-and-test unit retained. Commit and review evidence pending.
- [ ] R2 — Deliver the release unit with all three local planning commits through normal push. PENDING; parent delivery command, delegated report/suite readback. Acceptance: clean tracked/index/untracked state, hook suite and Radar results observed, origin/master matches delivered HEAD, report regenerated for that HEAD. No Session closure claimed.

### Fresh reconciliation evidence

- Main: `master`, HEAD `6443a82256131bf578142313715ce89a361015b2`, three commits ahead of `origin/master`; no tracked diff; only the preserved release source and test are untracked.
- SHA-256 source: `d7410c1ce18a76c694fe3e81fd1881cea8b3db983fe4a41d6ffd527126db5d08`.
- SHA-256 test: `7cefe0a0f3a16d1b073ddc25f0aed230b25d47ddd0e29ffe05845e08df077e61`.
- Both hashes match the prior session's preservation record exactly.
- Installed `/home/emili/.local/bin/radar` freshly reports admission LISTO, 0 errors / 63 warnings. No warning-equivalence assertion was independently tested.
- `core.hooksPath` is `.githooks`; RDD globally on; no peers currently advertised.
- `git diff --check` has no diagnostics but does not inspect the untracked source/test; dedicated checking remains pending.

Next checkpoint: focused/V1 verification, native review of the two-file release unit with this subordinate technical record, exact-path commit, then normal delivery.
