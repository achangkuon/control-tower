import importlib.util
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/install.py"
SPEC = importlib.util.spec_from_file_location("agent_workflows_install_coordinator", SCRIPT)
INSTALLER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = INSTALLER
SPEC.loader.exec_module(INSTALLER)

SKILL_NAME = "chanks-3-coordinador-manual"


def read(relative):
    return (ROOT / relative).read_text(encoding="utf-8")


def normalized(source):
    return " ".join(source.lower().split())


class CoordinadorManualTests(unittest.TestCase):
    def setUp(self):
        self.skill = read(f"skills/{SKILL_NAME}/SKILL.md")
        self.text = normalized(self.skill)

    def assert_phrases(self, *phrases):
        for phrase in phrases:
            self.assertIn(" ".join(phrase.lower().split()), self.text, phrase)

    def test_registration_and_routing_preserve_the_canonical_admission_contract(self):
        self.assertIn(SKILL_NAME, INSTALLER.CHANKS_SKILLS)
        self.assertNotIn("coordinador-multi-agente", INSTALLER.CHANKS_SKILLS)
        self.assertIn("coordinador-multi-agente", INSTALLER.RETIRED_SKILLS)
        self.assertTrue(self.skill.startswith(f"---\nname: {SKILL_NAME}\n"))
        self.assertIn(f"`{SKILL_NAME}`", read("README.md"))
        routing = read("templates/session-routing.md")
        contract = read("skills/chanks-3-session-kickoff/references/admission-contract.md")
        self.assertIn('"route": "chanks-3-session-kickoff"', contract)
        self.assertNotIn('"route"', routing)
        self.assertNotIn(SKILL_NAME, routing)
        self.assertNotIn("chanks-3-despacho-herdr", routing)

    def test_approval_is_a_complete_exact_pi_binding_and_the_router_is_stateless(self):
        self.assert_phrases(
            "human approval binds the parallel count, exact LISTO Sesión IDs, and exact Pi worker alias, exact cwd/worktree, runtime, and kind for each Sesión, but not a Pi session ID",
            "After launch, Main reads each actual Pi session ID from Herdr JSON",
            "verifies the same session ID, alias/tab and cwd/worktree against a fresh Intercom live roster and the reserved branch against fresh Git readback before sending any handoff",
            "Never predict or pre-approve an ID; missing, ambiguous, or mismatched identity sends nothing and uses the pre-send owned rollback rule",
            "never selects, substitutes, reduces, expands, optimizes, or reorders",
            "no queue, roster, ledger, assignment state, approval persistence, or auto-resume",
            "manual pre-V1 batches are Pi-only",
        )
        self.assertLess(self.skill.index("After launch, Main reads each actual Pi session ID"),
                        self.skill.index("before sending any handoff"))
        self.assertNotIn("worker alias, exact Pi session ID, exact cwd/worktree", self.skill)

    def test_approved_dispatch_delegates_all_mechanics_and_returns_without_waiting(self):
        self.assert_phrases(
            "delegate all admission, pool, lock, Herdr, Intercom, and retirement mechanics to `chanks-3-despacho-herdr`",
            "confirmed fire-and-forget handoffs",
            "never waits, polls, supervises, retries, or uses `ask`",
            "never load Tower skills",
            "never read or write Tower state",
        )

    def test_two_worker_contract_is_independent_then_serial(self):
        self.assert_phrases(
            "two approved Pi workers receive independent fire-and-forget handoffs",
            "handoff B is sent without waiting for worker A",
            "Main returns after both delivery results",
            "terminal A integrates, closes through `chanks-5-session-doc`, and retires through `chanks-3-despacho-herdr`",
            "terminal B enters integration only after A completes serial integration, closure, and retirement",
        )

    def test_terminal_events_leave_how_to_implement_and_review_to_gentle_ai(self):
        for gone in ("Module commits", "Main must not inspect", "rerun tests or RDD",
                     "second technical judgement", "rerun the worker's tests"):
            self.assertNotIn(gone, self.skill, gone)
        self.assert_phrases(
            "Gentle AI decides how a Session is implemented, checked, reviewed and committed",
            "the parent spot-checks what Gentle AI requires before integrating",
            "nothing in this skill overrides Gentle AI",
        )

    def test_terminal_events_are_accepted_only_from_the_verified_worker(self):
        self.assert_phrases(
            "accept only inbound `COMPLETED`, `BLOCKED`, or `FAILED`",
            "fresh Intercom and Herdr readbacks must prove the sender matches the human-approved/dispatched exact alias and cwd/worktree, and the post-launch verified exact Pi session ID",
            "Git readback must prove the reported commit is the dispatched worktree candidate before integration",
            "Any missing, mismatched, or unavailable readback stops: no integration, retry, remapping, or inferred terminal",
            "Main never mutates the worker candidate",
            "integrate one completed Sesión at a time",
            "integration conflict stops and escalates without resolution",
            "BLOCKED and FAILED preserve the worker and worktree and report the worker evidence",
        )

    def test_review_ready_witness_is_bound_and_marker_survives_nonclosure(self):
        self.assert_phrases(
            "only after verified inbound `listo para revisión`",
            "review_ready", "transport", "intercom", "message_id", "received_at",
            "sesion", "worker", "worktree", "branch",
            "radar.despacho/v1", "Git common dir", "atomic",
            "BLOCKED", "FAILED", "ambiguous", "orphaned", "not-yet-closed",
            "only after verified serial integration and stage-5 closure",
            "never merely on COMPLETED",
        )

    def test_negative_terminal_disconnect_and_no_main_paths_do_not_create_control_state(self):
        self.assert_phrases(
            "no polling, retry, state, correction, or inferred completion",
            "a disconnected worker or absent Main preserves the worktree and candidate",
            "does not create a retry, support, or cross-runtime path",
        )

    def test_human_activated_reconstruction_is_readback_bound_to_an_existing_assignment_only(self):
        self.assert_phrases(
            "human-activated reconstruction",
            "exact Git, Radar, Herdr, and Intercom readbacks",
            "confirmed terminal plus exact readbacks authorizes integration and closure only for that already-dispatched assignment",
            "never authorize a new dispatch, retry, changed mapping, or inferred completion",
        )

    def test_attended_reactivation_is_not_reconstruction_or_new_dispatch(self):
        route = self.skill.split("## Human-Approved Attended Reactivation", 1)[1].split("\n## ", 1)[0]
        for phrase in ("EN CURSO", "same marker", "same Session", "same worker",
                       "same branch", "same worktree", "same candidate",
                       "fresh exact human approval", "shared lock", "Git", "Radar",
                       "Herdr", "Intercom", "actual new Pi session ID",
                       "distinct reactivation handoff", "no unattended seal"):
            self.assertIn(phrase.lower(), normalized(route))
        self.assertIn("delegate (and do not reimplement)", normalized(route))
        self.assertIn("never initiates `ask`", normalized(route))
        self.assertLess(self.skill.index("## Terminal-Event Mode"),
                        self.skill.index("## Human-Approved Attended Reactivation"))
        self.assertLess(self.skill.index("## Human-Approved Attended Reactivation"),
                        self.skill.index("## Human-Activated Reconstruction"))

    def test_migration_table_names_future_tower_authority_without_copying_procedures(self):
        for capability in (
            "binding", "pool/lifecycle", "ack/retry", "terminality",
            "checkpoint/replay", "delivery reconciliation",
        ):
            self.assertIn(capability, self.skill.lower())
        self.assert_phrases("Tower V1 authority and capabilities", "does not copy Tower procedures")

    def test_incompatible_main_ownership_is_forbidden(self):
        for clause in (
            "Main reviews native RDD",
            "Main reruns worker tests",
            "Main corrects the worker candidate",
            "Main polls workers",
            "Coordinator persists assignment state",
            "Coordinator starts a replacement worker",
        ):
            self.assertNotIn(clause, self.skill, clause)


if __name__ == "__main__":
    unittest.main()


class IntervencionesDeCimientosTests(CoordinadorManualTests):
    """S146: the coordinator documents the intervention protocol it now routes.

    These assert the rules are stated, not that they work — the behaviour is proven in
    agent-workflows/tests/chanks/interventions.test.mjs, where a refused intervention is shown
    to leave the Cimiento file untouched. A skill test that claimed otherwise would be the
    "prueba de cadenas de texto" the Encargo explicitly refuses as evidence.
    """

    def test_documents_all_or_nothing_acquisition(self):
        self.assert_phrases(
            "complete coherent set",
            "granted whole or not at all",
        )

    def test_documents_why_partial_grants_are_refused(self):
        self.assert_phrases("circular wait")

    def test_documents_that_a_shared_cimiento_is_a_condition_not_a_veto(self):
        self.assert_phrases("not a veto")

    def test_documents_that_an_unknown_fingerprint_never_enables_parallel(self):
        self.assert_phrases("unknown fingerprint")

    def test_documents_release_only_after_confirmed_integration(self):
        self.assert_phrases(
            "confirmed integration",
            "never by finished local editing or worker silence",
        )

    def test_documents_that_a_stop_preserves_and_triggers_nothing(self):
        self.assert_phrases(
            "preserves the work and the evidence",
            "no automatic retry, remapping, permission, release, or resumption",
        )

    def test_keeps_main_out_of_technical_judgement(self):
        self.assert_phrases("main coordinates and integrates")

    def test_creates_no_lock_manager_or_parallel_state(self):
        self.assert_phrases("no persistent queue", "no artificial lock manager")

    def test_points_at_the_module_that_implements_it(self):
        self.assert_phrases("interventions.mjs")


class DespachoS157ContractTests(unittest.TestCase):
    def test_marker_follows_confirmed_handoff_only_and_seal_is_carried(self):
        dispatch = read("skills/chanks-3-despacho-herdr/SKILL.md")
        for phrase in ("radar.despacho/v1", "Git common dir", "atomic", "sesion",
                       "worktree", "refs/heads/", "worker", "confirmed exact handoff",
                       "ambiguous delivery", "valid approved unattended seal"):
            self.assertIn(phrase, dispatch)
        self.assertIn("no marker", dispatch)
        self.assertIn("pre-send owned rollback", dispatch)
        self.assertIn("fire-and-forget", dispatch)
