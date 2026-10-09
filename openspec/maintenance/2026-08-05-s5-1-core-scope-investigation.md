# S5.1 core scope conflict is confirmed and requires candidate correction

The 2026-08-05 investigation found a real conflict between technical dependencies and the sealed S5.1 Area. The current S5.1 candidate cannot proceed to verification unchanged. Its `core.mjs` and `test/recovery.test.mjs` changes implement schema-v6 runtime compatibility that S5.1 does not own, while the approved M5.1.3 contract requires authority to enter through an injected `trustedBindingProvider` instead of a new reader in `core.mjs`.

## Outcome

| Finding | Result |
|---|---|
| Current S5.1 acceptance criteria | **27**, not 20 |
| `4bd641b` change to `core.mjs` | **+190 / -48 = 238 changed lines** |
| Design-relative minimum under current P6-G tests | **approximately 209 / 238 changed lines** |
| Reducible under current P6-G tests | **29 / 238 changed lines** |
| Formal S5.1 Area verdict for every `core.mjs` hunk | **Outside Area and prohibited** |
| Formal S5.1 Area verdict for `test/recovery.test.mjs` additions | **Outside Area and prohibited** |
| Can the current candidate satisfy every S5.1 criterion without correction? | **No** |
| Dependency direction | The schema-v6 runtime compatibility work was created by S5.1's binding design; S5.1 did not consume a pre-existing v6 runtime |

The count is exact: the current checklist in `openspec/plans/plan-5/STATUS.md:146-172` contains 27 items. This is seven more than the stated count of 20 and three more than the preliminary count of 24.

## Maintainer decision, 2026-08-05

The maintainer accepted the factual investigation and set the following boundary:

1. S5.1 does **not** own schema-v6 runtime compatibility.
2. `core.mjs` and `test/recovery.test.mjs` remain prohibited for S5.1.
3. A future re-seal of M5.1.3 may add only these three paths to its existing Area:
   - `package.json`
   - `bun.lock`
   - `.opencode/plugins/tower-spike.js`
4. The corrected M5.1.3 must follow its approved authority contract: initialize the plugin with an injected `trustedBindingProvider`. It must not add a new `core.mjs` reader.
5. Schema-v6 runtime work must be enumerated as a separate Sesión after a bounded consumer and dependency map is complete.
6. The whole roadmap must not be remapped. S4.1 continues to depend on corrected and integrated S5.1 unless the bounded map proves an additional dependency edge.
7. Agente Soporte must hand the bounded decomposition to `planificador-granular`.
8. This maintenance document intentionally does not update the plan graph, `STATUS.md`, or `master-index.md`.

The current candidate must be corrected before S5.1 verification. This record does not prescribe implementation beyond the approved path boundary and injected-provider contract. It also does not claim that S5.1 has already been re-sealed or that the new Sesión has already been enumerated.

## Authority and commit provenance

| Evidence | Value |
|---|---|
| Investigated branch | `feat/plan-5/s5-1-candidate-authorization` |
| Investigated HEAD | `9e7bb433d56ee3c165083cfd95e24756fc5df27c` |
| Comparison base | `origin/master@da68163baed7ec5f1f03aa295287ed120d182d13` |
| Candidate commits | `6efae35`, `20f19c5`, `4bd641b`, `9e7bb43` |
| Parent of `4bd641b` | `20f19c5babbb85f28ab0169c135b7e2061f52d55` |
| Commit touching `core.mjs` | Only `4bd641b` |
| `4bd641b` files | `core.mjs`, `main-store/store.mjs`, `test/main-store.test.mjs`, `test/recovery.test.mjs` |
| S5.1 authority | `openspec/plans/plan-5/STATUS.md:25-172` |
| Explicit prohibition | `core.mjs` is listed in `Prohibido`; criterion 27 requires that no prohibited path be touched |

`4bd641b` is a mixed commit. It contains the out-of-Area schema-v6 runtime work and also contains in-Area M5.1.3 Support persistence in `main-store/store.mjs` with its Main-store tests. Reversing the whole commit therefore removes both kinds of work and is not a clean scope separation.

## A. Semantic hunk evidence

The hunk identifiers below refer to the 40 unified hunks in:

```text
git diff 4bd641b^ 4bd641b -- core.mjs
```

Changed-line counts are additions plus deletions.

| Semantic hunk and new-side range | Changed lines | Exact current test or failure evidence | S5.1 criteria | Technical verdict | Formal Area verdict |
|---|---:|---|---|---|---|
| H1-H4, H6: schema-6 DDL, object and manifest map, admin request acceptance, and 5 to 6 migration at `+677`, `+731`, `+762`, `+943`, `+1070` | 77 | `P6-G canonical Main-store composition > migrates and reads only the complete binding for the active canonical Main`. Isolated ablations produced H1 `ReferenceError: MIGRATION_006_SQL`, H2 `ReferenceError: V6_OBJECTS`, and H3/H4/H6 `CT_SCHEMA_INVALID`. | #16-19 and #22 through the current binding design; #26 for full-suite regression | Indispensable in the current design and tests | Prohibited; conflicts with #27 |
| H8: `mainStoreBindingValue`, binding assertion, insertion, validation, and `readValidatedMainStoreBinding` at `+1250` | 54 | First two `P6-G canonical Main-store composition` tests and `malformed v6 canonical binding rejects recovery and rollback before mutation`. H8 ablation fails provisioning with `CT_SCHEMA_INVALID`. | #16-19, #22, and #26 in the current implementation | Indispensable in the current implementation. Production plugin code calls this reader twice, while plugin tests mock it. | Prohibited; the reader also conflicts with the approved injected-provider contract |
| H9-H11: schema-6 Main commit boundary and historical CAS derivation at `+1367`, `+1410`, `+1427` | 15 | `P6-G schema-6 continuation compatibility > replays the exact v6 Main CAS and rejects a mismatched replay without mutation`. Joint ablation fails `continuationBootstrapMain` with `CT_SCHEMA_INVALID`. | #26 only | Indispensable for the current v6 replay test | Prohibited; conflicts with #27 |
| H7: `gateContinuation` accepts and validates v6 at `+1192` | 4 | `runs the shared, activation, and create-to-claim operation families on v6`. Isolated ablation fails at `continuationRegister`. | #26 only | Indispensable | Prohibited; conflicts with #27 |
| H12: future-history detection applies to schema 5 and later at `+1619` | 2 | `v6 records a termination receipt and recovers a CLAIMED handoff`. Ablation later fails `continuationStatus`. | #26 only | Indispensable for current recovery and status coverage | Prohibited; conflicts with #27 |
| H13: historical writer fences admit v6 and preserved-attestation lookup applies to schema 5 and later at `+1770` | 4 | The same P6-G operation and recovery path. Ablation fails during `continuationValidate`. | #26 only | Indispensable for current v6 history validation | Prohibited; conflicts with #27 |
| H14: recovery-disposition validation applies to schema 5 and later at `+2096` | 4 | `v6 recovery history rejects noncanonical source receipts`. Ablation expected `CT_SCHEMA_INVALID` but received `null`. | #26 only | Indispensable security validation | Prohibited; conflicts with #27 |
| H16: schema-6 activation precondition includes delivery-plane counts at `+2396` | 2 | `blocks v6 activation when a queued delivery remains after claimant conflict`. Ablation expected `CT_NOT_QUIESCENT` but received `null`. | #26 only | Indispensable. Without it, activation succeeds incorrectly while work is queued. | Prohibited; conflicts with #27 |
| H17: `continuationActivate` admits and validates v6 at `+2412` | 4 | `runs the shared, activation, and create-to-claim operation families on v6`. Isolated ablation fails at `continuationActivate`. | #26 only | Indispensable | Prohibited; conflicts with #27 |
| H19: `continuationStatus` admits and validates v6 at `+2474` | 4 | `runs the shared, activation, and create-to-claim operation families on v6`. Isolated ablation fails at `continuationStatus`. | #26 only | Indispensable | Prohibited; conflicts with #27 |
| H20-H22: `continuationBootstrapMain` v6 admission, replay boundary, binding insertion, and validation at `+2511`, `+2535`, `+2552` | 10 | Canonical-binding tests, exact-v6-CAS test, and shared-family test. Joint ablation fails at `continuationBootstrapMain`. | #16-19 and #22 in the current implementation; #26 | Indispensable | Prohibited; conflicts with #27 |
| H23-H26: create, validate, publish, and claim v6 admission and validation at `+2582`, `+2740`, `+2824`, `+2916` | 16 | `runs the shared, activation, and create-to-claim operation families on v6`. Each isolated ablation fails at its named function. | #26 only | Indispensable for the current fixture and test | Prohibited; conflicts with #27 |
| H32-H36, H38: recover, termination receipt, begin rollback, rebind admission, rebind binding insertion, and finish rollback at `+3709`, `+3871`, `+4047`, `+4141`, `+4190`, `+4231` | 11 | `v6 records a termination receipt and recovers a CLAIMED handoff`, `v6 begins rollback from canonical Main state`, and `v6 rebinds Main after lease expiry and finishes rollback`. Each isolated ablation fails at its named function; H36 fails `continuationRebindMain`. | #26 only | Indispensable for the current v6 recovery tests | Prohibited; conflicts with #27 |
| H40: `continuationReceive` projects a queued delivery at v6 at `+4436` | 2 | `returns a valid queued v6 delivery and fails closed without delivering a malformed v6 binding`. Ablation returns `{ delivery: null }` instead of the queued delivery. | #26 only | Indispensable | Prohibited; conflicts with #27 |
| H5, H15, H18, H27-H31, H37, H39: target-5 compatibility from v6; duplicate global binding validation; finished-rollback activation; ack, attest, complete, reject, and revise v6 admission; post-rebind and receive duplicate validation at `+1018`, `+2270`, `+2444`, `+3058..3505`, `+4208`, `+4413` | 29 | All were removed together, then `bun test test/recovery.test.mjs -t 'P6-G'` returned **12 pass / 0 fail**. H39 alone also passed the queued and malformed receive test. H37 alone passed rebind and finish. | No current functional criterion or P6-G test requires these paths | Reducible for current acceptance evidence. Runtime symmetry for untested v6 operations is inferred, not proven by current tests. | Prohibited; conflicts with #27 |

### Direct S5.1 tests versus schema-v6 regression tests

With only `core.mjs` reversed and all current non-core S5.1 code and tests retained:

| Command | Result |
|---|---:|
| `bun test test/continuation test/main-store.test.mjs test/contracts test/plugin/tower-spike.test.mjs` | **94 pass / 0 fail** |
| `bun test test/recovery.test.mjs` | **49 pass / 12 fail** |

All 12 failures are the newly added P6-G schema-v6 tests. Direct Candidate, derivation, Main-store, contract, and plugin tests pass without the core diff as tested. That does not prove the production plugin is independent of the core change: the plugin test replaces `../../core.mjs` with a mock, while production code calls `readValidatedMainStoreBinding` before spawning Support and again when rederiving authority.

## B. Minimum subset under the current design

Semantic-hunk ablation establishes this design-relative boundary:

| Required group under current P6-G tests | Changed lines |
|---|---:|
| H1-H4,H6 schema-6 migration and recognition | 77 |
| H8 canonical Main-store binding and reader | 54 |
| H9-H14 CAS, history, and recovery validators, excluding H15 | 25 |
| H7 continuation gate | 4 |
| H16-H17 activation | 6 |
| H19 status | 4 |
| H20-H22 Main bootstrap | 10 |
| H23-H26 create through claim | 16 |
| H32-H36,H38 recovery, rollback, and rebind | 11 |
| H40 receive projection | 2 |
| **Total** | **209** |

The remaining 29 changed lines passed all 12 P6-G tests when removed together.

The 209-line result is proven at semantic-hunk granularity for the current implementation and current tests. It is not a global line-minimal proof. A different design may combine, relocate, or eliminate behavior, and several multi-line hunks were ablated as semantic groups rather than one line at a time.

## C. Binary result

**No.** The current candidate cannot satisfy every current acceptance criterion with the pre-`4bd641b` core behavior.

The decisive evidence is:

1. Whole-core ablation produces 12 failures in `test/recovery.test.mjs`, all in P6-G schema-v6 coverage.
2. Production `plugin/tower-spike.js` calls `tower.readValidatedMainStoreBinding(worktree)` before spawn and again through `rederiveBinding`.
3. That export does not exist before `4bd641b`.
4. The direct S5.1 test set remains green because the plugin test mocks the core reader.

The formal result is independent and equally binding: any S5.1 edit to `core.mjs` violates the declared Area and criterion 27. The current candidate therefore contains a technical dependency that its formal S5.1 authority does not permit.

## D. Dependency direction

**The schema-v6 runtime compatibility work depends on the S5.1 binding design. S5.1 did not depend on a pre-existing v6 runtime.**

The evidence chain is:

1. Before `4bd641b`, runtime schema support ends at v5.
2. `4bd641b` creates v6 with one new table, `ct_main_store_binding`.
3. That table contains the canonical Main and store facts needed by the current M5.1.3 implementation.
4. `9e7bb43` then wires the Support composition root to `tower.readValidatedMainStoreBinding` before `bindMainAuthority` and `createMainStore`.
5. Once that design moves the runtime to schema 6, existing register, activate, status, create, validate, publish, claim, receive, recovery, and rollback paths reject schema 6 unless they are widened.
6. The isolated ablations identify those exact failures.

This direction explains technical necessity. It does not grant S5.1 formal ownership of the resulting runtime work.

## E. Recovery coverage, dependencies, and unexpected findings

### Recovery-test split

`4bd641b` adds 171 lines and 12 P6-G tests to `test/recovery.test.mjs`.

| Test group | Count | Relationship to S5.1 |
|---|---:|---|
| Canonical Main-store binding read and incomplete-binding rejection | 2 | Directly exercise the current M5.1.3 binding design |
| Shared schema-v6 operation-family regression | 1 | Runtime compatibility outside S5.1 subject |
| Schema-v6 continuation compatibility | 3 | Runtime compatibility outside S5.1 subject |
| Schema-v6 recovery, rollback, and rebind regression | 6 | Runtime compatibility outside S5.1 subject |
| **Total** | **12** | **2 S5.1-specific and 10 v6 regressions** |

All 171 lines are formally outside the S5.1 Area. `test/recovery.test.mjs` is not under `test/continuation/**` and is not separately listed in the Area.

### Package and lock findings

`package.json` and `bun.lock` change only in `9e7bb43`, not in `4bd641b`.

| Path | Change | Technical finding | Formal finding before the 2026-08-05 decision |
|---|---:|---|---|
| `package.json` | +2 lines | Adds `@opencode-ai/plugin@1.18.13` and `@opencode-ai/sdk@1.18.13`. Both are used by direct imports in `plugin/tower-spike.js`. | Outside the current sealed Area |
| `bun.lock` | +66 lines | Records the dependency closure, including `effect`, `zod`, `cross-spawn`, and optional msgpack binaries. The footprint is broad, but the diff does not add unrelated application behavior. | Outside the current sealed Area |
| `.opencode/plugins/tower-spike.js` | +1 line | Re-exports `TowerSpikePlugin` as the OpenCode plugin entry point. | Outside the current sealed Area |

The SDK remains a justified direct dependency because project code imports `@opencode-ai/sdk/v2/client` directly, even though `@opencode-ai/plugin` also depends on the SDK.

The maintainer's 2026-08-05 decision approves these three paths for a future M5.1.3 re-seal. This document does not perform that re-seal.

### Authority mismatch

The approved M5.1.3 contract says the plugin receives `trustedBindingProvider` at initialization. The current implementation instead has this effective shape:

```text
TowerSpikePlugin({ directory, serverUrl, worktree })
  -> tower.readValidatedMainStoreBinding(worktree)
  -> bindMainAuthority(...)
  -> createMainStore(...)
```

The plugin does not receive `trustedBindingProvider` in its initialization input. Its test mocks the new core reader, so the test does not verify the authority-declared initialization contract. The corrected candidate must use the maintainer-approved injected-provider boundary and must not retain the new core reader as an S5.1 dependency.

### Mixed-commit finding

The full inverse of `4bd641b` removes `persistSupportProposal` from `main-store/store.mjs` and removes its two Main-store tests. That produces three plugin failures even though the older recovery suite remains green. This proves that `4bd641b` combines:

- in-Area M5.1.3 Support persistence; and
- out-of-Area schema-v6 runtime and recovery work.

The commit boundary therefore does not match the formal S5.1 boundary.

## Verification commands and exact results

The investigation used an independent clone detached at exact `9e7bb43`. It did not share Git metadata with the source worktree. Existing `node_modules` were copied from the source, no dependency installation ran, and no network access was used.

| Command or experiment | Result |
|---|---:|
| `bun test test/continuation test/main-store.test.mjs test/contracts` | **90 pass / 0 fail** baseline |
| `bun test test/plugin/tower-spike.test.mjs test/recovery.test.mjs` | **65 pass / 0 fail** baseline |
| Initial `bun test` in the independent clone | **544 pass / 1 fail** |
| `bun test` after copying the existing `tower.db` bytes into the clone, with `ACTIVE` absent | **545 pass / 0 fail** |
| Full `4bd641b` inverse, relevant S5.1 command | **88 pass / 0 fail** |
| Full `4bd641b` inverse, plugin plus recovery | **50 pass / 3 fail** |
| Core-only inverse, relevant S5.1 plus plugin | **94 pass / 0 fail** |
| Core-only inverse, recovery | **49 pass / 12 fail** |
| Reducible 29-line group removed, `bun test test/recovery.test.mjs -t 'P6-G'` | **12 pass / 0 fail** |

The initial full-suite failure was an environmental precondition at `test/registry/storage.test.mjs:178`: the test expects `.git/control-tower/tower.db` to exist. Copying the already existing source DB bytes into the independent clone satisfied that precondition without creating `.git/control-tower/ACTIVE`.

The harness rejected native `git revert --no-commit 4bd641b` as an ambiguous lifecycle command. The experiment therefore created the inverse patch with `git diff 4bd641b^ 4bd641b --binary` and applied it only inside the independent clone with `git apply -R --3way`. All four files applied cleanly.

## Limitations

- No network access was used.
- No dependency installation was run.
- The full suite was not rerun after each focused ablation. Narrow tests were used after the single clean full baseline, per the bounded checking instruction.
- The 209-line result is semantic-hunk-minimal for the current design and test suite, not a proof over every possible implementation.
- The plugin success test mocks its core binding reader, so it does not prove the production authority path.
- This investigation establishes facts and the accepted scope decision. It does not enumerate the separate schema-v6 Sesión or alter the plan graph.

## Source integrity during investigation

The source worktree remained unchanged throughout the investigation:

| Check | Final value |
|---|---|
| HEAD | `9e7bb433d56ee3c165083cfd95e24756fc5df27c` |
| Branch | `feat/plan-5/s5-1-candidate-authorization` |
| Tracked status | Only the pre-existing unstaged `.gitignore` change |
| Preserved `.gitignore` addition | `# Local Pi runtime state` and `.atl/` |
| `stash@{0}` | `691f417e91cab06716203f26f3282673ecb3dbb1` / `m5-1-3-support-candidate-before-da68163-rebase` |
| Shared Tower marker | Absent at `/home/<usuario>/projects/control-tower/Main/.git/control-tower/ACTIVE` |

No source edit, stage, commit, push, fetch, merge, rebase, stash, reset, clean, OpenSpec write, or `main-store/authority.mjs` write occurred during the read-only investigation.

## Next ownership boundary

The next actions remain intentionally separate from this maintenance record:

1. Agente Soporte produces the bounded consumer and dependency map for schema-v6 runtime work.
2. Agente Soporte hands that bounded decomposition to `planificador-granular`.
3. `planificador-granular` enumerates the separate Sesión and records any proven dependency edge.
4. M5.1.3 is re-sealed later with only the maintainer-approved path additions and injected-provider contract.
5. The corrected candidate is verified only after that authority work is complete.

Until those actions occur, neither the re-seal nor the new Sesión exists as approved plan state.
