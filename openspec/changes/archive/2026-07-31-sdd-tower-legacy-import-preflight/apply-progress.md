# Apply Progress: Legacy Import Preflight

## Status
- Change/Sesión: `sdd-tower-legacy-import-preflight` / S2.5
- Mode: Strict TDD; 12/12 tasks complete; bounded remediation after verify FAIL
- Delivery: one PR, no size exception; rollback removes only the new module/test
- Size: source/test 134/183 = 317 lines (<400); total candidate 764/800 lines

## Cumulative TDD Cycle Evidence
| Tasks | Layer | Safety | RED | GREEN | Triangulate / Refactor |
|---|---|---|---|---|---|
| T2.5.1.1–1.5 | Unit/Integration | N/A new | missing module: 0 pass/1 fail/1 error | initial 11/11 | malformed/duplicate/all outcomes/registry/conflicts/freeze/redaction/isolation |
| T2.5.2.1–2.4 | Unit/Integration | N/A new | maintained behavior tests first | initial 11/11 | exact gates, authority-only contract, load-only comparison, private imports |
| T2.5.3.1 | Unit | N/A new | ordering regression: 10 pass/1 fail | initial 11/11 | input, kind, schema-field ordering; deep freeze |
| Remediation F1 | Integration | 11/11 baseline | coded load-throw regression: focused 11 pass/1 fail among 13 | 13/13 | three throw shapes; load and validation catches separated |
| Remediation F2 | Unit | 11/11 baseline | failed-index-0 regression: focused 11 pass/1 fail among 13 | 13/13 | derivation class sorts by input before code |
| T2.5.3.2–3.3 | Integration | bounded snapshots | prior REDs above | final results below | deterministic checks and no-write boundary |

## Exact Results
- Initial RED: focused exit 1; 0 pass, 1 fail, 1 error. Initial final: 11 pass, 0 fail, 124 assertions.
- Remediation RED: focused exit 1; 11 pass, 2 fail, 126 assertions. GREEN: exit 0; 13 pass, 0 fail, 128 assertions, 346 ms.
- Final focused: exit 0; 13 pass, 0 fail, 128 assertions, 383 ms. Combined: exit 0; 70 pass, 0 fail, 294 assertions, 1175 ms.
- Independent probes: `{"coded":["failed","REGISTRY_READ_FAILED"],"ordered":["DERIVATION_FAILED","DERIVATION_INVALID"]}`; exit 0.
- Privacy/import: `privacy ok`; OpenSpec strict: `Change 'sdd-tower-legacy-import-preflight' is valid`; diff/no-index hygiene: exit 0.
- Full `bun test`: conditional. It is required only when external runtime is inactive; existing external `ACTIVE` requires a documented safe skip, never mutation/removal.

## Contract and Work-Unit Evidence
- Closed codes remain exactly: `INVALID_REQUEST`, `MALFORMED_RECORD`, `DUPLICATE_ID`, `DERIVATION_INVALID`, `DERIVATION_FAILED`, `INCOMPLETE_FACTS`, `CONTRACT_REJECTED`, `REGISTRY_READ_FAILED`, `REGISTRY_INVALID`, and the five ordered conflict codes.
- Focused command: `bun test test/registry/legacy-import.test.mjs`.
- Runtime harness: N/A—private synchronous pure module with no public/runtime boundary.
- No-write: optional reader calls `load()` only; save trap untouched; authoritative writes 0; imports only shared validate/canonicalize.
- Rollback: remove `registry/legacy-import.mjs` and `test/registry/legacy-import.test.mjs`; task/progress reconciliation reverts independently.

## DB / ACTIVE and Risk
- Final immediate before/after: actual `ACTIVE` inode 2741, size 0, mode 664, mtime/ctime 1785414945, SHA-256 `e3b0c442…b855`; actual DB inode 209367, size 176128, mode 644, mtime/ctime 1785457203, SHA-256 `9b955f3a…48a2`; both legacy paths missing.
- Prior broad-window DB drift occurred while external `ACTIVE` existed; only immediate command boundaries are attributable.
- Design deviations: none. Full-suite skip under active runtime is the corrected safety contract, not an exemption from bounded verification.
