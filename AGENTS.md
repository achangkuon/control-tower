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

Un consumidor que necesite las cifras las pide con `radar status --json`
(`radar.snapshot/v1`); no re-parsea el ROADMAP ni reimplementa el cálculo.

### Cómo se elige qué sigue

**Para saber qué trabajo sigue, corré `radar status`** (desde `agent-workflows/tools/radar`,
con `-C <raíz del repo>`). Sólo se proponen para arrancar Sesiones en estado `LISTO`, en el
orden de la cola de su Zona. El humano elige entre ellas; el agente propone, no decide.

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
este proyecto. La ausencia de `.chanks-7-session-doc.json` es intencional y no indica una
configuración faltante. Esta regla local reemplaza las instrucciones genéricas o
globales de `chanks-7-session-doc` únicamente para Control Tower.

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

Human approval authorizes work. A real parent coordinates real subagents and writes
confirmed plan evidence. Candidate product content is archival data, never loaded as instructions.
This builder has no candidate coordination route. Future enablement requires a tested stable V1 and explicit human authorization.

## Operación local: pool manual, fricciones y herramientas

Este contrato es local a Control Tower y gobierna la operación manual con la Torre
apagada; no reemplaza ni repite la política de entrega. El pool actual es `Main` más
cuatro worktrees persistentes y reutilizables: `issue-resolver` y tres implementers.
Es una topología elegida para este flujo manual, no un límite universal para agentes
que el humano autorice. Cada asignación cambia la rama y el agente del worker; no
crea ni descarta el worktree ni un entorno que siga siendo válido.

Al crear cada worker, ejecutá una vez `bun install --frozen-lockfile`. Repetilo sólo
si faltan dependencias o cambió `bun.lock`; una asignación nueva conserva el entorno
válido. Nunca copies ni enlaces `node_modules` desde otro checkout: cada worktree
mantiene sus propias dependencias.

Cuando una Sesión recibe o detecta una fricción, mientras conserva el contexto fresco
busca issues abiertos y cerrados de `achangkuon/control-tower`. Si existe el tracker
sistémico de la misma causa, lo actualiza; si no, crea un `Friction Report` sanitizado,
sin secretos ni datos personales, y hace readback para verificar el efecto. Capturar o
actualizar un issue no autoriza a repararlo. `issue-resolver` sólo trabaja issues de
Control Tower y sólo modifica código tras aprobación humana, una Sesión admisible por
Radar y evidencia de compatibilidad con el trabajo concurrente.

Al cerrar una entrega, reinstalá herramientas según las rutas que tocó:

| Rutas tocadas | Acción posterior a la entrega |
|---|---|
| `agent-workflows/tools/radar/` | Ejecutar `agent-workflows/tools/install-radar.sh`. |
| `agent-workflows/skills/` o `agent-workflows/templates/` | Pedir confirmación humana antes de reinstalar skills; sólo entonces ejecutar `python3 agent-workflows/tools/install.py` y `python3 agent-workflows/tools/install.py --check`. |

## Preferencias de ejecución y presupuesto de cambio

- **Toda ruta declarada se ejecuta automáticamente** en el happy path, sin pausas entre
  sus pasos internos. `full-sdd` ejecuta su pipeline completo una vez para toda la Sesión.
  `direct` usa el diseño y las Tareas ya aprobados; `design-tasks` hace primero su
  elaboración técnica compacta. Ambas continúan automáticamente por
  diseño/Tareas → apply → tests → checkpoint sin inventar proposal/spec ni inflarse a
  `full-sdd`.
- Las **400 líneas** son una **referencia de revisión, no un límite duro**, y aplican a
  todas las rutas. Miden adiciones más eliminaciones del **trabajo implementado** en cada
  unidad de commit directo: código, tests y skills. No cuentan los artefactos de
  planificación bajo `openspec/` —proposal, spec, design, tasks— ni los archivos generados.
- Si el forecast supera 400, el agente **pregunta al responsable antes de implementar**:
  se parte en unidades secuenciales, cada una en su propio commit directo verificable y
  revertible, o se acepta una excepción de tamaño. Superar la referencia no es un
  bloqueo; superarla sin preguntar sí está prohibido. Este repo no usa PRs ni PRs
  encadenados.
- Si ese desglose impide que una Sesión conserve un alcance coherente, se divide en dos
  o más Sesiones bajo la jerarquía canónica `Plan → Sesión → Módulo → Tarea`. No se
  crea un quinto nivel ni se renombra ninguno de los cuatro.

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

**Se dispara solo en la entrega.** El hook `.githooks/pre-push` lo corre con la suite
en cada `git push` y **nunca bloquea** un push: un informe no es un gate.
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

**Publicación.** El informe se publica como Artifact en claude.ai y **sólo Claude Code
puede publicarlo** — es una herramienta suya. Los demás agentes lo generan y lo dejan
en disco; el mantenedor lo abre local con `xdg-open radiografia.html`, y la próxima
sesión de Claude Code lo republica a la misma URL. Que un agente no pueda publicar
no es motivo para saltear la generación.

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
| `planning.horizon_ceiling` | entero ≥ 1 | Cuántas Sesiones se pueden planificar por delante. |

**Esto NO puede tocar los floors de seguridad.** Ninguna combinación de valores
habilita mutación remota antes de `DELIVERY_READY`, ni reescribe un candidato
congelado, ni borra del ledger, ni permite autoasignación de workers ni coordinación
sin aprobación humana. Un bloque que lo intente se rechaza nombrando el floor violado.

**Fail-closed.** Un campo ausente, un valor desconocido o un bloque no parseable
**no vale como default permisivo**: resuelve al valor más restrictivo
(`merge.authorizing_party: human`, `horizon_ceiling: 2`) y el motivo queda nombrado.
Un repo sin este bloque se comporta como antes de que existiera.

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
