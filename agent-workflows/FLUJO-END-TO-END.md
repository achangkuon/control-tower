# Historical Control Tower flow

> **How to read this file (2026-10-01).**
>
> | Part | Status |
> | --- | --- |
> | This header, down to the first horizontal rule | Current. It states what applies today. |
> | Sections 0 onward, below that rule | Frozen historical analysis written on 2026-09-02. Not an instruction for current work. Only file paths were updated after documents moved. |
>
> The current flow per version is defined in
> [`docs/architecture/definiciones-v1-v2-v3.md`](../docs/architecture/definiciones-v1-v2-v3.md):
> V1 has no semaphore, no formal Session start and no dispatch markers; V2 is Pista; V3 is the
> automatic Tower. The companion documents `historico/EJECUCION-EN-PARALELO.md` and `historico/MIGRACION-ZONAS.md`
> are historical and live under [`historico/`](historico/).
>
> **Frozen product documentation.** The original candidate is also preserved byte-for-byte at
> `product/tower/generic/FLUJO-END-TO-END.md`. It explains prior product choreography only;
> it does not direct the current generic builder, which uses a human-directed responsible parent,
> read-only planning evidence, an organic Session start with no admission step, and an
> evidence-returning bridge/closure.
>
> **V1 (maintainer decision, 2026-10-01).** Every mention below of `chanks-3-session-kickoff`,
> of the kickoff as an arrival check, or of Sessions marked in progress is historical. In V1 the
> human chooses a `LISTO` Session and `chanks-4-puente` hands it to Gentle AI; parallel work runs
> inside one conversation under `chanks-3-paralelo`. The formal start and the Radar dispatch
> markers are deferred to V2 (Pista).
> No global installation or consumer has been updated by this source migration.
>
> The following gate and flow claims are historical record only; they create no live gate or
> instruction for current work.
>
> **Nada fue implementado.** Este documento se escribe para implementar después.
> Escrito el 2026-09-02 sobre `agent-workflows@f7bd95e` y `control-tower@ed81454`.

---

## 0. Las tres cajas — qué es cada cosa cuando decimos «Torre de Control»

«Torre de Control» nombra tres cosas distintas y confundirlas es la fuente de la mitad de las
discusiones circulares. Son tres, no dos.

| # | Caja | Dónde vive | Qué es | Si la apagás |
|---|---|---|---|---|
| 1 | **Maquinaria** | `control-tower/Main/` — `hosts/`, `adapters/`, `escalation/`, `delivery/`, `supervision/`, `jornada/`, `registry/`, `contracts/`, `mcp.mjs`, `bin/` | Código que corre como proceso. Reparte asientos, arranca agentes, enruta escalaciones, mueve ramas. 88 módulos, 90 archivos de test. | Deja de existir |
| 2 | **Skills de trabajo** | `agent-workflows/skills/` | El método. Cómo se planifica, se enruta, se ejecuta, se revisa, se entrega y se cierra. Markdown que lee cualquier agente. | Siguen funcionando: MAIN coordina igual, sin persistencia ni acuse |
| 3 | **Skills de la maquinaria** | `control-tower/Main/skills/` — `torre-control`, `torre-control-entregas`, `torre-control-soporte` | La interfaz de la maquinaria. Solo tienen sentido hablándole al proceso. Se instalan con él. | Dejan de tener sujeto |

**Decisión del maintainer (2026-09-02): la caja 3 es parte de la maquinaria.** No se mudan a
`agent-workflows`. Esto resuelve la fricción histórica de «hay dos Supports y se peleaban»
(`chanks-0-agente-soporte` de la caja 2 contra `torre-control-soporte` de la caja 3): no es duplicación
a borrar, son **capas distintas** — el de la caja 2 razona sobre el plano, el de la caja 3
despacha sobre la maquinaria.

**La frontera que define el producto**, sostenida por dos límites declarados por escrito:

- gentle-ai dice que su revisión **no autoriza entrega**.
- `tools/plan` dice que **pronostica** compatibilidad pero **no adquiere** reservas vivas.

Entre esos dos huecos vive la Torre: *el runtime vivo de un plan que ya es dato calculable.*

---

## 1. El flujo, de punta a punta

Siete tramos. Una idea entra por el 1 y sale entregada y cerrada por el 7.

```
  ①  AUTORIDAD        ¿qué vamos a hacer y quién lo autoriza?
        │             brain-dump · feature · descubrimiento · heredado · proyecto nuevo
        ▼             produce: alcance aprobado + Zonas + PRD por Zona
  ②  PLANIFICACIÓN    ¿en qué Sesiones se corta y por dónde entra cada una?
        │             ocho pasos, siempre los ocho, en orden
        ▼             produce: Sesiones con contrato binario, Módulos, Tareas, ruta propuesta
  ③  ENRUTADO         ¿quién la agarra, con qué asiento, y sigue siendo honesta la ruta?
        │             Support arma el brief (jornada) · el kickoff verifica al llegar
        ▼             produce: obrero sentado en su worktree, ruta revalidada
  ④  EJECUCIÓN        se escribe el código
        │             una pipeline SDD, tres puertas de entrada, verify y archive comunes
        ▼             produce: Módulos commiteados, cada uno revertible solo
  ⑤  REVISIÓN         ¿está bien hecho?
        │             la revisión la decide Gentle AI (su RDD, sus lentes)
        ▼             produce: aprobado, o una decisión abierta que bloquea
  ⑥  ENTREGA          ¿cómo sale?
        │             la política es un dato del repo · MAIN mueve la rama
        ▼             produce: commit integrado
  ⑦  CIERRE           ¿qué quedó registrado?
                      se declara la evidencia (el commit), el estado se calcula solo
```

### Los cinco roles de la obra

| Rol | Quién | Qué hace | Qué NO hace |
|---|---|---|---|
| **El jefe** | Emilio | Aprueba el brief antes de que se despache. Decide lo que escala. | No coordina |
| **El ingeniero** | MAIN | Coordina. Despacha. Reparte el medidor. Mueve las ramas. Con Torre **ON y OFF**. | No escribe código de Sesión |
| **El supervisor** | Support (`chanks-0-agente-soporte`) | Único autor del plan. Arma el brief de la jornada mirando el plano. Regenera la vista. | No toca código. No ve el worktree del obrero |
| **El obrero** | El ejecutor en su asiento | Implementa una Sesión de punta a punta | No elige qué hacer cuando hay brief |
| **El medidor** | La reserva de Cimientos | Se pide, se usa, se suelta | — |

**Lo que cambia con la Torre encendida no es quién coordina — es cómo viajan las órdenes.**
Apagada: las skills coordinan con peers vivos que el jefe aprueba, sin persistencia, sin acuse,
sin retry. Encendida: MAIN despacha con binding, persistencia, acuse y retry propios de la Torre.

### El vocabulario del tiempo — tres niveles que no se pisan

| Palabra | Qué es |
|---|---|
| **Jornada** | El día de trabajo. Support arma su brief una vez por Jornada. |
| **Conversación** | Cada vez que te sentás con un agente. Abrís la terminal, hablás, cerrás. |
| **Sesión** | La unidad de trabajo del plan. Cierra con un commit entregado. |

Se descartó «Turno» (suena a algo que te asignan; la Conversación la abrís vos) y «distinguir
por mayúscula» (funciona escrito, falla apenas lo hablás o lo buscás con `rg`).
**Aplica en skills, docs y CLAUDE.md de acá en adelante.**

### Convención de nombres

`chanks-<tramo>-<nombre>`, con `chanks-0-` para las transversales.
La herramienta pasa de `plan` a **`radar`**: `radar check`, `radar status`, `radar zonas`,
`radar render`.

---

## 2. Tramo por tramo — qué produce y qué skills lo sostienen

### ① Autoridad — *«¿qué vamos a hacer y quién lo autoriza?»*

Una madre, `chanks-1-autoridad`, que enruta a cuatro variantes. **Una skill por variante:
no se fusionan skills solo porque participan del mismo flujo.**

| Variante | Skill | Pregunta que responde |
|---|---|---|
| Idea suelta | `chanks-1-brain-dump` | ¿esto qué es? |
| Alcance nuevo sobre producto vivo | `chanks-1-feature` | ¿cómo entra sin romper el PRD? |
| Producto vivo, diagnóstico | `chanks-1-descubrimiento` | ¿qué hay acá y qué está roto? |
| Producto vivo, partición | `chanks-1-heredado` | ¿cómo se divide para trabajar en paralelo? |
| Repo existente sin `plan.yaml` | `chanks-1-adopcion` | ¿cómo se adopta el modelo sin migrar la historia cerrada? |
| Proyecto nuevo | `chanks-1-project-kickoff` (mini-madre) | ¿de cero, en qué orden? |

`chanks-1-project-kickoff` **deja de escribir documentos**: solo ordena y sostiene el gate
humano entre sus cuatro hijas — `chanks-1-terreno` → `chanks-1-prd` → `chanks-1-rfc` →
`chanks-1-requirements`.

**La razón de fondo de partirlo** no es el orden: hoy no se puede actualizar el PRD de un
producto vivo sin correr el arranque entero. Con las hijas separadas, `chanks-1-prd` se invoca
sola — y eso es exactamente lo que `chanks-1-feature` necesita.

`chanks-1-descubrimiento` y `chanks-1-heredado` comparten la técnica de leer el repo citando
`archivo:línea` como **referencia común**, no como skill fusionada.

**Inventario: 11 skills.** 7 nuevas (5 de ellas por extracción de skills que ya existen) y
3 adaptaciones.

**Sale de acá:** el alcance aprobado, las Zonas del producto, el PRD particionado por Zona, y
el campo `autoridad` en cada Sesión, validado por `radar check`.

### ② Planificación — *«¿en qué Sesiones se corta?»*

**No hay skill madre.** Es un flujo que siempre se cumple igual, en orden, sin ruta que elegir:
madre + ocho hijas es más overhead que una skill. Ocho pasos: ubicar territorio → resolver
cruces → cortar la Sesión → escribir el contrato binario → descomponer en Módulos y Tareas →
declarar las decisiones → juzgar la ruta → pronosticar el tamaño.

**Principio del tramo: la profundidad del corte ES la ruta.** Las celdas que no le tocan al
planificador son **prohibidas**, no opcionales. En `full-sdd` los Módulos se dejan vacíos a
propósito, porque los define el diseño.

Dos referencias cargadas bajo demanda, para que el archivo no crezca:
- `references/ubicacion-y-cruces.md` — compartida con `chanks-1-heredado`, que hace el mismo
  trabajo a escala de proyecto entero.
- `references/juicio-de-ruta.md` — **la que más rinde**, porque hoy tres skills duplican esa
  prosa: el planificador la propone, el kickoff la revalida, y `session-plan` la corregía.

**Balance: ninguna skill nueva.** Dos adaptaciones, dos referencias, y `radar check` valida
por ruta — exigiendo y prohibiendo.

### ③ Enrutado — *«¿quién la agarra y sigue siendo honesta la ruta?»*

Dos momentos, dos capas, dos lugares:

| | Support | El kickoff |
|---|---|---|
| Pregunta | ¿esta Sesión se puede hacer hoy? | ¿sigue siendo `direct` cuando abro los archivos? |
| Mira | el plano | el código real |
| Dónde está | afuera del worktree | **adentro** del worktree |

**Frontera del asiento:** MAIN carga `torre-control` y entra por `torre asiento`; esa puerta
posee la topología y delega en Herdr tanto con la Torre encendida como apagada. Ni MAIN ni el
kickoff crean el asiento con un `herdr pane split` escrito a mano. La skill de runtime `herdr`
se carga solo cuando hay que inspeccionar o controlar Herdr explícitamente; no reemplaza
`torre asiento` ni se convierte en una skill nueva del método.

**El kickoff es un chequeo de llegada, no un selector.** Support no puede ver el worktree del
obrero — es un hecho físico, no una decisión de diseño. Cuatro pasos: confirmar el terreno
(HEAD, rama, árbol limpio) → revalidar la ruta abriendo el código del Área (**el único paso con
juicio**) → escribir `ruta.revalidacion` vía Support → pedir el medidor si reserva Cimientos.

**Sale un paso:** «elegir la primera 🟢 LISTO de una Zona» solo aplica trabajando solo, sin
Jornada. Con brief, el kickoff **no elige: recibe.** Ése era el choque real entre los dos.

**La prueba de que ese momento existe es la `S9.9`** de control-tower: el plan decía `direct`,
1 Módulo, 120–220 líneas, Área de 4 archivos. Support habría dicho lo mismo. El agente arrancó,
hizo RED, y **recién ahí** apareció el fixture stale y el `pane split` sin scope de workspace.
Para entonces ya había 153 líneas que se tiraron. Es el último momento barato para decir «esto
no era `direct`».

**El brief nombra cinco cosas: asiento, rama, RUNTIME, alcance y dependencias.** El runtime
entró por enmienda desde el tramo 5: si un asiento no puede iniciar la revisión, no puede
cerrar una Sesión, y por lo tanto no sirve para implementar. Support lo excluye al armar el
brief, en vez de descubrirlo con el obrero ya sentado.

**Madre ≠ orquestador.** Una madre es un maletín: lo abrís, sacás la herramienta, la usás ahí
mismo, mismo turno, mismo proceso. Un orquestador es un handy: llamás por radio a un obrero que
está en otro cuarto, con sus herramientas, trabajando solo. **El kickoff está del otro lado de
la radio, así que no puede ser hija de nadie.**

### ④ Ejecución — *«se escribe el código»*

**El aporte que cambió el modelo: las tres rutas son la MISMA pipeline SDD entrando por puertas
distintas, con `verify` y `archive` COMUNES.**

| Ruta | Entra por |
|---|---|
| `direct` | `apply` |
| `design-tasks` | `design` |
| `full-sdd` | `proposal` |

Eso cerró tres problemas de un saque: la falta de revisión en `direct`, la redundancia con
gentle-ai, y el puente plan↔SDD.

Quedan **dos** skills: `chanks-4-unattended-implementation` y `chanks-4-puente`. (Desde 2026-10-01 `chanks-4-unattended-implementation` está diferida a V3: su fuente se conserva, pero el instalador no la instala y archiva las copias instaladas.)
**Tres se disuelven** — `session-plan`, `coordinador_multi_agente`, `big-files-remediation-loop`.
Es el primer tramo donde el método **se achica**, porque al ser todo SDD, gentle-ai cubre lo que
antes cubría el método propio.

`chanks-4-puente` es un **traductor**, y es una sola skill porque es el mismo diccionario en
los dos sentidos. Arma el delta y se lo manda a Support: **no escribe el plan.** El preflight
de SDD **se precarga y se muestra** para confirmar o cambiar — un default invisible no se
corrige cuando está mal.

**Un Módulo es un commit**, revertible solo, con sus tests adentro. Con TDD estricto cada Tarea
es un paso RED→GREEN→REFACTOR, que coincide con el mínimo de tres Tareas por Módulo del canon.

**El ledger de intentos pasa a ser la cuarta entrada del cálculo de estado.** gentle-ai lleva la
cuenta de cuántas veces un agente intentó un trabajo; a los dos fallos frena hasta que el
maintainer lo diga. Hoy el plano sigue diciendo que esa Sesión está 🟢 LISTO, Support manda un
obrero, y el obrero llega y no puede hacer nada: **asiento desperdiciado.** Con el contador como
cuarta entrada, la Sesión se calcula 🔴 BLOQUEADO sola. Desbloquear tiene dos formas: resetear
el contador, o darse cuenta de que la Sesión estaba mal planteada — ahí no se resetea, se
archiva y nace otra con `reemplaza`.

**`archive` siempre después de entregar.** Orden: `verify` → tramo 5 → entregar → `archive`.

### ⑤ Revisión — *«¿está bien hecho?»*

El tramo más barato de los siete: **cero skills propias**. Es capa 1 pura — la revisión
adversarial de gentle-ai.

**La revisión la decide Gentle AI.** Chanks no fija cuándo se revisa, cuántas lentes se usan ni
qué pasa cuando la revisión está apagada.

**Un escalamiento de la revisión se anota como una decisión abierta que contamina los criterios
de aceptación.** Con eso la Sesión se calcula 🔴 BLOQUEADO sola, con la maquinaria que ya
existe. No es un truco: una revisión que escala **es** una decisión que necesita el criterio del
maintainer — hay que elegir entre corregir de nuevo, aceptar una excepción, o abandonar.

**Principio para otros proyectos:** formatear es lo último antes de congelar, nunca después.
(En control-tower el riesgo no aplica: su único hook de git es `.githooks/pre-push`, que
regenera la radiografía, no formatea nada y nunca bloquea el push.)

### ⑥ Entrega — *«¿cómo sale?»*

**La política de entrega ya es un dato**, y se adapta a la cultura del proyecto. ServiTask tiene
PR antes del merge porque tiene 2+ devs; Control Tower va directo a `master` porque es personal
y no sale a producción.

**Son dos momentos distintos y los dos tienen razón:**

| Momento | Regla |
|---|---|
| **Declarar la política de un repo que ya existe** | **No asumir PR.** Se detecta: protección de rama, workflows, historial de merges. Si no hay evidencia, no se inventa — un repo que entrega por push directo al que le declarás `pull-request` deja la Torre esperando PRs que nunca llegan. |
| **Arrancar un proyecto nuevo** | **Se nace con PR.** No hay nada que detectar. El push directo es una desviación que se elige a propósito y se justifica. |

**Enmienda al tramo 1:** hoy la política **nace tarde** — se declara después de que ya hubo
entregas sin regla, justo cuando la evidencia puede haberse formado por accidente. El bloque
tiene que nacer en `chanks-1-terreno`, junto con el `AGENTS.md`.

**MAIN sigue coordinando la entrega.** El obrero entrega, MAIN mueve la rama. Mismo patrón del
tramo 3: lo que el obrero hace solo, no lo hace cuando hay brief. Hay que adaptar
`torre-control-entregas` (caja 3) para que reparta las entregas entre los obreros.

### ⑦ Cierre — *«¿qué quedó registrado?»*

**Cerrar es declarar una evidencia, no escribir un estado.** El estado sale del dato; lo único
que se escribe es qué commit lo cerró.

**El cierre son dos cosas distintas, y solo una es configurable:**

| | Qué es | Cuesta | ¿Opcional? |
|---|---|---|---|
| **El dato** | `entrega.commit` en el plan | nada — regenera ROADMAP, porcentaje y colas solo | **No.** Sin eso la Sesión no está ✅ COMPLETO |
| **La narrativa** | El resumen que se lee al retomar | un agente escribiendo | **Sí** |

Recomendación: **Módulo** → nada de narrativa (el mensaje del commit ya es documentación, y está
pegada al código). **Sesión** → dato automático + resumen corto, que es el punto de retoma real.
**Zona** → no hay cierre: una Zona nunca se cierra, es territorio permanente. *(Pendiente de
decisión del maintainer.)*

**Hito de Zona: no se emite nada.** Una Zona con todas sus Sesiones cerradas ya se ve en el
avance por Zona (`100% (7/7 S)`). Agregar una línea que diga lo mismo con otras palabras es
duplicar el dato, y el canon lo prohíbe justamente por eso.

**`doc-guard` se libera si cambió `openspec/plan.yaml`** — el dato, no la vista — **y tiene una
salida honesta**: si el push de verdad no cerraba nada (un typo en `AGENTS.md`), se declara
«nada que registrar» y el gate se abre. Sin esa salida, un push legítimo dejaría trabado el
cierre para siempre.

---

## 3. El cruce — los siete tramos contra lo que ya está construido

`historico/MIGRACION-ZONAS.md` tiene siete fases. Las 1(parcial), 2, 2b y 3 están hechas y verificadas.
Esto es qué de los siete tramos ya está cubierto, qué cae en las fases vacías, y qué **choca**.

### 3.1 Ya construido — el tramo lo confirma, no hay trabajo

| Pieza | Dónde | Qué tramo la confirma |
|---|---|---|
| Zona → Sesión → Módulo → Tarea; Zona definida por rutas; Cimientos por umbral | canon §1–§4 | 1, 2 |
| El estado se calcula, no se escribe (3 entradas) | canon §9 | 4, 5 |
| `ruta.propuesta` / `ruta.revalidacion`, la revalidación gana y explica | canon §15 | 2, 3 |
| Un solo dato editable (`openspec/plan.yaml`) y una vista generada (`ROADMAP.md`) | Fase 2b + 3 | 6, 7 |
| Detección de entrega leyendo Git: el commit declarado debe resolver y ser ancestro | `tools/plan` | 7 |
| Partición de control-tower validada: 10 Zonas + Cimientos, 441 archivos, cero huérfanos | `PLANO-CONTROL-TOWER.md` | 1 |
| `chanks-0-agente-soporte` v3.0 y `chanks-5-session-doc` v3.0 escritas para este modelo | Fase 3 | 7 |
| **El Horizonte** — loop planner N+1 / implementer N | control-tower `S5.3` ✅ COMPLETO, `continuation/` | Horizonte |

**El Horizonte no hay que inventarlo, hay que conectarlo.** El producto ya lo implementa; el
método no sabe que existe. Y viene con una regla ya decidida el 2026-08-03: **el sello.**
Se hereda hasta el horizonte declarado *si y solo si* todas las Sesiones dentro de ese horizonte
están **selladas** — cero decisiones `escala` abiertas. Si una tiene una abierta, el horizonte
**colapsa ahí**. Horizonte y sello son garantías distintas: el horizonte acota *hasta dónde*
llega la aprobación, el sello garantiza que *lo que alcanza ya está determinado*.

### 3.2 Los huecos — caen en fases que están vacías

| Hueco | Fase que lo esperaba | Qué dice el tramo |
|---|---|---|
| 7 skills nuevas del tramo 1 (5 por extracción) | **Fase 4** | Reemplaza entera la Fase 4 |
| `brain-dump` no existe y está referenciada 6 veces | **Fase 4** | Es `chanks-1-brain-dump` |
| Runtime de reservas de Cimientos | **Fase 5** | Es **el protocolo del medidor**: se pide, se usa, se suelta; MAIN lo reparte |
| Freeze terminal de `S7.1` sobre commit/tree SHA | **Fase 5** | Tramos 5 y 6 lo sostienen |
| Consumo amplio de plan-data por Support, templates y brief diario | **Fase 5** | El brief de la Jornada del tramo 3, con sus cinco campos |
| Techo de asientos + la Torre propone subirlo | **Fase 6** | Se amplía: los asientos también sirven para **planificar**, no solo implementar |
| `radar status` calcula el hueco de planificación por Zona | — (nuevo) | Conectar el Horizonte |
| MAIN despacha planificación como segundo tipo de trabajo | — (nuevo) | Conectar el Horizonte |
| El esquema de decisión crece a 6 campos (faltan evidencia, opciones, checkpoint) | — (nuevo) | Tramo 1, gap 2 |
| Campo `autoridad` en la Sesión, validado por `radar check` | — (nuevo) | Tramo 1, gap 1 |
| El ledger de intentos como cuarta entrada del estado | — (nuevo) | Tramo 4 |
| `torre-control-entregas` (caja 3) reparte entregas entre obreros | — (nuevo) | Tramo 6 |

### 3.3 Los choques — siete correcciones y una decisión

**Regla de precedencia: la definición de hoy gana sobre el canon de ayer, siempre.**
Cuando un tramo contradice el canon o una skill escrita ayer, eso **no es un choque a
dirimir** — el canon de ayer está describiendo un estado anterior. Es una **corrección
pendiente**: el trabajo de traer el texto viejo al modelo nuevo.

Solo es una **decisión abierta** cuando ningún tramo se pronunció. De las ocho que se
detectaron al cruzar, siete ya estaban decididas por los tramos; la octava (C6) era la única
genuinamente abierta y **quedó resuelta por el maintainer el 2026-09-02**. Ninguna queda
pendiente de criterio: las ocho son trabajo.

| # | Qué | Estado | Autoridad |
|---|---|---|---|
| C1 | `est:` sale del canon | ✅ decidido — corregir | Tramo 2 |
| C2 | Las tres rutas son una pipeline SDD con `verify`/`archive` comunes | ✅ decidido — corregir | Tramo 3, decisión 1 |
| C3 | `session-plan` se disuelve | ✅ decidido — corregir | Tramo 4, decisión 1 |
| C4 | No hay skill madre en planificación | ✅ decidido — corregir | Tramo 2 |
| C5 | `plan` → `radar` | ✅ decidido — corregir | Tramo 1 |
| C6 | `blocked` sale de las rutas: quedan tres | ✅ decidido — corregir | Filtro del maintainer, 2026-09-02 |
| C7 | `doc-guard` se libera con `openspec/plan.yaml` | ✅ decidido — corregir **primero** | Tramo 6 hueco 1 · Tramo 7 decisión 2 |
| C8 | Los asientos también sirven para planificar | ✅ derivable | Se sigue de aprobar El Horizonte |

Lo que sigue detalla cada una: **contra qué choca exactamente**, y **qué alcance tiene la
corrección**. Ninguna necesita criterio del maintainer — todas necesitan trabajo.

---

#### 🔴 C1 — `est:` sigue en el canon, y el tramo 2 lo saca

**Choca con:** `skills/_shared/plan-naming-convention.md:158` — *«Time appears only as an
informational attribute: `est: 4h`»*, más las líneas 25, 26, 278 y 493.

**Decisión del tramo 2:** `est:` sale del canon. Nada lo calcula — el porcentaje tiene
prohibido pesarse por él, la capacidad y la cola no lo usan — y **una estimación que inventa un
agente es peor que ninguna**. El número que sí decide algo es el pronóstico de líneas del paso 8,
que define si la Sesión se parte.

**Alcance de la corrección:** §5 completa, la §11, el checklist §18, el bloque
«Plan Naming Standard» de `~/.claude/CLAUDE.md`, **y el código**: `est` es un campo real del
esquema en `tools/plan/plan.go:56` (`Sesion.Est`) y `:67` (`Modulo.Est`). Sacarlo del canon sin
sacarlo del Go deja el campo aceptándose en silencio.

---

#### 🔴 C2 — las tres rutas están escritas como pipelines distintas, y el tramo 3 dice que son una sola

**Choca con:** `skills-diferidas/v2/chanks-3-session-kickoff/SKILL.md:25` — *«`direct` y `design-tasks` usan un
ejecutor general fresco. `full-sdd` corre el pipeline una sola vez»* — y las líneas 52–55, que
las ejecutan por separado. El canon §15 define las cuatro rutas pero **no dice** que compartan
`verify` y `archive`.

**Decisión del tramo 3:** son la **misma** pipeline SDD entrando por puertas distintas
(`direct`→`apply`, `design-tasks`→`design`, `full-sdd`→`proposal`), con **`verify` y `archive`
comunes y obligatorios para las tres**.

**Por qué importa:** hoy una Sesión `direct` **no pasa por `verify`**. Ése era el agujero de
revisión en la ruta más usada, y es lo que hace que el tramo 5 sea barato: si todas las rutas
terminan en `verify`, la revisión de Gentle AI aplica a todas sin escribir nada nuevo.

**Alcance de la corrección:** canon §15, `chanks-3-session-kickoff` (pasos 5 y siguientes), y la
construcción de `chanks-4-puente`, que es quien traduce ruta → fase de entrada.

---

#### 🔴 C3 — `session-plan` existe en v2.1 y la Fase 5 planea adaptarla; el tramo 4 la disuelve

**Choca con:** `skills/session-plan/SKILL.md` (v2.1, viva y cableada en
`chanks-3-session-kickoff:54`) y con la tarea pendiente de Fase 5 en `historico/MIGRACION-ZONAS.md`:
*«`session-plan` — consume el dato en vez de leer markdown»*.

**Decisión del tramo 4:** `session-plan` **se disuelve**, junto con
`coordinador_multi_agente` y `big-files-remediation-loop`. Duplican y no dejan hueco.

**Por qué importa:** es trabajo planificado que hay que **borrar del plan**, no reprogramar.
Y `chanks-3-session-kickoff:54` la invoca — si se disuelve sin tocar el kickoff, la ruta `design-tasks`
queda apuntando al vacío.

---

#### 🟠 C4 — la Fase 4 pide «crear la skill madre de planificación»; el tramo 2 decide que no hay madre

**Choca con:** `historico/MIGRACION-ZONAS.md`, Fase 4: *«Crear la skill madre de planificación — la vía
única variable»*.

**Decisión del tramo 2:** **no hay madre en el tramo 2.** Los ocho pasos corren siempre y en
orden: no hay ruta que elegir ni nada que saltear, y madre + 8 hijas es más overhead que una
skill. Lo que sí sale son **dos referencias** cargadas bajo demanda.

**Ojo:** la madre que sí existe es la del **tramo 1** (`chanks-1-autoridad`), que enruta cuatro
variantes de verdad distintas. La Fase 4 mezcló las dos.

---

#### 🟠 C5 — la herramienta se llama `plan` en código, docs y datos; el tramo 1 la renombra a `radar`

**Choca con:** `tools/plan/` (Go, binario único, cross-compilado), `plan check -f
borrador-control-tower.yaml` citado en `PLANO-CONTROL-TOWER.md`, y la decisión 19 de ayer.

**Decisión del tramo 1:** pasa a `radar`. Subcomandos iguales. Se descartaron *plano*, *carta*,
*sector* y *despacho* (este último colisiona con el `dispatch` de la Torre).

**Costo real:** es un rename sobre código Go **ya verificado** (`gofmt`, `go vet`, `go test`
limpios) más sus docs y el YAML de borrador. Barato si se hace ahora, caro después de migrar
un producto real.

---

#### 🟠 C6 — `blocked` sale del conjunto de rutas: quedan tres

**Fue la única decisión genuinamente abierta del cruce — ningún tramo la planteó.
Resuelta por el maintainer el 2026-09-02.**

**Chocaba con:** canon §15 y `tools/plan/plan.go:125`, que declaran
`RutasValidas = {direct, design-tasks, full-sdd, blocked}` — o sea `blocked` es un valor que
**se escribe** en el YAML. Y `tools/plan/state.go:13,52,66,82`, que **calcula** 🔴 BLOQUEADO
por su cuenta desde las dependencias y las decisiones que contaminan.

**Lo que sumaron los tramos 4 y 5:** dos entradas más al cálculo — el ledger de intentos
agotado, y el escalamiento de revisión anotado como decisión abierta que contamina los
criterios. Las dos producen 🔴 BLOQUEADO **sin que nadie lo escriba**.

**El problema real:** dos fuentes de verdad para el mismo hecho, y pueden contradecirse. Una
Sesión puede declarar `ruta: blocked` mientras el cálculo dice 🟢 LISTO. Support arma el brief
con el cálculo y manda un obrero a una Sesión que el plan declaraba trabada — o al revés, deja
parada una que sí se podía hacer. **Es un asiento perdido cada vez**, y es exactamente la
fricción que el modelo de Zonas vino a matar.

**LA DECISIÓN: `blocked` deja de ser una ruta. Quedan tres, y son las tres puertas de entrada
a la pipeline SDD** — `direct`→`apply`, `design-tasks`→`design`, `full-sdd`→`proposal`.
`blocked` no es una puerta: es la ausencia de puerta. 🔴 BLOQUEADO queda **solo** como estado
calculado, con sus cuatro entradas.

**Alcance de la corrección:** `tools/plan/plan.go:125` (sacar el valor de `RutasValidas`),
canon §15 (la tabla de rutas y el conjunto cerrado), `chanks-3-session-kickoff:24` (que hoy dice
«Conservá `direct`, `design-tasks`, `full-sdd`, `blocked`»), y `radar check`, que debe
**rechazar** `ruta: blocked` en vez de aceptarlo. Encaja con C2, que ya reescribe las mismas
piezas: **se hacen juntas.**

---

#### 🟡 C7 — `doc-guard.sh` pide `STATUS.md`, que el modelo nuevo borra

**Choca con:** `~/.claude/hooks/doc-guard.sh`, más el `AGENTS.md` de control-tower, cuyo párrafo
de documentación de sesión nombra `STATUS.md` y `master-index`.

**Decisión del tramo 7:** el gate se libera si cambió `openspec/plan.yaml`, con salida honesta.

**No es un choque de diseño — es una bomba de tiempo.** El modelo nuevo elimina `STATUS.md`.
El gate lo exige. **Si se migra sin corregirlo primero, no se podría cerrar una Conversación
nunca más.** Es el ítem más urgente de todo este documento.

Las cinco piezas que nombran `STATUS.md` o `master-index` y hay que corregir, en orden:
`doc-guard.sh` → `AGENTS.md` → `project-kickoff` (deja de crear `master-index.md`) →
`chanks-5-politica-de-entrega` (cambia su orden de detección) → `chanks-1-cierre-de-decisiones` (pasa a mandar
delta a Support).

---

#### 🟡 C8 — la capacidad cuenta asientos que implementan; el Horizonte agrega asientos que planifican

**Choca con:** canon §13 y decisión 18 de ayer — *«asientos = Zonas con trabajo listo, con
techo humano»*.

**Lo que agrega el Horizonte:** MAIN despacha **dos tipos de trabajo**, implementar y
planificar. Una Zona sin trabajo listo pero con hueco de planificación **también merece un
asiento**. La cuenta de hoy la deja en cero.

---

### 3.4 Resumen del cruce

| | Cantidad |
|---|---|
| Piezas ya construidas que los tramos confirman | 8 |
| Huecos que caen en fases vacías (4, 5, 6) | 12 |
| Correcciones pendientes (todas decididas) | 8 |
| **Decisiones pendientes de criterio** | **0** |
| Skills nuevas a crear | 7 (5 por extracción) |
| Skills a adaptar | 6 |
| Skills que se disuelven | 3 |

**Balance neto del método: +4 skills.** Y ese número es engañosamente chico, porque el tramo 4
lo **achica**: al aceptar que las tres rutas son una sola pipeline SDD, gentle-ai pasó a cubrir
lo que antes cubría el método propio.

---

## 4. El orden de implementación

Está gobernado por dependencias reales, no por el número de tramo.

> **El reparto concreto entre agentes vive en
> [EJECUCION-EN-PARALELO.md](historico/EJECUCION-EN-PARALELO.md)**: las tres fases que fijó el maintainer,
> la puerta serial, los tres carriles con su partición exacta de rutas, los Cimientos de esta
> obra y el protocolo con la Torre apagada.

### Paso 0 — Antes de tocar nada *(no negociable)*

1. **Corregir `doc-guard.sh`** para que reconozca `openspec/plan.yaml` con salida honesta. → C7
2. **Corregir el `AGENTS.md`** de control-tower: el párrafo de cierre de Conversación deja de
   nombrar `STATUS.md` y `master-index`.

> Sin esto, migrar cualquier producto deja el cierre trabado de forma permanente.

### Paso 1 — Cerrar los choques del canon *(una sola pasada)*

3. Aplicar las **ocho correcciones** (C1–C8): ninguna necesita criterio, todas están
   decididas. **C1, C2 y C3 son bloqueantes** del resto, porque tocan el canon y las skills
   que ya se escribieron. **C2 y C6 se hacen juntas**: reescriben las mismas piezas —
   canon §15, `chanks-3-session-kickoff` y el conjunto de rutas de la herramienta.
4. Aplicar el resultado sobre `plan-naming-convention.md` y sobre los bloques
   «Plan Naming Standard» y «Chanks and Gentle AI boundary» de `~/.claude/CLAUDE.md` —
   la Fase 1 pendiente, ahora reconciliada.
5. Propagar a los cuatro agentes y **verificar que los bloques manuales sobrevivan**
   (Codex pierde los suyos siempre: snapshot antes, `check` después).

### Paso 2 — El rename

6. `plan` → `radar`, con sus docs y el YAML de borrador. → C5
   Ahora, mientras el único consumidor es el borrador de control-tower.

### Paso 3 — El esquema

7. Campo `autoridad` **a nivel Sesión** + validación en `radar check`. Ojo: ya existen
   `RutaSesion.Autoridad` (`plan.go:83`, validado en `check.go:218`) y `Decision.Autoridad`
   (`plan.go:108`, validado en `check.go:245`). Lo que falta es la autoridad **del alcance**.
8. El esquema de decisión crece. Hoy `Decision` ya tiene siete campos (`tipo`, `pregunta`,
   `criterio`, `autoridad`, `clase`, `alcanza`, `contamina`); faltan **`evidencia`**,
   **`opciones`** y **`checkpoint`**.
9. El ledger de intentos entra como **cuarta entrada** del cálculo de estado.

### Paso 4 — Las skills, por tramo

10. **Tramo 1** — 7 skills nuevas, 5 por extracción. Es el bloque más grande y reemplaza
    entera la Fase 4. Incluye que el bloque de política de entrega nazca en `chanks-1-terreno`.
11. **Tramo 2** — dos adaptaciones + las dos referencias compartidas.
12. **Tramo 3** — achicar `chanks-3-session-kickoff` a cuatro pasos; el brief suma el runtime del asiento.
13. **Tramo 4** — nace `chanks-4-puente`; se disuelven las tres.
14. **Tramos 5, 6, 7** — casi nada de código: una regla de configuración (la revisión queda en Gentle AI), la
    adaptación de `torre-control-entregas`, y `chanks-5-session-doc`/`chanks-0-agente-soporte` que ya están.

### Paso 5 — Conectar la maquinaria

15. **El medidor**: MAIN/Torre registra owner, adquiere y libera cada archivo exacto, evita
    arranques stale simultáneos y recupera claims interrumpidos. `radar` **no** es este lock
    controller: pronostica, no adquiere.
16. **El Horizonte**: `radar status` calcula el hueco de planificación por Zona (tiene los
    datos, falta el cálculo); MAIN despacha planificación como segundo tipo de trabajo. → C8
17. **Freeze terminal**: MAIN/Torre congela `S7.1` sobre un commit/tree SHA e invalida toda
    evidencia anterior si una Sesión correctiva produce otro candidato.

### Paso 6 — Aplicar

18. Migrar **control-tower** (banco de pruebas): reasignar sus 24 Sesiones abiertas a sus Zonas.
19. Migrar **ServiTask**, y revisar sus skills locales por si leen el canon viejo.

---

## 5. Lo que no se toca

- Los siete estados. El conjunto cerrado sigue igual; lo que cambió es que **se calculan**.
- gentle-ai. Es la capa base y no se modifica: el método se integra **encima**, aportando el
  dato que gentle-ai nunca tuvo.
- SDD completo y su escalera de rutas. Lo que cambia es **por dónde se entra**, no la pipeline.
- PRD, RFC y REQUIREMENTS: responden preguntas distintas y no se duplican.
- Las ocho clases que siempre escalan, y la regla de que escalar no es bloquear.
- Los criterios de aceptación binarios, escritos antes del trabajo.
- `decision-register.md` de control-tower: son decisiones, no estado. Se escriben, no se calculan.

---

## 6. Dos lecciones de verificación, para no repetirlas

Las dos salieron de errores cometidos y corregidos el 2026-09-02, y las dos tienen la misma
raíz: **acotar la búsqueda produce una conclusión falsa con forma de certeza.**

1. **No inferir el contenido de un archivo por su nombre ni por aparecer en una lista.** Se
   advirtió sobre hooks que formatean y rompen bytes congelados; control-tower no tiene ninguno.
   Su único hook de git es `pre-push` y regenera la radiografía.
2. **Antes de decir «nadie lo lee», buscar en todas las capas** — skills, producto y planes. Se
   afirmó que nadie leía `planning.horizon_ceiling`; ninguna skill lo lee, **pero el producto
   sí**, y está cableado a `S5.3`.
