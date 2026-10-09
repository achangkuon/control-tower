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
3. With the switch on and no key, reading tools work and Bash runs under a read-only confinement. Write and Edit are blocked. The goal is objective A, confirmed by Emilio on 2026-09-23: the key identifies which Session is working. It is not a sandbox against an agent that deliberately tries to escape.
4. The extension builds the admission from git and the installed Radar by itself. No external envelope is used.
5. **Superseded 2026-09-23 (Engram 11475 — see "Referential key" below).** Session key: requested for a named Session in `LISTO` or `EN CURSO`. Pi's own question shows the Session, worktree, files, Cimientos, resources, and base. Acceptance *identifies* the Session for the Main agent — it enables nothing and blocks nothing; every tool call passes through exactly as if the extension were absent.
6. **Superseded 2026-09-23 (Engram 11475 — see "Referential key" below).** Planning key: acceptance identifies the planning key as active for the Main agent — it does not enable or limit any particular file; every tool call passes through once active.
7. The model can request a key but can never answer the question or flip the switch. A decline, a missing UI, or invalid or stale evidence keeps writes blocked. The key survives HEAD advancing (the agent's own commits) and any plan row changing later, including the Session's own. It drops when the Pi session shuts down, reloads, or is replaced; when the repository root or worktree differs; or when the switch is turned off.
8. The session kickoff skill and the tramo 1 and tramo 2 skills say when to request each key.
9. A real Pi (0.87.1) in an isolated HOME loads the generated extension and proves points 2, 3, 5, 6, and 7 through actual dispatch (points 5 and 6 as superseded: acceptance identifies, blocks nothing).

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
- [x] T2 — Admission builder for Session and planning keys (`pi-admission.mjs`, `pi-authority.mjs` + tests). Route: delegated writer.
  - Done. `pi-admission.mjs` resolves `git`/`radar` off PATH (never inside the repo, never model-supplied), captures HEAD + `radar status --json` + (for session keys) `radar sesion <ID>`, derives `authorizedFiles`/`cimientoGrants`/`resources` from the structured status row, and writes a private 0700 proof file re-read on every `identidadActual()` call (no caching). `pi-authority.mjs` gained a `kind` field (`session` default, `planning`): planning skips the Session-ID shape check and the `radar.sessionDigest` requirement (and rejects one if smuggled in); `confirmedResources` now accepts an empty array since most Sessions declare no `recurso`.
  - Known deviation: `canonicalRepoFile` still requires the file to already exist on disk (inherited from `pi-authority.mjs`'s own retained-handle model, which needs an openable fd) — a Session that names a brand-new file cannot be admitted for that file until it exists. Out of scope to fix here; flagged for a later Session.
  - RED: hid `pi-admission.mjs` — "Cannot find module" (1 error, 0 pass). Also stashed the `pi-authority.mjs` edit alone and reran its suite — 3 of the 3 new/changed tests failed with `TypeError: admisión de autoridad inválida: …` (21 pass / 3 fail).
  - GREEN: restored both — `bun test agent-workflows/tests/chanks/pi-admission.test.mjs` 11 pass; `bun test agent-workflows/tests/chanks/pi-authority.test.mjs` 24 pass.
  - Full suite after T2: `bun test agent-workflows/tests/chanks` — 230 pass, 0 fail. `python3 -m unittest discover -s agent-workflows/tests` — 149 pass (1 skipped), unaffected (T3 not started).
  - Size: T1+T2 authored code+tests ≈ 907 lines, already above the ~500–600 exception before T3/T4. Flagging for the human at close; proceeding since T3/T4 are required to unblock Pi at all, and T3's template shrinks materially (env-parsing logic moves into `pi-admission.mjs`).
- [x] T3 — Generated extension: switch gating, read-only without a key, key request through Pi's question, no environment envelope (`install.py` + `test_install.py`). Route: delegated writer.
  - Done. Rewrote `PI_EXTENSION_TEMPLATE`: off/no-plan → registers nothing (inert, matches AC#2 exactly); no key → `read/grep/find/ls` pass, `bash` runs inside a fully read-only bwrap room (no `--bind` at all — the room is smaller than any authorized-mutation room `pi-controls.mjs`'s `confinarComando` would build, and that module is never re-implemented, only its fixed-policy sibling is added locally since `pi-controls.mjs` is out of scope to edit), `write`/`edit` blocked; `chanks_request_activation({kind, sessionId})` builds the admission via `pi-admission.mjs`, shows Pi's own `ctx.ui.confirm`, and only exact acceptance calls `authority.aceptar`. One `crearAutoridadPi` instance persists for the extension's lifetime so a second request correctly replaces (never leaks) the previous pending/active one — caught and fixed a real bug here (see RED below). `runtimeIdentity`/`candidateDigest` are generated once per loaded instance (opaque evidence; the real drift protection is Session/base/worktree, documented in-code). `desired_pi_extension` now resolves and requires all three control modules (fails closed if any is missing).
  - Net effect: template shrank (env-parsing/hostEnvelope/liveIdentity/proofFields logic moved into already-tested `pi-admission.mjs`): `install.py` diff is +377/-... net **-74 lines** even though `test_install.py` was substantially rewritten.
  - Bugs caught by the tests themselves before commit: (1) a premature "already active" guard blocked switching from one key to a different kind/Session entirely; fixed to compare kind+sessionId. (2) the test harness itself checked write-authorization between two activations instead of after both; fixed harness ordering.
  - RED: `git stash` on `install.py` alone (keeping the new `test_install.py`), ran `python3 -m unittest test_install.PiExtensionTests test_install.PiAuthorityExtensionTests` against the OLD template — 16 of 19 failed (env-based admission, `registered` always true, etc.).
  - GREEN: restored `install.py` — same command, 19/19 pass.
  - Full suite after T3: `bun test agent-workflows/tests/chanks` — 230 pass, 0 fail. `python3 -m unittest discover -s agent-workflows/tests` — 152 pass (1 skipped), 0 fail.
  - Out-of-scope observation: `pi-controls.mjs` is not in this Session's Scope, so the fixed "fully read-only room" bwrap invocation is duplicated (not re-decided) in the template rather than exposed as a `confinarComando` mode; flagged for a future Session to fold in if desired.
  - Size: cumulative T1–T3 authored+changed lines are now well past the ~500–600 exception (see running total below); T4 remains (prose-only skill edits, small).
- [x] T4 — Skills: kickoff, tramo 1 router, and tramo 2 say when to request the key. Route: delegated writer.
  - Done. `chanks-3-session-kickoff/SKILL.md`: replaced "Host-Owned Pi Admission" (envelope/launcher description + `PI-ADMISSION-HANDOFF:JSON` block) with "Organic Pi Admission" — switch off/no-plan → unaffected; switch on → after the human confirms starting/resuming the Session, the agent calls `chanks_request_activation {kind:"session", sessionId}`, Pi's own question shows Session/files/Cimientos/resources/base, only exact human acceptance activates, model can never answer/flip/widen, key drops on Session/base/worktree/runtime change, a new request replaces the old one. `chanks-1-autoridad/SKILL.md` and `chanks-2-planificador-granular/SKILL.md`: one Hard Rules bullet each — before the responsible parent writes `openspec/plan.yaml`, request the planning key (`{kind:"planning"}`) when the switch is on; no-op when off. Kept existing tone/register per file (Spanish voseo for chanks-1-autoridad, English for the other two).
  - Out-of-scope test broken (anticipated and reported, not fixed): `agent-workflows/tests/test_builder_flow.py::GenericBuilderFlowTests::test_kickoff_pi_admission_handoff_schema_is_bounded` hard-asserts the exact old `PI-ADMISSION-HANDOFF:JSON` marker and schema (`envelope_keys`, `sequence` of `host_*`/`shim_*` steps, `evidence_boundaries.s151_t3/t5`, etc.) against the *live* `agent-workflows/skills/chanks-3-session-kickoff/SKILL.md`. That file is not in this Session's Scope, so it was not edited. Verified this is the *only* new failure: the file's other 13 tests, including `test_frozen_product_snapshot_matches_the_pre_migration_builder` (which reads a separately-frozen copy under `product/tower/generic/...`, untouched by this Session), all still pass. `agent-workflows/tests/test_builder_flow.py` needs a follow-up edit (out of scope here) to drop or rewrite that one test for the organic model.
  - Full suite after T4: `bun test agent-workflows/tests/chanks` — 230 pass, 0 fail. `python3 -m unittest discover -s agent-workflows/tests` — 151 pass, 1 fail (the out-of-scope test above), 1 skipped.
- [x] Review and corrections (route: inline parent, since each was a small, understood fix under a native correction budget).
  - Size exception raised by Emilio on 2026-09-23. Scope expanded with his approval to `agent-workflows/tests/test_builder_flow.py`. `pi-controls.mjs` was not added: the key is identification, and new-file creation is left to the agents' own harnesses (Engram 11462 addendum).
  - Lineage `review-89cf17500ef46ade` (T1–T4, granted, 4 lenses): one CRITICAL finding, R1: host Unix sockets were reachable from the no-key room. Correction `d220623` (tmpfs over /tmp and /run, clearenv, new-session). RED: a socket in /tmp was visible and the host environment leaked. GREEN after the fix. The targeted validator rejected it as incomplete for a sandbox (sockets under $HOME or /mnt) and flagged a regression (a worktree under /tmp became invisible). Ended `native_stop_required`, unapproved.
  - Emilio confirmed objective A: the key identifies which Session is working and guards a cooperative agent against accidental writes. It is not a sandbox against deliberate escape. He chose option 1: align the stated guarantee and fix the regression.
  - Lineage `review-973d5c4dbd3093eb` (candidate through `d220623`, granted, 4 lenses): one CRITICAL finding, the stale `test_builder_flow` assertion. Correction `b07326e` rewrites it to assert the organic flow. The targeted validator approved it, and the acknowledgement was issued (`gentle-ai.review-acknowledged/v1`). There were 15 non-blocking advisories, listed as follow-ups below.
  - Option 1 work unit: the no-key room re-binds the working directory read-only after the tmpfs mounts, and the stated guarantee is aligned with objective A in `install.py`, the kickoff skill and AC3. RED: a worktree under /tmp was invisible (`cat marker.txt: No such file`). GREEN: `python3 -m unittest discover -s agent-workflows/tests` gives 155 pass, 0 fail, 1 skipped, and `bun test agent-workflows/tests/chanks` gives 230 pass.
  - Advisory follow-ups (not blocking): R4-new-file-blocks-whole-admission, R4-planning-key-self-invalidates, R3-status-digest-fragility, R3-subdirectory-cwd-disables-gate, R4-switch-read-once, R1-resource-confirmation-fabricated, R2-resource-confirmation-waived, R2-candidate-digest-misnamed, R3-drift-coverage-regressed, and six suggestions.
- [x] T5 — Real isolated Pi journey. Requires the human's exclusive-resource confirmation. Route: delegated verifier.
  - Done. Real Pi 0.87.1 (`/home/<usuario>/.npm-global/bin/pi`), loaded through its own SDK
    (`@earendil-works/pi-coding-agent`: `createAgentSession`, `DefaultResourceLoader`,
    `ModelRuntime`, `SessionManager`) — same pattern as S151-T5. The extension was generated into
    an isolated temp HOME via `install.py`'s own `install_pi_extension()` (unmodified production
    code), never into the real `~/.pi`. A temp git repo held `openspec/plan.yaml` and a fixture
    Session `S900`; a fake `radar` executable (outside the repo, first on PATH) answered
    `status --json` / `sesion S900`. The human-confirmation UI was a host-side `ctx.ui.confirm`
    stub bound via `session.bindExtensions({uiContext, mode:"rpc"})` — the model's tool path never
    answered it. The "model" driving tool calls was a deterministic scripted provider (no network)
    registered through `ModelRuntime.registerProvider`, so real dispatch ran through Pi's actual
    Agent loop, `beforeToolCall` hook, and the extension's real `tool_call` handler and
    `chanks_request_activation` tool — not direct unit calls.
  - Results, all PASS: (1) switch off → write/edit/bash pass through, 0 UI interactions;
    (2) `on` refused via `pi-switch.mjs` CLI against a repo with no `openspec/plan.yaml`;
    (3) switch on, no key → read passed, write and edit blocked, bash was rewritten into the
    read-only bwrap room and a write attempt inside it failed (host file never created);
    (4) session key request showed exactly one `ctx.ui.confirm` naming `Session: S900` and
    `src/feature.md`; on accept, three consecutive authorized writes to `src/feature.md` all
    succeeded and a write to `docs/notes.md` was blocked; (5) declining the same request left
    writes blocked; (6) planning key accept let two consecutive writes to `openspec/plan.yaml`
    succeed (key survives its own write) while a write elsewhere was blocked; (7) a fresh Pi
    session started with `cwd` inside `<repo>/src` still gated a write, proving the
    `git rev-parse --show-toplevel` subdirectory resolution; (8) turning the switch off via the
    CLI while the planning key was still active in-memory let the very next `tool_call` pass
    through in the same Pi session, no restart.
  - Advisory observation (reported, not fixed): watched for R3-per-call-subprocess-revokes-key
    across the three consecutive authorized writes in item 4 — NOT observed in this run; all
    three landed and the live-identity check held every time.
  - **Superseded 2026-09-23 (Engram 11475 — see "Referential key" below).** Results 4 and 6 above
    ("a write to `docs/notes.md` was blocked" under the Session key; "a write elsewhere was
    blocked" under the planning key) proved the confinement this Session originally shipped. That
    confinement is now removed: once a key is active, every write passes. This journey is not
    re-run against the new behavior here; the real validation is Pi actually implementing S152
    after delivery.
  - Isolation: every harness file, the temp HOME, the two temp git repos, and the fake `radar`
    lived under the session scratchpad's `t5/` directory; all deleted at the end except a short
    evidence log. Repository `git status --short` was captured before and after and is
    byte-identical (clean in both). Real `~/.pi/agent/extensions/` was not touched (the generated
    shim is still absent there; still parked in `~/.pi/agent/extensions-disabled/`), and the real
    repository's `.git/chanks` switch state does not exist (untouched). No repository source file
    was modified by this verification.
- [x] T6 — Delivery after human confirmation: push, reinstall, switch on here, offer propagation.
  - Done 2026-09-24 on Emilio's explicit request to finish the delivery. Pushed `48d7dda`
    (contract correction for the referential key; pre-push: Radar 0 errors, suite 1210 pass).
    No Pi process was running. `python3 agent-workflows/tools/install.py` then `--check`: "runtime
    copies and manual blocks match the repository"; `~/.pi/agent/extensions/chanks-controls.ts`
    installed. `node agent-workflows/chanks/pi-switch.mjs on` here: `effective: true`; other
    repositories stay off by default. Plan records `entrega.commit: 48d7dda`.
- [x] Advisory fixes — four non-blocking advisories from lineage `review-51f99d6a30b92ffe`, each
  its own work unit, strict TDD (RED observed before GREEN), one Conventional Commit per fix, no
  AI attribution. Route: inline parent (bounded writer for this Session).
  - [x] F1 — R3-new-file-blocks-admission. `pi-admission.mjs`'s `canonicalRepoFile` required
    every declared `archivos` entry to already exist, so one not-yet-created file blocked the
    whole Session admission. Added `repoPathStatus`, which validates path safety (canonical
    parent directory inside the repo, no symlink/escape) for a file that does not exist yet, and
    `archivoStatuses`, which splits a Session's declared files into `authorizedFiles` (retained
    fd set) and `newFiles` (informational only, listed in the confirmation text as "New files
    (not yet created)"). A Session whose *only* declared file is new still has nothing to
    authorize and is rejected. File creation stays out of scope: `pi-controls.mjs` untouched.
    RED: `bun test agent-workflows/tests/chanks/pi-admission.test.mjs` — 3 of the 3 new tests
    failed against the pre-fix module (`«…» no existe todavía en el repositorio`), 11 pre-existing
    pass. GREEN: same command, 14 pass. Commit `3031a39`.
  - [x] F2 — R3/R4-planning-key-self-invalidates, R3-status-digest-fragility,
    R3-missing-roadmap-blocks-planning. `pi-admission.mjs` bound live identity (inside
    `identidadActual`) to the whole-file `radar status --json` digest for both key kinds, so
    writing `plan.yaml` (which changes that digest by design) silently invalidated the very
    planning key that write was supposed to use, and an unrelated Session's row changing dropped
    an unrelated Session key. The whole-plan status is now read only once, at `buildAdmission`
    time, to derive a Session's files/cimientos/resources; ongoing revalidation binds a Session
    key to `radar sesion <ID>` (that Session's own state and archivos, rendered as text) plus
    `baseCommit`, and binds a planning key to repository root, base commit and kind alone — it
    never calls Radar again after being built. A missing `openspec/ROADMAP.md` no longer blocks
    the planning key (`optionalRepoFile`): `plan.yaml` is always required, `ROADMAP.md` only when
    present. `pi-authority.mjs` no longer requires `radar.statusDigest` (still tolerates it as a
    harmless legacy field, which is what keeps `pi-controls.test.mjs` — out of this Session's
    scope — green).
    RED: `bun test agent-workflows/tests/chanks/pi-admission.test.mjs agent-workflows/tests/chanks/pi-authority.test.mjs`
    — 18 of 43 failed against the pre-fix modules (mostly `radar.statusDigest` required-field
    errors from the new fixtures). GREEN: same command, 43 pass. Full `bun test
    agent-workflows/tests/chanks` — 238 pass (0 fail) after also relaxing the unknown-field
    strictness that had broken the out-of-scope `pi-controls.test.mjs`. Commit `04675e9`.
  - [x] F3 — R1/R3/R4-subdirectory-cwd. The generated extension treated `process.cwd()` as the
    repository root directly, so starting Pi in a subdirectory made the plan check (and
    everything gated behind it) look for `openspec/plan.yaml` under that subdirectory and stay
    inert even with the switch on and a real plan at the true root. The extension now resolves
    the repository root with a trusted `git rev-parse --show-toplevel` from cwd (through
    `pi-admission.mjs`'s own never-trust-a-repo-supplied-binary `resolveExecutable`, with a 10s
    timeout) and uses it for the switch, the plan check and admission; the read-only room binds
    that root back into visibility after the tmpfs mounts but `--chdir`s into the agent's actual
    working directory, so a subdirectory session lands in the same place instead of silently at
    the repository root. A cwd outside any git repository stays inert.
    RED: `python3 -m unittest test_install.PiAuthorityExtensionTests.test_starting_pi_in_a_subdirectory_still_applies_the_gate test_install.PiAuthorityExtensionTests.test_no_key_room_chdirs_to_the_actual_working_directory_not_the_repo_root test_install.PiAuthorityExtensionTests.test_switch_and_plan_apply_from_a_subdirectory_even_though_they_live_at_the_repo_root test_install.PiAuthorityExtensionTests.test_cwd_outside_any_git_repository_is_inert`
    — 3 of 4 failed against the pre-fix template (the not-a-repo case already passed). GREEN:
    same command, 4 pass. Commit `a7b97b3`.
  - [x] F4 — R4-switch-evaluated-once-at-load, R2-switch-contradictory-read-contract,
    R4-unbounded-sync-subprocess-per-tool-call, R3-no-exec-timeout. The switch was read once, at
    extension load, to decide whether to register handlers at all: turning it on after Pi
    started did nothing until a new session, and turning it off while a key was active never
    took effect. `pi-switch.mjs` gained `switchStatusAt`/`effectiveSwitchAt`, which read the
    state file and plan existence with plain `fs` calls given an already-resolved git common
    directory (no subprocess); the extension now always registers its handlers once cwd resolves
    inside a git repository, computes the common directory once at load, and re-reads the switch
    on every `tool_call` and inside `chanks_request_activation`'s own `execute`, passing through
    `{}` immediately once effectively off, key or no key. Every `execFileSync` in
    `pi-admission.mjs` and the template now carries a 10s timeout.
    RED: `python3 -m unittest test_install.PiAuthorityExtensionTests.test_switch_off_registers_handlers_but_stays_inert test_install.PiAuthorityExtensionTests.test_switch_on_without_a_plan_is_also_inert test_install.PiAuthorityExtensionTests.test_switch_turned_off_mid_session_passes_through_the_very_next_tool_call test_install.PiAuthorityExtensionTests.test_requesting_activation_while_the_switch_is_off_is_rejected`
    — 3 fail + 1 error against the pre-fix template. GREEN: same command, 4 pass. Also RED/GREEN
    on the unit level: `bun test agent-workflows/tests/chanks/pi-switch.test.mjs
    agent-workflows/tests/chanks/pi-admission.test.mjs` — 2 fail (missing export, missing
    timeout) → 31 pass. Commit `897117a`.
  - Kickoff skill wording updated in the same delivery (not a separate work unit, no behavior
    change): "the generated extension registers nothing" was no longer accurate after F4 (it now
    always registers inside a git repo and passes through inert); reworded to describe the
    observable behavior instead of the removed implementation detail.
  - Final check results after all four fixes: `bun test agent-workflows/tests/chanks` — 241
    pass, 0 fail. `python3 -m unittest discover -s agent-workflows/tests` — 160 pass, 0 fail, 1
    skipped (pre-existing, environment-dependent: "native SDD test binary is unavailable").
  - Remaining limitation, unchanged from T2: a Session that names a brand-new file still cannot
    have pi-controls.mjs *create* that file — F1 only stops that declaration from blocking
    admission for the files that do exist. Creation itself stays whatever `pi-controls.mjs` does
    today, per the human's explicit scope decision for this addendum.
- [x] Referential key (Engram 11475, human decision 2026-09-23) — the key must not prevent
  anything; it only identifies, for the Main agent, which Session (or planning) a Pi is working.
  Evidence for the decision: under the previous confinement, a real Session (S152) could not
  create its 4 new files, run `go test` (build cache), or `git commit` (`.git`) while its key was
  active. Route: inline parent (bounded writer for this Session).
  - **W1 — unconstrained once active.** `install.py`'s generated `tool_call` handler now checks
    `authority.estado() === "activa"` (a plain, no-I/O state read) and returns `{}` for every tool
    once a key is active: no bwrap room, no path limits, no call into pi-controls.mjs's
    confinement (`gobernar`/`capacidad`). Without a key, behavior is unchanged: reads pass, Bash
    runs in the read-only room, write/edit are blocked telling the agent to call
    `chanks_request_activation`. Switch off/no plan stays pass-through, key or no key. Every
    now-dead `.cerrar()` call was dropped from the activation tool.
  - **W2 — key lifetime.** `pi-admission.mjs`'s `identidadActual()` is now a fixed, no-I/O
    snapshot captured once when the admission is built, instead of re-deriving live identity from
    `git`/Radar on every call. A referential key has nothing left to prove "live" against, so HEAD
    advancing (the agent's own commits) and any plan row changing later — including the Session's
    own — never drop the key, and no subprocess is ever spawned again on its account.
    `pi-authority.mjs` and `pi-controls.mjs` were **not** simplified or edited: their full
    confinement capability (`capacidad()` → `gobernar()`, retained file handles, drift detection)
    stays intact and is still directly exercised by the out-of-scope, untouchable
    `pi-controls.test.mjs` — the generated extension simply stops calling any of it. This was a
    correction mid-implementation: an earlier attempt to also strip that machinery out of
    `pi-authority.mjs` broke `pi-controls.test.mjs` (5 failures), and was reverted.
  - **W3 — wording.** The kickoff skill's "Organic Pi Admission" section no longer says the key
    "guards a cooperative agent against accidental writes" or "enables exactly those files" —
    both false once active. It now says plainly: the key identifies the Session for the Main
    agent and blocks nothing once active; without it, writes are blocked; and it names the exact
    three drop conditions (session shutdown/reload/replace, worktree/root differs, switch off)
    against the two things it explicitly survives (HEAD advancing, any plan row changing).
    `chanks-1-autoridad` and `chanks-2-planificador-granular` were checked and left unchanged:
    their one-line planning-key rules ("request the key before writing plan.yaml") never implied
    a limit, so there was nothing to correct. `test_builder_flow.py` needed no changes — its
    assertions check for phrase presence (`chanks_request_activation`, `never answer`, etc.), none
    of which depended on the removed "guards"/"enables exactly" language.
  - RED (W1+W2, combined since both touched the same two files): reverted `pi-admission.mjs`
    alone and reran `pi-admission.test.mjs` — 1 new test failed with "la evidencia viva ya no
    coincide con la admisión" (16 pass / 1 fail). Separately reverted `install.py` alone and
    reran `test_install.py`'s `PiAuthorityExtensionTests` — 3 tests failed asserting a write to a
    non-declared file, or bash, stayed unconfined under an active key (17 pass / 3 fail).
  - GREEN: both restored. `bun test agent-workflows/tests/chanks` — 239 pass, 0 fail (net −2 from
    241: three old file-identity/subprocess-tracking tests in `pi-admission.test.mjs` collapsed
    into one "identidadActual nunca vuelve a invocar git ni radar" test that proves the same
    module directly). `python3 -m unittest discover -s agent-workflows/tests` — 161 tests, 1
    skipped (pre-existing, environment-dependent), 0 fail — net +1 from 160 (two new proof tests
    in `test_install.py` for the HEAD-change/unrelated-row-change survival, two renamed/rewritten
    in place, no test removed).
  - Commits: `7f53da0` (W1+W2, `pi-admission.mjs` + `install.py` + their tests), `1d90414` (W3,
    kickoff skill wording).
  - T5 superseded: items 4 ("a write to `docs/notes.md` was blocked" under the Session key) and 6
    ("a write elsewhere was blocked" under the planning key) in that section's real-Pi journey no
    longer hold and are not re-verified here — this decision was made and implemented *after* T5
    ran, against the confinement T5 was built to prove. The real validation of the new,
    unconstrained behavior is Pi actually implementing S152 after delivery, per the human's own
    framing of this decision.

## Progress

- T1–T4 done (commits ce8da1c, 0c0b567, 866c476, and this one). Switch, admission builder,
  generated extension, and skills all implemented and green on the two required checks, with
  one anticipated, reported (not fixed) failure in the out-of-scope `test_builder_flow.py`.
- Running authored+changed lines across T1–T4 (code/tests/skills, `git diff --stat` additions +
  deletions, excluding this planning document): T1 ≈263, T2 ≈749 (code+tests only), T3 ≈928,
  T4 ≈126 → total well past the ~500–600 line exception. Flagged for the human; every task still
  shipped with full tests and no shortcuts, per the exception's own condition.

## Next step

T1–T5, the review corrections, the four advisory fixes, and the referential-key decision
(Engram 11475) are all done, each with its own RED/GREEN evidence and commit(s). Only T6
(delivery: push, reinstall, switch on here, offer propagation) remains, and it requires the
human's explicit confirmation first, per the Session's own Delivery section. Not started by this
writer.
