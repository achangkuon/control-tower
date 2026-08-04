# Plan 3 — Workspace y orquestación

**Estado:** 🟢 LISTO

> **`S3.1` habilitada para arrancar el 2026-08-03 (`9fba0c0`).** El freno de ejecución de la
> cadena fue levantado con instrucción atendida del maintainer, así que `S3.1` deja de estar
> retenida por autorización: ya no queda nada aguas arriba que la frene. Junto con la
> continuación de `S8.8`, es una de las dos entradas disponibles del grafo.
>
> **`S3.2` cambió de contrato antes de empezar.** El corte política/seguridad de `d232fdf` le suma
> `M3.2.3` (resolución de la política de entrega declarada, con fail-closed al valor más
> restrictivo) y le sube el forecast a 310–410 líneas. Detalle en
> [`autonomous-v2-role-routed-continuation`](../../changes/autonomous-v2-role-routed-continuation/).
> El prerrequisito de `authorization-v1` que colgaba de `S5.1` quedó ✅ resuelto en `6d37642`.

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Las dependencias legacy de Changes C/D se conservan. Para Autonomous V2, `S3.1` parte de `origin/master@f110874`, con S2.4/project registry verificada y cerrada; `S3.2` depende de `S3.1` y `S3.3` de `S3.2`. |
| Outputs | C: `inspect`, `create`, `retire`, receipts y wrapper legacy de `jornada.sh`. D: Main routing, Support briefs, Policy Reports, presets, snapshots, budgets y assignments. Más el Agent Capability Registry de `S3.3`. |
| Roadmap | Ejecutar `S3.1`, ahora lista por el cierre de S2.4, después `S3.2` y cerrar con `S3.3`. El trabajo posterior no enumerado de Change B no es dependencia de `S3.1`; las responsabilidades legacy sin límite de un PR permanecen sin ID. |
| Referencias | [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/). Los proposals `sdd-tower-workspace-manager` y `sdd-tower-main-policy-jornada` fueron eliminados en `613a45d` por ser cáscaras sin avance; su intención vive en este STATUS. |

## Sesión 3.1 — Change C Workspace checkpoint

**Estado:** 🟢 LISTO

**Dependencias:** base `origin/master@f110874`; S2.4 Registry Storage and XDG Path Resolution verificada mediante PR #88 y cerrada mediante PR #90. No tiene predecesora dentro de la cadena aprobada.

Captura canónica de repositorio, base y resultado sin efectos remotos. La definición de `M3.1.1` y `T3.1.1.1`–`T3.1.1.4` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md).

**Decisiones:**

- `derivable` — cómo se identifica canónicamente un repositorio. **Criterio:** la resolución que `S2.4` ya dejó verificada y cerrada; si esta Sesión tuviera que inventar una segunda convención de identidad, la fuente elegida estaba mal. Falsificable: dos identificadores distintos en el árbol para el mismo repositorio. **Autoridad:** `S2.4` Registry Storage and XDG Path Resolution, cerrada por PR #90.
- `derivable` — qué se captura como `base`. **Criterio:** un OID de commit resuelto, nunca un nombre de rama. Una rama se mueve, y un checkpoint que se mueve no es un checkpoint. Falsificable: si el checkpoint siguiera siendo válido después de un `push --force` sobre la rama capturada, la elección estaba mal. **Autoridad:** `resolveCommitOid` en `core.mjs`.
- `derivable` — qué cuenta como efecto remoto. **Criterio:** cualquier escritura fuera del repositorio capturado. El alcance de la Sesión ya dice "sin efectos remotos"; esto sólo lo vuelve verificable por testigos de bytes. Falsificable por una corrida de la suite que toque una ruta externa. **Autoridad:** el propio alcance de `S3.1`.
- `escala` — qué hacer si [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md) y este `STATUS` se contradicen sobre el alcance de `M3.1.1`. **Clase:** dependencias o evidencia contradictorias. La definición de las Tareas vive en un artefacto externo que este plan no controla, y ninguno de los dos es obviamente el ganador. **Contamina:** `S3.2`, que hereda el mismo patrón de definición externa.

## Sesión 3.2 — Change D Global/project Policy/Jornada

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S3.1` integrada.

Define floors globales, herencia, snapshots Policy/Jornada, excepciones acotadas y auditoría. La definición de `M3.2.1` y `T3.2.1.1`–`T3.2.1.3` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md).

**Decisiones:**

- `derivable` — qué valor toma un campo de política ausente. **Criterio:** el más restrictivo; un repositorio sin bloque `delivery-policy` se comporta exactamente igual que antes de que el bloque existiera. Falsificable: si un campo ausente habilitara algo que el bloque explícito no habilita, el default estaba mal. **Autoridad:** el corte política/seguridad de `d232fdf` y el bloque `delivery-policy` de [`AGENTS.md`](../../../AGENTS.md).
- `derivable` — dónde vive la política declarada de un proyecto. **Criterio:** el bloque `delivery-policy` del `AGENTS.md` de ese proyecto, un solo lugar y legible por máquina. Falsificable: dos fuentes en el árbol que respondan la misma pregunta de política. **Autoridad:** [`AGENTS.md`](../../../AGENTS.md).
- `derivable` — qué gana cuando la política global y la del proyecto difieren. **Criterio:** el valor más restrictivo de los dos, no el más específico. La herencia acota, nunca amplía. Falsificable: un proyecto que declare una política más permisiva que la global y termine ejecutando la permisiva. **Autoridad:** los floors de seguridad de `d232fdf`.
- `escala` — si una excepción acotada puede relajar un floor de seguridad. **Clase:** seguridad y permisos. Los floors —sin mutación temprana, inmutabilidad del candidato congelado, ledger append-only, autoridad única de Main, sin autoasignación del worker— están declarados fuera del alcance de cualquier configuración, y una excepción que los tocara sería exactamente eso. **Contamina:** `S5.1`, `S5.2` y `S7.1`, cuyos criterios de aceptación asumen que los floors son inviolables.
- `escala` — qué queda registrado en la auditoría de una excepción. **Clase:** seguridad y permisos. Una excepción que no deja rastro suficiente para reconstruir quién la otorgó y contra qué es indistinguible de no haber tenido política. **Contamina:** `S7.1`, que verifica conformidad de release contra ese rastro.

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
