# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-04 contra `origin/master@b6dda84`; cierre verificado de `S3.4`, **Plan 3 cerrado entero**, y `S5.1` 🟢 LISTO con su contrato sellado.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

**`S5.1` sigue 🟢 LISTO y `M5.1.3` está re-sellado, pero el candidato `s5-1@dee52e3` sigue inválido y sin integrar.** El contrato tiene 27 criterios binarios, suma exactamente `package.json`, `bun.lock` y `.opencode/plugins/tower-spike.js` al `Área`, y mantiene `core.mjs` y `test/recovery.test.mjs` en el `Prohibido`. Es sello de planificación, no verificación de implementación.

**Resultado binario del mapa: la `S5.1` corregida NO necesita schema v6.** La prueba aislada ejecutó la inyección sobre core schema-v5 con 3/0 y 7/0 tests; al quitar el reader auto-obtenido no queda ningún consumidor probado de schema-v6 que mapear. **No se enumera una Sesión de v6: no existe, y ese trabajo no bloquea la cadena de release.**

**La dirección de confianza queda cerrada:** un inicializador confiable aguas arriba inyecta `trustedBindingProvider` en `TowerSpikePlugin`; la plugin valida `context.sessionID`, liga autoridad y recién entonces crea el Main store. `createMainStore` consume `authority` y `capability` ya emitidas, por lo que **no puede originar el provider** sin invertir la confianza y crear una segunda fuente de identidad de Main.

**El único bloqueo actual es corrección de código.** El candidato debe eliminar la dependencia de schema-v6 y del reader de `core.mjs`, e implementar el **lado receptor** que `M5.1.3` sí promete —`TowerSpikePlugin` recibe `trustedBindingProvider` al inicializarse, valida y falla cerrado ante provider ausente, inválido o de otra sesión—; recién después se verifican los 27 criterios de `S5.1`. **`M5.1.3` no promete construir el inicializador confiable de producción aguas arriba**: su contrato es recibir la inyección, no originarla. Quién construye ese inicializador es la decisión abierta 9.

**Cola inmediata:** corregir, verificar e integrar `S5.1`; después ejecutar `S4.1`, que sigue 📋 PLANIFICADO y conserva su dependencia directa de `S5.1` corregida e integrada, **sin arista nueva**. `S5.2` espera `S4.1`; `S5.4` y `S8.7` esperan `S5.1`; el resto del orden permanece sin cambios.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/9 Planes cerrados (22%) · Sesiones cerradas en planes activos: 27/46 (59%)

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | 0% (0/1 S) | — | Main | S4.1 | [STATUS · S4.1 sellada](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | 0% (0/5 S) | — | Main | S5.1, S5.2, S5.3, S5.4, S5.5 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
