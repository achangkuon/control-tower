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

## Sesión 3.2 — Change D Global/project Policy/Jornada

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S3.1` integrada.

Define floors globales, herencia, snapshots Policy/Jornada, excepciones acotadas y auditoría. La definición de `M3.2.1` y `T3.2.1.1`–`T3.2.1.3` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md).

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
