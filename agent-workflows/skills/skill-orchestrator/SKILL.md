---
name: skill-orchestrator
description: "Trigger: skill orquestadora, coordinar agentes, despachar trabajo, skill que manda a otro proceso. Design skills that coordinate external work without inventing authority."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Use this skill to design or audit a skill that coordinates work outside its own turn. Do not use
it for a parent skill that loads children and executes them in the same turn; use
`chanks-0-skill-composer` for that shape.

## Hard Rules

- Name the real external runtime before designing orchestration; a generic builder must not invent one.
- Declare closed modes and a rule per mode. If no authoritative state read exists, stop rather than simulate a lock, queue, assignment, or delivery state.
- Separate authority from evidence. A human-directed responsible parent decides scope and risk; reports and memory are evidence only.
- Verify remote effects by readback only when an actual runtime owns those effects. Never describe a fake rollback or live claim.
- Disposition of a live resource is never automatic and requires human authorization.
- Do not copy a child procedure into the orchestrator, and never implement the work it coordinates.

## Decision Gates

| Diagnosis | Action |
|---|---|
| Work occurs in the same turn and process | Use `chanks-0-skill-composer`, not an orchestrator. |
| Work occurs elsewhere and runtime/readback are real | Define bounded orchestration. |
| Runtime, state read, or readback is unavailable | Stop; return a human decision or use the generic parent/subagent flow without orchestration. |
| Coordination and implementation mix | Extract implementation to a child. |

## Execution Steps

1. Name the external runtime, its authority, and the safe outcome when it does not respond.
2. Define closed modes, authoritative state fields, and readback for each permitted remote effect.
3. Name the responsible parent, advisor, implementer, and the roles that cannot self-assign.
4. Write fail-closed gates before the happy path and preserve human decisions for disposal, scope, and risk.
5. List loaded child skills by route without duplicating their procedures.
6. Audit against `references/ejemplar.md`; publish no orchestration rule unsupported by a real control surface.

## Output Contract

Return runtime, modes, state read, readback/reversal contract, authority table, fail-closed gates,
children by route, and every rule that cannot be written because a required control surface is absent.

## References

- `../chanks-0-skill-composer/SKILL.md`
- `references/ejemplar.md`
