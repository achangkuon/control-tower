# Tasks: VPS Observation Dashboard Skeleton

## 1. Apply Guardrails and Work-Unit Contract

### 1.1 Allowed edit boundaries

- [x] 1.1.1 Limit implementation edits to the exact application and test roots `dashboard/` and `test/dashboard/`.
- [x] 1.1.2 Limit planning/progress edits to these exact change artifacts: `openspec/changes/vps-observation-dashboard-skeleton/tasks.md`, `openspec/changes/vps-observation-dashboard-skeleton/apply-progress.md`, `openspec/changes/vps-observation-dashboard-skeleton/verify-report.md`, and `openspec/changes/vps-observation-dashboard-skeleton/session-handoff.md`.
- [x] 1.1.3 Treat `openspec/changes/vps-observation-dashboard-skeleton/proposal.md`, `openspec/changes/vps-observation-dashboard-skeleton/design.md`, and `openspec/changes/vps-observation-dashboard-skeleton/specs/observation-dashboard/spec.md` as read-only implementation inputs.
- [x] 1.1.4 Preserve all unrelated dirty and untracked files, including `.gitignore` and `.session-doc.json`; do not clean, reset, stage, or rewrite them.

### 1.2 Prohibited areas and effects

- [x] 1.2.1 Do not edit or import `core.mjs`, `mcp.mjs`, `bin/`, `plugin/`, existing tests outside `test/dashboard/`, Control Tower runtime files or databases, bot/Telegram code, or any `autonomous-continuation-control-tower` artifact.
- [x] 1.2.2 Do not add a real projection payload, laptop-to-VPS transport, persistence, freshness rules, P4-P6 semantics, command runner, approval path, mutation route, operational socket, repository write access, or Control Tower authority.
- [x] 1.2.3 Do not add framework, bundler, package-manager metadata, runtime database, third-party browser dependency, or generated assets.
- [x] 1.2.4 Do not commit credentials, hashes, session secrets, cookies, submitted passwords, usable environment values, fixture values in public assets, or production configuration.
- [x] 1.2.5 Do not automatically commit, push, create or retarget a PR, deploy to a real VPS, alter a production route, restart a production service, mutate production state, or execute rollback against a real host. Delivery remains a future user-approved boundary.

### 1.3 Evidence required for every work unit

- [x] 1.3.1 Record strict-TDD evidence in `apply-progress.md`: the failing RED assertion and result, the smallest GREEN change and result, the boundary case added during TRIANGULATE and result, and the REFACTOR performed or an explicit `N/A` reason.
- [x] 1.3.2 Record the focused command and exact result, then run and record the full `bun test` result before declaring the work unit complete.
- [x] 1.3.3 Record runtime-harness evidence when the unit crosses a running HTTP boundary; otherwise record `Runtime harness: N/A` with the unit-specific reason below.
- [x] 1.3.4 Record the exact rollback boundary independently of any commit or PR action.
- [x] 1.3.5 Recheck `git diff --name-only` after each unit and stop if any path falls outside the allowed boundaries.

## 2. Work Unit 1 — Five-Field View Model and Safe Renderer

**Dependencies:** Section 1 only.  
**Estimated authored changed lines:** 260-340.  
**Acceptance evidence:** Unit tests prove fresh-object allowlisting, grouping, empty and invalid behavior, HTML escaping, semantic project sections, readable state text, and absence of prohibited values.  
**Focused commands:** `bun test test/dashboard/view-model.test.mjs` and `bun test test/dashboard/render.test.mjs`.  
**Runtime harness:** N/A — this unit contains deterministic in-process mapping and rendering with no HTTP listener.  
**Rollback boundary:** Remove only `dashboard/view-model.mjs`, `dashboard/render.mjs`, `test/dashboard/view-model.test.mjs`, and `test/dashboard/render.test.mjs`; no runtime state or data migration exists.

### 2.1 RED — specify the disclosure and rendering boundaries

- [x] 2.1.1 Add a failing `test/dashboard/view-model.test.mjs` case for grouping multiple agents beneath `projectName` while projecting only `projectName`, `agentName`, `state`, `taskTitle`, and `branchName` into fresh objects.
- [x] 2.1.2 Add a failing boundary case whose source candidate contains file paths, line counts, test results, source snippets, diffs, secrets, identifiers, timestamps, and nested unexpected properties; assert every extra key and sentinel value is absent from the view model.
- [x] 2.1.3 Add failing cases for `{ kind: "empty" }` on no candidates and fail-closed rejection of non-string or missing required values without coercion or partial rendering.
- [x] 2.1.4 Add failing `test/dashboard/render.test.mjs` cases for semantic project grouping, exactly the five logical fields, explicit populated and empty views, and readable state text with a decorative marker that is not the only state cue.
- [x] 2.1.5 Add failing escaping cases for all five values using HTML metacharacters and script-like input; assert source strings cannot create executable markup or attributes.
- [x] 2.1.6 Run both focused commands and capture the expected RED failures before creating implementation modules.

### 2.2 GREEN — implement the smallest canonical seam

- [x] 2.2.1 Implement `dashboard/view-model.mjs` with explicit named reads, fresh objects, string validation, grouping by project name only, and no object spread from source candidates.
- [x] 2.2.2 Implement `dashboard/render.mjs` with one centralized HTML-escaping primitive and minimal populated and empty dashboard-content rendering.
- [x] 2.2.3 Keep structural keys such as `kind`, `projects`, and `agents` distinct from record data fields, and do not define state enums, ordering promises, identifiers, freshness, transport, persistence, or lifecycle semantics.
- [x] 2.2.4 Run both focused commands and capture the smallest GREEN result.

### 2.3 TRIANGULATE — challenge allowlisting and escaping

- [x] 2.3.1 Add a second project and repeated project names in non-contiguous candidate order; prove grouping does not rely on adjacency and each agent remains associated with the correct project.
- [x] 2.3.2 Add quotes, ampersands, angle brackets, Unicode, long branch names, and unexpected inherited properties; prove all permitted values remain readable while markup and extra properties remain inert.
- [x] 2.3.3 Prove a replacement candidate array with the same five-field shape renders without importing or referring to mock fixtures.
- [x] 2.3.4 Run both focused commands and capture the triangulated GREEN result.

### 2.4 REFACTOR and complete the unit

- [x] 2.4.1 Remove duplication only after the focused suites remain green; preserve the explicit allowlist and do not replace it with generic serialization, spreading, or reflective rendering.
- [x] 2.4.2 Run `bun test test/dashboard/view-model.test.mjs` and `bun test test/dashboard/render.test.mjs`; record exact pass counts/results.
- [x] 2.4.3 Run `bun test`; record the full result before marking Work Unit 1 complete.
- [x] 2.4.4 Record runtime-harness `N/A`, the rollback boundary, and the allowed-path diff check in `apply-progress.md`.

## 3. Work Unit 2 — Revocable Authentication Primitives

**Dependencies:** Section 1 only; it may be implemented independently of Work Unit 1.  
**Estimated authored changed lines:** 300-390.  
**Acceptance evidence:** Unit tests prove startup validation, generic login failure, fixed-size timing-safe username comparison, dummy password verification, signed-cookie integrity, expiry, eight-hour maximum lifetime, revision binding, disabled-auth fail-closed behavior, and rotation/revocation invalidation without URL input.  
**Focused command:** `bun test test/dashboard/auth.test.mjs`.  
**Runtime harness:** N/A — this unit tests injected clocks/randomness and authentication primitives without routing or source access.  
**Rollback boundary:** Remove only `dashboard/auth.mjs` and `test/dashboard/auth.test.mjs`; no credentials, sessions, or persistent records are created.

### 3.1 RED — specify credential and session behavior

- [x] 3.1.1 Add failing tests that reject missing or malformed username, Argon2id hash, auth revision, session secret shorter than 32 bytes, and plaintext configured passwords.
- [x] 3.1.2 Add failing tests for successful username/password verification and one generic failure result for wrong username, wrong password, malformed form values, or disabled authentication.
- [x] 3.1.3 Inject password verification and assert a valid dummy Argon2id hash is still verified when the username digest does not match; assert the submitted username and password never appear in returned errors or log events.
- [x] 3.1.4 Add failing tests for HMAC-signed cookies containing only format version, auth revision, expiry, and random nonce, with `Secure`, `HttpOnly`, `SameSite=Strict`, and `Path=/` attributes and no mock or operational data.
- [x] 3.1.5 Add failing tests for tampered, malformed, expired, over-eight-hour, wrong-revision, and disabled-auth cookies.
- [x] 3.1.6 Run the focused command and capture the expected RED failures before creating `dashboard/auth.mjs`.

### 3.2 GREEN — implement the smallest fail-closed auth module

- [x] 3.2.1 Implement strict external configuration parsing for `DASHBOARD_AUTH_USERNAME`, `DASHBOARD_AUTH_PASSWORD_HASH`, `DASHBOARD_AUTH_REVISION`, `DASHBOARD_SESSION_SECRET`, and `DASHBOARD_AUTH_DISABLED`; accept no plaintext password configuration.
- [x] 3.2.2 Implement fixed-size digest comparison for usernames, password verification with the valid dummy-hash path, and one generic authentication-failure result without logging credentials or submitted values.
- [x] 3.2.3 Implement short-lived HMAC signing and timing-safe verification using injected clock/random functions and the current revision and disabled flag.
- [x] 3.2.4 Run the focused command and capture the smallest GREEN result.

### 3.3 TRIANGULATE — prove revocation and rotation

- [x] 3.3.1 Add a prior-password/prior-cookie case, rotate password hash, session secret, and `DASHBOARD_AUTH_REVISION`, and prove the old pair and session fail while the replacement pair succeeds for the same unchanged URL input.
- [x] 3.3.2 Add revocation via `DASHBOARD_AUTH_DISABLED=true`; prove both login attempts and otherwise-valid existing cookies fail closed without replacement credentials.
- [x] 3.3.3 Add malformed encoding, signature-length mismatch, boundary expiry, and revision-string edge cases; assert failures remain generic and exception-free.
- [x] 3.3.4 Run the focused command and capture the triangulated GREEN result.

### 3.4 REFACTOR and complete the unit

- [x] 3.4.1 Separate configuration, credential verification, and cookie responsibilities only where it reduces coupling; retain injected test seams and fail-closed defaults.
- [x] 3.4.2 Run `bun test test/dashboard/auth.test.mjs`; record exact pass counts/results.
- [x] 3.4.3 Run `bun test`; record the full result before marking Work Unit 2 complete.
- [x] 3.4.4 Record runtime-harness `N/A`, the rollback boundary, and the allowed-path diff check in `apply-progress.md`.

## 4. Work Unit 3 — Guarded HTTP Surface and Auth Non-Disclosure

**Dependencies:** Work Units 1 and 2.  
**Estimated authored changed lines:** 330-400.  
**Acceptance evidence:** HTTP integration tests enumerate the complete route/method surface, prove authentication precedes source construction/invocation, prove public and failed responses contain no fixture sentinel, apply protected caching/security headers, and show auth rotation at the same URL.  
**Focused command:** `bun test test/dashboard/server.test.mjs --test-name-pattern 'guard|auth|route|header|health'`.  
**Runtime harness:** An isolated `Bun.serve` instance on an ephemeral loopback port, created and stopped by `server.test.mjs`, using generated test-only configuration and a source spy; record the command and exact result, not credential values.  
**Rollback boundary:** Remove only `dashboard/app.mjs`, `dashboard/server.mjs`, the initial fixture-free `dashboard/public/dashboard.js` and `dashboard/public/styles.css`, and the Work Unit 3 cases in `test/dashboard/server.test.mjs`; Units 1 and 2 remain inert and independently tested.

### 4.1 RED — specify the externally reachable boundary

- [x] 4.1.1 Add failing route-table tests for only `GET /login`, `POST /auth/login`, `GET /`, `GET /dashboard/content`, `GET /assets/dashboard.js`, `GET /assets/styles.css`, and `GET /healthz`; assert all other routes are `404` and unsupported methods are `405`.
- [x] 4.1.2 Add a unique protected sentinel and source-construction/invocation spies; assert unauthenticated `GET /`, unauthenticated `GET /dashboard/content`, invalid `POST /auth/login`, every public asset, `/healthz`, `404`, `405`, and generic server errors contain no protected value and never invoke the source.
- [x] 4.1.3 Add failing tests that unauthenticated `/` redirects to `/login`, unauthenticated content returns generic `401`, invalid login renders the explicit generic failure state, and valid login issues the secure session cookie.
- [x] 4.1.4 Add failing tests for the login body-size limit, exact expected form fields, same-origin submission, no stack traces, and no username/password distinction.
- [x] 4.1.5 Add failing tests for protected `Cache-Control: no-store`, `Vary: Cookie`, CSP, `X-Content-Type-Options`, `Referrer-Policy`, restrictive `Permissions-Policy`, and frame denial.
- [x] 4.1.6 Run the focused command and capture the expected RED failures before implementing the HTTP composition.

### 4.2 GREEN — implement the smallest guarded router

- [x] 4.2.1 Implement `dashboard/app.mjs` with route classification first, the auth guard second, and protected dependency construction only after successful authentication.
- [x] 4.2.2 Implement the login exchange as the only POST; keep it limited to browser authentication state and unable to reach any Control Tower or observed-project operation.
- [x] 4.2.3 Implement `dashboard/server.mjs` as the Bun entry point that validates configuration, binds only to configured loopback host/port defaults, injects dependencies, and refuses insecure startup.
- [x] 4.2.4 Add minimal fixture-free `dashboard/public/dashboard.js` and `dashboard/public/styles.css` responses so both declared asset routes work at this unit boundary; later units extend behavior and styling without changing the public route contract.
- [x] 4.2.5 Serve availability-only `/healthz`; keep errors generic and logs limited to outcome categories without query values, cookies, credentials, records, or response bodies.
- [x] 4.2.6 Run the focused command and capture the smallest GREEN result.

### 4.3 TRIANGULATE — exercise revoked sessions and route failures

- [x] 4.3.1 Recreate the app with a new auth revision and signing secret at the same request URL; prove the prior cookie fails before source construction and the replacement login reaches the authenticated shell.
- [x] 4.3.2 Exercise malformed cookies, disabled authentication, oversized and duplicate form fields, cross-origin form submissions, unknown routes, and unsupported methods; prove each stops before the source and discloses no sentinel.
- [x] 4.3.3 Force dependency and handler exceptions; prove responses contain neither stack traces nor fixture values and protected error responses remain non-cacheable.
- [x] 4.3.4 Run the focused command and capture the triangulated GREEN result.

### 4.4 REFACTOR and complete the unit

- [x] 4.4.1 Refactor route metadata or response helpers only while guard ordering remains explicit and source spies remain green.
- [x] 4.4.2 Run the focused command; record exact pass counts/results and the ephemeral loopback runtime-harness result.
- [x] 4.4.3 Run `bun test`; record the full result before marking Work Unit 3 complete.
- [x] 4.4.4 Record the rollback boundary and allowed-path diff check in `apply-progress.md`.

## 5. Work Unit 4 — Replaceable Mock Source and Explicit Presentation States

**Dependencies:** Work Unit 3.  
**Estimated authored changed lines:** 280-370.  
**Acceptance evidence:** Integration tests prove the renderer has no fixture import, source selection is injected, the loading shell does not resolve the source, a compatible replacement source preserves rendering, and populated, empty, authentication-failure, and generic unavailable states remain distinct and non-disclosing.  
**Focused commands:** `bun test test/dashboard/server.test.mjs --test-name-pattern 'loading|populated|empty|source|unavailable'` and `bun test test/dashboard/architecture.test.mjs --test-name-pattern 'fixture|source|public asset'`.  
**Runtime harness:** The isolated HTTP integration harness requests the authenticated shell and content fragment separately from an ephemeral loopback server; record source-spy call counts and response-state assertions.  
**Rollback boundary:** Remove only `dashboard/sources/`, revert the Work Unit 4 behavior added to `dashboard/public/dashboard.js` back to the fixture-free Work Unit 3 asset, revert the source/content composition added to `dashboard/app.mjs`, and remove the Work Unit 4 test cases; the guarded authentication surface remains.

### 5.1 RED — specify source replacement and all presentation states

- [x] 5.1.1 Add failing architecture tests that `dashboard/render.mjs` and public assets do not import or contain mock fixtures and that rendering receives only the canonical view model.
- [x] 5.1.2 Add failing HTTP tests that authenticated `GET /` renders an explicit `aria-busy="true"` loading shell without calling the source or fabricating record values.
- [x] 5.1.3 Add failing tests that authenticated content resolution renders populated project groups for representative records and an explicit empty state for no records.
- [x] 5.1.4 Inject a compatible replacement source and prove the same rendering path works without changes to record rendering or expansion beyond the five permitted fields.
- [x] 5.1.5 Add a failing source-exception case that renders generic unavailable copy, not the empty state, and discloses no record, stack trace, transport, persistence, freshness, lifecycle, or P4-P6 claim.
- [x] 5.1.6 Run both focused commands and capture the expected RED failures before adding source files or browser behavior.

### 5.2 GREEN — implement the smallest presentation-only source flow

- [x] 5.2.1 Implement `dashboard/sources/mock-source.mjs` behind a `load()` boundary and `dashboard/sources/mock-fixtures.mjs` with representative server-only examples containing only presentation examples, not protocol semantics.
- [x] 5.2.2 Compose `source -> buildDashboardViewModel -> renderDashboardContent` through injected dependencies after authentication; do not let the renderer import source modules or fixture files.
- [x] 5.2.3 Implement `dashboard/public/dashboard.js` to fetch `/dashboard/content` with same-origin credentials and replace only the loading region with the server-rendered fragment; embed no fixture constants and generate no record fields in the browser.
- [x] 5.2.4 Keep loading, empty, and unavailable copy presentation-only; do not imply network transport, persistence, freshness, runtime lifecycle, continuation, or P4-P6 behavior.
- [x] 5.2.5 Run both focused commands and capture the smallest GREEN result.

### 5.3 TRIANGULATE — challenge source shape and failure containment

- [x] 5.3.1 Provide a replacement source with the same five-field values plus prohibited sentinel properties; prove the mapper strips extras before rendering and public responses expose exactly the five logical data fields.
- [x] 5.3.2 Delay source resolution and prove loading remains visible until content resolves, without exposing candidate values in the initial shell or public JavaScript.
- [x] 5.3.3 Exercise zero projects, multiple projects, multiple agents, invalid candidates, and a thrown source error; prove empty, populated, fail-closed, and unavailable outcomes remain distinct.
- [x] 5.3.4 Run both focused commands and capture the triangulated GREEN result.

### 5.4 REFACTOR and complete the unit

- [x] 5.4.1 Refactor source composition only while dependency injection, fixture isolation, explicit states, and exact-field tests remain green.
- [x] 5.4.2 Run both focused commands; record exact results and runtime source-spy evidence.
- [x] 5.4.3 Run `bun test`; record the full result before marking Work Unit 4 complete.
- [x] 5.4.4 Record the rollback boundary and allowed-path diff check in `apply-progress.md`.

## 6. Work Unit 5 — Mobile-First Observation UI and Architecture Isolation

**Dependencies:** Work Unit 4.  
**Estimated authored changed lines:** 300-390.  
**Acceptance evidence:** CSS/HTML contract tests plus a manual 320 CSS pixel browser check prove a single-column project hierarchy, wrapping without horizontal scrolling, visible state text independent of color/glow, exactly five data fields, no action controls or desktop modules, and complete isolation from Control Tower/runtime artifacts.  
**Focused commands:** `bun test test/dashboard/render.test.mjs` and `bun test test/dashboard/architecture.test.mjs`.  
**Runtime harness:** Manual local browser verification at exactly 320 CSS pixels against the isolated loopback service; no automated browser E2E runner is configured. Record viewport, browser, result, and any screenshot path in `apply-progress.md`, but no credential value.  
**Rollback boundary:** Revert only the Work Unit 5 presentation rules in `dashboard/public/styles.css` back to the minimal fixture-free Work Unit 3 asset and remove the Work Unit 5 responsive/architecture assertions; source, auth, and HTTP behavior remain functional but intentionally minimally styled.

### 6.1 RED and characterization — specify new mobile behavior and preserve inherited invariants

- [x] 6.1.1 Add failing CSS contract tests for a mobile-first single-column baseline, safe page padding, no fixed content width, no desktop grid/table dependency, and `overflow-wrap: anywhere` for long task and branch values.
- [x] 6.1.2 Add renderer characterization assertions for the inherited readable order project heading -> agent name -> state -> task title -> branch name, semantic project sections, explicit labels, and state text plus a non-color cue.
- [x] 6.1.3 Add characterization absence checks for project counts, timestamps, paths, line counts, test results, source code, diffs, secrets, metrics, feeds, search, navigation rails, timelines, voice controls, commands, approvals, action controls, write forms, and additional operational modules.
- [x] 6.1.4 Add architecture regression tests that no file under `dashboard/` imports repository files outside `dashboard/`, including `core.mjs`, `mcp.mjs`, `bin/`, `plugin/`, bot/Telegram code, Tower runtime/database paths, real projection code, P4-P6 artifacts, or `autonomous-continuation-control-tower` artifacts.
- [x] 6.1.5 Add route-enumeration regression assertions that the authentication exchange is the only POST and no externally reachable operation can mutate, approve, command, or write operational state.
- [x] 6.1.6 Run both focused commands; capture the genuine CSS RED while recording inherited renderer, import-isolation, and route contracts as green characterization evidence before implementing final presentation styles.

### 6.2 GREEN — implement the smallest mobile-first visual language

- [x] 6.2.1 Implement `dashboard/public/styles.css` with near-black navy background, lighter navy project surfaces, cyan/teal accents, restrained localized glow, high-contrast body text, muted labels, and explicit state text.
- [x] 6.2.2 Keep the page and records single-column from 320 CSS pixels upward; use vertical label/value rows, wrapping long task and branch values instead of clipping or horizontal scrolling, and a readable maximum width at larger viewports.
- [x] 6.2.3 Keep glow decorative, avoid motion-dependent meaning, honor reduced-motion/accessibility preferences, and preserve state meaning when color and glow are ignored.
- [x] 6.2.4 Apply touch-target sizing only to login controls; add no authenticated action affordance or desktop command-center module.
- [x] 6.2.5 Run both focused commands and capture the smallest GREEN result.

### 6.3 TRIANGULATE — verify the 320 CSS pixel boundary manually

- [x] 6.3.1 Add long unbroken task and branch values, multiple projects, multiple agents, and multiple state strings; rerun the focused contract tests.
- [x] 6.3.2 Start only the isolated local loopback dashboard with generated disposable test configuration, authenticate locally, and set the browser viewport to exactly 320 CSS pixels; do not contact or mutate a real VPS.
- [x] 6.3.3 Manually verify and record that the page has no horizontal scroll; each agent is visibly inside the correct project; project name, agent name, state, task title, and branch name are all readable; long values wrap; state remains understandable without color/glow; and no extra data field, action, or desktop module appears.
- [x] 6.3.4 Manually inspect login failure, loading, populated, and empty states at the same viewport; record the browser/version, viewport, outcome, and screenshot/evidence location without recording credentials or protected cookie values.
- [x] 6.3.5 Run both focused commands and capture the triangulated GREEN result.

### 6.4 REFACTOR and complete the unit

- [x] 6.4.1 Consolidate visual tokens and selectors only while the 320-pixel behavior, semantic hierarchy, exact-field boundary, and architecture tests remain green.
- [x] 6.4.2 Run both focused commands; record exact pass counts/results and the manual runtime-harness evidence.
- [x] 6.4.3 Run `bun test`; record the full result before marking Work Unit 5 complete.
- [x] 6.4.4 Record the rollback boundary and allowed-path diff check in `apply-progress.md`.

## 7. Work Unit 6 — Self-Contained Deployment Examples and Rollback Procedure

**Dependencies:** Work Unit 5.  
**Estimated authored changed lines:** 220-310.  
**Acceptance evidence:** Architecture tests prove self-contained release contents, loopback Bun binding, secret-free environment-name examples, hardened systemd isolation, Caddy-only public HTTPS proxying, password-hash script behavior, and a documented immutable-release smoke/rollback sequence with no Control Tower access.  
**Focused command:** `bun test test/dashboard/architecture.test.mjs --test-name-pattern 'deploy|systemd|Caddy|environment|hash|rollback'`.  
**Runtime harness:** N/A during apply — no real VPS, systemd, Caddy, public route, certificate, production credential, or production service may be changed automatically. The future approved delivery boundary owns real-host evidence.  
**Rollback boundary:** Remove only `dashboard/scripts/hash-password.mjs` and `dashboard/deploy/`; the locally runnable dashboard and all prior behavior remain unchanged.

### 7.1 RED — specify deployability without production mutation

- [ ] 7.1.1 Add failing tests that `dashboard/scripts/hash-password.mjs` accepts a password through a non-logging operator input path, produces an Argon2id hash suitable for configuration, and never writes a plaintext password or usable credential into the repository.
- [ ] 7.1.2 Add failing tests for `dashboard/deploy/control-tower-dashboard.service`: dedicated unprivileged user, loopback Bun entry point, external environment file, restart policy, `NoNewPrivileges`, `PrivateTmp`, `ProtectHome`, read-only filesystem policy, and no Control Tower database, worktree, SSH key, or operational socket access.
- [ ] 7.1.3 Add failing tests for `dashboard/deploy/Caddyfile.example`: HTTPS/public boundary belongs to Caddy and reverse-proxies only to the loopback Bun listener without embedding credentials or protected values.
- [ ] 7.1.4 Add failing tests for `dashboard/deploy/dashboard.env.example`: variable names and safe comments only, including all five auth variables and loopback host/port names, with no usable hash, secret, password, cookie, hostname, or production value.
- [ ] 7.1.5 Add failing structural assertions for the immutable `releases/<release-id>/dashboard/` layout, external root-owned environment file, atomic `current` symlink, health/auth/content smoke sequence, and previous-release rollback without migration or Control Tower recovery.
- [ ] 7.1.6 Run the focused command and capture the expected RED failures before creating scripts or deployment examples.

### 7.2 GREEN — add the smallest operator-facing examples

- [ ] 7.2.1 Implement `dashboard/scripts/hash-password.mjs` using `Bun.password.hash` with Argon2id, no argument echoing, no credential persistence, and clear failure behavior.
- [ ] 7.2.2 Add the hardened systemd example that runs `/usr/bin/bun /opt/control-tower-dashboard/current/server.mjs` as an isolated user and exposes only the external root-owned environment file.
- [ ] 7.2.3 Add the Caddy example with a placeholder hostname and loopback reverse proxy, keeping authentication in Bun and Caddy as the only public listener.
- [ ] 7.2.4 Add the environment-name example with documentation placeholders only and no usable secrets or production values.
- [ ] 7.2.5 Document in the examples the future user-approved rollout boundary: copy a self-contained immutable release, verify privately, switch `current` atomically, restart, run smoke checks, and revert the symlink/restart if any check fails.
- [ ] 7.2.6 Run the focused command and capture the smallest GREEN result.

### 7.3 TRIANGULATE — prove smoke and rollback boundaries are complete

- [ ] 7.3.1 Add an architecture fixture for an attempted public Bun bind or environment file inside a release; prove the contract rejects both.
- [ ] 7.3.2 Verify the planned smoke checklist covers `/healthz`, unauthenticated `/` and content non-disclosure, invalid login non-disclosure, one authenticated loading-to-populated or empty path, old credential/cookie rejection after rotation, and unchanged dashboard URL.
- [ ] 7.3.3 Verify the rollback checklist restores only the previous dashboard release symlink and service process, requires no dashboard data migration, projection replay, queue repair, protocol downgrade, Tower database action, or P4-P6 recovery, and keeps credential revocation independent.
- [ ] 7.3.4 Mark every real-host smoke, service restart, route change, credential rotation, rollout, and rollback action as blocked on explicit future user approval.
- [ ] 7.3.5 Run the focused command and capture the triangulated GREEN result.

### 7.4 REFACTOR and complete the unit

- [ ] 7.4.1 Remove duplication from deployment comments only while tests retain explicit security, isolation, smoke, and rollback assertions.
- [ ] 7.4.2 Run the focused command; record exact pass counts/results.
- [ ] 7.4.3 Run `bun test`; record the full result before marking Work Unit 6 complete.
- [ ] 7.4.4 Record `Runtime harness: N/A` with the no-real-host reason, the rollback boundary, and the allowed-path diff check in `apply-progress.md`.

## 8. Integrated Verification and Delivery Boundary

**Dependencies:** Work Units 1-6.  
**Estimated authored changed lines:** 20-60 in change progress/verification artifacts only; no new application behavior.  
**Acceptance evidence:** Complete traceability matrix, clean allowed-path audit, full test result, local HTTP smoke evidence, manual 320 CSS pixel evidence, and explicit future delivery approval gate.  
**Focused commands:** all five dashboard test files individually.  
**Runtime harness:** Repeat the isolated loopback smoke only; real VPS evidence remains N/A until separately approved.  
**Rollback boundary:** Revert only verification/progress artifact updates; no application or runtime state changes are required.

### 8.1 Verify each contract independently

- [ ] 8.1.1 Run `bun test test/dashboard/auth.test.mjs` and record the exact result.
- [ ] 8.1.2 Run `bun test test/dashboard/view-model.test.mjs` and record the exact result.
- [ ] 8.1.3 Run `bun test test/dashboard/render.test.mjs` and record the exact result.
- [ ] 8.1.4 Run `bun test test/dashboard/server.test.mjs` and record the exact result.
- [ ] 8.1.5 Run `bun test test/dashboard/architecture.test.mjs` and record the exact result.
- [ ] 8.1.6 Run `bun test` and record the exact full-suite result; do not invent coverage, lint, format, build, or browser E2E commands because none are configured.

### 8.2 Verify traceability and isolation

- [ ] 8.2.1 Trace authenticated access, generic failure, guard-before-source non-disclosure, secure sessions, revocation, and rotation to auth and HTTP evidence.
- [ ] 8.2.2 Trace observation-only behavior, exact five-field allowlisting, extra-property removal, prohibited metadata absence, and escaping of all five values to view-model, renderer, route, and architecture evidence.
- [ ] 8.2.3 Trace populated, loading, authentication-failure, empty, and generic unavailable states to renderer and HTTP evidence without claiming future transport/runtime semantics.
- [ ] 8.2.4 Trace replaceable source behavior, fixture isolation, and the absence of payload, transport, persistence, freshness, and P4-P6 semantics to source-replacement and architecture evidence.
- [ ] 8.2.5 Trace project grouping, readable state text, dark navy/cyan visual treatment, no desktop modules, wrapping, and exact manual 320 CSS pixel verification to CSS/renderer tests and recorded browser evidence.
- [ ] 8.2.6 Trace VPS deployability, loopback-only Bun, Caddy/systemd examples, external revocable credentials, immutable release layout, smoke plan, and symlink rollback to deployment contract evidence.
- [ ] 8.2.7 Confirm `git diff --name-only` contains only allowed paths and that unrelated dirty files remain byte-for-byte untouched.

### 8.3 Preserve the delivery gate

- [ ] 8.3.1 Record the final authored additions plus deletions by work unit and confirm every proposed delivery slice remains at or below 400 lines; if any slice exceeds 400, split its behavior boundary before requesting delivery or require explicit maintainer `size:exception`.
- [ ] 8.3.2 Do not commit, push, create a PR, deploy, publish, rotate real credentials, restart a real service, or execute real rollback as part of apply or verify.
- [ ] 8.3.3 Present the verified work-unit boundaries and workload result to the user for a separate delivery and chain-strategy decision.

## 9. Dependency and Traceability Summary

### 9.1 Dependency order

```text
Section 1 guardrails
  ├── Work Unit 1: view model + renderer ─┐
  └── Work Unit 2: authentication ───────┴─> Work Unit 3: guarded HTTP
                                                -> Work Unit 4: source + states
                                                -> Work Unit 5: mobile UI + isolation
                                                -> Work Unit 6: deployment examples
                                                -> Integrated verification
```

- [ ] 9.1.1 Do not begin Work Unit 3 until Work Units 1 and 2 are green with full-suite evidence.
- [ ] 9.1.2 Complete Work Units 3-6 in order because each extends the prior externally observable boundary.
- [ ] 9.1.3 Keep tests with the behavior implemented in each work unit; do not create test-only or file-type-only delivery slices.

### 9.2 Requirement ownership

| Requirement | Primary work unit | Completion evidence |
|---|---:|---|
| Auth non-disclosure before source access | 3 | Source-spy HTTP tests and sentinel searches across public/failure responses |
| Credential revocation and rotation at unchanged URL | 2, 3 | Prior password/cookie rejection plus replacement success |
| Source allowlist and exact five fields | 1, 4 | Fresh-object mapper tests and prohibited-extra sentinel tests |
| Escaping all displayed values | 1 | Renderer metacharacter/script-like input tests |
| Observation-only route and authority boundary | 3, 5 | Route enumeration, method allowlist, no action controls, isolation tests |
| Populated, loading, auth-failure, empty, unavailable containment | 1, 3, 4 | Renderer and HTTP state tests |
| Replaceable source/view-model architecture | 1, 4 | Replacement-source integration and fixture-import checks |
| Mobile-first hierarchy and state without color alone | 5 | CSS/renderer contracts and manual 320 CSS pixel evidence |
| Dark navy/cyan restrained visual direction without desktop density | 5 | CSS contract and manual inspection |
| Control Tower and deferred-integration isolation | 5 | Import/path/route architecture tests |
| VPS deployment examples, smoke plan, and rollback | 6 | systemd/Caddy/env/script contracts and future delivery checklist |

## Review Workload Forecast

- `Estimated authored changed lines:` 1,710-2,260 additions plus deletions across implementation, tests, deployment examples, and progress evidence.
- `400-line budget risk:` High
- `Chained PRs recommended:` Yes
- `Proposed PR/work-unit slices:` Six behavior-complete slices, each targeted below 400 authored changed lines: (1) five-field view model and escaped renderer, 260-340; (2) revocable auth primitives, 300-390; (3) guarded HTTP and non-disclosure, 330-400; (4) replaceable source and explicit states, 280-370; (5) mobile UI and architecture isolation, 300-390; (6) deployment examples and rollback contract, 220-310. Integrated verification changes only progress artifacts. Because the slices are additive, inert until composed, and can pass `bun test` independently in dependency order, stacked-to-main is the initial recommendation; feature-branch-chain remains a valid alternative if the maintainer does not want incomplete dashboard slices landing on main. The chain strategy is a user decision.
- `Decision needed before apply:` Yes
- `Rationale:` The design requires security-sensitive authentication, guard-order integration tests, exact-field and escaping tests, responsive CSS, architecture contracts, and three deployment examples across roughly fifteen new files. A realistic implementation exceeds the stated 800-line overall review budget even though every proposed slice stays at or below the normal 400-line reviewer-load threshold. Before apply, the user must choose whether to accept the larger total change as a chained delivery, reduce the already specified scope through a planning revision, or explicitly revise the overall budget. No individual slice currently needs `size:exception`.
