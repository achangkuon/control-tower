# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-11 contra el tip integrado local `a1dce220dae594006bda0722d0bdb640cf4b9be7` (tree `061de580c92feb577033c4255ce629267cbc7d62`). La entrega remota todavía no está probada.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S1.11` y `S5.7` quedan ✅ COMPLETO sobre el tip integrado local; este cierre sólo se vuelve entrega publicada cuando los commits integrados y este commit documental salgan juntos en el mismo push atómico futuro. No hay prueba de entrega remota todavía.

Los próximos nodos ejecutables después de ese push son `S1.12` y `S5.8`, ambos 🟢 LISTO, con `Área` y `Recurso` disjuntos. En P1 rige la cadena exacta `S1.12 → S1.13 → S1.14 → S1.15 → S1.16`; `S1.16` permanece 📋 PLANIFICADO.

`S5.2` sigue 🔴 BLOQUEADO por los hallazgos 1, 3 y 5 del recheck 8193; `S5.3` conserva el bloqueo transitivo. `S8.7` sigue 🔴 BLOQUEADO por el inicializador confiable de producción pendiente.

Siguen escaladas al maintainer la ubicación de `S3.5`/`S3.6`, el destino del candidato estacionado de `S5.2` y el origen de `trustedBindingProvider` en producción para `S8.7`.

Notion queda diferido hasta que exista un push remoto probado; este cierre local no lo modifica.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/9 Planes cerrados (22%) · Sesiones cerradas en planes activos: 21/40 (53%). Cálculo auditable: P1 `11/19` + P4 `1/4` + P5 `4/8` + P7 `0/1` + P8 `5/8`; P2 se excluye porque su STATUS declara trabajo pendiente sin Sesiones enumeradas, por lo que no tiene denominador de Plan derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 58% (11/19 S) | — | Main | S1.12, S1.13, S1.14, S1.15, S1.16, S1.17, S1.18, S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 25% (1/4 S) | — | Main | S4.2, S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 50% (4/8 S) | — | Main | S5.2, S5.3, S5.5, S5.8 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
