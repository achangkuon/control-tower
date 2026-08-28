---
name: cierre-de-decisiones
description: "Trigger: decisiones abiertas, cerrar decisiones, qué falta decidir, decision sweep. Pregunta las decisiones abiertas de un plan por panel nativo, escribe las resoluciones y entrega."
license: Apache-2.0
metadata:
  author: "achangkuon"
  version: "1.0"
---

## Activation Contract

Load when the maintainer asks what decisions a plan is waiting on, wants to close them in one pass, or needs a plan decision-clean before unattended execution. Also load when a Session is blocked and it is unclear whether the blocker is a decision or a dependency.

## Hard Rules

- Derive every decision from repository artifacts. Engram and prior summaries corroborate; they are never the source. Verify counts against the files.
- Present decisions through the native question panel only. Never a markdown list of questions. Batch in groups of ≤4.
- Every option carries its real consequence. Exactly one is marked `(Recomendada)` and placed first.
- Never answer on the maintainer's behalf, invent a resolution, or widen a decision's scope.
- Scope every "zero open" claim to the set actually enumerated. Report decisions outside that set separately; never fold them into the count.
- Write the canonical register first, then every affected `STATUS.md`, then the index and release chain. Partial writes are drift.
- A resolved decision is not an unblocked Session. Recompute and report `decision-clean` and `dependency-blocked` separately.
- Deliver only under the repo's declared delivery policy. Never guess one.
- Never write a commit's own SHA into its content.

## Decision Gates

| Situation | Action |
|---|---|
| No declared delivery policy | Run `politica-de-entrega` first; do not guess |
| Read-only or Support worktree | Present only; require explicit authorization before writing |
| Decision has no owning Session | Record the resolution **and** flag the enumeration debt |
| Blocker is not a decision (parked candidate, unowned gap) | Report as residue; never count it resolved |
| One resolution makes another free | Say so; do not present them as independent |
| Docs edited before push | Gate re-arms; do the closing doc touch after the push |

## Execution Steps

1. Locate the canonical decision register, plan `STATUS.md` files, index and release chain.
2. Extract each open decision: exact question, class, evidence, options, what it contaminates.
3. Sweep for decisions the register does not enumerate. Declare the audited scope explicitly.
4. Rank by what each unblocks; note consequences and dependencies between them.
5. Present via `AskUserQuestion` in batches of ≤4 until exhausted.
6. Write resolutions in canonical order. Mark each source decision resolved in place, preserving its original question as history.
7. Recompute per-Session state and per-plan percentages.
8. Deliver per policy, then close the documentation after the push.
9. Save to Engram and report residues.

## Output Contract

Return: decisions presented and resolved; per-Session state delta separating decision-clean from dependency-blocked; surviving residues that are not decisions; delivery SHAs; and the explicit scope caveat for any "zero open" claim.

## References

- `references/decision-extraction.md` — where decisions live, the `escala`/`derivable` vocabulary, and the closed set of always-escalate classes.
- `assets/resolution-entry.md` — required shape of a resolved decision entry.
- `~/.claude/skills/_shared/plan-naming-convention.md` — §11 decision contract and the seven-state vocabulary.
