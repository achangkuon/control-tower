# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación post-push: el traspaso de asientos a Pi quedó en `origin/master@d044fc4`, tras `M9.4.2` en `696f500` con su cierre documental en `6443945d75107ee3466fd4f0a8230d85530ad08e` y `M9.4.1` en `9f29f20`, todo verificado mediante readback remoto (`HEAD` = `origin/master`, árbol limpio). Antes, `S9.1` en `56753b4` con su cierre en `d7be093e7edf0fa50d87665911bf369db04eb80c`. La topología de asientos con enforcement y `torre asiento` permanecen publicadas dentro de `6c79223d66a693c20b530048e21056f8a6193be8`, y la migración proporcional de P6 (`2b03af7d0818b46ce592142b1a7925282d63b796`) y P1 (`88890e32edffe24cdf2262eedd7eb5deef25f267`) dentro de `92dfeba070f33ddd678461e57eca4375e7dd8283`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para el **inventario del producto** —los trece comandos, los módulos sin llamador y su orden de conexión— ver [inventario-de-producto](inventario-de-producto.md). Para **qué falta para salir** ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md). La línea entre lo que decide la Torre y lo que decide gentle-ai vive en [la frontera Torre ↔ gentle-ai](frontera-torre-gentle-ai.md), y **cualquier Sesión puede citarla para rechazar alcance** — desde el 2026-08-26 la frontera tiene **tres ejes**: la calidad del trabajo, el flujo de trabajo ([decisión 71](decision-register.md)) y **quién lee el plan** ([decisión 78](decision-register.md) — la cerca no lee). La **definición de producto vigente** —qué es y qué deliberadamente no va a ser la Torre terminada— es [**La Torre Terminada**](https://claude.ai/code/artifact/323b83bd-f1cd-4cee-a5c7-945f8c7d6173), y **ninguna Sesión puede desviarse de ella sin una decisión registrada**.

## 📍 Punto de retoma

**`S12.2` cerró y `M12.6.1` entregó; `S12.3` se intentó y quedó 🔴 BLOQUEADA por una causa estructural que reencuadra la auditoría.** `core.mjs` **no se puede partir todavía**: tres consumidores lo tratan como archivo único y autocontenido —el payload valida por allowlist exacta (`install/runtime-payload.mjs:7,71`), el arnés de identidad copia sólo ese archivo (`test/identity.test.mjs`), y el CLI de launch-worker instalado lo instala solo (`test/install/launch-worker-cli.test.mjs:52`)—. La mudanza en sí era correcta: la migración 001 salió con las cinco firmas SHA-256 idénticas, pero la suite cayó a 1022/4. Todo revertido, `core.mjs` intacto en 4.646. **La maquinaria de entrega premia el archivo único, y por eso creció.** Con `S12.3` salieron de la cola `S12.4`, `S12.5` y `S12.6`.

**La mitad del desbloqueo ya tiene dueño:** `T8.10.1.3` de `S8.10` es exactamente derivar prefijos de directorio desde `RUNTIME_PAYLOAD_FILES` (`plan-8/STATUS.md:632,649`). **La otra mitad espera decisión del maintainer**: desacoplar los dos arneses toca `test/identity.test.mjs`, que está en el `Área` exclusiva de `S12.8`. La forma recomendada es una Sesión nueva que dependa de `S12.8`, no ampliar la Sesión en vuelo de Pi.

**Pi está trabajando `S12.8`** en el asiento temporal `s12-8-pi`, rama `fix/s12.8-aislamiento-suite-pi`. Nació del incidente de esta jornada: correr la suite desde un hook de git **escribe en el repositorio real** —dejó commits `fixture` en la rama viva, tres worktrees fantasma y `core.bare=true` en la config compartida—. Todo reparado el mismo día y verificado: `origin/master`, `master` local y las seis ramas de los otros asientos quedaron intactas.

**Entregado hoy, ocho commits de `cb227f8` a `08a99af`, cada uno con la suite verificada antes de pushear:** P12 enumerado; `ROADMAP.md` de 235 a 135 líneas conservando textual el diseño del avance automático; respaldo `core.mjs.bak` retirado; cambio de Telegram archivado (cola activa 14 → 13); supersesión marcada en los planes sin reescribir un registro; `host/` fusionado en `hosts/` (carpetas de primer nivel 26 → 25). P12 en 11% (1/9 S), global 48/75.

**Dos decisiones abiertas del maintainer:** el ruteo de los arneses, y si `S12.9` mantiene la opción A —avanzar la revisión, cuyo costo real resultó ser **34 pins de digest en 10 archivos**, no tres— o pasa a la C, respetar el sellado. Dos ramas estacionadas conservan trabajo terminado: `parked/s12.1-gate` y `parked/s12.2-docs-congelados`.

**La Torre está APAGADA** mientras se implemente sobre ella. Capacidad: 0 asientos del pool.

## 🎯 Cola de ejecución

`#1 S9.4` · `#2 S12.8` · `#3 S12.9` · `#4 S12.1` · `#5 S1.17` · `#6 S1.18` · `#7 S8.12` · `#8 S9.5` · `#9 S1.19` · `#10 S4.12` · `#11 S8.13` · `#12 S5.14` · `#13 S5.5` · `#14 S5.15` · `#15 S9.2` · `#16 S9.3` · `#17 S7.1` — topológica, recalculada 2026-08-30 al bloquear `S12.3`. La cola no asigna dueño ni asiento.

**Paralelismo:** `S12.8` (`test/**`) y `S12.2` (documentación) son disjuntas en grafo, `Área` y `Recurso`: corren juntas hoy. `S12.1` espera a `S12.8`; desde `S12.3` la cadena de P12 se serializa sobre **`core.mjs` en exclusiva**. Se preserva el orden previo: `S1.18` habilita `S8.12`; `S9.5` conserva `S8.12 + S9.4`; `S4.12` espera `S9.4 + S1.18`; `S8.13` espera `S8.12 + S1.19 + S4.12`; `S7.1` espera `S1.19 + S4.12 + S8.13 + S5.5`.

**Fuera de la cola:** `S4.4`, `S4.8`, `S8.5`, `S8.6`, `S12.7` y P6 🟡 DIFERIDO; `S8.11` y `S12.3` 🔴 BLOQUEADO, y con `S12.3` salen `S12.4`, `S12.5` y `S12.6`, que dependen de ella. `S2.8`, `S4.10`, `S4.11`, `S4.13`, `S4.14`, `S5.3`, `S8.14` y `S12.2` se excluyen por ✅ COMPLETO; `S4.9` y `S8.7` por 📚 ARCHIVADO.

## Granularidad

Plan → Sesión → Módulo → Tarea. **Sesión = alcance coherente de revisión que cabe en un PR.**
En este repositorio la entrega ocurre mediante uno o más commits directos secuenciales, cada uno independientemente verificable y revertible, de ≤400 líneas authored. Un commit no redefine la jerarquía. Si descomponer commits destruye la coherencia de una Sesión, se divide en dos Sesiones. El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 4/13 Planes cerrados (31%) · Sesiones cerradas en planes activos con denominador derivable: 48/75 (64%). Cálculo auditable: P1 `16/19` + P4 `10/13` + P5 `12/15` + P7 `0/1` + P8 `8/13` + P9 `1/5` + P12 `1/9` = `48/75`. P0, P3, P10 y P11 están cerrados. P2 y P6 conservan porcentaje `—`: cerrar `S2.8` no incorpora P2 al cálculo porque cuatro responsabilidades siguen sin Sesión enumerada; P6 no tiene Sesiones enumeradas.

**P12 agrega 7 Sesiones al denominador global y ninguna cerrada**, así que el porcentaje global baja de 71% a 64% sin que se haya perdido ni un trabajo entregado. Es el mismo movimiento de siempre: se enumeró trabajo que ya existía —el desorden del repositorio— y que nadie contaba. Un porcentaje que sube al enumerar sería la señal de que el denominador está mintiendo.

**El denominador de P5 subió de 14 a 15 sin que se perdiera trabajo**, al enumerar `S5.15` por la [decisión 78](decision-register.md). Es la misma causa de siempre —se enumeró trabajo que ya existía y que nadie contaba— y otra vez el porcentaje se movió en contra. En el mismo movimiento `S2.7` salió del alcance por quedarse sin sujeto, pero eso no toca el cociente: P2 nunca tuvo denominador derivable.

**Regla de denominador ([decisión 57](decision-register.md)):** una Sesión sale del denominador **sólo si dejó de ser objetivo**. Diferido-con-intención se conserva —Pi, P6—; archivado-fuera-de-alcance se retira. Por eso `S8.7` salió de ambos lados del cociente de P8, y por eso `S4.9` salió del de P4 el 2026-08-29 ([decisión 99](decision-register.md)): la adopción de Herdr `0.8.2` ocurrió fuera del plan y la Sesión se quedó sin sujeto. **El denominador de P4 bajó de 14 a 13 y el porcentaje subió sin que se entregara trabajo nuevo** — es el movimiento inverso al de P5, y por eso se registra su causa: se retiró un objetivo, no se cerró una Sesión.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | `S1.17`–`S1.19` | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (Change B sin Sesiones enumeradas; cuatro responsabilidades ruteadas por el inventario) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 77% (10/13 S) | — | Main | `S4.12` | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 80% (12/15 S) | — | Main | `S5.5`, `S5.14`, `S5.15` | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 🟡 DIFERIDO | — (sin Sesiones enumeradas) | — | Maintainer | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | `S7.1` | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 62% (8/13 S) | — | Maintainer | `S8.11`–`S8.13` | [STATUS](plan-8/STATUS.md) |
| P9 | Asientos de trabajo y reciclado seguro | 🔵 EN CURSO | 20% (1/5 S) | — | Maintainer | `S9.2`–`S9.5` | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |
| P11 | Interfaz de operador | ✅ COMPLETO | 100% (1/1 S) | — | Maintainer | — | [STATUS](plan-11/STATUS.md) |
| P12 | Orden estructural del repositorio | 🔵 EN CURSO | 11% (1/9 S) | 50h | Maintainer | `S12.8`, `S12.9`, `S12.1`; `S12.3`–`S12.6` 🔴 | [STATUS](plan-12/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera sólo IDs de Sesiones pendientes; el estado y el detalle pertenecen al `STATUS.md` de cada Plan. **🟡 DIFERIDO no es trabajo pendiente** y no aparece en esa columna. El `%` conserva las Sesiones diferidas en el denominador porque siguen siendo objetivo; sólo lo archivado-fuera-de-alcance sale.

## 🗂️ Planes archivados

Ninguno.
