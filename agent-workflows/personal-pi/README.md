# Private Pi tool-call annotation overlay

Issue #151 repairs the conflict between Chanks request labels and gentle-pi's ownership of `read`/`bash`. This is a **private, reproducible source overlay**, not a Pi release, public fork update, or installer. The 13-path mail patch is a port onto upstream tag `v1.1.0`: reviewed commit `20aa0e80` on base `abe508e1`; evidence commit `5edb8322` follows it. Both commits live on the fork branch `achangkuon/pi` `personal/tool-call-annotations-v1.1.0` (local: `/home/emili/projects/pi-v1.1.0`). The port was a mechanical `git cherry-pick` of the v1.0.0 reviewed commit `db4a3858`; four conflict sites in two files were resolved by keeping both sides (`outputPad` from upstream next to `getCallAnnotations` from the overlay). `.gitignore` and the source repository's ODD task are deliberately excluded. The previous pin remains as fork branch `personal/tool-call-annotations-v1.0.0`.

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

## Re-apply after a Pi update

`agent-workflows/tools/pi/pi-overlay-rebuild` (installed to `~/.pi/agent/bin/` by `tools/install.py`, together with the manifest and patch under `~/.pi/agent/bin/pi-overlay/`) detects a global Pi without `registerToolCallAnnotation` and rebuilds it with this overlay. For the pinned base tag the patch is applied strictly and the result tree is verified; for any other version it uses `git apply --3way` and exits with code 3 when a manual port is needed, leaving the runtime untouched. It builds in `~/.cache/pi-overlay/<version>/`, runs the overlay tests, backs up both `dist` directories under `~/.pi/agent/backups/`, swaps them, smoke-tests, and restores the backup on failure. Use `--dry-run` to see the plan. Exit codes: 3 conflict, 4 another rebuild running, 5 another Pi process running (override with `--allow-running`), 6 smoke test failed and backup restored. The npm wrapper runs it automatically after a global Pi install or update.
