# S5.13 Main Policy Evidence — Implementation Tasks

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 325–380 authored additions + deletions |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single independently verifiable and revertible direct-commit unit |
| Delivery strategy | ask-on-risk |
| Chain strategy | none |

Decision needed before apply: Yes
Next action: resolve-blockers
Chained PRs recommended: No
Chain strategy: none
400-line budget risk: Medium

The repository forbids PRs and chained PRs. This plan has one future direct-commit boundary; tests stay with the behavior. The hard cap is 400 authored additions plus deletions. If the refined forecast or live diff exceeds 400, STOP before further source mutation and replan; do not hide overflow or use an exception.

## Dependency Execution Gate — bound to T5.13.1.1

The isolated worktree currently has no `node_modules`. Before RED, source mutation, or test mutation, prove that a complete, already-approved dependency environment is available and that Bun resolves the required packages in it. Do not install, provision, or materialize a cache implicitly. The diagnosed incomplete private/offline cache missing Bun's 33 resolution aliases is unavailable and is not a fallback.

If no complete approved environment can be proved, stop at this gate and request maintainer authority for the exact dependency-installation, provisioning, or cache-materialization action before any install. Record the proof or the blocking authority request with the T5.13.1.1 execution evidence; this gate does not create a Plan, Sesión, Módulo, or Tarea ID.

## Budget by Task and File

All ceilings count authored additions plus deletions and sum to 380. `continuation/integrated-base.mjs` and `test/continuation/integrated-base.test.mjs` have a zero-line budget: the corrected design proves their callback contract is sufficient.

| Plan task | Path | Budget |
|---|---|---:|
| T5.13.1.1 | `test/continuation/main-policy-evidence.test.mjs` | 45–55 |
| T5.13.1.2 | `continuation/main-policy-evidence.mjs` | 105–120 |
| T5.13.1.2 | `test/continuation/main-policy-evidence.test.mjs` | 40 |
| T5.13.1.3 | `test/continuation/main-policy-evidence.test.mjs` | 20–25 |
| T5.13.2.1 | `test/policy/jornada.test.mjs` | 20–25 |
| T5.13.2.2 | `policy/jornada.mjs` | 40–50 |
| T5.13.2.2 | `test/policy/jornada.test.mjs` | 15 |
| T5.13.2.3 | `test/continuation/main-policy-evidence.test.mjs` | 20 |
| T5.13.2.3 | `test/policy/jornada.test.mjs` | 20–30 |
| **Total** | **Four authorized changed files only** | **325–380** |

## M5.13.1 — Main Evidence Acquisition and S5.6 Canonicalization

- [ ] **T5.13.1.1 — RED.** First satisfy the dependency execution gate above. Only after that proof, add failing cases in `test/continuation/main-policy-evidence.test.mjs` for constructor-bound capability assertion before every I/O; strict `P<positive integer>` and target-ID input rejection; unique trusted registry project selection; each truthful shared identity mismatch; exact resolver-approved `plan-N/STATUS.md`; and three separately named revision facts. Witness that invalid, revoked, absent, duplicate, stale, foreign, cross-project, or unsafe inputs create no snapshot and no registry, Support, Git, descriptor, write, or dispatch effect. Focused command: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/continuation/main-policy-evidence.test.mjs`. Rollback: remove only the failing cases in this test file; no runtime source, registry, Plan, DB, or persistent state changes are permitted. <!-- sdd-owner: implementation -->
- [ ] **T5.13.1.2 — GREEN.** Create `continuation/main-policy-evidence.mjs` with only `createMainPolicyEvidence({ authority, capability, registryStore, ports: { readText, inspectGit }, descriptorFs }).readCurrent({ plan_id, target_session_ids })`. Assert authority before all I/O; select exactly one trusted project; compare only truthful shared identity facts (never equate `binding.store_path` with registry `main_store_path`); compose unchanged `resolveSupportManifest`; and expose no request-time authority substitution. Implement the private, unexported descriptor reader with `O_NOFOLLOW`, two descriptor stats, one allocated buffer, short-read handling, stable regular-file checks, and close-on-all-paths. Feed the exact same buffer into S5.6 `parseSessionPlanSnapshot` for every sorted target, retain one digest, deeply freeze the approved evidence shape, and add the corresponding minimal passing acquisition cases. No `readFile` fallback, second parser, re-open, per-target buffer, provider adoption, or `integrated-base` change. Focused command: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/continuation/main-policy-evidence.test.mjs`. Rollback: delete this new module and its paired tests only; preserve all existing Main, registry, Support, S5.6, and coordinator behavior. <!-- sdd-owner: implementation -->
- [ ] **T5.13.1.3 — REFACTOR/TRIANGULATE.** Keep the Main boundary small while triangulating `test/continuation/main-policy-evidence.test.mjs`: multiple targets cause one descriptor open and one raw-byte buffer; every snapshot uses S5.6 only and reports the shared canonical digest; and results are sorted and recursively frozen. Through the constructor-only descriptor facade, prove no fallback/re-read and fail-closed witnesses for final symlink replacement, short read, size drift, observable in-place mutation, open failure, close failure, and S5.6 rejection. Capture before/after registry and selected-Plan bytes plus sentinel state for successful and rejected acquisition. Focused command: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/continuation/main-policy-evidence.test.mjs`. Runtime scenario: N/A—this is a read-only, injected-filesystem boundary; its real composition scenario is covered in T5.13.2.3 without a DB, remote, or Control Tower runtime. Rollback: revert only this module's test/code additions; retain no fixture or state mutation. <!-- sdd-owner: implementation -->

## M5.13.2 — Policy Canonical Evidence and Main-Only Dispatch

- [ ] **T5.13.2.1 — RED.** Add failing cases in `test/policy/jornada.test.mjs` for a new evidence-aware Policy entry point while preserving every existing `resolveEligibility` assertion and result shape. Require exact evidence keys/schema, project/Plan binding, separately named positive-safe-integer revisions, exact blocked-plus-candidate target set, one snapshot per target, shared source digest, and identical canonical graph. Require a `BLOQUEADO` target with an open `escala` decision; make candidates eligible only when `LISTO`, graph-independent in both directions, provably Area-disjoint, Resource-disjoint, uncontaminated, and without an open escalation. Reject stale, foreign, malformed, duplicate, mismatched, ambiguous, or unbound evidence and prove Policy has no acquisition, filesystem, registry, authority, capability, assignment, or dispatch dependency. Focused command: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/policy/jornada.test.mjs`. Rollback: remove only these failing Policy tests; no source or runtime state is changed by this task. <!-- sdd-owner: implementation -->
- [ ] **T5.13.2.2 — GREEN.** In `policy/jornada.mjs`, preserve `resolveEligibility` and add `resolveContinuationEligibility` as a pure named export that first retains legacy checks, then validates canonical Main evidence and conservative declared semantics. Return frozen `STOP` with `CT_NO_ELIGIBLE_CANDIDATE` for zero eligible candidates, return `ALLOW` only for exactly one eligible candidate, and fail closed with the specified evidence-invalid or ambiguity families. Do not add a mode bypass, evidence-acquisition callback, registry/authority/fs input, assignment behavior, or dispatch behavior. Add only the test cases needed to make the RED cases pass. `continuation/integrated-base.mjs` and its test remain unchanged unless an explicit new design proof overturns the corrected design; absent that proof, a change there is prohibited. Focused command: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/policy/jornada.test.mjs`. Rollback: revert the new Policy export/helpers and paired assertions only, leaving the legacy resolver unchanged. <!-- sdd-owner: implementation -->
- [ ] **T5.13.2.3 — REFACTOR/TRIANGULATE.** Add the real composition proof in `test/continuation/main-policy-evidence.test.mjs` and the final policy edge coverage in `test/policy/jornada.test.mjs`, within the budget table: use real Main authority binding, registry load, Support resolution, S5.6 parsing, `resolveContinuationEligibility`, and unchanged `continueIntegratedBase`. Prove exact `reconcile → Support → Policy → Main dispatch` order for one admissible candidate and zero dispatch for `DENY`, `STOP`, stale/foreign evidence, rejection, and ambiguity. Before/after witnesses must preserve registry bytes, Plan bytes, Git/state observations, and all parked S5.5 candidate/patch paths byte-identically; no enrollment, provider transport, Plan/DB writer, remote effect, or production `trustedBindingProvider` adoption may appear. Focused commands: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test test/continuation/main-policy-evidence.test.mjs test/policy/jornada.test.mjs`; full command: `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun test`. Runtime scenario: the real in-process continuation composition above; external/runtime harness is N/A because the route is read-only and no DB, remote, or Tower state may be armed. Rollback: one direct revert of the four authorized changed files (`continuation/main-policy-evidence.mjs`, `policy/jornada.mjs`, and their focused tests), preserving `integrated-base`, all prohibited areas, and the parked identities. <!-- sdd-owner: implementation -->

## Apply Boundary

Apply may start only after the T5.13.1.1 dependency gate produces complete-environment proof or the maintainer grants the exact missing dependency authority. Keep the four authorized paths in one future direct commit only after its focused and full verification evidence passes and the live authored diff remains at or below 400. RDD remains disabled/unmanaged; no PR, chained PR, commit, push, or delivery is authorized by these planning tasks.
