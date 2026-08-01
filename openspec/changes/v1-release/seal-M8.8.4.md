# Contrato sellado — M8.8.4

> **READY — DISPATCHABLE**
>
> Contrato de cero decisiones para `M8.8.4` únicamente. El implementador debe detenerse y
> reportar cualquier pregunta, discrepancia o ruta no enumerada; no puede elegir ni reparar
> el contrato por su cuenta.

## Identidad

| Campo | Valor |
|---|---|
| Sesión | `S8.8` — Adopción del instalable |
| Módulo | `M8.8.4` — Complete executable runtime payload |
| Repositorio | `control-tower` |
| Base exacta | `master@b72e450021fc34315e2392758f1b29aa9426f686` |
| Rama a crear | `fix/installable-v1/m8-8-4-runtime-payload` |
| Worktree | nuevo, propio y exclusivo, derivado exactamente de la base |
| Modo | autónomo, sin Torre de Control |
| Runner | `bun` |

M8.8.4 es una única frontera de PR y debe completarse antes de reanudar el corte atendido
`M8.8.3`. `M8.8.2` sigue siendo estado atendido y no se marca como completo por este sello.

## Área cerrada

El diff de implementación sólo puede contener exactamente estos cuatro caminos:

```text
install/**
test/install/**
bin/torre
scripts/publish-runtime.mjs
```

El implementador no puede crear, modificar ni eliminar ninguna otra ruta. En particular,
`core.mjs`, `mcp.mjs`, `package.json` y `bun.lock` deben permanecer byte a byte sin cambios.
No se toca `STATUS.md`, `master-index`, `design.md`, `seal-S8.7.md` ni ningún otro archivo de
`openspec/**`.

## Frontera estricta de no mutación real

Todos los tests y harnesses deben usar exclusivamente `HOME`, XDG, Git y data-root temporales.
Está prohibido leer o escribir, incluso para medirlos:

```text
~/.config/opencode/control-tower/
~/.config/opencode/control-tower/backup/**
~/.local/share/control-tower/
.git/control-tower/**
~/.hermes/**
```

No ejecutar instalación, rollback, cutover o activación reales. El runtime incompleto instalado
desde `b72e450` conserva sus bytes como evidencia histórica; no se repara in-place, no se
reescribe y no se borra.

## Contrato de payload y validación

La closure ejecutable canónica contiene exactamente estos cinco archivos regulares, sin symlinks:

```text
bin/torre
core.mjs
install/lifecycle.mjs
install/active-pointer.mjs
install/version-store.mjs
```

El publisher y el lifecycle consumen un único allowlist/validator explícito ubicado bajo
`install/**`. Rechaza miembros faltantes, extra, symlinks, traversal, checkout copies,
`node_modules` y secretos antes de publicar o activar. Un payload parcial, incluido el payload
histórico incompleto de `b72e450`, es `unhealthy` y no puede activarse ni ser destino de rollback.
La validación y el reemplazo son atómicos: un rechazo no deja versión parcial ni mueve el puntero.
Una replacement completa activa; las versiones existentes siguen inmutables y el puntero sigue
siendo atómico. Los errores de payload incompleto son estables.

`bin/torre` resuelve `core.mjs` relativo a la versión instalada por defecto. El único escape
permitido es el override explícito `CONTROL_TOWER_CORE`; no hay lectura implícita del checkout
legacy. La resolución relativa del lifecycle se conserva.

## Tareas — Strict TDD, orden exacto

1. **T8.8.4.1 RED** — `test/install/runtime-payload.test.mjs`: exigir los cinco archivos exactos y rechazar missing, extra, symlink, traversal, checkout copy, `node_modules` y secretos.
2. **T8.8.4.2 GREEN** — implementar el único allowlist/validator bajo `install/**` y consumirlo desde publisher y lifecycle.
3. **T8.8.4.3 REFACTOR** — conservar inmutabilidad, puntero atómico, rechazo de payload incompleto y errores estables; preservar intactos los bytes incompletos de `b72e450`.
4. **T8.8.4.4 RED** — el harness instalado temporal cubre exactamente `on`, `off`, `status`, `log`, `unlock` y `reset` sin runtime legacy.
5. **T8.8.4.5 GREEN** — `bin/torre` resuelve el core relativo a la versión instalada y conserva `CONTROL_TOWER_CORE` explícito.
6. **T8.8.4.6 REFACTOR** — eliminar lecturas legacy implícitas y preservar resolución relativa del lifecycle.

No se inventan tareas, compatibilidad, rutas, comandos ni decisiones adicionales.

## Aceptación binaria

- [ ] Closure publicada y validada: exactamente los cinco archivos, todos regulares, sin extra, checkout copy, `node_modules` ni secretos.
- [ ] Harness aislado de seis comandos pasa usando sólo HOME/XDG/Git/data-root temporales.
- [ ] Payload incompleto `b72e450` es unhealthy, no puede activar ni rollback, permanece immutable y no recibe repair in-place.
- [ ] Symlink, traversal y partial payload rechazan atómicamente; replacement completa activa.
- [ ] No hay lectura legacy implícita; el core instalado relativo es default y `CONTROL_TOWER_CORE` sigue siendo override explícito.
- [ ] `core.mjs`, `mcp.mjs`, `package.json` y `bun.lock` no cambian.
- [ ] `bun install`, focused tests, `bun test test/install`, `bun test` y diff-check pasan según la verificación exacta.

## Verificación exacta — una sola vez al final

Los normalizadores mutantes terminan antes de esta verificación. No se ejecuta ahora; pertenece
al implementador después de completar las seis tareas.

```sh
bun install
bun test test/install/runtime-payload.test.mjs
bun test test/install
bun test
git diff --name-only b72e450021fc34315e2392758f1b29aa9426f686...HEAD
```

El test nuevo debe existir con el nombre exacto `test/install/runtime-payload.test.mjs` (puede
acompañarse sólo de focused tests adicionales dentro de `test/install/**`). La salida de `bun
test` debe conservar el baseline autoritativo de `433 pass / 0 fail`; el número de tests puede
aumentar por este Módulo, pero los fallos deben ser exactamente cero. El diff-check sólo puede
devolver rutas bajo `install/**`, `test/install/**`, `bin/torre` y `scripts/publish-runtime.mjs`.

## Qué hacer ante una pregunta

Detenerse y reportar el identificador exacto de la decisión o discrepancia. Nunca adivinar,
ampliar el Área, reparar el histórico incompleto, leer el runtime real ni continuar con una
tarea no enumerada. No se solicita respuesta durante la ejecución.

## Entrega futura

Después de pasar la verificación, la única entrega autorizada es commit y push de
`fix/installable-v1/m8-8-4-runtime-payload`. No merge, PR, release, deploy, staging adicional,
Tower ni actualización de `STATUS.md` u otros artefactos OpenSpec. El implementador no actualiza
el estado de S8.8.

## Prompt de lanzamiento

```text
opencode: lee completo openspec/changes/v1-release/seal-M8.8.4.md antes de actuar.
Implementa únicamente M8.8.4 desde master@b72e450021fc34315e2392758f1b29aa9426f686 en un
worktree nuevo y exclusivo, sobre la rama fix/installable-v1/m8-8-4-runtime-payload.
Ejecuta estrictamente T8.8.4.1 a T8.8.4.6 en orden RED-GREEN-REFACTOR. El Área exclusiva es
install/**, test/install/**, bin/torre y scripts/publish-runtime.mjs; no toques core.mjs,
mcp.mjs, package.json, bun.lock, STATUS.md, master-index, design.md, seal-S8.7.md ni otra ruta.
Todos los tests usan HOME/XDG/Git/data-root temporales y no leen ni escriben el runtime real,
su backup, .git/control-tower/** o Hermes. El closure debe ser exactamente bin/torre, core.mjs,
install/lifecycle.mjs, install/active-pointer.mjs e install/version-store.mjs; el payload
incompleto b72e450 permanece immutable, unhealthy y rechazado para activate/rollback.
Corrección de alcance o reparación in-place no está autorizada. Ejecuta al final, una sola vez:
bun install; bun test test/install/runtime-payload.test.mjs; bun test test/install; bun test;
git diff --name-only b72e450021fc34315e2392758f1b29aa9426f686...HEAD. `bun test` debe tener cero
fallos y el diff sólo puede contener el Área. Si aparece cualquier pregunta, discrepancia, ruta
no enumerada o necesidad de leer/mutuar estado real, detente y reporta; nunca adivines. Luego de
verificación exitosa, sólo commit y push de la rama; no merge, PR, Tower ni STATUS/OpenSpec.
```
