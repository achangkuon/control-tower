#!/usr/bin/env python3
"""Install and verify the user-owned session skill family."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
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
    "chanks-3-session-kickoff",
    "chanks-3-coordinador-manual",
    "chanks-3-despacho-herdr",
    "chanks-4-puente",
    "chanks-4-unattended-implementation",
    "chanks-6-politica-de-entrega",
    "chanks-7-session-doc",
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
    changes.extend(pi_extension_changes(home, root))
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
    if pi_extension_path(home) in change_paths:
        install_pi_extension(home, root)
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
// The host owns CHANKS_PI_ADMISSION; this extension consumes it once and never accepts it
// from the model. Controls remain in the revocable capability created by pi-authority.mjs.
import {{ createHash }} from "node:crypto"
import {{ execFileSync }} from "node:child_process"
import {{ closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync }} from "node:fs"
import {{ isAbsolute, relative, sep }} from "node:path"
import {{ Type }} from "@earendil-works/pi-ai"
import {{ crearAutoridadPi }} from "{modulo}"

const ADMISSION_ENV = "CHANKS_PI_ADMISSION"
const blocked = (reason: string) => ({{
  content: [{{ type: "text", text: `Blocked: ${{reason}}` }}],
  details: undefined,
}})

const consumeAdmission = () => {{
  const raw = process.env[ADMISSION_ENV]
  delete process.env[ADMISSION_ENV]
  if (typeof raw !== "string") return null
  try {{ return JSON.parse(raw) }} catch {{ return null }}
}}

const plain = (value: any) => value !== null && typeof value === "object" && !Array.isArray(value)
const exactKeys = (value: any, keys: string[]) => plain(value)
  && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
const fail = () => {{ throw new Error("host live evidence is invalid or stale") }}
const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex")

const canonicalDirectory = (value: any) => {{
  if (typeof value !== "string" || !isAbsolute(value)) fail()
  const canonical = realpathSync(value)
  if (canonical !== value || !lstatSync(canonical).isDirectory()) fail()
  return canonical
}}

const inside = (root: string, path: string) => {{
  const rel = relative(root, path)
  return rel === "" || (!rel.startsWith(`..${{sep}}`) && rel !== ".." && !isAbsolute(rel))
}}

const trustedExecutable = (value: any, root: string, authorized: any[]) => {{
  if (typeof value !== "string" || !isAbsolute(value)) fail()
  const canonical = realpathSync(value)
  const stat = lstatSync(canonical)
  if (canonical !== value || !stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o111) === 0) fail()
  if (inside(root, canonical) || authorized.includes(canonical)) fail()
  return canonical
}}

const proofFields = ["repositoryRoot", "sessionId", "baseCommit", "candidateDigest", "runtimeIdentity", "statusDigest", "sessionDigest"]
const sameFile = (left: any, right: any) => left.dev === right.dev && left.ino === right.ino
  && left.mode === right.mode && left.nlink === right.nlink && left.nlink === 1

const closeProof = (proof: any) => {{
  if (!proof || proof.closed) return
  proof.closed = true
  try {{ closeSync(proof.descriptor) }} catch {{}}
}}

const retainedProof = (value: any, root: string, authorized: any[]) => {{
  if (typeof value !== "string" || !isAbsolute(value)) fail()
  const canonical = realpathSync(value)
  const current = lstatSync(canonical)
  if (canonical !== value || !current.isFile() || current.isSymbolicLink() || current.nlink !== 1
    || inside(root, canonical) || authorized.includes(canonical)) fail()
  const noFollow = constants.O_NOFOLLOW
  if (!Number.isSafeInteger(noFollow) || noFollow <= 0) fail()
  let descriptor: number | null = null
  try {{
    descriptor = openSync(canonical, constants.O_RDONLY | noFollow)
    const held = fstatSync(descriptor)
    const observed = lstatSync(canonical)
    if (!sameFile(held, current) || !sameFile(held, observed)) fail()
    return {{ path: canonical, descriptor, closed: false }}
  }} catch (error) {{
    if (descriptor !== null) try {{ closeSync(descriptor) }} catch {{}}
    throw error
  }}
}}

const readProof = (proof: any) => {{
  if (!proof || proof.closed) fail()
  const held = fstatSync(proof.descriptor)
  const observed = lstatSync(proof.path)
  if (!sameFile(held, observed) || held.size <= 0 || held.size > 65536) fail()
  const bytes = Buffer.alloc(held.size)
  if (readSync(proof.descriptor, bytes, 0, bytes.length, 0) !== bytes.length) fail()
  let value: any
  try {{ value = JSON.parse(bytes.toString("utf8")) }} catch {{ fail() }}
  if (!exactKeys(value, proofFields)) fail()
  return value
}}

const hostEnvelope = (value: any) => {{
  if (!exactKeys(value, ["admission", "radarExecutable", "gitExecutable", "identityFile"]) || !plain(value.admission)) fail()
  const root = canonicalDirectory(value.admission.repositoryRoot)
  const authorized = Array.isArray(value.admission.authorizedFiles) ? value.admission.authorizedFiles : []
  return Object.freeze({{
    admission: value.admission,
    root,
    radar: trustedExecutable(value.radarExecutable, root, authorized),
    git: trustedExecutable(value.gitExecutable, root, authorized),
    identity: retainedProof(value.identityFile, root, authorized),
  }})
}}

const output = (executable: string, args: string[], root: string) => {{
  try {{ return execFileSync(executable, args, {{ cwd: root, stdio: ["ignore", "pipe", "ignore"] }}) }} catch {{ fail() }}
}}

const liveIdentity = (host: any, live: boolean) => {{
  if (!live || !host) fail()
  const admission = host.admission
  const proof = readProof(host.identity)
  const root = canonicalDirectory(process.cwd())
  if (root !== host.root || root !== admission.repositoryRoot) fail()
  const git = output(host.git, ["-C", root, "rev-parse", "HEAD"], root).toString("utf8")
  const base = git.endsWith("\\n") ? git.slice(0, -1) : git
  if (!/^[a-f0-9]{{40}}(?:[a-f0-9]{{24}})?$/.test(base)) fail()
  const status = output(host.radar, ["status", "--json", "-C", root], root)
  const session = output(host.radar, ["sesion", admission.sessionId, "-C", root], root)
  try {{
    const document = JSON.parse(status.toString("utf8"))
    if (!plain(document) || document.schema !== "radar.snapshot/v1") fail()
  }} catch {{ fail() }}
  if (session.length === 0 || !session.toString("utf8").includes(admission.sessionId)) fail()
  const statusDigest = sha256(status)
  const sessionDigest = sha256(session)
  if (base !== admission.baseCommit
    || statusDigest !== admission.radar?.statusDigest
    || sessionDigest !== admission.radar?.sessionDigest
    || proof.repositoryRoot !== root
    || proof.sessionId !== admission.sessionId
    || proof.baseCommit !== base
    || proof.candidateDigest !== admission.candidateDigest
    || proof.runtimeIdentity !== admission.runtimeIdentity
    || proof.statusDigest !== statusDigest
    || proof.sessionDigest !== sessionDigest) fail()
  return Object.freeze({{
    repositoryRoot: root,
    sessionId: admission.sessionId,
    baseCommit: base,
    candidateDigest: admission.candidateDigest,
    runtimeIdentity: admission.runtimeIdentity,
  }})
}}

const confirmationOf = (bundle: any) => [
  `Session: ${{bundle.sessionId}}`,
  `Repository: ${{bundle.repositoryRoot}}`,
  "Authorized files:",
  ...bundle.authorizedFiles.map((file: string) => `- ${{file}}`),
  "Cimientos:",
  ...bundle.cimientoGrants.map((file: string) => `- ${{file}}`),
  "Confirmed resources:",
  ...bundle.resources.map((resource: any) => `- ${{resource.id}} (${{resource.mode}})`),
  `Base: ${{bundle.baseCommit}}`,
  `Candidate: ${{bundle.candidateDigest}}`,
  `Runtime: ${{bundle.runtimeIdentity}}`,
].join("\\n")

export default function chanksControls(pi: any) {{
  let controller: any = null
  let requestId: string | null = null
  let host: any = null
  let confirmation: string | null = null
  let lifecycleLive = true

  const erase = () => {{
    lifecycleLive = false
    try {{ controller?.invalidar() }} catch {{}}
    closeProof(host?.identity)
    controller = null
    requestId = null
    host = null
    confirmation = null
  }}

  // The host owns executable paths and admission. Solicitation first proves the current
  // repository, Git base, and exact Radar bytes; each later capability lookup repeats it.
  const admitted = consumeAdmission()
  if (admitted !== null) {{
    try {{
      const currentHost = hostEnvelope(admitted)
      host = currentHost
      const candidate = crearAutoridadPi({{ identidadActual: () => liveIdentity(currentHost, lifecycleLive) }})
      const requested = candidate.solicitar(currentHost.admission)
      confirmation = confirmationOf(currentHost.admission)
      requestId = requested.solicitud
      controller = candidate
    }} catch {{
      erase()
    }}
  }}

  pi.registerTool({{
    name: "chanks_request_activation",
    label: "Request Chanks activation",
    description: "Request host-owned human activation of the admitted Chanks authority.",
    parameters: Type.Object({{}}, {{ additionalProperties: false }}),
    executionMode: "sequential",
    async execute(_toolCallId: string, _params: any, _signal: any, _onUpdate: any, ctx: any) {{
      if (controller?.capacidad()) {{
        return {{ content: [{{ type: "text", text: "Chanks authority is already active." }}], details: undefined }}
      }}
      if (!controller || !requestId || !confirmation) return blocked("no valid host admission is available")
      if (!ctx.hasUI) {{
        erase()
        return blocked("human confirmation UI is unavailable")
      }}
      try {{
        const confirmed = await ctx.ui.confirm("Activate Chanks authority?", confirmation)
        if (confirmed !== true || !controller?.aceptar(requestId)) {{
          erase()
          return blocked("human activation was not accepted")
        }}
        requestId = null
        return {{ content: [{{ type: "text", text: "Chanks authority is active." }}], details: undefined }}
      }} catch {{
        erase()
        return blocked("human activation could not be confirmed")
      }}
    }},
  }})

  pi.on("tool_call", (event: any) => {{
    const capability = controller?.capacidad()
    if (!capability) {{
      // A pending request has not yet received human confirmation. Any other absent capability
      // is stale or invalid and must release the controller before Pi can evaluate a tool.
      if (controller && requestId === null) erase()
      return {{ block: true, reason: "💪 Chanks · blocked · no active validated authority" }}
    }}
    const governed = capability.gobernar(event)
    if (governed.entradaPi) {{
      for (const key of Object.keys(event.input)) delete event.input[key]
      Object.assign(event.input, governed.entradaPi)
    }}
    return governed.pi
  }})

  // Session replacement and reload never re-read the environment. The shutdown of the old
  // runtime erases the controller, and a newly loaded runtime can only see a freshly supplied
  // process-start bundle (the previous one was deleted above).
  pi.on("session_shutdown", () => erase())
  pi.on("session_start", (event: any) => {{
    if (event.reason !== "startup") erase()
  }})
}}
"""


def pi_extension_path(home: Path) -> Path:
    return home / PI_EXTENSION_RELATIVE


def desired_pi_extension(root: Path | None = None) -> bytes:
    root = root or repo_root()
    # The absolute path pins the shim to this checkout. A relative import would resolve against
    # the runtime directory and could quietly load some other copy of the adapter.
    modulo = (root / "chanks/pi-authority.mjs").resolve()
    if not modulo.is_file():
        raise InstallError(f"missing Pi authority adapter: {modulo}")
    return PI_EXTENSION_TEMPLATE.format(modulo=modulo).encode("utf8")


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
