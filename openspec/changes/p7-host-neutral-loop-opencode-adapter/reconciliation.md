# P7 Reconciliation Record — Prepared, Gate Closed

## Gate decision

| Field | Value |
|---|---|
| Record schema | `p7-reconciliation-record/v1` |
| Record state | `BLOCKED` |
| Integrated base | `a1c75b39d6d285f9f9be8f074df718d85504a177` |
| Gate | `P7_APPLY` |
| Gate result | `CLOSED` |
| Approval required | `yes` |
| Approver | `not allocated` |
| Approval evidence | `not allocated` |
| Exact approval blocker | `apply identities must be allocated before final exact record approval` |

This record prepares independently verifiable P7 evidence against the canonical
integrated R2 state. It does **not** assert approval or runtime apply readiness.
Native `apply-ready` and artifact presence do not open the gate.

## Integrated Git state

- Canonical R2 merge: `a1c75b39d6d285f9f9be8f074df718d85504a177`.
- Parents: R1 `b96e4d95896377b59f2a6bf5c5d6bc80ba5530d0` and R2 child
  `1073115607c268655c452c738791b74518ba4727`.
- Git tree: `084cc035a3c596d11c25b1df703507915a0e3c5b`.
- Committed evidence precursor: `44becc1153b24273796c1d6823f481179358757b`;
  tree `ea08feb6501b99e9a0ed02fa8b4dc6c3912da71d`. Canonical integrated R2
  `a1c75b39d6d285f9f9be8f074df718d85504a177` is its ancestor.
- Merged P6 closing commit `e16d94b79111a1cd9521046e88f7cb51af9441da` is an ancestor of the integrated base.
- The P6 historical progress record is cited below and remains byte-for-byte
  unchanged; the current roadmap carries the newer merged provenance.

## ArtifactRefs

All refs use `schema: artifact-ref`, `schema_version: 1`, and
`repository_id: control-tower`. The Plan Manifest is structured YAML and uses
`media_type: application/yaml` with `digest_mode: rfc8785-jcs`; the runtime
fixture is structured JSON with `media_type: application/json` and
`digest_mode: rfc8785-jcs`; the eight Markdown refs use
`media_type: text/markdown` with `digest_mode: raw-bytes`.
Every digest was recomputed from the named `source_commit:path` using the
declared mode. The external record carries the source commit and digest, so the
Plan Manifest does not reference its own digest or source commit.

| Artifact ID | Revision | Media / digest mode | Source commit and path | Content digest |
|---|---:|---|---|---|
| `plan-sdd-tower-implementation` | 2 | `application/yaml` / `rfc8785-jcs` | `1073115607c268655c452c738791b74518ba4727:openspec/plans/sdd-tower-implementation/manifest.yaml` | `sha256:3ea199760048e61b42b0924eaa1bdbd2e6efa8c67d4bd6a27fec268c23e3b435` |
| `sdd-tower-implementation-v1-roadmap` | 2 | `text/markdown` / `raw-bytes` | `b96e4d95896377b59f2a6bf5c5d6bc80ba5530d0:openspec/plans/master-index.md` | `sha256:197bf3f6e168398ce225baffdc6caac41bc8c9fa5feded2185c0c72c3b0a4fd5` |
| `p6-apply-progress` | 1 | `text/markdown` / `raw-bytes` | `e16d94b79111a1cd9521046e88f7cb51af9441da:openspec/changes/autonomous-continuation-control-tower/apply-progress.md` | `sha256:114fb7490fd5790f21f1c19b77390bfc2f476cc82bdc8b107ee5bcfbeb6e8f6c` |
| `p7-proposal` | 1 | `text/markdown` / `raw-bytes` | `a1c75b39d6d285f9f9be8f074df718d85504a177:openspec/changes/p7-host-neutral-loop-opencode-adapter/proposal.md` | `sha256:ab7141009c0c68db61640050c0e4d230598f11db14c3937f026ebd8497a1ba78` |
| `p7-design` | 1 | `text/markdown` / `raw-bytes` | `a1c75b39d6d285f9f9be8f074df718d85504a177:openspec/changes/p7-host-neutral-loop-opencode-adapter/design.md` | `sha256:7499ecb26e91f9270905148ee652d1501949fa5d9253dda65b798a67228def8b` |
| `p7-tasks` | 1 | `text/markdown` / `raw-bytes` | `a1c75b39d6d285f9f9be8f074df718d85504a177:openspec/changes/p7-host-neutral-loop-opencode-adapter/tasks.md` | `sha256:0edd1dc441aaa03e00e3f657cf53739f718f7ab243e7dcf58c31599fea511e0c` |
| `p7-session-handoff` | 1 | `text/markdown` / `raw-bytes` | `a1c75b39d6d285f9f9be8f074df718d85504a177:openspec/changes/p7-host-neutral-loop-opencode-adapter/session-handoff.md` | `sha256:c038b5d30e0c42e70ef71ef8ca58b15220976134f141ad5ddc8568ea4bd25b1d` |
| `p7-normative-spec` | 1 | `text/markdown` / `raw-bytes` | `a1c75b39d6d285f9f9be8f074df718d85504a177:openspec/changes/p7-host-neutral-loop-opencode-adapter/specs/host-neutral-polling-opencode-adapter/spec.md` | `sha256:58703aa49c9c9ca01888ed7bcc313356ea1e3bff31ee588015db757d7aed09b2` |
| `p7-opencode-1.18.7-runtime-fixture` | 1 | `application/json` / `rfc8785-jcs` | `44becc1153b24273796c1d6823f481179358757b:openspec/changes/p7-host-neutral-loop-opencode-adapter/evidence/opencode-1.18.7-runtime-fixture.json` | `sha256:bb74a1aef0a6340eaeb19b7fcda86c6c3b611eb95c20c673f7e88bb5ccdad5ff` |
| `p7-opencode-1.18.7-runtime-fixture-reproduction` | 1 | `text/markdown` / `raw-bytes` | `44becc1153b24273796c1d6823f481179358757b:openspec/changes/p7-host-neutral-loop-opencode-adapter/evidence/README.md` | `sha256:90e7b419b0c7f058ba2c600b68b648b4da8712151b6367635ccf264cd3ff7180` |

All ten source paths resolve to committed blobs. The fixture blobs are
`18f7d028c97dcafc7defcb82cfc306016848b1b3` (JSON) and
`cc8ef244e09e2c0a2ad1fe55b8df5f8fa293147e` (README). Their content contains
neither the precursor commit nor either ArtifactRef digest, so the bindings are
external and non-self-referential. Working-tree bytes match both committed blobs.

The Plan Manifest's canonical PRD, RFC, and REQUIREMENTS ArtifactRefs resolve at
`0745f99a3d9ab7f9c3676af4d1ca3adf0f0c5c95` to their declared raw-byte
digests: `sha256:bd8d630d9c1a80b566921980dd67b7e0c421cf7ba08528958ffad1431ec802b5`,
`sha256:a6272899bf76c141850ea1c38444d303b7dfcc84e1f7351c95bffb8557c82cce`,
and `sha256:277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0`
respectively.

## P6 prerequisite evidence

| Evidence | Integrated value |
|---|---|
| Schema | Version 5; `SCHEMA_MANIFESTS.get(5)` binds migrations 1–5 |
| Migration 005 | 14,996 bytes; 231 lines; `sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98` |
| Polling witness constraint | Exactly `polling_witness = 'UNAVAILABLE_BEFORE_P7'`; unchanged |
| Bootstrap/replay | `bootstrapAdmin` implements the exact schema 4→5 committed/replay envelope and rejects conflicting identity/CAS evidence |
| Continuation receive | `continuationReceive(handle, ctxFactory)` is argument-free at dispatch and returns non-consuming pending-delivery evidence |
| Claim boundary | `continuationClaim(handle, ctxFactory, request)` remains a separate explicit operation |
| Capability boundary | `createContinuationDispatcher` receives constructor-bound metadata/process identity; request/environment authority is not accepted |
| Rollback/quiescence | `beginRollback`, `rebindMain`, and `finishRollback` retain proof-bound schema-5 behavior; the transient P7 baseline claims no persisted witness |

No P6 polling table or committed `host/loop.mjs`, `test/polling.test.mjs`, or
`test/host-adapters.test.mjs` exists at this base. The current legacy OpenCode
plugin remains evidence only; it is not an approved implementation source.

## DAG assertions

- Mechanism path: `P6 → P7 → P8 → Change E`.
- Product path: `A → B/C → D → Change E`, including C→D.
- P7 depends on P6 only. There is no Change A→P7 or Change A→P8 edge.
- P8 stays downstream of integrated P7 and retains its independent evidence gate.
- Optional P9 does not gate P10 or P11.
- Change E is the convergence point; this record does not transfer its authority.

## Role and mechanism matrix

| Actor/mechanism | Preserved authority |
|---|---|
| Maintainer | Irreversible approval; only this role may approve this record |
| Hermes | Presentation only |
| Main | Project/plan authority, manifest publication, and `host_epoch` issuance/fencing |
| Support | Read-only decomposition |
| Policy | Plan-local eligibility |
| Planning | Future slices through tasks |
| Implementation | Reconciliation, apply, verify, and binding deltas after gates pass |
| Control Tower | Plan-agnostic coordination/continuation mechanism |
| Workspace Manager | Exclusive ephemeral-worktree inspect/create/retire lifecycle |
| Change E / Host Launcher | Host launch/inspect/stop/health, heartbeat, stop proof, session naming, `host_epoch` enforcement, and exclusive failover |
| P7/P8 | Substrate adapters; no product, worktree-lifecycle, or host-lifecycle authority |

## Identity and epoch matrix

| Identity/fence | Evidence value | Status |
|---|---|---|
| `project_id` | `control-tower` | allocated by Plan Manifest |
| `plan_id` | `sdd-tower-implementation` | allocated by Plan Manifest |
| `slice_id` | `mechanism-p7-opencode` | allocated by Plan Manifest |
| `assignment_id` | `not allocated` | blocker for runtime assignment |
| `jornada_id` | `not allocated` | blocker for runtime assignment |
| `session_id` | `not allocated` | blocker for runtime assignment |
| `host_process_instance` | `not allocated` | blocker for runtime binding |
| `plugin_instance` | `not allocated` | blocker for runtime binding |
| `root_session_id` | `not allocated` | blocker for runtime binding/root proof |
| `binding_epoch` | `not allocated` | capability fence; never inferred |
| `host_epoch` | `not allocated` | Main-issued/fenced; Change E-enforced |
| controller `generation` | `not allocated` | process-local and non-authoritative |

`binding_epoch`, `host_epoch`, and controller-local `generation` are distinct
and non-substitutable. Missing values fail closed.

`host_epoch` and controller-local `generation` are intentionally `not allocated`,
but neither is a PRE-APPROVAL/readiness blocker. Main issues and fences
`host_epoch` when applicable, and Change E enforces it downstream. Controller
`generation` is process-local and cannot exist before controller execution.

## Authorized base and workspace evidence

| Field | Required/evidenced value |
|---|---|
| Registered project container | `/home/emili/projects/control-tower` |
| Runtime worktree | `not allocated`; must match `Worktrees/<plan>/<lane>/<slice>` inside the container |
| Authorized implementation base SHA | `not allocated`; must be issued for the assignment, not inferred from this preparation base |
| Runtime branch | `not allocated`; must match exactly `plan/<plan>/<slice>` or `feat/<plan>/<slice>` |
| Assignment/session binding | `not allocated`; both are mandatory before runtime apply |
| Lifecycle owner | Workspace Manager; P7 cannot create, retire, recycle, or branch-switch the worktree |

The preparation worktree and branch are evidence-authoring context only. They are
not runtime assignment evidence and MUST NOT be reused as such.

## Approved readiness decisions

The maintainer approved the architecture and compatibility decisions below. They
resolve the previously open design blockers but do not approve this exact record or
allocate apply-time identities.

1. Pin `opencode-ai`, `@opencode-ai/plugin`, and `@opencode-ai/sdk` exactly to
   `1.18.7`. Registry integrity evidence is:
   - `opencode-ai@1.18.7`: `sha512-/C4Bc+mHbTK+GvhiZ83rguwVSNBs1sCzooQ3CCOz7G8SBYqbsXajlm0OtZ7RaMEUWxHWeMvOnGi4RC4OpAnC/g==`
   - `@opencode-ai/plugin@1.18.7`: `sha512-kXm5hqur5JiF/xJPaQYkuNn7vSl4ya09YgL/pIvIrggWCLFsfo1gXqNbONRcGW7m5Ih2k6kgMXFyjB9or1+dEg==`
   - `@opencode-ai/sdk@1.18.7`: `sha512-5txVELvCxzC3O/MYnRKdTvBN3TqQjE3PaEks3kDRA/moWzMSUhdm15xCth/Mz/NPYyGTn2u4IdScdV9vLTfLRg==`
   The installed binary SHA-256 is
   `5a0ffa7a5504bdde023a0c59cfa009654c52186d135b3b762f28e032ca2833b5`.
2. The root ID comes from an independently trusted host binding and is verified
   through non-consuming `session.get`. Parentless listing alone is insufficient.
3. P7 reuses capability-gated MCP continuation `receive` through an injected
   private host-composition peek port. P7 defines port/conformance; Change E owns
   production broker/process wiring. No adapter direct core/MCP/SQLite import and
   no second public continuation API are permitted.
4. Consuming legacy automatic queue wake is excluded from P7. Existing manual
   queue APIs remain. Any automatic compatibility is a separate future
   non-consuming, non-lossy unit.
5. Transient in-memory polling is accepted. A harmless late generic wake across
   rollback is acceptable because authority still requires
   `receive → claim → ack`; it is not a persisted quiescence witness.
6. Delivery uses four serial `stacked-to-main` units with one active at a time:
   `P7-A1 → P7-A2 → P7-B → P7-C`.

The canonical P7 plan contains **30 tasks**. The roadmap's `0/28` counter is a
later revision follow-up because the current roadmap bytes are bound by the
revision-2 ArtifactRef; this preparation does not rewrite them.

## Exact wake contract

```js
client.session.promptAsync({
  path: { id: rootSessionId },
  query: { directory },
  body: {
    parts: [{
      type: "text",
      text: "A Control Tower continuation is pending. Use the continuation receive and claim tools to inspect and claim it.",
    }],
  },
  throwOnError: true,
})
```

The adapter asserts HTTP `204` separately. The legacy SDK exposes response data
as `{}`; that object is not completion evidence. Completion or failure comes from
lifecycle events.

## OpenCode 1.18.7 runtime fixture evidence

The committed structured fixture and its reproducible procedure are the two
ArtifactRefs above; this evidence is not narrative-only. The JSON is normative
structured evidence, and the README provides the exact isolated rerun boundary.

The fixture used isolated temporary state and a dedicated process and left no
listener, process, or fixture root after cleanup.

| Scenario | Exact observed result | Evidence class |
|---|---|---|
| Root/child relationship | Parentless root and explicit child `parentID` relationship passed; trusted root still requires host binding plus non-consuming `session.get`. | Runtime-proven |
| Metadata | Missing metadata and object metadata were accepted; object metadata was preserved. Non-object metadata returned HTTP `400` and emitted no create event. | Runtime-proven |
| Recursive deletion | Receipts were child-first. Callback-time `GET` already returned `404`; no idle event was required. | Runtime-proven |
| Hook concurrency | Hook callbacks overlapped and delayed completion inverted completion order. | Runtime-proven |
| `promptAsync` | Exact call returned HTTP `204` with SDK data `{}`, followed by controlled invalid-model `busy`, `error`, status-idle, and deprecated `session.idle`. | Runtime-proven failure path |
| Retry | No retry was observed. Retry remains source-only/unproven and must be established by deterministic P7 controller RED tests. | Source-only/unproven |
| Successful provider turn | Not exercised because the fixture used no credentials and generated no provider traffic. | Unexercised |
| Cleanup | Isolated temporary state and process cleanup passed. | Runtime-proven |

The record MUST NOT infer successful-turn event order or host retry behavior from
the controlled invalid-model fixture.

Retry and a successful provider turn are not P7 readiness requirements. Retry is
source-only/unproven here and is assigned to deterministic P7-A2 strict-TDD RED
coverage. A successful provider turn is unexercised because no credentials or
provider network traffic were available and is assigned to apply-time adapter
verification. Neither is claimed as runtime-proven by this record.

## Resolved blocker matrix

| Previous blocker | Resolution |
|---|---|
| OpenCode version/package integrity | Exact `1.18.7` pins, registry integrities, and installed binary hash above. |
| Root proof and lifecycle fixtures | Trusted host binding + non-consuming `session.get` and runtime fixtures above. |
| Trusted non-consuming peek seam | Private injected host-composition port over capability-gated MCP `receive`; Change E owns production wiring. |
| `promptAsync` envelope | Exact call, separate HTTP `204`, `{}` data interpretation, and lifecycle completion rule. |
| Legacy queue wake | Excluded from P7 while preserving manual APIs. |
| Transient rollback behavior | Accepted without claiming a persisted witness. |
| P7 delivery topology | Serial `stacked-to-main` A1→A2→B→C. |

The future clean adapter import boundary is not proven by the current legacy
`plugin/tower-spike.js`: that file imports core and consumes legacy receive. The
absence of direct core/MCP/SQLite access is therefore an implementation-time
acceptance criterion owned by the explicit **P7-B RED** adapter import scan and
**P7-C RED** composition/import plus public-surface snapshot checks. It is neither
completed readiness evidence nor a pre-allocation blocker; P7-A1/P7-A2 do not
claim clean-adapter coverage.

## Remaining blockers

1. Runtime assignment, jornada, session, host/plugin/root identities,
   `binding_epoch`, worktree, branch, and authorized implementation base remain
   `not allocated`. Allocate and bind these exact apply identities first.
2. After allocation, request final maintainer approval of this exact record and
   publish the approver identity, approval timestamp, and approval ArtifactRef.
   Readiness approval does not substitute for exact record approval.

`host_epoch` and controller-local `generation` remain unallocated and
non-blocking for readiness for the reasons recorded in the identity matrix.
Either remaining blocker keeps the record `BLOCKED` and `P7_APPLY` closed.

## Validation evidence

| Check | Exact result |
|---|---|
| Structural RED before record creation | Exit 1: `R3 RED: reconciliation record absent; P7 integration gate closed` |
| Baseline/full regression | Bun `1.3.14` (`d1632b29`): 282 pass, 0 fail, 2094 assertions across 11 files |
| Integrated ancestry | `origin/master` and `HEAD` equal `a1c75b...`; R1, R2 child, and merged P6 are ancestors |
| Immutable evidence | Canonical contracts, P6 progress, P7 spec, P8 proposal/spec, manifests, runtime/source/tests matched their recorded digests; all ten ArtifactRefs resolved, including fixture JSON JCS and README raw bytes |
| Runtime fixture harness | Isolated OpenCode `1.18.7` fixtures passed for root/child identity, metadata validation, child-first deletion, overlapping hooks, exact `promptAsync` 204/`{}` failure lifecycle, and cleanup. Retry remains source-only/unproven; successful provider turn remains unexercised. |

## Approval fields

- Approval decision: `not allocated`.
- Approver identity: `not allocated`.
- Approval timestamp: `not allocated`.
- Approval evidence ArtifactRef: `not allocated`.
- Gate transition: forbidden in this pass; remains `CLOSED`.

## Next action

With pre-allocation evidence and readiness decisions recorded, allocate the exact apply-time execution
identities, worktree, authorized base, and branch. Then request final maintainer
approval of this exact bound record and publish its approver, timestamp, and
ArtifactRef to open the gate without rewriting preparation history. Only after
that publication may P7-A1 begin its first strict-TDD RED.
