# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-03 contra `d56e8cb`; cierre verificado de `S8.8`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md).

## 🔢 Orden de ejecución

**Leé esta tabla primero.** La columna `#` es **cuándo** se hace; el ID es **cómo se llama**. No coinciden, y no tienen por qué: los IDs son nombres posicionales, como los números de una calle — te dicen dónde queda la casa, no en qué orden visitarlas. `S4.1` va después de `S5.1`, y `M8.8.6` se ejecutó antes que `M8.8.3`. El orden lo dicta el grafo, nunca el número.

| # | Sesión | Plan | Estado | Qué es |
|---|---|---|---|---|
| ▶ | `S8.8` | P8 | 🔵 EN CURSO | Adopción del instalable. Le quedan `M8.8.7` y `M8.8.8` |
| ▶ | `S3.1` | P3 | 🟢 LISTO | Workspace checkpoint. La otra entrada disponible del grafo |
| 1 | `S3.2` | P3 | 📋 PLANIFICADO | Policy/Jornada y resolución de la política de entrega |
| 2 | `S3.3` | P3 | 📋 PLANIFICADO | Agent Capability Registry |
| 3 | `S5.1` | P5 | 📋 PLANIFICADO | Candidate contracts + authorization store |
| 4 | `S4.1` | P4 | 📋 PLANIFICADO | Hosts y línea exclusiva — **cierra P4 entero** |
| 5 | `S5.2` | P5 | 📋 PLANIFICADO | Entrega idempotente y reconciliación |
| 6 | `S5.4` | P5 | 📋 PLANIFICADO | Ruteo de escalamiento fuera/en casa |
| 7 | `S5.5` | P5 | 📋 PLANIFICADO | Decisión estacionada y continuación independiente |
| 8 | `S5.3` | P5 | 📋 PLANIFICADO | Continuación desde base integrada |
| 9 | `S8.7` | P8 | 📋 PLANIFICADO | Puente Hermes/Telegram — **acá entra la autenticación pendiente** |
| 10 | `S7.1` | P7 | 📋 PLANIFICADO | Conformidad de release — **última de toda la cadena** |

`S0.3` ✅ COMPLETO ya salió de la fila. `S8.5` y `S8.6` están 🟡 DIFERIDO y fuera de este camino. El grafo completo, con sus aristas y las dos Sesiones que pueden correr en paralelo, vive en [release-chain](release-chain.md).

## 📍 Punto de retoma

**`S8.8` ✅ COMPLETO.** `M8.8.7` (`e118f33`) repara el entrypoint copiado: sin mecanismo de puntero cae al legado y con puntero presente roto falla cerrado. `M8.8.8` (`d56e8cb`) instala desde un checkout Git genuino, mantiene staging estricto incluso con `.git` sintético y deja el shim detrás de `--shim`. Verificación final: `bun test test/install` 44/0 y `bun test` 465/0, con Torre desarmada y fixtures sin runtime real.

**P8 está en `63% (5/8 S)`.** `S8.5` y `S8.6` siguen 🟡 DIFERIDO; `S8.7` sigue 📋 PLANIFICADO y espera `S5.1`. La próxima Sesión aprobada por el grafo es `S3.1` 🟢 LISTO.

**Producto único.** `installable-v1` y `autonomous-v2` son afinidades de trabajo, no identidades de producto; la cadena y sus dependencias viven en [release-chain](release-chain.md).

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 1/9 Planes cerrados (11%) · Sesiones cerradas en planes activos: 23/45 (51%)

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | 🟢 LISTO | 0% (0/3 S) | — | Main | S3.1, S3.2, S3.3 | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | 0% (0/1 S) | — | Main | S4.1 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | 0% (0/5 S) | — | Main | S5.1, S5.2, S5.3, S5.4, S5.5 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
