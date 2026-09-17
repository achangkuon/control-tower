---
name: chanks-7-session-doc
description: "Trigger: final session closure, close session, document session. Gather post-delivery evidence for the responsible parent."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "6.0"
---

## Activation Contract

Activate after configured checks, applicable review handling, and delivery. Gather closure evidence;
the responsible parent records confirmed plan evidence and generates the view under ordinary policy.

## Hard Rules

- Read plan evidence only through `../chanks-0-agente-soporte/SKILL.md`; never write the plan or ROADMAP.
- Closure requires actual delivery evidence: a resolving immutable `entrega.commit` ancestor of
  integrated HEAD, plus observed checks against the Encargo outcome/constraints. `entrega.pr` is
  optional only when it exists.
- Native ODD document/Engram continuity is subordinate technical evidence, not closure or product status.
- Review follows Gentle AI native policy. A decline/provider fallback is reported, never hidden;
  review outcome never authorizes delivery and does not create a deadlock.
- Only explicitly selected native SDD follows its existing archive controls after delivery. Do not
  claim future enforcement, install anything, or create per-task/per-Módulo review loops.
- Preserve documentation configuration failures as evidence; do not reverse completed delivery.

## Decision Gates

| Condition | Action |
|---|---|
| Check/outcome evidence fails | Do not close; return exact failure. |
| Commit is absent or not integrated | Do not close; preserve pending delta. |
| Review declined/unavailable | Report applicable policy fallback; ordinary delivery evidence still decides closure. |
| Evidence is valid | Return closure evidence and exact parent-record delta. |

## Execution Steps

1. Gather native Encargo outcome/constraint evidence, configured TDD/check results, commit, integrated HEAD, and optional PR.
2. Confirm commit resolution and ancestry; distinguish actual delivery from review information.
3. For explicit native SDD, gather existing archive evidence after delivery; otherwise return native ODD continuity only as subordinate evidence.
4. Return `entrega.commit`/optional PR delta and require/report Radar check/render after the parent records confirmation.

## Output Contract

Return outcome/check evidence, commit/HEAD/PR evidence, review result or fallback, applicable native
SDD archive evidence, Radar results, closure outcome/failure, and the exact evidence the responsible
parent must record. State that ordinary delivery policy and Chanks close gates still apply.

## References

- `../chanks-4-puente/SKILL.md`
- `../chanks-0-agente-soporte/SKILL.md`
