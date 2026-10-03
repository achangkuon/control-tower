# S192 — Control Tower project instructions (AGENTS.md block + global pointer)

Session: S192 (openspec/plan.yaml). Text approved by Emilio on 2026-10-02 in conversation,
including the final addition: never read plan.yaml whole; use Radar to read Sessions.

## Allowed edit surfaces
- product/tower/v1/instructions/project-agents.md
- product/tower/v1/instructions/global-pointer.md
- product/tower/v1/test/instructions.test.mjs

## Tasks
- [x] 1. RED: structural test for both templates (markers, version placeholder, flow diagram,
      router names only V1 skills that exist, Radar commands that exist, no V2/V3 terms,
      defers to Gentle AI, pointer is short).
- [x] 2. GREEN: write both templates with the approved text.
- [x] 3. Verify (focused test + V1 suite). No commit: explicitly excluded by this task.

## Evidence
- RED: `bun test product/tower/v1/test/instructions.test.mjs` — exit 1; 0 pass, 13 fail.
  Intended assertion: `project-agents.md template must exist` / `global-pointer.md template must exist`,
  expected `true`, received `false`. Both templates were absent before implementation.
- GREEN: `bun test product/tower/v1/test/instructions.test.mjs` — exit 0; 13 pass, 0 fail,
  138 assertions. Includes negative checks for forbidden terms, non-V1 skills/commands,
  duplicate markers/placeholders and extra trailing newlines; the pointer is five lines.
- Both templates use the approved text verbatim; no template deviations were necessary.
- Full V1 validation (`bun test product/tower/v1`) awaits the parent: existing
  `product/tower/v1/test/release-build.test.mjs` fixtures run `git add` and `git commit`
  and remove temporary directories. Other V1 tests also write/delete temporary fixtures.
  These operations exceed this implementation writer's no-stage/no-commit/no-deletion
  and exact-write-surface restrictions. The full suite was not run; no counts are claimed.
- No commit or push performed. Unrelated working-tree files left untouched.
- Runtime harness: N/A — static instruction templates, verified by contract tests.
- Rollback boundary: the three new product files listed above; no installer/runtime changes.
- Full V1 suite: 312 pass, 1 skip, 0 fail (verifier).
