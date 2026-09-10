# La plantilla, y el ejemplar que la originó

El método salió de un análisis real: `agent-workflows/FLUJO-END-TO-END.md`, 621 líneas escritas el
2026-09-02, que cerró el gate de investigación de la migración a Zonas de Control Tower. Antes de
ese documento las discusiones sobre el flujo volvían en círculo; después quedó todo definido y sólo
faltó implementar. Si dudás de una sección, abrilo y mirá cómo se ve.

## La plantilla

```
# El flujo end-to-end de <producto>

> Este documento cierra el gate de investigación de <origen>.
> Nada fue implementado. Se escribe para implementar después.
> Escrito el <fecha> sobre <repo@revisión exacta>.

## 0. Las cajas — qué es cada cosa cuando decimos «<nombre ambiguo>»
    Tabla: caja · dónde vive · qué es · si la apagás

## 1. El flujo, de punta a punta
    Diagrama: entrada → tramos → salida, con la pregunta de cada tramo
### Los roles                 quién · qué hace · qué NO hace
### El vocabulario            palabras que no se pisan, con los descartes y por qué
### Convención de nombres

## 2. Tramo por tramo — qué produce y qué lo sostiene
### ① <Nombre> — «<la pregunta>»
    qué produce · qué skills o piezas lo sostienen hoy · qué falta · qué se disuelve
    (uno por tramo; cada uno cierra con el humano antes del siguiente)

## 3. El cruce — los tramos contra lo que ya está construido
### 3.1 Ya construido — el tramo lo confirma, no hay trabajo
### 3.2 Los huecos — caen en fases vacías
### 3.3 Los choques
#### 🔴 C1 — <qué contradice a qué>
     Choca con: <decisión o pieza>   Contamina: <qué más>   Decisión: derivable | escala
### 3.4 Resumen del cruce            tabla de conteos

## 4. El orden de implementación
    Paso 0 — antes de tocar nada (no negociable)
    Paso 1..n — derivados de las dependencias entre choques y huecos

## 5. Lo que no se toca

## 6. Lecciones de verificación — para no repetirlas
```

## Los tres detalles que hacen la diferencia

**El encabezado declara la revisión exacta.** «Escrito sobre `repo@abc1234`» convierte el documento
en algo verificable. Sin eso, seis semanas después nadie sabe si el análisis todavía aplica.

**«Nada fue implementado» va arriba, no al final.** Es lo que permite analizar sin miedo: el lector
sabe que ninguna afirmación del documento ya cambió su código.

**Los choques se numeran y se conservan.** `C1`…`C8` se citan después desde las Sesiones, los
commits y las decisiones. Numerarlos los vuelve direccionables; renumerarlos rompe esas
referencias, igual que con los identificadores de Sesión.

## Cómo se ve un tramo bien cortado

Del ejemplar, el tramo 3:

> **③ ENRUTADO** — *«¿quién la agarra, con qué asiento, y sigue siendo honesta la ruta?»*
> Produce: obrero sentado en su worktree, ruta revalidada.

Tres cosas a la vez: nombra el tramo, hace la pregunta, y declara el producto observable. Si no
podés escribir las tres, el tramo todavía no está cortado.

## Cómo se ve un choque bien escrito

> **🔴 C1 — `est:` sigue en el canon, y el tramo 2 lo saca**
> Choca con: la convención aprobada el 2026-09-01. Contamina: toda Sesión ya escrita con ese campo.
> Decisión: derivable — el canon nuevo lo prohíbe explícitamente y el falsificador es su propio texto.

Qué contradice, a qué alcanza, y quién decide. Un choque sin las tres partes vuelve en la próxima
conversación.
