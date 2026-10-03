# S206 — Observaciones informativas de revisión

## Contrato y límite

Contrato consultado con `radar sesion S206`: corregir selección/campo ID ocultos en Radar, aviso de portapapeles no confirmado y admisión ambigua del import de CLAUDE.md. Sin leer `openspec/plan.yaml` completo. Árbol inicial limpio en `master`. No se hicieron commits, staging ni push; la entrega Git queda a cargo del orquestador.

Superficies: los cuatro archivos TUI autorizados, `test/adoption.test.mjs` y este registro. Ampliación esencial preaprobada: `product/tower/v1/project-files.mjs`, donde realmente reside la admisión (`projectInstructionSnapshot`); `adoption.mjs` la invoca y no necesitó cambios.

## Cambios y decisiones

- Radar enfoca la selección desde la apertura, al navegar, al volver y al cambiar el tamaño. PgUp/PgDn no pueden esconder el comando seleccionado. El campo ID se enfoca al abrirlo, editarlo, validar y redimensionar; si se parte en varias filas, se prioriza su final editable.
- Con una sola fila disponible en Radar interactivo se prioriza selección/entrada sobre el pie. El scroll de salida sigue sin cambios. Las pruebas ejercitan 12×1, 12×2 y 28×3, rutas largas, todos los comandos, ambos campos y errores.
- El aviso de OSC 52 dice `Enviado al portapapeles de la terminal (si no aparece, seleccioná el texto)`. Se conserva el aviso de error y el texto seleccionable. La prueba nativa de Bubble Tea sigue comprobando los bytes OSC 52, no una entrega al portapapeles imposible de confirmar.
- Solo se admite la línea exacta `@AGENTS.md`, fuera de fences y comentarios. LF, CRLF y EOF sin salto final son inequívocos y se admiten. `@./AGENTS.md` se rechaza deliberadamente: no se amplía el contrato con normalización de alias. Tampoco se admiten otro directorio, texto o espacios adicionales, código inline, ejemplos fenced ni CR aislado.
- Los casos no admitidos conservan sus bytes y reciben el bloque marcado canónico. La desinstalación no se modificó: las 18 variantes verifican conservación del contenido original, permisos y una regla agregada después de instalar.

## Evidencia test-first

Los comandos Go se ejecutaron desde `product/tower/v1/tui`, con `GOCACHE=$(mktemp -d) GOTELEMETRY=off` para evitar escrituras de caché/telemetría en el HOME real. Bun usó siempre `HOME=$(mktemp -d)` desde la raíz. Las instalaciones ejecutadas fueron fixtures aisladas de pruebas, no instalaciones del agente.

| Corrección | RED observado | GREEN observado |
| --- | --- | --- |
| Foco Radar | `GOCACHE=$(mktemp -d) GOTELEMETRY=off GOWORK=off GOPROXY=off go test ./... -run TestRadarFocusOnSmallTerminals -count=1`: fallaron los cinco subcasos por selección/entrada ocultas. | Mismo comando: pasó. |
| Portapapeles | `GOCACHE=$(mktemp -d) GOTELEMETRY=off GOWORK=off GOPROXY=off go test ./... -run TestProjectPromptClipboard -count=1`: fallaron wide/narrow y el aviso directo porque aún decía `Copiado`. | Mismo comando: pasó, incluidos error, reapertura y respuesta tardía. |
| Import | `HOME=$(mktemp -d) bun test product/tower/v1/test/adoption.test.mjs -t 'S206 CLAUDE import admission'`: 11 pasados, 7 fallos (fences, comentario y CR aislado). | Mismo comando: 18 pasados, 0 fallos, 216 aserciones. |

Triangulación: fences de backticks y tildes, distinta longitud, indentados/no cerrados; import real después de ejemplo o comentario; LF/CRLF/EOF; alias, otro directorio, espacios, texto extra, código inline; eliminación quirúrgica con ediciones posteriores. Tests de TUI verifican apertura, PgDown, navegación, resize, errores y backspace; se conservan los tests previos de límites y ejecución nativa.

## Validación completa

- `cd product/tower/v1/tui && GOCACHE=$(mktemp -d) GOTELEMETRY=off GOWORK=off GOPROXY=off go test ./...`: exit 0, un paquete, 48 funciones de test (sin contar TestMain; ningún t.Skip).
- `HOME=$(mktemp -d) bun test product/tower/v1`: exit 0; 521 pasados, 1 omitido (`optional real tiny Go cross-build`), 0 fallos; 8379 aserciones, 14 archivos.
- `git diff --check`: exit 0 antes y después de crear el registro.

## Foco de revisión y límites

Verificar el foco con terminal mínimo y texto envuelto; la emisión OSC 52 sin afirmar entrega; la admisión conservadora sin normalizar el texto del usuario. Un fence/comentario no cerrado del usuario se conserva sin intentar repararlo. No se implementó migración de journals históricos que hubieran omitido el bloque por el antiguo detector ambiguo: su validación recalcula el snapshot con la admisión actual y podría rechazarlos. Revisar ese límite si se exige compatibilidad con tales adopciones anteriores; no se alteró ni aflojó la validación del journal.
