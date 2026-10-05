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

- [x] T1 — Escribir S222 en `openspec/plan.yaml` (Zona producto-torre), `radar check` + `radar render`. Commit `docs(plan)` — `f0cf78b`.
- [x] T2 — RED — (evidencia: «Permisos inseguros» en las 5 pruebas nuevas antes de implementar).
- [x] T3 — GREEN — `preflightProjectPaths` con `groupWritableOk`; `doctorProject` bifásico con comparación tolerante del bit 0o020 en instrucciones.
- [x] T4 — GREEN — `--fix-permissions` en `project doctor` (cli.mjs) + proyección `permissionError` al estado.
- [x] T5 — TUI — acción informativa «Corregir permisos» (`projects.go` + `model.go`, página `project-permissions`).
- [x] T6 — Verificación — bun 2132 pass / 0 fail; python 501 OK; `go test ./...` del módulo TUI ok; vet+gofmt limpios. Commit de unidad `a8132fa` en `s222/permisos-instrucciones`.

## Estado final
Implementación entregada e integrada: commit `17498ef` en `master` (push `1904d9b`), S222 archivada en plan.yaml con cierre `47739f2` (push). Revisión nativa RDD aprobada y acuse quemado (lineage `review-f65bd5af0a38bce6`). Clasificación de release: amerita patch `v1.3.1`; publicación pendiente de decisión del mantenedor (posible lote junto con el fix de #156).

## Siguiente paso (2026-10-06)
Abrir por Radar la Sesión de arreglo del issue #156 (auto-actualización rota cuando cambia el tamaño del roster: bound de parseo, `from-checkout` con roster viejo, validación cruzada de cachés), decidida por el mantenedor como prioridad. Backup de la versión rota del runtime en `~/torre-broken-7b7b024-backup/` y del registro de proyectos en `~/torre-registry-backup.json` (limpiar cuando #156 esté cerrado).

## Restricciones

- No tocar los archivos de S219/S221 (otro agente está trabajando en `Main`).
- Directos y journal siguen exigiendo 0700/0600; otros-writable sigue siendo rechazo duro.
- La verificación de contenido usa la semántica existente: bloque `control-tower:project-workflow` byte a byte (`projectInstructionState`), que es el rango que la Torre posee.
- Push, merge e integración: decisión humana, después de que el otro agente entregue.
