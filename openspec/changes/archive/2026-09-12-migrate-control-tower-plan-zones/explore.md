# Exploration — migrate-control-tower-plan-zones

## Scope and guardrails

This exploration covers the Control Tower planning migration only. It does not implement the migration, create `openspec/plan.yaml`, generate `openspec/ROADMAP.md`, delete or edit legacy planning views, run tests, commit, or push. The historical migration draft remains evidence, not an editable source.

The worktree is the Pi-first implementation target described by the current assignment: Tower is OFF, the branch is clean at the recorded base `43130ad…`, and the migration must remain dormant until its activation gate is explicitly satisfied.

## Current architecture

- Radar v3 treats `openspec/plan.yaml` as the sole editable planning source.
- `openspec/ROADMAP.md` is a generated human view; it must be produced by `radar render`, not hand-edited.
- Radar supports alternate input/output/root paths (`-f`, `-o`, `-C`) for migration and tests, but canonical defaults are the two paths above.
- `radar check` validates YAML shape, dependency graph, decisions, Git evidence, and partition coverage. `radar status` derives state, queues, progress, and seats. `radar zonas` checks tracked-file ownership. Rendering snapshots HEAD and refuses publication if HEAD changes; it writes atomically and rejects unsafe/non-regular destinations.
- The schema requires executable Sessions to carry IDs, zones, observable results, authority, binary criteria, route evidence, and valid Module/Task hierarchy. A delivered Session may rely on delivery evidence rather than open-work criteria.
- Decisions marked `derivable` require approved authority plus a falsifiable criterion. The eight always-escalate classes are closed; authority and criteria cannot make one derivable. An `escala` decision must declare how far its contamination reaches.
- Cimientos are exact-file reservations, not a second broad partition. A Cimiento reservation can cut an exact shared file out of a broad Zone, but cannot hide a real Zone/Zone overlap.

## Legacy authority and migration corpus

The legacy corpus is distributed rather than represented by one file. Relevant authorities include:

- `openspec/plans/master-index.md` — cross-plan queue, status, percentages, and resume point.
- `openspec/plans/decision-register.md` — recorded product and workflow decisions.
- `openspec/plans/manifest.yaml` and `openspec/plans/inventory.md` — plan/catalog inventory.
- `openspec/plans/product-version-map.yaml`, `implementation-state.md`, and `release-chain.md` — product identity, implementation evidence, and delivery ordering.
- The Plan `STATUS.md` files (Plans 0–12 in the enumerated corpus; no new Plan 13 is established as a source of authority) — Session-level scope, dependencies, areas, resources, decisions, and outstanding work.
- `openspec/plans/plan-vocabulary-migration-appendix.md` and `openspec/plans/sdd-tower-implementation/manifest.yaml` — vocabulary and SDD migration context.
- `agent-workflows/FLUJO-END-TO-END.md` — current end-to-end workflow authority for the migration discussion.
- `agent-workflows/MIGRACION-ZONAS.md` — migration state and next action, but with wording that must be corrected before it can be treated as reliable evidence.
- `agent-workflows/PLANO-CONTROL-TOWER.md`, `ASIGNACION-24-SESIONES.md`, and `EJECUCION-EN-PARALELO.md` — staging/draft analysis of the target partition and open-Session assignment. These are evidence and must not be silently promoted to the canonical plan.

The legacy corpus contains both completed history and open work. It cannot be mechanically flattened by copying status text: Radar derives status from evidence, and the target model is one product plan with `Zona → Sesión → Módulo → Tarea` rather than multiple generated status/index views.

## Doc-guard impact

`~/.claude/hooks/doc-guard.sh` still detects the legacy documentation contract around `STATUS.md`. The target contract says a planning-data change is complete when `openspec/plan.yaml` is updated, with an honest “nothing to record” path for a change that did not close work. The Control Tower `AGENTS.md` closing language likewise names `STATUS.md` and `master-index` and must be reconciled with the target contract.

This is a hard migration prerequisite, not a cosmetic cleanup: creating the target sentinel while the hook still requires a deleted legacy file would make legitimate Sessions impossible to close. The migration must therefore distinguish:

1. prerequisite corrections to the active close gate and repository guidance;
2. creation and validation of the target plan;
3. generation of the target view; and
4. retirement of legacy generated views only after equivalence is demonstrated.

References to legacy files inside historical evidence should not be mass-edited merely to make a grep clean. Each reference needs classification as active runtime guidance, migration evidence, or immutable history.

## Radar and partition findings

The historical draft `agent-workflows/tools/radar/borrador-control-tower.yaml` proposes 10 Zones plus Cimientos and records a prior estimate of 441 tracked files with zero orphans. That number and the draft ownership map are not yet an activation proof. They must be checked against `git ls-files` at one immutable snapshot in the target worktree.

Known partition-sensitive areas include:

- `console/`, `skills/`, `capabilities/`, `plugin/`, `policy/`, and their tests;
- `docs/`, `README.md`, `ROADMAP.md`, and `openspec/`;
- `openspec/changes/` as historical SDD archive versus active planning documents;
- root/runtime files such as `core.mjs`, `mcp.mjs`, `package.json`, `bun.lock`, scripts, hooks, `CLAUDE.md`, `AGENTS.md`, fixtures, provenance, and generated/runtime payload files.

The key drift risks are broad documentation rules swallowing mixed ownership, `openspec/changes/` being treated as live work despite being archive history, exact shared files being omitted from Cimientos, and overlapping broad globs assigning one tracked file to multiple Zones. The target proof needs zero orphaned tracked files and zero unintended overlaps, while explicitly recording any intentional Cimiento cut-outs.

The 24 open Sessions must be assigned by their declared `Área`, not by the legacy Plan from which they came. That rule is documented in the assignment draft, but the actual assignment remains unresolved until each Session's path set and the validated partition agree. A Session whose work spans Zones needs an explicit Cimiento reservation or a product decision; silently assigning it to the old Plan would reintroduce the defect the migration is meant to remove.

## Migration equivalence

Equivalence should be treated as a binary release condition, not visual similarity between Markdown files. Evidence must establish, at one immutable Git snapshot, that:

- every legacy open/closed planning seat intended for migration appears exactly once in the new plan;
- Session identity, scope, dependencies, authority, decisions, criteria, route evidence, delivery evidence, and outstanding work are preserved or explicitly classified as transformed;
- derived state and queues agree with the legacy authority where the legacy value was authoritative, and differences are explained where Radar correctly derives a value from Git;
- every executable Session has valid Module and Task structure with IDs that belong to their parent Session;
- every tracked file is owned by exactly one Zone or an explicitly defined Cimiento rule, with no orphan or accidental overlap;
- non-representable legacy information is retained in an explicit migration record/evidence location rather than discarded or hidden in generated output;
- `radar check` passes, `radar status`/`radar zonas` produce the expected derived coverage, and `radar render` is deterministic and reproducible from the plan;
- the generated view carries the do-not-edit marker and the old generated views are not retired until the comparison and readback are complete.

The location and format for non-representable legacy data is an unresolved authority decision. Putting it into `ROADMAP.md` would violate the generated-view boundary; dropping it would break historical equivalence. The decision must be made before implementation.

## Mutable-HEAD wording defect

`agent-workflows/MIGRACION-ZONAS.md` records migration state using mutable `master@...` wording and mixes current status with a future action. That is unsafe evidence: a branch label can move after the document is written, and a self-referential migration document cannot prove its own state by naming a mutable ref.

The correction must use a full immutable commit OID and identify the observation/snapshot it supports. It must not claim that a later migration artifact exists before that artifact is created, and it must avoid using the migration document's own future update as evidence of completion. The exact wording is an authority decision because it changes what the repository treats as proof of phase state.

## Commit cohorts and delivery constraints

The migration has a large documentation/data surface and must be decomposed into independently reviewable commit cohorts of no more than 400 authored changed lines. The cohorts should keep prerequisite gate corrections, canonical data creation, generated output, equivalence evidence, and legacy-view retirement independently inspectable and revertible. Generated output must be created only after the plan validates, and no cohort may make the target plan appear active before its prerequisites and equivalence evidence are in place.

This is a delivery constraint, not permission to invent additional planning hierarchy. The plan remains `Plan → Sesión → Módulo → Tarea`; review/commit cohorts are implementation mechanics only.

## Unresolved product and authority decisions

These decisions remain open and must not be inferred by the explorer:

1. **Canonical migration inventory:** exactly which legacy Sessions and historical seats are in scope for this product migration, including any already-delivered or parked material.
2. **Partition ownership:** final Zone boundaries, special-file ownership, Cimiento reservations, and treatment of intentional cross-Zone work after validation against tracked files.
3. **Non-representable data:** authoritative destination and retention format for legacy fields that Radar v3 cannot model directly.
4. **ID and identity policy:** whether legacy Plan/Session/Module/Task identifiers are preserved, transformed, or mapped, and what constitutes equivalence after transformation.
5. **Legacy-view retirement:** precise gate for deleting/retiring `STATUS.md` and `master-index.md`, including whether any historical copies remain immutable evidence and where they are kept.
6. **Activation order:** whether the doc-guard and `AGENTS.md` corrections must land before the target plan sentinel, and the exact evidence required before Radar becomes the live planning authority.
7. **Mutable-HEAD proof language:** approved immutable snapshot wording and authority for updating `MIGRACION-ZONAS.md` without self-reference.
8. **Historical conflicts:** how to resolve contradictions between the decision register, status files, migration documents, and Git evidence. No always-escalate class is inferred from a conflict; the conflict itself is reported for authority resolution.

## Recommended next exploration handoff

Before proposal/spec work, obtain maintainer decisions for the unresolved items above, then validate the draft partition against the actual tracked-file set and build a source-to-target equivalence inventory. The next phase should consume this exploration as constraints, not treat the historical YAML draft or generated legacy views as canonical.

## Evidence reviewed

`AGENTS.md`; `CLAUDE.md`; `.doc-guard.json`; `agent-workflows/FLUJO-END-TO-END.md`; `agent-workflows/MIGRACION-ZONAS.md`; `agent-workflows/PLANO-CONTROL-TOWER.md`; `agent-workflows/ASIGNACION-24-SESIONES.md`; `agent-workflows/EJECUCION-EN-PARALELO.md`; Radar README, schema/parser/check/state/render/Git/safety sources and tests; `agent-workflows/tools/radar/borrador-control-tower.yaml`; the legacy `openspec/plans/` manifest, index, decision, inventory, product/version, implementation, release, migration appendix, and Plan STATUS corpus.

No implementation, legacy-view edit, test, commit, push, or runtime mutation was performed.
