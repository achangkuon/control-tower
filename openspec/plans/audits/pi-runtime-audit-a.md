# Audit A — Pi CLI runtime as the Control Tower execution host

**Subject:** `pi` v0.84.3 (`/home/emili/.npm-global/bin/pi`, pkg `@earendil-works/pi-coding-agent`)
**Date:** 2026-08-27 · **Method:** empirical. Every claim below is backed by a command and its real output.
**Bar:** decisions 38, 40, 59, 66, 76 of `openspec/plans/decision-register.md`.
**Cost:** 8 model-contacting invocations, **≈ USD 0.0067 total**. Most measurements needed no model call.
**Isolation:** all process work ran in a scratch dir with an isolated `PI_CODING_AGENT_DIR`. Nothing under
`/home/emili/projects/control-tower/` was touched by Pi.

---

## Verdict

**Yes — Pi can host the Tower, and it closes the decision-76 blocker that OpenCode/Herdr could not.**
Pi's `--mode rpc` is a real bidirectional stdio protocol with a full lifecycle event stream; `--session-id`
genuinely lets the caller **assign** identity rather than discover it; the session log is append-only JSONL
that survives `SIGKILL` with the exact in-flight tool call preserved; `--fork` + `--session-id` produce a
caller-named successor whose header carries a producer-written `parentSession` pointer to the terminal
predecessor — which is decision 40's lineage requirement, met by the runtime rather than reconstructed by
the Tower. Most importantly, Pi Intercom is a **local Unix-socket broker whose protocol a non-Pi process can
speak directly**; I registered a plain Python supervisor against it, sent a message to a Tower-spawned Pi
agent, and collected `receiver_received` → `acknowledged` → `injected` receipts **emitted by the receiving
agent itself**, each carrying the session id, a broker-minted `endpointEpoch`, the cwd, and a PID that
matched the PID my supervisor had spawned. That is a falsifiable, producer-owned, nonce-bound attach proof —
exactly the artifact decision 76 says cannot be composed out of pane + auth + liveness.

Three real caveats temper this, none of them fatal: the broker **does not verify** the `cwd`/`pid`/`tmuxPane`
a client declares at registration (the Tower must cross-check against `/proc`, which it can, because it owns
the spawn); Pi's default resume path **resurrects the same session id**, which decision 40 explicitly
discards, so the Tower must deliberately choose the `--fork` path; and `SIGKILL` of a Pi process **leaves its
`bash` tool grandchildren running**, reparented to PID 1 in their own session — so "the agent is dead" is not
the same statement as "nothing is still writing to that worktree."

---

## Scorecard

| # | Question | Verdict | One line |
|---|---|---|---|
| 1 | RPC surface | **PASS** | `--mode rpc` is a bidirectional JSONL protocol streaming `agent_start`/`turn_*`/`tool_execution_*`/`message_update`/`agent_settled` in real time; a parent can both observe and steer. |
| 2 | Caller-assigned session identity | **PASS** | `--session-id` is honoured verbatim — an ID I invented became the on-disk session id, the filename, and the Intercom address. |
| 3 | Death & recovery with lineage | **PARTIAL** | Durable state survives `SIGKILL` and re-binds exactly; `--fork` writes producer-owned `parentSession` lineage. But there is **no producer-emitted stop proof** (the stop proof is OS-level), and the default resume path resurrects the dead id. |
| 4 | Producer-owned liveness proof | **PASS (with a named gap)** | Intercom receipts are emitted by the receiving agent, bound to a caller-chosen message id, and carry session+epoch+cwd+pid. The gap: the broker never verifies the declared cwd/pid. |
| 5 | Capability fencing | **PASS** | `--exclude-tools write,edit,bash` held under direct instruction (model replied `CANNOT`, no file); the identical prompt+model without the fence wrote the file. Enforcement is a runtime predicate, not a prompt hint. |
| 6 | Pi Intercom | **PASS** | Third-party npm extension `pi-intercom@0.12.0` (MIT). Unix-socket broker, length-prefixed JSON. A non-Pi process registered, listed, sent, and collected receipts. Fully scriptable from outside an agent turn. |

---

## Evidence

### Q1 — RPC surface

**Method.** First a null test, then a real drive with a Python harness holding stdin open.

Null test — this is the finding that reframes the question:

```
$ pi --mode rpc -p --session-id 01a04321-...-aaaa --session-dir $A/sessions \
     "reply with the single word OK" < /dev/null
EXIT=0
--- out bytes: 0 ---
Warning: No project session found with id '01a04321-...-aaaa'; creating a new session with that id.
```

Zero output, zero cost, **no model call**. `--mode rpc` ignores the positional prompt: it is a **stdio
server**, not a one-shot printer. With stdin closed it exits immediately.

Driving it properly (timestamps are seconds from harness start):

```
  2.002 [IN ] {"id":"r0","type":"get_state"}
  2.010 [OUT] {"id":"r0","type":"response","command":"get_state","success":true,"data":{...
              "sessionFile":".../2026-08-27T18-23-26-974Z_01a04321-...-aaaa.jsonl",
              "sessionId":"01a04321-0000-7000-8000-00000000aaaa","sessionName":"audit-rpc-A",...}}
  3.003 [IN ] {"id":"r2","type":"prompt","message":"reply with the single word OK"}
  3.011 [OUT] {"id":"r2","type":"response","command":"prompt","success":true}
  3.012 [OUT] {"type":"agent_start"}
  3.013 [OUT] {"type":"turn_start"}
  3.013 [OUT] {"type":"message_start","message":{"role":"user",...}}
  3.367 [OUT] {"type":"message_start","message":{"role":"assistant",...,"stopReason":"error",
              "errorMessage":"401: {\"type\":\"ModelError\",...}"}}
  3.369 [OUT] {"type":"turn_end","message":{...},"toolResults":[]}
  3.380 [OUT] {"type":"agent_end","messages":[...],"willRetry":false}
  3.388 [OUT] {"type":"agent_settled"}
```

With a working model and a tool call, the stream carries per-tool events:

```
{"type":"tool_execution_start","toolCallId":"call_tXbT...","toolName":"bash","args":{"command":"sleep 40","timeout":45}}
{"type":"tool_execution_update","toolCallId":"call_tXbT...","partialResult":{"content":[]}}
```

and token-level deltas with cumulative usage and cost:

```
{"type":"message_update","usage":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"OK"}}
{"type":"message_update","usage":{...},"assistantMessageEvent":{"type":"text_end","contentIndex":0,"content":"OK"}}
```

**`--mode json` comparison.** My going-in hypothesis was that `json` would be final-output-only. **It is not.**
`--mode json` emits the *same* event stream:

```
{"type":"session","version":3,"id":"01a04485-2fad-...","timestamp":"2026-08-27T18:39:34.317Z","cwd":".../wt"}
{"type":"agent_start"}
{"type":"turn_start"}
{"type":"message_update",...,"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"OK"}}
```

The real difference is **direction**, not granularity: `json` is a one-way firehose for a single prompt;
`rpc` adds the stdin command channel (`prompt`, `steer`, `follow_up`, `abort`, `fork`, `clone`,
`switch_session`, `new_session`, `get_entries`, `get_state`, `compact`, `bash`, …). Documented at
`~/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent/docs/rpc.md`.

**Interpretation.** A supervising parent can observe progress in real time *and* intervene mid-run. Two
details matter for the Tower specifically. First, `agent_end` vs `agent_settled` are distinct: `agent_end`
may be followed by an automatic retry or a queued continuation; **only `agent_settled` means the run is
finished.** A supervisor that gates on `agent_end` will act on a live agent. Second, `get_entries` accepts a
`since` cursor of the last entry id — "an entry id works as a durable cursor … even across client restarts" —
so a Tower that restarts can resume observation without replaying or losing events.

**Verdict: PASS.**

### Q2 — Caller-assigned session identity

**Method.** Launched with an ID that is structurally a UUIDv7 but is obviously synthetic
(`01a04321-0000-7000-8000-00000000aaaa` — the runtime would never mint those zero runs), then read back
both the runtime's own report and the bytes on disk.

Runtime report (`get_state`):

```json
"sessionId":"01a04321-0000-7000-8000-00000000aaaa",
"sessionFile":".../sessions/2026-08-27T18-23-26-974Z_01a04321-0000-7000-8000-00000000aaaa.jsonl"
```

On disk, first record of the JSONL:

```json
{"type":"session","version":3,"id":"01a04321-0000-7000-8000-00000000aaaa",
 "timestamp":"2026-08-27T18:23:26.974Z",
 "cwd":".../scratchpad/audit-a/wt"}
```

Stderr when the id is new: `Warning: No project session found with id '…'; creating a new session with that id.`

**Findings.**
- The caller genuinely assigns identity. The runtime mints an ID only when the caller does not supply one.
- Layout under `--session-dir` is flat and deterministic: `<dir>/<ISO8601>_<session-id>.jsonl`. (Without
  `--session-dir` Pi uses `~/.pi/agent/sessions/--slugified--cwd--/…`, i.e. it *derives* a namespace from the
  path — the Tower should always pass `--session-dir` so it owns the namespace instead.)
- The ID is stable and re-openable: re-launching with the same `--session-id` re-opened the same file with
  full history and appended to it (Q3 below).
- **The session header binds `id` to `cwd`** in a producer-written record. This is the durable
  worktree↔session binding decision 38 needs, and Pi writes it, not the Tower.
- The same ID propagates to Intercom as the agent's address (`resolveConfiguredIntercomSessionId` at
  `pi-intercom/index.ts:524-526` returns `PI_INTERCOM_STABLE_SESSION_ID` env → `config.stableId` →
  the Pi session id). Confirmed live in Q6: the broker roster listed the agent under exactly the id I passed.

**Verdict: PASS.** The Tower can own identity end-to-end: process, session file, and message address.

### Q3 — Death and recovery with lineage

**Method.** Spawned Pi under a known `--session-id`, prompted a 40-second `bash` tool call, captured
`/proc/<pid>/cwd`, then `SIGKILL` at t+20s while the tool was mid-execution.

```
  0.000 [SPAWN] parent-owned pid=17107
  4.254 [OUT] {"type":"tool_execution_start","toolName":"bash","args":{"command":"sleep 40","timeout":45}}
lrwxrwxrwx /proc/17107/cwd -> .../scratchpad/audit-a/wt
 20.019 [KILL] sending SIGKILL to 17107
 20.031 [REAPED] returncode=-9 (negative => killed by signal 9)
```

**What survived on disk** — the file is intact and stops exactly where the process did:

```
0 session               id=01a04321-...-dddd parentId=None
1 session_info          id=c5d6930d
2 model_change          id=dccc8832 parentId=c5d6930d
3 thinking_level_change id=2dddc19c parentId=dccc8832
4 message               id=780113ba  role=user      "Run the bash command: sleep 40 ; then reply DONE"
5 message               id=3b7ec4aa  role=assistant [toolCall bash "sleep 40"]
```

**Re-binding after death** (zero model cost — `get_state` + `get_session_stats` + `get_messages`):

```json
"sessionId":"01a04321-...-dddd","sessionName":"audit-death","messageCount":2
"userMessages":1,"assistantMessages":1,"toolCalls":1,"toolResults":0
```

`toolCalls: 1, toolResults: 0` is the durable fingerprint of "died mid-tool" — the Tower can detect an
ungraceful death from the session file alone, without a liveness probe.

**Lineage.** `--fork <id>` creates a successor whose header names the predecessor **by absolute path**:

```json
{"type":"session","version":3,"id":"01a0447d-0d34-7a24-b0dc-27f99517fae0",
 "cwd":".../audit-a/wt",
 "parentSession":".../sessions/2026-08-27T18-29-26-839Z_01a04321-...-dddd.jsonl"}
```

and it copies the predecessor's entries **with their original ids and timestamps** (`c5d6930d`, `780113ba`,
`3b7ec4aa` all reappear), so the successor carries the predecessor's evidence rather than a summary.

`--fork` **combines with `--session-id`**, so the Tower names the successor too:

```json
{"type":"session","version":3,"id":"01a04321-0000-7000-8000-0000000eeee2",
 "cwd":".../audit-a/wt","parentSession":".../..._01a04321-...-dddd.jsonl"}
```

That is decision 40's shape: new root, caller-assigned, explicit lineage to the terminal predecessor, same
worktree. `host_epoch` has no Pi equivalent — the Tower supplies it.

**Three problems, stated plainly.**

1. **There is no producer-emitted stop proof.** Nothing in the session file records termination. The
   available stop proofs are OS-owned, not Pi-owned: `waitpid` returning `-9`, and `/proc/<pid>` disappearing.
   Both are only available to the process that **spawned** Pi. A Tower that spawns its agents has a canonical
   stop proof; a Tower that adopts an existing process does not. Intercom's `session_left` (Q6) is a fourth
   signal but it is broker-owned and fires on socket close, which is *disconnection*, not death.
2. **The default recovery path is resurrection, which decision 40 discards.** Re-launching with the dead
   `--session-id` did **not** create a new file — it reopened and appended to the dead session. Decision 40
   explicitly rejects reusing the prior `root_session_id`. The Tower must therefore treat `--fork` as the
   *only* post-death path and must never re-issue a terminal id.
3. **`SIGKILL` orphans the agent's tool children.** After the kill:

   ```
       PID    PPID    PGID     SID CMD
     17164       1   17164   17164 sleep 40
   ```

   The `bash` tool's child was reparented to PID 1 **in its own process group and its own session** — Pi
   `setsid`s tool subprocesses. Killing Pi therefore does not stop work already running in the worktree.
   For decision 40 this is material: "proven death of the root" is not "the worktree is quiescent." The Tower
   needs its own containment (a cgroup, or spawning Pi as a process-group leader and killing the group) before
   it can claim a checkpoint is safe to fork from.

**Verdict: PARTIAL.** Durability, re-binding and lineage all pass. The stop proof is borrowed from the OS
rather than emitted by the producer, and orphan containment is the Tower's problem, not Pi's.

### Q4 — Producer-owned liveness proof (the deciding question)

**Method.** One orchestrator process played the Tower: it started the broker, spawned Pi itself, cross-checked
the broker's roster against the kernel, killed the agent, and watched what the broker said.

```
  1.002 broker up pid 19798
  1.016 <- {"type":"registered","sessionId":"tower-watcher",
            "features":["extension-bus-v1","exact-send-v1"]}
  2.019 TOWER-SPAWNED pi pid = 19822 | kernel cwd = .../scratchpad/audit-a/wt
  2.837 <- {"type":"session_joined","session":{
              "id":"01a04321-0000-7000-8000-0000000f0003",
              "endpointEpoch":"f1041d20-c7f1-4fe0-8fef-d66ffca20d8d",
              "name":"worktree-agent-3","cwd":".../audit-a/wt","model":"gpt-5.4-mini",...}}
 18.367 BROKER-REPORTED pid for 01a04321-...-f0003 = 19822 | MATCHES TOWER-SPAWNED? True
 18.368 !! SIGKILL 19822
 18.383 waitpid returncode = -9 (SIGKILL proof)
 18.383 /proc gone: True
 18.385 <- {"type":"session_left","sessionId":"01a04321-0000-7000-8000-0000000f0003"}
```

And the message-level attestation, from a **separate** non-Pi Python process:

```
  5.011 -> {"type":"send","to":"01a04321-...-f0001",
            "message":{"id":"tower-msg-0001","content":{"text":"PING from a non-pi supervisor process."}}}
  5.018 <- {"type":"delivered","messageId":"tower-msg-0001","delivery":"socket_delivered",
            "retryable":false,"outcomeKnown":true}
  5.021 <- {"type":"message_receipt","from":{"id":"01a04321-...-f0001",
            "endpointEpoch":"f89166ab-...","cwd":".../audit-a/wt","pid":19124,"status":"idle",
            "trustedLocal":true},
            "receipt":{"messageId":"tower-msg-0001","status":"receiver_received","timestamp":...}}
  5.023 <- ... "status":"acknowledged","detail":"accepted by receiver"
  5.023 <- ... "status":"injected"
  5.029 <- {"type":"presence_update","session":{...,"status":"thinking","contextTokens":0,...}}
  6.865 <- {"type":"presence_update","session":{...,"status":"idle","contextPct":1,"contextTokens":1974,...}}
```

The receipts are emitted by the **receiving agent's own extension process**, at
`pi-intercom/index.ts:1202/1235/1239/1246/1259` (`emitMessageReceipt(... "injected" | "acknowledged" |
"receiver_received")`), not by the broker and not by the caller.

**What this proves — precisely.**

- **It is producer-owned.** The `injected` receipt is written by the agent process at the moment the message
  enters its turn. The supervisor cannot author it.
- **It is nonce-bound and therefore falsifiable.** The receipt echoes `messageId`, a value the supervisor
  chose. A replayed or stale receipt fails the match. This is the property decision 76 says pane creation +
  helper auth + process liveness cannot be composed into: those three are all *observations*, whereas a
  receipt is a *response to a challenge*.
- **It is bound to session and epoch.** Every receipt carries `from.id` (the Tower-assigned session id) and
  `from.endpointEpoch`, a broker-minted UUID regenerated on every registration (`broker.ts:466`). A receipt
  from a previous incarnation carries a stale epoch and can be rejected — which is exactly the Tower's
  `host_epoch` fencing, available for free.
- **Progress is corroborated independently.** `contextTokens` moved 0 → 1974 and `status` moved
  `idle → thinking → idle`, so the message demonstrably reached the model, not merely a queue.

**What it does NOT prove — the gap, stated without softening.**

The broker **does not verify** `cwd`, `pid`, or `tmuxPane`. `handleMessage`'s `register` branch
(`broker.ts:418-478`) copies them verbatim from the client's own `SessionRegistration`. I proved this by
registering my Python supervisor with a fabricated worktree and having the broker publish it to everyone:

```json
{"id":"tower-supervisor-0001","name":"TOWER-SUPERVISOR","cwd":"/invented/path/not/real",
 "model":"none","pid":19261,"trustedLocal":true}
```

Note `trustedLocal: true` on a session that invented its entire identity. That flag is **not** a peer-credential
check — `broker.ts:476` sets it from `typeof LISTEN_TARGET === "string" && process.platform !== "win32"`, i.e.
it means only "this broker is listening on a Unix socket rather than TCP." There is no `SO_PEERCRED` anywhere
in the broker. Reading `trustedLocal` as an identity assertion would be a serious misreading.

So the receipt on its own proves: *a process holding a socket to this broker, registered under session id X,
consumed message M and ran a model turn.* It does **not**, by itself, prove that process is bound to the
intended worktree.

**Why the Tower can close that gap anyway.** Because the Tower spawns the agent, it holds two kernel-owned
facts the registering process cannot forge: the PID returned by `fork`/`exec`, and `/proc/<pid>/cwd`. I
measured both, and the cross-check succeeded (`BROKER-REPORTED pid … MATCHES TOWER-SPAWNED? True`). The
composition that yields a sound attach proof is therefore:

1. Tower spawns Pi with a Tower-chosen `--session-id` and a Tower-chosen cwd → owns PID.
2. Tower reads `/proc/<pid>/cwd` → kernel-verified worktree binding.
3. Tower sends an Intercom message with a fresh nonce to that session id.
4. Tower requires an `injected` receipt whose `from.pid` equals the spawned PID **and** whose
   `from.endpointEpoch` equals the epoch seen at `session_joined`.

Steps 1–2 are unforgeable; steps 3–4 are producer-emitted and challenge-bound. Only step 4's `pid` field is
self-declared, and it is checked against step 1. This is materially different from the OpenCode/Herdr case,
where decision 76's objection stands precisely because no producer-emitted, challenge-bound artifact exists at
all.

**Residual risk to record:** the socket is protected only by filesystem permissions — the runtime dir is `0700`
and the socket `0600` (`srw------- broker.sock`, verified). Any process running as the same UID can register
under any session id and impersonate an agent. Same-UID isolation is not available here; the Tower must treat
UID compromise as out of model. Pi's broker *could* close this with `SO_PEERCRED` and does not — worth an
upstream issue.

**Verdict: PASS, conditioned on the Tower spawning the agent.** If the Tower ever adopts a Pi process it did
not spawn, this collapses back to a self-declaration and decision 76's objection reapplies.

### Q5 — Capability fencing

**Method.** A falsifiable pair: identical prompt, identical model, fence on vs fence off.

*Fenced* — `--exclude-tools write,edit,bash`:

```
{"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":"CANNOT"}],
 "usage":{"input":656,"output":6,...,"cost":{...,"total":0.000519}},"stopReason":"stop"}}
```
No `tool_execution_*` event. `FENCE.txt` absent.

*Unfenced control* — same prompt, same model, exclusion removed:

```
{"type":"tool_execution_start","toolCallId":"call_TtuTxWe...","toolName":"write"}
{"type":"tool_execution_end","toolCallId":"call_TtuTxWe...","toolName":"write"}
$ eza -la $A/wt   →  FENCE.txt   $ bat FENCE.txt  →  BREACH
```

So the fence is not the model declining; the same model wrote the file the moment the fence was lifted.

**Enforcement is in the runtime, and it is persistent.** In
`dist/core/agent-session.js:2035`:

```js
const isAllowedTool = (name) =>
  (!allowedToolNames || allowedToolNames.has(name)) && !excludedToolNames?.has(name);
```

applied at four sites — extension-registered tools (`:2043`), built-ins (`:2045`), definitions (`:2075`), and
critically **every recomputation of the active tool set** (`:2085`), so an extension calling `setActiveTools`
cannot re-admit a fenced tool. `dist/core/sdk.js:141-144` also strips excluded names from the *initial* set,
including from the settings-file default. The fence is a standing predicate, not an opening posture.

**Two caveats.**
- The fence names **tools, not capabilities**. Excluding `write` while leaving `bash` enabled fences nothing —
  `bash` writes files. My test excluded `write,edit,bash` together; a Tower policy must reason about the
  capability closure, not the tool list.
- `--tools` (allowlist) is strictly stronger than `--exclude-tools` (denylist), since it also fences tools the
  Tower has never heard of, including any future extension tool. Prefer the allowlist.

**Instruction-injection surfaces.** `--append-system-prompt` (repeatable; accepts literal text *or* a file
path), `--skill <path>`, `--extension <path>`, `--prompt-template <path>`, plus the negations
`--no-skills`, `--no-extensions`, `--no-prompt-templates`, `--no-context-files` (suppresses `AGENTS.md` /
`CLAUDE.md` discovery). Together these let the Tower hand an agent a sealed brief and simultaneously *deny*
ambient project instructions — a genuinely useful primitive for a zero-decision contract.

**One decision-66 hazard:** `--append-system-prompt` and `--session-id` travel in **argv**, and argv is
readable by any same-UID process via `/proc/<pid>/cmdline` (I read a Pi process's cmdline this way during the
audit). Anything the Tower must keep out of argv per decision 66 has to arrive by file path or environment,
never as literal text on the command line. Pi supports the file form — use it.

**Verdict: PASS.**

### Q6 — Pi Intercom

**What it is.** A **third-party Pi extension**, not a built-in and not a Gentle AI addition:
`pi-intercom@0.12.0`, MIT, installed as a user package.

```
$ pi list
User packages:
  npm:gentle-pi          /home/emili/.pi/agent/npm/node_modules/gentle-pi
  npm:gentle-engram      …
  npm:pi-intercom        /home/emili/.pi/agent/npm/node_modules/pi-intercom
  …
```

Source (TypeScript, shipped unbundled and readable) at
`/home/emili/.pi/agent/npm/node_modules/pi-intercom/`: `index.ts` (119K), `broker/broker.ts` (65K),
`broker/client.ts`, `broker/protocol.ts`, `broker/paths.ts`, `broker/framing.ts`, `broker/spawn.ts`,
`types.ts`, `config.ts`, `project-agent.ts`, `reply-tracker.ts`, `ui/`, `skills/pi-intercom/SKILL.md`.
Runtime state at `~/.pi/agent/intercom/` (`0700`): `broker.sock`, `broker.pid`, `config.json`,
`extension-state/`, `pending-asks/`.

**Architecture.** A single per-agent-dir broker process. Transport is a Unix domain socket at
`$PI_CODING_AGENT_DIR/intercom/broker.sock` (Windows: named pipe, or opt-in loopback TCP guarded by a
`stateId` in `broker.port.json`). Framing is 4-byte big-endian length + JSON (`broker/framing.ts`), 1 MiB max
frame. Protocol name `pi-intercom`, version 1. The broker is spawned lazily by whichever agent connects first
and **idle-shuts-down when the last session disconnects** (observed repeatedly). Per-connection token-bucket
rate limiting; unregistered connections are destroyed after `REGISTRATION_TIMEOUT_MS = 1000`.

**Addressing.** By session id, or by display name, with `targetId`/`targetEpoch` available for exact-send.
The session id is the Pi session id unless overridden by `PI_INTERCOM_STABLE_SESSION_ID` or `config.stableId`
(`index.ts:524-526`) — so **the Tower can assign the address**, and can keep it stable across restarts.
`PI_INTERCOM_SCOPE_ID` additionally partitions the roster, which maps cleanly onto per-Plan or per-worktree
fencing.

**Is it scriptable from outside an agent turn? Yes — decisively.** There is no `intercom` CLI subcommand and
no bin; from inside Pi it is only the `intercom({action:…})` tool. But the broker is a plain socket server, so
a supervisor speaks it directly. A ~30-line Python script with no Pi dependency:

```
  0.000 -> {"type":"health","requestId":"h1"}
  0.002 <- {"type":"health_ok","requestId":"h1","protocol":"pi-intercom","version":1}
```
```
  0.000 -> {"type":"register","sessionId":"tower-supervisor-0001","session":{...}}
  0.002 <- {"type":"registered","sessionId":"tower-supervisor-0001",
            "features":["extension-bus-v1","exact-send-v1"]}
  2.005 -> {"type":"list","requestId":"l1"}
  2.006 <- {"type":"sessions","requestId":"l1","sessions":[
             {"id":"01a04321-...-f0001","endpointEpoch":"f89166ab-...","name":"worktree-agent-1",
              "cwd":".../audit-a/wt","model":"gpt-5.4-mini","pid":19124,"status":"idle",
              "trustedLocal":true},
             {"id":"tower-supervisor-0001","cwd":"/invented/path/not/real",...}]}
```

**Delivery into a live session.** Confirmed end-to-end in Q4: `send` → broker `delivered` → agent-emitted
`receiver_received` / `acknowledged` / `injected` → `presence_update status:thinking` → model turn. Delivery
mode is configurable via `~/.pi/agent/intercom/config.json`: `inboundTrigger: "always" | "replies" | "never"`
decides whether an inbound message **starts a turn** or is merely steered into the queue. That is precisely
the Tower's "directive vs interrupt" distinction, already provided by the host — decision 59 says do not
rebuild it.

**Other surfaces the Tower could use rather than build.** The client/broker protocol also carries
`cancel_message`, `cancel_ask`, message `supersede`, an `extension_publish` / `extension_state_commit` bus
with an **owner election** (`extension_owner`, `ownerEpoch`) and optimistic-concurrency state commits
(`expectedRevision`), plus presence carrying live `contextPct` / `contextTokens` / `contextWindow` and the
originating `tmuxPane`. An owner-elected, revision-checked shared state channel is a large chunk of
coordination machinery the Tower would otherwise write itself.

**Verdict: PASS.**

---

## Decision 76 assessment

**Does Pi solve the producer-owned attach proof that blocks the OpenCode route? — Yes, provided the Tower
spawns the agent.**

Decision 76's objection is specific and correct about OpenCode: *creating a pane, authenticating a helper, and
observing process liveness cannot be composed into a positive attach proof.* All three are passive
observations made by the caller about the world. None of them is a statement the producer makes in response to
a challenge the caller controls, so none can be falsified by the producer's silence, and any composition of
them remains a caller assertion wearing three hats.

Pi supplies the missing artifact. The measured `injected` receipt is:

- **Authored by the producer.** Emitted at `pi-intercom/index.ts:1202` by the receiving agent's own extension
  at the instant the message enters its turn. The supervisor has no code path that can write it.
- **Challenge-bound.** It echoes a `messageId` the supervisor chose. Silence, a wrong id, or a stale id is a
  failure. That makes it falsifiable in the strict sense, unlike liveness observation, which has no failure
  mode short of the process vanishing.
- **Bound to the four things decision 66 requires.** `from.id` = the Tower-assigned session; `from.cwd` = the
  worktree; `from.pid` = the process; `from.endpointEpoch` = a broker-minted incarnation token that
  invalidates receipts from a previous epoch. (`tmuxPane` is carried too when the agent runs in tmux, so the
  pane binding is available without the pane being load-bearing.)
- **Corroborated by an independent channel.** `presence_update` showed `contextTokens` 0 → 1974, so the
  message reached the model, not just a mailbox.

**The honest weakness, and why it does not defeat the claim.** The broker copies `cwd` and `pid` from the
client's own registration without verification — I proved this by registering a supervisor whose declared cwd
was `/invented/path/not/real`, and the broker published it with `trustedLocal: true`. Taken alone, therefore,
a receipt proves *a process registered under session X answered my challenge*, not *the process in worktree W
answered*. What repairs it is not argument but a second, unforgeable source: the Tower spawned the process, so
it holds the PID from `exec` and the worktree from `/proc/<pid>/cwd`, neither of which the agent can influence.
The cross-check succeeded in measurement (`BROKER-REPORTED pid … MATCHES TOWER-SPAWNED? True`).

Note carefully what changed relative to the OpenCode case. This is **not** "pane + auth + liveness, composed."
`/proc/<pid>/cwd` is not an observation of liveness; it is a kernel-owned binding fact about a process the
Tower itself created. And the receipt is not an observation at all; it is a response. The composition is
`{unforgeable kernel fact} + {producer response to caller nonce}`, which is a different and sound shape.

**Scope limit, to be enforced rather than assumed.** The proof holds **only** for agents the Tower spawned.
For an adopted process the PID and cwd revert to self-declaration and decision 76's objection reapplies in
full. If the Tower ever wants to adopt, the correct fix is upstream: have the broker read `SO_PEERCRED` on the
Unix socket and stamp the kernel-supplied PID onto `SessionInfo` instead of trusting the client's. The broker
does not do this today (no `SO_PEERCRED` anywhere in `broker.ts`), and it is a small patch.

**Recommendation.** `ATTACHED` may be declared for Pi under a rule with four falsifiable conjuncts — Tower
owns the PID; `/proc/<pid>/cwd` equals the assigned worktree; an `injected` receipt returned for a fresh
Tower-generated nonce; and that receipt's `endpointEpoch` matches the epoch observed at `session_joined`. Any
one missing → `DEGRADED`. This is a genuinely new capability relative to the OpenCode/Herdr evidence base, so
it is the kind of discovery decisions 76 and 68 reserve for `S4.8`/`S4.9`; it should be adopted through that
gate with the measurement re-run, not adopted on the strength of this report alone.

---

## What I could not measure

- **Multi-worktree isolation (decision 38) at the backend level.** Pi has no server/port/auth-secret topology
  to isolate — there is no backend, only a process — so decision 38 does not translate directly. What I did
  *not* test is whether N concurrent Pi processes in N worktrees interfere. The known shared resource is the
  **single Intercom broker per `PI_CODING_AGENT_DIR`**, which is a shared namespace across all worktrees by
  default. `PI_INTERCOM_SCOPE_ID` and a per-worktree `PI_CODING_AGENT_DIR` are the two candidate fences;
  **neither was tested.** This is the single most important untested item for decision 38 and should be
  measured before any migration commitment.
- **Concurrency and throughput.** Every measurement used one or two sessions. Broker limits exist in source
  (`MAX_SESSIONS`, `MAX_UNREGISTERED_CONNECTIONS = 32`, a token-bucket rate limiter) but I did not exercise
  them, so I cannot state how many agents a Tower can run.
- **Broker crash and recovery.** I never killed the broker while agents were connected. `client.ts` has a
  30-second liveness heartbeat and a reconnect path, and `runtime-claim.ts` refuses to replace a live broker,
  but I did not verify that agents actually re-register after a broker restart or that in-flight messages are
  preserved. `mailboxMessages` in the broker suggests queueing for disconnected sessions; untested.
- **Whether Pi auto-spawns its own broker.** In my isolated agent dir, the Pi session created
  `intercom/extension-state/` and `pending-asks/` but never brought up a broker; `npx --no-install tsx` failed
  from that cwd. I started the broker manually. So the *automatic* spawn path
  (`config.brokerCommand: "npx"`, `brokerArgs: ["--no-install","tsx"]`) is **unverified in an isolated
  environment**, and it is environment-sensitive. A Tower should spawn the broker explicitly rather than rely
  on lazy spawn.
- **`--no-tools` and `--tools` allowlist.** I measured `--exclude-tools` empirically and read the shared
  enforcement predicate that governs all three. `--tools` and `--no-tools` were **not** run.
- **Compaction, auto-retry, and their events.** `compaction_*`, `auto_retry_*`, and
  `summarization_retry_*` are documented but never fired in my runs; a supervisor's state machine must handle
  them and I have no sample output.
- **Model-behaviour questions.** Whether a long unattended Pi run stays on task, respects a sealed brief, or
  degrades — out of scope for a capability audit and not measured.
- **Interactive/TUI mode and Herdr-style pane attachment.** Everything here was headless. `tmuxPane`
  propagation is read from `$TMUX_PANE` at registration (`index.ts:531-534`) but was **not** exercised.
- **Windows/TCP transport.** The `stateId`-guarded loopback TCP path exists in source and was not tested
  (WSL2 Linux only).

---

## Risks and surprises

1. **The Unix socket path has a hard 108-byte limit, and Pi fails misleadingly when it is exceeded.** My first
   broker attempts died with `EADDRINUSE` on a path where **no socket existed**. The real cause: the socket
   path is `$PI_CODING_AGENT_DIR/intercom/broker.sock`, and mine was 141 bytes vs the kernel's ~107-byte
   `sun_path`. Shortening the agent dir to `/tmp/pia` (29-byte socket path) fixed it instantly. **If the Tower
   gives each worktree its own `PI_CODING_AGENT_DIR` under a deep worktree path, Intercom will silently fail
   to start and blame a phantom port conflict.** Budget the path length, or keep agent dirs under a short
   fixed root.
2. **`SIGKILL` orphans tool subprocesses.** `sleep 40` survived, reparented to PID 1 with its own PGID and SID.
   Killing the agent does not stop work in the worktree. The Tower needs process-group or cgroup containment
   before it can treat a kill as a clean checkpoint boundary.
3. **`trustedLocal: true` is a transport label, not an identity claim.** It only means "Unix socket, not TCP"
   (`broker.ts:476`). Any same-UID process can register with any invented `cwd`/`pid` and be published with
   that flag set. Reading it as authentication would be a serious error.
4. **The broker is a shared namespace by default.** One broker per `PI_CODING_AGENT_DIR` means every worktree's
   agent sees and can message every other, and can read their `cwd`, `pid`, `model`, and live context usage.
   That is the opposite of decision 38's isolation posture and must be deliberately fenced.
5. **The broker idle-shuts-down.** With zero registered sessions it exits and unlinks its socket and pid file.
   A supervisor that expects a long-lived broker must hold a registration open — mine did, which is why the
   Q4 orchestration worked and earlier attempts raced.
6. **Session resume is resurrection by default, silently.** Re-launching a dead `--session-id` appends to the
   dead session with only a stderr warning when the id is *new* — and no signal at all when it already exists.
   Decision 40 forbids this. The Tower must never re-issue a terminal id, and cannot rely on Pi to stop it.
7. **`agent_end` is not the end.** A supervisor gating on `agent_end` will act while a retry or a queued
   follow-up is still pending. `agent_settled` is the correct gate.
8. **Argv is world-readable to the same UID.** `--session-id`, `--name`, and inline `--append-system-prompt`
   text land in `/proc/<pid>/cmdline`. Per decision 66, briefs and anything credential-adjacent must arrive as
   a file path, not literal argv text.
9. **`pi-intercom` is a third-party MIT package on npm, not part of Pi.** The Tower's most important
   capability would depend on an external extension with its own release cadence, versioned independently of
   `pi` itself. Decision 68's "move versions only behind real evidence and rollback" applies with full force,
   and `pi-intercom` needs a pin.
10. **Intercom source ships as TypeScript executed through `tsx`.** The broker runs via
    `node …/tsx/dist/cli.mjs …/broker.ts`, so `tsx` resolution is a live startup dependency, and the observed
    failure mode (`npx --no-install tsx` → `npm ERR! canceled`) is cwd-sensitive.
11. **The model in `settings.json` is a global default (`gpt-5.6-sol`, thinking `high`).** A Tower that does not
    pass `--provider`/`--model`/`--thinking` explicitly per launch inherits whatever the maintainer last set —
    a silent cost and behaviour coupling. Always pass them.
