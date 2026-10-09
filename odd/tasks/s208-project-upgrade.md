# S208 — Actualización reversible de proyectos adoptados

## Contrato

Autoridad: `radar sesion S208`, consultado antes de implementar. ODD nativo; sin commit ni push. No se modifican HOME ni proyectos reales.

Al activar una release, actualizar Radar (incluido vendor) y las dos copias de la skill control-tower únicamente si las piezas instaladas coinciden exactamente con el diario. Mantener `original` intacto. Una copia antigua intacta es `outdated`; las alteraciones siguen siendo inválidas y se omiten con `skipped:drift`. Ofrecer actualización individual y etiquetas humanas para versiones locales o desconocidas.

## Implementación

- `adoption.mjs`: diagnóstico separado de la comparación contra el bundle actual; actualización de targets, instrucciones y diario con readback y compensación. La compensación evita reescribir destinos que ya coinciden. No ofrece garantía de recuperación ante corte de energía ni aislamiento frente a escritores concurrentes, igual que la adopción existente.
- `global.mjs` / `projects.mjs`: refresco por proyecto desde la raíz de la release verificada recién activada. No reutiliza el bundle del proceso que inició la actualización. Los errores de un proyecto no revierten la activación global.
- `cli.mjs`: `torre-control project update --project <ruta-absoluta>`; el atajo `update --latest` sin descarga también refresca proyectos registrados. `status` conserva `towerState` en la proyección para que la TUI reciba el estado real del plan.
- TUI: naranja para proyectos desactualizados, sin comandos de Radar, con una acción que explica cómo actualizar. `checkout-*` → `versión local de prueba`; sin tag → `versión desconocida`, también en diagnóstico, confirmación y resultado.
- Superficies adicionales esenciales preaprobadas: `product/tower/v1/cli.mjs`, `product/tower/v1/tui/wizard.go`, `product/tower/v1/tui/wizard_test.go`.

## Evidencia test-first

RED observado:

- `HOME=$(mktemp -d) bun test product/tower/v1/test/global.test.mjs -t S208`: falla con `Invalid Tower adoption: installed journal snapshot` al diagnosticar la fixture antigua sin vendor.
- Go focalizado `-run TestS208`: fallan las etiquetas por mostrar checkout/hash y la lista por no ofrecer actualización.
- Triangulación adicional de `status`: RED porque la proyección eliminaba `towerState: active`; GREEN tras conservar el campo opcional. Se repitió la suite Bun completa después de esa corrección.

GREEN focalizado:

- `HOME=$(mktemp -d) bun test product/tower/v1/test/global.test.mjs -t 'S208|S196'`: 2 pasan, 0 fallan.
- Go focalizado `-run TestS208`: pasa.
- Triangulación posterior global `-t S208`: 2 pasan, 0 fallan. Prueba la forma del bundle de 30 miembros, skill antigua, diario sin instrucciones, actualización v1.2.2, restauración binaria exacta, comando público individual, atajo latest y selección del nuevo recibo.
- Se agregaron casos de drift sin escritura y compensación por fallo tardío; se mantienen pruebas de seguridad de rutas y modos.

Validación completa inicial: Bun 524 pasan, 1 omitido, 2 fallan (una expectativa anterior de `invalid` y un timeout del test agrupado de corrupción); Go detectó expectativas anteriores de hashes. Se corrigieron las expectativas afectadas. El test agrupado pasó solo en 4.64 s, sin cambiar su timeout.

Go usa HOME y GOCACHE desechables, GOENV y telemetría desactivados, GOPROXY=off y el cache de módulos existente como entrada; HOME vacío sin ese cache no puede resolver las dependencias offline.

## Reparación de torre-demo

La siguiente instalación/actualización con esta implementación comprobará los archivos contra `state.installed`. Si siguen intactos, copiará las piezas actuales, añadirá vendor, actualizará el diario y reportará `upgraded`. `original` queda igual para la desinstalación. Si hubo cambios del usuario, quedará sin tocar y se reportará `skipped:drift`. No se ejecutó ninguna reparación en torre-demo.

## Cierre

Validación completa final, ejecutada en serie:

- `HOME=$(mktemp -d) bun test product/tower/v1`: **527 pasan, 1 omitido, 0 fallan**, 528 tests en 14 archivos; 8443 assertions. El omitido es el cross-build Go opcional existente.
- `cd product/tower/v1/tui && HOME=$(mktemp -d) GOCACHE=$(mktemp -d) GOMODCACHE=/home/<usuario>/go/pkg/mod GOENV=off GOTELEMETRY=off GOWORK=off GOPROXY=off go test ./...`: **1 paquete pasa, 0 fallan**. Los overrides aíslan las escrituras fuera de HOME real manteniendo la ejecución offline solicitada.
- `git diff --check`: sin errores.

Commit y revisión pertenecen al responsable de la transacción; esta implementación no los ejecuta.
