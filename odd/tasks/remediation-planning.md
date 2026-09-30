# Manual remediation planning

Technical execution record only. Product scope, Session identities, dependencies and calculated status belong exclusively to `openspec/plan.yaml` and Radar. This is not a second product backlog.

## Goal and authority

Record human-approved general remediation planning and a final read-only V1 review. Keep finishing V1 first; do not prepare V2 or legacy repairs.

The maintainer explicitly requested: “Creemos / planificquemos las sesiones mecesarias para general y para V1”. The approved final V1 review is investigation after delivery, not permission for speculative repairs.

The maintainer clarified that `planning.horizon_ceiling: 2` belongs only to the deferred autonomous V2 loop. It does not cap human-directed manual planning. Preserve the numeric value and runtime code; clarify the canonical prose instead.

## Authorized surfaces and constraints

- `AGENTS.md`: clarify the autonomous/manual planning boundary only.
- `openspec/plan.yaml`: native records for the approved planning scope.
- `openspec/ROADMAP.md`: generated exclusively with installed Radar.
- This execution record: continuity and verification, never product authority.
- Preserve all previous Sessions, priorities and the existing V1 installer/benchmark/README scope.
- Incomplete Encargos name real missing decisions, interfaces or evidence, never an invented manual horizon limit.
- Read-only investigations authorize no deletions, dependency upgrades, product fixes or real installation changes. Their eventual closure needs legitimate integrated Git evidence, not Engram alone.
- Leave concurrent `product/tower/v1/release.mjs` and `product/tower/v1/test/release.test.mjs` untouched.
- No runtime repairs, SDD, worker assignment, automatic dispatch or bypass of the delivery gate.

## Work unit

- [ ] P1 — Record and validate the manual planning package.
  - Route: delegated bounded writers; multi-file planning, followed by independent verification and parent readback.
  - Content is recorded locally and independently validated. Native review and delivery remain separate.
  - Commit: pending for this package; no remote delivery claimed.

## Observed verification

This is planning/configuration documentation. No runtime implementation RED/GREEN cycle is claimed; future implementation retains its configured TDD requirements.

- Installed `radar check -C /home/emili/projects/control-tower/Main`: 0 errors, 63 warnings. No baseline warning-equivalence assertion is made.
- Installed `radar render -C /home/emili/projects/control-tower/Main`: succeeded; generated view regenerated after the parent corrected a prose reference.
- Installed `radar status --json -C /home/emili/projects/control-tower/Main`: construction V1 remains the active priority; new records received no premature execution admission.
- `git diff --check`: passed, including parent readback.
- Deterministic Bun/YAML assertions: seven unique new native records; all prior plan data and priority order unchanged; read-only entries have no authorized files or reserved Cimientos; the policy YAML is byte-identical to the starting commit.
- Independent verifier repeated the checks and read the generated view. Initial/final Git status matched, and concurrent release files were neither read as audit evidence nor modified.
- Full implementation suites and future repair tests were not run: no runtime behavior was changed here.

## Continuity and remaining delivery

- Starting and verified HEAD: `f0db260d19f0c0e436973ae673ec75fc8f472871`.
- The prior priority-only commit remains local. Its push was withheld because concurrent untracked implementation files prevent the normal clean-tree gate; never bypass that gate or move other work.
- The seven authoritative records now exist in `openspec/plan.yaml`; do not reconstruct or duplicate their contents in this document.
- The report repair preserves the reproduced same-HEAD failed-suite/cache scope. Cross-HEAD historical display changes are not authorized by that record.
- Native risk assessment could not evaluate the ambient tree because of untracked files; its required independent verification was completed.
- Native review consent/closure is still pending for the final scoped package. Review outcomes do not authorize commit or push.
- Planning and generated artifacts are excluded from the runtime implementation-line budget.
