# Radar — detección de rama primaria `main`/`master`

Technical ODD continuity only; not a product Session, plan status, or delivery authority.

## Authority and boundaries

- Authority: Emilio requested in this Conversation that Radar also detect repositories whose primary branch is `main`.
- Problem: historical-session validation and `radar archivar` resolve `refs/heads/master` directly, so repositories that use only `main` fail even when their delivery evidence is valid.
- Allowed source and test surfaces: `agent-workflows/tools/radar/git.go`, `agent-workflows/tools/radar/check.go`, `agent-workflows/tools/radar/archivar.go`, `agent-workflows/tools/radar/state.go`, `agent-workflows/tools/radar/state_test.go`, `agent-workflows/tools/radar/check_test.go`, `agent-workflows/tools/radar/archivar_test.go`.
- Operational surface after verified implementation: `agent-workflows/tools/install-radar.sh` and the installed `$HOME/.local/bin/radar` binary.
- Non-goals: changing any repository plan, historical record, delivery policy, remote branch, or Git ref; committing, pushing, or creating a PR without separate authorization.
- Effective Strict TDD: enabled by `openspec/config.yaml`; focused Radar Go tests are the applicable runner.

## Tasks

- [x] **R-T1 — Lock the regression with RED tests** — five focused tests failed before production changes on the fixed `master` assumption; coverage now includes `main`, `master`, `origin/HEAD`, missing candidates, ambiguity, and selection drift.
- [x] **R-T2 — Resolve the primary branch centrally** — one resolver now selects the local integrated branch, historical validation/state/archive use it, and archive publication revalidates both ref and OID. Focused tests and `go test ./... -count=1` pass.
- [x] **R-T3 — Verify and install Radar** — independent verification passed the full Radar suite; the binary was installed and `radar status`/`radar faltan` now succeed in ecom-ecuador Main and its revision worktree without a local `master` alias.

## Evidence

- Exploration: `check.go` hardcodes `master` for compact historical entries; `archivar.go` hardcodes it before integration and publication checks.
- Why it worked before: the failing historical path is reached only after compact `historico` entries exist. Ecom-Ecuador gained two such entries for S47 and S50; a temporary local `master → origin/main` alias was used during archival and later removed.
- Initial repository state: Control Tower `master` clean at `ad8c5a8bb8899dbf914a8297c986a1090a01cf10`; installed Radar status for Control Tower succeeds.
- Maintainer expansion: Emilio explicitly authorized adding only `agent-workflows/tools/radar/state.go` after the RED/GREEN cycle exposed the same hardcoded branch in archived-state computation.
- Writer verification: focused regressions passed; full Radar suite `go test ./... -count=1` passed; gofmt and `git diff --check` passed. Candidate diff: 250 additions and 18 deletions across seven source/test files.
- Independent verification: `go test ./... -count=1` passed in 7.625s and `git diff --check` reported no findings. The separately requested focused command was unavailable because it was not supplied as one exact command; the full suite includes the regression tests.
- Native review: approved and acknowledged under lineage `review-d54ba6652edcfcb8` before installation.
- Installation: `agent-workflows/tools/install-radar.sh` compiled and installed `$HOME/.local/bin/radar` successfully.
- Operational proof without a local `master`: ecom-ecuador Main `radar status` returned `21% (12/55 S)` and `radar faltan` returned 24 sessions; the revision worktree also returned 24 sessions. All three commands exited 0 and neither historical `master` error appeared.
- Work-unit commit: `32d4ee73f80011c35ff8768b76bb8e4a7ba32c2d` (`fix(radar): detect integrated main branch`). Rollback boundary: revert this commit to restore the previous fixed-`master` behavior together with its tests and ODD record.
