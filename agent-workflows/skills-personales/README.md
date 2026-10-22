# Personal maintainer skills

These skills belong to the maintainer, not the Tower product. They are never
shipped in the Tower bundle and do not count as Tower skills.

`tools/install.py` installs registered personal skills into `~/.agents/skills/`
and creates Claude links when that runtime is present.

- [`torre-release`](torre-release/SKILL.md): the maintainer's Tower release workflow.
- [`gentle-deck`](gentle-deck/SKILL.md): single-file HTML slide decks with a confirmed palette.
- [`gentle-video`](gentle-video/SKILL.md): product videos through OBS+ffmpeg capture or Remotion.
- [`abrir-maquetas`](abrir-maquetas/SKILL.md): open a local HTML mockup inside
  editor-maquetas (sandboxed server on port 4545, Windows browser via WSL).
  Its sources of truth are the `~/projects/editor-maquetas/` README and AGENTS.md.

The `gentle-` prefix names the presentation style these skills replicate; they are
not part of Gentle AI and no Gentle AI package installs them.
