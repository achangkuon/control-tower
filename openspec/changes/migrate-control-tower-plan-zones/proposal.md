# Proposal: migrate Control Tower planning to Zones without losing history

## Decision

Migrate Control Tower from the duplicated legacy planning corpus to one Radar v3 plan using the approved **full-fidelity history with a bounded planning horizon** policy.

The activation contract contains exactly 85 records:
- 74 full Session records: 72 full-fidelity imported historical Sessions plus the separately planned and approved successors `S100` and `S101`;
- seven typed future-successor references for `S102`–`S108`; and
- four typed immutable satisfied-history references for omitted dependencies `S1.9`, `S1.10`, `S2.4`, and `S8.10`.

The nine approved successor outcomes and their exact Zone, dependencies, Cimientos, and `reemplaza` authority remain preserved across the two materialized Sessions and seven references, with no work loss or double count. `S100` and `S101` are selected derivably from the exact order of `lineage.required_successors` plus `planning.horizon_ceiling: 2`; selection does not grant execution readiness, which still requires separate planning and approval.

This scope supersedes the earlier prerequisite that all nine successors be fully materialized, which would have produced 81 full Session records despite the approved two-Session planning horizon and without enough authority to invent complete future contracts. It does not relax full-fidelity preservation of the 72 imported Sessions or any final zero-error, equivalence, determinism, or activation-proof gate.

Before any migration data is prepared, Radar will gain the narrowly bounded reusable contracts required for immutably proven imported rows and typed non-executable references. Imported rows preserve legacy Session, Module, and Task IDs and may keep territory pending only while an escalating decision derives `BLOQUEADO` at the acceptance criteria or first Module. References are a separate product concept: they never claim execution readiness, completion, queue position, ownership, seat, or capacity. These contracts add no status and are unavailable as an ordinary execution-authority bypass.

`openspec/plan.yaml` and `openspec/ROADMAP.md` MUST remain absent from the active worktree and every pre-activation commit. They become active together only after equivalence has passed against an immutable candidate Git tree. Legacy views remain authoritative until that same atomic activation boundary.

## Intent

Control Tower currently describes planning state across multiple handwritten indexes, manifests, decision records, and per-Plan `STATUS.md` files. This makes one product fact appear in several places, allows those copies to disagree, and leaves parallel ownership dependent on prose rather than a validated file partition.

The migration should make planning state trustworthy and computable without erasing the history that explains current work. After activation:

- `openspec/plan.yaml` is the sole editable planning source;
- `openspec/ROADMAP.md` is a deterministic generated view and is never hand-edited;
- Radar derives status, queues, progress, capacity, and ownership from one plan plus immutable Git evidence;
- every tracked file belongs to exactly one Zone or an explicit Cimiento rule;
- the embedded method implementation under `agent-workflows/` has an explicit owner through the `metodo` Zone;
- maintainers can trace every migrated Session back to its legacy source and stable ID;
- imported rows that cannot yet declare honest territory remain representable without fabricated scheduling data, while newly authored Sessions continue to require the normal Radar contract.

## Product outcome and visible behavior

### Before activation

- The legacy planning corpus remains the live authority.
- `openspec/plan.yaml` does not exist.
- `openspec/ROADMAP.md` does not exist.
- No generated target view is exposed as current state.
- Any migration candidate uses noncanonical paths and cannot be mistaken for the live plan.
- The reusable Radar compatibility is implemented and tested as a separate commit/review work unit of at most 400 authored changed lines before any migration data is prepared.
- The compatibility remains provenance-gated: ordinary newly authored Sessions cannot use legacy IDs or pending territory.

### At activation

One final activation commit changes the planning contract as a single boundary:

1. the exact proven candidate becomes `openspec/plan.yaml`;
2. the exact proven Radar output becomes `openspec/ROADMAP.md` with its generated/do-not-edit notice;
3. the active documentation-close contract and repository guidance switch to the new planning source;
4. legacy generated views move to the historical read-only archive;
5. C09 computes and commit-message-attests the sole `final_package_identity` after activation bytes and receipts are fixed.

The parent of this commit has no canonical plan or generated ROADMAP and still uses the legacy views. The activation commit has the complete new contract. There is no supported mixed state.

### After activation

- Readers see one roadmap grouped by Zone rather than a global queue spread across Plans.
- Session state and progress are derived rather than copied from legacy status labels.
- Existing Session references remain valid because identifiers are not renumbered.
- `S100` and `S101` are full Session contracts only after separate planning and approval; horizon selection alone does not make them ready.
- `S102`–`S108` remain explicit typed future-successor references and never enter execution, readiness, capacity, or completion calculations.
- All nine successors preserve the exact approved outcome, Zone, dependencies, Cimientos, and `reemplaza`; the originals are archived only after lineage and affected active dependencies point to the applicable materialized Session or reference.
- The four satisfied-history references remain immutable, provenance-gated, and usable only by proven imported legacy Sessions.
- `S7.1` remains terminal read-only verification in the `entrega` Zone against one immutable candidate identity.
- `S2.10` and `S9.2` remain visibly `BLOQUEADO` only when their immutably proven imported rows carry an unresolved escalating decision that reaches the acceptance criteria or first Module.
- A territory-pending imported Session is absent from Zone queues, seats, ownership, and capacity, and cannot fabricate a Zone, path, route, or Cimiento merely to pass validation.
- Once validated territory and path ownership are supplied, pending territory ends without changing the legacy Session ID.
- Newly authored, non-migrated Sessions cannot use the compatibility path.
- Retired legacy views remain available as history but are no longer active or editable planning sources.

## Scope

### Included

1. **Reusable Radar migration and reference contracts**
   - Extend only the Radar schema, checker, renderer, and status derivation required to represent immutably proven imported legacy rows and typed references.
   - Keep future-successor and satisfied-history references structurally distinct from full Sessions and from each other.
   - Exclude all references from execution readiness, queues, capacity, ownership, seats, and completion credit.
   - Extend lineage checks and the verifier/activation proof so reference identity, type, provenance, target, and non-executable behavior are binary-gated.
   - Keep the existing seven statuses. Pending territory is compatibility metadata, not an authored or derived eighth status; the unresolved escalating decision remains the source of `BLOQUEADO`.
   - Preserve imported legacy Session, Module, and Task IDs behind an explicit provenance marker bound to immutable source evidence identifying the imported row.
   - Permit pending territory only when that proven imported Session has an unresolved `escala` decision whose reach is `criterios` or `primer-modulo`.
   - Exclude every territory-pending row from Zone queues, seats, ownership, and capacity calculations.
   - Reject fabricated Zone, path, route, Cimiento, ownership, or capacity data.
   - Allow validated Zone and path ownership to resolve pending territory later while preserving the legacy ID.
   - Reject legacy-ID and pending-territory compatibility for newly authored or otherwise unproven Sessions.
   - Implement and test this contract as a separate independently reviewable commit/review work unit of at most 400 authored changed lines before preparing migration data.

2. **Complete legacy inventory**
   - Inventory exactly 72 enumerated Sessions in the approved Plans 0–12 corpus, including completed, open, blocked, deferred, replaced, and delivered work.
   - Preserve each imported historical Session exactly once under its existing identifier and as a full Session contract.
   - Preserve scope, dependencies, authority, decisions, binary acceptance criteria, route evidence, delivery evidence, outstanding work, and replacement lineage where represented by the target schema.
   - Record every intentional transformation in a source-to-target equivalence ledger.

3. **Approved open-work mapping and planning horizon**
   - Use `agent-workflows/ASIGNACION-24-SESIONES.md` as the later approved authority for the 24 open Sessions; its exact assignments and ordered `S100`–`S108` lineage supersede the earlier stale unchecked item in `agent-workflows/PLANO-CONTROL-TOWER.md`.
   - Assign work by its declared file territory, not by its former Plan.
   - Preserve the four original replaced Sessions and all nine approved successor outcomes, Zones, dependencies, Cimientos, and `reemplaza` relationships without renumbering.
   - Derive horizon selection from the exact `lineage.required_successors` order and `planning.horizon_ceiling: 2`.
   - Materialize only `S100` and `S101`, each only after separate planning and approval; selection is not execution readiness.
   - Preserve `S102`–`S108` as seven typed future-successor references and `S1.9`, `S1.10`, `S2.4`, and `S8.10` as four unique typed immutable satisfied-history references.
   - Prove that the split representation loses no approved work, grants no duplicate completion credit, and preserves exact assignment authority.

4. **Full tracked-repository partition**
   - Revalidate the partition against the tracked files of one immutable candidate snapshot rather than relying on the historical count of 441 files.
   - Add a dedicated `metodo` Zone owning the embedded `agent-workflows/` subtree.
   - Require zero orphaned tracked files and zero unintended Zone overlaps.
   - Keep Cimientos as explicit shared-terrain rules and exact per-Session reservations; they cannot hide a genuine Zone overlap.

5. **Canonical target data and generated view**
   - Build the complete Radar v3 plan at a noncanonical migration path during preparation.
   - Validate it with Radar before promotion.
   - Generate the candidate ROADMAP from that plan; never author or repair the generated view manually.
   - Promote the proven bytes to the canonical paths only at activation.

6. **Historical archive**
   - Create a version-controlled, clearly historical, read-only archive under `openspec/archive/legacy-planning/`.
   - Preserve byte-faithful retired legacy views and non-representable narrative.
   - Include an inventory that records each archived source path, content identity, classification, and target mapping or reason it remains archive-only.
   - Keep historical references intact when they describe past behavior; do not mass-edit history merely to remove legacy path names.

7. **Close-gate and guidance cutover**
   - Verify that the effective documentation-close behavior recognizes `openspec/plan.yaml` and supports the honest “nothing to record” path for deliveries that close no planned work.
   - Keep `.doc-guard.json` policy semantics for direct-push delivery.
   - Reconcile active repository guidance with the canonical plan contract at activation, without rewriting immutable historical evidence.

8. **Immutable evidence and delivery**
   - Replace mutable branch claims with full commit OIDs, Git tree OIDs, and content identities.
   - Keep pre-activation work local on `feat/s0.4-plan-zones-migration`.
   - Respect the maximum of 400 authored changed lines per independently verifiable, revertible direct commit.
   - Deliver by direct commit/push to `master`, without a PR, only after the activation candidate passes all gates.

## Non-goals

- Any Radar code, schema, checking, rendering, status, lineage, verifier, or runtime change beyond the approved provenance-gated legacy compatibility and typed-reference contracts.
- Adding, renaming, translating, or combining any of the existing seven statuses; changing decision classes or the Zone/Cimiento model.
- Implementing Tower runtime resource acquisition, stale-claim recovery, planning-seat dispatch, Horizon integration, terminal freeze machinery, or `S9.9`; those remain later work.
- Migrating ServiTask or any other product.
- Renumbering legacy Session, Module, or Task IDs to match a newer visual convention.
- Reopening the approved 24-Session assignments or the `S100`–`S108` replacement decisions.
- Treating the old Plan grouping as Zone ownership.
- Copying legacy status labels into authored target state; Radar must derive state from dependencies, decisions, attempts, and Git evidence.
- Putting non-representable narrative into generated `openspec/ROADMAP.md`.
- Editing generated output by hand.
- Creating a second active status file, master index, or manually maintained roadmap.
- Removing historical references solely to make searches for legacy names clean.
- Committing, pushing, creating a staging plan, generating a canonical ROADMAP, or retiring legacy views during this proposal phase.

## Source precedence and business rules

1. The maintainer-approved `full-fidelity` resolution in `preproposal.md` is binding.
2. The supplemental maintainer resolutions authorize only two bounded Radar concepts: provenance-gated compatibility for imported legacy rows and typed non-executable references for the approved horizon model. They authorize no unrelated Radar or runtime behavior.
3. Compatibility requires an explicit migration marker bound to immutable evidence that identifies the imported source row. A label without that evidence is insufficient.
4. Pending territory is valid only for a proven imported Session whose unresolved escalating decision derives `BLOQUEADO` at `criterios` or `primer-modulo`; pending territory does not create a new status or independently cause blocking.
5. A territory-pending row claims no Zone, path, route, Cimiento, ownership, queue position, seat, or capacity. Radar must reject fabricated values instead of making the row schedulable.
6. Supplying validated Zone and path ownership ends pending territory without changing the imported legacy ID. Newly authored, non-migrated Sessions must satisfy the normal Radar contract and are rejected if they request compatibility.
7. Later approved assignments and replacement lineage in `ASIGNACION-24-SESIONES.md` override earlier stale unchecked planning notes.
8. Git evidence overrides mutable prose for delivery and ancestry facts.
9. Stable IDs are identity, not reading order; migration never renumbers an existing ID.
10. A legacy value that Radar now derives is compared for equivalence but is not copied as authored state.
11. Any contradiction among active authorities must be resolved and recorded before activation; it cannot be silently selected or hidden in generated output.
12. An unrepresentable field is archived and mapped, never discarded.
13. `agent-workflows/` is part of the product's tracked territory and belongs to the dedicated `metodo` Zone.
14. The canonical plan, generated ROADMAP, close-gate behavior, repository guidance, and legacy retirement activate together or not at all.
15. The activation target is exactly 74 full Sessions, seven future-successor references, and four satisfied-history references: 85 records total, not 81 fully materialized Sessions.
16. `S100` and `S101` are selected only by exact `lineage.required_successors` order plus ceiling two; selection never supplies route, criteria, decisions, Tasks, approval, or readiness.
17. Future-successor references preserve approved lineage facts but grant no execution or completion semantics.
18. Satisfied-history references are immutable and usable only by provenance-proven imported legacy Sessions; ordinary work cannot depend on them for execution authority.

## Immutable equivalence evidence

Equivalence is a binary activation gate, not a visual comparison. The migration must produce a versioned evidence manifest containing:

| Evidence | Requirement |
|---|---|
| Source identity | Full immutable commit OID for the legacy source snapshot and the exact inventory of authoritative source files. |
| C07 technical proof subject | `radar_execution_subject` is a private synthetic commit/tree locator with a logical precursor, materialization recipe, and exact path/mode/blob inputs. It is non-product, non-activating, and not a package or candidate identity; versioned C07 receipts are excluded from it. C08 reproduces that recipe/content/evidence and declares readiness without a package OID. C09 alone computes and commit-message-attests the sole `final_package_identity`. |
| Content identity | Blob OIDs or cryptographic hashes for the canonical plan candidate, generated ROADMAP candidate, and every archived source. |
| Session ledger | One row per each of the 72 imported historical Sessions plus `S100` and `S101`, showing stable ID, source, target, preserved fields, transformations, compatibility provenance where used, territory state, and archive-only data. No omissions or duplicates. |
| Compatibility proof | Tests and evidence show that only immutably proven imported rows preserve legacy Session/Module/Task IDs; pending territory requires a blocking escalating decision, contributes no queue/seat/ownership/capacity, fabricates no territory contract, resolves without changing the legacy ID, and is rejected for newly authored Sessions. The compatibility change is a separate commit/review work unit of at most 400 authored changed lines that precedes all migration data. |
| Reference ledger | Exactly seven typed future-successor references and four unique immutable satisfied-history references, each proving identity, type, target, provenance where required, and exclusion from readiness, execution, ownership, queues, seats, capacity, completion, and ordinary authority. |
| Successor preservation | Explicit proof that all nine approved outcomes, Zones, dependencies, Cimientos, `reemplaza` relationships, originals, and affected dependency edges are preserved once across materialized Sessions and references. |
| Partition proof | Tracked-file inventory at the candidate tree with zero orphans, zero unintended overlaps, explicit Cimiento carve-outs, and complete `metodo` ownership for `agent-workflows/`. |
| Derived-state comparison | Radar-derived state, queues, progress, and capacity compared with authoritative legacy facts; every difference is explained by approved transformation or immutable Git evidence. |
| Radar proof | Successful `radar check`, `radar status`, `radar zonas`, and deterministic `radar render` against the same materialized candidate tree. |
| Determinism proof | A repeated render over identical plan and Git evidence produces byte-identical output. |
| Close-gate proof | The candidate accepts a real plan-data closure and the honest “nothing to record” case, while retaining direct-push policy. |

The candidate tree may be assembled and materialized in an isolated proof location using noncanonical preparation artifacts. The active migration worktree and all reachable pre-activation commits still keep `openspec/plan.yaml` and `openspec/ROADMAP.md` absent.

C07 records reproducible technical evidence only. C08 must reproduce its exact recipe, content, and evidence without computing a package OID. Any changed byte, tracked-file change, regenerated output, archive change, or guidance change invalidates that evidence. C09 computes `final_package_identity` only after those bytes and receipts are fixed.

## Atomic activation boundary

The activation boundary is one direct commit whose tree is the C09-attested sole `final_package_identity`.

The first implementation prerequisite is the reusable Radar compatibility contract, implemented and tested in its own commit/review work unit of at most 400 authored changed lines. No migration inventory rows, mapping data, candidate plan data, or other migration data may be prepared until that contract passes its tests. This prerequisite may change only the Radar surfaces needed by the approved compatibility and does not expose canonical plan paths.

Later pre-activation commits may prepare inventory, archive copies, mapping data, and noncanonical candidate artifacts in reviewable units, but they must not expose either canonical target path or retire the active legacy views. Exact-byte moves and mechanical promotion should keep the final authored delta below the 400-line cap; generated output remains part of candidate identity even when it is not counted as authored prose.

Activation is allowed only when all of these are true:

- the reusable compatibility contract was implemented and tested before migration data, with no unrelated Radar expansion;
- every compatibility-marked row is tied to immutable migration provenance and every territory-pending row satisfies the blocking-decision gate and scheduling exclusions;
- C07 technical subject evidence and C08 reproduction readiness are recorded without a package identity;
- all 72 imported historical Sessions are accounted for exactly once as full Session contracts;
- only separately planned and approved `S100` and `S101` are materialized as successor Sessions;
- exactly seven future-successor references and four satisfied-history references pass their non-executable and provenance gates;
- all stable IDs and approved replacement lineage are preserved without work loss or double count;
- the candidate partition covers the then-current tracked repository, including `metodo`;
- all Radar and deterministic-render checks pass against the same candidate tree;
- close-gate and repository-guidance behavior are coherent with the new source;
- archived legacy material is complete and readable;
- C09 alone computes and attests the final staged tree as `final_package_identity`.

No partial activation commit may be pushed. A plan without its proven generated view, a generated view without its plan, or either one while legacy views still claim active authority is a failed boundary.

## Rollout

1. Freeze and record the immutable legacy source snapshot.
2. Implement and test the reusable Radar compatibility contract in one separate commit/review work unit of at most 400 authored changed lines. Confirm that it is provenance-gated, preserves legacy IDs, enforces the blocking-decision predicate, excludes pending territory from ownership and scheduling, supports later territory resolution without ID change, rejects newly authored Sessions, and changes no status vocabulary.
3. Do not prepare migration data unless step 2 passes. Then build the source inventory for all 72 imported Sessions and the equivalence/reference ledgers, including immutable provenance for each compatibility-marked or satisfied-history row.
4. Prepare the full-fidelity target at noncanonical paths with 74 full Sessions, seven future-successor references, and four satisfied-history references, in sequential independently reviewable commits of at most 400 authored changed lines.
5. Revalidate all tracked-file ownership, adding the `metodo` Zone for `agent-workflows/`; territory-pending rows claim no ownership and do not weaken partition proof.
6. Generate the noncanonical ROADMAP candidate from the candidate plan, with territory-pending rows absent from queues, seats, ownership, and capacity.
7. Assemble the complete activation candidate as an immutable Git tree and run the full equivalence gate against that exact tree.
8. Preserve C07 as technical non-product evidence and C08 without a package OID; C09 alone computes and commit-message-attests `final_package_identity` after final activation bytes and receipts are fixed.
9. Create the single activation commit, perform structural readback, and only then deliver it directly to `master` and push. No PR is created.
10. After delivery, verify canonical readback, Radar determinism, compatibility behavior, legacy archive readability, direct-push close behavior, and remote commit ancestry.

## Rollback

The atomic boundary makes rollback one operation.

- **Before migration data exists:** if the compatibility contract fails or proves over-broad, revert its separate commit/review work unit. No migration data may depend on it yet.
- **Before activation delivery:** do not push a candidate that fails any gate. Restore the worktree to the activation commit's parent under maintainer-controlled Git recovery; the legacy views remain authoritative and the canonical target paths remain absent. Do not remove compatibility while prepared migration data depends on it unless that data is discarded first.
- **After delivery:** revert the activation commit with a new conventional commit and push it directly to `master`. The revert must remove the canonical plan and generated ROADMAP, restore the legacy views and prior active guidance/close behavior, and leave the immutable evidence recoverable from Git history. The reusable compatibility may be reverted only after no active or prepared imported row depends on it.
- Never repair a failed activation by hand-editing `openspec/ROADMAP.md` or by keeping only half of the new contract active.
- After correcting the cause, build and prove a new immutable candidate tree; prior equivalence evidence cannot authorize changed bytes.

Rollback is required if post-delivery readback differs from the proven tree, Radar no longer reproduces the view, a Session or lineage edge is missing, tracked files are orphaned or overlapping, the close gate rejects legitimate work, or legacy history is inaccessible.

## Affected areas

| Area | Expected impact |
|---|---|
| `openspec/plans/` legacy corpus | Remains active until activation; then its retired generated views and non-representable narrative move to historical archive. Decision history remains preserved. |
| `openspec/plan.yaml` | New sole editable planning source, absent until activation. |
| `openspec/ROADMAP.md` | New deterministic generated view, absent until activation and never hand-edited. |
| `openspec/archive/legacy-planning/` | New read-only historical package with byte identities and mappings. |
| `agent-workflows/tools/radar/` | Receives only the reusable provenance-gated legacy compatibility and typed-reference support across schema, checker, render, status, lineage, and verifier/activation-proof surfaces, plus focused tests; the seven statuses and unrelated runtime behavior remain unchanged. |
| `agent-workflows/` | Entire embedded subtree is included in partition proof as the dedicated `metodo` Zone; migration authority documents remain evidence, not automatically canonical plan data. |
| `AGENTS.md` and effective documentation-close behavior | Cut over atomically to the target planning contract where reconciliation is still needed. |
| `.doc-guard.json` | Retains `solo` direct-push semantics; candidate behavior is verified against the new plan-data close contract. |
| Engram | Stores SDD artifacts and later migration/verification summaries, but does not replace repository evidence. |

## Risks and mitigations

| Risk | Product impact | Mitigation |
|---|---|---|
| A legacy Session is omitted or duplicated | History, progress, or future work silently disappears. | Exact source inventory plus one-row-per-Session ledger; omissions and duplicates fail activation. |
| Stable IDs are normalized or renumbered | Existing references, dependencies, memories, and delivery evidence break. | Preserve imported Session/Module/Task IDs byte-for-byte behind immutable provenance and verify referential closure. |
| Compatibility is accepted without immutable migration provenance | Newly authored work can bypass the canonical ID and territory contract. | Require evidence identifying the imported source row and reject compatibility when provenance is absent, mutable, or does not match. |
| Pending territory leaks into scheduling or ownership | Radar advertises a queue position or parallel capacity that has no safe file boundary. | Exclude territory-pending rows from Zone queues, seats, ownership, and capacity in both validation and tests. |
| Compatibility grows into a general Radar exception | The target contract becomes ambiguous and future Sessions can evade normal safeguards. | Limit the first separate change to the approved contract, cap it at 400 authored changed lines, and fail any unrelated schema/runtime expansion. |
| Migration data is prepared before compatibility is proven | Data shape starts depending on an unverified contract and may need destructive rework. | Land and test the separate compatibility work unit first; migration data is a later gate. |
| More than two successors are materialized | Detailed future planning exceeds the approved horizon and invents unsupported contracts. | Materialize only the first two exact ordered successors after separate approval; encode the remaining seven as non-executable references. |
| A reference affects readiness, capacity, completion, or ordinary authority | Future or historical placeholders become executable work or distort progress. | Enforce distinct types, provenance gates, and negative checker/status/render/verifier assertions for every forbidden effect. |
| The historical 441-file partition is reused after subtree integration | New tracked files, especially `agent-workflows/`, become orphaned or misowned. | Recompute from the immutable candidate tree and require dedicated `metodo` coverage. |
| Legacy prose conflicts with Git | Migrated delivery or status appears complete when it is not. | Git ancestry and immutable object IDs win; each discrepancy is recorded. |
| Canonical files appear early | Users and tooling may treat an unproven plan as live. | Canonical paths forbidden before the single activation commit. |
| Plan and ROADMAP activate separately | The editable source and visible state disagree. | One candidate tree and one atomic activation commit. |
| Legacy views are deleted instead of archived | Non-representable decisions and context are lost. | Byte-faithful archive with hashes, source paths, and mapping reasons. |
| Close-gate behavior changes too early or too late | Legitimate direct-push work cannot close, or closes without documentation. | Include close behavior in candidate proof and switch it at the same boundary. |
| A late edit invalidates evidence | The delivered bytes were never actually verified. | Tree-OID equality immediately before commit; any difference forces a complete rerun. |
| Large migration overwhelms review | Errors hide in an unauditable change. | Sequential commits capped at 400 authored changed lines; final activation is a mechanical promotion of already reviewed bytes. |
| Blocked imported Sessions receive invented ownership | Radar advertises unsafe capacity and hides unresolved territory. | Permit pending territory only with immutable provenance and an escalating decision that blocks at criteria or the first Module; exclude the row from scheduling and fail rather than fabricate. |
| Territory resolution changes the legacy ID | References split between the pending and resolved representations. | Resolve by supplying validated Zone and path ownership on the same imported row; verify the ID is unchanged. |

## Success criteria

The change is successful only when all criteria are true:

- [ ] `openspec/plan.yaml` and `openspec/ROADMAP.md` were absent from every pre-activation commit and appeared together at activation.
- [ ] Exactly 72 imported historical Sessions appear once as full canonical Session contracts under stable identities; only non-representable fields and narrative may remain archive-only, with explicit mappings.
- [ ] The bounded Radar compatibility and typed-reference contracts are implemented and tested in independently verifiable units of at most 400 authored changed lines, with no unrelated Radar or runtime expansion; legacy compatibility still precedes migration data.
- [ ] Radar retains exactly the existing seven statuses; pending territory is not a status and `BLOQUEADO` remains derived from the unresolved escalating decision.
- [ ] Every imported legacy Session, Module, and Task ID is unchanged, including dotted IDs, and each compatibility use is bound to immutable source evidence identifying the imported row.
- [ ] `S100` and `S101` alone are materialized after separate planning and approval; exact-order horizon selection grants no readiness.
- [ ] `S102`–`S108` exist exactly once as seven typed future-successor references with no execution, readiness, capacity, or completion effect.
- [ ] `S1.9`, `S1.10`, `S2.4`, and `S8.10` exist exactly once as immutable satisfied-history references usable only by provenance-proven imported legacy Sessions.
- [ ] All nine successors preserve the approved outcome, Zone, dependencies, Cimientos, `reemplaza`, and affected dependency rewrites without loss or double count.
- [ ] The 24 open Sessions follow the later approved assignment authority; the stale earlier unchecked item does not reopen scope.
- [ ] Every territory-pending imported Session has an unresolved escalating decision reaching `criterios` or `primer-modulo`, claims no Zone/path/route/Cimiento, and appears in no queue, seat, ownership, or capacity result.
- [ ] `S2.10` and `S9.2` satisfy that contract and remain non-executable without fabricated territory or capacity.
- [ ] Supplying validated Zone and path ownership ends pending territory while preserving the same legacy Session ID.
- [ ] A newly authored, non-migrated Session is rejected if it uses a legacy ID or requests pending-territory compatibility.
- [ ] The current tracked repository is partitioned with zero orphans and zero unintended overlaps.
- [ ] The entire embedded `agent-workflows/` subtree is represented by the dedicated `metodo` Zone, subject only to explicit valid Cimiento carve-outs.
- [ ] Cimientos and per-Session reservations are explicit and do not conceal Zone overlap.
- [ ] Delivery evidence, dependencies, decisions, criteria, authority, route evidence, outstanding work, and replacement lineage—including the pending `S12.9` source-commit and revision-2-versus-neighbor-file decisions—are preserved or explicitly transformed in the equivalence ledger.
- [ ] Non-representable narrative and retired legacy views are readable in the historical archive with source paths and content identities.
- [ ] Radar schema, checker, status, render, lineage, and verifier/activation proof pass against one immutable candidate tree, including all negative non-executable reference assertions.
- [ ] Repeated rendering produces byte-identical `openspec/ROADMAP.md` content with a do-not-edit notice.
- [ ] C09 alone computes and commit-message-attests `final_package_identity` after final activation bytes and receipts are fixed.
- [ ] Active repository guidance, direct-push policy, and documentation-close behavior agree with the new canonical source after activation.
- [ ] A rollback restores the complete legacy-active state without leaving a half-activated plan contract.
- [ ] No implementation from later Tower phases or other products is included.

## Key Learnings

- The planning horizon limits detailed future contracts, not approved lineage preservation.
- Typed references preserve identity and provenance only when every execution, readiness, capacity, and completion effect is explicitly forbidden.
- Full-fidelity history and bounded future planning coexist when record classes, counts, authority, and proof obligations are explicit.

## Next step

Amend the specification with binary requirements for the 74/7/4 activation contract, the exact ordered horizon selection, both typed reference classes, and their negative execution semantics. Preserve full-fidelity history, the `S12.9` decisions, equivalence and reference ledgers, activation and zero-error proof gates, archive and rollback contracts, and every prior safeguard. The specification phase must create no code, tests, migration data, or canonical planning files; design follows only after the corrected specification.
## C05.2 S12.3/S12.4 migration-only formalization

Human approval 10433 permits exactly `S12.3` and `S12.4` to remain imported with
`territorio_pendiente: true` while their provisional formalization is parked. It does
not grant territory, route, Cimientos, reservations, ownership, execution, capacity,
or resolution of either source contract. The original S12.4 M12.4.2 hold remains
unresolved and distinct; no general compatibility default or other imported row changes.

## C05.2 zero-Module design-tasks compatibility

Human approval 10469 authorizes only an immutable-provenance imported `design-tasks`
Session whose frozen source explicitly defers its whole Module/Task decomposition to
`session-plan`. The row may retain zero Modules/Tasks with a complete unresolved
`escala` reaching `primer-modulo`; it remains non-executable and has no territory,
route revalidation, Cimientos, ownership, capacity, successor identity, or invented
future decomposition. S12.7 is the migration example. At kickoff/design, concrete
Modules/Tasks and a current-HEAD route revalidation are required before work can resume.

## C05.2 S12.9 route-bound extension

C05.2-S12.9-full-sdd-deferment-compat extends this exact-signature contract: S12.5/S12.7
remain `design-tasks`; S12.9's immutable signature permits only `full-sdd`. It remains
non-executable with zero Modules/Tasks and a complete unresolved escalation at
`primer-modulo`, preserving its authorial `source_commit` and revision-2-versus-neighbor-file decisions.
