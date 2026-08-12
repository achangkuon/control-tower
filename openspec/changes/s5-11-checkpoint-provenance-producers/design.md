# Design: Canonical checkpoint provenance producers

## Decision

S5.11 adds two synchronous, side-effect-free provenance producers around the existing read-only checkpoint observation:

- `workspace/checkpoint.mjs` remains the sole capture producer and returns a complete `checkpoint-capture-v1` artifact.
- `workspace/reconciliation.mjs` becomes the sole reconciliation producer and returns a complete `reconciled-checkpoint-v1` artifact only after accepting the exact live capture producer output and independently supplied reconciliation evidence.

Each artifact has two independent proofs:

1. **Schema and semantic integrity:** closed JSON shape, deterministic identity, deterministic digest, and cross-binding checks. Correctly reconstructed fixtures or manual objects may pass this layer.
2. **Canonical runtime origin:** a language-private producer brand attached by the owning producer before deep freeze. Only the exact live producer object passes this layer; reconstructed, cloned, serialized, proxied, or consumer-built objects do not.

Hashes prove content integrity. The private runtime brand proves live producer origin at direct boundaries. Neither proof substitutes for the other.

The enumerable artifact remains a closed, canonical, immutable JSON contract. The runtime brand is not an enumerable property, is excluded from identity, digest, schema validation, canonicalization, and serialization, and is used only while the exact live object crosses the producer-to-reconciliation boundary and the future direct downstream boundary. Neither producer writes state.

## Authority and constraints

This design follows Session S5.11 in `openspec/plans/plan-5/STATUS.md` and decision 21 in `openspec/plans/decision-register.md`:

- Each producer creates and owns its artifact.
- Main may later compose and transport the exact artifacts, but cannot create, enrich, repair, clone, or re-author them.
- S5.11 does not design Main composition, parking transport, or persistence; those remain S5.12 responsibilities.
- S5.11 does not touch Main, parking, escalation, stores, databases, delivery tokens, or any path outside the declared `Área`.
- The existing two Módulos and six RED/GREEN/REFACTOR Tareas remain the only work hierarchy.

The exact eleven-path `Área` is the original ten paths plus one maintainer-authorized compatibility-test path:

- `workspace/checkpoint.mjs`
- `workspace/reconciliation.mjs`
- `schemas/checkpoint-capture-v1.schema.json`
- `schemas/reconciled-checkpoint-v1.schema.json`
- `contracts/schema-registry.mjs`
- `contracts/validate.mjs`
- `test/workspace/checkpoint.test.mjs`
- `test/workspace/reconciliation.test.mjs`
- `test/contracts/schema.test.mjs`
- `test/fixtures/contracts/schema-cases-v1.json`
- `test/contracts/s3-2-schemas.test.mjs` — migrate only its stale S3.2 `reconciledCheckpoint` fixture to the complete canonical v1 enumerable shape; it remains origin-neutral and does not claim live producer origin.

## Runtime-origin mechanism

### Private class brands with plain-object transport

Each producer module owns an unexported class with an ECMAScript private field. The private field is the runtime-origin brand. The class, its constructor, and the materializer are module-private; only the producer function can construct a branded artifact.

The producer follows this sequence:

1. Build and schema/semantic-validate the complete enumerable contract.
2. Instantiate the module-private branded class from that validated contract.
3. Reset the instance prototype to `Object.prototype` before publication, preserving a plain-object transport surface while retaining the language-private brand.
4. Deep-freeze every enumerable nested value and the branded root.
5. Run the exported canonical-origin assertion and return the same object reference.

ECMAScript private fields are internal slots, not own properties. Resetting the prototype does not remove the private brand. The resulting artifact therefore has:

- `Object.getPrototypeOf(artifact) === Object.prototype`;
- only the declared string fields in `Object.keys`, `Reflect.ownKeys`, property descriptors, JSON, and canonicalization;
- no exported constructor or brand-creation function;
- a private brand that cannot be copied with spread, descriptors, symbols, reflection, or recomputed hashes.

`structuredClone`, JSON round-trip, object spread, manual reconstruction, and a Proxy produce a different object without the private field. They may preserve or recompute every enumerable field correctly, but canonical runtime assertion rejects them.

This is stronger than a module-private non-enumerable `Symbol`: symbols can be discovered and copied through reflection, while a private field cannot. It introduces no persistence, registry, WeakSet, store, token, secret service, writer, alternate ingress, Main behavior, parking behavior, or S5.12 composition.

### Exported assertion seams

`workspace/checkpoint.mjs` exports:

```js
captureCheckpoint(request, dependencies) -> CheckpointCaptureV1
assertCanonicalCheckpointCapture(value) -> value | throws
```

`workspace/reconciliation.mjs` exports:

```js
reconcileCheckpoint({ capture, evidence }) -> ReconciledCheckpointV1
assertCanonicalReconciledCheckpoint(value) -> value | throws
```

The assertion functions expose checking authority only. They do not expose the private class, constructor, private-field syntax context, or materializer, so they cannot create or transfer origin authority.

Each canonical assertion performs checks in this order:

1. Verify the owning module's private brand on the exact supplied object.
2. Verify plain prototype and deep freeze, including nested enumerable values.
3. Run the canonical schema and semantic integrity validator over the enumerable contract.
4. Return the original object reference unchanged.

Origin is checked first. A correctly shaped and correctly rehashed manual object is rejected before it can be accepted as canonical runtime provenance.

`reconcileCheckpoint` starts by calling `assertCanonicalCheckpointCapture(capture)` on the original argument. It never accepts a fixture, a generic validator result, or a reconstructed capture as the canonical basis. The future direct downstream boundary can import both exported assertions to check exact live capture and reconciliation outputs without receiving creation authority; this design does not specify that boundary's composition or parking behavior.

## Producer APIs and ownership

### Capture API

```js
captureCheckpoint(
  {
    project_id,
    assignment_id,
    generation,
    repositoryRoot,
    base,
    result,
    files,
  },
  { git = defaultGit } = {},
) -> CheckpointCaptureV1
```

Input ownership:

| Input | Owner | Producer obligation |
| --- | --- | --- |
| `project_id`, `assignment_id`, `generation` | Invocation context at the constructor-bound external boundary | Validate as canonical contract values and bind them into identity and digest. They are context, never caller-selected output fields. |
| `repositoryRoot` | Capture request | Resolve and compare it with Git's canonical top level. |
| `base`, `result` | Capture request | Resolve full commit and tree OIDs and reject any mismatch. |
| `files` | Capture request | Compare exact bytes and modes with the staged index; sort by canonical path. |
| `git` | Test/dependency seam | Read-only Git adapter; never part of artifact identity. |

The request is a closed object. `schema`, `schema_version`, `checkpoint_id`, `digest`, `repository_root`, `git_common_dir`, any origin assertion, or any prebuilt artifact/provenance member in the request is rejected with `CT_CHECKPOINT_UNSAFE`; the producer does not merge caller output claims.

Capture owns the derived repository fields, all emitted base/result/file observations, schema/version, `checkpoint_id`, digest, and private runtime brand. The returned contract is the direct branded result, not a caller-owned wrapper.

### Reconciliation API

```js
reconcileCheckpoint({ capture, evidence }) -> ReconciledCheckpointV1
```

`capture` must pass `assertCanonicalCheckpointCapture` before reconciliation processes evidence. Generic `validate("checkpointCapture", capture)` alone is insufficient because it proves only enumerable schema and semantic integrity.

`evidence` is a closed reconciliation input with this exact shape:

```js
{
  project_id,
  assignment_id,
  generation,
  repository_root,
  git_common_dir,
  base: { commit, tree },
  result: { commit, tree },
  manifest_ref,
  candidate_ref,
  ledger_digest,
  runtime_projection_revision,
  host_epoch,
  jornada_id,
  jornada_revision,
  registry_revision,
  capability_revision,
}
```

The producer rejects `state`, schema/version, identity, digest, capture linkage, origin claims, or a prebuilt reconciled artifact in `evidence`. It compares every duplicated checkpoint binding against the validated live capture using exact scalar equality and canonical equality for `base` and `result`. It copies checkpoint bindings from the capture, never from evidence, and creates the reconciliation artifact. `state` is never an input: successful construction emits `VALID`; every other result throws and emits no artifact.

Reconciliation owns schema/version, `reconciliation_id`, digest, `VALID`, capture linkage, copied checkpoint bindings, and its own private runtime brand. Its exported assertion lets the future direct downstream boundary prove origin on the exact live object without exposing construction.

## Canonical enumerable contracts

All objects and nested objects use `additionalProperties: false`. No extension field is permitted. The private runtime brands do not appear in either schema because they are not enumerable properties and are not serialized contract data.

### `checkpoint-capture-v1`

Exact top-level enumerable field set:

```js
{
  schema: "checkpoint-capture",
  schema_version: 1,
  checkpoint_id,
  digest,
  project_id,
  assignment_id,
  generation,
  repository_root,
  git_common_dir,
  base: { commit, tree },
  result: { commit, tree },
  files: [
    { path, mode, git_mode, digest },
  ],
}
```

Rules:

- `checkpoint_id` is `checkpoint-` plus 64 lowercase hexadecimal characters.
- `digest` uses the existing `sha256:<64 lowercase hexadecimal>` contract.
- `project_id` and `assignment_id` use the canonical slug definition; `generation` is an integer greater than or equal to zero.
- `repository_root` and `git_common_dir` are normalized absolute paths derived by capture.
- `base.commit`, `base.tree`, `result.commit`, and `result.tree` are full lowercase Git OIDs accepted by the existing 40-to-64-character repository check and verified against Git.
- `files` is non-empty, sorted by `path`, and path-unique. Each entry retains the current `path`, `mode`, `git_mode`, and content `digest` semantics.
- The artifact digest binds every enumerable authority-bearing field. The private runtime brand is deliberately excluded.

### `reconciled-checkpoint-v1`

Exact top-level enumerable field set:

```js
{
  schema: "reconciled-checkpoint",
  schema_version: 1,
  reconciliation_id,
  digest,
  state: "VALID",
  capture: {
    checkpoint_id,
    digest,
  },
  project_id,
  assignment_id,
  generation,
  repository_root,
  git_common_dir,
  base: { commit, tree },
  result: { commit, tree },
  evidence: {
    manifest_ref,
    candidate_ref,
    ledger_digest,
    runtime_projection_revision,
    host_epoch,
    jornada_id,
    jornada_revision,
    registry_revision,
    capability_revision,
  },
}
```

Rules:

- `reconciliation_id` is `reconciliation-` plus 64 lowercase hexadecimal characters.
- `capture.checkpoint_id` and `capture.digest` copy the exact integrity-validated live capture identity and digest.
- Project, assignment, generation, repository, base, and result copy the exact capture bindings after evidence equality checks.
- `state` has the single schema value `VALID`; `INVALID` is not a canonical artifact state.
- Reconciliation identity and digest bind every enumerable checkpoint and evidence field. Its private runtime brand is deliberately excluded.

The previous schema-only reconciliation fixture is intentionally incompatible until migrated to this complete shape. A fixture may prove schema and semantic integrity but can never pass `assertCanonicalReconciledCheckpoint`.

## Deterministic identity, digest, and tamper verification

Both contracts use `digestArtifact(..., "rfc8785-jcs")`. Domain separation is represented inside the canonical hashed value; no secret, signature, token, database, or second store is introduced.

Capture derivation:

```text
capture_content = enumerable artifact without checkpoint_id and digest
checkpoint_id_hash = H(JCS({
  domain: "control-tower/checkpoint-capture/identity/v1",
  content: capture_content
}))
checkpoint_id = "checkpoint-" + hex(checkpoint_id_hash)

digest = H(JCS({
  domain: "control-tower/checkpoint-capture/artifact/v1",
  artifact: capture_content + checkpoint_id
}))
```

Reconciliation derivation:

```text
reconciliation_content = enumerable artifact without reconciliation_id and digest
reconciliation_id_hash = H(JCS({
  domain: "control-tower/reconciled-checkpoint/identity/v1",
  content: reconciliation_content
}))
reconciliation_id = "reconciliation-" + hex(reconciliation_id_hash)

digest = H(JCS({
  domain: "control-tower/reconciled-checkpoint/artifact/v1",
  artifact: reconciliation_content + reconciliation_id
}))
```

`H` is the SHA-256 operation already used by `digestArtifact`; the `sha256:` prefix is removed only when embedding the hexadecimal identity suffix. Domain separation prevents cross-contract identity collision for structurally equal content.

Schema and semantic integrity verification is fail-closed:

1. JSON Schema validates the closed enumerable shape and primitive constraints.
2. Semantic validation recomputes identity from all enumerable content except identity/digest.
3. Semantic validation recomputes digest from the resulting identity plus all enumerable content.
4. Pair validation compares reconciliation capture linkage and every direct checkpoint binding with capture.
5. Any mismatch returns `CT_SCHEMA_INVALID`; no producer repairs or replaces the value.

Canonical runtime provenance acceptance adds a prior check:

1. The owning producer assertion verifies the exact object's private brand.
2. Only then does schema and semantic integrity validation run.
3. A missing brand returns `CT_PROVENANCE_ORIGIN_INVALID`, even when hashes are correct.

Public deterministic hashes prove content integrity and drift. They do not prove producer origin. The language-private brand proves live producer origin and is intentionally not part of persistent or serializable identity.

## Validation layers and canonical path

`contracts/schema-registry.mjs` registers exactly the two provenance schema names:

```js
checkpointCapture: "checkpoint-capture-v1.schema.json"
reconciledCheckpoint: "reconciled-checkpoint-v1.schema.json"
```

`contracts/validate.mjs` owns shared pure derivation and semantic checks:

```js
checkpointCaptureIdentity(value)
checkpointCaptureDigest(value)
reconciledCheckpointIdentity(value)
reconciledCheckpointDigest(value)
validateCheckpointProvenancePair(capture, reconciliation)
```

The `checkpointCapture` and `reconciledCheckpoint` invariant entries call those same functions after AJV validation. Producers import them; they do not define duplicate field lists or hash algorithms. Contract tests and fixtures call `validate`; no test-local AJV instance or alternate schema loader is added.

This generic contract path is intentionally origin-neutral:

- `validate("checkpointCapture", manualValue)` may pass when shape, identity, and digest are correct.
- `validate("reconciledCheckpoint", manualValue)` may pass under the same condition.
- `validateCheckpointProvenancePair(manualCapture, manualReconciliation)` may pass when all enumerable bindings agree.
- None of those results are canonical runtime provenance.
- Only `assertCanonicalCheckpointCapture` and `assertCanonicalReconciledCheckpoint` accept live producer origin.

The existing `validate` clone behavior remains suitable for untrusted structured input and fixtures. Because cloning strips private fields, producer assertions always check origin on the original object before invoking generic validation and always return the original unchanged object rather than the validator's clone.

`contracts/validate.mjs` never imports workspace producer modules. Origin checks remain producer-owned, preventing a dependency cycle and preventing the generic schema path from manufacturing runtime provenance.

## Data flow

```text
capture request
  -> read-only Git observation and staged-byte verification
  -> canonical enumerable capture content
  -> derive identity/digest
  -> schema + semantic integrity validation
  -> module-private capture brand
  -> plain prototype
  -> deep freeze
  -> assertCanonicalCheckpointCapture(original)
  -> exact live checkpoint-capture-v1

exact live capture + reconciliation evidence
  -> assert capture private origin FIRST
  -> schema + semantic integrity validation of enumerable capture
  -> compare project/assignment/generation
  -> compare repository_root/git_common_dir
  -> compare base and result commit/tree identities
  -> validate required reconciliation evidence
  -> build VALID reconciliation from capture-owned bindings
  -> derive identity/digest
  -> schema + semantic and pair-integrity validation
  -> module-private reconciliation brand
  -> plain prototype
  -> deep freeze
  -> assertCanonicalReconciledCheckpoint(original)
  -> exact live reconciled-checkpoint-v1

[future direct downstream boundary, assertion seam only]
  -> can assert both exact live producer objects without construction authority
```

Direct unchanged transport means the same branded, deeply frozen object reference crosses each live boundary. Cloning, serialization, normalization, enrichment, wrapping, or reconstruction deliberately removes canonical runtime-origin acceptance. S5.11 defines no Main composition, parking call, persistence, cache, callback ingress, fallback constructor, or alternate path.

## Existing capture compatibility

Compatibility is additive around current observation semantics:

- The exported name remains `captureCheckpoint` and execution remains synchronous.
- Existing `repositoryRoot`, `base`, `result`, and `files` request members keep their exact meaning.
- Existing output members `repository_root`, `base`, `result`, `files`, and `digest` remain directly available. `digest` becomes the canonical artifact digest and intentionally changes because it binds added authority context.
- Existing read-only Git checks, evidence ordering, byte/mode validation, and `CT_CHECKPOINT_UNSAFE` failures remain.
- Public output still behaves as a deeply frozen plain object and serializes only the closed JSON contract.
- The request gains required `project_id`, `assignment_id`, and `generation` context. Current repository evidence shows no production call site outside producer tests, so migration stays in the approved test path.

No legacy overload may emit provenance-incomplete output. Silent defaults for project, assignment, or generation would recreate caller synthesis and are rejected.

## File changes

| Path | Design change |
| --- | --- |
| `workspace/checkpoint.mjs` | Close the request, preserve Git observation, build/validate the exact capture contract, apply the private capture brand before deep freeze, export `assertCanonicalCheckpointCapture`, and return the same branded plain object. |
| `workspace/reconciliation.mjs` | Add the runtime producer; require capture origin before generic validation; compare closed evidence; construct, privately brand, freeze, and assert the exact reconciliation output; export `assertCanonicalReconciledCheckpoint`. |
| `schemas/checkpoint-capture-v1.schema.json` | Add the closed enumerable capture contract and nested Git/file definitions; no runtime-origin field. |
| `schemas/reconciled-checkpoint-v1.schema.json` | Replace the legacy schema-only shape with the complete enumerable reconciliation contract and `VALID`-only state; no runtime-origin field. |
| `contracts/schema-registry.mjs` | Register `checkpointCapture`; retain `reconciledCheckpoint` as the single registration for its replaced schema. |
| `contracts/validate.mjs` | Add shared domain-separated derivation, capture/reconciliation semantic invariants, and exact pair-integrity validation while remaining origin-neutral. |
| `test/workspace/checkpoint.test.mjs` | Preserve behavior tests and add producer-origin assertion, private-brand invisibility, clone/manual rejection, determinism, drift, request closure, and tamper coverage. |
| `test/workspace/reconciliation.test.mjs` | Add capture-origin rejection before reconciliation, producer acceptance, reconciliation-origin assertion, clone/manual rejection, evidence mismatch, `VALID`-only, immutability, and no-synthesis coverage. |
| `test/contracts/schema.test.mjs` | Prove both registrations, closed schemas, semantic identity/digest and pair checks, and the deliberate distinction between generic integrity validation and runtime origin. |
| `test/fixtures/contracts/schema-cases-v1.json` | Add one integrity-valid capture and replace reconciliation fixture with matching integrity-valid enumerable data; fixtures remain incapable of runtime-origin acceptance. |
| `test/contracts/s3-2-schemas.test.mjs` | Migrate only the stale S3.2 `reconciledCheckpoint` fixture to the complete canonical v1 enumerable shape by reusing exported canonical derivation helpers and generic validation; do not claim live producer origin. |

No other path changes.

## Strict TDD seams and test matrix

Strict TDD is active (`sdd-init/control-tower`, Engram observation 6158; Bun 1.3.14). Implementation follows the existing two Módulos and six Tareas without adding another hierarchy.

| Existing Tarea | RED/GREEN/REFACTOR seam | Required proof |
| --- | --- | --- |
| `T5.11.1.1` | RED in `checkpoint.test.mjs` and `schema.test.mjs` | Current output lacks schema, stable identity, project, assignment, generation, and runtime-origin assertion; a manually completed object is not distinguished. |
| `T5.11.1.2` | GREEN in capture producer/schema | Exact canonical output, private origin applied before deep freeze, plain enumerable JSON surface, deterministic repeat, producer-derived repository fields, and unchanged Git observation behavior. |
| `T5.11.1.3` | REFACTOR in registry/validate/contracts tests | One integrity derivation path; each binding drift fails; generic integrity validation remains fixture-capable while runtime origin rejects manual and cloned values. |
| `T5.11.2.1` | RED in `reconciliation.test.mjs` | Schema-valid reconciliation exists without runtime producer/origin; reconciliation currently cannot reject a correctly rehashed non-producer capture. |
| `T5.11.2.2` | GREEN in reconciliation producer/schema | Exact live capture plus valid evidence emits one branded, frozen `VALID` artifact; missing capture origin, evidence, or matching binding emits nothing. |
| `T5.11.2.3` | REFACTOR in validate/contracts/workspace tests | Shared integrity derivation and pair check; both exported origin assertions reject manual/clone values; no consumer constructor or S5.12 composition is added. |

Required focused matrix:

- **Capture producer acceptance:** `captureCheckpoint` output passes `assertCanonicalCheckpointCapture` and is accepted unchanged by `reconcileCheckpoint`.
- **Correctly rehashed manual capture rejection:** reconstruct every enumerable capture field, recompute valid `checkpoint_id` and digest through shared derivation, prove generic `validate` passes, then prove `assertCanonicalCheckpointCapture` and `reconcileCheckpoint` fail with `CT_PROVENANCE_ORIGIN_INVALID`.
- **Capture clone rejection:** `structuredClone(capture)` preserves enumerable values and passes generic integrity validation but fails runtime-origin assertion and reconciliation.
- **Capture brand invisibility:** no extra key appears in `Object.keys`, `Reflect.ownKeys`, symbol enumeration, descriptors, JSON, or JCS input; copying all discoverable properties does not transfer origin.
- **Reconciliation producer acceptance:** `reconcileCheckpoint` output passes `assertCanonicalReconciledCheckpoint` as the same object reference.
- **Correctly rehashed manual reconciliation rejection:** reconstruct and correctly derive all enumerable fields, prove generic reconciliation and pair validation pass, then prove runtime-origin assertion fails with `CT_PROVENANCE_ORIGIN_INVALID`.
- **Reconciliation clone rejection:** `structuredClone(reconciliation)` passes generic integrity validation but fails `assertCanonicalReconciledCheckpoint`.
- **Direct unchanged transport:** original branded artifacts retain private origin and deep freeze; spread, JSON round-trip, clone, Proxy, or reconstructed wrappers are rejected.
- **Determinism:** repeated equivalent producer invocations have equal enumerable identity/digest while remaining distinct correctly branded live outputs.
- **Capture drift:** independently change project, assignment, generation, repository root/common dir, base commit/tree, result commit/tree, file path/mode/git mode/content digest.
- **Capture tamper:** identity only, digest only, nested binding, file order, duplicate path.
- **Reconciliation basis:** missing/extra/wrong-typed evidence and mismatched project/assignment/generation/repository/base/result.
- **Reconciliation tamper:** identity, digest, state, capture identity/digest, checkpoint binding, or evidence field.
- **Pair integrity:** integrity-valid artifacts from different checkpoints fail the pure pair check.
- **Ownership:** request/evidence-supplied identity, digest, state, artifact, origin claim, or assertion function is rejected; no merge or repair occurs.
- **Compatibility:** current Git safety, byte equality, path safety, no-ref-mutation, plain-object serialization, and deep-freeze tests continue.
- **Scope witnesses:** no Main/store/parking/database/token calls, imports, writes, or S5.12 composition are introduced.

Commands for apply/verify, after source-mutating work is complete:

```bash
bun test test/workspace/checkpoint.test.mjs
bun test test/workspace/reconciliation.test.mjs
bun test test/contracts/schema.test.mjs test/contracts/s3-2-schemas.test.mjs
bun test test/workspace test/contracts
bun test
```

## Failure modes

| Failure | Result |
| --- | --- |
| Unsafe root/path, unresolved Git identity, staged drift, byte/mode mismatch, incomplete capture context, or request output assertion | `CT_CHECKPOINT_UNSAFE`; no artifact. |
| Manual, cloned, serialized, proxied, wrapped, or otherwise non-producer capture offered to canonical runtime acceptance or reconciliation | `CT_PROVENANCE_ORIGIN_INVALID` before evidence processing; no reconciliation artifact. |
| Manual, cloned, serialized, proxied, wrapped, or otherwise non-producer reconciliation offered to the direct downstream assertion | `CT_PROVENANCE_ORIGIN_INVALID`; rejected. |
| Capture or reconciliation schema, identity, digest, or enumerable binding tamper | `CT_SCHEMA_INVALID`; no repair or replacement. |
| Missing/malformed reconciliation evidence | `CT_SCHEMA_INVALID`; no reconciliation artifact. |
| Evidence differs from capture on any checkpoint binding | `CT_SCHEMA_INVALID`; no reconciliation artifact. |
| Reconciliation state supplied or not derivable as `VALID` | Rejected; no canonical artifact. |
| Capture/reconciliation pair mismatch | `CT_SCHEMA_INVALID`; pair rejected. |
| Integrity-valid fixture/manual value offered as runtime provenance | Generic integrity validation may pass; producer-origin assertion fails closed. |
| Git/validation dependency throws | Failure propagates through the fail-closed boundary; no partial output or state change. |

## Rollout and rollback boundary

S5.11 has no persistent rollout. The two producers, two schemas, registry/semantic validation changes, fixtures, and tests form one contract boundary and must be integrated or reverted together.

Rollback is one code revert across the eleven approved paths. It requires no migration, data repair, Main-store action, parking cleanup, database operation, or token invalidation. Partial rollback is forbidden because it could leave a registered schema without a producer, an origin assertion without its producer, or a producer without canonical integrity validation. Rollback must not introduce caller assertions, consumer synthesis, alternate ingress, shadow store, or a second writer.

## Design risks

- **Private brand is live-boundary evidence only:** cloning, serialization, persistence, or crossing a JS realm/module instance removes the proof by design. Decision 21 requires direct unchanged transport between constructor-bound capabilities; S5.11 does not add a cross-process trust mechanism.
- **Integrity is not origin:** public hashes remain reproducible and cannot establish producer execution. Tests must never treat successful generic validation as runtime provenance acceptance.
- **Origin is not content integrity:** a private brand alone does not excuse schema, semantic, digest, or pair checks. Canonical assertions require both layers.
- **Prototype neutrality:** private branded classes must reset to `Object.prototype` before freeze so existing plain-object serialization and contract behavior remain. Tests lock this invariant.
- **Validator cloning:** generic `validate` strips private fields by design. Producers and boundary assertions must check origin on the original object first and must not replace it with the validator clone.
- **Version-1 reconciliation replacement:** the old fixture changes incompatibly. Preserving it as runtime evidence would preserve the defect S5.11 exists to remove.
- **Repository identity scope:** local canonical root/common-directory paths bind the exact observed workspace. Stable project identity is separately bound by `project_id`; no remote-selection behavior is added.
- **Dependency direction:** contracts remain origin-neutral and never import workspace producers; workspace producers import canonical contract logic, preventing cycles and keeping creation authority in the owning modules.
