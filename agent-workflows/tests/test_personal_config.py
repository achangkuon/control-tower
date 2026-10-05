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
        self.write(".hermes/config.yaml", b"skills:\n  external_dirs: []\n")
        self.write(".hermes/SOUL.md", self.soul_with_unattended())
        (self.home / ".agents/skills").mkdir(parents=True)
        hermes_skills = self.home / ".hermes/skills"
        for skill in install.OWN_SKILLS + install.DEFERRED_SKILLS:
            shutil.copytree(install.skill_source_root(ROOT / "agent-workflows", skill), hermes_skills / skill)
        before = {path.relative_to(self.home).as_posix(): (path.read_bytes(), path.stat().st_mode & 0o777)
                  for path in self.home.rglob("*") if path.is_file()}
        with self.assertRaises(personal.MigrationError):
            personal.apply_stage("hermes", self.home, repo_root=ROOT,
                                 hermes_python=personal.HERMES_YAML_PYTHON)
        after = {path.relative_to(self.home).as_posix(): (path.read_bytes(), path.stat().st_mode & 0o777)
                 for path in self.home.rglob("*") if path.is_file()}
        self.assertEqual(after, before)
        self.assertTrue((self.home / ".hermes/skills/chanks-0-jornada").is_dir())

    def test_installer_then_hermes_archives_deferred_skills_and_keeps_active_central_roster(self):
        if not personal.HERMES_YAML_PYTHON.is_file():
            self.skipTest("installed Hermes Python/PyYAML interpreter is unavailable")
        self.write(".hermes/config.yaml", b"skills:\n  creation_nudge_interval: 15\nother:\n  enabled: true\n")
        self.write(".hermes/SOUL.md", self.soul_with_unattended())
        hermes_skills = self.home / ".hermes/skills"
        for skill in install.OWN_SKILLS + install.DEFERRED_SKILLS:
            shutil.copytree(install.skill_source_root(ROOT / "agent-workflows", skill), hermes_skills / skill)
        (hermes_skills / "third-party").mkdir(parents=True)
        (hermes_skills / "third-party/SKILL.md").write_text("# Retain third-party\n", encoding="utf-8")

        install.apply(self.home, ROOT / "agent-workflows")
        central = self.home / ".agents/skills"
        central_names = {path.name for path in central.iterdir()}
        # install.py owns only the personal roster centrally; the Tower V1 roster
        # is installed by the product installer (issue #154).
        self.assertTrue(set(install.PERSONAL_SKILLS) <= central_names)
        self.assertEqual(len(install.OWN_SKILLS), 26)
        self.assertFalse(set(install.DEFERRED_SKILLS) & central_names)
        # Simulate the Tower V1 product installer, which on a real machine already
        # placed the V1 roster in the central root before this migration runs
        # (issue #154).
        for name in install.OWN_SKILLS:
            if name in install.TOWER_V1_SKILLS:
                shutil.copytree(install.skill_source_root(ROOT / "agent-workflows", name), central / name)
        central_names = {path.name for path in central.iterdir()}
        # V1_PENDING_SKILLS are deliberately shipped by neither Tower nor this
        # installer (install.py:89-91) until their packaging Session removes them
        # from the pending list (S219): they must stay absent from central.
        self.assertTrue(set(install.OWN_SKILLS) - set(install.V1_PENDING_SKILLS) <= central_names)
        self.assertTrue(all((central / name).is_dir() for name in install.OWN_SKILLS
                            if name not in install.V1_PENDING_SKILLS))
        self.assertTrue(all(not (central / name).exists()
                            for name in install.V1_PENDING_SKILLS))
        self.assertTrue(all(not (central / name).exists() for name in install.DEFERRED_SKILLS))
        hermes_before = {
            name: {path.relative_to(hermes_skills / name).as_posix(): path.read_bytes()
                   for path in (hermes_skills / name).rglob("*") if path.is_file()}
            for name in install.OWN_SKILLS + install.DEFERRED_SKILLS
        }

        personal.apply_stage("hermes", self.home, repo_root=ROOT,
                             hermes_python=personal.HERMES_YAML_PYTHON)

        retired = self.home / ".hermes/.retired-skills"
        for name, expected in hermes_before.items():
            archived = retired / name
            self.assertFalse((hermes_skills / name).exists())
            self.assertEqual({path.relative_to(archived).as_posix(): path.read_bytes()
                              for path in archived.rglob("*") if path.is_file()}, expected)
        self.assertTrue((hermes_skills / "third-party").is_dir())
        self.assertTrue(all((central / name).is_dir() for name in install.OWN_SKILLS
                            if name not in install.V1_PENDING_SKILLS))
        config = personal._hermes_yaml(personal.HERMES_YAML_PYTHON,
                                       (self.home / ".hermes/config.yaml").read_bytes(),
                                       str(central))
        self.assertIn(str(central).encode(), config)
        self.assertIn(b"creation_nudge_interval: 15", config)
        for name in install.OWN_SKILLS:
            if name in install.V1_PENDING_SKILLS:
                continue  # not installed centrally until its packaging Session (S219)
            source = install.skill_source_root(ROOT / "agent-workflows", name)
            installed = central / name
            expected = {path.relative_to(source).as_posix(): install.runtime_skill_bytes(name, path.relative_to(source), path)
                        for path in source.rglob("*") if path.is_file()}
            actual = {path.relative_to(installed).as_posix(): path.read_bytes()
                      for path in installed.rglob("*") if path.is_file()}
            self.assertEqual(actual, expected, name)
        first_snapshot = {path.relative_to(self.home).as_posix(): path.read_bytes()
                          for path in self.home.rglob("*") if path.is_file()}
        personal.apply_stage("hermes", self.home, repo_root=ROOT,
                             hermes_python=personal.HERMES_YAML_PYTHON)
        self.assertEqual({path.relative_to(self.home).as_posix(): path.read_bytes()
                          for path in self.home.rglob("*") if path.is_file()}, first_snapshot)

        active_file = next(path for path in (central / install.OWN_SKILLS[0]).rglob("*") if path.is_file())
        active_file.write_bytes(active_file.read_bytes() + b"corruption\n")
        corrupted_snapshot = {path.relative_to(self.home).as_posix(): path.read_bytes()
                              for path in self.home.rglob("*") if path.is_file()}
        with self.assertRaises(personal.MigrationError):
            personal.apply_stage("hermes", self.home, repo_root=ROOT,
                                 hermes_python=personal.HERMES_YAML_PYTHON)
        self.assertEqual({path.relative_to(self.home).as_posix(): path.read_bytes()
                          for path in self.home.rglob("*") if path.is_file()}, corrupted_snapshot)

    def test_hermes_preserves_absent_unattended_block_and_rejects_bad_markers(self):
        self.write(".hermes/config.yaml", b"skills: {}\n")
        self.make_skill_rosters()
        soul = self.write(".hermes/SOUL.md", b"personal text\n")
        planned = personal.plan_stage("hermes", self.home, repo_root=ROOT, hermes_python=self.hermes_python,
                                      subprocess_runner=self.yaml_runner([]))
        desired = [data for path, data, _ in planned if path == soul]
        self.assertEqual(len(desired), 1)
        self.assertTrue(desired[0].startswith(b"personal text\n"))
        self.assertNotIn(b"UNATTENDED-SEALED-CONSENT", desired[0])
        self.assertEqual(soul.read_bytes(), b"personal text\n")
        self.write(".hermes/SOUL.md", self.soul_with_routing() + b"<!-- UNATTENDED-SEALED-CONSENT:MANUAL -->\nx\n")
        with self.assertRaises(personal.MigrationError):
            personal.plan_stage("hermes", self.home, repo_root=ROOT, hermes_python=self.hermes_python,
                                subprocess_runner=self.yaml_runner())

    HERMES_ADDED = (b"doc-guard-rule", b"EXPLAIN-TO-MAINTAINER:MANUAL", b"PLAN-NAMING:GLOBAL")

    def blocks(self, relative):
        return install.blocks_for(
            self.home / relative, install.render_manual_blocks(ROOT / "agent-workflows"))

    def hermes(self, action=personal.apply_stage):
        return action("hermes", self.home, repo_root=ROOT, hermes_python=self.hermes_python,
                      subprocess_runner=self.yaml_runner([]))

    def test_hermes_soul_receives_absent_blocks_once_and_repeat_is_idempotent(self):
        self.write(".hermes/config.yaml", b"skills: {}\n")
        self.make_skill_rosters()
        managed = b"<!-- gentle-ai:persona -->\nkeep managed bytes\n<!-- /gentle-ai:persona -->\n"
        original = managed + self.soul_with_routing()
        soul = self.write(".hermes/SOUL.md", original)
        replacements = self.blocks(".hermes/SOUL.md")
        self.hermes()
        content = soul.read_bytes()
        self.assertTrue(content.startswith(managed + b"before\n"))
        blocks = [replacements[b"<!-- " + name + b" -->"] for name in self.HERMES_ADDED]
        self.assertTrue(content.endswith(b"\nafter\n\n" + b"\n".join(blocks)))
        self.assertIn(b"    ~/.agents/skills/_shared/plan-naming-convention.md   (copia runtime;",
                      content)
        self.assertNotIn(b"{{", content)
        for name in self.HERMES_ADDED:
            self.assertEqual(content.count(b"<!-- " + name + b" -->"), 1)
        self.assertNotIn(b"AGENT-PROPAGATION-MAP:MANUAL", content)
        self.assertEqual(soul.stat().st_mode & 0o777, 0o640)
        self.assertFalse(any(path == soul for path, _, _ in self.hermes(personal.plan_stage)))
        self.hermes()
        self.assertEqual(soul.read_bytes(), content)

    def test_hermes_existing_block_is_replaced_in_place_not_duplicated(self):
        self.write(".hermes/config.yaml", b"skills: {}\n")
        self.make_skill_rosters()
        stale = b"<!-- doc-guard-rule -->\nstale rule\n<!-- /doc-guard-rule -->\n"
        soul = self.write(".hermes/SOUL.md", stale + self.soul_with_routing())
        replacements = self.blocks(".hermes/SOUL.md")
        self.hermes()
        content = soul.read_bytes()
        self.assertTrue(content.startswith(replacements[b"<!-- doc-guard-rule -->"]))
        self.assertEqual(content.count(b"<!-- doc-guard-rule -->"), 1)
        self.assertTrue(content.endswith(replacements[b"<!-- PLAN-NAMING:GLOBAL -->"]))
        self.assertEqual(content.count(b"<!-- PLAN-NAMING:GLOBAL -->"), 1)

    def test_hermes_malformed_marker_of_an_added_block_is_refused_before_any_write(self):
        self.write(".hermes/config.yaml", b"skills: {}\n")
        self.make_skill_rosters()
        cases = {
            "unclosed": b"<!-- doc-guard-rule -->\nold rule\n",
            "stray-end": b"<!-- /EXPLAIN-TO-MAINTAINER:MANUAL -->\n",
            "managed-nested": b"<!-- gentle-ai:x -->\n<!-- doc-guard-rule -->\nold\n"
                              b"<!-- /doc-guard-rule -->\n<!-- /gentle-ai:x -->\n",
            "plan-naming-unclosed": b"<!-- PLAN-NAMING:GLOBAL -->\nold rule\n",
            "plan-naming-stray-end": b"<!-- /PLAN-NAMING:GLOBAL -->\n",
            "plan-naming-duplicate": 2 * b"<!-- PLAN-NAMING:GLOBAL -->\nold\n<!-- /PLAN-NAMING:GLOBAL -->\n",
            "plan-naming-managed-nested": b"<!-- section:x -->\n<!-- PLAN-NAMING:GLOBAL -->\nold\n"
                                          b"<!-- /PLAN-NAMING:GLOBAL -->\n<!-- /section:x -->\n",
        }
        for case, invalid in cases.items():
            with self.subTest(case=case):
                soul = self.write(".hermes/SOUL.md", self.soul_with_routing() + invalid)
                before = soul.read_bytes()
                with self.assertRaises(personal.MigrationError):
                    self.hermes()
                self.assertEqual(soul.read_bytes(), before)

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

    PLAN_NAMING = b"<!-- PLAN-NAMING:GLOBAL -->"
    INSTRUCTION_FILES = (".claude/CLAUDE.md", ".codex/AGENTS.md", ".config/opencode/AGENTS.md",
                         ".pi/agent/APPEND_SYSTEM.md", ".hermes/SOUL.md")

    def test_snapshot_accepts_each_runtime_carrying_its_own_plan_naming_path(self):
        self.make_instruction_files()
        for relative in self.INSTRUCTION_FILES:
            path = self.home / relative
            path.write_bytes(path.read_bytes() + self.blocks(relative)[self.PLAN_NAMING])
        personal.apply_stage("snapshot", self.home, repo_root=ROOT)
        snapshot = personal.load_snapshot(self.home / ".claude/.skill-backups/manual-blocks")
        self.assertIn("~/.claude/skills/_shared/", snapshot["claude"]["PLAN-NAMING:GLOBAL"])
        self.assertIn("~/.codex/skills/_shared/", snapshot["codex"]["PLAN-NAMING:GLOBAL"])
        self.assertIn("~/.agents/skills/_shared/", snapshot["pi"]["PLAN-NAMING:GLOBAL"])
        self.assertIn("~/.agents/skills/_shared/", snapshot["hermes"]["PLAN-NAMING:GLOBAL"])

    def test_snapshot_refuses_a_plan_naming_block_with_another_runtime_path_or_old_wording(self):
        stale_blocks = {
            "other-runtime-path": self.blocks(".claude/CLAUDE.md")[self.PLAN_NAMING],
            "old-wording": b"<!-- PLAN-NAMING:GLOBAL -->\nThe sole authority is:\n"
                           b"<!-- /PLAN-NAMING:GLOBAL -->\n",
        }
        for case, stale in stale_blocks.items():
            with self.subTest(case=case):
                self.make_instruction_files()
                pi = self.home / ".pi/agent/APPEND_SYSTEM.md"
                pi.write_bytes(pi.read_bytes() + stale)
                with self.assertRaisesRegex(personal.MigrationError, "stale"):
                    personal.apply_stage("snapshot", self.home, repo_root=ROOT)
                self.assertFalse((self.home / ".claude/.skill-backups/manual-blocks").exists())

    def test_snapshot_refuses_stale_unattended_block_without_changing_store(self):
        self.make_instruction_files()
        self.write(".hermes/SOUL.md", self.soul_with_unattended())
        store = self.write(".claude/.skill-backups/manual-blocks/claude/00-old.md", b"old\n")
        before = store.read_bytes()
        with self.assertRaises(personal.MigrationError):
            personal.apply_stage("snapshot", self.home, repo_root=ROOT)
        self.assertEqual(store.read_bytes(), before)
        self.assertFalse((self.home / ".claude/.skill-backups/manual-blocks-boundary-2026-10-01").exists())

    def test_snapshot_refuses_a_block_that_still_points_to_a_deferred_skill(self):
        self.assertIn("chanks-3-session-kickoff", personal.STALE_SNAPSHOT)
        for skill in install.DEFERRED_SKILLS:
            self.assertIn(skill, personal.STALE_SNAPSHOT)
        self.make_instruction_files()
        claude = self.home / ".claude/CLAUDE.md"
        claude.write_bytes(
            claude.read_bytes()
            + b"<!-- OWN-NOTE:MANUAL -->\nStart with `chanks-3-session-kickoff`.\n<!-- /OWN-NOTE:MANUAL -->\n"
        )
        with self.assertRaisesRegex(personal.MigrationError, "stale personal instruction block"):
            personal.apply_stage("snapshot", self.home, repo_root=ROOT)

    def test_snapshot_restore_simulation_does_not_resurrect_retired_block(self):
        self.make_instruction_files()
        personal.apply_stage("snapshot", self.home, repo_root=ROOT)
        snapshot = personal.load_snapshot(self.home / ".claude/.skill-backups/manual-blocks")
        self.assertNotIn("UNATTENDED-SEALED-CONSENT:MANUAL", repr(snapshot))
        self.assertNotIn("chanks-4-unattended-implementation", repr(snapshot))

    def test_central_roster_validates_deferred_personal_source_and_runtime_links(self):
        self.make_skill_rosters()
        personal._central_roster(self.home, ROOT)
        support = self.home / ".agents/skills/chanks-0-agente-soporte/SKILL.md"
        self.assertIn(b"../chanks-4-puente/SKILL.md", support.read_bytes())
        source = install.skill_source_root(ROOT / "agent-workflows", "chanks-0-agente-soporte") / "SKILL.md"
        support.write_bytes(source.read_bytes())
        with self.assertRaisesRegex(personal.MigrationError, "bytes differ"):
            personal._central_roster(self.home, ROOT)

    def make_skill_rosters(self):
        for skill in install.OWN_SKILLS + install.DEFERRED_SKILLS:
            path = self.home / ".agents/skills" / skill
            source = install.skill_source_root(ROOT / "agent-workflows", skill)
            shutil.copytree(source, path)
            for relative in (p.relative_to(source) for p in source.rglob("*") if p.is_file()):
                (path / relative).write_bytes(install.runtime_skill_bytes(skill, relative, source / relative))
        (self.home / ".hermes/skills/third-party").mkdir(parents=True)
        for skill in install.DEFERRED_SKILLS + ("chanks-1-prd",):
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
