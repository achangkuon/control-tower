# Inventario de producto — Control Tower

> **Este es el documento que faltaba.** La auditoría del 2026-08-21 encontró que el PRD define
> qué debe **hacer** el producto —problema, objetivo, alcance, usuario, experiencia, `F1`–`F8`,
> reglas, métricas, riesgos— y **nunca enumera de qué está hecho**. Sin inventario, los Planes
> descomponen comportamiento y nadie es dueño del conjunto: por eso un módulo puede quedar
> completo, probado y sin llamador sin violar ningún criterio.
>
> Medido el 2026-08-21 sobre `master@90b84f8` por cierre transitivo de imports.
> Regenerable; las cifras no se escriben a mano.

## 1. La autoridad de alcance

**`console/vocabulary.mjs` es la fuente de verdad del alcance del producto** ([decisión 58](decision-register.md)).
Declara trece comandos con clase de riesgo, estados legales, argumentos requeridos y evidencia
exigida. Es la única definición del alcance que una máquina puede verificar.

**Regla:** si un comando no está en `COMMAND_VOCABULARY`, no es producto. Si está y no tiene
implementación conectada, es trabajo pendiente y el inventario lo nombra.

| Comando | Riesgo | Qué le pedís a la Torre | Implementación | Superficie de operador |
|---|---|---|---|---|
| `CV_STATUS` | R0 | Qué está pasando ahora | `core.status()` | ✅ `torre` y `tower_status` |
| `CV_INSPECT` | R0 | Mirar un agente en particular | `hosts/inspect.mjs`, `health.mjs` — huérfanos | ❌ |
| `CV_REQUEST_CONTEXT` | R0 | Pedirle contexto a un agente | `core.send()` | ❌ sólo agente↔agente |
| `CV_ASSIGN` | R1 | Asignarle trabajo a un agente | — | ❌ |
| `CV_PAUSE` | R1 | Frenar un agente | `core.setState` | ❌ ver §2 |
| `CV_RESUME` | R1 | Reanudarlo | `core.setState` | ❌ ver §2 |
| `CV_RUN_TESTS` | R1 | Correr la suite en un agente | — | ❌ |
| `CV_GRANT_DELIVERY` | R1 | Darle el turno de entrega | `core.acquire/transfer` | ❌ |
| `CV_HOLD_DELIVERY` | R1 | Retener la entrega | — | ❌ |
| `CV_STOP_DELIVERY` | R1 | Cortarla | `delivery/**` — huérfano | ❌ |
| `CV_ANSWER` | R1 | Responder una decisión estacionada | `escalation/**` — huérfano | ❌ dueño: `S5.5` |
| `CV_MERGE_MAIN` | R2 | Integrar a `master` | `delivery/pull-request-adapter.mjs` — huérfano | ❌ |
| `CV_DB_PUSH` | R2 | Aplicar migraciones | — | ❌ |

**Cero de los trece comandos tiene superficie de operador.** `CV_STATUS` es el único con salida
visible, y llega por `bin/torre` y por `tower_status`, no por el vocabulario: nada en el producto
importa `COMMAND_VOCABULARY` fuera de su propio test.

## 2. El hallazgo estructural — la Torre es dirigida por agentes, no por vos

Hay **dos superficies de comando paralelas que no se conocen entre sí**:

- **`mcp.mjs`** expone ocho primitivas *para agentes*: `tower_register`, `tower_status`,
  `tower_send`, `tower_set_state`, `tower_acquire`, `tower_release`, `tower_transfer`,
  `tower_receive`. Un agente se une, **actualiza su propio estado**, manda mensajes y toma locks.
- **`console/vocabulary.mjs`** declara trece intenciones *de operador*: vos le decís a la Torre
  que asigne, frene, reanude, otorgue entrega o responda una escalación.

El puente entre las dos nunca se escribió, y hay una razón mecánica: `core.mjs:4418` define
`setState({ db, place }, { state, task, note, prUrl })`. El sujeto es **`place`** —la identidad
derivada del directorio de trabajo— y **no existe un parámetro `agent`**. Un agente sólo puede
cambiar su propio estado. `CV_PAUSE`, `CV_RESUME` y `CV_ASSIGN` son el operador actuando **sobre
otro** agente: es la dirección de autoridad inversa, y no existe en el producto.

> **Esto es lo que separa a la Torre de hoy del requisito "que funcione como si estuvieras
> sentado frente a la compu".** Hoy los agentes reportan; vos mirás. No comandás.

## 3. Los 34 módulos sin llamador

**2.494 líneas, 34 archivos.** Alcanzable desde un canal real: 78,8%. Cada archivo cae en un
cajón; los cajones A y B se derivan del vocabulario o de una capacidad declarada, el C es
infraestructura y el D **requiere una decisión del maintainer** y no se deriva.

### A · Reclamado por un comando del vocabulario — 12 archivos, 938 líneas

| Módulo | Líneas | Comando que lo reclama |
|---|---|---|
| `console/{vocabulary,validate}.mjs` | 175 | es la definición de los trece |
| `escalation/{request,routing,parking-composition}.mjs` | 274 | `CV_ANSWER` — dueño `S5.5` |
| `delivery/{workflow,pull-request-adapter,git-adapter,reconciliation,ledger}.mjs` | 356 | `CV_MERGE_MAIN`, `CV_GRANT_DELIVERY`, `CV_HOLD_DELIVERY`, `CV_STOP_DELIVERY` |
| `hosts/{inspect,health}.mjs` | 133 | `CV_INSPECT` |

### B · Reclamado por una capacidad declarada — 11 archivos, 940 líneas

| Módulo | Líneas | Quién lo reclama |
|---|---|---|
| `registry/{store,path}.mjs` | 203 | `F1` del PRD; precondición de todo comando que nombra un agente |
| `support/{agent,manifest,snapshot}.mjs` | 203 | `S8.4` — briefs read-only de Support |
| `enroll/index.mjs` | 141 | decisión 25 — origen del binding confiable |
| `supervision/state.mjs` | 126 | `S10.2` — supervisión sin armado local |
| `jornada/execution-contract.mjs` | 122 | `S10.3` — contrato de ejecución versionado |
| `continuation/{derivation,integrated-base}.mjs` | 106 | `S5.3`, `F4` — continuación entre agentes |
| `policy/jornada.mjs` | 39 | `F3` — límites de jornada; precondición de `CV_GRANT_DELIVERY` |

### C · Andamio interno — 5 archivos, 108 líneas

`contracts/{artifact-ref,idempotency,index}.mjs` (102) · `main-store/index.mjs` y
`registry/index.mjs` (6, barriles). No son superficie: existen para que A y B funcionen. Se
conectan solos cuando se conecta lo que los usa.

### D · Necesita tu decisión — 6 archivos, 508 líneas

| Módulo | Líneas | La pregunta |
|---|---|---|
| `capabilities/registry.mjs` | 175 | Ningún comando lo nombra. `S3.3` fijó que da visibilidad y compatibilidad de invocación, **nunca autoridad**. ¿Es producto o andamio de composición? |
| `registry/legacy-import.mjs` | 135 | Import de proyectos legacy que entregó `S2.5`. Es una migración de una sola vez. ¿Ya está cumplida y se archiva? |
| `hosts/{rehydration,stop-proof}.mjs` | 89 | Los entregó `S4.3` y los consume la recuperación de `S4.4`. **Depende de la auditoría exclusiva de P4** — si la recuperación se simplifica, cambian o salen. |
| `policy/delivery-policy.mjs` | 79 | Impone `documentation_close`, `horizon_ceiling` y forma de entrega: **es verificación de proceso**. Candidato directo de la Fase 3, donde la verificación vuelve a gentle-ai. |
| `hosts/launcher.mjs` | 30 | `S8.9` ya lo declaró inalcanzable por contrato y lo dejó fuera del payload sin borrarlo. ¿Se archiva? |

## 4. Qué mide y qué no mide este documento

**Mide** alcanzabilidad por imports estáticos desde los dos canales de distribución reales:
`bin/torre install` vía `RUNTIME_PAYLOAD_FILES`, e `install.sh` vía `plugin/tower-spike.js` y
`mcp.mjs`.

**No mide** si el código es correcto, si está probado, ni si la implementación conectada hace lo
que el comando promete. Un módulo alcanzable puede estar mal; un módulo huérfano puede ser
excelente —de hecho la mayoría lo son, y ése es exactamente el problema.

**No reemplaza** al [master-index](master-index.md), que mide planificación, ni a
[implementation-state](implementation-state.md), que narra el estado del código.
