# S207 — La actualización también renueva la interfaz

## Autoridad y alcance

Contrato leído con `radar sesion S207` sobre `master` limpio; no se leyó el plan completo. Cambios en release, release-build, CLI y sus tests, más `tui/wizard.go` y `tui/wizard_test.go` preaprobados para el aviso. Sin staging, commit, push ni publicación. Las pruebas usan HOME descartable y runners inyectados, sin GitHub real.

## Resultado y límites

- Cada binario publicado lleva su `.sha256` separado, modo 0644, con formato exacto `<sha>  <asset>\n`.
- `install/update --latest` renueva la interfaz después del éxito del motor, incluso cuando éste devuelve `up-to-date`. Usa el mismo tag descubierto, plataforma linux/darwin y arquitectura x64→amd64/arm64 del instalador. No vuelve a descargar el paquete del motor.
- Sólo omite descargar el binario si `current.json` señala exactamente esa plataforma/digest/ruta y el archivo sigue verificado con modo 0755. Publica bytes verificados en `tui/<sha>/torre-tui`, relee el binario y reemplaza el puntero por rename atómico. Conserva todos los binarios previos.
- Resultado independiente `tui: updated | unchanged | unavailable:<reason>`. Releases antiguas sin assets y fallas de descarga no hacen fallar el motor. Huella malformada, mismatch y rutas inseguras preservan el puntero anterior; mismatch explica en español que el motor sigue actualizado.
- `--from-checkout` solicita `--tui-out-dir` al builder y verifica checksum y binario locales por el mismo camino. La opción interna `allowTuiFailure` permite continuar con el motor si no hay fuentes/módulos Go locales para la interfaz; no requiere un instalador ni pins publicados. Los builds de publicación siguen exigiendo éxito de TUI.
- El wizard S199 conserva sus pasos y argumentos. Tras éxito con `tui: updated`, muestra «Volvé a abrir torre-control para ver la nueva interfaz».
- `install.mjs` permanece standalone y fuera del roster del envelope: importar su función desde el motor rompería el layout cerrado/histórico. Se reproducen sus guardas no-follow, propiedad, permisos, tamaño y enlaces duros en release.mjs; no se amplía el roster ni se cambian dependencias. El modo manual con digest independiente sigue igual.
- Un binario ausente se repone; uno existente alterado se rechaza, como en el instalador, sin sobrescribir evidencia ajena ni afirmar `unchanged`.

## TDD y validación observada

- RED: `HOME=$(mktemp -d) bun test product/tower/v1/test/cli.test.mjs product/tower/v1/test/release-build.test.mjs` → **176 pass, 1 skip, 7 fail**. Faltaban resultado/puntero TUI, checksum publicado, intento de checksum con motor al día y salida local.
- RED Go: `cd product/tower/v1/tui && GOCACHE=$(mktemp -d) GOWORK=off GOPROXY=off go test ./... -run TestUpdatedInterfaceReopenMessage` → fallo esperado en activated y up-to-date por aviso ausente.
- GREEN enfocado: `HOME=$(mktemp -d) bun test product/tower/v1/test/release.test.mjs product/tower/v1/test/cli.test.mjs product/tower/v1/test/release-build.test.mjs` → **202 pass, 1 skip, 0 fail**, 2.260 assertions.
- Triangulación: cuatro plataformas, checksum estricto (incluye aliases ASCII de bit alto), binario ausente/alterado, symlinks/hardlinks/permisos, engine fallido sin adquisición TUI, release antigua, mismatch con engine activo, checkout real con builder Go inyectado y reapertura ejecutando el binario nuevo.
- Checkout heredado sin TUI ni instalador: `HOME=$(mktemp -d) bun test product/tower/v1/test/release-build.test.mjs --test-name-pattern 'S207 legacy'` → **1 pass, 0 fail**, 4 assertions; no invoca Go y conserva la verificación del motor.
- Suite completa: `HOME=$(mktemp -d) bun test product/tower/v1` → **503 pass, 1 skip, 0 fail**, 8.163 assertions; 504 tests en 14 archivos. La última ejecución acotó stdout con `tail -n 12` y `pipefail`. Skip preexistente: cross-build Go real opcional.
- Go: `cd product/tower/v1/tui && GOCACHE=$(mktemp -d) GOTELEMETRY=off GOWORK=off GOPROXY=off go test ./...` → **1 paquete OK, 0 fail**. Cache descartable para evitar escrituras en HOME real.
- `git diff --check`: sin errores; sólo los ocho archivos de implementación/tests y este registro aparecen modificados.

## Próxima publicación y reversión

El mantenedor debe subir juntos `tower-v1.json`, `tower-v1.json.sha256`, el nuevo `torre-install.mjs` estampado, y **los cuatro binarios más sus cuatro checksums**: `torre-tui-{linux,darwin}-{amd64,arm64}` y cada nombre con sufijo `.sha256` (11 assets en total). Construir desde el commit limpio revisado con `--tag`, `--installer-out` y `--tui-out-dir`; no reutilizar el instalador ni checksums viejos. Ningún asset fue publicado en esta tarea.

Implementación validada, pendiente de revisión y acciones Git del controlador. Reversión acotada a esta unidad: release/release-build/cli, sus tres tests, wizard y su test, y este registro; sin migraciones ni eliminación de versiones instaladas.
