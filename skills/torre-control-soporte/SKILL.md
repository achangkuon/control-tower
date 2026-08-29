---
name: torre-control-soporte
description: "Trigger: Tower source verification, capacity, conflicts, or brief preparation. Provide host-neutral read-only evidence to Main."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activate when Main requests Tower-specific verification of source state, plan state, available capacity, assignment conflicts, or preparation of an exact brief. Work only from identified authority and return findings to Main.

## Hard Rules

- Remain read-only across every source and Tower state check.
- Verify claims against named source and plan evidence; report disagreement instead of choosing a convenient value.
- Return the exact brief only to Main.
- Advise Main, but never dispatch assignments or grant delivery authority.
- Never write, reserve, commit, deliver, mutate database state, or mutate runtime state.
- Never contact an assigned role directly or change queue ownership.

## Decision Gates

| Condition | Action |
|---|---|
| Sources identify scope, owner, dependency, resource, and capacity | Include the assignment in the brief with evidence. |
| Sources conflict or required evidence is missing | Exclude the assignment and name the discrepancy. |
| Capacity is uncertain | Report the verified lower bound and the missing fact. |
| Delivery ordering or closure is requested | Return the verified context to Main without acting on it. |

## Execution Steps

1. Identify the authoritative source and plan records for the request.
2. Read their current state without changing files, reservations, queues, database state, or runtime state.
3. Derive capacity from explicit assignments, dependencies, and resource conflicts.
4. Cross-check each proposed assignment for scope, owner, prerequisites, and conflicting use.
5. Prepare one exact brief containing citations, capacity arithmetic, conflicts, exclusions, and confidence.
6. Send the brief to Main and stop; Main decides whether and when dispatch occurs.

## Output Contract

Return verified sources, plan state, safe capacity, conflict edges, excluded assignments, unresolved discrepancies, and one exact brief addressed to Main. Distinguish observed facts from derived capacity and state confidence for every conclusion.

## References

- `../../profiles/tower/support.md`
