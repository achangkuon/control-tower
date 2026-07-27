# Proposal: SDD Tower V1 Host Launcher

## Decision summary

Implement one active execution line per jornada with deterministic Pi/OpenCode launch, health, stop proof, session identity, host epoch, and preauthorized exclusive fallback.

## Intent

Let the maintainer choose Pi or OpenCode while preserving continuity when a host fails and preventing concurrent writers.

## In scope

- Define and implement `capabilities`, `launch`, `inspect`, `stop`, and `health` adapter contracts.
- Launch canonical session names in exact authorized worktrees.
- Emit descriptor-free generic wake and require `receive → claim → ack`.
- Implement heartbeat and liveness defaults from REQUIREMENTS.
- Bind assignments and claims to `host_epoch`.
- Implement preauthorized OpenCode → Pi fallback.
- Require stop proof, ownership closure, lease reconciliation, and effect inspection before fallback.
- Reject stale host messages, claims, and attempts.
- Run the shared Pi/OpenCode conformance matrix.

## Out of scope

- Mixed-host concurrent execution.
- Automatic Claude use; Claude remains opt-in after conformance.
- Workspace creation or retirement.
- Policy decisions, code implementation, Telegram, or merge.
- Host-specific SQLite or continuation authority.

## Dependencies

- `sdd-tower-workspace-manager`.
- `sdd-tower-main-policy-jornada`.
- Merged and reconciled `p7-host-neutral-loop-opencode-adapter`.
- Merged and reconciled `p8-slice-planning`.

## New capabilities

- `sdd-tower-host-launcher`
- `sdd-tower-single-host-line`
- `sdd-tower-exclusive-host-failover`

## Success criteria

- [ ] Exactly one host epoch can authorize writers for a jornada.
- [ ] Pi and OpenCode launch the same assignment contract.
- [ ] Wake never contains implementation authority.
- [ ] Missing stop proof blocks reuse of the worktree.
- [ ] OpenCode → Pi preserves partial work and starts new attempts only.
- [ ] Old-epoch callbacks and claims fail closed.

## Rollback plan

Stop new launches, preserve sessions/worktrees, and revert to manual host startup using Tower receive/claim/ack. Do not transfer ownership or terminate unknown writers during rollback.
