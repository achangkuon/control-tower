# Plan 2 — Tower V1 Project Registry

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated authored lines | 360–440 |
| 400-line budget risk | Medium |
| 800-line hard-stop risk | Low |
| Session fits one PR | Yes; one storage-only PR |
| Chained PRs recommended | No |
| Candidate paths/modes | Create `registry/path.mjs`, `registry/store.mjs`, `registry/index.mjs`, `test/registry/storage.test.mjs`; synchronous ESM, real-fs production default, injectable fs/beforeCommit tests |
| Delivery decision | Auto-forecast; no decision before apply |
| Rollback boundary | Revert only the four new files; remove/back up inert XDG artifacts independently |
| Focused command | `bun test test/registry/storage.test.mjs test/contracts/schema.test.mjs test/main-store.test.mjs` |
| Runtime harness | N/A — no daemon/DB boundary; temp HOME/XDG roots and injected fs seam are the runtime proof |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium
800-line budget risk: Low

## Sesión S2.4 — Registry Storage and XDG Path Resolution (one PR)

### Módulo M2.4.1 — `test/registry/storage.test.mjs` (RED)

- [x] T2.4.1.1 Add failing isolated tests for XDG override/default, invalid roots, cwd independence, and `ENOENT` returning `null` without writes.
- [x] T2.4.1.2 Add failing tests for owner-only `0700`/`0600`, non-symlink/type checks, strict contract error categories, and invalid-save byte preservation.
- [x] T2.4.1.3 Add failing tests for exact CAS, monotonic registry/entry revisions, stale races with exactly one winner, lock timeout, and temp/lock cleanup.
- [x] T2.4.1.4 Add failing injected temp/write/fsync/rename/directory-fsync tests, including post-rename rollback, durability-unknown, and zero runtime DB writes.

### Módulo M2.4.2 — `registry/path.mjs` (GREEN → REFACTOR)

- [x] T2.4.2.1 Implement `resolveProjectRegistryPath({ env })` using absolute non-empty `XDG_CONFIG_HOME`, otherwise absolute `HOME/.config`, then `control-tower/projects.yaml`.
- [x] T2.4.2.2 Return stable `CT_REGISTRY_PATH_INVALID` for missing, empty, relative, or unusable roots before filesystem access; keep repository/Git/Hermes-independent.
- [x] T2.4.2.3 Refactor the resolver to a narrow synchronous ESM API with deterministic path construction and no ambient cwd dependence.

### Módulo M2.4.3 — `registry/store.mjs` (GREEN → REFACTOR)

- [x] T2.4.3.1 Implement secure parent/file validation, `O_NOFOLLOW` reads, `load()` absence semantics, and `validate("projectRegistry", ...)`/`canonicalize(...)` reuse.
- [x] T2.4.3.2 Implement validated canonical save with same-directory `0600` temp, fsync/close, `0600` `O_EXCL` lock, reload-under-lock CAS, exact registry increments, entry revisions (retained unchanged/changed +1/new 1), atomic rename, and directory fsync.
- [x] T2.4.3.3 Implement stable boundary errors, lock timeout, injected failure cleanup, prior-byte preservation, and post-rename rollback or `CT_REGISTRY_DURABILITY_UNKNOWN`.
- [x] T2.4.3.4 Refactor ownership/mode checks, error mapping, and injectable fs/beforeCommit seams without adding enrollment, import, resolution, adapters, Main, SQLite, or Supabase behavior.

### Módulo M2.4.4 — `registry/index.mjs` and final evidence (GREEN → REFACTOR)

- [x] T2.4.4.1 Export only `resolveProjectRegistryPath` and `createProjectRegistryStore` through a frozen narrow surface; keep internals private.
- [x] T2.4.4.2 Add import-surface assertions to the isolated test file and verify contract, storage, and Main-store baselines with the focused Bun command.
- [x] T2.4.4.3 Record final evidence: all scenarios pass, exactly one concurrent winner, no temp/lock residue, and no `.git/control-tower/tower.db` mutation.
