# V1 release — tasks

> Bajo la [regla de ejecución V1](../../plans/v1-execution-rule.md): sin `exploration.md`,
> `proposal.md` ni `design.md`. Las specs viven en el change archivado
> [`installable-v1-autonomous-v2-split`](../archive/2026-07-31-installable-v1-autonomous-v2-split/specs/installable-control-tower-v1/spec.md).
>
> Baseline: `master@d072e509`. Estado de P8: `50% (4/8 S)`.
> Ejecutor: **un solo agente, sin Torre de Control.**

## Qué queda para un V1 usable

| Sesión | Resultado | Estado | Por qué |
|---|---|---|---|
| `S8.8` | Adopción del instalable | 🟢 LISTO | Sin esto nada de lo construido desde 2026-07-21 corre en la máquina real |
| `S8.7` | Puente Hermes/Telegram acotado | 🟢 LISTO | Es lo que el socio va a usar |

`S8.5` y `S8.6` están 🟡 DIFERIDO. `S8.1`–`S8.4` están ✅ COMPLETO.

**Orden obligatorio: `S8.8` antes que `S8.7`.** Verificar el puente contra un runtime que no
es el que corre no prueba nada.

---

## S8.8 — Adopción del instalable en el runtime en uso

**Área:** `install/**`, `bin/torre`, `test/install/**`
**Recurso:** data-root XDG. Sin migraciones de DB, sin token de entrega.
**Depende de:** `S8.2` ✅

El lifecycle versionado existe y está probado desde `S8.2`, pero nunca se instaló nada a través
de él. `bin/torre:20` resuelve el runtime como
`CONTROL_TOWER_CORE:-$HOME/.config/opencode/control-tower/core.mjs`: un checkout independiente,
sin remote, de 398 líneas, congelado en `681a0e5` el 2026-07-21.

### M8.8.1 — Diagnóstico del estado actual

- [ ] T8.8.1.1 Ejecutar `torre diagnose` y registrar textualmente qué reporta sobre data-root, puntero activo y versión resuelta
- [ ] T8.8.1.2 Capturar el estado del runtime en uso: ruta, SHA del checkout, tamaño, fecha y ausencia de remote
- [ ] T8.8.1.3 Registrar qué configuración e historial existen hoy bajo `~/.config/opencode/control-tower/` y deben sobrevivir a la instalación

### M8.8.2 — Instalación versionada real

- [ ] T8.8.2.1 RED: extender `test/install/lifecycle.test.mjs` con el caso de instalar sobre una máquina que ya tiene un runtime legado sin data-root XDG, preservando configuración e historial
- [ ] T8.8.2.2 GREEN: ajustar `install/lifecycle.mjs` sólo si el caso falla; si pasa sin cambios, dejar constancia de que la cobertura ya existía
- [ ] T8.8.2.3 Ejecutar `torre install` real y verificar que el data-root XDG queda creado con la versión y el puntero activo correctos
- [ ] T8.8.2.4 Confirmar que la configuración y el historial previos siguen íntegros después de instalar

### M8.8.3 — Corte al runtime legado

- [ ] T8.8.3.1 Repuntar `bin/torre` al runtime instalado y dejar el checkout legado intacto como respaldo, sin borrarlo
- [ ] T8.8.3.2 Verificar `on`, `off`, `status`, `log`, `unlock` y `reset` contra el runtime instalado, uno por uno
- [ ] T8.8.3.3 Ejecutar `torre rollback` y confirmar que vuelve a la versión anterior sin pérdida de configuración
- [ ] T8.8.3.4 Reinstalar hacia adelante y confirmar idempotencia: instalar dos veces seguidas no produce un estado distinto

### Criterios de aceptación S8.8

- [ ] `torre diagnose` reporta un data-root XDG existente con puntero activo válido
- [ ] El runtime resuelto por `bin/torre` es el instalado, no el checkout de `~/.config/opencode/control-tower/`
- [ ] Las seis operaciones diarias corren contra el runtime instalado
- [ ] `rollback` y la reinstalación hacia adelante funcionan sin pérdida de configuración ni de historial
- [ ] `bun test test/install` pasa completo
- [ ] `bun test` no introduce fallos nuevos respecto de la base de 429 pass / 2 fail preexistentes
- [ ] Ninguna ruta fuera del `Área` aparece en el diff

---

## S8.7 — Puente Hermes/Telegram acotado

**Área:** `bridge/**`, `test/bridge/**`
**Recurso:** lectura del registro y del estado de Torre. Sin migraciones, sin locks, sin token de entrega.
**Depende de:** `S8.4` ✅, `S8.8`

> **Alcance:** este NO es el `proposal.md` de `sdd-tower-telegram-delivery`. Ese propone
> autorización de commit, push, PR y merge por Telegram, depende de contratos que no existen,
> y pertenece a V2. **S8.7 es un puente acotado:** presenta estado y acepta intención de
> arm/disarm sobre el `Main` de un proyecto registrado. Nada más.

Prohibido explícitamente: shell cruda, selección o lanzamiento de workers, entrega Git, merge,
y autoridad implícita sobre proyectos. **La operación local por CLI debe seguir completa con
Hermes ausente** — el puente es opcional, nunca un camino obligatorio.

### M8.7.1 — Frontera de autorización

- [ ] T8.7.1.1 RED: agregar `test/bridge/authorization.test.mjs` para allowlist exacta de usuario y chat, rechazo de identidad no listada, y rechazo de texto libre como autoridad
- [ ] T8.7.1.2 GREEN: implementar la resolución de identidad allowlisted con fallo cerrado ante identidad ausente, ambigua o no listada
- [ ] T8.7.1.3 RED+GREEN: rechazar toda solicitud fuera del conjunto `status | arm | disarm` con un código estable, antes de tocar registro o estado

### M8.7.2 — Superficie read-only de estado

- [ ] T8.7.2.1 RED: agregar `test/bridge/status.test.mjs` para el reporte de estado determinista de un proyecto registrado
- [ ] T8.7.2.2 GREEN: implementar el reporte reutilizando `createSupportBrief` de `support/agent.mjs`, sin abrir una segunda ruta de lectura
- [ ] T8.7.2.3 Verificar con testigos de bytes que consultar estado no muta registro, DB, WAL, SHM ni estado de Torre

### M8.7.3 — Intención de arm/disarm

- [ ] T8.7.3.1 RED: agregar `test/bridge/intent.test.mjs` para que `arm` y `disarm` resuelvan a un único proyecto registrado y fallen cerrado ante ambigüedad
- [ ] T8.7.3.2 GREEN: implementar la entrega de intención al `Main` del proyecto, sin ejecutar shell y sin crear sesiones, worktrees ni workers
- [ ] T8.7.3.3 Verificar que una intención repetida es idempotente y que una intención sobre un proyecto no registrado falla cerrado

### M8.7.4 — Degradación con Hermes ausente

- [ ] T8.7.4.1 RED: agregar el caso de Hermes ausente o caído
- [ ] T8.7.4.2 GREEN: confirmar que `bin/torre` y la operación local siguen completas sin el puente, y que su ausencia es diagnóstico y no error de instalación

### Criterios de aceptación S8.7

- [ ] Sólo la identidad allowlisted de usuario y chat obtiene respuesta; toda otra falla cerrado con código estable
- [ ] El texto libre nunca autoriza una acción
- [ ] Sólo `status`, `arm` y `disarm` son alcanzables; toda otra solicitud se rechaza antes de abrir DB o registro
- [ ] `status` es read-only verificado por testigos de bytes en éxito y en rechazo
- [ ] `arm`/`disarm` resuelven un único proyecto registrado, son idempotentes y fallan cerrado ante ambigüedad
- [ ] El puente no ejecuta shell, no crea sesiones/worktrees/workers, no entrega Git y no mergea
- [ ] Con Hermes ausente la operación local por CLI sigue completa
- [ ] `bun test test/bridge` pasa completo y `bun test` no introduce fallos nuevos
- [ ] Ninguna ruta fuera del `Área` aparece en el diff

---

## Cierre de V1

Con `S8.8` y `S8.7` cerradas, P8 queda en `75% (6/8 S)` con `S8.5` y `S8.6` explícitamente
diferidas. **Ahí V1 es usable por el socio.**

Cada Sesión actualiza `plan-8/STATUS.md` **en el mismo commit que su código**, con la evidencia
como sección: comandos exactos, resultado numérico y diff-check del `Área`. Sin PR de cierre.
