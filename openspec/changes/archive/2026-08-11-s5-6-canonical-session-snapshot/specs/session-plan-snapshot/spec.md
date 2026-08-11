# Session Plan Snapshot Specification

## Purpose

Define one versioned, deterministic, read-only contract for deriving a canonical Session plan snapshot from exact planning-document bytes. The keywords MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as described by RFC 2119.

## Requirements

### Requirement: Snapshot identity binds the exact source bytes

A `session-plan-snapshot-v1` result MUST be bound to the exact supplied plan bytes and to the value produced by `digestArtifact(planBytes, "raw-bytes")`. The binding MUST be verifiable from the same bytes. The parser MUST reject invalid text encoding, a caller-supplied digest that differs from the computed raw-bytes digest, or any attempt to validate a previous snapshot against changed bytes. It MUST NOT substitute a digest of parsed or normalized content for the raw-bytes digest.

#### Scenario: Exact bytes produce a verifiable identity

- GIVEN valid plan bytes and a requested Session ID declared exactly once in those bytes
- WHEN a snapshot is produced
- THEN the snapshot source identity matches `digestArtifact(planBytes, "raw-bytes")`
- AND the identity verifies against those exact bytes.

#### Scenario: One-byte drift invalidates the binding

- GIVEN a snapshot bound to one plan document
- WHEN any source byte changes, including whitespace or line endings
- THEN the previous snapshot fails source-identity verification
- AND no replacement snapshot is accepted under the previous digest.

#### Scenario: A claimed digest is inconsistent

- GIVEN valid plan bytes and a claimed digest that was not computed from those exact bytes in raw-bytes mode
- WHEN snapshot creation or validation is requested
- THEN the request fails closed
- AND no snapshot is returned.

#### Scenario: Source text is not validly decodable

- GIVEN bytes that cannot be decoded as the required planning-document text
- WHEN parsing is requested
- THEN parsing fails closed before Session fields are emitted
- AND no partial snapshot is returned.

### Requirement: Target selection and graph representation are deterministic and closed

The parser MUST distinguish two source-declared identity domains:

- A **plan-local Session record** is a uniquely headed Session section in the supplied bytes. Only a plan-local record MAY be selected as the target or emitted as candidate execution data, and every emitted plan-local record MUST satisfy the complete execution-field requirement below.
- A **graph reference node** is a uniquely declared node in the dependency graph contained in the supplied bytes. It is sufficient to close graph edges and MAY identify an external Session that has no plan-local section in this document. A graph-only node MUST remain reference-only and MUST NOT be promoted into a target or candidate execution record.

The parser MUST select a target by an explicit Session ID and MUST find exactly one matching plan-local Session record. It MUST represent the uniquely declared graph nodes and dependency edges needed to close the document's Session graph. Repeated use of one node ID as an edge endpoint is not a duplicate declaration; multiple or conflicting declarations for that node ID are ambiguous and MUST fail closed. Every dependency edge endpoint and dependency reference MUST resolve to a unique graph node. When one ID appears in both domains, the identities MUST be consistent. Identical source bytes and the same target ID MUST select the same plan-local target and graph.

#### Scenario: One plan-local target resolves

- GIVEN valid plan bytes containing one headed plan-local record for the requested Session ID
- WHEN the parser selects the target
- THEN the snapshot identifies that exact plan-local record as the target
- AND graph nodes and edges come only from the supplied bytes.

#### Scenario: Plan-local target is absent or duplicated

- GIVEN plan bytes where the requested Session ID has no headed plan-local record or has more than one such record
- WHEN parsing is requested
- THEN target selection fails as ambiguous or unresolved
- AND no snapshot is returned.

#### Scenario: External graph-only dependency closes an edge

- GIVEN a dependency edge whose external endpoint has one graph-node declaration but no plan-local Session section
- WHEN a plan-local target that depends on that node is parsed
- THEN the external ID is accepted as a graph reference
- AND it is not emitted as a target or candidate execution record.

#### Scenario: Graph node is missing or multiply declared

- GIVEN a dependency edge or dependency field whose endpoint has no graph-node declaration or has multiple conflicting graph-node declarations
- WHEN parsing is requested
- THEN graph closure fails closed
- AND no partial graph or snapshot is returned.

#### Scenario: Graph-only node receives no synthetic execution fields

- GIVEN one uniquely declared external graph node with no plan-local Session section
- WHEN the snapshot is produced
- THEN the node contains only graph-reference data present in the source
- AND `Área`, `Recurso`, `Decisiones`, criteria, and other execution fields are neither required nor synthesized for it.

#### Scenario: Identity is inconsistent across domains

- GIVEN a plan-local heading, execution field, or graph declaration that assigns incompatible identities to the same Session
- WHEN parsing is requested
- THEN the inconsistency is rejected
- AND no identity is inferred from document position or nearby prose.

### Requirement: The snapshot exposes the complete approved Session execution contract

For every plan-local Session record emitted as the target or candidate execution data, the snapshot MUST expose its identity, one status from the approved closed vocabulary, declared dependencies, `Área`, `Recurso`, `Decisiones`, every binary acceptance criterion, and every explicit semantic-contamination reference present in that record. These execution requirements MUST NOT be applied to graph-only reference nodes. Required plan-local fields MUST NOT be completed from defaults, surrounding narrative, Engram, runtime state, graph labels, or another artifact. An explicitly declared empty value MAY be represented as an empty canonical collection only when the plan-local source contract permits that value.

For plan-local execution records, the supported status vocabulary is exactly `PLANIFICADO`, `LISTO`, `EN CURSO`, `BLOQUEADO`, `DIFERIDO`, `COMPLETO`, and `ARCHIVADO`, with the approved display marker treated as part of source validation where present. A graph-only label or marker MUST NOT be promoted into a plan-local execution state.

#### Scenario: Complete plan-local Session contract is preserved

- GIVEN a valid plan-local target with state, dependencies, `Área`, `Recurso`, `Decisiones`, binary criteria, and semantic contamination
- WHEN its snapshot is produced
- THEN every approved execution field is represented from the headed source section
- AND no undeclared field is synthesized.

#### Scenario: A required plan-local field is missing or partial

- GIVEN a target or emitted candidate plan-local record whose required execution field is absent, truncated, or structurally incomplete
- WHEN parsing is requested
- THEN parsing fails closed
- AND no snapshot with defaulted or omitted semantics is returned.

#### Scenario: Plan-local status is outside the closed vocabulary

- GIVEN a plan-local execution state that is translated, combined, legacy, or otherwise outside the seven approved values
- WHEN parsing is requested
- THEN the state is rejected
- AND no snapshot is returned.

#### Scenario: Duplicate plan-local execution fields disagree

- GIVEN duplicate `Área`, `Recurso`, `Decisiones`, dependency, state, or criteria declarations for one plan-local record
- WHEN the duplicates are ambiguous or inconsistent
- THEN parsing fails closed
- AND the parser does not choose one by ordering.

### Requirement: Decisions, binary criteria, and semantic contamination are strict

Every decision in an emitted plan-local execution record MUST be classified as `derivable` or `escala`. A `derivable` decision MUST preserve its declared authority and falsifiable criterion. An `escala` decision MUST preserve its declared class and explicit `Contamina:` Session IDs when semantic contamination is declared. Binary acceptance criteria MUST preserve their observable text and binary checked state; prose that is not an acceptance checkbox MUST NOT be promoted to a criterion. Each semantic-contamination ID used by an emitted plan-local record MUST resolve uniquely to an explicit plan-local Session ID or graph reference node in the supplied bytes, and MUST be consistent when present in both domains. An ID absent from both domains, duplicated in its resolving domain, or available only from narrative or runtime evidence MUST fail closed.

#### Scenario: A derivable decision is well formed

- GIVEN a `derivable` decision with declared authority and a falsifiable criterion
- WHEN the Session is parsed
- THEN both fields are preserved in the canonical decision representation.

#### Scenario: An escalating decision carries semantic contamination

- GIVEN an `escala` decision with a declared class and explicit `Contamina:` Session IDs
- WHEN the Session is parsed
- THEN the classification, class, and exact resolved contamination references are preserved
- AND no additional contaminated Session is inferred.

#### Scenario: A decision is malformed

- GIVEN an unknown decision classification, a derivable decision missing authority or criterion, or an escalating decision missing required class data
- WHEN parsing is requested
- THEN the decision and complete snapshot are rejected
- AND no best-effort decision record is emitted.

#### Scenario: Criteria or contamination are malformed

- GIVEN a non-binary criterion, duplicate ambiguous criterion, malformed `Contamina:` declaration, or contamination ID absent from both the plan-local and graph-node domains
- WHEN parsing is requested
- THEN parsing fails closed
- AND no partial criteria or contamination collection is returned.

### Requirement: The contract uses the canonical schema-validation boundary

`session-plan-snapshot-v1` MUST be published in the canonical schema registry, MUST be validated through the shared validation entry point, and MUST have cross-field invariants that enforce source identity, unique plan-local IDs, unique graph-node declarations, a plan-local target, closed graph edges, reference-only graph nodes, and consistency between emitted execution records, decisions, criteria, and contamination. The shared valid/invalid fixture set MUST exercise both plan-local records and external graph-only nodes. Schema validation MUST reject undeclared fields unless the contract explicitly permits a namespaced extension.

#### Scenario: A valid snapshot follows the canonical path

- GIVEN a valid `session-plan-snapshot-v1` payload
- WHEN the canonical validator is invoked by its registered schema name
- THEN schema and cross-field validation succeed
- AND the validated value preserves the canonical snapshot semantics.

#### Scenario: Registry or invariant coverage is absent

- GIVEN a schema file without its canonical registry entry, shared fixture coverage, or required cross-field invariant
- WHEN contract completeness is checked
- THEN the contract is considered incomplete
- AND S5.6 cannot satisfy its acceptance criteria.

#### Scenario: Cross-field identity or reference data disagree

- GIVEN a schema-valid payload whose target is graph-only, source digest is inconsistent, graph reference is unresolved, graph-only node carries synthetic execution data, or plan-local decision, criterion, or contamination disagrees across fields
- WHEN canonical validation runs
- THEN invariant validation fails closed
- AND the validator returns no accepted snapshot.

### Requirement: One parser is deterministic and source-isolated

For the same exact bytes and target ID, the parser MUST produce byte-identical canonical snapshot output and the same digest on every supported run. `contracts/session-plan-snapshot.mjs` SHALL be the sole canonical planning-Markdown parser for this contract. The conforming change MUST NOT import, modify, wrap, copy, or behaviorally duplicate the private parser in `continuation/**`. The parser MUST NOT read Engram, narrative fallback artifacts, defaults outside the supplied bytes, DB state, Tower state, or runtime stores.

#### Scenario: Repeated parsing is deterministic

- GIVEN identical source bytes and the same requested Session ID
- WHEN parsing is repeated
- THEN the canonical snapshot bytes and snapshot digest are identical.

#### Scenario: External narrative disagrees

- GIVEN valid source bytes and an Engram record or other artifact that claims different Session data
- WHEN parsing is requested
- THEN the snapshot reflects only the supplied bytes
- AND the external claim is neither read nor used as fallback.

#### Scenario: Required source data is absent but available elsewhere

- GIVEN source bytes missing a required field and a runtime or narrative source that contains a plausible value
- WHEN parsing is requested
- THEN parsing fails closed
- AND the missing value is not completed from that source.

#### Scenario: A second planning parser is introduced

- GIVEN a candidate change that imports, modifies, copies, or recreates the `continuation/**` parser for this contract
- WHEN scope and conformance are inspected
- THEN the candidate is non-conforming
- AND it MUST NOT be accepted as S5.6.

### Requirement: Parsing and validation are read-only on every outcome

Snapshot parsing and validation MUST be pure with respect to repository and runtime state. Success and rejection MUST NOT modify the plan document, DB, WAL, SHM, Tower state, Engram, continuation state, main-store state, delivery state, or any other live artifact. Read-only witnesses MUST compare relevant bytes and state before and after both successful and rejected operations.

#### Scenario: Successful parsing mutates nothing

- GIVEN byte witnesses for the source plan and relevant persistent/runtime state
- WHEN valid bytes are parsed and validated
- THEN all witnesses remain unchanged.

#### Scenario: Rejected parsing mutates nothing

- GIVEN the same witnesses and invalid, ambiguous, or drifted input
- WHEN parsing or validation rejects the input
- THEN all witnesses remain unchanged
- AND no recovery write or partial snapshot is persisted.

### Requirement: Compatibility is additive and ownership remains bounded to S5.6

The new contract MUST be additive: existing registered schemas, validators, canonical digests, and continuation behavior MUST remain compatible. S5.6 MUST NOT adopt the snapshot in runtime or implement parked-decision/response contracts, selected-option persistence, authorization transitions, parked ledgers, contamination evaluation, option selection, or resume behavior. Those responsibilities remain with S5.7, S5.8, and S5.5. The implementation and verification diff MUST remain within the S5.6 `Área` and MUST NOT touch a prohibited path. Conformance verification MUST pass `bun test test/contracts`, and the full `bun test` suite MUST introduce no failures.

#### Scenario: Existing contract behavior is preserved

- GIVEN payloads accepted or rejected by existing contract schemas before S5.6
- WHEN the new schema is registered
- THEN their observable validation results remain unchanged.

#### Scenario: A later-Session responsibility is requested

- GIVEN a request to persist a selected option, transition authorization, write a parked ledger, evaluate contamination, or resume work
- WHEN S5.6 capability boundaries are applied
- THEN the request is outside this capability
- AND the snapshot parser performs no such effect.

#### Scenario: Runtime adoption or prohibited-path change appears

- GIVEN a candidate that wires the snapshot into runtime or changes `continuation/**`, `escalation/**`, `main-store/**`, `core.mjs`, `mcp.mjs`, `delivery/**`, `openspec/plans/**`, or `openspec/specs/**`
- WHEN scope conformance is checked
- THEN the candidate is rejected as outside S5.6.

#### Scenario: Focused and full verification remain green

- GIVEN a candidate confined to the approved S5.6 paths
- WHEN `bun test test/contracts` and the full `bun test` suite run during implementation verification
- THEN the focused contract tests pass
- AND the full suite introduces no failures.

## Traceability

| Proposal or S5.6 criterion | Normative coverage |
|---|---|
| Exact bytes and raw-bytes digest; one-byte drift | Snapshot identity binds the exact source bytes |
| Graph plus plan-local `Área`, `Recurso`, `Decisiones`, criteria, and contamination | Target/graph domain distinction; complete plan-local execution contract; strict decision data |
| External graph-only dependencies without synthetic execution fields | Target selection and graph representation; canonical cross-field validation |
| Missing, duplicate, unresolved, partial, ambiguous, inconsistent data | Target/graph domain distinction; complete plan-local execution contract; strict decision data; canonical validation |
| No Engram, narrative, default, or runtime fallback | Complete execution contract; one parser is source-isolated |
| No continuation parser import, modification, or duplication | One parser is deterministic and source-isolated |
| Identical bytes produce identical canonical output and digest | Snapshot identity; one parser is deterministic |
| Registry, shared validation, invariant, and fixture coverage | Canonical schema-validation boundary |
| Read-only behavior on success and rejection | Parsing and validation are read-only |
| Additive compatibility and S5.7/S5.8/S5.5 non-goals | Compatibility is additive and ownership remains bounded |
| Focused/full tests and approved path scope | Canonical validation; read-only witnesses; bounded compatibility |
