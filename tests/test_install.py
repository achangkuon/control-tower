import importlib.util
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/install.py"
SPEC = importlib.util.spec_from_file_location("agent_workflows_install", SCRIPT)
INSTALLER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = INSTALLER
SPEC.loader.exec_module(INSTALLER)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.home = Path(self.tempdir.name)
        self._seed_runtime()

    def tearDown(self):
        self.tempdir.cleanup()

    def _seed_runtime(self, home=None):
        home = home or self.home
        old_block = (
            INSTALLER.START_MARKER
            + b"\n## Durable Session Skill Routing\n"
            + b"- old runtime path\n"
            + INSTALLER.END_MARKER
            + b"\n"
        )
        for path in INSTALLER.manual_paths(home):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"managed-prefix\n" + old_block + b"managed-suffix\n")

    def test_install_is_idempotent_and_preserves_surrounding_manual_content(self):
        preserved_mode = 0o640
        mode_path = self.home / ".claude/CLAUDE.md"
        mode_path.chmod(preserved_mode)
        original_modes = {
            path: stat.S_IMODE(path.stat().st_mode)
            for path in INSTALLER.manual_paths(self.home)
        }
        first = INSTALLER.apply(self.home, ROOT)
        self.assertTrue(first)
        snapshots = {}
        modes = {}
        surrounding = {}
        for path in INSTALLER.manual_paths(self.home):
            content = path.read_bytes()
            match = INSTALLER.BLOCK_RE.search(content)
            self.assertIsNotNone(match)
            assert match is not None
            snapshots[path] = content
            modes[path] = stat.S_IMODE(path.stat().st_mode)
            surrounding[path] = (content[: match.start()], content[match.end() :])
        second = INSTALLER.apply(self.home, ROOT)
        self.assertEqual(second, [])
        self.assertEqual(
            snapshots,
            {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)},
        )
        for path in INSTALLER.manual_paths(self.home):
            content = path.read_bytes()
            match = INSTALLER.BLOCK_RE.search(content)
            self.assertIsNotNone(match)
            assert match is not None
            self.assertEqual(surrounding[path], (content[: match.start()], content[match.end() :]))
            self.assertEqual(modes[path], stat.S_IMODE(path.stat().st_mode))
            self.assertEqual(original_modes[path], stat.S_IMODE(path.stat().st_mode))
            self.assertIn(ROOT.as_posix().encode(), content)
            self.assertEqual(content.count(INSTALLER.START_MARKER), 1)
            self.assertEqual(content.count(INSTALLER.GATEKEEPER_START_MARKER), 1)
            self.assertIsNotNone(INSTALLER.GATEKEEPER_BLOCK_RE.search(content))

    def test_installed_session_routing_has_three_entry_gates_and_common_closure(self):
        INSTALLER.apply(self.home, ROOT)
        expected_entries = {
            b"direct": b"apply",
            b"design-tasks": b"design",
            b"full-sdd": b"proposal",
        }
        for path in INSTALLER.manual_paths(self.home):
            match = INSTALLER.BLOCK_RE.search(path.read_bytes())
            self.assertIsNotNone(match, path)
            assert match is not None
            block = match.group()
            entries = {}
            for line in block.splitlines():
                if b" enters at " in line:
                    route, gate = line.strip(b" -.").split(b" enters at ")
                    entries[route.strip(b"`")] = gate.strip(b"`")
            self.assertEqual(entries, expected_entries, path)
            self.assertIn(b"`verify` and post-delivery `archive` are common", block, path)
            self.assertNotIn(b"`session-plan`", block, path)
            self.assertNotIn(b"`blocked` is a route", block, path)

    def test_installed_session_routing_uses_contamination_aware_blocking(self):
        INSTALLER.apply(self.home, ROOT)
        expected = (
            b"Always-escalate decisions never become derivable. Block the Sesi\xc3\xb3n only when "
            b"authority or evidence is missing or contradictory, or contamination reaches "
            b"acceptance criteria, the first M\xc3\xb3dulo, or another Sesi\xc3\xb3n. "
            b"Later-M\xc3\xb3dulo contamination parks that M\xc3\xb3dulo while approved earlier "
            b"work continues."
        )
        blanket_stop = b"Stop before SDD when an unresolved decision belongs to an always-escalate class."
        paths = INSTALLER.manual_paths(self.home)
        self.assertEqual(len(paths), 4)
        for path in paths:
            content = path.read_bytes()
            match = INSTALLER.BLOCK_RE.search(content)
            self.assertIsNotNone(match, path)
            assert match is not None
            normalized = b" ".join(match.group().split())
            self.assertIn(expected, normalized, path)
            self.assertNotIn(blanket_stop, match.group(), path)

    def test_all_runtime_skill_paths_match_canonical_source(self):
        INSTALLER.apply(self.home, ROOT)
        for runtime_root in INSTALLER.runtime_skill_roots(self.home):
            for skill, relative, source in INSTALLER.source_files(ROOT):
                destination = runtime_root / skill / relative
                self.assertTrue(destination.is_file(), destination)
                self.assertEqual(source.read_bytes(), destination.read_bytes())

    def test_check_mode_detects_skill_and_manual_drift(self):
        INSTALLER.apply(self.home, ROOT)
        skill_path = self.home / ".agents/skills/session-kickoff/SKILL.md"
        skill_path.chmod(0o644)
        skill_path.write_bytes(skill_path.read_bytes() + b"\nDRIFT\n")
        manual_path = self.home / ".pi/agent/APPEND_SYSTEM.md"
        drifted = manual_path.read_bytes().replace(ROOT.as_posix().encode(), b"/wrong")
        drifted = drifted.replace(b"Proportional Automatic SDD Gatekeeper", b"Drifted Gatekeeper")
        manual_path.write_bytes(drifted)
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--check", "--home", str(self.home)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("session-kickoff/SKILL.md", result.stdout)
        self.assertIn("APPEND_SYSTEM.md", result.stdout)

    def test_dry_run_does_not_write(self):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--dry-run", "--home", str(self.home)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0)
        self.assertIn("WOULD_UPDATE", result.stdout)
        self.assertFalse((self.home / ".agents/skills/session-kickoff/SKILL.md").exists())

    def test_rejects_symlinked_runtime_parent_without_touching_external_sentinel(self):
        external = Path(self.tempdir.name) / "external"
        sentinel = external / "sentinel.txt"
        external.mkdir()
        sentinel.write_bytes(b"protected")
        runtime_parent = self.home / ".agents"
        runtime_parent.mkdir()
        (runtime_parent / "skills").symlink_to(external, target_is_directory=True)

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(sentinel.read_bytes(), b"protected")
        self.assertFalse((external / "session-kickoff").exists())

    def test_rejects_symlinked_destination_without_touching_external_sentinel(self):
        external = Path(self.tempdir.name) / "external-file"
        external.write_bytes(b"protected")
        destination = self.home / ".agents/skills/session-kickoff/SKILL.md"
        destination.parent.mkdir(parents=True)
        destination.symlink_to(external)

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(external.read_bytes(), b"protected")


    def test_all_owned_blocks_stay_outside_gentle_ai_and_section_ranges(self):
        INSTALLER.apply(self.home, ROOT)
        for path in INSTALLER.manual_paths(self.home):
            content = path.read_bytes()
            ranges = INSTALLER._managed_ranges(content, path)
            for pattern in (INSTALLER.BLOCK_RE, INSTALLER.GATEKEEPER_BLOCK_RE):
                match = pattern.search(content)
                self.assertIsNotNone(match)
                assert match is not None
                self.assertTrue(all(not (start < match.end() and match.start() < end) for start, end in ranges))

    def test_install_preserves_unrelated_manual_block(self):
        unrelated = b"<!-- OWNER-NOTES:MANUAL -->\nkeep me\n<!-- /OWNER-NOTES:MANUAL -->\n"
        for path in INSTALLER.manual_paths(self.home):
            path.write_bytes(path.read_bytes() + unrelated)
        INSTALLER.apply(self.home, ROOT)
        for path in INSTALLER.manual_paths(self.home):
            self.assertIn(unrelated, path.read_bytes())

    def test_rejects_custom_block_nested_in_managed_block(self):
        path = self.home / ".claude/CLAUDE.md"
        old = path.read_bytes()
        nested = (
            b"<!-- gentle-ai:persona -->\n"
            + old
            + b"<!-- /gentle-ai:persona -->\n"
        )
        path.write_bytes(nested)

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(path.read_bytes(), nested)
        self.assertFalse((self.home / ".agents").exists())

    def test_rejects_duplicate_gatekeeper_block_before_mutation(self):
        path = self.home / ".pi/agent/APPEND_SYSTEM.md"
        gatekeeper = (ROOT / "templates/sdd-auto-gatekeeper-policy.md").read_bytes()
        path.write_bytes(path.read_bytes() + gatekeeper + gatekeeper)
        before = {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)}

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)})
        self.assertFalse((self.home / ".agents").exists())

    def test_rejects_gatekeeper_block_nested_in_section_block_before_mutation(self):
        path = self.home / ".codex/AGENTS.md"
        gatekeeper = (ROOT / "templates/sdd-auto-gatekeeper-policy.md").read_bytes()
        path.write_bytes(
            path.read_bytes()
            + b"<!-- section:model-capable -->\n"
            + gatekeeper
            + b"<!-- /section:model-capable -->\n"
        )
        before = {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)}

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)})
        self.assertFalse((self.home / ".agents").exists())

    def test_rejects_nested_owned_blocks_before_mutation(self):
        path = self.home / ".claude/CLAUDE.md"
        session = path.read_bytes()
        gatekeeper = (ROOT / "templates/sdd-auto-gatekeeper-policy.md").read_bytes()
        malformed_inputs = (
            (
                "session-routing",
                session.replace(
                    b"- old runtime path\n",
                    b"- old runtime path\n" + gatekeeper,
                ),
            ),
            (
                "gatekeeper",
                INSTALLER.GATEKEEPER_START_MARKER
                + b"\n"
                + session
                + INSTALLER.GATEKEEPER_END_MARKER
                + b"\n",
            ),
        )

        for outer, malformed in malformed_inputs:
            with self.subTest(outer=outer):
                self._seed_runtime()
                path.write_bytes(malformed)
                before = {
                    item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)
                }

                with self.assertRaises(INSTALLER.InstallError):
                    INSTALLER.apply(self.home, ROOT)
                self.assertEqual(
                    before,
                    {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)},
                )
                self.assertFalse((self.home / ".agents").exists())

    def test_wrong_type_destination_is_rejected_before_any_mutation(self):
        wrong_type = self.home / ".agents/skills/chanks-4-puente/SKILL.md"
        wrong_type.mkdir(parents=True)
        sentinel = wrong_type / "sentinel"
        sentinel.write_bytes(b"protected")
        before = {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)}

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)})
        self.assertFalse((self.home / ".agents/skills/session-kickoff").exists())
        self.assertEqual(sentinel.read_bytes(), b"protected")

    def test_wrong_type_skill_directory_is_rejected_before_any_mutation(self):
        wrong_type = self.home / ".agents/skills/chanks-4-puente"
        wrong_type.parent.mkdir(parents=True)
        wrong_type.write_bytes(b"protected")
        before = {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)}

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)})
        self.assertFalse((self.home / ".agents/skills/session-kickoff").exists())
        self.assertEqual(wrong_type.read_bytes(), b"protected")

    def test_missing_instruction_file_fails_without_runtime_mutation(self):
        """An installed runtime missing its instruction file still fails closed."""
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            self._seed_runtime(home)
            (home / ".codex/AGENTS.md").unlink()
            with self.assertRaises(INSTALLER.InstallError):
                INSTALLER.apply(home, ROOT)
            self.assertFalse((home / ".agents").exists())

    def test_absent_runtime_is_skipped_instead_of_failing(self):
        """A runtime this machine does not have is skipped, not fatal.

        A fresh machine rarely has all four runtimes. Skipping keeps the install
        usable there; the remaining runtimes must still be written in full, and
        the absent one must not be created as a side effect.
        """
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            self._seed_runtime(home)
            shutil.rmtree(home / ".codex")

            INSTALLER.apply(home, ROOT)

            self.assertFalse((home / ".codex").exists())
            for root in (home / ".agents/skills", home / ".claude/skills"):
                self.assertTrue((root / "unattended-implementation/SKILL.md").is_file())
                self.assertFalse((root / "torre-control-entregas").exists())
            self.assertNotIn("torre-control-entregas", INSTALLER.SKILLS)
            self.assertEqual(INSTALLER.build_plan(home, ROOT), [])

    def test_installer_inventory_includes_every_chanks_skill_and_excludes_retired_skills(self):
        actual_chanks = {
            path.parent.name for path in (ROOT / "skills").glob("chanks-*/SKILL.md")
        }
        self.assertEqual(set(INSTALLER.CHANKS_SKILLS), actual_chanks)
        self.assertTrue(set(INSTALLER.RETIRED_SKILLS).isdisjoint(INSTALLER.SKILLS))

    def test_project_owned_tower_delivery_skill_is_not_distributed(self):
        self.assertNotIn("torre-control-entregas", INSTALLER.SKILLS)
        self.assertIn("torre-control-entregas", INSTALLER.RETIRED_SKILLS)
        self.assertFalse((ROOT / "skills/torre-control-entregas").exists())

    def test_later_apply_failure_preserves_retired_skill_bytes(self):
        retired = INSTALLER.runtime_skill_roots(self.home)[0] / INSTALLER.RETIRED_SKILLS[0]
        retired.mkdir(parents=True)
        payload = b"\x00retired\n"
        (retired / "SKILL.md").write_bytes(payload)

        with mock.patch.object(INSTALLER, "_atomic_copy", side_effect=OSError("later failure")):
            with self.assertRaises(OSError):
                INSTALLER.apply(self.home, ROOT)

        self.assertEqual((retired / "SKILL.md").read_bytes(), payload)

    def test_install_removes_only_explicit_retired_skills_from_all_runtime_roots(self):
        retired_paths = []
        unrelated_paths = []
        for runtime_root in INSTALLER.runtime_skill_roots(self.home):
            for retired_skill in INSTALLER.RETIRED_SKILLS:
                retired = runtime_root / retired_skill
                retired.mkdir(parents=True)
                (retired / "SKILL.md").write_bytes(b"stale")
                (retired / "references").mkdir()
                (retired / "references/legacy.md").write_bytes(b"stale")
                retired_paths.append(retired)

            unrelated = runtime_root / "user-owned-skill/notes.md"
            unrelated.parent.mkdir()
            unrelated.write_bytes(b"preserve")
            unrelated_paths.append(unrelated)

        cleanup = [
            change
            for change in INSTALLER.build_plan(self.home, ROOT)
            if change.kind == "retired-skill"
        ]
        self.assertEqual({change.path for change in cleanup}, set(retired_paths))

        INSTALLER.apply(self.home, ROOT)

        self.assertTrue(all(not path.exists() for path in retired_paths))
        self.assertTrue(all(path.read_bytes() == b"preserve" for path in unrelated_paths))
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])

    def test_each_retired_skill_cleanup_unlinks_external_symlink_without_following_it(self):
        for retired_skill in INSTALLER.RETIRED_SKILLS:
            with self.subTest(retired_skill=retired_skill), tempfile.TemporaryDirectory() as raw:
                home = Path(raw)
                self._seed_runtime(home)
                external = home / "external-retired-skill"
                external.mkdir()
                sentinel = external / "sentinel.txt"
                sentinel.write_bytes(b"protected")
                retired = home / ".agents/skills" / retired_skill
                retired.parent.mkdir(parents=True)
                retired.symlink_to(external, target_is_directory=True)

                INSTALLER.apply(home, ROOT)

                self.assertFalse(retired.exists())
                self.assertFalse(retired.is_symlink())
                self.assertEqual(sentinel.read_bytes(), b"protected")

    def test_each_retired_skill_cleanup_does_not_follow_nested_external_symlink(self):
        for retired_skill in INSTALLER.RETIRED_SKILLS:
            with self.subTest(retired_skill=retired_skill), tempfile.TemporaryDirectory() as raw:
                home = Path(raw)
                self._seed_runtime(home)
                external = home / "external-nested-directory"
                external.mkdir()
                sentinel = external / "sentinel.txt"
                sentinel.write_bytes(b"protected")
                retired = home / ".agents/skills" / retired_skill
                retired.mkdir(parents=True)
                (retired / "external").symlink_to(external, target_is_directory=True)

                INSTALLER.apply(home, ROOT)

                self.assertFalse(retired.exists())
                self.assertEqual(sentinel.read_bytes(), b"protected")

    def test_each_retired_skill_cleanup_rejects_regular_file_before_mutation(self):
        for retired_skill in INSTALLER.RETIRED_SKILLS:
            with self.subTest(retired_skill=retired_skill), tempfile.TemporaryDirectory() as raw:
                home = Path(raw)
                self._seed_runtime(home)
                retired = home / ".agents/skills" / retired_skill
                retired.parent.mkdir(parents=True)
                retired.write_bytes(b"user-file")

                with self.assertRaises(INSTALLER.InstallError):
                    INSTALLER.apply(home, ROOT)

                self.assertEqual(retired.read_bytes(), b"user-file")
                self.assertFalse((home / ".agents/skills/session-kickoff").exists())

    def test_session_route_is_revalidated_once_before_execution(self):
        content = (ROOT / "skills/session-kickoff/SKILL.md").read_text(encoding="utf-8")
        hard_rules = content.split("## Hard Rules", 1)[1].split("## Decision Gates", 1)[0]
        execution = content.split("## Execution Steps", 1)[1].split("## Output Contract", 1)[0]

        self.assertIn("código real del Área", hard_rules)
        self.assertIn("tres rutas canónicas", hard_rules)
        self.assertIn("contrastá la propuesta una vez", execution)
        for term in ("`ruta.revalidacion`", "resultado", "base Git", "evidencia", "razón si cambia"):
            self.assertIn(term, execution)


if __name__ == "__main__":
    unittest.main()
