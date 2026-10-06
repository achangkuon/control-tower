# Feature: S203 — Prender y apagar el piloto por proyecto

Autoridad: Emilio 2026-10-02 (interruptor por proyecto con V2); reencuadre 2026-10-04 al diseño
de Piloto automático (P9, P14). Encargo completo en `openspec/plan.yaml` (S203). Zona
producto-torre, prioridad v2-piloto. depende_de: S215 (✅ entregada).

## Alcance
Desde el detalle de un proyecto adoptado (instalador/TUI) se prende o apaga el piloto para ese
proyecto; el estado del modo se ve en la lista de proyectos y en los controles del piloto de la
TUI (S216). Apagar no borra NOVEDAD ni POR REVISAR (P9). La TUI llama a `piloto` (S215) y no
mantiene estado propio (P14); el freno de emergencia es una acción aparte y no se confunde con
apagar el modo. El interruptor vive con `piloto` en el directorio común de Git (P14).

## Tareas
- [x] T1: Preparar copia de trabajo del writer.
- [x] T2: Implementación test-first por writer (RED → GREEN → gofmt/vet).
- [x] T3: Verificación independiente del padre.
- [x] T4: Revisión RDD, integración a master, push y archivado de la Sesión.

## Evidencia de commits
- `541f08d`+`cc51442` TUI: acciones «Prender piloto»/«Apagar piloto» por proyecto vía seam S216, badge de estado fresco, nota P9 al apagar; `aae2787`+`2451648` instalador: pass-through delegante sin persistir estado.
- Expansión de superficie autorizada por el maintainer (2026-10-06): projects_test.go y test/projects.test.mjs (los tests de los archivos declarados no estaban en el plan).
- TDD: RED observado por grupo (build failure TUI, export faltante en Bun); GREEN: TUI 75 tests, projects 50, cli 108; gofmt/vet limpios.
- Revisión `review-4fb0df45f18b6b12` (medium, reliability) APPROVED a la primera, acuse quemado (781c64ca…); advisory R3-001 WARNING projects.go:220-221 (trabajo posterior).
- Pendiente registrado: cableado de `pilotoRegisteredProject` en cli.mjs (fuera de superficies; el camino instalador queda a nivel librería + TUI).
