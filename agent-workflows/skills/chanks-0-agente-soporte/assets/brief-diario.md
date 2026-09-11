# Planning evidence brief

This brief derives what the responsible parent may consider next. It does not assign work,
create a queue, reserve resources, or mutate state.

## Sources

1. `openspec/plan.yaml` and generated `openspec/ROADMAP.md`.
2. `radar check`, `radar status`, and `radar zonas` when available.
3. Repository instructions, Git state, and delivery policy.

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
