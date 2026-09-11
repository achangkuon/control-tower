---
name: chanks-4-unattended-implementation
description: "Trigger: unattended implementation, sealed execution, overnight apply, modo nocturno. Prepare one standalone sealed approval without starting external sessions."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Activate only after approved SDD tasks exist. Seal one approved Sesión into a standalone,
zero-decision approval contract. This skill prepares evidence; it never implements, delivers,
starts external sessions, or invokes an external coordination tool.

## Hard Rules

- Validate `assets/execution-contract.schema.json` and `references/sealing-and-routing.md` before returning `READY`.
- The sealed contract and digests are immutable input. Any changed scope, base, artifact, permission, or decision requires a new human approval.
- Require one named Sesión, explicit task IDs, exact repository/branch/base, bounded read/edit/command permissions, and binary acceptance/verification evidence.
- Reject omissions, placeholders, contradictions, implicit continuation, unresolved decisions, shared-path conflicts, or unapproved delivery effects as `NOT_READY`.
- Never invoke Tower or another coordination API; never start external sessions, dispatch agents, create a worktree, claim a lock, create a queue, or simulate a runtime result.
- Never commit, amend, rebase, tag, push, create/update a PR, merge, release, deploy, mutate a database, or alter global closure.
- On a question or risk outside the sealed scope, stop and return it to the human-directed responsible parent.

## Decision Gates

| Condition | Result |
|---|---|
| Contract and semantic gates complete | Return sealed standalone approval at `READY`. |
| Fact, ownership, policy, scope, or human choice unresolved | `NOT_READY`; name the exact missing evidence. |
| Shared path or Git contamination invalidates the base | `NOT_READY`; preserve evidence and require parent/human resolution. |
| Required verification evidence fails | `BLOCKED`; preserve evidence without a retry route. |

## Execution Steps

1. Collect approved task, repository/base, artifacts, scope, prohibited effects, checks, and rollback boundary.
2. Validate the schema and semantic gates; return `NOT_READY` on any failure.
3. Canonicalize the contract, compute its digest, and obtain human approval for that exact digest.
4. Return the sealed approval and its handoff evidence to the responsible parent. Do not launch or contact another session.

## Output Contract

Return `status: NOT_READY|READY|BLOCKED`, contract digest, Sesión/task IDs, exact repository/base,
permissions, required verification, blockers, and `skill_resolution: paths-injected`. State that
this is a standalone sealed approval, not an active runtime or delivery authorization.

## References

- `assets/execution-contract.schema.json`
- `references/sealing-and-routing.md`
- `references/night-mode.md`
- `references/runtime-standalone.md`
- `../_shared/plan-naming-convention.md`
- `../chanks-0-agente-soporte/SKILL.md`
- `../chained-pr/SKILL.md`
- `../work-unit-commits/SKILL.md`
- `../sdd-apply/SKILL.md`
