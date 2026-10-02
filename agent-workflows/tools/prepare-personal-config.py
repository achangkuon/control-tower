#!/usr/bin/env python3
"""Prepare reversible, fixture-testable personal runtime migrations."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Callable


ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "agent-workflows/tools"
sys.path.insert(0, str(TOOLS))
import install  # noqa: E402


OWNED_SYNC_SHA256 = "17242543a6d489184a5e8cb6baca04ae18e417d12fc879b2d313754078628a64"
OWNED_COMMAND_SHA256 = "c07d0de424279bd76d40ff4efa00fdc5deacdc89d82ba6538305a82476ccea14"
# Public fixture payloads let tests exercise ownership checks without touching HOME.
OWNED_SYNC_SCRIPT = b"#!/bin/sh\n# owned sync script fixture\n"
OWNED_SYNC_COMMAND = b"# owned sync command fixture\n"
HERMES_YAML_PYTHON = Path.home() / ".hermes/hermes-agent/venv/bin/python"
ARCHIVE_DATE = "2026-10-01"
MANUAL_STORE = Path(".claude/.skill-backups/manual-blocks")
MANUAL_ARCHIVE = Path(f".claude/.skill-backups/manual-blocks-boundary-{ARCHIVE_DATE}")
UNATTENDED = b"UNATTENDED-SEALED-CONSENT:MANUAL"
UNATTENDED_RE = re.compile(
    rb"^<!-- UNATTENDED-SEALED-CONSENT:MANUAL(?: \(manual [^\n]*\))? -->\r?\n.*?"
    rb"^<!-- /UNATTENDED-SEALED-CONSENT:MANUAL -->(?:\r?\n|$)",
    re.MULTILINE | re.DOTALL,
)
SNAPSHOT_RE = re.compile(
    r"^<!-- (?!/)([A-Za-z0-9_.:-]+)\b[^\n]*-->.*?^<!-- /\1 -->",
    re.DOTALL | re.MULTILINE,
)
MANAGED_PREFIXES = ("gentle-ai:", "section:")
STALE_SNAPSHOT = (UNATTENDED.decode(),) + install.DEFERRED_SKILLS


class MigrationError(RuntimeError):
    """A migration input is ambiguous or unsafe to change."""


def _no_symlink(path: Path) -> None:
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current /= part
        if current.is_symlink():
            raise MigrationError(f"refusing symlink path: {current}")


def _read(path: Path) -> bytes | None:
    _no_symlink(path)
    try:
        return path.read_bytes()
    except FileNotFoundError:
        return None


def _mode(path: Path) -> int:
    return path.stat().st_mode & 0o777


def _atomic_write(path: Path, content: bytes, mode: int) -> None:
    _no_symlink(path)
    _no_symlink(path.parent)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _hook_command(home: Path) -> str:
    return (
        "jq -r '.tool_input.file_path // empty' | { read -r f; case \"$f\" in "
        f"*/.claude/skills/*) bash {home}/.claude/scripts/sync-skills.sh >/dev/null 2>&1 ;; "
        "esac; } 2>/dev/null || true"
    )


def _settings_after(data: bytes, home: Path) -> bytes:
    def unique_object(pairs):
        value = {}
        for key, item in pairs:
            if key in value:
                raise ValueError(f"duplicate JSON key: {key}")
            value[key] = item
        return value

    try:
        obj = json.loads(data, object_pairs_hook=unique_object)
    except (ValueError, UnicodeDecodeError) as exc:
        raise MigrationError("Claude settings are not valid JSON") from exc
    if not isinstance(obj, dict):
        raise MigrationError("Claude settings root must be an object")
    hooks = obj.get("hooks")
    if hooks is None:
        return data
    if not isinstance(hooks, dict):
        raise MigrationError("Claude settings hooks must be an object")
    post = hooks.get("PostToolUse", [])
    if not isinstance(post, list):
        raise MigrationError("Claude PostToolUse must be an array")
    matches = []
    for index, entry in enumerate(post):
        if not isinstance(entry, dict):
            raise MigrationError("Claude PostToolUse entries must be objects")
        group = entry.get("hooks")
        if not isinstance(group, list):
            raise MigrationError("matching PostToolUse hooks must be an array")
        for hook_index, hook in enumerate(group):
            if not isinstance(hook, dict):
                raise MigrationError("PostToolUse hook entries must be objects")
            command = hook.get("command", "")
            if not isinstance(command, str):
                raise MigrationError("PostToolUse command must be a string")
            if ".claude/scripts/sync-skills.sh" in command:
                if entry.get("matcher") != "Write|Edit|MultiEdit" or hook != {
                    "command": _hook_command(home),
                    "statusMessage": "Propagando skills a opencode/codex/PI...",
                    "timeout": 60,
                    "type": "command",
                }:
                    raise MigrationError("custom or ambiguous autosync hook; refusing partial removal")
                matches.append((index, hook_index))
    if len(matches) > 1:
        raise MigrationError("multiple matching autosync hooks; refusing to guess")
    if not matches:
        return data
    if matches:
        entry_index, hook_index = matches[0]
        updated = [dict(entry) for entry in post]
        target = dict(updated[entry_index])
        target_hooks = list(target["hooks"])
        target_hooks.pop(hook_index)
        if target_hooks:
            target["hooks"] = target_hooks
            updated[entry_index] = target
        else:
            updated.pop(entry_index)
        hooks["PostToolUse"] = updated
    return (json.dumps(obj, ensure_ascii=False, indent=2) + "\n").encode()


def _owned_bytes(path: Path, expected_hash: str, label: str) -> bytes | None:
    data = _read(path)
    if data is not None and hashlib.sha256(data).hexdigest() != expected_hash:
        raise MigrationError(f"unrecognized personal {label}; refusing to archive")
    return data


def _central_roster(home: Path, repo_root: Path) -> None:
    central = home / ".agents/skills"
    _no_symlink(central)
    # V2- and V3-deferred skills are intentionally absent from the central active roster after install.
    roster = install.OWN_SKILLS
    for name in roster:
        source = repo_root / "agent-workflows/skills" / name
        installed = central / name
        _no_symlink(source)
        _no_symlink(installed)
        if not source.is_dir() or not installed.is_dir():
            raise MigrationError(f"central own-skill roster is incomplete: {name}")
        for tree in (source, installed):
            for path in tree.rglob("*"):
                _no_symlink(path)
        expected = {p.relative_to(source).as_posix(): p.read_bytes() for p in source.rglob("*") if p.is_file()}
        actual = {p.relative_to(installed).as_posix(): p.read_bytes() for p in installed.rglob("*") if p.is_file()}
        if not expected or expected != actual:
            raise MigrationError(f"central own-skill bytes differ from repository: {name}")


def _remove_unattended(content: bytes, path: Path) -> bytes:
    starts, ends = install._owned_marker_counts(content, b"<!-- " + UNATTENDED + b" -->")
    if starts == 0 and ends == 0:
        return content
    if starts != 1 or ends != 1:
        raise MigrationError(f"malformed or duplicate unattended block in {path}")
    matches = list(UNATTENDED_RE.finditer(content))
    if len(matches) != 1:
        raise MigrationError(f"unrecognized unattended block formatting in {path}")
    for begin, finish in install._managed_ranges(content, path):
        match = matches[0]
        if begin < match.end() and match.start() < finish:
            raise MigrationError(f"unattended block is nested in managed content: {path}")
    match = matches[0]
    return content[:match.start()] + content[match.end():]


def _desired_existing_manual_content(content: bytes, path: Path,
                                     replacements: dict[bytes, bytes], *,
                                     add_absent: bool = False) -> bytes:
    """Apply installer templates to blocks already present in this file. With `add_absent`
    (the Hermes stage), also append the installer's ADDED_WHEN_ABSENT_BLOCKS the file lacks.
    Every other absent block stays absent."""
    ranges = []
    try:
        managed_ranges = install._managed_ranges(content, path)
    except install.InstallError as exc:
        raise MigrationError(f"malformed managed marker nesting in {path}") from exc
    absent = []
    for _, start, end, pattern, _required in install.MANUAL_BLOCKS:
        starts, ends = install._owned_marker_counts(content, start)
        if starts == 0 and ends == 0:
            if add_absent and start in install.ADDED_WHEN_ABSENT_BLOCKS:
                absent.append(start)
            continue
        if starts != 1 or ends != 1:
            raise MigrationError(f"malformed Hermes personal block in {path}: {start.decode()}")
        matches = list(pattern.finditer(content))
        if len(matches) != 1:
            raise MigrationError(f"unrecognized Hermes personal block in {path}: {start.decode()}")
        match = matches[0]
        if any(begin < match.end() and match.start() < finish for begin, finish in managed_ranges):
            raise MigrationError(f"Hermes personal block nested in managed content: {path}")
        ranges.append((match.start(), match.end(), start, end, pattern))
    ordered = sorted(ranges)
    for left, right in zip(ordered, ordered[1:]):
        if left[1] > right[0]:
            raise MigrationError(f"overlapping Hermes personal blocks in {path}")
    for begin, finish, start, end, pattern in reversed(ranges):
        content = install._replace_owned_block(
            content, replacements[start], path, start, end, pattern, required=False
        )
    ordered_absent = tuple(start for start in install.ADDED_WHEN_ABSENT_BLOCKS if start in absent)
    return install.append_absent_blocks(content, replacements, ordered_absent)


def _yaml_process(interpreter: Path, source: str, central: str,
                  runner: Callable = subprocess.run) -> str:
    code = r'''import json, sys, yaml
class UniqueLoader(yaml.SafeLoader): pass
def mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result: raise ValueError("duplicate YAML key: " + str(key))
        result[key] = loader.construct_object(value_node, deep=deep)
    return result
UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)
try:
    data = yaml.load(sys.stdin.read(), Loader=UniqueLoader)
    if not isinstance(data, dict): raise ValueError("configuration root must be a mapping")
    skills = data.setdefault("skills", {})
    if not isinstance(skills, dict): raise ValueError("skills must be a mapping")
    dirs = skills.setdefault("external_dirs", [])
    if not isinstance(dirs, list) or any(not isinstance(p, str) for p in dirs):
        raise ValueError("skills.external_dirs must be a list of strings")
    central = sys.argv[1]
    if central not in dirs: dirs.append(central)
    sys.stdout.write(yaml.safe_dump(data, sort_keys=False, allow_unicode=True))
except Exception as exc:
    print(str(exc), file=sys.stderr); sys.exit(2)
'''
    result = runner([str(interpreter), "-c", code, central], input=source, text=True,
                    capture_output=True, check=False)
    if result.returncode:
        raise MigrationError(f"Hermes YAML preflight failed: {result.stderr.strip() or 'invalid config'}")
    return result.stdout


def _hermes_yaml(interpreter: Path, source: bytes, central: str,
                 subprocess_runner: Callable = subprocess.run) -> bytes:
    if not interpreter.is_file():
        raise MigrationError(f"Hermes PyYAML interpreter is unavailable: {interpreter}")
    try:
        result = _yaml_process(interpreter, source.decode("utf-8"), central, subprocess_runner)
    except (UnicodeDecodeError, OSError) as exc:
        raise MigrationError("cannot parse Hermes YAML with the installed Hermes interpreter") from exc
    return result.encode()


def _skill_tree(path: Path) -> dict[str, tuple[bytes, int]]:
    if path.is_symlink():
        raise MigrationError(f"refusing symlinked skill: {path}")
    output = {}
    for child in path.rglob("*"):
        _no_symlink(child)
        if child.is_file():
            output[child.relative_to(path).as_posix()] = (child.read_bytes(), _mode(child))
    return output


def _archive_skill(source: Path, destination: Path) -> None:
    _no_symlink(source)
    if not source.is_dir():
        return
    before = _skill_tree(source)
    if not before:
        raise MigrationError(f"refusing empty skill copy: {source}")
    if destination.exists():
        _no_symlink(destination)
        if _skill_tree(destination) != before:
            raise MigrationError(f"retired skill archive differs: {destination}")
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)
        _no_symlink(destination.parent)
        temporary = Path(tempfile.mkdtemp(prefix=f".{destination.name}.archive.", dir=destination.parent))
        try:
            for relative, (content, mode) in before.items():
                _atomic_write(temporary / relative, content, mode)
            if _skill_tree(temporary) != before:
                raise MigrationError(f"retired skill staging readback mismatch: {source}")
            os.replace(temporary, destination)
        finally:
            if temporary.exists():
                shutil.rmtree(temporary)
    if _skill_tree(destination) != before:
        raise MigrationError(f"retired skill readback mismatch: {destination}")
    shutil.rmtree(source)


def _stage_primary(home: Path) -> list[tuple[Path, bytes, int]]:
    claude = home / ".claude"
    script = claude / "scripts/sync-skills.sh"
    command = claude / "commands/sync-skills.md"
    settings = claude / "settings.json"
    script_data = _owned_bytes(script, OWNED_SYNC_SHA256, "sync script")
    command_data = _owned_bytes(command, OWNED_COMMAND_SHA256, "sync command")
    settings_data = _read(settings)
    result = []
    if settings_data is not None:
        new = _settings_after(settings_data, home)
        if new != settings_data:
            result.append((settings, new, _mode(settings)))
    if script_data is not None:
        result.append((script, b"", _mode(script)))
    if command_data is not None:
        result.append((command, b"", _mode(command)))
    # Archive collision checks are part of full preflight, before settings change.
    archive = claude / ".retired-config" / ARCHIVE_DATE
    for source in (script, command):
        if _read(source) is not None:
            target = archive / source.relative_to(claude)
            existing = _read(target)
            if existing is not None and (existing != source.read_bytes() or _mode(target) != _mode(source)):
                raise MigrationError(f"archive collision differs from source: {target}")
    settings_archive = archive / "settings.json"
    if any(path == settings for path, _, _ in result) and settings_data is not None:
        existing = _read(settings_archive)
        if existing is not None and (existing != settings_data or _mode(settings_archive) != _mode(settings)):
            raise MigrationError(f"settings backup already exists with different bytes: {settings_archive}")
    return result


def _stage_hermes(home: Path, repo_root: Path, interpreter: Path,
                  subprocess_runner: Callable = subprocess.run) -> list[tuple[Path, bytes, int]]:
    _central_roster(home, repo_root)
    config = home / ".hermes/config.yaml"
    soul = home / ".hermes/SOUL.md"
    config_data = _read(config)
    soul_data = _read(soul)
    if config_data is None or soul_data is None:
        raise MigrationError("Hermes config.yaml and SOUL.md must both exist")
    updated_yaml = _hermes_yaml(interpreter, config_data, str(home / ".agents/skills"), subprocess_runner)
    replacements = install.render_manual_blocks(repo_root / "agent-workflows")
    propagated_soul = _desired_existing_manual_content(
        soul_data, soul, replacements, add_absent=True)
    updated_soul = _remove_unattended(propagated_soul, soul)
    actions = []
    if updated_yaml != config_data:
        actions.append((config, updated_yaml, _mode(config)))
    if updated_soul != soul_data:
        actions.append((soul, updated_soul, _mode(soul)))
    for name in install.OWN_SKILLS + install.DEFERRED_SKILLS:
        source = home / ".hermes/skills" / name
        destination = home / ".hermes/.retired-skills" / name
        _no_symlink(source)
        if source.exists():
            if not source.is_dir():
                raise MigrationError(f"named Hermes skill is not a directory: {source}")
            if destination.exists() and _skill_tree(destination) != _skill_tree(source):
                raise MigrationError(f"retired skill archive differs: {destination}")
            actions.append((source, b"", 0))
    return actions


def _manual_sources(home: Path) -> dict[str, Path]:
    return {
        "claude": home / ".claude/CLAUDE.md",
        "codex": home / ".codex/AGENTS.md",
        "opencode": home / ".config/opencode/AGENTS.md",
        "pi": home / ".pi/agent/APPEND_SYSTEM.md",
        "hermes": home / ".hermes/SOUL.md",
    }


def _capture_blocks(path: Path) -> list[tuple[str, str]]:
    data = _read(path)
    if data is None:
        return []
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise MigrationError(f"instruction file is not UTF-8: {path}") from exc
    blocks = []
    expected_blocks = install.render_manual_blocks(ROOT / "agent-workflows")
    expected_by_name = {
        start.decode()[len("<!-- "):-len(" -->")]: content.decode()
        for start, content in expected_blocks.items()
    }
    desired = _desired_existing_manual_content(data, path, expected_blocks)
    if desired != data:
        raise MigrationError(f"targeted personal instruction block is stale in {path}")
    for match in SNAPSHOT_RE.finditer(text):
        name, body = match.group(1), match.group(0)
        if name.startswith(MANAGED_PREFIXES):
            continue
        if any(stale in body for stale in STALE_SNAPSHOT):
            raise MigrationError(f"stale personal instruction block in {path}: {name}")
        if name in expected_by_name:
            expected = expected_by_name[name]
            body_without_annotation = re.sub(
                r"^<!-- " + re.escape(name) + r"(?: \(manual[^\n]*\))? -->",
                "<!-- " + name + " -->", body, count=1,
            )
            if body_without_annotation != expected.rstrip("\n"):
                raise MigrationError(f"targeted personal block is stale in {path}: {name}")
        blocks.append((name, body))
    names = [name for name, _ in blocks]
    if len(names) != len(set(names)):
        raise MigrationError(f"duplicate snapshot block names in {path}")
    return blocks


def load_snapshot(store: Path) -> dict[str, dict[str, str]]:
    result = {}
    for order in store.glob("*/ORDER.txt"):
        agent = order.parent.name
        names = [line for line in order.read_text(encoding="utf-8").splitlines() if line]
        blocks = {}
        for path in sorted(order.parent.glob("*.md")):
            text = path.read_text(encoding="utf-8").rstrip("\n")
            match = SNAPSHOT_RE.match(text)
            if match:
                blocks[match.group(1)] = text
        result[agent] = {name: blocks[name] for name in names if name in blocks}
    return result


def _snapshot_bytes(home: Path) -> dict[Path, bytes]:
    output = {}
    for agent, path in _manual_sources(home).items():
        blocks = _capture_blocks(path)
        if not blocks:
            continue
        names = []
        for index, (name, body) in enumerate(blocks):
            filename = name.replace(":", "__").replace("/", "_")
            output[Path(agent) / f"{index:02d}-{filename}.md"] = (body + "\n").encode()
            names.append(name)
        output[Path(agent) / "ORDER.txt"] = ("\n".join(names) + "\n").encode()
    return output


def _stage_snapshot(home: Path) -> list[tuple[Path, bytes, int]]:
    store = home / MANUAL_STORE
    archive = home / MANUAL_ARCHIVE
    generated = _snapshot_bytes(home)
    old_files = {}
    if store.exists():
        _no_symlink(store)
        for path in store.rglob("*"):
            _no_symlink(path)
            if path.is_file():
                old_files[path.relative_to(store)] = path.read_bytes()
    previous = store.with_name(store.name + ".previous")
    if previous.exists():
        raise MigrationError(f"snapshot recovery directory already exists: {previous}")
    if not generated and not old_files:
        return []
    if archive.exists():
        _no_symlink(archive)
    if generated == old_files:
        return []
    return [(store, json.dumps({str(k): v.decode() for k, v in generated.items()}, sort_keys=True).encode(), 0)]


def plan_stage(stage: str, home: Path, *, repo_root: Path = ROOT,
               hermes_python: Path = HERMES_YAML_PYTHON,
               subprocess_runner: Callable = subprocess.run):
    if stage == "primary":
        return _stage_primary(home)
    if stage == "hermes":
        return _stage_hermes(home, repo_root, hermes_python, subprocess_runner)
    if stage == "snapshot":
        return _stage_snapshot(home)
    raise MigrationError(f"unknown migration stage: {stage}")


def apply_stage(stage: str, home: Path, *, repo_root: Path = ROOT,
                hermes_python: Path = HERMES_YAML_PYTHON,
                subprocess_runner: Callable = subprocess.run):
    actions = plan_stage(stage, home, repo_root=repo_root, hermes_python=hermes_python,
                         subprocess_runner=subprocess_runner)
    if stage == "primary":
        archive_root = home / ".claude/.retired-config" / ARCHIVE_DATE
        # Save the complete settings object before changing any setting.
        settings = home / ".claude/settings.json"
        if any(path == settings for path, _, _ in actions):
            before = _read(settings)
            if before is not None:
                _atomic_write(archive_root / "settings.json", before, _mode(settings))
                if _read(archive_root / "settings.json") != before:
                    raise MigrationError("settings backup readback mismatch")
        owned_files = [(path, mode) for path, content, mode in actions if content == b""]
        for path, mode in owned_files:
            destination = archive_root / path.relative_to(home / ".claude")
            _no_symlink(path)
            _no_symlink(destination.parent)
            existing = _read(destination)
            if existing is None:
                _atomic_write(destination, path.read_bytes(), mode)
            if _read(destination) != path.read_bytes() or _mode(destination) != mode:
                raise MigrationError(f"archive readback mismatch: {destination}")
        for path, content, mode in actions:
            if path == settings:
                _atomic_write(path, content, mode)
        for path, _ in owned_files:
            if path.exists():
                path.unlink()
    elif stage == "hermes":
        for path, content, mode in actions:
            if path.name == "config.yaml" or path.name == "SOUL.md":
                _atomic_write(path, content, mode)
            else:
                _archive_skill(path, home / ".hermes/.retired-skills" / path.name)
    else:
        if actions:
            payload = json.loads(actions[0][1])
            store = home / MANUAL_STORE
            archive = home / MANUAL_ARCHIVE
            if store.exists() and not archive.exists():
                archive.parent.mkdir(parents=True, exist_ok=True)
                temporary_archive = Path(tempfile.mkdtemp(prefix=f".{archive.name}.", dir=archive.parent))
                staged_archive = temporary_archive / archive.name
                try:
                    shutil.copytree(store, staged_archive, copy_function=shutil.copy2)
                    for source in store.rglob("*"):
                        _no_symlink(source)
                    frozen = {p.relative_to(staged_archive): (p.read_bytes(), _mode(p))
                              for p in staged_archive.rglob("*") if p.is_file()}
                    original = {p.relative_to(store): (p.read_bytes(), _mode(p))
                                for p in store.rglob("*") if p.is_file()}
                    if frozen != original:
                        raise MigrationError("manual snapshot archive readback mismatch")
                    os.replace(staged_archive, archive)
                finally:
                    if temporary_archive.exists():
                        shutil.rmtree(temporary_archive)
            _no_symlink(store.parent)
            store.parent.mkdir(parents=True, exist_ok=True)
            temporary = Path(tempfile.mkdtemp(prefix=f".{store.name}.new.", dir=store.parent))
            for relative, content in payload.items():
                destination = temporary / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(content.encode())
            previous = store.with_name(store.name + ".previous")
            if store.exists():
                os.replace(store, previous)
            try:
                os.replace(temporary, store)
            except OSError:
                if previous.exists() and not store.exists():
                    os.replace(previous, store)
                raise
            if previous.exists():
                shutil.rmtree(previous)
    return actions


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", required=True, choices=("primary", "hermes", "snapshot"))
    parser.add_argument("--home", type=Path, default=Path.home())
    parser.add_argument("--repo-root", type=Path, default=ROOT)
    parser.add_argument("--hermes-python", type=Path, help="explicit Hermes Python interpreter with PyYAML")
    parser.add_argument("--apply", action="store_true", help="apply after complete stage preflight")
    parser.add_argument("--check", action="store_true", help="read-only preflight (default)")
    args = parser.parse_args(argv)
    try:
        if args.stage == "hermes" and args.hermes_python is None:
            raise MigrationError("Hermes stage requires explicit --hermes-python with PyYAML")
        interpreter = args.hermes_python or HERMES_YAML_PYTHON
        actions = plan_stage(args.stage, args.home, repo_root=args.repo_root, hermes_python=interpreter)
        if args.apply:
            apply_stage(args.stage, args.home, repo_root=args.repo_root, hermes_python=interpreter)
        print(f"{args.stage}: {len(actions)} change(s)" + (" applied" if args.apply else "; read-only"))
        return 0
    except MigrationError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
