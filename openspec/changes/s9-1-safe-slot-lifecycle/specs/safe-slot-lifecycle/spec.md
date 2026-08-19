# Safe Slot Lifecycle Specification

## Purpose

Define S9.1's one-way fail-closed compatibility boundary and transport-independent safe slot lifecycle. Successful external recycling is not part of this specification.

## Requirements

### Requirement: Fail-closed `--reciclar` compatibility interlock

`jornada.sh --reciclar` MUST remain recognized compatibility syntax and MUST return a stable, explicit non-zero unavailable result before fetch, discovery, diagnostics, resolver use, Git operations, filesystem operations, persistent lock acquisition, or any other side effect. S9.1 MUST NOT provide an external invocation route, delegation, or successful recycling result for this syntax.

#### Scenario: Wrapper is invoked

- GIVEN a caller invokes `jornada.sh --reciclar`
- WHEN the wrapper parses the recognized compatibility syntax
- THEN it MUST return the unavailable result before every side effect
- AND it MUST NOT mutate a branch, worktree, ref, lock, file, state record, journal, or publication
- AND it MUST NOT invoke an in-process capability or external transport.

### Requirement: Legacy recycle mutation is unreachable

S9.1 MUST remove or make unreachable `git switch -c`, `branch -D`, and every equivalent legacy recycle mutation path. `jornada.sh` MUST NOT contain a fallback, second mutation path, automatic branch deletion, occupied-worktree branch switch, force removal, or successful delegation for recycling.

#### Scenario: Compatibility path is evaluated after legacy removal

- GIVEN S9.1's compatibility interlock is present
- WHEN `--reciclar` is invoked or its reachable paths are inspected
- THEN no legacy recycle mutator or equivalent mutation path MUST be reachable
- AND the wrapper MUST NOT fall back to a second path.

### Requirement: One-way safety-baseline correction

The first S9.1 interlock is a one-way safety baseline. A direct revert or any correction MUST NOT restore unsafe legacy recycle behavior. Corrections and rollback of later S9.1 units MUST be forward-only when needed to retain the fail-closed wrapper and the absence of every legacy mutation route.

#### Scenario: A correction is needed after the baseline

- GIVEN an S9.1 change requires correction or rollback
- WHEN the resulting tree is selected
- THEN it MUST retain the explicit fail-closed `--reciclar` behavior
- AND it MUST NOT restore `git switch -c`, `branch -D`, or an equivalent legacy recycler.

### Requirement: Transport-independent read-only inspection

The lifecycle MUST canonically bind project, Git common-dir, worktree, branch, Jornada, occupancy, physical slot, lock, and persisted-evidence identities before mutation. Inspection MUST be transport-independent and read-only: it MUST NOT repair, normalize, fetch, write, mutate refs or worktrees, switch branches, or acquire a persistent lock.

#### Scenario: Inspection evidence agrees

- GIVEN all required identities and safety evidence agree
- WHEN inspection runs
- THEN it MUST return a classified result including `ABSENT`, `SAFELY_RETIRED`, `OCCUPIED`, or `UNSAFE` as applicable
- AND its before and after witnesses MUST be identical.

#### Scenario: Inspection evidence is unsafe or unverifiable

- GIVEN a required identity or evidence item is missing, ambiguous, contradictory, stale, unsafe, or unverifiable
- WHEN inspection runs
- THEN it MUST fail closed with observable witnesses
- AND it MUST perform zero mutation.

### Requirement: Exclusive verified lifecycle ordering

An in-process caller with authoritative context MAY invoke the transport-independent lifecycle only in this exclusive order: `inspect → lock → inspect → retire → verify retirement → create → verify creation → validate → publish`. Retirement MUST be complete and verified before creation begins. Creation MUST use a fresh branch and physical worktree at the exact full base OID.

#### Scenario: Retire and create succeed

- GIVEN inspection classifies the slot as safely retireable and the exact operation lock is owned
- WHEN the lifecycle replaces the slot
- THEN it MUST verify retirement before creating a fresh branch or worktree
- AND it MUST verify creation and validation before publication.

#### Scenario: Retirement cannot be verified

- GIVEN retirement is partial, unknown, or unverified
- WHEN the lifecycle evaluates creation
- THEN it MUST NOT create a branch or worktree
- AND it MUST preserve unknown evidence and fail closed.

### Requirement: Immutable evidence and launch gating

Before launch permission, the lifecycle MUST durably publish a closed combined slot/Jornada state-and-receipt envelope through immutable evidence and an atomic pointer. The envelope MUST bind the exact input, prior binding, retirement and creation witnesses, Jornada state, terminal result, and publication lineage. Partial or durability-unknown publication MUST deny launch and preserve prior valid evidence.

#### Scenario: Publication completes

- GIVEN validation has completed for an exact operation
- WHEN the lifecycle publishes its result
- THEN the immutable envelope and atomic pointer MUST bind the operation's required witnesses and lineage before launch permission is granted.

#### Scenario: Publication durability is uncertain

- GIVEN publication is partial or durability cannot be proven
- WHEN launch permission is evaluated
- THEN launch permission MUST be denied
- AND prior valid evidence and uncertain artifacts MUST be preserved.

### Requirement: Same-input idempotency and observation-first recovery

The canonical input digest MUST bind project, registry, common-dir, slot/path, prior binding, Jornada identity/revision/state, assignment when applicable, requested branch, and full base OID. An exact same-input retry MAY replay a proven terminal result or resume only proven operation-owned partial state after revalidation. Divergent, stale, partial, unknown, or unproven evidence MUST fail closed and MUST NOT reuse prior evidence or repeat mutation blindly.

#### Scenario: Exact retry has proven terminal evidence

- GIVEN the canonical input digest exactly matches a durable proven terminal result
- WHEN the same operation retries
- THEN it MAY replay that terminal result without repeating mutation.

#### Scenario: Retry input or evidence differs

- GIVEN a retry has a different input digest or unknown, stale, partial, or unproven evidence
- WHEN recovery is evaluated
- THEN it MUST inspect or reject before mutation
- AND it MUST NOT reuse the prior operation's evidence.

### Requirement: Partial-failure containment

Only temporary artifacts proven to belong to the exact operation MAY be neutralized automatically. Unknown branches, worktrees, files, locks, journals, state, and publications MUST be preserved. The exact operation lock MUST be released only after durable recoverable evidence exists; otherwise it MUST remain as fail-closed evidence.

#### Scenario: A lifecycle operation partially fails

- GIVEN a Git, filesystem, or publication step fails partway through an operation
- WHEN recovery evaluates the remaining artifacts
- THEN it MUST preserve every artifact not proven operation-owned
- AND it MUST not begin a second mutation path.

### Requirement: Constructor-bound authority has no external reachability

`plugin/tower-spike.js` MUST remain the sole approved composition owner for the constructor-bound, read-only Main/Jornada capability after trusted Main/session verification. That authority MUST NOT be serialized, exposed, or accepted from argv, environment, request JSON, Support output, Workspace state, or caller-controlled context. S9.1 MUST NOT create an external command, API, IPC, executable, entrypoint, authority bootstrap, or other external reachability claim.

#### Scenario: Composition is inspected

- GIVEN the approved plugin composition binds a read-only capability
- WHEN its authority boundary is evaluated
- THEN the capability MUST be constructor-bound after trusted verification
- AND no caller-substitutable or serialized authority or external invocation surface MUST exist.

### Requirement: V2 canonical successors and immutable V1 provenance

S9.1 MUST publish safe-slot lifecycle amendments through `openspec/rfc/sdd-tower-implementation-v2.md` and `openspec/specs/sdd-tower-implementation-v2-requirements.md`. V2 MUST govern S9.1 safe-slot lifecycle scope. `openspec/rfc/sdd-tower-implementation-v1.md` and `openspec/specs/sdd-tower-implementation-v1-requirements.md` MUST remain byte-for-byte immutable read-only provenance inputs. `openspec/plans/sdd-tower-implementation/manifest.yaml` MUST externally preserve V1 references to source commit `0745f99a3d9ab7f9c3676af4d1ca3adf0f0c5c95`, RFC digest `sha256:a6272899bf76c141850ea1c38444d303b7dfcc84e1f7351c95bffb8557c82cce`, and requirements digest `sha256:277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0`, while adding external V2 references and V2 precedence. Both V2 documents MUST NOT self-reference.

#### Scenario: Canonical documents are reconciled

- GIVEN S9.1 publishes its safe-slot lifecycle documentation
- WHEN the V2 successors and manifest are evaluated
- THEN V2 MUST be canonical for the S9.1 scope
- AND each V1 source commit and content digest MUST be exactly referenced externally in the manifest
- AND neither V1 file MUST change
- AND both V2 documents MUST NOT self-reference.

### Requirement: Successful recycling remains outside S9.1

S9.1 MUST NOT select or introduce a transport, paths, implementation, tests, or authority serialization for successful recycling. Successful `--reciclar` behavior MUST remain pending separate authorization and `planificador-granular` enumeration as a separate Sesión.

#### Scenario: A successful external recycle is requested

- GIVEN a caller or later plan requests successful external recycling
- WHEN the request is considered under S9.1
- THEN S9.1 MUST return no successful delegation behavior
- AND the work MUST be deferred to a separately authorized and enumerated Sesión.

## Planning and delivery constraint

The hard limit of at most 400 authored additions plus deletions applies to each independently verifiable and revertible direct-commit unit. This is a planning and delivery constraint, not runtime lifecycle behavior. Before task planning, the 390–520 authored-line transport-independent forecast MUST be split into coherent direct-commit boundaries or the work MUST be split into additional Sesiones; no size exception or fifth planning level is permitted.
