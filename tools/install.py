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


# Shared conventions read by several skills. Installed like a skill directory
# but carries no SKILL.md of its own, so it must stay first: a skill that lands
# without its conventions is a skill with no source of truth.
SHARED = ("_shared",)

# Session workflow family — routing, planning, support, closure.
SESSION_SKILLS = (
    "session-kickoff",
    "session-plan",
    "session-context-loader",
    "planificador-granular",
    "agente-soporte",
    "session-doc",
)

# Generic delivery policy and shared-resource coordination. Product-specific
# Control Tower operator skills are owned and installed by that project.
DELIVERY_SKILLS = (
    "unattended-implementation",
    "politica-de-entrega",
    "coordinador_multi_agente",
)

# Analysis, planning and communication support.
SUPPORT_SKILLS = (
    "architecture-audit",
    "project-kickoff",
    "big-files-remediation-loop",
    "cierre-de-decisiones",
    "explicalo-simple",
    "skill-composer",
)

SKILLS = SHARED + SESSION_SKILLS + DELIVERY_SKILLS + SUPPORT_SKILLS

# Explicit ownership migration. Normal installs retire only these known derived
# copies; unlisted directories remain untouched.
RETIRED_SKILLS = ("torre-control-entregas",)

MANUAL_FILES = (
    Path(".claude/CLAUDE.md"),
    Path(".config/opencode/AGENTS.md"),
    Path(".codex/AGENTS.md"),
    Path(".pi/agent/APPEND_SYSTEM.md"),
)
START_MARKER = b"<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->"
END_MARKER = b"<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->"
GATEKEEPER_START_MARKER = b"<!-- SDD-AUTO-GATEKEEPER-POLICY:MANUAL -->"
GATEKEEPER_END_MARKER = b"<!-- /SDD-AUTO-GATEKEEPER-POLICY:MANUAL -->"


def _block_re(name: bytes) -> re.Pattern[bytes]:
    return re.compile(
        rb"^<!-- " + name + rb" -->\r?\n.*?^<!-- /" + name + rb" -->(?:\r?\n|$)",
        re.DOTALL | re.MULTILINE,
    )


BLOCK_RE = _block_re(b"SESSION-SKILL-ARCHITECTURE:MANUAL")
GATEKEEPER_BLOCK_RE = _block_re(b"SDD-AUTO-GATEKEEPER-POLICY:MANUAL")
MANUAL_BLOCKS = (
    ("session-routing.md", START_MARKER, END_MARKER, BLOCK_RE, True),
    (
        "sdd-auto-gatekeeper-policy.md",
        GATEKEEPER_START_MARKER,
        GATEKEEPER_END_MARKER,
        GATEKEEPER_BLOCK_RE,
        False,
    ),
)
MANAGED_MARKER_RE = re.compile(
    rb"<!--\s*(/?)((?:gentle-ai|section):[A-Za-z0-9_.-]+)\s*-->"
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


# A machine rarely has all four runtimes. The declarations above stay complete —
# they are the contract — while the two helpers below narrow them to what this
# machine actually has, so a missing runtime is skipped instead of failing the
# whole install. `~/.agents/skills` is the shared standard and is always written.
RUNTIME_MARKERS = {
    ".claude/skills": ".claude",
    ".config/opencode/skills": ".config/opencode",
    ".codex/skills": ".codex",
}


def installed_skill_roots(home: Path) -> tuple[Path, ...]:
    roots = []
    for root in runtime_skill_roots(home):
        relative = root.relative_to(home).as_posix()
        marker = RUNTIME_MARKERS.get(relative)
        if marker is None or (home / marker).is_dir():
            roots.append(root)
    return tuple(roots)


def installed_manual_paths(home: Path) -> tuple[Path, ...]:
    return tuple(path for path in manual_paths(home) if path.parent.is_dir())


def source_files(root: Path):
    for skill in SKILLS:
        source_root = root / "skills" / skill
        if not source_root.is_dir():
            raise InstallError(f"missing canonical skill directory: {source_root}")
        for path in sorted(source_root.rglob("*")):
            if path.is_file():
                yield skill, path.relative_to(source_root), path


def _absolute(path: Path) -> Path:
    return Path(os.path.abspath(os.fspath(path)))


def _lexists(path: Path) -> bool:
    return os.path.lexists(os.fspath(path))


def _assert_no_symlink_components(path: Path) -> None:
    absolute = _absolute(path)
    current = Path(absolute.anchor)
    for component in absolute.parts[1:]:
        current /= component
        if _lexists(current) and current.is_symlink():
            raise InstallError(f"symlinked path component is not allowed: {absolute}")


def _validate_directory_path(path: Path, label: str) -> None:
    absolute = _absolute(path)
    _assert_no_symlink_components(absolute)
    current = Path(absolute.anchor)
    for component in absolute.parts[1:]:
        current /= component
        if _lexists(current) and not current.is_dir():
            raise InstallError(f"expected directory for {label}: {current}")


def _assert_inside(root: Path, destination: Path, label: str) -> None:
    root_real = _absolute(root).resolve(strict=False)
    destination_real = _absolute(destination).resolve(strict=False)
    try:
        destination_real.relative_to(root_real)
    except ValueError as exc:
        raise InstallError(
            f"destination escapes the intended {label} root: {destination}"
        ) from exc
    if destination_real == root_real:
        raise InstallError(f"destination is the intended {label} root, not a file: {destination}")


def _validate_file_destination(
    root: Path, destination: Path, label: str, *, require_existing: bool = False
) -> None:
    root = _absolute(root)
    destination = _absolute(destination)
    _validate_directory_path(root, f"{label} root")
    _validate_directory_path(destination.parent, f"{label} parent")
    _assert_no_symlink_components(destination)
    _assert_inside(root, destination, label)
    if not _lexists(destination):
        if require_existing:
            raise InstallError(f"missing {label}: {destination}")
        return
    if not destination.is_file():
        raise InstallError(f"expected regular file for {label}: {destination}")


def _validate_retired_skill_destination(runtime_root: Path, destination: Path) -> None:
    runtime_root = _absolute(runtime_root)
    destination = _absolute(destination)
    _validate_directory_path(runtime_root, "runtime skill root")
    if destination.parent != runtime_root or destination.name not in RETIRED_SKILLS:
        raise InstallError(f"invalid retired skill destination: {destination}")
    if not _lexists(destination) or destination.is_symlink():
        return
    _assert_inside(runtime_root, destination, "runtime skill")
    if not destination.is_dir():
        raise InstallError(f"expected directory for retired runtime skill: {destination}")


def render_manual_blocks(root: Path) -> dict[bytes, bytes]:
    rendered_blocks = {}
    for template_name, start, _, _, _ in MANUAL_BLOCKS:
        template_path = root / "templates" / template_name
        try:
            template = template_path.read_text(encoding="utf-8")
        except OSError as exc:
            raise InstallError(f"cannot read manual block template: {template_path}") from exc
        rendered = template.replace("{{REPO_ROOT}}", root.as_posix())
        if "{{REPO_ROOT}}" in rendered:
            raise InstallError(f"manual block template has unresolved placeholder: {template_path}")
        rendered_blocks[start] = rendered.encode("utf-8")
    return rendered_blocks


def render_manual_block(root: Path) -> bytes:
    """Compatibility accessor for the required session-routing block."""
    return render_manual_blocks(root)[START_MARKER]


def _managed_ranges(content: bytes, path: Path) -> list[tuple[int, int]]:
    stack: list[tuple[bytes, int]] = []
    ranges: list[tuple[int, int]] = []
    for marker in MANAGED_MARKER_RE.finditer(content):
        closing = marker.group(1) == b"/"
        name = marker.group(2)
        if closing:
            if not stack or stack[-1][0] != name:
                raise InstallError(f"malformed managed marker nesting in {path}")
            _, start = stack.pop()
            ranges.append((start, marker.end()))
        else:
            stack.append((name, marker.start()))
    if stack:
        raise InstallError(f"unclosed managed marker in {path}")
    return ranges


def _replace_owned_block(
    content: bytes,
    replacement: bytes,
    path: Path,
    start: bytes,
    end: bytes,
    pattern: re.Pattern[bytes],
    required: bool,
) -> bytes:
    start_count, end_count = content.count(start), content.count(end)
    if start_count == 0 and end_count == 0 and not required:
        separator = b"" if not content or content.endswith(b"\n\n") else (
            b"\n" if content.endswith(b"\n") else b"\n\n"
        )
        return content + separator + replacement
    if start_count != 1 or end_count != 1:
        raise InstallError(f"expected exactly one owned manual block in {path}: {start.decode()}")
    matches = list(pattern.finditer(content))
    if len(matches) != 1:
        raise InstallError(f"owned manual block is not line-delimited in {path}: {start.decode()}")
    match = matches[0]
    for managed_start, managed_end in _managed_ranges(content, path):
        if managed_start < match.end() and match.start() < managed_end:
            raise InstallError(f"owned manual block is nested in a managed block: {path}")
    return content[: match.start()] + replacement + content[match.end() :]


def replace_manual_block(content: bytes, replacement: bytes, path: Path) -> bytes:
    """Compatibility wrapper for the required session-routing block."""
    return _replace_owned_block(
        content, replacement, path, START_MARKER, END_MARKER, BLOCK_RE, True
    )


def _owned_block_matches(
    content: bytes, path: Path
) -> dict[bytes, re.Match[bytes] | None]:
    matches_by_start: dict[bytes, re.Match[bytes] | None] = {}
    managed_ranges = _managed_ranges(content, path)
    present: list[tuple[bytes, re.Match[bytes]]] = []
    for _, start, end, pattern, required in MANUAL_BLOCKS:
        start_count, end_count = content.count(start), content.count(end)
        if start_count == 0 and end_count == 0 and not required:
            matches_by_start[start] = None
            continue
        if start_count != 1 or end_count != 1:
            raise InstallError(f"expected exactly one owned manual block in {path}: {start.decode()}")
        matches = list(pattern.finditer(content))
        if len(matches) != 1:
            raise InstallError(f"owned manual block is not line-delimited in {path}: {start.decode()}")
        match = matches[0]
        if any(begin < match.end() and match.start() < finish for begin, finish in managed_ranges):
            raise InstallError(f"owned manual block is nested in a managed block: {path}")
        matches_by_start[start] = match
        present.append((start, match))

    for index, (start, match) in enumerate(present):
        for other_start, other in present[index + 1 :]:
            if match.start() < other.end() and other.start() < match.end():
                raise InstallError(
                    f"owned manual blocks overlap in {path}: "
                    f"{start.decode()} and {other_start.decode()}"
                )
    return matches_by_start


def desired_manual_content(path: Path, replacements: dict[bytes, bytes]) -> bytes:
    content = path.read_bytes()
    matches = _owned_block_matches(content, path)
    present = sorted(
        ((match.start(), match.end(), start) for start, match in matches.items() if match),
        reverse=True,
    )
    for begin, end, start in present:
        content = content[:begin] + replacements[start] + content[end:]
    for _, start, _, _, required in MANUAL_BLOCKS:
        if matches[start] is None and not required:
            separator = b"" if not content or content.endswith(b"\n\n") else (
                b"\n" if content.endswith(b"\n") else b"\n\n"
            )
            content += separator + replacements[start]
    return content


def preflight(home: Path, root: Path) -> None:
    replacements = render_manual_blocks(root)
    for runtime_root in installed_skill_roots(home):
        _validate_directory_path(runtime_root, "runtime skill")
        for retired_skill in RETIRED_SKILLS:
            _validate_retired_skill_destination(runtime_root, runtime_root / retired_skill)
        for skill, relative, _ in source_files(root):
            skill_root = runtime_root / skill
            _validate_directory_path(skill_root, "runtime skill directory")
            _validate_file_destination(
                runtime_root, skill_root / relative, "runtime skill file"
            )
    for path in installed_manual_paths(home):
        _validate_directory_path(path.parent, "runtime instruction")
        if not _lexists(path.parent):
            raise InstallError(f"missing runtime instruction directory: {path.parent}")
        _validate_file_destination(
            path.parent, path, "runtime instruction file", require_existing=True
        )
        desired_manual_content(path, replacements)


def build_plan(home: Path, root: Path | None = None) -> list[Change]:
    root = root or repo_root()
    preflight(home, root)
    replacements = render_manual_blocks(root)
    changes: list[Change] = []
    for runtime_root in installed_skill_roots(home):
        for retired_skill in RETIRED_SKILLS:
            destination = runtime_root / retired_skill
            if _lexists(destination):
                changes.append(Change(destination, "retired-skill"))
        for skill, relative, source in source_files(root):
            destination = runtime_root / skill / relative
            if not destination.is_file() or destination.read_bytes() != source.read_bytes():
                changes.append(Change(destination, "skill"))
    for path in installed_manual_paths(home):
        desired = desired_manual_content(path, replacements)
        if path.read_bytes() != desired:
            changes.append(Change(path, "manual"))
    return changes


def _atomic_copy(source: Path, destination: Path, runtime_root: Path) -> None:
    _validate_file_destination(runtime_root, destination, "runtime skill file")
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


def _remove_retired_skill(runtime_root: Path, destination: Path) -> None:
    _validate_retired_skill_destination(runtime_root, destination)
    if not _lexists(destination):
        return
    if destination.is_symlink():
        destination.unlink()
    else:
        shutil.rmtree(destination)


def _atomic_write(path: Path, content: bytes, instruction_root: Path) -> None:
    _validate_file_destination(
        instruction_root, path, "runtime instruction file", require_existing=True
    )
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
    replacements = render_manual_blocks(root)
    change_paths = {change.path for change in changes}
    for runtime_root in installed_skill_roots(home):
        for retired_skill in RETIRED_SKILLS:
            destination = runtime_root / retired_skill
            if destination in change_paths:
                _remove_retired_skill(runtime_root, destination)
        for skill, relative, source in source_files(root):
            destination = runtime_root / skill / relative
            if destination in change_paths:
                _atomic_copy(source, destination, runtime_root)
    for path in installed_manual_paths(home):
        if path in change_paths:
            _atomic_write(path, desired_manual_content(path, replacements), path.parent)
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
