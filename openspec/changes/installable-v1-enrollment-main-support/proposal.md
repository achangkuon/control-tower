# Proposal: Installable V1 Enrollment, Main Resolution, and Local Support

> **Planning status:** Unnumbered P8 candidate. Preserve `installable-v1-autonomous-v2-split` unchanged.

## Intent

Enable owner-local enrollment, exact Main resolution, and Support analysis without hidden authority.

## Scope

### In Scope
- Owner-local atomic enrollment; exact `project_id`/revision resolution; live Main rederivation; fail-closed `Main/`/`Worktrees/` validation.
- Read-only filesystem/Git/SQLite Support and `bin/torre` enrollment, resolution, and diagnostics.
- Permanent canonical `project-registry.json.guard` inode plus a versioned native helper holding its kernel advisory lock for the entire mutation-worker lifetime.
- Packaged Linux glibc, Linux musl, and macOS helpers; WSL only with verified local-filesystem semantics.
- Helper distribution/versioning, integrity/ABI compatibility verification, and deterministic platform/filesystem diagnostic outcomes.

### Non-Goals

Excluded: Telegram/Hermes; P2; shared/release docs; runtime autonomy; Policy/jornadas; execution resources; Git/DB mutation; Tower locks/queues/delivery/merge; `core.mjs`, `mcp.mjs`, Main Store, lifecycle, and migrations. Also excluded: manual stale-lock `RECOVERY_REQUIRED`, SQLite guard identity, native Windows, NFS, SMB/CIFS, DrvFS, and unverified filesystems.

## Capabilities

### New Capabilities
- `installable-v1-enrollment-main-support`: enrollment, exact Main, safe layout, read-only Support, and lock diagnostics.

### Modified Capabilities
- None. Parent contracts remain historical scope.

## Normative Approach

Create the owner-only guard once; never unlink, rename, or replace it. An integrity-verified helper acquires the advisory lock and retains it with the mutation worker until exit. Lock acquisition linearizes compliant ownership; target rename linearizes commit. Journal/CAS recovery proves source or target under that lock, including post-rename uncertainty. Preflight verifies helper identity/version/ABI and filesystem semantics; other outcomes deny before mutation.

## Impact and Dependencies

| Area | Impact |
|---|---|
| `registry/`, helper package | Guard, recovery, build/distribution/version contract |
| `layout/`, `support/`, `bin/torre` | Bounded behavior plus diagnostics |
| `test/{registry,layout,support,cli}/` | Platform, integrity, crash, and non-mutation evidence |

Dependencies: S8.2/registry prerequisites, reproducible target builds, release manifest/checksums, compatibility policy, and filesystem classification. Candidate remains unnumbered.

## Risks

| Risk | Mitigation |
|---|---|
| Wrong/tampered helper | Verified manifest and exact rejection |
| Emulated/remote locks | Verified allowlist; fail closed otherwise |
| Premature helper exit | Lifetime coupling; stop mutation on lock loss |
| Cooperative lock boundary | Document compliant writers; deny unsafe external change |

## Rollback

Withdraw helper/CLI distribution; restore bytes only from proven journal/CAS state. Preserve the guard inode and uncertain evidence; never delete stale locks.

## Success Criteria

- [ ] Supported targets mutate only while the verified helper holds the canonical inode lock.
- [ ] Denied platforms/filesystems return deterministic diagnostics before mutation.
- [ ] Missing, incompatible, or integrity-invalid helpers fail closed.
- [ ] Crashes and post-rename uncertainty resolve automatically by source/target proof under the same lock, without manual stale-lock recovery.
- [ ] Enrollment/Main/Support create no Git, Tower DB, worker, Tower-lock, queue, or delivery effects.

## Unresolved Decisions

None.
