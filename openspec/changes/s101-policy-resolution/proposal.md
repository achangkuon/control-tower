# Proposal: append the route-correct S101 migration contract

## Decision

Complete migration preparation by appending `S101` as the second and final fully materialized successor inside the approved two-Session horizon.

This `s101-policy-resolution` change is limited to migration data. Its apply work appends one complete `S101` Session contract to the dormant candidate at `openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml` and validates that append. It does not implement policy resolution, Jornada behavior, continuation behavior, Tower runtime, database behavior, or delivery.

Because `S101` uses `ruta.propuesta: full-sdd`, its complete candidate contract MUST declare `modulos: []`. Radar enforces this route-depth rule at `agent-workflows/tools/radar/check.go:514-524`; `G1` rejects a candidate that violates it. Future runtime Modules and Tasks are created only after migration activation, when `S101` enters its declared `full-sdd` route.

## Intent

The dormant migration candidate currently has 73 full Sessions, seven future-successor references, and four satisfied-history references. `S101` is the deliberate missing full Session required to reach the approved 74/7/4 partition before `G1`.

The immediate outcome is a complete, reviewable, binary-verifiable migration contract for `S101`. “Complete” at `full-sdd` depth means that identity, product result, Zone, authority, dependencies, Cimientos, resource claims, replacement lineage, resolved decisions, binary acceptance criteria, route and revalidation evidence, and provenance are present while technical decomposition remains intentionally empty.

The future product outcome remains bounded at a high level: after activation, `S101` will make policy and Jornada resolution produce trustworthy planning values without downstream code recreating policy literals. Exact runtime interfaces, Modules, Tasks, and implementation structure are intentionally deferred to that future `full-sdd` execution.

## Candidate S101 contract

The append preserves these approved bindings:

| Field | Binding value |
|---|---|
| ID | `S101` |
| Result | `Resolución de política: prepare_through opaco y horizon_ceiling salen de la política resuelta` |
| Zone | `capacidades` |
| Depends on | `[S100]` |
| Cimientos | `[]` |
| Resource claims | `[]` |
| Replaces | `[S5.14]` |
| Proposed route | `full-sdd` |
| Kickoff revalidation | `full-sdd`, with immutable Git base and Engram `10536` evidence |
| Technical decomposition | `modulos: []` |

The contract also includes:

- the immutable assignment and migration-lineage authority for its identity and ownership;
- the approved split in which `S100` owns schema, `S101` owns policy/Jornada resolution, and `S102` owns continuation;
- all resolved decisions with authority and falsifiers;
- binary acceptance criteria for the future product outcome and unchanged authority boundaries;
- provenance linking the imported predecessor, replacement edge, current proposal, and kickoff revalidation.

`S100` is already present in candidate data and is the planning dependency for `S101`. Its runtime work is not required before migration activation. `S102` remains a future-successor reference dependent on `S101` and is not materialized within this horizon.

## Product rules already decided

These rules are closed and must be represented in the candidate contract without predesigning the future runtime:

1. `S100` owns the optional schema declaration for `planning.prepare_through`; `S101` must not change schema.
2. `S101` owns future policy and Jornada resolution in Zone `capacidades`.
3. `S102` owns continuation consumption and removal of continuation literals; it remains deferred.
4. The only allowed declared `prepare_through` value is `TAREAS`, and consumers treat the resolved value as opaque.
5. `horizon_ceiling` counts Sessions, not Modules, and the approved ceiling is `2` Sessions.
6. Absent, malformed, invalid, or contradictory policy must produce a restrictive result with `resolved: false`, code `CT_POLICY_UNRESOLVED`, the restrictive planning values, and a non-empty stable named reason.
7. Main retains sole assignment and dispatch authority. `S101` grants no authority to another caller or component.
8. Migration append, validation, `G1`, and activation happen before future runtime implementation.
9. A `full-sdd` candidate Session has `modulos: []`; its later SDD artifacts create the runtime decomposition after activation.

## Scope

### Included now

- Correct this proposal and the downstream SDD planning so they define only a safe migration-data append.
- Preserve the exact `S101` identity, result, Zone, dependency, empty Cimientos and resources, replacement edge, authority, and provenance.
- Define the resolved decisions and binary acceptance criteria needed for the complete candidate contract.
- Preserve proposed and revalidated `full-sdd` route evidence.
- Require `modulos: []` in the candidate contract.
- Append `S101` exactly once to the dormant candidate during apply.
- Validate the append against the exact 74/7/4 partition and existing `G1` sequence.

The specification, design, and tasks produced by this change describe how to append, validate, and if necessary revert this migration record. They MUST NOT serve as future runtime Modules or Tasks.

### Future outcome boundaries

After migration activation, a separate execution of the declared `S101` `full-sdd` route may design and implement runtime behavior within these fixed boundaries:

- schema declaration remains owned by `S100`;
- policy and Jornada resolution remain owned by `S101`;
- continuation remains owned by `S102`;
- `prepare_through` resolves to opaque `TAREAS`;
- the ceiling is `2` Sessions;
- unresolved policy produces the named fail-closed `CT_POLICY_UNRESOLVED` result;
- Main authority and existing security floors remain unchanged.

No exact future API, file decomposition, test decomposition, Module, or Task is approved by this proposal.

### Affected areas

| Area | Effect in this change |
|---|---|
| `openspec/changes/s101-policy-resolution/` | Proposal, specification, design, tasks, and evidence for the migration append only |
| Dormant migration candidate | One `S101` Session mapping appended during apply |
| Migration lineage and provenance | Read-only authority used to verify exact bindings |
| Radar and activation proof | Read-only validators; no tool or proof changes |
| Runtime and tests | No changes; future work after activation |
| Canonical plan, roadmap, Tower, Herdr, and DB | No changes |

## Non-goals

- Defining or implementing exact future runtime APIs, data shapes, Modules, Tasks, or test cases.
- Adding any Module or Task to the candidate `S101` contract.
- Implementing or testing `S100`, `S101`, or `S102` runtime behavior now.
- Modifying schema owned by `S100` or continuation owned by `S102`.
- Materializing `S102` or any successor beyond the approved two-Session horizon.
- Changing identity, lineage, Zone ownership, policy values, Session-count semantics, Main authority, security floors, or delivery authority.
- Editing migration lineage, imported mappings, partition definitions, proof tooling, parent migration records, canonical `openspec/plan.yaml`, or generated `openspec/ROADMAP.md`.
- Running or bypassing `G1`, `C06`, `C07`, `C08`, or `C09` as part of proposal correction.
- Creating commits, pushing, opening a PR, launching Tower or Herdr, or mutating runtime or database state.

## Authority and traceability

| Authority | What it fixes |
|---|---|
| Engram `10534` | `S101` is the current migration priority; migration completes before runtime implementation. |
| Engram `10536` | Planning-only boundary, exact candidate target, `full-sdd` kickoff revalidation, and ownership split across `S100`/`S101`/`S102`. |
| Engram `10540` | Correct route depth: a complete `full-sdd` candidate Session has no Modules. |
| `agent-workflows/tools/radar/check.go:514-524` | Canonical validator rule requiring `modulos: []` for `ruta.propuesta: full-sdd`. |
| `migration/lineage.yaml` | Stable identity, exact result, Zone `capacidades`, dependency `[S100]`, empty Cimientos, replacement `[S5.14]`, and successor order. |
| Existing migration contract | Exact 74/7/4 partition, dormant-candidate discipline, `G1`, and later `C06`–`C09` ordering. |
| Candidate `S100` contract | Schema ownership and transfer of runtime resolution responsibility to `S101`. |
| Canonical delivery-policy authority | `TAREAS`, ceiling `2` Sessions, named fail-closed behavior, and unchanged Main authority. |

No human decision is open. The route-depth correction is derivable from canonical Radar behavior and the already approved migration-before-runtime order.

## Compatibility and impact

- No runtime behavior changes during this migration-data change.
- Existing policy compatibility remains a future `S100`/`S101` concern and is not altered here.
- Stable IDs and lineage remain unchanged: `S101` is not renumbered, it replaces `S5.14`, and future `S102` continues to depend on it.
- After apply, the candidate contains exactly 74 full Sessions, seven future-successor references, and four satisfied-history references.
- `G1` then validates the complete dormant candidate without mutation. Only a passing `G1` allows the existing `C06`–`C09` sequence to continue toward proof, reproduction, activation, and authorized delivery.
- Future implementers receive product boundaries and binary outcomes, not a premature technical decomposition. Their runtime Modules and Tasks are authored through `full-sdd` after activation.

## Forecast

| Artifact or mutation | Forecast authored changed lines | Boundary |
|---|---:|---|
| Corrected proposal | 150–220 | One passive planning artifact |
| Corrected specification | 80–140 | Migration append requirements and scenarios only |
| Corrected design | 80–140 | Safe insertion, validation, and rollback only |
| Corrected tasks | 50–90 | Migration append and evidence actions only |
| Candidate `S101` append | 55–100 | Complete contract with `modulos: []`, below 400 lines |
| Apply/verify evidence | 30–70 | Separate evidence artifacts |

The candidate append is the only mutation to existing migration data. Removing premature runtime decomposition reduces both the append size and review burden.

## Risks and controls

| Risk | Product impact | Control |
|---|---|---|
| Candidate includes Modules or Tasks | Radar and `G1` reject the migration. | Require literal `modulos: []` and validate route depth before handoff. |
| Runtime design leaks into migration work | Migration activation becomes coupled to unactivated behavior and may encode stale interfaces. | Keep this change's spec/design/tasks limited to append and validation; defer runtime decomposition to post-activation `full-sdd`. |
| `S101` duplicates `S100` or `S102` scope | Ownership becomes ambiguous and future work is double-counted. | Preserve schema → policy/Jornada → continuation ownership as `S100` → `S101` → `S102`. |
| Product criteria become too vague after removing Modules | Future SDD could drift from approved behavior. | Keep binary boundaries for `TAREAS`, ceiling `2` Sessions, `CT_POLICY_UNRESOLVED`, fail-closed handling, and unchanged Main authority. |
| Candidate identity or lineage drifts | The activation proof no longer represents the approved contract. | Compare every canonical binding and provenance source before `G1`. |
| `S102` is materialized early | The approved horizon is exceeded. | Preserve all seven future references and keep `S102` deferred. |
| `G1` is bypassed | An invalid candidate could reach activation. | Preserve append → validation → `G1` → `C06`–`C09` ordering exactly. |

## Rollback

Before candidate apply, rollback consists only of reverting this change's SDD artifacts; migration data and runtime remain unchanged.

After append but before activation, rollback removes only the contiguous `S101` mapping and restores the exact previous 73/7/4 candidate bytes. It must leave `S100`, `S102`, lineage, imported Sessions, references, proof tooling, runtime, and tests unchanged.

If validation or `G1` fails, stop before `C06`–`C09`. Correct or revert only the bounded candidate append; do not compensate by changing Radar, runtime code, proof rules, or unrelated migration records.

## Binary success criteria

- [ ] The candidate `S101` contract has the exact ID, result, Zone `capacidades`, dependency `[S100]`, empty Cimientos, empty resource claims, and replacement `[S5.14]`.
- [ ] It contains complete authority, provenance, resolved decisions with falsifiers, binary acceptance criteria, and proposed plus kickoff-revalidated `full-sdd` route evidence.
- [ ] It declares exactly `modulos: []` and contains no candidate runtime Module or Task decomposition.
- [ ] This change's specification, design, and tasks cover only safe append, structural/semantic validation, evidence, and rollback of the migration record.
- [ ] The contract preserves the future outcome boundaries: `S100` schema, `S101` policy/Jornada resolution, `S102` continuation, opaque `TAREAS`, ceiling `2` Sessions, named fail-closed `CT_POLICY_UNRESOLVED`, and unchanged Main authority.
- [ ] No exact future runtime API, Module, Task, or test decomposition is approved before activation.
- [ ] Apply appends `S101` exactly once and changes no other existing migration, runtime, test, plan, Tower, Herdr, or database surface.
- [ ] The resulting dormant candidate contains exactly 74 full Sessions, seven future-successor references, and four satisfied-history references.
- [ ] `S102` remains a future-successor reference dependent on `S101`; it is not materialized.
- [ ] Radar route-depth validation and the existing activation-partition proof accept the candidate with no S101 structural failure.
- [ ] `G1` remains the mandatory next complete-candidate verification and is not run or bypassed by this proposal correction.
- [ ] `C06`–`C09` remain unchanged and unavailable until `G1` passes.
- [ ] The candidate append stays below 400 authored changed lines.
- [ ] Future S101 runtime implementation starts only after migration activation by entering the declared `full-sdd` route.

## Next step

Correct the specification so it normatively describes only the migration-data append and validation contract, requires `modulos: []`, and leaves future runtime decomposition to post-activation `full-sdd` execution.
