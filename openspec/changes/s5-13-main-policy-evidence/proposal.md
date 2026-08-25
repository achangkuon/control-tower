# S5.13 — Trusted Main Policy Evidence and Main-Only Dispatch

## Decision

Connect the existing trusted Main evidence-acquisition authority to the existing `S5.6` canonical session-plan snapshot parser, then pass that canonical evidence to the existing Policy evaluator and retain dispatch exclusively in Main.

The required ownership chain is:

```text
Main capability check
  → one trusted registry entry
  → exact safe roadmap Plan path
  → one raw-byte read
  → S5.6 canonical snapshot validation
  → existing Policy evaluation
  → Main-only dispatch after reconcile → Support → Policy
```

This proposal authorizes planning only. It does not authorize RED, implementation, test execution, source or test mutation, commits, pushes, pull requests, delivery, runtime execution, remote effects, or persistent-state mutation.

## Problem

The trusted components already exist, but they are not connected into one end-to-end path that lets Main justify a continuation dispatch from current canonical Plan evidence. Without this connection, evidence provenance is difficult to explain and easy to weaken through caller-supplied facts, duplicated parsing, multiple reads, revision conflation, or authority moving into Policy.

The current product gap is therefore not a missing provider or transport. It is the missing composition between existing Main authority and capability, `S5.6` canonicalization, existing Policy evaluation, and Main-only dispatch. Closing that gap is required before `S5.5` can safely use eligibility outcomes in the continuation loop.

## Intent and product outcome

After `S5.13`:

- Main proves its evidence capability before any I/O;
- Main resolves exactly one trusted project registry entry and the exact safe roadmap Plan path;
- one raw-byte read feeds every requested canonical target snapshot;
- `S5.6` remains the sole parser and canonical validator of Plan evidence;
- Policy evaluates canonical evidence but cannot acquire evidence, assign work, or dispatch;
- Main dispatches only after the existing `reconcile → Support → Policy` sequence permits it;
- `DENY`, `STOP`, or no eligible candidate produces zero dispatch;
- `binding.revision`, global `registry_revision`, and `registry_entry_revision` remain separate facts;
- the full route remains read-only through acquisition and evaluation.

## Authority and ownership split

| Owner | Authorized responsibility | Explicit prohibition |
|---|---|---|
| Main | Prove the constructor-bound capability before I/O, resolve trusted project evidence, perform the one raw-byte read, invoke canonicalization and Policy, and dispatch after the approved sequence. | Must not accept caller-supplied authority facts or dispatch before Policy allows it. |
| `S5.6` | Sole parser and canonical validator for session-plan snapshots. Every target snapshot derives from the same raw bytes and canonical digest. | Must not acquire Main authority, evaluate eligibility, assign, or dispatch. |
| Policy | Evaluate canonical evidence, bind expected blocked/candidate session IDs and declared semantics, and return an admissible decision. | Must not read the Plan, resolve registry authority, assign work, or dispatch. |
| Support | Preserve its existing read-only role in the `reconcile → Support → Policy` sequence. | Must not receive Main dispatch authority or become an evidence owner. |
| Registry/Main authority | Existing read-only sources used to establish the unique trusted project and exact evidence location. | Their ownership, schemas, storage, and transport are unchanged. |

No request caller may supply or override the project, repository root, Plan path, raw bytes, digest, parser, provider callback, or authority facts. Trusted construction-time dependencies do not become request-time substitution seams.

The following revisions are independent and MUST NOT be equated, substituted, or used as aliases:

1. `binding.revision` — the binding revision;
2. `registry_revision` — the global registry revision;
3. `registry_entry_revision` — the selected project entry revision.

## Approved scope

### Writable area

- `continuation/main-policy-evidence.mjs`
- `policy/jornada.mjs`
- `test/continuation/main-policy-evidence.test.mjs`
- `test/policy/jornada.test.mjs`
- `continuation/integrated-base.mjs` — only if design proves the existing callback payload cannot carry the required result without weakening the authority boundary; default is no change
- `test/continuation/integrated-base.test.mjs` — only with a justified `integrated-base.mjs` composition change or required integration proof

### Read-only reuse

Existing registry/store behavior, Support manifest resolution, the `S5.6` parser and canonical validator, and Main authority/capability may be imported or reused read-only. Reuse does not transfer ownership and does not authorize edits to those areas.

### Non-goals and prohibited areas

The following are prohibited write targets:

- `enroll/**`
- `plugin/**`
- `.opencode/plugins/**`
- `hosts/**`
- `install/**`
- `support/**`
- `registry/**`
- `contracts/**`
- `schemas/**`
- `main-store/**`
- `escalation/**`
- `core.mjs`
- `mcp.mjs`
- `delivery/**`
- manifests and lockfiles
- DB writers, Plan writers, and any remote-effect path

This change does not create enrollment, host transport, provider transport, a second parser, a new authority store, dynamic assignment, delivery behavior, or a new public dispatch owner. The prior S5.5-specific enrollment/plugin proposal and host-transport proposal are withdrawn as overengineered and provide no residual authority or dependency.

## Evidence invariants

1. Main capability is proven before the first read or other evidence I/O.
2. Project resolution is unique, trusted, and cross-project safe; absent, ambiguous, stale, foreign, or unsafe evidence fails closed.
3. The Plan path is the exact safe roadmap path derived from trusted evidence, never a caller-provided path.
4. Exactly one raw-byte read supplies every target snapshot requested by the operation.
5. Every target snapshot is parsed and validated only by `S5.6` and retains the same canonical digest derived from those bytes.
6. No fallback re-read, alternate parser, caller-provided digest, or per-target byte source is allowed.
7. Acquisition and Policy evaluation mutate no Plan, registry, store, DB, support state, or runtime state.
8. Policy binds the expected blocked and candidate session IDs and rejects malformed, ambiguous, stale, or foreign canonical evidence.
9. Main dispatch occurs only after `reconcile → Support → Policy`; rejection or no eligible candidate means zero dispatch.
10. The three revision facts remain distinct through acquisition, snapshot creation, Policy evaluation, and diagnostics.

## Affected areas

| Area | Expected change |
|---|---|
| `continuation/main-policy-evidence.mjs` | Introduce the Main-owned evidence acquisition/composition boundary using existing trusted authority, capability, registry/store access, Support manifest resolution, and `S5.6` canonicalization. |
| `policy/jornada.mjs` | Extend existing eligibility evaluation to consume and validate the canonical evidence needed for this route without adding acquisition, assignment, or dispatch authority. |
| `continuation/integrated-base.mjs` | Prefer no change. Modify only if design demonstrates that the existing callback payload is insufficient for the required Main-only composition. |
| Focused tests | Prove pre-I/O capability checks, unique project/path resolution, one-read semantics, revision separation, canonical parsing, fail-closed Policy behavior, exact sequence, zero-dispatch rejection, and read-only witnesses. |
| `S5.5` | Becomes unblocked only after `S5.13` is implemented and verified; its own parking/resume scope remains unchanged. |
| `S7.1` | Retains the separate production-provider adoption caveat for release/pilot evidence. |

## Provider caveat separation

Production injection of `trustedBindingProvider` remains a separate adoption gap with an external owner. `S5.13` consumes already-provided `authority + capability`; it does not create, enroll, discover, serialize, transport, or install them and must not claim production Main authority is now wired.

This caveat contaminates the release/pilot evidence of `S7.1`, not the acceptance criteria or dependencies of `S5.13`. Pulling provider adoption into this change would reintroduce the withdrawn enrollment/plugin or host-transport scope and violate Decision 57.

## Workload and delivery boundary

The implementation forecast is **280–390 authored additions plus deletions** across runtime code and focused tests. The hard maximum is **400 authored lines** for the eventual independently verifiable and revertible direct-commit unit.

- If refined design or task forecasting exceeds 400, stop before implementation and replan.
- If implementation reaches 400 and still requires authored changes, stop; do not hide overflow, claim a silent exception, or add a fifth planning level.
- `continuation/integrated-base.mjs` remains unchanged by default to protect both scope and budget.
- Tests stay with the behavior in the same direct-commit unit.

Repository delivery policy is direct commit to `master` followed by push, with no pull request. That policy describes a later authorized delivery step only. This proposal phase performs and authorizes no commit, push, pull request, or delivery.

## Risks and mitigations

| Risk | Product impact | Mitigation |
|---|---|---|
| Authority leaks into request callers or Policy | Untrusted inputs could influence continuation or create a second dispatch owner. | Constructor-bound Main capability, no caller-supplied authority facts, and explicit negative Policy capabilities. |
| Multiple reads or divergent digests | Different targets could be evaluated from different Plan states. | One exact raw-byte read feeding all `S5.6` snapshots and a shared canonical digest. |
| Revision conflation | Stale binding or registry evidence could appear current. | Carry and assert all three revisions independently through the full route. |
| Unsafe or ambiguous project/path resolution | Evidence could cross projects or read an unintended Plan. | Unique trusted registry entry, exact safe roadmap path, and fail-closed rejection before snapshot creation. |
| Policy overreach | Evaluation could silently become acquisition, assignment, or dispatch. | Keep Policy pure and capability-free; assert zero dispatch for every non-admissible outcome. |
| Existing callback payload is insufficient | Integration may require a justified edit to `integrated-base.mjs`, increasing blast radius. | Design must prove insufficiency before that file changes; otherwise preserve it. |
| Provider caveat is misreported as solved | Release evidence could claim production authority that this change does not create or transport. | Keep the caveat explicitly owned by `S7.1` adoption evidence. |
| Scope or workload expansion | The direct-commit unit could exceed reviewability or touch forbidden ownership areas. | Exact path allowlist, 280–390 forecast, and hard stop at 400. |
| Fail-closed outcomes increase stopped continuations | Invalid or partial evidence may stop dispatch more often than permissive behavior. | Treat named rejection as the intended safety outcome; do not degrade to caller facts or alternate parsers. |

## Rollback

The eventual behavior can be rolled back by removing `continuation/main-policy-evidence.mjs` and reverting only the authorized `policy/jornada.mjs`, optional `continuation/integrated-base.mjs`, and focused test changes from the same direct-commit unit.

Rollback requires no DB repair, Plan repair, registry migration, state rewrite, remote compensation, or provider change because this route is read-only until Main dispatch and this change adds no delivery or persistent writer. Rollback must preserve all unrelated continuation, Policy, `S5.6`, Support, registry, and Main-authority behavior.

The parked candidate identity `d2c014754b914aeab253f275bf0ce116b22d25e95ec62041abf1b51eba0cc9e3` and patch `f5f344624257dc7140afb8cecb84dafa715a28985e742c70818fae5aebb73c75`, including their five `escalation/**` and test paths, remain byte-identical and outside this rollback boundary.

## Binary success outcomes

The eventual change succeeds only when every outcome is true:

- [ ] Main proves its capability before any evidence I/O.
- [ ] Exactly one trusted project is resolved; absent, ambiguous, stale, unsafe, or cross-project evidence fails closed.
- [ ] `binding.revision`, `registry_revision`, and `registry_entry_revision` remain separate and non-substitutable.
- [ ] Evidence is read only from the exact safe roadmap Plan path derived from trusted authority.
- [ ] One raw-byte read feeds every target snapshot, and every snapshot retains the same canonical digest.
- [ ] `S5.6` is the sole parser and canonical validator for the Plan evidence.
- [ ] No caller supplies project, root, path, bytes, digest, parser, provider callback, or authority facts.
- [ ] Policy binds expected blocked/candidate session IDs and rejects stale, foreign, malformed, or ambiguous canonical evidence.
- [ ] Policy acquires no evidence, assigns no work, and performs no dispatch.
- [ ] The sequence is exactly `reconcile → Support → Policy → Main dispatch`.
- [ ] `DENY`, `STOP`, or no eligible candidate produces zero dispatch.
- [ ] Byte and state witnesses show acquisition and evaluation are read-only on success and rejection.
- [ ] The diff touches only the exact writable area and totals no more than 400 authored additions plus deletions.
- [ ] `continuation/integrated-base.mjs` changes only if design proves its current callback payload insufficient.
- [ ] Production `trustedBindingProvider` injection remains explicitly unresolved by this change and assigned to `S7.1` adoption evidence.
- [ ] No withdrawn enrollment/plugin or host-transport mechanism is reintroduced.
- [ ] The parked candidate and patch identities remain byte-identical.

## Handoff

The proposal is ready for specification. The spec must translate these authority, evidence, sequencing, fail-closed, scope, workload, caveat, and rollback boundaries into RFC 2119 requirements and Given/When/Then scenarios. It must not create design, tasks, RED tests, implementation, commits, pushes, pull requests, or delivery during that phase.
