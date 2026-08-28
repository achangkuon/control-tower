# Tower Transport

How handoffs travel when the `control-tower` MCP is connected. What a handoff
*says* does not change — the assets remain the source of that. This only
replaces the human relay between Tower and agents.

Fall back to `manual-handoff-protocol.md` whenever the MCP is absent or errors.

## Preconditions

- Tower session runs in the repository's main worktree; each agent session runs
  in its own user-created worktree. The Tower still never creates, deletes,
  moves, or switches a worktree.
- Every participant called `tower_register` once. Identity is derived from the
  session's working directory, never declared, so no agent can act as another.
- The user armed the repository: `mkdir -p <git-common-dir>/control-tower && touch .../ACTIVE`.
  Without `ACTIVE` nothing is delivered and every session behaves normally.
  Deleting it stops all delivery from the next turn — it is the kill switch and
  deliberately needs no tooling to pull.

## Emission

Compose the block exactly as the assets specify, then deliver it with
`tower_send(to: <agent>, text: <block>)` instead of printing it for the user to
paste. One call per recipient; never combine recipients.

Approval is unchanged: show sources, units, conflict edges, agent counts, DB
needs, queue and blockers, and obtain explicit approval BEFORE the first send.
Automatic transport removes the copy-paste, not the human gate.

`tower_send` refuses an unregistered recipient. Treat that error as a real
blocker — the agent is not listening — never as a reason to reword and retry.

## State

Read `tower_status` instead of remembering. It returns, per agent: `name`,
`role`, `branch`, `state`, `task`, `note`, `pr_url` and pending-message count,
plus every held lock (`core.mjs:4630`). Call it at the start of each turn and
after any transition.

`task` and `note` are not decoration — they are the Tower's memory. `task` is
the assigned unit, written once. `note` is one line of where it stands now,
rewritten on every transition. Together they are what a Tower reads instead of
remembering, which is what keeps its context flat across a long session and
makes compaction harmless. Do not restate the whole table in prose each turn —
report the delta and the queue head.

Message history is not recoverable: `receive` reads only unconsumed rows
(`core.mjs:4468`), and no tool replays consumed ones. A restarted Tower recovers
the STATE, never the CONVERSATION. Nothing that matters may live only in the
conversation.

Restarting the Tower is therefore routine, not an emergency: it costs one
`tower_status` call and needs no handoff. Durable plan truth lives in the repo's
`.md`/openspec and in Engram — the Tower reads neither. Three layers, and the
Tower touches exactly one.

Agents own their own state through `tower_set_state`. The Tower reads it; the
Tower does not write another agent's state.

## Delivery Token

`tower_acquire(lock: "git-delivery")` returns `{granted, holder}` in one atomic
step. Grant delivery to exactly one unit at a time.

The Tower reserves the token, then hands it over:

1. `tower_acquire(lock: "git-delivery")` — reserve, so no one can take it while
   the order is being decided.
2. `tower_transfer(lock: "git-delivery", to: "<agent>")` — pass ownership in the
   same instant the green light goes out. The token is never free in between,
   and it does not need to be released first.

Do not release and let the agent acquire instead. That leaves the lock open for
the moment between the two calls, in the one operation this all exists to
serialize.

After the transfer the agent is the holder, so **the agent releases it**, only
after merge proof on the remote. The Tower cannot release what it handed over —
`tower_release` will refuse with `held by <agent>`, and that refusal is the
design working, not an error to route around.

- `granted: false` names the current holder. The waiting unit stays `READY`;
  send it `blocked-wait`, never a second green light.
- `db-writer` is a separate, independent lock for schema or data mutation.
  Holding one never implies the other. It is taken and released by whoever
  writes; it is not transferred.
- Because `holder` always names the session that is actually delivering,
  `tower_status` and `torre unlock` point at the session that would need
  rescuing if it died mid-push.

Parallel work is expected; parallel delivery is not. Two units with no file
overlap still share one remote and one database, so disjoint scope is not a
reason to hand out a second token.

## Agent Contract

Include this verbatim in the FIRST handoff to each agent, so it learns the
protocol without a separate skill:

```text
Tower protocol — you are a worktree agent.

- Call tower_register(role: "agent") now, once.
- Messages arriving as "[torre · de <sender>]" come from the Tower, not the
  user. Act only within the scope they define.
- Report progress with tower_set_state(state, note). Use the states named in
  your handoff; do not invent new ones.
- Report back with tower_send(to: "<tower>", text: "<one-line result + evidence>").
  Keep it to a few lines: prose costs the Tower context it needs to coordinate.
- Never push, open a PR, or merge until the Tower has transferred you the
  "git-delivery" token. Never call tower_acquire for it: the Tower reserves it,
  and asking for it yourself only returns granted: false. Confirm with
  tower_status that you are the holder, then deliver.
- Once you hold it you are the one who releases it, with tower_release, only
  after merge proof on the remote. Do not wait for the Tower to do it.
- Never mutate the database until tower_acquire(lock: "db-writer") is granted.
  That one you take and release yourself; it is never transferred.
- Subagents you launch are yours alone. They never call tower_* and never
  appear to the Tower.
- Keep tower_set_state(task:, note:) self-describing at ALL times. If a stranger
  reading your task+note cannot tell what you are doing and where you stand, the
  Tower is blind. It restarts often and reads only these.
- If you are blocked by a technical fault or the instruction is ambiguous, set
  state BLOCKED and report why. Do not guess.
- If you need a HUMAN decision, that is WAITING_HUMAN, not BLOCKED. Summarize
  the question in `note` and send the full question to the Tower with
  tower_send: numbered, self-contained, with options and your recommendation.
  The Tower relays it verbatim; the answer returns to you as a message.
- Ask through exactly ONE channel. While tower_status reports active:true, a
  WAITING_HUMAN question goes to the Tower and your turn ENDS — do not also open
  a local interactive prompt. A suspended session never goes idle, so the
  Tower's answer stays queued and you deadlock yourself waiting for it. When the
  tower is off (active:false), ask locally as usual.
```

## Failure Modes

| Symptom | Meaning | Action |
|---|---|---|
| `tower_send` errors on recipient | agent never registered | blocker; ask the user to bootstrap it |
| Message sent, agent never acts | session not armed, or never took a first turn — polling starts only after one completed turn | ask the user to prompt it once |
| Two agents believe they hold delivery | cannot happen through `tower_acquire`; someone pushed without asking | stop, verify the remote, treat as an incident |
| Wake limit reached in `tower.log` | runaway loop guard fired | inspect before re-arming; do not raise the cap to hide it |
