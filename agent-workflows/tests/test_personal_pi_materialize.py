"""Hermetic contract tests for the private Pi overlay."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "personal-pi/materialize.py"


def git(cwd, *args, check=True):
    return subprocess.run(["git", *args], cwd=cwd, check=check, capture_output=True, text=True)


class MaterializeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root / "source"
        self.source.mkdir()
        git(self.source, "init", "-q")
        git(self.source, "config", "user.name", "Test")
        git(self.source, "config", "user.email", "test@example.invalid")
        git(self.source, "remote", "add", "upstream", "https://example.invalid/pi.git")
        (self.source / "tool.txt").write_text("base\n")
        git(self.source, "add", "-A")
        git(self.source, "commit", "-qm", "base")
        base = git(self.source, "rev-parse", "HEAD").stdout.strip()
        tree = git(self.source, "rev-parse", "HEAD^{tree}").stdout.strip()
        (self.source / "tool.txt").write_text("overlay\n")
        git(self.source, "commit", "-qam", "overlay")
        reviewed = git(self.source, "rev-parse", "HEAD").stdout.strip()
        patch = git(self.source, "format-patch", "--stdout", f"{base}..{reviewed}", "--", "tool.txt").stdout.encode()
        self.patch = self.root / "overlay.patch"
        self.patch.write_bytes(patch)
        git(self.source, "commit", "--allow-empty", "-qm", "evidence")
        evidence = git(self.source, "rev-parse", "HEAD").stdout.strip()
        result = git(self.source, "rev-parse", "HEAD^{tree}").stdout.strip()
        self.manifest = self.root / "manifest.json"
        self.data = dict(upstream="https://example.invalid/pi.git", base_commit=base, base_tree=tree,
                         reviewed_commit=reviewed, evidence_commit=evidence, patch_sha256=hashlib.sha256(patch).hexdigest(),
                         result_tree=result, selected_paths=["tool.txt"])
        self.save()

    def save(self):
        self.manifest.write_text(json.dumps(self.data))

    def run_materialize(self, name="output"):
        return subprocess.run([sys.executable, str(SCRIPT), str(self.root / name),
                               "--source", str(self.source), "--manifest", str(self.manifest),
                               "--patch", str(self.patch)], capture_output=True, text=True)

    def test_materializes_only_explicit_destination(self):
        before = git(self.source, "status", "--porcelain").stdout
        run = self.run_materialize()
        self.assertEqual(run.returncode, 0, run.stderr)
        output = self.root / "output"
        self.assertEqual((output / "tool.txt").read_text(), "overlay\n")
        self.assertEqual(git(output, "write-tree").stdout.strip(), self.data["result_tree"])
        self.assertEqual(git(self.source, "status", "--porcelain").stdout, before)

    def test_rejects_wrong_upstream_base_digest_result_and_conflict(self):
        for key, bad in (("upstream", "https://wrong.invalid/pi.git"),
                         ("base_commit", self.data["reviewed_commit"]),
                         ("base_tree", "0" * 40), ("patch_sha256", "0" * 64),
                         ("result_tree", "0" * 40)):
            with self.subTest(key=key):
                original = self.data[key]
                self.data[key] = bad
                self.save()
                run = self.run_materialize(f"bad-{key}")
                self.assertNotEqual(run.returncode, 0, run.stdout)
                self.data[key] = original
        self.save()
        self.patch.write_bytes(self.patch.read_bytes().replace(b"-base", b"-other"))
        self.data["patch_sha256"] = hashlib.sha256(self.patch.read_bytes()).hexdigest()
        self.save()
        self.assertNotEqual(self.run_materialize("conflict").returncode, 0)

    def test_rejects_existing_destination_and_source_provenance_drift(self):
        (self.root / "occupied").mkdir()
        self.assertNotEqual(self.run_materialize("occupied").returncode, 0)
        self.data["evidence_commit"] = self.data["base_commit"]
        self.save()
        self.assertNotEqual(self.run_materialize("provenance").returncode, 0)


class PinnedManifestTests(unittest.TestCase):
    """The shipped manifest and patch must agree and name the v1.0.0 port."""

    ROOT = Path(__file__).resolve().parents[1] / "personal-pi"

    def test_shipped_patch_matches_manifest_and_v1_base(self):
        manifest = json.loads((self.ROOT / "manifest.json").read_text())
        patch = (self.ROOT / "patches/0001-tool-call-annotations.patch").read_bytes()
        self.assertEqual(hashlib.sha256(patch).hexdigest(), manifest["patch_sha256"])
        self.assertEqual(manifest["base_commit"], "a13d35a742c6ef8462812a28fbe1d8c8b7431c32")
        self.assertEqual(manifest["result_tree"], "936c4a5c941b2e3d94439896d31b8a62bb0c2dd4")
        self.assertEqual(len(manifest["selected_paths"]), 13)


if __name__ == "__main__":
    unittest.main()
