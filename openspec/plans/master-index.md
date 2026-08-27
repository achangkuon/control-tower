# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: **publicación de `S2.6`**. El candidato `c91fddd5c74019de2ef7d691a43d403558c3a92e` entró a `master` **byte-idéntico** —padre/base `99bab46036a1448ff7ebd9e6bbd1147964cda392`, tree `0040cd84b498d5953cd3c9eececbe65e46cf16d2`, verificado con `git merge-base --is-ancestor`—, y `f2d1a81` cerró su documentación. `origin/master` está en `f2d1a81`. Ya no queda ninguna publicación pendiente.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para el **inventario del producto** —los trece comandos, los módulos sin llamador y su orden de conexión— ver [inventario-de-producto](inventario-de-producto.md). Para **qué falta para salir** ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md). La línea entre lo que decide la Torre y lo que decide gentle-ai vive en [la frontera Torre ↔ gentle-ai](frontera-torre-gentle-ai.md), y **cualquier Sesión puede citarla para rechazar alcance** — desde el 2026-08-26 la frontera tiene **tres ejes**: la calidad del trabajo, el flujo de trabajo ([decisión 71](decision-register.md)) y **quién lee el plan** ([decisión 78](decision-register.md) — la cerca no lee). La **definición de producto vigente** —qué es y qué deliberadamente no va a ser la Torre terminada— es [**La Torre Terminada**](https://claude.ai/code/artifact/323b83bd-f1cd-4cee-a5c7-945f8c7d6173), y **ninguna Sesión puede desviarse de ella sin una decisión registrada**.

## 📍 Punto de retoma

**Pi-first vigente ([decisión 80](decision-register.md), 2026-08-27).** Empezar por `S4.10`, primer contrato host-neutral. OpenCode queda **parqueado con preservación absoluta**: nada de su código, pruebas, Sesiones, decisiones, checkpoints, evidencia o instrucciones de retoma se borra, invalida o archiva silenciosamente.

**No iniciar `S4.4` mientras OpenCode esté parqueado.** Queda 🟡 DIFERIDO y su checkpoint durable exacto permanece en [P4](plan-4/STATUS.md): rama `feat/plan-4/s4-4-same-host-recovery@75c378d`, commits `a00193c`/`75c378d` y reconciliación de base antes de RED.

Las decisiones 81–87 están resueltas explícitamente por el maintainer. `S8.12 + S8.13` completan conjuntamente la instalación: bundle Tower-specific primero; lifecycle, activación, rollback y preflight externo después. `S5.3` está ✅ COMPLETO y no integra la cola ejecutable.

## 🎯 Cola de ejecución

`#1 S4.10` · `#2 S8.12` · `#3 S4.11` · `#4 S9.4` · `#5 S1.17` · `#6 S1.18` · `#7 S1.19` · `#8 S4.12` · `#9 S8.13` · `#10 S5.14` · `#11 S2.8` · `#12 S5.5` · `#13 S5.15` · `#14 S9.1` · `#15 S9.2` · `#16 S9.3` · `#17 S7.1` — topológica, recalculada 2026-08-27. No asigna dueño ni asiento.

**Paralelismo:** `S8.12` es repo-only y puede comenzar junto a `S4.10` sólo si `Área` y `Recurso` reales siguen disjuntos. La cadena principal es `S4.10 → S4.11 → S9.4 → S1.17 → S1.18 → S1.19`; `S4.12` espera `S9.4 + S1.18`; `S8.13` espera `S8.12 + S1.19 + S4.12`; `S7.1` espera además `S5.5` y conserva sus dependencias no-host satisfechas.

**Fuera de la cola:** `S4.4`, `S4.8`, `S4.9`, `S8.5`, `S8.6` y P6 🟡 DIFERIDO; `S8.11` 🔴 BLOQUEADO. `S5.3` se excluye por ✅ COMPLETO. La cola contiene sólo Sesiones 🟢 LISTO o 📋 PLANIFICADO y preserva el orden del grafo.

## Granularidad

Plan → Sesión → Módulo → Tarea. **Sesión = alcance coherente de revisión que cabe en un PR.**
En este repositorio la entrega ocurre mediante uno o más commits directos secuenciales, cada uno independientemente verificable y revertible, de ≤400 líneas authored. Un commit no redefine la jerarquía. Si descomponer commits destruye la coherencia de una Sesión, se divide en dos Sesiones. El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 4/12 Planes cerrados (33%) · Sesiones cerradas en planes activos: 41/63 (65%). Cálculo auditable: P1 `16/19` + P4 `6/12` + P5 `12/15` + P7 `0/1` + P8 `7/12` + P9 `0/4` = `41/63`. P0, P3, P10 y P11 están cerrados. P2 y P6 conservan porcentaje `—`: P2 mantiene responsabilidades sin Sesión enumerada y P6 no tiene Sesiones enumeradas.

**El denominador de P5 subió de 14 a 15 sin que se perdiera trabajo**, al enumerar `S5.15` por la [decisión 78](decision-register.md). Es la misma causa de siempre —se enumeró trabajo que ya existía y que nadie contaba— y otra vez el porcentaje se movió en contra. En el mismo movimiento `S2.7` salió del alcance por quedarse sin sujeto, pero eso no toca el cociente: P2 nunca tuvo denominador derivable.

**Regla de denominador ([decisión 57](decision-register.md)):** una Sesión sale del denominador **sólo si dejó de ser objetivo**. Diferido-con-intención se conserva —Pi, P6—; archivado-fuera-de-alcance se retira. Por eso `S8.7` salió de ambos lados del cociente de P8.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | `S1.17`–`S1.19` 📋 (Pi-first; historia OpenCode preservada) | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (Change B sin Sesiones enumeradas; cuatro responsabilidades ruteadas por el inventario) | — | Main | `S2.8` 📋 (nombres SDD fuera del contrato de binding) · `S2.7` 📚 ARCHIVADA por la [decisión 78](decision-register.md) — sin lector copiado no hay deriva que vigilar | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 50% (6/12 S) | — | Main | `S4.10` 🟢; `S4.11`, `S4.12` 📋 · `S4.4`, `S4.8`, `S4.9` 🟡 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 80% (12/15 S) | — | Main | `S5.14` 🟢 (dependencia satisfecha; después de `S2.6`) · `S5.5` 🟢 destrabada y recortada · `S5.15` 📋 (la Torre deja de enumerar el plan) | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 🟡 DIFERIDO | — (sin Sesiones enumeradas) | — | Maintainer | — condicionado a probar la Torre en uso real | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | `S7.1` | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 58% (7/12 S) | — | Maintainer | `S8.12` 🟢 (bundle), `S8.13` 📋 (lifecycle/preflight) · `S8.11` 🔴 · `S8.5`, `S8.6` 🟡 | [STATUS](plan-8/STATUS.md) |
| P9 | Asientos de trabajo y reciclado seguro | 🔵 EN CURSO | 0% (0/4 S) | — | Maintainer | `S9.1`–`S9.4` 📋; contratos y migración preservados | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |
| P11 | Interfaz de operador | ✅ COMPLETO | 100% (1/1 S) | — | Maintainer | — | [STATUS](plan-11/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera trabajo que alguien puede empezar o destrabar, con su estado. **🟡 DIFERIDO no es trabajo pendiente**: es alcance pospuesto deliberadamente y con razón registrada, y se anota aparte para que no infle lo que resta. El `%` conserva las Sesiones diferidas en el denominador porque siguen siendo objetivo; sólo lo archivado-fuera-de-alcance sale.

## 🗂️ Planes archivados

Ninguno.
