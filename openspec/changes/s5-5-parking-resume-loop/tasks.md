# Tasks: S5.5 Parking and Resume Loop

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–390 additions + deletions (production code plus tests only; de-duplicated engineering target) |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single direct-commit apply unit under the accepted size exception |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

## Maintainer delivery decision

The maintainer explicitly accepts `size:exception` for S5.5. The 400-line reference measures implemented production code plus tests only and excludes SDD Markdown artifacts. The de-duplicated 350–390 implementation-only forecast remains the engineering target; the accepted exception removes the former `ask-on-risk` size hard stop.

### De-duplicated implementation forecast

| Module | Path allocation (additions + deletions) | Module total |
|---|---|---:|
| M5.5.1 | `escalation/parked.mjs` 25–28; `test/escalation/parked.test.mjs` 35–38 | 60–66 |
| M5.5.2 | `escalation/parked.mjs` 22–24; `test/escalation/parked.test.mjs` 35–37 | 57–61 |
| M5.5.3 | `escalation/parked.mjs` 28; `test/escalation/independent.test.mjs` 75–85 | 103–113 |
| M5.5.4 | `escalation/resume.mjs` 50–65; `test/escalation/resume.test.mjs` 80–85 | 130–150 |
| **Total, no duplicate paths** | `escalation/parked.mjs` **75–80**; `escalation/resume.mjs` **50–65**; `test/escalation/parked.test.mjs` **70–75**; `test/escalation/independent.test.mjs` **75–85**; `test/escalation/resume.test.mjs` **80–85** | **350–390** |

## Apply authorization and scope guard

**Authorized apply unit:** one coherent, directly revertible direct-commit unit containing only the five planned production/test paths above, with their focused tests. The maintainer-approved `size:exception` permits this unit to exceed the 400-line reference if necessary. The de-duplicated 350–390 production-and-test forecast remains the engineering target; record the actual implementation-only total, but it is not an `ask-on-risk` delivery hard stop. SDD Markdown artifacts are excluded from that measurement. The two design boundaries—(1) parking, Support-bound proposal verification, and opaque continuation; then (2) exact resume—remain coherent rollback/discovery boundaries, not an inferred delivery split.

Only these paths may change: `escalation/parked.mjs`, `escalation/resume.mjs`, `test/escalation/parked.test.mjs`, `test/escalation/independent.test.mjs`, and `test/escalation/resume.test.mjs`. Do not create a local contract, schema, writer, store read API, authority validator/consumer, continuation route, Worker assignment route, parser, routing path, or delivery path. Block rather than edit `escalation/parking-composition.mjs`, `escalation/request.mjs`, `escalation/routing.mjs`, `continuation/`, `core.mjs`, `mcp.mjs`, `delivery/`, `contracts/`, `schemas/`, `main-store/store.mjs`, `openspec/plan.yaml`, or `openspec/ROADMAP.md`.

After each RED/GREEN/REFACTOR cycle, record the focused command result and implementation-only size evidence with:

```sh
git diff --numstat -- escalation/parked.mjs escalation/resume.mjs test/escalation/parked.test.mjs test/escalation/independent.test.mjs test/escalation/resume.test.mjs
```

Sum both columns once per path and record the result as engineering evidence. This command intentionally includes only implemented production code and tests; do not include SDD Markdown artifacts.

## M5.5.1 — Registro de la decisión estacionada

Paths: `escalation/parked.mjs`, `test/escalation/parked.test.mjs`.

- [x] **T5.5.1.1 — RED:** agregar test/escalation/parked.test.mjs para exigir un registro inmutable completo de una decisión no derivable. <!-- sdd-owner: implementation -->
  - Criterio: El registro conserva pregunta, evidencia, opciones con consecuencia, origen, checkpoint y clase.
  - Evidence: add the complete canonical-decision case and immutable-outcome assertions; `bun test test/escalation/parked.test.mjs` fails for the new assertion before production code exists.
- [x] **T5.5.1.2 — RED:** rechazar registros sin opciones enumeradas, evidencia o checkpoint. <!-- sdd-owner: implementation -->
  - Criterio: Todo registro incompleto se rechaza sin escritura parcial.
  - Evidence: omit options (including consequence), evidence, and checkpoint independently; snapshot parking visibility/request-call witnesses and record the focused RED failure with zero effects.
- [x] **T5.5.1.3 — GREEN:** implementar escalation/parked.mjs sobre el ledger append-only, consumiendo parked-decision-v1 de S5.7 y reutilizando la solicitud de S5.4 sin otra ruta de escritura. <!-- sdd-owner: implementation -->
  - Criterio: No existe segundo writer, contrato local ni autoridad nueva.
  - Evidence: constructor-bound `parking.park` runs before one unchanged S5.4 emitter input; successful result is frozen `PARKED`, invalid dependency errors remain unchanged, and `bun test test/escalation/parked.test.mjs` passes.
- [x] **T5.5.1.4 — REFACTOR:** normalizar códigos de error estables y volver a correr bun test test/escalation. <!-- sdd-owner: implementation -->
  - Criterio: bun test test/escalation pasa completo.
  - Evidence: normalize only `CT_PARKED_LOOP_PORT_INVALID` at the controller boundary, preserve dependency codes and request-after-parking failure recovery, then record `bun test test/escalation` passing.

## M5.5.2 — Verificación de la propuesta de Support

Paths: `escalation/parked.mjs`, `test/escalation/parked.test.mjs`.

- [x] **T5.5.2.1 — RED:** rechazar una propuesta vencida, de otro plan_enumeration_digest, ledger_digest, worker_claim o caller_role distinto de MAIN. <!-- sdd-owner: implementation -->
  - Criterio: Cada mismatch falla cerrado.
  - Evidence: independently drift role, plan digest, ledger digest, claim, expiry, and state; each `bun test test/escalation/parked.test.mjs` RED case proves neither opaque continuation capability was called.
- [x] **T5.5.2.2 — GREEN:** verificar esos cinco campos sin parser de planes ni maquinaria de contaminación propia. <!-- sdd-owner: implementation -->
  - Criterio: Producción no lee dentro de primary, alternatives o conflicts.
  - Evidence: use only the injected read-only proposal port, injected clock, boundary fields, and state; getter traps over nested proposal content remain untouched while the focused test passes.
- [x] **T5.5.2.3 — REFACTOR:** verificar readback y no mutación fuera del checkpoint, con testigos de bytes para impedir ramas sobre primary, alternatives o conflicts. <!-- sdd-owner: implementation -->
  - Criterio: Los testigos permanecen idénticos en éxito y rechazo.
  - Evidence: compare parking/authorization/store DB-WAL-SHM/routing/test-ledger witnesses before and after success and every rejection; record `bun test test/escalation/parked.test.mjs` passing with frozen results and no content access.

## M5.5.3 — Continuación sobre trabajo propuesto

Paths: `escalation/parked.mjs`, `test/escalation/independent.test.mjs`.

- [x] **T5.5.3.1 — RED:** agregar test/escalation/independent.test.mjs para permitir sólo primary o alternatives de la propuesta vigente. <!-- sdd-owner: implementation -->
  - Criterio: Nada ausente de la propuesta continúa.
  - Evidence: default and named-alternative selector cases fail before implementation; an unnamed alternative rejection proves zero dispatch and `bun test test/escalation/independent.test.mjs` is red.
- [x] **T5.5.3.2 — RED:** con NO_SCOPE la Torre se detiene y reporta sin inventar trabajo, relajar criterios ni derivar candidato propio. <!-- sdd-owner: implementation -->
  - Criterio: NO_SCOPE produce cero trabajo inventado.
  - Evidence: assert frozen `{ state: "PARKED", reason: "NO_SCOPE" }`, zero continuation access/calls, no Worker assignment input, and a focused RED result.
- [x] **T5.5.3.3 — GREEN:** consumir la propuesta bajo Main; el worker no se autoasigna. <!-- sdd-owner: implementation -->
  - Criterio: El worker carece de ruta de autoasignación.
  - Evidence: call exactly one constructor-bound opaque default or alternative capability only after the six-field/state gate; completion is at most an opaque S5.10 binding reference, all focused independent tests pass, and no local REFACTOR Tarea is added because the permanent plan ends this module at GREEN.

## M5.5.4 — Retoma desde el checkpoint

Paths: `escalation/resume.mjs`, `test/escalation/resume.test.mjs`.

- [x] **T5.5.4.1 — RED:** agregar test/escalation/resume.test.mjs para que una respuesta terminal validada por Main retome sólo el checkpoint exacto del worktree asignado. <!-- sdd-owner: implementation -->
  - Criterio: Sólo la respuesta terminal validada por Main retoma el checkpoint exacto.
  - Evidence: the new focused RED test requires authoritative binding readback, `terminal_response.assertFor` bound to exact decision ID/digest, and one exact resume-effect call.
- [x] **T5.5.4.2 — RED:** exigir reconciliación nueva cuando la base se movió desde el parking. <!-- sdd-owner: implementation -->
  - Criterio: Base divergente exige reconciliación.
  - Evidence: stale base, changed repository, assignment/generation, or base/result SHA each returns the stable reconciliation-required outcome with zero resume; `bun test test/escalation/resume.test.mjs` is red before implementation.
- [x] **T5.5.4.3 — RED:** una respuesta no validada, vencida o de origen equivocado no levanta nada ni muta el registro. <!-- sdd-owner: implementation -->
  - Criterio: El registro permanece byte-idéntico ante respuestas inválidas.
  - Evidence: absent, rejecting/unvalidated, expired-at-consumption, wrong-origin, and wrong-decision capabilities leave byte witnesses identical and invoke neither reconciliation nor resume as applicable.
- [x] **T5.5.4.4 — GREEN:** implementar escalation/resume.mjs retomando desde el checkpoint exacto registrado. <!-- sdd-owner: implementation -->
  - Criterio: No se retoma otro checkpoint ni una base stale.
  - Evidence: implement only fixed read binding → assert terminal capability → fresh reconcile → exact-coordinate comparison → one injected resume effect; malformed/unknown/stale/divergent reconciliation returns frozen `CT_RESUME_RECONCILIATION_REQUIRED`, and `bun test test/escalation/resume.test.mjs` passes. No local REFACTOR Tarea is added because the permanent plan ends this module at GREEN.

## Full verification and rollback

Run and record exact exit status/output summary after all module work:

```sh
bun test test/escalation/parked.test.mjs
bun test test/escalation/independent.test.mjs
bun test test/escalation/resume.test.mjs
bun test test/escalation
bun test
rg 'Depende de|Área|Recurso' escalation/
```

The final `rg 'Depende de|Área|Recurso' escalation/` must return zero. Runtime harness: N/A — both controllers are constructor-bound unit seams with injected ports; the focused Bun cases exercise their only runtime boundary. Rollback boundary: revert only `escalation/parked.mjs`, `escalation/resume.mjs`, and the three listed focused tests; retain all parking records, authorization/response records, Support proposals, checkpoint bindings, and S5.10 binding references byte-for-byte. Never delete or rewrite durable records during rollback.

## Parent lifecycle ledger

- Action: Record the actual de-duplicated production-and-test `git diff --numstat` total, excluding SDD Markdown artifacts, as engineering evidence under the maintainer-accepted `size:exception`. Disposition: pending. Evidence: maintainer decision recorded in this artifact.
- Action: Preserve the 350–390 implementation-only forecast as the engineering target; do not treat the 400-line reference as an `ask-on-risk` hard stop. Disposition: pending. Evidence: maintainer decision recorded in this artifact.
- Action: Record the five focused commands, complete `bun test`, zero-result source witness, and runtime-harness N/A disposition against delivered bytes. Disposition: pending. Evidence: none.
- Action: Perform bounded post-apply review of the five allowed paths and direct-commit rollback boundary before delivery under repository policy. Disposition: pending. Evidence: none.

## Provider-bound remediation evidence

All 14 implementation checkboxes remain checked; this correction changes evidence only. The correction RED used canonical ISO timestamp strings and constructor-bound terminal authority, failing against the prior production behavior. GREEN passed 12 focused tests and 32 escalation tests. The parking tests now pass a canonical `parked-decision-v1` through `createParkingComposition` with temporary byte-backed readbacks; all missing required decision fields reject before request emission. Proposal success/rejections and invalid resume paths use temporary byte-backed readbacks. Exact-current reconciliation now includes `project_id` divergence and uses the canonical `parkedCheckpointBinding` fixture and validator.
