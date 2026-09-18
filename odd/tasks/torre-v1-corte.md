# Torre V1 — el corte del plan

## Objetivo

Redefinir `openspec/plan.yaml` para que la prioridad `torre-v1` describa un producto
publicable: el semáforo compilado, Radar y las skills, instalables desde el instalador.
Todo lo demás —handoffs, despacho Tower-owned de Herdr, refactor de `core.mjs`— pasa a
`torre-v2` y `torre-v3`.

## Problema

La prioridad `torre-v1` enumera hoy 15 Sesiones, y el grueso no es el semáforo sino
topología de Herdr, hosts y enrolamiento. La cadena del instalador atraviesa esa
topología entera:

    S8.13 -> S8.12 -> S9.8 -> S108 -> S107 -> S9.7 -> S2.9
                                       `-> S121
    S8.13 -> S1.19, S4.12

`radar check` (`agent-workflows/tools/radar/check.go:750`) rechaza que una Sesión dependa
de una prioridad posterior, así que mover esa cadena a `torre-v2` sin reescribir S8.12 y
S8.13 rompe el plan. El corte no es una renumeración.

## Por qué

La capa semáforo (`core.mjs:4318-4681`, 364 líneas) ya entrega el resultado que define el
producto: los agentes entregan en orden y no se chocan en master. La capa `continuation`
(~4200 líneas) implementa traspaso de trabajo con rollback y recibos, y está en el paso 1
de los 11 que enumera `docs/architecture/torre-motor-determinista.md`, sección 17. El
despacho manual equivalente ya funciona hoy mediante la skill `chanks-3-despacho-herdr`,
que opera con la Torre apagada.

## Alcance autorizado

Sólo `openspec/plan.yaml`, y `openspec/ROADMAP.md` si su vista generada queda desalineada.
No se toca código, ni `core.mjs`, ni el instalador, ni ninguna skill.

## Restricciones

- Las Sesiones cerradas no se tocan: ninguna declara prioridad y `check.go:741` permite que
  la historia cerrada conserve una prioridad retirada.
- Las Sesiones que sólo cambian de prioridad conservan intactos su Encargo, autoridad,
  archivos, Cimientos y dependencias.
- S8.12 y S8.13 se reescriben con autoridad explícita de esta conversación, que reemplaza
  la anterior; el reemplazo queda declarado en su campo `autoridad`.
- Las Sesiones nuevas llevan Encargo de cuatro partes y dependencias que apuntan hacia
  atrás.
- Las líneas de planificación no cuentan contra la referencia de 400.

## Tareas

- [x] **T1** — Reescribir el bloque `prioridades`: `torre-v1` redefinida, `torre-v2` (ex
      `torre-v1`) y `torre-v3` (ex `v2`).
- [x] **T2** — Mover a `torre-v2` las 12 Sesiones que salen de `torre-v1`: S1.19, S107,
      S108, S119, S121, S147, S148, S2.9, S4.12, S7.1, S9.7, S9.8.
- [x] **T3** — Mover a `torre-v3` las 16 Sesiones de `v2`: S101, S109, S114, S115, S12.3,
      S12.4, S12.5, S12.6, S12.7, S12.9, S123, S2.10, S4.4, S4.8, S9.10, S9.2.
- [x] **T4** — Crear la Sesión del binario: S149, compilar la capa semáforo con
      `bun build --compile`. Sin dependencias. Encargo `incompleto: true`: falta decidir si
      la capa se extrae a un módulo propio o se compila desde `core.mjs` tal como está, y esa
      decisión determina los archivos y Cimientos exactos.
- [x] **T5** — Crear la Sesión del README del producto real: S150, `zona: cimientos`,
      reserva exacta de `README.md`. S12.6 se reescribió para conservar sólo la
      reorganización de la raíz y ahora depende de S150.
- [x] **T6** — Reescribir S8.12: el bundle V1 enumera el binario de S149 por huella exacta.
      Dependencia de S9.8 retirada; la decisión estructurada sobre routing se acotó para que
      la política fire-and-forget no viaje en el bundle V1.
- [x] **T7** — Reescribir S8.13: depende sólo de S8.12. Dependencias de S1.19 y S4.12
      retiradas, con la consecuencia declarada en su `autoridad`.
- [x] **T8** — `radar check`: 0 errores, 28 avisos — idéntico a la línea base previa.
- [x] **T9** — `radar render` regeneró `openspec/ROADMAP.md`.

## Criterios de aceptación

- `torre-v1` contiene exactamente S117 y las cuatro Sesiones de binario, README, bundle e
  instalador.
- Ninguna Sesión abierta depende de una prioridad posterior.
- `radar status` ofrece trabajo de `torre-v1` y ya no de handoffs ni topología Herdr.
- Las 79 Sesiones cerradas conservan su estado sin cambios.

## Checks aplicables

- `radar check` — cero errores. Línea base antes del corte: 0 errores, 28 avisos.
- `radar status --json` — el reparto por prioridad coincide con lo aprobado.
- `cd agent-workflows/tools/radar && go test ./...` — sólo si el corte tocara Radar, que no
  es el caso.

## Modo TDD

No aplica: el entregable es un artefacto de planificación, no código. La verificación es
`radar check` más la lectura del reparto resultante.

## Progreso

Corte completo y verificado. `radar check`: 0 errores, 28 avisos — la misma línea base que
antes de empezar. Diff: `openspec/plan.yaml` +204/-… y `openspec/ROADMAP.md` regenerado.

Reparto resultante de las Sesiones abiertas:

| Prioridad | Sesiones |
|---|---|
| Método V1 · Radar | S145 `LISTO` |
| Método V1 · Controles | S143, S144, S146 |
| Método V1 | S122, S129, S133 |
| **Torre V1 · Release instalable** | **S117, S149, S150, S8.12, S8.13** |
| Torre V2 · Handoffs y despacho | S1.19, S107, S108, S119, S121, S147, S148, S2.9, S4.12, S7.1, S9.7, S9.8 |
| Torre V3 | 16 Sesiones |

Sin entregar: el cambio está en el árbol de trabajo, sin commit ni push.

## Decisiones que siguen abiertas

- **S122, S129 y S133** quedaron donde estaban, en `metodo-v1`. Falta que Emilio decida si
  entran a Método V1 o pasan a una prioridad posterior.
- **S149** necesita una pasada de planificación antes de ser arrancable: su Encargo está
  marcado incompleto y no autoriza archivos ni Cimientos.

## Próximo paso

Entregar el corte según la política del repo —commit directo a `master` y push— cuando
Emilio lo autorice. Después, la pasada de planificación de S149.
