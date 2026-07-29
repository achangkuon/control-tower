# Design: SDD Tower V1 Contract Schemas

## Technical Approach

Build an ESM contract layer beside `core.mjs`: ten schemas, duplicate-safe parsing, RFC 8785 digests, ArtifactRef/idempotency proof, and a Main store. Change A wires no adapter, leaves Tower OFF, and performs no Change B registry lookup, alias resolution, enrollment, or identity/Main selection; it only accepts an already-selected trusted binding. The legacy P7/P8 changes remain independent until Change E.

## Architecture Decisions

| Choice | Alternative / tradeoff | Rationale |
|---|---|---|
| Ajv 2020 plus `yaml.parseDocument` | Hand validators; two dependencies | Strict, non-mutating diagnostics avoid incomplete validation. |
| Duplicate-name token/AST preflight before normal parsing | `JSON.parse`; overwrites duplicates | Reject top-level, nested, and decoded-equivalent (`"a"`/`"\u0061"`) names before conversion. Ordinary `JSON.parse` is forbidden on untrusted bytes. |
| Dedicated RFC 8785 implementation | Existing `core.mjs` `jcs`; incomplete | Reject non-JSON/unsafe/non-finite/invalid-Unicode values; order UTF-16 keys and hash UTF-8 bytes. |
| Immutable Git reads with fixed argv | Working tree; ambiguous | Bound repository plus `ls-tree -z`/`cat-file blob` proves bytes without execution. |
| Immutable records plus CAS projections | Mutable records; less evidence | Preserve terminal authorization/history and failed-write safety. |

## Authority and Role Contract

The Main server composition root supplies a startup-only `trustedBindingProvider`, matching existing `trustedMetadata`/`processIdentity`; requests and role claims cannot supply it. Its snapshot binds project/revision, root/common-dir, remote, branch, Main session, store path, and epoch. `authority.mjs` rederives facts, then mints a non-serializable, module-private `WeakSet`-branded capability; closure-bound mutators reject lookalikes. Cwd, UID, ownership, and root discovery are checks, not authorization: workers, Hermes, Support, Main, and any worktree can share/discover them; none proves the selected active Main binding.

| Actor | Allowed | Enforced denial |
|---|---|---|
| Maintainer | Final approval/revocation represented by exact validated authorization | No direct store mutation; Main records/consumes it |
| Hermes | Present intent/status | No capability, routing, assignment, or write |
| Main | Validate, route, persist, authorize, deliver with bound capability | Project/revision/epoch mismatch fails closed |
| Support | Advisory reads | No write, lock, delivery, or activation |
| Policy | Produce validated Policy Report | Main alone persists/routes it |
| Planning | Produce through `tasks` | No Main-store mutation |
| Implementation | Reconcile, apply, produce Delta/evidence | No routing/delivery authority |
| Workspace Manager / Host Launcher | Execute explicit mechanism requests | No semantic or store authority |
| Tower | Opaque refs/digests/mechanical status only | No product parser or semantic branch |
| Foreign campaign leader | Submit to destination Main | Cannot mutate/assign/merge another project |

## Data Flow

```text
bytes → duplicate-safe parse → schema/invariants → canonical/raw digest
ArtifactRef → bound Git root → commit/blob proof → evidence
trusted provider → branded Main capability → atomic record/CAS → opaque ref
```

## File Changes

All 29 files are creations.

| Files | Responsibility |
|---|---|
| `package.json`, `bun.lock`; `schemas/{project-registry,artifact-ref,plan-catalog,plan-manifest,binding-delta,policy-report,jornada,assignment,authorization,campaign}-v1.schema.json` | Dependencies and closed schemas |
| `contracts/{errors,canonicalize,schema-registry,validate,artifact-ref,idempotency,index}.mjs` | Parsing, validation, digest, refs, retry API |
| `main-store/{authority,store,index}.mjs` | Capability gate and atomic owner-only store |
| `test/contracts/{schema,canonicalization,artifact-ref,idempotency}.test.mjs`, `test/main-store.test.mjs`, `test/fixtures/contracts/{canonicalization-v1,schema-cases-v1}.json` | RED, golden, integration evidence |

## Interfaces and Testing

Pure APIs remain `parseStructured`, `canonicalize`, `digestArtifact`, `validate`, `verifyArtifactRef`, and `deriveIdempotencyIdentity`; results are frozen with stable `CT_*` errors. Idempotency is `ctv1:<sha256(JCS(input))>`: same input returns evidence, changed input conflicts, and unknown effects require inspection. Store paths reject escape/symlink/non-owner components and credentials; writes use `0700`/`0600`, `O_EXCL|O_NOFOLLOW`, fsync, and atomic link/rename.

Strict-TDD Sesiones: **S2.1 schemas (17 files)** writes unknown-field, forbidden-YAML, and duplicate-JSON RED fixtures/tests before validators; **S2.2 canonicalization/ArtifactRef (8)** writes JCS, Git-mismatch, and idempotency RED tests first; **S2.3 Main store (4)** writes authority/atomicity RED tests first. Chain S2.1 → S2.2 → S2.3; each is forecastable and rollbackable.

Main-store RED cases reject forged capability, worker cwd, Hermes, Support, and campaign leader A mutating project B. Opacity uses paired semantically different (`READY`/`BLOCKED`) Policy Reports and asserts identical mechanical treatment apart from opaque ref/digest values. A recursive static ESM-import test proves Tower entry points do not import `contracts`, schemas, `yaml`, OpenSpec, plan, or Policy parsers. E2E is N/A: no adapter wiring.

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and RED proof |
|---|---|---|
| Documentation-like paths | Applicable | Validated media/mode; never execute. Test `requirements.txt`, `CMakeLists.txt`, executable MD/MDX, `README.sh`. |
| Git repository selection | Applicable | Only bound root reaches fixed argv; test `git -C`, relative escape, foreign absolute root rejection. |
| Commit state | N/A: immutable commit objects | Index/worktree state is not read. |
| Push state | N/A: no push | No destination resolution. |
| PR commands | N/A: no PR operation | No command composition. |

## Migration / Rollout

Additive and disconnected: land S2.1–S2.3, lazily create the XDG store, then let B–I adopt exports. No Tower DB/data migration or legacy P7/P8 dependency. Rollback removes the unpublished Sesión. Open questions: none.
