# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-14 contra la resolución de las nueve decisiones `escala` que quedaban abiertas, sobre `origin/master@82546e5`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

**El maintainer resolvió las nueve decisiones `escala` que quedaban abiertas en la cadena de release, en una sola sesión el 2026-08-14. El registro cierra en 34/34 resueltas y cero abiertas sobre la cadena — es la primera vez.** Detalle, opción elegida y razón de cada una en las decisiones 25–33 del [registro](decision-register.md). **Fuera de la cadena sobrevive una:** `S9.2` (`plan-9/STATUS.md:269`), sobre la frontera `bun ci` en raíz Pi fresca. No contamina la cadena y su `Recurso` es Pi, que quedó fuera del alcance el mismo día.

Disparador: una auditoría de alcance midió que **ocho de las nueve Sesiones restantes esperaban una decisión y no trabajo**, lo que explica la caída de velocidad de 117 → 78 → 55 commits/semana entre W31 y W33, y un ratio `docs`:código de 2,6:1 desde el 1 de agosto.

Efecto medido, y **no es uniforme**:

- `S10.2` pasa de 🔴 BLOQUEADO a **🟢 LISTO** — decisiones 26 y 27; el centinela separado fuera del repositorio le fija el `Área` que faltaba. P10 aporta capacidad por primera vez.
- `S5.10` queda limpia de decisión — decisión 30, precedente `S5.8`; sigue 🔴 sólo porque `S5.9` no está integrada.
- `S8.7` deja de estar bloqueada por decisión y pasa a estarlo **por prerrequisito**: la decisión 25 le da dueño al inicializador confiable (`enroll/**`) pero esa Sesión todavía hay que enumerarla.
- `S5.3`, `S5.5` y `S7.1` quedan limpias de decisión y siguen 🔴 por dependencia.

**Lo que no cierra**, y sigue exigiendo acción del maintainer sin ser decisión `escala`: la segunda corrección autorizada de `S5.2` (hallazgos 1, 3 y 5 del recheck 8193), el dueño ausente de la brecha 6 —el 44% del código que `scanClosure` prohíbe empaquetar— y la Sesión `enroll/**` sin enumerar.

Próxima capacidad 🟢 LISTO: `S4.2` —ya en curso en `Worktrees/implementation-slot`—, `S5.9` y ahora `S10.2`. Esta reconciliación es documental y no re-mide runtime, payload ni inventario.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/11 Planes cerrados (18%) · Sesiones cerradas en planes activos: 31/49 (63%). Cálculo auditable: P1 `16/19` + P4 `1/4` + P5 `7/12` + P7 `0/1` + P8 `5/8` + P9 `0/2` + P10 `2/3` = `31/49`; P2 se excluye porque su STATUS declara trabajo pendiente sin Sesiones enumeradas, por lo que no tiene denominador de Plan derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 25% (1/4 S) | — | Main | S4.2, S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 58% (7/12 S) | — | Main | S5.2, S5.3, S5.5, S5.9, S5.10 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada y caché externa de Bun | 🟢 LISTO | 0% (0/2 S) | — | Maintainer | S9.1, S9.2 | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | 🟢 LISTO | 67% (2/3 S) | — | Maintainer | S10.2 (🟢 LISTO desde 2026-08-14) | [STATUS](plan-10/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
