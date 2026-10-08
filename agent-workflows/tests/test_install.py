import contextlib
import hashlib
import importlib.machinery
import importlib.util
import io
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


BOUNDARY_RULE = (
    "Chanks decides what is worked on and what runs in parallel. "
    "Gentle AI decides how it is implemented, reviewed and delivered. "
    "If they collide, Gentle AI wins."
)
STAGE_OWNERSHIP = (
    "Chanks owns stages 1 Definir, 2 Preparar, 3 Paralelo and 5 Cerrar. "
    "Stage 4, implementing and reviewing, belongs to Gentle AI"
)
BLOCK_SIZE_CEILING = 2000
V2_SKILLS = (
    "chanks-3-coordinador-manual",
    "chanks-3-despacho-herdr",
    "chanks-4-unattended-implementation",
    "chanks-0-jornada",
)


def _lexists(path):
    return os.path.lexists(path)


class TowerMigrationTests(unittest.TestCase):
    LEGACY_PERSONAL = (
        (b"AGENT-PROPAGATION-MAP:MANUAL", b"chanks:agent-propagation-map"),
        (b"doc-guard-rule", b"chanks:doc-guard-rule"),
        (b"EXPLAIN-TO-MAINTAINER:MANUAL", b"chanks:explain-to-maintainer"),
    )
    SUPERSEDED = (b"SESSION-SKILL-ARCHITECTURE:MANUAL", b"PLAN-NAMING:GLOBAL")
    PROTECTED = (
        b"unmarked prefix\xff\r\n"
        b"<!-- gentle-ai:persona -->\r\nmanaged bytes\r\n<!-- /gentle-ai:persona -->\r\n"
        # Real gentle-ai blocks embed unpaired start/end comments; they are not owned nesting.
        b"<!-- gentle-ai:orchestrator -->\n<!-- authority-first-terminal-procedure:start -->\nsteps\n"
        b"<!-- authority-first-terminal-procedure:end -->\n<!-- /gentle-ai:orchestrator -->\n"
        b"<!-- control-tower:pointer -->\nTower bytes\n<!-- /control-tower:pointer -->\n"
        b"<!-- review-lifecycle-policy -->\nexternal owner\n<!-- /review-lifecycle-policy -->\n"
    )

    @staticmethod
    def block(name, annotated=False):
        annotation = INSTALLER.MANUAL_ANNOTATION if annotated else b""
        return b"<!-- " + name + annotation + b" -->\nold\n<!-- /" + name + b" -->\n"

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.home = Path(self.tempdir.name)
        self.env = {**os.environ, "HOME": str(self.home), "PYTHONDONTWRITEBYTECODE": "1"}
        for path in INSTALLER.manual_paths(self.home):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(self.PROTECTED + b"".join(
                self.block(name, annotated=True) for name, _ in self.LEGACY_PERSONAL)
                + b"".join(self.block(name) for name in self.SUPERSEDED)
                + b"unmarked suffix without newline")
            path.chmod(0o640)

    def cli(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT), "--home", str(self.home),
                               "--migrate-to-tower", *args], env=self.env,
                              capture_output=True, text=True)

    def snapshot(self):
        return {p.relative_to(self.home): (p.read_bytes(), stat.S_IMODE(p.stat().st_mode))
                for p in self.home.rglob("*") if p.is_file()}

    def test_dry_run_reports_each_edit_and_stopped_skill_without_writes(self):
        before = self.snapshot()
        result = self.cli()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(before, self.snapshot())
        for path in INSTALLER.manual_paths(self.home):
            for old, new in self.LEGACY_PERSONAL:
                self.assertIn(f"WOULD_REPLACE {path}: {old.decode()} -> {new.decode()}", result.stdout)
            for name in self.SUPERSEDED:
                self.assertIn(f"WOULD_REMOVE {path}: {name.decode()}", result.stdout)
        self.assertIn("STOP_MANAGING skill: chanks-1-adopcion (Tower-owned; files retained)", result.stdout)
        self.assertNotIn("STOP_MANAGING skill: chanks-0-agente-soporte", result.stdout)
        self.assertEqual(len(result.stdout.splitlines()), 44)  # 24 skills + 20 block edits
        print(result.stdout, end="")  # Exact portable-fixture evidence for the handoff.

    def test_apply_backs_up_every_file_before_first_edit_preserves_bytes_and_is_idempotent(self):
        before = self.snapshot()
        original_write = INSTALLER._atomic_write
        def assert_backups_first(*args, **kwargs):
            backups = list((self.home / ".claude/.skill-backups/tower-migration").glob("*"))
            self.assertEqual(len(backups), 1)
            for relative, (content, mode) in before.items():
                backup = backups[0] / relative
                self.assertEqual(backup.read_bytes(), content)
                self.assertEqual(stat.S_IMODE(backup.stat().st_mode), mode)
            return original_write(*args, **kwargs)
        with mock.patch.object(INSTALLER, "_atomic_write", side_effect=assert_backups_first):
            INSTALLER.migrate_to_tower(self.home, ROOT, apply_changes=True)
        for path in INSTALLER.manual_paths(self.home):
            content = path.read_bytes()
            self.assertTrue(content.startswith(self.PROTECTED))
            self.assertTrue(content.endswith(b"unmarked suffix without newline"))
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o640)
            for old, new in self.LEGACY_PERSONAL:
                self.assertNotIn(b"<!-- " + old + b" -->", content)
                self.assertNotIn(b"<!-- " + old + INSTALLER.MANUAL_ANNOTATION, content)
                self.assertEqual(content.count(b"<!-- " + new + b" -->"), 1)
                self.assertIn(b"Generated by Chanks (personal configuration)", content)
            for name in self.SUPERSEDED:
                self.assertNotIn(name, content)
        after = self.snapshot()
        result = self.cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("NO_CHANGES", result.stdout)
        self.assertEqual(after, self.snapshot())
        # Unannotated legacy markers and CRLF are accepted too, including EOF.
        for path in INSTALLER.manual_paths(self.home):
            path.write_bytes(self.PROTECTED + b"".join(
                self.block(name).replace(b"\n", b"\r\n") for name, _ in self.LEGACY_PERSONAL)
                + self.block(self.SUPERSEDED[0]).rstrip(b"\n"))
        result = self.cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        for path in INSTALLER.manual_paths(self.home):
            self.assertTrue(path.read_bytes().startswith(self.PROTECTED))
            self.assertNotIn(b"SESSION-SKILL-ARCHITECTURE", path.read_bytes())

    def test_duplicate_nested_malformed_and_mixed_alias_markers_refuse_all_writes(self):
        path = self.home / ".pi/agent/APPEND_SYSTEM.md"
        original = path.read_bytes()
        cases = [
            self.block(b"doc-guard-rule"),
            self.block(b"SESSION-SKILL-ARCHITECTURE:MANUAL"),
            b"<!-- /chanks:explain-to-maintainer -->\n",
            b"inline " + self.block(b"chanks:agent-propagation-map"),
            self.block(b"doc-guard-rule").replace(b" -->", b" (guess) -->", 1),
            b"<!-- chanks:doc-guard-rule -->\nunclosed\n",
            self.block(b"chanks:doc-guard-rule"),
            b"<!-- gentle-ai:x -->\n" + self.block(b"chanks:doc-guard-rule") + b"<!-- /gentle-ai:x -->\n",
            self.block(b"chanks:doc-guard-rule").replace(b"old\n", self.block(b"control-tower:pointer")),
            self.block(b"chanks:doc-guard-rule").replace(b"old\n", self.block(b"OWNER-NOTES:MANUAL")),
        ]
        for invalid in cases:
            with self.subTest(invalid=invalid):
                path.write_bytes(original + invalid)
                before = self.snapshot()
                result = self.cli("--apply")
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertEqual(before, self.snapshot())

    def test_normal_install_leaves_every_tower_owned_file_and_link_untouched(self):
        product = ROOT.parent / "product/tower/v1/runtime-config.mjs"
        roster = subprocess.run(["bun", "--eval", f"import {{ V1_SKILLS }} from {json.dumps(str(product))}; console.log(JSON.stringify(V1_SKILLS))"],
                                env=self.env, capture_output=True, text=True)
        self.assertEqual(roster.returncode, 0, roster.stderr)
        self.assertEqual(tuple(json.loads(roster.stdout)), INSTALLER.TOWER_V1_SKILLS)
        # The normal CLI accepts setup.sh's legacy routing, leaves all legacy
        # bytes intact and emits exactly one migration hint before ownership tests.
        before = {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)}
        normal = subprocess.run([sys.executable, str(SCRIPT), "--home", str(self.home)],
                                env=self.env, capture_output=True, text=True)
        self.assertEqual(normal.returncode, 0, normal.stderr)
        self.assertEqual(normal.stdout.count("HINT: legacy Chanks blocks left untouched"), 1)
        # The normal install only appends the always-added freshness block; every
        # legacy byte stays exactly where it was.
        freshness = INSTALLER.render_personal_blocks(ROOT)[b"<!-- chanks:main-freshness -->"]
        for path in INSTALLER.manual_paths(self.home):
            self.assertEqual(path.read_bytes(), before[path] + b"\n\n" + freshness, path)
        self.assertEqual(self.cli("--apply").returncode, 0)
        targets = [".agents/skills/_shared/plan-naming-convention.md", ".local/bin/radar",
                   ".claude/hooks/chanks-etapa.sh", ".claude/hooks/torre-firma.sh",
                   ".claude/settings.json", ".pi/agent/extensions/chanks-notices.ts"]
        for name in INSTALLER.TOWER_V1_SKILLS:
            targets.append(f".agents/skills/{name}/SKILL.md")
            link = self.home / f".claude/skills/{name}"
            link.parent.mkdir(parents=True, exist_ok=True)
            link.symlink_to(f"../../.agents/skills/{name}")
        for relative in targets:
            target = self.home / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(b"Tower-owned sentinel\n")
        before = {relative: (self.home / relative).read_bytes() for relative in targets}
        INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {relative: (self.home / relative).read_bytes() for relative in targets})
        for name in INSTALLER.TOWER_V1_SKILLS:
            self.assertEqual(os.readlink(self.home / f".claude/skills/{name}"), f"../../.agents/skills/{name}")
        self.assertEqual(INSTALLER.PERSONAL_SKILLS, ("chanks-0-agente-soporte", "torre-release"))
        self.assertTrue((self.home / ".agents/skills/chanks-0-agente-soporte/SKILL.md").is_file())
        for name in INSTALLER.DEFERRED_SKILLS:
            self.assertIn(name, INSTALLER.RETIRED_SKILLS)
            self.assertFalse((self.home / f".agents/skills/{name}").exists())
        self.assertEqual(INSTALLER.apply(self.home, ROOT), [])


class TorreReleasePersonalTests(unittest.TestCase):
    FILES = ("SKILL.md", "references/impacto.md", "references/publicar.md")

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.home = Path(self.tempdir.name)
        self.env = {**os.environ, "HOME": str(self.home), "PYTHONDONTWRITEBYTECODE": "1"}
        self.source = ROOT / "skills-personales/torre-release"
        self.destination = self.home / ".agents/skills/torre-release"
        InstallerTests._seed_runtime(self)

    def cli(self, *args):
        # No --home override: exercise the normal installer's sandbox HOME default.
        return subprocess.run([sys.executable, str(SCRIPT), *args], env=self.env,
                              capture_output=True, text=True)

    def assert_canonical_copy(self):
        self.assertTrue(self.destination.is_dir())
        self.assertFalse(self.destination.is_symlink())
        self.assertEqual(sorted(p.relative_to(self.destination).as_posix()
                                for p in self.destination.rglob("*") if p.is_file()),
                         sorted(self.FILES))
        for relative in self.FILES:
            self.assertEqual((self.destination / relative).read_bytes(),
                             (self.source / relative).read_bytes(), relative)

    def test_install_copies_personal_source_byte_identically_and_links_claude(self):
        result = self.cli()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_canonical_copy()
        link = self.home / ".claude/skills/torre-release"
        self.assertTrue(link.is_symlink())
        self.assertEqual(os.readlink(link), "../../.agents/skills/torre-release")
        self.assertEqual(link.resolve(), self.destination)
        self.assertEqual(INSTALLER.apply(self.home, ROOT), [])

    def test_check_reports_missing_and_changed_personal_files_without_writes(self):
        missing = self.cli("--check")
        self.assertEqual(missing.returncode, 1, missing.stderr)
        for relative in self.FILES:
            self.assertIn(f"DRIFT skill: {self.destination / relative}", missing.stdout)
        self.assertFalse(self.destination.exists())
        self.assertEqual(self.cli().returncode, 0)
        self.assertEqual(self.cli("--check").returncode, 0)
        for relative in self.FILES:
            with self.subTest(relative=relative):
                target = self.destination / relative
                target.write_bytes(b"changed personal file\n")
                drift = self.cli("--check")
                self.assertEqual(drift.returncode, 1, drift.stderr)
                self.assertIn(f"DRIFT skill: {target}", drift.stdout)
                self.assertEqual(target.read_bytes(), b"changed personal file\n")
                self.assertEqual(self.cli().returncode, 0)
                self.assert_canonical_copy()

    def test_personal_skill_is_not_tower_chanks_or_retired(self):
        self.assertIn("torre-release", INSTALLER.OWN_SKILLS)
        self.assertIn("torre-release", INSTALLER.PERSONAL_SKILLS)
        for roster in (INSTALLER.TOWER_V1_SKILLS, INSTALLER.STOP_MANAGING_SKILLS,
                       INSTALLER.CHANKS_SKILLS, INSTALLER.RETIRED_SKILLS):
            self.assertNotIn("torre-release", roster)
        self.assertEqual(INSTALLER.skill_source_root(ROOT, "torre-release"), self.source)
        self.assertNotIn(b'"torre-release"', INSTALLER.desired_pi_notices(ROOT))

    def test_existing_runtime_copies_archive_and_central_skill_survives_migration(self):
        for runtime in INSTALLER.runtime_skill_roots(self.home):
            retired = runtime / "chanks-3-session-kickoff/SKILL.md"
            retired.parent.mkdir(parents=True, exist_ok=True)
            retired.write_bytes(b"retired fixture\n")
            if runtime != self.home / ".agents/skills":
                old = runtime / "torre-release/SKILL.md"
                old.parent.mkdir(parents=True, exist_ok=True)
                old.write_bytes(b"old personal copy\n")
        self.assertEqual(self.cli().returncode, 0)
        self.assert_canonical_copy()
        for runtime in INSTALLER.runtime_skill_roots(self.home):
            self.assertFalse((runtime / "chanks-3-session-kickoff").exists())
            if runtime != self.home / ".agents/skills":
                archived = list(INSTALLER.retired_skill_archive_root(runtime).glob("torre-release-*"))
                self.assertEqual(len(archived), 1)
                self.assertEqual((archived[0] / "SKILL.md").read_bytes(), b"old personal copy\n")
        migration = self.cli("--migrate-to-tower", "--apply")
        self.assertEqual(migration.returncode, 0, migration.stderr)
        self.assertNotIn("STOP_MANAGING skill: torre-release", migration.stdout)
        self.assert_canonical_copy()
        self.assertEqual(self.cli().returncode, 0)
        self.assertEqual(self.cli("--check").returncode, 0)
        self.assert_canonical_copy()


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.home = Path(self.tempdir.name)
        self._seed_runtime()

    def tearDown(self):
        self.tempdir.cleanup()

    def _seed_runtime(self, home=None):
        home = home or self.home
        old_block = INSTALLER.render_manual_block(ROOT)
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
            self.assertNotIn(ROOT.as_posix().encode(), content)
            self.assertEqual(content.count(INSTALLER.START_MARKER), 1)
            self.assertNotIn(b"SDD-AUTO-GATEKEEPER-POLICY", content)

    def test_installed_block_carries_the_boundary_rule_and_no_admission_contract(self):
        INSTALLER.apply(self.home, ROOT)
        for path in INSTALLER.manual_paths(self.home):
            match = INSTALLER.BLOCK_RE.search(path.read_bytes())
            self.assertIsNotNone(match, path)
            assert match is not None
            text = " ".join(match.group().decode("utf-8").split())
            self.assertIn(BOUNDARY_RULE, text, path)
            self.assertIn(STAGE_OWNERSHIP, text, path)
            self.assertNotIn("SESSION-ADMISSION-CONTRACT", text, path)
            self.assertNotIn("```json", text, path)
            self.assertLessEqual(len(match.group()), BLOCK_SIZE_CEILING, path)

    def test_installed_block_does_not_route_to_v2_dispatch_skills(self):
        INSTALLER.apply(self.home, ROOT)
        for path in INSTALLER.manual_paths(self.home):
            match = INSTALLER.BLOCK_RE.search(path.read_bytes())
            self.assertIsNotNone(match, path)
            assert match is not None
            text = match.group().decode("utf-8")
            for skill in V2_SKILLS:
                self.assertNotIn(skill, text, path)

    def test_central_folder_holds_only_personal_skills_without_shared_overlay(self):
        INSTALLER.apply(self.home, ROOT)
        central, claude, opencode, codex = INSTALLER.runtime_skill_roots(self.home)
        for skill, relative, source in INSTALLER.source_files(ROOT, INSTALLER.PERSONAL_SKILLS):
            destination = central / skill / relative
            self.assertTrue(destination.is_file(), destination)
            self.assertEqual(INSTALLER.runtime_skill_bytes(skill, relative, source), destination.read_bytes())
        support = central / "chanks-0-agente-soporte/SKILL.md"
        self.assertIn(b"../chanks-4-puente/SKILL.md", support.read_bytes())
        self.assertNotIn(b"../../../skills/", support.read_bytes())
        for runtime_root in (claude, opencode, codex):
            for skill, relative, source in INSTALLER.source_files(ROOT, INSTALLER.SHARED):
                destination = runtime_root / skill / relative
                self.assertFalse(destination.exists())
        for runtime_root in (opencode, codex):
            for skill in INSTALLER.OWN_SKILLS:
                self.assertFalse(_lexists(runtime_root / skill), (runtime_root, skill))

    def test_check_mode_detects_skill_and_manual_drift(self):
        INSTALLER.apply(self.home, ROOT)
        skill_path = self.home / ".agents/skills/chanks-0-agente-soporte/SKILL.md"
        skill_path.chmod(0o644)
        skill_path.write_bytes(skill_path.read_bytes() + b"\nDRIFT\n")
        manual_path = self.home / ".pi/agent/APPEND_SYSTEM.md"
        personal = INSTALLER.render_personal_blocks(ROOT)[b"<!-- chanks:doc-guard-rule -->"]
        manual_path.write_bytes(manual_path.read_bytes() + personal)
        drifted = manual_path.read_bytes().replace(b"Documentation Close Gate", b"DRIFT")
        manual_path.write_bytes(drifted)
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--check", "--home", str(self.home)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("chanks-0-agente-soporte/SKILL.md", result.stdout)
        self.assertIn("APPEND_SYSTEM.md", result.stdout)

    def test_carril_launcher_is_installed_and_check_detects_drift(self):
        INSTALLER.apply(self.home, ROOT)
        target = self.home / ".local/bin/carril"
        source = ROOT / "tools/carril"
        self.assertEqual(target.read_bytes(), source.read_bytes())
        self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o755)

        clean = subprocess.run(
            [sys.executable, str(SCRIPT), "--check", "--home", str(self.home)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(clean.returncode, 0, clean.stdout + clean.stderr)

        target.write_bytes(target.read_bytes() + b"\n# drift\n")
        drifted = subprocess.run(
            [sys.executable, str(SCRIPT), "--check", "--home", str(self.home)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(drifted.returncode, 1)
        self.assertIn(f"DRIFT carril-launcher: {target}", drifted.stdout)

    def test_main_al_dia_launcher_is_installed_and_check_detects_drift(self):
        INSTALLER.apply(self.home, ROOT)
        target = self.home / ".local/bin/main-al-dia"
        source = ROOT / "tools/main-al-dia"
        self.assertEqual(target.read_bytes(), source.read_bytes())
        self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o755)

        clean = subprocess.run(
            [sys.executable, str(SCRIPT), "--check", "--home", str(self.home)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(clean.returncode, 0, clean.stdout + clean.stderr)

        target.write_bytes(target.read_bytes() + b"\n# drift\n")
        drifted = subprocess.run(
            [sys.executable, str(SCRIPT), "--check", "--home", str(self.home)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(drifted.returncode, 1)
        self.assertIn(f"DRIFT main-al-dia-launcher: {target}", drifted.stdout)

    def test_dry_run_does_not_write(self):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--dry-run", "--home", str(self.home)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0)
        self.assertIn("WOULD_UPDATE", result.stdout)
        self.assertFalse((self.home / ".agents/skills/chanks-2-planificador-granular/SKILL.md").exists())
        self.assertFalse((self.home / ".local/bin/carril").exists())

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
        self.assertFalse((external / "chanks-2-planificador-granular").exists())

    def test_rejects_symlinked_destination_without_touching_external_sentinel(self):
        external = Path(self.tempdir.name) / "external-file"
        external.write_bytes(b"protected")
        destination = self.home / ".agents/skills/chanks-0-agente-soporte/SKILL.md"
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
            match = INSTALLER.BLOCK_RE.search(content)
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

    def test_rejects_duplicate_session_routing_block_before_mutation(self):
        path = self.home / ".pi/agent/APPEND_SYSTEM.md"
        block = INSTALLER.render_manual_block(ROOT)
        path.write_bytes(path.read_bytes() + block + block)
        before = {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)}

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {item: item.read_bytes() for item in INSTALLER.manual_paths(self.home)})
        self.assertFalse((self.home / ".agents").exists())

    def test_gatekeeper_policy_is_no_longer_owned_by_the_installer(self):
        self.assertFalse((ROOT / "templates/sdd-auto-gatekeeper-policy.md").exists())
        self.assertNotIn("sdd-auto-gatekeeper-policy.md", [entry[0] for entry in INSTALLER.MANUAL_BLOCKS])
        self.assertFalse(hasattr(INSTALLER, "GATEKEEPER_START_MARKER"))
        legacy = b"<!-- SDD-AUTO-GATEKEEPER-POLICY:MANUAL -->\nlegacy\n<!-- /SDD-AUTO-GATEKEEPER-POLICY:MANUAL -->\n"
        path = self.home / ".claude/CLAUDE.md"
        path.write_bytes(path.read_bytes() + legacy)
        desired = INSTALLER.desired_manual_content(path, INSTALLER.render_manual_blocks(ROOT))
        self.assertIn(legacy, desired)
        self.assertEqual(desired.count(INSTALLER.START_MARKER), 1)

    TARGETED_BLOCKS = (
        (b"chanks:agent-propagation-map", "agent-propagation-map.md"),
        (b"chanks:doc-guard-rule", "doc-guard-rule.md"),
        (b"chanks:explain-to-maintainer", "explain-to-maintainer.md"),
        (b"chanks:main-freshness", "main-freshness.md"),
    )
    MANUAL_ANNOTATION = " (manual — NOT gentle-ai managed; do not overwrite on sync)".encode()

    def _personal_block(self, name, body=b"old personal rule", annotated=False):
        annotation = self.MANUAL_ANNOTATION if annotated else b""
        return b"<!-- " + name + annotation + b" -->\n" + body + b"\n<!-- /" + name + b" -->\n"

    def test_personal_templates_correct_sources_and_retired_references(self):
        replacements = INSTALLER.render_personal_blocks(ROOT)
        for name, template in self.TARGETED_BLOCKS:
            with self.subTest(template=template):
                start = b"<!-- " + name + b" -->"
                self.assertIn(start, replacements)
                rendered = replacements.get(start, b"")
                self.assertEqual(rendered, (ROOT / "templates" / template).read_bytes())
                self.assertNotIn(b"chanks-7-session-doc", rendered)
                self.assertNotIn(b"skills/explicalo-simple/", rendered)
        propagation = replacements[b"<!-- chanks:agent-propagation-map -->"]
        self.assertIn(b"agent-workflows/skills/", propagation)
        self.assertIn(b"~/.agents/skills", propagation)
        self.assertIn(b"Gentle AI", propagation)
        self.assertIn(b"independently", propagation)
        self.assertNotIn(b"sync-skills.sh", propagation)
        self.assertIn(b"chanks-5-session-doc", replacements[b"<!-- chanks:doc-guard-rule -->"])
        self.assertIn(b"~/.agents/skills/chanks-0-explicalo-simple/SKILL.md",
                      replacements[b"<!-- chanks:explain-to-maintainer -->"])

    def test_existing_personal_blocks_replaced_preserving_bytes_modes_and_idempotence(self):
        managed = b"<!-- gentle-ai:persona -->\r\nkeep managed bytes\r\n<!-- /gentle-ai:persona -->\r\n"
        unrelated = b"<!-- OWNER-NOTES:MANUAL -->\nkeep unrelated bytes\n<!-- /OWNER-NOTES:MANUAL -->\n"
        replacements = INSTALLER.render_personal_blocks(ROOT)
        for path in INSTALLER.manual_paths(self.home):
            path.write_bytes(managed + path.read_bytes() + unrelated + b"".join(
                self._personal_block(name) for name, _ in self.TARGETED_BLOCKS))
            path.chmod(0o640)
        INSTALLER.apply(self.home, ROOT)
        before = {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)}
        for path, content in before.items():
            self.assertTrue(content.startswith(managed))
            self.assertIn(unrelated, content)
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o640)
            for name, _ in self.TARGETED_BLOCKS:
                self.assertIn(replacements[b"<!-- " + name + b" -->"], content)
                self.assertNotIn(self._personal_block(name), content)
        self.assertEqual(INSTALLER.apply(self.home, ROOT), [])
        self.assertEqual(before, {path: path.read_bytes() for path in before})

    PLAN_NAMING = b"PLAN-NAMING:GLOBAL"
    ADDED_TO_CODEX = (b"chanks:doc-guard-rule", b"chanks:explain-to-maintainer")
    ADDED_TO_ALL_RUNTIMES = (b"chanks:main-freshness",)

    def test_missing_personal_blocks_are_added_to_their_runtime(self):
        INSTALLER.apply(self.home, ROOT)
        codex = self.home / ".codex/AGENTS.md"
        for path in INSTALLER.manual_paths(self.home):
            for name in self.ADDED_TO_ALL_RUNTIMES:
                self.assertIn(name, path.read_bytes(), (path, name))
            for name in self.ADDED_TO_CODEX:
                self.assertEqual(name in path.read_bytes(), path == codex, (path, name))
            self.assertNotIn(self.PLAN_NAMING, path.read_bytes(), path)
        self.assertFalse((self.home / ".hermes").exists())

    def test_main_freshness_block_reaches_every_runtime_and_is_idempotent(self):
        self.assertEqual(INSTALLER.PERSONAL_ALWAYS_ADDED_WHEN_ABSENT,
                         (b"<!-- chanks:main-freshness -->",))
        replacements = INSTALLER.render_personal_blocks(ROOT)
        self.assertIn(b"<!-- chanks:main-freshness -->", replacements)
        self.assertEqual(
            replacements[b"<!-- chanks:main-freshness -->"],
            (ROOT / "templates/main-freshness.md").read_bytes(),
        )
        INSTALLER.apply(self.home, ROOT)
        block = replacements[b"<!-- chanks:main-freshness -->"]
        for path in INSTALLER.manual_paths(self.home):
            with self.subTest(path=path):
                self.assertIn(block, path.read_bytes())
                self.assertNotIn(b"{{", path.read_bytes())
                self.assertEqual(path.read_bytes().count(b"<!-- chanks:main-freshness -->"), 1)
        self.assertEqual(INSTALLER.apply(self.home, ROOT), [])

    def test_opt_in_flag_controls_only_opt_in_blocks(self):
        replacements = INSTALLER.render_personal_blocks(ROOT)
        path = self.home / ".claude/CLAUDE.md"
        without = INSTALLER.desired_personal_content(path, replacements, add_opt_in_absent=False)
        self.assertIn(b"<!-- chanks:main-freshness -->", without)
        for start in INSTALLER.PERSONAL_ADDED_WHEN_ABSENT:
            self.assertNotIn(start, without)
        opted = INSTALLER.desired_personal_content(path, replacements, add_opt_in_absent=True)
        for start in INSTALLER.PERSONAL_ADDED_WHEN_ABSENT:
            self.assertIn(start, opted)

    def test_codex_receives_absent_blocks_once_preserving_existing_bytes(self):
        codex = self.home / ".codex/AGENTS.md"
        managed = b"<!-- gentle-ai:persona -->\r\nkeep managed bytes\r\n<!-- /gentle-ai:persona -->\r\n"
        unrelated = b"<!-- OWNER-NOTES:MANUAL -->\nkeep unrelated bytes\n<!-- /OWNER-NOTES:MANUAL -->"
        codex.write_bytes(managed + codex.read_bytes() + unrelated)  # no trailing newline
        codex.chmod(0o640)
        replacements = INSTALLER.render_personal_blocks(ROOT)
        plan = INSTALLER.build_plan(self.home, ROOT)
        self.assertIn((codex, "manual"), [(change.path, change.kind) for change in plan])
        INSTALLER.apply(self.home, ROOT)
        content = codex.read_bytes()
        self.assertTrue(content.startswith(managed))
        self.assertIn(unrelated + b"\n\n", content)
        self.assertEqual(stat.S_IMODE(codex.stat().st_mode), 0o640)
        blocks = [replacements[b"<!-- " + name + b" -->"]
                  for name in self.ADDED_TO_ALL_RUNTIMES + self.ADDED_TO_CODEX]
        self.assertTrue(content.endswith(unrelated + b"\n\n" + b"\n".join(blocks)))
        for name in self.ADDED_TO_ALL_RUNTIMES + self.ADDED_TO_CODEX:
            self.assertEqual(content.count(b"<!-- " + name + b" -->"), 1)
            self.assertEqual(content.count(b"<!-- /" + name + b" -->"), 1)
        self.assertNotIn(b"AGENT-PROPAGATION-MAP:MANUAL", content)
        self.assertEqual(INSTALLER.apply(self.home, ROOT), [])
        self.assertEqual(codex.read_bytes(), content)

    def test_codex_existing_block_is_replaced_in_place_and_only_the_absent_one_is_added(self):
        codex = self.home / ".codex/AGENTS.md"
        codex.write_bytes(self._personal_block(b"chanks:doc-guard-rule") + codex.read_bytes())
        replacements = INSTALLER.render_personal_blocks(ROOT)
        INSTALLER.apply(self.home, ROOT)
        content = codex.read_bytes()
        self.assertTrue(content.startswith(replacements[b"<!-- chanks:doc-guard-rule -->"]))
        self.assertTrue(content.endswith(replacements[b"<!-- chanks:explain-to-maintainer -->"]))
        self.assertEqual(content.count(b"<!-- chanks:doc-guard-rule -->"), 1)
        self.assertNotIn(b"PLAN-NAMING:GLOBAL", content)

    PLAN_NAMING_START = b"<!-- PLAN-NAMING:GLOBAL -->"
    CANON_LINE = ("    {}   (copia runtime; se instala desde "
                  "control-tower/Main/agent-workflows/)\n")
    CANON_BY_FILE = {
        ".claude/CLAUDE.md": "~/.claude/skills/_shared/plan-naming-convention.md",
        ".config/opencode/AGENTS.md": "~/.config/opencode/skills/_shared/plan-naming-convention.md",
        ".codex/AGENTS.md": "~/.codex/skills/_shared/plan-naming-convention.md",
        ".pi/agent/APPEND_SYSTEM.md": "~/.agents/skills/_shared/plan-naming-convention.md",
        ".hermes/SOUL.md": "~/.agents/skills/_shared/plan-naming-convention.md",
    }

    def _plan_naming(self, relative):
        return INSTALLER.blocks_for(
            self.home / relative, INSTALLER.render_manual_blocks(ROOT))[self.PLAN_NAMING_START]

    def test_plan_naming_block_is_one_text_that_varies_only_in_the_canon_path_line(self):
        self.assertIn("plan-naming.md", [entry[0] for entry in INSTALLER.MANUAL_BLOCKS])
        self.assertIn(self.PLAN_NAMING_START, INSTALLER.ADDED_WHEN_ABSENT_BLOCKS)
        template = (ROOT / "templates/plan-naming.md").read_text(encoding="utf-8")
        self.assertEqual(template.count("{{PLAN_NAMING_CANON}}"), 1)
        self.assertEqual(template.count("plan-naming-convention.md"), 0)
        self.assertIn("The single source of truth is:", template)
        self.assertIn("Status: ACTIVE.", template)
        self.assertIsNone(INSTALLER.MANAGED_MARKER_RE.search(template.encode()))
        for relative, canon in self.CANON_BY_FILE.items():
            with self.subTest(relative=relative):
                expected = template.replace(
                    self.CANON_LINE.format("{{PLAN_NAMING_CANON}}"), self.CANON_LINE.format(canon))
                self.assertNotEqual(expected, template)
                self.assertEqual(self._plan_naming(relative), expected.encode())

    def test_plan_naming_helper_paths_remain_compatible_without_runtime_writes(self):
        self.assertTrue((ROOT / "skills/_shared/plan-naming-convention.md").is_file())
        written = {
            INSTALLER._relative_root(self.home, runtime_root)
            for runtime_root in INSTALLER.runtime_skill_roots(self.home)
            if "_shared" in INSTALLER.skills_for_root(self.home, runtime_root)
        }
        for relative, skills_root in INSTALLER.PLAN_NAMING_CANON_ROOTS.items():
            with self.subTest(relative=relative):
                self.assertNotIn(skills_root, written)
                self.assertEqual(
                    INSTALLER.plan_naming_canon(self.home / relative),
                    self.CANON_BY_FILE[relative.as_posix()])
        self.assertEqual(
            {path.as_posix() for path in INSTALLER.PLAN_NAMING_CANON_ROOTS}, set(self.CANON_BY_FILE))
        # A file the installer does not know still gets a location that is always written.
        self.assertEqual(INSTALLER.plan_naming_canon(Path("fixture")),
                         "~/.agents/skills/_shared/plan-naming-convention.md")

    def test_unresolved_plan_naming_placeholder_is_never_written(self):
        INSTALLER.apply(self.home, ROOT)
        for path in INSTALLER.manual_paths(self.home):
            self.assertNotIn(b"{{", path.read_bytes(), path)

    PI_OLD_PLAN_NAMING = (
        b"<!-- PLAN-NAMING:GLOBAL -->\n## Plan Naming Standard\n\nThe sole authority is:\n\n"
        b"    ~/.claude/skills/_shared/plan-naming-convention.md\n\n"
        b"Guardrails: one product plan.\n<!-- /PLAN-NAMING:GLOBAL -->\n")

    def test_existing_plan_naming_blocks_are_left_untouched_until_migration(self):
        claude = self.home / ".claude/CLAUDE.md"
        opencode = self.home / ".config/opencode/AGENTS.md"
        pi = self.home / ".pi/agent/APPEND_SYSTEM.md"
        reference = self._plan_naming(".claude/CLAUDE.md")
        # OpenCode starts from the reference wording with another runtime's path line.
        seeded = {claude: reference, opencode: reference, pi: self.PI_OLD_PLAN_NAMING}
        for path, block in seeded.items():
            path.write_bytes(b"prefix\n" + block + path.read_bytes() + b"suffix\n")
        INSTALLER.apply(self.home, ROOT)
        freshness = INSTALLER.render_personal_blocks(ROOT)[b"<!-- chanks:main-freshness -->"]
        for path, relative in ((claude, ".claude/CLAUDE.md"),
                               (opencode, ".config/opencode/AGENTS.md"),
                               (pi, ".pi/agent/APPEND_SYSTEM.md")):
            content = path.read_bytes()
            self.assertTrue(content.startswith(b"prefix\n" + seeded[path]), path)
            self.assertIn(b"suffix\n", content, path)
            self.assertTrue(content.endswith(freshness), path)
            self.assertEqual(content.count(self.PLAN_NAMING_START), 1, path)
        self.assertIn(b"The sole authority is", pi.read_bytes())
        changed = [
            (old, new) for old, new in zip(
                reference.splitlines(), self._plan_naming(".config/opencode/AGENTS.md").splitlines())
            if old != new
        ]
        self.assertEqual(len(changed), 1)
        self.assertEqual(INSTALLER.apply(self.home, ROOT), [])

    def test_reference_plan_naming_block_in_claude_plans_no_change(self):
        INSTALLER.apply(self.home, ROOT)
        claude = self.home / ".claude/CLAUDE.md"
        claude.write_bytes(claude.read_bytes() + self._plan_naming(".claude/CLAUDE.md"))
        self.assertNotIn(claude, [change.path for change in INSTALLER.build_plan(self.home, ROOT)])

    def test_malformed_plan_naming_markers_are_refused_before_any_write(self):
        block = self._plan_naming(".claude/CLAUDE.md")
        cases = {
            "unclosed": b"<!-- PLAN-NAMING:GLOBAL -->\nold rule\n",
            "stray-end": b"<!-- /PLAN-NAMING:GLOBAL -->\n",
            "duplicate": block + block,
            "inline": b"text " + block,
            "managed-nested": b"<!-- gentle-ai:x -->\n" + block + b"<!-- /gentle-ai:x -->\n",
            "wraps-managed": block.replace(
                b"## Plan Naming Standard\n",
                b"<!-- section:x -->\nmanaged\n<!-- /section:x -->\n"),
        }
        for relative in INSTALLER.MANUAL_FILES:
            for case, invalid in cases.items():
                with self.subTest(relative=relative, case=case), \
                        tempfile.TemporaryDirectory() as location:
                    home = Path(location)
                    self._seed_runtime(home)
                    target = home / relative
                    target.write_bytes(target.read_bytes() + invalid)
                    before = {item: item.read_bytes() for item in INSTALLER.manual_paths(home)}
                    with self.assertRaises(INSTALLER.InstallError):
                        INSTALLER.apply(home, ROOT)
                    self.assertEqual(before, {item: item.read_bytes() for item in before})
                    self.assertFalse((home / ".agents").exists())

    def test_codex_malformed_marker_of_an_added_block_is_refused_before_any_write(self):
        cases = {
            "unclosed": b"<!-- doc-guard-rule -->\nold rule\n",
            "stray-end": b"<!-- /EXPLAIN-TO-MAINTAINER:MANUAL -->\n",
            "inline": b"text <!-- doc-guard-rule -->\nold\n<!-- /doc-guard-rule -->\n",
            "managed-nested": b"<!-- gentle-ai:x -->\n" + self._personal_block(b"doc-guard-rule")
                              + b"<!-- /gentle-ai:x -->\n",
        }
        for case, invalid in cases.items():
            with self.subTest(case=case), tempfile.TemporaryDirectory() as location:
                home = Path(location)
                self._seed_runtime(home)
                codex = home / ".codex/AGENTS.md"
                codex.write_bytes(codex.read_bytes() + invalid)
                before = {item: item.read_bytes() for item in INSTALLER.manual_paths(home)}
                with self.assertRaises(INSTALLER.InstallError):
                    INSTALLER.apply(home, ROOT)
                self.assertEqual(before, {item: item.read_bytes() for item in before})
                self.assertFalse((home / ".agents").exists())

    def test_added_blocks_never_carry_complete_managed_marker_tags(self):
        replacements = INSTALLER.render_manual_blocks(ROOT)
        for start in INSTALLER.ADDED_WHEN_ABSENT_BLOCKS:
            self.assertIsNone(INSTALLER.MANAGED_MARKER_RE.search(replacements[start]), start)

    def test_optional_block_helper_preserves_absence_instead_of_appending(self):
        content = b"unrelated bytes\n"
        actual = INSTALLER._replace_owned_block(
            content, b"replacement", Path("fixture"), b"<!-- OPTIONAL -->",
            b"<!-- /OPTIONAL -->", INSTALLER._block_re(b"OPTIONAL"), False)
        self.assertEqual(actual, content)

    def test_targeted_personal_block_rejection_precedes_all_runtime_writes(self):
        for name, _ in self.TARGETED_BLOCKS:
            canonical = self._personal_block(name, annotated=False)
            annotated = self._personal_block(name)
            cases = {
                "duplicate": canonical + annotated,
                "unclosed": b"<!-- " + name + self.MANUAL_ANNOTATION + b" -->\nold\n",
                "orphan-close": b"<!-- /" + name + b" -->\n",
                "unclosed-at-eof": b"<!-- " + name,
                "unsupported-annotation": self._personal_block(name, annotated=True).replace(self.MANUAL_ANNOTATION, b" (guess)"),
                "inline": b"prefix " + annotated,
                "nested-managed": b"<!-- gentle-ai:persona -->\n" + annotated + b"<!-- /gentle-ai:persona -->\n",
                "nested-section": b"<!-- section:persona -->\n" + annotated + b"<!-- /section:persona -->\n",
                "overlap": b"<!-- " + name + b" -->\n" + INSTALLER.render_manual_block(ROOT) + b"<!-- /" + name + b" -->\n",
                "reverse-managed": b"<!-- " + name + b" -->\n<!-- gentle-ai:persona -->\nmanaged\n<!-- /gentle-ai:persona -->\n<!-- /" + name + b" -->\n",
            }
            for case, invalid in cases.items():
                with self.subTest(name=name, case=case), tempfile.TemporaryDirectory() as raw:
                    home = Path(raw)
                    self._seed_runtime(home)
                    path = home / ".pi/agent/APPEND_SYSTEM.md"
                    # Overlap supplies its own required routing block.
                    path.write_bytes(invalid if case == "overlap" else path.read_bytes() + invalid)
                    before = {item: item.read_bytes() for item in INSTALLER.manual_paths(home)}
                    with self.assertRaises(INSTALLER.InstallError):
                        INSTALLER.apply(home, ROOT)
                    self.assertEqual(before, {item: item.read_bytes() for item in before})
                    self.assertFalse((home / ".agents").exists())
                    self.assertFalse((home / ".local").exists())

    def test_similarly_named_personal_markers_remain_unrelated(self):
        for name, _ in self.TARGETED_BLOCKS:
            path = self.home / ".pi/agent/APPEND_SYSTEM.md"
            unrelated = self._personal_block(name + b"-OTHER")
            path.write_bytes(path.read_bytes() + unrelated)
            desired = INSTALLER.desired_personal_content(path, INSTALLER.render_personal_blocks(ROOT))
            self.assertIn(unrelated, desired)

    def test_personal_instruction_symlinks_are_refused_before_any_write(self):
        for relative in INSTALLER.MANUAL_FILES:
            with self.subTest(relative=relative), tempfile.TemporaryDirectory() as raw:
                home = Path(raw)
                self._seed_runtime(home)
                external = home / "external-instructions"
                protected = (home / relative).read_bytes() + self._personal_block(self.TARGETED_BLOCKS[0][0])
                external.write_bytes(protected)
                (home / relative).unlink()
                (home / relative).symlink_to(external)
                with self.assertRaises(INSTALLER.InstallError):
                    INSTALLER.apply(home, ROOT)
                self.assertEqual(external.read_bytes(), protected)
                self.assertFalse((home / ".agents").exists())

    def test_wrong_type_destination_is_rejected_before_any_mutation(self):
        wrong_type = self.home / ".agents/skills/chanks-0-agente-soporte/SKILL.md"
        wrong_type.mkdir(parents=True)
        sentinel = wrong_type / "sentinel"
        sentinel.write_bytes(b"protected")
        before = {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)}

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)})
        self.assertFalse((self.home / ".agents/skills/chanks-2-planificador-granular").exists())
        self.assertEqual(sentinel.read_bytes(), b"protected")

    def test_wrong_type_skill_directory_is_rejected_before_any_mutation(self):
        wrong_type = self.home / ".agents/skills/chanks-0-agente-soporte"
        wrong_type.parent.mkdir(parents=True)
        wrong_type.write_bytes(b"protected")
        before = {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)}

        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {path: path.read_bytes() for path in INSTALLER.manual_paths(self.home)})
        self.assertFalse((self.home / ".agents/skills/chanks-2-planificador-granular").exists())
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
                # Claude reaches the central copy through a symlink; is_file follows it.
                self.assertTrue((root / "chanks-0-agente-soporte/SKILL.md").is_file())
                for deferred in INSTALLER.V3_DEFERRED_SKILLS:
                    self.assertFalse((root / deferred).exists(), deferred)
                self.assertFalse((root / "torre-control-entregas").exists())
            self.assertNotIn("torre-control-entregas", INSTALLER.SKILLS)
            self.assertEqual(INSTALLER.build_plan(home, ROOT), [])

    def test_installer_inventory_includes_every_chanks_skill_and_excludes_retired_skills(self):
        actual_chanks = {
            path.parent.name for root in (ROOT / "skills", ROOT / "skills-diferidas/v2", ROOT / "skills-diferidas/v3")
            for path in root.glob("chanks-*/SKILL.md")
        }
        self.assertEqual(set(INSTALLER.DEFERRED_SOURCE_VERSIONS), {
            "chanks-0-jornada", "chanks-3-session-kickoff", "chanks-3-coordinador-manual",
            "chanks-0-agente-soporte", "chanks-3-despacho-herdr", "chanks-4-unattended-implementation",
        })
        for name, version in INSTALLER.DEFERRED_SOURCE_VERSIONS.items():
            self.assertFalse((ROOT / "skills" / name).exists(), name)
            self.assertTrue((ROOT / "skills-diferidas" / version / name / "SKILL.md").is_file(), name)
            self.assertNotIn(name, INSTALLER.TOWER_V1_SKILLS)
        self.assertEqual(
            set(INSTALLER.CHANKS_SKILLS) | set(INSTALLER.DEFERRED_SKILLS), actual_chanks
        )
        self.assertTrue(set(INSTALLER.CHANKS_SKILLS).isdisjoint(INSTALLER.DEFERRED_SKILLS))
        self.assertEqual(
            INSTALLER.DEFERRED_SKILLS,
            INSTALLER.V2_DEFERRED_SKILLS + INSTALLER.V3_DEFERRED_SKILLS,
        )
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
                self.assertFalse((root / "chanks-1-adopcion").exists())
            self.assertIn("chanks-1-adopcion", INSTALLER.TOWER_V1_SKILLS)

    def test_v3_deferred_skills_are_not_installed_but_stay_in_the_repo(self):
        """The two automatic-Tower skills wait for V3: source kept, never installed."""
        self.assertEqual(
            set(INSTALLER.V3_DEFERRED_SKILLS),
            {
                "chanks-3-despacho-herdr",
                "chanks-4-unattended-implementation",
            },
        )
        self.assertTrue(set(INSTALLER.V3_DEFERRED_SKILLS).isdisjoint(INSTALLER.SKILLS))
        self.assertTrue(set(INSTALLER.V3_DEFERRED_SKILLS).issubset(INSTALLER.RETIRED_SKILLS))
        installed = {skill for skill, _, _ in INSTALLER.source_files(ROOT)}
        for skill in INSTALLER.V3_DEFERRED_SKILLS:
            self.assertTrue((ROOT / "skills-diferidas/v3" / skill / "SKILL.md").is_file(), skill)
            self.assertNotIn(skill, installed)
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            self._seed_runtime(home)
            INSTALLER.apply(home, ROOT)
            for root in (home / ".agents/skills", home / ".claude/skills"):
                for skill in INSTALLER.V3_DEFERRED_SKILLS:
                    self.assertFalse((root / skill).exists(), skill)

    def test_v2_deferred_kickoff_is_not_installed_but_stays_in_the_repo(self):
        """The formal Session start waits for V2 (Pista): source kept, never installed."""
        self.assertEqual(INSTALLER.V2_DEFERRED_SKILLS, (
            "chanks-0-jornada", "chanks-3-session-kickoff", "chanks-3-coordinador-manual",
        ))
        self.assertTrue(set(INSTALLER.V2_DEFERRED_SKILLS).isdisjoint(INSTALLER.SKILLS))
        self.assertTrue(set(INSTALLER.V2_DEFERRED_SKILLS).isdisjoint(INSTALLER.V3_DEFERRED_SKILLS))
        self.assertTrue(set(INSTALLER.V2_DEFERRED_SKILLS).issubset(INSTALLER.RETIRED_SKILLS))
        installed = {skill for skill, _, _ in INSTALLER.source_files(ROOT)}
        for skill in INSTALLER.V2_DEFERRED_SKILLS:
            self.assertTrue((ROOT / "skills-diferidas/v2" / skill / "SKILL.md").is_file(), skill)
            self.assertNotIn(skill, installed)
        planned = [
            change for change in INSTALLER.build_plan(self.home, ROOT)
            if "chanks-3-session-kickoff" in change.path.parts
        ]
        self.assertEqual(planned, [])
        INSTALLER.apply(self.home, ROOT)
        for root in INSTALLER.installed_skill_roots(self.home):
            for skill in INSTALLER.V2_DEFERRED_SKILLS:
                self.assertFalse(_lexists(root / skill), (root, skill))

    def test_installed_v2_deferred_copies_are_planned_and_archived_reversibly(self):
        roots = INSTALLER.installed_skill_roots(self.home)
        self.assertTrue(roots)
        source = ROOT / "skills-diferidas/v2/chanks-3-session-kickoff"
        for runtime_root in roots:
            shutil.copytree(source, runtime_root / "chanks-3-session-kickoff")

        dry_run = subprocess.run(
            [sys.executable, str(SCRIPT), "--dry-run", "--home", str(self.home)],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(dry_run.returncode, 0, dry_run.stdout + dry_run.stderr)
        kickoff_lines = [
            line for line in dry_run.stdout.splitlines() if "chanks-3-session-kickoff" in line
        ]
        self.assertEqual(len(kickoff_lines), len(roots), dry_run.stdout)
        for line in kickoff_lines:
            self.assertIn("retired-skill", line)
        for runtime_root in roots:
            self.assertTrue((runtime_root / "chanks-3-session-kickoff/SKILL.md").is_file())

        INSTALLER.apply(self.home, ROOT)

        for runtime_root in roots:
            self.assertFalse((runtime_root / "chanks-3-session-kickoff").exists())
            archived = list(
                INSTALLER.retired_skill_archive_root(runtime_root).glob("chanks-3-session-kickoff-*")
            )
            self.assertEqual(len(archived), 1, runtime_root)
            self.assertEqual(
                (archived[0] / "SKILL.md").read_bytes(), (source / "SKILL.md").read_bytes()
            )
            self.assertEqual(
                (archived[0] / "references/admission-contract.md").read_bytes(),
                (source / "references/admission-contract.md").read_bytes(),
            )
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])

    def test_installed_v3_deferred_copies_are_planned_and_archived(self):
        roots = INSTALLER.installed_skill_roots(self.home)
        self.assertTrue(roots)
        for runtime_root in roots:
            for skill in INSTALLER.V3_DEFERRED_SKILLS:
                (runtime_root / skill).mkdir(parents=True)
                (runtime_root / skill / "SKILL.md").write_text("installed copy\n", encoding="utf-8")
        planned = {
            change.path
            for change in INSTALLER.build_plan(self.home, ROOT)
            if change.kind == "retired-skill"
        }
        for runtime_root in roots:
            for skill in INSTALLER.V3_DEFERRED_SKILLS:
                self.assertIn(runtime_root / skill, planned)

        INSTALLER.apply(self.home, ROOT)

        for runtime_root in roots:
            archive = INSTALLER.retired_skill_archive_root(runtime_root)
            for skill in INSTALLER.V3_DEFERRED_SKILLS:
                self.assertFalse((runtime_root / skill).exists(), skill)
                archived = list(archive.glob(f"{skill}-*"))
                self.assertEqual(len(archived), 1, skill)
                self.assertEqual(
                    (archived[0] / "SKILL.md").read_text(encoding="utf-8"), "installed copy\n"
                )
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])

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
                self.assertFalse((home / ".agents/skills/chanks-2-planificador-granular").exists())

    def test_native_kickoff_reconciles_identity_without_inventing_a_route(self):
        content = (ROOT / "skills-diferidas/v2/chanks-3-session-kickoff/SKILL.md").read_text(encoding="utf-8")
        hard_rules = content.split("## Hard Rules", 1)[1].split("## Decision Gates", 1)[0]

        self.assertIn("same Session identity", hard_rules)
        self.assertIn("first pending Módulo for legacy", hard_rules)
        self.assertIn("native record, code, and evidence", hard_rules)
        self.assertNotIn("three canonical routes", content)
        # SDD-vs-ODD selection is Gentle AI's: kickoff admits, it never routes.
        self.assertNotIn("solicitud_sdd", content)
        self.assertNotIn("route revalidation", content)


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
        content = (ROOT / "skills-diferidas/v2/chanks-3-session-kickoff/SKILL.md").read_text(encoding="utf-8")
        execution = content.split("## Execution Steps", 1)[1].split("## Output Contract", 1)[0]

        self.assertIn("Recurso", execution)
        self.assertIn("confirmed exclusive or serial execution evidence", execution)
        self.assertIn("release only actual resources", execution)
        self.assertNotIn("MAIN", content)
        self.assertNotIn("Tower", content)

    def test_routing_starts_a_session_organically_without_resource_mechanics(self):
        content = (ROOT / "templates/session-routing.md").read_text(encoding="utf-8")

        self.assertNotIn("Recurso", content)
        self.assertNotIn("exclusive or serial", content)
        self.assertNotIn("chanks-3-session-kickoff", content)
        self.assertNotIn("radar marcar", content)
        self.assertIn("hand the chosen Session to Gentle AI through `chanks-4-puente`", content)
        self.assertIn("there is no admission step", content)

    def test_routing_selects_next_work_only_from_the_radar_queue(self):
        content = (
            ROOT / "templates/session-routing.md"
        ).read_text(encoding="utf-8")

        self.assertIn("radar status --json", content)
        self.assertIn("`LISTO`", content)
        self.assertIn("Radar never selects work", content)
        self.assertIn("Zona order", content)

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
            self.assertFalse((runtime / new).exists(), "replacement skill is Tower-owned")
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


class RetiredSkillFileTests(unittest.TestCase):
    # Portable byte fixtures exercise the same digest/path registry without depending
    # on Git history. Historical digest identities are pinned separately below.
    HISTORICAL_DIGESTS = {
        "chanks-0-agente-soporte/assets/assignment-readonly.md": (
            "1066822ccc072dc21cd5dd67965cbbcf0a03b186d276a70b593d26e4e0c8d72f",
            "9b35256b723d835665783739526a12497bf037c822521c498850a3bf253bc622",
        ),
        "chanks-0-agente-soporte/references/contrato-no-interferencia.md": (
            "c9f5b2db842d9b4751ab2a86a94cd7c30d7d538f433f4165674a5db88d6edf61",
            "b2c15bc842cc310b06489f3160d4e75a9ca111cf59bab525d1024000de7e981e",
        ),
        "chanks-0-agente-soporte/references/unidad-ejecutable.md": (
            "2d78b7322467476ce1e8c127f5ce746c62e9adb392d4ec8c8d4bac2cd8baf322",
            "a5362b5289abf87269ffbf879ab55976205cf0485cfa2c4e4132b20e5626a612",
        ),
        "chanks-5-session-doc/references/links.md": (
            "6d75a865769a7561193f06bb5f2f86f39d65b1911e6337a0a11077c863b6885b",
        ),
    }

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.home = Path(self.tempdir.name) / "home"
        InstallerTests._seed_runtime(self)
        self.source = Path(self.tempdir.name) / "source"
        shutil.copytree(ROOT, self.source)
        for relative in (
            "tools/carril", "tools/hooks/chanks-etapa.sh",
            "tools/hooks/torre-firma.sh", "tools/pi/pi-npm-host-peers",
        ):
            (self.source / relative).chmod(0o755)
        self.payloads = {
            relative: tuple(f"old fixture {relative} v{index}\n".encode()
                            for index in range(len(digests)))
            for relative, digests in self.HISTORICAL_DIGESTS.items()
        }
        self.registry = {
            relative: frozenset(hashlib.sha256(payload).hexdigest() for payload in payloads)
            for relative, payloads in self.payloads.items()
        }

    def seed(self, runtime, relative, payload=None):
        destination = runtime / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(payload if payload is not None else self.payloads[relative][0])
        return destination

    def snapshot(self):
        return tuple(
            (str(path.relative_to(self.home)),
             os.readlink(path) if path.is_symlink() else
             (path.read_bytes() if path.is_file() else None))
            for path in sorted(self.home.rglob("*"))
        )

    def archived(self, runtime, relative):
        return list((runtime / ".retired-skills/files").glob(f"*/{relative}"))

    def registry_patch(self):
        return mock.patch.object(INSTALLER, "RETIRED_SKILL_FILES", self.registry, create=True)

    def test_tombstones_pin_only_all_known_historical_versions(self):
        self.assertEqual(
            dict(INSTALLER.RETIRED_SKILL_FILES),
            {relative: frozenset(digests)
             for relative, digests in self.HISTORICAL_DIGESTS.items()},
        )

    def test_all_known_paths_and_versions_archive_identical_bytes_in_every_runtime(self):
        with self.registry_patch():
            for version in range(2):
                seeded = []
                # Retired files are retired in the central folder; the other roots
                # hold links or no own skill at all.
                for runtime in INSTALLER.runtime_skill_roots(self.home)[:1]:
                    for relative, payloads in self.payloads.items():
                        payload = payloads[min(version, len(payloads) - 1)]
                        seeded.append((runtime, relative, payload, self.seed(runtime, relative, payload)))
                planned = INSTALLER.build_plan(self.home, self.source)
                self.assertEqual(
                    {change.path for change in planned if change.kind == "retired-skill-file"},
                    {path for _, relative, _, path in seeded
                     if relative.split("/")[0] not in INSTALLER.TOWER_V1_SKILLS},
                )
                INSTALLER.apply(self.home, self.source)
                for runtime, relative, payload, path in seeded:
                    if relative.split("/")[0] in INSTALLER.TOWER_V1_SKILLS:
                        self.assertEqual(path.read_bytes(), payload)
                        self.assertEqual(self.archived(runtime, relative), [])
                        continue
                    self.assertFalse(path.exists())
                    self.assertTrue(path.parent.is_dir(), "leave empty skill directories intact")
                    backups = self.archived(runtime, relative)
                    self.assertEqual(len(backups), version + 1)
                    self.assertIn(payload, [backup.read_bytes() for backup in backups])
                self.assertEqual(INSTALLER.apply(self.home, self.source), [])
                self.assertEqual(INSTALLER.build_plan(self.home, self.source), [])

    def test_modified_unlisted_and_missing_files_are_not_retired(self):
        preserved = []
        for runtime in INSTALLER.runtime_skill_roots(self.home)[:1]:
            for relative in self.payloads:
                preserved.append(self.seed(runtime, relative, b"user edit\x00\n"))
            preserved.append(self.seed(runtime, "chanks-0-agente-soporte/references/my-notes.md", b"user edit\x00\n"))
        with self.registry_patch():
            self.assertFalse(any(change.kind == "retired-skill-file"
                                 for change in INSTALLER.build_plan(self.home, self.source)))
            INSTALLER.apply(self.home, self.source)
            for path in preserved:
                self.assertEqual(path.read_bytes(), b"user edit\x00\n")
            for path in preserved:
                path.unlink()
            self.assertEqual(INSTALLER.build_plan(self.home, self.source), [])

    def test_reintroduced_source_and_restored_notion_are_never_retirement_candidates(self):
        runtime = INSTALLER.runtime_skill_roots(self.home)[0]
        relative = next(iter(self.payloads))
        self.seed(runtime, relative)
        skill, nested = relative.split("/", 1)
        self.seed(INSTALLER.skill_source_root(self.source, skill), nested, b"reintroduced canonical\n")
        with self.registry_patch():
            planned = INSTALLER.build_plan(self.home, self.source)
            self.assertFalse(any(change.kind == "retired-skill-file" for change in planned))
            INSTALLER.apply(self.home, self.source)
        self.assertEqual((runtime / relative).read_bytes(), b"reintroduced canonical\n")
        for skill, nested, source in INSTALLER.source_files(self.source):
            if "notion" in str(nested) or "session-doc" in source.name:
                installed = runtime / skill / nested
                self.assertFalse(installed.exists(), "Tower-owned source must not be installed here")
        self.assertEqual(self.archived(runtime, relative), [])

    def test_unsafe_retired_and_archive_paths_fail_before_any_writes(self):
        relative = next(iter(self.payloads))
        external = Path(self.tempdir.name) / "external"
        external.mkdir()
        sentinel = external / "sentinel"
        sentinel.write_bytes(b"outside owned surface")
        for unsafe in (relative, str(Path(relative).parent), ".retired-skills", ".retired-skills/files"):
            for kind in ("symlink", "wrong-type"):
                with self.subTest(unsafe=unsafe, kind=kind):
                    shutil.rmtree(self.home)
                    InstallerTests._seed_runtime(self)
                    runtime = INSTALLER.runtime_skill_roots(self.home)[0]
                    target = runtime / unsafe
                    target.parent.mkdir(parents=True, exist_ok=True)
                    if kind == "symlink":
                        target.symlink_to(external, target_is_directory=True)
                    elif unsafe == relative:
                        target.mkdir()
                    else:
                        target.write_bytes(b"not a directory")
                    before = self.snapshot()
                    with self.registry_patch(), self.assertRaises(INSTALLER.InstallError):
                        INSTALLER.apply(self.home, self.source)
                    self.assertEqual(self.snapshot(), before)
                    self.assertEqual(sentinel.read_bytes(), b"outside owned surface")
                    self.assertEqual(list(external.iterdir()), [sentinel])
                    if target.is_symlink() or target.is_file():
                        target.unlink()
                    else:
                        target.rmdir()

    def test_escaping_tombstone_fails_before_any_writes(self):
        self.registry["../outside.md"] = frozenset()
        before = self.snapshot()
        with self.registry_patch(), self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, self.source)
        self.assertEqual(self.snapshot(), before)

    def test_changed_digest_after_planning_is_preserved(self):
        runtime = INSTALLER.runtime_skill_roots(self.home)[0]
        relative = next(iter(self.payloads))
        path = self.seed(runtime, relative)
        original_copy = INSTALLER._atomic_copy

        def edit_then_copy(*args, **kwargs):
            path.write_bytes(b"changed after plan\n")
            return original_copy(*args, **kwargs)

        with self.registry_patch(), mock.patch.object(INSTALLER, "_atomic_copy", side_effect=edit_then_copy):
            INSTALLER.apply(self.home, self.source)
        self.assertEqual(path.read_bytes(), b"changed after plan\n")
        self.assertEqual(self.archived(runtime, relative), [])

    def test_late_install_failure_leaves_obsolete_file_active(self):
        runtime = INSTALLER.runtime_skill_roots(self.home)[0]
        relative = next(iter(self.payloads))
        path = self.seed(runtime, relative)
        with self.registry_patch(), mock.patch.object(INSTALLER, "install_pi_npm_host_peers", side_effect=OSError("late failure")):
            with self.assertRaisesRegex(OSError, "late failure"):
                INSTALLER.apply(self.home, self.source)
        self.assertEqual(path.read_bytes(), self.payloads[relative][0])
        self.assertEqual(self.archived(runtime, relative), [])

    def test_archive_error_preserves_original_and_existing_backup(self):
        runtime = INSTALLER.runtime_skill_roots(self.home)[0]
        relative = next(iter(self.payloads))
        path = self.seed(runtime, relative)
        with self.registry_patch():
            INSTALLER.apply(self.home, self.source)
            old_backup = self.archived(runtime, relative)[0]
            self.seed(runtime, relative)
            with mock.patch.object(INSTALLER.os, "replace", side_effect=OSError("archive failure")):
                with self.assertRaisesRegex(OSError, "archive failure"):
                    INSTALLER.apply(self.home, self.source)
            self.assertEqual(path.read_bytes(), self.payloads[relative][0])
            self.assertEqual(old_backup.read_bytes(), self.payloads[relative][0])

    def test_same_timestamp_retirements_preserve_both_backups(self):
        runtime = INSTALLER.runtime_skill_roots(self.home)[0]
        relative = next(iter(self.payloads))
        with self.registry_patch(), mock.patch.object(INSTALLER, "datetime") as clock:
            clock.now.return_value.strftime.return_value = "20261001T000000Z"
            for payload in self.payloads[relative]:
                self.seed(runtime, relative, payload)
                INSTALLER.apply(self.home, self.source)
        backups = self.archived(runtime, relative)
        self.assertEqual(len(backups), 2)
        self.assertEqual({path.read_bytes() for path in backups}, set(self.payloads[relative]))
        self.assertTrue(all(path.relative_to(runtime / ".retired-skills/files").parts[0]
                            .startswith("20261001T000000Z-") for path in backups))

    def test_cli_dry_run_check_apply_and_clean_check_use_real_historical_bytes(self):
        # Exact immutable 929ac91 links.md blob, not a fabricated ownership fixture.
        historical = (
            "# Skills y herramientas relacionadas\n\n"
            "- `cognitive-doc-design` — estructura la narrativa de cierre para lectura rápida.\n"
            "- `chanks-4-puente` — aporta evidencia de `verify`, entrega y, en `full-sdd`, `archive`.\n"
            "- `chanks-0-agente-soporte` — aplica el delta de evidencia y ejecuta `radar check`/`radar render`.\n"
            "- Notion MCP `notion-fetch` — lee la página antes de editar.\n"
            "- Notion MCP `notion-update-page` — actualiza o inserta contenido; nunca reemplaza toda la página.\n"
        ).encode()
        relative = "chanks-5-session-doc/references/links.md"
        self.assertEqual(hashlib.sha256(historical).hexdigest(), self.HISTORICAL_DIGESTS[relative][0])
        runtime = INSTALLER.runtime_skill_roots(self.home)[0]
        path = self.seed(runtime, relative, historical)
        before = self.snapshot()
        command = [sys.executable, str(self.source / "tools/install.py"), "--home", str(self.home)]
        for flag, code, prefix in (("--dry-run", 0, "WOULD_UPDATE"), ("--check", 1, "DRIFT")):
            result = subprocess.run(command + [flag], capture_output=True, text=True, check=False,
                                    env={**os.environ, "HOME": str(self.home)})
            self.assertEqual(result.returncode, code, result.stderr)
            self.assertNotIn(f"{prefix} retired-skill-file: {path}", result.stdout)
            self.assertEqual(self.snapshot(), before)
        applied = subprocess.run(command, capture_output=True, text=True, check=False,
                                 env={**os.environ, "HOME": str(self.home)})
        self.assertEqual(applied.returncode, 0, applied.stderr)
        self.assertEqual(path.read_bytes(), historical)
        self.assertEqual(self.archived(runtime, relative), [])
        clean = subprocess.run(command + ["--check"], capture_output=True, text=True, check=False,
                               env={**os.environ, "HOME": str(self.home)})
        self.assertEqual(clean.returncode, 0, clean.stdout + clean.stderr)


class SessionBoundaryBlockTests(unittest.TestCase):
    """The always-loaded block is one short rule; V2 machinery and admission live in skills."""

    @classmethod
    def setUpClass(cls):
        cls.template = (ROOT / "templates/session-routing.md").read_text(encoding="utf-8")
        cls.rendered = INSTALLER.render_manual_blocks(ROOT)[INSTALLER.START_MARKER]

    def test_template_is_the_marked_block_with_no_root_placeholder(self):
        self.assertTrue(self.rendered.startswith(INSTALLER.START_MARKER + b"\n"))
        self.assertTrue(self.rendered.rstrip().endswith(INSTALLER.END_MARKER))
        self.assertNotIn("{{REPO_ROOT}}", self.template)
        self.assertEqual(self.rendered, self.template.encode("utf-8"))

    def test_block_states_the_three_sentence_rule_and_stage_ownership(self):
        text = " ".join(self.template.split())
        self.assertIn(BOUNDARY_RULE, text)
        self.assertIn(STAGE_OWNERSHIP, text)
        self.assertIn("Chanks hands over the Session and receives the delivered commit", text)

    def test_rendered_block_stays_under_the_size_ceiling(self):
        self.assertLessEqual(len(self.rendered), BLOCK_SIZE_CEILING)

    def test_block_names_herdr_and_intercom_only_in_the_single_later_versions_line(self):
        lines = [line for line in self.template.splitlines()
                 if "herdr" in line.lower() or "intercom" in line.lower()]
        self.assertEqual(len(lines), 1, lines)
        self.assertIn("sealed unattended execution are V3", lines[0])
        self.assertIn("arrive with V2 (Pista)", lines[0])

    def test_block_does_not_route_to_v2_skills_or_carry_how_rules(self):
        for skill in V2_SKILLS:
            self.assertNotIn(skill, self.template)
        for how in ("--base-ref", "400", "work-unit", "Review before"):
            self.assertNotIn(how, self.template)

    def test_admission_contract_lives_in_the_kickoff_skill_and_waits_for_v2(self):
        reference = ROOT / "skills-diferidas/v2/chanks-3-session-kickoff/references/admission-contract.md"
        self.assertTrue(reference.is_file())
        self.assertIn("references/admission-contract.md",
                      (ROOT / "skills-diferidas/v2/chanks-3-session-kickoff/SKILL.md").read_text(encoding="utf-8"))
        installed = {(skill, relative.as_posix()) for skill, relative, _ in INSTALLER.source_files(ROOT)}
        self.assertNotIn(("chanks-3-session-kickoff", "references/admission-contract.md"), installed)
        self.assertNotIn("SESSION-ADMISSION-CONTRACT", self.template)

    def test_block_nested_in_another_marked_block_is_rejected_before_mutation(self):
        with tempfile.TemporaryDirectory() as raw:
            path = Path(raw) / "CLAUDE.md"
            nested = (
                b"<!-- gentle-ai:persona -->\n" + self.rendered
                + b"<!-- /gentle-ai:persona -->\n"
            )
            path.write_bytes(nested)

            with self.assertRaises(INSTALLER.InstallError):
                INSTALLER.desired_manual_content(path, INSTALLER.render_manual_blocks(ROOT))
            self.assertEqual(path.read_bytes(), nested)

    def test_block_nested_in_a_section_marker_is_rejected(self):
        with tempfile.TemporaryDirectory() as raw:
            path = Path(raw) / "AGENTS.md"
            path.write_bytes(
                b"<!-- section:team-rules -->\n" + self.rendered
                + b"<!-- /section:team-rules -->\n"
            )
            with self.assertRaises(INSTALLER.InstallError):
                INSTALLER.desired_manual_content(path, INSTALLER.render_manual_blocks(ROOT))


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
            {"SKILL.md", "assets/project-notion-map.json", "assets/session-doc.schema.json",
             "references/notion-closure.md"},
        )


if __name__ == "__main__":
    unittest.main()


RUN_NOTICE_SOURCE = """
const extension = (await import(process.argv[2])).default
const scenario = JSON.parse(process.argv[3])
const handlers = {}
const messages = []
const returns = []
const pi = { on(name, handler) { (handlers[name] ??= []).push(handler) } }
// Deliberately no tool, prompt, annotation, subprocess, or session-control API.
extension(pi)
const ctx = { cwd: scenario.cwd, hasUI: scenario.hasUI !== false,
  ui: { notify(message, level) {
    if (scenario.throwUI) throw new Error('cosmetic UI failure')
    messages.push({ message, level })
  } } }
const before = JSON.stringify(scenario.events)
for (const event of scenario.events) {
  for (const handler of handlers[event.type] ?? []) {
    const result = await handler(event, ctx)
    returns.push(result === undefined ? 'undefined' : result)
  }
}
console.log(JSON.stringify({ handlers: Object.keys(handlers), messages, returns,
  unchanged: before === JSON.stringify(scenario.events) }))
"""


class PiNoticeTests(unittest.TestCase):
    """Passive result observer; no controls or private overlay API are available."""

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.home = Path(self.tempdir.name) / "home"
        self.home.mkdir()
        self.skill = self.home / ".agents/skills/chanks-4-puente/SKILL.md"
        self.skill.parent.mkdir(parents=True)
        self.skill.write_text("# installed skill\n", encoding="utf8")

    def result(self, tool, input, id="call-1", **extra):
        return {"type": "tool_result", "toolName": tool, "input": input,
                "toolCallId": id, "content": [{"type": "text", "text": "original result"}],
                "details": {"original": True}, "structuredContent": {"keep": True},
                "isError": False, **extra}

    def run_notice(self, events, **extra):
        # Exercise the retained renderer as a fixture, not as a deployment owner.
        target = INSTALLER.pi_notices_path(self.home)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(INSTALLER.desired_pi_notices(ROOT))
        runner = self.home / "run-notices.mjs"
        runner.write_text(RUN_NOTICE_SOURCE, encoding="utf8")
        run = subprocess.run(
            ["bun", str(runner), str(INSTALLER.pi_notices_path(self.home)),
             json.dumps({"cwd": str(self.home), "events": events, **extra})],
            env={**os.environ, "HOME": str(self.home)}, cwd=self.home,
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        output = json.loads(run.stdout)
        self.assertTrue(output["unchanged"])
        self.assertTrue(all(value == "undefined" for value in output["returns"]))
        self.assertEqual(output["handlers"], ["tool_result"])
        return [message["message"] for message in output["messages"]]

    def snapshot(self):
        return {str(p.relative_to(self.home)): p.read_bytes()
                for p in self.home.rglob("*") if p.is_file()}

    def test_successful_owned_read_and_direct_radar_results_including_nested_ids(self):
        events = [
            self.result("read", {"path": str(self.skill)}),
            self.result("bash", {"command": "radar status --json -C ."}, "call-2"),
            self.result("read", {"path": "~/.agents/skills/chanks-4-puente/SKILL.md"},
                        "codemode-3/1", parentToolCallId="codemode-3"),
            self.result("bash", {"command": '"$HOME/.local/bin/radar" faltan S148'},
                        "codemode-3/2", parentToolCallId="codemode-3"),
            self.result("codemode", {"code": "await tools.bash(...)"}, "codemode-3"),
        ]
        self.assertEqual(self.run_notice(events), [
            "💪 Chanks · chanks-4-puente · lectura completada", "🗼 Torre · radar status",
            "💪 Chanks · chanks-4-puente · lectura completada", "🗼 Torre · radar faltan",
        ])

    def test_all_roster_skills_and_relative_canonical_paths(self):
        events = []
        for index, name in enumerate(INSTALLER.CHANKS_SKILLS):
            path = self.home / ".agents/skills" / name / "SKILL.md"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("# installed", encoding="utf8")
            events.append(self.result("read", {"path": str(path.relative_to(self.home))}, str(index)))
        self.assertEqual(len(self.run_notice(events)), len(INSTALLER.CHANKS_SKILLS))

    def test_failures_no_ui_and_throwing_ui_are_cosmetic(self):
        events = [self.result("read", {"path": str(self.skill)}),
                  self.result("bash", {"command": "radar check"}, "nested/1", parentToolCallId="nested")]
        self.assertEqual(self.run_notice([{**event, "isError": True} for event in events]), [])
        self.assertEqual(self.run_notice(events, hasUI=False, throwUI=True), [])
        self.assertEqual(self.run_notice(events, throwUI=True), [])

    def test_compounds_other_tools_and_unrelated_reads_do_not_notify(self):
        commands = ["false && radar status", "radar status; true", "radar status | head",
                    "echo $(radar status)", "radar status > out", "radar status # comment",
                    "radar status\ntrue", "bash -c 'radar status'", "echo radar status",
                    "env radar status", "jornada.sh", "radar unknown"]
        events = [self.result("bash", {"command": command}, str(i)) for i, command in enumerate(commands)]
        # Real impostor/support/deferred files must still be excluded by exact ownership.
        for name in ("chanks-4-puente-impostor", "analisis-por-tramos", "chanks-3-session-kickoff"):
            path = self.home / ".agents/skills" / name / "SKILL.md"
            path.parent.mkdir()
            path.write_text("# not an installed Chanks roster skill", encoding="utf8")
        for i, path in enumerate(["README.md", str(ROOT / "skills/chanks-4-puente/SKILL.md"),
                                  str(self.skill.parent / "references/guide.md"),
                                  str(self.home / ".agents/skills/chanks-3-session-kickoff/SKILL.md"),
                                  str(self.home / ".agents/skills/analisis-por-tramos/SKILL.md"),
                                  str(self.home / ".agents/skills/chanks-4-puente-impostor/SKILL.md")]):
            events.append(self.result("read", {"path": path}, f"read-{i}"))
        events += [self.result(tool, {"path": str(self.skill), "command": "radar status"}, tool)
                   for tool in ("write", "edit", "grep", "codemode")]
        self.assertEqual(self.run_notice(events), [])

    def test_symlink_alias_escaped_skill_and_symlinked_root_are_not_owned_reads(self):
        outside = self.home / "outside.md"
        outside.write_text("# impostor", encoding="utf8")
        escaped = self.home / ".agents/skills/chanks-1-prd/SKILL.md"
        escaped.parent.mkdir()
        escaped.symlink_to(outside)
        alias = self.home / "alias.md"
        alias.symlink_to(self.skill)
        linked_dir = self.home / ".agents/skills/chanks-1-rfc"
        linked_dir.symlink_to(self.skill.parent, target_is_directory=True)
        self.assertEqual(self.run_notice([
            self.result("read", {"path": str(p)}, str(i))
            for i, p in enumerate([alias, escaped, linked_dir / "SKILL.md"])
        ]), [])
        installed = self.home / ".agents/skills"
        relocated = self.home / "relocated"
        installed.rename(relocated)
        installed.symlink_to(relocated, target_is_directory=True)
        self.assertEqual(self.run_notice([self.result("read", {"path": str(self.skill)})]), [])

    def test_lifecycle_and_tool_calls_do_not_enforce_or_change_prompts(self):
        events = [{"type": name, "input": {"path": "openspec/plan.yaml", "command": "radar status"},
                   "systemPrompt": "keep original", "toolName": "write", "toolCallId": "same"}
                  for name in ("session_start", "before_agent_start", "tool_call", "agent_end", "session_shutdown")]
        self.assertEqual(self.run_notice(events), [])

    def test_invalid_read_inputs_missing_files_directories_and_escape_paths_are_quiet(self):
        directory = self.home / ".agents/skills/chanks-1-prd/SKILL.md"
        directory.mkdir(parents=True)
        outside = self.home / "SKILL.md"
        outside.write_text("# outside", encoding="utf8")
        paths = [None, 17, {}, str(directory), str(self.home / ".agents/skills/chanks-1-rfc/SKILL.md"),
                 ".agents/skills/chanks-4-puente/../../../SKILL.md"]
        self.assertEqual(self.run_notice([
            self.result("read", {"path": path}, str(i)) for i, path in enumerate(paths)
        ]), [])

    def test_atomic_write_failure_preserves_existing_file_and_leaves_no_temporary(self):
        target = INSTALLER.pi_notices_path(self.home)
        target.parent.mkdir(parents=True)
        target.write_bytes(b"previous extension")
        with mock.patch.object(INSTALLER.os, "replace", side_effect=OSError("rename failed")):
            with self.assertRaises(OSError):
                INSTALLER._atomic_write(target, b"replacement", self.home / ".pi")
        self.assertEqual(target.read_bytes(), b"previous extension")
        self.assertEqual(list(target.parent.iterdir()), [target])

    def test_template_uses_only_public_types_and_isolated_parser_dependency(self):
        body = INSTALLER.desired_pi_notices(ROOT).decode("utf8")
        self.assertIn("ExtensionAPI", body)
        self.assertIn("ToolResultEvent", body)
        self.assertIn("import { radarDirecto }", body)
        self.assertIn((ROOT / "chanks/torre-firma.mjs").resolve().as_uri(), body)
        for forbidden in ("registerTool", "registerCommand", "registerToolCallAnnotation", "tool_call",
                          "child_process", "pi-admission", "pi-authority", "pi-switch", "firmaHerramienta",
                          "before_agent_start", "observeStage", "setActiveTools"):
            self.assertNotIn(forbidden, body)
        self.assertNotIn("any", body)

    def test_standalone_helper_refuses_tower_owned_notices_without_writes(self):
        before = self.snapshot()
        target = self.home / ".pi/agent/extensions/chanks-notices.ts"
        self.assertEqual(INSTALLER.pi_notices_path(self.home), target)
        with self.assertRaisesRegex(INSTALLER.InstallError, "Tower-owned"):
            INSTALLER.install_pi_notices(self.home, ROOT)
        self.assertEqual(self.snapshot(), before)

    def test_full_installer_plan_dry_run_apply_check_and_drift(self):
        InstallerTests._seed_runtime(self)
        target = INSTALLER.pi_notices_path(self.home)
        before = self.snapshot()
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(INSTALLER.main(["--dry-run", "--home", str(self.home)]), 0)
        self.assertNotIn(f"WOULD_UPDATE pi-notices: {target}", output.getvalue())
        self.assertEqual(self.snapshot(), before)
        INSTALLER.apply(self.home, ROOT)
        self.assertFalse(target.exists())
        target.parent.mkdir(parents=True)
        target.write_bytes(b"Tower notices sentinel")
        self.assertEqual(INSTALLER.apply(self.home, ROOT), [])
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(INSTALLER.main(["--check", "--home", str(self.home)]), 0)
        target.write_bytes(b"stale")
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(INSTALLER.main(["--check", "--home", str(self.home)]), 0)
        self.assertNotIn(f"DRIFT pi-notices: {target}", output.getvalue())
        self.assertEqual(target.read_bytes(), b"stale")
        self.assertFalse(INSTALLER.pi_extension_path(self.home).exists())

    def test_notice_only_cli_never_calls_full_install_or_changes_other_surfaces(self):
        before = self.snapshot()
        args = ["--pi-notices-only", "--home", str(self.home)]
        with mock.patch.object(INSTALLER, "build_plan", side_effect=AssertionError("full plan")), \
             mock.patch.object(INSTALLER, "apply", side_effect=AssertionError("full install")), \
             contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            for mode in (["--dry-run"], ["--check"], []):
                self.assertEqual(INSTALLER.main([*args, *mode]), 2)
                self.assertEqual(self.snapshot(), before)

    def test_unsafe_destinations_fail_before_any_full_or_standalone_writes(self):
        for kind in ("file-link", "dangling-link", "directory", "parent-link", "parent-file"):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as location:
                home = Path(location) / "home"
                home.mkdir()
                InstallerTests._seed_runtime(self, home)
                INSTALLER.apply(home, ROOT)
                outside = Path(location) / "outside"
                outside.mkdir()
                sentinel = outside / "sentinel"
                sentinel.write_bytes(b"protected")
                target = home / ".pi/agent/extensions/chanks-notices.ts"
                if kind.startswith("parent"):
                    if kind == "parent-link":
                        target.parent.symlink_to(outside, target_is_directory=True)
                    else:
                        target.parent.write_bytes(b"wrong type")
                else:
                    target.parent.mkdir()
                    if kind == "directory":
                        target.mkdir()
                    else:
                        target.symlink_to(sentinel if kind == "file-link" else outside / "missing")
                before = {str(p): p.read_bytes() for p in home.rglob("*") if p.is_file()}
                INSTALLER.preflight(home, ROOT)
                self.assertEqual(INSTALLER.build_plan(home, ROOT), [])
                self.assertEqual(INSTALLER.apply(home, ROOT), [])
                for action in (INSTALLER.pi_notices_changes, INSTALLER.install_pi_notices):
                    with self.assertRaises(INSTALLER.InstallError):
                        action(home, ROOT)
                self.assertEqual({str(p): p.read_bytes() for p in home.rglob("*") if p.is_file()}, before)
                self.assertEqual(sentinel.read_bytes(), b"protected")
                self.assertEqual(list(outside.iterdir()), [sentinel])

    def test_missing_parser_does_not_create_broken_extension(self):
        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.install_pi_notices(self.home, self.home / "missing-source")
        self.assertFalse((self.home / ".pi").exists())


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
if (scenario.noAnnotationApi) delete pi.registerToolCallAnnotation
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
        # Pi's own settings.json is written by the host-peer wrapper wiring; Claude's never is.
        self.assertNotIn(".claude/settings.json", Path(INSTALLER.__file__).read_text(encoding="utf8"))

    def test_stage_hook_writer_plumbing_is_gone(self):
        """chanks-etapa.sh is Tower-owned (#158/S226): the personal installer keeps no
        writer for it — not even unwired plumbing a later edit could re-wire silently."""
        self.assertEqual([name for name in dir(INSTALLER) if name.startswith("etapa_hook")], [])

    def test_hook_calls_copiloto_and_retires_previous_stage_env(self):
        """chanks-etapa.sh delegates the card to `copiloto tarjeta`. The old
        CHANKS_PREVIOUS_ETAPA_JSON transition is retired: the source carries no
        trace of it and setting it changes nothing. A missing or checkout-local
        copiloto stays silent instead of failing the prompt, and the hook still
        handles a workspace path with spaces."""
        hook = ROOT / "tools/hooks/chanks-etapa.sh"
        self.assertNotIn("CHANKS_PREVIOUS_ETAPA_JSON", hook.read_text(encoding="utf8"))
        with tempfile.TemporaryDirectory() as location:
            directory = Path(location)
            repo = directory / "repo with spaces"
            repo.mkdir()
            subprocess.run(["git", "init", "--quiet", str(repo)], check=True, capture_output=True)
            bin_dir = directory / "installed tools"
            bin_dir.mkdir()
            copiloto = bin_dir / "copiloto"
            copiloto.write_text('#!/bin/sh\n[ "$1" = tarjeta ] || { printf "bad-order"; exit 1; }\nprintf "🧭 tarjeta: %s\\n" "$*"\n', encoding="utf8")
            copiloto.chmod(0o755)
            env = {**os.environ, "PATH": f"{bin_dir}:/usr/bin:/bin"}
            hook = ROOT / "tools/hooks/chanks-etapa.sh"
            self.assertTrue(hook.is_file())
            run = lambda extra=None: subprocess.run([str(hook)], cwd=repo, env={**env, **(extra or {})},
                                                     capture_output=True, text=True, timeout=15,
                                                     stdin=subprocess.DEVNULL)
            self.assertEqual(run().returncode, 0)
            self.assertNotIn("bad-order", run().stdout)
            self.assertIn("🧭 tarjeta:", run().stdout)
            # The hook passes the resolved repository root explicitly.
            self.assertIn("-C", run().stdout)
            # The retired variable must not change the card.
            previous = json.dumps({"schema": "radar.etapa/v1", "etapa": 1, "nombre": "Define"})
            self.assertIn("🧭 tarjeta:", run({"CHANKS_PREVIOUS_ETAPA_JSON": previous}).stdout)
            # No copiloto installed → silence, never a failure.
            silent = run({"PATH": "/usr/bin:/bin"})
            self.assertEqual(silent.returncode, 0)
            self.assertEqual(silent.stdout, "")
            # A copiloto planted inside the checkout is never executed.
            inside = repo / "copiloto"
            inside.write_text('#!/bin/sh\nprintf injected\n', encoding="utf8")
            inside.chmod(0o755)
            self.assertEqual(run({"PATH": f"{repo}:/usr/bin:/bin"}).stdout, "")

    def test_hook_payload_is_tower_owned_and_never_installed_by_the_personal_installer(self):
        """The Torre release ships and registers ~/.claude/hooks/chanks-etapa.sh; the
        personal installer has no writer for it, so a home only gets what its own
        installers own."""
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
            INSTALLER.apply(home, ROOT)
            self.assertFalse(_lexists(home / ".claude/hooks/chanks-etapa.sh"))
            self.assertEqual(INSTALLER.build_plan(home, ROOT), [])
            source = ROOT / "tools/hooks/chanks-etapa.sh"
            self.assertTrue(source.is_file())
            self.assertEqual(source.stat().st_mode & 0o777, 0o755)

    def test_tool_signature_hook_is_not_installed_and_settings_stay_untouched(self):
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
            self.assertFalse(_lexists(home / ".claude/hooks/torre-firma.sh"))
            self.assertTrue((ROOT / "tools/hooks/torre-firma.sh").is_file())
            self.assertEqual(settings.read_text(encoding="utf8"), '{"hooks": {"PreToolUse": []}}')
            self.assertEqual(INSTALLER.build_plan(home, ROOT), [])

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

    def test_missing_annotation_api_loads_normally_and_notifies_once(self):
        self._set_switch(False)
        notice = ("Chanks labels are off: this Pi build has no tool-call annotations. "
                  "Run pi-overlay-rebuild to restore them.")
        degraded = self._run_shim({"noAnnotationApi": True})
        self.assertEqual(degraded["annotations"], [])
        self.assertEqual(degraded["messages"].count(notice), 1)
        # Gates and handlers are unchanged: the same calls still reach the policy handlers.
        present = self._run_shim({})
        self.assertEqual({k: v["result"] for k, v in degraded["before"].items()},
                         {k: v["result"] for k, v in present["before"].items()})
        self.assertEqual(present["annotations"], ["read", "bash"])
        self.assertNotIn(notice, present["messages"])

    def test_inline_request_badges_and_per_session_stage_observations(self):
        self._set_switch(False)
        skill_root = self.home / ".agents/skills"
        skill = skill_root / "chanks-2-planificador-granular/SKILL.md"
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
        self.assertIn("💪 Chanks · chanks-2-planificador-granular · lectura solicitada", outcome["displayed"][outcome["skillRead"]["id"]])
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


class RetiredControlFileTests(unittest.TestCase):
    """The write lock (Pi extension) and the Tower signature hook are deferred to later
    versions: sources stay in the repository, installed copies are archived reversibly."""

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.home = Path(self.tempdir.name)
        InstallerTests._seed_runtime(self)
        self.extension = self.home / ".pi/agent/extensions/chanks-controls.ts"
        self.signature = self.home / ".claude/hooks/torre-firma.sh"

    def seed_installed_copies(self):
        payloads = {self.extension: b"// installed write lock\n", self.signature: b"#!/bin/sh\n# installed\n"}
        for path, payload in payloads.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
        self.signature.chmod(0o755)
        return payloads

    def archived(self, path):
        runtime = self.home / (".pi/agent" if path == self.extension else ".claude")
        return sorted((runtime / INSTALLER.RETIRED_CONTROL_ARCHIVE).glob(f"*/**/{path.name}"))

    def snapshot(self):
        return {
            path.relative_to(self.home).as_posix(): path.read_bytes()
            for path in sorted(self.home.rglob("*")) if path.is_file()
        }

    def test_fresh_home_plans_and_writes_neither_control_file(self):
        plan = INSTALLER.build_plan(self.home, ROOT)
        self.assertNotIn(self.extension, [change.path for change in plan])
        self.assertNotIn(self.signature, [change.path for change in plan])
        self.assertFalse({"pi-extension", "signature-hook", "retired-control"} & {c.kind for c in plan})
        INSTALLER.apply(self.home, ROOT)
        self.assertFalse(_lexists(self.extension))
        self.assertFalse(_lexists(self.signature))
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])

    def test_stage_notice_hook_is_tower_owned_and_not_installed(self):
        plan = INSTALLER.build_plan(self.home, ROOT)
        stage = self.home / ".claude/hooks/chanks-etapa.sh"
        self.assertNotIn(stage, [c.path for c in plan])
        INSTALLER.apply(self.home, ROOT)
        self.assertFalse(stage.exists())

    def test_installed_copies_are_planned_for_archive_not_rewrite(self):
        self.seed_installed_copies()
        plan = INSTALLER.build_plan(self.home, ROOT)
        kinds = {change.path: change.kind for change in plan}
        self.assertEqual(kinds[self.extension], "retired-control")
        self.assertNotIn(self.signature, kinds)
        self.assertFalse({"pi-extension", "signature-hook"} & set(kinds.values()))

    def test_dry_run_reports_the_archive_and_writes_nothing(self):
        self.seed_installed_copies()
        before = self.snapshot()
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = INSTALLER.main(["--dry-run", "--home", str(self.home)])
        self.assertEqual(code, 0)
        self.assertIn(f"WOULD_UPDATE retired-control: {self.extension}", output.getvalue())
        self.assertNotIn(f"WOULD_UPDATE retired-control: {self.signature}", output.getvalue())
        self.assertEqual(self.snapshot(), before)

    def test_apply_archives_installed_copies_byte_identical_and_is_idempotent(self):
        payloads = self.seed_installed_copies()
        INSTALLER.apply(self.home, ROOT)
        self.assertEqual(self.signature.read_bytes(), payloads[self.signature])
        self.assertEqual(self.archived(self.signature), [])
        for path, payload in payloads.items():
            if path == self.signature:
                continue
            self.assertFalse(_lexists(path), path)
            backups = self.archived(path)
            self.assertEqual(len(backups), 1, path)
            self.assertEqual(backups[0].read_bytes(), payload)
        self.assertEqual(stat.S_IMODE(self.signature.stat().st_mode), 0o755)
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])
        before = self.snapshot()
        self.assertEqual(INSTALLER.apply(self.home, ROOT), [])
        self.assertEqual(self.snapshot(), before)

    def test_archived_copy_is_not_discoverable_as_a_pi_extension(self):
        self.seed_installed_copies()
        INSTALLER.apply(self.home, ROOT)
        extensions = self.home / ".pi/agent/extensions"
        self.assertEqual(list(extensions.rglob("*.ts")), [])

    def test_a_second_retirement_never_overwrites_an_earlier_backup(self):
        self.seed_installed_copies()
        INSTALLER.apply(self.home, ROOT)
        self.extension.write_bytes(b"// reinstalled by hand\n")
        INSTALLER.apply(self.home, ROOT)
        self.assertEqual(
            sorted(backup.read_bytes() for backup in self.archived(self.extension)),
            [b"// installed write lock\n", b"// reinstalled by hand\n"],
        )

    def test_symlinked_control_file_is_refused_without_changes(self):
        outside = Path(self.tempdir.name) / "outside.ts"
        self.extension.parent.mkdir(parents=True)
        self.addCleanup(outside.unlink, missing_ok=True)
        outside.write_bytes(b"// foreign\n")
        self.extension.symlink_to(outside)
        before = self.snapshot()
        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertTrue(self.extension.is_symlink())
        self.assertEqual(outside.read_bytes(), b"// foreign\n")
        self.assertEqual(self.snapshot(), before)

    def test_archive_failure_leaves_the_installed_copy_in_place(self):
        payloads = self.seed_installed_copies()
        INSTALLER.apply(self.home, ROOT)
        self.extension.write_bytes(payloads[self.extension])
        with mock.patch.object(INSTALLER.os, "replace", side_effect=OSError("archive failure")):
            with self.assertRaisesRegex(OSError, "archive failure"):
                INSTALLER.apply(self.home, ROOT)
        self.assertEqual(self.extension.read_bytes(), payloads[self.extension])
        self.assertEqual(len(self.archived(self.extension)), 1)

    def test_retired_sources_stay_in_the_repository(self):
        self.assertTrue((ROOT / "tools/hooks/torre-firma.sh").is_file())
        self.assertIn(b"gobernar", INSTALLER.desired_pi_extension(ROOT))


class PiOverlayRebuildInstallTests(unittest.TestCase):
    """The overlay rebuild tool is deployed with the manifest and patch it needs."""

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.home = Path(self.tempdir.name)
        self.tool = self.home / ".pi/agent/bin/pi-overlay-rebuild"
        self.data = self.home / ".pi/agent/bin/pi-overlay"

    def _install(self):
        INSTALLER.install_pi_overlay_rebuild(self.home, ROOT)

    def test_tool_manifest_and_patch_are_installed_next_to_each_other(self):
        self._install()
        self.assertEqual(self.tool.read_bytes(), (ROOT / "tools/pi/pi-overlay-rebuild").read_bytes())
        self.assertEqual(stat.S_IMODE(self.tool.stat().st_mode), 0o755)
        self.assertEqual((self.data / "manifest.json").read_bytes(),
                         (ROOT / "personal-pi/manifest.json").read_bytes())
        patch = "0001-tool-call-annotations.patch"
        self.assertEqual((self.data / patch).read_bytes(),
                         (ROOT / "personal-pi/patches" / patch).read_bytes())

    def test_installed_tool_defaults_to_the_installed_data(self):
        self._install()
        loader = importlib.machinery.SourceFileLoader("installed_overlay_tool", str(self.tool))
        spec = importlib.util.spec_from_loader("installed_overlay_tool", loader)
        module = importlib.util.module_from_spec(spec)
        loader.exec_module(module)
        manifest, patch = module.default_overlay_paths()
        self.assertEqual(manifest, self.data.resolve() / "manifest.json")
        self.assertEqual(patch, self.data.resolve() / "0001-tool-call-annotations.patch")

    def test_plan_reports_missing_and_drifted_files_then_goes_quiet(self):
        kinds = {c.kind for c in INSTALLER.pi_overlay_rebuild_changes(self.home, ROOT)}
        self.assertEqual(kinds, {"pi-overlay-tool", "pi-overlay-data"})
        self._install()
        self.assertEqual(INSTALLER.pi_overlay_rebuild_changes(self.home, ROOT), [])
        (self.data / "manifest.json").write_bytes(b"{}\n")
        self.assertEqual([c.path for c in INSTALLER.pi_overlay_rebuild_changes(self.home, ROOT)],
                         [self.data / "manifest.json"])
        self.tool.chmod(0o644)
        self.assertIn(self.tool, [c.path for c in INSTALLER.pi_overlay_rebuild_changes(self.home, ROOT)])

    def test_apply_deploys_and_rerun_is_idempotent(self):
        InstallerTests._seed_runtime(self)
        INSTALLER.apply(self.home, ROOT)
        self.assertTrue(self.tool.is_file())
        self.assertTrue((self.data / "manifest.json").is_file())
        before = (self.tool.read_bytes(), (self.data / "manifest.json").read_bytes())
        INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, (self.tool.read_bytes(), (self.data / "manifest.json").read_bytes()))
        self.assertEqual(INSTALLER.pi_overlay_rebuild_changes(self.home, ROOT), [])


class PiNpmHostPeersTests(unittest.TestCase):
    """The host-peer npm wrapper is versioned here and deployed by the installer."""

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.home = Path(self.tempdir.name)
        self.wrapper = self.home / ".pi/agent/bin/pi-npm-host-peers"
        self.settings = self.home / ".pi/agent/settings.json"

    def tearDown(self):
        self.tempdir.cleanup()

    def _install(self):
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            INSTALLER.install_pi_npm_host_peers(self.home, ROOT)
        return stderr.getvalue()

    def _fake_extension(self, name="fake-ext"):
        pkg = self.home / ".pi/agent/npm/node_modules" / name
        pkg.mkdir(parents=True)
        manifest = {
            "name": name,
            "pi": {"extensions": ["./index.ts"]},
            "dependencies": {"typebox": "^1.0.0", "left-pad": "1.0.0"},
        }
        (pkg / "package.json").write_text(json.dumps(manifest))
        return pkg / "package.json"

    def test_wrapper_is_installed_executable_and_matches_source(self):
        self._install()
        self.assertEqual(
            self.wrapper.read_bytes(), (ROOT / "tools/pi/pi-npm-host-peers").read_bytes()
        )
        self.assertEqual(stat.S_IMODE(self.wrapper.stat().st_mode), 0o755)

    def test_settings_created_with_only_npm_command_when_missing(self):
        self._install()
        self.assertEqual(
            json.loads(self.settings.read_text()),
            {"npmCommand": [str(self.wrapper), "--", "npm"]},
        )

    def test_settings_merge_preserves_other_keys_and_mode(self):
        self.settings.parent.mkdir(parents=True)
        self.settings.write_text(json.dumps({"theme": "dark", "packages": ["a"]}))
        self.settings.chmod(0o600)
        self._install()
        data = json.loads(self.settings.read_text())
        self.assertEqual(data["theme"], "dark")
        self.assertEqual(data["packages"], ["a"])
        self.assertEqual(data["npmCommand"], [str(self.wrapper), "--", "npm"])
        self.assertEqual(stat.S_IMODE(self.settings.stat().st_mode), 0o600)

    def test_rerun_is_idempotent(self):
        self._install()
        self.assertTrue(INSTALLER.pi_npm_host_peers_changes(self.home, ROOT) == [])
        before = (self.wrapper.read_bytes(), self.settings.read_bytes())
        self._install()
        self.assertEqual(before, (self.wrapper.read_bytes(), self.settings.read_bytes()))

    def test_changed_wrapper_is_detected_and_overwritten(self):
        self._install()
        self.wrapper.write_bytes(b"tampered\n")
        self.assertTrue(INSTALLER.pi_npm_host_peers_changes(self.home, ROOT))
        self._install()
        self.assertEqual(
            self.wrapper.read_bytes(), (ROOT / "tools/pi/pi-npm-host-peers").read_bytes()
        )

    def test_foreign_npm_command_is_preserved_with_warning(self):
        self.settings.parent.mkdir(parents=True)
        foreign = {"npmCommand": ["/opt/mine/npm-wrap", "--", "npm"], "x": 1}
        self.settings.write_text(json.dumps(foreign))
        warning = self._install()
        self.assertEqual(json.loads(self.settings.read_text()), foreign)
        self.assertIn("npmCommand", warning)
        self.assertIn("WARNING", warning)

    def test_repair_moves_host_packages_to_peer_dependencies(self):
        manifest = self._fake_extension()
        self._install()
        data = json.loads(manifest.read_text())
        self.assertEqual(data["peerDependencies"], {"typebox": "*"})
        self.assertEqual(data["dependencies"], {"left-pad": "1.0.0"})

    def test_repair_failure_warns_without_aborting(self):
        (self.home / ".pi/agent/npm").mkdir(parents=True)
        with mock.patch.object(INSTALLER.subprocess, "run", side_effect=OSError("no node")):
            warning = self._install()
        self.assertIn("WARNING", warning)
        self.assertTrue(self.wrapper.is_file())

    def test_apply_deploys_the_wrapper(self):
        INSTALLER.apply(self.home, ROOT)
        self.assertTrue(self.wrapper.is_file())
        self.assertIn("npmCommand", json.loads(self.settings.read_text()))

    def test_wrapper_passes_through_exit_code_of_plain_command(self):
        self._install()
        result = subprocess.run(
            [str(self.wrapper), "--", "node", "-e", "process.exit(3)"], capture_output=True
        )
        self.assertEqual(result.returncode, 3)

    def test_wrapper_repairs_after_mutating_command(self):
        manifest = self._fake_extension()
        self._install()
        # install already repaired once; reset to prove the wrapper repairs on its own.
        manifest.write_text(json.dumps({
            "name": "fake-ext", "pi": {}, "dependencies": {"typebox": "1"},
        }))
        root = self.home / ".pi/agent/npm"
        fake_npm = self.home / "fake-npm"
        fake_npm.write_text("#!/bin/sh\nexit 0\n")
        fake_npm.chmod(0o755)
        result = subprocess.run(
            [str(self.wrapper), "--", str(fake_npm), "install", "--prefix", str(root)],
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0)
        data = json.loads(manifest.read_text())
        self.assertEqual(data["peerDependencies"], {"typebox": "*"})
        self.assertEqual(data["dependencies"], {})


class PiNpmOverlayTriggerTests(unittest.TestCase):
    """After a global Pi install/update the wrapper re-applies the overlay, never failing npm."""

    PACKAGE = "@earendil-works/pi-coding-agent"

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.home = Path(self.tempdir.name)
        INSTALLER.install_pi_npm_host_peers(self.home, ROOT)
        self.wrapper = self.home / ".pi/agent/bin/pi-npm-host-peers"
        self.record = self.home / "rebuild-calls"
        self.rebuild = self.home / ".pi/agent/bin/pi-overlay-rebuild"

    def _stub_rebuild(self, status=0):
        self.rebuild.write_text(f'#!/bin/sh\necho "$@" >> "{self.record}"\nexit {status}\n')
        self.rebuild.chmod(0o755)

    def _npm(self, status=0):
        fake = self.home / "fake-npm"
        fake.write_text(f"#!/bin/sh\nexit {status}\n")
        fake.chmod(0o755)
        return fake

    def _run(self, *npm_args, npm_status=0):
        return subprocess.run([str(self.wrapper), "--", str(self._npm(npm_status)), *npm_args],
                              capture_output=True, text=True)

    def _calls(self):
        return self.record.read_text().splitlines() if self.record.exists() else []

    def test_global_install_or_update_of_pi_triggers_the_rebuild_with_allow_running(self):
        self._stub_rebuild()
        for args in (("install", "-g", self.PACKAGE), ("i", "--global", f"{self.PACKAGE}@latest"),
                     ("update", "-g", f"{self.PACKAGE}@1.2.3"), ("install", "--silent", "-g", "other", self.PACKAGE)):
            self.record.unlink(missing_ok=True)
            with self.subTest(args=args):
                result = self._run(*args)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(self._calls(), ["--allow-running"])

    def test_other_commands_never_trigger_the_rebuild(self):
        self._stub_rebuild()
        for args in (("install", self.PACKAGE), ("install", "-g", "left-pad"),
                     ("install", "-g", f"{self.PACKAGE}-extra"), ("uninstall", "-g", self.PACKAGE),
                     ("list", "-g", self.PACKAGE), ("view", self.PACKAGE, "-g")):
            with self.subTest(args=args):
                self.assertEqual(self._run(*args).returncode, 0)
                self.assertEqual(self._calls(), [])

    def test_failed_npm_command_keeps_its_status_and_skips_the_rebuild(self):
        self._stub_rebuild()
        result = self._run("install", "-g", self.PACKAGE, npm_status=4)
        self.assertEqual(result.returncode, 4)
        self.assertEqual(self._calls(), [])

    def test_rebuild_failure_warns_but_keeps_the_npm_status(self):
        self._stub_rebuild(status=7)
        result = self._run("install", "-g", self.PACKAGE)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(self._calls(), ["--allow-running"])
        warnings = [line for line in result.stderr.splitlines() if "pi-overlay-rebuild" in line]
        self.assertEqual(len(warnings), 1, result.stderr)

    def test_missing_rebuild_tool_warns_but_keeps_the_npm_status(self):
        result = self._run("update", "-g", self.PACKAGE)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(len([l for l in result.stderr.splitlines() if "pi-overlay-rebuild" in l]), 1, result.stderr)

class CentralSkillsFolderTests(unittest.TestCase):
    """Own skills live once in ~/.agents/skills; Claude links to them."""

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.home = Path(self.tempdir.name)
        InstallerTests._seed_runtime(self)
        self.central = self.home / ".agents/skills"
        self.claude = self.home / ".claude/skills"
        self.opencode = self.home / ".config/opencode/skills"
        self.codex = self.home / ".codex/skills"

    def kinds(self, kind):
        return {c.path for c in INSTALLER.build_plan(self.home, ROOT) if c.kind == kind}

    def test_claude_gets_one_relative_symlink_per_personal_skill(self):
        INSTALLER.apply(self.home, ROOT)
        for skill in INSTALLER.PERSONAL_SKILLS:
            link = self.claude / skill
            self.assertTrue(link.is_symlink(), skill)
            self.assertEqual(os.readlink(link), f"../../.agents/skills/{skill}")
            self.assertEqual(link.resolve(), (self.central / skill).resolve())
            self.assertTrue((link / "SKILL.md").is_file(), skill)

    def test_central_personal_copy_is_a_real_directory_written_as_before(self):
        INSTALLER.apply(self.home, ROOT)
        for skill, relative, source in INSTALLER.source_files(ROOT, INSTALLER.PERSONAL_SKILLS):
            destination = self.central / skill / relative
            self.assertFalse(destination.is_symlink())
            self.assertEqual(INSTALLER.runtime_skill_bytes(skill, relative, source), destination.read_bytes())
        for skill in INSTALLER.OWN_SKILLS:
            self.assertFalse((self.central / skill).is_symlink(), skill)

    def test_opencode_and_codex_receive_no_own_skill(self):
        INSTALLER.apply(self.home, ROOT)
        for root in (self.opencode, self.codex):
            for skill in INSTALLER.OWN_SKILLS:
                self.assertFalse(_lexists(root / skill), (root, skill))
            self.assertFalse((root / "_shared/plan-naming-convention.md").exists())

    def test_shared_overlay_is_not_written_to_any_root(self):
        for root in (self.central, self.claude, self.opencode, self.codex):
            installed = root / "_shared/plan-naming-convention.md"
            installed.parent.mkdir(parents=True)
            installed.write_bytes(b"existing convention sentinel")
        INSTALLER.apply(self.home, ROOT)
        for root in (self.central, self.claude, self.opencode, self.codex):
            self.assertEqual((root / "_shared/plan-naming-convention.md").read_bytes(),
                             b"existing convention sentinel")

    def test_real_personal_copies_are_archived_then_linked(self):
        for root in (self.claude, self.opencode, self.codex):
            for skill in INSTALLER.PERSONAL_SKILLS:
                (root / skill).mkdir(parents=True)
                (root / skill / "SKILL.md").write_text(f"old {root.name} {skill}\n")
        planned = INSTALLER.build_plan(self.home, ROOT)
        archives = {c.path for c in planned if c.kind == "own-skill-archive"}
        for root in (self.claude, self.opencode, self.codex):
            for skill in INSTALLER.PERSONAL_SKILLS:
                self.assertIn(root / skill, archives)
        INSTALLER.apply(self.home, ROOT)
        for root in (self.claude, self.opencode, self.codex):
            archive = INSTALLER.retired_skill_archive_root(root)
            for skill in INSTALLER.PERSONAL_SKILLS:
                found = list(archive.glob(f"{skill}-*"))
                self.assertEqual(len(found), 1, (root, skill))
                self.assertEqual(
                    (found[0] / "SKILL.md").read_text(), f"old {root.name} {skill}\n"
                )
        for skill in INSTALLER.PERSONAL_SKILLS:
            self.assertTrue((self.claude / skill).is_symlink())
            self.assertFalse(_lexists(self.opencode / skill))
            self.assertFalse(_lexists(self.codex / skill))
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])

    def test_correct_symlink_is_idempotent_and_wrong_symlink_is_replaced(self):
        INSTALLER.apply(self.home, ROOT)
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])
        wrong = self.claude / "chanks-0-agente-soporte"
        wrong.unlink()
        elsewhere = self.home / "elsewhere"
        elsewhere.mkdir()
        wrong.symlink_to(elsewhere, target_is_directory=True)
        planned = [c for c in INSTALLER.build_plan(self.home, ROOT)]
        self.assertEqual([(c.path, c.kind) for c in planned], [(wrong, "skill-link-replace")])
        INSTALLER.apply(self.home, ROOT)
        self.assertEqual(os.readlink(wrong), "../../.agents/skills/chanks-0-agente-soporte")
        self.assertEqual(list(elsewhere.iterdir()), [])
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])

    def test_symlinked_runtime_root_is_still_refused(self):
        external = self.home / "external"
        external.mkdir()
        (self.claude).parent.mkdir(parents=True, exist_ok=True)
        self.claude.symlink_to(external, target_is_directory=True)
        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertEqual(list(external.iterdir()), [])

    def test_nothing_is_ever_written_through_a_skill_symlink(self):
        INSTALLER.apply(self.home, ROOT)
        before = {p: p.read_bytes() for p in self.central.rglob("*") if p.is_file()}
        # Drift in the central copy is repaired in the central folder only.
        target = self.central / "chanks-0-agente-soporte/SKILL.md"
        target.chmod(0o644)
        target.write_bytes(b"drift")
        INSTALLER.apply(self.home, ROOT)
        self.assertEqual(before, {p: p.read_bytes() for p in self.central.rglob("*") if p.is_file()})
        self.assertTrue((self.claude / "chanks-0-agente-soporte").is_symlink())

    def test_non_directory_own_skill_entry_fails_before_any_write(self):
        self.claude.mkdir(parents=True)
        (self.claude / "chanks-0-agente-soporte").write_bytes(b"a file")
        with self.assertRaises(INSTALLER.InstallError):
            INSTALLER.apply(self.home, ROOT)
        self.assertFalse(self.central.exists())

    def test_absent_runtime_is_skipped(self):
        shutil.rmtree(self.home / ".claude")
        INSTALLER.apply(self.home, ROOT)
        self.assertFalse((self.home / ".claude").exists())
        self.assertTrue((self.central / "chanks-0-agente-soporte/SKILL.md").is_file())
        self.assertEqual(INSTALLER.build_plan(self.home, ROOT), [])

    def test_cli_describes_the_new_changes_and_a_second_run_is_clean(self):
        (self.claude / "chanks-0-agente-soporte").mkdir(parents=True)
        command = [sys.executable, str(SCRIPT), "--home", str(self.home)]
        dry = subprocess.run(command + ["--dry-run"], capture_output=True, text=True, check=False)
        self.assertEqual(dry.returncode, 0, dry.stderr)
        self.assertIn(f"WOULD_UPDATE own-skill-archive: {self.claude / 'chanks-0-agente-soporte'}", dry.stdout)
        self.assertIn("HINT: legacy Chanks blocks left untouched; run --migrate-to-tower", dry.stdout)
        self.assertIn(
            f"WOULD_UPDATE skill-link: {self.claude / 'chanks-0-agente-soporte'} "
            "(-> ../../.agents/skills/chanks-0-agente-soporte)",
            dry.stdout,
        )
        self.assertFalse((self.central / "chanks-0-agente-soporte").exists())
        check = subprocess.run(command + ["--check"], capture_output=True, text=True, check=False)
        self.assertEqual(check.returncode, 1)
        self.assertIn("DRIFT skill-link:", check.stdout)
        applied = subprocess.run(command, capture_output=True, text=True, check=False)
        self.assertEqual(applied.returncode, 0, applied.stderr)
        again = subprocess.run(command + ["--dry-run"], capture_output=True, text=True, check=False)
        self.assertIn("NO_CHANGES", again.stdout)
        clean = subprocess.run(command + ["--check"], capture_output=True, text=True, check=False)
        self.assertEqual(clean.returncode, 0, clean.stdout + clean.stderr)
