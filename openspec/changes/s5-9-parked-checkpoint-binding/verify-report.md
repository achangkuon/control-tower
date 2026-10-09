# Verify Report: S5.9 Parked Checkpoint Binding

## Status

**PASS WITH WARNINGS**

Seven of the eight frozen S5.9 acceptance criteria pass against the exact source
candidate with runtime evidence. Criterion 2 is **PARTIAL**: its falsifier clause
passes with strong runtime proof, but its evidence-preservation clause is
**refuted** — the failed falsifier is no longer retrievable at either location
STATUS names. No CRITICAL implementation defect was found and no correction was
performed.

## Executive summary

- CRITICAL: **0**
- WARNING: **3**
- SUGGESTION: **3**
- Criteria: **7 PASS / 1 PARTIAL / 0 FAIL**
- Full suite at HEAD: **731 pass / 0 fail / 4428 expect() calls / 53 files**, exit `0`.
- The implementation diff touches exactly nine paths, all inside `Área`, none inside `Prohibido`.
- The falsifier is genuinely satisfied by a real runtime path, not by caller assertion.

## Authority and action context

- Change: `s5-9-parked-checkpoint-binding`
- Session: `S5.9`
- Artifact store: `hybrid` (OpenSpec files + Engram)
- Source workspace: `/home/<usuario>/projects/control-tower/Worktrees/s5-9`
- Branch: `work/s5-9-checkpoint-binding`
- Base: `a8d7dde89b7683813ef910d0140ddafda4262001` (`master`)
- HEAD: `754c69888fb9e322c53299af4988e307e72c5e06`
- Implementation commits: `3c3040d` (candidate A) and `754c698` (candidate B)
- Authority: `/home/<usuario>/projects/control-tower/Main/openspec/plans/plan-5/STATUS.md`,
  section "Sesión 5.9 — Binding autoritativo del checkpoint estacionado", including the
  eight "Criterios de aceptación de S5.9", `Área`, and `Prohibido`.
- Verification mode: read-only audit plus real test execution. No implementation file,
  planning artifact, index, commit, push, or PR was mutated. The only write was this report.
- Native Gentle AI SDD dispatcher, attempt lifecycle, and review lifecycle were not invoked
  (temporary suspension block is active).
- Prior lane freeze `Engram #8886` declared a definitive stop before `sdd-verify` at the
  pre-rebase HEAD `a4a39fa`. That stop is superseded by the maintainer's explicit request to
  verify this rebased branch. All nine implementation bytes are unchanged from that freeze.

## Candidate manifest

Recomputed from current bytes.

| Path | Mode | Numstat +/− | SHA-256 |
| --- | --- | ---: | --- |
| `contracts/parked-checkpoint-binding.mjs` | `664` | 43/0 | `b7c4fb4a0f042dc70bd05fee6d85536587a6e9ac458efda7727447bfd34293de` |
| `contracts/schema-registry.mjs` | `664` | 1/1 | `091132d59c312b18cfe870cbaa300089cd7be1b8bd54666bcb77c4426e9cd8a5` |
| `contracts/validate.mjs` | `664` | 4/0 | `72adeb850366232790ea658052ae83e179f6898768a504b626c17925b0bd1982` |
| `main-store/store.mjs` | `664` | 26/1 | `ad005f53e6ef419e80948e4eaa7efe17217bb1b3ffd165024eaa8c5d3352593c` |
| `schemas/parked-checkpoint-binding-v1.schema.json` | `664` | 26/0 | `f0eae4aae35e598e8758351a429e11aa0a70d6d03e4538850ae3e48fa5a57938` |
| `test/contracts/parked-checkpoint-binding.test.mjs` | `664` | 56/0 | `6c735f74759fd32243452d64001f27e8ba7bd75c350c0b42eadee5966ee35cd6` |
| `test/contracts/schema.test.mjs` | `664` | 6/0 | `2291d04d140e13fb9a840e27e3376eac588ba94cc554af5808c183c3f24aae89` |
| `test/fixtures/contracts/schema-cases-v1.json` | `664` | 10/0 | `ea68104c3454452b0553c871903f7bab93358e443d2d13f055cecb7875de0d01` |
| `test/main-store.test.mjs` | `664` | 71/5 | `8bb54df394e62c5514564d18c67b885bf9629143fc0c760ab5cc89193aa92d3b` |

- Entry count: **9**
- Authored total: **250** (Candidate A **147**, Candidate B **103**)
- Ordered manifest SHA-256 (`<mode>\t<sha256>\t<path>`, bytewise path sort):
  `d5257065036663696b02da5f38742c2036ed47b2ace6540d227fd763c5693723`
- All nine digests match the frozen manifest in Engram `#8886`. **No candidate drift.**
- Git index is empty. `git diff --check` on `master...HEAD` is clean.
- `openspec/changes/s5-9-parked-checkpoint-binding/` remains untracked, as expected.

## Verification commands executed

| Command | Result | Exit |
| --- | --- | ---: |
| `bun test` | 731 pass / 0 fail / 4428 expect() calls / 53 files | `0` |
| `bun test test/contracts/parked-checkpoint-binding.test.mjs test/contracts/schema.test.mjs` | 63 pass / 0 fail / 211 expect() calls | `0` |
| `bun test test/main-store.test.mjs` | 54 pass / 0 fail / 339 expect() calls | `0` |
| `bun test test/contracts` | 97 pass / 0 fail / 480 expect() calls | `0` |
| `git diff --check master...HEAD` | clean | `0` |

The two `fatal: Needed a single revision` lines on stderr are pre-existing on `master`,
carry no failing assertion, and do not change the exit code.

## Criterion matrix — the eight "Criterios de aceptación de S5.9"

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Single authoritative binding persisted in Main store between the exact `parked.checkpoint` value, the canonical capture, and the corresponding `reconciled-checkpoint-v1` evidence | **PASS** | Closed shape at `schemas/parked-checkpoint-binding-v1.schema.json:4-26`. Source-derived construction at `contracts/parked-checkpoint-binding.mjs:23-36`: every field is copied from the validated parked decision, capture, or reconciliation; no caller field is accepted. Sealed into the single parking envelope at `main-store/store.mjs:252-256`. Exactly one binding member per parked-decision identity. Runtime: `test/main-store.test.mjs:237-239,249-251` proves the persisted member carries the parked identity, the exact `parked.checkpoint`, the capture identity, the reconciliation identity, and `reconciliation_state: "VALID"`. |
| 2 | On resumption after `S5.11`/`S5.12`, SDD proves before tasks/apply that the real flow supplies producer-owned canonical capture and `VALID` reconciliation; the failed falsifier remains as evidence in the untracked `design.md` (SHA-256 `a349747c…`) and Engram 8604 | **PARTIAL** | **Clause A — PASS.** `openspec/changes/s5-9-parked-checkpoint-binding/design.md:3,27,124-128` carries `FALSIFIER: PASS` with a five-proposition trace, and `tasks.md:3` accepts it before any task row. The trace is confirmed at runtime — see the falsifier section below. **Clause B — REFUTED.** `design.md` now hashes `93e850eb4e3b9bd7db72f6d4f2cad1767fe420bd516e0b27f5204e39dedab1c5`, not `a349747c…`; Engram `#8604` was upserted on the same `topic_key` (`Revisions: 2`) and now holds the reconciled PASS design, not the failed verdict. `design.md:29-33` itself declares the prior artifact **ABSENT** and does not claim preservation. The failed falsifier's verdict text is therefore not retrievable at either location STATUS names. Only its substantive spec-phase finding survives, at Engram `#8602` (`sdd/s5-9-parked-checkpoint-binding/spec-discovery`). |
| 3 | Mismatch of value, digest, repository, base/result, assignment/generation, or reconciliation evidence fails closed without partial mutation | **PASS** | Capture↔reconciliation exact equality across `checkpoint_id`, digest, `project_id`, `assignment_id`, `generation`, `repository_root`, `git_common_dir`, and base/result commit+tree at `contracts/validate.mjs:199-210`. Binding-digest invariant at `contracts/validate.mjs:178-180`. Exact source re-derivation and rejection at `contracts/parked-checkpoint-binding.mjs:38-43`. Store fails closed before any write at `main-store/store.mjs:241-255`; the sole `atomicWrite` happens after every check (`main-store/store.mjs:265-266` → `123-147`). Runtime: fourteen independently re-sealed field mutations plus digest drift, unknown field, and extensions-only substitution all yield `CT_SCHEMA_INVALID` at `test/contracts/parked-checkpoint-binding.test.mjs:36-54`; store-level mismatch and forced pre-commit failure leave no file at `test/main-store.test.mjs:280-292`. |
| 4 | Caller assertion, equivalent text, and a local `S5.5` inference do not substitute canonical evidence | **PASS** | The parking input is closed to exactly five keys at `main-store/store.mjs:239`, so a caller cannot submit `parked_checkpoint_binding` or a `provenance` claim. Live producer origin is proved by module-private brands before anything else at `workspace/checkpoint.mjs:92-94` and `workspace/reconciliation.mjs:54-55`, invoked at `main-store/store.mjs:244-245`. Main never recomputes producer identities/digests; it copies them (`contracts/parked-checkpoint-binding.mjs:23-31`). `parked_checkpoint` is byte-exact string copy — no normalization, no comparison helper. Runtime: `structuredClone`d capture, a caller-supplied `parked_checkpoint_binding: {}`, and a caller-supplied `provenance: {}` are all rejected with no persisted file at `test/main-store.test.mjs:280-288`; a paraphrase-style mutation (`v.parked_checkpoint += " "`) is rejected at `test/contracts/parked-checkpoint-binding.test.mjs:41`. |
| 5 | Byte-identical replay is idempotent; divergent replay produces zero additional effects | **PASS** | Replay compares the full canonical envelope, binding included, minus store revision metadata, at `main-store/store.mjs:258-264`; the divergent branch fails with `CT_PARKING_REPLAY_DIVERGENT` before any write, and the CAS race path re-enters the same comparison (`main-store/store.mjs:267-269`). Runtime: exact replay returns `{ revision: 1, replayed: true }` with byte-identical file contents at `test/main-store.test.mjs:243-244`; a changed `checkpoint` and a different producer evidence set each raise `CT_PARKING_REPLAY_DIVERGENT` with unchanged bytes at `test/main-store.test.mjs:296-299`. |
| 6 | Sealing at parking, persistence, immutability, and dedicated authoritative readback by parked-decision identity occur under Main's canonical writer, lock, and transaction; no parallel store or writer | **PASS** | Sealing runs after `assertMain` (`main-store/store.mjs:240` → `148-153`) and reuses the single `commit → atomicWrite → withLock → rename + fsync` boundary (`main-store/store.mjs:266`, `154-172`, `123-147`, `102-122`). Immutability is enforced by `expected_revision: 0`, so the record is written once at `revision: 1` with empty `revision_history`. `readParkedCheckpointBinding(id)` at `main-store/store.mjs:273-292` is a dedicated readback keyed on the exact parked-decision identity: it requires the closed envelope key set, `actor: "MAIN"`, the store's bound project, `revision === 1` and empty history, revalidates all three persisted artifacts and the pair, requires the requested id to equal both the parked-decision id and the binding id, and re-asserts the binding against its persisted sources before returning a frozen clone. `createParkedCheckpointBinding`/`readParkedCheckpointBinding` have exactly one production call site each — `main-store/store.mjs`. Runtime: missing identity → `CT_PARKING_BINDING_NOT_FOUND` (`test/main-store.test.mjs:252`); substituted identity path, actor drift, envelope project drift, unknown envelope field, and corrupted `binding_digest` each → `CT_PARKING_BINDING_INVALID` with byte-for-byte unchanged files (`test/main-store.test.mjs:300-306,325-338,340-354`). |
| 7 | The producers `workspace/checkpoint.mjs` and `reconciled-checkpoint-v1` are consumed without a second capture or reconciliation route | **PASS** | Neither producer file is in the diff. `main-store/store.mjs` imports the producers' assertions only (`main-store/store.mjs:10-11`) and constructs no capture or reconciliation. No new persistence kind is introduced; the binding is co-located in the pre-existing `decision-parkings/<id>.json` envelope. Runtime: the store creates no `checkpoint-captures` and no `reconciled-checkpoints` shadow directory (`test/main-store.test.mjs:253-254`), and the parking directory holds exactly one file (`test/main-store.test.mjs:242`). |
| 8 | The implementation diff touches no path outside `Área` | **PASS** | See the path-boundary section below. Nine paths, all inside `Área`; zero inside `Prohibido`. |

## Falsifier verification — producer-owned evidence without caller assertion

The relevant runtime test is `test/main-store.test.mjs:257-272`,
**"runs the real producer-to-Main-to-parking path without caller provenance"**.

The route it executes is real, not simulated:

1. `provenance()` (`test/main-store.test.mjs:97-108`) creates a real temporary Git repository
   with real `git init`/`add`/`commit`/`rev-parse`/`reset` calls and a real staged index.
2. `createParkingComposition` is constructed with the real producers
   `captureCheckpoint` and `reconcileCheckpoint` and the real Main store
   (`test/main-store.test.mjs:260-264`). No stub, fake, adapter, or fixture producer is used.
3. `composition.park({ parked_decision, checkpoint_request, reconciliation_evidence })`
   is called with **inputs only**. The caller supplies no `checkpoint_capture`, no
   `reconciled_checkpoint`, no binding, and no provenance claim.
4. Inside `parkDecision`, `assertCanonicalCheckpointCapture` and
   `assertCanonicalReconciledCheckpoint` (`main-store/store.mjs:244-245`) require the exact
   live producer-branded object references. The brand is a module-private ownership check
   (`workspace/checkpoint.mjs:93`, `workspace/reconciliation.mjs:54`), so a structurally
   perfect caller-built or cloned artifact cannot pass. The negative control is
   `test/main-store.test.mjs:281`, where a `structuredClone` of a genuine capture is rejected.
5. `reconciliation_state` is copied from the producer's own `state`
   (`contracts/parked-checkpoint-binding.mjs:28`), which `reconcileCheckpoint` forces to
   `"VALID"` at `workspace/reconciliation.mjs:67` and which `parked-checkpoint-binding-v1`
   pins as `const: "VALID"` (`schemas/parked-checkpoint-binding-v1.schema.json:17`).
6. `test/main-store.test.mjs:268-270` asserts the producers' artifacts are unchanged by the
   route and that `readParkedCheckpointBinding(parked_decision_id)` returns exactly the
   binding sealed in that operation.

**Verdict: the falsifier is genuinely satisfied.** The `VALID` reconciliation and the
canonical capture reach the seal through the real producer path, with no caller assertion
available anywhere in the chain.

Honest scope note: `reconciled-checkpoint-v1` pins `state` to `const: "VALID"`
(`schemas/reconciled-checkpoint-v1.schema.json:12`), so a non-`VALID` canonical
reconciliation cannot exist as a valid artifact in the first place. The `VALID` requirement
is therefore enforced structurally rather than by a runtime branch on a producer that can
emit other states. The independently re-sealed `reconciliation_state = "INVALID"` rejection
at `test/contracts/parked-checkpoint-binding.test.mjs:44` covers the remaining vector, which
is persisted-record tampering.

## Path boundary — `Área` and `Prohibido`

Declared `Área`: `main-store/store.mjs`, `contracts/**`, `schemas/**`,
`test/main-store.test.mjs`, `test/contracts/**`, `test/fixtures/contracts/schema-cases-v1.json`.

Declared `Prohibido`: `workspace/checkpoint.mjs`, `escalation/**`, `continuation/**`,
`core.mjs`, `mcp.mjs`, `delivery/**`, `openspec/specs/**`.

| Changed path | Inside `Área` | Inside `Prohibido` |
| --- | --- | --- |
| `contracts/parked-checkpoint-binding.mjs` | yes (`contracts/**`) | no |
| `contracts/schema-registry.mjs` | yes (`contracts/**`) | no |
| `contracts/validate.mjs` | yes (`contracts/**`) | no |
| `main-store/store.mjs` | yes (exact) | no |
| `schemas/parked-checkpoint-binding-v1.schema.json` | yes (`schemas/**`) | no |
| `test/contracts/parked-checkpoint-binding.test.mjs` | yes (`test/contracts/**`) | no |
| `test/contracts/schema.test.mjs` | yes (`test/contracts/**`) | no |
| `test/fixtures/contracts/schema-cases-v1.json` | yes (exact) | no |
| `test/main-store.test.mjs` | yes (exact) | no |

`git diff --numstat master...HEAD` returns exactly these nine paths and no others.
`workspace/checkpoint.mjs`, `workspace/reconciliation.mjs`,
`escalation/parking-composition.mjs`, every other `escalation/**` path, `continuation/**`,
`core.mjs`, `mcp.mjs`, `delivery/**`, and `openspec/specs/**` are all unchanged.

The untracked `openspec/changes/s5-9-parked-checkpoint-binding/` planning artifacts are SDD
evidence, not implementation candidate paths, and `openspec/changes/**` is not
`openspec/specs/**`. **Criterion 8: PASS.**

## Task completion

`openspec/changes/s5-9-parked-checkpoint-binding/tasks.md` contains four
implementation-owned rows, all `[x]`: T5.9.1.1, T5.9.1.2, T5.9.1.3, T5.9.1.4. No
`- [ ]` implementation marker remains in the SDD tasks artifact. Engram `#8883` agrees.

The Plan STATUS rows for `Módulo 5.9.1` and the eight acceptance checkboxes remain
unchecked. Those are the pre-integration authority snapshot, not the SDD tasks artifact,
and are reconciled by the parent integration/documentation step.

Code-state correspondence per task:

| Task | Claimed | Verified in code |
| --- | --- | --- |
| T5.9.1.1 / T5.9.1.2 | closed contract, deterministic digest, exact source fields, registry entry, fixture, mismatch matrix | `contracts/parked-checkpoint-binding.mjs`, `schemas/parked-checkpoint-binding-v1.schema.json`, `contracts/schema-registry.mjs:16`, `contracts/validate.mjs:6,178-180`, `test/fixtures/contracts/schema-cases-v1.json:61-70`, `test/contracts/*` — all present, 63/0/211 GREEN |
| T5.9.1.3 | sealing after authority/origin/pair/project checks, envelope member, dedicated readback | `main-store/store.mjs:252-256,273-292` — present, 54/0/339 GREEN |
| T5.9.1.4 | replay, corruption, atomic failure, no shadow directory, one writer | `main-store/store.mjs:258-269`; `test/main-store.test.mjs:243-244,253-254,290-306,325-354` — present |

## Strict TDD

Strict TDD is active. `apply-progress.md:32-41` carries the required TDD Cycle Evidence
table with RED → GREEN → TRIANGULATE → REFACTOR for all four tasks, and every named test
file exists in the candidate. The recorded RED failures (`58/2` contracts, `49/2` and
`51/1` main-store) are consistent with the tests that exist now.

Assertion-quality audit: **PASS**. Tests assert exact error codes, exact persisted bytes via
`readFileSync` comparison, exact field equality, revision counts, directory entries, frozen
object identity, and absence of shadow directories. Parameterized loops have fixed non-empty
mutation tables with an assertion on every iteration. No ghost loop, tautology, type-only
check, or smoke-only test was found. One test asserts for a non-intended reason — see W2.

## Issues

### CRITICAL

None.

### WARNING

**W1 — Criterion 2's evidence-preservation clause is refuted; it cannot be checked as written.**
STATUS asserts the failed falsifier "permanece como evidencia no integrada en el archivo no
trackeado `design.md` … SHA-256 `a349747c…`, Engram 8604". Neither holds now. The worktree
`design.md` hashes `93e850eb…` and contains the reconciled `FALSIFIER: PASS`. Engram `#8604`
shares the same `topic_key` (`sdd/s5-9-parked-checkpoint-binding/design`) and was upserted to
the same PASS content (`Revisions: 2`), so the failed verdict is gone from the location that
`design.md:33` itself names as "the only available content authority". Only the underlying
spec-phase finding survives, at Engram `#8602`. This is not a code defect and cannot be fixed
by re-applying. It requires a maintainer decision: amend criterion 2 to record the actual
disposition (prior falsifier ABSENT; substantive finding preserved at `#8602`), or accept the
loss explicitly. Until then criterion 2 must not be reported as 8/8 PASS.

**W2 — One test passes for a reason other than the behavior it names.**
`test/main-store.test.mjs:308-323`, "rejects a coherent copied foreign-project parking
envelope without mutation", creates the target directory with
`mkdirSync(dirname(canonicalPath))` and no `0o700` mode. `directory()` at
`main-store/store.mjs:93-99` rejects the unsafe directory mode before
`readParkedCheckpointBinding` ever parses the copied envelope, so the asserted
`CT_STORE_INVALID` proves directory-mode rejection, not foreign-project ownership rejection
at the readback boundary. This exact finding is already recorded in Engram `#8886` as the
reason for the prior gate failure; this verification reproduces it independently.
Mitigation: the intended behavior **is** covered — the envelope-drift loop's `project` case
at `test/main-store.test.mjs:340-354` (case `"project"`, line 343) mutates `record.project_id` to `"project-b"` in a
correctly-moded store directory and gets `CT_PARKING_BINDING_INVALID` with unchanged bytes.
The production check at `main-store/store.mjs:279` is therefore genuinely exercised. The
misleading test is redundant, not a coverage hole.

**W3 — `apply-progress.md` numbers are stale relative to HEAD.**
It records Candidate B as **58** authored lines (`apply-progress.md:70`); the actual commit
`754c698` is **103** (26/1 + 71/5). It records `bun test` at 722 pass and focused main-store
at 52/332; actual is 731 pass and 54/339. The drift is explained by the later
maintainer-authorized test-only correction recorded in Engram `#8886`, which
`apply-progress.md` was never updated to reflect. No conclusion in this report depends on
those stale numbers, and both candidates remain far below the 400-line budget.

### SUGGESTION

**S1 — The spec claims a cross-binding the parked decision cannot carry.**
`specs/parked-checkpoint-binding/spec.md:59` requires "exact equality across the parked
decision, canonical capture, and canonical reconciliation for repository, project,
assignment, generation, base, and result". `parked-decision-v1` has none of those fields —
its closed property set is `question`, `evidence`, `options`, `origin`, `checkpoint`,
`decision_class`, `created_at`, `frozen_scope`, plus identity and digest. The implementation
correctly derives all six values from the capture and cross-checks them against the
reconciliation (`contracts/parked-checkpoint-binding.mjs:29-30`,
`contracts/validate.mjs:202-208`); the parked-decision leg of that equality is vacuous by
construction. What Main actually seals is: *this exact parked decision was parked together
with this exact capture and reconciliation, which name the same execution*. That is the
strongest statement available and it satisfies STATUS criterion 3 as written. Consider
narrowing the spec sentence so it stops implying an unenforceable check.

**S2 — `readParkedCheckpointBinding` is not authority-asserted per call.**
It performs no `authority.assert` and takes no lock, matching the existing `readParking`
precedent (`main-store/store.mjs:272`). Access control comes from possessing the Main-bound
store instance, and the read is safe because records are published by atomic rename. This is
consistent with the codebase, but it means "under Main's authority" for readback is an
instance-level property, not a per-call check. Worth stating explicitly if S5.10 reuses the
pattern.

**S3 — Consider fixing W2's test rather than deleting it.**
Creating the directory with mode `0o700` would make the copied foreign-project envelope
actually reach `main-store/store.mjs:279` and turn a misleading assertion into a real second
witness. This is a test-only change and is deliberately **not** performed here.

## Design coherence

| Design decision | Implemented as designed |
| --- | --- |
| Standalone closed schema, own version, own digest, dedicated readback; co-located in the existing parking envelope rather than a second file | Yes — `design.md:206`; `schemas/parked-checkpoint-binding-v1.schema.json`, `main-store/store.mjs:256,273` |
| Domain-separated `rfc8785-jcs` digest over every field except `binding_digest` | Yes — `contracts/parked-checkpoint-binding.mjs:6-15` |
| Nine-step sealing order inside `parkDecision` | Yes — `main-store/store.mjs:239-266`, in the designed order |
| Seven-step dedicated readback | Yes — `main-store/store.mjs:273-292` |
| No producer, composition, or forbidden-path edit | Yes — none in the diff |
| No migration, no backfill; old parking records fail readback closed | Yes — readback requires the `parked_checkpoint_binding` key in the closed envelope set (`main-store/store.mjs:278`) |

"Standalone" is satisfied in the design's declared sense — own closed schema, version,
digest, validation, and dedicated readback, never an `extensions` claim — not as a separate
file. This is a deliberate, documented choice that strengthens atomicity, not a deviation.

## Delivery boundary and rollback

- Nothing was staged, committed, pushed, or opened as a PR by this verification.
- Candidate A (`3c3040d`, 147 authored) and Candidate B (`754c698`, 103 authored) are the two
  sequential direct-push candidates; combined 250, both individually and jointly under 400.
- Publication to `master` remains deferred pending explicit maintainer authorization
  (`tasks.md:23`).
- Rollback before any binding is sealed: coherent revert of the nine implementation paths.
  After sealing: revert behavior only — never delete, rewrite, migrate, backfill, or clean up
  a persisted parking record or binding.

## Blockers and next action

- Implementation blockers: **none**. No CRITICAL issue; no correction required; no re-apply
  needed.
- Documentation blocker before S5.9 can be closed as 8/8: **W1**. Criterion 2's
  evidence-preservation clause is factually false and needs a maintainer STATUS amendment or
  an explicit accepted-loss note. This is a maintainer decision, not an executor correction.
- Next recommended: **`sdd-archive`**, gated on resolving W1 in `plan-5/STATUS.md`.

## Risks

1. The failed-falsifier evidence named by criterion 2 is unrecoverable at both recorded
   locations; only the spec-phase finding at Engram `#8602` survives (W1).
2. The `topic_key` upsert pattern silently overwrote a deliberately preserved historical
   artifact. Any future "preserve the failed verdict" requirement needs a distinct
   `topic_key` or a tracked file, not the phase artifact's own key.
3. Live producer origin is a module-private brand and cannot survive serialization by design.
   Readback proves persisted integrity and Main-owned placement; it cannot re-prove live
   origin. Origin was proved once, before the single atomic write.
4. Parking records written before S5.9 have no `parked_checkpoint_binding` member and will
   fail dedicated readback closed. This is intended — no backfill is authorized.
5. One test in the candidate asserts a non-intended rejection path (W2). The intended
   behavior is covered elsewhere, so this is redundancy, not a gap.
