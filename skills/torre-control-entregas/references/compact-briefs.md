# Compact Briefs

Budget for every handoff, whether it travels through `tower_send` or a
copy-paste block.

This is not style. The Tower coordinates by reading reports, and every word an
agent spends restating procedure is context the Tower loses for the thing only
it can do. A brief that re-teaches the harness costs twice: once to write, once
in every turn that carries it.

## Budget

- 120–300 words is the target; 500 is the hard ceiling.
- At most 6 sections and 5 closing criteria.
- Standard rules collapse to one line: `Aplicá AGENTS.md y los harness auto-invocados.`

## Never restate

Anything the harness or the repository instructions already cover:

- worktree tutorials
- the full fetch/rebase/review/push/PR sequence
- what TDD is
- the Gentle AI manual
- generic security checklists
- whole plans or audits pasted inline

## Always include

1. objective and verified current state
2. source paths (plan/spec/status)
3. allowed and forbidden scope
4. branch, reservation, DB mode, dependencies
5. observable result plus the specific tests or gates that prove it

Extended instructions are allowed only for an exception the harness does not
cover. Label it `EXCEPCIÓN` and justify it in one sentence. An exception never
grows into a general tutorial.

## Validate

```bash
python3 ~/.config/opencode/control-tower/validate-compact-message.py <mensaje.txt>
```

It checks the word ceiling, the required sections (`AGENTE`, `OBJETIVO`,
`FUENTES Y SCOPE`, `COORDINACIÓN`, `HECHO CUANDO`), that closing criteria appear
once and stay under five bullets, and that no harness procedure was pasted in.

`--self-test` verifies the validator itself.

Over budget means cut duplication, never verifiable technical requirements. A
brief that drops a test to fit is worse than a long one.
