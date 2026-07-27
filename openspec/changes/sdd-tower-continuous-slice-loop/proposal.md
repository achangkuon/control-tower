# Proposal: SDD Tower V1 Continuous Slice Loop

## Decision summary

Connect planning horizon, fresh implementation sessions, reconciliation, `sdd-apply`, `sdd-verify`, Binding Delta publication, delivery, and next-slice Policy evaluation into one bounded continuous loop.

## Intent

Complete multiple eligible slices without manual handoff while preserving product intent and exact merge control.

## In scope

- Start fresh Planning sessions through proposal/spec/design/tasks within the jornada horizon.
- Mark prepared SDD provisional until implementation reconciliation.
- Start fresh Implementation sessions from reconciliation through verified delivery handoff.
- Compare prepared artifacts with current manifest, integrated base, previous Binding Delta, dependencies, campaign inputs, and jornada revision.
- Produce, validate, classify, accept, and publish immutable Binding Deltas.
- Continue automatically after compatible drift and merged delivery.
- Block and escalate material or ambiguous drift.
- Maintain apply-progress continuity across session attempts.
- Demonstrate a `standard` jornada completing two slices without manual agent-to-agent handoff.

## Out of scope

- Product-scope invention.
- Automatic merge.
- Mixed-host writers.
- Workspace, launcher, Policy, or delivery implementations owned by prerequisite changes.
- Multi-repository campaign coordination.
- Plan interpretation inside Control Tower.

## Dependencies

- `sdd-tower-contract-schemas`.
- `sdd-tower-workspace-manager`.
- `sdd-tower-main-policy-jornada`.
- `sdd-tower-host-launcher`.
- `sdd-tower-telegram-delivery`.

## New capabilities

- `sdd-tower-planning-lane`
- `sdd-tower-implementation-reconciliation`
- `sdd-tower-binding-delta-publication`
- `sdd-tower-next-slice-continuation`

## Success criteria

- [ ] Planning never exceeds the approved horizon.
- [ ] Every apply starts with reconciliation.
- [ ] Every verified slice produces an immutable Binding Delta.
- [ ] Compatible drift continues without a maintainer question.
- [ ] Material or ambiguous drift blocks before the next assignment.
- [ ] Two slices complete under one standard jornada with exact merge approvals.
- [ ] Session loss rehydrates from artifacts and runtime evidence rather than conversation.

## Rollback plan

Pause the jornada, stop new assignments, preserve every prepared artifact, Binding Delta, worktree, PR, and runtime reference, and return to manual per-slice SDD progression.
