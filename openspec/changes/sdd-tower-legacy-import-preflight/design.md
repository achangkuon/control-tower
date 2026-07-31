# Design: Legacy Import Preflight

## Technical Approach

Add synchronous private module `registry/legacy-import.mjs`. It processes a collection of exact legacy hints, obtains every canonical fact from injected derivation, validates each complete entry through the existing project-registry v1 contract, emits its existing JCS canonicalization, and optionally compares with a read-only registry load. It imports no store, filesystem, core, Main, runtime, Git, DB, CLI, Hermes, layout, Support, or P8 module and is not exported by `registry/index.mjs`.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Merge hint fields | Convenient but grants legacy authority | Never merge. Only verified `deriveFacts()` output populates an entry. |
| Add path/URL checks | Would fork the registry contract | Use only existing lexical/path schema behavior. Add no filesystem verification, source-path, or credential-URL parsing policy. |
| Pass the store | Exposes writes | Accept only optional `{ load() }`; no writable dependency or registry resolution. |
| Return source exceptions | Leaks secrets and unstable text | Map outcomes to the closed code vocabulary and discard messages, causes, diagnostics, raw hints, and values. |

## Data Flow

```text
records -> shape gate -> stable same-id gate -> deriveFacts(frozen hint, index)
        -> validate project-registry wrapper -> canonicalize validated entry
        -> optional load/validate -> same-class comparisons -> frozen result
```

Items remain in input order. For a repeated exact legacy `id`, the first item continues normally and each later item receives `DUPLICATE_ID`. Comparison is exact and only `project_id↔project_id`, alias↔alias, `canonical_root↔canonical_root`, `git_common_dir↔git_common_dir`, and `main_store_path↔main_store_path`; no cross-class inference occurs.

## File Changes

| File | Action | Description |
|---|---|---|
| `registry/legacy-import.mjs` | Create | Private preflight, canonical builder, redaction, and read-only comparison. |
| `test/registry/legacy-import.test.mjs` | Create | Strict-TDD contract, secrecy, conflict, and no-write proofs. |

No existing file or public export changes.

## Interfaces / Contracts

```js
preflightLegacyImport(records, { deriveFacts, registryReader? })
deriveFacts(hint, { index }) ->
  { status: "verified", entry: ProjectRegistryEntry } |
  { status: "incomplete", missing: CanonicalField[], unverifiable: CanonicalField[] } |
  { status: "invalid" }

result = {
  ok: boolean,
  items: [{ index, status: "ready"|"rejected"|"conflict",
    candidate: ProjectRegistryEntry|null, canonical: string|null }],
  issues: [{ code, index: number|null, field: SafeField|null, kind: SafeKind }],
  registry: { status: "not-requested"|"empty"|"loaded"|"failed"|"invalid",
    revision: number|null },
  evidence: { authoritative_writes: 0, registry_operation: "none"|"load" }
}
```

`records` must be an array; otherwise `INVALID_REQUEST` is terminal with no items. Records must be plain objects with exactly string `id,name,root,kind`; failures receive `MALFORMED_RECORD`. Invalid/malformed derivation output maps to `DERIVATION_INVALID`, throws to `DERIVATION_FAILED`, declared missing/unverifiable fields to `INCOMPLETE_FACTS`, and validation/canonicalization failure to `CONTRACT_REJECTED`. A `null` load is `empty`; a throw gives `REGISTRY_READ_FAILED`/`failed`; non-null data failing `validate("projectRegistry", ...)` gives `REGISTRY_INVALID`/`invalid`.

The exact remaining codes are `DUPLICATE_ID`, `PROJECT_ID_CONFLICT`, `ALIAS_CONFLICT`, `CANONICAL_ROOT_CONFLICT`, `GIT_COMMON_DIR_CONFLICT`, and `MAIN_STORE_PATH_CONFLICT`. No other issue code is legal. `SafeField` is only `records`, `record`, `project_id`, `aliases`, `canonical_root`, `git_common_dir`, `expected_remote`, `main_branch`, `main_session`, `manifest_path`, `roadmap_path`, `main_store_path`, `allowed_hosts`, `registry_entry_revision`, `extensions`, or `null`. `SafeKind` is only `request`, `record`, `duplicate`, `derivation`, `missing`, `unverifiable`, `contract`, `registry`, or `conflict`; metadata contains no observed values.

Issue mapping is fixed: request uses `(null,records,request)`; malformed and duplicate use `(index,record,record|duplicate)`; derivation and contract use `(index,null,derivation|contract)`; incomplete facts use `(index,canonical-field,missing|unverifiable)`; registry state uses `(null,null,registry)`; conflicts use `(index,conflict-field,conflict)`. Issue order is request; malformed records; duplicates; derivation invalid/failed; incomplete facts; contract; registry failed/invalid; then conflicts in the five field classes above. Within a class use input index; incomplete fields use schema order with missing before unverifiable. `ok` is true only when every item is ready and requested registry comparison is empty or loaded. Failed/invalid comparison rejects otherwise eligible items. Ready items alone expose the complete validated entry and canonical string; rejected/conflict items expose neither.

## Testing Strategy

Strict TDD runs all RED cases before production code:

| Layer | RED cases | Approach |
|---|---|---|
| Unit | Every code/mapping above; first-wins duplicate order; malformed request/record; derivation states; contract reuse; lexical-only paths; frozen reproducibility; secret-bearing hints/exceptions absent; ready entry complete | `bun test test/registry/legacy-import.test.mjs` |
| Integration | no reader, empty, valid, thrown, invalid; five positive same-class conflicts plus negative cross-class cases; load-only call log; write trap untouched; registry bytes/stat unchanged | Focused command, then `bun test` |
| E2E | N/A—no public/runtime boundary | No harness. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required; DB mode `none`. Rollback removes only the two additive files. No bootstrap, enrollment, conflict/project resolution, Main rederivation, registry/runtime/DB/`ACTIVE` write, or P8 work exists. Forecast remains 220–320 authored lines.

## Open Questions

None.
