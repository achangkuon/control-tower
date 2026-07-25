# SDD Tower Implementation — roles and macro flow

> **Status:** architectural exploration; not implemented or approved as a runtime contract.
>
> **Purpose:** preserve the proposed multi-slice workflow so it can be reviewed and continued without reconstructing the discussion.

## Core decision

`SDD Tower Implementation` coordinates two concurrent lanes:

1. **Planning lane:** agents advance future slices through SDD up to `tasks`.
2. **Implementation lane:** a fresh agent reconciles and resumes one eligible slice at `sdd-apply`.

The Control Tower remains a reliable mechanism. It transports durable handoffs, exposes state, wakes existing sessions, and serializes shared resources. It does **not** inspect source code, interpret OpenSpec, choose product scope, or implement work.

## Responsibility map

| Role | Owns | Receives | Produces | Must not do |
|---|---|---|---|---|
| **Maintainer** | Product intent, autonomy limits, irreversible decisions and exceptions | Escalations and policy decisions | Approved plan, limits and decisions | Relay every routine handoff manually |
| **Policy agent** *(candidate new role)* | Macro DAG, eligibility rules and routing between slices | Structured reports from worktree agents | Next authorized investigation or execution instruction | Inspect code, implement, deliver, or invent missing evidence |
| **Support agent** | Initial work decomposition, conflict graph, safe agent count and assignment briefs | Maintainer objective and repository-level reports | Proposed executable units and approved briefs | Join the Tower, hold locks, coordinate delivery, or own the continuous loop |
| **Tower runtime** | Durable messages, observable state, locks, wake-up transport and handoff persistence | Validated commands and reports | Stored messages, state and exclusive-resource custody | Read plans, investigate repositories, decide what follows, or launch implementation itself |
| **Delivery coordinator** | Delivery ordering and custody of the delivery token | `READY` reports and delivery evidence | One delivery green light at a time and verified closure | Plan or implement slices |
| **SDD planning agent** | One future slice from exploration/proposal through `tasks` | Approved slice objective and dependency assumptions | Provisional SDD artifacts and planning report | Start `apply` or silently assume unmerged dependencies |
| **Slice executor** | One slice from reconciliation through `sdd-apply`, `sdd-verify` and delivery handoff | Prepared SDD, binding delta, current base and authorized scope | Implementation, verification evidence and final binding delta | Carry multiple slices in one growing session or change product intent silently |
| **Outgoing executor** | Technical truth about the slice it just completed | Actual implementation and verification result | **Binding delta** for the next slice | Rewrite the next SDD directly or discard approved intent |

> Planner, reconciler and executor are session roles. They should normally be fresh sessions scoped to one slice, not permanent agents accumulating every slice's context.

## Authority model

Two sources of truth coexist without competing:

| Authority | Source of truth for |
|---|---|
| Approved plan / SDD | Product intent, desired behavior, scope and acceptance criteria |
| Outgoing executor's binding delta | What was actually implemented, resulting contracts, deviations, new constraints and technical consequences |

Neither source silently overrides the other. A conflict enters reconciliation and may require a maintainer decision.

## The binding delta

At the end of every implemented slice, the outgoing executor produces a durable report containing at least:

- completed slice and exact resulting base;
- behavior and contracts actually implemented;
- deviations from the approved SDD;
- decisions that became fixed during implementation;
- dependencies satisfied, changed or newly discovered;
- impact on the prepared SDD of the next slice;
- recommended next implementation scope;
- blockers and required maintainer decisions;
- verification and delivery references.

The binding delta is authoritative technical input for the next slice. It does not grant authority to change product intent.

## Macro flow

```text
Maintainer approves the initiative and autonomy limits
                         │
                         ▼
                 `torre on` activates
              transport, state and wake-up
                         │
                         ▼
Policy agent requests a plan-readiness investigation
                         │
                         ▼
Worktree agent reports the canonical plan, DAG and blockers
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
      PLANNING LANE          IMPLEMENTATION LANE

Planner for Slice N+1        Fresh executor for Slice N
explore → proposal           reconcile prepared SDD
→ spec → design              + previous binding delta
→ tasks                      + current merged base
              │                     │
              │                     ▼
Planner for Slice N+2        sdd-apply → sdd-verify
explore → ... → tasks                │
              │                     ▼
              │              delivery serialized
              │                     │
              │                     ▼
              │            binding delta for N+1
              │                     │
              └──────────┬──────────┘
                         ▼
Policy agent asks the next worktree to investigate readiness
                         │
                 READY / BLOCKED report
                         │
          READY ─────────┴───────── BLOCKED
            │                          │
            ▼                          ▼
Fresh executor starts       Policy routes to planner,
from reconciliation/apply   maintainer or dependency owner
```

## Reconciliation before apply

A prepared SDD is provisional until its dependencies have landed. The fresh executor for the next slice must begin with reconciliation:

```text
prepared proposal/spec/design/tasks
                  +
previous slice binding delta
                  +
current merged base and dependency reports
                  │
                  ▼
            RECONCILIATION
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   READY_FOR_APPLY        BLOCKED
        │                   │
        ▼                   └─ exact missing decision/evidence
   resume at sdd-apply
```

Reconciliation may update technical design/tasks when the binding delta requires it. It must not reopen product scope without maintainer approval. If the prepared artifacts remain valid, planning phases are not repeated.

## Example: Slices 6, 7 and 8

```text
Slice 6: implementation in progress
Slice 7: SDD prepared through tasks; blocked on post-Slice-6 reconciliation
Slice 8: SDD prepared through tasks; blocked on merged Slice-6/Slice-7 contracts
```

Projected execution:

```text
Slice 6 verified and integrated
  → outgoing Slice-6 binding delta
  → fresh Slice-7 reconciliation agent investigates
  → READY
  → fresh Slice-7 executor: apply → verify → delivery
  → outgoing Slice-7 binding delta
  → fresh Slice-8 reconciliation agent investigates
  → READY
  → fresh Slice-8 executor: apply → verify → delivery
```

## Scalability rules

The model scales only with bounded autonomy:

1. **Planning horizon:** prepare at most a configured number of future slices.
2. **WIP limit:** parallel apply is limited by the verified conflict graph and isolated worktrees.
3. **Fresh execution context:** one executor session per slice or independently reviewable work unit.
4. **Mandatory reconciliation:** every prepared SDD is checked against the current merged base before apply.
5. **Explicit dependencies:** eligibility comes from structured reports, never agent memory or Tower inference.
6. **Serialized delivery:** implementation may be parallel; shared Git/DB delivery remains ordered.
7. **Autonomy budget:** cap how many slices may advance without maintainer observation.
8. **Fail-closed blockers:** missing evidence produces `BLOCKED`, not investigation or improvisation by the Tower.

## Multi-host coverage and Intercom discovery

The active implementation plan already targets all three required hosts through one host-neutral contract:

| Slice | Host responsibility | Planned wake boundary |
|---|---|---|
| **P7** | Host-neutral controller plus OpenCode adapter | `client.session.promptAsync` after a non-consuming pending peek |
| **P8** | Thin Pi adapter over the P7 controller | `pi.sendMessage(..., { deliverAs: "followUp", triggerTurn: true })` after current-root and idle revalidation |
| **P9** | Thin Claude adapter over the P7 controller | Claude `Stop`/`SessionEnd` lifecycle with bounded `asyncRewake` and subagent isolation |

P11 already requires the shared `CT-R5-S1..S5` conformance matrix across OpenCode, Pi and Claude. Multi-host support is therefore not a missing capability.

### What the Intercom incident adds

`pi-intercom` is a concrete proof that Pi can:

- discover and address local Pi sessions;
- observe idle/busy lifecycle state;
- queue an inbound message while the recipient is busy;
- inject a visible message with `pi.sendMessage`;
- trigger a new turn automatically when the recipient is idle.

This is useful reference behavior for P8, but Intercom is not Tower authority. Its broker routes messages; it does not provide the Tower's immutable handoff, validation, claim, acknowledgement, completion, budget, lock or recovery guarantees.

The incident exposes one boundary that must be explicit in P8 reconciliation and shared adapter conformance:

> **Wake transport is not work authorization.**

Required behavior:

```text
host adapter detects pending work
  → sends descriptor-free generic wake
  → resumed agent performs guarded Tower receive
  → agent claims the exact durable delivery
  → agent acknowledges the claim/effect boundary
  → only then may implementation effects begin
```

An unsolicited Intercom message, generic prompt or host lifecycle event cannot substitute for `receive → claim → ack`. The adapter must never embed domain payloads, bearer tokens, authority evidence or implementation instructions in its wake envelope.

P8 reconciliation should inspect and pin the installed Pi/Intercom lifecycle behavior as evidence, then explicitly decide whether Intercom is only a reference implementation or an approved transport dependency. That decision must not weaken the host-neutral P7 contract or make P8 depend on an unvalidated message as authority.

## Skill topology candidate

`SDD Tower Implementation` should be a router/orchestrator, not a monolithic skill:

```text
sdd-tower-implementation
├── agente-soporte                  # initial decomposition only
├── policy agent                    # macro DAG and routing
├── sdd planning phases             # future slices through tasks
├── slice reconciliation            # binding delta + prepared SDD + merged base
├── sdd-apply / sdd-verify          # one authorized slice
└── torre-control-entregas          # serialized delivery and closure
```

Each child keeps one authority. The parent owns only route selection, ordering, shared gates and the final result envelope.

## Open decisions

- Should the policy role be a dedicated persistent agent or a parent-router behavior?
- What exact schema must the binding delta use?
- Who validates a binding delta before publication?
- How is the canonical initiative plan discovered without making the Tower inspect it?
- What planning horizon and unattended-slice budget should be the defaults?
- When does drift require a technical reconciliation versus a new product approval?
- How are planning and implementation worktrees named and reserved without conflicts?
- What mechanism launches a genuinely new session after the Tower has persisted its handoff?

## Resume point

Continue by deciding the placement and authority of the **policy agent**. Then define:

1. its inputs and output envelope;
2. the binding-delta schema;
3. the macro state/DAG transitions outside the Tower store;
4. the pilot path for Slices 6 → 7 → 8.
