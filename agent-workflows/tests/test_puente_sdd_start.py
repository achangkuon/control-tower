import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / "skills/chanks-4-puente/scripts/prepare_new_change.py"
NATIVE = os.environ.get("GENTLE_AI_SDD_TEST_BINARY")
CHANGE = "bridge-empty"


def run(command, cwd):
    return subprocess.run(command, cwd=cwd, text=True, capture_output=True, check=False)


def snapshot(root):
    entries = []
    for path in sorted(root.rglob("*")):
        if ".git" in path.parts:
            continue
        relative = path.relative_to(root).as_posix()
        metadata = path.lstat()
        if path.is_symlink():
            entries.append((relative, "link", os.readlink(path)))
        elif path.is_dir():
            entries.append((relative, "dir", ""))
        else:
            entries.append((relative, "file", hashlib.sha256(path.read_bytes()).hexdigest()))
    return tuple(entries)


def with_empty_change(snapshot_before):
    return tuple(sorted((*snapshot_before, (f"openspec/changes/{CHANGE}", "dir", ""))))


def git_state(root):
    def output(*args):
        result = run(["git", *args], root)
        if result.returncode:
            raise AssertionError(result.stderr)
        return result.stdout

    return (
        output("rev-parse", "HEAD"),
        output("status", "--porcelain=v1", "--untracked-files=all"),
        output("diff", "--no-ext-diff", "--binary", "HEAD"),
        (root / ".git/HEAD").read_bytes(),
        (root / ".git/config").read_bytes(),
    )


class RepoFixture(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name) / "workspace"
        self.root.mkdir()
        self.git("init", "-q")
        self.git("config", "user.email", "bridge-test@example.invalid")
        self.git("config", "user.name", "Bridge Test")
        self.git("config", "commit.gpgsign", "false")
        self.openspec = self.root / "openspec"
        self.changes = self.openspec / "changes"
        self.archive = self.changes / "archive"
        self.archive.mkdir(parents=True)
        (self.openspec / "config.yaml").write_text("schema: spec-driven\n", encoding="utf-8")
        (self.root / "seed.txt").write_text("seed\n", encoding="utf-8")
        self.git("add", "seed.txt", "openspec/config.yaml")
        self.git("-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "-qm", "seed")

    def tearDown(self):
        self.tempdir.cleanup()

    def git(self, *args):
        result = run(["git", *args], self.root)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def helper(self, **overrides):
        arguments = {
            "--workspace": str(self.root),
            "--change": CHANGE,
            "--intent": "new",
            "--route": "full-sdd",
            "--native-artifact-store": "openspec",
        }
        arguments.update(overrides)
        command = [sys.executable, str(HELPER)]
        for option, value in arguments.items():
            command.extend((option, value))
        return run(command, self.root)

    def assert_rejected_without_mutation(self, **overrides):
        before_files, before_git = snapshot(self.root), git_state(self.root)
        result = self.helper(**overrides)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(snapshot(self.root), before_files)
        self.assertEqual(git_state(self.root), before_git)
        return result


class PrepareNewChangeEligibilityTests(RepoFixture):
    def test_creates_only_the_empty_canonical_change_container(self):
        before_files, before_git = snapshot(self.root), git_state(self.root)

        result = self.helper()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, f"created {CHANGE}\n")
        self.assertEqual(snapshot(self.root), with_empty_change(before_files))
        self.assertEqual(git_state(self.root), before_git)
        self.assertEqual(list((self.changes / CHANGE).iterdir()), [])

    def test_rejects_excluded_intents_routes_and_stores_before_writing(self):
        matrix = (
            ("--intent", "resume"),
            ("--intent", "continue"),
            ("--route", "direct"),
            ("--route", "design-tasks"),
            ("--route", "resume"),
            ("--native-artifact-store", "memory"),
            ("--native-artifact-store", "unknown"),
        )
        for option, value in matrix:
            with self.subTest(option=option, value=value):
                self.assert_rejected_without_mutation(**{option: value})

    def test_rejects_bad_change_names_before_writing(self):
        for name in ("", ".", "..", "../outside", "nested/change", "white space"):
            with self.subTest(name=name):
                self.assert_rejected_without_mutation(**{"--change": name})

    def test_rejects_noncanonical_or_symlinked_workspaces(self):
        noncanonical = f"{self.root}/openspec/.."
        self.assert_rejected_without_mutation(**{"--workspace": noncanonical})
        linked = self.root.parent / "workspace-link"
        linked.symlink_to(self.root, target_is_directory=True)
        self.assert_rejected_without_mutation(**{"--workspace": str(linked)})

    def test_rejects_missing_or_symlinked_config_and_parents(self):
        config = self.openspec / "config.yaml"
        config.unlink()
        self.assert_rejected_without_mutation()
        config.write_text("schema: spec-driven\n", encoding="utf-8")
        external = self.root / "external-config"
        external.write_text("schema: spec-driven\n", encoding="utf-8")
        config.unlink()
        config.symlink_to(external)
        self.assert_rejected_without_mutation()

        config.unlink()
        config.write_text("schema: spec-driven\n", encoding="utf-8")
        self.archive.rmdir()
        self.assert_rejected_without_mutation()

    def test_rejects_symlinked_changes_parent_without_following_it(self):
        self.archive.rmdir()
        self.changes.rmdir()
        external = self.root / "external-changes"
        external.mkdir()
        (external / "sentinel").write_text("preserve", encoding="utf-8")
        self.changes.symlink_to(external, target_is_directory=True)

        self.assert_rejected_without_mutation()
        self.assertEqual((external / "sentinel").read_text(encoding="utf-8"), "preserve")


class PrepareNewChangeCollisionTests(RepoFixture):
    def test_rejects_existing_change_without_mutating_it(self):
        target = self.changes / CHANGE
        target.mkdir()
        (target / "sentinel").write_text("preserve", encoding="utf-8")

        result = self.assert_rejected_without_mutation()

        self.assertIn("already exists", result.stderr)
        self.assertEqual((target / "sentinel").read_text(encoding="utf-8"), "preserve")

    def test_rejects_exact_dated_and_legacy_archive_matches(self):
        dated = self.archive / f"2026-04-15-{CHANGE}"
        dated.mkdir()
        (dated / "sentinel").write_text("preserve", encoding="utf-8")
        result = self.assert_rejected_without_mutation()
        self.assertIn("archive", result.stderr)
        self.assertEqual((dated / "sentinel").read_text(encoding="utf-8"), "preserve")
        (dated / "sentinel").unlink()
        dated.rmdir()

        legacy = self.archive / CHANGE
        legacy.mkdir()
        (legacy / "sentinel").write_text("preserve", encoding="utf-8")
        result = self.assert_rejected_without_mutation()
        self.assertIn("archive", result.stderr)
        self.assertEqual((legacy / "sentinel").read_text(encoding="utf-8"), "preserve")

    def test_allows_longer_archive_names_without_a_false_match(self):
        longer = self.archive / f"2026-04-15-{CHANGE}-suffix"
        longer.mkdir()
        (longer / "sentinel").write_text("preserve", encoding="utf-8")
        before_files, before_git = snapshot(self.root), git_state(self.root)

        result = self.helper()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(snapshot(self.root), with_empty_change(before_files))
        self.assertEqual(git_state(self.root), before_git)
        self.assertEqual((longer / "sentinel").read_text(encoding="utf-8"), "preserve")


@unittest.skipUnless(NATIVE and Path(NATIVE).is_file(), "native SDD test binary is unavailable")
class NativeSddStatusIntegrationTests(RepoFixture):
    def status(self):
        result = run([NATIVE, "sdd-status", CHANGE, "--cwd", str(self.root), "--json"], self.root)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def assert_status(self, payload, recommended, change_root, blockers):
        self.assertEqual(payload["schemaName"], "gentle-ai.sdd-status")
        self.assertEqual(payload["schemaVersion"], 2)
        self.assertEqual(payload["changeName"], CHANGE)
        self.assertEqual(payload["artifactStore"], "openspec")
        self.assertEqual(payload["planningHome"], {"mode": "repo-local", "path": str(self.openspec)})
        self.assertEqual(payload["actionContext"], {"mode": "repo-local", "workspaceRoot": str(self.root), "allowedEditRoots": [str(self.root)]})
        self.assertEqual(payload["changeRoot"], change_root)
        self.assertEqual(payload["nextRecommended"], recommended)
        self.assertEqual(payload["blockedReasons"], blockers)

    def test_status_handoff_is_read_only_before_and_after_empty_preparation(self):
        before_files, before_git = snapshot(self.root), git_state(self.root)
        missing = self.status()
        self.assert_status(missing, "sdd-new", None, [f"Active OpenSpec change not found: {CHANGE}."])
        self.assertEqual(snapshot(self.root), before_files)
        self.assertEqual(git_state(self.root), before_git)

        prepared = self.helper()
        self.assertEqual(prepared.returncode, 0, prepared.stderr)
        target = self.changes / CHANGE
        self.assertEqual(list(target.iterdir()), [])
        prepared_files, prepared_git = snapshot(self.root), git_state(self.root)

        proposed = self.status()
        self.assert_status(proposed, "propose", str(target), [])
        self.assertEqual(snapshot(self.root), prepared_files)
        self.assertEqual(git_state(self.root), prepared_git)
        self.assertEqual(list(target.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
