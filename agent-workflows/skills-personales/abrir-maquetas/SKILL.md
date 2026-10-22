---
name: abrir-maquetas
description: "Trigger: abrime este html, abrir html en el editor, editor de maquetas, maquetas, abrir maqueta, revisar mockup. Open a local HTML mockup inside editor-maquetas, never in a plain browser."
license: Apache-2.0
metadata:
  author: emili
  version: "1.0"
---

## Activation Contract

Load this skill when the user asks to open, show, or review a local `.html` file "en las maquetas", "en el editor de maquetas", "en el editor", or says "abrime este html" without naming another tool. When the user explicitly asks for a plain browser tab or a deployed URL, do not use this skill.

## Hard Rules

- Open mockups ONLY through editor-maquetas (`~/projects/editor-maquetas`). Never `xdg-open` a `file://` URL unless the user explicitly asks for the plain browser.
- The server sandbox reaches ONLY files under its startup folder: always start it with the repository/worktree ROOT that contains the HTML, and pass the file path relative to that root.
- Do not start a second server on 4545 while one is live. Probe first (`curl -s -o /dev/null -w "%{http_code}" http://localhost:4545/`); if it serves a different root, tell the user and ask — never kill it silently.
- It is a long-lived process: run it in a background job, never synchronously.
- Report the exact URL, with file and section anchor, so the user can reopen the tab later.

## Decision Gates

| Situation | Action |
|---|---|
| No server on 4545 | Start: `cd ~/projects/editor-maquetas && bin/maquetas <root> <rel/file.html>` |
| Server live, same root | Reuse it; report the URL with `?file=<rel>` |
| Server live, other root | Ask the user: reuse, or another port (`MAQUETAS_PORT=4546`) |
| Only a section is wanted | Append `#<anchor>`: `?file=<rel>#<anchor>` |

## Execution Steps

1. Resolve the absolute path of the HTML; derive `<root>` (repo or worktree root) and the path relative to it.
2. Probe `http://localhost:4545/` (and any port already known from this session).
3. Start or reuse per the Decision Gates. Startup serves `http://localhost:4545/` and opens the Windows browser automatically (WSL).
4. Verify: `curl` the `?file=...` URL returns 200.
5. Reply with the URL (file + anchor), which root the server is sandboxed to, and one line on the Edit/Note/Read modes if it helps.

## Notes contract

If the user later asks to "aplicar las notas" of a mockup, read `~/projects/editor-maquetas/AGENTS.md` and follow it: handle only `"status": "open"` notes, find targets with `anchor.quote` first then `anchor.selector`, edit the HTML directly, and mark each note `resolved` with a one-line reply.

## References

- `references/receta.md` — worked example with real paths.
- `~/projects/editor-maquetas/README.md` — full editor capabilities, modes and safety rules.
