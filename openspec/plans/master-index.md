# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-10 contra el candidato local de código `75549a7`; cierre técnico de `S5.4` con 9/9 Tareas y 15/15 criterios. El cierre documental está en el mismo `master` local y todavía no fue enviado.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S5.4` está ✅ COMPLETO en el candidato local: 9/9 Tareas y 15/15 criterios, `bun test test/escalation` 16/0/78. La rama local conserva tres commits de integración/cierre sobre `origin/master@70ea7c2`; **no fue enviada** y necesita autorización de entrega separada.

El siguiente nodo ejecutable es `S5.5` 🟢 LISTO. `S5.2` está 🔴 BLOQUEADO por los hallazgos abiertos 1, 3 y 5 del recheck dirigido 8193 y la decisión estacionada 8195; `S5.3` queda bloqueada transitivamente.

`S8.7` sigue 🔴 BLOQUEADO por autenticación, exposición de estado y callback expirado. La declaración de release también conserva la decisión abierta sobre quién origina `trustedBindingProvider` en producción.

El Plan 4 sigue 🔵 EN CURSO porque conserva responsabilidades legacy sin Sesiones enumeradas; no se le asigna porcentaje.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/9 Planes cerrados (22%) · Sesiones cerradas en planes activos: 30/46 (65%)

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | — (responsabilidades legacy restantes sin Sesiones enumeradas) | — | Main | — | [STATUS · S4.1 completa](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 40% (2/5 S) | — | Main | S5.2, S5.3, S5.5 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
