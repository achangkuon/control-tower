# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-21 contra `master@7b58ad8`, con la suite completa en **863 pass / 13 todo / 0 fail**. Cierra `S8.10`, cierra la Fase 2 del plan de depuración, y aplica la regla de denominador de la [decisión 57](decision-register.md). La autoridad vigente es Moshi → Main → raíz primaria OpenCode con TUI adjunta no autoritativa; Herdr no pertenece al lifecycle crítico.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para el **inventario del producto** —los trece comandos, los módulos sin llamador y su orden de conexión— ver [inventario-de-producto](inventario-de-producto.md). Para **qué falta para salir** ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

**`S8.10` está ✅ COMPLETO e integrada en `master@7b58ad8`.** El payload derivado ahora cierra sobre los schemas: `contracts/schema-registry.mjs` declara su propia familia mediante `schemaAssetPaths`, el generador compone una sola vez —assets manuales, familias propietarias, cierre JS— y esa composición alimenta tanto el chequeo de deriva como el render. El payload pasó de 28 a 53 miembros y `RUNTIME_PAYLOAD_ASSETS` permanece exactamente `["bin/torre"]`. La verificación final que faltaba encontró el defecto que tenía parqueado al candidato: `assertCurrentHost` construía la identidad de época por exclusión y le pasaba a `inspectIdentity` campos del binding que su contrato exacto rechaza.

**Se destrabó `S4.4`**, que esperaba la puerta semántica de `S8.10`, y quedan elegibles `S4.6`, `S8.12` y `S11.1`.

**La Fase 2 del plan de depuración cerró.** Las tres auditorías exclusivas están hechas y sus tres trabajos huérfanos tienen dueño ([decisión 63](decision-register.md)): nace **P11 — Interfaz de operador** con `S11.1`, nace `S4.6` en P4, y nace `S8.12` en P8. P9 quedó recortado, reordenado y **renumerado** por la [decisión 62](decision-register.md) — su tabla de migración vive en [plan-9](plan-9/STATUS.md) y la historia del registro de decisiones no se reescribió.

**El avance global bajó de 73% a 70%, y eso es la corrección funcionando.** No se perdió trabajo: se enumeró trabajo que existía y nadie contaba. `S8.7` salió del denominador por archivada-fuera-de-alcance, y entraron `S4.6`, `S8.12` y `S11.1`.

**`S8.11` sigue 🔴 BLOQUEADO.** Es optimización de costo —entorno de dependencias compartido por digest de lock— y no bloquea producto.

Siguen fuera de esta reconciliación: el lock huérfano de `main-store/store.mjs:104-124`, la Sesión `enroll/**`, los umbrales de liveness de §14.3 y el soporte de macOS. **El cableado del producto no instalado dejó de estar sin dueño**: lo cubren `S8.12` y el orden de conexión de [inventario-de-producto](inventario-de-producto.md).

## 🎯 Cola de ejecución

`#1 S11.1` · `#2 S4.4` · `#3 S4.6` · `#4 S8.12` · `#5 S9.1` · `#6 S5.5` · `#7 S7.1` — reconciliada 2026-08-21 tras cerrar `S8.10` y la Fase 2. **La cola incluye sólo Sesiones 🟢 LISTO y 📋 PLANIFICADO en orden topológico; la posición no vuelve ejecutable una dependencia pendiente.**

`S11.1` encabeza porque no depende de nada: el vocabulario, el validador y el canal `send`/`receive` ya existen y ya se instalan. `S4.4` se destrabó al cerrar `S8.10`. `S4.6` y `S8.12` esperaban esa misma integración porque tocan el contrato de payload. `S9.1` necesita enumerar `Área`, `Recurso` y Módulos, que es trabajo y no decisión. `S7.1` cierra la cola porque espera `S4.4` y `S5.5`.

**`S5.5` está 🟢 LISTO pero no arranca todavía, y es deliberado.** La Fase 3 del plan de depuración reescribe el propósito de P5 para sacarle la verificación que pertenece a gentle-ai ([decisión 59](decision-register.md)); arrancarla antes sería construir sobre un objetivo de Plan que ya sabemos mal escrito.

**Fuera de la cola:** `S8.11` 🔴 y `S8.5`/`S8.6` 🟡 en P8; `S1.17`–`S1.19` y `S9.4` 🟡, todas Pi como segundo host, posterior a cerrar la ruta OpenCode; P6 🟡 diferido condicionado.

**Trabajo sin enumerar que ninguna posición cubre:** el lock huérfano de `main-store/store.mjs:104-124`, la Sesión `enroll/**`, los umbrales de liveness de §14.3 y macOS.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 3/12 Planes cerrados (25%) · Sesiones cerradas en planes activos: 38/54 (70%). Cálculo auditable: P1 `16/19` + P4 `4/6` + P5 `11/12` + P7 `0/1` + P8 `7/11` + P9 `0/4` + P11 `0/1` = `38/54`. P10 se excluye porque cerró 3/3 S. P2 y P6 no tienen denominador derivable.

**Regla de denominador ([decisión 57](decision-register.md)):** una Sesión sale del denominador **sólo si dejó de ser objetivo**. Diferido-con-intención se conserva —Pi, P6—; archivado-fuera-de-alcance se retira. Por eso `S8.7` salió de ambos lados del cociente de P8.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | — · `S1.17`–`S1.19` 🟡 DIFERIDO (Pi, segundo host) | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (Change B sin Sesiones enumeradas; cuatro responsabilidades ruteadas por el inventario) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 67% (4/6 S) | — | Main | `S4.4` 🟢 destrabada · `S4.6` 📋 (retiro de Herdr) | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 92% (11/12 S) | — | Main | `S5.5` 🟢 — espera la Fase 3 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 🟡 DIFERIDO | — (sin Sesiones enumeradas) | — | Maintainer | — condicionado a probar la Torre en uso real | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | `S7.1` | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 64% (7/11 S) | — | Maintainer | `S8.12` 📋 (canal único) · `S8.11` 🔴 (costo, no producto) · `S8.5`, `S8.6` 🟡 DIFERIDO | [STATUS](plan-8/STATUS.md) |
| P9 | Asientos de trabajo y reciclado seguro | 🔵 EN CURSO | 0% (0/4 S) | — | Maintainer | `S9.1` 📋 (falta enumerar), `S9.2`, `S9.3` · `S9.4` 🟡 DIFERIDO (Pi) | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |
| P11 | Interfaz de operador | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | `S11.1` 📋 — ejecutor y superficie tipeable | [STATUS](plan-11/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera trabajo que alguien puede empezar o destrabar, con su estado. **🟡 DIFERIDO no es trabajo pendiente**: es alcance pospuesto deliberadamente y con razón registrada, y se anota aparte para que no infle lo que resta. El `%` conserva las Sesiones diferidas en el denominador porque siguen siendo objetivo; sólo lo archivado-fuera-de-alcance sale.

## 🗂️ Planes archivados

Ninguno.
