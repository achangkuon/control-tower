# Adoption (load on adoption intent)

Adopt the public V1 skill as a project-local instruction, rather than adding a host-specific runtime layer. First confirm that the project is trusted and that the human wants this skill available there; adoption is not approval to start product work. Keep the entry contract in `control-tower` and leave product coordination to the project's existing authority.

Pi discovers project skills from `.agents/skills/` only for trusted projects and uses its native subagent mechanism for in-session delegation. Claude Code reads project skills from `.claude/skills/`, follows `CLAUDE.md` (not `AGENTS.md`), and uses its native subagents. Install or expose this one skill using the host's normal project-skill location; no router, role profiles, or managed blocks in host instruction files are required. Do not assume that a skill visible in one host is automatically available in the other.

On a question about adoption, explain these boundaries in free text. If adoption would write project files, obtain approval for the destination and scope first. Return to the entry contract for any later product-work selection.
