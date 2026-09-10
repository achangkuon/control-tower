---
name: analisis-por-tramos
description: "Trigger: definir el flujo de punta a punta, discusiones en círculo, las piezas existen pero no encajan, análisis por tramos. Corta un flujo en preguntas y las cierra de a una con el humano."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Usá esta skill cuando un producto tiene piezas construidas pero **su flujo de punta a punta no está definido**, y las discusiones vuelven en círculo. El síntoma típico: cada conversación redefine algo que ya se había decidido, y nadie puede decir qué falta sin abrir el código.

Es conversacional por diseño. El humano cierra cada tramo antes del siguiente; sin ese cierre el análisis avanza sobre supuestos y produce un documento lindo que nadie puede ejecutar. **No la corras desatendida.**

No la uses para diagnosticar fallas de un producto vivo (`chanks-1-descubrimiento`), ni para escribir un PRD (`chanks-1-prd`), ni para cortar alcance ya aprobado en Sesiones (`chanks-2-planificador-granular`).

## Hard Rules

- **Desambiguá antes de analizar.** Si una palabra nombra varias cosas, separalas en cajas y decí qué pasa si apagás cada una. La mitad de las discusiones circulares vive ahí.
- **Un tramo es una pregunta, no un componente.** «¿quién la agarra y sigue siendo honesta la ruta?», no «el módulo de ruteo». Un componente se describe a medias y parece completo; una pregunta contestada a medias se nota.
- **El flujo entero antes que cualquier detalle.** Una idea entra por el primer tramo y sale por el último. Si no podés dibujarlo completo, todavía no sabés cuántos tramos hay.
- **Fijá vocabulario, con lo descartado y por qué.** Palabras que no se pisan. El descarte razonado es lo que impide que la palabra vieja vuelva en tres semanas.
- **Un tramo por vez, y el humano lo cierra.** Presentá el tramo, esperá el feedback, incorporalo, recién ahí seguí. Ese cierre es el método, no una formalidad.
- **El cruce es obligatorio.** Terminados los tramos, cruzá contra lo que ya está construido y contra las decisiones ya cerradas. Sin cruce hay teoría, no análisis.
- **Cada choque lleva severidad y decisión.** Qué contradice, a qué contamina, y si es derivable o escala. Un choque sin decisión es un choque que vuelve.
- **Nada se implementa durante el análisis.** Ni un archivo. El documento se escribe para implementar después, y lo dice en su encabezado.
- **El orden de implementación se deriva, no se inventa.** Sale de las dependencias entre choques y huecos, no del gusto de nadie.
- **Declará explícitamente lo que no se toca.** Lo que queda afuera protege el alcance mejor que lo que queda adentro.

## Decision Gates

| Diagnóstico | Acción |
| --- | --- |
| Una palabra nombra varias cosas | Parar y desambiguar; es el paso 0, no una nota al pie |
| No podés dibujar el flujo completo | Faltan tramos: seguí preguntando antes de detallar |
| Un tramo describe una pieza y no una pregunta | Reescribilo como pregunta o fusionalo con su vecino |
| El humano no cerró el tramo anterior | Detenerse. No avances con feedback pendiente |
| Un choque no tiene autoridad ni criterio falsable | Escala: no lo resuelvas vos |
| El cruce no produjo ningún choque | Sospechá: o el producto es trivial, o no cruzaste contra las decisiones cerradas |
| Aparece la tentación de arreglar algo ya | Anotalo como choque y seguí; implementar acá contamina el análisis |

## Execution Steps

1. **Terreno.** Leé el estado real y preguntá con qué medio contás para entregar (ver `references/medios.md`).
2. **Cajas.** Desambiguá cada nombre que signifique más de una cosa; decí qué pasa si apagás cada caja.
3. **Flujo.** Dibujá la entrada y la salida y los tramos intermedios. Nombrá roles y vocabulario, con descartes.
4. **Tramos.** Uno por vez: qué produce, qué lo sostiene hoy, qué falta. **Cerrá con el humano antes del siguiente.**
5. **Cruce.** Contra lo construido y contra las decisiones cerradas: ya cubierto · hueco · choque.
6. **Choques.** Cada uno con severidad, qué contradice, a qué contamina, y decisión derivable o escalada.
7. **Orden.** Derivá los pasos de implementación de las dependencias entre choques y huecos.
8. **Bordes.** Declará lo que no se toca y las lecciones de verificación para no repetir errores.

## Output Contract

Devolvé un documento con: encabezado que declara que nada fue implementado y sobre qué revisión exacta se escribió · las cajas desambiguadas · el flujo completo con roles y vocabulario · un bloque por tramo · el cruce con sus tres categorías · los choques con severidad y decisión · el orden derivado · lo que no se toca. El medio de entrega se elige en el paso 1; la estructura no cambia con el medio.

Declará también qué tramos quedaron sin cierre humano y qué choques quedaron escalados.

## References

- `references/medios.md` — cómo se entrega el mismo análisis en artifact, markdown o terminal.
- `references/estructura.md` — la plantilla del documento y el ejemplar que la originó.
