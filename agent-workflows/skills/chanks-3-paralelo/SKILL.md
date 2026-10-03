---
name: chanks-3-paralelo
description: "Trigger: parallel sessions, work several sessions at once, trabajar sesiones en paralelo, lote paralelo. Propose a compatible lot of LISTO Sessions, get human approval, and delegate each Session to a subagent in its own worktree."
license: Apache-2.0
metadata:
  author: emili
  version: "2.0"
---

## Activation Contract

Chanks decides what runs in parallel. Gentle AI decides how each Session is implemented, reviewed
and delivered; if they collide, Gentle AI wins. Load this skill only when the human wants two or
more `LISTO` Sessions worked at the same time. One Session alone needs no parallel machinery: hand
it to Gentle AI through `chanks-4-puente`.

In V1 the whole lot lives inside one conversation and you are the orchestrator: you delegate each
approved Session to a subagent, coordinate them, integrate and deliver their results, and close
each Session.

## Hard Rules

- Radar never selects work and neither do you. Propose; the human chooses.
- Unknown, `indeterminado`, omitted or colliding is not parallel-safe. Never guess a pair is fine.
- `radar roadmap` is a forecast: evidence, never permission.
- V1 reserves nothing and tracks no "in progress" state: a Session stays `LISTO` until its delivery
  commit is recorded. What is in progress is known only from this conversation, so Radar does not
  warn when another conversation takes the same Session. Work a lot from one conversation only.
- This skill prescribes nothing about implementation, tests, review, consent or commits.
  Those belong to Gentle AI inside each worktree.

## Steps

1. **Read compatibility.** Run the installed `radar status --json`.
   - `sesiones[]`: candidates are entries with `estado` `LISTO`.
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
3. **Re-read each approved contract** with the installed `radar sesion <ID>` and confirm fresh
   `radar status --json` still supports the lot; never read `openspec/plan.yaml` whole. If evidence
   changed, report it and stop the affected handoff rather than substituting another Session.
   **Give each approved Session its own worktree:** one git worktree on its own branch, under the
   user's home as a sibling of the repository (never under `/tmp`). A worktree that cannot be
   created stops that Session only; report the reason and continue with the others.
4. **Delegate.** One Gentle AI subagent per approved Session. Hand over only the Session ID, the
   `radar sesion <ID>` output (Encargo and authorized files), the worktree path, and the request to
   name the ODD feature document `odd/tasks/<id>.md` or `odd/tasks/<id>-<feature>.md` with the
   lowercase Session ID as prefix; see `../chanks-4-puente/references/session-readiness.md`.
5. **Receive.** Check each returned verified commit and completed-task evidence through
   `chanks-4-puente`. Missing evidence leaves that Session pending and never changes the rest of
   the approved lot.
6. **Integrate and deliver serially.** You, the orchestrator, integrate one Session at a time,
   following the repository's own delivery policy. Then close it in stage 5
   (`chanks-5-session-doc`) and remove that Session's worktree.

## Resuming

Radar shows nothing in progress. Resume from this conversation's own record: the approved lot,
each Session's worktree and its ODD feature document. Reuse the existing worktree; do not create
a new one.

## Non-goals

Session reservation, dispatch markers and several independent conversations delivering at once arrive with V2 (Pista).
Herdr, Pi Intercom, seat pools and sealed or unattended execution are V3 (`chanks-3-despacho-herdr`); this skill never loads them.

## Output Contract

Report the proposed lot with pair classes, the human's approved IDs, each Session's worktree and
branch, each subagent's returned commit, the integration order and result, and any Session left
pending with its reason.
