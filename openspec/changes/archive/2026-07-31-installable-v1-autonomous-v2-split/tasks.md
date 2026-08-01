# Tasks: Installable V1 release

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 320–400 for S8.2; maintainer-approved hard maximum 800 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes; every PR targets `master` |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

## Plan P8 — Installable V1 release

### S8.1 — Provenance surfaces (✅ COMPLETO)

- [x] Historical tasks 1.1–1.3 are complete and trace to PR #65, merge `b1269a2d2f4b791c6f9e2e29650660160e99f382`.

### S8.2 — Immutable lifecycle foundation (implementation complete; pending independent verification)

PR boundary: one autonomous PR from `master@e4d8ad6`; focused test `bun test test/install`; runtime harness uses temporary XDG homes and temporary repositories for install → failed upgrade → rollback → uninstall. Rollback reverts exactly `test/install/version-store.test.mjs`, `test/install/lifecycle.test.mjs`, `install/version-store.mjs`, `install/active-pointer.mjs`, `install/lifecycle.mjs`, `install.sh`, `bin/torre`, and `scripts/publish-runtime.mjs`.

Strict TDD ordering is RED → GREEN → REFACTOR within each Módulo; do not interleave these steps.

#### M8.2.1 — Version store and active pointer

- [x] T8.2.1.1 RED: add `test/install/version-store.test.mjs` for immutable versions, pointer validation/rollback, preservation, and `CT_V2_ONLY` denial.
- [x] T8.2.1.2 GREEN: add `install/version-store.mjs` and `install/active-pointer.mjs` with validation, atomic replacement, and old-version retention.
- [x] T8.2.1.3 REFACTOR: normalize temp-file, fsync, rename, and deterministic failure paths; rerun `bun test test/install`.

#### M8.2.2 — Lifecycle command wiring

- [x] T8.2.2.1 RED: add `test/install/lifecycle.test.mjs` for idempotent install/diagnose/upgrade/rollback/uninstall and failed-upgrade preservation of config/history.
- [x] T8.2.2.2 GREEN: wire `install/lifecycle.mjs`, `install.sh`, `bin/torre`, and `scripts/publish-runtime.mjs` without touching `core.mjs`, `mcp.mjs`, `package.json`, or `bun.lock`.
- [x] T8.2.2.3 REFACTOR: make the temporary-XDG/repository harness deterministic and record safe audit/rollback outcomes; rerun the focused test.

Telegram is the priority for the first future dependency-safe Sesión; do not assign an ID before its one-PR boundary is proven. It MUST NOT gain shell, worker, Git, merge, delivery, or implicit project-selection authority.
