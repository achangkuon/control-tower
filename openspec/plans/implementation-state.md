# Estado de implementación — Control Tower

> Este documento mide **código**, no planificación. El [master-index](master-index.md) dice qué está planificado y qué Sesiones cerraron; este archivo dice qué existe, qué corre y qué está desplegado.
> Medición: 2026-07-31 sobre `Main` en `2cc7c80281ce266efa5eac073a63e5e91c0af466`.

## ⚠️ Hallazgo principal: construido ≠ desplegado

Lo que corre a diario **no es** el código de este repositorio.

| | Runtime en uso | Repositorio |
|---|---|---|
| Ruta | `~/.config/opencode/control-tower/core.mjs` | `Main/core.mjs` |
| Tamaño | 15.7 KB · 398 líneas | 384 KB · 4646 líneas |
| Fecha | 2026-07-21 | 2026-07-31 |
| Origen | checkout git independiente, sin remote, en `681a0e5` | `origin/master` |

`bin/torre` resuelve el runtime con `CONTROL_TOWER_CORE:-$HOME/.config/opencode/control-tower/core.mjs`. Las operaciones diarias (`on`, `off`, `status`, `log`, `unlock`, `reset`) ejecutan ese archivo de 398 líneas, no el del repositorio.

Además **no existe data-root XDG de `installable-v1`**: el lifecycle versionado que entregó `S8.2` está implementado y probado, pero no hay ninguna instalación hecha a través de él.

Esto es exactamente lo que el manifest de `installable-v1` declara resolver: `migrates: checkout-bound-installer-to-versioned-installable-v1`. El problema está diagnosticado y el remedio construido; falta la adopción.

## Inventario de módulos

| Módulo | Líneas | Lane | Estado |
|--------|--------|------|--------|
| `core.mjs` | 4646 | — legado | Sustrato monolítico. Es el ancestro del runtime en uso, no está modularizado ni cubierto por los lanes. |
| `mcp.mjs` | 437 | — legado | Superficie MCP. |
| `bin/torre` | — | ambos | Punto de entrada. Delega `install\|diagnose\|upgrade\|rollback\|uninstall` a `install/lifecycle.mjs`; rechaza `launch-worker\|create-worker\|create-session\|create-worktree` con `CT_V2_ONLY`. |
| `install/` | 185 | `installable-v1` | `lifecycle`, `active-pointer`, `version-store`. Entregado por `S8.2`. |
| `contracts/` | 322 | `autonomous-v2` | `schema-registry`, `canonicalize`, `artifact-ref`, `idempotency`, `validate`, `errors`. Entregado por P2 Change A. |
| `registry/` | 337 | `autonomous-v2` | `store`, `path`, `legacy-import`. Entregado por `S2.4` y `S2.5`. |
| `main-store/` | 183 | `autonomous-v2` | `authority`, `store`. Entregado por P2 Change A. |
| `console/` | 173 | `autonomous-v2` | `validate`, `vocabulary`. |
| `dashboard/` | 390 | — fuera de lane | `app`, `auth`, `render`, `server`, `view-model` y fuentes mock. Skeleton archivado, sin fuente real. |

La frontera V1/V2 **está aplicada en código**, no sólo en documentos: `bin/torre` corta las capacidades V2 con `CT_V2_ONLY`.

## Estado de las pruebas

`bun test` sobre `Main`, con dependencias instaladas:

```
397 pass · 2 fail · 2552 expect() calls · 399 tests en 21 archivos
```

Los 2 fallos **no son regresiones**. Son `P0 frozen snapshot restore` sobre `f583df7` y `71ab571`, y fallan con `Control Tower must be OFF: .git/control-tower/ACTIVE is present`. Es el fail-closed funcionando: la Torre está armada en este checkout y las pruebas de restauración se niegan a correr. Con la Torre desarmada corren.

Dos condiciones previas que no están documentadas en ningún runbook y hacen fallar la suite a quien la corra en frío:

1. `Main` no tiene `node_modules`. Sin `bun install`, 8 fallos y 6 errores por `Cannot find package 'yaml'`.
2. El runner es `bun`, no `node`. `node --test test/` falla con `MODULE_NOT_FOUND`.

## Brechas reales

| # | Brecha | Consecuencia |
|---|--------|--------------|
| 1 | El runtime en uso es un checkout de 2026-07-21 divergente y sin remote | Todo lo construido desde entonces no está en producción. La adopción de `installable-v1` es el desbloqueo. |
| 2 | El alcance restante de `installable-v1` no tiene Sesiones enumeradas | El lane que debería salir primero es el único sin denominador. No se puede medir ni comprometer. |
| 3 | `core.mjs` tiene 4646 líneas y ningún lane lo reclama | El sustrato que efectivamente corre queda fuera de la contabilidad de ambos productos. |

## Qué NO mide este documento

Cobertura de pruebas por módulo, rendimiento, y el grado de conformidad contra los Gates A–G de REQUIREMENTS. Esa evidencia es el output de `S7.1` y todavía no existe.
