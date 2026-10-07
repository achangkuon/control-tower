# S232 — Installed instructions gate stage 4 on the automatic pilot and the landing approvals

Subordinate execution continuity only, not a product plan.
Product Session: S232 (Torre V2 › v2-piloto). Authority: smoke V2 findings #7
and #2 (Engram 13286); maintainer decisions (Engram 13290/13292). Depends on
S231 and S233 (both archived).

## Objective

`project-agents.md` gains hard rules inside the existing managed block:
1. Before every stage-4 handoff, read `piloto` in `radar status --json`; when
   `piloto.prendido` is true, ask the blocking mode question
   «¿con piloto automático o en esta conversación?» and stop. Pilot off → no change.
2. On flight return: show each commit to the human, ask the blocking approval,
   record it with `piloto aprobar <sesión> --decision <texto>`, and only then
   run `piloto aterrizar`.

## Authorized files

`product/tower/v1/instructions/project-agents.md`,
`product/tower/v1/test/instructions.test.mjs`.

## Constraints

- Minimal text inside the existing managed block. RED test first.

## Tasks

- [x] RED+GREEN: instructions test asserts the pilot gate and landing approval rules.
- [x] Text added to the managed block without tripping forbidden-marker rules.
- [x] Checks: `bun test product/tower/v1/test/instructions.test.mjs` green;
      full suites at push.

## Evidence

- Work-unit commit on branch s232-oferta-piloto (recorded below).
