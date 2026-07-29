# Proposal: P7-P8 Integrated Reconciliation

> Terminology: P6 and P7 in this migrated document are legacy mechanism identifiers; P7 means `p7-host-neutral-loop-opencode-adapter`. Neither value denotes positional Plan P6 or Plan P7.

## Intent

Define S1.9–S1.12 as bounded roadmap/catalog/manifest and P7/P8 reconciliation Sesiones. Preserve approved planning; native `apply-ready` is insufficient without approved reconciliation evidence.

## Scope

### In Scope
- P7: amend proposal, design, tasks, and handoff; reuse its spec; create `reconciliation.md`.
- P8: reuse proposal/spec; amend design, tasks, and `STATUS.md`; create `reconciliation.md`.
- Refresh roadmap P6 status/provenance; do not rewrite historical `apply-progress.md`.
- Align the catalog anchor; rebind roadmap ArtifactRef/digest/revision; make `acceptance_refs` ArtifactRefs; add C→D; stop optional P9 gating P10/P11.

### Out of Scope
- Runtime, code, database, schema, migration, host-installation, or production-state changes.
- Wholesale P7/P8 SDD rebuilds or PR/delivery work.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- None; existing P7/P8 specifications remain normative.

## Approach

1. Correct mechanics and state both paths: `P6 → P7 → P8 → Change E` and `A → B/C → D → Change E`. P7/P8 MUST NOT depend on A; A's spec may progress in parallel.
2. Preserve roles: Maintainer—irreversible authority; Hermes—presentation; Main—project authority; Support—read-only decomposition; Policy—plan-local eligibility; Planning—future slice through tasks; Implementation—reconciliation/apply/verify/binding delta. Control Tower, Workspace Manager, and Host Launcher remain mechanisms; P7/P8 remain substrate adapters, not product authorities.
3. Reconcile `project_id`, `plan_id`, `slice_id`, `assignment_id`, `jornada_id`, `session_id`, `host_process_instance`, `plugin_instance`, and `root_session_id`. Keep capability `binding_epoch`, Main-issued `host_epoch`, and process-local non-authoritative controller `generation` distinct. Main owns `host_epoch` issuance and fencing authority; Change E enforces that mechanism.
4. Pin assignment-bound `Worktrees/<plan>/<lane>/<slice>` under the registered project container, authorized base SHA, `plan/<plan>/<slice>` or `feat/<plan>/<slice>` branch, assignment, and session. P7/P8 never create, retire, or recycle worktrees.
5. Block P7 pending its record. Block P8 pending reconciled/integrated P7 evidence and its record. Change E owns launch/inspect/stop/health, heartbeat, stop proof, session naming, `host_epoch` enforcement, and exclusive failover; it does not own `host_epoch` issuance or fencing authority.

## Affected Areas

| Area | Impact |
|---|---|
| `openspec/plans/` | Roadmap, catalog, manifest reconciliation |
| P7/P8 change folders | Bounded amendments and records |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Native readiness bypasses evidence | High | Enforce both gates |
| ArtifactRef or DAG drift | Medium | Validate anchors, digests, refs, and edges together |
| Epoch/authority conflation | High | Record distinct owners and fail closed |

## Rollback Plan

Revert S1.9–S1.12 documentation/manifest edits together; retain prior P7/P8 planning and P6 history. No runtime/data rollback is required.

## Dependencies

- Merged P6 evidence, approved RFC/requirements, and canonical ArtifactRefs.

## Success Criteria

- [ ] Mechanical corrections and both records are consistent.
- [ ] P7/P8 remain blocked unless their evidence gates pass, regardless of native status.
- [ ] The DAG, no-A dependency, authority, IDs, epochs, worktree boundary, and Change E handoff are explicit.
