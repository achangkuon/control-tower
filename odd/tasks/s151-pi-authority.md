# S151 — Ephemeral Pi Authority

## Objective

Complete the missing authority path between human-approved Radar admission and Pi's real mutating tool execution so Chanks controls are enforced by the runtime rather than described only by the model.

## Problem

The generated Pi shim reads authority that has no producer, discards the confined command returned by `gobernar`, hardcodes resource confirmation, and does not transport exact Cimiento grants. Existing tests execute Bubblewrap directly but do not prove that the loaded Pi shim rewrites or blocks the command Pi actually runs.

## Product authority

- Session: `S151`
- Zone: `metodo`
- Priority: `metodo-v1-controles-prioritarios`
- Native route: ODD
- Human selection: Emilio explicitly selected S151 and confirmed an isolated, exclusive Pi runtime.
- Activation decision: the agent may request authority, but only a host-owned Pi confirmation accepted by the human activates it. The user runs no command. Rejection, cancellation, unavailable UI, or invalid evidence fails closed.
- Size decision: the approved coherent Session may exceed the 400-line review reference without expanding scope, reducing tests, or weakening review.

## Admission binding

- Branch: `master`
- HEAD: `51d2a2ee460685a54ba88206597bf8e0636aab75`
- Expanded Radar status SHA-256: `30b0e6a8f90d3ebfebd57cfb3fdd1805eee37802bad2fd9d042617958ab891de`
- Expanded `radar sesion S151` SHA-256: `6729f4c51df5f5e539d47cbd8db786a4993361a65e6521dcef4f11737515cfca`
- Both outputs were captured twice and were byte-identical.
- Computed state: `LISTO`
- Shared resource: isolated Pi runtime confirmed for exclusive use; no global Chanks shim is installed.

## Scope

Only these repository files may be written:

- `agent-workflows/chanks/pi-authority.mjs`
- `agent-workflows/chanks/pi-controls.mjs`
- `agent-workflows/tools/install.py`
- `agent-workflows/skills/chanks-3-session-kickoff/SKILL.md`
- `agent-workflows/skills/chanks-4-puente/SKILL.md`
- `agent-workflows/tests/chanks/pi-authority.test.mjs`
- `agent-workflows/tests/chanks/pi-controls.test.mjs`
- `agent-workflows/tests/test_install.py`
- `agent-workflows/tests/test_builder_flow.py`
- `agent-workflows/tests/test_puente_sdd_start.py`
- `odd/tasks/s151-pi-authority.md`

`openspec/plan.yaml` and generated `openspec/ROADMAP.md` contain the approved coordination update and are not implementation surfaces.

## Constraints

- Do not duplicate or weaken `controls.mjs` or `interventions.mjs`.
- Radar remains the only product-state calculator; never parse ROADMAP or reimplement state.
- The model may request authority but cannot approve, synthesize, persist, or reuse it.
- Bind authority to canonical repository, Session, base, execution candidate, and Pi runtime identity.
- Invalidate authority on identity drift, stale evidence, rejected/cancelled consent, session replacement, reload, shutdown, or unavailable human UI.
- Write/edit paths must be exact canonical regular files inside the repository. Missing, ambiguous, escaped, or symlinked paths fail closed.
- Cimientos are writable only with exact live grants. A declared resource requires confirmed exclusive or serial use.
- Bash must execute the rewritten confined command. Returning a proposed command or a block message is insufficient.
- PowerShell must fail closed unless it can receive equivalent confinement.
- Do not install or activate the global shim during implementation. Skill reinstallation requires later human confirmation.

## Testing mode

- Mode: Strict TDD enabled.
- Source: repository `AGENTS.md` states Strict TDD remains in force.
- JavaScript runner: `bun test <test-file>`.
- Python runner: `python3 -m unittest <test-file>`.
- Each behavior task must record observed RED before production implementation, then GREEN and REFACTOR evidence.

## Tasks

- [ ] **S151-T1 — Define and test the ephemeral authority lifecycle**
  - Status: implementation and verification complete; work-unit commit pending.
  - Route: delegated to `gentle-ai-worker`.
  - Trigger: new production module plus a non-trivial test file.
  - Files: `agent-workflows/chanks/pi-authority.mjs`, `agent-workflows/tests/chanks/pi-authority.test.mjs`.
  - Outcome: validate fresh admission data, canonical repository and exact files; create in-memory authority bound to Session/base/candidate/runtime; invalidate on drift and lifecycle changes; expose trusted Cimiento/resource evidence without accepting model-authored claims.
  - Checks: `bun test agent-workflows/tests/chanks/pi-authority.test.mjs`.
  - Evidence: Initial RED observed because the production module did not exist. Review and verification drove portable containment, opaque consent correlation, revocable capabilities, single-link files, retained no-follow descriptors, nonempty resources, and exception-safe cleanup. The final Strict TDD RED had 3 expected failures; GREEN passes 20 tests with 0 failures. Native targeted validation became unavailable after a transport/native failure, so the provider-required high-risk fallback ran: the independent verifier repeated the focused suite once (20 pass, 0 fail) and found no concrete gap. Source and test files total 733 authored lines. Work-unit commit pending.

- [ ] **S151-T2 — Enforce authority in Pi mutating controls**
  - Route: delegated to `gentle-ai-worker`.
  - Trigger: two non-trivial implementation/test files.
  - Files: `agent-workflows/chanks/pi-controls.mjs`, `agent-workflows/tests/chanks/pi-controls.test.mjs`.
  - Outcome: consume only validated authority, remove hardcoded resource confirmation, derive exact writable files and Cimiento grants, reject symlinks/escapes, apply the confined Bash command, and fail closed for unsupported PowerShell mutation.
  - Checks: `bun test agent-workflows/tests/chanks/pi-controls.test.mjs`; regression checks for `controls.mjs` and `interventions.mjs`.
  - Evidence: pending.

- [ ] **S151-T3 — Add host-owned consent and real shim rewriting**
  - Route: delegated to `gentle-ai-worker`.
  - Trigger: generated extension behavior plus Python generation tests.
  - Files: `agent-workflows/tools/install.py`, `agent-workflows/tests/test_install.py`.
  - Outcome: generate a Pi extension where the agent can request authority, the host shows the exact human confirmation, only acceptance activates in-memory authority, and the `tool_call` handler mutates `event.input` to the confined command Pi will execute.
  - Checks: `python3 -m unittest agent-workflows/tests/test_install.py`.
  - Evidence: pending.

- [ ] **S151-T4 — Carry the activation contract through kickoff and bridge**
  - Route: delegated to `gentle-ai-worker`.
  - Trigger: two skills and two non-trivial contract test files.
  - Files: `agent-workflows/skills/chanks-3-session-kickoff/SKILL.md`, `agent-workflows/skills/chanks-4-puente/SKILL.md`, `agent-workflows/tests/test_builder_flow.py`, `agent-workflows/tests/test_puente_sdd_start.py`.
  - Outcome: preserve fresh Radar binding, exact resource/Cimiento evidence, and the host-confirmation boundary without turning ODD continuity into product authority or allowing model self-activation.
  - Checks: `python3 -m unittest agent-workflows/tests/test_builder_flow.py`; `python3 -m unittest agent-workflows/tests/test_puente_sdd_start.py`.
  - Evidence: pending.

- [ ] **S151-T5 — Prove the isolated runtime path end to end**
  - Route: delegated verification after implementation because the check loads generated Pi extension behavior and executes Bubblewrap.
  - Trigger: external runtime and multi-file verification boundary.
  - Files: read-only verification of all S151 implementation files; no new write surface.
  - Outcome: an isolated Pi runtime loads the generated shim, presents host-owned consent, blocks without acceptance, executes an allowed Bash command through Bubblewrap after acceptance, and proves a rejected direct or derived write does not occur.
  - Checks: focused JavaScript and Python suites, isolated runtime journey, then repository-required broad checks.
  - Evidence: pending.

## Acceptance criteria

1. No mutating Pi tool executes without fresh human-approved authority bound to the exact repository, Session, base, candidate, and runtime.
2. The agent can request authority, but only the host UI can accept it; no user command is required.
3. Rejection, cancellation, unavailable UI, stale evidence, drift, missing grants, or unconfirmed resources block with no permissive fallback.
4. Write/edit affect only exact canonical authorized files and exact granted Cimientos.
5. Bash executes the actual Bubblewrap-rewritten command; unsupported equivalent confinement blocks.
6. A real isolated Pi runtime loads the generated shim and demonstrates that denied direct and derived writes do not occur.
7. Existing controls/interventions behavior remains green and no global shim is installed during implementation.

## Forecast and delivery

- Forecast: 850–1,050 authored changed lines, excluding generated planning views.
- Approved strategy: one coherent S151 result under the explicit size exception.
- Delivery policy: direct push to `master` only after explicit delivery authorization, completed checks, applicable native review, and plan/documentation reconciliation.
- Current authored implementation count: 733 additions before the first work-unit commit.

## Progress

- Admission and exact-file expansion validated.
- Product/security decisions resolved.
- Read-only architecture map completed.
- S151-T1 final candidate is implemented and independently verified.
- Focused suite: 20 passed, 0 failed; independent fallback verification also passed 20/20.
- Native validation outcome: unavailable after transport/native failure; risk-gated fallback satisfied.
- No commit or push exists yet.

## Next step

Create the authorized local work-unit commit for S151-T1, record its identity, then start S151-T2.
