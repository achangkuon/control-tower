# Torre de Control — pendientes de diseño

Un hilo abierto, con diseño acordado y sin implementar. No requiere decisión
urgente: se retoma en una Sesión propia, con contexto fresco.

> **Este archivo está versionado.** Una versión anterior de este encabezado
> afirmaba lo contrario, y era falso: git lo trackea. No hace falta ningún
> respaldo externo para recuperar su contenido.

## El alcance vigente del producto

**La Torre corre en la máquina donde se trabaja, y en ninguna otra.** No hay
servidor remoto, ni bot de mensajería, ni agente alojado fuera: ese alcance se
retiró el 2026-08-30 por decisión del maintainer, y lo que lo reemplazó vive
fuera de este repositorio. La autoridad es la decisión 3 de
[P12](openspec/archive/legacy-planning/plan-12/STATUS.md), archivada byte a byte
al migrar el plan al modelo de Zonas.

Esto se escribe acá porque **este archivo es el ancla que se lee por ruta
absoluta** cuando alguien retoma el proyecto sin contexto. Cualquier plan, spec
o brief que suponga un componente remoto está describiendo un producto que ya no
existe: se corrige, no se implementa.

### Lo que se retiró, para que nadie lo busque

Este documento tenía un primer hilo —consolidar el cron del agente remoto con el
contrato de la Torre— que se resolvió el 2026-07-21 y cuyo sujeto ya no forma
parte del producto. Se retiró entero.

Sobrevive una sola cosa de aquel trabajo, porque sigue siendo verdad y porque
costó encontrarla: **había tres máquinas de estados en circulación y las dos
documentadas contradecían el enum real de `core.mjs`.** Era un defecto vivo en
el camino principal, no una inconsistencia de prosa. `references/state-machine.md`
se reescribió derivándolo del enum, y esa corrección sigue en pie.

---

## Avance automático a la siguiente Sesión del Plan

**Estado**: diseño acordado, sin implementar.

### El objetivo

Hoy, cuando un agente termina la Sesión que tenía asignada, el humano redacta y
manda el brief del siguiente. Se busca que ese salto ocurra solo, con gates
humanos donde el usuario los quiera.

### El principio que no se negocia

**La torre sigue siendo tonta y confiable.** Sin tabla de planes, sin despacho
automático, sin criterio adentro del store. Su README es la regla:

> No crea, borra ni mueve worktrees. No lanza sesiones. La torre coordina, no
> ejecuta.

Todo el valor de la torre es ser mecanismo puro. El criterio de "qué Sesión
sigue" cambia por proyecto, por Plan y por semana; meterlo adentro arruina la
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

- El agente saliente es el mejor autor posible: acaba de vivir la Sesión
  anterior y conoce el delta entre lo que el plan decía y lo que pasó de verdad.
  Eso resuelve el problema del plan que envejece, que ni el humano ni Main
  pueden cubrir con la misma fidelidad.
- La sesión entrante arranca con **contexto fresco**, sin arrastrar horas de
  depuración de la Sesión anterior. Es la palanca de calidad más grande
  disponible.

### Lo que ya existe y no hay que inventar

**La casilla es el almacén del handoff entre sesiones.** El agente saliente hace
`tower_send` a sí mismo; el mensaje queda en `tower.db`, en disco. La sesión
nueva arranca en el mismo worktree, o sea la misma identidad (`basename(worktree)`,
`core.mjs:81`, verificado que sobrevive reinicios), y hereda su propia casilla.

Cero mecanismo nuevo. `tower_register` es idempotente (`ON CONFLICT(name) DO
UPDATE`), así que registrarse de nuevo es seguro.

### Resolución: quién enciende la sesión nueva

El límite histórico del plugin sigue: sólo despierta una sesión ya estacionada y no
crea sesiones. La responsabilidad de lanzamiento pertenece ahora a Host Launcher.
Tras la aprobación humana del brief, crea un panel Herdr nuevo y visible, inicia una
sesión OpenCode raíz `gentle-orchestrator` en el worktree asignado, entrega el brief
y proyecta allí el estado raíz. Los subagentes nativos de OpenCode son internos y no
pueden ocupar ni clobber ese panel/estado. El diseño se enumera en `P4/S4.2`; no hay
decisión pendiente de visibilidad.

### Los riesgos, en orden

1. **Auto-asignación con expansión de alcance.** El agente se escribe su propia
   próxima tarea; sin gate se convierte en *"ya que estoy, refactorizo esto
   otro"*. Mitigación acordada: **el saliente propone, Main valida contra
   openspec, recién ahí el brief entra a la casilla.** Main no redacta, compara y
   aprueba o corta.
2. **Base drift.** Cada Sesión arranca sobre un `main` que se movió. Ya mordió
   una vez (`18f6d47` → `81ec6da`, 2026-07-21). El paso de avance **debe**
   incluir rebase y review nuevo; no es adorno.
3. **Fuga sin testigo.** Un agente que avanza seis Sesiones solo deja seis PRs sin
   leer. El guard de despertares no cubre esto: cuenta mensajes, no trabajo. Hace
   falta un presupuesto aparte, de N Sesiones por corrida sin supervisión.
4. **La velocidad no escala como parece.** La cola serializa **entregas**, no
   trabajo. Tres agentes avanzando en paralelo llegan los tres a READY y hacen
   fila por el mismo token. Es por diseño y está bien, pero no hay que esperar
   3x.

### Primer paso sugerido, sin código

No automatizar la decisión de Main. Cuando un agente llega a MERGED, reporta
*"S2.2 cerrada, la siguiente es S2.3"*. Main lee el plan, confirma que sigue
vigente y aprueba o rechaza el handoff. Tras la aprobación, el lanzamiento visible
de la sesión raíz es automático; la decisión humana no.

Eso da el dato que decide todo lo demás: cuántas veces el plan seguía vigente. Si
a las diez Sesiones aguantó nueve, automatizar es seguro. Si aguantó cuatro, se
evitó un desastre.
