---
name: session-plan
description: "Trigger: technical readiness or compact technical elaboration for a named Sesión. Verify root cause, refine existing Tareas, and recommend an execution route."
license: Apache-2.0
metadata:
  author: emili
  version: "2.1"
---

## Activation Contract

Activate only when `session-kickoff` or `planificador-granular` names an existing
Sesión and requests readiness or `design-tasks` technical elaboration: verified root
cause, affected paths, reusable patterns, design decisions, Tarea amendments, or
route advice. Generic session start/continue belongs to `session-kickoff`; approved-
scope decomposition belongs to `planificador-granular`.

## Hard Rules

- Investigate exactly one already-enumerated Sesión; read its authority and `Área` first.
- Verify root causes and design constraints in the code. Report evidence, paths, and symbols.
- Do not create or rename a Plan, Sesión, Módulo, or Tarea; do not split work by time or invent a one-PR boundary.
- Amend existing Tareas only. Do not create/rename hierarchy, proposal/spec, criteria, history, or expand `Área`.
- Persist exactly one compact Engram record with exactly these sections: `verified root cause`; `blocking technical question`; `decision+authority`; `discarded alternatives`; `affected paths`; `exact Task/test amendments`; `authored-line/commit forecast`.
- Do not resolve maintainer decisions. Apply contamination location: block the Session for criteria/first-Módulo contamination; park only an affected later Módulo.

## Decision Gates

| Condition | Action |
|---|---|
| Sesión ID or authority is absent | Stop and report the missing input. |
| Discovery proves no technical elaboration is needed | Mandatory downshift to `direct`; persist the evidence-only compact record. |
| One bounded technical question can be decided within current authority | Keep `design-tasks`; amend exact existing Tasks/tests in the compact record. |
| Behavior/lifecycle/shared-contract design is required within approved Session boundaries | Mandatory upshift to `full-sdd`; do not author decomposition here. |
| Authority is missing/stale, evidence contradicts, or an escalating decision contaminates criteria/first Módulo | Mandatory `blocked`; do not substitute documentation for approval. |

## Execution Steps

1. Load the named Sesión, authority reference, `Área`, `Decisiones`, existing Módulos/Tareas, and current status.
2. Inspect only affected paths; verify the root cause and isolate the single blocking technical question.
3. Decide within cited authority or classify the unresolved decision and its contamination. Record discarded alternatives, not a design narrative.
4. Amend exact existing Task/test text only when staying `design-tasks`; preserve IDs, hierarchy, criteria, history, and `Área`.
5. Forecast authored additions+deletions and independently revertible ≤400-line commit boundaries.
6. Persist exactly one compact Engram record with the seven required sections, then return the mandatory downshift, unchanged route, upshift, or block result.

## Output Contract

Return the Sesión ID, one Engram key, the seven required record sections, exactly
one route result (`direct`, `design-tasks`, `full-sdd`, or `blocked`) with reason,
parked later Módulo when applicable, and `skill_resolution: paths-injected`. Return
no proposal/spec, new hierarchy/criteria/history, duplicate task list, or `Área` expansion.

## References

- `../_shared/plan-naming-convention.md`
- `../planificador-granular/SKILL.md`
- `../session-kickoff/SKILL.md`
