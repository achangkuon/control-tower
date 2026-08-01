# Índice Maestro — SDD Tower Implementation V1

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-07-31 contra `master` en `d072e509`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md).

## 📍 Punto de retoma

**`S8.4` está ✅ COMPLETO.** Cerró mediante issue #123 y PR #126, y su reconciliación documental mediante PR #128, integrada en `master@d072e509`. Verificada, no asumida: 22/22 en `test/support/support.test.mjs`, 59/59 en el grupo del contrato, y diff-check exacto sobre los 4 archivos del `Área` en el candidato `9458c78`.

**El foco es V1 y sólo V1.** Las próximas Sesiones son `S8.8` (adopción del instalable) y después `S8.7` (puente Telegram acotado), en ese orden y sin excepción: verificar el puente contra un runtime que no es el que corre no prueba nada. Ambas están en [`changes/v1-release/tasks.md`](../changes/v1-release/tasks.md).

**Forma de entrega acordada el 2026-07-31 — pipeline atendido, sello por sello.** El maintainer planifica y sella una Sesión; recién ahí un implementador la ejecuta, mientras el maintainer diseña la siguiente. Como el maintainer está presente, la alcanzabilidad es `live` y **el modo nocturno no aplica**: no hace falta Torre, y la [regla de ejecución V1](v1-execution-rule.md) queda vigente sin enmiendas. Propiedad de rutas mientras ambos corren: el planificador escribe sólo `openspec/changes/v1-release/**`; el implementador escribe código, pruebas y `plan-8/STATUS.md`. Nunca los dos sobre el mismo archivo.

`S8.8` tiene su ejecución partida en Módulos sellados y atendidos — ver [plan-8/STATUS](plan-8/STATUS.md). El contrato del único Módulo autónomo está en [`seal-M8.8.1.md`](../changes/v1-release/seal-M8.8.1.md).

`S8.5` y `S8.6` quedan 🟡 DIFERIDO por decisión del maintainer del 2026-07-31 — esto reemplaza el estado `UNASSIGNED` que traía `S8.5`. No están descartadas: `S8.6` sigue siendo el cierre formal de la evidencia de release, así que V1 podrá darse por usable pero no por certificado en máquina limpia.

**V2 está pausado a propósito** hasta que V1 salga. P1 permanece 🔴 BLOQUEADO en `S1.11` y `S1.12`. P2 conserva responsabilidades posteriores de Change B sin Sesiones enumeradas; las demás responsabilidades sin límite de un PR demostrable permanecen sin ID en el [apéndice de migración](plan-vocabulary-migration-appendix.md).

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

**Mientras P8 esté abierto rige la [regla de ejecución V1](v1-execution-rule.md):** las Sesiones de V1 van de `tasks.md` directo a implementación, sin `exploration`/`proposal`/`design`, y el `STATUS` se actualiza en el mismo commit que el código. V2 conserva el ciclo SDD completo, y sólo para cambios grandes o con incertidumbre arquitectónica real.

## 📊 Estado de un vistazo

**Avance global**: 1/9 Planes cerrados (11%) · Sesiones cerradas en planes activos: 19/39 (49%)

> El denominador pasó de 38 a 39 porque `S8.8` se enumeró el 2026-07-31.
> El 11% mide **los nueve planes**, y ocho de ellos son Autonomous V2. **No es el avance de V1.**
> V1 es P8 y va **50% (4/8 S)**, con dos Sesiones restantes en el camino corto.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (2/2 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | 🟢 LISTO | 0% (0/2 S) | — | Main | S3.1, S3.2 | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | 0% (0/1 S) | — | Main | S4.1 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | 0% (0/3 S) | — | Main | S5.1, S5.2, S5.3 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Installable V1 release | 🔵 EN CURSO | 50% (4/8 S) | — | Maintainer | S8.8, S8.7 (camino corto) · S8.5, S8.6 🟡 DIFERIDO | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
