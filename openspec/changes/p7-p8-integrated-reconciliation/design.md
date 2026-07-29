# Design: P7-P8 Integrated Reconciliation

> Terminology: P6 and P7 in this migrated document are legacy mechanism identifiers; P7 means `p7-host-neutral-loop-opencode-adapter`. Neither value denotes positional Plan P6 or Plan P7.

## Technical Approach

Execute S1.9–S1.12 as a documentation-only, fail-closed publication sequence. First reconcile roadmap/catalog content, then publish the revised Plan Manifest, then approve and integrate the independent P7 record, and only then approve P8. Native `apply-ready` never substitutes for either record. No runtime contract, code, database, worktree, launcher, or P6 history is changed.

Authority is read in this order: Maintainer-approved PRD/RFC/REQUIREMENTS; integrated Git/OpenSpec; Main-published catalog/manifest; merged P6 evidence; unchanged P7/P8 specs; amendable planning/handoff documents. Role ownership remains: Maintainer—irreversible approval; Hermes—presentation; Main—project/plan authority and publication; Support—read-only decomposition; Policy—plan-local eligibility; Planning—future slices through tasks; Implementation—reconciliation/apply/verify/binding deltas. Control Tower is the plan-agnostic coordination/continuation mechanism; Workspace Manager alone manages ephemeral-worktree inspection, creation, and retirement; Host Launcher/Change E exclusively owns host launch/inspect/stop/health, heartbeat, stop proof, session naming, the `host_epoch` failover mechanism, and exclusive failover. Main remains authoritative for issuing/fencing `host_epoch`; P7/P8 are substrate adapters, not product or mechanism authorities.

## Architecture Decisions

| Option | Tradeoff | Decision and rationale |
|---|---|---|
| One self-referential commit | Cannot know its own `source_commit` | Reject. Publish content before external ArtifactRefs. |
| One shared P7/P8 record | Shorter but collapses gates/history | Reject. P8 references, never embeds or replaces, integrated P7 evidence. |
| Rebuild P7/P8 planning | Creates drift | Reject. Apply the bounded amendment matrix and preserve normative specs. |
| Make Change A a prerequisite | Serializes independent substrate work | Reject. P7 depends only on P6; P8 only on P7; both converge with product work at Change E. |
| Rewrite P6 progress | Produces cleaner prose but destroys audit history | Reject. Cite current merged evidence separately and preserve the file byte-for-byte. |

## Data Flow and Ordering

```text
S1.9:  roadmap/catalog + bounded P7/P8 amendments -> integrated content commit
S1.10: manifest revision/ref binding              -> integrated manifest commit
S1.11: P7 record -> validate -> approve -> integrate -> P7 gate open
S1.12: P8 record cites integrated P7 evidence     -> approve -> P8 gate open
```

Each Sesión validates before publication; failure leaves that and later gates blocked. Rollback reverts S1.12→S1.9 without editing historical commits.

## Amendment Matrix

| File | Action | Bounded change |
|---|---|---|
| `openspec/plans/master-index.md` | Modify | Refresh P6 to merged completion/provenance; show both DAG paths and P7/P8 evidence gates. |
| `openspec/plans/manifest.yaml` | Modify | Set `catalog_revision: 2`; align `roadmap_anchor` to `sdd-tower-implementation`. |
| `openspec/plans/sdd-tower-implementation/manifest.yaml` | Modify | Revision 2, ArtifactRefs, C→D, and remove optional P9 as a hard dependency from both P10 and P11 prerequisite closures: P10 depends on P8; P11 depends on P10, never P9. |
| `p7-host-neutral-loop-opencode-adapter/{proposal.md,design.md,tasks.md,session-handoff.md}` | Modify | Replace stale P6/worktree assumptions with integrated evidence and the S1.11 gate. |
| `p7-host-neutral-loop-opencode-adapter/reconciliation.md` | Create | Independent P7 evidence and approval record. |
| `p8-slice-planning/{design.md,tasks.md,STATUS.md}` | Modify | Require integrated P7 evidence plus the independent P8 gate. |
| `p8-slice-planning/reconciliation.md` | Create | Independent P8 evidence and approval record. |

## Artifact and Record Contracts

The Plan Manifest increments `artifact_revision: 1→2` because DAG and acceptance change. Its roadmap ArtifactRef increments `artifact_revision: 1→2`, uses `raw-bytes`, and binds the S1.9 commit plus exact SHA-256. `created_at` records revision publication time; Main remains producer. Every scalar `acceptance_refs` entry becomes a complete ArtifactRef retaining its requirement ID and binding `openspec/specs/sdd-tower-implementation-v1-requirements.md` at commit `0745f99a3d9ab7f9c3676af4d1ca3adf0f0c5c95`, `raw-bytes`, digest `sha256:277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0`.

Each Markdown reconciliation record contains: record version/state; gate and integrated base commit; ArtifactRefs for manifest and prepared artifacts; prerequisite evidence (P6 for P7, integrated P7 plus P6 for P8); DAG assertions; the complete role/mechanism matrix above; identity matrix for `project_id`, `plan_id`, `slice_id`, `assignment_id`, `jornada_id`, `session_id`, `host_process_instance`, `plugin_instance`, and `root_session_id`; separate `binding_epoch`, Main-issued/Change-E-enforced `host_epoch`, and controller-local non-authoritative `generation`; and resolved decisions, validation, approver, and approval evidence. Unallocated runtime identities are “not allocated,” never invented.

The worktree evidence MUST pin `Worktrees/<plan>/<lane>/<slice>` inside the registered project container to an authorized base SHA, exactly `plan/<plan>/<slice>` or `feat/<plan>/<slice>`, its `assignment_id`, and its `session_id`. Workspace Manager retains lifecycle authority; P7/P8 have no create, retire, recycle, branch-switch, launch, inspect, stop, health, heartbeat, stop-proof, session-naming, `host_epoch`, or failover authority.

## Validation Strategy

Parse both YAML files; reject unknown/missing ArtifactRef fields; resolve every `source_commit:path`; recompute digests; verify revisions, unique slices, existing dependencies, acyclicity, C→D, P6→P7→P8→E, A→B/C→D→E, no A→P7/P8 edge, and no P9→P10/P11 gate. Diff guards prove preserved files unchanged and no runtime paths changed. P7 validation runs before P8 validation.

## Preservation, Rollback, and Rollout

Preserve byte-for-byte: canonical PRD/RFC/REQUIREMENTS; `autonomous-continuation-control-tower/apply-progress.md`; P7 spec; P8 proposal and spec; all runtime/source/test files. Revert S1.12–S1.9 together in reverse order; no history rewrite, migration, feature flag, or runtime rollback is permitted.

## Threat Matrix

N/A — this change adds no routing, shell, subprocess, VCS/PR automation, executable classification, or process-integration behavior.

## Open Questions

None.
