# Inventario de producto — Control Tower

> **Este es el documento que faltaba.** La auditoría del 2026-08-21 encontró que el PRD define
> qué debe **hacer** el producto —problema, objetivo, alcance, usuario, experiencia, `F1`–`F8`,
> reglas, métricas, riesgos— y **nunca enumera de qué está hecho**. Sin inventario, los Planes
> descomponen comportamiento y nadie es dueño del conjunto: por eso un módulo puede quedar
> completo, probado y sin llamador sin violar ningún criterio.
>
> Medido el 2026-08-21 sobre `master@90b84f8` por cierre transitivo de imports.
> Regenerable; las cifras no se escriben a mano.

## 1. La autoridad de alcance

**`console/vocabulary.mjs` es la fuente de verdad del alcance del producto** ([decisión 58](decision-register.md)).
Declara trece comandos con clase de riesgo, estados legales, argumentos requeridos y evidencia
exigida. Es la única definición del alcance que una máquina puede verificar.

**Regla:** si un comando no está en `COMMAND_VOCABULARY`, no es producto. Si está y no tiene
implementación conectada, es trabajo pendiente y el inventario lo nombra.

| Comando | Riesgo | Qué le pedís a la Torre | Implementación | Superficie de operador |
|---|---|---|---|---|
| `CV_STATUS` | R0 | Qué está pasando ahora | `core.status()` | ✅ `torre` y `tower_status` |
| `CV_INSPECT` | R0 | Mirar un agente en particular | `hosts/inspect.mjs`, `health.mjs` — huérfanos | ❌ |
| `CV_REQUEST_CONTEXT` | R0 | Pedirle contexto a un agente | `core.send()` | ❌ sólo agente↔agente |
| `CV_ASSIGN` | R1 | Asignarle trabajo a un agente | — | ❌ |
| `CV_PAUSE` | R1 | Frenar un agente | `core.setState` | ❌ ver §2 |
| `CV_RESUME` | R1 | Reanudarlo | `core.setState` | ❌ ver §2 |
| `CV_RUN_TESTS` | R1 | Correr la suite en un agente | — | ❌ |
| `CV_GRANT_DELIVERY` | R1 | Darle el turno de entrega | `core.acquire/transfer` | ❌ |
| `CV_HOLD_DELIVERY` | R1 | Retener la entrega | — | ❌ |
| `CV_STOP_DELIVERY` | R1 | Cortarla | `delivery/**` — huérfano | ❌ |
| `CV_ANSWER` | R1 | Responder una decisión estacionada | `escalation/**` — huérfano | ❌ dueño: `S5.5` |
| `CV_MERGE_MAIN` | R2 | Integrar a `master` | `delivery/pull-request-adapter.mjs` — huérfano | ❌ |
| `CV_DB_PUSH` | R2 | Aplicar migraciones | — | ❌ |

**Cero de los trece comandos tiene superficie de operador.** `CV_STATUS` es el único con salida
visible, y llega por `bin/torre` y por `tower_status`, no por el vocabulario: nada en el producto
importa `COMMAND_VOCABULARY` fuera de su propio test.

## 2. El hallazgo estructural — la Torre es dirigida por agentes, no por vos

Hay **dos superficies de comando paralelas que no se conocen entre sí**:

- **`mcp.mjs`** expone ocho primitivas *para agentes*: `tower_register`, `tower_status`,
  `tower_send`, `tower_set_state`, `tower_acquire`, `tower_release`, `tower_transfer`,
  `tower_receive`. Un agente se une, **actualiza su propio estado**, manda mensajes y toma locks.
- **`console/vocabulary.mjs`** declara trece intenciones *de operador*: vos le decís a la Torre
  que asigne, frene, reanude, otorgue entrega o responda una escalación.

El puente entre las dos nunca se escribió, y hay una razón mecánica: `core.mjs:4418` define
`setState({ db, place }, { state, task, note, prUrl })`. El sujeto es **`place`** —la identidad
derivada del directorio de trabajo— y **no existe un parámetro `agent`**. Un agente sólo puede
cambiar su propio estado. `CV_PAUSE`, `CV_RESUME` y `CV_ASSIGN` son el operador actuando **sobre
otro** agente: es la dirección de autoridad inversa, y no existe en el producto.

> **Esto es lo que separa a la Torre de hoy del requisito "que funcione como si estuvieras
> sentado frente a la compu".** Hoy los agentes reportan; vos mirás. No comandás.

## 3. Los 34 módulos sin llamador

**2.494 líneas, 34 archivos.** Alcanzable desde un canal real: 78,8%. Cada archivo cae en un
cajón; los cajones A y B se derivan del vocabulario o de una capacidad declarada, el C es
infraestructura y el D **requiere una decisión del maintainer** y no se deriva.

### A · Reclamado por un comando del vocabulario — 12 archivos, 938 líneas

| Módulo | Líneas | Comando que lo reclama |
|---|---|---|
| `console/{vocabulary,validate}.mjs` | 175 | es la definición de los trece |
| `escalation/{request,routing,parking-composition}.mjs` | 274 | `CV_ANSWER` — dueño `S5.5` |
| `delivery/{workflow,pull-request-adapter,git-adapter,reconciliation,ledger}.mjs` | 356 | `CV_MERGE_MAIN`, `CV_GRANT_DELIVERY`, `CV_HOLD_DELIVERY`, `CV_STOP_DELIVERY` |
| `hosts/{inspect,health}.mjs` | 133 | `CV_INSPECT` |

### B · Reclamado por una capacidad declarada — 12 archivos, 1.075 líneas

| Módulo | Líneas | Quién lo reclama |
|---|---|---|
| `registry/{store,path}.mjs` | 203 | `F1` del PRD; precondición de todo comando que nombra un agente |
| `support/{agent,manifest,snapshot}.mjs` | 203 | `S8.4` — briefs read-only de Support |
| `enroll/index.mjs` | 141 | decisión 25 — origen del binding confiable |
| `supervision/state.mjs` | 126 | `S10.2` — supervisión sin armado local |
| `jornada/execution-contract.mjs` | 122 | `S10.3` — contrato de ejecución versionado |
| `continuation/{derivation,integrated-base}.mjs` | 106 | `S5.3`, `F4` — continuación entre agentes |
| `policy/jornada.mjs` | 39 | `F3` — límites de jornada; precondición de `CV_GRANT_DELIVERY` |
| `registry/legacy-import.mjs` | 135 | detector de colisiones del enrolamiento — ver la corrección al final de §3 |

### C · Andamio interno — 5 archivos, 108 líneas

`contracts/{artifact-ref,idempotency,index}.mjs` (102) · `main-store/index.mjs` y
`registry/index.mjs` (6, barriles). No son superficie: existen para que A y B funcionen. Se
conectan solos cuando se conecta lo que los usa.

### D · Necesita tu decisión — 5 archivos, 373 líneas

| Módulo | Líneas | La pregunta |
|---|---|---|
| `capabilities/registry.mjs` | 175 | Ningún comando lo nombra y **no tiene consumidor de producción**. `S3.3` fijó que da visibilidad y compatibilidad de invocación, nunca autoridad. **Resuelto el 2026-08-21: se archiva** ([decisión 59](decision-register.md)) — pero no es gratis, ver la nota de abajo. |
| `hosts/{rehydration,stop-proof}.mjs` | 89 | **RESUELTO el 2026-08-21 por la auditoría exclusiva de P4: pasan al cajón B.** `stop-proof` vuelve falsificable la diferencia entre «perdí la vista» y «el agente murió», la distinción exacta de la decisión 40. Se conectan con `S4.4`. |
| `policy/delivery-policy.mjs` | 79 | Impone `documentation_close`, `horizon_ceiling` y forma de entrega: **es verificación de proceso**. Candidato directo de la Fase 3, donde la verificación vuelve a gentle-ai. |
| `hosts/launcher.mjs` | 30 | `S8.9` ya lo declaró inalcanzable por contrato y lo dejó fuera del payload sin borrarlo. ¿Se archiva? |

**Costo real de archivar `capabilities/registry.mjs`.** No tiene consumidor de producción y `jornada/lifecycle.mjs` no contiene **una sola línea** de capability, así que ningún módulo distribuido pierde comportamiento propio. Pero dos tests de módulos que sí se distribuyen lo usan: `test/plugin/tower-spike.test.mjs` (13 referencias) lo construye en su `setup()` compartido **y usa el archivo del registro como uno de los dos testigos de no-mutación de `canonicalSnapshot`**, junto con la base de datos; y `test/jornada/lifecycle.test.mjs` (14 referencias) prueba que revocar una Jornada invalida pasivamente una capacidad — comportamiento que vive en el registry, no en el lifecycle. **Archivarlo exige cirugía en esos dos tests y debilita un testigo del plugin.** Es un cambio de código acotado, no un movimiento documental.

**Ejecución asignada el 2026-08-21: la absorbe la auditoría exclusiva de P8.** Decisión del maintainer. Esa auditoría es dueña del instalable y del cableado, va a tocar `test/plugin/tower-spike.test.mjs` de todos modos, y ahí el retiro se hace con el testigo de no-mutación rediseñado en vez de simplemente debilitado. No se ejecuta como cambio suelto.

### Corrección del 2026-08-21 — `registry/legacy-import.mjs` no pertenece al cajón D

**Clasificado mal en la primera pasada, por nombre e historia en vez de por consumidor.** El archivo no importa proyectos legacy: es **el detector de colisiones del enrolamiento**. `enroll/index.mjs:126` llama a `preflightLegacyImport` con **un solo registro** —el proyecto que se está enrolando— y falla con `CT_ENROLLMENT_CONFLICT` si detecta ID duplicado, alias repetido, raíz canónica repetida, `git_common_dir` repetido o `main_store_path` repetido, antes de escribir en el registro. Nunca escribe: `authoritative_writes` vale `0` en todo el archivo.

**Pasa al cajón B**, junto a `enroll/index.mjs` y `registry/{store,path}.mjs`: es huérfano por cadena, no por muerte —sólo se lo alcanza a través de `enroll/`, que tampoco tiene llamador—, y se conecta cuando se conecte el enrolamiento. **El nombre es engañoso y conviene renombrarlo** cuando esa Sesión se enumere.

Con esta corrección el cajón B pasa a **12 archivos y 1.075 líneas**, y el cajón D a **5 archivos y 373 líneas**.

## 4. Qué mide y qué no mide este documento

**Mide** alcanzabilidad por imports estáticos desde los dos canales de distribución reales:
`bin/torre install` vía `RUNTIME_PAYLOAD_FILES`, e `install.sh` vía `plugin/tower-spike.js` y
`mcp.mjs`.

**No mide** si el código es correcto, si está probado, ni si la implementación conectada hace lo
que el comando promete. Un módulo alcanzable puede estar mal; un módulo huérfano puede ser
excelente —de hecho la mayoría lo son, y ése es exactamente el problema.

**No reemplaza** al [master-index](master-index.md), que mide planificación, ni a
[implementation-state](implementation-state.md), que narra el estado del código.

## 5. Cómo se conectan — orden de conexión, no lista de tareas

**La solución del cableado está en la [decisión 60](decision-register.md): falta una columna vertebral, y estos módulos cuelgan de ella.** No son 34 trabajos independientes. Ninguno se enchufa solo: cada uno entra al producto **porque un comando del vocabulario lo necesita**.

**Prerrequisito único, en orden de dependencia:**

1. **El verbo faltante** — una vía autorizada para actuar sobre otro agente. `core.mjs:4418`, `setState` toma `place` y no `agent`. Sin esto ningún comando validado tiene a qué llamar. Materia de la auditoría de **P4**.
2. **El ejecutor** — traduce un comando validado en llamadas a primitivas. No existe. Materia de **P8**.
3. **La superficie** — los verbos tipeables en `bin/torre`. Materia de **P8**.

El cerebro ya está: `console/validate.mjs` valida el comando contra el vocabulario, resuelve el agente destino, verifica su estado y exige confirmación con evidencia para los dos comandos irreversibles. 16 tests en verde.

**Orden de conexión, derivado de qué comando trae qué módulo:**

| Entra… | …cuando exista | Líneas | Cajón |
|---|---|---|---|
| `registry/{store,path}.mjs` + `enroll/index.mjs` + `registry/legacy-import.mjs` | cualquier comando — todos nombran un agente dentro de un proyecto registrado | 479 | B |
| `hosts/{inspect,health}.mjs` | `CV_INSPECT` | 133 | A |
| `escalation/{request,routing,parking-composition}.mjs` | `CV_ANSWER` — primer consumidor: `S5.5` | 274 | A |
| `policy/jornada.mjs` | `CV_GRANT_DELIVERY`, que debe respetar los límites de la Jornada | 39 | B |
| `delivery/{workflow,pull-request-adapter,git-adapter,reconciliation,ledger}.mjs` | `CV_GRANT_DELIVERY`, `CV_HOLD_DELIVERY`, `CV_STOP_DELIVERY`, `CV_MERGE_MAIN` | 356 | A |
| `console/{vocabulary,validate}.mjs` | el ejecutor mismo — es su entrada | 175 | A |
| `support/**`, `supervision/state.mjs`, `jornada/execution-contract.mjs`, `continuation/**` | capacidades declaradas de P8, P10 y P5, no comandos de operador | 557 | B |
| `contracts/**` y barriles | detrás de lo que los usa, sin trabajo propio | 108 | C |

**Regla que se deriva de este orden.** Ninguna Sesión de cableado enchufa un módulo «porque está suelto». Enchufa **un comando**, y el módulo entra con él. Una Sesión que no pueda nombrar el comando que la justifica está reintroduciendo el defecto que este inventario existe para cerrar.

**Los 373 líneas del cajón D quedan fuera de este orden** porque su destino no depende del ejecutor sino de decisiones ya asignadas: `capabilities/registry.mjs` se archiva dentro de la auditoría de P8, `hosts/{rehydration,stop-proof}.mjs` dependen de la de P4, `policy/delivery-policy.mjs` es candidato de la Fase 3 y `hosts/launcher.mjs` espera su archivado.

## 6. El hueco queda visible en la suite

`test/console-executor.test.mjs`, entregado en `master@e1a157b`, mantiene el hallazgo de la [decisión 60](decision-register.md) **dentro de la suite** en vez de sólo en este documento. Cada corrida de `bun test` lista los verbos validados que todavía no tienen ejecutor.

```
2 pass · 13 todo · 0 fail
```

**No falla**: los `todo` no cuentan como error. La lista se deriva de `VERBS`, así que agregar un verbo al vocabulario agrega su pendiente automáticamente, y mover un verbo a `EXECUTED` lo saca. Cuando los trece tengan ejecutor, el archivo se borra. Dos aserciones reales lo custodian: `EXECUTED` sólo puede nombrar verbos que existan, y el vocabulario debe declarar al menos uno.

**Por qué existe.** Este proyecto registró dos veces en una semana que su documentación afirmó cosas falsas sobre el código, y las dos se detectaron por auditoría manual y no por una alarma. Un documento hay que acordarse de abrirlo; una señal en la suite aparece sola. Es el mismo criterio falsificable que el resto del registro, pero ejecutable.

**Estado de la suite tras esta entrega:** 858 pass · 13 todo · 5 fail. Los cinco fallos pertenecen al candidato sin commitear de `S8.10` en el worktree `implementation-slot` —`CT_RUNTIME_PAYLOAD_INVALID: unexpected directory contracts`, tarea `T8.10.1.3`— y no los introdujo ninguna entrega de esta pasada.

## 7. Actualización tras la auditoría de P4 y la decisión 61

**El punto 1 de la decisión 60 queda superado.** Ya no falta «el verbo que no existe»: Main no necesita escribir la fila de un agente ajeno. `core.mjs:4445` `send` y `core.mjs:4464` `receive` son el canal operador→agente, ya se instalan, y conservan el invariante de escritor único. Main manda la directiva; el agente se la aplica a sí mismo.

**Lo que resta construir es más chico que lo declarado en §5:**

| | Estado |
|---|---|
| ~~1 · el verbo faltante~~ | **superado** — el canal ya existe |
| 2 · el ejecutor | traduce un comando validado en una directiva `send` hacia el agente nombrado. **Sigue sin existir** |
| 3 · la superficie | los verbos tipeables en `bin/torre`. **Sigue sin existir** |

**Alcance fijado por la decisión 61.** `CV_PAUSE` promete «le pedí que pare», no «garantizo que paró» — alcanza porque el agente ya se autolimita bajo gentle-ai. No se agregan verbos de cierre ni muerte forzada. `hosts/stop-proof.mjs` conserva su consumidor original, la recuperación de `S4.4`, y no pasa a ser insumo de `CV_PAUSE`.

## 8. Nota de la auditoría de P9 (2026-08-21)

`workspace/` no aparece en los cajones de §3 porque **es alcanzable** por el canal del plugin —`plugin/tower-spike.js` → `main-store/store.mjs` → `workspace/{checkpoint,reconciliation}.mjs`—. La auditoría de P9 no cambia eso.

Lo que sí registra es un patrón que se repite y conviene mirar en la auditoría de P8: **`M9.1.3` de `S9.1` propone seguridad de descriptores contra ataques de enlace simbólico y carreras TOCTOU**, que exigen un atacante con el mismo usuario en la misma máquina. Es la misma clase de sobrealcance que la [decisión 59](decision-register.md) resolvió para `capabilities/registry.mjs`: maquinaria correcta para un modelo de amenaza ajeno al proyecto. **Al auditar P8 conviene revisar si el instalable arrastra el mismo criterio**, porque el fijado de ejecutables por bytes vía `/proc/self/fd/3` sí es una garantía de seguridad legítima y no debe confundirse con este caso.

## 9. Nota de renumeración de P9 (2026-08-21)

La [decisión 62](decision-register.md) recortó y reordenó P9 **renumerando los IDs**, porque el estándar los define como posicionales. Toda referencia a `S9.x` anterior al 2026-08-21 usa la numeración vieja; la tabla de migración vive en [`plan-9/STATUS.md`](plan-9/STATUS.md) y la historia del registro de decisiones **no se reescribe**.

| Antes | Ahora |
|---|---|
| `S9.4` pool de asientos | **`S9.1`** |
| `S9.1` lifecycle seguro | **`S9.2`**, reducida a un solo resultado |
| `S9.2` mitad caché de Bun | **`S9.3`** |
| `S9.2` mitad launcher Pi | **`S9.4`**, 🟡 DIFERIDO |
| `S9.3` reciclaje externo | **eliminada** |

**Corrección que afecta a este inventario:** la mitad Pi **no muere con Moshi**. `hosts/pi-launcher.mjs` es un host de ejecución, no un transporte, y se difiere bajo el mismo criterio que `S1.17`–`S1.19`. Moshi reemplaza transporte remoto, no hosts.

## 10. Auditoría exclusiva de P8 — resultado (2026-08-21)

Medida sobre `master@cbb0691`. Punto de entrada: **qué es exactamente el producto instalable.** Se registra acá y **no en `plan-8/STATUS.md`** porque ese archivo tiene cambios sin commitear de `S8.10` y esta sesión no toca trabajo en implementación; se reconcilia cuando ese candidato aterrice.

### Hallazgo 1 — dos instaladores, y el versionado no puede entregar la mitad que usan los agentes

| | Qué instala | Estado |
|---|---|---|
| `install.sh` | Escribe con `jq` el bloque `.mcp["control-tower"]` en `opencode.json` y copia `plugin/tower-spike.js`. **Es la mitad que usan los agentes.** | sin versionar, tratado como *legacy* |
| `torre install` → `install/lifecycle.mjs` | El payload versionado: la maquinaria de lanzamiento de hosts. | versionado, sellado, con rollback |

**`install/lifecycle.mjs` nunca escribe el cableado MCP.** Lee `config?.mcp?.["control-tower"]?.command` (línea 194), verifica que apunte a un `/mcp.mjs`, lo respalda (línea 225) y en `rollback` lo restaura (línea 252, `outcome: "legacy-restored"` en la 333). **Reconoce la instalación de `install.sh` para migrarla, no para reemplazarla.**

**Y el payload no puede incluir esa mitad, por contrato.** La decisión 54 fijó que `RUNTIME_PAYLOAD_FILES` se deriva del cierre de imports de **cuatro raíces**, declaradas en `scripts/payload-closure.mjs:7-10`: `install/active-pointer.mjs`, `install/lifecycle.mjs`, `core.mjs` y `hosts/launch-worker-cli.mjs`. **Ni `mcp.mjs` ni `plugin/tower-spike.js` son raíz.** Y el instalador exige igualdad exacta de conjunto: falta un miembro → `CT_RUNTIME_PAYLOAD_INCOMPLETE`; sobra uno → `CT_RUNTIME_PAYLOAD_INVALID`. Agregarlos a mano rompería el contrato que `S8.9` acaba de cerrar.

> **La brecha 6, vista desde el instalador.** No es que 44 de 71 archivos «se olvidaron». Es que el producto tiene dos mitades con dos instaladores, una sola está versionada, y la otra sólo existe como el legado del que la primera migra.

### Hallazgo 2 — el cableado contado desde la caja

| | Archivos | Cómo llega a una máquina |
|---|---|---|
| Payload versionado | 27 | `torre install` — derivado, sellado, con rollback |
| Canal de agentes | 10 | `install.sh` — sin versionar, tratado como legacy |
| Sin llamador | 34 | **ninguno** — los cuatro cajones de §3 |

Los diez del canal de agentes son `mcp.mjs`, `plugin/tower-spike.js`, `main-store/{store,authority}.mjs`, `host/loop.mjs`, `continuation/support.mjs` y `workspace/{checkpoint,reconciliation}.mjs`. **Incluyen `main-store/store.mjs`, donde vive el guard `assertMain`** que la auditoría de P4 identificó como el patrón de autoridad del proyecto.

**Por qué el cableado pertenece a P8:** conectar un módulo huérfano sin decidir por qué canal viaja **no lo pone en ninguna máquina**. El cableado y el empaquetado son la misma decisión.

### Hallazgo 3 — el instalable NO arrastra el sobrealcance de seguridad de `M9.1.3`

Respuesta a la pregunta que dejó §8. **No lo arrastra, y la distinción importa:**

- **`/proc/self/fd/3` (`production-provider.mjs:152`) es legítimo y se conserva.** Garantiza que los bytes verificados sean exactamente los ejecutados; esa sustitución la puede provocar cualquier proceso propio, sin necesidad de un atacante.
- **La igualdad exacta de conjunto del payload es legítima y se conserva.**
- **La comparación literal contra `"herdr 0.8.0\n"` (`lifecycle.mjs:56`) no garantiza nada** y ya quedó marcada para retiro por la auditoría de P4.

La secuencia `lstat`/`fstat` de `M9.1.3` protegía de que sustituyan un archivo **dentro del propio worktree**, lo que exige que alguien ya esté adentro. Mismo vocabulario, riesgos incomparables.

### Veredictos

- **Trabajo nuevo sin Sesión dueña, y es el más grande del proyecto:** decidir por qué canal viaja cada mitad, y si siguen siendo dos. Hoy el canal de agentes no tiene instalador versionado, ni rollback, ni puntero activo: si `install.sh` queda viejo respecto del payload, **nadie lo detecta**. No lo cubren `S8.9`, `S8.10` ni `S8.11`.
- **`S8.10` se confirma y es la llave.** Cierra el payload sobre schemas declarados, es la causa exacta de los 5 fallos vigentes, y terminarla destraba de una: la tarea 0.4 del denominador, la reconciliación del `master-index` y `release-chain` con los IDs nuevos de P9, y el registro de esta auditoría en `plan-8/STATUS.md`.
- **`S8.11` se confirma como optimización de costo**, no de producto. No bloquea la release.
- **`S8.5` y `S8.6` siguen bien diferidas**, con su razón registrada intacta.
- **El retiro de `capabilities/registry.mjs` se ejecuta acá**, rediseñando el testigo de no-mutación de `test/plugin/tower-spike.test.mjs` en vez de debilitarlo.

## 11. Estado y ruta de cierre de `S8.10` — planificación, sin implementar (2026-08-21)

`S8.10` es la llave de todo lo que quedó trabado. Esta sección registra **dónde está y qué le falta**, para que se pueda retomar sin re-descubrirlo. **No se implementó nada.**

### Dónde vive hoy

| Pieza | Ubicación | Estado |
|---|---|---|
| Planificación | rama local `feat/s8.10-runtime-payload-model@0891cc7` — *«docs(plan): define S8.10 runtime payload tasks»* | commiteada, **sin remoto** |
| Planificación (copia) | `openspec/plans/plan-8/STATUS.md` en el worktree `implementation-slot` | **sin commitear**, +206 líneas |
| Candidato de comportamiento | árbol de trabajo de `implementation-slot` | **sin commitear**, 336 líneas sobre 14 archivos + 2 sin trackear |
| Checkpoint de parqueo | Engram 9176 | antes del commit de comportamiento y de la verificación final |

### Qué hace el candidato

Agrega al payload derivado las familias que hoy quedan fuera: los nueve archivos de `contracts/**`, más `hosts/candidate-fence.mjs` y `hosts/epoch-enforcement.mjs`. Es decir, cierra el instalable sobre los schemas y contratos que el runtime instalado necesita leer.

### Qué falta, exactamente

**Una sola tarea: `T8.10.1.3`.** El rojo vigente es:

```
CT_RUNTIME_PAYLOAD_INVALID: unexpected directory contracts
```

`scanClosure` valida los directorios admitidos contra una **lista fija** —`bin`, `hosts`, `install`, `jornada`, `main-store`— que no incluye `contracts`. El candidato agrega miembros de `contracts/**` al payload sin actualizar esa validación, y el instalador los rechaza.

**Forma del arreglo, ya declarada en el plan:** derivar los prefijos de directorio **exclusivamente desde los miembros exactos de `RUNTIME_PAYLOAD_FILES`**, excluyendo `.`, y rechazar cualquier otro. Así la lista deja de mantenerse a mano y no puede volver a desincronizarse del payload.

**Criterio de cierre:** `bun test test/install` vuelve a 67/0 en árbol limpio, y `RUNTIME_PAYLOAD_ASSETS` permanece exactamente `["bin/torre"]`.

### Qué NO entra en `S8.10`

- **El retiro de `capabilities/registry.mjs`** pertenece al trabajo de la auditoría de P8, no a esta Sesión. Meterlo adentro le expande el alcance.
- **La unificación de los dos instaladores** es trabajo nuevo sin dueño (§10) y tampoco pertenece acá.

### Qué destraba al cerrar

1. La **tarea 0.4** del plan de depuración — el recálculo del denominador, que necesita las cifras `38/52` y P8 `7/11` que hoy sólo existen en el WIP.
2. La reconciliación de **`master-index.md`** y **`release-chain.md`** con los IDs nuevos de P9.
3. El registro de la **auditoría de P8** en `plan-8/STATUS.md`, hoy escrito en §10 de este documento por el mismo bloqueo.

## 12. `S8.12` — Canal único de distribución · contrato en custodia

**Tercera de las tres Sesiones que nacen de la reconciliación ([decisión 63](decision-register.md)).** Pertenece a **P8**, cuyo propósito —que la Torre se instale como producto— la cubre exactamente. **Se registra acá y no en `plan-8/STATUS.md`** porque ese archivo tiene cambios sin commitear de `S8.10`; se muda cuando ese candidato aterrice, sin cambiar una coma.

**Estado:** 📋 PLANIFICADO
**Depende de:** `S8.10` cerrada — toca el mismo contrato de payload.

**Área:** `scripts/payload-closure.mjs`, `install/runtime-payload.mjs`, `install/lifecycle.mjs`, `install.sh`, `test/install/**`.
**Prohibido:** `core.mjs`, `mcp.mjs`, `plugin/tower-spike.js` — esta Sesión decide **cómo viajan**, no los modifica.
**Recurso:** contrato `RUNTIME_PAYLOAD_FILES` y el puntero de runtime activo.
**Ruta:** `design-tasks`.

**Resultado:** una sola ruta de instalación versionada entrega la Torre completa. El canal de agentes deja de depender de un script sin versionado, sin respaldo y sin puntero activo.

### El problema, medido

`install.sh` escribe con `jq` el bloque `.mcp["control-tower"]` en `opencode.json` y copia `plugin/tower-spike.js`. `install/lifecycle.mjs` **nunca lo escribe**: lo lee (línea 194), lo respalda (225) y en rollback lo restaura (252, `outcome: "legacy-restored"` en la 333). Y el payload **no puede incluirlo por contrato**: `scripts/payload-closure.mjs:7-10` declara cuatro raíces y ni `mcp.mjs` ni el plugin son una de ellas, con igualdad exacta de conjunto exigida.

**Hoy, si `install.sh` queda viejo respecto del payload versionado, nadie lo detecta.**

### La corrección que esta Sesión tiene que resolver, y que un resumen apresurado pasa por alto

Agregar `mcp.mjs` y el plugin a las raíces pone los **bytes** en el almacén versionado. **Pero eso no los instala.** Alguien todavía tiene que escribir el bloque MCP en `opencode.json` —un archivo que pertenece a OpenCode, no a la Torre— y copiar el plugin a `~/.config/opencode/plugins/`. **Son dos trabajos distintos:**

1. **Membresía del payload** — qué bytes viajan en la caja versionada.
2. **Acción de instalación** — quién los enchufa al llegar, con respaldo y rollback, sobre un archivo de configuración ajeno.

`install/lifecycle.mjs` hoy hace deliberadamente sólo la primera y trata la segunda como legado. **Una Sesión que resuelva sólo la membresía deja el producto igual de partido.**

### Decisiones que esta Sesión debe declarar antes de implementar

- `escala` — **si el producto sigue teniendo dos mitades o pasa a una.** **Clase:** contrato visible del producto; expansión de alcance. Unificar significa que `torre install` toque `opencode.json`, que es de otro producto — con su respaldo y su rollback. No unificar significa aceptar dos instaladores y **declararlo**, con una verificación que detecte la desalineación. **Ninguna de las dos la puede tomar un agente.**
- `derivable` — **qué pasa si `opencode.json` no existe o no es de la Torre.** **Criterio:** falla cerrado y no lo crea. La Torre no inventa configuración de otro producto.

### Criterios de aceptación

- [ ] Una instalación limpia por una sola ruta deja la Torre **completa**: payload versionado y canal de agentes
- [ ] El rollback revierte las dos mitades juntas o ninguna
- [ ] Una desalineación entre el canal de agentes y el payload versionado **se detecta y se reporta**
- [ ] `opencode.json` ausente, ajeno o ilegible falla cerrado, con respaldo previo intacto
- [ ] `RUNTIME_PAYLOAD_FILES` conserva igualdad exacta de conjunto
- [ ] `bun test` no introduce fallos nuevos; el diff no toca el `Prohibido`

**Módulos y Tareas:** pendientes de enumerar, después de resolver la decisión que escala.
