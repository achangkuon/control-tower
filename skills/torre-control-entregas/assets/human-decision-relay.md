# Human Decision Relay

How a `WAITING_HUMAN` question reaches the maintainer and how the answer gets
back. The Tower is a wire here, not a participant: it carries text it did not
write and must not improve.

## The block an agent sends

The agent composes this and delivers it with `tower_send` to the Tower. It must
stand on its own — the Tower cannot open the repository to fill a gap.

```text
DECISIÓN REQUERIDA: <UNIT_ID>

Contexto: <TWO_LINES_SELF_CONTAINED>
Pregunta: <EXACTLY_ONE>
  a) <OPTION> — <CONSEQUENCE>
  b) <OPTION> — <CONSEQUENCE>
Recomiendo: <a|b> porque <ONE_LINE>
Mientras tanto: <WHAT_STAYS_FROZEN>
```

The agent also sets `tower_set_state(state: "WAITING_HUMAN", note: <the question
in one line>)` so a restarted Tower sees the pending decision without the
message. Then its turn ends. It does not open a local interactive prompt while
`tower_status` reports `active: true` — a suspended session never goes idle, so
the answer would stay queued undelivered.

## What the Tower does

Relay it verbatim. Do not rewrite, summarize, expand, merge two questions, add
an option, or state a preference. Present the recipient and the block; the
maintainer answers.

One question per block. Several agents may be `WAITING_HUMAN` at once — relay
each separately, in arrival order, never combined into one prompt.

Send the answer back with `tower_send` to that agent, verbatim, naming the
chosen option:

```text
DECISIÓN: <UNIT_ID> — <CHOSEN_OPTION_VERBATIM>
<ANY_MAINTAINER_WORDS_UNCHANGED>
```

## When a block arrives malformed

An ambiguous or incomplete question goes **back to the agent** to be reformed —
never to the repository to be researched. Researching it is how the Tower ends
up holding project context it has no business holding.

```text
REFORMULAR: <UNIT_ID>

Missing: <WHICH_FIELD_IS_ABSENT_OR_UNCLEAR>
Resend the decision block self-contained. The Tower does not read the repo.
```

## Failure modes

| Symptom | Meaning | Action |
|---|---|---|
| Answer sent, agent never acts | agent is suspended on its own local prompt | have the maintainer dismiss it; the queued answer is not lost and lands when the turn ends |
| Agent reports `BLOCKED` for a decision | states conflated | ask it to move to `WAITING_HUMAN` with a proper block |
| Question needs repo context to understand | agent under-wrote the block | `REFORMULAR`; never fill it in from the repository |
