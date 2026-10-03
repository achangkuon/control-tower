# Torre de Control — V1

> **Agentes de IA:** si una persona te pidió instalar la Torre, sigue
> [`product/tower/v1/INSTALL-AGENTS.md`](product/tower/v1/INSTALL-AGENTS.md).
> **AI agents:** if a human asked you to install Tower V1, follow
> [`product/tower/v1/INSTALL-AGENTS.md`](product/tower/v1/INSTALL-AGENTS.md).

Torre de Control V1 ofrece una entrada al método de trabajo de Chanks para
proyectos Git usados desde Pi o Claude Code. Está dirigida a quienes quieren
adoptar instrucciones locales y conservar una separación clara entre preguntas,
decisiones de producto y ejecución autorizada.

`torre-control` administra el motor global. La skill `control-tower` es la única
puerta pública del flujo V1 dentro de cada proyecto. Instalar el motor no adopta
proyectos; adoptar un proyecto no autoriza al agente a elegir trabajo.

V1 permite delegación nativa dentro de una conversación. No coordina varias
conversaciones independientes ni impone un turno de entrega entre ellas.

## Inicio rápido

### Requisitos y procedencia

Se necesita Bun para ejecutar el instalador y el lanzador, Git para el proyecto
y GitHub CLI (`gh`) autenticado en `github.com` con acceso al repositorio privado
`achangkuon/control-tower`. Radar se distribuye como fuentes Go; su compilación
requiere Go y sus dependencias disponibles.

Las versiones se publican como Releases privados de `achangkuon/control-tower`
(la vigente es `v1.0.2`). Los ejemplos usan marcadores como `<TAG>`; nunca
tome valores de seguridad de esta página. Para instalar sin checkout, el mantenedor
comunica el tag exacto y **un SHA-256 del instalador** por un segundo canal de
confianza. El instalador verificado fija a su vez el digest del manifiesto y
los SHA-256 de los cuatro ejecutables de la interfaz visual.

**Nunca tome el SHA-256 de la misma página del Release que suministra el asset.**
La CLI exige el digest, pero no puede comprobar cómo se obtuvo. Debe ser un
SHA-256 completo en hexadecimal minúsculo. No se acepta `latest` ni hay una ruta
alternativa de descarga cuando falla la adquisición autenticada.

### Instalar el motor global

La ruta principal no requiere checkout: siga la [Guía para socios](#guía-para-socios)
para descargar, verificar y ejecutar el instalador con un solo comando.

Como alternativa para mantenedores, desde una copia revisada del repositorio:

```bash
bun product/tower/v1/cli.mjs install --tag '<TAG>' --asset tower-v1.json --sha256 '<SHA256_DEL_MANIFIESTO>'
```

Esta alternativa exige el SHA-256 independiente del **manifiesto**, no el del
instalador; tampoco permite ejecutar bytes sin verificar.

La descarga usa `gh`, verifica el SHA-256 antes de interpretar el asset y valida
un manifiesto positivo de rutas y archivos permitidos, con límites de tamaño.
Solo después publica la versión y activa el lanzador.

| Ubicación predeterminada | Contenido |
|---|---|
| `~/.local/bin/torre-control` | Lanzador estable del motor activo |
| `~/.local/share/torre-control/v1` | Estado global y versiones retenidas |
| `~/.local/share/torre-control/projects` | Registro informativo de proyectos |
| `~/.local/share/torre-control/tui` | Interfaz visual verificada y registro de la versión elegida |

Los siguientes ejemplos de diagnóstico usan la ruta completa del lanzador;
no dependen de que `~/.local/bin` esté en `PATH`.

### Adoptar un proyecto y verificar

Revise el proyecto y apruebe expresamente las escrituras antes de ejecutar
`init`. Sustituya `/ruta/absoluta/proyecto` por su raíz Git real, absoluta y
canónica; no se infiere a partir del directorio actual.

```bash
~/.local/bin/torre-control project init --project /ruta/absoluta/proyecto --trust trusted
~/.local/bin/torre-control project doctor --project /ruta/absoluta/proyecto
~/.local/bin/torre-control doctor
```

`--trust trusted` declara la aprobación para adoptar. **No cambia la confianza
del host.** En Pi todavía debe aprobar la carga de recursos del proyecto por su
flujo de confianza o mediante `--approve`; consulte [Adopción por host](#adopción-por-host).

Un diagnóstico global sano devuelve `status: "healthy"`; sin instalación devuelve
`status: "absent"`. El diagnóstico de proyecto entrega el resultado local bajo
`localResult` y el resultado del registro bajo `registry`.

## Guía para socios

### Preparar el entorno

| Plataforma | Estado | Requisitos |
|---|---|---|
| Linux | Probado en WSL | Bun, Git, Go, `gh` autenticado y `shasum` (Perl); instalarlos con el gestor de paquetes o sus guías oficiales |
| macOS | **NO probado todavía**; pendiente de prueba guiada | Bun, Git, Go y `gh`; `shasum` viene con el sistema. Homebrew puede instalar los requisitos: `brew install oven-sh/bun/bun git go gh` |
| Windows | Solo vía WSL | Usar la terminal y los requisitos de Linux dentro de WSL |

Torre de Control **no se distribuye por Homebrew**. Claude Code o Pi deben estar
instalados por separado. La compilación posterior de Radar necesita las
dependencias Go disponibles. Autentique `gh` con `gh auth login` y compruebe
`gh auth status`: su cuenta debe tener acceso al repositorio privado.

### Instalar con un comando

Pida al mantenedor el `<TAG>` exacto y `<SHA_DEL_INSTALADOR>` por un segundo canal
de confianza. **Nunca obtenga el SHA de la página del Release.** Sustituya ambos
marcadores antes de pegar esta línea en bash o zsh, en Linux o macOS:

```bash
d=$(mktemp -d) && gh release download '<TAG>' -R achangkuon/control-tower -p torre-install.mjs -D "$d" && printf '%s  %s\n' '<SHA_DEL_INSTALADOR>' "$d/torre-install.mjs" | shasum -a 256 -c - && bun "$d/torre-install.mjs"
```

En Linux sin Perl, sustituya `shasum -a 256 -c -` por `sha256sum -c -`.
Si la descarga o el checksum falla, el instalador **no se ejecuta**: deténgase
y confirme los datos con el mantenedor. No use `latest` ni scripts alternativos.
El directorio `$d` conserva el instalador descargado para inspección; los
temporales internos del instalador se eliminan al terminar.

El instalador comprueba los requisitos y descarga el manifiesto `tower-v1.json`
del tag fijado. Verifica su SHA-256 antes de leer JSON, verifica cada miembro y
solo entonces invoca la instalación V1, que descarga y valida nuevamente.
El mismo comando también **actualiza** una instalación sana: comprueba `doctor`
y elige `update` en lugar de `install`, incluso si el motor ya está en esa versión.
Si el diagnóstico falla, se detiene sin intentar reparar.
Para una prueba guiada sin instalación global, cambie únicamente el último
comando por `bun "$d/torre-install.mjs" --dry-run`: sí descarga y verifica.

### Abrir la interfaz visual

Tras activar PATH, ejecute `torre-control` sin argumentos en una terminal.
La interfaz muestra el motor y su versión, proyectos registrados, requisitos,
agentes disponibles y sistema. Permite instalar o actualizar, volver a la
versión anterior, gestionar proyectos y consultar el diagnóstico o la ayuda.
Use **↑/↓ o j/k** para moverse, **Enter** para elegir, **Esc** para volver,
**r** para refrescar y **q o Ctrl-C** para salir. Las escrituras requieren los
pasos de confirmación de cada operación; abrir la interfaz no adopta proyectos.

El instalador descarga solo el ejecutable fijado para Linux o macOS, en amd64
o arm64, mediante `gh` autenticado y el tag exacto. Comprueba tamaño y SHA-256
antes de instalarlo. Cada apertura vuelve a comprobar el registro local y el
SHA-256 del ejecutable antes de iniciarlo. Si falta, no es verificable o no se
puede iniciar, aparece un aviso y se abre el menú integrado. En otras plataformas
se omite la interfaz, sin impedir la instalación del motor.

Para usar directamente el menú integrado: `TOWER_MENU=plain torre-control`.
La interfaz se guarda fuera de `v1`, en `tui/<sha256>/torre-tui`, con un registro
`current.json` reemplazado atómicamente. Se conservan las versiones anteriores;
no se borran automáticamente. La activación del motor y la interfaz son pasos
separados: un fallo posterior no implica que se haya deshecho la actualización
del motor. `rollback` del motor no cambia el registro de la interfaz.

### Activar PATH, adoptar y abrir el host

macOS no incluye `~/.local/bin` en PATH de forma predeterminada. Añada esta línea
a `~/.zshrc` (zsh) o `~/.bashrc` (bash), y ejecútela también en la terminal actual:

```bash
export PATH="$HOME/.local/bin:$PATH"
torre-control project init --project /ruta/absoluta/proyecto --trust trusted
torre-control project doctor --project /ruta/absoluta/proyecto
cd /ruta/absoluta/proyecto
claude
# O, en lugar de Claude Code:
pi --approve
```

Revise el proyecto antes de declararlo confiable; `--trust trusted` no aprueba
por sí solo la confianza del host. Para deshacer la adopción, use
`torre-control project uninstall --project /ruta/absoluta/proyecto`.
`project cleanup --project /ruta/absoluta/proyecto` solo retira un journal
residual intacto, no una adopción activa. Para revertir el motor global, use
`torre-control rollback`; no existe desinstalación global ni poda pública en V1.

### Publicar: procedimiento para el mantenedor

Después de revisar y entregar un commit limpio que incluya el instalador,
cree una carpeta de salida **fuera del repositorio**, con ambos archivos y el
subdirectorio `tui` aún ausentes. Se necesita Go local y sus módulos ya presentes
en la caché del operador; el constructor no descarga dependencias. Sustituya commit, tag y rutas; no publique desde un árbol modificado:

```bash
bun product/tower/v1/release-build.mjs --commit '<COMMIT>' --out /ruta/externa/tower-v1.json --tag '<TAG>' --installer-out /ruta/externa/torre-install.mjs --tui-out-dir /ruta/externa/tui
gh release create '<TAG>' --repo achangkuon/control-tower --target '<COMMIT>' /ruta/externa/tower-v1.json /ruta/externa/torre-install.mjs /ruta/externa/tui/torre-tui-linux-amd64 /ruta/externa/tui/torre-tui-linux-arm64 /ruta/externa/tui/torre-tui-darwin-amd64 /ruta/externa/tui/torre-tui-darwin-arm64
```

El constructor lee ambos contenidos del commit y exporta las fuentes Go de ese
mismo árbol con `git archive`, nunca del directorio de trabajo. Compila los cuatro
ejecutables sin CGO, con rutas recortadas, sin build ID ni red y con caché de
compilación desechable. Para un mismo commit y toolchain Go, los bytes son
reproducibles. Sella exactamente una línea
`const PINNED` con repositorio, tag, asset, digest del manifiesto y rutas
permitidas y hashes de la interfaz, y rechaza sobrescrituras. El instalador no es miembro del manifiesto.
La línea JSON contiene `sha256` (manifiesto), `installerSha256` (instalador) y
`tui` (asset, tamaño y SHA-256 por plataforma).
Comunique **`installerSha256` y el tag** al socio por el segundo canal, no solo
en las notas del Release. Sin las nuevas banderas, el constructor sigue
produciendo únicamente el manifiesto.

## Comandos entregados

Las opciones son pares de bandera y valor. Los comandos y subcomandos son
posicionales; se rechazan opciones desconocidas, duplicadas o sin valor.
`<RAÍZ>` significa una raíz de proyecto absoluta y canónica.

| Invocación de `torre-control` | Operación |
|---|---|
| Sin argumentos, en terminal interactiva | Abre la interfaz visual verificada o el menú integrado |
| `install --tag <TAG> --asset <ASSET> --sha256 <SHA256>` | Instala desde un Release fijado explícitamente |
| `update --tag <TAG> --asset <ASSET> --sha256 <SHA256>` | Adquiere y activa otra versión verificada |
| `doctor` | Verifica el estado global sin reparar ni descargar |
| `rollback` | Activa la versión anterior o restaura el lanzador original |
| `project init --project <RAÍZ> --trust trusted` | Adopta el proyecto explícitamente |
| `project doctor --project <RAÍZ>` | Verifica la adopción y publica su pertenencia al registro |
| `project uninstall --project <RAÍZ>` | Restaura los destinos locales originales |
| `project cleanup --project <RAÍZ>` | Retira un journal residual bajo condiciones estrictas |
| `list` | Consulta únicamente las raíces ya registradas y su estado vivo |

También se admiten `--state <RUTA>`, `--launcher <RUTA>` y `--registry <RUTA>`.
Cambian las ubicaciones usadas por su operación correspondiente, no el origen
del Release ni la raíz explícita del proyecto. Las rutas deben cumplir las
validaciones de seguridad; los padres de las rutas sustitutas deben existir.
No sitúe el registro dentro del estado global: son almacenes separados.

### Menú, salida y errores

El menú solo aparece si entrada y salida son TTY. Sin argumentos en un entorno
no interactivo, la CLI falla; utilice un subcomando explícito para scripts.
El menú ejecuta una selección y usa el mismo despachador que los comandos.

Para actualizar, revertir, desinstalar o limpiar desde el menú se debe escribir,
respectivamente, `UPDATE`, `ROLLBACK`, `UNINSTALL` o `CLEANUP`.
Estas confirmaciones pertenecen al menú: los subcomandos explícitos no las piden.

Los subcomandos escriben su resultado como JSON en stdout. El menú añade sus
opciones y preguntas, por lo que no es una interfaz de stdout exclusivamente JSON.
Los errores van a stderr. El código de salida es `0` al completar sin error
(incluida la salida voluntaria del menú) y `1` al fallar.

Si una operación local termina bien pero falla la publicación o limpieza del
registro, stdout conserva `localResult` y `registry.status: "failed"`.
Se informa el fallo por stderr y la CLI devuelve `1`: eso **no significa** que
la adopción local se haya deshecho.

Un `AggregateError` añade una línea JSON acotada en stderr con
`type: "tower.cli.recovery/1"`. Conserve esa evidencia; no es una instrucción
para eliminar locks ni una autorización de recuperación automática.

## Las piezas y cómo funciona

| Pieza | Responsabilidad |
|---|---|
| `product/tower/v1/cli.mjs` | Comandos cerrados, menú y resultados |
| `release.mjs` y `bootstrap.mjs` | Adquisición autenticada, digest y manifiesto |
| `global.mjs` | Versiones, activación, rollback y lanzador |
| `adoption.mjs` y `project-files.mjs` | Copias locales, diagnóstico y restauración |
| `projects.mjs` | Registro informativo separado del estado global |
| `skills/control-tower/` | Entrada pública y referencias bajo demanda |

Las rutas abreviadas de la tabla son relativas a `product/tower/v1/`.
El estado global conserva `active` y `previous`; las versiones se identifican
por el SHA-256 del asset. Actualizar no borra automáticamente versiones antiguas
ni actualiza las copias de skills de los proyectos.

El registro no concede confianza, no autoriza adopciones y no explora carpetas
para descubrir repositorios. `list` reconcilia las raíces registradas con su
estado actual; no adopta, repara ni elimina entradas.

V1 reemplaza las instrucciones anteriores basadas en `install.sh`, `setup.sh`,
el lanzador `torre` y el motor antiguo. No importa su base de datos, sus locks
ni sus estados. Esas interfaces no forman parte de este inicio rápido.

## Adopción por host

`init` instala los mismos contenidos de la skill para ambos hosts y las fuentes
de Radar. Mantiene un journal con los destinos originales y los instalados:

| Destino dentro del proyecto | Función |
|---|---|
| `.control-tower/radar/` | Fuentes Go de Radar, no un ejecutable precompilado |
| `.agents/skills/control-tower/` | Skill local para Pi |
| `.claude/skills/control-tower/` | Skill local para Claude Code |
| `.control-tower-adoption-v1/state.json` | Journal de adopción y restauración |

Los árboles existentes en esos destinos se guardan en el journal antes de ser
sustituidos. La adopción no añade bloques administrados a `AGENTS.md` ni a
`CLAUDE.md`. Tampoco modifica la configuración de confianza del host.

### Pi

Pi descubre `.agents/skills/` en el proyecto y sus ancestros hasta la raíz del
repositorio. Los recursos locales protegidos solo se cargan si el proyecto
está aprobado. La declaración de confianza de `init` no sustituye esa decisión.

Desde el proyecto revisado, puede conceder aprobación para esa ejecución:

```bash
pi --approve
```

También puede usar el flujo de confianza de Pi. En modos sin diálogo interactivo,
no suponga que el host pedirá aprobación ni que cargará las skills locales.
La confianza controla la carga de recursos; **no es una barrera de seguridad**
para las acciones que ejecute el agente con los permisos del usuario.

### Claude Code

Claude Code usa `.claude/skills/`, sus subagentes nativos y `CLAUDE.md`, no
`AGENTS.md`. La disponibilidad de la skill en Pi no demuestra su disponibilidad
en Claude Code, ni a la inversa. No hay un enrutador entre hosts en V1.

### Entrada única y referencias bajo demanda

`control-tower` distingue una pregunta informativa de una solicitud de trabajo.
Una pregunta admite texto libre y no autoriza ejecución. Para ejecutar trabajo,
el humano debe seleccionar una unidad elegible con alcance delimitado.

La entrada carga `references/adoption.md` solo ante intención de adopción y
`references/authority-and-questions.md` solo cuando necesita selección o decisión.
No se deben cargar ambas referencias al inicio. ODD es el camino técnico por
defecto; SDD se utiliza únicamente cuando el humano lo solicita expresamente.

## Garantías acotadas y reversibilidad

### Motor global

La adquisición exige autenticación de `gh`, tag y asset explícitos y el digest
independiente. El manifiesto rechaza miembros extraños o ausentes y divergencias
de contenido. Esto no prueba que el código publicado sea inocuo ni sustituye
la revisión del origen y del segundo canal.

Update y rollback a una versión anterior activan mediante el reemplazo atómico
del registro de estado. La primera instalación y la restauración inicial
cambian estado y lanzador en pasos ordenados: **no son una transacción atómica
entre ambos recursos** ni una garantía frente a pérdida de energía.

Si existe `previous`, rollback intercambia la versión activa y la anterior.
Sin versión anterior, restaura los bytes y el modo del lanzador original conocido,
o lo retira si originalmente no existía. Las versiones publicadas se conservan.
No hay un comando público de desinstalación global ni de poda de versiones en V1.

Solo se migra el lanzador heredado generado cuyo contenido completo coincide
con la plantilla conocida. Se conserva su copia para restaurarlo. Un lanzador
ajeno se preserva y bloquea la instalación; no se ejecuta para reconocerlo.

### Proyecto: operaciones distintas

- **Init:** escribe las copias locales después de la aprobación explícita.
- **Doctor:** comprueba journal, contenido, modos y miembros instalados; no repara.
  Su wrapper público también escribe pertenencia al registro informativo.
- **Uninstall:** rechaza cambios en los destinos antes de retirar contenido;
  restaura los árboles originales y retira el journal al terminar.
- **Cleanup:** solo retira un journal intacto cuando los destinos ya coinciden
  con los originales y las instantáneas original e instalada son distintas.
  No sustituye a uninstall ni elimina una adopción activa.

La restauración se limita a los destinos capturados; no revierte commits,
acciones del agente ni cambios externos. Doctor de proyecto compara además la
instalación con el bundle del motor que lo ejecuta: una copia de otra versión
puede requerir revisión, no una reparación automática.

Las compensaciones pueden fallar. El motor global conserva evidencia y locks
cuando no logra compensar; no los reclama automáticamente. El registro y la
adopción son recursos separados, sin atomicidad conjunta. Estas comprobaciones
no constituyen un sandbox contra un proceso malicioso del mismo usuario.

## Resultados medidos — S173

Medición del **2026-10-02**, en modo `capture-only`: se capturó por loopback el
primer POST de inferencia de cada host en fixtures aisladas, con y sin adopción.
Los reintentos no se sumaron. El prompt fue `What does this project do?`.
No se obtuvo respuesta de un modelo real.

| Host observado | Request sin adopción → con adopción (bytes) | Delta request | Delta texto de sistema | Delta tools |
|---|---|---|---|---|
| Pi 1.0.0 | 5 906 → 6 595 | +689 | +675 | +0 |
| Claude Code 2.1.287 | 64 386 → 64 499 | +113 | +112 | +0 |

Son **bytes de request, no tokens**. El texto de sistema se mide como texto UTF-8;
`tools` se mide tras decodificar y serializar su JSON. Los valores dependen de
la versión del host, el modelo, el prompt y el HEAD; no son un ahorro general.

Radar compilado desde la copia adoptada y Radar compilado independientemente
desde la fuente canónica dieron resultados iguales en código de salida, stdout
y stderr para el plan mínimo válido, el plan ausente y `schema_version: 2`.
El HEAD de cada fixture permaneció sin cambios tras ambas invocaciones.

La pregunta ordinaria y la selección accidental de `control-tower` están
**NO MEDIDAS en V1**, por decisión del mantenedor. Una lista de skills en un
request no demuestra que el modelo haya seleccionado o ejecutado alguna.

Desde este repositorio, el arnés entregado se invoca así:

```bash
bun product/tower/v1/benchmark.mjs --hosts pi,claude
```

Emite un informe `tower.v1.benchmark/1`. Requiere ambos hosts y Go con sus
módulos disponibles para el contraste offline; un host bloqueado o un contraste
bloqueado/diferente produce salida de error, no un resultado favorable inventado.
La opción `--real-model` requiere una clave de operador en `ANTHROPIC_API_KEY` y
puede realizar llamadas de pago; ese modo no se ejecutó para los resultados citados.

Las capturas y las imágenes del flujo solo prueban lo observado. **Nunca prueban
seguridad, ausencia de efectos secundarios ni reversibilidad del ciclo de vida.**

## Si algo no funciona

| Síntoma | Qué revisar |
|---|---|
| Interfaz no verificada; aparece el menú integrado | Confirmar el instalador por el segundo canal y repetir el mismo comando; `TOWER_MENU=plain` fuerza el menú sin ejecutar la interfaz |
| Falla la adquisición | Autenticación y acceso de `gh`, tag y asset exactos; no hay fallback |
| Divergencia de SHA-256 | Detenerse y confirmar el digest por el segundo canal; no usar el del mismo Release |
| Lanzador desconocido | Conservarlo; la migración solo acepta la plantilla heredada exacta |
| Directorio o ancestro inseguro | Ruta canónica, enlaces, propietario y permisos; no eludir la validación |
| Pi no carga la skill | Confianza del proyecto y ubicación `.agents/skills/control-tower/` |
| Doctor de proyecto rechaza cambios | Comparar copias y journal; no borrar evidencia para forzar uninstall |
| Cleanup rechaza la operación | Los destinos deben estar ya restaurados; no sirve para quitar una adopción activa |
| Registro fallido con resultado local | Revisar `localResult`, stderr y evidencia antes de repetir una escritura |
| Locks o evidencia de recuperación | Conservarlos y solicitar revisión; no hay recuperación automática pública |

Use el diagnóstico global para inspeccionar el motor y el diagnóstico de proyecto
para la raíz concreta. No son intercambiables. Un registro sano no prueba una
adopción autorizada y una captura exitosa no prueba una instalación segura.

## Lo que V1 no hace; V2 y V3

V1 no ofrece el interruptor del motor antiguo, mensajería entre conversaciones,
reserva de Sesiones ni candado de escritura. El alcance se sostiene mediante
instrucciones y revisión, no mediante bloqueo técnico de archivos.

El trabajo paralelo de V1 permanece dentro de una sola conversación, usando las
capacidades nativas del host. Dos conversaciones podrían seleccionar la misma
Sesión sin aviso; V1 no promete entrega serializada entre ellas.

- **V2 — Pista:** reserva de Sesiones y entrega ordenada para varias conversaciones
  independientes por proyecto. No es una capacidad entregada por V1.
- **V3 — Torre automática:** despacho con Herdr, Pi Intercom y ejecución sellada
  desatendida. No es una capacidad entregada por V1.

V1 no instala ni promete procesos persistentes, sockets, supervisión ni rutas
de despacho entre hosts. El servidor loopback del benchmark es un instrumento
temporal de medición, no un servicio de coordinación.

Los límites de versión están registrados en
[Definiciones de V1, V2 y V3](docs/architecture/definiciones-v1-v2-v3.md).
