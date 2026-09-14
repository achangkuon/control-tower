import importlib.util
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/install.py"
SPEC = importlib.util.spec_from_file_location("agent_workflows_install_despacho", SCRIPT)
INSTALLER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = INSTALLER
SPEC.loader.exec_module(INSTALLER)

SKILL_NAME = "chanks-3-despacho-herdr"
SECTIONS = (
    "## Activation Contract",
    "## Hard Rules",
    "## Decision Gates",
    "## Execution Steps",
    "## Output Contract",
    "## References",
)


def read(relative):
    return (ROOT / relative).read_text(encoding="utf-8")


class DespachoHerdrDispatchTests(unittest.TestCase):
    def setUp(self):
        self.skill = read(f"skills/{SKILL_NAME}/SKILL.md")
        self.text = self.skill.lower()

    def assert_phrases(self, *phrases):
        for phrase in phrases:
            self.assertIn(phrase.lower(), self.text, phrase)

    def test_skill_is_registered_listed_and_well_formed(self):
        self.assertIn(SKILL_NAME, INSTALLER.CHANKS_SKILLS)
        self.assertTrue(self.skill.startswith(f"---\nname: {SKILL_NAME}\n"))
        for section in SECTIONS:
            self.assertIn(section, self.skill)
        self.assertIn(f"`{SKILL_NAME}`", read("README.md"))

    def test_dispatch_acts_only_on_the_human_list_of_ready_sesiones(self):
        self.assert_phrases("explicit list", "agent kind", "`radar status`", "`radar sesion <ID>`", "LISTO", "create nothing")

    def test_shared_cimientos_or_recursos_are_never_dispatched_in_parallel(self):
        self.assert_phrases("share a Cimiento or a Recurso")

    def test_one_tab_worktree_and_agent_per_sesion(self):
        self.assert_phrases(
            "`Worktrees/<id>`", "`work/<id>`", "one Herdr tab", "named after the Sesión",
            "JSON", "never the main checkout",
        )

    def test_herdr_failures_fail_closed(self):
        self.assert_phrases("`HERDR_ENV=1`", "subagent flow", "close only what this dispatch opened")

    def test_no_torre_coupling_and_no_answer_for_the_human(self):
        self.assert_phrases(
            "never load `torre-control`", "`.git/control-tower/ACTIVE`", "`~/.local/share/control-tower/`",
            "never answer a blocked agent's question",
        )

    def test_the_parent_owns_integration(self):
        self.assert_phrases(
            "commits only on `work/<id>`", "never pushes master", "never writes `openspec/plan.yaml`",
            "one Sesión at a time",
        )

    def test_skill_copies_no_herdr_procedure(self):
        self.assert_phrases("`herdr` skill")
        self.assertNotIn("```", self.skill)


if __name__ == "__main__":
    unittest.main()
