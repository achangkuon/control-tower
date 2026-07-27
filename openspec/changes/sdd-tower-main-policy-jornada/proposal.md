# Proposal: SDD Tower V1 Main, Policy, and Jornada

## Decision summary

Implement the product orchestration layer that turns approved Plan Manifests into bounded jornadas, Policy Reports, and exact assignments while keeping Control Tower generic and plan-agnostic.

## Intent

Allow routine planning and implementation to continue automatically inside visible limits, with Main as repository authority and Policy as plan-local eligibility authority.

## In scope

- Implement versioned `short`, `standard`, `extended`, and custom jornada snapshots.
- Implement jornada authorization, activation, pause, revoke, expiry, block, resume, and completion transitions.
- Enforce duration, apply-slice, planning-horizon, concurrency, and two-attempt limits.
- Produce read-only Support conflict/capacity reports.
- Produce expiring Policy Reports from exact manifest, delta, runtime, and jornada inputs.
- Implement machine-readable compatible/material/ambiguous drift classification.
- Authorize Planning and Implementation assignments with exact revisions and host epoch.
- Reconcile recovery inputs without re-executing unknown effects.
- Store only opaque report references and digests in Tower.

## Out of scope

- Code implementation by Main or Policy.
- Workspace/process mechanics.
- Git delivery or Telegram callbacks.
- Multi-repository campaigns.
- OpenSpec parsing inside Control Tower core.

## Dependencies

- `sdd-tower-contract-schemas`.
- `sdd-tower-project-registry`.
- P6 recovery/rollback contracts from `autonomous-continuation-control-tower`.

## New capabilities

- `sdd-tower-bounded-jornada`
- `sdd-tower-policy-evaluation`
- `sdd-tower-assignment-authorization`
- `sdd-tower-support-forecast`

## Success criteria

- [ ] Preset changes never alter an active jornada snapshot.
- [ ] Reductions, pause, and revoke apply immediately; expansions require new authorization.
- [ ] Policy Reports expire and invalidate on changed inputs.
- [ ] Material or ambiguous drift blocks.
- [ ] Main never exceeds horizon, slice, concurrency, or attempt ceilings.
- [ ] Tower behavior is identical for semantically different opaque Policy Reports.

## Rollback plan

Stop new assignments, pause active jornadas, preserve reports and Tower runtime evidence, and return to manual routing. No Plan Manifest or Binding Delta history is rewritten.
