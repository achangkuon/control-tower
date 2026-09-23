import hashlib
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

    def test_hyphenated_retired_skill_is_actually_retired(self):
        # Listed only under the underscore spelling, it matched no directory on disk.
        retired = INSTALLER.runtime_skill_roots(self.home)[0] / "coordinador-multi-agente"
        retired.mkdir(parents=True)
        (retired / "SKILL.md").write_bytes(b"stale\n")
        self.assertNotEqual(INSTALLER.build_plan(self.home, ROOT), [])
        INSTALLER.apply(self.home, ROOT)
        self.assertFalse(retired.exists())
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])


class SessionDocSchemaTest(unittest.TestCase):
    """The oneOf contract gates session closure, so its matrix is pinned here."""

    SCHEMA = ROOT / "skills/chanks-7-session-doc/assets/session-doc.schema.json"
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
    """S144: Pi auto-discovers only *.ts, so the .mjs adapter needs a shim.

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

    def test_shim_imports_the_revocable_authority_and_never_reimplements_controls(self):
        body = INSTALLER.desired_pi_extension(ROOT).decode("utf8")
        self.assertIn("pi-authority.mjs", body)
        self.assertIn("crearAutoridadPi", body)
        # The shim requests host confirmation and delegates control decisions to its capability.
        for rule in ["bwrap", "--ro-bind"]:
            self.assertNotIn(rule, body)

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
        self.assertIn(str((ROOT / "chanks/pi-authority.mjs").resolve()), body)


class PiAuthorityExtensionTests(unittest.TestCase):
    """Execute the generated extension against a minimal Pi host, never text-match its policy."""

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.home = Path(self.tempdir.name)
        self.live = self.home / "host-live"
        self.live.mkdir()
        self.head = self.live / "head"
        self.status = self.live / "status.json"
        self.session = self.live / "session.json"
        self.head.write_text("a" * 40 + "\n", encoding="utf-8")
        self.status.write_text('{"schema":"radar.snapshot/v1"}\n', encoding="utf-8")
        self.session.write_text('{"sessionId":"S151"}\n', encoding="utf-8")
        self.host_bin = self.home / "host-bin"
        self.host_bin.mkdir()
        self.git = self.host_bin / "git"
        self.radar = self.host_bin / "radar"
        self.git.write_text("#!/bin/sh\n/bin/cat " + shlex.quote(str(self.head)) + "\n", encoding="utf-8")
        self.radar.write_text(
            "#!/bin/sh\ncase \"$1\" in\n"
            + "status) /bin/cat " + shlex.quote(str(self.status)) + ";;\n"
            + "sesion) /bin/cat " + shlex.quote(str(self.session)) + ";;\n"
            + "*) exit 64;;\nesac\n",
            encoding="utf-8",
        )
        self.git.chmod(0o755)
        self.radar.chmod(0o755)
        self.identity = self.home / "live-identity.json"

    def tearDown(self):
        self.tempdir.cleanup()

    @staticmethod
    def _digest(path):
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def _bundle(self):
        root = ROOT.parent.resolve()
        authorized = str((root / "agent-workflows/tools/install.py").resolve())
        return {
            "repositoryRoot": str(root),
            "sessionId": "S151",
            "baseCommit": self.head.read_text(encoding="utf-8").strip(),
            "candidateDigest": "b" * 64,
            "runtimeIdentity": "pi-test-runtime",
            "radar": {"statusDigest": self._digest(self.status), "sessionDigest": self._digest(self.session)},
            "authorizedFiles": [authorized],
            "cimientoGrants": [authorized],
            "resources": [{"id": "isolated-pi", "mode": "exclusive", "confirmed": True}],
        }

    def _identity(self, admission=None):
        admission = admission or self._bundle()
        return {
            "repositoryRoot": admission["repositoryRoot"],
            "sessionId": admission["sessionId"],
            "baseCommit": admission["baseCommit"],
            "candidateDigest": admission["candidateDigest"],
            "runtimeIdentity": admission["runtimeIdentity"],
            "statusDigest": admission["radar"]["statusDigest"],
            "sessionDigest": admission["radar"]["sessionDigest"],
        }

    def _envelope(self, admission):
        self.identity.write_text(json.dumps(self._identity(admission)), encoding="utf-8")
        return {
            "admission": admission,
            "radarExecutable": str(self.radar),
            "gitExecutable": str(self.git),
            "identityFile": str(self.identity),
        }

    def _run_shim(self, *, admission=None, envelope=None, has_ui=True, confirmation=True, shutdown=None,
                  mutate_head=None, mutate_status=None, mutate_session=None, mutate_identity=None,
                  replace_identity=None, ordered_activation=False):
        INSTALLER.install_pi_extension(self.home, ROOT)
        package = self.home / "node_modules/@earendil-works/pi-ai"
        package.mkdir(parents=True, exist_ok=True)
        (package / "package.json").write_text(
            json.dumps({"name": "@earendil-works/pi-ai", "type": "module", "exports": "./index.js"}),
            encoding="utf-8",
        )
        (package / "index.js").write_text(
            "export const Type = { Object: (properties, options = {}) => ({ type: 'object', properties, ...options }) };\n",
            encoding="utf-8",
        )
        runner = self.home / "run-shim.mjs"
        runner.write_text(
            """
import { readlinkSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
const extension = (await import(process.argv[2])).default
const scenario = JSON.parse(process.argv[3])
const handlers = {}
let tool
const confirmations = []
const pi = {
  on(name, handler) { (handlers[name] ??= []).push(handler) },
  registerTool(definition) { tool = definition },
}
const ctx = {
  hasUI: scenario.hasUI,
  ui: {
    async confirm(title, message) {
      confirmations.push({ title, message })
      if (scenario.confirmation === 'throw') throw new Error('cancelled UI')
      return scenario.confirmation
    },
  },
}
extension(pi)
const dispatch = async (event) => {
  for (const handler of handlers.tool_call ?? []) {
    const result = await handler(event, ctx)
    if (result?.block) return result
  }
  return {}
}
const call = async (command) => {
  const event = { type: 'tool_call', toolName: 'bash', input: { command } }
  const result = await dispatch(event)
  return { result, input: event.input }
}
const modelArguments = {
  approved: true,
  repositoryRoot: '/model-must-not-grant',
  command: 'model-must-not-confine',
  gitExecutable: '/model-must-not-select-git',
  radarExecutable: '/model-must-not-select-radar',
  runtimeIdentity: 'model-must-not-select-runtime',
  identityFile: '/model-must-not-select-identity',
}
const before = await call('printf before')
let activation
let ordered
if (scenario.orderedActivation) {
  ordered = {}
  for (const [name, input] of [
    ['write', { path: '/model-write' }], ['edit', { path: '/model-edit' }],
    ['bash', { command: 'printf blocked' }], ['Chanks_Request_Activation', {}],
    ['chanks_request_activation_alias', {}], ['unknown_mutation', {}],
    ['chanks_request_activation', { approved: true }],
  ]) ordered[name] = await dispatch({ type: 'tool_call', toolName: name, input })
  const gate = await dispatch({ type: 'tool_call', toolName: 'chanks_request_activation', input: {} })
  activation = gate.block
    ? { content: [{ type: 'text', text: 'Blocked before activation execute.' }], details: undefined }
    : await tool.execute('model-call', modelArguments, undefined, undefined, ctx)
} else {
  activation = await tool.execute('model-call', modelArguments, undefined, undefined, ctx)
}
if (scenario.mutateHead !== null) writeFileSync(scenario.headPath, scenario.mutateHead)
if (scenario.mutateStatus !== null) writeFileSync(scenario.statusPath, scenario.mutateStatus)
if (scenario.mutateSession !== null) writeFileSync(scenario.sessionPath, scenario.mutateSession)
if (scenario.mutateIdentity !== null) writeFileSync(scenario.identityFile, scenario.mutateIdentity)
if (scenario.replaceIdentity !== null) {
  const replacement = `${scenario.identityFile}.replacement`
  writeFileSync(replacement, scenario.replaceIdentity)
  renameSync(replacement, scenario.identityFile)
}
const after = await call('printf allowed')
let afterShutdown
if (scenario.shutdown) {
  for (const handler of handlers.session_shutdown ?? []) await handler({ type: 'session_shutdown', reason: scenario.shutdown }, ctx)
  for (const handler of handlers.session_start ?? []) await handler({ type: 'session_start', reason: 'resume' }, ctx)
  afterShutdown = await call('printf after-shutdown')
}
const proofDescriptors = () => readdirSync('/proc/self/fd').filter((fd) => {
  try { return readlinkSync(`/proc/self/fd/${fd}`) === scenario.identityFile } catch { return false }
})
console.log(JSON.stringify({
  tool: { name: tool.name, executionMode: tool.executionMode, parameters: tool.parameters },
  before, activation, after, afterShutdown, confirmations, ordered,
  envConsumed: process.env.CHANKS_PI_ADMISSION === undefined,
  proofDescriptors: proofDescriptors(),
}))
""",
            encoding="utf-8",
        )
        env = os.environ.copy()
        if admission is None and envelope is None:
            env.pop("CHANKS_PI_ADMISSION", None)
        else:
            payload = envelope if envelope is not None else (
                admission if isinstance(admission, str) else self._envelope(admission)
            )
            env["CHANKS_PI_ADMISSION"] = payload if isinstance(payload, str) else json.dumps(payload)
        run = subprocess.run(
            ["bun", str(runner), str(INSTALLER.pi_extension_path(self.home)), json.dumps({
                "hasUI": has_ui, "confirmation": confirmation, "shutdown": shutdown,
                "headPath": str(self.head), "statusPath": str(self.status), "sessionPath": str(self.session),
                "identityFile": str(self.identity), "mutateIdentity": mutate_identity,
                "replaceIdentity": replace_identity,
                "mutateHead": mutate_head, "mutateStatus": mutate_status, "mutateSession": mutate_session,
                "orderedActivation": ordered_activation,
            })],
            capture_output=True,
            text=True,
            cwd=ROOT.parent,
            env=env,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        return json.loads(run.stdout)

    def test_generated_shim_requires_host_admission_and_exact_human_confirmation(self):
        outcome = self._run_shim(admission=self._bundle(), confirmation=True)

        self.assertEqual(outcome["tool"]["name"], "chanks_request_activation")
        self.assertEqual(outcome["tool"]["executionMode"], "sequential")
        self.assertEqual(outcome["tool"]["parameters"]["properties"], {})
        self.assertFalse(outcome["tool"]["parameters"]["additionalProperties"])
        self.assertTrue(outcome["before"]["result"].get("block", False))
        self.assertEqual(outcome["after"]["result"], {})
        self.assertEqual(len(outcome["confirmations"]), 1)
        confirmation = outcome["confirmations"][0]
        for field in ("S151", str(ROOT.parent.resolve()), "tools/install.py", "isolated-pi", "exclusive", "Base", "Candidate", "Runtime"):
            self.assertIn(field, confirmation["message"])
        self.assertTrue(outcome["envConsumed"])
        self.assertEqual(len(outcome["proofDescriptors"]), 1)
        self.assertEqual(set(outcome["after"]["input"]), {"command"})
        self.assertNotEqual(outcome["after"]["input"]["command"], "printf allowed")
        self.assertIn("/usr/bin/bwrap", outcome["after"]["input"]["command"])

    def test_activation_tool_reaches_execute_only_after_ordered_tool_call_dispatch(self):
        outcome = self._run_shim(
            admission=self._bundle(), confirmation=True, ordered_activation=True
        )

        self.assertEqual(outcome["activation"]["content"][0]["text"], "Chanks authority is active.")
        self.assertEqual(len(outcome["confirmations"]), 1)
        self.assertEqual(outcome["after"]["result"], {})
        for name, result in outcome["ordered"].items():
            self.assertTrue(result.get("block", False), name)

    def test_generated_shim_fails_closed_for_missing_invalid_or_non_true_consent(self):
        cases = (
            ("missing", None, True, True),
            ("invalid", "{not json", True, True),
            ("no UI", self._bundle(), False, True),
            ("decline", self._bundle(), True, False),
            ("cancel", self._bundle(), True, None),
            ("UI error", self._bundle(), True, "throw"),
        )
        for label, admission, has_ui, confirmation in cases:
            with self.subTest(label=label):
                outcome = self._run_shim(
                    admission=admission, has_ui=has_ui, confirmation=confirmation
                )
                self.assertTrue(outcome["before"]["result"].get("block", False))
                self.assertTrue(outcome["after"]["result"].get("block", False))
                self.assertIn("blocked", outcome["activation"]["content"][0]["text"].lower())
                self.assertEqual(len(outcome["confirmations"]), 1 if admission == self._bundle() and has_ui else 0)

    def test_live_git_or_radar_drift_invalidates_an_active_capability_before_execution(self):
        cases = (
            ("Git HEAD", {"mutate_head": "e" * 40 + "\n"}),
            ("Radar status", {"mutate_status": '{"schema":"radar.snapshot/v1","drift":true}\n'}),
            ("Radar session", {"mutate_session": '{"sessionId":"S151","drift":true}\n'}),
        )
        for label, mutation in cases:
            with self.subTest(label=label):
                outcome = self._run_shim(admission=self._bundle(), confirmation=True, **mutation)
                self.assertTrue(outcome["after"]["result"].get("block", False))
                self.assertTrue(outcome["envConsumed"])

    def test_live_identity_file_candidate_runtime_and_replacement_drift_block_execution(self):
        identity = self._identity()
        cases = (
            ("candidate", json.dumps({**identity, "candidateDigest": "e" * 64})),
            ("runtime", json.dumps({**identity, "runtimeIdentity": "replaced-runtime"})),
            ("replacement", json.dumps(identity)),
        )
        for label, changed in cases:
            with self.subTest(label=label):
                arguments = {"replace_identity": changed} if label == "replacement" else {"mutate_identity": changed}
                outcome = self._run_shim(admission=self._bundle(), confirmation=True, **arguments)
                self.assertTrue(outcome["after"]["result"].get("block", False))

    def test_identity_file_rejects_links_and_releases_its_descriptor_once(self):
        admission = self._bundle()
        envelope = self._envelope(admission)
        linked = self.home / "identity-link.json"
        linked.symlink_to(self.identity)
        envelope["identityFile"] = str(linked)
        symlinked = self._run_shim(envelope=envelope)
        self.assertTrue(symlinked["before"]["result"].get("block", False))
        self.assertEqual(symlinked["proofDescriptors"], [])

        self._envelope(admission)
        hard = self.home / "identity-hard.json"
        os.link(self.identity, hard)
        hard_linked = self._run_shim(envelope={
            "admission": admission,
            "radarExecutable": str(self.radar),
            "gitExecutable": str(self.git),
            "identityFile": str(hard),
        })
        self.assertTrue(hard_linked["before"]["result"].get("block", False))
        self.assertEqual(hard_linked["proofDescriptors"], [])

        for reason in ("quit", "reload"):
            with self.subTest(reason=reason):
                outcome = self._run_shim(admission=self._bundle(), confirmation=True, shutdown=reason)
                self.assertEqual(outcome["proofDescriptors"], [])

    def test_host_executables_cannot_be_replaced_by_model_or_writable_repository_paths(self):
        model_payload = self._run_shim(admission=self._bundle(), confirmation=True)
        self.assertEqual(model_payload["after"]["result"], {})
        self.assertIn("/usr/bin/bwrap", model_payload["after"]["input"]["command"])

        rejected = self._run_shim(envelope={
            "admission": self._bundle(),
            "radarExecutable": str((ROOT / "tools/install.py").resolve()),
            "gitExecutable": str(self.git),
            "identityFile": str(self.identity),
        })
        self.assertTrue(rejected["before"]["result"].get("block", False))
        self.assertIn("blocked", rejected["activation"]["content"][0]["text"].lower())

    def test_model_arguments_cannot_self_grant_and_shutdown_erases_the_capability(self):
        self_grant = self._run_shim(admission=self._bundle(), has_ui=False, confirmation=True)
        self.assertTrue(self_grant["after"]["result"].get("block", False))

        reloaded = self._run_shim(admission=self._bundle(), confirmation=True, shutdown="reload")
        self.assertEqual(reloaded["after"]["result"], {})
        self.assertTrue(reloaded["afterShutdown"]["result"].get("block", False))
        self.assertEqual(len(reloaded["confirmations"]), 1)

    def test_every_shutdown_reason_erases_admission_before_a_new_session_starts(self):
        for reason in ("quit", "reload", "new", "resume", "fork"):
            with self.subTest(reason=reason):
                outcome = self._run_shim(
                    admission=self._bundle(), confirmation=True, shutdown=reason
                )
                self.assertEqual(outcome["after"]["result"], {})
                self.assertTrue(outcome["afterShutdown"]["result"].get("block", False))
                self.assertEqual(len(outcome["confirmations"]), 1)

    def test_generated_shim_consumes_env_and_never_exposes_a_raw_grant(self):
        body = INSTALLER.desired_pi_extension(ROOT).decode("utf8")
        self.assertIn("CHANKS_PI_ADMISSION", body)
        self.assertIn("delete process.env", body)
        self.assertIn("crearAutoridadPi", body)
        self.assertNotIn("pi.chanksAutoridad", body)
        self.assertNotIn("pi.chanksConfinamiento", body)
        self.assertNotIn("gobernar(pi.", body)