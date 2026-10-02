# Control Tower + Gentle AI — configuración lazy y distribución por proyecto

> **Estado:** investigación arquitectónica read-only; no implementada ni aprobada como contrato de runtime.
>
> **Propósito:** conservar la investigación del carril limpio de Gentle para compararla con una investigación independiente de Claude sin reconstruir la conversación.
>
> **Snapshot de autoría:** `control-tower@290507b416e6e24ce39c81fd02ca85d79d90a3e6` (`work/S164`). El experimento visual comparado se ejecutó en el mismo worktree `demo/torre-b`, con `gpt-5.6-sol` y esfuerzo `high` en ambos carriles.
>
> **Límite:** este documento no reemplaza `openspec/plan.yaml`, no selecciona una Sesión, no autoriza implementación, no modifica configuraciones personales y no declara listo un paquete distribuible.

## 1. Veredicto

La fricción observada no proviene del modelo ni del worktree. El carril configurado agrega tres costos acumulativos:

1. **Contexto global:** un `APPEND_SYSTEM.md` de 354 líneas y decenas de descriptores de skills adicionales.
2. **Runtime global:** paquetes y extensiones con trabajo en startup, turnos o tool calls.
3. **Routing ambiguo:** Gentle, Chanks/Radar y Herdr ofrecen caminos que el agente debe reconciliar antes de actuar.

La solución es separar **distribución** de **activación**:

- Gentle Pi y Engram permanecen globales y livianos.
- Los binarios `control-tower` y `radar` pueden estar globalmente disponibles porque no entran por sí solos al prompt.
- Control Tower se activa únicamente en proyectos que lo adoptan.
- Un proyecto adoptante expone una skill frontal y un kernel de enforcement pequeño.
- Los procedimientos detallados son referencias lazy, no 28 skills simultáneamente descubribles.
- Herdr, Intercom y otras integraciones se inicializan al usarse, salvo los floors que deban interceptar una mutación desde el inicio.

> **Control Tower debe ser globalmente distribuible, pero localmente activado.**

## 2. Alcance y método

La investigación buscó explicar por qué la configuración completa se percibe más lenta y restrictiva que Gentle-only, y cómo convertir Control Tower en un producto instalable que acompañe a Gentle sin duplicarlo.

Se usaron:

- seis capturas del experimento A/B y sus transcriptos;
- configuraciones limpia y completa;
- la skill Herdr y las reglas Chanks de despacho;
- documentación instalada de Pi sobre skills, packages, extensions, settings, CLI y project trust;
- el instalador, package parcial y tests de Control Tower;
- una exploración read-only independiente para contrastar hallazgos.

No se ejecutaron instaladores, no se cambiaron configuraciones, no se corrieron suites y no se modificó el plan.

## 3. Comparación A/B corregida

Una primera lectura confundió una fila de `git worktree list --porcelain` con el worktree activo. Las capturas completas corrigieron esa interpretación:

| Variable | Carril limpio | Carril configurado |
|---|---|---|
| Worktree visible | `demo/torre-b` | `demo/torre-b` |
| Modelo | `gpt-5.6-sol` | `gpt-5.6-sol` |
| Esfuerzo | `high` | `high` |
| Resultado básico | Workspace + tres agentes | Workspace + tres agentes |
| Mutaciones Git | Ninguna | Ninguna |

No fue un benchmark cronometrado perfecto, pero las diferencias de configuración quedan como causa plausible y parcialmente comprobada.

## 4. Diferencias de carga

### 4.1 Carril limpio

`~/.pi/agent-limpio/settings.json` carga esencialmente:

- `gentle-engram@0.1.12`;
- `gentle-pi@3.7.0`.

No tiene un `APPEND_SYSTEM.md` equivalente ni las extensiones personales del carril configurado. Las capturas mostraron aproximadamente once skills Gentle anunciadas.

### 4.2 Carril configurado

`~/.pi/agent/settings.json` agrega:

- `pi-intercom`;
- `pi-web-access`;
- `pi-btw`;
- `pi-mcp-adapter`;
- Gentle Pi y Engram.

También carga un `APPEND_SYSTEM.md` medido en 354 líneas y extensiones personales como:

- `chanks-controls.ts`;
- `gentle-agent-state.ts`;
- `herdr-agent-state.ts`;
- `moshi-hooks.ts`;
- `orca-agent-status.ts`.

Las capturas mostraron unas cincuenta skills. En el snapshot de autoría existen 55 `SKILL.md` bajo `~/.agents/skills`; 28 corresponden al inventario instalado por este repositorio.

### 4.3 Qué significa “lazy” en Pi

Pi carga las skills en dos etapas:

1. al iniciar, incorpora al system prompt `name`, `description` y `path` de cada skill descubierta;
2. cuando una tarea coincide, el modelo lee el `SKILL.md` completo.

El cuerpo es lazy, pero el catálogo no es gratuito. Más skills globales implican más contexto y más rutas que comparar. `disable-model-invocation: true` exige invocación explícita, pero no convierte una instalación global masiva en costo cero.

## 5. Costos de runtime comprobados

Se observaron caminos adicionales reales. Esto prueba costo potencial, no cuántos milisegundos aporta cada componente.

| Componente | Trabajo observado |
|---|---|
| `chanks-controls.ts` | Git en `session_start` y checks alrededor de tool calls |
| `herdr-agent-state.ts` | Reporte por socket; un fallo puede consumir intentos de 500 ms y 1500 ms |
| `pi-intercom` | Broker en background y presencia por turno/herramienta |
| `pi-mcp-adapter` | Inicialización esperada desde `session_start` |
| `pi-btw` | Restauración de threads durante startup |
| Moshi/Orca | Eventos de lifecycle y estado, mayormente asíncronos pero no gratuitos |

No se concluye que deban eliminarse. Deben activarse donde aportan valor y medirse por ablación.

## 6. Fricción de routing

### 6.1 “Retomemos lo último”

- El carril limpio reconstruyó alternativas y presentó una elección acotada.
- El configurado activó Chanks/Radar antes de identificar neutralmente el trabajo y exigió un ID aprobado.

Radar debe proteger la admisión de una Sesión, pero preguntar qué quiso decir el humano no concede autoridad. El orden recomendado es:

```text
frase ambigua
  → aclarar la identidad del trabajo
  → clasificar: continuidad técnica o Sesión de producto
  → si es Sesión, ejecutar admisión fresca con Radar
  → sólo después, implementar o despachar
```

### 6.2 Herdr y `--wait`

El carril limpio envió tres prompts y luego esperó. El configurado ejecutó:

```text
prompt AGT 1 --wait
prompt AGT 2 --wait
prompt AGT 3 --wait
```

Eso serializó el lote aunque la respuesta final afirmó paralelismo.

La evidencia tiene alcances distintos:

- `~/.pi/agent/skills/herdr/SKILL.md` muestra `prompt ... --wait` para un agente;
- las reglas Chanks prohíben esperar entre workers durante el despacho formal de Sesiones mediante Intercom;
- la prueba era coordinación Herdr genérica, no despacho formal.

El hueco está en el lote Herdr genérico. Falta una regla como:

```text
Para dos o más encargos independientes, enviar todos los prompts sin --wait.
Después esperar y recolectar cada resultado. No declarar paralelismo si se
esperó un resultado antes de enviar el siguiente encargo.
```

## 7. Instalación actual de Control Tower

`agent-workflows/tools/install.py` declara estáticamente:

- 26 skills `chanks-*`;
- 2 skills auxiliares;
- `_shared` como convenciones.

El instalador:

1. escribe las skills siempre en `~/.agents/skills`;
2. las replica en raíces globales de Claude, OpenCode y Codex cuando existen;
3. actualiza instrucciones globales, incluido `~/.pi/agent/APPEND_SYSTEM.md`;
4. generaba `~/.pi/agent/extensions/chanks-controls.ts` en el snapshot de autoría;
5. insertaba en ese archivo imports absolutos hacia el checkout actual.

> **Corrección (2026-10-01):** los pasos 4 y 5 ya no ocurren. Por la decisión B4 de
> `docs/architecture/definiciones-v1-v2-v3.md`, el instalador dejó de generar
> `chanks-controls.ts` (el candado de escritura pasa a V2) y archiva de forma reversible la
> copia instalada bajo `~/.pi/agent/.retired-controls/`. La fuente se conserva en el repositorio.

`agent-workflows/tools/setup.sh` prepara los archivos globales y delega al instalador. El `install.sh` legacy también lo invoca.

Consecuencias:

- todos los repositorios pagan el catálogo;
- la extensión corre fuera de proyectos Control Tower;
- la instalación queda ligada a la ruta de un checkout;
- moverlo puede dejar imports obsoletos;
- el producto se comporta como configuración personal del mantenedor.

## 8. Capacidades locales de Pi

| Recurso | Ubicación de proyecto |
|---|---|
| Configuración y paquetes | `.pi/settings.json` |
| Extensiones | `.pi/extensions/` |
| Skills Pi | `.pi/skills/` |
| Skills Agent Skills | `.agents/skills/` |
| Prompt adicional | `.pi/APPEND_SYSTEM.md` |

Pi permite:

```bash
pi install --local <paquete>
```

La declaración queda en `.pi/settings.json` y se carga tras project trust. Los filtros de un Pi package permiten incluir o excluir paths concretos.

Una precisión: el `APPEND_SYSTEM.md` del proyecto reemplaza al del agent directory; no se combinan. Un producto compartible no debería usarlo como integración principal porque podría ocultar instrucciones legítimas del usuario.

## 9. Frontera Control Tower–Gentle

| Control Tower posee | Gentle posee |
|---|---|
| Autoridad de producto y Radar | ODD y SDD |
| Zona, Sesión y elección humana | Exploración y descomposición técnica |
| Cimientos, Recursos y compatibilidad | TDD, implementación y refactor |
| Asignación y topología de workers | Subagentes técnicos |
| Evidencia de despacho y cierre | Review, RDD y commits |
| Coordinación de producto | Continuidad técnica y memoria |

El puente debe ser mínimo:

```text
Sesión autorizada por Control Tower
  → encargo técnico normalizado
  → Gentle ejecuta ODD o SDD
  → evidencia técnica
  → Control Tower registra cierre de producto
```

Control Tower no debería reexplicar cómo investigar, programar, testear, revisar o crear commits.

## 10. Arquitectura objetivo

```text
Usuario
├── Gentle Pi + Engram                 globales
├── control-tower / radar CLI          globales, fuera del prompt
└── Proyecto adoptante
    ├── AGENTS.md                      kernel breve
    ├── .pi/settings.json              paquete Pi local
    ├── .agents/skills/control-tower/  puerta portable
    └── configuración Control Tower    plan y política
```

### 10.1 Una skill frontal

El consumidor debería anunciar una única skill precisa:

```yaml
---
name: control-tower
description: >
  Coordinate product work only in repositories that adopted Control Tower.
  Use for Radar status, Zona/Session admission, human selection, worker
  dispatch, product closure, or Control Tower maintenance.
---
```

Los procedimientos serían referencias internas:

```text
control-tower/
├── SKILL.md
└── references/
    ├── admission.md
    ├── planning.md
    ├── dispatch.md
    ├── herdr.md
    ├── closure.md
    └── delivery.md
```

Sólo `SKILL.md` se anuncia; las referencias se leen según la ruta.

### 10.2 Kernel siempre activo

Debe limitarse a floors previos a cualquier mutación:

- el humano elige trabajo de producto;
- Radar es autoridad de admisión;
- no hay mutación de producto antes de admisión;
- Control Tower coordina producto y Gentle ejecuta técnicamente;
- operaciones irreversibles conservan aprobación humana.

### 10.3 Integraciones on-demand

Deben inicializarse al usarse cuando el contrato lo permita:

- Intercom y Herdr;
- MCP y web;
- BTW;
- Moshi/Orca;
- procesos, sockets y watchers.

Un gate que debe bloquear una mutación no puede cargarse después. Sí puede ser local al proyecto, pequeño, cacheado y ausente de repositorios no adoptantes.

## 11. Packaging

### 11.1 Paquete existente

`extensions/pi/package.json` ya declara un Pi package, pero:

- es privado y versión `0.0.0`;
- sólo expone `tower-session-router.ts`;
- no está declarado en `.pi/settings.json`;
- falta el activation JSON esperado;
- no expone una instalación de producto completa.

Es una semilla, no un paquete distribuible.

### 11.2 Raíz versus package boundary dedicado

Usar la raíz como package boundary es la migración más pequeña porque evita mover árboles existentes. No es necesariamente la frontera pública correcta:

- la raíz es privada y contiene todo el monorepo;
- aumenta el riesgo de publicar recursos accidentales;
- acopla al consumidor a la estructura interna;
- mezcla producto, desarrollo, tests e historia.

La arquitectura objetivo favorece un paquete dedicado:

```text
packages/control-tower-pi/
├── package.json
├── extensions/control-tower-kernel.ts
├── skills/control-tower/SKILL.md
├── references/
└── bin/control-tower.mjs
```

Una primera migración puede usar la raíz en un fixture y extraer la frontera antes de publicar.

## 12. Instalación del producto

El flujo objetivo sería:

```bash
control-tower init
control-tower doctor
control-tower update
control-tower uninstall
```

`init` debería:

1. detectar el repositorio;
2. declarar el Pi package en `.pi/settings.json`;
3. instalar una puerta portable en `.agents/skills/control-tower`;
4. agregar un bloque mínimo y administrado a `AGENTS.md`;
5. no escribir en `$HOME` por defecto;
6. mostrar qué extensiones ejecutables solicita confiar;
7. producir una instalación reversible.

El paquete puede estar cacheado globalmente; su activación permanece ligada al proyecto. Otros runtimes recibirían adaptadores locales que apunten al mismo contrato, no copias globales de toda la familia Chanks.

## 13. Clasificación propuesta de skills

| Clase | Tratamiento objetivo |
|---|---|
| Autoridad, Radar y admisión | Kernel o referencias runtime |
| Planificación de producto | Perfil de planificación |
| Herdr y despacho | Perfil operativo opcional |
| Puente y cierre | Adaptadores delgados hacia Gentle y plan |
| Creación/mejora de skills | Sólo autoría y mantenimiento |
| ODD/SDD/TDD/review técnico | Delegar a Gentle |
| Historia y candidatos | No cargar como instrucciones |

No deberían instalarse por defecto en consumidores:

- `chanks-0-skill-composer`;
- `skill-orchestrator`;
- herramientas internas de creación;
- documentación de construcción;
- maquinaria Tower no estable.

Deben auditarse como adaptadores, no necesariamente eliminarse:

- `chanks-4-unattended-implementation`;
- `chanks-5-politica-de-entrega`;
- `chanks-0-session-context-loader`;
- partes de `chanks-4-puente`.

Esta investigación no autoriza borrados.

## 14. Migración segura

1. Crear el paquete consumidor y probarlo en un fixture.
2. Demostrar que funciona sin copias globales.
3. Incorporar skill frontal y kernel mínimo.
4. Implementar `init`, `doctor` y `uninstall` locales.
5. Retirar sólo copias globales byte-identical administradas.
6. Archivar copias modificadas por el usuario.
7. Eliminar únicamente bloques marcados de instrucciones globales.
8. Retirar `chanks-controls.ts` sólo si coincide con el generado.
9. Dejar Gentle, Engram y configuración ajena intactos.
10. Medir otra vez antes de retirar más componentes.

## 15. Restricción del repositorio constructor

`.pi/settings.json` está vacío y `test/extensions/pi/tower-skill-exposure.test.mjs` exige que este repositorio no exponga su maquinaria Tower mientras la construye.

Debe conservarse:

- probar el consumidor en fixture o sandbox;
- no convertir este repo silenciosamente en consumidor;
- mantener `product/tower/skills/*` como fuente contractual no expuesta;
- exigir V1 estable y autorización humana para una activación interna futura.

El payload XDG también excluye skills y extensiones Tower. No debe ampliarse accidentalmente antes de fijar el contrato distribuible.

## 16. Benchmark necesario

Repetir el mismo prompt, commit, modelo y esfuerzo al menos tres veces por variante.

### Variantes

1. Gentle + Engram limpio.
2. Limpio + prompt Control Tower.
3. Variante 2 + catálogo de skills.
4. Variante 3 + kernel de enforcement.
5. Variante 4 + integraciones operativas.
6. Paquete local objetivo.

### Métricas

- startup hasta input listo;
- prompt hasta primera acción útil;
- tiempo hasta entregar tres encargos y completar el lote;
- tool calls previas a la acción principal;
- skills y extensiones cargadas;
- contexto antes y después del primer turno;
- Git, sockets o procesos durante startup;
- rutas incorrectas y aclaraciones evitables;
- afirmaciones inconsistentes, como declarar paralelo un lote serial.

### Éxito

- repositorio no adoptante: cero recursos Control Tower;
- adoptante: idealmente una skill frontal;
- tareas técnicas comunes: Gentle toma la ruta directa;
- tareas de producto: Control Tower activa Radar;
- Herdr/Intercom no arrancan antes de necesitarse;
- imports relativos al paquete, nunca absolutos al checkout;
- instalación y desinstalación reversibles;
- overhead local medido y explícito.

## 17. Comparación con Claude

La comparación debe separar hechos, interpretación y decisión.

### Hechos que deberían coincidir

- Pi anuncia metadatos de todas las skills descubiertas.
- El instalador actual copia 28 skills Control Tower a superficies globales.
- `APPEND_SYSTEM.md` agrega contexto global sustancial.
- `chanks-controls.ts` se generaba globalmente con imports absolutos; desde el 2026-10-01 el instalador ya no lo genera (decisión B4).
- existen hooks con trabajo real en startup o eventos.
- `.pi/settings.json` está vacío intencionalmente.
- existe un Pi package parcial en `extensions/pi/package.json`.
- el repositorio constructor prohíbe exponer maquinaria Tower.
- Gentle y Control Tower se superponen en routing aunque no en nombres o bytes.

### Decisiones a contrastar

- raíz del repo versus paquete dedicado;
- una skill frontal versus perfiles con varias skills;
- floors siempre activos;
- integraciones realmente lazy;
- soporte de runtimes distintos de Pi;
- retiro global sin perder personalizaciones;
- costo de checks Git por tool call;
- responsabilidades Chanks que deben ser adaptadores de Gentle.

### Incertidumbres conservadas

- costo exacto de cada extensión;
- por qué el carril limpio omitió skills globales bajo el mismo HOME aparente;
- frontera final npm/git;
- cantidad mínima de descriptores;
- compatibilidad cross-host de una skill Agent Skills común;
- overhead del kernel en tareas no relacionadas dentro de un proyecto adoptante.

Formato sugerido para el contraste:

```text
hallazgo
  → evidencia compartida
  → diferencia de interpretación
  → decisión pendiente
  → experimento que la resuelve
```

## 18. Fuentes

### Pi

- `docs/skills.md`;
- `docs/packages.md`;
- `docs/extensions.md`;
- `docs/settings.md`;
- `docs/configuration.md`;
- `docs/cli.md`;
- `docs/security.md`;
- `examples/extensions/dynamic-tools.ts`.

### Control Tower

- `agent-workflows/tools/install.py`;
- `agent-workflows/tools/setup.sh`;
- `install.sh`;
- `extensions/pi/package.json`;
- `extensions/pi/tower-session-router.ts`;
- `.pi/settings.json`;
- `agent-workflows/tests/test_install.py`;
- `test/extensions/pi/tower-skill-exposure.test.mjs`;
- `test/extensions/pi/tower-session-router.test.mjs`;
- `install/runtime-payload.mjs`;
- `AGENTS.md`.

### Configuración observada

- `~/.pi/agent/settings.json`;
- `~/.pi/agent/APPEND_SYSTEM.md`;
- `~/.pi/agent/skills/herdr/SKILL.md`;
- `~/.pi/agent/extensions/*`;
- `~/.pi/agent-limpio/settings.json`;
- `~/.agents/skills/*`.

## 19. Próximo paso

Comparar este documento con el informe de Claude y producir una tabla de convergencia. Sólo después corresponde preparar una propuesta acotada de implementación que:

- conserve `openspec/plan.yaml` como autoridad;
- no autoactive la maquinaria candidata en este repositorio;
- separe migración global de publicación del paquete consumidor;
- preserve los floors de seguridad;
- mida rendimiento antes y después.
