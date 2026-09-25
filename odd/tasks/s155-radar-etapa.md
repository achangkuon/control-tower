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

- [x] T1 — Add strict-TDD coverage and implementation for versioned in-progress markers in the Git common directory, including linked-worktree identity, safe parsing, orphan reporting, and `EN CURSO` state precedence without creating a new ready seat. Proof: focused RED→GREEN, full Radar suite, commit `282cfceca77375c253ad6feee85559aef56d2387`.
- [x] T2 — Add the deterministic `radar etapa` command and tests for the five evidence-derived stage menus and fail-closed cases. Proof: focused RED→GREEN and final independent verification, commit `282cfceca77375c253ad6feee85559aef56d2387`.
- [x] T3 — Project active Sessions before `LISTO` work in status/resumption output, surface orphan markers without deletion, and preserve existing queue/readiness semantics. Proof: single-observation regressions for status, snapshot, roadmap, render, and faltan; commit `282cfceca77375c253ad6feee85559aef56d2387`.
- [x] T4 — Run source normalization, focused and full verification, structural scope readback, native review, then deliver the coherent S155 commit and record the actual evidence. Proof: gofmt; full Go suite; Darwin arm64/amd64 builds; source `radar check` with 0 errors/32 pre-existing warnings; independent PASS; native review unavailable before lineage (`schema-incompatible`, no mutation); direct push of `282cfceca77375c253ad6feee85559aef56d2387` to `master`.

## Delivery (2026-09-25)

- Strict TDD: focused marker/stage/observation tests failed before implementation and passed after the bounded corrections.
- Verification: `go test ./... -count=1` passed; both documented Darwin cross-builds passed; source `go run . check -C /home/emili/projects/control-tower/Main` returned 0 errors and 32 existing authority warnings; `git diff --check` passed.
- Independent verification: final PASS over the complete 1,315-line implementation/test diff, within the maintainer-expanded 1,250–1,350 line exception.
- Native review: intended-untracked selection returned `schema-incompatible` before creating a lineage or mutating authority, so review was unavailable and the high-risk fallback evidence was the independent verifier PASS.
- Delivery: Radar was reinstalled, the repository pre-push suite passed 1,488 tests, and commit `282cfceca77375c253ad6feee85559aef56d2387` was pushed directly to `master`.

## Checkpoint

S155 implementation is delivered and its immutable commit is now recorded in `openspec/plan.yaml`. This close record is pending its documentation commit/push; after that, recapture Radar before admitting S156 or any newly unblocked Session.
