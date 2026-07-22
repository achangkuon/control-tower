# Torre de Control

Coordina varias sesiones de agente que corren en worktrees distintos del mismo
repositorio, sin que un humano haga de cable entre ellas.

Un orquestador parado en el worktree principal asigna trabajo; cada agente
trabaja en su rama, reporta, y espera turno para entregar. La torre se encarga
de que los mensajes lleguen, de que el estado sea consultable, y de que **solo
uno entregue a la vez**.

## Instalación

```bash
./install.sh          # instala o actualiza
./install.sh --check  # solo diagnostica
```

Necesita `bun`, `git` y `jq`. `python3` es opcional (solo para el validador de
briefs). El instalador hace backup de `opencode.json` y verifica que no se haya
perdido nada antes de reemplazarlo.

## Las piezas

| Archivo | Qué hace |
|---|---|
| `core.mjs` | Esquema SQLite y todas las operaciones. Único lugar que toca la base. |
| `mcp.mjs` | Servidor MCP: expone las 8 herramientas `tower_*` a los agentes. |
| `plugin/tower-spike.js` | Despierta una sesión parada cuando le llega un mensaje. |
| `bin/torre` | El comando para armar, cortar y mirar. |
| `validate-compact-message.py` | Valida que un brief entre en presupuesto. |

## Cómo funciona

El estado vive en `<git-common-dir>/control-tower/tower.db`, una base SQLite por
repositorio. Todos los worktrees de un repo la comparten; repos distintos nunca.
Vive dentro de `.git`, así que **no se versiona ni ensucia ninguna rama**.

Las herramientas:

```
tower_register    entrar a la torre; la identidad sale del directorio, no se declara
tower_status      todos los agentes, su estado, la cola y quién tiene cada lock
tower_send        encolar un mensaje para otro agente
tower_set_state   actualizar tu propio estado
tower_acquire     pedir un lock (git-delivery | db-writer)
tower_release     soltar un lock que tenés
tower_transfer    pasar un lock tuyo a otro agente, sin que quede libre en el medio
tower_receive     leer tu próximo mensaje a mano
```

El plugin es la única pieza que no puede ser una herramienta: **despertar a un
agente parado**. Cuando una sesión termina su turno empieza a mirar su cola cada
dos segundos, y si hay algo lo inyecta como turno nuevo.

## El interruptor

```bash
torre on      # habilita coordinación y entrega
torre off     # desarma sin borrar agentes, mensajes, historial ni locks
```

Es un archivo (`ACTIVE`), no una variable de entorno ni una herramienta. Dos
razones: opencode lo lanza el gestor de sesiones, así que no hay shell donde
exportar nada; y un interruptor de emergencia no puede depender de que funcione
el MCP que está apagando. `torre off` elimina `ACTIVE` bajo la misma barrera
SQLite que usan las operaciones protegidas: si una ya está escribiendo, espera
hasta cinco segundos a que termine antes de volver. Si no puede cruzar la
barrera, falla y deja `ACTIVE` intacto en vez de quedar bloqueado indefinidamente.

La torre falla cerrada mientras está desarmada. `tower_register`, `tower_send`,
`tower_set_state`, `tower_receive`, `tower_acquire` y `tower_transfer` devuelven
el mismo error indicando que hay que ejecutar `torre on`; ninguna de esas
operaciones modifica la base y `tower_receive` deja los mensajes pendientes.
Solo siguen disponibles `tower_status` (que incluye `active: false`),
`tower_release` y la recuperación humana `torre unlock`/`forceRelease`, para
inspeccionar el sistema y liberar locks sin rearmarlo.

## Comandos

```bash
torre           # estado: agentes, ramas, locks, quién te necesita
torre on/off    # armar / desarmar sin borrar estado
torre log       # el loop en vivo (rojo = requiere intervención humana)
torre unlock    # liberar un lock cuya sesión murió (pide confirmación)
torre reset     # borrar el estado de este repo
```

## Lo que la torre garantiza

- **Ningún mensaje se pierde.** La cola es transaccional; dos agentes que
  reportan al mismo tiempo se encolan los dos.
- **Un solo token de entrega.** `tower_acquire` decide en una transacción; no
  hay ventana entre preguntar y tomar. Ocho procesos pidiendo a la vez → uno.
- **Nadie roba un token.** Solo el dueño puede soltarlo o pasarlo. La torre
  reserva la entrega y se la transfiere al que le toca, así que `holder` siempre
  nombra a quien está entregando de verdad. Si esa sesión murió, `torre unlock`
  es la salida, y solo desde una terminal.
- **La identidad no se declara.** Sale del directorio de trabajo, así que un
  agente no puede hacerse pasar por otro.
- **Apagado no es pausa parcial.** Desarmada, la torre rechaza toda operación
  que agregue, consuma o cambie trabajo, pero conserva íntegros estado y locks.

## Lo que NO hace

No crea, borra ni mueve worktrees. No lanza sesiones. No hace push ni merge.
Eso lo seguís manejando vos: la torre coordina, no ejecuta.

## Trabajo en paralelo, entrega en serie

Que dos agentes toquen archivos distintos no los habilita a entregar juntos:
comparten el mismo remoto y, muchas veces, la misma base de datos. Por eso el
trabajo va en paralelo y la entrega va de a uno.

## Si algo no anda

| Síntoma | Causa probable |
|---|---|
| Mandaste un mensaje y el agente no reacciona | El repo no está armado (`torre on`), o esa sesión todavía no completó un primer turno — el sondeo arranca recién ahí |
| `tower_send` da error de destinatario | Ese agente nunca llamó `tower_register` |
| `torre` no existe | Terminal vieja; abrí una nueva |
| Un lock quedó tomado por nadie | `torre unlock` |

El registro completo está en `<git-common-dir>/control-tower/tower.log`.
