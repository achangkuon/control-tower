import importlib.util
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/install.py"
SPEC = importlib.util.spec_from_file_location("agent_workflows_install_mensajes", SCRIPT)
INSTALLER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = INSTALLER
SPEC.loader.exec_module(INSTALLER)

SKILL_NAME = "chanks-0-mensajes-visibles"
SKILL_PATH = f"skills/{SKILL_NAME}/SKILL.md"


def read(relative):
    return (ROOT / relative).read_text(encoding="utf-8")


class MensajesVisiblesTests(unittest.TestCase):
    def setUp(self):
        self.skill = read(SKILL_PATH)
        self.planner = read("skills/chanks-2-planificador-granular/SKILL.md")

    def test_skill_has_compact_runtime_contract(self):
        self.assertIn(f"name: {SKILL_NAME}", self.skill)
        self.assertIn('description: "Trigger:', self.skill)
        for heading in (
            "## Activation Contract",
            "## Hard Rules",
            "## Decision Gates",
            "## Execution Steps",
            "## Output Contract",
            "## References",
        ):
            self.assertIn(heading, self.skill)
        self.assertLess(len(self.skill.split()), 701)

    def test_planner_has_one_unnumbered_preamble_before_the_unchanged_eight_steps(self):
        preamble = self.planner.split("## Visible Messages Preamble", 1)[1].split(
            "## Execution Steps", 1
        )[0]
        steps = self.planner.split("## Execution Steps", 1)[1].split("## Output Contract", 1)[0]

        self.assertEqual(self.planner.count("## Visible Messages Preamble"), 1)
        self.assertIn(f"../{SKILL_NAME}/SKILL.md", preamble)
        self.assertNotIn("0.", preamble)
        self.assertEqual(
            [line.split(".", 1)[0] for line in steps.splitlines() if line[:1].isdigit() and ". " in line],
            [str(number) for number in range(1, 9)],
        )
        self.assertNotIn("9.", steps)

    def test_skill_returns_a_suggestion_or_a_nonblocking_no_message_result(self):
        for phrase in (
            "same feature's implementation Session",
            "responsible parent",
            "feature",
            "responsible identity",
            "actual event/moment",
            "proposed message addition/update",
            "rationale",
            "No messages needed",
            "ordinary scope approval",
        ):
            self.assertIn(phrase, self.skill)
        self.assertIn("No separate Session by default", self.skill)
        self.assertIn("plan.yaml", self.skill)
        self.assertIn("ROADMAP", self.skill)
        self.assertIn("alternate plan", self.skill)
        self.assertIn("never blocks admission or planning", self.skill)

    def test_skill_keeps_chanks_torre_and_gentle_ai_actions_separate(self):
        for phrase in (
            "💪 Chanks",
            "method, planning, admission, shared-file coordination, evidence consumption, and documentation closure",
            "🗼 Torre",
            "actual Tower runtime operations",
            "manual Main is not Tower",
            "Gentle AI",
            "implementation, testing, and review",
            "native identity",
        ):
            self.assertIn(phrase, self.skill)
        self.assertNotIn("Tower-on", self.skill)

    def test_skill_distinguishes_copy_from_runtime_or_security_proof(self):
        for phrase in (
            "permission from effect completion",
            "notice from proven enforcement",
            "not an evidence or technical evaluator",
            "not runtime-proven",
            "security controls are outside",
        ):
            self.assertIn(phrase, self.skill)

    def test_installer_and_source_catalog_include_the_skill(self):
        self.assertIn(SKILL_NAME, INSTALLER.CHANKS_SKILLS)
        sources = {skill for skill, _, _ in INSTALLER.source_files(ROOT)}
        self.assertIn(SKILL_NAME, sources)

    def test_shared_canon_and_readme_catalog_include_the_skill(self):
        canon = read("skills/_shared/plan-naming-convention.md")
        readme = read("README.md")
        self.assertIn(f"`{SKILL_NAME}`", canon)
        self.assertIn(f"`{SKILL_NAME}`", readme)


if __name__ == "__main__":
    unittest.main()
