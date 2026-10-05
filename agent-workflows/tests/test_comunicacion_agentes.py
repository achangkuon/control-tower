import importlib.util
from pathlib import Path
import re
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/install.py"
SPEC = importlib.util.spec_from_file_location("agent_workflows_install_comunicacion", SCRIPT)
INSTALLER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = INSTALLER
SPEC.loader.exec_module(INSTALLER)

SKILL_NAME = "chanks-0-comunicacion-agentes"
SKILL_PATH = f"skills/{SKILL_NAME}/SKILL.md"
CASES_PATH = f"skills/{SKILL_NAME}/references/casos-herdr.md"
CASES = (
    ("«comunicate con el agente», «decile que…»", "Dejar un mensaje"),
    ("«fijate qué hace»", "Observar"),
    ("«decile que frene»", "Frenar"),
    ("«abrí un panel», «iniciá un agente»", "Abrir un panel o iniciar un agente"),
)
# Command groups of the Herdr CLI. Naming one next to `herdr` is a copied command.
HERDR_COMMAND = re.compile(
    r"herdr\s+(agent|pane|workspace|tab|worktree|terminal|notification|integration|session|server)\b"
)


def read(relative):
    return (ROOT / relative).read_text(encoding="utf-8")


def compact(source):
    return " ".join(source.split())


class ComunicacionAgentesTests(unittest.TestCase):
    def setUp(self):
        self.skill = read(SKILL_PATH)
        self.cases = read(CASES_PATH)
        self.rules = compact(self.skill)
        self.detail = compact(self.cases)

    def test_skill_has_compact_runtime_contract(self):
        lines = self.skill.splitlines()
        self.assertEqual(lines[0], "---")
        self.assertEqual(lines[1], f"name: {SKILL_NAME}")
        self.assertTrue(lines[2].startswith('description: "Trigger:'), lines[2])
        self.assertLessEqual(len(lines[2]) - len('description: ""'), 250)
        for field in ("license: Apache-2.0", "metadata:", "  author: gentleman-programming", '  version: "1.0"'):
            self.assertIn(field, lines[:8])
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

    def test_triggers_are_the_users_intent_and_never_the_word_herdr(self):
        description = self.skill.splitlines()[2]
        triggers = description[len('description: "Trigger: '):].split(". ", 1)[0]
        for phrase in (
            "comunicate con el agente",
            "decile que",
            "fijate qué hace",
            "decile que frene",
            "abrí un panel",
            "iniciá un agente",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, triggers)
        self.assertTrue(triggers.startswith("comunicate con el agente,"), triggers)
        self.assertNotIn("herdr", description.lower())
        self.assertIn("sin que nombre Herdr", self.rules)

    def test_gates_route_each_of_the_four_cases_to_its_lazy_section(self):
        gates = self.skill.split("## Decision Gates", 1)[1].split("## Execution Steps", 1)[0]
        for request, case in CASES:
            with self.subTest(case=case):
                row = next(line for line in gates.splitlines() if request in line)
                self.assertIn(case, row)
                self.assertIn(f"\n## {case}\n", self.cases)
        self.assertIn("`references/casos-herdr.md`", self.skill)
        self.assertIn("un solo caso por pedido", self.rules)
        self.assertIn("bajo demanda", self.rules)

    def test_a_message_reaches_a_busy_agent_without_waiting_or_interrupting(self):
        for source in (self.rules, self.detail):
            for phrase in ("aunque el agente esté ocupado", "sin esperar su respuesta"):
                with self.subTest(phrase=phrase):
                    self.assertIn(phrase, source)
        for phrase in ("de quién viene", "que no frene", "lo sume a sus pendientes"):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.rules)
        for phrase in ("No frenes lo que estás haciendo", "sumalo a tus pendientes"):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.detail)

    def test_observing_is_read_only_and_stopping_needs_the_users_own_words(self):
        self.assertIn("Observar es sólo lectura", self.rules)
        self.assertIn("sólo cuando el usuario lo pide con esas palabras", self.rules)
        observe = self.cases.split("\n## Observar\n", 1)[1].split("\n## ", 1)[0]
        self.assertIn("Sólo lectura", observe)
        self.assertIn("No envíes texto ni teclas", compact(observe))
        stop = self.cases.split("\n## Frenar\n", 1)[1].split("\n## ", 1)[0]
        self.assertIn("no te autoriza a frenarlo", compact(stop))

    def test_another_agents_approval_is_never_answered_and_blocks_every_send(self):
        self.assertIn(
            "Nunca respondas por otro agente una pregunta o aprobación de su interfaz", self.rules
        )
        self.assertIn("no le envíes nada e informale al usuario", self.rules)
        for case in ("Dejar un mensaje", "Frenar"):
            section = compact(self.cases.split(f"\n## {case}\n", 1)[1].split("\n## ", 1)[0])
            with self.subTest(case=case):
                self.assertIn("esperando una aprobación", section)
                self.assertIn("no le envíes nada", section)

    def test_outside_herdr_the_skill_says_so_and_stops(self):
        self.assertIn("`HERDR_ENV=1`", self.rules)
        self.assertIn("Fuera de Herdr decilo y detenete", self.rules)
        steps = self.skill.split("## Execution Steps", 1)[1].split("## Output Contract", 1)[0]
        self.assertIn("HERDR_ENV", steps.splitlines()[2])

    def test_skill_cites_the_native_herdr_skill_and_copies_no_procedure(self):
        self.assertIn("skill nativa `herdr`", self.rules)
        self.assertIn("no copies su procedimiento", self.rules)
        self.assertIn("`herdr --help`", self.rules)
        self.assertIn("skill nativa `herdr`", self.detail)
        for name, source in (("SKILL.md", self.skill), ("casos-herdr.md", self.cases)):
            with self.subTest(file=name):
                self.assertNotIn("```", source)
                self.assertIsNone(HERDR_COMMAND.search(source))

    def test_automatic_dispatch_stays_deferred_and_intercom_keeps_pi_workers(self):
        for source in (self.rules, self.detail):
            for phrase in (
                "despacho automático de Sesiones",
                "pool de workers",
                "topología de la Torre",
                "V3",
                "`agent-workflows/skills-diferidas/v3/chanks-3-despacho-herdr/`",
                "Intercom sigue siendo el transporte entre workers Pi",
                "S137",
            ):
                with self.subTest(phrase=phrase):
                    self.assertIn(phrase, source)
        self.assertTrue((ROOT / "skills-diferidas/v3/chanks-3-despacho-herdr/SKILL.md").is_file())

    def test_source_inventory_includes_the_skill_and_the_tower_roster_ships_it(self):
        self.assertIn(SKILL_NAME, INSTALLER.CHANKS_SKILLS)
        sources = {skill for skill, _, _ in INSTALLER.source_files(ROOT)}
        self.assertIn(SKILL_NAME, sources)
        # The packaging Session removed the pending gate: the skill now belongs to
        # the Tower V1 package and this installer stops managing it personally.
        self.assertEqual(INSTALLER.V1_PENDING_SKILLS, ())
        self.assertIn(SKILL_NAME, INSTALLER.TOWER_V1_SKILLS)
        self.assertIn(SKILL_NAME, INSTALLER.STOP_MANAGING_SKILLS)
        self.assertNotIn(SKILL_NAME, INSTALLER.PERSONAL_SKILLS)

    def test_shared_canon_and_readme_catalog_include_the_skill(self):
        canon = read("skills/_shared/plan-naming-convention.md")
        readme = read("README.md")
        self.assertIn(f"`{SKILL_NAME}`", canon)
        self.assertIn(f"`{SKILL_NAME}`", readme)

    def test_repository_instructions_route_manual_use_to_the_skill(self):
        agents = (ROOT.parent / "AGENTS.md").read_text(encoding="utf-8")
        section = agents.split("## Operación local: fricciones y herramientas", 1)[1].split("\n## ", 1)[0]
        manual = compact(section)
        self.assertNotIn("Uso manual de Herdr (por ahora)", agents)
        self.assertIn(f"la skill `{SKILL_NAME}`", manual)
        self.assertIn("V3 es sólo el despacho automático de Sesiones", manual)
        self.assertIn("sin necesidad de nombrar Herdr", manual)
        self.assertIn("no habilita despacho automático de Sesiones ni topología Torre", manual)
        self.assertIn("`agent-workflows/skills-diferidas/v3/chanks-3-despacho-herdr/`", manual)


if __name__ == "__main__":
    unittest.main()
