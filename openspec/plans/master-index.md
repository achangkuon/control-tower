# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-18 contra `master@8fac8b3`. La autoridad vigente es Moshi → Main → raíz primaria OpenCode con TUI adjunta no autoritativa; Herdr no pertenece al lifecycle crítico.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

**`S4.5` está ✅ COMPLETO** en `8fac8b3`: corrigió los dos bloqueos del 4R inicial —runtime productivo legacy Herdr-owned y `agent` imposible en el create response— y preserva `backend.start` → binding durable → vista no autoritativa, con cleanup best-effort de backend no ligado y fallback manual exacto de vista. Strict TDD cerró en 776 pass / 0 fail / 4.793 expectations; el harness instalado verificó `herdr pane run ... opencode attach <loopback-url> --session <root-id>`. El validator scoped final no halló bloqueantes. La decisión 42 / Engram 9079 expandió exclusivamente el Área a los dos fixtures de payload/runtime, por lo que los nueve criterios pasan.

P4 pasa a 3/5 S (60%). La próxima Sesión es `S4.3`; `S4.4` espera su dependencia. El warning de preflight release es preexistente y no candidato-causado; no se asigna a S4.3 sin autoridad. `S5.2` conserva su corrección técnica pendiente y la decisión externa de `S9.2` queda fuera de la cadena.

**`S9.1` está 🔵 EN CURSO y BLOQUEADA por una decisión del maintainer.** Su planificación está completa —nueve Módulos, veintisiete Tareas, nueve commits directos secuenciales de ≤400 líneas— pero la ejecución va `1/9 M` y `3/27 T`. `M9.1.1` está congelado y el candidato terminal de `M9.1.2` **no está aceptado, ni es reutilizable, ni entregable**: quedó como evidencia de diagnóstico. La próxima acción exacta es `await-fresh-rewrite-authorization` — el maintainer debe autorizar por separado descartarlo y reescribirlo antes de un RED fresco. `S9.1` no reanuda hasta entonces. `S9.3` quedó enumerada como Sesión nueva y arrastra el denominador global de 47 a 48; está 🔴 BLOQUEADA por autoridad de transporte.

## 🎯 Cola de ejecución

`#1 S4.3` · `#2 S5.10` · `#3 S4.4` · `#4 S5.3` · `#5 S5.5` · `#6 S7.1` — recalculada 2026-08-18 tras cerrar `S4.5`. `S5.10` conserva su posición detrás de `S4.3`; su dependencia `S5.9` está satisfecha. Pi/Intercom y S8.7 no integran esta cola.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 3/11 Planes cerrados (27%) · Sesiones cerradas en planes activos: 33/48 (69%). Cálculo auditable: P1 `16/19` + P4 `3/5` + P5 `8/12` + P7 `0/1` + P8 `6/8` + P9 `0/3` = `33/48`; el denominador subió de 47 a 48 porque `S9.3` quedó enumerada en el Plan 9; P10 se excluye porque cerró 3/3 S. P2 no tiene denominador derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 60% (3/5 S) | — | Main | S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 67% (8/12 S) | — | Main | S5.2, S5.3, S5.5, S5.10 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 75% (6/8 S) | — | Maintainer | S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada y caché externa de Bun | 🔵 EN CURSO | 0% (0/3 S) | — | Maintainer | S9.1 (🔵, esperando autorización), S9.2, S9.3 | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
