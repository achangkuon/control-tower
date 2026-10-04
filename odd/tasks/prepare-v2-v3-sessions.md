# Prepare V2 Piloto and V3 Flota sessions (Front 2)

## Purpose
Complete the technical contracts of the four V2 sessions (S214–S217) left with incomplete encargo, and re-frame the five deferred sessions (S203, S169 in v2-piloto; S4.12, S9.8, S107 in v3-flota) against the approved autopilot design (P1–P14). Planning-only change to `openspec/plan.yaml`; no product code.

## Authority
Encargo from maintainer Emilio (this conversation, 2026-10-04): prepare contracts, do not execute unless Radar marks a session LISTO and Emilio approves. Design authority: docs/architecture/piloto-automatico.md (P1–P14), docs/architecture/definiciones-v1-v2-v3.md, mapa V2/V3 aprobado (commit 05673c4).

## Constraints
- Never touch S175–S181 (Front 1, parallel session in another worktree).
- Edit only v2-piloto/v3-flota entries in plan.yaml; resolve conflicts when integrating, never rewrite Front 1 content.
- `radar check` before every commit (0 errors, 63 warnings baseline).
- Commit/push only with explicit Emilio authorization.

## Checklist
- [x] T1 Explore radar tool + TUI source for exact-file evidence.
- [x] T2 Complete S214 contract (states + LISTO rule). Zona fixed to metodo (partition evidence).
- [x] T3 Complete S215 contract (`piloto` tool). Prospective files under agent-workflows/tools/piloto/.
- [x] T4 Complete S216 contract (TUI controls). Zona producto-torre (product/tower/v1/tui/).
- [x] T5 Complete S217 contract (review on return). Zona metodo.
- [x] T6 Re-frame S203 and S169 per design. Both stay diferida: true (activation is Emilio's call).
- [x] T7 Re-frame S4.12, S9.8, S107 per design (context sentences + references; diferida kept).
- [x] T8 radar check (0 errors / 63 warnings baseline) + render. Commit awaits Emilio authorization.

## Acceptance and checks
- Only the nine named session entries change (plus generated ROADMAP).
- radar check: 0 errors, 63 baseline warnings.
- Documentation-only planning change: structural validation, no runtime RED/GREEN.

## Evidence
Base HEAD: 05673c4 (Front 2 restructure delivered and pushed).

## Findings (2026-10-04)
- Partition: producto-torre owns only product/tower/; radar/piloto tool work lives in Zona metodo
  (agent-workflows/). S214/S215/S217 moved to metodo; S216 stays producto-torre. Validator would
  reject otherwise (encargo.go: file must be owned by the session's Zona).
- S214 computed state: LISTO-worthy (no incomplete encargo, no deps) but shows espera turno because
  the active priority (torre-v1 / Front 1 chain) is ahead. No blocker of its own.
- S215/S216/S217 remain PLANIFICADO: they depend on S214/S215 being COMPLETO/ARCHIVADO (piloto off
  rule, state.go:238).
- Pending outside this task: pista-entrega-ordenada.md still says V2 has no sessions (S203 exists);
  chanks-0-jornada decision deferred to V3 detail planning.
