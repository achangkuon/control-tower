# Control Tower Product Provenance Specification

## Purpose

Define the vocabulary, immutable evidence, migration, and coordination rules that split Installable V1 from Autonomous V2 without losing historical truth.

## Requirements

### Requirement: Immutable historical inputs and ArtifactRefs

The broad historical V1 documents and A–I/P6–P11 evidence MUST remain byte-for-byte immutable inputs. New V1/V2 documents MUST use exact source commits, raw-byte digests, and explicit `preserves`, `supersedes`, and migration relationships through revisioned ArtifactRefs.

#### Scenario: Narrowed contract creates a revision

- GIVEN a historical requirement is narrowed for Installable V1
- WHEN the new contract is published
- THEN the old artifact remains unchanged and the new ArtifactRef records its reason and trace

#### Scenario: Digest mismatch is rejected

- GIVEN a manifest references bytes different from its recorded digest
- WHEN provenance validation runs
- THEN validation fails and no canonical pointer is advanced

### Requirement: Canonical index, catalog, and manifest consistency

The master index, plan catalog, and plan manifest MUST identify the same active V1/V2 revisions, ArtifactRefs, dependency edges, and release lane. A pointer change MUST be revisioned and atomically checkable; rollback MUST restore prior canonical pointers without deleting historical artifacts.

#### Scenario: Publication is consistent

- GIVEN a new V1 or V2 revision is ready
- WHEN index, catalog, and manifest validation runs
- THEN all three resolve the same revision and complete mapping

#### Scenario: Canonical rollback preserves history

- GIVEN a newly published pointer is found invalid
- WHEN rollback is authorized
- THEN prior pointers are restored and both old and failed-new revisions remain auditable

### Requirement: Parallel ownership and checkpoints

Parallel workstreams MUST declare an owner, touched boundary, dependency checkpoint, and verification evidence before editing shared planning surfaces. Runtime implementation, V1 release work, and V2 reconciliation MUST remain separable; unowned edits to shared files MUST be rejected or paused for coordination.

#### Scenario: Independent lanes proceed safely

- GIVEN V1 lifecycle and V2 mechanism work use different declared boundaries
- WHEN both produce revisions
- THEN each revision verifies its dependencies without rewriting the other lane's artifacts

#### Scenario: Shared-file conflict is detected

- GIVEN two workstreams claim the same canonical file without a checkpoint
- WHEN ownership validation runs
- THEN one workstream is paused and no ambiguous canonical revision is published

### Requirement: Checkout-installer migration and state preservation

The provenance plan MUST define compatibility from the current checkout-bound installer to versioned V1 releases, including recoverable host configuration and active-version history. Migration and uninstall MUST preserve existing Tower database, pending messages, locks, audit/history, and `.git/control-tower` state by default; destructive cleanup MUST require explicit intent.

#### Scenario: Legacy installation upgrades safely

- GIVEN the current checkout installer has configured OpenCode and Tower history
- WHEN a versioned V1 release is adopted
- THEN configuration is backed up or migrated reversibly and existing history remains readable

#### Scenario: Migration encounters unknown state

- GIVEN legacy paths or state cannot be verified
- WHEN migration runs
- THEN it stops with an actionable report and does not relocate, recycle, or delete user state
