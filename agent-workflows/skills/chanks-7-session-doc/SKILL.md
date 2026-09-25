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
  claim future enforcement or create per-task/per-Módulo review loops.
- This skill gathers evidence and coordinates outstanding work; do not execute installers in this skill.
  The responsible parent arranges execution under repository policy and records the observed result.
- Preserve documentation configuration failures as evidence; do not reverse completed delivery.

## Decision Gates

| Condition | Action |
|---|---|
| Check/outcome evidence fails | Do not close; return exact failure. |
| Commit is absent or not integrated | Do not close; preserve pending delta. |
| Review declined/unavailable | Report applicable policy fallback; ordinary delivery evidence still decides closure. |
| A required reinstall, its successful verification, or skill-install confirmation is missing | Do not close; report the exact pending command, verification, or human confirmation. |
| Evidence is valid, including any required reinstall evidence | Return closure evidence and exact parent-record delta. |

## Execution Steps

1. Gather native Encargo outcome/constraint evidence, configured TDD/check results, commit, integrated HEAD, and optional PR.
2. Confirm commit resolution and ancestry; distinguish actual delivery from review information.
3. Read the repository's `AGENTS.md` for post-delivery reinstall policy. Compare the actual
   delivered changed paths (not just the current dirty tree) with every declared path rule; collect
   every matching tool command and its prescribed verification. If the policy cannot be read, report
   the missing evidence rather than assuming no rule.
4. If no reinstall rule is declared, explicitly report none and require no reinstall. If rules
   exist but no delivered path matches, report no reinstall applicable and the paths checked.
   For each matching rule, record the executed reinstall command and its verification result
   (including observed success); if no check is prescribed, obtain an observed verification of the
   installed tool. If execution or verification is missing, name the pending command/check; do not declare the Session closed
   until required reinstall and verification evidence exist. Do not treat a proposed command as run.
5. Ask for explicit human confirmation before reinstalling skills: sync can terminate open Pi sessions.
   Without that confirmation, report the approval and reinstall as pending; never infer approval
   from delivery or from this skill. The parent coordinates any authorized execution after delivery.
6. For explicit native SDD, gather existing archive evidence after delivery; otherwise return native ODD continuity only as subordinate evidence.
7. Return `entrega.commit`/optional PR delta. After the parent records confirmed delivery in
   `openspec/plan.yaml`, instruct the parent to run `radar archivar <ID>` for that completed,
   master-integrated Session, then `radar check` and `radar render`. The archiver writes
   `openspec/archive/sesiones/<ID>.md` and leaves one reference in the live plan. Never
   archive an open Session or batch-archive older Sessions as part of this closure.
   The parent owns these writes and their separate delivery evidence.

## Output Contract

Return outcome/check evidence, commit/HEAD/PR evidence, review result or fallback, applicable native
SDD archive evidence, Radar archive/check/render results or pending parent commands, reinstall policy source, matched delivered paths, executed
commands and verification results (or explicit none/pending work), human skill-install confirmation
when applicable, closure outcome/failure, and the exact evidence the responsible parent must record.
State that ordinary delivery policy and Chanks close gates still apply.

## References

- `../chanks-4-puente/SKILL.md`
- `../chanks-0-agente-soporte/SKILL.md`
