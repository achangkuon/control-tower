# S223 — Self-update roster bridge (issue #156)

Status: in_progress
Zona: producto-torre · Priority: resolucion-problemas-v1

## Goal

Make every `torre-control update` path able to cross a roster-size change
(v1.2.5 roster 91 → v1.3.0 roster 93) without manual state repair:

1. `parseEnvelope` (bootstrap.mjs) uses a fixed absolute maximum instead of
   `RELEASE_PATHS.size + 1` of the running CLI.
2. `update --from-checkout` builds the envelope with the checkout's own roster
   (BUNDLE_MEMBERS comes from the installed CLI today, cli.mjs:545).
3. `validateVersion` (global.mjs:183) admits historical caches by their pinned
   digest instead of re-deriving roster membership by size.

## Evidence (issue #156)

- Published v1.3.0 envelope is byte-valid with 93 members; the installed
  v1.2.5 CLI (bound 92) rejects ≥93 objects.
- Runtime 7b7b024 built via from-checkout shipped release.json with 91 members
  against its own 93-member bootstrap → self-bootstrap failed.
- Machine recovery 2026-10-05: broken version moved to
  `~/torre-broken-7b7b024-backup/`, state.json hand-repaired to active v1.2.5.

## Constraints

- The absolute bound stays finite and documented (DoS guard, not removed).
- Legacy cache admission strictly by verified pinned digest.
- No release published by this Session; publishing v1.3.1 (bundling S222's
  fix) is a separate human decision.
- Maintainer machine update happens after the fix, with authorization.

## Tasks

- [ ] RED: regression tests for the update bridge (91→91 parses, 91→93 parses,
      from-checkout with newer roster self-bootstraps, mixed-roster store inspects).
- [ ] Implement the three fixes (delegated writer).
- [ ] GREEN + full V1 Bun suite from Main.
- [ ] Native RDD review, deliver, archive via radar.
