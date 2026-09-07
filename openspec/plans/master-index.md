# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Candidato documental fresco sobre `e9bcba7a8e9b7cc5ac7de67a11a867b17c8978f5` / tree `1a7a030ed4992db4e9c82b04faebd735e2ca59b3`: acompaña el mismo push atómico pendiente de `S9.9`; la decisión 108 reemplaza el estacionamiento de la 107 sólo en su alcance explícito.
> Para estado de código ver [implementation-state](implementation-state.md); para ownership de producto ver [inventario](inventario-de-producto.md); para orden de salida ver [release-chain](release-chain.md); para autoridad ver [decision-register](decision-register.md).

## 📍 Punto de retoma

**Estado actual:** `S9.9` está ✅ COMPLETO por el commit `e9bcba7a8e9b7cc5ac7de67a11a867b17c8978f5`, tree `1a7a030ed4992db4e9c82b04faebd735e2ca59b3`, con código y esta documentación en el mismo push atómico pendiente. No hubo PR, Herdr, Tower, runtime ni DB.

**Siguiente bloqueo:** `#1 S9.10` está 🔴 BLOQUEADO antes de RED: hace falta autoridad humana sobre la sintaxis pública CLI/API de `asignar` para materializar un asiento permanente limpio desde el `base_sha` no-master exacto aprobado. No modifica `asignar` ni el reciclado trunk de `jornada.sh`; tras resolver la sintaxis, entrega su commit independiente ≤400 y recién entonces se retoma P0 `S101`.

**Checkpoint exacto:** la decisión 108 autorizó sólo el bootstrap ya completado de `S9.9` en `implementer-3`, sin Herdr y con los cinco paths exactos. La primera RED no acredita cumplimiento porque el packet literal llegó a Engram 10510 después; la RED correctiva posterior sí. `S2.10` sigue 🔴 BLOQUEADO sin inventar owner ni path.

## 🎯 Cola de ejecución

`#1 S9.10` · `#2 S101` · `#3 S1.20` · `#4 S2.9` · `#5 S9.7` · `#6 S9.5` · `#7 S9.8` · `#8 S8.12` · `#9 S1.19` · `#10 S4.12` · `#11 S8.13` · `#12 S12.9` · `#13 S12.1` · `#14 S5.14` · `#15 S5.5` · `#16 S5.15` · `#17 S9.2` · `#18 S9.3` · `#19 S7.1` — `S9.10` precede materialmente a `S101`; se preserva el orden relativo restante.

**Paralelismo derivado:** con `S1.18` cerrada, `S1.19` y `S4.12` son independientes de la rama `S1.20 + S2.9 → S9.7 → S9.5 → S9.8 → S8.12`, sujeto a Área/Recurso. `S8.13` espera `S8.12 + S1.19 + S4.12`. `S9.5` posee sólo topología/materialización Herdr; `S9.8` posee dispatch fire-and-forget y terminalidad en skills. `S8.12` empaqueta después de `S9.8`.

**Fuera de la cola:** `S2.10`, `S8.11` y `S12.3` 🔴 BLOQUEADO; por `S12.3` también quedan fuera `S12.4`–`S12.6`. `S4.4`, `S4.8`, `S8.5`, `S8.6`, `S12.7` y P6 🟡 DIFERIDO. `S4.9` y `S8.7` 📚 ARCHIVADO. Las Sesiones ✅ COMPLETO permanecen fuera sin reescribir historia.

## Granularidad

Plan → Sesión → Módulo → Tarea. **Sesión = alcance coherente de revisión que cabe en un PR.** La entrega actual puede usar commits directos secuenciales, pero cada resultado planificado aquí queda independientemente revisable, verificable y revertible con forecast ≤400 líneas authored. El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global:** Planes cerrados: `3/13` · Sesiones cerradas: `65/93 (70%)`. Ambos usan todas las filas de Plan enumeradas; P2 y P6 conservan `—` porque no tienen Sesiones enumeradas.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | 🔵 EN CURSO | 75% (3/4 S) | — | Maintainer | `S0.4`, `S101` | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 90% (18/20 S) | — | Main | `S1.19`, `S1.20` | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades todavía sin Sesión enumerada) | — | Main | `S2.9`, `S2.10` | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 77% (10/13 S) | — | Main | `S4.12` | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 80% (12/15 S) | — | Main | `S5.5`, `S5.14`, `S5.15` | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 🟡 DIFERIDO | — (sin Sesiones enumeradas) | — | Maintainer | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | `S7.1` | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 62% (8/13 S) | — | Maintainer | `S8.11`, `S8.12`, `S8.13` | [STATUS](plan-8/STATUS.md) |
| P9 | Asientos de trabajo y reciclado seguro | 🔵 EN CURSO | 40% (4/10 S) | — | Maintainer | `S9.2`, `S9.3`, `S9.5`, `S9.7`, `S9.8`, `S9.10` | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |
| P11 | Interfaz de operador | ✅ COMPLETO | 100% (1/1 S) | — | Maintainer | — | [STATUS](plan-11/STATUS.md) |
| P12 | Orden estructural del repositorio | 🔵 EN CURSO | 22% (2/9 S) | 50h | Maintainer | `S12.9`, `S12.1`, `S12.3`–`S12.6` | [STATUS](plan-12/STATUS.md) |

> `Qué falta` usa sólo IDs. Cada `x/y S` incluye toda Sesión enumerada de su Plan; 🟡 DIFERIDO permanece en el denominador y 📚 ARCHIVADO fuera de alcance sale según la decisión 57.

## 🗂️ Planes archivados

Ninguno.
