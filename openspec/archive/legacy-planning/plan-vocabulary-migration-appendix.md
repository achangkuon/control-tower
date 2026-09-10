# Apéndice de migración — detalle sin descomposición posicional

Este archivo preserva responsabilidades retiradas del índice maestro cuyo límite de un PR no puede demostrarse con los artefactos actuales. Las listas siguientes no son niveles de planificación y no reciben IDs inventados.

## Contexto global

El resultado objetivo es entregar jornadas autónomas acotadas que seleccionen un proyecto, planifiquen e implementen `slice_id` con sesiones y worktrees aislados, preparen commit/push/PR, conserven autorización humana exacta para cada merge, continúen mediante Binding Deltas y se recuperen mediante fallback exclusivo OpenCode → Pi.

Control Tower permanece plan-agnostic. Main, Policy y los agentes de planificación e implementación interpretan los artefactos de producto.

## Dependencias macro

```text
Mechanism path: legacy P6 -> legacy P7 OpenCode -> P8 Pi -----------+
                                                                    |
Product path:   A ----> B ----+                                    |
                  +--> C ----> D ---------------------------------> E. Host Launcher
                                                                    |
                          +-----------------------------------------+
                          |
                          +--> F. Telegram Delivery ----+
                          +--> G. Continuous Slice Loop -+--> H. Multi-repository Campaigns --> I. V1 Conformance Pilot
```

Invariantes de reconciliación:

- `legacy P6 → legacy P7 → P8 → Change E` y `A → B/C → D → Change E` permanecen independientes hasta converger en E.
- C→D es obligatorio; no existe un edge A→legacy P7/P8.
- Legacy P7 depende sólo de legacy P6; P8 depende de legacy P7 integrado.
- El alcance activo de hosts está enumerado en `P4/S4.1`–`S4.5`; `S4.5` precede a los IDs estables `S4.3`/`S4.4` sin renumerarlos.
- Main conserva la autoridad de emisión y fencing de `host_epoch`.
- Claude permanece opt-in y no bloquea el piloto Pi/OpenCode.

## Estrategia de entrega

- `ask-on-risk` es la estrategia activa.
- Una Sesión equivale a un PR; si no cabe, se divide en Sesiones o sus Módulos se entregan mediante chained PRs.
- Cada PR SHOULD mantenerse por debajo de 400 líneas authored; el forecast determina la cadena antes del primer RED.
- Tests, schemas, documentación y código relacionado permanecen juntos dentro de la misma responsabilidad revisable.
- PRD, RFC y REQUIREMENTS permanecen con su cambio documental.
- Los changes legacy P6–P11 no se mezclan con semántica de producto A–I.
- Cada merge requiere autorización exacta según REQUIREMENTS.

## Riesgos globales

| Riesgo | Control |
|---|---|
| Expandir el sustrato para interpretar planes | Changes A–I separados; Tower recibe refs/digests opacos. |
| Duplicar planning legacy P7/P8 | Consumir artifacts existentes y continuar desde sus gates de reconciliación. |
| Crear un producto monolítico | Un change por responsabilidad y DAG explícito. |
| Empezar hosts antes de recovery | E depende de legacy P6, legacy P7 y P8. |
| Telegram antes de identidad de proyecto | F depende de registry/Main. |
| Continuous loop sin entrega/recovery | G depende de C–F. |
| Campañas antes del caso single-project | H depende de G. |
| PRs inmanejables | Forecast por Sesión y chained PRs cuando corresponda. |

## Decisiones cerradas

- Roles, autoridad y límites macro están cerrados por RFC.
- Schemas, estados, contratos y gates están cerrados por REQUIREMENTS.
- Pi/OpenCode single-host y fallback preautorizado están cerrados.
- Hermes no posee repositorios ni dirige workers.
- Worktrees son efímeros y no se reciclan mediante branch switch.
- Multi-repo V1 usa PRs ordenados y compensaciones, no atomicidad ficticia.
- Cambios posteriores crean una revisión explícita del documento correspondiente; tasks e implementación no redefinen los contratos.

## Proveniencia histórica global

- PRD, RFC, REQUIREMENTS, roadmap, Plan Catalog, Plan Manifest y proposals A–I fueron aprobados estructuralmente mediante PR #47 (`0745f99`).
- La reconciliación S1.9 se integró en `b96e4d9`; la publicación del Plan Manifest S1.10 se integró en `a1c75b3`.
- Los checkouts locales se retiraron y recrearon desde el `master` canónico sin borrar ramas; la evidencia está en [`2026-07-27-worktree-retirement.md`](../maintenance/2026-07-27-worktree-retirement.md).
- Los documentos históricos y normativos preservados se consultan como evidencia; este apéndice no los reescribe.

## Plan 1

- Legacy P9: adapter Claude opt-in.
- Legacy P10: runtime versionado, cutover y rollback.
- Legacy P11: verificación CT-only y matriz de conformidad.

## Plan 2

- Change B: storage y actualización atómica.
- Change B: bootstrap, enrollment y revisionado.
- Change B: UX de alias y resolución inequívoca.
- Change B: validación de root, common-dir y remote.
- ~~Change B: adapter Hermes read-only.~~ **Retirado el 2026-08-21 por la [decisión 57](decision-register.md).** Hermes era la mitad de origen del puente que `S8.7` archivó cuando Moshi superseció el transporte remoto; sin puente no hay adapter que escribir. No se reemplaza por otra responsabilidad.

Las cuatro responsabilidades que sobreviven **siguen sin Sesiones enumeradas** y son candidatas de la Fase 1 del plan de depuración, donde se cruzan contra el vocabulario de comandos de `console/vocabulary.mjs` antes de decidir si alguna es producto.

## Plan 3

- Change C: inventario read-only.
- Change C: creación idempotente de worktrees.
- Change C: retiro fail-closed.
- Change C: fixtures squash/PR heredados de `jornada.sh`.
- Change C: wrapper legacy y guía de migración.
- Change D: state machine de jornada.
- Change D: reporte Support de conflictos y capacidad.
- Change D: eligibility de Policy y taxonomía de drift.
- Change D: autorización de assignment.
- Change D: reconciliación pause/revoke/expiry/recovery.

## Plan 5

- Change F: estado y store de authorization.
- Change F: allowlist/callback/command de Telegram.
- Change F: validación Git/PR/check/SHA.
- Change F: commit/push/PR idempotentes.
- Change F: consumo de merge y post-check.
- Change G: planning lane hasta tasks.
- Change G: reconciliación de implementación.
- Change G: evidencia apply/verify.
- Change G: lifecycle del Binding Delta.
- Change G: continuación compatible y escalamiento material.
- Change G: piloto de jornada standard con dos slices.

## Plan 6

- Change H: campaign DAG.
- Change H: protocolo de Main participante.
- Change H: entrega serializada.
- Change H: validación de compensation.
- Change H: escenario de dos repositorios.

## Plan 7

- Piloto `short` con OpenCode y un `slice_id`.
- Failover preautorizado OpenCode → Pi.
- Piloto `standard` con dos valores de `slice_id` y Binding Delta.
- Autorización Telegram con SHA drift y replay negativo.
- Recovery desde dirty worktree.
- Campaña de dos repositorios con compensation.

## Reconciliación Pi-first — 2026-08-27

Las tablas de migración anteriores siguen siendo la traza exacta de IDs y contratos OpenCode. La promoción de `S9.4` y `S1.17`–`S1.19` no reescribe esa historia; sus overlays vigentes viven en los `STATUS.md` correspondientes.
