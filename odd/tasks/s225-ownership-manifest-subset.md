# S225 · Fix #157 — ownership manifest subset tolerance

Session: S225 (Resolución de problemas › Torre V1 › producto-torre, PLANIFICADO → EN CURSO)
Authority: product/tower/v1/runtime-config.mjs + product/tower/v1/test/runtime-config.test.mjs
Issue: #157. Family: #156 (fixed v1.3.1), #158 (installer territory, separate decision), #159 (launcher origin, filed).

## Tasks

- [ ] T1 — RED: regression tests in runtime-config.test.mjs for (a) grow: manifest with fewer
      entries than the running roster installs and the new manifest declares the full roster;
      (b) shrink: an entry whose skill left the roster is removed with backup and install
      proceeds; (c) preserved rejections: entries with non-ownable paths still fail.
- [ ] T2 — GREEN: relax load() exact-count check (runtime-config.mjs:107) to subset tolerance;
      wire retired-entry removal (ownable-destination guard) through prepare/install so doctor,
      uninstall and the fresh full-roster manifest hold in both directions.
- [ ] T3 — Full suite green (bun run test at minimum the tower v1 tests), work-unit commit,
      deliver per repo policy from Main.

## Evidence

- (recorded per task at close)
