# Agent Workflows

Version-controlled source of truth for the user-owned session workflow family.
This repository owns workflow routing, planning, support, and closure only.
Gentle AI owns SDD phase skills and orchestrator surfaces; this package does not
replace, edit, invoke, or regenerate those managed assets.

## Quick Path

```bash
cd /home/emili/projects/agent-workflows
python3 tools/install.py
python3 tools/install.py --check
python3 -m unittest discover -s tests -v
```

Restart Claude, OpenCode, Codex, and Pi sessions after installation so each
runtime reloads its skills and manual routing block.

## Routes

| Route | Meaning |
| --- | --- |
| `direct` | Fresh general implementation executor; no SDD phase. |
| `design-tasks` | Compact `session-plan` elaboration, then the same executor; no proposal/spec. |
| `full-sdd` | Managed `sdd-propose` -> `sdd-spec` -> `sdd-design` -> `sdd-tasks` -> `sdd-apply` -> `sdd-verify`, once per Sesión. |
| `blocked` | Stop and ask one maintainer decision. |

`session-kickoff` is the parent router. The other four skills remain focused
children and are loaded only when their responsibility applies.

## Installation

`tools/install.py` mirrors the five canonical skill directories to:

- `~/.agents/skills`
- `~/.claude/skills`
- `~/.config/opencode/skills`
- `~/.codex/skills`

It also installs the custom `SESSION-SKILL-ARCHITECTURE:MANUAL` block in the
Claude, OpenCode, Codex, and Pi instruction files. The block points back to
this repository's canonical `skills/session-kickoff/SKILL.md`.

The installer preserves every byte outside that custom block, refuses files
with missing or duplicate custom markers, and never invokes Gentle AI.

Use `--check` to fail when runtime copies drift. Use `--dry-run` to print the
planned changes without writing anything. Both modes accept `--home PATH` for
isolated verification.

Do not edit `sdd-*`, `_shared`, `gentle-orchestrator`, `opencode.json`, or any
content inside `<!-- gentle-ai:* -->` markers. Runtime copies are adapters and
discovery surfaces; this repository is the canonical source.

## Layout

```text
skills/                         canonical user-owned skills
templates/session-routing.md    manual routing block template
tools/install.py                install, check, and dry-run implementation
tests/test_install.py           focused standard-library tests
```
