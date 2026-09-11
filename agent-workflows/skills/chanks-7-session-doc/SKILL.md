---
name: chanks-7-session-doc
description: "Trigger: final session closure, close session, document session. Gather post-delivery evidence for the responsible parent."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "5.0"
---

## Activation Contract

Activate after verification, review, and delivery. Gather closure evidence; the responsible
parent records any confirmed plan evidence and regenerates the view under repository policy.

## Hard Rules

- This work reads the plan through `../chanks-0-agente-soporte/SKILL.md`. A repository with no `openspec/plan.yaml` has not adopted plan management: say what this step needed it for, offer to start one, and stop. Never improvise a substitute record.
- `archive` occurs after delivery and before a complete closure is declared.
- Closure requires verified binary criteria and integrated `entrega.commit` evidence.
- The commit must resolve and be an ancestor of the integrated `HEAD`.
- `entrega.pr` is optional and recorded only when it exists.
- Do not write plan data or `ROADMAP`; return closure evidence and a proposed delta.
- Optional projections never replace plan, Git, or `radar` evidence.
- Preserve a documentation configuration failure as evidence; delivery already completed is not reversed.

## Decision Gates

| Condition | Action |
|---|---|
| Verification or criterion fails | Do not close; return exact evidence. |
| Commit is not integrated | Do not close; preserve the pending delta. |
| Parent record or `radar` check fails | Do not assert closure; report the failure. |
| Evidence is valid | Return closure evidence and the exact proposed parent record. |

## Execution Steps

1. Gather criteria, commit, integrated `HEAD`, and PR evidence when present.
2. Verify the commit resolves and is an ancestor of the integrated base.
3. Confirm `chanks-4-puente` executed `archive` after delivery.
4. Return closure evidence and the `entrega.commit`/optional `entrega.pr` delta to the responsible parent.
5. Require and report `radar check`/`radar render` evidence after the parent records confirmation.

## Output Contract

Return criteria, commit/`HEAD`/PR evidence, archive evidence, proposed delta, `radar` results,
closure outcome or exact failure, and the closure evidence the responsible parent must record.

## References

- `../chanks-4-puente/SKILL.md`
- `../chanks-0-agente-soporte/SKILL.md`
- `references/links.md`
- `assets/session-doc.schema.json`
