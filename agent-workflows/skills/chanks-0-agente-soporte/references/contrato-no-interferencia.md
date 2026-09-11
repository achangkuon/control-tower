# Non-interference contract

The planning evidence helper is read-only. It observes and returns evidence; it does not
implement, deliver, coordinate peers, or write planning data.

## Boundary

Only the responsible parent may record a confirmed, bounded delta in `openspec/plan.yaml` and
regenerate `openspec/ROADMAP.md` through `radar render`. This responsibility is human-directed
workflow policy, not a live system permission or lock.

## Prohibitions

- Do not edit code, planning data, generated views, or external services.
- Do not stage, commit, push, open a PR, merge, deploy, or mutate a database.
- Do not acquire, release, transfer, simulate, or claim shared resources.
- Do not create parallel planning/status artifacts or expand a proposed delta.

## Proposed-delta precondition

A proposed operation names its Sesión/field, expected old value, new value, and authority. If
the evidence is stale or contradictory, preserve it and return the missing human choice.
