---
name: chanks-3-despacho-herdr
description: "Trigger: V2 only; explicitly requested chanks-3-despacho-herdr, Herdr dispatch, Pi worker pool, Intercom handoffs or issue patch through Herdr with the Torre off. Dispatch approved work; ordinary parallel work uses chanks-3-paralelo."
disable-model-invocation: true
license: Apache-2.0
metadata:
  author: emili
  version: "2.0"
---

## Activation Contract

V2 only. Load this skill only when the human explicitly names it or explicitly asks for Herdr
dispatch, a Pi worker pool, Pi Intercom handoffs or an issue patch through Herdr. For ordinary
parallel work use `chanks-3-paralelo`. Chanks decides what is worked on and what runs in
parallel; Gentle AI decides how it is implemented, reviewed and delivered, and nothing in this
skill overrides Gentle AI. The transport and evidence rules that used to live in an always-loaded
block are here and in `references/dispatch-protocol.md`.

Activate for separate routes: initial Session dispatch only after the human names the
complete batch of Sesión IDs and assigns each to a specific approved Pi worker;
Issue-Patch Mode after exact human approval for one Control Tower issue and `issue-resolver`,
without a Session batch; human-approved attended reactivation of an existing Session
dispatch after its Pi process disappears; or human-approved attended continuation of an existing issue patch
after its Pi process disappears. Manual pre-V1 dispatch accepts Pi workers only. All routes are explicit
Herdr requests with the Torre off, not Torre dispatch. Herdr owns
only the authorized seats and process topology; Pi Intercom is only the message transport. Dispatch
does not grant execution authority, ODD continuity, plan status, or delivery authority. Preserve the
admitted discriminator: native Encargo work resumes under the same Session identity through native
ODD record/code/evidence reconciliation; legacy work resumes at first pending Módulo for legacy. Load
the `herdr` skill for every Herdr command, flag, and error code.

Read the complete reusable worker-pool declaration before any pool operation:
`references/worker-pool.md` for Control Tower; any other repository declares its own in its
`AGENTS.md`. It is the sole source for the declared workers, their persistent worktrees and tabs, their
preparation command, and its stale-environment predicate. Missing or incomplete declaration fails
closed before branch or agent creation and never falls back to ephemeral per-Session worktrees. Keep
this procedure generic: no hardcoded package manager, worker count, or worker names.

Dispatch and retirement both follow the single shared lock procedure in
`references/retiro.md`'s `## Shared lock protocol` exactly. It is the only lock algorithm and
pathname for this skill: do not restate, vary, steal, or delete it. The declaration is reusable
configuration, not persistent roster or planning state. The Session-only Hard Rules,
Decision Gates, Execution Steps, and Output Contract below apply to Session dispatch;
the explicitly separate Issue-Patch Mode uses only its own route and the shared lock.
Its exception does not weaken any Session admission rule. The distinct attended
reactivation section below does not reuse first-dispatch `LISTO` or fresh-branch rules,
and the distinct attended issue-patch continuation section reuses neither.

For Session dispatch only, under the acquired lock and right after lock acquisition, invoke
`chanks-0-jornada` in its stage-3 dispatch entry mode — diagnosis plus
`jornada.sh --ejecutar` only, never `--reciclar` — so a clean-but-behind declared seat is
current before the lock-held Git/Radar/Herdr readback below. It is
invoked under the dispatch lock, never before it is acquired, because
`jornada.sh --ejecutar` mutates worktrees. Load `../../v2/chanks-0-jornada/SKILL.md` for that
Session entry's exact rules and gates;
do not invoke the Session jornada entry for an issue patch,
whose distinct preparation is specified in Issue-Patch Mode.

## Hard Rules

- Dispatch only the human's explicit complete list of Sesión IDs, each with its approved Pi worker. Never select, add, reorder, or substitute work.
- Reject a non-Pi agent kind before creating anything; never substitute the approved runtime. Every listed Sesión must be `LISTO` in `radar status`; read each contract with `radar sesion <ID>`. Preserve same Session identity for native Encargo continuity and first pending Módulo for legacy; never make topology a fake execution controller.
- Under the acquired lock, right after lock acquisition and before the step that fetches and confirms local master equals remote master, invoke `chanks-0-jornada`'s stage-3 dispatch entry mode (diagnosis + `jornada.sh --ejecutar` only, never `--reciclar`) so a clean-but-behind declared seat is current and eligible; this precedes the lock-held Git/Radar/Herdr readback below, which remains the safety net that proves each worker free, clean, and non-Main. It is invoked under the dispatch lock, never before it is acquired. A dirty or OCUPADO seat surfaces its evidence and exactly one human decision (deliver, save, or discard); until the human decides, the whole batch does not proceed — dispatch releases only its owned lock and launches nothing. Dispatch never drops a seat on its own; the human may instead give a new explicit complete list without that seat, which is a fresh dispatch request. It is never cleaned, stashed, or reset automatically. A missing seat keeps the existing provisioning path. If `jornada.sh` is missing at the target repository root, exits non-zero, or its `--ejecutar` output reports a partial failure (`chanks-0-jornada`'s failure-signal definition: a line with `FALLO`, `CONFLICTO`, or `ABORTADO`, or a non-zero exit), dispatch stops, releases only the owned lock, launches nothing, reports the exact output, and asks the human; it never retries or works around the failure, and does not proceed to the next step on unverified state.
- Under the acquired lock, validate and reserve the complete human-selected batch before the first launch: every Session remains LISTO and compatible, every Session maps to a declared apt worker, and all selected workers are distinct.
- A selected worker is either an existing reusable worker or a declared, explicitly provisionable, not-yet-created worker. An existing worker must prove free, clean, and non-Main from Git, Radar, and a fresh live Herdr readback; a dirty tree, active prior agent, pending delivery, identity mismatch, or ambiguous readback rejects it. Ordinary assignment rejects a missing previously provisioned worker; a partial first provisioning stops ordinary admission and never creates per-Session worktrees.
- `issue-resolver` only handles a human-selected Session backed by a Control Tower issue. Do not infer the issue or reuse an occupied worker.
- Each declared worker's worktree, tab, and dependencies persist. Under the held shared flock and before launch, the complete human batch may reserve an absent declared slot only when its exact worktree path and tab are both absent, its declaration authorizes first provisioning, and no branch, pending delivery, or conflicting identity exists. A partial first provisioning requires fresh maintainer authorization bound to the exact pool declaration plus current Git, Herdr, and path+inode readback; only proof of no agent, Session branch, dirty tree, or pending delivery and remaining artifact identity matching the declaration may complete only the missing provisioning or preparation, then revalidate the complete worker. Any ambiguity preserves artifacts and lock evidence: never remove a persistent worker or infer readiness. First provisioning creates its persistent worktree and tab once from verified master, runs the declared preparation, and the worker then remains persistent. An assignment uses that worker's declared worktree, creates a fresh `work/<id>` branch from verified master, and starts a new Session-named Pi agent in its declared Herdr tab.
- An existing branch or ambiguous readback stops the complete batch without reset or force. Do not launch any agent until every selected worker and branch reservation has succeeded; order cannot cause partial dispatch.
- Run declared preparation only on provisioning or when the declared environment is missing or stale. A valid reassignment performs zero reinstall. Never copy or link dependencies across checkouts.
- Read every tab and agent ID from Herdr's JSON responses; never predict them. Herdr owns only the authorized seats and process topology.
- Parallel-safety, live-reservation, delivery-result, Recurso and closure-ordering rules are in `references/dispatch-protocol.md`.
- Pi Intercom is only the message transport. Intercom never grants selection, assignment, role, permission, review, or delivery authority.
- Human approval binds each exact LISTO Sesión ID, Pi worker alias, cwd/worktree, runtime, and kind, not a Pi session ID. After launch, Main reads each actual Pi session ID from Herdr JSON. Before the first handoff, Main completes fresh Herdr agent readback and one fresh Intercom live-roster identity validation for the entire batch, matching every actual Pi session ID, human-approved alias, declared tab and cwd/worktree against the live roster and the reserved branch against fresh Git readback. Never predict or pre-approve a Pi session ID. A missing, ambiguous, disconnected, or mismatched Intercom identity must send nothing and fail closed before declaring the Sesión dispatched; any failure uses the pre-send owned rollback rule.
- Ordinary Intercom `send` has no wait timeout. A true human decision uses a blocking request initiated by the worker; its worker-initiated human-decision `ask` timeout preserves the worktree and candidate as `BLOCKED`: Main does not guess the answer or report completion.
- Every progress and terminal `send` identifies the exact Sesión and worker. Main answers only an exact inbound human-decision request with `reply`, carrying the human's answer; never an unthreaded substitute or its own `ask`. Main never initiates `ask`.
- Herdr JSON proves only seat and process identity. Intercom delivery results prove only message delivery; neither grants authority or proves work completion. The worker reports terminal result evidence.
- After a confirmed exact handoff only, atomically create S155's `radar.despacho/v1` marker in the Git common dir at `chanks/despachos/<ID>.json`: `schema`, `sesion` (exact Session ID), `worktree` (absolute canonical worker worktree), `branch` (`refs/heads/work/<ID>` full branch ref), and `worker` (approved alias). Verify Git common-dir and existing path identity; never overwrite, symlink-follow, or invent a receipt. An ambiguous delivery has no marker; preserve all artifacts for human reconciliation. A marker-write failure after confirmed delivery is post-send: stop and preserve all artifacts, never roll back or resend. This is observation evidence, not a roster or grant.
- The worker handoff is `assets/worker-handoff.md`. If a valid approved unattended seal exists, carry its complete unmodified contract in the handoff; check identity, base, digest, expiry, and permission/commit ceiling before sending. Missing/stale/mismatched seals grant nothing; the worker independently revalidates at kickoff.
- Before the first handoff, preparation, branch, launch, batch-readback, or roster-validation failure closes only agents launched by this batch and cleans only new branches created by this batch. Preserve worker worktrees, tabs, and dependencies. Release only an owned lock after proven rollback; ambiguous rollback retains the lock and asks the human.
- After the first handoff is sent, never roll back, clean, reset, delete, or close any batch branch or agent: a later send failure or ambiguity preserves all worker branches, worktrees, tabs, agents, and candidates, marks unsent or uncertain Sessions `BLOCKED` for human reconciliation, and never resends or infers delivery. Main remains non-waiting and does not poll.
- Stop and offer `chanks-3-paralelo` when `HERDR_ENV=1` is absent. On an ambiguous or failed Herdr response, use the owned rollback rule and stop.
- Never load `torre-control`, never read or write `.git/control-tower/ACTIVE` or `~/.local/share/control-tower/`, and never answer a blocked agent's question for the human outside that exact inbound human-decision `reply`.
- The dispatched agent commits only on `work/<id>`; it never pushes master and never writes `openspec/plan.yaml`. The responsible parent integrates one Sesión at a time and solely writes `openspec/plan.yaml`.
- A later disconnect creates no polling, retry, inferred completion, transport fallback, or autonomous resume. Human reactivation and reapproval are required before any new dispatch.
- No retries, persistent queue, roster, state, autonomous resume, non-Pi fallback, or provisional cross-runtime bridge. Tower V1 remains the future heterogeneous and hybrid owner.

## Issue-Patch Mode (not Session dispatch)

Use this mode only for a human-authorized repair of a reproducible error in an already
approved flow, backed by one Control Tower issue. Read `assets/issue-patch-handoff.md`.
The approval must name issue identity, exact Git base commit, restoring outcome, the
`issue-resolver` worker, exact repository file set, exact shared Cimientos and non-file
Recursos (explicitly empty if none). Validate every path as an exact canonical repo file,
not a directory, glob, symlink, or escape; include all changed files in the approved set.
Compare actual candidate intent to the issue symptom: new product outcome, API,
permissions, migration or data changes need Session authority, not this mode. An
issue/approval alone does not grant a live seat or mutation.

1. Under the existing `references/retiro.md` `## Shared lock protocol`, re-read the
   complete pool declaration, current integrated local/remote master commit, Git worker
   state, Herdr seat, and active Sessions from installed Radar. Obtain each active
   Session's exact files, Cimientos, and Recursos from current Radar contracts, and
   reconcile live assignments, pending delivery, in-flight interventions, and worker
   unintegrated changes against fresh Git/Herdr/Intercom evidence. Unknown or missing
   scope (including an active Session's), inconsistent active identity, or unavailable
   readback is **not** an empty set. Require same verified base for comparisons; no
   Radar compatibility forecast is an issue-patch compatibility verdict. Check exact
   file intersections (including Cimientos) and Recurso intersections with **every**
   active Session; a collision refuses the patch, not the Session. Do not treat a
   shared Cimiento as automatically free or silently grant an intervention.
2. Confirm human approval still binds that exact base, issue, outcome and sets; prove
   `issue-resolver` is clean, free, non-Main, has no active agent/pending delivery,
   and matches its persistent tab/worktree declaration. If missing or stale environment,
   use only the declaration's preparation predicate; do not run the Session batch's
   `chanks-0-jornada --ejecutar` over occupied seats. A missing or partially
   provisioned declared worker stops for its separately authorized provisioning
   route, not an improvised worktree. Reserve a fresh issue-specific
   `work/issue-<number>` branch from the verified base; collision or ambiguous branch
   ownership stops without reset or reuse; there is no automatic reuse, and a human may
   continue an existing patch branch only through Attended Continuation of an Existing
   Issue Patch. Never use `work/<Session ID>` for a patch.
   Recheck base, active sets, worker availability and approval immediately before launch;
   on drift stop and ask for new exact human authorization, not an inferred update.
3. Launch a new Pi agent in the declared Herdr tab. Herdr JSON must identify the
   actual launched agent and its **Pi session ID**. Before any Intercom `send`, read
   back the launched agent in Herdr and a fresh Intercom live roster and match the
   actual Pi session ID, alias, tab, cwd/worktree and branch. Never predict the ID,
   bind an unlaunched session, or substitute tab name/alias for session identity.
   If identity is unavailable or mismatched, do not send. Before first send, only
   proven owned branch/agent changes may be rolled back under the shared protocol;
   preserve the persistent worktree, tab, dependencies and unrelated evidence.
4. Recheck approval/base/compatibility immediately before first send. Send the exact
   `assets/issue-patch-handoff.md` contract by fire-and-forget Intercom `send` to the
   verified Pi session ID. A confirmed delivery proves only transport. An ambiguous
   or failed send preserves branch, worktree, agent, and candidate; never resend,
   poll, infer receipt, close, or reassign. No patch `radar.despacho/v1` marker,
   fake `LISTO` Session, replacement queue, ledger, or plan entry is created.
5. The worker must independently revalidate exact approval, base and current active
   sets before its first write and after any scope/base change. Any unknown, conflict,
   drift, or expanded file/Resource request stops the patch for fresh human approval
   and comparison. It sends issue-bound progress/terminal evidence; a human decision
   is a worker-initiated `ask` answered only via exact inbound `reply`. On disconnect
   or timeout preserve candidate and request human reconciliation; no fallback route
   exists except a fresh human-approved Attended Continuation of an Existing Issue Patch.
6. For an inbound terminal, use `chanks-3-coordinador-manual` patch mode. Only a
   freshly verified actual Pi sender, immutable full commit OID, exact worker branch,
   expected base, approved changed files and successful focused checks can enter
   serial integration. Verify branch tip equals that full OID, candidate descends
   from the approved base, and its complete Git changed-file set matches approved
   exact files before mutation. Integrate only in a way that preserves that exact
   commit OID in master history; conflict or an unverified rewrite stops. If master
   has advanced, rerun exact active compatibility and obtain fresh human approval
   of the new base before integration; do not silently rebase or reuse the old
   approval. Integration/closure precede patch retirement; closure follows
   `references/issue-patch-closure.md`.

Report the issue/approval/base, exact set comparisons, worker/branch/actual Pi
session identity, confirmed or uncertain delivery, and each stop reason. On terminal,
report immutable candidate/check/integration/closure/retirement evidence or the
precise missing proof; do not report an issue as fixed from static policy alone.
This mode leaves the Session-only execution steps, kickoff, marker and six Session
retirement checks unchanged. It does not execute a patch merely by documenting it.

## Attended Reactivation of an Existing Session Dispatch

This is not first dispatch, not Issue-Patch Mode, and not autonomous recovery. It
accepts only the same Session already `EN CURSO` with an existing `radar.despacho/v1` marker.
An existing issue patch is never a Session reactivation: it continues only through
Attended Continuation of an Existing Issue Patch below.
The original Pi process must be absent; a missing marker, another occupant, a terminal
result awaiting integration, or an uncertain prior handoff is not permission to launch.
Keep the same Session, same worker, same branch, same worktree, and same candidate;
never create, replace, delete, or amend the marker or branch, and never clean, reset,
stash, or replace candidate bytes. Its `review_ready` evidence, if present, remains
untouched; conflicting delivery evidence stops rather than being recast as resume.

1. Obtain fresh exact human approval for **attended reactivation**, bound to the
   existing marker identity, Session ID, declared Pi worker/tab/canonical worktree,
   full branch ref, approved integrated base commit, restoring outcome, and current
   candidate state. A previous dispatch, transport receipt, optional unattended seal,
   or approval for another base/worker does not authorize this operation. Attended
   reactivation requires no unattended seal and does not apply sealed review consent.
   An unattended request is a different decision requiring a currently valid exact seal
   and its own authority; an expired or absent seal never authorizes unattended work.
2. Use `references/retiro.md`'s `## Shared lock protocol` for the whole admission,
   launch, and handoff. The responsible parent either already owns and retains that
   lock for this run or acquires it through that protocol; do not reacquire a lock
   held by the same run, invent another lock, or release a foreign owner's record.
   Under the owned lock, reconcile fresh Git, Radar, Herdr, and Intercom readbacks:
   local/remote integrated master equals the approved integrated base; Radar reports
   this exact Session `EN CURSO` and its current exact files/Cimientos/Recursos;
   the regular no-follow marker in the canonical Git common dir has schema,
   Session, worker, absolute worktree, and full branch ref matching approval;
   the existing worker branch/worktree match that marker, descend from the base,
   and preserve the current candidate. Verify the originally dispatched Pi session
   and handoff evidence, original Pi process absent from fresh Herdr and Intercom,
   declared tab free, no foreign agent, no pending delivery or terminal claim, and
   fresh compatibility against other active Sessions. Missing, contradictory,
   foreign, or ambiguous identity/scope/base/candidate evidence stops without worker
   mutation; an `EN CURSO` status or marker alone proves neither authority nor loss.
3. Recheck approval, base, marker identity, candidate and live evidence immediately
   before launch. Only with all prerequisites still true, launch a new Pi process
   in the same declared tab and preserved worktree, without touching the branch or
   marker. Read its actual new Pi session ID from Herdr JSON (never predict one).
   Read back that exact agent, tab, cwd/worktree and a fresh Intercom live roster;
   match the actual ID, approved alias and branch with fresh Git. Failure before
   sending uses the pre-send owned rollback: close only a provably newly launched
   agent, preserve marker, branch, worktree, candidate and persistent seat. If close
   is ambiguous, retain the owned lock for human reconciliation; never erase evidence.
4. Recheck the exact human approval, base, candidate and Session compatibility before
   a distinguishable reactivation handoff headed `REACTIVATION HANDOFF`, carrying the
   original and actual new Pi session IDs, original marker identity, current branch
   tip/candidate, same-Session native ODD record/code/evidence reconciliation (or
   first pending legacy Módulo), exact files/Cimientos/Recursos and attended/no-seal
   status. Send it once via fire-and-forget Intercom to the verified new Pi session ID.
   A confirmed send proves only transport, never resumption or completion. A failed
   or ambiguous send preserves marker, branch, worktree, candidate and launched
   agent; never resend, retry, infer completion, or auto-resume. Release only an
   owned lock after proven success or rollback; on ambiguous post-send state retain
   evidence and request human reconciliation under the shared protocol.
5. The worker independently revalidates same Session, marker, base, branch, candidate,
   human approval and live compatibility before writing. Subsequent progress and
   terminal evidence uses the same Session/worker and actual new Pi ID. Main verifies
   that identity before any terminal integration; human decisions remain worker-initiated
   threaded `ask`/exact Main `reply`. This route changes no issue-patch admission,
   Session kickoff rule, marker schema, plan progress, or Session retirement checks.

## Attended Continuation of an Existing Issue Patch

This is not first dispatch, not Session reactivation, and not autonomous recovery. It
accepts only an existing issue patch: the same Control Tower issue still open, the
same `issue-resolver` worker, the existing `work/issue-<number>` branch and its
persistent worktree, and the current candidate (zero changes, or committed work on
that branch). It is the only human-approved way to continue an existing patch branch
after its Pi process is gone; it never reuses a branch automatically. It changes no
Session rule, first-dispatch rule, or Session reactivation rule.

1. Obtain fresh exact human approval for **attended issue-patch continuation**, bound
   to the issue number, worker/tab/canonical worktree, full branch ref and current
   tip OID, approved base commit, restoring outcome, the unit or scope being
   continued, the exact file set, and exact Cimientos and Recursos (explicitly empty
   if none). The route requires no seal, and a seal never authorizes it. A previous
   dispatch, transport receipt, or approval for another base, branch or worker does
   not authorize it.
2. Use `references/retiro.md`'s `## Shared lock protocol` for the whole admission,
   launch and handoff; do not reacquire a lock held by the same run, invent another
   lock, or release a foreign record. Under the owned lock, reconcile fresh Git, Radar,
   Herdr, and Intercom readbacks: local and remote master; the branch exists in that
   worktree and descends from the approved base; the worktree is clean or its dirty
   state exactly equals the recorded candidate; previous Pi process absent from Herdr
   and Intercom; declared tab free; no foreign occupant; no pending delivery or
   unintegrated terminal claim awaiting integration; and fresh exact-file, Cimiento
   and Recurso compatibility against every active Session, with the same rules as
   step 1 of Issue-Patch Mode. Missing, contradictory or ambiguous evidence stops
   without worker mutation.
3. Base advance: when master advanced beyond the branch base, the approval must
   name the new base explicitly. Only a branch with zero commits of its own (its tip
   equals the old base, an ancestor of master) may be brought forward, by fast-forward
   only: `git merge --ff-only <new base>` in that worktree. Never reset, rebase, or
   rewrite a branch that has its own commits; that case stops for a human decision.
4. Never create, delete, rename, recreate, reset, or amend the branch; never clean or
   stash the worktree; never rescue or reuse the previous Pi session ID.
5. Recheck approval, base, candidate and compatibility immediately before launch. Only
   with every prerequisite still true, launch a new Pi in the same declared tab and
   worktree. Read its actual new Pi session ID from Herdr JSON (never predict it), then
   read back that agent, tab and cwd/worktree in Herdr and a fresh Intercom live roster,
   and match the ID, approved alias and tab, and the branch through fresh Git.
   Failure before sending uses the pre-send owned rollback: close only a provably newly
   launched agent and preserve branch, worktree, candidate and persistent seat. If
   the close is ambiguous, retain the owned lock for human reconciliation.
6. Recheck approval, base, candidate and compatibility again, then send once, by
   fire-and-forget Intercom to the verified new Pi session ID, the handoff headed
   `ISSUE-PATCH CONTINUATION HANDOFF` from `assets/issue-patch-handoff.md`. It carries the
   previous and actual new Pi session IDs, branch tip and candidate, the approved unit
   scope, and attended/no-seal status. A confirmed send proves only transport. A failed
   or ambiguous send preserves branch, worktree, candidate and launched agent; never
   resend, retry, infer completion, or auto-resume.
7. The worker revalidates approval, base, branch, candidate and active-Session sets
   before its first write, exactly as step 5 of Issue-Patch Mode. Terminal handling is
   unchanged: step 6 of Issue-Patch Mode and `chanks-3-coordinador-manual` patch mode.
   No `radar.despacho/v1` marker, fake `LISTO` Session, queue, ledger, or plan entry
   is created.

## Decision Gates

| Condition | Action |
|---|---|
| No complete human list, a listed Sesión is not `LISTO`, a declared worker is not Pi, or the worker-pool declaration is incomplete | Release only an owned lock, create nothing, and report the failed prerequisite. |
| `chanks-0-jornada`'s stage-3 dispatch entry reports a dirty or OCUPADO seat | Report its evidence; ask exactly one decision (deliver, save, or discard); until the human decides, the whole batch does not proceed — release only the owned lock and launch nothing; never clean, stash, or reset it automatically. The human may instead give a new explicit complete list without that seat, which is a fresh dispatch request. |
| `jornada.sh` is missing at the target repository root, exits non-zero, or its `--ejecutar` output reports a partial failure (`chanks-0-jornada`'s failure-signal definition: a line with `FALLO`, `CONFLICTO`, or `ABORTADO`, or a non-zero exit) | Release only the owned lock and launch nothing; report the exact output; ask the human; never retry or work around it. |
| The batch has a Cimiento or Recurso conflict, duplicate/undeclared/unapt worker, branch collision, or any failed reservation | Release only an owned lock; launch zero agents. Do not dispatch a prefix of the batch. |
| An existing worker is dirty, Main, occupied, pending delivery, identity-mismatched, unavailable in fresh Git/Radar/Herdr readback, or missing after prior provisioning | Release only an owned lock; create nothing and never infer reuse. |
| Partial first provisioning (exact worktree without declared tab, tab without worktree, or interrupted preparation) | Stop ordinary admission. Under the owned flock, resume only with fresh maintainer authorization bound to the exact pool declaration plus current Git/Herdr/path+inode readback; prove no agent, Session branch, dirty tree, or pending delivery and remaining artifact identity matching the declaration, complete only missing provisioning/preparation, then revalidate as complete. Any ambiguity or drift stays `BLOCKED`: preserve artifacts and lock evidence; never remove a worker or infer readiness. |
| An absent declared slot lacks explicit first-provisioning authorization, or has a branch, pending delivery, or conflicting identity | Release only an owned lock; create nothing and never infer reuse. |
| `issue-resolver` lacks a human-selected Control Tower issue-backed Session | Release only an owned lock; create nothing. |
| Before the first handoff, preparation, branch creation, Herdr launch, batch readback, or complete roster validation fails | Close only this batch's launched agents and clean only this batch's new branches. Preserve the declared worker. Retain the lock and ask the human if rollback is ambiguous. |
| After the first handoff, a send fails or is ambiguous | Preserve all branches, worktrees, tabs, agents, and candidates; mark unsent or uncertain Sessions `BLOCKED` for human reconciliation. Never roll back, resend, infer delivery, wait, or poll. |
| A later Intercom disconnect occurs | Do not poll, retry, infer completion, use a transport fallback, or resume; require human reactivation and reapproval before a new dispatch. |
| A worker-initiated human-decision `ask` times out | Preserve the worktree and candidate as `BLOCKED`; never guess the answer or report completion. |
| `HERDR_ENV` is not `1` | Stop; offer `chanks-3-paralelo`. |
| The responsible parent recorded a dispatched Sesión's delivery | Run the persistent-worker retire mode in `references/retiro.md`. |

## Execution Steps

1. Read the complete reusable worker-pool declaration (`references/worker-pool.md` for Control Tower). Reject missing or incomplete declaration before creating branches or agents.
2. Acquire the lock exactly through `references/retiro.md`'s `## Shared lock protocol`, including its bounded stale-lock recovery; prove byte-identical ownership before any release. Use only its normal-acquisition or expressly authorized recovery path; every other pre-existing, partial, unreadable, ambiguous, or foreign state stops without mutation.
3. Under the acquired lock, right after lock acquisition and before the next step, invoke `chanks-0-jornada` in its stage-3 dispatch entry mode: diagnosis plus `jornada.sh --ejecutar` only, never `--reciclar`. It is invoked under the dispatch lock, never before it is acquired, because `jornada.sh --ejecutar` mutates worktrees. A clean-but-behind declared seat is now current, brought up from verified master; this dispatch still creates each reserved `work/<id>` branch itself later in this procedure. A dirty or OCUPADO seat surfaces its evidence and exactly one human decision (deliver, save, or discard); until the human decides, the whole batch does not proceed — release only the owned lock and launch nothing. Dispatch never drops a seat on its own; the human may instead give a new explicit complete list without that seat, which is a fresh dispatch request. It is never cleaned, stashed, or reset automatically. A missing seat keeps the existing provisioning path below. If `jornada.sh` is missing at the target repository root, exits non-zero, or its `--ejecutar` output reports a partial failure (`chanks-0-jornada`'s failure-signal definition: a line with `FALLO`, `CONFLICTO`, or `ABORTADO`, or a non-zero exit), stop, release only the owned lock, launch nothing, report the exact output, and ask the human; never retry or work around it, and do not proceed to the next step on unverified state.
4. Under the acquired lock, fetch and confirm local master equals remote master; that commit is the base. Re-read `radar status` and `radar sesion <ID>` for every human-selected Session.
5. Under the acquired lock, collect Git, Radar, and fresh live Herdr readback for every selected declared worker. For an existing reusable worker, prove it is free, clean, non-Main, has no pending delivery or active prior agent, and has its exact declared identity. Partial first provisioning stops ordinary admission; resume only through the exact authorized repair route in the failure matrix.
6. Under the acquired lock, validate and reserve the complete human-selected batch: all Sessions remain LISTO and compatible, no Cimiento or Recurso conflict exists, each maps to a distinct declared apt worker, `issue-resolver` has its Control Tower issue, and every `work/<id>` is absent. Reserve an absent declared slot only if its declaration authorizes first provisioning and no branch, pending delivery, or conflicting identity exists. If any check fails, release only the owned lock and launch zero agents.
7. For each reserved absent explicitly provisionable slot, Provision its persistent worktree and tab once from the verified master, run the declared preparation, and record the created tab from Herdr JSON; it then remains persistent. For every existing worker, run declared preparation only when the declaration proves the environment missing or stale; otherwise perform zero reinstall. Create each reserved fresh `work/<id>` branch from the verified master in its persistent declared worktree; any late conflict triggers rollback before any agent launch.
8. Open or reuse only the declared worker's Herdr tab, which is existing or provisioned, start a new Pi agent named after the Session, and record the tab, agent and actual Pi session ID from Herdr JSON. Do not predict IDs.
9. Read back every agent launched by this batch, then complete one fresh Intercom live-roster readback and identity validation for every worker in the batch, matching the actual Herdr Pi session ID to the live roster's session ID, the human-approved alias, declared tab and cwd/worktree, and the reserved branch to fresh Git readback. Never substitute an alias or tab for a missing Pi session ID. Any failed or ambiguous batch readback or identity sends nothing and uses the pre-send owned rollback rule.
10. Only after every worker passes, send the independent fire-and-forget handoffs from `assets/worker-handoff.md` with Intercom `send`; carry the full valid approved unattended seal when present. The worker runs `../../v2/chanks-3-session-kickoff/SKILL.md` inside its own tab. Two approved Pi workers receive independent fire-and-forget handoffs: ordinary `send` has no wait timeout, so Main sends worker 2 without waiting for worker 1; Main returns after the delivery result for each handoff; Main performs no ordinary `herdr agent wait`, `prompt --wait`, poll, or `intercom ask`. Persist the atomic marker only for each confirmed exact Session/worker/cwd handoff; no marker for ambiguous delivery. After the first send, any later send failure or ambiguity preserves all batch artifacts and marks unsent or uncertain Sessions `BLOCKED` for human reconciliation; never resend, infer delivery, or roll back.
11. Workers send progress to Main through Intercom and send terminal `COMPLETED`, `BLOCKED`, or `FAILED` events; every progress and terminal `send` identifies the exact Sesión and worker. The worker reports terminal result evidence. A true human decision uses a worker-initiated `ask`; Main answers only an exact inbound human-decision request with `reply`, carrying the human's answer, never an unthreaded substitute or its own `ask`. Main never initiates `ask`. If that `ask` times out, preserve the worktree and candidate as `BLOCKED`; do not guess the answer or report completion.
12. A later disconnect creates no polling, retry, inferred completion, transport fallback, or autonomous resume. Require human reactivation and reapproval before a new dispatch. After the responsible parent integrates and records a Sesión, run the retire mode in `references/retiro.md`.

## Output Contract

Return one row per Sesión — Sesión · declared worker · worktree · branch · tab · agent · actual Pi session ID — with IDs
from Herdr JSON; the complete lock/reservation result; each refused Sesión and its exact reason;
Git, Radar, Herdr, Intercom, preparation, branch, launch, readback, rollback, and retirement
outcomes, including marker presence only for confirmed exact handoffs and the seal status. Include one fresh complete-batch Intercom live-roster readback and one Intercom delivery result per exact
Sesión/worker handoff, worker progress and terminal events, and every blocked agent needing the
human. Herdr JSON proves only seat and process identity; Intercom delivery results prove only
message delivery; neither grants authority or proves work completion. The worker reports terminal
result evidence. Include `chanks-0-jornada`'s stage-3 diagnosis, what `--ejecutar` brought
current, and — if a dirty/OCUPADO seat or a jornada failure stopped the whole batch — that the
batch did not proceed, only the owned lock was released, and nothing was launched, pending the
human's decision or a fresh dispatch request without that seat.

## References

- `references/retiro.md`
- `references/dispatch-protocol.md`
- `references/issue-patch-closure.md`
- `references/worker-pool.md`
- `assets/worker-handoff.md`
- `assets/issue-patch-handoff.md`
- `herdr` skill, emitted by `herdr --skill`
- `../../../skills/chanks-3-paralelo/SKILL.md` — the V1 route for ordinary parallel work
- `../../v2/chanks-3-session-kickoff/SKILL.md`
