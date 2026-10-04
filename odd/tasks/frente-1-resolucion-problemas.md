# Frente 1 — Resolución de problemas (S175–S181)

## Purpose
Execute Sessions S175–S181 (prioridades resolucion-problemas-generales y
resolucion-problemas-v1) in the frente-1 worktree, one at a time, in dependency
order. openspec/plan.yaml and Radar remain the only product planning authority;
this is subordinate ODD execution continuity.

## Scope and constraints
- Never touch v2-piloto/v3-flota priorities or S203, S169, S214–S217, S4.12, S9.8, S107 (Frente 2).
- Commit and push only with explicit maintainer authorization in conversation.
- radar check (0 errors, 63 baseline warnings) before every commit.
- S178–S181 contracts were completed on 2026-10-04 (planning edit, radar check 0 errors / 63 warnings, render regenerated).
- Investigation reports (S180/S181) are the only writes for those sessions; sources read-only.

## Tasks
- [x] T1 S175 — delivered: edaa4e0 (planning contracts) + 51d38d0 (hook fix), branch frente-1/resolucion-problemas; native review approved/burned; push pending maintainer decision.
- [x] T2 S176 — delivered: 0ee4bf5 (cache invalidation), branch frente-1/resolucion-problemas; native review review-53f938c299e02f21 approved/burned; push pending maintainer decision.
- [ ] T3 S177 — Rotular diseño histórico en ROADMAP raíz. Depends: T2.
- [ ] T4 S178 — Radiografía ocasional sin porcentaje de instalación + conteo anidado. Depends: T2.
- [ ] T5 S179 — Cobertura de suites y prerrequisitos portables (Bun/Go/Python obligatorios). Depends: T1.
- [ ] T6 S180 — Investigación SDK con informe sustantivo en odd/tasks/s180-sdk-dependency-investigation.md. Depends: T3.
- [ ] T7 S181 — Revisión V1 publicada con informe en product/tower/v1/reviews/s181-v1-residual-review.md; congelar identidad de release al inicio. Depends: none (S150 archived).

## Acceptance and checks
- Each task: test-first where applicable (observed RED/GREEN), focused test commands per contract.
- S175: bun test test/pre-push-plan-gate.test.mjs. S176: bun test agent-workflows/test/cli.test.mjs agent-workflows/test/measure.test.mjs agent-workflows/test/render.test.mjs.
- S177: cross-reference verification + git diff --check. S178: focused measure tests.
- S180/S181: substantive report content; no repairs, no installs, no HOME writes.
- Documentation Close Gate: delivery push requires plan.yaml closure evidence via chanks-5-session-doc (radar archivar → check → render).

## Progress
T0 (contract completion) applied 2026-10-04: S178–S181 encargos completed with
scout evidence; radar check 0 errors / 63 baseline warnings; radar render done.
T1 (S175) implemented test-first by writer muu92ary (RED 13 pass/4 fail ->
GREEN 17 pass/0 fail, 51 expects), independently verified (all checks pass,
sh/dash syntax OK), native review review-f34041bada5e666f approved and
acknowledged (authority burned for target
sha256:5ba7705b9dff72dfa73ee91b0603103f2d4caa8fd962d6150241918000057646); 4
non-blocking SUGGESTION findings (R3-001..R3-004) recorded as later work.
Pending maintainer authorization for commits.

## Evidence and next step
Baseline: 05673c4. Next: T1 (S175) via writer delegation, test-first.
