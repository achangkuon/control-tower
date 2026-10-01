"""Static contract checks: these do not launch Herdr or prove a live patch delivery."""

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT.parent / "AGENTS.md"
DISPATCH = ROOT / "skills/chanks-3-despacho-herdr"


def read(path):
    return path.read_text(encoding="utf-8")


def segment(text, start, end):
    return text.split(start, 1)[1].split(end, 1)[0]


class IssuePatchContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.policy = read(POLICY)
        cls.router = read(ROOT / "skills/chanks-3-coordinador-manual/SKILL.md")
        cls.dispatch = read(DISPATCH / "SKILL.md")
        cls.retire = read(DISPATCH / "references/retiro.md")
        cls.handoff = read(DISPATCH / "assets/issue-patch-handoff.md")
        cls.closure = read(ROOT / "skills/chanks-5-session-doc/SKILL.md")
        cls.routing = read(ROOT / "templates/session-routing.md")
        cls.mode = segment(cls.dispatch, "## Issue-Patch Mode", "## Decision Gates")
        cls.retire_mode = segment(cls.retire, "## Issue-patch retirement", "## Shared lock protocol\n\n1.")

    def assert_terms(self, text, *terms):
        compact = " ".join(text.replace("**", "").split()).lower()
        for term in terms:
            with self.subTest(term=term):
                self.assertIn(" ".join(term.split()).lower(), compact)

    def test_activation_offers_patch_without_session_batch(self):
        activation = segment(self.dispatch, "## Activation Contract", "## Hard Rules")
        trigger = self.dispatch.split("description: ", 1)[1].splitlines()[0]
        self.assertIn("issue patch", trigger.lower())
        self.assertIn("Activate for separate routes", activation)
        self.assertIn("Session dispatch", activation)
        self.assertIn("Issue-Patch Mode", activation)
        self.assertIn("attended continuation of an existing issue patch", activation)
        self.assertIn("without a Session batch", activation)
        self.assertNotIn("Activate only after the human names the complete batch", activation)

    def test_jornada_entry_applies_only_to_session_dispatch(self):
        activation = segment(self.dispatch, "## Activation Contract", "## Hard Rules")
        self.assertIn("For Session dispatch only, under the acquired lock", activation)
        self.assertIn("jornada.sh --ejecutar", activation)
        self.assertIn("do not invoke the Session jornada entry for an issue patch", activation)
        self.assertIn("do not run the Session batch's", self.mode)
        self.assertIn("preparation predicate", self.mode)
        self.assertNotIn("Under the acquired lock, right after lock acquisition, this skill invokes", activation)

    def test_policy_is_approved_alternative_not_a_session_forgery(self):
        self.assert_terms(self.policy, "autorización humana por issue", "base Git exacta",
                          "archivos exactos", "Cimientos y Recursos", "cada Sesión activa",
                          "Ausencia, alcance desconocido, colisión o deriva",
                          "no se inventa Sesión LISTO", "no prueba que se haya lanzado")
        self.assertEqual(self.policy.count("schema: delivery-policy"), 1)
        self.assertNotIn("issue_patch:", self.policy)

    def test_missing_or_unknown_authority_and_scope_refuse_before_launch(self):
        self.assert_terms(self.mode, "human-authorized repair", "one Control Tower issue",
                          "exact Git base commit", "restoring outcome", "issue-resolver",
                          "explicitly empty if none", "not a directory, glob, symlink, or escape",
                          "unknown or missing scope", "not an empty set",
                          "new product outcome, API, permissions, migration or data changes",
                          "ask for new exact human authorization")
        self.assert_terms(self.handoff, "Human approval", "reproduced symptom",
                          "Exact authorized repository files", "Exact Cimientos", "Exact Recursos",
                          "Do not fill unknown values by inference")

    def test_current_active_sessions_are_compared_against_same_base_and_live_work(self):
        self.assert_terms(self.mode, "current integrated local/remote master commit",
                          "every active Session", "exact files, Cimientos, and Recursos",
                          "live assignments, pending delivery, in-flight interventions",
                          "worker unintegrated changes", "same verified base",
                          "exact file intersections", "Recurso intersections",
                          "a collision refuses the patch, not the Session",
                          "recheck base, active sets", "before its first write",
                          "after any scope/base change")
        self.assertNotIn("issue-resolver", self.routing)
        self.assertNotIn("Issue-Patch", self.routing)
        self.assertNotIn("chanks-3-despacho-herdr", self.routing)

    def test_launched_pi_identity_precedes_send_and_tab_is_not_session_id(self):
        self.assertLess(self.mode.index("Launch a new Pi agent"),
                        self.mode.index("Herdr JSON must identify"))
        self.assertLess(self.mode.index("actual launched agent"),
                        self.mode.index("Before any Intercom `send`"))
        self.assertLess(self.mode.index("fresh Intercom live roster"),
                        self.mode.index("Send the exact"))
        self.assert_terms(self.mode, "actual Pi session ID", "alias, tab, cwd/worktree and branch",
                          "never predict the ID", "substitute tab name/alias",
                          "If identity is unavailable or mismatched, do not send")
        self.assert_terms(self.handoff, "from Herdr JSON, verified by Intercom roster",
                          "message template, not approval")

    def test_delivery_uncertainty_and_drift_preserve_evidence_without_retry(self):
        self.assert_terms(self.mode, "master has advanced", "before first send",
                          "ambiguous or failed send preserves branch, worktree, agent, and candidate",
                          "never resend", "no patch `radar.despacho/v1` marker",
                          "disconnect", "no fallback route")
        self.assert_terms(self.router, "uncertain result", "preserves the candidate",
                          "not after worker completion")
        self.assert_terms(self.handoff, "delivery receipt is not completion",
                          "without retry")

    def test_terminal_integration_and_retirement_use_commit_worker_branch(self):
        self.assert_terms(self.mode, "freshly verified actual Pi sender",
                          "immutable full commit OID", "exact worker branch",
                          "approved changed files", "successful focused checks",
                          "master has advanced", "fresh human approval of the new base",
                          "branch tip equals that full OID", "preserves that exact commit OID")
        self.assert_terms(self.retire_mode, "original actual launched Pi session ID",
                          "refs/heads/work/issue-<number>", "ancestor of integrated master",
                          "not merely a matching diff", "git status --porcelain",
                          "git cherry master work/issue-<number>", "no `+` lines",
                          "before the first worker mutation", "no pending delivery",
                          "branch tip is still that exact OID", "not merely a matching diff", 
                          "close the exact agent", "fresh Git/Herdr readback",
                          "never require Radar `COMPLETO`")

    def test_closure_has_no_session_progress_and_keeps_install_gate(self):
        self.assert_terms(self.closure, "Issue-Patch Closure", "exact human approval",
                          "ancestor of integrated master", "delivered paths",
                          "missing required human confirmation", "named tests", "nada que registrar",
                          "never add a patch Session", "radar archivar",
                          "return issue closure evidence separately")
        self.assert_terms(self.router, "never changes Radar Session progress",
                          "nada que registrar", "No review outcome grants delivery")

    def test_session_contract_remains_session_only(self):
        self.assertNotIn("SESSION-ADMISSION-CONTRACT", self.routing)
        contract = read(ROOT / "skills/chanks-3-session-kickoff/references/admission-contract.md")
        self.assertIn('"route": "chanks-3-session-kickoff"', contract)
        self.assertIn('"start": {"states": ["LISTO"]}', contract)
        self.assertIn('`radar.despacho/v1` marker', self.dispatch)
        self.assertIn('`issue-resolver` only handles a human-selected Session', self.dispatch)
        self.assertIn("## Six checks", self.retire)
        self.assertIn("`radar status` computes the Sesión", self.retire)
        self.assertNotIn("radar.despacho/v1 patch marker", self.mode)
        self.assert_terms(self.mode, "session-only execution steps", "unchanged")


if __name__ == "__main__":
    unittest.main()
