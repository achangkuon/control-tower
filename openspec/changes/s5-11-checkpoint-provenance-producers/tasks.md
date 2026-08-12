# Tasks: Canonical checkpoint provenance producers

**Authority:** `openspec/plans/plan-5/STATUS.md` §S5.11 and `openspec/plans/decision-register.md` decision 21. This task refinement preserves the approved two-Módulo, six-Tarea hierarchy. A later explicit maintainer decision expands the exact S5.11 Área by one test path only, from ten to eleven paths: `test/contracts/s3-2-schemas.test.mjs`, exclusively to migrate its stale S3.2 `reconciledCheckpoint` fixture to the corrected complete canonical v1 enumerable shape.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | **760–960 authored additions + deletions**; no generated artifacts are excluded. M5.11.1: 320–400; M5.11.2: 440–560; total is de-duplicated for the shared contract files. |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** — the estimate exceeds 400 authored changed lines. No chain or split is proposed because this assignment forbids inventing one. |
| Suggested split | **None proposed; hard stop before apply.** Maintainer must provide any delivery boundary outside this task assignment. |
| Delivery strategy | **size:exception** — maintainer-authorized, bounded to the 760–960 authored additions + deletions forecast. |
| Chain strategy | **size-exception** — keep S5.11 intact; no replan, additional Session, or chained PR. |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High
Área sufficient: Yes

**Maintainer-authorized workload decision:** a bounded `size:exception` is approved for S5.11 at the forecast 760–960 authored additions + deletions. Keep S5.11 intact: no replan, additional Session, or chained PR. This exception is size-only and does not relax any behavior, test, provenance, security, scope, or verification requirement.

**Apply hard stops:** stop immediately if the actual authored implementation total exceeds 960; any single behavior cannot be reviewed coherently; any implementation path outside the exact Área is needed; runtime-origin proof requires persistence, a store, a second authority or writer, a token, Main, parking, or alternate ingress; a new unresolved decision appears; Engram cannot persist and read back a required Módulo checkpoint or cumulative apply-progress after bounded retry; or missing dependencies cannot be restored with `bun install --frozen-lockfile` while preserving `package.json` and `bun.lock` invariants.

**Reason and uncertainty:** the approved Área is sufficient: all required production, schema, registry, validation, fixture, and test targets are among its ten explicit paths; currently absent `workspace/reconciliation.mjs`, `schemas/checkpoint-capture-v1.schema.json`, and `test/workspace/reconciliation.test.mjs` are explicitly authorized additions. The estimate is high because it adds a runtime producer, replaces a visible versioned schema, adds two closed contracts and shared semantic derivation, and requires exhaustive origin-versus-integrity falsifiers across workspace and contract tests. Uncertainty is ±100 lines around test-fixture density and existing validator helper reuse; it cannot reduce the estimate below the 400-line budget. No Main, parking, escalation, store, DB, token, S5.12, caller assertion, consumer synthesis, shadow store, second writer, or alternate-ingress work is authorized.

## Strict TDD Sequence

Run each Tarea in the listed order. RED modifies tests/fixtures only and its focused `bun test` command MUST fail for the named missing behavior before any production, schema, registry, or validator edit. GREEN makes only that RED set pass. REFACTOR runs only after GREEN and preserves passing behavior.

### Módulo M5.11.1 — Canonical capture identity

- [x] **Tarea T5.11.1.1 — RED: specify the capture contract and live-origin boundary.** <!-- sdd-owner: implementation -->
  - **Paths:** `test/workspace/checkpoint.test.mjs`, `test/contracts/schema.test.mjs`, `test/fixtures/contracts/schema-cases-v1.json`.
  - **Start / dependency:** start from the current capture output; no production-path edits. Depends on S5.8 being integrated and on no prior S5.11 Tarea.
  - **Test intent:** add failing assertions for the closed `checkpoint-capture-v1` enumerable shape; required `project_id`, `assignment_id`, and `generation`; deterministic `checkpoint_id` and digest over all authority-bearing capture bindings; deep freeze and `Object.prototype`; request rejection for caller-supplied output/provenance claims. Specify `assertCanonicalCheckpointCapture` as a distinct live-origin check.
  - **Required falsifiers:** a manually reconstructed, correctly rehashed capture MUST pass generic schema/semantic integrity validation yet fail canonical-origin assertion with `CT_PROVENANCE_ORIGIN_INVALID`; `structuredClone(capture)`, JSON/spread reconstruction, and a Proxy MUST fail that origin assertion and reconciliation entry while retaining no authority to synthesize provenance. Test that keys, descriptors, symbols, JSON, and canonical input expose only the declared enumerable contract.
  - **Focused command / expected RED:** `bun test test/workspace/checkpoint.test.mjs test/contracts/schema.test.mjs` MUST fail because the baseline has no capture schema/registration/semantic derivation or exported canonical-origin assertion and emits provenance-incomplete capture output.
  - **Finish / completion evidence:** record the failing test names and failure causes; no path outside these three test/fixture paths changes. **Rollback boundary:** remove only this unimplemented RED test/fixture delta before GREEN; do not weaken the manual-rehash, `structuredClone`, or Proxy falsifiers.

- [x] **Tarea T5.11.1.2 — GREEN: produce the immutable capture artifact through the canonical contract path.** <!-- sdd-owner: implementation -->
  - **Paths:** `workspace/checkpoint.mjs`, `schemas/checkpoint-capture-v1.schema.json`, `contracts/schema-registry.mjs`, `contracts/validate.mjs`, `test/workspace/checkpoint.test.mjs`, `test/contracts/schema.test.mjs`, `test/fixtures/contracts/schema-cases-v1.json`.
  - **Start / dependency:** begin only after T5.11.1.1 has a recorded RED result. Preserve existing read-only Git observation, exact staged-byte/mode checks, and `CT_CHECKPOINT_UNSAFE` behavior.
  - **Implementation target:** close the capture request; derive repository fields; build the declared capture enumerable contract; derive domain-separated `checkpoint_id` and digest through shared origin-neutral validation; then materialize a module-private ECMAScript-private-field brand, reset to `Object.prototype`, deep-freeze, assert canonical origin, and return the original branded object. Export assertion authority only; do not expose a constructor, materializer, brand, or caller-provided provenance field.
  - **Focused command / expected GREEN:** `bun test test/workspace/checkpoint.test.mjs test/contracts/schema.test.mjs` MUST pass, including deterministic equivalent captures, drift/tamper rejection, generic-integrity acceptance of correctly rehashed manual data, and runtime-origin rejection of manual, `structuredClone`, and Proxy values.
  - **Finish / completion evidence:** capture has `checkpoint-capture-v1`, stable identity/digest, exact project/assignment/generation/repository/base/result/file bindings, a plain frozen enumerable surface, and no state write or consumer synthesis. **Rollback boundary:** revert this Tarea's listed capture schema/producer/contract/test/fixture changes together only before M5.11.2 begins; after reconciliation depends on it, use the complete ten-path Session rollback, never a schema-only or assertion-only revert.

- [x] **Tarea T5.11.1.3 — REFACTOR: keep capture integrity origin-neutral and eliminate duplicate derivation.** <!-- sdd-owner: implementation -->
  - **Paths:** `workspace/checkpoint.mjs`, `schemas/checkpoint-capture-v1.schema.json`, `contracts/schema-registry.mjs`, `contracts/validate.mjs`, `test/workspace/checkpoint.test.mjs`, `test/contracts/schema.test.mjs`, `test/fixtures/contracts/schema-cases-v1.json`.
  - **Start / dependency:** start only after T5.11.1.2 is green. Keep production behavior unchanged while consolidating capture identity/digest field selection and semantic invariants in `contracts/validate.mjs`; contracts remain origin-neutral and MUST NOT import workspace producers.
  - **Test intent:** triangulate every capture binding independently—identity, digest, project, assignment, generation, repository root/common dir, base/result commit/tree, file path/mode/git mode/content digest, file order, and duplicate path. Preserve the separation: correct public hashes establish integrity only; the private producer assertion establishes live origin only.
  - **Focused command / expected GREEN:** `bun test test/workspace/checkpoint.test.mjs test/contracts/schema.test.mjs` MUST remain green with no duplicate producer-local hash/field list and with fixture/manual values unable to pass canonical origin.
  - **Finish / completion evidence:** one registered capture schema, one shared integrity derivation path, and tests proving all listed drift cases fail closed with `CT_SCHEMA_INVALID` while origin failures remain `CT_PROVENANCE_ORIGIN_INVALID`. **Rollback boundary:** revert the refactor as a coherent capture-contract delta only if the T5.11.1.2 green behavior remains intact; never reintroduce a producer-local duplicate derivation or origin check into generic validation.

### Módulo M5.11.2 — Canonical reconciliation producer

- [x] **Tarea T5.11.2.1 — RED: specify reconciliation as a real producer, not a schema-valid assertion.** <!-- sdd-owner: implementation -->
  - **Paths:** `test/workspace/reconciliation.test.mjs`, `test/contracts/schema.test.mjs`, `test/fixtures/contracts/schema-cases-v1.json`.
  - **Start / dependency:** start only after M5.11.1 is green and refactored. Add tests/fixtures only; do not create `workspace/reconciliation.mjs` or modify schemas, registry, or validators during RED.
  - **Test intent:** specify `reconcileCheckpoint({ capture, evidence })` and `assertCanonicalReconciledCheckpoint`; require exact live capture origin before evidence processing; closed required evidence; copied capture bindings; exact capture identity/digest linkage; independent reconciliation identity/digest; immutable plain-object output; and `state: "VALID"` only.
  - **Required falsifiers:** an integrity-valid, correctly rehashed manual capture MAY pass generic validation and pair integrity but MUST make reconciliation fail first with `CT_PROVENANCE_ORIGIN_INVALID`; a manually reconstructed, correctly rehashed reconciliation MAY pass generic validation and pair integrity but MUST fail its canonical-origin assertion. `structuredClone`, JSON/spread reconstruction, and a Proxy of both artifact types MUST fail canonical-origin assertions. Mismatched project/assignment/generation/repository/base/result/capture linkage or any missing/extra evidence MUST emit no reconciliation artifact and fail closed.
  - **Focused command / expected RED:** `bun test test/workspace/reconciliation.test.mjs test/contracts/schema.test.mjs` MUST fail because no runtime reconciliation producer or canonical-origin assertion exists and the baseline schema accepts provenance without independent digest, exact capture link, or `VALID`-only output.
  - **Finish / completion evidence:** record failing test names/codes and retain the distinction that generic integrity is not producer origin. **Rollback boundary:** remove only this RED test/fixture delta before GREEN; do not relax manual-rehash, `structuredClone`, or Proxy rejection cases.

- [x] **Tarea T5.11.2.2 — GREEN: emit a branded, immutable `VALID` reconciliation from an exact live capture.** <!-- sdd-owner: implementation -->
  - **Paths:** `workspace/reconciliation.mjs`, `schemas/reconciled-checkpoint-v1.schema.json`, `contracts/schema-registry.mjs`, `contracts/validate.mjs`, `test/workspace/reconciliation.test.mjs`, `test/contracts/schema.test.mjs`, `test/fixtures/contracts/schema-cases-v1.json`.
  - **Start / dependency:** begin only after T5.11.2.1 has a recorded RED result and `assertCanonicalCheckpointCapture` is green. Do not alter `workspace/checkpoint.mjs` in this Tarea.
  - **Implementation target:** assert the original capture's private origin first; reject caller-supplied state, schema/version, identity, digest, capture linkage, origin claim, or prebuilt artifact in closed evidence; compare every duplicated checkpoint binding; copy checkpoint values from capture; derive reconciliation identity/digest through the shared origin-neutral path; emit only `VALID`; privately brand, reset to `Object.prototype`, deep-freeze, assert, and return the same reconciliation reference. Export checking authority only.
  - **Focused command / expected GREEN:** `bun test test/workspace/reconciliation.test.mjs test/contracts/schema.test.mjs` MUST pass: exact live capture plus valid evidence produces a distinct branded frozen `reconciled-checkpoint-v1`; all non-producer captures, missing/mismatched evidence, tamper, state, and caller/consumer synthesis attempts fail closed with no output.
  - **Finish / completion evidence:** reconciliation has its own deterministic identity/digest, exact capture linkage and copied bindings, and no Main/parking/store/DB/token write, second writer, alternate ingress, or S5.12 composition. **Rollback boundary:** revert the listed reconciliation schema/producer/contract/test/fixture changes together only before the final refactor; after this Tarea, rollback is the full ten-path S5.11 contract boundary, never a schema-only producer substitute.

- [x] **Tarea T5.11.2.3 — REFACTOR: finalize pair integrity and preserve the one canonical producer path.** <!-- sdd-owner: implementation -->
  - **Paths:** `workspace/checkpoint.mjs`, `workspace/reconciliation.mjs`, `schemas/checkpoint-capture-v1.schema.json`, `schemas/reconciled-checkpoint-v1.schema.json`, `contracts/schema-registry.mjs`, `contracts/validate.mjs`, `test/workspace/checkpoint.test.mjs`, `test/workspace/reconciliation.test.mjs`, `test/contracts/schema.test.mjs`, `test/fixtures/contracts/schema-cases-v1.json`.
  - **Start / dependency:** start only after T5.11.2.2 is green. Consolidate the two contract derivations and pure `validateCheckpointProvenancePair` checks without exporting a producer constructor, importing workspace modules from `contracts/validate.mjs`, or adding a second validation/ingress path.
  - **Test intent:** triangulate cross-artifact mismatch for capture identity/digest and every project/assignment/generation/repository/base/result binding. Retain all integrity-versus-origin falsifiers: correctly rehashed manual artifacts can be integrity-valid, but only exact live branded outputs pass canonical assertions; `structuredClone` and Proxy values remain rejected. Assert direct unchanged transport, deterministic identities with distinct live object references, and scope witnesses for no caller assertion, consumer synthesis, Main/parking composition, shadow store, second writer, or alternate ingress.
  - **Focused command / expected GREEN:** `bun test test/workspace/checkpoint.test.mjs test/workspace/reconciliation.test.mjs test/contracts/schema.test.mjs` MUST remain green; no test-local AJV/schema loader or duplicate digest/field list is introduced.
  - **Finish / completion evidence:** both schemas are registered once; generic validation and pair integrity are pure and origin-neutral; both producer assertions are the only runtime-origin acceptance seams; all approved test files pass and the diff is limited to the ten Área paths. **Rollback boundary:** revert the complete producer/schema/registry/validator/fixture/test boundary as one S5.11 rollback; do not leave a registered schema without a producer, an origin assertion without its producer, a fixture as runtime evidence, or a partial producer path.

## Maintainer-authorized scoped compatibility correction

- **Scope authority:** explicit maintainer decision authorizes exactly one Área expansion and one correction; this is a continuation of the existing apply-progress, not a new apply phase or correction loop.
- **Only added path:** `test/contracts/s3-2-schemas.test.mjs`.
- **Exclusive purpose:** migrate its stale S3.2 `reconciledCheckpoint` fixture to the corrected complete canonical v1 enumerable shape.
- **Scoped RED already witnessed:** `bun test test/contracts/schema.test.mjs test/contracts/s3-2-schemas.test.mjs` → 58 pass, 1 fail, 184 assertions; exact failing test `S3.2 schema contracts > registers and validates all six versioned fixtures`.
- **Required implementation constraint:** reuse exported canonical reconciliation identity/digest helpers and the existing `validate` path; add no test-local identity, digest, canonicalization, AJV, or schema-loader algorithm; make no live producer-origin claim for the fixture.
- **Not authorized:** legacy compatibility, schema weakening, version fork, producer code changes, new runtime behavior, any other product/test path, another correction loop, Main, parking, store, token, or S5.12.

## Apply Gate

**Terminal apply status: SUCCESS WITH TYPED VERIFICATION UNAVAILABLE.** This is not a full-suite PASS. The maintainer accepts the sole full-suite failure as `verification_unavailable: pre-existing clean-clone runtime prerequisite`, an accepted baseline environmental failure causally independent of S5.11.

Terminal evidence authority:
- Fresh untouched baseline clone at exact `428b3ed012c9217c72342041a28c5622d945fe1e`, with no candidate overlay: `bun test test/registry/storage.test.mjs` → 13 pass / 1 fail at `test/registry/storage.test.mjs:178` because `.git/control-tower/tower.db` is absent.
- The test assumption originated in `4a51f7ce26a60b2180069b45e4f7762985075687`, before S5.11. None of the eleven S5.11 implementation/test paths owns registry storage or `test/registry/storage.test.mjs`.
- Candidate aggregate on exact integration bytes: `bun test test/workspace test/contracts` → 109 pass / 0 fail / 537 assertions.
- Git-aware candidate full: `bun test` → 655 pass / 1 accepted baseline environmental failure / 3940 assertions. Clean-clone full certification is unavailable; this result is explicitly not PASS, and no candidate regression is evidenced.
- Registry clean-clone hermeticity is separate remediation debt and MUST NOT enter S5.11.
- No source correction or test rerun was performed for this terminal disposition.

All six implementation-owned Tareas remain complete and visibly checked. The exact immutable candidate manifest and SHA-256 in `apply-progress.md` are the only candidate authority. Next recommended: `sdd-verify` against that manifest and the typed verification-unavailable disposition.
