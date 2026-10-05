---
name: chanks-0-comunicacion-agentes
description: "Trigger: comunicate con el agente, decile que, fijate qué hace, decile que frene, abrí un panel, iniciá un agente. Enruta la comunicación manual entre agentes a un caso."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activa por la intención del usuario, dicha con sus palabras y sin que nombre Herdr: dejarle un
mensaje a otro agente que ya corre, mirar qué está haciendo, frenarlo, o abrir un panel o iniciar
un agente nuevo. Cubre la comunicación manual entre agentes de cualquier tipo, pedida por el usuario.

## Hard Rules

- Enrutá a un solo caso por pedido y cargá su detalle bajo demanda desde `references/casos-herdr.md`.
- Antes de cualquier comando verificá `HERDR_ENV=1`. Fuera de Herdr decilo y detenete; no
  inspecciones ni controles la sesión desde afuera.
- La skill nativa `herdr` es la referencia de comandos: citala y no copies su procedimiento. Donde
  no esté instalada, la autoridad de sintaxis es la CLI instalada (`herdr --help`).
- Nunca respondas por otro agente una pregunta o aprobación de su interfaz.
- Si el agente destino está bloqueado esperando una aprobación, no le envíes nada e informale al usuario.
- Un mensaje se envía aunque el agente esté ocupado, sin esperar su respuesta y redactado para no
  interrumpir: dice de quién viene, que no frene y que lo sume a sus pendientes.
- Frená a otro agente sólo cuando el usuario lo pide con esas palabras. Observar es sólo lectura.
- Atendé sólo lo pedido. No cierres paneles ni agentes que no creaste.
- Fuera de alcance: el despacho automático de Sesiones, el pool de workers y la topología de la
  Torre siguen diferidos a V3 en `agent-workflows/skills-diferidas/v3/chanks-3-despacho-herdr/`.
  Intercom sigue siendo el transporte entre workers Pi (decisión S137).

## Decision Gates

| Pedido del usuario | Caso en `references/casos-herdr.md` |
|---|---|
| «comunicate con el agente», «decile que…» | Dejar un mensaje |
| «fijate qué hace» | Observar |
| «decile que frene» | Frenar |
| «abrí un panel», «iniciá un agente» | Abrir un panel o iniciar un agente |
| No queda claro a qué agente se refiere | Preguntá cuál; no adivines el destino |
| Despachar Sesiones, armar un pool o una topología | Fuera de alcance: decilo y detenete |

## Execution Steps

1. Verificá `HERDR_ENV=1`; si no se cumple, decí que no estás corriendo dentro de Herdr y detenete.
2. Identificá el caso del pedido sin reinterpretarlo y el agente o panel destino.
3. Cargá sólo la sección de ese caso en `references/casos-herdr.md`.
4. Tomá la sintaxis de la skill nativa `herdr` o, si no está instalada, de `herdr --help`.
5. Ejecutá sólo lo pedido e informá el resultado al usuario.

## Output Contract

Devolvé: caso elegido; agente o panel destino; qué se envió, leyó, frenó o abrió; estado observado
del destino; y lo que no se hizo con su motivo (fuera de Herdr, destino bloqueado, fuera de alcance).

## References

- `references/casos-herdr.md` — detalle de cada caso, cargado bajo demanda.
- Skill nativa `herdr` — externa, la mantiene el autor de Herdr y se sobrescribe al actualizarlo; en
  Pi vive en `~/.pi/agent/skills/herdr/SKILL.md`.
