# Private Pi tool-call annotation overlay

Issue #151 repairs the conflict between Chanks request labels and gentle-pi's ownership of `read`/`bash`. This is a **private, reproducible source overlay**, not a Pi release, public fork update, or installer. The 13-path mail patch comes from reviewed commit `483b50c9` on upstream base `fd889a27`; evidence commit `7b84c8b` follows it. `.gitignore` and the source repository's ODD task are deliberately excluded.

## Materialize and verify

Use a **new destination** in a disposable directory. Default source is the pinned upstream URL and therefore requires network; an explicit local override supports offline use and tests. The local source must identify the same upstream remote and contain the pinned commit chain. Neither mode writes to that source.

```sh
python3 agent-workflows/personal-pi/materialize.py /tmp/my-private-pi
# Offline, with an independently obtained read-only source:
python3 agent-workflows/personal-pi/materialize.py /tmp/my-private-pi --source /path/to/pi-source
python3 agent-workflows/personal-pi/materialize.py /tmp/my-private-pi --verify
```

The manifest fixes upstream identity, full base commit/tree, reviewed and evidence parents, exact portable patch SHA-256, selected paths, and result tree. The materializer checks these before publishing a temporary checkout, applies with `git apply --index`, and rejects an occupied destination, dirty base, conflict, wrong path, hash, or result. Verification rejects untracked/unstaged drift. Do not point it at an installed or global Pi runtime.

## Update the pin

Review a new upstream-parented source commit and its evidence commit independently. Generate only selected implementation/documentation/test paths with `git format-patch --stdout <base>..<reviewed> -- packages/`; exclude repository-local settings, secrets, lockfiles, task records, and unrelated source. Recompute SHA-256 and the staged result tree from a clean base clone, update every manifest identity, and run hermetic materializer and real composition tests. Do not change the patch or manifest just to make a mismatch pass. Installation is a **separate parent-authorized action** after integration; this overlay never installs itself or modifies a user's Pi configuration.
