# Agent Workflows

Version-controlled source of truth for the user-owned skill family: session
workflow routing, planning, support, closure, and the Control Tower delivery
skills. Gentle AI owns SDD phase skills and orchestrator surfaces; this package
does not replace, edit, invoke, or regenerate those managed assets.

These skills do **not** ship with Gentle AI. The `author: gentleman-programming`
frontmatter on several of them is a `skill-creator` template default, not
provenance. To verify what Gentle AI actually ships, grep its binary — it embeds
its own skills:

```bash
rg -c -a --fixed-strings "<skill-name>" "$(brew --prefix gentle-ai)/bin/gentle-ai"
```

Zero hits means the skill is owned here.

## Quick Path

New machine:

```bash
git clone git@github.com:achangkuon/agent-workflows.git
cd agent-workflows && ./tools/setup.sh
```

With no arguments it opens an interactive menu — install, update skills, update
the Tower, or diagnose — with a live status header. Flags drive the same actions
headlessly: `--install`, `--with-tower`, `--update`, `--check`, `--dry-run`.

Installing also creates the global command `torre-control`, so the menu opens from
anywhere afterwards. It is a launcher, not a copy — it execs the current
checkout, so `git pull` updates the tool with no reinstall step. `--link`
recreates it; `SETUP_LAUNCHER` renames it and `SETUP_BIN_DIR` relocates it.

The menu is plain Bash by design: no Go toolchain, no per-OS release pipeline,
nothing to install before it can install anything. It repaints on the alternate
screen buffer and caches its status block, because recomputing that block on
every keypress is what makes a shell menu stutter.

### Portability

Linux and macOS, Intel or Apple Silicon. It stays inside Bash 3.2 — the version
macOS still ships — and uses no GNU-only flags, so it needs no Homebrew Bash and
no coreutils. The one place the difference shows is the escape-sequence read:
Bash 3.2 rejects a fractional `read -t`, so `ESC_TIMEOUT` falls back to one
second there. Arrow keys are unaffected — their bytes are already buffered — and
`j`/`k` never touch that path.

Requirements are `git` and `python3`, plus `bun` and `jq` only for
`--with-tower`. Everything else is POSIX.

Already set up, editing skills:

```bash
python3 tools/install.py
python3 tools/install.py --check
python3 -m unittest discover -s tests -v
```

Restart Claude, OpenCode, Codex, and Pi sessions after installation so each
runtime reloads its skills and manual routing block.

### What `setup.sh` owns, and what it refuses to own

It installs exactly two things: the skills in this repository, and the Control
Tower from its own repository (opt-in, `--with-tower`). Each half keeps its own
installer — `tools/install.py` here, `install.sh` there — and `setup.sh` only
composes them in the safe order, least specific first.

**Gentle AI is checked, never installed.** It is a separate product with its own
binary, installer and update authority; installing it from here would fork its
release channel and defeat `gentle-ai sync`. A missing Gentle AI is a warning
with a pointer to its own instructions, not a failure.

**The Tower is opt-in on purpose.** These skills describe how work is done and
must keep working with the Tower absent — `torre-control-entregas` detects the
missing MCP itself and falls back to manual copy-paste handoff. Coupling the two
would make an optional product a prerequisite for a mandatory one.

`setup.sh` seeds the `SESSION-SKILL-ARCHITECTURE:MANUAL` block for the agents
this machine actually has, because `install.py` replaces that block but refuses
to invent it — it will not guess where in someone's instruction file the routing
belongs. Existing files are backed up and appended to, never rewritten.

### Absent runtimes are skipped

A machine rarely has all four agents. `MANUAL_FILES` and `runtime_skill_roots`
stay complete as the contract; `installed_manual_paths` and
`installed_skill_roots` narrow them to what is present. A runtime whose marker
directory is absent is skipped and never created. A runtime that IS present but
is missing its instruction file still fails closed — that is a broken install,
not an absent one.

## Radiografía

`radiografia/` is a project-agnostic engine that generates a self-contained HTML
product report, written to be read by someone who does not program. It is driven by a
committed `radiografia.json` in each project and fires from `.githooks/pre-push`, so it
runs identically for Claude Code, OpenCode, Codex, Pi and a human — the trigger is git,
not an assistant. It never blocks a push.

See `radiografia/README.md`. Adopted today by control-tower, ecom-ecuador,
Servi-Task-U and Finanzas-Personales.

## Routes

| Route | Meaning |
| --- | --- |
| `direct` | Fresh general implementation executor; no SDD phase. |
| `design-tasks` | Compact `session-plan` elaboration, then the same executor; no proposal/spec. |
| `full-sdd` | Managed `sdd-propose` -> `sdd-spec` -> `sdd-design` -> `sdd-tasks` -> `sdd-apply` -> `sdd-verify`, once per Sesión. |
| `blocked` | Stop and ask one maintainer decision. |

`session-kickoff` is the parent router. The other session skills remain focused
children and are loaded only when their responsibility applies.

## Skill families

| Family | Skills |
| --- | --- |
| Shared conventions | `_shared/plan-naming-convention.md` |
| Session workflow | `session-kickoff`, `session-plan`, `session-context-loader`, `planificador-granular`, `agente-soporte`, `session-doc` |
| Control Tower delivery | `torre-control-entregas`, `unattended-implementation`, `politica-de-entrega`, `coordinador_multi_agente` |
| Analysis and support | `architecture-audit`, `project-kickoff`, `big-files-remediation-loop`, `cierre-de-decisiones`, `explicalo-simple`, `skill-composer` |

### `_shared` is deliberately partial

`~/.claude/skills/_shared/` is a **mixed** directory: eight files are managed by
Gentle AI and one, `plan-naming-convention.md`, is owned here. This repository
therefore tracks only that one file. The installer copies per file and never
deletes, so it overlays the owned convention and leaves the Gentle AI files for
`gentle-ai sync` to manage. Do not add the managed files here — a frozen copy
would silently defeat their upstream updates.

### Tower on, Tower off

`torre-control-entregas` has two transports. With the `control-tower` MCP
connected it coordinates through real tools; without it, the same skill falls
back to manual copy-paste handoff. Installing these skills does not turn the
Tower on. Not configuring the MCP is the whole "off".

## Installation

`tools/install.py` mirrors the canonical skill directories to:

- `~/.agents/skills`
- `~/.claude/skills`
- `~/.config/opencode/skills`
- `~/.codex/skills`

It also installs the custom `SESSION-SKILL-ARCHITECTURE:MANUAL` block in the
Claude, OpenCode, Codex, and Pi instruction files. The block points back to
this repository's canonical `skills/session-kickoff/SKILL.md`.

The installer preserves every byte outside that custom block, refuses files
with missing or duplicate custom markers, and never invokes Gentle AI. Before
writing, it preflights every destination. Runtime skill roots may be created;
instruction files and their parent directories must already exist as regular
paths. Missing, wrong-type, symlinked, escaping, or managed-block-nested paths
raise `InstallError` and leave all destinations untouched.

Use `--check` to fail when runtime copies drift. Use `--dry-run` to print the
planned changes without writing anything. Both modes accept `--home PATH` for
isolated verification.

Do not edit `sdd-*`, the Gentle AI files inside `_shared`,
`gentle-orchestrator`, `opencode.json`, or any content inside
`<!-- gentle-ai:* -->` markers. Runtime copies are adapters and
discovery surfaces; this repository is the canonical source.

## Layout

```text
skills/                         canonical user-owned skills
templates/session-routing.md    manual routing block template
tools/install.py                install, check, and dry-run implementation
tests/test_install.py           focused standard-library tests
```
