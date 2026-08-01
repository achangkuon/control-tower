# Design: Installable V1 / Autonomous V2 Split

## Technical Approach

Build additive ESM modules around unchanged `core.mjs`/`mcp.mjs`, with thin entry points. Publish revisioned ArtifactRefs/manifests; historical PRD/RFC/REQUIREMENTS, A–I, and P6–P11 bytes remain immutable. V2 consumes released V1 contracts, never V1 command paths.

## Architecture Decisions

| Option | Tradeoff | Decision and rationale |
|---|---|---|
| Rewrite broad V1 | Simpler naming; destroys provenance | Reject. Add V1/V2 revisions and relationship mapping. |
| Extend `core.mjs` for install concerns | Fewer files; collides with P7/P8 | Reject. New lifecycle, registry, adapter, Support, Hermes, and service seams call narrow read/write ports. |
| Mutable runtime checkout | Easy update; unrecoverable drift | Reject. Install immutable `versions/<version>` and atomically replace an `active.json` pointer after validation. |
| One universal host editor | Less code; unsafe config assumptions | Reject. Per-host `probe → plan → apply → verify → revert` adapters and a shared transaction journal. |
| Instruction-only Support safety | Portable; forgeable authority | Reject. Use host-enforced denial and a read-only snapshot port; expose no writer tools. |
| Hermes as executor | Convenient remote control; hidden authority | Reject. It is an optional allowlisted, replay-safe broker for status, arm/disarm, and opaque intent to explicit project Main. |

## Data Flow and Contracts

```text
release manifest -> staged version -> diagnose -> atomic active pointer
                                      `-> host config journal -> verify/revert
projects.yaml -> realpath/Git/layout validator -> Main + Worktrees inventory
Support -> read-only snapshot -> brief                    (no Tower writer)
Hermes -> allowlist/replay -> project+registry revision -> bounded Main intent
```

Runtime defaults are `${XDG_DATA_HOME}/control-tower/versions/<version>`, `${XDG_CONFIG_HOME}/control-tower/{config,projects}.yaml`, and `${XDG_STATE_HOME}/control-tower/{install-journal,audit}/`; project DB/history stays under its Git common directory. Registry writes use `0600`, parent `0700`, and temp-file/fsync/rename. Layout validation resolves symlinks, Git common-dir, remote, branch, ownership, dirty state, `Main/`, and `Worktrees/`; it creates missing empty containers only after approval, never relocates, resets, cleans, stashes, recycles, or replaces.

V1 workers are manually prepared and launched. Every V1 automation request returns `CT_V2_ONLY`. V2 may provision/launch only after resolving released V1 ArtifactRefs. Its revised graph is `P6→P7→P8→P10→P11`, optional `P7→P9`; `A→B→C→D→E`, with `P6→D`, `P7/P8→E`, `A/B/D→F`, `A/C/D/E/F→G`, `B/D/F/G→H`, and `P11/H→I`. V2 Hermes presentation stays separate from per-project Main, Support, and separately authorized F/E execution.

## File Changes and Ordered Implementation Topology

| Order / owner | Files | Purpose / checkpoint |
|---|---|---|
| 0 Provenance | `openspec/plans/{master-index.md,manifest.yaml,product-version-map.yaml}`, new V1/V2 plan manifests | Single owner publishes matching revisions/digests/dependencies; rollback restores prior pointers only. |
| 1 Release | `install.sh`, `bin/torre`, new `install/*.mjs`, `scripts/publish-runtime.mjs` | Lifecycle commands; preserve legacy config and DB. |
| 2 Enrollment | new `registry/*.mjs`, `layout/*.mjs` | Multi-project isolation and fail-closed scaffold plans. |
| 3 Hosts | new `adapters/{contract,opencode,pi,claude}/*` | Optional probes/config transactions; checkpoint before plugin or P7/P8 edits. |
| 4 Support | new `support/{manifest,agent,snapshot}.mjs` | Repository-owned package; SQLite read-only/query-only and non-locking Git inspection. |
| 5 Hermes | new `adapters/hermes/*.mjs` | Handoff to upstream Hermes setup; bounded broker, allowlist, dedupe, audit; reject shell, Git, merge, worker selection/launch. |
| 6 Services | new `services/{systemd,launchd}/*` | User-service install/remove/status adapters; no daemon authority expansion. |
| 7 Conformance | new `test/{install,registry,host-adapters,support,hermes,services,release}*` | Clean Linux, WSL/systemd, macOS/launchd and host rollback. |
| 8 V2 mapping | new V2 revision/mapping artifacts only | Preserve A–I/P6–P11 history and record exact V1 release dependencies. |

Orders 1–6 can use separate owners after order 0; shared-file edits serialize at pre-edit and integration checkpoints. Each row is an auto-forecast PR slice; aggregate review risk is high despite the 1,000-line budget.

## Testing, Security, and Observability

Strict TDD covers parsers, transactions, denial, replay, and graph validation; integration uses temporary homes/repos and injected `execFile` ports. Clean-machine jobs prove idempotence, interrupted-upgrade recovery, uninstall preservation, services, and host matrices. JSON audit records operation, version, project/revision, adapter, decision, and rollback—never secrets or bearer material.

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and planned RED |
|---|---|---|
| Documentation-like paths | Applicable | Release manifest allowlists executable paths/modes; reject `requirements.txt`, `CMakeLists.txt`, executable MD/MDX, `README.sh`. RED per class. |
| Git repository selection | Applicable | Use argument-array Git with canonical cwd; reject injected `git -C`, escaping relative, mismatched absolute roots. RED for all selectors. |
| Commit state | N/A: V1 performs no commit | `CT_V2_ONLY`; no task. |
| Push state | N/A: V1 performs no push | `CT_V2_ONLY`; no task. |
| PR commands | N/A: V1 performs no PR operation | `CT_V2_ONLY`; no task. |

## Migration / Rollout

Ship provenance first, then lifecycle/enrollment, optional integrations, services, and conformance. Upgrade imports the checkout installer only through a verified backup journal; failed validation reverts host configs and leaves the old pointer active. Uninstall removes owned links/services/integrations while retaining backups, registry, audit, and Tower history.

## Open Questions

None blocking; supported OS/host version ranges belong in the release matrix before publication.
