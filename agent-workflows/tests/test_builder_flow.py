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


ADMISSION_CONTRACT_START = "<!-- SESSION-ADMISSION-CONTRACT:CANONICAL -->"
ADMISSION_CONTRACT_END = "<!-- /SESSION-ADMISSION-CONTRACT:CANONICAL -->"
PI_ADMISSION_HANDOFF_START = "<!-- PI-ADMISSION-HANDOFF:JSON -->"
PI_ADMISSION_HANDOFF_END = "<!-- /PI-ADMISSION-HANDOFF:JSON -->"


def marked_json(source, start_marker, end_marker):
    self = unittest.TestCase()
    self.assertEqual(source.count(start_marker), 1)
    self.assertEqual(source.count(end_marker), 1)
    start = source.index(start_marker) + len(start_marker)
    payload_start = source.index("```json", start) + len("```json")
    payload_end = source.index("```", payload_start)
    self.assertLess(payload_end, source.index(end_marker, payload_end))
    return json.loads(source[payload_start:payload_end])


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

    def test_kickoff_pi_admission_handoff_schema_is_bounded(self):
        schema = marked_json(read("skills/chanks-3-session-kickoff/SKILL.md"), PI_ADMISSION_HANDOFF_START, PI_ADMISSION_HANDOFF_END)

        self.assertEqual(set(schema), {
            "envelope_keys", "proof_keys", "sequence", "model_responsibilities",
            "blocking_conditions", "revocation_conditions", "evidence_boundaries",
        })
        self.assertEqual(schema["envelope_keys"], [
            "admission", "radarExecutable", "gitExecutable", "identityFile",
        ])
        self.assertEqual(schema["proof_keys"], [
            "repositoryRoot", "sessionId", "baseCommit", "candidateDigest", "runtimeIdentity",
            "statusDigest", "sessionDigest",
        ])
        self.assertEqual(schema["sequence"], [
            "host_captures_git_radar_evidence", "host_creates_external_proof_and_one_use_envelope",
            "host_launches_isolated_pi", "shim_consumes_and_deletes_environment",
            "shim_validates_before_solicitation", "model_requests_activation_only",
            "host_ui_requests_confirmation", "only_exact_human_true_accepts",
            "shim_revalidates_every_capability_use", "shim_rewrites_actual_tool_input",
        ])
        self.assertEqual(set(schema["model_responsibilities"]), {"forbidden", "permitted"})
        self.assertEqual(schema["model_responsibilities"]["forbidden"], [
            "admission", "executable_paths", "proof_path_content", "writable_paths", "grants",
            "acceptance", "resource_confirmation", "confinement_options",
        ])
        self.assertEqual(schema["model_responsibilities"]["permitted"], ["request_activation"])
        self.assertTrue(set(schema["model_responsibilities"]["forbidden"]).isdisjoint(
            schema["model_responsibilities"]["permitted"]
        ))
        self.assertEqual(schema["blocking_conditions"], [
            "missing_malformed_stale_or_contradictory_evidence", "ui_absent", "human_decline_or_cancel",
            "lifecycle_change", "runtime_disconnected_or_replaced", "widened_files",
        ])
        self.assertEqual(schema["revocation_conditions"], [
            "lifecycle_change", "runtime_disconnected", "runtime_replaced",
        ])
        self.assertEqual(schema["evidence_boundaries"], {
            "s151_t3": {
                "classification": "executable_generated_shim_evidence",
                "path": "agent-workflows/tests/test_install.py",
                "suite": "PiAuthorityExtensionTests",
            },
            "s151_t5": {
                "classification": "separate_real_pi_bubblewrap_journey",
                "status": "not_implemented_or_simulated_by_t4",
            },
        })

    def test_native_resume_reconciles_same_identity_but_legacy_keeps_pending_module(self):
        support = read("skills/chanks-0-agente-soporte/SKILL.md")
        kickoff = read("skills/chanks-3-session-kickoff/SKILL.md")
        handoff = read("skills/chanks-0-agente-soporte/assets/assignment-implementation.md")
        brief = read("skills/chanks-0-agente-soporte/assets/brief-diario.md")

        for source in (support, kickoff, handoff, brief):
            self.assertIn("same Session identity", source)
            self.assertIn("first pending Módulo for legacy", source)
            self.assertIn("SHA-256", source)
            self.assertIn("SHA-256", source)
        self.assertIn("native record, code, and evidence", kickoff)
        self.assertIn("never execute a repository binary", support)
        self.assertIn("no fallback from a rejected state", kickoff)

    def test_bridge_and_closure_keep_native_odd_subordinate_to_plan_authority(self):
        bridge = read("skills/chanks-4-puente/SKILL.md")
        closure = read("skills/chanks-7-session-doc/SKILL.md")
        canon = read("skills/_shared/plan-naming-convention.md")

        for phrase in (
            "native ODD technical record", "does not become a second product plan",
            "explicit human `solicitud_sdd`", "Strict TDD", "one Session review",
        ):
            self.assertIn(phrase, bridge)
        self.assertIn("review outcome never authorizes delivery", bridge)
        self.assertIn("ordinary delivery policy", closure)
        self.assertIn("actual delivery evidence", closure)
        self.assertIn("no per-task or per-Módulo reviewer loop", canon)
        self.assertIn("archive controls remain native SDD controls", canon)

    def test_manual_coordinator_and_dispatch_remain_topology_only(self):
        coordinator = read("skills/chanks-3-coordinador-manual/SKILL.md")
        dispatch = read("skills/chanks-3-despacho-herdr/SKILL.md")
        template = read("templates/session-routing.md")

        for source in (coordinator, dispatch, template):
            self.assertIn("same Session identity", source)
            self.assertIn("first pending Módulo for legacy", source)
        self.assertIn("does not own ODD continuity", coordinator)
        self.assertIn("does not grant execution authority", dispatch)
        self.assertIn("no fake topology control", template)

    def test_manual_admission_contract_is_closed_and_conditional(self):
        template = read("templates/session-routing.md")
        contract, start, _ = admission_contract(template)
        self.assertEqual(template.count(ADMISSION_CONTRACT_START), 1)
        self.assertEqual(template.count(ADMISSION_CONTRACT_END), 1)
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
        self.assertLess(start, template.index("Primary authority for starting or continuing"))

    def test_support_preserves_read_only_adoption_and_handoff_boundaries(self):
        support = read("skills/chanks-0-agente-soporte/SKILL.md")
        handoff = read("skills/chanks-0-agente-soporte/assets/assignment-implementation.md")

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

    def test_legacy_cadence_and_native_odd_are_explicitly_separate(self):
        bridge = read("skills/chanks-4-puente/SKILL.md")
        canon = read("skills/_shared/plan-naming-convention.md")

        self.assertIn("it never imposes Módulos", bridge)
        self.assertIn("commit cadence on native ODD", bridge)
        self.assertIn("Every legacy Tarea is internal RED → GREEN → REFACTOR evidence only", bridge)
        self.assertIn("every Módulo commit includes implementation and tests", bridge)
        self.assertIn("Native ODD has one Session review boundary", bridge)
        self.assertIn("Only legacy `full-sdd` runs", canon)
        self.assertIn("Gentle AI's native SDD pipeline", canon)
        self.assertIn("direct` and `design-tasks` remain non-SDD", canon)
        self.assertIn("review", canon)
        self.assertIn("outcome never authorizes delivery", canon)

    def test_sdd_resume_binds_existing_change_without_new_start_preparation(self):
        bridge = " ".join(read("skills/chanks-4-puente/SKILL.md").split())

        self.assertIn("CONTINUE/RESUME existing authorized native SDD or legacy `full-sdd`", bridge)
        self.assertIn("do not prepare or create a container", bridge)
        self.assertIn("Bind the existing change", bridge)
        self.assertIn("fresh native v2 `sdd-status`", bridge)
        self.assertIn("exact provider-returned continuation from the preserved checkpoint", bridge)

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
        support = read("skills/chanks-0-agente-soporte/SKILL.md")
        handoff = read("skills/chanks-0-agente-soporte/assets/assignment-implementation.md")
        canon = read("skills/_shared/plan-naming-convention.md")

        for phrase in (
            "native v2 `planningHome` and `actionContext`", "human NEW-start authority and preflight",
            "`sdd-status` to return `sdd-new`", "python3 scripts/prepare_new_change.py",
            "--intent new --route full-sdd --native-artifact-store openspec",
            "fresh native v2 `sdd-status` after preparation", "exact legacy/dated archive match",
            "legacy `direct`", "Módulo commits", "criterion-by-criterion `verify`",
        ):
            self.assertIn(phrase, bridge)
        self.assertIn("has not adopted plan management", support)
        self.assertIn("Issue one bounded implementation handoff", support)
        self.assertIn("selected implementer", handoff)
        self.assertIn("historical exception", canon.lower())
        self.assertIn("The four steps", canon)
        self.assertIn("no-debt closure", canon.lower())
        self.assertIn("incomplete Encargo retains known declarations", canon)

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
        self.assertTrue(all(source.is_relative_to(SKILLS) for _, _, source in INSTALLER.source_files(ROOT)))
        self.assertFalse((ROOT / "skills/torre-control-entregas").exists())


if __name__ == "__main__":
    unittest.main()
