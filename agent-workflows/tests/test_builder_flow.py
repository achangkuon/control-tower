import hashlib
import importlib.util
import json
from pathlib import Path
import re
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


ADMISSION_CONTRACT_START = "<!-- SESSION-ADMISSION-CONTRACT:CANONICAL -->"
ADMISSION_CONTRACT_END = "<!-- /SESSION-ADMISSION-CONTRACT:CANONICAL -->"
def admission_contract(source):
    start = source.index(ADMISSION_CONTRACT_START)
    payload_start = source.index("```json", start) + len("```json")
    payload_end = source.index("```", payload_start)
    end = source.index(ADMISSION_CONTRACT_END, payload_end) + len(ADMISSION_CONTRACT_END)
    return json.loads(source[payload_start:payload_end]), start, end


class GenericBuilderFlowTests(unittest.TestCase):
    def test_native_session_contract_centers_coordination_and_four_part_encargo(self):
        canon = read("skills/_shared/plan-naming-convention.md")
        planner = read("skills/chanks-2-planificador-granular/SKILL.md")
        judgment = read("skills/chanks-2-planificador-granular/references/juicio-de-ruta.md")

        for source in (canon, planner):
            self.assertIn("pedido_contexto", source)
            self.assertIn("resultado_comportamiento", source)
            self.assertIn("restricciones_decisiones", source)
            self.assertIn("referencias", source)
            self.assertIn("ODD", source)
        self.assertIn("Zona → Sesión", canon)
        self.assertIn("historical evidence", canon)
        self.assertIn("chanks-2-planificador-granular", canon)
        self.assertIn("Session preparation", planner)
        self.assertNotIn("propose one of three routes", planner)
        self.assertIn("explicit human `solicitud_sdd`", judgment)
        self.assertNotIn("three routes", judgment)

    def test_kickoff_admits_fresh_radar_without_a_key_or_host_envelope(self):
        kickoff = read("skills-diferidas/v2/chanks-3-session-kickoff/SKILL.md")
        autoridad = read("skills/chanks-1-autoridad/SKILL.md")
        planner = read("skills/chanks-2-planificador-granular/SKILL.md")

        for obsolete in ("PI-ADMISSION-HANDOFF", "CHANKS_PI_ADMISSION", "pi-switch.mjs",
                         "chanks_request_activation", "activation key", "planning key",
                         "human click", "host envelope", "host-attested", "S159",
                         "SHA-256"):
            self.assertNotIn(obsolete, kickoff.lower() if obsolete.islower() else kickoff)
        for evidence in ("installed Radar", "named approved Session", "HEAD",
                         "radar status --json", "radar sesion <ID>", "stage 4", "💪"):
            self.assertIn(evidence, kickoff)
        self.assertIn("only on successful transition", kickoff)
        self.assertIn("never on refusal", kickoff)
        for planning_skill in (autoridad, planner):
            self.assertNotIn("chanks_request_activation", planning_skill)
            self.assertNotIn("llave de planificación", planning_skill.lower())
            self.assertNotIn("planning key", planning_skill.lower())
            self.assertNotIn("clic de activación", planning_skill.lower())
            self.assertNotIn("activation click", planning_skill.lower())

    def test_kickoff_keeps_the_installed_radar_as_the_only_admission_binary(self):
        kickoff = " ".join(read("skills-diferidas/v2/chanks-3-session-kickoff/SKILL.md").split())
        self.assertIn("Radar is the only admission binary", kickoff)
        self.assertIn("never a binary built or found in a repository checkout", kickoff)
        self.assertIn("$HOME/.local/bin/radar", kickoff)

    def test_kickoff_states_admission_once_in_its_simple_form(self):
        kickoff = " ".join(read("skills-diferidas/v2/chanks-3-session-kickoff/SKILL.md").split())
        self.assertIn("`start` requires `LISTO`", kickoff)
        self.assertIn("`continue`/`resume` require `LISTO` or `EN CURSO`", kickoff)
        self.assertIn("references/admission-contract.md", kickoff)
        self.assertEqual(kickoff.count("radar status --json"), 1)

    def test_kickoff_marks_the_session_en_curso_with_radar_marcar(self):
        kickoff = " ".join(read("skills-diferidas/v2/chanks-3-session-kickoff/SKILL.md").split())
        for phrase in ("radar marcar <ID> --worktree <absolute", "`EN CURSO`", "branch that already has commits",
                       "primary checkout", "chanks-3-paralelo"):
            self.assertIn(phrase, kickoff)

    def test_native_resume_reconciles_same_identity_but_legacy_keeps_pending_module(self):
        support = read("skills-diferidas/v2/chanks-0-agente-soporte/SKILL.md")
        kickoff = read("skills-diferidas/v2/chanks-3-session-kickoff/SKILL.md")
        handoff = read("skills-diferidas/v2/chanks-0-agente-soporte/assets/assignment-implementation.md")
        brief = read("skills-diferidas/v2/chanks-0-agente-soporte/assets/brief-diario.md")

        for source in (kickoff, handoff):
            self.assertIn("same Session identity", source)
            self.assertIn("first pending Módulo for legacy", source)
        for source in (support, handoff, brief):
            self.assertNotIn("SHA-256", source)
            # V1 has no admission step: the pointer is the organic handover, never the
            # V2-deferred kickoff skill.
            self.assertNotIn("chanks-3-session-kickoff", source)
            self.assertIn("chanks-4-puente", source)
            self.assertIn("no admission step", source)
        self.assertIn("native record, code, and evidence", kickoff)
        self.assertIn("never execute a repository binary", support)
        self.assertIn("no fallback from a rejected state", " ".join(kickoff.split()).lower())

    def test_bridge_and_closure_keep_native_odd_subordinate_to_plan_authority(self):
        bridge = read("skills/chanks-4-puente/SKILL.md")
        closure = read("skills/chanks-5-session-doc/SKILL.md")
        canon = read("skills/_shared/plan-naming-convention.md")

        for phrase in (
            "native ODD technical record", "does not become a second product plan",
            "parent-record delta", "delivered commit",
        ):
            self.assertIn(phrase, bridge)
        for obsolete in ("PI-EXECUTION-REBIND", "host-admitted", "one Session review",
                         "prepare_new_change.py", "planningHome", "Módulo commits",
                         "per work-unit commit", "final pending unit", "Strict TDD",
                         "RDD", "consent", "Forward configured"):
            self.assertNotIn(obsolete, bridge)
        self.assertIn("Gentle AI wins", bridge)
        self.assertIn("ordinary delivery policy", closure)
        self.assertIn("actual delivery evidence", closure)
        self.assertNotIn("per work-unit commit", canon)
        self.assertNotIn("final pending unit before closure", canon)
        self.assertNotIn("one Session review", canon)
        self.assertNotIn("no per-task or per-Módulo reviewer loop", canon)
        self.assertNotIn("review-size forecast", canon)
        self.assertNotIn("Strict TDD", canon)
        self.assertIn("archive controls remain native SDD controls", canon)

    def test_s156_planning_handoff_and_review_reference(self):
        autoridad = read("skills/chanks-1-autoridad/SKILL.md")
        planner = read("skills/chanks-2-planificador-granular/SKILL.md")
        canon = read("skills/_shared/plan-naming-convention.md")
        errors = read("skills/chanks-1-adopcion/references/errores-conocidos.md")

        self.assertIn("chanks-2-planificador-granular", autoridad)
        self.assertIn("aprobación humana", autoridad)
        self.assertIn("evidencia", autoridad)
        self.assertIn("responsible parent", autoridad)
        self.assertNotIn("chanks-3-session-kickoff", planner)
        self.assertIn("chanks-4-puente", planner)
        self.assertIn("no admission step", planner)
        self.assertIn("evidence", planner)
        self.assertIn("responsible parent", planner)
        for source in (autoridad, planner):
            self.assertNotIn("chanks_request_activation", source)
            self.assertNotIn("llave de planificación", source.lower())
            self.assertNotIn("planning key", source.lower())
            self.assertNotIn("clic de activación", source.lower())
            self.assertNotIn("activation click", source.lower())
        self.assertIn("Stage 4 belongs to Gentle AI", canon)
        self.assertIn(
            "prescribes nothing about review timing, consent, or delivery gates",
            " ".join(canon.split()),
        )
        self.assertNotIn("per work-unit commit", canon)
        self.assertNotIn("review outcome never authorizes delivery", canon)
        agents = (ROOT.parent / "AGENTS.md").read_text(encoding="utf-8")
        for phrase in ("sequential verifiable reversible units", "explicit exception", "not a quota",
                       "ask the maintainer"):
            self.assertNotIn(phrase, canon)
        self.assertIn("Chanks adds no size rule", canon)
        self.assertIn("Gentle AI's native guidance", canon)
        for phrase in ("unidades secuenciales verificables y revertibles", "excepción explícita",
                       "no es un cupo", "preguntá al maintainer"):
            self.assertNotIn(phrase, errors.lower())
        self.assertIn("Chanks no agrega regla de tamaño", errors)
        self.assertIn("guía nativa de Gentle AI", errors)
        for phrase in ("pregunta al responsable antes de implementar", "excepción de tamaño"):
            self.assertNotIn(phrase, agents)
        self.assertIn("Chanks no agrega regla de tamaño", agents)
        self.assertIn("guía nativa de Gentle AI", agents)
        self.assertNotIn("ask the maintainer", planner)
        self.assertIn("Chanks adds no size rule", planner)
        self.assertIn("Gentle AI's native guidance", planner)
        self.assertIn("572", errors)
        self.assertIn("969f189", errors)
        self.assertNotIn("Mantené el cupo", errors)
        self.assertNotIn("registro de avance", errors)

    def test_closure_closes_one_session_through_radar_and_nothing_else(self):
        closure = read("skills/chanks-5-session-doc/SKILL.md")
        compact = " ".join(closure.split())
        for rule in (
            "`entrega.commit`", "ancestor", "`radar archivar <ID>`", "`radar check`",
            "`radar render`", "Only the responsible parent writes `openspec/plan.yaml`",
            "nada que registrar",
        ):
            with self.subTest(rule=rule):
                self.assertIn(rule, compact)
        for gone in ("reinstall", "Issue-Patch", "Herdr", "Pi sessions",
                     "installers", "chanks-7", "radar marcar", "radar desmarcar"):
            with self.subTest(gone=gone):
                self.assertNotIn(gone, closure)
        self.assertTrue(closure.startswith("---\nname: chanks-5-session-doc\n"))
        skill_dir = SKILLS / "chanks-5-session-doc"
        self.assertEqual(sorted(p.relative_to(skill_dir).as_posix() for p in skill_dir.rglob("*") if p.is_file()),
                         ["SKILL.md", "assets/project-notion-map.json", "assets/session-doc.schema.json",
                          "references/notion-closure.md"])

    def test_single_session_handoff_reaches_stage_five_without_markers(self):
        bridge = " ".join(read("skills/chanks-4-puente/SKILL.md").split())
        self.assertIn("references/session-readiness.md", bridge)
        self.assertIn("verified commit and completed-task evidence", bridge)
        self.assertIn("no admission step", bridge)
        self.assertIn("chanks-5-session-doc", bridge)
        self.assertIn("stage 5 stays pending", bridge)
        readiness = " ".join(read("skills/chanks-4-puente/references/session-readiness.md").split())
        for phrase in ("lowercase Session ID", "`odd/tasks/<id>.md`", "`odd/tasks/<id>-<feature>.md`",
                       "exactly one", "at least one checked task", "no unchecked tasks",
                       "resolves in Git", "same checkout", "no additional review",
                       "deferred to V2 (Pista)"):
            self.assertIn(phrase, readiness)
        self.assertNotIn("<id>*.md", readiness)
        self.assertIn("One Session does not require parallel machinery", readiness)
        for source in (bridge, readiness):
            for gone in ("radar marcar", "radar desmarcar", "--listo", "radar etapa",
                         "chanks-3-session-kickoff", "admitted"):
                with self.subTest(gone=gone):
                    self.assertNotIn(gone, source)

    def test_v1_stage_skills_and_live_docs_give_no_marker_or_formal_start_instruction(self):
        """V1 runs without dispatch markers or a formal start; both wait for V2 (Pista)."""
        folders = [INSTALLER.skill_source_root(ROOT, name) for name in INSTALLER.CHANKS_SKILLS]
        sources = [path for folder in folders for path in sorted(folder.rglob("*"))
                   if path.is_file() and path.suffix in {".md", ".json", ".py"}]
        sources.append(ROOT / "templates/session-routing.md")
        self.assertGreater(len(sources), len(folders))
        for path in sources:
            text = path.read_text(encoding="utf-8")
            for gone in ("radar marcar", "radar desmarcar", "chanks-3-session-kickoff"):
                with self.subTest(file=path.relative_to(ROOT).as_posix(), gone=gone):
                    self.assertNotIn(gone, text)
        readme = " ".join(read("README.md").split())
        self.assertIn("Deferred to V2", readme)
        self.assertNotIn("| Session workflow | `chanks-3-session-kickoff`", readme)
        flow = " ".join(read("FLUJO-END-TO-END.md").split())
        self.assertIn("no admission step", flow)
        self.assertIn("deferred to V2 (Pista)", flow)
        self.assertNotIn("current-repository kickoff", flow)

    def test_generic_notion_closure_preserves_known_maps_on_demand(self):
        skill = read("skills/chanks-5-session-doc/SKILL.md")
        reference = " ".join(read("skills/chanks-5-session-doc/references/notion-closure.md").split())
        project_map = json.loads(read("skills/chanks-5-session-doc/assets/project-notion-map.json"))
        schema = json.loads(read("skills/chanks-5-session-doc/assets/session-doc.schema.json"))
        self.assertIn("only when the project uses Notion and local policy permits it", skill)
        self.assertNotIn("assets/project-notion-map.json", skill)
        self.assertNotIn("assets/session-doc.schema.json", skill)
        self.assertIn("Control Tower", reference)
        self.assertIn("never search, consult, create, or update Notion", reference)
        self.assertIn("absence of `.session-doc.json` is intentional", reference)
        self.assertIn("only on demand", reference)
        self.assertIn("committed pointer is the source of truth", reference)
        self.assertIn("unknown project", reference)
        self.assertFalse((ROOT.parent / ".session-doc.json").exists())
        self.assertEqual([project["notion_page_id"] for project in project_map["projects"]],
                         ["387e23cc934581f99b44eb519210c801", "38be23cc9345801099ecd67402e32992",
                          "38be23cc93458067800ce1721df78d50"])
        self.assertEqual([project["match"] for project in project_map["projects"]],
                         [["Servi-Task-U", "Servitask", "servi-task", "servitask"],
                          ["ecom-ecuador", "Ecom-Ecuador", "ECOM-EC"],
                          ["Finanzas-Personales", "finanzas-personales"]])
        self.assertEqual(schema["properties"]["notion"]["properties"]["enabled"]["const"], False)
        self.assertEqual(len(schema["oneOf"]), 2)
        page_pattern = schema["properties"]["notion_page_id"]["pattern"]
        for project in project_map["projects"]:
            self.assertRegex(project["notion_page_id"], page_pattern)
        self.assertRegex("387e23cc-9345-81f9-9b44-eb519210c801", page_pattern)
        self.assertIsNone(re.fullmatch(page_pattern, "unknown-page"))
        self.assertIn("chanks-5-session-doc", schema["title"])

    def test_planning_reference_defers_all_technical_execution_policy(self):
        judgment = read("skills/chanks-2-planificador-granular/references/juicio-de-ruta.md")
        self.assertIn("Gentle AI owns technical execution policy", judgment)
        for prescription in ("Strict TDD", "Technical checks/review follow", "Engram recovery",
                             "native preflight", "review outcome never authorizes delivery"):
            self.assertNotIn(prescription, judgment)

    def test_control_tower_session_doc_exemption_names_the_actual_configuration_file(self):
        policy = (ROOT.parent / "AGENTS.md").read_text(encoding="utf-8")
        self.assertIn("`.session-doc.json`", policy)
        self.assertNotIn(".chanks-7-session-doc.json", policy)

    def test_stage_five_delivery_policy_reads_declaration_and_prescribes_no_gentle_how(self):
        policy = read("skills/chanks-5-politica-de-entrega/SKILL.md")
        self.assertTrue(policy.startswith("---\nname: chanks-5-politica-de-entrega\n"))
        for phrase in ("stage 5", "delivery-policy", "AGENTS.md", "direct-push", "pull-request",
                       "issue-first", "missing", "contradictorias"):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, policy)
        for contract in (
            "En etapas 1–2", "No alteres pisos de seguridad", "Con confirmación",
            "sin evidencia suficiente", "señales contradictorias", "no supongas PR",
            "issue-first como requisito sólo donde el repositorio lo adopte",
            "prevalece la política local",
            "Chanks no agrega regla de tamaño",
            "guía nativa de Gentle AI",
        ):
            with self.subTest(contract=contract):
                self.assertIn(contract, policy)
        for gone in ("work-unit-commits", "branch-pr", "chained-pr", "enrutá a", "400"):
            with self.subTest(gone=gone):
                self.assertNotIn(gone, policy)

    def test_manual_coordinator_and_dispatch_remain_topology_only(self):
        coordinator = read("skills-diferidas/v2/chanks-3-coordinador-manual/SKILL.md")
        dispatch = read("skills-diferidas/v3/chanks-3-despacho-herdr/SKILL.md")
        template = read("templates/session-routing.md")

        for source in (coordinator, dispatch):
            self.assertIn("same Session identity", source)
            self.assertIn("first pending Módulo for legacy", source)
        self.assertIn("does not own ODD continuity", coordinator)
        self.assertIn("does not grant execution authority", dispatch)
        self.assertNotIn("same Session identity", template)
        self.assertNotIn("topology control", template)

    def test_manual_admission_contract_is_closed_and_conditional(self):
        template = read("templates/session-routing.md")
        kickoff = read("skills-diferidas/v2/chanks-3-session-kickoff/SKILL.md")
        source = read("skills-diferidas/v2/chanks-3-session-kickoff/references/admission-contract.md")
        contract, _, _ = admission_contract(source)
        self.assertNotIn(ADMISSION_CONTRACT_START, template)
        self.assertEqual(source.count(ADMISSION_CONTRACT_START), 1)
        self.assertEqual(source.count(ADMISSION_CONTRACT_END), 1)
        self.assertIn("references/admission-contract.md", kickoff)
        self.assertEqual(contract, {
            "intents": ["start", "continue", "resume"],
            "evidence": {
                "source": "Radar via the read-only planning evidence helper",
                "commands": ["radar status --json", "radar sesion <ID>"],
                "binding": [
                    "HEAD", "Session ID", "SHA-256(radar status --json exact bytes)",
                    "SHA-256(radar sesion <ID> exact bytes)",
                ],
            },
            "admissible": {
                "start": {"states": ["LISTO"]},
                "continue": {"states": ["LISTO", "EN CURSO"], "requires": {
                    "native_encargo": "same Session identity plus reconciliation of native ODD record, code, and evidence",
                    "legacy": "first pending Módulo for legacy",
                }},
                "resume": {"states": ["LISTO", "EN CURSO"], "requires": {
                    "native_encargo": "same Session identity plus reconciliation of native ODD record, code, and evidence",
                    "legacy": "first pending Módulo for legacy",
                }},
                "route": "chanks-3-session-kickoff",
            },
            "non_admissible": {
                "output": ["state", "blocker", "Zone-ordered LISTO choices"],
                "forbidden_fallbacks": [
                    "chanks-3-session-kickoff", "chanks-1-cierre-de-decisiones",
                ],
            },
            "decision_closure": "separate explicit human request for the named decision",
            "semantics": {
                "seats": "compatible capacity, never assigned agents",
                "queue": "Zone-ordered rows and length, never assigned agents",
                "listo_choices": "count of current LISTO choices, never assigned agents",
            },
            "tower_boundary": "manual-only; no Tower runtime or skills",
        })
        self.assertNotIn("chanks-3-session-kickoff", template)

    def test_support_preserves_read_only_adoption_and_handoff_boundaries(self):
        support = read("skills-diferidas/v2/chanks-0-agente-soporte/SKILL.md")
        handoff = read("skills-diferidas/v2/chanks-0-agente-soporte/assets/assignment-implementation.md")

        for phrase in (
            "$HOME/.local/bin/radar status --json -C <repo>",
            "$HOME/.local/bin/radar sesion <ID> -C <repo>",
            "never execute a repository binary", "has not adopted plan management",
            "improvise a substitute record", "parallel-safety verdict",
            "Issue one bounded implementation handoff", "do not dispatch or assign an agent",
        ):
            self.assertIn(phrase, support)
        for phrase in (
            "selected implementer", "authorizes no plan mutation, lock, dispatch",
            "same Session identity", "first pending Módulo for legacy",
        ):
            self.assertIn(phrase, handoff)

    def test_legacy_evidence_and_native_odd_are_explicitly_separate(self):
        bridge = read("skills/chanks-4-puente/SKILL.md")
        canon = read("skills/_shared/plan-naming-convention.md")

        self.assertIn("it never imposes Módulos", bridge)
        self.assertIn("historical legacy evidence", bridge.lower())
        self.assertNotIn("per work-unit commit", bridge)
        self.assertIn("Only legacy `full-sdd` runs", canon)
        self.assertIn("Gentle AI's native SDD pipeline", canon)
        self.assertIn("direct` and `design-tasks` remain non-SDD", canon)
        self.assertIn("review", canon)
        self.assertIn("Stage 4 belongs to Gentle AI", canon)

    def test_bridge_passes_sdd_fields_through_without_choosing_a_route(self):
        bridge = " ".join(read("skills/chanks-4-puente/SKILL.md").split())
        self.assertIn("`solicitud_sdd`", bridge)
        self.assertIn("legacy `ruta`", bridge)
        self.assertIn("exactly as written", bridge)
        for gone in ("sdd-status", "prepare_new_change.py", "preflight", "native SDD is exclusive"):
            self.assertNotIn(gone, bridge)

    def test_no_debt_scope_rule_preserves_authorized_in_session_adjustments(self):
        canon = " ".join(read("skills/_shared/plan-naming-convention.md").split())

        self.assertIn("does not fit the existing coherent approved Session", canon)
        self.assertIn("approved scope/file adjustment within the same Session", canon)
        self.assertIn("human authorization and fresh compatibility before affected write", canon)
        self.assertIn("never silently expands", canon)

    def test_canon_retains_partition_identity_render_and_adoption_safety(self):
        canon = read("skills/_shared/plan-naming-convention.md")

        compact = " ".join(canon.split())
        for phrase in (
            "defined-by-paths, disjoint, exhaustive, and stable", "exclusive per exact file",
            "self-reference/cycles are invalid", "Render rejects escapes, symlink/non-regular destinations",
            "synced temporary output, atomic rename", "eight classes always escalate",
            "Never import closed Sessions as live rows", "Never fabricate completion",
        ):
            self.assertIn(phrase, compact)

    def test_restores_operational_legacy_and_adoption_guards_around_native_odd(self):
        bridge = read("skills/chanks-4-puente/SKILL.md")
        support = read("skills-diferidas/v2/chanks-0-agente-soporte/SKILL.md")
        handoff = read("skills-diferidas/v2/chanks-0-agente-soporte/assets/assignment-implementation.md")
        canon = read("skills/_shared/plan-naming-convention.md")

        for phrase in ("native ODD", "historical legacy evidence",
                       "exact authorized files", "observed execution", "parent-record delta"):
            self.assertIn(phrase.lower(), bridge.lower())
        self.assertIn("has not adopted plan management", support)
        self.assertIn("Issue one bounded implementation handoff", support)
        self.assertIn("selected implementer", handoff)
        self.assertIn("historical exception", canon.lower())
        self.assertIn("The four steps", canon)
        self.assertIn("no-debt closure", canon.lower())
        self.assertIn("incomplete Encargo retains known declarations", canon)

    def test_implementation_handoff_carries_no_v2_machinery(self):
        handoff = read("skills-diferidas/v2/chanks-0-agente-soporte/assets/assignment-implementation.md")
        for gone in ("PI_SESSION_ID", "APPROVED_ALIAS", "Intercom", "listo para revisión",
                     "seal", "RDD", "SHA-256", "TDD"):
            with self.subTest(gone=gone):
                self.assertNotIn(gone, handoff)
        self.assertIn("Gentle AI", handoff)

    def test_worker_revalidation_tolerates_only_the_dispatch_markers_listo_to_en_curso(self):
        skill = read("skills-diferidas/v3/chanks-4-unattended-implementation/SKILL.md")
        sealing = read("skills-diferidas/v3/chanks-4-unattended-implementation/references/sealing-and-routing.md")

        self.assertIn("Worker-side revalidation after dispatch tolerates exactly one drift", skill)
        self.assertIn("references/sealing-and-routing.md", skill)

        for phrase in (
            "radar.despacho/v1",
            "chanks/despachos/<ID>.json",
            "is a regular file, never a symlink",
            "Exactly one `Estado:` line may differ",
            "radar_status_stdout_sha256` proves only the snapshot Radar showed at seal time",
            "never recompares it after dispatch",
            "Before dispatch, with no marker on disk",
        ):
            self.assertIn(phrase, sealing)

    def test_unattended_seal_never_answers_gentle_ai_consent_for_the_human(self):
        base = "skills-diferidas/v3/chanks-4-unattended-implementation"
        texts = {
            path: " ".join(read(f"{base}/{path}").split())
            for path in ("SKILL.md", "references/sealing-and-routing.md",
                         "references/night-mode.md", "references/runtime-standalone.md")
        }
        for path, text in texts.items():
            for gone in ("granted in advance", "granted_in_advance", "high` risk is granted",
                         "`medium` is declined", "RDD consent policy", "RDD reviews run or skipped",
                         "work-unit-commits"):
                with self.subTest(file=path, gone=gone):
                    self.assertNotIn(gone, text)
        skill = texts["SKILL.md"]
        self.assertIn("V2 only", skill)
        for phrase in (
            "consent envelope, a correction it cannot make, or any decision stops that Session",
            "one self-contained decision block",
            "other dispatched Sessions continue independently",
            "`review_policy` fields in the schema are inert",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, skill)
        self.assertIn("inert", texts["references/sealing-and-routing.md"])
        self.assertIn("../../chanks-3-despacho-herdr/assets/worker-handoff.md", texts["references/night-mode.md"])

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
        forbidden = {"product/tower/generic", "torre-control", "torre-control-soporte", "torre-control-entregas"}

        self.assertTrue(set(INSTALLER.SKILLS).isdisjoint(forbidden))
        self.assertTrue(all(source.is_relative_to(SKILLS) or source.is_relative_to(ROOT / "skills-diferidas")
                            for _, _, source in INSTALLER.source_files(ROOT)))
        self.assertFalse((ROOT / "skills/torre-control-entregas").exists())


STAGE_SKILL_GLOBS = (
    "chanks-0-agente-soporte", "chanks-0-explicalo-simple", "chanks-0-mensajes-visibles",
    "chanks-0-session-context-loader", "chanks-1-*", "chanks-2-planificador-granular",
    "chanks-3-session-kickoff", "chanks-3-paralelo", "chanks-4-puente", "chanks-5-*",
)
FORBIDDEN_IN_STAGE_SKILLS = (
    "--base-ref", "per work-unit commit", "Forward configured", "four lenses", "cuatro lentes",
    "chanks-7-", "chanks-6-", "PI_SESSION_ID", "outrank", "mayor precedencia", "cuatro agentes",
)


def stage_skill_dirs():
    roots = (SKILLS, ROOT / "skills-diferidas/v2")
    found = sorted({path for root in roots for pattern in STAGE_SKILL_GLOBS
                    for path in root.glob(pattern) if path.is_dir()})
    assert found, "no stage skill folders found"
    return found


def approved_stage_activation(name, description):
    if name.startswith("chanks-1-"):
        return description.startswith("Chanks etapa 1,") or description.startswith("Chanks etapa 1 Definir,")
    prefixes = {
        "chanks-0-agente-soporte": "Chanks soporte de planificación,",
        "chanks-0-explicalo-simple": "explicámelo más fácil,",
        "chanks-0-mensajes-visibles": "Chanks mensajes visibles,",
        "chanks-0-session-context-loader": "Chanks cargar contexto del plan,",
        "chanks-2-planificador-granular": "Chanks etapa 2,",
        "chanks-3-session-kickoff": "Chanks etapa 3,",
        "chanks-3-paralelo": "parallel sessions,",
        "chanks-4-puente": "Chanks etapa 4,",
        "chanks-5-politica-de-entrega": "Chanks política de entrega,",
        "chanks-5-session-doc": "Chanks etapa 5,",
    }
    prefix = prefixes.get(name)
    return prefix is not None and description.startswith(prefix)


def stage_relative(path):
    root = SKILLS if path.is_relative_to(SKILLS) else ROOT / "skills-diferidas/v2"
    return path.relative_to(root).as_posix()


def stage_skill_texts():
    for folder in stage_skill_dirs():
        for path in sorted(folder.rglob("*")):
            if path.is_file() and path.suffix in {".md", ".json", ".py"}:
                yield path, path.read_text(encoding="utf-8")


class StageSkillBoundaryTests(unittest.TestCase):
    """Stages 1–5, including parallel admission and support files, preserve the boundary."""

    def test_stage_skills_carry_none_of_the_collision_phrases(self):
        for path, text in stage_skill_texts():
            for phrase in FORBIDDEN_IN_STAGE_SKILLS:
                with self.subTest(file=stage_relative(path), phrase=phrase):
                    self.assertNotIn(phrase, text)

    def test_scan_covers_parallel_and_python_support_files(self):
        self.assertIn(SKILLS / "chanks-3-paralelo", stage_skill_dirs())
        paths = {stage_relative(path) for path, _ in stage_skill_texts()}
        self.assertIn("chanks-3-paralelo/SKILL.md", paths)
        self.assertIn("chanks-4-puente/scripts/prepare_new_change.py", paths)
        self.assertIn("chanks-3-session-kickoff/references/admission-contract.md", paths)

    def test_digest_ceremony_lives_only_in_the_admission_reference(self):
        for path, text in stage_skill_texts():
            # Only the canonical admission payload retains historical digest fields.
            # A same-named file elsewhere must not bypass the stage boundary.
            if path == ROOT / "skills-diferidas/v2/chanks-3-session-kickoff/references/admission-contract.md":
                continue
            with self.subTest(file=stage_relative(path)):
                self.assertNotIn("SHA-256", text)
        canon = read("skills/_shared/plan-naming-convention.md")
        for phrase in FORBIDDEN_IN_STAGE_SKILLS + ("SHA-256", "digests of exact"):
            with self.subTest(canon=phrase):
                self.assertNotIn(phrase, canon)

    def test_triggers_fire_only_on_an_explicit_stage_request(self):
        for folder in stage_skill_dirs():
            text = (folder / "SKILL.md").read_text(encoding="utf-8")
            lines = text.splitlines()
            with self.subTest(skill=folder.name):
                self.assertEqual(lines[0], "---")
                self.assertTrue(lines[1].startswith("name: "), lines[1])
                self.assertTrue(lines[2].startswith('description: "Trigger:'), lines[2])
                description = lines[2][len('description: "Trigger: '):-1]
                self.assertTrue(approved_stage_activation(folder.name, description), description)
        autoridad = read("skills/chanks-1-autoridad/SKILL.md").splitlines()[2]
        for broad in ("idea,", "feature,", "proyecto nuevo"):
            self.assertNotIn(broad, autoridad)
        self.assertNotIn("nueva feature", read("skills/chanks-1-feature/SKILL.md").splitlines()[2])
        self.assertNotIn("diagnóstico", read("skills/chanks-1-descubrimiento/SKILL.md").splitlines()[2])

    def test_activation_requires_the_approved_request_not_a_chanks_token(self):
        for name, description in (
            ("chanks-1-autoridad", "Chanks decides how to build any feature."),
            ("chanks-3-paralelo", "Chanks, implement any approved Session."),
            ("chanks-4-puente", "Chanks, write code and review a change."),
            ("chanks-5-session-doc", "Chanks, finish any development request."),
            ("chanks-0-mensajes-visibles", "Chanks, suggest messages while planning."),
        ):
            with self.subTest(name=name):
                self.assertFalse(approved_stage_activation(name, description))

    def test_explicalo_simple_never_loads_unprompted(self):
        skill = read("skills/chanks-0-explicalo-simple/SKILL.md")
        self.assertNotIn("unprompted", skill)
        self.assertIn("Load only when", skill)

    def test_adoption_reads_known_errors_on_demand_and_names_every_runtime(self):
        skill = read("skills/chanks-1-adopcion/SKILL.md")
        errors = read("skills/chanks-1-adopcion/references/errores-conocidos.md")
        self.assertNotIn("Cargá `references/errores-conocidos.md` antes de ejecutar", skill)
        self.assertIn("cuando aparezca", skill)
        self.assertIn("todos los runtimes", skill)
        self.assertIn("todos los runtimes", errors)

    def test_planner_loads_no_other_skill_before_planning(self):
        planner = read("skills/chanks-2-planificador-granular/SKILL.md")
        self.assertNotIn("## Visible Messages Preamble", planner)
        self.assertIn("only when the human asks", planner)
        self.assertNotIn("size forecast", planner)
        steps = planner.split("## Execution Steps", 1)[1].split("## Output Contract", 1)[0]
        self.assertEqual(
            [line.split(".", 1)[0] for line in steps.splitlines() if line[:1].isdigit() and ". " in line],
            [str(number) for number in range(1, 9)],
        )

    def test_context_loader_keeps_only_the_radar_specific_rules(self):
        skill = read("skills/chanks-0-session-context-loader/SKILL.md")
        for phrase in ("radar status", "memoria", "No selecciones Sesión"):
            self.assertIn(phrase, skill)
        for gone in ("topic key", "sdd/{change}", "mem_"):
            self.assertNotIn(gone, skill)

    def test_orphan_support_files_are_gone(self):
        support = ROOT / "skills-diferidas/v2/chanks-0-agente-soporte"
        self.assertEqual(
            sorted(p.relative_to(support).as_posix() for p in support.rglob("*") if p.is_file()),
            ["SKILL.md", "assets/assignment-implementation.md", "assets/brief-diario.md"],
        )

    def test_flow_docs_name_the_boundary_block_and_make_no_review_claims(self):
        for relative in ("historico/EJECUCION-EN-PARALELO.md", "FLUJO-END-TO-END.md"):
            text = read(relative)
            with self.subTest(doc=relative):
                self.assertNotIn("Durable Session Skill Routing", text)
                self.assertNotIn("cuatro lentes", text)
                self.assertNotIn("chanks-6-", text)
                self.assertNotIn("chanks-7-", text)
        self.assertIn("Chanks and Gentle AI boundary", read("historico/EJECUCION-EN-PARALELO.md"))
        self.assertIn("Chanks and Gentle AI boundary", read("FLUJO-END-TO-END.md"))


if __name__ == "__main__":
    unittest.main()
