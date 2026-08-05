# Plan 5 — Entrega y continuación

**Estado:** 📋 PLANIFICADO

> **Enmienda de contrato del 2026-08-03 (`d232fdf`) — ninguna Sesión cambió de estado.**
> Los gates se partieron en pisos de seguridad (no configurables) y política declarada
> por proyecto. Para este Plan eso significa: la **forma de entrega** y la **autorización
> de merge** dejan de estar fijas y se resuelven del bloque `delivery-policy` de
> [`AGENTS.md`](../../../AGENTS.md), con default fail-closed a humano; el **techo de
> planificación** de `S5.3` se resuelve igual, con default 2. `S5.1` suma dos Módulos
> nuevos —`M5.1.2` derivación del siguiente Módulo y comparación del claim del worker,
> `M5.1.3` frontera del subagente Support— y su forecast pasó a 380–500 líneas, en el
> borde de encadenado de 400: se decide en apply.
> Contrato completo en [`autonomous-v2-role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/).

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Las dependencias legacy de Changes F/G se conservan. `S5.1` depende de `S3.2` ✅, `S3.3` ✅ y **`S3.4`** —esta última se sumó el 2026-08-04 al sellar `S5.1`: revalidar la Jornada antes de un efecto irreversible exige `readJornada`, que entrega `S3.4`—; `S5.2` de `S4.1` y `S3.3` ✅, `S5.3` de `S5.2`, `S5.4` de `S5.1` y `S5.5` de `S5.4`. |
| Outputs | F: authorization store, Telegram, validación Git/PR/check/SHA, entrega idempotente y post-check. G: planning horizon, reconciliación, apply/verify, Binding Delta y continuación del siguiente `slice_id`. Más el ruteo de escalamiento de `S5.4` y la planificación diferible de `S5.5`. |
| Roadmap | Esperar `S3.4`, ejecutar `S5.1` —contrato sellado el 2026-08-04—, esperar `S4.1`, continuar con `S5.2` y cerrar con `S5.3`. `S5.4` se abre apenas cierra `S5.1` y no depende del resto de la cadena; `S5.5` sigue a `S5.4` por la misma hebra. Cada Sesión es una unidad entregable a `master`. |
| Referencias | [`sdd-tower-telegram-delivery`](../../changes/sdd-tower-telegram-delivery/), [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/), [`autonomous-v2-role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/). El proposal `sdd-tower-continuous-slice-loop` fue eliminado en `613a45d` por ser cáscara sin avance; su mecanismo quedó superseded por la continuación role-routed y su intención vive en este STATUS. |

## Sesión 5.1 — Change F candidate contracts

**Estado:** 🟢 LISTO — contrato **re-sellado el 2026-08-05**. El sello original quedó en `c2d116c`; `M5.1.3` se corrigió primero porque no declaraba quién probaba la autoridad canónica de Main y se acotó otra vez después de que la investigación de alcance demostrara que el candidato había creado una dependencia prohibida sobre schema-v6. Cero decisiones `escala` abiertas. **El contrato está sellado; el candidato todavía no está corregido ni verificado.**

**Depende de:** `S3.2` ✅, `S3.3` ✅ integrada en `4621d3f`, `S3.4` ✅ integrada en `b6dda84`.

**Por qué depende también de `S3.4` — lo produjo la decisión del maintainer, y ya está satisfecho.** Exigir Jornada `ACTIVE` y `jornada_revision` actual antes de todo efecto irreversible obliga a **leer una Jornada persistida**. `policy/jornada.mjs`, que entregó `S3.2`, es un resolvedor puro que recibe la Jornada como argumento y no la persiste; `readJornada` la entrega `S3.4` en `T3.4.1.2`. Sin esa función el criterio de revalidación no era implementable ni verificable. Ahora lo es.

**Área:** `contracts/candidate-revision.mjs`, `schemas/candidate-revision-v1.schema.json`, `contracts/{schema-registry,validate}.mjs`, `main-store/store.mjs`, `continuation/{derivation,support}.mjs`, `plugin/tower-spike.js`, `.opencode/agent/support-agent.md`, `test/continuation/**`, `test/plugin/tower-spike.test.mjs`, `test/main-store.test.mjs`, `test/contracts/schema.test.mjs`, `test/fixtures/contracts/schema-cases-v1.json`, `package.json`, `bun.lock`, `.opencode/plugins/tower-spike.js`

**Prohibido:** `core.mjs`, `test/recovery.test.mjs`, `mcp.mjs`, `delivery/**`, `jornada/**`, `capabilities/**`, `policy/**`, `registry/**`, `workspace/**`, `escalation/**`, `hosts/**`, `openspec/plans/**`, `openspec/specs/**`

**Ampliación del `Área` del 2026-08-04 — tres paths, y sólo tres.** `plugin/tower-spike.js`, `.opencode/agent/support-agent.md` y `test/plugin/tower-spike.test.mjs` entraron al re-sellar `M5.1.3`. `continuation/support.mjs`, `test/continuation/support.test.mjs` y `test/main-store.test.mjs` **ya estaban** cubiertos por `continuation/{derivation,support}.mjs`, `test/continuation/**` y su propia entrada. `capabilities/**` y `registry/**` **siguen prohibidos**: la autoridad no se otorga por registry.

**Ampliación del `Área` del 2026-08-05 — exactamente tres paths, y ningún otro:** `package.json`, `bun.lock` y `.opencode/plugins/tower-spike.js`. Las dependencias directas de OpenCode y su lock acompañan a `plugin/tower-spike.js`; el entrypoint sólo lo expone al runtime. **S5.1 no posee compatibilidad schema-v6.** Ese trabajo espera el mapa acotado de consumidores y dependencias antes de que `planificador-granular` lo enumere; este re-sello no crea ni anticipa esa Sesión.

**`core.mjs` y `test/recovery.test.mjs` siguen prohibidos, explícitamente.** El contrato aprobado no permite que `M5.1.3` fabrique ni lea por su cuenta el binding canónico: `TowerSpikePlugin` **recibe `trustedBindingProvider` al inicializarse** y sólo puede obtener el binding a través de ese parámetro. No puede conservar `readValidatedMainStoreBinding` ni ningún reader nuevo en `core.mjs`. La investigación del 2026-08-05 demostró por qué este límite es material: el candidato llamó al reader de `core.mjs`, mientras su test lo reemplazó por un mock y por eso no probó la frontera declarada.

**Por qué el `Área` incluye `contracts/**`:** misma razón verificada en `S3.3`. Un schema fuera del mapa `schemaFiles` de `contracts/schema-registry.mjs` **no tiene validador** —`validatorFor` devuelve `null` y `validate` tira `Unknown schema`—, así que `candidate-revision-v1` no sirve de nada hasta quedar registrado, con su invariante cross-field en `contracts/validate.mjs` y su caso en el fixture.

**Por qué `jornada/**` está prohibido pese a ser central:** `S5.1` **lee** la Jornada, nunca la escribe ni la transiciona. `jornada/lifecycle.mjs` es el `Área` de `S3.4` y se importa sin modificar, igual que `S3.3` consumió `main-store/authority.mjs`. Una segunda ruta de transición de Jornada sería una segunda noción de estado vivo.

**Colisión declarada con `S3.4` sobre `main-store/store.mjs`.** Las dos Sesiones tienen ese archivo en su `Área`: `S3.4` le agrega `createJornada`/`readJornada`/`transitionJornada`, `S5.1` toma posesión del authorization store que ya vive ahí. **Planificar en paralelo: sí. Implementar en simultáneo: no.** Y no es sólo colisión de escritura — es dependencia dura: `S5.1` necesita llamar a una función que `S3.4` todavía no escribió.

**Recurso:** Main / ninguno. Escritura por CAS de filesystem en `main-store/store.mjs` bajo `assertMain`, sin migraciones de SQLite, sin `db-writer` y sin token de entrega. La lectura del ledger para derivación es **sólo lectura** y nunca pasa por `core.mjs`, que queda opaco al plan.

**Entrega:** commit directo a `master` + push, sin PR ([`AGENTS.md`](../../../AGENTS.md)). Forecast **380–500 líneas**, en el borde de encadenado de 400: se entrega **encadenada por Módulo** —`M5.1.1`, `M5.1.2`, `M5.1.3`, cada uno con su commit— más el commit documental de cierre, que es del planner.

**Ownership del authorization store — explícito.** `S5.1` es su **único** dueño desde este sello. `createAuthorization` y `consumeAuthorization` (`main-store/store.mjs:122` y `:133`) sólo se modifican dentro de esta Sesión; cualquier otra los importa. `S3.4` toca el mismo archivo pero **no** esas funciones: agrega el género Jornada al lado, reusando `commit` y `assertMain`.

Define identidad y freeze de `candidate_revision`, invalidación, sucesores, compatibilidad e idempotencia, más la derivación del siguiente Módulo y la frontera del subagente Support.

**Colisión de IDs — resuelta el 2026-08-04 por el maintainer.** `M5.1.1` estaba definido dos veces con contenido incompatible: `Candidate` en el [`tasks.md` de `checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s51-change-f-contracts--m511-candidate) (2026-07-30) y `Dry-run reports` en el [`tasks.md` de `role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/tasks.md) (2026-08-03). **Gobierna `Candidate`**, por tres señales del propio plan: el header dice que `d232fdf` *"suma dos Módulos nuevos"* —o sea `M5.1.1` no cambió—, la prosa de esta Sesión describe identidad y freeze, y sus tres decisiones `derivable` son todas sobre identidad de candidato. **Consecuencia:** el contenido de dry-run —`NO_SCOPE`, denegación, drift de horizonte, `reconcile→Support→Policy`— **sale del alcance de `S5.1`** y queda sin ID asignado; su destino natural es `S5.3`, pero moverlo es expansión de alcance y necesita decisión del maintainer.

> **Prerrequisito ✅ RESUELTO el 2026-08-03 (`6d37642`).** `S5.1` toma posesión del authorization
> store, y ese store arrancaba con un contrato roto: `schemas/authorization-v1.schema.json` y
> `main-store/store.mjs` divergían en **seis** puntos, no en los dos que registraba
> [release-chain](../release-chain.md). El peor: el store persistía `APPROVED`, un valor que el
> enum canónico rechaza. Se reconcilió fuera del freno de ejecución por ser contrato, no trabajo
> nuevo. `action` pasó a `MERGE`, el binding `pr` a `delivery` con `shape`, y los estados a
> `PENDING|APPROVED|REJECTED|EXPIRED|REVOKED`. De paso se sumó `REJECTED` —el store no podía
> registrar un rechazo— y `createAuthorization` ahora valida contra el schema en vez de contra un
> array escrito a mano, que era la causa raíz del drift.
>
> **Evidencia completa — verificada el 2026-08-03 con la Torre desarmada: `bun test` → 450 pass / 0
> fail.** Durante la implementación la suite quedó en 446/2 porque `migration.test.mjs` → *P0 frozen
> snapshot restore* se niega a correr mientras exista `.git/control-tower/ACTIVE`. Esos dos tests son
> los que verifican **restore aislado sobre bytes trackeados**, así que hasta correrlos la
> reconciliación estaba verificada a nivel contrato y unidad pero no a nivel restore. Ya corrieron y
> pasan: el cambio no afecta el runtime. El total subió a 450 porque `M8.8.5` sumó dos tests de
> `diagnose`.

**Decisiones:**

- `derivable` — la forma del registro de autorización. **Criterio:** `schemas/authorization-v1.schema.json`, y el store valida **contra el schema**, nunca contra una lista escrita a mano. Escribir la lista dos veces fue la causa raíz de las seis divergencias que este prerrequisito acaba de reconciliar. Falsificable: cualquier enum o campo duplicado entre `main-store/store.mjs` y el schema. **Autoridad:** el schema, y la reconciliación `6d37642`.
- `derivable` — qué vuelve inválido a un candidato congelado. **Criterio:** cualquier cambio en los bytes que produjeron su identidad. Un candidato cuya identidad sobrevive a una modificación de contenido no es un freeze. Falsificable: dos contenidos distintos que resuelvan a la misma `candidate_revision`. **Autoridad:** los floors de seguridad de `d232fdf` — inmutabilidad del candidato congelado.
- `derivable` — cómo se comporta una operación repetida sobre el mismo candidato. **Criterio:** idempotente por identidad de candidato; repetir no produce un segundo efecto. Falsificable: dos invocaciones idénticas que generen dos efectos remotos. **Autoridad:** el alcance declarado de `S5.1`.
- `escala` — cuánto vive una autorización antes de expirar. **Clase:** seguridad y permisos. **RESUELTA el 2026-08-03 por el maintainer: una hora.** Cubre el caso real —aprobar desde el celular y que el agente ejecute en minutos— sin dejar una aprobación armada toda la noche. La expiración por tiempo es la **segunda** capa: la primera es la invalidación por contenido, que el candidato congelado ya provee. Falsificable: una autorización consumida más de una hora después de emitida. **Contaminaba:** `S5.2` y `S5.5`, ambas destrabadas.
- `escala` — si un sucesor hereda la autorización de su predecesor. **Clase:** seguridad y permisos. **RESUELTA el 2026-08-03 por el maintainer, con una condición que la vuelve verificable: hereda hasta el horizonte declarado (`planning.horizon_ceiling`, hoy `2`) si y sólo si, en el momento de la aprobación, todas las Sesiones dentro de ese horizonte están selladas — cero decisiones `escala` abiertas.** Si alguna tiene una abierta, el horizonte **colapsa** ahí y la herencia se corta en la Sesión anterior. El razonamiento es que horizonte y sello son garantías distintas: el horizonte acota **hasta dónde** llega la aprobación, el sello garantiza que **lo que alcanza ya está determinado**. Sin el sello, heredar equivale a autorizar contenido que se define después de aprobado. Falsificable: un sucesor con una decisión `escala` abierta que ejecute bajo autorización heredada. **Contaminaba:** `S5.3` y `S8.7`, ambas destrabadas.
- `escala` — si terminar una Jornada debe revocar activamente las capabilities y autorizaciones vivas. **Clase:** expansión de alcance, y seguridad y permisos. **RESUELTA el 2026-08-04 por el maintainer: no. La invalidación es pasiva.** Terminar una Jornada **incrementa `jornada_revision`** y nada más; no dispara cascada. Las capabilities y autorizaciones anteriores quedan inutilizables **al revalidar**, no al terminar: el que las quiera usar revalida contra la Jornada y falla cerrado por drift de revisión. `S5.1` exige Jornada `ACTIVE` y `jornada_revision` actual **antes de todo efecto irreversible**. Una capability equivalente se reemplaza naturalmente por `agent_role` + `capability`, sin ID nuevo. **La poda de capabilities discontinuadas queda fuera de alcance: no se construye garbage collector.** Falsificable: cualquier ruta que mute una capability o una autorización como efecto de terminar una Jornada, o cualquier efecto irreversible que se ejecute sin revalidar la Jornada. **Autoridad:** decisión del maintainer del 2026-08-04. **Contaminaba:** `S5.1`, destrabada — era la única decisión `escala` abierta que le quedaba.
- `escala` — **quién prueba la autoridad canónica de Main.** **Clase:** seguridad y permisos. **RESUELTA el 2026-08-04 por el maintainer y acotada el 2026-08-05: `plugin/tower-spike.js` es el único composition root que lo hace.** La plugin recibe `trustedBindingProvider` al inicializarse, liga y verifica `main_session_id` mediante `main-store/authority.mjs`, y **sólo después** de esa verificación obtiene el store y la capability protegidos. El provider entra por inyección: la plugin no lo fabrica, no lo reemplaza por `readValidatedMainStoreBinding` y no retiene ningún reader nuevo en `core.mjs`. Rechaza todo `context.sessionID` distinto del Main ligado, y ante provider o binding ausente, inválido o de otra sesión falla cerrado **antes** de cualquier spawn o persistencia. Support **nunca** recibe `main_store`, `capability` ni autoridad. **No se crea un adaptador Main separado** —una segunda noción de "esto es Main" es exactamente la clase de bug que `main-store/authority.mjs` existe para hacer imposible— **y no se usa el capability registry para otorgar autoridad**, porque el registry otorga visibilidad y compatibilidad de invocación, nunca autoridad (límite duro de `S3.3`). Falsificable: una inicialización sin `trustedBindingProvider` que llegue a spawn o persistencia; cualquier ruta que lea el binding desde `core.mjs`, obtenga store o capability antes de la verificación, acepte un `sessionID` ajeno, entregue autoridad a Support o derive autoridad de una entrada del registry. Un test que sólo mockea `core.mjs` sin observar la inyección **no satisface** este criterio. **Autoridad:** decisiones del maintainer del 2026-08-04 y 2026-08-05, y `main-store/authority.mjs:15-36`.
  **Por qué esto bloqueó `S5.1` en pleno vuelo.** El sello del 2026-08-04 en `c2d116c` describía `M5.1.3` como "frontera del subagente Support" y enumeraba qué **no** podía ver Support, pero **no decía quién probaba que Main era Main**. Aislamiento y wiring son dos preguntas distintas, y el contrato sólo respondía la primera. Agent 1 llegó a `M5.1.3` con los dos Módulos anteriores entregados y sin respuesta para la segunda. Es un hueco de contrato, no un error de implementación.

### Módulo M5.1.1 — Candidate

- [ ] Tarea T5.1.1.1 — RED: verificación de commit/árbol final, freeze de identidad y `host_epoch`,
  separación del ledger, invalidación, sucesor e idempotencia. Incluye **dos contenidos distintos que
  no pueden resolver a la misma `candidate_revision`** y **una operación repetida sobre el mismo
  candidato que no produce un segundo efecto**.
- [ ] Tarea T5.1.1.2 — GREEN: implementar `schemas/candidate-revision-v1.schema.json` y
  `contracts/candidate-revision.mjs`, registrar el schema en `contracts/schema-registry.mjs`, sumar su
  invariante en `contracts/validate.mjs` y su caso al fixture de contratos, respetando la frontera del
  ledger.
- [ ] Tarea T5.1.1.3 — REFACTOR: unificar los digests de identidad y de evidencia por un solo camino,
  para que no puedan divergir. `bun test test/contracts test/main-store.test.mjs`.

### Módulo M5.1.2 — Derivación del siguiente Módulo y claim del Worker

- [ ] Tarea T5.1.2.1 — RED: la derivación avanza sólo si el documento de plan no cambió desde el cierre
  anterior; enumeración por digest y cumplimiento leído de `ct_delivery`/`ct_claim` en **sólo lectura**.
- [ ] Tarea T5.1.2.2 — RED: memoria narrativa que declara un Módulo completo **sin** cumplimiento en el
  ledger **no** avanza la derivación.
- [ ] Tarea T5.1.2.3 — RED: un claim del Worker que coincide registra evidencia y **no otorga ningún
  privilegio**; uno que no coincide produce `CT_CLAIM_MISMATCH`, sin assignment, nombrando los dos valores.
- [ ] Tarea T5.1.2.4 — GREEN: traducción `handoff_id` → coordenada de plan **sólo** en registros
  propiedad de Main; `core.mjs` queda opaco al plan. Toda operación de esta ruta revalida la Jornada
  antes de cualquier efecto irreversible. `bun test test/continuation`.

### Módulo M5.1.3 — Frontera del subagente Support

**Re-sellado el 2026-08-05, sin declarar verificado al candidato. El Módulo tiene dos mitades, y confundirlas fue lo que bloqueó la Sesión.** No son dos Módulos: son dos preguntas distintas que el contrato anterior mezclaba.

1. **Aislamiento de Support** — qué *no* puede ser ni ver Support. Subagente **frío**, read-only,
   sin board, sin locks, sin Worker, sin entrada de registry, y **sin ruta de sustituto en línea**.
2. **Wiring de Main** — quién *prueba* que Main es Main. Es `plugin/tower-spike.js`, y sólo esa.

- [ ] Tarea T5.1.3.1 — RED: **aislamiento de Support.** No aparece **ni** en el board de la Torre
  **ni** en la tabla de locks, ninguna transferencia de lock puede nombrarlo, y no recibe `main_store`,
  `capability` ni autoridad de ningún tipo. Verificado además con testigos de bytes: correr Support no
  muta board, locks, Worker ni registry.
- [ ] Tarea T5.1.3.2 — RED: **ausencia de sustituto.** Un host sin delegación a subagente de contexto
  aislado rechaza la continuación autónoma con `CT_HOST_CAPABILITY_MISSING`; **no existe ninguna ruta
  de fallback en línea** que ejecute Support dentro del contexto de Main.
- [ ] Tarea T5.1.3.3 — RED/GREEN: **wiring de Main en `plugin/tower-spike.js`, el único composition
  root que prueba la autoridad canónica de Main.** La plugin recibe `trustedBindingProvider` al
  inicializarse, liga y verifica `main_session_id` mediante `main-store/authority.mjs` importado sin
  modificar, y **recién después** de esa verificación obtiene el store y la capability. Rechaza todo
  `context.sessionID` distinto del Main ligado. Ante provider o binding **ausente, inválido o de otra
  sesión** falla cerrado **antes** de cualquier spawn o persistencia. El RED debe fallar si la plugin
  fabrica el provider, llama a `readValidatedMainStoreBinding` o a cualquier reader de `core.mjs`, o
  si el test sólo reemplaza `core.mjs` por un mock sin observar la inyección. Valida la respuesta de
  Support contra `support-proposal-v1` y persiste ella misma; el subagente no tiene entrada propia en
  el registry. **No se crea un adaptador Main separado y no se usa el capability registry para otorgar
  autoridad.** `bun test test/plugin test/continuation test/main-store.test.mjs`.

**Estado del candidato investigado, para que el re-sello no se lea como verificación.** El candidato
inicializa `TowerSpikePlugin` sin `trustedBindingProvider`, llama a
`readValidatedMainStoreBinding(worktree)` desde `core.mjs` antes del spawn y vuelve a llamarlo al
rederivar autoridad. Su test mockea ese reader, por lo que puede quedar verde sin demostrar la
inyección aprobada. Ese candidato es inválido contra este contrato y debe corregirse antes de la
verificación de `S5.1`.

**Criterios de aceptación de S5.1** — todos deben pasar para cerrar:

- [ ] Dos contenidos distintos nunca resuelven a la misma `candidate_revision`
- [ ] Un candidato cuya identidad cambió no se consume bajo la autorización previa
- [ ] Una operación repetida sobre el mismo candidato no produce un segundo efecto remoto
- [ ] El authorization store valida contra `authorization-v1` y no contra ninguna lista de campos escrita a mano
- [ ] Una autorización consumida más de una hora después de emitida se rechaza
- [ ] **Todo efecto irreversible exige Jornada `ACTIVE` y `jornada_revision` actual**, y falla cerrado ante Jornada terminal, revisión desactualizada o Jornada ausente
- [ ] Una autorización emitida bajo una `jornada_revision` anterior no se consume después de una transición de Jornada
- [ ] **No existe revocación activa en cascada:** terminar una Jornada no muta ninguna capability ni ninguna autorización
- [ ] **No existe garbage collector ni poda** de capabilities discontinuadas en ninguna ruta
- [ ] Una capability equivalente se reemplaza por `agent_role` + `capability`, sin acuñar un ID nuevo
- [ ] La derivación no avanza con memoria narrativa: sin cumplimiento en el ledger no hay avance
- [ ] Un claim del Worker en desacuerdo produce `CT_CLAIM_MISMATCH`, sin assignment y nombrando ambos valores
- [ ] Un claim del Worker que coincide registra evidencia y no otorga ningún privilegio
- [ ] Support no figura en el board ni en la tabla de locks, y ninguna transferencia de lock puede nombrarlo
- [ ] Un host sin delegación a subagente aislado rechaza la continuación con `CT_HOST_CAPABILITY_MISSING`, sin sustituto en línea
- [ ] **`plugin/tower-spike.js` es el único composition root que prueba la autoridad de Main y recibe `trustedBindingProvider` al inicializarse:** omitir la inyección falla antes de spawn o persistencia; la plugin no fabrica el provider ni llama a `readValidatedMainStoreBinding` o a otro reader de `core.mjs`, y un test que sólo mockea `core.mjs` no satisface el criterio
- [ ] **Un `context.sessionID` distinto del Main ligado se rechaza**, y el rechazo nombra la sesión rechazada
- [ ] **Binding ausente, inválido o de otra sesión falla cerrado ANTES de cualquier spawn o persistencia** — no después
- [ ] **Un `main_store` simulado o construido por fuera de la verificación se rechaza:** el store y la capability sólo se obtienen después de que `main-store/authority.mjs` verifique el binding
- [ ] **Support no recibe `main_store`, `capability` ni autoridad por ninguna ruta**, y su respuesta se valida contra `support-proposal-v1` antes de persistirse
- [ ] **Correr Support no muta board, locks, Worker ni registry**, verificado por testigos de bytes en éxito y en rechazo
- [ ] La autoridad no se deriva de ninguna entrada del capability registry
- [ ] `core.mjs` sigue opaco al plan: ninguna coordenada de plan se resuelve fuera de registros propiedad de Main
- [ ] `candidate-revision-v1` está registrado en `contracts/schema-registry.mjs` y tiene su caso en el fixture de contratos
- [ ] `bun test test/continuation test/main-store.test.mjs test/contracts` pasa completo
- [ ] `bun test` no introduce fallos nuevos sobre la línea base que deje `S3.4`
- [ ] El diff de implementación no toca ninguna ruta del `Prohibido`

## Sesión 5.2 — Change F delivery adapters/reconciliation

**Estado:** 📋 PLANIFICADO — **contrato ejecutable sellado el 2026-08-04** sobre `origin/master@e4bad7a`. Espera a `S4.1`, no espera decisiones.

**Depende de:** `S4.1`, `S3.3` ✅.

**Área:** `delivery/**`, `schemas/delivery-record-v1.schema.json`, `contracts/{schema-registry,validate}.mjs`, `test/delivery/**`, `test/contracts/schema.test.mjs`, `test/fixtures/contracts/schema-cases-v1.json`

**Prohibido:** `core.mjs`, `mcp.mjs`, `main-store/store.mjs`, `continuation/**`, `escalation/**`, `hosts/**`, `capabilities/**`, `policy/**`, `jornada/**`, `registry/**`, `workspace/**`, `openspec/plans/**`, `openspec/specs/**`

**Recurso:** Main / ninguno. Registro append-only propio por CAS de filesystem en `delivery/**`. **Sin migraciones de SQLite y sin `db-writer`** — ver la decisión de ledger más abajo.

**Entrega:** commit directo a `master` + push, sin PR ([`AGENTS.md`](../../../AGENTS.md)). Dos commits, como `S3.1`–`S3.4`. Forecast **210–290 líneas** ([`role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/tasks.md)), por debajo del borde de encadenado de 400: no se parte.

Implementa commit, push y PR idempotentes, checks, revisión, autorización exacta y reconciliación de resultados desconocidos.

**Colisión de IDs en `M5.2.1` — resuelta como `derivable`, no escalada.** Igual que `M5.1.1`, está definido dos veces: `Adapters/reconciliation` en el [`tasks.md` de `checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s52-change-f-delivery--m521-adaptersreconciliation) con **cuatro** Tareas, y `Main dispatch` en el [`tasks.md` de `role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/tasks.md) con **tres**. **Gobierna `Adapters/reconciliation`,** y acá no hizo falta escalarlo porque la evidencia es decisiva: la prosa de esta Sesión cita el rango `T5.2.1.1`–`T5.2.1.4`, y **sólo `checkpointed` tiene cuatro Tareas**. Lo confirman las tres decisiones `derivable` de abajo, todas de entrega y reconciliación, ninguna de despacho, más el precedente que el maintainer fijó en `M5.1.1`. **Consecuencia:** el contenido de Main dispatch —`continuation/coordinator.mjs`, `assignment-v2`, despacho Support/Worker— **sale del alcance de `S5.2`** y cae en el mismo bucket huérfano que el dry-run desplazado de `S5.1`, sin ID asignado.

**Decisiones:**

- `derivable` — la forma de la entrega de cada proyecto. **Criterio:** el bloque `delivery-policy` de su `AGENTS.md`, con `shape` en `direct-push` o `pull-request`, y default fail-closed al valor más restrictivo cuando el bloque falta. Falsificable: un repositorio sin bloque que termine entregando por el camino más permisivo. **Autoridad:** [`AGENTS.md`](../../../AGENTS.md) y el corte de `d232fdf`.
- `derivable` — qué hace la reconciliación ante un resultado desconocido. **Criterio:** consulta el estado remoto real antes de reintentar; nunca asume que el efecto no ocurrió. Un timeout no distingue "no llegó" de "llegó y la respuesta se perdió", y asumir lo primero es exactamente cómo se duplica una entrega. Falsificable: un test donde el efecto ocurrió, la respuesta se perdió, y el reintento produce un segundo efecto. **Autoridad:** el alcance declarado de `S5.2`.
- `derivable` — qué identifica una entrega para efectos de idempotencia. **Criterio:** la `candidate_revision` congelada, no un identificador generado en el momento del intento. Falsificable: dos intentos sobre el mismo candidato que se consideren entregas distintas. **Autoridad:** `S5.1`.
- `escala` — cuántas veces se reintenta antes de parar. **Clase:** operaciones irreversibles. **RESUELTA el 2026-08-04 por el maintainer: tres intentos, con reconciliación obligatoria antes de cada reintento.** Agotados los tres, para y escala. **El tope no es lo que evita la duplicación** —eso ya lo cierran las dos decisiones `derivable` de arriba: la reconciliación consulta el estado remoto real antes de reintentar y nunca asume que el efecto no ocurrió, y la identidad de idempotencia es la `candidate_revision` congelada, no un ID por intento—. El tope sólo acota **cuánto insiste** antes de rendirse. Si la reconciliación determina que el efecto **sí** ocurrió, se marca entregada y **no** se reintenta, sin importar el contador. Falsificable: un cuarto intento, o cualquier reintento emitido sin reconciliar antes. **Autoridad:** decisión del maintainer del 2026-08-04. **Contaminaba:** `S5.3` y `S7.1`, ambas destrabadas — su piloto de "cero efectos remotos duplicados" ahora tiene un número concreto que medir.
- `escala` — qué se hace ante una entrega parcial que no se puede reconciliar. **Clase:** operaciones irreversibles. **RESUELTA el 2026-08-04 por el maintainer: frena esa entrega, no la Torre.** La entrega pasa a un estado terminal explícito `CT_DELIVERY_UNRECONCILED`, el candidato queda congelado, el ledger registra el estado, y **no se emite ninguna mutación remota adicional** — ni siquiera un revert, porque "no se puede reconciliar" significa que no se sabe qué ocurrió, y revertir a ciegas es una segunda mutación sobre estado desconocido. La decisión queda **estacionada** para el maintainer, con pregunta exacta y evidencia. **La Torre continúa con trabajo que no dependa de esa entrega.** Falsificable: cualquier efecto remoto emitido después de entrar en el estado terminal, o una Torre que se detenga entera ante una entrega irreconciliable de un solo proyecto. **Autoridad:** decisión del maintainer del 2026-08-04, y el floor de "sin mutación remota prematura". **Contaminaba:** `S5.3`, cuya base integrada asume un estado remoto conocido y por lo tanto debe **rechazar** una base marcada `CT_DELIVERY_UNRECONCILED`, y `S5.5`, que es donde vive la decisión estacionada. Ambas destrabadas.
- `escala` — dónde vive el registro de entrega de git, y en particular el estado terminal `UNRECONCILED`. **Clase:** migraciones o pérdida de datos. **RESUELTA el 2026-08-04 por el maintainer: registro propio y append-only en `delivery/**`; `ct_delivery` no se toca y no hay migración.** El disparador fue concreto: `ct_delivery.delivery_state` tiene un `CHECK` duro a `PENDING|CLAIMED|CLOSED` (`core.mjs:333`), así que el estado nuevo no cabía sin migrar. **La razón de fondo es que son dos géneros distintos que comparten la palabra "delivery":** `ct_delivery` modela **handoffs de worker** —`handoff_id`, `generation`, `purpose WORK/ATTESTATION_REDELIVERY`, `claim_id`—, mientras que lo que `S5.2` entrega es commit, push y PR. El registro de `S5.2` liga `candidate_revision` —la identidad congelada de `S5.1`—, `shape`, el contador de intentos y `authorization_ref`. Falsificable: cualquier diff de `S5.2` que toque `core.mjs`, agregue una migración de SQLite o escriba en `ct_delivery`. **Autoridad:** decisión del maintainer del 2026-08-04, y el registro de que una migración no vence.
  **Costo aceptado:** conviven dos ledgers append-only en el árbol. Se acepta porque modelan cosas distintas y ninguno es fuente de verdad del otro; el precio de unificarlos era una migración irreversible sobre una tabla en producción. **Corrige un dato del plan:** `plan-3/STATUS.md` decía que el `db-writer` aparecía en `S5.2`. Ya no: `S5.2` no escribe en el SQLite de la Torre.

### Módulo M5.2.1 — Adapters y reconciliación

- [ ] Tarea T5.2.1.1 — RED: remoto, refspec y head **explícitos**; ignorar la rama de tracking,
  reconciliar antes del primer push, y bloquear cualquier destino que no coincida con el declarado.
- [ ] Tarea T5.2.1.2 — RED: repositorio, head y base explícitos por argv, con entorno separado;
  rechazar composición de comandos, prefijo de entorno y `--head` ausente.
- [ ] Tarea T5.2.1.3 — RED: clasificación de resultados. Cuota o facturación → `quota_exhausted`;
  caída, 5xx o timeout sondeado → `provider_unavailable`; checks incompletos → `checks_pending`;
  ambiguo → `unknown` bloqueado. **Más los dos casos que resolvió el maintainer:** el tercer
  reintento fallido para y escala, y un resultado ambiguo que no se puede reconciliar entra en
  `UNRECONCILED` sin emitir ninguna mutación remota adicional.
- [ ] Tarea T5.2.1.4 — GREEN/REFACTOR: la secuencia `commit → verificar commit/árbol → freeze →
  push/PR`, con el registro append-only propio de `delivery/**` y el binding a la autorización de
  `S5.1`, importada sin modificar. Registrar `delivery-record-v1` en `contracts/schema-registry.mjs`,
  sumar su invariante en `contracts/validate.mjs` y su caso al fixture.
  `bun test test/delivery test/contracts`.

**Criterios de aceptación de S5.2** — todos deben pasar para cerrar:

- [ ] La forma de entrega sale del bloque `delivery-policy` del proyecto, y un repositorio sin bloque resuelve al valor más restrictivo
- [ ] Remoto, refspec y head son explícitos; la rama de tracking nunca decide el destino
- [ ] Un destino que no coincide con el declarado se bloquea antes de emitir nada
- [ ] Composición de comandos, prefijo de entorno y `--head` ausente se rechazan
- [ ] Dos intentos sobre el mismo candidato se consideran la **misma** entrega: la identidad es la `candidate_revision` congelada, nunca un ID por intento
- [ ] **Se reintenta como máximo tres veces, y cada reintento va precedido de reconciliación** contra el remoto real
- [ ] **Si la reconciliación determina que el efecto sí ocurrió, se marca entregada y no se reintenta**, sin importar el contador
- [ ] Un efecto que ocurrió con la respuesta perdida **no** produce un segundo efecto al reintentar
- [ ] Cuota, caída, checks incompletos y ambigüedad se clasifican en `quota_exhausted`, `provider_unavailable`, `checks_pending` y `unknown` bloqueado
- [ ] **Una entrega irreconciliable entra en `UNRECONCILED`, congela el candidato y no emite ninguna mutación remota adicional** — tampoco un revert
- [ ] **La Torre continúa con trabajo independiente** después de una entrega `UNRECONCILED`; no se detiene entera
- [ ] El registro de entrega es append-only y vive en `delivery/**`: **ninguna ruta escribe en `ct_delivery` ni requiere migración de SQLite**
- [ ] La autorización se consume por el store de `S5.1`, importado sin modificar; `S5.2` no abre una segunda ruta de escritura ni crea autoridad
- [ ] `delivery-record-v1` está registrado en `contracts/schema-registry.mjs` y tiene su caso en el fixture de contratos
- [ ] `bun test test/delivery test/contracts` pasa completo y `bun test` no introduce fallos nuevos sobre la línea base que deje `S4.1`
- [ ] El diff no toca ninguna ruta del `Prohibido` — en particular `core.mjs`

## Sesión 5.3 — Change G integrated-base continuation

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S5.2` integrada.

Aplica el horizonte de dos Sesiones, reconcilia la base integrada y habilita sucesores sólo desde evidencia fresca. La definición de `M5.3.1` y `T5.3.1.1`–`T5.3.1.3` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s53-change-g--m531-integrated-base).

**Decisiones:**

- `derivable` — cuántas Sesiones se planifican por delante. **Criterio:** `planning.horizon_ceiling` del bloque `delivery-policy`, hoy `2` en este repositorio. Es configuración declarada, no criterio del agente. Falsificable: una planificación que exceda el techo declarado. **Autoridad:** [`AGENTS.md`](../../../AGENTS.md).
- `derivable` — de dónde se deriva el siguiente Módulo. **Criterio:** la enumeración del plan por digest más el ledger inmutable `ct_delivery`/`ct_claim`, **nunca** engram. Engram hace upsert por `topic_key` y no está atado al contenido del repositorio, así que un cierre de Módulo que no toca documentación lo deja mintiendo. Falsificable: una derivación que cambie de respuesta sin que cambie ni el plan ni el ledger. **Autoridad:** el delta de `d232fdf`.
- `derivable` — qué es evidencia fresca. **Criterio:** evidencia producida contra la base ya integrada, no contra la que existía cuando el sucesor se planificó. Falsificable: un sucesor habilitado por evidencia anterior a la integración de su predecesor. **Autoridad:** el alcance declarado de `S5.3`.
- `escala` — qué pasa cuando la base integrada divergió de la que el sucesor asumía. **Clase:** dependencias o evidencia contradictorias. Rebasar el sucesor cambia su contenido después de haber sido planificado; descartarlo tira trabajo hecho. **Contamina:** `S7.1`, cuyo piloto de rechazo de candidatos stale mide precisamente este caso.

## Sesión 5.4 — Ruteo de escalamiento fuera/en casa

**Estado:** 📋 PLANIFICADO — **contrato ejecutable sellado el 2026-08-04** sobre `origin/master@d32d413`. Espera a `S5.1`, no espera decisiones.
**Depende de:** `S5.1`
**Área:** `escalation/**`, `test/escalation/**`
**Prohibido:** `main-store/store.mjs`, `core.mjs`, `mcp.mjs`, `delivery/**`, `continuation/**`, `capabilities/**`, `policy/**`, `jornada/**`, `registry/**`, `contracts/**`, `schemas/**`, `openspec/plans/**`, `openspec/specs/**`
**Recurso:** estado de ruteo persistido, propiedad de `escalation/**`. Sin migraciones de DB, sin `db-writer`, sin token de entrega.
**Entrega:** commit directo a `master` + push, sin PR ([`AGENTS.md`](../../../AGENTS.md)). Dos commits, como `S3.1`–`S3.4`: uno de implementación y uno documental de cierre. Forecast **derivado** —no había uno en el registro, porque `S5.4` se enumeró después del corte de `d232fdf`—: ~200–280 líneas sobre tres Módulos y nueve Tareas, **por debajo** del borde de encadenado de 400, así que no se parte.

**Por qué `main-store/store.mjs` está en el `Prohibido` aunque `S5.4` escriba ahí.** La solicitud emitida se persiste en el authorization store, que es **propiedad exclusiva de `S5.1`**. `S5.4` lo **llama**, nunca lo edita — es exactamente lo que exige la decisión `derivable` de más abajo: sin abrir una segunda ruta de escritura. Dos rutas al mismo estado es la causa raíz que `6d37642` reparó en este mismo Plan.

**Por qué `schemas/**` y `contracts/**` están prohibidos.** El modo de ruteo es **estado interno de `escalation/**`, no un contrato entre agentes**: nadie fuera de ese módulo lo lee. La solicitud emitida sí es un contrato, pero su forma la define `S5.1` en el authorization store, no esta Sesión. `S5.4` no necesita registrar ningún schema nuevo.

Hoy, cuando un agente llega a una decisión que requiere autoridad del maintainer, **se frena y espera**: no emite nada y nadie se entera. Un canal a Telegram sin esto es un tubo vacío. `S5.4` es la mitad que faltaba — que Main **emita** la solicitud de decisión y sepa **a dónde mandarla**.

El modo es explícito y de dos valores: `local` cuando el maintainer está frente a la máquina, `remoto` cuando no. Ante estado ausente, ilegible o ambiguo el modo resuelve a `local`: no escalar es un inconveniente, escalar por un canal que no debía estar abierto es una fuga.

`S5.4` produce y rutea la solicitud. **No la autoriza** — el sobre, el nonce y el consumo son de `S5.1`, y el transporte a Telegram es de `S8.7`.

**Decisiones:**

- `derivable` — a qué resuelve el modo ante estado ausente, ilegible o ambiguo. **Criterio:** `local`. No escalar es un inconveniente; escalar por un canal que no debía estar abierto es una fuga, y los dos costos no son comparables. Falsificable por un fixture con estado corrupto que emita hacia un transporte remoto. **Autoridad:** el alcance declarado de `S5.4`.
- `derivable` — qué vuelve emitible a una solicitud. **Criterio:** objetivo exacto, origen y expiración; sin objetivo exacto falla cerrado. Una solicitud sin objetivo exacto se responde "depende" y cuesta un viaje completo. Falsificable por el criterio de aceptación ya escrito. **Autoridad:** los criterios de aceptación de `S5.4`.
- `derivable` — dónde se persiste la solicitud emitida. **Criterio:** el authorization store de `S5.1`, sin abrir una segunda ruta de escritura. Dos rutas de escritura al mismo estado es la causa raíz que `6d37642` acaba de reparar en este mismo Plan. Falsificable: cualquier escritura de solicitudes fuera del store. **Autoridad:** `T5.4.1.2`.
- `derivable` — qué pasa con la solicitud si el transporte remoto falla. **Criterio:** queda pendiente y recuperable localmente; el fallo de transporte **nunca** la consume ni la descarta. Falsificable por el caso de `M5.4.3`. **Autoridad:** los criterios de aceptación de `S5.4`.
- `escala` — quién puede conmutar el modo de ruteo. **Clase:** seguridad y permisos. **RESUELTA el 2026-08-04 por el maintainer: sólo el maintainer, por dos vías autenticadas, y ningún agente.** Las dos vías son (1) **CLI local autenticada** y (2) **callback remoto autenticado** desde el teléfono. **Main y los agentes no pueden conmutarlo automáticamente por ninguna ruta** — el conmutador decide si las preguntas salen de la máquina, y un agente que pudiera ponerlo en `remoto` se abriría su propio canal. Ante identidad **ausente, inválida o ambigua** la resolución es `local`, igual que ante estado corrupto: los dos costos no son comparables. Falsificable: cualquier ruta en la que Main, un agente o una identidad no verificada cambie el modo, o en la que una identidad dudosa termine emitiendo hacia un transporte remoto. **Autoridad:** decisión del maintainer del 2026-08-04. **Contaminaba:** `S8.7` y `S5.5`, ambas destrabadas.
  **La vía remota queda definida pero INHABILITADA, y eso es lo que evita la dependencia circular.** `S5.4` declara la frontera y el contrato del conmutador; **no inventa transporte ni autenticación**. Hasta que `S8.7` entregue autenticación válida, la ruta remota no se habilita: intentar conmutar a `remoto` por callback falla cerrado por autenticación ausente, y el modo permanece `local`. Así `S5.4` **funciona entera sin `S8.7`** —el conmutador local autenticado alcanza para operar—, y `S8.7` después sólo conecta el callback ya contratado. Falsificable: una ruta remota que funcione antes de que `S8.7` entregue autenticación, o un `S5.4` que no pueda operar en local sin `S8.7`. `S5.4` **no** pasa a depender de `S8.7`: el grafo sigue siendo `S5.1 → S5.4 → S5.5`.

### Módulo 5.4.1 — Emisión de solicitud de decisión

- [ ] Tarea 5.4.1.1 — RED: agregar `test/escalation/request.test.mjs` para que un punto de decisión produzca una solicitud con objetivo exacto, origen y expiración, y para que una solicitud sin objetivo exacto falle cerrado.
- [ ] Tarea 5.4.1.2 — GREEN: implementar la emisión reutilizando el authorization store de `S5.1`, sin abrir una segunda ruta de escritura.
- [ ] Tarea 5.4.1.3 — REFACTOR: normalizar códigos de error estables y volver a correr `bun test test/escalation`.

### Módulo 5.4.2 — Modo de ruteo

- [ ] Tarea 5.4.2.1 — RED: agregar `test/escalation/routing.test.mjs` para el conmutador `local` ↔ `remoto`, su idempotencia y su persistencia entre procesos, **más la frontera de autoridad**: conmutan sólo las dos vías autenticadas del maintainer —CLI local y callback remoto—, y **todo intento de Main o de un agente falla cerrado**, nombrando al actor rechazado.
- [ ] Tarea 5.4.2.2 — RED: agregar los casos fail-closed. Estado ausente, corrupto o ambiguo resuelve a `local` y no emite hacia ningún transporte remoto; **identidad ausente, inválida o ambigua resuelve a `local` por el mismo camino**, sin ruta separada que pueda divergir.
- [ ] Tarea 5.4.2.3 — GREEN: implementar la resolución de modo y el despacho de la solicitud al transporte correspondiente, **con la vía remota definida pero inhabilitada**: sin la autenticación que entrega `S8.7`, conmutar a `remoto` por callback falla cerrado y el modo queda `local`. La CLI local autenticada alcanza para operar la Sesión entera.

### Módulo 5.4.3 — Degradación y no mutación

- [ ] Tarea 5.4.3.1 — RED: agregar el caso de transporte remoto ausente o caído estando en modo `remoto`.
- [ ] Tarea 5.4.3.2 — GREEN: confirmar que la solicitud queda pendiente y recuperable localmente, y que el fallo de transporte nunca la consume ni la descarta.
- [ ] Tarea 5.4.3.3 — Verificar con testigos de bytes que consultar el modo de ruteo no muta registro, DB, WAL, SHM ni estado de Torre.

**Criterios de aceptación de S5.4** — todos deben pasar para cerrar:

- [ ] Un punto de decisión que requiere autoridad del maintainer emite una solicitud con objetivo exacto; una sin objetivo exacto falla cerrado
- [ ] El modo de ruteo persiste entre procesos y conmutar es idempotente
- [ ] **Sólo las dos vías autenticadas del maintainer conmutan el modo:** CLI local autenticada y callback remoto autenticado
- [ ] **Main y cualquier agente fallan cerrado al intentar conmutar el modo**, y el rechazo nombra al actor
- [ ] Estado de modo ausente, corrupto o ambiguo resuelve a `local` y no emite hacia ningún transporte remoto
- [ ] **Identidad ausente, inválida o ambigua resuelve a `local`** por el mismo camino que el estado corrupto, sin una ruta separada que pueda divergir
- [ ] **La vía remota está definida pero inhabilitada hasta `S8.7`:** conmutar a `remoto` por callback falla cerrado por autenticación ausente
- [ ] **`S5.4` opera entera en modo `local` sin `S8.7`**: ninguna de sus rutas requiere el transporte para funcionar
- [ ] `S5.4` no inventa transporte ni autenticación: no existe en su diff ninguna implementación de canal ni de verificación de identidad remota
- [ ] Un fallo del transporte remoto deja la solicitud pendiente y recuperable, nunca consumida ni descartada
- [ ] La solicitud emitida se persiste en el authorization store de `S5.1`, sin abrir una segunda ruta de escritura
- [ ] Consultar el modo es read-only, verificado por testigos de bytes en éxito y en rechazo
- [ ] `S5.4` no crea, valida ni consume autoridad: esa ruta sigue siendo exclusiva de `S5.1`
- [ ] `bun test test/escalation` pasa completo y `bun test` no introduce fallos nuevos sobre la línea base que deje `S5.1`
- [ ] El diff no toca ninguna ruta del `Prohibido` ni ninguna fuera del `Área`

## Sesión 5.5 — Decisión estacionada y continuación independiente

**Estado:** 📋 PLANIFICADO
**Depende de:** `S5.4` integrada
**Área:** `escalation/{parked,contamination,resume}.mjs`, `schemas/parked-decision-v1.schema.json`, `test/escalation/**`
**Prohibido:** `continuation/**`, `core.mjs`, `mcp.mjs`, `delivery/**`
**Recurso:** ledger append-only de decisiones estacionadas. Sin token de entrega.

`S5.4` hace que la pregunta **salga**. `S5.5` es lo que hace que la Torre **no se quede
esperando la respuesta**: es la Sesión que convierte la planificación en diferible.

Hoy el formato de plan ya declara por adelantado dependencias, `Área`, `Recurso` y
criterios binarios. Eso es el dato. Nadie lo **consume** todavía para decidir qué se
estaciona y qué puede seguir. Sin esta Sesión, una sola decisión pendiente frena la
corrida entera, que es exactamente el costo que el formato existía para evitar.

`S5.5` **no crea, valida ni consume autoridad** —eso sigue siendo exclusivo de `S5.1`— y no
duplica la emisión ni el ruteo de `S5.4`. Comparte prefijo de `Área` con `S5.4`, así que
por diseño **nunca corren en paralelo**: `S5.5` sólo abre con `S5.4` integrada.

**Decisiones:**

- `derivable` — de dónde sale el scope de contaminación. **Criterio:** la enumeración del plan por digest más el ledger inmutable, y **falla si intenta leer engram**. Engram hace upsert por `topic_key` y no está atado al contenido del repositorio, así que un cierre de Módulo que no toca documentación lo deja desactualizado sin avisar. Falsificable por `T5.5.2.1`. **Autoridad:** el delta de `d232fdf`.
- `derivable` — qué hace un caso de contaminación ambiguo. **Criterio:** resuelve a **contaminada**. Sobre-incluir cuesta capacidad ociosa unas horas; sub-incluir entrega trabajo construido sobre una suposición que nadie aprobó, y aparece en el merge, cuando las dos implementaciones ya existen. Los costos no son simétricos. Falsificable por `T5.5.2.2`. **Autoridad:** §11 del [estándar de planes](/home/emili/.claude/skills/_shared/plan-naming-convention.md).
- `derivable` — qué vuelve estacionable a una decisión. **Criterio:** pregunta exacta, evidencia, opciones enumeradas con su consecuencia, origen, checkpoint y clase. Sin opciones enumeradas no es una decisión, es una pregunta, y escalar "¿qué hacemos acá?" vuelve "depende". Falsificable por `T5.5.1.2`. **Autoridad:** el registro de decisión estacionada de §11.
- `derivable` — qué hace la Torre con cero candidatos independientes. **Criterio:** se detiene y lo reporta; nunca inventa trabajo ni relaja un criterio para encontrar algo que hacer. Falsificable por `T5.5.3.2`. **Autoridad:** los criterios de aceptación de `S5.5`.
- `derivable` — si el scope congelado puede recalcularse mientras la decisión sigue abierta. **Criterio:** no; se congela **dentro** del registro, no fuera. Un scope que se recalcula puede encoger después de que ya se eligió trabajo en base a él. Falsificable por `T5.5.2.3`. **Autoridad:** el `Recurso` append-only de esta Sesión.
- `escala` — qué pasa con el trabajo ya hecho cuando la decisión estacionada se responde en contra. **Clase:** dependencias o evidencia contradictorias. Es el caso en el que la Torre eligió bien según el scope congelado y la respuesta igual invalida lo construido. **Contamina:** `S5.3`, cuya continuación consume el resultado, y `S7.1`, que lo verifica.

### Las ocho clases que siempre escalan

No son heurística: una decisión que cae en cualquiera de estas **nunca** se deriva sola,
aunque exista autoridad aprobada y criterios falsificables.

Contrato visible del producto · operaciones irreversibles · migraciones o pérdida de datos ·
API pública · seguridad y permisos · dinero, precios o cuotas · expansión de alcance ·
dependencias o evidencia contradictorias.

### Módulo 5.5.1 — Registro de la decisión estacionada

- [ ] Tarea 5.5.1.1 — RED: agregar `test/escalation/parked.test.mjs` para que una decisión no derivable produzca un registro inmutable con la pregunta exacta, la evidencia que la disparó, las opciones enumeradas con su consecuencia, la Sesión/Módulo de origen, el checkpoint y la clase de escalamiento.
- [ ] Tarea 5.5.1.2 — RED: agregar el caso fail-closed — un registro sin opciones enumeradas, sin evidencia o sin checkpoint se rechaza; no se estaciona una pregunta que nadie puede contestar.
- [ ] Tarea 5.5.1.3 — GREEN: implementar `escalation/parked.mjs` y `schemas/parked-decision-v1.schema.json` sobre el ledger append-only, reutilizando la solicitud de `S5.4` sin abrir una segunda ruta de escritura.
- [ ] Tarea 5.5.1.4 — REFACTOR: normalizar códigos de error estables y volver a correr `bun test test/escalation`.

### Módulo 5.5.2 — Scope de contaminación

- [ ] Tarea 5.5.2.1 — RED: agregar `test/escalation/contamination.test.mjs` para que el scope se derive de la **enumeración del plan por digest** más el ledger inmutable, y falle si intenta leer engram.
- [ ] Tarea 5.5.2.2 — RED: agregar los tres criterios de contaminación — dependencia en el grafo, `Área` o `Recurso` compartido, y criterio de aceptación que referencia la misma decisión — más el caso ambiguo, que resuelve a **contaminada**.
- [ ] Tarea 5.5.2.3 — GREEN: implementar `escalation/contamination.mjs` y congelar el scope dentro del registro de la decisión, no fuera.
- [ ] Tarea 5.5.2.4 — REFACTOR: verificar con testigos de bytes que calcular el scope es read-only sobre plan, registro, DB, WAL y SHM.

### Módulo 5.5.3 — Selección de trabajo independiente

- [ ] Tarea 5.5.3.1 — RED: agregar `test/escalation/independent.test.mjs` para que una Sesión sólo sea elegible si es 🟢 LISTO, no está en el scope congelado, no depende de la bloqueada en el grafo y tiene `Área` **y** `Recurso` disjuntos.
- [ ] Tarea 5.5.3.2 — RED: agregar el caso de cero candidatos — la Torre se detiene y lo reporta; nunca inventa trabajo ni relaja un criterio para encontrar algo que hacer.
- [ ] Tarea 5.5.3.3 — GREEN: implementar la selección como lectura, ejercida por Main. El worker no se autoasigna.

### Módulo 5.5.4 — Retoma desde el checkpoint

- [ ] Tarea 5.5.4.1 — RED: agregar `test/escalation/resume.test.mjs` para que una respuesta validada por `S5.1` cierre la decisión y levante el bloqueo **sólo** sobre las Sesiones del scope congelado, nunca sobre otras.
- [ ] Tarea 5.5.4.2 — RED: agregar el caso de checkpoint rancio — si la base se movió desde que se estacionó, la retoma **no** es automática: exige reconciliación nueva.
- [ ] Tarea 5.5.4.3 — RED: agregar el caso de respuesta no validada, vencida o de origen equivocado — no levanta nada y no muta el registro.
- [ ] Tarea 5.5.4.4 — GREEN: implementar `escalation/resume.mjs` retomando desde el checkpoint exacto registrado.

**Criterios de aceptación de S5.5** — todos deben pasar para cerrar:

- [ ] Una decisión no derivable produce un registro inmutable con pregunta exacta, evidencia, opciones con consecuencia, origen, checkpoint y clase
- [ ] Un registro sin opciones, sin evidencia o sin checkpoint falla cerrado
- [ ] Una decisión de cualquiera de las ocho clases nunca se deriva, aunque haya autoridad y criterios disponibles
- [ ] El scope de contaminación se deriva del plan por digest más el ledger, y **nunca** de engram
- [ ] Un caso ambiguo resuelve a contaminada: sobre-incluir es un costo, sub-incluir es el incidente
- [ ] El scope queda congelado dentro del registro y no se recalcula al retomar
- [ ] Sólo continúan Sesiones 🟢 LISTO, fuera del scope, sin dependencia en el grafo y con `Área` y `Recurso` disjuntos
- [ ] Con cero candidatos la Torre se detiene y lo reporta, sin relajar criterios
- [ ] La selección la ejerce Main; el worker no se autoasigna
- [ ] Una respuesta validada levanta el bloqueo sólo sobre el scope congelado y retoma desde el checkpoint exacto
- [ ] Un checkpoint rancio exige reconciliación y no retoma solo
- [ ] Una respuesta no validada, vencida o de origen equivocado no levanta nada ni muta el registro
- [ ] `S5.5` no crea, valida ni consume autoridad, y no duplica la emisión ni el ruteo de `S5.4`
- [ ] Calcular scope y elegibilidad es read-only, verificado por testigos de bytes en éxito y en rechazo
- [ ] `bun test test/escalation` pasa completo y `bun test` no introduce fallos nuevos
- [ ] El diff no toca `continuation/**`, `core.mjs`, `mcp.mjs` ni `delivery/**`

**Forecast:** 300–400 líneas, contra el techo de encadenado de 400. Si en apply se pasa, se
encadenan los Módulos bajo la misma Sesión — no se crea un nivel nuevo ni se parte en dos
Sesiones sin decisión explícita.

Las responsabilidades legacy de Telegram Delivery y continuación que aún no tienen límite de un PR permanecen sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
