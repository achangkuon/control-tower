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
> Última reconciliación: Fase A cerrada y entregada. `master` y `origin/master`
> coinciden en `b3da46174b75dc97e52afa72900f6263655aa378`; `agent-workflows` conserva su historia
> completa mediante el merge de subtree `dbb7626904a09323e19dd7a60f747d29c8c62f5d`, cuyo tip
> importado es `588f0282d28baf79ffbd3cb7c1b29d7d5557436e`. Fase B está **en curso** en la rama
> `feat/s0.4-plan-zones-migration`, respaldada en `origin` en `8081c4b779ad8761184637a4e8a12e7d1bfce02b`.
> Nada de Fase B está integrado en `master` todavía.

---

## 📍 Punto de retoma

**Fase A cerrada:** las correcciones críticas quedaron resueltas en `39ff465`, revisadas en el
linaje `review-4ec24941df920cc5` —cero hallazgos bloqueantes, autoridad reconocida y quemada— y
mergeadas en `977cced`. La unificación documental también fue aprobada en
`review-a06c008f2e0eaa21`, luego reconocida y quemada. El merge de subtree `dbb7626904a09323e19dd7a60f747d29c8c62f5d`
importó el tip `588f0282d28baf79ffbd3cb7c1b29d7d5557436e` con historia completa.

**Entrega y runtime verificados:** `master` y `origin/master` están sincronizados en
`b3da46174b75dc97e52afa72900f6263655aa378`. Las copias activas de runtime se reconciliaron desde
el subtree interno; `python3 tools/install.py --check` devolvió `OK` y los bloques manuales se
preservaron. Pasaron 30/30 tests del instalador, `go vet`, `go test` y la radiografía posterior a la
entrega con 1167 PASS / 0 FAIL sobre `b3da461`.

**Incidente RDD histórico — causa raíz identificada 2026-09-03:** el bloqueo no era un defecto de runtime.
El linaje `review-4b55f432bbdf7f40` se congeló con selector `base-diff` (`base_ref` `a01986ee`), y la
STATUS canónica sin selector siempre proyecta `current-changes`. Como la identidad del target se
deriva del selector, el proveedor responde `applicability: unrelated` y ofrece un START nuevo.
Verificado desde tres worktrees, incluido un candidate view con el árbol congelado byte a byte.
`--lineage` no lo corrige: con y sin el flag el target computado es idéntico. Claude Code, OpenCode
y Pi reproducen lo mismo, así que no es el skew de versión de Pi. Con `--base-ref` + `--committed-only`
el proveedor **sí** reconoce el linaje: `applicability: current_target` con el `target_identity`
congelado `sha256:cf2f5302…`. En ese momento el linaje seguía en `correction_required` y no se declaró aprobado.
Reportado en Gentleman-Programming/gentle-ai#3551.

**Historia de la entrega parcial (superada, 2026-09-03):** `feat/modelo-de-zonas` se había
pusheado a `origin` (`f7bd95e..565ba21`, 26 commits), mientras
`fix/fase-a-rdd-correction@f7ea11a` se conservaba sin mergear para no destruir el candidato RDD
`ad2a11d`. Ese estado intermedio terminó con el cierre de los hallazgos en `39ff465`, el merge
`977cced` y la posterior unificación en `master`. No describe el estado activo.

**Rescate ejecutado y linaje cerrado (2026-09-03):** el runbook funcionó. Con
`--base-ref` + `--committed-only` + `--untracked-scope exclude` el proveedor devolvió la continuación
target-bound completa (`review.capture-validation`, con `--repository-context` y `--request-hash`),
ejecutada verbatim. El linaje quedó en **`escalated`** con cierre
`gentle-ai.review-last-event-closure/v1`.

**Veredicto histórico del validador dirigido, superado por `39ff465`: la primera corrección no satisfacía su alcance congelado.**
`original_criteria.passed: false` — 3 de 6 hallazgos `CRITICAL` resueltos.
`correction_regression.passed: true` — la corrección no introdujo defectos nuevos.

| Hallazgo | Estado |
|---|---|
| `R3-resolved-decision-schema` | ✅ resuelto (schema `resuelta` + test que carga, chequea y renderiza) |
| `R3-route-revalidation-depth-deadlock` | ✅ resuelto (`checkProfundidad` usa `Ruta.Propuesta`) |
| `R3-schema-v2-breaking-change` | ✅ resuelto (schema v3 + mensaje de migración explícito) |
| `R1-db-resource-lock-removal` | ✅ cerrado en `39ff465` |
| `R4-db-lock-regression` | ✅ cerrado en `39ff465` |
| `R4-retired-skill-data-loss` | ✅ cerrado en `39ff465` |

**Diagnóstico histórico, ya resuelto:** los tres abiertos compartían causa: `correction_paths` no
contenía `skills/*.md`; faltaba exigir adquisición viva para el `Recurso` declarado de una Sesión y
el instalador retiraba skills de forma irreversible. `39ff465` corrigió ambos contratos y cerró los
tres hallazgos.

**Los tres `CRITICAL` cerrados y mergeados (2026-09-03):** `39ff465` cierra los tres en un lote de
82 líneas, bajo el cap de 400 de la política nueva. El retiro de skills ahora **archiva** en
`<runtime_root>/.retired-skills/<skill>-<UTC>` en vez de destruir, así que un install exitoso es
reversible a mano. `chanks-3-session-kickoff` y `assignment-implementation` exigen adquisición viva para
Cimientos **y** para un `Recurso` exclusivo —modo de base de datos, token de entrega— con liberación
garantizada incluso ante fallo o bloqueo, usando el vocabulario que ya define el canon de nombres.

Revisado bajo la política nueva como linaje `review-4ec24941df920cc5`: consentimiento otorgado por el
mantenedor, cuatro lentes, **cero hallazgos bloqueantes**, autoridad reconocida y quemada
(`gentle-ai.review-acknowledged/v1`, `authority: burned`). Mergeado en `977cced`. Suite completa en
verde: 30/30 tests del instalador, `go vet` y `go test` de `tools/radar`.

Quedan **12 hallazgos informativos** (WARNING/SUGGESTION) que el proveedor marcó explícitamente como
trabajo posterior y que nunca reabren esta revisión. Los de más sustancia: falta de timeout de lease
para el `Recurso` exclusivo (`chanks-3-session-kickoff/SKILL.md:36-37`) y una carrera TOCTOU en el archivado
(`tools/install.py:442-445`).

**Siguiente acción exacta — Fase B:** planificar `S101` por la ruta `full-sdd`. Es el único paso
que bloquea la compuerta G1: el candidato tiene 73 Sesiones completas y el contrato exige 74. `S101`
debe resolver dos contradicciones detectadas el 2026-09-06: el campo `horizon_ceiling` cuenta Sesiones
en `policy/jornada.mjs` y Módulos en `continuation/integrated-base.mjs:23`, y el default restrictivo
es `2` según `AGENTS.md:209` pero `1` según `policy/delivery-policy.mjs:12`.

---

## Cómo leer el estado: tres ejes distintos

| Eje | Pregunta | Estado actual |
|---|---|---|
| **Fuente integrada** | ¿El cambio forma parte del checkout canónico? | Sí: Fase A está integrada en `master@b3da46174b75dc97e52afa72900f6263655aa378`. |
| **Remoto** | ¿El commit canónico está entregado? | Sí: `origin/master` coincide con `master`. |
| **Runtime instalado** | ¿Las copias activas reflejan el subtree? | Sí: fueron reconciliadas, `tools/install.py --check` devuelve `OK` y los bloques manuales están preservados. |

Fase A cumple los tres ejes: integración, entrega y runtime reconciliado.

## 📊 Estado de un vistazo

Los únicos significados usados abajo son: `✅ implementado y verificado`, `🔵 parcial`,
`🟡 pendiente` y `📚 fuera de alcance`.

| Grupo | ID | Estado | Evidencia integrada | Remoto | Runtime instalado / qué falta |
|---|---|---|---|---|---|
| Implementación | Fase A | ✅ implementado y verificado | Correcciones críticas en `39ff465`; merge `977cced`; subtree importado con historia completa | Sí, en `master@b3da46174b75dc97e52afa72900f6263655aa378` | Cerrada |
| Implementación | Fase B | 🔵 en curso | 109 commits en `feat/s0.4-plan-zones-migration`: 72 Sesiones históricas importadas, contrato y proyecciones de referencias en Radar, verificador de partición, 11 referencias autenticadas y `S100` planificada. Candidato en 73/7/4; `openspec/plan.yaml` y `openspec/ROADMAP.md` siguen sin existir | Respaldada, no integrada: `origin/feat/s0.4-plan-zones-migration@8081c4b779ad8761184637a4e8a12e7d1bfce02b` | Planificar `S101` (`full-sdd`), correr G1, y recién después archivo, prueba aislada, reproducción y activación |
| Implementación | Fase C | 📚 fuera de alcance | Sin implementación en esta obra | No aplica | Gate de recursos vivos, medidor, conexión del Horizonte, freeze terminal y `S9.9` |
| Flujo | Tramos 1–7 | ✅ implementado y verificado | Canon, planificación, enrutado, ejecución, revisión, entrega y cierre reconciliados | Sí | — |
| Corrección | C1–C8 | ✅ implementado y verificado | Contratos y correcciones integrados; los tres `CRITICAL` finales cerraron en `39ff465` | Sí | — |
| Contrato | Schema v3 | ✅ implementado y verificado | v3 exigido; v2 rechazado explícitamente | Sí | — |
| Instalación | Copias runtime | ✅ implementado y verificado | Copias activas reconciliadas; `tools/install.py --check` en `OK`; bloques manuales preservados | No aplica | — |
| Revisión | Incidente RDD histórico | 📚 fuera de alcance | `review-4b55f432bbdf7f40` cerró en `escalated`; sus tres abiertos se resolvieron después en `39ff465` | No aplica | Evidencia histórica; no es un bloqueo activo |
| Revisión | Corrección final de Fase A | ✅ implementado y verificado | `review-4ec24941df920cc5`, cero hallazgos bloqueantes, reconocido y quemado | No aplica | — |
| Revisión | Unificación documental | ✅ implementado y verificado | `review-a06c008f2e0eaa21`, aprobado, reconocido y quemado | No aplica | — |
| Integración | Control Tower | ✅ implementado y verificado | Subtree `dbb7626904a09323e19dd7a60f747d29c8c62f5d`; radiografía 1167 PASS / 0 FAIL | Sí | Continuar con Fase B |

### Política de revisión vigente

La expectativa histórica “RDD encendida → 4R siempre” quedó **superada por la política del runtime**.
El proveedor/RAR nativo selecciona los lentes según el riesgo. El incidente de compatibilidad y el
rescate del linaje viejo quedan documentados arriba como historia; no bloquean Fase A. Las revisiones
que sí cierran esta entrega son `review-4ec24941df920cc5` y `review-a06c008f2e0eaa21`, ambas aprobadas,
reconocidas y quemadas. Según la decisión 80 de `openspec/plans/decision-register.md`, Pi es el primer
host de implementación; la decisión 85 difiere la conformidad de OpenCode hasta que ese host se
desestacione. La mención “Pi después de OpenCode” de
`openspec/archive/legacy-planning/plan-9/STATUS.md` es política
histórica aparcada. Por eso ninguna prueba en vivo de OpenCode es gate de Fase A ni próxima acción.

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
maintainer bloquean el cierre ya registrado de Fase A.

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
- [x] Cerrar la revisión de las correcciones críticas en `review-4ec24941df920cc5`, sin hallazgos bloqueantes.
- [x] Propagar `chanks-*` a los runtimes activos, preservando los bloques manuales.
- [x] Reconciliar las copias activas desde el subtree y verificar `tools/install.py --check` en `OK`.

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
- [x] Completar la revisión aplicable y reconocer/quemar su autoridad.

### Fase 4 — Autoridad, planificación y puente SDD

- [x] Construir localmente las skills `chanks-*` y el puente plan↔SDD en el candidato de Fase A.
- [x] Hacer que proyecto nuevo sea una variante de autoridad, no una fábrica paralela de documentos.
- [x] Mantener los ocho pasos de planificación en una sola skill: **no crear una madre de planificación**.
- [x] Disolver `session-plan`, `coordinador_multi_agente` y `big-files-remediation-loop` en la fuente integrada.
- [x] Verificar que el retiro sea lossless y propagar los contratos corregidos en disco.
- [x] Reconciliar las copias activas de runtime desde el subtree y preservar los bloques manuales.

No instalar `coordinador_multi_agente`: fue disuelto. No adaptar `session-plan`: fue disuelto.

### Fase 5 — Integración con Torre y revisión

- [x] Implementar y verificar localmente el nuevo gate documental de Control Tower.
- [x] Implementar localmente la skill de entrega y el contrato de asset de rol.
- [ ] Completar en Fase B el consumo del plan migrado por Support, templates y brief diario.
- [x] Fijar la frontera: `radar` pronostica recursos compatibles; MAIN/Tower adquiere locks vivos.
- [ ] Construir en Fase C el gate de recursos vivos, el medidor runtime, la recuperación stale y el
      freeze terminal.

La revisión no se implementa con “4R siempre”. RAR/provider eligió los lentes según el riesgo; la
corrección final quedó aprobada en `review-4ec24941df920cc5` y la unificación documental en
`review-a06c008f2e0eaa21`. Ambas autoridades fueron reconocidas y quemadas.

### Fase 6 — Asientos y Horizonte

- [x] Incorporar al contrato que los asientos sirven tanto para implementar como para planificar.
- [ ] Conectar en Fase C el hueco de planificación calculado por `radar status` con el dispatch de MAIN.
- [ ] Mantener en Fase C el techo humano de asientos y hacer que la Torre proponga ampliarlo cuando corresponda.

### Fase 7 — Aplicar a productos

- [ ] **Fase B:** migrar los datos de planificación legacy de Control Tower a
      `openspec/plan.yaml`, generar `openspec/ROADMAP.md` y retirar las vistas de plan legacy
      duplicadas únicamente mediante esa migración.
- [ ] Migrar `Servi-Task-U` solo después de validar Control Tower.
- [ ] Revisar las skills locales de ServiTask que lean el canon anterior.

---

## Qué no se toca en esta reconciliación documental

- [FLUJO-END-TO-END.md](FLUJO-END-TO-END.md), que sigue siendo la autoridad del flujo.
- Fase B: esta edición solo deja registrada su próxima acción; no crea `openspec/plan.yaml`, no genera
  `openspec/ROADMAP.md` y no retira vistas legacy.
- Fase C: gate de recursos vivos, medidor, conexión del Horizonte a MAIN, freeze terminal y `S9.9`.
- `Servi-Task-U`.
- El subtree integrado no contiene `tools/plan/plan`; cualquier residuo no trackeado que permanezca en el checkout archivado queda fuera de la autoridad y del alcance de esta migración.
- Los siete estados y las ocho clases que siempre escalan.
- PRD, RFC y REQUIREMENTS, que responden preguntas distintas.
- `decision-register.md` de Control Tower: registra decisiones, no estado calculado.
