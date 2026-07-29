# Session Handoff: Installable V1 / Autonomous V2 Split

## Current State and Next Action

The change has completed **explore, propose, spec, and design**, and its planning package was merged through PR #60 at `master@67a266a`. Work stopped intentionally before `sdd-tasks`; no implementation work has begun.

**Next exact action:** in the clean `Worktrees/installable-v1` lane, run `sdd-tasks` for `installable-v1-autonomous-v2-split`, then inspect the generated **Review Workload Forecast** before starting RED. This may run in parallel with Change A implementation in `Worktrees/autonomous-v2`.

## Product Boundary

**Installable V1 is the immediate release priority.** The historical broad V1 becomes **Autonomous V2** through revisioned provenance: preserve historical PRD, RFC, REQUIREMENTS, A–I, P6–P11, P7/P8, and ArtifactRef bytes, then publish explicit `preserves`, `supersedes`, and migration relationships. Do not destructively rewrite historical artifacts.

| Lane | Agreed scope |
|---|---|
| Installable V1 | A local-first Tower for multiple enrolled projects; each project's `Main/` is the sole orchestrator; local Support under `Worktrees/` is read-only and non-authoritative; workers are manually prepared and launched; Bun, Git, OpenCode, Pi, and Claude are detected and configured only when available or requested; Hermes is an optional bounded bridge; systemd and launchd are supported; install, diagnose, upgrade, rollback, and uninstall are versioned, idempotent, fail-closed, and preserve configuration and Tower history. |
| Autonomous V2 | Automatic worker, session, assignment, worktree, and launch provisioning plus the preserved A–I/P6–P11/P7/P8 autonomous ecosystem, including authorized jornadas, continuation, failover, campaigns, and delivery. Hermes global presentation and remote intent remain separate from per-project Main authority and local Support. |

## Completed SDD Phases

- [x] Explore: established the truthful V1 boundary, reusable runtime seams, V2 preservation map, and conflict surfaces.
- [x] Propose: froze intent, scope, capabilities, authority, release gates, and provenance approach.
- [x] Spec: completed `installable-control-tower-v1`, `autonomous-control-tower-v2`, and `control-tower-product-provenance` specifications.
- [x] Design: defined additive module boundaries, immutable runtime releases, per-host transactions, Support denial, Hermes limits, implementation topology, and verification strategy.
- [ ] Tasks: intentionally not started.
- [ ] Apply, verify, archive: not started.

## Repository State

| Item | Value |
|---|---|
| Worktree | `/home/emili/projects/control-tower/Worktrees/installable-v1` |
| Branch | `feat/installable-v1/implementation` |
| Base / upstream | `origin/master` at `1a10b384997365a67f9158b6e5fac58999beb7c4` |
| HEAD | `1a10b384997365a67f9158b6e5fac58999beb7c4` (0 ahead/behind at reconciliation) |
| Planning delivery | PR #60 merged the seven planning files; the worktree is clean and no implementation has begun. |

## Session Boundary

- No runtime code or behavior changed.
- Planning was delivered through approved issue #58 and merged PR #60; no runtime or implementation delivery occurred.
- Notion page `3a6e23cc93458168b498eb2fac0011ea` was updated non-destructively: the former SDD Tower roadmap/detail track was split into Installable Control Tower V1 and Autonomous Control Tower V2, with current status and next actions for both.
- The Installable V1 lane must remain in planning until `sdd-tasks` is complete and its Review Workload Forecast has been inspected; the separate Autonomous V2 lane may begin its already-planned Change A WU1.
