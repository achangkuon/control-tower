# Plan 7 — Conformidad de release

**Estado:** 📋 PLANIFICADO

## Resumen

| Campo | Detalle |
|---|---|
| Producto y release | Control Tower es un producto, un roadmap y un release. `installable-v1`, `autonomous-v2` y “V1/V2” son sólo etiquetas de artefactos históricos. |
| Dependencias | `S7.1` depende de `S4.4`, `S5.3`, `S5.5` y `S10.2`; Pi e `S8.7` no son prerequisitos. |
| Outputs | Conformidad Main → Herdr interno → OpenCode, loop planner/implementer, escalamiento Moshi, recuperación WSL y direct-push. |
| Roadmap | Ejecutar `S7.1` después de integrar sus cuatro dependencias, en commit directo a `master`; Pi/Intercom queda diferido. |
| Referencias | [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/), [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), [Plan Manifest](../sdd-tower-implementation/manifest.yaml). El proposal `sdd-tower-v1-conformance-pilot` fue eliminado en `613a45d` por ser cáscara sin avance; su intención vive en este STATUS. |

## Sesión 7.1 — Conformance pilot

**Estado:** 📋 PLANIFICADO

**Depende de:** `S4.4`, `S5.3`, `S5.5` y `S10.2` integradas; esta última exige transitivamente `S10.3` y `S10.1`.
**Área:** `openspec/plans/**`, `test/**`, `hosts/**`, `escalation/**`, `continuation/**` exclusivamente para los pilotos declarados.
**Recurso:** token de entrega Main, sin DB/migración.

**Ruta:** `design-tasks` al satisfacer dependencias. **Autoridad:** rebase del maintainer 2026-08-17 y REQUIREMENTS §Gates A–G.

Produce evidencia atribuible a `candidate_revision` para despacho exclusivo Main, supervisión Herdr interna, raíz OpenCode, planner N+1/implementer N, Moshi-visible escalation, recuperación exacta WSL y `commit → verificar árbol → push directo`.

**Decisiones:**

- `derivable` — contra qué se mide la conformidad. **Criterio:** los Gates A–G de [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), tal como están escritos, sin reinterpretarlos desde el código que se está verificando. Un piloto que ajusta el gate al comportamiento observado no verifica nada. Falsificable: cualquier criterio de piloto que no se pueda trazar a un gate enumerado. **Autoridad:** REQUIREMENTS.
- `derivable` — qué hace atribuible a una evidencia. **Criterio:** queda ligada a un `candidate_revision` concreto e inmutable. Evidencia que no nombra el candidato exacto no distingue una corrida verde de otra roja del mismo piloto. Falsificable: una pieza de evidencia que se pueda reproducir contra dos candidatos distintos. **Autoridad:** el alcance declarado de `S7.1`.
- `derivable` — si un piloto puede correr contra un entorno preparado a mano. **Criterio:** no. El piloto tiene que partir de la misma ruta que usa la entrega real; un entorno amasado para el test es la misma clase de verde falso que la Sesión existe para detectar. Falsificable: un piloto que pase con un estado que la ruta normal no puede producir. **Autoridad:** el requisito de evidencia end-to-end de este Plan.
- `derivable` — qué hosts cubre. **Criterio:** sólo Main/Herdr/OpenCode same-host WSL; Pi/Intercom no es condición de conformidad. Falsificable: un gate OpenCode que exija Pi.

**Criterios de aceptación** — todos deben pasar para cerrar:
- [ ] Sólo Main despacha una raíz OpenCode en el worktree asignado; Herdr no planifica ni despacha y Moshi no autoriza
- [ ] Planner prepara N+1 hasta Tareas e implementer ejecuta N con apply/tests/verify
- [ ] El escalamiento visible a Moshi conserva la autoridad en Main; un wake no autoriza
- [ ] La recuperación WSL reabre sólo el worktree y checkpoint exactos; no hay relocalización/failover multi-host
- [ ] La entrega usa commit directo a `master`, verificación de árbol y push, sin PR y con commits <=400 líneas authored
- [ ] Ningún criterio exige Telegram, Hermes, Remote Control, callbacks, TTL/replay ni Pi
- `escala` — **RESUELTA por el maintainer el 2026-08-14 (decisión 32): correr el piloto sobre `control-tower` mismo.** Qué se hace con un gate que ningún piloto cubre. **Clase:** dependencias o evidencia contradictorias. Declarar conformidad con un gate no ejercido es afirmar algo que no se midió; agregar el piloto que falta expande el alcance de la Sesión. Ninguna de las dos es del agente. **Resolución:** ninguna de las dos. `control-tower` es el único repositorio bajo control completo del maintainer y ya estaba pendiente prender la Torre, apagada desde el 2026-08-04, así que el piloto se corre acá. Convierte una decisión bloqueada en trabajo ejecutable y produce la evidencia atribuible que la Sesión necesita, sin expandir su alcance ni declarar sobre el vacío. **Falsificable:** una declaración de conformidad emitida sin evidencia de piloto sobre este repositorio. **Contaminaba:** la declaración de release misma.
- `escala` — **RESUELTA por el maintainer el 2026-08-14 (decisión 33): bloquea sólo cuando el rojo cae sobre un requisito de los Gates A–G.** Si un piloto rojo bloquea la release. **Clase:** contrato visible del producto. Es la definición operativa de qué significa "conforme", y sale del alcance de cualquier Sesión. **Resolución:** los rojos sobre capacidades deliberadamente diferidas —F7 failover y F8 campañas multiproyecto— no bloquean. Sin ese recorte el gate no podría pasar nunca, porque F7 y F8 se cortaron a propósito del alcance; sin el recorte inverso «ningún rojo bloquea» el gate sería documentación. **Falsificable:** una declaración emitida con un rojo vivo sobre un Gate A–G, o una bloqueada por un rojo sobre alcance diferido. **Contaminaba:** la declaración de la primera versión.

Los seis pilotos etiquetados históricamente como V1 son escenarios de aceptación, no niveles de planificación. Los que aún no demuestran un límite de un PR permanecen sin ID en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).

“V1”, `installable-v1` y `autonomous-v2` sobreviven aquí sólo para identificar REQUIREMENTS, pilotos y manifests históricos. No nombran productos o releases actuales. Este Plan se llama “Conformidad de release” porque `S7.1` es la declaración terminal del único release.
