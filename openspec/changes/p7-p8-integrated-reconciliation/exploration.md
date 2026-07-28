# Exploration: P7-P8 Integrated Reconciliation

## Executive decision

Preserve P7 and P8 through their existing planning artifacts and apply only bounded integration amendments. Do not rebuild either SDD lifecycle. M0 must first synchronize the roadmap/catalog/manifest, amend P7's proposal plus both designs/tasks, amend P8's designs/tasks, and create separate reconciliation records before either apply phase.

## Current State

- The checkout is clean at `68cc5da` (`origin/master`). P7 planning was merged by `9ad830b` (PR #30), P8 planning by `a0b6f9d` (PR #32), and the integrated A-I product architecture by `0745f99` (PR #47). Roadmap synchronization followed in `e817135` (PR #49), canonical ArtifactRef binding in `55efaf4` (PR #51), and worktree documentation in `68cc5da` (PR #53).
- P7 has proposal/spec/design/tasks and a session handoff; P8 has proposal/spec/design/tasks and `STATUS.md`. Neither change has `reconciliation.md`. P7's spec and P8's proposal/spec already express the valid host-neutral boundaries and should be reused.
- `gentle-ai sdd-status` reports P7 as `0/28`, P8 as `0/8`, and both `applyState: ready`; however it reports `artifactStore: openspec`, empty relationships, no state file, and no reconciliation gate. The native result is therefore structural existence, not integrated apply readiness. `sdd-continue` reproduces the same P7 status and does not resolve this gap.
- Native P6 status is `30/50` with apply ready. The roadmap still says `26/50`, and P6's historical `apply-progress.md` still contains older branch/worktree counts. M0 should refresh the roadmap from native status without rewriting P6 history.
- The plan manifest contains 15 slices and 4 top-level ArtifactRefs, but its roadmap ref points to `e817135` and digest `7ae75fe...`; the current `master-index.md` at `68cc5da` hashes to `a714a645...`. The manifest ref is stale after the maintenance edit. The catalog's `roadmap_anchor: sdd-tower-implementation-v1` has no explicit matching anchor in the roadmap, and every `acceptance_refs` entry is a scalar such as `requirement-gate-c` although REQUIREMENTS defines these as ArtifactRefs.
- The manifest currently makes optional mechanism P9 a hard dependency of P10, which then gates P11 and product Change I. This contradicts the roadmap's explicit statement that Claude is opt-in and does not block the Pi/OpenCode pilot. The manifest also lacks the required C-to-D edge if the integrated DAG is interpreted as `A -> B/C -> D -> E`.
- The approved RFC is authoritative for roles and boundaries: Maintainer (human irreversible authority), Hermes (presentation), Main (per-project authority), Support (read-only decomposition), Policy (plan-local eligibility), Planning (future slice through tasks), Implementation (reconciliation/apply/verify/binding delta), and mechanism services (Control Tower, Workspace Manager, Host Launcher). P7/P8 are host adapters in the plan-agnostic substrate; they are not Main, Policy, Planning, Implementation, or Change A-I owners.
- The integrated identity contract distinguishes `project_id`, `plan_id`, `slice_id`, `assignment_id`, `jornada_id`, and `session_id`. Host identity includes `host_process_instance`, `plugin_instance`, and `root_session_id`. `binding_epoch` belongs to constructor-bound continuation registration/capability identity; `host_epoch` belongs to Main's exclusive execution-line/failover fence. P7/P8's process-local controller `generation` is a third, non-authoritative lifecycle counter. No P7/P8 artifact currently states this complete distinction.
- Worktrees are ephemeral and assignment-bound: `Worktrees/<plan>/<lane>/<slice>` under the registered project container, with `plan/<plan>/<slice>` or `feat/<plan>/<slice>` branches, an authorized base SHA, and exact assignment/session identity. They are never recycled by branch switch. P7/P8 do not create, retire, or own worktrees; they consume the authorized session/assignment context and return host lifecycle evidence.
- Change E (`sdd-tower-host-launcher`) already names C, D, P7, and P8 as dependencies and owns launch/inspect/stop/health, session naming, heartbeat, stop proof, `host_epoch`, and exclusive OpenCode-to-Pi failover. P7/P8 must expose only the reconciled adapter/conformance contracts E consumes; they must not absorb launcher or failover authority.

## Affected Areas

| File | Minimal amendment or preservation action |
|---|---|
| `openspec/plans/master-index.md` | Refresh native P6 status/provenance; correct PR/commit references; state the integrated DAG, role boundaries, ID/epoch rules, ephemeral worktree rule, A-parallel/P7-reconciliation rule, P8-after-P7 gate, and Change E handoff. |
| `openspec/plans/manifest.yaml` | Resolve `roadmap_anchor` against an explicit roadmap anchor (or change both to one canonical value). |
| `openspec/plans/sdd-tower-implementation/manifest.yaml` | Rebind the roadmap ArtifactRef to the reconciled roadmap commit/digest, increment manifest revision when changed, convert `acceptance_refs` to valid ArtifactRefs, add C→D, and remove P9 as a required P10/P11 path while retaining it as optional conformance work. Keep P7/P8 substrate edges and do not add Change A to either. |
| `openspec/changes/p7-host-neutral-loop-opencode-adapter/proposal.md` | Amend only the integrated context: substrate ownership, exact IDs, ArtifactRef/manifest inputs, binding-vs-host epoch boundary, ephemeral-worktree non-ownership, no Change A dependency, and Change E integration. |
| `openspec/changes/p7-host-neutral-loop-opencode-adapter/specs/host-neutral-polling-opencode-adapter/spec.md` | Reuse unchanged; its host-neutral safety and reconciliation gate remain normative. |
| `openspec/changes/p7-host-neutral-loop-opencode-adapter/design.md` | Add a bounded integrated-contract section and update reconciliation inputs/outputs with roles, IDs, ArtifactRefs, worktree/session semantics, epoch separation, and the E adapter boundary. Do not redesign the controller. |
| `openspec/changes/p7-host-neutral-loop-opencode-adapter/tasks.md` | Expand the existing apply-gate checklist (without rebuilding task units) to pin manifest/ArtifactRefs, all IDs, epoch semantics, worktree ownership, E handoff, and the no-A dependency; retain existing budgets and P7-A1→A2→B→C order. |
| `openspec/changes/p7-host-neutral-loop-opencode-adapter/session-handoff.md` | Replace stale “active P6 worktree”/planning-only provenance with the merged P6 base and the integrated reconciliation-first handoff. |
| `openspec/changes/p8-slice-planning/proposal.md` | Reuse unchanged; it already depends only on reconciled P6/P7 and has no Change A dependency. |
| `openspec/changes/p8-slice-planning/specs/control-tower-pi-adapter/spec.md` | Reuse unchanged; it already fixes Pi's authority, idle, wake, and pre-apply gate. |
| `openspec/changes/p8-slice-planning/design.md` | Add the same bounded integrated-contract mapping, including P7 ArtifactRefs, all IDs, binding-vs-host epoch semantics, ephemeral-worktree non-ownership, and Change E consumption. Preserve the generation coordinator design. |
| `openspec/changes/p8-slice-planning/tasks.md` | Expand task 1.1/reconciliation evidence and keep the three existing work units; require P7 integrated evidence before P8 RED and retain the no-A dependency. |
| `openspec/changes/p8-slice-planning/STATUS.md` | Correct “resume directly at apply” to “resume at reconciliation, then apply only after P7 integration and both gates pass.” |
| `openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md` | Required future M0 artifact: merged P6 evidence plus integrated manifest/ArtifactRefs, IDs, epochs, worktree boundary, OpenCode proof, and E handoff. Not created in this read-only exploration. |
| `openspec/changes/p8-slice-planning/reconciliation.md` | Required future M0 artifact: merged P6/P7 evidence plus Pi proof, shared ArtifactRefs/IDs/epochs, worktree boundary, and E handoff. Not created in this read-only exploration. |
| `openspec/changes/autonomous-continuation-control-tower/apply-progress.md` | Historical P6 evidence; do not rewrite as part of M0. Treat its stale counts/branch path as evidence requiring roadmap clarification, not as current authority. |
| `openspec/changes/sdd-tower-host-launcher/proposal.md` | No M0 rewrite required; use its existing C/D/P7/P8 dependency and host-epoch ownership as the downstream Change E contract. |

## Approaches

1. **Bounded in-place reconciliation** — amend only the identified proposal/design/task/status/roadmap/manifest seams, reuse valid P7/P8 proposal/spec content, and record two explicit reconciliation gates.
   - Pros: preserves merged planning history, keeps review scope bounded, makes the integrated DAG and authority model machine-checkable, and prevents native `apply-ready` from bypassing evidence.
   - Cons: requires synchronized changes across roadmap, manifests, and two change folders; ArtifactRef normalization needs careful digest updates.
   - Effort: Medium

2. **Rebuild P7/P8 planning from the integrated architecture** — rerun exploration through tasks under new assumptions.
   - Pros: produces internally uniform documents in one pass.
   - Cons: discards valid approved work, violates the explicit preservation decision, obscures historical provenance, and risks inventing a Change A dependency.
   - Effort: High

## Recommendation

Use bounded in-place reconciliation. M0 should first fix the catalog/manifest mechanical errors and refresh the roadmap from native status, then amend only the listed P7/P8 integration seams. Preserve P7's spec and P8's proposal/spec, keep Change A parallel to P7 reconciliation, require P8 to wait for an integrated P7, and leave implementation blocked until each change has an approved `reconciliation.md`. Change E remains the downstream owner of host launch and `host_epoch` failover.

## Risks

- Native SDD status will continue to report P7/P8 `apply ready` because it checks artifact presence, not reconciliation evidence, relationships, or manifest validity.
- Updating the roadmap without re-binding its ArtifactRef will leave the Plan Manifest digest-invalid; updating acceptance refs without a stable ArtifactRef convention can create a second schema ambiguity.
- Treating `binding_epoch`, `host_epoch`, or controller `generation` as interchangeable could authorize stale claims or mixed-host writers.
- P8 may be started before the merged P7 controller/fixture is integrated unless the manifest and status handoff encode the dependency explicitly.
- The stale P6 `apply-progress.md` could be mistaken for current authority; native status and merged Git evidence must win without rewriting historical records.

## Non-goals

- No code, runtime, SQLite, Migration 005, schema, host installation, or production-state changes.
- No rebuilding or re-running P7/P8 exploration, proposal, specification, design, or tasks wholesale.
- No dependency from P7/P8 to Change A; no blocking of Change A's spec work on P7 reconciliation.
- No P7/P8 ownership of Main/Policy decisions, Plan interpretation, worktree creation/retirement, delivery/merge, launcher health, failover, or `host_epoch` mutation.
- No required Claude/P9 dependency for the Pi/OpenCode path.
- No commits, pushes, PRs, reviews, 4R lenses, or Judgment Day.

## Ready for Proposal

Yes — the exact files, bounded amendments, dependency corrections, and two reconciliation gates are identified. The orchestrator should tell the user that M0 is a documentation/graph reconciliation step, not a rebuilt P7/P8 lifecycle, and that apply remains blocked until both reconciliation records are approved.
