---
name: torre-control-entregas
description: "Trigger: confirmed Tower delivery coordination, serialization, or closure. Enforce Main-only dispatch and evidence gates."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activate only when Main receives a confirmed brief for Tower delivery coordination, delivery ordering, or closure. Require the named assignment, assigned role, boundaries, dependencies, and expected proof before accepting it into the delivery queue.

## Hard Rules

- Main is the sole dispatch and delivery authority.
- Require a confirmed brief and exact evidence; never infer approval, readiness, ownership, or completion.
- Serialize delivery so only one approved candidate advances through the delivery boundary at a time.
- Fail closed when evidence is absent, stale, contradictory, or attached to a different assignment.
- Coordinate and record outcomes; do not perform work assigned to another Tower role.

## Decision Gates

| Condition | Action |
|---|---|
| Brief is confirmed and complete | Dispatch the exact assignment to its named role. |
| Scope, ownership, dependency, or proof is unclear | Hold the assignment and request corrected evidence. |
| Another candidate is advancing | Keep the candidate queued without granting delivery authority. |
| Completion proof matches the assignment | Accept it for ordered closure. |

## Execution Steps

1. Verify the confirmed brief against the assignment identity and required evidence.
2. Dispatch the unchanged assignment to the named Tower role.
3. Track returned state and evidence without expanding or reinterpreting the brief.
4. Advance one eligible candidate; keep every other candidate waiting.
5. Reconcile completion proof with the original brief and record the closure order.
6. Return closure evidence only after every required proof is present and consistent.

## Output Contract

Return the queue head, current owner, assignment state, blocking discrepancy, evidence received, and evidence still required. For closure, identify each completed assignment and its exact closure evidence. Name any fail-closed decision explicitly.

## References

- `../../profiles/tower/main.md`
