# S9.1 Safe Slot Lifecycle Technical Design

## Decision and readiness

S9.1 establishes a one-way fail-closed `jornada.sh --reciclar` baseline, then adds a transport-independent physical-slot lifecycle and private in-process composition. It creates no successful external recycle route.

**Status: revised for a fresh design gate.** On 2026-08-17 the maintainer authorized the second canonical split required by Engram 8955. The complete normative inspection contract is preserved across three ordered, independently verifiable, fail-closed Módulos inside existing S9.1: canonical request/authority/Git evidence, descriptor-safe dual-root double observation, and persisted evidence/full classifications. No new Sesión, lifecycle deferral, fifth level, proposal/spec change, or scope expansion is introduced. Existing later outcomes retain their semantics and order while shifting positional IDs.

M9.1.1 is a frozen `✅ COMPLETO` one-way floor at actual 117 authored lines. This artifact is planning only. Implementation is **not authorized**: it does not authorize edits to Plan 9, tasks, RED, code, tests, package/lock/manifest/V1/V2 files, commits, pushes, delivery, or status changes. The current terminal candidate remains untouched diagnosis evidence and requires explicit discard/rewrite authorization before any future RED. The required next state after this design write is `await-task-reconciliation`, subject first to the fresh read-only design gate.

## Verified repository seams

CodeGraph could not be used: this worktree has no `.codegraph/config.json`, and this executor has no CodeGraph MCP or shell surface with which to initialize it. After that failure, the design used bounded exact reads and focused searches.

| Path or seam | Verified state | Design consequence |
|---|---|---|
| `jornada.sh:31-43,254-285` | Flag parsing precedes all main work, but current `--reciclar` execution occurs after fetch/discovery and runs `status`, `switch -c`, and optionally `branch -D`. | Put the interlock immediately after argument parsing and remove the executable recycle block. |
| `jornada.sh:340-386` | Advisor output still recommends successful recycling and one direct `switch -c`. | Reconcile recycle-specific help so the wrapper never advertises a successful S9.1 path. |
| `plugin/tower-spike.js:171-246` | `TowerSpikePlugin` already accepts constructor dependencies, verifies trusted Main binding for Support, and returns only Support/dispose/event. | Add private constructor-bound composition without changing the returned runtime surface. |
| `test/plugin/tower-spike.test.mjs` | Existing tests prove trusted Main binding and Support isolation. | Extend this file for private composition/no-reachability assertions. |
| `workspace/checkpoint.mjs` | Existing Workspace modules use dependency-injected argv-array Git, full OIDs, closed inputs, deep freezing, and `digestArtifact`. | Follow these conventions; do not claim an existing slot lifecycle. |
| `contracts/canonicalize.mjs` | Exports `canonicalize`, `parseStructured`, and `digestArtifact`, including RFC 8785 JCS digests. | Reuse `canonicalize`/`digestArtifact`; do not create another canonicalizer. |
| `registry/store.mjs` | Demonstrates no-follow exclusive files, owner/mode checks, fsync, rename, and directory fsync. | Reuse the safety pattern, not the registry store itself. |
| `openspec/plans/sdd-tower-implementation/manifest.yaml` | Existing V1 RFC/requirements ArtifactRefs contain the exact approved commit and digests. | Preserve those mappings byte-for-byte while adding a namespaced extension. |
| `schemas/plan-manifest-v1.schema.json` | `artifact_refs` is closed, but optional top-level `extensions` accepts namespaced keys. | Add V2 refs and precedence under `extensions`; do not change the schema or replace V1 keys. |
| `workspace/slot-lifecycle.mjs`, `test/workspace/slot-lifecycle.test.mjs` | Terminal verification Engram 8950 records an invalid 181-authored-line candidate at the exact hashes in the rewrite-boundary section. | Preserve those bytes as diagnosis evidence during planning. They are not an approved implementation seam and require authorized discard/rewrite before future RED. |
| Other new paths listed below | Prior exact reads returned `ENOENT`. | Their future creation remains explicit; this design does not claim reuse. |

## Architecture and authority boundary

```text
trusted in-process Main initializer
  └─ plugin/tower-spike.js
       ├─ existing trusted Main/session verification
       ├─ constructor-bound opaque read-only Jornada/occupancy resolver
       ├─ private createPhysicalSlotLifecycle(...) composition
       └─ unchanged returned surface: Support tool, dispose, event

jornada.sh --reciclar
  ├─ parse recognized compatibility syntax
  ├─ return stable non-zero unavailable result
  └─ X no call, IPC, command, executable, API, tool, or entrypoint

workspace/slot-lifecycle.mjs
  ├─ inspect(request)
  │    ├─ M9.1.2 canonical request, authority, and Git evidence
  │    ├─ M9.1.3 descriptor-safe dual-root and complete double observation
  │    └─ M9.1.4 persisted evidence and full classifications
  ├─ replace(request)  exact ordered effects, only after M9.1.5
  └─ recover(request)  observation-first, only after M9.1.5
```

There is intentionally no process-boundary arrow. The shell cannot delegate successfully in S9.1. Successful recycling is a separate future Sesión whose transport remains unselected.

### Proposed new library interface

The approved `workspace/slot-lifecycle.mjs` implementation does not yet exist. The path currently contains an unauthorized candidate that remains diagnosis evidence until a separately authorized discard/rewrite boundary. The proposed final module interface is:

```js
createPhysicalSlotLifecycle({
  resolveAuthoritativeContext,
  git,
  fs,
  now,
  randomUUID,
  processProbe,
}) => Object.freeze({ inspect, replace, recover })
```

- `resolveAuthoritativeContext` is supplied once at construction by trusted in-process composition. Per-operation callers cannot supply, replace, inspect, or serialize it.
- `git` accepts `(cwd, argv, options)` and never shell text. Production uses a fixed executable and argument arrays; tests inject an event-recording implementation.
- `inspect(request)`, `replace(request)`, and `recover(request)` accept the same closed request and obtain authoritative context internally.
- Returned values are deeply frozen plain data. No return value contains the resolver, Main authority, store path, capability token, or callable authority.
- The module export is an internal library seam only. S9.1 adds no package `bin`, package script, plugin tool, command, IPC endpoint, executable bit, or runtime entrypoint.

The closed request binds schema/version, operation `REPLACE`, project ID, registry revision, canonical repository and Git common-dir, slot ID and absolute normalized target path, prior binding digest or proven absence, Jornada ID/revision/state digest, occupancy evidence, assignment revision when applicable, requested fresh branch, and exact full base commit OID. Unknown keys, NULs, abbreviated OIDs, non-canonical paths, missing identities, or cross-binding mismatches fail before mutation.

`input_digest` is `digestArtifact(request-and-authoritative-context, "rfc8785-jcs")`. It is derived, never caller authority, and keys idempotency and operation evidence.

### Canonical request and authority grammar

M9.1.2 closes these inputs before any observation:

- The request is an exact-key plain-data record. It rejects inherited/unknown keys, callable or capability values, non-scalars where a scalar is required, NULs, non-canonical absolute paths, missing identities, and values that disagree with constructor authority.
- `resolveAuthoritativeContext` is constructor-confined. Each observation copies only the approved non-secret scalar fields into a new own-property record, rejects accessors/objects/arrays/functions/symbols and unknown or missing fields, and deep-freezes that scalar-only snapshot before it can participate in a digest. Resolver identity, capability values, store paths, tokens, and secrets are never returned, serialized, logged, placed in argv/environment, or accepted from the caller.
- A canonical OID matches exactly `^[0-9a-f]{40}$`; uppercase, abbreviation, whitespace, and non-hex forms are rejected.
- A canonical local ref is `refs/heads/<component>(/<component>)*`, where each component matches `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`. The requested branch uses the same component grammar without the `refs/heads/` prefix.
- `HEAD`, `@`, `.`, `..`, empty components, leading or trailing slash, duplicate ref/branch/path/OID records, and contradictory duplicate worktree or `show-ref` records are rejected. No normalization may turn a rejected spelling into an accepted identity.

After grammar validation, request and authority are cross-bound to project, registry revision, repository root, external Git common-dir, exact target worktree path, `HEAD`, current branch/local ref, base commit and tree, requested branch absence, existing branch commit/tree when applicable, slot/Jornada/occupancy identities, and prior binding or proven absence. A mismatch is not repaired or caller-overridden.

### Fixed read-only Git boundary

Production invokes the fixed executable `git`, never shell text or caller-selected executable, with `GIT_OPTIONAL_LOCKS=0`. The finite argv allowlist is exact; no flags, config injection, implicit fetch, fallback command, or reordered equivalent is permitted:

```text
["rev-parse","--show-toplevel"]
["rev-parse","--git-common-dir"]
["symbolic-ref","--quiet","HEAD"]
["rev-parse","--verify","HEAD^{commit}"]
["rev-parse","--verify","HEAD^{tree}"]
["rev-parse","--verify",baseOid+"^{commit}"]
["rev-parse","--verify",baseOid+"^{tree}"]
["rev-parse","--verify",branchRef+"^{commit}"]
["rev-parse","--verify",branchRef+"^{tree}"]
["show-ref","--head"]
["worktree","list","--porcelain"]
```

`baseOid` and `branchRef` are interpolated only after the preceding canonical grammar succeeds. `show-ref --head` and worktree porcelain are parsed as strict finite records: unknown fields, malformed ordering, duplicate keys/records, non-canonical refs/OIDs/paths, detached or unexpected state, and cross-record contradictions fail closed. Requested branch absence must be proven from the complete canonical ref evidence; command failure or partial output never means absence.

## One-way fail-closed wrapper baseline

Immediately after the argument loop, before colors, WSL probing, fetch, trunk detection, discovery, diagnostics, Git, filesystem access, or persistent lock acquisition:

1. Detect non-empty `RECICLAR`.
2. Emit a stable unavailable code/message to stderr.
3. Exit with a stable non-zero status.
4. Do not require or validate `--nueva-rama`; unavailable takes precedence over downstream argument validation.

The old executable recycle block is removed, including `status`, occupied-worktree `switch -c`, `cherry`, and `branch -D`. Recycle-specific comments and recommendations are changed to say unavailable rather than advertise a successful compatibility path. No fallback or second mutator remains.

This first direct-commit/Módulo boundary is the Engram 8894 special boundary and is frozen complete as M9.1.1 at 117 authored lines. A direct revert that restores the old recycler is forbidden. Correction and rollback are forward-only and must preserve both the interlock and removal of the legacy mutation path. Every later Módulo starts from and must retain this floor.

## Read-only inspection split

The complete normative inspection semantics remain intact, but delivery is divided into three ordered safe outcomes. All three are read-only, constructor-authorized, deterministic, deeply frozen plain data with stable fail-closed reason/result shapes, and independently testable at their handoff. M9.1.2 and M9.1.3 do not own or leak M9.1.4 persisted classification semantics.

The exact reason precedence across the split is:

`REQUEST_INVALID -> AUTHORITY_MISMATCH -> GIT_EVIDENCE_INVALID -> FILESYSTEM_UNSAFE -> EVIDENCE_UNVERIFIABLE -> OBSERVATION_DIVERGED -> SEMANTIC_PROOF_REQUIRED`.

Evaluation is deterministic and first-match in that order even under multiple simultaneous faults. Public inspection classification remains the normative `UNSAFE` until M9.1.4 can prove one of the complete persisted states. `FILESYSTEM_PROOF_REQUIRED` may be used only as an internal M9.1.2 handoff marker and is never a public persisted classification; externally M9.1.2 reports `UNSAFE`. `SEMANTIC_PROOF_REQUIRED` is the approved final reason for a filesystem-safe M9.1.3 observation that still lacks M9.1.4 persisted proof.

### M9.1.2 — Canonical request, authority, and Git evidence foundation

Forecast: **220–290 authored lines; hard cap ≤400**.

This Módulo establishes only the canonical request/authority/Git substrate:

1. Validate and canonicalize the closed request with the exact grammar above, then obtain and deep-freeze a non-secret scalar-only constructor-authority snapshot. No request field, caller value, environment value, later function argument, resolver return object, or callable value may supply or replace authority.
2. Execute only the fixed `git` command and finite argv allowlist above with `GIT_OPTIONAL_LOCKS=0`; reject malformed, duplicate, ambiguous, partial, or contradictory command evidence.
3. Canonically bind repository root, external common-dir, exact worktree target and registration, `HEAD`, current branch/ref, full commit/tree OIDs, exact full base commit/tree OIDs, optional existing requested-branch commit/tree, and requested branch absence. Every root/common-dir/worktree/HEAD/branch/ref/base relation must cross-bind; absence is proven, never inferred from failure.
4. Apply only the first three reasons in the shared precedence. The mandatory negative matrix covers each request grammar production, authority-field mismatch/confinement violation, every disallowed argv/executable/environment variant, malformed/duplicate Git record, and each cross-binding edge. The mandatory multi-fault matrix combines faults across those categories and proves the earliest reason always wins.
5. Return deeply frozen non-secret plain data. Before/after Git identity over repository root, common-dir, `HEAD`, ref/OID set, worktree registry, requested-branch absence, index/worktree status relevant to observation, and command transcript must prove zero effects and allowlist-only execution.

M9.1.2 performs no filesystem safety proof beyond canonical path identities and no persisted semantic proof. It has zero mutation and exposes no `replace`, `recover`, lock acquisition, repair, normalization, fetch, file creation, descriptor read, ref/worktree change, branch switch, prune, or evidence removal.

**Safety handoff after M9.1.2:** successful request/authority/Git proof still returns public `UNSAFE`. The unresolved filesystem boundary is represented internally, if needed, as `FILESYSTEM_PROOF_REQUIRED`; that marker is not part of the externally visible persisted classification vocabulary and cannot be accepted from callers. There is no shortcut from target absence or Git agreement to `ABSENT`, `OCCUPIED`, or `SAFELY_RETIRED`.

### M9.1.3 — Descriptor-safe dual-root and complete double observation

Forecast: **230–300 authored lines; hard cap ≤400**.

Building only on M9.1.2's canonical substrate, this Módulo proves filesystem evidence independently under both roots: the repository-target tree and the external Git common-dir state tree. Safety under one root never substitutes for safety under the other.

For each existing component and readable evidence file in each root, each of two independent observations performs this exact order without interleaving the witnesses:

`component pre-lstat → open O_RDONLY|O_NOFOLLOW → immediate descriptor fstat → raw-byte read and content digest → post-read descriptor fstat → component post-lstat`.

Each observation rejects root or component escape, symlink traversal, non-owner ownership, unsafe file/directory type, unsafe owner mode, unexpected link count, non-canonical path, descriptor/path device-inode mismatch, size/content change, timestamp-only drift, descriptor metadata drift, component replacement, and raw-content/digest disagreement. Missing optional evidence is recorded canonically; missing required or unprovable evidence is not normalized into absence.

1. Complete witness A runs the full request/authority/Git proof, repository-target safety, external common-dir safety, descriptor reads, and complete relevant zero-effect snapshot; only then is it independently canonicalized with RFC8785/JCS and digested.
2. Complete witness B repeats that entire ordered observation from fresh lstat/open/fstat/read operations and is independently RFC8785/JCS-canonicalized and digested. Witness B is never derived from or patched with witness A.
3. Equality requires exact canonical witness bytes and digests. A safely observed difference yields `OBSERVATION_DIVERGED`; an unsafe descriptor/path condition keeps the earlier `FILESYSTEM_UNSAFE`, and incomplete/unverifiable evidence keeps `EVIDENCE_UNVERIFIABLE`.
4. The mandatory negative matrix covers both roots independently for owner/type/mode/link/symlink/escape, pre-open replacement, immediate/post fstat mismatch, timestamp-only drift, raw-content/digest drift, component replacement, incomplete read, and malformed evidence. The mandatory multi-fault matrix crosses roots and request/authority/Git/filesystem/evidence/divergence faults to prove the exact shared reason precedence.
5. Complete zero-effect identity compares pre/post canonical Git identity, both root trees and component metadata, descriptor identities, raw content digests, directory entries, state-root presence/absence, lock/journal/pointer/publication bytes when observed, and the complete command/open/read transcript. It proves no file/directory creation, write, chmod/chown/link/unlink/rename/fsync, lock acquisition, ref/worktree/index mutation, fetch, repair, normalization, prune, branch switch, or evidence removal.

M9.1.3 remains inspection-only and returns deeply frozen non-secret plain data. It does not parse persisted evidence into normative state, expose classifications beyond public `UNSAFE`, or introduce lifecycle mutation.

**Safety handoff after M9.1.3:** exact equal complete witnesses prove descriptor-safe dual-root observation but not persisted semantics. The public result remains `UNSAFE` with `SEMANTIC_PROOF_REQUIRED`; it MUST NOT infer `ABSENT`, `OCCUPIED`, or `SAFELY_RETIRED` from caller values, target absence, empty directories, incomplete files, or any partial observation.

### M9.1.4 — Persisted evidence and full classifications

Forecast: **240–310 authored lines; hard cap ≤400**. Complete inspection across M9.1.2–M9.1.4 is **690–900 authored lines**.

Building only on the complete equal M9.1.3 witnesses, this existing outcome retains its semantics unchanged:

1. Parse the current lock, append-only operation events and head, slot pointer, immutable envelope, Jornada evidence, occupancy evidence, assignment evidence when applicable, prior binding, and publication/event lineage through the canonical no-follow descriptor path.
2. Cross-bind every persisted identity against canonical Git/path/request/constructor authority: project, registry revision, repository/common-dir, worktree, branch/ref/full OID, slot/path, prior binding, Jornada identity/revision/state, occupancy, assignment when applicable, input, operation, pointer/envelope, and lineage.
3. Perform two complete, independent canonical observations, including all persisted semantics. A changed witness, incomplete chain, unknown schema/event, contradiction, unsafe component, or unverifiable binding remains `UNSAFE`.
4. Apply the shared stable fail-closed precedence so divergence and a final classification are reachable only after both observations are complete and independently safe. Return exactly `ABSENT`, `SAFELY_RETIRED`, `OCCUPIED`, or `UNSAFE`, with before/after witness digests and stable reasons.
5. Return deeply frozen plain data with zero effects.

M9.1.4 still exposes no `replace` or `recover` behavior and performs no fetch, repair, normalization, directory/file creation, write, persistent lock acquisition, ref/worktree mutation, branch switch, prune, or evidence removal.

## M9.1.5 — Physical evidence, exclusive lifecycle, publication, idempotency, and recovery

The existing lifecycle/evidence/recovery outcome follows the complete M9.1.4 inspection without semantic change. Its forecast remains **175–220 authored lines; hard cap ≤400**.

### Physical evidence layout and exact lock ownership

The following state root is new and will be created only by `replace` after all existing ancestors pass inspection:

```text
<git-common-dir>/control-tower/workspace-slots/v1/
├── mutation.lock
├── operations/<input-hex>/
│   ├── events/<ordinal>-<event-digest>.json
│   └── head.json
├── publications/<slot-id>/<input-hex>.json
└── slots/<slot-id>.json
```

Directories are owner-only `0700`; regular state files are owner-only `0600`, single-link, and opened no-follow. Immutable files use exclusive creation. Pointer replacement uses same-directory temporary creation, file fsync, rename, directory fsync, and readback.

`mutation.lock` is common-dir-wide because branch names and the worktree registry are shared across physical slots. Its canonical payload binds `input_digest`, operation ID, slot ID, owner nonce, process identity/start witness, and creation time. Ownership requires all of:

- successful `O_CREAT|O_EXCL|O_NOFOLLOW` acquisition;
- matching opened-file device/inode and safe owner/mode/type/link count;
- exact canonical payload bytes and owner nonce;
- unchanged binding when re-read before every effect and before release.

PID death or age alone never proves ownership and never authorizes lock deletion. A lock is removed only by the operation that proves the exact file identity, bytes, nonce, and durable recoverable evidence. Mismatch or uncertain unlink preserves the lock and fails closed.

Operation events are append-only immutable observations. `head.json` is only an atomic pointer to an event already fsynced. Unknown events, gaps, competing heads, or unrecognized schema versions are preserved and block mutation.

### Exclusive retire-before-create lifecycle

`replace` follows exactly:

`inspect → lock → inspect → retire → verify retirement → create → verify creation → validate → publish`

1. Reject `OCCUPIED`, `UNSAFE`, stale, divergent, or unverifiable inspection.
2. Create the safe state root if absent, acquire the exact lock, and reinspect under lock.
3. Reconcile only exact same-input operation evidence. Different-input or unknown evidence blocks.
4. Append and fsync a `RETIRING` event before the first Git effect.
5. For an existing slot, run non-forced `git worktree remove <exact-target>` only when target, registry entry, branch, prior binding, clean state, Jornada closure, and occupancy evidence all prove ownership and safe retirement. Never delete the old branch.
6. Verify the target path and its exact worktree registry entry are absent before appending `RETIRED`.
7. Revalidate that requested branch and target are absent, base resolves to the exact full commit OID, unrelated refs/worktrees match the witness, and lock ownership is unchanged.
8. Create with `git worktree add -b <fresh-branch> <target> <full-base-oid>`.
9. Verify exact target, branch, OID, common-dir registration, filesystem identity, and unchanged unrelated refs/worktrees before appending `CREATED`.
10. Validate the combined slot/Jornada result, publish the immutable envelope and slot pointer, then verify lock ownership and release it.
11. Grant launch permission only after envelope/pointer readback and proof that the exact lock is absent. Publication with a retained/uncertain lock remains non-launchable.

Forbidden Git effects include `switch`, branch deletion, forced worktree removal, `reset`, `clean`, `prune`, implicit fetch, and any branch/worktree mutation before verified retirement.

### Immutable publication, idempotency, and recovery

The immutable combined state/receipt envelope binds:

- full canonical input and `input_digest`;
- authoritative project/registry/common-dir and Jornada identity/revision/state;
- prior slot pointer/envelope digest or proven absence;
- pre-lock, under-lock, retirement, creation, and validation witnesses;
- append-only operation head and event lineage;
- terminal result and publication digest;
- predecessor publication digest for the slot.

The slot pointer contains only the slot ID, envelope path/digest, input digest, and pointer revision. It advances atomically only to a fully validated, durable envelope. Unreferenced or partially published envelopes remain inert evidence and are never deleted automatically.

Recovery always begins with `inspect(request)` and then exact lock/journal/publication observation:

| Observation | Allowed action |
|---|---|
| Exact same-input terminal pointer/envelope, lock absent | Replay the proven result without mutation. |
| Exact owned `RETIRING`, old slot still exactly present | Revalidate and retry only the non-forced retirement. |
| Exact verified `RETIRED`, requested branch and target absent | Continue creation at the exact full base OID. |
| Same-operation fresh branch at exact base, target absent | Attach that exact operation-owned branch; do not delete/recreate it. |
| Exact created branch/target, publication absent | Revalidate and publish once. |
| Exact durable publication with exact owned lock retained | Revalidate publication, remove only that proven lock, then evaluate launch. |
| Different input, stale/partial lineage, unknown file/ref/worktree/lock, contradiction, or uncertain effect | Return a stable recovery-blocked/effect-unknown result and preserve everything. |

Only temporary files whose path, digest, event lineage, and owner nonce prove exact operation ownership may be neutralized. Unknown branches, worktrees, files, locks, journals, pointers, and publications are preserved. Recovery never starts a second mutation path.

## M9.1.6 — Private constructor-bound plugin composition

The existing private-composition outcome shifts position without semantic change. Its forecast remains **55–85 authored lines; hard cap ≤400**.

`plugin/tower-spike.js` remains the sole composition owner authorized by Engram 8645/8646:

- The trusted initializer supplies the opaque read-only Jornada/occupancy resolver at construction, alongside the existing trusted binding provider.
- The plugin rederives and compares Main/session binding before and after resolver use, then closes the verified resolver into `createPhysicalSlotLifecycle`.
- Operation request data can select what to inspect but cannot supply authority or override resolver output.
- The composed lifecycle remains private. `TowerSpikePlugin` still returns exactly the Support tool, `dispose`, and `event`; it adds no Workspace tool or callable recycle surface.
- No new `main-store/**` import/read/write is introduced for slot composition. Support behavior remains isolated and unchanged.
- Resolver/capability/function values never enter argv, environment, JSON, Support prompts/results, Workspace state, logs, events, envelopes, or error details.

Composition does not imply successful external reachability. The shell wrapper cannot invoke it in S9.1.

## V2 canonical successors and external precedence

The three existing canonical-document outcomes shift position without changing content, dependency, path, forecast, cap, publication order, or rollback semantics:

- **M9.1.7 — V2 RFC successor**: create `openspec/rfc/sdd-tower-implementation-v2.md`; hard cap 240.
- **M9.1.8 — V2 requirements successor**: create `openspec/specs/sdd-tower-implementation-v2-requirements.md`; hard cap 240.
- **M9.1.9 — External V2 ArtifactRefs, bounded precedence, provenance guard, and integral verification**: publish the external provenance/precedence outcome and own final integral verification; hard cap 160.

The two standalone successors define S9.1 safe-slot architecture and requirements, respectively. They do not edit, normalize, copy over, or repair either V1 file. They do not contain their own source commit/digest or an ArtifactRef to themselves.

`openspec/plans/sdd-tower-implementation/manifest.yaml` remains schema version 1. Its existing `artifact_refs.rfc` and `artifact_refs.requirements` mappings stay exact, including source commit `0745f99a3d9ab7f9c3676af4d1ca3adf0f0c5c95` and digests `sha256:a6272899bf76c141850ea1c38444d303b7dfcc84e1f7351c95bffb8557c82cce` and `sha256:277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0`.

After each V2 document exists in a predecessor commit, increment the manifest artifact revision and add only:

```yaml
extensions:
  control-tower/s9-1-canonical-successors:
    scope_id: s9-1-safe-slot-lifecycle
    governing_refs:
      rfc: <raw-byte ArtifactRef to the committed V2 RFC>
      requirements: <raw-byte ArtifactRef to the committed V2 requirements>
    precedence:
      governs: [<V2 RFC artifact_id>, <V2 requirements artifact_id>]
      preserves: [sdd-tower-implementation-v1-rfc, sdd-tower-implementation-v1-requirements]
```

Each V2 ArtifactRef uses its actual predecessor source commit and raw-byte digest. This sequencing avoids commit/document self-reference. Precedence is bounded to `s9-1-safe-slot-lifecycle`; it does not rewrite unrelated Plan-manifest authority. V2 governs that scope, while V1 remains immutable historical authority. After canonical publication, corrections move forward and must preserve V2 precedence and exact V1 refs.

## Planned file effects

| Path | Effect |
|---|---|
| `jornada.sh` | Existing: install early unavailable interlock; remove legacy recycler; reconcile recycle help. |
| `test/jornada/reciclar.test.mjs` | **Create:** prove unavailable precedence and zero commands/filesystem/lock effects. |
| `workspace/slot-lifecycle.mjs` | Existing invalid candidate: preserve during planning; after separate authorization, discard/rewrite to implement inspection, exact lock/evidence, ordered lifecycle, publication, idempotency, and recovery. |
| `test/workspace/slot-lifecycle.test.mjs` | Existing invalid candidate: preserve during planning; after separate authorization, discard/rewrite with real temporary Git fixtures, event ordering, mutation witnesses, and failure injection. |
| `plugin/tower-spike.js` | Existing: private constructor-bound composition only; unchanged returned surface. |
| `test/plugin/tower-spike.test.mjs` | Existing: preserve Support tests; prove no authority leakage or new reachability. |
| `openspec/rfc/sdd-tower-implementation-v2.md` | **Create:** canonical S9.1 RFC successor. |
| `openspec/specs/sdd-tower-implementation-v2-requirements.md` | **Create:** canonical S9.1 requirements successor. |
| `openspec/plans/sdd-tower-implementation/manifest.yaml` | Existing: preserve exact V1 refs; add bounded namespaced V2 refs/precedence. |
| `test/workspace/s9-1-provenance.test.mjs` | **Create:** V1 byte/digest guard, V2 no-self-reference, schema-valid extension, exact refs/precedence. |

Both V1 documents are read-only inputs and are never planned write targets. No schema, package, `core.mjs`, `mcp.mjs`, `main-store/**`, `.opencode/**`, host, public API, executable, or entrypoint path is added.

## Ordered direct-commit/Módulo boundaries and ≤400-line guard

S9.1 has exactly nine ordered direct-commit/Módulo boundaries under the repository's direct-push/no-PR policy. They are Módulos inside the existing Sesión, not extra plan levels. Every boundary records authored additions plus deletions, is independently verifiable and revertible subject to the frozen floor, and stays at or below 400 with no exception.

| Order | Módulo | Independently verifiable result | Forecast / actual | Dependency and rollback boundary |
|---:|---|---|---:|---|
| 1 | M9.1.1 | One-way wrapper interlock and legacy recycler removal | **actual 117** | Frozen `✅ COMPLETO` Engram 8908/8894 floor; forward correction only, never restore legacy bytes. |
| 2 | M9.1.2 | **Canonical request, authority, and Git evidence foundation** | **220–290; hard ≤400** | Depends on M9.1.1. Revert removes only this foundation while M9.1.1 remains fail-closed. Filesystem and persisted semantics remain public `UNSAFE`; internal handoff may be `FILESYSTEM_PROOF_REQUIRED`. |
| 3 | M9.1.3 | **Descriptor-safe dual-root and complete double observation** | **230–300; hard ≤400** | Depends on M9.1.2. Revert returns to canonical Git evidence. Persisted semantics remain `UNSAFE`/`SEMANTIC_PROOF_REQUIRED`; no classifications or mutation surface exist. |
| 4 | M9.1.4 | **Persisted evidence and full classifications** | **240–310; hard ≤400** | Existing semantics shifted only position; depends on complete M9.1.3 witnesses. Revert returns to descriptor-safe inspection. |
| 5 | M9.1.5 | Exact lock, retire-before-create, immutable publication, idempotency, and recovery | **175–220; hard ≤400** | Existing lifecycle/recovery semantics shifted only position; depends on complete M9.1.4 inspection. Revert removes mutating library behavior while M9.1.1 remains fail-closed. |
| 6 | M9.1.6 | Private constructor-bound plugin composition, no returned-surface change | **55–85; hard ≤400** | Existing semantics shifted only position; dependency, paths, and rollback remain unchanged except dependency now follows M9.1.5. |
| 7 | M9.1.7 | V2 RFC successor | **hard cap 240** | Existing semantics shifted only position. Before manifest publication it can be reverted without changing V1 or runtime. |
| 8 | M9.1.8 | V2 requirements successor | **hard cap 240** | Existing semantics shifted only position. Existing order and predecessor-commit publication semantics remain unchanged. |
| 9 | M9.1.9 | External V2 ArtifactRefs, bounded precedence, provenance guard, and integral verification | **hard cap 160** | Existing semantics shifted only position. After publication, correction is forward-only and preserves V2 governance and exact V1 refs. |

### Aggregate forecast derivation

- Complete inspection: M9.1.2 `220–290` + M9.1.3 `230–300` + M9.1.4 `240–310` = **690–900**.
- Actual+ranged runtime subtotal: M9.1.1 `117` + M9.1.2 `220–290` + M9.1.3 `230–300` + M9.1.4 `240–310` + M9.1.5 `175–220` + M9.1.6 `55–85` = **1,037–1,322 authored lines**.
- Cap-only M9.1.7–M9.1.9 maximum: `240 + 240 + 160 = 640`.
- Aggregate hard ceiling: **1,962 authored lines** (`1,322 + 640`). There is no cap-only minimum, so no aggregate minimum beyond the actual+ranged runtime subtotal is claimed.

This remains one coherent S9.1 Sesión because each sequential Módulo produces an independently testable safe state and all later outcomes retain the M9.1.1 floor. The maintainer explicitly authorized this second canonical split on 2026-08-17: no new Sesión, fifth level, size exception, PR, semantic leakage into M9.1.2/M9.1.3, or lifecycle deferral is permitted.

## Verification contract

No tests are run during design.

- `bun test test/jornada/reciclar.test.mjs`: fake PATH commands and filesystem sentinels prove `--reciclar` returns before every side effect; static reachability checks reject legacy recycler argv.
- M9.1.2 focused verification in `test/workspace/slot-lifecycle.test.mjs`: temporary real repositories prove the exact closed request/OID/ref/branch grammar, scalar-only authority confinement, fixed executable and exact finite argv allowlist with `GIT_OPTIONAL_LOCKS=0`, strict duplicate rejection, all root/common-dir/worktree/HEAD/branch/ref/base commit+tree cross-bindings, requested branch absence, deep freezing, complete Git zero-effect identity, and mandatory negative/multi-fault precedence matrices. Filesystem and persisted semantics remain public `UNSAFE`.
- M9.1.3 focused verification in the same test file: both repository-target and external common-dir roots independently cover owner/type/mode/link/symlink/escape and the exact pre-lstat/open-no-follow/immediate-fstat/raw-read+digest/post-fstat/post-lstat order; behavioral drift cases include pre-open replacement, descriptor mismatch, timestamp-only drift, content/JCS drift, cross-root faults, complete independent RFC8785/JCS witnesses, deterministic equality/divergence, complete zero-effect identity, and mandatory negative/multi-fault precedence. Persisted semantics remain `UNSAFE`/`SEMANTIC_PROOF_REQUIRED`.
- M9.1.4 focused verification in the same test file: fixtures bind lock/events/head, pointer/envelope, Jornada, occupancy, assignment when applicable, prior binding, and lineage; two independent complete persisted observations prove exact `ABSENT|SAFELY_RETIRED|OCCUPIED|UNSAFE` classification with the shared reason precedence and zero effects.
- M9.1.5 verification in the same test file preserves exact lock ownership, retire-before-create ordering, fresh branch/full OID, unrelated-state preservation, atomic publication, same-input replay, and failure recovery.
- M9.1.5 failure injection covers lock creation/readback/release, every event write/fsync/head advance, worktree removal and verification, branch/worktree creation and verification, envelope write/fsync/rename, pointer advance/readback, and retained unknown evidence.
- `bun test test/plugin/tower-spike.test.mjs`: existing Support guarantees stay green; returned keys remain unchanged; no caller/env/Support/Workspace substitution or serialization exists.
- `bun test test/workspace/s9-1-provenance.test.mjs`: exact V1 bytes/digests remain unchanged; manifest validates as `planManifest`; V2 refs resolve to predecessor commits/raw-byte digests; precedence is scope-bounded; V2 documents do not self-reference.
- Final integral check: `bun test` on the exact post-normalization bytes. No source-mutating formatter or generator runs after this check.

## Separate successful-recycling Sesión constraints

Planificador-granular must enumerate successful recycling separately. S9.1 supplies constraints only:

- choose transport through explicit maintainer authority because it may affect visible contract, public API, security/permissions, or scope;
- retain the fail-closed wrapper until a separately authorized cutover;
- use this library's exact `inspect → retire → create` lifecycle as the sole mutation path;
- never restore or duplicate the legacy shell mutator, switch an occupied worktree, delete an old branch automatically, or force-remove unknown content;
- never serialize Main authority or accept authority from argv, environment, request JSON, Support, Workspace state, or caller context;
- preserve same-input idempotency, observation-first recovery, exact lock ownership, immutable publication, and unknown evidence;
- define its own Área, Recurso, tests, line forecast, work-unit boundaries, and rollback/cutover proof;
- do not infer its transport, implementation paths, or entrypoint from this design.

No unresolved always-escalate decision remains inside the S9.1 design boundary. A future successful-recycling transport decision belongs to that separate Sesión and does not block S9.1 planning.

## Invalid candidate evidence and rewrite boundary

The current terminal M9.1.2 candidate is diagnosis evidence only, is explicitly marked **discard/rewrite-before-future-RED**, and remains untouched during this planning phase:

| Path | SHA-256 |
|---|---|
| `workspace/slot-lifecycle.mjs` | `c8ff86c82905b5543fce201797c5e6108034b693044823a05e015e7e8869cb26` |
| `test/workspace/slot-lifecycle.test.mjs` | `bfcd652b6f494f9072138ee9163d17aaa5ca25bcf491243cf41a69f69c448776` |

The candidate totals 181 authored lines. Terminal verification Engram 8950 and feasibility Engram 8955 preserve it as immutable diagnosis evidence. Existing task checkboxes and operational progress remain unchanged. These bytes are not authorized for continuation and MUST be explicitly discarded/rewritten before any future RED. A future implementation may discard or rewrite them only from a newly approved rewrite boundary after separate maintainer authorization; the hashes remain the immutable diagnosis reference for that decision.

## Handoff

The design is ready only for a fresh read-only design gate. The gate must verify the exact M9.1.2 request/authority/Git foundation, M9.1.3 descriptor-safe dual-root complete double observation, unchanged M9.1.4 persisted classifications, shifted M9.1.5–M9.1.9 semantics, exact reason precedence and handoffs, nine-boundary order, hard ≤400 caps, aggregate derivation, frozen M9.1.1 floor, terminal-candidate rewrite requirement, no external reachability, immutable V1 provenance, and separate successful-recycling scope.

If the design gate passes, the next state is `await-task-reconciliation`. Implementation is **not authorized**. Do not edit tasks, begin RED, discard/rewrite the terminal candidate, change code/tests, clean up, commit, push, deliver, mutate Tower state, or contact an implementer without the later explicit authorization.
