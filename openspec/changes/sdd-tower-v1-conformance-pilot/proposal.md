# Proposal: SDD Tower V1 Conformance Pilot

## Decision summary

Validate the complete SDD Tower V1 product against REQUIREMENTS Gates A–G through bounded, reversible pilots. This change adds conformance evidence and fixtures; it does not introduce a new production capability family.

## Intent

Prove the integrated product before enabling extended jornadas or multi-project operation by default.

## In scope

- Run schema/canonicalization and isolation gates.
- Run one `short` single-slice jornada on OpenCode or Pi.
- Prove OpenCode → Pi fallback with stop proof, host epoch, and no concurrent writer.
- Run one `standard` two-slice jornada with prepared planning, reconciliation, Binding Delta, and exact merge approvals.
- Test Telegram free-text rejection, nonce replay, expiry, and SHA drift.
- Recover a dirty worktree without cleanup or duplicate effects.
- Run a two-repository ordered campaign with a validated compensation.
- Produce a final V1 conformance report and enablement recommendation.

## Out of scope

- New product behavior not required by approved gates.
- Extended jornadas enabled by default.
- Claude as a release blocker.
- Production database mutation or irreversible migration.
- Generalized deploy or distributed rollback.

## Dependencies

- Gates of `sdd-tower-contract-schemas` through `sdd-tower-multi-repo-campaigns`.
- Required P6–P11 mechanism evidence for Pi/OpenCode.
- Approved PRD, RFC, REQUIREMENTS, Plan Manifest, and roadmap.

## Modified capabilities

- `sdd-tower-v1-conformance`

## Success criteria

- [ ] Gates A–G pass with exact commands and evidence.
- [ ] No pilot exceeds its jornada snapshot.
- [ ] No test activates or mutates unrelated real projects.
- [ ] Every negative authority scenario fails closed.
- [ ] Recovery and delivery effects are idempotent.
- [ ] The final report names residual risks and recommends enable, limited enable, or block.

## Rollback plan

Keep V1 mutable features disabled, preserve conformance evidence, remove only isolated pilot state, and retain existing read-only Hermes/Control Tower operation. No failed pilot may trigger repository relocation or destructive workspace cleanup.
