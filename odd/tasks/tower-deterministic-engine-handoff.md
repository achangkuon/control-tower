# Deterministic Tower engine — architecture handoff

Locator: `odd/tasks/tower-deterministic-engine-handoff.md`; Engram: `odd/tower-deterministic-engine-handoff/tasks`.
This tracks the research and documentation work only. It is not a product Session, does not select implementation work, and never writes `openspec/plan.yaml`.

## Objective

Produce one repository-versioned Markdown handoff that defines everything required to evolve the current Control Tower into a deterministic runtime behind one authoritative `torre` executable, while keeping Chanks primarily in the Pi harness and skills.

## Confirmed authority and boundaries

- The persisted root is an Execution of Session, separate from the plan Session and from a Jornada.
- Tower alone chooses and persists mechanical transitions inside that Execution.
- Agents receive sealed work packets and return structured evidence; they do not reconstruct the route from transcript context.
- Chanks declares through ODD, skills and versioned contracts; Tower executes admitted contracts.
- Chanks remains primarily a Pi harness/skills methodology. The `torre` executable may be implemented with Bash/Bun/JavaScript; language does not define authority.
- Human decisions, Radar/plan, delivery policy, Gentle AI RDD, Git and host truth remain external authorities. Tower validates their bound contracts or receipts but never fabricates them.
- UI only projects authoritative state. Host adapters execute effects and return attestations, but never open or mutate the Execution store independently.
- `tower.db` SQLite is the canonical Execution store. `main-store` JSON is a temporary compatibility projection, not a second authority.
- One stable Execution root owns the full lifecycle; the existing immutable handoff lifecycle is reused for child work packets. Packet correction never replaces the Execution identity.
- Execution phase and operational state are separate: admission/work/verify/review/delivery/closure do not multiply into phase-specific blocked or paused state enums.
- Tower OFF remains an explicit manual Chanks path; it does not emulate or mutate Tower state.
- This work performs no implementation, delivery, installation, Intercom handoff or planning mutation.

## Scope

- Active runtime, stores, CLI, adapters, installation, contracts, tests and historical/non-active boundaries.
- Useful RDD invariants and the limits of copying a review lifecycle into a longer-lived execution engine.
- Target end-to-end flow, state ownership, sealed packet/evidence contracts and host/UI boundaries.
- Store convergence and compatibility migration.
- Impact on already planned Sessions using fresh installed Radar evidence.
- Product simplifications, expansions, risks, migration order, verification strategy and explicit non-goals.

## Acceptance criteria and checks

- The handoff declares the exact Git revision and says that nothing was implemented.
- Every architectural claim cites active repository evidence or explicitly labels a confirmed human decision, inference or open uncertainty.
- Active runtime is separated from `product/tower/generic/**` and archived planning evidence.
- The target flow is complete from human intent through closure and Tower OFF behavior.
- Planned-Session impact is based only on `radar status --json` and `radar sesion <ID>` evidence; the plan and generated roadmap are not read directly or edited.
- Existing Sessions are classified without inventing IDs or writing status; missing future work is described as a planning delta, not registered.
- The document names contradictions, migration/data risks, compatibility requirements and what must not move into Tower.
- Structural readback, citation/path checks and Git status are recorded; no artificial functional verifier is required for this passive documentation artifact.

## Tasks

- [x] ODD1 — Confirm product decisions and map active Tower, RDD reference invariants and Chanks/Tower boundaries.
- [x] ODD2 — Capture authoritative Radar status and relevant Session contracts without reading or editing plan sources directly.
- [x] ODD3 — Derive the target execution model, contracts, persistence convergence and end-to-end flow.
- [x] ODD4 — Classify existing Session impact, product simplification/expansion, migration order, risks and non-goals.
- [x] ODD5 — Write and structurally verify the versioned Markdown handoff without modifying planning authority.

## Progress and evidence

Baseline: `master`, Radar snapshot HEAD `ebc2ffb840030f7266a207536134c057a82bec70`, 79 closed/115 total Sessions.
Radar contracts captured for S1.19, S2.9, S4.12, S7.1, S8.12, S8.13, S9.7, S9.8, S107, S108, S109, S117, S119, S121, S123, S143, S144 and S146.
Read-only scouts mapped active runtime surfaces, RDD invariants, the Chanks manual flow and store convergence. An independent challenge refined two boundaries: UI is projection but host adapters are effectors; Tower owns mechanical transitions but not external product authorities.
ODD3 is complete: `tower.db` is the canonical store; an Execution root remains stable across immutable child packets; external authorities enter as bound receipts; UI projects; host adapters execute effects and attest; Tower OFF stays separate.
ODD4 is complete: manual Method work S143/S144/S146 and horizon S123 remain separate; Tower V1 routing, host, recovery, bundle, install and pilot contracts require bounded amendments; S117 remains unrelated; S109 stays a later consumer rather than a prerequisite; no existing Session is silently archived or renumbered. Missing outcomes are declared without IDs: Execution schema/API, packet/evidence/receipt contracts, SQLite outbox and JSON projection, Pi harness binding, effect adapters, end-to-end journeys and verified legacy retirement.
ODD5 is complete: `docs/architecture/torre-motor-determinista.md` contains 21 ordered sections and 935 lines. Structural readback passed, 30 cited repository files exist, 40 cited line ranges are within file bounds, and neither `openspec/plan.yaml` nor `openspec/ROADMAP.md` changed. No functional tests were applicable to this passive document.
No source implementation, plan mutation, commit, push, installation or external-session message has occurred.

## Next step

The maintainer reviews the handoff. A later explicit request may authorize a fresh planning delta; that actor must recapture Radar/Git because the document is bound to `ebc2ffb840030f7266a207536134c057a82bec70`.
