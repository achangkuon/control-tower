# Copiloto — el flujo chanks guiado por una herramienta determinista

> **Nada de este documento está implementado.** Es el análisis por tramos del 2026-10-07,
> escrito sobre `master` en `cdf1d86`, con el maintainer cerrando cada tramo. Se escribe
> para implementar después, Sesión por Sesión.

## Índice

1. [El problema](#1-el-problema)
2. [Cajas](#2-cajas)
3. [El flujo](#3-el-flujo)
4. [Tramos](#4-tramos)
5. [Cruce](#5-cruce)
6. [Choques](#6-choques)
7. [Orden derivado](#7-orden-derivado)
8. [Lo que no se toca](#8-lo-que-no-se-toca)

## 1. El problema

El flujo chanks no se ejecuta. Una auditoría de los registros del 6 y 7 de octubre
(Engram 13295) mostró:

- `radar etapa`, el primer paso obligatorio, se corrió en 0 de 4 conversaciones.
- `chanks-4-puente` y `chanks-5-session-doc` nunca se cargaron. El cierre se rehízo a mano
  cinco veces y rompió el plan dos veces.

Lo que sí funcionó tiene una herramienta detrás: `radar check`, la lista de archivos
autorizados y el control previo a la subida (`pre-push`). Lo que depende de que el agente
se acuerde de leer una skill, no.

El puntero global ya existe en los tres runtimes:

- `~/.pi/agent/APPEND_SYSTEM.md:120`
- `~/.claude/CLAUDE.md:665`
- `~/.codex/AGENTS.md:846`

Igual no alcanzó: el agente sabe que el flujo existe, pero nada le dice *cuándo* aplicarlo.
Además `radar etapa` sin Sesión devuelve siempre `1 · Definir` (`agent-workflows/tools/radar/etapa.go:608-611`).
Por eso el hook de Claude `chanks-etapa.sh` muestra siempre lo mismo.

Las firmas 💪/🗼 funcionan en Pi. No aparecen porque las skills que las disparan no se
cargan (Engram 13296).

## 2. Cajas

| Caja | Qué es | Estado | Con el copiloto |
|---|---|---|---|
| A. Plan + Radar | `plan.yaml`, `radar check/sesion/status/etapa`, archivos autorizados | Funciona | Es la fuente de verdad del copiloto |
| B. Skills por etapa | `chanks-1-*` … `chanks-5-*` | No se cargan | El copiloto dice cuál cargar y cuándo |
| C. Bloque de AGENTS.md | Mapa, tabla de skills, reglas duras | Orienta, no obliga | Se adelgaza: la tabla pasa al copiloto |
| D. Firmas 💪/🗼 | Avisos de Pi y hooks de Claude | Funcionan si hay B o A | Aparecen porque B sí se carga |
| E. Candados | `pre-push` (Radar), doc-guard (sólo Claude) | Funcionan | Sin cambios |
| F. Piloto | Ejecución desatendida | V2 | Una de las dos salidas de la etapa 3 |

## 3. El flujo

```
Mensaje del humano
   │
   ▼
🧭 copiloto (se dispara solo, en cada mensaje)
   │  lee: foco de la conversación + radar etapa/status + carpeta de trabajo
   ▼
Etapa 0 · Libre ──(el agente propone «¿lo definimos?», el humano aprueba)──▶ Etapa 1 · Definir
                                                                              │ radar check
                                                                              ▼
                                                                  Etapa 2 · Preparar → LISTO
                                                                              │
                                                                              ▼
                                         Etapa 3 · Despachar ── ¿piloto prendido?
                                              │ «en esta conversación»      │ «con piloto»
                                              ▼                             ▼
                                Etapa 4 · Implementar (Gentle AI)      piloto (V2)
                                              │                             │
                                              ▼                             ▼
                                Etapa 5 · Cerrar ◀──────── aterrizaje con aprobación humana
                                              │ radar archivar (un solo comando)
                                              ▼
                                       Etapa 0 de nuevo
```

**Vocabulario**

- **Copiloto**: la herramienta. Familia aeropuerto: el piloto vuela solo; el copiloto acompaña
  al humano leyendo la lista de chequeo. Se descartó «jefe chanks» porque no suma a la familia.
- **Foco**: qué está en juego en esta conversación. Tiene tres estados: ninguno, idea o S###.
- **Tarjeta**: lo que el copiloto inyecta al agente y el humano también ve.

## 4. Tramos

### Tramo 0 — ¿Sobre qué Sesión estamos? (cerrado)

El foco se resuelve en este orden:

1. **Carpeta de trabajo.** Si el agente está en la copia de trabajo de una Sesión, el foco
   es esa Sesión. Es un hecho: lo prueba el marcador de despacho.
2. **Foco aprobado.** El agente lo propone según la conversación («esto suena a S234») y el
   humano lo aprueba. El humano también puede nombrarlo directo. Queda registrado con
   `copiloto foco <S###|idea|ninguno>`.
3. **Sin foco.** Panorama.

**El foco es por conversación.** Cada conversación nueva arranca en Etapa 0, así dos
conversaciones abiertas a la vez nunca se pisan el foco.

**Engram es una pista, no la verdad.** Puede ayudar al agente a proponer «ayer quedó S231 a
medio revisar, ¿retomamos?». Lo que decide es Radar.

### Tramo 1 — Etapa 0 · Libre (cerrado)

- **Cuándo:** foco ninguno. Es el estado inicial de toda conversación.
- **Qué hace el copiloto:** al empezar muestra una sola línea de panorama, por ejemplo
  `🧭 4 LISTAS · 1 EN CURSO: S231`. Después se calla: no inyecta tarjetas ni pide skills.
- **Salida:** el agente propone «¿lo pasamos a definir?» o «¿seguimos con S###?», o el humano
  lo pide directo. Con la aprobación, el foco cambia.
- **Volver atrás:** «pará, volvamos a pensar» regresa a Etapa 0.

### Tramo 2 — Etapa 1 · Definir

- **Cuándo:** foco = idea.
- **Tarjeta:** «Armá la propuesta de alcance. No escribas en `plan.yaml` sin aprobación
  humana.» La skill que corresponda va según el caso:
  - `chanks-1-brain-dump` para una idea suelta;
  - `chanks-1-feature` para capacidad nueva;
  - `chanks-1-descubrimiento` para auditar un producto vivo.
- **Cierre:** las Sesiones nuevas quedan en el plan y `radar check` da 0 errores. El foco pasa a
  la Sesión elegida, propuesta por el agente y aprobada por el humano.

### Tramo 3 — Etapa 2 · Preparar

- **Cuándo:** `radar etapa <S###>` = 2 (Sesión bloqueada por encargo incompleto).
- **Tarjeta:** «Completá el encargo hasta LISTO.» Skill: `chanks-2-planificador-granular`.
- **Cierre:** `radar check` da 0 errores y la Sesión queda 🟢 LISTO.

### Tramo 4 — Etapa 3 · Despachar

- **Cuándo:** `radar etapa <S###>` = 3 (LISTO).
- **Tarjeta:**
  - Con el interruptor del piloto prendido: pregunta bloqueante «¿con piloto automático o en
    esta conversación?» (S231/S232).
  - Si no: «Elegí el lote o seguí con esta Sesión», con la skill `chanks-3-paralelo`.
- **Cierre:** `radar marcar` (EN CURSO) o `piloto despegar`.

### Tramo 5 — Etapa 4 · Implementar

- **Cuándo:** `radar etapa <S###>` = 4 (EN CURSO).
- **Tarjeta:** «Entregá a Gentle AI.» Agrega los archivos autorizados de la Sesión. Skill:
  `chanks-4-puente`.
- **Regla:** acá manda Gentle AI (ODD/RDD). El copiloto no repite ni contradice sus pasos;
  sólo recuerda el contrato de la Sesión.
- **Cierre:** commit entregado con revisión RDD.

### Tramo 6 — Etapa 5 · Cerrar

- **Cuándo:** `radar etapa <S###>` = 5.
- **Tarjeta:** «Cerrá con `radar archivar <S###> --commit <sha>`.» Skill: `chanks-5-session-doc`.
- **Cambio de herramienta:** `radar archivar` hace todo en un solo comando: registra la
  entrega, archiva, corre `check` y `render`. Si falta un paso, el error dice cuál.
- **Cierre:** Sesión 📚 ARCHIVADA. El foco vuelve a ninguno (Etapa 0).

## 5. Cruce

**Ya cubierto**

- `radar etapa <ID>` ya decide de forma determinista las etapas 2 a 5 (`etapa.go:608-644`).
- `radar check`, `radar marcar` y el control previo a la subida.
- Las skills `chanks-1-*` … `chanks-5-*` ya existen.
- Las firmas de Pi (`chanks-notices.ts`).
- El interruptor del piloto, que S231 expone en `radar status --json`.

**Hueco**

- No existe la herramienta `copiloto` (foco, tarjeta, panorama).
- No hay dónde guardar el foco por conversación.
- Pi no tiene un enganche que corra en cada mensaje e inyecte la tarjeta.
- El hook de Claude no sabe el foco y no da instrucciones.
- Radar no representa el estado «idea» (Etapa 1). Ese estado vive en el foco del copiloto.
- `radar archivar` no es un solo comando.

**Choque:** ver la sección 6.

## 6. Choques

| # | Choque | Severidad | Contamina | Decisión |
|---|---|---|---|---|
| C1 | `chanks/controls.mjs` `admisionHumana`: «Radar propone y nunca elige; la Sesión la elige un humano» vs. que el agente proponga el foco | Baja | Etapa 3 | **Derivable:** compatible, porque el agente propone y el humano aprueba. El foco nunca se fija sin esa aprobación, salvo el hecho de la carpeta de trabajo. |
| C2 | Regla dura de AGENTS.md «el humano elige, el agente nunca decide» | Baja | Etapas 0 a 3 | **Derivable:** igual que C1. |
| C3 | AGENTS.md registra un incidente por retomar desde la memoria; el maintainer quiere usar Engram | Media | Tramo 0 | **Derivable:** Engram sólo alimenta la propuesta del agente; el foco y la etapa salen de Radar. |
| C4 | `chanks-etapa.sh` (Claude) espera `CHANKS_PREVIOUS_ETAPA_JSON`, que nadie llena, y siempre muestra «1 · Definir» | Media | Firmas en Claude | **Derivable:** el copiloto lo reemplaza; se retira el hook viejo. |
| C5 | Gentle AI inyecta ODD como obligatorio, y en la etapa 4 dos voces podrían competir | Media | Etapa 4 | **Derivable:** en la etapa 4 la tarjeta sólo nombra la Sesión, el contrato y la skill puente; Gentle AI manda. |
| C6 | La etapa 3 depende de la oferta del piloto, que todavía no está entregada | Media | Etapa 3 | **Orden:** el copiloto va después de S231 y S232. |
| C7 | La tarjeta es una inyección por mensaje y suma texto a cada turno | Baja | Todas | **Derivable:** tarjeta de 1 a 3 líneas; en Etapa 0 sólo la línea inicial. |
| C8 | El gráfico del 2026-10-01 incluye `Torre · jornada`, `radar admite` y la cola de salida, que no existen | — | — | **Escalado y resuelto por el maintainer:** fuera de esta versión (sección 8). |

## 7. Orden derivado

1. **S231 y S232**, la oferta del piloto y la sonda RDD (ya planificadas). Resuelven C6.
2. **`radar archivar` en un solo comando** (Método/Radar). No depende del copiloto y elimina
   el cierre a mano.
3. **Núcleo del copiloto** (Método): CLI `copiloto` con foco por conversación, panorama y
   tarjeta derivados de `radar etapa`/`status --json`. Pruebas deterministas por etapa.
4. **Enganches por runtime** (Producto Torre, instalador):
   - Claude: hook en cada mensaje que reemplaza a `chanks-etapa.sh` (C4).
   - Pi: extensión que inyecta la tarjeta en cada turno.
5. **Adelgazar el bloque de AGENTS.md** (Producto Torre): la tabla de skills pasa al copiloto
   y la regla queda en una línea: «seguí la tarjeta del copiloto».
6. **Smoke** en el sandbox con el carril candidato, recorriendo las etapas 0 a 5.

## 8. Lo que no se toca

- Gentle AI: ODD, RDD y su revisión.
- El piloto y su lógica interna.
- Los candados existentes (`pre-push`, doc-guard).
- Fuera de esta versión, para más adelante:
  - `Torre · jornada` (abrir y cerrar el día) y `chanks-0-jornada`;
  - `radar admite`;
  - la cola de salida ordenada de la etapa 5 y Pista (V3).
- El copiloto **guía, no bloquea**: no agrega candados nuevos.

**Tramos sin cierre humano:** 2 a 6 (Etapas 1 a 5). Se presentan en este documento para
aprobarlos juntos.
**Choques escalados:** sólo C8, ya resuelto por el maintainer.

**Lecciones de verificación:** una regla escrita sin herramienta detrás no se cumple (smoke
V2, Engram 13291). Cada tramo del copiloto tiene que probarse con una prueba determinista que
falle antes de implementarlo, no con un texto que diga que existe.
