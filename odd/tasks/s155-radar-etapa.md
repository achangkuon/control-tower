# S155 — Radar stage routing and in-progress evidence

## Session identity and authority

`S155 (Método V1 › metodo — Radar ofrece \`radar etapa\`, que calcula desde el dato del plan y la evidencia de Git qué etapas de la guía Chanks de 5 etapas están habilitadas para una Sesión, y calcula 🔵 EN CURSO desde una marca temporal fuera de plan.yaml en vez de dejarlo deliberadamente ausente., 🟢 LISTO)`

Implement the approved native Encargo on `master` from fresh Radar admission at `e6f5bed281846e2ab0712db5055e9c691984cc67`. This document is subordinate ODD execution continuity, not product-plan authority. The maintainer authorized the complete sequential delivery chain S155–S159, including direct commits and pushes after checks and review. S155 originally forecast 600–900 lines; after the portable marker reader and strict regressions produced an approximately 1,250-line candidate, the maintainer explicitly expanded the exception to approximately 1,250–1,350 authored diff lines for the same one coherent commit and authorized one scoped correction so `radar roadmap` reuses the command's captured marker observation.

## Scope and constraints

- Mutation is limited to the exact S155 implementation files declared by Radar plus this ODD continuity record. Do not edit `check.go`, `check_test.go`, `openspec/plan.yaml`, or downstream S157/S159 consumers during implementation.
- Strict TDD is required. Observe focused RED before production behavior, then GREEN, the full Radar suite, source `radar check`, deterministic golden readback, and `git diff --check`.
- The marker lives under the Git common directory, outside `plan.yaml`. Reading must be deterministic and non-mutating; orphan markers are reported and never deleted automatically.
- `radar etapa` offers only evidence-backed stages. It does not choose a stage for the model and must fail closed when no stage applies.
- One delegated writer owns the multi-file implementation. The parent keeps delivery, review, plan closure, and sequential re-admission authority.

## Tasks

- [ ] T1 — Add strict-TDD coverage and implementation for versioned in-progress markers in the Git common directory, including linked-worktree identity, safe parsing, orphan reporting, and `EN CURSO` state precedence without creating a new ready seat.
- [ ] T2 — Add the deterministic `radar etapa` command and tests for the five evidence-derived stage menus and fail-closed cases.
- [ ] T3 — Project active Sessions before `LISTO` work in status/resumption output, surface orphan markers without deletion, update deterministic golden fixtures, and preserve existing queue/readiness semantics.
- [ ] T4 — Run source normalization, focused and full verification, structural scope readback, native review, then deliver the coherent S155 commit and record the actual evidence.

## Checkpoint

The implementation, portable marker reader, strict regressions, Linux suite, and documented Darwin cross-builds pass. Independent verification found one remaining blocker: `radar roadmap` still re-reads markers instead of using the command's single captured observation. The maintainer expanded the size exception and authorized one scoped correction. Next: correct that observation seam, rerun independent verification, then perform native review and delivery.
