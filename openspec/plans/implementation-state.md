# Estado de implementación — Control Tower

> Este documento mide **código**, no planificación. El [master-index](master-index.md) dice qué está planificado y qué Sesiones cerraron; este archivo dice qué existe, qué corre y qué está desplegado.
>
> **Medición global: 2026-08-10 sobre `origin/master@b360c8a`.** Esta es la primera re-medición completa desde el 2026-07-31. Reemplaza las cifras históricas y los cortes acotados de `S5.4` y `S5.6`. Inventario de módulos, suite de pruebas, estado de despliegue y las cinco brechas fueron re-observados directamente, no heredados.
>
> **Nota de vocabulario (2026-08-01, vigente):** la columna `Lane` no nombra dos productos. Tras la [unificación](release-chain.md), `installable-v1` y `autonomous-v2` son afinidad de trabajo. El corte real en código es `bin/torre`, que rechaza capacidades con `CT_V2_ONLY` como flag opt-in apagado por defecto.

## ✅ Corrección mayor: el corte de runtime se ejecutó

**La afirmación «lo que corre a diario no es el código de este repositorio» quedó obsoleta el 2026-08-03 y este documento la sostuvo una semana de más.**

Verificado el 2026-08-10:

| Comprobación | Resultado |
|---|---|
| `~/.local/bin/torre` | symlink → `versions/4f9400191afa32e26daae3c19ed722d8fd1700f5/bin/torre` (2026-08-03 18:54) |
| `torre diagnose` | `{"operation":"diagnose","healthy":true,"active":"4f940019…","missing":[]}` |
| md5 `core.mjs` instalado | `be2991486f8e45029d3998a1a057ab13` |
| md5 `Main/core.mjs` | `be2991486f8e45029d3998a1a057ab13` — **idéntico** |
| md5 legado `~/.config/opencode/control-tower/core.mjs` | `1ba9a58984eccd113ec52f3f2bf1f9b5` — **distinto, no se alcanza** |

`bin/torre` resuelve el runtime desde `install/active-pointer.mjs` contra el data-root XDG. La ruta legada `$HOME/.config/opencode/control-tower/core.mjs` sobrevive únicamente como fallback en la expansión de `CORE` y no se ejecuta mientras el puntero activo resuelva.

La versión activa corresponde al commit `4f94001` (2026-08-03). Los commits que cerraron el corte son `3d2ef57`, `34f56a6`, `fed8fb0`, `a87c9e9`, `e118f33` y `d56e8cb`, entre el 1 y el 3 de agosto.

**Causa del error sostenido:** las actualizaciones del 2026-08-10 (`S5.4`) y 2026-08-11 (`S5.6`) fueron cortes acotados a sus paths verificados y ninguna re-observó el runtime. La sección se propagó sin re-medición durante siete días, y el `master-index` replicó la brecha 1 como abierta.

### Ramas `M8.8.x` — ninguna está bloqueada

Auditadas las siete el 2026-08-10:

| Rama | Estado real |
|---|---|
| `feat/installable-v1/m8-8-1-legacy-xdg-coverage` | ancestro de `master` — label muerto |
| `docs/v1-m8-8-1-closure` | ancestro de `master` — label muerto |
| `feat/installable-v1/m8-8-3-runtime-cutover` | ancestro de `master`, **sin commits propios** |
| `fix/installable-v1/m8-8-4-adoption-preflight` | ancestro de `master`, **sin commits propios** |
| `fix/installable-v1/m8-8-6-active-pointer-resolution` | ancestro de `master` — label muerto |
| `fix/installable-v1/m8-8-7-copied-entrypoint` | ancestro de `master`, **sin commits propios** |
| `fix/installable-v1/m8-8-4-runtime-payload` | no integrada: 1 commit con `test/install/runtime-payload.test.mjs` (56 líneas, RED) |

La única no integrada es un duplicado huérfano: `test/install/runtime-payload.test.mjs` ya existe en `origin/master` con otro blob, producto de que el trabajo se rehizo por la vía `3d2ef57 → d56e8cb`. No hay trabajo pendiente en ninguna de las siete; hay ramas sin podar.

## ⚠️ Hallazgo principal vigente: se despliega el sustrato, no el producto

El corte de runtime resolvió *qué* código corre. No resolvió *cuánto*.

`RUNTIME_PAYLOAD_FILES` (en `install/runtime-payload.mjs`) define un cierre cerrado de seis archivos. Todo lo demás queda fuera del artefacto instalable.

**Desplegado — 5.338 líneas, 6 archivos**

| Archivo | Líneas |
|---|---:|
| `core.mjs` | 4.646 |
| `install/lifecycle.mjs` | 244 |
| `bin/torre` | 225 |
| `install/runtime-payload.mjs` | 90 |
| `install/active-pointer.mjs` | 81 |
| `install/version-store.mjs` | 52 |

**No desplegado — 4.141 líneas, 17 superficies**

| Módulo | Líneas | Estado |
|---|---:|---|
| `mcp.mjs` | 437 | Superficie MCP legada. |
| `dashboard/` | 413 | Skeleton autenticado read-only con fuente mock. Sin fuente real. |
| `hosts/` | 383 | Lanzamiento e inspección de hosts. |
| `registry/` | 337 | `store`, `path`, `legacy-import`. `S2.4`, `S2.5`. |
| `main-store/` | 331 | `authority`, `store`. P2 Change A. |
| `plugin/` | 268 | Superficie de plugin. |
| `escalation/` | 243 | `request` (30), `routing` (213). `S5.4`. |
| `contracts/` | 577 | Base P2 Change A + `session-plan-snapshot.mjs` (191) de `S5.6`. |
| `schemas/` | 202 | 19 contratos JSON versionados, incl. `session-plan-snapshot-v1`. |
| `support/` | 200 | `agent`, `manifest`, `snapshot`. `S8.4`. |
| `capabilities/` | 174 | — |
| `console/` | 173 | `validate`, `vocabulary`. |
| `enroll/` | 140 | Enrollment explícito de proyectos. |
| `policy/` | 116 | — |
| `workspace/` | 89 | — |
| `continuation/` | 35 | — |
| `jornada/` | 23 | — |

**El 44% del código de producto no viaja en el artefacto instalable.**

### Observación estructural: los módulos del producto son los más chicos

`jornada/` tiene 23 líneas y `continuation/` tiene 35. Son los dos módulos más pequeños del repositorio y nombran las dos capacidades centrales del producto: la Jornada autónoma y la continuación entre Sesiones. Ninguno de los dos se despliega.

Por contraste, `core.mjs` — el sustrato monolítico que ningún lane reclama — concentra el 87% de todo lo que efectivamente corre.

Esta es la asimetría que este documento debe reportar: **el sustrato está desplegado y el producto no está construido.**

## Inventario agregado

| Superficie | Líneas | Archivos |
|---|---:|---:|
| Producto (`.mjs`/`.js`) | 9.031 | — |
| Contratos (`schemas/*.json`) | 202 | 19 |
| Pruebas | 12.645 | 38 archivos ejecutados |
| Documentación (`openspec/**.md`) | 19.826 | 126 |

Ratio documentación : código de producto = **2,2 : 1**.

## Estado de las pruebas

Medido el 2026-08-10 en `Worktrees/s5-6` sobre `origin/master@b360c8a`, Torre desarmada:

```
bun test → 588 pass · 0 fail · 3452 expect() · 38 archivos · 77,96 s
```

Coincide con la evidencia de verificación de `S5.6`. Precondiciones confirmadas y aún sin runbook:

1. **La Torre debe estar desarmada.** Con `.git/control-tower/ACTIVE` presente, los dos `P0 frozen snapshot restore` cortan con `Control Tower must be OFF`. Es el fail-closed funcionando, no una regresión.
2. **El runner es `bun`, no `node`.**
3. **Un worktree nuevo no tiene `node_modules`;** sin `bun install` la suite rompe con `Cannot find package 'yaml'`.
4. **Ruido nuevo, no cubierto:** la corrida emite dos `fatal: Needed a single revision` en stderr. No hacen fallar ninguna prueba, pero indican que alguna superficie invoca `git rev-parse` contra una revisión inexistente y traga el error. Sin diagnosticar.

## Cortes de implementación publicados

### `S5.4` — enrutamiento de escalación

✅ COMPLETO y publicado. Comportamiento en `976b8d0` y `75549a7` (tree `835ed3e`), cierre documental `f9f2869`, reconciliación `e82f4ae`. Agrega `escalation/{request,routing}.mjs` y sus pruebas: 578 líneas, sin tocar el authorization store. Recheck 8082: `findings: []`, `READY`. Enfocada: `bun test test/escalation` → 16/0/78.

No existe transporte ni autenticación remota: el repositorio define la frontera y deja el callback inhabilitado hasta `S8.7`.

### `S5.6` — snapshot canónico de Sesión

✅ COMPLETO y publicado en `origin/master@b360c8a`. Límites de comportamiento `20e06c5`, `8cf7aab`, `10ae5e0`, `4de42fe`; `f0103fd` congela el verify PASS. Change archivado en [`2026-08-11-s5-6-canonical-session-snapshot`](../changes/archive/2026-08-11-s5-6-canonical-session-snapshot/); spec normativa en [`session-plan-snapshot`](../specs/session-plan-snapshot/spec.md).

Siete paths aprobados: schema, registro, validación, parser y tres superficies de prueba/fixture. El parser resuelve el grafo Plan 5 en dominios local y graph-only externo y rechaza drift, ambigüedad o referencias inconsistentes con `CT_SCHEMA_INVALID`. No importa `continuation/**`, Engram, DB, Tower, runtime ni writers. Biblioteca pura, sin adopción externa.

Verificación: 31/31 escenarios, 10/10 Tareas, 10/10 criterios.

**Costo medido de la Sesión, ruta `full-sdd`:**

| Superficie | Líneas |
|---|---:|
| Código de producto | 282 |
| Pruebas | 345 |
| Documentación `openspec/` | ~1.395 |

Ratio documentación : código = **4,9 : 1** para una biblioteca pura de 282 líneas sin consumidores.

## Brechas reales

| # | Brecha | Estado 2026-08-10 |
|---|---|---|
| 1 | El runtime en uso es el checkout legado | ✅ **CERRADA el 2026-08-03.** Verificada por symlink, `diagnose` y md5 idéntico. La brecha permaneció declarada abierta siete días de más. |
| 2 | `S8.5` LISTO pero UNASSIGNED | Superada el 2026-07-31. `S8.5` y `S8.6` en 🟡 DIFERIDO por decisión del maintainer. |
| 3 | `core.mjs` tiene 4.646 líneas y ningún lane lo reclama | **Abierta y agravada.** Es el 87% de lo que corre. No bloquea V1, pero ninguna Sesión enumerada lo reclama ni lo modulariza. |
| 4 | Se documentaba más de lo que se construía | 🔴 **REABIERTA.** Ver abajo. La corrección declarada el 2026-07-31 no se sostuvo. |
| 5 | El registro de la Torre no coincide con los worktrees reales | **Abierta y cambiada de forma.** Ver abajo. |
| 6 | El 44% del código de producto no se despliega | **Nueva y estructural.** No es que falte una Sesión que lo empaquete: el contrato del payload lo **prohíbe**. Ver abajo. |
| 7 | La Torre no puede supervisar un repositorio sin estar armada dentro de ese repositorio | **Nueva.** Bloquea el modo nocturno en los dos repositorios en uso. Ver abajo. |

## Brecha 6 — el payload rechaza estructuralmente el resto del código

`scanClosure` (`install/runtime-payload.mjs:57`) **rechaza todo directorio que no sea `bin` o `install`**. Está documentado en `plan-8/STATUS.md:313`:

> «`runCli` llama a `readRuntimePayload(source)` en modo **strict**, y `scanClosure` rechaza todo directorio que no sea `bin` o `install`. Un checkout del repositorio **nunca** puede ser `source`: falla en `console/`, y detrás vienen `contracts/`, `test/` y `openspec/`.»

Consecuencia: `contracts/`, `registry/`, `main-store/`, `escalation/`, `capabilities/`, `console/`, `hosts/`, `workspace/`, `enroll/`, `policy/`, `jornada/` y `continuation/` **no pueden entrar al artefacto instalable** sin modificar `RUNTIME_PAYLOAD_FILES` y `scanClosure`.

Ninguna Sesión enumerada declara ese cambio. `S4.2/M4.2.3` cablea el composition root del fence, que es otra cosa: habilita la ruta productiva dentro del repositorio, no el empaquetado.

**Riesgo declarado:** se pueden cerrar todas las Sesiones restantes y que la mitad del producto siga sin viajar en la instalación.

## Brecha 7 — la Torre no puede supervisarse a sí misma ni a Remote Control

El sellado de implementación desatendida exige supervisión viva de la Torre. Los dos repositorios en uso tienen una razón de diseño para exigir lo contrario:

| Repositorio | Mecanismo | Efecto con la Torre armada |
|---|---|---|
| `control-tower` | `test/helpers/restore-fixture.mjs:90` — `assertRuntimeInactive` lanza si existe `ACTIVE` | Los dos tests P0 abortan → la verificación final falla → `BLOCKED` terminal sin reintento |
| `remote-control` | `src/tower-guard.js:226` — `allowed = remote && off` | El relay entra en `status: "frozen"`; se congela justo la función que se está construyendo |

Con la Torre desarmada, el sello no arranca (`NOT_READY`). Con la Torre armada, rompe. No hay estado que satisfaga ambos.

`decision-register.md:52` registra este bloqueo como **específico de `control-tower`** («para cualquier otro proyecto, sellar con la Torre armada funciona»). Esa afirmación **no se sostiene**: `remote-control` falla también, por un mecanismo distinto y deliberado.

El requisito real que se deriva: **la Torre necesita poder supervisar un repositorio sin estar armada dentro de ese repositorio.** No existe Sesión enumerada que lo cubra.

## Brecha 4 — reabierta

Declarada «corregida» el 2026-07-31 por la [regla de ejecución V1](v1-execution-rule.md) y el archivado. Re-medida sobre `origin/master@b360c8a`:

| Ventana | `docs` | Código (`feat`+`fix`+`test`) | Ratio |
|---|---:|---:|---|
| Historial completo | 132 | 70 | **1,9 : 1** |
| Últimos 40 commits | 25 | 14 | **1,8 : 1** |

Changes abiertos: **9**. Archivados: **6**.

El ratio no mejoró tras la corrección declarada. La regla de ejecución V1 no cambió la proporción observable.

## Brecha 5 — deriva del registro de la Torre

Re-observada el 2026-08-10 con `torre status` y `git worktree list`. La Torre reporta STALE y advierte que los registros son historial.

| Agente registrado | Rama registrada | Estado | Worktree real |
|---|---|---|---|
| `Main` | `docs/autonomous-v2-checkpointe…` | WORKING | Existe, pero está en `master` — **la rama registrada no es la del worktree** |
| `s0-3` | `docs/s0-3-bridge-amendment` | COMPLETE | **No existe** |
| `s3-1` | `fix/installable-v1/m8-8-6-acti…` | COMPLETE | **No existe** |
| `v1` | `fix/installable-v1/m8-8-4-adop…` | COMPLETE | **No existe** — el worktree fue eliminado |
| `v2` | `feat/autonomous-v2/role-routed…` | ASSIGNED · **2 pendientes** | Existe, en `feat/plan-5/s5-4-escalation-routing` — rama distinta |

Worktrees reales no registrados: `Worktrees/s5-1` (en `feat/plan-5/s5-2-delivery-workflow`) y `Worktrees/s5-6` (en `feat/plan-5/s5-6-session-snapshot`). `Worktrees/support-agent` no está registrado y así debe seguir: Support es read-only por diseño.

Consecuencias operativas:

1. **La capacidad que reporta la Torre es ficción.** Tres de cinco agentes registrados no existen.
2. **Ningún agente registrado tiene la rama correcta.** Los dos que existen (`Main`, `v2`) están en ramas distintas a las anotadas.
3. **El trabajo real es invisible para la Torre.** Las dos Sesiones activas (`S5.2`, `S5.6`) corren en worktrees que la Torre no conoce.
4. **Hay 2 mensajes encolados para `v2`** bajo una rama que ya no es la suya. `receive` sólo lee filas no consumidas y nada las reproduce.

No se corrigió nada: desregistrar agentes y purgar cola son mutaciones del registro, y una sesión de Support read-only no tiene autoridad para ejecutarlas.

## Deriva de checkout observada

`Main` está **11 commits atrás** de `origin/master` al momento de esta medición. Los 11 son la Sesión `S5.6` completa, publicada el 2026-08-10. Cualquier medición o brief tomado desde `Main` sin actualizar reporta un estado anterior a `S5.6`.

## Qué NO mide este documento

Cobertura de pruebas por módulo, rendimiento, y el grado de conformidad contra los Gates A–G de REQUIREMENTS. Esa evidencia es el output de `S7.1` y todavía no existe.

Tampoco mide qué parte del loop autónomo está resuelta fuera del repositorio, en las skills que ya operan en producción. Esa comparación es una decisión de producto pendiente, no una medición de código.
