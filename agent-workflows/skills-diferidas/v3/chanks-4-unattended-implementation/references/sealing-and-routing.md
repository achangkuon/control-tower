# Standalone sealing and routing

## Authority map

| Concern | Authority |
|---|---|
| Planning evidence | `chanks-0-agente-soporte` returns read-only evidence. |
| Readiness and sealing | `chanks-4-unattended-implementation` validates and seals one `LISTO` plan Session. |
| Dispatch | `chanks-3-despacho-herdr` assigns a Pi worker, worktree, and branch, with the Torre off, and carries the seal inside its own handoff. |
| Admission | The dispatched worker's own `chanks-3-session-kickoff` run supplies its fresh admission bundle before it edits anything. |
| Implementation | The dispatched worker implements the sealed Session with ODD; `solicitud_sdd` is the only exception, and only on explicit human request. |
| Plan evidence | The responsible parent records confirmed evidence; only Main writes `openspec/plan.yaml`. |

A child returns facts to its caller. No child creates a peer, external session, live claim, queue,
or delivery action.

## Seal gate

Validate the JSON schema, then return `NOT_READY` if any predicate fails:

1. `session.sesion_id` names a real plan Session; `session.radar_status_stdout_sha256` and
   `session.radar_sesion_stdout_sha256` are the exact SHA-256 of that command's stdout bytes,
   captured immediately before sealing. `listo_confirmed` and `unresolved_escalating_decision`
   reflect that fresh read, never a cached or remembered one.
2. Repository identity and root, the `work/<ID>`-shaped branch, `base_ref`, and the 40-character
   `base_sha` are exact.
3. `session.solicitud_sdd.requested` is `false` unless the human explicitly asked for the SDD
   exception, in which case `session.solicitud_sdd.evidence` carries their one- or two-line
   request. ODD applies in every other case.
4. `execution.delivery_ceiling` is `commit` (commits confined to the Session's own `work/<ID>`
   branch) or `none`; `permissions.prohibitions.commit` matches it exactly, and every other
   prohibition — push, PR create/update, merge, release, deploy, database mutation, global
   closure, `openspec/plan.yaml` writes, and any Sesión outside the sealed one — stays `true`.
5. `review_policy` is inert in V2-pending state. The schema still requires it, so it carries its
   fixed legacy constants, but it grants and declines nothing: the human answers every Gentle AI
   consent envelope, and a worker that meets one stops that Session. Do not change the schema
   here; retiring these fields is a follow-up.
6. Read/edit/command allowlists are bounded to this Session's declared scope; every command
   matches the allowlist pattern — repo test/check commands, `git`, and `radar`.
7. `expires_at` is explicit. JSON Schema validates its shape but cannot prove that `expires_at` is later than `sealed_at`,
   nor that it is before the human's declared return; the runtime semantic check compares those
   instants before any dispatch. Any changed base, scope, permission, or decision requires a new
   seal and approval.
8. No required human decision, scope ambiguity, contradictory evidence, or Git contamination
   affecting the base remains unresolved.

Reject placeholders, alternatives, implicit continuation, or prose that delegates a choice to the
worker.

## Worker revalidation after dispatch

`chanks-3-despacho-herdr` writes its own `radar.despacho/v1` marker after a confirmed handoff, at
`<git-common-dir>/chanks/despachos/<ID>.json`. That marker is what turns this Session from
🟢 `LISTO` to 🔵 `EN CURSO` in Radar — the seal's own dispatch, not drift — so the dispatched
worker's independent revalidation tolerates exactly that one change and nothing else:

1. HEAD, the `work/<ID>` branch, worktree, and `base_sha` still match the seal exactly; no
   tolerance here.
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
5. Every other check in the seal gate above — expiry, permissions, delivery ceiling, and rejection of any other drift (encargo text, files, decisions, base) — is
   unchanged and still invalidates the seal on any mismatch.

Before dispatch, with no marker on disk, both digests still match byte-for-byte with zero
tolerance, exactly as the seal gate above requires.

## Immutable seal

Canonicalize the contract without `contract_digest`, compute SHA-256, insert the digest, and
obtain human approval for that exact digest. A summary is not execution authority. The output is a
standalone sealed approval only: it neither launches work nor authorizes dispatch or delivery.

## Required evidence

Return contract ID/digest and expiry; repository/branch/base (`base_sha` doubles as the rollback
boundary); `sesion_id`; the two Radar stdout digests; `solicitud_sdd` status; the sealed delivery
ceiling; required verification commands; human approval; and blockers.
Preserve all available evidence when not ready or blocked.
