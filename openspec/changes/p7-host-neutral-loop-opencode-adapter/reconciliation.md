# P7 Reconciliation Record — S1.11

## Decision first

**S1.11 defines a maintainer-approved bounded apply contract.** This is explicitly not a production-readiness determination. Merged P6, the revision-2 Plan Manifest, ArtifactRefs, DAG boundaries, identities, and epoch ownership reconcile cleanly. Maintainer authority selects Option A: Host Launcher / Change E injects an opaque consumer capability carrying non-consuming peek, immutable proven root identity, and validated `binding_epoch`; P7 consumes that capability and fails closed on absence or drift.

The bounded contract also preserves legacy automatic wake through a non-consuming, non-lossy compatibility route. R1 and R2 are consumer-conformance obligations across the already-authorized P7 Sesiones; R3 evidence belongs to S1.15 and R4 evidence belongs to S1.16. Concrete Change E provider/injection implementation and proof remain a later obligation and are not evidence of apply or production completion for S1.11. This record completes T1.11.1.1–3 and records the exact bounded approval from Engram observation 8423. It does **not** execute the bounded apply.

## Machine record

```json
{
  "schema": "p7-reconciliation-record",
  "schema_version": 1,
  "record_id": "p7-s1-11-reconciliation",
  "planning_session": "S1.11",
  "record_state": "APPROVED",
  "gate_state": "BOUNDED_APPLY_APPROVED",
  "approvable": true,
  "integrated_base_commit": "3dee8b09f3a46beefe7f01634a07d8c716b9fee1",
  "p6_closing_merge_commit": "e16d94b79111a1cd9521046e88f7cb51af9441da",
  "project_container": "/home/emili/projects/control-tower",
  "worktree": "/home/emili/projects/control-tower/Worktrees/s1-11",
  "branch": "feat/plan-1/s1-11-p7-reconciliation",
  "authorized_base_sha": "3dee8b09f3a46beefe7f01634a07d8c716b9fee1",
  "coordination_assignment_id": "a74d8689-b333-4ce4-ae7f-7174d3aadbb6",
  "execution_session_id": "019ff0ed-38f9-7008-9ddf-9fd29d618004",
  "identities": {
    "project_id": { "status": "allocated", "value": "control-tower" },
    "plan_id": { "status": "allocated", "value": "plan-1" },
    "slice_id": { "status": "allocated", "value": "mechanism-p7-opencode" },
    "assignment_id": { "status": "allocated", "value": "a74d8689-b333-4ce4-ae7f-7174d3aadbb6" },
    "jornada_id": { "status": "not_allocated", "value": null },
    "session_id": { "status": "allocated", "value": "019ff0ed-38f9-7008-9ddf-9fd29d618004" },
    "host_process_instance": { "status": "not_allocated", "value": null },
    "plugin_instance": { "status": "not_allocated", "value": null },
    "root_session_id": { "status": "not_allocated", "value": null }
  },
  "epochs": {
    "binding_epoch": {
      "status": "not_allocated",
      "value": null,
      "semantic": "continuation_capability_binding_epoch",
      "authority_domain": "constructor_bound_continuation_registration"
    },
    "host_epoch": {
      "status": "not_allocated",
      "value": null,
      "semantic": "exclusive_host_execution_epoch",
      "authority_domain": "main_issued_change_e_enforced"
    },
    "generation": {
      "status": "not_allocated",
      "value": null,
      "semantic": "controller_local_lifecycle_generation",
      "authority_domain": "p7_process_memory_non_authoritative"
    }
  },
  "approval": {
    "state": "APPROVED",
    "approver": "maintainer",
    "approved_at": "2026-08-11T15:27:49Z",
    "evidence": {
      "kind": "engram-bound-candidate",
      "observation_id": 8423,
      "authorized_head": "3dee8b09f3a46beefe7f01634a07d8c716b9fee1",
      "candidate_sha256": {
        "openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md": "791c5a9322f800a58af6562c3973d6854529c6c37197da9f907ff4274e3315c5",
        "openspec/changes/p7-host-neutral-loop-opencode-adapter/tasks.md": "7e2fc041e8832c3da17fddecce7614ae1ca24e39c85bbbeb812bd73256f6a0dc",
        "openspec/changes/p7-host-neutral-loop-opencode-adapter/design.md": "e68d991b57526cae3ec3546bff4a1cae70d3b5401e9b74a7706c15231683cfb9",
        "openspec/changes/p7-host-neutral-loop-opencode-adapter/session-handoff.md": "d6a7879baa2708064f568e95e08b07aa5a96f7b681cf89264160cbf819e7f730",
        "openspec/changes/p7-p8-integrated-reconciliation/tasks.md": "d5852c1531ac4bfb2c023aa8877f191b0989e7ed6c66bbe87b569d43ed15232d"
      }
    }
  },
  "open_obligation_ids": ["P7-R1", "P7-R2", "P7-R3", "P7-R4", "P7-R5"]
}
```

`not_allocated` is explicit evidence, not an invented identifier. No jornada, OpenCode host process, plugin lifecycle, root session, or runtime epoch exists while the Tower is disarmed and this documentation-only reconciliation is being prepared.

## Authority and scope

| Authority | Bound evidence | Result |
|---|---|---|
| S1.11 contract | `openspec/plans/plan-1/STATUS.md`; Engram observation 8423 | Route is `direct`; the maintainer approved T1.11.1.3 for bounded apply against the frozen candidate. |
| Canonical tasks | `openspec/changes/p7-p8-integrated-reconciliation/tasks.md`, T1.11.1.1–3 | Record and binary checks may be prepared; approval is separate. |
| Ad-hoc worker assignment | Intercom message `a74d8689-b333-4ce4-ae7f-7174d3aadbb6` | Authorizes this isolated documentation task only. It grants no Tower, worktree-lifecycle, host-lifecycle, commit, push, or gate authority. |
| Integrated base | `master@3dee8b09f3a46beefe7f01634a07d8c716b9fee1` | Current worktree HEAD, branch tip, and authorized base are identical. |
| Merged P6 | closing merge `e16d94b79111a1cd9521046e88f7cb51af9441da` (PR #45; PR chain #38–#45) | `git merge-base --is-ancestor e16d94b HEAD` passes. P6 is part of the P7 base. |

The actual S1.11 documentation worktree is inside the registered project container and is pinned above. It is not the future P7 runtime assignment worktree. Any later S1.13–S1.16 assignment must independently use the canonical `Worktrees/<plan>/<lane>/<slice>` shape and an allowed `plan/<plan>/<slice>` or `feat/<plan>/<slice>` branch; this record grants no exception or lifecycle operation.

## ArtifactRefs

All digests use `raw-bytes` SHA-256.

| Artifact | Source commit | Path | Content digest |
|---|---|---|---|
| Plan catalog | `3dee8b09f3a46beefe7f01634a07d8c716b9fee1` | `openspec/plans/manifest.yaml` | `sha256:98030e593bdc907b589c1cbab3002b3c62a6bec6af1c56e53c28238c4e30317c` |
| Revision-2 Plan Manifest | `3dee8b09f3a46beefe7f01634a07d8c716b9fee1` | `openspec/plans/sdd-tower-implementation/manifest.yaml` | `sha256:9eb7e300e4cc1684d24e1cb296383009c20f80a4b91da2b2c9303f4a68475e4d` |
| Canonical requirements | `0745f99a3d9ab7f9c3676af4d1ca3adf0f0c5c95` | `openspec/specs/sdd-tower-implementation-v1-requirements.md` | `sha256:277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0` |
| Revision-2 roadmap bytes | `b96e4d95896377b59f2a6bf5c5d6bc80ba5530d0` | `openspec/plans/master-index.md` | `sha256:197bf3f6e168398ce225baffdc6caac41bc8c9fa5feded2185c0c72c3b0a4fd5` |
| Historical P6 progress | `e16d94b79111a1cd9521046e88f7cb51af9441da` | `openspec/changes/autonomous-continuation-control-tower/apply-progress.md` | `sha256:114fb7490fd5790f21f1c19b77390bfc2f476cc82bdc8b107ee5bcfbeb6e8f6c` |
| P7 normative spec | `3dee8b09f3a46beefe7f01634a07d8c716b9fee1` | `openspec/changes/p7-host-neutral-loop-opencode-adapter/specs/host-neutral-polling-opencode-adapter/spec.md` | `sha256:58703aa49c9c9ca01888ed7bcc313356ea1e3bff31ee588015db757d7aed09b2` |
| OpenCode dependency declaration | `3dee8b09f3a46beefe7f01634a07d8c716b9fee1` | `package.json` | `sha256:bc2f33bd55f6994ac06496a97b05bb58c51b599571a176979fc66cff001ade0d` |
| OpenCode lock evidence | `3dee8b09f3a46beefe7f01634a07d8c716b9fee1` | `bun.lock` | `sha256:28e5ea2301beee6666b39c406b00c9099277ccb395d0bb923383b3b62709ebf4` |

The historical P6 progress digest matches the S1.9/S1.10 preservation receipt. This record cites it without rewriting it.

## DAG assertions

| Assertion | Evidence | Result |
|---|---|---|
| `P6 → P7 → P8 → Change E` | Manifest slices `mechanism-p6-recovery`, `mechanism-p7-opencode`, `mechanism-p8-pi`, `product-e-host-launcher` | PASS |
| `A → B → D → Change E` | `product-b-project-registry` depends on A; D depends on B; E depends on D | PASS |
| `A → C → D → Change E` | C depends on A and B; D explicitly depends on C; E depends on C and D | PASS |
| C→D is explicit | D dependency list contains `product-c-workspace-manager` | PASS |
| No A→P7/P8 edge | P7 depends only on P6; P8 depends only on P7 | PASS |
| Change E owns convergence | E depends on C, D, P7, and P8 | PASS |
| Optional P9 does not gate P10/P11 | P10 depends on P8; P11 depends on P10 | PASS |
| All 15 slice IDs are unique and graph is acyclic | Revision-2 manifest invariant check | PASS |

Change A is not a P7 or P8 prerequisite. Both independent paths converge only at Change E.

## Role and mechanism boundary

| Actor/mechanism | Owned authority | Explicit non-authority in P7 |
|---|---|---|
| Maintainer | Irreversible gate approval and delivery authorization | No authority is delegated by this draft. |
| Hermes | Presentation | No project, plan, worktree, host, or delivery authority. |
| Main | Project/plan authority; publishes assignments; issues and fences `host_epoch` | P7 cannot issue or replace Main authority. |
| Support | Read-only decomposition and capacity evidence | No assignment, mutation, or approval authority. |
| Policy | Plan-local eligibility | No host/runtime implementation authority. |
| Planning | Future work through approved tasks | No apply or gate authority. |
| Implementation | Reconciliation, apply, verify, and binding-delta evidence inside assigned scope | No self-assignment, gate approval, worktree lifecycle, or host lifecycle. |
| Control Tower | Plan-agnostic coordination and continuation mechanism | Does not decide product intent or maintainer approval. |
| Workspace Manager | Inspect/create/retire assignment-bound ephemeral worktrees | P7 cannot create, retire, recycle, or branch-switch worktrees. |
| Host Launcher / Change E | Launch/inspect/stop/health, heartbeat, stop proof, session naming, `host_epoch` enforcement, exclusive failover; injects the Option A opaque consumer capability | Does not issue Main's `host_epoch`; P7 owns none of these operations. Concrete provider/injection implementation and proof remain a later Change E obligation. |
| P7 adapter/controller | Consumes the injected opaque capability, validates immutable root/`binding_epoch` continuity, requests non-consuming peek, maintains transient polling state, and requests generic or legacy-compatible wake | No SQLite/domain authority, claim, ack, consume, persistence, provider manufacture, worktree lifecycle, host lifecycle, or failover authority. |

## Identity and epoch interpretation

The machine record keeps all nine integrated identities distinct. `assignment_id` is the exact coordination assignment message, while `session_id` is the exact Pi execution session. `planning_session` (`S1.11`) is a plan position, not either runtime identity. Runtime host identities remain explicitly unallocated.

The three epoch domains are intentionally non-interchangeable:

| Epoch | Producer/owner | Meaning | Persistence/authority |
|---|---|---|---|
| `binding_epoch` | Accepted constructor-bound continuation registration/capability provider | Identity revision for one claimant/plugin binding | Durable continuation fence; never event/request/environment-derived. |
| `host_epoch` | Main issues/fences; Change E enforces | Exclusive host execution/failover generation | Product host authority; P7 may only consume proven evidence. |
| `generation` | P7 controller | Invalidates stale timers/callbacks within one plugin process | Process-local and non-authoritative; never substituted for either durable epoch. |

## Merged P6 evidence

| Contract | Concrete merged evidence | Result |
|---|---|---|
| Schema version | `core.mjs` wires schema 5 into `SCHEMA_MANIFESTS` and `bootstrapAdmin` supports the exact 4→5 lane | PASS |
| Migration 005 | `MIGRATION_005_SQL`: 14,996 bytes, 231 LF lines, `sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98` | PASS |
| Schema-5 manifest | `SCHEMA_005_MANIFEST`: 58 total objects and the exact v1–v5 checksum chain | PASS |
| Bootstrap/replay | Fresh 4→5 runs only from OFF with exact schema-4 evidence; persisted idempotency supports exact replay and rejects drift | PASS |
| Polling witness | Migration 005 constrains `polling_witness` to `UNAVAILABLE_BEFORE_P7`; P6 rollback writes that exact value | PASS — unchanged; no Migration 005 edit permitted |
| Polling namespace conflicts | No tracked `host/loop.mjs`, `test/polling.test.mjs`, `test/host-adapters.test.mjs`, controller method, or `poll.*` runtime name exists in P6 | PASS |
| Non-consuming receive | `continuationReceive(handle, ctxFactory)` is argument-free through the dispatcher/MCP `receive` route and returns exactly `{delivery: descriptor|null}` without claim or mutation | PASS |
| Claim boundary | `claim` is a separate writer operation with explicit delivery/handoff/generation/purpose fields | PASS |
| Error behavior | Constructor/session-isolation, schema, mode, busy, fence, and payload failures retain stable `CT_*` codes | PASS |
| Capability boundary | `createContinuationDispatcher({cwd,trustedMetadata,processIdentity,processObserver})`; missing trusted metadata/process identity rejects `CT_SESSION_ISOLATION_UNPROVEN` | PASS |
| MCP exposure | `createMcpHandler` lists continuation tools only when both constructor capabilities exist; default stdio remains legacy-only | PASS |
| Rollback compatibility | `beginRollback` freezes inventory; `finishRollback` requires zero live/pending counts and records `UNAVAILABLE_BEFORE_P7` rather than trusting transient polling as durable proof | PASS — transient P7 is compatible and claims no witness |
| P6 verification | P6 parent closure records recovery 49/0/235, migration 60/0/325, fail-closed 8/0/70, identity 58/0/520, and full suite 282/0/2,094 | PASS at closing candidate |

P6 was consumed from the integrated Git base. No P6 worktree file was copied into P7 and no historical P6 artifact was edited.

## OpenCode and P7 seam reconciliation

Pinned package evidence is `@opencode-ai/plugin@1.18.13` and `@opencode-ai/sdk@1.18.13` in both `package.json` and `bun.lock`.

| Required seam | Bounded S1.11 contract | Evidence ownership |
|---|---|---|
| Lifecycle event fields and root proof | P7 accepts only an immutable root proven by the injected capability; ambiguous, child, missing, or drifting identities fail closed. Event classification must conform to that identity. | R3 fixture evidence is deferred to existing S1.15. |
| `promptAsync` envelope | P7 emits only the generic continuation wake for the exact proven root, with no descriptor, token, evidence, sender, or domain interpolation. | R4 pinned-envelope consumer evidence is deferred to existing S1.16. |
| Non-consuming transport | **Option A selected.** Host Launcher / Change E injects one opaque consumer capability carrying non-consuming peek. P7 consumes it without importing `core.mjs`, `mcp.mjs`, or SQLite and without exposing a second/public continuation API. | R1 consumer conformance closes across already-authorized P7 Sesiones; concrete provider/injection proof remains a later Change E obligation. |
| Trusted metadata continuity | The injected capability carries immutable proven root identity and validated `binding_epoch`; P7 compares them byte-for-byte at its consumer boundary and fails closed on absence or drift. P7 never manufactures provider authority. | R2 consumer conformance closes across already-authorized P7 Sesiones; concrete provider/injection proof remains a later Change E obligation. |
| Legacy queue compatibility | Legacy automatic wake is preserved through a bounded, non-consuming, non-lossy compatibility route. Legacy cases must not degrade to manual queue handling. | Consumer regression evidence belongs to the already-authorized P7 Sesiones; provider-side proof remains later where applicable. |
| Persistence choice | P6 accepts `UNAVAILABLE_BEFORE_P7`; controller state remains transient without claiming rollback quiescence. | Resolved: no Migration 006 and no Migration 005 edit. |
| Trace sink | Existing plugin appends bounded operational text to `tower.log`; safe event/attribute mapping remains required. | Consumer evidence belongs to implementation tests. |

## Resolved decisions and deferred obligations

| ID | Bounded contract | Closure/evidence owner |
|---|---|---|
| `P7-R1` | Option A supplies an opaque non-consuming peek capability; P7 has no `core.mjs`, `mcp.mjs`, or SQLite import and exposes no second/public continuation API. | Consumer conformance closes across already-authorized P7 Sesiones. Concrete Change E provider/injection implementation and proof remain later. |
| `P7-R2` | The capability carries immutable proven root identity and validated `binding_epoch`; P7 consumes and fails closed on absence or byte drift and cannot manufacture provider authority. | Consumer conformance closes across already-authorized P7 Sesiones. Concrete Change E provider/injection implementation and proof remain later. |
| `P7-R3` | Root/child lifecycle classification must conform to the capability-proven root. | Deferred fixture evidence is owned by existing S1.15; it is not pre-approval evidence for S1.11. |
| `P7-R4` | The pinned wake envelope is generic and targets only the proven root, without descriptor/token/evidence/sender/domain interpolation. | Deferred consumer evidence is owned by existing S1.16; it is not pre-approval evidence for S1.11 and does not include provider construction. |
| `P7-R5` | Preserve legacy automatic wake through a bounded, non-consuming, non-lossy compatibility route; never degrade legacy cases to manual queue handling. | Consumer regression evidence closes in the already-authorized P7 work; concrete provider-side proof remains later where applicable. |

No new Sesión is assigned here. If later concrete Change E provider/injection implementation requires plan decomposition, work must stop for `planificador-granular`. These obligations do not assert production readiness or apply completion; T1.11.1.3 approves only the bounded apply contract.

## Validation results

| Check | Result |
|---|---|
| Base/P6 ancestry, worktree container, branch/base pin | PASS |
| Current catalog/revision-2 Plan Manifest parse, 20 ArtifactRefs, raw-byte digests, 15 unique slices, acyclicity, both DAGs, C→D, no A→P7/P8, no P9→P10/P11 | PASS |
| Prior `bun /tmp/p7-s1-11-invariants.mjs` run (checker SHA-256 `4959d06476aa006ff50e8c391d895e6531ae2ad2b12cf8563d882c32ce0fb352`) | STALE — it validated the superseded five-blocker model and is not approval evidence; the approval instead binds the frozen candidate through Engram observation 8423. |
| Record approval fields | APPROVED for bounded apply only; exact maintainer authority is Engram observation 8423, bound to the frozen candidate HEAD and SHA-256 set. |
| Missing required identity mutation | REJECTED |
| Conflated epoch semantic/authority mutation | REJECTED |
| Unauthorized base SHA mutation | REJECTED |
| Out-of-container worktree mutation | REJECTED |
| Historical P6 progress and P7 normative spec preservation | PASS; both hashes unchanged |
| Runtime/source/test diff guard | PASS; no runtime/source/test path changed |
| `git diff --check` | PASS |
| Structural readback | Required after the final diff; recorded in the worker evidence packet, not used as approval authority |

Runtime harness: **N/A** — this record changes documentation and gate evidence only. It creates no route, process, database, host, timer, or runtime behavior.

Rollback boundary: remove this `reconciliation.md` and revert only the T1.11.1.1–3 checkbox amendments. Do not touch P6 history, P7 normative spec, manifests, or runtime/source/test files.

## Approval state and next decision

- Record: **APPROVED**
- Contract: **BOUNDED APPLY ONLY — NOT PRODUCTION READY**
- P7 gate: **BOUNDED_APPLY_APPROVED**
- T1.11.1.3: **COMPLETE / CHECKED**
- Approver: **maintainer**
- Approved at: **2026-08-11T15:27:49Z**
- Approval evidence: **Engram observation 8423, bound to authorized HEAD `3dee8b09f3a46beefe7f01634a07d8c716b9fee1` and the exact frozen candidate SHA-256 set in the machine record**

The approval authorizes only the bounded P7 apply contract with Option A and legacy automatic wake preservation selected, R1/R2 as P7 consumer-conformance obligations, R3 deferred to S1.15, R4 deferred to S1.16, and concrete Change E provider/injection implementation and proof remaining later. It does not claim apply completion or production readiness.
