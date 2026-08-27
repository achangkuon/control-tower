# Plan 2 — Contratos y registro de producto

**Estado:** 🔵 EN CURSO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Change A depende de los documentos aprobados. Change B depende de A. |
| Outputs | A: schemas V1, canonicalización, validadores, golden fixtures, Plan Catalog y primitives del Main store. B: registro XDG path-neutral, bootstrap/import legacy, resolución read-only y rederivación Main. |
| Roadmap | `S2.1` se integró en PR #67, `S2.2` en PR #72, `S2.3` en PR #78, `S2.4` mediante PRs #82, #84, #86 y #88, y `S2.5` mediante PRs #94, #96, #114 y #116. Las responsabilidades posteriores de Change B siguen sin Sesiones enumeradas. |
| Referencias | [`sdd-tower-contract-schemas`](../../changes/sdd-tower-contract-schemas/), [`sdd-tower-project-registry`](../../changes/sdd-tower-project-registry/). |

## Sesiones Change A

| ID | Resultado | Estado | Ref |
|---|---|---|---|
| S2.1 | Foundation de diez schemas y validación duplicate-safe | ✅ COMPLETO | [`tasks.md`](../../changes/sdd-tower-contract-schemas/tasks.md) |
| S2.2 | JCS, ArtifactRef e idempotencia | ✅ COMPLETO | [`tasks.md`](../../changes/sdd-tower-contract-schemas/tasks.md) |
| S2.3 | Main Store and Boundaries | ✅ COMPLETO | issue #77; PR #78; candidato `c96528c08015fd4c0c0bf37de6e04760824262f5`; merge `8139849df44a81ecac6eaafa0c9a2c847e08c77e`; 13/13 focused, 57/57 aggregate y 25/25 probes |

## Sesiones Change B

| ID | Resultado | Estado | Ref |
|---|---|---|---|
| S2.4 | Registry Storage and XDG Path Resolution | ✅ COMPLETO | PR #82 `2903445c201ef2eb83faff147dfd1ed7b5ef50b7`; PR #84 `6d08df069274a2ee9ba29ef624aa93010b998381`; PR #86 `a574d45bd77c851265e7cd08fa1de91f457d9794`; PR #88 `888aca135931389bbddf6bb4500841accca0bcff`; PASS, 0 CRITICAL; 14/14 storage, 57/57 combined, umask 1/1, build y OpenSpec strict PASS |
| S2.5 | Legacy Import Preflight | ✅ COMPLETO | PR #94 `8bcf090ef5a7a9b9c292bad51481a77a7d605b63` (planificación), PR #96 `691aac05a3a3f155c7cc25dd08c03225763e829f` (implementación + tests), PR #114 (evidencia apply) y PR #116 (evidencia verify) integradas; PASS: 0 CRITICAL, 5/5 requisitos, 9/9 escenarios, 12/12 tareas, focused 13/13 y combined 70/70 |

Change B conserva responsabilidades posteriores a `S2.5` sin Sesiones enumeradas. Sus responsabilidades se preservan sin IDs en el [apéndice de migración](../plan-vocabulary-migration-appendix.md).

**Evidencia:** `S2.2` cerró el issue #71 y se integró mediante PR #72 en `bbb59af9ca4de9223e0ec06474725f13329993b6` desde el candidato `ec4a05c66f5c295eba9f9cddc3611f24208ad37a`: 10 paths, 449 líneas authored y contracts test 44/44. `S2.3` cerró el issue #77 y se integró mediante PR #78 con la evidencia indicada arriba.

**Próxima acción:** enumerar una nueva Sesión sólo cuando las responsabilidades posteriores de Change B demuestren un límite de un PR.

### Insumo nuevo — inventario de producto (2026-08-21)

El [inventario de producto](../inventario-de-producto.md), entregado en `778ec55` bajo la [decisión 58](../decision-register.md), le da a P2 el criterio que le faltaba para decidir cuáles de esas responsabilidades son producto:

- `registry/{store,path}.mjs` (203 líneas) queda en el **cajón B**: reclamado por `F1` del PRD y precondición de todo comando del vocabulario que nombra un agente, porque un agente se identifica dentro de un proyecto registrado. **Es producto y le falta consumidor.**
- `registry/legacy-import.mjs` (135 líneas), que entregó `S2.5`, queda en el **cajón D — necesita decisión del maintainer**: es una migración de una sola vez y la pregunta abierta es si ya está cumplida y se archiva.
- `registry/index.mjs` (3 líneas) es un barril: **cajón C, andamio**. Se conecta solo cuando se conecta `registry/store.mjs`.

El ítem *«Change B: adapter Hermes read-only»* del [apéndice de migración](../plan-vocabulary-migration-appendix.md) fue retirado el mismo día por la decisión 57. **Sobreviven cuatro responsabilidades sin ID** —storage y actualización atómica, bootstrap/enrollment/revisionado, UX de alias y resolución inequívoca, y validación de root/common-dir/remote—, que se cruzan contra el vocabulario antes de enumerar cualquier Sesión. Ninguna cambia el estado ni el denominador de P2, que sigue sin denominador derivable.

### Contrato de ejecución — S2.5

| Campo | Valor |
|---|---|
| Estado | ✅ COMPLETO |
| Depende de | `S2.4`, cerrada mediante PR #90 |
| Área | `openspec/changes/sdd-tower-legacy-import-preflight/**` — sólo documentos de evidencia |
| Recurso | ninguno — sin DB, sin migraciones; el token de entrega lo serializa la Torre |

El código se integró en PR #96. La evidencia apply se integró en PR #114 y la evidencia verify en PR #116; ambas están en `master@f4f90bf7f185043953ecbd1ecd11c2f5ef1112a6`.

**Criterios de aceptación** — todos deben pasar para cerrar:

- [x] `apply-progress.md` versionado y entregado como PR3, trazando las 12/12 tareas al commit que las implementó
- [x] `verify-report.md` versionado y entregado como PR4, con 5/5 requisitos, 9/9 escenarios y 0 CRITICAL
- [x] Ninguna ruta fuera de `Área` aparece en ninguno de los dos diffs — cero cambios de código
- [x] `plan-2/STATUS.md` y `master-index` quedan reconciliados con `S2.5` en ✅ COMPLETO y P2 recalculado
- [x] Las responsabilidades restantes de Change B quedan explícitamente sin ID, con su razón registrada

---

## Insumo nuevo — el segundo eje de la frontera (2026-08-25)

Nace de la [decisión 71](../decision-register.md). La auditoría de los doce Planes encontró
que **la Torre es dueña de dos contratos que ya tienen dueño en el harness**, y los dos viven
en el `Área` de P2 —schemas y `contracts/**`—, así que P2 los reclama por propósito.

El criterio de pertenencia es el **test de contenido** de
[la frontera](../frontera-torre-gentle-ai.md): *si la Torre necesita entender el contenido de
una regla para aplicarla, la regla es del harness*.

---

## Sesión 2.6 — Adopción y recorte del contrato de ejecución sellado

**Estado:** ✅ COMPLETO **y publicada** — `c91fddd5c74019de2ef7d691a43d403558c3a92e` es ancestro de `origin/master`; `f2d1a81` cerró su documentación. No queda nada pendiente de esta Sesión.

> **Publicación byte-idéntica, verificada el 2026-08-27.** El candidato entró a `master` sin
> rebase ni recomposición: el tree publicado es `0040cd84b498d5953cd3c9eececbe65e46cf16d2` y el
> padre `99bab46036a1448ff7ebd9e6bbd1147964cda392`, exactamente los que este documento había
> sellado antes del push. `git merge-base --is-ancestor c91fddd origin/master` da 0.

> **Cierre técnico local sobre identidad limpia.** Commit funcional `c91fddd5c74019de2ef7d691a43d403558c3a92e` (`feat(contracts): adopt Tower execution contract`); padre/base `99bab46036a1448ff7ebd9e6bbd1147964cda392`; árbol funcional `0040cd84b498d5953cd3c9eececbe65e46cf16d2`; patch funcional SHA-256 `03235f8632653f868d93ea9643de0dee30d776528d0808505eab2ccff60414ba`.
> **Alcance y verificación autorizados:** exactamente 4 paths, 179 adiciones + 87 eliminaciones = 266 líneas authored; focalizada 87 tests / 0 fallos / 417 aserciones; integral 892 tests / 0 fallos / 5.096 aserciones / 68 archivos. La advisory de reliability conserva el resultado tipado `unavailable` porque RDD está OFF; no se declara PASS.

**Depende de:** nada. **Ruta:** `design-tasks` — hay que elegir la representación de los
bloques ajenos antes del primer Módulo. **Autoridad:** [decisión 71](../decision-register.md),
[decisión 59](../decision-register.md) y [decisión 79](../decision-register.md).

**Área:** `schemas/execution-contract-v1.schema.json`, `jornada/execution-contract.mjs`,
`test/jornada/execution-contract.test.mjs`, `test/contracts/schema.test.mjs`,
`test/fixtures/contracts/schema-cases-v1.json`

**Prohibido:** `contracts/schema-registry.mjs`, `install/**`, `scripts/payload-closure.mjs`.
**Razón dura:** el contrato de `S8.10` (🔵 EN CURSO) exige que
`execution-contract-v1.schema.json` **permanezca sin declarar y fuera del payload**, con
criterio falsificable. Esta Sesión le cambia los bytes, **nunca su membresía**.

**Recurso:** ninguno — sin DB, sin migraciones, sin token de entrega.

**Orden respecto de `S5.13`:** **no corren en paralelo.** Comparten
`test/contracts/schema.test.mjs` y `test/fixtures/contracts/schema-cases-v1.json`.
`S5.13` va primero.

**El problema, medido.** De los veintiséis schemas del directorio, **veinticinco declaran
`$id: https://control-tower.local/...` y sólo éste declara
`https://gentle-ai.local/schemas/unattended-execution-contract-v1.json`**. Es una copia
byte-idéntica del asset de la skill `unattended-implementation`, sellada con SHA-256 por la
[decisión 23](../decision-register.md). Tres de sus doce bloques son del harness: `chain`
(la skill `chained-pr`, con su presupuesto de 400 líneas), `validation` (correr la suite) y
`retries` (el presupuesto de correcciones de RDD, que está **globalmente apagado**).

**Lo que NO se toca, y es la mayor parte.** Ocho de los doce bloques son coordinación pura:
`repository`, `assignment`, `permissions` —con sus diecisiete prohibiciones, que son la forma
sellada de los cinco pisos de `assertFloorProtected`—, `ownership`, `artifact_policy`,
`tower`, `candidate_recipe` y `terminal`.

**Decisiones:**

- `escala` — **RESUELTA por el maintainer el 2026-08-25 ([decisión 71](../decision-register.md)): la Torre adopta el contrato como propio y acepta la divergencia declarada.** **Clase:** contrato visible del producto; dependencias o evidencia contradictorias. **Consecuencia registrada:** el criterio de copia byte-idéntica de la decisión 23 y de `S10.3` deja de valer, y `plan-10/STATUS.md` lleva su nota histórica. **Contaminaba:** `S2.6`, `S10.3`, `S7.1`.
- `escala` — **RESUELTA por el maintainer en la [decisión 79](../decision-register.md): compatibilidad versionada sin transferir autoridad al contrato.** La Torre conserva `schema_version: 1` numérico y acepta exactamente los literales `gentle-ai.unattended-execution-contract/v1` y `gentle-ai.unattended-execution-contract/v2`. v2 sólo valida con supervisión activa segura de la Torre, pisos estrictos de permisos/prohibiciones, candidato sin commit y sin autoridad de entrega, y terminal/coordinación seguros; standalone o inseguro se rechaza. **Clase:** contrato visible del producto; API pública; seguridad y permisos; dependencias o evidencia contradictorias. **Contaminaba:** `S2.6`, `S10.3`, `S7.1`.
- `derivable` — **qué pasa con los bloques ajenos.** **Criterio:** `runtime`, `chain`, `validation` y `retries` son opcionales, opacos y no autoritativos; la Torre no ramifica sobre su contenido. **Falsificable:** un valor interno distinto que cambie autorización o validación. **Autoridad:** decisiones 59 y 79 y la frontera.
- `derivable` — **qué pasa con `artifacts.kind`.** **Criterio:** el enum `proposal|spec|design|tasks|...` se abre a cadena no vacía. La Torre fija el `sha256` de las entradas sin saber que una se llama `design`. **Falsificable:** cualquier nombre SDD que sobreviva como restricción en el schema. **Autoridad:** el test de contenido de la frontera.

**Evidencia contractual instalada.** El asset compatible exacto usa `$id` `https://gentle-ai.local/schemas/unattended-execution-contract-v2.json`, literal `gentle-ai.unattended-execution-contract/v2` y SHA-256 `c1b042d79e887c7f7fe9288d68f280b2e32ca28d6a6cb5543d49e7aa117e327d`. La fixture fija procedencia lógica portable, sin dependencia absoluta. `schemas/execution-contract-v1.schema.json` permanece fuera del registry y del payload.

**Criterios de aceptación, binarios:**

- [x] `rg 'gentle-ai.local' schemas/` no devuelve una sola ocurrencia
- [x] Un contrato sellado hoy por la skill, sin modificar un byte, valida contra el schema adoptado
- [x] Un contrato con `retries`, `chain` o `validation` de valores distintos a los actuales **también** valida
- [x] `rg 'baseline_commands|line_budget|stacked-to-main|size-exception' schemas/execution-contract-v1.schema.json` devuelve cero
- [x] `jornada/execution-contract.mjs` no contiene ninguna comparación contra un literal de fase, comando o presupuesto
- [x] `execution-contract-v1.schema.json` sigue **sin declarar** en `contracts/schema-registry.mjs` y fuera del payload — el criterio de `S8.10` intacto
- [x] `bun test` no introduce fallos nuevos; el diff no toca ninguna ruta del `Prohibido`

**Avance de cierre:** `2/2 Módulos · 7/7 Tareas`.

### Módulo M2.6.1 — Adopción de propiedad
**Paths:** `schemas/execution-contract-v1.schema.json`, `test/contracts/schema.test.mjs`

- [x] `T2.6.1.1` **RED** — test que falla mientras el `$id` no sea `control-tower.local`, enumerando los veintiséis schemas y exigiendo dominio único
- [x] `T2.6.1.2` **GREEN** — `$id` y `title` adoptados; `schema_version` propio de la Torre
- [x] `T2.6.1.3` **REFACTOR** — el testigo de dominio se deriva del directorio, no de una lista escrita a mano

### Módulo M2.6.2 — Recorte a opaco
**Paths:** `schemas/execution-contract-v1.schema.json`, `jornada/execution-contract.mjs`, `test/jornada/execution-contract.test.mjs`, `test/fixtures/contracts/schema-cases-v1.json`

- [x] `T2.6.2.1` **RED** — un contrato sellado hoy por la skill, con `chain`/`validation`/`retries` intactos, debe seguir validando; y uno con `retries` distinto de 1/2/1/0/0, también
- [x] `T2.6.2.2` **RED** — `artifacts.kind` acepta un valor que no es fase SDD
- [x] `T2.6.2.3` **GREEN** — los tres bloques pasan a opacos y salen de `required`; `artifacts.kind` pasa a cadena no vacía
- [x] `T2.6.2.4` **REFACTOR** — ninguna rama de `parseContract` ramifica sobre el contenido de un bloque opaco

---

## Sesión 2.7 — Alarma de deriva del vocabulario de planes

**Estado:** 📚 ARCHIVADO — **retirada el 2026-08-26 por la [decisión 78](../decision-register.md): se quedó sin sujeto.**

> **Por qué se archiva y no se difiere.** Esta Sesión existía para poner la suite en rojo si
> los siete estados o las ocho clases que copia `contracts/session-plan-snapshot.mjs` dejaban
> de coincidir con la convención canónica. La decisión 78 retira ese lector entero —lo ejecuta
> [`S5.15`](../plan-5/STATUS.md)—, porque leer el plan es del agente Support y no de la Torre.
> **Sin copia no hay deriva que vigilar.** No es alcance pospuesto: dejó de ser objetivo, así
> que sale del denominador bajo la regla de la [decisión 57](../decision-register.md).
>
> **Qué NO se pierde.** La alarma protegía una copia que ya no va a existir. La convención
> canónica sigue gobernando los planes; quien la lee es `support/agent.mjs`, del lado del
> agente, donde un cambio de convención es un cambio de skill y no un `CT_SCHEMA_INVALID`
> silencioso en la Torre.
>
> El contrato original se conserva abajo como evidencia histórica, **no como autoridad de
> implementación**.

**Estado histórico:** 📋 PLANIFICADO — decision-clean desde la
[decisión 74](../decision-register.md).

**Depende de:** nada. **Ruta:** `design-tasks`. **Autoridad:** decisión 74.

**Área:** `contracts/session-plan-snapshot.mjs`, `test/contracts/session-plan-snapshot.test.mjs`,
más un testigo nuevo contra `~/.claude/skills/_shared/plan-naming-convention.md`.

**Prohibido:** `schemas/session-plan-snapshot-v1.schema.json` —el contrato público no cambia—,
`contracts/validate.mjs`, `contracts/schema-registry.mjs`.

**Recurso:** ninguno.

**El problema, medido.** `contracts/session-plan-snapshot.mjs:7-14` hardcodea los siete
estados y las ocho clases de escalamiento, más la gramática `## Sesión N.M — título` y la
sección `## Grafo de dependencias`. La autoridad canónica de todo eso es
`plan-naming-convention.md`, que gobierna **todos** los proyectos del maintainer, no sólo
éste. Cambiar la convención hoy rompe la Torre en silencio con `CT_SCHEMA_INVALID`.

**Por qué C y no A ni B.** No existe artefacto machine-readable que consumir:
`planificador-granular` emite Markdown y `plan-catalog-v1` sólo enumera Planes, sin Sesiones.
Y `contracts/session-plan-snapshot.mjs` **no tiene consumidor de producción**: pagar un
sidecar o un vocabulario de origen único por un módulo sin llamador es exactamente el costo de
proceso 4,9 : 1 que midió [`v1-execution-rule`](../v1-execution-rule.md). Detalle completo en
la decisión 74.

**Decisiones:** ninguna abierta.

- `derivable` — **qué mide la alarma.** **Criterio:** el conjunto de siete estados y el
  conjunto de ocho clases, comparados como conjuntos contra la convención canónica. No compara
  gramática de encabezados ni orden. **Falsificable:** una divergencia de estado o de clase que
  la suite no detecte. **Autoridad:** decisión 74.
- `derivable` — **qué hace la alarma cuando la convención no se puede leer.** **Criterio:**
  falla cerrado y lo dice; no asume coincidencia. **Falsificable:** una corrida verde con la
  convención ausente. **Autoridad:** el fail-closed declarado en
  [`v1-execution-rule`](../v1-execution-rule.md).

**Criterios de aceptación, binarios:**

- [ ] Agregar, quitar o renombrar un estado en `plan-naming-convention.md` pone la suite en rojo
- [ ] Agregar, quitar o renombrar una clase de escalamiento pone la suite en rojo
- [ ] La convención ausente o ilegible falla cerrado, nunca en verde
- [ ] El comportamiento de `sessionPlanSnapshotDigest` no cambia: mismos bytes de entrada, mismo digest
- [ ] `schemas/session-plan-snapshot-v1.schema.json` no cambia un byte
- [ ] `bun test` sin fallos nuevos; el diff no toca ninguna ruta del `Prohibido`

**Módulos y Tareas:** pendientes de enumerar. Es trabajo de `planificador-granular`, no una
decisión — la Sesión ya es decision-clean.

---

---

## Sesión 2.8 — Los nombres de fase salen del contrato de binding

**Estado:** 📋 PLANIFICADO — nace el 2026-08-26 del barrido de la [decisión 78](../decision-register.md), como quinto residuo del segundo eje.

**Depende de:** — **Ruta:** `design-tasks`. **Autoridad:** decisión 78 y el test de contenido de [la frontera](../frontera-torre-gentle-ai.md).

**Área:** `schemas/binding-delta-v1.schema.json`, `test/contracts/schema.test.mjs`, `test/fixtures/contracts/schema-cases-v1.json`

**Prohibido:** `contracts/schema-registry.mjs` —el schema sigue registrado y sólo cambian sus bytes—, `contracts/validate.mjs`, `install/**`, `scripts/payload-closure.mjs`, `schemas/execution-contract-v1.schema.json` —es `Área` de `S2.6`—.

**Recurso:** ninguno — sin DB, sin migraciones, sin token de entrega.

**Orden:** el conflicto de archivos con `S2.6` —`test/contracts/schema.test.mjs` y `test/fixtures/contracts/schema-cases-v1.json`— **está resuelto**: `S2.6` se publicó en `c91fddd` y esta Sesión parte de esos bytes ya integrados. `S2.8` es ejecutable sin esperar a nadie.

**El problema, medido.** `schemas/binding-delta-v1.schema.json:5` declara `inputs` con
`["manifest", "proposal", "specs", "design", "tasks", "previous_delta"]` **obligatorios**. Son
nombres de fase SDD dentro de un contrato de la Torre, registrado en
`contracts/schema-registry.mjs` y distribuido en el payload. Es la misma invasión que `S2.6`
corrige en el contrato sellado, en otro archivo, y el barrido del 2026-08-26 la encontró sin
dueño.

**Por qué es una Sesión y no una enmienda.** El destino natural era `S5.13`, que ya recortaba
schemas y tocaba estas mismas fixturas — pero `S5.13` **cerró** el 2026-08-26 en `5a80bc8` y
`30ad0d5`. `S2.6` tampoco pudo absorberla: cerró y se publicó en `c91fddd`, y su `Área` no
incluye este schema. Queda en P2, cuyo propósito —contratos y registro de
producto— la cubre exactamente.

**Resultado único:** `inputs` pasa a **opaco** —`{"type": "object"}` sin restricciones
internas— por el mismo criterio que `S2.6` aplica a los tres bloques del harness: la Torre fija
el digest de las entradas sin saber que una se llama `design`.

**Decisiones:**

- `derivable` — qué pasa con los seis campos. **Criterio:** el objeto entero pasa a opaco y sale de `required`; no se eliminan ni se renombran, para que un `binding-delta` sellado hoy siga validando. Falsificable: un delta existente que deje de validar contra el schema recortado. **Autoridad:** el precedente de `S2.6` y la decisión 78.
- `derivable` — qué NO se toca. **Criterio:** `git`, `contracts` y el resto del schema conservan exactamente su forma; la membresía en el registro y en el payload no cambia. Falsificable: cualquier campo fuera de `inputs` con bytes distintos. **Autoridad:** el alcance declarado de esta Sesión.

**Criterios de aceptación de S2.8** — todos deben pasar para cerrar:

- [ ] `rg 'proposal|specs|design|tasks' schemas/binding-delta-v1.schema.json` devuelve cero
- [ ] Un `binding-delta` sellado con los seis campos actuales **sigue validando** contra el schema recortado
- [ ] Uno con un `inputs` de forma distinta **también** valida
- [ ] `binding-delta-v1` sigue declarado en `contracts/schema-registry.mjs` y en el payload, sin cambio de membresía
- [ ] Ningún campo fuera de `inputs` cambia un byte
- [ ] `bun test` no introduce fallos nuevos; el diff no toca ninguna ruta del `Prohibido`

**Módulos y Tareas:** pendientes de enumerar. Es trabajo de `planificador-granular`, no una
decisión — la Sesión ya es decision-clean.

**Forecast:** 60–120 líneas authored, casi todas de fixtura y prueba.

---

**Denominador de P2:** sigue **sin porcentaje derivable**. `S2.6` y `S2.8` se enumeran y
`S2.7` quedó 📚 ARCHIVADO el 2026-08-26, pero las cuatro responsabilidades de Change B siguen
sin ID, así que el denominador no cierra.
Regla aplicada: [decisión 57](../decision-register.md).
