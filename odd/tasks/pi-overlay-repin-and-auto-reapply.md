# Pi overlay re-pin on v1.0.0 and automatic re-apply

Technical ODD record, not a product plan. No planned Session is closed by this work.

## Objective

Keep the private Pi tool-call annotation overlay (issue #151) alive across Pi updates:

1. Re-pin the overlay to upstream tag `v1.0.0`.
2. Make a missing annotation API non-fatal for the Chanks controls extension.
3. Rebuild and reinstall the overlay automatically after Pi updates itself.

## Problem and why

On 2026-10-01 the global Pi (custom 0.87.1 build carrying the overlay) was replaced by public npm `1.0.0`.
The public build has no `pi.registerToolCallAnnotation`, so the generated `chanks-controls.ts` extension threw at
load and Pi refused to start. gentle-pi 4.0.0 requires Pi `>=0.99.1`, so returning to 0.87.1 is not possible.
The overlay was ported by hand onto `v1.0.0` and installed over the global `dist`; the repository still pins the
old base, and the next Pi update would drop the patch again.

## Scope and constraints

- Zone: `agent-workflows/` and `odd/tasks/`.
- Delivery: direct commits on `master` (`AGENTS.md`). Push stays a maintainer decision. Not planned Session work,
  so the docs gate closes with «nada que registrar».
- Effective TDD: strict (`openspec/config.yaml` `strict_tdd: true`). Runner: `python3 -m unittest` from
  `agent-workflows/`.
- No live installation into `~/.pi` or the global Pi runtime from the writer. Do not launch Pi, do not push, do
  not touch other worktrees or the review switch.
- Tests stay hermetic: no network, no real Pi build.
- Known environmental failure: `tests/test_personal_pi_composition.py` needs local Pi and gentle-pi source
  directories that are absent on this machine.

## Pinned identities (v1.0.0 port)

- Upstream: `https://github.com/earendil-works/pi.git`
- Base commit: `a13d35a742c6ef8462812a28fbe1d8c8b7431c32` (tag `v1.0.0`), tree `b4fa5608757317f4aaeff8665d8a08d23fedbf97`
- Reviewed commit: `db4a38585f6e23e2dca54fc2a5b8c7b5173b8cdc`
- Evidence commit: `7379255952df7ffe8eefbfe8f48f78d54e726b02`
- Patch SHA-256: `366518739d3fb07c9706042c26d9a1086957c08c1947b0a274c4ee601deadf96`
- Result tree: `936c4a5c941b2e3d94439896d31b8a62bb0c2dd4`
- Fork branch holding both commits: `achangkuon/pi` `personal/tool-call-annotations-v1.0.0`
- Selected paths: unchanged (13).

The port was mechanical (`git apply --3way`); no independent review was run for it.

## Tasks

- [x] T1 — Re-pin. Replace `personal-pi/patches/0001-tool-call-annotations.patch` and update
  `personal-pi/manifest.json` with the identities above; refresh `personal-pi/README.md` where it names the old
  base. Route: delegated writer.
- [x] T2 — Non-fatal missing API. The generated Chanks controls extension registers annotations only when
  `pi.registerToolCallAnnotation` is a function; otherwise it loads normally and tells the user once, at session
  start, that labels are off and which command restores them. Gates and event handling are unchanged.
  Route: delegated writer.
- [x] T3 — Rebuild tool. Add `agent-workflows/tools/pi/pi-overlay-rebuild` and install it to
  `~/.pi/agent/bin/`. It detects an unpatched global Pi, materializes the overlay for the installed version,
  builds, verifies, swaps `dist` with a backup, smoke-tests, and rolls back on failure. Route: delegated writer.
- [x] T4 — Automatic trigger. `tools/pi/pi-npm-host-peers` runs the rebuild tool after a successful global
  install/update of `@earendil-works/pi-coding-agent`. A rebuild failure never fails the npm command.
  Route: delegated writer.

## Acceptance

- T1: materializer tests pass; manifest and patch hash agree; the patch applies to the pinned base and yields
  the pinned result tree.
- T2: an extension generated for a Pi without the API loads without throwing and emits one notice; with the API
  the two annotations are registered exactly as before.
- T3: already-patched runtime is a no-op; pinned base uses strict apply and result-tree verification; another
  version uses three-way apply and stops with a distinct exit code on conflict, leaving the runtime untouched;
  any failure after the swap restores the backup; a second concurrent run is refused.
- T4: only a successful mutating npm command that targets the global Pi package triggers the rebuild; other
  commands pass through unchanged; the wrapper's exit status is the npm command's.
- Full `python3 -m unittest discover -s tests` passes except the known environmental failure. Each task has its
  own Conventional Commit.

## Progress

- T1 done. RED: new `PinnedManifestTests` failed on base commit (old `fd889a27`). GREEN: `tests.test_personal_pi_materialize`
  4 tests OK after replacing patch/manifest. Offline check: `materialize.py` against a `--no-local` clone of the
  v1.0.0 source reproduced the pinned result tree. Commit: recorded in git log (`feat(pi-overlay): re-pin ...`).
- T2 done. RED: `test_missing_annotation_api_loads_normally_and_notifies_once` threw
  `pi.registerToolCallAnnotation is not a function` at extension load. GREEN: registration guarded by a
  `typeof` check and a one-time `session_start` warning via `ctx.ui.notify`; `tests.test_install` 116 tests OK.
  Commit: see git log (`fix(pi): keep chanks controls loadable ...`).
- T3 done. RED: `tests.test_pi_overlay_rebuild` 14 errors (tool absent) and `PiOverlayRebuildInstallTests` failing
  (no installer entries). GREEN: both pass; `tests.test_install` + `tests.test_pi_overlay_rebuild` 134 tests OK.
  Node pin `v24.21.0` SHA-256 `fd8e59d5...cb2d6` read from the official SHASUMS256.txt. Extra flag `--backup-root`
  added for hermetic tests. Commit: see git log (`feat(pi): add pi-overlay-rebuild ...`).
- T4 done. RED: `PiNpmOverlayTriggerTests` 6 failures (rebuild never invoked). GREEN: wrapper runs the sibling
  `pi-overlay-rebuild --allow-running` after a successful global install/update of the Pi package; warns once on
  failure or absence; exit status stays npm's. Final: `discover -s tests` 380 tests, 1 failure (known
  `test_fresh_normal_startup_and_policy`), 1 skipped. `pi-overlay-rebuild --dry-run` from the repo root: runtime
  already patched, no-op, repository unchanged. Commit: see git log (`feat(pi): re-apply the overlay ...`).

Commits: T1 `d0a76fc`, T2 `1bc7f3b`, T3 `527f9fe`, T4 `788c69f`.

## Verification after the writer

- Parent spot check: `tests.test_pi_overlay_rebuild` + `tests.test_personal_pi_materialize`, 18 tests OK.
- Real end-to-end run against a scratch copy of the global package restored to the public `1.0.0` dist
  (`--package-dir`, `--cache-dir`, `--backup-root` all outside the live runtime): clone of `v1.0.0`, strict apply,
  Node `v24.21.0` download, `npm ci`, build, overlay tests 4/4 and 109/109, backup, swap, smoke test, exit 0.
  A second run was a no-op. A first run without `--allow-running` stopped with exit 5 because a live Pi session
  was open, and left the copy untouched. Drift mode (another Pi version) is covered by unit tests only.
- Trigger form checked against Pi `v1.0.0` source (`packages/coding-agent/src/config.ts`, npm method): the
  self-update runs `<npmCommand...> install -g --ignore-scripts --min-release-age=0 <spec>` with inherited stdio
  and no timeout, which `targetsGlobalPi` matches once the wrapper strips `-- npm`.
- Native review: assessed high risk; the maintainer declined it for this candidate
  (lineage `review-e5d02e8cb1bd68fc`).
- Independent read-only verifier: pass with warnings, no blocker or critical. Disposition:
  - Smoke-test timeout skipped the rollback: fixed. RED `test_smoke_test_timeout_restores_the_backup` (exit 1,
    expected 6); GREEN after catching `TimeoutExpired`.
  - Failed restore gave a vague message: fixed. RED `test_failed_restore_names_the_backup_for_manual_recovery`
    (no `EXIT_RESTORE_FAILED`); GREEN with exit 7 and the backup path in the message.
  - Open, accepted for now: the `/proc` scan can misjudge on manual runs (false positives for unrelated commands
    named `pi`; the tool's own ancestor Pi is ignored by design); a missing `node` on PATH fails instead of
    falling back to the download; an interrupted Node extraction is not detected; the smoke test checks
    `--version` and the marker, not extension loading; the wrapper does not pass the package directory.
- After the fix: `tests.test_pi_overlay_rebuild` 16 OK; `tests.test_install` + `tests.test_personal_pi_materialize`
  129 OK.

## Next step

Deploy with `tools/install.py` while no Pi session is open. Push is a maintainer decision.
