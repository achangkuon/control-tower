# Design: append the G1-compatible S101 migration contract

## Decision

Author and later insert one complete-at-`full-sdd`-depth `S101` mapping into the dormant migration candidate. The mapping uses `ruta.propuesta: full-sdd` and exactly `modulos: []`, as required by `agent-workflows/tools/radar/check.go:514-524`.

This design governs only construction, insertion, structural validation, rollback, and G1 handoff of that migration-data block. It does not define or implement a future runtime API, return shape, error-string mapping, file decomposition, test decomposition, Module, or Task. Those choices remain for S101's post-activation `full-sdd` execution.

## Complete at full-sdd route depth

The candidate mapping is complete when all of the following are present and validated:

- exact identity, result, Zone, dependency, Cimientos, resource claims, and replacement lineage;
- immutable assignment and migration-lineage authority;
- resolved product decisions, each with resolution, authority, falsifier, and the applicable discarded choice;
- binary future-outcome criteria that preserve approved ownership and policy boundaries without prescribing runtime mechanics;
- proposed route authority plus the kickoff revalidation's result, immutable Git base, and Engram provenance;
- exactly `modulos: []`.

An empty technical decomposition is not an omission for this route. It is the canonical `full-sdd` depth: future Modules and Tasks are authored only after migration activation.

## Ownership and deferred detail

| Boundary | Owner | Contract preserved now |
|---|---|---|
| Optional `planning.prepare_through` schema declaration | `S100`, Zone `contratos` | S101 does not own or redesign schema. |
| Policy and Jornada resolution | `S101`, Zone `capacidades` | Preserve only the approved high-level outcomes. |
| Continuation consumption and literal removal | `S102`, Zone `entrega` | Keep S102 as a future-successor reference only. |
| Assignment and dispatch | Main | Authority remains unchanged. |

The preserved future outcomes are: opaque `TAREAS`; `horizon_ceiling` equal to `2` and counted in Sessions; a restrictive unresolved result named `CT_POLICY_UNRESOLVED` for absent, malformed, invalid, or contradictory policy; and unchanged Main authority. The exact mechanism remains deferred.

## Exact candidate block

Insert the following mapping without semantic modification:

```yaml
  - id: S101
    zona: capacidades
    resultado: "Resolución de política: prepare_through opaco y horizon_ceiling salen de la política resuelta"
    autoridad: "Identity, result, zona, dependency, cimientos, and replacement lineage are copied from migration/lineage.yaml successors[S101], whose approved assignment source is immutable commit 43130ad40af06f3ed05671000719217bee74f0a5 at agent-workflows/ASIGNACION-24-SESIONES.md; predecessor S5.14 and its replacement edge remain recorded in migration/lineage.yaml archived_originals and migration/sessions/plan-5.yaml. Product boundaries and route depth are approved by openspec/changes/s101-policy-resolution/proposal.md rev2, specs/policy-resolution/spec.md rev2, and correction 10540. Kickoff route provenance is Engram 10536."
    depende_de: [S100]
    cimientos: []
    recurso: []
    reemplaza: [S5.14]
    criterios:
      - "After migration activation, S101's full-sdd execution proves that valid declared policy resolves prepare_through as the opaque value TAREAS and horizon_ceiling as 2 counted in Sessions."
      - "After migration activation, absent, malformed, invalid, or contradictory policy produces restrictive planning values with resolved false, the named result CT_POLICY_UNRESOLVED, and a non-empty stable reason."
      - "S100 remains the sole owner of the optional prepare_through schema declaration, S101 remains the owner of policy and Jornada resolution, and S102 remains the owner of continuation consumption and literal removal."
      - "No S101-owned consumer recreates or interprets the TAREAS literal, and no Module count is accepted as the horizon_ceiling unit."
      - "Main remains the sole assignment and dispatch authority; S101 grants no assignment, dispatch, continuation, delivery, Tower, Herdr, database, or merge authority."
      - "Future S101 runtime design, Modules, Tasks, interfaces, implementation, and tests are approved only through a new post-activation execution of this Session's full-sdd route."
    decisiones:
      - tipo: resuelta
        pregunta: "Which successor owns schema declaration, policy and Jornada resolution, and continuation consumption?"
        resolucion: "S100 owns schema declaration, S101 owns policy and Jornada resolution, and future S102 owns continuation consumption and literal removal."
        autoridad: "Immutable successor lineage in migration/lineage.yaml, assignment commit 43130ad40af06f3ed05671000719217bee74f0a5, and approved proposal/specification rev2."
        clase: expansion-de-alcance
        falsificador: "S101 changes schema or continuation ownership, or S102 is materialized in the current two-Session horizon."
        descartadas:
          - opcion: "Materialize schema, resolution, and continuation as one S101 contract."
            razon: "Rejected because it erases the approved S100/S101/S102 ownership and lineage boundaries."
      - tipo: resuelta
        pregunta: "Which planning values and unit are fixed before future runtime design?"
        resolucion: "prepare_through is the opaque value TAREAS; horizon_ceiling is 2 and counts Sessions, never Modules."
        autoridad: "Approved proposal/specification rev2, Engram 10536, and the canonical delivery-policy authority referenced there."
        clase: contrato-visible
        falsificador: "The future outcome interprets or recreates TAREAS downstream, uses a ceiling other than 2, or counts Modules."
        descartadas:
          - opcion: "Let future runtime design choose another planning depth, ceiling, or counting unit."
            razon: "Rejected because those product values and Session-count semantics are already approved."
      - tipo: resuelta
        pregunta: "What product outcome is required when policy is absent, malformed, invalid, or contradictory?"
        resolucion: "Resolution remains restrictive with resolved false, named result CT_POLICY_UNRESOLVED, restrictive planning values, and a non-empty stable reason."
        autoridad: "Approved proposal/specification rev2 and canonical fail-closed delivery-policy authority."
        clase: contrato-visible
        falsificador: "Any listed policy failure becomes permissive, reports resolved true, omits CT_POLICY_UNRESOLVED, or has no stable named reason."
        descartadas:
          - opcion: "Permit a missing or invalid policy to inherit a permissive result."
            razon: "Rejected because it violates the approved fail-closed boundary."
      - tipo: resuelta
        pregunta: "Does S101 change assignment or dispatch authority?"
        resolucion: "No. Main remains the sole assignment and dispatch authority; S101 only owns future policy and Jornada resolution."
        autoridad: "Approved proposal/specification rev2, Engram 10536, and the existing Main authority boundary."
        clase: seguridad-y-permisos
        falsificador: "A non-Main actor gains assignment or dispatch authority from S101."
        descartadas:
          - opcion: "Allow policy or Jornada resolution to assign or dispatch work."
            razon: "Rejected because resolution is not an authority grant."
      - tipo: resuelta
        pregunta: "At what depth is S101 complete in the migration candidate?"
        resolucion: "S101 uses full-sdd with exactly modulos: []; runtime decomposition is created only by post-activation full-sdd execution."
        autoridad: "agent-workflows/tools/radar/check.go:514-524, approved proposal/specification rev2, and route-depth correction Engram 10540."
        clase: migracion-o-perdida-de-datos
        falsificador: "The candidate uses another route, contains any Module or Task, or treats empty modulos as an incomplete contract."
        descartadas:
          - opcion: "Embed future runtime Modules and Tasks in the migration candidate."
            razon: "Rejected because Radar forbids Modules for full-sdd and migration activation must precede runtime decomposition."
    ruta:
      propuesta: full-sdd
      autoridad: "Approved S101 proposal/specification rev2 and Radar's canonical route-depth contract require full-sdd before the shared policy/Jornada behavior is designed."
      revalidacion:
        resultado: full-sdd
        base: e93ee87e0705bd8e2d0d64b98956e986a633972d
        evidencia: "Engram migration/s101/kickoff observation 10536 records the clean implementer-1 base, migration-only boundary, S100/S101/S102 ownership, and full-sdd revalidation."
    modulos: []
```

The mapping uses only fields accepted by Radar's strict schema. Provenance is carried by `autoridad`, decision authorities, and route revalidation evidence; no unsupported provenance field is introduced.

## Insertion data flow

```text
proposal/spec rev2 + Engram 10536/10540 + immutable lineage
  -> construct the exact S101 mapping above
  -> compare fixed identity and lineage fields with migration/lineage.yaml
  -> insert once after S100 and before references
  -> strict structural readback and partition/identity proof
  -> freeze the unchanged candidate for parent G1
```

### Exact insertion location

Target only:

`openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml`

Insert the contiguous block inside top-level `sesiones`, immediately after the complete `S100` mapping and immediately before top-level `references:`. Do not move or edit S100, any of the 72 imported Session mappings, either reference collection, lineage, proof tooling, runtime, tests, or canonical planning files.

## Structural readback and identity checks

### Before insertion

1. Read the complete candidate bytes and retain an exact rollback copy or digest.
2. Strictly parse one YAML document with unique and known fields.
3. Confirm 73 full Sessions: the exact ordered 72 imported-ID prefix followed by `S100`.
4. Confirm zero full `S101` records and one future `S102` reference with dependency `[S101]`.
5. Confirm seven future references exactly `S102` through `S108` and four satisfied-history references exactly `S1.9`, `S1.10`, `S2.4`, and `S8.10`.
6. Confirm `S100` is the last Session immediately before `references:`.

### After insertion

1. Reparse the complete candidate as one strict YAML document; reject duplicate or unknown keys.
2. Confirm the only byte addition to existing candidate data is one contiguous S101 mapping at the specified boundary.
3. Confirm exactly 74 full Sessions, seven future references, and four satisfied-history references: 85 records total.
4. Confirm the ordered full-Session identities are the unchanged 72 imported IDs, then `S100`, then `S101`; every pre-existing Session body remains byte-identical.
5. Compare S101's `resultado`, `zona`, `depende_de`, `cimientos`, and `reemplaza` to `migration/lineage.yaml` at the value level and require exact equality.
6. Confirm S101 has `recurso: []`, all five resolved decisions are complete, all six criteria are non-empty and binary, and route proposal/revalidation both equal `full-sdd` with the exact base and provenance above.
7. Confirm S101 contains exactly `modulos: []`; reject any Module or Task child. This directly satisfies `checkProfundidad` in `agent-workflows/tools/radar/check.go:514-524`.
8. Confirm S102 remains only a future-successor reference dependent on S101 and that no S102 full Session exists.
9. Confirm no imported ID, imported lineage, reference identity, dependency, Cimiento, replacement edge, or ordering changed.
10. Confirm the append is below 400 authored changed lines and that the candidate plan is the only existing migration-data path changed by apply.

Any failed check stops handoff. Do not compensate by changing Radar, lineage, references, proof tooling, runtime, tests, parent migration records, or the canonical plan.

## Authored-line budget and review boundary

The candidate block is forecast at 90-140 authored lines and MUST remain below the 400-line review cap. It is one independently reviewable and revertible migration-data append. The design and task artifacts are planning evidence, not part of the candidate append count. Generated evidence remains part of complete candidate identity even when excluded from authored-line accounting.

## Rollback

Before apply, rollback affects only this change's SDD artifacts. After insertion and before activation, rollback removes the single contiguous S101 mapping and restores the exact saved candidate bytes and 73/7/4 checkpoint. It leaves S100, all 72 imported Sessions, S102-S108, satisfied-history references, lineage, proof tooling, runtime, tests, Tower, Herdr, database state, and validation rules unchanged.

If structural validation or G1 fails, stop before C06-C09. Revert or correct only the bounded S101 append.

## G1 handoff

Apply ends after the append and structural readback; it does not run or bypass G1. The handoff to parent G1 contains:

- the frozen candidate identity and exact S101 block identity;
- successful 74/7/4 count and ordered-ID readback;
- exact lineage comparison and proof that S102 remains a future reference;
- proof of `full-sdd` plus literal empty `modulos`;
- authored-line count and changed-path boundary;
- rollback checkpoint.

G1 remains read-only. Against the same frozen candidate, it runs the existing activation-partition proof and focused proof test, Radar `check`, `status`, and `zonas`, and two renders whose bytes must be identical. G1 must report zero errors and zero warnings and preserve the exact 74/7/4 partition before C06-C09 can proceed. S101 apply neither activates the migration nor starts future runtime work.

## Traceability

| Requirement | Design evidence |
|---|---|
| Migration-data append only | Decision, insertion boundary, and non-goals |
| Complete full-sdd depth | Completion checklist and exact YAML |
| Empty technical decomposition | `modulos: []` plus Radar readback |
| Stable identity and lineage | Exact fields, authority string, and before/after identity checks |
| Closed high-level outcomes | Criteria and five resolved decisions |
| No runtime predesign | Deferred-detail boundary and absent runtime interfaces/Modules/Tasks |
| Exact 74/7/4 partition | Before/after count and ordered-identity checks |
| S102 deferred | Ownership table and future-reference checks |
| Reviewability and rollback | Authored-line budget and exact-byte rollback |
| G1 ordering | Read-only handoff contract |

## Risks

- **Candidate drift:** a copied identity or lineage value could diverge. Control: value-level comparison against immutable lineage plus byte-preservation of all existing records.
- **Route-depth regression:** future decomposition could leak into the candidate. Control: require literal `modulos: []` and fail on any child Module or Task.
- **Premature runtime commitment:** criteria could be mistaken for an API design. Control: criteria state outcomes and ownership only; all runtime mechanics remain explicitly deferred.
- **Horizon expansion:** S102 could be materialized early. Control: preserve the exact seven future references and reject any full S102 record.
- **Late candidate mutation:** G1 could verify different bytes. Control: hand off one frozen candidate identity and require all G1 checks against it.

No human decision is open. The corrected proposal/specification, Engram 10540, and Radar's active route-depth validator resolve the earlier contradiction.
