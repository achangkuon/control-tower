# Migración al modelo de zonas

> **Constancia de trabajo.** Este archivo es la fuente de verdad de QUÉ estamos haciendo,
> qué está implementado localmente y qué falta. El razonamiento completo, con dibujos, está en
> el documento de decisión:
> https://claude.ai/code/artifact/e92d2b38-10ad-480d-b7b2-ba9cc68283ec
>
> La autoridad del flujo es [FLUJO-END-TO-END.md](FLUJO-END-TO-END.md). El reparto de tres
> escritores de [EJECUCION-EN-PARALELO.md](EJECUCION-EN-PARALELO.md) describe la construcción
> inicial y queda como historia útil; la corrección actual usa **un solo escritor secuencial**.
>
> Última reconciliación: 2026-09-03 · corrección de código verificada en
> `agent-workflows` `feat/modelo-de-zonas@4d3010c`; la rama sigue sin push. Las ocho correcciones
> C1–C8 están decididas y la corrección de Fase A está integrada; **ninguna decisión del maintainer
> la bloquea**. El cierre pendiente es un defecto del harness RDD, documentado abajo.

---

## 📍 Punto de retoma

**Cerrado localmente:** la corrección de Fase A está integrada en
`feat/modelo-de-zonas@4d3010c` y conserva una unidad revertible en
`fix/fase-a-rdd-correction@f7ea11a`: 184 líneas de diff sobre diez archivos. Radar focal y completo,
`go vet`, los 26 tests del instalador y `git diff --check` pasaron. El contrato ya exige schema v3,
admite decisiones cerradas, conserva la profundidad de la ruta propuesta, acepta bases Git
ancestrales y evita retirar skills antes de que terminen las escrituras que pueden fallar. El gate
de recursos vivos permanece deliberadamente en MAIN/Tower y Fase C; `radar` solo pronostica.

**Runtime sincronizado en disco:** `python3 tools/install.py` propagó las once skills `chanks-*` y
los contratos relacionados a `~/.agents`, Claude, OpenCode y Codex; retiró las cuatro copias
obsoletas previstas y `python3 tools/install.py --check` devolvió `OK`. Los bytes fuera de los dos
bloques manuales propiedad del instalador quedaron preservados. Los runtimes abiertos deben
reiniciarse; OpenCode todavía necesita un smoke vivo antes de afirmar que cargó la política.

**Revisión nativa — causa raíz identificada 2026-09-03:** el bloqueo no era un defecto de runtime.
El linaje `review-4b55f432bbdf7f40` se congeló con selector `base-diff` (`base_ref` `a01986ee`), y la
STATUS canónica sin selector siempre proyecta `current-changes`. Como la identidad del target se
deriva del selector, el proveedor responde `applicability: unrelated` y ofrece un START nuevo.
Verificado desde tres worktrees, incluido un candidate view con el árbol congelado byte a byte.
`--lineage` no lo corrige: con y sin el flag el target computado es idéntico. Claude Code, OpenCode
y Pi reproducen lo mismo, así que no es el skew de versión de Pi. Con `--base-ref` + `--committed-only`
el proveedor **sí** reconoce el linaje: `applicability: current_target` con el `target_identity`
congelado `sha256:cf2f5302…`. El linaje sigue en `correction_required` y no se declara aprobado.
Reportado en Gentleman-Programming/gentle-ai#3551.

**Entregado parcialmente (2026-09-03):** `feat/modelo-de-zonas` fue pusheada a `origin`
(`f7bd95e..565ba21`, 26 commits); la rama quedó en sync. `feat/fase-a-radar`, `feat/fase-a-skills` y
`docs/fase-a-canon` ya estaban integradas en esa rama. **`fix/fase-a-rdd-correction@f7ea11a` NO se
mergeó a propósito**: su árbol `ad2a11d` es el candidato corregido que el linaje RDD espera, y
rebasearla (está 5 commits atrás) o borrar el worktree `implementer-1` destruiría ese candidato.
Control Tower y Herdr siguen sin pushear. El binario instalado `herdr --skill` todavía expone el
contrato viejo. El residuo legacy sin trackear `tools/plan/plan` sigue presente y no se borra ni se
ignora sin decisión del maintainer.

**Siguiente acción exacta:** rescatar `review-4b55f432bbdf7f40` con el runbook registrado en la
política global de RDD — leer `.state.initial_atomic_start.selector` del store y re-dirigir la STATUS
con ese selector — y continuar únicamente por el `next_transition` que devuelva. Recién con el linaje
cerrado, mergear `fix/fase-a-rdd-correction`, reiniciar los runtimes y ejecutar el smoke vivo de
OpenCode. Solo entonces cerrar Fase A y comenzar Fase B.

---

## Cómo leer el estado: tres ejes distintos

| Eje | Pregunta | Estado actual |
|---|---|---|
| **Fuente local** | ¿El cambio existe en un commit o worktree local? | Sí: la corrección de Fase A está integrada y verificada en `4d3010c`. |
| **Remoto** | ¿La rama o commit fue pusheado? | Sí para `feat/modelo-de-zonas` (2026-09-03, 26 commits). No para `fix/fase-a-rdd-correction`, Control Tower ni Herdr. |
| **Runtime instalado** | ¿Lo ejecutan hoy los agentes/binarios instalados? | Parcial: `chanks-*` está sincronizado en disco, pero los runtimes abiertos deben reiniciarse y OpenCode requiere smoke vivo; `herdr --skill` sigue viejo. |

Un cambio puede estar implementado y verificado **localmente** sin estar pusheado ni instalado.
Este documento no usa “cerrado localmente” como sinónimo de “entregado”.

## 📊 Estado de un vistazo

Los únicos significados usados abajo son: `✅ implementado y verificado`, `🔵 parcial`,
`🟡 pendiente` y `📚 fuera de alcance`.

| Grupo | ID | Estado | Fuente local | Remoto | Runtime instalado / qué falta |
|---|---|---|---|---|---|
| Implementación | Fase A | 🔵 parcial | Corrección integrada y verificada en `4d3010c` | No | Reparar el cierre RDD y completar el smoke de OpenCode |
| Implementación | Fase B | 🟡 pendiente | Control Tower aún no tiene `openspec/plan.yaml` ni ROADMAP; conserva `master-index`/`STATUS` legacy | No | Migrar el plan real después de cerrar Fase A |
| Implementación | Fase C | 📚 fuera de alcance | Sin implementación en esta obra | No | Gate de recursos vivos, medidor, conexión del Horizonte, freeze terminal y `S9.9` |
| Flujo | Tramo 1 · Autoridad | ✅ implementado y verificado | Corregido en `4d3010c` | No | Reiniciar runtimes |
| Flujo | Tramo 2 · Planificación | ✅ implementado y verificado | Corregido en `4d3010c`; no existe madre de planificación | No | Reiniciar runtimes |
| Flujo | Tramo 3 · Enrutado | ✅ implementado y verificado | Profundidad propuesta y base ancestral verificadas | No | Reiniciar runtimes |
| Flujo | Tramo 4 · Ejecución | ✅ implementado y verificado | Pipeline y retiro sin pérdida verificados | No | Reiniciar runtimes |
| Flujo | Tramo 5 · Revisión | 🔵 parcial | Linaje nuevo con 3/4 lentes; cierre bloqueado por skew ABANDON | No | Reparar gentle-pi y reiniciar el candidato sin replay |
| Flujo | Tramo 6 · Entrega | 🔵 parcial | Skill de entrega local en Control Tower `3f0a7be` | No | No está entregada remotamente |
| Flujo | Tramo 7 · Cierre | 🔵 parcial | Gate documental local `4654ed8`; runtime sincronizado en disco | No | Cerrar RDD, smoke de OpenCode y aplicar sobre un plan real |
| Corrección | C1 · retirar `est:` | ✅ implementado y verificado | Integrada y probada en `4d3010c` | No | — |
| Corrección | C2 · pipeline SDD común | ✅ implementado y verificado | Integrada y probada en `4d3010c` | No | — |
| Corrección | C3 · disolver `session-plan` | ✅ implementado y verificado | Retiro lossless probado y copias runtime retiradas | No | — |
| Corrección | C4 · sin madre de planificación | ✅ implementado y verificado | Contrato corregido y propagado en disco | No | — |
| Corrección | C5 · `plan` → `radar` | 🔵 parcial | `tools/radar` es la fuente vigente; queda residuo legacy sin trackear | No | No borrar/ignorar `tools/plan/plan` sin decisión |
| Corrección | C6 · `blocked` no es ruta | ✅ implementado y verificado | Integrada y probada en `4d3010c` | No | — |
| Corrección | C7 · nuevo gate documental | ✅ implementado y verificado | Control Tower `4654ed8`, local | No | No confundir verificación local con entrega |
| Corrección | C8 · asientos para planificar | ✅ implementado y verificado | Contrato integrado y propagado en disco | No | Conexión del Horizonte a MAIN queda en Fase C |
| Contrato | Schema v3 | ✅ implementado y verificado | v3 exigido; v2 rechazado explícitamente | No | — |
| Instalación | Propagación `chanks-*` | 🔵 parcial | Cuatro roots sincronizados; `--check` en `OK` | No aplica | Reiniciar runtimes y ejecutar smoke vivo de OpenCode |
| Compatibilidad | Residuo `tools/plan/plan` | 🔵 parcial | Existe sin trackear en el checkout principal | No aplica | Preservar hasta decisión del maintainer |
| Revisión | Linaje AW viejo | 🔵 parcial | `review-4b55f432bbdf7f40` en `correction_required`; direccionable con `--base-ref` + `--committed-only` (`applicability: current_target`, 2026-09-03) | No aplica | Rescatar con el runbook y continuar solo por el `next_transition` devuelto |
| Revisión | Linaje AW nuevo | 🔵 parcial | `review-0c7fcacfefeb1c3f`, 3/4 lentes y sin BLOCKER/CRITICAL capturados | No aplica | Reparar incompatibilidad ABANDON v2 y reiniciar sobre los mismos bytes |
| Integración | Herdr | 🔵 parcial | Fuente limpia `d8a22841`; runtime Pi actualizado | No | Binario instalado `herdr --skill` sigue viejo |
| Integración | Control Tower | 🔵 parcial | `master@72cebbe`, 4 commits locales; `1110/1110` registrado | No | No presentado como entregado ni instalado remoto |

### Política de revisión vigente

La expectativa histórica “RDD encendida → 4R siempre” quedó **superada por la política del runtime**.
El proveedor/RAR nativo selecciona los lentes según el riesgo: los candidatos de riesgo medio
seleccionaron un solo `review-reliability`, mientras la corrección de 184 líneas y frontera de
procesos seleccionó 4R. Pi corre gentle-pi **2.3.0** y puede iniciar y capturar revisiones, pero su
binding ABANDON v2 no coincide con gentle-ai 2.5.0. Hasta reparar ese skew, el linaje nuevo no puede
abandonarse ni completarse sin violar el contrato de no replay.

### Política de tamaño de lote de revisión (desde 2026-09-03)

Un lote de revisión no supera **400 líneas**. Más allá de eso se parte en unidades revisables
(`work-unit-commits`; `chained-pr` donde el repo entregue por PR). Se revisa **antes** de commitear,
con `--projection staged`. **`--base-ref` y `--committed-only` quedan deshabilitados** para revisiones
nuevas hasta que gentle-ai#3551 esté cerrado y verificado; su único uso admitido es el runbook de
rescate. La regla vive en el bloque manual `review-lifecycle-policy` de los cuatro archivos de agente.
Fase A abrió su revisión con 10 067 líneas en un solo lote: ese fue el disparador.

---

## Qué estamos haciendo

Cambiar cómo se planifica el trabajo para que varios agentes puedan trabajar en paralelo sin que
el humano sostenga varios contextos a la vez.

**Tres raíces del problema:**

1. **Documentación** — un mismo hecho vive escrito a mano en varios lugares y nada lo calcula.
2. **Organización** — el territorio se agregaba después del corte y `Área` no impedía colisiones.
3. **Flujo** — faltaba un camino único de idea a plan aprobado con la ruta mínima honesta.

**Modelo objetivo:** un plan por producto; Zona → Sesión → Módulo → Tarea; Zonas exclusivas;
Cimientos reservados por archivo exacto; estado calculado; `openspec/plan.yaml` como dato editable
y ROADMAP como vista generada; Support como autor; SDD compartido por las tres puertas de entrada.

---

## Decisiones cerradas

No se relitigan. Las correcciones C1–C8 también están decididas y no requieren nuevas preguntas.

| # | Decisión |
|---|---|
| 1 | Un solo plan, único, sin fecha de cierre |
| 2 | Cuatro niveles: Zona → Sesión → Módulo → Tarea |
| 3 | El nivel se llama **Zona**; `Área` significa otra cosa |
| 4 | La Sesión es lo que entra en un PR, cortada dentro de una Zona |
| 5 | Las Zonas se cortan por dominio de negocio, ajustado por proyecto |
| 6 | Las Zonas no se solapan: forman una partición exhaustiva |
| 7 | `Área` deja de escribirse: se deriva de la Zona |
| 8 | Un obrero por Zona; `zona: cimientos` solo admite reservas exactas disjuntas |
| 9 | Cruces: Cimientos → partir por Zona → Zona nueva si partir destruye el resultado → revisar la partición si se repite |
| 10 | Cimiento = archivo exacto que más de una Zona necesita modificar |
| 11 | `radar` valida y pronostica; Torre/MAIN adquiere y libera reservas vivas |
| 12 | MAIN coordina y Support no toca código |
| 13 | El identificador es plano, permanente y mudo (`S23`) |
| 14 | La hoja de ruta se lee por Zona y posición, no por identificador |
| 15 | El estado se calcula; nunca se escribe |
| 16 | Un solo archivo de plan, con Support como único autor |
| 17 | La hoja de ruta generada se guarda en el repo |
| 18 | El techo de asientos lo pone el humano; el cálculo incluye implementación y planificación |
| 19 | La herramienta es un binario único durable y luego se integra a la Torre |
| 20 | SDD conserva una pipeline; la ruta propone y revalida su puerta de entrada |

**C1–C8 decididas:** retirar `est:`; compartir pipeline SDD; disolver `session-plan`; no crear
madre de planificación; renombrar `plan` a `radar`; retirar `blocked` de las rutas; liberar el
gate documental con `openspec/plan.yaml`; y contar asientos de planificación. Cero decisiones del
maintainer bloquean la corrección actual.

---

## Plan de trabajo reconciliado

Dos repos participan: **`agent-workflows`** (canon, herramienta y skills) y
**`control-tower`** (banco de pruebas). `Servi-Task-U` no se toca hasta que Control Tower funcione
con el modelo nuevo.

### Fase 1 — Canon y contrato del método

- [x] Construir localmente el canon de Zonas, Cimientos, estado calculado y rutas.
- [x] Producir la primera implementación local de C1–C8 en el candidato integrado de Fase A.
- [x] Resolver los hallazgos aplicables y refutar el gate vivo fuera de alcance, dentro del
      presupuesto aprobado: 184/190 líneas.
- [ ] Completar la revisión RDD ordinaria nueva; el candidato y tres lentes están congelados, pero el
      cierre espera la reparación del binding ABANDON v2.
- [x] Propagar `chanks-*` a los cuatro runtimes, preservando los bloques manuales.
- [ ] Reiniciar runtimes y ejecutar el smoke vivo de OpenCode antes de afirmar carga efectiva.

La construcción inicial se repartió entre tres escritores como registra
[EJECUCION-EN-PARALELO.md](EJECUCION-EN-PARALELO.md). Ese reparto ya no es una instrucción de
ejecución: **la corrección vigente tiene un solo escritor secuencial**.

### Fase 2 y 2b — Prueba del modelo y correcciones derivadas

- [x] Validar la partición real de Control Tower: 10 Zonas, 441 archivos, cero huérfanos y cero solapes.
- [x] Asignar las 24 Sesiones abiertas y aprobar los reemplazos `S100`–`S108`.
- [x] Definir Cimientos por umbral, reservas exactas y carve-out sin ocultar solapes.
- [x] Agregar linaje `reemplaza`, evidencia Git y render determinista.

Esta evidencia histórica sostuvo el candidato integrado; la corrección actual agregó y ejecutó sus
tests focales y amplios sin sustituir esa validación del modelo.

### Fase 3 — Ciclo diario

- [x] Integrar localmente planificación, kickoff, cierre y soporte con el modelo de Zonas.
- [x] Renombrar la herramienta fuente a `radar`.
- [x] Llevar el schema a v3 y rechazar v2 explícitamente; v2 no es el contrato final.
- [ ] Completar la nueva revisión ordinaria después de reparar el harness RDD.

### Fase 4 — Autoridad, planificación y puente SDD

- [x] Construir localmente las skills `chanks-*` y el puente plan↔SDD en el candidato de Fase A.
- [x] Hacer que proyecto nuevo sea una variante de autoridad, no una fábrica paralela de documentos.
- [x] Mantener los ocho pasos de planificación en una sola skill: **no crear una madre de planificación**.
- [x] Disolver `session-plan`, `coordinador_multi_agente` y `big-files-remediation-loop` en la fuente integrada.
- [x] Verificar que el retiro sea lossless y propagar los contratos corregidos en disco.
- [ ] Reiniciar los runtimes y completar el smoke vivo de OpenCode.

No instalar `coordinador_multi_agente`: fue disuelto. No adaptar `session-plan`: fue disuelto.

### Fase 5 — Integración con Torre y revisión

- [x] Implementar y verificar localmente el nuevo gate documental de Control Tower.
- [x] Implementar localmente la skill de entrega y el contrato de asset de rol.
- [ ] Completar el consumo de plan-data por Support, templates y brief diario.
- [x] Fijar la frontera: `radar` pronostica recursos compatibles; MAIN/Tower adquiere locks vivos.
- [ ] Construir en Fase C el gate de recursos vivos, el medidor runtime, la recuperación stale y el
      freeze terminal.

La revisión no se implementa con “4R siempre”. RAR/provider eligió 4R para este candidato de riesgo
alto; el cierre espera reparar el binding ABANDON y reiniciar la revisión sin repetir la captura
ambigua.

### Fase 6 — Asientos y Horizonte

- [x] Incorporar al contrato que los asientos sirven tanto para implementar como para planificar.
- [ ] Conectar en Fase C el hueco de planificación calculado por `radar status` con el dispatch de MAIN.
- [ ] Mantener el techo humano de asientos y hacer que la Torre proponga ampliarlo cuando corresponda.

### Fase 7 — Aplicar a productos

- [ ] **Fase B:** crear `openspec/plan.yaml` y ROADMAP en Control Tower; retirar sus documentos legacy.
- [ ] Migrar `Servi-Task-U` solo después de validar Control Tower.
- [ ] Revisar las skills locales de ServiTask que lean el canon anterior.

---

## Qué no se toca en la corrección actual

- [FLUJO-END-TO-END.md](FLUJO-END-TO-END.md), que sigue siendo la autoridad del flujo.
- Fase B: la migración del plan real de Control Tower.
- Fase C: gate de recursos vivos, medidor, conexión del Horizonte a MAIN, freeze terminal y `S9.9`.
- `Servi-Task-U`.
- El residuo sin trackear `tools/plan/plan`, hasta que el maintainer decida borrarlo o ignorarlo.
- Los siete estados y las ocho clases que siempre escalan.
- PRD, RFC y REQUIREMENTS, que responden preguntas distintas.
- `decision-register.md` de Control Tower: registra decisiones, no estado calculado.
