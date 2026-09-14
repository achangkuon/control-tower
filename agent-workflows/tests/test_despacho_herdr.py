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


class DespachoHerdrRetireTests(unittest.TestCase):
    def setUp(self):
        self.skill = read(f"skills/{SKILL_NAME}/SKILL.md")
        self.retire = read(f"skills/{SKILL_NAME}/references/retiro.md")

    def test_skill_links_the_retire_mode(self):
        self.assertIn("`references/retiro.md`", self.skill)

    def test_retire_requires_the_six_checks(self):
        text = self.retire.lower()
        for phrase in (
            "after the responsible parent records", "authorizes", "`✅ COMPLETO`", "`📚 ARCHIVADO`",
            "`git merge-base --is-ancestor`", "`git status --porcelain`", "`git cherry master work/<id>`",
            "`idle`", "`done`", "`Worktrees/<id>`", "never the main checkout",
        ):
            self.assertIn(phrase.lower(), text, phrase)

    def test_any_failed_check_changes_nothing(self):
        self.assertIn("change nothing", self.retire.lower())

    def test_retire_order_is_tab_then_worktree_then_branch(self):
        steps = ("Close the Sesión's Herdr tab", "`git worktree remove", "`git branch -d", "`git worktree list`")
        positions = [self.retire.index(step) for step in steps]
        self.assertEqual(positions, sorted(positions))

    def test_retire_never_forces(self):
        for source in (self.skill, self.retire):
            self.assertNotIn("--force", source)
            self.assertNotIn("-D", source)

    def test_only_plus_lines_of_git_cherry_block(self):
        self.assertIn("starts with `+`", self.retire)
        self.assertIn("starts with `-`", self.retire)


class DespachoHerdrRoutingTests(unittest.TestCase):
    def test_installed_routing_links_dispatch_and_retirement(self):
        import tempfile

        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            old_block = INSTALLER.START_MARKER + b"\n- old routing\n" + INSTALLER.END_MARKER + b"\n"
            for path in INSTALLER.manual_paths(home):
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(old_block)
            INSTALLER.apply(home, ROOT)

            for path in INSTALLER.manual_paths(home):
                match = INSTALLER.BLOCK_RE.search(path.read_bytes())
                self.assertIsNotNone(match, path)
                assert match is not None
                text = " ".join(match.group().decode("utf-8").split())
                self.assertLess(text.index("human chooses"), text.index(f"`{SKILL_NAME}`"), path)
                self.assertIn("explicit Herdr request made with the Torre off", text, path)
                self.assertIn("not Torre dispatch", text, path)
                self.assertLess(text.index("records a dispatched Sesión's delivery"), text.index("retire mode"), path)
                self.assertIn(f"responsible parent loads `{SKILL_NAME}`", text, path)
                self.assertNotIn("may load", text, path)
                self.assertIn("parallel-safety verdict", text, path)
                self.assertIn("reserve nothing live", text, path)


if __name__ == "__main__":
    unittest.main()
