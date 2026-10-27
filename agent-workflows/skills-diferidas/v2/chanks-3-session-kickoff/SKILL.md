---
name: chanks-3-session-kickoff
description: "Trigger: Chanks etapa 3, start session, continue session, resume session. Admit one approved Session from the installed Radar without selecting work."
license: Apache-2.0
metadata:
  author: emili
  version: "8.0"
---

## Activation Contract

Activate only for the named approved Session in its approved repository and branch. This skill
admits execution; it is not a new selection, a plan update, or a permission grant. Two or more
Sessions at once go through `chanks-3-paralelo`.

## Hard Rules

- Radar is the only admission binary: run the installed Radar (`$HOME/.local/bin/radar`), never a
  binary built or found in a repository checkout. Never read the plan directly or infer admission from a
  seal or from memory.
- Admission is two commands: `radar status --json -C <repo>` and `radar sesion <ID> -C <repo>`.
  `start` requires `LISTO`; `continue`/`resume` require `LISTO` or `EN CURSO` and the
  same Session identity. A native Encargo resumes by reconciling the native record, code, and evidence;
  a legacy Session resumes at first pending Módulo for legacy. There is no fallback from a rejected
  state: report state, blocker, and Zone-ordered `LISTO` choices only. The machine-readable form is
  `references/admission-contract.md`.
- Preserve Git contamination and shared-resource evidence; a forecast is not a live lock. Check exact
  authorized files and Cimiento/Recurso compatibility before mutation. Scope expansion needs human
  approval and fresh compatibility.

## Decision Gates

| Evidence | Result |
|---|---|
| Radar admits the Session, compatible scope/resources | Mark it if needed, then hand over to stage 4; announce 💪 only on successful transition. |
| Native resume | Reconcile same Session identity, native record, code, and evidence. |
| Legacy resume | Continue at first pending Módulo for legacy. |
| Rejected/stale admission or missing compatibility | Stop; never on refusal announce 💪 or claim execution authority. |

## Execution Steps

1. Verify approved identity, repository, branch, HEAD, and contamination against the handoff.
2. Run the two Radar commands and check the state and the resume basis.
3. Verify declared exact-file and Cimiento/Recurso compatibility. A declared Recurso needs
   confirmed exclusive or serial execution evidence; release only actual resources demonstrably
   acquired, never a fictitious lock.
4. If the Session is `LISTO` and its work happens in a dedicated worktree or in the primary checkout,
   run `radar marcar <ID> --worktree <absolute path of that checkout root>` so Radar reports
   `EN CURSO`. Radar refuses unless the Session is `LISTO`, the path is the absolute root of a
   checkout of this repository, and HEAD is on a branch that already has commits. A refusal stops the
   marking only: report its reason. Skip it when the Session is already `EN CURSO`.
5. Only on successful transition send the stage 4 handoff to the responsible parent and
   `chanks-4-puente`, including the marked checkout and the Session-bound record locator from
   `../../../skills/chanks-4-puente/references/session-readiness.md`; announce 💪. Never on refusal.

## Output Contract

Return repository/branch/HEAD, contamination, Radar state, native or legacy resume basis,
compatibility, the `radar marcar` result, any human decision, and the stage 4 handoff. State that no
plan, lock, topology, or delivery authority was created.

## References

- `references/admission-contract.md`
- `chanks-0-agente-soporte` — source in the machine-setup repository since S244
- `../../../skills/chanks-4-puente/SKILL.md`
- `../../../skills/chanks-4-puente/references/session-readiness.md`
- `../../../skills/chanks-3-paralelo/SKILL.md`
