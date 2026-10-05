# Plan Naming Convention (shared across all agents and projects)

**Status**: canonical builder source. Installed copies are projections, not authority. Frozen
Control Tower material is historical data and never becomes an active instruction source.

`openspec/plan.yaml` is the sole editable product plan; `openspec/ROADMAP.md` is its generated
view. Radar computes status from Git and plan evidence. An ODD technical record and its Engram
mirror record execution continuity only: neither is a second product plan.

Never read `openspec/plan.yaml` whole. Read plan evidence through the installed Radar: start with
`radar etapa`, use `radar status --json` or `radar faltan` to propose work, and run
`radar sesion <ID>` once per human-chosen Session for its contract. When an authorized stage must
edit the plan, locate the exact entry and read only those lines; then run `radar check` and, only
after it passes, `radar render`.

## 1. Hierarchy — product coordination is Zona → Sesión

```text
Product frame (not a level)
└── Zona
    └── Sesión
```

For a **native Session** (`encargo` present), this is the whole active product hierarchy:
**Zona → Sesión**. Do not create native Chanks Modules or Tasks, required Module trailers, or a
separate scope/criteria heading. `Módulo` and `Tarea` remain readable only as technical and
legacy evidence: historical delivered contracts, old plan rows, and Gentle AI's private
implementation decomposition. They never grant native write authority or define native resume.
Never add a fifth level or rename IDs.

| Level | Native meaning |
|---|---|
| **Zona** | Stable, exclusive file partition. |
| **Sesión** | One independently deliverable product result with coordination and an Encargo. |

## 2. One product plan

A product has one plan, no manually authored status/index, and no second active planning tree.
New scope is a new Session in an existing or newly justified Zona. Closed and archived records
remain history; do not rewrite frozen historical product content during a pending-only migration.

## 3. Zona — the safety partition

A Zona is a stable, exhaustive, disjoint set of repository files. Cut by business domain, not
technical layer or delivery size. Its four enforced properties are defined-by-paths, disjoint,
exhaustive, and stable. A Session has exactly one Zona; read-only verification may read elsewhere
without acquiring ownership. Cross-Zona mutation resolves in this order: make the shared path a
Cimiento, split by Zona, create a Zona only when splitting destroys the product result, then revisit
a recurring bad partition. In V1, parallel work requires human approval of the exact lot and
Radar's `compatible` verdict for every pair; a forecast never claims a Zona.

## 4. Cimientos and resources

`cimientos.rutas` classifies shared terrain. A native Session's `cimientos` is an exact-file
declaration of shared paths and every declared path must also appear in its exact authorized `archivos`. A
`Recurso` is a shared non-file identity. Radar validates partition and forecasts compatibility;
it creates no lock, assignment, or live reservation. Expanded files/scope require approved change
and fresh compatibility evidence before affected mutation. Existing Zona/Cimiento/resource safety
remains; this contract does not enable future file-parallel behavior.

## 5. Vocabulary

A Jornada is a workday, a Conversación is one human-agent interaction, and a Sesión is the
product work unit closed by integrated delivery evidence. Do not use those terms as aliases.

## 6. Implementation size

A Session may contain several technical implementation steps. Size and slicing of that implementation
follow Gentle AI's native guidance; Chanks adds no size rule and asks no size question. Never golf
code, tests, or documentation to fit a number, and never turn a size decision into a new hierarchy
level or progress index.

## 7. Banned plan levels

Do not add plan-level work unit, slice, package, phase, epic, milestone, wave, track, or plan.
A product domain entity with one of those names is exempt and must not be renamed.

## 8. Identifiers

Session IDs are flat, permanent, and mute (`S23`). Never renumber. `reemplaza` records explicit
lineage and can reference only valid archived predecessors; self-reference/cycles are invalid, active
dependencies cannot silently point to an archived predecessor with successors, and replacement is not
a reading order. Legacy Módulo/Task IDs remain historical identifiers; native Session preparation
never requires or invents them.

A Session named in conversation or in a written artifact carries its goal, sub-priority, Zone,
title and state — never a bare ID. `radar faltan <ID>` prints exactly that one line, e.g.
`S148 (Torre V3 › cimientos — título, PLANIFICADO)`.

## 9. Status

| State | Meaning |
|---|---|
| 📋 `PLANIFICADO` | Dependencies unresolved. |
| 🟢 `LISTO` | Eligible to start. |
| 🔵 `EN CURSO` | Current execution evidence exists. |
| 🔴 `BLOQUEADO` | Cannot advance without named unblock. |
| 🟡 `DIFERIDO` | Deliberately postponed. |
| ✅ `COMPLETO` | Integrated and verified delivery evidence. |
| 📚 `ARCHIVADO` | Closed history. |

States are computed, never written. This closed vocabulary also covers legacy and V2/V3 evidence;
V1 never creates dispatch markers or reserves a Session, so execution alone leaves it `LISTO`
until stage 5 records its integrated delivery commit. `entrega.commit` is an immutable full Git OID and must be an
ancestor of the fixed integrated HEAD. `BLOQUEADO` means cannot; `DIFERIDO` means chose not to.

### Priority

`prioridades` and `prioridad` are an optional ordering attribute, never a level or time field.
The first unfinished priority is active; a later row that would be `LISTO` is `DIFERIDO`. A plan
without priorities behaves as before.

## 10. Generated roadmap

Only Radar renders `openspec/ROADMAP.md`, against one fixed HEAD and a valid plan. It presents
resumption, open Session coordination/Encargo, historical legacy evidence without reinterpretation,
progress, blockers, and compatible capacity. It is deterministic, escaped as data, and never
hand-edited. Render rejects escapes, symlink/non-regular destinations, and changed HEAD; publication
uses synced temporary output, atomic rename, and parent-directory sync. Consumers ask `radar status --json`;
they do not re-parse the view.

## 11. Progress

Progress is completed/archived Sessions divided by enumerated Sessions, reported with its fraction
per Zona and in total. Módulos, Tasks, hours, and perceived partial progress never change it.

## 12. Native Session contract

A native Session is discriminated by `encargo`. Its **coordination** owns product authority:

| Field | Requirement |
|---|---|
| `id`, `zona`, `resultado`, `autoridad` | Identity, territory, intended result, and approved authority. |
| `prioridad`, `depende_de`, `reemplaza` | Existing ordering and lineage rules. |
| `archivos` | Exact authorized repository files, inferred/declarable during preparation. |
| `cimientos`, `recurso` | Exact shared-path and non-file safety declarations. |
| `decisiones` | Structured authority decisions with their existing escalation rules. |
| `encargo` | Exactly four prose parts below. |

`encargo` contains exactly: `pedido_contexto`, `resultado_comportamiento`,
`restricciones_decisiones`, and `referencias`. Outcome and constraint meaning belongs inside
those parts; do not add separate native `scope`, `criteria`, Module, Task, or acceptance-checklist
headings. Files are not mandatory provider discovery: unknown preparation may use
`encargo.incompleto`, remains blocked, and retains known declarations but receives no executable
Área or execution authority. An incomplete Encargo retains known declarations; it does not erase them. A complete non-read-only Session declares exact files; no glob, directory,
escape, symlink, or implicit read-safe fallback is allowed.

`solicitud_sdd` is exceptional and valid only with explicit human `solicitud_sdd` authority. Its
absence means ODD. Complexity, line count, seams, risk, or agent preference never select SDD and
there is no route-choice menu for native Sessions. The user may explicitly request SDD; then the
native Gentle AI preflight, authority and archive controls apply without a custom engine.

A migrated native row may retain `importacion_legacy` and proven delivered Módulos as historical
evidence only. Their reachable `Modulo:` trailers prove history but cannot expand `archivos`,
create native progress, or become active execution planning/write authority.

## 13. Capacity

V1 uses `radar status --json` → `compatibilidad[]` as its **parallel-safety verdict**. Every pair
in a human-approved lot must be `compatible`: exact files are disjoint, with no shared Cimiento or
Recurso. Sharing a Zona alone is not a conflict; unknown or colliding declarations are never safe.
`asientos[]` is a separate Zona-based capacity forecast, not the V1 lot selector. Cimientos are
exclusive per exact file, never an all-Cimientos lock; a declared `zona: cimientos` has no permanent
owner. No forecast is a live lock, claim, worker assignment, or topology controller. Live Session
reservation/acquisition is V2/V3, not part of V1.

## 14. Decisions and escalation

A decision is derivable only when approved authority and a falsifiable criterion both exist. These
eight classes always escalate: visible product contract, irreversible operations, migration/data
loss, public API, security/permissions, money/pricing/quotas, scope expansion, and contradictory
dependencies/evidence. An escalated decision records the exact question, evidence, options and
consequences, class, `Contamina:`, and checkpoint before RED.

Escalation blocks only when it contaminates the Session outcome/Encargo, its first required work,
or another Session. Later **legacy** Módulo contamination parks that historical step; it never
rewrites native Session status. Ambiguous contamination is included. A maintainer decision is
never inferred or silently recast as an external blocker.

## 15. Preparation and execution

`chanks-2-planificador-granular` is retained by ID for compatibility but prepares a native Session;
it does not technically decompose product work. It confirms territory, crossings/Cimientos,
coordination, the four Encargo parts, exact files when known, decisions, and authority. ODD is the default technical execution path. Native ODD creates its own document and
Engram continuity record under Gentle AI ownership; those records are subordinate to Radar plan
status.

For **legacy only**, preserved `ruta` values (`direct`, `design-tasks`, `full-sdd`) and Módulo/Task
contracts remain readable and executable under their original meaning. Only legacy `full-sdd` runs
Gentle AI's native SDD pipeline. `direct` and `design-tasks` remain non-SDD. Do not retrofit those
legacy fields into a native Session.

When a human explicitly selects SDD for a native Session, run only Gentle AI's existing native SDD
flow after its actual preflight and authority gates. `archive` is a native SDD control after delivery;
it is not required for ODD. Stage 4 belongs to Gentle AI: Chanks prescribes nothing about review
timing, consent, or delivery gates, and archive controls remain native SDD controls.

## 16. Resume

Before acting on a start/continue/resume, read fresh state with the installed `radar status --json`
and `radar sesion <ID>` for the human-chosen Session against the current HEAD. V1 has no admission
or reservation step: Radar reports evidence, the human chooses, and `chanks-4-puente` hands the
Session to Gentle AI. A native Encargo Session resumes the **same Session identity** by reconciling
its native ODD record, actual code, and observed evidence. It does not require a first pending
Chanks Module. A legacy Session keeps its first pending Módulo resume rule. If fresh evidence does
not allow the requested work, report the state and missing decision/evidence; never bypass it via
another skill or a repository executable.

## 17. Tool versus human

Radar validates exact files, partition, dependencies, IDs, priorities, delivery evidence, legacy
history reachability, computed status, and render output. Humans approve product scope, authority,
Encargo prose, decision class, file expansion, and whether a compatibility forecast can become an
authorized mutation. The bridge translates authorized intent and constraints; it neither claims
completion nor invents execution topology, locks, storage, or authority.

## 18. Adoption and pending-only migration

### No-debt closure

A Session becomes `COMPLETO` only when every declared native Encargo outcome/constraint has observed
check evidence and immutable integrated delivery evidence. `PASS WITH WARNINGS` is not closure. Scope
discovered after preparation that does not fit the existing coherent approved Session becomes a new Session
with its own ID. An approved scope/file adjustment within the same Session may be recorded only with human
authorization and fresh compatibility before affected write; it never silently expands.

### The four steps

1. **Partition first from the file system.** Derive Zonas from `git ls-files`, then validate with
   `radar zonas` and `radar check`: disjoint, exhaustive, zero orphans, and zero overlaps.
2. **Author only live work.** `plan.yaml` receives only open, blocked, or deferred Sessions against
   current code; closed work is not recreated as active planning.
3. **Freeze history byte-for-byte.** Move legacy material under `openspec/archive/legacy-planning/`
   with an index to delivery evidence. Never retain a live status/index that declares old progress.
4. **Drop satisfied dependencies.** An edge to already closed work is satisfied, not a reason to keep
   an obsolete active row.

Never import closed Sessions as live rows, extend a schema merely to preserve rejected history, or
hand-edit the generated roadmap. If more than one Zona modifies the same exact path, it is a Cimiento
regardless of directory location. Historical exception: Control Tower frozen product material remains
historical evidence, not an operative adoption template.

Migrate only eligible pending data after compatible readers pass. Preserve archived/closed source blocks
and proven partial evidence byte-for-byte as history. Never fabricate completion, erase authority, or
rewrite a frozen product archive. Report unknown historical evidence rather than guessing.

## 19. Chanks inventory

`chanks-0-` is cross-cutting, including `chanks-0-mensajes-visibles` and
`chanks-0-comunicacion-agentes`; `chanks-2-planificador-granular` prepares Sessions; in V1 `chanks-3-paralelo` proposes a compatible lot for human approval and
delegation; `chanks-4-puente` hands the Session to Gentle AI
and receives its delivered commit; and `chanks-5-session-doc` closes a delivered Session. These IDs are compatibility names,
not hierarchy levels or runtime authority.

## 20. Compliance checklist

- [ ] Native product coordination is Zona → Sesión; legacy Module/Task history stays readable only.
- [ ] Every native Encargo has exactly its four parts and no parallel native scope/criteria headings.
- [ ] Exact files, Cimientos, resource safety, IDs, priorities, status and escalation survive.
- [ ] ODD is default; native SDD follows only an explicit human request and existing native controls.
- [ ] Native resume reconciles same identity, record, code and evidence; legacy resume uses first pending Módulo.
- [ ] No forecast claims a live lock, worker assignment, or topology control.
- [ ] Technical ODD/Engram records remain subordinate to Radar product authority.
- [ ] Delivery requires actual Git evidence and ordinary repository policy.
