# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-18 contra `master@8d4b28a`. La autoridad vigente es Moshi → Main → raíz primaria OpenCode con TUI adjunta no autoritativa; Herdr no pertenece al lifecycle crítico.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

**`S5.9` está ✅ COMPLETO**, entregada el 2026-08-18 en `3c3040d`, `754c698` y `8d4b28a`, con `master` en 731 pass / 0 fail. Siete criterios pasan con evidencia de runtime; el octavo quedó enmendado por la **decisión 41**: la cláusula que exigía preservar el falsificador fallido se cierra como pérdida aceptada y documentada, porque un upsert sobre `topic_key` mutable de Engram destruyó el artefacto que este plan fijaba por hash. La regla derivada —evidencia durable en Git o en identificador inmutable, nunca en una clave que se sobreescribe— vive en el [registro de decisiones](decision-register.md).

`S4.2` está ✅ COMPLETO en `61a5aa2`; la decisión 37 preserva esa historia y enumera `S4.5` para migrar el lifecycle futuro a Main-owned backend/root con TUI adjunta no autoritativa.

`S4.5` está 🟢 LISTO y decision-clean: 38 fija backend aislado por worktree y 39 fija Herdr sólo como vista temporal reemplazable. La 40 resuelve recuperación: vista perdida reconecta la raíz viva; muerte probada crea raíz/epoch sucesores desde autoridad durable, sin resucitar el ID anterior. Las 39 decisiones `escala` de la cadena están resueltas; `S4.3` y `S4.4` esperan sus dependencias, y la decisión externa de `S9.2` permanece fuera de esta cadena.

La capacidad inmediata es `S4.5`, que aún requiere `session-plan` antes de ejecutar porque su forecast no garantiza una sola unidad ≤400. `S5.2` conserva su corrección técnica pendiente.

**`S9.1` está 🔵 EN CURSO y BLOQUEADA por una decisión del maintainer.** Su planificación está completa —nueve Módulos, veintisiete Tareas, nueve commits directos secuenciales de ≤400 líneas— pero la ejecución va `1/9 M` y `3/27 T`. `M9.1.1` está congelado y el candidato terminal de `M9.1.2` **no está aceptado, ni es reutilizable, ni entregable**: quedó como evidencia de diagnóstico. La próxima acción exacta es `await-fresh-rewrite-authorization` — el maintainer debe autorizar por separado descartarlo y reescribirlo antes de un RED fresco. `S9.1` no reanuda hasta entonces. `S9.3` quedó enumerada como Sesión nueva y arrastra el denominador global de 47 a 48; está 🔴 BLOQUEADA por autoridad de transporte.

## 🎯 Cola de ejecución

`#1 S4.5` · `#2 S4.3` · `#3 S5.10` · `#4 S4.4` · `#5 S5.3` · `#6 S5.5` · `#7 S7.1` — recalculada 2026-08-18 tras entregar `S5.9`. `S5.10` conserva su posición detrás de `S4.3`; su dependencia `S5.9` **integrada** está satisfecha. La decisión 40 no cambia edges ni concede crédito; Pi/Intercom y S8.7 no integran esta cola.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 3/11 Planes cerrados (27%) · Sesiones cerradas en planes activos: 32/48 (67%). Cálculo auditable: P1 `16/19` + P4 `2/5` + P5 `8/12` + P7 `0/1` + P8 `6/8` + P9 `0/3` = `32/48`; el denominador subió de 47 a 48 porque `S9.3` quedó enumerada en el Plan 9; P10 se excluye porque cerró 3/3 S. P2 no tiene denominador derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 40% (2/5 S) | — | Main | S4.5, S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 67% (8/12 S) | — | Main | S5.2, S5.3, S5.5, S5.10 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 75% (6/8 S) | — | Maintainer | S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada y caché externa de Bun | 🔵 EN CURSO | 0% (0/3 S) | — | Maintainer | S9.1 (🔵, esperando autorización), S9.2, S9.3 | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
