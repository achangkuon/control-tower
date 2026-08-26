# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: candidato conjunto de cierre de `S11.1`. El código está en `8d86bf6` → `2dbb714` sobre `origin/master@429f2ea`; la presente reconciliación OpenSpec es el commit documental local posterior preparado para la misma publicación directa. Verificación: **884 pass / 0 fail / 5.068 aserciones / 69 archivos**. El destino exacto de Notion está activo y su actualización no destructiva es el paso posterior al push verificado; este texto no afirma que ya ocurrió. La autoridad vigente es Moshi → Main → raíz primaria OpenCode con TUI adjunta no autoritativa.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para el **inventario del producto** —los trece comandos, los módulos sin llamador y su orden de conexión— ver [inventario-de-producto](inventario-de-producto.md). Para **qué falta para salir** ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md). La línea entre lo que decide la Torre y lo que decide gentle-ai vive en [la frontera Torre ↔ gentle-ai](frontera-torre-gentle-ai.md), y **cualquier Sesión puede citarla para rechazar alcance**.

## 📍 Punto de retoma

Último cierre integral publicado: la reconciliación de los nueve asientos, entregada y sellada en P9.
Candidato actual: `S11.1` ✅ COMPLETO en semántica atómica, con código en `8d86bf6` → `2dbb714`, OpenSpec en el commit documental local posterior y actualización no destructiva de Notion reservada para después del push verificado.
`#1 de 10 → S4.7`: elaborar y ejecutar launch Main-owned veraz con credencial owner-only y attach autenticado; es la única capacidad inmediata.
Después siguen `S4.4`, `S5.13`, `S4.6`, `S4.8`, `S4.9`, `S8.12`, `S5.5`, `S9.1` y `S7.1`; `S4.9` no gatea la primera release.
Paso documental post-push: reconciliar la fila de roadmap y el detalle de `S11.1` en la página Notion configurada, sin reemplazar ni borrar contenido.

## 🎯 Cola de ejecución

`#1 S4.7` · `#2 S4.4` · `#3 S5.13` · `#4 S4.6` · `#5 S4.8` · `#6 S4.9` · `#7 S8.12` · `#8 S5.5` · `#9 S9.1` · `#10 S7.1`. La posición es topológica; no vuelve ejecutable una dependencia pendiente.

La capacidad máxima inmediata es 1: sólo `S4.7`. `S4.7` precede `S4.4` y `S4.8`; `S4.6` + `S4.7` preceden `S4.9`. La arista `S11.1 → S7.1` queda satisfecha, pero `S7.1` todavía espera `S4.4`, `S4.6`, `S4.8`, `S5.3`, `S5.5` y `S8.12`. `S4.9` no precede la primera release.

**Conflictos de capacidad:** `S4.7`↔`S4.6` (provider/install), `S4.7`↔`S8.12` (payload/tests install), `S4.7`↔`S5.13` (fixture launch-worker CLI), `S4.6`↔`S8.12` (install), y `S4.9` reclama en exclusiva el path global Herdr. `S9.1` sigue sin `Área`/`Recurso` y no cuenta como capacidad segura.

**Fuera de la cola:** `S8.11` 🔴; `S8.5`/`S8.6`, `S1.17`–`S1.19` y `S9.4` 🟡; P6 🟡. Sin enumerar: lock huérfano de `main-store/store.mjs`, `enroll/**`, umbrales §14.3 y macOS.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 4/12 Planes cerrados (33%) · Sesiones cerradas en planes activos: 38/57 (67%). Cálculo auditable: P1 `16/19` + P4 `4/9` + P5 `11/13` + P7 `0/1` + P8 `7/11` + P9 `0/4` = `38/57`. P0, P3, P10 y P11 se excluyen porque están cerrados; P2 y P6 no tienen denominador derivable.

**Regla de denominador ([decisión 57](decision-register.md)):** una Sesión sale del denominador **sólo si dejó de ser objetivo**. Diferido-con-intención se conserva —Pi, P6—; archivado-fuera-de-alcance se retira. Por eso `S8.7` salió de ambos lados del cociente de P8.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | — · `S1.17`–`S1.19` 🟡 DIFERIDO (Pi, segundo host) | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (Change B sin Sesiones enumeradas; cuatro responsabilidades ruteadas por el inventario) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 44% (4/9 S) | — | Main | `S4.7`, `S4.4`, `S4.6`, `S4.8`, `S4.9` | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 85% (11/13 S) | — | Main | `S5.13` 📋 (recorte de verificación, va primero) · `S5.5` 🟢 destrabada | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 🟡 DIFERIDO | — (sin Sesiones enumeradas) | — | Maintainer | — condicionado a probar la Torre en uso real | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | `S7.1` | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 64% (7/11 S) | — | Maintainer | `S8.12` 📋 (canal único) · `S8.11` 🔴 (costo, no producto) · `S8.5`, `S8.6` 🟡 DIFERIDO | [STATUS](plan-8/STATUS.md) |
| P9 | Asientos de trabajo y reciclado seguro | 🔵 EN CURSO | 0% (0/4 S) | — | Maintainer | `S9.1` 📋 (falta enumerar), `S9.2`, `S9.3` · `S9.4` 🟡 DIFERIDO (Pi) | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |
| P11 | Interfaz de operador | ✅ COMPLETO | 100% (1/1 S) | — | Maintainer | — | [STATUS](plan-11/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera trabajo que alguien puede empezar o destrabar, con su estado. **🟡 DIFERIDO no es trabajo pendiente**: es alcance pospuesto deliberadamente y con razón registrada, y se anota aparte para que no infle lo que resta. El `%` conserva las Sesiones diferidas en el denominador porque siguen siendo objetivo; sólo lo archivado-fuera-de-alcance sale.

## 🗂️ Planes archivados

Ninguno.
