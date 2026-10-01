---
name: chanks-4-puente
description: "Trigger: Chanks etapa 4, entregar la Sesión admitida a Gentle AI, recibir el commit entregado. Hand the admitted Session to Gentle AI and receive its delivered commit as evidence for stage 5."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "5.0"
---

## Activation Contract

Stage 4 (implement and review) belongs to Gentle AI. After admitted kickoff, hand the Session over;
when Gentle AI delivers, receive the commit as evidence for stage 5. This skill executes nothing,
prescribes nothing about how the work is done, and never writes the plan.

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
- Only a delivered commit that resolves in Git is delivery evidence for stage 5.

## Decision Gates

| Evidence | Result |
|---|---|
| Admitted Session with compatible scope | Hand the Session over with the fields above. |
| Missing authority, drift, or incompatible scope | Stop and return the missing decision or evidence. |
| Gentle AI reports a delivered commit | Return it with the observed evidence for `chanks-5-session-doc`. |

## Execution Steps

1. Map the admitted plan evidence to the exact authorized files and constraints above; leave plan authority
   with the parent.
2. Hand the Session to Gentle AI.
3. Return the delivered commit, changed paths, the observed execution and checks as Gentle AI reported
   them, risks, and an exact parent-record delta conditioned on the parent's verification and closure
   authority.

## Output Contract

Return the Session identity, the native/legacy distinction, the handover fields, the delivered commit
with observed execution evidence as reported, risks, and the parent-record delta. Never write the plan
or treat Gentle AI's technical record as product progress.

## References

- `../chanks-3-session-kickoff/SKILL.md`
- `../chanks-0-agente-soporte/SKILL.md`
