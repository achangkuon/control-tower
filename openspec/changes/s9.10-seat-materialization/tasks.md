# S9.10 Seat Materialization Tasks

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 305–400 authored additions + deletions |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | One direct-push commit: M9.10.1 → M9.10.2 → M9.10.3, all required for one coherent behavior |
| Delivery strategy | direct-push to `master`, no PR |
| Chain strategy | not-applicable |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: not-applicable
400-line budget risk: Medium

### Authored-line allocation

| Path | Estimate |
|---|---:|
| `workspace/slots.mjs` | 95–125 |
| `hosts/seat-cli.mjs` | 25–40 |
| `test/workspace/slots.test.mjs` | 150–185 |
| `test/hosts/seat-cli.test.mjs` | 35–50 |
| **Total executable Area** | **305–400** |

| Tarea | Estimate |
|---|---:|
| T9.10.1.1 / .2 / .3 / .4 | 20–30 / 45–65 / 15–20 / 5–10 |
| T9.10.2.1 / .2 / .3 / .4 | 40–45 / 35–45 / 25–30 / 20 |
| T9.10.3.1 / .2 / .3 / .4 | 35–45 / 35–45 / 25–35 / 5–10 |
| **Total** | **305–400** |

**Hard stop:** immediately before candidate presentation, count authored additions plus deletions for only the four Area paths. If the honest total exceeds 400, stop; do not compress or remove tests. No independently verifiable/revertible sequential direct commit exists because the public command, its mutation proof, and its rollback proof are one behavior; report the overage and request a human Session split rather than take a size exception or plan a PR chain.

## Session S9.10

**Result:** a confirmed full-binding `materializar` changes one clean permanent seat to one exact, non-master commit only after proving preconditions, postconditions, and safe recovery; `assign()` remains read-only and stable.

**Scope:** only `workspace/slots.mjs`, `hosts/seat-cli.mjs`, `test/workspace/slots.test.mjs`, and `test/hosts/seat-cli.test.mjs`. Do not modify `bin/torre`, `jornada.sh`, payload files, Herdr, Tower/runtime/DB, or planning files. Tower stays OFF; no network, commit, push, or PR occurs during apply.

### Módulo M9.10.1 — Public full-binding boundary

**Result:** CLI parsing and pure binding validation reject invalid input before Git while preserving the existing read-only `assign()` contract.

#### Tarea T9.10.1.1 — RED public syntax and preservation

**Action:** add failing public tests for the exact six-flag `materializar` form, standalone exactly-once `--confirmar` in any position, and all malformed/unknown/duplicate/positional/valued-confirmation cases; freeze `asignar` output, Git observations, and zero mutation.

- [ ] Add the RED examples in `test/hosts/seat-cli.test.mjs`; accept only `CT_SEAT_REJECTED` before any Git call, no Herdr call, and unchanged `asignar` with no switch/checkout/branch/reset/ref-update argv. Focused command: `bun test test/hosts/seat-cli.test.mjs`. Dependencies: accepted design and strict-TDD baseline. Rollback boundary: remove only these new RED assertions. <!-- sdd-owner: implementation -->

#### Tarea T9.10.1.2 — GREEN strict parser and pure validator

**Action:** implement the command-specific parser and side-effect-free complete-binding validator; expose `materialize(mainPath, binding)` while reusing validation without changing `assign()` semantics.

- [ ] Update `hosts/seat-cli.mjs` and `workspace/slots.mjs`; accept closed binding shape, exact lowercase 40-hex `base_sha`, existing role/lane/branch rules, named permanent seat, and literal `confirmed: true` before the first Git call, with exact public error rendering. Focused command: `bun test test/hosts/seat-cli.test.mjs`. Dependencies: T9.10.1.1 RED. Rollback boundary: revert parser/validator/API additions only; no Git mutation exists yet. <!-- sdd-owner: implementation -->

#### Tarea T9.10.1.3 — TRIANGULATE validation precedence

**Action:** add alternate valid flag orders and invalid values to prove rejection precedence, confirmation scoping, no-Herdr behavior, and `assign()` compatibility independently of the first RED examples.

- [ ] Extend `test/hosts/seat-cli.test.mjs`; accept deterministic `CT_SEAT_REJECTED` with no Git argv for every invalid shape, plus one success-path mapping assertion that does not claim persistent assignment state. Focused command: `bun test test/hosts/seat-cli.test.mjs`. Dependencies: T9.10.1.2 GREEN. Rollback boundary: remove only triangulation cases. <!-- sdd-owner: implementation -->

#### Tarea T9.10.1.4 — REFACTOR boundary clarity

**Action:** consolidate parser/validator fixtures and private helpers only if the exact CLI contract, `assign()` observations, and pre-Git validation order remain fixed.

- [ ] Refactor only `hosts/seat-cli.mjs`, `workspace/slots.mjs`, and `test/hosts/seat-cli.test.mjs`; accept the focused suite unchanged and a reviewable parser without shared permissive parsing. Focused command: `bun test test/hosts/seat-cli.test.mjs`. Dependencies: T9.10.1.3 TRIANGULATE. Rollback boundary: revert this refactor without removing the approved RED/GREEN behavior. <!-- sdd-owner: implementation -->

### Módulo M9.10.2 — Deterministic Git proof and bounded recovery

**Result:** the module performs one guarded switch only after two equal snapshots and reports every unsafe/uncertain state without destructive Git operations.

#### Tarea T9.10.2.1 — RED deterministic safety matrix

**Action:** create injected-Git failure tests for seat availability, exact non-master commit proof, existing target branch, snapshot drift, switch failure, and each postcondition failure.

- [ ] Add RED matrix cases in `test/workspace/slots.test.mjs`; require exact codes for absent/detached/dirty/unmerged seats, unresolved/nonexact/master-contained base, existing target/replay, drift, switch failure, wrong branch/HEAD/ref, dirty seat, displaced-ref drift, and other-worktree drift; assert no destructive argv. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: M9.10.1 complete. Rollback boundary: remove only matrix tests. <!-- sdd-owner: implementation -->

#### Tarea T9.10.2.2 — GREEN snapshots, one mutation, and recovery

**Action:** implement `materialize()` snapshots A/B, exact commit/base/ref checks, one `switch --create --no-track`, postcondition comparison, and the bounded rollback decision tree through the injected argv port.

- [ ] Update `workspace/slots.mjs`; accept one forward switch only after equal snapshots, success only after every required postcondition, `CT_SEAT_MUTATION_FAILED` or `CT_SEAT_POSTCONDITION_FAILED` only with proven restoration, and `CT_SEAT_ROLLBACK_FAILED` with preserved diagnostics when safety proof is absent. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: T9.10.2.1 RED. Rollback boundary: revert only materialization/snapshot/recovery code; `assign()` remains read-only. <!-- sdd-owner: implementation -->

#### Tarea T9.10.2.3 — TRIANGULATE drift, replay, and rollback safety

**Action:** add independent command-order and fault cases for both snapshots, exact current-master containment, at-most-once replay, restored rollback, and preserved-partial uncertainty.

- [ ] Extend `test/workspace/slots.test.mjs`; accept snapshot-B drift before switch, an existing requested branch as `CT_SEAT_BRANCH_EXISTS` even with matching values, no reset/clean/stash/force/delete absent proof, and structured `before`/`observed`/`rollback` diagnostics after mutation. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: T9.10.2.2 GREEN. Rollback boundary: remove only alternate safety cases. <!-- sdd-owner: implementation -->

#### Tarea T9.10.2.4 — REFACTOR observation discipline

**Action:** deduplicate snapshot comparison and recovery observation helpers without weakening the complete snapshot identity or the one-forward-mutation invariant.

- [ ] Refactor `workspace/slots.mjs` and `test/workspace/slots.test.mjs`; accept unchanged matrix results, stable error precedence, and no new Git command class outside the approved read/switch/bounded-rollback argv. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: T9.10.2.3 TRIANGULATE. Rollback boundary: revert helper-only changes while retaining all matrix behavior. <!-- sdd-owner: implementation -->

### Módulo M9.10.3 — Disposable real-Git proof

**Result:** a disposable repository proves the same behavior against real Git, including safe restoration and deliberate preservation of uncertain state.

#### Tarea T9.10.3.1 — RED real-Git harness

**Action:** create a temporary real repository with `master`, three linked permanent worktrees, idle branches, and a side-branch commit not reachable from current master.

- [ ] Add a disposable harness in `test/workspace/slots.test.mjs` using `test/helpers/git.mjs`; accept real-Git RED cases for clean success intent, dirty/unmerged seat non-mutation, existing target branch non-mutation, and a decorator that dirties between snapshots. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: M9.10.2 complete. Rollback boundary: delete only temporary test repositories and harness cases. <!-- sdd-owner: implementation -->

#### Tarea T9.10.3.2 — GREEN real-Git success and safe restore

**Action:** make the existing implementation satisfy the harness without adding a second Git port or a production-only bypass.

- [ ] Update only `workspace/slots.mjs` and `test/workspace/slots.test.mjs`; accept real success with requested branch/HEAD at the exact non-master commit, clean seat, preserved old ref, plus safe postcondition recovery that returns to the old branch and deletes only the exact operation-created unchanged target ref. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: T9.10.3.1 RED. Rollback boundary: revert real-harness support and materialization adjustments together. <!-- sdd-owner: implementation -->

#### Tarea T9.10.3.3 — TRIANGULATE uncertain state preservation

**Action:** inject real-Git faults after switch: one dirty-between-snapshots path and one unexpected commit path that makes exact rollback unsafe.

- [ ] Extend `test/workspace/slots.test.mjs`; accept `CT_SEAT_DRIFT` before switch for snapshot drift, and `CT_SEAT_ROLLBACK_FAILED` after a post-switch unexpected commit while preserving that commit/ref and the displaced ref with no reset/clean/stash. Focused command: `bun test test/workspace/slots.test.mjs`. Dependencies: T9.10.3.2 GREEN. Rollback boundary: remove only fault decorators and their temporary repositories. <!-- sdd-owner: implementation -->

#### Tarea T9.10.3.4 — REFACTOR and final evidence

**Action:** simplify disposable harness cleanup and test helpers without weakening isolation, then freeze verification evidence on final bytes.

- [ ] Refactor only `test/workspace/slots.test.mjs` and, if required, `workspace/slots.mjs`; accept both focused suites, then `bun test` on unchanged final bytes, the four-path authored-line count at or below 400, and a recorded real-Git success/recovery result. Focused command: `bun test test/workspace/slots.test.mjs test/hosts/seat-cli.test.mjs`. Dependencies: T9.10.3.3 TRIANGULATE. Rollback boundary: revert the single executable commit limited to the four Area paths; if count exceeds 400, stop before candidate presentation. <!-- sdd-owner: implementation -->

## Parent lifecycle actions

- [ ] Start or reuse bounded review only after the final candidate remains within the 400-line direct-commit cap; keep delivery direct to `master` with no PR and do not open Herdr. <!-- sdd-owner: parent -->
- [ ] After delivery and verification evidence, archive S9.10; keep S101 blocked until that archive is complete. <!-- sdd-owner: parent -->
