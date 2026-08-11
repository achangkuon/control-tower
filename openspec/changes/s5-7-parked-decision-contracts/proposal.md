# Proposal: Canonical Parked-Decision Contracts

## Outcome

Add two pure versioned contracts: `parked-decision-v1` records the complete §11 decision and frozen Session scope; `parked-decision-response-v1` records one selected `option_id` bound to that decision, its S5.6 snapshot digest, and one authorization identity. Both use the canonical registry and validator. No store, authority transition, or runtime consumer is added.

## Authority

- S5.7 in `openspec/plans/plan-5/STATUS.md`.
- Decisions 17–18 in `openspec/plans/decision-register.md`.
- S5.6's archived snapshot contract under `openspec/changes/archive/2026-08-11-s5-6-canonical-session-snapshot/`.

## Scope

Implementation is limited to the approved S5.7 paths in `contracts/`, `schemas/`, and `test/`. The change MAY add only its own files under `openspec/changes/s5-7-parked-decision-contracts/`.

The parked record MUST contain an exact question, line-addressed evidence and contradiction, enumerated options with stable unique IDs and consequences, origin Session/Módulo, checkpoint, one escalating class, and frozen scope carrying the exact `session_plan_snapshot_digest`. A canonical digest binds every field.

The response MUST bind a response ID, `authorization_id` plus revision, `parked_decision_id` plus digest, exactly one enumerated `option_id`, the same snapshot digest, and timestamp. Its digest binds every field. Construction checks enumeration against the complete parked record but performs no authority lookup, validation, transition, persistence, or consumption.

## Non-goals

No edits or imports in `escalation/**`, `main-store/**`, `continuation/**`, `core.mjs`, `mcp.mjs`, `delivery/**`, the S5.6 parser/schema, Plan files, Specs files, DB, Tower state, or remote delivery. S5.8 owns atomic persistence and terminal authorization transition; S5.5 only consumes later.

## Risk and rollback

The main risk is a self-asserted or label-based selection. Closed schemas, identity digests, unique option invariants, and a constructor requiring an enumerated `option_id` fail closed. Rollback is one revert of the complete pure-contract change; no data repair or migration exists.

## Success

All ten S5.7 acceptance criteria pass, focused and full Bun suites are green, implementation remains within 400 authored changed lines, and no prohibited path changes.
