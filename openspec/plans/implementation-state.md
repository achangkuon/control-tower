# Estado de implementación — Control Tower

> Este documento mide **código**, no planificación. El [master-index](master-index.md) dice qué está planificado y qué Sesiones cerraron; este archivo dice qué existe, qué corre y qué está desplegado.
> Medición del inventario de módulos y de las pruebas: 2026-07-31 sobre `master` en `d072e509`, que integra `6fbd97c3b1f84735db61ccbd1fd510482206e4eb`. **No se volvió a medir el código el 2026-08-01** — lo que se agregó ese día es la brecha 5, observada sobre `master@a4aa3a6`.
>
> **Nota de vocabulario (2026-08-01):** la columna `Lane` de la tabla de módulos ya no nombra dos productos. Tras la [unificación](release-chain.md), `installable-v1` y `autonomous-v2` son afinidad de trabajo y nada más. El corte que sí sigue siendo real está en código: `bin/torre:28` rechaza capacidades con `CT_V2_ONLY`, y pasa a ser un flag opt-in apagado por defecto en vez de una frontera de producto.

## ⚠️ Hallazgo principal: construido ≠ desplegado

Lo que corre a diario **no es** el código de este repositorio.

| | Runtime en uso | Repositorio |
|---|---|---|
| Ruta | `~/.config/opencode/control-tower/core.mjs` | `Main/core.mjs` |
| Tamaño | 15.7 KB · 398 líneas | 384 KB · 4646 líneas |
| Fecha | 2026-07-21 | 2026-07-31 |
| Origen | checkout git independiente, sin remote, en `681a0e5` | `origin/master` |

`bin/torre` resuelve el runtime con `CONTROL_TOWER_CORE:-$HOME/.config/opencode/control-tower/core.mjs`. Las operaciones diarias (`on`, `off`, `status`, `log`, `unlock`, `reset`) ejecutan ese archivo de 398 líneas, no el del repositorio.

> **Corrección del 2026-08-01.** La medición del 2026-07-31 afirmaba que *no existía* data-root XDG. **Es falso desde que corrió `M8.8.2`.** Verificado hoy: `~/.local/share/control-tower/` existe con `active.json` y dos versiones instaladas (`b72e450…` y `d280214c…`), y `torre diagnose` devuelve `{"healthy":true,"active":"b72e450…"}`.
>
> Lo que sigue siendo cierto es el encabezado de esta sección: **el runtime en uso no es el instalado.** `bin/torre` todavía resuelve al checkout legado porque `M8.8.3` no ejecutó el corte — el payload instalado omite `core.mjs`. La adopción está *iniciada y es reversible*, no ausente. La corrige `M8.8.4`, sellado y sin integrar.

Esto es exactamente lo que el manifest de `installable-v1` declara resolver: `migrates: checkout-bound-installer-to-versioned-installable-v1`. El problema está diagnosticado y el remedio construido; falta la adopción.

## Inventario de módulos

| Módulo | Líneas | Lane | Estado |
|--------|--------|------|--------|
| `core.mjs` | 4646 | — legado | Sustrato monolítico. Es el ancestro del runtime en uso, no está modularizado ni cubierto por los lanes. |
| `mcp.mjs` | 437 | — legado | Superficie MCP. |
| `bin/torre` | — | ambos | Punto de entrada. Delega `install\|diagnose\|upgrade\|rollback\|uninstall` a `install/lifecycle.mjs`; rechaza `launch-worker\|create-worker\|create-session\|create-worktree` con `CT_V2_ONLY`. |
| `install/` | 185 | `installable-v1` | `lifecycle`, `active-pointer`, `version-store`. Entregado por `S8.2`. **Construido y probado, nunca usado** — lo adopta `S8.8`. |
| `contracts/` | 322 | `autonomous-v2` | `schema-registry`, `canonicalize`, `artifact-ref`, `idempotency`, `validate`, `errors`. Entregado por P2 Change A. |
| `registry/` | 337 | `autonomous-v2` | `store`, `path`, `legacy-import`. Entregado por `S2.4` y `S2.5`. |
| `main-store/` | 183 | `autonomous-v2` | `authority`, `store`. Entregado por P2 Change A. |
| `support/agent.mjs` | 49 | `installable-v1` | Entrada `createSupportBrief`; valida la solicitud y mantiene Support read-only. Entregado por `S8.4`. |
| `support/manifest.mjs` | 99 | `installable-v1` | Resuelve el roadmap y los STATUS permitidos con validación fail-closed. Entregado por `S8.4`. |
| `support/snapshot.mjs` | 52 | `installable-v1` | Captura fuentes, Git y Tower DB en modo read-only/query-only. Entregado por `S8.4`. |
| `test/support/support.test.mjs` | 172 | `installable-v1` | Prueba enfocada del contrato, rechazos y testigos de no mutación de `S8.4`. |
| `console/` | 173 | `autonomous-v2` | `validate`, `vocabulary`. |
| `dashboard/` | 392 | — fuera de lane | `app`, `auth`, `render`, `server`, `view-model` y fuentes mock. Skeleton archivado, sin fuente real. |

La frontera V1/V2 **está aplicada en código**, no sólo en documentos: `bin/torre` corta las capacidades V2 con `CT_V2_ONLY`.

## Estado de las pruebas

Verificación de `S8.4` sobre el candidato `9458c78ee8fa00e4edfe0869beb6743308ad7f03`, integrado sin cambios de tree en `master@6fbd97c3b1f84735db61ccbd1fd510482206e4eb`:

```
focused: 22/22 · scoped: 59/59 · full: 431/431
```

Los testigos Strict TDD y de no mutación pasaron. La corrección del prerrequisito de migración se integró previamente mediante PR #125 en `88b1c5198c08cefbe886df62c3cb4f97214d1506`.

**Ese `full: 431/431` requiere la Torre desarmada.** Re-medido el 2026-07-31 en un worktree con la Torre armada, `bun test` da **429 pass · 2 fail**: los dos `P0 frozen snapshot restore` cortan con `Control Tower must be OFF: .git/control-tower/ACTIVE is present`. Es el fail-closed funcionando, no una regresión — pero quien corra la suite en frío va a ver los 2 fallos y debe saber por qué.

Otras dos condiciones previas sin runbook: un worktree nuevo no tiene `node_modules` (sin `bun install` la suite rompe con `Cannot find package 'yaml'`), y el runner es `bun`, no `node`.

## Brechas reales

| # | Brecha | Consecuencia |
|---|--------|--------------|
| 1 | El runtime en uso sigue siendo el checkout legado de 2026-07-21, pese a que la versión XDG ya está instalada | El corte no se hizo: el payload publicado omite `core.mjs`. Lo corrige `M8.8.4` — sellado, con test RED en rama, sin integrar — y después `M8.8.3` reanuda el corte atendido. Sigue abierta. |
| 2 | ~~`S8.5` está 🟢 LISTO pero **UNASSIGNED**~~ | **Superada el 2026-07-31.** `S8.5` y `S8.6` pasaron a 🟡 DIFERIDO por decisión del maintainer; el despacho vigente es `S8.8` y después `S8.7`. |
| 3 | `core.mjs` tiene 4646 líneas y ningún lane lo reclama | El sustrato que efectivamente corre queda fuera de la contabilidad de ambos productos. Sigue abierta; no bloquea V1. |
| 4 | Se documentaba más de lo que se construía | 42 commits `docs` contra 34 de código; 32 de los últimos 40 sin merge eran docs; 17 changes abiertos contra 2 archivados. **Corregida** por la [regla de ejecución V1](v1-execution-rule.md) y por el archivado del 2026-07-31. |
| 5 | El registro de la Torre no coincide con los worktrees reales | Observada el 2026-08-01 con `torre status` y `git worktree list` sobre `master@a4aa3a6`. Ver detalle abajo. Sigue abierta. |

## Brecha 5 — deriva del registro de la Torre

`torre status` lista **seis** agentes registrados. Existen **tres** worktrees además de `Main` y `claude`.

| Agente registrado | Worktree | Estado real |
|---|---|---|
| `Main` | `Main` | Existe · `a4aa3a6` |
| `v1` | `Worktrees/v1` | Existe · `3e648ac`. **La rama registrada no es la del worktree**: la Torre anota `fix/installable-v1/m8-8-4-runt…`, el worktree está en `fix/installable-v1/m8-8-4-adoption-preflight` |
| `v2` | `Worktrees/v2` | Existe · `3e648ac` |
| `autonomous-v2` | — | **No existe.** Retirado en la consolidación a tres slots |
| `installable-v1` | — | **No existe.** Ídem |
| `multi-agentic-*` | — | **No existe, y tiene 1 mensaje pendiente en cola** que ningún proceso va a consumir |

Consecuencias operativas:

1. **La capacidad que reporta la Torre es ficción.** Tres de seis agentes no pueden tomar trabajo.
2. **El mensaje encolado se pierde en silencio.** `receive` sólo lee filas no consumidas y nada las reproduce; no hay error, no hay aviso.
3. **`Worktrees/support-agent` no está registrado y así debe seguir** — Support es read-only por diseño y nunca se registra. Pero está en `3e648ac`, o sea **sin `release-chain.md`**: cualquier brief que se le pida antes de actualizarlo va a salir incompleto.

No se corrigió nada de esto: desregistrar agentes y purgar cola son mutaciones del registro de la Torre, y esta sesión no tiene ni la autoridad ni el transporte para hacerlas.

## Qué NO mide este documento

Cobertura de pruebas por módulo, rendimiento, y el grado de conformidad contra los Gates A–G de REQUIREMENTS. Esa evidencia es el output de `S7.1` y todavía no existe.
