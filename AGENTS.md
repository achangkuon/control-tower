# Control Tower — reglas del proyecto (todos los agentes)

> Archivo canónico de la política de entrega. Aplica a **cualquier** agente que
> trabaje en este repo: Claude Code, opencode, PI, Codex o un humano.
> `CLAUDE.md` apunta acá; no dupliques la regla, edítala en este archivo.

## La autoridad de planificación — desde el 2026-09-10

**El único origen editable del plan es `openspec/plan.yaml`.** `openspec/ROADMAP.md`
es su vista generada: la produce `radar render` y **no se edita a mano** nunca. Si los
dos discrepan, el que está mal es el ROADMAP y se regenera.

**Quedan prohibidos los índices de estado paralelos.** Ningún agente crea ni actualiza
un `STATUS.md`, un `master-index.md`, ni ningún archivo que registre avance fuera de
`plan.yaml`. El estado no se escribe: se **calcula** desde la evidencia de entrega en
Git, y `radar status` es el único que lo calcula. Un archivo que lo declare a mano es
una segunda fuente de verdad, y ya nos costó tener el mismo avance con dos números
distintos y ambos defendibles.

Un consumidor que necesite las cifras las pide con `$HOME/.local/bin/radar status --json -C <raíz del repo>`
(`radar.snapshot/v1`); no re-parsea el ROADMAP ni reimplementa el cálculo.

### Cómo se elige qué sigue

**Para saber qué trabajo sigue, corré `$HOME/.local/bin/radar status --json -C <raíz del repo>`**.
Para una Sesión usá `$HOME/.local/bin/radar sesion <ID> -C <raíz del repo>`. Para ver todo lo
que falta agrupado por meta, o ubicar una Sesión en una línea, usá
`$HOME/.local/bin/radar faltan [<ID>] -C <raíz del repo>`. La admisión nunca ejecuta un binario
del repositorio ni código del checkout. Sólo se proponen Sesiones `LISTO` en el orden de su
Zona; el humano elige y el agente no decide.

Al nombrar una Sesión en una conversación o en un artefacto escrito, usá siempre el formato de
`radar faltan <ID>` — meta, subprioridad, Zona, título y estado —, nunca el ID solo. Por
ejemplo: `S148 (Torre V3 › cimientos — título, PLANIFICADO)`.

Nunca elijas trabajo a partir de la memoria (Engram), de un cambio viejo en
`openspec/changes/`, del corpus archivado o del número siguiente a la última Sesión
entregada. Si alguna de esas fuentes apunta a una Sesión que no está `LISTO`, decilo con su
estado calculado y su bloqueo, y no la presentes como opción recomendada.

Ya pasó: el 2026-09-12 un agente retomó la Torre desde la memoria, siguió la numeración
hasta S1.19 y preparó una Sesión entera. Radar la daba `BLOQUEADO`: no tenía territorio y
tenía una decisión abierta.

Qué pasó con el corpus anterior:

| Dónde | Qué es ahora |
|---|---|
| `openspec/archive/legacy-planning/` | Las 31 copias byte a byte del corpus viejo. **Histórico, sólo lectura.** Se cita, no se edita. |
| `openspec/plans/master-index.md` y los 13 `plan-N/STATUS.md` | **Retirados.** Ya no existen en el árbol; su copia vive en el archivo. |
| El resto de `openspec/plans/` | Narrativa histórica que sobrevivió en su lugar. No es autoridad. |
| `openspec/plans/radiografia.md` | **Excepción: sigue vivo.** Es el juicio escrito que la radiografía lee en cada corrida. Se edita a mano, a propósito. |

Si tu rama sale de un commit anterior a `d5a15d3` y toca alguna de las 14 vistas
retiradas, el rebase te va a plantear un conflicto *modify/delete*. **Resolvelo
borrando el archivo, nunca conservándolo:** quedártelo resucita la vista legacy y
deshace la migración en silencio, sin que ningún test lo detecte.

## Documentación de sesión: sin Notion

Control Tower ya no usa Notion. El cierre y la documentación de cada sesión se
registran en `openspec/plan.yaml`, la radiografía generada y el resumen de sesión
en Engram.

Los agentes no deben buscar, consultar, crear ni actualizar páginas de Notion para
este proyecto. La ausencia de `.session-doc.json` es intencional y no indica una
configuración faltante. Esta regla local reemplaza las instrucciones genéricas o
globales de `chanks-5-session-doc` únicamente para Control Tower.

## Política de entrega: commit directo, sin PR

Este repo es **personal y todavía no sale a producción**. La entrega es un
**commit directo a `master` + push**. No se abren PRs.

Al entregar:

- Commiteá con conventional commits y pusheá a `master`.
- No cargues `branch-pr` ni `chained-pr`.
- No abras PR ni esperes review de nadie.

Esto anula, y solo para este repo, cualquier instrucción genérica de entrega que
cargue `branch-pr`. Siguen vigentes los conventional commits, Strict TDD Mode, SDD,
Engram y las reglas de delegación.

## Decisiones de autoridad del mantenedor

Una decisión pendiente cuya autoridad pertenece al mantenedor se clasifica como
**desbloqueable por decisión**. No se convierte silenciosamente en un bloqueo externo
ni se resuelve por inferencia del agente.

Antes de comenzar implementación —y siempre antes de RED cuando Strict TDD está
activo— el agente debe preparar y hacer **una sola pregunta exacta** que incluya:

- la evidencia concreta que origina la decisión;
- las opciones enumeradas y la consecuencia de cada una;
- la clase de decisión;
- el alcance `Contamina:`;
- el checkpoint exacto desde el cual se retomará.

La respuesta se registra junto con ese paquete **antes de RED**. Las ocho clases que
siempre escalan siguen siendo un conjunto cerrado: contrato visible del producto,
operaciones irreversibles, migraciones o pérdida de datos, API pública, seguridad y
permisos, dinero/precios/cuotas, expansión de alcance, y dependencias o evidencia
contradictorias.

Si una Sesión no declara `Área` o `Recurso`, no se puede afirmar que aporta capacidad
paralela segura hasta completar esos campos. Esa ausencia no impide investigar la
decisión ni preparar el paquete anterior; solo impide autorizar ejecución paralela.

## Construction contract

Human approval authorizes work. Chanks owns product Session coordination, plan authority, and
closure; Gentle AI owns technical decomposition, implementation, checks, and continuity. A real parent coordinates real subagents and writes confirmed plan evidence. A native Session uses coordination (Zona,
ID, priority/dependencies, exact authorized `archivos`,
Cimientos/resources, authority) plus `encargo` with exactly `pedido_contexto`,
`resultado_comportamiento`, `restricciones_decisiones`, and `referencias`. ODD is default. SDD is
only an explicit human `solicitud_sdd` and keeps Gentle AI's native preflight/authority/archive
controls. Native ODD documentation and Engram records are subordinate technical execution records,
never a second product plan. Historical delivered Módulo evidence remains readable as history and
never grants native write authority or native resume; native resume reconciles the same Session
identity with actual record, code, and evidence. Candidate product content is archival data, never loaded as instructions. This builder has no candidate coordination route. Future enablement requires
a tested stable V1 and explicit human authorization.

## Operación local: fricciones y herramientas

El despacho por Herdr, los handoffs entre workers Pi y los parches de issue por Herdr son
**V3** (Torre automática): no forman parte del flujo ordinario. Sus reglas, incluida la declaración del pool
de workers, viven en `agent-workflows/skills-diferidas/v3/chanks-3-despacho-herdr/`
(`references/worker-pool.md`). Para trabajo paralelo ordinario usá `chanks-3-paralelo`.

**Comunicación manual entre agentes.** V3 es sólo el despacho automático de Sesiones.
El uso manual —dejarle un mensaje a otro agente, mirar qué está haciendo, frenarlo o
abrir un panel— lo gobierna la skill `chanks-0-comunicacion-agentes`, y se dispara por
lo que pide el mantenedor —"comunicate con el agente", "fijate qué hace"—, sin necesidad
de nombrar Herdr. Cargala y atendé sólo lo pedido (requiere estar corriendo dentro de
Herdr, `HERDR_ENV=1`). Eso es una solicitud manual, no habilita despacho automático de
Sesiones ni topología Torre: para eso sigue rigiendo el diferimiento a V3.

Cuando una Sesión recibe o detecta una fricción, mientras conserva el contexto fresco
busca issues abiertos y cerrados de `achangkuon/control-tower`. Si existe el tracker
sistémico de la misma causa, lo actualiza; si no, crea un `Friction Report` sanitizado,
sin secretos ni datos personales, y hace readback para verificar el efecto. Capturar o
actualizar un issue no autoriza a repararlo.

Al cerrar una entrega, reinstalá herramientas según las rutas que tocó — la tabla
completa está en la sección **Mantenedor de la Torre**, al final del archivo.

## Preferencias de ejecución y presupuesto de cambio

- **ODD es el default nativo** y continúa automáticamente por preparación técnica → apply →
  checks → checkpoint sin un menú de rutas ni escalamiento a SDD por complejidad. Sólo una
  `solicitud_sdd` humana explícita entra al flujo SDD nativo una vez por Sesión; no se crea un
  motor SDD paralelo. Las rutas/Módulos/Tareas de contratos legacy siguen como evidencia histórica,
  no como requisitos de planificación nativa.
- El tamaño y la división de la implementación siguen la **guía nativa de Gentle AI**;
  **Chanks no agrega regla de tamaño** ni pregunta por tamaño. Este repo no usa PRs ni PRs
  encadenados.
- Si una Sesión no puede conservar un alcance coherente, se divide en dos
  o más Sesiones bajo la coordinación nativa `Zona → Sesión`. No se crea un nivel nuevo;
  Módulo/Tarea sobreviven sólo como evidencia técnica o legacy, nunca como autoridad de escritura nativa.

## Radiografía del producto — se regenera al entregar

El estado del producto se publica como un informe HTML autocontenido pensado para
que el mantenedor —que no programa— entienda dónde está el proyecto sin leer
`openspec/`. Se genera; no se escribe a mano.

**El motor compartido vive en este repositorio**, en
`agent-workflows/radiografia/`, para que los cinco proyectos usen el mismo. Control
Tower aporta además su configuración y su juicio.

```sh
bun agent-workflows/radiografia/run.mjs              # mide y regenera
bun agent-workflows/radiografia/run.mjs --with-tests # además corre la suite
bun agent-workflows/radiografia/run.mjs --check      # sale 1 si quedó viejo
```

No usa ninguna capacidad de asistente. Claude Code, opencode, PI, Codex, un cron o
una persona lo corren igual.

**Ya no se dispara sola: el informe es a demanda.** El hook `.githooks/pre-push` ya no
genera el informe en cada `git push`. Lo que corre en cada push son las tres suites
obligatorias declaradas en `package.json` —Bun (`bun run test`), Go (`bun run test:go`)
y Python (`bun run test:python`)— y el push se bloquea si alguna falla o si falta la
herramienta que necesita (bun, go o python3): una suite que no corre no es una suite que
pasa. El informe se genera cuando alguien lo pide, con
`bun agent-workflows/radiografia/run.mjs`; un informe no es un gate y nunca reemplaza a
las suites.
`core.hooksPath` es configuración local y no viaja en el clon — en un worktree o
clon nuevo hay que activarlo una vez:

```sh
git config core.hooksPath .githooks
```

**Qué edita cada quien:**

| Archivo | Quién lo escribe | Qué contiene |
|---|---|---|
| `openspec/plans/radiografia.md` | un agente, a mano | El juicio: qué significa cada número, qué está en riesgo, qué decisión es del mantenedor |
| `radiografia.json` | una vez, al adoptar | Extensiones, directorios excluidos, comando de tests y el manifiesto del payload instalable |
| `radiografia.html` | el generador | El informe. **Gitignoreado**: es artefacto de build, no se commitea ni se edita |
| `.radiografia-cache.json` | el generador | Último resultado de la suite y en qué commit se midió. Gitignoreado |

Las **cifras no se escriben nunca a mano**: avance por Plan, cola, líneas, share
instalado y resultado de la suite salen medidos de `openspec/plan.yaml` y del
repositorio. Esa es la razón de existir del generador — dos veces en una semana
la documentación afirmó sobre el código cosas que eran falsas.

Al cambiar el juicio, actualizá `verified_against` en el front matter al commit
contra el que lo verificaste. Si entran commits que cambian el producto después de
ese sello, el informe lo avisa solo, igual que avisa un árbol sucio o una suite
registrada en otro commit.

### Publicación

La publicación del informe es mantenimiento de fábrica — está en la sección
**Mantenedor de la Torre**, al final del archivo.

## Declaración de política — forma legible por máquina

La prosa de este archivo es para humanos. El bloque de abajo expresa en forma
parseable la **política de entrega configurable** del repositorio; las reglas de
decisión, rutas y presupuesto anteriores no forman parte de `delivery-policy` v1.
Si la prosa de entrega y el bloque se contradicen, **el bloque es el que rige** y
la contradicción es un bug que hay que arreglar en el mismo commit.

```yaml
schema: delivery-policy
schema_version: 1
merge:
  authorizing_party: human
delivery:
  shape: direct-push
  target_branch: master
planning:
  horizon_ceiling: 2
```

Qué significa cada campo:

| Campo | Valores | Efecto |
|---|---|---|
| `merge.authorizing_party` | `human`, `automatic` | Quién autoriza el merge. La autorización sigue siendo obligatoria y atada al candidato inmutable; esto solo define quién la emite. |
| `delivery.shape` | `direct-push`, `pull-request` | Forma de la entrega remota. No altera el orden commit → verificar tree → congelar SHA. |
| `delivery.target_branch` | nombre de rama | Destino de la entrega. |
| `planning.horizon_ceiling` | entero ≥ 1 | Cuántas Sesiones puede planificar por delante el loop autónomo diferido a V3. |

El valor `2` rige sólo ese loop autónomo. La planificación manual —enumeración y
preparación de Sesiones aprobadas por el humano— no está limitada por ese valor.
Esto no autoriza ejecutar Sesiones, saltar la admisión de Radar ni la prioridad
vigente, autoasignar workers, ampliar el alcance ni quitar otros floors de seguridad.

**Esto NO puede tocar los floors de seguridad.** Ninguna combinación de valores
habilita mutación remota antes de `DELIVERY_READY`, ni reescribe un candidato
congelado, ni borra del ledger, ni permite autoasignación de workers ni coordinación
sin aprobación humana. Un bloque que lo intente se rechaza nombrando el floor violado.

**Fail-closed.** Un campo ausente, un valor desconocido o un bloque no parseable
**no vale como default permisivo**: resuelve al valor más restrictivo
(`merge.authorizing_party: human`, `horizon_ceiling: 2` para el loop autónomo) y
el motivo queda nombrado. Un repo sin este bloque se comporta como antes de que
existiera.

### Por qué

`master` no tiene branch protection ni rulesets, y el repo no tiene `.github/`.
El PR acá no corría **ningún** check automático: era ceremonia, no seguridad.

### Lo que reemplaza al PR

Lo único que el PR sí aportaba era la unidad de revert. A cambio:

- **Un commit = una unidad revertible.** Si una tarea no se puede revertir con un
  solo `git revert`, va en commits separados.
- **El Documentation Close Gate sigue activo.** `.doc-guard.json` declara
  `policy: "solo"`, y por eso `git push` cuenta como entrega. Si la entrega cierra
  trabajo planificado, debe quedar declarada en `openspec/plan.yaml`; si no cierra
  nada, el agente declara «nada que registrar». Sin una de esas dos evidencias, el
  cierre de sesión queda bloqueado igual que antes lo hacía un PR.

### Alcance real de la aplicación — leelo antes de asumir

La regla escrita aplica a todos los agentes. **El bloqueo duro no.**

| Agente | Regla escrita | Gate que bloquea |
|---|---|---|
| Claude Code | sí | **sí** — `~/.claude/hooks/doc-guard.sh` vía `settings.json` |
| opencode | sí | no |
| PI | sí | no |
| Otros / humano | sí | no |

El gate es un hook del harness de Claude Code y ningún otro agente lo ejecuta. Si
trabajás desde opencode o PI, **la disciplina de documentar es tuya**: declarás el
cierre de trabajo planificado en `openspec/plan.yaml` en el mismo push, o indicás
«nada que registrar» cuando la entrega no cierra nada, sin que nadie te frene si
no lo hacés.

### Worktrees

`.doc-guard.json` está trackeado a propósito para que cada worktree herede la
política. Una rama que todavía no tenga el archivo resuelve a `strict` — el
default seguro — hasta que rebasee sobre `master`.

### Volver al flujo con PR

Poné `policy: "strict"` en `.doc-guard.json` (o borrá el archivo) y eliminá esta
sección. El default global del hook es `strict`: cualquier repo que no declare
nada exige PR, así que los proyectos delicados no dependen de este archivo.

<!-- mantenedor:control-tower -->
## Mantenedor de la Torre — perspectiva de fábrica

Esta sección es del mantenedor: cómo se crea, mejora y publica la Torre misma.
No forma parte de la política de entrega del repo y **no viaja en las
actualizaciones**: la release de la Torre sólo reemplaza el bloque generado
`control-tower:project-workflow` del final de este archivo; todo lo demás, esta
sección incluida, sobrevive intacto. Las reglas del resto del archivo siguen
rigiendo a cualquier agente que trabaje acá, estén o no citadas acá.

### Editar la Torre

- Skills propias V1: se editan en `agent-workflows/skills/`; las diferidas en
  `agent-workflows/skills-diferidas/`. El instalador las deja en la carpeta central
  `~/.agents/skills`; Claude Code llega por symlinks por skill, y OpenCode, Codex y
  Pi la leen directo. Nunca borres y recopies directorios runtime.
- Antes de evaluar o publicar un cambio de la Torre, cargá la skill personal
  `torre-release`: mapa de impacto (`references/impacto.md`) y receta de
  publicación (`references/publicar.md`). Push, publicación y actualización de la
  máquina real exigen autorización humana explícita y separada.
- Nunca muevas ni sobrescribas un tag publicado; contenido idéntico con otro tag
  usa promoción de procedencia.

### Cuándo un cambio a master es una release

Un push a `master` **no** es una release. La release es un tag nuevo e inmutable más
sus assets publicados; lo que usan los proyectos sólo cambia cuando existe ese tag y
alguien actualiza su Torre instalada. La pregunta que decide es **qué nota quien usa
la Torre**, no cuántos commits ni cuántas Sesiones entraron.

**Qué viaja.** Sólo lo que enumera el roster explícito del paquete y los módulos del
motor que declara el constructor de la release; las rutas exactas están en la fase
«Auditar qué viaja» de la skill `torre-release`. En resumen: Radar
(`agent-workflows/tools/radar/`), el motor, el instalador y la TUI del producto V1,
las skills V1 del roster (`agent-workflows/skills/`), las plantillas de instrucciones
del producto y las firmas (`agent-workflows/chanks/torre-firma.mjs`,
`agent-workflows/tools/hooks/`). Todo lo demás no viaja: `openspec/`, `docs/`, `odd/`,
tests, reviews, skills diferidas y personales, y este archivo fuera del bloque generado.

| Qué cambió | Qué se hace | Versión |
|---|---|---|
| Nada de lo que viaja | Sólo push. No hay release. | — |
| Arreglo de algo ya publicado | Release enseguida, chica y frecuente. | patch: `v1.2.5` → `v1.2.6` |
| Capacidad nueva y visible para quien usa la Torre | Se espera a que cierren todas las Sesiones que la completan; se publica el lote junto. | minor: `v1.2.x` → `v1.3.0` |
| Una meta entera del plan (por ejemplo Torre V2) | Un solo salto, cuando todas sus Sesiones están cerradas. Nunca una meta a medias. | major: `v1.x` → `v2.0.0` |

Reglas que acompañan la tabla:

- **Los arreglos van de a poco; las metas van de un salto.** Un arreglo que espera a
  una meta deja a los proyectos con un defecto conocido sin necesidad.
- **Un arreglo no arrastra trabajo a medias.** Si `master` ya tiene commits de una
  capacidad incompleta que viaja, el arreglo no se publica desde ese commit sin que el
  mantenedor lo decida viendo qué más saldría.
- **Al cerrar cada entrega el agente lo dice.** Compara las rutas tocadas contra «Qué
  viaja» y reporta una de tres: «no viaja», «amerita patch `<tag>`» o «espera a
  `<capacidad o meta>`». Si no puede clasificarlo, lo dice y no lo presenta como «no viaja».
- **Reportar no es publicar.** La clasificación es informativa. Publicar sigue
  exigiendo la autorización humana explícita y separada, y la receta de `torre-release`.
- **El número lo elige el mantenedor.** El agente propone el tag según la tabla; no
  hay campo de versión que incrementar y un tag publicado no se corrige.

### Reinstalación de herramientas tras una entrega

Al cerrar una entrega en este repo, cualquier agente reinstala las herramientas
según las rutas que tocó:

| Rutas tocadas | Acción posterior a la entrega |
|---|---|
| `agent-workflows/tools/radar/` | Ejecutar `agent-workflows/tools/install-radar.sh`. |
| `agent-workflows/skills/` o `agent-workflows/templates/` | Pedir confirmación humana antes de reinstalar skills; sólo entonces ejecutar `python3 agent-workflows/tools/install.py` y `python3 agent-workflows/tools/install.py --check`. Las skills propias se editan ahí y el instalador las deja en la carpeta central `~/.agents/skills`; Claude Code llega por symlinks por skill, y OpenCode, Codex y Pi la leen directo. |

### Publicación de la radiografía

El informe se publica como Artifact en claude.ai y **sólo Claude Code puede
publicarlo** — es una herramienta suya. Los demás agentes lo generan y lo dejan
en disco; el mantenedor lo abre local con `xdg-open radiografia.html`, y la
próxima sesión de Claude Code lo republica a la misma URL. Que un agente no
pueda publicar no es motivo para saltear la generación.

<!-- /mantenedor:control-tower -->

<!-- control-tower:project-workflow -->
## Control Tower V1 — project workflow (generated by Control Tower v2.0.2-rc.2; do not edit by hand)

This project uses Control Tower V1. Its plan lives in `openspec/plan.yaml`; `openspec/ROADMAP.md`
is generated from it and is never edited by hand. These rules apply only inside this project.

### Who decides what
- **Chanks (this workflow) decides WHAT is worked on and in what order** — stages 1, 2, 3 and 5.
- **Gentle AI decides HOW** — implementation, delegation, tests, review, commits and delivery.
  Follow Gentle AI exactly as it instructs; this block adds no rules of its own on those topics.
- This block only guides the flow. If anything here seems to conflict with Gentle AI, Gentle AI wins.

### The flow
```
Human request
      ↓
🗼 radar etapa · what does the evidence allow?
      ├── New idea → 💪 Stage 1 Define scope
      │                    ↓
      │              💪 Stage 2 Prepare until LISTO
      │                    ↓
      │              🗼 radar check (validate the plan)
      │                    ↓
      └── Resume ───→ 🗼 radar status
                           ↓ LISTO
                     💪 Stage 3 · human approves the lot → subagents in parallel
                           ↓
                     💪 Stage 4 → Gentle AI implements and reviews
                           ↓
                     💪 Stage 5 · deliver per repo policy (human authorizes)
                           ↓
                     🗼 Close in plan.yaml (radar archivar → check → render)
                           ↓
                     back to radar status
```
🗼 = a Radar call. 💪 = a Chanks stage. Radar never chooses work; it only reports.

### Reading the plan
Never read `openspec/plan.yaml` whole. It grows with every Session and wastes the context window.
Read it only through Radar, and only what the current step needs:
- To choose work, use `radar status --json` or `radar faltan` (summaries, not contracts).
- Once the human picks Sessions, run `radar sesion <ID>` once per chosen Session and read only those.
  Example: the human approves S12 and S15 for parallel work → run `radar sesion S12` and
  `radar sesion S15`; nothing else from the plan enters the conversation.
- When a stage skill must edit `openspec/plan.yaml`, locate the exact entry first and read only
  those lines; never load the file to browse it.

### When to run Radar
| Moment | Run | Why |
|---|---|---|
| Start of every conversation, before acting on a request | `radar etapa` | Tells which stage the evidence allows: define, prepare, work or close |
| The human asks "what's next?" or "how are we doing?" | `radar faltan` | Remaining Sessions and progress per area |
| Before proposing work | `radar status --json` | Which Sessions are LISTO and which pairs are compatible |
| Before starting one Session | `radar sesion <ID>` | Its full contract: goal, constraints and the exact files it may touch |
| After ANY edit to `openspec/plan.yaml` | `radar check` | Validates the plan; fix every error before continuing |
| After `radar check` passes | `radar render` | Regenerates `openspec/ROADMAP.md` |
| A Session's commit was delivered | `chanks-5-session-doc` (it runs `radar archivar <ID>` → `check` → `render`) | Records the closure |
| Planning the territory of a new area | `radar zonas` | Shows which files belong to which area |
Radar only reports. It never chooses work and never replaces the human's decision.

### Which skill to load
Follow the copiloto card (🧭, injected on every turn) — it names the skill to load for the
current stage; load each skill only when its stage starts. Shipped entry skills: `chanks-1-adopcion`,
`chanks-1-project-kickoff`, `chanks-1-autoridad`, `chanks-2-planificador-granular`, `chanks-3-paralelo`,
`chanks-4-puente`, `chanks-5-politica-de-entrega`, `chanks-5-session-doc`, `chanks-0-session-context-loader`;
`skill-orchestrator` for skills that coordinate other agents.

### Working in parallel
Several LISTO Sessions can be implemented at the same time, using the subagents Gentle AI already
knows how to delegate. Chanks does not build anything new for this; it only decides WHICH Sessions
can run together:
1. Read `radar status --json` → `compatibilidad[]`. Only pairs marked `compatible` (no shared files)
   may share a lot.
2. Propose the lot to the human and STOP until they approve the exact Session IDs.
3. Load `chanks-3-paralelo`: each approved Session goes to one Gentle AI subagent in its own git
   worktree; Gentle AI implements and reviews each one; results are integrated one at a time.
A single Session needs none of this: hand it to Gentle AI with `chanks-4-puente`.

### Automatic pilot (when the switch is on)
- Before handing any Session to implementation (stage 4), read `piloto` in `radar status --json`.
  If `piloto.prendido` is true, ask the blocking question «¿con piloto automático o en esta
  conversación?» and stop until the human answers. With the pilot off, nothing here changes.
- When a flight comes back: show the human every delivered commit, ask the blocking approval per
  commit, record it with `piloto aprobar <sesión> --decision <texto>`, and only then run
  `piloto aterrizar`. Never land without those recorded approvals.

### Hard rules
- Propose only LISTO Sessions and let the human choose. Never self-assign work.
- Write only the files a Session declares. Expanding scope needs human approval first.
- Parallel work requires the human's approval of the exact lot; each subagent gets its own worktree.
- Edit plan state only in `openspec/plan.yaml`, then run `radar check` and `radar render`.
- A Session is closed only with its delivered commit recorded through `chanks-5-session-doc`.
<!-- /control-tower:project-workflow -->
