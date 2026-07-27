# Proposal: SDD Tower V1 Contract Schemas

## Decision summary

Create the versioned, machine-readable contract foundation required by the approved SDD Tower V1 PRD, RFC, and REQUIREMENTS. This change owns canonicalization, JSON Schemas, validators, golden fixtures, the Plan Catalog format, and the minimal Main control-store primitives used by later product changes.

Control Tower remains plan-agnostic. The runtime may transport opaque references and digests but must not parse plan or policy semantics.

## Intent

Make every later change depend on stable schemas instead of inventing payloads independently.

## In scope

- Implement the ten V1 JSON Schemas required by REQUIREMENTS.
- Implement YAML 1.2 JSON-compatible parsing constraints.
- Implement RFC 8785 canonicalization and `sha256:<hex>` digests.
- Validate intrinsic artifact headers and external ArtifactRefs.
- Validate Project Registry, Plan Catalog, Plan Manifest, Binding Delta, Policy Report, Jornada, Assignment, Authorization, and Campaign payloads.
- Provide stable error codes and negative fixtures.
- Provide atomic Main control-store primitives for immutable reports, authorizations, campaigns, and audit records.
- Create machine-readable Plan Catalog support without adding plan interpretation to Tower.

## Out of scope

- Project enrollment UX or Hermes integration.
- Workspace creation or process launching.
- Policy decisions, jornada routing, Telegram, delivery, or campaigns.
- Changes to continuation lifecycle semantics owned by `autonomous-continuation-control-tower`.
- Runtime activation or production-state mutation.

## Dependencies

- Approved PRD: `openspec/prd/sdd-tower-implementation-v1.md`.
- Approved RFC: `openspec/rfc/sdd-tower-implementation-v1.md`.
- Approved REQUIREMENTS: `openspec/specs/sdd-tower-implementation-v1-requirements.md`.

## New capabilities

- `sdd-tower-contract-schemas`
- `sdd-tower-artifact-canonicalization`
- `sdd-tower-main-control-store`

## Success criteria

- [ ] All ten schemas reject unknown fields unless namespaced extensions are explicitly allowed.
- [ ] Canonicalization and digest golden fixtures are deterministic across supported hosts.
- [ ] ArtifactRef validation proves commit, path, and content digest without self-reference.
- [ ] Main control-store writes are atomic and owner-only.
- [ ] Tower APIs remain semantic-opaque and import no OpenSpec parser.
- [ ] Gates A and the contract portion of Gate B in REQUIREMENTS pass.

## Rollback plan

Remove the additive schema, validator, fixture, and Main-store modules as one unpublished product unit. No Tower database downgrade, runtime activation, repository relocation, or external state mutation is permitted in this change.
