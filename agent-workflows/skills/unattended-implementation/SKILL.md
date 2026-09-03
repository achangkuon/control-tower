---
name: unattended-implementation
description: "Trigger: unattended implementation, sealed execution, overnight apply, modo nocturno, me voy a dormir, me voy al gym, dejá los agentes trabajando. Seal approved work into a zero-decision contract for Tower or standalone runtime."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.2"
---

## Activation Contract

Activate after approved SDD tasks exist and before unattended Tower dispatch. Seal exactly one approved Sesión — the canonical plan level that fits in ONE pull request — into an immutable, zero-decision execution contract; never implement, deliver, or choose missing policy.

Also activate when the maintainer announces leaving while agents keep working. That route runs the night pre-flight in `references/night-mode.md` and emits a night contract over one or more sealed Sesiones; it never changes what sealing means.

## Hard Rules

- Load child skills only for the active route: `agente-soporte` for normalized facts/transport, `chained-pr` for planning-only chain semantics, `work-unit-commits` for freeze-only boundaries, and `sdd-apply` for exact implementation. In Tower mode, use only the active project's registered Tower authority; this repository neither supplies nor installs one.
- Validate against `assets/execution-contract.schema.json` and every semantic gate in `references/sealing-and-routing.md`. Reject omissions, placeholders, contradictions, implicit continuation, or unresolved decisions as `NOT_READY` before dispatch.
- Treat the sealed contract and its artifact digests as immutable input. Runtime may perform only listed effects on the exact repository, worktree, branch, base SHA, and Sesión/task IDs.
- Never acquire or transfer `git-delivery`; never authorize amend, rebase, tag, merge, release, deploy, DB mutation, global closure, or an unlisted Sesión in any mode. In `tower` mode commit, push, and PR are equally forbidden — delivery belongs to the token holder. In `standalone` they are bounded by `delivery_ceiling`, which never exceeds a draft PR.
- Resolve `runtime_mode` from a real `tower_status` read and load exactly one runtime: `tower` on live `active-supervision`, else `standalone` per `references/runtime-standalone.md`. Sealing and every gate above are mode-independent; never duplicate them per mode. An absent, stale, or mismatched Tower is `standalone` declared with its evidence — never `BLOCKED`, never a simulated `tower_*` call.
- Terminate only at `READY` or `BLOCKED`: Tower-reported in `tower`, file-recorded in `standalone`.
- Permit at most two sealed-scope implementation corrections before final required verification. Its first failure is terminal `BLOCKED`; permit zero retries or corrections afterward. In night mode that verdict is terminal for its own Sesión only and never ends the window.
- Complement the Tower; never join it. Produce documents and end the turn — nothing of this skill is live overnight. Never `tower_register`, `tower_set_state`, or `tower_acquire`; never relay a question; never write inside a repository worktree.
- Keep scope and reachability in separate artifacts. The sealed contract carries scope and is immutable; the night contract carries reachability, budget, and window and stays mutable Tower-held policy. Never re-seal because the maintainer's availability changed.

## Decision Gates

| Condition | Result |
|---|---|
| Contract and semantic gates complete | Seal digest; dispatch exact Sesión. |
| Any fact, ownership, policy, or choice unresolved | `NOT_READY`; do not dispatch. |
| Scope named with a banned plan-level noun (`WU`, `slice`, `fase`, …) | `NOT_READY`; require a positional Sesión ID. |
| `tower_status` reports live `active-supervision` | `runtime_mode: tower`; supervision-only Tower runtime. |
| Tower absent, stale, or supervision mismatched | `runtime_mode: standalone`; load `references/runtime-standalone.md`. Not `BLOCKED`. |
| Tower live but contradicts the sealed contract | `BLOCKED`; preserve evidence. Never downgrade to standalone to escape it. |
| First final required verification fails | `BLOCKED`; no retry, correction, or continuation. |
| Terminal candidate passes, attended | Check READY slot then: free means stage exact candidate and `READY`; occupied means preserve exact candidate/evidence and `BLOCKED`. |
| Terminal candidate passes, night mode | Freeze the candidate for the wake report; never contend for the READY slot. |
| Night pre-flight gate fails | `NOT_READY` naming the specific fix, so the maintainer can unblock it and still leave. |
| `delayed` reachability without notification transport | `NOT_READY`; offer `unreachable` instead. |
| Window would outlast `expires_at` | Do not start that Sesión; close the window clean. |

## Execution Steps

1. Load `agente-soporte`; collect normalized facts without asking Support to seal.
2. Load `chained-pr` in planning-only mode when chain semantics apply, then `work-unit-commits` in freeze-only mode. Resolve every field before sealing.
3. Validate schema and semantic gates; compute the canonical contract digest. Return `NOT_READY` on any failure.
4. Resolve `runtime_mode` from a real `tower_status` read and record it in the contract with its evidence.
5. Transport only the approved sealed contract. Load `sdd-apply` with its exact base/target/Sesión map, plus the project-registered Tower authority in supervision-only mode (`tower`) or `references/runtime-standalone.md` (`standalone`).
6. Enforce pre-final retry/correction limits, run final required verification once, and stop at `READY` or `BLOCKED` within the mode's `delivery_ceiling`.

On the night route, run `references/night-mode.md` first: declare the tier, clear the six pre-flight gates, and emit `GO` or `NOT_READY` with its fix list before any sealing. Then seal every admitted Sesión and hand the parking and wake-report policy to the agents.

## Output Contract

Return `status: NOT_READY|READY|BLOCKED`, `runtime_mode: tower|standalone` with the evidence that resolved it, `delivery_ceiling`, contract digest, Sesión/task IDs, candidate identity/evidence when present, blockers, terminal state, and `skill_resolution: paths-injected`.

## References

- `assets/execution-contract.schema.json`
- `references/sealing-and-routing.md`
- `references/night-mode.md`
- `references/runtime-standalone.md`
- `../_shared/plan-naming-convention.md`
- `../agente-soporte/SKILL.md`
- `../chained-pr/SKILL.md`
- `../work-unit-commits/SKILL.md`
- `../sdd-apply/SKILL.md`
