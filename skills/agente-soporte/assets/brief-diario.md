# Daily brief — template and derivation rules

The daily brief answers one question: **what do I do today, and what is stopping the
rest.** It is a derived view over the plans, never a written summary.

## The distinction that makes it useful

| | Summary | Derivation |
|---|---|---|
| What it is | the agent's reading | arithmetic over declared fields |
| How it is verified | by re-reading everything | by opening one cited `file:line` |
| When it is wrong | nobody notices | the numbers stop adding up |

A summary asks for trust. A derivation hands over a receipt. Every line carries its
source so the maintainer can spot-check one item instead of auditing the whole plan set.

**Never soften a number to make the day look better.** The brief exists to surface what
is stuck; a brief that flatters is worse than no brief.

## Sources, in order

1. Canonical index (`master-index.md`) — plans, states, `%`, what is missing
2. Each active plan's `STATUS.md` — Sesión `Estado`, `Depende de`, `Área`, `Recurso`
3. Active reservations board, if the project has one
4. Current work distribution / cycle assignment, if the project has one
5. Git and forge authority — base commit, open PRs, CI health

Read prose notes in the index too. **The most decision-relevant fact of the day is often
a loose line that no plan owns** — an exhausted CI quota, a frozen dependency, an expired
credential. Cross it against the ready Sesiones; that intersection is the brief's value.

## Template

```markdown
# BRIEF — <project> · <weekday> <YYYY-MM-DD>

**Base:** `<remote/branch>` `<sha>` · **Reservas activas:** <n | ninguna> → `<file:line>`

## 🚨 <Blocking condition of the day, only if one exists>

> "<verbatim quote>" → `<file:line>`

<One sentence on what it means for today.>

## 🟢 Capacidad

| | Cuántos | Cuáles |
|---|---|---|
| **Por grafo** (dependencias + área + recurso) | N | `<IDs>` |
| **Entregables hoy** | N | `<IDs, or why zero>` |
| **Lanzables hoy** | N | `<IDs>` |

## ⚠️ <N> decisiones tuyas están frenando <M> de <P> Sesiones pendientes

| Decisión | Dónde | Desbloquea |
|---|---|---|
| <decision> | `<file:line>` | **N Sesiones** de <Plan> |

## 🔴 Frenado por otros

| Qué | Por qué |
|---|---|
| `<ID>` | <external blocker> |

## ✅ Qué haría hoy, en orden

1. <action, cheapest unblock first>
2. <action>

## Cómo verificar este brief en 30 segundos

- Sesiones enumeradas: `<a+b+c…> = <total>` ✓ contra `<file:line>`
- Cerradas: `<a+b+c…> = <total>` ✓
- Pendientes: `<total − closed>` · bloqueadas por vos: `<n>` · sin dueño: `<n>`

Si algún número no cierra, el brief está mal.
```

## Derivation rules

1. **Capacity is three numbers, not one.** By graph, deliverable today, launchable today.
   They differ whenever an external condition — dead CI, a frozen environment, a held
   token — blocks delivery without blocking work. Collapsing them hides the day's real
   constraint.
2. **Separate blockers by owner.** "Waiting on the maintainer" and "waiting on someone
   else" drive opposite actions. Sessions blocked by a maintainer decision are the only
   ones they can unblock before lunch.
3. **Price every pending decision in Sesiones.** Not "this is blocked" but "this blocks
   10 Sesiones". A decision with a number attached gets made; one without it waits.
4. **Unassigned Sesiones count as blocked.** A Sesión with no owner is not ready work, it
   is a pending assignment. Report it beside the decisions.
5. **Order the recommendation by unblock cost.** Cheapest decision that frees the most
   Sesiones goes first.
6. **Close with the arithmetic.** Show the sums so they can be re-added. If the totals do
   not match the index, say so and stop — a disagreement between sources is the finding,
   not something to average away.
7. **Never invent a state.** Only the seven canonical states appear. An undeclared
   `Área` or `Recurso` is reported as missing, not guessed.

## What the brief never does

It does not assign, dispatch, reserve, or change any state. It is read-only, like every
output of this skill. The maintainer decides; the brief only makes the decision cheap.
