# Planning evidence brief

This brief derives what the responsible parent may consider next. It does not assign work,
create a queue, reserve resources, or mutate state.

## Sources

1. `radar status` for states, queues, and capacity, and `radar sesion <ID>` for each candidate's contract. Never read the whole plan or its generated view.
2. `radar check` and `radar zonas`.
3. Repository instructions, Git state, and delivery policy.

## Admission bundle

For manual implementation start, continue, or resume, the read-only helper returns a fresh bundle
bound to current `HEAD`, requested `Session ID`, and SHA-256 digests of both commands' exact bytes:
requested state/blocker, Zone-ordered `LISTO` choices, compatible `seats`, queue rows and length,
and `LISTO` choice count. `start` requires `LISTO`; `continue`/`resume` also accept `EN CURSO` only
with a first pending Módulo. Other states return only state, blocker, and choices; never a skill or
decision closure. Seats, queue, and choices are distinct facts, never assigned agents.

## Template

```markdown
# PLANNING EVIDENCE — <project>

**Base:** `<branch>@<sha>` · **Sources:** <paths/commands>

## Candidates and static capacity

| Sesión/objective | Scope | Dependencies | Required checks | Risk |
|---|---|---|---|---|
| <ID> | <paths/result> | <IDs/evidence> | <commands> | <risk> |

## Conflicts and shared paths

<exact crossings; a forecast is not a live lock>

## Human choices

<scope/risk/authority question, options, consequences, and checkpoint>

## Proposed parent record

<exact delta, old value, new value, authority, or “none”>
```

## Derivation rules

- Separate a dependency, a human decision, a conflict, and missing evidence.
- Never fabricate work to meet a capacity target.
- Preserve Git contamination as evidence; do not normalize or discard it.
- If sources contradict, report the contradiction and stop instead of averaging it away.
