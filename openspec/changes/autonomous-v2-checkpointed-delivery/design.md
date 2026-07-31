# Design: Local-first Autonomous Execution with Checkpointed Delivery

## Technical Approach

Add contracts/adapters around plan-agnostic `core.mjs`/`mcp.mjs`. Main resolves global policy into immutable Policy/Jornada snapshots; exceptions cannot relax no-early-remote/no-auto-merge floors. Tower receives validated refs, digests, identity, and gates. The automatic final local commit is verified for exact commit/tree before candidate CAS freeze at `DELIVERY_READY`; publication outcomes append separately. Authority: `HEAD=master=origin/master@f110874c1a4181da4efe4b59a5f604c797357896`; S2.4 verification and closure are integrated, so S3.1 is ready.

## Architecture Decisions

| Option | Decision |
|---|---|
| Modify V1 schemas | Add schemas through extension/pointer seams; preserve accepted bytes. |
| Tower interprets plans | Reject; Main/Policy interprets opaque Sesión/Módulo/Tarea refs. |
| Mutable candidate | Freeze an envelope; bound changes create a successor. |
| Retry timeout | Persist `UNKNOWN`; retry only after read-only absence proof. |
| Early dependent work | Plan at most two ahead; reject excess and execute only from integrated-base evidence. |

## Data Flow and Contracts

```text
global policy + project config -> Policy/Jornada snapshot -> assignment
automatic final commit -> verify exact commit/tree -> candidate freeze/DELIVERY_READY
  -> push -> PR -> append effects/checks/review
  -> exact authorization(candidate + current ledger) -> merge
  -> integrated-base verification -> COMPLETE -> reconcile next
```

`candidate_revision` binds project/plan/`slice_id`, Sesión/artifact refs, predecessor, base/result/tree/commit/head/target, assignment, `host_epoch`, Policy/Jornada revisions, verification digest, and required check/review configuration—never future outcomes. Its append-only ledger records publication, checks, review, authorization, merge, and reconciliation. Canonical digests reuse `contracts/canonicalize.mjs`; CAS/history reuse `main-store/store.mjs`; operation identity extends `contracts/idempotency.mjs` without changing `ctv1` keys.

`IMPLEMENTING -> VERIFYING -> DELIVERY_READY -> WAITING_MERGE -> MERGED -> COMPLETE`. Classify normal incomplete checks as `checks_pending`, explicit quota/billing as `quota_exhausted`, and explicit outage/5xx or timeout after read-only probe as `provider_unavailable`; ambiguous results become fail-closed blocked `unknown`. Outcomes advance the unchanged candidate's ledger. Changed code, base, result/tree/commit/head, target, assignment, `host_epoch`, Policy/Jornada revision, verification digest, or check/review configuration requires a successor. Recovery requires stop proof, host fencing, remote reconciliation, byte/mode-preserving integrated-base replay, and re-verification.

## File Changes and Future Ownership

| Owner | Files | Purpose |
|---|---|---|
| P3/C | `workspace/checkpoint.mjs`, `test/workspace/checkpoint.test.mjs` | Repository/base/result capture |
| P3/D | `schemas/global-delivery-policy-v1.schema.json`, `policy/delivery-policy.mjs`, `main-store/store.mjs`, `test/main-store.test.mjs` | Floors, snapshots, exceptions |
| P5/F contracts | `schemas/candidate-revision-v1.schema.json`, `contracts/{candidate-revision,idempotency,schema-registry}.mjs`, contract tests/fixtures | Freeze, successor, ledger boundary |
| P4/E | `hosts/candidate-fence.mjs`, host tests | Host/stop/recovery fence |
| P5/F delivery | `delivery/{coordinator,git-adapter,github-adapter,reconcile}.mjs`, delivery tests | Effect ledger/adapters |
| P5/G | `continuation/integrated-base.mjs`, continuation tests | Horizon/base eligibility |
| P7 | conformance test | End-to-end evidence |

One Sesión is one PR. Above 800 changed lines requires more Sesiones or chained PRs, never another level. Approved IDs: S3.1, S3.2, S5.1, S4.1, S5.2, S5.3, S7.1.

## Testing Strategy

| Layer | RED intent |
|---|---|
| Unit | Floors, identity, freeze/invalidation, exact authorization, outage classification |
| Integration | CAS races, ledger replay, unknown reconciliation, host/base fences |
| Conformance | No early/duplicate effects; exact merge, successor, dependency denial |

## Threat Matrix

| Boundary | Planned RED and fail-closed behavior |
|---|---|
| Documentation paths | N/A: opaque paths; suffix never selects execution. |
| Git repository | Fixed argv/canonical root; reject injected `git -C`, escaping relative, or mismatched absolute roots. |
| Commit | Explicit file/tree identity; never `commit -a`; reject staged drift/empty index. |
| Push | Explicit remote/refspec/head; ignore tracking, reconcile first push, block destination mismatch. |
| PR | Explicit repo/head/base argv and separate environment; reject command composition, environment prefix, or missing `--head`. |

## Rollout, Rollback, and Evidence

Stacked-to-main order: `S3.1/C` → `S3.2/D` → `S5.1/F-contracts` → `S4.1/E` → `S5.2/F-delivery` → `S5.3/G` → `S7.1/Plan 7`. Never rewrite V1/split artifacts or ledger entries. Audit retains candidate/ref digests, append-only effects/observations/checks/review/authorization, merge SHA, and integrated-base proof. Rollback disables policy/effects, restores pointers, fences writers, and preserves evidence.
