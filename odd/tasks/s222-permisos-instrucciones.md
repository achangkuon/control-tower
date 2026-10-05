# S222 — Permisos de instrucciones de proyecto: fin de la falsa alarma «inválido»

## Objetivo

Resolver issue #155: los proyectos cuya instrucción `AGENTS.md` queda group-writable
(664, típico de `umask 0002` tras un checkout de Git) no deben invalidarse cuando su
contenido propio está verificado byte a byte; además, `torre-control project doctor`
debe soportar `--fix-permissions` (su propio mensaje de error ya lo sugiere), y la TUI
debe ofrecer la corrección como acción informativa.

## Decisión del mantenedor (2026-10-05)

Opción «Ambas» (issue #155): (1) confiar en la verificación de contenido para el bit
group-writable, y (2) reparación soportada en un comando. Clase: seguridad y permisos.
Contamina: `product/tower/v1/` — `project-files.mjs`, `adoption.mjs`, `projects.mjs`,
`cli.mjs`, tests, y acción informativa en `tui/`. Release esperada: patch `v1.2.6`.

## Tareas

- [ ] T1 — Escribir S222 en `openspec/plan.yaml` (Zona producto-torre), `radar check` + `radar render`. Commit `docs(plan)`.
- [ ] T2 — RED: pruebas que fallan — (a) `doctorProject` acepta `AGENTS.md` 664 cuando el bloque propio verifica igual; (b) sigue rechazando otros-writable y bloque modificado; (c) CLI acepta `--fix-permissions` en `project doctor`.
- [ ] T3 — GREEN: relajamiento quirúrgico — `preflightProjectPaths` acepta un conjunto de rutas de instrucciones con bloque verificado cuyo bit group-writable no invalida; `preflight`/`doctorProject` computan ese conjunto comparando el bloque propio; directorios y otros-writable siguen estrictos.
- [ ] T4 — GREEN: `--fix-permissions` en `project doctor` (CLI + threading en `projects.mjs`/`adoption.mjs`), siguiendo el patrón existente de `permissionsChanged`.
- [ ] T5 — TUI: para proyecto inválido, acción informativa «Corregir permisos» con el comando exacto (patrón «Actualizar la Torre» de `model.go`).
- [ ] T6 — Verificación: suites aplicables (bun product tests, `go test ./...` de la TUI), work-unit commits convencionales en la rama `s222/permisos-instrucciones`.

## Restricciones

- No tocar los archivos de S219/S221 (otro agente está trabajando en `Main`).
- Directos y journal siguen exigiendo 0700/0600; otros-writable sigue siendo rechazo duro.
- La verificación de contenido usa la semántica existente: bloque `control-tower:project-workflow` byte a byte (`projectInstructionState`), que es el rango que la Torre posee.
- Push, merge e integración: decisión humana, después de que el otro agente entregue.
