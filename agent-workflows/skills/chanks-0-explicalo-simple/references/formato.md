# Formato de explicación en lenguaje de producto

Extraído del artefacto "Radiografía de la Torre" (2026-08-19), que el maintainer
confirmó como el formato que quiere repetir.

## Orden de secciones para un informe completo

1. **Masthead** — título + una frase que diga exactamente qué contiene y contra qué
   se verificó ("Todo verificado contra el código, no contra la documentación").
2. **Fila de instrumentos** — 5-6 números grandes, cada uno con su unidad en palabras
   llanas debajo. Colorea por estado: verde ok, ámbar espera, rojo frena.
3. **"Qué es esto, sin jerga"** — el propósito del producto en 3 párrafos, sin un solo
   término técnico. Incluye la definición de "listo" si existe.
4. **El veredicto en tres frases** — los 3 hallazgos que mueven la aguja, uno por línea.
5. **Avance** — tabla con barra de progreso, qué resuelve cada Plan, qué queda.
6. **Lo que ya funciona hoy** — lista de capacidades reales, verificadas. No promesas.
7. **Los problemas de fondo** — cada uno con las dos capas (ver abajo).
8. **Qué trabajo queda enumerado** — tabla: qué entrega, estado, qué la frena.
9. **Decisiones que dependen de vos** — bloques de decisión (ver abajo).
10. **Lo que está pasando ahora mismo** — trabajo en vuelo, sin publicar.
11. **Footer** — evidencia cruda: commits, conteos, suite, fuentes.

## El patrón de dos capas (obligatorio)

Cada hallazgo se escribe así:

```
TÍTULO — una frase declarativa, sin jerga
  Lo técnico: preciso, con paths y números. Aquí sí van los términos técnicos.
  En simple:  qué significa para el producto y para él. Analogía si ayuda.
  Evidencia:  file:line · conteos · fuente del plan
```

Ejemplo real que funcionó:

> **El instalador rechaza por contrato al 45% del producto**
>
> *Lo técnico:* `install/runtime-payload.mjs` define `RUNTIME_PAYLOAD_FILES`: una lista
> blanca cerrada de 18 archivos, y `scanClosure` rechaza cualquier directorio que no sea
> `bin` o `install`. Se instalan 6.260 líneas de las 11.445 que tiene el producto.
>
> *En simple:* Es como tener el auto entero armado en el taller y que el camión que lo
> entrega sólo pueda cargar el motor y las ruedas. Todo lo que se construyó en los últimos
> meses funciona en el repositorio pero no en la instalación que usás a diario. Y no es que
> falte empaquetarlo: el contrato del instalador lo *prohíbe*. Nadie tiene asignado ese trabajo.
>
> *Evidencia:* install/runtime-payload.mjs:5-24, 57 · brecha 6, sin Sesión dueña

## El bloque de decisión

```
Decisión N · qué destraba
TÍTULO — la pregunta como pregunta de producto, no de implementación

El contexto: por qué esto está frenado, qué se intentó, qué pasa si no se decide.

A  Nombre de la opción en una frase imperativa.
   Consecuencia: qué gana, qué pierde, qué cuesta.  — es la que recomiendo
B  ...
```

Reglas del bloque:

- El título es lo que él decide, no cómo se implementa. "Quién se hace cargo de que el
  producto entero se instale", no "refactor de RUNTIME_PAYLOAD_FILES".
- Cada opción declara consecuencia. Una opción sin consecuencia no es elegible.
- Siempre hay una recomendación marcada, salvo que las opciones sean genuinamente
  equivalentes — en ese caso decilo.
- Incluí siempre la opción "no hacer nada / dejarlo apagado" cuando es viable, con su
  costo real ("Cero riesgo, cero avance").
- Ordená las decisiones por cuánto destraban, no por número.

## Reglas de escritura

- **Analogías**: una, concreta, física, y después seguís. Nunca encadenes dos.
  Buenas: el auto y el camión · el andamio desplegado y el edificio no.
- **Números**: siempre con su unidad en palabras. `55%` solo no dice nada;
  `55% del código llega a instalarse` sí.
- **Estados**: en palabras. `apagado`, `sin dueño`, `frenado`, `escrito y probado pero
  nadie lo llama`. No uses solo el emoji ni solo la etiqueta del plan.
- **Honestidad**: si corregís un error propio anterior, decilo con el nombre de la
  premisa falsa y por qué la creíste. El artefacto original incluyó su propia corrección
  del hallazgo A y eso sumó confianza, no la restó.
- **Nunca suavices**: simplificar el lenguaje no es bajar la gravedad. Un bloqueo se
  nombra bloqueo.

## Qué NO hacer

- Listar módulos por nombre sin decir qué hacen.
- Presentar dos opciones técnicas y pedirle que elija por criterio de ingeniería.
- Dar un porcentaje sin la fracción de la que sale.
- Enterrar la conclusión al final de un párrafo largo.
- Usar la documentación como fuente cuando podías verificar contra el código.
