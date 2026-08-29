---
name: torre-control-entregas
description: "Trigger: approved Tower delivery ordering, serialization, evidence, or closure. Enforce Main-only coordination and project delivery policy."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.1"
---

## Activation Contract

Activate only when Main receives an explicitly approved assignment for Tower delivery ordering, evidence tracking, shared delivery-resource coordination, or closure. Planning, first assignment selection, and implementation remain outside this child.

## Hard Rules

- Main is the sole dispatch and delivery coordinator; workers never self-assign.
- Require the confirmed assignment and exact evidence. Never infer approval, readiness, ownership, completion, or a changed brief.
- Coordinate only: never implement, launch workers, mutate worktrees, or perform another role's delivery action.
- Serialize the Git delivery boundary so only one approved candidate advances at a time. Keep database and Git resource coordination independent.
- Read live repository, Git, remote, and Tower state instead of memory or Engram; report contradictions and fail closed.
- Apply the repository delivery policy in `AGENTS.md`: direct commit and push to `master`, no pull request, no Notion, and no receipt-driven review gate.
- Require exact closure evidence and reconcile project documentation before reporting the session closed.

## Decision Gates

| Condition | Action |
|---|---|
| Assignment is approved, unchanged, and complete | Admit it to the ordered queue under its named owner. |
| Scope, owner, worktree, dependency, resource, or proof is unclear | Hold it and request corrected evidence through Main. |
| Another candidate owns the delivery boundary | Keep the candidate waiting; never grant a second green light. |
| Database proof is pending | Preserve the Git result and keep the database requirement open. |
| Completion proof matches the assignment and policy | Accept it for ordered closure. |

## Execution Steps

1. Verify the approved assignment identity, owner, boundaries, dependencies, resources, and required proof.
2. Read current Tower and delivery state; report the delta and queue head.
3. Dispatch no work. Track only state and evidence returned for the unchanged assignment.
4. Advance one eligible candidate through the direct-delivery boundary; keep every other candidate waiting.
5. Reconcile Git, database, and documentation evidence independently against the original assignment.
6. Return closure evidence only when every required proof is present and consistent.

## Output Contract

Return queue head, delivery-boundary owner, `worktree | branch | state | scope | blocker` per assignment, state delta, evidence received, evidence missing, database proof, documentation proof, and each fail-closed discrepancy.

## References

- `../../AGENTS.md`
- `../../profiles/tower/main.md`
- `../torre-control/SKILL.md`
