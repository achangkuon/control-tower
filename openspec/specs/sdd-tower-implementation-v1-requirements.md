# REQUIREMENTS — SDD Tower Implementation V1

**Estado:** Propuesto para aprobación
**PRD:** [`../prd/sdd-tower-implementation-v1.md`](../prd/sdd-tower-implementation-v1.md)
**RFC:** [`../rfc/sdd-tower-implementation-v1.md`](../rfc/sdd-tower-implementation-v1.md)

## 1. Convenciones normativas

Las palabras **MUST**, **MUST NOT**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT** y **MAY** se interpretan según RFC 2119.

### 1.1 Tipos básicos

| Tipo | Regla V1 |
|---|---|
| `slug` | `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`, 1–63 caracteres |
| `artifact_id` | Mismo alfabeto que `slug`, 1–128 caracteres |
| `revision` | Entero positivo, monotónico dentro de su identidad |
| `timestamp` | RFC 3339 UTC con sufijo `Z` |
| `git_sha` | Hexadecimal lowercase de 40 o 64 caracteres |
| `digest` | `sha256:` seguido por 64 caracteres hex lowercase |
| `repo_path` | Ruta relativa POSIX, sin `..`, NUL, backslash ni raíz absoluta |
| `absolute_path` | `realpath` absoluto existente en el host registrado |
| `uri` | URI absoluta sin credenciales embebidas |

IDs, paths, timestamps o SHAs que no satisfagan estas reglas MUST ser rechazados antes de producir una mutación.

### 1.2 Canonicalización

Los YAML versionados MUST usar un subconjunto JSON-compatible de YAML 1.2:

- sin tags personalizados;
- sin anchors, aliases o merge keys;
- sin claves duplicadas;
- sin números fuera del rango seguro de enteros JSON;
- timestamps representados como strings;
- objetos con claves string.

Los artefactos estructurados YAML/JSON MUST usar `digest_mode: rfc8785-jcs`. Para calcular su `content_digest`:

1. parsear el documento a un valor JSON-compatible;
2. rechazar construcciones no permitidas;
3. serializar mediante JSON Canonicalization Scheme, RFC 8785;
4. codificar UTF-8;
5. calcular SHA-256;
6. emitir `sha256:<lowercase-hex>`.

Los artefactos opacos, incluyendo Markdown, logs y evidencia binaria, MUST usar `digest_mode: raw-bytes`; su SHA-256 se calcula sobre los bytes exactos almacenados en Git o en el store declarado, sin normalizar saltos de línea ni encoding.

El ArtifactRef MUST declarar `media_type` y `digest_mode`. El digest MUST cubrir el contenido completo. `source_commit` y `content_digest` MUST vivir en un `artifact-ref` externo para evitar autorreferencia.

## 2. Ubicaciones canónicas

### 2.1 Documentos de producto

```text
openspec/prd/sdd-tower-implementation-v1.md
openspec/rfc/sdd-tower-implementation-v1.md
openspec/specs/sdd-tower-implementation-v1-requirements.md
openspec/plans/master-index.md
```

### 2.2 Manifest catalogs y planes

```text
openspec/plans/manifest.yaml
openspec/plans/<plan_id>/manifest.yaml
openspec/plans/<plan_id>/binding-deltas/<slice_id>-r<revision>.yaml
```

`openspec/plans/manifest.yaml` es el catálogo machine-readable. `master-index.md` es la hoja de ruta humana y MUST referenciar el catálogo sin duplicar schemas normativos.

### 2.3 Estado fuera del repositorio

Defaults V1:

```text
Registry:
${XDG_CONFIG_HOME:-$HOME/.config}/control-tower/projects.yaml

Main control store:
${XDG_STATE_HOME:-$HOME/.local/state}/control-tower/projects/<project_id>/
├── policy-reports/
├── authorizations/
├── campaigns/
└── audit/
```

Requisitos:

- directorios MUST usar permisos equivalentes a `0700`;
- archivos MUST usar permisos equivalentes a `0600`;
- escrituras MUST usar temp file, flush, fsync y atomic rename en el mismo filesystem;
- el store MUST NOT contener tokens GitHub, Telegram, OAuth o credenciales de agentes;
- una ruta configurable MAY reemplazar el default, pero queda vinculada a la revisión del registro.

El registro Hermes existente MAY importarse, pero la migración MUST producir una única entrada canónica por `project_id`.

## 3. Schemas requeridos

La implementación MUST publicar JSON Schemas equivalentes a:

```text
schemas/project-registry-v1.schema.json
schemas/artifact-ref-v1.schema.json
schemas/plan-catalog-v1.schema.json
schemas/plan-manifest-v1.schema.json
schemas/binding-delta-v1.schema.json
schemas/policy-report-v1.schema.json
schemas/jornada-v1.schema.json
schemas/assignment-v1.schema.json
schemas/authorization-v1.schema.json
schemas/campaign-v1.schema.json
```

Todos los validators MUST rechazar propiedades desconocidas salvo que el schema declare explícitamente un objeto `extensions` namespaced.

## 4. Encabezado de artefacto y ArtifactRef

### 4.1 Encabezado intrínseco

Todo Plan Manifest y Binding Delta MUST incluir:

```yaml
schema: <plan-manifest|binding-delta>
schema_version: 1
artifact_id: <artifact_id>
project_id: <slug>
plan_id: <slug>
artifact_revision: <positive-integer>
created_at: <RFC3339-UTC>
producer:
  role: <main|policy|planning|implementation>
  identity: <stable-identity>
  direction: <stable-direction>
```

`producer.identity` MUST corresponder a una sesión o identidad registrada y válida para el rol.

### 4.2 ArtifactRef

```yaml
schema: artifact-ref
schema_version: 1
artifact_id: <artifact_id>
artifact_revision: 1
repository_id: <project_id>
repo_relative_path: <repo_path>
media_type: <media-type>
digest_mode: <rfc8785-jcs|raw-bytes>
source_commit: <git_sha>
content_digest: <digest>
manifest_revision: 4
assignment_revision: 7
```

Reglas:

- `repo_relative_path` MUST resolver dentro de `canonical_root` después de resolver symlinks.
- `digest_mode: rfc8785-jcs` MUST usarse para YAML/JSON estructurado y `raw-bytes` para Markdown, logs y artefactos opacos.
- `media_type` MUST coincidir con el tipo de artefacto validado.
- `source_commit` MUST existir en el repositorio esperado.
- El archivo leído desde `source_commit:path` MUST producir `content_digest`.
- `manifest_revision` y `assignment_revision` MAY omitirse solo cuando no aplican.
- Un ArtifactRef inválido MUST producir `CT_ARTIFACT_REF_INVALID`.

## 5. Project Registry

### 5.1 Entrada

```yaml
schema: project-registry
schema_version: 1
registry_revision: 3
projects:
  - project_id: proyecto-alpha
    aliases: [proyecto-alpha, proyecto-alpha-task]
    canonical_root: /home/user/projects/Proyecto-Alpha/Main
    git_common_dir: /home/user/projects/Proyecto-Alpha/Main/.git
    expected_remote: git@github.com:owner/proyecto-alpha.git
    main_branch: main
    main_session: proyecto-alpha-main
    manifest_path: openspec/plans/manifest.yaml
    roadmap_path: openspec/plans/master-index.md
    main_store_path: /home/user/.local/state/control-tower/projects/proyecto-alpha
    allowed_hosts: [pi, opencode]
    registry_entry_revision: 2
```

### 5.2 Invariantes

- `project_id` MUST ser único.
- Un alias MUST resolver a como máximo un proyecto.
- `canonical_root` y `git_common_dir` MUST ser `realpath`.
- `canonical_root` MUST pertenecer al `git_common_dir` declarado.
- `expected_remote` MUST normalizar a una identidad owner/repository inequívoca.
- `main_branch` MUST existir local o remotamente.
- `main_session` MUST seguir `<project>-main`.
- `manifest_path` y `roadmap_path` MUST ser repo-relative.
- La entrada inicial y cualquier cambio de root/common-dir/remote MUST requerir bootstrap local.
- Cada mutación MUST incrementar `registry_revision` y `registry_entry_revision`.

### 5.3 Resolución

Un alias MAY producir una propuesta UX. Toda operación autoritativa MUST incluir `project_id` y `registry_revision` exactos.

Si Main rederiva un valor distinto, MUST devolver `CT_PROJECT_IDENTITY_MISMATCH` y no ejecutar efectos.

## 6. Plan Catalog y Plan Manifest

### 6.1 Plan Catalog

```yaml
schema: plan-catalog
schema_version: 1
project_id: proyecto-alpha
catalog_revision: 1
plans:
  - plan_id: tasker-app
    manifest_ref: <artifact-ref-or-relative-reference>
    roadmap_anchor: tasker-app
```

El catálogo MUST contener IDs únicos y referencias resolubles. No contiene runtime status.

### 6.2 Plan Manifest

```yaml
schema: plan-manifest
schema_version: 1
artifact_id: plan-tasker-app
project_id: proyecto-alpha
plan_id: tasker-app
artifact_revision: 4
created_at: 2026-07-27T12:00:00Z
producer:
  role: main
  identity: proyecto-alpha-main
  direction: product-intent-to-policy
objective: <non-empty-string>
artifact_refs:
  prd: <artifact-ref>
  rfc: <artifact-ref>
  requirements: <artifact-ref>
  roadmap: <artifact-ref>
jornada_policy:
  default_preset: standard
  allowed_presets: [short, standard, extended]
delivery_policy:
  automatic_commit: true
  automatic_push: true
  automatic_pr: true
  automatic_merge: false
slices:
  - slice_id: notifications
    goal: <non-empty-string>
    dependencies: []
    openspec_change: notifications
    acceptance_refs: [<artifact-ref>]
constraints: []
non_goals: []
binding_delta_refs: []
campaign_refs: []
```

### 6.3 Invariantes

- `slices[].slice_id` MUST ser único.
- Cada dependencia MUST referenciar un slice existente.
- El DAG MUST ser acíclico.
- `automatic_merge` MUST ser `false` en V1.
- Cada `openspec_change` MUST resolver a un cambio o identificador reservado.
- `binding_delta_refs` MUST formar una cadena válida por plan/slice.
- El manifest MUST NOT contener: `session_id`, worktree activo, lease, lock, attempt, heartbeat, host epoch runtime o mutable runtime timestamps.
- Cambiar objetivo, DAG, aceptación, restricciones o no-objetivos MUST incrementar `artifact_revision`.

## 7. Binding Delta

### 7.1 Schema

```yaml
schema: binding-delta
schema_version: 1
artifact_id: delta-tasker-notifications
project_id: proyecto-alpha
plan_id: tasker-app
artifact_revision: 1
created_at: 2026-07-27T15:00:00Z
producer:
  role: implementation
  identity: proyecto-alpha-tasker-app-notifications-implementation-a1
  direction: implementation-to-policy
slice_id: notifications
assignment_id: assignment-notifications-7
assignment_revision: 7
inputs:
  manifest: <artifact-ref>
  proposal: <artifact-ref>
  specs: [<artifact-ref>]
  design: <artifact-ref>
  tasks: <artifact-ref>
  previous_delta: null
git:
  base_sha: <git_sha>
  result_sha: <git_sha>
  branch: feat/tasker-app/notifications
  pull_request:
    repository: owner/repository
    number: 420
contracts:
  added: []
  changed: []
  removed: []
deviations: []
new_constraints: []
dependency_impact: []
next_slice_impact: []
verification_evidence: [<evidence-ref>]
producer_drift_assessment:
  classification: compatible
  categories: []
  rationale: <non-empty-string>
```

### 7.2 Reglas

- `base_sha` MUST ser ancestro o base aprobada del resultado.
- `result_sha` MUST corresponder al contenido verificado.
- La rama MUST coincidir con el assignment.
- Un PR declarado MUST corresponder a repo, branch, base y head esperados.
- `producer_drift_assessment` es evidencia, no decisión Policy.
- `previous_delta` MUST coincidir con la última revisión publicada cuando existe.
- El delta MUST ser inmutable después de producir su ArtifactRef.
- Una corrección MUST usar `artifact_revision + 1` y referenciar la revisión anterior.

### 7.3 Publicación

Estados del registro de publicación, fuera del YAML:

```text
CANDIDATE → VERIFIED → CLASSIFIED → ACCEPTED → PUBLISHED
                          └────────→ APPROVAL_REQUIRED
                          └────────→ REJECTED
```

- Implementation crea `CANDIDATE`.
- `sdd-verify` puede moverlo a `VERIFIED` únicamente con evidencia válida.
- Policy produce `CLASSIFIED`.
- Main puede aceptar automáticamente solo clasificación `COMPATIBLE` dentro de jornada.
- `PUBLISHED` requiere que el ArtifactRef resuelva desde la base canónica integrada.
- Material o ambiguo MUST pasar por `APPROVAL_REQUIRED`.

## 8. Policy Report

### 8.1 Schema

```json
{
  "schema": "policy-report",
  "schema_version": 1,
  "report_id": "policy-tasker-00042",
  "project_id": "proyecto-alpha",
  "plan_id": "tasker-app",
  "policy_identity": "proyecto-alpha-tasker-app-policy",
  "created_at": "2026-07-27T15:05:00Z",
  "expires_at": "2026-07-27T15:35:00Z",
  "inputs": {
    "manifest_ref": {},
    "binding_delta_refs": [],
    "runtime_projection_revision": 42,
    "jornada_id": "jornada-proyecto-alpha-tasker-001",
    "jornada_revision": 1
  },
  "decision": "READY_FOR_APPLY",
  "eligible_slices": ["next-slice"],
  "blocked_slices": [],
  "drift": {
    "classification": "COMPATIBLE",
    "categories": [],
    "rationale": "..."
  },
  "effective_limits": {},
  "required_approvals": [],
  "conflicts": [],
  "evidence_refs": [],
  "authority_attestation_ref": "tower-attestation-..."
}
```

### 8.2 Enums

`decision` MUST ser uno de:

- `READY_FOR_PLANNING`;
- `READY_FOR_APPLY`;
- `APPROVAL_REQUIRED`;
- `BLOCKED`;
- `PLAN_COMPLETE`.

`drift.classification` MUST ser:

- `COMPATIBLE`;
- `MATERIAL`;
- `AMBIGUOUS`;
- `NOT_APPLICABLE`.

### 8.3 Vigencia

- Todo report MUST incluir `expires_at`.
- La vigencia V1 máxima MUST ser 30 minutos para alinearse con la autorización de merge.
- Un report expirado MAY mostrarse como histórico, pero MUST NOT autorizar nuevo trabajo.
- Un cambio de manifest, delta chain, jornada revision o runtime projection MUST invalidarlo.

## 9. Drift taxonomy

Categorías machine-readable:

```text
behavior
acceptance
scope
permissions
security
data
external-contract
external-service
cost
irreversibility
delivery-policy
jornada-limit
technical-internal
```

Policy MAY emitir `COMPATIBLE` únicamente cuando todas las categorías afectadas son `technical-internal` y preservan comportamiento, aceptación, scope, permisos, seguridad, datos, contratos, costos, reversibilidad, entrega y límites.

Cualquier categoría material MUST producir `MATERIAL`. Evidencia insuficiente o contradictoria MUST producir `AMBIGUOUS`.

## 10. Jornada

### 10.1 Presets

```yaml
schema: jornada-presets
schema_version: 1
preset_revision: 1
presets:
  short:
    duration_seconds: 7200
    apply_slice_ceiling: 1
    planning_horizon: 1
    planner_ceiling: 2
    apply_ceiling: 1
    max_attempts_per_slice: 2
  standard:
    duration_seconds: 28800
    apply_slice_ceiling: 2
    planning_horizon: 2
    planner_ceiling: 3
    apply_ceiling: 2
    max_attempts_per_slice: 2
  extended:
    duration_seconds: 57600
    apply_slice_ceiling: 4
    planning_horizon: 3
    planner_ceiling: 5
    apply_ceiling: 4
    max_attempts_per_slice: 2
```

### 10.2 Snapshot

Una autorización MUST congelar:

- `jornada_id` y revision;
- project/plan/registry revision;
- preset name/revision;
- límites efectivos;
- start/expiry;
- execution host;
- fallback host opcional;
- allowed operations;
- manifest ref;
- authorization ref.

### 10.3 Estados y transiciones

| Desde | Hacia permitidos | Condición |
|---|---|---|
| `DRAFT` | `PENDING_AUTHORIZATION` | Snapshot válido |
| `PENDING_AUTHORIZATION` | `ACTIVE`, `REJECTED`, `EXPIRED` | Aprobación exacta, rechazo o timeout |
| `ACTIVE` | `PAUSED`, `BLOCKED`, `EXPIRED`, `REVOKED`, `COMPLETED` | Comando o condición validada |
| `PAUSED` | `ACTIVE`, `EXPIRED`, `REVOKED` | Resume sin ampliar límites |
| `BLOCKED` | `ACTIVE`, `EXPIRED`, `REVOKED` | Evidencia o autorización resuelve el bloqueo |
| Terminal | Ninguno | `REJECTED`, `EXPIRED`, `REVOKED`, `COMPLETED` son terminales |

Ampliar límites crea nueva `jornada_revision` y nueva autorización; no es un transition in-place silencioso.

### 10.4 Stop conditions

Main MUST impedir nuevos attempts ante:

- expiración, pause o revoke;
- slice/attempt/concurrency budget agotado;
- drift material o ambiguo;
- verificación fallida sin retry disponible;
- operación destructiva o producción no autorizada;
- host sin fallback elegible;
- evidencia contradictoria;
- Policy Report expirado;
- registry o manifest revision cambiados.

## 11. Assignment y session identity

### 11.1 Assignment envelope

```yaml
schema: assignment
schema_version: 1
assignment_id: assignment-notifications-7
assignment_revision: 7
project_id: proyecto-alpha
registry_revision: 3
plan_id: tasker-app
slice_id: notifications
role: implementation
lane: apply
jornada_id: jornada-proyecto-alpha-tasker-001
jornada_revision: 1
host: opencode
host_epoch: 1
attempt: 1
session_name: proyecto-alpha-tasker-app-notifications-implementation-a1
workspace:
  path: /.../Worktrees/tasker-app/apply/notifications
  branch: feat/tasker-app/notifications
  base_sha: <git_sha>
inputs: [<artifact-ref>]
expires_at: <timestamp>
```

### 11.2 Nombres

```text
Slice session: <project>-<plan>-<slice>-<planning|implementation>-a<positive-int>
Main:          <project>-main
Support:       <project>-support
Policy:        <project>-<plan>-policy
```

La sesión completa MUST tener máximo 160 caracteres. Slugs MAY abreviarse mediante alias estable registrado; truncado silencioso está prohibido.

### 11.3 Autoridad

Una sesión MUST completar:

```text
receive → claim → ack
```

antes de mutar. Wake, prompt inicial, Intercom o host lifecycle event MUST NOT sustituirlo.

Una sesión puede reutilizarse solo si coinciden exactamente project/root/common-dir/plan/slice/role/lane/worktree/branch/assignment revision/host epoch y estado idle sin claim incompatible.

## 12. Slice projection

Main proyecta cada slice en uno de:

```text
NOT_ELIGIBLE
READY_FOR_PLANNING
PLANNING
PREPARED
READY_FOR_APPLY
IMPLEMENTING
VERIFYING
DELIVERY_READY
WAITING_MERGE
MERGED
COMPLETE
BLOCKED
```

Transiciones normales:

```text
NOT_ELIGIBLE → READY_FOR_PLANNING → PLANNING → PREPARED
PREPARED → READY_FOR_APPLY → IMPLEMENTING → VERIFYING
VERIFYING → DELIVERY_READY → WAITING_MERGE → MERGED → COMPLETE
```

Cualquier estado no terminal MAY ir a `BLOCKED`. Reingreso desde `BLOCKED` requiere Policy Report nuevo y evidencia reconciliada. `COMPLETE` no reabre; una corrección crea un nuevo slice/change.

## 13. Workspace Manager

### 13.1 API lógica

```text
workspace.inspect(request) -> inventory report
workspace.create(request)  -> workspace binding
workspace.retire(request)  -> retirement receipt
```

Toda request MUST incluir project ID, registry revision, git common dir, target path, branch, base SHA, assignment revision e idempotency key.

### 13.2 Inspect

- MUST ser read-only.
- MUST usar comportamiento equivalente a `GIT_OPTIONAL_LOCKS=0` donde sea posible.
- MUST reportar branch, HEAD, base relation, dirty count, upstream, ahead/behind, PR evidence, active process/claim refs y repository identity.
- MUST NOT ejecutar fetch salvo opción explícita autorizada.

### 13.3 Create

- Target MUST seguir `Worktrees/<plan>/<lane>/<slice>` bajo el contenedor del proyecto.
- Branch MUST seguir `plan/<plan>/<slice>` o `feat/<plan>/<slice>`.
- Base SHA MUST existir y pertenecer al remote esperado.
- Si path o branch existen con binding distinto, MUST bloquear.
- Repetir la misma idempotency key MUST devolver el mismo binding o el resultado terminal previo.
- MUST registrar receipt antes de lanzar host.

### 13.4 Retire

Retirement MUST exigir:

- ausencia de sesión/claim/lease activo;
- worktree clean;
- entrega cerrada o cancelación explícita;
- evidencia remota cuando hubo PR;
- preservación del Binding Delta y audit refs;
- identidad Git coincidente.

Dirty, detached, unknown HEAD, PR incierto o branch con trabajo no demostrado MUST producir `CT_WORKSPACE_RETIRE_UNSAFE`.

`jornada.sh` MAY llamar estas APIs como wrapper legacy. No MAY ejecutar su reciclaje antiguo detrás de ellas.

## 14. Host Launcher y failover

### 14.1 Adapter contract

Cada adapter MUST implementar:

```text
host.capabilities()
host.launch(request)
host.inspect(session_ref)
host.stop(session_ref)
host.health()
```

`launch` MUST recibir cwd, session name, role, assignment ref y host epoch. El prompt inicial MUST ser genérico y sin bearer authority.

### 14.2 Hosts V1

- Pi y OpenCode MUST pasar la matriz completa antes de ser `allowed_hosts`.
- Claude MAY habilitarse solo después de pasar la misma matriz y por opt-in.
- Una jornada MUST tener exactamente un `execution_host` activo.
- `fallback_host` MUST ser distinto, permitido y conforme.

### 14.3 Liveness defaults

- Adapter heartbeat: cada 15 segundos.
- Host `SUSPECTED`: 3 heartbeats consecutivos ausentes.
- Host `UNAVAILABLE`: 60 segundos sin heartbeat y health probe fallido.
- Estos defaults son versionados; cambiarlos no altera jornadas activas.

### 14.4 Failover

Failover preautorizado MUST:

1. detener creación de attempts;
2. solicitar stop del proceso/sesión anterior;
3. obtener prueba de salida o bloquear;
4. esperar cierre/expiración de claims y leases;
5. inspeccionar worktree, Git y efectos externos;
6. preservar dirty state;
7. incrementar `host_epoch`;
8. crear attempts nuevos en fallback;
9. rechazar mensajes/claims del epoch anterior.

Lease expiry sin prueba de que el proceso escritor terminó MUST NOT autorizar reutilización del mismo worktree.

## 15. Main control store

### 15.1 Policy Reports

Path:

```text
policy-reports/<plan_id>/<report_id>.json
```

Inmutables. El índice de vigencia MAY ser mutable mediante reemplazo atómico.

### 15.2 Authorizations

Path:

```text
authorizations/<authorization_id>.json
```

Debe registrar estado:

```text
PENDING → CONSUMED
        → REJECTED
        → EXPIRED
        → REVOKED
```

Ningún estado terminal puede volver a `PENDING`.

### 15.3 Audit

Cada efecto de autoridad MUST registrar:

- event ID;
- timestamp;
- actor identity;
- project/plan/jornada;
- target;
- input revisions/digests;
- idempotency key;
- decisión;
- resultado o error code;
- external evidence ref.

## 16. Telegram authorization

### 16.1 Canal

- Chat MUST ser privado.
- Telegram `user_id` y `chat_id` MUST estar allowlisted.
- Update ID MUST deduplicarse.
- Hermes presenta; Main crea, valida y consume.
- Free text MUST NOT autorizar.

### 16.2 Merge envelope

```yaml
schema: authorization
schema_version: 1
authorization_id: auth-merge-420-001
action: MERGE_PR
project_id: proyecto-alpha
registry_revision: 3
plan_id: tasker-app
jornada_id: jornada-proyecto-alpha-tasker-001
jornada_revision: 1
pr:
  repository: owner/repository
  number: 420
  base_branch: main
  base_sha: <git_sha>
  head_sha: <git_sha>
required_checks_digest: <digest>
policy_report_digest: <digest>
created_at: <timestamp>
expires_at: <created-plus-30-minutes>
nonce_hash: <digest>
state: PENDING
```

### 16.3 Callback y fallback command

- Callback MUST contener solo versión, action y token opaco.
- Token MUST tener al menos 96 bits aleatorios.
- El store conserva únicamente hash del token.
- Fallback textual MUST usar `/ct approve <code>` o `/ct reject <code>`.
- `<code>` MUST contener al menos 80 bits aleatorios en una codificación no ambigua.
- Código/token MUST estar vinculado a user ID, chat ID y authorization ID.

### 16.4 Consumo

Antes del merge, Main MUST revalidar:

- authorization `PENDING` y no expirada;
- allowlist;
- registry/project/plan/jornada revision;
- repo y PR únicos;
- PR abierto y no draft;
- base branch/base SHA/head SHA;
- head local/remoto cuando aplique;
- required checks actuales;
- mergeability;
- Policy Report vigente y digest;
- ausencia de revoke/pause incompatible.

El token se consume atómicamente antes de solicitar el efecto externo. Si el merge falla, la autorización permanece consumida y se crea una nueva solicitud después de reconciliar.

### 16.5 Jornada authorization

Usa el mismo schema con `action: START_JORNADA` y MUST vincular el snapshot completo: preset/revision, límites, manifest ref, execution host y fallback host.

## 17. Delivery

### 17.1 Efectos permitidos

Dentro de jornada válida, Main MAY autorizar:

```text
CREATE_COMMIT
PUSH_BRANCH
CREATE_OR_UPDATE_PR
REQUEST_MERGE_AUTHORIZATION
MERGE_PR
POST_MERGE_VERIFY
```

`MERGE_PR` exige authorization consumible. Los efectos previos exigen verificación, assignment válido e idempotency key.

### 17.2 Commit

- MUST ser conventional commit.
- MUST representar una unidad revisable.
- MUST NOT incluir atribución a IA.
- Tests y docs relacionados SHOULD permanecer con el código correspondiente.

### 17.3 PR

- Debe existir exactamente un PR abierto esperado por branch/base.
- Actualizar un PR MUST preservar issue/plan/slice refs.
- Un cambio de head SHA MUST invalidar authorization previa.

### 17.4 Merge

- MUST usar protección equivalente a match-head-commit.
- MUST verificar estado terminal `MERGED`.
- MUST capturar merge SHA.
- MUST ejecutar post-merge verification.
- Fallo post-merge MUST producir `BLOCKED` y compensation/incident path, no “unmerge” especulativo.

## 18. Idempotencia

### 18.1 Canonical key

Input lógico:

```json
{
  "schema_version": 1,
  "project_id": "proyecto-alpha",
  "plan_id": "tasker-app",
  "slice_id": "notifications",
  "assignment_revision": 7,
  "attempt": 1,
  "host_epoch": 1,
  "operation": "CREATE_OR_UPDATE_PR",
  "target": "owner/repository:feat/tasker-app/notifications:main"
}
```

Key:

```text
ctv1:<sha256-of-RFC8785-canonical-input>
```

### 18.2 Reglas

- Mismo key + mismo input MUST devolver resultado previo.
- Mismo key + input diferente MUST producir `CT_IDEMPOTENCY_CONFLICT`.
- Resultado desconocido MUST iniciar inspección, no replay.
- Efectos externos MUST almacenar request, observation y terminal evidence.

## 19. Recovery

### 19.1 Orden

1. cargar registro y rederivar identidad;
2. cargar manifest/delta chain;
3. cargar Tower runtime y Main store;
4. inspeccionar procesos y sesiones;
5. inspeccionar worktrees y Git;
6. inspeccionar PRs/checks/merges;
7. clasificar cada efecto como absent, present, terminal, contradictory o unknown;
8. continuar, suspender o bloquear.

### 19.2 Resultados

| Evidencia | Acción |
|---|---|
| Sesión caída, worktree intacto, ownership cerrado | Nuevo attempt |
| Dirty worktree, proceso terminado, assignment válido | Rehidratar preservando cambios |
| Commit existe | Continuar desde commit |
| Branch pushed/PR existe | Continuar desde entrega observada |
| PR merged | Post-check y cierre |
| Proceso anterior no puede probarse terminado | `BLOCKED` |
| Double lease o mixed host | `BLOCKED` |
| Efecto externo unknown | Inspección/`BLOCKED`, nunca replay ciego |
| Dos attempts agotados | `BLOCKED` y escalación |

## 20. Campañas multiproyecto

### 20.1 Schema

```yaml
schema: campaign
schema_version: 1
campaign_id: campaign-contract-v2
campaign_revision: 1
lead:
  project_id: control-tower
  main_identity: control-tower-main
steps:
  - step_id: producer-compatible-change
    project_id: backend
    plan_id: contract-v2
    depends_on: []
    expected_pr_ref: null
    preconditions: []
    post_checks: []
    compensation_ref: <artifact-ref>
  - step_id: consumer-change
    project_id: frontend
    plan_id: contract-v2
    depends_on: [producer-compatible-change]
    expected_pr_ref: null
    preconditions: []
    post_checks: []
    compensation_ref: <artifact-ref>
```

### 20.2 Reglas V1

- DAG MUST ser acíclico.
- Cada project MUST resolver mediante su propio registry/Main.
- El lead Main puede ordenar y observar; no puede reclamar local assignments.
- Delivery MUST ser serializada por step.
- Cada merge exige authorization local exacta.
- Compensation MUST existir antes de iniciar un step con impacto posterior.
- Compensation no puede declararse `git revert` si existen datos/infra no reversibles.
- Feature flags, traffic shifting y deploy orchestration están fuera de V1.

## 21. Error codes

| Código | Significado |
|---|---|
| `CT_SCHEMA_INVALID` | Payload no satisface schema/canonicalización |
| `CT_ARTIFACT_REF_INVALID` | Ref, commit, path o digest inválido |
| `CT_PROJECT_UNKNOWN` | Project ID no registrado |
| `CT_PROJECT_AMBIGUOUS` | Alias resuelve más de un proyecto |
| `CT_PROJECT_IDENTITY_MISMATCH` | Root/common-dir/remote/branch/revision difieren |
| `CT_MANIFEST_INVALID` | Manifest o DAG inválido |
| `CT_POLICY_EXPIRED` | Policy Report no vigente |
| `CT_POLICY_BLOCKED` | Policy no habilita operación |
| `CT_JORNADA_INACTIVE` | Jornada no ACTIVE |
| `CT_JORNADA_LIMIT` | Límite agotado |
| `CT_ASSIGNMENT_STALE` | Assignment revision/attempt/epoch obsoleto |
| `CT_CLAIM_REQUIRED` | Falta receive/claim/ack |
| `CT_HOST_UNAVAILABLE` | Host activo no responde |
| `CT_FAILOVER_UNSAFE` | No se demostró exclusividad |
| `CT_WORKSPACE_CONFLICT` | Path/branch/binding incompatible |
| `CT_WORKSPACE_RETIRE_UNSAFE` | Retiro destruiría estado no probado |
| `CT_DRIFT_APPROVAL_REQUIRED` | Drift material |
| `CT_DRIFT_AMBIGUOUS` | Drift no clasificable |
| `CT_AUTH_INVALID` | Token/chat/user/envelope inválido |
| `CT_AUTH_EXPIRED` | Authorization expirada |
| `CT_AUTH_CONSUMED` | Nonce ya usado |
| `CT_MERGE_TARGET_CHANGED` | PR/base/head/checks cambiaron |
| `CT_IDEMPOTENCY_CONFLICT` | Key reutilizado con otro input |
| `CT_EFFECT_UNKNOWN` | Resultado externo no demostrable |
| `CT_CAMPAIGN_BLOCKED` | Step o compensación no elegible |

Errores MUST incluir código, mensaje seguro, project/operation ref, retryability y evidence refs. MUST NOT filtrar secretos.

## 22. Retención y limpieza

- Plan Manifest y Binding Delta: permanentes en Git.
- Audit de autoridad: mínimo 90 días después de jornada/campaña terminal.
- Authorizations: mínimo 90 días, con tokens secretos eliminados al terminalizar.
- Policy Reports: mínimo 30 días después del plan terminal.
- Idempotency results: mínimo 90 días para delivery y merge; duración de jornada + 7 días para operaciones no externas.
- Worktrees clean cerrados MAY retirarse después de receipt.
- Dirty/unknown worktrees MUST NOT expirar por tiempo automáticamente.

Políticas mayores MAY conservar más, nunca menos que estos mínimos V1.

## 23. Matriz de conformidad de hosts

Pi y OpenCode MUST pasar todos los casos:

| Capacidad | Requisito |
|---|---|
| Launch | Inicia cwd y session name exactos |
| Generic wake | No incluye descriptor ni autoridad |
| Claim | Ejecuta receive/claim/ack antes de mutar |
| Heartbeat | Emite liveness separado del progreso del modelo |
| Stop proof | Demuestra terminación del writer |
| Host epoch | Rechaza assignments/claims obsoletos |
| Rehydrate | Retoma assignment/worktree con attempt nuevo |
| Partial work | Preserva dirty state |
| Idempotency | No duplica efecto externo |
| Isolation | No acepta trabajo de otro project/root |
| Evidence | Devuelve refs/digests estructurados |

Claude MUST pasar la misma matriz antes de opt-in.

## 24. Escenarios de aceptación

### Scenario CT-V1-01 — Alias no concede autoridad

**Given** Hermes recibe “trabajar en tasker”
**And** el alias no identifica inequívocamente proyecto y plan
**When** intenta resolver la solicitud
**Then** MUST solicitar aclaración
**And** MUST NOT crear una jornada o assignment.

### Scenario CT-V1-02 — Drift de raíz bloquea

**Given** una entrada registrada con root y Git common directory
**When** Main rederiva valores distintos
**Then** MUST devolver `CT_PROJECT_IDENTITY_MISMATCH`
**And** MUST NOT crear worktree, sesión o efecto Git.

### Scenario CT-V1-03 — Preset queda congelado

**Given** una jornada `standard` autorizada con preset revision 1
**When** el preset global cambia a revision 2
**Then** la jornada activa MUST conservar los límites de revision 1.

### Scenario CT-V1-04 — Ampliación requiere autorización

**Given** una jornada ACTIVE
**When** se solicita aumentar duración o concurrencia
**Then** MUST crearse una nueva jornada revision
**And** MUST permanecer sin efecto hasta autorización exacta.

### Scenario CT-V1-05 — Un host activo

**Given** una jornada con `execution_host: opencode`
**When** Main crea Planning e Implementation attempts
**Then** todos MUST usar OpenCode y el mismo `host_epoch`
**And** Pi MUST permanecer sin writer activo.

### Scenario CT-V1-06 — Fallback OpenCode a Pi

**Given** fallback Pi preautorizado
**And** OpenCode está UNAVAILABLE
**When** Main obtiene stop proof, libera ownership y reconcilia efectos
**Then** MUST incrementar `host_epoch`
**And** MAY crear attempts nuevos en Pi
**And** MUST preservar el worktree existente.

### Scenario CT-V1-07 — Failover sin stop proof bloquea

**Given** OpenCode dejó de enviar heartbeat
**But** no existe prueba de terminación del writer
**When** Main evalúa fallback
**Then** MUST devolver `CT_FAILOVER_UNSAFE`
**And** MUST NOT lanzar Pi sobre el mismo worktree.

### Scenario CT-V1-08 — Epoch viejo pierde autoridad

**Given** la jornada avanzó a host epoch 2
**When** una sesión de epoch 1 intenta claim o efecto
**Then** MUST devolver `CT_ASSIGNMENT_STALE`.

### Scenario CT-V1-09 — Worktree incompatible no se recicla

**Given** existe el path esperado con otra rama o assignment revision
**When** Workspace Manager recibe create
**Then** MUST devolver `CT_WORKSPACE_CONFLICT`
**And** MUST NOT ejecutar branch switch.

### Scenario CT-V1-10 — Wake no autoriza

**Given** Host Launcher despierta una sesión
**When** la sesión aún no completó receive/claim/ack
**Then** cualquier mutación MUST devolver `CT_CLAIM_REQUIRED`.

### Scenario CT-V1-11 — Manifest no contiene runtime

**Given** un Plan Manifest con `session_id`, lease o active worktree
**When** se valida
**Then** MUST devolver `CT_MANIFEST_INVALID`.

### Scenario CT-V1-12 — Cadena de delta válida

**Given** un Binding Delta con previous delta y digests correctos
**When** `sdd-verify`, Policy y Main lo validan
**Then** MAY avanzar a `ACCEPTED`
**And** solo será `PUBLISHED` desde una base integrada resoluble.

### Scenario CT-V1-13 — Drift compatible continúa

**Given** un cambio técnico interno que preserva todos los límites materiales
**When** Policy evalúa evidencia suficiente
**Then** MUST clasificar `COMPATIBLE`
**And** Main MAY publicar y habilitar el siguiente slice.

### Scenario CT-V1-14 — Drift material consulta

**Given** un cambio de comportamiento, datos, permisos o alcance
**When** Policy evalúa el delta
**Then** MUST clasificar `MATERIAL`
**And** Main MUST bloquear continuación automática.

### Scenario CT-V1-15 — Ambigüedad falla cerrado

**Given** evidencia contradictoria sobre impacto
**When** Policy no puede demostrar compatibilidad
**Then** MUST clasificar `AMBIGUOUS`
**And** MUST NOT mantener momentum mediante una clasificación optimista.

### Scenario CT-V1-16 — Entrega prepara PR automáticamente

**Given** slice verificado, jornada ACTIVE y policy válida
**When** Main coordina entrega
**Then** MAY crear commit, push y PR con idempotency keys
**But** MUST NOT ejecutar merge sin authorization.

### Scenario CT-V1-17 — Texto libre no aprueba

**Given** una solicitud de merge PENDING
**When** el Maintainer responde “sí” fuera del botón/comando exacto
**Then** authorization MUST permanecer PENDING.

### Scenario CT-V1-18 — SHA cambiado invalida

**Given** merge authorization para head SHA A
**When** el PR avanza a head SHA B
**Then** Main MUST devolver `CT_MERGE_TARGET_CHANGED`
**And** MUST requerir una authorization nueva.

### Scenario CT-V1-19 — Replay de nonce falla

**Given** un nonce ya consumido
**When** Telegram reenvía el callback
**Then** Main MUST devolver `CT_AUTH_CONSUMED`
**And** MUST NOT repetir el merge.

### Scenario CT-V1-20 — Retry inspecciona efecto

**Given** timeout después de crear un PR
**When** el mismo idempotency key se reintenta
**Then** Main MUST consultar Git hosting
**And** MUST devolver el PR existente en lugar de crear otro.

### Scenario CT-V1-21 — Dirty worktree se preserva

**Given** sesión caída con cambios sin commit
**When** recovery inspecciona el workspace
**Then** MUST preservar los archivos
**And** MUST NOT retire, reset, clean o stash automáticamente.

### Scenario CT-V1-22 — Máximo de intentos

**Given** dos attempts terminales fallidos para un slice
**When** Main evalúa otro retry
**Then** MUST devolver `CT_JORNADA_LIMIT`
**And** MUST escalar al Maintainer.

### Scenario CT-V1-23 — Policy report expirado

**Given** un Policy Report READY expirado
**When** Main intenta crear assignment
**Then** MUST devolver `CT_POLICY_EXPIRED`
**And** MUST solicitar evaluación nueva.

### Scenario CT-V1-24 — Main de campaña no invade proyecto

**Given** una campaña liderada por Main A con step en proyecto B
**When** Main A intenta crear assignment o merge directo en B
**Then** MUST ser rechazado
**And** la operación MUST pasar por Main B.

### Scenario CT-V1-25 — Compensation no es rollback ficticio

**Given** un step que modificó datos no reversibles
**When** campaign validation recibe solo `git revert` como compensation
**Then** MUST devolver `CT_CAMPAIGN_BLOCKED`.

### Scenario CT-V1-26 — Tower permanece plan-agnostic

**Given** dos Policy Reports opacos con contenido semántico diferente
**When** Tower almacena sus refs y digests
**Then** MUST aplicar el mismo contrato mecánico
**And** MUST NOT ramificar por `READY`, `BLOCKED` u otros campos internos.

## 25. Gates de aceptación V1

### Gate A — Contratos

- [ ] Los diez JSON Schemas existen y rechazan unknown fields.
- [ ] Canonicalización RFC 8785 y digests pasan golden fixtures.
- [ ] Registry, manifest, delta y report validators pasan escenarios negativos.

### Gate B — Aislamiento

- [ ] Control Tower no importa parsers de OpenSpec/plan policy.
- [ ] Adapters no acceden directamente a SQLite.
- [ ] Wrong project/root/epoch/assignment falla cerrado.

### Gate C — Jornada single-host

- [ ] Presets y snapshots son versionados.
- [ ] Pi y OpenCode pasan la matriz.
- [ ] No existen writers concurrentes durante fallback.
- [ ] Limits y máximo de intentos se aplican.

### Gate D — Continuidad

- [ ] Planning produce hasta tasks dentro del horizonte.
- [ ] Implementation reconcilia antes de apply.
- [ ] Binding Delta verificado alimenta Policy.
- [ ] Dos slices consecutivos completan el loop sin handoff manual.

### Gate E — Delivery y Telegram

- [ ] Commit/push/PR son idempotentes.
- [ ] Free text y replay no autorizan.
- [ ] SHA/check/policy drift invalidan.
- [ ] Cada merge tiene receipt y post-check.

### Gate F — Recovery

- [ ] Caída y partial work preservan evidencia.
- [ ] Unknown effect no se repite.
- [ ] OpenCode → Pi funciona con stop proof y host epoch.
- [ ] Contradicciones producen `BLOCKED`.

### Gate G — Campaña

- [ ] Dos proyectos conservan Main local.
- [ ] Steps y merges se serializan.
- [ ] Compensation se valida antes del step.
- [ ] No se afirma atomicidad distribuida.

## 26. Siguiente paso

Después de aprobar este documento:

1. crear `openspec/plans/master-index.md` como roadmap y punto de retoma;
2. registrar PRD, RFC y REQUIREMENTS en `openspec/plans/manifest.yaml`;
3. dividir la implementación en cambios OpenSpec dependency-linked;
4. reconciliar esos cambios con el sustrato `autonomous-continuation-control-tower` sin expandirlo a semántica de producto.
