import importlib.util
from pathlib import Path
import re
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


def section(source, heading):
    start = source.index(f"{heading}\n")
    end = source.find("\n## ", start + len(heading))
    return source[start:] if end == -1 else source[start:end]


def assert_in_order(case, source, *clauses):
    positions = [source.index(clause) for clause in clauses]
    case.assertEqual(positions, sorted(positions), clauses)


def assert_no_contradictory_clause(case, source, *patterns):
    for pattern in patterns:
        case.assertIsNone(re.search(pattern, source, re.IGNORECASE | re.MULTILINE), pattern)


class DespachoHerdrDispatchTests(unittest.TestCase):
    def setUp(self):
        self.skill = read(f"skills/{SKILL_NAME}/SKILL.md")
        self.text = self.skill.lower()
        self.normalized = " ".join(self.text.split())

    def assert_phrases(self, *phrases):
        for phrase in phrases:
            self.assertIn(" ".join(phrase.lower().split()), self.normalized, phrase)

    def test_skill_is_registered_listed_and_well_formed(self):
        self.assertIn(SKILL_NAME, INSTALLER.CHANKS_SKILLS)
        self.assertTrue(self.skill.startswith(f"---\nname: {SKILL_NAME}\n"))
        for section in SECTIONS:
            self.assertIn(section, self.skill)
        self.assertIn(f"`{SKILL_NAME}`", read("README.md"))

    def test_dispatch_acts_only_on_the_human_list_of_ready_sesiones(self):
        self.assert_phrases("explicit complete list", "agent kind", "`radar status`", "`radar sesion <ID>`", "LISTO", "create nothing")

    def test_shared_cimientos_or_recursos_are_never_dispatched_in_parallel(self):
        self.assert_phrases("Cimiento or Recurso conflict")

    def test_persistent_declared_pool_replaces_ephemeral_session_worktrees(self):
        self.assert_phrases(
            "complete reusable worker-pool declaration from repository `AGENTS.md`",
            "missing or incomplete declaration fails closed",
            "never falls back to ephemeral per-Session worktrees",
            "no hardcoded package manager, worker count, or worker names",
            "declared worker's worktree, tab, and dependencies persist",
        )
        combined = self.skill + read(f"skills/{SKILL_NAME}/references/retiro.md")
        for forbidden in ("git worktree add", "git worktree remove", "create `Worktrees/<id>`"):
            self.assertNotIn(forbidden, combined, forbidden)

    def test_control_tower_pool_declaration_is_complete_and_local(self):
        pool = section((ROOT.parent / "AGENTS.md").read_text(encoding="utf-8"), "## Operación local: pool manual, fricciones y herramientas")
        expected_workers = ("issue-resolver", "implementer-1", "implementer-2", "implementer-3")
        for worker in expected_workers:
            self.assertIn(f"`{worker}`", pool)
            self.assertIn(f"`../Worktrees/{worker}`", pool)
        self.assertIn("identificador de tab Herdr de cada worker es exactamente su ID de worker", pool)
        self.assertIn("`issue-resolver`", pool)
        self.assertIn("respaldada por un issue de Control Tower", pool)
        self.assertEqual(pool.count("admisible por Radar y compatible con el trabajo concurrente"), 4)
        self.assertIn("topología elegida para este flujo manual, no un límite universal", " ".join(pool.split()))
        self.assertIn("`bun install --frozen-lockfile`", pool)
        self.assertIn("sólo si faltan dependencias o cambió `bun.lock`", " ".join(pool.split()))

    def test_shared_lock_protocol_is_persistent_flock_fenced_and_inode_bound(self):
        retire = read(f"skills/{SKILL_NAME}/references/retiro.md")
        protocol = section(retire, "## Shared lock protocol")
        activation = section(self.skill, "## Activation Contract")
        execution = section(self.skill, "## Execution Steps")
        for source in (activation, execution, retire):
            self.assertIn("`references/retiro.md`'s `## Shared lock protocol`", source)
        for phrase in (
            "`git rev-parse --path-format=absolute --git-common-dir`",
            "`$common_dir/gentle-ai.chanks-3-despacho-herdr.lock`",
            "persistent synchronization directory",
            "never removed during normal release or recovery",
            "Linux/local coherent advisory `flock` semantics",
            "fail closed",
            "directory/no-follow semantics",
            "`flock(LOCK_EX|LOCK_NB)`",
            "whole protocol",
            "canonical pathname and `(st_dev, st_ino)`",
            "fresh cryptographically unguessable owner token",
            "parent identity and run ID",
            "regular file, owner, mode `0600`, and one link",
            "fsync the file and lock directory",
            "complete `HELD` record",
            "complete `RELEASED` record",
            "Never unlink `owner-token` or remove `$lock_dir`",
        ):
            self.assertIn(phrase, protocol)
        assert_in_order(
            self,
            protocol,
            "Resolve the canonical absolute common directory",
            "prove Linux/local coherent advisory `flock` semantics",
            "Create `$lock_dir` only once by atomic",
            "Open the canonical `$lock_dir`",
            "Acquire and retain `flock(LOCK_EX|LOCK_NB)`",
            "Release while still holding the flock",
        )
        self.assertNotIn("prove the lock directory is empty", protocol)
        self.assertNotIn("remove only that owned `owner-token`", protocol)
        self.assertNotIn("remove only the empty `$lock_dir`", protocol)

    def test_stale_lock_recovery_is_authorized_flock_bound_and_preserves_foreign_evidence(self):
        protocol = section(read(f"skills/{SKILL_NAME}/references/retiro.md"), "## Shared lock protocol")
        dispatch = section(self.skill, "## Execution Steps")
        for phrase in (
            "fresh maintainer authorization bound to `$lock_dir`, its `(st_dev, st_ino)`, and the exact raw `HELD` record",
            "exact owner process is absent or replaced",
            "every declared worker is quiescent: no active agent, dirty tree, pending delivery, or identity divergence",
            "replace that record with a new complete `HELD` record",
            "`EMPTY` marker for absence",
            "SHA-256 of the exact raw bytes for a readable malformed or interrupted record",
            "Live, ambiguous, mismatched, or replaced-inode owner is never reclaimed",
            "A second reclaimer that cannot acquire the flock mutates nothing",
            "reread the pathname, `(st_dev, st_ino)`, owner record, and every authorization-bound fact before any mutation",
            "No rename quarantine is used",
            "Old quarantine evidence is foreign evidence",
            "separately authorized by its exact path and `(st_dev, st_ino)`",
        ):
            self.assertIn(phrase, protocol)
        self.assertIn("including its bounded stale-lock recovery", dispatch)
        for phrase in (
            "explicit `UNREADABLE` sentinel",
            "file dev/inode, owner, mode, link count, size, timestamps",
            "available without content",
            "re-read and re-stat all bound metadata under the flock immediately before atomic replacement",
            "Any drift fails closed",
        ):
            self.assertIn(phrase, protocol)
        assert_in_order(
            self,
            protocol,
            "`EMPTY` marker for absence",
            "SHA-256 of the exact raw bytes for a readable malformed or interrupted record",
            "explicit `UNREADABLE` sentinel",
            "re-read and re-stat all bound metadata under the flock immediately before atomic replacement",
        )
        assert_no_contradictory_clause(
            self, protocol,
            r"unreadable[^\n]{0,240}SHA-256",
            r"atomically renam(?:e|ing).*(?:lock_dir|quarantine)",
            r"uniquely named quarantine",
            r"normal atomic `mkdir -- \"\$lock_dir\"`",
            r"\bpid[- ]only\b",
            r"(?im)^(?![^\n]*\bnever\b)[^\n]*\bdelete\b[^\n]*\b(?:stale|lock)\b",
        )

    def test_lock_precedes_every_availability_assignment_or_retirement_decision(self):
        execution = section(self.skill, "## Execution Steps")
        assert_in_order(
            self,
            execution,
            "Acquire the lock exactly through `references/retiro.md`'s `## Shared lock protocol`",
            "collect Git, Radar, and fresh live Herdr readback",
            "validate and reserve the complete human-selected batch",
            "Create each reserved fresh `work/<id>` branch",
        )

    def test_batch_reservation_is_human_selected_complete_and_atomic(self):
        self.assert_phrases(
            "complete human-selected batch",
            "validate and reserve the complete",
            "every Session remains LISTO and compatible",
            "maps to a declared apt worker",
            "launch zero agents",
            "order cannot cause partial dispatch",
        )

    def test_worker_reuse_has_free_clean_identity_and_issue_guards(self):
        self.assert_phrases(
            "prove free, clean, and non-Main",
            "`issue-resolver` only handles a human-selected Session backed by a Control Tower issue",
            "active prior agent", "pending delivery", "identity mismatch",
            "fresh live Herdr readback",
        )

    def test_first_provisioning_is_declared_atomic_and_persistent(self):
        hard_rules = section(self.skill, "## Hard Rules")
        gates = section(self.skill, "## Decision Gates")
        execution = section(self.skill, "## Execution Steps")
        assert_no_contradictory_clause(
            self,
            hard_rules + gates,
            r"missing worktree[^\n]{0,160}(?:reject|fail|stop)",
        )
        for phrase in (
            "existing reusable worker",
            "declared, explicitly provisionable, not-yet-created worker",
            "exact worktree path and tab are both absent",
            "declaration authorizes first provisioning",
            "no branch, pending delivery, or conflicting identity exists",
            "never creates per-Session worktrees",
            "Provision its persistent worktree and tab once from the verified master",
            "run the declared preparation",
            "remains persistent",
            "Ordinary assignment rejects a missing previously provisioned worker",
        ):
            self.assertIn(phrase, hard_rules + gates + execution, phrase)
        assert_in_order(
            self,
            execution,
            "validate and reserve the complete human-selected batch",
            "Provision its persistent worktree and tab once from the verified master",
            "Create each reserved fresh `work/<id>` branch",
            "start a new Pi agent",
        )

    def test_launch_creates_only_fresh_branches_and_conditionally_prepares_workers(self):
        self.assert_phrases(
            "fresh `work/<id>` branch from verified master",
            "existing branch or ambiguous readback stops the complete batch without reset or force",
            "declared preparation only on provisioning or when the declared environment is missing or stale",
            "valid reassignment performs zero reinstall",
            "never copy or link dependencies across checkouts",
        )

    def test_failure_rollback_is_owned_and_ambiguous_rollback_keeps_the_lock(self):
        self.assert_phrases(
            "before the first handoff, preparation, branch, launch, batch-readback, or roster-validation failure closes only agents launched by this batch",
            "cleans only new branches",
            "preserve worker worktrees, tabs, and dependencies",
            "ambiguous rollback retains the lock and asks the human",
            "release only an owned lock",
        )

    def test_herdr_failures_fail_closed(self):
        self.assert_phrases("`HERDR_ENV=1`", "subagent flow", "owned rollback rule")

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

    def test_relevant_dispatch_sections_reject_semantic_contradictions(self):
        relevant = "\n".join(
            section(self.skill, heading)
            for heading in ("## Activation Contract", "## Hard Rules", "## Decision Gates", "## Execution Steps")
        )
        assert_no_contradictory_clause(
            self,
            relevant,
            r"\b(?:git\s+)?worktree\s+(?:add|remove|rm)\b",
            r"\b(?:close|destroy|delete|remove)\b(?:\s+(?:a|the|any|declared|persistent|Herdr)){0,5}\s+tab\b",
            r"\b(?:always|unconditionally)\s+(?:run|prepare|install)\b|\b(?:run|prepare|install)\b[^\n]{0,80}\b(?:for|on)\s+(?:every|each)\s+(?:assignment|dispatch|worker)\b",
            r"\b(?:git\s+reset\b|git\s+clean(?:\s+-\w+)*|rm\s+-rf|git\s+branch\s+-D|--force)\b",
            r"(?im)^(?![^\n]*\bnever\b)[^\n]*\bforce[- ]?(?:reset|delete|remove)\b",
            r"(?im)^(?![^\n]*(?:never|do not|without|no)\b)[^\n]*\b(?:launch|dispatch)\s+(?:the\s+)?(?:first|some|a\s+prefix)\b",
            r"\b(?:automatically|autonomously|the\s+(?:agent|runtime|system|tool))\s+(?:select|choose|assign|reorder|substitute)\b",
            r"(?im)^(?![^\n]*(?:never|do not|must not)\b)[^\n]*\b(?:load|invoke)\s+`?torre-control\b",
            r"(?im)^(?![^\n]*(?:never|do not|must not)\b)[^\n]*\b(?:read|write)\s+`?(?:\.git/control-tower/ACTIVE|~/.local/share/control-tower/)\b",
            r"\b(?:is|acts as|uses)\s+(?:a\s+)?Torre dispatch\b",
        )
        execution = section(self.skill, "## Execution Steps")
        assert_in_order(
            self,
            execution,
            "validate and reserve the complete human-selected batch",
            "Create each reserved fresh `work/<id>` branch",
            "Open or reuse only the declared worker's Herdr tab",
            "Read back every agent launched by this batch",
        )

    def test_batch_readback_and_roster_validation_precede_any_handoff(self):
        execution = section(self.skill, "## Execution Steps")
        assert_in_order(
            self,
            execution,
            "Read back every agent launched by this batch",
            "complete one fresh Intercom live-roster readback and identity validation for every worker in the batch",
            "Only after every worker passes, send the independent fire-and-forget handoffs",
        )
        self.assert_phrases(
            "After the first handoff is sent, never roll back, clean, reset, delete, or close any batch branch or agent",
            "partial first provisioning requires fresh maintainer authorization",
            "complete only the missing provisioning or preparation",
            "never remove a persistent worker or infer readiness",
        )

    def test_execution_sends_independent_handoffs_before_terminal_events(self):
        execution = self.skill.split("## Execution Steps", 1)[1].split("## Output Contract", 1)[0]
        self.assertLess(
            execution.index("complete one fresh Intercom live-roster readback and identity validation for every worker in the batch"),
            execution.index("Only after every worker passes, send the independent fire-and-forget handoffs"),
        )
        self.assertLess(
            execution.index("Main sends worker 2 without waiting for worker 1"),
            execution.index("Workers send progress to Main through Intercom"),
        )

    def test_output_reports_roster_and_delivery_per_exact_session_worker_handoff(self):
        self.assertIn(
            "one fresh complete-batch Intercom live-roster readback and one Intercom delivery result per exact Sesión/worker handoff",
            " ".join(self.skill.split()),
        )

    def test_acceptance_edge_cases_preserve_candidate_identity_and_threading(self):
        self.assert_phrases(
            "preserves the worktree and candidate as `BLOCKED`",
            "does not guess the answer or report completion",
            "complete one fresh Intercom live-roster readback and identity validation for every worker in the batch",
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

    def test_retire_requires_six_ordered_checks_before_the_first_worker_mutation(self):
        checks = section(self.retire, "## Six checks")
        order = section(self.retire, "## Order")
        self.assertEqual(len(re.findall(r"^\d+\. ", checks, re.MULTILINE)), 6)
        assert_in_order(
            self,
            checks,
            "`radar status` computes",
            "`entrega.commit` is an ancestor of master",
            "`git status --porcelain`",
            "`git cherry master work/<id>`",
            "The agent for this Sesión",
            "Git and fresh live Herdr readback prove",
        )
        assert_in_order(
            self,
            order,
            "run all six checks before the first worker mutation",
            "Only after all six pass, close only the completed agent",
            "Only after that close succeeds, leave the worker detached",
            "Perform fresh Git, Radar, and Herdr free readback",
            "Release only through the `## Shared lock protocol`",
        )
        self.assertLess(self.retire.index("## Six checks"), self.retire.index("## Order"))

    def test_retirement_preserves_worker_state_and_reuses_the_shared_lock_protocol(self):
        self.assertIn("change no worker state", self.retire.lower())
        self.assertIn("`references/retiro.md`'s `## Shared lock protocol`", self.retire)
        for phrase in (
            "preserve its declared persistent tab, worktree, and dependencies",
            "never remove a declared pool worker",
            "never delete its reusable worker branch",
            "never infers reuse",
            "never force-deletes branches",
            "never touches another worker",
        ):
            self.assertIn(phrase, self.retire.lower(), phrase)

    def test_retirement_sections_reject_destructive_or_out_of_order_contradictions(self):
        relevant = "\n".join((section(self.retire, "## Six checks"), section(self.retire, "## Order")))
        assert_no_contradictory_clause(
            self,
            relevant,
            r"\b(?:git\s+)?worktree\s+(?:add|remove|rm)\b",
            r"\bgit\s+branch\s+(?:-d|-D)\b",
            r"\b(?:destroy|delete|remove)\s+(?:the\s+)?(?:declared|persistent)\s+(?:Herdr\s+)?tab\b",
            r"\b(?:git\s+reset\s+--hard|git\s+clean(?:\s+-\w+)*|rm\s+-rf|--force)\b",
            r"\b(?:close|detach)\b[^\n]{0,100}\bbefore\b[^\n]{0,100}\b(?:six|checks)\b",
            r"\b(?:automatically|autonomously)\s+(?:select|choose|assign|reorder|substitute)\b",
            r"\b(?:load|invoke)\s+`?torre-control\b",
        )

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
