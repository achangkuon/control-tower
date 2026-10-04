# torre-release skill

Personal maintainer skill for changing and releasing the Tower (`product/tower/v1`).
One skill, two lazily loaded parts: change-impact map and release procedure.

- Branch: `feat/torre-release-skill` (worktree `Worktrees/torre-release-skill`, base `1fc2286`).
- Source: `agent-workflows/skills-personales/torre-release/`.
- Out of scope now: registering it in `agent-workflows/tools/install.py` and installing it
  into runtime directories (propagation is deferred until the S210 agent finishes).

## Tasks

- [x] 1. Write `SKILL.md` router (activation, hard rules, phase decision table, output contract).
- [x] 2. Write `references/impacto.md` (what to update when a Tower change touches each surface).
- [x] 3. Write `references/publicar.md` (ordered release procedure, 11 assets, gotchas).
- [x] 4. Verify frontmatter, size budget, local references and path:line citations; commit.
- [ ] 5. Deferred: register in `install.py` personal roster and install (propagation).

## Evidence

- Tasks 1-3 written by gentle-ai-worker; audit script exit 0 (frontmatter, sections, links, 116 cited ranges, 11 assets, README one-liner identical), `git diff --check` exit 0. SKILL.md body ~575 tokens.
- Build output folder set to `/home/emili/projects/control-tower/Releases/<TAG>` (maintainer decision relayed by the S210 session).
- Commit: recorded in the work-unit commit of this branch.

