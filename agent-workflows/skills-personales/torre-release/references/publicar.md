# Publicar una release de la Torre

Ejecuta las fases en orden; un control fallido detiene la secuencia. Usa bash con `set -euo pipefail` para estos bloques y conserva los códigos de salida; no continúes después de un `test` fallido. Estas instrucciones no conceden permisos. Resuelve `<TAG>`, `<COMMIT>` (OID completo), `<DIR>` absoluto externo y `<ID>` antes de ejecutar; no publiques marcadores. Revalida las citas contra el commit elegido.

## 1. Autorización y alcance

Obtén permiso explícito para publicar y, separadamente, para push y para actualizar la máquina del mantenedor. Registra si la última autorización falta: no impide preparar una release, pero prohíbe la actualización real. La revisión nativa es evidencia, nunca autorización de entrega.

Fija tag nuevo e inmutable y commit entregado. No hay campo de versión de producto que incrementar: `package.json:1-8` no declara `version`; la identidad publicada se fija con `--tag` y los pins del instalador (`product/tower/v1/release-build.mjs:134-143`). No confundas `metadata.version` de una skill con ese tag.

```bash
git status --short
git rev-parse '<COMMIT>^{commit}'
git ls-remote origin refs/heads/master
git ls-remote --tags origin 'refs/tags/<TAG>' 'refs/tags/<TAG>^{}'
```

**Verificación:** registra SHA completo y rama destino; exige tag remoto ausente y commit subido. Si ya existe el tag, detente; no lo reutilices para contenido nuevo. No presupongas que HEAD de este worktree es el commit de release ni operes sobre un checkout usado por otro agente sin coordinarlo.

## 2. Auditar qué viaja

Lee `product/tower/v1/bundle.mjs:7-76`: roster explícito de Radar/vendor, skills V1, plantillas y firmas. Añade sólo los módulos del motor declarados por `product/tower/v1/release-build.mjs:19-21`: `adoption`, `bundle`, `project-files`, `bootstrap`, `release`, `global`, `projects`, `cli`, `runtime-config`, `release-build`.

El instalador se lee por separado; TUI se exporta desde el mismo commit y se compila para linux/darwin × amd64/arm64 (`product/tower/v1/release-build.mjs:146-192`, `product/tower/v1/release-build.mjs:221`, `product/tower/v1/release-build.mjs:257-267`). No introduzcas skills diferidas o personales, docs, tests ni archivos encontrados por traversal en el paquete.

```bash
git show '<COMMIT>:product/tower/v1/bundle.mjs'
git show '<COMMIT>:product/tower/v1/release-build.mjs'
git show '<COMMIT>:product/tower/v1/install.mjs'
git ls-tree -r '<COMMIT>' -- product/tower/v1/tui
```

**Verificación:** reconcilia roster con `product/tower/v1/bootstrap.mjs:9-13` y guardas standalone de `product/tower/v1/install.mjs:41-69`; confirma que el instalador y los binarios son assets separados, no miembros del envelope (`README.md:190-198`).

## 3. Controles y cierre

1. Ejecuta primero tests afectados y luego los controles completos siguientes. Sustituye `<SANDBOX>` por una raíz nueva, absoluta y externa al checkout; nunca HOME real. Registra códigos de salida y omisiones. La suite raíz es `bun test` (`package.json:5-7`); Radar documenta Go (`agent-workflows/tools/radar/README.md:94`), TUI registra Go offline (`odd/tasks/s207-tui-update.md:26`) y agent-workflows documenta Python/Bun (`agent-workflows/README.md:187-194`).

```bash
umask 077
mkdir -p <SANDBOX>/{home,tmp,cache,config,data,state}
export HOME=<SANDBOX>/home TMPDIR=<SANDBOX>/tmp
export XDG_CACHE_HOME=<SANDBOX>/cache XDG_CONFIG_HOME=<SANDBOX>/config
export XDG_DATA_HOME=<SANDBOX>/data XDG_STATE_HOME=<SANDBOX>/state
HOME=<SANDBOX>/home bun test product/tower/v1
HOME=<SANDBOX>/home bun run test
(cd agent-workflows/tools/radar && HOME=<SANDBOX>/home GOCACHE=<SANDBOX>/cache/radar GOENV=off GOTELEMETRY=off GOWORK=off GOPROXY=off GOSUMDB=off GOTOOLCHAIN=local GOFLAGS=-mod=vendor go test ./...)
(cd product/tower/v1/tui && HOME=<SANDBOX>/home GOCACHE=<SANDBOX>/cache/tui GOMODCACHE=/home/emili/go/pkg/mod GOENV=off GOTELEMETRY=off GOWORK=off GOPROXY=off GOSUMDB=off GOTOOLCHAIN=local GOFLAGS=-mod=readonly go test ./...)
# Añade ambos controles si cambiaron skills o install.py:
(cd agent-workflows && HOME=<SANDBOX>/home PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -q)
HOME=<SANDBOX>/home bun test agent-workflows
```
2. Completa y reconoce la revisión nativa aplicable sobre los bytes finales. No uses su resultado para autorizar push ni publicación.
3. Para cada Sesión entregada, verifica `entrega.commit` integrado mediante `radar sesion <ID>`. El cierre exige ese commit antes de archivar (`agent-workflows/tools/radar/README.md:33-36`). Sólo con alcance de cierre autorizado:

```bash
radar sesion <ID>
radar archivar <ID>
radar check
radar render
```

4. Reconcilia README, arquitectura y vista generada; conserva las notas de tests y review. Entrega también el cierre mediante el flujo Git autorizado y vuelve a fijar `<COMMIT>` después; no construyas mientras haya cambios de cierre sin confirmar/subir.
5. Revisa el gate real de pre-push: para `refs/heads/master` exige HEAD limpio igual al SHA que se empuja y ejecuta `bun run test` (`.githooks/pre-push:28-44`, `.githooks/pre-push:81-98`). Radar se busca fuera del árbol por PATH, RADAR_BIN o ubicación instalada (`.githooks/pre-push:99-112`); si está ausente o vence el timeout, el hook puede dejar pasar (`.githooks/pre-push:114-116`, `.githooks/pre-push:159-168`). Esa omisión no satisface este procedimiento: exige `radar check` efectivo y exitoso, con warnings informados. No uses bypass.

Tras permiso específico de push y con commits ya preparados por el responsable:

```bash
git config --get core.hooksPath
git status --porcelain=v1 --untracked-files=all
git rev-parse 'HEAD^{commit}'
# Mantén el sandbox HOME/XDG de los controles durante el hook.
# RADAR_BIN debe ser el binario instalado confiable y externo al checkout.
HOME=<SANDBOX>/home RADAR_BIN=<RADAR_INSTALADO> git push origin HEAD:master
git ls-remote origin refs/heads/master
```

**Verificación:** `.githooks` activo, suite exit 0, Radar ejecutado exit 0, review reconocida, docs reconciliados, raíz limpia y HEAD = SHA remoto = `<COMMIT>`. No basta «push aceptado». El gate de suite tiene condiciones sobre ubicación física del hook; compruébalas especialmente desde linked worktrees, no extrapoles un push anterior (`.githooks/pre-push:36-39`).

## 4. Armado

Sólo cuando el checkout de construcción esté coordinado, limpio, confirmado y subido, revisa capacidad y destinos. El constructor rechaza suciedad, salidas dentro del worktree y sobrescrituras (`product/tower/v1/release-build.mjs:120-132`, `product/tower/v1/release-build.mjs:210-217`). Sus padres deben existir (`product/tower/v1/release-build.mjs:195-198`).

`<DIR>` es siempre `/home/emili/projects/control-tower/Releases/<TAG>`: fuera de `Main`, junto a `Backups/` y `Worktrees/`, nunca en el HOME. Ahí quedan las salidas de v1.2.0 a v1.2.5 (decisión del mantenedor, 2026-10-03). Si `<DIR>` ya existe, esa etiqueta ya se armó: detente.

```bash
test ! -e /home/emili/projects/control-tower/Releases/<TAG>
mkdir -p /home/emili/projects/control-tower/Releases/<TAG>
df -h /tmp <DIR>
test -d <DIR>
test ! -e <DIR>/tower-v1.json
test ! -e <DIR>/tower-v1.json.sha256
test ! -e <DIR>/torre-install.mjs
test ! -e <DIR>/tui
test ! -e <DIR>/release-build-receipt.json
bun product/tower/v1/release-build.mjs --repo /home/emili/projects/control-tower/Main --commit <COMMIT> --tag <TAG> --out <DIR>/tower-v1.json --installer-out <DIR>/torre-install.mjs --tui-out-dir <DIR>/tui > <DIR>/release-build-receipt.json
```

La ruta `Main` es el checkout de construcción previsto, no permiso para tocarlo. Si otro agente lo usa o está sucio, detente y coordina un checkout limpio; no limpies ni reemplaces trabajo ajeno. Usa HOME/TMPDIR/GOCACHE privados y `GOMODCACHE=/home/emili/go/pkg/mod` si necesitas la caché de módulos existente. El build TUI es offline y sus fallos bloquean builds publicados (`product/tower/v1/release-build.mjs:163-172`, `product/tower/v1/release-build.mjs:266-272`).

```bash
(cd <DIR> && sha256sum -c tower-v1.json.sha256)
(cd <DIR>/tui && sha256sum -c torre-tui-linux-amd64.sha256 torre-tui-linux-arm64.sha256 torre-tui-darwin-amd64.sha256 torre-tui-darwin-arm64.sha256)
sha256sum <DIR>/tower-v1.json <DIR>/tower-v1.json.sha256 <DIR>/torre-install.mjs <DIR>/tui/torre-tui-linux-amd64 <DIR>/tui/torre-tui-linux-amd64.sha256 <DIR>/tui/torre-tui-linux-arm64 <DIR>/tui/torre-tui-linux-arm64.sha256 <DIR>/tui/torre-tui-darwin-amd64 <DIR>/tui/torre-tui-darwin-amd64.sha256 <DIR>/tui/torre-tui-darwin-arm64 <DIR>/tui/torre-tui-darwin-arm64.sha256
```

**Verificación:** build exit 0, recibo JSON conservado, `commit` exacto, `sha256` y `installerSha256` iguales a hashes calculados, cuatro entradas `tui` con hash/tamaño/asset concordantes (`product/tower/v1/release-build.mjs:285-286`). Verifica los once archivos, incluidos los hashes de los propios sidecars. En macOS sustituye `sha256sum` por `shasum -a 256`.

## 5. Publicación

Confirma de nuevo autorización, tag remoto ausente y commit remoto correcto. Repositorio privado: `README.md:25-30`. No copies la publicación abreviada de `README.md:187`: omite cuatro sidecars TUI requeridos (`odd/tasks/s207-tui-update.md:31`). Publica exactamente estos **11 assets**:

```bash
gh release create <TAG> --repo achangkuon/control-tower --target <COMMIT> \
  <DIR>/tower-v1.json \
  <DIR>/tower-v1.json.sha256 \
  <DIR>/torre-install.mjs \
  <DIR>/tui/torre-tui-linux-amd64 \
  <DIR>/tui/torre-tui-linux-amd64.sha256 \
  <DIR>/tui/torre-tui-linux-arm64 \
  <DIR>/tui/torre-tui-linux-arm64.sha256 \
  <DIR>/tui/torre-tui-darwin-amd64 \
  <DIR>/tui/torre-tui-darwin-amd64.sha256 \
  <DIR>/tui/torre-tui-darwin-arm64 \
  <DIR>/tui/torre-tui-darwin-arm64.sha256 \
  --notes '<NOTAS_APROBADAS>'
gh release view <TAG> --repo achangkuon/control-tower --json url,tagName,assets
git ls-remote --tags origin 'refs/tags/<TAG>' 'refs/tags/<TAG>^{}'
```

**Verificación:** URL obtenida, tag (pelado si anotado) apunta a `<COMMIT>`, once nombres exactos, tamaños y hashes descargados coinciden con recibo/listado. Descarga en otro directorio descartable, nunca sobrescribas el build:

```bash
gh release download <TAG> --repo achangkuon/control-tower --dir <DIR_VERIFICACION>
(cd <DIR_VERIFICACION> && sha256sum *)
```

Comunica tag e **installerSha256** por un canal independiente; no tomes el digest de la página que ofrece el asset (`README.md:34-40`, `README.md:199-200`). Incluye este one-liner verificado en `README.md:114`, sustituyendo tag y hash independientes:

```bash
d=$(mktemp -d) && gh release download '<TAG>' -R achangkuon/control-tower -p torre-install.mjs -D "$d" && printf '%s  %s\n' '<SHA_DEL_INSTALADOR>' "$d/torre-install.mjs" | shasum -a 256 -c - && bun "$d/torre-install.mjs"
```

## 6. Después de publicar

### Smoke de socio

Solicita autorización para descarga/ejecución y adopción del proyecto fixture. Prepara un sandbox nuevo para HOME/XDG/TMPDIR, con el aislamiento de la fase 3, un repositorio Git fixture `<P_SMOKE>` y `GH_CONFIG_DIR=<GH_CONFIG_AUTORIZADO>` explícito. No leas ni copies credenciales; usa sólo la configuración de autenticación autorizada. El acceso privado es requisito (`README.md:102-105`). Ejecuta el one-liner anterior dentro de ese entorno, no con HOME real.

```bash
export GH_CONFIG_DIR=<GH_CONFIG_AUTORIZADO>
export PATH="$HOME/.local/bin:$PATH"
# Ejecuta aquí el one-liner verificado.
torre-control doctor
torre-control project init --project <P_SMOKE> --trust trusted
torre-control list
torre-control project doctor --project <P_SMOKE>
torre-control
```

**Verificación:** checksums correctos; doctor global sano; proyecto adoptado, listado y diagnosticado; TUI real abierta y versión visible. No llames exitosa a una prueba que sólo vio el fallback; menú integrado y TUI son distintos (`README.md:145-153`). Anota plataforma y requisitos no disponibles, sin inventar pruebas macOS (`README.md:99-101`).

### Máquina del mantenedor

Sólo con su autorización separada, fuera del sandbox de smoke:

```bash
torre-control update --latest
# Si cambió la CLI, vuelve a ejecutar con el lanzador ya actualizado:
~/.local/bin/torre-control update --latest
torre-control doctor
torre-control list
torre-control project doctor --project <P>
# Cierra la interfaz anterior y vuelve a abrirla.
torre-control
torre-control update --check
```

**Verificación:** tag activo esperado, componentes sanos, cada proyecto relevante diagnosticado y `projects` sin omisiones ocultas. `update --check` debe informar `up-to-date`; `unknown` no prueba éxito, y `available` compara tags, no orden semántico (`product/tower/v1/release.mjs:200-219`). Repetir `--latest` con motor al día puede renovar TUI y refrescar copias intactas (`product/tower/v1/cli.mjs:502-522`). Registra URL, commit, los once hashes, plataforma, resultados de smoke/doctor y warnings en notas de la tarea y Engram del proyecto validado; no guardes credenciales ni salidas de autenticación.

## Gotchas

- **CLI anterior / TUI anterior:** la invocación puede estar ejecutando código viejo. Repite update con el nuevo lanzador si cambió la CLI y reabre TUI; el aviso de reapertura consta en `odd/tasks/s207-tui-update.md:14`.
- **Contenido idéntico, tag nuevo:** un cambio sólo visual puede conservar el digest del motor. Usa promoción de procedencia, no retag: permite checkout→publicado y publicado→otro tag del mismo repo/asset (`product/tower/v1/global.mjs:334-349`, `openspec/archive/sesiones/S213.md:11-20`).
- **umask 002:** inspecciona primero las rutas enumeradas; solicita permiso antes de `--fix-permissions`. Quita sólo go-w de rutas admitidas; no arregla enlaces, propietario ajeno ni evidencia desconocida (`product/tower/v1/runtime-config.mjs:284-304`, `openspec/archive/sesiones/S205.md:14-29`).
- **`/tmp` lleno:** verifica capacidad antes de tests/build. El bloqueo documentado no es un fallo lógico probado ni autoriza borrar archivos ajenos (`odd/tasks/s209-update-notice.md:39-53`).
- **Pre-push desde linked worktree:** confirma root/hook físicos, HEAD empujado y entorno sandbox; no supongas que el gate de suite se ejecutó (`.githooks/pre-push:36-44`).
- **Fallo TUI ≠ rollback del motor:** puede quedar motor actualizado con `tui: unavailable:*`; inspecciona ambos estados (`product/tower/v1/release.mjs:130-169`, `README.md:152-155`).

## Si algo falla

1. Detente, conserva recibo, logs acotados y archivos de evidencia. No borres locks ni arregles permisos indiscriminadamente.
2. Nunca muevas ni sobrescribas un tag publicado. Si cambia contenido/commit, pasa por controles y publica **otro tag**.
3. Si falla sólo publicación/subida, y tag/commit siguen exactamente iguales a los registrados, confirma los assets presentes y sube sólo los faltantes a esa misma release. Nunca reemplaces existentes ni uses `--clobber`:

```bash
gh release view <TAG> --repo achangkuon/control-tower --json url,tagName,assets
git ls-remote --tags origin 'refs/tags/<TAG>' 'refs/tags/<TAG>^{}'
gh release upload <TAG> <ASSET_FALTANTE> --repo achangkuon/control-tower
```

4. Repite verificación de tag y once hashes, luego smoke. Si el comando inicial falló sin crear release/tag, reconfirma ausencia antes de reintentar creación; si el estado remoto es ambiguo, pregunta y detente.
5. Si falla update/doctor local, conserva el resultado parcial y solicita revisión; no interpretes fallo TUI o registro como reversión automática (`product/tower/v1/release.mjs:165-169`, `README.md:243-250`).

## Output Contract de release

Devuelve:

- Tag exacto, commit completo y URL de release.
- SHA-256 de cada uno de los **11 assets**, más ubicación del recibo JSON.
- Autorizaciones recibidas y gates efectivamente pasados: tests, revisión reconocida, cierre Radar, limpieza, push y verificación remota.
- Smoke por plataforma, doctor global/de proyectos, actualización TUI y resultado de `update --check`.
- Warnings, controles omitidos/bloqueados y actualización real pendiente cuando no fue autorizada.
