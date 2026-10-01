#!/usr/bin/env python3
"""Install and verify the user-owned session skill family."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
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


# Shared conventions read by several skills. Installed like a skill directory
# but carries no SKILL.md of its own, so it must stay first: a skill that lands
# without its conventions is a skill with no source of truth.
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
    "chanks-0-jornada",
    "chanks-0-mensajes-visibles",
    "chanks-0-explicalo-simple",
    "chanks-0-session-context-loader",
    "chanks-0-skill-composer",
    "chanks-1-cierre-de-decisiones",
    "chanks-2-planificador-granular",
    "chanks-3-session-kickoff",
    "chanks-3-paralelo",
    "chanks-3-coordinador-manual",
    "chanks-3-despacho-herdr",
    "chanks-4-puente",
    "chanks-4-unattended-implementation",
    "chanks-5-politica-de-entrega",
    "chanks-5-session-doc",
)

# Non-Chanks support skills.
SUPPORT_SKILLS = (
    "analisis-por-tramos",
    "skill-orchestrator",
)

SKILLS = SHARED + CHANKS_SKILLS + SUPPORT_SKILLS

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
)

# Retiring a runtime copy must never destroy bytes the user owns: a locally
# customized skill sharing a retired name is archived beside the runtime root
# instead of deleted, so an install is always reversible by hand.
RETIRED_SKILL_ARCHIVE = ".retired-skills"

MANUAL_FILES = (
    Path(".claude/CLAUDE.md"),
    Path(".config/opencode/AGENTS.md"),
    Path(".codex/AGENTS.md"),
    Path(".pi/agent/APPEND_SYSTEM.md"),
)
START_MARKER = b"<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->"
END_MARKER = b"<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->"


def _block_re(name: bytes) -> re.Pattern[bytes]:
    return re.compile(
        rb"^<!-- " + name + rb" -->\r?\n.*?^<!-- /" + name + rb" -->(?:\r?\n|$)",
        re.DOTALL | re.MULTILINE,
    )


BLOCK_RE = _block_re(b"SESSION-SKILL-ARCHITECTURE:MANUAL")
MANUAL_BLOCKS = (
    ("session-routing.md", START_MARKER, END_MARKER, BLOCK_RE, True),
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
    return home / ".claude/hooks/torre-firma.sh"


def firma_hook_changes(home: Path, root: Path) -> list[Change]:
    if not (home / ".claude").is_dir():
        return []
    source = root / "tools/hooks/torre-firma.sh"
    if not source.is_file() or stat.S_IMODE(source.stat().st_mode) != 0o755:
        raise InstallError("Tower signature hook source must be a regular executable 755 file")
    target = firma_hook_path(home)
    _validate_directory_path(target.parent, "signature hook directory")
    _validate_file_destination(home / ".claude", target, "signature hook")
    if target.is_file() and target.read_bytes() == source.read_bytes() and stat.S_IMODE(target.stat().st_mode) == 0o755:
        return []
    return [Change(target, "signature-hook")]


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
    changes.extend(carril_changes(home, root))
    changes.extend(pi_extension_changes(home, root))
    changes.extend(pi_npm_host_peers_changes(home, root))
    changes.extend(etapa_hook_changes(home, root))
    changes.extend(firma_hook_changes(home, root))
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


def retired_skill_archive_root(runtime_root: Path) -> Path:
    return _absolute(runtime_root) / RETIRED_SKILL_ARCHIVE


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
    replacements = render_manual_blocks(root)
    change_paths = {change.path for change in changes}
    for runtime_root in installed_skill_roots(home):
        for skill, relative, source in source_files(root):
            destination = runtime_root / skill / relative
            if destination in change_paths:
                _atomic_copy(source, destination, runtime_root)
    for path in installed_manual_paths(home):
        if path in change_paths:
            _atomic_write(path, desired_manual_content(path, replacements), path.parent)
    for runtime_root in installed_skill_roots(home):
        for retired_skill in RETIRED_SKILLS:
            destination = runtime_root / retired_skill
            if destination in change_paths:
                _archive_retired_skill(runtime_root, destination)
    if carril_path(home) in change_paths:
        _atomic_copy(carril_source(root), carril_path(home), home / ".local")
        os.chmod(carril_path(home), 0o755)
    if pi_extension_path(home) in change_paths:
        install_pi_extension(home, root)
    if pi_npm_wrapper_path(home) in change_paths or pi_settings_path(home) in change_paths:
        install_pi_npm_host_peers(home, root)
    if etapa_hook_path(home) in change_paths:
        _atomic_copy(etapa_hook_source(root), etapa_hook_path(home), home / ".claude")
    if firma_hook_path(home) in change_paths:
        _atomic_copy(root / "tools/hooks/torre-firma.sh", firma_hook_path(home), home / ".claude")
    return changes


# --- S144: the Pi extension shim -------------------------------------------
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
  pi.registerToolCallAnnotation("read", (args: any) => {{
    const name = skillName(args?.path, workingDirectory ?? process.cwd())
    return name ? `💪 Chanks · ${{name}} · lectura solicitada` : undefined
  }})
  pi.registerToolCallAnnotation("bash", (args: any) => {{
    const radar = radarDirecto(args?.command)
    return radar ? `🗼 Torre · radar ${{radar.subcommand}} · solicitado` : undefined
  }})

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
  pi.on("session_start", () => {{ erase(true); stages.clear(); initialize() }})
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
