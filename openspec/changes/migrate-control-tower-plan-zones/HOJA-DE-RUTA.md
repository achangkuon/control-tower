# Hoja de ruta — migración del plan al modelo de Zonas

> Estado al **2026-09-09**. Rama `feat/s0.4-plan-zones-migration`, worktree `implementer-1`.
> Este documento es el punto de entrada para retomar en cualquier runtime (Claude, Pi, OpenCode,
> Codex). El registro técnico exhaustivo vive en `apply-progress.md`; acá está sólo lo que hace
> falta para continuar sin releer 5.000 líneas.

## Dónde estamos

| Checkpoint | Estado |
|---|---|
| C01–C05, M0.4.5A, S101, G1 | ✅ cerrados |
| C06 | ✅ cerrado 2026-09-08 |
| C07 | ✅ cerrado 2026-09-09 sobre identidades reproducibles |
| **C08** | ✅ **READY** — reproduce contra el manifest re-cortado a master |
| **C09** | 🔴 **intentado y revertido** — la activación es correcta; falla el readback |
| M0.4.9 | 📋 verificación post-entrega |

Tareas: **39 cerradas, 6 abiertas**. Trabajo autorado restante: **0–220 líneas** (C09) más la
migración de los consumidores, que es trabajo nuevo y sin dueño.

## 🔴 Lo que bloquea hoy — leer esto primero

**C09 se ejecutó, salió byte-perfecto, y se revirtió a propósito.** No fue un error de la
activación: fue el readback haciendo su trabajo.

La activación produjo `final_package_identity = f459dfd451419c2c4cb2a31f128810eaf3b38c54`, igual
al tree de su propio commit, con el plan `b794dd1a…`, el ROADMAP generado `1b183579…`, 31 copias
de archivo, 14 retiros, 33 archivos +14.022/−147 y 602 rutas — todo idéntico a lo que C08 había
proyectado sobre ese mismo HEAD. Radar validó 11 Zonas y 75 Sesiones y el ROADMAP se regeneró
byte a byte.

**Entonces `bun test` cayó de 1212/0 a 1198/1.** Al retirar las vistas legacy, cinco consumidores
quedaron leyendo archivos que ya no existen. `T0.4.8.3` dice parar ante cualquier fallo, así que
no hubo push, y por decisión del maintainer se revirtió la activación (`116ee27`) para migrar
primero a los consumidores y que **ningún commit deje el repositorio roto**.

Trazabilidad: activación `8628319` · hallazgo `a98243a` · reversión `116ee27`.

### El consumidor difícil: el motor de radiografía

`agent-workflows/radiografia/config.mjs` tiene `masterIndex: "openspec/plans/master-index.md"`,
y `measure.mjs` **parsea** de ahí las filas `| P<n> |` (`CT_RADIOGRAFIA_NO_PLAN_TABLE`), la línea
`Avance global` (`CT_RADIOGRAFIA_NO_GLOBAL_PROGRESS`) y la cola de ejecución.

**Verificado: el ROADMAP generado tiene CERO de ambas.** Es por Zona, no por Plan. Entonces:

- Re-apuntarlo al ROADMAP cambia un archivo faltante por un fallo de parseo.
- Apuntarlo al archivo congela la medición de avance para siempre, que es exactamente lo
  contrario de para lo que ese motor existe.

Tres caminos, ninguno de una línea:

1. **Que lea `openspec/plan.yaml` directamente.** El más limpio: consume dato estructurado en vez
   de re-parsear un documento renderizado, y Radar ya es dueño del vocabulario.
2. Reescribir el parser Markdown contra el ROADMAP por Zonas. Lo acopla a un formato que no
   posee.
3. Que Radar emita además las secciones que el motor espera. Mezcla responsabilidades.

`agent-workflows/test/{render,measure,cli}.test.mjs` siguen a la opción elegida.

**Ninguna Sesión posee este motor.** Es trabajo no enumerado, igual que las skills de método.

### Los cuatro consumidores fáciles

| Consumidor | Arreglo |
|---|---|
| `test/contracts/session-plan-snapshot.test.mjs` | lee plan-5 como fixture de bytes; puede leer la copia archivada |
| `ROADMAP.md` (raíz del repo) | referencia documental a `plan-12/STATUS.md` |
| `agent-workflows/MIGRACION-ZONAS.md` | referencia documental a `plan-9/STATUS.md` |
| `agent-workflows/test/*.test.mjs` (3) | siguen a la decisión sobre el motor |

## La causa raíz que hay que entender antes de tocar nada

**Hay dos fuentes de verdad vivas al mismo tiempo.** El corpus legacy —
`openspec/plans/**/STATUS.md` más `master-index.md` — sigue siendo la autoridad vigente y sigue
recibiendo escrituras en `master`. En paralelo, esta rama construye el corpus nuevo,
`openspec/plan.yaml` con su `ROADMAP.md` generado. Los mismos hechos se registran dos veces, en
dos formatos, con dos reglas de cálculo distintas.

Eso no es una molestia: **es lo que bloqueó C08 y lo que puede arruinar C09.** La evidencia:

- Master avanzó 14 commits desde el fork y tocó **5 de las 31 fuentes** que C09 archiva y retira:
  `master-index.md`, `plan-0/STATUS.md`, `plan-5/STATUS.md`, `plan-9/STATUS.md`,
  `decision-register.md`.
- El mismo hecho —el avance global— llegó a tener **dos números distintos y ambos "correctos"**
  según qué regla se aplicara: `56/84` en la rama y `65/93` en master.
- La Sesión `S0.4` se enumeró **dos veces**, una en cada corpus, sin que ninguna supiera de la
  otra.

Mientras C09 no active, **cada registro nuevo en el corpus legacy agranda el delta que C09 tiene
que absorber**. La migración persigue un blanco móvil.

### Regla operativa mientras la migración esté en vuelo

1. **No registrar avance de planificación en el corpus legacy** salvo que sea imprescindible.
2. Si es imprescindible, **anotarlo también** en `migration/candidate/plan.yaml` en la misma
   Jornada, o dejarlo asentado en `apply-progress.md` como delta pendiente.
3. **El archivo ya se re-cortó** al tip de `master` (`fbcb546e`) el 2026-09-09. Si master vuelve
   a avanzar antes de C09, hay que repetir ese re-corte y re-probar C07 y C08.
4. Después de C09 la regla se vuelve permanente y la impone el canon: el único origen editable es
   `openspec/plan.yaml` y `ROADMAP.md` es su vista generada. Se prohíben índices de estado
   paralelos.

## Lo que falta, en orden

### 1. ~~Re-sincronizar el archivo con master~~ ✅ resuelto el 2026-09-09

Decisión tomada: **archivar lo que master tiene hoy**, no la foto del fork. Cuatro entradas del
inventario se re-apuntaron a `fbcb546e` con el mismo patrón que ya usaba `plan-9` (`source_commit`
propio por entrada). C07 y C08 se re-probaron y pasan.

Verificado: el blob de `plan-5` que se archiva **contiene** el registro del arreglo de `jornada`
que master agregó después del fork. Los 14 commits de master sobreviven al archivo.

Identidades nuevas de C07: sujeto `923f1fb8…`, 589 entradas, digest `9a2bfd5b…`. El plan
`b794dd1a…` y el ROADMAP `1b183579…` **no cambiaron**.

### 1-bis. Migrar los consumidores del corpus legacy ⬅️ **el paso que falta**

Decidir primero cómo mide el avance el motor de radiografía (ver arriba: las tres opciones), y
arreglar de paso los cuatro consumidores fáciles. Todo en **su propio commit**, antes de
re-activar. Criterio de cierre: `bun test` vuelve a **1212 · 0** con las rutas canónicas
presentes.

Este trabajo no lo posee ninguna Sesión. Conviene enumerarlo antes de ejecutarlo.

### 2. C09 — activación atómica (`T0.4.8.2`), a repetir

Un solo commit convencional que, junto:

- promueve `openspec/plan.yaml` desde `migration/candidate/plan.yaml` (blob `b794dd1a…`)
- promueve el `ROADMAP.md` **generado por Radar**, nunca editado a mano (blob `1b183579…`)
- crea `openspec/archive/legacy-planning/` con las **31** copias byte a byte
- retira las **14** vistas legacy activas
- aplica los cambios de guía y de cierre documental que nombra el manifest

Inmediatamente antes de commitear: `git diff --cached --name-status`, `--numstat`,
`test -f openspec/plan.yaml && test -f openspec/ROADMAP.md`, y recién ahí
`final_package_identity=$(git write-tree)`, que se vincula en el mensaje del commit. **C09 es el
único que calcula esa identidad.** Ante cualquier discrepancia: parar, no commitear.

Proyección medida por C08: **33 archivos, +14.022 / −147, árbol de activación de 602 rutas**.

**Medir la proyección sobre el HEAD exacto al que C09 va a commitear.** Ya pasó una vez: un
commit intermedio tocó `plan-0/STATUS.md` —una de las 14 vistas retiradas— entre la medición de
C08 y la activación, el numstat dejó de coincidir y C09 se detuvo, que es lo correcto. Si el
HEAD se mueve, re-correr C08 antes de activar.

Los pasos exactos de la activación, ya ejecutados una vez con éxito:

```
cp migration/candidate/plan.yaml openspec/plan.yaml      # verificar blob b794dd1a
radar render -f openspec/plan.yaml -o openspec/ROADMAP.md  # verificar blob 1b183579
# por cada entrada del archive-inventory: git cat-file blob <source_commit>:<source_path> > <destination>
# retirar las 14 con activation_treatment retire-active-view-and-archive-byte-faithfully
git add -A && git diff --cached --numstat HEAD    # debe dar 33 / +14022 / -147
final_package_identity=$(git write-tree)          # solo C09 la calcula
```

### 3. `T0.4.8.3` — readback local antes de cualquier push

```
go run ./agent-workflows/tools/radar check  -f openspec/plan.yaml -C .
go run ./agent-workflows/tools/radar status -f openspec/plan.yaml -C .
go run ./agent-workflows/tools/radar zonas  -f openspec/plan.yaml -C .
go run ./agent-workflows/tools/radar render -f openspec/plan.yaml -o openspec/ROADMAP.verify.md -C .
cmp -s openspec/ROADMAP.md openspec/ROADMAP.verify.md
go test ./agent-workflows/tools/radar
bun test
find openspec/archive/legacy-planning -type f -readable -print | sort
```

Cualquier fallo detiene la entrega.

### 4. M0.4.9 — entrega y verificación

`git push origin HEAD:master` **sólo con autorización explícita de Emilio**, luego verificar
ancestría remota, render determinista, legibilidad del archivo y comportamiento del cierre
documental.

## Cómo reproducir las pruebas

```
migration/proof/rebuild-c07-r14.sh <repo> <proof-root-vacío> <doc-guard> <sha256-del-hook>
migration/proof/reproduce-c08.sh   <repo> <work-root-vacío>
```

Los root son desechables y deben estar **ausentes o vacíos**. Ambos scripts trabajan en un
`GIT_DIR` privado enlazado por alternates al almacén real: verifican que refs y objetos queden
idénticos antes y después, y no tocan el índice ni el árbol de trabajo.

## Trampas conocidas — leer antes de tocar

- **Tests con `bun test`, nunca `node --test`.** Los imports `bun:` hacen fallar a Node con
  `ERR_UNSUPPORTED_ESM_URL_SCHEME`, que parece un error de código y no lo es.
- **Ancestría.** Radar exige que el commit de origen de cada Sesión importada sea ancestro
  estricto del HEAD. Un sujeto sintético sin padre produce 119 rechazos. Todo sujeto privado se
  parentea en el HEAD de entrega.
- **`rebuild-c07-r14.sh` se incluye a sí mismo** en el sujeto que atestigua: cualquier edición del
  script invalida en silencio todos los receipts de C07. Si hay que tocarlo, se re-prueba C07
  entero.
- **Identidades no reproducibles.** El OID del commit del sujeto, el digest de la atestación, los
  inventarios de refs/objects y el `state_sha256` del doc-guard llevan timestamp o ruta efímera.
  **Sólo vinculan** el árbol del sujeto, el digest path/mode/blob y el `recipe_sha256`.
- **`partition.yaml` `validation.expected`** declara 588 archivos contra 602 observados. Radar
  nunca lee ese bloque. No se corrige sin cambiar el sujeto de C07, lo que reinicia toda la
  cascada de identidades. Queda como decisión de C09.
- **El stash está compartido** entre seis worktrees. Nunca `git stash` pelado; usar un commit WIP.
- **Entrega directa a `master`, sin PR** (`AGENTS.md`, `delivery.shape: direct-push`).
- **Lotes de revisión ≤400 líneas.** El diff completo son 18.856; hay que partirlo antes de
  entregar.
- **No tocar** `.git/gentle-ai/candidate-views/` ni los worktrees de otros agentes.

## Nota sobre runtimes — por qué Pi se siente más áspero

No es que Pi lea las configuraciones con más rigor. Son dos hechos concretos:

1. **Pi no tiene `SkillsDir` nativo.** El instalador cubre `~/.agents/skills`, `~/.claude/skills`,
   `~/.config/opencode/skills` y `~/.codex/skills`, pero **Pi no es destino**. Los bytes quedan en
   `~/.agents/skills/<skill>/SKILL.md`, que es la ruta canónica que Pi debe cargar **a mano**. Los
   enlaces que hoy hay en `~/.pi/agent/skills/` son manuales, de julio, y el instalador no los crea
   ni los mantiene. Si una skill no se cargó explícitamente, Pi simplemente no la tiene.
2. **Desfase de contrato.** `gentle-pi 2.2.0` pinea `gentle-ai v2.4.0` y sólo decodifica
   `start/v3`; rechaza por diseño los envelopes de un provider 2.5.0. Hasta que Pi corra
   `gentle-pi 2.3.0`, **no arrancar revisiones RDD desde Pi**. Claude Code, Codex y OpenCode están
   en el contrato 2.5.0.

Para continuar en Pi: cargar a mano las rutas canónicas de las skills que haga falta, y no
esperar que el ciclo de revisión RDD funcione ahí.
