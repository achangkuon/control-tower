---
name: crear-agente
description: "Trigger: crear un agente, agente especializado, nuevo agente de Pi, perfil de agente, agente como Chanks Creativo. Build a specialized Pi agent: toolbox repo, profile, launcher."
license: Apache-2.0
metadata:
  author: achangkuon
  version: "1.0"
---

## Activation Contract

Load when the owner wants a new specialized agent (creative, research, sales, support...) built on Pi
with its own identity, skills and launcher. Do not load to edit an existing agent's single skill.

## Hard Rules

- An agent has 4 pieces: **toolbox repo** (identity + skills, in Git), **Pi profile** (model, sign-ins,
  MCPs), **launcher** (alias), **scope** (macro or tied to one project). Build all four, nothing else.
- Never touch another agent's profile, alias or skills. Sharing a skill with another agent is a
  separate owner decision, one skill at a time.
- Ask one question at a time. Close name, scope and skill list before writing anything.
- Create a profile ONLY from an empty directory: gentle-shell provisions and registers a home on
  its first launch only when it is empty. Copying a profile leaves it unregistered.
- `APPEND_SYSTEM.md` in the profile is a regular-file copy of the repo original, never a symlink:
  Gentle AI writes blocks there and rejects links.
- Vendored skills: scan for scripts and risky commands before committing; record each origin.
- Back up `~/.zshrc` before adding the alias. Never print credentials; `chmod 600` copied auth files.
- GitHub repo is private and only on the owner's request.

## Decision Gates

| Question | Choice |
|---|---|
| Works on any project, focused on the current folder | Macro: alias stays in the cwd, identity says "read this project's AGENTS.md first" |
| Belongs to one business/project | Project-bound: alias `cd`s into its workshop, toolbox lives inside that project |
| Skill already exists elsewhere | Copy it into `skills/<area>/` and note the origin |
| Needs an MCP the base profile lacks | Add it to the profile's `mcp.json` only |

## Execution Steps

1. Interview: name, purpose, scope (gate above), skill areas, tools that spend money, base profile to
   copy sign-ins from (default `~/.pi/agent-ecom`, GLM via NaN). Propose the structure; wait for approval.
2. Follow `references/receta.md` step by step: toolbox repo, skills, profile, launcher.
3. Smoke-test in print mode: the agent states its identity, finds two named skills and the key MCP.
4. Commit the toolbox; offer the private GitHub repo.

## Output Contract

Report in plain Spanish for a product owner: the table of the 4 pieces with paths, how to launch it,
smoke-test result, what was not touched, risks and how to undo (remove the alias line, delete the
profile and repo).

## References

- `references/receta.md` — exact commands and file layout, proven building Chanks Creativo.
