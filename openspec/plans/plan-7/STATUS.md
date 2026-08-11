# Plan 7 — Conformidad de release

**Estado:** 📋 PLANIFICADO

## Resumen

| Campo | Detalle |
|---|---|
| Lane | `autonomous-v2`. Este Plan NO pertenece al lane `installable-v1` y no bloquea su release. |
| Dependencias | Las dependencias de conformidad V1 se conservan. Para Autonomous V2, `S7.1` depende de `S4.4`, `S5.3`, `S5.5` y `S8.7`. **Corregido el 2026-08-11:** este STATUS declaraba sólo `S5.3`, la tabla de [release-chain](../release-chain.md) declaraba `S5.3`, `S8.7` y `S5.5`, y su grafo Mermaid además `S4.4`. Las tres lecturas divergían. El maintainer resolvió que gana el grafo. |
| Outputs | Evidencia end-to-end contra Gates A–G de REQUIREMENTS mediante seis pilotos obligatorios. |
| Roadmap | Ejecutar `S7.1` después de integrar `S4.4`, `S5.3`, `S5.5` y `S8.7`; el PR se dirige a `main`. Los pilotos V1 restantes sólo reciben ID cuando demuestren un límite de un PR. |
| Referencias | [`autonomous-v2-checkpointed-delivery`](../../changes/autonomous-v2-checkpointed-delivery/), [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), [Plan Manifest](../sdd-tower-implementation/manifest.yaml). El proposal `sdd-tower-v1-conformance-pilot` fue eliminado en `613a45d` por ser cáscara sin avance; su intención vive en este STATUS. |

## Sesión 7.1 — Conformance pilot

**Estado:** 📋 PLANIFICADO

**Dependencias:** `S4.4`, `S5.3`, `S5.5` y `S8.7` integradas.

**Ruta:** `blocked` — conserva una decisión `escala` propia sin resolver: qué se hace con un gate de REQUIREMENTS que ningún piloto cubre. **Clase:** dependencias o evidencia contradictorias. Declarar conformidad sobre un gate no ejercido afirma algo que no se midió; agregar el piloto faltante expande el alcance de la Sesión. Ninguna de las dos es del agente. **Ruta proyectada al destrabar: `design-tasks`** — los Gates A–G ya están fijados por REQUIREMENTS y `M7.1.1` con `T7.1.1.1`–`T7.1.1.4` existen; lo que falta elegir es el diseño de la evidencia atribuible por piloto, no un contrato de producto nuevo. **Autoridad:** la decisión `escala` declarada abajo y REQUIREMENTS §Gates A–G. *(Clasificada el 2026-08-11.)*

Produce evidencia atribuible a `candidate_revision` para cero efectos remotos tempranos o duplicados, rechazo de candidatos stale, recovery y denegación desde una base no integrada. La definición de `M7.1.1` y `T7.1.1.1`–`T7.1.1.4` vive en [`tasks.md`](../../changes/autonomous-v2-checkpointed-delivery/tasks.md#s71-pilot--m711-safety).

**Decisiones:**

- `derivable` — contra qué se mide la conformidad. **Criterio:** los Gates A–G de [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), tal como están escritos, sin reinterpretarlos desde el código que se está verificando. Un piloto que ajusta el gate al comportamiento observado no verifica nada. Falsificable: cualquier criterio de piloto que no se pueda trazar a un gate enumerado. **Autoridad:** REQUIREMENTS.
- `derivable` — qué hace atribuible a una evidencia. **Criterio:** queda ligada a un `candidate_revision` concreto e inmutable. Evidencia que no nombra el candidato exacto no distingue una corrida verde de otra roja del mismo piloto. Falsificable: una pieza de evidencia que se pueda reproducir contra dos candidatos distintos. **Autoridad:** el alcance declarado de `S7.1`.
- `derivable` — si un piloto puede correr contra un entorno preparado a mano. **Criterio:** no. El piloto tiene que partir de la misma ruta que usa la entrega real; un entorno amasado para el test es la misma clase de verde falso que la Sesión existe para detectar. Falsificable: un piloto que pase con un estado que la ruta normal no puede producir. **Autoridad:** el requisito de evidencia end-to-end de este Plan.
- `escala` — qué se hace con un gate que ningún piloto cubre. **Clase:** dependencias o evidencia contradictorias. Declarar conformidad con un gate no ejercido es afirmar algo que no se midió; agregar el piloto que falta expande el alcance de la Sesión. Ninguna de las dos es del agente. **Contamina:** ninguna Sesión aguas abajo — `S7.1` es terminal en la cadena—, pero contamina la declaración de release misma.
- `escala` — si un piloto rojo bloquea la release. **Clase:** contrato visible del producto. Es la definición operativa de qué significa "conforme", y sale del alcance de cualquier Sesión. **Contamina:** la declaración de la primera versión.

Los seis pilotos V1 son escenarios de aceptación, no niveles de planificación. Los que aún no demuestran un límite de un PR permanecen sin ID en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).

El "V1" que aparece en REQUIREMENTS, en los pilotos y en `sdd-tower-v1-conformance-pilot` es la etiqueta amplia anterior al split de productos, no el lane `installable-v1`. El manifest de Autonomous V2 registra esa migración como `migrates: broad-v1-label-to-autonomous-v2`. Por eso este Plan se renombró de "Conformidad V1" a "Conformidad de release": el nombre viejo sugería que bloqueaba la release Installable V1, y no la bloquea.
