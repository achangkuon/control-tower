# Control Tower — reglas del proyecto (todos los agentes)

> Archivo canónico de la política de entrega. Aplica a **cualquier** agente que
> trabaje en este repo: Claude Code, opencode, PI, Codex o un humano.
> `CLAUDE.md` apunta acá; no dupliques la regla, edítala en este archivo.

## Política de entrega: commit directo, sin PR

Este repo es **personal y todavía no sale a producción**. La entrega es un
**commit directo a `master` + push**. No se abren PRs.

Al entregar:

- Commiteá con conventional commits y pusheá a `master`.
- No cargues `branch-pr` ni `chained-pr`.
- No abras PR ni esperes review de nadie.

Esto anula, y solo para este repo, el paso de entrega de `torre-control-entregas`
que carga `branch-pr`. Sigue vigente todo lo demás: conventional commits,
Strict TDD Mode, SDD, engram y las reglas de delegación.

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

## Preferencias de ejecución y presupuesto de cambio

- **Toda ruta declarada se ejecuta automáticamente** en el happy path, sin pausas entre
  sus pasos internos. `full-sdd` ejecuta su pipeline completo una vez para toda la Sesión.
  `direct` usa el diseño y las Tareas ya aprobados; `design-tasks` hace primero su
  elaboración técnica compacta. Ambas continúan automáticamente por
  diseño/Tareas → apply → tests → checkpoint sin inventar proposal/spec ni inflarse a
  `full-sdd`.
- El presupuesto duro aplica a **todas las rutas**: máximo **400 líneas authored**
  —adiciones más eliminaciones— por unidad de commit directo que sea independientemente
  verificable y revertible. No hay excepciones de tamaño silenciosas.
- Un forecast superior a 400 se implementa como unidades secuenciales de trabajo,
  cada una en su propio commit directo verificable y revertible; este repo no usa PRs
  ni PRs encadenados.
- Si ese desglose impide que una Sesión conserve un alcance coherente, se divide en dos
  o más Sesiones bajo la jerarquía canónica `Plan → Sesión → Módulo → Tarea`. No se
  crea un quinto nivel ni se renombra ninguno de los cuatro.

## Radiografía del producto — se regenera al entregar

El estado del producto se publica como un informe HTML autocontenido pensado para
que el mantenedor —que no programa— entienda dónde está el proyecto sin leer
`openspec/`. Se genera; no se escribe a mano.

**Un solo comando, igual para todos los agentes:**

```sh
bun scripts/radiografia.mjs              # mide y regenera (rápido, ~300 ms)
bun scripts/radiografia.mjs --with-tests # además corre la suite y registra el resultado
bun scripts/radiografia.mjs --check      # sale 1 si quedó desactualizado; no escribe
```

No usa ninguna capacidad de asistente. Claude Code, opencode, PI, Codex, un cron o
una persona lo corren igual.

**Se dispara solo en la entrega.** El hook `.githooks/pre-push` lo corre con la suite
en cada `git push`. El hook **nunca bloquea** un push: un informe no es un gate.
`core.hooksPath` es configuración local y no viaja en el clon — en un worktree o
clon nuevo hay que activarlo una vez:

```sh
git config core.hooksPath .githooks
```

**Qué edita cada quien:**

| Archivo | Quién lo escribe | Qué contiene |
|---|---|---|
| `openspec/plans/radiografia.md` | un agente, a mano | El juicio: qué significa cada número, qué está en riesgo, qué decisión es del mantenedor |
| `radiografia.html` | el generador | El informe. **Gitignoreado**: es artefacto de build, no se commitea ni se edita |
| `.radiografia-cache.json` | el generador | Último resultado de la suite y en qué commit se midió. Gitignoreado |

Las **cifras no se escriben nunca a mano**: avance por Plan, cola, líneas, share
instalado y resultado de la suite salen medidos de `openspec/plans/master-index.md`
y del repositorio. Esa es la razón de existir del generador — dos veces en una
semana la documentación afirmó sobre el código cosas que eran falsas.

Al cambiar el juicio, actualizá `verified_against` en el front matter al commit
contra el que lo verificaste. Si no coincide con `HEAD`, el informe lo avisa solo,
igual que avisa un árbol sucio o una suite registrada en otro commit.

**Publicación.** El informe se publica como Artifact en claude.ai y **sólo Claude Code
puede publicarlo** — es una herramienta suya. Los demás agentes lo generan y lo dejan
en disco; el mantenedor lo abre local con `xdg-open radiografia.html`, y la próxima
sesión de Claude Code lo republica a la misma URL. Que un agente no pueda publicar
no es motivo para saltear la generación.

## Declaración de política — forma legible por máquina

La prosa de este archivo es para humanos. El bloque de abajo expresa en forma
parseable la **política de entrega configurable** que lee la Torre; las reglas de
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
documentation_close:
  module: engram-only
  session: full
```

Qué significa cada campo:

| Campo | Valores | Efecto |
|---|---|---|
| `merge.authorizing_party` | `human`, `automatic` | Quién autoriza el merge. La autorización sigue siendo obligatoria y atada al candidato inmutable; esto solo define quién la emite. |
| `delivery.shape` | `direct-push`, `pull-request` | Forma de la entrega remota. No altera el orden commit → verificar tree → congelar SHA. |
| `delivery.target_branch` | nombre de rama | Destino de la entrega. |
| `planning.horizon_ceiling` | entero ≥ 1 | Cuántas Sesiones se pueden planificar por delante. |
| `documentation_close.module` | `engram-only`, `full` | Profundidad del cierre al terminar un Módulo. |
| `documentation_close.session` | `engram-only`, `full` | Profundidad del cierre al terminar una Sesión. |

**Esto NO puede tocar los floors de seguridad.** Ninguna combinación de valores
habilita mutación remota antes de `DELIVERY_READY`, ni reescribe un candidato
congelado, ni borra del ledger, ni permite que un worker se autoasigne, ni le da
autoridad de dispatch a otro que no sea Main. Un bloque que lo intente se
rechaza nombrando el floor violado.

**Fail-closed.** Un campo ausente, un valor desconocido o un bloque no parseable
**no vale como default permisivo**: resuelve al valor más restrictivo
(`merge.authorizing_party: human`, `horizon_ceiling: 2`,
`documentation_close: full`) y el motivo queda nombrado. Un repo sin este bloque
se comporta como antes de que existiera.

### Por qué

`master` no tiene branch protection ni rulesets, y el repo no tiene `.github/`.
El PR acá no corría **ningún** check automático: era ceremonia, no seguridad.

### Lo que reemplaza al PR

Lo único que el PR sí aportaba era la unidad de revert. A cambio:

- **Un commit = una unidad revertible.** Si una tarea no se puede revertir con un
  solo `git revert`, va en commits separados.
- **El Documentation Close Gate sigue activo.** `.doc-guard.json` declara
  `policy: "solo"`, y por eso `git push` cuenta como entrega. Pushear sin
  actualizar `STATUS.md` + `master-index` bloquea el cierre de sesión igual que
  antes lo hacía un PR.

### Alcance real de la aplicación — leelo antes de asumir

La regla escrita aplica a todos los agentes. **El bloqueo duro no.**

| Agente | Regla escrita | Gate que bloquea |
|---|---|---|
| Claude Code | sí | **sí** — `~/.claude/hooks/doc-guard.sh` vía `settings.json` |
| opencode | sí | no |
| PI | sí | no |
| Otros / humano | sí | no |

El gate es un hook del harness de Claude Code y ningún otro agente lo ejecuta. Si
trabajás desde opencode o PI, **la disciplina de documentar es tuya**: actualizá
`openspec/plans/master-index.md` y el `STATUS.md` del plan en el mismo push, sin
que nadie te frene si no lo hacés.

### Worktrees

`.doc-guard.json` está trackeado a propósito para que cada worktree herede la
política. Una rama que todavía no tenga el archivo resuelve a `strict` — el
default seguro — hasta que rebasee sobre `master`.

### Volver al flujo con PR

Poné `policy: "strict"` en `.doc-guard.json` (o borrá el archivo) y eliminá esta
sección. El default global del hook es `strict`: cualquier repo que no declare
nada exige PR, así que los proyectos delicados no dependen de este archivo.
