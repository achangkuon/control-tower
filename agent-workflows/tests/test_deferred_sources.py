import re
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
DEFERRED = ROOT / "skills-diferidas"
EXPECTED = {
    "v2": {"chanks-0-jornada", "chanks-3-session-kickoff", "chanks-3-coordinador-manual"},
    "v3": {"chanks-3-despacho-herdr", "chanks-4-unattended-implementation"},
}


class DeferredSourceLayoutTests(unittest.TestCase):
    def test_sources_live_only_in_their_declared_version(self):
        for version, names in EXPECTED.items():
            self.assertEqual({path.name for path in (DEFERRED / version).iterdir()}, names)
            for name in names:
                self.assertTrue((DEFERRED / version / name / "SKILL.md").is_file())
                self.assertFalse((ROOT / "skills" / name).exists())

    def test_repository_relative_skill_links_resolve_after_the_move(self):
        checked = 0
        for source in DEFERRED.rglob("*.md"):
            for link in re.findall(r"`((?:\.\./)+[^`\s]+)`", source.read_text(encoding="utf-8")):
                # Worktree declarations are relative to the repository, not this file.
                # sdd-apply is an external Gentle AI runtime skill, never bundled here.
                if link.startswith("../Worktrees/") or link == "../sdd-apply/SKILL.md":
                    continue
                with self.subTest(source=source.relative_to(ROOT), link=link):
                    self.assertTrue((source.parent / link).is_file())
                    checked += 1
        self.assertGreater(checked, 20)
