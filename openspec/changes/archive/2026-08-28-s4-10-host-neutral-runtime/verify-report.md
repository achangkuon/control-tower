```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:9724021bd0e4cbd913085e11b61fc15a8baf9e800e0ba98541f20d53a948cea7
verdict: pass
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 13/13
test_command: bun test
test_exit_code: 0
test_output_hash: sha256:ebc92a484cdb0e806b682b2e408018f40d70a01101b19bce4afda91de39f7753
build_command: bun --eval 'await import("./contracts/host-runtime/index.mjs"); console.log("import ok")'
build_exit_code: 0
build_output_hash: sha256:7b608c123053575f2ac880de7e760a44fc10e632fa28b8a48db56b56954f95dd
```

# S4.10 Integral Verification Report

## Status

**PASS**

The complete four-commit S4.10 candidate, including the single authorized ownership remediation committed verbatim as `0a70173c5901138e68e03d64f51522e0c2c2cc76`, satisfies all specification requirements, all 13 scenarios, all Plan-4 and proposal acceptance criteria, Strict TDD verification, scope constraints, and per-boundary review budgets. Both prior CRITICAL ownership defects are closed by direct differential probes. No CRITICAL, WARNING, or SUGGESTION finding remains.

This PASS verifies the exact remediated implementation snapshot now committed as `0a70173c5901138e68e03d64f51522e0c2c2cc76`. The remediation token is settled complete. No implementation bytes changed after verification; the next action is archive.

## Candidate and authority

- Change: `s4-10-host-neutral-runtime`
- Workspace: `/home/<usuario>/projects/control-tower/Worktrees/implementer-1`
- Branch: `feat/plan-4/s4-10-host-neutral-runtime`
- `origin/master` and merge base: `aab48da7ddfb72a6f045aa83063b2c83972e9e58`
- Committed HEAD: `0a70173c5901138e68e03d64f51522e0c2c2cc76`
- Remediation: committed verbatim in `0a70173c5901138e68e03d64f51522e0c2c2cc76`, exactly three paths, `+69/-43 = 112` authored lines
- Implementation manifest SHA-256: `33f2158d9a0285827ead1e567e5d4b2e0cf85cf9c828b96e50f593472396b1be`
- Remediation binary-diff SHA-256: `cc618669bf213891a333991c3d8c9ec62a1adaa8c6559c0ae3d4dc952e4ef9ed`
- Verification evidence revision: `sha256:9724021bd0e4cbd913085e11b61fc15a8baf9e800e0ba98541f20d53a948cea7`
- Remediation token: `sha256:d89d9709bc258f505039ae9aeb4923f60559c0eeaa0466a914c6936cffd8f158`; settled complete by the parent; no reset or replacement occurred.
- Artifact store: hybrid. The OpenSpec artifacts and full Engram observations for spec, tasks, apply-progress, and the prior failed verify report were read directly.
- RDD: OFF under the manual override; no receipt was created or claimed.

The current implementation manifest matches the verified manifest `33f2158d9a0285827ead1e567e5d4b2e0cf85cf9c828b96e50f593472396b1be`; the committed remediation binary diff matches `cc618669bf213891a333991c3d8c9ec62a1adaa8c6559c0ae3d4dc952e4ef9ed`. Commit `0a70173c5901138e68e03d64f51522e0c2c2cc76` contains exactly those three remediation paths and no other change. These identity checks prove the verified bytes were committed verbatim; no implementation bytes changed after verification.

## Structured status and action context

Native status was consumed before verification:

- `artifactStore: openspec` for the native dispatcher; session artifact policy is hybrid.
- `taskProgress: 20/20`, `pending: 0`, `allComplete: true`.
- `actionContext.mode: repo-local`.
- `actionContext.workspaceRoot: /home/<usuario>/projects/control-tower/Worktrees/implementer-1`.
- `allowedEditRoots: [/home/<usuario>/projects/control-tower/Worktrees/implementer-1]`.
- Native `nextRecommended: remediate`, `dependencies.verify: blocked`, and the prior failed evidence remained present because the parent-held remediation attempt had not been settled and the failed report was still authoritative at status-read time.

The parent explicitly delegated the complete successor verification inside that already-active remediation attempt and forbade acquiring or settling it. Verification was therefore limited to read-only candidate checks, tests, probes, and replacement of this required report artifact. No terminal or delivery action was taken. Workspace ownership and permitted report persistence are proven inside the authoritative root.

Native readback reports `dependencies.verify: all_done`, `dependencies.archive: ready`, `nextRecommended: archive`, and `blockedReasons: []`. The remediation bytes are committed and the token is settled complete, so the next action is archive.

## Prior failed verification history — preserved and superseded

The previous report is preserved here as historical evidence rather than erased:

- Prior report file SHA-256: `03bb62bf83597ad48339dd6196865324e900e93f746cb68e543078bd5b01b9b8`.
- Prior result envelope evidence revision: `sha256:14dadc2403b45597695d109ddc37d2106426c76d47d9469693023097257fa40e`.
- Prior verdict: **FAIL**; blockers: 2; requirements: `4/6`; scenarios: `13/13`.
- Prior full suite: `912 pass`, `0 fail`, `5287 expect() calls`, 71 files.
- Prior CRITICAL 1: public `activate` could publish ownership without final-listener acquisition. Differential output was `{"service_keys":["activate","dispose","release","reserve"],"activate_created_authority":true,"port_remained_available":true}`.
- Prior CRITICAL 2: `cleanupPending` did not fence port reuse. Differential output was `{"b_failure":"CT_HOST_RUNTIME_CLEANUP_FAILED","uncertainty_retained":true,"c_acquires":1,"c_reserve_succeeded":true}`.
- Prior next action: one bounded remediation and a new complete integral verification.

The authorized successor removes `activate`, migrates ownership tests through `reserve()`, fences every cleanup-pending numeric port, and adds direct regressions. The matrices and direct probes below supersede the prior FAIL for the exact remediated snapshot only.

## Commits, review workload, and rollback

| Boundary | Outcome | Paths | Authored lines | Budget | Verification/rollback |
|---|---|---:|---:|---|---|
| `4ba00b3557cdfee6d99bddbb6424eec51a3fce27` | `feat(contracts): add host-runtime v1 shapes` | 10 | `+237/-1 = 238` | PASS (`<=400`) | Shapes/inventory tests travel with code; revert restores inventory `31→26` and removes the five schemas and shape implementation. |
| `0b4f8802b355e4036c1d3426e0613e6951916824` | `feat(contracts): enforce exact runtime binding freshness` | 4 | `+226/-0 = 226` | PASS (`<=400`) | Context/freshness tests travel with code; revert restores commit 1. |
| `28163d2d332153c342e68f8ed72538c69e99301d` | `feat(contracts): own loopback reservations by exact binding` | 3 | `+248/-14 = 262` | PASS (`<=400`) | Listener/collision/release/disposal tests travel with code; revert restores commit 2. |
| Uncommitted remediation successor | close acquisition-free ownership and cleanup-pending reuse | 3 | `+69/-43 = 112` | PASS (`<=400`) | Revert only the three diffs to exact `28163d2`; commits 1–3 remain unchanged. |

The chain is linear: base → commit 1 → commit 2 → commit 3 → one remediation successor. Every boundary is independently reviewable and reverse-order revertible. No `size:exception` exists or is needed. Tasks forecast sequential direct commits, no PR/chained PR; repository policy requires direct commits. The implementation respected that boundary and introduced no extra work unit.

## Decision, shape, neutrality, and scope matrix

| Criterion | Result | Evidence |
|---|---|---|
| Decision 80: Tower-launched scope and unpredictable neutral identity | PASS | Canonical 128-bit opaque IDs; no adoption path or host-specific process authority is introduced. |
| Decision 84: neutral contract before adapters | PASS | `contracts/host-runtime/**` imports no Pi/OpenCode/Intercom adapter; no adapter path changed. |
| Decision 86: per-worktree topology remains a future consumer | PASS | S4.10 expresses worktree identity only; no broker, supervisor, keepalive, or shared namespace implementation leaked in. |
| Decision 89: exactly five public v1 shapes | PASS | Identity, worktree, process, incarnation, and binding are the only host-runtime schemas and schema names. |
| Decision 89 exact fields | PASS | Each schema's `required` exactly equals its property keys; `additionalProperties: false`; binding has exactly seven authorized fields. |
| Canonical identifier grammar | PASS | `ct_<kind>_<32 lowercase hex>` per kind; generator requires exactly 16 injected bytes. |
| Host neutrality | PASS | Product scan found no Pi, OpenCode, Intercom, broker, supervisor, adapter, session, pane, endpoint, adoption, transfer, rebind, observe/health/stop/attach, install, package, payload, or recovery vocabulary. |
| Closed validation | PASS | Ajv 2020 strict mode, no coercion/default/removal; shape and context tests reject extras, malformed IDs, versions, and ports. |
| Decision 90 exact line | PASS | Commit 1 changes only `expect(schemaFiles).toHaveLength(26)` to `expect(schemaFiles).toHaveLength(31)` in `test/contracts/schema.test.mjs`; no later commit or remediation changes that file. |
| Authorized committed paths | PASS | The base-to-HEAD product diff contains only `contracts/host-runtime/**`, five `schemas/host-runtime-*.schema.json`, `test/contracts/host-runtime/**`, and the single Decision-90 inventory line. |
| Authorized remediation paths | PASS | Exactly `ownership-registry.mjs`, `ownership.test.mjs`, and `loopback.test.mjs`; no new path. |
| No S4.11/S4.12/etc. leakage | PASS | No adapter, broker/supervisor, observe/health/stop/attach, recovery, install/package/payload, S4.4/S4.8/S4.9/S4.11/S4.12/S8.12 implementation changed. |

## Specification requirement matrix

| Requirement | Result | Evidence |
|---|---|---|
| Neutral closed identity and binding shapes | PASS | Five exact closed schemas, strict validators, canonical IDs, and `shapes.test.mjs`. |
| Exact identity/worktree/process/binding/incarnation cross-binding | PASS | `binding-context.mjs` validates all five tuple components, compares every ID and port exactly, rejects zero/multiple matches; ownership focused tests pass. |
| Current incarnation prevents stale/replayed authority | PASS | Immutable binding/incarnation history; stale/replay after release and reuse reject; tests pass through the real `reserve` lifecycle. |
| Loopback-port ownership and collision handling | PASS | `reserve` is the only authority path; acquisition creates the final listener; active, pending, cleanup-pending, and external collisions fail closed. Direct probe 1 proves no alternate publish path. |
| Exact release and safe port reuse | PASS | Exact owner/incarnation required; foreign/stale release preserves authority; close failure preserves retry authority; cleanup-pending port reuse is rejected before acquisition. Direct probe 2 proves the fence. |
| Host-runtime boundary and Session scope | PASS | Exact path and vocabulary audits show no neighboring responsibility or deferred-session implementation. |

**Requirements: 6/6 PASS.**

## Specification scenario matrix

| Scenario | Result | Evidence |
|---|---|---|
| A complete neutral binding validates | PASS | Five validators and exact tuple acceptance in focused tests. |
| An undeclared field is rejected | PASS | Every public shape and every tuple component is tested with an extra field. |
| A required cross-binding field is absent or non-canonical | PASS | Missing tuple positions, malformed binding, wrong kind/case/length/whitespace IDs, and invalid ports reject closed. |
| A crossed binding is rejected | PASS | Mixed valid tuple components reject `CT_HOST_RUNTIME_BINDING_CROSSED`. |
| An ambiguous identity is rejected | PASS | Duplicate complete tuples reject `CT_HOST_RUNTIME_CONTEXT_AMBIGUOUS`. |
| Replay after reuse is rejected | PASS | Released binding replay and reused incarnation reject `CT_HOST_RUNTIME_STALE` after later port reuse. |
| A stale incarnation is rejected before port ownership | PASS | Stale/reused incarnation rejects before acquisition or publication. |
| Exact binding reserves an available loopback port | PASS | Real `127.0.0.1` listener is held from reserve through exact release; result is bounded metadata only. |
| Another binding requests a reserved port | PASS | Active and pending collisions reject `CT_HOST_RUNTIME_PORT_RESERVED` while preserving current ownership. |
| Externally occupied loopback port is rejected | PASS | Real exclusive ephemeral listener maps to `CT_HOST_RUNTIME_PORT_OCCUPIED`; no adoption/replacement occurs. |
| Owning current binding releases its port | PASS | Stored close capability runs once; real port becomes reusable only after confirmed release. |
| Foreign or stale binding attempts release | PASS | Requests reject `CT_HOST_RUNTIME_NOT_OWNER` without invoking the active close. |
| Host-specific or out-of-scope responsibility is proposed | PASS | Product vocabulary and exact path audits reject/show no leakage. |

**Scenarios: 13/13 PASS.**

## Plan-4 STATUS acceptance criteria

| Criterion | Result | Evidence |
|---|---|---|
| Identity, worktree, process, binding, and incarnation validate without Pi/OpenCode vocabulary | PASS | Closed neutral shapes and exact tuple validation. |
| Port belongs to the exact binding | PASS | Only `reserve` publishes after successful exact-context acquisition; direct probe proves failed acquisition creates no releasable authority and leaves the port available. |
| Collision, stale, and extra-field cases fail closed | PASS | Active/pending/cleanup/OS collision, immutable history, and strict shape tests pass. |
| No path outside the approved Área changes | PASS | Decision 90 is the sole authorized expansion; remediation stays within three authorized paths. |

**Plan criteria: 4/4 PASS.**

## Proposal success criteria

| # | Result | Evidence |
|---:|---|---|
| 1 | PASS | Five neutral values validate together without host vocabulary. |
| 2 | PASS | Crossed, active/pending/cleanup, and OS-occupied collisions reject; no acquisition-free authority surface remains. |
| 3 | PASS | Ambiguous, stale, replayed, missing, conflicting, and extra-field cases reject closed. |
| 4 | PASS | Exact release removes authority only after close; cleanup uncertainty fences reuse; old authority never revives. |
| 5 | PASS | Schemas, runtime validation, reservation, release, cleanup, and tests enforce one lifecycle. |
| 6 | PASS | Ambiguous identity, occupied port, crossed binding, and stale replay RED cases exist and remain GREEN. |
| 7 | PASS | No adapter, broker, supervisor, observe/health/stop/attach, recovery, install, or package responsibility is implemented. |
| 8 | PASS | All implementation paths are authorized, including the one-line Decision-90 expansion. |
| 9 | PASS | Immutable boundaries are 238, 226, and 262 lines; remediation is 112; all are `<=400`. |

**Proposal criteria: 9/9 PASS.**

## Final listener, cleanup, and concurrency matrix

| Design/lifecycle criterion | Result | Evidence |
|---|---|---|
| Constructor-bound acquisition receives exact context and port once | PASS | Focused call/reference assertions and pending serialization test. |
| Successful reserve means final listener already exists | PASS | Real exclusive loopback listener is occupied immediately after reserve. |
| No probe/transfer/adoption/rebind lifecycle | PASS | Service surface is exactly `dispose`, `release`, `reserve`; source and vocabulary scans are clean. |
| Active listener remains held continuously | PASS | Competing bind fails before release and succeeds after exact release. |
| Active, pending, and externally occupied collisions fail closed | PASS | Focused fake and real-loopback cases pass. |
| Cleanup-pending port stays unavailable | PASS | Remediation branch and direct probe 2 reject replacement before its acquisition capability runs. |
| Release is exact and foreign/stale-safe | PASS | Foreign/stale/already-released attempts do not close current ownership. |
| Close failure preserves retry authority | PASS | First close failure rejects cleanup; second exact release retries and succeeds. |
| Terminal disposal rejects late reserve | PASS | Lifecycle gate prevents acquisition while disposing and after disposed. |
| Pending acquisition and disposal quiesce safely | PASS | Disposal awaits tracked reservation; uncertain cleanup remains retained and reported. |
| Concurrent exact releases coalesce | PASS | One shared promise invokes close once and returns equal acknowledgements. |
| Concurrent dispose plus release coalesces | PASS | Both routes share one close, remove authority once, and terminate cleanly. |
| Node close capability is idempotent | PASS | Concurrent close calls share the first close promise and the port becomes reusable. |
| No remediation regression or untested production branch | PASS | Remediation changes only two production branches—removal of `activate` and cleanup-pending preflight—and each has a direct regression plus direct probe; focused, directory, schema, import, and full suite are green. |

## Strict TDD compliance

Strict TDD is active in `openspec/config.yaml`; runner: Bun 1.3.14; command: `bun test`.

| Check | Result | Details |
|---|---|---|
| TDD Cycle Evidence reported | PASS | Cumulative `TDD Cycle Evidence` tables exist for T4.10.1.1–T4.10.1.3 and the authorized remediation successor. |
| All tasks have test evidence | PASS | 3/3 original Tareas plus the two authorized remediation defects identify RED/GREEN/triangulation evidence and actual test files. |
| Reported test files exist | PASS | `shapes.test.mjs`, `ownership.test.mjs`, `loopback.test.mjs`, and `schema.test.mjs` exist. |
| RED evidence | PASS | Historical absent exports/functions and final-listener race failures are recorded; remediation valid RED reproduced both prior differentials before minimum production change. |
| GREEN remains true | PASS | Focused 18/0, directory 22/0, inventory 1/0, full 914/0. |
| Triangulation | PASS | Shape/version/ID matrices, exact/missing/crossed/ambiguous contexts, history/replay, fake and real listener paths, cleanup/disposal/retry/concurrency, and both remediation differentials are covered. |
| Safety net | PASS | New files are identified as new; modified inventory and ownership/listener paths include focused and full-suite checkpoints. |
| Assertion quality | PASS | No tautology, ghost loop, no-production-call assertion, type-only assertion alone, smoke-only test, CSS assertion, or mock-heavy imbalance. Exact call counts verify close-once/acquisition-once resource behavior rather than incidental implementation styling. |
| Coverage | N/A | No coverage tool is configured; informational only. |
| Linter/type checker/formatter | N/A | None configured. Diff whitespace checks are clean. |

**TDD compliance: PASS.**

### Test layer distribution

| Layer | Tests | Files | Notes |
|---|---:|---:|---|
| Unit/contract | 19 | 3 | Four shape cases, eight context/ledger cases, and seven fake-capability lifecycle/differential cases. |
| Integration | 4 | 2 | Three real Node loopback cases plus the filesystem schema inventory gate. |
| E2E | 0 | 0 | E2E capability is not configured. |
| **Total** | **23** | **4** | 22 host-runtime cases plus one focused inventory case. |

## Task completion and apply-progress consistency

- Canonical `tasks.md`: **20/20 checked; 0 unchecked**.
- Exact unchecked `- [ ]` implementation task lines in the canonical tasks artifact: **none**.
- Apply-progress records the same three immutable commits, final budgets `238/226/262`, one remediation successor of 112 lines, complete TDD evidence, exact three remediation paths, and the same parent-held token.
- The tasks artifact has no remediation-specific checkbox; apply-progress correctly did not invent or reword one.
- The three unchecked S4.10 rows in Plan-4 `STATUS.md` are planning/closure state, not unchecked implementation markers in the canonical SDD tasks artifact. Parent documentation remains a later integration responsibility.

Tasks and apply-progress are consistent. There is no completeness blocker.

## Validation commands and exact results

| Exact command | Exit | Exact result |
|---|---:|---|
| `git diff --check` | 0 | No output. |
| `git diff --check aab48da7ddfb72a6f045aa83063b2c83972e9e58..HEAD` | 0 | No output. |
| `git diff --check HEAD -- contracts/host-runtime/ownership-registry.mjs test/contracts/host-runtime/ownership.test.mjs test/contracts/host-runtime/loopback.test.mjs` | 0 | No output. |
| `bun test test/contracts/host-runtime/ownership.test.mjs test/contracts/host-runtime/loopback.test.mjs` | 0 | `18 pass`, `0 fail`, `122 expect() calls`, 2 files, 284ms. |
| `bun test test/contracts/host-runtime` | 0 | `22 pass`, `0 fail`, `195 expect() calls`, 3 files, 294ms. |
| `bun test test/contracts/schema.test.mjs --test-name-pattern "keeps the complete schema inventory Tower-owned"` | 0 | `1 pass`, `71 filtered out`, `0 fail`, `2 expect() calls`, 1 file, 196ms. |
| `bun test` | 0 | `914 pass`, `0 fail`, `5291 expect() calls`, 71 files, 72.91s. Run exactly once on the remediated candidate. |
| `bun --eval 'await import("./contracts/host-runtime/index.mjs"); console.log("import ok")'` | 0 | `import ok`. |
| `pgrep -af '(^|/)bun( |$)'` | no matches | No Bun process before verification or after tests/probes. |
| `ss -ltnp 2>/dev/null \| grep -i bun` | no matches | No Bun-owned listening socket before verification or after tests/probes. |

Output hashes:

- Focused ownership+loopback: `sha256:047d4ad041a4e512fc33fd21eef0234f02dabaa426ca5eab2f0dd2403764573a`
- Host-runtime directory: `sha256:86c6749971023f521d984f73b1eb2874dfcd4d934177f5bc09b25d6134821215`
- Schema inventory: `sha256:76688a04b88385b102905e819e3cc7b12f1bcd99ed50c74f1e73c41ef3a6a4a1`
- Full suite: `sha256:ebc92a484cdb0e806b682b2e408018f40d70a01101b19bce4afda91de39f7753`
- Import output: `sha256:7b608c123053575f2ac880de7e760a44fc10e632fa28b8a48db56b56954f95dd`

No source-mutating formatter, code generation, linter, or type checker is configured. All executed quality checks were check-only.

## Direct differential probes

### Probe 1 — no `activate` or alternate acquisition-free authority

The final derived probe command was:

```bash
bun --eval 'import { createServer } from "node:net"; import { createHostRuntimeOwnership } from "./contracts/host-runtime/index.mjs"; const id=(k,d)=>`ct_${k}_${d.repeat(32)}`; const identity={schema_version:"control-tower.host-runtime.identity/v1",runtime_id:id("runtime","1")},worktree={schema_version:"control-tower.host-runtime.worktree/v1",worktree_id:id("worktree","1")},processValue={schema_version:"control-tower.host-runtime.process/v1",process_id:id("process","1")},incarnation={schema_version:"control-tower.host-runtime.incarnation/v1",incarnation_id:id("incarnation","1")}; const listen=(port=0)=>new Promise((yes,no)=>{const s=createServer().once("error",no).listen({host:"127.0.0.1",port,exclusive:true},()=>yes(s))}), close=(s)=>new Promise((yes,no)=>s.close((e)=>e?no(e):yes())); const probe=await listen(),port=probe.address().port; await close(probe); const binding={schema_version:"control-tower.host-runtime.binding/v1",binding_id:id("binding","1"),runtime_id:identity.runtime_id,worktree_id:worktree.worktree_id,process_id:processValue.process_id,incarnation_id:incarnation.incarnation_id,loopback_port:port}, exact=[identity,worktree,processValue,incarnation,binding]; let acquisitions=0,reserveFailure,releaseFailure; const service=createHostRuntimeOwnership({resolveContexts:()=>[exact],acquireAtReservation:async()=>{acquisitions++;throw new Error("blocked acquisition")}}); try{await service.reserve(binding)}catch(e){reserveFailure=e.code}try{await service.release(binding)}catch(e){releaseFailure=e.code}const available=await listen(port); await close(available); await service.dispose(); console.log(JSON.stringify({service_keys:Object.keys(service).sort(),activate_type:typeof service.activate,reserve_failure:reserveFailure,release_after_failed_acquisition:releaseFailure,acquisitions,port_remained_available:true}))'
```

Exit 0. Output:

```json
{"service_keys":["dispose","release","reserve"],"activate_type":"undefined","reserve_failure":"CT_HOST_RUNTIME_ACQUISITION_FAILED","release_after_failed_acquisition":"CT_HOST_RUNTIME_NOT_OWNER","acquisitions":1,"port_remained_available":true}
```

Output SHA-256: `4360e48b09405cf451d634bdc11f875858d5f731c39604f66207e8cacc273b64`.

**Result: PASS.** There is no `activate` surface. A failed final-listener acquisition creates no releasable authority, and the free numeric port remains bindable rather than being claimed by metadata.

An earlier diagnostic form of this same probe also ran and was not used as final evidence because its `port_claimed_without_acquisition` convenience label was constant. Exact command:

```bash
bun --eval 'import { createServer } from "node:net"; import { createHostRuntimeOwnership } from "./contracts/host-runtime/index.mjs"; const id=(k,d)=>`ct_${k}_${d.repeat(32)}`; const identity={schema_version:"control-tower.host-runtime.identity/v1",runtime_id:id("runtime","1")},worktree={schema_version:"control-tower.host-runtime.worktree/v1",worktree_id:id("worktree","1")},processValue={schema_version:"control-tower.host-runtime.process/v1",process_id:id("process","1")},incarnation={schema_version:"control-tower.host-runtime.incarnation/v1",incarnation_id:id("incarnation","1")}; const listen=(port=0)=>new Promise((yes,no)=>{const s=createServer().once("error",no).listen({host:"127.0.0.1",port,exclusive:true},()=>yes(s))}), close=(s)=>new Promise((yes,no)=>s.close((e)=>e?no(e):yes())); const probe=await listen(),port=probe.address().port; await close(probe); const binding={schema_version:"control-tower.host-runtime.binding/v1",binding_id:id("binding","1"),runtime_id:identity.runtime_id,worktree_id:worktree.worktree_id,process_id:processValue.process_id,incarnation_id:incarnation.incarnation_id,loopback_port:port}, exact=[identity,worktree,processValue,incarnation,binding]; let acquisitions=0,reserveFailure; const service=createHostRuntimeOwnership({resolveContexts:()=>[exact],acquireAtReservation:async()=>{acquisitions++;throw new Error("blocked acquisition")}}); try{await service.reserve(binding)}catch(e){reserveFailure=e.code}; const available=await listen(port); await close(available); await service.dispose(); console.log(JSON.stringify({service_keys:Object.keys(service).sort(),activate_type:typeof service.activate,reserve_failure:reserveFailure,acquisitions,port_claimed_without_acquisition:false,port_remained_available:true}))'
```

Exit 0. Output:

```json
{"service_keys":["dispose","release","reserve"],"activate_type":"undefined","reserve_failure":"CT_HOST_RUNTIME_ACQUISITION_FAILED","acquisitions":1,"port_claimed_without_acquisition":false,"port_remained_available":true}
```

The final probe above reran the differential with `release_after_failed_acquisition: CT_HOST_RUNTIME_NOT_OWNER`, deriving the authority conclusion from observable behavior rather than the convenience label.

### Probe 2 — cleanup-pending port cannot be reused

Executed directly:

```bash
bun --eval 'import { createHostRuntimeOwnership } from "./contracts/host-runtime/index.mjs"; const id=(k,d)=>`ct_${k}_${d.repeat(32)}`, tuple=(d,p)=>{const i={schema_version:"control-tower.host-runtime.identity/v1",runtime_id:id("runtime",d)},w={schema_version:"control-tower.host-runtime.worktree/v1",worktree_id:id("worktree",d)},x={schema_version:"control-tower.host-runtime.process/v1",process_id:id("process",d)},n={schema_version:"control-tower.host-runtime.incarnation/v1",incarnation_id:id("incarnation",d)},b={schema_version:"control-tower.host-runtime.binding/v1",binding_id:id("binding",d),runtime_id:i.runtime_id,worktree_id:w.worktree_id,process_id:x.process_id,incarnation_id:n.incarnation_id,loopback_port:p};return[i,w,x,n,b]}, deferred=()=>{let resolve;const promise=new Promise(y=>resolve=y);return{promise,resolve}}; const first=tuple("b",43211),uncertain=tuple("c",43212),replacement=tuple("d",43212); first[0]=uncertain[0];first[1]=uncertain[1];first[2]=uncertain[2];Object.assign(first[4],{runtime_id:uncertain[4].runtime_id,worktree_id:uncertain[4].worktree_id,process_id:uncertain[4].process_id}); const g1=deferred(),g2=deferred();let replacementAcquires=0;const tuples=[first,uncertain,replacement],service=createHostRuntimeOwnership({resolveContexts:b=>tuples.filter(t=>t[4]===b),acquireAtReservation:async(exact,port)=>{if(port===43211){await g1.promise;return async()=>{}} if(exact===uncertain){await g2.promise;return async()=>{throw new Error("uncertain")}} replacementAcquires++;return async()=>{}}}); const a=service.reserve(first[4]),b=service.reserve(uncertain[4]);g1.resolve();await a;g2.resolve();let bFailure,cFailure,disposeFailure;try{await b}catch(e){bFailure=e.code}try{await service.reserve(replacement[4])}catch(e){cFailure=e.code}try{await service.dispose()}catch(e){disposeFailure=e.code}console.log(JSON.stringify({uncertain_reservation_failure:bFailure,replacement_failure:cFailure,replacement_acquires:replacementAcquires,cleanup_retained_dispose_failure:disposeFailure}))'
```

Exit 0. Output:

```json
{"uncertain_reservation_failure":"CT_HOST_RUNTIME_CLEANUP_FAILED","replacement_failure":"CT_HOST_RUNTIME_PORT_RESERVED","replacement_acquires":0,"cleanup_retained_dispose_failure":"CT_HOST_RUNTIME_CLEANUP_FAILED"}
```

**Result: PASS.** Cleanup uncertainty remains retained, the later binding is rejected as port-reserved, and its acquisition capability is never invoked.

## Git state after verification

```text
## feat/plan-4/s4-10-host-neutral-runtime
 M contracts/host-runtime/ownership-registry.mjs
 M openspec/plans/decision-register.md
 M openspec/plans/plan-4/STATUS.md
 M test/contracts/host-runtime/loopback.test.mjs
 M test/contracts/host-runtime/ownership.test.mjs
?? openspec/changes/s4-10-host-neutral-runtime/
```

Interpretation:

- Exact remediation implementation diff: the three expected source/test paths only, `112` authored lines.
- `decision-register.md` and Plan-4 `STATUS.md` are pre-existing planning/authority modifications and were not part of the remediation or changed by this verifier.
- The OpenSpec change directory is untracked and contains the SDD artifacts, including this required updated report.
- At verification time, HEAD was `28163d2d332153c342e68f8ed72538c69e99301d`; this is historical candidate metadata. The verified remediation was subsequently committed verbatim as `0a70173c5901138e68e03d64f51522e0c2c2cc76`.
- No commit, push, archive, integration, native attempt mutation, or implementation edit occurred during verification; the later authorized commit and token settlement are recorded above.

## Findings

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

None.

## Blockers and next action

Verification blockers: **none**.

Archive is the next action. The passing remediation bytes are committed verbatim, the remediation token is settled complete, and no verification blocker remains. This is a workflow closure, not a verification warning or implementation defect.

`next_recommended: archive`

Archive may proceed without reopening or rerunning apply/verify. No push, integration, or delivery is authorized by this report.
