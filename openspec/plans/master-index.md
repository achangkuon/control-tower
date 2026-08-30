# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación post-push: `M9.4.1` de `S9.4` fue publicada en `origin/master@9f29f20` y su cierre documental en `4fd5b2e3b56755b48fea7a98eeca57635e364b63`, ambos verificados mediante readback remoto (`HEAD` = `origin/master`, árbol limpio). Antes, `S9.1` en `56753b4` con su cierre en `d7be093e7edf0fa50d87665911bf369db04eb80c`. La topología de asientos con enforcement y `torre asiento` permanecen publicadas dentro de `6c79223d66a693c20b530048e21056f8a6193be8`, y la migración proporcional de P6 (`2b03af7d0818b46ce592142b1a7925282d63b796`) y P1 (`88890e32edffe24cdf2262eedd7eb5deef25f267`) dentro de `92dfeba070f33ddd678461e57eca4375e7dd8283`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para el **inventario del producto** —los trece comandos, los módulos sin llamador y su orden de conexión— ver [inventario-de-producto](inventario-de-producto.md). Para **qué falta para salir** ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md). La línea entre lo que decide la Torre y lo que decide gentle-ai vive en [la frontera Torre ↔ gentle-ai](frontera-torre-gentle-ai.md), y **cualquier Sesión puede citarla para rechazar alcance** — desde el 2026-08-26 la frontera tiene **tres ejes**: la calidad del trabajo, el flujo de trabajo ([decisión 71](decision-register.md)) y **quién lee el plan** ([decisión 78](decision-register.md) — la cerca no lee). La **definición de producto vigente** —qué es y qué deliberadamente no va a ser la Torre terminada— es [**La Torre Terminada**](https://claude.ai/code/artifact/323b83bd-f1cd-4cee-a5c7-945f8c7d6173), y **ninguna Sesión puede desviarse de ella sin una decisión registrada**.

## 📍 Punto de retoma

**`S9.4` está desbloqueada y en curso: su gate de brief fresco quedó satisfecho y `M9.4.1` cerró.** El brief de Support (Engram 9891) se emitió contra la base canónica `fb80de2` recalculando dependencias, `Área`, `Recurso` y riesgos, y `M9.4.1` —verificador de binding exacto a través de fronteras async— fue publicado en `origin/master@9f29f20`. Suite completa **1006 pass / 0 fail**. Queda `M9.4.2`, el supervisor de ruta pura con adquisición broker-first.

**El brief verificó el enganche que más importaba:** `createHostRuntimeOwnership({ acquireAtReservation })` es inyectable, así que el contrato de `S9.4` —`broker.start` corriendo dentro de `S4.10 acquireAtReservation`— es alcanzable sobre la base entregada **sin tocar `S4.10`**. También confirmó que el guard de `S4.14` no absorbió trabajo de `S9.4`: es síncrono y previo a publish, mientras `M9.4.1` cubre fronteras async.

**Capacidad viva: 1 asiento.** `implementer-2` está limpio y asignable; `implementer-1` e `implementer-3` conservan evidencia congelada de los intentos previos de `S9.4` y **no fueron consumidos, rebasados ni corregidos**, tal como exige el contrato. Alcanza, porque `M9.4.2` depende de `M9.4.1` y son secuenciales.

**Dos límites declarados de este tramo.** El brief lo produjo la misma sesión Claude actuando como Main, no un Support independiente —el asiento `support-agent` está 5 commits atrasado y leer desde ahí habría dado un brief equivocado—; el maintainer aceptó esa independencia reducida a cambio de velocidad y queda registrado, no implícito. Y la implementación corrió en `Main` sobre `master`, consistente con la política de entrega de este repo (commit directo, sin PR) y con el resto de la jornada.

**`S9.1` cerró antes en la misma jornada**, llevando P9 a **20% (1/5 S)** y el global a **47/66 Sesiones (71%)**. La topología de asientos había dejado de ser prosa en `6c79223`. La regla de temporales sigue enforced: fuera de `implementer-1/2/3` y `support-agent`, todo worktree nace temporal y su descarte nunca es automático.

**Pi sigue siendo el primer host.** Pi 0.84.4 está instalado pero `S9.4` no lo necesita vivo: sus pruebas inyectan todos los puertos. OpenCode y Claude permanecen diferidos. Las responsabilidades legacy siguen reconciliadas: P9 legacy en `P8/S8.5` 🟡 DIFERIDO; P10 con traza en `S8.2`/`S8.8` y remanente `S8.12 → S8.13`; P11 repartida entre `S1.19`, `S7.1` y `S8.13`. La próxima unidad documental proporcional sigue siendo P4, sin writer asignado.

**Capacidad asignable inmediata: 1** (`implementer-2`), reservada para continuar `M9.4.2`.

## 🎯 Cola de ejecución

`#1 S9.4` · `#2 S1.17` · `#3 S1.18` · `#4 S8.12` · `#5 S9.5` · `#6 S1.19` · `#7 S4.12` · `#8 S8.13` · `#9 S5.14` · `#10 S5.5` · `#11 S5.15` · `#12 S9.2` · `#13 S9.3` · `#14 S7.1` — topológica, recalculada 2026-08-30 tras cerrar `S9.1`. La cola no asigna dueño ni asiento.

**Paralelismo:** capacidad asignable inmediata **0** hasta recibir los briefs frescos requeridos; no hay worker asignado y ningún estado parcial cuenta como capacidad. Se preserva el orden previo: `S1.18` habilita `S8.12`; `S9.5` conserva `S8.12 + S9.4`; `S4.12` espera `S9.4 + S1.18`; `S8.13` espera `S8.12 + S1.19 + S4.12`; `S7.1` espera `S1.19 + S4.12 + S8.13 + S5.5`.

**Fuera de la cola:** `S4.4`, `S4.8`, `S8.5`, `S8.6` y P6 🟡 DIFERIDO; `S8.11` 🔴 BLOQUEADO. `S2.8`, `S4.10`, `S4.11`, `S4.13`, `S4.14`, `S5.3` y `S8.14` se excluyen por ✅ COMPLETO; `S4.9` y `S8.7` por 📚 ARCHIVADO. La cola contiene sólo Sesiones 🟢 LISTO o 📋 PLANIFICADO y preserva el orden del grafo.

## Granularidad

Plan → Sesión → Módulo → Tarea. **Sesión = alcance coherente de revisión que cabe en un PR.**
En este repositorio la entrega ocurre mediante uno o más commits directos secuenciales, cada uno independientemente verificable y revertible, de ≤400 líneas authored. Un commit no redefine la jerarquía. Si descomponer commits destruye la coherencia de una Sesión, se divide en dos Sesiones. El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 4/12 Planes cerrados (33%) · Sesiones cerradas en planes activos con denominador derivable: 47/66 (71%). Cálculo auditable: P1 `16/19` + P4 `10/13` + P5 `12/15` + P7 `0/1` + P8 `8/13` + P9 `1/5` = `47/66`. P0, P3, P10 y P11 están cerrados. P2 y P6 conservan porcentaje `—`: cerrar `S2.8` no incorpora P2 al cálculo porque cuatro responsabilidades siguen sin Sesión enumerada; P6 no tiene Sesiones enumeradas.

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

> **Cómo leer `Qué falta`.** Enumera sólo IDs de Sesiones pendientes; el estado y el detalle pertenecen al `STATUS.md` de cada Plan. **🟡 DIFERIDO no es trabajo pendiente** y no aparece en esa columna. El `%` conserva las Sesiones diferidas en el denominador porque siguen siendo objetivo; sólo lo archivado-fuera-de-alcance sale.

## 🗂️ Planes archivados

Ninguno.
