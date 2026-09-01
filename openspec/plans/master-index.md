# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-09-01 sobre `master/origin@1ea625b`, incorporando el gate correctivo `S9.9` autorizado en Engram 10034/10035.
> Para estado de código ver [implementation-state](implementation-state.md); para ownership de producto ver [inventario](inventario-de-producto.md); para orden de salida ver [release-chain](release-chain.md); para autoridad ver [decision-register](decision-register.md).

## 📍 Punto de retoma

**Objetivo activo:** corregir el binding de workspace Herdr antes de abrir otro worker: una apertura desde Main ligada a `w5C` creó `AGENTES` y un pane en el workspace ajeno `w5E`. `S1.18`, `S1.17`, `S9.4`, `S9.6` y P11 permanecen cerrados.

**Próximo:** `#1 S9.9` exige y propaga el workspace explícito, valida por readback y falla cerrado sin fallback. Sólo después `#2 S1.20` conserva su contrato de probe tipado/read-only; queda prohibido despachar workers hasta entregar la corrección.

**Estado preservado:** `S2.9` y el resto mantienen su orden relativo. `S1.19` sigue destinado a la evidencia de runtime Pi real; `S2.10` continúa 🔴 BLOQUEADO hasta ubicar el renderer/owner real del menú central, sin inventar path ni workaround.

## 🎯 Cola de ejecución

`#1 S9.9` · `#2 S1.20` · `#3 S2.9` · `#4 S9.7` · `#5 S9.5` · `#6 S9.8` · `#7 S8.12` · `#8 S1.19` · `#9 S4.12` · `#10 S8.13` · `#11 S12.9` · `#12 S12.1` · `#13 S5.14` · `#14 S5.5` · `#15 S5.15` · `#16 S9.2` · `#17 S9.3` · `#18 S7.1` — se antepuso sólo el gate correctivo y se preservó todo orden relativo previo.

**Paralelismo derivado:** con `S1.18` cerrada, `S1.19` y `S4.12` son independientes de la rama `S1.20 + S2.9 → S9.7 → S9.5 → S9.8 → S8.12`, sujeto a Área/Recurso. `S8.13` espera `S8.12 + S1.19 + S4.12`. `S9.5` posee sólo topología/materialización Herdr; `S9.8` posee dispatch fire-and-forget y terminalidad en skills. `S8.12` empaqueta después de `S9.8`.

**Fuera de la cola:** `S2.10`, `S8.11` y `S12.3` 🔴 BLOQUEADO; por `S12.3` también quedan fuera `S12.4`–`S12.6`. `S4.4`, `S4.8`, `S8.5`, `S8.6`, `S12.7` y P6 🟡 DIFERIDO. `S4.9` y `S8.7` 📚 ARCHIVADO. Las Sesiones ✅ COMPLETO permanecen fuera sin reescribir historia.

## Granularidad

Plan → Sesión → Módulo → Tarea. **Sesión = alcance coherente de revisión que cabe en un PR.** La entrega actual puede usar commits directos secuenciales, pero cada resultado planificado aquí queda independientemente revisable, verificable y revertible con forecast ≤400 líneas authored. El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 4/13 Planes cerrados (31%) · Sesiones cerradas en planes activos con denominador derivable: 53/80 (66%). Cálculo: P1 `18/20` + P4 `10/13` + P5 `12/15` + P7 `0/1` + P8 `8/13` + P9 `3/9` + P12 `2/9` = `53/80`. P0, P3, P10 y P11 están cerrados. P2 y P6 conservan `—`: P2 todavía tiene responsabilidades no enumeradas de storage/revisión, alias/resolución y validación de root/common-dir/remote; P6 no tiene Sesiones enumeradas.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 90% (18/20 S) | — | Main | `S1.19`, `S1.20` | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades todavía sin Sesión enumerada) | — | Main | `S2.9`, `S2.10` | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 77% (10/13 S) | — | Main | `S4.12` | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 80% (12/15 S) | — | Main | `S5.5`, `S5.14`, `S5.15` | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 🟡 DIFERIDO | — (sin Sesiones enumeradas) | — | Maintainer | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | `S7.1` | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 62% (8/13 S) | — | Maintainer | `S8.11`, `S8.12`, `S8.13` | [STATUS](plan-8/STATUS.md) |
| P9 | Asientos de trabajo y reciclado seguro | 🔵 EN CURSO | 33% (3/9 S) | — | Maintainer | `S9.2`, `S9.3`, `S9.5`, `S9.7`, `S9.8`, `S9.9` | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |
| P11 | Interfaz de operador | ✅ COMPLETO | 100% (1/1 S) | — | Maintainer | — | [STATUS](plan-11/STATUS.md) |
| P12 | Orden estructural del repositorio | 🔵 EN CURSO | 22% (2/9 S) | 50h | Maintainer | `S12.9`, `S12.1`, `S12.3`–`S12.6` | [STATUS](plan-12/STATUS.md) |

> `Qué falta` usa sólo IDs. 🟡 DIFERIDO no aparece como pendiente; permanece en el denominador mientras siga siendo objetivo. 📚 ARCHIVADO fuera de alcance sale del denominador según la decisión 57.

## 🗂️ Planes archivados

Ninguno.
