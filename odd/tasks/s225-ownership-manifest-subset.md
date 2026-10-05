# S225 · Fix #157 — ownership manifest subset tolerance

Session: S225 (Resolución de problemas › Torre V1 › producto-torre, PLANIFICADO → EN CURSO)
Authority: product/tower/v1/runtime-config.mjs + product/tower/v1/test/runtime-config.test.mjs
Issue: #157. Family: #156 (fixed v1.3.1), #158 (installer territory, separate decision), #159 (launcher origin, filed).

## Tasks

- [x] T1 — RED: 3 new tests failed with "incomplete ownership roster" (runtime-config.mjs:107) —
      grow, shrink and preserved-rejection suites. `bun test … -t S225` → 3 fail / 0 pass.
- [x] T2 — GREEN: load() exact-count check removed (subset tolerance); retiredSkill() guard
      (skill-shaped single-segment paths, name ∉ V1_SKILLS, `_shared` explicitly excluded after
      parent review — a corrupted manifest naming `.agents/skills/_shared` must not delete the
      live owned parent); installRuntime backs up + removes present retired entries, tolerates
      already-absent ones, drops retired paths from record.directories; preflight re-verifies
      every recorded entry. Focused file: 30 pass / 0 fail / 152 expect().
- [x] T3 — Full bun suite via gentle-ai-verify; work-unit commit (below); deliver from Main per
      repo policy.

## Evidence

- RED: S225 grow/shrink/rejection tests failed at load → preflightRuntimeHome with
  "Tower runtime: incomplete ownership roster" (the exact defect #157 removes).
- GREEN: bun test product/tower/v1/test/runtime-config.test.mjs → 30 pass / 0 fail / 152 expect().
- Parent-added regression: `.agents/skills/_shared` with component skills now asserted to still
  throw /invalid manifest destination/.
- Commit: (recorded after delivery)
