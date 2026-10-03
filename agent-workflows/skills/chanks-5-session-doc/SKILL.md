---
name: chanks-5-session-doc
description: "Trigger: Chanks etapa 5, cerrar Sesión, close session, registrar entrega.commit. Close one delivered Session in openspec/plan.yaml through Radar."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "8.0"
---

## Activation Contract

Stage 5 (close). Activate after Gentle AI delivered the Session's commit. Closing records that commit
in the plan and updates Radar's view of the Session; it does not implement, review, deliver or
install anything.

## Hard Rules

- Read fresh plan evidence with the installed `radar sesion <ID>` for the delivered Session;
  never read `openspec/plan.yaml` whole. Only the responsible parent writes `openspec/plan.yaml`:
  locate the exact Session entry and read/edit only those lines; a delegated helper returns the exact delta.
  After any plan edit run `radar check`, then `radar render` only after it passes. Never edit
  `openspec/ROADMAP.md` by hand.
- Closure requires actual delivery evidence: a resolving immutable `entrega.commit` that is an
  ancestor of the primary branch's integrated HEAD, plus observed checks against the Encargo
  outcome and constraints. `entrega.pr` is optional only when it exists. Ordinary delivery policy
  decides how the commit got there.
- Gentle AI's technical record for a native Encargo is subordinate evidence, never closure or
  product status.
- A failed check or a commit that is absent or not integrated leaves the Session open; report the
  exact failure and keep the pending delta.
- Load `references/notion-closure.md` only when the project uses Notion and local policy permits it;
  the project must explicitly opt in. Notion is an optional projection. Missing Notion, its configuration or
  its tools never blocks the core plan closure: `entrega.commit` → `radar archivar` → `check` →
  `render`. Local prohibitions win; never load optional assets by default.

## Execution Steps

1. Run `radar sesion <ID>` for the delivered Session. Gather the Encargo outcome and constraint
   evidence, the checks Gentle AI observed, the commit, the integrated HEAD, and the optional PR.
2. Confirm the commit resolves and is an ancestor of the primary branch
   (`git merge-base --is-ancestor <commit> <primary>`).
3. The parent records `entrega.commit` (and `entrega.pr` when it exists) on the Session in
   `openspec/plan.yaml`, reading/editing only that exact entry, then runs `radar check` and
   `radar render` after the check passes.
4. For that completed, integrated Session run `radar archivar <ID>`, then `radar check`, then
   `radar render`. Never archive an open Session or batch-archive older ones.
5. Remove the Session's dedicated worktree, when it has one, once the commit is integrated.
6. When a delivery closed no planned work, say so as a standalone line, `nada que registrar`, instead
   of inventing a Session or a closure.

## Output Contract

Return outcome and check evidence, commit/HEAD/PR evidence, the Radar archive/check/render
results (or the pending parent commands), the closure outcome or failure, and the exact
evidence the responsible parent must record. State that ordinary delivery policy still applies.

## References

- `../chanks-4-puente/SKILL.md`
- `../_shared/plan-naming-convention.md`
- `references/notion-closure.md` — optional project projection, only under the gate above.
