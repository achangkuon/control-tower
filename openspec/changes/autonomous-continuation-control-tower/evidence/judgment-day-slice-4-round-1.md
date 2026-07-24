# Judgment Day — Slice 4 Round 1

- **Frozen identity:** base `f20d6a369b18b46890e8e98263dbf97d6973c427` / tree `3cf5a4354cc81c860df23f14b424f5a7b6fbf649`; candidate `5b645ba8a39e193e867c9616f20d5c3e02ced166` / tree `2e699edabf408c7ae1a2744741b3e435813f5293`; scoped patch SHA-256 `06c8f6f34f916d80b5ccf5dfc9f8a7cde46c06e9087b51384574a2cbce4d2164`.
- **Frozen scope:** Slice 4 implementation, tests, and OpenSpec artifacts in `core.mjs`, `mcp.mjs`, `test/migration.test.mjs`, `test/identity.test.mjs`, and the declared `autonomous-continuation-control-tower` design/tasks/progress/handoff/spec files. Unrelated `.gitignore`, `.session-doc.json`, and `NEXT-SESSION-off-enforcement.md` are excluded.
- **Execution:** two fresh blind read-only judges inspected the identical frozen target. Neither ran tests, builds, lifecycle commands, 4R, edits, network calls, or delegation. Parent rehash after judging was byte-identical and the working tree remained clean before this ledger was created.

## Frozen findings ledger

| ID | Classification | Location | One-sentence proof / disposition |
|---|---|---|---|
| `CT-JD-S4-001` | CRITICAL confirmed | `core.mjs:1009-1016,1179-1220` | Both judges independently proved the candidate explicitly accepts coherent `ACK`, `ATTEST_COMPLETION`, `COMPLETE`, `REJECT`, and `RECOVER` histories, while the corrected Slice 4 design/tasks require every P5/P6-dependent history to fail read-only as `CT_SCHEMA_INVALID`. Round-one correction requires maintainer authorization. |
| `CT-JD-S4-JA-002` | CRITICAL suspect | `core.mjs:1664` | Judge A proved the COMMIT reference path resolves the commit and computes an observed digest but does not compare `reference.digest` with that digest; Judge B did not report it. Preserve unfixed unless separately scheduled. |
| `CT-JD-S4-JB-002` | CRITICAL suspect with warning-level corroboration | `core.mjs:1644-1654` | Judge B rated the FILE lstat-then-path-read TOCTOU race CRITICAL; Judge A independently reported the same root cause as WARNING. It is not severe-confirmed by both and remains unfixed. |
| `CT-JD-S4-W01` | WARNING corroborated | `core.mjs:1569-1585` | Both judges reported exact CREATE replay can substitute current claimant/lease metadata into historical CAS and return `CT_IDEMPOTENCY_CONFLICT` after a coherent rebind/evolution. Informational follow-up. |
| `CT-JD-S4-W02` | WARNING | `core.mjs:1080` | Judge A reported equal-millisecond transitions are ordered by random `transition_id` instead of persisted insertion sequence, making causal reconstruction nondeterministic. Informational follow-up. |
| `CT-JD-S4-W03` | WARNING | `core.mjs:1274-1282` | Judge B reported schema-4 validation reconstructs the raw claim bearer during status/receive/replay validation despite the no-reconstruction contract. Informational follow-up. |
| `CT-JD-S4-W04` | WARNING | `core.mjs:1108-1116` | Judge B reported a canonical unconsumed orphan budget row can pass validation although legitimate first claim seeds and consumes the budget atomically. Informational follow-up. |

## Round-one merge and state

- **Merge:** confirmed severe **1**; suspect severe **2**; contradictions **0**; informational findings **4**; corrections **0/2**; scoped re-judgments **0/2**.
- **Correction boundary:** only `CT-JD-S4-001` is eligible for a bounded correction because it is the sole severe defect confirmed as severe by both blind judges. Suspect and informational findings are frozen and must not be corrected in this Judgment Day transaction.
- **Current state:** awaiting explicit maintainer authorization for round-one correction. No terminal judgment has been issued.

## Authorized round-one correction

- **Authorization:** The maintainer authorized correction of `CT-JD-S4-001` only. The two suspect severe and four informational findings remain frozen and unfixed.
- **Correction:** `core.mjs` and `test/identity.test.mjs`; **21 additions + 3 deletions = 24 authored lines**; immutable correction delta SHA-256 `62cf1aeca199bd246e412d5a4224741f25b0f665ab1d25c686cbed48018cc1dc`.
- **RED:** The focused future-history rejection test failed because a coherent future history returned success instead of `CT_SCHEMA_INVALID`.
- **GREEN:** Future P5/P6 history rejection passed with **1 pass, 0 fail, 21 assertions**.
- **TRIANGULATE:** Coherent P4 prefixes passed with **1 pass, 0 fail, 16 assertions**.
- **Budget:** corrections **1/2**.

## Scoped re-judgment

- Judge A: clean.
- Judge B: clean.
- No fix-caused defect was found.
- Scoped re-judgments: **1/2**.

## Independent final verification

- `test/identity.test.mjs`: **58 pass, 0 fail, 515 assertions**.
- Full `bun test`: **108 pass, 0 fail, 823 assertions**.
- Diff and syntax guards passed.
- Migration 004 remained exactly **12,159 bytes / 215 lines** at `sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`.
- Default MCP remained exactly eight legacy tools with no `start`.
- Actual and legacy `ACTIVE` were absent; actual and legacy `tower.db` were absent.

## Preservation and rollback

- Frozen rows `CT-JD-S4-JA-002`, `CT-JD-S4-JB-002`, and `CT-JD-S4-W01`–`CT-JD-S4-W04` remain listed above and unfixed.
- Rollback is limited to the authorized `CT-JD-S4-001` correction in `core.mjs` and `test/identity.test.mjs`; reverting it restores the future-history acceptance defect and invalidates this terminal approval. Migration 004, P4-native histories, unrelated state, and frozen finding rows remain outside that rollback boundary.

## Terminal decision

- **Merge:** confirmed severe **1**; suspect severe **2**; contradictions **0**; informational findings **4**.
- **Outcome:** The sole confirmed severe defect was authorized, corrected, and cleared by both scoped blind judges; independent final verification passed.
- **Terminal state:** approved.

**JUDGMENT: APPROVED ✅**
