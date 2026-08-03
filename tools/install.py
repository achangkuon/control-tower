#!/usr/bin/env python3
"""Install and verify the user-owned session skill family."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import shutil
import stat
import sys
import tempfile
from dataclasses import dataclass


SKILLS = (
    "session-kickoff",
    "session-plan",
    "planificador-granular",
    "agente-soporte",
    "session-doc",
)
MANUAL_FILES = (
    Path(".claude/CLAUDE.md"),
    Path(".config/opencode/AGENTS.md"),
    Path(".codex/AGENTS.md"),
    Path(".pi/agent/APPEND_SYSTEM.md"),
)
START_MARKER = b"<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->"
END_MARKER = b"<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->"
BLOCK_RE = re.compile(
    rb"^<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->\r?\n"
    rb".*?^<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->(?:\r?\n|$)",
    re.DOTALL | re.MULTILINE,
)


@dataclass(frozen=True)
class Change:
    path: Path
    kind: str


class InstallError(RuntimeError):
    """Raised when a runtime surface cannot be safely reconciled."""


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def runtime_skill_roots(home: Path) -> tuple[Path, ...]:
    return (
        home / ".agents/skills",
        home / ".claude/skills",
        home / ".config/opencode/skills",
        home / ".codex/skills",
    )


def manual_paths(home: Path) -> tuple[Path, ...]:
    return tuple(home / path for path in MANUAL_FILES)


def source_files(root: Path):
    for skill in SKILLS:
        source_root = root / "skills" / skill
        if not source_root.is_dir():
            raise InstallError(f"missing canonical skill directory: {source_root}")
        for path in sorted(source_root.rglob("*")):
            if path.is_file():
                yield skill, path.relative_to(source_root), path


def render_manual_block(root: Path) -> bytes:
    template_path = root / "templates/session-routing.md"
    try:
        template = template_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise InstallError(f"cannot read manual block template: {template_path}") from exc
    rendered = template.replace("{{REPO_ROOT}}", root.as_posix())
    if "{{REPO_ROOT}}" in rendered:
        raise InstallError("manual block template contains an unresolved placeholder")
    return rendered.encode("utf-8")


def replace_manual_block(content: bytes, replacement: bytes, path: Path) -> bytes:
    if content.count(START_MARKER) != 1 or content.count(END_MARKER) != 1:
        raise InstallError(f"expected exactly one custom manual block in {path}")
    matches = list(BLOCK_RE.finditer(content))
    if len(matches) != 1:
        raise InstallError(f"custom manual block is not line-delimited in {path}")
    match = matches[0]
    return content[: match.start()] + replacement + content[match.end() :]


def desired_manual_content(path: Path, replacement: bytes) -> bytes:
    if not path.is_file():
        raise InstallError(f"missing runtime instruction file: {path}")
    return replace_manual_block(path.read_bytes(), replacement, path)


def build_plan(home: Path, root: Path | None = None) -> list[Change]:
    root = root or repo_root()
    replacement = render_manual_block(root)
    changes: list[Change] = []
    for runtime_root in runtime_skill_roots(home):
        for skill, relative, source in source_files(root):
            destination = runtime_root / skill / relative
            if not destination.is_file() or destination.read_bytes() != source.read_bytes():
                changes.append(Change(destination, "skill"))
    for path in manual_paths(home):
        desired = desired_manual_content(path, replacement)
        if path.read_bytes() != desired:
            changes.append(Change(path, "manual"))
    return changes


def _atomic_copy(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(prefix=f".{destination.name}.", dir=destination.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "wb") as output, source.open("rb") as input_file:
            shutil.copyfileobj(input_file, output)
        shutil.copystat(source, temporary)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def _atomic_write(path: Path, content: bytes) -> None:
    mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o644
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "wb") as output:
            output.write(content)
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def apply(home: Path, root: Path | None = None) -> list[Change]:
    root = root or repo_root()
    changes = build_plan(home, root)
    replacement = render_manual_block(root)
    change_paths = {change.path for change in changes}
    for runtime_root in runtime_skill_roots(home):
        for skill, relative, source in source_files(root):
            destination = runtime_root / skill / relative
            if destination in change_paths:
                _atomic_copy(source, destination)
    for path in manual_paths(home):
        if path in change_paths:
            _atomic_write(path, desired_manual_content(path, replacement))
    return changes


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="report drift and exit non-zero")
    mode.add_argument("--dry-run", action="store_true", help="report changes without writing")
    parser.add_argument("--home", type=Path, default=Path.home(), help="runtime home directory")
    args = parser.parse_args(argv)
    try:
        changes = build_plan(args.home.expanduser(), repo_root())
        if args.check:
            if changes:
                for change in changes:
                    print(f"DRIFT {change.kind}: {change.path}")
                return 1
            print("OK: runtime copies and manual blocks match the repository")
            return 0
        if args.dry_run:
            if changes:
                for change in changes:
                    print(f"WOULD_UPDATE {change.kind}: {change.path}")
            else:
                print("NO_CHANGES")
            return 0
        apply(args.home.expanduser(), repo_root())
        print("INSTALLED: runtime copies and manual blocks match the repository")
        return 0
    except InstallError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
