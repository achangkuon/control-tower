# SDD Tower Artifact Canonicalization Specification

## Purpose

Deterministic parsing, hashing, binding.

## Requirements

### Requirement: Structured content has one canonical digest

YAML MUST be JSON-compatible YAML 1.2: no tags, anchors, aliases, merge keys, duplicate keys, unsafe integers, non-string keys, or implicit timestamps. YAML/JSON MUST use RFC 8785 JCS; opaque artifacts MUST hash exact bytes. Digests MUST be `sha256:` plus lowercase hex.

#### Scenario: Equivalent documents

- GIVEN permitted documents differing only in whitespace or key order
- WHEN canonicalized
- THEN they produce an identical digest across supported hosts.

#### Scenario: Forbidden syntax

- GIVEN a document with forbidden YAML syntax
- WHEN canonicalization runs
- THEN it returns `CT_SCHEMA_INVALID`.

### Requirement: ArtifactRefs and retry keys are verifiable

ArtifactRefs MUST bind identity, repository path, media type, mode, source commit, and digest without self-reference. The path MUST remain inside the root and bytes MUST match. Idempotency keys MUST bind project, plan, slice, assignment revision, attempt, epoch, operation, and target; changed input returns `CT_IDEMPOTENCY_CONFLICT`; unknown effects require inspection.

#### Scenario: Mismatch or uncertainty

- GIVEN a stale ref or timed-out request
- WHEN verified or retried
- THEN validation fails with `CT_ARTIFACT_REF_INVALID`, or inspection returns existing evidence instead of replay.
