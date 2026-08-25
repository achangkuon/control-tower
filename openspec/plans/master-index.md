# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-25 contra la base inmutable `master@a9a8f3c`. La suite conocida permanece en **862 pass / 13 todo / 1 fail**; la decisión 67 asigna condicionalmente el timeout a `S4.7` sólo si la reproducción confirma el mismo launch path. La autoridad vigente es Moshi → Main → raíz primaria OpenCode con TUI adjunta no autoritativa.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para el **inventario del producto** —los trece comandos, los módulos sin llamador y su orden de conexión— ver [inventario-de-producto](inventario-de-producto.md). Para **qué falta para salir** ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md). La línea entre lo que decide la Torre y lo que decide gentle-ai vive en [la frontera Torre ↔ gentle-ai](frontera-torre-gentle-ai.md), y **cualquier Sesión puede citarla para rechazar alcance**.

## 📍 Punto de retoma

Último cierre: la reconciliación de los nueve asientos quedó entregada en `master@a9a8f3c`; su cadena de entrega quedó sellada en P9.
`#1 de 11 → S4.7`: elaborar y ejecutar launch Main-owned veraz con credencial owner-only y attach autenticado; el timeout de `test/install/launch-worker-cli.test.mjs:51` entra sólo si reproduce el mismo camino.
`S11.1` puede avanzar en paralelo porque conserva `Depende de: nada` y no comparte `Área` ni `Recurso` con `S4.7`.
Después siguen `S4.4`, `S5.13`, `S4.6`, `S4.8`, `S4.9`, `S8.12`, `S5.5`, `S9.1` y `S7.1`; `S4.9` no gatea la primera release.
Unknowns técnicos: señal machine-readable de attach OpenCode `1.18.23`, compatibilidad real plugin/SDK `1.18.13` y matriz real Herdr `0.8.2`. El runtime legacy instalado no es evidencia.

## 🎯 Cola de ejecución

`#1 S4.7` · `#2 S11.1` · `#3 S4.4` · `#4 S5.13` · `#5 S4.6` · `#6 S4.8` · `#7 S4.9` · `#8 S8.12` · `#9 S5.5` · `#10 S9.1` · `#11 S7.1` — reconciliada 2026-08-25. La posición es topológica; no vuelve ejecutable una dependencia pendiente.

`S4.7` y `S11.1` admiten capacidad paralela máxima inmediata de 2: son graph-independent y sus `Área`/`Recurso` son disjuntos. `S4.7` precede `S4.4` y `S4.8`; `S4.6` + `S4.7` preceden `S4.9`; `S4.4` + `S4.6` + `S4.8` preceden `S7.1`. `S4.9` no precede la primera release.

**Conflictos de capacidad:** `S4.7`↔`S4.6` (provider/install), `S4.7`↔`S8.12` (payload/tests install), `S4.7`↔`S5.13` (fixture launch-worker CLI), `S4.6`↔`S8.12` (install), y `S4.9` reclama en exclusiva el path global Herdr. `S9.1` sigue sin `Área`/`Recurso` y no cuenta como capacidad segura.

**Fuera de la cola:** `S8.11` 🔴; `S8.5`/`S8.6`, `S1.17`–`S1.19` y `S9.4` 🟡; P6 🟡. Sin enumerar: lock huérfano de `main-store/store.mjs`, `enroll/**`, umbrales §14.3 y macOS.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 3/12 Planes cerrados (25%) · Sesiones cerradas en planes activos: 38/58 (66%). Cálculo auditable: P1 `16/19` + P4 `4/9` + P5 `11/13` + P7 `0/1` + P8 `7/11` + P9 `0/4` + P11 `0/1` = `38/58`. P10 se excluye porque cerró 3/3 S. P2 y P6 no tienen denominador derivable.

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
| P11 | Interfaz de operador | 🟢 LISTO | 0% (0/1 S) | — | Maintainer | `S11.1` | [STATUS](plan-11/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera trabajo que alguien puede empezar o destrabar, con su estado. **🟡 DIFERIDO no es trabajo pendiente**: es alcance pospuesto deliberadamente y con razón registrada, y se anota aparte para que no infle lo que resta. El `%` conserva las Sesiones diferidas en el denominador porque siguen siendo objetivo; sólo lo archivado-fuera-de-alcance sale.

## 🗂️ Planes archivados

Ninguno.
