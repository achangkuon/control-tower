import importlib.util
from pathlib import Path
import re
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/install.py"
SPEC = importlib.util.spec_from_file_location("agent_workflows_install_jornada", SCRIPT)
INSTALLER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = INSTALLER
SPEC.loader.exec_module(INSTALLER)

SKILL_NAME = "chanks-0-jornada"
SKILL_PATH = f"skills/{SKILL_NAME}/SKILL.md"


def read(relative):
    return (ROOT / relative).read_text(encoding="utf-8")


class ChanksJornadaSkillTests(unittest.TestCase):
    def setUp(self):
        self.skill = read(SKILL_PATH)

    def test_frontmatter_declares_the_skill_name(self):
        self.assertIn(f"name: {SKILL_NAME}", self.skill)
        self.assertIn('description: "Trigger:', self.skill)

    def test_skill_is_v2_and_loads_only_on_an_explicit_request(self):
        description = self.skill.splitlines()[2]
        self.assertIn("V2", description)
        self.assertIn("explicitly", description)
        self.assertIn("empezamos la jornada", description)
        self.assertIn("disable-model-invocation: true", self.skill.split("\n---\n", 1)[0])
        self.assertIn("V2 only", self.skill)
        self.assertIn("`chanks-3-paralelo`", self.skill)
        self.assertIn("overrides Gentle AI", " ".join(self.skill.split()))

    def test_triggers_include_the_spanish_open_and_close_phrases(self):
        self.assertIn("empezamos la jornada", self.skill)
        self.assertIn("cerramos la jornada", self.skill)

    def test_skill_calls_jornada_sh_as_a_tower_tool_not_a_reimplementation(self):
        self.assertIn("jornada.sh", self.skill)
        self.assertIn("--ejecutar", self.skill)
        self.assertIn("--reciclar", self.skill)
        self.assertIn("--nueva-rama", self.skill)
        self.assertIn("Tower tool", self.skill)
        self.assertIn("reimplement", self.skill.lower())

    def test_skill_does_not_author_a_copy_of_jornada_sh_git_logic(self):
        # The skill may describe jornada.sh's behavior in prose, but it must never
        # author the underlying git commands as steps of its own -- that would be
        # exactly the reimplementation Engram 9235 / decision 62 forbid.
        self.assertNotIn("git pull --ff-only", self.skill)
        self.assertNotIn("git rebase", self.skill)
        self.assertNotIn("git stash", self.skill)
        self.assertNotIn("git reset", self.skill)

    def test_skill_never_self_initiates_borrar_rama_vieja(self):
        self.assertIn("never", self.skill.lower())
        prohibition = re.search(
            r"[Nn]ever pass `--borrar-rama-vieja`[^\n]*", self.skill
        )
        self.assertIsNotNone(prohibition, "missing explicit --borrar-rama-vieja prohibition")
        self.assertIn("explicit", prohibition.group(0).lower())

        # Every example --reciclar invocation given as a concrete step must be free
        # of --borrar-rama-vieja: the flag is never part of the skill's own default
        # call shape, only an addition the human explicitly asked for.
        steps = self.skill.split("## Execution Steps", 1)[1].split(
            "## Output Contract", 1
        )[0]
        for line in steps.splitlines():
            if "--reciclar" in line and "`" in line:
                self.assertNotIn("--borrar-rama-vieja", line)

    def test_skill_never_recycles_a_dirty_or_busy_worktree_on_its_own(self):
        for phrase in ("dirty", "OCUPADO"):
            self.assertIn(phrase, self.skill)
        for verb in ("recycle", "clean", "reset", "stash", "save"):
            self.assertIn(verb, self.skill.lower())
        self.assertIn("one decision", self.skill.lower())
        for choice in ("deliver", "save", "discard"):
            self.assertIn(choice, self.skill.lower())
        self.assertIn("dirty-worktree refusal", self.skill)

    def test_open_runs_diagnosis_then_execute_then_recycle_named_seats(self):
        steps = self.skill.split("## Execution Steps", 1)[1].split(
            "## Output Contract", 1
        )[0]
        diagnosis_index = steps.find("jornada.sh` (no flags")
        ejecutar_index = steps.find("--ejecutar")
        reciclar_index = steps.find("--reciclar")
        self.assertNotEqual(diagnosis_index, -1)
        self.assertNotEqual(ejecutar_index, -1)
        self.assertNotEqual(reciclar_index, -1)
        self.assertLess(diagnosis_index, ejecutar_index)
        self.assertLess(ejecutar_index, reciclar_index)
        self.assertIn("human assigns", self.skill.lower())

    def test_close_runs_diagnosis_only_with_no_mutation(self):
        close_section = self.skill.split("Close:", 1)[1]
        self.assertIn("no flags", close_section[:400])
        self.assertIn("pending", close_section[:400].lower())
        # The close path must never call the mutating flags.
        close_steps_line = next(
            line for line in self.skill.splitlines() if line.strip().startswith("5.")
        )
        self.assertIn("Close:", close_steps_line)
        self.assertNotIn("--ejecutar", close_steps_line)
        self.assertNotIn("--reciclar", close_steps_line)

    def test_skill_selects_no_work_writes_no_plan_creates_no_lock(self):
        for phrase in ("selects no work", "no plan", "no lock"):
            self.assertIn(phrase, self.skill.lower())

    def test_authority_references_engram_9235_and_decision_62(self):
        self.assertIn("9235", self.skill)
        self.assertIn("62", self.skill)

    def test_jornada_sh_resolves_from_target_repository_root_not_installed_copy(self):
        # S161 finding (a): `../../../jornada.sh` does not resolve from a runtime skill
        # copy (~/.claude/skills/...); the script must be found at the target repo root.
        self.assertIn("`git rev-parse --show-toplevel`", self.skill)
        self.assertNotIn("../../../jornada.sh", self.skill)
        self.assertIn(
            "If `jornada.sh` is absent at that root, this skill stops and reports it",
            self.skill,
        )
        self.assertIn(
            "it never reimplements jornada.sh's own logic to work around a missing script",
            self.skill,
        )

    def test_jornada_sh_failure_or_partial_ejecutar_gate_stops_and_asks(self):
        # S161 finding (b): a non-zero exit, or a partial `--ejecutar` failure reported in
        # its own output, must stop and ask -- never a silent retry or workaround.
        self.assertIn(
            "If `jornada.sh` exits non-zero, or its `--ejecutar` output reports a partial "
            "failure",
            self.skill,
        )
        self.assertIn(
            "it never retries, retries with different flags, or works around the failure",
            self.skill,
        )
        self.assertIn("does not proceed on unverified state", self.skill)

    def test_decision_gates_cover_missing_jornada_and_jornada_failure(self):
        gates = self.skill.split("## Decision Gates", 1)[1].split("## Execution Steps", 1)[0]
        self.assertIn(
            "| `jornada.sh` not found at the target repository root "
            "(`git rev-parse --show-toplevel`) | Stop; report it is missing; never "
            "reimplement its logic to work around it. |",
            gates,
        )
        self.assertIn(
            "| `jornada.sh` exits non-zero, or its `--ejecutar` output reports a partial "
            "failure | Stop; report the exact output; ask the human; never retry or work "
            "around it. |",
            gates,
        )
        self.assertIn(
            "| Invoked by `chanks-3-despacho-herdr` as stage-3 dispatch entry, under its "
            "acquired dispatch lock | Run diagnosis and `--ejecutar` only; never "
            "`--reciclar`. A dirty or OCUPADO seat surfaces its evidence and one human "
            "decision (deliver, save, discard); until answered, the whole batch does not "
            "proceed — release only the owned lock and launch nothing. |",
            gates,
        )

    def test_stage3_dispatch_entry_mode_runs_diagnosis_and_ejecutar_only_never_reciclar(self):
        self.assertIn("Stage-3 dispatch entry mode:", self.skill)
        self.assertIn("`chanks-3-despacho-herdr`", self.skill)
        steps = self.skill.split("## Execution Steps", 1)[1].split(
            "## Output Contract", 1
        )[0]
        self.assertIn(
            "run step 1 (diagnosis) and step 2 (`--ejecutar`) only; skip step 3 (`--reciclar`) "
            "entirely",
            steps,
        )
        self.assertIn(
            "until the human decides, the whole batch does not proceed — dispatch releases "
            "only its owned lock and launches nothing; a missing seat keeps the existing "
            "provisioning path",
            steps,
        )

    def test_installer_lists_and_ships_the_skill(self):
        self.assertIn(SKILL_NAME, INSTALLER.CHANKS_SKILLS)
        sources = {skill for skill, _, _ in INSTALLER.source_files(ROOT)}
        self.assertIn(SKILL_NAME, sources)

    def test_ejecutar_failure_signal_is_defined_by_concrete_markers(self):
        # R3-partial-failure-signal-undefined: the partial-failure signal must be concrete,
        # naming the exact markers jornada.sh's own --ejecutar block prints, not a vague
        # "reports a partial failure" left undefined.
        for marker in ("FALLO", "CONFLICTO", "ABORTADO"):
            self.assertIn(f"`{marker}`", self.skill)
        self.assertIn("--ejecutar", self.skill)
        self.assertIn("pull --ff-only", self.skill.lower() + self.skill)
        self.assertIn("rebase", self.skill.lower())

    def test_stage3_jornada_invocation_runs_under_the_dispatch_lock(self):
        # R3-ejecutar-mutation-outside-lock: chanks-3-despacho-herdr now invokes this skill's
        # stage-3 mode under its acquired lock, not before the lock is held.
        self.assertIn("invoked under the dispatch lock, never before it is acquired", self.skill)
        self.assertNotIn("before the dispatch lock is held", self.skill)
        self.assertNotIn("before selecting or locking workers", self.skill.lower())

    def test_old_batch_exclusion_phrase_is_absent(self):
        # R3-batch-exclusion-contradicts-atomic-batch: no wording anywhere still describes an
        # unanswered seat as excluded while the rest of the batch continues.
        for phrase in (
            "excluded from that dispatch batch while other seats continue",
            "excluded from this batch while other seats continue",
            "stays excluded from that dispatch batch until answered",
            "is excluded from that batch until the human answers",
        ):
            self.assertNotIn(phrase, self.skill)
        self.assertIn("the whole batch does not proceed", self.skill)
        self.assertIn("a fresh dispatch request", self.skill)


if __name__ == "__main__":
    unittest.main()
