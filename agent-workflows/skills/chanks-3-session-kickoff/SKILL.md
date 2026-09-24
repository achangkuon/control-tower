---
name: chanks-3-session-kickoff
description: "Trigger: start session, continue session, resume session. Revalidate an approved Session without selecting work."
license: Apache-2.0
metadata:
  author: emili
  version: "6.0"
---

## Activation Contract

Activate after a human-approved Session handoff in the approved repository and branch. Admit the
named Session only; never select a ready row, dispatch a worker, or write plan evidence.

## Organic Pi Admission

Fresh Radar admission is the only planning/admission evidence. In Pi, a per-repository switch
(`pi-switch.mjs`, off by default, refused `on` without `openspec/plan.yaml`) decides whether
Chanks controls apply at all, re-read on every tool call rather than once at load. With the
switch off, or with no plan, Pi works exactly as before — every call passes straight through
with no question and no block, and this section does not apply.

With the switch on, the generated extension (`agent-workflows/chanks/pi-admission.mjs` +
`pi-authority.mjs`) builds the admission itself from git and the installed Radar — no external
envelope, no separate host process. Reading always works; Bash without a key runs inside a
read-only confinement; Write and Edit are blocked until a key is active. Once active, the key is
purely referential: it identifies, for the Main agent, which Session (or planning) this Pi is
working, and blocks nothing — every tool call passes through exactly as if this extension were
absent. It is not a sandbox and it is not a guard against a mistaken write; it is a name tag:

- After the human confirms starting, continuing, or resuming the named Session in this skill's
  own admission steps below, the agent calls the `chanks_request_activation` tool with
  `{kind: "session", sessionId: "<the Session ID>"}`. Pi's own question shows the Session,
  repository, files, Cimientos, resources, and base commit. Only the human's exact acceptance in
  that question activates the key.
- The model can request the key but can never answer Pi's question or flip the switch. A
  decline, a missing UI, or invalid/stale evidence leaves writes blocked with no fallback. The
  key survives HEAD advancing (the agent's own commits) and any plan row changing later — it is a
  fixed reference, not a live confinement. It drops when the Pi session shuts down, reloads, or
  is replaced; when the repository root or worktree differs; or when the switch is turned off.
- A brand-new activation request (a different Session, or the planning key from
  `chanks-1-autoridad`/`chanks-2-planificador-granular`) replaces whichever key was active
  before it, the same way this skill's own resume replaces a stale admission.

## Hard Rules

- Receive Radar evidence only through `../chanks-0-agente-soporte/SKILL.md`. Never read the plan
  directly, execute a repository binary, or fall back when installed Radar rejects admission.
- Require the host's fresh bundle bound to current `HEAD`, Session ID, and SHA-256 digests of exact
  `radar status --json` and `radar sesion <ID>` stdout. The host recaptures both commands immediately.
- `start` requires `LISTO`. `continue`/`resume` accept `LISTO` or `EN CURSO` only under the
  contract discriminator: native Encargo uses same Session identity reconciliation; legacy uses
  first pending Módulo for legacy. Rejected states return only state, blocker, and Zone-ordered
  LISTO choices; there is no fallback from a rejected state.
- Preserve Git contamination and actual shared-resource evidence. Forecasts are never live locks.
- Revalidate scope only against declared exact files. Expanded scope/files require human approval
  and fresh compatibility before affected mutation.
- ODD is native default. Do not choose SDD; preserve only an explicit human `solicitud_sdd`.

## Decision Gates

| Evidence | Result |
|---|---|
| Fresh admission and native Encargo | Reconcile same identity, native record, code, and evidence. |
| Fresh admission and legacy contract | Resume at first pending Módulo for legacy. |
| Missing/stale/mismatched admission | Stop and return permitted non-admissible evidence. |
| Scope/resource conflict or authority gap | Stop with human decision/compatibility evidence. |

## Execution Steps

1. Verify the host-attested repository, branch, HEAD, and Git contamination against the handoff.
2. Require the host's immediate recapture of both Radar commands and identical SHA-256 digests of exact output bytes.
3. Validate admission, then reconcile native record, code, and evidence under the same Session identity; legacy resumes from first pending Módulo for legacy.
4. Confirm exact-file and Cimiento/Recurso compatibility before mutation. A declared Recurso requires confirmed exclusive or serial execution evidence; release only actual resources demonstrably acquired, and report rather than acquire a fictitious lock.
5. Return the admissible execution evidence to the responsible parent and bridge. Do not write a route revalidation for native ODD.

## Output Contract

Return repository/branch/HEAD, exact contamination, admission binding, native or legacy resume
basis, compatibility evidence, human decision needed, and bridge handoff. State explicitly that
no plan, lock, topology, or delivery authority was created.

## References

- `../chanks-0-agente-soporte/SKILL.md`
- `../chanks-4-puente/SKILL.md`
