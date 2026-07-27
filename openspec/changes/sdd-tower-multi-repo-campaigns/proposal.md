# Proposal: SDD Tower V1 Multi-Repository Campaigns

## Decision summary

Coordinate ordered compatible PRs across existing project Mains through a campaign DAG and predefined compensations. One existing Main acts as temporary lead without acquiring authority over participant repositories.

## Intent

Support changes that span repositories without turning Hermes into a worker coordinator or claiming distributed atomicity.

## In scope

- Create versioned Campaign manifests and DAG validation.
- Designate one existing Main as campaign lead.
- Resolve every participant through its own registry and Main.
- Validate local Plan Manifest, Policy Report, jornada, Git, PR, and authorization.
- Serialize V1 campaign delivery by step.
- Require exact per-PR Telegram merge authorization.
- Run post-checks before releasing dependent steps.
- Validate a compensation before starting an impactful step.
- Demonstrate a two-repository campaign.

## Out of scope

- A global Main with direct cross-repository write authority.
- Atomic transactions across Git repositories.
- Automatic deploy, traffic shifting, or generalized feature flags.
- Treating `git revert` as sufficient compensation for data or infrastructure effects.
- Parallel campaign delivery in V1.

## Dependencies

- `sdd-tower-project-registry`.
- `sdd-tower-main-policy-jornada`.
- `sdd-tower-telegram-delivery`.
- `sdd-tower-continuous-slice-loop`.

## New capabilities

- `sdd-tower-campaign-dag`
- `sdd-tower-lead-main-coordination`
- `sdd-tower-campaign-compensation`

## Success criteria

- [ ] The lead Main can order and observe but cannot claim participant work.
- [ ] Each participant Main retains local validation and merge authority.
- [ ] Campaign steps release only after dependency post-checks pass.
- [ ] Missing or fictional compensation blocks the step.
- [ ] Two repositories complete ordered delivery with independent merge approvals.
- [ ] Failure never produces a claim of distributed rollback or atomicity.

## Rollback plan

Stop unreleased campaign steps, preserve completed local deliveries, and execute only predefined participant-owned compensations. The campaign lead records partial terminal state and cannot rewrite participant history.
