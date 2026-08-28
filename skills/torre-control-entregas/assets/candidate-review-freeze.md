# Candidate Freeze

Replace every placeholder. Send only when the `git-delivery` token is free. This handoff ends at `READY`.

```text
CANDIDATE FREEZE: <UNIT_ID>

Assigned worktree: <ASSIGNED_WORKTREE>
Branch: <BRANCH>
Discovered base: <REMOTE_BASE_REF>@<BASE_SHA>
Allowed staged scope: <PATHS_AND_FILE_MODES>
Required tests/evidence: <TESTS_AND_EVIDENCE>
Review mode: <ordinary|judgment-day>
Review lens (ordinary only): <review-risk|review-reliability|review-resilience|review-readability|none>

Do not manipulate worktrees. Do not commit, push, open a PR, or merge.

1. Verify worktree, repository, branch, and cwd; fetch the discovered remote and compare the current remote-base SHA to approved `<BASE_SHA>`.
2. If the base advanced or differs, or alignment would change candidate bytes, paths, or modes, STOP without aligning. Return both base SHAs and the candidate identity to Tower for recalculation and renewed approval.
3. Proceed only when the approved base and staged bytes/paths/modes remain exact. Re-run the required non-mutating checks and record evidence. If formatting, generation, normalization, conflict resolution, or any source mutation is needed, STOP: all of that belongs before the freeze, never after.
4. If mode is `judgment-day`, load `~/.claude/skills/judgment-day/SKILL.md` and follow that protocol under the same exclusive queue ownership. Tower never runs the reviewers. Return rounds, findings counts, artifacts, and verdict.
5. If mode is `ordinary`, run the named review lens as a read-only sub-agent and report its findings. Findings are advisory input for the maintainer, not an automated gate.
6. STOP. Leave the candidate staged and uncommitted, byte-identical to what you verified. Set `tower_set_state(state: "READY", note: "candidato congelado, esperando token")`.

STOP on base drift, conflict, failed required check, unrelated staged content, or any request to alter the candidate. Never commit or deliver from this handoff — the green light is a separate message.

Return: staged paths and modes, staged diff/stat, base SHA compared, tests with exact results, review findings summary, evidence path, blockers, and `READY: candidate frozen, staged and uncommitted`.
```
