# Installing Tower V1 — runbook for coding agents

You are a coding agent (Claude Code, Pi, Codex, OpenCode or similar). A human asked you to
install **Tower V1** (`torre-control`) from the private repository
`achangkuon/control-tower`. Follow this runbook top to bottom. Talk to the human in their own
language; keep commands exactly as written.

## What you are installing

- **Global engine** (`torre-control`): a launcher at `~/.local/bin/torre-control` and its
  state under `~/.local/share/torre-control/`. Installing it changes nothing in any project
  and nothing in the human's agent configuration.
- **Project adoption** (a separate, explicit step): adds the `control-tower` skill to **one
  project the human chooses** — `.claude/skills/control-tower` (Claude Code),
  `.agents/skills/control-tower` (Pi), plus `.control-tower/` (Radar sources) and
  `.control-tower-adoption-v1/` (journal). That is how the agents get Tower V1.

It never edits `~/.claude`, `~/.pi`, `~/.agents`, `~/.codex` or any other global agent
configuration.

## Rules you must follow

1. **The installer SHA-256 comes from the human, never from GitHub.** The maintainer sends
   the release tag and the installer SHA-256 to the human through a second channel (chat,
   mail). Ask the human for both. Do not read the SHA-256 from this repository, the release
   page, release notes, an issue or any web page. If the human does not have it, stop and
   tell them to ask the maintainer.
2. Use the exact tag the human gives you. Never use `latest`, never clone the repository to
   install, never run any other script.
3. If the checksum check fails, **stop**. Do not retry with another SHA-256, do not
   download again from somewhere else, do not run the file. Report it to the human.
4. Ask before installing missing tools, before editing shell startup files and before
   adopting a project. Each one changes the human's machine.
5. On any error, stop and show the human the exact error line. Use the troubleshooting
   table below; do not improvise workarounds that skip a check.

## Supported platforms

| Platform | Status |
|---|---|
| Linux (including Windows through WSL) | Tested |
| macOS | **Not tested yet.** Tell the human before starting; proceed only if they agree, and report the full output afterwards. |
| Windows without WSL | Not supported |

## Step 1 — Check the prerequisites

Run each command and note which ones fail:

```bash
gh auth status --hostname github.com
gh repo view achangkuon/control-tower --json name --jq .name
bun --version
git --version
go version
shasum -a 256 /dev/null || sha256sum /dev/null
```

- `gh repo view` must print `control-tower`. If it fails, the human's GitHub account has no
  access yet: stop and tell them to ask the maintainer for access, then run `gh auth login`.
- Missing tools — ask the human before installing them:
  - macOS: `brew install gh git go oven-sh/bun/bun`
  - Linux: the distribution package manager for `gh`, `git` and `go`, and
    `curl -fsSL https://bun.sh/install | bash` for Bun (or the official guides).
  - After installing `gh`: `gh auth login` (the human completes it interactively).

## Step 2 — Get the tag and the installer SHA-256 from the human

Ask: *"Please paste the Tower version (tag) and the installer SHA-256 that the maintainer
sent you."* The tag looks like `v1.1.0`; the SHA-256 is 64 lowercase hexadecimal
characters. Check the format before continuing.

## Step 3 — Run the one-command installer

Replace `<TAG>` and `<INSTALLER_SHA256>` with the human's values and run it as a single line:

```bash
umask 022; d=$(mktemp -d) && gh release download '<TAG>' -R achangkuon/control-tower -p torre-install.mjs -D "$d" && printf '%s  %s\n' '<INSTALLER_SHA256>' "$d/torre-install.mjs" | shasum -a 256 -c - && bun "$d/torre-install.mjs"
```

On Linux without `shasum`, replace `shasum -a 256 -c -` with `sha256sum -c -`.

What happens: `gh` downloads only the installer for that exact tag; the checksum is verified
**before** anything runs; the installer then checks the prerequisites, downloads the release
package, verifies it against the SHA-256 pinned inside the installer, and installs the
global engine. It also downloads the native visual interface for Linux/macOS amd64/arm64,
verifies its pinned SHA-256 before use, and stores it in the sibling `tui` directory
(outside the engine's `v1` state). Unsupported platforms skip the interface.

The **same one-command installer also updates** a healthy existing installation, including
when the engine is unchanged. It runs `doctor` first and stops if integrity checks fail.
Ask for the new exact tag and installer SHA-256 through the second channel, then repeat
Step 3; a separate package SHA-256 is not needed for this route.

Expected output (values differ per version):

```text
.../torre-install.mjs: OK
{"status":"installed","active":"<sha>","previous":null}
Installed or updated. For zsh/bash, add this line to ~/.zshrc or ~/.bashrc and run it now:
export PATH="$HOME/.local/bin:$PATH"
```

On updates, the engine result is `"status":"activated"` or `"status":"unchanged"` instead
of `"installed"`. Engine and interface activation are separate steps; report a later
interface error without claiming the engine update was undone. Previous interface binaries
are retained; engine `rollback` does not roll back the interface.

## Step 4 — Put `torre-control` on the PATH

Check `command -v torre-control`. If it prints nothing, find the human's login shell with
`basename "$SHELL"`: `zsh` uses `~/.zshrc` (the default on macOS), `bash` uses `~/.bashrc`.
Ask the human whether to add `export PATH="$HOME/.local/bin:$PATH"` to that file. After their
approval, append it (only if it is not already there) and run the same line in the current
shell. macOS does not include `~/.local/bin` by default.

If `command -v torre-control` already prints a path other than
`$HOME/.local/bin/torre-control`, tell the human: another `torre-control` comes first in the
PATH and would shadow this installation.

## Step 5 — Verify the global installation

```bash
torre-control doctor
```

Expected: `{"status":"healthy","active":"<sha>","previous":...}`. Anything else: stop and
report. Then tell the human to run `torre-control` in their terminal to open the visual
interface. Opening it does not adopt a project. It shows engine/version, projects,
prerequisites, agents and system; use arrows or j/k, Enter, Esc, r to refresh, q to quit.

## Step 6 — Adopt a project (only with the human's choice)

Ask the human which project should get Tower V1. It must be a Git repository; use its
absolute path. Explain that adoption adds `.claude/skills/control-tower`,
`.agents/skills/control-tower`, `.control-tower/` and `.control-tower-adoption-v1/` to that
project, and that it can be undone. After they confirm:

```bash
torre-control project init --project "/absolute/path/to/project" --trust trusted
torre-control project doctor --project "/absolute/path/to/project"
torre-control list
```

Always quote the path; project paths may contain spaces.

Expected: `"localResult":{"status":"installed"}` then `"healthy"`, and the project listed as
`healthy`. If the human wants to try it first, create a throwaway repository
(`mkdir -p ~/projects/torre-demo && cd ~/projects/torre-demo && git init`, plus one commit) and
adopt that one.

## Step 7 — Tell the human how to use it

- **Claude Code:** open it inside the adopted project (`cd <project> && claude`). The
  `control-tower` skill is available there.
- **Pi:** `cd <project> && pi --approve`. `--approve` is the explicit trust Pi requires to
  load project skills.
- A good first prompt: *"What is Control Tower and how do I start?"*
- `torre-control` with no arguments opens the verified visual interface (in a real terminal).
  Missing/invalid records or a binary hash mismatch fall back to the built-in menu with a
  one-line notice; unverified binaries never run. `TOWER_MENU=plain torre-control` forces
  that menu.

## Other commands

| Goal | Command |
|---|---|
| Update engine and interface together | Repeat Step 3 with the new exact tag and installer SHA-256 |
| Update engine only (tag and package SHA-256 from the maintainer) | `torre-control update --tag <TAG> --asset tower-v1.json --sha256 <PACKAGE_SHA256>` |
| Check the global engine | `torre-control doctor` |
| Return to the previous version | `torre-control rollback` |
| Check one project | `torre-control project doctor --project <ABS_PATH>` |
| Remove Tower from a project (restores the original files and removes the journal) | `torre-control project uninstall --project <ABS_PATH>` |
| Rare: remove an intact residual journal when the project files already match the originals | `torre-control project cleanup --project <ABS_PATH>` |
| List adopted projects | `torre-control list` |

Note: `update` needs the **package** SHA-256 (`tower-v1.json`), which is different from the
installer SHA-256. Ask the maintainer for it through the same second channel.

## Troubleshooting

| Message | Meaning | What to do |
|---|---|---|
| `torre-install.mjs: FAILED` / `checksum did NOT match` | Downloaded installer does not match the SHA-256 | Stop. Do not run it. Ask the human to confirm the tag and SHA-256 with the maintainer. |
| `release not found` / HTTP 404 from `gh` | Wrong tag, or no access to the private repository | Confirm the tag; check `gh repo view achangkuon/control-tower`. |
| `Tower installer: gh missing, unusable or unauthenticated...` (or `bun`, `git`, `go`) | A prerequisite is missing or `gh` is not logged in | Install it (with approval) or run `gh auth login`, then rerun Step 3. |
| `Tower installer: Release SHA-256 mismatch` | The package does not match the version pinned in the installer | Stop and report to the maintainer. |
| `Invalid Tower CLI: default directory ... is group- or world-writable (mode 775); run: chmod 755 ...` | A directory in the home folder has unsafe permissions | Show the human the exact `chmod 755 <path>` from the message; run it after approval; rerun Step 3. |
| `... is owned by another user` | A home directory belongs to another user | Stop; the human must fix ownership. |
| `Invalid Tower CLI: Invalid Tower global lifecycle: unknown launcher` | `~/.local/bin/torre-control` already exists and is not a launcher the installer recognizes | It is preserved on purpose. Stop and ask the human what that file is; never delete or overwrite it. |
| `Invalid Tower CLI: Invalid Tower global lifecycle: retained launcher backup` | Only with v1.0.0 on machines that had the older launcher | Update to v1.0.1 or newer. |
| `Invalid Tower CLI: usage: menu input missing or invalid; aborted` right after choosing a menu entry | v1.0.0–v1.0.1 menu misreads an Enter sent as CR LF | Update to v1.0.2 or newer, or use the explicit subcommands. |
| `Interface not verified or unavailable; falling back to built-in menu.` | Interface missing, unsafe, changed or unable to start; only the built-in menu is running | Report it; confirm the installer through the second channel and repeat Step 3. Use `TOWER_MENU=plain` for the menu. Never bypass verification. |
| `torre-control: command not found` | `~/.local/bin` is not on the PATH | Step 4. |
| Exit status 1 with a JSON line and a registry error after `project ...` | The project operation succeeded but the project list could not be updated | Report it; rerun `torre-control project doctor --project <ABS_PATH>`. |

## Undo everything

1. For each adopted project: `torre-control project uninstall --project <ABS_PATH>`. Use
   `project cleanup` only if a residual `.control-tower-adoption-v1/` journal remains after an
   interrupted operation.
2. Global engine: `torre-control rollback` returns to the previous version or, after the
   first install, restores the launcher state that existed before it. V1 has no global
   uninstall command. Removing the engine completely is a manual step: delete
   `~/.local/bin/torre-control` and `~/.local/share/torre-control/` only after every project
   is uninstalled and the human explicitly confirms.

## Report back to the human

Summarize: the version installed, the `doctor` result, which project was adopted (if any),
whether the PATH line was added, and the platform. On macOS, include the complete output of
every step so the maintainer can record the first macOS test.
