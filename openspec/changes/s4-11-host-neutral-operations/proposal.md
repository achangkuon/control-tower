# Host-neutral observable runtime operations

**Proposal status:** PASS — maintainer Decision 92 resolves the previously parked visible-product-contract, public-API, and security-and-permissions decision. Specification may proceed within the unchanged S4.11 scope.

## Intent

Give Control Tower one host-neutral operational boundary for observing, checking, stopping, and attaching to the exact current runtime binding delivered by S4.10. The boundary must let future host adapters interoperate without making Pi, OpenCode, Intercom, a broker, or an adapter wire format part of the product contract.

The business outcome is predictable runtime control: operators and later recovery workflows can tell verified evidence from self-report, can distinguish a disconnected runtime from one proven dead, and cannot attach to or act on a stale or foreign incarnation.

This proposal covers the already-approved whole Sesión S4.11 only. It preserves M4.11.1 and T4.11.1.1–T4.11.1.3 and creates no additional work hierarchy.

## Current-state gap

S4.10 delivers strict host-neutral identity, worktree, process, binding, incarnation, and loopback-port ownership. It deliberately excludes observe, health, stop, and attach. Without S4.11, consumers have no neutral way to:

- obtain producer-owned operational evidence for an exact current binding;
- classify disconnection without treating it as proof of death;
- distinguish a stop-request acknowledgment from a producer-proven stop or death; or
- authorize attach with fresh matching proof and return evidence tied to the same binding and incarnation.

Implementing these rules independently in host adapters would recreate vendor coupling and allow inconsistent lifecycle and authorization semantics.

## Approved operational policy

Maintainer Decision 92 establishes the complete product policy for S4.11:

- The producer issues a one-use challenge bound to the exact operation, current binding, and current incarnation.
- Only matching proof from that same producer is accepted.
- `observe` reports available evidence without promoting uncertainty into a proven fact.
- `health` distinguishes `proven healthy`, `disconnected/unknown`, and `proven dead`.
- `stop` separates acknowledgment of the request from producer-proven stop or death and never upgrades disconnection into death.
- `attach` requires matching fresh proof and returns an acknowledgment bound to the same binding and incarnation.

This is a maintainer-resolved policy, not an agent-derived interpretation. It resolves the question parked by the first proposal gatekeeper against proposal SHA-256 `7443ee09ef6e9e622a9a4d19bfc6c9a7bc18ebf0442fc509890cb21a404c4b6b` and state SHA-256 `5db0241b1ab48869d2fbbf9efe97549c167f8d36638d731c7ec9f8043e11b2c6` (Engram observations 9663 and 9664).

## Falsifiable consequences

The approved policy is violated if any of the following can occur:

1. A challenge is accepted more than once or for a different operation, binding, or incarnation.
2. Proof from a different producer, or proof missing an exact challenge match, gains authority.
3. `observe` converts missing, partial, disconnected, or uncertain evidence into a proven runtime state.
4. `health` reports proven healthy or proven dead without matching producer proof, or reports disconnection as death.
5. A stop-request acknowledgment is reported as producer-proven stop or death.
6. Stop disconnection, timeout, silence, or missing response is upgraded to proven death.
7. `attach` accepts stale, replayed, foreign, crossed, or otherwise mismatched proof.
8. A successful attach acknowledgment is not bound to the exact current binding and incarnation.

These consequences constrain the specification's inputs, outputs, errors, and scenarios without authorizing host-specific semantics or broader scope.

## Authority assessment

| Required decision | Approved authority | Gate result |
| --- | --- | --- |
| Producer trust boundary and proof ownership | Decision 92 requires the challenge producer and accepted proof producer to be the same producer. | Closed. Caller self-report, caller-selected producers, and foreign proof cannot gain authority. |
| Challenge freshness and scope | Decision 92 makes each challenge one-use and binds it to the exact operation, current binding, and current incarnation. | Closed. Reuse or any scope mismatch fails closed. |
| Observe and health result semantics | Decision 92 prevents `observe` from promoting uncertainty and gives `health` the three-way distinction `proven healthy`, `disconnected/unknown`, and `proven dead`. | Closed. Disconnect remains uncertainty unless matching producer proof establishes a proven state. |
| Stop acknowledgment versus runtime state | Decision 92 separates request acknowledgment from producer-proven stop or death and forbids upgrading disconnect. | Closed. Delivery or acknowledgment is not lifecycle proof. |
| Attach authorization and result | Decision 92 requires matching fresh proof and an acknowledgment bound to the same binding and incarnation. | Closed. Stale, replayed, crossed, foreign, or mismatched proof cannot authorize attach. |

**Conclusion:** Decision 92 closes every authority gap recorded by the prior proposal. No new always-escalate decision is needed at proposal level. Specification may define the neutral API representation only as a faithful encoding of this approved policy, S4.10 invariants, the exclusive Área, and the hard exclusions below; it may not alter those product semantics.

## Scope

Implementation is confined to the exclusive S4.11 Área:

- `hosts/runtime-port.mjs`
- `hosts/runtime-observe.mjs`
- `test/hosts/runtime-port.test.mjs`
- `test/hosts/runtime-observe.test.mjs`

Within that boundary, S4.11 includes:

- neutral operation ports for observe, health, stop, and attach;
- exact validation against the current S4.10 binding and incarnation;
- producer-issued, one-use challenges bound to operation, binding, and incarnation;
- matching producer-proof validation;
- the approved observe, health, stop, and attach result distinctions;
- fail-closed handling of stale receipts, replay, self-report, disconnect, ambiguous stop, crossed identity, foreign incarnation, and proof mismatch; and
- focused contract tests for the approved behavior.

No database, migration, installation, packaging, broker, adapter, or runtime-payload work is included.

## Out of scope and non-goals

S4.11 does not:

- implement or modify any Pi or OpenCode adapter;
- import Pi or OpenCode code, contracts, payloads, or adapter semantics;
- use Pi, OpenCode, Intercom, pane, session, broker, supervisor, or adapter-specific vocabulary in product code;
- touch `adapters/pi/**`, `workspace/pi-*/**`, broker or installation paths;
- implement Pi recovery, successor creation, quiescence, or any S4.12 behavior;
- revive or reinterpret S4.4, S4.8, S4.9, or S8.12;
- alter the five public S4.10 v1 shapes, their schemas, identifier grammar, reservation lifecycle, or ownership registry;
- add caller-authored proof, caller-selected proof producers, reusable challenges, or self-reported authority;
- infer proven health, stop, or death from disconnect, timeout, process silence, transport delivery, or request acknowledgment alone; or
- modify any path outside the approved Área.

## Affected areas

| Area | Intended impact |
| --- | --- |
| Runtime operation ports | Expose one neutral boundary for observe, health, stop, and attach. |
| Runtime observation semantics | Separate producer evidence, reachability uncertainty, and proven lifecycle state. |
| Binding and incarnation enforcement | Carry S4.10 exactness and stale/replay rejection into every operation. |
| Challenge and proof validation | Enforce one-use, operation-bound, producer-matching proof for the exact current binding and incarnation. |
| Attach authorization | Require matching fresh proof and return a same-binding/incarnation acknowledgment. |
| Host adapters and recovery | Become future consumers only; they remain unchanged in S4.11. |
| Tests | Prove stale receipt, self-report, disconnect, ambiguous stop, crossed context, challenge replay, proof mismatch, and attach rejection behavior. |

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Public results blur proven state and uncertainty. | Encode Decision 92's explicit observe, health, and stop distinctions and test every forbidden promotion. |
| Disconnect is treated as death, causing unsafe recovery or replacement. | Permit proven death only from matching producer proof; timeout, silence, and disconnection remain unknown. |
| A proof is replayed across operations or incarnations. | Consume a producer-issued challenge once and validate its exact operation, binding, incarnation, and producer. |
| Request acknowledgment becomes runtime-state proof. | Model and test acknowledgment separately from producer-proven stop or death. |
| Caller self-report becomes authority. | Reject caller-authored claims and caller-selected producers as substitutes for matching producer proof. |
| Attach succeeds against a stale or foreign runtime. | Require matching fresh proof and bind the acknowledgment to the exact current binding and incarnation. |
| Neutral code leaks host-specific vocabulary or dependencies. | Restrict imports, names, tests, and implementation to the neutral Área and hard exclusions. |
| S4.11 changes S4.10 public shapes to fit operations. | Treat S4.10 as immutable input; any shape change requires separate maintainer authority. |
| Work expands into adapters, broker, installation, recovery, or S8.12. | Enforce the exclusive Área and explicit non-goals. |

## Rollback

The proposal itself changes no runtime behavior. If a later S4.11 implementation is rolled back, revert the two runtime operation modules and their two tests together so no partial operation contract remains.

Rollback must preserve S4.10 identity, binding, incarnation, and loopback-port ownership unchanged. It requires no database or data migration. It must not replace the neutral boundary with adapter-specific behavior or weaken one-use challenge, proof-origin, stale/replay, acknowledgment-versus-state, or disconnect-versus-death protections.

## Success criteria

S4.11 succeeds only when all of the following are true:

1. Observe, health, stop, and attach use one host-neutral operation boundary and contain no Pi, OpenCode, Intercom, broker, supervisor, session, pane, or adapter-specific product semantics.
2. Every operation validates the exact current S4.10 runtime, worktree, process, binding, and incarnation context before accepting evidence or returning success.
3. The producer issues a one-use challenge bound to the exact operation, current binding, and current incarnation; reuse and any operation, binding, incarnation, or producer mismatch fail closed.
4. Only matching proof from that producer can establish a proven result; caller self-report and transport delivery cannot substitute for it.
5. `observe` reports evidence without promoting missing, partial, disconnected, or uncertain evidence into proven state.
6. `health` returns only the approved distinctions: `proven healthy`, `disconnected/unknown`, or `proven dead`; disconnect, timeout, silence, and missing response never independently prove death.
7. `stop` distinguishes request acknowledgment from producer-proven stop or death and never upgrades disconnect, timeout, silence, or missing response.
8. `attach` requires matching fresh proof and returns an acknowledgment bound to the same exact current binding and incarnation.
9. Focused tests cover stale receipt, self-report without proof, disconnect, ambiguous stop, challenge reuse, operation mismatch, producer mismatch, binding mismatch, incarnation mismatch, and attach rejection.
10. `bun test` returns zero failures from the stated 914-pass baseline or a later verified baseline.
11. The implementation diff touches only the four approved Área paths, adds no database work, and keeps every commit at or below 400 authored lines.

## Proposal question round resolution

The prior gatekeeper parked one exact question covering producer proof, freshness, runtime state, stop, and attach. The maintainer explicitly approved the recommended conservative policy, and canonical Decision 92 plus the S4.11 authority line now record that resolution.

No proposal question remains open. The resolution lifts only the recorded S4.11/M4.11.1 checkpoint; it does not authorize adapter work, recovery, broker or installation changes, S8.12, S4.12, or any path outside the exclusive Área.

**Next phase:** specification.
