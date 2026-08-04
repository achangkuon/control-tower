# Plan 3 — Workspace y orquestación

**Estado:** 📋 PLANIFICADO

> **`S3.1` ✅ COMPLETO en `d8924a6`; `S3.2` ✅ COMPLETO en `22c43ae`.** `S3.2` deja
> Policy/Jornada y la resolución fail-closed de delivery policy verificadas. El siguiente nodo
> del grafo, `S3.3`, tiene su única decisión `escala` resuelta, pero sigue 📋 PLANIFICADO: su
> `Área` no incluye `contracts/schema-registry.mjs`, no existen los paths `capabilities/**` ni
> `test/capabilities/**`, y falta sellar su contrato técnico mediante `session-plan`.
>
> **`S3.2` cambió de contrato antes de empezar.** El corte política/seguridad de `d232fdf` le suma
> `M3.2.3` (resolución de la política de entrega declarada, con fail-closed al valor más
> restrictivo) y le sube el forecast a 310–410 líneas. Detalle en
> [`autonomous-v2-role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/).
> El prerrequisito de `authorization-v1` que colgaba de `S5.1` quedó ✅ resuelto en `6d37642`.

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Para Autonomous V2, `S3.1` partió de `master@33c2c6e` y quedó implementada en `d8924a6`, con `S2.4`/project registry verificada y cerrada; `S3.2` dependió de `S3.1` y `S3.3` depende de `S3.2` ✅. |
| Outputs | C: `inspect`, `create`, `retire`, receipts y wrapper legacy de `jornada.sh`. D: Main routing, Support briefs, Policy Reports, presets, snapshots, budgets y assignments. Más el Agent Capability Registry de `S3.3`. |
| Roadmap | `S3.1` y `S3.2` están cerradas. La duración predeterminada de disponibilidad de `S3.3` ya fue resuelta por el maintainer; antes de ejecutar la Sesión, `session-plan` debe sellar el contrato técnico, incluyendo el Área que requiere registrar su schema. El trabajo posterior no enumerado de Change B no fue dependencia de `S3.1`; las responsabilidades legacy sin límite de un PR permanecen sin ID. |
| Referencias | [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/). Los proposals `sdd-tower-workspace-manager` y `sdd-tower-main-policy-jornada` fueron eliminados en `613a45d` por ser cáscaras sin avance; su intención vive en este STATUS. |

## Sesión 3.1 — Change C Workspace checkpoint

**Estado:** ✅ COMPLETO

**Depende de:** `S2.4` ✅. Autoridad de base: `master@33c2c6e`; resultado: `d8924a6`. No tuvo predecesora dentro de la cadena aprobada.

**Área:** `workspace/checkpoint.mjs`, `test/workspace/checkpoint.test.mjs`

**Recurso:** —

Captura canónica de repositorio, base y resultado sin efectos remotos. Los artefactos de
`autonomous-v2-checkpointed-delivery` son referencia histórica; este `STATUS` es el contrato
ejecutable por la decisión documental vigente.

### Módulo M3.1.1 — Checkpoint

- [x] Tarea T3.1.1.1 — RED: selección Git por argv fijo y raíz canónica; rechazar `git -C`
  inyectado, relativo que escapa y raíz absoluta que no coincide.
- [x] Tarea T3.1.1.2 — RED: archivos y árbol explícitos; prohibir `commit -a`; rechazar drift
  en staging e índice vacío.
- [x] Tarea T3.1.1.3 — GREEN: implementar la captura.
- [x] Tarea T3.1.1.4 — REFACTOR: evidencia por bytes y modo.

**Decisiones:**

- `derivable` — cómo se selecciona Git y la raíz canónica. **Criterio:** toda invocación usa
  `execFileSync("git", argv, { cwd })` con argv de sólo lectura y la raíz devuelta por
  `rev-parse --show-toplevel` debe ser absoluta, normalizada y coincidir exactamente con la
  raíz validada; se rechazan `-C`, relativos que escapan y absolutos distintos. Falsificable:
  cualquiera de esos tres inputs llega a Git o produce una captura. **Autoridad:**
  `validateEnrollmentLayout`/`defaultGit` en `enroll/index.mjs` y la matriz Git del diseño C.
- `derivable` — qué referencias forman `base` y `result`. **Criterio:** cada una queda como OID
  completo de commit y su OID de árbol resuelto explícitamente; nunca como nombre de rama ni
  como estado implícito del índice. Falsificable: una rama, un OID abreviado o un árbol distinto
  de `<commit>^{tree}` produce una captura aceptada. **Autoridad:** matriz Commit/Git de
  `autonomous-v2-checkpointed-delivery/design.md` y el contrato de candidato que liga base,
  resultado y tree.
- `derivable` — cuándo rechazar el estado local antes de capturar. **Criterio:** staging no
  vacío o distinto del árbol esperado se rechaza; no se emite `commit -a` ni otro argv mutante.
  Falsificable: un recorder de Git observa un argv mutante, o un fixture con índice vacío/drift
  devuelve una captura en vez de fallar cerrado. **Autoridad:** T3.1.1.2 aprobada y el patrón de
  recorder de argv de `test/enroll/enroll.test.mjs`.
- `derivable` — cómo se prueba la evidencia de bytes y modo. **Criterio:** los bytes de evidencia
  usan `digestArtifact(bytes, "raw-bytes")` y la estructura de captura usa
  `digestArtifact(value, "rfc8785-jcs")`; una modificación de bytes o del modo esperado cambia
  el digest o falla la validación. Falsificable: dos entradas que difieren en bytes/modo conservan
  el mismo digest válido. **Autoridad:** `canonicalize` y `digestArtifact` en
  `contracts/canonicalize.mjs`.

**Criterios de aceptación de S3.1** — todos pasaron para cerrar:

- [x] Un fixture Git válido produce una captura inmutable con raíz canónica y OIDs completos de
  commit y árbol para `base` y `result`.
- [x] `git -C` inyectado, un relativo que escapa y una raíz absoluta distinta fallan cerrados sin
  crear commit, modificar refs ni ejecutar un argv Git mutante.
- [x] Un índice vacío, staging drift y cualquier intento de `commit -a` fallan cerrados; la
  captura sólo acepta archivos y árboles identificados explícitamente.
- [x] La evidencia de bytes `raw-bytes` y la estructura `rfc8785-jcs` producen digests SHA-256
  verificables y cambian ante la alteración correspondiente.
- [x] La captura no invoca red, push, fetch, PR ni escribe fuera del fixture Git.
- [x] `bun test test/workspace/checkpoint.test.mjs` pasó 11/0/23 y `bun test` pasó 476/0/2779.
- [x] El diff de M3.1.1 no toca ninguna ruta fuera de `workspace/checkpoint.mjs` y
  `test/workspace/checkpoint.test.mjs`.

**Evidencia de cierre:** implementación `d8924a6` (`feat(workspace): add canonical checkpoint
capture`); la corrección que liga evidencia a la captura quedó `CORROBORATED_FIXED`. La Torre
permaneció OFF y no hubo efectos remotos de runtime.

## Sesión 3.2 — Change D Global/project Policy/Jornada

**Estado:** ✅ COMPLETO

**Depende de:** `S3.1` ✅.

**Área:** `schemas/{reconciled-checkpoint-v1,support-proposal-v1,policy-report-v2,assignment-v2,recovery-proof-v1,delivery-policy-v1}.schema.json`, `policy/**`, `contracts/{validate,schema-registry}.mjs`, `main-store/store.mjs`, `test/{contracts,policy}/**`, `test/main-store.test.mjs`

**Prohibido:** `core.mjs`, `mcp.mjs`, `registry/**`, `continuation/**`, `capabilities/**`, `workspace/**`, `openspec/plans/**`, `openspec/specs/**`. Los tres últimos son un **acote** sobre lo que declaraba el `tasks.md`: `workspace/**` acaba de cerrar con `S3.1`, `capabilities/**` es el `Área` de `S3.3`, y `openspec/specs/**` está byte-pinned (ver la trampa más abajo).

**Recurso:** Main / ninguno. Sin migraciones de SQLite, sin `db-writer`, sin token de entrega. Las escrituras van por CAS de filesystem en `main-store/store.mjs` (root `0700`), nunca por el SQLite de la Torre; el `db-writer` recién aparece en `S5.2`.

**Entrega:** commit directo a `master` + push, sin PR ([`AGENTS.md`](../../../AGENTS.md)). **Dos commits**, como hizo `S3.1`: uno de implementación que respeta el `Prohibido`, y uno de cierre que toca `openspec/plans/**`. Es la única forma de que el diff de implementación no viole su propio `Prohibido` y el Documentation Close Gate quede satisfecho igual.

Define floors globales, herencia, snapshots Policy/Jornada, excepciones acotadas y auditoría.

**Son tres Módulos, no uno:** `M3.2.1` Authority/contracts, `M3.2.2` Policy/Jornada y
`M3.2.3` Delivery-policy resolution. Su definición vive en el
[`tasks.md` de `role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/tasks.md),
que es el que incorpora el corte de `d232fdf`. **Colisión de IDs — leela antes de ejecutar:** el
[`tasks.md` de `checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md)
usa `T3.2.1.1`–`T3.2.1.3` para contenido distinto (`RED floors/inheritance/exception` en vez de
`Git -C/escape/foreign-root`). Es referencia histórica y **no gobierna esta Sesión**.

**Trampa conocida en el Área — no la "arregles".** `schemas/plan-manifest-v1.schema.json` declara
`delivery_automation`, pero el bloque de ejemplo de
[REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md) todavía dice
`delivery_policy`. La divergencia es **deliberada**: ese archivo está byte-pinned como input
histórico por la revisión congelada 1
([`autonomous-v2/revisions/1/manifest.yaml:39-43`](../autonomous-v2/revisions/1/manifest.yaml)) y
`test/provenance/provenance.test.mjs:80-88` falla cerrado ante cualquier drift. Editarlo rompe la
suite. Corregir el ejemplo exige **publicar una revisión nueva del manifest**, que es trabajo de
otra Sesión, no de esta.

**Decisiones:**

- `derivable` — qué valor toma un campo de política ausente. **Criterio:** el más restrictivo; un repositorio sin bloque `delivery-policy` se comporta exactamente igual que antes de que el bloque existiera. Falsificable: si un campo ausente habilitara algo que el bloque explícito no habilita, el default estaba mal. **Autoridad:** el corte política/seguridad de `d232fdf` y el bloque `delivery-policy` de [`AGENTS.md`](../../../AGENTS.md).
- `derivable` — dónde vive la política declarada de un proyecto. **Criterio:** el bloque `delivery-policy` del `AGENTS.md` de ese proyecto, un solo lugar y legible por máquina. Falsificable: dos fuentes en el árbol que respondan la misma pregunta de política. **Autoridad:** [`AGENTS.md`](../../../AGENTS.md).
- `derivable` — qué gana cuando la política global y la del proyecto difieren. **Criterio:** el valor más restrictivo de los dos, no el más específico. La herencia acota, nunca amplía. Falsificable: un proyecto que declare una política más permisiva que la global y termine ejecutando la permisiva. **Autoridad:** los floors de seguridad de `d232fdf`.
- `escala` — si una excepción acotada puede relajar un floor de seguridad. **Clase:** seguridad y permisos. **RESUELTA el 2026-08-04 por el maintainer: no, ninguno de los cinco.** Los floors —sin mutación temprana, inmutabilidad del candidato congelado, ledger append-only, autoridad única de Main, sin autoasignación del worker— quedan fuera del alcance tanto de la configuración como de toda excepción. Dos de los cinco no admiten una excepción *acotada* ni siquiera técnicamente: el ledger se aplica por triggers DDL (`core.mjs:346-363`), así que relajarlo exige una migración y **una migración no vence**; y una excepción sobre la autoridad de Main tendría que ser otorgada por Main (`main-store/store.mjs:89-94`), o sea autoelevación circular. La excepción conserva alcance real y no queda decorativa: `effective_limits`, `delivery.shape`, `planning.horizon_ceiling`, `allowed_operations` y `allowed_hosts` — que es donde hace falta, porque la herencia sólo acota y sin excepción un proyecto sobre-restringido no puede volver al valor global. Falsificable: cualquier ruta en la que una excepción registrada habilite una operación que el floor prohíbe. **Autoridad:** decisión del maintainer del 2026-08-04, en [master-index](../master-index.md). **Contaminaba:** `S5.1`, `S5.2` y `S7.1`, las tres destrabadas — sus criterios de aceptación siguen siendo del tipo "no existe ninguna ruta", falsificables por ausencia.
- `escala` — qué queda registrado en la auditoría de una excepción. **Clase:** seguridad y permisos. **RESUELTA el 2026-08-04 por el maintainer.** El registro es un evento de autoridad §15.3 de [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), no un género nuevo, y reutiliza los `$defs` de `artifact-ref-v1` más la forma ya probada de `authorization-v1`. Mínimo: identidad (`exception_id`, `project_id`, `registry_revision`, `plan_id`, `jornada_id/revision`), objetivo (`policy_revision` + `policy_digest`, `candidate_ref`), `excepted_rule` como enum cerrado, `declared_scope` verificable por máquina, `granted_by`, `authorization_ref`, `created_at`/`expires_at`, `resulting_action`/`final_outcome`, y `previous_entry_digest`/`entry_digest`. Tres definiciones que la acompañan: la justificación se persiste **sólo como digest más puntero externo** —nunca texto libre, que es por donde se filtra un secreto que `assertCredentialFree` no ve y que además haría irreconciliable el borrado de §22 con el append-only—; la excepción la otorga **sólo un humano y vence con la Jornada**, deliberadamente distinto de la autorización de merge (una hora); y la cadena de hash es **por entrega, no por proyecto**, para no serializar la punta contra CAS. Falsificable: un registro que no permita reconstruir quién la otorgó y contra qué revisión de política. **Autoridad:** §15.3 y §22 de REQUIREMENTS, más la decisión del maintainer del 2026-08-04. **Contaminaba:** `S7.1`, destrabada.
- `derivable` — qué reglas pueden figurar en `excepted_rule`. **Criterio:** exactamente la superficie configurable, que es la que queda al excluir los cinco floors: `effective_limits`, `delivery.shape`, `delivery.target_branch`, `planning.horizon_ceiling`, `documentation_close.*`, `allowed_operations` y `allowed_hosts`. Dejó de ser `escala` al resolverse la decisión de floors: sin floors exceptuables, el enum ya no es una elección. Falsificable: un valor del enum que nombre un floor. **Autoridad:** la decisión de floors de arriba.

### Módulo M3.2.1 — Authority/contracts

**Estado:** ✅ COMPLETO

- [x] Tarea T3.2.1.1 — RED: extender `test/contracts/schema.test.mjs` con el drift de rol, proyecto
  y schema, y `test/main-store.test.mjs` con que **un registro de autoridad persistido sin
  identidad de actor falle cerrado**. Hoy `main-store/store.mjs:104,107` hace `actor: undefined` y
  `delete next.actor` antes de escribir, así que ningún registro contesta quién lo otorgó —
  contra §15.3 de [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), que
  exige identidad de actor en **todo** efecto de autoridad.
- [x] Tarea T3.2.1.2 — GREEN: implementar los cinco schemas `reconciled-checkpoint-v1`,
  `support-proposal-v1`, `policy-report-v2`, `assignment-v2` y `recovery-proof-v1`; registrarlos en
  `contracts/schema-registry.mjs`; escritura CAS ejercida sólo por Main; los códigos `CT_*`
  deterministas del diseño (`CT_ROLE_FORBIDDEN`, `CT_REPORT_STALE`, `CT_NO_EXECUTABLE_SCOPE`,
  `CT_POLICY_DENIED`, `CT_HORIZON_EXCEEDED`, `CT_POLICY_UNRESOLVED`, `CT_CLAIM_MISMATCH`,
  `CT_HOST_CAPABILITY_MISSING`); y la persistencia de la identidad de quien otorga.
- [x] Tarea T3.2.1.3 — REFACTOR: preservar los bytes de los contratos V1 ya aceptados y dejar el
  audit por digest con los campos de §15.3 completos. `bun test test/contracts test/main-store.test.mjs`.

### Módulo M3.2.2 — Policy/Jornada

**Estado:** ✅ COMPLETO

- [x] Tarea T3.2.2.1 — RED: agregar `test/policy/jornada.test.mjs` para Jornada inactiva y
  **vencida** —incluido que `consumeAuthorization` rechace una autorización pasada su `expires_at`,
  que hoy **no chequea en ningún punto** (`main-store/store.mjs:134-152`), dejando sin aplicación
  tanto la regla de una hora como la de "vence con la Jornada"—, más techo de horizonte resuelto,
  denegación, expansión, excepción y acciones irreversibles.
- [x] Tarea T3.2.2.2 — GREEN: implementar `policy/jornada.mjs` sobre `main-store/store.mjs`, con
  **elegibilidad únicamente**: resuelve si algo puede ocurrir, nunca a quién se le asigna ni por
  dónde se despacha. El `tasks.md` decía "extender `policy/delivery-policy.mjs`"; ese archivo
  **no existe**, así que esta Tarea lo crea junto al directorio.
- [x] Tarea T3.2.2.3 — REFACTOR: preservar los Policy Reports V1 legibles junto a
  `policy-report-v2`. `bun test test/policy`.

### Módulo M3.2.3 — Delivery-policy resolution

**Estado:** ✅ COMPLETO

- [x] Tarea T3.2.3.1 — RED: `test/policy/delivery-policy.test.mjs` para fuente ausente, no
  parseable, con valor desconocido, sin ligar, y por symlink / que escapa / de raíz ajena. **Cada
  campo sin resolver alcanza su valor más restrictivo y el motivo queda nombrado** con
  `CT_POLICY_UNRESOLVED`.
- [x] Tarea T3.2.3.2 — RED: ningún valor de política **ni excepción** alcanza un floor; se rechaza
  **nombrando el floor** en los cinco casos: mutación remota temprana, reescritura del candidato
  congelado, borrado del ledger, autoasignación del worker y dispatch no-Main.
- [x] Tarea T3.2.3.3 — GREEN: implementar `schemas/delivery-policy-v1.schema.json` y
  `policy/delivery-policy.mjs`, con lectura por digest desde la raíz canónica y el campo de binding
  de revisión. **No liga contra `candidate_revision`:** ese contrato es de `S5.1` y todavía no
  existe. Acá se define la forma; allá se liga. El `tasks.md` dice "revision binding into
  `candidate_revision`" y es una dependencia hacia adelante, no trabajo de esta Sesión.
- [x] Tarea T3.2.3.4 — REFACTOR: un repositorio sin el bloque se comporta exactamente igual que
  antes de que el bloque existiera. `bun test test/policy`.

**Criterios de aceptación de S3.2** — todos deben pasar para cerrar:

- [x] Un campo de política ausente resuelve al valor más restrictivo y el motivo queda nombrado con `CT_POLICY_UNRESOLVED`
- [x] Un bloque no parseable, con valor desconocido, o no ligado, falla cerrado sin default permisivo
- [x] Una fuente de política por symlink, que escapa de la raíz, o de raíz ajena, se rechaza sin leerla
- [x] Una política de proyecto más permisiva que la global resuelve al valor global
- [x] Un repositorio sin bloque `delivery-policy` se comporta exactamente igual que antes de que el bloque existiera
- [x] Ningún valor de política ni excepción alcanza un floor: los cinco casos se rechazan nombrando el floor violado
- [x] Un registro de autoridad persistido sin identidad de actor falla cerrado, y esa identidad sobrevive al commit
- [x] Una autorización consumida pasado su `expires_at` se rechaza
- [x] Los seis schemas validan contra sus fixtures y están registrados en `contracts/schema-registry.mjs`
- [x] Los bytes de los contratos V1 aceptados no cambian y `test/provenance/provenance.test.mjs` sigue verde
- [x] Policy resuelve elegibilidad y nunca ruteo: ninguna ruta de `policy/**` crea ni modifica un assignment
- [x] `bun test test/contracts test/main-store.test.mjs test/policy` pasa completo
- [x] `bun test` no introduce fallos nuevos sobre la línea base de `S3.1` — 476/0/2779, con la Torre desarmada
- [x] El diff de implementación no toca ninguna ruta del `Prohibido`

**Evidencia de cierre:** implementación `22c43ae` (`feat(policy): implement S3.2 policy and
Jornada`) sobre `origin/master@3362b3b6aa51c1498970552ba59d8813b4274b8c`: exactamente 15
archivos dentro de `Área`, 360 adiciones y 3 eliminaciones; ninguna ruta de `Prohibido` ni
`openspec/plans/**` fue tocada. La validación enfocada final
`bun test test/contracts test/main-store.test.mjs test/policy` pasó con 80 pass, 0 fail y 263
expects; `bun test` pasó con 493 pass, 0 fail y 2842 expects, con la Torre OFF. La validación
fresca del candidato fue `CORROBORATED_FIXED`: los 14 criterios pasaron. El SHA-256 de
`REQUIREMENTS` permaneció exactamente
`277129f30b47c1b6fda0a6c81f6d8943d737a7b5ff5750455e2b41dce6e1e5a0`.

## Sesión 3.3 — Agent Capability Registry

**Estado:** 📋 PLANIFICADO
**Depende de:** `S3.2` integrada
**Área:** `capabilities/registry.mjs`, `schemas/agent-capability-registry-v1.schema.json`, `test/capabilities/**`
**Prohibido:** `continuation/**`, `core.mjs`, `mcp.mjs`
**Recurso:** ninguno. Escritura sólo por Main vía CAS, sin migraciones de DB, sin token de entrega.

**Bloqueo técnico:** la decisión de disponibilidad ya está resuelta, pero el contrato ejecutable
no está sellado. El `Área` actual no incluye `contracts/schema-registry.mjs`, necesario para
registrar el schema; `capabilities/**` y `test/capabilities/**` no existen en este árbol; y los
Módulos/Tareas todavía no declaran el alcance técnico verificado. Próxima acción: `session-plan`
debe cerrar ese contrato antes de re-evaluar `S3.3` como 🟢 LISTO.

Registro versionado y con alcance de proyecto de **qué puede hacer cada agente**. Es lo que
permite que Main resuelva una capability por rol en vez de asumirla: `Main → capability
Support → SupportProposal` y `Main → capability Policy → PolicyReport ALLOW/DENY`
([`design.md`](../../changes/autonomous-v2-role-routed-continuation/design.md)). Ese `DENY`
es el punto donde nace un escalamiento, así que sin registry el ruteo por rol no tiene
de dónde resolver quién contesta.

**Límite duro:** el registry otorga **visibilidad y compatibilidad de invocación, nunca
autoridad**. Un agente no puede registrarse a sí mismo; una entrada vencida no habilita
nada. La autoridad sigue siendo exclusiva de Main.

La entrada declara identidad de proyecto y de Main, revisión de registro y de entrada,
identidad y rol de quien llama, la capability, los IDs de schema de entrada y salida, ref y
digest de origen, y ventana de disponibilidad con expiración. **Un update por CAS invalida
todos los bindings anteriores.**

**Decisiones:**

- `derivable` — la forma de una entrada del registro. **Criterio:** `schemas/agent-capability-registry-v1.schema.json`, que está en el `Área` de esta Sesión y enumera los campos: identidad de proyecto y de Main, revisión de registro y de entrada, identidad y rol de quien llama, capability, IDs de schema de entrada y salida, ref y digest de origen, y ventana de disponibilidad. Falsificable: un campo que el código exija y el schema no declare. **Autoridad:** el schema del `Área`.
- `derivable` — qué hace una entrada vencida. **Criterio:** no resuelve, y el rechazo es explícito en vez de silencioso. Un rechazo silencioso es indistinguible de una capability ausente y manda al llamador a improvisar. Falsificable por el criterio de aceptación ya escrito. **Autoridad:** los criterios de aceptación de `S3.3`.
- `derivable` — si el registry puede otorgar autoridad. **Criterio:** no. Otorga visibilidad y compatibilidad de invocación; la autoridad sigue siendo exclusiva de Main, y un agente no puede registrarse a sí mismo. Falsificable: cualquier ruta en la que una entrada del registro habilite una operación que Main no autorizó. **Autoridad:** el **Límite duro** declarado arriba en esta misma Sesión.
- `derivable` — qué pasa con los bindings previos ante un update. **Criterio:** un update por CAS lleva el registro de `R1` a `R2` e invalida **todos** los bindings de `R1`. Falsificable: un binding de `R1` que siga resolviendo después de la transición. **Autoridad:** el alcance declarado de `S3.3`.
- `escala` — cuánto dura por defecto la ventana de disponibilidad de una entrada. **Clase:** seguridad y permisos. **RESUELTA el 2026-08-04 por el maintainer:** expira con su Jornada. **Criterio:** una entrada de capability no resuelve después de que su Jornada alcanza un estado terminal. Falsificable: una entrada cuya revisión CAS siga vigente resuelve pese a que la Jornada expiró, fue cerrada o alcanzó otro estado terminal. **Autoridad:** decisión del maintainer del 2026-08-04, registrada en `plan-3/s3.3-capability-window`. La expiración por Jornada es la segunda capa de invalidación; el cambio de revisión por CAS `R1 → R2` sigue invalidando todos los bindings y no queda reemplazado. **Contaminaba:** `S5.1`, cuyo store de autorización resuelve contra entradas del registry, y `S5.4`, porque el `DENY` del que nace un escalamiento depende de que la entrada siga vigente.

### Módulo 3.3.1 — Registry

- [ ] Tarea 3.3.1.1 — RED: agregar `test/capabilities/registry.test.mjs` para resolución por rol y proyecto, rechazo por expiración y por drift de schema, transición de revisión `R1 → R2` que invalida los bindings de `R1`, y rechazo del auto-registro.
- [ ] Tarea 3.3.1.2 — GREEN: implementar `capabilities/registry.mjs` y `schemas/agent-capability-registry-v1.schema.json` con escritura CAS acotada al proyecto y ejercida sólo por Main.
- [ ] Tarea 3.3.1.3 — REFACTOR: eliminar toda autoridad sombra y cualquier visibilidad todos-contra-todos; volver a correr `bun test test/capabilities`.

**Criterios de aceptación de S3.3** — todos deben pasar para cerrar:

- [ ] Una capability se resuelve por rol y por proyecto; un lookup en dos proyectos no cruza entradas
- [ ] Una entrada vencida no resuelve, y el rechazo es explícito en vez de silencioso
- [ ] Un update por CAS lleva el registro de `R1` a `R2` e invalida todos los bindings de `R1`
- [ ] Un agente que intenta registrarse a sí mismo falla cerrado
- [ ] El drift entre el schema declarado y el invocado falla cerrado
- [ ] El registry no crea, valida ni consume autoridad, y no habilita ninguna ruta Support → Worker
- [ ] `bun test test/capabilities/registry.test.mjs` pasa completo y `bun test` no introduce fallos nuevos
- [ ] El diff no toca `continuation/**`, `core.mjs` ni `mcp.mjs`, ni ninguna ruta fuera del `Área`

Las responsabilidades legacy de Workspace Manager y Main/Policy que aún no tienen límite de un PR permanecen sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).
