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
  never read `openspec/plan.yaml` whole. Closure is one command: `radar archivar <ID> --commit <oid
  completo>` validates the commit, records `entrega.commit`, archives, runs `check` and `render`,
  and is atomic — if any step fails it names that step and changes nothing. Never hand-edit
  `entrega.commit` in `openspec/plan.yaml`, and never edit `openspec/ROADMAP.md` by hand. Only the
  responsible parent writes the plan, and now it does so through that single command.
- Closure requires actual delivery evidence: a resolving immutable `entrega.commit` that is an
  ancestor of the primary branch's integrated HEAD, plus observed checks against the Encargo
  outcome and constraints. `entrega.pr` is optional only when it exists. Ordinary delivery policy
  decides how the commit got there.
- `radar archivar` without `--commit` still archives a delivery already registered by hand; that
  legacy path skips `check` and `render`. Prefer the single command.
- Gentle AI's technical record for a native Encargo is subordinate evidence, never closure or
  product status.
- A failed check or a commit that is absent or not integrated leaves the Session open; report the
  exact failure and keep the pending delta.
- Load `references/notion-closure.md` only when the project uses Notion and local policy permits it;
  the project must explicitly opt in. Notion is an optional projection. Missing Notion, its configuration or
  its tools never blocks the core plan closure: `radar archivar <ID> --commit <oid>`. Local
  prohibitions win; never load optional assets by default.

## Execution Steps

1. Run `radar sesion <ID>` for the delivered Session. Gather the Encargo outcome and constraint
   evidence, the checks Gentle AI observed, the commit, the integrated HEAD, and the optional PR.
2. Confirm the commit resolves and is an ancestor of the primary branch
   (`git merge-base --is-ancestor <commit> <primary>`). The command below revalidates both.
3. Close with one atomic command: `radar archivar <ID> --commit <oid completo>`. It validates the
   commit, records `entrega.commit` in the compact historical reference, archives the Session, and
   runs `check` then `render`. If a step fails the error names it and nothing changes; do not
   repeat `radar check` or `radar render` by hand after a successful closure.
4. Remove the Session's dedicated worktree, when it has one, once the commit is integrated.
5. When a delivery closed no planned work, say so as a standalone line, `nada que registrar`, instead
   of inventing a Session or a closure.

## Output Contract

Return outcome and check evidence, commit/HEAD/PR evidence, the single `radar archivar <ID>
--commit <oid>` result (or its named failing step and the pending delta), the closure outcome,
and the exact evidence the responsible parent must record. State that ordinary delivery policy
still applies.

## References

- `../chanks-4-puente/SKILL.md`
- `../_shared/plan-naming-convention.md`
- `references/notion-closure.md` — optional project projection, only under the gate above.
