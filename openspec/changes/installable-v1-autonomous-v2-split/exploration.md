# Exploration: Installable V1 / Autonomous V2 split

## Executive decision

Create a new Installable V1 product lane and reframe the approved autonomous ecosystem as Autonomous V2. Do not rewrite the approved PRD, RFC, REQUIREMENTS, P6 history, P7/P8 planning, or A–I proposals in place. The safe path is a provenance-preserving split: a small, local-first V1 contract and release plan, followed by an explicit V2 mapping that consumes the valid mechanism and product work already approved.

## Current State

The authoritative checkout is clean at `origin/master` (`a1c75b3`). The current canonical documents call the broad autonomous product “V1”: bounded jornadas, project/plan selection, Policy and Support reports, isolated worktrees, Binding Deltas, OpenCode/Pi fallback, Telegram merge authorization, recovery, and ordered multi-repository campaigns (`openspec/prd/sdd-tower-implementation-v1.md`, `openspec/rfc/sdd-tower-implementation-v1.md`, and `openspec/specs/sdd-tower-implementation-v1-requirements.md`). The master index explicitly treats A–I as the product chain and P6–P11 as its mechanism path.

The repository already contains a useful local Tower, not the complete installable product. `core.mjs` is the single SQLite authority for the legacy queue, agent state, locks, OFF/ACTIVE fail-closed behavior, and the additive continuation schemas through the current P6 evidence. `mcp.mjs` exposes the legacy `tower_*` tools and capability-gated continuation routes. `bin/torre` provides local administration and diagnostics. `install.sh` copies an OpenCode plugin and MCP entry, installs the CLI, and backs up `opencode.json`. Existing tests pass under `bun test` (282 tests, 0 failures, 2,094 assertions; the run emits two benign Git fixture messages).

The current installer is OpenCode-specific and assumes the host is already prepared: it requires `bun`, `git`, and `jq`, requires an existing OpenCode configuration directory, copies from the checkout, and has no immutable release directory, upgrade transaction, rollback command, uninstall path, Pi/Claude detection, project enrollment, folder scaffolding, or OS service integration. `plugin/tower-spike.js` is a legacy OpenCode waker that directly consumes the queue, stops on any deletion event, and can consume before a failed wake. `jornada.sh` contains valuable Git/worktree diagnostics and WSL path conversion, but also contains destructive/recycling actions that are not a safe V1 runtime boundary.

### Canonical terminology and conflicts

| Current canonical term | Current meaning | Conflict with corrected release boundary |
|---|---|---|
| **V1** | Full autonomous, multi-project SDD ecosystem | Must become the historical broad scope of **Autonomous V2**; Installable V1 is a smaller release contract. |
| **Hermes** | Global presentation, registry, Telegram UX, and remote intent surface | Hermes/Telegram must be optional in Installable V1; local operation through Support must be complete without it. |
| **Main Orchestrator** | One authority per project in the broad product | Remains the sole local orchestrator in V1; no global Main or remote worker authority. |
| **Support** | Read-only decomposition/capacity role, described as global within a project | V1 needs an explicit distributable local Support Agent under `Worktrees/`; it must remain read-only and non-authoritative. |
| **Worktrees** | Ephemeral `Worktrees/<plan>/<lane>/<slice>` workspaces for autonomous assignments | V1 needs a physical project layout with `Main/` as owner clone and `Worktrees/` containing Support and workers. The nested ephemeral convention may be retained for workers, but the container/scaffolding contract is currently unspecified. |
| **Jornada/autonomy** | Versioned `short`, `standard`, `extended` execution budgets | Not required for the first installable release; bounded autonomous continuation belongs to V2 unless a smaller V1 subset is explicitly approved. |
| **Host Launcher/failover** | Launch, heartbeat, stop proof, `host_epoch`, and exclusive OpenCode → Pi recovery | Host integration/detection is needed in V1, but autonomous launch/failover authority is a V2 concern. Do not conflate “detected/integrated” with “autonomously orchestrated.” |
| **Telegram merge authorization** | Required V1 acceptance surface in the current PRD/REQUIREMENTS | Optional V1 interface; exact authorization, merge, and replay guarantees remain valid V2 contracts and may form an optional V1 extension only after separate approval. |
| **A–I product changes** | Nine broad product slices, ending in multi-project conformance | Preserve as approved history and reframe as V2 work; extract only the minimum registry/workspace/diagnostic pieces explicitly needed by V1. |
| **P6–P11 mechanism path** | Plan-agnostic continuation substrate and host adapters | Preserve as valid mechanism history. It should be consumed by V2 and only reused by V1 where the existing local Tower contract is already sufficient. |

## Minimal truthful Installable V1 boundary

Installable V1 should promise a reliable local installation and operation path, not autonomous jornadas. The release boundary should include:

1. **Versioned installation:** a supported CLI/bootstrap for Linux, WSL, and macOS that installs an immutable runtime release, records the active version, and supports idempotent install/upgrade/rollback/uninstall.
2. **Host detection and integration:** detect Bun, Git, and available OpenCode, Pi, and Claude installations; report capabilities and versions; install or update only the integrations that are present or explicitly requested; never treat a missing optional host as a failure of the local Tower.
3. **Project enrollment:** a local command validates the canonical `Main/` owner clone, Git common directory, expected remote/branch, and the `Worktrees/` container before any mutation. Enrollment is explicit and local, not inferred from Telegram text.
4. **Folder scaffolding and validation:** create or validate the recommended `Main/` plus `Worktrees/` layout, including a local read-only Support Agent worktree and worker-worktree conventions. Existing files, dirty worktrees, symlinks, and incompatible branches must fail closed rather than be recycled.
5. **Local Tower operation:** preserve the current SQLite queue/state/lock authority, `tower_*` MCP surface, OFF-by-default/ACTIVE fail-closed behavior, status/diagnostics, and one delivery lock. `Main/` is the sole orchestrator; Support proposes decomposition/conflicts/capacity and does not register, claim locks, deliver, or mutate repositories.
6. **Operational diagnostics:** provide actionable checks for installation, host integrations, enrollment identity, folder layout, runtime version, Tower state, and recoverable misconfiguration without silently repairing unknown state.
7. **Optional remote extension:** provide a separately enabled Hermes/Telegram integration path if installed, with explicit allowlisting and opaque, non-authoritative transport. Local Support and CLI operation must remain complete when Hermes or Telegram is absent.

### V1 non-goals

- Autonomous planning horizons, `Policy Reports`, Binding Delta continuation, or automatic next-slice execution.
- Automatic host launch, OpenCode → Pi failover, `host_epoch` recovery, or concurrent multi-host execution.
- Multi-project campaigns, distributed compensation, deploy/traffic orchestration, or automatic merge.
- Hermes ownership of repositories, worktrees, workers, secrets, or product scope.
- Parsing OpenSpec/PRD/RFC semantics inside the Tower runtime.
- Destructive worktree recycling, branch switching, reset/clean/stash, or repository relocation as an implicit repair.
- A mandatory Telegram account, remote-only operation, or a requirement to install every supported agent host.

### Candidate acceptance milestones

| Milestone | Release evidence |
|---|---|
| M0 — terminology/provenance freeze | V1/V2 vocabulary, scope, historical ArtifactRefs, and explicit non-goals are approved before proposal. |
| M1 — install and diagnose | Clean Linux, WSL, and macOS installs produce a versioned runtime and actionable diagnostics; repeated install is idempotent. |
| M2 — enroll and scaffold | A local project can be enrolled or rejected with precise identity/layout errors; `Main/`, `Worktrees/`, Support, and worker conventions validate without destructive cleanup. |
| M3 — local operation | Main plus local Support and at least one worker integration can use the existing Tower queue/state/lock contract; OFF, status, pending delivery, and single-lock invariants remain green. |
| M4 — host matrix | OpenCode, Pi, and Claude are detected and integrated only when available; absent hosts are reported as optional; each integration has an isolated smoke/rollback test. |
| M5 — lifecycle safety | Upgrade, failed upgrade rollback, explicit uninstall, and restoration of prior host configuration are proven without losing user configuration or Tower history. |
| M6 — optional remote | Hermes/Telegram can be enabled as an optional presentation/intent transport with local fallback; it is not required for the V1 gate. |
| M7 — publication | Supported-version matrix, release artifacts, checksums, install/upgrade/rollback/uninstall documentation, and a clean-machine smoke report are published. |

## Reusable runtime versus missing product surface

| Area | Reuse from `origin/master` | Missing or unsafe for Installable V1 |
|---|---|---|
| `core.mjs` | Single SQLite writer, transactional queue/locks, identity from worktree, OFF/ACTIVE fail-closed behavior, continuation schema/evidence already planned or implemented | A stable packaging boundary and public enrollment/diagnostics API; avoid mixing installer work with active P6/P7 core changes. |
| `mcp.mjs` | Fast hand-rolled stdio JSON-RPC and legacy `tower_*` contract | Host-neutral integration registration, versioned runtime resolution, and a clear rule for optional host capabilities. |
| `bin/torre` | Local `status`, `on`, `off`, `log`, `unlock`, `reset`, Main config/bootstrap commands | `install`, `upgrade`, `rollback`, `uninstall`, `diagnose`, `enroll`, `scaffold`, and machine-readable results with safe ownership/path checks. |
| `install.sh` | Dependency checks, OpenCode config backup, idempotent MCP registration, shell portability baseline | Immutable release publication, atomic cutover, multi-host integration, missing-host handling, lifecycle commands, uninstall, and WSL/macOS service policy. |
| `plugin/tower-spike.js` | OpenCode wake concept, rate limit, trace file, and session-idle trigger | Must not remain the V1 safety contract: it consumes before wake, mishandles child deletion, and races disposal. P7’s host-neutral redesign is V2 mechanism work unless a minimal safe adapter is explicitly included in V1. |
| `jornada.sh` | Read-only Git/worktree inventory, WSL path conversion, dirty/ahead/behind/PR diagnostics as fixtures or advisory checks | Its `--ejecutar`, recycling, branch deletion, and merge actions conflict with fail-closed V1 scaffolding and must not become implicit installer behavior. |
| Tests | 282 passing tests and isolated temporary Git/Tower fixtures | Installer, host detection, config preservation, scaffold/enrollment, service integration, lifecycle rollback, uninstall, and cross-OS smoke coverage. |
| Host integrations | OpenCode MCP/plugin path exists; Pi/Claude are represented in P7/P8/P9 planning | No committed Pi/Claude adapters or manifests in this checkout; no detection/version compatibility matrix; no safe config rollback implementation. |
| Hermes/Telegram | Broad proposal defines strong authorization boundaries and exact callbacks | No Hermes/Telegram implementation in this repository; optional V1 transport, credentials, allowlist, and local fallback remain to be specified. |
| Publication/services | Autonomous design describes a future `scripts/publish-runtime.mjs`; dashboard has one systemd example | No versioned runtime publisher, launchd service, WSL integration, upgrade state machine, or release artifact contract is present. |

## Reframing Autonomous V2 without discarding valid work

Autonomous V2 should be a new planning lane that depends on Installable V1’s stable install, enrollment, workspace, host-integration, and diagnostics contracts. The existing `autonomous-continuation-control-tower` remains the plan-agnostic mechanism substrate; P6 history and the P7/P8 integrated reconciliation remain traceable evidence, not disposable drafts. The A–I proposals remain valid broad ecosystem work, but their “V1” label and release dependency closure need a new revisioned mapping.

Recommended V2 mapping:

- **Mechanism P6–P11:** retain the current P6 recovery, P7 OpenCode, P8 Pi, optional P9 Claude, P10 publication, and P11 verification history. Reconcile them against the installable runtime rather than rewriting their historical artifacts.
- **A — Contract Schemas:** retain as the machine-readable foundation for V2; extract only schemas needed by V1 enrollment/diagnostics into a separately scoped V1 contract.
- **B — Project Registry:** split local enrollment/rederivation into V1 and retain Hermes-backed multi-project resolution/relocation preparation for V2.
- **C — Workspace Manager:** use a fail-closed inspect/scaffold subset for V1; keep autonomous assignment-bound creation/retirement and Binding Delta receipts in V2.
- **D — Main/Policy/Jornada:** V2 only; the V1 Main/Support local operation must not imply Policy or autonomous jornada semantics.
- **E — Host Launcher:** V2; V1 detects/integrates hosts but does not claim autonomous launch, heartbeat, stop proof, or failover.
- **F — Telegram Delivery:** optional V1 extension only for read-only/status or explicitly bounded remote intent; exact merge authorization remains a V2 capability unless separately approved.
- **G — Continuous Loop:** V2 only.
- **H — Multi-repository Campaigns:** V2 only.
- **I — Conformance Pilot:** create separate V1 installability/local-operation gates and retain the existing A–G autonomous gates as V2 evidence.

### Hermes assumptions requiring amendment in V2

1. Hermes is an optional remote presentation/intent surface, not a prerequisite for local operation.
2. Local Support is the non-Telegram alternative and lives under the enrolled project’s `Worktrees/`; it is not a second Main and has no Tower registration or lock authority.
3. Hermes may resolve a registered project and present exact state, but local enrollment and root relocation remain owner-local operations.
4. A wake, callback, free-text message, or Hermes recommendation never authorizes a worker or a repository mutation; the resumed agent still performs guarded receive/claim/ack where that V2 contract applies.
5. V2 must separate global Hermes identity/presentation from per-project Main authority and from local Support planning. No remote surface may silently select product scope, host, worktree, or fallback.
6. Telegram credentials, allowlists, replay protection, and merge authorization must be optional modules with explicit enablement and rollback, not hidden assumptions in the base installer.

## Provenance migration and parallel workstreams

### Safe migration strategy

1. Keep this exploration as the first artifact for the named split; do not edit runtime code or historical artifacts.
2. In proposal/spec phases, create revisioned V1 and V2 product documents or explicit delta documents. Do not silently rename the current PRD/RFC/REQUIREMENTS or rewrite archived P6/P7/P8 evidence.
3. Add a migration map in the master index and plan catalog: old broad V1 ArtifactRefs remain historical inputs; new Installable V1 and Autonomous V2 ArtifactRefs point to exact source commits, raw-byte digests, and explicit `supersedes`/`preserves` relationships.
4. Publish separate plan manifests (or explicitly partitioned slices) for Installable V1 and Autonomous V2. Rebind roadmap/catalog ArtifactRefs whenever the canonical roadmap changes; increment revisions rather than mutating a digest in place.
5. Preserve old A–I and P6–P11 paths byte-for-byte in history. Any narrowed or relabeled contract must be a new revision with a reason, migration note, and trace to the old artifact.
6. Keep implementation and release work out of the planning/provenance change. The V1 release lane should first establish install/enrollment/scaffold contracts, then consume only stable runtime seams; V2 can proceed in parallel on its existing P6/P7/P8 gates.

### Parallel workstream and conflict map

| Workstream | Primary ownership | Main conflict surfaces | Safe boundary |
|---|---|---|---|
| W0 — split/provenance | New change, master-index/catalog owners | `openspec/plans/*`, ArtifactRefs, old “V1” labels | Documentation/manifest only; single owner for canonical plan files. |
| W1 — installer/release lifecycle | V1 implementation | `install.sh`, `bin/torre`, runtime paths, user config | New release/publisher modules and CLI lifecycle; no P6/P7 schema edits. |
| W2 — enrollment/scaffold/validation | V1 implementation | registry/workspace proposals, `core.mjs` identity helpers, `jornada.sh` | Local-only commands, read-only validation first; never recycle unknown worktrees. |
| W3 — host detection/integration | V1 implementation plus host-specific owners | `plugin/tower-spike.js`, future Pi/Claude adapters, shared config | Adapter manifests and probes; host code cannot own Tower/domain authority. |
| W4 — local Support distribution | V1 packaging/skills owner | `Worktrees/` layout, Support role language, agent registration | Support is read-only, local, and never holds locks or delivery custody. |
| W5 — optional Hermes/Telegram | Separate optional extension | F proposal, credentials/config, remote authority | Transport/presentation only; local V1 remains complete without it. |
| W6 — Autonomous V2 | Existing P6–P11 and A–I owners | `core.mjs`, `mcp.mjs`, P7/P8 reconciliation, host launcher | Preserve current gates; consume V1 contracts through ArtifactRefs; no V1 installer edits without coordination. |
| W7 — release conformance/docs | V1 release owner | OS matrices, README, service files, status docs | Publish only after install/upgrade/rollback/uninstall and local-operation evidence. |

The highest-risk shared files are `core.mjs`, `mcp.mjs`, `install.sh`, `plugin/tower-spike.js`, `openspec/plans/master-index.md`, and `openspec/plans/sdd-tower-implementation/manifest.yaml`. They need explicit ownership or serial integration. P7/P8’s current reconciliation correctly keeps `host_epoch`, `binding_epoch`, and controller `generation` distinct; the V1 split must preserve that rule and must not assign V2 failover authority to the installer or Support Agent.

## Product questions required before proposal

### Business rules

- Is Installable V1 single-project per local installation, or may one installation enroll multiple projects before V2?
- Is the recommended layout mandatory (`<project>/Main` plus `<project>/Worktrees`) or only a validated default that supports existing layouts?
- Is Support one stable local worktree per project, and may it prepare only briefs/reports or also edit SDD artifacts?
- Which host integrations are release-blocking when installed, and is “not installed” always an optional diagnostic result?
- Does V1 include any worker launch/assignment automation, or only install/configure the integrations for manual local use?
- What exact Hermes/Telegram subset is optional V1: status only, bounded intent, or merge authorization as well?

### User journeys

- What is the clean-machine journey for Linux, WSL, and macOS, including dependency installation and PATH setup?
- What happens when OpenCode, Pi, or Claude is absent, outdated, configured by another tool, or partially installed?
- How does a user enroll an existing repository with dirty Main or existing Worktrees without losing anything?
- How does a user operate entirely through local Support and CLI with Telegram disabled or unavailable?
- What is the recovery journey after an interrupted install, failed upgrade, broken host config, or missing runtime release?

### Upgrade compatibility

- Which legacy Tower database/schema and `tower_*` behavior must remain readable across V1 upgrades?
- Is the current checkout-based OpenCode installation a supported predecessor, and must its plugin/MCP paths be migrated automatically?
- Where are release metadata, configuration backups, and rollback pointers stored, and what is the retention policy?
- Can uninstall remove integrations while preserving `.git/control-tower`, pending messages, locks, and audit/history by default?

### Security and authority

- What local user/UID and filesystem ownership checks are mandatory for runtime, registry, Main, Worktrees, and host configuration paths?
- Which operations may Support perform, and how is its read-only status enforced outside instruction text?
- Where are Hermes/Telegram secrets stored, and who can enable, rotate, disable, or revoke them?
- Must host integration be opt-in per project, and how are symlink/path substitution and wrong-project enrollment rejected?
- Which remote commands are allowed in optional V1, and which must remain V2-only because they can create workers, mutate Git, or merge?

### Release criteria

- Exact supported OS versions, WSL distributions, Bun/Git minimums, and host versions for OpenCode/Pi/Claude?
- Is a release blocked by a host adapter failure when that host is not installed? What evidence is required for each installed host?
- Must release publication include signed checksums, a clean-machine test, upgrade from the current checkout, rollback, and uninstall tests?
- Is optional Hermes/Telegram tested as a release extension or only as a post-release integration?

### First-slice exclusions

- Confirm that autonomous jornadas, Policy, Binding Deltas, automatic continuation, failover, campaigns, and merge authorization are V2 unless explicitly pulled into a smaller separately approved V1 slice.
- Confirm that V1 does not create/retire/recycle worktrees automatically and does not launch agents as a hidden installer side effect.
- Confirm whether macOS launchd and WSL service integration are required for the first release or are follow-up lifecycle slices after the portable CLI.

## Approaches

1. **Provenance-preserving two-lane split (recommended)** — define Installable V1 as a local-first product and Autonomous V2 as the existing broad ecosystem, connected by explicit revisioned ArtifactRefs and a migration map.
   - Pros: truthful release boundary, preserves approved history, allows V1 packaging work and V2 mechanism work in parallel, and makes optional Hermes/local Support explicit.
   - Cons: requires a new vocabulary and synchronized plan/catalog revisions; some A–I capabilities must be split by milestone rather than copied wholesale.
   - Effort: Medium

2. **Rewrite the current broad V1 in place** — change the existing PRD/RFC/REQUIREMENTS and master index to mean Installable V1.
   - Pros: fewer current documents to read.
   - Cons: destroys or obscures approved ArtifactRefs, invalidates historical acceptance language, and makes P6/P7/P8/A–I provenance difficult to audit.
   - Effort: High and unsafe

3. **Package only the existing Tower and defer host/project work** — publish `install.sh`, CLI, and OpenCode integration without enrollment, Support distribution, or Pi/Claude detection.
   - Pros: smallest implementation slice.
   - Cons: fails the corrected product intent and leaves the user-facing installable boundary incomplete.
   - Effort: Low but insufficient

## Recommendation

Proceed with Approach 1. Before proposal, answer the product questions above and freeze the Installable V1 contract around local installation, enrollment/scaffolding, diagnostics, Main + local Support operation, optional host integrations, and lifecycle-safe release management. Treat the current broad V1 documents as approved historical Autonomous V2 inputs, not as text to overwrite. Keep the V1 implementation lane away from P6/P7/P8 core conflicts, and require an explicit V2 amendment for Hermes assumptions rather than allowing optional V1 transport requirements to leak into the autonomous architecture.

## Risks

- Calling the broad autonomous ecosystem “V1” in any new acceptance table will recreate the release-boundary conflict.
- Rewriting PRD/RFC/REQUIREMENTS or old apply-progress evidence would break ArtifactRef traceability and obscure prior approvals.
- Installer, P7/P8, and future host work all converge on `install.sh`, `plugin/tower-spike.js`, `core.mjs`, and `mcp.mjs`; unowned edits can create incompatible runtime and authority boundaries.
- A physical `Main/`/`Worktrees/` convention is not yet a normative contract and may conflict with existing repositories or linked worktrees.
- Optional host absence, macOS/WSL service semantics, and upgrade rollback behavior are not defined; promising them without a compatibility matrix would be misleading.
- A remote Hermes/Telegram path can accidentally become a hidden authority channel if wake, intent, and authorization are not separated.
- The current plugin’s consume-before-wake behavior and child-deletion/disposal races must not be carried into a release marketed as safe local operation.

## Ready for Proposal

No — exploration is complete, but proposal should wait for maintainer answers to the business-rule, user-journey, compatibility, security, release, and first-slice questions above. Once those are fixed, run `sdd-propose` for the Installable V1 lane and create a separate explicit V2 reframe/migration proposal that references (rather than rewrites) the existing A–I and P6–P11 artifacts.

---

## Post-S8.2 Exploration: P8 enrollment, Main resolution, and local Support

### Current State

S8.2 is complete and the worktree is clean at `docs/close-v1-v2-wu1`, exactly at
`origin/master`/merge-base `67c21b9` (the serialized documentation closure PR #80).
The immutable lifecycle is delivered by PR #76, merge `a4ca761`; the shared
planning/status documents deliberately leave P8's next Sesión unnumbered.

The existing repository already contains the contract surface needed to define a
narrow V1 boundary: `schemas/project-registry-v1.schema.json` and
`contracts/validate.mjs` validate registry shape and unique aliases;
`core.mjs:761-770` derives the canonical Main, Git common directory, branch, and
trusted UID; and `main-store/authority.mjs` provides startup-only, exact-binding
assertion. There is no `registry/`, `layout/`, or `support/` implementation yet.
`core.open()` is not a read-only observer: it may create the Tower directory,
enable WAL, and create legacy tables. Support therefore needs an independent
read-only filesystem/Git/SQLite snapshot port and must not call the legacy open
path or any writer operation.

### Dependency and one-PR boundary

The next dependency-ready capability is a **provisional, unnumbered P8 session**
covering only:

1. explicit local enrollment and fail-closed `Main/` + `Worktrees/` layout checks;
2. exact project resolution (`project_id` + registry revision) followed by live
   Main rederivation and `CT_PROJECT_IDENTITY_MISMATCH`-style denial; and
3. a local Support snapshot/report boundary that is read-only, non-registering,
   non-locking, non-delivering, and unable to create workers, sessions, or
   worktrees.

This is a technically defensible one-PR capability boundary because it can be
implemented as additive `registry/`, `layout/`, and `support/` modules plus focused
tests and a thin CLI dispatch, while leaving `core.mjs`, `mcp.mjs`, Main Store,
database migrations, lifecycle files, host adapters, and Telegram untouched.
The boundary is not yet a canonical Sesión: the exact authored-line forecast and
task-level rollback proof do not exist. `sdd-tasks` must demonstrate that the
candidate stays within the maintainer's 800-line hard maximum (preferably within
the 400-line review budget or an explicitly chained strategy) before an ID is
assigned.

### Affected Areas

- `registry/` — local owner-only registry persistence and exact project/alias resolution.
- `layout/` — realpath, Git common-dir, remote/branch, ownership, `Main/`, and
  `Worktrees/` validation; no relocation, recycling, reset, clean, stash, or replacement.
- `support/` — read-only snapshot/report contract; no Tower registration, locks,
  queue consumption, repository mutation, or delivery custody.
- `bin/torre` — narrow `enroll`/resolution/diagnostic entry points only; preserve
  existing lifecycle and `CT_V2_ONLY` behavior.
- `test/registry/*`, `test/layout/*`, `test/support/*` — temporary Git/XDG fixtures,
  alias ambiguity, identity drift, unsafe layout, and Support non-mutation cases.

### Approaches

1. **Additive V1 boundary (recommended)** — add local registry/layout/support
   modules over existing schema, canonical Main derivation, and immutable lifecycle.
   - Pros: preserves the S8.2 seam, avoids P6/P7/core conflicts, and proves local
     operation without implying autonomy or Telegram authority.
   - Cons: requires a new read-only SQLite port and a measured line forecast before
     the Sesión can be numbered.
   - Effort: Medium

2. **Reuse the Autonomous V2 registry/Main/Policy proposals wholesale** — adopt the
   existing project-registry and main-policy proposals as the V1 implementation.
   - Pros: fewer new contract names.
   - Cons: imports jornada, Policy, assignment, worker, delivery, and Telegram
     semantics that are explicitly V2-only; it cannot be a safe one-PR V1 boundary.
   - Effort: High and unsafe

### Recommendation

Run `sdd-propose` for this unnumbered P8 candidate, then `sdd-spec`, `sdd-design`,
and `sdd-tasks`. Assign a positional Sesión ID only after the tasks forecast proves
the one-PR boundary. Telegram remains excluded: its canonical proposal depends on
the broader project registry and Main/Policy/Jornada contracts, and must follow this
local enrollment/resolution/Support dependency closure.

### Risks

- Calling `core.open()` from Support would mutate Tower state despite a read-only
  report request; use a readonly SQLite connection and immutable Git inspection.
- Existing `project-registry-v1` schemas include V2-oriented fields; the V1 subset
  must not accidentally authorize Policy, jornadas, workers, hosts, or delivery.
- `bin/torre` and the shared Tower database are live coordination surfaces; changes
  must remain additive and no DB mutation is permitted in planning or verification.
- The current runtime has `ACTIVE` and `tower.db` in the shared Main common-dir;
  this is an observed operational state, not permission to mutate it.

### Planning Gaps Before Apply

- A scoped proposal for this P8 boundary; the existing split proposal is too broad.
- A delta spec with Given/When/Then scenarios for enrollment, exact Main resolution,
  unsafe layout denial, Support read-only behavior, and V2-only denials.
- A design documenting atomic registry writes, live rederivation, readonly SQLite,
  and the core/adapters boundary without touching Main Store or migrations.
- A tasks artifact with positional Plan → Sesión → Módulo → Tarea numbering, Strict
  TDD order, rollback paths, changed-path allowlist, and measured budget forecast.
- Verification evidence is intentionally not a pre-apply artifact; it follows apply.

### Ready for Proposal

Yes for an **unnumbered planning candidate** only. The next exact phase is
`sdd-propose`; do not run `sdd-apply`, assign a Sesión ID, touch Telegram, mutate
the database, or edit shared closure/status/master-index documents.
