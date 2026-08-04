# Plan 3 — Workspace y orquestación

**Estado:** 🟢 LISTO

> **`S3.1` ✅ COMPLETO en `d8924a6`.** `M3.1.1` captura el checkpoint canónico de repositorio,
> base, resultado y evidencia sin efectos remotos. La verificación del candidato fue 11/0/23
> enfocada y 476/0/2779 completa; la corrección de binding de evidencia quedó corroborada.
> `S3.2` es ahora la entrada elegible del grafo.
>
> **`S3.2` cambió de contrato antes de empezar.** El corte política/seguridad de `d232fdf` le suma
> `M3.2.3` (resolución de la política de entrega declarada, con fail-closed al valor más
> restrictivo) y le sube el forecast a 310–410 líneas. Detalle en
> [`autonomous-v2-role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/).
> El prerrequisito de `authorization-v1` que colgaba de `S5.1` quedó ✅ resuelto en `6d37642`.

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Para Autonomous V2, `S3.1` partió de `master@33c2c6e` y quedó implementada en `d8924a6`, con `S2.4`/project registry verificada y cerrada; `S3.2` depende de `S3.1` y `S3.3` de `S3.2`. |
| Outputs | C: `inspect`, `create`, `retire`, receipts y wrapper legacy de `jornada.sh`. D: Main routing, Support briefs, Policy Reports, presets, snapshots, budgets y assignments. Más el Agent Capability Registry de `S3.3`. |
| Roadmap | `S3.1` está cerrada; ejecutar `S3.2`, ahora lista por ese cierre, y después `S3.3`. El trabajo posterior no enumerado de Change B no fue dependencia de `S3.1`; las responsabilidades legacy sin límite de un PR permanecen sin ID. |
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

**Estado:** 🟢 LISTO

**Depende de:** `S3.1` ✅.

Define floors globales, herencia, snapshots Policy/Jornada, excepciones acotadas y auditoría.

**Son tres Módulos, no uno:** `M3.2.1` Authority/contracts, `M3.2.2` Policy/Jornada y
`M3.2.3` Delivery-policy resolution. Su definición vive en el
[`tasks.md` de `role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/tasks.md),
que es el que incorpora el corte de `d232fdf`. **Colisión de IDs — leela antes de ejecutar:** el
[`tasks.md` de `checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md)
usa `T3.2.1.1`–`T3.2.1.3` para contenido distinto (`RED floors/inheritance/exception` en vez de
`Git -C/escape/foreign-root`). Es referencia histórica y **no gobierna esta Sesión**.

**Decisiones:**

- `derivable` — qué valor toma un campo de política ausente. **Criterio:** el más restrictivo; un repositorio sin bloque `delivery-policy` se comporta exactamente igual que antes de que el bloque existiera. Falsificable: si un campo ausente habilitara algo que el bloque explícito no habilita, el default estaba mal. **Autoridad:** el corte política/seguridad de `d232fdf` y el bloque `delivery-policy` de [`AGENTS.md`](../../../AGENTS.md).
- `derivable` — dónde vive la política declarada de un proyecto. **Criterio:** el bloque `delivery-policy` del `AGENTS.md` de ese proyecto, un solo lugar y legible por máquina. Falsificable: dos fuentes en el árbol que respondan la misma pregunta de política. **Autoridad:** [`AGENTS.md`](../../../AGENTS.md).
- `derivable` — qué gana cuando la política global y la del proyecto difieren. **Criterio:** el valor más restrictivo de los dos, no el más específico. La herencia acota, nunca amplía. Falsificable: un proyecto que declare una política más permisiva que la global y termine ejecutando la permisiva. **Autoridad:** los floors de seguridad de `d232fdf`.
- `escala` — si una excepción acotada puede relajar un floor de seguridad. **Clase:** seguridad y permisos. **RESUELTA el 2026-08-04 por el maintainer: no, ninguno de los cinco.** Los floors —sin mutación temprana, inmutabilidad del candidato congelado, ledger append-only, autoridad única de Main, sin autoasignación del worker— quedan fuera del alcance tanto de la configuración como de toda excepción. Dos de los cinco no admiten una excepción *acotada* ni siquiera técnicamente: el ledger se aplica por triggers DDL (`core.mjs:346-363`), así que relajarlo exige una migración y **una migración no vence**; y una excepción sobre la autoridad de Main tendría que ser otorgada por Main (`main-store/store.mjs:89-94`), o sea autoelevación circular. La excepción conserva alcance real y no queda decorativa: `effective_limits`, `delivery.shape`, `planning.horizon_ceiling`, `allowed_operations` y `allowed_hosts` — que es donde hace falta, porque la herencia sólo acota y sin excepción un proyecto sobre-restringido no puede volver al valor global. Falsificable: cualquier ruta en la que una excepción registrada habilite una operación que el floor prohíbe. **Autoridad:** decisión del maintainer del 2026-08-04, en [master-index](../master-index.md). **Contaminaba:** `S5.1`, `S5.2` y `S7.1`, las tres destrabadas — sus criterios de aceptación siguen siendo del tipo "no existe ninguna ruta", falsificables por ausencia.
- `escala` — qué queda registrado en la auditoría de una excepción. **Clase:** seguridad y permisos. **RESUELTA el 2026-08-04 por el maintainer.** El registro es un evento de autoridad §15.3 de [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), no un género nuevo, y reutiliza los `$defs` de `artifact-ref-v1` más la forma ya probada de `authorization-v1`. Mínimo: identidad (`exception_id`, `project_id`, `registry_revision`, `plan_id`, `jornada_id/revision`), objetivo (`policy_revision` + `policy_digest`, `candidate_ref`), `excepted_rule` como enum cerrado, `declared_scope` verificable por máquina, `granted_by`, `authorization_ref`, `created_at`/`expires_at`, `resulting_action`/`final_outcome`, y `previous_entry_digest`/`entry_digest`. Tres definiciones que la acompañan: la justificación se persiste **sólo como digest más puntero externo** —nunca texto libre, que es por donde se filtra un secreto que `assertCredentialFree` no ve y que además haría irreconciliable el borrado de §22 con el append-only—; la excepción la otorga **sólo un humano y vence con la Jornada**, deliberadamente distinto de la autorización de merge (una hora); y la cadena de hash es **por entrega, no por proyecto**, para no serializar la punta contra CAS. Falsificable: un registro que no permita reconstruir quién la otorgó y contra qué revisión de política. **Autoridad:** §15.3 y §22 de REQUIREMENTS, más la decisión del maintainer del 2026-08-04. **Contaminaba:** `S7.1`, destrabada.
- `derivable` — qué reglas pueden figurar en `excepted_rule`. **Criterio:** exactamente la superficie configurable, que es la que queda al excluir los cinco floors: `effective_limits`, `delivery.shape`, `delivery.target_branch`, `planning.horizon_ceiling`, `documentation_close.*`, `allowed_operations` y `allowed_hosts`. Dejó de ser `escala` al resolverse la decisión de floors: sin floors exceptuables, el enum ya no es una elección. Falsificable: un valor del enum que nombre un floor. **Autoridad:** la decisión de floors de arriba.

## Sesión 3.3 — Agent Capability Registry

**Estado:** 📋 PLANIFICADO
**Depende de:** `S3.2` integrada
**Área:** `capabilities/registry.mjs`, `schemas/agent-capability-registry-v1.schema.json`, `test/capabilities/**`
**Prohibido:** `continuation/**`, `core.mjs`, `mcp.mjs`
**Recurso:** ninguno. Escritura sólo por Main vía CAS, sin migraciones de DB, sin token de entrega.

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
- `escala` — cuánto dura por defecto la ventana de disponibilidad de una entrada. **Clase:** seguridad y permisos. Una ventana larga vuelve la expiración decorativa y deja capabilities vivas después de que su origen cambió; una corta convierte cada resolución en una renovación. Ninguna autoridad aprobada fija hoy ese número. **Contamina:** `S5.1`, cuyo store de autorización resuelve contra entradas del registry, y `S5.4`, porque el `DENY` del que nace un escalamiento depende de que la entrada siga vigente.

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
