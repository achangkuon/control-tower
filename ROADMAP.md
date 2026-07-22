# Torre de Control — pendientes de diseño

Dos hilos abiertos, discutidos el 2026-07-21 y sin empezar. Ninguno requiere
decisión urgente; los dos se retoman en sesiones propias, con contexto fresco.

> Este directorio **no está versionado**. Existe un respaldo de este contenido en
> engram (proyecto `finanzas-personales`, scope personal), bajo los topic keys
> `architecture/orchestrator-contract-transports` y
> `architecture/plan-auto-advance`.

## Cómo recuperar el contexto

Las memorias de esto están **repartidas en tres proyectos de engram**, porque se
guardaron desde worktrees distintos y engram deriva el proyecto del cwd vía
`git_remote`. Una sesión abierta en `~/.claude/skills/` o en
`~/.config/opencode/` no está en un repo git, así que **un `mem_search` por
defecto no las encuentra**.

Buscar siempre con `all_projects: true`, o nombrando el proyecto:

| Proyecto | Qué hay | IDs clave |
|---|---|---|
| `hermes` | Diseño previo del overlay Hermes ↔ Torre (2026-07-20) | #5830, #5831 |
| `finanzas-personales` | Sesión del 2026-07-21: wake guard, `tower_transfer`, y los dos hilos de este ROADMAP | #5838, #5845, #5871, #5881 |
| `servi-task-u` | Decisiones registradas por la flota | #5400, #5847 |

**#5830 es la más relevante para el hilo 1**: concluye que la arquitectura
híbrida es *"principalmente un overlay de política sobre la Torre existente"* —
producto y ayuda humana quedan worker↔usuario, y Main recibe solo coordinación,
READY y entrega. Coincide con la hipótesis de "transporte, no skill aparte" a la
que se llegó por separado el 2026-07-21.

Este archivo es el ancla: se lee por ruta absoluta y no depende de que engram
detecte nada.

---

## 1. Consolidar el cron de Hermes con el contrato de la torre

**Estado: RESUELTO el 2026-07-21.** Lo que sigue abajo es el planteo original,
conservado como registro. El resultado está en "Cómo se resolvió", al final de
esta sección.

### El problema

Las instrucciones del agente orquestador están duplicadas entre la skill global
`torre-control-entregas` y la skill del cron de Hermes.

**Restricción dura**: el resultado tiene que funcionar en los dos escenarios.

| Escenario | Quién |
|---|---|
| Con agente en VPS | El usuario |
| Sin agente en VPS | Su socio |

Objetivo textual: que **se complementen, no que compitan**.

### La hipótesis de trabajo

La torre ya resolvió esta misma forma. `references/tower-transport.md` dice:

> Fall back to `manual-handoff-protocol.md` whenever the MCP is absent or errors.
>
> What a handoff *says* does not change — the assets remain the source of that.
> This only replaces the human relay.

Un solo cuerpo de instrucciones, transportes intercambiables, degradación
limpia.

**Dirección propuesta**: que el cron de Hermes sea un **tercer transporte** sobre
el mismo contrato, no una skill aparte. VPS presente → se activa el transporte
del cron. VPS ausente → cae al transporte MCP o al manual, que ya existen. Nadie
mantiene dos copias de la misma verdad.

**Causa raíz probable, a verificar**: Hermes se escribió como skill completa
(contrato + mecánica) en vez de como transporte (solo mecánica). La remediación
sería extraer el contrato común y dejarle a cada lado únicamente su mecánica de
entrega.

Esto es hipótesis, no diagnóstico.

### Qué leer al retomar

La capa relevante es la de **instrucciones**, no la de transporte:

- `SKILL.md`
- `references/state-machine.md`
- `references/queue-priorities.md`
- `references/receipt-recovery.md`
- `references/compact-briefs.md`
- `references/manual-handoff-protocol.md`
- `references/tower-transport.md`
- Los bloques de handoff en `assets/*.md`

**No** hace falta releer `core.mjs`, `mcp.mjs` ni `plugin/tower-spike.js`: esa es
la capa de transporte y no es donde está el problema.

### Cómo se resolvió (2026-07-21)

**La hipótesis era medio correcta.** El diagnóstico "Hermes se escribió como skill
completa en vez de como transporte" se confirmó, pero el corte no era
contrato/transporte. Hermes **no transporta** — el usuario sigue copiando y pegando.
Hermes *planifica*. El corte real es contrato / **planificación** / mecánica del cron.

Y ahí estaba la asimetría verdadera: la capa de planificación vivía únicamente en
Hermes, así que el socio sin VPS no tenía nada que le armara el reparto. No era un
problema de transporte.

**Lo que se hizo**, todo local, sin tocar Hermes:

- Nueva skill `~/.claude/skills/agente-soporte/` — el "agente fantasma". Vive en un
  worktree `support-agent` sobre rama propia `support/agent`, **no se registra** en la
  Torre, y se queda con el flujo inicial: unidades ejecutables, grafo de conflictos,
  conteos, aprobación y los dos assets de assignment.
- `torre-control-entregas` quedó neta coordinación: se le sacaron los pasos 1 y 2 de
  Execution Steps; arranca leyendo `tower_status`.
- La dependencia es unidireccional: el ghost consume `state-machine.md` y
  `compact-briefs.md` de la Torre por ruta absoluta. No hizo falta ningún `_shared/`.

**Hallazgo colateral, más grave que la duplicación**: había *tres* máquinas de estados,
y las dos documentadas estaban mal contra `core.mjs:24-35`. La Torre documentaba
`ACTIVE`, `CANDIDATE_READY`, `REVIEWING`, `SESSION_CLOSE_PENDING`, `DB_VERIFY_PENDING`;
Hermes documentaba otras seis. `core.mjs:144` las rechaza todas. Era un bug vivo en el
camino principal. `state-machine.md` se reescribió derivado del enum real.

**Verificado sobre el motor** (lo que habilita al fantasma): `tower_status` funciona sin
registrarse (`core.mjs:301`, sin chequeo) y `tower_send` también, porque `send()` valida
solo al destinatario (`core.mjs:167`). No puede aparecer en el tablero, ni usar
`tower_set_state`, ni recibir mensajes. Los locks eran el único agujero — se cerró
agregando el chequeo de registro a `acquire()`, espejando el de `core.mjs:156`.

**Para Hermes** se abrió PR de recomendación, sin editar sus skills:
https://github.com/achangkuon/hermes-agent/pull/1

---

## 2. Avance automático al siguiente módulo del plan

**Estado**: diseño acordado, sin implementar.

### El objetivo

Hoy, cuando un agente termina el módulo que tenía asignado, el humano redacta y
manda el brief del siguiente. Se busca que ese salto ocurra solo, con gates
humanos donde el usuario los quiera.

### El principio que no se negocia

**La torre sigue siendo tonta y confiable.** Sin tabla de planes, sin despacho
automático, sin criterio adentro del store. Su README es la regla:

> No crea, borra ni mueve worktrees. No lanza sesiones. La torre coordina, no
> ejecuta.

Todo el valor de la torre es ser mecanismo puro. El criterio de "qué módulo
sigue" cambia por proyecto, por plan y por semana; meterlo adentro arruina la
única pieza en la que se puede confiar ciegamente.

### El diseño acordado

Los planes viven en la carpeta `openspec/` de cada repo — todos los repos ya
están ordenados así.

El **agente** es el autodidacta: va y lee cuál es la siguiente parte. La torre
solo detecta el merge y le avisa.

```
agente termina 2.2 → merge verificado
  → Torre: "andá a ver qué sigue"
  → el agente lee openspec y REDACTA el brief del 2.3
  → Main lo valida contra el plan
  → el brief queda en la casilla del agente
  → SESIÓN NUEVA: register → rebase → trabajar → READY → esperar turno
```

### Por qué la sesión nueva es lo que lo hace funcionar

Quien redacta el brief **no** es quien lo ejecuta.

- El agente saliente es el mejor autor posible: acaba de vivir el módulo
  anterior y conoce el delta entre lo que el plan decía y lo que pasó de verdad.
  Eso resuelve el problema del plan que envejece, que ni el humano ni Main
  pueden cubrir con la misma fidelidad.
- La sesión entrante arranca con **contexto fresco**, sin arrastrar horas de
  depuración del módulo anterior. Es la palanca de calidad más grande
  disponible.

### Lo que ya existe y no hay que inventar

**La casilla es el almacén del handoff entre sesiones.** El agente saliente hace
`tower_send` a sí mismo; el mensaje queda en `tower.db`, en disco. La sesión
nueva arranca en el mismo worktree, o sea la misma identidad (`basename(worktree)`,
`core.mjs:81`, verificado que sobrevive reinicios), y hereda su propia casilla.

Cero mecanismo nuevo. `tower_register` es idempotente (`ON CONFLICT(name) DO
UPDATE`), así que registrarse de nuevo es seguro.

### El hueco abierto: quién enciende la sesión nueva

La torre no lanza sesiones, por decisión explícita. El plugin solo despierta una
sesión **que ya existe y está estacionada**; no puede crear una. Además el
sondeo arranca recién cuando la sesión completa su primer turno, así que la
sesión nueva necesita un empujón inicial aunque el mensaje ya la esté esperando.

`herdr` está instalado (`/home/linuxbrew/.linuxbrew/bin/herdr`, config en
`~/.config/herdr`) y es el lanzador de sesiones.

**Decisión pendiente**: lanzamiento manual como gate humano, o explorar si herdr
puede lanzar sesiones por comando.

**Recomendación**: arrancar **manual**. Es una tecla, con el brief ya escrito y
validado esperando; no hay nada que pensar, solo decidir si sigue. Es el punto de
control más barato posible y nada avanza sin supervisión. Si a las veinte veces
resulta puro trámite, automatizar con datos y no con entusiasmo.

### Los riesgos, en orden

1. **Auto-asignación con expansión de alcance.** El agente se escribe su propia
   próxima tarea; sin gate se convierte en *"ya que estoy, refactorizo esto
   otro"*. Mitigación acordada: **el saliente propone, Main valida contra
   openspec, recién ahí el brief entra a la casilla.** Main no redacta, compara y
   aprueba o corta.
2. **Base drift.** Cada módulo arranca sobre un `main` que se movió. Ya mordió
   una vez (`18f6d47` → `81ec6da`, 2026-07-21). El paso de avance **debe**
   incluir rebase y review nuevo; no es adorno.
3. **Fuga sin testigo.** Un agente que avanza seis módulos solo deja seis PRs sin
   leer. El guard de despertares no cubre esto: cuenta mensajes, no trabajo. Hace
   falta un presupuesto aparte, de N módulos por corrida sin supervisión.
4. **La velocidad no escala como parece.** La cola serializa **entregas**, no
   trabajo. Tres agentes avanzando en paralelo llegan los tres a READY y hacen
   fila por el mismo token. Es por diseño y está bien, pero no hay que esperar
   3x.

### Primer paso sugerido, sin código

No automatizar todavía la decisión de Main. Cambiar solo el reporte: cuando un
agente llega a MERGED, que reporte *"módulo 2.2 cerrado, el siguiente es 2.3"*.
Main lee el plan, confirma que sigue vigente, y emite el handoff — o para y
pregunta.

Eso da el dato que decide todo lo demás: cuántas veces el plan seguía vigente. Si
a los diez módulos aguantó nueve, automatizar es seguro. Si aguantó cuatro, se
evitó un desastre.
