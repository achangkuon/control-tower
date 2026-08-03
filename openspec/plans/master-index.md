# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-03 contra `f603c2c` + enumeración de `S3.3` y `S5.5` + implementación `3d2ef57`.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md).

## 📍 Punto de retoma

**Producto único desde el 2026-08-01.** Las etiquetas `installable-v1` y `autonomous-v2` dejan de ser identidades de producto: hay un solo roadmap y una sola primera versión. La decisión, su alcance y el grafo completo viven en [release-chain](release-chain.md). Los lanes sobreviven como afinidad de trabajo, y `CT_V2_ONLY` en `bin/torre:28` pasa a ser un flag de capacidad opt-in apagado por defecto — no se borra.

**La primera versión no se declara hasta que el maintainer pueda aprobar desde Telegram** las decisiones que requieren su autoridad, sobre un objetivo exacto y con sobre de un solo uso. Eso incorpora `sdd-tower-implementation-v1-requirements.md` §16–§17 al alcance que sale. Son **trece Sesiones** en una cadena casi lineal.

**`S8.8` sigue 🔵 EN CURSO y le queda un solo Módulo.** `M8.8.1` ✅ COMPLETO vía PR #132. **`M8.8.2` ✅ COMPLETO el 2026-08-03**: adopción real ejecutada por el maintainer. El activo pasó de `b72e450` a `34f56a61c1908c003dc382e661ae87335498fd99`, con `previous` preservado para rollback; la versión instalada tiene los **cinco** miembros del payload —`core.mjs` incluido, con digest idéntico al del repo— y `torre diagnose` devuelve `healthy:true, missing:[]`. **`M8.8.3` pasó de 🔴 BLOQUEADO a 🟢 LISTO**: su causa técnica era justamente el payload sin `core.mjs`, y ya no existe. **`M8.8.4` ✅ COMPLETO** en `3d2ef57` y **`M8.8.5` ✅ COMPLETO** en `34f56a6`.

**`M8.8.3` es un Módulo de código, no un comando atendido — no basta con autorizarlo (`6f18aa2`).** Verificado el 2026-08-03: `bin/torre` **nunca lee `active.json`** y `CORE` defaultea a `$HOME/.config/opencode/control-tower/core.mjs` **incluso en la versión instalada** (`bin/torre:20`). Copiar el entrypoint instalado a `~/.local/bin/` por lo tanto **no corta nada** —seguiría cargando el `core.mjs` legado— y un symlink rompe la resolución de `LIFECYCLE`, que usa `dirname "${BASH_SOURCE[0]}"`. El Módulo tiene que **construir el mecanismo** primero: que `CORE` y `LIFECYCLE` resuelvan desde el puntero activo en vez de rutas fijas, más una ruta de recuperación que no dependa del entrypoint que se está reemplazando. Cerrar `M8.8.2` destrabó el prerrequisito del payload, no el corte. La mitad implementable se enumeró como `M8.8.6`.

🔴 **Pero el runtime instalado no carga — verificado el 2026-08-03 ejecutándolo, no leyéndolo.** `bun ~/.local/share/control-tower/versions/34f56a6.../install/lifecycle.mjs diagnose` devuelve `Cannot find module './runtime-payload.mjs'`, porque `lifecycle.mjs:8` lo importa y no está en la versión instalada. La causa raíz: `RUNTIME_PAYLOAD_FILES` declara cinco miembros y **no se incluye a sí mismo**, así que el validador da por completo un payload que no arranca — y el `healthy:true` con el que se cerró `M8.8.2` se midió desde el checkout del repo, no desde la copia instalada. **`M8.8.3` sobre este runtime dejaba la Torre inoperable**, que es exactamente el modo de falla que su decisión `escala` advierte, con el validador confirmando que todo estaba bien. `M8.8.2` queda 🔴 REABIERTO y `M8.8.6` 🔴 BLOQUEADO. El arreglo —una línea más tests— está sin commitear en el worktree `v1`. Orden correcto: cerrar el contrato del payload → reinstalar → verificar `diagnose` **desde la copia instalada** → `M8.8.6` → `M8.8.3`.

**Freno de ejecución LEVANTADO el 2026-08-03**, con instrucción atendida del maintainer. Quedan habilitadas para arrancar: `S3.1` y la continuación de `S8.8`. `S0.3` ya está ✅ COMPLETO.

**`M8.8.5` ✅ COMPLETO — `diagnose` ya detecta el payload incompleto.** El chequeo de salud era `existsSync(<version>/.manifest)`: un archivo presente y nada más. Como el `.manifest` es un digest pelado que no enumera miembros, `torre diagnose` devolvía `healthy:true` sobre una versión sin `core.mjs` — un verde falso, y justo sobre el modo de falla que bloquea `M8.8.3`. Ahora `runCli` le pasa `RUNTIME_PAYLOAD_FILES` y el comando real devuelve `{"healthy":false,"missing":["core.mjs"]}`. `lifecycle()` sigue genérico: sin `expectedMembers` conserva la semántica anterior. **No adelanta `M8.8.2` ni `M8.8.3`.**

**`S8.8` es la primera Sesión con `Decisiones` declaradas** (`2191b42`), bajo la §11 del [estándar de planes](/home/emili/.claude/skills/_shared/plan-naming-convention.md). Dos decisiones resolvieron `derivable` con criterio verificable por `ls`; dos `escala` por operaciones irreversibles, una ya autorizada. Escribir el criterio de `M8.8.3` como **falsificable** es lo que obligó a comprobarlo contra el disco: la prosa registraba el bloqueo, pero no un test. Las once Sesiones restantes de la cadena todavía no tienen el campo.

**El bloqueo técnico previo a construir autorización quedó ✅ RESUELTO el 2026-08-03.** `schemas/authorization-v1.schema.json` y `main-store/store.mjs` ya coinciden: eran seis divergencias, no las dos registradas. El schema pasó a una forma agnóstica de la entrega (`action: MERGE`, binding `delivery` con `shape`), el store valida contra el schema en vez de contra un array escrito a mano, y se sumó `REJECTED` como estado terminal —el store no podía registrar un rechazo—. Detalle en [release-chain](release-chain.md). Se hizo como **prerrequisito, fuera del freno de ejecución**: era un contrato que dos archivos leían distinto, no trabajo nuevo de `S5.1`. La enmienda de `S0.3` ya está ✅ COMPLETA y la spec canónica permite que el puente transporte el callback acotado sin otorgarle autoridad.

**Los gates de V2 se partieron en seguridad y política el 2026-08-03 (`d232fdf`).** Es delta de especificación: **ninguna Sesión cambió de estado y los porcentajes de abajo no se mueven**. Lo que cambió es el contrato que `S3.2`, `S5.1`, `S5.2` y `S7.1` van a implementar. Los pisos de seguridad —sin mutación temprana, inmutabilidad del candidato congelado, ledger append-only, autoridad única de Main, sin autoasignación del worker— quedan fuera del alcance de cualquier configuración. Pasan a ser política declarada por proyecto: autorización de merge, forma de entrega, techo de planificación y profundidad del cierre documental, en el bloque `delivery-policy` de [`AGENTS.md`](../../AGENTS.md), con default fail-closed al valor más restrictivo. Un repo sin ese bloque se comporta igual que antes de que existiera.

Del mismo delta salen tres decisiones del loop: Support corre como **subagente nativo que Main lanza**, sin registro en la Torre ni elegibilidad de lock —lo que vuelve estructural la prohibición Support→Worker en vez de vigilada—; la delegación a subagentes con contexto aislado pasa a ser **capacidad de host requerida**, sin camino inline alternativo; y la derivación del siguiente Módulo lee la enumeración del plan por digest más el ledger inmutable `ct_delivery`/`ct_claim`, **nunca engram**, que hace upsert por `topic_key` y no está atado al contenido del repo. Eso mantiene la derivación correcta cuando el cierre de Módulo no toca documentación. Detalle en [`autonomous-v2-role-routed-continuation`](../changes/autonomous-v2-role-routed-continuation/).

`S5.1` quedó con forecast 380–500 líneas, en el borde de encadenado de 400: se decide en apply, no ahora.

**La cadena pasó de once a trece Sesiones el 2026-08-03, por enumeración, no por alcance nuevo.** `S3.3` (Agent Capability Registry) ya estaba declarada como dependencia de `S5.1` y `S5.2` en [`autonomous-v2-role-routed-continuation`](../changes/autonomous-v2-role-routed-continuation/tasks.md), pero no figuraba en ningún Plan ni en el grafo: el grafo decía `S3.2 → S5.1` y contradecía la dependencia declarada. Ahora está en `P3`. `S5.5` es nueva y cubre el hueco que faltaba para que la planificación sea **diferible**: registrar la decisión que no se puede derivar, declarar qué Sesiones quedan contaminadas, continuar sólo con las independientes y retomar desde el checkpoint exacto. `S7.1` pasa a depender de `S5.5` en vez de `S5.4` — verificar que el escalamiento sale no alcanza si la Torre igual se queda esperando la respuesta.

## Granularidad

Plan → Sesión (1 unidad entregable) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.config/opencode/skills/_shared/plan-naming-convention.md`.

**La Sesión se sigue definiendo por ALCANCE — el que entraría en un PR.** Lo que cambió el 2026-08-01 es el *mecanismo* de entrega, no el nivel: en este repo la unidad entregable es un **commit directo a `master` + push**, no un PR. Ver [Política de entrega](../../CLAUDE.md). La regla de overflow no se mueve: si una Sesión no entra en una unidad entregable, se parte en dos Sesiones o se encadenan sus Módulos — nunca se crea un nivel nuevo.

**La [regla de ejecución](v1-execution-rule.md) rige para las Sesiones de la cadena de release:** van de `tasks.md` directo a implementación, sin `exploration`/`proposal`/`design`, y el `STATUS` se actualiza en el mismo commit que el código. El ciclo SDD completo se reserva para cambios grandes o con incertidumbre arquitectónica real.

## 📊 Estado de un vistazo

**Avance global**: 1/9 Planes cerrados (11%) · Sesiones cerradas en planes activos: 22/45 (49%)

> El denominador pasó de 43 a 45 el 2026-08-03: se enumeraron `S3.3` en P3 y `S5.5` en P5. Antes había pasado de 39 a 43 por las 2 Sesiones ya cerradas de P0 —que volvió a contar como Plan activo— más `S0.3` y `S5.4`, enumeradas el 2026-08-01.
> **El porcentaje bajó de 51% a 49% sin que nada se rompiera.** Enumerar trabajo que ya existía pero no estaba contado mueve el denominador, no el avance. Un porcentaje que sólo sube es un porcentaje que miente.
> P0 volvió a cerrar el 2026-08-01 con `S0.3` (`9595b92`), así que los Planes cerrados vuelven a 1. Reabrir y cerrar un Plan es normal cuando cambia la decisión de producto que ese Plan documenta.
> **Ninguno de estos porcentajes mide qué falta para salir.** Para eso está [release-chain](release-chain.md): **13 Sesiones**, de las cuales 1 cerrada.
>
> **La tabla de abajo está ordenada por ID, y el ID no es un orden de ejecución.** Es un nombre posicional: `P8` no va después de `P7`, y `P0` no es el primer paso. El orden lo dicta el grafo, no el número — ver [release-chain](release-chain.md).
>
> **En la cadena de release:** P0 ✅, P3, P4, P5, P7, P8 (`S8.7`, `S8.8`).
> **Fuera de la cadena** — no bloquean la primera versión: P1 (ningún Plan de la cadena lo declara dependencia), el resto sin enumerar de P2, y P6.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | 🟢 LISTO | 0% (0/3 S) | — | Main | S3.1, S3.2, S3.3 | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 📋 PLANIFICADO | 0% (0/1 S) | — | Main | S4.1 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 📋 PLANIFICADO | 0% (0/5 S) | — | Main | S5.1, S5.2, S5.3, S5.4, S5.5 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 50% (4/8 S) | — | Maintainer | S8.8, S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
