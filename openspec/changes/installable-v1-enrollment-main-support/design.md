# Design: Installable V1 Enrollment, Main Resolution, and Local Support

## Authority and approach

This replaces prior designs and implements the preserved artifacts through bounded registry, layout, Support, and CLI adapters reusing `contracts/{validate,canonicalize}.mjs`. `core.mjs`, `mcp.mjs`, Main Store, lifecycle, migrations, runtime/Git state, and V2 remain outside.

## Architecture decisions

| Choice | Rejected | Rationale |
|---|---|---|
| Exact `project_id` + revision, then live Main rederivation | Alias/remote authority | Advisory identifiers cannot authorize. |
| Durable `O_CREAT|O_EXCL|O_NOFOLLOW` guard file is the sole cross-process serializer | `flock`, FFI, `libc.so.6`, timeout locks | Removes the publication/flock race and stays portable through Bun/Node flags. |
| Sealed fixed-ID read ports | Generic FS/Git/SQL executors | Mutation is unavailable and attributable. |
| Bun `{readonly:true,create:false}` plus verified `query_only` | `core.open()`, immutable claims | Uses the documented boundary without creating or migrating state. |

## Modules and APIs

```text
bin/torre -> installable/cli.mjs
  -> registry/index.mjs: enroll, resolveExact, rollback, recover
  -> layout/index.mjs: validateLayout, captureFilesystemManifest, captureGitManifest
  -> support/index.mjs: createSupportService(readPorts).report(resolveRequest)
```

`registry/store.mjs` owns CAS/transitions; `registry/recovery.mjs` owns replay; `layout/git-adapter.mjs` exposes fixed reads; Support has no writer. Contracts delegate to exact corrected-spec headings: `Requirement: Explicit capability boundary and CLI dispatch`; `Requirement: Exact enrollment and live Main resolution`; `Requirement: Fail-closed filesystem and Git layout validation`; `Requirement: Canonical records, ordering, serialization, and errors`; `Requirement: Canonical filesystem manifests`; `Requirement: Canonical Git manifest and read-only Git access`; `Requirement: Read trace and exact witness surfaces`; `Requirement: Documented Bun read-only SQLite contract`; `Requirement: Queue privacy and exact projection ordering`; `Requirement: Race, indeterminate, and mutation attribution semantics`; `Requirement: Durable owner-only guard, journal, CAS, and commit linearization`; `Requirement: Uncertain commit and proof-based crash recovery`; `Requirement: Concurrent rollback and deterministic failure states`; and `Requirement: Non-mutation success proof`. Schemas also delegate to exploration headings “Canonical Filesystem and Git Manifests”, “Read Trace and Authoritative Witness Surfaces”, and “Durable Owner-Only Registry Write and Rollback”.

## Guard state machine and durable flow

Guard absence is `FREE`; `O_CREAT|O_EXCL|O_NOFOLLOW` creation, payload write, file fsync, and directory fsync establishes `HELD`. On failed `O_EXCL`, a contender may only read the published guard identity no-follow: a proven-live owner returns `CT_REGISTRY_BUSY`; suspected stale/dead/invalid evidence returns `CT_REGISTRY_RECOVERY_REQUIRED`, with zero validation, modification, or cleanup.

Authorized recovery derives fixed `.guard-recovery-<published-guard-digest>` and exclusively creates/fsyncs a recovery guard there. This acquires the same guard protocol, not a second lock; only its winner validates liveness and guard/journal/temp evidence. After revalidating canonical bytes/inode, atomic `rename(recovery-guard, canonical-guard)` transfers ownership without absence; mismatch preserves evidence. Losers read only recovery identity. A crash leaves a recognized recovery guard requiring fresh authorization. Only exclusive create, no-follow reads, fsync, and rename are used—never `flock`, FFI, or libc.

The exact order is: durable guard; durable transaction journal; target temp write, file fsync, close; CAS reread; atomic target rename (linearization); directory fsync; durable rollback-journal finalization; guard removal; directory fsync. Rollback uses the same guard and exact target CAS (unlink linearizes restoration to absence). Pre-linearization failure proves unchanged source before cleanup. Every post-linearization failure is `CT_REGISTRY_COMMIT_UNCERTAIN`; recovery resolves only `current==source` or `current==target`, otherwise preserves evidence.

## Support, CLI, and errors

SQLite derives `<live-common-dir>/control-tower/tower.db`; absence creates nothing. Presence uses one deferred transaction, fixed queries, no retry/DDL/journal change, then closes. Surface order, DB/WAL/SHM witnesses, redaction, precedence, ordering, and traversal delegate above.

CLI routes `project-enroll`, `project-resolve`, `registry-rollback`, `registry-recover`, and `support-report`; excluded routes return `CT_V2_ONLY` before port construction. Success emits one JCS object plus LF on stdout, exit 0. Errors use `error_v1` from `Requirement: Canonical records, ordering, serialization, and errors`, stderr only: exit 2 input/V2, 3 busy/CAS/layout/drift, 4 uncertain/recovery, 5 Support observation.

## Strict TDD and threat matrix

Injected ports provide barriers at each write/fsync/CAS/rename/capture; temporary Git/SQLite/filesystem fixtures cover integration. RED precedes production for every scenario, crash window, concurrency outcome, forbidden operation, and error.

| Boundary | Applicability / safe failure | RED |
|---|---|---|
| Documentation-like paths | Applicable; inert bytes, never executed | Four named adversarial classes |
| Git repository selection | Applicable; fixed absolute cwd only | `git -C`, relative, foreign absolute |
| Commit state | Applicable; any dirt denies | staged, `commit -a` equivalent, empty index |
| Push state | N/A; no push/ref API | None |
| PR commands | N/A; no PR automation | None |

## Scope seal and forecast

This reset changes only this file and Engram. Future allowlist: `bin/torre`; `installable/{canonical,cli}.mjs`; `registry/{index,path,model,store,recovery,resolve}.mjs`; `layout/{index,model,git-adapter,validate}.mjs`; `support/{index,read-trace,fs-adapter,filesystem-manifest,git-adapter,sqlite-schema-v1,sqlite-adapter,projections,witness,report}.mjs`; matching `test/{registry,layout,support,cli}/`; and this change’s `tasks.md`, `verify-report.md`, `state.yaml`. Everything else is sealed.

Unnumbered one-PR Sesión forecasts: canonical/layout 390; exact resolution/Git 390; guard/journal 400; rollback/recovery 400; filesystem manifests 400; Git manifests/trace 390; SQLite schema 400; SQLite adapter/projections 400; witness 380; report 380; CLI 300; integration fault matrix 400. Arithmetic: `390+390+400+400+400+390+400+400+380+380+300+400=4,630`; maximum 400, therefore every Sesión is `<=800` and no ID is assigned here.

No migration or open question.
