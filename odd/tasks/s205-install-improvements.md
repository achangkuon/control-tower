# S205 — Mejoras de instalación

## Autoridad y alcance

Contrato leído con `radar sesion S205` sobre `master` limpio en `03c0db4`; no se leyó el plan completo. Sólo se modificaron los seis archivos autorizados de `product/tower/v1/` y este registro. Sin commit, staging ni push; HOME real intacto.

## Resultado

- `safe()` conserva exactamente su regla. El preflight reúne las rutas propias con go-w dentro de HOME y lista comandos `chmod go-w` correctamente entrecomillados; enlaces peligrosos, propietarios ajenos y archivos con enlaces duros siguen rechazándose sin reparación.
- `--fix-permissions` admite install/update manual, latest y checkout. Antes de probes, descargas, builds o creación de padres, valida todos los descriptores no-follow y quita sólo go-w. Informa las rutas en stderr y vuelve a ejecutar el preflight normal; el JSON exitoso incluye `permissionsChanged`. Sin bandera, no cambia permisos existentes.
- Sólo se inspeccionan destinos y ancestros seleccionados: hermanos ajenos quedan intactos, igual que rutas fuera de HOME. El store global se limita al layout cerrado y rechaza entradas desconocidas antes de reparar.
- Una procedencia publicada verificada con digest idéntico promueve una procedencia `checkout-*`: reemplazo atómico con modo 0400, estado y journal actualizados, active/previous preservados, resultado `promoted` con tag. No reconstruye Radar ni reinstala recursos runtime. Otros conflictos permanecen; digest diferente crea una versión distinta, nunca relabela la anterior.
- Se conserva la compensación transaccional de estado/procedencia; después de promover la versión activa, `update --latest` devuelve `up-to-date` sin descargar el paquete.

## Evidencia TDD y validación

Comando enfocado: `HOME=$(mktemp -d) bun test product/tower/v1/test/runtime-config.test.mjs product/tower/v1/test/global.test.mjs product/tower/v1/test/cli.test.mjs --test-name-pattern S205`.

- RED inicial: 4 pass, 5 fail. Fallaron lista múltiple/comandos, reparación explícita, bandera CLI y promoción global/latest con conflicto de procedencia.
- GREEN inicial: 9 pass, 0 fail.
- Triangulación RED: 17 pass, 2 fail; faltaba informar reparaciones antes de rechazar settings y rechazar entradas globales desconocidas antes de chmod. GREEN final: 20 pass, 0 fail, 218 assertions.
- Casos adicionales: HOME writable, destinos globales, hermanos ajenos, rutas externas, reemplazo por symlink durante open, hardlinks, install con promoción sin rebuild, checkout→checkout y compensación en cuatro límites transaccionales.
- `HOME=$(mktemp -d) bun test product/tower/v1`: **489 pass, 1 skip, 0 fail**, 7.876 assertions, 490 tests en 14 archivos. Skip preexistente: cross-build Go pequeño opcional; los builds Radar reales offline pasaron.
- `git diff --check`: sin errores.

## Ejemplo exacto del error CLI

```text
Invalid Tower CLI: Tower runtime: Permisos inseguros: estas rutas permiten escritura de grupo u otros.
- /tmp/s205-home/.claude
  chmod go-w '/tmp/s205-home/.claude'
- /tmp/s205-home/.claude/settings.json
  chmod go-w '/tmp/s205-home/.claude/settings.json'
Corregí los permisos y volvé a intentar, o ejecutá el mismo comando con --fix-permissions.
```

## Entrega y reversión

Implementación validada, pendiente de revisión y acciones Git del controlador. Reversión acotada: esta unidad en runtime-config/global/cli, sus tres tests y este registro; sin migración de dependencias ni cambios en otros archivos. La reparación explícita de permisos persiste si el preflight posterior rechaza otra condición, y se informa antes de ese rechazo.
