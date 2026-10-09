# S181 — Revisión residual de la V1 publicada: instalación, reversibilidad y documentación

Informe sustantivo de revisión. **No es un índice de estado.** Todo lo que sigue es
evidencia: identidad congelada, qué se corrió, qué se omitió, qué se encontró y qué
queda sin cubrir. **Ningún hallazgo de este informe autoriza una reparación**
(ver §9).

Esta sesión es de **sólo lectura salvo este archivo**. No se instaló nada, no se
publicó nada, no se tocó el HOME real, ni producción, ni terceros. La única red usada
fue lectura de metadatos de release (`git ls-remote --tags`, `gh release list/view`).

---

## 1. Identidad publicada congelada

### 1.1 Tag y commit

| Dato | Valor |
|---|---|
| Tag publicado más reciente | **`v1.2.5`** (marcado `Latest` en GitHub) |
| Commit del tag | **`7ad0510063b429d46aefe14a67666873316b6153`** |
| Tipo de tag | ligero (`git cat-file -t v1.2.5` → `commit`); el ref apunta directo al commit |
| `targetCommitish` del release remoto | `7ad0510063b429d46aefe14a67666873316b6153` (coincide) |
| `createdAt` del release remoto | `2026-10-04T01:07:18Z` |
| Fecha del commit `7ad0510` | `2026-10-03T20:07:18-05:00` → **el mismo instante** que el `createdAt` |
| Assets subidos | `2026-10-04T01:16:34Z`–`01:16:38Z` |
| Fecha de congelamiento | inicio de esta sesión de revisión; lectura de reloj local `2026-10-04T17:40:51-05:00` |

Las 10 referencias locales coinciden **una a una** con su par remoto
(`v1.0.0`→`b11e49b2`, `v1.0.1`→`53accb81`, `v1.0.2`→`1ba55435`, `v1.1.0`→`eb95e991`,
`v1.2.0`→`50b262c9`, `v1.2.1`→`33a2fc9e`, `v1.2.2`→`4c72ada5`, `v1.2.3`→`a3a246a8`,
`v1.2.4`→`e6c89e2d`, `v1.2.5`→`7ad05100`). El commit `bc1c8d2` (*fix(tower): re-tag
identical published content instead of conflicting*) documenta que hubo re-etiquetado de
contenido idéntico; hoy no queda ningún tag en conflicto entre local y remoto. Lo que
importa acá: **local y remoto coinciden en `v1.2.5` → `7ad0510`**, y no existe ningún
tag `v1.3*` ni posterior.

### 1.2 Método de adquisición (en este orden, antes de cualquier otra comprobación)

```bash
git tag --list 'v1*'                       # 10 tags; último v1.2.5
git ls-remote --tags origin                # v1.2.5 -> 7ad0510063b429d46aefe14a67666873316b6153
gh auth status                             # autenticado como achangkuon (scopes: repo, workflow, …)
gh release list -R achangkuon/control-tower --limit 10
#   Tower V1 v1.2.5  Latest  v1.2.5  2026-10-04T01:16:39Z
gh release view v1.2.5 -R achangkuon/control-tower \
  --json tagName,createdAt,targetCommitish,assets
```

La verificación remota **no** dependió de leer la página del release: se usó la API
de `gh` (`--json`), que devuelve por asset un campo `digest` calculado por GitHub.
`v1.2.5` es el tag más nuevo publicado, así que la identidad quedó fija ahí. Si
hubiera aparecido un tag nuevo a mitad de la revisión, esta identidad no se mueve.

### 1.3 Digests verificados (coinciden archivo local, recibo local y remoto)

Evidencia local: `/home/<usuario>/projects/control-tower/Releases/v1.2.5/` (fuera del
repo, según `agent-workflows/skills-personales/torre-release/references/publicar.md:89,116-133`).

| Asset | bytes | sha256 local | sidecar `.sha256` | `build.log` | `digest` remoto (gh) |
|---|---|---|---|---|---|
| `tower-v1.json` | 1257141 | `0e30d637…f9f4` | `0e30d637…f9f4` ✔ | `0e30d637…f9f4` ✔ | `0e30d637…f9f4` ✔ |
| `torre-install.mjs` | 19183 | `b956fa62…fc95` | — (no tiene sidecar) | `b956fa62…fc95` ✔ | `b956fa62…fc95` ✔ |
| `torre-tui-linux-amd64` | 3829886 | `033d9b9b…26f7` | `033d9b9b…26f7` ✔ | `033d9b9b…26f7` ✔ | `033d9b9b…26f7` ✔ |
| `torre-tui-linux-arm64` | 3735678 | `71c33ad5…31a5` | `71c33ad5…31a5` ✔ | `71c33ad5…31a5` ✔ | `71c33ad5…31a5` ✔ |
| `torre-tui-darwin-amd64` | 3841968 | `a467c018…b1c6` | `a467c018…b1c6` ✔ | `a467c018…b1c6` ✔ | `a467c018…b1c6` ✔ |
| `torre-tui-darwin-arm64` | 3715202 | `ddcda3c4…2ca1` | `ddcda3c4…2ca1` ✔ | `ddcda3c4…2ca1` ✔ | `ddcda3c4…2ca1` ✔ |

Digests completos del recibo (`Releases/v1.2.5/build.log`), formato
`tower.v1.release-build/1` (producido por `product/tower/v1/release-build.mjs:285-286`):

```
{"schema":"tower.v1.release-build/1","commit":"7ad0510063b429d46aefe14a67666873316b6153",
 "asset":"tower-v1.json","bytes":1257141,
 "sha256":"0e30d637e8dac0b9be04b178045dccf311ef874c791103ef6247649374e5f9f4",
 "installerSha256":"b956fa6212f52a4c31b9b0224d1fccbdaad726d71eecca96d9e91cd8e414fc95",
 "tui":{"linux-amd64":{"asset":"torre-tui-linux-amd64","sha256":"033d9b9b4dd3953c50afa70bec6093d6c74ed475ae44d3e837606d79fb2b26f7","bytes":3829886},
        "linux-arm64":{"asset":"torre-tui-linux-arm64","sha256":"71c33ad5e11a0d9d2f2d8569d21954db3f416cfe6770b389e5c8d1f9c9d731a5","bytes":3735678},
        "darwin-amd64":{"asset":"torre-tui-darwin-amd64","sha256":"a467c018f7a480efe4b6179ae941e1829203f4a3106a389c5ff7a544f5aab1c6","bytes":3841968},
        "darwin-arm64":{"asset":"torre-tui-darwin-arm64","sha256":"ddcda3c45fef6f14974db785f09d09c8fd14a54f86b6c91f41a7e4656be6cae0","bytes":3715202}}}
```

**Resultado: los tres orígenes independientes coinciden (local, recibo, remoto).**
El release remoto tiene exactamente **11 assets** (paquete + huella, instalador, 4 TUI
+ 4 huellas), que es lo que `README.md:190` (HEAD) describe.

### 1.4 Sellado del instalador y coherencia con el manifiesto

Del bloque `const PINNED = {...}` en
`/home/<usuario>/projects/control-tower/Releases/v1.2.5/torre-install.mjs:8`
(sentinel definido en `product/tower/v1/install.mjs:8`, estampado por
`stampInstaller` en `product/tower/v1/release-build.mjs:135-143`):

- `pinned.tag = v1.2.5`, `pinned.repository = achangkuon/control-tower`,
  `pinned.asset = tower-v1.json`.
- `pinned.sha256` = `0e30d637…f9f4` = huella del sidecar = sha256 del `tower-v1.json`
  local. ✔
- `pinned.paths` tiene **91 entradas** y coincide **exactamente, en conjunto y en
  orden**, con los 91 `members[]` del `tower-v1.json` congelado
  (`set equal: True`, `order equal: True`, sin sobrantes en ninguna dirección).
- `pinned.tui` declara las 4 plataformas `linux/darwin × amd64/arm64`, que son las
  mismas 4 que el recibo y el release.

### 1.5 Identidades del instalador, del benchmark y del README

El contrato de S181 pide fijar estas tres identidades. Se calculan sobre **objetos Git
del commit congelado** (`git show 7ad0510:<ruta>`), que son inmutables, no sobre el
árbol de trabajo:

| Ruta | sha256 en `7ad0510` | ¿Igual que HEAD? |
|---|---|---|
| `product/tower/v1/install.mjs` | `6b8804db0c2114ae81184858fc2a51ac3aeb3053f01661c6447328ddf53167f6` | **idéntico** |
| `product/tower/v1/benchmark.mjs` | `ff5ab338ca7f12207b0a63e35085fb88b2412ab4dfe444edbc798688aeb562d8` | **idéntico** |
| `README.md` | `ed16c59edb49fe7e4349cdc10ab9bb1a3d9f1e560a702cd139e0ab084040c083` | distinto |
| `product/tower/v1/cli.mjs` | `c7dea6894d7a91a8b592962d57b6610aff0e19fcda170696937c2cba88594517` | **idéntico** |
| `product/tower/v1/runtime-config.mjs` | `69243d6bbf6261672d3497176e6dae21d861b9431ea7c74741ab5aa50fa27bf4` | **idéntico** |
| `product/tower/v1/bundle.mjs` | `59096bfdfdf65e94a1c326443f6bb394070e8d2649a38e78fab5ffa4a1381922` | **idéntico** |
| `product/tower/v1/INSTALL-AGENTS.md` | `f21058925c0057ee53e0ee4aaee80a883bc1c39e560310ad438219db50e4cb8b` | **idéntico** |
| `product/tower/generic/README.md` | `7495e86cb6c64d20069a9ccbf5d873e4b16b3af0d10ac9549db61a10742f3ce7` | **idéntico** |
| `docs/architecture/definiciones-v1-v2-v3.md` | `dcbe3c3a726c82416cf50161ad36042b7e9e25314ffa9fb2d5879077eb701947` | distinto |

Además, se comparó el **asset publicado** contra el árbol de trabajo:

```bash
diff <(sed 's/^const PINNED = .*$/const PINNED = null;/' Releases/v1.2.5/torre-install.mjs) \
     product/tower/v1/install.mjs
# sin diferencias → el instalador publicado es byte a byte install.mjs + la línea PINNED
```

**Consecuencia metodológica:** los módulos de código que sostienen los hallazgos
(`install.mjs`, `runtime-config.mjs`, `bundle.mjs`, `cli.mjs`) son **byte a byte los
publicados en v1.2.5**. Un hallazgo sobre esos archivos es un hallazgo sobre la versión
publicada, no sobre HEAD. Los dos archivos que sí se movieron desde el release
(`README.md`, `definiciones…md`) se citan por su contenido de `7ad0510` cuando
corresponde, y se marca cuándo el texto es posterior al release.

### 1.6 Qué NO se usa como identidad

Assets sin tag, un `HEAD` sin tag, o el árbol de trabajo por sí solos **no** valen como
identidad publicada. Ningún `Releases/*` distinto de `v1.2.5` se usó como fuente: son
builds históricos. No se usó memoria (Engram) ni el corpus archivado para elegir ni
para fechar nada.

---

## 2. Fuentes examinadas

**Archivo local de builds (fuera del repo, sólo lectura):**
`Releases/v1.2.5/{build.log, torre-install.mjs, tower-v1.json, tower-v1.json.sha256, tui/*}`
(4 ejecutables + 4 huellas).

**Identidad remota:** `git ls-remote --tags origin`; `gh release list` / `gh release view v1.2.5 --json …`.

**Objetos Git del commit congelado `7ad0510`:** las 9 rutas de la tabla §1.5; además
`docs/architecture/definiciones-v1-v2-v3.md` en `7ad0510` (para saber si B4 ya existía
al publicar: **sí existía**, `grep -n B4` sobre ese objeto da la línea 43).

**Código de producto (HEAD, idéntico a v1.2.5 donde se indica):**
`product/tower/v1/install.mjs`, `cli.mjs`, `runtime-config.mjs`, `bundle.mjs`,
`global.mjs`, `project-files.mjs`, `release-build.mjs`, `benchmark.mjs`.

**Documentación:** `README.md` (HEAD y `7ad0510`), `product/tower/v1/INSTALL-AGENTS.md`,
`product/tower/generic/README.md`, `docs/architecture/definiciones-v1-v2-v3.md`.

**Fuentes de piezas de control:** `agent-workflows/tools/hooks/{chanks-etapa.sh, torre-firma.sh}`,
`agent-workflows/tools/setup.sh`, `agent-workflows/chanks/torre-firma.mjs`.

**Pruebas que fijan el contrato (leídas, y tres corridas):**
`product/tower/v1/test/{install,global,runtime-config,project-files}.test.mjs`
(el antecedente que el contrato cita como `test/install.test.mjs:222-234` es en realidad
`product/tower/v1/test/install.test.mjs:222-235`, último test del archivo).

**Contrato de la sesión:** `radar sesion S181 -C <raíz>` (declara un único archivo
autorizado: `product/tower/v1/reviews/s181-v1-residual-review.md`).

**Evidencia previa consumida como historia, no repetida:** entregas S205–S213 —
`e6def96`, `d94262d`, `3c8a4b2`, `145f2df`, `54e60e1`, `df449fd`, `8d72459`, `a20cef6`,
`bc1c8d2`. No se re-ejecutó ninguna de sus validaciones ni el smoke rutinario de release.

---

## 3. Método

1. **Congelar primero la identidad publicada** (§1), en el orden exigido, antes de leer
   cualquier otra cosa. Ninguna comprobación posterior pudo cambiar el sujeto de la revisión.
2. **Aislar todo lo que se corre.** Nunca el HOME real. Toda corrida usó
   `HOME=$(mktemp -d …)`, `TMPDIR` dentro del mismo temporal, y `env -i` para no heredar
   variables de la sesión. Los directorios temporales se dejaron en `/tmp` (no se ejecutó
   `rm`, por política).
3. **Comparar la versión publicada contra el código actual** (§1.5) para saber si un
   hallazgo describe v1.2.5 o HEAD.
4. **Preferir el objeto congelado como fuente.** Cuando el hallazgo es sobre el asset
   publicado, se leyó el contenido del miembro dentro de `tower-v1.json` congelado
   (base64 → bytes, sha256 del miembro verificado contra el manifiesto) y se citó esa
   línea, no la del árbol de trabajo.
5. **Sólo lectura + sin reparaciones.** Ningún hallazgo se arregló; ver §9.

---

## 4. Comprobaciones residuales aisladas

### 4.1 Corridas

| # | Comprobación | Cómo | Resultado |
|---|---|---|---|
| 1 | `--dry-run` del **instalador sellado publicado**, sin HOME real | `env -i HOME=<tmp>/home TMPDIR=<tmp>/tmp PATH=<tmp>/home/bin:$PATH bun Releases/v1.2.5/torre-install.mjs --dry-run` con un `gh` falso **dentro del HOME temporal** que sirve el asset y el TUI desde el archivo congelado | `exit=0`, stdout `Verified dry-run: no global installation performed.`; **no se creó `<tmp>/home/.local`**; el recap temporario del instalador quedó vacío |
| 2 | Verificación de digests | `sha256sum` sobre el asset, el instalador y los 4 TUI; `diff` contra los sidecar `.sha256`; comparación con `build.log` y con el `digest` que devuelve `gh release view --json` | coinciden los 3 orígenes (tabla §1.3) |
| 3 | Coherencia sello ↔ manifiesto | parseo del bloque `PINNED` del instalador y comparación con `members[]` del asset | 91 = 91, mismo conjunto y mismo orden; `pinned.sha256` = sidecar |
| 4 | Prueba focalizada de instalación | `bun test product/tower/v1/test/install.test.mjs` | **16 pass / 0 fail** (incluye `standalone stamped asset runs offline dry-run with fake gh and disposable HOME`, `:222`) |
| 5 | Reversibilidad del motor global y de la configuración de runtime | `bun test product/tower/v1/test/global.test.mjs product/tower/v1/test/runtime-config.test.mjs product/tower/v1/test/project-files.test.mjs` | **111 pass / 0 fail** |
| 6 | Árbol limpio antes/después | `git status --porcelain` antes y después de cada corrida | vacío en todos los casos |

### 4.2 Omitidas, y por qué

| Omitida | Motivo |
|---|---|
| `--dry-run` **real contra la red** (sin `gh` falso) | El contrato pedía `--dry-run` **offline** y limita la red a metadatos de release en modo lectura. Se sustituyó por el `gh` falso dentro del HOME temporal, que ejercita el mismo camino de verificación (digest del asset, desempaquetado de los 91 miembros, adquisición del TUI) sin salir a la red. Ver §8.1 |
| El smoke completo `install/update/rollback/uninstall` **del instalador sellado con descarga real** | Requeriría red real y descargar el payload. En su lugar se consumió la cobertura existente del mismo contrato (comprobaciones 4 y 5), que corre con el mismo módulo byte a byte y en HOME desechable. Ver §8.2 |
| Instalación, adopción de un proyecto, `doctor`/`update`/`rollback` reales sobre el HOME del operador | Prohibido por el contrato: sin escrituras en HOME real, sin terceros, sin producción |
| Re-ejecutar la construcción de release (`release-build.mjs`) o el smoke rutinario de publicación | Duplicaría S205–S213 y el procedimiento de publicación; su evidencia se cita como historia (§2) |
| Suite completa del repo (`bun run test`, `test:go`, `test:python`) | No autorizada; sólo se corrieron las pruebas focalizadas de los contratos revisados |
| Benchmark de hosts (`benchmark.mjs`) | Es un instrumento de entrega que requiere **ambos** hosts (Pi y Claude) y consume cuota real; su identidad quedó congelada (§1.5) pero no se ejecutó |

### 4.3 Aclaración: el `--dry-run` del instalador no es offline (no es un hallazgo)

La consigna de la sesión asumía un dry-run offline. El código dice otra cosa y el
README ya lo declara:

- `product/tower/v1/install.mjs:160` ejecuta `prerequisites(runner, env)` (exige
  `gh`, `bun`, `git`, `go` y `gentle-ai`).
- `product/tower/v1/install.mjs:164-166` descarga `tower-v1.json` con
  `gh release download` **antes** de la rama de dry-run.
- `product/tower/v1/install.mjs:128-131` (dentro de `acquireTui`) descarga además el
  binario TUI de la plataforma.
- Recién en `product/tower/v1/install.mjs:179` corta: `if (argv[0] === "--dry-run")`.
- `README.md:130` ya lo dice: «…cambie únicamente el último comando por
  `bun "$d/torre-install.mjs" --dry-run`: **sí descarga y verifica**».

Es decir: el dry-run verifica auténticamente pero **requiere red y `gh` autenticado**.
No hay contradicción documental que reportar; queda registrado para que nadie lo
lea como "prueba offline".

---

## 5. Evidencia (comandos y salidas acotadas)

### 5.1 Congelamiento

```console
$ git tag --list 'v1*'
v1.0.0
v1.0.1
v1.0.2
v1.1.0
v1.2.0
v1.2.1
v1.2.2
v1.2.3
v1.2.4
v1.2.5

$ git ls-remote --tags origin | tail -2
e6c89e2d365af96777e320ee0c6c4e23d1e11150	refs/tags/v1.2.4
7ad0510063b429d46aefe14a67666873316b6153	refs/tags/v1.2.5

$ git cat-file -t v1.2.5 && git rev-parse v1.2.5^{commit}
commit
7ad0510063b429d46aefe14a67666873316b6153

$ gh release view v1.2.5 -R achangkuon/control-tower --json tagName,createdAt,targetCommitish
{"tagName":"v1.2.5","createdAt":"2026-10-04T01:07:18Z",
 "targetCommitish":"7ad0510063b429d46aefe14a67666873316b6153"}   # 11 assets, digests en §1.3
```

### 5.2 Digests

```console
$ cd Releases/v1.2.5 && sha256sum tower-v1.json torre-install.mjs && cat tower-v1.json.sha256
0e30d637e8dac0b9be04b178045dccf311ef874c791103ef6247649374e5f9f4  tower-v1.json
b956fa6212f52a4c31b9b0224d1fccbdaad726d71eecca96d9e91cd8e414fc95  torre-install.mjs
0e30d637e8dac0b9be04b178045dccf311ef874c791103ef6247649374e5f9f4  tower-v1.json

$ sha256sum tui/*
a467c018f7a480efe4b6179ae941e1829203f4a3106a389c5ff7a544f5aab1c6  tui/torre-tui-darwin-amd64
ddcda3c45fef6f14974db785f09d09c8fd14a54f86b6c91f41a7e4656be6cae0  tui/torre-tui-darwin-arm64
033d9b9b4dd3953c50afa70bec6093d6c74ed475ae44d3e837606d79fb2b26f7  tui/torre-tui-linux-amd64
71c33ad5e11a0d9d2f2d8569d21954db3f416cfe6770b389e5c8d1f9c9d731a5  tui/torre-tui-linux-arm64
# cada .sha256 dice exactamente lo mismo que el recibo (build.log) y que el digest remoto
```

### 5.3 Sello ↔ manifiesto

```console
$ python3 - <<'EOF'   # parsea PINNED del instalador y lo compara con members[] del asset
pinned.paths: 91 asset members: 91
set equal: True
order equal: True
only in pinned: []
only in asset: []
pin.sha256 == asset sha256 sidecar: 0e30d637…f9f4 True
pin.tui keys: ['linux-amd64', 'linux-arm64', 'darwin-amd64', 'darwin-arm64']
EOF
```

### 5.4 Dry-run aislado del instalador sellado

```console
$ T=$(mktemp -d /tmp/s181-dryrun-XXXXXX); mkdir -p "$T/home/bin" "$T/tmp"   # T=/tmp/s181-dryrun-6BPWRH
$ cat "$T/home/bin/gh"            # gh falso, DENTRO del HOME temporal: sirve el archivo congelado
#!/bin/sh
if [ "$1" = "auth" ]; then exit 0; fi
for a in "$@"; do case "$a" in torre-tui-*) cat "/home/<usuario>/projects/control-tower/Releases/v1.2.5/tui/$a"; exit 0 ;; esac; done
cat "/home/<usuario>/projects/control-tower/Releases/v1.2.5/tower-v1.json"
$ find "$T/home" | sort          # ANTES
/tmp/s181-dryrun-6BPWRH/home
/tmp/s181-dryrun-6BPWRH/home/bin
/tmp/s181-dryrun-6BPWRH/home/bin/gh
$ env -i PATH="$T/home/bin:/home/linuxbrew/.linuxbrew/bin:/usr/bin:/bin" \
      HOME="$T/home" TMPDIR="$T/tmp" \
      bun /home/<usuario>/projects/control-tower/Releases/v1.2.5/torre-install.mjs --dry-run ; echo "exit=$?"
Verified dry-run: no global installation performed.
exit=0
$ find "$T/home" | sort          # DESPUÉS (completo)
/tmp/s181-dryrun-6BPWRH/home
/tmp/s181-dryrun-6BPWRH/home/.config/go/telemetry/local/go@go1.26.4-go1.26.4-linux-amd64-2026-10-04.v1.count
/tmp/s181-dryrun-6BPWRH/home/.config/go/telemetry/local/upload.token
/tmp/s181-dryrun-6BPWRH/home/.config/go/telemetry/local/weekends
/tmp/s181-dryrun-6BPWRH/home/.config/go/telemetry/upload
/tmp/s181-dryrun-6BPWRH/home/bin
/tmp/s181-dryrun-6BPWRH/home/bin/gh
$ ls "$T/home/.local"          # ls: cannot access '/tmp/s181-dryrun-6BPWRH/home/.local': No such file or directory
$ find "$T/tmp" -maxdepth 1    # el recap del instalador se eliminó: sólo queda "$T/tmp"
```

El `--dry-run` **no deja nada instalado**: ni `.local/bin/torre-control`, ni
`.local/share/torre-control`, ni `.claude`, ni `.pi`. Lo único que aparece en el HOME
vacío es telemetría propia del binario `go` disparada por la comprobación de
prerrequisitos (ver hallazgo **H4**).

### 5.5 Pruebas focalizadas

```console
$ bun test product/tower/v1/test/install.test.mjs
(pass) standalone stamped asset runs offline dry-run with fake gh and disposable HOME [186.36ms]
 16 pass / 0 fail — 432 expect() calls

$ bun test product/tower/v1/test/global.test.mjs \
           product/tower/v1/test/runtime-config.test.mjs \
           product/tower/v1/test/project-files.test.mjs
 111 pass / 0 fail — 861 expect() calls        # 14.97s
$ git status --porcelain                      # (vacío) antes y después
```

### 5.6 Contenido congelado de las piezas de control (leído del asset, no de GitHub)

```console
$ python3 - <<'EOF'   # miembros del tower-v1.json publicado, sha256 verificado contra el manifiesto
agent-workflows/tools/hooks/chanks-etapa.sh   sha256=1fff75140021c186  bytes=3121
agent-workflows/tools/hooks/torre-firma.sh    sha256=2f679bda6581023b  bytes=3309
FROZEN runtime-config.mjs:23: { event: "UserPromptSubmit", matcher: "", hook: { …, command: 'sh "$HOME/.claude/hooks/chanks-etapa.sh"', timeout: 15 } },
FROZEN runtime-config.mjs:24: { event: "PreToolUse", matcher: "Bash", hook: { …, command: 'sh "$HOME/.claude/hooks/torre-firma.sh"', timeout: 15 } },
FROZEN runtime-config.mjs:100: [".claude/hooks/chanks-etapa.sh", "signatures"], [".claude/hooks/torre-firma.sh", "signatures"],
FROZEN runtime-config.mjs:337: for (const name of ["chanks-etapa.sh", "torre-firma.sh"]) file(`.claude/hooks/${name}`, …)
FROZEN torre-firma.sh:2: # Optional Claude PreToolUse notice; installer copies this file but never registers it.
EOF
```

---

## 6. Hallazgos

Ninguno de estos hallazgos se reparó. Todos describen la **v1.2.5 publicada**: los
módulos involucrados son byte a byte idénticos a `7ad0510` (§1.5).

### H1 — Media — El runbook afirma que la instalación no toca la configuración global de agentes, y sí la toca

- **Qué dice la documentación**
  `product/tower/v1/INSTALL-AGENTS.md:10-12`: «…Installing it changes nothing in any
  project **and nothing in the human's agent configuration**».
  `product/tower/v1/INSTALL-AGENTS.md:18`: «It **never edits** `~/.claude`, `~/.pi`,
  `~/.agents`, `~/.codex` or any other global agent configuration.»
- **Qué hace el código publicado**
  - `product/tower/v1/runtime-config.mjs:336` escribe `~/.pi/agent/extensions/chanks-notices.ts`
    (extensión de Pi, generada por `notices()`).
  - `product/tower/v1/runtime-config.mjs:337` escribe `~/.claude/hooks/chanks-etapa.sh` y
    `~/.claude/hooks/torre-firma.sh`.
  - `product/tower/v1/runtime-config.mjs:22-25` + `:360-370` **registran** ambos hooks en
    `~/.claude/settings.json` (`settingsPath` en `:14`): `UserPromptSubmit` →
    `chanks-etapa.sh` y `PreToolUse/Bash` → `torre-firma.sh`, y anotan el evento en
    `added[]` para poder deshacerlo.
  - `product/tower/v1/runtime-config.mjs:15` (destinos), `:348-359` (cálculo del bloque) y
    `:447` (escritura atómica) insertan el bloque puntero en `~/.claude/CLAUDE.md` y
    `~/.pi/agent/APPEND_SYSTEM.md` (y en Codex/OpenCode si el directorio existe).
- **Prueba de que ocurrió en el release**: los cuatro miembros `agent-workflows/tools/hooks/*`
  y `product/tower/v1/runtime-config.mjs` están dentro del `tower-v1.json` **v1.2.5**, y la
  copia congelada de `runtime-config.mjs` contiene las líneas 23, 24, 100, 336 y 337 citadas
  arriba (§5.6). La tabla de §1.5 muestra que esa copia congelada es idéntica a la del árbol.
- **Impacto**: cualquiera —humano o agente— que siga el runbook para decidir si instala
  acepta una premisa falsa sobre qué se modifica en su máquina. La reversibilidad
  (§7) es buena, pero la afirmación sigue siendo incorrecta.
- **Nota**: la documentación *no* menciona en ningún lado estas escrituras; `README.md`
  no las nombra (`grep` sobre `~/.claude|settings.json|APPEND_SYSTEM|extensions/` en
  `README.md`: sin coincidencias).

### H2 — Media — La decisión B4 está documentada en el mismo commit publicado, pero el instalador publicado la contradice (y el propio hook declara no estar registrado)

- **Qué dice la decisión** `docs/architecture/definiciones-v1-v2-v3.md:43` (B4), presente
  **ya en `7ad0510`**, el commit de `v1.2.5`:
  «Se conservan el aviso de etapa (`chanks-etapa.sh`) y `pi-intercom`. El candado de
  escritura (`chanks-controls.ts`) pasa a V2 y **la firma de la Torre (`torre-firma.sh`)
  a V3: dejan de instalarse** y su fuente se conserva.»
- **Qué hace el código publicado**
  - `product/tower/v1/bundle.mjs:71-75`: `agent-workflows/chanks/torre-firma.mjs` →
    `signatures/torre-firma.mjs` y **`["chanks-etapa.sh", "torre-firma.sh"]`** →
    `signatures/<nombre>`, es decir ambas piezas siguen en el roster del paquete.
  - `product/tower/v1/runtime-config.mjs:24,337`: `torre-firma.sh` se copia a
    `~/.claude/hooks/` y se registra como hook `PreToolUse/Bash`.
  - Contradicción interna adicional: `agent-workflows/tools/hooks/torre-firma.sh:2` dice
    textualmente «**installer copies this file but never registers it**», mientras
    `runtime-config.mjs:24` lo registra en `settings.json`. Las tres fuentes
    (decisión, código del instalador, encabezado del propio script) se contradicen
    entre sí.
- **Impacto**: `chanks-etapa.sh` se conserva a propósito y su instalación es correcta;
  `torre-firma.sh` es el excedente. Se está instalando y activando un hook que la
  decisión vigente ubicó en V3. Es una discrepancia entre decisión y release, no un
  defecto de reversibilidad: el `added[]` permite quitarlo quirúrgicamente (§7).
- **Alcance de la evidencia**: esto es un hallazgo de revisión. No autoriza quitarlo
  ni "arreglar" B4 (§9).

### H3 — Baja — El README de V1 declara reemplazadas las interfaces antiguas y el README del motor antiguo sigue presentándolas como camino vigente

- **README de V1** (`README.md:274-276`, también en `7ad0510`, texto sin cambios):
  «V1 reemplaza las instrucciones anteriores basadas en `install.sh`, `setup.sh`, el
  lanzador `torre` y el motor antiguo. No importa su base de datos, sus locks ni sus
  estados. **Esas interfaces no forman parte de este inicio rápido.**»
- **README del motor antiguo** (`product/tower/generic/README.md`, idéntico a `7ad0510`):
  - `:26` `cd agent-workflows && ./tools/setup.sh`
  - `:29` «With no arguments it opens an interactive menu — install, **update skills**,
    update the Tower, or diagnose…»
  - `:33-34` «Installing also creates the global command **`torre-control`** … It is a
    launcher, not a copy — **it execs the current checkout**, so `git pull` updates the
    tool with no reinstall step.»
- **Contradicción medible, incluso contra su propio `setup.sh`**: el script que ese README
  documenta ya no usa ese nombre ni ese comportamiento —
  `agent-workflows/tools/setup.sh:44` `LAUNCHER="${SETUP_LAUNCHER:-torre-setup}"`
  (el default es **`torre-setup`**) y `:293-295`:
  «`torre-control` pertenece a Torre V1; usá `torre-setup`. No se modifica $target».
  Es decir: `generic/README.md` describe un `torre-control` que ejecuta el checkout,
  mientras el código real reserva ese nombre para el lanzador inmutable de V1.
- **Impacto**: riesgo de confusión/seguimiento de un procedimiento que el código ya
  desautoriza (sombra del lanzador V1). Ninguno de los dos documentos se publica dentro
  del release: están en el repo, así que el efecto es sobre quien lee el repositorio, no
  sobre quien instala desde el release. Por eso Baja y no Media.
- **No alcanza la barra de "contradicción viva de producto"**: `README.md:3-6` ya declara la
  entrada canónica para agentes y el archivo residual es material histórico del motor anterior.
- **Aclaración**: `product/tower/generic/README.md:33-34` quedaría efectivamente corregido
  por el propio `setup.sh:44,293-295`; la contradicción es del documento, no del script.

### H4 — Informativa — La comprobación de prerrequisitos escribe en el HOME antes de decidir nada

- `product/tower/v1/install.mjs:160` llama a `prerequisites(runner, env)` con el `env`
  real, y esa función ejecuta `gh auth status`, `bun --version`, `git --version` y
  `go version` (`install.mjs:22-34`) y `gentle-ai version` (`install.mjs:35`).
- Medido en la corrida aislada (§5.4): un HOME **vacío** terminó conteniendo
  `~/.config/go/telemetry/…local/upload.token` y un contador. Eso lo genera el binario
  `go`, no el instalador; el instalador sólo lo invoca.
- **Impacto**: bajo y no es configuración de agentes. Vale registrarlo porque el runbook
  promete un `--dry-run` que "no instala nada" y esa promesa se cumple para la Torre,
  pero un HOME recién creado no queda literalmente vacío. Se deja como observación, sin
  recomendación (no autoriza reparación).

### 6.1 Lo que se verificó y **no** resultó hallazgo

- Los 3 orígenes de digest (archivo local, recibo `build.log`, `digest` remoto de la API)
  coinciden para los 11 assets (§1.3).
- `pinned.paths` (91) == `members[]` (91) del manifiesto, mismo conjunto y mismo orden (§5.3).
- El release tiene exactamente los 11 assets que `README.md:190` describe; a nivel de
  assets no hay deriva entre el release y su documentación posterior.
- El `--dry-run` del instalador sellado no escribe estado de Torre en HOME (§5.4) y
  elimina su recap temporario al salir (`install.mjs:200-203`).
- Nota histórica sin acción: el `README.md` **en `7ad0510`** decía «la vigente es `v1.2.0`»
  mientras el release vigente era `v1.2.5`; el commit posterior `bbe4021` lo reemplazó por
  «la marcada `Latest`». Ya está corregido en HEAD; se registra sólo como historia.

---

## 7. Reversibilidad

Se **inspeccionó** el contrato de reversibilidad y se **ejercitó** su cobertura
focalizada. Nada se ejecutó contra el HOME real.

### 7.1 Qué se ejercitó (pruebas, HOME desechable de cada fixture)

`bun test product/tower/v1/test/{global,runtime-config,project-files}.test.mjs` →
**111 pass / 0 fail**. Casos que importan para esta revisión (los `|` de los nombres
abrevian alternativas de la misma familia de casos):

- `isolated global V1 lifecycle > rollback with previous=false|true compensates at activation|readback|finish`
  (6 casos): el rollback compensa en cada punto de falla.
- `isolated global V1 lifecycle > failed update|install at published|activation|state-active|readback|finish leaves prior payload and state intact`.
- `isolated global V1 lifecycle > failed fresh install restores absence, including transaction containers`.
- `runtime-config > uninstall preserves later settings and empty unrelated hooks; restores an earlier pointer block`.
- `runtime-config > backs up foreign skill directories, links and Radar and restores them on uninstall`.
- `runtime-config > settings edited between installs survive a reinstall followed by uninstall`.
- `project-files > restoration rejects obstructed ancestors and hardlinks before changing other targets`.
- `project-files > only absent ancestors that remain empty are removed; unknown siblings survive`.

### 7.2 Qué se inspeccionó (código de la versión publicada)

| Interfaz | Ruta | Semántica observada |
|---|---|---|
| Comandos de reversibilidad | `product/tower/v1/cli.mjs:8,17,20` | `rollback`, `uninstall` y `uninstallRuntime` existen como operaciones de primera clase; `cli.mjs:428` las documenta: «uninstall removes owned global resources and restores backups; Gentle AI and projects remain untouched.» |
| Rollback del motor | `product/tower/v1/global.mjs:527-556` | si hay `previous`, rearma el runtime desde el roster cacheado del release anterior **sin descargar ni confiar en archivos sueltos**; si no hay `previous`, llama a `uninstallRuntime`; si el release anterior no traía el módulo de runtime, lo deja intacto (`runtime: "kept"`) |
| Uninstall del motor | `product/tower/v1/global.mjs:557-578` | retira sólo árboles validados byte a byte; «never recursively delete unknown entries» |
| Uninstall del runtime | `product/tower/v1/runtime-config.mjs:489-535` | borra únicamente entradas propias: se niega si una entrada o un backup fue modificado (`modified owned entry`), quita **sólo** los hooks registrados por Torre del `settings.json` (preservando hooks ajenos y entradas vacías), restaura el puntero previo y el `settings.json` original — o hace la restauración **quirúrgica** si el usuario editó settings después de instalar (`:446,450`) — y elimina el manifiesto de propiedad |
| Restauración de archivos de proyecto | `product/tower/v1/project-files.mjs:285-302` | `removeProjectInstructions` restaura rangos propios, no resucita bloques ya quitados, y borra un archivo sólo si fue creado por la adopción y queda vacío |
| Fallos intermedios | `product/tower/v1/install.mjs:200-203` | el recap temporal del instalador se elimina siempre, incluso en el camino de error |

### 7.3 Límite de esta evidencia de reversibilidad

Las 111 pruebas corren contra el módulo del árbol de trabajo, que para
`global.mjs`/`runtime-config.mjs`/`project-files.mjs`/`cli.mjs` **es el publicado**
(§1.5). No se ejecutó un ciclo `install → rollback → uninstall` sobre el **asset
descargado**, porque eso exigía descarga real; ver §8.2. La conclusión que sí sostiene
la evidencia: el contrato de reversibilidad está cubierto y el propio diseño exige
tener el artefacto anterior para revertir, lo que es coherente con la identidad
inmutable de `v1.2.5`.

---

## 8. Limitaciones

1. **§8.1 — El `--dry-run` publicado no se corrió contra la red.** Se corrió con un `gh`
   falso alimentado por el archivo congelado. Lo que queda sin observar es la
   disponibilidad del release en el momento de la revisión (permisos, límites de
   descarga de `gh`). El `digest` remoto obtenido por la API **sí** confirma que los
   bytes publicados son los verificados.
2. **§8.2 — No hubo ciclo real `install/update/rollback/uninstall` con el asset
   descargado.** La cobertura es la de las pruebas focalizadas (HOME desechable, `gh`
   falso). No se observó el efecto de una instalación real sobre un HOME real.
3. **§8.3 — No se probó en macOS ni en arm64.** Todo se midió en `linux/x64`. Las
   identidades de los binarios darwin/arm64 se verificaron por digest, no por ejecución.
4. **§8.4 — La verificación remota es de metadatos.** `gh release view --json` devuelve
   el `digest` que calcula GitHub; el archivo congelado local coincide con éste, pero
   no se descargó el asset de nuevo para recomputar el sha256 desde el origen HTTP.
5. **§8.5 — H1/H2 son hallazgos documentales/código, no de comportamiento observado en
   ejecución real.** Se sostienen con dos patas: el contenido congelado dentro de
   `tower-v1.json` y la identidad byte a byte entre ese contenido y el árbol (§1.5). No
   se hizo una instalación real que dejara esos archivos en un `~/.claude` verdadero,
   por prohibición explícita del contrato.
6. **§8.6 — No se ejecutó el benchmark de hosts** (`benchmark.mjs`): requiere ambos
   hosts y cuota real. Su identidad quedó congelada (§1.5).
7. **§8.7 — Tickets/temporales en `/tmp`.** Las corridas aisladas dejaron directorios
   `mktemp` en `/tmp` (por ejemplo `/tmp/s181-dryrun-6BPWRH`). No se borraron: la
   política de esta sesión prohíbe `rm`. No contienen nada del HOME real.
8. **§8.8 — La revisión es de una sola pasada y de un solo revisor.** No hubo
   Judgment Day ni lectura adversarial.

---

## 9. Cierre

**Ningún hallazgo de este informe autoriza una reparación.** H1, H2, H3 y H4 quedan
como hallazgos de revisión, con su severidad y su `path:line`. Cualquier corrección de
`product/tower/v1/INSTALL-AGENTS.md`, del roster de `bundle.mjs`, del registro de hooks
de `runtime-config.mjs` o de `product/tower/generic/README.md` requiere **aprobación
humana nueva y alcance propio** — otra Sesión, con sus propios `archivos` autorizados.
En particular, H2 **no** autoriza quitar `torre-firma.sh` del roster ni desactivar el
hook: sólo deja registrado que la decisión B4 no está implementada en ningún release
publicado.

Esta Sesión tuvo **una sola escritura**: este informe. No se modificó código, plan,
documentación ni configuración; no se instaló, publicó, etiquetó ni commiteó nada; no
se tocó el HOME real, ni producción, ni terceros.

### Resumen de severidades

| # | Severidad | Objeto | Ubicación |
|---|---|---|---|
| H1 | Media | Afirmación falsa de no tocar la configuración global de agentes | `product/tower/v1/INSTALL-AGENTS.md:10-12,18` ↔ `product/tower/v1/runtime-config.mjs:15,22-25,336-337,360-370` |
| H2 | Media | B4 documentada y no implementada; el hook se registra pese a declarar que no se registra | `docs/architecture/definiciones-v1-v2-v3.md:43` ↔ `product/tower/v1/bundle.mjs:71-75`, `product/tower/v1/runtime-config.mjs:24,337`, `agent-workflows/tools/hooks/torre-firma.sh:2` |
| H3 | Baja | Interfaces antiguas documentadas como vigentes | `README.md:274-276` ↔ `product/tower/generic/README.md:26,29,33-34` ↔ `agent-workflows/tools/setup.sh:44,293-295` |
| H4 | Informativa | Prerrequisitos dejan telemetría de `go` en un HOME vacío | `product/tower/v1/install.mjs:22-35,160` |
