# Exploration: Multi-Tower Control Plane

Web dashboard (observation) + Telegram escalation bridge + laptop daemon.

- **Change**: `multi-tower-control-plane`
- **Phase**: explore (no proposal, spec, design, or tasks)
- **Status**: architecture settled; blocked on P4–P6 before proposal
- **Base**: `76e6cd2`, worktree `control-tower-Worktrees/dashboard-orchestration`

## Vocabulary

One **control tower** = one project currently executing: a Main orchestrator agent plus worker agents in git worktrees.

## Settled Architecture

Two paths with deliberately different trust requirements. Keeping them separate is what keeps this design cheap.

### Observation path — the dashboard

`laptop daemon → VPS → phone browser`

The laptop pushes a **state projection** to a VPS, which serves a read-only dashboard over public HTTPS. A public endpoint is required because the maintainer browses from a phone outside the house, and the laptop sits behind NAT with no fixed IP. The laptop cannot be that endpoint; the VPS can.

A compromised VPS on this path can leak the projection or display false state. It **cannot make any agent act**.

### Control path — Telegram

`phone ↔ Telegram servers ↔ Torre console on the laptop ↔ towers`

Telegram transport uses long polling (`getUpdates`), which is outbound-only HTTPS and works behind NAT with no port forwarding and no fixed IP. Telegram's own servers are the always-on component; no maintainer-operated server is required for the phone to reach the laptop. The VPS is **not** in this path.

Because no maintainer-administered internet-exposed host sits in the control path, the forged-approval problem does not arise. No answer signature, no Telegram Mini App, no phone-held key, and no external static host are required.

### The Torre console

**Decided**: the phone-facing component is a full agent, not a dumb pipe. The maintainer requires conversation (ask why work stalled, request context, redirect) **and** the ability to issue new orders (start an agent on a task, pause, re-run tests), with visibility across **all active towers** simultaneously.

**Harness**: a second instance of **Hermes Agent** (open source, Nous Research) installed on the laptop. It already provides Telegram transport, a session database, a skills loader, `delegate_task`, and cron — and it is the harness the maintainer already runs on the VPS, so a second instance preserves the behavior he knows in the location where it can act. Verified 2026-07-23: not currently installed locally.

**Why the laptop, not the VPS**: the console must execute against repos, worktrees, the Tower, and the terminal. A process on the VPS has none of these. This is a physical constraint, not a security preference — and it is already encoded in the existing Hermes skills: *"el cron corre en Hermes y no tiene acceso a la terminal local del usuario."*

**Boundary**: the console is not a Main orchestrator and does not perform project work. It relays the maintainer's presence and orders into each tower, and each project's Main orchestrator executes under its own local authority.

### Why the VPS is still required

1. The existing Hermes instance performs genuine laptop-off work: Notion reads, remote `gh` verification, conflict-graph planning, and the daily executive email.
2. The dashboard needs a public HTTPS endpoint that a laptop behind NAT cannot provide.
3. Planning (daily cadence) and live operation (minute cadence) have different lifetimes and are healthier separated.

The common "host the bot on a VPS for security" recommendation targets a *public*, webhook-based bot serving strangers, where isolating a compromise from the developer machine is the point. This bot is private, single-user, and must act on the laptop; isolating it from the machine it must touch buys no security and prevents it from working.

### Staging

The dashboard is **observation-only** in the first iteration; all actions travel through the Torre console. Remote control from the dashboard is explicitly deferred.

The morning copy-paste of Hermes' bootstrap payloads into each `Main` session stays **manual**, by the maintainer's explicit choice: he wants to read what the agents are about to do before they start. This is a deliberate human review gate, and it also keeps any VPS→laptop path from being opened.

### Two invariants this rests on

1. **Decisions are made on the Telegram message, not on the dashboard.** Every escalation arrives self-described and laptop-authored, carrying everything needed to decide inside the message. Otherwise a falsified dashboard could lead to a decision that is then legitimately approved.
2. **The VPS receives a projection, never raw state.** Agent names, states, task titles, lock holders — never code, diffs, or secrets.

### The fork that would reverse this

If the dashboard ever gains buttons that command towers, the VPS re-enters the approval path and the full signature layer returns with it. Observation-only is load-bearing, not cosmetic.

## Current State

- The Control Tower has **zero network surface today**. `core.mjs` is the sole SQLite boundary (`bun:sqlite` plus `node:fs`/`node:crypto`/`node:child_process` only; no `package.json`, no HTTP or server dependency anywhere). All access is local, same-machine, same-UID.
- `status()` in `core.mjs` (~line 905) already returns exactly the per-repo shape the dashboard projection needs: `{active, you, agents:[{name,role,branch,state,task,note,pr_url,pending}], locks:[{name,holder,acquired_at}]}`. It is reachable only through the synchronous `bin/torre status` CLI or the stdio-spawned MCP tool `tower_status` — never from an external process. The data exists; the path out of the process does not.
- The continuation plane (`ct_continuation_state`, `ct_claimant_binding`, `ct_rollback_lease`) is real schema at this base (P0–P2 complete) but has **no `status()` operation implemented yet**; mode is always `OFF` here. P3 (Main/API, in progress on another branch) through P6 define the delivery, lifecycle, and recovery data a richer continuation dashboard would display.
- `control-tower-identity-mode` (CT-R4/CT-R9) binds identity to `{effective_uid, canonical_repo, git_common_dir, worktree, branch, host_process_instance, plugin_instance, root_session_id, mcp_process_instance, pid_start_marker, binding_epoch}`. `trusted_uid = process.geteuid()` is a bare OS UID with **no cross-machine meaning**, and CT-R9 explicitly disclaims protection against a malicious local same-UID process. The trust model assumes cooperative, single-machine processes.
- There is **no cross-repo registry** anywhere in the codebase. Each tower is isolated per `git_common_dir`, and nothing enumerates which repos on a machine are towers. The `torrestk`/`torreecom`/`torrefp` names in `bin/torre` help text are hand-maintained shell aliases, not a registry.
- `host/loop.mjs` and the per-host adapters (P7–P9) do not exist yet. Per `design.md`, when built the loop will be scoped to **one proven root session inside one host process**, injected with `{peek,wake,schedule,cancel,trace}` ports, importing no host SDK and no SQLite. It is a per-session abstraction, not a per-laptop one.

## Affected and New Areas

| Component | Host | Responsibility |
|---|---|---|
| Laptop daemon (new) | Laptop | Aggregates local tower status through the existing `core.mjs`/`bin/torre` read path; pushes the projection to the VPS; runs the Telegram long-polling bridge; applies returned human answers through the same local anchor-gated write path every trusted local caller already uses. |
| Dashboard service (new) | VPS | Receives the projection and serves the read-only dashboard over public HTTPS. Holds no tokens, no anchors, no `Ctx`. |
| `openspec/changes/autonomous-continuation-control-tower/` | — | No edits required. Hard sequencing dependency only: P4–P6 must close first. |

## Does the "reuse tower primitives" constraint hold?

**Only partially. The protocol shape generalizes; the mechanism does not.**

What generalizes: CT-R2/CT-R6/CT-R4-plus-lease provide a reusable *pattern* — immutable JCS-digested payload, idempotent `request_identity` plus CAS replay, atomic single-consumer PENDING→CLAIMED transition, lease-based dead-consumer recovery. That pattern is the right template for the **local** escalation queue: an escalation is raised by a Main orchestrator, claimed by the daemon's bridge, answered, and attested as applied.

What does **not** generalize:

1. The tower's atomicity rests on one shared SQLite file opened with `BEGIN IMMEDIATE` by cooperative same-machine processes. Any cross-machine hop needs a message-passing analog, not literal reuse of a shared-writer lock.
2. The entire `Ctx`/anchor/UID-derivation machinery (`deriveCanonicalMainContext`, anchor ownership checks) is git-repo-rooted and single-machine by design. It has no meaning off the laptop and **must not** be extended to the VPS.

The settled architecture reduces the impact of both: the escalation queue now lives entirely on the laptop, where the SQLite mechanism does apply. Only the dashboard projection crosses a machine boundary, and it is one-way, read-only, and carries no protocol state.

"Laptop powered off" resolves trivially: no agents are running, so there is nothing to escalate. The dashboard shows a last-known-state timestamp and the bridge resumes polling when the laptop returns.

## Multi-Tower and Multi-Laptop Disambiguation

`control-tower-identity-mode` does **not** cover this. Its identity tuple disambiguates within one machine, repo, and plugin instance, and has no hostname or machine-id concept at all. A laptop-identity primitive and a tower registry are a genuine new gap.

Note a Telegram-specific constraint: only one process may long-poll a given bot token at a time. One laptop is fine. A second laptop would need its own bot token or an explicit coordination point.

## Transport Options

### Approval path (laptop ↔ Telegram)

| Approach | Assessment |
|---|---|
| **Long polling (`getUpdates`) from the laptop** | **Recommended.** Outbound-only, NAT-friendly, no fixed IP, no inbound exposure, no VPS in the trust path. |
| Webhook on the VPS forwarding to the laptop | Rejected. Puts the VPS back in the approval path and reintroduces the forgery problem for no gain. |

### Observation path (laptop → VPS)

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| Outbound periodic projection push over HTTPS | Simplest; can be a timer rather than a daemon; no inbound exposure | Dashboard freshness bounded by the push interval | Low |
| Persistent outbound WebSocket | Near-live dashboard updates | Long-running connection to supervise; marginal benefit for a monitoring view | Medium |
| Fold into `host/loop.mjs` / adapters | — | **Rejected.** Wrong abstraction level: that module is scoped to one root session inside one host process, not one laptop, and would violate its documented no-host-SDK boundary. | — |

**Recommendation**: one laptop-wide daemon — not per-tower, not folded into `host/loop.mjs` — with its own small local registry of tracked repo paths, running both the projection push and the Telegram bridge.

## Security Analysis

The **daemon** is the most security-critical new component: it is the only piece holding both outbound network connectivity and local anchor access. This is the same cooperative-same-UID trust class CT-R9 already accepts, now network-adjacent.

Under the settled architecture:

- **Forged approvals**: eliminated by construction. The control path does not traverse any maintainer-administered internet-exposed host.
- **Trust shifted to Telegram**: the transport and the maintainer's Telegram account. Account-level 2FA is the operative control here, not an optional hardening step.
- **Bot token**: laptop-resident, same trust class as the existing tower anchor. A separate token from the VPS Hermes instance is mandatory — only one process may long-poll a given token at a time.

### Accepted risk: an executing console

The maintainer's choice of a console that issues orders is a genuine increase in exposure: whoever holds his Telegram account can command his machine. That was not previously true. Three controls bound it:

1. **Telegram account 2FA** — the primary control of the entire system.
2. **Chat-ID allowlist** — the console obeys one chat and discards anything else unread.
3. **No raw shell.** The console accepts only the Tower's defined vocabulary of states and transitions, never arbitrary commands. "Start agent 3" is a Tower operation, not `bash -c`. This makes `control-tower-admin-authority` the ceiling on what any Telegram message can achieve, rather than the sender's imagination.

Control 3 is the load-bearing one. Without it, the console's authority is unbounded regardless of the other two.

### Multi-tower routing hazard

Because the console spans all active towers at once, every escalation must unambiguously identify its origin tower, and every answer must be bound to the escalation it answers. Cross-project answer mixing — approving a delivery in one project with an answer intended for another — is a new failure mode that a single-project console would not have.
- **Dashboard confidentiality**: whatever is projected is exposed under VPS compromise. Mitigated by projecting only summary state and by redaction before anything leaves the laptop.
- **Dashboard integrity**: a compromised VPS can display false state. Mitigated by invariant 1 — decisions rest on laptop-authored Telegram messages, not on the dashboard.
- **Local authority ceiling**: a human answer never grants more than the Main orchestrator's existing local authority under `control-tower-admin-authority`. The bridge must not become a bypass.
- **Echo-back**: after acting, the laptop reports what it did to the chat, so an unexpected action is visible rather than silent.

## Non-Goals

- P4–P6 substance.
- Remote command capability from the dashboard (explicitly deferred).
- Hosting provider and Telegram library choice.
- Daemon implementation language.
- Multi-tenant or multi-owner support.
- VPS provisioning mechanics.

## Open Questions

Resolved during exploration:

- ~~How is a human's answer authenticated against a compromised VPS?~~ Resolved: the VPS is removed from the approval path.
- ~~Is the dashboard localhost-only or reachable from anywhere?~~ Resolved: reachable from anywhere, via the VPS, read-only, projection only.
- ~~Can the dashboard act on towers?~~ Resolved: observation-only in the first iteration; control deferred.

- ~~Is the phone-facing component a pipe or an agent?~~ Resolved: an agent — conversation plus new orders, across all active towers.
- ~~Which harness does it run?~~ Resolved: a second Hermes Agent instance on the laptop.
- ~~Should the morning copy-paste be automated?~~ Resolved: no, it stays manual as a deliberate human review gate.

Still open:

1. What identifies "this laptop" — an assigned label, or a derived hostname/machine-id? Identity-mode has nothing for this today.
2. What identifies "this tower" to the console's registry — manual configuration, auto-discovery, or reuse of Hermes' existing `project-registry.yaml` shape?
3. Should the console reuse P10's `releases/<git-sha>` plus `current` verified-cutover mechanism instead of introducing a separate deployment story?
4. What exactly gets redacted from the projection and from escalation text before it leaves the laptop?
5. One in-flight escalation per tower at most (mirroring CT-R6), or a queue?
6. How does the dashboard authenticate the maintainer's browser?
7. What is the exact command vocabulary the console accepts, and how is it validated against `control-tower-admin-authority` before reaching a tower?
8. How much of the VPS Hermes configuration (SOUL.md, skills) is shared with the laptop instance versus divergent? The two have different jobs.

## Readiness

**Not ready for proposal**, but for one reason only.

The security blocker is resolved. What remains is sequencing: **P4–P6 must close first**, because they define both the state the dashboard displays and the escalation primitives the daemon reuses.

Open questions 1–6 are proposal-phase questions, not blockers on exploration.

## Risks

1. No existing laptop/machine identity primitive exists to disambiguate multiple laptops.
2. `host/loop.mjs` is the wrong abstraction level for the laptop daemon and must not be conflated with it.
3. Projection redaction is the remaining confidentiality control and is easy to under-specify.
4. Adding action buttons to the dashboard later silently reintroduces the entire approval-path threat model.
