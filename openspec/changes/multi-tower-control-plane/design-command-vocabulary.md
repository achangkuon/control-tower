# Design (Partial): Torre Console Command Vocabulary

**Change**: `multi-tower-control-plane` · **Scope**: open question 7 only · **Base**: `3cd78a1`, worktree `control-tower-Worktrees/dashboard-orchestration`

## Scope of this document

This is a **deliberately partial design**. It answers exactly one open question from the proposal — *"What is the exact command vocabulary the console accepts, and how is it validated against `control-tower-admin-authority` before reaching a tower?"* — and nothing else.

**Covered**: the closed command set, its authority binding, the rejection contract and the LLM/validator seam, the core/adapters boundary, multi-tower addressing, and the responsible shape of the two high-risk commands.

**Deliberately deferred** (do not read absence here as a decision): the dashboard and its auth, the projection transport and payload, stall detection and threshold `N`, the escalation record shape, the freeze/thaw representation, re-notification mechanics, the laptop-identity primitive, and the tower registry's storage format. Everything whose state shape depends on **P4–P6** of `autonomous-continuation-control-tower` is blocked and is referenced here only as a *deferred binding*.

The vocabulary below is designed to be **P4–P6-agnostic**: it is expressed in terms of the ten states that exist in `core.mjs` today, not in terms of continuation-plane states that do not.

---

## Technical Approach

Three findings from the code drive the whole design.

1. **`core.mjs` derives identity from `process.cwd()`, never from a payload** (`locate()`, `core.mjs:593`). No caller declares who it is, so no caller can claim to be another.
2. **`control-tower-admin-authority` CT-R3 forbids identity in the request.** `Ctx` is ingress-created and immutable; actor, role, session, UID, location, process, PID and epoch request fields return `CT_PAYLOAD_INVALID`. A top-level canonical `request_identity` grants no authority.
3. **The Tower has no "start an agent" operation at all.** Starting, pausing, and testing an agent are things a `Main` orchestrator does in a session; `core.mjs` only knows `register / setState / send / receive / acquire / release / transfer / status`.

Together these give the design its spine: **the console never executes a tower operation on behalf of anyone.** Its only write primitive is delivering a message into a `Main`'s inbox. The `Main` then acts under its own server-resolved `Ctx`, exactly as it does today when the maintainer copy-pastes into its terminal. The console replaces the maintainer's clipboard, not his authority.

---

## Architecture Decisions

### D1 — The console holds zero authority; it relays orders as tower messages

| Option | Tradeoff | Decision |
|---|---|---|
| Console calls `core.mjs` write ops directly (as the target worktree) | Fast, but the console would impersonate `Main` by running with its cwd — precisely the identity confusion `locate()` exists to prevent | Rejected |
| Console gets its own authority tier in `control-tower-admin-authority` | Creates a second authority root; CT-R10 says authority derives only from the ACTIVE anchor-matched binding. A second root is a bypass by construction | Rejected |
| Console writes into `Main`'s inbox; `Main` executes under its own `Ctx` | The authority ceiling is exactly `Main`'s existing local authority, with no new grant anywhere | **Chosen** |

**Rationale**: this makes the proposal's "a human answer never exceeds the originating `Main`'s local authority" a *structural* property rather than a rule someone must remember to enforce. There is no code path from the console to a Main-gated or Admin-gated operation, so "exceeds authority" cannot be escalated into execution — it cannot even be expressed.

Consequence: a command that exceeds `Main`'s authority is rejected **by `Main`'s own call**, and the console echoes the stable error (`CT_WORKFLOW_MAIN_REQUIRED`, `CT_ADMIN_REQUIRED`, `CT_CONTINUATION_OFF`, …) back to the chat verbatim. The console never retries, never re-routes, and never substitutes a weaker command.

### D2 — The vocabulary is a data table, not model output

The closed set lives in one exported table (`console/vocabulary.mjs`), keyed by verb. Dispatch is a `Map` lookup with **no `default:` execution branch**, mirroring `mcp.mjs:114` (`unknown tool "…"` throws before SQLite is opened). Legal states are imported from `core.mjs`'s `STATES` at validation time, so the vocabulary cannot drift from the enum.

**Rejected**: defining the vocabulary in the console's prompt/skill files. A prompt is not an enforcement boundary; anything a model is told it may do, it can be talked out of.

### D3 — Two-stage seam: the model proposes, a non-LLM validator disposes

The console is an LLM agent, so the load-bearing question is where "the model understood a request" stops and "a validated command exists" starts. Answer: **at a process boundary the model cannot cross.**

```
Telegram text ──▶ [raw-text pre-router]  ─── matches a pending confirm token? ──▶ validator (model never sees it)
                        │ no
                        ▼
                 [console LLM]  ── its ONLY executing tool: torre_console_submit(envelope)
                        │
                        ▼  JSON CommandEnvelope (untrusted)
              ┌──────────────────────────────────────────┐
              │  bin/torre-console  (separate process)    │  ← trusted validator, no LLM
              │  schema → registry → digest → live state  │
              └──────────────────────────────────────────┘
                        │ accepted                    │ rejected
                        ▼                             ▼
        core.send(Main inbox) + trace()        CV_* refusal → chat
                        │
                        ▼
             Main executes under its own Ctx
```

The console's toolset contains **no shell tool, no file-write tool, and no `delegate_task` into a shell-capable agent**. `torre_console_submit` accepts a JSON envelope only — never a command string, never argv. There is no argument position in `bin/torre-console` that reaches a shell.

### D4 — No ambient tower context, ever

The console keeps no "current project" in its session state. Every envelope must carry its own `tower_id` **and** `tower_digest`. A bare "approve" resolves to nothing and is refused. See *Multi-tower addressing*.

---

## The Command Set

Fourteen verbs. Closed. `target` is `tower` or `agent`. `Legal states` are the subset of the ten `core.mjs` states the target agent may be in; any other state is a refusal, not a queue.

| Verb | Params | Preconditions | Legal agent states | Risk |
|---|---|---|---|---|
| `CV_STATUS` | `tower_id` | tower in registry | — (tower-level) | R0 |
| `CV_INSPECT` | `tower_id`, `agent` | agent in `status()` | all ten | R0 |
| `CV_REQUEST_CONTEXT` | `tower_id`, `agent`, `question` | agent registered; tower `active` | all ten | R0 |
| `CV_ASSIGN` | `tower_id`, `agent`, `task` | agent idle; `task` non-empty | `PLANNED`, `MERGED`, `COMPLETE` | R1 |
| `CV_PAUSE` | `tower_id`, `agent`, `reason` | agent progressing | `ASSIGNED`, `WORKING`, `READY` | R1 |
| `CV_RESUME` | `tower_id`, `agent`, `note` | agent halted | `BLOCKED`, `WAITING_HUMAN` | R1 |
| `CV_RUN_TESTS` | `tower_id`, `agent` | agent has a worktree | `WORKING`, `READY`, `BLOCKED` | R1 |
| `CV_GRANT_DELIVERY` | `tower_id`, `agent` | `git-delivery` free or held by `Main` | `READY` | R1 |
| `CV_HOLD_DELIVERY` | `tower_id`, `agent`, `reason` | — | `READY`, `DELIVERING` | R1 |
| `CV_STOP_DELIVERY` | `tower_id`, `agent`, `reason` | — | `READY`, `DELIVERING` | R1 |
| `CV_ANSWER` | `tower_id`, `escalation_id`, `verdict∈{APPROVE,REJECT}`, `note?` | escalation OPEN and claimed by the console | `BLOCKED`, `WAITING_HUMAN` | R1 |
| `CV_MERGE_MAIN` | `tower_id`, `agent`, `pr_url`, `confirm_token` | evidence card issued and unexpired | `PR_OPEN` | **R2** |
| `CV_DB_PUSH` | `tower_id`, `agent`, `environment`, `confirm_token` | evidence card issued; holds `db-writer` | `WORKING`, `READY` | **R2** |
| `CV_FORCE_UNLOCK` | `tower_id`, `lock∈{git-delivery,db-writer}`, `confirm_token` | lock currently held | — (tower-level) | **R2** |

Notes on the sharper edges:

- **`CV_PAUSE` is refused on `DELIVERING` and `PR_OPEN`.** Pausing mid-delivery strands the `git-delivery` lock with no holder able to release it (`release()` allows only the holder, `core.mjs:784`), leaving `torre unlock` as the only exit. The refusal names `CV_STOP_DELIVERY` as the correct verb; it does not silently substitute it.
- **`CV_GRANT_DELIVERY` maps to `transfer()`, which only the holder may perform.** So it is relayed to `Main`, which reserves and transfers — the existing pattern documented at `core.mjs:802`. The console cannot transfer a lock it does not hold, and it never holds one (an unregistered session has no `agent` row and `acquire()` refuses it, `core.mjs:764`).
- **`CV_FORCE_UNLOCK` maps to `forceRelease()`**, which `core.mjs:837` deliberately does **not** expose over MCP because it is the one human-only door. Exposing it to the console is a real widening of that door and is why it carries R2 and a confirm token.
- **`CV_ANSWER`'s escalation binding is a deferred binding.** The escalation record shape comes from P4/P5. This design fixes only the *addressing* rule (below) and the verdict enum; the payload shape is TBD.

### Alignment with the existing Hermes reply vocabulary

| Hermes term | Console verb | Note |
|---|---|---|
| `DELIVERY_GRANTED` | `CV_GRANT_DELIVERY` | Same semantics |
| `DELIVERY_WAIT` | `CV_HOLD_DELIVERY` | Same semantics |
| `DELIVERY_STOP` | `CV_STOP_DELIVERY` | Same semantics |
| `COORDINATION_APPROVED` / `COORDINATION_DENIED` | `CV_ANSWER{APPROVE,REJECT}` | Collapsed into one verb with a verdict, because the console answers a *specific escalation id*, which coordination replies do not carry |
| `WAIT_DEPENDENCY`, `READY_ACCEPTED`, `EVIDENCE_INCOMPLETE`, `MERGE_VERIFIED` | *none* | **Deliberate divergence.** These are conclusions a `Main` computes from evidence it holds locally. They are not orders a human issues from a phone, and admitting them would let the console assert a fact (`MERGE_VERIFIED`) it has no evidence for |

**Direction matters**: Hermes' vocabulary is `orchestrator → agent` replies; this one is `human → tower` commands. Sharing the four delivery/coordination names keeps the maintainer's muscle memory; adding the rest is unavoidable because no human-order vocabulary exists today.

**Phantom states are not propagated.** `REGISTERED`, `ASSIGNMENT_ACCEPTED`, `TESTING`, `FIXING_TESTS`, `WAITING_DEPENDENCY` and `SCOPE_CHANGE_REQUEST` appear in Hermes' `project-main-orchestrator-handoff.md` but are rejected by `core.mjs:695`. The vocabulary table imports `STATES` from `core.mjs`; there is no literal state string anywhere in the console, so this class of drift is impossible rather than merely avoided.

---

## Authority Binding to `control-tower-admin-authority`

| Tier | What it is | Console access | Enforcement |
|---|---|---|---|
| **A0 — Read** | `status()`, agent rows, lock holders | Direct (`CV_STATUS`, `CV_INSPECT`) | Available even while the tower is `off`; no write path |
| **A1 — Main's local authority** | Everything a `Main` may do today: `send`, `setState`, `acquire`/`transfer`, delivery ordering | **Indirect only** — relayed into `Main`'s inbox | `Main` executes under its own server-resolved `Ctx` (CT-R10). Ceiling = `Main`'s ceiling, unchanged |
| **A2 — Admin / binding** | `provisionMainAuthorityAnchor`, `bootstrapAdmin`, `bootstrapMain`, `activate`, `beginRollback`, `rebindMain`, `finishRollback` | **None. Not in the vocabulary.** | CT-R3 makes the two provisioning ops CLI/admin-transport only; the verbs simply do not exist, so a request for them fails at parse with `CV_UNKNOWN_VERB` |

Three properties fall out:

1. **The console is not a `Ctx` source.** CT-R3 states that without an adapter capability supplying trusted metadata, continuation dispatch is *unavailable* rather than accepting caller metadata. The console MUST NOT be registered as that adapter — recorded here as a hard constraint for whoever builds P7–P9.
2. **Authority excess is refused, never downgraded.** If `Main` rejects a relayed order, the console reports the stable error code and stops. It does not retry with a narrower command, does not ask another tower, and does not attempt an admin route.
3. **`torre on`/`torre off` stay physical.** The `ACTIVE` file is checked twice under `BEGIN IMMEDIATE` (`activeWrite`, `core.mjs:621`). A tower that is off refuses every A1 relay regardless of what the console believes, and the console has no `CV_ARM`/`CV_DISARM` verb — arming a tower remains something done at the keyboard.

---

## The Rejection Contract

**Default is refusal.** Every stage fails closed.

| Stage | Runs | Rejects with |
|---|---|---|
| 0. Chat-ID allowlist | pre-router | silently discarded, unread |
| 0b. Confirm-token match | pre-router (string compare) | consumed by the validator; the model never sees the text |
| 1. Model → envelope | console LLM | if it cannot produce **exactly one** envelope: `CV_CLARIFY` (a question, not a command) |
| 2. Schema | validator | `CV_UNKNOWN_VERB`, `CV_MALFORMED`, `CV_MISSING_PARAM` |
| 3. Addressing | validator | `CV_UNKNOWN_TOWER`, `CV_TOWER_MISMATCH` |
| 4. Liveness | validator, against live `status()` | `CV_UNKNOWN_AGENT`, `CV_TOWER_INACTIVE` |
| 5. State legality | validator | `CV_ILLEGAL_STATE` (names the current state and the legal set) |
| 6. Risk gate | validator | `CV_CONFIRMATION_REQUIRED`, `CV_TOKEN_EXPIRED` |
| 7. Core | `core.mjs` | the core's own errors, unchanged |

Non-negotiable rules for stage 1:

- **No best-effort mapping.** If the model's reading is ambiguous, or a required parameter is not *literally present* in the maintainer's message, the model MUST emit `CV_CLARIFY`. There are **no default parameter values** in the vocabulary table.
- **No fuzzy resolution.** Agent names must match a name in `status()` exactly (they are worktree basenames, `core.mjs:606`). "agent 3", "the payments one", or a near-miss spelling all produce `CV_UNKNOWN_AGENT` with the live list attached — never a guess.
- **The model self-reporting confidence is not a control** and is not a field in the envelope. Unreliable narrator; the validator checks facts instead.
- **Refusal is terminal for that message.** A refused envelope is not repaired and resubmitted by the model. The maintainer re-states; the loop does not self-heal, because a self-healing loop is a loop that can be argued into compliance.

**Why the pre-router matters**: confirmations for R2 commands are *not interpreted*. The validator issues a short token (`OK-7F3A`); an inbound message whose text equals a pending token is consumed by the validator before routing. The model neither generates nor interprets the token, so "the model decided he said yes" is not a reachable state.

---

## Core / Adapters Boundary

```
       ADAPTER (untrusted)          |   TRUSTED (no LLM)        |   CORE
  Hermes console: LLM + Telegram    |  bin/torre-console        |  core.mjs
  - holds NO SQLite handle          |  - vocabulary table       |  - sole SQLite boundary
  - holds NO Ctx / anchor           |  - registry + digest      |  - re-validates state
  - holds NO authority tier         |  - live status() check    |  - identity from cwd
  - one tool: submit(envelope)      |  - confirm tokens         |  - ACTIVE double-check
```

The boundary holds under an adversarially prompted console because **each layer re-validates independently and none trusts the layer above**:

- A jailbroken console can only emit envelopes. It has no shell, no file writes, no SQLite, and no argv surface.
- A malformed or illegal envelope dies in the validator, which is a separate process with no model in it.
- An envelope that survives the validator still hits `core.mjs`, which re-checks `ACTIVE`, re-checks the state enum (`core.mjs:695`), refuses unregistered senders and recipients (`core.mjs:722`), and refuses lock operations from non-holders.
- Even a fully-executed relay only *queues a message*. The `Main` reads it and decides, under its own `Ctx`.

**Residual, stated honestly**: a compromised Telegram account can issue *legal* commands. That is the accepted risk the maintainer already signed. The vocabulary bounds it to `Main`'s authority; it does not eliminate it. Telegram 2FA remains the primary control.

---

## Multi-Tower Addressing

Misrouting is made structural, not probabilistic, by requiring **two independent bindings to agree**:

1. `tower_id` — a registry key (`torrestk`, `torrefp`, …).
2. `tower_digest` — `sha256(canonical_repo ‖ git_common_dir)`, resolved by the validator from the registry entry, never supplied by the model.

The validator resolves `tower_id → path`, recomputes the digest from the resolved path, and compares. A mismatch is `CV_TOWER_MISMATCH`.

For `CV_ANSWER` the binding is stronger: **the tower is derivable from the escalation id**. The validator derives the origin tower from `escalation_id` and requires it to equal the envelope's `tower_id`; disagreement is a refusal. So approving a delivery in the wrong project requires two independent identifiers to be wrong in the same direction — which the model cannot arrange, because it supplies neither digest nor derivation.

Combined with D4 (no ambient tower context), a message like "yes, approve it" carries no tower at all and resolves to `CV_CLARIFY`.

> **Deferred binding**: the `escalation_id` construction depends on the P4/P5 escalation record. The *rule* above is fixed now; the id's exact composition is not.

---

## The Two High-Risk Commands

`CV_MERGE_MAIN` and `CV_DB_PUSH` stay in the vocabulary by the maintainer's explicit, documented decision. Not re-litigated here. What follows is what a *responsible* version looks like.

**Evidence is gathered by the validator, never by the model.** The model cannot fabricate an evidence card because it does not author one; it only requests that one be issued.

| Command | Evidence card contents (validator-gathered, read-only) |
|---|---|
| `CV_MERGE_MAIN` | PR URL from `agent.pr_url`; PR title, head branch, base branch; `gh pr checks` result; mergeable state; commits-behind-`origin/main`; current holder of `git-delivery`; the agent's `note` |
| `CV_DB_PUSH` | Target project and environment; whether local `main` is current with `origin/main`; holder of `db-writer`; names (not contents) of migrations pending; **most recent backup reference and its age, or an explicit `BACKUP: NONE FOUND`** |
| `CV_FORCE_UNLOCK` | Lock name, current holder, `acquired_at` and elapsed time, that holder's state and last trace line |

**Flow**: card rendered to the chat → validator issues a fresh `confirm_token` → the maintainer replies with the exact token → pre-router consumes it → command executes → **echo-back** states what was done.

**Recorded afterward**, in all three places:
1. `trace()` to `tower.log` with a `CONSOLE:` flag (the existing shared-trace convention, `core.mjs:62`), so `torre log` shows a phone-originated action as such.
2. A console audit row: envelope, evidence digest, token, timestamp, resulting core response.
3. Echo-back to the chat, per the proposal's echo-back control, so an unexpected action is visible rather than silent.

### Recommendations — for the maintainer's decision, not imposed

- **REC-1**: `CV_DB_PUSH` renders `BACKUP: NONE FOUND` in red and requires a longer, distinct confirm token when no backup reference is found. It still executes if he confirms. This is the closest satisfiable analog to his own `coordinador_multi_agente` rule, which cannot be satisfied from a phone.
- **REC-2**: confirm tokens expire after **10 minutes**. A token issued before he got in the car should not still be live when he arrives.
- **REC-3**: R2 commands are **single-flight per tower** — one outstanding evidence card at a time, so a stale card cannot be confirmed against a changed world.
- **REC-4**: `CV_FORCE_UNLOCK` echoes the holder's last trace line in its card, since "the session died" is the only justification for the command and is exactly what the card should let him check.

---

## Threat Matrix

Applicable: the console routes external input into subprocess and VCS/PR automation.

| Boundary | Adversarial cases | Applicability | Design response | Planned RED tests |
|---|---|---|---|---|
| Documentation-like paths | `README.sh`, executable Markdown | **N/A** — the console never classifies or executes files; its only output is a JSON envelope | — | — |
| Git repository selection | `git -C`, relative and absolute paths | **Applicable** | Repo comes only from the registry entry resolved by `tower_id`, verified against `tower_digest`; envelopes carry no path field | One test per selector: envelope with a path param → `CV_MALFORMED`; `tower_id` not in registry → `CV_UNKNOWN_TOWER`; registry path whose digest differs → `CV_TOWER_MISMATCH` |
| Commit state | staged, `commit -a`, empty index | **N/A** — no console verb commits; `Main` and its agents commit under existing rules | — | — |
| Push state | tracking branch, first push, explicit refspec | **Applicable** (via `CV_MERGE_MAIN`) | Base and head come from the resolved PR, not from the envelope; no refspec parameter exists | Envelope supplying a branch or refspec → `CV_MALFORMED`; `pr_url` not matching `agent.pr_url` → refusal; agent not in `PR_OPEN` → `CV_ILLEGAL_STATE` |
| PR commands | explicit `--head`, env prefix, composed commands | **Applicable** | `gh` invoked via `execFileSync`-style argv arrays only (the `git()` pattern at `core.mjs:70`); no string interpolation, no shell | Envelope field containing `;`, backticks, `$(...)`, or a leading `-` reaches no argv position; assert the composed argv array literally |

Additional applicable row specific to this design:

| Boundary | Adversarial cases | Applicability | Design response | Planned RED tests |
|---|---|---|---|---|
| Natural-language → command seam | prompt injection in a Telegram message, in an agent `note`, or in a task title | **Applicable** | The model's only tool is `submit(envelope)`; the validator trusts no model output; agent-authored text is rendered to the chat but never parsed as a command | Injection string in a message → `CV_CLARIFY` or `CV_UNKNOWN_VERB`, never execution; injection in an agent `note` surfaced in an evidence card → no command constructed; a forged "confirm token" inside model output → not accepted (tokens come only from the pre-router) |

---

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Vocabulary table completeness; state legality per verb; refusal codes; digest computation | `bun test`, pure functions over the table; assert the verb set equals the fourteen and that legal-state sets are subsets of `core.mjs` `STATES` |
| Unit | Fail-closed dispatch | Assert no `default:` execution branch: unknown verb throws before any tower is opened, mirroring `mcp.mjs` |
| Integration | Relay lands in `Main`'s inbox; illegal state refused; inactive tower refused | Temp git repo + real `core.mjs`, per existing test conventions |
| Integration | Cross-tower misrouting | Two temp repos; envelope with tower A's id and tower B's escalation → refusal, and assert **no row changed in either database** |
| Integration | R2 confirm flow | Card issued → wrong token, expired token, and model-authored token all refused; correct token executes exactly once |

---

## File Changes (indicative — this is a partial design)

| File | Action | Description |
|---|---|---|
| `console/vocabulary.mjs` | Create | The closed verb table: params, preconditions, legal states, risk tier. Imports `STATES` from `core.mjs` |
| `console/validate.mjs` | Create | Pure validator: schema → addressing → liveness → state → risk. No SQLite, no LLM |
| `bin/torre-console` | Create | Trusted entry point; accepts a JSON envelope only; relays via `core.mjs` |
| `core.mjs` | Modify (additive, deferred) | A minimal relay primitive so a console-originated order enters a `Main`'s inbox with a distinguishable sender rather than impersonating a worktree. **Shape depends on P4–P6; not specified here** |

---

## Open Questions

- [ ] The console's relay currently has no legitimate sender identity: `send()` derives the sender from cwd (`core.mjs:606`), so a console writing into a tower would appear as some worktree. A small additive core primitive is needed. **This is the one genuine core change the vocabulary implies, and its shape is blocked on P4–P6.**
- [ ] Whether `CV_FORCE_UNLOCK` should exist at all, given `core.mjs:837` deliberately withholds `forceRelease` from every non-human transport. Included here because the maintainer chose full capability; flagged as the single largest widening in the set.
- [ ] `CV_RUN_TESTS` has no tower primitive behind it — it is a relayed instruction, so "re-run tests" is only as reliable as the `Main` that receives it. Whether it needs a real primitive is a spec-phase question.
- [ ] Registry format for `tower_id` (proposal open question 2) is assumed here, not decided.
