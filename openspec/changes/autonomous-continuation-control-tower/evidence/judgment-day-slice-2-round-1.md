# Judgment Day — Slice 2 Round 1
- **Frozen scope:** P2 Identity/Mode tasks `2.1`–`2.4`; target `86d7988ce1d31f5996a19d75fbb30049de737d0eb47fbe8a1a4133b3083aff9f`; base `badaf71f7fd0e72a80510cdf0414d2e4d0896bc0`; both judges verified scope/manifest identity and the post-review rehash was byte-identical.
## Frozen findings ledger
| ID | Severity | Location | One-sentence proof / follow-up |
|---|---|---|---|
| `CT-JD-S2-A-001` | CRITICAL suspect | `core.mjs:158` | `INSERT OR REPLACE` may bypass conflict-row immutability because UPDATE/DELETE triggers do not prevent REPLACE with recursive triggers off; Judge A only, so retain as an unfixed follow-up. |
| `CT-JD-S2-B-001` | CRITICAL suspect | `core.mjs:364` | Exact replay may accept OFF mode with an ACTIVE-or-EXPIRED lease because mode and lease are validated independently; Judge B only, so retain as an unfixed follow-up. |
| `CT-JD-S2-A-W01` | WARNING | `core.mjs:384` | A schema-1 request-identity collision during schema 1→2 may map to `CT_SCHEMA_INVALID` instead of `CT_IDEMPOTENCY_CONFLICT`; retain as an informational follow-up. |
| `CT-JD-S2-B-W01` | WARNING | `core.mjs:576` | Conflict rows lack semantic read validation, so fabricated but length-valid data may force MULTIPLEXED state; retain as an informational follow-up. |
| `CT-JD-S2-B-W02` | WARNING | `test/migration.test.mjs:657` | The rollback test fails at `BEGIN IMMEDIATE`, before partial Migration 002 DDL, so it does not prove partial-DDL rollback; retain as an informational follow-up. |
## Merge, verification, and decision
- **Merge:** confirmed severe **0**; suspect severe **2**; contradictions **0**; warnings **3**; corrections **0/2**. No severe finding was confirmed by both judges, so none was corrected and no correction actor or re-judgment ran; all suspects/warnings remain follow-ups.
- **Independent verification:** **45 pass, 0 fail, 288 assertions**; syntax/whitespace passed; implementation/test workload **730/800**; actual and legacy `ACTIVE`/`tower.db` absent; preserved note hash matched; frozen target remained byte-identical.
- **Terminal:** approved.

**JUDGMENT: APPROVED ✅**
