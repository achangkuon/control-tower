# P8 Reconciliation — S1.12

## Decision first

**APPROVED / S1.17 VALIDATION AUTHORIZED.** This independent P8 record references the integrated, approved P7 record without embedding, replacing, or approving it. Maintainer approval is bound to Engram observation 8483, the exact authorized base, and both frozen pre-approval document hashes.

The completed S1.12 evidence reconciles the catalog, revision-2 Plan Manifest, 20 ArtifactRefs, both dependency paths, identities, epoch ownership, the documentation worktree boundary, preservation checks, and hybrid persistence. This approval authorizes only S1.17 entry at T1.17.1.1 to validate this exact record. RED, runtime implementation, installation, delivery, production readiness, commit, push, and Tower remain unauthorized until that validation passes and later authority is issued.

## Machine record

```json
{
  "schema": "p8-reconciliation-record",
  "schema_version": 1,
  "record_id": "p8-s1-12-reconciliation",
  "planning_session": "S1.12",
  "record_state": "APPROVED",
  "gate_state": "S1_17_VALIDATION_AUTHORIZED",
  "approval_state": "APPROVED",
  "approvable": true,
  "candidate_validation": "VERIFIED",
  "integrated_base_commit": "3db3c121d48a07d7696afe6a88de044f30ea4695",
  "p6_closing_merge_commit": "e16d94b79111a1cd9521046e88f7cb51af9441da",
  "p7_record_integration_commit": "a1dce220dae594006bda0722d0bdb640cf4b9be7",
  "project_container": "/home/<usuario>/projects/control-tower",
  "worktree": "/home/<usuario>/projects/control-tower/Worktrees/s1-12",
  "branch": "feat/plan-1/s1-12-p8-reconciliation",
  "authorized_base_sha": "3db3c121d48a07d7696afe6a88de044f30ea4695",
  "identities": {
    "project_id": { "status": "allocated", "value": "control-tower" },
    "plan_id": { "status": "allocated", "value": "plan-1" },
    "slice_id": { "status": "allocated", "value": "mechanism-p8-pi" },
    "assignment_id": { "status": "not_allocated", "value": null },
    "jornada_id": { "status": "not_allocated", "value": null },
    "session_id": { "status": "not_allocated", "value": null },
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
    "approved_at": "2026-08-11T19:17:33Z",
    "evidence": {
      "observation_id": 8483,
      "authorized_base_sha": "3db3c121d48a07d7696afe6a88de044f30ea4695",
      "pre_approval_reconciliation_sha256": "a2c758b988c324b556e7aff6803451025c6076fc2a187b9d7757dc51aa5242ea",
      "pre_approval_status_sha256": "15f5b5ea376b4fe377dbba2003f60b7dc694989a6f6725370e8e96de342c6a38"
    }
  }
}
```

`not_allocated` is explicit evidence, not a placeholder to be filled by inference. No P8 runtime assignment, jornada, Pi host process, plugin lifecycle, root session, or runtime epoch exists in this documentation-only preparation. The delegated preparation authority has no opaque assignment or runtime-session identifier and grants no Tower, worktree-lifecycle, host-lifecycle, commit, push, or approval authority.

## Authority and prerequisite boundary

| Authority or prerequisite | Bound evidence | Result |
|---|---|---|
| S1.12 authority | Maintainer observations 8483 and 8492 against base `3db3c121d48a07d7696afe6a88de044f30ea4695` | Authorizes the exact post-approval transition, completion of T1.12.1.1–7, and only S1.17 entry at T1.17.1.1 validation. |
| Canonical tasks | `openspec/changes/p7-p8-integrated-reconciliation/tasks.md`, T1.12.1.1–7 | All seven S1.12 tasks are complete; no other task is authorized or changed. |
| Integrated P7 record | Commit `a1dce220dae594006bda0722d0bdb640cf4b9be7`; approved P7 record at the independent ref below | PASS — the commit is an ancestor of the prepared base and the record blob is unchanged at the prepared base. |
| P7 authority limit | The referenced P7 record approves only its bounded apply contract | It is prerequisite evidence, not P8 approval, P7 apply completion, provider proof, or production readiness. |
| P8 approval | Maintainer observation 8483 at `2026-08-11T19:17:33Z`, bound to the exact base and frozen pre-approval hashes in the machine record | **APPROVED; only S1.17 T1.17.1.1 record validation is authorized.** |
| Integrated base | `master@3db3c121d48a07d7696afe6a88de044f30ea4695` | Current branch and worktree started at the exact base. |
| Merged P6 | Closing merge `e16d94b79111a1cd9521046e88f7cb51af9441da` | PASS — the commit is an ancestor of the prepared base. |

The P7 record is referenced as one immutable dependency. Its historical evidence, normative specification, decisions, approval, and open obligations remain owned by `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md`; this P8 candidate does not absorb or restate them.

## Independent evidence refs

Every row is an independent `artifact-ref` schema-version 1 binding for repository `control-tower`, media type `text/markdown` except the YAML rows, and `raw-bytes` SHA-256. Revisions are evidence-artifact revisions; they do not rewrite the referenced document.

| Artifact ID | Revision | Source commit | Repository-relative path | Content digest |
|---|---:|---|---|---|
| `plan-catalog` | 3 | `3db3c121d48a07d7696afe6a88de044f30ea4695` | `openspec/plans/manifest.yaml` | `sha256:98030e593bdc907b589c1cbab3002b3c62a6bec6af1c56e53c28238c4e30317c` |
| `plan-sdd-tower-implementation` | 2 | `3db3c121d48a07d7696afe6a88de044f30ea4695` | `openspec/plans/sdd-tower-implementation/manifest.yaml` | `sha256:9eb7e300e4cc1684d24e1cb296383009c20f80a4b91da2b2c9303f4a68475e4d` |
| `p7-s1-11-reconciliation` | 1 | `a1dce220dae594006bda0722d0bdb640cf4b9be7` | `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md` | `sha256:30b279fb60a0d6e9dc5899c08659955f7be4931ac8b0512f224e128c7b33bdd6` |
| `p7-host-neutral-polling-opencode-spec` | 1 | `3db3c121d48a07d7696afe6a88de044f30ea4695` | `openspec/changes/p7-host-neutral-loop-opencode-adapter/specs/host-neutral-polling-opencode-adapter/spec.md` | `sha256:58703aa49c9c9ca01888ed7bcc313356ea1e3bff31ee588015db757d7aed09b2` |
| `p8-pi-adapter-proposal` | 1 | `3db3c121d48a07d7696afe6a88de044f30ea4695` | `openspec/changes/p8-slice-planning/proposal.md` | `sha256:b5c7c7061548743e5f3398f34530a2203814640b76078c228926bd468726710b` |
| `p8-pi-adapter-spec` | 1 | `3db3c121d48a07d7696afe6a88de044f30ea4695` | `openspec/changes/p8-slice-planning/specs/control-tower-pi-adapter/spec.md` | `sha256:474890dec7d4b7f4f5abcca9445dc7abd0ef3bd05fcf34551f0739b9bc417b39` |
| `p8-pi-adapter-design` | 1 | `3db3c121d48a07d7696afe6a88de044f30ea4695` | `openspec/changes/p8-slice-planning/design.md` | `sha256:a44a7e1a9cf6b891a35016296f661171377b0a84f12c937f606196f3b9836d55` |
| `p8-pi-adapter-tasks` | 1 | `3db3c121d48a07d7696afe6a88de044f30ea4695` | `openspec/changes/p8-slice-planning/tasks.md` | `sha256:85e5c94f190d31a2760636b3e1acbf6dc77014666ba3601782e996470115108c` |
| `sdd-tower-implementation-v1-requirements` | 1 | `0745f99a3d9ab7f9c3676af4d1ca3adf0f0c5c95` | `openspec/specs/sdd-tower-implementation-v1-requirements.md` | `sha256:277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0` |
| `historical-p6-apply-progress` | 1 | `e16d94b79111a1cd9521046e88f7cb51af9441da` | `openspec/changes/autonomous-continuation-control-tower/apply-progress.md` | `sha256:114fb7490fd5790f21f1c19b77390bfc2f476cc82bdc8b107ee5bcfbeb6e8f6c` |

The P7 record's Git blob is `252bb6520bcee35642c03af35b59df606ba17c55` at both its integration commit and the prepared base. The P8 record has no self-ArtifactRef: a document cannot truthfully bind its own final digest before publication. Candidate bytes are frozen and hashed externally for independent verification.

## DAG assertions

| Assertion | Manifest evidence | Result |
|---|---|---|
| `P6 → P7 → P8 → Change E` | `mechanism-p7-opencode` depends only on `mechanism-p6-recovery`; `mechanism-p8-pi` depends only on P7; `product-e-host-launcher` depends on P8 | PASS |
| `A → B/C → D → Change E` | B depends on A; C depends on A and B; D depends on B and C; E depends on C and D | PASS |
| C→D is explicit | D dependency list contains `product-c-workspace-manager` | PASS |
| No A→P7/P8 edge | P7 and P8 have only the mechanism dependencies above | PASS |
| Change E owns convergence | E depends on C, D, P7, and P8 | PASS |
| Optional P9 does not gate P10/P11 | P10 depends on P8; P11 depends on P10 | PASS |
| Graph integrity | 15 unique slice IDs; every dependency resolves; graph is acyclic | PASS |

Change A is not a P7 or P8 prerequisite. The P7/P8 adapter branch and the product C/D prerequisites jointly converge at Change E.

## Role and mechanism boundary

| Actor or mechanism | Owned authority | Explicit P8 non-authority |
|---|---|---|
| Maintainer | Irreversible gate approval and delivery authorization | Approval issued for this exact record authorizes validation entry only; it does not authorize RED, runtime implementation, installation, delivery, production readiness, commit, push, or Tower. |
| Hermes | Presentation | No project, plan, worktree, host, or delivery authority. |
| Main | Project/plan authority; publishes assignments; issues and fences `host_epoch` | P8 cannot issue, fence, or replace Main authority. |
| Support | Read-only decomposition and capacity evidence | No assignment, mutation, or approval authority. |
| Policy | Plan-local eligibility | No host/runtime implementation authority. |
| Planning | Future work through approved tasks | No apply or gate authority. |
| Implementation | Reconciliation, apply, verify, and binding-delta evidence inside assigned scope | No self-assignment, approval, delivery, worktree lifecycle, or host lifecycle. |
| Control Tower | Plan-agnostic coordination and continuation mechanism | Does not decide product intent or maintainer approval. |
| Workspace Manager | Inspect/create/retire assignment-bound ephemeral worktrees | P8 cannot create, retire, recycle, or branch-switch worktrees. |
| Host Launcher / Change E | Launch/inspect/stop/health, heartbeat, stop proof, session naming, `host_epoch` enforcement, exclusive failover, and provider injection | It does not issue Main's `host_epoch`; concrete provider and host proof remain later obligations. |
| P7 controller | Polling, non-consuming peek, retry, serialization, invalidation, and process-local `generation` | It owns no Main, worktree, host, or durable epoch authority. |
| P8 Pi adapter | Trusted Pi lifecycle classification, wake eligibility, lease re-proofing, and exact `pi.sendMessage` mapping over the reconciled P7 controller | No SQLite/domain authority, consume, claim, ack, retry, persistence, provider manufacture, worktree lifecycle, host lifecycle, failover, installation, or cutover authority. |

## Identity, epoch, base, branch, and worktree interpretation

The nine identity domains in the machine record are intentionally distinct. The plan position `S1.12` is not an `assignment_id`, `jornada_id`, Pi `session_id`, host process, plugin instance, or root session. Unallocated runtime identities cannot be inferred from branch names, event fields, environment data, or this document.

| Epoch | Producer/owner | Meaning | Persistence and authority |
|---|---|---|---|
| `binding_epoch` | Accepted constructor-bound continuation registration/capability provider | Identity revision for one claimant/plugin binding | Durable continuation fence; never event-, request-, or environment-derived. |
| `host_epoch` | Main issues/fences; Change E enforces | Exclusive host execution/failover generation | Product host authority; P8 may only consume proven evidence. |
| `generation` | P7 controller/process-shared coordinator | Invalidates stale timers, callbacks, leases, and wake ownership inside one plugin process | Process-local and non-authoritative; never substituted for either durable epoch. |

The documentation worktree is pinned to `/home/<usuario>/projects/control-tower/Worktrees/s1-12`, branch `feat/plan-1/s1-12-p8-reconciliation`, and base `3db3c121d48a07d7696afe6a88de044f30ea4695`. It is inside the registered project container, but it is not a future P8 runtime assignment worktree and grants no lifecycle authority. Any later authorized implementation must independently bind its assignment and session to an in-container `Worktrees/<plan>/<lane>/<slice>` path, authorized base SHA, and allowed `plan/<plan>/<slice>` or `feat/<plan>/<slice>` branch. Missing or contradictory evidence fails closed.

## P8 seam contract

The P8 proposal, normative spec, design, and tasks remain the authority for P8 behavior. This candidate binds rather than rewrites them:

- P8 consumes the reconciled P7 host-neutral controller; P7 retains polling, non-consuming peek, throttling, serialization, retry, and synchronous invalidation.
- Pi lifecycle evidence is non-authoritative. A trusted gate must prove root/child/shutdown identity, current-session equivalence, idle timing, and generation ownership per action and wake.
- Wake maps exactly once to `pi.sendMessage(wakeEnvelope, { deliverAs: "followUp", triggerTurn: true })`; errors propagate to P7 and P8 does not retry.
- Replayed equivalent trusted evidence is idempotent; conflicting, stale, missing, child, or ambiguous evidence is ineligible and must not mutate controller ownership, schedules, peeks, or wakes.
- Controller/coordinator lifetime is process-shared; adapter unload/disposal is synchronous. P8 performs no global installation, publication, activation, cutover, migration, or Migration 005 edit.
- The P6 polling witness remains `UNAVAILABLE_BEFORE_P7`; transient P7/P8 state does not claim durable rollback quiescence.

These are validation inputs for authorized S1.17 entry at T1.17.1.1. This record supplies no runtime implementation or proof and does not authorize RED.

## Fail-closed cases

| Case | Required result |
|---|---|
| P7 record absent, unapproved, digest-invalid, or not integrated | Candidate is non-approvable; P8 remains blocked. |
| P7 record is valid but P8 has no separate approval | P8 remains blocked; one record cannot satisfy both gates. |
| ArtifactRef field, source commit/path, revision, media/digest mode, or content digest is missing or mismatched | Candidate is non-approvable. |
| Required identity is missing, invented, or conflated with a plan position, branch, event field, or another identity | Candidate is non-approvable. |
| `binding_epoch`, `host_epoch`, or `generation` is conflated or assigned to the wrong authority domain | Candidate is non-approvable. |
| Base SHA is unauthorized or drifts; branch is outside the allowed namespace; worktree is foreign, aliased, or outside the registered container | Candidate is non-approvable and no lifecycle action is permitted. |
| A Change A dependency is added to P7/P8, C→D is removed, P9 gates P10/P11, a dependency is missing, an ID duplicates, or a cycle appears | Candidate is non-approvable. |
| P8 assumes Main, Workspace Manager, Change E, P7 retry/polling, provider, installation, migration, or delivery authority | Candidate is non-approvable. |
| Historical P6, P7 normative, P8 proposal/spec, canonical contract, runtime, source, test, or `bun.lock` bytes drift in this candidate | Candidate is non-approvable. |
| Regression evidence fails or cannot be tied to the frozen source candidate | Candidate is non-approvable. |

## Structural and regression evidence

| Check | Observed result |
|---|---|
| Catalog and Plan Manifest parse | PASS — catalog revision 3; Plan Manifest artifact revision 2. |
| ArtifactRefs | PASS — 20 complete refs resolved from exact source commits and their raw-byte SHA-256 digests matched. |
| Graph | PASS — 15 unique slices, all dependencies resolved, acyclic, both DAG paths, explicit C→D, no A→P7/P8, and no P9 gate. |
| Integrated history | PASS — P6 closing merge and P7 record integration commit are ancestors of the prepared base. |
| P7 immutable reference | PASS — integration and prepared-base blobs both equal `252bb6520bcee35642c03af35b59df606ba17c55`; raw-byte digest matches the independent ref. |
| Pre/post materialization source freeze | PASS — both JSON manifests parsed with HEAD `3db3c121d48a07d7696afe6a88de044f30ea4695`, 285 tracked and 0 untracked entries; files are byte-identical at SHA-256 `b82f667a33dbb65a1d295e1b6339aeea7cba3bd0647cd916e8166b98907ff49a`. |
| Lock preservation | PASS — `bun.lock` remains `sha256:28e5ea2301beee6666b39c406b00c9099277ccb395d0bb923383b3b62709ebf4`. |
| Dependency materialization | Root execution evidence says `bun install --frozen-lockfile` ran exactly once, installed 33 packages, and materialized only ignored `/node_modules/`; this worker did not rerun it. The byte-identical source freezes and unchanged lock corroborate no source mutation. |
| Authoritative regression | PASS — root ran exact command `bun test` once after materialization: 598 pass, 0 fail, 3,495 `expect()` calls across 39 files in 56.50s. Full output: `/tmp/pi-bash-85651b86eeea4749.log`, `sha256:0036a6179102a1deb9a4a11e5be0e4c7af747b24ccc5c6467dc69d2756b34a4e`. This worker did not rerun it. |
| Runtime harness | N/A — this candidate changes documentation and gate evidence only; it creates no route, process, database, host, timer, or runtime behavior. |

The source-freeze manifests precede this documentation transition. Final diff-scope, whitespace, stat, and file SHA-256 checks remain external because a document cannot bind its own final digest without self-reference. The prior regression evidence is preserved as historical evidence; this worker did not rerun tests.

## Approved state and hard boundary

- Record: **APPROVED**
- P8 gate: **S1.17 VALIDATION AUTHORIZED**
- Approval: **APPROVED** by maintainer at `2026-08-11T19:17:33Z`, evidence observation 8483
- T1.12.1.1–7: **COMPLETE**
- S1.17: **ONLY T1.17.1.1 RECORD VALIDATION AUTHORIZED**
- RED and runtime implementation: **NOT AUTHORIZED UNTIL VALIDATION PASSES**
- Installation, delivery, production readiness, commit, push, and Tower: **NOT AUTHORIZED**

Next action is S1.17 T1.17.1.1 validation of this exact approved record. No later action may begin from this approval alone.
