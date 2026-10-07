# Casos de comunicación manual entre agentes

Este archivo dice qué hacer en cada caso. Cómo se escribe cada comando lo dice la skill nativa
`herdr` —sus secciones sobre agentes, paneles y reglas de seguridad— o, donde no esté instalada,
`herdr --help`. No copies comandos acá: la skill nativa cambia con cada actualización de Herdr.

## Antes de cualquier caso

- Confirmá que corrés dentro de Herdr (`HERDR_ENV=1`). Si no, decilo y detenete.
- Identificá el destino a partir del estado vivo de la sesión: el nombre único del agente o el
  identificador de panel que devuelve la CLI. Nunca uses el panel enfocado del usuario como destino
  implícito ni deduzcas identificadores.
- Si hay más de un agente que podría ser el destino, preguntale al usuario cuál.
- Leé el estado del destino antes de actuar. Ese estado decide el caso, no lo que suponés.

## Dejar un mensaje

- Si el agente destino está esperando una aprobación o una pregunta de su interfaz, no le envíes
  nada: leé qué está esperando e informale al usuario. Lo mismo si la CLI rechaza el envío porque
  el destino está bloqueado.
- En cualquier otro estado enviá el mensaje aunque el agente esté ocupado.
- Enviá sin esperar su respuesta: no uses la opción de espera ni consultes su estado en bucle para
  ver si contestó.
- Redactá el mensaje para que no interrumpa. Abre con dos partes y después va el contenido:
  1. De quién viene: qué agente sos, en qué panel, y que lo pide el usuario.
  2. «No frenes lo que estás haciendo: sumalo a tus pendientes y atendelo cuando termines.»
- Transmití lo que pidió el usuario sin ampliarlo ni convertirlo en una orden nueva.
- Un mensaje por pedido. No lo repitas ni mandes recordatorios si el usuario no lo pide.
- Informá al usuario que quedó entregado, o el rechazo de la CLI tal como vino.

## Observar

- Sólo lectura: el estado del agente y su salida reciente.
- No envíes texto ni teclas, y no enfoques su panel: enfocarlo cambia lo que el usuario ve y marca
  como visto un trabajo que no vio.
- Contale al usuario qué está haciendo el agente y en qué estado está. Si está esperando una
  aprobación, decilo y no la respondas.
- Lo que observes no te autoriza a escribirle ni a frenarlo: si ves un problema, proponéselo al usuario.

## Frenar

- Sólo cuando el usuario lo pide con esas palabras: «decile que frene», «frenalo», «pará al agente».
  Un problema que vos observes no te autoriza a frenarlo.
- Si el agente destino está esperando una aprobación, no le envíes nada: una tecla de interrupción
  puede contestar o descartar esa aprobación por él. Informale al usuario.
- Frenar es interrumpir el turno en curso con la tecla de interrupción de la interfaz del agente.
  No es cerrar su panel ni terminar su proceso.
- Después de frenarlo confirmá su estado y dejale un mensaje que diga de quién viene el freno y que
  lo pidió el usuario.
- Informá al usuario en qué estado quedó.

## Abrir un panel o iniciar un agente

- Un agente lanzado para trabajar va en una pestaña nueva de Herdr con la etiqueta del trabajo:
  el agente arranca con nombre único en el panel raíz de esa pestaña, sin sacarle el foco al
  usuario y conservando el directorio de trabajo. Leé los identificadores de la respuesta JSON de
  la CLI y nunca los deduzcas.
- Un panel para mirar es un panel hermano: abrilo junto al tuyo, sin sacarle el foco al usuario y
  conservando el directorio de trabajo, salvo que pida otra cosa.
- Si el pedido no deja claro si es para trabajar o para mirar, preguntá antes de abrir nada.
- Iniciá un agente sólo en un panel que acabás de crear, con un nombre único. Si el usuario no dijo
  qué agente quiere, preguntá.
- Dale una instrucción inicial sólo si el usuario la dictó.
- No cierres paneles, pestañas ni agentes que no creaste.
- Es un pedido manual de terminal: abrí lo que se pidió y nada más.

## Fuera de alcance

- El despacho automático de Sesiones, el pool de workers y la topología de la Torre siguen
  diferidos a V3 en `agent-workflows/skills-diferidas/v3/chanks-3-despacho-herdr/`. Un pedido manual
  no entrega una Sesión planificada a otro agente ni arma asientos.
- Intercom sigue siendo el transporte entre workers Pi (decisión S137). Este archivo cubre lo que
  el usuario pide a mano, entre agentes de cualquier tipo.
