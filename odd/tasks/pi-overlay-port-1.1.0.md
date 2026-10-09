# Pi overlay port to v1.1.0 and re-apply

Technical ODD record, not a product plan. No planned Session is closed by this work.

## Objective

Keep the private Pi tool-call annotation overlay alive on the current runtime: port the
overlay onto upstream tag `v1.1.0`, re-pin the manifest, rebuild the global Pi with the
overlay, and leave the auto-reapply path working for future updates.

## Problem and why

On 2026-10-07 Pi was updated from 1.0.4 to 1.1.0. The npm wrapper triggered
`pi-overlay-rebuild`, which three-way-applied the pinned v1.0.0 patch onto v1.1.0, hit
conflicts, and exited 3 without touching the runtime. Pi 1.1.0 therefore runs the public
`dist` with no `registerToolCallAnnotation`, and the Chanks controls labels are off.
The maintainer explicitly requested the port.

## Scope and constraints

- Zone: `agent-workflows/` (personal-pi manifest, patch, README; tests) and `odd/tasks/`.
  Git surgery happens in the fork clone `/home/emili/projects/pi` (upstream
  `earendil-works/pi`, origin `achangkuon/pi`); that clone is not part of this repository.
- Delivery: direct commits on `master` (`AGENTS.md`). Push stays a maintainer decision.
  Not planned Session work, so the docs gate closes with «nada que registrar».
- Strict TDD (`openspec/config.yaml` `strict_tdd: true`). Runner: `python3 -m unittest`
  from `agent-workflows/`. Tests stay hermetic: no network, no real Pi build.
- Installing the rebuilt overlay data and rebuilding the global Pi runtime is explicitly
  maintainer-authorized for this task (2026-10-07, "hagamos el parche").
- The fork clone worktree `personal/tool-call-annotations` carries unrelated dirty
  changes; do not touch them. The v1.1.0 port uses a fresh worktree.

## Pinned identities (historical, v1.0.0 port — replaced)

- Base: `a13d35a742c6ef8462812a28fbe1d8c8b7431c32` (tag `v1.0.0`), tree `b4fa5608757317f4aaeff8665d8a08d23fedbf97`
- Reviewed: `db4a38585f6e23e2dca54fc2a5b8c7b5173b8cdc`, evidence: `7379255952df7ffe8eefbfe8f48f78d54e726b02`
- Patch SHA-256: `366518739d3fb07c9706042c26d9a1086957c08c1947b0a274c4ee601deadf96`
- Result tree: `936c4a5c941b2e3d94439896d31b8a62bb0c2dd4`
- Selected paths: 13, unchanged.

## Tasks

- [x] T1 — Port. Fresh worktree on `personal/tool-call-annotations-v1.1.0` at upstream tag
  `v1.1.0`; three-way apply `db4a3858`; resolve conflicts keeping both sides; run the
  overlay tests in the source. Route: parent inline (git surgery and build pipeline,
  not repository file authoring).
- [x] T2 — Re-pin. Commit the reviewed commit plus an evidence commit (task evidence doc
  in the fork, mirroring `737925595`); generate the patch with
  `git format-patch --stdout <base>..<reviewed> -- packages/`; recompute patch SHA-256
  and the staged result tree from a clean base apply; update
  `personal-pi/manifest.json`, `personal-pi/README.md`, and the pinned-identity test
  (RED on new identities first); refresh the installed `~/.pi/agent/bin/pi-overlay/`
  data. Route: parent inline (mechanical identity updates; delegated writer refused
  scope: live runtime + foreign clone).
- [ ] T3 — Rebuild. Run `pi-overlay-rebuild --allow-running` against the live global Pi
  1.1.0: clone, strict apply (base now pinned to 1.1.0), result-tree check, build,
  overlay tests, backup, swap, smoke test. Route: parent inline (maintainer-authorized
  live installation).
- [ ] T4 — Verify and close. `python3 -m unittest` from `agent-workflows/` (known
  environmental failure exempt); `pi --version` still 1.1.0 and patched marker present;
  record commits and identities here. Pushing the fork branch stays a maintainer
  decision.

## Acceptance

- T1: overlay tests pass on the patched v1.1.0 source; `registerToolCallAnnotation`
  present in the built API surface.
- T2: manifest identities agree with the new patch and result tree; hermetic
  materializer tests pass; installed overlay data matches the repository copies.
- T3: rebuild exits 0 in strict mode; backup exists under `~/.pi/agent/backups/`;
  smoke test passes; `is_patched` true for the installed dist.
- T4: repo test suite green except the known environmental failure; feature doc
  records commits, identities, and any skipped checks.

## Progress

- T1 done. `git cherry-pick db4a3858` onto `abe508e1b` (tag v1.1.0) in worktree
  `/home/emili/projects/pi-v1.1.0`; 11 paths clean, 4 conflict sites in 2 files
  (`tool-execution.ts` options block; 3 `ToolExecutionComponent` constructor sites in
  `interactive-mode.ts`), all resolved by keeping both sides. Build with Node v24.21.0
  exit 0; overlay tests: tui 4/4, coding-agent 111/111. Reviewed commit: `20aa0e80a`.
- T2 done. Evidence commit `5edb83224` (fork, `odd/tasks/personal-tool-call-annotations-v1.1.0.md`).
  New patch via `format-patch -- packages/`: 13 files, 396 insertions, 7 deletions,
  SHA-256 `485abcd9ca67014d4ea9a2b192077d047750d8dd21c48931083523e5953061f7`. Strict
  apply on a clean v1.1.0 clone reproduces result tree `c26c18520205e54d00e1032c0c86f231a83c813e`.
  RED: `PinnedManifestTests` failed on old identities; GREEN after updating
  `manifest.json`, `patch`, `README.md` (new pin) and the test. Full suite: 535 tests,
  1 pre-existing environmental failure (`test_paralelo` reads the installed skill in
  `~/.agents/skills`; unrelated to this change), 2 skipped.

## Pinned identities (v1.1.0 port)

- Base: `abe508e1b89912adde45528136c3221eb69acdd7` (tag `v1.1.0`), tree `77d78fae728879c16550b1f874785aed7851233c`
- Reviewed: `20aa0e80a0c00c90f1979313b979a15523466582`, evidence: `5edb832249c978a5be16801a492606738893c9a1`
- Patch SHA-256: `485abcd9ca67014d4ea9a2b192077d047750d8dd21c48931083523e5953061f7`
- Result tree: `c26c18520205e54d00e1032c0c86f231a83c813e`
- Fork branch: `achangkuon/pi` `personal/tool-call-annotations-v1.1.0` (local worktree `/home/emili/projects/pi-v1.1.0`)
- Selected paths: 13, unchanged.

## Verification after the writer

- (pending)
