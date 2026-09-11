---
name: chanks-3-session-kickoff
description: "Trigger: start session, continue session, resume session. Revalidate an approved Sesión in the current repository and branch without selecting work."
license: Apache-2.0
metadata:
  author: emili
  version: "5.0"
---

## Activation Contract

Activate after a human-approved Sesión handoff. Work in the user-approved current repository and
branch; do not require a named seat, a peer role, or an external runtime.

## Hard Rules

- This work reads the plan through `../chanks-0-agente-soporte/SKILL.md`. A repository with no `openspec/plan.yaml` has not adopted plan management: say what this step needed it for, offer to start one, and stop. Never improvise a substitute record.
- Receive the named Sesión; never select work or search for the first ready item.
- Perform the four arrival steps and stop on a failed precondition.
- Revalidate only by opening the real scoped code in the Área and using the three canonical routes.
- Do not write plan data, create a live lock, or invoke an external coordination API.
- Preserve Git contamination as evidence. The responsible parent and human choose whether it is acceptable, isolated, or blocking.

## Decision Gates

| Evidence in the scoped code | Result |
|---|---|
| Contract and execution determined | `direct` |
| Bounded technical design missing | `design-tasks` |
| Behavior or shared contract needs design | `full-sdd` |
| Authority/evidence missing or contradictory | Return non-executable evidence; do not invent a route. |

## Execution Steps

1. **Verify terrain:** confirm the current repository, `HEAD`, current branch, and worktree state against the approved handoff. Report Git contamination exactly; do not clean or hide it.
2. **Revalidate route:** open the scoped code in the Área, load `../chanks-2-planificador-granular/references/juicio-de-ruta.md`, and compare the proposal once.
3. **Return delta:** build `ruta.revalidacion` with result, Git base, evidence, and a reason when it changes; return it to the responsible parent.
4. **Surface shared-path risk:** for a declared `Recurso`, require confirmed exclusive or serial execution evidence before mutation. A forecast is not a live lock; never invent an acquisition. release only actual resources that this work demonstrably acquired, and return that release evidence to the responsible parent.

## Output Contract

Return approved handoff, current repository and branch evidence, `HEAD`, exact Git contamination,
proposed/revalidated route, evidence, route delta, shared-path risk, human choice required for
scope/risks, and the evidence for the responsible parent.

## References

- `../chanks-2-planificador-granular/references/juicio-de-ruta.md`
- `../chanks-0-agente-soporte/SKILL.md`
- `../chanks-4-puente/SKILL.md`
