# Exploration: SDD Tower V1 Project Registry (Change B)

### Current State

Change A is complete at the current integrated base (`67c21b9`): the repository already has the `project-registry-v1` schema, strict Ajv/YAML validation, canonicalization, and a Main authority/store primitive. No registry runtime, enrollment command, legacy importer, Hermes adapter, or registry-aware Main rederivation exists in this worktree.

The normative requirements define the registry as `${XDG_CONFIG_HOME:-$HOME/.config}/control-tower/projects.yaml`, with secure `0700`/`0600` storage, atomic fsync/rename writes, monotonic registry and entry revisions, local bootstrap for initial/root/remote identity, exact `project_id` plus `registry_revision` for authoritative operations, and `CT_PROJECT_IDENTITY_MISMATCH` on Main drift. Notion and `plan-2/STATUS.md` agree that Change B must first acquire a demonstrable one-PR boundary; no Change B Session ID is currently authoritative.

The legacy Hermes source is external and materially different: `~/.hermes/projects.json` contains `{id, name, root, kind}` entries only. It lacks required registry facts such as Git common directory, expected remote, Main branch/session, manifest/roadmap paths, store path, and allowed hosts. Therefore import cannot safely be a blind file conversion; it requires local Git/layout derivation and a bootstrap policy.

The existing `main-store/authority.mjs` validates and rederives a trusted binding once at startup. `main-store/store.mjs` checks the captured binding before writes but does not load a registry or rederive repository identity before every authority-sensitive operation. This is a later Change B responsibility, not a safe part of the first storage boundary.

DB mode is unchanged and must remain unchanged: the legacy Control Tower runtime uses SQLite under `<git-common-dir>/control-tower/tower.db`, while the new Main store is filesystem JSON under the registered `main_store_path`. The first Change B Session must mutate neither database. The focused baseline command `bun test test/contracts/schema.test.mjs test/main-store.test.mjs` passes (43 tests, 119 assertions).

### Affected Areas

- `schemas/project-registry-v1.schema.json` — existing contract consumed by the registry store; no schema expansion is required for the storage-first boundary.
- `contracts/validate.mjs`, `contracts/schema-registry.mjs`, `contracts/canonicalize.mjs` — existing strict parsing, invariant, and digest primitives that the registry store should reuse rather than duplicate.
- `main-store/authority.mjs`, `main-store/store.mjs` — existing trusted binding and filesystem Main store; remain unchanged in the first Session and become consumers of registry rederivation later.
- `registry/*.mjs` — candidate new path resolver, secure atomic registry store, and narrow exports for the first Sesion; the Installable V1 design already identifies this module boundary.
- `test/registry/*.test.mjs` — candidate focused Bun tests for XDG isolation, permissions, atomicity, revision fencing, and validation.
- `~/.hermes/projects.json`, `~/.hermes/bin/project-registry-readonly-mcp.mjs` — read-only evidence for the later importer/adapter work; they are external and must not be modified by this Change B exploration.
- `openspec/changes/sdd-tower-project-registry/proposal.md` — currently describes all four Change B responsibilities together; it needs a boundary correction before spec/design, but is intentionally not edited in this phase.

### Approaches

1. **Storage-first registry foundation (recommended)** — Define the first candidate Sesion as XDG path resolution plus validated, secure, atomic registry load/save and monotonic revision fencing.
   - Pros: Smallest independently testable boundary; directly supported by REQUIREMENTS and Change A; establishes the persistence contract required by every later capability; keeps external Hermes and Main authority untouched.
   - Cons: Does not yet enroll a usable project or expose remote selection; later work must add bootstrap and consumers.
   - Effort: Medium

2. **Single vertical registry slice** — Combine storage, local enrollment/import, read-only resolution, and Main rederivation in one PR.
   - Pros: Demonstrates an end-to-end project selection path earlier.
   - Cons: Mixes missing legacy-field derivation, external adapter concerns, filesystem/Git validation, and authority changes; likely exceeds the 400-line review budget and has no clean rollback boundary; contradicts the current status requirement to prove the first PR boundary before assigning a Sesion.
   - Effort: High

### Recommendation

Define a candidate **S2.4 — Registry storage and XDG path resolution** (one PR, estimated 250–400 authored lines) without yet making the ID authoritative in shared planning docs. Its in-scope behavior is:

1. Resolve the default path-neutral registry location from XDG configuration variables, without deriving a path from Hermes, the current worktree, or the repository checkout.
2. Create/validate the registry parent with owner-only permissions and read/write the versioned `project-registry-v1` document through the existing contract validator.
3. Persist validated documents with temporary same-filesystem files, flush/fsync, atomic rename, and `0600` file permissions; reject stale expected revisions and preserve the prior document on failure.
4. Enforce the already specified unique project IDs and globally unique aliases, returning stable safe errors; test the boundary with temporary HOME/XDG roots.

The candidate is explicitly out of scope: initial enrollment and relocation bootstrap; derivation of Git common directory, remote, branch, manifest, roadmap, or Main identity; conversion/import of `~/.hermes/projects.json`; alias selection or project resolution; Hermes/Support adapters; Main rederivation; Tower SQLite/runtime state; Installable V1 lifecycle; and P7/P8 gates.

Acceptance evidence for this boundary should be a focused registry test file run with Bun, plus the existing contract and Main-store suites. The tests must prove XDG override/default behavior, repository/Hermes path independence, permissions, atomic failure preservation, monotonic revision fencing, duplicate/unknown-field rejection, and zero writes to `.git/control-tower/tower.db`. The current baseline is green; no runtime or test files were changed during exploration.

Before `sdd-spec` or `sdd-design`, the existing proposal should be corrected to separate this storage foundation from the later bootstrap/import, read-only resolution, and Main-rederivation Sessions. The external legacy import policy remains a downstream decision: missing required fields must be derived and locally verified, never guessed from `name` or `root`.

### Risks

- Treating the old Hermes allowlist as a complete registry would silently invent remote, branch, Main, and store identity; import must remain a separate bootstrap-gated boundary.
- A registry path under the repository or Git common directory would violate path neutrality and couple project selection to the checkout; XDG tests must assert this explicitly.
- Reusing the current startup-only Main binding without per-operation rederivation would leave root/common-dir/remote/branch drift undetected.
- Broadening the first PR to include the adapter or Main consumers would mix Installable V1/P7/P8 concerns and exceed the review budget.

### Ready for Proposal

Yes, for a corrected storage-first proposal. The orchestrator should amend the Change B proposal before spec/design to name the first one-PR boundary above and preserve the remaining responsibilities as later, unassigned Sessions. No human decision blocks this first boundary; the legacy import mapping is an unresolved downstream policy question, not a reason to enlarge S2.4.
