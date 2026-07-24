# Apply Progress: VPS Observation Dashboard Skeleton

## Work Unit 1 — Five-Field View Model and Safe Renderer

### Start state

- `git status --short` before Work Unit 1:

  ```text
   M .gitignore
  ?? .session-doc.json
  ?? openspec/changes/vps-observation-dashboard-skeleton/
  ```

- Unrelated dirty and untracked files are preserved and outside this work unit.
- Baseline command: `bun test`
- Baseline result: **FAIL** — 43 pass, 2 fail, 270 expect() calls, 45 tests across 3 files in 3.55s.
- Baseline failures (pre-existing worktree-path expectation):
  - `P0 frozen snapshot restore > restores f583df7 into an isolated root with exact tracked bytes`
  - `P0 frozen snapshot restore > restores 71ab571 into an isolated root with exact tracked bytes`
  - Both expected `.git/control-tower` but received `../../Main/.git/control-tower` at `test/migration.test.mjs:824`.

### Strict TDD evidence

- **RED:** Added focused disclosure, validation, grouping, empty-view, semantic-rendering, readable-state, and five-value escaping tests before implementation modules existed.
  - `bun test test/dashboard/view-model.test.mjs` — expected failure, exit 1: `Cannot find module '../../dashboard/view-model.mjs'`; 0 pass, 1 fail, 1 error, 1 file in 12ms.
  - `bun test test/dashboard/render.test.mjs` — expected failure, exit 1: `Cannot find module '../../dashboard/render.mjs'`; 0 pass, 1 fail, 1 error, 1 file in 11ms.
- **GREEN:** Implemented the minimum explicit allowlist/grouping mapper and centralized escaped semantic renderer.
  - View-model: 3 pass, 0 fail, 16 expect() calls, 1 file in 14ms.
  - Renderer: 3 pass, 0 fail, 21 expect() calls, 1 file in 15ms.
- **TRIANGULATE:** Added non-adjacent repeated-project grouping, inherited-extra removal, Unicode, long values, metacharacter escaping, and replacement canonical input.
  - View-model: 4 pass, 0 fail, 19 expect() calls, 1 file in 17ms.
  - Renderer: 4 pass, 0 fail, 27 expect() calls, 1 file in 15ms.
- **REFACTOR:** Replaced generic candidate-value collection with explicit named reads and a fresh five-field return object; post-refactor focused suites remained green.

### Verification

- Final `bun test test/dashboard/view-model.test.mjs`: **PASS** — 4 pass, 0 fail, 19 expect() calls, 1 file in 15ms.
- Final `bun test test/dashboard/render.test.mjs`: **PASS** — 4 pass, 0 fail, 27 expect() calls, 1 file in 16ms.
- Final `bun test`: **FAIL** — 51 pass, 2 fail, 316 expect() calls, 53 tests across 5 files in 3.83s.
- The two full-suite failures are the same baseline worktree-path failures at `test/migration.test.mjs:824`; all 8 Work Unit 1 tests pass. Work Unit 1 is not declared successful while the required full suite is red.

### Runtime harness

`N/A` — Work Unit 1 contains deterministic in-process mapping and rendering with no HTTP boundary.

### Rollback boundary

Remove only `dashboard/view-model.mjs`, `dashboard/render.mjs`, `test/dashboard/view-model.test.mjs`, and `test/dashboard/render.test.mjs`; no runtime state or data migration exists.

### Allowed-path audit and line budget

- Final `git diff --name-only` reports only `.gitignore`, the unrelated tracked modification present at start; Git omits untracked paths from this command.
- Final `git status --short` retains that pre-existing `.gitignore` modification, `.session-doc.json`, and the pre-existing untracked OpenSpec change root, plus the new `dashboard/` and `test/dashboard/` roots.
- Worker-authored paths are exactly `dashboard/view-model.mjs`, `dashboard/render.mjs`, `test/dashboard/view-model.test.mjs`, `test/dashboard/render.test.mjs`, `apply-progress.md`, and Work Unit 1 checkbox changes in `tasks.md`; all are allowed.
- Authored additions + deletions: **357** — 297 final lines across the four new implementation/test files and `apply-progress.md`, plus 60 changed lines for 30 checkbox replacements in `tasks.md`.
- Budget result: **PASS** — 357 <= 400.

### Baseline resolution and final gate

- Separate baseline commit `5c95b853008cce82034d6fa2aa18f21882ae506d` changes only `test/migration.test.mjs` and is excluded from the dashboard slice count.
- The dashboard branch fast-forward preserved the exact before/after dirty and untracked set.
- The disclosed pre-fast-forward `bun test` invocation was read-only, expectedly failed on the old baseline, and caused no mutation.
- Fresh independent verification after the evidence edits:
  - `bun test test/dashboard/view-model.test.mjs` — **PASS**: 4 pass, 0 fail, 19 expect() calls, 1 file in 17ms.
  - `bun test test/dashboard/render.test.mjs` — **PASS**: 4 pass, 0 fail, 27 expect() calls, 1 file in 14ms.
  - `bun test` — **PASS**: 53 pass, 0 fail, 334 expect() calls, 53 tests across 5 files in 4.07s.
- Final Work Unit 1 status: **COMPLETE**.
- Corrected authored additions + deletions: **373** = prior 357 + 4 task-line replacement sides + 12 appended evidence lines; **PASS** — 373 <= 400.

## Work Unit 2 — Revocable Authentication Primitives

### Start state

- Expected and actual HEAD: `5c95b853008cce82034d6fa2aa18f21882ae506d`.
- Pre-unit status preserved the existing `.gitignore` modification and untracked `.session-doc.json`, Work Unit 1 files, and OpenSpec artifacts; `dashboard/auth.mjs` and `test/dashboard/auth.test.mjs` did not exist.
- Baseline `bun test`: **PASS** — 53 pass, 0 fail, 334 expect() calls, 53 tests across 5 files in 3.88s.

### Strict TDD evidence

- **RED:** Created `test/dashboard/auth.test.mjs` before the implementation module. `bun test test/dashboard/auth.test.mjs` exited 1 with `Cannot find module '../../dashboard/auth.mjs'`; 0 pass, 1 fail, 1 error, 1 file in 13ms.
- **GREEN:** Added the smallest fail-closed configuration, credential, HMAC session, injected clock/random/password-verifier, generic-failure, dummy-verification, revision, expiry, and disabled-auth primitives. Focused result: **PASS** — 4 pass, 0 fail, 26 expect() calls, 1 file in 28ms.
- **TRIANGULATE:** Added rotation, revocation, malformed token/signature length, exact-expiry, revision edge, and production dummy-verifier cases. A malformed Argon2id encoding first produced the expected focused failure: 6 pass, 1 fail, 36 expect() calls, 7 tests in 171ms. After strict PHC validation, focused result: **PASS** — 7 pass, 0 fail, 38 expect() calls, 1 file in 125ms.
- **REFACTOR:** N/A — configuration parsing, credential verification, and cookie responsibilities were already separated without a useful behavior-preserving extraction; no speculative abstraction was added.

### Verification

- Final `bun test test/dashboard/auth.test.mjs`: **PASS** — 7 pass, 0 fail, 39 expect() calls, 1 file in 143ms.
- Final `bun test`: **PASS** — 60 pass, 0 fail, 373 expect() calls, 60 tests across 6 files in 3.86s.
- Runtime harness: `N/A` — this unit has no HTTP boundary; clocks, randomness, and password verification are deterministic injected seams.
- Rollback boundary: remove only `dashboard/auth.mjs` and `test/dashboard/auth.test.mjs`, remove this Work Unit 2 evidence, and revert only Work Unit 2 checkbox replacements; no credentials, sessions, URLs, or persistent records are created.

### Preservation, path audit, and line budget

- Completed Work Unit 1 SHA-256 hashes remained unchanged: `ceb7d5ab...e16fe1` (`dashboard/view-model.mjs`), `752a1529...e4d4` (`dashboard/render.mjs`), `5229d4f...d2a8f` (`test/dashboard/view-model.test.mjs`), and `95f16f95...85ce4` (`test/dashboard/render.test.mjs`).
- Worker-authored paths are exactly `dashboard/auth.mjs`, `test/dashboard/auth.test.mjs`, this Work Unit 2 evidence in `apply-progress.md`, and Work Unit 2 checkbox replacements in `tasks.md`; all are allowed.
- Final status preserves all pre-existing dirty/untracked paths and adds only the two Work Unit 2 auth paths; HEAD remains `5c95b853008cce82034d6fa2aa18f21882ae506d`.
- Authored additions + deletions: **310** = 244 lines in the new auth module/test + 30 appended evidence lines + 36 replacement sides for 18 task checkboxes; limit result: **PASS** — 310 <= 400.
- Work Unit 2 status: **COMPLETE**.

### Security correction after fresh-context verification

- Verifier failure evidence: valid-length Argon2id hashes with `m=1,t=1,p=1` bypassed strength validation, and unparsed caller objects bypassed all parser invariants through an injected verifier.
- **RED:** `bun test test/dashboard/auth.test.mjs` — expected failure: 7 pass, 3 fail, 42 expect() calls, 10 tests in 214ms; weak parameters, arbitrary config, and public-secret mutation each reproduced its verified defect.
- **GREEN:** explicit Argon2id minimums (`m=19456,t=2,p=1`) plus a private WeakMap-branded, frozen, copy-isolated validated snapshot produced 10 pass, 0 fail, 45 expect() calls in 132ms.
- **TRIANGULATE:** durable table-driven coverage rejects empty, whitespace-only, numeric, null, and object-like usernames; production Argon2id verification and prior fail-closed/isolation cases remain covered.
- Final focused `bun test test/dashboard/auth.test.mjs`: **PASS** — 10 pass, 0 fail, 51 expect() calls, 1 file in 289ms.
- Final full `bun test`: **PASS** — 63 pass, 0 fail, 385 expect() calls, 63 tests across 6 files in 4.16s.
- Runtime harness: `N/A` — no HTTP/UI boundary exists; deterministic clock, randomness, and verifier seams cover this primitive.
- Preservation: HEAD is still `5c95b853008cce82034d6fa2aa18f21882ae506d`; all four recorded Work Unit 1 SHA-256 hashes remain unchanged.
- Allowed-path audit: correction edits are only `dashboard/auth.mjs`, `test/dashboard/auth.test.mjs`, and this Work Unit 2 evidence; `tasks.md` and all later units are unchanged.
- Corrected authored additions + deletions: **400** = prior 390 + 2 test lines + 8 evidence replacement sides; **PASS** — 400 <= 400.
- Corrected Work Unit 2 status: **COMPLETE**.

## Work Unit 3 — Guarded HTTP Surface and Auth Non-Disclosure

### Start state and strict TDD

- Expected/actual HEAD: `5c95b853008cce82034d6fa2aa18f21882ae506d`; baseline `bun test`: **PASS** — 63 pass, 0 fail, 385 expect() calls, 6 files in 4.07s.
- **RED:** Created `test/dashboard/server.test.mjs` first. Focused command exited 1 because `dashboard/server.mjs` did not exist: 0 pass, 1 fail, 1 error, 1 file in 15ms.
- **GREEN:** Added the minimum guarded router, loopback server, and fixture-free assets. Focused command: **PASS** — 6 pass, 0 fail, 130 expect() calls, 1 file in 163ms.
- **TRIANGULATE:** Added old/malformed/disabled sessions, malformed/duplicate/oversized/cross-origin forms, full route/method failures, loopback config bounds, protected factory/handler exceptions, non-disclosure, and headers. Focused command: **PASS** — 7 pass, 0 fail, 162 expect() calls, 1 file in 155ms.
- **REFACTOR:** Centralized runtime-harness factory/handler counting so authenticated success proves `1/1`, pre-auth/public/failure paths prove `0/0`, factory failure proves `1/0`, and handler failure proves `1/1`. Post-refactor focused result: **PASS** — 7 pass, 0 fail, 165 expect() calls, 1 file in 140ms.

### Final verification and runtime harness

- Final focused `bun test test/dashboard/server.test.mjs --test-name-pattern 'guard|auth|route|header|health'`: **PASS** — 7 pass, 0 fail, 165 expect() calls, 1 file in 140ms.
- Final `bun test`: **PASS** — 70 pass, 0 fail, 550 expect() calls, 70 tests across 7 files in 4.11s.
- Runtime harness: the focused suite started real isolated `Bun.serve` listeners on `127.0.0.1` with port `0`, sent HTTP requests, and stopped every server via the registered teardown; all 7 scenarios passed.
- Protected dependency evidence: all public, unauthenticated, invalid-login, malformed-input, revoked-session, disabled-auth, 404, and 405 paths remained factory/handler `0/0`; authenticated content reached `1/1`; protected factory/handler error containment reached `1/0` and `1/1` respectively without sentinel or stack disclosure.

### Rollback, preservation, and workload

- Rollback boundary: remove only `dashboard/app.mjs`, `dashboard/server.mjs`, `dashboard/public/dashboard.js`, `dashboard/public/styles.css`, `test/dashboard/server.test.mjs`, this Work Unit 3 evidence, and Work Unit 3 checkbox replacements; Work Units 1 and 2 remain inert and independently tested.
- All six completed dependency hashes remained unchanged: WU1 `ceb7d5ab...e16fe1`, `752a1529...e4d4`, `5229d4f...d2a8f`, `95f16f95...85ce4`; WU2 `a69e03d1...f55aeda`, `8f8c86cb...7549c3`.
- Allowed-path audit: WU3 authored only the five permitted implementation/test/asset paths plus this evidence and WU3 checkbox replacements. `.gitignore`, `.session-doc.json`, unrelated state, prior artifacts, and later-unit files remain untouched; HEAD is unchanged.
- Authored additions + deletions: **290** = 225 new implementation/test/asset lines + 25 progress lines + 40 replacement sides for 20 WU3 checkboxes; **PASS** — 290 <= 400.
- Work Unit 3 status: **COMPLETE**.

### Bun architecture correction after verifier findings

- Verifier findings: the Node HTTP/raw-request bridge violated the approved Bun 1.3 `Bun.serve` design, and numeric forwarded hosts such as `2130706433` canonicalized to an IP origin and bypassed the intended DNS-host validation.
- The prior encoded-dot/raw-path finding is superseded: the allowlist is defined over Bun's canonical standard `Request.url`; pre-normalization request-target spelling belongs to Bun/Caddy, so the raw-socket adapter and its spelling-only tests were removed without weakening canonical route or method checks.
- **RED:** `bun test test/dashboard/server.test.mjs --test-name-pattern 'architecture|proxy'` failed as expected against the Node adapter and numeric-host bypass: 0 pass, 2 fail, 18 expect() calls, 1 file in 69ms.
- **GREEN:** minimal `Bun.serve({ hostname, port, fetch })` plus canonicalized DNS-host validation made the same command pass: 2 pass, 0 fail, 46 expect() calls, 1 file in 45ms.
- **TRIANGULATE/REFACTOR:** valid `dashboard.example` and `dashboard.example:443` forwarding passes; decimal, shortened dotted, hexadecimal, malformed, and multi-valued hosts fail generically; the full server suite passes with the direct Bun server as the stoppable wrapper.
- Retained corrections: bounded streaming reads cancel before full buffering, protected returned 5xx bodies/headers are contained, direct loopback and validated Caddy origins work, protected headers/no-store/`Vary` remain, and routing/auth/source guard ordering remains intact.
- Final focused `bun test test/dashboard/server.test.mjs --test-name-pattern 'guard|auth|route|header|health'`: **PASS** — 9 pass, 0 fail, 229 expect() calls, 1 file in 193ms.
- Final `bun test`: **PASS** — 72 pass, 0 fail, 614 expect() calls, 72 tests across 7 files in 4.28s.
- Runtime proof: the suite started actual `Bun.serve` instances on `127.0.0.1:0`, executed HTTP requests, verified assigned ephemeral ports and `stop`, stopped every instance, and left no dashboard/test server process.
- Audit: no `node:http`, `node:stream`, `node:net`, raw-target adapter, source/mock behavior, or later-unit drift remains; correction paths are only `dashboard/app.mjs`, `dashboard/server.mjs`, `test/dashboard/server.test.mjs`, and this evidence; HEAD remains `5c95b853008cce82034d6fa2aa18f21882ae506d`.
- Final WU3 authored additions + deletions: **360** = 282 final implementation/test/asset lines + 38 WU3 progress lines + 40 task checkbox replacement sides; **PASS** — 360 <= 400. Final Work Unit 3 status: **COMPLETE**.

### DNS hostname-length final correction

- **RED:** `bun test test/dashboard/server.test.mjs --test-name-pattern 'forwarded DNS hostname length'` — expected **FAIL**: 0 pass, 1 fail, 5 expect() calls; the 255-character hostname returned 303 and invoked authentication.
- **GREEN:** the same command **PASS**: 1 pass, 0 fail, 10 expect() calls; the 253-character hostname with `:443` succeeds, while the 255-character hostname fails generically without another auth call.
- Final `bun test test/dashboard/server.test.mjs --test-name-pattern 'guard|auth|route|header|health'`: **PASS** — 10 pass, 0 fail, 239 expect() calls; final `bun test`: **PASS** — 73 pass, 0 fail, 624 expect() calls across 7 files.
- Audit: optional validated ports are excluded from the 253-character hostname limit; actual `Bun.serve` architecture, six prior hashes, allowed correction paths, exact HEAD, teardown, and no server residue remain verified.
- Final-state WU3 authored additions + deletions: **378** = 292 implementation/test/asset lines + 46 evidence lines + 40 replacement sides for 20 task checkboxes; **PASS** — 378 <= 400. Final Work Unit 3 status: **COMPLETE**.

## Work Unit 4 — Replaceable Mock Source and Explicit Presentation States

### Start state and strict TDD

- Expected/actual HEAD: `5c95b853008cce82034d6fa2aa18f21882ae506d`; baseline `bun test`: **PASS** — 73 pass, 0 fail, 624 expect() calls across 7 files in 4.42s.
- Baseline WU1/WU2 hashes: `ceb7d5ab8860ddf0779f9d4a76c771ba347494b3e76abbf5c9e33b28a3e16fe1`, `752a1529140bf604beecb04a3d2d801b791f6030ffeeacd1da104d606238e4d4`, `5229d4f222c7088f88d1f97e5f5d975cc8093b7f9de00fa798d75a77ab7d2a8f`, `95f16f95b499fe9737d995c00a072dcf17cd27456cdf89739f5f684d6bb85ce4`, `a69e03d1d25f0c83e275a6bde9304e623acaa9cb9c5096d60360cdbd0f55aeda`, `8f8c86cb87afac97cd0d8e21c4c50e6e3cf37c87ca268a56aa50716a4b7549c3`.
- Baseline WU3 hashes: `34fdf16d70c8321dbe2155284b028fcbc3203bccab7e5d59bedbeee6de11330e` (`app.mjs`), `068c4d63dba5453f4cc645d6792067a0ae471c848038e299c8acf7cb4b4d2fdd` (`server.mjs`), `3883597e1ea3139b6ccd5080a386b821861bad7d6e0d7ac989298a3c7abd24b8` (`dashboard.js`), `335028a6e49137af694e92e4b2f9b236cf93e3bddbaef0d987ec04776a10e021` (`styles.css`), and `bb647c97f8ae23497c59b8a5196b0af0fdebd1d7405cb88d095d27beddfee480` (`server.test.mjs`).
- **RED:** Before source files or behavior existed, the exact server command failed as expected: 0 pass, 4 fail, 5 expect() calls; missing loading semantics and source composition produced the failures. The exact architecture command failed as expected: 0 pass, 4 fail, 2 expect() calls; source modules, canonical composition, and public fetching were absent.
- **GREEN:** Added the minimum server-only fixtures, async `load()` source, guarded source-to-mapper-to-renderer composition, loading shell, and browser replacement. Exact focused results: server **PASS** — 4 pass, 0 fail, 48 expect() calls; architecture **PASS** — 4 pass, 0 fail, 26 expect() calls.
- **TRIANGULATE:** Covered multiple projects/agents, zero candidates, prohibited extras, delayed resolution, invalid candidates, and thrown source exceptions. Both exact focused commands remained green with the same 4/4 pass counts.
- **REFACTOR:** N/A — the minimal composition already keeps source construction after authentication and preserves the existing mapper/renderer boundaries; no speculative extraction was useful.

### Final verification and runtime harness

- `bun test test/dashboard/server.test.mjs --test-name-pattern 'loading|populated|empty|source|unavailable'`: **PASS** — 4 pass, 0 fail, 48 expect() calls, 1 file in 89ms.
- `bun test test/dashboard/architecture.test.mjs --test-name-pattern 'fixture|source|public asset'`: **PASS** — 4 pass, 0 fail, 26 expect() calls, 1 file in 19ms.
- `bun test`: **PASS** — 81 pass, 0 fail, 698 expect() calls across 8 files in 4.49s.
- Actual runtime harness used `Bun.serve` on `127.0.0.1:0`, disposable injected auth, and separate shell/content requests: login 303; shell 200 with `aria-busy=true`, no record values, source factory/load `0/0`; content 200 populated with all five values, source factory/load `1/1`; server stopped with no process residue. No credential value was recorded.

### Rollback, preservation, and workload

- Rollback boundary: remove only `dashboard/sources/`, revert WU4 changes in `dashboard/app.mjs`, `dashboard/server.mjs`, and `dashboard/public/dashboard.js`, remove WU4 cases from `test/dashboard/server.test.mjs`, remove `test/dashboard/architecture.test.mjs`, this evidence, and WU4 checkbox replacements. WU1-WU3 guarded authentication behavior remains.
- Preservation: all six WU1/WU2 hashes and WU3 `styles.css` hash remained exact; WU3 app/server/public-script/server-test paths changed only at their WU4 extension boundary. HEAD remains exact and no server process remains.
- Allowed WU4 paths are exactly seven implementation/test paths (including the two source files), this evidence, and WU4 checkbox replacements; unrelated `.gitignore`, `.session-doc.json`, prior artifacts, prohibited modules, styles, and later units remain untouched.
- Final WU4 authored additions + deletions: **221** = 156 implementation/test lines + 27 progress lines + 38 replacement sides for 19 task checkboxes; **PASS** — 221 <= 400.
- Work Unit 4 status: **COMPLETE**.
