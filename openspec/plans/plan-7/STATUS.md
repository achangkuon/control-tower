# Plan 7 — Conformidad de release

**Estado:** 📋 PLANIFICADO

## Resumen

| Campo | Detalle |
|---|---|
| Producto y release | Control Tower es un producto, un roadmap y un release. `installable-v1`, `autonomous-v2` y “V1/V2” son sólo etiquetas de artefactos históricos. |
| Dependencias | `S7.1` conserva `S4.4`, `S5.3`, `S5.5` y `S8.7`; P10 llega por `S3.4 → S10.3 → S10.1 → S10.2 → S7.1`. |
| Outputs | Evidencia end-to-end contra Gates A–G de REQUIREMENTS mediante seis pilotos obligatorios. |
| Roadmap | Ejecutar `S7.1` después de integrar `S4.4`, `S5.3`, `S5.5`, `S8.7`, `S10.1` y `S10.2`; el PR se dirige a `main`. Los pilotos con etiqueta histórica V1 sólo reciben ID cuando demuestren un límite de un PR. |
| Referencias | [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/), [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), [Plan Manifest](../sdd-tower-implementation/manifest.yaml). El proposal `sdd-tower-v1-conformance-pilot` fue eliminado en `613a45d` por ser cáscara sin avance; su intención vive en este STATUS. |

## Sesión 7.1 — Conformance pilot

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S4.4`, `S5.3`, `S5.5`, `S8.7` y `S10.2` integradas; esta última exige transitivamente `S10.3` y `S10.1`.

**Ruta:** `blocked` **sólo por dependencia** desde el 2026-08-14 — sus dos decisiones `escala` propias quedaron resueltas (decisiones 32 y 33). El piloto se corre sobre `control-tower` mismo y un rojo bloquea sólo sobre un Gate A–G. Lo único que la detiene es su cadena de dependencias, que sigue intacta. **Ruta proyectada al destrabar: `design-tasks`** — los Gates A–G ya están fijados por REQUIREMENTS y `M7.1.1` con `T7.1.1.1`–`T7.1.1.4` existen; lo que falta es el diseño de la evidencia atribuible por piloto, no un contrato de producto nuevo. **Autoridad:** decisiones 32 y 33 del [registro](../decision-register.md) y REQUIREMENTS §Gates A–G. *(Clasificada el 2026-08-11; decisiones resueltas el 2026-08-14.)*

Produce evidencia atribuible a `candidate_revision` para cero efectos remotos tempranos o duplicados, rechazo de candidatos stale, recovery y denegación desde una base no integrada. La definición de `M7.1.1` y `T7.1.1.1`–`T7.1.1.4` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s71-pilot--m711-safety).

**Decisiones:**

- `derivable` — contra qué se mide la conformidad. **Criterio:** los Gates A–G de [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), tal como están escritos, sin reinterpretarlos desde el código que se está verificando. Un piloto que ajusta el gate al comportamiento observado no verifica nada. Falsificable: cualquier criterio de piloto que no se pueda trazar a un gate enumerado. **Autoridad:** REQUIREMENTS.
- `derivable` — qué hace atribuible a una evidencia. **Criterio:** queda ligada a un `candidate_revision` concreto e inmutable. Evidencia que no nombra el candidato exacto no distingue una corrida verde de otra roja del mismo piloto. Falsificable: una pieza de evidencia que se pueda reproducir contra dos candidatos distintos. **Autoridad:** el alcance declarado de `S7.1`.
- `derivable` — si un piloto puede correr contra un entorno preparado a mano. **Criterio:** no. El piloto tiene que partir de la misma ruta que usa la entrega real; un entorno amasado para el test es la misma clase de verde falso que la Sesión existe para detectar. Falsificable: un piloto que pase con un estado que la ruta normal no puede producir. **Autoridad:** el requisito de evidencia end-to-end de este Plan.
- `escala` — **RESUELTA por el maintainer el 2026-08-14 (decisión 32): correr el piloto sobre `control-tower` mismo.** Qué se hace con un gate que ningún piloto cubre. **Clase:** dependencias o evidencia contradictorias. Declarar conformidad con un gate no ejercido es afirmar algo que no se midió; agregar el piloto que falta expande el alcance de la Sesión. Ninguna de las dos es del agente. **Resolución:** ninguna de las dos. `control-tower` es el único repositorio bajo control completo del maintainer y ya estaba pendiente prender la Torre, apagada desde el 2026-08-04, así que el piloto se corre acá. Convierte una decisión bloqueada en trabajo ejecutable y produce la evidencia atribuible que la Sesión necesita, sin expandir su alcance ni declarar sobre el vacío. **Falsificable:** una declaración de conformidad emitida sin evidencia de piloto sobre este repositorio. **Contaminaba:** la declaración de release misma.
- `escala` — **RESUELTA por el maintainer el 2026-08-14 (decisión 33): bloquea sólo cuando el rojo cae sobre un requisito de los Gates A–G.** Si un piloto rojo bloquea la release. **Clase:** contrato visible del producto. Es la definición operativa de qué significa "conforme", y sale del alcance de cualquier Sesión. **Resolución:** los rojos sobre capacidades deliberadamente diferidas —F7 failover y F8 campañas multiproyecto— no bloquean. Sin ese recorte el gate no podría pasar nunca, porque F7 y F8 se cortaron a propósito del alcance; sin el recorte inverso «ningún rojo bloquea» el gate sería documentación. **Falsificable:** una declaración emitida con un rojo vivo sobre un Gate A–G, o una bloqueada por un rojo sobre alcance diferido. **Contaminaba:** la declaración de la primera versión.

Los seis pilotos etiquetados históricamente como V1 son escenarios de aceptación, no niveles de planificación. Los que aún no demuestran un límite de un PR permanecen sin ID en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).

“V1”, `installable-v1` y `autonomous-v2` sobreviven aquí sólo para identificar REQUIREMENTS, pilotos y manifests históricos. No nombran productos o releases actuales. Este Plan se llama “Conformidad de release” porque `S7.1` es la declaración terminal del único release.
