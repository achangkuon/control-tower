#!/usr/bin/env python3
"""Materialize the pinned private Pi overlay, never an installed or global runtime."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
FIELDS = {"upstream", "base_commit", "base_tree", "reviewed_commit", "evidence_commit",
          "patch_sha256", "result_tree", "selected_paths"}


class OverlayError(Exception):
    pass


def git(directory, *args, input_bytes=None):
    result = subprocess.run(["git", "-C", str(directory), *args], input=input_bytes,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise OverlayError(f"git {args[0]} failed: {result.stderr.decode(errors='replace').strip()}")
    return result.stdout.decode().strip()


def identity(source, manifest, local):
    remote = git(source, "remote", "get-url", "upstream" if local else "origin")
    if remote != manifest["upstream"]:
        raise OverlayError("upstream URL mismatch")
    for field in ("base_commit", "reviewed_commit", "evidence_commit"):
        if git(source, "rev-parse", f"{manifest[field]}^{{commit}}") != manifest[field]:
            raise OverlayError(f"{field} is not a full commit")
    if git(source, "rev-parse", f"{manifest['base_commit']}^{{tree}}") != manifest["base_tree"]:
        raise OverlayError("base tree mismatch")
    for child, parent in (("reviewed_commit", "base_commit"), ("evidence_commit", "reviewed_commit")):
        if git(source, "rev-list", "--parents", "-n", "1", manifest[child]).split() != [manifest[child], manifest[parent]]:
            raise OverlayError(f"{child} parent mismatch")


def validate(manifest, patch):
    if set(manifest) != FIELDS:
        raise OverlayError("manifest fields mismatch")
    if not isinstance(manifest["selected_paths"], list) or len(manifest["selected_paths"]) != len(set(manifest["selected_paths"])):
        raise OverlayError("invalid selected paths")
    if any(not isinstance(p, str) or not p.startswith("packages/") and p != "tool.txt" or
           ".." in Path(p).parts or Path(p).is_absolute() for p in manifest["selected_paths"]):
        raise OverlayError("unsafe selected paths")
    if hashlib.sha256(patch).hexdigest() != manifest["patch_sha256"]:
        raise OverlayError("patch SHA-256 mismatch")


def verify_tree(destination, manifest):
    if git(destination, "rev-parse", "HEAD") != manifest["base_commit"]:
        raise OverlayError("destination base mismatch")
    if git(destination, "write-tree") != manifest["result_tree"]:
        raise OverlayError("overlay result tree mismatch")
    if git(destination, "diff", "--name-only") or git(destination, "ls-files", "--others", "--exclude-standard"):
        raise OverlayError("destination has unstaged or untracked changes")
    changed = git(destination, "diff", "--cached", "--name-only").splitlines()
    if changed != sorted(manifest["selected_paths"]):
        raise OverlayError("selected paths mismatch")


def materialize(destination, source, manifest, patch, verify=False):
    validate(manifest, patch)
    if verify:
        if not destination.is_dir():
            raise OverlayError("verification destination missing")
        verify_tree(destination, manifest)
        return
    if destination.exists() or destination.is_symlink() or not destination.parent.is_dir():
        raise OverlayError("destination must be absent within an existing directory")
    if source is not None:
        if not source.is_dir():
            raise OverlayError("source override is not a repository")
        identity(source, manifest, True)
    # A temporary sibling is the only write before publication; failure removes it.
    with tempfile.TemporaryDirectory(prefix="pi-overlay-", dir=destination.parent) as temporary:
        checkout = Path(temporary) / "checkout"
        target = str(source) if source is not None else manifest["upstream"]
        subprocess.run(["git", "clone", "--no-local", "--no-checkout", "--", target, str(checkout)],
                       capture_output=True, check=True)
        identity(checkout if source is None else source, manifest, source is not None)
        git(checkout, "checkout", "--detach", manifest["base_commit"])
        if git(checkout, "status", "--porcelain"):
            raise OverlayError("base checkout is not clean")
        git(checkout, "apply", "--index", "-", input_bytes=patch)
        verify_tree(checkout, manifest)
        os.rename(checkout, destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path, help="explicit new checkout, or existing checkout with --verify")
    parser.add_argument("--source", type=Path, help="explicit local read-only Pi Git source instead of upstream clone")
    parser.add_argument("--manifest", type=Path, default=HERE / "manifest.json")
    parser.add_argument("--patch", type=Path, default=HERE / "patches/0001-tool-call-annotations.patch")
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    try:
        materialize(args.destination.absolute(), args.source.absolute() if args.source else None,
                    json.loads(args.manifest.read_text()), args.patch.read_bytes(), args.verify)
    except (OverlayError, OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"overlay rejected: {error}\n")


if __name__ == "__main__":
    main()
