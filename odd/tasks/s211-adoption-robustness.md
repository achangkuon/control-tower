# S211 — Adopción robusta y reversible

## Contrato y límites

Autoridad: `radar sesion S211` (consultado sin leer el plan completo). Base: `master` limpio al iniciar, `dafbaed`. Sin commits, push ni adopción de proyectos reales. Todas las pruebas usan proyectos descartables y HOME aislado.

## Observación → decisión → desarrollo

- El snapshot sigue rechazando enlaces en general. La adopción admite exclusivamente `.claude/skills -> ../.agents/skills`: comprueba el destino literal, propietarios, componentes reales y resolución dentro del proyecto. El journal registra `sharedSkills`; sólo captura/escribe la copia física de `.agents`, y rechaza cambios de disposición antes de actualizar o desinstalar.
- Los permisos se inspeccionan sobre destinos, sus árboles y ancestros necesarios (incluidos el journal, instrucciones y exclude de Git), nunca sobre skills vecinas. El rechazo enumera todos los comandos `chmod go-w`. La reparación explícita usa descriptores no-follow, valida identidad/propiedad antes del primer chmod y conserva los permisos corregidos como baseline original. Se reutiliza el enfoque y la redacción de S205.
- Git resuelve `--git-common-dir`; el journal guarda snapshots separados de `info/exclude` y el bloque exacto añadido. Las líneas manuales existentes no se duplican ni pasan a ser propiedad de la Torre. Desinstalar retira únicamente el bloque registrado, conservando bytes originales y ediciones posteriores. Los journals anteriores se admiten y se amplían al actualizar.
- La admisión CLI precede cualquier preparación/publicación del registro. `--fix-permissions` es único, sin valor y exclusivo de project init/update (además de sus usos globales previos).

## Evidencia test-first

RED observado:

```sh
HOME=/tmp/tmp.sc6bR8EaHU bun test product/tower/v1/test/adoption.test.mjs product/tower/v1/test/cli.test.mjs --test-name-pattern S211
```

Antes de implementar: **5 pass, 3 fail**. Los fallos exigían el mensaje accionable en API/CLI y las exclusiones locales; se recibió `Unsafe project file snapshot or filesystem entry` y exclude permaneció sin el bloque.

GREEN y triangulación:

```sh
HOME=/tmp/tmp.sc6bR8EaHU bun test product/tower/v1/test/adoption.test.mjs product/tower/v1/test/project-files.test.mjs product/tower/v1/test/cli.test.mjs --test-name-pattern S211
```

**13 pass, 0 fail**. Incluye enlace + modos 775/664, init con reparación, doctor, update, uninstall, enlaces absolutos/externos/alternativos/chains, propiedad ajena, shell quoting, hermanos intactos, exclude idempotente, bytes binarios originales y posteriores, marcador modificado, journal antiguo con exclusión manual y Git common-dir de worktree.

La suite amplia inicialmente detectó fixtures heredando umask 002, mocks de CLI con rutas ficticias y marcadores Git incompletos. Se normalizaron los fixtures, sin relajar la política de adopción. También se corrigió el snapshot instalado de un exclude originalmente ausente: sus ancestros ya no figuran como ausentes.

Validación enfocada de esa regresión:

```sh
HOME=/tmp/tmp.sc6bR8EaHU bun test product/tower/v1/test/global.test.mjs --test-name-pattern 'S208|S196'
```

**3 pass, 0 fail**.

## Superficies adicionales esenciales

Autorización del encargo: otros archivos de `product/tower/` si son esenciales, informándolos.

- `product/tower/v1/benchmark.mjs`: solicita reparación únicamente para el fixture nuevo descartable; actualiza el comentario sobre instrucciones públicas versus internals excluidos.
- `product/tower/v1/test/global.test.mjs`: umask aislado y estructura Git mínima válida para consultar common-dir.
- `product/tower/v1/test/projects.test.mjs`: umask aislado en fixtures.

## Mensaje exacto

```text
Tower project: Permisos inseguros: estas rutas permiten escritura de grupo u otros.
- <ruta>
  chmod go-w '<ruta>'
Corregí los permisos y volvé a intentar, o ejecutá el mismo comando con --fix-permissions.
```

Una pareja ruta/comando por ruta propia insegura, con escape shell de comillas simples. Confirmación de reparación: `Permisos corregidos (sólo go-w):` seguida de la lista de rutas.

## Operación real (sólo para el operador)

Con el runtime que incluya S211:

```sh
torre-control project init --project /home/<usuario>/projects/proyecto-beta/Main --trust trusted --fix-permissions
```

No se ejecutó sobre proyecto-beta. No se tocó HOME real ni el exclude del checkout de control-tower.

## Validación final y entrega

- `HOME=/tmp/tmp.sc6bR8EaHU bun test product/tower/v1`: **552 pass, 1 skip, 0 fail**, 553 tests / 14 archivos, 8726 assertions, 152.31 s (revalidado después de agregar la verificación explícita de resolución de la skill). El skip es el cross-build Go opcional preexistente.
- `docs/architecture/piloto-automatico.md` apareció como untracked durante el trabajo; es ajeno a S211 y quedó intacto.
- El HOME temporal se reutilizó entre validaciones. El escritor tiene prohibido ejecutar borrados; su limpieza queda al controlador padre. Los fixtures propios de la suite se limpian en sus finally.
- Como la adopción anterior, la transacción protege fallos de ejecución; no promete atomicidad ante apagados o escritores concurrentes. Un bloque marcado no perteneciente al journal se rechaza; no se comparte propiedad entre adopciones simultáneas de distintos worktrees con el mismo common-dir.
