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
        self.assertIn(SKILL_NAME, INSTALLER.V3_DEFERRED_SKILLS)
        self.assertNotIn(SKILL_NAME, INSTALLER.SKILLS)
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
            "complete reusable worker-pool declaration before any pool operation",
            "`references/worker-pool.md` for Control Tower",
            "missing or incomplete declaration fails closed",
            "never falls back to ephemeral per-Session worktrees",
            "no hardcoded package manager, worker count, or worker names",
            "declared worker's worktree, tab, and dependencies persist",
        )
        combined = self.skill + read(f"skills/{SKILL_NAME}/references/retiro.md")
        for forbidden in ("git worktree add", "git worktree remove", "create `Worktrees/<id>`"):
            self.assertNotIn(forbidden, combined, forbidden)

    def test_control_tower_pool_declaration_is_complete_and_local(self):
        pool = read(f"skills/{SKILL_NAME}/references/worker-pool.md")
        expected_workers = ("issue-resolver", "implementer-1", "implementer-2", "implementer-3")
        for worker in expected_workers:
            self.assertIn(f"`{worker}`", pool)
            self.assertIn(f"`../Worktrees/{worker}`", pool)
        self.assertIn("identificador de tab Herdr de cada worker es exactamente su ID de worker", pool)
        self.assertIn("`issue-resolver`", pool)
        self.assertIn("respaldada por un issue de Control Tower", pool)
        self.assertEqual(pool.count("admisible por Radar y compatible con el trabajo concurrente"), 3)
        self.assertIn("parche de error de flujo ya aprobado", pool)
        self.assertIn("sin Sesión de producto", pool)
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
        self.assert_phrases("`HERDR_ENV=1`", "stop; offer `chanks-3-paralelo`", "owned rollback rule")

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
            "actual Pi session ID, human-approved alias, declared tab and cwd/worktree against the live roster",
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
            "validate and reserve the complete human-selected batch",
            "start a new Pi agent named after the Session",
            "record the tab, agent and actual Pi session ID from Herdr JSON",
            "Read back every agent launched by this batch",
            "complete one fresh Intercom live-roster readback and identity validation for every worker in the batch",
            "matching the actual Herdr Pi session ID to the live roster's session ID",
            "Only after every worker passes, send the independent fire-and-forget handoffs",
        )
        self.assert_phrases(
            "Human approval binds each exact LISTO Sesión ID, Pi worker alias, cwd/worktree, runtime, and kind, not a Pi session ID",
            "Never predict or pre-approve a Pi session ID",
            "Never substitute an alias or tab for a missing Pi session ID",
            "Any failed or ambiguous batch readback or identity sends nothing and uses the pre-send owned rollback rule",
            "After the first handoff is sent, never roll back, clean, reset, delete, or close any batch branch or agent",
            "partial first provisioning requires fresh maintainer authorization",
            "complete only the missing provisioning or preparation",
            "never remove a persistent worker or infer readiness",
        )
        self.assertNotIn("human-approved alias, session, and cwd", self.skill)

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
            "actual Herdr Pi session ID to the live roster's session ID",
            "no polling, retry, inferred completion, transport fallback, or autonomous resume",
            "Main never initiates `ask`",
        )


    def test_stage3_jornada_invocation_runs_under_lock_before_fetch_confirm(self):
        # R3-ejecutar-mutation-outside-lock: jornada.sh --ejecutar mutates worktrees, so it must
        # run under the acquired dispatch lock -- right after lock acquisition and before the
        # step that fetches and confirms local master equals remote master.
        execution = section(self.skill, "## Execution Steps")
        assert_in_order(
            self,
            execution,
            "Acquire the lock exactly through `references/retiro.md`'s `## Shared lock protocol`",
            "invoke `chanks-0-jornada` in its stage-3 dispatch entry mode",
            "fetch and confirm local master equals remote master",
        )
        self.assert_phrases(
            "under the acquired lock",
            "right after lock acquisition",
            "invoked under the dispatch lock, never before it is acquired",
            "diagnosis plus `jornada.sh --ejecutar` only, never `--reciclar`",
        )
        self.assertNotIn("before selecting or locking any worker, invoke", self.skill)

    def test_stage3_jornada_brings_clean_behind_seats_current_without_reimplementing(self):
        self.assert_phrases(
            "clean-but-behind declared seat is now current, brought up from verified master",
            "this dispatch still creates each reserved `work/<id>` branch itself",
        )

    def test_stage3_jornada_dirty_or_ocupado_seat_stops_the_whole_batch(self):
        # R3-batch-exclusion-contradicts-atomic-batch: this no longer excludes the seat and
        # continues with the rest -- that contradicted "dispatch only the human's explicit
        # complete list" and "do not dispatch a prefix of the batch". The whole batch now
        # waits on the human's single decision; dispatch only ever releases its own lock.
        gates = section(self.skill, "## Decision Gates")
        self.assertIn(
            "| `chanks-0-jornada`'s stage-3 dispatch entry reports a dirty or OCUPADO seat "
            "| Report its evidence; ask exactly one decision (deliver, save, or discard); "
            "until the human decides, the whole batch does not proceed — release only the "
            "owned lock and launch nothing; never clean, stash, or reset it automatically. "
            "The human may instead give a new explicit complete list without that seat, "
            "which is a fresh dispatch request. |",
            gates,
        )
        self.assert_phrases(
            "until the human decides, the whole batch does not proceed",
            "releases only its owned lock and launches nothing",
            "dispatch never drops a seat on its own",
            "a fresh dispatch request",
            "never cleaned, stashed, or reset automatically",
        )
        for phrase in (
            "excluded from this batch while other seats continue",
            "exclude that seat from this batch until answered while other seats continue",
        ):
            self.assertNotIn(phrase, self.skill)

    def test_stage3_jornada_missing_seat_keeps_existing_provisioning_path(self):
        self.assert_phrases("a missing seat keeps the existing provisioning path")

    def test_activation_contract_and_hard_rule_describe_the_same_under_lock_order(self):
        activation = section(self.skill, "## Activation Contract")
        hard_rules = section(self.skill, "## Hard Rules")
        for source in (activation, hard_rules):
            self.assertIn("invoked under the dispatch lock, never before it is acquired", source)
        self.assertNotIn("before selecting or locking any worker, this skill invokes", self.skill.lower())
        self.assertNotIn("before selecting or locking workers, invoke", self.skill.lower())

    def test_stage3_jornada_failure_gate_releases_only_the_owned_lock(self):
        # R3-ejecutar-mutation-outside-lock: jornada now runs under the lock, so a jornada stop
        # releases that owned lock instead of stopping "before" it. R3-partial-failure-signal-
        # undefined: the gate points at chanks-0-jornada's concrete FALLO/CONFLICTO/ABORTADO
        # marker definition instead of restating a vaguer "partial failure".
        gates = section(self.skill, "## Decision Gates")
        self.assertIn(
            "| `jornada.sh` is missing at the target repository root, exits non-zero, or "
            "its `--ejecutar` output reports a partial failure (`chanks-0-jornada`'s "
            "failure-signal definition: a line with `FALLO`, `CONFLICTO`, or `ABORTADO`, or "
            "a non-zero exit) | Release only the owned lock and launch nothing; report the "
            "exact output; ask the human; never retry or work around it. |",
            gates,
        )
        self.assert_phrases(
            "does not proceed to the next step on unverified state",
            "failure-signal definition",
        )
        self.assertNotIn("Stop before the lock-held readback", self.skill)


class AttendedReactivationContractTests(unittest.TestCase):
    def setUp(self):
        self.dispatch = read(f"skills/{SKILL_NAME}/SKILL.md")
        self.handoff = read(f"skills/{SKILL_NAME}/assets/issue-patch-handoff.md")

    def test_reactivation_is_separate_from_first_dispatch_and_issue_patch(self):
        route = section(self.dispatch, "## Attended Reactivation of an Existing Session Dispatch")
        self.assertLess(self.dispatch.index("## Issue-Patch Mode"),
                        self.dispatch.index("## Attended Reactivation of an Existing Session Dispatch"))
        for phrase in ("EN CURSO", "existing `radar.despacho/v1` marker",
                       "same Session", "same worker", "same branch", "same worktree",
                       "same candidate", "not Issue-Patch Mode", "not first dispatch"):
            self.assertIn(phrase, route)
        for forbidden in ("create a new marker", "create a new branch", "clean the candidate"):
            self.assertNotIn(forbidden, route)

    def test_exact_reapproval_and_shared_lock_precede_launch(self):
        route = section(self.dispatch, "## Attended Reactivation of an Existing Session Dispatch")
        for phrase in ("fresh exact human approval", "approved integrated base",
                       "`references/retiro.md`'s `## Shared lock protocol`",
                       "Git", "Radar", "Herdr", "Intercom", "marker identity",
                       "original Pi process", "absent", "pending delivery"):
            self.assertIn(phrase, route)
        assert_in_order(self, route,
                        "fresh exact human approval",
                        "`references/retiro.md`'s `## Shared lock protocol`",
                        "reconcile fresh Git, Radar, Herdr, and Intercom",
                        "launch a new Pi process")
        self.assertIn("missing, contradictory, foreign, or ambiguous", " ".join(route.lower().split()))

    def test_verified_new_session_precedes_distinct_fire_and_forget_handoff(self):
        route = section(self.dispatch, "## Attended Reactivation of an Existing Session Dispatch")
        assert_in_order(self, route, "launch a new Pi process",
                        "actual new Pi session ID from Herdr JSON",
                        "fresh Intercom live roster",
                        "distinguishable reactivation handoff")
        for phrase in ("fire-and-forget", "never resend", "infer completion",
                       "preserve marker, branch, worktree, candidate", "pre-send owned rollback"):
            self.assertIn(phrase, route)
        self.assertIn("no unattended seal", route)
        self.assertIn("valid exact seal", route)

    def test_issue_patch_handoff_distinguishes_unit_one_and_without_seal(self):
        for phrase in ("Unit 1", "attended reactivation", "without a seal",
                       "not a Session reactivation approval", "no new marker"):
            self.assertIn(phrase, self.handoff)


class AttendedIssuePatchContinuationTests(unittest.TestCase):
    HEADING = "## Attended Continuation of an Existing Issue Patch"

    def setUp(self):
        self.dispatch = read(f"skills/{SKILL_NAME}/SKILL.md")
        self.handoff = read(f"skills/{SKILL_NAME}/assets/issue-patch-handoff.md")
        self.route = section(self.dispatch, self.HEADING)
        self.flat = " ".join(self.route.split())

    def test_section_exists_and_is_distinct_from_the_other_routes(self):
        self.assertLess(self.dispatch.index("## Issue-Patch Mode"), self.dispatch.index(self.HEADING))
        for phrase in ("not first dispatch", "not Session reactivation", "not autonomous recovery",
                       "same Control Tower issue", "still open", "same `issue-resolver` worker",
                       "existing `work/issue-<number>` branch", "persistent worktree",
                       "current candidate"):
            self.assertIn(phrase, self.flat)
        activation = section(self.dispatch, "## Activation Contract")
        self.assertIn("attended continuation of an existing issue patch", activation)

    def test_requires_fresh_exact_approval_bound_to_the_patch_identity(self):
        for phrase in ("fresh exact human approval", "attended issue-patch continuation",
                       "issue number", "full branch ref", "current tip OID",
                       "approved base commit", "restoring outcome", "unit or scope being continued",
                       "exact file set", "Cimientos", "Recursos", "explicitly empty",
                       "requires no seal", "a seal never authorizes it",
                       "transport receipt"):
            self.assertIn(phrase, self.flat)

    def test_reconciles_under_the_shared_lock_before_any_launch(self):
        for phrase in ("`references/retiro.md`'s `## Shared lock protocol`",
                       "descends from the approved base",
                       "exactly equals the recorded candidate",
                       "previous Pi process absent", "declared tab free", "no foreign occupant",
                       "no pending delivery", "unintegrated terminal claim",
                       "every active Session"):
            self.assertIn(phrase, self.flat)
        assert_in_order(self, self.flat,
                        "fresh exact human approval",
                        "`references/retiro.md`'s `## Shared lock protocol`",
                        "previous Pi process absent",
                        "launch a new Pi")

    def test_branch_and_worktree_are_preserved(self):
        for verb in ("create", "delete", "rename", "recreate", "reset", "amend", "clean", "stash"):
            self.assertIn(verb, self.flat)
        self.assertIn("Never create, delete, rename, recreate, reset, or amend the branch", self.flat)
        self.assertIn("never clean or stash the worktree", self.flat)
        self.assertIn("never rescue or reuse the previous Pi session ID", self.flat)

    def test_base_advance_is_fast_forward_only_for_zero_own_commit_branches(self):
        for phrase in ("name the new base explicitly", "zero commits of its own",
                       "fast-forward only", "git merge --ff-only <new base>",
                       "Never reset, rebase, or rewrite", "human decision"):
            self.assertIn(phrase, self.flat)

    def test_new_pi_identity_is_read_and_matched_before_one_handoff(self):
        assert_in_order(self, self.flat, "launch a new Pi", "actual new Pi session ID from Herdr JSON",
                        "fresh Intercom live roster", "`ISSUE-PATCH CONTINUATION HANDOFF`")
        for phrase in ("never predict", "pre-send owned rollback", "provably newly launched",
                       "fire-and-forget", "once", "proves only transport",
                       "never resend, retry, infer completion, or auto-resume",
                       "assets/issue-patch-handoff.md"):
            self.assertIn(phrase, self.flat)

    def test_worker_revalidates_and_no_plan_artifacts_are_created(self):
        for phrase in ("revalidates", "before its first write", "step 5 of Issue-Patch Mode",
                       "step 6", "`chanks-3-coordinador-manual`",
                       "No `radar.despacho/v1` marker", "fake `LISTO`", "queue", "ledger",
                       "plan entry",
                       "changes no Session rule, first-dispatch rule, or Session reactivation rule"):
            self.assertIn(phrase, self.flat)

    def test_handoff_asset_defines_the_continuation_heading_and_fields(self):
        self.assertIn("ISSUE-PATCH CONTINUATION HANDOFF", self.handoff)
        continuation = self.handoff.split("ISSUE-PATCH CONTINUATION HANDOFF", 1)[1]
        for phrase in ("Previous Pi session ID", "Actual new Pi session ID", "Current branch tip",
                       "attended", "no seal", "Approved unit", "Approved integrated base",
                       "`refs/heads/work/issue-<number>`", "Never resend"):
            self.assertIn(phrase, continuation)
        self.assertIn("Fresh issue branch", self.handoff.split("ISSUE-PATCH CONTINUATION HANDOFF", 1)[0])

    def test_other_routes_point_to_the_continuation_instead_of_no_route(self):
        reactivation = section(self.dispatch, "## Attended Reactivation of an Existing Session Dispatch")
        self.assertIn("Attended Continuation of an Existing Issue Patch", reactivation)
        issue_patch = section(self.dispatch, "## Issue-Patch Mode (not Session dispatch)")
        flat = " ".join(issue_patch.split())
        self.assertIn("no fallback route exists except a fresh human-approved Attended Continuation", flat)
        self.assertGreaterEqual(flat.count("Attended Continuation of an Existing Issue Patch"), 2)
        self.assertIn("collision or ambiguous branch ownership stops without reset or reuse", flat)
        self.assertIn("no automatic reuse", flat)


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
    def test_installed_routing_does_not_route_to_dispatch_or_retirement(self):
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
                for skill in (SKILL_NAME, "chanks-3-coordinador-manual"):
                    self.assertNotIn(skill, text, path)
                for mechanic in ("Torre", "fire-and-forget", "intercom ask", "retire mode", "may load"):
                    self.assertNotIn(mechanic, text, path)
                self.assertIn("Herdr dispatch, Pi Intercom and sealed unattended execution are V2", text, path)


V2_SKILLS = (
    "chanks-3-despacho-herdr",
    "chanks-3-coordinador-manual",
    "chanks-4-unattended-implementation",
    "chanks-0-jornada",
)


def compact(source):
    return " ".join(source.split())


class V2SkillsAreExplicitOnlyTests(unittest.TestCase):
    def test_each_v2_skill_declares_v2_and_is_not_model_invoked(self):
        for name in V2_SKILLS:
            with self.subTest(skill=name):
                text = read(f"skills/{name}/SKILL.md")
                lines = text.splitlines()
                self.assertEqual(lines[0], "---")
                self.assertEqual(lines[1], f"name: {name}")
                self.assertTrue(lines[2].startswith('description: "Trigger:'), lines[2])
                self.assertIn("V2", lines[2])
                self.assertIn("explicitly", lines[2])
                header = text.split("\n---\n", 1)[0]
                self.assertIn("disable-model-invocation: true", header)
                body = text.split("\n---\n", 1)[1]
                status = compact(section(body, "## Activation Contract"))
                self.assertIn("V2 only", status)
                self.assertIn("`chanks-3-paralelo`", status)
                self.assertIn("overrides Gentle AI", status)

    def test_v2_metadata_and_activation_follow_the_skill_style_contract(self):
        for name in V2_SKILLS:
            text = read(f"skills/{name}/SKILL.md")
            description = text.splitlines()[2].removeprefix('description: "').removesuffix('"')
            body = text.split("\n---\n", 1)[1]
            with self.subTest(skill=name, field="description"):
                self.assertLessEqual(len(description), 250)
            with self.subTest(skill=name, field="activation"):
                self.assertEqual(re.findall(r"^## .+$", body, re.MULTILINE)[0],
                                 "## Activation Contract")
                self.assertNotIn("## V2 status", body)

    def test_dispatch_falls_back_to_the_parallel_skill_not_a_missing_flow(self):
        skill = read(f"skills/{SKILL_NAME}/SKILL.md")
        self.assertNotIn("subagent flow", skill)
        self.assertGreaterEqual(skill.count("`chanks-3-paralelo`"), 3)
        self.assertEqual(skill.count("Stop; offer `chanks-3-paralelo`"), 1)
        self.assertEqual(skill.count("Stop and offer `chanks-3-paralelo`"), 1)


class DispatchProtocolIsSelfContainedTests(unittest.TestCase):
    """The rules that used to live in the always-loaded block now live in the V2 skills."""

    def setUp(self):
        self.dispatch = compact(read(f"skills/{SKILL_NAME}/SKILL.md"))
        self.coordinator = compact(read("skills/chanks-3-coordinador-manual/SKILL.md"))
        self.protocol = compact(read(f"skills/{SKILL_NAME}/references/dispatch-protocol.md"))

    def test_rules_stated_in_the_dispatch_skill(self):
        for phrase in (
            "explicit Herdr requests with the Torre off, not Torre dispatch",
            "Manual pre-V1 dispatch accepts Pi workers only",
            "Herdr owns only the authorized seats and process topology",
            "Pi Intercom is only the message transport",
            "fire-and-forget",
            "Main performs no ordinary `herdr agent wait`, `prompt --wait`, poll, or `intercom ask`",
            "terminal `COMPLETED`, `BLOCKED`, or `FAILED` events",
            "blocking request initiated by the worker",
            "fail closed before declaring the Sesión dispatched",
            "No retries, persistent queue, roster, state, autonomous resume, non-Pi fallback, or provisional cross-runtime bridge",
            "Tower V1 remains the future heterogeneous and hybrid owner",
            "Ordinary Intercom `send` has no wait timeout",
            "worker-initiated human-decision `ask` timeout preserves the worktree and candidate as `BLOCKED`",
            "Main does not guess the answer or report completion",
            "one fresh Intercom live-roster readback",
            "Never predict or pre-approve a Pi session ID",
            "any failure uses the pre-send owned rollback rule",
            "A later disconnect creates no polling, retry, inferred completion, transport fallback, or autonomous resume",
            "Human reactivation and reapproval are required",
            "Every progress and terminal `send` identifies the exact Sesión and worker",
            "Main answers only an exact inbound human-decision request with `reply`",
            "never an unthreaded substitute or its own `ask`",
            "Main never initiates `ask`",
            "Herdr JSON proves only seat and process identity",
            "Intercom delivery results prove only message delivery",
            "neither grants authority or proves work completion",
            "The worker reports terminal result evidence",
            "Two approved Pi workers receive independent fire-and-forget handoffs",
            "Main sends worker 2 without waiting for worker 1",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.dispatch)

    def test_rules_stated_in_the_coordinator_skill(self):
        for phrase in (
            "Manual pre-V1 batches are Pi-only",
            "fresh Intercom and Herdr readbacks must prove the sender matches the human-approved/dispatched exact alias and cwd/worktree, and the post-launch verified exact Pi session ID",
            "Git readback must prove the reported commit is the dispatched worktree candidate before integration",
            "Any missing, mismatched, or unavailable readback stops: no integration, retry, remapping, or inferred terminal",
            "Main returns after both delivery results",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.coordinator)

    def test_rules_that_were_missing_now_live_in_the_dispatch_protocol_reference(self):
        for phrase in (
            "returns after one delivery result per exact Sesión/worker handoff",
            "Radar compatible capacity is the parallel-safety verdict",
            "Forecasts reserve nothing live",
            "A declared Recurso requires confirmed exclusive or serial execution evidence before mutation",
            "release only actual resources demonstrably acquired",
            "Closure evidence returns to the responsible parent before retire mode",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.protocol)
        self.assertIn("references/dispatch-protocol.md", self.dispatch)


class WorkerHandoffAssetTests(unittest.TestCase):
    def setUp(self):
        self.handoff = compact(read(f"skills/{SKILL_NAME}/assets/worker-handoff.md"))

    def test_handoff_requires_review_ready_signal_and_preserves_the_seal(self):
        for phrase in (
            "`listo para revisión`", "all ODD tasks are checked", "full unattended seal",
            "expiry", "base", "permissions", "commit ceiling", "independent revalidation",
            "Session", "worker", "checks", "commits", "changed paths", "review outcomes",
            "stopped decisions", "budget",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.handoff)
        self.assertIn("neither signal nor report authorizes delivery", self.handoff.lower())

    def test_terminal_wake_report_is_unconditional_but_review_ready_is_not(self):
        self.assertIn("Only after all ODD tasks are checked, send", self.handoff)
        self.assertIn("For every sealed terminal outcome — COMPLETED, BLOCKED, or FAILED — send", self.handoff)
        self.assertIn("even when ODD tasks are unfinished", self.handoff)
        self.assertLess(self.handoff.index("`listo para revisión`"),
                        self.handoff.index("For every sealed terminal outcome"))

    def test_revalidation_tolerates_only_the_dispatch_markers_own_change(self):
        self.assertIn("tolerating only the dispatch marker's own `LISTO` to `EN CURSO` change", self.handoff)
        self.assertIn("chanks/despachos/<ID>.json", self.handoff)
        self.assertIn("or any other drift, grants nothing", self.handoff)

    def test_handoff_never_answers_gentle_ai_on_the_humans_behalf(self):
        self.assertNotIn("consent policy", self.handoff.lower())
        self.assertIn("consent envelope", self.handoff)
        self.assertIn("stops that Session", self.handoff)
        for gone in ("TDD", "Forward configured"):
            self.assertNotIn(gone, self.handoff)

    def test_v2_skills_point_at_the_handoff_asset(self):
        for name in (SKILL_NAME, "chanks-3-coordinador-manual", "chanks-4-unattended-implementation"):
            with self.subTest(skill=name):
                skill_path = ROOT / "skills" / name / "SKILL.md"
                links = re.findall(r"`([^`]+assets/worker-handoff\.md|assets/worker-handoff\.md)`",
                                   skill_path.read_text(encoding="utf-8"))
                self.assertTrue(links, f"{name} must link its own handoff directly")
                for link in links:
                    self.assertEqual((skill_path.parent / link).resolve(),
                                     (ROOT / "skills" / SKILL_NAME / "assets/worker-handoff.md").resolve())
                    self.assertTrue((skill_path.parent / link).is_file(), link)
        self.assertNotIn("assignment-implementation.md", read(f"skills/{SKILL_NAME}/SKILL.md"))
        self.assertNotIn("assignment-implementation.md",
                         read("skills/chanks-4-unattended-implementation/references/night-mode.md"))

    def test_night_mode_handoff_link_resolves_from_the_reference_directory(self):
        night = ROOT / "skills/chanks-4-unattended-implementation/references/night-mode.md"
        links = re.findall(r"`([^`]+assets/worker-handoff\.md)`", night.read_text(encoding="utf-8"))
        self.assertEqual(len(links), 1)
        self.assertEqual((night.parent / links[0]).resolve(),
                         (ROOT / "skills" / SKILL_NAME / "assets/worker-handoff.md").resolve())
        self.assertTrue((night.parent / links[0]).is_file())


class IssuePatchClosureReferenceTests(unittest.TestCase):
    def setUp(self):
        self.closure = compact(read(f"skills/{SKILL_NAME}/references/issue-patch-closure.md"))

    def test_closure_rules_live_in_the_dispatch_skill(self):
        for phrase in (
            "exact human approval (issue, base, outcome, worker, files, Cimientos, Recursos)",
            "reproduced symptom", "worker identity and terminal evidence",
            "full immutable commit, branch and serial integration evidence",
            "is an ancestor of integrated master",
            "verify changed files against approved scope",
            "Close the issue only against named tests that demonstrate the original symptom is repaired at the integrated immutable commit",
            "not on a promise, report or outbound send",
            "Missing evidence, conflict, identity drift or failed checks leave the patch open and preserve the worker",
            "declare «nada que registrar»",
            "call `radar archivar`",
            "Return issue closure evidence separately from Session `entrega.commit` delta",
            "Only then request patch retirement",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.closure)

    def test_dispatch_and_coordinator_point_at_the_closure_reference(self):
        self.assertIn("references/issue-patch-closure.md", read(f"skills/{SKILL_NAME}/SKILL.md"))
        coordinator = read("skills/chanks-3-coordinador-manual/SKILL.md")
        self.assertIn("references/issue-patch-closure.md", coordinator)
        self.assertNotIn("gathers patch closure through `chanks-5-session-doc`", compact(coordinator))


class WorkerPoolReferenceTests(unittest.TestCase):
    def test_pool_declaration_moved_out_of_agents_md(self):
        agents = (ROOT.parent / "AGENTS.md").read_text(encoding="utf-8")
        self.assertNotIn("implementer-1", agents)
        self.assertNotIn("bun install --frozen-lockfile", agents)
        self.assertIn("references/worker-pool.md", agents)
        self.assertIn("V3", agents)
        pointer = agents.split("## Operación local", 1)[1].split("\n## ", 1)[0]
        self.assertLessEqual(len([line for line in pointer.splitlines() if "V3" in line]), 6)
        self.assertIn("agent-workflows/tools/install-radar.sh", agents)

    def test_dispatch_skill_reads_the_declaration_from_the_reference(self):
        skill = compact(read(f"skills/{SKILL_NAME}/SKILL.md"))
        self.assertIn("references/worker-pool.md", skill)

    def test_retirement_uses_the_same_repository_specific_pool_locator(self):
        retirement = compact(read(f"skills/{SKILL_NAME}/references/retiro.md"))
        self.assertIn("`worker-pool.md` for Control Tower", retirement)
        self.assertIn("another repository", retirement)
        self.assertIn("`AGENTS.md`", retirement)
        self.assertNotIn("repository `AGENTS.md`; it remains the source", retirement)


if __name__ == "__main__":
    unittest.main()
