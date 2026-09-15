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

    def test_pre_v1_dispatch_is_pi_only_before_creating_anything(self):
        self.assert_phrases(
            "manual pre-V1 dispatch accepts Pi workers only",
            "reject a non-Pi agent kind before creating anything",
            "never substitute the approved runtime",
        )

    def test_herdr_owns_topology_while_intercom_delivers_nonblocking_handoffs(self):
        self.assert_phrases(
            "Herdr owns only the authorized seats and process topology",
            "Pi Intercom is only the message transport",
            "Intercom `send`",
            "Main returns after the delivery result",
        )
        self.assert_phrases("Main performs no ordinary `herdr agent wait`, `prompt --wait`, poll, or `intercom ask`")
        self.assertNotIn("Wait on each agent's state", self.skill)

    def test_workers_report_progress_and_terminal_events_to_main(self):
        self.assert_phrases(
            "workers send progress to Main through Intercom",
            "COMPLETED", "BLOCKED", "FAILED",
            "blocking request initiated by the worker",
            "never answer a blocked agent's question for the human",
        )

    def test_intercom_identity_and_authority_fail_closed(self):
        self.assert_phrases(
            "missing, ambiguous, disconnected, or mismatched Intercom identity",
            "fail closed before declaring the Sesión dispatched",
            "Intercom never grants selection, assignment, role, permission, review, or delivery authority",
        )

    def test_manual_dispatch_has_no_provisional_transport_runtime_or_state_bridge(self):
        self.assert_phrases(
            "no retries, persistent queue, roster, state, autonomous resume, non-Pi fallback, or provisional cross-runtime bridge",
            "Tower V1 remains the future heterogeneous and hybrid owner",
        )

    def test_worker_decision_timeout_stays_blocked_without_guessing_or_completion(self):
        self.assert_phrases(
            "ordinary Intercom `send` has no wait timeout",
            "worker-initiated human-decision `ask` timeout preserves the worktree and candidate as `BLOCKED`",
            "does not guess the answer or report completion",
        )

    def test_fresh_live_roster_readback_binds_identity_and_disconnect_requires_reapproval(self):
        self.assert_phrases(
            "one fresh Intercom live-roster readback",
            "exact human-approved alias, session, and cwd",
            "later disconnect creates no polling, retry, inferred completion, transport fallback, or autonomous resume",
            "human reactivation and reapproval are required",
        )

    def test_worker_events_are_threaded_and_main_replies_only_to_exact_decisions(self):
        self.assert_phrases(
            "every progress and terminal `send` identifies the exact Sesión and worker",
            "Main answers only an exact inbound human-decision request with `reply`",
            "never an unthreaded substitute or its own `ask`",
        )

    def test_transport_readback_is_not_authority_or_completion_evidence(self):
        self.assert_phrases(
            "Herdr JSON proves only seat and process identity",
            "Intercom delivery results prove only message delivery",
            "neither grants authority or proves work completion",
            "worker reports terminal result evidence",
        )

    def test_two_pi_workers_receive_independent_handoffs_without_main_waiting(self):
        self.assert_phrases(
            "two approved Pi workers receive independent fire-and-forget handoffs",
            "Main sends worker 2 without waiting for worker 1",
        )

    def test_incompatible_dispatch_clauses_are_forbidden(self):
        incompatible_clauses = (
            "Non-Pi workers may be dispatched",
            "Main may use `herdr agent wait`",
            "Main polls for worker status",
            "Main initiates `intercom ask`",
            "Intercom readback grants authority",
            "Intercom delivery results grant authority",
            "Retry the handoff",
            "Maintain persistent dispatch state",
            "A provisional cross-runtime bridge is allowed",
            "Main sends worker 2 after worker 1 completes",
        )
        for clause in incompatible_clauses:
            self.assertNotIn(clause, self.skill, clause)

    def test_execution_sends_independent_handoffs_before_terminal_events(self):
        execution = self.skill.split("## Execution Steps", 1)[1].split("## Output Contract", 1)[0]
        self.assertLess(
            execution.index("Before each handoff, Main uses one fresh Intercom live-roster readback"),
            execution.index("Two approved Pi workers receive independent fire-and-forget handoffs"),
        )
        self.assertLess(
            execution.index("Main sends worker 2 without waiting for worker 1"),
            execution.index("Workers send progress to Main through Intercom"),
        )

    def test_output_reports_roster_and_delivery_per_exact_session_worker_handoff(self):
        self.assertIn(
            "one fresh Intercom live-roster readback and one Intercom delivery result per exact Sesión/worker handoff",
            self.skill,
        )

    def test_acceptance_edge_cases_preserve_candidate_identity_and_threading(self):
        self.assert_phrases(
            "preserves the worktree and candidate as `BLOCKED`",
            "does not guess the answer or report completion",
            "before each handoff, Main uses one fresh Intercom live-roster readback",
            "exact human-approved alias, session, and cwd",
            "no polling, retry, inferred completion, transport fallback, or autonomous resume",
            "Main never initiates `ask`",
        )


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
                self.assertIn("Manual pre-V1 dispatch accepts Pi workers only", text, path)
                self.assertIn("Herdr owns only authorized seats and process topology", text, path)
                self.assertIn("Pi Intercom is message transport", text, path)
                self.assertIn("fire-and-forget `send`", text, path)
                self.assertIn("returns after one delivery result per exact Sesión/worker handoff", text, path)
                self.assertIn("Main performs no ordinary `herdr agent wait`, `prompt --wait`, poll, or `intercom ask`", text, path)
                self.assertIn("`COMPLETED`, `BLOCKED`, or `FAILED`", text, path)
                self.assertIn("worker-initiated blocking request", text, path)
                self.assertIn("fails closed before dispatch is declared", text, path)
                self.assertIn("provisional cross-runtime bridge", text, path)
                self.assertIn("the future tower V1 remains the heterogeneous and hybrid owner", text, path)
                self.assertIn("Ordinary Intercom `send` has no wait timeout", text, path)
                self.assertIn("worker-initiated human-decision `ask` timeout preserves the worktree and candidate as `BLOCKED`", text, path)
                self.assertIn("does not guess the answer or report completion", text, path)
                self.assertIn("Before each handoff, Main uses one fresh Intercom live-roster readback", text, path)
                self.assertEqual(text.count("one fresh Intercom live-roster readback"), 1, path)
                self.assertIn("exact human-approved alias, session, and cwd", text, path)
                self.assertIn("later disconnect creates no polling, retry, inferred completion, transport fallback, or", text, path)
                self.assertIn("human reactivation and reapproval are required", text, path)
                self.assertIn("Every progress and terminal `send` identifies the exact Sesión and worker", text, path)
                self.assertIn("Main answers only an exact inbound human-decision request with `reply`", text, path)
                self.assertIn("never an unthreaded substitute or its own `ask`", text, path)
                self.assertIn("Main never initiates `ask`", text, path)
                self.assertIn("Herdr JSON proves only seat and process identity", text, path)
                self.assertIn("Intercom delivery results prove only message delivery", text, path)
                self.assertIn("neither grants authority or proves work completion", text, path)
                self.assertIn("worker reports terminal result evidence", text, path)
                self.assertIn("Two approved Pi workers receive independent fire-and-forget handoffs", text, path)
                self.assertIn("Main sends worker 2 without waiting for worker 1", text, path)


if __name__ == "__main__":
    unittest.main()
