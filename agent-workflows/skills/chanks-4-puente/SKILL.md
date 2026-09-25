---
name: chanks-4-puente
description: "Trigger: ejecutar Sesión, traducir plan a SDD, actualizar plan desde SDD. Translate evidence in both directions without writing the plan."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "4.0"
---

## Activation Contract

After admitted kickoff, translate plan → authorized execution constraints, then observed execution →
preconditioned parent-record delta. Do not execute, coordinate topology, or write the plan.

## Hard Rules

- Carry only the same Session identity, HEAD and exact Radar stdout digests, exact authorized files,
  Cimientos/Recurso and confirmed compatibility, approved decisions, and runtime/worker binding.
  Never select work, widen scope, infer a lock, or write `openspec/plan.yaml` or its generated views.
- Native Encargo uses a native ODD technical record; it does not become a second product plan.
  Reconcile record, code, and evidence on resume. Historical legacy evidence can retain Módulos
  and Tareas; it never imposes Módulos or their commit cadence on native ODD.
- Forward Strict TDD only when explicitly configured: observed RED before implementation,
  GREEN and focused checks after it. Never infer mode from test presence.
- Stage 4 RDD applies per work-unit commit, including the final pending unit before closure;
  follow native review policy, consent, and provider fallback. The review outcome never authorizes delivery.
  Actual delivery follows ordinary delivery policy, not bridge evidence.
- For native Encargo, native SDD is exclusive to explicit human `solicitud_sdd`. An authorized
  legacy `full-sdd` route also goes to Gentle AI's existing native SDD controls. Delegate both
  through native SDD preflight, authority, and archive controls; never embed a preparation recipe
  or self-authorize a route.

## Decision Gates

| Evidence | Result |
|---|---|
| Fresh compatible native Encargo | Forward ODD execution constraints and configured checks. |
| Explicit human `solicitud_sdd` | Hand over to native SDD controls; retain Session identity. |
| Authorized legacy `full-sdd` | Route to Gentle AI's existing native SDD controls, preserving legacy authority. |
| Other historical legacy contract | Preserve its evidence distinction; no native ODD Módulo cadence. |
| Missing authority, drift, or incompatible scope | Stop and return the missing decision/evidence. |

## Execution Steps

1. Map admitted plan evidence to exact execution constraints; leave plan authority with the parent.
2. Forward configured TDD and RDD boundaries to the executor without granting delivery.
3. Return observed execution, checks, review outcomes, actual delivery evidence if any, and an exact
   parent-record delta conditioned on the parent's verification and closure authority.

## Output Contract

Return Session/worker binding, native/legacy distinction, constraints, observed execution,
RED/GREEN/check evidence, review and delivery evidence separately, risks, and parent-record delta.
Never write the plan or treat ODD continuity as product progress.

## References

- `../chanks-3-session-kickoff/SKILL.md`
- `../chanks-0-agente-soporte/SKILL.md`
