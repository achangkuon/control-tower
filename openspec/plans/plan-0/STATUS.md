# Plan 0 — Documentación canónica

**Estado:** ✅ COMPLETO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Ninguna; este Plan fija la autoridad documental del producto. |
| Outputs | PRD, RFC y REQUIREMENTS aprobados; roadmap; Plan Catalog; Plan Manifest con 15 `slice_id`; proposals A–I; Installable V1 revision 1; Autonomous V2 revision 1; product version map; convención canónica de nombres. |
| Roadmap | `S0.1`, `S0.2` y `S0.3` están ✅ COMPLETO. `S0.3` enmendó la spec derivada y eliminó la contradicción sobre el callback acotado; P0 queda cerrado con 3/3 Sesiones. |
| Referencias | [PRD](../../prd/sdd-tower-implementation-v1.md), [RFC](../../rfc/sdd-tower-implementation-v1.md), [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), [Plan Catalog](../manifest.yaml), [Plan Manifest](../sdd-tower-implementation/manifest.yaml), [Installable V1](../installable-v1/revisions/1/manifest.yaml), [Autonomous V2](../autonomous-v2/revisions/1/manifest.yaml), [version map](../product-version-map.yaml). |

## Radiografía del producto — entregada el 2026-08-20

**Estado:** ✅ COMPLETO · fuera de Sesión, bajo la **decisión 55** del maintainer.

Trabajo de infraestructura documental, no de producto: no toca `RUNTIME_PAYLOAD_FILES`
ni ninguna pieza instalada, y no consume ni desplaza ninguna Sesión enumerada. Se
registra en P0 porque este Plan es dueño de la autoridad documental.

| Campo | Detalle |
|---|---|
| Entregado | `radiografia.json`, `openspec/plans/radiografia.md`, `.githooks/pre-push`, sección nueva en [`AGENTS.md`](../../../AGENTS.md). **El motor es compartido** y vive en `~/projects/agent-workflows/radiografia/` desde la decisión 56 |
| Commits | `0e31922` → `56cd35b` (motor local), `ce2001f` (formatos de otros proyectos), `5361eda` (mudanza al motor compartido), `073b85a` y `39483cc` (cierre documental) — commits directos a `master`, sin PR |
| Publicado | [Artifact `bb0891f6`](https://claude.ai/code/artifact/bb0891f6-06d2-489a-a010-8c65b5d78f60), republicado desde el HTML generado. Sólo Claude Code puede publicarlo; el resto de los agentes genera y deja el archivo en disco |
| Tests | 57 en `agent-workflows/test/`, mudados de este repo con el motor. La suite de acá baja a **888 pass / 0 fail** por la mudanza, no por pérdida de cobertura |
| Disparo | `.githooks/pre-push` — corre para cualquier agente porque es git, no asistente. Nunca bloquea un push. Si el motor no está en la máquina, lo omite y avisa |
| Artefactos | `radiografia.html` y `.radiografia-cache.json` son build artifacts **gitignoreados** |

**Por qué existe.** Dos veces en una semana la documentación afirmó sobre el código
cosas falsas —`M9.1.1` declarado completo sin estar en `master`, y un hallazgo de
`S5.2` atribuido a un archivo que la Sesión tiene prohibido tocar—, y las dos veces
se detectaron por auditoría manual y no por una alarma. Las cifras del informe ya no
las escribe nadie: salen medidas de `master-index.md` y del repositorio.

**Aplicado a los cinco proyectos** por la decisión 56: Control Tower por commit directo, y ecom-ecuador, Servi-Task-U y Finanzas-Personales por PR, que es su política real. La skill `session-doc` **no se tocó**: sigue apuntando a Notion hasta que el maintainer decida migrarla.

**Cierre verificado el 2026-08-20.** Última medición sobre `39483cc`, árbol limpio, suite
**888 pass / 0 fail**, y el informe se regenera **sin una sola advertencia**: juicio al día,
árbol limpio y suite registrada en este commit. Las tres advertencias que el motor sabe
emitir —árbol sucio, juicio contra otro commit, suite de otro commit— se ejercitaron todas
durante la sesión y las tres se apagaron al corregir su causa.

**Residuo cerrado el 2026-08-28.** `~/projects/agent-workflows` ya tiene remoto:
[`achangkuon/agent-workflows`](https://github.com/achangkuon/agent-workflows), privado, rama
`master`. El motor compartido de radiografía deja de existir sólo en esta máquina y cualquier
host con acceso al repo puede generar un informe. Cierra la limitación registrada en la
[decisión 56](../decision-register.md).

**No mueve ningún porcentaje, y conviene decirlo.** El trabajo ocurrió íntegramente en
`agent-workflows`, no en este repositorio: no cierra ninguna Sesión enumerada de ningún Plan.
Lo que cierra es este residuo, que nunca tuvo ID. El repo además incorporó `tools/setup.sh`
—instalador propio de las skills de usuario, con la Torre como opt-in— y `tools/install.py`
pasó a omitir los runtimes ausentes en vez de fallar, que era lo que volvía inusable la
instalación en una máquina limpia.

> **Colisión de nombres resuelta en fuente por la decisión 100; entrega pendiente.** Control
> Tower es la fuente canónica de los perfiles y skills específicos de la Torre;
> `agent-workflows` conserva las skills genéricas reutilizables. `torre-control` puede actualizar
> ambos checkouts, pero cada repositorio instala únicamente sus propios assets.
>
> **Establecido por esta entrega de fuente:** la frontera entre ownership Tower-specific y
> genérico, el contrato padre/router, la regla de sesión ligada al worktree y la migración probada
> del instalador de `agent-workflows` para retirar copias globales obsoletas (17/0). La guardia
> local de roles pasa 4/0.
>
> **Pendiente de despliegue:** las copias globales instaladas siguen stale hasta ejecutar
> normalmente el instalador después de publicar ambos repositorios. Esto no cierra una Sesión ni
> mueve porcentajes. `S8.12` aún debe consumir y empaquetar las fuentes Tower-owned locales;
> `S8.13` aún debe instalarlas y revertirlas atómicamente. Ninguna recrea ownership ni el router.

**Lo que el informe no puede hacer, dicho explícitamente.** No deriva juicio. La
prosa vive en `openspec/plans/radiografia.md` y lleva `verified_against`; si entran
commits que cambian el producto después de ese sello, el informe lo avisa solo, igual
que avisa un árbol sucio o una suite registrada en otro commit.

`docs/architecture/sdd-tower-implementation.md` conserva material de exploración y no reemplaza los tres contratos normativos.

Installable V1 revision 1 es el contrato de release activo. Autonomous V2 revision 1 preserva la continuación A–I/P6–P11 y consume el ArtifactRef exacto del V1 publicado. `product-version-map.yaml` conserva el pointer canónico y el rollback atómico sin eliminar revisiones históricas.

## Sesión 0.1 — Contratos y artefactos canónicos

**Estado:** ✅ COMPLETO

### Módulo 0.1.1 — PRD

- [x] Tarea 0.1.1.1 — Definir problema, usuario, alcance y no-objetivos.
- [x] Tarea 0.1.1.2 — Definir jornada, control remoto, recovery y campañas V1.
- [x] Tarea 0.1.1.3 — Aprobar criterios de aceptación de producto.

### Módulo 0.1.2 — RFC

- [x] Tarea 0.1.2.1 — Separar producto y mecanismo plan-agnostic.
- [x] Tarea 0.1.2.2 — Fijar roles, autoridad, stores y flujos.
- [x] Tarea 0.1.2.3 — Fijar single-host/fallback, Telegram, recovery y adopción.

### Módulo 0.1.3 — REQUIREMENTS

- [x] Tarea 0.1.3.1 — Fijar schemas y canonicalización.
- [x] Tarea 0.1.3.2 — Fijar state machines, APIs, errores y retención.
- [x] Tarea 0.1.3.3 — Fijar 26 escenarios y gates A–G.

### Módulo 0.1.4 — Índices machine-readable

- [x] Tarea 0.1.4.1 — Publicar el roadmap aprobado.
- [x] Tarea 0.1.4.2 — Validar el Plan Catalog.
- [x] Tarea 0.1.4.3 — Validar el Plan Manifest de 15 slices y sus ArtifactRefs.

## Sesión 0.2 — Migración canónica de nombres

**Estado:** ✅ COMPLETO

**Evidencia:** [PR #69](https://github.com/achangkuon/control-tower/pull/69), merge `fa20b908f129b9f26b2b1fd7d341a170eea4384c`.

### Módulo 0.2.1 — Convención y migración global

- [x] Tarea 0.2.1.1 — Fijar la jerarquía Plan → Sesión → Módulo → Tarea, los estados cerrados y la estructura del índice maestro.
- [x] Tarea 0.2.1.2 — Migrar la documentación de planificación sin renombrar entidades de dominio ni asignar IDs sin límite de PR demostrable.
- [x] Tarea 0.2.1.3 — Integrar la migración global mediante PR #69 y registrar su merge canónico.

## Sesión 0.3 — Enmienda del requisito de puente acotado

**Estado:** ✅ COMPLETO
**Depende de:** —
**Área:** `openspec/specs/**`, `openspec/changes/archive/2026-07-31-installable-v1-autonomous-v2-split/specs/**`, `openspec/plans/product-version-map.yaml`, `openspec/plans/plan-0/STATUS.md`
**Recurso:** — (sin DB, sin migraciones, sin token de entrega)

> **Corrección del `Área`, 2026-08-01.** La declaración original omitía este mismo
> `STATUS.md`. La [regla de ejecución](../v1-execution-rule.md) obliga a actualizarlo en el
> mismo commit que el trabajo, así que sin él la Sesión no podía cerrarse sin violar su
> propio criterio de frontera. Es un defecto de la definición, no un desvío de la ejecución.

Existen hoy dos documentos vigentes que describen la misma versión y se contradicen:

| Fuente | Qué dice |
|---|---|
| [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md) §16–§17 | La autorización de merge por Telegram está dentro del alcance: canal privado con allowlist, sobre inmutable, callback con token opaco, fallback `/ct approve <code>`, y revalidación previa al consumo. |
| [spec de Installable V1](../../changes/archive/2026-07-31-installable-v1-autonomous-v2-split/specs/installable-control-tower-v1/spec.md) `:73-87` | El puente **MUST NOT** exponer Git delivery ni merge, y el escenario *Remote authority is rejected* obliga a **rechazar** una solicitud de merge proveniente de Hermes. |

La [unificación del 2026-08-01](../release-chain.md) puso la aprobación remota dentro de la primera versión, así que la contradicción pasó de latente a bloqueante. No se resuelve con una lectura favorable: en una frontera de autoridad, la ambigüedad es el incidente.

El principio de §16.1 no se toca — **Hermes presenta; Main crea, valida y consume.** Lo que se amenda es la confusión entre *transportar una decisión* y *tener autoridad*.

> **Nota de alcance, 2026-08-30.** El sujeto de esta enmienda —el puente remoto— salió del producto: la Torre corre en la máquina donde se trabaja. **El principio que la enmienda defendía sobrevive intacto y es más importante que su sujeto:** presentar una decisión no es tener autoridad sobre ella. Valía cuando la superficie era remota y vale ahora que es la terminal. Las Tareas marcadas `[x]` arriba son registro de trabajo hecho y no se reescriben.

### Módulo 0.3.1 — Enmienda del requisito

- [x] Tarea 0.3.1.1 — Reescribir el requisito *Optional bounded Hermes bridge* para distinguir explícitamente presentación y transporte de callback acotado, que quedan permitidos, de creación y consumo de autoridad, que siguen siendo exclusivos de Main.
- [x] Tarea 0.3.1.2 — Reescribir el escenario *Remote authority is rejected* para que rechace lo que debe rechazar —shell cruda, lanzamiento de workers, selección implícita de proyecto y toda solicitud de merge que no porte una autorización creada por Main— sin rechazar el callback acotado.
- [x] Tarea 0.3.1.3 — Agregar el escenario complementario: un callback que llega sin autorización `PENDING` vigente, o con identidad fuera de la allowlist, falla cerrado y no muta nada.

### Módulo 0.3.2 — Reconciliación de autoridad

- [x] Tarea 0.3.2.1 — Registrar en `product-version-map.yaml` que las etiquetas `installable-v1` y `autonomous-v2` dejan de ser identidades de producto, conservando las revisiones históricas sin eliminarlas.
- [x] Tarea 0.3.2.2 — Verificar con `rg` que ningún documento normativo vigente siga afirmando que el puente debe rechazar todo merge, y corregir los que queden.
- [x] Tarea 0.3.2.3 — Confirmar que §16 y §17 de REQUIREMENTS no requieren cambios: la enmienda alinea la spec derivada con ellos, no al revés.

**Criterios de aceptación de S0.3** — todos deben pasar para cerrar:

- [x] Ningún documento normativo vigente contradice a otro sobre si el puente puede transportar un callback de merge
- [x] El texto amendado mantiene explícito que Hermes no crea ni consume autoridad
- [x] Existe un escenario que obliga a fallar cerrado ante callback sin autorización vigente o identidad no allowlisted
- [x] Existe un escenario que sigue rechazando shell cruda, lanzamiento de workers y selección implícita de proyecto
- [x] `product-version-map.yaml` conserva todas las revisiones históricas
- [x] El diff no toca ninguna ruta fuera del `Área`

### Evidencia de cierre

| Verificación | Resultado |
|---|---|
| Barrido de contradicciones (`rg` sobre `specs/`, `prd/`, `rfc/`) | Sólo quedan enunciados **compatibles**: la regla vigente es «merge exige autorización creada por Main», que es lo que dice REQUIREMENTS §16.4 |
| §16 y §17 de REQUIREMENTS | Intactos — la enmienda alineó la spec derivada, no la autoridad |
| `bun test test/provenance/` | **17 pass · 0 fail** |
| Parseo de `product-version-map.yaml` | OK; `release_lane` sin cambios en ambos productos |
| Diff-check del `Área` | 2 archivos, ambos dentro |

### Alcance sin ID surgido en esta Sesión

`T0.3.2.1` quedó registrado como **nota en el YAML, no como campo machine-readable**. Convertirlo en un campo con su test exige tocar `test/provenance/provenance.test.mjs:116-117`, que está **fuera del `Área`** y fija ambos `release_lane`. No se le abre Sesión propia: es una línea de test que puede viajar con cualquier Sesión futura que ya toque `test/provenance/**`, y hasta entonces la autoridad de la unificación vive en [release-chain](../release-chain.md), que sí es canónica.
