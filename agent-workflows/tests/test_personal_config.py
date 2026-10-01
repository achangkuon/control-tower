import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
import hashlib
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "agent-workflows/tools"))
import install
HELPER_PATH = ROOT / "agent-workflows/tools/prepare-personal-config.py"
spec = importlib.util.spec_from_file_location("prepare_personal_config", HELPER_PATH)
personal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(personal)


class PersonalConfigMigrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.home = Path(self.temp.name) / "home"
        self.home.mkdir()
        self.hermes_python = self.write(".hermes/python", b"fixture interpreter", 0o750)
        self.script_hash_patch = patch.object(personal, "OWNED_SYNC_SHA256", hashlib.sha256(personal.OWNED_SYNC_SCRIPT).hexdigest())
        self.command_hash_patch = patch.object(personal, "OWNED_COMMAND_SHA256", hashlib.sha256(personal.OWNED_SYNC_COMMAND).hexdigest())
        self.script_hash_patch.start()
        self.command_hash_patch.start()

    def tearDown(self):
        self.script_hash_patch.stop()
        self.command_hash_patch.stop()
        self.temp.cleanup()

    def write(self, relative, data, mode=0o640):
        path = self.home / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        path.chmod(mode)
        return path

    def test_primary_archives_only_owned_sync_files_and_exact_hook(self):
        script = self.write(".claude/scripts/sync-skills.sh", personal.OWNED_SYNC_SCRIPT, 0o750)
        command = self.write(".claude/commands/sync-skills.md", personal.OWNED_SYNC_COMMAND, 0o640)
        settings = self.write(
            ".claude/settings.json",
            json.dumps({
                "custom": {"keep": True},
                "hooks": {
                    "PostToolUse": [
                        {"matcher": "Write|Edit|MultiEdit", "hooks": [
                            {"type": "command", "command": personal._hook_command(self.home), "statusMessage": "Propagando skills a opencode/codex/PI...", "timeout": 60},
                            {"type": "command", "command": "echo retain"},
                        ]},
                        {"matcher": "Read", "hooks": [{"type": "command", "command": "echo other"}]},
                    ],
                    "PreToolUse": [{"matcher": "*", "hooks": [{"type": "command", "command": "echo keep"}]}],
                },
            }).encode(),
        )
        before_settings = settings.read_bytes()

        plan = personal.plan_stage("primary", self.home, repo_root=ROOT)
        self.assertTrue(plan)
        self.assertTrue(script.exists())
        self.assertTrue(command.exists())
        self.assertFalse(list(self.home.rglob("*.retired")))

        personal.apply_stage("primary", self.home, repo_root=ROOT)
        archive = self.home / ".claude/.retired-config/2026-10-01"
        self.assertEqual((archive / "scripts/sync-skills.sh").read_bytes(), personal.OWNED_SYNC_SCRIPT)
        self.assertEqual((archive / "commands/sync-skills.md").read_bytes(), personal.OWNED_SYNC_COMMAND)
        self.assertEqual((archive / "settings.json").read_bytes(), before_settings)
        self.assertEqual((archive / "scripts/sync-skills.sh").stat().st_mode & 0o777, 0o750)
        after = json.loads(settings.read_text())
        self.assertEqual(after["custom"], {"keep": True})
        self.assertEqual(after["hooks"]["PreToolUse"], [{"matcher": "*", "hooks": [{"type": "command", "command": "echo keep"}]}])
        self.assertEqual(after["hooks"]["PostToolUse"], [
            {"matcher": "Write|Edit|MultiEdit", "hooks": [{"type": "command", "command": "echo retain"}]},
            {"matcher": "Read", "hooks": [{"type": "command", "command": "echo other"}]},
        ])
        self.assertFalse(script.exists())
        self.assertFalse(command.exists())

    def test_primary_refuses_custom_sync_script_before_any_write(self):
        script = self.write(".claude/scripts/sync-skills.sh", b"#!/bin/sh\necho custom\n", 0o750)
        command = self.write(".claude/commands/sync-skills.md", personal.OWNED_SYNC_COMMAND)
        settings = self.write(".claude/settings.json", b'{"hooks": {"PostToolUse": []}}')
        before = {p: p.read_bytes() for p in (script, command, settings)}
        with self.assertRaises(personal.MigrationError):
            personal.apply_stage("primary", self.home, repo_root=ROOT)
        self.assertEqual({p: p.read_bytes() for p in before}, before)
        self.assertFalse((self.home / ".claude/.retired-config").exists())

    def test_primary_rejects_duplicate_json_keys_before_archiving(self):
        script = self.write(".claude/scripts/sync-skills.sh", personal.OWNED_SYNC_SCRIPT, 0o750)
        command = self.write(".claude/commands/sync-skills.md", personal.OWNED_SYNC_COMMAND)
        settings = self.write(".claude/settings.json", b'{"hooks": {}, "hooks": {}}')
        before = {path: path.read_bytes() for path in (script, command, settings)}
        with self.assertRaises(personal.MigrationError):
            personal.apply_stage("primary", self.home, repo_root=ROOT)
        self.assertEqual({path: path.read_bytes() for path in before}, before)
        self.assertFalse((self.home / ".claude/.retired-config").exists())

    def test_primary_rejects_custom_hook_variant_without_archiving(self):
        script = self.write(".claude/scripts/sync-skills.sh", personal.OWNED_SYNC_SCRIPT, 0o750)
        command = self.write(".claude/commands/sync-skills.md", personal.OWNED_SYNC_COMMAND)
        settings = self.write(".claude/settings.json", json.dumps({"hooks": {"PostToolUse": [
            {"matcher": "Write", "hooks": [{
                "type": "command", "command": personal._hook_command(self.home),
                "statusMessage": "Propagando skills a opencode/codex/PI...", "timeout": 60,
            }]},
        ]}}).encode())
        before = {path: path.read_bytes() for path in (script, command, settings)}
        with self.assertRaises(personal.MigrationError):
            personal.apply_stage("primary", self.home, repo_root=ROOT)
        self.assertEqual({path: path.read_bytes() for path in before}, before)

    def test_primary_dry_run_is_default_and_apply_is_opt_in(self):
        script = self.write(".claude/scripts/sync-skills.sh", personal.OWNED_SYNC_SCRIPT, 0o750)
        self.write(".claude/commands/sync-skills.md", personal.OWNED_SYNC_COMMAND)
        self.write(".claude/settings.json", b'{"hooks":{"PostToolUse":[]}}')
        self.assertEqual(personal.main(["--stage", "primary", "--home", str(self.home)]), 0)
        self.assertTrue(script.exists())
        self.assertEqual(personal.main(["--stage", "primary", "--home", str(self.home), "--check"]), 0)
        self.assertTrue(script.exists())

    def test_primary_rejects_settings_symlink_without_following_it(self):
        target = self.write("outside.json", b'{"hooks": {"PostToolUse": []}}')
        link = self.home / ".claude/settings.json"
        link.parent.mkdir(parents=True)
        link.symlink_to(target)
        self.write(".claude/scripts/sync-skills.sh", personal.OWNED_SYNC_SCRIPT, 0o750)
        self.write(".claude/commands/sync-skills.md", personal.OWNED_SYNC_COMMAND)
        before = target.read_bytes()
        with self.assertRaises(personal.MigrationError):
            personal.apply_stage("primary", self.home, repo_root=ROOT)
        self.assertEqual(target.read_bytes(), before)

    def test_hermes_config_adds_central_path_and_preserves_other_yaml_values(self):
        config = self.write(".hermes/config.yaml", b"skills:\n  creation_nudge_interval: 15\n  external_dirs:\n    - /existing/skills\nother:\n  enabled: true\n")
        self.make_skill_rosters()
        self.write(".hermes/SOUL.md", self.soul_with_unattended())
        calls = []
        personal.apply_stage("hermes", self.home, repo_root=ROOT, hermes_python=self.hermes_python,
                             subprocess_runner=self.yaml_runner(calls))
        self.assertEqual(calls[0][0][0], str(self.hermes_python))
        self.assertEqual(calls[0][0][-1], str(self.home / ".agents/skills"))
        self.assertIn("UniqueLoader", calls[0][0][2])
        self.assertIn("creation_nudge_interval: 15", calls[0][1])
        self.assertNotIn(b"UNATTENDED-SEALED-CONSENT:MANUAL", (self.home / ".hermes/SOUL.md").read_bytes())
        self.assertEqual(config.stat().st_mode & 0o777, 0o640)
        self.assertTrue((self.home / ".hermes/.retired-skills/chanks-0-jornada").is_dir())
        self.assertTrue((self.home / ".hermes/skills/third-party").is_dir())
        self.assertTrue((self.home / ".hermes/.retired-skills/chanks-1-prd").is_dir())

    def test_hermes_malformed_yaml_and_duplicate_keys_fail_before_any_write(self):
        self.write(".hermes/config.yaml", b"skills:\nskills:\n")
        self.make_skill_rosters()
        soul = self.write(".hermes/SOUL.md", self.soul_with_unattended())
        before = soul.read_bytes()
        with self.assertRaises(personal.MigrationError):
            personal.apply_stage("hermes", self.home, repo_root=ROOT, hermes_python=self.hermes_python,
                                 subprocess_runner=self.yaml_runner([], error=True))
        self.assertEqual(soul.read_bytes(), before)
        self.assertTrue((self.home / ".hermes/skills/chanks-0-jornada").is_dir())

    def test_installed_hermes_python_yaml_round_trip_when_available(self):
        interpreter = personal.HERMES_YAML_PYTHON
        if not interpreter.is_file():
            self.skipTest("installed Hermes Python/PyYAML interpreter is unavailable")
        result = personal._hermes_yaml(
            interpreter,
            b"skills:\n  creation_nudge_interval: 15\n  external_dirs:\n    - /existing/skills\nother:\n  enabled: true\n",
            "/fixture/.agents/skills",
        )
        self.assertIn(b"creation_nudge_interval: 15", result)
        self.assertIn(b"/existing/skills", result)
        self.assertIn(b"/fixture/.agents/skills", result)

    def test_installed_hermes_parser_rejects_duplicate_keys_without_fixture_writes(self):
        if not personal.HERMES_YAML_PYTHON.is_file():
            self.skipTest("installed Hermes Python/PyYAML interpreter is unavailable")
        config = self.write(".hermes/config.yaml", b"skills: {}\nskills: {}\n")
        self.make_skill_rosters()
        soul = self.write(".hermes/SOUL.md", self.soul_with_unattended())
        before = {p: p.read_bytes() for p in (config, soul)}
        with self.assertRaises(personal.MigrationError):
            personal.apply_stage("hermes", self.home, repo_root=ROOT,
                                 hermes_python=personal.HERMES_YAML_PYTHON)
        self.assertEqual({p: p.read_bytes() for p in before}, before)
        self.assertTrue((self.home / ".hermes/skills/chanks-0-jornada").is_dir())

    def test_hermes_requires_central_roster_before_config_or_archive(self):
        self.write(".hermes/config.yaml", b"skills: {}\n")
        (self.home / ".agents/skills").mkdir(parents=True)
        self.make_skill_rosters()
        with self.assertRaises(personal.MigrationError):
            personal.plan_stage("hermes", self.home, repo_root=ROOT, hermes_python=self.hermes_python,
                                subprocess_runner=self.yaml_runner([]))
        self.assertTrue((self.home / ".hermes/skills/chanks-0-jornada").is_dir())

    def test_hermes_preserves_absent_unattended_block_and_rejects_bad_markers(self):
        self.write(".hermes/config.yaml", b"skills: {}\n")
        self.make_skill_rosters()
        soul = self.write(".hermes/SOUL.md", b"personal text\n")
        planned = personal.plan_stage("hermes", self.home, repo_root=ROOT, hermes_python=self.hermes_python,
                                      subprocess_runner=self.yaml_runner([]))
        self.assertFalse(any(path == soul for path, _, _ in planned))
        self.assertEqual(soul.read_bytes(), b"personal text\n")
        self.write(".hermes/SOUL.md", self.soul_with_routing() + b"<!-- UNATTENDED-SEALED-CONSENT:MANUAL -->\nx\n")
        with self.assertRaises(personal.MigrationError):
            personal.plan_stage("hermes", self.home, repo_root=ROOT, hermes_python=self.hermes_python,
                                subprocess_runner=self.yaml_runner())

    def test_snapshot_archives_previous_store_once_and_refreshes_compatible_blocks(self):
        self.make_instruction_files()
        old = self.write(".claude/.skill-backups/manual-blocks/claude/00-old.md", b"<!-- old -->\nold\n<!-- /old -->\n")
        old_order = self.write(".claude/.skill-backups/manual-blocks/claude/ORDER.txt", b"old\n")
        old_content, old_order_content = old.read_bytes(), old_order.read_bytes()
        personal.apply_stage("snapshot", self.home, repo_root=ROOT)
        archive = self.home / ".claude/.skill-backups/manual-blocks-boundary-2026-10-01"
        self.assertEqual((archive / "claude/00-old.md").read_bytes(), old_content)
        self.assertEqual((archive / "claude/ORDER.txt").read_bytes(), old_order_content)
        self.assertTrue((self.home / ".claude/.skill-backups/manual-blocks/hermes/ORDER.txt").exists())
        first = {p.relative_to(self.home): p.read_bytes() for p in (self.home / ".claude/.skill-backups/manual-blocks").rglob("*") if p.is_file()}
        personal.apply_stage("snapshot", self.home, repo_root=ROOT)
        second = {p.relative_to(self.home): p.read_bytes() for p in (self.home / ".claude/.skill-backups/manual-blocks").rglob("*") if p.is_file()}
        self.assertEqual(first, second)
        self.assertTrue(archive.exists())

    def test_snapshot_refuses_stale_unattended_block_without_changing_store(self):
        self.make_instruction_files()
        self.write(".hermes/SOUL.md", self.soul_with_unattended())
        store = self.write(".claude/.skill-backups/manual-blocks/claude/00-old.md", b"old\n")
        before = store.read_bytes()
        with self.assertRaises(personal.MigrationError):
            personal.apply_stage("snapshot", self.home, repo_root=ROOT)
        self.assertEqual(store.read_bytes(), before)
        self.assertFalse((self.home / ".claude/.skill-backups/manual-blocks-boundary-2026-10-01").exists())

    def test_snapshot_restore_simulation_does_not_resurrect_retired_block(self):
        self.make_instruction_files()
        personal.apply_stage("snapshot", self.home, repo_root=ROOT)
        snapshot = personal.load_snapshot(self.home / ".claude/.skill-backups/manual-blocks")
        self.assertNotIn("UNATTENDED-SEALED-CONSENT:MANUAL", repr(snapshot))
        self.assertNotIn("chanks-4-unattended-implementation", repr(snapshot))

    def make_skill_rosters(self):
        for skill in install.OWN_SKILLS + install.V3_DEFERRED_SKILLS:
            path = self.home / ".agents/skills" / skill
            shutil.copytree(ROOT / "agent-workflows/skills" / skill, path)
        (self.home / ".hermes/skills/third-party").mkdir(parents=True)
        for skill in install.V3_DEFERRED_SKILLS + ("chanks-1-prd",):
            path = self.home / ".hermes/skills" / skill
            path.mkdir(parents=True)
            (path / "SKILL.md").write_text(f"# {skill}\n", encoding="utf-8")

    def make_instruction_files(self):
        paths = {
            "claude": ".claude/CLAUDE.md", "codex": ".codex/AGENTS.md",
            "opencode": ".config/opencode/AGENTS.md", "pi": ".pi/agent/APPEND_SYSTEM.md",
            "hermes": ".hermes/SOUL.md",
        }
        for agent, path in paths.items():
            routing = install.render_manual_blocks(ROOT / "agent-workflows")[install.START_MARKER]
            self.write(path, routing + f"<!-- PERSONAL-{agent} -->\ncorrected {agent}\n<!-- /PERSONAL-{agent} -->\n".encode())

    @staticmethod
    def soul_with_unattended():
        return (b"before\n<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->\nstale routing\n"
                b"<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->\n"
                b"<!-- UNATTENDED-SEALED-CONSENT:MANUAL (manual -- keep) -->\nretire\n"
                b"<!-- /UNATTENDED-SEALED-CONSENT:MANUAL -->\nafter\n")

    @staticmethod
    def soul_with_routing():
        return b"before\n<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->\nstale routing\n<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->\nafter\n"

    @staticmethod
    def yaml_runner(calls=None, error=False):
        calls = [] if calls is None else calls
        def run(args, *, input, text, capture_output, check):
            calls.append((args, input))
            if error:
                return SimpleNamespace(returncode=2, stderr="duplicate YAML key", stdout="")
            return SimpleNamespace(returncode=0, stderr="", stdout=(
                "skills:\n  creation_nudge_interval: 15\n  external_dirs:\n"
                f"    - /existing/skills\n    - {args[-1]}\nother:\n  enabled: true\n"
            ))
        return run


if __name__ == "__main__":
    unittest.main()
