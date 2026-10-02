---
name: chanks-4-puente
description: "Trigger: Chanks etapa 4, entregar la Sesión elegida a Gentle AI, recibir el commit entregado. Hand the chosen Session to Gentle AI and receive its delivered commit as evidence for stage 5."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "6.0"
---

## Activation Contract

Stage 4 (implement and review) belongs to Gentle AI. The start is organic: once the human chooses
a `LISTO` Session, hand it over. There is no admission step and nothing here blocks writing. When
Gentle AI delivers, receive the commit and return it as evidence for stage 5. This skill
implements nothing, prescribes nothing about how the work is done, and never writes the plan.

## Hard Rules

- Hand over only what the plan declares: the same Session identity, the four-part Encargo, exact
  authorized files, Cimientos/Recurso and confirmed compatibility, approved decisions, and
  `solicitud_sdd` or a legacy `ruta` exactly as written. Never select work, widen scope, infer a
  lock, or write `openspec/plan.yaml` or its generated views.
- Gentle AI implements, tests, reviews and delivers under its own rules. Chanks adds none; if they
  collide, Gentle AI wins.
- For a native Encargo, Gentle AI keeps a native ODD technical record. It is subordinate evidence and
  does not become a second product plan. Reconcile record, code, and evidence on resume.
  Under historical legacy evidence, Módulos and Tareas stay as written; it never imposes Módulos on
  a native Session.
- V1 reserves nothing and tracks no "in progress" state: the Session stays `LISTO` until stage 5
  records its commit. Never mark, lock or reserve it.
- Only a delivered commit that resolves in Git is delivery evidence for stage 5. Accept it only
  with verified commit and completed-task evidence for the same Session; use
  `references/session-readiness.md`, never a promise or a second review.

## Decision Gates

| Evidence | Result |
|---|---|
| Human-chosen `LISTO` Session with compatible scope | Hand the Session over with the fields above. |
| Missing authority, drift, or incompatible scope | Stop and return the missing decision or evidence. |
| Gentle AI returns verified commit and completed-task evidence | Return the evidence for stage 5 (`chanks-5-session-doc`). |
| Evidence missing or unverifiable | Stage 5 stays pending; return the missing evidence or exact reason. |

## Execution Steps

1. Read the installed `radar sesion <ID>` and map its plan evidence to the exact authorized files and
   constraints above; leave plan authority with the parent.
2. Hand the Session to Gentle AI with its checkout and the Session-bound record locator from
   `references/session-readiness.md`.
3. Verify the returned commit and actual completed-task evidence against that same Session and
   checkout. On missing evidence, stage 5 stays pending.
4. Return the delivered commit, changed paths, the observed execution and checks as Gentle AI reported
   them, risks, and an exact parent-record delta conditioned on the parent's verification and closure
   authority.

## Output Contract

Return the Session identity, the native/legacy distinction, the handover fields, the delivered commit
with observed execution evidence as reported, the stage 5 handoff or pending reason, risks,
and the parent-record delta. Never write the plan
or treat Gentle AI's technical record as product progress.

## References

- `../chanks-0-agente-soporte/SKILL.md`
- `../chanks-5-session-doc/SKILL.md`
- `references/session-readiness.md`
