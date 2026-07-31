# P8 Recovery Protocol Exploration

## Result Contract

**Status: BLOCKED.** The current one-guard policy is not safe as written. A
portable `O_CREAT|O_EXCL` file protocol cannot both (a) reclaim a stale
canonical pathname automatically and (b) prove that no previous owner can
still commit. The failed design's second recovery guard does not repair that
impossibility; it adds another serializer and can itself strand ownership.

The strongest invariant-closing candidate is a **permanent canonical guard
file plus a kernel advisory lock held through a small native lock helper**.
That candidate is not yet a normative recommendation because the proposal
does not decide its supported platform/filesystem envelope or accept a native
helper and operation-subprocess boundary. Until that policy is decided, do
not regenerate spec/design/tasks or implement recovery.

### Exact policy decision required

Choose one of these mutually exclusive contracts:

1. **POSIX local-filesystem contract (recommended candidate):** accept a
   native helper and support Linux (glibc/musl), macOS, and WSL only on a
   filesystem whose advisory-lock semantics are verified; unsupported native
   Windows, NFS, SMB/CIFS, and unverified WSL/DrvFS return a deterministic
   capability error. The canonical guard is permanent and is never removed or
   replaced.
2. **SQLite guard contract:** revise the proposal so the canonical guard
   identity is a SQLite control database/row rather than the exact JSON guard
   payload. This changes the artifact identity and introduces SQLite journal
   files and a database dependency.
3. **Relax automatic recovery:** retain portable filesystem primitives but
   explicitly accept `RECOVERY_REQUIRED`/manual intervention after an owner
   crash. This is rejected by the request and is not a valid unblock here.

No contract is closed until option 1 or option 2 is explicitly authorized.

## Current State and Evidence

- `registry/store.mjs` currently creates an ephemeral `${registryPath}.lock`
  with `O_CREAT|O_EXCL`, polls until timeout, then closes and unlinks it.
  It has no stale-owner protocol and no crash journal.
- `architecture-reset-exploration.md` and the corrected spec make
  `project-registry.json.guard` the sole serializer, require owner identity,
  journal/CAS recovery, and classify every post-rename failure as uncertain.
  The corrected `design.md` then introduced a deterministic
  `.guard-recovery-*` object, contradicting that sole-guard invariant.
- Bun's current SQLite documentation supports `new Database(path,
  {readonly:true})` and `create:false`; it does not provide a documented
  advisory-lock API. Bun's Node-compatible `fs.openSync` exposes ordinary
  platform flags, including `O_EXCL` and platform-conditional `O_NOFOLLOW`.
- Node's official `fs` API documents open/close/fsync/rename/link primitives,
  but no `flock(2)` or `fcntl(2)` binding. `child_process.spawn` is stable,
  so a fixed native helper can be supervised without a shell.
- Linux `flock(2)` locks are tied to an open file description and are released
  when all descriptors close; `fcntl` record locks are also released at
  process termination, while OFD locks are Linux-specific. Linux
  `renameat2(RENAME_NOREPLACE)` is atomic create-only, not conditional
  replacement. `RENAME_EXCHANGE` swaps names but does not stop an old owner
  holding an open descriptor.

Evidence: `registry/store.mjs`, `architecture-reset-exploration.md`, the
corrected `spec.md` and `design.md`; Bun docs
(`github.com/oven-sh/bun/blob/main/docs/runtime/sqlite.mdx` and
`src/js/node/fs.ts`); Node docs (`nodejs.org/api/fs.html`,
`nodejs.org/api/child_process.html`); Linux man pages `flock(2)`,
`fcntl_locking(2)`, and `rename(2)`.

## Invariants

The protocol must preserve all of these, not merely atomic target bytes:

| ID | Required invariant | Consequence |
|---|---|---|
| I1 | At most one compliant writer owns the canonical guard at a time. | No gap, replacement, or second recovery serializer may exist. |
| I2 | A crash cannot leave a live owner indistinguishable from a reclaimable owner. | PID/boot evidence is diagnostic only unless an atomic ownership primitive fences the old owner. |
| I3 | A new owner cannot commit after observing stale evidence while the old owner can still commit. | Every takeover must linearize against the old owner's final mutation. |
| I4 | Target rename is the only registry commit linearization point. | Before it, source bytes remain; after it, result is target or uncertain. |
| I5 | Recovery is deterministic and automatic after a crash. | It may inspect source/target journal state, but may not guess or require stale-file deletion. |
| I6 | Guard identity is one canonical path/inode and is protected from symlink/path substitution. | The guard must not be renamed, unlinked, or replaced during normal operation. |
| I7 | Durable evidence survives power loss classification. | Guard/journal initialization and directory fsync failures cannot be reported as ordinary aborts without proof. |

## Alternatives Matrix

| Alternative | Linearization and crash window | Stale detection / contender behavior | ABA, fencing, durability | Portability, dependencies, security | Verdict |
|---|---|---|---|---|---|
| `O_EXCL`, no takeover | Successful create is ownership linearization; crash leaves the pathname forever. | Existing guard is always busy/unknown; no stale recovery. | No ABA, but liveness fails after crash. | Bun/Node flags are portable enough; `O_NOFOLLOW`, owner/mode checks, and directory fsync still apply. | Safe safety-only primitive; fails automatic recovery. |
| `O_EXCL` + unlink/recreate | `unlink` and later `open(O_EXCL)` are separate linearization points. | A observes dead, unlinks; B creates; A creates/replaces based on old observation. | ABA and split-brain ownership; PID start markers do not fence the interval. | Portable pathname operations, but unsafe even on local ext4/APFS. | Reject. |
| `O_EXCL` + rename takeover | Rename atomically replaces the pathname, but not an old owner's open fd or already-running operation. | A can replace a live owner's guard after a racy liveness check; old owner can still rename target. | Path/inode ABA; no fencing of old writer. | `rename` is broadly portable, but `O_NOFOLLOW` does not make replacement conditional. | Reject. |
| Hard-link CAS | `link(existing, fixed-takeover)` atomically creates one marker only when marker is absent. | It does not transfer canonical ownership; unlink/relink reintroduces a gap. Multiple names can reference one inode. | Link count is not an ownership epoch; old fd remains valid. | POSIX-ish but Windows and network FS vary; requires `link` and directory fsync. | Reject. |
| Lock directory (`mkdir`) | `mkdir` is atomic create; stale `rmdir` then `mkdir` has the same gap as unlink/recreate. | A stale check can race B's create; rename of directories cannot conditionally replace a non-empty lock. | No fencing; residue can deadlock or be double-owned. | Portable local POSIX, but same impossibility and symlink/permission checks. | Reject. |
| Linux `renameat2` / `linkat` CAS | `RENAME_NOREPLACE`/`linkat` are atomic create-only. `RENAME_EXCHANGE` atomically swaps names. | Create-only cannot take over. Exchange moves the old guard while its owner may continue through an fd. | Linux syscall does not fence old owner or make target rename transactional. | Linux-only; syscall/native helper required; filesystem support varies; no portable macOS/Windows adapter with same semantics. | Useful adapter primitive, not a complete contract. |
| Kernel advisory lock on permanent guard | Successful `flock(LOCK_EX)` (or an equivalent supported lock) is ownership linearization; target `rename` remains commit linearization. Lock release on fd/process death closes the crash window. | Nonblocking contender gets BUSY; after crash, kernel releases lock and the next contender automatically recovers journal state. No stale deletion. | Permanent inode prevents guard ABA. Journal target/source CAS prevents stale rollback; lock fences compliant writers. | Linux glibc/musl and macOS have `flock(2)`; WSL works on Linux-backed local FS. Node/Bun require native helper or subprocess wrapper. NFS/SMB and DrvFS semantics must be excluded or verified. | **Only candidate that closes I1–I7, subject to platform/helper decision.** |
| SQLite transactional guard | `BEGIN IMMEDIATE`/write transaction lock is ownership linearization; crash rolls back/releases kernel locks. | Contender gets busy; no PID stale detection. Recovery can inspect journal in a later transaction. | SQLite transaction epoch can fence row updates, but not a separate JSON rename; cross-file commit remains uncertain. | Bun built-in; Node/Bun version/dependency scope differs. Guard path becomes a DB, with journal/WAL sidecars and schema. | Viable only after proposal identity is revised; currently violates exact guard payload. |
| Lease/fencing token | Lease write/expiry is linearized only if backed by an atomic takeover primitive. | Clock expiry, suspend, PID reuse, and two expired readers permit concurrent owners. | Epoch/token helps only when every target mutation atomically validates it; JSON rename cannot do that. | Portable metadata, but requires advisory lock, SQLite, or another CAS beneath it. | Not a primitive; layering it on O_EXCL does not fix safety. |

## Detailed Proofs and Counterexamples

### Filesystem stale takeover is impossible under the stated primitives

Assume an existing canonical guard `G`, owner A, and contenders B/C.

1. A creates `G` exclusively and starts a target update.
2. A pauses after its last liveness heartbeat but before target `rename`.
3. B reads A's boot/PID/start tuple and concludes A is dead (or the tuple is
   not observable). No portable filesystem operation can atomically combine
   that observation with replacement of `G` while preserving A's authority.
4. If B unlinks `G`, C can create a new `G` before B recreates it. B and C
   now both own the logical guard.
5. If B renames a takeover file over `G`, A's already-open fd and in-flight
   operation remain valid. A can still rename the registry after B's takeover.
6. If B creates a hard-link marker or lock directory, ownership has not
   transferred; any cleanup/recreate step repeats step 4.

Therefore a stale predicate plus separate pathname mutation cannot establish
I1 or I3. PID liveness, boot IDs, start markers, mtime, and leases reduce false
stale observations but do not supply the missing atomic fence. This is an
impossibility result for the required portable O_EXCL family, not an
implementation defect.

### Advisory-lock candidate proof

Revise the canonical guard to a permanent owner-only regular file. Create it
once with `O_CREAT|O_EXCL|O_NOFOLLOW`, normalize mode, fsync the file and
parent, and never unlink/rename/replace it. Every registry writer must run
under one fixed native helper that opens this exact inode and obtains an
exclusive kernel advisory lock. The helper must hold the descriptor through
the operation worker; a shell-only wrapper is not sufficient.

- **I1:** kernel lock acquisition has one winner for the inode; no pathname
  absence or replacement exists.
- **I2/I3:** a crashed worker/helper closes the descriptor and the kernel
  releases the lock. No liveness guess or stale deletion is used. A live
  worker retains the lock, so a contender returns BUSY.
- **I4:** under the lock, journal/temp fsync and current-CAS reread precede
  target `rename`; post-rename failures remain uncertain.
- **I5:** the next lock holder compares current CAS only with journal source or
  target, then finalizes or returns recovery-required without guessing.
- **I6:** open uses no-follow plus owner/type/mode/inode checks; any external
  path replacement is unsafe and causes no registry mutation. The permanent
  guard inode gives a stable identity and removes ABA.
- **I7:** guard initialization is its own durable operation. If its fsync or
  directory fsync result is uncertain, the operation reports capability/
  durability uncertainty; it must not create a second guard. Target/journal
  durability follows the existing source/target classification.

This proof assumes all registry writers are protocol-compliant. An arbitrary
same-UID process can ignore advisory locks; the spec must not claim that an
advisory lock fences hostile non-compliant writers. The pre-rename CAS detects
changes observed before the final rename, but cannot make a separate JSON
rename a universal compare-and-swap against an uncooperative writer.

### Required interleavings

| Interleaving | Correct outcome under candidate contract |
|---|---|
| A holds lock; B contends | B returns `CT_REGISTRY_BUSY`; B reads no mutable evidence and performs no cleanup. |
| A crashes before target rename | Lock releases; journal/source remains or is removed only as proven known residue; B returns `ABORTED_RETRYABLE` or retries safely. |
| A crashes after target rename before any later fsync | Lock releases; B acquires, sees target CAS, and returns `COMMITTED,replayed:true` only after required durability/finalization. |
| A crashes while finalizing rollback | B acquires and compares exact rollback source/target CAS; mismatch preserves bytes and returns deterministic recovery-required. |
| Lock helper dies while worker is live | The worker must own the inherited lock descriptor, or the operation must stop before mutation. A broker that merely says “acquired” but can die independently is unsafe. |
| Guard path is replaced by a symlink/file | No-follow open plus inode/type/owner/mode validation returns `CT_REGISTRY_UNSAFE`; no takeover or cleanup. |
| Two contenders recover one journal | Only one acquires the canonical kernel lock; the other returns BUSY and cannot inspect-and-clean concurrently. |

## Candidate Contract (not normative until policy approval)

1. The canonical identity is a permanent `project-registry.json.guard`
   regular file. Its inode is stable for the life of the registry directory.
2. Guard creation is one-time exclusive initialization. Normal success never
   unlinks, renames, or replaces the guard. Guard contents may contain
   diagnostic owner metadata, but lock state—not payload, PID, boot ID, or
   timestamps—is authoritative.
3. A fixed native helper opens the guard with no-follow semantics, verifies
   the owner-only directory/file contract, acquires an exclusive advisory
   lock, and keeps that lock attached to the worker performing every registry
   mutation. No shell, dynamic command lookup, or untrusted helper path is
   allowed.
4. Lock acquisition is the ownership linearization point. A live holder is
   `CT_REGISTRY_BUSY`; there is no stale-owner takeover and no recovery guard.
5. The existing journal, temp-file fsync, current-CAS reread, target rename,
   directory fsync, and source/target proof remain, but all happen under the
   same kernel lock. A post-rename failure remains
   `CT_REGISTRY_COMMIT_UNCERTAIN`; the next invocation automatically acquires
   the lock and resolves it.
6. Recovery never removes the canonical guard. It may remove only a journal or
   temp residue whose nonce and digest are proven known and whose current CAS
   is source/target-compatible. Unknown residue remains recovery-required.
7. The implementation must state that advisory locking coordinates compliant
   writers and does not make arbitrary same-UID filesystem writes safe.

## Required Spec Deltas

If the POSIX helper candidate is authorized, regenerate the spec (do not patch
the failed design) with these changes:

- Replace the exact ephemeral guard payload/owner-liveness takeover rule with
  permanent-guard and kernel-lock requirements.
- Remove `.guard-recovery-*`, unlink/recreate takeover, rename handoff, and
  “prove PID dead before ownership” as authority rules.
- Add `CT_REGISTRY_LOCK_UNAVAILABLE` (closed platform/operation details) and a
  deterministic unsupported-filesystem policy; this is a capability failure,
  not a manual recovery shortcut.
- Define the helper/worker lifetime rule: the mutation worker must retain the
  lock descriptor, or the helper must supervise the complete operation. A
  detached lock broker is forbidden.
- Preserve post-rename uncertainty and source/target recovery, but require
  recovery to acquire the same canonical lock before reading or finalizing.
- Replace the claim that non-compliant external writers are caught by the
  pre-rename CAS with a compliant-writer assumption plus explicit unsafe
  external-mutation behavior.
- Add scenarios for helper crash, worker crash, lock contention, guard inode
  replacement, unsupported mount, two recovery contenders, and every
  post-rename fsync/finalization window.

If SQLite is authorized instead, regenerate the proposal/spec/design around a
SQLite guard identity and explicitly remove the exact JSON guard-payload
contract; do not mix SQLite transactions with the existing pathname guard.

## Dependencies and Platform Support

| Environment | Candidate support | Conditions |
|---|---|---|
| Linux + glibc | Yes | Native helper calls `flock(2)`; test local ext4/tmpfs and packaged helper ABI. |
| Linux + musl | Yes | Build/test a musl-compatible helper; do not assume glibc-only symbols. |
| macOS | Yes | Build helper against BSD `flock(2)`; do not assume a `/usr/bin/flock` utility. |
| WSL2 Linux-backed filesystem | Conditional | Linux helper is available; require ext4/VHD-backed config or verified lock semantics. |
| WSL/Windows-mounted DrvFS | Unresolved/deny by default | Filesystem lock propagation and rename durability need explicit verification. |
| Native Windows | No under this candidate | Requires a separate `LockFileEx` adapter and a new security/durability proof. |
| NFS/SMB/CIFS/remote mounts | Deny by default | Linux docs describe emulation, lost locks, and mandatory-locking differences; no silent acceptance. |

The repository currently has no native helper dependency and only `ajv` and
`yaml` in `package.json`. A helper therefore requires a deliberate packaging
decision: checked-in per-platform binaries, a reproducible build toolchain,
or a maintained native package with verified Bun/Node-API support. An
unreviewed npm lock package is not an invariant proof.

## Unresolved Decisions

- Is the supported runtime contract POSIX local filesystems only, with native
  helper builds, or must native Windows/remote mounts be supported?
- Is adding a native helper and subprocess execution acceptable for an
  otherwise Bun/Node ESM project?
- Should guard payload be diagnostic-only, or must exact mutable owner fields
  remain part of the canonical guard file? Mutable payload cannot be the lock
  authority without reintroducing stale-write races.
- Does the proposal permit a permanent guard file, or does “guard” require an
  ephemeral residue that is removed after each operation?
- If no platform/helper decision is authorized, is the project willing to
  accept a documented manual `RECOVERY_REQUIRED` state? The present request
  explicitly says no, so this is a blocker rather than a fallback.

## Risks

- Native helper distribution, ABI, signing, and crash-supervision behavior
  become part of the installable contract.
- Advisory locks are cooperative and can be lost or emulated differently on
  network filesystems; accepting those mounts would invalidate I1/I3.
- A helper that releases the lock while the JS worker continues is a subtle
  split-brain bug; integration tests must kill helper/worker independently.
- SQLite would solve stale lock release but would change canonical identity,
  sidecar durability, and proposal scope rather than simply improving the
  current design.

## Ready for Normative Spec

**No.** The evidence is sufficient to reject the current one-guard stale
takeover and the failed second-guard design. It is not sufficient to select a
single normative contract until the maintainer authorizes the POSIX native
helper/platform envelope or explicitly revises the proposal to a SQLite guard
identity. No tasks or implementation should be generated before that choice.
