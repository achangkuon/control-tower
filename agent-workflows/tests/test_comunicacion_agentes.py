import importlib.util
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/roster.py"
SPEC = importlib.util.spec_from_file_location("control_tower_roster_comunicacion_agentes", SCRIPT)
ROSTER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = ROSTER
SPEC.loader.exec_module(ROSTER)

OLD_NAME = "chanks-0-comunicacion-agentes"
NEW_NAME = "comunicacion-agentes"


def read(relative):
    return (ROOT / relative).read_text(encoding="utf-8")


def read_repo(relative):
    """Read from the repository root (product/ lives above agent-workflows/)."""
    return (ROOT.parent / relative).read_text(encoding="utf-8")


class ComunicacionAgentesRetiredTests(unittest.TestCase):
    """The manual agent-to-agent skill left the Tower (2026-10-30): it is now the
    personal global skill `comunicacion-agentes`, owned by machine-setup."""

    def test_the_old_name_left_every_product_roster(self):
        self.assertNotIn(OLD_NAME, ROSTER.CHANKS_SKILLS)
        self.assertNotIn(OLD_NAME, ROSTER.TOWER_V1_SKILLS)
        self.assertNotIn(OLD_NAME, ROSTER.STOP_MANAGING_SKILLS)
        self.assertNotIn(OLD_NAME, ROSTER.SKILLS)
        self.assertNotIn(OLD_NAME, ROSTER.PRODUCT_SKILLS)

    def test_the_old_name_is_registered_for_retirement(self):
        self.assertIn(OLD_NAME, ROSTER.RETIRED_SKILLS)

    def test_the_product_source_is_gone(self):
        self.assertFalse((ROOT / f"skills/{OLD_NAME}").exists())
        self.assertNotIn(OLD_NAME, {skill for skill, _, _ in ROSTER.source_files(ROOT)})

    def test_the_v1_package_no_longer_ships_it(self):
        bundle = read_repo("product/tower/v1/bundle.mjs")
        installer = read_repo("product/tower/v1/install.mjs")
        self.assertNotIn(OLD_NAME, bundle)
        self.assertNotIn(OLD_NAME, installer)

    def test_shared_canon_records_the_move_to_a_personal_skill(self):
        canon = read("skills/_shared/plan-naming-convention.md")
        self.assertNotIn(f"`{OLD_NAME}`", canon)
        self.assertIn(f"`{NEW_NAME}`", canon)
        self.assertIn("personal global skill", canon)

    def test_repository_instructions_route_manual_use_to_the_new_skill(self):
        agents = (ROOT.parent / "AGENTS.md").read_text(encoding="utf-8")
        section = agents.split("## Operación local: fricciones y herramientas", 1)[1].split("\n## ", 1)[0]
        manual = " ".join(section.split())
        self.assertNotIn(f"`{OLD_NAME}`", agents)
        self.assertIn(f"la skill `{NEW_NAME}`", manual)
        self.assertIn("personal y global", manual)


if __name__ == "__main__":
    unittest.main()
