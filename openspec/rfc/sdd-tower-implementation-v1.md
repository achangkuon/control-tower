# RFC — SDD Tower Implementation V1: Arquitectura de jornadas autónomas controladas

**Estado:** Propuesto para aprobación
**Entrada de producto:** [`../prd/sdd-tower-implementation-v1.md`](../prd/sdd-tower-implementation-v1.md)
**Principio rector:** automatizar continuidad y coordinación sin trasladar intención de producto ni autoridad humana a la infraestructura.

## 1. Resumen de decisiones

| Área | Decisión | Razón |
|---|---|---|
| Límite de Control Tower | Runtime plan-agnostic | Mantiene pequeño y verificable el mecanismo de autoridad, locks, handoffs y efectos |
| Autoridad por proyecto | Un Main Orchestrator por proyecto | Evita autoridad global implícita y mantiene el repositorio como frontera |
| Roles | Hermes, Main, Support, Policy, Planning e Implementation | Evita convertir fases o mecanismos en agentes adicionales |
| Planes | Un Policy lógico por plan | La elegibilidad y el drift requieren contexto del DAG específico |
| Continuidad | Plan Manifest → Binding Delta → Policy → reconciliación | Une intención aprobada con realidad técnica verificada |
| Autonomía | Jornada acotada y versionada | Permite avance sin conceder autonomía ilimitada |
| Hosts | Una línea activa por jornada | Simplifica ownership, costo, debugging y recuperación |
| Fallback | Transferencia exclusiva mediante `host_epoch` | Permite OpenCode → Pi sin escritores simultáneos |
| Worktrees | Efímeros por plan/lane/slice | Elimina hogares permanentes y reciclaje ambiguo |
| Entrega | Commit, push y PR automáticos; merge humano | Mantiene el merge como frontera irreversible |
| Telegram | Hermes presenta; Main crea y consume autorización | Separa UX remota de autoridad operativa |
| Recuperación | Reconciliación de evidencia antes de retry | Evita repetir efectos inciertos |
| Multiproyecto | Campaña con Main líder temporal y Mains locales | Coordina sin inventar una transacción distribuida |
| Implementación | Extender Bun ESM y el límite core/adapters existente | Evita introducir una nueva plataforma innecesaria |

## 2. Alcance arquitectónico

Esta RFC define el producto de orquestación que opera **encima** del sustrato Control Tower.

El cambio OpenSpec `autonomous-continuation-control-tower` conserva las responsabilidades mecánicas:

- autoridad canónica de Main;
- entregas durables;
- identidad de sesión e intentos;
- `receive → claim → ack`;
- leases, locks y fences de efectos;
- polling y wake host-neutral;
- recuperación mecánica e idempotencia;
- adapters delgados para hosts;
- persistencia runtime versionada.

SDD Tower Implementation agrega semántica de producto fuera del core:

- registro de proyectos;
- planes, DAG y Policy;
- jornadas y presets;
- asignación de Planning e Implementation;
- workspaces efímeros;
- artefactos SDD y Binding Deltas;
- entrega, Telegram y campañas.

### 2.1 Regla de aislamiento

Control Tower MUST NOT:

- leer código para decidir scope;
- interpretar PRD, RFC, REQUIREMENTS, OpenSpec o Plan Manifest;
- clasificar drift;
- elegir la siguiente tarea;
- crear worktrees o lanzar procesos directamente;
- asumir que un wake contiene autoridad;
- fusionar un PR por iniciativa propia.

El core puede persistir referencias, digests, estados mecánicos y resultados opacos. La interpretación pertenece a Main, Policy y los agentes de fase.

## 3. Vista del sistema

```text
Maintainer
    │
    ▼
Hermes + Telegram
    │ registry-backed intent / exact answers
    ▼
Main Orchestrator ──────────────────────────────────────┐
    │                                                   │
    ├── Global Support (read-only)                      │
    ├── Policy per plan                                 │
    ├── Planning per slice                              │
    └── Implementation per slice                        │
                                                        │
    ├── Main control store                              │
    ├── Git + OpenSpec                                  │
    ├── Workspace Manager                               │
    ├── Host Launcher                                   │
    ├── Git hosting                                     │
    └── Control Tower generic API ──> core/SQLite <─────┘
                                           │
                                           ├── OpenCode adapter
                                           ├── Pi adapter
                                           └── Claude adapter (opt-in)
```

### 3.1 Planos

| Plano | Componentes | Responsabilidad |
|---|---|---|
| Humano | Maintainer | Intención, límites, excepciones, merge y revocación |
| Presentación | Hermes, Telegram | Selección, estado, preguntas y respuestas exactas |
| Orquestación | Main, Support, Policy | Interpretar planes, autorizar assignments y coordinar entrega |
| Ejecución | Planning, Implementation | Producir artefactos, código, evidencia y Binding Delta |
| Mecanismo | Control Tower, Workspace Manager, Host Launcher | Persistencia, exclusividad, worktrees, procesos y wake |
| Evidencia | Git/OpenSpec, Main control store, Git hosting | Intención versionada, informes, SHAs, PRs y checks |

## 4. Modelo de autoridad

### 4.1 Maintainer

El Maintainer es la autoridad final. Aprueba:

- registro o relocalización de proyectos;
- inicio y ampliación de jornadas;
- fallback que no fue preautorizado;
- drift material o ambiguo;
- operaciones irreversibles;
- cada merge.

Puede reducir límites, pausar o revocar en cualquier momento.

### 4.2 Hermes

Hermes es una superficie global de registro y conversación. Puede:

- resolver un alias como propuesta de proyecto;
- mostrar proyecto, plan y revisión seleccionados;
- presentar estados e informes;
- enviar intención acotada al Main correcto;
- presentar botones de aprobación, rechazo, pausa y revocación;
- retransmitir una respuesta autenticada.

Hermes MUST NOT dirigir workers, reclamar assignments, modificar repositorios como autoridad ni convertir texto libre en autorización.

### 4.3 Main Orchestrator

Existe un Main por proyecto. Main:

- rederiva identidad de proyecto;
- aplica límites de jornada;
- consulta Support y Policy;
- autoriza assignments;
- solicita worktrees y sesiones;
- coordina entrega;
- crea desafíos de autorización;
- reconcilia recuperación;
- participa en campañas.

Main no implementa slices ni modifica intención de producto silenciosamente.

### 4.4 Support

Support es global dentro del proyecto y de solo lectura. Produce:

- descomposición inicial;
- grafo de conflictos;
- capacidad recomendada;
- propuesta de lanes y slices;
- briefs iniciales.

Support no registra, no toma locks, no entrega y no activa una jornada.

### 4.5 Policy

Cada plan tiene un rol Policy lógico, rehidratable mediante sesión canónica. Policy interpreta:

- Plan Manifest y DAG;
- Binding Deltas previos;
- jornada y presupuesto;
- reportes estructurados de runtime;
- dependencias y campañas;
- drift y evidencia.

Policy emite un Policy Report. Main conserva la decisión de routing y autoridad.

### 4.6 Planning e Implementation

Planning es fresco por slice y produce hasta `tasks`. Implementation es fresco por slice y comienza con reconciliación antes de `sdd-apply`.

Reconciliation y producción del Binding Delta son fases de Implementation. Delivery coordination es capacidad de Main. Ninguna se modela como agente adicional.

## 5. Registro de proyectos

Hermes mantiene un registro path-neutral. Una entrada lógica contiene:

```yaml
project_id: servitask
canonical_root: /absolute/path/to/project/Main
git_common_dir: /absolute/path/to/git/common-dir
expected_remote: git@github.com:owner/repository.git
main_branch: main
main_session: servitask-main
manifest_path: openspec/plans/master-index.md
registry_revision: 3
```

### 5.1 Bootstrap

El registro inicial y cualquier cambio de raíz canónica requieren una operación local. Telegram no puede registrar ni relocalizar una raíz por sí solo.

### 5.2 Validación

Antes de una operación con autoridad, Main MUST rederivar:

- raíz física real;
- Git common directory;
- remote canónico;
- rama de integración;
- revisión del registro;
- binding de manifest;
- identidad del Main activo.

Una discrepancia produce `BLOCKED`.

### 5.3 Aliases

Los aliases son UX. Hermes puede sugerir `servitask` al leer “ServiTask”, pero debe mostrar la selección. Una orden operativa queda vinculada al `project_id` y `registry_revision`, nunca al alias.

## 6. Persistencia y artefactos

### 6.1 Fuentes de verdad separadas

| Store | Contenido | Autoridad |
|---|---|---|
| Git/OpenSpec | PRD, RFC, REQUIREMENTS, Plan Manifest, SDD, Binding Delta | Intención y realidad técnica versionadas |
| Main control store | Policy Reports, referencias, desafíos y resultados de autorización | Interpretación operativa de Main/Policy |
| Control Tower runtime | assignments, delivery, claims, leases, locks, attempts, effects, host epoch, referencias/digests | Estado mecánico |
| Git hosting | ramas remotas, PRs, SHAs, checks y merges | Evidencia externa de entrega |
| Hermes registry | proyectos, raíces y Main registrados | Resolución de proyecto |

El backend físico y la retención del Main control store se fijarán en REQUIREMENTS. No será una segunda copia del plan.

### 6.2 Encabezado intrínseco y referencia externa

Un artefacto versionado contiene identidad intrínseca:

```yaml
schema: binding-delta
schema_version: 1
artifact_id: delta-tasker-notifications-001
project_id: servitask
plan_id: tasker-app
artifact_revision: 1
created_at: 2026-07-27T12:00:00Z
producer:
  role: implementation
  identity: servitask-tasker-app-notifications-implementation-a1
  direction: implementation-to-policy
```

La ubicación y digest se vinculan después de que existe el contenido:

```yaml
schema: artifact-ref
schema_version: 1
artifact_id: delta-tasker-notifications-001
artifact_revision: 1
repository_id: servitask
repo_relative_path: openspec/changes/.../binding-delta.yaml
source_commit: <git-sha>
content_digest: sha256:<digest>
manifest_revision: 4
assignment_revision: 7
```

Esto evita referencias circulares al commit o digest del propio archivo. REQUIREMENTS definirá canonicalización y cobertura exacta.

### 6.3 Plan Manifest

YAML versionado con:

- identidad y objetivo del plan;
- slices y DAG;
- referencias PRD/RFC/REQUIREMENTS/OpenSpec;
- criterios y restricciones estables;
- políticas de jornada y entrega;
- referencias a Binding Deltas;
- pertenencia a campañas cuando aplique.

No contiene sesiones, worktrees activos, leases, attempts o timestamps runtime mutables.

### 6.4 Binding Delta

YAML inmutable producido por Implementation. Incluye:

- digests de entradas;
- base y resultado Git;
- contratos implementados o cambiados;
- desviaciones y restricciones;
- impacto de dependencias y siguiente slice;
- evidencia de verificación;
- insumos de clasificación de drift;
- digest del delta anterior.

Un delta publicado no se edita. Una corrección crea una revisión sucesora que preserva la cadena.

### 6.5 Policy Report

JSON persistido fuera del repositorio. Vincula inputs exactos y clasifica:

- `READY_FOR_PLANNING`;
- `READY_FOR_APPLY`;
- `APPROVAL_REQUIRED`;
- `BLOCKED`;
- `PLAN_COMPLETE`.

Control Tower recibe solo una referencia opaca y digest.

### 6.6 Validación

Todo artefacto pasa cuatro capas:

1. estructura y versión;
2. referencias y digests;
3. invariantes de DAG, cadena y separación stable/runtime;
4. productor, assignment, jornada, registro y autoridad de publicación.

## 7. Jornada autónoma

### 7.1 Snapshot de autorización

Una jornada fija:

```yaml
jornada_id: jornada-servitask-tasker-20260727
project_id: servitask
plan_id: tasker-app
preset_name: standard
preset_revision: 1
effective_limits:
  expires_at: <timestamp>
  apply_slice_ceiling: 2
  planning_horizon: 2
  planner_ceiling: 3
  apply_ceiling: 2
  max_attempts_per_slice: 2
execution_host: opencode
fallback_host: pi
host_epoch: 1
```

Los presets V1 son:

| Preset | Duración | Slices apply | Horizonte | Planners | Apply |
|---|---:|---:|---:|---:|---:|
| `short` | 2 h | 1 | 1 | 2 | 1 |
| `standard` | 8 h | 2 | 2 | 3 | 2 |
| `extended` | 16 h | 4 | 3 | 5 | 4 |

### 7.2 Estados conceptuales

```text
DRAFT → PENDING_AUTHORIZATION → ACTIVE
                                  ├── PAUSED
                                  ├── BLOCKED
                                  ├── EXPIRED
                                  ├── REVOKED
                                  └── COMPLETED
```

REQUIREMENTS definirá transiciones y terminalidad exactas.

### 7.3 Cambios

- Reducir, pausar y revocar MUST poder aplicarse inmediatamente.
- Ampliar límites MUST crear una nueva revisión autorizada.
- Un preset actualizado solo aplica a jornadas nuevas.
- Un estado terminal no inicia nuevos attempts.

## 8. Línea de ejecución y failover

### 8.1 Selección

El Maintainer elige Pi u OpenCode al autorizar la jornada. Claude es opt-in. Todos los agentes plan-locales creados durante la jornada usan una sola línea activa.

Main y Hermes son sesiones persistentes independientes y no cambian de ubicación por el host de la jornada.

### 8.2 Fallback preautorizado

Una jornada puede incluir un fallback. Ante caída del host activo:

1. Main detiene nuevos attempts.
2. Marca o espera el cierre/expiración de ownership anterior.
3. Reconcilia worktrees, Git, Tower y efectos externos.
4. Bloquea si no puede demostrar exclusividad.
5. Incrementa `host_epoch`.
6. Activa el fallback.
7. Crea nuevos attempts para continuar.

Claims, mensajes o efectos de un epoch anterior no son autoridad en el nuevo epoch.

### 8.3 Distinción entre fallos

- **Fallo de tarea:** retry dentro del mismo host y presupuesto.
- **Fallo de host/adapter/capacidad:** transferencia de línea si existe fallback elegible.
- **Fallo ambiguo:** `BLOCKED` hasta reconciliación.

## 9. Worktrees, ramas y sesiones

### 9.1 Convenciones

```text
Worktrees/<plan>/<lane>/<slice>

plan/<plan>/<slice>
feat/<plan>/<slice>

<project>-<plan>-<slice>-<role>-a<attempt>
<project>-main
<project>-support
<project>-<plan>-policy
```

### 9.2 Workspace Manager

Mecanismo determinista con tres capacidades lógicas:

- `inspect`: inventario y estado read-only;
- `create`: creación idempotente desde base autorizada;
- `retire`: retiro solo con cierre remoto y evidencia suficientes.

Antes de mutar valida project identity, Git common directory, ruta, rama, base, dirty state, assignment revision y ownership.

No cambia una rama permanente para “reciclar” un agent home. Retira un worktree cerrado y crea uno nuevo.

### 9.3 Host Launcher

Recibe una instrucción validada con:

- host y adapter version;
- cwd exacto;
- session name;
- role y assignment ref;
- host epoch;
- wake genérico.

El payload de launch no contiene autoridad de implementación. La sesión debe ejecutar `receive → claim → ack`.

### 9.4 Rehidratación

Una sesión existente solo puede retomarse si coinciden proyecto, raíz, plan, slice, role, lane, worktree, branch, assignment revision, host epoch y estado idle compatible.

Si la sesión anterior desapareció, un nuevo attempt puede reclamar el mismo assignment y worktree después de liberar ownership y reconciliar efectos.

### 9.5 Transición desde `jornada.sh`

`jornada.sh` sirve como:

- catálogo de casos de inventario;
- referencia para detección dirty/ahead/behind/upstream;
- fuente de fixtures sobre squash y PRs;
- wrapper legacy durante migración.

No es dependencia runtime. Sus acciones de merge, rebase, branch switch y branch deletion se separan en mecanismos con autoridad explícita.

## 10. Flujo de planificación e implementación

```text
Maintainer aprueba jornada
  → Main valida proyecto y snapshot
  → Support propone división/capacidad
  → Policy calcula elegibilidad
  → Main autoriza Planning dentro del horizonte
  → Planning produce proposal/spec/design/tasks
  → Policy marca slice preparado
  → Main autoriza Implementation
  → Implementation reconcilia contra base + Binding Delta
  → sdd-apply
  → sdd-verify
  → Implementation produce Binding Delta
  → Policy clasifica impacto
  → Main publica delta compatible
  → Main prepara entrega
  → Maintainer autoriza merge
  → post-merge check
  → Policy habilita siguiente slice
```

### 10.1 Reconciliación

Antes de apply, Implementation compara:

- Plan Manifest actual;
- proposal/spec/design/tasks preparados;
- base integrada actual;
- cadena de Binding Deltas;
- dependencias y campañas;
- jornada y assignment revision.

Puede actualizar diseño técnico y tasks ante drift compatible. No puede cambiar comportamiento o alcance material sin aprobación.

### 10.2 Publicación del Binding Delta

1. Implementation produce el delta.
2. `sdd-verify` valida claims y evidencia técnica.
3. Policy clasifica impacto.
4. Main publica automáticamente si es compatible y está dentro de jornada.
5. Drift material o ambiguo bloquea la publicación como input vinculante.

## 11. Clasificación de drift

### 11.1 Compatible

Puede reconciliarse automáticamente si preserva:

- comportamiento visible;
- criterios de aceptación;
- alcance;
- permisos y seguridad;
- datos y contratos externos;
- servicios/costos autorizados;
- reversibilidad;
- límites de jornada.

### 11.2 Material

Requiere Maintainer ante cambios de:

- comportamiento o aceptación;
- alcance o no-objetivos;
- permisos, seguridad o datos;
- contrato incompatible;
- servicio externo o costo material;
- operación irreversible;
- entrega/deploy;
- límites de jornada.

Ambigüedad equivale a `BLOCKED`.

## 12. Entrega y autorización Telegram

### 12.1 Delivery Coordinator

Delivery Coordinator es una capacidad de Main, no un agente. Después de verificación puede:

- crear commits convencionales como unidades revisables;
- push de la rama autorizada;
- crear o actualizar el PR;
- observar checks;
- emitir la solicitud de merge;
- ejecutar merge autorizado;
- verificar resultado y actualizar estado.

### 12.2 Sobre de autorización

Main persiste un objeto server-side similar a:

```yaml
authorization_id: auth-...
action: MERGE_PR
project_id: servitask
registry_revision: 3
plan_id: tasker-app
jornada_id: jornada-...
jornada_revision: 2
pr_number: 420
base_branch: main
base_sha: <sha>
head_sha: <sha>
required_checks_digest: sha256:<digest>
policy_report_digest: sha256:<digest>
expires_at: <timestamp-plus-30m>
nonce: <single-use>
```

Telegram recibe un identificador corto o callback, no un bearer autosuficiente.

### 12.3 Validación

Main MUST comprobar inmediatamente antes del merge:

- chat y usuario allowlisted;
- authorization y nonce vigentes;
- proyecto y registry revision;
- PR único y abierto;
- base y head SHA;
- checks actuales;
- Policy Report y evidencia;
- jornada no revocada;
- nonce no consumido.

Cambiar SHA, checks, Policy Report, registro o jornada invalida la autorización. El nonce se consume atómicamente.

Texto libre como “sí” nunca autoriza.

## 13. Recuperación e idempotencia

### 13.1 Fuentes reconciliadas

Main reconstruye estado comparando:

- registro Hermes;
- Plan Manifest y Binding Deltas;
- Git refs, commits y dirty state;
- PRs, SHAs, checks y merges;
- worktrees y sesiones;
- Tower assignments, claims, leases, locks, attempts y effects;
- host epoch;
- Policy Reports y autorizaciones.

### 13.2 Idempotency key

Toda mutación se vincula conceptualmente a:

```text
project + plan + slice + assignment revision + attempt
+ host epoch + operation + intended effect
```

La codificación exacta pertenece a REQUIREMENTS.

### 13.3 Reglas

- No repetir una mutación incierta sin observar su efecto.
- Preservar worktrees dirty.
- No limpiar evidencia para desbloquear artificialmente.
- No rehidratar mientras exista ownership previo válido.
- Bloquear ante double lease, mixed-host ownership o contradicción.
- Continuar desde commit/PR/merge existente en vez de reconstruirlo.
- Respetar expiración y máximo de intentos.

## 14. Campañas multiproyecto

### 14.1 Autoridad

Una campaña tiene `campaign_id` y un Main líder temporal elegido por el Maintainer. El líder coordina el DAG; no obtiene write authority directa sobre repositorios participantes.

Cada Main local valida:

- registro;
- plan y jornada;
- Policy Report;
- Git y PR;
- merge authorization.

### 14.2 Flujo V1

```text
validar precondiciones
  → preparar PR compatible en proyecto A
  → verificar y autorizar merge A
  → post-check A
  → preparar/continuar proyecto B
  → verificar y autorizar merge B
  → post-check B
  → cerrar campaña
```

Cada paso declara una compensación. Si un paso posterior falla, el Main líder solicita las compensaciones en orden válido; no asume que `git revert` revierte datos o infraestructura.

V1 no incluye atomicidad distribuida, deploy orchestration, traffic shifting ni feature flags generalizados.

## 15. Seguridad y amenazas

| Amenaza | Control |
|---|---|
| Alias apunta al proyecto equivocado | Mostrar selección y vincular `project_id` + registry revision |
| Ruta fue movida o sustituida | Bootstrap local y rederivación de root/common-dir/remote |
| Wake malicioso o accidental | Wake sin descriptor; `receive → claim → ack` obligatorio |
| Mensaje peer tratado como orden | Solo Main crea assignments; peer input es evidencia no autoritativa |
| Replay de aprobación Telegram | Nonce de un uso, expiración y consumo atómico |
| Aprobación sobre código viejo | Binding exacto a base/head SHA y checks revalidados |
| Dos hosts escriben | Un host activo, leases y `host_epoch` |
| Sesión vieja reaparece | Epoch y attempt anteriores carecen de autoridad |
| Artefacto alterado | Artifact ref, source commit y digest |
| Tower interpreta planes | API genérica y Policy Reports opacos |
| Hermes gana filesystem authority | Registry path-neutral y Main revalida |
| Retry duplica push/PR/merge | Idempotency key + inspección externa |
| Campaña invade otro proyecto | Cada Main conserva validación y merge local |

Los payloads de wake, Telegram y Tower no deben contener secretos ni tokens bearer reutilizables.

## 16. Observabilidad y auditoría

El sistema debe poder responder:

- qué proyecto, plan y jornada están activos;
- qué revisión y límites fueron aprobados;
- qué host epoch posee la línea;
- qué slices están preparados, elegibles, activos o bloqueados;
- qué sesión y attempt poseen cada assignment;
- qué worktree, branch y SHAs están vinculados;
- qué Binding Delta y Policy Report justifican el siguiente paso;
- qué PR espera merge y qué autorización existe;
- por qué ocurrió un failover, bloqueo o compensación.

Los eventos de autoridad deben registrar actor, target, revisión, evidencia, resultado y timestamp. La UI puede resumirlos, pero no reemplazar el registro durable.

## 17. Integración con el runtime existente

V1 debe conservar la arquitectura actual:

- `core.mjs` es la única autoridad sobre SQLite;
- CLI, MCP, plugins y host adapters llaman al core;
- no existe acceso directo de adapters a tablas internas;
- el runtime permanece desarmado por defecto durante migración;
- los contratos nuevos son aditivos y versionados;
- la publicación de runtime requiere cutover y rollback explícitos.

La macroarquitectura no debe expandir indiscriminadamente el cambio `autonomous-continuation-control-tower`. Los componentes de producto se entregarán mediante cambios OpenSpec separados y dependientes del sustrato.

## 18. Estrategia de adopción

### Etapa 0 — Contratos

- aprobar PRD, RFC y REQUIREMENTS;
- definir schemas y matrices de conformidad;
- actualizar roadmap y dependencias.

### Etapa 1 — Observación

- registro path-neutral read-only;
- estado de proyecto/plan sin mutaciones;
- Policy Reports y propuestas en dry-run;
- inventario Workspace Manager read-only.

### Etapa 2 — Un proyecto y un host

- jornada `short`;
- OpenCode o Pi como línea única;
- un slice;
- worktree efímero;
- commit/push/PR controlados;
- merge exacto por Telegram.

### Etapa 3 — Failover

- validar caída OpenCode → Pi;
- demostrar suspensión, lease expiry, inspección y nuevo host epoch;
- asegurar ausencia de writers simultáneos.

### Etapa 4 — Continuidad

- jornada `standard`;
- planning adelantado;
- dos slices;
- Binding Delta y reconciliación automática compatible.

### Etapa 5 — Multiproyecto

- campaña de dos repositorios;
- PRs compatibles ordenados;
- compensación ensayada;
- sin deploy orchestration.

## 19. Rollback de adopción

- Mantener todas las capacidades mutables nuevas apagadas por defecto.
- Conservar observabilidad read-only de Hermes durante rollback.
- Detener creación de nuevos assignments antes de desactivar adapters.
- Permitir que attempts existentes se suspendan o cierren con evidencia.
- Preservar Git, worktrees dirty, PRs y reportes.
- Volver al flujo manual sin reescribir la historia de artefactos.
- No relocalizar repositorios como parte del rollback.

## 20. Alternativas descartadas

| Alternativa | Motivo de descarte |
|---|---|
| Tower interpreta OpenSpec | Mezcla mecanismo con producto y aumenta superficie de fallo |
| Hermes dirige workers | Convierte la UX remota en autoridad transversal |
| Hermes posee físicamente repositorios | Rompe path bindings, worktrees y fronteras de proyecto |
| Un Main global para todos los proyectos | Debilita aislamiento y hace ambiguas las campañas |
| Agentes separados para reconciliation/delta/delivery | Infla roles para representar fases y capacidades |
| Worktrees permanentes reciclados por branch switch | Conserva ownership y estado ambiguos |
| Routing mixto Pi/OpenCode por jornada | Complica costos, debugging, recovery y exclusividad |
| Failover inmediato sin inspección | Puede crear dos writers o repetir efectos |
| Merge automático dentro de jornada | Elimina la frontera humana irreversible |
| `jornada.sh` como motor runtime | Mezcla observación, rebase, branch deletion y merge |
| Policy Report versionado en cada commit | Introduce churn operativo y mezcla runtime con intención |
| Atomicidad distribuida entre repos | No puede garantizarse sobre Git/servicios independientes |
| Nuevo framework o servicio distribuido | El runtime Bun ESM existente es suficiente para V1 |

## 21. Detalles delegados a REQUIREMENTS

Esta RFC cierra la arquitectura. REQUIREMENTS debe fijar sin reabrirla:

- schemas y canonicalización;
- estados y transiciones exactos;
- validadores y códigos de error;
- idempotency key y retención;
- storage físico del Main control store;
- contratos Workspace Manager y Host Launcher;
- probes, timeouts y lease expiry;
- callback Telegram y nonce storage;
- policy rules y drift taxonomy machine-readable;
- campaign manifest y compensation contract;
- conformance matrix Pi/OpenCode/Claude;
- aceptación y escenarios Given/When/Then.

## 22. Siguiente paso

Crear [`../specs/sdd-tower-implementation-v1-requirements.md`](../specs/sdd-tower-implementation-v1-requirements.md) como contrato normativo de implementación, validación, seguridad y recuperación.
