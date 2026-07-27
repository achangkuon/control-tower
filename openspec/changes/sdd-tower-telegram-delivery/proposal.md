# Proposal: SDD Tower V1 Telegram Delivery

## Decision summary

Implement Main-owned delivery coordination and exact Telegram authorization so verified work may create commits, push, and open PRs automatically while every merge remains bound to one maintainer decision over an exact target.

## Intent

Remove routine delivery handoffs without turning Hermes, Telegram text, or a stale approval into merge authority.

## In scope

- Implement immutable authorization envelopes and one-use nonce storage.
- Bind private allowlisted Telegram user/chat identities.
- Present approve, reject, details, pause, and revoke actions through Hermes.
- Support exact fallback commands when callback buttons are unavailable.
- Implement idempotent conventional commit, branch push, and PR create/update operations.
- Validate repository, PR, base, base SHA, head SHA, checks, Policy Report, jornada, and registry revision.
- Consume authorization atomically before merge.
- Use match-head protection and persist merge/post-check evidence.
- Invalidate authorization on SHA, checks, policy, registry, jornada, expiry, or nonce changes.

## Out of scope

- Free-text approval.
- Automatic merge.
- Product-scope decisions by Hermes.
- Deploy, traffic shifting, or generalized release automation.
- Multi-repository campaign ordering.

## Dependencies

- `sdd-tower-contract-schemas`.
- `sdd-tower-project-registry`.
- `sdd-tower-main-policy-jornada`.

## New capabilities

- `sdd-tower-delivery-coordination`
- `sdd-tower-telegram-authorization`
- `sdd-tower-exact-merge-binding`

## Success criteria

- [ ] Commit, push, and PR effects are idempotent.
- [ ] Free text and replayed callbacks never authorize.
- [ ] Authorization expires after 30 minutes and is single-use.
- [ ] Any target/evidence change invalidates the request.
- [ ] Every merge records exact input, result, merge SHA, and post-check.
- [ ] Hermes presents authority but cannot create or consume it.

## Rollback plan

Disable mutable Telegram actions and retain read-only status. Stop new delivery effects, preserve open PRs and audit records, and return merge execution to the manual verified path.
