# Technical design: provenance-gated Radar compatibility and full-fidelity migration

## Decision

The migration is implementation-ready.

Radar v3 will gain one optional Session-level `importacion_legacy` contract. It permits imported dotted Session/Module/Task identifiers and, when explicitly marked, a territory-pending state. Compatibility is accepted only when Radar proves the source row against a strict-ancestor Git commit, the exact source blob, and one exact Session heading in that blob.

Territory pending is metadata, not status. The Session must already contain an unresolved `escala` decision reaching `criterios` or `primer-modulo`; that decision continues to derive `🔴 BLOQUEADO`. While pending, authored territory fields are absent and Radar excludes the Session from Zone queues, ownership, seats, and capacity. Supplying ordinary validated territory ends pending without changing the ID or provenance.

This compatibility is the first implementation prerequisite, delivered as one separate code-and-test work unit before any migration data. The rest of the dormant preparation, immutable proof, atomic activation, and rollback architecture from the first design remains in force.

## Invariants

1. Radar retains exactly these seven statuses: `PLANIFICADO`, `LISTO`, `EN CURSO`, `BLOQUEADO`, `DIFERIDO`, `COMPLETO`, and `ARCHIVADO`.
2. `importacion_legacy` never derives status. Existing decision logic remains the only reason a territory-pending open Session becomes `BLOQUEADO`.
3. A compatibility marker without verifiable immutable source-row provenance is an error.
4. Ordinary Sessions keep the current flat ID, Zone, route, path, Cimiento, queue, ownership, and scheduling contract unchanged.
5. Pending territory claims no `zona`, Module `rutas`, Session `cimientos`, or `ruta`; Radar rejects any of them when present.
6. Queue position, ownership, seat, and capacity remain derived values and have no new authored schema fields. Strict YAML decoding continues to reject attempts to author them.
7. Source evidence has an `origen_ruta`; that path identifies the historical source blob and is not Session territory or ownership.
8. A territory-pending Session is open, not delivered, archived, or deferred, so its blocking decision is not overridden by terminal-state precedence.
9. Resolution changes only `territorio_pendiente` from `true` to `false` and supplies the ordinary validated territory contract. `id` and all provenance fields remain byte-for-byte unchanged.
10. No migration inventory, mapping row, candidate plan, archive data, canonical plan, ROADMAP, commit, or push is created until the compatibility prerequisite passes.
11. Every provenance-proven imported Session with integrated delivery or an explicit archive marker is terminal history when it omits `zona`, `ruta`, and Session `cimientos`. Its exact safe Module paths may resolve to any current owner combination: one Zone, Zone plus exact Cimiento, multiple Zones, or Cimiento-only. Paths, decisions, provenance, delivery evidence, and global terminal contribution remain; per-Zone progress, queues, seats, capacity, execution ownership, creation permission, and unused-rule justification receive nothing. The ownerless form remains narrower: only an explicitly archived row may preserve absent unowned paths, while tracked unowned paths fail. Ordinary, open, deferred, pending, unproven, unsafe, symlink, authored-territory, and mismatched delivery/provenance rows keep their existing branches or fail closed. No new flag, status, schema field, product path, or future rule is introduced.

## Radar schema contract

`schema_version` remains `3`. The new field is optional, so every existing v3 plan without compatibility data keeps identical behavior.

### Go shape

`agent-workflows/tools/radar/plan.go` adds:

```go
type Sesion struct {
    // existing fields remain unchanged
    ImportacionLegacy *ImportacionLegacy `yaml:"importacion_legacy"`
}

type ImportacionLegacy struct {
    OrigenCommit       string `yaml:"origen_commit"`
    OrigenRuta         string `yaml:"origen_ruta"`
    OrigenBlob         string `yaml:"origen_blob"`
    OrigenEncabezado   string `yaml:"origen_encabezado"`
    TerritorioPendiente bool  `yaml:"territorio_pendiente"`
}
```

No compatibility field is added to `Modulo`, `Tarea`, `Zona`, `Cimientos`, `RutaSesion`, status constants, ownership, queue, or capacity structures. Module and Task IDs inherit the proven Session import contract.

### YAML example

```yaml
- id: S2.10
  resultado: Integrate canonical enrollment into the real central menu
  autoridad: preproposal supplemental maintainer resolution
  importacion_legacy:
    origen_commit: <full immutable source commit OID>
    origen_ruta: openspec/plans/plan-2/STATUS.md
    origen_blob: <full blob OID at origen_commit>
    origen_encabezado: "## Sesión 2.10 — Integración del menú central"
    territorio_pendiente: true
  criterios:
    - The real menu owner and path are proven before implementation
  decisiones:
    - tipo: escala
      pregunta: Which repository path owns the real central-menu renderer?
      evidencia: The approved screenshot exists but this checkout does not prove the renderer
      checkpoint: before the first Module
      opciones:
        - opcion: Locate the real owner
          consecuencia: The Session can receive validated territory
        - opcion: Declare the menu external
          consecuencia: Product scope requires maintainer correction
      clase: dependencias-o-evidencia-contradictorias
      alcanza: primer-modulo
  modulos:
    - id: M2.10.1
      resultado: Preserve the imported legacy decomposition
      tareas: []
```

The pending form deliberately omits `zona`, `ruta`, Session `cimientos`, and Module `rutas`. `recurso` remains ordinary non-file metadata if the legacy contract proves one, but it cannot produce a seat because the Session is excluded before candidate selection.

## Immutable provenance validation

Validation runs inside `Plan.CheckAt(root, head)` and uses the same fixed `head` already used for delivery and route evidence.

For each Session with `importacion_legacy`, Radar performs this sequence:

1. Require all four provenance scalars to be nonblank.
2. Validate `origen_commit` with the existing `gitOID` contract: full SHA-1 or SHA-256 commit OID, never a branch, revision expression, abbreviation, or option-like value.
3. Require `origen_commit` to be a strict ancestor of the fixed validation `head`. Equality is rejected, preventing a newly added current-tree row from self-attesting as imported.
4. Normalize `origen_ruta` as one exact repository-relative file path with the existing path-safety rules.
5. Resolve that exact path with `git ls-tree <origen_commit> -- <origen_ruta>`. Require exactly one regular `blob` entry.
6. Require the tree entry's full OID to equal `origen_blob` for the repository object format.
7. Read the declared blob with `git cat-file blob <origen_blob>`.
8. Require `origen_encabezado` to occur as exactly one complete line in the blob.
9. Parse only a Markdown Session heading of the form `#{1,6} Sesión S?<positive numeric path>`, optionally followed by title text. Its normalized identifier must equal the target Session ID (`2.10` and `S2.10` both normalize to `S2.10`).
10. Require the tuple `(origen_commit, origen_ruta, origen_encabezado)` to be unique across the plan. Existing global Session/Module/Task ID uniqueness checks remain active.

A missing commit, lateral commit, current `head`, non-blob path, mismatched blob OID, absent/duplicate heading, heading-to-ID mismatch, or duplicate source-row tuple is an error. Therefore setting the marker is not authority by itself; the immutable repository objects must prove the imported row.

## Identifier validation

Ordinary rows retain the existing rules unchanged:

- Session: `^S[1-9][0-9]*$`
- Module: `^M<session-number>\.[1-9][0-9]*$`
- Task: `^T<module-number-path>\.[1-9][0-9]*$`

A proven imported row uses a structural legacy grammar:

- Session: `S` followed by one or more dot-separated positive decimal segments.
- Module: `M` followed by the exact Session numeric path plus one positive decimal segment.
- Task: `T` followed by the exact Module numeric path plus one positive decimal segment.

Examples accepted under proven import: `S2.10`, `M2.10.1`, `T2.10.1.1`. Examples rejected: `S02.10`, `M2.11.1` under `S2.10`, `T2.10.2.1` under `M2.10.1`, empty segments, normalization, and duplicates.

Radar never rewrites identifiers. The compatibility branch selects a validator; it does not transform data.

## Territory-pending validation

A Session is territory pending only when `importacion_legacy.territorio_pendiente` is `true`.

### Required

- Proven immutable import provenance passes all checks.
- The Session is open: `entrega == nil`, `archivada == false`, and `diferida == false`.
- At least one unresolved `decisiones[].tipo: escala` has `alcanza: criterios` or `alcanza: primer-modulo`.
- If the blocking reach is `primer-modulo`, at least one imported Module is present.
- Session, Module, and Task IDs are unique and structurally consistent.
- A provenance-verified pending Module may have zero Tasks only when the immutable source deliberately defers all Tasks until territory proof and the unresolved escalation reaches `primer-modulo`; its ID and result remain mandatory.
- Existing non-territory requirements remain active: nonblank results and authority, Session criteria, complete decision records, and complete fields for every enumerated Task. Ordinary, resolved imported, and pending-at-`criterios` Modules still require at least one Task.

### Must be absent

- `sesiones[].zona`
- `sesiones[].cimientos`
- every `sesiones[].modulos[].rutas`
- the entire `sesiones[].ruta` value, including proposal, authority, and revalidation

A pending Session bypasses only the checks that inherently require known territory: mandatory Zone membership, route validity/depth, Module route presence, and Module path ownership. It does not bypass provenance, decision, identity, hierarchy, result, authority, criteria, dependency, lineage, or delivery validation.

Unknown authored fields such as `owner`, `ownership`, `queue`, `seat`, or `capacity` remain rejected by `yaml.Decoder.KnownFields(true)`.

### Resolution

When territory becomes known, a source-deferred zero-Task Module must enumerate Tasks under the same stable Module ID and unchanged provenance before ordinary validation can pass.

When territory becomes known:

1. Keep `importacion_legacy` and every provenance scalar unchanged.
2. Set `territorio_pendiente: false`.
3. Add a valid `zona`, ordinary route contract, exact Module `rutas`, and exact Cimiento reservations where applicable.
4. Run the unchanged ordinary Zone, route, depth, path, Cimiento, ownership, queue, seat, and capacity rules.

The imported structural ID validator remains active, so `S2.10` does not change identity during resolution.

## Derived state and scheduling

### Status

`agent-workflows/tools/radar/state.go` keeps all seven constants and `EstadosAt` precedence unchanged. The required escalating decision makes the pending Session `BLOQUEADO`; `territorio_pendiente` contributes no status branch.

### Queue and seats

`ColaPorZonaAt` skips territory-pending Sessions before grouping by Zone. This prevents an empty-string pseudo-Zone and keeps them out of every deterministic queue.

`AsientosAt` continues to choose only `LISTO` candidates from `ColaPorZonaAt`. Because pending rows never enter a queue and validation requires them to derive `BLOQUEADO`, they cannot produce a seat or capacity contribution. No new scheduling algorithm or runtime lock behavior is introduced.

### Ownership and progress

`Area` naturally returns no paths for an empty Zone, but renderers do not present that as an owner. `radar zonas` remains a tracked-file partition report and receives no Session-specific compatibility branch.

Global progress continues to count every enumerated imported Session, preserving the full-fidelity denominator. Per-Zone progress omits territory-pending Sessions because assigning them to an empty or synthetic Zone would fabricate ownership. The generated view states that territory-pending Sessions are included in total progress but unassigned to any Zone; it does not present that note as a Zone.

## Status and ROADMAP rendering

`radar status` obtains its rows from Zone queues, so pending Sessions do not appear in queue or seat output. The total denominator still includes them.

`radar render` applies these rules:

- Pending Sessions appear in `Bloqueos`, with the existing decision-derived reason.
- They do not appear in `Estado y próximo trabajo`, `Zonas y colas`, `Rutas`, or `Capacidad` candidates.
- Their detail shows the derived `BLOQUEADO` state, provenance-qualified territory-pending note, dependencies, criteria, decisions through the existing blocker summary, and preserved Module/Task IDs and content.
- Their detail omits `Zona/Área`, `Cimientos`, and Module `Rutas` lines. It may show proven `Recursos`, but those resources do not enter seat selection.
- `Avance` keeps the global fraction and adds a plain note with the count of territory-pending Sessions included globally but assigned to no Zone.
- Ordinary Session rendering remains byte-for-byte governed by the current branches.

No eighth status, synthetic `pending` Zone, placeholder path, `blocked` route, fake Cimiento, queue position, owner, seat, or capacity value is rendered.

## Data flow

```text
plan.yaml Session
    |
    +-- importacion_legacy absent --------------------> existing Radar v3 path
    |
    `-- importacion_legacy present
           |
           +-- prove strict-ancestor commit
           +-- prove exact path -> blob OID
           +-- prove unique exact heading -> Session ID
           +-- validate imported ID hierarchy
           |
           +-- territorio_pendiente: true
           |      +-- require blocking escala decision
           |      +-- reject authored territory
           |      +-- derive BLOQUEADO from decision
           |      `-- exclude queue/ownership/seat/capacity
           |
           `-- territorio_pendiente: false
                  `-- run ordinary territory and scheduling contract
```

Any provenance or compatibility error fails `radar check`; `radar status` and `radar render` continue to validate first and fail closed.

## Exact Radar file changes

The prerequisite is limited to these files:

| File | Change |
|---|---|
| `agent-workflows/tools/radar/plan.go` | Add the optional `ImportacionLegacy` pointer and five-field schema type. Keep schema version 3 and strict decoding. |
| `agent-workflows/tools/radar/check.go` | Prove source-row provenance, select ordinary/imported ID grammar, validate pending-territory invariants, and bypass only territory-dependent checks while pending. Reuse existing Git/path helpers. |
| `agent-workflows/tools/radar/state.go` | Exclude pending Sessions from Zone queues and per-Zone progress while retaining them in total progress. Seat exclusion follows from queues. |
| `agent-workflows/tools/radar/render.go` | Omit pending territory/route/scheduling presentation, preserve blocker and hierarchy detail, and explain global-only progress inclusion. |
| `agent-workflows/tools/radar/legacy_compat_test.go` | Add focused table-driven contract tests and immutable Git fixtures. |

Explicitly unchanged: `main.go`, `partition.go`, `safety.go`, `ledger.go`, command names/flags, state constants, decision classes, route vocabulary, Zone/Cimiento matching, runtime claims, and every non-Radar surface.

## Focused tests

`legacy_compat_test.go` will contain these test contracts:

1. `TestLegacyImportAcceptsProvenDottedHierarchy` — a strict-ancestor source commit, exact blob, unique heading, and consistent `S2.10/M2.10.1/T2.10.1.1` pass without normalization.
2. `TestLegacyImportRejectsUnprovenSourceRow` — table cases cover missing provenance, current/lateral/missing commit, mismatched blob, absent or repeated heading, heading/ID mismatch, non-blob path, and duplicate provenance tuple.
3. `TestOrdinaryRowsCannotUseLegacyIDsOrPendingTerritory` — dotted IDs without proven import and pending metadata without proof fail; ordinary flat rows remain valid.
4. `TestLegacyHierarchyRemainsStructuralAndUnique` — parent mismatch, zero/leading-zero segments, and duplicate Module/Task IDs fail.
5. `TestPendingTerritoryRequiresBlockingEscalation` — no decision, `derivable`, or a later-Module reach fails; `criterios` and `primer-modulo` pass, with the latter requiring a Module.
6. `TestPendingTerritoryRejectsTerritoryAndTerminalFlags` — table cases reject Zone, Cimiento, Module path, route, delivery, archive, and defer data.
7. `TestPendingTerritoryDerivesBlockedWithoutNewStatus` — the existing decision path returns exactly `Bloqueado`; the compatibility field never changes the seven constants.
8. `TestPendingTerritoryHasNoQueueOwnerSeatOrCapacity` — no queue key, `Area` is empty, no seat is offered, no per-Zone progress bucket is created, and global progress still counts the Session.
9. `TestPendingRenderOmitsTerritoryAndPreservesHierarchy` — output contains the blocker and legacy IDs but no Zone/Area, route, Cimiento, Module paths, queue, owner, seat, or capacity claim for that Session.
10. `TestResolvedLegacyTerritoryKeepsIdentityAndUsesOrdinaryRules` — changing only the pending flag and adding valid territory preserves `S2.10`, admits it to the correct Zone queue when otherwise eligible, and rejects invalid ordinary territory.

Existing Radar tests remain the regression suite and must pass unchanged. Focused verification is `go test ./agent-workflows/tools/radar` from the repository root, followed by the repository's normal broader test command identified by `sdd-init` during apply.

## Authored-line forecast for the prerequisite

One honest implementation fits the required review budget without code-golf or omitted tests:

| File | Forecast authored additions + deletions |
|---|---:|
| `plan.go` | 18 |
| `check.go` | 140 |
| `state.go` | 16 |
| `render.go` | 34 |
| `legacy_compat_test.go` | 165 |
| **Total** | **373** |

The apply task must measure the staged authored diff before review. If the cohesive implementation exceeds 400 after one honest pass, stop rather than prepare migration data or split away its tests. The prerequisite is one independently verifiable, revertible code-and-test unit; the line cap is not permission to compress validation or weaken coverage.

## Retained migration architecture

After the prerequisite passes, migration preparation remains dormant under:

`openspec/changes/migrate-control-tower-plan-zones/migration/`

| Path | Purpose | Activation treatment |
|---|---|---|
| `README.md` | Marks all preparation as inactive and records the source OID. | Removed from activation tree; retained in local history. |
| `source-inventory.yaml` | Source path/mode/blob inventory. | Promoted unchanged to archive evidence. |
| `sessions/*.yaml` | One equivalence row per legacy Session, including `importacion_legacy` fields where used. | Promoted unchanged to archive evidence. |
| `lineage.yaml` | `S100`–`S108`, archived originals, and dependency rewrites. | Promoted unchanged to archive evidence. |
| `archive-inventory.yaml` | Source-to-archive mappings and archive-only reasons. | Promoted unchanged to archive evidence. |
| `partition.yaml` | Final Zone/Cimiento partition proof, including `metodo`. | Promoted unchanged to archive evidence. |
| `candidate/plan.yaml` | Dormant complete Radar candidate; omits `raiz`. | Exact blob becomes `openspec/plan.yaml`. |
| `candidate-inputs.yaml` | Final path/blob/mode assembly inputs. | Promoted unchanged to archive evidence. |

`openspec/plan.yaml` and `openspec/ROADMAP.md` remain absent from the active worktree and all pre-activation commits. No migration data currently exists, so there is no compatibility backfill or conversion step.

## Source inventory and field precedence

The immutable source commit and exact Git blobs remain the evidence boundary. Session discovery accepts the actual legacy Markdown Session headings, records their complete heading lines, and maps their numeric path to the canonical `S`-prefixed identity. Summary tables, Mermaid nodes, queue mentions, and prose references do not create Sessions.

Field precedence remains:

1. Resolved preproposal plus corrected proposal/spec for scope, compatibility, identity, archive, and activation.
2. `agent-workflows/ASIGNACION-24-SESIONES.md` for the approved 24 open assignments, `S100`–`S108`, and `S7.1`.
3. Later scoped maintainer decisions.
4. Immutable Git evidence for object, path, delivery, ancestry, and tree facts.
5. The owning legacy `STATUS.md` Session contract when not superseded.
6. Legacy indexes, release prose, percentages, and narrative as comparison/archive input only.

Equal-precedence contradictions block activation. Derived status, queue, progress, capacity, owner, and area are compared but never authored.

### C05.2 authority clarification

S1.11 proves that the equivalence mapping preserves stable IDs and references, but not Radar's complete structured Module/Task payload or complete structured resolved-decision record.

Options considered:

- **A — selected:** dereference only the immutable approved contracts already cited by each committed equivalence row.
- **B:** enrich all 72 mapping rows with every required Radar field.
- **C:** pause candidate construction.

Emilio explicitly approved option A. Before copying any field, candidate construction MUST verify the cited source path, blob, commit, and the authority precedence above. It MUST use no uncited source, inference, or new product fact. The decision class is `dependencias-o-evidencia-contradictorias`; it contaminates C05.2 through C09. The resume checkpoint is immediately before creating `migration/candidate/plan.yaml`. The authority order above remains unchanged, and equal-precedence contradictions still stop.

## Full-fidelity mapping and partition

Every enumerated Plans 0–12 Session appears exactly once with its stable ID. Imported Module and Task IDs remain byte-for-byte. Approved originals and `S100`–`S108` retain explicit `reemplaza` lineage; active dependencies cannot target archived originals without the applicable successor.

Partition proof runs against the tracked files of one immutable candidate tree, not the historical 441-file count. The dedicated `metodo` Zone owns `agent-workflows/` except justified exact-file Cimiento carve-outs. The gate remains zero orphaned files, zero unintended overlaps, zero unexplained unused rules, and no broad Cimiento that erases `metodo` ownership.

`S2.10` and `S9.2` use territory pending only if their exact imported source rows and blocking decisions pass the new contract. They receive no placeholder Zone, path, route, Cimiento, ownership, queue, seat, or capacity.

## Candidate proof and activation

C07 uses a private `radar_execution_subject`, not a branch, mutable worktree, candidate, or package identity:

```text
immutable source + exact C06 read
        |
        v
private synthetic commit/tree with logical precursor
        |
        v
C07 recipe/path-mode-blob evidence + Radar/render/doc-close hashes
        |
        v
C08 reproduces exact recipe/content/evidence; readiness only, no package OID
        |
        v
C09 fixes activation bytes and receipts, computes final_package_identity once
```

The subject is a non-product, non-activating technical locator; versioned manifest/results are external preparation receipts and excluded from it. Every private Git operation uses explicit private `GIT_DIR`, `GIT_WORK_TREE`, and index, with a detached HEAD and zero refs. The fixed subject runs `radar check`, `radar status`, `radar zonas`, and two byte-identical renders; the ROADMAP blob equals both renders.

The activation commit introduces the exact proven `openspec/plan.yaml` and `openspec/ROADMAP.md`, archives retired legacy views, and switches active guidance/doc-close behavior together. Only C09 computes and commit-message-attests `final_package_identity` with source, plan/ROADMAP/archive/evidence OIDs, Radar results, partition counts, and doc-guard proof.

Any changed byte invalidates the proof. There is no supported mixed state.

## Rollout order

1. Implement only the five-file Radar prerequisite above.
2. Run focused and regression tests; measure the staged authored diff and require `<=400`.
3. Review and commit that prerequisite as one reversible unit. Do not prepare migration data before it passes.
4. Freeze the immutable legacy source snapshot and inventory all authoritative blobs.
5. Build Session/equivalence batches, immutable compatibility provenance, lineage, archive mappings, and the final `metodo` partition at noncanonical paths.
6. Build the complete dormant candidate plan; resolve territory by adding ordinary validated fields where evidence exists, never by changing imported IDs.
7. Materialize and prove the complete candidate tree in an isolated home-directory checkout.
8. Reproduce the proven tree with a private Git index in the delivery checkout.
9. Activate both canonical paths, archive, guidance, and close-gate behavior in one commit whose tree equals the attested candidate tree.
10. Perform structural readback, push directly to `master`, then verify remote ancestry, deterministic rendering, compatibility behavior, archive readability, and documentation-close behavior.

Every later preparation commit remains independently verifiable, revertible, and at most 400 authored changed lines. Generated output is excluded only from authored-line counting, never from candidate identity.

## Rollback

- **Compatibility prerequisite failure:** revert its single code-and-test unit. No migration data exists yet, so no dependent data needs conversion.
- **Before activation:** do not push. Restore the activation parent; canonical paths remain absent and legacy views remain authoritative.
- **After activation:** create one conventional revert commit restoring the complete legacy-active tree, removing both canonical paths, restoring prior guidance/close behavior, and retaining immutable evidence in Git history.
- **Compatibility removal after preparation:** prohibited while any prepared or active imported row depends on it. Discard dependent migration data first or retain compatibility.
- Never repair generated ROADMAP content by hand or preserve half of the target contract. Any correction requires a newly proven candidate identity.

## Risks and controls

| Risk | Control |
|---|---|
| A marker is used as self-asserted authority | Strict-ancestor commit, exact tree path/blob, exact unique heading, heading-to-ID match, and tuple uniqueness are mandatory. |
| Legacy IDs become a general escape hatch | Only proven imports select the structural legacy grammar; ordinary rows keep current validation. |
| Pending metadata becomes an eighth status | State constants and `EstadosAt` remain unchanged; validation requires the existing decision-derived block. |
| Unknown territory leaks into scheduling | Validation rejects authored territory; queue filtering occurs before Zone grouping; seats derive only from filtered queues. |
| A synthetic empty Zone appears in progress or rendering | Per-Zone progress and Zone rendering omit pending rows; global progress keeps the denominator with an explicit non-Zone note. |
| Resolution silently changes identity | Provenance remains attached and imported ID validation remains active after `territorio_pendiente: false`. |
| The prerequisite exceeds reviewer capacity | Staged authored diff is measured; the forecast is 373 lines and implementation stops if the cohesive unit exceeds 400. |
| Radar behavior drifts outside compatibility | Only the five named files are allowed; existing regression tests must pass unchanged; no CLI, partition, runtime, status-vocabulary, decision-class, or normal-row change is authorized. |
| Migration starts before the contract is proven | Tasks make this code-and-test unit a hard predecessor of every inventory/data task. |
| Activation bytes differ from proof | Exact Git object identities and final tree equality remain mandatory; any difference invalidates the candidate. |

## Verification gates

The prerequisite passes only when all focused tests and the existing Radar suite pass, the staged authored diff is at most 400 lines, exactly seven statuses remain, and no migration data or canonical path exists.

Final activation additionally requires complete source/blob inventory, one-to-one Session ledger closure, stable imported hierarchy, approved replacement lineage, zero partition gaps/overlaps, complete `metodo` ownership, immutable delivery evidence, byte-faithful archive mappings, successful Radar commands on one candidate tree, two identical renders, doc-close proof, reproduced tree equality, and atomic canonical-path activation.

## Next step

Proceed to `sdd-tasks`. The first apply task must be the single bounded Radar compatibility prerequisite; every migration-data task depends on its passing tests and `<=400` authored-line measurement.

## C05.1Q S4.8 exact future host-path authority

Before S4.8 RED, Emilio explicitly assigned `scripts/host-compatibility/opencode.mjs` and `test/compat/opencode-runtime.test.mjs` to Zone `hosts`. They are ordinary S4.8 Module territory, not Cimientos; `package.json` and `bun.lock` remain Cimientos. An absent future path explains an otherwise unused Zone rule only when an open Session declares the identical safe exact Module path in that same Zone. The exception excludes patterns, directories, Cimientos, unreserved paths, terminal Sessions, and mismatched Zones, and does not alter tracked-file orphan or overlap semantics.

Authority: maintainer approval recorded in Engram observation 10289. Classes: `expansion-de-alcance` and `dependencias-o-evidencia-contradictorias`. Contaminates the partition correction, S4.8, and C05.2–C09. Resume checkpoint: immediately before S4.8 RED. No S4.8 candidate row is authored by this prerequisite.

## C05.2B exact legacy-path replacement authority

Before candidate continuation at S1.13, Emilio explicitly authorized the exact replacement `host/loop.mjs` → `hosts/loop.mjs`. The immutable S1.13 STATUS at source commit `43130ad40af06f3ed05671000719217bee74f0a5` names `host/loop.mjs`; the current candidate-base tree tracks `hosts/loop.mjs`; and commit `08a99af00b627fea81a72013b4bdce780e73d1fc` records `R100 host/loop.mjs hosts/loop.mjs` with message `refactor(hosts): fold host/ into hosts/`.

Decision class: `dependencias-o-evidencia-contradictorias`. Contaminates S1.13 and any later included row citing the same legacy path, through C09. Resume checkpoint: before adding S1.13. The only permitted consequence is substitution of this exact old/new path pair when both the cited path and Git rename proof match. Fuzzy rename, directory-wide normalization, unrelated path repair, inference, and product-fact changes remain prohibited.

## C05.1P plugin Zone ownership correction

Before continuing at S1.15, Emilio selected **Hosts y continuar**. The immutable S1.15 Area spans `plugin/tower-spike.js`, `test/helpers/host-adapter-conformance.mjs`, and `test/host-adapters.test.mjs`; source inspection proves `plugin/tower-spike.js` is the OpenCode host/lifecycle adapter, and `test/plugin/tower-spike.test.mjs` tests that adapter. Therefore `plugin/` and `test/plugin/` belong to Zone `hosts`, not `capacidades`. The exact host conformance helper remains a Cimiento, and `test/host-adapters.test.mjs` remains owned by `hosts`; the adapter itself is not a Cimiento.

Decision class: `dependencias-o-evidencia-contradictorias`. Contaminates the corrected C05.1 partition and candidate C05.2 through C09. Resume checkpoint: before adding S1.15. This partition-authority correction changes no runtime behavior or product priority; Pi remains the product priority.

## C05.2D S1.17 structured Pi authority resolution

Before adding S1.17, Emilio explicitly authorized a complete current structured representation using only observable immutable evidence. Tower-owned `scope_id`, `endpoint_epoch`, role, and capabilities confer authority; `incarnation_id` identifies only the neutral incarnation and confers no authority. Pi is the first implementation host; OpenCode remains preserved but is not promoted ahead of Pi. Intercom is transport and confers no assignment or permission authority.

Authority: Emilio's current explicit authorization, grounded in immutable S1.17 STATUS decisions 82–84/86 and acceptance/closure evidence. Falsifier: any accepted self-declared, takeover, cross-worktree, cross-epoch, or stale binding; any read-only role receiving `bash`, `write`, or `edit`; or any authority inferred from Intercom or `incarnation_id`.

Discarded alternatives: (1) `incarnation_id as authority`, rejected because neutral incarnation identity cannot prove Tower ownership and would admit takeover/self-declaration; (2) `Intercom grants authority`, rejected because transport cannot grant assignment, role, or permissions; (3) `read-only roles receive bash/write/edit`, rejected because immutable S1.17 criteria require role-bounded capabilities; and (4) `OpenCode before Pi`, rejected because the approved Pi-first promotion superseded the old OpenCode-first deferred route.

Decision classes: `seguridad-y-permisos`, `contrato-visible-del-producto`, and `dependencias-o-evidencia-contradictorias`. Contaminates S1.17 and C05.2–C09. Resume checkpoint: before adding S1.17. This is documentation/migration representation only; it changes no runtime or public API.

## C05.2E S1.18 exact authority package

Before adding S1.18, the exact authority package is immutable STATUS lines 346–397 at source commit `43130ad40af06f3ed05671000719217bee74f0a5` plus full Engram observations 10008, 10019, 10020, and 10028. The public-flow resolution fixes Pi Intercom as Main↔Support↔worker transport that never grants authority: Tower ON binds, persists, acknowledges, and retries under Tower ownership; Tower OFF uses only maintainer-approved live peers and preserves Main/human authority. The discarded alternative is `Intercom grants authority`; the exact falsifier is an Intercom message creating authority or an ON send lacking binding, acknowledgment, or retry.

The internal terminal report shape is derivable under decision 104: every assignment binds one unique `dispatch_id` and terminates exactly once as `COMPLETED`, `BLOCKED`, or `FAILED`, with evidence/recoverability appropriate to that state. Approved authority and the falsifiable single-terminal criterion permit derivation at the pre-dispatch checkpoint. The honest contract option is to emit one causally referenced terminal report; its consequence is that `COMPLETED` carries evidence references, changed paths, and tests, while `BLOCKED`/`FAILED` carry reason and recoverability. Absence, duplication, or a terminal without causal reference falsifies the derivation.

The remediation resolution preserves one Session but uses two sequential direct commits: lifecycle plus acknowledged dispatch first, then retryable terminal delivery plus immutable decision snapshot. The discarded one-candidate repair path was already 397/400 authored lines and could not honestly absorb fixes for stop ownership ordering, successful disappearance after stop, retry after terminal-delivery failure, exactly one successfully delivered terminal, and pre-`await` decision snapshotting without code-golf. STATUS falsifies the chosen boundary if ownership is checked after stop, successful disappearance is treated as failure, the only terminal is lost, more than one terminal succeeds, or a decision request mutates across `await`. Engram 10028 proves final delivery/closure authorization for exact commits `3ebb83373cf9507274a87e5206f315dce34a6a4f` then `2cd64c4a32e178c88632348696353c2dd8654c56` after final verification.

## C05.2M S1.19 territory-pending authority

Before S1.19 RED, Emilio selected **Bloquear territorio**. The immutable Session preserves planned Area `test/integration/pi-first/**` plus exact `test/host-adapters.test.mjs`, but the candidate base contains no tracked exact file beneath the integration glob. Radar permits an absent future exact file, not a glob or directory, and the C05.1 partition cannot carry an unused future rule. Therefore S1.19 remains a target row with `territorio_pendiente: true` and an unresolved `escala`: “Which exact test files will own the Pi-first integration regression?” The selected option is to prove exact paths before implementation; rejected options are expanding Radar to pattern territory, inventing/omitting an exact integration file, and removing/archiving S1.19. Class: `dependencias-o-evidencia-contradictorias`; reach: `primer-modulo`; checkpoint: before S1.19 RED / first Module; contamination: S1.19 and migration construction C05.2–C09, with candidate Session IDs added only when dependencies prove them. The mapping preserves S1.19 identity, hierarchy, criteria, tasks, Pi-first intent, dependency, and provenance while omitting target territory, route, Cimiento, ownership, queue, seat, and capacity claims. This is migration representation only and changes no runtime or product behavior.

## C05.2G S1.20 derivable Tower-mode classification

Before S1.20 RED, the derivable question is: **how does the read-only Tower-mode probe classify repository mode?** Evidence is the immutable `ACTIVE`/persisted-state contract in S1.20 STATUS and Engram observation 10008; host/process health remains separate. Checkpoint: before S1.20 RED. The sole authorized option is to return only `ON`, `OFF`, or `INDETERMINATE`; ambiguity, contradiction, or I/O returns `INDETERMINATE`, never guessed `OFF`. Authority: decision 104 and Engram 10008. Falsifiable criterion: `ON` requires coherent activation; `OFF` requires proven coherent absence or negative state; ambiguity, contradiction, or I/O yields `INDETERMINATE`; host/process health does not alter mode. Class: derivable/internal, not an always-escalate class. This records migration representation only and changes no runtime or API.

## C05.2H S2.9 public enrollment authority package

Before S2.9 candidate authorship, the resolved escalation fixes `torre enroll --repo <path>` as the public canonical operation calling the existing `enrollProject`; `torre on --repo` remains activation-only and rejects unregistered projects with enrollment guidance. Authority is decision 104, full Engram observation 10008, and the delivered S8.3 contract. Classes: `api-publica`, `contrato-visible-del-producto`, and `seguridad-y-permisos`; contamination: S9.7. The resolution is falsified if the CLI duplicates or bypasses enrollment authority, if `torre on` registers a project or creates `ACTIVE` for an unregistered project, or if enrollment activates Tower, starts processes, or mutates worktrees. Exact discarded alternatives are implicit enrollment through `torre on` (rejected because activation must fail closed before registration), duplicate enrollment implementation in the CLI (rejected because S8.3 already owns identity, validation, preflight, and persistence), and absence of an explicit public enrollment command (rejected by the approved visible product contract).

The derivable question is: **how are CLI arguments translated to the existing request?** Evidence is the delivered `enrollProject`/S8.3 contract and immutable S2.9 criteria; checkpoint: before T2.9.1.2. The authorized option is to parse `--repo` and call the existing `enrollProject` request unchanged, preserving one identity, validation, preflight, and persistence authority. Authority and falsifiable criterion are exactly immutable STATUS line 46: the CLI does not duplicate validation, identity, preflight, or persistence of `enrollProject`; any second implementation falsifies the derivation. This records representation only and introduces no new product choice.

## C05.2Q S4.2 current maintainer-authority closure

Before S4.2 candidate reconstruction and RED, Emilio explicitly approved the following ten verification closures exactly as presented. They supplement, but do not rewrite, the historical resolutions, classes, and contamination recorded in immutable `openspec/plans/plan-4/STATUS.md:183-193`. The new falsifier and discarded-alternative wording is current approval corroborated by Engram observation 10281 (`sdd/migrate-control-tower-plan-zones/s4.2-authority`); it is not represented as a quotation from the 2026-08 source. Decision 36 remains the superseding authority where indicated.

| # | Historical topic and preserved resolution | Class | Contamina | Current falsifier | Discarded alternative |
|---:|---|---|---|---|---|
| 1 | Packaged `torre`: the productive launcher runs only the installed `torre` runtime; caller inputs do not select core, lifecycle, or executable. | `seguridad-y-permisos` | `S4.2`, `S4.3` | Falsified if caller input selects core, lifecycle, or executable. | Caller-selectable components. |
| 2 | Main-issued launch binding: Main issues one dedicated opaque launch record; the consumer accepts no caller-fabricated identity, epoch, or location. | `seguridad-y-permisos` | `S4.2`, `S4.3` | Falsified if identity, epoch, or location not issued by Main is accepted. | Caller-built or reconstructed bindings. |
| 3 | Packaged deterministic provider: the Herdr/OpenCode provider is packaged with `torre`, deterministic, and resolved only from the installed runtime; `--request-ref` remains opaque. | `seguridad-y-permisos` | `S4.2` | Falsified if request, environment, or `PATH` changes provider or runtime. | External or caller-selectable provider. |
| 4 | Canonical assignment location: Main persists and validates the canonical assignment worktree and fence path before issuing or consuming a binding. | `seguridad-y-permisos` | `S4.2`, `S4.3` | Falsified if a worktree or fence differing from the persisted canonical assignment is accepted. | Caller-declared or unrevalidated paths. |
| 5 | Sequenced epoch/current pointer: Main publishes sequenced epochs and a current pointer; issuance and consumption revalidate the active epoch against that state. | `seguridad-y-permisos` | `S4.2`, `S4.3`, `S4.4` | Falsified if a stale, repeated, skipped, or non-current epoch is accepted. | Caller-provided epoch or no current pointer. |
| 6 | Installer-generated absolute versioned executable: install lifecycle generates the absolute versioned executable identity. | `seguridad-y-permisos` | `S4.2` | Falsified if the executable is resolved through `PATH`, environment, or caller argument, or mismatches the installed version. | Ambient discovery or checkout executable. |
| 7 | Attended absolute bootstrap/root identity: attended launch uses the installed absolute bootstrap and preserves the root OpenCode identity; subagents cannot replace it. | `seguridad-y-permisos` | `S4.2`, `S4.3` | Falsified if bootstrap is relative or uninstalled, or a subagent replaces root identity. | Caller/`PATH` bootstrap and child-as-root. |
| 8 | Strict Herdr 0.8 IDs/no v1: the historical v1 resolution is superseded by decision 36; S4.2 proves custody through fixed executable identity and strict Herdr 0.8 responses. | `dependencias-o-evidencia-contradictorias` | `S4.2`, `S4.3` | Falsified if S4.2 requires v1 or accepts a noncanonical `session_id`. | Packaged v1 and reattach in S4.2. |
| 9 | Same-user trust: only the same local user may operate the associated panel and process; any different identity fails closed. | `seguridad-y-permisos` | `S4.2`, `S4.3` | Falsified if another user can operate the panel/process or identity is not validated. | Cross-user trust or no user check. |
| 10 | S4.2 initial launch/custody only: superseded by decision 36, S4.2 derives no selection or lineage authority and validates only Herdr 0.8 custody for the newly launched process. | `seguridad-y-permisos` | `S4.2`, `S4.3` | Falsified if S4.2 inspects, rehydrates, recovers, or grants selection/lineage authority. | Reattach, recovery, and selection authority in S4.2. |

This authority permits only exact S4.2 candidate reconstruction from the immutable contract plus these approved verification fields. It creates no new status, compatibility flag, Session, Module, Task, runtime behavior, or scope. Resume checkpoint: **S4.2 RED**, after this record is structurally verified.

## C05.2S9.7 verifier-recovery decision

Before the S9.7 proof RED, Emilio selected **“Corregir la comprobación (Recommended)”** (Engram observation 10373). The prior failure was limited to an ephemeral verifier reading the nonexistent `inventory.discovery.row_count`; independent source-fidelity readback found the S9.7 candidate facts correct. This authority permits exactly one durable, read-only Bun verifier and its focused regression test under `migration/proof/`, plus this decision/task/progress record. It permits no candidate, inventory, lineage, Radar, runtime, data, or migration-scope change.

The verifier reads the actual `source-inventory.yaml`, `lineage.yaml`, candidate `plan.yaml`, and the committed-HEAD candidate. Its exported pure function MUST derive the canonical inventory count from `inventory.sessions`, check the exact imported-ID order against the lineage serialization, reject duplicates/invented IDs and a changed committed candidate prefix, and report the observed count, last candidate ID, next source cursor, and source/candidate hashes. Its runnable CLI emits concise deterministic JSON only; it does not claim full migration PASS or mutate sources.

**Binary criteria:** the actual schema without `inventory.discovery` passes; a wrong expected count, wrong order, duplicate ID, or changed committed prefix fails; unchanged current S9.7 has 56 candidate IDs, preserves the committed first 55 bytes, agrees with the approved imported order, and names `S9.8` as next. Rollback removes only the two verifier files and this narrow documentation delta; it never resets S9.7 candidate data.

## C05.2AN S5.6 route-authority correction

Before S5.6 candidate RED, Emilio explicitly authorized correcting only the committed equivalence route from `design-tasks` to `full-sdd`. This matches immutable `openspec/plans/plan-5/STATUS.md` line 703 within the S5.6 span beginning at line 691: the visible snapshot contract and new canonical parser require proposal/spec/design before implementation. Authority: Engram observation 10296 and immutable source commit `43130ad40af06f3ed05671000719217bee74f0a5`. Class: `dependencias-o-evidencia-contradictorias`; contamination: S5.6 and subsequent C05.2 candidate construction. Every other S5.6 mapping fact, including delivery `75ddcf94...`, remains unchanged. Resume checkpoint: S5.6 candidate RED.

## C05.2AR S12.3/S12.4 scoped migration-only formalization

Human approval 10433 authorizes only provisional parking of imported S12.3 and S12.4.
Each uses the existing pending-territory model and an unresolved `escala` with the
existing parser enum `contrato-visible`, reaching `criterios`; it grants no territory,
route, Cimientos, reservations, ownership, execution, capacity, or historical-answer
resolution. S12.4 remains wholly blocked for migration representation, while its
separate source hold for M12.4.2 remains unresolved and is not reclassified.

## C05.2 zero-Module design-tasks compatibility

`ImportacionLegacy.DescomposicionDiferida` is the single additional boolean carrier.
When true, Radar proves existing immutable provenance and exactly one complete
Session-local signature from a closed set, bounded from its exact heading to the next
Session heading or EOF. The S12.7 signature is the exact marker `**Decisiones:** las
define `session-plan` al desparquear. **Módulos:** ídem.` The S12.5 signature requires
both exact frozen markers: its multiline elaboration beginning `Los Módulos y Tareas los
escribe` and ending `esa descomposición**.`, plus `**Módulos:** los define
`session-plan`.` Every marker in a signature must occur exactly once; generic,
partial, duplicate, mixed-signature, and sibling-only evidence fail closed. The
zero-Module exception remains limited to proposed `design-tasks`, no delivery/archive,
no revalidation, and a complete unresolved `escala` at `primer-modulo` (question,
evidence, checkpoint, class, and consequential options). It preserves immutable
historical deferment, not execution.

Any future decomposition retains the immutable marker but must add concrete Modules
and Tasks and route revalidation against current HEAD; attempting that revalidation
while Modules remain absent fails closed. The existing terminal-history branch is
unchanged. No candidate/mapping, territory, Zone, Cimiento, resource, status, lineage,
or partition behavior is added.

## C05.2 S12.9 full-sdd extension

S12.9 adds this exact immutable two-line source marker and binds it only to `full-sdd`:

```text
**Módulos:** los escribe la fase `tasks` de SDD. Este Plan fija el contrato y no duplica esa
descomposición.
```

S12.5/S12.7 remain `design-tasks`. Route-mismatched,
generic, partial, duplicate, mixed, sibling/global, or foreign-marker proof fails closed.
It preserves its unresolved authorial `source_commit` and revision-2-versus-neighbor-file
decisions, grants no live planning authority, and requires Modules/Tasks plus
current-HEAD revalidation before ordinary execution.

## Bounded reference architecture amendment — Unit 1 historical baseline

This amendment superseded only the earlier 81-full-Session assumption. Its 72-import/74-full/85-record counts are retained as non-normative Unit 1 history and are superseded by the Unit 2 reconciliation below; all prior compatibility, dormancy, proof, activation, and rollback decisions remain unchanged.

### Closed reference contract

References remain outside `sesiones` under two concrete arrays, `future_successors` and `satisfied_history`; `schema_version` remains 3. Distinct nested Go structs and `KnownFields(true)` reject unknown, mixed, executable, and extra fields.

```yaml
references:
  future_successors:
    - id: S102
      reason: outside-approved-horizon
      result: <canonical lineage result>
      zone: entrega
      dependencies: [S101]
      foundations: []
      replaces: [S5.14]
      assignment_source:
        commit: <full source OID>
        path: agent-workflows/ASIGNACION-24-SESIONES.md
        blob: <full blob OID>
        line_start: <inclusive line>
        line_end: <inclusive line>
        byte_start: <inclusive byte>
        byte_end: <exclusive byte>
        fragment_sha256: <sha256 of exact bytes>
  satisfied_history:
    - id: S1.9
      reason: omitted-completed-import-dependency
      terminal_source:
        commit: <full source OID>
        path: openspec/plans/plan-1/STATUS.md
        blob: <full blob OID>
        line_start: <inclusive line>
        line_end: <inclusive line>
        byte_start: <inclusive byte>
        byte_end: <exclusive byte>
        fragment_sha256: <sha256 of exact bytes>
```

A generic immutable fragment locator fixes source commit, safe repository-relative path, regular blob and OID, exact bounded line and byte intervals, and SHA-256 of those bytes. Bounds must agree, be nonempty, and resolve inside one blob. There is no mandatory delivery OID and no reference-ID-specific exception.

For satisfied history, the located bytes must contain the exact reference ID and exactly one terminal source-status token from the closed `COMPLETO | ARCHIVADO` set. The final activation verifier authenticates the blob, bounds, bytes, hash, ID, and token generically; it does not assume whether the legacy evidence is an abbreviated commit, PR-only row, or candidate/integration prose. Existing immutable `importacion_legacy` provenance independently proves that a consumer's bounded frozen Session source contains the exact `Depende de` edge. The reference closes only that missing structural edge and grants no delivery, status, or execution authority.

### Canonical future mapping

Raw assignment Markdown is immutable evidence, not canonical field syntax: display Zone names, emphasis, punctuation, and casing may differ from Radar values. Committed `openspec/changes/migrate-control-tower-plan-zones/migration/lineage.yaml` is the canonical transformation ledger. Its future result, Zone, dependencies, Cimientos, and `reemplaza` fields compare byte-for-byte with candidate references.

The assignment locator and hash prove which raw row was transformed. A separate one-time mapping review/proof validates raw display values to canonical lineage values. Radar authenticates only the closed locator and reference shape; it neither normalizes Markdown nor decides migration mappings. The final lineage-aware verifier compares canonical lineage fields to candidate fields. Candidate prose is never authority.

### Responsibility split and graph safety

Generic Radar enforces only closed reference shape, immutable-locator structure, one global identity set across Sessions and both reference kinds, edge existence, replacement direction, historical-leaf restrictions, and cycle freedom. A future reference may register structural lineage closure but never satisfies an executable Session dependency; satisfied-history references cannot replace Sessions.

Migration-specific identities, exact 74/7/4 counts, imported-prefix order, `S100`/`S101` placement, `S102`–`S108` order, historical-reference order, and horizon partition belong only to the final lineage-aware verifier. R1 owns no migration order or ID allowlist.

### Non-operational projections

`EstadosAt`, `ColaPorZonaAt`, `AvanceAt`, `AsientosAt`, `Area`, and `radar zonas` remain Session-only. References receive no status, owner, readiness, queue, seat, capacity, progress denominator, completion credit, or partition territory. `radar status` and `radar render` expose one separately labeled “Non-executable references” listing, deterministically grouped by kind and declaration order, with only ID, literal kind, immutable locator provenance, and escaped reason. References never enter Session detail, blockers, closures, routes, Zones, or progress.

### Lineage, planning gate, and proof flow

The lineage ledger retains all nine `required_successors` and records `full_session_total: 74`, `future_reference_total: 7`, `satisfied_history_reference_total: 4`, and `activation_record_total: 85`. Serialization separates `[S100, S101]`, `[S102, ..., S108]`, and `[S1.9, S1.10, S2.4, S8.10]`.

`planning_gate.selected_ids` derives only the first two exact required successors under `horizon_ceiling: 2`, with `contracts_required: true` and `approval_required: true`. It supplies no route, criteria, decisions, Modules, Tasks, readiness, or approval. `S100` and `S101` enter the candidate only after separate complete planning and approval.

Keep `openspec/changes/migrate-control-tower-plan-zones/migration/proof/verify-import-order.mjs` unchanged as the incremental byte-prefix guard through imported Session 72. The separate final verifier authenticates historical terminal fragments and imported-consumer edges; validates the assignment-to-lineage mapping proof; deep-compares lineage canonical future fields with candidate references; derives the horizon; and proves exact IDs, 74/7/4 counts, order, uniqueness, kind, successor preservation, affected dependency rewrites, and mutation rejection.

```text
strict Radar decode -> generic locator/identity/graph safety -> Session-only projections
raw assignment proof -> reviewed lineage transformation -> canonical candidate comparison
72-prefix proof + approved S100/S101 -> exact final partition -> candidate-tree gate
```

### Revertible implementation groups and TDD

| Group | Exact repository-relative mutation paths | RED then GREEN | Budget / rollback |
|---|---|---|---|
| R1 contract | `agent-workflows/tools/radar/plan.go`; `agent-workflows/tools/radar/check.go`; `agent-workflows/tools/radar/reference_contract_test.go` (new file) | Generic closed-shape, locator, global-identity, edge, leaf, and cycle tests | 380 authored; revert all three together |
| R2 projections | `agent-workflows/tools/radar/main.go`; `agent-workflows/tools/radar/render.go`; `agent-workflows/tools/radar/reference_projection_test.go` (new file) | Missing-listing and operational-leak tests, then separate listing with unchanged Session projections | 250 authored; revert all three together |
| P1 final proof | `openspec/changes/migrate-control-tower-plan-zones/migration/proof/verify-activation-partition.mjs` (new file); `openspec/changes/migrate-control-tower-plan-zones/migration/proof/verify-activation-partition.test.mjs` (new file) | Fragment/mapping/74-7-4/order/horizon mutation fixtures, then exact final fixture | 390 authored; revert both together |
| D1 references | `openspec/changes/migrate-control-tower-plan-zones/migration/lineage.yaml`; `openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml` | P1 fails at 72/0/0, then references/counts pass while the planning gate remains red | 320 authored; revert only reference/count ledger additions |
| D2 planning | `openspec/changes/migrate-control-tower-plan-zones/migration/lineage.yaml`; `openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml` | Gate rejects absent contracts; each separately approved full Session then passes ordinary Radar and P1 | ≤400 per Session append; revert each append independently |
| G1 final gate | No mutation; run the exact P1 proof/test above plus Radar check/status/zonas/two renders against the candidate tree | Existing mutation fixtures and immutable-tree equality must pass | 0 authored; rollback is not to activate |

Each executable change keeps code and its focused test in one ≤400-line group. Source-mutating formatters run before GREEN/readback. Order is R1 → R2 → P1 → D1 → separately plan and approve D2 → G1. No group activates, stages, commits, pushes, or mutates canonical paths.

### Traceability, accounting, and risks

| Proposal/spec contract | Design owner |
|---|---|
| 74/7/4, exact horizon and nine successor facts | lineage ledger plus final lineage-aware verifier |
| immutable historical evidence and imported-only edge | terminal-fragment proof plus preserved imported-consumer provenance |
| no operational semantics; separate status/render listing | Session-only APIs plus R2 negative tests |
| immutable prefix, transformation accountability, final exactness | unchanged prefix proof, mapping review/proof, and P1 |

Rejected: mandatory historical delivery OIDs; raw-Markdown semantic equality or runtime normalization; candidate prose as authority; Radar migration ID/count/order allowlists; optional-field unions; materializing `S102`–`S108`; and reference Sessions with a special status.

This amendment occupies `design.md:534-641`: 108 content lines and 109 authored additions including its separator, within the 120-line allowance. With the approved 172-line specification revision and at least 55 lines reserved for tasks/progress, planning totals 336/400 and leaves 64 lines; if measured accounting disagrees, later bookkeeping must split without compressing this contract.

Risks are off-by-one fragment bounds, an unaudited display-to-canonical mapping, operational leakage, or premature S100/S101 materialization. Dual line/byte bounds plus hashes, independent mapping proof, negative projection tests, and the explicit planning gate fail closed. All previous archive, deterministic zero-warning proof, C07 technical-evidence, C09-only `final_package_identity`, atomic activation, and rollback obligations remain intact.

## Key Learnings

- Immutable source evidence can authenticate heterogeneous history without inventing one delivery representation.
- Raw authority and canonical migration data require an explicit, reviewed transformation boundary.
- Generic structural validation and migration-specific exactness belong to different verifiers.

## Unit-2 Plan 9 reconciliation

This section is the active count contract: 73 imported Sessions plus `S100` and `S101` yield 75 full Sessions, seven future references, four historical references, and 86 records. It supersedes every 72/74/85 count in the Unit 1 baseline above.

Use `master@e6b7e673f671e6bba30f9a600bf0333a1cd90af2` only as C07's private logical parent. Overlay the migration artifacts, serialize S9.9 then S9.10 then S9.6, and preserve S9.10's four-path attempt only as non-imported historical evidence. No C07/C08 package identity is created.
