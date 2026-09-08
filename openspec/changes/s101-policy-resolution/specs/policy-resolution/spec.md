# Policy Resolution Specification

## Purpose

Define the migration-data append and structural-validation contract that materializes `S101` in the dormant candidate. This change does not design, decompose, implement, or test future runtime behavior.

## Requirements

### Requirement: Planning-only single append

The later apply for this change SHALL append exactly one complete `S101` Session contract to `openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml`. It SHALL modify no other existing migration, plan, runtime, test, Tower, Herdr, database, delivery, commit, push, or PR surface. This specification phase SHALL not append the Session, mutate runtime behavior, or execute runtime tests.

#### Scenario: One bounded candidate mutation

- GIVEN the dormant candidate contains no full `S101` Session contract
- WHEN this change is later applied
- THEN exactly one complete `S101` contract is appended to the candidate path
- AND no runtime or test surface is modified or executed

### Requirement: Complete S101 contract at full-sdd route depth

The appended contract SHALL preserve exactly `id: S101`; result `Resolución de política: prepare_through opaco y horizon_ceiling salen de la política resuelta`; Zone `capacidades`; dependency `[S100]`; Cimientos `[]`; resource claims `[]`; and replacement `[S5.14]`. It SHALL include immutable assignment and migration-lineage authority, closed decisions with their authority and falsifiers, binary acceptance criteria, proposed route `full-sdd`, kickoff revalidation as `full-sdd` with its immutable Git-base and Engram `10536` provenance, and provenance for the imported predecessor, replacement edge, current proposal, and revalidation.

Because `ruta.propuesta` is `full-sdd`, the complete candidate contract SHALL declare exactly `modulos: []`. This is the complete route-depth contract required by `agent-workflows/tools/radar/check.go:514-524`; it SHALL NOT contain candidate Modules or Tasks. Future runtime API, design, Module, and Task decomposition SHALL be created only after migration activation by execution of S101's declared `full-sdd` route.

#### Scenario: G1-compatible full-sdd depth

- GIVEN S101 is prepared as a complete candidate Session with proposed route `full-sdd`
- WHEN its identity, authority, dependencies, decisions, criteria, route evidence, provenance, and technical decomposition are structurally validated
- THEN every required complete-at-route-depth field is present with the approved values
- AND `modulos` is exactly `[]`
- AND a non-empty `modulos` collection fails structural validation as incompatible with `full-sdd` and G1

### Requirement: Closed product boundaries recorded without runtime predesign

The S101 candidate contract SHALL record only high-level future acceptance boundaries: `S100` owns the optional schema declaration for `planning.prepare_through`; `S101` owns policy and Jornada resolution in Zone `capacidades`; and `S102` owns continuation consumption and removal of continuation literals. It SHALL record `TAREAS` as the only declared `prepare_through` value, with consumers treating the resolved value as opaque; `horizon_ceiling: 2` as a count of Sessions rather than Modules; and absent, malformed, invalid, or contradictory policy as fail-closed with `resolved: false`, code `CT_POLICY_UNRESOLVED`, restrictive planning values, and a non-empty stable named reason. Main SHALL retain sole assignment and dispatch authority.

This change's specification SHALL govern migration-data append and structural validation only. It SHALL NOT define exact future runtime APIs, data shapes, files, tests, implementation design, Modules, or Tasks.

#### Scenario: Product boundaries remain high-level and closed

- GIVEN the S101 candidate contract is reviewed before migration activation
- WHEN its decisions and binary acceptance criteria are inspected
- THEN the S100, S101, and S102 ownership boundaries and all listed policy outcomes are recorded as closed
- AND Main authority is unchanged
- AND no future runtime API or technical decomposition is present

### Requirement: Preserve horizon, partition, and G1 order

`S100` SHALL be treated as an already-materialized candidate-data dependency, not runtime work that must execute before migration activation. `S102` SHALL remain a future-successor reference dependent on `S101`; it SHALL not be materialized within the approved two-Session horizon. After the single append, the dormant candidate SHALL contain exactly 74 full Sessions, seven future-successor references, and four satisfied-history references.

`G1` SHALL remain the next mandatory, read-only complete-candidate verification after structural validation of the append. Apply SHALL NOT run or bypass `G1`; `C06` through `C09` SHALL remain unavailable until `G1` passes. Future runtime implementation SHALL begin only after migration activation through S101's declared `full-sdd` route.

#### Scenario: Candidate is ready for G1 without advancing runtime work

- GIVEN the single S101 append has completed successfully
- WHEN the candidate partition and activation sequence are evaluated
- THEN the candidate contains exactly the 74/7/4 partition
- AND S102 remains a future-successor reference
- AND G1 is the next gate while C06 through C09 and runtime implementation have not started

### Requirement: Structural validation, bounded review, and rollback

Apply SHALL validate the appended mapping against the exact S101 bindings, complete-at-route-depth fields, literal `modulos: []`, ownership boundaries, future-reference preservation, and the 74/7/4 partition before handoff to G1. The append SHALL remain below 400 authored changed lines and SHALL be independently reversible.

Before an append, rollback SHALL remove only this change's SDD artifacts. After an append and before activation, rollback SHALL remove only the contiguous S101 mapping and restore the exact prior 73 full Sessions, seven future-successor references, and four satisfied-history references. Rollback SHALL NOT modify S100, S102, lineage, imported Sessions, references, proof tooling, runtime, tests, or validation rules.

#### Scenario: Structural failure restores the bounded checkpoint

- GIVEN the S101 append has occurred and structural validation or G1 fails before activation
- WHEN the bounded append is rolled back
- THEN only the appended S101 mapping is removed and the candidate returns to the 73/7/4 checkpoint
- AND no runtime repair, activation, validator change, or unrelated migration mutation occurs
