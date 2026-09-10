# Plan 0 — Documentación canónica

**Estado:** ✅ COMPLETO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Ninguna; este Plan fija la autoridad documental del producto. |
| Outputs | PRD, RFC y REQUIREMENTS aprobados; roadmap; Plan Catalog; Plan Manifest con 15 `slice_id`; proposals A–I; Installable V1 revision 1; Autonomous V2 revision 1; product version map; convención canónica de nombres. |
| Roadmap | `S0.1`, `S0.2` y `S0.3` están ✅ COMPLETO. `S0.3` enmendó la spec derivada y eliminó la contradicción sobre el callback acotado; P0 queda cerrado con 3/3 Sesiones. |
| Referencias | [PRD](../../prd/sdd-tower-implementation-v1.md), [RFC](../../rfc/sdd-tower-implementation-v1.md), [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), [Plan Catalog](../manifest.yaml), [Plan Manifest](../sdd-tower-implementation/manifest.yaml), [Installable V1](../installable-v1/revisions/1/manifest.yaml), [Autonomous V2](../autonomous-v2/revisions/1/manifest.yaml), [version map](../product-version-map.yaml). |

## Radiografía del producto — entregada el 2026-08-20

**Estado:** ✅ COMPLETO · fuera de Sesión, bajo la **decisión 55** del maintainer.

Trabajo de infraestructura documental, no de producto: no toca `RUNTIME_PAYLOAD_FILES`
ni ninguna pieza instalada, y no consume ni desplaza ninguna Sesión enumerada. Se
registra en P0 porque este Plan es dueño de la autoridad documental.

| Campo | Detalle |
|---|---|
| Entregado | `radiografia.json`, `openspec/plans/radiografia.md`, `.githooks/pre-push`, sección nueva en [`AGENTS.md`](../../../AGENTS.md). **El motor es compartido**: la decisión 56 lo llevó al repositorio entonces independiente y el merge `dbb7626904a09323e19dd7a60f747d29c8c62f5d` fijó su ubicación canónica actual en `agent-workflows/radiografia/` |
| Commits | `0e31922` → `56cd35b` (motor local), `ce2001f` (formatos de otros proyectos), `5361eda` (mudanza al motor compartido), `073b85a` y `39483cc` (cierre documental) — commits directos a `master`, sin PR |
| Publicado | [Artifact `bb0891f6`](https://claude.ai/code/artifact/bb0891f6-06d2-489a-a010-8c65b5d78f60), republicado desde el HTML generado. Sólo Claude Code puede publicarlo; el resto de los agentes genera y deja el archivo en disco |
| Tests | 57 en el subtree interno `agent-workflows/test/`, mudados originalmente de este repo con el motor. La suite de acá bajó entonces a **888 pass / 0 fail** por la mudanza, no por pérdida de cobertura |
| Disparo | `.githooks/pre-push` — corre para cualquier agente porque es git, no asistente. Nunca bloquea un push. Si el motor no está en la máquina, lo omite y avisa |
| Artefactos | `radiografia.html` y `.radiografia-cache.json` son build artifacts **gitignoreados** |

**Por qué existe.** Dos veces en una semana la documentación afirmó sobre el código
cosas falsas —`M9.1.1` declarado completo sin estar en `master`, y un hallazgo de
`S5.2` atribuido a un archivo que la Sesión tiene prohibido tocar—, y las dos veces
se detectaron por auditoría manual y no por una alarma. Las cifras del informe ya no
las escribe nadie: salen medidas de `master-index.md` y del repositorio.

**Aplicado a los cinco proyectos** por la decisión 56: Control Tower por commit directo, y ecom-ecuador, Servi-Task-U y Finanzas-Personales por PR, que es su política real. La skill `session-doc` **no se tocó**: sigue apuntando a Notion hasta que el maintainer decida migrarla.

**Cierre verificado el 2026-08-20.** Última medición sobre `39483cc`, árbol limpio, suite
**888 pass / 0 fail**, y el informe se regenera **sin una sola advertencia**: juicio al día,
árbol limpio y suite registrada en este commit. Las tres advertencias que el motor sabe
emitir —árbol sucio, juicio contra otro commit, suite de otro commit— se ejercitaron todas
durante la sesión y las tres se apagaron al corregir su causa.

**Residuo cerrado el 2026-08-28.** El checkout histórico
`~/projects/agent-workflows` obtuvo el remoto privado
[`achangkuon/agent-workflows`](https://github.com/achangkuon/agent-workflows), rama `master`.
Hoy ese checkout queda como archivo read-only: la autoridad activa está en el subtree
`agent-workflows/` de Control Tower desde el merge
`dbb7626904a09323e19dd7a60f747d29c8c62f5d`. Cierra la limitación registrada en la
[decisión 56](../decision-register.md).

**Dos skills de método agregadas el 2026-09-04, sin Sesión enumerada.** `skill-orchestrator`
y `analisis-por-tramos` entraron a `agent-workflows/skills/` en `8b11314` y se registraron en
`SUPPORT_SKILLS`. La primera cubre un hueco confirmado: `skill-composer` sólo trata madres y no
menciona orquestación, aunque el canon ya distingue ambas
([FLUJO-END-TO-END.md](../../agent-workflows/FLUJO-END-TO-END.md)); su procedimiento se destiló de
`torre-control`, que ya funciona. La segunda captura el método que produjo ese mismo documento:
desambiguar, cortar el flujo en preguntas, cerrar cada tramo con el humano y cruzar contra lo
construido y lo ya decidido. Es conversacional por contrato y se niega a correr desatendida.
Instalador 30/30 y `--check` sin drift sobre las cuatro raíces de runtime.

**Alcance del instalador, verificado en la misma corrida:** `runtime_skill_roots` cubre
`~/.agents/skills`, `~/.claude/skills`, `~/.config/opencode/skills` y `~/.codex/skills`. Pi no es
destino —no tiene SkillsDir nativo— pero los bytes quedan en `~/.agents/skills/<skill>/SKILL.md`,
que es la ruta canónica exacta que Pi carga a mano. Los enlaces que hoy tiene
`~/.pi/agent/skills/` hacia `.agents/skills` son manuales y de julio; el instalador no los crea ni
los mantiene.

Este trabajo queda registrado como no planificado: ninguna Sesión enumerada posee la superficie de
skills del método, igual que la skill de runtime de Herdr descrita en
[Audit E](../audits/herdr-skill-ownership-audit.md).

**Checkout local retirado el 2026-09-04.** `~/projects/agent-workflows` y sus cuatro worktrees
se borraron del disco tras validar que no llevaban nada propio: los 86 paths trackeados están en
el subtree, 85 byte a byte y el único distinto es la revisión más nueva de Control Tower; los seis
tips de rama son alcanzables y `588f0282` es ancestro de `master` sobre 58 commits importados; lo
único fuera de Git era el binario compilado de la herramienta hoy llamada `radar`, cuya fuente vive
en `agent-workflows/tools/radar/`. La evidencia queda en
[Audit F](../audits/agent-workflows-migration-validation.md). El remoto privado
`achangkuon/agent-workflows` sigue siendo el archivo read-only; lo retirado es la copia local.

Ese borrado exigía primero `642feeb`: la búsqueda del motor de radiografía listaba el checkout
retirado antes que su propio fallback, y ese fallback resolvía un nivel de más. El hook venía
encontrando el motor **sólo** por la copia previa a la migración, y un motor ausente se omite con
`exit 0` para no bloquear un push — así que el informe habría dejado de regenerarse en silencio.
Ahora se busca primero dentro del repositorio. Verificado en el push de `642feeb`, ya sin la copia
local: el informe se regeneró.

Los worktrees cuya rama es anterior al merge de subtree todavía no llevan el motor y omiten el
informe hasta que integren `master`; se resuelve solo al ponerse al día.

**No movió ningún porcentaje, y conviene decirlo.** Ese trabajo histórico ocurrió
íntegramente en el entonces repositorio independiente `agent-workflows`, no en Control Tower:
no cerró ninguna Sesión enumerada de ningún Plan.
Lo que cierra es este residuo, que nunca tuvo ID. El repo además incorporó `tools/setup.sh`
—instalador propio de las skills de usuario, con la Torre como opt-in— y `tools/install.py`
pasó a omitir los runtimes ausentes en vez de fallar, que era lo que volvía inusable la
instalación en una máquina limpia.

> **Colisión de nombres resuelta en fuente por la decisión 100; entrega pendiente.** Control
> Tower es la fuente canónica de los perfiles y skills específicos de la Torre;
> el subtree interno `agent-workflows/` conserva las skills genéricas reutilizables. La
> separación de ownership sigue siendo por fuente: Control Tower instala sus assets Tower-specific
> y el instalador del subtree, únicamente sus propios assets genéricos.
>
> **Establecido por esta entrega de fuente:** la frontera entre ownership Tower-specific y
> genérico, el contrato padre/router, la regla de sesión ligada al worktree y la migración probada
> del instalador de `agent-workflows/` para retirar copias globales obsoletas (17/0). La guardia
> local de roles pasa 4/0.
>
> **Pendiente de despliegue:** las copias globales instaladas siguen stale hasta ejecutar
> normalmente el instalador después de publicar ambos repositorios. Esto no cierra una Sesión ni
> mueve porcentajes. `S8.12` aún debe consumir y empaquetar las fuentes Tower-owned locales;
> `S8.13` aún debe instalarlas y revertirlas atómicamente. Ninguna recrea ownership ni el router.

**Lo que el informe no puede hacer, dicho explícitamente.** No deriva juicio. La
prosa vive en `openspec/plans/radiografia.md` y lleva `verified_against`; si entran
commits que cambian el producto después de ese sello, el informe lo avisa solo, igual
que avisa un árbol sucio o una suite registrada en otro commit.

`docs/architecture/sdd-tower-implementation.md` conserva material de exploración y no reemplaza los tres contratos normativos.

Installable V1 revision 1 es el contrato de release activo. Autonomous V2 revision 1 preserva la continuación A–I/P6–P11 y consume el ArtifactRef exacto del V1 publicado. `product-version-map.yaml` conserva el pointer canónico y el rollback atómico sin eliminar revisiones históricas.

## Sesión 0.1 — Contratos y artefactos canónicos

**Estado:** ✅ COMPLETO

### Módulo 0.1.1 — PRD

- [x] Tarea 0.1.1.1 — Definir problema, usuario, alcance y no-objetivos.
- [x] Tarea 0.1.1.2 — Definir jornada, control remoto, recovery y campañas V1.
- [x] Tarea 0.1.1.3 — Aprobar criterios de aceptación de producto.

### Módulo 0.1.2 — RFC

- [x] Tarea 0.1.2.1 — Separar producto y mecanismo plan-agnostic.
- [x] Tarea 0.1.2.2 — Fijar roles, autoridad, stores y flujos.
- [x] Tarea 0.1.2.3 — Fijar single-host/fallback, Telegram, recovery y adopción.

### Módulo 0.1.3 — REQUIREMENTS

- [x] Tarea 0.1.3.1 — Fijar schemas y canonicalización.
- [x] Tarea 0.1.3.2 — Fijar state machines, APIs, errores y retención.
- [x] Tarea 0.1.3.3 — Fijar 26 escenarios y gates A–G.

### Módulo 0.1.4 — Índices machine-readable

- [x] Tarea 0.1.4.1 — Publicar el roadmap aprobado.
- [x] Tarea 0.1.4.2 — Validar el Plan Catalog.
- [x] Tarea 0.1.4.3 — Validar el Plan Manifest de 15 slices y sus ArtifactRefs.

## Sesión 0.2 — Migración canónica de nombres

**Estado:** ✅ COMPLETO

**Evidencia:** [PR #69](https://github.com/achangkuon/control-tower/pull/69), merge `fa20b908f129b9f26b2b1fd7d341a170eea4384c`.

### Módulo 0.2.1 — Convención y migración global

- [x] Tarea 0.2.1.1 — Fijar la jerarquía Plan → Sesión → Módulo → Tarea, los estados cerrados y la estructura del índice maestro.
- [x] Tarea 0.2.1.2 — Migrar la documentación de planificación sin renombrar entidades de dominio ni asignar IDs sin límite de PR demostrable.
- [x] Tarea 0.2.1.3 — Integrar la migración global mediante PR #69 y registrar su merge canónico.

## Sesión 0.3 — Enmienda del requisito de puente acotado

**Estado:** ✅ COMPLETO
**Depende de:** —
**Área:** `openspec/specs/**`, `openspec/changes/archive/2026-07-31-installable-v1-autonomous-v2-split/specs/**`, `openspec/plans/product-version-map.yaml`, `openspec/plans/plan-0/STATUS.md`
**Recurso:** — (sin DB, sin migraciones, sin token de entrega)

> **Corrección del `Área`, 2026-08-01.** La declaración original omitía este mismo
> `STATUS.md`. La [regla de ejecución](../v1-execution-rule.md) obliga a actualizarlo en el
> mismo commit que el trabajo, así que sin él la Sesión no podía cerrarse sin violar su
> propio criterio de frontera. Es un defecto de la definición, no un desvío de la ejecución.

Existen hoy dos documentos vigentes que describen la misma versión y se contradicen:

| Fuente | Qué dice |
|---|---|
| [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md) §16–§17 | La autorización de merge por Telegram está dentro del alcance: canal privado con allowlist, sobre inmutable, callback con token opaco, fallback `/ct approve <code>`, y revalidación previa al consumo. |
| [spec de Installable V1](../../changes/archive/2026-07-31-installable-v1-autonomous-v2-split/specs/installable-control-tower-v1/spec.md) `:73-87` | El puente **MUST NOT** exponer Git delivery ni merge, y el escenario *Remote authority is rejected* obliga a **rechazar** una solicitud de merge proveniente de Hermes. |

La [unificación del 2026-08-01](../release-chain.md) puso la aprobación remota dentro de la primera versión, así que la contradicción pasó de latente a bloqueante. No se resuelve con una lectura favorable: en una frontera de autoridad, la ambigüedad es el incidente.

El principio de §16.1 no se toca — **Hermes presenta; Main crea, valida y consume.** Lo que se amenda es la confusión entre *transportar una decisión* y *tener autoridad*.

> **Nota de alcance, 2026-08-30.** El sujeto de esta enmienda —el puente remoto— salió del producto: la Torre corre en la máquina donde se trabaja. **El principio que la enmienda defendía sobrevive intacto y es más importante que su sujeto:** presentar una decisión no es tener autoridad sobre ella. Valía cuando la superficie era remota y vale ahora que es la terminal. Las Tareas marcadas `[x]` arriba son registro de trabajo hecho y no se reescriben.

### Módulo 0.3.1 — Enmienda del requisito

- [x] Tarea 0.3.1.1 — Reescribir el requisito *Optional bounded Hermes bridge* para distinguir explícitamente presentación y transporte de callback acotado, que quedan permitidos, de creación y consumo de autoridad, que siguen siendo exclusivos de Main.
- [x] Tarea 0.3.1.2 — Reescribir el escenario *Remote authority is rejected* para que rechace lo que debe rechazar —shell cruda, lanzamiento de workers, selección implícita de proyecto y toda solicitud de merge que no porte una autorización creada por Main— sin rechazar el callback acotado.
- [x] Tarea 0.3.1.3 — Agregar el escenario complementario: un callback que llega sin autorización `PENDING` vigente, o con identidad fuera de la allowlist, falla cerrado y no muta nada.

### Módulo 0.3.2 — Reconciliación de autoridad

- [x] Tarea 0.3.2.1 — Registrar en `product-version-map.yaml` que las etiquetas `installable-v1` y `autonomous-v2` dejan de ser identidades de producto, conservando las revisiones históricas sin eliminarlas.
- [x] Tarea 0.3.2.2 — Verificar con `rg` que ningún documento normativo vigente siga afirmando que el puente debe rechazar todo merge, y corregir los que queden.
- [x] Tarea 0.3.2.3 — Confirmar que §16 y §17 de REQUIREMENTS no requieren cambios: la enmienda alinea la spec derivada con ellos, no al revés.

**Criterios de aceptación de S0.3** — todos deben pasar para cerrar:

- [x] Ningún documento normativo vigente contradice a otro sobre si el puente puede transportar un callback de merge
- [x] El texto amendado mantiene explícito que Hermes no crea ni consume autoridad
- [x] Existe un escenario que obliga a fallar cerrado ante callback sin autorización vigente o identidad no allowlisted
- [x] Existe un escenario que sigue rechazando shell cruda, lanzamiento de workers y selección implícita de proyecto
- [x] `product-version-map.yaml` conserva todas las revisiones históricas
- [x] El diff no toca ninguna ruta fuera del `Área`

### Evidencia de cierre

| Verificación | Resultado |
|---|---|
| Barrido de contradicciones (`rg` sobre `specs/`, `prd/`, `rfc/`) | Sólo quedan enunciados **compatibles**: la regla vigente es «merge exige autorización creada por Main», que es lo que dice REQUIREMENTS §16.4 |
| §16 y §17 de REQUIREMENTS | Intactos — la enmienda alineó la spec derivada, no la autoridad |
| `bun test test/provenance/` | **17 pass · 0 fail** |
| Parseo de `product-version-map.yaml` | OK; `release_lane` sin cambios en ambos productos |
| Diff-check del `Área` | 2 archivos, ambos dentro |

### Alcance sin ID surgido en esta Sesión

`T0.3.2.1` quedó registrado como **nota en el YAML, no como campo machine-readable**. Convertirlo en un campo con su test exige tocar `test/provenance/provenance.test.mjs:116-117`, que está **fuera del `Área`** y fija ambos `release_lane`. No se le abre Sesión propia: es una línea de test que puede viajar con cualquier Sesión futura que ya toque `test/provenance/**`, y hasta entonces la autoridad de la unificación vive en [release-chain](../release-chain.md), que sí es canónica.

## Sesión 0.4 — Migración del plan al modelo de Zonas

**Estado:** 🔵 EN CURSO
**Depende de:** Fase A cerrada en `master@b3da46174b75dc97e52afa72900f6263655aa378`
**Área:** `openspec/changes/migrate-control-tower-plan-zones/**`, `agent-workflows/tools/radar/**`, `agent-workflows/MIGRACION-ZONAS.md`, `openspec/plans/plan-0/STATUS.md`, `openspec/plans/master-index.md`, y en la activación `openspec/plan.yaml`, `openspec/ROADMAP.md`, `openspec/archive/legacy-planning/**`
**Recurso:** — (sin DB, sin migraciones, sin token de entrega)

El trabajo vive en `feat/s0.4-plan-zones-migration`. **Nada está integrado en `master`:** la rama
es respaldo, no entrega. `openspec/plan.yaml` y `openspec/ROADMAP.md` siguen sin existir, y el
corpus legacy sigue siendo la autoridad vigente hasta la activación atómica de C09.

### Avance verificado

| Grupo | Commit | Resultado |
|---|---|---|
| Importación histórica | — | 72 de 72 Sesiones originales, con procedencia inmutable |
| R1 contrato | `8501458` | Tipos y validación genérica de referencias en Radar |
| R2 proyecciones | `699a0ea` | Listado separado en `status` y `render`, sin filtrarse a lo operativo |
| P1 prueba final | `3bfe304` | Verificador de partición; excepción de tamaño aceptada por el maintainer |
| D1 datos | `cb4a961` | 11 referencias con localizador autenticado contra objetos Git reales |
| Corrección de R1 | `f8a7ca4` | Cierre de aristas `depende_de` sin conceder ejecutabilidad |
| S100 planificada | `14ac794` | Sesión completa, ruta `direct`, seis criterios binarios |
| Artefactos SDD | `8081c4b` | 6.370 líneas de propuesta, spec, diseño, tareas y evidencia incorporadas al repo |

### Decisiones de producto cerradas el 2026-09-06

| Decisión | Resolución |
|---|---|
| Valores de `planning.prepare_through` | Valor único `TAREAS`; el Módulo siguiente siempre se prepara hasta sus Tareas |
| Unidad de `horizon_ceiling` | Cuenta Sesiones; la ventana de Módulos recibe un campo propio |
| Ruta de `S100` | `direct` — sin decisiones abiertas |
| Ruta de `S101` | `full-sdd` — la solución no es derivable de lo escrito |
| Presupuesto de revisión | Código 400 líneas; documentación y datos por unidad completa, sin tope |

### Actualización al 2026-09-09 — supersede el registro del 2026-09-06

El registro anterior de esta Sesión quedó en el 2026-09-06 y **ya no describe el estado**. Tres
cosas cambiaron:

- **El contrato de partición creció.** Ya no es `85 registros = 74 completas + 7 futuras + 4
  históricas`. Tras el delta S9.9/S9.10 es **`86 = 75 completas + 7 futuras + 4 históricas`**,
  y el descubrimiento ejecutable es `72 base + 2 suplemento − 1 reemplazada = 73` Sesiones únicas.
- **`S101` y `G1` están cerradas.** `S101` se resolvió por ruta `full-sdd` en su propio cambio
  SDD `s101-policy-resolution`, con `verdict: pass`; `G1` cerró con evidencia de solo lectura.
  Las dos figuraban como «lo que falta» y ya no lo son.
- **`C06` y `C07` están cerrados.** `C06` el 2026-09-08 por corrección de compuerta autorizada;
  `C07` el 2026-09-09 sobre identidades reproducibles.

| Checkpoint | Estado | Nota |
|---|---|---|
| C01–C05 | ✅ | Prerrequisito de Radar, congelado del corpus fuente, inventarios, linaje y partición |
| M0.4.5A (R1, R2, P1, D1, D2, G1) | ✅ | Contrato de referencia, proyecciones y evidencia de cierre |
| S101 | ✅ | Ruta `full-sdd`, cerrada en su propio cambio SDD |
| C06 | ✅ | Cerrado el 2026-09-08 vía corrección de compuerta autorizada |
| C07 | ✅ | Cerrado el 2026-09-09 sobre identidades reproducibles |
| C08 | ✅ | Cerrado el 2026-09-09 tras traer `master` a la rama; reproducción READY |
| C09 | 📋 | Activación atómica — **paso único irreversible** |
| M0.4.9 | 📋 | Verificación post-entrega y registro de cierre |

Tareas de implementación: **38 cerradas, 7 abiertas** (6 de C08/C09 más `T0.4.5.2`, superseded
por M0.4.5A).

### Estado de C07 — cerrado el 2026-09-09

La prueba `migration/proof/rebuild-c07-r14.sh` reproduce el sujeto técnico en un `GIT_DIR`
privado enlazado por alternates al almacén de objetos real, de modo que el repositorio nunca se
muta: los inventarios de refs y objetos se comparan idénticos antes y después.

| Verificación | Resultado |
|---|---|
| Corrida limpia de la prueba | PASS — árbol del sujeto `b50de802…`, 589 entradas, digest `7b4ca256…` |
| Re-corrida **después** de editar los receipts | PASS — árbol, conteo y digest idénticos; confirma que `receipt_exclusions` se sostiene |
| Estabilidad entre corridas de los 7 digests vinculados | ESTABLE |
| Partición exacta (P1) | PASS: 75 completas / 7 futuras / 4 históricas = 86 |
| Descubrimiento de Sesiones | PASS: 72 + 2 − 1 = 73 únicas |
| Estados derivados | PASS: S9.10 y S101 ambos `BLOQUEADO` en el candidato |
| `bun test .../migration/proof/` | **30 pass · 0 fail** |
| Ambos caminos de cierre documental sin push | PASS |

**Defecto corregido.** Los receipts vinculaban valores que no podían reproducir: una receta
vieja, y además identidades con marca de tiempo por construcción —el OID del commit del sujeto,
el digest de la atestación, los inventarios del repo vivo y el estado del doc-guard—. Ahora
vinculan sólo el **árbol** del sujeto, el digest de path/mode/blob y el `recipe_sha256`. Es la
diferencia entre *el plano* y *la hora en que se imprimió el plano*.

### C08 — cerrado el 2026-09-09, tras resolver la divergencia con `master`

`reproduce-c08.sh` sale 0 con `READY`. Reproduce contra el manifest de C07 el plan `b794dd1a…`,
el ROADMAP generado `1b183579…`, las 31 copias y los 14 retiros, **sin calcular OID de paquete**.
El blob del ROADMAP **no cambió con el merge**: traer 14 commits de master no movió el plan
renderizado, lo que confirma que el candidato es estable. Proyección de activación: 33 archivos,
+13.977 / −250, árbol de 600 rutas. Suite completa tras el merge: **1212 pass · 0 fail**.

**Re-corte del archivo, 2026-09-09.** Cuatro entradas del inventario todavía archivaban la foto
del fork (`43130ad4`) y habían quedado 14 commits atrás. Por decisión del maintainer se
re-apuntaron al tip de master `fbcb546e` —`plan-0/STATUS.md`, `plan-5/STATUS.md`,
`master-index.md` y `decision-register.md`— con el mismo patrón que ya usaba `plan-9`:
`source_commit` propio por entrada. **Verificado:** el blob de `plan-5` que se archiva contiene
el registro del arreglo de `jornada` que master agregó después del fork, así que los 14 commits
sobreviven al archivo en vez de perderse.

C07 y C08 se re-probaron sobre el inventario nuevo y pasan. Identidades nuevas de C07: sujeto
`923f1fb8…`, 589 entradas, digest `9a2bfd5b…`. **El plan `b794dd1a…` y el ROADMAP `1b183579…` no
cambiaron**: sólo se movió la identidad del sujeto, que es lo que corresponde. Proyección de
activación: 33 archivos, +14.022 / −134, árbol de 602 rutas. Suites: `bun test` 1212 pass · 0
fail; `go test` de Radar ok.

**Queda un hallazgo para C09:** el bloque `validation.expected` de `partition.yaml` declara 588
archivos contra 602 observados. Radar nunca lo lee, y corregirlo reiniciaría toda la cascada de
identidades porque ese archivo está dentro del sujeto de C07.

#### La divergencia que hubo que resolver

El arnés `migration/proof/reproduce-c08.sh` corre y encontró el bloqueo antes de que C09 pudiera
romper nada. Radar exige que el commit de origen de cada Sesión importada sea **ancestro
estricto** del HEAD. Un sujeto sin padre produjo 119 rechazos; parenteándolo en el HEAD de
entrega bajaron a 4 —S9.9, S9.10 y S101—, todos resolviendo al padre lógico `e6b7e673`, que
**no es ancestro de esta rama**.

| Dato | Valor |
|---|---|
| Merge base | `43130ad4` — el `source_commit` de la migración |
| Esta rama por delante | 125 commits |
| `origin/master` por delante | 14 commits |
| Padre lógico `e6b7e673` | está en master, 3 commits atrás de su tip `fbcb546e` |
| Fuentes de archivo que master cambió | **5 de 31** |

Las cinco son `master-index.md`, `plan-0/STATUS.md`, `plan-5/STATUS.md`, `plan-9/STATUS.md` y
`decision-register.md` — justo los archivos que C09 archiva y retira. C07 dio verde porque su
prueba parentea el sujeto en `e6b7e673`, un commit de master: es el árbol de esta rama con la
ascendencia de master, una combinación que ningún commit de esta rama tenía.

**Si C09 se activara sin resolver esto, archivaría los bytes viejos de esos cinco archivos y
descartaría 14 commits de master**, incluidos el cierre de S9.9, el gate de S9.10 y el arreglo
de política de entrega de `jornada`.

**Resolución elegida el 2026-09-09:** traer `master` a la rama. Este documento y `master-index`
se resolvieron **a favor de master**, que estaba más avanzado y era más preciso. Una enumeración
de `S0.4` escrita ese mismo día en la rama resultó redundante —master ya la tenía— y se descartó;
lo que sobrevive es la evidencia de C07 y este bloqueo, que master no tenía.

### C09 — intentado y revertido el 2026-09-09

La activación se ejecutó y fue **byte-perfecta**: `openspec/plan.yaml` `b794dd1a…`,
`ROADMAP.md` generado `1b183579…`, 31 copias de archivo, 14 retiros, 33 archivos
+14.022/−147, árbol de 602 rutas, `final_package_identity=f459dfd4…` igual al tree del propio
commit. Radar validó 11 Zonas y 75 Sesiones, el ROADMAP se regeneró byte a byte y las 31
copias resultaron legibles.

**Pero el readback de `T0.4.8.3` falló** y por contrato la entrega se detuvo: `bun test` pasó de
1212/0 a 1198/1. Al retirar las vistas legacy quedaron cinco consumidores apuntando a archivos
que ya no existen. Por decisión del maintainer se revirtió la activación (`116ee27`) para migrar
primero a esos consumidores, de modo que **ningún commit deje el repositorio roto**. La evidencia
del hallazgo se conservó; sólo se deshizo la activación. Suite de vuelta en **1212 · 0**.

**El caso grande no es un cambio de ruta.** El motor de radiografía parsea del `master-index.md`
las filas `| P<n> |` y la línea `Avance global`. El ROADMAP nuevo es por Zona: tiene **cero** de
ambas. Re-apuntarlo cambiaría un archivo faltante por un fallo de parseo, y apuntarlo al archivo
congelaría para siempre la medición de avance — justo lo contrario de para lo que ese motor
existe. Necesita leer `openspec/plan.yaml` directamente, y eso es trabajo que **ninguna Sesión
posee**.

Los otros cuatro consumidores sí son re-apuntes simples: el fixture de bytes en
`test/contracts/session-plan-snapshot.test.mjs`, la referencia a `plan-12/STATUS.md` en el
`ROADMAP.md` de la raíz, la de `plan-9/STATUS.md` en `agent-workflows/MIGRACION-ZONAS.md`, y los
tres tests del motor, que siguen a la decisión que se tome sobre él.

Trazabilidad: activación `8628319`, registro del hallazgo `a98243a`, reversión `116ee27`.

### Punto de retoma

**Próximo paso concreto — C08 (`T0.4.8.1`).** Reproducir con índice Git privado únicamente la
receta, el contenido y la evidencia que lista el manifest de C07, y registrar readiness **sin
calcular ni afirmar OID de paquete**.

| Debe reproducir | No debe compararse |
|---|---|
| Árbol del sujeto `b50de802c21c0d0e778d1dd8423636cff851d9fb` | OID del commit del sujeto (lleva timestamp) |
| `path_mode_blob_inputs`: 589 entradas, digest `7b4ca256…` | Digest del archivo de atestación (lleva el proof_root) |
| `recipe_sha256` `64ca75e2…` | Digests de refs/objects del repo vivo |
| Blobs de contenido: plan `b794dd1a…`, ROADMAP `1b183579…` | `state_sha256` del doc-guard (lleva epoch UNIX) |

**Chequeo que C08 arrastra:** `partition.yaml` `validation.expected` declara `588` archivos
(`archivo: 228`, `cimientos: 45`, `instalacion: 11`) contra `589` observados (`229`, `46`, `10`).
El `+1` de `archivo` es el propio script de prueba; el intercambio entre `cimientos` e
`instalacion` **no** queda explicado. Radar nunca lee ese bloque —verificado con `rg`— y no se
corrigió porque `partition.yaml` está dentro del sujeto. C08 materializa el árbol de activación
real, que es donde corresponde comparar.

**Cómo reproducir las pruebas desde cero:**

```
migration/proof/rebuild-c07-r14.sh <repo> <proof-root-vacío> <doc-guard> <sha256-del-hook>
migration/proof/reproduce-c08.sh   <repo> <work-root-vacío>
```

Los root son desechables y deben estar ausentes o vacíos. Los tests van con `bun test`, nunca con
`node --test`: los imports `bun:` hacen fallar a Node con `ERR_UNSUPPORTED_ESM_URL_SCHEME`, que
parece un error de código y no lo es.

**Riesgo abierto.** `rebuild-c07-r14.sh` se incluye a sí mismo en el sujeto que atestigua, así que
cualquier edición futura del script invalida en silencio todos los receipts. Sacarlo de su propio
overlay, o fijar `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE`, elimina la trampa; ambas cambian la
identidad del sujeto y exigen re-prueba autorizada.

**C09 no se empieza sin cabeza fresca.** Reemplaza todo el corpus de planificación heredado en un
solo movimiento y es el **único paso irreversible** de esta migración. El diff completo son
18 856 líneas y debe partirse en lotes de revisión de **≤400 líneas** antes de la entrega.
