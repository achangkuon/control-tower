# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-19 contra `master@c79866b`. La autoridad vigente es Moshi → Main → raíz primaria OpenCode con TUI adjunta no autoritativa; Herdr no pertenece al lifecycle crítico.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

**`S5.10` está ✅ COMPLETO** en `468b733`: el binding inmutable del trabajo independiente completado, con dos géneros estructuralmente disjuntos —opción enumerada o supuesto explícito, nunca ambos, nunca ninguno— bajo el writer, lock y transacción canónicos de Main. Suite **857 pass / 0 fail / 5.160 expectations**, desde 822. Los ocho criterios pasan.

El set **4R** volvió a cambiar el resultado, y esta vez encontró una **atribución falsa**. Tres de cuatro lentes coincidieron en que el binding nunca cruzaba el candidato contra la decisión que decía haberlo gobernado; la fixture entregada era ella misma un caso, ligando trabajo de `S5.1` a una decisión con alcance `S5.7`. Y R1 halló, sola, que el store no resolvía nada persistido: como los dos digests se computan offline, un caller MAIN obtenía un registro autoritativo para una opción nunca estacionada y nunca aprobada. R3 vio lo mismo y lo consideró un límite deliberado del "registro standalone"; el maintainer resolvió a favor de R1 en la **decisión 44**.

De ahí salió una **regla derivada aplicable a todo el repositorio**, anotada en el registro: derivar todo de artefactos que el caller suministra no equivale a evitar el caller assertion. Si los artefactos son forjables offline, la derivación es caller assertion con pasos intermedios. Es la causa raíz común de las decisiones 43 y 44.

P5 pasa a 9/12 S (75%). `S5.5` y `S4.4` quedan 🟢 LISTO, y la cola la encabeza `S4.4`. Sigue sin dueño ni Sesión la cláusula de §14.3 sobre defaults versionados de liveness, y `S5.2` conserva su corrección técnica pendiente.

**`S9.1` está 🔵 EN CURSO y BLOQUEADA por una decisión del maintainer.** Su planificación está completa —nueve Módulos, veintisiete Tareas, nueve commits directos secuenciales de ≤400 líneas— pero la ejecución va `1/9 M` y `3/27 T`. `M9.1.1` está congelado y el candidato terminal de `M9.1.2` **no está aceptado, ni es reutilizable, ni entregable**: quedó como evidencia de diagnóstico. La próxima acción exacta es `await-fresh-rewrite-authorization` — el maintainer debe autorizar por separado descartarlo y reescribirlo antes de un RED fresco. `S9.1` no reanuda hasta entonces. `S9.3` está 🔴 BLOQUEADA por autoridad de transporte.

**Deuda auditada y triada el mismo día.** Una auditoría de pendientes verificó cinco deudas técnicas contra el código, y la **decisión 46** las resolvió todas. Entregada: el piso de puerto loopback, acotado en cinco predicados con test de borde en cada uno (`1bc14d6`). Aceptadas como residuales documentados: el acoplamiento de expiración y el supuesto reclamable de `S5.10`. Pendiente de enumerar: una Sesión para los defaults de liveness versionados de §14.3. Y el lock huérfano de `withLock` —hallazgo 1 de los tres que bloquean `S5.2`, ubicado en `main-store/store.mjs:104-124`— se arreglará **dentro** de la segunda corrección de `S5.2`, de modo que **`S5.2`, `S5.3` y esa deuda esperan todas la misma autorización del maintainer**.

## 🎯 Cola de ejecución

`#1 S4.4` · `#2 S5.5` · `#3 S7.1` — recalculada 2026-08-19 tras cerrar `S5.10` y **corregida el mismo día**: la versión previa listaba `S5.3` en `#2`, pero `S5.3` espera `S5.2` integrada y `S5.2` está 🔴 BLOQUEADO, así que no era ejecutable. **Una Sesión entra en esta cola sólo si toda su cadena de dependencias está satisfecha.**

`S4.4` recupera la cabeza: la **decisión 45** del mismo día resolvió su último punto abierto —`recovery_epoch` y `host_epoch` son el mismo contador, y el plan quedó alineado a `host_epoch` en los dos planes y en la spec de capacidad que lo nombraba—, así que vuelve a 🟢 LISTO y decision-clean sin ganar alcance. `S5.5` sube a 🟢 LISTO porque `S5.10` quedó integrada, y es la única Sesión sin ninguna decisión previa pendiente. Pi/Intercom y S8.7 no integran esta cola.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 3/11 Planes cerrados (27%) · Sesiones cerradas en planes activos: 35/48 (73%). Cálculo auditable: P1 `16/19` + P4 `4/5` + P5 `9/12` + P7 `0/1` + P8 `6/8` + P9 `0/3` = `35/48`; el denominador subió de 47 a 48 porque `S9.3` quedó enumerada en el Plan 9; P10 se excluye porque cerró 3/3 S. P2 no tiene denominador derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | — · `S1.17`–`S1.19` 🟡 DIFERIDO (Pi/Intercom) | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 80% (4/5 S) | — | Main | `S4.4` 🟢 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 75% (9/12 S) | — | Main | `S5.5` 🟢 · `S5.2` 🔴 · `S5.3` 🔴 (espera `S5.2`) | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 75% (6/8 S) | — | Maintainer | — · `S8.5` y `S8.6` 🟡 DIFERIDO | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada y caché externa de Bun | 🔵 EN CURSO | 0% (0/3 S) | — | Maintainer | S9.1 (🔵, esperando autorización), S9.2, S9.3 | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera trabajo que alguien puede empezar o destrabar, con su estado. **🟡 DIFERIDO no es trabajo pendiente**: es alcance pospuesto deliberadamente y con razón registrada, y se anota aparte para que no infle lo que resta. El `%` sí conserva las Sesiones diferidas en el denominador, porque están enumeradas; por eso P1 y P8 no llegan al 100% aunque no les quede trabajo activo.

## 🗂️ Planes archivados

Ninguno.
