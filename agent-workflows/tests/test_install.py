import importlib.util
import json
import os
from pathlib import Path
import shlex
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/install.py"
SPEC = importlib.util.spec_from_file_location("agent_workflows_install", SCRIPT)
INSTALLER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = INSTALLER
SPEC.loader.exec_module(INSTALLER)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.home = Path(self.tempdir.name)
        self._seed_runtime()

    def tearDown(self):
        self.tempdir.cleanup()

    def _seed_runtime(self, home=None):
        home = home or self.home
        old_block = (
            INSTALLER.START_MARKER
            + b"\n## Durable Session Skill Routing\n"
            + b"- old runtime path\n"
            + INSTALLER.END_MARKER
            + b"\n"
        )
        for path in INSTALLER.manual_paths(home):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"managed-prefix\n" + old_block + b"managed-suffix\n")

    def test_install_is_idempotent_and_preserves_surrounding_manual_content(self):
        preserved_mode = 0o640
        mode_path = self.home / ".claude/CLAUDE.md"
        mode_path.chmod(preserved_mode)
        original_modes = {
            path: stat.S_IMODE(path.stat().st_mode)
            for path in INSTALLER.manual_paths(self.home)
        }
        first = INSTALLER.apply(self.home, ROOT)
        self.assertTrue(first)
        snapshots = {}
        modes = {}
        surrounding = {}
        for path in INSTALLER.manual_paths(self.home):
            content = path.read_bytes()
            match = INSTALLER.BLOCK_RE.search(content)
            self.assertIsNotNone(match)
            assert match is not None
            snapshots[path] = content
            modes[path] = stat.S_IMODE(path.stat().st_mode)
            surrounding[path] = (content[: match.start()], content[match.end() :])
        second = INSTALLER.apply(self.home, ROOT)
        self.assertEqual(second, [])
        self.assertEqual(
            snapshots,
            {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)},
        )
        for path in INSTALLER.manual_paths(self.home):
            content = path.read_bytes()
            match = INSTALLER.BLOCK_RE.search(content)
            self.assertIsNotNone(match)
            assert match is not None
            self.assertEqual(surrounding[path], (content[: match.start()], content[match.end() :]))
            self.assertEqual(modes[path], stat.S_IMODE(path.stat().st_mode))
            self.assertEqual(original_modes[path], stat.S_IMODE(path.stat().st_mode))
            self.assertIn(ROOT.as_posix().encode(), content)
            self.assertEqual(content.count(INSTALLER.START_MARKER), 1)
            self.assertEqual(content.count(INSTALLER.GATEKEEPER_START_MARKER), 1)
            self.assertIsNotNone(INSTALLER.GATEKEEPER_BLOCK_RE.search(content))

    def test_installed_manual_admission_contract_exactly_matches_canonical_source(self):
        source = (ROOT / "templates/session-routing.md").read_text(encoding="utf-8")
        start_marker = "<!-- SESSION-ADMISSION-CONTRACT:CANONICAL -->"
        end_marker = "<!-- /SESSION-ADMISSION-CONTRACT:CANONICAL -->"
        start = source.index(start_marker)
        end = source.index(end_marker, start) + len(end_marker)
        canonical = source[start:end]
        expected = {
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
                    "chanks-3-session-kickoff",
                    "chanks-1-cierre-de-decisiones",
                ],
            },
            "decision_closure": "separate explicit human request for the named decision",
            "semantics": {
                "seats": "compatible capacity, never assigned agents",
                "queue": "Zone-ordered rows and length, never assigned agents",
                "listo_choices": "count of current LISTO choices, never assigned agents",
            },
            "tower_boundary": "manual-only; no Tower runtime or skills",
        }

        INSTALLER.apply(self.home, ROOT)
        for path in INSTALLER.manual_paths(self.home):
            match = INSTALLER.BLOCK_RE.search(path.read_bytes())
            self.assertIsNotNone(match, path)
            assert match is not None
            installed = match.group().decode("utf-8")
            self.assertEqual(installed.count(start_marker), 1, path)
            self.assertEqual(installed.count(end_marker), 1, path)
            installed_start = installed.index(start_marker)
            installed_end = installed.index(end_marker, installed_start) + len(end_marker)
            self.assertEqual(installed[installed_start:installed_end], canonical, path)
            payload_start = installed.index("```json", installed_start) + len("```json")
            payload_end = installed.index("```", payload_start)
            self.assertEqual(json.loads(installed[payload_start:payload_end]), expected, path)

    def test_installed_session_routing_keeps_odd_default_and_sdd_explicit(self):
        INSTALLER.apply(self.home, ROOT)
        for path in INSTALLER.manual_paths(self.home):
            match = INSTALLER.BLOCK_RE.search(path.read_bytes())
            self.assertIsNotNone(match, path)
            assert match is not None
            text = b" ".join(match.group().split())
            self.assertIn(b"ODD is default", text, path)
            self.assertIn(b"explicit human `solicitud_sdd`", text, path)
            self.assertIn(b"same Session identity", text, path)
            self.assertIn(b"first pending M\xc3\xb3dulo for legacy", text, path)
            self.assertIn(b"review outcome never authorizes delivery", text, path)
            self.assertNotIn(b"one shared SDD pipeline", text, path)
            self.assertNotIn(b"`session-plan`", text, path)

    def test_installed_session_routing_preserves_native_authority_boundaries(self):
        INSTALLER.apply(self.home, ROOT)
        for path in INSTALLER.manual_paths(self.home):
            match = INSTALLER.BLOCK_RE.search(path.read_bytes())
            self.assertIsNotNone(match, path)
            assert match is not None
            normalized = b" ".join(match.group().split())
            self.assertIn(b"Radar is the only admission binary", normalized, path)
            self.assertIn(b"Forecasts reserve nothing live", normalized, path)
            self.assertIn(b"do not grant execution", normalized, path)
            self.assertIn(b"fake topology control", normalized, path)

    def test_all_runtime_skill_paths_match_canonical_source(self):
        INSTALLER.apply(self.home, ROOT)
        for runtime_root in INSTALLER.runtime_skill_roots(self.home):
            for skill, relative, source in INSTALLER.source_files(ROOT):
                destination = runtime_root / skill / relative
                self.assertTrue(destination.is_file(), destination)
                self.assertEqual(source.read_bytes(), destination.read_bytes())

    def test_check_mode_detects_skill_and_manual_drift(self):
        INSTALLER.apply(self.home, ROOT)
        skill_path = self.home / ".agents/skills/chanks-3-session-kickoff/SKILL.md"
        skill_path.chmod(0o644)
        skill_path.write_bytes(skill_path.read_bytes() + b"\nDRIFT\n")
        manual_path = self.home / ".pi/agent/APPEND_SYSTEM.md"
        drifted = manual_path.read_bytes().replace(ROOT.as_posix().encode(), b"/wrong")
        drifted = drifted.replace(b"Proportional Automatic SDD Gatekeeper", b"Drifted Gatekeeper")
        manual_path.write_bytes(drifted)
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--check", "--home", str(self.home)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("chanks-3-session-kickoff/SKILL.md", result.stdout)
        self.assertIn("APPEND_SYSTEM.md", result.stdout)

    def test_dry_run_does_not_write(self):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--dry-run", "--home", str(self.home)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0)
        self.assertIn("WOULD_UPDATE", result.stdout)
        self.assertFalse((self.home / ".agents/skills/chanks-3-session-kickoff/SKILL.md").exists())

    def test_rejects_symlinked_runtime_parent_without_touching_external_sentinel(self):
        external = Path(self.tempdir.name) / "external"
        sentinel = external / "sentinel.txt"
        external.mkdir()
        sentinel.write_bytes(b"protected")
        runtime_parent = self.home / ".agents"
        runtime_parent.mkdir()
        (runtime_parent / "skills").symlink_to(external, target_is_directory=True)

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(sentinel.read_bytes(), b"protected")
        self.assertFalse((external / "chanks-3-session-kickoff").exists())

    def test_rejects_symlinked_destination_without_touching_external_sentinel(self):
        external = Path(self.tempdir.name) / "external-file"
        external.write_bytes(b"protected")
        destination = self.home / ".agents/skills/chanks-3-session-kickoff/SKILL.md"
        destination.parent.mkdir(parents=True)
        destination.symlink_to(external)

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(external.read_bytes(), b"protected")


    def test_all_owned_blocks_stay_outside_gentle_ai_and_section_ranges(self):
        INSTALLER.apply(self.home, ROOT)
        for path in INSTALLER.manual_paths(self.home):
            content = path.read_bytes()
            ranges = INSTALLER._managed_ranges(content, path)
            for pattern in (INSTALLER.BLOCK_RE, INSTALLER.GATEKEEPER_BLOCK_RE):
                match = pattern.search(content)
                self.assertIsNotNone(match)
                assert match is not None
                self.assertTrue(all(not (start < match.end() and match.start() < end) for start, end in ranges))

    def test_install_preserves_unrelated_manual_block(self):
        unrelated = b"<!-- OWNER-NOTES:MANUAL -->\nkeep me\n<!-- /OWNER-NOTES:MANUAL -->\n"
        for path in INSTALLER.manual_paths(self.home):
            path.write_bytes(path.read_bytes() + unrelated)
        INSTALLER.apply(self.home, ROOT)
        for path in INSTALLER.manual_paths(self.home):
            self.assertIn(unrelated, path.read_bytes())

    def test_rejects_custom_block_nested_in_managed_block(self):
        path = self.home / ".claude/CLAUDE.md"
        old = path.read_bytes()
        nested = (
            b"<!-- gentle-ai:persona -->\n"
            + old
            + b"<!-- /gentle-ai:persona -->\n"
        )
        path.write_bytes(nested)

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(path.read_bytes(), nested)
        self.assertFalse((self.home / ".agents").exists())

    def test_rejects_duplicate_gatekeeper_block_before_mutation(self):
        path = self.home / ".pi/agent/APPEND_SYSTEM.md"
        gatekeeper = (ROOT / "templates/sdd-auto-gatekeeper-policy.md").read_bytes()
        path.write_bytes(path.read_bytes() + gatekeeper + gatekeeper)
        before = {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)}

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)})
        self.assertFalse((self.home / ".agents").exists())

    def test_rejects_gatekeeper_block_nested_in_section_block_before_mutation(self):
        path = self.home / ".codex/AGENTS.md"
        gatekeeper = (ROOT / "templates/sdd-auto-gatekeeper-policy.md").read_bytes()
        path.write_bytes(
            path.read_bytes()
            + b"<!-- section:model-capable -->\n"
            + gatekeeper
            + b"<!-- /section:model-capable -->\n"
        )
        before = {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)}

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)})
        self.assertFalse((self.home / ".agents").exists())

    def test_rejects_nested_owned_blocks_before_mutation(self):
        path = self.home / ".claude/CLAUDE.md"
        session = path.read_bytes()
        gatekeeper = (ROOT / "templates/sdd-auto-gatekeeper-policy.md").read_bytes()
        malformed_inputs = (
            (
                "session-routing",
                session.replace(
                    b"- old runtime path\n",
                    b"- old runtime path\n" + gatekeeper,
                ),
            ),
            (
                "gatekeeper",
                INSTALLER.GATEKEEPER_START_MARKER
                + b"\n"
                + session
                + INSTALLER.GATEKEEPER_END_MARKER
                + b"\n",
            ),
        )

        for outer, malformed in malformed_inputs:
            with self.subTest(outer=outer):
                self._seed_runtime()
                path.write_bytes(malformed)
                before = {
                    item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)
                }

                with self.assertRaises(INSTALLER.InstallError):
                    INSTALLER.apply(self.home, ROOT)
                self.assertEqual(
                    before,
                    {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)},
                )
                self.assertFalse((self.home / ".agents").exists())

    def test_wrong_type_destination_is_rejected_before_any_mutation(self):
        wrong_type = self.home / ".agents/skills/chanks-4-puente/SKILL.md"
        wrong_type.mkdir(parents=True)
        sentinel = wrong_type / "sentinel"
        sentinel.write_bytes(b"protected")
        before = {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)}

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)})
        self.assertFalse((self.home / ".agents/skills/chanks-3-session-kickoff").exists())
        self.assertEqual(sentinel.read_bytes(), b"protected")

    def test_wrong_type_skill_directory_is_rejected_before_any_mutation(self):
        wrong_type = self.home / ".agents/skills/chanks-4-puente"
        wrong_type.parent.mkdir(parents=True)
        wrong_type.write_bytes(b"protected")
        before = {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)}

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)})
        self.assertFalse((self.home / ".agents/skills/chanks-3-session-kickoff").exists())
        self.assertEqual(wrong_type.read_bytes(), b"protected")

    def test_missing_instruction_file_fails_without_runtime_mutation(self):
        """An installed runtime missing its instruction file still fails closed."""
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            self._seed_runtime(home)
            (home / ".codex/AGENTS.md").unlink()
            with self.assertRaises(INSTALLER.InstallError):
                INSTALLER.apply(home, ROOT)
            self.assertFalse((home / ".agents").exists())

    def test_absent_runtime_is_skipped_instead_of_failing(self):
        """A runtime this machine does not have is skipped, not fatal.

        A fresh machine rarely has all four runtimes. Skipping keeps the install
        usable there; the remaining runtimes must still be written in full, and
        the absent one must not be created as a side effect.
        """
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            self._seed_runtime(home)
            shutil.rmtree(home / ".codex")

            INSTALLER.apply(home, ROOT)

            self.assertFalse((home / ".codex").exists())
            for root in (home / ".agents/skills", home / ".claude/skills"):
                self.assertTrue((root / "chanks-4-unattended-implementation/SKILL.md").is_file())
                self.assertFalse((root / "torre-control-entregas").exists())
            self.assertNotIn("torre-control-entregas", INSTALLER.SKILLS)
            self.assertEqual(INSTALLER.build_plan(home, ROOT), [])

    def test_installer_inventory_includes_every_chanks_skill_and_excludes_retired_skills(self):
        actual_chanks = {
            path.parent.name for path in (ROOT / "skills").glob("chanks-*/SKILL.md")
        }
        self.assertEqual(set(INSTALLER.CHANKS_SKILLS), actual_chanks)
        self.assertTrue(set(INSTALLER.RETIRED_SKILLS).isdisjoint(INSTALLER.SKILLS))

    def test_chanks_1_adopcion_is_installed_and_listed(self):
        """The tramo-1 adoption skill must ship in the roster and land on disk.

        Sibling to chanks-1-heredado/chanks-1-autoridad: an existing repo
        adopting plan.yaml needs this skill on every runtime, not just in
        the source tree.
        """
        self.assertIn("chanks-1-adopcion", INSTALLER.CHANKS_SKILLS)
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            self._seed_runtime(home)
            INSTALLER.apply(home, ROOT)
            for root in (home / ".agents/skills", home / ".claude/skills"):
                self.assertTrue((root / "chanks-1-adopcion/SKILL.md").is_file())

    def test_chanks_0_jornada_is_installed_and_listed(self):
        """The workday-open/close skill must ship in the roster and land on disk.

        It calls jornada.sh as a Tower tool for "empezamos/cerramos la jornada"; it
        needs the same install treatment as every other chanks-0-* skill.
        """
        self.assertIn("chanks-0-jornada", INSTALLER.CHANKS_SKILLS)
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            self._seed_runtime(home)
            INSTALLER.apply(home, ROOT)
            for root in (home / ".agents/skills", home / ".claude/skills"):
                self.assertTrue((root / "chanks-0-jornada/SKILL.md").is_file())

    def test_project_owned_tower_delivery_skill_is_not_distributed(self):
        self.assertNotIn("torre-control-entregas", INSTALLER.SKILLS)
        self.assertIn("torre-control-entregas", INSTALLER.RETIRED_SKILLS)
        self.assertFalse((ROOT / "skills/torre-control-entregas").exists())

    def test_later_apply_failure_preserves_retired_skill_bytes(self):
        retired = INSTALLER.runtime_skill_roots(self.home)[0] / INSTALLER.RETIRED_SKILLS[0]
        retired.mkdir(parents=True)
        payload = b"\x00retired\n"
        (retired / "SKILL.md").write_bytes(payload)

        with mock.patch.object(INSTALLER, "_atomic_copy", side_effect=OSError("later failure")):
            with self.assertRaises(OSError):
                INSTALLER.apply(self.home, ROOT)

        self.assertEqual((retired / "SKILL.md").read_bytes(), payload)

    def test_install_removes_only_explicit_retired_skills_from_all_runtime_roots(self):
        retired_paths = []
        unrelated_paths = []
        for runtime_root in INSTALLER.runtime_skill_roots(self.home):
            for retired_skill in INSTALLER.RETIRED_SKILLS:
                retired = runtime_root / retired_skill
                retired.mkdir(parents=True)
                (retired / "SKILL.md").write_bytes(b"stale")
                (retired / "references").mkdir()
                (retired / "references/legacy.md").write_bytes(b"stale")
                retired_paths.append(retired)

            unrelated = runtime_root / "user-owned-skill/notes.md"
            unrelated.parent.mkdir()
            unrelated.write_bytes(b"preserve")
            unrelated_paths.append(unrelated)

        cleanup = [
            change
            for change in INSTALLER.build_plan(self.home, ROOT)
            if change.kind == "retired-skill"
        ]
        self.assertEqual({change.path for change in cleanup}, set(retired_paths))

        INSTALLER.apply(self.home, ROOT)

        self.assertTrue(all(not path.exists() for path in retired_paths))
        self.assertTrue(all(path.read_bytes() == b"preserve" for path in unrelated_paths))
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])

    def test_each_retired_skill_cleanup_unlinks_external_symlink_without_following_it(self):
        for retired_skill in INSTALLER.RETIRED_SKILLS:
            with self.subTest(retired_skill=retired_skill), tempfile.TemporaryDirectory() as raw:
                home = Path(raw)
                self._seed_runtime(home)
                external = home / "external-retired-skill"
                external.mkdir()
                sentinel = external / "sentinel.txt"
                sentinel.write_bytes(b"protected")
                retired = home / ".agents/skills" / retired_skill
                retired.parent.mkdir(parents=True)
                retired.symlink_to(external, target_is_directory=True)

                INSTALLER.apply(home, ROOT)

                self.assertFalse(retired.exists())
                self.assertFalse(retired.is_symlink())
                self.assertEqual(sentinel.read_bytes(), b"protected")

    def test_each_retired_skill_cleanup_does_not_follow_nested_external_symlink(self):
        for retired_skill in INSTALLER.RETIRED_SKILLS:
            with self.subTest(retired_skill=retired_skill), tempfile.TemporaryDirectory() as raw:
                home = Path(raw)
                self._seed_runtime(home)
                external = home / "external-nested-directory"
                external.mkdir()
                sentinel = external / "sentinel.txt"
                sentinel.write_bytes(b"protected")
                retired = home / ".agents/skills" / retired_skill
                retired.mkdir(parents=True)
                (retired / "external").symlink_to(external, target_is_directory=True)

                INSTALLER.apply(home, ROOT)

                self.assertFalse(retired.exists())
                self.assertEqual(sentinel.read_bytes(), b"protected")

    def test_each_retired_skill_cleanup_rejects_regular_file_before_mutation(self):
        for retired_skill in INSTALLER.RETIRED_SKILLS:
            with self.subTest(retired_skill=retired_skill), tempfile.TemporaryDirectory() as raw:
                home = Path(raw)
                self._seed_runtime(home)
                retired = home / ".agents/skills" / retired_skill
                retired.parent.mkdir(parents=True)
                retired.write_bytes(b"user-file")

                with self.assertRaises(INSTALLER.InstallError):
                    INSTALLER.apply(home, ROOT)

                self.assertEqual(retired.read_bytes(), b"user-file")
                self.assertFalse((home / ".agents/skills/chanks-3-session-kickoff").exists())

    def test_native_kickoff_reconciles_identity_without_inventing_a_route(self):
        content = (ROOT / "skills/chanks-3-session-kickoff/SKILL.md").read_text(encoding="utf-8")
        hard_rules = content.split("## Hard Rules", 1)[1].split("## Decision Gates", 1)[0]
        execution = content.split("## Execution Steps", 1)[1].split("## Output Contract", 1)[0]

        self.assertIn("same Session identity", hard_rules)
        self.assertIn("first pending Módulo for legacy", hard_rules)
        self.assertIn("explicit human `solicitud_sdd`", hard_rules)
        self.assertNotIn("three canonical routes", hard_rules)
        self.assertIn("native record, code, and evidence", execution)
        self.assertIn("Do not write a route revalidation for native ODD", execution)


    def test_all_tower_skills_are_archived_without_installing_candidates(self):
        tower_skills = (
            "torre-control",
            "torre-control-soporte",
            "torre-control-entregas",
        )
        self.assertTrue(set(tower_skills).issubset(INSTALLER.RETIRED_SKILLS))
        self.assertTrue(set(tower_skills).isdisjoint(INSTALLER.SKILLS))
        self.assertTrue(
            set(tower_skills).isdisjoint(skill for skill, _, _ in INSTALLER.source_files(ROOT))
        )

        runtime_root = INSTALLER.runtime_skill_roots(self.home)[0]
        expected_payloads = {}
        for skill in tower_skills:
            retired = runtime_root / skill
            (retired / "references").mkdir(parents=True)
            skill_payload = f"# customized {skill}\n".encode()
            nested_payload = f"reference for {skill}\n".encode()
            (retired / "SKILL.md").write_bytes(skill_payload)
            (retired / "references/local.md").write_bytes(nested_payload)
            expected_payloads[skill] = (skill_payload, nested_payload)

        INSTALLER.apply(self.home, ROOT)

        archive = INSTALLER.retired_skill_archive_root(runtime_root)
        for skill, (skill_payload, nested_payload) in expected_payloads.items():
            self.assertFalse((runtime_root / skill).exists())
            preserved = [
                path for path in archive.rglob("SKILL.md") if path.read_bytes() == skill_payload
            ]
            self.assertEqual(len(preserved), 1)
            self.assertEqual(
                (preserved[0].parent / "references/local.md").read_bytes(), nested_payload
            )

        self.assertEqual(INSTALLER.apply(self.home, ROOT), [])
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])

    def test_retired_skill_archive_is_not_reported_as_drift(self):
        runtime_root = INSTALLER.runtime_skill_roots(self.home)[0]
        retired = runtime_root / INSTALLER.RETIRED_SKILLS[0]
        retired.mkdir(parents=True)
        (retired / "SKILL.md").write_bytes(b"stale\n")

        INSTALLER.apply(self.home, ROOT)

        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])

    def test_kickoff_requires_confirmed_exclusive_or_serial_resource_evidence(self):
        content = (ROOT / "skills/chanks-3-session-kickoff/SKILL.md").read_text(encoding="utf-8")
        execution = content.split("## Execution Steps", 1)[1].split("## Output Contract", 1)[0]

        self.assertIn("Recurso", execution)
        self.assertIn("confirmed exclusive or serial execution evidence", execution)
        self.assertIn("release only actual resources", execution)
        self.assertNotIn("MAIN", content)
        self.assertNotIn("Tower", content)

    def test_routing_preserves_resource_evidence_without_a_fictitious_lock(self):
        content = (
            ROOT / "templates/session-routing.md"
        ).read_text(encoding="utf-8")

        self.assertIn("Recurso", content)
        self.assertIn("confirmed exclusive or serial execution evidence", content)
        self.assertIn("release only actual resources", content)
        self.assertNotIn("fictitious", content)

    def test_routing_selects_next_work_only_from_the_radar_queue(self):
        content = (
            ROOT / "templates/session-routing.md"
        ).read_text(encoding="utf-8")

        self.assertIn("radar status", content)
        self.assertIn("`LISTO`", content)
        self.assertIn("never selects work", content)

    def test_renamed_runtime_trees_are_archived_without_losing_nested_user_bytes(self):
        runtime = INSTALLER.runtime_skill_roots(self.home)[0]
        for old in ("chanks-6-politica-de-entrega", "chanks-7-session-doc"):
            retired = runtime / old
            (retired / "references").mkdir(parents=True)
            (retired / "references/local.md").write_bytes(f"custom {old}".encode())

        INSTALLER.apply(self.home, ROOT)

        archive = INSTALLER.retired_skill_archive_root(runtime)
        for old, new in (("chanks-6-politica-de-entrega", "chanks-5-politica-de-entrega"),
                         ("chanks-7-session-doc", "chanks-5-session-doc")):
            self.assertFalse((runtime / old).exists())
            self.assertTrue((runtime / new / "SKILL.md").is_file())
            preserved = list(archive.glob(f"{old}-*/references/local.md"))
            self.assertEqual(len(preserved), 1)
            self.assertEqual(preserved[0].read_bytes(), f"custom {old}".encode())
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])

    def test_hyphenated_retired_skill_is_actually_retired(self):
        # Listed only under the underscore spelling, it matched no directory on disk.
        retired = INSTALLER.runtime_skill_roots(self.home)[0] / "coordinador-multi-agente"
        retired.mkdir(parents=True)
        (retired / "SKILL.md").write_bytes(b"stale\n")
        self.assertNotEqual(INSTALLER.build_plan(self.home, ROOT), [])
        INSTALLER.apply(self.home, ROOT)
        self.assertFalse(retired.exists())
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])


class StageFiveSkillInventoryTests(unittest.TestCase):
    def test_new_names_ship_complete_source_trees_and_retire_old_names(self):
        replacements = {
            "chanks-6-politica-de-entrega": "chanks-5-politica-de-entrega",
            "chanks-7-session-doc": "chanks-5-session-doc",
        }
        installed = {(skill, relative.as_posix()) for skill, relative, _ in INSTALLER.source_files(ROOT)}
        for old, new in replacements.items():
            with self.subTest(skill=new):
                self.assertIn(new, INSTALLER.CHANKS_SKILLS)
                self.assertNotIn(old, INSTALLER.SKILLS)
                self.assertIn(old, INSTALLER.RETIRED_SKILLS)
                source = ROOT / "skills" / new
                self.assertEqual(
                    {path.relative_to(source).as_posix() for path in source.rglob("*") if path.is_file()},
                    {relative for skill, relative in installed if skill == new},
                )
        self.assertEqual(
            {relative for skill, relative in installed if skill == "chanks-5-politica-de-entrega"},
            {"SKILL.md"},
        )
        self.assertEqual(
            {relative for skill, relative in installed if skill == "chanks-5-session-doc"},
            {"SKILL.md", "assets/project-notion-map.json",
             "assets/session-doc.schema.json", "references/links.md"},
        )


class SessionDocSchemaTest(unittest.TestCase):
    """The oneOf contract gates session closure, so its matrix is pinned here."""

    SCHEMA = ROOT / "skills/chanks-5-session-doc/assets/session-doc.schema.json"
    HEX, DASHED = "387e23cc934581f99b44eb519210c801", "387e23cc-9345-81f9-9b44-eb519210c801"
    SCRIPT = ("const A=require('ajv'),f=require('fs');const v=new A({strict:false}).compile("
              "JSON.parse(f.readFileSync(process.argv[1],'utf8')));console.log("
              "JSON.parse(process.argv[2]).map(d=>!!v(d)).join(','))")

    def test_closure_gate_matrix(self):
        cases = [({"notion_page_id": self.HEX}, True),
                 ({"notion_page_id": self.DASHED}, True),  # the shape Notion's UI shows
                 ({"notion": {"enabled": False}}, True),
                 ({"notion_page_id": self.HEX, "notion": {"enabled": False}}, False),
                 ({"notion": {"enabled": True}}, False),
                 ({"notion_page_id": "not-a-page-id"}, False),
                 ({}, False)]
        run = subprocess.run(
            ["bun", "-e", self.SCRIPT, str(self.SCHEMA), json.dumps([c[0] for c in cases])],
            capture_output=True, text=True, cwd=ROOT.parent)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(run.stdout.strip().split(","),
                         [str(c[1]).lower() for c in cases], cases)


if __name__ == "__main__":
    unittest.main()


class PiExtensionTests(unittest.TestCase):
    """S144: Pi auto-discovers only *.ts, so the .mjs adapters need a shim.

    The shim is generated here rather than kept as a repository file because S144's authorized
    files do not include a .ts one, and widening the Session's scope for a discovery detail
    would cost a human approval for no product reason.
    """

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.home = Path(self.tempdir.name)

    def tearDown(self):
        self.tempdir.cleanup()

    def test_shim_lands_where_pi_actually_discovers_extensions(self):
        path = INSTALLER.pi_extension_path(self.home)
        self.assertEqual(path.suffix, ".ts")
        self.assertTrue(str(path).endswith(".pi/agent/extensions/chanks-controls.ts"))

    def test_shim_imports_the_switch_and_the_organic_admission_and_never_reimplements_controls(self):
        body = INSTALLER.desired_pi_extension(ROOT).decode("utf8")
        for needle in ["pi-admission.mjs", "pi-authority.mjs", "pi-switch.mjs", "buildAdmission", "crearAutoridadPi", "effectiveSwitch"]:
            self.assertIn(needle, body)
        # A fully read-only room for the no-key case is a fixed policy, not a decision, so it is
        # legitimately built here — but the decision functions themselves are never restated.
        # (`confinarComando` is named only in a comment explaining why it is not reused here.)
        for decision in ["decidirHerramienta", "mutacionPermitida", "const confinarComando ="]:
            self.assertNotIn(decision, body)
        # The extension must consult the live capability and close it on shutdown.
        self.assertIn("capacidad()?.gobernar(event)", body)
        self.assertIn("owner.completar(id, outcome.kind)", body)

    def test_shim_registers_the_tool_call_gate(self):
        body = INSTALLER.desired_pi_extension(ROOT).decode("utf8")
        self.assertIn("tool_call", body)

    def test_install_writes_the_shim_and_is_idempotent(self):
        INSTALLER.install_pi_extension(self.home, ROOT)
        path = INSTALLER.pi_extension_path(self.home)
        self.assertTrue(path.is_file())
        first = path.read_bytes()
        INSTALLER.install_pi_extension(self.home, ROOT)
        self.assertEqual(path.read_bytes(), first)

    def test_plan_reports_drift_when_the_shim_is_missing_or_stale(self):
        self.assertTrue(INSTALLER.pi_extension_changes(self.home, ROOT))
        INSTALLER.install_pi_extension(self.home, ROOT)
        self.assertFalse(INSTALLER.pi_extension_changes(self.home, ROOT))
        INSTALLER.pi_extension_path(self.home).write_bytes(b"manoseado\n")
        changes = INSTALLER.pi_extension_changes(self.home, ROOT)
        self.assertTrue(changes)
        self.assertEqual(changes[0].kind, "pi-extension")

    def test_shim_points_at_this_checkout_so_a_stale_copy_cannot_be_loaded(self):
        body = INSTALLER.desired_pi_extension(ROOT).decode("utf8")
        for module in ("pi-admission.mjs", "pi-authority.mjs", "pi-switch.mjs"):
            self.assertIn(str((ROOT / "chanks" / module).resolve()), body)

    def test_missing_control_module_fails_closed_instead_of_generating_a_broken_shim(self):
        missing_root = Path(self.tempdir.name) / "missing-root"
        (missing_root / "chanks").mkdir(parents=True)
        (missing_root / "chanks" / "pi-authority.mjs").write_text("export const x = 1\n", encoding="utf-8")
        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.desired_pi_extension(missing_root)


RUN_SHIM_SOURCE = """
import { existsSync, writeFileSync, readFileSync, renameSync, symlinkSync } from 'node:fs'
const extension = (await import(process.argv[2])).default
const scenario = JSON.parse(process.argv[3])
const handlers = {}
const messages = []
const tools = []
const annotations = {}
const pi = {
  on(name, handler) { (handlers[name] ??= []).push(handler) },
  registerTool(definition) { tools.push(definition.name) },
  registerToolCallAnnotation(name, callback) { annotations[name] = callback },
}
const ctx = { hasUI: true, mode: 'tui', ui: { notify(message) { messages.push(message) } } }
extension(pi)
const factoryCalls = 0 // factory may register handlers, but performs no Git/Radar work
for (const handler of handlers.session_start ?? []) await handler({ type: 'session_start', reason: 'startup' }, ctx)
let counter = 0
const active = new Map()
const displayed = {}
async function call(toolName, input, id = `call-${++counter}`) {
  const event = { type: 'tool_call', toolCallId: id, toolName, input }
  const displayArgs = structuredClone(input) // the real TUI keeps pre-policy args
  let result = {}
  for (const handler of handlers.tool_call ?? []) {
    result = await handler(event, ctx) ?? {}
    if (result.block) break
  }
  if (!result.block) active.set(id, { toolName, input: event.input })
  if (!result.block && annotations[toolName]) displayed[id] = `${toolName} ${displayArgs.path ?? displayArgs.command ?? ''} ${annotations[toolName](displayArgs) ?? ''}`
  return { id, result, input: event.input }
}
async function complete(id, toolName, content = []) {
  const original = active.get(id)
  for (const handler of handlers.tool_result ?? []) await handler({ type: 'tool_result', toolCallId: id,
    toolName, input: original?.input ?? {}, isError: scenario.errorResult === true, content }, ctx)
  if (original?.toolName === toolName) active.delete(id)
}
const before = {
  read: await call('read', { path: '/etc/hostname' }),
  write: await call('write', { path: '/model-write' }),
  edit: await call('edit', { path: '/model-edit' }),
  bash: await call('bash', { command: scenario.bashCommand ?? 'printf before' }),
  activationDispatch: await call('chanks_request_activation', { kind: 'planning' }),
  planWrite: await call('write', { path: 'openspec/plan.yaml', content: 'x' }),
  planEdit: await call('edit', { path: '/tmp/project/openspec/plan.yaml', edits: [] }),
}
const rejectedRadar = scenario.blockedRadar ? {
  duplicate: await call('bash', { command: 'radar status' }, before.bash.id),
  missingId: await call('bash', { command: 'radar status' }, ''),
} : null
const stageCalls = []
for (const step of scenario.stageCalls ?? []) {
  const called = await call('bash', { command: step.command })
  stageCalls.push(called)
  if (!called.result.block) await complete(called.id, 'bash', [{ type: 'text', text: JSON.stringify(step.output) }])
}
const skillRead = scenario.skillPath ? await call('read', { path: scenario.skillPath }) : null
if (skillRead && !skillRead.result.block) await complete(skillRead.id, 'read')
const messagesAtCall = [...messages]
for (const [name, value] of Object.entries(before)) if (!value.result.block && !(scenario.withholdRadarResult && name === 'bash'))
  await complete(value.id, name === 'activationDispatch' ? 'chanks_request_activation' : name === 'planWrite' ? 'write' : name === 'planEdit' ? 'edit' : name)
if (scenario.replayRadarResult) await complete(before.bash.id, 'bash')
if (scenario.beforeWriteReplace) writeFileSync(scenario.beforeWriteReplace.path, scenario.beforeWriteReplace.content)
const write = await call(scenario.toolName ?? 'write', { path: scenario.path ?? '/not-authorized', content: 'changed' }, 'write-1')
if (!write.result.block && scenario.swapTarget) {
  renameSync(scenario.path, scenario.swapRetained)
  symlinkSync(scenario.swapTarget, scenario.path)
  if (scenario.toolName === 'edit') {
    const oldText = readFileSync(write.input.path, 'utf8')
    writeFileSync(write.input.path, oldText.replace(oldText, 'changed'))
  } else writeFileSync(write.input.path, 'changed')
}
if (scenario.switchOnBeforeResult) writeFileSync(scenario.switchPath, JSON.stringify({ on: true }))
if (scenario.switchOffBeforeResult) writeFileSync(scenario.switchPath, JSON.stringify({ on: false }))
if (scenario.complete !== false) await complete(write.id, scenario.resultToolName ?? scenario.toolName ?? 'write')
const fdAfterResult = write.input.path.startsWith('/proc/self/fd/') ? existsSync(write.input.path) : null
if (scenario.betweenWritesReplace) writeFileSync(scenario.betweenWritesReplace.path, scenario.betweenWritesReplace.content)
if (scenario.replaceInode) {
  const original = readFileSync(scenario.path)
  renameSync(scenario.path, scenario.replaceInode)
  writeFileSync(scenario.path, original)
}
const after = scenario.afterPath ? await call('write', { path: scenario.afterPath, content: 'after' }) : null
if (after && !after.result.block) await complete(after.id, 'write')
const third = scenario.thirdPath ? await call('write', { path: scenario.thirdPath, content: 'third' }) : null
if (third && !third.result.block) await complete(third.id, 'write')
const duplicate = scenario.duplicate ? await call('write', { path: scenario.path }, 'write-1') : null
if (scenario.shutdown) for (const handler of handlers.session_shutdown ?? []) await handler({ type: 'session_shutdown', reason: scenario.shutdown }, ctx)
const fdAfterShutdown = scenario.shutdown && write.input.path.startsWith('/proc/self/fd/') ? existsSync(write.input.path) : null
if (scenario.stageReplacement) writeFileSync(scenario.stagePath, JSON.stringify(scenario.stageReplacement))
if (scenario.stageAgain) for (const handler of handlers.agent_end ?? []) await handler({ type: 'agent_end' }, ctx)
console.log(JSON.stringify({ registered: true, tools, annotations: Object.keys(annotations), displayed, stageCalls, skillRead, before, write, after, third, duplicate, rejectedRadar, messagesAtCall, messages, active: [...active.keys()], fdAfterResult, fdAfterShutdown }))
"""


class PiNativeAdmissionContractTests(unittest.TestCase):
    def test_hook_source_is_executable_and_not_wired_to_settings(self):
        hook = ROOT / "tools/hooks/chanks-etapa.sh"
        self.assertTrue(hook.is_file())
        self.assertEqual(hook.stat().st_mode & 0o777, 0o755)
        self.assertNotIn("settings.json", hook.read_text(encoding="utf8"))
        self.assertNotIn("settings.json", Path(INSTALLER.__file__).read_text(encoding="utf8"))

    def test_hook_uses_external_radar_handles_spaces_and_only_valid_prior_transition(self):
        with tempfile.TemporaryDirectory() as location:
            directory = Path(location)
            repo = directory / "repo with spaces"
            repo.mkdir()
            subprocess.run(["git", "init", "--quiet", str(repo)], check=True, capture_output=True)
            bin_dir = directory / "installed tools"
            bin_dir.mkdir()
            radar = bin_dir / "radar"
            radar.write_text('#!/bin/sh\ncat "$CHANKS_STAGE_FILE"\n', encoding="utf8")
            radar.chmod(0o755)
            stage = directory / "stage.json"
            stage.write_text(json.dumps({"schema": "radar.etapa/v1", "etapa": 2, "nombre": "Prepare"}), encoding="utf8")
            env = {**os.environ, "PATH": f"{bin_dir}:/usr/bin:/bin", "CHANKS_STAGE_FILE": str(stage)}
            hook = INSTALLER.etapa_hook_source(ROOT)
            run = lambda extra=None: subprocess.run([str(hook)], cwd=repo, env={**env, **(extra or {})},
                                                      capture_output=True, text=True, timeout=15)
            self.assertEqual(run().returncode, 0)
            self.assertNotIn("💪 Chanks", run().stdout)
            previous = json.dumps({"schema": "radar.etapa/v1", "etapa": 2, "nombre": "Prepare", "sesion": "S1"})
            self.assertNotIn("💪 Chanks", run({"CHANKS_PREVIOUS_ETAPA_JSON": previous}).stdout)
            previous = json.dumps({"schema": "radar.etapa/v1", "etapa": 1, "nombre": "Define"})
            self.assertIn("💪 Chanks", run({"CHANKS_PREVIOUS_ETAPA_JSON": previous}).stdout)
            stage.write_text("invalid output", encoding="utf8")
            invalid = run({"CHANKS_PREVIOUS_ETAPA_JSON": previous})
            self.assertEqual(invalid.returncode, 0)
            self.assertNotIn("💪 Chanks", invalid.stdout)
            stage.write_text("x" * 5000, encoding="utf8")
            self.assertEqual(run().stdout, "")
            inside = repo / "radar"
            inside.write_text('#!/bin/sh\nprintf injected\n', encoding="utf8")
            inside.chmod(0o755)
            self.assertEqual(run({"PATH": f"{repo}:/usr/bin:/bin"}).stdout, "")

    def test_hook_payload_installs_with_mode_without_settings_wiring(self):
        with tempfile.TemporaryDirectory() as location:
            home = Path(location)
            (home / ".claude").mkdir()
            pending = INSTALLER.etapa_hook_changes(home, ROOT)
            self.assertEqual(len(pending), 1)
            self.assertEqual(pending[0].kind, "stage-hook")
            target = INSTALLER.etapa_hook_path(home)
            INSTALLER._atomic_copy(INSTALLER.etapa_hook_source(ROOT), target, home / ".claude")
            self.assertEqual(target.stat().st_mode & 0o777, 0o755)
            self.assertEqual(INSTALLER.etapa_hook_changes(home, ROOT), [])

    def test_tool_signature_hook_is_copied_but_never_wired_to_settings(self):
        with tempfile.TemporaryDirectory() as location:
            home = Path(location)
            (home / ".claude").mkdir()
            (home / ".claude/CLAUDE.md").write_bytes(
                INSTALLER.START_MARKER + b"\noriginal\n" + INSTALLER.END_MARKER + b"\n"
            )
            pi_agent = home / ".pi/agent"
            pi_agent.mkdir(parents=True)
            (pi_agent / "APPEND_SYSTEM.md").write_bytes(
                INSTALLER.START_MARKER + b"\noriginal\n" + INSTALLER.END_MARKER + b"\n"
            )
            settings = home / ".claude/settings.json"
            settings.write_text('{"hooks": {"PreToolUse": []}}', encoding="utf8")
            INSTALLER.apply(home, ROOT)
            target = home / ".claude/hooks/torre-firma.sh"
            self.assertEqual(target.read_bytes(), (ROOT / "tools/hooks/torre-firma.sh").read_bytes())
            self.assertEqual(target.stat().st_mode & 0o777, 0o755)
            self.assertEqual(settings.read_text(encoding="utf8"), '{"hooks": {"PreToolUse": []}}')
            self.assertEqual(INSTALLER.build_plan(home, ROOT), [])
            target.write_text("stale", encoding="utf8")
            self.assertIn(target, [change.path for change in INSTALLER.build_plan(home, ROOT)])

    def test_no_activation_tool_or_confirmation_path(self):
        body = INSTALLER.desired_pi_extension(ROOT).decode("utf8")
        self.assertNotIn('name: "chanks_request_activation"', body)
        self.assertNotIn("ctx.ui.confirm", body)
        self.assertIn('pi.on("tool_result"', body)


class PiAuthorityExtensionTests(unittest.TestCase):
    """Execute the generated extension against a real, disposable git repository and a fake
    `radar` on PATH — never text-match its policy. No external envelope exists any more: the
    switch and the organic admission are the extension's only two dependencies.
    """

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.home = Path(self.tempdir.name) / "home"
        self.home.mkdir()
        self.repo = Path(self.tempdir.name) / "repo"
        self.repo.mkdir()
        self._git("init", "--quiet")
        self._git("config", "user.email", "test@example.com")
        self._git("config", "user.name", "Test")
        (self.repo / "a.mjs").write_text("export const a = true\n", encoding="utf-8")
        (self.repo / "cimiento.mjs").write_text("export const c = true\n", encoding="utf-8")
        (self.repo / "openspec").mkdir()
        (self.repo / "openspec" / "plan.yaml").write_text("sesiones: []\n", encoding="utf-8")
        (self.repo / "openspec" / "ROADMAP.md").write_text("# roadmap\n", encoding="utf-8")
        self._git("add", "-A")
        self._git("commit", "--quiet", "-m", "seed")
        # The controls govern implementer worktrees only; the main working tree belongs to the
        # human. Every scenario below therefore runs from a linked worktree, and `self.main`
        # keeps the primary checkout for the tests that prove it stays free.
        self.main = self.repo
        self.repo = Path(self.tempdir.name) / "worktree"
        self._git_in(self.main, "worktree", "add", "--quiet", "-b", "implementer", str(self.repo))
        self._set_switch(True)

        self.bin = Path(self.tempdir.name) / "bin"
        self.bin.mkdir()
        self.radar = self.bin / "radar"
        self.stage = self.bin / "stage.json"
        self._stage(1, "Definir")
        self._write_radar([])

    def tearDown(self):
        self.tempdir.cleanup()

    def _git(self, *args):
        self._git_in(self.repo, *args)

    def _git_in(self, cwd, *args):
        subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True)

    def _switch_path(self):
        common = subprocess.run(
            ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
            cwd=self.repo, capture_output=True, text=True, check=True,
        ).stdout.strip()
        state_dir = Path(common) / "chanks" / "controls"
        state_dir.mkdir(parents=True, exist_ok=True)
        return state_dir / "switch.json"

    def _set_switch(self, on):
        self._switch_path().write_text(json.dumps({"on": on}), encoding="utf-8")

    def _stage(self, number, name, session=None):
        stage = {"schema": "radar.etapa/v1", "etapa": number, "nombre": name}
        if session:
            stage["sesion"] = session
        self.stage.write_text(json.dumps(stage), encoding="utf8")

    def _marker(self, session="S200", **overrides):
        common = subprocess.run(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
                                cwd=self.repo, capture_output=True, text=True, check=True).stdout.strip()
        branch = subprocess.run(["git", "symbolic-ref", "--quiet", "HEAD"], cwd=self.repo,
                                capture_output=True, text=True, check=True).stdout.strip()
        directory = Path(common) / "chanks/despachos"
        directory.mkdir(parents=True, exist_ok=True)
        marker = directory / (session + ".json")
        marker.write_text(json.dumps({"schema": "radar.despacho/v1", "sesion": session,
                                      "worktree": str(self.repo.resolve()), "branch": branch,
                                      "worker": "implementer-1", **overrides}), encoding="utf8")
        return marker

    def _write_radar(self, sessions, session_text="S200 — contrato", fail_commands=(), log=None):
        rows = json.dumps({"schema": "radar.snapshot/v1", "sesiones": sessions})
        record = ("printf '%s\\n' \"$1\" >> " + shlex.quote(str(log)) + "\n") if log else ""
        script = (
            "#!/bin/sh\n" + record
            + "case \"$1\" in\n"
            + ("  status) exit 66 ;;\n" if "status" in fail_commands else "  status) cat <<'JSON'\n" + rows + "\nJSON\n  ;;\n")
            + ("  sesion) exit 66 ;;\n" if "sesion" in fail_commands else "  sesion) printf '%s' " + shlex.quote(session_text) + "\n  ;;\n")
            + ("  etapa) exit 66 ;;\n" if "etapa" in fail_commands else "  etapa) cat " + shlex.quote(str(self.stage)) + "\n  ;;\n")
            + "  *) exit 64 ;;\n"
            "esac\n"
        )
        self.radar.write_text(script, encoding="utf-8")
        self.radar.chmod(0o755)

    def _env(self):
        env = os.environ.copy()
        env["PATH"] = f"{self.bin}{os.pathsep}{env.get('PATH', '')}"
        env["HOME"] = str(self.home)
        return env

    def _run_shim(self, scenario, cwd=None):
        INSTALLER.install_pi_extension(self.home, ROOT)
        package = self.home / "node_modules/@earendil-works/pi-ai"
        package.mkdir(parents=True, exist_ok=True)
        (package / "package.json").write_text(
            json.dumps({"name": "@earendil-works/pi-ai", "type": "module", "exports": "./index.js"}),
            encoding="utf-8",
        )
        (package / "index.js").write_text(
            "export const createReadTool = () => ({ description: 'read', parameters: {}, execute() {}, renderResult() {} });\n"
            "export const createBashTool = () => ({ description: 'bash', parameters: {}, execute() {}, renderResult() {} });\n"
            "export const Type = {\n"
            "  Object: (properties, options = {}) => ({ type: 'object', properties, ...options }),\n"
            "  String: () => ({ type: 'string' }),\n"
            "  Optional: (schema) => ({ ...schema, optional: true }),\n"
            "};\n",
            encoding="utf-8",
        )
        coding = self.home / "node_modules/@earendil-works/pi-coding-agent"
        coding.mkdir(parents=True, exist_ok=True)
        (coding / "package.json").write_text(json.dumps({"name": "@earendil-works/pi-coding-agent", "type": "module", "exports": "./index.js"}), encoding="utf8")
        (coding / "index.js").write_text(
            "export const createReadToolDefinition = () => ({ name: 'read', description: 'read', parameters: {}, execute() {}, renderCall(args) { return { render: () => ['read ' + args.path] } }, renderResult() {} });\n"
            "export const createBashToolDefinition = () => ({ name: 'bash', description: 'bash', parameters: {}, execute() {}, renderCall(args) { return { render: () => ['bash ' + args.command] } }, renderResult() {} });\n",
            encoding="utf8",
        )
        tui = self.home / "node_modules/@earendil-works/pi-tui"
        tui.mkdir(parents=True, exist_ok=True)
        (tui / "package.json").write_text(json.dumps({"name": "@earendil-works/pi-tui", "type": "module", "exports": "./index.js"}), encoding="utf8")
        (tui / "index.js").write_text("export class Text { constructor(text) { this.text = text } render() { return [this.text] } }; export class Container { children = []; addChild(c) { this.children.push(c) } render(w) { return this.children.flatMap(c => c.render(w)) } }\n", encoding="utf8")
        runner = self.home / "run-shim.mjs"
        runner.write_text(RUN_SHIM_SOURCE, encoding="utf-8")
        run = subprocess.run(
            ["bun", str(runner), str(INSTALLER.pi_extension_path(self.home)), json.dumps(scenario)],
            capture_output=True,
            text=True,
            cwd=cwd or self.repo,
            env=self._env(),
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        return json.loads(run.stdout)

    def _default_scenario(self, **overrides):
        scenario = {"hasUI": True, "confirmation": True}
        scenario.update(overrides)
        return scenario

    def test_inline_request_badges_and_per_session_stage_observations(self):
        self._set_switch(False)
        skill_root = self.home / ".agents/skills"
        skill = skill_root / "chanks-3-session-kickoff/SKILL.md"
        skill.parent.mkdir(parents=True)
        skill.write_text("# safe", encoding="utf8")
        outside = self.home / "elsewhere/SKILL.md"
        outside.parent.mkdir()
        outside.write_text("# untrusted", encoding="utf8")
        observations = [
            {"command": "radar etapa", "output": {"schema": "radar.etapa/v1", "sesion": "S164", "etapa": 1, "nombre": "Definir"}},
            {"command": "radar etapa S164", "output": {"schema": "radar.etapa/v1", "sesion": "S164", "etapa": 1, "nombre": "Definir"}},
            {"command": "radar etapa S165", "output": {"schema": "radar.etapa/v1", "sesion": "S165", "etapa": 2, "nombre": "Preparar"}},
            {"command": "radar etapa S164", "output": {"schema": "radar.etapa/v1", "sesion": "S165", "etapa": 9, "nombre": "Falso"}},
            {"command": "radar etapa S164", "output": {"schema": "radar.etapa/v1", "sesion": "S164", "etapa": 2, "nombre": "Preparar"}},
        ]
        outcome = self._run_shim({"bashCommand": "radar etapa S164 -C .", "stageCalls": observations, "skillPath": str(skill)})
        self.assertIn("🗼 Torre · radar etapa · solicitado", outcome["displayed"].get(outcome["before"]["bash"]["id"], str(outcome["tools"])))
        self.assertIn("💪 Chanks · chanks-3-session-kickoff · lectura solicitada", outcome["displayed"][outcome["skillRead"]["id"]])
        self.assertEqual(outcome["messages"].count("💪 Chanks · Etapa 2 · Preparar"), 1)
        self.assertFalse(any("Radar etapa ·" in message or "🗼 Torre · radar etapa" in message for message in outcome["messages"]))
        self.assertNotIn("💪 Chanks · Etapa 9 · Falso", outcome["messages"])
        self.assertEqual(outcome["tools"], [])  # quiet-tools owns read/bash, not Chanks
        self.assertEqual(outcome["annotations"], ["read", "bash"])
        self.assertEqual(outcome["before"]["bash"]["input"]["command"], "radar etapa S164 -C .")
        forged = self._run_shim({"skillPath": str(outside), "bashCommand": "false && radar etapa S164"})
        self.assertNotIn("💪 Chanks", forged["displayed"][forged["skillRead"]["id"]])
        self.assertNotIn("🗼 Torre", forged["displayed"][forged["before"]["bash"]["id"]])
        skill.unlink()
        skill.symlink_to(outside)
        escaped = self._run_shim({"skillPath": str(skill)})
        self.assertNotIn("💪 Chanks", escaped["displayed"][escaped["skillRead"]["id"]])
        skill.unlink()
        skill.write_text("# safe again", encoding="utf8")
        alias = self.home / "alias-skill.md"
        alias.symlink_to(skill)
        aliased = self._run_shim({"skillPath": str(alias)})
        self.assertNotIn("💪 Chanks", aliased["displayed"][aliased["skillRead"]["id"]])
        self._set_switch(True)
        confined = self._run_shim({"bashCommand": "radar etapa S164 -C ."})
        command = confined["before"]["bash"]["input"]["command"]
        self.assertIn("/usr/bin/bwrap", command)
        label = confined["displayed"][confined["before"]["bash"]["id"]]
        self.assertIn("radar etapa S164 -C .", label)
        self.assertNotIn("/usr/bin/bwrap", label)

    def test_stage_failure_or_invalid_schema_cannot_become_a_transition(self):
        self._set_switch(False)
        prior = {"schema": "radar.etapa/v1", "sesion": "S200", "etapa": 1, "nombre": "Definir"}
        bad = [
            {"command": "radar etapa S200", "output": prior},
            {"command": "radar etapa", "output": {**prior, "etapa": 2}},
            {"command": "radar etapa S200", "output": {**prior, "schema": "other/v1", "etapa": 2}},
            {"command": "radar etapa S200", "output": {**prior, "sesion": "S201", "etapa": 2}},
        ]
        result = self._run_shim({"stageCalls": bad})
        self.assertFalse(any("💪 Chanks · Etapa" in m for m in result["messages"]))
        error = self._run_shim({"errorResult": True, "stageCalls": [bad[0], {"command": "radar etapa S200", "output": {**prior, "etapa": 2}}]})
        self.assertFalse(any("💪 Chanks · Etapa" in m for m in error["messages"]))

    def test_direct_radar_identity_is_inline_independent_of_switch_and_not_replayed(self):
        for on in (False, True):
            self._set_switch(on)
            outcome = self._run_shim(self._default_scenario(
                bashCommand="radar sesion S163 -C .", blockedRadar=True, replayRadarResult=True))
            self.assertTrue(outcome["rejectedRadar"]["duplicate"]["result"]["block"])
            self.assertTrue(outcome["rejectedRadar"]["missingId"]["result"]["block"])
            self.assertEqual(outcome["before"]["bash"]["result"], {})
            self.assertIn("🗼 Torre · radar sesion · solicitado", outcome["displayed"][outcome["before"]["bash"]["id"]])
            self.assertNotIn("🗼 Torre · radar sesion", outcome["messages"])
            for kind in ("planWrite", "planEdit"):
                self.assertEqual(outcome["before"][kind]["result"].get("block", False), on)
                signature = "🗼 Torre · plan.yaml " + ("write" if kind == "planWrite" else "edit")
                self.assertEqual(outcome["messages"].count(signature), 0 if on else 1)
            self.assertFalse(any("radar etapa" in message or "Radar etapa" in message for message in outcome["messages"]))

    def test_failed_matching_bash_result_retains_request_identity_only(self):
        self._set_switch(False)
        for error in (True, False):
            outcome = self._run_shim({"bashCommand": "radar status", "errorResult": error, "replayRadarResult": True})
            self.assertIn("🗼 Torre · radar status · solicitado", outcome["displayed"][outcome["before"]["bash"]["id"]])
            self.assertFalse(any("🗼 Torre · radar status" in message for message in outcome["messages"]))

    def test_failed_matching_plan_result_does_not_emit_tower_signature(self):
        self._set_switch(False)
        failed = self._run_shim(self._default_scenario(errorResult=True))
        successful = self._run_shim(self._default_scenario())
        for kind, action in (("planWrite", "write"), ("planEdit", "edit")):
            signature = f"🗼 Torre · plan.yaml {action}"
            self.assertEqual(failed["before"][kind]["result"], {})
            self.assertNotIn(signature, failed["messagesAtCall"])
            self.assertNotIn(signature, failed["messages"])
            self.assertEqual(successful["messages"].count(signature), 1)

    def test_agent_end_does_not_poll_radar_or_announce_stage(self):
        log = self.bin / "radar-calls"
        self._write_radar([], log=log)
        outcome = self._run_shim({"stageAgain": True})
        self.assertEqual(outcome["messages"], [])
        self.assertFalse(log.exists())

    def test_admission_calls_status_and_sesion_without_inline_tool_or_stage_notices(self):
        self._marker()
        row = {"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}
        log = self.bin / "radar-calls"
        self._write_radar([row], log=log)
        success = self._run_shim({"path": str(self.repo / "a.mjs")})
        calls = log.read_text(encoding="utf8").splitlines()
        self.assertFalse(success["write"]["result"].get("block", False))
        for command in ("status", "sesion"):
            self.assertGreater(calls.count(command), 0)
            self.assertNotIn("🗼 Torre · radar " + command, success["messages"])
        self.assertNotIn("etapa", calls)
        for failing in ("status", "sesion"):
            log.write_text("", encoding="utf8")
            self._write_radar([row], fail_commands=(failing,), log=log)
            stopped = self._run_shim({"path": str(self.repo / "a.mjs")})
            self.assertTrue(stopped["write"]["result"].get("block", False))
            calls = log.read_text(encoding="utf8").splitlines()
            self.assertFalse(any("🗼 Torre · radar " in message for message in stopped["messages"]))

    def test_false_and_true_conditional_bash_never_claim_a_child_was_run(self):
        self._set_switch(False)
        log = self.bin / "radar-calls"
        self._write_radar([], log=log)
        for command in ("false && radar status", "true && radar status"):
            outcome = self._run_shim({"bashCommand": command})
            self.assertEqual(outcome["before"]["bash"]["input"]["command"], command)
            self.assertEqual(outcome["before"]["bash"]["result"], {})
            self.assertNotIn("🗼 Torre · radar status", outcome["messages"])
        before = log.read_text(encoding="utf8") if log.exists() else ""
        false_command = subprocess.run(["bash", "-c", "false && radar status"],
                                       cwd=self.repo, env=self._env(), capture_output=True, text=True)
        self.assertNotEqual(false_command.returncode, 0)
        self.assertEqual(log.read_text(encoding="utf8") if log.exists() else "", before)

    def test_unfinished_request_has_inline_label_without_a_completion_notice(self):
        self._set_switch(False)
        pending = self._run_shim({"bashCommand": "radar status", "withholdRadarResult": True})
        self.assertIn("🗼 Torre · radar status · solicitado", pending["displayed"][pending["before"]["bash"]["id"]])
        self.assertNotIn("🗼 Torre · radar status", pending["messages"])

    def test_switch_off_registers_handlers_but_stays_inert(self):
        # The extension is inside a git repository, so it always registers its handlers
        # (R4-switch-evaluated-once-at-load): the switch itself is what stays inert, checked
        # fresh on every tool_call rather than once at load. Observable behavior is unchanged —
        # nothing asks or blocks, and bash passes through with its command untouched.
        self._set_switch(False)
        outcome = self._run_shim(self._default_scenario())
        self.assertTrue(outcome["registered"])
        for name in ("read", "write", "edit", "bash", "activationDispatch"):
            self.assertEqual(outcome["before"][name]["result"], {})
        self.assertEqual(outcome["before"]["bash"]["input"]["command"], "printf before")
        self.assertEqual(outcome["tools"], [])

    def test_switch_on_without_a_plan_is_also_inert(self):
        (self.repo / "openspec" / "plan.yaml").unlink()
        outcome = self._run_shim(self._default_scenario())
        self.assertTrue(outcome["registered"])
        for name in ("read", "write", "edit", "bash"):
            self.assertEqual(outcome["before"][name]["result"], {})
        self.assertEqual(outcome["before"]["bash"]["input"]["command"], "printf before")

    def test_no_key_allows_reads_confines_bash_read_only_and_blocks_writes(self):
        outcome = self._run_shim(self._default_scenario())
        self.assertTrue(outcome["registered"])
        self.assertEqual(outcome["before"]["read"]["result"], {})
        self.assertTrue(outcome["before"]["write"]["result"].get("block", False))
        self.assertTrue(outcome["before"]["edit"]["result"].get("block", False))
        self.assertTrue(outcome["before"]["activationDispatch"]["result"].get("block"))
        self.assertEqual(outcome["before"]["bash"]["result"], {})
        confined = outcome["before"]["bash"]["input"]["command"]
        self.assertIn("/usr/bin/bwrap", confined)
        self.assertIn("--ro-bind", confined)
        self.assertNotIn("--bind", confined)
        self.assertNotEqual(confined, "printf before")
        self.assertEqual(outcome["tools"], [])

    def test_admitted_bash_remains_read_only_and_reports_write_failure(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
        original = (self.repo / "a.mjs").read_text(encoding="utf8")
        outcome = self._run_shim({"path": str(self.repo / "a.mjs"),
                                  "bashCommand": "printf inspection; echo changed > " + shlex.quote(str(self.repo / "a.mjs"))})
        command = outcome["before"]["bash"]["input"]["command"]
        self.assertIn("--ro-bind", command)
        self.assertNotIn("'--bind'", command)
        result = subprocess.run(["bash", "-c", command], cwd=self.repo,
                                capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("inspection", result.stdout)
        self.assertEqual((self.repo / "a.mjs").read_text(encoding="utf8"), original)

    def test_no_key_room_hides_host_unix_sockets_and_environment(self):
        # A read-only bind does not stop connect() on a socket inode: a host daemon reachable
        # through /tmp or /run could write on the agent's behalf. The room must hide both
        # directories and must not inherit the host environment.
        import socket
        socket_dir = Path(tempfile.mkdtemp(prefix="chanks-sock-", dir="/tmp"))
        self.addCleanup(shutil.rmtree, socket_dir, True)
        socket_path = socket_dir / "daemon.sock"
        server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.addCleanup(server.close)
        server.bind(str(socket_path))
        server.listen(1)
        outcome = self._run_shim(self._default_scenario())
        confined = outcome["before"]["bash"]["input"]["command"]
        probe = confined.replace(
            "'printf before'",
            f"'test -e {socket_path} && echo socket-visible; echo leaked=${{CHANKS_ROOM_SENTINEL:-}}'",
        )
        self.assertNotEqual(probe, confined)
        result = subprocess.run(
            ["bash", "-c", probe], capture_output=True, text=True,
            env={**os.environ, "CHANKS_ROOM_SENTINEL": "host"}, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("socket-visible", result.stdout)
        self.assertIn("leaked=\n", result.stdout)

    def test_no_key_room_keeps_a_worktree_under_tmp_visible(self):
        # Hiding /tmp and /run must not hide the repository the room exists to inspect.
        repo = Path(tempfile.mkdtemp(prefix="chanks-worktree-", dir="/tmp")).resolve()
        self.addCleanup(shutil.rmtree, repo, True)
        (repo / "marker.txt").write_text("visible\n")
        outcome = self._run_shim(self._default_scenario())
        confined = outcome["before"]["bash"]["input"]["command"]
        confined = confined.replace(str(self.repo.resolve()), str(repo))
        probe = confined.replace("'printf before'", "'pwd; cat marker.txt'")
        self.assertNotEqual(probe, confined)
        result = subprocess.run(
            ["bash", "-c", probe], capture_output=True, text=True, cwd=repo, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, f"{repo}\nvisible\n")

    def test_starting_pi_in_a_subdirectory_still_applies_the_gate(self):
        subdirectory = self.repo / "agent-workflows"
        subdirectory.mkdir()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
        outcome = self._run_shim(self._default_scenario(), cwd=subdirectory)
        self.assertTrue(outcome["registered"])
        self.assertEqual(outcome["before"]["read"]["result"], {})
        self.assertTrue(outcome["before"]["write"]["result"].get("block", False))
        confined = outcome["before"]["bash"]["input"]["command"]
        self.assertIn("/usr/bin/bwrap", confined)

    def test_no_key_room_chdirs_to_the_actual_working_directory_not_the_repo_root(self):
        subdirectory = self.repo / "agent-workflows"
        subdirectory.mkdir()
        outcome = self._run_shim(self._default_scenario(), cwd=subdirectory)
        confined = outcome["before"]["bash"]["input"]["command"]
        probe = confined.replace("'printf before'", "'pwd'")
        self.assertNotEqual(probe, confined)
        result = subprocess.run(
            ["bash", "-c", probe], capture_output=True, text=True, cwd=subdirectory, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, f"{subdirectory.resolve()}\n")

    def test_switch_and_plan_apply_from_a_subdirectory_even_though_they_live_at_the_repo_root(self):
        # Before the fix, planExists() joined "openspec/plan.yaml" onto the subdirectory itself,
        # so the switch always looked ineffective from anywhere but the true repository root.
        subdirectory = self.repo / "agent-workflows" / "chanks"
        subdirectory.mkdir(parents=True)
        outcome = self._run_shim(self._default_scenario(), cwd=subdirectory)
        self.assertTrue(outcome["registered"])

    def test_main_working_tree_is_inert_even_with_the_switch_on_and_no_key(self):
        # The human drives Main and Support directly; only implementer worktrees are confined.
        # With the switch on and no key, Main still writes and runs bash with its full
        # environment, exactly as if this extension were absent.
        outcome = self._run_shim(self._default_scenario(), cwd=self.main)
        for name in ("read", "write", "edit", "bash", "activationDispatch"):
            self.assertEqual(outcome["before"][name]["result"], {})
        self.assertEqual(outcome["before"]["bash"]["input"]["command"], "printf before")
        self.assertEqual(outcome["tools"], [])

    def test_main_working_tree_subdirectory_is_also_inert(self):
        subdirectory = self.main / "agent-workflows"
        subdirectory.mkdir()
        outcome = self._run_shim(self._default_scenario(), cwd=subdirectory)
        self.assertEqual(outcome["before"]["write"]["result"], {})
        self.assertEqual(outcome["before"]["bash"]["input"]["command"], "printf before")

    def test_cwd_outside_any_git_repository_is_inert(self):
        with tempfile.TemporaryDirectory() as not_a_repo:
            outcome = self._run_shim(self._default_scenario(), cwd=Path(not_a_repo))
        self.assertTrue(outcome["registered"])
        for name in ("read", "write", "edit", "bash", "activationDispatch"):
            self.assertEqual(outcome["before"][name]["result"], {})

    def test_ordinary_worker_auto_admits_exact_path_and_blocks_every_other_file(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
        outcome = self._run_shim({"path": str(self.repo / "a.mjs"),
                                  "afterPath": str(self.repo / "openspec/plan.yaml")})
        self.assertEqual(outcome["tools"], [])
        self.assertEqual(outcome["write"]["result"], {})
        self.assertTrue(outcome["write"]["input"]["path"].startswith("/proc/self/fd/"))
        self.assertTrue(outcome["after"]["result"].get("block"))

    def test_shared_resource_and_planning_path_remain_blocked(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"],
                            "recurso": ["exclusive"]}])
        outcome = self._run_shim({"path": str(self.repo / "a.mjs")})
        self.assertTrue(outcome["write"]["result"].get("block"))
        self.assertIn("reserva/adquisición", outcome["write"]["result"]["reason"])
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
        outcome = self._run_shim({"path": str(self.repo / "openspec/plan.yaml")})
        self.assertTrue(outcome["write"]["result"].get("block"))

    def test_radar_drift_between_calls_blocks_even_when_file_is_still_declared(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
        replacement = self.radar.read_text(encoding="utf8").replace("S200 — contrato", "S200 changed")
        outcome = self._run_shim({"path": str(self.repo / "a.mjs"),
                                  "afterPath": str(self.repo / "a.mjs"),
                                  "betweenWritesReplace": {"path": str(self.radar), "content": replacement}})
        self.assertFalse(outcome["write"]["result"].get("block", False))
        self.assertTrue(outcome["after"]["result"].get("block", False))

    def test_ui_choices_cannot_activate_and_there_is_no_model_tool(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
        for choice in (True, False, None, "throw"):
            with self.subTest(choice=choice):
                outcome = self._run_shim({"hasUI": bool(choice), "confirmation": choice,
                                          "path": str(self.repo / "a.mjs")})
                self.assertEqual(outcome["tools"], [])
                self.assertEqual(outcome["write"]["result"], {})
                self.assertTrue(outcome["before"]["activationDispatch"]["result"].get("block"))

    def test_absent_or_blocked_radar_row_never_selects_a_different_session(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "BLOQUEADO", "archivos": ["a.mjs"]},
                           {"id": "S201", "estado": "LISTO", "archivos": ["a.mjs"]}])
        outcome = self._run_shim({"path": str(self.repo / "a.mjs")})
        self.assertTrue(outcome["write"]["result"].get("block"))

    def test_activation_tool_is_blocked_as_an_unknown_tool(self):
        outcome = self._run_shim({})
        self.assertEqual(outcome["tools"], [])
        self.assertTrue(outcome["before"]["activationDispatch"]["result"].get("block"))

    def test_same_file_collision_survives_authority_replacement_while_old_lease_is_open(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
        replacement = self.radar.read_text(encoding="utf8").replace("S200 — contrato", "S200 changed")
        outcome = self._run_shim({"path": str(self.repo / "a.mjs"), "complete": False,
                                  "afterPath": str(self.repo / "a.mjs"),
                                  "thirdPath": str(self.repo / "a.mjs"),
                                  "betweenWritesReplace": {"path": str(self.radar), "content": replacement},
                                  "shutdown": "quit"})
        self.assertFalse(outcome["write"]["result"].get("block", False))
        self.assertTrue(outcome["after"]["result"].get("block"))
        self.assertTrue(outcome["third"]["result"].get("block"))
        self.assertFalse(outcome["fdAfterShutdown"])

    def test_global_same_path_collision_remains_blocked_after_live_authority_invalidates(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs", "cimiento.mjs"]}])
        outcome = self._run_shim({"path": str(self.repo / "a.mjs"), "complete": False,
                                  "replaceInode": str(self.repo / "retained.mjs"),
                                  "afterPath": str(self.repo / "cimiento.mjs"),
                                  "thirdPath": str(self.repo / "a.mjs"), "shutdown": "quit"})
        self.assertFalse(outcome["write"]["result"].get("block", False))
        self.assertTrue(outcome["after"]["result"].get("block"))
        self.assertTrue(outcome["third"]["result"].get("block"))
        self.assertFalse(outcome["fdAfterShutdown"])

    def test_duplicate_identity_and_unknown_completion_never_authorize(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
        outcome = self._run_shim({"path": str(self.repo / "a.mjs"), "duplicate": True,
                                  "resultToolName": "read", "afterPath": str(self.repo / "a.mjs")})
        self.assertTrue(outcome["duplicate"]["result"].get("block"))
        self.assertTrue(outcome["after"]["result"].get("block"))

    def test_off_to_on_completion_stays_bound_to_off_call(self):
        self._set_switch(False)
        outcome = self._run_shim({"path": str(self.repo / "a.mjs"),
                                  "switchOnBeforeResult": True,
                                  "switchPath": str(self._switch_path()),
                                  "afterPath": str(self.repo / "a.mjs")})
        self.assertEqual(outcome["write"]["result"], {})
        self.assertEqual(outcome["after"]["result"].get("block"), True)

    def test_switch_off_mid_session_bypasses_next_call_without_leaking_prior_authority(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
        outcome = self._run_shim({"path": str(self.repo / "a.mjs"),
                                  "switchOffBeforeResult": True,
                                  "switchPath": str(self._switch_path()),
                                  "afterPath": str(self.repo / "not-declared.mjs")})
        self.assertEqual(outcome["write"]["result"], {})
        self.assertEqual(outcome["after"]["result"], {})

    def test_error_result_releases_exact_descriptor_and_duplicate_result_is_inert(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
        outcome = self._run_shim({"path": str(self.repo / "a.mjs"), "errorResult": True,
                                  "duplicate": True})
        self.assertEqual(outcome["write"]["result"], {})
        self.assertFalse(outcome["fdAfterResult"])
        self.assertTrue(outcome["duplicate"]["result"].get("block"))

    def test_shutdown_closes_in_flight_lease_for_every_reason(self):
        self._marker()
        self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
        for reason in ("quit", "reload", "new", "resume", "fork"):
            with self.subTest(reason=reason):
                outcome = self._run_shim({"path": str(self.repo / "a.mjs"), "complete": False,
                                          "shutdown": reason})
                self.assertEqual(outcome["write"]["result"], {})
                self.assertFalse(outcome["fdAfterShutdown"])

    def test_descriptor_effect_remains_on_retained_inode_after_symlink_swap_for_write_and_edit(self):
        for tool in ("write", "edit"):
            with self.subTest(tool=tool):
                self._marker()
                self._write_radar([{"id": "S200", "estado": "LISTO", "archivos": ["a.mjs"]}])
                original = (self.repo / "a.mjs").read_text(encoding="utf8")
                target = self.repo / "cimiento.mjs"
                prior = target.read_text(encoding="utf8")
                retained = self.repo / "retained.mjs"
                outcome = self._run_shim({"path": str(self.repo / "a.mjs"), "toolName": tool,
                                          "swapTarget": str(target), "swapRetained": str(retained)})
                self.assertEqual(outcome["write"]["result"], {})
                self.assertEqual(target.read_text(encoding="utf8"), prior)
                self.assertEqual(retained.read_text(encoding="utf8"), "changed")
                (self.repo / "a.mjs").unlink()
                retained.rename(self.repo / "a.mjs")
                (self.repo / "a.mjs").write_text(original, encoding="utf8")

    def test_main_tree_does_not_poll_and_can_observe_only_explicit_stage_results(self):
        sequence = [
            {"command": "radar etapa S200", "output": {"schema": "radar.etapa/v1", "sesion": "S200", "etapa": 1, "nombre": "Definir"}},
            {"command": "radar etapa S200", "output": {"schema": "radar.etapa/v1", "sesion": "S200", "etapa": 2, "nombre": "Preparar"}},
        ]
        outcome = self._run_shim({"stageAgain": True, "stageCalls": sequence}, cwd=self.main)
        self.assertEqual([m for m in outcome["messages"] if "💪 Chanks" in m], ["💪 Chanks · Etapa 2 · Preparar"])
        self.assertEqual(outcome["tools"], [])

    def test_generated_shim_never_exposes_a_raw_grant_or_reimplements_pi_controls(self):
        body = INSTALLER.desired_pi_extension(ROOT).decode("utf8")
        self.assertIn("crearAutoridadPi", body)
        self.assertIn("buildAdmission", body)
        self.assertIn("effectiveSwitch", body)
        self.assertNotIn("CHANKS_PI_ADMISSION", body)
        self.assertNotIn("pi.chanksAutoridad", body)
        self.assertNotIn("pi.chanksConfinamiento", body)
        self.assertNotIn("gobernar(pi.", body)