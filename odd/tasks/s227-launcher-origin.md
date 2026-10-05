# S227 · Fix #159 — launcher-origin decoupling + R3-2 triage

Session: S227 (Resolución de problemas › Torre V1 › producto-torre, EN CURSO)
Authority: product/tower/v1/global.mjs, product/tower/v1/test/global.test.mjs, product/tower/v1/runtime-config.mjs, product/tower/v1/test/runtime-config.test.mjs
Issue: #159 (family #156/#157/#159 — last piece).

## Tasks

- [ ] T1 — RED: global.test.mjs regressions: (a) uninstall run by a CLI whose module origin
      differs from the retained legacy wrapper's checkout completes (store retired, wrapper
      restored byte-exact); (b) doctor on a state-absent machine with a legacy wrapper pointing
      at any canonical checkout exits 0 (standalone-installer scenario); (c) install retains the
      discovered repository in state.original; (d) malformed wrapper shapes still rejected.
- [ ] T2 — GREEN: original() validates the three-line wrapper SHAPE (canonical path, no
      metacharacters) instead of equality with import.meta.url-derived legacy(options); uninstall
      readback compares restored bytes against the retained state.original evidence. Minimal diff.
- [ ] T3 — R3-2 triage: recover finding text from the review store for lineage
      review-3a5b4d6086f248ff; if unrecoverable, evaluate runtime-config.mjs:470-486 record/settings
      bookkeeping and fix minimally or document as accepted with justification.
- [ ] T4 — Focused + full verification, work-unit commit, deliver from Main, close #159.

## Evidence

- RED: 3 new contract tests failed with "unknown launcher" (install discovery, uninstall
  readback, state-absent doctor). GREEN: 77 pass / 0 fail / 699 expect().
- R3-2: finding text unrecoverable from the native store (hashes only). Evaluated
  runtime-config.mjs:465-483: `surgical` latch correct; retiredPaths filter sufficient;
  `hookDigests` persisted but read by no consumer (inert manifest-local state) →
  accepted-by-design, recorded as cleanup candidate (removing a persisted manifest field is a
  product-record contract change outside S227's authority).
- Native review review-90281fac4366059a: approved first pass; 3 informational advisories
  (R3-001 global.mjs:450, R3-002 global.mjs:120, R3-003 global.test.mjs:696). Commit: 20ee91a.
  Delivered 6f7b985..20ee91a to master.
