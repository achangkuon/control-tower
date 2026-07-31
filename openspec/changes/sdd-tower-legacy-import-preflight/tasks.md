# Plan 2 — Legacy Import Preflight

## Review Workload Forecast

| Autonomous boundary | Actual lines | 400 risk | 800 risk | Current-file evidence |
|---|---:|---|---|---|
| Planning artifacts (`proposal.md`, `design.md`, `spec.md`, `tasks.md`) | 280 | Low | Low | 73+81+77+49 |
| Implementation + maintained tests | 317 | Medium | Low | `registry/legacy-import.mjs` 134 + maintained test 183 |
| Apply evidence (`apply-progress.md`) | 37 | Low | Low | current file |
| Verify evidence (`verify-report.md`) | 125 | Low | Low | current file |
| **Total final candidate** | **759** | **High** | **High/near-limit** | 280+317+37+125 |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
800-line budget risk: High/near-limit

### Autonomous Delivery Boundaries

- **Planning — 280/400:** proposal→tasks, verified by strict OpenSpec; runtime N/A; rollback planning metadata only.
- **Implementation + tests — 317/400:** RED→GREEN, focused `bun test test/registry/legacy-import.test.mjs`; runtime N/A (private synchronous module); rollback the two additive source/test files.
- **Apply evidence — 37/400:** bounded apply snapshots/hashes/no-write proof in `apply-progress.md`; runtime N/A; rollback this evidence record only.
- **Verify evidence — 125/400:** combined tests, import, privacy, OpenSpec, and hygiene in `verify-report.md`; runtime N/A (external `ACTIVE` protected); rollback this report only.

The original 310–470 forecast materially understated apply/verify metadata. Cached preflight auto-forecast already resolves stacked-to-default-integration (`master`); the guard literal remains `stacked-to-main`, so no human decision is needed.

## Sesión S2.5 — Legacy Import Preflight (one implementation PR)

### Módulo M2.5.1 — `test/registry/legacy-import.test.mjs` (RED)

- [x] T2.5.1.1 Add failing tests for `INVALID_REQUEST`, `MALFORMED_RECORD`, and first-wins `DUPLICATE_ID`, preserving input order and rejecting legacy authority.
- [x] T2.5.1.2 Add failing derivation tests for `DERIVATION_INVALID`, `DERIVATION_FAILED`, `INCOMPLETE_FACTS`, then `CONTRACT_REJECTED`; verify only authoritative complete facts become ready.
- [x] T2.5.1.3 Add failing registry tests for no read, empty, valid, `REGISTRY_READ_FAILED`, and `REGISTRY_INVALID`; assert exactly one load and zero saves.
- [x] T2.5.1.4 Add failing positive conflicts in order `PROJECT_ID_CONFLICT`, `ALIAS_CONFLICT`, `CANONICAL_ROOT_CONFLICT`, `GIT_COMMON_DIR_CONFLICT`, `MAIN_STORE_PATH_CONFLICT`, plus negative cross-class cases; assert precedence request→record→duplicate→derivation→incomplete→contract→registry→conflicts.
- [x] T2.5.1.5 Add failing reproducibility, redaction, complete-ready-entry, frozen-result, no-write, DB/`ACTIVE`, public-export, and P8-isolation proofs; injected messages, causes, hints, credentials, and secrets must be absent.

### Módulo M2.5.2 — `registry/legacy-import.mjs` (GREEN)

- [x] T2.5.2.1 Implement exact request/record gates, stable duplicate tracking, frozen hints, input-order items, and closed issue mapping without merging legacy fields.
- [x] T2.5.2.2 Implement `deriveFacts` outcome mapping, existing project-registry validation/canonicalization, complete canonical output, and safe failure redaction.
- [x] T2.5.2.3 Implement optional `{ load() }` comparison with empty/loaded/failed/invalid registry states and same-class-only conflict ordering; never call `save()`.
- [x] T2.5.2.4 Keep the module private and additive: no `registry/index.mjs`, store, filesystem, runtime, Git, DB, `ACTIVE`, or P8 imports.

### Módulo M2.5.3 — Evidence and refactor (REFACTOR)

- [x] T2.5.3.1 Refactor stable frozen results, safe fields/kinds, canonical strings, and deterministic issue precedence without changing the RED contract.
- [x] T2.5.3.2 Run focused, combined, import/build, OpenSpec strict, and `git diff --check`; run full `bun test` only when external runtime is inactive, otherwise record the safe skip and bounded no-write evidence.
- [x] T2.5.3.3 Snapshot/hash/stat actual and legacy DB/`ACTIVE` before and after tests; record runtime harness `N/A`, no-write evidence, public-surface proof, and rollback boundary.
