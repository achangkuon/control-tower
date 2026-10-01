<!-- AGENT-PROPAGATION-MAP:MANUAL -->
## Propagating a change to the other agents

The maintainer's own skills have one editable source: `agent-workflows/skills/`
in the owning repository. Any agent can edit that source within authorized scope.
Installed runtime files are not the source of truth.

| Agent | Personal instructions | Own skills after installation |
|---|---|---|
| Claude Code | `~/.claude/CLAUDE.md` | Relative links in `~/.claude/skills/` to the central folder |
| Codex | `~/.codex/AGENTS.md` | Native discovery of `~/.agents/skills/` |
| OpenCode | `~/.config/opencode/AGENTS.md` | Native discovery of `~/.agents/skills/` |
| Pi | `~/.pi/agent/APPEND_SYSTEM.md` | Native discovery of `~/.agents/skills/` |
| Hermes | `~/.hermes/SOUL.md` | `skills.external_dirs` configured for `~/.agents/skills/` by an authorized migration |

`~/.agents/skills/` holds the single real installed copy of each own skill.
Gentle AI assets are managed independently by `gentle-ai`; this repository never
copies, replaces or synchronizes them. Third-party skills are outside its roster.
The owned `_shared/plan-naming-convention.md` remains a per-runtime file overlay.

1. **Prepare in the repository.** Change only the authorized own skill sources or
   targeted personal-block templates. Equivalent personal rules can differ across
   runtimes; preserve unrelated content and do not invent an absent block.
2. **Ask before installing.** Source edits are not permission to write personal
   instruction files, reinstall skills, or restart sessions. Explain affected
   runtimes and restart consequences; obtain explicit maintainer authorization.
3. **Install and verify.** Run `python3 agent-workflows/tools/install.py` from the
   owning repository, then the same command with `--check`. Hermes discovery and
   migration use their separate authorized helper. Do not propagate by deleting
   and recopying runtime directories. Verify managed bytes are unchanged.
4. **Protect restore snapshots.** Read manual-backup drift before refreshing the
   current snapshot; never restore an older snapshot over corrected instructions.
   Preserve historical backups. Test discovery in a fresh conversation per agent;
   do not report installation or fresh-session proof from source tests alone.

Project rules live in the repository's `AGENTS.md`; they are not copied into
personal instructions. Never quote complete managed marker tags in a manual
block: name them in words so a later managed sync cannot mistake them for tags.
<!-- /AGENT-PROPAGATION-MAP:MANUAL -->
