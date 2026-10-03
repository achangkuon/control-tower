# S196 — Project instructions

## Contract

Source: `radar sesion S196` (2026-10-02). Do not read the complete plan, commit, push, or mutate real HOME/projects. All lifecycle test destinations are disposable directories.

- Trusted project adoption renders the shipped workflow with the active release tag (short SHA fallback), preserving every non-owned byte in AGENTS.md.
- CLAUDE.md imports AGENTS.md: single line for a created file, marked import for an existing file without that line, no change to an existing import.
- The adoption journal records instruction originals/installed baselines separately from strict bundle snapshots. Uninstall removes/restores only owned ranges and preserves later edits. Created files disappear only when empty.
- Doctor reports `ok`, `missing`, `outdated version`, or `modified` for the workflow.
- Successful global install/update refreshes registered, intact adoptions, returns per-project `refreshed`, `unchanged`, or `skipped:<reason>`, and does not turn a project failure into an activation failure.
- Malformed/nested/duplicate markers and symlink/hardlink escapes refuse before mutation.

## Implementation

- Shared S195 marker parser generalized in `runtime-config.mjs`; global pointers retain their existing behavior. Project transformations use latin1 offsets and Buffer slices to preserve arbitrary surrounding bytes.
- Project journal adds an optional `instructions` record, retaining compatibility with earlier journals. Bundle drift remains strictly refused. Instruction-only refresh compensates file/journal failures and does not claim ownership of later user text.
- Registered refresh reads membership without publishing registry changes; unadopted, inaccessible, missing, unsafe, modified, and bundle-drift roots are isolated as skips.
- Global refresh uses only the successfully activated release's verified template. CLI forwards its explicit registry selection.

## Test-first observations

1. `HOME=$(mktemp -d) bun test product/tower/v1/test/adoption.test.mjs -t 'S196'`
   - RED: 2 pass / 13 fail before implementation (old block unchanged, missing CLAUDE file, missing doctor state, unsafe markers accepted).
   - GREEN: 15 pass / 0 fail after initial implementation.
2. `HOME=$(mktemp -d) bun test product/tower/v1/test/global.test.mjs -t 'S196'`
   - RED: result had no `projects` field.
   - GREEN: 1 pass / 0 fail; install/update/reinstall, later user edits, and six skip cases exercised.
3. `HOME=$(mktemp -d) bun test product/tower/v1/test/adoption.test.mjs -t 'hand-modified CLAUDE'`
   - RED: refresh succeeded despite a hand-modified owned import.
   - GREEN: included in the 20-test S196 adoption/global run below; modified import now refuses with zero mutation.
4. `HOME=$(mktemp -d) bun test product/tower/v1/test/cli.test.mjs -t 'S196'`
   - RED: explicit registry produced `projects: []`.
   - GREEN: 1 pass / 0 fail after forwarding the registry; selected project refreshes and repeat update is unchanged.

## Validation so far

- S196 adoption/global tests: 20 pass / 0 fail (19 adoption cases + one multi-project global case).
- Focused CLI cleanup fixture: 1 pass / 0 fail.
- Initial complete suite: 382 pass / 1 skip / 1 fail. The failed old cleanup fixture restored only bundle snapshots; it now restores instruction originals as well, and passes focused validation.
- Final `HOME=$(mktemp -d) bun test product/tower/v1`: **388 pass / 1 skip / 0 fail**, 389 tests across 14 files, 7152 assertions. The existing optional tiny Go cross-build is the only skip.
- `git diff --check`: clean.

## Essential extra surfaces

Pre-approved by the task's product/tower allowance and announced before editing:

- `product/tower/v1/runtime-config.mjs`: reuse the S195 marker parser instead of duplicating it.
- `product/tower/v1/test/cli.test.mjs`: update the full-restoration cleanup fixture and protect explicit registry refresh.
- `product/tower/v1/cli.mjs`: forward the already accepted registry option to install/update.

No new runtime module, dependencies, release-membership changes, commits, or pushes.
