# Cadena de release — producto único

> Decidido el 2026-08-01 por el maintainer. Este archivo define **qué tiene que estar
> cerrado para declarar la primera versión del producto**, y en qué orden lo permite el
> grafo de dependencias.
>
> El [master-index](master-index.md) dice DÓNDE estamos. Este archivo dice QUÉ FALTA
> para salir. El estado del código vive en [implementation-state](implementation-state.md).

## La decisión

**Control Tower es un solo producto, con un solo roadmap y un solo release.** Las etiquetas
`installable-v1`, `autonomous-v2`, “V1” y “V2” sobreviven sólo como nombres de artefactos
históricos; no son identidades vigentes de producto ni de release.

Motivo: el maintainer definió que la primera versión no se declara hasta poder **aprobar
desde el teléfono** las decisiones que requieren su autoridad. Esa capacidad está
especificada en `sdd-tower-implementation-v1-requirements.md` §16–§17, y el split del
2026-07-31 la había reasignado al lane `autonomous-v2`. Con ese alcance dentro, la
frontera entre los dos "productos" ya no describe el trabajo: dejó de separar dos cosas
entregables y pasó a separar la primera versión de sí misma.

### Lo que NO cambia

1. **La entrega sigue siendo incremental.** Un roadmap único no significa que nada sale
   hasta que sale todo. Cada Sesión sigue siendo una unidad entregable a `master`, y el
   orden lo dicta el grafo, no un big bang.
2. **`CT_V2_ONLY` no se borra.** `bin/torre:28` corta capacidades en código, no en prosa.
   Al desaparecer la frontera de producto, esa línea pasa a ser un **flag de capacidad
   opt-in, apagado por defecto**. La autonomía se enciende porque alguien la enciende,
   nunca porque se cayó una etiqueta.
3. **Las etiquetas históricas pueden orientar la lectura de artefactos**, nunca dividir el producto,
   el roadmap o el release.
4. **El orden de hosts se acota.** OpenCode cierra primero mediante una raíz primaria Main-owned con vista adjunta no autoritativa. `S4.2` conserva la entrega Herdr inicial como historia; `S4.5` reemplaza su lifecycle futuro. `S1.17`–`S1.19` siguen diferidas.

## El punto de release

La primera versión OpenCode se declara cuando el maintainer puede, desde Moshi:

- ver el estado y los escalamiento que Main le presenta;
- decidir sobre el objetivo exacto que Main mantiene como autoridad;
- continuar el loop planner N+1 / implementer N sin que el wake otorgue autorización.

Main posee backend, proceso y raíz primaria por worktree. La TUI adjunta sólo permite steering local y su cierre no afecta la raíz; Herdr puede ser como máximo un launcher de vista reemplazable. La recuperación queda limitada al mismo host/worktree/checkpoint: una vista perdida reconecta el root vivo y una muerte probada crea root/epoch sucesores con lineage, brief durable y fencing stale, sin reutilizar el ID anterior.

## La cadena

```mermaid
graph LR
  S31["S3.1 workspace · ✅"] --> S32["S3.2 orquestación · ✅"]
  S32 --> S33["S3.3 capability registry · ✅"]
  S33 --> S34["S3.4 ciclo de vida Jornada · ✅"]
  S34 --> S103["S10.3 contrato versionado · ✅"]
  S103 --> S101["S10.1 preparación persistida · ✅"]
  S101 --> S102["S10.2 supervisión válida · ✅"]
  S102 --> S71
  S34 --> S51["S5.1 candidate contracts · ✅"]
  S51 --> S41["S4.1 fence hosts · ✅"]
  S111["S1.11 reconciliación P7 · ✅"] --> S112["S1.12 reconciliación P8 · ✅"]
  S112 --> S113["S1.13 lifecycle · ✅"]
  S113 --> S114["S1.14 polling · ✅"]
  S114 --> S115["S1.15 conformidad · ✅"]
  S115 --> S116["S1.16 OpenCode wake · ✅"]
  S116 --> S42["S4.2 Herdr inicial · ✅"]
  S41 --> S42
  S42 --> S45["S4.5 raíz Main-owned · 🟢"]
  S45 --> S43["S4.3 liveness · 📋"]
  S43 --> S44["S4.4 recuperación WSL · 📋"]
  S41 --> S52["S5.2 entrega idempotente · 🔴"]
  S33 --> S52
   S52 --> S53["S5.3 planner/implementer · 📋"]
  S51 --> S54["S5.4 ruteo de escalamiento · ✅"]
  S54 --> S56["S5.6 snapshot de Sesión · ✅"]
  S56 --> S57["S5.7 decisión/respuesta · ✅"]
  S57 --> S58["S5.8 binding de respuesta · ✅"]
  S58 --> S511["S5.11 provenance de checkpoint · ✅"]
  S511 --> S512["S5.12 composición Main→parking · ✅"]
  S512 --> S59["S5.9 binding de checkpoint · ✅"]
   S59 --> S510["S5.10 binding de trabajo completado · 📋"]
   S510 --> S55["S5.5 parking/retoma · 📋"]
   S53 --> S71["S7.1 conformidad · 📋"]
   S44 --> S71
   S55 --> S71
```

| Orden | ID | Resultado | Estado | Depende de |
|---|---|---|---|---|
| ✅ | `S8.8` | Adopción del instalable en el runtime en uso | ✅ COMPLETO | `S8.2` ✅ |
| ✅ | `S0.3` | Enmienda del requisito de puente acotado | ✅ COMPLETO | — |
| ✅ | `S3.1` | Workspace | ✅ COMPLETO | `S2.4` ✅ |
| ✅ | `S3.2` | Orquestación | ✅ COMPLETO | `S3.1` ✅; implementación `22c43ae`, 14/14 criterios `CORROBORATED_FIXED` |
| ✅ | `S3.3` | Agent Capability Registry | ✅ COMPLETO | `S3.2` ✅; implementación `4621d3f`, 14/14 criterios verificados por el planner contra el SHA integrado |
| ✅ | `S3.4` | Persistencia y ciclo de vida de Jornada | ✅ COMPLETO | `S3.2` ✅, `S3.3` ✅; implementación `b6dda84`, 11/11 criterios verificados por el planner contra el SHA integrado. **Cierra P3 entero** |
| ✅ | `S5.1` | Candidate contracts, authorization store y frontera Support | ✅ COMPLETO | `S3.2` ✅, `S3.3` ✅, `S3.4` ✅; candidato `c7c2472`, 27/27 criterios y 537/537 tests |
| ✅ | `S4.1` | Hosts y línea exclusiva | ✅ COMPLETO | `S3.1` ✅, `S3.2` ✅, `S5.1` ✅; cierre técnico `1f5fea7`, 19/19 criterios |
| ✅ | `S1.11` | Reconciliación independiente legacy P7 | ✅ COMPLETO | `S1.9` ✅, `S1.10` ✅; publicado en `origin/master@3db3c121` |
| ✅ | `S1.12` | Reconciliación independiente P8 | ✅ COMPLETO | `S1.11` ✅; `6bb7019` es ancestro de `origin/master@a3d9e51` |
| ✅ | `S1.13` | Root lifecycle e invalidación sincrónica | ✅ COMPLETO | `S1.12` ✅; `794611f` es ancestro de `origin/master@a3d9e51`; focused 10/0/73 y full 620/0/3691 |
| ✅ | `S1.14` | Polling y wake safety | ✅ COMPLETO | `S1.13` ✅; `9886af9` es ancestro de `origin/master@a3d9e51`; focused 18/0/175, full 628/0/3793, 392 líneas authored |
| ✅ | `S1.15` | Conformidad lifecycle OpenCode | ✅ COMPLETO | `S1.14` ✅; `428b3ed` y documentación `e37a159` son ancestros de `origin/master@a3d9e51`; full 643/0/3818 en 41 archivos, 399 líneas authored |
| ✅ | `S1.16` | Transporte reconciliado y composición wake | ✅ COMPLETO | `S1.15` ✅; implementación `da4e391`, parent `a3d9e51`; focused expandida 49/0/304, full 671/0/4020 en 43 archivos, 298 líneas authored; la entrega directa incluye este cierre documental |
| ✅ | `S4.2` | Lanzamiento visible de raíz OpenCode | ✅ COMPLETO | Entregada en `61a5aa2`; Herdr 0.8 conserva valor histórico, no lifecycle futuro |
| ▶ | `S4.5` | Raíz primaria Main-owned con vista adjunta | 🟢 LISTO | `S4.2` ✅; decision-clean: backend per-worktree y Herdr view-only temporal resueltos; tres Módulos ejecutables en secuencia |
| — | `S4.3` | Inspección, liveness y rehidratación segura | 📋 PLANIFICADO | `S4.5`; evidencia backend/proceso/root-session, no pane/Herdr |
| — | `S1.17` | Gate y RED Pi/Intercom | 🟡 DIFERIDO | trabajo posterior host-neutral; no bloquea OpenCode |
| — | `S1.18` | Adapter Pi/Intercom | 🟡 DIFERIDO | `S1.17` diferida |
| — | `S1.19` | Regresión Pi/Intercom | 🟡 DIFERIDO | `S1.18` diferida |
| — | `S4.4` | Recuperación lógica same-host con raíz sucesora | 📋 PLANIFICADO | `S4.3`; decision-clean por 40, con reconexión de vista o raíz/epoch sucesores; no hay failover multi-host |
| ✅ | `S5.4` | Ruteo de escalamiento fuera/en casa | ✅ COMPLETO | `S5.1` ✅; publicado en `origin/master` mediante `976b8d0`, `75549a7`, `f9f2869` y reconciliado en `d114677`; 9/9 Tareas, 15/15 criterios. **No** depende de `S8.7` |
| — | `S5.2` | Entrega idempotente y post-check | 🔴 BLOQUEADO | `S4.1` ✅, `S3.3` ✅; recheck 8193 mantiene abiertos 1/3/5 y decisión 8195 estaciona el candidato NOT READY |
| ✅ | `S5.6` | Contrato canónico de snapshot de Sesión | ✅ COMPLETO | `S5.4` ✅; publicado en `origin/master@75ddcf9`, 10/10 Tareas, 10/10 criterios, focused 75/0/348 y full 588/0/3452 |
| ✅ | `S5.7` | Contratos canónicos de decisión estacionada y respuesta | ✅ COMPLETO | `S5.6` ✅; publicado en `origin/master@3db3c121` e integrado en `master@427b14e` |
| ✅ | `S5.8` | Binding de opción seleccionada en autoridad canónica | ✅ COMPLETO | `S5.7` ✅; integrada y verificada localmente en `master@427b14e` mediante `6bb7019`, focused 42/0/250 y full 610/0/3618, sin push remoto |
| ✅ | `S5.11` | Productores canónicos de provenance del checkpoint | ✅ COMPLETO | `S5.8` ✅; integrada y verificada localmente en `master@b4d7fcd` (tree `7873570`), 12/12 criterios, full 656/0/3941 en 42 archivos, 620 líneas authored bajo `size:exception`, sin push remoto |
| ✅ | `S5.12` | Composición única de productores hacia parking bajo Main | ✅ COMPLETO | `S5.11` ✅; implementación `e7b1437f8c98c5856236e06e4c1fb5c40e9dc8ef`, 8/8 criterios, focused 52/0/306, full 663/0/3986 y publicación probada en `origin/master@cebcaeb` |
| ✅ | `S5.9` | Binding autoritativo del checkpoint estacionado | ✅ COMPLETO | Entregada el 2026-08-18 en `3c3040d`, `754c698` y `8d4b28a`; `full-sdd` completo hasta verify, 7/8 criterios con evidencia de runtime y el criterio 2 enmendado por la decisión 41 |
| — | `S5.10` | Binding inmutable del trabajo independiente completado | 📋 PLANIFICADO | `S5.9`; ruta `design-tasks` |
| — | `S5.5` | Parking y retoma del loop | 📋 PLANIFICADO | `S5.10`; planner N+1 / implementer N |
| — | `S5.3` | Continuación planner/implementer | 📋 PLANIFICADO | `S5.2`; decisiones propias resueltas |
| — | `S8.7` | Puente Hermes/Telegram | 📚 ARCHIVADO | supersedido por Moshi; no integra producto ni release OpenCode |
| ✅ | `S10.3` | Contrato de ejecución versionado | ✅ COMPLETO | `S3.4` ✅; candidato exacto basado en `cdd0d09`, 17.297 bytes, 407 líneas, SHA-256 `2f4838aa244b30e280c5c558286b0e4d9fbb503a0ef1808ffc27501c1540fddc`; entrega directa aún no autorizada |
| ✅ | `S10.1` | Preparación persistida de Jornada | ✅ COMPLETO | `S10.3` ✅; candidato técnico verificado, focused 8/0/144 y full 679/0/4164 en 44 archivos; owner pasivo Jornada-local y cero efectos |
| ✅ | `S10.2` | Supervisión válida sin armado local | ✅ COMPLETO | `S10.1` ✅; comportamiento local `44f23adbb80bed974246aa3761573a388e5761bf`, tree `d5343fda0373c5152ad94bc248db5a5d0ccf8031`; focused 4/0/22, full 721/0/4361 en 52 archivos durante supervisión externa válida y `remote-control` 2/0/14 sin cambios |
| 8 | `S7.1` | Conformidad de release OpenCode | 📋 PLANIFICADO | `S4.4`, `S5.3`, `S5.5`, `S10.2`; Pi y S8.7 no son prerequisitos |

> **Contradicción reconciliada el 2026-08-11.** Hasta esta fecha el grafo Mermaid declaraba
> `S44 --> S71` y esta tabla omitía `S4.4`, con la prosa sin mencionar su retiro. Las dos
> lecturas tenían autoridad idéntica dentro del mismo archivo, y la diferencia valía siete
> Sesiones — `S4.2`–`S4.4` más `S1.16`–`S1.19`, la mitad del trabajo restante.
>
> **Resuelta por el maintainer: gana el grafo.** `S7.1` depende de `S4.4`; la rama de
> recuperación y failover entra en la cadena de release. La tabla se corrige para coincidir.
> La decisión histórica fue explícita —construir las catorce Sesiones que ese corte enumeraba como restantes— y no una derivación; la reconciliación actual agrega los prerrequisitos omitidos sin reescribir aquella evidencia.

**Treinta y siete Sesiones históricas · 26/37 cerradas o archivadas (70%).** `S8.7` queda archivada y no integra la ruta activa. `S5.9` ya cerró; `S4.5` aporta cero mientras está `LISTO`. P10 queda completo mediante `S3.4 → S10.3 → S10.1 → S10.2 → S7.1`. Esta métrica no reemplaza el `32/47` de Sesiones activas del [master-index](master-index.md). `S5.6`–`S5.12` agregan siete unidades revisables y
secuenciales entre `S5.4` y `S5.5`: snapshot/parser canónico, contratos de decisión/respuesta,
binding terminal, productores de provenance, composición Main→parking, binding autoritativo de
checkpoint y binding inmutable del trabajo completado bajo la autoridad exclusiva de Main. La
separación fue aprobada por el maintainer porque expandir `S5.5` ad hoc, validar localmente o
sintetizar provenance en consumidores duplicaba contratos y autoridad.

Las siete Sesiones entregan los contratos, productores y bindings que `S5.5` consume. `S5.5`
estaciona y retoma sólo desde el checkpoint durable y los campos declarados `Depende de`, `Área`,
`Recurso` y `Decisiones`; no deriva elegibilidad adicional.

`S3.4`, enumerada el 2026-08-04, existía porque `jornada-v1` era contrato **sin implementación**,
y `policy/jornada.mjs` —que entregó `S3.2`— es un resolvedor puro que recibe la Jornada como
argumento, no un store. Su alcance es **pasivo**: incrementa `jornada_revision` en toda
transición, con lo que una Jornada terminada invalida por drift las entradas de capability
ligadas a ella; no dispara revocación activa en cascada.

`S7.1` pasa a depender de `S5.5` en vez de `S5.4`: verificar que el escalamiento **sale**
no alcanza como conformidad de release si la Torre igual se queda esperando la respuesta.
`S5.5` depende transitivamente de `S5.4` a través de `S5.6`–`S5.12`, así que la cobertura
de `S5.4` queda incluida.

`S0.3` cerró el 2026-08-01 en `9595b92`. Como evidencia histórica, resolvió la contradicción sobre si el
puente puede transportar un callback de merge **ya no existe**. La decisión aceptada de
2026-08-10 agrega que Remote Control y Tower comparten bot/gateway pero usan plugins,
comandos, repositorios y releases separados; el interlock conserva una única autoridad.
Tower adaptaba contratos de identidad/scope hash, CAS, receipts, envío idempotente,
privacidad y TTL sin importar código de Remote Control. La rebase 2026-08-17 archivó esa ruta junto con `S8.7`.

El comportamiento Hermes/Telegram restante es evidencia histórica archivada; no participa en la ruta activa.

## Capacidad paralela hoy

La capacidad se deriva del grafo, `Área`, `Recurso` y decisiones abiertas; no se declara como un número fijo.

`S1.16` y `S4.2` están ✅ COMPLETO; `S4.5` preserva la entrega histórica y reemplaza la propiedad crítica Herdr para trabajo futuro.

La capacidad inmediata es `S4.5`, que requiere `session-plan` antes de ejecutar. Las decisiones 38/39 habilitan `S4.5/M4.5.1`–`M4.5.3` en secuencia. `S4.3`, `S4.4`, `S5.3`, `S5.10`, `S5.5` y `S7.1` están 📋 PLANIFICADO; `S5.2` sigue 🔴 BLOQUEADO.

**Estado de decisiones al 2026-08-18: 39/39 `escala` resueltas y cero abiertas en esta cadena.** La 38 eligió backend aislado por worktree, la 39 Herdr view-only temporal y la 40 recuperación lógica con raíz sucesora tras muerte probada. Quedan la segunda corrección autorizada de `S5.2` y el dueño de la brecha 6; son trabajo/residuo, no decisiones abiertas. El prerrequisito `enroll/**` pertenecía al puente Telegram/Hermes archivado con `S8.7`; no es responsabilidad activa. Fuera de esta cadena queda abierta la decisión independiente de `S9.2`, sin dependencia declarada sobre esta ruta. Ver el [registro](decision-register.md).

El siguiente inicio debe derivar capacidad desde el grafo y los campos vigentes, no desde esta fotografía. Ningún sucesor de `S5.9` o `S4.5` recibe crédito por el cierre de `S5.9`: `S5.10`, `S4.3`, `S4.4`, `S5.5` y `S7.1` conservan sus condiciones.

## Enmienda `S0.3` — ✅ COMPLETA

Había una contradicción entre dos documentos que describían la primera versión:

| Fuente | Qué dice |
|---|---|
| `openspec/specs/sdd-tower-implementation-v1-requirements.md` §16–§17 | La autorización de merge por Telegram es parte del alcance. Define canal, sobre, callback, fallback textual y revalidación. |
| `changes/archive/2026-07-31-installable-v1-autonomous-v2-split/specs/installable-control-tower-v1/spec.md:73-87` | El puente **MUST NOT** exponer Git delivery ni merge. El escenario *Remote authority is rejected* obliga a **rechazar** una solicitud de merge que venga de Hermes. |

Se resolvió sin interpretación. En una frontera de autoridad, la ambigüedad es el incidente.
`S0.3` enmendó el requisito del puente acotado para que el puente pueda **presentar** una
autorización y **transportar** un callback acotado, manteniendo intacto el principio de
§16.1: *Hermes presenta; Main crea, valida y consume.* El puente nunca tiene autoridad;
transporta la decisión de quien sí la tiene.

## Drift reconciliado — ✅ CERRADO el 2026-08-03

`schemas/authorization-v1.schema.json` y `main-store/store.mjs` **ya coinciden**. Se resolvió
como prerrequisito, fuera del freno de ejecución, porque era un contrato que dos archivos leían
distinto y no trabajo nuevo de `S5.1`.

Eran **seis** divergencias, no las dos que este documento registraba:

| Schema exigía | Store exigía | Resolución |
|---|---|---|
| `pr` (PR-specific), opcional | `target`, `source_sha`, `target_sha` | `delivery` con `shape` (`pull-request`/`direct-push`) |
| `required_checks_digest`, `policy_report_digest` | `checks` | ganan los digests |
| `registry_revision` + `jornada_revision` | un solo `revision` | ganan los dos del schema |
| `nonce_hash`, `created_at`, `action`, `state`, `schema`, `schema_version` | no los exigía | el store los exige |
| clave `state` | clave `status` | `state` |
| valores `PENDING\|CONSUMED\|REJECTED\|EXPIRED\|REVOKED` | `PENDING\|APPROVED\|REVOKED\|EXPIRED` | `PENDING\|APPROVED\|REJECTED\|EXPIRED\|REVOKED` |

**El schema mandaba**, por `sdd-tower-implementation-v1-requirements.md:111` (lista normativa) y
`contracts/schema-registry.mjs:12`. Pero necesitaba enmienda antes de que el store se le adaptara:
su `action` era `MERGE_PR` y su único binding de entrega era `pr`, las dos cosas atadas a entrega
por pull request, incompatibles con el corte política/seguridad de `d232fdf`. Ahora `action` es
`MERGE` y el binding es `delivery`, con condicionales que exigen `number` sólo en `pull-request`
y prohíben `delivery` en `START_JORNADA`.

**Dos cosas que la reconciliación destapó y arregló de paso:**

- El store **no podía registrar un rechazo**. Sus decisiones terminales eran `APPROVED`, `REVOKED`
  y `EXPIRED`; `REJECTED` no existía pese a estar en el enum canónico. Ahora sí.
- `createAuthorization` validaba contra un array `required` escrito a mano al lado de un schema
  canónico — que es exactamente cómo se produjo el drift. Ahora valida contra `authorization-v1`
  vía `contracts/validate.mjs`, así que la clase de bug es estructuralmente imposible.

`S5.1` cerró como dueña del authorization store, sin el contrato roto que existía antes de su ejecución.

Corresponde a `S5.1`, que es la Sesión que toma posesión del authorization store.

## Alcance sin ID

Se registra explícitamente en lugar de esconderse:

- **P2 — responsabilidades posteriores de Change B.** Sin límite de un PR demostrable. Ver
  el [apéndice de migración](plan-vocabulary-migration-appendix.md).
- **P6 — Campañas multiproyecto.** Sin Sesiones enumeradas. Fuera de la cadena de release.
- **P8 — `S8.5` y `S8.6`.** 🟡 DIFERIDO por decisión del 2026-07-31. Se mantienen fuera.
