# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: candidato documental previo a los checks dirigidos, una ejecución integral de `bun test` y el snapshot exacto de `S5.13`. Las nueve Tareas de implementación están completas bajo Strict TDD focalizado; no afirma suite integral, snapshot, commit, push, entrega ni cierre de Sesión. La autoridad vigente es Moshi → Main → raíz primaria OpenCode con TUI adjunta no autoritativa.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para el **inventario del producto** —los trece comandos, los módulos sin llamador y su orden de conexión— ver [inventario-de-producto](inventario-de-producto.md). Para **qué falta para salir** ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md). La línea entre lo que decide la Torre y lo que decide gentle-ai vive en [la frontera Torre ↔ gentle-ai](frontera-torre-gentle-ai.md), y **cualquier Sesión puede citarla para rechazar alcance** — desde el 2026-08-25 la frontera tiene **dos ejes**: la calidad del trabajo y el flujo de trabajo ([decisión 71](decision-register.md)). La **definición de producto vigente** —qué es y qué deliberadamente no va a ser la Torre terminada— es [**La Torre Terminada**](https://claude.ai/code/artifact/323b83bd-f1cd-4cee-a5c7-945f8c7d6173), y **ninguna Sesión puede desviarse de ella sin una decisión registrada**.

## 📍 Punto de retoma

Último cierre integral publicado: `S11.1`, con código en `8d86bf6` → `2dbb714` y reconciliación documental posterior.
Candidato actual: `S5.13` 🔵 EN CURSO. Sus nueve Tareas están implementadas bajo Strict TDD focalizado; los checks dirigidos, una ejecución integral de `bun test`, el snapshot exacto y la entrega siguen pendientes.
**Evidencia focalizada:** `M5.13.1` 13/0, `M5.13.2` 147/0 y `M5.13.3` 13/0, más `test/delivery` 25/0; líneas authored por Módulo: 32, 52 y 91 (total técnico 175; diff completo trackeado 329). `review-reliability`: `typed-unavailable` porque no existe binding de lineage para la vista del candidato con RDD apagado. Engram: observación 9521.
`#1 de 13 → S5.13`: reemplaza la prioridad anterior de `S4.7` por decisión expresa del maintainer. Próximo checkpoint exacto: **checks dirigidos + una ejecución integral de `bun test` + snapshot exacto**. El wiring productivo `delivery-policy` → `CV_GRANT_DELIVERY` queda diferido a una Sesión futura todavía sin enumerar; `console/**` sigue prohibido.
Después siguen `S4.7`, `S4.4`, `S2.6`, `S5.14`, `S2.7`, `S4.6`, `S4.8`, `S4.9`, `S8.12`, `S5.5`, `S9.1` y `S7.1`; `S4.9` no gatea la primera release.

## 🎯 Cola de ejecución

`#1 S5.13` · `#2 S4.7` · `#3 S4.4` · `#4 S2.6` · `#5 S5.14` · `#6 S2.7` · `#7 S4.6` · `#8 S4.8` · `#9 S4.9` · `#10 S8.12` · `#11 S5.5` · `#12 S9.1` · `#13 S7.1` — reconciliada 2026-08-26 por la prioridad ratificada de `S5.13`. **Los IDs no se renumeran; las posiciones sí.** La posición es topológica; no vuelve ejecutable una dependencia pendiente.

La capacidad inmediata asignada es 1: `S5.13`. `S4.7` permanece listo, pero no corre en paralelo porque comparte `test/install/launch-worker-cli.test.mjs`; vuelve a `#2` cuando cierre `S5.13`. `S4.7` precede `S4.4` y `S4.8`; `S4.6` + `S4.7` preceden `S4.9`. La arista `S11.1 → S7.1` queda satisfecha, pero `S7.1` todavía espera `S4.4`, `S4.6`, `S4.8`, `S5.3`, `S5.5` y `S8.12`. `S4.9` no precede la primera release.

**Las tres Sesiones nuevas se ordenaron por conflicto, no por prioridad.** `S2.6`, `S5.14` y `S2.7` son graph-independent de todo lo que va debajo: si preferís correr `S4.6` antes, no se rompe nada. Lo que **sí** es obligatorio es `S5.13` → `S2.6` → `S5.14`, por los conflictos de abajo.

**Conflictos de capacidad:** `S4.7`↔`S4.6` (provider/install), `S4.7`↔`S8.12` (payload/tests install), `S4.7`↔`S5.13` (fixture launch-worker CLI), `S4.6`↔`S8.12` (install), y `S4.9` reclama en exclusiva el path global Herdr. **Nuevos:** `S5.13`↔`S2.6` (`test/contracts/schema.test.mjs` y `test/fixtures/contracts/schema-cases-v1.json`), `S5.13`↔`S5.14` (`schemas/delivery-policy-v1.schema.json` y `policy/delivery-policy.mjs`), y `S2.6`↔`S2.7` por prefijo en `test/contracts/**`. `S9.1` sigue sin `Área`/`Recurso` y no cuenta como capacidad segura.

**Fuera de la cola:** `S8.11` 🔴; `S8.5`/`S8.6`, `S1.17`–`S1.19` y `S9.4` 🟡; P6 🟡. Sin enumerar: wiring productivo `policy/delivery-policy.mjs` → `CV_GRANT_DELIVERY` (diferido por autoridad, sin ID ni alcance), lock huérfano de `main-store/store.mjs`, `enroll/**`, umbrales §14.3, macOS, y los Módulos/Tareas de `S2.7`.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 4/12 Planes cerrados (33%) · Sesiones cerradas en planes activos: 38/58 (66%). Cálculo auditable: P1 `16/19` + P4 `4/9` + P5 `11/14` + P7 `0/1` + P8 `7/11` + P9 `0/4` = `38/58`. P0, P3, P10 y P11 se excluyen porque están cerrados; P2 y P6 no tienen denominador derivable: P2 enumeró `S2.6` y `S2.7` el 2026-08-25, pero conserva cuatro responsabilidades de Change B sin ID, así que su denominador sigue sin cerrar.

**El denominador subió de 57 a 58 sin que se perdiera trabajo.** Es la tercera vez que pasa: al cerrar la Fase 2, con la Fase 3, y ahora con el segundo eje. Las tres veces por la misma causa —se enumeró trabajo que ya existía y que nadie contaba—, y las tres veces el porcentaje se movió en contra. Un porcentaje que subiera al aparecer trabajo nuevo sería el que está mintiendo.

**Regla de denominador ([decisión 57](decision-register.md)):** una Sesión sale del denominador **sólo si dejó de ser objetivo**. Diferido-con-intención se conserva —Pi, P6—; archivado-fuera-de-alcance se retira. Por eso `S8.7` salió de ambos lados del cociente de P8.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | — · `S1.17`–`S1.19` 🟡 DIFERIDO (Pi, segundo host) | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (Change B sin Sesiones enumeradas; cuatro responsabilidades ruteadas por el inventario) | — | Main | `S2.6` 🟢 (adopción del contrato de ejecución) · `S2.7` 📋 (alarma de deriva del vocabulario) | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 44% (4/9 S) | — | Main | `S4.7`, `S4.4`, `S4.6`, `S4.8`, `S4.9` | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 79% (11/14 S) | — | Main | `S5.13` 🔵 (checks dirigidos, una integral y snapshot exacto pendientes) · `S5.14` 📋 (profundidad de planificación) · `S5.5` 🟢 destrabada | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 🟡 DIFERIDO | — (sin Sesiones enumeradas) | — | Maintainer | — condicionado a probar la Torre en uso real | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | `S7.1` | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 64% (7/11 S) | — | Maintainer | `S8.12` 📋 (canal único) · `S8.11` 🔴 (costo, no producto) · `S8.5`, `S8.6` 🟡 DIFERIDO | [STATUS](plan-8/STATUS.md) |
| P9 | Asientos de trabajo y reciclado seguro | 🔵 EN CURSO | 0% (0/4 S) | — | Maintainer | `S9.1` 📋 (falta enumerar), `S9.2`, `S9.3` · `S9.4` 🟡 DIFERIDO (Pi) | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |
| P11 | Interfaz de operador | ✅ COMPLETO | 100% (1/1 S) | — | Maintainer | — | [STATUS](plan-11/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera trabajo que alguien puede empezar o destrabar, con su estado. **🟡 DIFERIDO no es trabajo pendiente**: es alcance pospuesto deliberadamente y con razón registrada, y se anota aparte para que no infle lo que resta. El `%` conserva las Sesiones diferidas en el denominador porque siguen siendo objetivo; sólo lo archivado-fuera-de-alcance sale.

## 🗂️ Planes archivados

Ninguno.
