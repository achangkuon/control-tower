"""Hermetic tests for pi-overlay-rebuild: no network, no npm, no real Pi."""
import contextlib
import fcntl
import hashlib
import importlib.machinery
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

TOOL = Path(__file__).resolve().parents[1] / "tools/pi/pi-overlay-rebuild"
MARKER = "registerToolCallAnnotation"


def load_tool():
    loader = importlib.machinery.SourceFileLoader("pi_overlay_rebuild", str(TOOL))
    spec = importlib.util.spec_from_loader("pi_overlay_rebuild", loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


def git(cwd, *args):
    return subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


class FakeSteps:
    """Replaces toolchain, build, verification, process detection, and the smoke test."""

    def __init__(self, running=False, smoke_error=None):
        self.calls = []
        self.running = running
        self.smoke_error = smoke_error

    def toolchain(self, cache_dir, log):
        self.calls.append("toolchain")
        return dict(os.environ)

    def build(self, src, env, log):
        self.calls.append("build")
        for relative, text in (("packages/coding-agent/dist/bundle/cli.js", f"// {MARKER}\n"),
                               ("packages/coding-agent/dist/index.js", f"// {MARKER}\n"),
                               ("packages/tui/dist/index.js", "// built tui\n")):
            path = Path(src) / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)

    def verify(self, src, env, log):
        self.calls.append("verify")

    def other_pi_running(self):
        self.calls.append("running")
        return self.running

    def smoke(self, package_dir, version):
        self.calls.append("smoke")
        if self.smoke_error:
            return self.smoke_error
        return None if MARKER in (package_dir / "dist/index.js").read_text() else "overlay missing"


class RebuildTests(unittest.TestCase):
    def setUp(self):
        self.tool = load_tool()
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.upstream = self.root / "upstream"
        self.upstream.mkdir()
        git(self.upstream, "init", "-q", "-b", "main")
        git(self.upstream, "config", "user.name", "Test")
        git(self.upstream, "config", "user.email", "test@example.invalid")
        (self.upstream / "tool.txt").write_text("base\n")
        (self.upstream / "other.txt").write_text("other\n")
        git(self.upstream, "add", "-A")
        git(self.upstream, "commit", "-qm", "base")
        git(self.upstream, "tag", "v1.0.0")
        self.base = git(self.upstream, "rev-parse", "HEAD")
        self.base_tree = git(self.upstream, "rev-parse", "HEAD^{tree}")
        (self.upstream / "tool.txt").write_text("overlay\n")
        git(self.upstream, "commit", "-qam", "overlay")
        reviewed = git(self.upstream, "rev-parse", "HEAD")
        patch = subprocess.run(["git", "format-patch", "--stdout", f"{self.base}..{reviewed}"],
                               cwd=self.upstream, check=True, capture_output=True).stdout
        self.result_tree = git(self.upstream, "rev-parse", "HEAD^{tree}")
        # Later upstream tags: one touching another file, one conflicting with the patch.
        git(self.upstream, "checkout", "-q", "-b", "compatible", self.base)
        (self.upstream / "other.txt").write_text("other changed\n")
        git(self.upstream, "commit", "-qam", "compatible")
        git(self.upstream, "tag", "v1.1.0")
        git(self.upstream, "checkout", "-q", "-b", "conflicting", self.base)
        (self.upstream / "tool.txt").write_text("rewritten\n")
        git(self.upstream, "commit", "-qam", "conflicting")
        git(self.upstream, "tag", "v2.0.0")
        git(self.upstream, "checkout", "-q", "main")
        self.patch = self.root / "overlay.patch"
        self.patch.write_bytes(patch)
        self.manifest = self.root / "manifest.json"
        self.data = dict(upstream=str(self.upstream), base_commit=self.base, base_tree=self.base_tree,
                         reviewed_commit=reviewed, evidence_commit=reviewed,
                         patch_sha256=hashlib.sha256(patch).hexdigest(), result_tree=self.result_tree,
                         selected_paths=["tool.txt"])
        self.save()
        self.cache = self.root / "cache"
        self.backups = self.root / "backups"
        self.steps = FakeSteps()

    def save(self):
        self.manifest.write_text(json.dumps(self.data))

    def make_package(self, version="1.0.0", patched=False):
        package = self.root / f"pkg-{version}-{patched}"
        (package / "dist/bundle").mkdir(parents=True)
        (package / "package.json").write_text(json.dumps({"name": "@earendil-works/pi-coding-agent", "version": version}))
        (package / "dist/index.js").write_text(f"// {MARKER}\n" if patched else "// public\n")
        (package / "dist/bundle/cli.js").write_text("// public cli\n")
        tui = package / "node_modules/@earendil-works/pi-tui/dist"
        tui.mkdir(parents=True)
        (tui / "index.js").write_text("// public tui\n")
        return package

    def run_tool(self, package, *extra, steps=None):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = self.tool.main(["--package-dir", str(package), "--cache-dir", str(self.cache),
                                   "--backup-root", str(self.backups), "--manifest", str(self.manifest),
                                   "--patch", str(self.patch), *extra], steps=steps or self.steps)
        return code, out.getvalue(), err.getvalue()

    def snapshot(self, package):
        return {str(p.relative_to(package)): p.read_text() for p in sorted(package.rglob("*")) if p.is_file()}

    def test_locates_package_from_a_symlinked_pi_binary(self):
        package = self.make_package()
        (self.root / "bin").mkdir()
        (self.root / "bin/pi").symlink_to(package / "dist/bundle/cli.js")
        self.assertEqual(self.tool.locate_package(str(self.root / "bin/pi")), package)
        with self.assertRaises(self.tool.RebuildError):
            self.tool.locate_package(str(self.root / "pkg-missing"))

    def test_already_patched_runtime_is_a_noop(self):
        package = self.make_package(patched=True)
        before = self.snapshot(package)
        code, out, _ = self.run_tool(package)
        self.assertEqual(code, 0)
        self.assertIn("already", out.lower())
        self.assertEqual(self.snapshot(package), before)
        self.assertEqual(self.steps.calls, [])
        self.assertFalse(self.cache.exists())

    def test_strict_mode_installs_and_backs_up_both_dists(self):
        package = self.make_package()
        code, _, err = self.run_tool(package)
        self.assertEqual(code, 0, err)
        self.assertIn(MARKER, (package / "dist/index.js").read_text())
        self.assertEqual((package / "node_modules/@earendil-works/pi-tui/dist/index.js").read_text(), "// built tui\n")
        self.assertTrue(os.access(package / "dist/bundle/cli.js", os.X_OK))
        (backup,) = list(self.backups.iterdir())
        self.assertTrue(backup.name.startswith("pi-1.0.0-public-dist-"))
        self.assertEqual((backup / "coding-agent-dist/index.js").read_text(), "// public\n")
        self.assertEqual((backup / "pi-tui-dist/index.js").read_text(), "// public tui\n")
        self.assertEqual((self.cache / "1.0.0/src/tool.txt").read_text(), "overlay\n")
        self.assertEqual(self.steps.calls, ["toolchain", "build", "verify", "running", "smoke"])

    def test_strict_mode_rejects_a_result_tree_mismatch_without_touching_the_runtime(self):
        self.data["result_tree"] = "0" * 40
        self.save()
        package = self.make_package()
        before = self.snapshot(package)
        code, _, err = self.run_tool(package)
        self.assertEqual(code, 1)
        self.assertIn("result tree", err)
        self.assertEqual(self.snapshot(package), before)
        self.assertNotIn("build", self.steps.calls)

    def test_rejects_a_patch_that_does_not_match_the_manifest_digest(self):
        self.data["patch_sha256"] = "0" * 64
        self.save()
        package = self.make_package()
        code, _, err = self.run_tool(package)
        self.assertEqual(code, 1)
        self.assertIn("SHA-256", err)
        self.assertFalse((self.cache / "1.0.0/src").exists())

    def test_drift_mode_applies_three_way_on_another_compatible_version(self):
        package = self.make_package(version="1.1.0")
        code, _, err = self.run_tool(package)
        self.assertEqual(code, 0, err)
        src = self.cache / "1.1.0/src"
        self.assertEqual((src / "tool.txt").read_text(), "overlay\n")
        self.assertEqual((src / "other.txt").read_text(), "other changed\n")
        self.assertIn(MARKER, (package / "dist/index.js").read_text())

    def test_drift_conflict_exits_3_and_leaves_the_runtime_untouched(self):
        package = self.make_package(version="2.0.0")
        before = self.snapshot(package)
        code, _, err = self.run_tool(package)
        self.assertEqual(code, 3)
        self.assertIn("manual port", err)
        self.assertEqual(self.snapshot(package), before)
        self.assertFalse(self.backups.exists())
        self.assertNotIn("build", self.steps.calls)

    def test_failed_smoke_test_restores_the_backup(self):
        package = self.make_package()
        before = self.snapshot(package)
        steps = FakeSteps(smoke_error="version mismatch")
        code, _, err = self.run_tool(package, steps=steps)
        self.assertEqual(code, self.tool.EXIT_ROLLED_BACK)
        self.assertIn("version mismatch", err)
        self.assertEqual(self.snapshot(package), before)
        self.assertTrue(list(self.backups.iterdir()))

    def test_smoke_test_timeout_restores_the_backup(self):
        package = self.make_package()
        before = self.snapshot(package)

        class TimingOut(FakeSteps):
            def smoke(self, package_dir, version):
                raise subprocess.TimeoutExpired(["cli.js", "--version"], 60)

        code, _, err = self.run_tool(package, steps=TimingOut())
        self.assertEqual(code, self.tool.EXIT_ROLLED_BACK)
        self.assertIn("timed out", err)
        self.assertEqual(self.snapshot(package), before)

    def test_failed_restore_names_the_backup_for_manual_recovery(self):
        package = self.make_package()
        steps = FakeSteps(smoke_error="version mismatch")
        original, calls = self.tool.replace_tree, []

        def failing_restore(target, source):
            calls.append(target)
            # The first two calls are the swap; the restore is what fails.
            if len(calls) > 2:
                raise OSError("disk full")
            original(target, source)

        self.tool.replace_tree = failing_restore
        code, _, err = self.run_tool(package, steps=steps)
        (backup,) = list(self.backups.iterdir())
        self.assertEqual(code, self.tool.EXIT_RESTORE_FAILED)
        self.assertIn(str(backup), err)
        self.assertIn("restore it manually", err)
        self.assertEqual((backup / "coding-agent-dist/index.js").read_text(), "// public\n")

    def test_refuses_while_another_pi_runs_unless_allowed(self):
        package = self.make_package()
        before = self.snapshot(package)
        steps = FakeSteps(running=True)
        code, _, err = self.run_tool(package, steps=steps)
        self.assertEqual(code, self.tool.EXIT_RUNNING)
        self.assertIn("running", err)
        self.assertEqual(self.snapshot(package), before)
        code, _, err = self.run_tool(package, "--allow-running", steps=FakeSteps(running=True))
        self.assertEqual(code, 0, err)

    def test_second_concurrent_run_is_refused(self):
        package = self.make_package()
        self.cache.mkdir()
        with open(self.cache / ".lock", "w") as held:
            fcntl.flock(held, fcntl.LOCK_EX | fcntl.LOCK_NB)
            code, _, err = self.run_tool(package)
        self.assertEqual(code, self.tool.EXIT_LOCKED)
        self.assertIn("another", err)
        self.assertEqual(self.steps.calls, [])

    def test_dry_run_changes_nothing(self):
        package = self.make_package(patched=True)
        before = self.snapshot(package)
        code, out, _ = self.run_tool(package, "--dry-run", "--force")
        self.assertEqual(code, 0)
        self.assertIn("would", out.lower())
        self.assertEqual(self.snapshot(package), before)
        self.assertFalse(self.cache.exists())
        self.assertFalse(self.backups.exists())
        self.assertEqual(self.steps.calls, [])

    def test_force_rebuilds_an_already_patched_runtime(self):
        package = self.make_package(patched=True)
        code, _, err = self.run_tool(package, "--force")
        self.assertEqual(code, 0, err)
        self.assertEqual((package / "node_modules/@earendil-works/pi-tui/dist/index.js").read_text(), "// built tui\n")

    def test_default_paths_fall_back_to_the_repository_layout(self):
        manifest, patch = self.tool.default_overlay_paths()
        self.assertTrue(manifest.is_file() and patch.is_file())

    def test_node_pin_constants_are_present(self):
        self.assertEqual(self.tool.NODE_VERSION, "v24.21.0")
        self.assertRegex(self.tool.NODE_SHA256, r"^[0-9a-f]{64}$")


if __name__ == "__main__":
    unittest.main()
