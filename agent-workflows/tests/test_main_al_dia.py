"""Tests for tools/main-al-dia, the read-only session-start freshness check."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/main-al-dia"

GIT_ENV = {
    "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_AUTHOR_NAME": "Main Al Dia",
    "GIT_AUTHOR_EMAIL": "main-al-dia@example.com",
    "GIT_COMMITTER_NAME": "Main Al Dia",
    "GIT_COMMITTER_EMAIL": "main-al-dia@example.com",
    "GIT_TERMINAL_PROMPT": "0",
}


class MainAlDiaTests(unittest.TestCase):
    def setUp(self):
        self._tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self._tempdir.cleanup)
        self.base = Path(self._tempdir.name)
        self.env = {**os.environ, **GIT_ENV, "HOME": str(self.base / "home")}

    def git(self, cwd, *args, check=True):
        result = subprocess.run(
            ["git", *args], cwd=cwd, env=self.env, capture_output=True, text=True
        )
        if check and result.returncode != 0:
            self.fail(f"git {' '.join(args)} failed: {result.stderr}")
        return result

    def clone(self, origin, name):
        destination = self.base / name
        self.git(self.base, "clone", "--quiet", str(origin), str(destination))
        return destination

    def seeded_origin(self):
        origin = self.base / "origin.git"
        self.git(self.base, "init", "--quiet", "--bare", "--initial-branch=main", str(origin))
        seed = self.clone(origin, "seed")
        (seed / "tracked.txt").write_text("one\n")
        self.git(seed, "add", "tracked.txt")
        self.git(seed, "commit", "--quiet", "-m", "seed")
        self.git(seed, "push", "--quiet", "origin", "main")
        return origin

    def advance(self, origin, name="writer"):
        """Push one more commit to the remote's current branch."""
        writer = self.clone(origin, name)
        (writer / f"{name}.txt").write_text(f"{name}\n")
        self.git(writer, "add", f"{name}.txt")
        self.git(writer, "commit", "--quiet", "-m", f"{name} commit")
        branch = self.git(writer, "rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
        self.git(writer, "push", "--quiet", "origin", branch)
        return writer

    def run_check(self, cwd):
        return subprocess.run(
            [str(SCRIPT)], cwd=cwd, env=self.env, capture_output=True, text=True
        )

    def test_outside_a_git_work_tree_skips(self):
        result = self.run_check(self.base)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout.strip(), "SKIP not-a-git-work-tree")

    def test_repository_without_origin_skips(self):
        repo = self.base / "solo"
        self.git(self.base, "init", "--quiet", "--initial-branch=main", str(repo))
        result = self.run_check(repo)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout.strip(), "SKIP no-origin-remote")

    def test_unreachable_remote_skips_offline(self):
        origin = self.seeded_origin()
        subject = self.clone(origin, "subject")
        self.git(subject, "remote", "set-url", "origin", str(self.base / "missing.git"))
        result = self.run_check(subject)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout.strip(), "SKIP offline")

    def test_up_to_date_default_branch_reports_ok(self):
        origin = self.seeded_origin()
        subject = self.clone(origin, "subject")
        result = self.run_check(subject)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout.strip(), "OK default=main")

    def test_default_branch_behind_reports_counts(self):
        origin = self.seeded_origin()
        subject = self.clone(origin, "subject")
        self.advance(origin)
        result = self.run_check(subject)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(
            result.stdout.strip(),
            "BEHIND default=main default_behind=1 branch=main "
            "upstream_behind=1 upstream_ahead=0 behind_default=1 dirty=no",
        )

    def test_feature_branch_behind_its_upstream_reports_counts(self):
        origin = self.seeded_origin()
        subject = self.clone(origin, "subject")
        self.git(subject, "checkout", "--quiet", "-b", "feature")
        (subject / "feature.txt").write_text("one\n")
        self.git(subject, "add", "feature.txt")
        self.git(subject, "commit", "--quiet", "-m", "feature work")
        self.git(subject, "push", "--quiet", "-u", "origin", "feature")
        writer = self.clone(origin, "writer")
        self.git(writer, "checkout", "--quiet", "feature")
        (writer / "feature-two.txt").write_text("two\n")
        self.git(writer, "add", "feature-two.txt")
        self.git(writer, "commit", "--quiet", "-m", "more feature work")
        self.git(writer, "push", "--quiet", "origin", "feature")
        result = self.run_check(subject)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(
            result.stdout.strip(),
            "BEHIND default=main default_behind=0 branch=feature "
            "upstream_behind=1 upstream_ahead=0 behind_default=0 dirty=no",
        )

    def test_dirty_working_tree_is_reported(self):
        origin = self.seeded_origin()
        subject = self.clone(origin, "subject")
        self.advance(origin)
        (subject / "tracked.txt").write_text("changed\n")
        result = self.run_check(subject)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(
            result.stdout.strip(),
            "BEHIND default=main default_behind=1 branch=main "
            "upstream_behind=1 upstream_ahead=0 behind_default=1 dirty=yes",
        )

    def test_default_branch_checked_out_in_another_worktree_is_compared_by_ref(self):
        origin = self.seeded_origin()
        subject = self.clone(origin, "subject")
        self.git(subject, "checkout", "--quiet", "-b", "feature")
        self.git(subject, "worktree", "add", "--quiet", str(self.base / "linked"), "main")
        self.advance(origin)
        result = self.run_check(subject)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(
            result.stdout.strip(),
            "BEHIND default=main default_behind=1 branch=feature "
            "upstream_behind=0 upstream_ahead=0 behind_default=1 dirty=no",
        )

    def test_never_moves_local_refs_and_always_exits_zero(self):
        origin = self.seeded_origin()
        subject = self.clone(origin, "subject")
        self.advance(origin)
        head = self.git(subject, "rev-parse", "HEAD").stdout.strip()
        branch = self.git(subject, "symbolic-ref", "--quiet", "HEAD").stdout.strip()
        result = self.run_check(subject)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(self.git(subject, "rev-parse", "HEAD").stdout.strip(), head)
        self.assertEqual(self.git(subject, "symbolic-ref", "--quiet", "HEAD").stdout.strip(), branch)


if __name__ == "__main__":
    unittest.main()
