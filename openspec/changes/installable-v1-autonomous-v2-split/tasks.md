# Tasks: Installable V1 / Autonomous V2 Split

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,800–2,600 aggregate; each slice <=1,000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 provenance → PR 2 lifecycle → PR 3 enrollment/hosts → PR 4 Support/Hermes/services → PR 5 conformance/V2 mapping |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Canonical V1/V2 provenance surfaces | PR 1 | `bun test test/provenance` | N/A: planning-only; validate manifests and digests | Revert `openspec/plans/{master-index.md,manifest.yaml,product-version-map.yaml}` and new revision manifests |
| 2 | Versioned lifecycle and legacy migration | PR 2 | `bun test test/install` | Temp XDG homes/repos: install→failed upgrade→rollback→uninstall | Revert `install.sh`, `bin/torre`, `install/*`, `scripts/publish-runtime.mjs` |
| 3 | Enrollment, layout, and optional hosts | PR 3 | `bun test test/registry test/layout test/host-adapters` | Two temp repos plus unsafe symlink/remote fixtures | Revert `registry/*`, `layout/*`, `adapters/{contract,opencode,pi,claude}/*` |
| 4 | Read-only Support, bounded Hermes, services | PR 4 | `bun test test/support test/hermes test/services` | Mock host configs and Hermes denial/replay scenarios | Revert `support/*`, `adapters/hermes/*`, `services/{systemd,launchd}/*` |
| 5 | Clean-machine conformance and V2 mapping | PR 5 | `bun test test/release` | Linux/WSL systemd and macOS launchd matrix | Revert `test/{install,registry,host-adapters,support,hermes,services,release}*` and V2 mapping artifacts |

## Phase 1: Provenance and Ownership

- [x] 1.1 RED: add `test/provenance/*` for documentation-like executable-path classes (`requirements.txt`, `CMakeLists.txt`, executable MD/MDX, `README.sh`), Git `-C`, escaping relative, mismatched absolute roots, digest mismatch, canonical consistency/rollback, and shared-file conflict.
- [x] 1.2 GREEN: update `openspec/plans/master-index.md`, `manifest.yaml`, `product-version-map.yaml`, and V1/V2 revision manifests with ArtifactRefs, owners, checkpoints, dependencies, and release lane; never rewrite historical bytes.
- [x] 1.3 REFACTOR: normalize raw-byte digests, relationship fields, and atomic pointer rollback; serialize this shared surface with Autonomous V2.

## Phase 2: Lifecycle and Enrollment

- [ ] 2.1 RED→GREEN→REFACTOR: in `test/install/*`, then `install.sh`, `bin/torre`, `install/*.mjs`, and `scripts/publish-runtime.mjs`, prove immutable versions, active-pointer rollback, idempotence, preservation, and `CT_V2_ONLY`; keep `package.json`, `bun.lock`, `core.mjs`, and `mcp.mjs` untouched.
- [ ] 2.2 RED→GREEN→REFACTOR: in `test/{registry,layout}/*`, then `registry/*.mjs` and `layout/*.mjs`, prove project isolation, realpath/Git validation, safe empty scaffolds, and fail-closed non-destructive behavior.

## Phase 3: Integrations and Authority

- [ ] 3.1 RED→GREEN→REFACTOR: add host denial/transaction tests, then `adapters/{contract,opencode,pi,claude}/*`, covering probe→plan→apply→verify→revert and absent optional hosts.
- [ ] 3.2 RED→GREEN→REFACTOR: add Support/Hermes tests before `support/{manifest,agent,snapshot}.mjs` and `adapters/hermes/*.mjs`; enforce read-only snapshots, allowlist/replay safety, explicit Main routing, and rejection of shell/worker/Git/merge authority.
- [ ] 3.3 RED→GREEN→REFACTOR: add service tests before `services/{systemd,launchd}/*`; preserve user-service boundaries and no daemon authority expansion.

## Phase 4: Conformance and Handoff

- [ ] 4.1 RED→GREEN→REFACTOR: add `test/{install,registry,host-adapters,support,hermes,services,release}*` clean-machine, interruption, rollback, preservation, and host-matrix evidence; run `bun test` with Tower OFF.
- [ ] 4.2 Publish only new V2 revision/mapping artifacts after V1 release refs are stable; map A–I/P6–P11 with preserved/superseded/migrated relationships and record the external V2 ownership of `package.json`/`bun.lock`.
