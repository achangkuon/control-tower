# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-11 contra el cierre publicado de `S5.6` en `origin/master@75ddcf9`, su [verify PASS](../changes/archive/2026-08-11-s5-6-canonical-session-snapshot/verify-report.md) y los planes canónicos.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S5.6` está ✅ COMPLETO y publicado en `origin/master@75ddcf9`: implementación `20e06c5` + `8cf7aab` + `10ae5e0` + `4de42fe`, evidencia `f0103fd`, 10/10 Tareas, 10/10 criterios, focused 75/0/348 y suite completa 588/0/3452. El cambio quedó archivado y la spec canónica sincronizada.

El próximo nodo ejecutable es `S5.7` 🟢 LISTO. Después siguen `S5.8` y `S5.5`, ambas 📋 PLANIFICADO. Option B permanece resuelta para `S5.8`: registro explícito y transición terminal atómicos dentro del mismo main-store.

`S5.2` sigue 🔴 BLOQUEADO por los hallazgos abiertos 1, 3 y 5 del recheck dirigido 8193 y la decisión estacionada 8195; `S5.3` conserva el bloqueo transitivo. `S8.7` sigue 🔴 BLOQUEADO por el inicializador confiable de producción pendiente.

P4 conserva `S4.2`–`S4.4` detrás de `S1.16`–`S1.19`. Fuera de la transición derivada de `S5.7` a 🟢 LISTO, ningún estado ajeno a `S5.6` cambió en este cierre.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/9 Planes cerrados (22%) · Sesiones cerradas en planes activos: 19/40 (48%). Cálculo auditable: P1 `10/19` + P4 `1/4` + P5 `3/8` + P7 `0/1` + P8 `5/8`; P2 se excluye porque su STATUS declara trabajo pendiente sin Sesiones enumeradas, por lo que no tiene denominador de Plan derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 25% (1/4 S) | — | Main | S4.2, S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 38% (3/8 S) | — | Main | S5.2, S5.3, S5.5, S5.7, S5.8 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
