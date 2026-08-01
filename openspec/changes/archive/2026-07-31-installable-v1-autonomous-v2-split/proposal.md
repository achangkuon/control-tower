# Proposal: Split Installable V1 from Autonomous V2

## Intent

Make **Installable V1** the release priority: a local-first Tower for multiple projects with lifecycle safety. Continue approved broad “V1” as **Autonomous V2** without rewriting its PRD, RFC, REQUIREMENTS, A–I, P6–P11, P7/P8, or ArtifactRefs.

## Scope

### In Scope
- Freeze vocabulary, provenance, journeys, authority, and ownership.
- Define V1 lifecycle, enrollment/layout, Support, host integration, optional Hermes, and conformance workstreams.
- Define V2’s revisioned mapping to V1 dependencies and preserved historical inputs.

### Out of Scope
- Runtime implementation or historical artifact rewrites.
- V1 worktree/session/worker automation, autonomous jornadas, failover, campaigns, or merge.

## Capabilities

### New Capabilities
- `installable-control-tower-v1`: lifecycle, enrollment, layout, authority, integrations, services, and release gates.
- `autonomous-control-tower-v2`: revisioned A–I/P6–P11 continuation consuming explicit V1 dependencies.
- `control-tower-product-provenance`: vocabulary, ArtifactRef mapping, preservation, ownership, and checkpoints.

### Modified Capabilities
- None; historical broad-V1 requirements remain immutable approved inputs.

## Product Contract

- **Journey:** install/diagnose → enroll projects → validate a trunk owner clone at `<project>/Main/` plus `Worktrees/` with one read-only Support and prepared workers, or a safe existing layout → configure available OpenCode/Pi/Claude hosts → operate locally → upgrade/rollback/uninstall preserving configuration.
- **Authority:** each project’s Main is sole orchestrator. Support analyzes state/plans, maps capacity/conflicts, and drafts briefs; it never mutates, registers, locks, or delivers. V1 never creates worktrees or launches workers.
- **Hermes:** optional V1 bridge for state and bounded arm/disarm or intent delivery; no shell, worker selection/launch, Git delivery, or merge. V2 keeps Hermes global presentation separate from per-project Main authority and local Support while adding separately authorized autonomy.
- **Release gates:** clean-machine Linux/WSL systemd and macOS launchd evidence; idempotent lifecycle; configuration/history preservation; layout safety; installed-host smoke/rollback. Missing optional hosts do not fail release.

## Approach and Follow-up

Create revisioned V1/V2 PRD/RFC/REQUIREMENTS and a provenance map, then child changes for lifecycle, enrollment/layout, Support, host adapters, optional Hermes, conformance, and V2 reconciliation. Both lanes may run in parallel; shared files require named owners and checkpoints.

## Affected Areas

| Area | Impact |
|---|---|
| `openspec/plans/*` | Revisioned vocabulary, manifests, ArtifactRefs |
| V1/V2 product docs | Contracts; history preserved |
| `core.mjs`, `mcp.mjs`, `install.sh`, `bin/torre`, adapters/services | Follow-up implementation only |

## Risks and Rollback

Terminology drift, broken provenance, hidden Hermes authority, and shared-file conflicts are high risks. Mitigate with immutable refs, capability boundaries, owners, and checkpoints. Roll back by reverting only new split artifacts/index bindings and restoring prior canonical pointers; never alter historical bytes or runtime state.

## Success Criteria

- [ ] Docs identify Installable V1 as release and map every A–I/P6–P11 input to Autonomous V2.
- [ ] V1/V2 specs and child changes cover authority, lifecycle, matrix, service, Hermes, parallelism, and release gates above.
