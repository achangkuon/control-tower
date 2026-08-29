import importlib.util
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest


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
        skill_path.write_bytes(skill_path.read_bytes() + b"\nDRIFT\n")
        manual_path = self.home / ".pi/agent/APPEND_SYSTEM.md"
        manual_path.write_bytes(manual_path.read_bytes().replace(ROOT.as_posix().encode(), b"/wrong"))
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

    def test_wrong_type_destination_is_rejected_before_any_mutation(self):
        wrong_type = self.home / ".agents/skills/session-plan/SKILL.md"
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
        wrong_type = self.home / ".agents/skills/session-plan"
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

    def test_project_owned_tower_delivery_skill_is_not_distributed(self):
        self.assertNotIn("torre-control-entregas", INSTALLER.SKILLS)
        self.assertEqual(INSTALLER.RETIRED_SKILLS, ("torre-control-entregas",))

    def test_install_removes_only_the_explicit_retired_skill_from_all_runtime_roots(self):
        retired_paths = []
        unrelated_paths = []
        for runtime_root in INSTALLER.runtime_skill_roots(self.home):
            retired = runtime_root / "torre-control-entregas"
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

    def test_retired_skill_cleanup_unlinks_external_symlink_without_following_it(self):
        external = self.home / "external-retired-skill"
        external.mkdir()
        sentinel = external / "sentinel.txt"
        sentinel.write_bytes(b"protected")
        retired = self.home / ".agents/skills/torre-control-entregas"
        retired.parent.mkdir(parents=True)
        retired.symlink_to(external, target_is_directory=True)

        INSTALLER.apply(self.home, ROOT)

        self.assertFalse(retired.exists())
        self.assertFalse(retired.is_symlink())
        self.assertEqual(sentinel.read_bytes(), b"protected")

    def test_retired_skill_cleanup_does_not_follow_nested_external_symlink(self):
        external = self.home / "external-nested-directory"
        external.mkdir()
        sentinel = external / "sentinel.txt"
        sentinel.write_bytes(b"protected")
        retired = self.home / ".agents/skills/torre-control-entregas"
        retired.mkdir(parents=True)
        (retired / "external").symlink_to(external, target_is_directory=True)

        INSTALLER.apply(self.home, ROOT)

        self.assertFalse(retired.exists())
        self.assertEqual(sentinel.read_bytes(), b"protected")

    def test_retired_skill_cleanup_rejects_regular_file_before_mutation(self):
        retired = self.home / ".agents/skills/torre-control-entregas"
        retired.parent.mkdir(parents=True)
        retired.write_bytes(b"user-file")

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)

        self.assertEqual(retired.read_bytes(), b"user-file")
        self.assertFalse((self.home / ".agents/skills/session-kickoff").exists())

    def test_full_sdd_wording_has_one_managed_apply_and_verify_pass(self):
        content = (ROOT / "skills/session-kickoff/SKILL.md").read_text(encoding="utf-8")
        self.assertIn("its `sdd-apply` and `sdd-verify` stages produce and verify the result", content)
        self.assertIn("Do not invoke a second executor or apply pass", content)
        self.assertNotIn("then apply its resulting work", content)


if __name__ == "__main__":
    unittest.main()
