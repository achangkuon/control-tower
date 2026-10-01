# Retire automatic-Tower pieces until V3

## Objective

Stop installing the automatic-Tower pieces in every agent runtime and archive the installed copies reversibly, keeping their source in the repository for V3.

## Problem and why

The four V2-only skills stay installed with `disable-model-invocation: true`. Claude Code hides them; Pi still lists them, and no runtime other than Claude Code was verified to honor the flag. They also carry the contradictions N6 (two meanings of "V1") and N7 (who integrates and delivers) recorded in `docs/architecture/pista-entrega-ordenada.md` section 11.

Maintainer decision, 2026-10-01: the pieces are removed until V3 instead of being kept installed and disabled.

## Scope

In scope:

- Skills `chanks-0-jornada`, `chanks-3-coordinador-manual`, `chanks-3-despacho-herdr`, `chanks-4-unattended-implementation`.
- Pi controls and hooks, only after the maintainer decides which ones leave (T2).

Out of scope: `openspec/plan.yaml`, Radar, Pista, Windows and Gemini copies, push to GitHub.

## Constraints

- Source directories under `agent-workflows/skills/` stay byte-identical (`tests/test_builder_flow.py:47-51` pins their sha256).
- Removal is reversible: installed copies move to `.retired-skills/`, never deleted.
- No live runtime is touched without explicit maintainer authorization (T4). Deployment restarts open Pi sessions.
- Delivery policy of this repo: direct commit to `master`, no PR (`AGENTS.md`). Integration into `master` and push are separate maintainer decisions.
- TDD: strict (source: global agent instructions). Runners: `bun test`; `PYTHONPATH=agent-workflows/tests python3 -m unittest <modules>`; `python3 -m unittest discover -s agent-workflows/tests`.

## Tasks

- [x] T1 — Installer stops installing the four skills and archives installed copies. Route: delegated writer (2+ non-trivial files: `install.py`, `test_install.py`, docs).
  - Move the four names from `CHANKS_SKILLS` to retirement in `agent-workflows/tools/install.py`, through one named tuple for V3-deferred skills.
  - Adapt `agent-workflows/tests/test_install.py` (inventory test, `chanks-0-jornada` install test, absent-runtime fixture, `V2_SKILLS` uses).
  - Update docs that state the skills are installed: `agent-workflows/README.md:132-133`, `docs/architecture/pista-entrega-ordenada.md:183`, `agent-workflows/FLUJO-END-TO-END.md:211`.
  - Acceptance: a dry-run install plans no write for the four skills and plans a `retired-skill` change where an installed copy exists; source-content tests still pass.
- [ ] T2 — Pi controls and hooks. Blocked on maintainer decision: whether the Radar stage notice (`chanks-etapa.sh`) stays, and whether third-party pieces (`herdr-agent-state`, `pi-intercom`) are removed.
- [ ] T3 — Hermes: the installer has no Hermes root; decide between adding the root and a scoped external step.
- [ ] T4 — Live deployment to the five runtimes and verification in a fresh conversation per agent. Requires explicit maintainer authorization.

## Progress and evidence

- 2026-10-01: read-only mapping completed (installer roster and retirement mechanism, affected tests, references, Pi control provenance, sync script behavior). No test or installer run yet.
- Native review of the pre-existing `master` candidate (`8ee9a2b..8c9e360`): declined by the maintainer for that candidate.
- Branch `work/retirar-torre-automatica` from `8c9e360`.
- T1 done, commit `b961678` (route: delegated writer; trigger: 2+ non-trivial files).
  - RED: new/adjusted tests failed before the change (`V3_DEFERRED_SKILLS` missing: `test_v3_deferred_skills_are_not_installed_but_stay_in_the_repo`, `test_installed_v3_deferred_copies_are_planned_and_archived`, `test_installer_inventory_...` errored; `test_absent_runtime_is_skipped_instead_of_failing` was already failing from the environment).
  - GREEN: `test_install` 116 tests OK; the six related modules 188 tests OK (four registration tests in `test_chanks_jornada`, `test_coordinador_manual`, `test_despacho_herdr` were adapted to assert deferral).
  - Full discovery: 356 tests OK (1 skipped). Baseline on the untouched worktree was 75 failures/errors, all environmental: the worktree files were mode 775 (umask 002) where tests require 755. To verify, executable sources were set to 755 and the rest to 644 on disk only; git sees no mode change. No new failures against the baseline.
  - `bun test`: 22 failing test names, identical before and after the change (pre-existing, checkpoint capture). `git diff --check`: clean.
  - Installer never run in applying mode; tests use temporary HOME directories.

## Next step

T2 (blocked on maintainer decision) or T3/T4.
