# S229 · Hermetic legacy-core security tests

Session: S229 (Resolución de problemas › Generales › cimientos, EN CURSO)
Authority: test/fail-closed.test.mjs (cimiento exacto reservado). Any additional file = scope expansion, report first.
Mantenedor correction on record: these tests running IS security, not friction; the redesign must not weaken/skip/reformulate any assertion.

## Tasks

- [ ] T1 — Understand the dependency: how bin/torre resolves $HOME/.config/opencode/control-tower/core.mjs and what contract the three failing security tests need (inactive-error-precedence, off-waits-for-guarded-operation, off-preserves-state) + the timeout one.
- [ ] T2 — Provision a hermetic core fixture INSIDE test/fail-closed.test.mjs (no new files) so the tests are self-contained in a disposable HOME. Same assertions, same count.
- [ ] T3 — Verification: `bun run test` green in a disposable sandbox HOME (the v1.3.2 controls block) AND green in the real HOME, same test count. Work-unit commit; deliver from Main.

## Evidence

- RED (sandbox): 5 fail-closed tests failed with core.mjs-not-found + 1 timeout; pre-push gate
  timed out at 5s on cold go build (6.37s measured vs 0.61s warm).
- GREEN: scoped empty-HOME 8/8 and 26/26 ×3; FULL sandbox suite 2145 pass / 0 fail / 1 skip /
  exit 0; real HOME identical count (2146 tests). Assertions unchanged (70 expect() in
  fail-closed; no plan-gate assertion touched). Scope expansion authorized by mantenedor's
  goal (option A): pre-push-plan-gate.test.mjs added to archivos/cimientos (8e580e1).
- Native review review-5b19da4c147cb9d8: approved first pass, zero findings. Commit f6f3a1d.
