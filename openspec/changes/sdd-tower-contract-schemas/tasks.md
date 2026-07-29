# Tasks: SDD Tower V1 Contract Schemas

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,000–1,400 authored additions/deletions across 29 files |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | WU1 → WU2 → WU3 |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| WU1 (17 files) | Ten-schema foundation and duplicate-safe validation | PR 1 | `bun test test/contracts/schema.test.mjs` | N/A — no adapter; Bun tests are the harness | Revert WU1 paths only |
| WU2 (8 files) | JCS, ArtifactRef proof, and idempotent retries | PR 2 | `bun test test/contracts/canonicalization.test.mjs test/contracts/artifact-ref.test.mjs test/contracts/idempotency.test.mjs` | N/A — no runtime activation | Revert WU2 paths only |
| WU3 (4 files) | Main authority-gated store and opacity proof | PR 3 | `bun test test/main-store.test.mjs` | N/A — Tower remains OFF | Revert WU3 paths only |

## Phase 1: WU1 — Schema Foundation (17 files)

- [ ] 1.1 RED: Create `test/contracts/schema.test.mjs` and `test/fixtures/contracts/schema-cases-v1.json`; unknown fields, forbidden YAML, top-level/nested duplicates, and decoded-equivalent keys (`"a"`/`"\u0061"`) must fail `CT_SCHEMA_INVALID` with no effect. Run `bun test test/contracts/schema.test.mjs` (expected RED).
- [ ] 1.2 GREEN: Create `package.json`, `bun.lock`, `schemas/{project-registry,artifact-ref,plan-catalog,plan-manifest,binding-delta,policy-report,jornada,assignment,authorization,campaign}-v1.schema.json`, `contracts/{errors,schema-registry,validate}.mjs`; make 1.1 pass with frozen diagnostics/extensions. Run `bun test test/contracts/schema.test.mjs`.
- [ ] 1.3 REFACTOR/triangulate WU1: exercise headers, catalog/DAG resolution, manifest state exclusion, immutable delta links, and `CT_MANIFEST_INVALID`. Run `bun test test/contracts/schema.test.mjs`.

## Phase 2: WU2 — Canonicalization and ArtifactRefs (8 files)

- [ ] 2.1 RED: Create `test/contracts/{canonicalization,artifact-ref,idempotency}.test.mjs` and `test/fixtures/contracts/canonicalization-v1.json`; cover JCS/forbidden YAML, stale/mismatched refs, traversal/symlink/root escape, `requirements.txt`, `CMakeLists.txt`, executable MD/MDX, `README.sh`, fixed `git -C`, relative escape, foreign root rejection, and timeout/unknown-effect inspection. Run `bun test test/contracts/canonicalization.test.mjs test/contracts/artifact-ref.test.mjs test/contracts/idempotency.test.mjs` (expected RED).
- [ ] 2.2 GREEN: Create `contracts/{canonicalize,artifact-ref,idempotency,index}.mjs`; prove UTF-16 JCS, opaque bytes, commit/blob binding, `CT_ARTIFACT_REF_INVALID`, `CT_IDEMPOTENCY_CONFLICT`, and no replay. Run `bun test test/contracts/canonicalization.test.mjs test/contracts/artifact-ref.test.mjs test/contracts/idempotency.test.mjs`.
- [ ] 2.3 REFACTOR/triangulate WU2: reject unsafe/non-finite/invalid-Unicode values, exclude self-reference, freeze results, and retain path guarantees. Run `bun test test/contracts/canonicalization.test.mjs test/contracts/artifact-ref.test.mjs test/contracts/idempotency.test.mjs`.

## Phase 3: WU3 — Main Store and Boundaries (4 files)

- [ ] 3.1 RED: Create `test/main-store.test.mjs`; forged capability, worker cwd, Hermes, Support, and foreign-campaign mutations must deny; permissions/credentials and failed writes preserve records; READY/BLOCKED reports stay mechanically identical; recursive imports exclude Tower→contracts/schema/YAML/OpenSpec/plan/Policy. Run `bun test test/main-store.test.mjs` (expected RED).
- [ ] 3.2 GREEN: Create `main-store/{authority,store,index}.mjs`; implement startup-only trusted binding, WeakSet capability, owner-only `0700`/`0600` atomic CAS, terminal authorizations, and audit evidence. Run `bun test test/main-store.test.mjs`.
- [ ] 3.3 REFACTOR/triangulate WU3: verify Maintainer/Hermes/Main/Support/Policy/Planning/Implementation/Workspace Manager/Host Launcher/Tower/foreign-leader roles, the Change A/B boundary (no registry lookup, alias resolution, enrollment, identity/Main selection), Tower OFF, and no P7/P8 dependency. Run `bun test test/main-store.test.mjs`.
