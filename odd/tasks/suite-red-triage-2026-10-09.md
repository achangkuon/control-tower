# Suite red triage and push unblock (2026-10-09)

Technical ODD record, not a product plan. No planned Session is closed by this work.

## Objective

Diagnose the 117 Bun suite failures blocking the pre-push gate, file them as
issues, fix the two known root causes, and land the 12 commits on origin/master.

## What happened

The pre-push gate rejected master (ahead 12) with 117 failures / 2163 tests.
Triage at a clean `origin/master` worktree (with dependencies installed) showed
1 flaky failure only, so all 117 were introduced by the unpushed commits.

## Root causes

1. **Bundle membership drift (~116 failures in cascade).** S243 added
   `chanks-4-puente/references/review-recovery.md` without the explicit
   bundle-membership review. `validateBundle` threw `Unexpected bundle entry`;
   every bundle-consuming test failed, including the Radar benchmark suite
   (17 "blocked") and the pinned roster-count fixtures. Fixed in `e8c7fb24`:
   member declared in `bundle.mjs` + audited test roster; count fixtures bumped
   (104→105 running roster, bridge/intake ladders). Issue #166.
2. **Provenance digest drift (1 failure).** Sanitization 4635f206 changed the
   RFC and REQUIREMENTS artifacts without rehashing the autonomous-v2 manifest
   refs. Fixed in `87a03318`. Issue #167.
3. **Flakiness (observed, not reproduced at close).** P6-C recovery clock test
   and the benchmark "blocked" verdicts passed on reruns. Issue #168.

Final suite: **2162 pass / 0 fail**. The Go suite (pre-push stage 2) also
failed for the same sanitization-drift family: the hardcoded Decision 55
locator in `authority_test.go` was 8 bytes stale. Re-anchored; `go test ./...`
green. Same issue class as #167.

## Commits

- `e8c7fb24` fix(bundle): declare review-recovery.md in the reviewed membership
- `87a03318` fix(provenance): rehash artifact digests after sanitization
- Issues: #166, #167, #168 (achangkuon/control-tower, status:needs-review)

## Delivery

Pushed to origin/master (e3f428ab..278af5d8) through all three pre-push gates
(Bun 2162/0, Go green, Python 535 OK after the paralelo contract exception).
The Python stage surfaced a fourth member of the missed-gate class: 4211dc5
amended test_builder_flow for the S242 reactivation boundary but missed
test_paralelo; fixed and commented on #167.

## Prevention

The gates worked (closed bundle roster + provenance digests + pre-push suite);
the gap was committing without running the gate. Both fixes document the
"update the roster/digests in the same change" rule in the issue bodies. The
flakiness issue proposes clock pinning and explicit skip verdicts.
