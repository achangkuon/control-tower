---
name: chanks-4-unattended-implementation
description: "Trigger: V2 only; explicitly requested chanks-4-unattended-implementation, unattended implementation, sealed execution, overnight apply or modo nocturno. Seal one LISTO Session for a dispatched Pi worker; never launch it."
disable-model-invocation: true
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "4.0"
---

## Activation Contract

V2 only. Load this skill only when the human explicitly names it or explicitly asks for
unattended or sealed execution. For ordinary parallel work use `chanks-3-paralelo`. Chanks
decides what is worked on and what runs in parallel; Gentle AI decides how it is implemented,
reviewed and delivered, and nothing in this skill overrides Gentle AI. The seal never answers a
Gentle AI consent envelope on the human's behalf. The `review_policy` fields in the schema are
inert in V2-pending state: the schema still requires them with their fixed legacy values, they
carry no authority, and the worker never applies them.

Activate only for a Session that is already 🟢 `LISTO` in the installed Radar. The unit of work is
exactly one plan Session (`openspec/plan.yaml`, read through `radar sesion <ID>`), executed with
Organic Driven Development — never a separately authored task list. This skill validates
preconditions, collects the human's standing decisions once, and seals a standalone, zero-decision
approval; it never implements, dispatches a worker, starts a session, or delivers anything itself.

Native SDD (`solicitud_sdd`) is the sole exception, and only with an explicit human request recorded
as one or two lines of evidence; absent that, ODD applies without exception.

Unattended is a **mode of Chanks stage 3 (Despachar)**: it changes how a `LISTO` Session gets its
one dispatch decision made in advance, not how many stages Chanks has. Stage 4 (Implementar y
revisar, owned by Gentle AI) runs exactly as it would attended, just without a human present to
ask. There is no separate unattended stage and no 7-stage numbering.

## Hard Rules

- The approved contract IS the plan Session: read `radar sesion <ID>` verbatim (Encargo,
  Cimientos, Recurso, `archivos`, `decisiones`) and never re-author it. Do not invent scope,
  criteria, or task IDs the Session does not declare.
- Require the Session to be `LISTO` in a fresh `radar status --json` and `radar sesion <ID>`, with
  no unresolved escalating decision contaminating its outcome, its first required work, or another
  Session. `radar` failing closed is a `NOT_READY` cause, not something to route around.
- Validate `assets/execution-contract.schema.json` and `references/sealing-and-routing.md` before
  returning `READY`.
- Collect the human's standing decisions exactly once, at seal time: delivery ceiling and
  `expires_at`. The worker must not ask either again mid-run.
- Default delivery ceiling is `commit` — commits land only on the Session's own `work/<ID>`
  branch. Push, merge, PR creation/update, and integration to master stay with Main at Chanks
  stage 5, with the human present. `none` (no commits at all) is the only other allowed value.
- The human decides every Gentle AI consent envelope. A consent envelope, a correction it cannot
  make, or any decision stops that Session; the worker answers none of them on the human's behalf.
- `expires_at` must be explicit and, per the human's own statement, before their declared return.
- On any question outside the sealed scope, including a consent envelope or a correction it cannot
  make, the worker stops that Session only and leaves one self-contained decision block (question,
  evidence, options with consequences, class, checkpoint); other dispatched Sessions continue
  independently.
- Never invoke Tower or another coordination API; never start a session, dispatch an agent, create
  a worktree, claim a lock, create a queue, or simulate a wake/terminal result.
- Never commit, amend, rebase, tag, push, create/update a PR, merge, release, deploy, mutate a
  database, write `openspec/plan.yaml`, or alter global closure. Delivery beyond the sealed
  ceiling is never inferred, and the sealed contract never degrades into a looser one.
- The sealed record only prepares a dispatch; it does not perform one. Dispatch — worker
  assignment, worktree, branch, the Herdr/Intercom handoff — is `chanks-3-despacho-herdr`'s job,
  with the Torre off. If the base moves before dispatch, the seal is stale and needs a fresh one.
- Do not depend on Pi's activation key/click (`chanks_request_activation`); it is being retired.
  The dispatched worker's own `chanks-3-session-kickoff` run supplies its own fresh admission.
- Worker-side revalidation after dispatch tolerates exactly one drift: `chanks-3-despacho-herdr`'s
  own `radar.despacho/v1` marker turning this Session from `LISTO` to `EN CURSO`, only when the
  marker matches the seal's Session, branch, worktree, and worker exactly. See
  `references/sealing-and-routing.md` for the exact byte-for-byte match rule; every other drift
  still invalidates the seal.
- On a question or risk discovered while sealing (not while running), stop and return it to the
  human-directed responsible parent.

## Decision Gates

| Condition | Result |
|---|---|
| Session `LISTO`, no unresolved escalating decision, contract and schema gates complete | Return sealed standalone approval at `READY`. |
| Session not `LISTO`, ownership, policy, scope, or a human choice unresolved | `NOT_READY`; name the exact missing evidence. |
| Unresolved escalating decision or Git contamination affecting the base | `NOT_READY`; preserve evidence and require parent/human resolution. |
| `solicitud_sdd` requested without the human's one/two-line evidence | `NOT_READY`; ODD remains the default until that evidence exists. |
| Required verification evidence fails | `BLOCKED`; preserve evidence without a retry route. |

## Execution Steps

1. Fetch a fresh `radar status --json` and `radar sesion <ID>`; confirm 🟢 `LISTO` and no
   unresolved escalating decision touching this Session's outcome, its first required work, or
   another Session.
2. Collect the human's standing decisions once: delivery ceiling and `expires_at`. Fill the
   schema's inert `review_policy` fields with their fixed constants. Reject a placeholder, an
   alternative, or prose that defers any of them to the worker.
3. Validate the schema and semantic gates; return `NOT_READY` on any failure.
4. Canonicalize the contract — repository/branch/base identity, the two Radar stdout digests, and
   the human's decisions, without `contract_digest` — compute its SHA-256, insert it, and obtain
   human approval for that exact digest.
5. Return the sealed approval to the responsible parent. Do not launch, dispatch, or contact a
   worker; `chanks-3-despacho-herdr` carries the seal inside its own handoff when the human later
   selects this Session for dispatch.

## Output Contract

Return `status: NOT_READY|READY|BLOCKED`, `contract_digest`, `sesion_id`, exact
repository/branch/base, the sealed delivery ceiling, `expires_at`,
required verification, blockers, and `skill_resolution: paths-injected`. State plainly that this
is a standalone sealed approval, not an active runtime, a dispatch, or a delivery authorization.

## References

- `assets/execution-contract.schema.json`
- `references/sealing-and-routing.md`
- `references/night-mode.md`
- `references/runtime-standalone.md`
- `../_shared/plan-naming-convention.md`
- `../chanks-0-agente-soporte/SKILL.md`
- `../chanks-3-despacho-herdr/SKILL.md`
- `../chanks-3-despacho-herdr/assets/worker-handoff.md` — the full sealed worker handoff
- `../chanks-3-session-kickoff/SKILL.md`
- `../chanks-3-paralelo/SKILL.md` — the V1 route for ordinary parallel work
- `../sdd-apply/SKILL.md` — only for the explicit human `solicitud_sdd` exception; ODD never loads it.
