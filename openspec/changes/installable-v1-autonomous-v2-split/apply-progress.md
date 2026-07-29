# Apply Progress: Installable V1 / Autonomous V2 Split

## Result Metadata

- status: success
- executive_summary: WU1 provenance tasks 1.1–1.3 are complete under Strict TDD, with the authorized stacked-to-main PR1 boundary persisted consistently across hybrid artifacts.
- artifacts:
  - `test/provenance/provenance.test.mjs`
  - `openspec/plans/master-index.md`
  - `openspec/plans/manifest.yaml`
  - `openspec/plans/product-version-map.yaml`
  - `openspec/plans/installable-v1/revisions/1/manifest.yaml`
  - `openspec/plans/autonomous-v2/revisions/1/manifest.yaml`
  - `openspec/changes/installable-v1-autonomous-v2-split/tasks.md`
  - `openspec/changes/installable-v1-autonomous-v2-split/apply-progress.md`
- next_recommended: apply — next authorized work unit only; later work units remain.
- skill_resolution: paths-injected — six required skill and shared-contract files loaded.

## Scope

- Work unit: WU1 — canonical V1/V2 provenance surfaces
- Delivery boundary: stacked-to-main PR1 provenance only; no PR was created
- Mode: Strict TDD
- Completed tasks: 1.1, 1.2, 1.3
- Remaining tasks: 2.1–4.2
- Authored diff size: 465 additions + deletions (hard cap: 1,000)

## Corrective Reconciliation

- Persisted `stacked-to-main` and `Decision needed before apply: No` for the authorized PR1 provenance boundary.
- Added the phase result metadata required by `_shared/sdd-phase-common.md` §D, lines 69–81, to make this persisted progress artifact independently resolvable.
- Corrective focused rerun: `bun test test/provenance` — exit 0; 17 pass, 0 fail, 42 assertions.
- Implementation, provenance behavior, test behavior, and prior Strict TDD evidence remain unchanged.

## Completed Tasks

- [x] 1.1 Added focused provenance tests for executable documentation-like paths, unsafe Git selectors, raw-byte digest mismatch, canonical consistency and rollback, and shared ownership conflicts.
- [x] 1.2 Published matching V1/V2 revision pointers, ArtifactRefs, owners, checkpoints, dependencies, and release lanes on the owned canonical surfaces.
- [x] 1.3 Normalized raw-byte digests, relationship arrays, atomic-pointer rollback metadata, and serialized ownership with the Autonomous V2 lane.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `test/provenance/provenance.test.mjs` | Integration | N/A — new focused harness and missing revision surfaces | `bun test test/provenance` exited 1: 0 pass, 17 fail; missing V1/V2 manifests and product map | `bun test test/provenance` exited 0: 17 pass, 0 fail, 42 assertions | 17 cases cover allowed and denied path/Git selections plus valid and invalid provenance states | Rerun exited 0: 17 pass, 0 fail, 42 assertions |
| 1.2 | `test/provenance/provenance.test.mjs` | Integration | Existing canonical files were read before changes; the RED harness failed before edits | Same RED execution established absent canonical publication behavior | Matching catalog, map, and revision manifests passed all 17 tests | Both V1 and V2 lanes, valid publication, and dependency-blocked V2 paths are asserted | Canonical field names and cross-surface pointers normalized; rerun green |
| 1.3 | `test/provenance/provenance.test.mjs` | Integration | Approval assertions were written before canonical refactor metadata | RED covered missing normalized relationships, rollback metadata, and ownership serialization | Normalized structures passed all focused assertions | Conflict/no-conflict and advance/rollback paths use distinct inputs | Final rerun exited 0: 17 pass, 0 fail, 42 assertions |

## Test Summary

- Total tests written: 17
- Total tests passing: 17
- Layers used: Integration (17)
- Approval tests: 4 canonical publication and rollback tests
- Pure functions created in the harness: 3

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused RED | `bun test test/provenance` — exit 1; 0 pass, 17 fail. Failures were caused by absent `installable-v1/revisions/1/manifest.yaml`, `autonomous-v2/revisions/1/manifest.yaml`, and `product-version-map.yaml`. |
| Focused GREEN | `bun test test/provenance` — exit 0; 17 pass, 0 fail, 42 assertions. |
| REFACTOR rerun | `bun test test/provenance` — exit 0; 17 pass, 0 fail, 42 assertions. |
| Runtime harness | N/A — WU1 changes planning/provenance artifacts only and has no runtime boundary. The live Tower and database were not mutated. |
| Rollback boundary | Revert `test/provenance/provenance.test.mjs`, `openspec/plans/master-index.md`, `openspec/plans/manifest.yaml`, `openspec/plans/product-version-map.yaml`, `openspec/plans/installable-v1/revisions/1/manifest.yaml`, and `openspec/plans/autonomous-v2/revisions/1/manifest.yaml`; restore the task checkboxes and remove this progress artifact. No later work unit is affected. |

## Publication and Ownership

- Active canonical owner: `installable-v1-provenance`
- Serialized peer: `autonomous-v2`
- Integration checkpoint: `v1-provenance-published`
- V2 publication status: dependency-blocked until the exact V1 release reference is verified
- Historical PRD/RFC/REQUIREMENTS bytes: unchanged
- Atomic pointer strategy: validate → temp file → fsync → rename
- Rollback: restore pointer revision 0 while retaining historical and failed-new artifacts

## Deviations and Issues

None. WU1 matches the design and did not touch runtime, database, package, lockfile, core, MCP, installer, or V2-owned implementation paths.
