#!/usr/bin/env python3
"""Create one empty eligible OpenSpec change directory without following links."""

import argparse
import datetime
import os
import re
import stat
import subprocess
import sys


class PreparationError(Exception):
    pass


def nofollow_flags():
    required = ("O_DIRECTORY", "O_NOFOLLOW")
    if any(not hasattr(os, name) for name in required):
        raise PreparationError("unsupported system: no-follow directory descriptors are unavailable")
    if os.open not in os.supports_dir_fd or os.mkdir not in os.supports_dir_fd:
        raise PreparationError("unsupported system: descriptor-relative creation is unavailable")
    return os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW


def canonical_absolute_path(path):
    if not os.path.isabs(path) or os.path.normpath(path) != path:
        raise PreparationError("workspace must be a canonical absolute path")
    if any(part in {".", ".."} for part in path.split(os.path.sep)):
        raise PreparationError("workspace must not contain dot components")
    return path


def open_directory(path, label, flags):
    descriptor = os.open(os.path.sep, flags)
    try:
        for component in (part for part in path.split(os.path.sep) if part):
            try:
                metadata = os.stat(component, dir_fd=descriptor, follow_symlinks=False)
            except FileNotFoundError as error:
                raise PreparationError(f"{label} does not exist") from error
            if stat.S_ISLNK(metadata.st_mode):
                raise PreparationError(f"{label} contains a symlink")
            try:
                child = os.open(component, flags, dir_fd=descriptor)
            except OSError as error:
                raise PreparationError(f"{label} is not a directory") from error
            os.close(descriptor)
            descriptor = child
        return descriptor
    except BaseException:
        os.close(descriptor)
        raise


def open_child_directory(parent, name, label, flags):
    try:
        metadata = os.stat(name, dir_fd=parent, follow_symlinks=False)
    except FileNotFoundError as error:
        raise PreparationError(f"{label} does not exist") from error
    if stat.S_ISLNK(metadata.st_mode):
        raise PreparationError(f"{label} is a symlink")
    try:
        return os.open(name, flags, dir_fd=parent)
    except OSError as error:
        raise PreparationError(f"{label} is not a directory") from error


def require_config(openspec):
    try:
        metadata = os.stat("config.yaml", dir_fd=openspec, follow_symlinks=False)
    except FileNotFoundError as error:
        raise PreparationError("OpenSpec config does not exist") from error
    if stat.S_ISLNK(metadata.st_mode):
        raise PreparationError("OpenSpec config is a symlink")
    if not stat.S_ISREG(metadata.st_mode):
        raise PreparationError("OpenSpec config is not a regular file")
    descriptor = os.open("config.yaml", os.O_RDONLY | os.O_NOFOLLOW, dir_fd=openspec)
    try:
        if not os.read(descriptor, 1):
            raise PreparationError("OpenSpec config is empty")
    finally:
        os.close(descriptor)


def require_git_workspace(workspace):
    result = subprocess.run(
        ["git", "-C", workspace, "rev-parse", "--show-toplevel"],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode or result.stdout.strip() != workspace:
        raise PreparationError("workspace is not the selected initialized Git worktree")


def valid_change_name(name):
    return bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", name))


def exists_at(descriptor, name):
    try:
        os.stat(name, dir_fd=descriptor, follow_symlinks=False)
    except FileNotFoundError:
        return False
    return True


def archived_change_exists(archive, change):
    for entry in os.listdir(archive):
        if entry == change:
            return True
        if len(entry) > 11 and entry[10] == "-" and entry[11:] == change:
            try:
                datetime.date.fromisoformat(entry[:10])
            except ValueError:
                continue
            return True
    return False


def prepare(workspace, change, intent, route, artifact_store):
    if intent != "new":
        raise PreparationError("intent must be new")
    if route != "full-sdd":
        raise PreparationError("route must be full-sdd")
    if artifact_store != "openspec":
        raise PreparationError("native artifact store must be openspec")
    if not valid_change_name(change):
        raise PreparationError("change must be one safe path component")

    workspace = canonical_absolute_path(workspace)
    flags = nofollow_flags()
    workspace_fd = open_directory(workspace, "workspace", flags)
    try:
        require_git_workspace(workspace)
        openspec = open_child_directory(workspace_fd, "openspec", "OpenSpec directory", flags)
        try:
            require_config(openspec)
            changes = open_child_directory(openspec, "changes", "OpenSpec changes directory", flags)
            try:
                archive = open_child_directory(changes, "archive", "OpenSpec archive directory", flags)
                try:
                    if archived_change_exists(archive, change):
                        raise PreparationError("change name already exists in archive")
                    if exists_at(changes, change):
                        raise PreparationError("change name already exists")
                    try:
                        os.mkdir(change, dir_fd=changes)
                    except FileExistsError as error:
                        raise PreparationError("change name already exists") from error
                    try:
                        created = os.open(change, flags, dir_fd=changes)
                    except OSError as error:
                        raise PreparationError("created change directory could not be reopened safely") from error
                    else:
                        os.close(created)
                finally:
                    os.close(archive)
            finally:
                os.close(changes)
        finally:
            os.close(openspec)
    finally:
        os.close(workspace_fd)


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--change", required=True)
    parser.add_argument("--intent", required=True)
    parser.add_argument("--route", required=True)
    parser.add_argument("--native-artifact-store", required=True)
    return parser.parse_args()


def main():
    args = parse_args()
    try:
        prepare(args.workspace, args.change, args.intent, args.route, args.native_artifact_store)
    except PreparationError as error:
        print(f"prepare_new_change: {error}", file=sys.stderr)
        return 1
    print(f"created {args.change}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
