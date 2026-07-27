# Proposal: SDD Tower V1 Project Registry

## Decision summary

Create a path-neutral, locally bootstrapped project registry that lets Hermes resolve a project while preserving one authoritative Main per repository. Main rederives repository identity before every authority-sensitive operation.

## Intent

Allow remote project selection without moving repositories under Hermes or trusting conversational aliases as authority.

## In scope

- Persist the versioned Project Registry under the approved XDG configuration boundary.
- Support local enrollment, update, relocation preparation, and revision history.
- Validate canonical root, Git common directory, expected remote, main branch, Main session, Plan Catalog, roadmap, control-store path, and allowed hosts.
- Import compatible entries from the existing Hermes project allowlist without creating duplicates.
- Resolve aliases as UX proposals and return an exact `project_id` plus registry revision.
- Expose a read-only Hermes adapter for list, selection, and identity status.
- Provide Main rederivation and fail-closed mismatch reports.

## Out of scope

- Automatic repository relocation.
- Direct worker routing from Hermes.
- Jornada creation, workspace mutation, Telegram authorization, or delivery.
- Filesystem ownership transfer to Hermes.
- Plan interpretation inside Control Tower.

## Dependencies

- `sdd-tower-contract-schemas`.
- Approved PRD, RFC, and REQUIREMENTS.

## New capabilities

- `sdd-tower-project-registry`
- `sdd-tower-local-enrollment`
- `sdd-tower-hermes-project-resolution`

## Success criteria

- [ ] Initial enrollment and root/remote relocation require a local operation.
- [ ] Aliases never authorize an operation without exact project and registry revision.
- [ ] Main detects root/common-dir/remote/branch/catalog drift before mutation.
- [ ] Registry updates are atomic, owner-only, and monotonic.
- [ ] Existing repositories remain in their current physical locations.
- [ ] Wrong-project and ambiguous-alias scenarios fail closed.

## Rollback plan

Disable the mutable registry commands and restore the previous registry revision. Preserve the existing Hermes read-only allowlist until the new registry is proven. Do not move or rewrite repositories during rollback.
