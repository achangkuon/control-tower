# Design: S5.5 Parking and Resume Loop

## Design status and inputs

This is the first content artifact for the approved `design-tasks` bridge. No proposal or change-local spec is required or created.

- Canonical Session: `S5.5`, zone `asientos`, result “Parking y retoma del loop”.
- Plan authority: `openspec/plan.yaml`, Session S5.5, Modules `M5.5.1`–`M5.5.4`, route `design-tasks`.
- Revalidated base: branch `work/s5-5-zone-pilot`, clean HEAD `59d7f39c2a8d7ad4f621a9a7a5da9ba1d7574604`.
- Apply mode: automatic phase flow, Strict TDD with `bun test`, direct-push delivery, `ask-on-risk`, and a 400 authored-line budget.
- Planned production paths: `escalation/parked.mjs` and `escalation/resume.mjs` only.
- Planned test paths: `test/escalation/parked.test.mjs`, `test/escalation/independent.test.mjs`, and `test/escalation/resume.test.mjs` only.

If implementation needs any other path, especially a read API in Main store or a change to request, routing, parking composition, contracts, schemas, or continuation, Apply is blocked rather than expanded.

## Architectural decision

S5.5 is a Main-owned coordinator over capabilities that already own validation, persistence, authority, checkpoint provenance, reconciliation, request emission, and dispatch. It does not recreate any of them.

Two small ESM controllers are introduced:

1. `parked.mjs` coordinates complete parking, existing S5.4 request emission, read-only Support boundary verification, and Main-triggered independent continuation through an opaque capability.
2. `resume.mjs` gates the exact parked checkpoint behind an already Main-validated terminal-response capability and fresh reconciliation, then invokes an injected exact-resume capability.

The controllers are constructor-bound. Per-call inputs cannot inject stores, writers, dispatchers, clocks, validators, authority, or resume functions. Returned controller objects and coordinator-owned outcome envelopes are frozen.

## Ownership boundaries

| Concern | Owner used by S5.5 | S5.5 behavior |
| --- | --- | --- |
| Parked-decision shape, digest, options, evidence, origin, checkpoint, and class | `parked-decision-v1` through existing Main parking ingress | Pass unchanged; never define or validate a local contract. |
| Checkpoint capture and reconciliation provenance | `createParkingComposition` and its producer capabilities | Call its closed `park` operation once; never accept producer artifacts directly. |
| Parking persistence and replay | `main-store/store.mjs::parkDecision` | Consume its result; never write a parking file or ledger. |
| Decision request persistence/emission | S5.4 `emitDecisionRequest` through a constructor-bound adapter | Invoke after successful parking; never create a request writer or transport. |
| Support proposal schema/persistence | Existing Support producer and `persistSupportProposal` | Read only a trusted boundary projection through an injected read-only port. No Main-store read method is added. |
| Eligibility content in `primary`, `alternatives`, and `conflicts` | Support-bound continuation capability | Never read, compare, branch on, clone, log, return, or copy those values. |
| Main authority and terminal response consumption | Existing Main composition and `consumeAuthorization` | Accept only an already validated terminal capability; never call authority creation/validation/consumption code. |
| Exact parked checkpoint binding | `readParkedCheckpointBinding` | Read the authoritative binding and copy its exact execution coordinates only after all gates pass. |
| Resume currentness | Injected read-only reconciliation capability | Require a fresh `CURRENT` result matching every parked coordinate. |
| Resume effect | Constructor-bound Main resume capability | Invoke once with exact bound checkpoint/worktree coordinates; no Worker route exists. |
| Completed independent-work provenance | S5.10 Main-store binding | An opaque continuation may report only an existing binding reference; S5.5 does not infer or seal one. |

`escalation/parking-composition.mjs`, `escalation/request.mjs`, and `escalation/routing.mjs` remain read-only dependencies. `readAuthorization` is not sufficient for resume because it returns a record, not proof that the terminal response passed the Main-owned response transition. Raw `readAuthorization` output is therefore explicitly excluded from the resume API.

## Bounded ESM API

### `escalation/parked.mjs`

```js
export const createParkedLoop = ({
  parking,        // frozen Main composition exposing park(input)
  decisionRequests, // adapter exposing emit(existingS54Input)
  proposals,      // read-only port exposing read(proposalRef)
  now = Date.now,
} = {}) => Object.freeze({
  park({ parking_input, decision_request }),
  continueIndependent({ proposal_ref, expected, selection }),
})
```

Constructor validation requires exactly callable `parking.park`, `decisionRequests.emit`, `proposals.read`, and `now`. Missing or malformed ports fail with `CT_PARKED_LOOP_PORT_INVALID` before any effect.

`park` accepts only:

```js
{
  parking_input: {
    parked_decision,
    checkpoint_request,
    reconciliation_evidence,
  },
  decision_request, // opaque existing S5.4 emitter input
}
```

It calls `parking.park(parking_input)` first. Only a complete canonical decision can pass the existing Main-store ingress, so missing options, evidence, checkpoint, consequence, origin, or class fails before parking visibility and before request emission. On success it calls `decisionRequests.emit(decision_request)` without reshaping or persisting it. The result is `{ state: "PARKED", parking, request }`.

Parking first is deliberate. If parking fails, no S5.4 request is emitted. If request emission fails after parking, the complete immutable parking remains recoverable and exact parking replay is idempotent; S5.5 does not roll back or replace authoritative bytes. Routing remains a separate S5.4 concern.

The proposal port returns one atomically bound view:

```js
{
  boundary: {
    caller_role,
    plan_enumeration_digest,
    ledger_digest,
    worker_claim,
    expires_at,
    state,
  },
  continuation: {
    continueDefault(),
    continueAlternativeAt(index),
  },
}
```

The view intentionally omits `primary`, `alternatives`, `conflicts`, and all work payload. The continuation methods are opaque capabilities bound by the trusted proposal adapter to that exact proposal and to a Main-owned dispatcher. They perform membership resolution internally and reject an absent alternative with `CT_SUPPORT_WORK_NOT_NAMED`. They return only a dispatch outcome and, after completion, an opaque S5.10 binding reference; they never return proposal content to S5.5.

`continueIndependent` verifies exactly the five approved fields plus state:

1. `caller_role === "MAIN"`;
2. exact `plan_enumeration_digest` equality;
3. exact `ledger_digest` equality;
4. exact `worker_claim` equality;
5. `Date.parse(expires_at)` must be finite and its epoch milliseconds must be greater than `now()`; `expires_at` is the canonical ISO timestamp string;
6. state handling described below.

`expected` contains only the three expected digest/claim values. `proposal_ref` is an opaque read key. `selection` is coordinator control data, either `{ kind: "DEFAULT" }` or `{ kind: "ALTERNATIVE", index }` with a non-negative integer. Branching on this control value does not inspect Support content.

For `EXECUTABLE`, the controller invokes exactly one opaque continuation method. For `NO_SCOPE`, it returns frozen `{ state: "PARKED", reason: "NO_SCOPE" }` and invokes neither continuation method. `STALE`, `CLAIM_MISMATCH`, unknown states, mismatches, expiry, malformed views, and missing capabilities fail closed before continuation. There is no method that accepts a work payload, assignment, Worker actor, candidate, module ID, or task ID, so a Worker cannot self-assign through this API.

### `escalation/resume.mjs`

```js
export const createResumeLoop = ({
  parkedBindings, // exposes readParkedCheckpointBinding(id)
  terminalResponses, // trusted Main port exposing assertFor(...)
  reconcile,      // read-only fresh-currentness capability
  resumeCheckpoint, // Main-owned exact resume effect
} = {}) => Object.freeze({
  resume({ parked_decision_id }),
})
```

`terminalResponses` is the trusted Main constructor port produced only after Main has terminally consumed and validated `parked-decision-response-v1`. It exposes:

```js
terminalResponses.assertFor({ parked_decision_id, parked_decision_digest })
```

A successful call returns an opaque response receipt. The port owner—not S5.5—proves terminal state, canonical response binding, authoritative origin, authorization revision, and that expiry had not elapsed at terminal consumption. `resume` accepts exactly `{ parked_decision_id }`; it rejects extra raw response, capability, or authority fields before reading any port. S5.5 exports no capability constructor and accepts no raw response, boolean validation assertion, actor, authorization fields, or option fields.

Resume flow:

1. Reject any resume input other than exact `{ parked_decision_id }` before any port call, then read the authoritative binding with `readParkedCheckpointBinding(parked_decision_id)`.
2. Call constructor-bound `terminalResponses.assertFor` with the binding's exact parked decision ID and digest.
3. Call `reconcile` with the exact binding and opaque response receipt.
4. Require `status === "CURRENT"` and exact equality for `repository`, `project_id`, `assignment_id`, `generation`, `base_sha`, and `result_sha` against the persisted binding.
5. Invoke `resumeCheckpoint` once with the exact `parked_checkpoint`, repository/worktree, project, assignment, generation, base/result SHAs, and opaque response receipt.

Any `STALE`, divergent, malformed, absent, or ambiguous reconciliation returns the stable blocked outcome `{ state: "RECONCILIATION_REQUIRED", code: "CT_RESUME_RECONCILIATION_REQUIRED" }`; it never calls `resumeCheckpoint`. Reconciliation may later be rerun explicitly, but S5.5 never rebases, discards, rescues, substitutes a worktree, or resumes automatically from stale evidence.

The exact `repository` in `parked-checkpoint-binding-v1` is the captured assigned worktree root. The exact `assignment_id` and `generation` prevent a same-path replacement from being treated as the parked assignment.

## Data flow

### Parking and request

```text
Main caller
  -> parkedLoop.park(closed inputs)
  -> existing createParkingComposition.park
  -> canonical capture -> canonical reconciliation -> Main parkDecision
  -> one immutable parking envelope + parked checkpoint binding
  -> existing S5.4 decision request emitter
  -> frozen PARKED outcome
```

No request transport behavior is duplicated. A remote failure continues to leave the existing request pending under S5.4 rules.

### Independent continuation

```text
Main caller
  -> proposals.read(opaque ref)
  -> verify five boundary fields + state only
  -> NO_SCOPE: report PARKED, zero dispatch
  -> EXECUTABLE: invoke opaque default/alternative capability
  -> capability dispatches only Support-named work as Main
  -> optional opaque S5.10 binding reference, never inferred locally
```

### Resume

```text
Main caller
  -> authoritative parked binding readback
  -> constructor-bound trusted Main terminal-response port binds exact decision id/digest
  -> fresh reconciliation of exact worktree/assignment/generation/base/result
  -> CURRENT and byte-exact: Main resume capability(exact checkpoint)
  -> otherwise: RECONCILIATION_REQUIRED, zero resume
```

## Failure codes and no-mutation guarantees

| Code/outcome | Cause | Guaranteed effects |
| --- | --- | --- |
| `CT_PARKED_LOOP_PORT_INVALID` | Missing/malformed constructor port | No capability called. |
| Existing parking/contract code | Incomplete or invalid parked decision/provenance | No parking and no request emission. |
| Existing S5.4 request code | Invalid request or request-store failure after parking | Complete parking remains; no S5.5 rollback or second write. |
| `CT_SUPPORT_PROPOSAL_INVALID` | Malformed boundary/capability view or unknown state | No continuation. |
| `CT_SUPPORT_PROPOSAL_ROLE_MISMATCH` | Caller role is not Main | No continuation. |
| `CT_SUPPORT_PROPOSAL_PLAN_MISMATCH` | Plan digest mismatch | No continuation. |
| `CT_SUPPORT_PROPOSAL_LEDGER_MISMATCH` | Ledger digest mismatch | No continuation. |
| `CT_SUPPORT_PROPOSAL_CLAIM_MISMATCH` | Worker claim mismatch or mismatch state | No continuation. |
| `CT_SUPPORT_PROPOSAL_EXPIRED` | Non-finite or elapsed expiry | No continuation. |
| `CT_SUPPORT_PROPOSAL_STALE` | Support state is `STALE` | No continuation. |
| `CT_SUPPORT_WORK_NOT_NAMED` | Opaque capability cannot resolve requested alternative | No dispatch. |
| `NO_SCOPE` parked outcome | Support state is `NO_SCOPE` | No invented work, candidate, assignment, or dispatch. |
| `CT_RESUME_PORT_INVALID` | Missing binding/reconciliation/resume port | No read or resume. |
| `CT_RESUME_RESPONSE_INVALID` | Terminal capability absent or rejects validation/binding | No reconciliation or resume. |
| `CT_RESUME_RECONCILIATION_REQUIRED` | Currentness absent, stale, ambiguous, or coordinate mismatch | No resume and no parked-record mutation. |

Proposal verification and every rejected resume path are read-only. Focused tests snapshot the parking record, authorization record, store DB/WAL/SHM witnesses, routing state, and any supplied test ledger before and after success/rejection. Resume success may invoke only the injected resume effect; neither controller edits authoritative records.

## Strict TDD seams mapped to the canonical Modules

### M5.5.1 — Parked decision record

- **T5.5.1.1 RED:** prove one complete parked decision reaches the existing composition unchanged and returns one immutable parking outcome.
- **T5.5.1.2 RED:** omit options, option consequence, evidence, checkpoint, origin, or class; assert stable existing rejection, zero parking visibility, and zero request calls.
- **T5.5.1.3 GREEN:** implement only the coordinator over `createParkingComposition` and the existing S5.4 emitter; prove no local writer, validator, schema, authority, or producer.
- **T5.5.1.4 REFACTOR:** normalize only S5.5-owned port errors while preserving dependency error codes; run `bun test test/escalation`.

### M5.5.2 — Support proposal verification

- **T5.5.2.1 RED:** independently drift role, plan digest, ledger digest, worker claim, expiry, and state; each rejects before either continuation method.
- **T5.5.2.2 GREEN:** implement only the six-field boundary check and injected clock. Add source/getter traps proving production never accesses nested proposal content.
- **T5.5.2.3 REFACTOR:** byte witnesses prove proposal/store verification is read-only in success and every rejection.

### M5.5.3 — Continuation of proposed work

- **T5.5.3.1 RED:** default and valid alternative selectors call exactly one opaque capability; a capability rejection for an unnamed alternative produces zero dispatch.
- **T5.5.3.2 RED:** `NO_SCOPE` returns PARKED and never derives, dispatches, relaxes criteria, or accesses continuation.
- **T5.5.3.3 GREEN:** Main invokes the constructor-bound capability; public input has no work payload or Worker assignment route. Any completion provenance is an opaque S5.10 binding reference.

### M5.5.4 — Exact checkpoint resume

- **T5.5.4.1 RED:** only a Main-validated terminal capability can reach resume, and success passes the exact persisted checkpoint and assigned worktree coordinates.
- **T5.5.4.2 RED:** stale base, changed assignment/generation, changed repository, or changed base/result returns reconciliation-required with zero resume.
- **T5.5.4.3 RED:** absent/unvalidated/expired-at-consumption/wrong-origin/wrong-decision capability leaves all byte witnesses unchanged and invokes neither reconciliation nor resume as applicable.
- **T5.5.4.4 GREEN:** implement the fixed read -> terminal binding -> reconcile -> exact resume sequence without authority or contract logic.

Focused verification after each GREEN/refactor:

```bash
bun test test/escalation/parked.test.mjs
bun test test/escalation/independent.test.mjs
bun test test/escalation/resume.test.mjs
bun test test/escalation
bun test
rg 'Depende de|Área|Recurso' escalation/
```

The final `rg` must return zero. Tests must assert exact calls, codes, frozen outcomes, byte identity, and zero effects rather than only truthy results.

## File-by-file implementation plan

| Path | Planned change |
| --- | --- |
| `escalation/parked.mjs` | Add constructor-bound parking/request coordination, six-field Support boundary verification, `NO_SCOPE`, and opaque Main continuation selection. |
| `escalation/resume.mjs` | Add terminal-capability gate, authoritative binding read, exact reconciliation comparison, and exact resume invocation. |
| `test/escalation/parked.test.mjs` | Cover complete/incomplete parking, request ordering/failure, immutable outcomes, dependency reuse, and no partial write. |
| `test/escalation/independent.test.mjs` | Cover every Support boundary mismatch/state, forbidden-content getter traps, default/alternative capability calls, `NO_SCOPE`, byte witnesses, and no Worker assignment input. |
| `test/escalation/resume.test.mjs` | Cover terminal capability failures, exact checkpoint/worktree resume, stale/divergent reconciliation, and byte-identical negative paths. |

No other file changes are designed.

## Rollout and rollback

There is no migration, backfill, schema registration, store API, sidecar, cleanup writer, or remote effect in this Session.

Rollout is additive: existing S5.4 request/routing and existing parking continue unchanged; Main may compose the new controllers only when it can provide all trusted constructor ports. Missing ports fail closed.

Rollback is one behavior revert limited to the two new production modules and their three focused tests. Existing parking, authorizations, responses, Support proposals, checkpoint bindings, and completed-work bindings are retained byte-for-byte. Never delete or rewrite durable records during rollback.

## Review workload forecast

Estimated authored additions plus deletions for Apply: **335–390 lines**.

- `escalation/parked.mjs`: 65–80.
- `escalation/resume.mjs`: 50–65.
- `test/escalation/parked.test.mjs`: 65–75.
- `test/escalation/independent.test.mjs`: 75–85.
- `test/escalation/resume.test.mjs`: 80–85.

The intended total is below the 400-line budget, but risk is **high** because the upper bound is close. **Forecast over 400: NO at design time.** Tasks must recalculate the arithmetic and preserve tests with their behavior. If the honest forecast or actual authored delta exceeds 400, `ask-on-risk` requires a pause before Apply to choose sequential cohesive direct-commit work units; no chain strategy or `size:exception` may be inferred.

Natural work-unit boundaries, if the gate is reached, are (1) parking plus proposal continuation and their focused tests, then (2) exact resume plus its focused tests. Each unit must pass its focused tests and leave the repository coherent and revertible.

## Risks and stop conditions

1. **No Support read API exists.** The only authorized bridge is a trusted constructor-injected read-only proposal port. Needing `readSupportProposal` blocks Apply; Main store must not be edited.
2. **Opaque capability provenance is composition-owned.** A raw proposal object, raw work payload, or duck-typed Worker dispatcher is not an acceptable substitute for the bound continuation view.
3. **A raw terminal authorization is insufficient.** Resume must receive a capability backed by Main's validated terminal transition or exact replay. Revalidating or consuming authority in S5.5 is forbidden.
4. **Expiry is checked at terminal consumption.** S5.5 rejects a capability reporting expiry before consumption; it does not invalidate a legitimately durable terminal response merely because wall time later advanced.
5. **Reconciliation cannot be advisory.** Unknown, stale, malformed, or coordinate-different results all block automatic resume; none may fall through to the effect.
6. **Parking and request are separate existing records.** Request failure after complete parking is recoverable through exact replay; inventing a cross-store transaction or rollback is outside scope.
7. **S5.10 provenance remains authoritative.** S5.5 may transport an opaque completed-work binding reference but cannot infer, construct, or persist attribution.
8. **Scope is fail-closed.** Any need to change `parking-composition.mjs`, `request.mjs`, `routing.mjs`, Main store, continuation, contracts, schemas, delivery, `core.mjs`, or `mcp.mjs` yields `BLOCKED`, not a design expansion.
