# Design: Authoritative Parked Checkpoint Binding

> **FALSIFIER: PASS**
>
> The current producer-to-parking path supplies the exact live producer-owned capture and reconciliation artifacts, including stable identities/digests, `VALID`, and repository/project/assignment/generation/base/result bindings, without allowing the caller to assert either produced artifact. S5.9 can therefore remain entirely within its approved `Área` and proceed to Tasks.

## Reconciliation baseline

This design reconciles the prior failed falsifier in Engram observation 8604 against the current worktree rather than copying its obsolete verdict.

- Worktree: `/home/emili/projects/control-tower/Worktrees/s5-9`
- `.git` resolves to `/home/emili/projects/control-tower/Main/.git/worktrees/s5-9`.
- Worktree `HEAD` is `refs/heads/work/s5-9-checkpoint-binding`.
- That branch ref resolves to `a4a39fabccc52971941f7f4d5e1c415f19d5e766`.
- Therefore current branch/base/HEAD matches the immutable expected value `a4a39fabccc52971941f7f4d5e1c415f19d5e766`.
- `openspec/plans/plan-5/STATUS.md` records S5.11 and S5.12 as `✅ COMPLETO`, S5.9 as `🟢 LISTO`, and S5.9's exact allowed and forbidden paths.
- Decisions 19, 20, and 21 in `openspec/plans/decision-register.md` retain Main as sole persistent owner, define `parked-checkpoint-binding-v1`, and authorize the completed producer-to-parking geometry.

The `.codegraph/` directory exists in this worktree, but no CodeGraph MCP or shell/CLI execution surface was available to this executor. Structural inspection therefore used exact source reads plus targeted symbol searches after the index check. No broad speculative repository map was used.

### Prior untracked design artifact disposition

Disposition: **ABSENT**.

The parent searched every registered Control Tower worktree, all candidate S5.9 paths, and `git ls-files --others --exclude-standard`. It found no S5.9 `design.md` candidate and no untracked S5.9/design artifact. Consequently the previously recorded SHA-256 `a349747ceb0580ef700155499125c89a025232e85ec64677d65d8e8d0bff29b1` cannot be verified against current bytes. This design does **not** claim preservation, recovery, or digest equality. Engram observation 8604 remains the only available content authority for the prior failed verdict.

## Mandatory falsifier

### 1. Real producer-owned canonical checkpoint capture — PASS

`workspace/checkpoint.mjs` now owns a real runtime producer:

```text
captureCheckpoint(request)
  -> canonical Git root/common-dir resolution
  -> exact base/result commit+tree verification
  -> exact staged bytes/modes verification
  -> checkpointCaptureIdentity(content)
  -> checkpointCaptureDigest(content + checkpoint_id)
  -> validate("checkpointCapture", candidate)
  -> module-private CanonicalCheckpointCapture brand
  -> deep freeze
  -> assertCanonicalCheckpointCapture(exact object)
```

The emitted closed artifact contains `checkpoint_id`, `digest`, `project_id`, `assignment_id`, `generation`, `repository_root`, `git_common_dir`, exact base/result commit and tree identities, and file evidence. `checkpointCaptureIdentity` and `checkpointCaptureDigest` are domain-separated deterministic derivations in `contracts/validate.mjs`. `assertCanonicalCheckpointCapture` rejects clones, reconstructions, proxies, and manual objects with `CT_PROVENANCE_ORIGIN_INVALID` even when their enumerable schema and hashes are valid.

Current tests verify the closed shape, deterministic identity/digest, deep freeze, exact Git observations, rejection of producer-output claims in the request, and rejection of cloned/manual provenance in `test/workspace/checkpoint.test.mjs`.

### 2. Real producer-owned canonical reconciliation — PASS

`workspace/reconciliation.mjs` now owns a real runtime producer:

```text
reconcileCheckpoint({ capture, evidence })
  -> assertCanonicalCheckpointCapture(exact live capture) FIRST
  -> reject closed-evidence mismatch
  -> copy capture-owned project/assignment/generation/repository/base/result
  -> force state = "VALID"
  -> copy exact capture checkpoint_id/digest
  -> reconciledCheckpointIdentity(content)
  -> reconciledCheckpointDigest(content + reconciliation_id)
  -> validate("reconciledCheckpoint", candidate)
  -> validateCheckpointProvenancePair(capture, candidate)
  -> module-private CanonicalReconciledCheckpoint brand
  -> deep freeze
  -> assertCanonicalReconciledCheckpoint(exact object)
```

The emitted artifact contains `reconciliation_id`, its own `digest`, state exactly `VALID`, exact capture identity/digest, and exact project/assignment/generation/repository root/common-dir/base/result bindings. The producer never accepts caller-supplied `state`, identity, digest, capture linkage, origin, or prebuilt artifact. Tests in `test/workspace/reconciliation.test.mjs` prove live-origin enforcement, deterministic output, every required cross-binding, `VALID` ownership, and rejection before evidence inspection when capture origin is absent.

### 3. One real unchanged producer-to-parking composition — PASS

`escalation/parking-composition.mjs` exports the production composition root `createParkingComposition`. Its constructor binds exactly three capabilities: checkpoint producer, reconciliation producer, and the Main parking store. Its only operation accepts the closed input `{ parked_decision, checkpoint_request, reconciliation_evidence }`; any caller-supplied `checkpoint_capture`, `reconciled_checkpoint`, provenance assertion, partial input, or extra field is rejected before a capability runs.

The exact call flow is:

```text
createParkingComposition({ checkpointProducer, reconciliationProducer, parkingStore })
  .park({ parked_decision, checkpoint_request, reconciliation_evidence })
    -> checkpointProducer(checkpoint_request)
       returns exact live checkpoint_capture reference
    -> reconciliationProducer({ capture: same checkpoint_capture, evidence })
       returns exact live reconciled_checkpoint reference
    -> bound parkingStore.parkDecision({
         actor: "MAIN",
         project_id: checkpoint_capture.project_id,
         parked_decision,
         checkpoint_capture: same reference,
         reconciled_checkpoint: same reference,
       })
```

`main-store/store.mjs::parkDecision` checks the Main capability, validates the parked decision, calls both producer-owned live-origin assertions on the exact supplied references, and calls `validateCheckpointProvenancePair`. Only then does it write one `decision-parkings/<parked_decision_id>.json` record through the existing canonical `commit -> atomicWrite -> withLock -> rename/fsync` boundary.

`test/escalation/parking-composition.test.mjs` proves fixed constructor capabilities, closed caller input, exact references, deterministic order, one invocation per producer, and no fallback. `test/main-store.test.mjs` exercises a real temporary Git repository through `captureCheckpoint -> reconcileCheckpoint -> composition -> Main parkDecision -> persisted readback`, rejects cloned or mismatched provenance, and verifies no shadow capture/reconciliation directories are created.

### 4. No forbidden provenance route — PASS

Targeted source searches show:

- `createParkingComposition` exists only in its production module and its focused/Main-store tests.
- The only production `parkDecision` definition is `main-store/store.mjs`; the composition calls that same approved ingress.
- The only production `captureCheckpoint` and `reconcileCheckpoint` definitions are their producer modules; no adapter or alternate producer exists.
- There is no `checkpoint-captures` or `reconciled-checkpoints` persistence path; Main-store tests assert those shadow directories remain absent.
- Generic contract validation can verify serialized integrity but cannot satisfy the private live-origin assertions used at sealing.
- The composition forbids caller-supplied producer outputs. Main does not recompute producer identity/digest or `VALID`; it accepts only the exact branded outputs and copies their already-produced values into the new Main-owned binding.
- S5.9 requires no edit to either producer or to `escalation/parking-composition.mjs`.

The direct `parkDecision` method is not a second evidence path: it is the single approved Main-store ingress bound into the composition, and it independently rejects any capture or reconciliation object that lacks the producer's private live-origin brand.

### 5. Exact `parked.checkpoint` without caller provenance — PASS

`parked-decision-v1` already closes and hashes the exact `checkpoint` string as part of `parked_decision_digest`; `contracts/parked-decision.mjs::createParkedDecision` and the parked-decision invariant reject digest drift. The caller does not assert that this text is producer output. It supplies the decision content that Main is asked to park.

S5.9 does not claim textual equivalence between that checkpoint and a producer identity. Instead, Main creates the missing authoritative relationship at the only valid moment: after it has the validated parked decision and both exact live producer artifacts in the same parking operation. The binding copies:

- `parked_decision_id`, `parked_decision_digest`, and the byte-exact `parked.checkpoint` from the validated parked decision;
- capture identity/digest and execution bindings from the exact live capture;
- reconciliation identity/digest/`VALID` and matching execution bindings from the exact live reconciliation.

Its own digest seals all those values together. This is Main-owned composition, not a caller assertion of capture/reconciliation output and not consumer recomputation of producer provenance. Any changed checkpoint requires a changed parked-decision digest and produces a different binding; replay under the same parked-decision identity is therefore divergent and rejected without replacing persisted bytes.

### Falsifier conclusion

All five mandatory propositions hold on current bytes. The prior blocker was removed by completed S5.11 and S5.12. No remaining falsifier gap requires a producer edit, parking-composition edit, adapter, alternate ingress, shadow store, second writer, or scope expansion.

**FALSIFIER: PASS. Next permitted action: `sdd-tasks`.**

## Binding contract

### Closed shape

`schemas/parked-checkpoint-binding-v1.schema.json` defines exactly:

```js
{
  schema: "parked-checkpoint-binding",
  schema_version: 1,
  parked_decision_id,
  parked_decision_digest,
  parked_checkpoint,
  capture_checkpoint_id,
  capture_checkpoint_digest,
  reconciled_checkpoint_id,
  reconciled_checkpoint_digest,
  reconciliation_state: "VALID",
  repository,
  project_id,
  assignment_id,
  generation,
  base_sha,
  result_sha,
  binding_digest,
}
```

Field sources are fixed and non-configurable:

| Binding field | Exact source |
| --- | --- |
| `parked_decision_id` | `parked.parked_decision_id` |
| `parked_decision_digest` | `parked.parked_decision_digest` |
| `parked_checkpoint` | `parked.checkpoint`, exact string equality only |
| `capture_checkpoint_id` | `capture.checkpoint_id` |
| `capture_checkpoint_digest` | `capture.digest` |
| `reconciled_checkpoint_id` | `reconciliation.reconciliation_id` |
| `reconciled_checkpoint_digest` | `reconciliation.digest` |
| `reconciliation_state` | `reconciliation.state`, must equal `VALID` |
| `repository` | `capture.repository_root`, already pair-equal to reconciliation `repository_root` |
| `project_id` | `capture.project_id`, already pair-equal to reconciliation |
| `assignment_id` | `capture.assignment_id`, already pair-equal to reconciliation |
| `generation` | `capture.generation`, already pair-equal to reconciliation |
| `base_sha` | `capture.base.commit`, already pair-equal to reconciliation |
| `result_sha` | `capture.result.commit`, already pair-equal to reconciliation |

The capture/reconciliation pair validator additionally checks `git_common_dir` and base/result tree OIDs before construction. Those fields remain protected by each producer digest and reconciliation digest even though the approved binding-v1 shape exposes only `repository`, `base_sha`, and `result_sha`.

### Digest and validation

`contracts/parked-checkpoint-binding.mjs` owns:

```js
parkedCheckpointBindingDigest(value)
createParkedCheckpointBinding({ parked_decision, checkpoint_capture, reconciled_checkpoint })
assertParkedCheckpointBinding(binding, { parked_decision, checkpoint_capture, reconciled_checkpoint })
```

`binding_digest` is `digestArtifact` in `rfc8785-jcs` mode over:

```js
{
  domain: "control-tower/parked-checkpoint-binding/artifact/v1",
  binding: every declared field except binding_digest,
}
```

Construction validates all three enumerable contracts and `validateCheckpointProvenancePair`, derives every binding field from those validated artifacts, computes the digest, and validates the closed candidate. It accepts no caller-provided binding field or override. Main remains responsible for checking live producer origin before calling this origin-neutral contract helper.

The validator invariant recomputes `binding_digest`. `assertParkedCheckpointBinding` then compares every binding field to its exact source and rejects any mismatch. Comparable paths, normalized/paraphrased checkpoint text, alternate IDs, recomputed producer digests, and semantically equivalent values do not pass.

## Main-store persistence design

### One atomic parking envelope

The standalone versioned binding is persisted as the `parked_checkpoint_binding` member of the existing `decision-parkings/<parked_decision_id>.json` envelope. “Standalone” means it has its own closed schema, version, digest, validation, and dedicated readback; it is not an `extensions` claim and is never reconstructed. Co-location is deliberate: creating a second file would split visibility across two filesystem renames or require a new transaction mechanism. Keeping the binding in the existing envelope lets the current single writer and atomic rename make the parked decision, both producer artifacts, and binding visible together or not at all.

Updated sealing order inside `parkDecision`:

1. Reject any input field other than the existing closed parking input. In particular, callers cannot submit `parked_checkpoint_binding`.
2. Run `assertMain` against the bound Main capability and project.
3. Validate the parked decision.
4. Assert exact live capture and reconciliation producer origins.
5. Validate the exact capture/reconciliation pair.
6. Verify capture project equals Main's bound project.
7. Construct and validate `parked-checkpoint-binding-v1` from the accepted artifacts.
8. Build one parking envelope containing the parked decision, exact capture, exact reconciliation, and binding.
9. Run existing replay/CAS behavior or one existing `commit("decision-parkings", ...)` atomic write.

Every check completes before `atomicWrite` creates a visible authoritative record. A validation error, authority error, pair mismatch, binding mismatch, CAS conflict, or pre-commit failure leaves no partial binding.

### Replay

For an existing parked-decision identity, Main recomputes the deterministic binding from the exact live replay inputs and compares the complete canonical parking envelope, excluding store revision metadata, with the persisted envelope.

- Exact canonical replay returns the existing record with `replayed: true`; it performs no write, adds no revision, and leaves file bytes unchanged.
- Any changed checkpoint, parked digest, producer identity/digest, `VALID`, execution binding, binding field, or binding digest produces a different canonical envelope and fails with `CT_PARKING_REPLAY_DIVERGENT`.
- Existing bytes are never replaced on divergent replay.

### Dedicated authoritative readback

Add `readParkedCheckpointBinding(parkedDecisionId)` to the Main store. It:

1. resolves only the canonical `decision-parkings/<id>.json` path;
2. fails closed with a typed store error when the parking record is absent;
3. reads the persisted envelope once;
4. validates its persisted parked decision, capture, reconciliation, pair, and standalone binding using origin-neutral integrity checks appropriate after serialization;
5. checks the requested ID equals both the parked decision and binding identity;
6. runs `assertParkedCheckpointBinding` against the persisted artifacts;
7. returns a deeply frozen clone of the persisted `parked_checkpoint_binding` member.

It does not call producers, reconstruct a binding, accept caller evidence, inspect another store, or infer from cached/narrative text. Runtime private brands are intentionally unavailable after serialization; readback proves persisted integrity and Main-owned placement, while live-origin proof was enforced before the one atomic write.

## Exact implementation files

Only these approved paths are designed to change:

| Path | Change |
| --- | --- |
| `schemas/parked-checkpoint-binding-v1.schema.json` | Add the closed v1 shape and exact primitive/identity/digest constraints. |
| `contracts/parked-checkpoint-binding.mjs` | Add domain-separated binding digest, source-derived constructor, and exact source-binding assertion. |
| `contracts/schema-registry.mjs` | Register exactly one `parkedCheckpointBinding` schema name. |
| `contracts/validate.mjs` | Add the binding digest invariant; reuse existing parked, capture, reconciliation, and pair validation. |
| `main-store/store.mjs` | Construct the binding after live-origin/pair checks, include it in the existing atomic parking envelope/replay comparison, and add dedicated persisted readback. |
| `test/contracts/parked-checkpoint-binding.test.mjs` | Add focused contract/digest/source-binding mismatch tests. |
| `test/contracts/schema.test.mjs` | Prove registration, closed shape, and fixture validation through the canonical registry. |
| `test/fixtures/contracts/schema-cases-v1.json` | Add one integrity-valid binding fixture matching the existing capture/reconciliation fixture values. |
| `test/main-store.test.mjs` | Extend real composition, atomicity, replay, caller-rejection, no-shadow-path, and dedicated-readback coverage. |

No change is designed for `workspace/checkpoint.mjs`, `workspace/reconciliation.mjs`, `escalation/parking-composition.mjs`, any other `escalation/**` path, `continuation/**`, `core.mjs`, `mcp.mjs`, `delivery/**`, or `openspec/specs/**`.

## Strict-TDD test plan

Strict TDD is active for later Apply (`bun test`, Engram observation 6158). No tests were run during this read/persist-only design reconciliation.

Apply must preserve RED before production changes for each behavior:

1. **Contract RED/GREEN:** schema registration, closed field set, deterministic binding digest, exact source copies, and `VALID` only.
2. **Mismatch RED/GREEN:** mutate each parked identity/digest/checkpoint, producer identity/digest, repository/project/assignment/generation/base/result, state, and binding digest independently; each must fail with no accepted binding.
3. **Main sealing RED/GREEN:** real temporary Git composition produces one binding in the existing parking envelope; callers cannot submit the binding or producer outputs.
4. **Atomicity/readback RED/GREEN:** pre-commit failure leaves no record; dedicated readback returns the persisted member and fails closed for missing/substituted identity.
5. **Replay RED/GREEN:** exact replay preserves bytes/revision; changed checkpoint or any producer/binding value is divergent with zero effects.
6. **Scope refactor:** source witnesses confirm no forbidden producer/composition edit, no alternate ingress, and no new shadow directory/writer.

Focused commands after source-mutating normalization is complete:

```bash
bun test test/contracts/parked-checkpoint-binding.test.mjs test/contracts/schema.test.mjs
bun test test/main-store.test.mjs
bun test test/contracts
bun test
```

Tests must assert exact error codes, exact persisted bytes, exact field equality, revision count, directory entries, and zero effects; smoke-only or type-only assertions are insufficient.

## Rollout and rollback

There is no migration and no eager rewrite of existing parking records.

- New parking operations seal the v1 binding atomically in their new parking envelope.
- Dedicated binding readback fails closed for an older parking record without the binding; it never backfills or reconstructs one.
- Before any binding is sealed, rollback is a coherent code/test revert of the listed S5.9 paths.
- After a binding is sealed, rollback remains non-destructive: revert behavior only. Do not delete, rewrite, migrate, or “clean up” persisted parking records or bindings.
- Reapplying the feature later can read the still-valid persisted v1 member. No cleanup writer, second store, or data repair path is authorized.

## Review workload forecast

Estimated authored implementation and test delta: **350–395 lines**.

- Schema, registry, invariant, and contract helper: 120–145.
- Main-store sealing/readback/replay changes: 55–75.
- Contract fixture/tests: 90–105.
- Main-store tests: 85–100.

Budget risk is **Medium** and remains under the 400-authored-line target only if existing canonicalization, validation, pair checking, parking envelope, and atomic writer are reused exactly as designed. Tasks must recalculate the forecast. If the estimate exceeds 400, stop for the repository's delivery-strategy decision; do not broaden S5.9, modify producers, or introduce a second persistence boundary to force a smaller count.

## Risks

1. **Standalone versus separate file:** a second binding file would break current one-rename atomicity. The binding must remain a standalone contract co-located in the existing parking envelope.
2. **Live origin is ephemeral:** private producer brands cannot survive persistence. Sealing checks brands before write; readback checks persisted contract integrity and exact cross-binding, never claims to recover a live brand.
3. **Repository identity vocabulary:** binding v1's `repository` stores the exact canonical `repository_root`; `project_id` remains the stable logical project binding. Pair validation additionally protects `git_common_dir` and Git tree identities through producer digests.
4. **Checkpoint text is intentionally independent before sealing:** Main's binding creates the authoritative association. No textual equivalence rule or inference may be added.
5. **Historical records:** older parking envelopes have no binding and must fail dedicated readback rather than receive a synthetic backfill.
6. **Line budget:** the forecast is close to 400; tasks must avoid duplicate derivation or oversized fixtures and must stop rather than exceed policy silently.
