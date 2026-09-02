# Plan Naming Convention (shared across all agents and projects)

**Status**: canonical. Zone model approved 2026-09-01, replacing the multi-plan model of 2026-07-29.

This file is the SINGLE source of truth for how work is decomposed, how it is distributed
across parallel agents, and how a roadmap is written. Where any skill, project file, or
agent config contradicts it, THIS file wins — fix the other file, do not fork the rule.

Applies to Claude, opencode, codex, and pi, in every project.

**What changed and why**: the previous model cut work by *delivery size* (what fits in one
PR) and bolted on a hand-written `Área` afterwards to keep agents from colliding. Nothing
validated that field, the roadmap grew one row per Plan while a single global queue jumped
between plans unreadably, and a single fact — "did S2.3 close?" — was transcribed by hand
into six documents (ten, in `control-tower`). Work is now cut by *place*, state is computed
rather than written, and the roadmap is generated.

---

## 1. Hierarchy — exactly four levels

```
la casa · un solo plan, sin fecha de cierre        ← the product: the frame, not a level
 └── Zona · Cotizaciones                            ← one agent lives here
      └── Sesión S23 · instalar el horno            est: 4h   ← one PR
           └── Módulo · quotes/accept.ts            est: 40min
                └── Tarea T3
```

Never add a fifth level. Never rename a level.

| Level | Defined by | Time |
|-------|-----------|------|
| **Zona** | **The files it owns.** Exclusive to one agent while claimed | — |
| **Sesión** | One independently reviewable result, inside one Zona | estimate |
| **Módulo** | Concrete files that change together | estimate |
| **Tarea** | One atomic action with a declared observable result — minimum 3 per Módulo | — |

Every Sesión, Módulo and Tarea declares a nonblank `resultado`; every Tarea also declares its atomic `accion`. A Módulo route is one
normalized exact repository-relative file: never an absolute path, directory, pattern, glob,
`..`, empty component or symlink escape. It must belong to the Sesión's Zona or equal one of
that Sesión's exact Cimiento reservations. New files are valid when the declared partition
deterministically assigns their normalized path.

**The product is not a level.** It is the frame around the tree. A constant carries no
information, and a level that never varies is a column of noise in every table.

## 2. One plan per product

A product has exactly **one plan**, with no closing date. New scope becomes new Sesiones
inside an existing Zona, or a new Zona. It never becomes a second plan.

The only editable planning source is `openspec/plan.yaml`. The only generated human view is
`openspec/ROADMAP.md`, which includes current status and next work. A separate generated
`STATUS.md` or `master-index.md` is forbidden because it would duplicate the same data.

This is what removes the worst failure of the previous model: with several plans, the reader
sees `40%` on Plan 1 and cannot tell *which* Sesiones are still open, so old work is
discovered by accident while working on Plan 5. With one plan there is no Plan 1 and no
Plan 5 — there is one product, partly built.

## 3. Zona — the unit of parallelism

> A Zona is a **set of files with a single owner**. Not a theme, not a layer, not a milestone.

Four properties, all enforced by the tool, none by discipline:

1. **Defined by paths.** A Zona owns concrete files. If you cannot list its paths, it is not
   a Zona — it is a theme, and themes do not partition anything.
2. **Disjoint.** No file belongs to two Zonas. This is what makes collision impossible rather
   than merely discouraged.
3. **Exhaustive.** Every file in the project belongs to exactly one Zona, or to `Cimientos`
   (§4). A file with no owner is a file nobody can honestly work on.
4. **Stable.** Zonas change when the product changes, not when work is scheduled.

### How to cut them

Cut by **business domain** — Cotizaciones, Pagos, Identidad — using the project's own domain
families as the starting catalogue, then instantiate against the real tree. A cut that does
not survive contact with the file system is not a cut.

Cut by things that **do not wait for each other**. The test that decides it:

| Cut | With three agents |
|---|---|
| By process step — mix → bricks → wall → sand → paint | The bricklayer waits for the mixer. Two agents watch the third. A chain is not made faster by more hands. |
| By room — kitchen, bedroom, living room | Nobody waits. Three real advances at once, and they cannot collide because they are not in the same room. |

Cutting by technical layer (DB / services / screens) fails this test: almost every feature
touches all three, so the three agents serialize.

### Work that crosses Zonas

Resolve a crossing in this order:

1. **Reclassify the shared surface as Cimientos.** Any file that more than one Zona needs to
   modify is shared terrain, regardless of which broad directory contains it.
2. **Split the Sesión by Zona** when each resulting outcome remains independently meaningful.
3. **Create a new Zona only when splitting destroys the result.** The new Zona declares the
   Zonas it depends on.
4. **If crossings recur, the partition is wrong.** Revisit the Zona cut instead of multiplying
   exceptions or cross-Zona Sesiones.

This rule governs work that **modifies** surfaces in multiple Zonas. Read-only terminal
verification may inspect every Zona while remaining in the Zona that owns its outcome; reading
files does not transfer ownership. A Sesión still belongs to exactly one Zona. It may additionally
reserve declared Cimientos, but it never claims two Zonas.

### One agent per Zona

A Zona is exclusive while claimed. If a Zona becomes a bottleneck, that is the signal to
**split the Zona**, never to relax the rule.

## 4. Cimientos — shared paths, reserved per file

`cimientos.rutas` classifies shared terrain that no Zona owns permanently: dependency
manifests, CI config, shared libraries and types, the migration lane, the agent terrain files.
Classification rules may name exact files, directories, or supported path patterns. By contrast,
`sesiones[].cimientos` is a reservation list and MUST contain exact file paths only.

**The deterministic threshold:** any exact file that needs modification by more than **one Zona**
is a Cimiento. The threshold is not «more than two agents», and physical location inside a broad
Zona route does not override it. A declared exact-file Cimiento may carve that file out of one
broad Zona route; it never masks a genuine overlap between two or more Zonas.

A second useful test is: *if I change this, can I break another agent's work even though they
never touched this file?* If yes, it is also a cimiento.

| Is a cimiento | Is not |
|---|---|
| `package.json`, lockfiles, dependency config | Screens, components, a Zona's own services |
| Shared libraries and shared types | Documentation — that is not code |
| Migration lane and its ordering | A Zona's own migrations, if the lane allows it |
| CI config, shared test config | Per-Zona test fixtures |
| Agent terrain files (`CLAUDE.md`, `AGENTS.md`) | Plans and specs |

**Cimientos are not permanently owned by a Zona.** They are a declared list of paths with
**exclusive per-file reservation**:

- Any agent may declare the Cimientos its own Sesión requires.
- The plan records each reservation as an exact file path.
- Only one agent may edit a reserved file at a time. Cimientos do **not** authorize concurrent writes.
- `plan check` validates declarations and `plan status` forecasts a compatible deterministic set;
  neither command acquires a live lock or knows whether another agent already holds the file.
- The later Tower runtime, coordinated by MAIN, authoritatively acquires and releases reservations,
  records owner identity, prevents stale simultaneous starts, and recovers stale or interrupted claims.

`zona: cimientos` is valid when a Sesión's primary result consists only of Cimientos. This is
an execution domicile, not permanent ownership: exclusivity remains per exact file, so two
such Sesiones may run together only when their reservations are disjoint.

Treating all Cimientos as one coarse lock would idle every other agent behind a one-line
manifest change. Per-file reservation constrains only the exact file in dispute once the Tower
acquires it, while MAIN keeps delivery ordered.

## 5. Time is an estimate, never a limit

Time appears only as an informational attribute: `est: 4h`. It NEVER defines or constrains a
level. A Sesión estimated at 4h that takes 9h is the same Sesión — the estimate was wrong,
the plan did not change.

## 6. Overflow rule

> If a Sesión does not fit in one PR, no new level is created. Split it into two Sesiones
> inside the same Zona, or ship its Módulos as chained PRs under the same Sesión.

PR size is an **overflow rule**, not the cutting criterion. The criterion is place (§3).

## 7. Banned nouns at plan level

Never use these to name a level, in a plan, roadmap, `STATUS`, or proposal:

```
work unit · WU · slice · paquete · bloque · fase · phase · stage
epic · hito · milestone · wave · ola · tramo · fragmento · track · plan
```

`plan` joins the list as a *level* name: there is one plan and it is the product (§2).

Two terms survive, scoped: `slice` only inside the `chained-pr` skill, `work unit` only
inside `work-unit-commits` — both describing PR and commit mechanics, never climbing into
the hierarchy.

### Domain-entity exemption (read before any rename)

This ban governs **plan vocabulary only**. If a banned word is a **domain entity of the
product itself** — it has a schema, a field, an identifier, a file path, a table, or an API
contract — it is EXEMPT and MUST NOT be renamed. Renaming it breaks code, not prose.

Real example: in `control-tower`, `slice` is a domain entity (`slices:`, `slice_id`, and
file paths built from it). Those stay exactly as they are. What must change there is only
the *planning* use.

Test before renaming: **does this word name a thing the software manipulates, or a chunk of
our work?** Only the second is in scope. When unsure, leave it and report it.

## 8. Identifiers — flat, permanent, mute

A Sesión's identifier is flat and sequential across the whole product: `S23`, `M23.2`,
`T23.2.4`.

- **It carries no meaning.** Not the Zona, not the owner, not the position. Anything encoded
  into an identifier becomes a lie the moment that attribute changes.
- **It is never renumbered.** Every renumbering silently breaks references already written
  in memories, PR titles, comments, and other Sesiones' dependencies — a cost paid in
  silence, months later.
- **Replacement is explicit lineage, never renumbering.** A new Sesión may declare
  `reemplaza: [S14, S15]`; every referenced original must exist and be `ARCHIVADO`, the new
  Sesión must remain active, self-reference and cycles are invalid, and several new Sesiones
  may point to the same archived original. Before an original is archived, every successor and
  every affected dependency edge must be registered: an active Sesión may not depend on an
  archived original that has successors, and must name the applicable replacement Sesión(s).
- **It is not a reading order.** Humans read the roadmap by Zona and position (§10). The
  identifier is a name, not a place in a queue.

## 9. Status — closed set of seven, computed not written

| State | Meaning |
|-------|---------|
| 📋 `PLANIFICADO` | Exists, dependencies unresolved |
| 🟢 `LISTO` | Dependencies met, can start today |
| 🔵 `EN CURSO` | Claimed by an agent right now |
| 🔴 `BLOQUEADO` | Cannot advance — needs an external unblock |
| 🟡 `DIFERIDO` | Could advance, deliberately postponed |
| ✅ `COMPLETO` | Merged and verified |
| 📚 `ARCHIVADO` | Closed, kept for traceability |

Do not add, translate, combine, or invent states.

> **Status is derived, never authored.** It is computed from `Depende de`, open decisions
> (§12), and local Git evidence. `entrega.commit` must be the repository object's immutable,
> unabbreviated hexadecimal OID (never `HEAD`, a branch, an expression or a short hash), identify
> that exact commit, and be an ancestor of the transaction's immutable integrated `HEAD` snapshot
> before a Sesión becomes `COMPLETO`. PR metadata is optional evidence for repositories with direct-push delivery;
> when present it must be positive and never replaces commit ancestry. An agent that writes
> a status is writing a value the next computation will overwrite.

`BLOQUEADO` is *cannot*; `DIFERIDO` is *chose not to*. Keeping them apart is the whole point.

## 10. The roadmap is generated

`openspec/ROADMAP.md` is a **view**, rendered only from `openspec/plan.yaml`. No agent writes
or reconciles it by hand. It starts with a clear generated/do-not-edit notice and then carries:

1. **📍 Punto de retoma first** — which Sesiones are recorded closed, what comes next, and what
   decision is pending. Declaration order does not prove which closure was latest; without an
   explicit trustworthy ordering source the view MUST NOT claim a “last” close. It is derived
   and rewritten in full, never appended. Dated history belongs in Git and PRs.
2. **Current status and next executable work**, followed by open Sesiones grouped by Zona and
   their deterministic queues. Position comes first so work cannot hide behind a percentage.
3. **Avance** — completed Sesiones / enumerated Sesiones, total and per Zona (§11).
4. **Blockers and route evidence** — planning proposal plus implementation revalidation.
5. **Módulo/Tarea detail** needed to execute and review the enumerated work.
6. **Capacidad** — the static compatible forecast (§13), explicitly not a live lock.

No timestamp, hostname or incidental environment value may enter the view. Every plan-controlled
scalar is normalized to one line and escaped as Markdown data, never interpreted as headings,
tables, code or HTML. Rendering fixes one exact HEAD for validation and generation, refuses
publication if HEAD changes, resolves the output inside the plan repository (canonical default
`openspec/ROADMAP.md`), rejects symlink/non-regular destinations, and durably writes by synced
temporary file, atomic rename and parent-directory sync. Repeated runs over the same plan and
Git evidence converge byte for byte.

One column per Zona, `#1 #2 #3` inside it. **Within a Zona the order is the order**, because
dependencies are mostly local. The disorder of a single global queue came from mixing Zonas
that have nothing to do with each other.

## 11. Progress percentage

Derived, never authored. Recompute from Sesión states.

1. `% = Sesiones COMPLETO / Sesiones enumeradas`. Nothing else counts — not Módulos, not
   Tareas, not hours, not how far along it feels.
2. **Always show the fraction**: `29% (2/7 S)`. An unauditable number is trusted exactly once.
3. A Sesión counts only at `COMPLETO` or `ARCHIVADO`. `EN CURSO` contributes zero.
4. **No enumeration → no percentage.** Write `—` plus the reason. That is a planning gap to
   close, not a number to invent.
5. Never weight by `est:` unless every Sesión carries an estimate.
6. **Report per Zona and in total.** A single blended number hides which Zona is stuck.
7. Pending work outside the enumeration invalidates the percentage.

## 12. Sesión execution contract

| Field | Requirement |
|-------|-------------|
| `Zona` | The Zona it belongs to. Exactly one. |
| `Estado` | **Computed** (§9). Never written. |
| `Depende de` | Sesión IDs that must reach `COMPLETO` first, or `—`. IDs, never prose. |
| `Área` | **Derived from the Zona.** Never hand-written. |
| `Cimientos` | The exact shared files this Sesión will reserve, or `—`. |
| `Reemplaza` | Archived Sesión IDs superseded by this result, as a list; `—` if none. |
| `Recurso` | Shared non-file resources it claims: DB mode, delivery token. `—` if none. |
| `Decisiones` | The decision points it is expected to hit, each derivable or escalating (§14). |

`Área` was the previous model's only collision guard and its weakest link: hand-written
globs nobody validated. It is now a projection of the Zona's paths, and the tool validates
the partition instead.

### Binary acceptance criteria

Every Sesión carries a checklist of observable outcomes, each true or false by inspection —
never "mostly", "with warnings", or "pending follow-up".

```markdown
**Criterios de aceptación** — todos deben pasar para cerrar:
- [ ] Two enrolled projects keep identity and Tower state isolated
- [ ] An unsafe existing layout fails closed and mutates nothing
- [ ] The diff touches no path outside the Zona, except reserved Cimientos
```

Write them at planning time. Criteria authored after the work *describe* the work; criteria
authored before it *constrain* it. Only the second kind can fail.

### No-debt closure

> A Sesión reaches `COMPLETO` only when every acceptance box is checked.

There is no partial close. `PASS WITH WARNINGS` is not a closing state: a warning is either
irrelevant — delete it — or unfinished work, and then the Sesión is not `COMPLETO`.

Scope discovered mid-Sesión that does not fit becomes a **new Sesión with its own ID**. It
never rides along and never closes silently with its parent.

## 13. Capacity — derived from the partition

Two Sesiones may run concurrently when all three hold:

1. **Graph independence** — neither is in the other's `Depende de`, transitively.
2. **Different Zona** — guaranteed disjoint by §3, except that two `zona: cimientos`
   Sesiones may coexist when their exact reservations are disjoint.
3. **Disjoint `Recurso`** and no conflicting Cimientos reservation.

**Available seats = a deterministic compatible forecast of Zonas with ready work.** The first
ready Sesión in each Zona queue is considered in stable Zona order; a candidate whose exact
Cimientos or exact exclusive `Recurso` identities intersect an earlier candidate is not offered
concurrently. This is not a live claim.

The human sets a **ceiling** — how many agents they want to supervise. The seats actually
opened are `min(Zonas con trabajo listo, techo)`. The ceiling is a human decision that
changes when the human wants; the first number is computed and changes daily. When ready
work exceeds the ceiling, the orchestrator proposes raising it. It never raises it alone,
and it never batches work to fill seats — that is cutting work to fit the furniture.

**Agents are assigned to Zonas, and take Sesiones from their Zona's queue.** Assigning an
agent to a theme, an app, or a layer leaves cross-cutting results with no owner.

Worktrees remove the *editing* collision, not the *merge* collision. The partition is what
prevents that.

## 14. Deferrable planning — declare the decisions, not only the work

A plan that enumerates work but not **decisions** stops at the first uncertainty. Everything
below is declared at authoring time and readable by any agent, alone or orchestrated.

### The `Decisiones` field

```markdown
**Decisiones:**
- `derivable` — index name for the new lookup. Criterio: matches the existing
  `idx_<table>_<column>` convention already used in this Zona. Autoridad: naming
  convention approved in the RFC.
- `escala` — whether expired entries are deleted or tombstoned. Clase: migración o
  pérdida de datos. Contamina: `S52` (its acceptance criteria assume the answer).
```

A decision is `derivable` only when **both** hold: an approved authority already covers it,
and the criterion that resolves it is **falsifiable** — you can state what would make the
answer wrong. "Use good judgement" is not a criterion. Anything else escalates.

### The eight classes that always escalate

Closed set, like the seven statuses. Never derived, even with authority and criterion:

Visible product contract · irreversible operations · migrations or data loss · public API ·
security and permissions · money, pricing or quotas · scope expansion · contradictory
dependencies or evidence.

What they share: the cost of being wrong is not paid by the agent, and not at the time of
the mistake. Everything else is recoverable by editing code.

### Escalating is not blocking

| Where the open decision lands | Sesión state |
|---|---|
| Contaminates the acceptance criteria, or the first Módulo | 🔴 `BLOQUEADO` |
| Contaminates a later Módulo only | 🟢 `LISTO` — mark that Módulo 🔴, park the decision |
| Named by another Sesión's `Contamina:` | 🔴 `BLOQUEADO`, citing that decision |
| No contamination | 🟢 `LISTO` — the decision rides in `Decisiones` |

Almost every real Sesión touches one of the eight classes somewhere. A planning pass that
returns most Sesiones `BLOQUEADO` has applied Sesión state to Módulo-level contamination.
Recompute before reporting: a plan where nothing can start is a planning defect, not a finding.

### Contamination

Three of the four sources are already declared and need no new field: graph dependency,
shared Zona, shared `Recurso` or Cimientos reservation. The fourth is **semantic** and must
be written down: a Sesión whose acceptance criteria assume a particular answer while sharing
nothing else. Declare it with `Contamina:` and Sesión IDs.

> **Ambiguous resolves to contaminated.** Over-including costs idle capacity for hours.
> Under-including ships work built on an unapproved assumption, and it surfaces at merge.

### The parked decision record

A decision that escalates carries: the **exact question**, answerable without re-reading the
codebase; the **evidence** that produced it; the **options enumerated, each with its
consequence**; the **origin** Sesión and Módulo; the **checkpoint**; and the **class**.

Missing any of these it is not parkable. A decision without enumerated options is a question,
and escalating "what do we do here?" costs a round trip and returns "it depends."

### Continuing on something else

Eligible only when graph-independent, in a different Zona, with disjoint `Recurso` and
Cimientos, and outside the contamination scope.

> **Zero eligible Sesiones means stop and report.** Never relax a criterion to stay busy.

### Resuming

The answer lifts the block **only over the scope recorded when the decision was parked**,
never a scope recomputed at resume time. Resume from the recorded checkpoint; if the base
moved, reconcile first.

## 15. Execution routes

Every Sesión carries a route: `direct`, `design-tasks`, `full-sdd`, or `blocked`.

| Route | Selected when |
|---|---|
| `direct` | The contract has a binary-verifiable outcome and every remaining choice is derivable |
| `design-tasks` | The product outcome is fixed, but bounded technical discovery is required |
| `full-sdd` | Outcome and boundaries exist, but behavior, lifecycle, or a shared contract still needs design |
| `blocked` | Authority is absent or stale, evidence contradicts, or an open decision reaches the criteria or first Módulo |

**Choose the lightest route that is honest.** Risk, file count, changed lines, or the number
of technical seams **never** select a heavier route on their own. What escalates is concrete
ambiguity about behavior or contract.

### Who decides, and when

The route is recorded at two moments in one structure; a single ambiguous route value is invalid:

1. **At planning**, `ruta.propuesta` records the proposed route plus its exact authority.
2. **At implementation**, `ruta.revalidacion` may be added once. It records the resulting route,
   the exact current Git `HEAD`, and an evidence/authority reference. It is absent before kickoff.

Both values use the same closed route set. **The implementation-time revalidation wins.** When it
differs from the proposal, it also records a mandatory reason. `session-kickoff` performs this
revalidation once and sends the exact delta to Support; it does not create a second dispatcher.
A changed Git base invalidates the old revalidation instead of silently reusing it.

## 16. Proportional output

The full apparatus is sized for a product several agents build in parallel. Applied to a
three-Sesión single-Zona product it produces ceremony nobody reads.

| Shape | Required | May be omitted |
|---|---|---|
| One Zona, ≤ 3 Sesiones, linear | Sesión fields, binary criteria, the queue | Per-Zona capacity, `%` (write `3 S, cadena lineal`) |
| Two or more Zonas, or any parallelism | Everything in this document | — |

Omission is a **declared choice** written on the plan, never a silent skip. The Sesión
fields, the acceptance criteria, and `Decisiones` are never omitted at any size.

## 17. What the tool checks, and what a human must judge

The tool owns everything derivable. An agent that recomputes these by hand is doing work
that will be overwritten, and doing it less reliably.

| Computed — never written | Judged — needs a human or an agent |
|---|---|
| Every Sesión's `Estado` | Cutting the product into Zonas |
| `%` and its fraction | Whether a decision is derivable or escalates, and its class |
| The queue inside each Zona | The binary acceptance criteria |
| Available seats | Semantic contamination between Sesiones |
| `Área`, from the Zona | |
| Partition validity: disjoint, exhaustive, paths real | |
| Declared Cimientos reservations and static scheduling conflicts | |
| Replacement lineage: resolved references, archive direction, dependency rewiring and acyclicity | |
| Delivery evidence: full immutable commit OID resolution and ancestry from one integrated `HEAD` snapshot | |
| Route/base record structure and whether a changed route states its reason | Whether the proposed or revalidated route is the honest one |
| The rendered `openspec/ROADMAP.md` view | |

## 18. Agent compliance checklist

Only what the tool cannot check. Everything else is enforced, not remembered.

- [ ] Every level is Zona, Sesión, Módulo or Tarea — no other noun, and no second plan
- [ ] Every Zona is defined by real paths, not by a theme
- [ ] Crossings followed the order: Cimientos → split by Zona → new Zona; recurring crossings reopened the partition
- [ ] Time appears only as `est:`, never as a constraint
- [ ] No agent wrote a status, a `%`, a queue position, or an `Área`
- [ ] A Sesión that outgrew one PR was split into Sesiones, not renamed
- [ ] Every Sesión carries `Zona`, `Depende de`, `Cimientos`, `Reemplaza`, `Recurso` and `Decisiones`
- [ ] Every Sesión carries binary acceptance criteria, authored before the work started
- [ ] No Sesión is `COMPLETO` with an unchecked box; overflow scope got its own ID
- [ ] Every `derivable` decision names an approved authority **and** a falsifiable criterion
- [ ] No decision in the eight always-escalate classes is marked `derivable`
- [ ] Every escalating decision declares `Contamina:` when the contamination is semantic
- [ ] A parked decision carries question, evidence, options with consequence, origin,
      checkpoint and class
- [ ] A Sesión is `BLOQUEADO` only per §14 — never merely because a decision escalates
- [ ] Planning proposed a route with authority; kickoff revalidated it against exact current Git evidence
- [ ] A route change at implementation time recorded why it changed
- [ ] Nobody hand-edited `openspec/ROADMAP.md` or created parallel generated status/index files
- [ ] Artifacts omitted on a small product are declared on the plan, not silently skipped
