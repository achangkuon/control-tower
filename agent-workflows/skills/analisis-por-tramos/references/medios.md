# El medio se elige; la estructura no cambia

El método es el plano. El artifact, el markdown o la terminal son sólo el papel donde se dibuja.
Preguntá el medio en el paso 1 y no lo vuelvas a tocar: cambiar de papel a mitad del análisis
pierde los tramos ya cerrados.

## Qué es fijo

El orden de las preguntas, el cierre humano por tramo, el cruce obligatorio, la severidad de cada
choque y la declaración de lo que no se toca. Nada de eso depende del medio. Un análisis que
saltea el cruce porque «el medio no daba» no es un análisis incompleto: es otro método.

## Qué cambia

| Medio | Cuándo | Cómo se entrega |
| --- | --- | --- |
| **Artifact** | El runtime lo ofrece y el análisis pasa los seis tramos o tiene tablas grandes | Una página navegable con índice; los tramos como secciones ancladas; los choques como tabla ordenable por severidad |
| **Markdown en el repo** | Runtimes sin artifacts, o el análisis debe quedar versionado junto al código | Un `.md` con índice al tope, un `##` por tramo y un `###` por choque. Es el medio por defecto: sobrevive al runtime que lo escribió |
| **Terminal** | Análisis cortos, o el humano quiere ir leyendo mientras avanza | Un tramo por respuesta, con el cierre pedido explícitamente al final de cada uno. Al terminar, volcá todo a markdown |

## La regla del medio por defecto

Ante la duda, **markdown en el repo**. Un artifact es más cómodo de leer y muere con la cuenta que
lo publicó; un archivo versionado se lee peor y sobrevive. Cuando el análisis define un flujo que
el equipo va a seguir durante meses, ganá durabilidad y perdé comodidad.

Un artifact nunca reemplaza al archivo: si publicás uno, el markdown se escribe igual y el artifact
lo renderiza. La fuente de verdad es el archivo.

## Runtimes

Claude Code puede publicar artifacts. Pi, Codex y OpenCode no: para ellos el medio es markdown o
terminal, y **no es una degradación** — es el medio por defecto igual. No pidas permiso para
«bajar» a markdown; la pregunta del paso 1 es qué medio hay, no si se acepta uno peor.

Si el runtime no está declarado, asumí markdown y decilo en el encabezado del documento.
