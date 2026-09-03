---
name: torre-control-entregas
description: "Trigger: Tower delivery token, ordered handoff, integration, or closure. Main assigns one bound token and enforces repository policy."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Activate when Main receives an immutable candidate from an approved worker assignment and must serialize delivery, integration, evidence, or closure. Planning, work selection, and implementation remain outside this skill.

## Hard Rules

- Main is the sole delivery-token issuer, queue coordinator, and target-branch mover; workers never self-assign or acquire the token directly.
- Keep exactly one active token. Bind it to assignment, worker, worktree, source branch, candidate commit and tree, target branch, and policy revision; never transfer, reuse, or broaden it.
- The worker prepares the candidate and evidence. With an approved brief, Main moves the branch; a worker may perform only an explicitly assigned policy action while holding its bound token.
- Read the repository delivery policy before interpreting readiness or expecting a pull request. Unknown, missing, or contradictory policy fails closed.
- For this repository, enforce `AGENTS.md`: direct commit and push to `master`, no pull request, no Notion, and no receipt-driven delivery gate.
- Re-read Git, remote, Tower, and documentation state after delivery. Release the token only after the observed result matches its frozen binding.
- Preserve independent Git and database evidence. One successful boundary never proves the other.

## Decision Gates

| Condition | Action |
|---|---|
| Candidate, assignment, policy, and evidence match | Queue the candidate under its assigned worker. |
| No token is active and the candidate is queue head | Issue one immutable token for that candidate. |
| Another candidate owns the token | Wait; never grant, steal, or duplicate it. |
| Candidate or policy changes after issue | Revoke the token and require a newly approved binding. |
| Delivery observation matches the binding | Record evidence, release the token, and advance the queue. |
| Any proof is missing or contradictory | Keep the token closed or held; report the exact discrepancy to Main. |

## Execution Steps

1. Read `AGENTS.md` and resolve the delivery shape, target branch, and authorizing party before evaluating the candidate.
2. Verify the approved assignment, worker, dependencies, resources, commit, tree, worktree, branch, and required proof.
3. Select the queue head and issue one token containing the complete immutable binding; report every waiting worker.
4. Coordinate the bound handoff: the worker returns its candidate evidence and Main performs the authorized target-branch movement and push.
5. Re-read local Git, remote Git, database evidence when applicable, and `openspec/plan.yaml`; reject stale or partial proof.
6. Record the result, release the token, advance the queue, and return closure only when every required proof is consistent.

## Output Contract

Return policy resolution, queue order, token state and complete binding, `worker | worktree | branch | candidate | state | blocker` per assignment, target-branch movement, remote observation, database proof, documentation proof, release evidence, and every fail-closed discrepancy.

## References

- `../../AGENTS.md`
- `../../profiles/tower/main.md`
- `../torre-control/SKILL.md`
