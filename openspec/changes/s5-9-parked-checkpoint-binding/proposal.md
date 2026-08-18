# Proposal: Authoritative Parked Checkpoint Binding

## Decision
Introduce a standalone, versioned, immutable `parked-checkpoint-binding-v1` record in the Main store. It authoritatively proves that one parked decision, its exact `parked.checkpoint`, canonical checkpoint capture, and canonical reconciliation evidence in state `VALID` all identify the same checkpoint.

Authority: S5.9 in `openspec/plans/plan-5/STATUS.md` lines 625–663 and `openspec/plans/decision-register.md` decisions 19 and 20, at base/HEAD `fee4f5b1eaf0598c5119497ebf243ffa7c4a8504` on branch `feat/plan-5/s5-9-checkpoint-binding`.

## Intent

### Problem
The canonical artifacts preserve related checkpoint facts independently: the parked decision carries `parked.checkpoint`, canonical capture carries checkpoint capture identity and digest, and canonical reconciliation carries reconciliation identity, digest, status, and execution bindings. No authoritative immutable record currently binds all three. Caller assertions, local inference, or narrative equivalence therefore cannot be allowed to stand in for provenance.

### Outcome
When a decision is parked, Main seals exactly one authoritative binding only after canonical capture and canonical reconciliation `VALID` evidence are available. Dedicated authoritative readback by parked-decision identity returns the persisted binding. Exact canonical replay is idempotent; divergent replay fails closed with no partial mutation.

## Scope
S5.9 includes only:
- standalone `parked-checkpoint-binding-v1` contract and schema;
- validation of exact identities, digests, status, checkpoint value, and decision-20 cross-bindings;
- sealing during parking only after canonical capture and canonical reconciliation `VALID` evidence are available;
- persistence and dedicated readback under existing Main-store authority, writer, lock, and transaction;
- exact canonical replay idempotence and fail-closed divergent replay;
- contract, store, fixture, and focused tests within the approved area.

The binding cross-binds exact parked decision identity/digest, exact `parked.checkpoint`, canonical capture identity/digest, canonical reconciliation identity/digest/`VALID`, and repository/project/assignment/generation/base/result values needed to prove all evidence names the same checkpoint.

Approved implementation area: `main-store/store.mjs`, `contracts/**`, `schemas/**`, `test/main-store.test.mjs`, `test/contracts/**`, `test/fixtures/contracts/schema-cases-v1.json`.

Excluded paths: `workspace/checkpoint.mjs`, `escalation/**`, `continuation/**`, `core.mjs`, `mcp.mjs`, `delivery/**`, `openspec/specs/**`.

## Non-goals
- No checkpoint-capture or reconciliation producer changes.
- No adapter, alternate evidence path, or prerequisite implementation.
- No S5.5 modification, inference, or parsing.
- No S5.10 implementation.
- No caller assertions, text equivalence, or narrative reconstruction as canonical evidence.
- No mutable replacement or authority only in `extensions`.
- No shadow store, second writer, or parallel transaction path.
- No changes to continuation, escalation, delivery, MCP, core, or public OpenSpec specifications.

## Security and authority boundary
Main store is the sole writer. Creation, immutability, replay checks, and readback remain under its existing authority check, lock, and transaction. Sealing consumes only producer-owned canonical capture and reconciliation evidence; callers cannot assert, reconstruct, substitute, or override those facts.

Any mismatch in checkpoint value, identity, digest, repository, project, assignment, generation, base, result, reconciliation identity/digest/status fails closed with no partial binding, replacement, or additional effect. A sealed binding is immutable.

## Mandatory design falsifier gate
Before tasks or apply, design must prove the existing parking flow can obtain producer-owned canonical capture and canonical reconciliation evidence in state `VALID` without caller assertion. The design must trace both canonical artifacts into parking while preserving producer-owned identities/digests and show the required cross-bindings are available within the approved boundary.

If proof is absent or partial, depends on caller provenance, S5.5 inference/parsing, narrative reconstruction, forbidden producer-path edits, an invented adapter, or a second evidence route, S5.9 stops before tasks/apply. The missing producer capability is escalated as a new prerequisite Sesión. This proposal neither authorizes nor designs that prerequisite.

## Affected areas
- Main-store persistence: sealing, immutable persistence, replay enforcement, dedicated readback.
- Contracts/schemas: versioned record and exact cross-binding validation.
- Main-store tests: atomic sealing/readback, replay behavior, zero partial effects.
- Contract fixtures/tests: valid canonical evidence and fail-closed mismatch/assertion cases.
- Parking workflow: consume existing producer-owned canonical evidence only.

## Risks
- Canonical evidence may not be available to parking: falsifier stops S5.9 and escalates prerequisite.
- Independently valid artifacts may diverge: validate all bindings before mutation.
- Replay may threaten immutability: only exact canonical replay is idempotent; divergent replay has zero effects.
- Authority may split: keep existing Main-store authority/lock/transaction and forbid shadow paths.
- Scope may expand: forbidden-path need fails the gate.
- Delivery forecast may exceed 400 authored lines: stop for delivery replanning rather than broaden scope.

## Rollback
Before delivery, revert S5.9 implementation changes. After sealing, rollback stays non-destructive: immutable records are not rewritten/deleted, and no cleanup writer or migration is authorized. Reverted behavior preserves Main-store authority and existing data. If design cannot provide non-destructive rollback within the approved area, stop before tasks/apply.

## Success criteria
- Design falsifier proves producer-owned canonical capture and reconciliation `VALID` evidence reach parking without caller assertion.
- Exactly one authoritative binding contains every required exact identity/digest/value/status and cross-binding.
- Sealing, persistence, replay, and dedicated readback run under existing Main authority/writer/lock/transaction.
- Every mismatch fails closed without partial mutation/replacement.
- Caller assertion, equivalent text, S5.5 inference/parsing, and narrative reconstruction cannot substitute evidence.
- Exact canonical replay is idempotent; divergent replay has zero additional effects.
- No shadow store, second writer, producer modification, alternate route, or extensions-only authority.
- Implementation touches no path outside the approved area.

OpenSpec artifact: `openspec/changes/s5-9-parked-checkpoint-binding/proposal.md`.