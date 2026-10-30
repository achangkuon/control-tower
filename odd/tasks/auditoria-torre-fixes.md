# Auditoría de la Torre — correcciones

Fixes for the four findings of the 2026-10-30 Tower flow audit. Direct commits, no Session
(owner decision, L2). Read until `## Log`.

## Specs

- S1: "Borrar las 2 rutas muertas del plan" (`scripts/host-compatibility/opencode.mjs`,
  `test/compat/opencode-runtime.test.mjs` in Zona `hosts`) and group the 61 Engram
  "autoridad no verificable" warnings into one line.
- S2: `radar etapa <ID>` / `radar status` stop spawning repeated identical git processes
  (1404 spawns, 375 distinct, ~4.5 s measured).
- S3: The timing-dependent tests (`product/tower/v1/test/benchmark.test.mjs`,
  `test/lifecycle.test.mjs`) no longer fail the pre-push gate under load.
- S4: The generated AGENTS.md block stops ordering `radar etapa` at the start of every
  conversation (no-arg `radar etapa` answers "1 · Definir" by S155 design).

## Tasks

- [x] T1 S2 — memoize immutable git answers in Radar (inline) — commit: 1943baab
- [x] T2 S1 — group Engram warnings + remove dead routes (inline) — commit: 9b2c9ed8
- [x] T3 S3 — de-flake timing tests (inline) — commit: 3d5ac061
- [x] T4 S4 — fix project-agents template and regenerate block (inline) — commit: 73ec23d6

## Log

- L1: "Correige los 4" (after the audit summary of findings 1–4).
- L2: Owner decisions: finding 4 → fix the AGENTS.md block (recommended); finding 1 → group
  the Engram warnings in one line (recommended); record → "Commits directos, sin Sesión".
- L3: T3 worker added a speculative SQLITE_BUSY retry in lifecycle.test.mjs; parent removed it (unexercised) and re-verified 45/45 with every core saturated.
