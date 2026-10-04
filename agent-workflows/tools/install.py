#!/usr/bin/env python3
"""Install personal Chanks configuration; Tower owns the product runtime."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from types import MappingProxyType


# Public source inventory, also consumed by the separate Hermes migration.
# Runtime writes use PERSONAL_SKILLS below, not this historical inventory.
SHARED = ("_shared",)

# Chanks planning family — terrain, discovery, requirements, and plan↔SDD bridge.
CHANKS_SKILLS = (
    "chanks-1-autoridad",
    "chanks-1-brain-dump",
    "chanks-1-descubrimiento",
    "chanks-1-feature",
    "chanks-1-heredado",
    "chanks-1-adopcion",
    "chanks-1-prd",
    "chanks-1-project-kickoff",
    "chanks-1-requirements",
    "chanks-1-rfc",
    "chanks-1-terreno",
    "chanks-0-agente-soporte",
    "chanks-0-mensajes-visibles",
    "chanks-0-explicalo-simple",
    "chanks-0-session-context-loader",
    "chanks-0-skill-composer",
    "chanks-1-cierre-de-decisiones",
    "chanks-2-planificador-granular",
    "chanks-3-paralelo",
    "chanks-4-puente",
    "chanks-5-politica-de-entrega",
    "chanks-5-session-doc",
)

# Pista sources retain their behavior under skills-diferidas/v2/. V1 starts
# Sessions organically; these skills are not installed, and existing runtime
# copies are archived reversibly through RETIRED_SKILLS.
V2_DEFERRED_SKILLS = (
    "chanks-0-jornada",
    "chanks-3-session-kickoff",
    "chanks-3-coordinador-manual",
)

# Automatic-Tower sources live under skills-diferidas/v3/, never installed.
V3_DEFERRED_SKILLS = (
    "chanks-3-despacho-herdr",
    "chanks-4-unattended-implementation",
)

# Installation exclusions, not every source physically deferred from Tower V1.
DEFERRED_SKILLS = V2_DEFERRED_SKILLS + V3_DEFERRED_SKILLS

# agente-soporte is deferred from Tower V1 but remains a personal active skill.
# Source location must not change its runtime destination or retirement policy.
DEFERRED_SOURCE_VERSIONS = MappingProxyType({
    **{name: "v2" for name in V2_DEFERRED_SKILLS + ("chanks-0-agente-soporte",)},
    **{name: "v3" for name in V3_DEFERRED_SKILLS},
})

# Non-Chanks support skills.
SUPPORT_SKILLS = (
    "analisis-por-tramos",
    "skill-orchestrator",
)

# Personal maintainer sources are independent of the Chanks and Tower rosters.
PERSONAL_SOURCE_DIRS = MappingProxyType({
    "torre-release": "skills-personales",
})

# The maintainer's own skills: one real copy each in the central folder, reached
# from Claude Code through per-skill symlinks. Gentle AI skills are not part of
# this roster and stay per runtime under `gentle-ai`.
# Mirror runtime-config.mjs / bundle.mjs's reviewed V1 membership. A fixture
# test checks this boundary against the product export, without installing Tower.
TOWER_V1_SKILLS = tuple(sorted(
    tuple(name for name in CHANKS_SKILLS if name != "chanks-0-agente-soporte")
    + SUPPORT_SKILLS + ("control-tower",)
))
STOP_MANAGING_SKILLS = tuple(sorted(set(CHANKS_SKILLS + SUPPORT_SKILLS) & set(TOWER_V1_SKILLS)))
OWN_SKILLS = CHANKS_SKILLS + SUPPORT_SKILLS + tuple(PERSONAL_SOURCE_DIRS)
SKILLS = SHARED + OWN_SKILLS
PERSONAL_SKILLS = tuple(name for name in OWN_SKILLS if name not in TOWER_V1_SKILLS)

# Explicit ownership migration. Normal installs retire only these known derived
# copies; unlisted directories remain untouched.
RETIRED_SKILLS = (
    "chanks-6-politica-de-entrega",
    "chanks-7-session-doc",
    "session-doc",
    "politica-de-entrega",
    "unattended-implementation",
    "session-kickoff",
    "planificador-granular",
    "cierre-de-decisiones",
    "skill-composer",
    "session-context-loader",
    "explicalo-simple",
    "agente-soporte",
    "session-plan",
    "coordinador_multi_agente",
    # The runtime copies were installed hyphenated, so the underscore entry above
    # matched no directory and the retired skill survived every install.
    "coordinador-multi-agente",
    "architecture-audit",
    "project-kickoff",
    "big-files-remediation-loop",
    "torre-control",
    "torre-control-soporte",
    "torre-control-entregas",
) + DEFERRED_SKILLS

# Retiring a runtime copy must never destroy bytes the user owns: a locally
# customized skill sharing a retired name is archived beside the runtime root
# instead of deleted, so an install is always reversible by hand.
RETIRED_SKILL_ARCHIVE = ".retired-skills"

# Net removals from ab959f5: immutable canonical bytes from 1b3a53b/f7612de
# (support references) and 929ac91 (session-doc links). No runtime ownership
# manifest exists; new removals must explicitly extend this registry.
RETIRED_SKILL_FILES = MappingProxyType({
    "chanks-0-agente-soporte/assets/assignment-readonly.md": frozenset({
        "1066822ccc072dc21cd5dd67965cbbcf0a03b186d276a70b593d26e4e0c8d72f",
        "9b35256b723d835665783739526a12497bf037c822521c498850a3bf253bc622",
    }),
    "chanks-0-agente-soporte/references/contrato-no-interferencia.md": frozenset({
        "c9f5b2db842d9b4751ab2a86a94cd7c30d7d538f433f4165674a5db88d6edf61",
        "b2c15bc842cc310b06489f3160d4e75a9ca111cf59bab525d1024000de7e981e",
    }),
    "chanks-0-agente-soporte/references/unidad-ejecutable.md": frozenset({
        "2d78b7322467476ce1e8c127f5ce746c62e9adb392d4ec8c8d4bac2cd8baf322",
        "a5362b5289abf87269ffbf879ab55976205cf0485cfa2c4e4132b20e5626a612",
    }),
    "chanks-5-session-doc/references/links.md": frozenset({
        "6d75a865769a7561193f06bb5f2f86f39d65b1911e6337a0a11077c863b6885b",
    }),
})

# The deferred Pi write lock still retires reversibly. The Claude signature
# hook is now Tower-owned and must never be archived by the personal installer.
# The archive sits outside extensions/ so Pi cannot auto-discover the old shim.
RETIRED_CONTROL_ARCHIVE = ".retired-controls"
RETIRED_CONTROL_FILES = (
    (Path(".pi/agent"), Path("extensions/chanks-controls.ts")),
)

MANUAL_FILES = (
    Path(".claude/CLAUDE.md"),
    Path(".config/opencode/AGENTS.md"),
    Path(".codex/AGENTS.md"),
    Path(".pi/agent/APPEND_SYSTEM.md"),
)
START_MARKER = b"<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->"
END_MARKER = b"<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->"


MANUAL_ANNOTATION = " (manual — NOT gentle-ai managed; do not overwrite on sync)".encode()


def _block_re(name: bytes, *, annotated: bool = False) -> re.Pattern[bytes]:
    annotation = rb"(?:" + re.escape(MANUAL_ANNOTATION) + rb")?" if annotated else b""
    return re.compile(
        rb"^<!-- " + re.escape(name) + annotation + rb" -->\r?\n.*?^<!-- /"
        + re.escape(name) + rb" -->(?:\r?\n|$)",
        re.DOTALL | re.MULTILINE,
    )


BLOCK_RE = _block_re(b"SESSION-SKILL-ARCHITECTURE:MANUAL")
LEGACY_BLOCKS = (
    ("session-routing.md", START_MARKER, END_MARKER, BLOCK_RE, True),
) + tuple(
    (template, b"<!-- " + name + b" -->", b"<!-- /" + name + b" -->",
     _block_re(name, annotated=True), False)
    for template, name in (
        ("agent-propagation-map.md", b"AGENT-PROPAGATION-MAP:MANUAL"),
        ("doc-guard-rule.md", b"doc-guard-rule"),
        ("explain-to-maintainer.md", b"EXPLAIN-TO-MAINTAINER:MANUAL"),
        ("plan-naming.md", b"PLAN-NAMING:GLOBAL"),
    )
)
# Personal blocks a runtime receives when it lacks them (maintainer decision B3,
# 2026-10-01). Every other optional block stays replace-if-present. The Hermes helper
# (prepare-personal-config.py) applies the same list to SOUL.md.
PERSONAL_NAMES = {
    b"AGENT-PROPAGATION-MAP:MANUAL": b"chanks:agent-propagation-map",
    b"doc-guard-rule": b"chanks:doc-guard-rule",
    b"EXPLAIN-TO-MAINTAINER:MANUAL": b"chanks:explain-to-maintainer",
}
# Public legacy contract for the separate Hermes/snapshot helper. The four
# Tower-covered runtimes use PERSONAL_BLOCKS and never write these legacy blocks.
MANUAL_BLOCKS = LEGACY_BLOCKS
PERSONAL_BLOCKS = tuple(
    (template, b"<!-- " + name + b" -->", b"<!-- /" + name + b" -->", _block_re(name), False)
    for template, name in (
        ("agent-propagation-map.md", b"chanks:agent-propagation-map"),
        ("doc-guard-rule.md", b"chanks:doc-guard-rule"),
        ("explain-to-maintainer.md", b"chanks:explain-to-maintainer"),
    )
)
ADDED_WHEN_ABSENT_BLOCKS = (
    b"<!-- doc-guard-rule -->",
    b"<!-- EXPLAIN-TO-MAINTAINER:MANUAL -->",
    b"<!-- PLAN-NAMING:GLOBAL -->",
)
PERSONAL_ADDED_WHEN_ABSENT = (
    b"<!-- chanks:doc-guard-rule -->",
    b"<!-- chanks:explain-to-maintainer -->",
)
ADDED_WHEN_ABSENT_FILES = (Path(".codex/AGENTS.md"),)

# The plan-naming block is one text in every runtime (maintainer decision of 2026-10-01).
# Only the line naming the canon file varies: each personal file points at the skill root
# where this installer writes `_shared/` for that runtime. Pi and Hermes have no skill root
# of their own here; they read the central folder, which every install writes.
PLAN_NAMING_PLACEHOLDER = "{{PLAN_NAMING_CANON}}"
PLAN_NAMING_CANON_FILE = "_shared/plan-naming-convention.md"
PLAN_NAMING_CANON_ROOTS = MappingProxyType({
    Path(".claude/CLAUDE.md"): ".claude/skills",
    Path(".config/opencode/AGENTS.md"): ".config/opencode/skills",
    Path(".codex/AGENTS.md"): ".codex/skills",
    Path(".pi/agent/APPEND_SYSTEM.md"): ".agents/skills",
    Path(".hermes/SOUL.md"): ".agents/skills",
})
MANAGED_MARKER_RE = re.compile(
    rb"<!--\s*(/?)((?:gentle-ai|section|control-tower):[A-Za-z0-9_.-]+)\s*-->"
)


@dataclass(frozen=True)
class Change:
    path: Path
    kind: str
    detail: str = ""


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


CENTRAL_SKILLS_RELATIVE = ".agents/skills"
LINK_SKILLS_RELATIVE = ".claude/skills"
RETIRE_ONLY_SKILLS_RELATIVE = (".config/opencode/skills", ".codex/skills")
LINK_TARGET_PREFIX = "../../.agents/skills"


def _relative_root(home: Path, runtime_root: Path) -> str:
    return runtime_root.relative_to(home).as_posix()


def skill_link_target(skill: str) -> str:
    return f"{LINK_TARGET_PREFIX}/{skill}"


def skills_for_root(home: Path, runtime_root: Path) -> tuple[str, ...]:
    """Personal runtime destinations only; public source inventory stays intact."""
    if _relative_root(home, runtime_root) == CENTRAL_SKILLS_RELATIVE:
        return PERSONAL_SKILLS
    return ()


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


def skill_source_root(root: Path, skill: str) -> Path:
    """Resolve canonical bytes without changing runtime roster membership."""
    personal_dir = PERSONAL_SOURCE_DIRS.get(skill)
    if personal_dir is not None:
        return root / personal_dir / skill
    version = DEFERRED_SOURCE_VERSIONS.get(skill)
    if version is not None:
        return root / "skills-diferidas" / version / skill
    return root / "skills" / skill


def runtime_skill_bytes(skill: str, relative: Path, source: Path) -> bytes:
    """Keep personal runtime links sibling-relative despite deferred source layout."""
    content = source.read_bytes()
    if skill == "chanks-0-agente-soporte" and relative == Path("SKILL.md"):
        content = content.replace(b"../../../skills/chanks-4-puente/", b"../chanks-4-puente/")
    return content


def source_files(root: Path, skills: tuple[str, ...] = SKILLS):
    for skill in skills:
        source_root = skill_source_root(root, skill)
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
    if destination.parent != runtime_root or destination.name not in (
        RETIRED_SKILLS + OWN_SKILLS
    ):
        raise InstallError(f"invalid retired skill destination: {destination}")
    if not _lexists(destination) or destination.is_symlink():
        return
    _assert_inside(runtime_root, destination, "runtime skill")
    if not destination.is_dir():
        raise InstallError(f"expected directory for retired runtime skill: {destination}")


def plan_naming_canon(personal_file: Path) -> str:
    """The canon path a personal instruction file names. The file is recognized by its
    trailing components, so a fixture home resolves like the real one; an unknown file
    gets the central folder, the one location every install writes."""
    skills_root = CENTRAL_SKILLS_RELATIVE
    for relative, candidate in PLAN_NAMING_CANON_ROOTS.items():
        if personal_file.parts[-len(relative.parts):] == relative.parts:
            skills_root = candidate
            break
    return f"~/{skills_root}/{PLAN_NAMING_CANON_FILE}"


def blocks_for(personal_file: Path, replacements: dict[bytes, bytes]) -> dict[bytes, bytes]:
    """Resolve the per-runtime placeholder for one personal file. Blocks without the
    placeholder come back unchanged, so resolving twice is harmless."""
    canon = plan_naming_canon(personal_file).encode("utf-8")
    placeholder = PLAN_NAMING_PLACEHOLDER.encode("utf-8")
    return {start: block.replace(placeholder, canon) for start, block in replacements.items()}


def render_manual_blocks(root: Path) -> dict[bytes, bytes]:
    """Render every template. The per-runtime placeholder stays unresolved here;
    `blocks_for` resolves it for the personal file being written."""
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
        # Legacy rendering remains available to Hermes. These bytes are never
        # used by the four Tower-covered runtime writers.
        for old, new in PERSONAL_NAMES.items():
            rendered = rendered.replace(f"<!-- {new.decode()} -->", f"<!-- {old.decode()} -->")
            rendered = rendered.replace(f"<!-- /{new.decode()} -->", f"<!-- /{old.decode()} -->")
        rendered = rendered.replace(PERSONAL_HEADER.decode() + "\n", "")
        rendered_blocks[start] = rendered.encode("utf-8")
    return rendered_blocks


PERSONAL_HEADER = "<!-- Generated by Chanks (personal configuration) — not part of Control Tower -->".encode()


def render_personal_blocks(root: Path) -> dict[bytes, bytes]:
    rendered = {}
    for template, start, end, _, _ in PERSONAL_BLOCKS:
        block = (root / "templates" / template).read_bytes()
        if not block.startswith(start + b"\n" + PERSONAL_HEADER + b"\n") or not block.endswith(end + b"\n"):
            raise InstallError(f"invalid personal block template: {template}")
        rendered[start] = block
    return rendered


def render_manual_block(root: Path) -> bytes:
    """Compatibility accessor for the required session-routing block."""
    return (root / "templates/session-routing.md").read_bytes()


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


def _owned_marker_counts(content: bytes, start: bytes) -> tuple[int, int]:
    # Count the exact marker name even when its syntax is malformed. Do not treat
    # an unsupported annotation as absence, or confuse a similarly named block.
    name = start[len(b"<!-- "):-len(b" -->")]
    tokens = re.findall(rb"<!--\s*(/?)" + re.escape(name) + rb"(?=[\s>]|$)", content)
    return tokens.count(b""), tokens.count(b"/")


def _replace_owned_block(
    content: bytes,
    replacement: bytes,
    path: Path,
    start: bytes,
    end: bytes,
    pattern: re.Pattern[bytes],
    required: bool,
) -> bytes:
    start_count, end_count = _owned_marker_counts(content, start)
    if start_count == 0 and end_count == 0 and not required:
        return content
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
    content: bytes, path: Path, blocks=None
) -> dict[bytes, re.Match[bytes] | None]:
    matches_by_start: dict[bytes, re.Match[bytes] | None] = {}
    managed_ranges = _managed_ranges(content, path)
    present: list[tuple[bytes, re.Match[bytes]]] = []
    for _, start, end, pattern, required in (blocks if blocks is not None else MANUAL_BLOCKS):
        start_count, end_count = _owned_marker_counts(content, start)
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


def append_absent_blocks(
    content: bytes, replacements: dict[bytes, bytes], absent: tuple[bytes, ...]
) -> bytes:
    """Append each absent block at the end of the file, after one blank line. Existing
    bytes are never rewritten; the caller has already proved these markers are absent."""
    for start in absent:
        if content and not content.endswith(b"\n"):
            content += b"\n"
        if content and not content.endswith(b"\n\n"):
            content += b"\n"
        content += replacements[start]
    return content


def adds_absent_blocks(home: Path, path: Path) -> bool:
    return any(path == home / relative for relative in ADDED_WHEN_ABSENT_FILES)


def desired_manual_content(
    path: Path, replacements: dict[bytes, bytes], *, add_absent: bool = False
) -> bytes:
    # Optional personal blocks are replace-if-present, never new instructions, except the
    # ADDED_WHEN_ABSENT_BLOCKS of a runtime that opts in through `add_absent`.
    # Validate all ranges first, then splice backwards to preserve unrelated bytes.
    replacements = blocks_for(path, replacements)
    content = path.read_bytes()
    matches = _owned_block_matches(content, path)
    present = sorted(
        ((match.start(), match.end(), start) for start, match in matches.items() if match),
        reverse=True,
    )
    for begin, end, start in present:
        content = content[:begin] + replacements[start] + content[end:]
    if add_absent:
        absent = tuple(start for start in ADDED_WHEN_ABSENT_BLOCKS if matches[start] is None)
        content = append_absent_blocks(content, replacements, absent)
    return content


def desired_personal_content(path: Path, replacements: dict[bytes, bytes], *, add_absent=False) -> bytes:
    content = path.read_bytes()
    matches = _transition_matches(content, path)
    for _, start, _, _, _ in PERSONAL_BLOCKS:
        match = matches[start]
        if match is not None:
            content = content[:match.start()] + replacements[start] + content[match.end():]
            # Offsets belong to the original bytes; validate again after each splice.
            matches = _transition_matches(content, path)
    if add_absent:
        aliases = {b"<!-- " + new + b" -->": b"<!-- " + old + b" -->"
                   for old, new in PERSONAL_NAMES.items()}
        absent = tuple(start for start in PERSONAL_ADDED_WHEN_ABSENT
                       if matches[start] is None and matches[aliases[start]] is None)
        content = append_absent_blocks(content, replacements, absent)
    return content


def _transition_matches(content: bytes, path: Path):
    """Validate both generations before any edit, including unknown enclosing tags."""
    blocks = tuple((template, start, end, pattern, False)
                   for template, start, end, pattern, _ in LEGACY_BLOCKS + PERSONAL_BLOCKS)
    matches = _owned_block_matches(content, path, blocks)
    for old, new in PERSONAL_NAMES.items():
        if matches[b"<!-- " + old + b" -->"] and matches[b"<!-- " + new + b" -->"]:
            raise InstallError(f"duplicated legacy/personal marker in {path}: {new.decode()}")
    # Any marked block surrounding or inside an owned range is ambiguous. Do not
    # allow an unrecognized personal block to be swallowed by a replacement.
    tokens = re.compile(rb"<!--\s*(/?)\s*([A-Za-z0-9_:.-]+)(?:"
                        + re.escape(MANUAL_ANNOTATION) + rb")?\s*-->")
    # Only comments that open and close as a pair form blocks. Unpaired comments
    # (e.g. gentle-ai's `...:start` / `...:end` notes) are text, not nesting.
    found = [(bool(token.group(1)), token.group(2)) for token in tokens.finditer(content)]
    paired = {name for closing, name in found if closing} & {name for closing, name in found if not closing}
    for match in (value for value in matches.values() if value is not None):
        name = re.search(rb"<!-- ([A-Za-z0-9_:.-]+)", match.group()).group(1)
        stack = []
        for token in tokens.finditer(content):
            token_name = token.group(2)
            if token_name not in paired:
                continue
            if not token.group(1):
                if token_name == name and stack or token_name != name and match.start() < token.start() < match.end():
                    raise InstallError(f"nested owned marker in {path}: {name.decode()}")
                stack.append(token_name)
            elif stack and stack[-1] == token_name:
                stack.pop()
            elif token_name == name:
                raise InstallError(f"malformed owned marker nesting in {path}: {name.decode()}")
    return matches


def tower_migration_plan(home: Path, root: Path):
    """Read-only preflight of the entire migration; never infer unmarked ownership."""
    replacements = render_personal_blocks(root)
    plan = []
    for path in installed_manual_paths(home):
        _validate_file_destination(home, path, "runtime instruction file", require_existing=True)
        before = path.read_bytes()
        matches = _transition_matches(before, path)
        edits = []
        for _, start, _, _, _ in LEGACY_BLOCKS + PERSONAL_BLOCKS:
            match = matches[start]
            if match is None:
                continue
            name = start[len(b"<!-- "):-len(b" -->")]
            if name in PERSONAL_NAMES:
                new = PERSONAL_NAMES[name]
                replacement = replacements[b"<!-- " + new + b" -->"]
                detail = f"REPLACE {name.decode()} -> {new.decode()}"
            elif start in replacements:
                replacement = replacements[start]
                detail = f"UPDATE {name.decode()}"
            else:
                replacement = b""
                detail = f"REMOVE {name.decode()}"
            if match.group() != replacement:
                edits.append((match.start(), match.end(), replacement, detail))
        after = before
        for begin, finish, replacement, _ in sorted(edits, reverse=True):
            after = after[:begin] + replacement + after[finish:]
        if after != before:
            plan.append((path, before, after, tuple(detail for _, _, _, detail in edits)))
    archive = home / ".claude/.skill-backups/tower-migration"
    _validate_directory_path(archive, "Tower migration backup")
    return plan


def migrate_to_tower(home: Path, root: Path | None = None, *, apply_changes=False):
    """Back up ALL affected instruction files before the first replacement."""
    root = root or repo_root()
    plan = tower_migration_plan(home, root)
    if not apply_changes or not plan:
        return plan
    # Recheck the complete read set before creating even the backup directory.
    for path, before, _, _ in plan:
        _validate_file_destination(home, path, "runtime instruction file", require_existing=True)
        if path.read_bytes() != before:
            raise InstallError(f"instruction file changed during migration: {path}")
    archive = home / ".claude/.skill-backups/tower-migration"
    archive.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = Path(tempfile.mkdtemp(prefix=f"{stamp}-", dir=archive))
    for path, before, _, _ in plan:
        target = backup / path.relative_to(home)
        _atomic_copy(path, target, backup)
        if target.read_bytes() != before:
            raise InstallError(f"instruction file changed while backing up: {path}")
    for path, before, after, _ in plan:
        if path.read_bytes() != before:
            raise InstallError(f"instruction file changed during migration: {path}; backups: {backup}")
        _atomic_write(path, after, home)
    print(f"BACKUP: {backup}")
    return plan


def preflight(home: Path, root: Path) -> None:
    replacements = render_personal_blocks(root)
    retired_files = retired_skill_files(root)
    for runtime_root in installed_skill_roots(home):
        _validate_directory_path(runtime_root, "runtime skill")
        _validate_retired_file_archive(runtime_root)
        central = _relative_root(home, runtime_root) == CENTRAL_SKILLS_RELATIVE
        for relative in retired_files if central else ():
            _validate_file_destination(runtime_root, runtime_root / relative, "retired skill file")
        for retired_skill in RETIRED_SKILLS:
            _validate_retired_skill_destination(runtime_root, runtime_root / retired_skill)
        if not central:
            for own_skill in PERSONAL_SKILLS:
                _validate_own_skill_entry(runtime_root, runtime_root / own_skill)
        for skill, relative, _ in source_files(root, skills_for_root(home, runtime_root)):
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
        desired_personal_content(path, replacements, add_absent=adds_absent_blocks(home, path))
    for runtime_root, destination in retired_control_files(home):
        _validate_retired_control(runtime_root, destination)


CARRIL_SOURCE = Path("tools/carril")
CARRIL_RELATIVE = Path(".local/bin/carril")


def carril_path(home: Path) -> Path:
    return home / CARRIL_RELATIVE


def carril_source(root: Path) -> Path:
    source = root / CARRIL_SOURCE
    if not source.is_file() or stat.S_IMODE(source.stat().st_mode) != 0o755:
        raise InstallError("Carril launcher source must be a regular executable 755 file")
    return source


def carril_changes(home: Path, root: Path) -> list[Change]:
    source = carril_source(root)
    target = carril_path(home)
    _validate_directory_path(target.parent, "local binary directory")
    _validate_file_destination(home / ".local", target, "Carril launcher")
    if (
        target.is_file()
        and target.read_bytes() == source.read_bytes()
        and stat.S_IMODE(target.stat().st_mode) == 0o755
    ):
        return []
    return [Change(target, "carril-launcher")]


def etapa_hook_path(home: Path) -> Path:
    return home / ".claude/hooks/chanks-etapa.sh"


def etapa_hook_source(root: Path) -> Path:
    return root / "tools/hooks/chanks-etapa.sh"


def etapa_hook_changes(home: Path, root: Path) -> list[Change]:
    if not (home / ".claude").is_dir():
        return []
    source = etapa_hook_source(root)
    if not source.is_file() or stat.S_IMODE(source.stat().st_mode) != 0o755:
        raise InstallError("Chanks stage hook source must be a regular executable 755 file")
    target = etapa_hook_path(home)
    _validate_directory_path(target.parent, "stage hook directory")
    _validate_file_destination(home / ".claude", target, "stage hook", require_existing=False)
    if target.is_file() and target.read_bytes() == source.read_bytes() and stat.S_IMODE(target.stat().st_mode) == 0o755:
        return []
    return [Change(target, "stage-hook")]


def firma_hook_path(home: Path) -> Path:
    """Where the Tower signature hook used to be installed. It is retired through
    RETIRED_CONTROL_FILES; its source stays at tools/hooks/torre-firma.sh."""
    return home / ".claude/hooks/torre-firma.sh"


def retired_control_files(home: Path) -> tuple[tuple[Path, Path], ...]:
    return tuple((home / runtime, home / runtime / relative)
                 for runtime, relative in RETIRED_CONTROL_FILES)


def _validate_retired_control(runtime_root: Path, destination: Path) -> Path | None:
    """Return the archive directory, or None when the runtime has no copy to retire."""
    if not _lexists(destination):
        return None
    _validate_file_destination(runtime_root, destination, "retired control file")
    archive = _absolute(runtime_root) / RETIRED_CONTROL_ARCHIVE
    _validate_directory_path(archive, "retired control archive")
    _assert_inside(runtime_root, archive, "retired control archive")
    return archive


def retired_control_changes(home: Path) -> list[Change]:
    return [
        Change(destination, "retired-control")
        for runtime_root, destination in retired_control_files(home)
        if _validate_retired_control(runtime_root, destination) is not None
    ]


def _archive_retired_control(runtime_root: Path, destination: Path) -> None:
    archive = _validate_retired_control(runtime_root, destination)
    if archive is None:
        return
    archive.mkdir(parents=True, exist_ok=True)
    # A private directory per run means os.replace can never land on an earlier backup.
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    private = Path(tempfile.mkdtemp(prefix=f"{stamp}-", dir=archive))
    target = private / destination.relative_to(runtime_root)
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.replace(destination, target)
    except OSError:
        # Leave no empty backup behind when the move itself fails.
        shutil.rmtree(private, ignore_errors=True)
        raise


OWN_SKILL_ENTRY_KINDS = ("own-skill-archive", "skill-link", "skill-link-replace")


def build_plan(home: Path, root: Path | None = None) -> list[Change]:
    root = root or repo_root()
    preflight(home, root)
    replacements = render_personal_blocks(root)
    retired_files = retired_skill_files(root)
    changes: list[Change] = []
    for runtime_root in installed_skill_roots(home):
        relative_root = _relative_root(home, runtime_root)
        for relative, digests in retired_files.items():
            if relative_root != CENTRAL_SKILLS_RELATIVE:
                break
            destination = runtime_root / relative
            if _matches_retired_file(destination, digests):
                changes.append(Change(destination, "retired-skill-file"))
        for retired_skill in RETIRED_SKILLS:
            destination = runtime_root / retired_skill
            if _lexists(destination):
                changes.append(Change(destination, "retired-skill"))
        if relative_root != CENTRAL_SKILLS_RELATIVE:
            changes.extend(own_skill_entry_changes(runtime_root, relative_root))
        for skill, relative, source in source_files(root, skills_for_root(home, runtime_root)):
            destination = runtime_root / skill / relative
            if not destination.is_file() or destination.read_bytes() != runtime_skill_bytes(skill, relative, source):
                changes.append(Change(destination, "skill"))
    for path in installed_manual_paths(home):
        desired = desired_personal_content(
            path, replacements, add_absent=adds_absent_blocks(home, path))
        if path.read_bytes() != desired:
            changes.append(Change(path, "manual"))
    changes.extend(carril_changes(home, root))
    changes.extend(pi_npm_host_peers_changes(home, root))
    changes.extend(pi_overlay_rebuild_changes(home, root))
    changes.extend(retired_control_changes(home))
    return changes


def _validate_own_skill_entry(runtime_root: Path, destination: Path) -> None:
    """An own-skill entry outside the central folder is a symlink, a retired real
    directory, or absent. Only the final component may be a symlink: the root and
    its parents are still refused, so no write ever goes through a link."""
    runtime_root = _absolute(runtime_root)
    destination = _absolute(destination)
    _validate_directory_path(runtime_root, "runtime skill root")
    if destination.parent != runtime_root or destination.name not in OWN_SKILLS:
        raise InstallError(f"invalid own skill destination: {destination}")
    if _lexists(destination) and not destination.is_symlink() and not destination.is_dir():
        raise InstallError(f"expected directory or symlink for own skill: {destination}")


def own_skill_entry_changes(runtime_root: Path, relative_root: str) -> list[Change]:
    changes: list[Change] = []
    linked = relative_root == LINK_SKILLS_RELATIVE
    for skill in PERSONAL_SKILLS:
        destination = runtime_root / skill
        target = skill_link_target(skill)
        if destination.is_symlink():
            if not linked:
                continue  # never remove a link the installer did not create
            if os.readlink(destination) != target:
                changes.append(Change(
                    destination, "skill-link-replace",
                    f"{os.readlink(destination)} -> {target}",
                ))
            continue
        if _lexists(destination):
            changes.append(Change(destination, "own-skill-archive"))
        if linked:
            changes.append(Change(destination, "skill-link", f"-> {target}"))
    return changes


def _create_skill_link(runtime_root: Path, skill: str) -> None:
    destination = runtime_root / skill
    _validate_own_skill_entry(runtime_root, destination)
    if _lexists(destination) and not destination.is_symlink():
        raise InstallError(f"own skill directory must be archived before linking: {destination}")
    runtime_root.mkdir(parents=True, exist_ok=True)
    for attempt in range(100):
        temporary = runtime_root / f".{skill}.link-{os.getpid()}-{attempt}"
        try:
            os.symlink(skill_link_target(skill), temporary)
            break
        except FileExistsError:
            continue
    else:
        raise InstallError(f"cannot create temporary link for own skill: {destination}")
    try:
        os.replace(temporary, destination)
    finally:
        if temporary.is_symlink():
            temporary.unlink()


def _atomic_copy(source: Path, destination: Path, runtime_root: Path, *, content: bytes | None = None) -> None:
    _validate_file_destination(runtime_root, destination, "runtime skill file")
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(prefix=f".{destination.name}.", dir=destination.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "wb") as output:
            if content is None:
                with source.open("rb") as input_file:
                    shutil.copyfileobj(input_file, output)
            else:
                output.write(content)
        shutil.copystat(source, temporary)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def retired_skill_archive_root(runtime_root: Path) -> Path:
    return _absolute(runtime_root) / RETIRED_SKILL_ARCHIVE


def retired_skill_files(root: Path) -> dict[str, frozenset[str]]:
    current = {(Path(skill) / relative).as_posix() for skill, relative, _ in source_files(root)}
    return {relative: digests for relative, digests in RETIRED_SKILL_FILES.items()
            if relative not in current and relative.split("/")[0] not in TOWER_V1_SKILLS}


def _validate_retired_file_archive(runtime_root: Path) -> Path:
    archive = retired_skill_archive_root(runtime_root) / "files"
    _validate_directory_path(archive, "retired skill file archive")
    _assert_inside(runtime_root, archive, "retired skill file archive")
    return archive


def _matches_retired_file(path: Path, digests: frozenset[str]) -> bool:
    return path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() in digests


def _archive_retired_skill_file(runtime_root: Path, relative: str, digests: frozenset[str]) -> None:
    destination = runtime_root / relative
    _validate_file_destination(runtime_root, destination, "retired skill file")
    archive = _validate_retired_file_archive(runtime_root)
    if not _matches_retired_file(destination, digests):
        return
    archive.mkdir(parents=True, exist_ok=True)
    # An exclusive private directory prevents timestamp collisions and ensures
    # os.replace never overwrites an existing backup, including concurrent runs.
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    private = Path(tempfile.mkdtemp(prefix=f"{stamp}-", dir=archive))
    target = private / relative
    _validate_file_destination(private, target, "retired skill file backup")
    target.parent.mkdir(parents=True, exist_ok=True)
    _validate_file_destination(runtime_root, destination, "retired skill file")
    if _matches_retired_file(destination, digests):
        os.replace(destination, target)


def _archive_retired_skill(runtime_root: Path, destination: Path) -> None:
    _validate_retired_skill_destination(runtime_root, destination)
    if not _lexists(destination):
        return
    if destination.is_symlink():
        destination.unlink()
        return
    archive_root = retired_skill_archive_root(runtime_root)
    archive_root.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = archive_root / f"{destination.name}-{stamp}"
    collision = 1
    while _lexists(target):
        target = archive_root / f"{destination.name}-{stamp}-{collision}"
        collision += 1
    os.replace(destination, target)


def _atomic_write(
    path: Path,
    content: bytes,
    instruction_root: Path,
    *,
    label: str = "runtime instruction file",
    require_existing: bool = True,
) -> None:
    # Manual instruction files must already exist — writing one into a runtime that never had
    # it would be installing an instruction nobody asked for. A generated file is the opposite
    # case: it is ours to create, so the caller says which rule applies.
    _validate_file_destination(
        instruction_root, path, label, require_existing=require_existing
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
    replacements = render_personal_blocks(root)
    change_paths = {change.path for change in changes}
    for runtime_root in installed_skill_roots(home):
        for skill, relative, source in source_files(root, skills_for_root(home, runtime_root)):
            destination = runtime_root / skill / relative
            if destination in change_paths:
                _atomic_copy(source, destination, runtime_root,
                             content=runtime_skill_bytes(skill, relative, source))
    for path in installed_manual_paths(home):
        if path in change_paths:
            desired = desired_personal_content(
                path, replacements, add_absent=adds_absent_blocks(home, path))
            _atomic_write(path, desired, path.parent)
    for runtime_root in installed_skill_roots(home):
        for retired_skill in RETIRED_SKILLS:
            destination = runtime_root / retired_skill
            if destination in change_paths:
                _archive_retired_skill(runtime_root, destination)
    # The central copies exist by now, so archiving a runtime's own real copy and
    # linking it back never leaves a window with no skill at all.
    entry_changes = [c for c in changes if c.kind in OWN_SKILL_ENTRY_KINDS]
    for change in entry_changes:
        if change.kind == "own-skill-archive":
            _archive_retired_skill(change.path.parent, change.path)
    for change in entry_changes:
        if change.kind in ("skill-link", "skill-link-replace"):
            _create_skill_link(change.path.parent, change.path.name)
    if carril_path(home) in change_paths:
        _atomic_copy(carril_source(root), carril_path(home), home / ".local")
        os.chmod(carril_path(home), 0o755)
    if pi_npm_wrapper_path(home) in change_paths or pi_settings_path(home) in change_paths:
        install_pi_npm_host_peers(home, root)
    if any(change.kind in ("pi-overlay-tool", "pi-overlay-data") for change in changes):
        install_pi_overlay_rebuild(home, root)
    # Deferred control pieces are archived last, like other retirements: a failed install
    # must leave the previously installed copy active.
    retired_controls = {change.path for change in changes if change.kind == "retired-control"}
    for runtime_root, destination in retired_control_files(home):
        if destination in retired_controls:
            _archive_retired_control(runtime_root, destination)
    # Retire individual obsolete copies only after ordinary installation succeeds.
    # Re-read ownership after planning: a user edit made meanwhile must survive.
    retired_files = retired_skill_files(root)
    retired_paths = {change.path for change in changes if change.kind == "retired-skill-file"}
    for runtime_root in installed_skill_roots(home):
        for relative, digests in retired_files.items():
            if runtime_root / relative in retired_paths:
                _archive_retired_skill_file(runtime_root, relative, digests)
    return changes


# --- Passive Pi notices ----------------------------------------------------
# Independent of the retired control shim and private annotation overlay. Only the
# isolated command parser is shared; loading this extension starts no processes.
PI_NOTICES_RELATIVE = Path(".pi/agent/extensions/chanks-notices.ts")
PI_NOTICES_TEMPLATE = """\
// Generated by agent-workflows/tools/install.py. Do not edit here.
// Cosmetic successful-result observer only; no tool or lifecycle enforcement.
import type {{ ExtensionAPI, ExtensionContext, ToolResultEvent }} from "@earendil-works/pi-coding-agent"
import {{ realpathSync, statSync }} from "node:fs"
import {{ homedir }} from "node:os"
import {{ resolve }} from "node:path"
import {{ radarDirecto }} from {firma}

const CHANKS_SKILLS = new Set<string>({chanks_skills})

function installedSkill(path: unknown, cwd: string): string | null {{
  if (typeof path !== "string") return null
  try {{
    const home = realpathSync(homedir())
    const installed = resolve(home, ".agents/skills")
    // Refuse a redirected install root, aliases, and skill/file symlink escapes.
    if (realpathSync(installed) !== installed) return null
    const requested = resolve(cwd, path.startsWith("~/") ? resolve(home, path.slice(2)) : path)
    const target = realpathSync(requested)
    if (target !== requested || !statSync(target).isFile()) return null
    for (const name of CHANKS_SKILLS) {{
      if (requested === resolve(installed, name, "SKILL.md")) return name
    }}
  }} catch {{ /* Missing files and broken links are not installed skills. */ }}
  return null
}}

export default function chanksNotices(pi: ExtensionAPI) {{
  pi.on("tool_result", (event: ToolResultEvent, ctx: ExtensionContext): undefined => {{
    // Nested calls carry their own input and parentToolCallId: observe them directly,
    // without waiting for or parsing the outer codemode result. Retain no call state.
    if (!ctx.hasUI || event.isError) return undefined
    try {{
      if (event.toolName === "read") {{
        const name = installedSkill(event.input.path, ctx.cwd)
        if (name) ctx.ui.notify(`💪 Chanks · ${{name}} · lectura completada`, "info")
      }} else if (event.toolName === "bash") {{
        const radar = radarDirecto(event.input.command)
        if (radar) ctx.ui.notify(`🗼 Torre · radar ${{radar.subcommand}}`, "info")
      }}
    }} catch {{ /* Cosmetic errors cannot change a completed tool result. */ }}
    return undefined
  }})
}}
"""


def pi_notices_path(home: Path) -> Path:
    return home / PI_NOTICES_RELATIVE


def desired_pi_notices(root: Path | None = None) -> bytes:
    root = root or repo_root()
    firma = (root / "chanks/torre-firma.mjs").resolve()
    if not firma.is_file():
        raise InstallError(f"missing Pi notice parser module: {firma}")
    # A quoted file URL safely pins the import even when the checkout path has spaces
    # or quotes. It must remain available after deployment; no module is copied.
    return PI_NOTICES_TEMPLATE.format(
        firma=json.dumps(firma.as_uri()), chanks_skills=json.dumps(CHANKS_SKILLS),
    ).encode("utf8")


def pi_notices_changes(home: Path, root: Path | None = None) -> list[Change]:
    destination = pi_notices_path(home)
    _validate_file_destination(home / ".pi", destination, "Pi notices extension")
    desired = desired_pi_notices(root)
    if destination.is_file() and destination.read_bytes() == desired:
        return []
    return [Change(destination, "pi-notices")]


def install_pi_notices(home: Path, root: Path | None = None) -> None:
    """Retained entry point: signatures are exclusively product-owned."""
    raise InstallError("Pi notices are Tower-owned; use the Tower installer")


# --- S144: the Pi extension shim -------------------------------------------
#
# Deferred to V2 (maintainer decision B4, 2026-10-01): `build_plan` and `apply` no longer
# install this shim, and an installed copy is archived through RETIRED_CONTROL_FILES. The
# renderer below is kept as the source of the write lock and is still used by `tools/carril`.
#
# Pi auto-discovers extensions only as `~/.pi/agent/extensions/*.ts` or `*/index.ts`, so the
# adapter — which is `.mjs` — cannot be the extension file itself. The shim below is generated
# rather than kept as a repository file: S144 authorizes no `.ts` file, and asking for a scope
# expansion over a discovery detail would spend a human approval on nothing.
#
# The shim decides nothing. It forwards the event to `gobernar` and hands back whatever comes
# out, because a shim that re-stated one rule would be a second answer to the same question,
# and the two would drift while both looked right.
PI_EXTENSION_RELATIVE = Path(".pi/agent/extensions/chanks-controls.ts")

PI_EXTENSION_TEMPLATE = """\
// Generated by agent-workflows/tools/install.py. Do not edit here.
// No external envelope is consumed. The switch decides whether Chanks controls apply at all in
// this repository; when they do, the admission is captured live, by pi-admission.mjs itself,
// from git and the installed Radar — never from the model and never from a host process.
import {{ execFileSync }} from "node:child_process"
import {{ realpathSync }} from "node:fs"
import {{ homedir }} from "node:os"
import {{ resolve }} from "node:path"
import {{ buildAdmission, resolveExecutable }} from "{admision}"
import {{ crearAutoridadPi }} from "{autoridad}"
import {{ effectiveSwitchAt }} from "{interruptor}"
import {{ firmaHerramienta, radarDirecto }} from "{firma}"

const CHANKS_SKILLS = new Set({chanks_skills})

// A timeout fails a mutation-relevant call closed rather than hanging the extension forever
// (R3-no-exec-timeout / R4-unbounded-sync-subprocess-per-tool-call).
const EXEC_TIMEOUT_MS = 10_000


// Reading has no effect anywhere in this extension, active key or not — see pi-controls.mjs's
// own SIN_EFECTO for the authoritative list this mirrors. The list is duplicated here, not the
// decision: with no active key there is no authority object for pi-controls.mjs to decide over.
const READ_ONLY_TOOLS = ["read", "grep", "find", "ls"]

// The no-key room is a guardrail against accidental writes by a cooperative agent (the key
// identifies which Session is working); it is not a sandbox against an agent that deliberately
// tries to escape. A read-only bind does not stop connect() on a socket inode, so the room hides
// the common daemon socket directories (/tmp, /run) and starts from a clean environment, which
// drops SSH_AUTH_SOCK and DBUS_SESSION_BUS_ADDRESS. Sockets elsewhere (under $HOME or /mnt) stay
// reachable by design of that scope. The working directory is re-bound read-only afterwards so a
// worktree under /tmp or /run stays visible.
const READ_ONLY_ROOM = [
  "/usr/bin/bwrap",
  "--ro-bind", "/", "/",
  "--dev", "/dev",
  "--proc", "/proc",
  "--tmpfs", "/tmp",
  "--tmpfs", "/run",
  "--tmpfs", "/var/tmp",
  "--clearenv",
  "--setenv", "PATH", "/usr/local/bin:/usr/bin:/bin",
  "--setenv", "TMPDIR", "/var/tmp",
  "--unshare-all",
  "--unshare-net",
  "--new-session",
  "--die-with-parent",
]

const quoteArgv = (argv: string[]) => argv.map((part) => `'${{part.replaceAll("'", "'\\"'\\"'")}}'`).join(" ")

// Shell is never writable, even for an admitted Session. Worktree and original cwd are
// rebound read-only when /tmp is masked; failures stop the call rather than running loose.
const readOnlyConfinement = (command: string, root: string, chdirTo: string): string | null => {{
  try {{
    if (realpathSync("/usr/bin/bwrap") !== "/usr/bin/bwrap") return null
    execFileSync("/usr/bin/bwrap", ["--version"], {{ stdio: "ignore", timeout: EXEC_TIMEOUT_MS }})
  }} catch {{
    return null
  }}
  return quoteArgv([...READ_ONLY_ROOM, "--ro-bind", root, root, "--chdir", chdirTo, "bash", "-c", command])
}}

export default function chanksControls(pi: any) {{
  // Registration is side-effect-free. Resolve the current checkout at session_start, never
  // while Pi merely loads extensions (e.g. print mode without an active session).
  let workingDirectory: string | null = null
  let root: string | null = null
  let commonDir: string | null = null
  let isMainWorkingTree = false
  let authority: any = null
  let currentAdmission: any = null
  const stages = new Map<string, string>()
  let admissionFailure = "no exact dispatch marker or fresh Radar evidence"
  const outcomes = new Map<string, {{ kind: string, owner?: any, toolName: string, originalPath?: string, signature?: string, stageSession?: string }}>()
  const seen = new Set<string>()

  const initialize = () => {{
    try {{
      workingDirectory = realpathSync(process.cwd())
      const git = resolveExecutable("git", workingDirectory)
      const runGit = (args: string[]) => execFileSync(git, ["-C", workingDirectory!, ...args],
        {{ stdio: ["ignore", "pipe", "ignore"], timeout: EXEC_TIMEOUT_MS }}).toString("utf8").trim()
      root = realpathSync(runGit(["rev-parse", "--show-toplevel"]))
      commonDir = runGit(["rev-parse", "--path-format=absolute", "--git-common-dir"])
      isMainWorkingTree = realpathSync(runGit(["rev-parse", "--path-format=absolute", "--git-dir"])) === realpathSync(commonDir)
    }} catch {{ root = null; commonDir = null; workingDirectory = null }}
  }}

  // Trust only an exact installed skill name and canonical SKILL.md below the installed root.
  // Resolving both paths prevents substring impostors and symlinks escaping the root.
  const skillName = (path: unknown, cwd: string) => {{
    if (typeof path !== "string") return null
    try {{
      const installed = realpathSync(resolve(homedir(), ".agents/skills"))
      const requested = resolve(cwd, path.startsWith("~/") ? resolve(homedir(), path.slice(2)) : path)
      const target = realpathSync(requested)
      for (const name of CHANKS_SKILLS) {{
        const exact = resolve(installed, name, "SKILL.md")
        if (requested === exact && target === exact) return name
      }}
    }} catch {{ /* Missing files and broken symlinks are not trusted reads. */ }}
    return null
  }}

  // Presentation only: gentle-pi owns read/bash and Pi adds these to a compatible Text row.
  // Custom lifecycle components have no inline slot and remain entirely owner-rendered.
  // A Pi build without the overlay has no such API: stay loadable, run every gate, and say once
  // at session start that the labels are off.
  const hasAnnotations = typeof pi.registerToolCallAnnotation === "function"
  if (hasAnnotations) {{
    pi.registerToolCallAnnotation("read", (args: any) => {{
      const name = skillName(args?.path, workingDirectory ?? process.cwd())
      return name ? `💪 Chanks · ${{name}} · lectura solicitada` : undefined
    }})
    pi.registerToolCallAnnotation("bash", (args: any) => {{
      const radar = radarDirecto(args?.command)
      return radar ? `🗼 Torre · radar ${{radar.subcommand}} · solicitado` : undefined
    }})
  }}

  const observeStage = (event: any, session: string, ctx: any) => {{
    try {{
      if (event.isError || event.details?.truncation || event.content?.length !== 1 || event.content[0]?.type !== "text") return
      const stage = JSON.parse(event.content[0].text)
      if (stage?.schema !== "radar.etapa/v1" || stage.sesion !== session ||
        !Number.isInteger(stage.etapa) || stage.etapa < 1 ||
        typeof stage.nombre !== "string" || !stage.nombre.trim()) return
      const key = `${{stage.etapa}}:${{stage.nombre}}`
      const previous = stages.get(session)
      stages.set(session, key)
      if (previous && previous !== key && ctx?.hasUI)
        ctx.ui.notify(`💪 Chanks · Etapa ${{stage.etapa}} · ${{stage.nombre}}`, "info")
    }} catch {{ /* An invalid result cannot manufacture a stage transition. */ }}
  }}

  // Read on every governed decision below (R4-switch-evaluated-once-at-load /
  // R2-switch-contradictory-read-contract): the extension's handlers are registered
  // unconditionally whenever cwd resolves inside a git repository, and each one re-checks this
  // instead of trusting a value captured once at load. Turning the switch off while a key is
  // active makes every subsequent tool_call pass through immediately, without waiting for a new
  // Pi session.
  const isEffective = () => {{
    try {{
      return Boolean(root && commonDir && effectiveSwitchAt(commonDir, root))
    }} catch {{
      return false
    }}
  }}

  const erase = (shutdown = false) => {{
    try {{ shutdown ? authority?.cerrar() : authority?.invalidar() }} catch {{}}
    if (shutdown) {{
      for (const [id, outcome] of outcomes) if (outcome.owner && outcome.owner !== authority) outcome.owner.completar(id, outcome.kind)
      outcomes.clear()
      seen.clear()
    }}
    authority = null
    currentAdmission = null
  }}

  const admit = (ctx: any) => {{
    if (!root || !isEffective() || isMainWorkingTree) return false
    if (authority?.estado() === "activa") return true
    try {{
      const radar = resolveExecutable("radar", root)
      const dependencies = {{ radar, execFile: (exe: string, args: string[], options: any) =>
        execFileSync(exe, args, options) }}
      currentAdmission = buildAdmission({{ repositoryRoot: root, dependencies }})
      authority = crearAutoridadPi({{ identidadActual: () => currentAdmission.identidadActual() }})
      if (!authority.activarAutomaticamente(currentAdmission.bundle)) throw new Error("admission rejected")
      return true
    }} catch (error: any) {{
      admissionFailure = String(error?.message ?? "admission unavailable").slice(0, 300)
      erase()
      return false
    }}
  }}

  pi.on("tool_call", (event: any, ctx: any) => {{
    const id = event?.toolCallId
    if (typeof id !== "string" || !id || seen.has(id)) return {{ block: true, reason: "duplicate or missing tool-call identity" }}
    seen.add(id)
    const command = event?.toolName === "bash" ? event?.input?.command : null
    const stageSession = radarDirecto(command)?.sessionId ?? undefined
    let signature: string | undefined
    if (event?.toolName !== "bash") try {{ signature = firmaHerramienta(event) ?? undefined }} catch {{ /* A notice cannot gate a call. */ }}
    if (!isEffective() || isMainWorkingTree) {{ outcomes.set(id, {{ kind: "bypassed", toolName: event?.toolName, signature, stageSession }}); return {{}} }}
    if (READ_ONLY_TOOLS.includes(event?.toolName)) {{ outcomes.set(id, {{ kind: "read", toolName: event.toolName, signature }}); return {{}} }}
    if (event?.toolName === "bash") {{
      const command = event?.input?.command
      if (typeof command !== "string" || !command.trim()) return {{ block: true, reason: "bash requires a command" }}
      const confined = readOnlyConfinement(command, root!, workingDirectory!)
      if (!confined) return {{ block: true, reason: "read-only/no-network confinement unavailable" }}
      event.input.command = confined
      outcomes.set(id, {{ kind: "read-only bash", toolName: "bash", stageSession }})
      return {{}}
    }}
    if (!["write", "edit"].includes(event?.toolName)) return {{ block: true, reason: "unknown tool blocked" }}
    const originalPath = event?.input?.path
    if (typeof originalPath === "string" && [...outcomes.values()].some((outcome) => outcome.owner && outcome.originalPath === originalPath))
      return {{ block: true, reason: "same-file tool-call collision" }}
    if (!admit(ctx)) return {{ block: true, reason: `automatic dispatch admission unavailable: ${{admissionFailure}}` }}
    try {{
      currentAdmission.recapture()
      const result = authority.capacidad()?.gobernar(event)
      if (!result || result.pi.block) return result?.pi ?? {{ block: true, reason: "authority unavailable" }}
      outcomes.set(id, {{ kind: event.toolName, toolName: event.toolName, owner: authority, originalPath, signature }})
      return result.pi
    }} catch {{ return {{ block: true, reason: "admission drift" }} }}
  }})

  pi.on("tool_result", (event: any, ctx: any) => {{
    const id = event?.toolCallId
    if (!outcomes.has(id)) return
    const outcome = outcomes.get(id)
    if (outcome.toolName !== event.toolName) return
    outcomes.delete(id)
    if (outcome.owner) outcome.owner.completar(id, outcome.kind)
    if (outcome.stageSession) observeStage(event, outcome.stageSession, ctx)
    try {{
      if (!event?.isError && outcome.signature && ctx?.hasUI) ctx.ui.notify(outcome.signature, "info")
    }} catch {{ /* UI failure cannot change the completed tool result. */ }}
  }})
  pi.on("session_shutdown", () => {{ erase(true); stages.clear() }})
  pi.on("session_start", (_event: any, ctx: any) => {{
    erase(true); stages.clear(); initialize()
    try {{
      if (!hasAnnotations && ctx?.hasUI) ctx.ui.notify(
        "Chanks labels are off: this Pi build has no tool-call annotations. Run pi-overlay-rebuild to restore them.", "warning")
    }} catch {{ /* A missing or failing UI cannot stop the session. */ }}
  }})
}}
"""


def pi_extension_path(home: Path) -> Path:
    return home / PI_EXTENSION_RELATIVE


def desired_pi_extension(root: Path | None = None) -> bytes:
    root = root or repo_root()
    # Absolute paths pin the shim to this exact checkout. A relative import would resolve
    # against the runtime directory and could quietly load some other copy of these adapters.
    admision = (root / "chanks/pi-admission.mjs").resolve()
    autoridad = (root / "chanks/pi-authority.mjs").resolve()
    interruptor = (root / "chanks/pi-switch.mjs").resolve()
    firma = (root / "chanks/torre-firma.mjs").resolve()
    for modulo in (admision, autoridad, interruptor, firma):
        if not modulo.is_file():
            raise InstallError(f"missing Pi control module: {modulo}")
    return PI_EXTENSION_TEMPLATE.format(
        admision=admision, autoridad=autoridad, interruptor=interruptor, firma=firma,
        chanks_skills=json.dumps(CHANKS_SKILLS),
    ).encode("utf8")


def pi_extension_changes(home: Path, root: Path | None = None) -> list[Change]:
    destination = pi_extension_path(home)
    desired = desired_pi_extension(root)
    if destination.is_file() and destination.read_bytes() == desired:
        return []
    return [Change(destination, "pi-extension")]


def install_pi_extension(home: Path, root: Path | None = None) -> None:
    destination = pi_extension_path(home)
    destination.parent.mkdir(parents=True, exist_ok=True)
    _atomic_write(
        destination,
        desired_pi_extension(root),
        destination.parent,
        label="Pi extension shim",
        require_existing=False,
    )


# --- Pi host-peer npm wrapper ------------------------------------------------
# Pi warns when an extension lists host-provided packages under "dependencies". The wrapper
# repairs extension manifests after Pi's own npm install/update, and settings.json points
# Pi at it through "npmCommand". The source lives in tools/pi/ next to tools/hooks/.

PI_NPM_WRAPPER_SOURCE = Path("tools/pi/pi-npm-host-peers")
PI_NPM_WRAPPER_RELATIVE = Path(".pi/agent/bin/pi-npm-host-peers")
PI_SETTINGS_RELATIVE = Path(".pi/agent/settings.json")
PI_NPM_INSTALL_RELATIVE = Path(".pi/agent/npm")


def pi_npm_wrapper_path(home: Path) -> Path:
    return home / PI_NPM_WRAPPER_RELATIVE


def pi_settings_path(home: Path) -> Path:
    return home / PI_SETTINGS_RELATIVE


def _pi_npm_command(home: Path) -> list[str]:
    return [str(pi_npm_wrapper_path(home)), "--", "npm"]


def _read_pi_settings(home: Path) -> dict:
    path = pi_settings_path(home)
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf8"))
    except json.JSONDecodeError as exc:
        raise InstallError(f"Pi settings.json is not valid JSON: {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise InstallError(f"Pi settings.json must be a JSON object: {path}")
    return data


def _pi_wrapper_source(root: Path) -> Path:
    source = root / PI_NPM_WRAPPER_SOURCE
    if not source.is_file() or stat.S_IMODE(source.stat().st_mode) != 0o755:
        raise InstallError("Pi npm host-peer wrapper source must be a regular executable 755 file")
    return source


def pi_npm_host_peers_changes(home: Path, root: Path | None = None) -> list[Change]:
    root = root or repo_root()
    source = _pi_wrapper_source(root)
    changes: list[Change] = []
    target = pi_npm_wrapper_path(home)
    if not (
        target.is_file()
        and target.read_bytes() == source.read_bytes()
        and stat.S_IMODE(target.stat().st_mode) == 0o755
    ):
        changes.append(Change(target, "pi-npm-wrapper"))
    # A foreign npmCommand is the user's choice: it is never a drift we would rewrite.
    if "npmCommand" not in _read_pi_settings(home):
        changes.append(Change(pi_settings_path(home), "pi-npm-settings"))
    return changes


def install_pi_npm_host_peers(home: Path, root: Path | None = None) -> None:
    root = root or repo_root()
    source = _pi_wrapper_source(root)
    target = pi_npm_wrapper_path(home)
    if not (target.is_file() and target.read_bytes() == source.read_bytes()):
        _atomic_copy(source, target, home / ".pi")
    os.chmod(target, 0o755)

    settings = _read_pi_settings(home)
    desired = _pi_npm_command(home)
    current = settings.get("npmCommand")
    if current == desired:
        pass
    elif "npmCommand" in settings:
        print(
            f"WARNING: keeping the existing npmCommand in {pi_settings_path(home)}; "
            "the Pi host-peer wrapper is installed but not wired. "
            f"Set npmCommand to {json.dumps(desired)} to enable it.",
            file=sys.stderr,
        )
    else:
        settings["npmCommand"] = desired
        _atomic_write(
            pi_settings_path(home),
            (json.dumps(settings, indent=2) + "\n").encode("utf8"),
            home / ".pi",
            label="Pi settings",
            require_existing=False,
        )

    install_root = home / PI_NPM_INSTALL_RELATIVE
    if install_root.is_dir():
        try:
            result = subprocess.run(
                [str(target), "--repair", str(install_root)],
                capture_output=True, text=True, timeout=60,
            )
            if result.returncode != 0:
                raise OSError(f"exit {result.returncode}: {result.stderr.strip()}")
            if result.stderr.strip():
                print(result.stderr.strip(), file=sys.stderr)
        except (OSError, subprocess.SubprocessError) as exc:
            print(f"WARNING: Pi host-peer repair skipped: {exc}", file=sys.stderr)


# --- Pi overlay rebuild tool -------------------------------------------------
# pi-overlay-rebuild re-applies the private annotation overlay after Pi updates itself. The
# installed tool finds its manifest and patch in a sibling directory, so both are deployed too.

PI_OVERLAY_TOOL_SOURCE = Path("tools/pi/pi-overlay-rebuild")
PI_OVERLAY_TOOL_RELATIVE = Path(".pi/agent/bin/pi-overlay-rebuild")
PI_OVERLAY_DATA_RELATIVE = Path(".pi/agent/bin/pi-overlay")
PI_OVERLAY_DATA_SOURCES = {
    "manifest.json": Path("personal-pi/manifest.json"),
    "0001-tool-call-annotations.patch": Path("personal-pi/patches/0001-tool-call-annotations.patch"),
}


def pi_overlay_rebuild_path(home: Path) -> Path:
    return home / PI_OVERLAY_TOOL_RELATIVE


def _pi_overlay_entries(home: Path, root: Path) -> list[tuple[Path, Path, str, int]]:
    tool = root / PI_OVERLAY_TOOL_SOURCE
    if not tool.is_file() or stat.S_IMODE(tool.stat().st_mode) != 0o755:
        raise InstallError("Pi overlay rebuild tool source must be a regular executable 755 file")
    entries = [(tool, pi_overlay_rebuild_path(home), "pi-overlay-tool", 0o755)]
    for name, relative in PI_OVERLAY_DATA_SOURCES.items():
        source = root / relative
        if not source.is_file():
            raise InstallError(f"Pi overlay data source is missing: {relative}")
        entries.append((source, home / PI_OVERLAY_DATA_RELATIVE / name, "pi-overlay-data", 0o644))
    return entries


def pi_overlay_rebuild_changes(home: Path, root: Path | None = None) -> list[Change]:
    root = root or repo_root()
    return [
        Change(target, kind)
        for source, target, kind, mode in _pi_overlay_entries(home, root)
        if not (
            target.is_file()
            and target.read_bytes() == source.read_bytes()
            and stat.S_IMODE(target.stat().st_mode) == mode
        )
    ]


def install_pi_overlay_rebuild(home: Path, root: Path | None = None) -> None:
    root = root or repo_root()
    for source, target, _, mode in _pi_overlay_entries(home, root):
        if not (target.is_file() and target.read_bytes() == source.read_bytes()):
            _atomic_copy(source, target, home / ".pi")
        os.chmod(target, mode)


def _detail(change: Change) -> str:
    return f" ({change.detail})" if change.detail else ""


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="report drift and exit non-zero")
    mode.add_argument("--dry-run", action="store_true", help="report changes without writing")
    parser.add_argument("--home", type=Path, default=Path.home(), help="runtime home directory")
    parser.add_argument("--migrate-to-tower", action="store_true",
                        help="migrate legacy blocks (dry-run unless --apply)")
    parser.add_argument("--apply", action="store_true", help="apply the Tower migration with backups")
    parser.add_argument(
        "--pi-notices-only", action="store_true",
        help="install/check only the passive Pi notices extension (no other runtime changes)",
    )
    args = parser.parse_args(argv)
    if args.apply and (not args.migrate_to_tower or args.check or args.dry_run):
        parser.error("--apply requires --migrate-to-tower and cannot be combined with --check/--dry-run")
    if args.migrate_to_tower and (args.pi_notices_only or args.check):
        parser.error("--migrate-to-tower cannot be combined with --pi-notices-only/--check")
    try:
        home = _absolute(args.home.expanduser())
        if args.migrate_to_tower:
            plan = migrate_to_tower(home, repo_root(), apply_changes=args.apply)
            for skill in STOP_MANAGING_SKILLS:
                print(f"STOP_MANAGING skill: {skill} (Tower-owned; files retained)")
            for path, _, _, details in plan:
                for detail in details:
                    action, _, description = detail.partition(" ")
                    prefix = "APPLIED" if args.apply else "WOULD"
                    print(f"{prefix}_{action} {path}: {description}")
            if not plan:
                print("NO_CHANGES")
            return 0
        if args.pi_notices_only:
            raise InstallError("Pi notices are Tower-owned; use the Tower installer")
        changes = build_plan(home, repo_root())
        if any(any(_owned_marker_counts(path.read_bytes(), start))
               for path in installed_manual_paths(home) for _, start, _, _, _ in LEGACY_BLOCKS):
            print("HINT: legacy Chanks blocks left untouched; run --migrate-to-tower (dry-run first)")
        surfaces = ("Pi notices extension" if args.pi_notices_only
                    else "runtime copies and manual blocks")
        if args.check:
            if changes:
                for change in changes:
                    print(f"DRIFT {change.kind}: {change.path}{_detail(change)}")
                return 1
            print(f"OK: {surfaces} match the repository")
            return 0
        if args.dry_run:
            if changes:
                for change in changes:
                    print(f"WOULD_UPDATE {change.kind}: {change.path}{_detail(change)}")
            else:
                print("NO_CHANGES")
            return 0
        if args.pi_notices_only:
            install_pi_notices(home, repo_root())
        else:
            apply(home, repo_root())
        print(f"INSTALLED: {surfaces} match the repository")
        return 0
    except InstallError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
