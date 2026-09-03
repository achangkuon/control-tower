# Propuesta — Identidad visual de la Torre en Pi

> **Esto no es autoridad y no registra avance.** Se escribió el 2026-09-03 como
> `openspec/plans/plan-13/STATUS.md`, antes de que `openspec/plan.yaml` fuera el único
> origen editable del plan. Los índices de estado paralelos están prohibidos desde la
> migración a Zonas (ver `AGENTS.md`, «La autoridad de planificación»), así que el
> registro se conserva acá como **propuesta pendiente de enumerar**, junto a las otras
> dos que espera integración.
>
> El contenido es el original y lleva la autoridad del maintainer del 2026-09-03
> (`decision-register.md`, decisión 109 — renumerada desde 108 por colisión con una
> decisión de `master` del 2026-09-01). El territorio que reclama, `extensions/pi/**`,
> pertenece a la Zona `hosts`. Nunca llegó a `master`: vivió sólo en esta rama.
>
> **Para que exista de verdad hay que enumerarla como Sesión en `openspec/plan.yaml`.**
> Mientras tanto no tiene estado, no ocupa lugar en ninguna cola y no acredita avance.

## Registro original


**Propósito:** que una operación de la Torre se reconozca a simple vista dentro de una sesión Pi —emoji, nombre y color propios— igual que los demás productos que comparten esa pantalla.

**Estado:** 📋 PLANIFICADO
**Avance:** 0% (0/1 S)

> **Nace el 2026-09-03 de la [decisión 108](../decision-register.md)**, sobre la evidencia de [Audit D](../audits/pi-tui-badge-audit-d.md).

## Por qué es un Plan nuevo y no una Sesión dentro de otro

Se aplicó el test de pertenencia por propósito, el mismo que fundó P11. **Ningún Plan existente lo cubre:**

| Plan | Propósito | ¿Cubre cómo se presenta la Torre dentro de una sesión Pi? |
|---|---|---|
| P4 | Que se pueda abrir una sesión, y de qué depende eso | No — lanza y vigila, no presenta |
| P8 | Que la Torre se instale como producto | No — empaqueta `extensions/pi/**` como bytes opacos; declara explícitamente que los consume **sin modificarlos** |
| P9 | Asientos estables y reciclado seguro | No |
| P11 | Que el maintainer le dé una orden a la Torre y vea su respuesta | No — su audiencia es el operador en `bin/torre`; ésta es la superficie que ve el agente dentro de su propio TUI. P11 además está ✅ COMPLETO y su Sesión única cerró el vocabulario tipeable |

El contenido de `extensions/pi/**` no tiene Plan dueño: P8 declara esos bytes como **Recurso** que consume sin modificar, lo que confirma el hueco en vez de llenarlo.

## Deuda de modelo registrada

La convención canónica de planificación aprobada el 2026-09-01 reemplaza el modelo multi-Plan por `Zona → Sesión → Módulo → Tarea` sobre un plan único. Este repositorio sigue en el modelo multi-Plan (P0–P12) y su reconciliación más reciente es de la misma fecha. `P13` **extiende el modelo vigente del repositorio en lugar de forkear la regla**: la migración al modelo de Zonas es trabajo propio, con su propia autoridad, y no viaja montada en una Sesión de presentación. Queda reportada acá, no resuelta acá.

## Restricción de secuencia frente a P8

`S13.1` modifica `extensions/pi/package.json`, incluidos `requiredCapabilities` y `reviewedTransforms`. Esos mismos bytes son **Recurso** de `S8.12` —que los empaqueta «sin modificarlos» y falla cerrado ante provenance divergente— y su fingerprint cerrado es lo que valida el preflight de `S8.13`.

No es un conflicto de propiedad: es orden. **`S13.1` debe aterrizar antes de `S8.12`**, o asumir explícitamente el re-fingerprint en `S8.13`. Entregarla antes no genera retrabajo; postergarla sí.

---

## Sesión 13.1 — Badge de la Torre en el TUI de Pi

**Estado:** 🟢 LISTO — `#1` en la cola de ejecución por autoridad de prioridad del maintainer del 2026-09-03.

**Depende de:** nada. La extensión Pi de la Torre ya está declarada y se carga; el mecanismo de render es API pública de Pi 0.84.4.

**Restricción de arranque:** `S9.9` mantiene suspendidos `torre asiento abrir` y todo dispatch de worker, y esta Sesión no levanta ese bloqueo. Se ejecuta bajo la excepción bootstrap de `AGENTS.md`: se reutiliza el asiento permanente existente, el propio peer reconcilia su worktree y enruta por `session-kickoff`. Sin apertura de asiento, sin creación de tab/pane Herdr y sin dispatch mediado por la Torre.

**Área:** `extensions/pi/**`, `test/extensions/pi/**`.

**Prohibido:** Pi core, `pi-intercom`, skills genéricas de Gentle AI, `adapters/pi/**`, `mcp.mjs`, `bin/torre`, `hosts/**` e `install/**`. La Sesión **presenta**; no redefine el router de input, el enrolamiento, la autoridad ni el transporte.

**Recurso:** superficie de render de la extensión Pi y el contrato de capacidades de `extensions/pi/package.json`.

**Decisiones:**

- `escala`, **resuelta por la decisión 108** — la Torre se presenta en Pi como extensión propia y no como servidor MCP. **Clase:** contrato visible del producto. **Contamina:** `S8.12 → S8.13` por secuencia, no por semántica.
- `derivable` — granularidad de la superficie tipeable de `torre`. **Criterio:** un único tool con subcomando enumerado; un tool por comando falsifica la derivación. **Autoridad:** maintainer, 2026-09-03. **Falsificador:** el catálogo expone más de un tool para el vocabulario de `bin/torre`.
- `derivable` — origen del color. **Criterio:** el badge consume un token existente del tema; declarar un token nuevo falla cerrado contra el schema de Pi. **Autoridad:** Audit D §3.

**Ruta:** `direct` — entra en `apply`. El mecanismo, la implementación de referencia y los archivos quedaron fijados por Audit D; no hay diseño sin resolver. **Autoridad de ruta:** Audit D y decisión 108. `session-kickoff` la revalida una vez contra el código de la Zona.

**Criterios de aceptación** — todos deben pasar para cerrar:

- [ ] Las filas de las tools de la Torre renderizan emoji, nombre y color en los cuatro estados observables (preparando, corriendo, completado, fallido)
- [ ] `torre` se expone como **un** tool con subcomando enumerado; el catálogo no contiene un tool por comando
- [ ] `extensions/pi/package.json` declara las capacidades de render nuevas y conserva un único inventario de transforms; no quedan listas paralelas
- [ ] El badge consume tokens de tema existentes; no se declara ningún token nuevo
- [ ] El diff toca sólo `Área`
- [ ] Ninguna mutación de Pi core, `pi-intercom` ni skills genéricas de Gentle AI

#### Módulo M13.1.1 — Renderer y contrato de capacidades · commit directo ≤400 authored

- [ ] Tarea T13.1.1.1 — RED: cubrir los cuatro estados del badge y el rechazo de un token de tema inexistente.
- [ ] Tarea T13.1.1.2 — GREEN: módulo de render y ampliación de `requiredCapabilities` y `reviewedTransforms`.
- [ ] Tarea T13.1.1.3 — REFACTOR: una sola fuente del inventario de transforms, sin listas paralelas.

#### Módulo M13.1.2 — Presencia de sesión · commit directo ≤400 authored

- [ ] Tarea T13.1.2.1 — RED: cubrir la tarjeta de enrolamiento y el indicador persistente, incluida la sesión no enrolada.
- [ ] Tarea T13.1.2.2 — GREEN: emitir la tarjeta desde el router de input existente y fijar el indicador de footer.
- [ ] Tarea T13.1.2.3 — REFACTOR: consumir el renderer de `M13.1.1` sin duplicar composición.

#### Módulo M13.1.3 — Superficie tipeable como tools · commit directo ≤400 authored

- [ ] Tarea T13.1.3.1 — RED: cubrir `tower_radar` y `torre` con subcomando válido, inválido y ausente.
- [ ] Tarea T13.1.3.2 — GREEN: registrar ambos tools con su render, delegando la ejecución a los binarios existentes.
- [ ] Tarea T13.1.3.3 — REFACTOR: unificar el manejo de errores de ambos tools.

**Forecast:** tres commits directos verificables y revertibles, cada uno ≤400 líneas authored. `M13.1.3` es el candidato probable a división: si los dos tools y su cobertura no caben juntos, se parte antes de implementar. No se crean PRs ni un cuarto nivel de granularidad.

**Asiento previsto:** `implementer-3`, hoy en `fix/main-tab-label` y limpio. La reconciliación del asiento la ejecuta el peer, nunca Support.
