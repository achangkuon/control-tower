# Tasks: SDD Tower V1 Contract Schemas

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,000–1,400 authored additions/deletions across 29 files |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | S2.1 → S2.2 → S2.3 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Sesiones

| Sesión | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| S2.1 (17 files) | Ten-schema foundation and duplicate-safe validation | PR 1 | `bun test test/contracts/schema.test.mjs` | N/A — no adapter; Bun tests are the harness | Revert S2.1 paths only |
| S2.2 (8 files) | JCS, ArtifactRef proof, and idempotent retries | PR 2 | `bun test test/contracts/canonicalization.test.mjs test/contracts/artifact-ref.test.mjs test/contracts/idempotency.test.mjs` | N/A — no runtime activation | Revert S2.2 paths only |
| S2.3 (4 files) | Main authority-gated store and opacity proof | PR 3 | `bun test test/main-store.test.mjs` | N/A — Tower remains OFF | Revert S2.3 paths only |

## Sesión 2.1 — Schema Foundation (17 files)

### Módulo 2.1.1 — Schemas and duplicate-safe validation

- [x] Tarea 2.1.1.1 RED: Create `test/contracts/schema.test.mjs` and `test/fixtures/contracts/schema-cases-v1.json`; unknown fields, forbidden YAML, top-level/nested duplicates, and decoded-equivalent keys (`"a"`/`"\u0061"`) must fail `CT_SCHEMA_INVALID` with no effect. Run `bun test test/contracts/schema.test.mjs` (expected RED).
- [x] Tarea 2.1.1.2 GREEN: Create `package.json`, `bun.lock`, `schemas/{project-registry,artifact-ref,plan-catalog,plan-manifest,binding-delta,policy-report,jornada,assignment,authorization,campaign}-v1.schema.json`, `contracts/{errors,schema-registry,validate}.mjs`; make T2.1.1.1 pass with frozen diagnostics/extensions. Run `bun test test/contracts/schema.test.mjs`.
- [x] Tarea 2.1.1.3 REFACTOR/triangulate S2.1: exercise headers, catalog/DAG resolution, manifest state exclusion, immutable delta links, and `CT_MANIFEST_INVALID`. Run `bun test test/contracts/schema.test.mjs`.

## Sesión 2.2 — Canonicalization and ArtifactRefs (8 files)

### Módulo 2.2.1 — Canonicalization and immutable refs

- [x] Tarea 2.2.1.1 RED: Create `test/contracts/{canonicalization,artifact-ref,idempotency}.test.mjs` and `test/fixtures/contracts/canonicalization-v1.json`; cover JCS/forbidden YAML, stale/mismatched refs, traversal/symlink/root escape, `requirements.txt`, `CMakeLists.txt`, executable MD/MDX, `README.sh`, fixed `git -C`, relative escape, foreign root rejection, and timeout/unknown-effect inspection. Run `bun test test/contracts/canonicalization.test.mjs test/contracts/artifact-ref.test.mjs test/contracts/idempotency.test.mjs` (expected RED).
- [x] Tarea 2.2.1.2 GREEN: Create `contracts/{canonicalize,artifact-ref,idempotency,index}.mjs`; prove UTF-16 JCS, opaque bytes, commit/blob binding, `CT_ARTIFACT_REF_INVALID`, `CT_IDEMPOTENCY_CONFLICT`, and no replay. Run `bun test test/contracts/canonicalization.test.mjs test/contracts/artifact-ref.test.mjs test/contracts/idempotency.test.mjs`.
- [x] Tarea 2.2.1.3 REFACTOR/triangulate S2.2: reject unsafe/non-finite/invalid-Unicode and cyclic values, require exact byte inputs, exclude self-reference, deeply freeze parsed results, and retain path guarantees. Correction RED: 3 pass/2 fail; GREEN: 5 pass/0 fail; focused contracts: 14 pass/0 fail.

## Sesión 2.3 — Main Store and Boundaries (4 files)

### Módulo 2.3.1 — Main authority and atomic store

- [x] Tarea 2.3.1.1 RED: Create `test/main-store.test.mjs`; forged capability, worker cwd, Hermes, Support, and foreign-campaign mutations must deny; permissions/credentials and failed writes preserve records; READY/BLOCKED reports stay mechanically identical; recursive imports exclude Tower→contracts/schema/YAML/OpenSpec/plan/Policy. Run `bun test test/main-store.test.mjs` (expected RED).
- [x] Tarea 2.3.1.2 GREEN: Create `main-store/{authority,store,index}.mjs`; implement startup-only trusted binding, WeakSet capability, owner-only `0700`/`0600` atomic CAS, terminal authorizations, and audit evidence. Run `bun test test/main-store.test.mjs`.
- [x] Tarea 2.3.1.3 REFACTOR/triangulate S2.3: verify Maintainer/Hermes/Main/Support/Policy/Planning/Implementation/Workspace Manager/Host Launcher/Tower/foreign-leader roles, the Change A/B boundary (no registry lookup, alias resolution, enrollment, identity/Main selection), Tower OFF, and no legacy P7/P8 dependency. Run `bun test test/main-store.test.mjs`.

Scoped remediation completed for T2.3.1.1–T2.3.1.3: deterministic RED probes now cover concurrent CAS exclusion, failure-atomic terminal authorization/audit evidence, and exact trusted `store_path`; focused and broader suites are GREEN without new paths.

Final S2.3 correction completed: authority-instance capability isolation now rejects A→B token confusion while retaining A→A acceptance, explicit revocation, and forged-capability denial.
