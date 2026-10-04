# Plan restructure: V2 · Piloto / V3 · Flota (Front 2)

## Purpose
Apply the maintainer-approved V2/V3 map to `openspec/plan.yaml` so two fronts can execute in parallel: Front 1 (problem resolution S175–S181) and Front 2 (V2/V3 sessions). Documentation-only planning change; no product code.

## Approved decisions (2026-10-04, maintainer Emilio)
- `core.mjs` / `main-store/`: archived as history; no session or work planned; source preserved.
- `chanks-0-jornada`: decision deferred and tied to V3 (might serve Flota); not planned today.
- S165: archived as replaced by the `piloto` tool and the new V3 Pista; source preserved.
- Inventory map approved: S203 and S169 → V2 · Piloto; S4.12, S9.8, S107 → V3 · Flota; priorities renamed `pista-v2` → `v2-piloto` and `torre-v3` → `v3-flota`.
- New V2 sessions enumerated in general terms (S214–S217); V3 stays coarse (moved sessions only).

## Checklist
- [x] T1 Rename priorities, move S203/S169 to v2-piloto, move S4.12/S9.8/S107 to v3-flota.
- [x] T2 Archive S165 as replaced (archivada + resolved decision).
- [x] T3 Add general-scope V2 sessions S214–S217 (encargo incompleto, no files declared).
- [x] T4 Add two-fronts execution comment and update piloto-automatico.md inventory notes.
- [x] T5 radar check + render; structural verification; native review; delivery.

## Acceptance and checks
- Only priorities block, S165/S169/S203/S4.12/S9.8/S107 fields, three new V2 session entries, plan comment, and piloto-automatico.md notes change.
- radar check: 0 errors, 63 baseline warnings; generated ROADMAP re-rendered.
- Documentation-only: no runtime RED/GREEN; structural validation appropriate.

## Evidence
Base HEAD: 3ee8c4c (Front 1 delivered and pushed). Owner decisions recorded in Engram 2026-10-04.

Implementation notes: new V2 sessions use `encargo.incompleto: true` without `diferida` (the Radar pattern for enumerated-but-unprepared sessions; validator `radar/encargo.go` rejects empty `archivos` and `diferida` combined with incompleto). Radar check: 0 errors / 63 baseline warnings. S214 shows BLOQUEADO under v2-piloto; S165 shows ARCHIVADO. ROADMAP regenerated via `radar render`.
