# S149 — Semáforo ejecutable V1

## Autoridad y objetivo

S149 (Torre V1 › Release instalable › cimientos — La capa semáforo se distribuye como un ejecutable único que no exige bun instalado y conserva el contrato tower_* observable., LISTO). Emilio eligió extraer el semáforo a `semaphore.mjs`, aprobó siete archivos exactos y una excepción de tamaño para una sola unidad coherente (Engram 11555, 11564 y 11566; plan integrado en `817b1839e63bdccdcd3c4990e8351b2b0f13a89a`). El inicio de la implementación fue aprobado después de esa preparación. Esta continuidad técnica no crea autoridad de producto ni cambia el estado de Radar.

El resultado es un ejecutable independiente de Bun instalado, construido con `bun build --compile`, que sólo transporta la capa semáforo y conserva el contrato `tower_*`, la ubicación/formato de `ACTIVE` y `tower.db`, el comportamiento de locks y la API fuente de `core.mjs`. Debe fallar de forma explícita y tipada ante operaciones de continuation y declarar versión y revisión fuente. S8.12 se ocupa después del bundle y S8.13 de instalarlo; no activamos la Torre ni tocamos globals reales.

## Alcance y límites

Archivos exactos: `core.mjs`, `semaphore.mjs`, `bin/torre-semaphore.mjs`, `scripts/build-semaphore.mjs`, `test/semaphore-binary.test.mjs`, `install/runtime-payload.mjs` y este archivo. Todos están reservados como Cimientos exactos para S149. `install/runtime-payload.mjs` es el único cruce con S8.12/S8.13: sólo se regenera su lista de imports, en serie; no se edita manualmente ni se amplía el paquete V1 aquí. No se escriben `mcp.mjs`, `bin/torre`, `install.sh`, `package.json`, continuation, sus migraciones, sus tests ni los tests existentes del semáforo. Cualquier necesidad de otro archivo requiere aprobación humana y compatibilidad fresca antes de escribirlo.

**Ampliación de alcance (aprobada 2026-09-24, Engram `s149/fixture-scope-decision`):** Emilio aprobó exactamente dos Cimientos adicionales para cerrar el candidato — `test/identity.test.mjs` (sólo el fixture de mutación P4-A1c) y `test/install/runtime-payload.contract.mjs` (sólo el registro canónico de datos). `test/install/runtime-payload.test.mjs` sigue fuera de alcance y no se tocó.

Base de admisión: `817b1839e63bdccdcd3c4990e8351b2b0f13a89a`; SHA-256 exacto de `radar status --json`: `e179bd28b1ed34accfae88c6f805b4fdeaa4e34186a7fbaf5b34724140a0e60b`; SHA-256 exacto de `radar sesion S149`: `a12e27d27cc4676aa4192542499326605d493b7b1e9f2a2b527b8d3a82ab5e47`. Main estaba limpio; Intercom no mostró otra sesión Pi conectada. La escritura será serial, con un solo writer y sin adquirir ni afirmar un lock de otros worktrees.

TDD estricto habilitado por `openspec/config.yaml` (`strict_tdd: true`, `testing.test_command: bun test`) y por la política de proyecto. RED enfocado: `bun test test/semaphore-binary.test.mjs`; GREEN enfocado: el mismo comando. Suite completa: `bun test`. Primero se ejecutan los normalizadores mutantes aplicables; `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun scripts/payload-closure.mjs --write` es obligatorio antes de congelar el candidato, seguido por comprobaciones sobre esos bytes exactos. El test nuevo debe construir y ejecutar el binario en un repositorio temporal, sin tocar estado real.

Estrategia de entrega: una unidad coherente con excepción aprobada a la referencia de 400 líneas; una sola revisión de candidato. La entrega ordinaria aquí es commit convencional directo a `master` y push, pero requiere autorización humana explícita posterior. No hay PR ni permiso de release o instalación real. La excepción no permite reducir cobertura, ocultar el diff ni ampliar archivos.

## Tarea de implementación

- [x] **S149-1 — Extraer, compilar y comprobar el semáforo V1 como una unidad revertible.** Ruta: writer delegado `gentle-ai-worker` porque hay al menos cinco archivos fuente/test no triviales, más normalización generada. Se observó RED enfocado antes de fuente: `bun test test/semaphore-binary.test.mjs` exit 1, 0 pass/1 fail por build script ausente. Tras extraer, se observó GREEN enfocado: el mismo comando exit 0, 1 pass/50 assertions. El binario compilado se ejercitó sin Bun en PATH con dos agentes, mensaje, lock de entrega, transferencia/liberación, versión/revisión y error tipado por continuation; la declaración generada se normalizó con `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun scripts/payload-closure.mjs --write` (`updated`).

- [x] **S149-2 — Corregir los dos Cimientos ampliados y cerrar el candidato.** Ruta: writer delegado, misma unidad. RED confirmado en los dos archivos afectados antes de tocar fuente: `bun test test/identity.test.mjs test/install/runtime-payload.test.mjs` exit 1 — `test/identity.test.mjs` falló en "controlled mutations prove each dedicated reverse check is discriminating" (`Cannot find module './semaphore.mjs'` al importar la copia mutada de `core.mjs`); `test/install/runtime-payload.test.mjs` falló en "accepts exactly the packaged CLI and host runtime files" (el inventario generado trae `semaphore.mjs` y el registro canónico no). Corrección aplicada: en `test/identity.test.mjs` se agregó `copyFileSync` a los imports de `node:fs` y, antes de escribir la copia mutada de `core.mjs` en `mutationRoot`, se copia `semaphore.mjs` sin mutar junto a ella — la aserción de mutación sigue intacta, sigue detectando la mutación de `core.mjs`, y no se tocó ninguna aserción ni semántica de continuation. En `test/install/runtime-payload.contract.mjs` se agregó `"semaphore.mjs"` al arreglo `CANONICAL_RUNTIME_PAYLOAD`, en la misma posición ordenada que trae el inventario generado (entre `main-store/launch-consumer.mjs` y `workspace/seat-inventory.mjs`); `test/install/runtime-payload.test.mjs` no se editó. GREEN confirmado: `bun test test/identity.test.mjs test/install/runtime-payload.test.mjs test/semaphore-binary.test.mjs` exit 0, 64 pass/0 fail/642 expect() calls. La línea en blanco final de `core.mjs` se removió (el archivo ahora termina en `}\n` sin línea extra).

## Verificación final

- `bun test test/identity.test.mjs test/install/runtime-payload.test.mjs test/semaphore-binary.test.mjs`: exit 0, 64 pass/0 fail/642 expect() calls.
- `bun test` (suite completa): exit 0, **1488 pass/0 fail/7310 expect() calls**, 105 archivos, 142.84s.
- `git diff --check`: exit 0, sin salida.
- `radar check`: exit 0, **0 error(es), 37 aviso(s)**. Los avisos son preexistentes (citas Engram de S143–S146/S151–S153 que viven fuera de Git) más cinco avisos "rutas reales" esperados para los archivos nuevos de S149, que aún no están agregados al índice — no bloquean, no se ejecutó `git add`.
- `git status --short`: `core.mjs`, `install/runtime-payload.mjs`, `test/identity.test.mjs` y `test/install/runtime-payload.contract.mjs` modificados; `bin/torre-semaphore.mjs`, `odd/tasks/s149-semaphore.md`, `scripts/build-semaphore.mjs`, `semaphore.mjs` y `test/semaphore-binary.test.mjs` sin seguimiento. No hay stage, commit ni push — la escritura del writer se detiene aquí.

## Estado y próximo paso

`S149-1` y `S149-2` completos con evidencia observada; la suite completa y `git diff --check` pasan. No hay commit, push ni revisión del candidato final — esa decisión queda para el responsable de la Sesión, junto con la entrega ordinaria (commit convencional directo a `master` + push) que este archivo no autoriza por sí solo.
