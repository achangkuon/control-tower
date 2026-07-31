# Tasks: Autonomous V2 Role-Routed Continuation

Future Sesiones: `S3.2`,`S3.3`,`S5.1`,`S4.1`,`S5.2`,`S5.3`,`S7.1`; preserve completed Sesiones/`S8.4`.

## Review Workload Forecast
Lines: `S3.2=240–320,S3.3=150–220,S5.1=240–330,S4.1=150–220,S5.2=210–290,S5.3=230–320,S7.1=160–230`; total 1,250–1,700. **High**: >400/>800. Chaining: **Yes**.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

`auto-forecast` is forecast-only; chain strategy pending. Implementation-ready after `S3.1`,`S8.4`. One PR per Sesión.

**All:** worktree; verify base/status/diff/`Área`, tests/runtime/invariants/forbidden.

| Sesión | Depends; Área / forbidden | Resource/DB; edge | Test; runtime; rollback; close |
|---|---|---|---|
| `S3.2` 📋 PLANIFICADO | `S3.1`; `contracts/{validate,canonicalize,schema-registry}.mjs`, `schemas/{reconciled-checkpoint-v1,support-proposal-v1,policy-report-v2,assignment-v2,recovery-proof-v1}.schema.json`, `policy/**`, `main-store/store.mjs`, tests / !`core.mjs,mcp.mjs,registry/**,continuation/**,openspec/plans/**` | Main/none; `S3.3` | `bun test test/contracts test/main-store.test.mjs`; temp project; revert; mappings/bindings/gates. |
| `S3.3` 📋 PLANIFICADO | `S3.2`; `capabilities/registry.mjs`, `schemas/agent-capability-registry-v1.schema.json`, `test/capabilities/**` / !`continuation/**,core.mjs,mcp.mjs` | Main/none; `S3.2↔S5.1` | `bun test test/capabilities/registry.test.mjs`; two-project lookup; revert; CAS/expiry/isolation/no self-registration. |
| `S5.1` 📋 PLANIFICADO | `S3.2,S3.3`; `continuation/{reconcile,support,policy}.mjs`, `contracts/candidate-revision.mjs`, `schemas/candidate-revision-v1.schema.json`, tests / !`core.mjs,mcp.mjs,delivery/**` | Main/read-only; `S4.1` | `bun test test/continuation/{reconcile,support,policy}.test.mjs`; checkpoint dry-run; revert; statuses/bindings/no stale reuse. |
| `S4.1` 📋 PLANIFICADO | `S3.1,S3.2,S5.1`; `hosts/candidate-fence.mjs`, `test/hosts/**` / !`continuation/**,core.mjs,mcp.mjs` | Main/none; `S5.2` | `bun test test/hosts/candidate-fence.test.mjs`; stop-proof fixture; revert; host/role/base/runtime fence. |
| `S5.2` 📋 PLANIFICADO | `S4.1,S3.3`; `continuation/coordinator.mjs`, `main-store/store.mjs`, tests / !`core.mjs,mcp.mjs,hosts/**` | Main+`db-writer`/SQLite; `S5.3` | `bun test test/continuation/coordinator.test.mjs`; allow/deny; revert CAS; Main-only/support-read-only/human gates. |
| `S5.3` 📋 PLANIFICADO | `S5.2,S4.1`; `continuation/recovery.mjs`, `core.mjs`, recovery tests / !`mcp.mjs,registry/**` | Main+`db-writer`/SQLite; `S7.1` | `bun test test/continuation/recovery.test.mjs test/recovery.test.mjs`; interrupted replay; revert/retain evidence; proof→one delivery, else human/no mutation. |
| `S7.1` 📋 PLANIFICADO | `S5.3`; conformance/evidence, then `openspec/plans/plan-{3,4,5,7}/STATUS.md`, `master-index.md` / !production code | Human/read-only; — | `bun test test/continuation/conformance.test.mjs && bun test`; clean fallback; revert docs; no self-assignment/stale/ungated/auto-merge/non-Main. |

## Módulos y Tareas (RED → GREEN → REFACTOR)
### Plan P3
#### M3.2.1 Authority/contracts
- [ ] T3.2.1.1 RED: Git `-C`/escape/foreign-root/base; role/project/schema drift.
- [ ] T3.2.1.2 GREEN: five schemas, mappings, Main CAS, `CT_*` codes.
- [ ] T3.2.1.3 REFACTOR: V1 bytes; digest audit.
#### M3.2.2 Policy/Jornada
- [ ] T3.2.2.1 RED: inactive/expired, horizon, denial, expansion, exception, irreversible gates.
- [ ] T3.2.2.2 GREEN: extend `policy/delivery-policy.mjs`/`main-store/store.mjs`; eligibility only.
- [ ] T3.2.2.3 REFACTOR: preserve reports.
#### M3.3.1 Registry
- [ ] T3.3.1.1 RED: role/project, expiry/schema, R1→R2, self-registration.
- [ ] T3.3.1.2 GREEN: `capabilities/registry.mjs`; project-scoped Main CAS.
- [ ] T3.3.1.3 REFACTOR: no shadow authority/all-to-all.
### Plan P5
#### M5.1.1 Dry-run reports
- [ ] T5.1.1.1 RED: stale/degraded, `NO_SCOPE`, denial, horizon/predecessor drift.
- [ ] T5.1.1.2 GREEN: reconcile→Support→Policy; bindings; no assignment mutation.
- [ ] T5.1.1.3 REFACTOR: primary/alternatives, expiry, fresh evidence.
#### M5.2.1 Main dispatch
- [ ] T5.2.1.1 RED: Support/Worker dispatch, self-assignment, non-Main CAS, stale/denied.
- [ ] T5.2.1.2 GREEN: `continuation/coordinator.mjs`; `assignment-v2`.
- [ ] T5.2.1.3 REFACTOR: opaque transport; no auto-merge.
#### M5.3.1 Recovery
- [ ] T5.3.1.1 RED: absent/stale proof, unknown effect, unpaired termination, CAS.
- [ ] T5.3.1.2 GREEN: `recovery-proof-v1`, `continuation/recovery.mjs`, atomic `core.mjs`.
- [ ] T5.3.1.3 REFACTOR: retain evidence; increment once; no delivery.
### Plan P4
#### M4.1.1 Role-bound fence
- [ ] T4.1.1.1 RED: host/base/runtime/role drift; uncertain ownership.
- [ ] T4.1.1.2 GREEN: amend `hosts/candidate-fence.mjs`; bindings/stop proof.
- [ ] T4.1.1.3 REFACTOR: preserve errors; zero-mutation fallback.
### Plan P7
#### M7.1.1 Evidence
- [ ] T7.1.1.1 RED: flow/channels/horizon/gates/stale/self-assignment/auto-merge.
- [ ] T7.1.1.2 GREEN: evidence; checkpoint/report/assignment/recovery digests.
- [ ] T7.1.1.3 REFACTOR: post-delivery V2 STATUS/master-index; preserve `S8.4`.
