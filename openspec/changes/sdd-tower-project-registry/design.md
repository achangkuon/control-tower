# Design: S2.4 — Registry Storage and XDG Path Resolution

## Technical Approach

Add a synchronous ESM registry boundary, isolated from repositories and runtime state. It resolves the XDG config path, reuses `validate("projectRegistry", ...)` and `canonicalize(...)`, and applies the owner-only atomic/CAS pattern already used by `main-store/store.mjs`. JSON canonical bytes are valid YAML 1.2, so persistence stays deterministic while loading accepts the existing strict YAML contract.

## Architecture Decisions

| Option | Tradeoff | Decision and rationale |
|---|---|---|
| Derive from cwd/Git/Hermes | Convenient but checkout-coupled | Reject. `resolveProjectRegistryPath({ env })` uses absolute non-empty `XDG_CONFIG_HOME`, otherwise absolute `HOME/.config`, then `control-tower/projects.yaml`; invalid roots fail closed. |
| Duplicate schema checks | Local errors but divergent invariants | Reject. Preserve `CT_SCHEMA_INVALID`/`CT_MANIFEST_INVALID` from `validate`, including unknown fields, duplicate IDs, and global alias uniqueness. |
| Last-writer-wins rename | Simple but loses concurrent updates | Reject. Serialize commits with an owner-only `O_EXCL` sidecar lock and re-read revision under lock before rename. |
| Caller-managed arbitrary revisions | Flexible but bypassable | Reject. Require exact CAS and monotonic registry/entry revisions at the storage boundary. |

## Data Flow

```text
env -> XDG resolver -> projects.yaml
                         | load: secure open -> validate -> frozen document/null
candidate -> validate -> temp 0600 -> fsync -> lock -> reload/CAS -> rename -> dir fsync
```

`load()` returns `null` only for `ENOENT`; it never creates an initial registry. `save({ document, expectedRevision })` treats absence as revision `0`, requires `document.registry_revision === expectedRevision + 1`, and validates against the current document. For retained projects, canonical content excluding `registry_entry_revision` determines whether the entry revision must stay unchanged or increase by exactly one; new entries start at `1`. Enrollment/import policy remains outside this module.

The parent is created/chmodded `0700` only when owner-controlled, then rechecked with `lstat` for directory type, ownership, non-symlink status, and exact mode. Existing registry reads require a regular owner-owned non-symlink `0600` file opened with `O_NOFOLLOW`.

The writer creates a random temp in the destination directory with `O_CREAT|O_EXCL|O_WRONLY|O_NOFOLLOW`, writes canonical bytes, fsyncs and closes it, acquires the `0600` lock, reloads/validates current state, checks CAS/revisions, invokes the pre-commit seam, renames, and fsyncs the directory. Rename is the linearization point. Any pre-rename failure preserves prior bytes and removes its temp/lock. Prior validated bytes remain available until directory durability succeeds; if directory fsync fails after rename, the writer restores the prior state through a second same-directory atomic replacement before returning a write error. A failed rollback returns durability-unknown and requires reload, never blind retry. Lock timeout returns busy without mutation.

## File Changes

| File | Action | Description |
|---|---|---|
| `registry/path.mjs` | Create | Injectable XDG path resolver. |
| `registry/store.mjs` | Create | Secure load/save, revision checks, lock, atomic replacement, and errors. |
| `registry/index.mjs` | Create | Narrow exports, matching `main-store/index.mjs`. |
| `test/registry/storage.test.mjs` | Create | Isolated HOME/XDG, permission, validation, CAS, concurrency, and failure proofs. |

## Interfaces / Contracts

```js
resolveProjectRegistryPath({ env = process.env } = {}) -> absolutePath
createProjectRegistryStore({ registryPath, fs, beforeCommit } = {})
  -> Object.freeze({ load(), save({ document, expectedRevision }) })
```

`fs` is a minimal Node-fs facade for deterministic write/fsync/rename failures; production defaults to real fs. Errors: contract errors pass through; `CT_REGISTRY_PATH_INVALID`, `CT_REGISTRY_UNSAFE`, `CT_REGISTRY_READ_FAILED`, `CT_REGISTRY_BUSY`, `CT_CAS_MISMATCH`, `CT_REGISTRY_WRITE_FAILED`, and `CT_REGISTRY_DURABILITY_UNKNOWN` cover boundary failures without leaking document data.

## Testing Strategy

Strict TDD order: RED path/default/absence and unsafe-mode cases; GREEN resolver/load; RED schema/invariant and revision cases; GREEN validation/CAS; RED two-process same-revision race plus injected write/file-fsync/rename/directory-fsync failures; GREEN atomic flow and rollback; REFACTOR. Assert exactly one concurrent winner, unchanged prior bytes after every reported write failure, successful rollback after post-rename failure, and no temp/lock residue. Run `bun test test/registry/storage.test.mjs test/contracts/schema.test.mjs test/main-store.test.mjs`. No E2E layer or runtime DB access.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. The new API has no consumers. Rollback removes only `registry/*.mjs` and its tests; any inert XDG file can be backed up or removed independently. Forecast remains one 250–400-line PR; split before apply if tasks exceed the 400-line authored review budget.

## Open Questions

None.
