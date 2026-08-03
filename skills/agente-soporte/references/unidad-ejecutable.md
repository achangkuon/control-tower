# Executable Units, Conflicts, and Counts

The planning pass. Everything here produces a proposal for the maintainer; nothing
here delivers.

## Context Schema

Record before proposing anything:

```yaml
project:
  repository: <verified identity>
  remote_and_base: <discovered ref and SHA>
  instructions: [<authoritative files>]
  canonical_status_index: [<files>]
  reservations: [<active records>]
  forge_state: [<PRs/merges/remote SHAs>]
unit:
  id: <stable-id>
  objective: <bounded outcome>
  source: [<instruction/plan/spec/status references>]
  allowed_scope: [<paths/behaviors>]
  forbidden_scope: [<paths/behaviors>]
  dependencies: [<unit/merge/decision>]
  shared_resources: [<db/config/contract/lock/release target>]
  tests: [<commands/scenarios/evidence>]
  db_mode: none|read|write|schema
  confidence: high|medium|low
  assigned_worktree: <verified path|pending user verification>
coordination:
  requested_agents: <N|not specified>
  recommended_agents: <M>
  maximum_safe_agents: <K>
  conflicts: [<edges and checkpoints>]
  queue_position: <position|read-only>
```

Gather in this order: repository instructions; canonical status/index; active
reservations; relevant plan/spec/status; Git and forge authority; tests and config
only after scope is understood. Repository/Git/forge resolve technical truth;
executive documentation supplies priority. Record discrepancies as drift.

Do not invent worktrees, branches, bases, plans, commands, or scopes. Exclude closed
work. Use discovery/read-only work or report a blocker when implementation authority
is insufficient.

## Conflict Graph

One node per executable unit. Add an exclusive edge when units overlap in
paths/globs, functional area, source of truth, generated outputs,
migrations/schema/DB writes, destructive tests, lockfiles/root config,
package/contracts, release targets, active reservations, or an unmerged dependency.

Classify each pair:

- `independent` — no exclusive edge.
- `parallel_with_checkpoint` — may code concurrently, but one waits and rebases before
  delivery. Name who waits, the exact unblock evidence, and what must be revalidated.
- `serial` — cannot safely start implementation together.
- `blocked` — missing plan, access, user action, or environment prerequisite.

Never use line count as a proxy for independence.

The DB semaphore is orthogonal to the Git delivery token. At most one shared DB
`write|schema` operation may hold its discovered semaphore. Reads may run
concurrently only when project policy and a stable window permit it.

## Counts

Always report:

```text
Requested agents: <N|not specified>
Recommended agents: <M>
Maximum safe agents: <K>
```

`K` is the largest currently executable independent set after conflicts,
reservations, dependencies, DB policy, and assigned-worktree verification. `M` is the
useful count now, reduced for uncertainty or coordination cost. `N` is user intent,
never a quota. Never create filler lanes, and never invent review-only busywork to
reach a number.

If verified work does not fill the requested count, start only what is genuinely
ready, defer the rest without a speculative brief, and report requested, runnable-now,
and deferred separately.

## Proposed Order

1. Prerequisites that unblock other units first: DB/schema, shared contracts,
   generated interfaces, shared configuration.
2. Among independent candidates, prefer lower conflict/risk and stronger evidence;
   break ties by readiness time.
3. A DB proof still pending blocks DB-dependent consumers but not unrelated delivery.

The Tower enforces the order and owns the token. This file only proposes it.

## Approval and Recalculation

Before any brief is delivered, show verified sources, executable units, conflict
edges, the three counts, DB owner and semaphore needs, dependencies, worktree
verification, queue position, blockers, and confidence. Obtain explicit approval.

Recalculate and renew approval after material changes to scope, unit count,
dependencies, shared resources, DB mode, worktree assignment, base, reservation, or
remote state. A changed count or scope invalidates the previous approval.

## Reconciliation First

When the user says a proposed unit was already implemented, treat it as a correction
signal and verify criterion by criterion against current `origin/main`, source and
tests, merged PRs, and commit history. Do not reassign from a stale plan checkbox.
Record user-provided task states separately from repository proof.
