# Recipe: specialized Pi agent

Proven on 2026-10-26 building Chanks Creativo (`~/projects/chanks-creativo/Main`,
profile `~/.pi/agent-creativo`, alias `chanks-creativo`). Replace `<name>` and `<base>`.

## 1. Toolbox repo

```
~/projects/<name>/Main/
├── APPEND_SYSTEM.md   identity: who it is, how it works per project, skills, tools, limits
├── README.md          how to launch, layout, skill origin table, how to add a skill
└── skills/<area>/     one folder per area (web/, video/, ...); Pi discovers SKILL.md recursively
```

- Identity for a macro agent: "read the current folder's AGENTS.md/README first; what you create
  stays in that project, never in the toolbox; project rules win". Add money gates for paid tools.
- Copy skills with `cp -rL` (resolve links). Third-party: `npx -y skills@latest add <pkg> --list`
  to inspect, then copy. Check duplicates:
  `find skills -name SKILL.md -exec grep -m1 '^name:' {} \; | sort | uniq -d`.
- Scan: `find skills -type f ! -name '*.md'` and grep for `curl .*| *sh`, `rm -rf`, `eval(`, `base64 -d`.
- `git init -b main` and commit.

## 2. Pi profile (order matters)

```bash
P=~/.pi/agent-<name>; B=~/.pi/<base>
mkdir -p $P   # must be EMPTY
cd /tmp && PI_SKIP_VERSION_CHECK=1 gentle-shell --home $P -p "ok"   # auto-provisions; "No API key" here is expected
grep -c "agent-<name>" ~/.gentle-shell/config.json                  # must be 1 (registered)
for f in auth.json models-store.json mcp-auth.json web-search.json subagents.json; do cp -a $B/$f $P/$f; done
chmod 600 $P/auth.json $P/mcp-auth.json
cp ~/projects/<name>/Main/APPEND_SYSTEM.md $P/APPEND_SYSTEM.md      # copy, never symlink
```

- Merge `settings.json` with Python: keep the provisioned `npmCommand` and `extensions`; copy the
  other base keys (`defaultProvider`, `defaultModel`, `defaultThinkingLevel`, theme...) except
  `lastChangelogVersion`; `packages` = provisioned + base packages that are missing.
- Copy the base `mcp.json` and add only the extra servers (for example genmedia:
  `{"command": "/home/linuxbrew/.linuxbrew/bin/bun", "args": ["<home>/.config/genmedia-mcp/mcp.mjs"]}`).
- The first real launch installs the packages (about 1 min). The engram MCP entry stays
  `disabled`; memory comes from the `gentle-engram` package.

## 3. Launcher

```bash
cp ~/.zshrc ~/.zshrc.bak.$(date +%Y%m%d-%H%M%S)-pre-<name>
# macro (stays in the cwd):
alias <name>='PI_SKIP_VERSION_CHECK=1 gentle-shell --home <home>/.pi/agent-<name> --no-skills --skill <home>/projects/<name>/Main/skills'
# project-bound: prefix with `cd <workshop> && `
```

`--no-skills` keeps out the global skills (noise for smaller models such as GLM); `--skill <dir>`
loads everything under `skills/`.

## 4. Smoke test

```bash
cd <scratch> && PI_SKIP_VERSION_CHECK=1 gentle-shell --home $P --no-skills --skill <repo>/skills \
  -p "In 3 lines: your identity, whether skills X and Y exist (yes/no), whether MCP Z is available."
```

A warning "already has content and was not set up by gentle-shell" means the profile was not built
from an empty directory: move it aside and redo step 2.

## 5. Private repo (on request)

```bash
gh repo create <owner>/<name> --private --source . --remote origin --push
```

## Updating later

- Identity: edit the repo original, commit, `cp` it to the profile again.
- New skill: copy into `skills/<area>/`, scan, add to the README origin table, commit. No alias change.
