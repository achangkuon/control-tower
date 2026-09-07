# Control Tower Plan Migration Specification

## Purpose

Migrate Control Tower's duplicated legacy planning authority to one Radar v3 plan without losing historical identity, evidence, or non-representable context. The migration SHALL activate only as one proven, reversible contract boundary.

## Requirements

### Requirement: Complete authoritative source inventory

The migration MUST freeze an immutable legacy source snapshot and inventory every enumerated Session in the approved Plans 0–12 corpus exactly once. The inventory MUST identify every authoritative source file and classify each source value as representable target data, derived comparison input, approved replacement authority, archived narrative, or contradiction requiring resolution. The later approved assignments and replacement lineage in `agent-workflows/ASIGNACION-24-SESIONES.md` MUST override the stale unchecked item in `agent-workflows/PLANO-CONTROL-TOWER.md`.

#### Scenario: Inventory is complete and unambiguous

- GIVEN the immutable legacy source snapshot
- WHEN the migration inventory is produced
- THEN every enumerated legacy Session has exactly one ledger row and no ledger row is duplicated
- AND every authoritative source file and its content identity are recorded
- AND each unresolved authority conflict is recorded and prevents activation

### Requirement: Stable Session identity and approved lineage

The canonical target MUST preserve every existing Session, Module, and Task identifier byte-for-byte, including dotted legacy identifiers. The target MUST preserve approved successor Sessions `S100` through `S108` using explicit `reemplaza` lineage. Originals MUST be archived only after every successor is registered and each affected active dependency identifies its applicable successor. The migration MUST NOT renumber identifiers or reopen approved assignments.

#### Scenario: Replacement lineage remains referentially closed

- GIVEN a legacy original replaced by one or more approved successors
- WHEN its target and dependency edges are validated
- THEN the original ID, every successor ID, and each approved replacement edge are present
- AND active dependencies no longer rely on an archived original without naming an applicable successor
- AND no identifier has been renumbered

### Requirement: Proven legacy compatibility

Radar MUST provide compatibility only for an imported legacy Session that carries immutable migration provenance identifying its exact imported source row. That provenance MUST be mandatory, immutable, and sufficient to distinguish the source row from every other imported row. Under that provenance, Radar MUST preserve imported Session, Module, and Task identifiers byte-for-byte, including identifiers that do not match normal structural patterns. Radar MUST structurally validate imported identifier hierarchy and uniqueness without normalizing, renumbering, or accepting an inconsistent Session–Module–Task relationship.

Compatibility MUST NOT add, rename, translate, or combine statuses. A territory-pending imported Session MUST be `BLOQUEADO` only when its unresolved `escala` decision reaches `criterios` or `primer-modulo`; pending territory itself MUST NOT independently derive a status. A provenance-verified territory-pending imported Module MAY preserve zero enumerated Tasks only when its exact immutable source deliberately defers all Tasks until territory is proven, the unresolved `escala` reaches `primer-modulo`, the Module ID and result remain present, and the Session and Module author no territory or routes. Ordinary Modules, resolved imported Modules, and pending imports blocked at `criterios` MUST retain the requirement for at least one Task. Once territory resolves, Tasks MUST be enumerated beneath the same stable Module and provenance. A newly authored or otherwise non-proven Session MUST be rejected when it requests compatibility, uses a preserved legacy identifier outside provenance, or declares territory pending.

#### Scenario: Proven imported identifiers are accepted without normalization

- GIVEN an imported legacy Session has immutable provenance that identifies its source row
- AND its legacy Session, Module, and Task identifiers are unique and structurally consistent with one another
- WHEN Radar validates the imported row
- THEN it accepts the identifiers byte-for-byte without renumbering or normalization
- AND it retains only one of the existing seven derived statuses

#### Scenario: Source-deferred Tasks remain pending without weakening ordinary hierarchy

- GIVEN an immutable imported source preserves a Module but deliberately defers all Tasks until territory is proven
- AND the territory-pending Session has an unresolved escalation reaching `primer-modulo`
- WHEN Radar validates the imported row
- THEN it accepts the Module ID and result with zero Tasks and no authored territory or routes
- AND ordinary, resolved imported, and non-pending imported Modules with zero Tasks remain invalid
- AND resolving territory requires Tasks under the same stable Module and provenance

#### Scenario: Unproven or structurally inconsistent compatibility is rejected

- GIVEN a Session is newly authored, lacks immutable row-identifying provenance, or has inconsistent imported identifiers
- WHEN it requests legacy compatibility or pending territory
- THEN Radar rejects the row
- AND it does not create a compatibility exception or an eighth status

#### Scenario: Terminal imported history is globally non-authorizing

- GIVEN a provenance-verified imported Session has proven delivery or an explicit archive marker
- AND its exact safe Module paths resolve to any combination of current Zone and exact Cimiento owners, including one Zone, Zone plus Cimiento, multiple Zones, or Cimiento-only
- WHEN it omits execution Zone, route, and Session Cimientos while preserving paths, decisions, provenance, and delivery evidence
- THEN Radar MUST retain its existing terminal status and global completion contribution
- AND MUST exclude it from per-Zone progress, queues, routes, seats, capacity, execution ownership, creation permission, and future unused-rule justification
- AND MUST render the paths as historical non-authorizing evidence with their current partition owners
- AND an ordinary, unproven, complete-only without integrated delivery, open, deferred, pending, unsafe-path, symlink, authored-territory, or mismatched-delivery/provenance equivalent MUST retain its existing rules or fail validation

#### Scenario: Archived ownerless paths remain history only

- GIVEN a provenance-verified archived imported Session preserves exact safe Module paths
- AND every path is absent from the candidate tree and has no current partition owner
- WHEN Radar validates and renders the Session without a Zone, route, or Cimiento
- THEN Radar MUST preserve its global `ARCHIVADO` contribution and label the paths as historical evidence with no current owner
- AND MUST exclude the Session from every Zone progress, scheduling, ownership, seat, and capacity surface
- AND complete-but-not-archived, open, deferred, pending, unproven, tracked ownerless, currently owned, mixed owned/ownerless, unsafe, absolute, traversal, glob, directory, or authored-territory equivalents MUST fail closed unless the existing historical multi-Zone contract independently applies

### Requirement: Territory-pending compatibility is unschedulable

A territory-pending imported Session MUST have immutable migration provenance and an unresolved escalating decision that derives `BLOQUEADO` at `criterios` or `primer-modulo`. While territory is pending, it MUST declare no Zone, path, route, Cimiento, ownership, queue position, seat, or capacity contribution. Radar MUST reject any such declared or fabricated territory or scheduling value and MUST exclude the Session from Zone queues, ownership output, seat assignment, and capacity calculations.

Supplying validated Zone and path ownership MUST end territory-pending compatibility without changing the imported legacy Session identifier. The resolved Session MUST then satisfy the ordinary applicable Zone, path, route, Cimiento, ownership, queue, seat, and capacity rules.

#### Scenario: Pending territory has no schedulable footprint

- GIVEN a proven imported Session has an unresolved escalating decision reaching `criterios` or `primer-modulo`
- WHEN it declares territory pending without any Zone, path, route, or Cimiento
- THEN Radar derives `BLOQUEADO` from the decision
- AND the Session appears in no Zone queue, ownership result, seat assignment, or capacity calculation
- AND any fabricated territory or scheduling value fails validation

#### Scenario: Validated territory resolves compatibility without identity change

- GIVEN a territory-pending imported Session with a preserved legacy identifier
- WHEN validated Zone and path ownership are supplied
- THEN territory pending ends
- AND the Session retains the identical legacy identifier
- AND Radar applies the ordinary territory and scheduling rules

### Requirement: Field, evidence, and derived-state preservation

For every inventoried Session, the migration MUST preserve or explicitly ledger the source, scope, dependencies, authority, decisions, binary acceptance criteria, route evidence, delivery evidence, outstanding work, and replacement lineage. A value that Radar derives MUST be compared as evidence and MUST NOT be copied as authored status, queue position, progress, capacity, or area. Delivery facts MUST use immutable full commit OIDs and immutable Git-object identities; mutable branch claims MUST NOT serve as proof.

#### Scenario: A derived legacy value is transformed honestly

- GIVEN a legacy Session whose prose declares a status or delivery claim
- WHEN equivalent target data is prepared
- THEN authored target data contains only Radar-supported source facts
- AND the ledger records how Radar-derived output compares with the legacy value
- AND a delivery claim is supported by an integrated full commit OID or is recorded as unresolved

### Requirement: Approved open-work mapping

The 24 open Sessions MUST use the later approved assignment authority and MUST map according to validated declared file territory, not former Plan grouping. `S2.10` and `S9.2` MAY use territory-pending compatibility only when they satisfy the proven legacy compatibility and territory-pending requirements. The migration MUST NOT invent a Zone, paths, Cimiento reservation, route, ownership, queue position, seat, or available capacity to make either Session schedulable.

#### Scenario: Approved unknown-territory rows remain unschedulable

- GIVEN `S2.10` or `S9.2` has no validated territory
- WHEN the candidate plan is checked and status is derived
- THEN it satisfies the territory-pending compatibility contract or fails validation
- AND it has no fabricated territory, ownership, queue position, seat, or capacity contribution
- AND activation fails if the candidate represents it as safely runnable

### Requirement: Complete Zone and Cimiento partition

The candidate plan MUST partition the tracked files of its immutable candidate tree with zero orphaned files and zero unintended Zone overlaps. It MUST define a dedicated `metodo` Zone that owns the complete `agent-workflows/` subtree, except explicit valid exact-file Cimiento carve-outs. Cimientos MUST be explicit shared-terrain rules and per-Session Cimiento reservations MUST be exact paths; neither MUST conceal a genuine Zone overlap.

An exact Zone route for an absent future file MAY count as explained only when an open Session explicitly declares that identical safe exact Module path in the same approved Zone. This exception MUST NOT accept patterns, directories, Cimientos, unreserved paths, terminal Sessions, or a Session in another Zone. Ordinary tracked-file ownership and every other unused-rule check MUST remain unchanged.

#### Scenario: Exact future territory remains bounded

- GIVEN an open Session declares an approved Zone and an exact safe Module path that does not yet exist
- WHEN the partition declares that identical exact path for the same Zone
- THEN Radar treats only that exact rule as explained future territory
- AND a pattern, directory, Cimiento, unreserved path, terminal Session, or mismatched Zone remains unused or invalid

#### Scenario: Candidate partition covers the embedded method subtree

- GIVEN the tracked-file inventory of the immutable candidate tree
- WHEN partition validation runs
- THEN every tracked file belongs to exactly one Zone or an explicit valid Cimiento rule
- AND `agent-workflows/` is owned by `metodo` except recorded exact-file carve-outs
- AND no unintended overlap or orphan is reported

### Requirement: Noncanonical preparation and canonical-path exclusion

Before activation, all target plan data, generated-view candidates, inventories, ledgers, archives, and proof material MUST use noncanonical preparation locations or isolated proof materialization. `openspec/plan.yaml` and `openspec/ROADMAP.md` MUST be absent from the active worktree and every reachable pre-activation commit. Legacy planning views MUST remain the active authority before activation.

#### Scenario: Prepared candidate cannot be mistaken for the live contract

- GIVEN migration preparation is in progress
- WHEN any pre-activation commit and active worktree are inspected
- THEN neither canonical target path exists
- AND no generated target view claims current authority
- AND legacy views remain active and editable planning authority

### Requirement: Historical archive fidelity

The migration MUST create a version-controlled, clearly historical, read-only archive under `openspec/archive/legacy-planning/` at activation. The archive MUST retain byte-faithful retired legacy views and all non-representable narrative. Its inventory MUST record each archived source path, content identity, classification, and canonical target mapping or explicit archive-only reason. Historical references MUST remain intact unless an active guidance reference requires cutover.

#### Scenario: Non-representable narrative remains recoverable

- GIVEN legacy material cannot be represented by the Radar v3 schema
- WHEN activation archive contents are inspected
- THEN the original material is readable from the historical archive
- AND its source path and content identity are recorded
- AND its inventory row states its target mapping or archive-only reason

### Requirement: Deterministic generated ROADMAP

The migration MUST generate the candidate ROADMAP only with Radar from the candidate plan and immutable candidate Git evidence. The output MUST carry Radar's generated/do-not-edit notice and MUST NOT be hand-authored or manually repaired. `radar check`, `radar status`, `radar zonas`, and `radar render` MUST succeed against the same materialized candidate tree. Repeated rendering with identical plan bytes and Git evidence MUST produce byte-identical output.

#### Scenario: Repeated candidate rendering converges

- GIVEN the same candidate tree, plan bytes, and fixed Git evidence
- WHEN Radar renders the candidate ROADMAP twice
- THEN both output byte sequences are identical
- AND each output is generated by Radar and includes the do-not-edit notice
- AND no manually edited output is accepted as evidence

### Requirement: Documentation-close and guidance cutover

At activation, effective documentation-close behavior and active repository guidance MUST recognize `openspec/plan.yaml` as the planning source, retain `.doc-guard.json` direct-push semantics, and support both a real plan-data closure and an honest nothing-to-record delivery. The migration MUST NOT rewrite immutable historical evidence solely to remove legacy paths. The new behavior MUST NOT activate before full equivalence.

#### Scenario: Close behavior is coherent after activation

- GIVEN the proven activation candidate
- WHEN documentation-close behavior is exercised for a delivery that closes planned work and for one that closes none
- THEN the first accepts required plan-data recording
- AND the second accepts the explicit honest nothing-to-record path
- AND direct-push policy remains effective

### Requirement: Immutable equivalence evidence

Before activation, the migration MUST record a versioned immutable evidence manifest for one source snapshot and one complete candidate tree. The manifest MUST include source commit OID; candidate tree OID; content identities for candidate plan, candidate ROADMAP, and archived sources; complete Session and replacement ledgers; compatibility proof for provenance, identifier preservation and validation, territory-pending blocking, scheduling exclusion, resolution, and rejection; partition proof; derived-state comparison; Radar command results; render determinism proof; and close-gate proof. Each legacy-to-target difference MUST be approved, evidence-based, or activation-blocking.

#### Scenario: Candidate proof is complete

- GIVEN an activation candidate is proposed
- WHEN the equivalence gate evaluates its manifest
- THEN every required evidence category is present and bound to the same candidate tree OID
- AND all Sessions are accounted for exactly once
- AND every difference has an approved transformation or immutable-evidence explanation
- AND a missing, mutable, contradictory, or mismatched record fails the gate

### Requirement: Atomic activation and no mixed state

Activation MUST be exactly one direct commit whose tree OID equals the proven candidate tree OID. That commit MUST introduce `openspec/plan.yaml` and the proven `openspec/ROADMAP.md`, activate guidance and close-gate behavior, and retire legacy active views into the historical archive together. Activation MUST occur only after all equivalence, partition, Radar, archive, and cutover gates pass. The system MUST NOT support a state with only one canonical target path, active legacy views competing with the target, or unproven canonical bytes.

#### Scenario: Activation tree matches the proof

- GIVEN all activation gates have passed for a proven candidate tree
- WHEN the final staged tree is examined immediately before activation
- THEN its tree OID exactly equals the proven candidate tree OID
- AND the activation commit contains both canonical target paths and the complete cutover
- AND any byte difference invalidates the proof and blocks activation

### Requirement: Reviewable preparation and constrained delivery

Before any migration inventory row, mapping data, candidate plan data, archive data, or other migration data is prepared, the approved Radar compatibility contract MUST be implemented and tested as one separate, independently reviewable, revertible code-and-test work unit of no more than 400 authored changed lines. That work unit MUST pass its focused compatibility tests and MUST change only the Radar schema, validation, and derived scheduling behavior required by the proven legacy compatibility and territory-pending requirements. All unrelated Radar schema, validation, rendering, runtime, status, decision-class, and Zone/Cimiento behavior MUST remain out of scope.

After that prerequisite passes, preparation MUST remain local on `feat/s0.4-plan-zones-migration` and be decomposed into independently verifiable, revertible direct commits with no more than 400 authored changed lines each. Generated output MUST remain included in candidate identity even when it is not authored prose. No commit, push, canonical target creation, legacy retirement, migration data, archive, or staging plan is permitted by this specification phase itself.

#### Scenario: Compatibility precedes migration data

- GIVEN no migration data has been prepared
- WHEN the first migration implementation work unit is reviewed
- THEN it contains only the bounded Radar compatibility code and focused tests
- AND it has no more than 400 authored changed lines
- AND its tests pass before any migration data is prepared
- AND it changes no unrelated Radar/schema/runtime behavior

#### Scenario: Preparation remains reviewable and dormant

- GIVEN pre-activation migration work is reviewed after the compatibility prerequisite passes
- WHEN a preparation commit is inspected
- THEN it is local, independently revertible, and within the authored-line limit
- AND it exposes neither canonical target path nor legacy retirement
- AND this specification-only change has created no migration data, archive, staging plan, code, test, commit, or push

### Requirement: Complete rollback

A failed pre-delivery activation MUST be abandoned by restoring the activation parent so legacy authority remains active and canonical target paths remain absent. A delivered activation failure MUST be recovered by a new conventional revert commit that restores the complete legacy-active contract, removes both canonical target paths, restores prior active guidance and close behavior, and leaves immutable evidence recoverable from Git history. The migration MUST NOT repair failure by hand-editing ROADMAP content or retaining a partial target contract. Changed bytes MUST require a newly proven candidate tree.

#### Scenario: Post-delivery failure is reverted as a whole contract

- GIVEN post-delivery readback detects a proof mismatch, missing lineage, invalid partition, unreadable archive, Radar divergence, or invalid close behavior
- WHEN rollback is performed
- THEN a revert commit restores the legacy-active contract and removes both canonical target paths
- AND immutable evidence remains recoverable from Git history
- AND a later attempt requires a new candidate identity and complete equivalence proof

### Requirement: Scoped provisional formalization

Only proven imported `S12.3` and `S12.4` MAY use territory-pending compatibility under
human approval 10433. Each MUST preserve its frozen source provenance and record an
unresolved migration-only `escala` of class `contrato-visible` reaching `criterios`.
Neither row MAY author Zone, route, Cimientos, reservation, Module routes, ownership,
queue, seat, capacity, execution authority, or resolution of historical questions.
S12.4's source hold remains limited to M12.4.2 and unresolved.

### Requirement: Proven deferred design decomposition

Only an immutable-provenance imported Session MAY retain zero Modules and Tasks when
its proposed route is exactly `design-tasks`, its frozen source proves that
`session-plan` explicitly deferred the complete decomposition, and it preserves one
complete unresolved `escala` reaching `primer-modulo`. This compatibility MUST reject
ordinary/authored rows, missing or forged provenance/deferment evidence, `direct` or
`full-sdd`, terminal rows, incomplete or resolved decisions, and any revalidation or
execution attempt that still lacks the decomposition. It grants no territory,
resources, execution authority, successors, or relaxation of identifier/partition
controls. Terminal-history paths retain their existing compatibility rules.

#### Scenario: Deferred imported design remains non-executable

- GIVEN a proven imported S12.7-like deferred `design-tasks` row with zero Modules/Tasks
- WHEN Radar validates it before kickoff
- THEN it accepts only the frozen deferment and complete first-Module blocking decision
- AND kickoff/design MUST add concrete Modules/Tasks and a current-HEAD revalidation
  before the ordinary execution contract can pass

### Requirement: S12.9 route-bound deferred full SDD

The exact immutable S12.9 signature MAY retain zero Modules/Tasks only with `full-sdd`;
route mismatch, ordinary/forged, terminal/delivery/revalidation, incomplete, or resolved
variants MUST fail. It grants only unready planning, preserving the authorial
`source_commit` and revision-2-versus-neighbor-file decisions until SDD resolves them.

## Historical compatibility additions

### Requirement: Bounded full-fidelity activation partition

The activation candidate MUST contain exactly 85 records: 74 full Session records comprising the immutable 72-Session imported prefix plus separately planned and approved `S100` and `S101`; seven future-successor references `S102`–`S108`; and four immutable satisfied-history references `S1.9`, `S1.10`, `S2.4`, and `S8.10`. It MUST NOT represent this contract as 81 fully materialized Sessions.

`S100` and `S101` selection MUST use only the exact order of `lineage.required_successors` and horizon ceiling two. Selection MUST NOT supply route, criteria, decisions, Tasks, readiness, or execution authority. Their complete Session contracts remain a required later planning-and-approval gate; this reference-contract unit MUST NOT invent them.

#### Scenario: Horizon selects without planning future work

- GIVEN the approved ordered successor lineage and horizon ceiling two
- WHEN the candidate selects the materialized successor horizon
- THEN it selects only the first two entries, `S100` and `S101`
- AND no route, criteria, decision, Task, readiness, or execution authority is inferred from selection

### Requirement: Typed references are closed, unique, and non-executable

Reference identity MUST be unique across full Sessions, future-successor references, and satisfied-history references. Each reference MUST have exactly one approved type and only its closed required content: identity, type, rendering reason, and immutable evidence; a future-successor reference additionally preserves only the exact approved result, Zone, dependencies, Cimientos, `reemplaza`, and immutable assignment authority. Unknown, mixed-type, duplicate, incomplete, or extra-content references MUST fail validation.

A future-successor reference MAY close only its recorded structural lineage. It MUST NOT establish readiness, execution, ownership, queue position, seat, capacity, progress, completion, or dependency satisfaction for executable ordinary work.

A satisfied-history reference MUST carry immutable source commit, blob, path, and section evidence. It MAY satisfy a structural dependency only when a provenance-proven imported legacy Session's frozen source contains that exact dependency edge. It MUST NOT provide authority, readiness, execution, ownership, progress, completion, or ordinary/new-Session dependency satisfaction.

#### Scenario: Valid typed references retain history without work authority

- GIVEN a complete unique future-successor reference and a complete immutable satisfied-history reference
- WHEN Radar validates and renders them
- THEN the future reference preserves only its approved successor facts and structural lineage
- AND the satisfied-history reference is usable only for its proven imported frozen-source edge
- AND neither reference creates executable work or completion credit

#### Scenario: Mixed or unproven references fail closed

- GIVEN a reference with an unknown type, duplicate identity, mixed payload, omitted required evidence, or executable-state claim
- WHEN Radar validates the candidate
- THEN validation fails
- AND no queue, readiness, authority, capacity, progress, or completion result is produced from that reference

### Requirement: References remain outside operational projections

All references MUST be excluded from Session-status derivation and all operational calculations, including Zone progress, work queues, capacity, seats, ownership, readiness, execution, and completion. `radar status` and `radar render` MUST expose them only in a separately labeled non-executable reference listing that shows type, immutable provenance, and reason, never with a Session status or operational effect.

#### Scenario: Reference rendering does not change operational state

- GIVEN a candidate containing both approved reference classes
- WHEN `radar status`, Zone progress, queues, capacity, and `radar render` output are produced
- THEN each reference appears only in a separately labeled non-executable reference listing with type, provenance, and reason
- AND neither reference receives a Session status or changes an operational projection

### Requirement: Successor preservation and partition proof are exact

Across `S100`, `S101`, and references `S102`–`S108`, the verifier MUST preserve each of the nine approved successor records exactly once, including result, Zone, dependencies, Cimientos, `reemplaza`, immutable assignment authority, originals, and affected dependency edges. It MUST reject work loss, double count, overlap, reorder, kind drift, invented records, and missing records.

The proof verifier MUST accept the immutable 72-Session prefix only with the exact 74-full-Session/seven-future-reference/four-satisfied-history-reference partition. Final `radar check`, `radar status`, `radar zonas`, and render evidence MUST report zero errors and zero warnings against one candidate tree, and repeated render plus tree proof MUST remain deterministic.

#### Scenario: Partition proof rejects a changed activation representation

- GIVEN the immutable 72-Session prefix and the approved 74/7/4 partition
- WHEN a verifier observes a missing, added, reordered, overlapping, or wrong-kind record
- THEN it rejects the candidate
- AND activation remains blocked until the exact partition and deterministic zero-warning proof pass

### Requirement: Existing dormant and deferred safeguards remain unchanged

The current candidate MUST remain dormant and noncanonical until the existing atomic activation gate passes. This addition MUST NOT resolve S12.9's source-commit or revision-2-versus-neighbor-file decisions, weaken full-fidelity preservation, alter rollback obligations, or expand any existing non-goal.
