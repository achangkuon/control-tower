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
- [x] 5a. Register in `install.py` personal roster (`PERSONAL_SOURCE_DIRS`), with tests.
- [ ] 5b. Install on the maintainer machine after merging to `master` (`install.py`, then `--check`).

## Evidence

- Tasks 1-3 written by gentle-ai-worker; audit script exit 0 (frontmatter, sections, links, 116 cited ranges, 11 assets, README one-liner identical), `git diff --check` exit 0. SKILL.md body ~575 tokens.
- Build output folder set to `/home/emili/projects/control-tower/Releases/<TAG>` (maintainer decision relayed by the S210 session).
- Commit: `0b8f00e` (work-unit commit of tasks 1-4).
- Native review `review-9f4d49d1dfe00c0b` (medium, lens reliability): approved and acknowledged (authority burned). Advisory, non-blocking: `R3-sandbox-auth` at `references/publicar.md:42-44` (sandbox HOME exports in the test block); follow-up.

- Advisory `R3-sandbox-auth` fixed in `884bf69`: test blocks now run inside a subshell.
- Registration: RED 4 failures, GREEN 4 focused tests; `test_install.py` 188 pass, `test_builder_flow.py` 39 pass, `bun test agent-workflows` 356 pass; Tower bundle unchanged.
- Pre-existing/environmental, not regressions (verified against clean `master`): `control-tower-skill.test.mjs` needs `node_modules/yaml` absent in the worktree (master 552/0); `test_personal_pi_composition` fails on both trees (checkout-depth dependent prerequisites).
