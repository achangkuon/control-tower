# Proposal: Multi-Tower Control Plane

## Intent

Today the maintainer *is* the transport. Hermes, running on the VPS, emits its plan as text over Telegram, and the maintainer copy-pastes that text into each project's `Main` session by hand. Once those agents are running, he must stay at the machine: an agent that stalls, hits a decision it may not take alone, or reaches a delivery moment has no way to reach him and no way to receive an answer. Absence of the human is therefore indistinguishable from absence of work.

This change removes the maintainer from the transport role for the *live* phase of a session. It gives him two things he does not have: a way to see, from a phone, whether anything is waiting on him across all active towers, and a way to answer it without returning to the laptop.

Success looks like this: the maintainer leaves the house for 20–90 minutes with agents running, is interrupted only when work is genuinely BLOCKED or a delivery moment arrives (push turn, PR opened, merge), opens a dashboard that answers *"does anything depend on me?"* rather than *"what is happening?"*, and unblocks the tower that needs him from Telegram. Towers not coupled to that decision keep running throughout.

The morning copy-paste is deliberately left in place. It is a human review gate, not an inefficiency (see Non-Goals).

## Vocabulary

One **control tower** = one project currently executing: a `Main` orchestrator agent plus worker agents in git worktrees.

## Scope

### In Scope

Three components, split across two paths with deliberately different trust requirements.

**Control path** — `phone ↔ Telegram servers ↔ Torre console on the laptop ↔ towers`

- **Torre console (new, laptop)**: a second instance of **Hermes Agent** installed on the laptop, distinct from the VPS instance and holding its own bot token. It reaches the laptop through outbound long polling (`getUpdates`), which needs no inbound port, no fixed IP, and no maintainer-operated server. The console converses, relays the maintainer's presence and orders into each tower, and spans **all active towers at once**. It is not a `Main` orchestrator and performs no project work; each project's `Main` executes under its own local authority.
- **Local escalation queue and answer application (new, laptop)**: raising an escalation from a `Main`, claiming it for the console, binding the human's answer to it, and applying that answer through the same local anchor-gated write path every trusted local caller already uses.

**Observation path** — `laptop → VPS → phone browser`

- **Projection push (new, laptop)**: aggregates local tower status through the existing `core.mjs`/`bin/torre` read path and pushes a redacted **state projection** outward over HTTPS on a timer. Redaction level is **"titles and branches"** (see Approach).
- **Dashboard service (new, VPS)**: receives the projection and serves a **read-only** dashboard over public HTTPS behind **username-and-password authentication**. Holds no tokens, no anchors, no `Ctx`. A public endpoint is required because the phone is outside the house and the laptop sits behind NAT; the laptop cannot be that endpoint, the VPS can.
- **Dashboard view**: "what is waiting for me" at the top, each item with elapsed time; in-progress work below.
- **Stall detection (new, laptop)**: passive detection of an agent that has produced nothing for N minutes without raising anything — hung, looping, or dead. This is **new machinery**, materially different from receiving an explicitly raised escalation, and it feeds the same "waiting for me" region.

Also in scope: a small laptop-local registry of tracked tower repo paths (no such registry exists anywhere today), and a laptop-identity notion sufficient to disambiguate the projection's origin.

### Out of Scope (Non-Goals)

Carried from exploration:

- P4–P6 substance of `autonomous-continuation-control-tower`.
- Remote command capability initiated **from the dashboard**. Observation-only is load-bearing, not cosmetic: buttons on the dashboard put the VPS back into the approval path and drag the entire forged-approval threat model back with them.
- Hosting provider, Telegram library, and daemon implementation language.
- Multi-tenant or multi-owner support.
- VPS provisioning mechanics.

Added here:

- **Automating the morning copy-paste of Hermes' bootstrap payloads into each `Main`.** It stays manual by the maintainer's explicit choice: he wants to read what the agents are about to do before they start. It is a human review gate, and it also keeps any VPS→laptop path from ever being opened.
- **Extending `Ctx`/anchor/UID machinery to the VPS.** It is git-repo-rooted and single-machine by design and has no meaning off the laptop.
- **Overnight autonomy.** The laptop is powered off while the maintainer sleeps, by choice. That is normal nightly operation, not a gap to close.

## Approach

**Keep the two paths separate.** This is the decision the whole design rests on, and it is what keeps the change cheap. A compromised VPS can leak the projection or display false state; it **cannot make any agent act**, because it is not in the control path at all. Conversely, the control path never exposes an inbound surface, because Telegram's own always-on servers are the rendezvous point and the laptop only polls outward.

Two invariants make that separation real:

1. **Decisions are made on the Telegram message, not on the dashboard.** Every escalation arrives self-described and laptop-authored, carrying everything needed to decide inside the message. Without this, a falsified dashboard could induce a decision that is then legitimately approved.
2. **The VPS receives a projection, never raw state.** Agent names, states, task titles, lock holders — never code, diffs, or secrets.

**Reuse the tower's protocol shape, not its mechanism.** CT-R2/CT-R6 plus the CT-R4 lease give a reusable pattern — immutable JCS-digested payload, idempotent `request_identity` with CAS replay, atomic single-consumer PENDING→CLAIMED transition, lease-based dead-consumer recovery. That is the right template for the escalation queue. But the tower's atomicity rests on one shared SQLite file opened `BEGIN IMMEDIATE` by cooperative same-machine processes; that does not survive a machine hop. The settled architecture sidesteps this by keeping the escalation queue **entirely on the laptop**, where the SQLite mechanism does apply. Only the projection crosses a machine boundary, and it is one-way, read-only, and carries no protocol state.

**One laptop-wide daemon**, not per-tower, and explicitly **not folded into `host/loop.mjs`**. That module is scoped to one proven root session inside one host process and imports no host SDK; a per-laptop aggregator is the wrong abstraction level for it.

**Freeze semantics: blast radius equals coupling radius.** When the maintainer does not answer, the tower that raised the escalation freezes; other towers keep running. Agents inside one project share a database, branches, and a work area, so freezing siblings is genuine prudence. An unrelated project has zero coupling to that decision, so freezing it buys no control and only idles machines.

**A freeze never expires.** A frozen tower waits indefinitely. Nothing decides on the maintainer's behalf and nothing abandons the work unit. Two reasons: his routine already bounds the freeze, because he powers the laptop off at night, so an unbounded freeze cannot occur in practice; and auto-abandoning would discard the agent's loaded context and manufacture cleanup work in exchange for nothing.

**But the system does not give up silently.** An unanswered escalation re-notifies on a widening cadence: **15 minutes → 45 minutes → every 2 hours**. The cadence is deliberately not tighter. Frequent pings would lead him to mute the chat, and a muted chat defeats the notification discipline this design depends on — only BLOCKED work and delivery moments interrupt, so an interruption must always be worth reading.

**"Waiting for me" has two sources, not one.** Escalations explicitly raised by a `Main`, and stalls detected passively — an agent that has produced nothing for N minutes without raising anything, because it is hung, looping, or dead. The second source is new machinery: receiving a question is a message arriving, whereas detecting a stall is inferring meaning from a message *not* arriving, which requires per-agent activity tracking and a liveness threshold the tower does not have today. **N is unspecified and must be resolved at spec time.**

**Projection redaction level: "titles and branches."** The projection carries project name, agent name, state, task title, and branch name. It carries no file paths, no line counts, and no test results. The accepted tradeoff: a VPS compromise reveals the *direction* of his work — that he is integrating payments, say — but not its content and not the shape of his codebase.

**Dashboard authentication: username and password.** A no-login secret URL was rejected; revocability was the deciding factor. A leaked URL cannot be withdrawn without invalidating the maintainer's own access, whereas a credential can be rotated independently.

**Laptop off resolves trivially**: no agents are running, so there is nothing to escalate. The dashboard shows last-known state with its timestamp, the bridge resumes polling when the laptop returns, and Hermes on the VPS produces the morning plan as it does today.

**Why the console runs on the laptop, not the VPS**: it must execute against repos, worktrees, the Tower, and the terminal, none of which a VPS process has. This is a physical constraint, already encoded in Hermes' own skills ("el cron corre en Hermes y no tiene acceso a la terminal local del usuario"). The common "host the bot on a VPS for security" advice targets a *public*, webhook-based bot serving strangers; this one is private, single-user, and must touch the machine it would be isolated from.

## Affected and New Areas

| Component | Host | Responsibility |
|---|---|---|
| Torre console — second Hermes Agent instance (new) | Laptop | Telegram long polling on its own bot token; conversation; translating the maintainer's orders into Tower vocabulary |
| Laptop daemon (new) | Laptop | Tracked-repo registry; status aggregation via existing `core.mjs`/`bin/torre` read path; redaction to "titles and branches"; projection push; escalation queue; re-notification cadence; stall detection; anchor-gated answer application |
| Dashboard service (new) | VPS | Receives the projection; serves the read-only dashboard over public HTTPS behind username/password auth |
| `core.mjs` / `mcp.mjs` | Laptop | Escalation raise/claim/answer surface built on P4–P6 primitives (shape TBD until they land) |
| `openspec/changes/autonomous-continuation-control-tower/` | — | No edits. Hard sequencing dependency only |

## Sequencing and Dependencies

**Implementation is blocked on P4–P6 of `autonomous-continuation-control-tower` closing. Planning is not blocked.**

- P4 (Delivery/Claim) defines the atomic single-consumer claim the escalation queue mirrors.
- P5 (Lifecycle/Attestation) defines the evidence and completion attestation an applied answer must produce.
- P6 (Recovery/Rollback) defines the proof-bound recovery the freeze semantics depend on when the console dies mid-escalation.

At the current base (`76e6cd2`), the continuation plane (`ct_continuation_state`, `ct_claimant_binding`, `ct_rollback_lease`) is real schema but has **no `status()` operation**, and mode is always `OFF`. `status()` in `core.mjs` already returns the per-repo shape the projection needs — `{active, you, agents:[{name,role,branch,state,task,note,pr_url,pending}], locks:[{name,holder,acquired_at}]}` — reachable only through the synchronous `bin/torre status` CLI or the stdio-spawned `tower_status` MCP tool. The data exists; the path out of the process does not.

**What must be revisited once P4–P6 land**, rather than invented now:

1. The **projection payload shape** for continuation state. Only legacy `status()` fields are knowable today; continuation fields are defined by P4–P6.
2. The **escalation record shape** and its exact reuse of the delivery/claim primitives.
3. The **answer-application contract** — which attestation an applied human answer must emit, per P5.
4. The **freeze/thaw representation** — whether a frozen tower is a P6 suspension state or a distinct escalation-local state.
5. Whether the console's command vocabulary maps onto P4/P5 operations directly or needs a translation layer.

Specs and design for this change should mark these five as deferred bindings rather than fabricating state shapes that do not yet exist.

## Risks

| Risk | Assessment / Mitigation |
|---|---|
| **Unrestricted phone commands, including merge to main and `db push` to production — ACCEPTED RISK** | The maintainer explicitly chose full command capability from the phone with no carve-outs, after being shown the conflicting evidence: his own `coordinador_multi_agente` rule that `db push` runs only from an updated main behind a human semaphore, and the `finanzas` entry in Hermes' `project-registry.yaml` warning that `data/finanzas.db` may hold real financial data requiring backup and authorization before non-reversible writes. Neither constraint is satisfiable from a phone. He accepted this knowingly. It is recorded here as a standing, unmitigated exposure: a non-reversible production write can be triggered from a device that cannot verify main is current or that a backup exists. |
| **Telegram account compromise** | Whoever holds the maintainer's Telegram account can command his machine — not previously true. Three controls: (1) **Telegram account 2FA**, now the primary control of the entire system rather than optional hardening; (2) **chat-ID allowlist** — the console obeys one chat and discards anything else unread; (3) **no raw shell** — the console accepts only the Tower's defined vocabulary of states and transitions, never arbitrary commands, so `control-tower-admin-authority` is the ceiling on what any Telegram message can achieve rather than the sender's imagination. Control 3 is load-bearing; without it the other two bound nothing. |
| **Cross-tower answer mixing** | Because the console spans all active towers simultaneously, an answer intended for one project could approve a delivery in another — a failure mode a single-project console would not have. Every escalation must unambiguously identify its origin tower, and every answer must be bound to the specific escalation it answers. |
| **Projection confidentiality under VPS compromise** | Whatever is projected is exposed. Bounded to the "titles and branches" level: project name, agent name, state, task title, branch name — never file paths, line counts, or test results. Residual, knowingly accepted: a compromise reveals the direction of his work but not its content or codebase shape. Enforcement must happen at the laptop boundary, before the push, not at the VPS. |
| **Notification fatigue defeating the design** | If re-notification is too frequent the maintainer mutes the chat, and a muted chat silently disables the only control path. Bounded by the widening 15 min → 45 min → 2 h cadence and by keeping the interrupt set narrow. |
| **Stall detection false positives and false negatives** | A stall detector that fires on a legitimately slow agent trains the maintainer to ignore it; one that never fires leaves hung agents invisible. It is genuinely new machinery with no existing tower primitive behind it, and the threshold N is unset. Highest-uncertainty item entering spec. |
| **Projection integrity under VPS compromise** | A compromised VPS can display false state. Bounded by invariant 1: decisions rest on laptop-authored Telegram messages, not on the dashboard. |
| **Authority bypass** | A human answer must never grant more than the `Main` orchestrator's existing local authority under `control-tower-admin-authority`. The bridge must not become an escalation of privilege. Echo-back after acting makes unexpected actions visible rather than silent. |
| **Dashboard gaining action buttons later** | Silently reintroduces the entire approval-path threat model and the signature layer with it. Must be treated as a new change, not an increment. |
| **No laptop/machine identity primitive** | `control-tower-identity-mode` disambiguates within one machine, repo, and plugin instance and has no hostname or machine-id concept. A second laptop also collides on the Telegram side: only one process may long-poll a given bot token at a time. |
| **Abstraction-level drift** | `host/loop.mjs` is per-session, not per-laptop. Conflating it with the daemon violates its documented no-host-SDK boundary. |
| **Premature build against P4–P6** | Building the escalation queue against guessed continuation shapes produces rework. Mitigated by the deferred-bindings list above. |

## Rollback Plan

The change is additive and lives outside the tower's existing authority path, which makes rollback cheap at every stage.

1. **Torre console**: stop the laptop Hermes instance and revoke its bot token. The VPS Hermes instance is unaffected (separate token, separate host, separate job). The maintainer returns to copy-paste and to being physically present — the current state of the world.
2. **Escalation surface in `core.mjs`/`mcp.mjs`**: additive only. Revert the units and the tower returns to its present behavior; no continuation record is down-migrated or destructively converted. Any in-flight escalations are quiesced and dispositioned, with audit evidence retained, before revert.
3. **Projection push**: disable the timer. No tower state depends on it, so nothing stalls; the dashboard simply goes stale and shows its last timestamp.
4. **Dashboard service**: tear down the VPS service and its DNS/TLS entry. It holds no tokens, anchors, or `Ctx`, so nothing is lost and nothing must be migrated back.
5. **Full rollback**: with all four reverted, the system is byte-equivalent to the pre-change tower plus a disabled directory. The Control Tower's zero-network-surface property is restored intact.

Because the control path and the observation path are independent, either can be rolled back alone. In particular, the dashboard can be withdrawn without touching the escalation flow, and the console can be withdrawn without touching the dashboard.

## Open Questions

Carried forward from exploration; all are proposal- or spec-phase questions, none block planning.

### Still open

1. What identifies "this laptop" — an assigned label, or a derived hostname/machine-id? `control-tower-identity-mode` has nothing for this today.
2. What identifies "this tower" to the console's registry — manual configuration, auto-discovery, or reuse of Hermes' existing `project-registry.yaml` shape?
3. Should the console reuse P10's `releases/<git-sha>` plus `current` verified-cutover mechanism instead of introducing a separate deployment story?
5. One in-flight escalation per tower at most (mirroring CT-R6), or a queue?
7. What is the exact command vocabulary the console accepts, and how is it validated against `control-tower-admin-authority` before reaching a tower?
8. How much of the VPS Hermes configuration (SOUL.md, skills) is shared with the laptop instance versus divergent? The two have different jobs.
9. **Delivery-moment notification granularity**: does every PR opened notify, or only PRs in projects flagged as sensitive? With several towers running, this is the difference between a useful ping and the notification fatigue the cadence design is trying to avoid.
10. **Stall threshold N**: how long an agent may produce nothing before it counts as stalled, and whether N is global or per-project. Raised by decision 2 above; must be resolved at spec time.

### Closed by the second product round (2026-07-23)

- ~~4. What exactly gets redacted from the projection and from escalation text before it leaves the laptop?~~ **Resolved**: level is "titles and branches" — project name, agent name, state, task title, branch name; never file paths, line counts, or test results.
- ~~6. How does the dashboard authenticate the maintainer's browser?~~ **Resolved**: username and password. The secret-URL option was rejected because it is not revocable independently of the maintainer's own access.
- ~~Does a freeze expire?~~ **Resolved**: no expiry, ever; re-notify at 15 min → 45 min → every 2 hours.
- ~~Does "waiting for me" include passively detected stalls?~~ **Resolved**: yes, alongside explicitly raised escalations.

## Success Criteria

- [ ] With agents running and the maintainer away from the machine, a BLOCKED tower reaches him on the phone and is unblocked from Telegram without returning to the laptop.
- [ ] Only BLOCKED work and delivery moments (push turns, PRs opened, merges) generate notifications; everything else is visible on the dashboard without interrupting.
- [ ] The dashboard's top region answers "does anything depend on me?" with elapsed time per waiting item, across all active towers, drawing from both explicitly raised escalations and passively detected stalls.
- [ ] An unanswered escalation freezes only its own tower; unrelated towers continue.
- [ ] A freeze never expires and never auto-decides or auto-abandons; the agent's context survives until answered or until the laptop is powered off.
- [ ] An unanswered escalation re-notifies at 15 minutes, then 45 minutes, then every 2 hours, and never more often.
- [ ] An agent producing nothing for N minutes without raising anything surfaces as waiting, distinctly from an explicitly raised escalation.
- [ ] The projection contains project name, agent name, state, task title, and branch name, and contains no file paths, line counts, or test results; this is enforced on the laptop before the push.
- [ ] The dashboard requires username-and-password authentication, and the credential can be rotated without changing the dashboard URL.
- [ ] Every escalation identifies its origin tower unambiguously, and every answer is bound to the escalation it answers.
- [ ] The console rejects any input outside the Tower's defined vocabulary; no raw shell path exists.
- [ ] The VPS holds no token, anchor, or `Ctx`, and the dashboard exposes no action that commands a tower.
- [ ] A human answer never results in an effect exceeding the originating `Main`'s local authority under `control-tower-admin-authority`.
- [ ] With the laptop off, the dashboard shows last-known state with its timestamp and no tower state is corrupted on return.
