# Audit C — What grade of fence can the Control Tower obtain from `pi-intercom`?

**Subject:** `pi-intercom@0.12.0` (third-party npm, MIT), source at
`/home/emili/.pi/agent/npm/node_modules/pi-intercom/`
**Date:** 2026-08-27 · **Method:** empirical. Every claim is backed by a command and its real output.
**Cost:** **0 model-contacting invocations.** Everything below was measured by driving the broker socket
directly with a ~60-line Python client that has no Pi dependency, plus source reading.
**Isolation:** all brokers ran under scratch `PI_CODING_AGENT_DIR`s (`/tmp/pic-*`). Nothing under
`/home/emili/projects/control-tower/` was touched, read as a working dir by a broker, or written to.
**Frame:** Audit A treated the single shared broker as a potential disqualifier. The maintainer's
correction is the brief here: Intercom is a **substrate the Tower leverages**, so the question is what
**grade** of fence the Tower can obtain, and whether that fence is enforced by the runtime or merely
advisory.

**Grade vocabulary used throughout (from the brief, applied without rounding up):**

- **Grade 1 — structurally enforced.** No channel exists. The agent cannot bypass it even if its model
  decides to try.
- **Grade 2 — broker-enforced.** One shared broker that itself refuses cross-scope delivery and refuses
  to disclose out-of-scope peers. Bypass requires defeating the broker, not merely misbehaving.
- **Grade 3 — advisory.** The channel exists and works; compliance depends on the agent choosing to obey.

---

## Verdict

**The Tower can obtain a genuine Grade 2 fence today, and hub-and-spoke is expressible — but not in the
shape the obvious reading suggests, and Grade 1 is not available from configuration alone.**
`PI_INTERCOM_SCOPE_ID` is a **real broker-side fence, not a client-side courtesy**: the broker keys its
session table on `JSON.stringify([scopeId, sessionId])` (`broker/broker.ts:148-150`), so a cross-scope
target is not *filtered out*, it is *not in the map*. The decisive test passed cleanly — an out-of-scope
client could not reach a peer by session id, by display name, by id prefix, or by `exact-send` with a
**leaked `endpointEpoch`**; all four returned `E_TARGET_NOT_FOUND`, and the target's socket received
nothing at all. That is Grade 2 for *delivery* and for *roster disclosure*. What is **not** Grade 2 is
**membership**: `scopeId` is copied verbatim from the client's own `register` frame
(`broker/broker.ts:436`) with no credential check anywhere in the broker, so any process that can write to
the socket may declare itself into any scope — measured, in one line. Membership is therefore **Grade 3**.
The composite that matters for the Tower: an agent that only has the `intercom` tool **cannot** change its
scope (scope is read from `process.env` at connect time, `config.ts:22`, never from the writable
`config.json`), so the fence holds at Grade 2 against the realistic failure mode — a confused model. An
agent that also holds `bash` or `write` can defeat it trivially, dropping it to Grade 3. **Hub-and-spoke
is achievable as N scopes of two members each with a multi-homed hub, and it was measured working** — but
a **Pi agent cannot be the hub**, because the Intercom extension holds exactly one client
(`index.ts:596`) bound to one env-derived scope. The hub must be a Tower-owned process holding one
connection per spoke. Given that the hub must be Tower-owned anyway, the better shape is **one broker per
worktree** (`PI_CODING_AGENT_DIR`), which is the strongest fence available without new code: separate
processes, separate sockets, no cross-broker delivery — verified — and, unlike scopes, no shared
`MAX_SESSIONS` budget and no shared mailbox. It still is not Grade 1, because all agents run as UID 1000
and a `bash`-capable agent can `connect()` to a sibling worktree's `0600` socket by path — measured, it
works. **True Grade 1 requires either a capability fence (`--tools` allowlist denying `bash`/`write`/
`edit`, which Audit A proved is a standing runtime predicate) composed with per-worktree brokers, or a
Tower-owned `SO_PEERCRED` proxy in front of the broker.** The socket-path scare from Audit A does **not**
apply at the real worktree paths: `/home/emili/projects/control-tower/Worktrees/implementer-1/.pi/agent/intercom/broker.sock`
is **89 bytes** against a measured kernel limit of **107**, with 18 bytes of headroom.

---

## Fence grades table

| # | Mechanism | Grade | How determined | Source / evidence |
|---|---|---|---|---|
| 1 | **Cross-scope message delivery** (`send` by id / name / prefix / exact-send) | **Grade 2** | Empirical: 4/4 addressing modes refused with `E_TARGET_NOT_FOUND`; target socket received nothing. Enforcement is a map-key partition, not a filter. | `broker/broker.ts:148-150` (`scopedSessionKey`), `:642` (exact-send lookup), `:656` + `:1247-1262` (`findSessions`). Evidence §"Decisive test" |
| 2 | **Cross-scope roster disclosure** (`list`) | **Grade 2** | Empirical: `list` filtered server-side before serialization; out-of-scope peers absent from the wire, not hidden by the client. | `broker/broker.ts:597` `.filter(session => sameScope(session.scopeId, requester.scopeId))` |
| 3 | **Cross-scope presence / join / leave broadcasts** | **Grade 2** | Empirical: the out-of-scope client received **zero** frames for the whole run. All four `broadcast()` call sites pass a `scopeId`, and `broadcast` filters. | `broker/broker.ts:1312-1316`; callers `:327, :504, :540, :957` |
| 4 | **Cross-scope extension bus + shared state** (`extension_publish`, `extension_state_commit`, owner election) | **Grade 2** *(source-based; upstream test corroborates)* | Read: namespace keys and state namespaces are scope-hashed; every fanout re-checks `sameScope`. Not re-measured here. | `broker.ts:152-161`, `:1504`, `:1667-1673`; upstream `broker/extension.test.ts:350` "extension bus owners, publish, and state are scoped" |
| 5 | **Scope membership** (who gets to be in scope S) | **Grade 3** | Empirical: a client declared `scopeId:"planA"` in its own `register` frame and was admitted, listed, and delivered to. No credential check exists. | `broker/broker.ts:436` `const scopeId = normalizeScopeId(clientMessage.scopeId)` — copied verbatim. Evidence §"Bypass 1" |
| 6 | **Scope membership, as seen by a Pi agent's `intercom` tool only** | **Grade 2** | Read: scope is resolved from `process.env` at each `connect()`, and is **not** a `config.json` key, so an agent cannot change its own scope through any Intercom surface. The tool exposes no broker-path or scope override. | `config.ts:6,22-23`; `broker/client.ts:286-292`; `config.ts` `IntercomConfig` has no scope field |
| 7 | **Scope hop on an existing connection** | **Grade 2** | Empirical: a second `register` on the same socket is rejected (`Received duplicate register message`) and the connection is destroyed. | `broker/broker.ts:423-425`. Evidence §"Bypass 4" |
| 8 | **Multi-homing across scopes from one process** (2 sockets, 2 scopes) | **Grade 3** | Empirical: one process registered in `planA` and `planB` simultaneously and could relay between them. This is also the mechanism the Tower's own hub needs — the same primitive is the fence's hole and the topology's enabler. | Evidence §"Bypass 2" |
| 9 | **Same-scope session-id takeover** | **Grade 3 — and worse than advisory** | Empirical: registering under an existing `sessionId` in the same scope **evicts** the incumbent (`previous.socket.end()`) and inherits all traffic addressed to that id. No authentication of any kind. | `broker/broker.ts:456-459`. Evidence §"Bypass 3" |
| 10 | **Separate `PI_CODING_AGENT_DIR` per worktree** (one broker each) | **Grade 2** alone; **Grade 1 only composed with a Pi `--tools` allowlist** | Empirical: two brokers ran concurrently, rosters fully disjoint, cross-broker send failed. **But** a same-UID process opened the sibling's `0600` socket by path and registered. Not "no channel" — a channel the agent must go looking for. | `broker/paths.ts:64-71`; evidence §"Cross-broker reachability" |
| 11 | **`trustedLocal: true` on `SessionInfo`** | **Not a fence at all** | Read + Audit A measurement: it is set from `typeof LISTEN_TARGET === "string" && platform !== "win32"` — i.e. "this is a Unix socket, not TCP". | `broker/broker.ts:476` |
| 12 | **Socket file permissions** | **Grade 1 against other UIDs, Grade 0 within UID 1000** | Empirical: dir `0700`, socket `0600`, uid 1000. Every Tower agent runs as uid 1000. | measured `stat` in §"Cross-broker reachability" |
| 13 | **Peer credentials (`SO_PEERCRED`)** | **Absent** | `rg` over the whole package: zero occurrences of `PEERCRED`/`getsockopt`/`ucred`. Node core cannot do it (`net.Socket.getsockopt` is `undefined`; `os.constants.SO_PEERCRED` is `false`). | Evidence §"SO_PEERCRED feasibility" |
| 14 | **"Tell the agents not to message each other" (prompt/skill instruction)** | **Grade 3** | By definition. An instruction is not a fence. Recorded here only so it is never counted as one. | — |

---

## The decisive test

This is §2 of the brief: **can client A send directly to client B's session id even though B is out of
scope, and does the broker deliver it?** Three clients on **one** broker
(`/tmp/pic-a/intercom/broker.sock`): `hub-001` and `w1-001` in scope `planA`, `x1-001` in scope `planB`.
`x1-001` was additionally handed `hub-001`'s `endpointEpoch` **out of band** — simulating the worst case
where an agent has leaked or logged the exact-send token — and tried all four addressing modes the
protocol offers.

```
[register hub scope=planA] {"type": "registered", "sessionId": "hub-001", "features": ["extension-bus-v1", "exact-send-v1"]}
[register w1  scope=planA] {"type": "registered", "sessionId": "w1-001", "features": ["extension-bus-v1", "exact-send-v1"]}
[register x   scope=planB] {"type": "registered", "sessionId": "x1-001", "features": ["extension-bus-v1", "exact-send-v1"]}

=== ROSTERS ===
[hub.list (scope planA)] {"type":"sessions","requestId":"r1","sessions":[
   {"id":"hub-001","endpointEpoch":"827c38b2-bd61-4dfc-a5d7-325632cfb0e8","name":"COORDINATOR","cwd":"/tmp/wt-hub",...},
   {"id":"w1-001","endpointEpoch":"f749724d-9179-4313-92fb-6ce634a27c4f","name":"WORKER-1","cwd":"/tmp/wt-1",...}]}
[x.list   (scope planB)] {"type":"sessions","requestId":"r2","sessions":[
   {"id":"x1-001","endpointEpoch":"919dc0ab-ac74-4304-83e1-baf6ed5feae6","name":"OUTSIDER","cwd":"/tmp/wt-x",...}]}

hub-001 endpointEpoch (leaked out-of-band to X): 827c38b2-bd61-4dfc-a5d7-325632cfb0e8

=== DECISIVE TEST: cross-scope direct send by session id ===
[x -> 'hub-001' (plain send)]           {"type":"delivery_failed","messageId":"m-cross-1","reason":"Session not found","delivery":"failed","code":"E_TARGET_NOT_FOUND","retryable":false,"outcomeKnown":true}
[x -> 'COORDINATOR' (by name)]          {"type":"delivery_failed","messageId":"m-cross-2","reason":"Session not found","delivery":"failed","code":"E_TARGET_NOT_FOUND","retryable":false,"outcomeKnown":true}
[x -> 'hub' (by id prefix)]             {"type":"delivery_failed","messageId":"m-cross-3","reason":"Session not found","delivery":"failed","code":"E_TARGET_NOT_FOUND","retryable":false,"outcomeKnown":true}
[x -> exact-send targetId+targetEpoch]  {"type":"delivery_failed","messageId":"m-cross-4","reason":"Session not found","delivery":"failed","code":"E_TARGET_NOT_FOUND","retryable":false,"outcomeKnown":true}

=== CONTROL: in-scope send must succeed ===
[w1 -> 'hub-001' (same scope planA)]    {"type":"delivered","messageId":"m-in-1","delivery":"socket_delivered","retryable":false,"outcomeKnown":true}

=== what hub actually received ===
[hub<-] {"type":"session_joined","session":{"id":"w1-001",...}}
[hub<-] {"type":"message","from":{"id":"w1-001",...},"message":{"id":"m-in-1","content":{"text":"in-scope control"},...}}

=== what x received (broadcasts) ===
(empty)
```

**Reading of this result — precisely.**

1. **The filtering is broker-side, and it is structural, not a predicate that could be forgotten.** The
   broker never holds a flat `sessionId → session` map. `this.sessions` is keyed by
   `scopedSessionKey(scopeId, sessionId)` = `JSON.stringify([scopeId ?? null, sessionId])`
   (`broker/broker.ts:148-150`). The exact-send path does
   `this.sessions.get(scopedSessionKey(fromSession.scopeId, targetId))` (`:642`) — note it uses the
   **sender's** scope, not a scope the sender supplies. The fuzzy path is `findSessions(to, fromSession.scopeId)`
   (`:656`), whose three resolution strategies (exact key, name match, id prefix) all carry
   `sameScope(...)` (`:1247-1262`). There is no code path in which a client's own request parameters
   select the scope used for the lookup.
2. **The `E_TARGET_NOT_FOUND` on `m-cross-4` is the important one.** `exact-send` is the protocol's
   privileged addressing mode, and it was given a *correct, current* `endpointEpoch`. The epoch check
   (`:648`, `E_TARGET_REBOUND`) is never even reached, because the scoped key lookup at `:642` fails
   first. A leaked epoch buys an out-of-scope client nothing.
3. **The fence hides, it does not merely refuse.** `hub` received exactly two frames across the run — the
   in-scope `session_joined` and the in-scope message. It never saw `x1-001` join, never saw its presence,
   and never saw a rejected attempt. `x` received **zero** frames. So the roster is not "the full list,
   trimmed at the client"; the out-of-scope peer is invisible on the wire in both directions.
4. **Therefore `PI_INTERCOM_SCOPE_ID` is a real Grade 2 fence for delivery and disclosure.** It is *not* a
   Grade 3 mechanism wearing a Grade 2 costume, which was the specific thing this test was built to catch.

**And here is the half that is Grade 3, measured in the same session.** The fence is on the *doors*; it is
not on the *keys*. `scopeId` arrives in the client's own `register` frame and is used verbatim:

```
=== BYPASS 1: an out-of-scope client simply DECLARES the target scope ===
[evil reg scopeId='planA' (self-declared)] {"type":"registered","sessionId":"evil-001","features":[...]}
[evil.list] {"type":"sessions","requestId":"b1","sessions":[
    {"id":"hub-001","name":"COORDINATOR","cwd":"/tmp/wt-hub",...},
    {"id":"w1-001","name":"WORKER-1","cwd":"/tmp/wt-1",...},
    {"id":"evil-001","name":"WORKER-2-IMPERSONATOR","cwd":"/tmp/wt-x",...}]}
[evil -> hub-001] {"type":"delivered","messageId":"m-bypass-1","delivery":"socket_delivered",...}
[hub<-] {"type":"message","from":{"id":"evil-001","name":"WORKER-2-IMPERSONATOR","cwd":"/tmp/wt-x",...},
         "message":{"id":"m-bypass-1","content":{"text":"I declared my own scope and I am in."}}}
```

`broker/broker.ts:436` is the whole story: `const scopeId = normalizeScopeId(clientMessage.scopeId);`.
`normalizeScopeId` (`:134-142`) does exactly one thing — reject a non-string and trim. There is no
authentication, no allowlist, no `SO_PEERCRED`, no cross-check against the process's real cwd.

**Why this still lands at Grade 2 for the Tower's actual threat model, stated carefully.** The realistic
failure the Tower is fencing against is *a confused or over-eager model*, not *a hostile operator*. For a
Pi agent, scope is not reachable from the model's tool surface at all:

- It comes only from the environment variable `PI_INTERCOM_SCOPE_ID` (`config.ts:6,22-23`), read at every
  `connect()`/reconnect (`broker/client.ts:286`), including the automatic reconnect path
  (`index.ts:1397-1451`) — so it survives broker restarts without the Tower re-asserting it.
- It is **not** a field of `IntercomConfig` (`config.ts:29-58`), so an agent that can write
  `$PI_CODING_AGENT_DIR/intercom/config.json` still cannot change its scope.
- The `intercom` tool exposes no socket-path, agent-dir, or scope parameter.
- A process cannot mutate its own environment retroactively, and a second `register` on the same socket is
  refused (`Bypass 4` below).

So: **an agent whose only channel is the `intercom` tool is fenced at Grade 2. An agent that also holds
`bash`, `write`, or `edit` is fenced at Grade 3**, because it can write a 30-line socket client — as this
audit did, with no Pi dependency whatsoever. That is the entire distinction, and it is a capability
question, not an Intercom question. Audit A already proved `--tools`/`--exclude-tools` is a standing
runtime predicate (`dist/core/agent-session.js:2035`), so the Tower has the lever.

### The other three bypasses, for completeness

```
=== BYPASS 2: one process, two sockets, two scopes simultaneously ===
[bridge conn#1 scope=planA] {"type":"registered","sessionId":"bridge-a",...}
[bridge conn#2 scope=planB] {"type":"registered","sessionId":"bridge-b",...}
[bridge_a.list(planA)] ["hub-001","w1-001","evil-001","bridge-a"]
[bridge_b.list(planB)] ["bridge-b"]
>> one OS process now holds membership in both scopes; relaying A<->B is trivial

=== BYPASS 3: same-scope session-id takeover (evict the incumbent) ===
[imposter reg AS hub-001 in planA] {"type":"registered","sessionId":"hub-001",...}
incumbent hub socket events after takeover:
[hub<-] {"type":"__closed__"}                       <- the real hub's socket was ended by the broker
[w1 -> hub-001 now lands where?] {"type":"delivered","messageId":"m-bypass-3","delivery":"socket_delivered",...}
[imposter<-] {"type":"message","from":{"id":"w1-001",...},"message":{"id":"m-bypass-3","content":{"text":"who gets this?"}}}
(real-hub received nothing)

=== BYPASS 4: duplicate register on ONE socket (scope hop in place)? ===
[hop reg planB] {"type":"registered","sessionId":"hop-1",...}
[second register on same socket] {"type":"__closed__"}      <- refused, connection destroyed
```

Bypass 3 deserves a line of its own because it is not merely a fence hole: **within a scope, any process
that knows a session id can take that identity over and silently inherit its inbound traffic**, and the
displaced holder gets only a socket close. `broker/broker.ts:456-459` does
`if (previous) { this.clearMessageReceiptRoutesForSession(key); previous.socket.end(); }`. If the Tower
uses predictable session ids (`impl-1`, `coord`), an agent that guesses one can impersonate a seat. Session
ids should be unguessable if any part of the protocol depends on them for authority.

---

## Hub-and-spoke: what shape actually works

**Does the broker support asymmetric ACLs or allowlists? No.** Scope is a symmetric equivalence class:
`sameScope(a, b)` is `a === b` (`broker/broker.ts:144-146`). Everyone in scope S sees and can reach
everyone else in S. There is no per-session ACL, no allowlist, no directional edge, no "publish-only"
role anywhere in the protocol (`types.ts:107`, `broker/protocol.ts`). So a single scope containing a
coordinator and three workers gives a fully-connected mesh, which is the opposite of the requirement.

**Hub-and-spoke therefore has to be built as N scopes of two members each, with the hub multi-homed.**
That works, and it was measured working:

```
=== HUB-AND-SPOKE via 3 scopes x 2 members, coordinator multi-homed ===
[coordinator leg 1 in scope spoke-1] registered coord-leg-1
[coordinator leg 2 in scope spoke-2] registered coord-leg-2
[coordinator leg 3 in scope spoke-3] registered coord-leg-3
[worker 1 in scope spoke-1] registered impl-1
[worker 2 in scope spoke-2] registered impl-2
[worker 3 in scope spoke-3] registered impl-3

--- rosters ---
[impl-1 sees]             ["coord-leg-1","impl-1"]
[coordinator leg 1 sees]  ["coord-leg-1","impl-1"]
[impl-2 sees]             ["coord-leg-2","impl-2"]
[impl-3 sees]             ["coord-leg-3","impl-3"]

--- worker -> coordinator (must work) ---
[impl-1 -> coord-leg-1] delivered   [impl-2 -> coord-leg-2] delivered   [impl-3 -> coord-leg-3] delivered

--- worker -> worker (must fail) ---
[impl-1 -> impl-2 by id]        E_TARGET_NOT_FOUND
[impl-1 -> IMPLEMENTER-2]       E_TARGET_NOT_FOUND
[impl-1 -> 'impl' prefix]       delivered   <-- see note below
[impl-1 -> coord-leg-2]         E_TARGET_NOT_FOUND

--- coordinator -> worker (must work, per leg) ---
[coord leg 1 -> impl-1] delivered   [coord leg 2 -> impl-2] delivered   [coord leg 3 -> impl-3] delivered

--- what each worker actually received ---
[impl-1 inbox] [("message","m-lat-3"), ("message","m-down-1")]
[impl-2 inbox] [("message","m-down-2")]
[impl-3 inbox] [("message","m-down-3")]
```

The one "delivered" in the lateral block is **not a leak**: the id-prefix resolver matched `impl-1`
itself, the only in-scope id starting with `impl`, so `impl-1` messaged itself (`m-lat-3` appears in its
own inbox). `impl-2` and `impl-3` received only their coordinator's directive. **Nobody talked to anybody
except through the hub.**

**The load-bearing constraint the maintainer needs to know: the hub cannot be a Pi agent.** The Intercom
extension keeps exactly one client (`index.ts:596`, `let client: IntercomClient | null = null`) whose
scope comes from the process environment. A Pi coordinator is therefore in **one** scope, and one scope
cannot be three private two-member rooms. The workable shapes are:

| Shape | Fence for worker↔worker | Hub can be a Pi agent? | Notes |
|---|---|---|---|
| **One broker, one scope, all seats** | **none** (full mesh) | yes | this is Intercom's default and it is the shape Audit A flagged |
| **One broker, one scope per spoke, hub multi-homed** | **Grade 2** (measured) | **no** — hub must be a Tower-owned multi-socket process | shares one `MAX_SESSIONS` budget and one mailbox; hub needs 1 socket per spoke |
| **One broker per worktree, Tower supervisor connects to all** | **Grade 2**, and stronger in kind | **no** — same reason | separate processes/sockets/lifecycles; no shared limits; per-seat restart blast radius |
| **Either of the above + Pi `--tools` allowlist without `bash`/`write`/`edit`** | **Grade 1 in practice** | no | the agent's tool surface contains no way to open a socket |
| **Per-worktree brokers under separate UIDs or a mount namespace** | **Grade 1, unconditionally** | no | not attempted; would also fix the `0600`-same-UID hole |

Because the hub must be a Tower-owned process in every shape that fences anything, **the choice between
"scopes on one broker" and "a broker per worktree" is not a choice about whether the Tower writes a
supervisor — it writes one either way.** Given that, per-worktree brokers are the better buy: they give
the same Grade 2 and additionally remove the shared `MAX_SESSIONS` pool, the shared mailbox, the shared
rate-limit surface, and the single point of failure.

---

## Socket path arithmetic

Audit A hit a phantom `EADDRINUSE` on a 141-byte socket path and warned that per-worktree agent dirs
might not fit. **Measured, that warning does not apply at the real worktree paths.**

Kernel limit, measured by binding `AF_UNIX` paths of increasing length:

```
bind at 89 bytes:  OK
bind at 107 bytes: OK
bind at 108 bytes: [Errno 36] AF_UNIX path too long
longest AF_UNIX path that bound successfully: 107 bytes
```

The socket path is always `$PI_CODING_AGENT_DIR/intercom/broker.sock` (`broker/paths.ts:64-71`), i.e.
agent dir + **28 bytes**. The real seats:

| Layout | Example resulting socket path | Bytes | Fits ≤107? | Headroom |
|---|---|---|---|---|
| **A — `PI_CODING_AGENT_DIR=<worktree>/.pi/agent`** | `/home/emili/projects/control-tower/Worktrees/implementer-1/.pi/agent/intercom/broker.sock` | **89** | **YES** | 18 |
| B — `<worktree>/.pi` | `/home/emili/projects/control-tower/Worktrees/implementer-1/.pi/intercom/broker.sock` | 83 | YES | 24 |
| C — `~/.pi/agent-<seat>` | `/home/emili/.pi/agent-implementer-1/intercom/broker.sock` | 56 | YES | 51 |
| D — `~/.control-tower/pi/<seat>` | `/home/emili/.control-tower/pi/implementer-1/intercom/broker.sock` | 64 | YES | 43 |
| **E — `/run/user/1000/ct/<seat>`** | `/run/user/1000/ct/implementer-1/intercom/broker.sock` | **52** | **YES** | 55 |
| G — `/tmp/ct-<seat>` | `/tmp/ct-implementer-1/intercom/broker.sock` | 42 | YES | 65 |

All four seats (`implementer-1`, `-2`, `-3`, `support-agent`) produce identical byte counts within a
layout; `support-agent` is the same length as `implementer-1`. Audit A's failure came from its scratchpad
dir, not from the worktree tree: its working path `/tmp/pia/intercom/broker.sock` is 29 bytes, its failing
one 141.

**Recommendation, with numbers.** Layout A (`<worktree>/.pi/agent`, **89 bytes, 18 to spare**) is viable
and has the appeal of keeping the runtime beside the worktree — but 18 bytes is thin: one deeper worktree
name (`implementer-plan-5-b` instead of `implementer-1`, +7) or one extra path segment eats it, and the
failure mode is a *misleading* `EADDRINUSE`, not a clear error. **Prefer layout E,
`/run/user/1000/ct/<seat>` (52 bytes, 55 to spare)**: it is a `0700` tmpfs that the kernel already
guarantees per-user, it is wiped on logout so no stale sockets or pidfiles survive a reboot, and it leaves
room for longer seat names. If `/run/user/1000` is unacceptable because the Tower wants the runtime dir to
survive a session, layout D (`~/.control-tower/pi/<seat>`, 64 bytes) is the durable equivalent.
Whichever is chosen, **the Tower should compute `len(agent_dir) + 28` at spawn time and refuse to start
above 107**, so this failure is ever only a clear precondition error.

---

## Broker lifecycle: what a Tower-owned broker can and cannot do

Measured by spawning the broker directly as
`node <tsx>/dist/cli.mjs <pi-intercom>/broker/broker.ts` with `PI_CODING_AGENT_DIR` set — no `pi`, no
`npx`, no lazy spawn.

**What works, cleanly:**

| Capability | Result |
|---|---|
| Deterministic start | Yes. Direct `node tsx broker.ts` with the env var set. Avoids Audit A's `npx --no-install tsx` cwd-sensitivity entirely. |
| Known socket path | Yes, purely derived: `$PI_CODING_AGENT_DIR/intercom/broker.sock` (`paths.ts:64-71`). No discovery needed. |
| Readiness detection | Yes, and it is a real handshake, not a file-exists poll: connect and send `{"type":"health","requestId":...}`, wait for `{"type":"health_ok","protocol":"pi-intercom","version":1}`. **Measured 0.71–0.82 s** from spawn to `health_ok`. `health` is answered before registration, so the probe costs nothing. |
| Clean shutdown | Yes. `SIGTERM`/`SIGINT` → `shutdown()` (`broker.ts:262`, `:1679-1710`): ends every session socket, unlinks the socket file and the pidfile, exits 0. Verified: `socket removed: True  pidfile removed: True`. |
| Two brokers concurrently, no interference | Yes. Rosters fully disjoint; cross-broker send → `E_TARGET_NOT_FOUND`. |
| Refusal to double-start on one agent dir | Yes. `assertNoLiveBroker` (`runtime-claim.ts`) checks the pidfile with `kill(pid, 0)`; second broker exits **1** with `Refusing to replace live intercom broker process 27403`. A supervisor can rely on this as a mutex. |
| Restart over a stale socket + stale pidfile | Yes. After `SIGKILL` both files are left behind, and a fresh broker started **anyway, in 0.82 s**. `assertNoLiveBroker` returns cleanly on `ESRCH`, and the listen path unlinks the stale socket. So Audit A's `EADDRINUSE` really was path length, not a stale-socket problem. |

**What the Tower must handle itself:**

1. **The pidfile is not the pid you spawned.** Measured: `spawned(tsx wrapper) pid=27360, broker.pid file
   says 27371, identical=False`. `tsx`'s CLI is a wrapper that re-execs the real broker as a child. Two
   consequences. (a) To signal the broker, **read `broker.pid`** — do not signal the spawned pid.
   (b) The wrapper *does* die when the child is `SIGKILL`ed (measured `returncode=137`), so it is not an
   orphan risk — but during this audit, killing the pidfile pid while the broker had been spawned
   **without** `start_new_session=True` killed the supervising shell too. **Spawn the broker with
   `setsid`/`start_new_session=True`**; every later measurement here did, and the supervisor survived
   cleanly. Better still: bypass the wrapper entirely and spawn
   `node <tsx>/dist/cli.mjs <broker.ts>` → the pidfile pid is then the only one that matters, or use
   `node --import tsx` to get a single process.
2. **The broker idle-shuts-down after 5 s with zero registered sessions** (`scheduleShutdownCheck`,
   `broker.ts:369-379`). Observed three times during this audit, including mid-test. A Tower-owned broker
   must hold at least one registration open for its whole life — the supervisor's own connection is the
   natural keepalive, and that connection is also the hub leg it needs anyway.
3. **Raw socket clients do not auto-reconnect; Pi agents do.** After the broker was `SIGKILL`ed, this
   audit's Python clients got `session_left`/`__closed__` and then `Broken pipe` — they are dumb by
   design. A **real Pi agent does re-register automatically**: `client.on("disconnected")` →
   `scheduleReconnect()` → `ensureConnected("background")` → `connect(buildRegistration(), sessionId)`
   (`index.ts:1377-1451`), which re-reads `PI_INTERCOM_SCOPE_ID` from the environment
   (`broker/client.ts:286`). So **scope survives a broker restart without the Tower re-asserting it** —
   good. Note the new registration mints a **new `endpointEpoch`** (`broker.ts:466`), so any Tower state
   keyed on epoch must be refreshed after a broker restart. *(The Pi-side reconnect is source-verified,
   not run — see "What I could not measure".)*
4. **In-flight messages: queued, but not durable.** `mailboxMessages` works and was measured end to end.
   A send to a **disconnected but remembered** session returns `delivery:"queued"` (not
   `socket_delivered`), and the message is delivered on that session's next registration:

   ```
   [main -> impl-3 (offline)]  {"type":"delivered","messageId":"m-mbx-1","delivery":"queued",...}
   [impl-3 reconnects]         {"type":"registered","sessionId":"impl-3",...}
   [impl-3 mailbox flush]      [{"type":"message","from":{"id":"main-000",...},
                                 "message":{"id":"m-mbx-1","content":{"text":"queued while you were away"},
                                 "brokerReceivedAt":1787858551866,"brokerDeliveredAt":1787858552274}}]
   ```

   But it is **RAM only**. `shutdown()` does `this.mailboxMessages.length = 0` (`broker.ts:1686`) and
   nothing is ever persisted. Measured:

   ```
   [main -> impl-3 (offline again)] {"type":"delivered","messageId":"m-mbx-2","delivery":"queued",...}
   (SIGTERM broker, restart broker, impl-3 registers)
   [after broker restart, impl-3 receives] NOTHING (mailbox lost with the process)
   ```

   Retention while alive: `MAILBOX_MESSAGE_RETENTION_MS = 24 h`, `MAX_MAILBOX_MESSAGES = 256`
   (overflow evicts oldest with `E_DELIVERY_EVICTED`), `DISCONNECTED_SESSION_RETENTION_MS = 24 h`.
   **A Tower that needs at-least-once directive delivery across a broker restart must own the queue
   itself.** Intercom's mailbox is a convenience, not a durable log.
5. **Sub-second cross-scope delivery timing was not a problem at any point** — `brokerReceivedAt` to
   `brokerDeliveredAt` was 0–2 ms for live sockets, ~400 ms for a mailbox flush (which includes the
   registration round trip).

---

## Concurrency sanity

Audit A never exercised the limits. Measured here on one broker, plus the constants from source
(`broker/broker.ts:32-46`, `broker/framing.ts:3`):

| Limit | Value | Tower's real seat count (5: Main + coordinator + 3 implementers) |
|---|---|---|
| `MAX_SESSIONS` | **128** — **global, not per scope** (`:454` tests `this.sessions.size`) | 5 / 128 = **3.9 %** |
| `MAX_UNREGISTERED_CONNECTIONS` | 32 (oldest evicted) | not approached |
| `REGISTRATION_TIMEOUT_MS` | 1000 ms to send `register` or be dropped | trivially met |
| `RATE_LIMIT_CAPACITY` / refill | 240 tokens, **120 frames/s per connection** | a seat emitting ~1 presence heartbeat/s uses <1 % |
| `PRESENCE_HEARTBEAT_MS` | 1000 ms | 5 seats → ~5 frames/s of presence total |
| `MAX_FRAME_BYTES` | 1 MiB | — |
| `MAX_EXTENSIONS_PER_SESSION` / msg / state | 32 / 16 KiB / 64 KiB | — |
| `MAX_MAILBOX_MESSAGES` | 256 (in RAM, lost on restart) | — |
| `MAX_DELIVERY_RECORDS` | 4096, 1 h retention (dedupe/replay window) | — |

Five concurrent seats:

```
=== CONCURRENCY: 5 seats on broker A (3 workers + coordinator + Main) ===
[reg main-000]  registered     [reg coord-000] registered
[reg impl-1]    registered     [reg impl-2]    registered     [reg impl-3] registered
5 registrations in 0.022s
roster size = 5: ['main-000','coord-000','impl-1','impl-2','impl-3']
```

Rate limiter, exercised deliberately:

```
=== rate limiter: burst 400 list requests from one connection ===
sent 400 frames; error frames=1; connection closed=True
[first error] {"type":"error","error":"Intercom broker rate limit exceeded"}
[A roster after burst client evicted] ['main-000','coord-000','impl-1','impl-2','impl-3']
```

The offender's connection is destroyed; **the other four seats were untouched and the roster was
unchanged**. The limiter is per-connection, so one runaway agent cannot starve its peers.

**Conclusion: the Tower's seat count is nowhere near any limit** — 3.9 % of `MAX_SESSIONS`, well under 1 %
of the rate budget. The only limit worth designing around is `MAX_SESSIONS` being **global across scopes**:
if the Tower ever runs many scopes on one broker it shares one 128-session pool, which is another argument
for per-worktree brokers.

---

## Does a Tower-owned broker unlock a stronger fence than config alone?

**Yes — and it is the only route to Grade 1 without changing the OS-level identity of the agents.**
This section is **source-based reasoning plus targeted feasibility measurement**, labelled as such; nothing
was implemented.

**The upstream gap, restated with a new measurement.** Audit A found the broker trusts client-declared
`cwd`/`pid` and has no `SO_PEERCRED`. Confirmed and extended: `rg 'PEERCRED|getsockopt|ucred'` over the
entire package returns **nothing**. More importantly, **an upstream patch to `broker.ts` alone cannot fix
this in pure Node** —

```
net.Socket getsockopt: undefined
SO_PEERCRED in os.constants: false
```

Node core exposes no `getsockopt`, so upstream would need a native addon (or a `node:sea`-style helper) to
read peer credentials. That is a real reason this gap has not been closed upstream, and it means "file an
issue and wait" is a long road.

**But the Tower does not need Node.** A ~100-line proxy in any language that can read `SO_PEERCRED` closes
it. Measured feasibility, from a plain Python `AF_UNIX` server against a separately-forked client:

```
connecting child real pid          : 27991
SO_PEERCRED reported (pid,uid,gid) : (27991, 1000, 1000)
kernel /proc/<pid>/cwd of peer     : /tmp
kernel pid matches spawned child   : True
```

The kernel hands the accepting side the peer's true pid, uid and gid, and from the pid the true cwd. Those
are exactly the two facts Audit A's decision-76 argument needed and had to source from the spawn instead.

**The interposition, concretely.** Because the socket path is purely derived from `PI_CODING_AGENT_DIR`
(`paths.ts:64-71`), the Tower can split public from private with no patching at all:

- Run the real broker with `PI_CODING_AGENT_DIR=<private dir>` — its socket lives at
  `<private>/intercom/broker.sock`.
- Have the Tower proxy **bind** `<public dir>/intercom/broker.sock`.
- Spawn every agent with `PI_CODING_AGENT_DIR=<public dir>`. The agent's Intercom client connects to the
  proxy and cannot tell the difference: the wire format is 4-byte big-endian length + JSON
  (`broker/framing.ts`), trivially re-framed, and the proxy needs to understand only `register`, `send`,
  `list`, and the `sessions`/`session_joined`/`presence_update` frames it wants to filter.

What that proxy can enforce that configuration alone cannot:

| Enforcement | Grade delivered | Why config alone cannot |
|---|---|---|
| **Overwrite** the client's declared `scopeId` from the Tower's spawn table, keyed on `SO_PEERCRED` pid | **Grade 2 → membership becomes Grade 2 too** | closes Bypass 1 and Bypass 2 — a second socket from the same pid gets the same scope, so the relay bridge dies |
| **Reject** a `register` whose declared `cwd`/`pid` disagree with `/proc/<peercred_pid>/cwd` | Grade 2, and makes `SessionInfo` trustworthy for the first time | closes Audit A's "invented cwd, published as `trustedLocal:true`" finding *without* requiring the Tower to have spawned the process |
| **Reject** a `register` for a `sessionId` already held by a different pid | closes Bypass 3 (seat takeover) | the broker's own behaviour is to evict the incumbent; only an interposer can refuse |
| **Drop `send` frames** that violate an explicit hub-and-spoke edge list | **asymmetric ACLs**, which the broker does not have at all | scopes are symmetric by construction (`sameScope` is `===`) |
| **Filter `sessions` / `session_joined` / `presence_update`** to the hub-and-spoke view | true directional visibility | same reason |

**Is that Grade 1?** Honestly: **no, it is a very strong Grade 2.** The private broker socket still lives
on the same filesystem under the same uid, so a `bash`-capable agent that goes looking can find it and
connect directly, bypassing the proxy. It becomes Grade 1 when the private socket is placed where the
agent cannot reach it — a different uid, a mount namespace, or a directory the agent's process cannot
traverse. **The cheapest honest Grade 1 available today is not the proxy at all: it is per-worktree
brokers composed with a Pi `--tools` allowlist that omits `bash`, `write`, and `edit`** — at which point
the agent's *entire* channel inventory is the `intercom` tool, which has no scope, agent-dir, or
socket-path parameter, and the fence cannot be bypassed by a model that decides to try.

---

## Evidence — commands and raw output

All scripts and captured output live in the scratchpad and were run from `/tmp`:
`…/scratchpad/audit-c/{ic.py,t_scope.py,t_bypass.py,t_hub.py,t_life.py,t_mbx.py,t_crossbroker.py,t_sunpath.py,t_peercred.py}`
with outputs `out_*.txt`. Brokers were launched as:

```
node /home/emili/.pi/agent/npm/node_modules/tsx/dist/cli.mjs \
     /home/emili/.pi/agent/npm/node_modules/pi-intercom/broker/broker.ts
   with PI_CODING_AGENT_DIR=/tmp/pic-{a,b,h,m,w1,w2}, cwd=/tmp, start_new_session=True
```

### Package identity

```
$ bat /home/emili/.pi/agent/npm/node_modules/pi-intercom/package.json
{"name":"pi-intercom","version":"0.12.0","license":"MIT","type":"module","main":"index.ts", …
 "dependencies":{"tsx":"^4.20.0"}}
```

Source ships unbundled TypeScript, executed through `tsx`. `broker/broker.ts` is 65 K,
`index.ts` 119 K.

### Broker startup, readiness, runtime dir

```
spawned(tsx wrapper) pid=27360  broker.pid file says 27371  identical=False
readiness (health_ok round-trip) after 0.71s
$ eza -la /tmp/pic-a/intercom/
.rw------- 5  broker.pid
srw-------    broker.sock
drwx------    extension-state
drwx------    pending-asks
```

### Idle shutdown (observed, unprompted)

```
$ bat brokerA.log
Intercom broker started (pid: 26288)
No sessions connected, shutting down
Broker shutting down
```

### Cross-broker reachability (§3)

```
=== two brokers, one per simulated worktree, concurrent ===
w1 sock: /tmp/pic-w1/intercom/broker.sock | w2 sock: /tmp/pic-w2/intercom/broker.sock
[impl-1 roster (broker w1)] ["impl-1"]
[impl-2 roster (broker w2)] ["impl-2"]
[impl-1 -> impl-2 (across brokers)] {"type":"delivery_failed","code":"E_TARGET_NOT_FOUND",...}

=== can a process bound to w1 simply OPEN w2's socket? (same UID) ===
stat of w2 socket from the w1 side: 0o600 uid 1000
[w1-side process registers on broker w2] {"type":"registered","sessionId":"impl-1-sneaky",...}
[sneaky roster on w2] ["impl-2","impl-1-sneaky"]
[sneaky -> impl-2] {"type":"delivered","messageId":"m-sneak",...}
[impl-2 inbox] [("session_joined",None), ("message","reached another worktree's broker by path")]
```

**This is the single result that keeps per-worktree brokers at Grade 2 rather than Grade 1.**

### Broker death, restart, double-start guard, graceful stop (§4)

```
=== BROKER SIGKILL with sessions connected ===
main socket events: ['session_left','session_joined','__closed__']
socket file left behind: True
pid file left behind:   True
tsx wrapper pid 27360 alive: False returncode=137

=== RESTART over stale socket + stale pidfile ===
restart OK in 0.82s, new pidfile=27403

=== do pre-existing raw clients auto-recover? ===
main.list on old socket -> OSError: [Errno 32] Broken pipe

=== refuse-to-replace-live-broker guard ===
second broker on same agent dir exit=1
Error: Refusing to replace live intercom broker process 27403
    at assertNoLiveBroker (…/broker/runtime-claim.ts:20:9)
    at new IntercomBroker (…/broker/broker.ts:220:5)

=== graceful SIGTERM ===
socket removed: True  pidfile removed: True
--- broker A2 log ---
Intercom broker started (pid: 27403)
Broker shutting down
```

### Socket path limit (§3)

```
bind at 89 bytes:  OK
bind at 107 bytes: OK
bind at 108 bytes: [Errno 36] AF_UNIX path too long
longest AF_UNIX path that bound successfully: 107 bytes
```

Real seats verified present: `Worktrees/{implementer-1,implementer-2,implementer-3,plan-1,support-agent}`.
`/run/user/1000` exists, mode `drwx------`.

### `SO_PEERCRED` feasibility (§5)

```
$ rg 'PEERCRED|getsockopt|peercred|ucred' /home/emili/.pi/agent/npm/node_modules/pi-intercom/
(no matches)
$ node -e "…"
net.Socket getsockopt: undefined
SO_PEERCRED in os.constants: false
$ python3 t_peercred.py
connecting child real pid          : 27991
SO_PEERCRED reported (pid,uid,gid) : (27991, 1000, 1000)
kernel /proc/<pid>/cwd of peer     : /tmp
kernel pid matches spawned child   : True
```

### Key source lines

```
broker/broker.ts:144  function sameScope(a, b) { return a === b; }                      // symmetric only
broker/broker.ts:148  function scopedSessionKey(scopeId, sessionId) {
                        return JSON.stringify([scopeId ?? null, sessionId]); }          // the fence
broker/broker.ts:436  const scopeId = normalizeScopeId(clientMessage.scopeId);          // the hole
broker/broker.ts:456  if (previous) { …; previous.socket.end(); }                       // seat takeover
broker/broker.ts:476  trustedLocal: typeof LISTEN_TARGET === "string" && …              // NOT identity
broker/broker.ts:597  .filter(session => sameScope(session.scopeId, requester.scopeId)) // roster fence
broker/broker.ts:642  this.sessions.get(scopedSessionKey(fromSession.scopeId, targetId))// exact-send fence
broker/broker.ts:369  scheduleShutdownCheck() … 5000ms idle → shutdown()
broker/broker.ts:1686 this.mailboxMessages.length = 0;                                  // mailbox is RAM
config.ts:22          env["PI_INTERCOM_SCOPE_ID"]?.trim()                               // scope source
broker/client.ts:286  const scopeId = getIntercomScopeId();                             // re-read per connect
index.ts:596          let client: IntercomClient | null = null;                         // one client per agent
broker/paths.ts:64-71 getBrokerSocketPath → join(agentDir, "intercom", "broker.sock")
```

---

## What I could not measure

Explicit and complete.

- **No real Pi agent was run in this audit.** Zero model-contacting invocations by design. Everything about
  the client side was measured with a raw socket client or read from `index.ts`/`broker/client.ts`.
  Specifically **unverified end-to-end**: (a) that a Pi agent launched with `PI_INTERCOM_SCOPE_ID` in its
  environment actually registers with that scope — this is source-certain
  (`client.ts:286` → `register` frame) but not observed; (b) that the auto-reconnect path re-registers
  after a broker restart and re-reads the scope; (c) that the `intercom` **tool** truly offers no
  scope/agent-dir override — I read the tool schema at `index.ts:2173` and the `IntercomConfig` type, but
  did not exercise the tool. Each of these should be confirmed with one cheap `pi -p` run before the Tower
  depends on it.
- **The `--tools` allowlist composition, which the Grade 1 claim rests on, was not run here.** Audit A
  measured `--exclude-tools` empirically and read the shared enforcement predicate; `--tools` itself
  remains untested in both audits. The claim "a Pi agent with only the `intercom` tool has no channel" is
  therefore composed from two source-level facts, not one measurement.
- **The extension bus scoping (row 4 of the grades table) is source + upstream-test only.** I read the
  scope-hashing and the `sameScope` guards on every fanout and the upstream test that asserts it, but did
  not drive `extension_publish` / `extension_state_commit` across scopes myself. Owner election under
  contention across scopes is likewise unexercised.
- **`pending-asks` on-disk records were not examined.** `scopedPendingAskRecordPath` hashes the scope into
  the filename (`broker.ts:163-169`), so scope separation appears to extend to disk, but I did not verify
  that an out-of-scope reader cannot correlate or replay these files. They live in a `0700` dir but are
  same-UID readable like everything else.
- **The `ask` / `expectsReply` path was not tested cross-scope.** `askEdges` carry a `scopeId` and the
  reply-edge checks are scoped in source (`:718, :1120-1127`), but the ask→reply→timeout cycle was not
  exercised at all.
- **`MAX_SESSIONS = 128` was not actually driven to saturation**, nor was
  `MAX_UNREGISTERED_CONNECTIONS = 32`, nor mailbox overflow at 256. The rate limiter *was* driven to
  rejection. The Tower's 5 seats are so far below these that saturation testing has no decision value.
- **The proxy in §5 was not built.** Its feasibility rests on: the wire format (read + re-implemented
  here in Python, so proven), `SO_PEERCRED` availability (measured), and path derivation (read). Latency,
  backpressure, and the `stateId`/Windows-TCP path under a proxy are unassessed.
- **Windows named-pipe and the opt-in loopback TCP transport** were not tested (WSL2 Linux only). The TCP
  path's `stateId` guard changes the trust story and is unmeasured.
- **Separate-UID or namespace isolation — the only unconditional Grade 1 — was not attempted.** Running
  agents as distinct users would change worktree file ownership and Git behaviour across the whole Tower;
  that is a much larger decision than this audit's scope.
- **A late `session_left`.** In one run the broker did not notice a client's socket close for >2 s, so a
  send to that seat returned `socket_delivered` into a dead socket instead of `queued`. It reproduced only
  when the client closed its fd from another thread while a reader was blocked in `recv` — almost
  certainly an artefact of my Python client, not the broker; with a deterministic
  `unregister` + `shutdown(SHUT_RDWR)` the mailbox path behaved correctly every time. **I could not rule
  out a broker-side half-open-socket window**, and a Tower that treats `delivery:"socket_delivered"` as
  proof of receipt should not: only the agent-emitted `receiver_received`/`injected` receipts from Audit A
  Q4 are producer-owned proof.
- **Version drift.** Everything here is `pi-intercom@0.12.0`. It is a third-party MIT package with its own
  release cadence; the map-key scoping in `scopedSessionKey` is an implementation detail with no stability
  guarantee. **Pin it**, and re-run this audit's `t_scope.py` on any bump.

---

## Smallest change that would give the Tower a Grade 1 fence

Named, concrete, in ascending cost. **The first option requires no new code at all.**

**Option 1 — Per-worktree brokers + a Pi tool allowlist. No new components. ~1 day.**

1. Give each seat its own `PI_CODING_AGENT_DIR` under `/run/user/1000/ct/<seat>` (52-byte socket path;
   assert `len(agent_dir) + 28 <= 107` at spawn).
2. Spawn each broker explicitly as `node <tsx>/dist/cli.mjs <pi-intercom>/broker/broker.ts` with
   `start_new_session=True`; gate on a `health_ok` round trip (≈0.8 s); signal via `broker.pid`, never the
   spawned pid; rely on `assertNoLiveBroker` as the mutex.
3. The Tower supervisor holds one registration per broker — that is both the hub leg and the keepalive
   that prevents the 5-second idle shutdown.
4. Launch every agent with a **`--tools` allowlist that omits `bash`, `write`, and `edit`** (Audit A:
   the exclusion is a standing runtime predicate re-applied on every tool-set recomputation,
   `agent-session.js:2085`, so an extension cannot re-admit them).

   *Result:* separate processes, separate sockets, disjoint namespaces, and an agent whose entire channel
   inventory is the `intercom` tool — which has no scope, agent-dir, or socket-path parameter. **Grade 1
   against a model that decides to try.** Not Grade 1 against an operator with a shell, and it costs the
   agents their `bash` tool, which for an implementer seat is usually unacceptable.

**Option 2 — A Tower-owned `SO_PEERCRED` proxy. ~200 lines, 2–3 days including tests.**

Bind `<public>/intercom/broker.sock`, run the real broker on `<private>`, re-frame 4-byte-length JSON,
and on each `register`: read `SO_PEERCRED`, look the pid up in the Tower's spawn table, **overwrite**
`scopeId`, **verify** `cwd` against `/proc/<pid>/cwd`, and **refuse** a `sessionId` held by another pid.
Then drop `send` frames outside an explicit hub-and-spoke edge list and filter `sessions` /
`session_joined` / `presence_update` to the permitted view. This is the only option that gives
**asymmetric ACLs**, which the broker does not have in any form, and it lets implementer seats keep
`bash`. It is a **strong Grade 2**: the private socket is still same-uid reachable by a determined shell.
Feasibility is measured (§5): `SO_PEERCRED` works from Python, the wire format is already re-implemented
in this audit's `ic.py`, and the socket path is purely derived so no patching is required.

**Option 3 — Option 2 with the private broker behind a uid or mount-namespace boundary. Grade 1,
unconditional. Days-to-weeks.**

Run the real broker as a second uid (or inside a mount namespace where the agents cannot traverse to its
socket) with only the proxy able to reach it. This is the only configuration in which "the agent cannot
bypass it even if its model decides to try" is literally true while implementers keep `bash`. It also
closes Audit A's residual "same-UID compromise is out of model" caveat. Cost is real: a second uid means
worktree ownership, Git identity, and file modes across the whole Tower must be reasoned about.

**Upstream is not a route.** The clean fix — the broker stamping the kernel-supplied pid from
`SO_PEERCRED` onto `SessionInfo` and refusing a client-declared `scopeId` — cannot be written in pure
Node (`net.Socket.getsockopt` is `undefined`, `os.constants.SO_PEERCRED` is `false`). It would require a
native addon in a package whose entire appeal is that it ships as readable TypeScript. File the issue for
the record, but do not plan around it landing.

**Recommendation.** Take **Option 1's items 1–3 now** — they are pure operational hygiene, they cost
nothing, they deliver the measured Grade 2, and they are prerequisites for Options 2 and 3 anyway. Adopt
**Option 1's item 4 selectively**: the coordinator and any read-only seat can lose `bash` cheaply and sit
at Grade 1; implementer seats cannot, and sit at Grade 2. Reach for **Option 2** only when the Tower needs
an asymmetric topology that scopes cannot express, or when an implementer seat's `bash` becomes a fence
the maintainer actually wants enforced rather than trusted. **Do not describe any of this as isolation to
a reader who has not read this table**: today, without new code, three worker agents in one scope can see
and message each other, and three worker agents in three scopes can be bridged by any one of them that
holds a shell.
