import importlib.util
from pathlib import Path
import re
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/install.py"
SPEC = importlib.util.spec_from_file_location("agent_workflows_install_paralelo", SCRIPT)
INSTALLER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = INSTALLER
SPEC.loader.exec_module(INSTALLER)

SKILL_NAME = "chanks-3-paralelo"


def read(relative):
    return (ROOT / relative).read_text(encoding="utf-8")


def normalized(source):
    return " ".join(source.lower().split())


class ParaleloTests(unittest.TestCase):
    def setUp(self):
        self.skill = read(f"skills/{SKILL_NAME}/SKILL.md")
        self.text = normalized(self.skill)

    def assert_phrases(self, *phrases):
        for phrase in phrases:
            self.assertIn(" ".join(phrase.lower().split()), self.text, phrase)

    def test_frontmatter_shape(self):
        self.assertTrue(self.skill.startswith(f"---\nname: {SKILL_NAME}\n"))
        match = re.match(r"---\n(.*?)\n---\n", self.skill, re.S)
        self.assertIsNotNone(match)
        keys = [line.split(":", 1)[0] for line in match.group(1).splitlines() if re.match(r"^[a-z]", line)]
        self.assertEqual(keys[0], "name")
        self.assertIn("description", keys)
        description = re.search(r'^description: "?(.*?)"?$', match.group(1), re.M).group(1)
        self.assertTrue(description.startswith("Trigger:"), description)
        self.assertLessEqual(len(self.skill.splitlines()), 90)

    def test_registered_in_installer_and_readme(self):
        self.assertIn(SKILL_NAME, INSTALLER.CHANKS_SKILLS)
        self.assertIn(f"`{SKILL_NAME}`", read("README.md"))

    def test_reads_radar_compatibility_and_unknown_is_unsafe(self):
        self.assert_phrases(
            "radar status --json",
            "`compatibilidad[]`",
            "`clase`",
            "`compatible`",
            "`cimiento-compartido`",
            "`solapa-archivos`",
            "`recurso-excluyente`",
            "`indeterminado`",
            "`escenarios[]`",
            "unknown, `indeterminado`, omitted or colliding is not parallel-safe",
            "radar roadmap",
            "evidence, never permission",
        )

    def test_stops_for_human_approval_of_exact_ids(self):
        self.assert_phrases(
            "stop",
            "exact Session IDs",
            "radar never selects work",
            "explicit authorization gentle ai requires for parallel writers in isolated worktrees",
        )

    def test_marks_sessions_with_worktrees_and_unmarks_on_close(self):
        self.assert_phrases(
            "radar marcar <ID> --worktree <absolute path>",
            "radar marcar <ID> --listo",
            "radar desmarcar <ID>",
            "`EN CURSO`",
            "never under `/tmp`",
            "stops that Session only",
        )

    def test_hands_over_only_identity_encargo_and_worktree(self):
        self.assert_phrases(
            "radar sesion <ID>",
            "the worktree path",
            "chanks-5-session-doc",
        )

    def test_integration_is_serial(self):
        self.assert_phrases("serial", "one Session at a time", "repository's own delivery policy")

    def test_contains_no_how_rules(self):
        for forbidden in ("--base-ref", "400", "review before", "work-unit commit", "tdd", "red/green", "sha-256", "digest"):
            self.assertNotIn(forbidden, self.text, forbidden)

    def test_herdr_and_intercom_appear_only_as_the_single_v2_non_goal(self):
        lines = [line for line in self.skill.splitlines() if re.search(r"herdr|intercom", line, re.I)]
        self.assertEqual(len(lines), 1, lines)
        self.assertIn("V2", lines[0])
        self.assertIn("chanks-3-despacho-herdr", lines[0])

    def test_boundary_block_points_to_it(self):
        routing = read("templates/session-routing.md")
        self.assertLessEqual(len(routing.encode("utf-8")), 2000)
        parallel = [l for l in routing.splitlines() if l.startswith("- Parallel work")]
        self.assertEqual(len(parallel), 1)
        self.assertTrue(parallel[0].rstrip().endswith("Load `chanks-3-paralelo`."), parallel[0])


if __name__ == "__main__":
    unittest.main()
