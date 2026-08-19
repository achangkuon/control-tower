# S9.1 — One-Way Safe Slot Baseline, Transport-Independent Lifecycle, and V2 Canonical Successors

## Decision

S9.1 is narrowed to four outcomes:

1. Replace the unsafe legacy `jornada.sh --reciclar` mutator with a **one-way fail-closed interlock**.
2. Build the transport-independent safe physical-slot inspection and lifecycle library.
3. Compose only the already-approved constructor-bound, read-only Main/Jornada authority inside `plugin/tower-spike.js`.
4. Keep `jornada.sh --reciclar` as compatibility syntax that returns an explicit non-zero unavailable result before any side effect.

S9.1 authorizes **no executable transport and no successful `--reciclar` delegation**. It MUST NOT introduce IPC, a command, an executable, a public tool/API, another entrypoint, serialized Main authority, or caller/environment-substitutable authority. Successful recycling retains the eventual `inspect → retire → create` compatibility semantics from Engram 8506, but is explicitly outside S9.1 and must be enumerated by `planificador-granular` as a separately authorized Sesión. This proposal does not choose that Sesión's final transport, paths, or implementation.

The first fail-closed interlock is an explicitly authorized one-way safety baseline. Direct revert MUST NOT restore the unsafe legacy mutator; rollback and correction are forward-only and must preserve fail-closed behavior.

This artifact authorizes planning only. It does not authorize tasks, RED, implementation, tests, commits, pushes, delivery, or changes to Plan status.

## Authority

| Authority | Binding outcome |
|---|---|
| Engram 8478 revision 8 | Authorizes Plan 9 and the original S9.1 safe-slot objective. |
| Engram 8506 | Defines eventual successful compatibility semantics as the sole `inspect → retire → create` mutation path, fail-closed, with no occupied-worktree branch switch, automatic branch deletion, or second legacy mutator. |
| Engram 8645 and 8646 | Authorize `plugin/tower-spike.js` as composition owner for a constructor-bound read-only Jornada/occupancy capability; they do not authorize external transport. |
| Engram 8647 revision 2 | Selects no executable transport in S9.1. Compatibility syntax remains but fails closed; successful recycling moves to a separate Sesión. |
| Engram 8894 | Authorizes the first interlock as a one-way safety baseline and prohibits rollback that restores the unsafe legacy mutator. |
| Engram 8898 | Preserves both V1 canonical documents byte-for-byte and authorizes V2 canonical successors for S9.1, with explicit external references to each exact V1 source commit and content digest. |

The later maintainer decisions supersede the earlier two-Sesión assumption only to the extent required to enumerate successful recycling separately. This proposal does not invent that Sesión's ID or scope. Engram 8898 resolves the immutable-provenance publication boundary: V2 governs S9.1 safe-slot lifecycle scope, while V1 remains immutable historical authority.

## Intent and product outcome

The current shell-owned recycle path can mutate an occupied worktree through unsafe legacy commands. S9.1 first removes that operational hazard, then provides a safe library whose mutation authority, evidence, failure behavior, and retry semantics can be verified without pretending an external shell can invoke trusted in-process Main authority.

After S9.1:

- `jornada.sh --reciclar` still parses as recognized compatibility syntax but fails explicitly before fetch, discovery, diagnostics, Git, or filesystem effects;
- the unsafe `git switch -c`, `branch -D`, and any equivalent legacy recycle mutation path are absent or unreachable;
- canonical slot inspection is read-only and fail-closed;
- the library can perform verified retire-before-create lifecycle operations only when invoked in-process with authoritative context;
- exact state and immutable receipt evidence are durably published before any launch permission;
- the approved plugin composition cannot serialize, expose, or accept caller substitutes for Main authority;
- no external successful recycling path exists in S9.1;
- the S9.1 safe-slot lifecycle amendments are published only through the V2 RFC and V2 requirements successors;
- both V1 documents remain byte-for-byte unchanged and are referenced through external provenance records containing their exact source commit and content digest.

## Scope

### In scope

- An early, stable, non-zero `--reciclar` compatibility interlock before every side effect.
- Removal or disabling of the legacy shell mutator with no hidden fallback or second mutation path.
- Read-only canonical inspection of project, Git common-dir, worktree, branch, Jornada, occupancy, physical slot, lock, and persisted evidence.
- A transport-independent library for exclusive `inspect → lock → inspect → retire → verify retirement → create → verify creation → validate → publish` behavior.
- Exact-operation locks, journals, partial-failure containment, recovery, and immutable evidence.
- Same-input idempotency bound to canonical inputs; divergent, stale, partial, or unknown evidence fails closed.
- Atomic publication of a closed combined slot/Jornada state-and-receipt envelope before launch permission.
- Constructor-bound composition in `plugin/tower-spike.js` only where Engram 8645/8646 already authorize it, after trusted Main/session verification and without an external invocation claim.
- Canonical S9.1 amendments in `openspec/rfc/sdd-tower-implementation-v2.md` and `openspec/specs/sdd-tower-implementation-v2-requirements.md`.
- External ArtifactRef publication in `openspec/plans/sdd-tower-implementation/manifest.yaml`, preserving the exact V1 source commit and content digests while adding V2 canonical references and precedence without self-reference.
- Plan 9 Area and acceptance reconciliation so the V2 successors and canonical manifest are writable and both V1 documents are read-only provenance inputs.

### Explicitly out of scope

- Any executable route from external `jornada.sh` into the plugin process.
- Successful `jornada.sh --reciclar` behavior or delegation.
- IPC, sockets, pipes, process servers, host-private commands, binaries, package scripts, public tools/APIs, new entrypoints, or authority bootstraps.
- Serializing Main authority or accepting authority from argv, environment, request JSON, Support output, Workspace state, or caller context.
- Selecting the transport, Area, tests, or implementation of the separately authorized successful-recycling Sesión.
- Editing, repairing, normalizing, or replacing `openspec/rfc/sdd-tower-implementation-v1.md` or `openspec/specs/sdd-tower-implementation-v1-requirements.md`.
- Supplements, in-place V1 amendments, self-referential provenance, or any precedence rule that lets V1 override V2 for the S9.1 safe-slot lifecycle scope.
- S9.2 cache semantics, S1.12, S5.8, S3.5, S3.6, Tower runtime, DB/SQLite, or Main-store changes.
- Tasks, code, tests, commits, pushes, PRs, or delivery.

## Affected areas and exclusions

**Writable Area:** `workspace/**`, `jornada.sh`, `test/workspace/**`, `test/jornada/**`, `plugin/tower-spike.js`, `test/plugin/tower-spike.test.mjs`, `openspec/rfc/sdd-tower-implementation-v2.md`, `openspec/specs/sdd-tower-implementation-v2-requirements.md`, and `openspec/plans/sdd-tower-implementation/manifest.yaml` for external ArtifactRefs and V2 precedence only.

**Read-only provenance inputs:** `openspec/rfc/sdd-tower-implementation-v1.md` and `openspec/specs/sdd-tower-implementation-v1-requirements.md`. S9.1 may read and digest these files but MUST preserve their bytes exactly. The current external ArtifactRefs in `openspec/plans/sdd-tower-implementation/manifest.yaml` bind both V1 files to source commit `0745f99a3d9ab7f9c3676af4d1ca3adf0f0c5c95`, with RFC digest `sha256:a6272899bf76c141850ea1c38444d303b7dfcc84e1f7351c95bffb8557c82cce` and requirements digest `sha256:277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0`. Future Plan 9 Area reconciliation must include the writable V2 and manifest paths and exclude both V1 paths from writable scope.

**Prohibited:** both V1 files as write targets; unrelated manifest changes; `core.mjs`, `mcp.mjs`, `main-store/**`, `.opencode/plugins/**`, every other `plugin/**` or `test/plugin/**` path, `hosts/**`, S1.12/S5.8 roots, public APIs, and every path outside writable Area. The exact `plugin/tower-spike.js` path may bind only the approved constructor-bound read-only capability; it may not read, expose, or modify Main-store internals.

**Resource:** Git common-dir/worktree registry, physical-slot state root, and exclusive slot-mutation lock.

No future transport path is silently added to Area. Any scope needed for successful recycling belongs to its separately authorized Sesión. The canonical manifest is the external provenance owner already evidenced by V1; spec/design must define its additive V2 references and precedence while preserving the exact V1 references. This does not authorize modifying V1 or inventing self-reference.

## Safety and authority invariants

1. The compatibility interlock runs before fetch, discovery, diagnostics, resolver use, Git, filesystem writes, or persistent lock acquisition.
2. No path switches branches in an occupied worktree, automatically deletes a branch, force-removes unknown content, or restores the legacy mutator.
3. Inspection performs no repair, normalization, fetch, write, ref/worktree mutation, or persistent lock acquisition.
4. Missing, ambiguous, contradictory, unsafe, stale, or unverifiable identity/evidence fails closed with zero mutation.
5. Retirement is complete and verified before fresh branch/worktree creation begins.
6. Creation uses a fresh branch and physical worktree at the exact full base OID; unknown branches, worktrees, files, locks, journals, state, and publications are preserved.
7. Only exact operation-owned temporary artifacts may be neutralized automatically.
8. Immutable envelopes and atomic pointers bind the exact input, prior binding, retirement and creation witnesses, Jornada state, terminal result, and publication lineage before launch permission.
9. Exact same-input retries may replay or resume only proven operation-owned state. Different or unknown inputs never reuse prior evidence.
10. `plugin/tower-spike.js` remains the sole approved composition owner. Constructor-bound authority is neither serialized nor caller-substitutable and creates no external invocation surface.
11. `jornada.sh` has no second mutator, no fallback, and no successful delegation in S9.1.
12. Both V1 canonical documents and all other revision-1 provenance bytes MUST NOT be edited, repaired, normalized, or synthesized in place.
13. V2 is canonical for the S9.1 safe-slot lifecycle scope and MUST reference each exact V1 source commit and content digest through an external provenance record; V2 MUST NOT self-reference.

## Rollback and recovery

The interlock establishes a one-way safety baseline. A direct `git revert` that restores `git switch -c`, `branch -D`, or any equivalent legacy recycle behavior is prohibited even if it would mechanically restore the parent tree. Corrections must move forward while preserving the explicit fail-closed wrapper.

Later transport-independent library or composition units may be reverted only when the resulting tree still retains that fail-closed wrapper and no legacy mutation route. V2 documentation corrections must also move forward: rollback must never modify V1 or make V1 the governing authority for S9.1 safe-slot lifecycle scope. Runtime recovery is observation-first: exact terminal evidence may replay, exact owned partial state may resume after revalidation, and contradictory or unknown evidence is preserved while the operation fails closed.

## Proposal-level workload forecast

Executable transport and successful compatibility delegation are excluded. This remains the honest transport-independent implementation forecast; it does not fabricate a line count for authoring the V2 successors or their external manifest references, which remain subject to the same hard ≤400 authored-line rule.

| Independently verifiable outcome | Forecast, authored additions + deletions |
|---|---:|
| One-way fail-closed interlock and legacy mutator removal | 55–80 |
| Read-only canonical inspection and zero-mutation witnesses | 105–135 |
| Exclusive lifecycle, journal, publication, idempotency, and recovery | 175–220 |
| Approved constructor-bound in-process composition, with no external invocation | 55–85 |
| **Transport-independent subtotal** | **390–520** |

The subtotal has a real **>400 authored-line risk** and cannot be treated as one direct commit. Project policy requires sequential direct commits of at most 400 authored lines, each independently verifiable and revertible subject to the one-way safety-baseline rule. Before tasks, planning must define coherent commit boundaries. If S9.1 cannot remain coherent under those boundaries, `planificador-granular` must split the work into additional Sesiones rather than create a fifth level or a silent size exception.

Successful recycling is not part of this subtotal. It must be enumerated as a separate Sesión before its own forecast, Area, and commit boundaries can be claimed.

## Risks

- **Safety regression:** a revert or fallback could restore the unsafe mutator. Mitigation: one-way baseline, forward-only correction, and a hard no-legacy-second-path invariant.
- **Authority leakage:** composition could serialize or accept caller-supplied Main authority. Mitigation: constructor binding after trusted Main/session verification only.
- **False integration claim:** library composition could be mistaken for external executable reachability. Mitigation: no cross-process edge, command, API, executable, or successful wrapper delegation in S9.1.
- **Partial-effect ambiguity:** Git or filesystem failure could leave uncertain state. Mitigation: exact lock/journal evidence, verified retire-before-create ordering, immutable publication, and fail-closed recovery.
- **Retry divergence:** stale evidence could be reused for a different operation. Mitigation: canonical full-input digest and exact same-input replay only.
- **Workload overflow:** the 390–520 subtotal may exceed one independently revertible direct commit. Mitigation: explicit commit boundaries and, if coherence requires it, additional Sesiones before tasks.
- **Canonical-document provenance drift:** an implementation could accidentally edit V1, omit exact provenance, self-reference V2, or leave Plan 9 Area pointing at V1 as writable. Mitigation: byte-for-byte V1 exclusion, writable V2 successors, external exact source-commit/content-digest references, explicit V2 precedence for S9.1, and Plan 9 Area/acceptance reconciliation.

## Success criteria

The proposal is ready to unblock downstream planning only when all of the following are true:

- [x] No executable transport or successful `--reciclar` delegation is claimed for S9.1.
- [x] Successful recycling is assigned to a separately authorized, not-yet-invented Sesión.
- [x] The interlock is defined as a one-way fail-closed safety baseline with no direct revert to legacy behavior.
- [x] Transport-independent inspection, lifecycle, immutable evidence, idempotency, recovery, and approved composition are bounded explicitly.
- [x] Area exclusions and Main-authority constraints remain exact.
- [x] The >400 forecast risk and Sesión/direct-commit decomposition requirement are explicit.
- [x] Engram 8898 authorizes canonical V2 successors while preserving both V1 files byte-for-byte.
- [x] V2 precedence, external exact V1 provenance references in the canonical manifest, writable Area, V1 read-only exclusions, and downstream Plan 9 reconciliation are explicit.
- [x] No other always-escalate blocker is concretely evidenced by the supplied authority or this proposal reconciliation.

## Resolved decision record — immutable RFC/requirements provenance

**Decision authority:** Engram 8898, topic `plans/p9/s9-1-document-provenance-decision`.

**Resolved outcome:** Preserve `openspec/rfc/sdd-tower-implementation-v1.md` and `openspec/specs/sdd-tower-implementation-v1-requirements.md` byte-for-byte. Publish S9.1 amendments as canonical successors `openspec/rfc/sdd-tower-implementation-v2.md` and `openspec/specs/sdd-tower-implementation-v2-requirements.md`. V2 governs the S9.1 safe-slot lifecycle scope; V1 remains immutable historical authority for prior revision-1 evidence.

**Required provenance:** `openspec/plans/sdd-tower-implementation/manifest.yaml` is the external reference owner. It must preserve the existing V1 references to source commit `0745f99a3d9ab7f9c3676af4d1ca3adf0f0c5c95`, RFC digest `sha256:a6272899bf76c141850ea1c38444d303b7dfcc84e1f7351c95bffb8557c82cce`, and requirements digest `sha256:277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0`, while publishing V2 references and precedence externally. Neither V2 document may self-reference, and neither V1 document may be edited in place.

**Scope effect:** Future Plan 9 Area and acceptance criteria must include the two writable V2 paths and the canonical manifest for this bounded reconciliation, exclude both V1 files from writable scope, and treat V1 only as read-only provenance input. This resolves the prior visible-product-contract and immutable-provenance blocker over S9.1 and the portions of S9.2 that rely on its safe-slot contract.

**Falsifier:** Any S9.1 diff that changes either V1 file, lacks an exact external V1 source-commit/content-digest reference, or treats V1 as governing the S9.1 safe-slot lifecycle violates Engram 8898.

**Resume checkpoint:** reconcile spec and design to this proposal before task planning. No unresolved maintainer decision remains in the proposal inputs.

## Handoff

The transport, one-way safety-baseline, and immutable-provenance blockers are resolved by Engram 8647, 8894, and 8898. The proposal is ready for the spec reconciliation step.

The spec must preserve the no-transport and one-way-baseline semantics, define V2 as canonical for S9.1 with exact external V1 provenance references, and keep successful recycling outside S9.1 for separate `planificador-granular` enumeration. Do not create tasks, begin RED, implement, test, commit, push, or deliver during this handoff. Before any later task planning, validate coherent direct-commit boundaries of at most 400 authored lines; if S9.1 cannot remain coherent, split it into additional Sesiones rather than add a fifth level or claim a size exception.
