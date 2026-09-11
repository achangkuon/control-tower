# Executable candidates, conflicts, and capacity

## Minimum context

Record repository identity, exact base, instructions, plan, generated view, delivery policy, and
observed Git state. For each candidate, record objective, authority, allowed/forbidden scope,
dependencies, shared-path risk, checks, and rollback boundary.

Do not invent routes, branches, commands, scope, or work to fill a target.

## Conflict graph

Add an exclusive edge when two candidates overlap paths, behavior, source of truth, generated
output, migration, shared resource, contract, delivery surface, or unintegrated dependency.

| Classification | Meaning |
|---|---|
| `independent` | May advance without a common checkpoint. |
| `parallel_with_checkpoint` | May advance, but one needs named evidence before delivery. |
| `serial` | Must not begin safely together. |
| `not_executable` | Missing authority, access, evidence, or dependency. |

`radar status` is a static forecast. It never acquires a live lock or proves another actor is idle.

## Capacity

Report requested, recommended, and maximum-safe capacity with their evidence. The maximum-safe
set excludes conflicts and unresolved dependencies; it is advice for the human-directed parent,
not an assignment, dispatch, queue, or runtime claim.
