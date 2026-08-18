# Parked Checkpoint Binding Specification

## Purpose

`parked-checkpoint-binding-v1` is the sole authoritative, immutable Main-store proof that a parked decision, its exact `parked.checkpoint`, canonical checkpoint capture, and canonical reconciliation in state `VALID` name one checkpoint.

## Requirements

### Requirement: Standalone versioned binding shape

The system MUST define `parked-checkpoint-binding-v1` as a standalone canonical record with no undeclared fields. Its complete shape MUST contain `schema: "parked-checkpoint-binding"`, `schema_version: 1`, `parked_decision_id`, `parked_decision_digest`, `parked_checkpoint`, `capture_checkpoint_id`, `capture_checkpoint_digest`, `reconciled_checkpoint_id`, `reconciled_checkpoint_digest`, `reconciliation_state`, `repository`, `project_id`, `assignment_id`, `generation`, `base_sha`, `result_sha`, and `binding_digest`. `reconciliation_state` MUST be exactly `VALID`. Each identity and digest MUST use the repository's canonical identifier, digest, and canonicalization conventions; `binding_digest` MUST cover every binding field except itself.

#### Scenario: Complete authoritative binding

- GIVEN producer-owned canonical parked-decision, capture, and reconciliation evidence for one checkpoint
- WHEN Main validates a binding candidate
- THEN it MUST accept only the complete versioned shape with all required identities, digests, state, and cross-binding values.

#### Scenario: Incomplete or noncanonical shape

- GIVEN a binding with a missing, unknown, malformed, or extensions-only required value
- WHEN it is validated
- THEN validation MUST fail closed and no binding MUST be persisted.

### Requirement: Seal only canonical producer-owned evidence

The system MUST seal a binding only while parking the decision and only after it obtains the producer-owned canonical checkpoint capture and producer-owned canonical reconciliation evidence. The capture and reconciliation identities and digests MUST be supplied by their canonical producers, not asserted, reconstructed, or substituted by a caller. The reconciliation evidence MUST be canonically valid and have state exactly `VALID` before any binding mutation becomes visible.

#### Scenario: Valid evidence is available at parking

- GIVEN the parking operation receives traceable canonical capture and canonical reconciliation evidence in state `VALID`
- WHEN all required bindings validate
- THEN Main MUST seal the binding during that parking operation.

#### Scenario: Evidence is unavailable or invalid

- GIVEN either canonical artifact is absent, untraceable to its producer, invalid, noncanonical, or has a state other than `VALID`
- WHEN parking attempts to seal a binding
- THEN it MUST fail closed with zero binding effects.

### Requirement: Parked decision and checkpoint are exact cross-bindings

The system MUST bind `parked_decision_id` and `parked_decision_digest` to the exact canonical parked decision, and `parked_checkpoint` to that decision's exact `checkpoint` value. The binding MUST reject any difference in the parked-decision identity, digest, or checkpoint value; comparable, normalized, or narratively equivalent text MUST NOT satisfy equality.

#### Scenario: Exact parked checkpoint

- GIVEN a canonical parked decision and a binding whose `parked_checkpoint` equals its exact `checkpoint`
- WHEN Main seals the binding
- THEN the persisted record MUST contain the exact parked-decision identity, digest, and checkpoint value.

#### Scenario: Checkpoint text differs

- GIVEN a binding whose checkpoint is normalized, paraphrased, or otherwise differs from the canonical parked decision's `checkpoint`
- WHEN sealing is requested
- THEN Main MUST reject it without mutation.

### Requirement: All evidence names the same execution identity

The system MUST require exact equality across the parked decision, canonical capture, and canonical reconciliation for repository, project, assignment, generation, base, and result. `repository` MUST equal the canonical repository identity of each artifact; `project_id`, `assignment_id`, `generation`, `base_sha`, and `result_sha` MUST each equal their corresponding canonical evidence values. The capture and reconciliation identities and digests MUST identify the exact evidence used for those comparisons.

#### Scenario: Fully cross-bound evidence

- GIVEN all three canonical artifacts carry equal repository, project, assignment, generation, base, and result values
- WHEN Main validates the binding
- THEN it MUST accept the cross-bindings only if every equality holds exactly.

#### Scenario: Any execution-identity mismatch

- GIVEN otherwise valid evidence with any repository, project, assignment, generation, base, result, identity, or digest mismatch
- WHEN Main validates or seals the binding
- THEN it MUST fail closed and leave no partial or replacement effect.

### Requirement: Main is the sole atomic writer

Only Main MUST create, persist, replay-check, or read authoritative bindings. Those operations MUST remain behind the existing Main authority check and use the existing canonical writer, lock, and transaction/atomic-write boundary. A shadow store, second writer, parallel transaction path, or authority carried only in `extensions` MUST NOT exist. All validation required for sealing MUST complete before a binding becomes visible, so a failed operation has zero partial effects.

#### Scenario: Unauthorized or split persistence attempt

- GIVEN a non-Main caller, a second writer, a shadow location, an extensions-only claim, or a failed pre-commit validation
- WHEN it attempts to create or alter a binding
- THEN the attempt MUST fail closed and the authoritative store bytes MUST remain unchanged.

### Requirement: Authoritative readback is keyed by parked decision identity

The Main store MUST provide dedicated authoritative readback by exact `parked_decision_id`. Readback MUST return the sealed standalone binding for that identity or fail closed when no such binding exists. It MUST NOT reconstruct a binding from other records, caller input, cached text, or a secondary store.

#### Scenario: Read persisted binding

- GIVEN Main has sealed one binding for a parked-decision identity
- WHEN an authorized readback requests that exact identity
- THEN it MUST return the persisted immutable binding.

#### Scenario: Missing or substituted identity

- GIVEN no binding exists for the requested parked-decision identity, or the request uses a different identity
- WHEN readback is requested
- THEN it MUST fail closed and MUST NOT infer or return another binding.

### Requirement: Immutability and canonical replay

A sealed binding MUST be immutable. A replay is idempotent only when the complete canonical binding is byte-identical to the persisted canonical record and all input identities and digests are exact. Any divergent replay, including a changed checkpoint, identity, digest, status, cross-binding, or byte, MUST fail closed with zero additional effect and MUST NOT replace the sealed binding.

#### Scenario: Exact canonical replay

- GIVEN the same complete canonical binding has already been sealed
- WHEN Main receives the byte-identical canonical replay
- THEN it MUST return the existing binding without another write, revision effect, or record.

#### Scenario: Divergent replay

- GIVEN a binding has already been sealed for a parked-decision identity
- WHEN Main receives any non-identical replay for that identity
- THEN it MUST reject the replay and preserve the existing bytes unchanged.

### Requirement: Noncanonical substitutes are excluded

Caller assertions, boolean claims, textual or narrative equivalence, local inference or parsing from S5.5, fabricated adapters, alternate capture/reconciliation routes, mutable replacement, and post-hoc reconstruction MUST NOT satisfy any provenance or cross-binding requirement. The system MUST consume canonical producer-owned evidence directly and MUST NOT modify its producers to manufacture that evidence within S5.9.

#### Scenario: Substitute provenance

- GIVEN a caller supplies an assertion, equivalent text, S5.5-derived value, parsed narrative, fabricated adapter output, or alternate evidence route
- WHEN it is offered as capture or reconciliation provenance
- THEN Main MUST reject it with zero effects.

### Requirement: Design falsifier blocks downstream work

Before Tasks or Apply, the design MUST demonstrate, within the approved implementation area, a trace from the existing parking operation to both producer-owned canonical capture and canonical reconciliation evidence while preserving their identities, digests, required cross-bindings, and `VALID` status. If that trace requires a forbidden-path change, producer modification, caller assertion, S5.5 inference/parsing, narrative reconstruction, fabricated adapter, or second evidence route—or cannot be demonstrated—the change status MUST be `BLOQUEADO`; no implementation tasks MAY be produced and no Apply work MAY begin. The missing producer capability MUST be escalated as a new prerequisite Sesión.

#### Scenario: Falsifier fails

- GIVEN design cannot trace the required producer-owned provenance without a forbidden change or fabricated adapter
- WHEN the design gate is evaluated
- THEN S5.9 MUST be `BLOQUEADO`, Tasks and Apply MUST stop, and the prerequisite MUST be escalated.

### Requirement: Scope and non-destructive rollback remain bounded

Implementation and verification MUST modify only `main-store/store.mjs`, `contracts/**`, `schemas/**`, `test/main-store.test.mjs`, `test/contracts/**`, and `test/fixtures/contracts/schema-cases-v1.json`. They MUST NOT modify `workspace/checkpoint.mjs`, `escalation/**`, `continuation/**`, `core.mjs`, `mcp.mjs`, `delivery/**`, or `openspec/specs/**`. Before a binding is sealed, rollback MAY revert S5.9 implementation changes. After sealing, rollback MUST be non-destructive: it MUST NOT rewrite or delete binding records, add cleanup writers or migrations, or weaken Main authority. A forbidden-path need or inability to preserve non-destructive rollback MUST block before Apply.

#### Scenario: Path-area and rollback acceptance

- GIVEN an implementation candidate or rollback plan
- WHEN its paths and effects are evaluated
- THEN it MUST remain in the approved area, preserve sealed binding bytes, and block rather than expand scope or destroy authoritative data.