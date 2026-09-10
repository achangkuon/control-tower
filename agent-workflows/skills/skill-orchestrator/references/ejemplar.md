# El ejemplar — `torre-control`, regla por regla

Una orquestadora que ya funciona en producción, leída como referencia. Cada fila de esta tabla
es una de las ocho reglas duras y la línea real que la cumple. Cuando dudes de cómo se ve una
regla escrita, mirá acá antes de inventar la forma.

El archivo vive en `control-tower/Main/skills/torre-control/SKILL.md`. Comanda **herdr**, un
gestor de espacios de terminal donde cada agente corre en su propio panel, en su propio proceso.

| Regla dura | Cómo se ve en `torre-control` |
| --- | --- |
| Sonda de estado antes de decidir | `torre asiento list` y `pool`, más leer `ACTIVE` — el paso 1, antes de cualquier decisión |
| Conjunto cerrado de modos | Torre apagada · Torre encendida con autoridad coincidente · control no disponible o binding distinto. Una fila de gate cada uno |
| Falla cerrada ante pérdida de control | *«Si el control de Herdr no está disponible, pará: el transporte de mensajes no es fallback y no otorga autoridad»* |
| Readback y reversión de lo propio | `abrir` verifica tab y ambos `cwd` por lectura de vuelta, y **cierra lo que abrió** si no coinciden |
| Autoridad ≠ evidencia | *«Main despacha; Support aconseja; los obreros nunca se autoasignan. Engram es evidencia, nunca autoridad»* |
| Disposición nunca automática | `limpiar` previsualiza; borrar exige `--confirmar` autorizado por el maintainer |
| No copiar el procedimiento de las hijas | Carga `torre-control-soporte` para evidencia y `torre-control-entregas` para entrega; no repite sus reglas |
| No implementa | Rutea obreros verificados a `chanks-3-session-kickoff`; el código lo escribe el obrero, en su asiento |

## Dos detalles que no son obvios

**La regla se enuncia primero como prohibición.** No dice «usá `torre asiento`». Dice
**«Nunca invoques `herdr` para sentar a un obrero. Siempre `torre asiento`»**, y explica por qué:
esa puerta posee la topología en código y falla cerrada donde la prosa se olvida. Una orquestadora
compite contra un agente que ya sabe usar la herramienta cruda; la prohibición es lo que gana esa
competencia.

**La misma regla vale encendido y apagado.** *«Hacé valer los bindings con la Torre apagada o
encendida, y nunca actives la Torre.»* Una orquestadora cuyo contrato cambia según el modo tiene
dos contratos, y el agente va a elegir el más cómodo.

## Qué hace este ejemplar mal, a propósito

Su prosa nombra rutas de código (`hosts/herdr-topology.mjs`) y comandos exactos. Eso lo ata a un
producto y hay que reescribirlo cuando el producto cambia. Es una decisión consciente: la
alternativa —prosa genérica— no falla cerrada cuando alguien se olvida. Copiá la estructura, no la
especificidad, salvo que tu orquestadora también comande un runtime propio.
