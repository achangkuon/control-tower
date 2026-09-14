import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/install.py"
SPEC = importlib.util.spec_from_file_location("agent_workflows_install", SCRIPT)
INSTALLER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = INSTALLER
SPEC.loader.exec_module(INSTALLER)
SKILLS = ROOT / "skills"
SNAPSHOT_SHA256 = {
    "skills/chanks-0-agente-soporte/SKILL.md": "25eb5b1f0f253ca9df24829add72f91cadbf24aadb80034e90e42501110fc032",
    "skills/chanks-0-agente-soporte/assets/assignment-implementation.md": "70752539f85ffa8565dc32d9a1c6d9d32082d7df8357331bd8a500112816e7da",
    "skills/chanks-0-agente-soporte/assets/assignment-readonly.md": "9b35256b723d835665783739526a12497bf037c822521c498850a3bf253bc622",
    "skills/chanks-0-agente-soporte/assets/brief-diario.md": "e1c3403d82e799eb529888bb6f48f40424ba431d10b69d55dbbdaa563a946cfb",
    "skills/chanks-0-agente-soporte/references/contrato-no-interferencia.md": "b2c15bc842cc310b06489f3160d4e75a9ca111cf59bab525d1024000de7e981e",
    "skills/chanks-0-agente-soporte/references/unidad-ejecutable.md": "a5362b5289abf87269ffbf879ab55976205cf0485cfa2c4e4132b20e5626a612",
    "skills/chanks-0-explicalo-simple/SKILL.md": "3ac548db74d33ea4298d63d7703cadfdd86a930c27ec820f911e75316aa20f75",
    "skills/chanks-0-explicalo-simple/references/formato.md": "90b7ff29c176f57eb11daa196c8c7b018ab516560ab38013671c98d5eec85be9",
    "skills/chanks-0-session-context-loader/SKILL.md": "ff951f0d1bc60f288f179bb112908d7d86c4a1c10e078085e0284eaaa649a31a",
    "skills/chanks-0-skill-composer/SKILL.md": "3162bb19436615d375aaf45684ef2221c9498c46218f52b31b812c8b9713444b",
    "skills/chanks-1-autoridad/SKILL.md": "db8c29b5f2bcf30f4028ac191b2b6f4b5885cab1007770a6d66fbc0811facd54",
    "skills/chanks-1-brain-dump/SKILL.md": "6f6461313d126d53ecc11fd00a381f190dff3a7ba7b7200b173a2ff598a74b51",
    "skills/chanks-1-cierre-de-decisiones/SKILL.md": "4679909dbb3f304ca7adaec2d81369a42388d881cc12a6626d51cb1e6f1e5804",
    "skills/chanks-1-cierre-de-decisiones/assets/resolution-entry.md": "1dc9fad4248d50d92b9b4ef1d865c9b3039c86111783d1ea792e0e52658a1fdb",
    "skills/chanks-1-cierre-de-decisiones/references/decision-extraction.md": "faf9d48b5fb87e0d2e9e78e746e457768c24caf639baee03489baf0be17a5e8d",
    "skills/chanks-1-descubrimiento/SKILL.md": "bd3c33e52335b09ed1d4267e3be3ce7d2c853cbff8f29aeba8dddd91178f1684",
    "skills/chanks-1-feature/SKILL.md": "7ee936d191634e1f143a36c3543860a9d58a11d3cce464e577609aac7a506937",
    "skills/chanks-1-heredado/SKILL.md": "3c5eded0bd66021d0626d486dd57fabe99b0103383b81082b24e3a0ebc9e647e",
    "skills/chanks-1-heredado/references/ubicacion-y-cruces.md": "7e7e7a5ebdf6a60279e4a899550444ce6f65f2b7f0c2487ccf10d694285aed55",
    "skills/chanks-1-prd/SKILL.md": "f1298faf3782d611723a8f296d172891f1d09186e1727ede696fe5dc9b8e0c7e",
    "skills/chanks-1-project-kickoff/SKILL.md": "75e1cc5fec5aea5e09b13b9852eb754c18471cba591eb9971221f848887ea2f8",
    "skills/chanks-1-requirements/SKILL.md": "b037585db25a1c9abe3e0a81881a4fa17052125ddae0b067704c51bbdfdc93de",
    "skills/chanks-1-rfc/SKILL.md": "25b915decf8d2bbabecfe2c3130984527ff474a07bfe3e1d04650008072da6c2",
    "skills/chanks-1-terreno/SKILL.md": "0128be04f3f0ca9968ed557550232077f828d16c210ffffe18045c5e9f2cc31a",
    "skills/chanks-2-planificador-granular/SKILL.md": "36872abc8b73e102687334f92f3bd44169831eaae8b9e258a124ef47aa3170f0",
    "skills/chanks-2-planificador-granular/references/juicio-de-ruta.md": "64d94ab688bd3b1e0c5512cdb628a0e9d68856eff864322a41260b979ac8d2bf",
    "skills/chanks-3-session-kickoff/SKILL.md": "7d7804a8aa7547e0a550dfae708a2645e245b67728d813b0b8f9b43569de0761",
    "skills/chanks-4-puente/SKILL.md": "a310c9af8066895d4bd86818a896f2382455f37633dfe8195f9f2c2e002df428",
    "skills/chanks-4-unattended-implementation/SKILL.md": "b31e4926f92fb65a8b1a165b44ae3d6c72c2ba76cf0d1e8103a000fdb14a84eb",
    "skills/chanks-4-unattended-implementation/assets/execution-contract.schema.json": "c1b042d79e887c7f7fe9288d68f280b2e32ca28d6a6cb5543d49e7aa117e327d",
    "skills/chanks-4-unattended-implementation/references/night-mode.md": "db2b853dc81e48cb399ecb64fa13d704107c013fcf3055340aa49a50b4c52dc4",
    "skills/chanks-4-unattended-implementation/references/runtime-standalone.md": "79ec43177d4fc620cf5f975057666ef5a890db04a5f196cef6c2c2156ee255ed",
    "skills/chanks-4-unattended-implementation/references/sealing-and-routing.md": "7083202764b4b7a8ff1cda418cbb84c6598bb524237203b8fe284c89eb25e61a",
    "skills/chanks-6-politica-de-entrega/SKILL.md": "92f08daa79656b499e3bee5cb30484a96ec37fe8dae80e1141285fe1a514230d",
    "skills/chanks-7-session-doc/SKILL.md": "16d169d14732352f2ce51bd1e907459ef61478df20e9be74c682a0f11470ac04",
    "skills/chanks-7-session-doc/assets/project-notion-map.json": "a1a79c51ac57fc02e7b7bb7da3a1910ba78784273287abb9932cb8ed74782d69",
    "skills/chanks-7-session-doc/assets/session-doc.schema.json": "7000699393a5b2ef8eed70789474cd98b1754b7833cec542994eb6b89472f1ad",
    "skills/chanks-7-session-doc/references/links.md": "5a80bbdbd8a9fe7b8f29ff2aa8306349c734ff06fdaeeb3bac0387e1ece35b8c",
    "skills/_shared/plan-naming-convention.md": "8f4b4efdd4538cb55b92b450d224a6837d6ad309913a4977037b2cb27acab4c5",
    "templates/session-routing.md": "f2b23ccc6a2a0b43e3a6104fb2c33e4f9282d1adf1e1b7f4a0fdb7ada3f48b51",
    "README.md": "7495e86cb6c64d20069a9ccbf5d873e4b16b3af0d10ac9549db61a10742f3ce7",
    "FLUJO-END-TO-END.md": "cf65ddf857ea55354bf7cd93d5d30dd5fce84dc4568283c403e7006765378313",
}


def read(relative):
    return (ROOT / relative).read_text(encoding="utf-8")


class GenericBuilderFlowTests(unittest.TestCase):
    def test_active_builder_uses_a_responsible_parent_not_tower_roles(self):
        support = read("skills/chanks-0-agente-soporte/SKILL.md")
        kickoff = read("skills/chanks-3-session-kickoff/SKILL.md")
        bridge = read("skills/chanks-4-puente/SKILL.md")
        closure = read("skills/chanks-7-session-doc/SKILL.md")
        template = read("templates/session-routing.md")

        self.assertIn("read-only planning evidence helper", support)
        self.assertIn("responsible parent", support)
        self.assertNotIn("Support", support)
        self.assertNotIn("openspec/plan.yaml` al", support)

        for source in (kickoff, bridge, closure, template):
            self.assertIn("responsible parent", source)
            self.assertNotIn("Support", source)
            self.assertNotIn("Tower", source)
            self.assertNotIn("MAIN", source)

        self.assertIn("current repository and branch", kickoff)
        self.assertIn("Git contamination", kickoff)
        self.assertIn("human choice", kickoff)
        self.assertIn("return evidence", bridge)
        self.assertIn("return closure evidence", closure)

    def test_support_reads_the_plan_only_through_radar(self):
        skill_path = "skills/chanks-0-agente-soporte/SKILL.md"
        sources = {
            relative: read(relative)
            for relative in (skill_path, "skills/chanks-0-agente-soporte/assets/brief-diario.md")
        }

        for relative, source in sources.items():
            self.assertIn("`radar status`", source, relative)
            self.assertIn("`radar sesion <ID>`", source, relative)
            self.assertNotIn("`openspec/ROADMAP.md`", source, relative)
            for line in source.splitlines():
                if "`openspec/plan.yaml`" in line:
                    self.assertTrue(
                        "no `openspec/plan.yaml`" in line.lower() or "never" in line.lower(),
                        f"{relative} instructs reading the whole plan: {line}",
                    )
        self.assertIn("radar is missing or rejects the plan", sources[skill_path])

    def test_kickoff_resumes_and_bridge_requires_module_trailer(self):
        kickoff = read("skills/chanks-3-session-kickoff/SKILL.md")
        bridge = read("skills/chanks-4-puente/SKILL.md")

        self.assertIn("first pending Módulo", kickoff)
        self.assertIn("never redo a delivered Módulo", kickoff)
        self.assertIn("`Modulo: <ID>`", bridge)
        self.assertIn("every Módulo commit", bridge)

    def test_active_builder_retains_generic_route_review_archive_and_safety_contracts(self):
        canon = read("skills/_shared/plan-naming-convention.md")
        template = read("templates/session-routing.md")
        unattended = read("skills/chanks-4-unattended-implementation/SKILL.md")

        for route in ("`direct`", "`design-tasks`", "`full-sdd`"):
            self.assertIn(route, canon)
            self.assertIn(route, template)
        self.assertIn("verify", canon)
        self.assertIn("review", canon)
        self.assertIn("archive", canon)
        self.assertIn("forecast, never a live lock", canon)
        self.assertNotIn("MAIN", canon)
        self.assertNotIn("Tower runtime", canon)

        self.assertIn("standalone sealed approval", unattended)
        self.assertIn("never start external sessions", unattended)
        self.assertIn("Never invoke Tower", unattended)
        self.assertNotIn("tower_status", unattended)
        self.assertNotIn("tower_", unattended)
        json.loads(read("skills/chanks-4-unattended-implementation/assets/execution-contract.schema.json"))

    def test_canon_defines_priority_as_an_optional_ordering_attribute(self):
        canon = read("skills/_shared/plan-naming-convention.md")
        status = canon.split("## 9. Status", 1)[1].split("## 10.", 1)[0]

        self.assertIn("### Priority", status)
        for phrase in (
            "`prioridades`", "`prioridad`", "optional ordering attribute", "never a level",
            "no time field", "would be `LISTO`", "`DIFERIDO`",
        ):
            self.assertIn(phrase, status)
        states = [row for row in status.splitlines() if row.startswith("| ") and "`" in row.split("|")[1]]
        self.assertEqual(len(states), 7)
        self.assertIn("Never add a fifth level.", canon)

    def test_frozen_product_snapshot_matches_the_pre_migration_builder(self):
        snapshot = ROOT.parent / "product" / "tower" / "generic"
        self.assertTrue(snapshot.is_dir(), "missing frozen product snapshot")
        self.assertEqual(len(SNAPSHOT_SHA256), 42)
        for relative, expected_sha256 in SNAPSHOT_SHA256.items():
            frozen = snapshot / relative
            self.assertTrue(frozen.is_file(), f"missing snapshot {relative}")
            actual = hashlib.sha256(frozen.read_bytes()).hexdigest()
            self.assertEqual(actual, expected_sha256, relative)

    def test_registry_does_not_register_frozen_product_assets_or_tower_skills(self):
        forbidden = {
            "product/tower/generic",
            "torre-control",
            "torre-control-soporte",
            "torre-control-entregas",
        }

        def assert_generic_inventory(inventory):
            self.assertTrue(set(inventory).isdisjoint(forbidden))

        assert_generic_inventory(INSTALLER.SKILLS)
        self.assertTrue(all(source.is_relative_to(SKILLS) for _, _, source in INSTALLER.source_files(ROOT)))
        with self.assertRaises(AssertionError):
            assert_generic_inventory((*INSTALLER.SKILLS, "torre-control"))


if __name__ == "__main__":
    unittest.main()
