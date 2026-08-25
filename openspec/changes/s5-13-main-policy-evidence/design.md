# S5.13 Main Policy Evidence Design

## Decision summary

Add one Main-owned evidence acquisition boundary and one evidence-aware Policy entry point. Keep the existing continuation coordinator unchanged.

```text
constructor-bound authority + capability
  → authority.assert(capability)
  → registryStore.load()
  → compare only truthful shared identity facts
  → resolveSupportManifest() safe path resolution
  → private descriptor-bound exact-byte reader
  → parseSessionPlanSnapshot() for every requested target
  → resolveContinuationEligibility()
  → existing continueIntegratedBase() Main dispatch callback
```

The selected Plan is captured once while the unchanged `resolveSupportManifest` resolves its `STATUS.md`. The resolver receives a decoded view only for its existing read-only manifest work; only the single private byte buffer is passed to `parseSessionPlanSnapshot`. No decoded Support document becomes Policy evidence.

`continuation/integrated-base.mjs` remains unchanged. Its existing Policy callback already receives the integrated-base context, planning scope, Support proposal, and continuation evidence. A Main-owned constructor closure can additionally retain the trusted Plan evidence and current Jornada/Policy artifacts, and the callback's decision already reaches the existing Main-owned dispatch call. No payload or authority expansion is required.

## Scope and authority constraints

The exact approved Area remains:

- `continuation/main-policy-evidence.mjs`
- `continuation/integrated-base.mjs`
- `policy/jornada.mjs`
- `test/continuation/main-policy-evidence.test.mjs`
- `test/continuation/integrated-base.test.mjs`
- `test/policy/jornada.test.mjs`

Within that Area, this design changes only `continuation/main-policy-evidence.mjs`, `policy/jornada.mjs`, `test/continuation/main-policy-evidence.test.mjs`, and `test/policy/jornada.test.mjs`. The two integrated-base paths remain unchanged because the existing callback contract is sufficient.

The exact prohibited write targets remain `enroll/**`, `plugin/**`, `.opencode/plugins/**`, `hosts/**`, `install/**`, `support/**`, `registry/**`, `contracts/**`, `schemas/**`, `main-store/**`, `escalation/**`, `core.mjs`, `mcp.mjs`, `delivery/**`, manifests, and lockfiles. Read-only imports from registry, Support, S5.6, and Main authority do not transfer ownership. No DB writer, Plan writer, provider transport, delivery effect, or remote effect is added.

No new authority decision is required. The Plan declares the acquisition geometry, Policy/Main split, and revision separation as derivable decisions with existing authority and falsifiable criteria.

Production injection of `trustedBindingProvider` remains a separate S7.1 release/pilot adoption caveat with an external owner. S5.13 consumes already-provided `authority + capability`; it does not create, discover, enroll, serialize, transport, install, or claim production provider injection. This caveat does not block S5.13 acceptance or alter its dependencies.

## Components and ownership

| Component | Responsibility | Must not do |
|---|---|---|
| `continuation/main-policy-evidence.mjs` | Assert Main authority, resolve one current registry entry and one safe Plan, privately read its bytes once, invoke S5.6, and return frozen evidence. | Accept request-time project/root/path/bytes/digest/parser/provider authority; evaluate eligibility; dispatch. |
| Private exact-byte reader in `continuation/main-policy-evidence.mjs` | Open the resolver-approved path without following a final symlink, verify and read the opened regular-file descriptor into exactly one buffer, detect observable descriptor drift, and close it. | Be exported, become a request callback, accept caller bytes/path, re-open, allocate per-target buffers, or fall back to `readFile`. |
| `resolveSupportManifest` (unchanged) | Validate canonical root, roadmap, exact `plan-N/STATUS.md` references, symlink components, canonical regular-file paths, Git context, and DB location. | Supply canonical Plan semantics or own raw-byte identity. |
| `parseSessionPlanSnapshot` (unchanged) | Decode, parse, validate, digest, and deeply freeze each target snapshot from supplied bytes. | Read paths or acquire Main authority. |
| `policy/jornada.mjs` | Preserve legacy Jornada eligibility and add pure continuation-evidence evaluation. | Read files/registries, acquire capabilities, assign, choose among multiple eligible candidates, or dispatch. |
| `continueIntegratedBase` (unchanged) | Preserve `reconcile → Support → Policy → Main dispatch`. | Acquire trusted Plan evidence or move dispatch out of Main. |

## Public and internal contracts

### Main evidence API

`continuation/main-policy-evidence.mjs` exports exactly the production factory:

```js
createMainPolicyEvidence({
  authority,
  capability,
  registryStore,
  ports: { readText, inspectGit },
  descriptorFs, // optional constructor-only test seam; production defaults to node:fs
}).readCurrent({
  plan_id,
  target_session_ids,
})
```

The module imports the production Node `fs` facade itself. `descriptorFs` may replace only the narrow `constants/openSync/fstatSync/readSync/closeSync` operations at trusted construction time for deterministic descriptor-race tests; it does not introduce a production byte-reader port. The exact-byte reader remains private and unexported. Request callers cannot provide a path, bytes, byte reader, fs facade, read callback, parser, digest, project, root, provider callback, binding, revision, authority, or capability.

Constructor dependencies are trusted and constructor-bound. `readCurrent` accepts exactly `plan_id` and `target_session_ids`; extra keys are rejected. Constructor validation performs no I/O. Every `readCurrent` operation invokes `authority.assert(capability)` before `registryStore.load`, Support `readText`, `inspectGit`, descriptor open, or any other evidence I/O, so revocation applies to the next operation.

Input rules:

- `plan_id` is exactly `P<positive integer>`.
- `target_session_ids` is a non-empty array of unique `S<same plan number>.<positive integer>` IDs.
- Targets are sorted before parsing and returning, so caller order has no meaning.
- Policy later requires exact set equality with `{blocked_session_id} ∪ candidate_session_ids`; no unbound snapshot may ride along.

The deeply frozen result has this internal shape:

```js
{
  schema: "main-policy-evidence",
  schema_version: 1,
  project_id,
  plan_id,
  revisions: {
    binding_revision,
    registry_revision,
    registry_entry_revision,
  },
  source: {
    path,
    digest_mode: "raw-bytes",
    content_digest,
  },
  target_session_ids,
  snapshots,
}
```

`snapshots` is sorted by `snapshot.target.session_id`. Raw bytes, registry objects, Support's `documents` map, ports, descriptor facade, authority, and capability are never returned. Every snapshot is the unmodified deeply frozen result of the existing S5.6 `parseSessionPlanSnapshot`.

### Binding and registry facts

After `authority.assert(capability)` returns the immutable binding, `registryStore.load()` must return one valid project registry. The selected project is the unique entry whose `project_id` equals `binding.project_id`.

Only truthful shared facts are compared, when the registry entry shape supplies them:

| Main binding | Registry entry |
|---|---|
| `project_id` | `project_id` |
| `repository_root` | `canonical_root` |
| `git_common_dir` | `git_common_dir` |
| `remote` | `expected_remote` |
| `branch` | `main_branch` |
| `main_session_id` | `main_session` |

There is **no valid comparison** between `binding.store_path` and registry `main_store_path`. They are different stores with different meanings: `binding.store_path` is the JSON Main-store directory used by `createMainStore`, while enrollment `main_store_path` is the SQLite `tower.db` path. This boundary MUST NOT compare them, equate them, derive either from the other, or report a mismatch between them. Each remains governed by its existing owner.

Likewise, `binding.epoch`, aliases, allowed hosts, manifest path, and roadmap path have no invented cross-field counterpart. Registry-owned manifest and roadmap fields are still consumed by the unchanged Support resolver.

The revision facts remain separate:

- `binding_revision = binding.revision` proves the startup binding generation;
- `registry_revision = registry.registry_revision` proves the loaded global registry generation;
- `registry_entry_revision = entry.registry_entry_revision` proves the selected project-entry generation.

Each must be a positive safe integer. They are never compared with one another, copied/defaulted from one another, collapsed into a generic `revision`, or substituted. Policy may compare `registry_revision` with the current Jornada's registry binding while preserving all three exact names in evidence and diagnostics.

### Safe Plan selection and private one-buffer read

`plan_id: "P5"` selects only the resolver result `{ id: "P5", path: ".../plan-5/STATUS.md" }`. Missing, duplicate, mismatched, or non-canonical resolution fails before snapshot creation.

The Main reader composes with unchanged Support as follows:

1. Build a private `readText` adapter around constructor-bound `ports.readText`.
2. Delegate manifest, roadmap, and non-selected Plan reads to `ports.readText` unchanged.
3. When `resolveSupportManifest` has validated and requests the exact selected `plan-N/STATUS.md`, invoke the module-private descriptor reader exactly once for that resolver-approved path.
4. Decode a view of that same private buffer for the resolver. After resolution, require the selected resolver path to equal the intercepted path and require exactly one captured buffer.
5. Pass the same buffer object to every S5.6 parser call. Never re-open or call `readText` for the selected Plan again.

The private reader uses existing Node fs primitives only:

1. `openSync(path, O_RDONLY | O_NOFOLLOW)` on the resolver-approved exact path;
2. `fstatSync(fd, { bigint: true })` and reject anything except a regular file or a size that cannot be represented safely;
3. allocate exactly one `Buffer` of the opened size;
4. fill that one buffer through descriptor-bound `readSync` calls, handling short reads without allocating another content buffer;
5. require the exact expected byte count, then `fstatSync` again and compare descriptor identity, type, size, link count, mode, and available change timestamps; observable replacement, truncation, growth, or in-place mutation fails closed;
6. `closeSync(fd)` in all paths, treating a close failure as a failed evidence operation.

`readFileSync` is not used because it hides allocation and read ownership. No fallback read is attempted. The resolver's decoded view is discarded with the manifest and never reaches S5.6 or Policy; fatal UTF-8 remains the existing S5.6 `CT_SCHEMA_INVALID` outcome rather than becoming a second parser in Main.

TOCTOU behavior is deliberately bounded to what the current APIs can prove:

- Support first rejects unsafe roots, symlink components, non-canonical paths, and non-regular selected paths.
- A final-component symlink swap before descriptor open is rejected by `O_NOFOLLOW`.
- A rename/replacement after open cannot redirect the descriptor; the operation remains bound to the opened inode and exact bytes.
- Short reads, size changes, and observable in-place descriptor changes between the two `fstat` witnesses fail closed.
- A complete regular-file replacement that finishes before descriptor open is the file then present at the already-approved canonical path; the current Support API exposes no pre-open inode witness for cross-call equality. The design does not falsely claim to detect that historical replacement. Its bytes are nevertheless read once through the descriptor and bound by the S5.6 raw-byte digest. Closing that remaining pre-open identity gap would require a Support contract change, which is prohibited here.

The first snapshot establishes `source.content_digest`. Every later S5.6 call receives that value as `expected_plan_digest`, and the reader verifies every snapshot reports the same digest before returning.

## Policy design

### Preserve the existing API

`resolveEligibility` remains behaviorally and structurally compatible: existing callers retain the same success object and error codes.

Add one named export in the same file:

```js
resolveContinuationEligibility({
  // existing resolveEligibility fields
  caller_role, jornada, proposal, report, policy, worker_claim,
  horizon, action, execution_host, host_capable, now,

  // continuation-only fields
  main_policy_evidence,
  blocked_session_id,
  candidate_session_ids,
})
```

It invokes `resolveEligibility` for existing checks, then requires and evaluates Main evidence. The new continuation composition calls only this export, never the legacy evidence-free function directly. A real integration test wires this evidence-aware function into `continueIntegratedBase` through its existing Policy callback.

No mode flag is added to `resolveEligibility`, because an optional flag would create an evidence bypass. Policy accepts no acquisition callback, registry store, port, descriptor facade, authority, capability, assignment function, or dispatch function.

### Evidence binding

Policy validates all snapshots with the existing `validate("sessionPlanSnapshot", snapshot)` route, then requires:

- exact top-level evidence keys and schema/version;
- `project_id === jornada.project_id`;
- `plan_id === jornada.plan_id`;
- `revisions.registry_revision === jornada.registry_revision`;
- all three independently named positive-safe-integer revision fields;
- exact target-set equality with `{blocked_session_id} ∪ candidate_session_ids`;
- one snapshot per target, with no duplicate or foreign target;
- one shared snapshot source digest equal to the evidence source digest;
- identical canonical graph content across snapshots.

`blocked_session_id` and `candidate_session_ids` follow the acquisition ID rules. Candidates are unique, exclude the blocked ID, and belong to the evidence Plan.

### Blocked and candidate semantics

The blocked snapshot must have `target.status === "BLOQUEADO"` and at least one `target.decisions` item with `kind === "escala"` and `resolution === "open"`. Without both, Policy rejects the evidence as malformed or ambiguous.

A candidate is eligible only when all are true:

1. status is exactly `LISTO`;
2. `depends_on` equals graph inbound edges, as already enforced by S5.6;
3. no directed path exists in either direction between blocked and candidate, including transitive paths;
4. Area is provably disjoint from blocked Area;
5. Resource is disjoint from blocked Resource;
6. candidate is absent from every active contamination list on every open blocked-session escalation;
7. candidate has no open escalation of its own, because the snapshot cannot prove that such a decision affects only a later Module.

Area comparison stays conservative. Tokens must be relative, non-empty path/glob tokens without NUL, backslash, or `..` segments. Policy takes the literal prefix before the first glob metacharacter (`*`, `?`, `[`, `{`). Two tokens are not provably disjoint when a prefix is empty, prefixes are equal, or one is a path-segment ancestor of the other. Any such pair makes the candidate ineligible; Policy does not add a second Plan parser.

Resource comparison treats exact canonical `—` as no shared resource. Equal non-`—` values conflict; distinct non-empty opaque values are disjoint. Policy does not parse resource prose or invent aliases.

Policy never assigns among alternatives:

- zero eligible candidates returns deeply frozen `{ decision: "STOP", eligible: false, code: "CT_NO_ELIGIBLE_CANDIDATE", blocked_session_id }`;
- exactly one returns a deeply frozen `ALLOW` containing `eligible_candidate_ids: [id]`, legacy eligibility facts, blocked ID, Plan ID, and Plan content digest;
- more than one throws `CT_POLICY_EVIDENCE_AMBIGUOUS`; Main must obtain an unambiguous candidate set.

A singleton eligible-ID set is evaluation, not worker assignment. Main alone owns subsequent dispatch.

## Data flow

1. Main constructs the reader from already-bound authority, capability, registry store, read-only Support ports, and the module-owned production fs facade.
2. Main calls `readCurrent` with only current Plan ID and expected blocked/candidate Session IDs.
3. The reader validates request shape, asserts capability, loads one registry generation, and selects one project by `project_id`.
4. It compares only shared identity facts; it never compares `binding.store_path` with registry `main_store_path`.
5. The unchanged Support resolver proves canonical root, roadmap reference, and exact selected `STATUS.md` path.
6. The private descriptor reader captures exactly one buffer from that path; S5.6 creates all requested snapshots from it and one shared digest.
7. Main invokes unchanged `continueIntegratedBase`; its Policy closure calls `resolveContinuationEligibility` with trusted evidence and current Jornada/Policy artifacts.
8. Rejection, `DENY`, `STOP`, no candidate, or ambiguity prevents dispatch. Only `ALLOW` with one eligible candidate reaches Main dispatch after reconciliation and Support.

## Error families

| Code/family | Meaning |
|---|---|
| `CT_MAIN_EVIDENCE_INPUT_INVALID` | Invalid constructor shape, read request, Plan ID, target set, or test-facade shape. No evidence I/O occurred. |
| `CT_AUTH_INVALID` | Existing Main authority/capability rejection, preserved unchanged. |
| `CT_MAIN_REGISTRY_INVALID` | Registry absent/malformed or project selection non-unique. |
| `CT_MAIN_REGISTRY_STALE` | A truthful shared binding/entry identity fact differs. Diagnostics name that fact. Store paths are never compared. |
| `CT_MAIN_PLAN_INVALID` | Support path resolution failed, selected Plan is absent/mismatched, or selected path was not captured exactly once. Original Support failure remains the cause. |
| `CT_MAIN_PLAN_READ_FAILED` | Private descriptor open/stat/read/close failed, file was not regular/stable, or exact byte count was not captured. No fallback read occurs. |
| `CT_SCHEMA_INVALID` | Existing S5.6 canonical parsing/validation failure, preserved unchanged. |
| Existing Jornada/Policy codes | Legacy eligibility, denial, and stale-artifact behavior remain unchanged. |
| `CT_POLICY_EVIDENCE_INVALID` | Evidence shape, project/Plan/revision binding, target set, snapshot, blocked semantics, digest, or graph is malformed, stale, or foreign. |
| `CT_POLICY_EVIDENCE_AMBIGUOUS` | More than one candidate remains eligible; Policy refuses to assign. |
| `CT_NO_ELIGIBLE_CANDIDATE` | Typed `STOP`; Main performs zero dispatch. |

All new errors are frozen and expose only read-only diagnostics. Error handling performs no re-read, fallback parse, write, assignment, escalation, or dispatch.

## File changes

| Path | Design change |
|---|---|
| `continuation/main-policy-evidence.mjs` | New Main-owned reader, private production-owned descriptor byte reader, truthful identity comparisons, revision separation, unchanged Support composition, S5.6 fan-out, and deep-frozen evidence. |
| `policy/jornada.mjs` | Preserve `resolveEligibility`; add pure `resolveContinuationEligibility` and compact graph/Area/evidence helpers. |
| `test/continuation/main-policy-evidence.test.mjs` | Acquisition, private descriptor-reader seam, one-buffer/one-open semantics, TOCTOU fail-closed witnesses, revision/store separation, and real composition proof. |
| `test/policy/jornada.test.mjs` | Preserve legacy assertions; add evidence semantics, STOP, ambiguity, foreign/stale, graph, Area, Resource, and decision tests. |
| `continuation/integrated-base.mjs` | No change. |
| `test/continuation/integrated-base.test.mjs` | No change; cross-component proof belongs with the new evidence boundary. |

No Support, registry, contract, schema, main-store, escalation, plugin, host, install, delivery, manifest, lockfile, or Plan source changes.

## Test strategy for later Strict TDD

No test or runtime command runs in design. Apply starts with RED.

### Acquisition tests

- Assert call order begins `authority.assert → registryStore.load`; invalid/revoked capability produces zero registry, Support, Git, or descriptor operations.
- Reject absent/duplicate projects and every truthful shared identity mismatch independently.
- Use deliberately different `binding.store_path` (JSON Main-store directory) and `main_store_path` (SQLite `tower.db`) and prove no equality check, mismatch diagnostic, derivation, or substitution occurs.
- Use different numeric values for `binding_revision`, `registry_revision`, and `registry_entry_revision`; assert all survive under distinct keys through Policy diagnostics.
- Resolve multiple roadmap Plans and prove `P5` privately opens only the exact resolver-approved `plan-5/STATUS.md`.
- Prove one descriptor open and exactly one content buffer for multiple targets, identical content digests, sorted exact targets, and recursive freezing.
- Through the constructor-only descriptor facade, simulate final symlink replacement, short reads, growth/truncation, observable in-place mutation, open failure, and close failure; require one failed operation, no fallback read, no snapshot, and zero dispatch.
- Replace the path after descriptor open and prove reads remain bound to that descriptor; document the current API limitation for a completed regular-file replacement before open.
- Inject S5.6 failures and prove no second open/read and no alternate parser.

### Policy tests

- Preserve all existing `resolveEligibility` assertions.
- Accept one `LISTO`, graph-independent, Area/Resource-disjoint, uncontaminated candidate.
- Return STOP for non-LISTO, dependency-related, Area-overlapping/ambiguous, Resource-conflicting, actively contaminated, or open-decision candidates.
- Reject a blocked snapshot without both `BLOQUEADO` and an open escalation.
- Reject target drift, duplicate/foreign IDs, differing Plan digests, non-identical graphs, stale global registry revision, malformed snapshots, and multiple eligible candidates.
- Assert Policy source and inputs expose no read, fs, registry, authority, capability, assignment, or dispatch dependency.

### Real integration test

Create a temporary canonical project and project registry before taking read-only witnesses. Use real `bindMainAuthority`, `createProjectRegistryStore(...).load`, `resolveSupportManifest`, `parseSessionPlanSnapshot`, `resolveContinuationEligibility`, and `continueIntegratedBase`. Only reconciliation, Support result production, and dispatch remain observed callbacks because the existing coordinator owns those ports.

The Policy callback closes over trusted evidence and current Jornada/report/policy data, then calls `resolveContinuationEligibility`. Assert:

- exact order `reconcile → Support → Policy → Main dispatch` for one admissible candidate;
- zero dispatch for DENY, STOP, stale/foreign evidence, and ambiguity;
- dispatch receives the actual evidence-aware Policy decision;
- registry bytes, Plan bytes, Git status, Support-state witnesses, and observed inputs remain unchanged on success and rejection;
- parked candidate `d2c014754b914aeab253f275bf0ce116b22d25e95ec62041abf1b51eba0cc9e3` and parked patch `f5f344624257dc7140afb8cecb84dafa715a28985e742c70818fae5aebb73c75`, including all five parked `escalation/**` and test paths, remain byte-identical and outside the write set.

This executes the new acquisition and Policy production functions through the existing callback boundary; it does not require a new composition root or integrated-base change.

## Read-only witnesses

Tests capture before/after bytes for registry and selected Plan, Git/worktree observations, and sentinel state around constructor dependencies. Call logs prove no save/write/DB/dispatch operation occurs during acquisition or evaluation. Success and fail-closed families compare the same witnesses. The one private content buffer is never returned, and evidence/Policy results are recursively frozen.

Verification must also compare the parked candidate `d2c014754b914aeab253f275bf0ce116b22d25e95ec62041abf1b51eba0cc9e3` and parked patch `f5f344624257dc7140afb8cecb84dafa715a28985e742c70818fae5aebb73c75` exactly, including their five `escalation/**` and test paths.

## Workload forecast and hard cap

Authored additions plus deletions, excluding this design artifact and explicitly including the private descriptor reader and its focused race/error tests:

| Path | Forecast |
|---|---:|
| `continuation/main-policy-evidence.mjs` including private exact-byte reader | 105–120 |
| `policy/jornada.mjs` | 40–50 |
| `test/continuation/main-policy-evidence.test.mjs` including descriptor and real-composition proof | 125–140 |
| `test/policy/jornada.test.mjs` | 55–70 |
| **Total** | **325–380** |

The defensible upper bound is 380, leaving 20 authored lines before the hard maximum of 400. No new authority decision is needed. Tasks may proceed only if their refined upper bound remains at or below 400 and retains per-file ceilings. Apply must count authored additions plus deletions continuously and stop before creating line 401. There is no silent exception, generated detour, integrated-base edit, prohibited-area edit, chained PR, or fifth planning level. If later evidence raises the defensible upper bound above 400, the change becomes blocked and must be replanned before source mutation.

## Rollout and rollback

This is a read-only internal composition with no migration, persisted schema, feature flag, provider adoption, or remote effect. Rollout is one independently verifiable and revertible direct-commit unit, implemented under later Strict TDD and followed by focused plus integral verification. Production provider adoption remains under S7.1.

Rollback removes `continuation/main-policy-evidence.mjs` and reverts only the bounded additions in `policy/jornada.mjs`, `test/continuation/main-policy-evidence.test.mjs`, and `test/policy/jornada.test.mjs`. It requires no Plan, registry, DB, Support-state, provider, or remote repair. Rollback MUST preserve parked candidate `d2c014754b914aeab253f275bf0ce116b22d25e95ec62041abf1b51eba0cc9e3` and parked patch `f5f344624257dc7140afb8cecb84dafa715a28985e742c70818fae5aebb73c75`, including their five `escalation/**` and test paths, byte-identically.
