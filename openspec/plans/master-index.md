# Índice Maestro — SDD Tower Implementation V1

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-01 contra `master` en `46edd14`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md).

## 📍 Punto de retoma

**`M8.8.1` está ✅ COMPLETO y mergeado.** PR #132 cerró el issue #131; implementación `b7715ed34357b6e5ea25d920d558a9137efe2558` y merge `d280214c8de78f90e88982d90642427b55a72f2b`. Pasaron lifecycle 13/13, instalación 18/18, suite completa 433 pass / 0 fail, inmutabilidad del filesystem y diff estricto del `Área`.

**`S8.8` sigue 🔵 EN CURSO.** Restan `M8.8.2` y `M8.8.3`; `S8.7` continúa después de `S8.8`, mientras `S8.5` y `S8.6` siguen 🟡 DIFERIDO. No hay otra implementación autorizada: la próxima acción es esperar la siguiente instrucción sellada del maintainer.

**La ejecución queda en espera.** No iniciar ni asignar `M8.8.2`, `M8.8.3` o `S8.7` hasta recibir la próxima instrucción sellada del maintainer. `S8.8` sólo cierra cuando los tres Módulos pasan.

**Cambio de mecanismo de entrega — 2026-08-01, `46edd14`.** Este repo dejó de usar PRs: la entrega ahora es commit directo a `master` + push. No carga `branch-pr`. Motivo: proyecto personal pre-producción, y `master` no tenía branch protection ni CI, así que el PR no corría ningún check. **Esto no avanza ningún Plan ni autoriza ejecución** — es sólo tooling, y el freno del párrafo anterior sigue en pie. El Documentation Close Gate sigue armado: `.doc-guard.json` declara `policy: "solo"`, y por eso `git push` cuenta como entrega para `~/.claude/hooks/doc-guard.sh`. Los demás proyectos no se tocaron; el default del hook es `strict`.

`S8.8` tiene su ejecución partida en Módulos sellados y atendidos — ver [plan-8/STATUS](plan-8/STATUS.md). El contrato del único Módulo autónomo está en [`seal-M8.8.1.md`](../changes/v1-release/seal-M8.8.1.md).

`S8.5` y `S8.6` quedan 🟡 DIFERIDO por decisión del maintainer del 2026-07-31 — esto reemplaza el estado `UNASSIGNED` que traía `S8.5`. No están descartadas: `S8.6` sigue siendo el cierre formal de la evidencia de release, así que V1 podrá darse por usable pero no por certificado en máquina limpia.

**V2 está pausado a propósito** hasta que V1 salga. P1 permanece 🔴 BLOQUEADO en `S1.11` y `S1.12`. P2 conserva responsabilidades posteriores de Change B sin Sesiones enumeradas; las demás responsabilidades sin límite de un PR demostrable permanecen sin ID en el [apéndice de migración](plan-vocabulary-migration-appendix.md).

## Granularidad

Plan → Sesión (1 unidad entregable) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

**La Sesión se sigue definiendo por ALCANCE — el que entraría en un PR.** Lo que cambió el 2026-08-01 es el *mecanismo* de entrega, no el nivel: en este repo la unidad entregable es un **commit directo a `master` + push**, no un PR. Ver [Política de entrega](../../CLAUDE.md). La regla de overflow no se mueve: si una Sesión no entra en una unidad entregable, se parte en dos Sesiones o se encadenan sus Módulos — nunca se crea un nivel nuevo.

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
| P8 | Installable V1 release | 🔵 EN CURSO | 50% (4/8 S) | — | Maintainer | S8.8, S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
