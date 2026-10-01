---
name: chanks-3-paralelo
description: "Trigger: parallel sessions, work several sessions at once, trabajar sesiones en paralelo, lote paralelo. Propose a compatible lot of LISTO Sessions, get human approval, and give each Session its own worktree."
license: Apache-2.0
metadata:
  author: emili
  version: "1.0"
---

## Activation Contract

Chanks decides what runs in parallel. Gentle AI decides how each Session is implemented, reviewed
and delivered; if they collide, Gentle AI wins. Load this skill only when the human wants two or
more `LISTO` Sessions worked at the same time. One Session alone goes through
`chanks-3-session-kickoff`.

## Hard Rules

- Radar never selects work and neither do you. Propose; the human chooses.
- Unknown, `indeterminado`, omitted or colliding is not parallel-safe. Never guess a pair is fine.
- `radar roadmap` is a forecast: evidence, never permission.
- This skill prescribes nothing about implementation, tests, review, consent or commits.
  Those belong to Gentle AI inside each worktree.

## Steps

1. **Read compatibility.** Run the installed `radar status --json`.
   - `sesiones[]`: candidates are entries with `estado` `LISTO`. `EN CURSO` ones are already marked.
   - `compatibilidad[]`: one entry per `LISTO` pair (`a`, `b`, `clase`, `motivo`, `detalle`). `clase` is
     `compatible` (disjoint files, no shared Cimiento or Recurso), `cimiento-compartido` (only with
     coordinated intervention on that exact file; tell the human), `solapa-archivos`,
     `recurso-excluyente` or `indeterminado`. Only `compatible` pairs may share a lot;
     `cimiento-compartido` pairs cannot share a lot in V1. Every pair in the lot must be `compatible`.
   - `escenarios[]` and `asientos[]` are forecasts of what unblocks and what capacity exists.
2. **Propose a lot** of compatible `LISTO` Sessions, in Zona order, with each pair's `clase` and
   `motivo`. Then STOP and wait for the human to approve the exact Session IDs. That approval is
   the explicit authorization Gentle AI requires for parallel writers in isolated worktrees.
   Never substitute, add or drop a Session after approval.
3. **Mark each approved Session.** Create one git worktree on its own branch, under the user's
   home as a sibling of the repository (never under `/tmp`), then run
   `radar marcar <ID> --worktree <absolute path>`. The Session now shows `EN CURSO`.
   Radar refuses to mark a Session that collides with one already `EN CURSO` or reuses a worktree
   or branch: a refusal is expected protection, not an error to work around. A refusal stops that
   Session only; report its reason and continue with the others.
4. **Dispatch.** One Gentle AI subagent (or a separate agent terminal) per marked Session. Hand
   over only the Session ID, the `radar sesion <ID>` output (Encargo and authorized files), the
   worktree path, and the request to name the ODD feature document `odd/tasks/<id>-<feature>.md`
   with the lowercase Session ID as prefix, because Radar's stage 5 looks for exactly one
   `odd/tasks/<id>*.md` in the marked worktree.
5. **When a Session's work reports finished:** `radar marcar <ID> --listo`.
6. **Integrate serially**, one Session at a time, following the repository's own delivery policy.
   Closing is stage 5 (`chanks-5-session-doc`). After closure run `radar desmarcar <ID>` and
   remove that Session's worktree.

## Resuming

`radar status` lists `EN CURSO` Sessions first. Resume each from its marked worktree; do not
create a new one.

## Non-goals

Herdr, Pi Intercom, seat pools and sealed or unattended execution are V2 (`chanks-3-despacho-herdr`); this skill never loads them.

## Output Contract

Report the proposed lot with pair classes, the human's approved IDs, each Session's worktree and
branch, each `radar marcar` result, and any Session stopped by a refusal.
