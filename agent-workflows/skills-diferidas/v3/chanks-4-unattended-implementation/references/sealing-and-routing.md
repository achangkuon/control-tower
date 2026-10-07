# Standalone sealing and routing

## Authority map

| Concern | Authority |
|---|---|
| Planning evidence | `chanks-0-agente-soporte` returns read-only evidence. |
| Readiness and sealing | `chanks-4-unattended-implementation` validates and seals one dependency-ordered mandate of `LISTO` plan Sessions. |
| Dispatch | `chanks-3-despacho-herdr` assigns each mandated Session its Pi worker, worktree, and `work/<ID>` branch, with the Torre off, and carries the seal inside its own handoff. |
| Admission | Each dispatched worker's own `chanks-3-session-kickoff` run supplies its fresh admission bundle before it edits anything. |
| Implementation | Each dispatched worker implements its sealed Session with ODD; `solicitud_sdd` is the only exception, and only on explicit human request. |
| Plan evidence | The responsible parent records confirmed evidence; only Main writes `openspec/plan.yaml`. |

A child returns facts to its caller. No child creates a peer, external session, live claim, queue,
or delivery action.

## Mandate shape

The sealed unit is a **mandate**: an ordered list of dependency steps. Each `mandate.steps[]` entry
has an explicit `step` number and one or more `sesiones`, and each Session declares its own
`sesion_id`, `worker`, and `work/<ID>` branch plus today's Radar digests, `listo_confirmed`,
`unresolved_escalating_decision`, and `solicitud_sdd`. The repository block and every permission,
ownership, artifact, execution, and retry policy are shared across the whole mandate.

The **ordered steps ARE the declared dependency** order: a Session in step `N` starts only after
every Session in steps `< N` reached `COMPLETED` and integrated its commit. Sessions in the same
step are independent: they may be dispatched and run in parallel. A single mandate-wide
`expires_at` governs every step and every Session: no step and no Session declares its own expiry,
and a per-Session expiry is `NOT_READY`.

## Seal gate

Validate the JSON schema, then return `NOT_READY` if any predicate fails:

1. Every `mandate.steps[].sesiones[].sesion_id` names a real plan Session; every
   `radar_status_stdout_sha256` and `radar_sesion_stdout_sha256` in that Session is the exact
   SHA-256 of its command's stdout bytes, captured immediately before sealing. `listo_confirmed`
   and `unresolved_escalating_decision` reflect that fresh read, never a cached or remembered one,
   for every Session.
2. The mandate order is explicit and well formed: step numbers are exactly 1..N with no gap or
   repeat, and every step carries at least one Session. No `sesion_id` repeats across the mandate,
   and each Session carries its own `worker` and `work/<ID>`-shaped `branch`.
3. Repository identity and root, `base_ref`, and the 40-character `base_sha` are exact and shared
   by every Session.
4. Each `mandate.steps[].sesiones[].solicitud_sdd.requested` is `false` unless the human explicitly asked for the SDD
   exception for that Session, in which case its `evidence` carries their one- or two-line request.
   ODD applies in every other case.
5. `execution.delivery_ceiling` is `commit` (each Session commits only on its own `work/<ID>`
   branch) or `none`, and it applies to every Session; `permissions.prohibitions.commit` matches it
   exactly, and every other prohibition — push, PR create/update, merge, release, deploy, database
   mutation, global closure, `openspec/plan.yaml` writes, and any Sesión outside the mandate —
   stays `true`.
6. `review_policy` is inert in V2-pending state. The schema still requires it, so it carries its
   fixed legacy constants, but it grants and declines nothing: the human answers every Gentle AI
   consent envelope, and a worker that meets one stops that Session. Do not change the schema
   here; retiring these fields is a follow-up.
7. Read/edit/command allowlists are bounded to the mandate's declared scope; every command matches
   the allowlist pattern — repo test/check commands, `git`, and `radar`.
8. The single mandate-wide `expires_at` is explicit. JSON Schema validates its shape but cannot prove that `expires_at` is later than `sealed_at`,
   nor that it is before the human's declared return; the runtime semantic check compares those instants before any dispatch. Any changed
   base, scope, permission, step order, or decision requires a new seal and approval.
9. No required human decision, scope ambiguity, contradictory evidence, or Git contamination
   affecting the base remains unresolved.

Reject placeholders, alternatives, implicit continuation, or prose that delegates a choice to the
worker.

## Dispatch and imprevistos

`chanks-3-despacho-herdr` advances only inside the sealed mandate: it follows the
declared step order, dispatches one step at a time, and never selects, derives, or appends a Session
the human did not seal. Sessions inside one step may be dispatched and run in parallel.

An imprevisto — a crash, an uncertain send, a Session that stopped being `LISTO`, a new decision, a
moved base, or a contradictory identity — stops the affected Session only and preserves it as
`BLOCKED` with its evidence. Sessions in the same step that do not depend on it continue
independently; every later step depends on the stopped step, so it does not start.
Nothing continues the mandate by inference, and no Session is chosen outside the original list.

## Worker revalidation after dispatch

`chanks-3-despacho-herdr` writes its own `radar.despacho/v1` marker after a confirmed handoff, at
`<git-common-dir>/chanks/despachos/<ID>.json`. That marker is what turns the dispatched Session from
🟢 `LISTO` to 🔵 `EN CURSO` in Radar — the seal's own dispatch, not drift — so the dispatched
worker's independent revalidation tolerates exactly that one change and nothing else:

1. HEAD, that Session's `work/<ID>` branch, worktree, and `base_sha` still match the seal exactly;
   no tolerance here.
2. The marker file exists, is a regular file, never a symlink, and its `sesion`, `branch`
   (`refs/heads/work/<ID>`), `worktree` (absolute), and `worker` match the seal/handoff exactly.
   A missing or mismatched marker grants nothing — the byte-for-byte rule below applies with no
   tolerance, same as before dispatch.
3. Take the fresh `radar sesion <ID>` stdout, replace its single `Estado:` line with the sealed
   `Estado: 🟢 LISTO` line, and hash the result: it must equal `radar_sesion_stdout_sha256`.
   Exactly one `Estado:` line may differ, and only from `LISTO` to `EN CURSO`; a second differing
   line, a different transition, or a missing `Estado:` line invalidates the seal.
4. `radar_status_stdout_sha256` proves only the snapshot Radar showed at seal time; the worker
   never recompares it after dispatch. Instead it requires that a fresh `radar status --json`
   lists this Session `EN CURSO` with no blocker.
5. Every other check in the seal gate above — mandate expiry, permissions, delivery ceiling, and
   rejection of any other drift (encargo text, files, decisions, base) — is unchanged and still
   invalidates the seal on any mismatch.

Before dispatch, with no marker on disk, both digests still match byte-for-byte with zero
tolerance, exactly as the seal gate above requires.

## Immutable seal

Canonicalize the mandate — repository/base identity, the ordered steps with each Session's
`sesion_id`, `worker`, `branch`, and Radar digests, the shared policies, and the human's decisions,
without `contract_digest` — compute SHA-256, insert the digest, and obtain human approval for that
exact digest. A summary is not execution authority. The output is a standalone sealed mandate only:
it neither launches work nor authorizes dispatch or delivery.

## Required evidence

Return contract ID/digest and the single mandate expiry; repository/base (`base_sha` doubles as the
rollback boundary); the ordered steps and every mandated `sesion_id`/`worker`; each Session's two
Radar stdout digests; `solicitud_sdd` status per Session; the sealed delivery ceiling; required
verification commands; human approval; and blockers.
Preserve all available evidence when not ready or blocked.
