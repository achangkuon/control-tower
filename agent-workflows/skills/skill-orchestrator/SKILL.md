---
name: skill-orchestrator
description: "Trigger: skill orquestadora, coordinar agentes, despachar trabajo, skill que manda a otro proceso. Diseña skills que comandan trabajo que corre fuera del turno."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Usá esta skill para diseñar o auditar una skill que **manda trabajo a otro proceso**: despachar agentes, tomar asientos, comandar un runtime vivo o coordinar actores que trabajan solos. No la uses para una skill madre que carga hijas y las ejecuta en su propio turno: eso es `skill-composer`.

La frontera es una sola pregunta: **¿el trabajo ocurre en tu turno, o en otro?** Una madre es un maletín —abrís, sacás la herramienta, la usás ahí mismo—. Una orquestadora es un handy: llamás a alguien en otro cuarto, con sus herramientas, trabajando solo. No ves lo que pasa, no podés deshacerlo, y si la radio se corta no sabés si la orden llegó.

## Hard Rules

- **Sondeá el estado antes de decidir.** La orquestadora lee el estado vivo del runtime y recién ahí elige. Una orquestadora que asume estado está inventando.
- **Declará un conjunto cerrado de modos, con una regla por modo.** Encendido, apagado, indeterminado, control caído. Si un modo no tiene regla escrita, no existe: el agente la va a improvisar.
- **Falla cerrada ante pérdida de control.** Transporte de mensajes no es fallback y no otorga autoridad. Si el control no responde: parar, no reparar, no reintentar a ciegas, no degradar a un camino manual.
- **Verificá por readback todo efecto remoto, y deshacé lo propio ante discrepancia.** Lo que no leíste de vuelta no pasó. Deshacé sólo lo que creaste vos.
- **Separá autoridad de evidencia.** La memoria, los logs y los reportes son evidencia; nunca autorizan. Nombrá quién despacha, quién aconseja y quién nunca se autoasigna.
- **La disposición nunca es automática.** Cerrar, reciclar, reusar o borrar un recurso vivo exige autorización explícita del humano, y se previsualiza antes.
- **No copies el procedimiento de las skills que cargás.** La orquestadora posee ruteo, orden y gates; cada hija conserva su procedimiento.
- **Una orquestadora no implementa.** Si empieza a escribir el trabajo que despachó, dejó de orquestar.

## Decision Gates

| Diagnóstico | Acción |
| --- | --- |
| El trabajo corre en tu turno, mismo proceso | No es orquestadora: usá `skill-composer` |
| El trabajo corre en otro proceso, turno o máquina | Orquestadora: aplicá las ocho reglas duras |
| No hay forma de leer el estado del runtime | Detenerse: sin sonda no hay orquestación honesta, sólo esperanza |
| No hay forma de verificar el efecto remoto | Detenerse: definí el readback antes de escribir la skill |
| El runtime no distingue modos | Detenerse: definí el conjunto cerrado antes de rutear |
| La orquestadora necesita el procedimiento completo de una hija | Detenerse: el diseño está creando un monolito |
| Coordinación y ejecución viven en la misma skill | Extraé la ejecución a una hija y dejá el ruteo arriba |

## Execution Steps

1. Nombrá el runtime que se comanda, su superficie exacta de control y qué pasa cuando no responde.
2. Enumerá el conjunto cerrado de modos y escribí la regla de cada uno, incluido el modo degradado.
3. Definí la sonda: qué comando lee el estado, qué campos son autoridad y cuáles son sólo evidencia.
4. Definí el readback de cada efecto remoto y la reversión de lo propio ante discrepancia.
5. Nombrá los roles: quién despacha, quién aconseja, quién ejecuta, quién nunca se autoasigna.
6. Escribí los gates de fallo cerrado antes que los caminos felices.
7. Listá las skills hermanas que se cargan por ruta, sin copiar sus reglas.
8. Auditá contra las ocho reglas duras y contra un ejemplar que ya funcione antes de publicar.

## Output Contract

Devolvé: el runtime comandado, el conjunto cerrado de modos con su regla, la sonda de estado, el contrato de readback y reversión, la tabla de roles y autoridad, los gates de fallo cerrado, las hijas cargadas por ruta, y toda regla que no pudiste escribir por falta de superficie de control.

## References

- `../skill-composer/SKILL.md` — la topología hermana: madres, hijas y ruteo en el mismo turno.
- `../skill-creator/SKILL.md` y `../skill-improver/SKILL.md` — creación y auditoría del archivo.
- `references/ejemplar.md` — `torre-control` leído regla por regla como orquestadora de referencia.
