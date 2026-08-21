# Plan 7 — Conformidad de release

**Estado:** 📋 PLANIFICADO

## Resumen

| Campo | Detalle |
|---|---|
| Producto y release | Control Tower es un producto, un roadmap y un release. `installable-v1`, `autonomous-v2` y “V1/V2” son sólo etiquetas de artefactos históricos. |
| Dependencias | `S7.1` depende de `S4.4`, `S5.3`, `S5.5` y `S10.2`; Pi e `S8.7` no son prerequisitos. |
| Outputs | Conformidad Main → backend/raíz primaria OpenCode con TUI no autoritativa, loop planner/implementer, escalamiento Moshi, recuperación WSL y direct-push. |
| Roadmap | Ejecutar `S7.1` después de integrar sus cuatro dependencias, en commit directo a `master`; Pi/Intercom queda diferido. |
| Referencias | [Main-Owned Visible Root spec](../../specs/main-owned-visible-root/spec.md), [REQUIREMENTS histórico](../../specs/sdd-tower-implementation-v1-requirements.md), decisiones 37–40 / Engram 9040/9042/9043/9044 y [Plan Manifest](../sdd-tower-implementation/manifest.yaml). |

## Sesión 7.1 — Conformance pilot

**Estado:** 📋 PLANIFICADO

**Depende de:** `S4.4`, `S5.3`, `S5.5` y `S10.2` integradas; esta última exige transitivamente `S10.3` y `S10.1`.
**Área:** `openspec/plans/**`, `test/**`, `hosts/**`, `escalation/**`, `continuation/**` exclusivamente para los pilotos declarados.
**Recurso:** token de entrega Main, sin DB/migración.

**Ruta:** `design-tasks` al satisfacer dependencias; queda decision-clean. **Autoridad:** decisiones 37–40 / Engram 9040/9042/9043/9044, Main-Owned Visible Root spec y REQUIREMENTS §Gates A–G.

Produce evidencia atribuible a `candidate_revision` para despacho exclusivo Main, backend/proceso/root-session Main-owned, TUI adjunta no autoritativa, planner N+1/implementer N, escalamiento Moshi, recuperación exacta WSL y `commit → verificar árbol → push directo`.

**Decisiones:**

- `derivable` — contra qué se mide la conformidad. **Criterio:** los Gates A–G de [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), tal como están escritos, sin reinterpretarlos desde el código que se está verificando. Un piloto que ajusta el gate al comportamiento observado no verifica nada. Falsificable: cualquier criterio de piloto que no se pueda trazar a un gate enumerado. **Autoridad:** REQUIREMENTS.
- `derivable` — qué hace atribuible a una evidencia. **Criterio:** queda ligada a un `candidate_revision` concreto e inmutable. Evidencia que no nombra el candidato exacto no distingue una corrida verde de otra roja del mismo piloto. Falsificable: una pieza de evidencia que se pueda reproducir contra dos candidatos distintos. **Autoridad:** el alcance declarado de `S7.1`.
- `derivable` — si un piloto puede correr contra un entorno preparado a mano. **Criterio:** no. El piloto tiene que partir de la misma ruta que usa la entrega real; un entorno amasado para el test es la misma clase de verde falso que la Sesión existe para detectar. Falsificable: un piloto que pase con un estado que la ruta normal no puede producir. **Autoridad:** el requisito de evidencia end-to-end de este Plan.
- `derivable` — qué hosts cubre. **Criterio:** sólo Main/OpenCode same-host WSL; una vista Herdr opcional no integra la prueba crítica y Pi/Intercom no es condición. Falsificable: un gate que exige Herdr o Pi para mantener viva la raíz. **Autoridad:** decisión 37.
- `escala` — decisión 38 **RESUELTA**: cada worktree asignado usa backend, proceso, puerto loopback, secreto, root binding y evidencia Main-owned aislados. Pregunta original: ¿topología per-worktree o compartida? **Resolución:** per-worktree; se descarta compartir por fencing y blast radius. **Falsificable:** dos worktrees comparten identidad o un fallo cruza bindings. **Clase:** contrato visible del producto; seguridad y permisos. **Contaminaba:** `S7.1`.
- `escala` — decisión 39 **RESUELTA**: Herdr queda temporalmente sólo como launcher reemplazable de un pane `opencode attach` sobre la raíz ya creada por Main. Pregunta original: ¿launcher directo o Herdr view-only? **Resolución:** Herdr view-only, sin autoridad/lifecycle y con fallback manual; launcher directo diferido. **Falsificable:** el pane es raíz/transporte, Intercom integra el camino, close/fallo altera lifecycle o falta attach manual. **Clase:** contrato visible del producto; seguridad y permisos; dependencias o evidencia contradictorias. **Contaminaba:** `S7.1`.
- `escala` — decisión 40 **RESUELTA**: pérdida sólo de vista reconecta el mismo root vivo; muerte probada crea backend/raíz nuevos, incrementa `host_epoch`, conserva lineage del predecesor terminal y rechaza efectos stale. El brief sigue binding/epoch Main → Git/worktree/candidato → OpenSpec → Engram seleccionado → checkpoint durable; Engram no es autoridad única y Notion no participa. **Descartado:** resucitar el mismo ID o restaurar memoria/subagentes de proceso. **Falsificable:** cambia root/epoch por pérdida de vista, se reutiliza el ID muerto, falta lineage/fencing o una fuente contextual gobierna runtime. **Clase:** contrato visible del producto; seguridad y permisos; dependencias o evidencia contradictorias. **Contaminaba:** `S7.1`.

**Criterios de aceptación** — todos deben pasar para cerrar:
- [ ] Sólo Main posee/despacha backend y raíz primary por worktree; child y TUI no reemplazan identidad ni autoridad
- [ ] Planner prepara N+1 hasta Tareas e implementer ejecuta N con apply/tests/verify
- [ ] El escalamiento visible a Moshi conserva la autoridad en Main; un wake no autoriza
- [ ] La pérdida de vista reconecta el root vivo; la muerte probada crea raíz/epoch sucesores en el mismo worktree/checkpoint, con stop proof, lineage, brief durable ordenado y rechazo stale, sin resurrección ni relocalización multi-host
- [ ] La entrega usa commit directo a `master`, verificación de árbol y push, sin PR y con commits <=400 líneas authored
- [ ] Ningún criterio exige Telegram, Hermes, Remote Control, callbacks, TTL/replay ni Pi
- `escala` — **RESUELTA por el maintainer el 2026-08-14 (decisión 32): correr el piloto sobre `control-tower` mismo.** Qué se hace con un gate que ningún piloto cubre. **Clase:** dependencias o evidencia contradictorias. Declarar conformidad con un gate no ejercido es afirmar algo que no se midió; agregar el piloto que falta expande el alcance de la Sesión. Ninguna de las dos es del agente. **Resolución:** ninguna de las dos. `control-tower` es el único repositorio bajo control completo del maintainer y ya estaba pendiente prender la Torre, apagada desde el 2026-08-04, así que el piloto se corre acá. Convierte una decisión bloqueada en trabajo ejecutable y produce la evidencia atribuible que la Sesión necesita, sin expandir su alcance ni declarar sobre el vacío. **Falsificable:** una declaración de conformidad emitida sin evidencia de piloto sobre este repositorio. **Contaminaba:** la declaración de release misma.
- `escala` — **RESUELTA por el maintainer el 2026-08-14 (decisión 33): bloquea sólo cuando el rojo cae sobre un requisito de los Gates A–G.** Si un piloto rojo bloquea la release. **Clase:** contrato visible del producto. Es la definición operativa de qué significa "conforme", y sale del alcance de cualquier Sesión. **Resolución:** los rojos sobre capacidades deliberadamente diferidas —F7 failover y F8 campañas multiproyecto— no bloquean. Sin ese recorte el gate no podría pasar nunca, porque F7 y F8 se cortaron a propósito del alcance; sin el recorte inverso «ningún rojo bloquea» el gate sería documentación. **Falsificable:** una declaración emitida con un rojo vivo sobre un Gate A–G, o una bloqueada por un rojo sobre alcance diferido. **Contaminaba:** la declaración de la primera versión.

Los seis pilotos etiquetados históricamente como V1 son escenarios de aceptación, no niveles de planificación. Los que aún no demuestran un límite de un PR permanecen sin ID en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).

“V1”, `installable-v1` y `autonomous-v2` sobreviven aquí sólo para identificar REQUIREMENTS, pilotos y manifests históricos. No nombran productos o releases actuales. Este Plan se llama “Conformidad de release” porque `S7.1` es la declaración terminal del único release.

## Insumo de las tres auditorías exclusivas (2026-08-21)

Las tres auditorías de la Fase 2 del plan de depuración cerraron, y **`S7.1` es la que más cambia con sus resultados**, porque mide conformidad contra las garantías prometidas: cada capacidad retirada achica este examen.

**Qué salió del alcance que `S7.1` tendría que haber medido:**

- **P6 campañas multiproyecto** — 🟡 diferido condicionado por la [decisión 57](../decision-register.md). Ya estaba fuera por la decisión 33, que fijó que un rojo sobre `F8` no bloquea la release.
- **El dashboard de observación** — retirado. `F2` del PRD queda sin implementación, y es trabajo enumerado en el [inventario](../inventario-de-producto.md).
- **La maquinaria de reciclado de P9** — recortada de ~1.900 líneas a dos Sesiones acotadas por la [decisión 62](../decision-register.md).

**Qué se agregó al alcance que `S7.1` va a tener que medir, y ninguna Sesión enumerada cubre todavía:**

1. **El ejecutor de comandos y su superficie** ([decisión 60](../decision-register.md), corregida por la 61). Los trece verbos de `console/vocabulary.mjs` están validados y ninguno tiene ejecutor. `S7.1` no puede declarar conformidad sobre un contrato de operador que no se puede ejercer.
2. **El retiro del adaptador `S4.2` y del fijado literal de Herdr 0.8.0.** Hoy es la única dependencia externa del producto que puede romperse sola.
3. **Por qué canal viaja cada mitad del producto.** La auditoría de P8 midió que el canal de agentes —`mcp.mjs`, el plugin, `main-store/store.mjs`— **no tiene instalador versionado** y que el payload derivado no puede incluirlo por contrato. Un piloto de conformidad sobre una release que instala media Torre mediría media Torre.

**Ninguna Sesión de P7 cambia de estado.** `S7.1` sigue 📋 PLANIFICADO y sus dependencias declaradas —`S4.4`, `S5.3`, `S5.5` y `S10.2`— se conservan. Lo que cambia es que la reconciliación de Planes (tarea 2.4 del plan de depuración) tiene que decidir si esos tres puntos entran en sus prerrequisitos antes de que el examen tenga sentido.
