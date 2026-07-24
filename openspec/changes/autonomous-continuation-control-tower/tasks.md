# Tasks: Autonomous Continuation — Control Tower

## Review Workload Forecast

Estimated authored change: 2,600–3,600 lines across 15–20 files. Use one functional work unit per chained PR, target ≤400 authored changed lines per PR, and keep the session review ceiling at 800 lines.

Decision needed before apply: No — maintainer resolved automatic chaining on 2026-07-22
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High
Judgment Day: required after each functional unit P1–P10; P0 is evidence-only and excluded

### Work Units

| Unit | Deliverable | Focused verification | Rollback boundary |
|---|---|---|---|
| 0 | Frozen baseline | `bun test test/migration.test.mjs` | P0 tests/evidence only |
| 1 | Anchor + Migration 001 | migration + fail-closed | Slice 1 core/CLI/install only |
| 1-FC | Prerequisite fresh-install forward compatibility | migration + fail-closed + scoped Slice 1 re-judgment | Two Migration 001 predicates/validator/tests/evidence only; no DB rewrite |
| 2 | Identity + mode | migration + identity + fail-closed | Migration 002 + Slice 2 core/internal dispatcher only; no public continuation MCP tools |
| 3 | Migration 003 + Main binding + explicit activation/status | migration + identity + fail-closed | Slice 3 core/MCP only; schema-3 data remains inert on code rollback |
| 4-A1a | Pin Migration 004 constants/manifest without schema enablement | migration constants + manifest definitions | P4-A1a core/test constants only; 480–620, starts at P3 HEAD, independently ≤800 |
| 4-A1b | Fresh 3→4 migration + empty replay + P3 compatibility | migration + P3 compatibility + fail-closed | P4-A1b core/MCP/tests only; 560–760, depends on A1a, independently ≤800 |
| 4-A1c baseline | Preserved evolved schema-4 validator + total retry snapshot | historical 78 pass/549 assertions only; unapproved | Preserve current P4-A1c core/tests at 588 implementation/test lines; depends on A1b; no completion claim |
| 4-A1c-R1 | Exact reverse commitments + immutable historical CAS/fences | reverse-link/envelope differential + fail-closed | P4-A1c-R1 core/tests only; preserved 360–520 incremental forecast, depends on preserved A1c baseline, independently ≤800 |
| 4-A2 | Canonical immutable payload/provenance + create | lifecycle create + fail-closed | P4-A2 core/MCP/tests only; 380–560, starts only after a fresh final A1c P4-only gate passes after R1, independently ≤800 |
| 4-A3 | Server-derived validate/publish + durable delivery | lifecycle validation/publication + fail-closed | P4-A3 core/MCP/tests only; 430–620, depends on A2, independently ≤800 |
| 4-B | Delivery peek + atomic claim/budget | lifecycle races + fail-closed | P4-B core/MCP/tests only; 520–720, depends on A3, independently ≤800 |
| 5 | Lifecycle + attestation | lifecycle + fail-closed | Slice 5 core/MCP only |
| 6 | Recovery + rollback | recovery + fail-closed | Slice 6 core/MCP only |
| 7 | Host-neutral loop + OpenCode | host-adapters(OpenCode) + polling | controller/OpenCode adapter only |
| 8 | Pi adapter | host-adapters(Pi) | Pi adapter/install manifest only |
| 9 | Claude adapter | host-adapters(Claude) | Claude hooks/install manifest only |
| 10 | Versioned runtime + cutover | runtime-publish + all host probes | candidate release/current/config backups |

## P0 — Baseline Freeze
- [x] 0.1 Freeze bytes/hashes/version evidence for `f583df7` and `71ab571`; preserve `.atl/`, `NEXT-SESSION-off-enforcement.md`, OpenSpec; no runtime edits.
- [x] 0.2 RED→GREEN→REFACTOR restore proofs in `test/migration.test.mjs`; temporary roots; verify no real DB/ACTIVE/mtime mutation.

## P1 — Slice 1 Anchor/Migration
- [x] 1.1 RED `test/migration.test.mjs`: `CT-R8-S1,CT-R8-S3,CT-R8-S4`; exact anchor predicates, Migration 001 bytes/manifest, replay/CAS/error mapping, inert named paths, relative/absolute/`git -C` equivalence.
- [x] 1.2 GREEN `core.mjs`, `install.sh`, `bin/torre`: owner-only anchor, exact OFF migration/checksum, CLI-only provisioning/bootstrap, legacy continuity.
- [x] 1.3 TRIANGULATE/REFACTOR: unsafe type/link/owner/mode, DDL rollback, bounded busy; rerun migration + fail-closed; record runtime N/A and rollback evidence.
- [x] 1.4 Freeze Slice 1 target and run explicit two-judge Judgment Day; persist verdict. Correct only mutually confirmed severe IDs after required maintainer authorization. <!-- sdd-owner: parent -->

## P1-FC — Required Slice 1 Forward-Compatibility Correction

P2 is blocked until all four tasks below pass. There is no additive in-place solution for a database carrying the approved old `CHECK(... = 1)` schema.

- [x] 1F.1 RED `test/migration.test.mjs`: pin corrected fresh-install Migration 001 bytes/checksum, detect the superseded checksum, prove exact schema-1 manifest, and prove non-mutating refusal rather than table rebuild/rename/copy.
- [x] 1F.2 GREEN `core.mjs`: change only `CHECK(version >= 1)` and `CHECK(schema_version >= 1)`, add version-specific manifest selection, and keep Slice 1 responses/anchor/CLI behavior unchanged.
- [x] 1F.3 TRIANGULATE/REFACTOR: rerun all 25 approved Slice 1 migration tests plus fail-closed; verify actual/legacy Tower OFF and absent/unchanged; append correction evidence without rewriting P0/P1 history.
- [x] 1F.4 Freeze only the P1-FC target and run bounded two-judge re-judgment. Preserve the original Slice 1 ledger and authorization history. <!-- sdd-owner: parent -->

Workload boundary: separate prerequisite unit, target ≤400 authored changed lines. Rollback reverts only P1-FC and leaves P2 blocked; no real database is down-migrated or destructively converted.

## P2 — Slice 2 Identity/Mode
- [x] 2.1 RED `test/migration.test.mjs` + `test/identity.test.mjs`: exact Migration 002 bytes/manifest/rollback and `CT-R4-S1..S6,CT-R8-S2,CT-R9-S1,CT-R11-S1`; use only isolated constructor-capability fixtures.
- [x] 2.2 GREEN `core.mjs`, `mcp.mjs`: additive claimant/conflict/lease schema; `continuationRegister` and argument-free non-consuming `continuationReceive`; immutable server-created Ctx; continuation routing kept unadvertised without a host-adapter capability. Preserve legacy `register(handle, role)`, consuming `receive(handle)`, all eight tools, and legacy source behavior.
- [x] 2.3 TRIANGULATE/REFACTOR: initial/same-root/multiplexed/stale identity, immutable conflict update/delete rejection, exact replay, OFF/ROLLING_BACK/lease gates, old-schema refusal, migration rollback/busy, and zero legacy-message consumption; rerun migration + identity + fail-closed; record evidence.
- [x] 2.4 Run and persist Slice 2 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->

P2 workload/rollback boundary: target ≤800 authored changed lines for the standalone Unit 2; if forecast exceeds it, split Migration 002 and identity dispatch into chained review units without crossing scenario ownership. Rollback reverts only Migration 002/continuation dispatcher/P2 tests and leaves schema-2 data inert and OFF; P1-FC remains.

## P3 — Slice 3 Main/API

P3 forecast: 650–800 authored implementation/test lines across `core.mjs`, `mcp.mjs`, `test/migration.test.mjs`, and `test/identity.test.mjs`. If the concrete pre-production forecast exceeds 800, stop and chain the concrete green boundaries P3-A (Migration 003 + `bootstrapMain`; CT-R8-S5 bootstrap and CT-R10-S1..S5) then P3-B (`activate` + `status` + capability-gated MCP; CT-R3-S2/S5 P3 projection, CT-R10-S6, CT-R11-S3 P3 projection). P3 does not own completion, rollback/rebind/finish, termination receipts, or polling quiescence.

- [x] 3.1 RED, before any production edit: preserve the 45-test P2 safety net; independently pin Migration 003's 2457 bytes, checksum, exact schema-3 manifest, atomic 2→3 rollback/replay, and schema-2/legacy preservation in `test/migration.test.mjs`; add failing `test/identity.test.mjs` coverage for first-Main null/0 CAS, total bootstrap mode/lease errors, exact status payload/drift/cross-row errors, and the four activation classes (exact replay, same-transition conflict, stale/changed identity or historical scope, unrelated ON fence) using the pinned operation/scope/request/CAS digests. Cover `CT-R3-S2`, P3 `CT-R3-S5`, `CT-R8-S5`, `CT-R10-S1..S6`, and P3 `CT-R11-S3`; assert future routes remain unavailable and do not claim CT-R3-S1/S3/S4, CT-R6-S3, or CT-R11-S4/S5.
- [x] 3.2 GREEN `core.mjs`, `mcp.mjs`: implement exact Migration 003 through CLI-only `bootstrapAdmin` 2→3; exact `main_binding_v1`, `bootstrapMain` precedence, selector-based activation lookup, activation/precondition history, and status validation; add only capability-gated `bootstrapMain|activate|status|register|receive` routes. Preserve schema-2 P2 behavior, all eight legacy tools, no-`start`, and no public continuation routes without a host capability.
- [x] 3.3 TRIANGULATE/REFACTOR: stale anchor/config/Main epoch; OFF+NONE/ACTIVE/EXPIRED and ON/ROLLING_BACK bootstrap errors; same-root Main rotation; duplicate/conflicting/malformed Main status; migration DDL/busy rollback; activation replay/scope/identity conflicts, malformed evidence, retained non-live conflict history, and activation-without-delivery; rerun migration + identity + fail-closed, syntax/diff/OFF guards, record exact RED→GREEN→TRIANGULATE evidence and authored line count, and stop rather than cross 800.
- [x] 3.4 Run and persist Slice 3 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->

## P4 — Slice 4 Delivery/Claim

Execute six active sequential chained units plus the preserved A1c baseline; budgets are independent and cannot be borrowed. P4-A1a starts from committed P3 HEAD `f20d6a369b18b46890e8e98263dbf97d6973c427`; dependencies are A1a→A1b→preserved unapproved A1c baseline→R1→fresh final A1c P4-only gate→A2→A3→B. The former R2 unit is cancelled: ACK/ATTEST_COMPLETION/COMPLETE/REJECT history acceptance remains P5-owned and RECOVER history acceptance remains P6-owned. Stop for a narrower split before any implementation unit's RED/production boundary if its concrete forecast exceeds 800. Native tasks `4.1`–`4.4` remain slice-owned and unchecked until every row below has satisfied that task's responsibility; the native task count remains 50, boundary evidence is cumulative, and P4 MUST fail closed on unsupported future operation/history rows without claiming later-slice scenario completion.

| Boundary | Forecast | Start / dependency | `4.1` RED/scenario ownership | `4.2` GREEN end state | `4.3` triangulation / rollback |
|---|---:|---|---|---|---|
| P4-A1a | 480–620 | exact P3 HEAD; no P4 dependency | independently copied exact 12,159-byte/215-line SQL, checksum, 19 new object definitions, complete 36-object manifest definitions; no CT scenario completion | constants/manifest definitions and tests are pinned while runtime still rejects schema 4 | byte/line/checksum/definition drift; revert only constants/tests/evidence, with schema/runtime still at P3 |
| P4-A1b | 560–760 | green A1a | fresh 3→4, exact empty schema-4 replay, DDL rollback/busy, schema-4 P3 compatibility; `CT-R8-S5` remains P3-owned | additive migration and empty replay are atomic; P3 routes remain green on schema 3/4; no lifecycle handler | wrong mode/lease, DDL/busy/rollback, zero-row successor evidence; revert A1b execution/routes/tests only, preserve A1a, never down-migrate real schema 4 |
| P4-A1c baseline | 588 actual implementation/test | green A1b; preserved snapshot | historical evolved/non-empty validator/retry evidence only; repeated gate failed, so no approval or CT scenario completion | current read-only fail-closed implementation remains an unapproved prerequisite | do not edit/remove during replan; R1 rollback returns here and preserves A1a/A1b/schema-4 rows |
| P4-A1c-R1 | 360–520 incremental | preserved A1c baseline | paired valid/malformed handoff↔transition, delivery↔PUBLISH/history, claim↔CLAIM/idempotency, immutable-envelope CAS/fence differentials; no CT scenario completion | exact reverse links and operation envelopes validate historical authority/CAS/fences without current lease/Main/claimant substitution | revert only R1 helpers/tests/evidence to the unapproved baseline; preserve A1a/A1b and rows byte-for-byte |
| P4-A2 | 380–560 | fresh final A1c P4-only gate passed after R1; currently blocked | create-side structural/provenance portions of `CT-R2-S1..S3`; no full-scenario completion claim | immutable canonical DRAFT plus capability-gated `create`; no validation/delivery | JCS/Unicode/limits/immutability/operation-scoped replay; revert A2, preserve A1a/R1 and the gate-passed P4-only validator |
| P4-A3 | 430–620 | green A2 | authoritative remainder completing `CT-R2-S1..S3` after A2, plus handoff/publication projection of `CT-R3-S5`; requests contain no caller `validation_digest` | server-derived canonical validation evidence, `validate|publish`, durable PENDING WORK delivery | live inert observations, persisted replay envelope, changed-request conflict, publish cross-row rollback/non-disclosure; revert A3, preserve A1a–A2 |
| P4-B | 520–720 | green A3 | `CT-R6-S1..S2`, `CT-R6-S4..S6`, delivery/claim projection of `CT-R3-S5`; `CT-R6-S3` remains P5 | receive peek plus atomic claim, decision/response commitments, token and one-unit root-session budget | snapshots/order/crash/races/token replay/non-disclosure/budget rollback/cross-operation identity; revert B, preserve A1a–A3 |

- [ ] 4.1 RED in A1a→A1b→A1c-baseline→R1→final A1c P4-only gate→A2→A3→B order as mapped above; preserve the existing A1c and R1 RED/GREEN evidence without treating the final A1c gate as passed. P4 owns only payload/provenance/CREATE/VALIDATE/PUBLISH/CLAIM structural histories; ACK/ATTEST_COMPLETION/COMPLETE/REJECT histories remain P5-owned and RECOVER histories remain P6-owned.
- [ ] 4.2 GREEN `core.mjs`, `mcp.mjs` one implementation boundary at a time without crossing any independent 800-line ceiling; A1a MUST NOT enable schema 4, R1 adds no route/mutation, unsupported future operation/history rows MUST remain read-only `CT_SCHEMA_INVALID`, and A2 MUST NOT start before the fresh final A1c P4-only gate passes.
- [ ] 4.3 TRIANGULATE/REFACTOR each implementation boundary independently; preserve R1 reverse-link and immutable historical-envelope evidence, then run the fresh final A1c P4-only gate over coherent CREATE/VALIDATE/PUBLISH/CLAIM prefixes plus safe rejection of future operation, future state, nonzero-generation, non-WORK, and close-state rows. Append exact evidence/line count/start/end/dependency/rollback without replacing prior evidence.
- [ ] 4.4 Run and persist Slice 4 Judgment Day under the same bounded correction rule only after A1a, A1b, the final P4-only A1c gate, A2, A3, and B are all green and A1c can then be claimed complete. <!-- sdd-owner: parent -->

## P5 — Slice 5 Lifecycle/Attestation
- [ ] 5.1 RED `test/lifecycle.test.mjs`: `CT-R1-S1..S6,CT-R12-S1..S4,CT-R3-S1,CT-R3-S3,CT-R3-S4,CT-R6-S3` and the final attestation/completion projection of `CT-R3-S5`; use real P4 claim state and P5 attestation/committed-result persistence, never synthetic earlier-slice fixtures.
- [ ] 5.2 GREEN `core.mjs`, `mcp.mjs`: ack, evidence/effects, completion attestation, compensation, revision; no `start` API.
- [ ] 5.3 TRIANGULATE/REFACTOR: missing/consumed attestation and unprovable effects; rerun lifecycle + fail-closed; record evidence.
- [ ] 5.4 Run and persist Slice 5 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->

## P6 — Slice 6 Recovery/Rollback

P6 apply is blocked until a bounded design amendment defines its exact additive proof/quiescence DDL, checksum, manifest, and trusted polling-witness persistence; this P3 correction assigns ownership but does not invent that later schema.

- [ ] 6.1 RED `test/recovery.test.mjs`: `CT-R7-S1..S12,CT-R11-S2,CT-R11-S4,CT-R11-S5` plus the rollback/rebind/finish projection of `CT-R11-S3`; first pin P6's own additive proof/quiescence migration and use persisted old-Main identity, termination-receipt, frozen-inventory, lease, and trusted polling-witness preconditions.
- [ ] 6.2 GREEN `core.mjs`, `mcp.mjs`: proof-bound suspension/recovery, lease/rollback epoch, ON-only redelivery.
- [ ] 6.3 TRIANGULATE/REFACTOR: stale proof/epoch, forbidden dispositions, zero-live finish; rerun recovery + fail-closed; record evidence.
- [ ] 6.4 Run and persist Slice 6 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->

## P7 — Host-Neutral Loop + OpenCode Adapter
- [ ] 7.1 RED `test/host-adapters.test.mjs` and `test/polling.test.mjs`: `CT-R5-S1..S5@OpenCode`, wake failure, throttling, dispose-before-peek/receive.
- [ ] 7.2 GREEN `host/loop.mjs` + `plugin/tower-spike.js`: injected ports, root-only controller, OpenCode lifecycle mapping; no SQLite logic in adapter.
- [ ] 7.3 TRIANGULATE/REFACTOR: child/root ordering and pending-delivery preservation; rerun adapter/polling/fail-closed; record evidence.
- [ ] 7.4 Run and persist Slice 7 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->

## P8 — Pi Adapter
- [ ] 8.1 RED `test/host-adapters.test.mjs`: `CT-R5-S1..S5@Pi`, `agent_settled`, `ctx.isIdle()`, `session_shutdown`, and follow-up wake semantics.
- [ ] 8.2 GREEN `adapters/pi/`: global Pi extension delegates only to `host/loop.mjs` and uses idle-safe message injection.
- [ ] 8.3 TRIANGULATE/REFACTOR: reload/resume/shutdown and child isolation; rerun Pi adapter + fail-closed; record evidence.
- [ ] 8.4 Run and persist Slice 8 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->

## P9 — Claude Adapter
- [ ] 9.1 RED `test/host-adapters.test.mjs`: `CT-R5-S1..S5@Claude`, `Stop`, `SessionEnd`, `stop_hook_active`, bounded `asyncRewake`, and subagent/teammate isolation.
- [ ] 9.2 GREEN `adapters/claude/`: plugin hooks/scripts delegate only to `host/loop.mjs`; wake only after non-consuming pending peek.
- [ ] 9.3 TRIANGULATE/REFACTOR: repeated Stop, hook timeout/failure, terminal cleanup; rerun Claude adapter + fail-closed; record evidence.
- [ ] 9.4 Run and persist Slice 9 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->

## P10 — Versioned Runtime and Verified Cutover
- [ ] 10.1 RED `test/runtime-publish.test.mjs`: allowlisted manifest, immutable existing release, failed probe, atomic `current`, backup/restore, and legacy-path preservation.
- [ ] 10.2 GREEN `scripts/publish-runtime.mjs`, `install.sh`: stage/verify/fsync/rename `releases/<git-sha>`, then atomically switch `current`; host configs resolve only through `current`.
- [ ] 10.3 TRIANGULATE/REFACTOR: interrupted publication and one-host probe failure restore prior state; verify `~/.config/opencode/control-tower` untouched and Tower OFF.
- [ ] 10.4 Run and persist Slice 10 Judgment Day under the same bounded correction rule. <!-- sdd-owner: parent -->

## P11 — CT-only Verification/Handoff
- [ ] 11.1 Run `bun test`; audit all 64 stable CT IDs bidirectionally and the three-host CT-R5 conformance matrix. <!-- sdd-owner: parent -->
- [ ] 11.2 Verify Tower OFF, unchanged ACTIVE/DB/mtime, legacy continuity, host-neutral import boundaries, and no `start`, token, or anchor-secret exposure. <!-- sdd-owner: parent -->
- [ ] 11.3 Verify candidate release and rollback evidence; update host configs only after all probes pass; preserve legacy source until cutover is proven. <!-- sdd-owner: parent -->
- [ ] 11.4 Servi-Task-U gate: CT passes plus API/error/fence/evidence and OFF/quiescent/rollback evidence. <!-- sdd-owner: parent -->

### Inverse traceability
`CT-R1-S1..S6→5.1;CT-R2-S1..S3→4.1(P4-A2 partial/P4-A3 completion);CT-R3-S1→5.1;CT-R3-S2→3.1;CT-R3-S3..S4→5.1;CT-R3-S5→3.1,4.1(P4-A3 handoff/P4-B delivery),5.1;CT-R4-S1..S6→2.1;CT-R5-S1..S5→7.1,8.1,9.1;CT-R6-S1..S2→4.1(P4-B);CT-R6-S3→5.1;CT-R6-S4..S6→4.1(P4-B);CT-R7-S1..S12→6.1;CT-R8-S1→1.1;CT-R8-S2→2.1;CT-R8-S3→1.1;CT-R8-S4→1.1;CT-R8-S5→3.1(P4-A1b/A1c-R1 preservation only);CT-R9-S1→2.1;CT-R10-S1..S6→3.1;CT-R11-S1→2.1;CT-R11-S2→6.1;CT-R11-S3→3.1,6.1;CT-R11-S4..S5→6.1;CT-R12-S1..S4→5.1.` R1 and the final P4-only A1c gate own validator-preservation evidence only and no stable CT scenario completion. ACK/ATTEST_COMPLETION/COMPLETE/REJECT histories remain traced to P5, and RECOVER histories remain traced to P6; P4 records only their fail-closed rejection.
