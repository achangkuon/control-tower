# Seal survives its own dispatch

## Objective

An approved unattended seal stays valid after `chanks-3-despacho-herdr` dispatches it, so the
dispatched worker can start instead of blocking at kickoff.

## Problem

`chanks-4-unattended-implementation` seals a Session while it is `LISTO` and binds the SHA-256 of
the exact `radar status --json` and `radar sesion <ID>` stdout. After a confirmed handoff,
`chanks-3-despacho-herdr` writes the `radar.despacho/v1` marker, which makes Radar show the
Session `EN CURSO`. The worker then recomputes both digests, they no longer match, and it stops.
Every sealed dispatch invalidates itself.

Evidence (2026-09-28): S165 worker BLOCKED before kickoff; the only difference in
`radar sesion S165` was `Estado: 🟢 LISTO` → `Estado: 🔵 EN CURSO`; `radar status --json` differed
only in the EN CURSO list and `desbloquea` counts. Same symptom, uninvestigated, on 2026-09-27.

## Why

Unattended execution is unusable until the seal tolerates the one state change its own dispatch
causes, while still rejecting every other drift.

## Scope

Authorized by Emilio on 2026-09-28 as a patch to the Chanks flow. Files:

- `agent-workflows/skills/chanks-4-unattended-implementation/SKILL.md`
- `agent-workflows/skills/chanks-4-unattended-implementation/references/sealing-and-routing.md`
- `agent-workflows/skills/chanks-0-agente-soporte/assets/assignment-implementation.md`
- `agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md` (only if the rule must be restated there)
- `agent-workflows/templates/session-routing.md` (only if it restates the digest rule)
- tests under `agent-workflows/tests/` that pin this contract

## Constraints

- The seal schema (`execution-contract.schema.json`) does not change unless strictly required.
- Only the dispatch-caused drift is tolerated: `LISTO` → `EN CURSO` backed by a marker that matches
  the seal exactly. Any other drift (encargo text, files, decisions, base, expiry) still invalidates.
- No skill reinstall (`install.py`) without Emilio's confirmation.

## Acceptance criteria

1. The worker revalidation rule accepts a sealed Session whose current `radar sesion <ID>` stdout
   equals the sealed stdout except for the single `Estado:` line changing from `LISTO` to
   `EN CURSO`, only when `chanks/despachos/<ID>.json` in the Git common dir matches the seal's
   Session, branch, worktree and worker exactly.
2. The `radar status --json` digest is proof of the snapshot at seal time; after dispatch the
   worker checks instead that the Session appears `EN CURSO` in a fresh `radar status --json`.
3. Any other difference, a missing or mismatched marker, or a changed base still grants nothing.
4. Tests pin both the accepted and the rejected cases.

## Checks

- TDD: strict (global user config). Runner: `python3 -m pytest agent-workflows/tests` and
  `bun test` / `node --test` for `.mjs` tests, whichever the touched tests use.

## Tasks

- [x] T1 — Rewrite the revalidation rule in the seal, sealing reference and handoff template;
  pin accepted/rejected cases in tests. Route: delegated (writer trigger: 3+ non-trivial files).
- [ ] T2 — Reinstall skills after Emilio confirms; verify with `install.py --check`. Route: inline.

## Progress

- 2026-09-28: document created; branch `fix/seal-survives-own-dispatch`.
- 2026-09-28: T1 done, commit `3f5461c` on `fix/seal-survives-own-dispatch`. Added a
  "Worker revalidation after dispatch" section to `sealing-and-routing.md` (marker-file identity
  check + `Estado:`-line-substitution digest rule + `radar status --json` EN CURSO check), a Hard
  Rules bullet in `chanks-4-unattended-implementation/SKILL.md`, and a matching clause in
  `chanks-0-agente-soporte/assets/assignment-implementation.md`. `chanks-3-despacho-herdr/SKILL.md`
  and `templates/session-routing.md` needed no change — neither restates the digest-matching rule.
  TDD (strict): RED confirmed by running the new assertions against the pre-edit docs (both
  failed as expected), then GREEN after the edits.
  - `bun run agent-workflows/tests/test_standalone_contract.mjs` — PASS ("standalone contract
    schema safety: PASS").
  - `python3 -m unittest test_builder_flow -v` (from `agent-workflows/tests`) — 22/22 PASS.
  - `python3 -m unittest test_despacho_herdr test_coordinador_manual test_install` (from
    `agent-workflows/tests`) — 160/160 PASS (includes despacho-herdr's 45 and coordinador-manual's
    30 subsets, verified individually too).
  - `bun test` (repo root) — 1549 pass, 0 fail, 7712 expect() calls, across 106 files.

## Next step

T2 — reinstall skills after Emilio confirms, then verify with `install.py --check`.
