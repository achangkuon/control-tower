# S153 — Organic Pi Key With Per-Repository Switch

## Objective

Unblock Pi and make Chanks controls usable: a per-repository switch decides whether controls apply, reading never needs a key, and writing needs a key that the human approves in Pi's own question UI, for a plan Session or for Chanks planning.

## Problem

Since the post-S151 global install (2026-09-23), every Pi session was blocked with "no active validated authority", even for reads. The shim only activates from a `CHANKS_PI_ADMISSION` envelope that no code produces (`agent-workflows/tools/install.py:540`), and it applies in every repository, including ones without a plan. The shim was parked at `~/.pi/agent/extensions-disabled/chanks-controls.ts` until this Session delivers (Engram 11463).

## Product authority

- Session: `S153` · Zone `metodo` · Priority `metodo-v1-controles-prioritarios`
- Native route: ODD. Implementer: Claude Code.
- Decisions: Engram 11462 (scope, switch, organic key, size exception). Diagnosis: Engram 11461.
- Preserved S151 decisions: ephemeral per-Session authority, host-owned human confirmation, real confinement, no permissive fallback (Engram 11368, 11423).
- Size: approved exception of about 500–600 lines for one coherent Session. It does not expand files or reduce tests or review.

## Admission binding

- Branch: `master`
- HEAD: `417cc9cae4d6c9681bf80226ee7ff69493f7d820`
- `radar status --json` SHA-256: `9d25946b0da458aba0ee15f2091df63a90907f275e39158e671d96aff79b7471`
- `radar sesion S153` SHA-256: `2777d2de427696a94411f6db5135a6a8885500d93e5e185217d2d7885add0872`
- Computed state: `LISTO`. No file overlap with the other LISTO Session (S152).
- Resource: isolated Pi runtime with a temporary HOME. Exclusive use must be confirmed by the human before T5 runs.

## Scope

Only these repository files may be written:

- `agent-workflows/chanks/pi-admission.mjs` (new)
- `agent-workflows/chanks/pi-switch.mjs` (new)
- `agent-workflows/chanks/pi-authority.mjs`
- `agent-workflows/tools/install.py`
- `agent-workflows/tests/chanks/pi-admission.test.mjs` (new)
- `agent-workflows/tests/chanks/pi-switch.test.mjs` (new)
- `agent-workflows/tests/chanks/pi-authority.test.mjs`
- `agent-workflows/tests/test_install.py`
- `agent-workflows/skills/chanks-3-session-kickoff/SKILL.md`
- `agent-workflows/skills/chanks-1-autoridad/SKILL.md`
- `agent-workflows/skills/chanks-2-planificador-granular/SKILL.md`
- `odd/tasks/s153-pi-llave-organica.md`

## Acceptance criteria

1. Switch `on` / `off` / `status` per repository. Only the human changes it. Default is `off`. `on` is refused when `openspec/plan.yaml` is missing. Worktrees of the same repository share the state, which lives outside the versioned tree.
2. With the switch off, or with no plan, the extension neither asks nor blocks anything.
3. With the switch on and no key, reading tools work and Bash runs under a read-only confinement. Write and Edit are blocked, and so are Bash effects outside that confinement.
4. The extension builds the admission from git and the installed Radar by itself. No external envelope is used.
5. Session key: requested for a named Session in `LISTO` or `EN CURSO`. Pi's own question shows the Session, worktree, files, Cimientos, resources, and base. Acceptance enables exactly those files.
6. Planning key: acceptance enables only `openspec/plan.yaml` and `openspec/ROADMAP.md`.
7. The model can request a key but can never answer the question, flip the switch, or widen files. A decline, a missing UI, or invalid or stale evidence keeps writes blocked. The key drops on a change of Session, base, worktree, or runtime.
8. The session kickoff skill and the tramo 1 and tramo 2 skills say when to request each key.
9. A real Pi (0.87.1) in an isolated HOME loads the generated extension and proves points 2, 3, 5, 6, and 7 through actual dispatch.

## Checks

- TDD: strict (global configuration). Runners: `bun test agent-workflows/tests/chanks` and `python3 -m unittest discover -s agent-workflows/tests`.
- Existing controls and interventions suites remain green.

## Delivery

Direct commit to `master` per `AGENTS.md`. Every task closes with a work-unit commit, followed by a native RDD assessment of that commit. Push, global reinstall, and switching this repository to `on` require the human's delivery confirmation.

## Tasks

- [x] T1 — Switch module (`pi-switch.mjs` + tests). Route: delegated writer (writer trigger: 2+ non-trivial files).
  - Done. State lives at `<git-common-dir>/chanks/controls/switch.json` (shared across worktrees); `on` refused without `openspec/plan.yaml`; `effectiveSwitch` folds the plan check into every read. CLI: `node pi-switch.mjs on|off|status [-C repo]`.
  - RED: hid `pi-switch.mjs`, `bun test agent-workflows/tests/chanks/pi-switch.test.mjs` failed with "Cannot find module" (1 error, 0 pass).
  - GREEN: restored the module, same command: 10 pass, 0 fail, 23 expect() calls.
  - Full suite after T1: `bun test agent-workflows/tests/chanks` — 215 pass, 0 fail.
- [ ] T2 — Admission builder for Session and planning keys (`pi-admission.mjs`, `pi-authority.mjs` + tests). Route: delegated writer.
- [ ] T3 — Generated extension: switch gating, read-only without a key, key request through Pi's question, no environment envelope (`install.py` + `test_install.py`). Route: delegated writer.
- [ ] T4 — Skills: kickoff, tramo 1 router, and tramo 2 say when to request the key. Route: delegated writer.
- [ ] T5 — Real isolated Pi journey. Requires the human's exclusive-resource confirmation. Route: delegated verifier.
- [ ] T6 — Delivery after human confirmation: push, reinstall, switch on here, offer propagation.

## Progress

- Admission recorded. No source written yet.

## Next step

T1.
