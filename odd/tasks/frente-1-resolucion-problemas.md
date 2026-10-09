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
- [x] T3 S177 — delivered: 844e03b (historical labeling + current authority refs), branch frente-1/resolucion-problemas; documentation-only, review preflight skipped per contract; push pending maintainer decision.
- [x] T4 S178 — delivered: 4754543 (payload:null + nested test counting), branch frente-1/resolucion-problemas; native review review-118739d551d0b569 approved/burned; push pending maintainer decision.
- [x] T5 S179 — delivered: c05e8ae (mandatory three-suite gate, no auto report), branch frente-1/resolucion-problemas; native review review-57099e87241fd581 approved/burned. Checkout modes fixed to 755 (18 tracked executables; authorized by maintainer): Python suite went from 15 failures + 128 errors to 1 failure + 4 skips. Remaining failure root-caused: pi-v2 materialization pin a13d35a742c6ef8462812a28fbe1d8c8b7431c32 absent from local /home/<usuario>/projects/pi-v2 (needs git fetch, maintainer decision); gentle-pi pin satisfied (digest + 2.6.4). Pushes blocked by gate until resolved.
- [x] T6 S180 — report written: odd/tasks/s180-sdk-dependency-investigation.md (verdicts: plugin/ajv/yaml necesario; sdk direct declaration obsolete — zero code imports, transitive via plugin, only consumer is manifest assertion; stale maintenance doc claim false per git log -S). Scout-verified, all claims reproduce. Commit pending maintainer authorization; doc-only candidate, native review skipped per policy.
- [x] T7 S181 — report written: product/tower/v1/reviews/s181-v1-residual-review.md (frozen identity v1.2.5 -> 7ad0510, 11 digests verified across 3 origins, PINNED.paths 91 == members 91, isolated stamped-installer dry-run, findings H1/H2 media — INSTALL-AGENTS.md global-config claim vs runtime-config.mjs writes; H3 low — generic README sells retired interfaces; H4 informational — go telemetry). Scout-verified; commit pending maintainer authorization; doc-only candidate, native review skipped per policy.

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
