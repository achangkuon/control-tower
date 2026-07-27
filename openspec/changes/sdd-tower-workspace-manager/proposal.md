# Proposal: SDD Tower V1 Workspace Manager

## Decision summary

Replace permanent agent homes and branch recycling with deterministic `inspect`, `create`, and `retire` operations for ephemeral worktrees bound to one project, plan, lane, slice, branch, and assignment revision.

## Intent

Make workspace ownership observable and recoverable without allowing automation to destroy unknown work.

## In scope

- Implement read-only worktree inventory with repository, branch, HEAD, base relation, dirty, upstream, ahead/behind, PR, claim, and process evidence.
- Create worktrees at `Worktrees/<plan>/<lane>/<slice>` from an authorized base.
- Enforce `plan/<plan>/<slice>` and `feat/<plan>/<slice>` branch conventions.
- Make create and retire idempotent and receipt-backed.
- Retire only after clean state, ownership closure, remote delivery evidence, and preserved artifact/audit references.
- Convert `jornada.sh` knowledge into fixtures for squash, PR, dirty, upstream, and branch-safety cases.
- Provide a legacy wrapper that calls the new interfaces without retaining old branch-switch recycling.

## Out of scope

- Session/process launch.
- Merge execution.
- Automatic stash, reset, clean, branch deletion, or repository relocation.
- Product routing or Policy decisions.
- Changes to Tower continuation authority.

## Dependencies

- `sdd-tower-contract-schemas`.
- `sdd-tower-project-registry`.

## New capabilities

- `sdd-tower-workspace-inspection`
- `sdd-tower-workspace-creation`
- `sdd-tower-workspace-retirement`

## Success criteria

- [ ] Inspect is demonstrably read-only.
- [ ] Create rejects incompatible existing paths, branches, roots, or revisions.
- [ ] Retire preserves every dirty, detached, unknown, or unproven workspace.
- [ ] Repeating an idempotency key returns the same terminal result.
- [ ] No operation silently switches an existing worktree to unrelated work.
- [ ] Legacy `jornada.sh` cases remain available without becoming a runtime dependency.

## Rollback plan

Disable create/retire and retain inspect-only mode. Preserve all existing worktrees and receipts. Restore the legacy script as a manual advisor only; never re-enable destructive recycling automatically.
