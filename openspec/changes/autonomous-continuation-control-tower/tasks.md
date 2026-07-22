# Tasks: Autonomous Continuation — Control Tower

## Review Workload Forecast

Estimated authored change: 1,800–2,600 lines, 9 files; eight PR/work units because Slices 1–6 share `core.mjs`.

Decision needed before apply: No — maintainer resolved on 2026-07-22
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Work Units

| Unit | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|
| 0 | `bun test test/migration.test.mjs` | N/A—hash fixtures | `test/migration.test.mjs`; no production |
| 1 | `bun test test/migration.test.mjs` | N/A—temp roots | `core.mjs`/`install.sh`/`bin/torre` S1; legacy intact |
| 2 | `bun test test/identity.test.mjs` | N/A—temp roots | `core.mjs`/`mcp.mjs` S2; S1 intact |
| 3 | `bun test test/identity.test.mjs` | N/A—temp roots | `core.mjs`/`mcp.mjs` S3; foundations intact |
| 4 | `bun test test/lifecycle.test.mjs` | N/A—temp roots | `core.mjs`/`mcp.mjs` S4; prior slices intact |
| 5 | `bun test test/lifecycle.test.mjs` | N/A—temp roots | `core.mjs`/`mcp.mjs` S5; audit intact |
| 6 | `bun test test/recovery.test.mjs` | N/A—temp roots | `core.mjs`/`mcp.mjs` S6; OFF/quiescent |
| 7 | `bun test test/polling.test.mjs` | N/A—fake events | `plugin/tower-spike.js` root boundary only |

## P0 — Baseline Freeze
- [x] 0.1 Freeze bytes/hashes/version evidence for `f583df7` and `71ab571`; preserve `.atl/`, `NEXT-SESSION-off-enforcement.md`, OpenSpec; no runtime edits.
- [x] 0.2 RED→GREEN→REFACTOR restore proofs in `test/migration.test.mjs`; temporary roots; verify no real DB/ACTIVE/mtime mutation.

## P1 — Slice 1 Anchor/Migration
- [ ] 1.1 RED `test/migration.test.mjs`: `CT-R8-S1,CT-R8-S2,CT-R8-S3,CT-R8-S4,CT-R8-S5`; RED each inert path (escape fails closed: `requirements.txt`/`CMakeLists.txt`/MD/MDX/`README.sh`) and relative/absolute/`git -C` fingerprint match.
- [ ] 1.2 GREEN `core.mjs`, `install.sh`, `bin/torre`: anchor/OFF migration/checksum/legacy API.
- [ ] 1.3 REFACTOR: rerun migration + `test/fail-closed.test.mjs`.

## P2 — Slice 2 Identity/Mode
- [ ] 2.1 RED `test/identity.test.mjs`: `CT-R4-S1,CT-R4-S2,CT-R4-S3,CT-R4-S4,CT-R4-S5,CT-R4-S6,CT-R9-S1,CT-R11-S1`.
- [ ] 2.2 GREEN `core.mjs`, `mcp.mjs`: server fences/peek/OFF-mode-lease gates.
- [ ] 2.3 REFACTOR: rerun identity + fail-closed.

## P3 — Slice 3 Main/API
- [ ] 3.1 RED `test/identity.test.mjs`: `CT-R10-S1,CT-R10-S2,CT-R10-S3,CT-R10-S4,CT-R10-S5,CT-R10-S6,CT-R3-S1,CT-R3-S2,CT-R3-S3,CT-R3-S4,CT-R3-S5,CT-R11-S3,CT-R11-S4,CT-R11-S5`.
- [ ] 3.2 GREEN `core.mjs`, `mcp.mjs`: Main binding/responses/idempotency/errors/rollback.
- [ ] 3.3 REFACTOR: rerun identity + fail-closed.

## P4 — Slice 4 Delivery/Payload
- [ ] 4.1 RED `test/lifecycle.test.mjs`: `CT-R6-S1,CT-R6-S2,CT-R6-S3,CT-R6-S4,CT-R6-S5,CT-R6-S6,CT-R2-S1,CT-R2-S2,CT-R2-S3`.
- [ ] 4.2 GREEN `core.mjs`, `mcp.mjs`: payload/peek/atomic claim/budget/token races.
- [ ] 4.3 REFACTOR: rerun lifecycle + fail-closed.

## P5 — Slice 5 Lifecycle/Attestation
- [ ] 5.1 RED `test/lifecycle.test.mjs`: `CT-R1-S1,CT-R1-S2,CT-R1-S3,CT-R1-S4,CT-R1-S5,CT-R1-S6,CT-R12-S1,CT-R12-S2,CT-R12-S3,CT-R12-S4`.
- [ ] 5.2 GREEN `core.mjs`, `mcp.mjs`: ack/attestation/completion/effects/compensation/revision.
- [ ] 5.3 REFACTOR: rerun lifecycle + fail-closed.

## P6 — Slice 6 Recovery/Rollback
- [ ] 6.1 RED `test/recovery.test.mjs`: `CT-R7-S1,CT-R7-S2,CT-R7-S3,CT-R7-S4,CT-R7-S5,CT-R7-S6,CT-R7-S7,CT-R7-S8,CT-R7-S9,CT-R7-S10,CT-R7-S11,CT-R7-S12,CT-R11-S2`.
- [ ] 6.2 GREEN `core.mjs`, `mcp.mjs`: proof/suspension/lease-epoch/ON-only redelivery.
- [ ] 6.3 REFACTOR: rerun recovery + fail-closed.

## P7 — Slice 7 Root Polling
- [ ] 7.1 RED `test/polling.test.mjs`: `CT-R5-S1,CT-R5-S2,CT-R5-S3,CT-R5-S4,CT-R5-S5`; disposal-before-receive ordering.
- [ ] 7.2 GREEN `plugin/tower-spike.js`: root-only polling; child events inert; pending work unconsumed.
- [ ] 7.3 REFACTOR: rerun polling + fail-closed.

## P8 — CT-only Verification/Handoff
- [ ] 8.1 Run `bun test test/{migration,identity,lifecycle,recovery,polling,fail-closed}.test.mjs`; audit 64 IDs bidirectionally.
- [ ] 8.2 Verify Tower OFF, unchanged ACTIVE/DB/mtime, legacy continuity, and no `start`, token, or anchor-secret exposure.
- [ ] 8.3 Servi-Task-U apply gate: 64 CT passes plus API/error/fence/evidence and OFF/quiescent/rollback evidence.

### Inverse traceability
`CT-R1-S1→5.1,CT-R1-S2→5.1,CT-R1-S3→5.1,CT-R1-S4→5.1,CT-R1-S5→5.1,CT-R1-S6→5.1;CT-R2-S1→4.1,CT-R2-S2→4.1,CT-R2-S3→4.1;CT-R3-S1→3.1,CT-R3-S2→3.1,CT-R3-S3→3.1,CT-R3-S4→3.1,CT-R3-S5→3.1;CT-R4-S1→2.1,CT-R4-S2→2.1,CT-R4-S3→2.1,CT-R4-S4→2.1,CT-R4-S5→2.1,CT-R4-S6→2.1;CT-R5-S1→7.1,CT-R5-S2→7.1,CT-R5-S3→7.1,CT-R5-S4→7.1,CT-R5-S5→7.1;CT-R6-S1→4.1,CT-R6-S2→4.1,CT-R6-S3→4.1,CT-R6-S4→4.1,CT-R6-S5→4.1,CT-R6-S6→4.1;CT-R7-S1→6.1,CT-R7-S2→6.1,CT-R7-S3→6.1,CT-R7-S4→6.1,CT-R7-S5→6.1,CT-R7-S6→6.1,CT-R7-S7→6.1,CT-R7-S8→6.1,CT-R7-S9→6.1,CT-R7-S10→6.1,CT-R7-S11→6.1,CT-R7-S12→6.1;CT-R8-S1→1.1,CT-R8-S2→1.1,CT-R8-S3→1.1,CT-R8-S4→1.1,CT-R8-S5→1.1;CT-R9-S1→2.1;CT-R10-S1→3.1,CT-R10-S2→3.1,CT-R10-S3→3.1,CT-R10-S4→3.1,CT-R10-S5→3.1,CT-R10-S6→3.1;CT-R11-S1→2.1,CT-R11-S2→6.1,CT-R11-S3→3.1,CT-R11-S4→3.1,CT-R11-S5→3.1;CT-R12-S1→5.1,CT-R12-S2→5.1,CT-R12-S3→5.1,CT-R12-S4→5.1.`
