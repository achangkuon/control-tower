# Control Tower Recovery and Rollback — Revision 11

## Requirements

### Requirement: CT-R7 Token-free, fresh, evidence-bound recovery and rollback dispositions

Main recovery MUST be manual, token-free, expected-generation-fenced, and bound to exact claimant identity. Receipts MUST be fresh (≤30 seconds), allowlisted server-side lifecycle/OS proofs binding issuer, verifier, method, observation, OS boot/session, exact host/plugin/root/MCP PID+start tuple, binding epoch, generation, and both-terminated result. `NOT_STARTED` on CLAIMED and `ROLLED_BACK` on STARTED MAY republish only with valid proof. `CANCELLED` and `POISONED` fence/clear claims, close delivery, record immutable disposition, keep generation unchanged, and create no PENDING delivery. Recovery MUST NOT complete a handoff and MUST NOT call the claimant-only `complete`.

P6 owns `CT-R11-S4/S5` and versioned termination/quiescence persistence bound to P3 Main identity; request-supplied proof alone MUST NOT suffice.

#### Scenario: CT-R7-S1 Insufficient proof
- GIVEN a crashed CLAIMED/STARTED claimant with bare, stale, unavailable, or absent proof
- WHEN recovery is requested
- THEN it returns `CT_RECOVERY_REQUIRED`, preserves state/generation, and does not republish

#### Scenario: CT-R7-S2 Valid disposition
- GIVEN matching expected generation and fresh paired allowlisted receipts proving both claimant processes terminated
- WHEN Main recovers with a permitted disposition
- THEN the disposition is recorded atomically, with republish fenced to a new generation where permitted

#### Scenario: CT-R7-S3 Absent rollback proof
- GIVEN STARTED work labeled ROLLED_BACK whose proof omits handoff/generation or the pre-start boundary
- WHEN republish is requested
- THEN republish is refused and the row stays blocked/STARTED or becomes UNKNOWN/POISONED

#### Scenario: CT-R7-S4 Stale or invalid recovery
- GIVEN stale generation, wrong claimant identity, invalid receipt pairing, consumed attestation, or a live process
- WHEN recovery runs
- THEN it returns `CT_FENCE_MISMATCH`, `CT_INVALID_TRANSITION`, or `CT_RECOVERY_REQUIRED` without mutation

#### Scenario: CT-R7-S5 Freshness verification
- GIVEN a receipt whose issuer, verifier, method, time, PID/start marker, epoch, or generation differs from the claim
- WHEN Main verifies it, including a reused PID or a receipt older than 30 seconds
- THEN proof is rejected as stale, ambiguous, or mismatched and no disposition occurs

#### Scenario: CT-R7-S6 Compensated republish
- GIVEN exact termination proof and complete compensation/read-back proof for STARTED work
- WHEN Main applies `ROLLED_BACK`
- THEN one transaction records evidence, fences the old claim, increments generation, and moves STARTED→ROLLED_BACK→PUBLISHED with one fresh PENDING WORK

#### Scenario: CT-R7-S7 Pending work suspended
- GIVEN ROLLING_BACK, a frozen PUBLISHED handoff with PENDING WORK, and no claim or claimant
- WHEN rollback-owner Main at the matching epoch applies `SUSPEND_PENDING`
- THEN delivery closes, disposition is immutable, state becomes non-live WORK_SUSPENDED, generation is unchanged, and no delivery is created

#### Scenario: CT-R7-S8 Malformed claim-present history rejected structurally
- GIVEN persisted history claims a PUBLISHED handoff has a PENDING WORK delivery while a claim for that same delivery also exists
- WHEN any public recovery path, including `SUSPEND_PENDING`, reads that history
- THEN it returns `CT_SCHEMA_INVALID` without mutation before recovery semantics, request fences, or proof evaluation
- AND valid history cannot reach this precondition because atomic `claim` changes the handoff and delivery from PUBLISHED/PENDING to CLAIMED while creating the claim

#### Scenario: CT-R7-S9 ON-only work redelivery
- GIVEN WORK_SUSPENDED is non-live and a later explicit activation set mode ON
- WHEN Main applies `REDELIVER_WORK`
- THEN one transaction records disposition, increments generation, moves to PUBLISHED, and creates one fresh PENDING WORK delivery

#### Scenario: CT-R7-S10 Attestation suspension and redelivery
- GIVEN COMPLETION_ATTESTED has an unused attestation and rollback begins
- WHEN rollback-owner Main applies `SUSPEND_ATTESTATION` and later ON Main applies `REDELIVER_ATTESTATION`
- THEN it becomes non-live ATTESTATION_SUSPENDED with the attestation preserved and no delivery; then generation increments and one fresh PENDING ATTESTATION_REDELIVERY is created

#### Scenario: CT-R7-S11 Redelivery claimant cannot ack
- GIVEN a fresh claimant has claimed ATTESTATION_REDELIVERY
- WHEN it attempts `ack` or execution
- THEN it is rejected `CT_INVALID_TRANSITION`; only attestation-bound `complete` is allowed, while WORK redelivery keeps ack/execute

#### Scenario: CT-R7-S12 Atomic dispositions
- GIVEN ON `NOT_STARTED` or compensated `ROLLED_BACK`, or a live row requiring `CANCELLED`/`POISONED`
- WHEN Main recovers
- THEN republish closes the old delivery/claim, increments generation, and creates fresh PENDING WORK; CANCELLED/POISONED instead fences atomically, keeps generation, creates no PENDING, and preserves audit evidence
