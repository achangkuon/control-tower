---
name: chanks-0-agente-soporte
description: "Trigger: Chanks soporte de planificación, brief de planificación, capacidad y conflictos entre Sesiones, evidencia de radar. Provide read-only planning evidence to a responsible parent."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "7.0"
---

## Activation Contract

Activate for planning evidence, compatibility/conflict analysis, or a concise brief. This helper is
read-only: it advises the responsible parent and never becomes a dispatcher, plan writer, or peer gate.

## Hard Rules

- Read plan state only through `$HOME/.local/bin/radar status --json -C <repo>` and
  `$HOME/.local/bin/radar sesion <ID> -C <repo>`. Never open the plan/generated view, never execute a repository binary,
  or fall back from a Radar rejection.
- A repository with no `openspec/plan.yaml` has not adopted plan management, which is a human choice
  and not a fault. Say what the request needs it for, offer to start adoption, and stop. Never
  improvise a substitute record or adopt it without the human saying yes.
- Radar remains product authority; no ODD document or Engram record changes plan status. Admission
  to start, continue or resume a Session is stated once, in `../chanks-3-session-kickoff/SKILL.md`.
- Preserve human choice for scope, files, risks, authority, and contradictions. Compatible seats
  are a parallel-safety verdict (§13), not a live lock, assignment, or topology instruction.
- Do not implement, deliver, dispatch, create external sessions, or mutate planning data.

## Parallel Alternatives From The Snapshot

When the request is what could run in parallel — resuming work, planning a batch, or choosing among
`LISTO` alternatives — read it from the `compatibilidad` and `escenarios` arrays of
`radar status --json`. Never parse a rendered view for these facts, and never recompute them.

- `compatibilidad` carries one verdict per combination of current `LISTO` Sesiones: `compatible`,
  `cimiento-compartido`, `solapa-archivos`, `recurso-excluyente`, or `indeterminado`, each with the
  exact files or resources in `detalle`. Sharing a Zona is not a conflict; a shared Cimiento is a
  condition of coordinated intervention, not a veto.
- `indeterminado` means a side did not declare its exact files. Report it as unknown. An undeclared
  scope is never read as empty or safe, and never as a compatible combination.
- `escenarios` separates the two claims people conflate: `desbloquea` is whose declared dependencies
  a closure would satisfy, and `quedan_listo` is who would actually derive to `LISTO` under every
  criterion and the active priority. `siguen_sin_abrir` carries the state and the reason for the rest.
- Each Sesión row also carries its `archivos`, `cimientos`, `recurso`, and `depende_de`, which are
  the declarations every verdict above is derived from.

All of this is a forecast over the current plan and base. It reserves nothing, assigns no agent,
grants no access, and does not change what admission allows. `radar roadmap` renders the same
evidence for a person to read; it is never the machine path and never an authority.

## Decision Gates

| Request | Action |
|---|---|
| Context, capacity, or conflict | Return cited Radar/Git evidence. |
| Native Session preparation | Route evidence to `chanks-2-planificador-granular`. |
| Confirmed plan change | Return exact old/new delta and authority to the responsible parent. |
| Incomplete files or scope expansion | Return human approval plus fresh compatibility requirement. |
| Missing/contradictory authority | Stop with the named human decision package. |
| Approved Session ready for stage 4 | Issue one bounded implementation handoff; do not dispatch or assign an agent. |

## Execution Steps

1. Capture trusted Radar and repository evidence.
2. Distinguish native Encargo coordination from legacy historical Module evidence.
3. Report dependencies, exact-file/Cimiento/Recurso compatibility, risks, and unresolved human choices.
4. Issue one bounded implementation handoff using `assets/assignment-implementation.md` only when the
   human-approved Session passed admission and a selected implementer is identified; issuance is not
   dispatch, delivery, or plan mutation.
5. Return only a preconditioned proposed delta; the responsible parent records confirmed plan evidence.

## Output Contract

Return sources, the Radar state and Zone-ordered `LISTO` choices relevant to the request,
capacity/conflicts, brief, issued bounded implementation handoff when approved, proposed delta, human
decisions, and evidence gaps. Seats, queues, and choices never assign agents. State that Radar is
product authority and the responsible parent records changes.

## References

- `assets/brief-diario.md`
- `assets/assignment-implementation.md`
- `../chanks-3-session-kickoff/SKILL.md`
