import importlib.util
from pathlib import Path
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

    def _seed_runtime(self):
        old_block = (
            INSTALLER.START_MARKER
            + b"\n## Durable Session Skill Routing\n"
            + b"- old runtime path\n"
            + INSTALLER.END_MARKER
            + b"\n"
        )
        for path in INSTALLER.manual_paths(self.home):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"managed-prefix\n" + old_block + b"managed-suffix\n")

    def test_install_is_idempotent_and_preserves_surrounding_manual_content(self):
        first = INSTALLER.apply(self.home, ROOT)
        self.assertTrue(first)
        snapshots = {
            path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)
        }
        second = INSTALLER.apply(self.home, ROOT)
        self.assertEqual(second, [])
        self.assertEqual(
            snapshots,
            {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)},
        )
        for path in INSTALLER.manual_paths(self.home):
            content = path.read_bytes()
            self.assertIn(b"managed-prefix\n", content)
            self.assertIn(b"managed-suffix\n", content)
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


if __name__ == "__main__":
    unittest.main()
