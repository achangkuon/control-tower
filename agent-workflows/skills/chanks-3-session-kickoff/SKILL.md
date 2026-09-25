---
name: chanks-3-session-kickoff
description: "Trigger: start session, continue session, resume session. Revalidate an approved Session without selecting work."
license: Apache-2.0
metadata:
  author: emili
  version: "7.0"
---

## Activation Contract

Activate only for the named approved Session in its approved repository and branch. This skill
admits execution, not a new selection, worker dispatch, plan update, or runtime permission grant.

## Hard Rules

- Obtain fresh admission from installed Radar via `../chanks-0-agente-soporte/SKILL.md`;
  never execute a repository binary, read the plan directly, or infer admission from a seal.
  Bind the named approved Session, repository, branch, current HEAD, and SHA-256 digests of
  exact stdout bytes from `$HOME/.local/bin/radar status --json -C <repo>` and
  `$HOME/.local/bin/radar sesion <ID> -C <repo>`. Recapture both at kickoff; reject drift.
- `start` needs `LISTO`; `continue`/`resume` need `LISTO` or `EN CURSO` plus the contract
  discriminator. Native Encargo reconciles the same Session identity with native record, code,
  and evidence. Legacy resumes at first pending Módulo for legacy. There is no fallback from a
  rejected state: report state, blocker, and Zone-ordered LISTO choices only.
- Preserve Git contamination and shared-resource evidence; a forecast is not a live lock.
  Check exact authorized files and Cimiento/Recurso compatibility before mutation. Scope expansion
  needs human approval and fresh compatibility. ODD is default; SDD needs explicit human
  `solicitud_sdd`.
- S159 owns Pi runtime write-unblocking; admission here does not assert it is implemented.

## Decision Gates

| Evidence | Result |
|---|---|
| Fresh matching admission, compatible scope/resources | Transition to stage 4 execution handoff; announce 💪 only on successful transition. |
| Native resume | Reconcile same Session identity, native record, code, and evidence. |
| Legacy resume | Continue at first pending Módulo for legacy. |
| Rejected/stale admission or missing compatibility | Stop; never on refusal announce 💪 or claim execution authority. |

## Execution Steps

1. Verify approved identity, repository, branch, HEAD, and contamination against the handoff.
2. Recapture installed Radar's exact stdout and digest both results; check state and resume basis.
3. Verify declared exact-file and Cimiento/Recurso compatibility. A declared Recurso needs confirmed
   exclusive or serial evidence; release only resources demonstrably acquired, not fictitious locks.
4. Only on successful transition send the stage 4 execution handoff to the responsible parent and
   `chanks-4-puente`; announce 💪. Never on refusal. Do not create a native ODD route revalidation.

## Output Contract

Return repository/branch/HEAD, contamination, admission binding, native or legacy resume basis,
compatibility, any human decision, and stage 4 handoff. State that no plan, lock, topology,
Pi runtime write-unblocking, or delivery authority was created.

## References

- `../chanks-0-agente-soporte/SKILL.md`
- `../chanks-4-puente/SKILL.md`
