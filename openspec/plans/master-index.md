# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-19 contra `master@49c23aa`. La autoridad vigente es Moshi → Main → raíz primaria OpenCode con TUI adjunta no autoritativa; Herdr no pertenece al lifecycle crítico.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

**`S5.10` está ✅ COMPLETO** en `468b733`: el binding inmutable del trabajo independiente completado, con dos géneros estructuralmente disjuntos —opción enumerada o supuesto explícito, nunca ambos, nunca ninguno— bajo el writer, lock y transacción canónicos de Main. Suite **857 pass / 0 fail / 5.160 expectations**, desde 822. Los ocho criterios pasan.

El set **4R** volvió a cambiar el resultado, y esta vez encontró una **atribución falsa**. Tres de cuatro lentes coincidieron en que el binding nunca cruzaba el candidato contra la decisión que decía haberlo gobernado; la fixture entregada era ella misma un caso, ligando trabajo de `S5.1` a una decisión con alcance `S5.7`. Y R1 halló, sola, que el store no resolvía nada persistido: como los dos digests se computan offline, un caller MAIN obtenía un registro autoritativo para una opción nunca estacionada y nunca aprobada. R3 vio lo mismo y lo consideró un límite deliberado del "registro standalone"; el maintainer resolvió a favor de R1 en la **decisión 44**.

De ahí salió una **regla derivada aplicable a todo el repositorio**, anotada en el registro: derivar todo de artefactos que el caller suministra no equivale a evitar el caller assertion. Si los artefactos son forjables offline, la derivación es caller assertion con pasos intermedios. Es la causa raíz común de las decisiones 43 y 44.

P5 pasa a 9/12 S (75%). `S5.5` y `S4.4` quedan 🟢 LISTO, y la cola la encabeza `S4.4`. Sigue sin dueño ni Sesión la cláusula de §14.3 sobre defaults versionados de liveness, y `S5.2` conserva su corrección técnica pendiente.

**P9 quedó decision-clean el 2026-08-20 y ganó una Sesión.** Cinco decisiones (49–53) cerraron todo lo que en P9 esperaba al maintainer. Dos hallazgos cambiaron el tablero. **Primero:** `M9.1.1` estaba declarado `✅ COMPLETO` y congelado, y **su código nunca llegó a `master`** — el interlock de `jornada.sh` y `test/jornada/reciclar.test.mjs` viven sólo en `4e6b5af` sobre `work/s9-1-planning-20260817`. En `master`, `jornada.sh --reciclar` está completo y operativo, y entregar el interlock tal cual **apagaría una herramienta que el maintainer usa a mano**. La decisión 50 lo reabrió: el avance operacional de `S9.1` baja de `1/9 M` a `0/9 M`. **Segundo:** la capa de asientos que el maintainer diseñó ese día —pool fijo con nombres permanentes, rol viajando en la asignación, rotación de rama— **no estaba en ningún Módulo de P9**, que es todo mecanismo de mutación segura. La decisión 51 la enumeró como `S9.4`. La premisa ya estaba en el producto: `core.mjs:4328-4331` identifica un worktree por su path y nunca por su rama, y `assignment-v1` ya separa `path`, `branch` y `base_sha` — la capa no rompe contratos, los usa.

El candidato terminal de `M9.1.2` fue localizado y verificado byte a byte: sus dos hashes coinciden con los registrados. Es un inspector cuyas salidas son **todas** `UNSAFE` porque su veredicto vivía en `M9.1.4`/`M9.1.5`, nunca escritos. La decisión 49 conserva los bytes como evidencia en su rama y ordena un RED fresco. La decisión 52 eligió el transporte de `S9.3` —ejecutable con autoridad atada al arranque— y la 53 cerró la caché de Bun de `S9.2`. **Próxima acción exacta:** rediseñar `M9.1.1` bajo la decisión 52, y decidir el tamaño del pool de `S9.4`, que es la única `escala` que P9 deja abierta.

**Deuda auditada y triada el mismo día.** Una auditoría de pendientes verificó cinco deudas técnicas contra el código, y la **decisión 46** las resolvió todas. Entregada: el piso de puerto loopback, acotado en cinco predicados con test de borde en cada uno (`1bc14d6`). Aceptadas como residuales documentados: el acoplamiento de expiración y el supuesto reclamable de `S5.10`. Pendiente de enumerar: una Sesión para los defaults de liveness versionados de §14.3. **Corregido el mismo día:** la auditoría atribuyó el hallazgo 1 de `S5.2` al `withLock` de `main-store/store.mjs`, y era falso —ese archivo está en el `Prohibido` de la Sesión—. El hallazgo 1 vive en `delivery/ledger.mjs`, dentro del `Área`. El lock huérfano de `main-store/store.mjs:104-124` es un defecto **real y distinto**, hallado por la lente R4 de `S5.10`, y **vuelve a quedar sin resolución**: cerrar `S5.2` ya no lo cierra. La decisión 47 autorizó la segunda corrección de `S5.2`, que pasa a 🟢 LISTO.

**Brecha 6 re-medida el 2026-08-20 — la causa no era la que decía el plan.** El instalable **no está roto**: sus 18 archivos son import-closed y forman un producto coherente de 6.260 líneas que funciona. Lo medido es más grave y más simple: **ninguno de los 53 archivos no instalados es importado por el producto instalado — cero**, y 26 de ellos no tienen ningún importador fuera de sus tests. Son **dos productos en un repositorio sin un solo import compartido**. Corolario operativo: agregar esos archivos a `RUNTIME_PAYLOAD_FILES` **no cambiaría nada** — se instalaría código muerto; la lista blanca es el síntoma y la falta de cableado es la causa. Corregido además el dato de origen que este índice, `implementation-state` y `plan-8/STATUS.md:313` repetían: `scanClosure` admite **cinco** directorios (`bin`, `hosts`, `install`, `jornada`, `main-store`), y el filtro real es **igualdad exacta de conjunto**, no una lista de permitidos. Prueba de que la lista a mano ya derivó: `hosts/launcher.mjs` se instala y no lo importa nadie. **Arreglo de fondo propuesto, sin dueño todavía:** derivar la lista del cierre de imports desde las raíces reales de `bin/torre` — medido, da los mismos archivos menos el muerto. **Orden registrado: primero cablear, después enviar.** Detalle en [implementation-state](implementation-state.md).

**Bloqueo de Mac medido el 2026-08-20 — uno solo, estructural.** `hosts/production-provider.mjs:120` rechaza toda plataforma que no sea Linux con procfs, y no es una ruta que se adapte: las líneas 142 y 151 ejecutan `/proc/self/fd/3`, es decir un **descriptor ya abierto y verificado**, para garantizar que los bytes comprobados son los ejecutados. macOS no tiene `/proc` y Node no expone el equivalente. El resto del payload sí es portable (`O_NOFOLLOW` existe en BSD). Es un archivo, un mecanismo y una decisión de seguridad propia; no bloquea nada hoy y queda sin enumerar.

## 🎯 Cola de ejecución

`#1 S5.2` · `#2 S4.4` · `#3 S5.5` · `#4 S7.1` — recalculada 2026-08-19 tras cerrar `S5.10` y **corregida el mismo día**: la versión previa listaba `S5.3` en `#2`, pero `S5.3` espera `S5.2` integrada y `S5.2` está 🔴 BLOQUEADO, así que no era ejecutable. **Una Sesión entra en esta cola sólo si toda su cadena de dependencias está satisfecha.**

`S5.2` encabeza porque su cierre destraba `S5.3`, que lleva bloqueada detrás de ella desde el principio, y porque su candidato ya existe y sólo espera tres correcciones acotadas. `S4.4` la sigue: la **decisión 45** del mismo día resolvió su último punto abierto —`recovery_epoch` y `host_epoch` son el mismo contador, y el plan quedó alineado a `host_epoch` en los dos planes y en la spec de capacidad que lo nombraba—, así que vuelve a 🟢 LISTO y decision-clean sin ganar alcance. `S5.5` sube a 🟢 LISTO porque `S5.10` quedó integrada, y es la única Sesión sin ninguna decisión previa pendiente. Pi/Intercom y S8.7 no integran esta cola.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 3/11 Planes cerrados (27%) · Sesiones cerradas en planes activos: 35/49 (71%). Cálculo auditable: P1 `16/19` + P4 `4/5` + P5 `9/12` + P7 `0/1` + P8 `6/8` + P9 `0/4` = `35/49`; el denominador subió de 48 a 49 el 2026-08-20 porque la **decisión 51** enumeró `S9.4` en el Plan 9; P10 se excluye porque cerró 3/3 S. P2 no tiene denominador derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔵 EN CURSO | 84% (16/19 S) | — | Main | — · `S1.17`–`S1.19` 🟡 DIFERIDO (Pi/Intercom) | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 80% (4/5 S) | — | Main | `S4.4` 🟢 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 75% (9/12 S) | — | Main | `S5.2` 🟢 · `S5.5` 🟢 · `S5.3` 🔴 (espera `S5.2`) | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 75% (6/8 S) | — | Maintainer | — · `S8.5` y `S8.6` 🟡 DIFERIDO | [STATUS](plan-8/STATUS.md) |
| P9 | Slots seguros de Jornada, caché externa de Bun y pool de asientos | 🔵 EN CURSO | 0% (0/4 S) | — | Maintainer | S9.1 (🔵, decision-clean, `0/9 M`), S9.2, S9.3 (falta enumerar Área/Recurso/Módulos), S9.4 (nueva, falta enumerar y decidir tamaño del pool) | [STATUS](plan-9/STATUS.md) |
| P10 | Ejecución y supervisión autónoma de Jornada | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-10/STATUS.md) |

> **Cómo leer `Qué falta`.** Enumera trabajo que alguien puede empezar o destrabar, con su estado. **🟡 DIFERIDO no es trabajo pendiente**: es alcance pospuesto deliberadamente y con razón registrada, y se anota aparte para que no infle lo que resta. El `%` sí conserva las Sesiones diferidas en el denominador, porque están enumeradas; por eso P1 y P8 no llegan al 100% aunque no les quede trabajo activo.

## 🗂️ Planes archivados

Ninguno.
