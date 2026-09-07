# Pre-proposal decision — migrate-control-tower-plan-zones

Status: resolved by maintainer — `full-fidelity`

## Confirmed

- Fase A is closed and the implementation host is Pi-first.
- Fase B migrates planning authority without exposing `openspec/plan.yaml` until equivalence is complete.
- Migration work remains local on `feat/s0.4-plan-zones-migration` until final activation.
- Every authored commit is limited to 400 changed lines; generated Radar output is still part of candidate identity.
- Existing Session identifiers are preserved. Approved replacements `S100`–`S108` remain explicit lineage rather than renumbering.
- Legacy views remain active until final equivalence and activation.
- OpenCode is parked and is not an activation gate.

## Decision required

Choose the target migration policy for the canonical plan.

### `full-fidelity`

Partition the complete tracked repository, including the newly embedded `agent-workflows/` subtree as a dedicated `metodo` Zone. Preserve every enumerated legacy Session and its existing identifier, delivery evidence, dependency, decision, and replacement lineage. Keep non-representable narrative and the retired legacy views in a clearly historical, read-only archive after equivalence. Update active doc-guard/repository guidance in the final activation boundary and use immutable commit evidence rather than mutable branch claims.

Consequence: highest traceability and honest progress continuity; largest migration, requiring multiple local reviewable commits before one complete activation. Recommended.

### `active-only`

Partition the complete tracked repository, including a `metodo` Zone, but migrate only currently open Sessions plus approved replacements. Preserve completed work only in the historical legacy archive.

Consequence: smaller migration, but the canonical plan loses direct completed-Session history and its progress denominator changes. This is a visible product-contract change.

### `stop`

Do not continue after exploration.

Consequence: no immediate migration risk, but Control Tower remains on duplicated legacy planning and Fase B stays blocked.

## Resolution

The maintainer selected `full-fidelity` before proposal.

The proposal and every downstream artifact MUST therefore:

- preserve every enumerated legacy Session and its stable identifier;
- preserve delivery evidence, dependencies, decisions, and replacement lineage;
- represent the embedded `agent-workflows/` subtree as the dedicated `metodo` Zone;
- archive, rather than discard, non-representable narrative and retired legacy views;
- activate `plan.yaml`, generated `ROADMAP.md`, doc-guard, and repository guidance only after full equivalence;
- replace mutable branch claims with immutable commit/tree evidence.

## Authority class and contamination

Class: visible product contract; migration or data loss; scope expansion; contradictory dependencies or evidence.

Contaminates: proposal, target partition, Session inventory, equivalence criteria, legacy retirement, doc-guard activation, final delivery, and every later Fase B artifact.

Checkpoint satisfied: before proposal and before creating any migration staging plan.

## Supplemental maintainer resolution — reusable legacy compatibility

After design proved that current Radar v3 rejects active dotted legacy IDs and Sessions with intentionally unknown territory, the maintainer approved a reusable migration-compatibility contract.

This contract MUST:

- keep the existing seven-status vocabulary; compatibility is not an eighth status;
- preserve legacy Session, Module, and Task identifiers under an explicit migration provenance marker;
- allow an imported Session to declare territory pending only when immutable source evidence identifies the imported row and an unresolved escalating decision derives `BLOQUEADO` at criteria or the first Module;
- exclude a territory-pending Session from Zone queues, seat assignment, and capacity;
- prohibit Zone, path, route, Cimiento, or capacity fabrication;
- let territory-pending end once validated Zone and path ownership are supplied, while preserving the legacy identifier;
- reject this compatibility for newly authored Sessions without proven migration provenance;
- be implemented and tested as a separate reviewable Radar contract work unit before migration data is prepared.

The maintainer approved this reusable behavior as a visible product-contract expansion. It supersedes the earlier proposal/spec non-goal that prohibited every Radar schema or validation change, but it authorizes no unrelated Radar/runtime expansion.
