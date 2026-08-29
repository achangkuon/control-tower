# Plan 2 — Contratos y registro de producto

**Estado:** 🔵 EN CURSO

## Verdad ejecutable actual

- `S2.1`–`S2.6` están cerradas; `S2.8` es el único contrato de ejecución vigente de P2.
- **Capacidad ejecutable inmediata: 0.** `S2.8` no es asignable hasta entregar `S4.14` y recibir un brief fresco de Support.
- **Cola global:** `#11 S2.8`; la posición no asigna dueño ni asiento. Ver [master-index](../master-index.md).
- **Denominador:** `—`. Cuatro responsabilidades de Change B siguen sin Sesión enumerada; por la [decisión 57](../decision-register.md), el porcentaje no es derivable.

## Sesiones cerradas

| ID | Estado | Resultado entregado | Evidencia durable |
|---|---|---|---|
| S2.1 | ✅ COMPLETO | Diez schemas y validación duplicate-safe | [tasks](../../changes/sdd-tower-contract-schemas/tasks.md) · PR #67 |
| S2.2 | ✅ COMPLETO | JCS, ArtifactRef e idempotencia | [tasks](../../changes/sdd-tower-contract-schemas/tasks.md) · PR #72 · merge `bbb59af9ca4de9223e0ec06474725f13329993b6` · 44/44 contracts |
| S2.3 | ✅ COMPLETO | Main store con autoridad, atomicidad y límites de Change A/B | [tasks](../../changes/sdd-tower-contract-schemas/tasks.md) · PR #78 · merge `8139849df44a81ecac6eaafa0c9a2c847e08c77e` · 13/13 focused, 57/57 aggregate, 25/25 probes |
| S2.4 | ✅ COMPLETO | Registry storage y resolución XDG path-neutral | [tasks](../../changes/archive/2026-07-31-sdd-tower-project-registry/tasks.md) · PRs #82, #84, #86, #88 · 14/14 storage, 57/57 combined |
| S2.5 | ✅ COMPLETO | Preflight de colisiones para enrollment legado | [tasks](../../changes/archive/2026-07-31-sdd-tower-legacy-import-preflight/tasks.md) · [apply](../../changes/archive/2026-07-31-sdd-tower-legacy-import-preflight/apply-progress.md) · [verify](../../changes/archive/2026-07-31-sdd-tower-legacy-import-preflight/verify-report.md) · PRs #94, #96, #114, #116 · 5/5 requisitos, 9/9 escenarios, 12/12 tareas |
| S2.6 | ✅ COMPLETO | La Torre adoptó el contrato de ejecución y volvió opacos los bloques ajenos sin cambiar registry/payload | [decisiones 71 y 79](../decision-register.md) · commit `c91fddd5c74019de2ef7d691a43d403558c3a92e` · cierre `f2d1a81` · 87 tests focalizados, 892 integrales |

## Sesión archivada

| ID | Estado | Razón y evidencia durable |
|---|---|---|
| S2.7 | 📚 ARCHIVADO | La [decisión 78](../decision-register.md) retiró el lector `contracts/session-plan-snapshot.mjs`; sin copia no existe deriva que vigilar. La convención sigue gobernando desde el harness y `S5.15` posee el retiro. |

## Responsabilidades de Change B todavía sin ID

El [apéndice de migración](../plan-vocabulary-migration-appendix.md) preserva, sin inventar denominador: storage y actualización atómica; bootstrap, enrollment y revisionado; UX de alias y resolución inequívoca; validación de root, common-dir y remote. El [inventario de producto](../inventario-de-producto.md) las cruza contra `console/vocabulary.mjs`; esta reconciliación no cambia alcance, estado ni dependencias.

## Sesión 2.8 — Los nombres de fase salen del contrato de binding

| Campo | Contrato vigente |
|---|---|
| Estado | 📋 PLANIFICADO — dependencias limpias, pero no asignable hoy por el gate global de capacidad |
| Depende de | — |
| Área | `schemas/binding-delta-v1.schema.json`; `test/contracts/schema.test.mjs`; `test/fixtures/contracts/schema-cases-v1.json` |
| Prohibido | `contracts/schema-registry.mjs`; `contracts/validate.mjs`; `install/**`; `scripts/payload-closure.mjs`; `schemas/execution-contract-v1.schema.json` |
| Recurso | — (sin DB, migraciones ni token de entrega) |
| Ruta | `design-tasks` — el resultado y la frontera están fijados, pero queda una investigación técnica acotada: precisar las aserciones existentes que demuestran invariancia byte a byte fuera de `inputs` y membresía intacta sin tocar rutas prohibidas |
| Autoridad | [decisión 78](../decision-register.md), [frontera Torre ↔ gentle-ai](../frontera-torre-gentle-ai.md) y precedente entregado de `S2.6` |
| Orden/cola | `#11 S2.8`; sólo después de entregar `S4.14` + brief fresco de Support |

**Resultado único:** `inputs` pasa a opaco como `{"type":"object"}`. La Torre conserva y sella el objeto sin interpretar nombres de fase; `git`, `contracts` y todo campo fuera de `inputs` permanecen byte-idénticos. `binding-delta-v1` conserva membresía en registry y payload.

**Decisiones:**
- `derivable` — volver opacos los seis campos actuales sin eliminarlos ni renombrarlos. **Autoridad:** decisión 78 y precedente `S2.6`. **Criterio:** el objeto entero acepta cualquier forma y deja de exigir miembros internos. **Falsificador:** un delta sellado con la forma actual deja de validar, o una forma alternativa no valida. **Contamina:** `S2.8`, desde `M2.8.1`.
- `derivable` — preservar todo lo ajeno a `inputs`. **Autoridad:** alcance aprobado de `S2.8` y decisión 78. **Criterio:** sólo cambian la definición de `inputs`, sus fixtures y pruebas dentro de `Área`. **Falsificador:** cambia un byte de otro campo o cambia la membresía en registry/payload. **Contamina:** `S2.8`, desde `M2.8.2`.
- Toda decisión no listada escala por defecto; ninguna autoridad de esta Sesión permite cambiar producto, API pública, seguridad, membresía, dependencias o alcance.

**Criterios de aceptación** — todos deben pasar para cerrar:
- [ ] `rg 'proposal|specs|design|tasks' schemas/binding-delta-v1.schema.json` devuelve cero
- [ ] Un `binding-delta` sellado con los seis campos actuales sigue validando contra el schema recortado
- [ ] Un `binding-delta` con `inputs` de forma distinta también valida
- [ ] `binding-delta-v1` sigue declarado en `contracts/schema-registry.mjs` y en el payload, sin cambio de membresía
- [ ] Ningún campo fuera de `inputs` cambia un byte
- [ ] `bun test` no introduce fallos nuevos y el diff no toca ninguna ruta de `Prohibido`

**Ownership de planificación:** este `STATUS.md` es el único autor de Módulos/Tareas. `session-plan` puede emitir después un solo delta compacto para precisar técnica; no crea proposal, spec, SDD completo, otra descomposición ni SDD por Módulo.

### Módulo 2.8.1 — Opacidad del contrato

**Paths:** `schemas/binding-delta-v1.schema.json`, `test/contracts/schema.test.mjs`
- [ ] `T2.8.1.1` **RED** — demostrar que una forma de `inputs` ajena a SDD falla hoy y que el delta sellado actual debe seguir aceptado
- [ ] `T2.8.1.2` **GREEN** — reemplazar la definición interna de `inputs` por un objeto opaco sin restricciones internas
- [ ] `T2.8.1.3` **REFACTOR** — probar cero nombres de fase y comparar que ningún campo del schema fuera de `inputs` cambió

### Módulo 2.8.2 — Compatibilidad y membresía

**Paths:** `test/fixtures/contracts/schema-cases-v1.json`, `test/contracts/schema.test.mjs`
- [ ] `T2.8.2.1` **RED** — fijar casos para el delta actual, un `inputs` alternativo y la membresía vigente en registry/payload
- [ ] `T2.8.2.2` **GREEN** — actualizar fixtures y pruebas para que ambas formas validen sin tocar archivos prohibidos
- [ ] `T2.8.2.3` **REFACTOR** — triangular correcciones de revisión, membresía inmutable, suite focalizada e integral y límite exacto de `Área`

**Forecast:** 60–120 líneas authored en implementación; una unidad de commit directo a `master`, verificable y revertible de forma independiente, con pruebas y fixtures junto al schema y ≤400 líneas authored. Forecast documental de este piloto: ≤400 adiciones + eliminaciones.
