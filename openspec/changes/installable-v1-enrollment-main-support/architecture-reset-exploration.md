# Architecture Reset Exploration: Enrollment, Main Support, and Read-Only Witnesses

## Result

**Status: success.** The repository evidence and the authoritative decisions
below are sufficient to regenerate an independently implementable spec/design.
Bun's documented `readonly:true, create:false` boundary is intentionally used;
the contract makes no immutable-SQLite claim and proves non-mutation with the
allowlisted trace, transaction rules, and DB/WAL/SHM witnesses.

This is a fresh architectural investigation. `proposal.md` is preserved
byte-for-byte. The current spec/design were inspected only as failure evidence;
their abbreviated Support schemas and rollback windows are not authoritative.

## Current State and Evidence

- `schemas/project-registry-v1.schema.json:2-5` defines the existing registry
  envelope, `registry_revision`, project identity, canonical root/common dir,
  expected remote/branch, and per-entry revision.
- `contracts/canonicalize.mjs:54-81` provides the repository's JSON-compatible
  YAML validation, RFC 8785-style canonical serialization, and `sha256:` digest
  convention. `test/contracts/canonicalization.test.mjs:11-58` fixes UTF-16 key
  ordering, RFC number output, raw-byte hashing, and rejection of cycles/unsafe
  Unicode.
- `core.mjs:761-770` rederives Main from absolute Git common directory and
  `git worktree list --porcelain -z`, then rejects non-unique or detached Main.
- `core.mjs:4354-4399` shows why `core.open()` is forbidden for Support: it may
  create the runtime directory/database, enable WAL, and issue DDL.
- `core.mjs:4630-4646` is the current status projection. It reads `agent` and
  `lock`, orders agents by role/name, and does not expose the full queue.
- `core.mjs:90-680` contains the actual legacy and continuation DDL (schema
  versions 1–5), including `agent`, `message`, `lock`, bindings, delivery,
  claims, sessions/budgets, and recovery tables.
- `main-store/store.mjs:31-107` and `test/main-store.test.mjs:106-153` establish
  existing owner-only modes, temp-file fsync, rename, directory fsync, CAS, and
  concurrent-writer expectations; the new registry protocol must close the
  guard/journal and uncertain-commit gaps left by that simpler store.
- `test/helpers/restore-fixture.mjs:103-159` demonstrates no-follow runtime
  traversal, sorted directory names, file hashes, symlink targets, and a
  before/after instability check. Its `localeCompare` ordering is not adopted
  for the new canonical contract; byte ordering is required below.
- Context7 Bun documentation (`/oven-sh/bun`, `runtime/sqlite.mdx`) documents
  `new Database(path, { readonly: true })` as preventing modifications and
  exposes `create:false`; it does not document `immutable=1`. The contract below
  therefore does not claim immutable SQLite.

## Canonical Filesystem and Git Manifests

### Canonical serialization and digest rules

All schemas are closed records: exact keys, no additional keys, JSON-compatible
scalar types, and UTF-8 Unicode scalar values only. Object serialization is the
existing RFC 8785 JCS implementation (UTF-16 code-unit key ordering and RFC
number formatting). Arrays are sorted before serialization using unsigned
lexicographic UTF-8 bytes, never locale collation. Digests are
`sha256:<64 lowercase hex>` over the UTF-8 JCS bytes without a trailing LF.
Human/CLI output is those same bytes followed by exactly one LF.

`filesystem_manifest_v1`:

```text
{kind:"filesystem_manifest_v1",version:1,root:{name:"container"|"main"|"worktrees"|"common-dir",path:string},entries:Entry[],exclusions:string[]}
Entry={path:string,kind:"directory"|"file"|"symlink"|"other",mode:integer,uid:integer,size:string,mtime_ns:string,sha256:string|null,target:string|null}
```

`path` is a normalized relative POSIX path from `root`: no NUL, backslash,
leading slash, empty component, `.` or `..`; absolute roots are normalized with
`realpath` and require a non-symlink directory owned by the effective UID.
`size` and `mtime_ns` are decimal strings to avoid JavaScript precision loss.
Directories have `sha256:null,target:null`; regular files hash bytes read through
an opened descriptor; symlinks use `lstat` and `readlink` only, with
`sha256:null` and the raw link target in `target`; FIFOs, sockets, devices, and
unknown objects are `other` and are never opened. A file is accepted only when
post-read `lstat` metadata equals the pre-read metadata; otherwise the snapshot
is `CT_SUPPORT_SNAPSHOT_RACED`.

Traversal roots and exclusions are fixed:

1. `container` is the parent directory containing exactly `Main` and
   `Worktrees`; it records those boundary entries but does not recurse into
   either child.
2. `main` recursively traverses Main, includes the `.git` boundary entry, and
   excludes recursion below `.git`.
3. `worktrees` recursively traverses `Worktrees`; each direct child is a
   candidate worktree and `.git` entries are boundary leaves only.
4. `common-dir` recursively traverses the Git common directory while excluding
   `control-tower/` and its descendants. The excluded runtime is represented by
   the dedicated Tower surfaces below.

Entries are emitted in UTF-8 byte path order. Directory enumeration is repeated
  before/after recursion; changed name sets, disappearance, permission errors,
  or type changes produce a deterministic error record rather than a partial
  manifest.

`git_manifest_v1` is:

```text
{kind:"git_manifest_v1",version:1,canonical_repo:string,git_common_dir:string,head_oid:string,branch:string,remote:string,status_z_b64:string,entries:GitEntry[],worktrees:GitWorktree[]}
GitEntry={path:string,mode:"100644"|"100755"|"120000",type:"blob",object_id:string}
GitWorktree={path:string,git_dir:string,common_dir:string,head_oid:string,branch:string|null,detached:boolean,locked:boolean,prunable:boolean}
```

The adapter uses fixed read commands (`rev-parse`, `symbolic-ref`,
`remote get-url`, `status --porcelain=v2 -z --branch`, `ls-tree -rz HEAD`, and
`worktree list --porcelain -z`) with `GIT_OPTIONAL_LOCKS=0`; no Git mutation
command is legal. `status_z_b64` preserves exact status bytes using standard
base64 (including NULs). Git entries and worktrees use UTF-8 byte ordering.
Missing remote, detached Main, malformed `-z` records, or a path outside the
selected common directory yields a fixed error record.

### Error record

Every manifest/read operation failure is exactly:

```text
{kind:"error_v1",version:1,ok:false,error:{code:string,operation:string,field:string|null,details:object}}
```

`details` is closed per error code and never contains stack traces, host-specific
timestamps, or arbitrary exception text. Required codes include
`CT_LAYOUT_UNSAFE`, `CT_GIT_IDENTITY_DRIFT`, `CT_SUPPORT_SNAPSHOT_RACED`,
  `CT_SUPPORT_MUTATION_DETECTED`, `CT_SUPPORT_SCHEMA_INVALID`,
  `CT_SUPPORT_BUSY`, `CT_SUPPORT_SNAPSHOT_RACED`, and
  `CT_SUPPORT_INDETERMINATE`.

## Read Trace and Authoritative Witness Surfaces

The capability-sealed Support ports emit `read_trace_v1`:

```text
{kind:"read_trace_v1",version:1,operations:TraceOp[]}
TraceOp={seq:integer,port:"fs"|"git"|"sqlite"|"witness",operation:string,target:string,args_digest:string,result_digest:string,status:"OK"|"ERROR"}
```

`seq` starts at 1 and is invocation order. `target` is a normalized allowlist
name/path; query text is represented by a fixed query ID, not arbitrary SQL.
`args_digest` and `result_digest` use the digest rules above. Allowed operations
are `fs.lstat`, `fs.readdir`, `fs.readlink`, `fs.readFile`, fixed Git reads,
`sqlite.open`, `sqlite.pragma_query_only`, `sqlite.begin_deferred`, fixed
`sqlite.select`, `sqlite.commit`, `sqlite.rollback`, and witness capture.
Writes, renames, unlinks, chmod/mkdir, `sqlite.run/exec`, journal-mode changes,
and mutating Git commands are forbidden. Any forbidden trace operation is
`CT_SUPPORT_MUTATION_DETECTED` and is attributable to Support.

The authoritative surfaces are ordered exactly as follows:
`registry`, `filesystem`, `git`, `tower-db-files`, `queue`, `locks`,
`delivery`, `workers`, `sessions`, `worktrees`.

- `registry`: raw registry bytes, owner UID, and mode.
- `filesystem`: the four manifest roots above.
- `git`: the complete `git_manifest_v1` plus common-dir byte manifest.
- `tower-db-files`: `{name:"tower.db"|"tower.db-wal"|"tower.db-shm",exists:boolean,size:string,sha256:string|null,mode:integer|null,uid:integer|null}` in that name order.
- `queue`: `message` rows `{id,recipient,sender,created_at,consumed_at,text_length,text_digest}` ordered by `id`. `text_length` is the decimal UTF-8 byte length and `text_digest` is `sha256:` over the exact UTF-8 message bytes; raw free text is never emitted.
- `locks`: `{name,holder,acquired_at}` ordered by `name`.
- `delivery`: `ct_delivery` plus `ct_claim` rows with every selected column,
  ordered by `(created_at,delivery_id)` and `(claim_id)` respectively.
- `workers`: `agent` rows in `(role,name)` order and claimant-binding rows in
  `(binding_epoch,binding_id)` order.
- `sessions`: only persisted Main/claimant binding session IDs, ordered by
  `(root_session_id,binding_id)`; no filename or process inference is allowed.
- `worktrees`: normalized direct Worktrees paths joined to Git worktree records,
  agent rows, and binding rows, ordered by path.

Before Support ports run, each surface receives a projection digest. After all
ports close, the same projections are captured again. `witness_v1` is:

```text
{kind:"non_mutation_witness_v1",version:1,surface_names:string[],surfaces:[{name:string,before_digest:string,after_digest:string,unchanged:boolean}],trace_digest:string,unchanged:boolean}
```

If any surface digest changes and the trace contains only allowed operations,
return `CT_SUPPORT_SNAPSHOT_RACED` with before/after digests and
`classification:"EXTERNAL_OR_UNATTRIBUTABLE"`; never claim Support attribution
or a successful stable report. If a required before/after capture cannot complete
because the observed object disappears, becomes unreadable, or changes during
one operation, return `CT_SUPPORT_INDETERMINATE` with the fixed operation and
surface fields; it is also not a successful report. If a forbidden operation
exists, return `CT_SUPPORT_MUTATION_DETECTED` even when no digest changed.
Stable equality is the only successful witness. Read operations intentionally
avoid atime-bearing APIs; mtime is included to detect external replacement/chmod
while atime is excluded as Support itself may legitimately affect it.

## Read-Only SQLite Protocol

1. Resolve the selected registry `canonical_root` and rederive live Main/common
   directory using the fixed Git commands. Derive
   `<live_git_common_dir>/control-tower/tower.db`; never use `core.open()`,
   `locate()`, Main Store authority, or a registry-supplied arbitrary DB path.
2. If the DB is absent, return a successful `sqlite` projection with
   `availability:"ABSENT"`, `continuation:null`, and empty arrays; no directory
   or DB is created. A present DB is opened with the documented Bun
   `{readonly:true,create:false}` options and immediately checked with
   `PRAGMA query_only`; no `immutable` claim, journal mode, busy timeout, DDL,
   or write statement is permitted.
3. The connection runs one `BEGIN DEFERRED`. The first `sqlite_master` query
   establishes the transaction snapshot. All fixed SELECTs run in that snapshot;
   success issues `COMMIT`, any error issues `ROLLBACK`, then closes the handle.
4. Allowed SELECT projections are fixed: `sqlite_master(type,name,tbl_name,sql)`;
    `agent(name,role,worktree,branch,state,task,note,pr_url,updated_at)`;
    `message(id,recipient,sender,text,created_at,consumed_at)`;
   `lock(name,holder,acquired_at)`; `ct_continuation_state(id,schema_version,mode)`;
   `ct_claimant_binding` identity/topology columns; `ct_main_binding` identity
   columns; `ct_delivery` delivery columns; and `ct_claim` claim columns. No
   `SELECT *`, user-provided table/column names, or PRAGMA other than
   `query_only` is allowed. Query results are projected and sorted in the exact
    orders in the witness section; message text is immediately reduced to
    `text_length` (UTF-8 bytes) plus `text_digest` (SHA-256 of UTF-8 bytes).
5. Legacy `agent`, `message`, `message_pending`, and `lock` definitions are
   mandatory when a DB exists. A valid continuation schema has exactly one
   migration chain and the exact object SQL/checksums for versions 1–5 already
   defined by `core.mjs`; tables not present at that version produce empty
   projections, never inferred rows. Missing migration metadata, extra/drifted
   objects, malformed rows, or an unsupported version is
   `CT_SUPPORT_SCHEMA_INVALID`. SQLite busy/locked is `CT_SUPPORT_BUSY` with no
   retry. `query_only` verification failure is
   `CT_SUPPORT_READONLY_UNAVAILABLE`.
6. Zero-mutation proof consists of the forbidden-operation trace plus equality of
   `tower.db`, `-wal`, and `-shm` file projections and all database-derived
   surfaces. A read-only connection is never allowed to create a missing `-shm`
   or `-wal` file.

## Durable Owner-Only Registry Write and Rollback

Registry storage is the validated XDG directory
`$XDG_CONFIG_HOME/control-tower` (default `$HOME/.config/control-tower`),
owner UID, mode `0700`, no symlink. The target is
`project-registry.json`, owner-only regular file mode `0600`. The sole
serialization object is `project-registry.json.guard`; enrollment, rollback,
and recovery all require it.

Guard payload (exact keys) is:

```text
{kind:"project-registry-guard-v1",version:1,operation:"enroll"|"rollback"|"recover",pid:integer,boot_id:string,pid_start:string,owner_uid:integer,nonce:string,from:CAS,target:CAS,created_at:string}
CAS={exists:boolean,revision:integer,sha256:string|null,uid:integer|null,mode:integer|null}
```

The identity is `(boot_id,pid,pid_start,nonce)`; a live process with the same
boot and start marker is `CT_REGISTRY_BUSY`. A different boot ID or proven-dead
PID is recoverable. Guard creation is `O_CREAT|O_EXCL|O_WRONLY|O_NOFOLLOW,
0600`, followed by `fchmod(0600)`, file fsync, and guard-directory fsync.

Under the guard, the writer validates the current CAS and registry schema,
computes the next monotonic `registry_revision`, and durably writes an exact
JCS `.txn-<nonce>.json` containing prior bytes/CAS and target bytes/CAS. It then
creates a no-follow `0600` target temp, writes canonical bytes, fsyncs and
closes the file, rereads the current CAS, and aborts without rename on any
unexpected change. `rename(temp,target)` is the registry linearization point;
`fsync(directory)` makes it durable. The transaction journal is then renamed to
`.rollback-v1-<nonce>.json`, fsynced, the guard is unlinked, and the directory is
fsynced again. No cleanup deletes an unrecognized residue.

Failures before invoking rename are `ABORTED` and may remove only the known temp,
journal, and guard after proof; the old CAS must remain byte-identical. Any
failure after rename is `CT_REGISTRY_COMMIT_UNCERTAIN` with
`{state:"RECOVERY_REQUIRED",nonce,target_revision,target_digest}` and leaves
guard/journal residue. This includes target-directory fsync, journal rename/fsync,
or guard-finalization failure; the target may already be durable.

Rollback takes the same guard and requires current CAS exactly equal to the
journal target CAS, with no revision advance. It writes/fsyncs a rollback temp
from the captured prior bytes, then renames (or unlinks for prior absence) and
fsyncs the directory. A CAS mismatch is `CT_REGISTRY_ROLLBACK_CAS_MISMATCH` and
does not mutate. Enrollment and rollback cannot overlap because both acquire the
same guard; non-compliant external writers are caught by the pre-rename CAS.

Recovery never guesses. After proving the guard holder dead, it validates the
JCS journal and residue identities: current==source means remove only proven
residue and return `ABORTED_RETRYABLE`; current==target means fsync/finalize and
return `COMMITTED,replayed:true` (or `ROLLED_BACK,replayed:true` for rollback);
any other current state, malformed journal, unknown residue, or owner mismatch
returns `CT_REGISTRY_RECOVERY_REQUIRED` without mutation. Live holder remains
`CT_REGISTRY_BUSY`; deterministic repeated input/state returns the same code and
closed detail keys.

## Threat and Failure Matrix

| Boundary | Decision | Failure proof / RED evidence |
|---|---|---|
| Symlink/path traversal | No-follow lstat, realpath only for roots, normalized relative entries | symlink Main/Worktrees/common dir, `..`, NUL, boundary escape → `CT_LAYOUT_UNSAFE` |
| Git selection | Fixed cwd and read commands, common-dir/remote/branch exact match, `GIT_OPTIONAL_LOCKS=0` | wrong remote, detached/ambiguous Main, malformed NUL output → `CT_GIT_IDENTITY_DRIFT` |
| Dirty repository | `status --porcelain=v2 -z --branch` is observational; enrollment denies dirty Main/Worktrees | dirty index/worktree/untracked file → no registry write |
| SQLite authority | Support never imports/calls `core.open()` or Main Store | instrumentation sees DDL, `journal_mode`, writer open, or missing DB creation → RED and `CT_SUPPORT_MUTATION_DETECTED` |
| SQLite flags | Bun documented `readonly:true,create:false`; no immutable claim | no-write query allowlist, `query_only`, transaction trace, and DB/WAL/SHM witnesses; failure to verify read-only mode is `CT_SUPPORT_READONLY_UNAVAILABLE` |
| External concurrent mutation | before/after surface digests plus trace attribution | allowed trace + changed surface → `CT_SUPPORT_SNAPSHOT_RACED`; forbidden trace → mutation detected |
| Registry contention | durable owner guard with boot/PID/start identity | live holder → busy; unknown/stale residue → recovery required |
| Atomic commit crash windows | target rename linearizes; directory fsync/journal finalization classify uncertainty | injected rename/fsync failures after rename retain evidence and never claim abort/commit prematurely |
| Rollback concurrency | same guard and exact target CAS/no revision advance | concurrent enrollment or changed target → rollback CAS mismatch, bytes unchanged |
| Credentials/secret leakage | raw registry bytes are never echoed in errors; message text reduced to digest | secret-like diagnostic fields → deterministic schema/error refusal |
| V2 boundaries | no locks, queue consume, delivery, workers/sessions/worktree creation, Git mutation | dispatch request → `CT_V2_ONLY`, no trace/write/witness delta |

## Explicit Decisions

1. Byte ordering, not locale ordering, is canonical for every path/row array.
2. Symlinks are recorded as inert link targets and never followed; unsafe layout
   boundaries deny rather than repair.
3. File bytes are hashed raw; structured output is JCS; report LF is transport
   only and never part of a digest.
4. Witness equality covers DB, `-wal`, and `-shm` files plus all derived queue,
   lock, delivery, worker, session, and worktree projections. Queue free text is
   represented only by UTF-8 byte length and cryptographic digest.
5. SQLite schema validation is an allowlist against the repository's exact
   migration manifests; absent versioned tables are empty, not inferred.
6. A post-rename failure is uncertain until proof-based recovery, never an
   ordinary abort.
7. Only a proven-dead guard owner may be recovered, and only known residues may
   be removed.
8. Support returns deterministic error records rather than partial reports.

## Unresolved Questions / Blockers

None. The authoritative decision is to use documented Bun
`readonly:true,create:false` without claiming immutable SQLite. Queue witnesses
use only exact UTF-8 byte length plus SHA-256 text digest; no sensitive free text
is exposed.

## Ready for Proposal/Spec/Design

**Yes.** The contract is complete enough to regenerate spec/design. Regenerate
both from this corrected exploration; do not patch the failed artifacts.
