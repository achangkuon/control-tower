# Tasks: Autonomous V2 Checkpointed Delivery

Authority: `HEAD=master=origin/master@f110874c1a4181da4efe4b59a5f604c797357896`; S2.4 is verified and closed; IDs S3.1, S3.2, S5.1, S4.1, S5.2, S5.3, S7.1. Preserve P2/S2.3/split.

## Forecast

| Field | Value |
|---|---|
| Authored lines | 1,500–2,160; S: 180–260/260–380/240–360/160–240/320–400/160–240/180–280 |
| PR chain | stacked-to-main; auto-chain; none >800; S5.2 max 400 |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

Dependency chain: S2.4 COMPLETE → S3.1 LISTO → S3.2 → S5.1 → S4.1 → S5.2 → S5.3 → S7.1. Later unenumerated Change B responsibilities are outside this chain.

## Plan 3 — Workspace

### Sesión S3.1 — Change C checkpoint
#### Módulo M3.1.1 — Checkpoint
- [ ] Tarea T3.1.1.1 — RED fixed-argv Git/canonical root; reject injected `git -C`, escaping relative, mismatched absolute roots.
- [ ] Tarea T3.1.1.2 — RED explicit file/tree; forbid `commit -a`; reject staged drift/empty index.
- [ ] Tarea T3.1.1.3 — GREEN capture.
- [ ] Tarea T3.1.1.4 — REFACTOR byte/mode evidence.

### Sesión S3.2 — Change D Policy/Jornada
#### Módulo M3.2.1 — Policy/Jornada
- [ ] Tarea T3.2.1.1 — RED floors/inheritance/exception/snapshot/CAS.
- [ ] Tarea T3.2.1.2 — GREEN policy/store; plan-agnostic Tower.
- [ ] Tarea T3.2.1.3 — REFACTOR digests/audit/pointers.

## Plan 4 — Hosts

<a id="s41-change-e--m411-fence"></a>
### Sesión S4.1 — Change E host fence
#### Módulo M4.1.1 — Fence
- [ ] Tarea T4.1.1.1 — RED ownership/stop-proof/host-epoch/uncertain recovery.
- [ ] Tarea T4.1.1.2 — GREEN single-host fence.
- [ ] Tarea T4.1.1.3 — REFACTOR blocked evidence.

## Plan 5 — Delivery and continuation

<a id="s51-change-f-contracts--m511-candidate"></a>
### Sesión S5.1 — Change F contracts
#### Módulo M5.1.1 — Candidate
- [ ] Tarea T5.1.1.1 — RED final-commit/tree verification, identity/`host_epoch` freeze, ledger separation, invalidation, successor, idempotency.
- [ ] Tarea T5.1.1.2 — GREEN contracts/fixtures/ledger boundary.
- [ ] Tarea T5.1.1.3 — REFACTOR identity/evidence digests.

<a id="s52-change-f-delivery--m521-adaptersreconciliation"></a>
### Sesión S5.2 — Change F delivery
#### Módulo M5.2.1 — Adapters/reconciliation
- [ ] Tarea T5.2.1.1 — RED explicit remote/refspec/head; ignore tracking, reconcile first push, block destination mismatch.
- [ ] Tarea T5.2.1.2 — RED explicit repo/head/base argv plus separate environment; reject composition/environment prefix/missing `--head`.
- [ ] Tarea T5.2.1.3 — RED quota/billing→`quota_exhausted`; outage/5xx/probed-timeout→`provider_unavailable`; incomplete→`checks_pending`; ambiguous→blocked `unknown`.
- [ ] Tarea T5.2.1.4 — GREEN/REFACTOR commit→verify commit/tree→freeze→push/PR; append ledger and bind authorization.

<a id="s53-change-g--m531-integrated-base"></a>
### Sesión S5.3 — Change G continuation
#### Módulo M5.3.1 — Integrated base
- [ ] Tarea T5.3.1.1 — RED at-most-two ceiling rejection/non-integrated denial.
- [ ] Tarea T5.3.1.2 — GREEN successor eligibility.
- [ ] Tarea T5.3.1.3 — REFACTOR byte/mode replay evidence.

## Plan 7 — Conformance

<a id="s71-pilot--m711-safety"></a>
### Sesión S7.1 — Pilot
#### Módulo M7.1.1 — Safety
- [ ] Tarea T7.1.1.1 — RED early/duplicate/stale/recovery/dependency assertions.
- [ ] Tarea T7.1.1.2 — GREEN pilot; attribute outcomes to candidate/ledger.
- [ ] Tarea T7.1.1.3 — REFACTOR deterministic audit fixtures/reporting.
- [ ] Tarea T7.1.1.4 — Post-acceptance reconcile Plan 3/4/5/7 STATUS and master-index; planning remains incomplete.
