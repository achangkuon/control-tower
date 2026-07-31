# Installable V1 Enrollment, Main Resolution, and Local Support Specification

## Purpose

Define owner-local enrollment, exact live Main selection, safe layout validation, read-only Support, and a crash-safe registry writer. This is the normative replacement for P8. The proposal SHA-256 is `d969fd9452efd485ccb4d24a831b1b84bb110cd1c5ec166109b488a71af85cc6`.

## Normative references

This file is authoritative. `architecture-reset-exploration.md` is evidence only: its ephemeral `O_CREAT|O_EXCL` owner-payload/`pid`-liveness guard section, guard unlink/finalization, stale takeover, and manual `RECOVERY_REQUIRED` rules are explicitly **SUPERSEDED** by the permanent-inode, kernel-lock, classifier, helper, and recovery requirements below. `recovery-protocol-exploration.md` is incorporated only for the selected POSIX-local helper policy. `design.md` is non-normative and stale; it MUST NOT override this file, especially its ephemeral guard or second recovery-guard text.

## Scope and exclusions

The capability MUST cover enrollment, `Main/` and `Worktrees/` validation, exact `project_id` plus registry revision resolution, live Main rederivation, Support reporting, `bin/torre` dispatch, registry diagnostics, helper distribution, and automatic recovery. It MUST NOT implement Telegram/Hermes, P2, shared/release docs, runtime autonomy, Policy/jornadas, workers/sessions/assignments, worktree creation, Git mutation, queue consumption, delivery, merge, `core.mjs`, `mcp.mjs`, Main Store, lifecycle, migrations, database mutation, Tower locks/queues, or a SQLite guard. It MUST NOT repair or relocate unsafe content.

## ADDED Requirements

### Requirement: Explicit capability boundary and CLI dispatch

Enrollment MUST be an explicit local owner action. `bin/torre` MUST dispatch enrollment, exact resolution, diagnostic Support, and registry diagnostics only to bounded modules. Excluded capabilities MUST return `CT_V2_ONLY` with `{capability:string}` and MUST NOT open a writer, acquire a registry lock, consume a queue, or create an execution resource.

#### Scenario: Supported dispatch
- GIVEN a valid enrollment, resolution, Support, or registry-diagnostic command
- WHEN `bin/torre` dispatches it
- THEN exactly the bounded operation runs and returns its machine-readable result
- AND no excluded capability is invoked

#### Scenario: Excluded dispatch
- GIVEN a request for Policy, workers, sessions, queue custody, delivery, merge, Telegram, Git mutation, or database mutation
- WHEN the request is dispatched
- THEN it returns `CT_V2_ONLY` and all trace, filesystem, Git, registry, DB, and witness state is unchanged

### Requirement: Exact enrollment and live Main resolution

The registry MUST use the closed `project-registry-v1` envelope with exact `registry_revision`, project identity, canonical root/common directory, expected remote/branch, and per-entry revision fields. Enrollment MUST assign the next monotonic revision. Resolution MUST require exact `project_id` and revision; aliases MAY locate candidates but MUST NOT authorize ambiguity. It MUST rederive live Main/common-directory, owner, remote, branch, and symlink facts and deny drift without repair.

#### Scenario: Valid enrollment and resolution
- GIVEN one owner-controlled valid layout and the expected current revision
- WHEN enrollment commits and exact resolution is requested
- THEN the next revision and complete project/Main binding are returned
- AND every live identity fact matches

#### Scenario: Alias or drift denial
- GIVEN an ambiguous alias, stale revision, or changed live Main fact
- WHEN resolution runs
- THEN it returns `CT_REGISTRY_CAS_MISMATCH` or `CT_GIT_IDENTITY_DRIFT`
- AND no stored byte, path, Git, or Tower state changes

### Requirement: Fail-closed filesystem and Git layout validation

The container MUST be the owner-controlled parent containing exactly `Main` and `Worktrees`. Absolute roots MUST be `realpath`-normalized, non-symlink directories owned by the effective UID. Main MUST be unique, non-detached, common-directory/remote/branch-compatible, and clean. Worktrees MUST be clean. Unsafe, dirty, ambiguous, unexpected, or boundary-escaping content MUST deny validation and MUST NOT be reset, stashed, replaced, relocated, recycled, or silently repaired.

#### Scenario: Safe layout
- GIVEN exactly one non-detached Main and safe owner-controlled boundaries
- WHEN validation runs
- THEN the canonical layout identity is returned with no mutation

#### Scenario: Unsafe or dirty layout
- GIVEN a symlink boundary, wrong owner/remote/branch/common directory, detached or ambiguous Main, dirty content, or boundary escape
- WHEN validation runs
- THEN `CT_LAYOUT_UNSAFE` or `CT_GIT_IDENTITY_DRIFT` is returned and every existing byte remains unchanged

### Requirement: Canonical records, ordering, serialization, and errors

Every schema MUST be a closed record with exact keys, JSON-compatible scalar values, and UTF-8 Unicode scalar strings. Object bytes MUST use the repository JCS implementation (UTF-16 key ordering and RFC number formatting); arrays MUST use unsigned UTF-8 byte order. Digests MUST be `sha256:` plus 64 lowercase hexadecimal characters over UTF-8 JCS bytes without a trailing LF. Transport MUST append exactly one LF. Every failure MUST be `{kind:"error_v1",version:1,ok:false,error:{code,operation,field,details}}`; details MUST be code-closed and MUST NOT include stack traces, host timestamps, raw registry bytes, or arbitrary exception text.

The following codes and detail keys are normative: `CT_LAYOUT_UNSAFE{path,reason}`, `CT_GIT_IDENTITY_DRIFT{field,expected,observed}`, `CT_SUPPORT_SNAPSHOT_RACED{surface,before_digest,after_digest,classification}`, `CT_SUPPORT_MUTATION_DETECTED{trace_seq,port,operation}`, `CT_SUPPORT_SCHEMA_INVALID{object,reason}`, `CT_SUPPORT_BUSY{operation,target}`, `CT_SUPPORT_INDETERMINATE{surface,operation,field}`, `CT_SUPPORT_READONLY_UNAVAILABLE{operation,reason}`, `CT_REGISTRY_PLATFORM_UNSUPPORTED{platform,reason}`, `CT_REGISTRY_FILESYSTEM_UNSUPPORTED{filesystem,reason}`, `CT_REGISTRY_HELPER_ABSENT{helper,platform}`, `CT_REGISTRY_HELPER_MANIFEST_INVALID{reason}`, `CT_REGISTRY_HELPER_TAMPERED{helper,expected_digest,actual_digest}`, `CT_REGISTRY_HELPER_SIGNATURE_INVALID{helper,key_id}`, `CT_REGISTRY_HELPER_VERSION_MISMATCH{expected,actual}`, `CT_REGISTRY_HELPER_ABI_MISMATCH{expected,actual}`, `CT_REGISTRY_HELPER_PROTOCOL_MISMATCH{expected,actual}`, `CT_REGISTRY_HELPER_EARLY_EXIT{phase,exit_code}`, `CT_REGISTRY_HELPER_ACTIVATION_UNCERTAIN{phase,nonce}`, `CT_REGISTRY_HELPER_ACTIVATION_CAS_MISMATCH{expected,actual}`, `CT_REGISTRY_HELPER_ROLLBACK_UNAVAILABLE{reason}`, `CT_REGISTRY_LOCK_BUSY{operation}`, `CT_REGISTRY_LOCK_UNAVAILABLE{operation,reason}`, `CT_REGISTRY_GUARD_UNSAFE{path,reason}`, `CT_REGISTRY_GUARD_INIT_UNCERTAIN{phase,reason}`, `CT_REGISTRY_CAS_MISMATCH{expected,actual}`, `CT_REGISTRY_COMMIT_UNCERTAIN{state,nonce,target_revision,target_digest}`, `CT_REGISTRY_ROLLBACK_CAS_MISMATCH{expected,actual}`, `CT_REGISTRY_RECOVERY_REQUIRED{reason,nonce}`, and `CT_V2_ONLY{capability}`.

#### Scenario: Canonical digest
- GIVEN equivalent data with different key insertion and input-array order
- WHEN it is serialized and digested
- THEN canonical bytes, digest, and one-LF transport are identical

#### Scenario: Deterministic error
- GIVEN unchanged invalid input and local state
- WHEN an operation is repeated
- THEN its code and exact closed detail-key set are identical

### Requirement: Canonical filesystem manifests

`filesystem_manifest_v1` MUST be exactly `{kind,version,root,entries,exclusions}`; entries MUST be exactly `{path,kind,mode,uid,size,mtime_ns,sha256,target}`. Relative paths MUST be normalized POSIX paths with no NUL, backslash, leading slash, empty component, `.` or `..`. Regular files MUST be hashed through an opened descriptor and checked by post-read `lstat`; symlinks MUST use `lstat`/`readlink` only; FIFOs, sockets, devices, and unknown objects MUST be `other` and never opened. `container` records Main/Worktrees without recursion; `main` recurses with `.git` as a boundary; `worktrees` recurses direct candidates with `.git` leaves; `common-dir` excludes `control-tower/`. Enumeration changes, disappearance, permission failure, or type changes MUST return `CT_SUPPORT_SNAPSHOT_RACED` rather than a partial manifest. Entries MUST use UTF-8 byte order.

#### Scenario: Stable manifest
- GIVEN permitted roots whose files, links, directories, and metadata remain stable
- WHEN all four manifests are captured
- THEN exclusions, raw hashes, inert link targets, metadata, and byte ordering are exact

#### Scenario: Snapshot race
- GIVEN a file or directory changes, disappears, changes type, or changes enumeration during capture
- WHEN the mismatch is detected
- THEN `CT_SUPPORT_SNAPSHOT_RACED` is returned and no partial manifest is reported

### Requirement: Canonical Git manifest and read-only Git access

`git_manifest_v1` MUST contain exactly `{kind,version,canonical_repo,git_common_dir,head_oid,branch,remote,status_z_b64,entries,worktrees}`. Git entries/worktrees MUST be UTF-8 byte ordered. The adapter MUST use only fixed `rev-parse`, `symbolic-ref`, `remote get-url`, `status --porcelain=v2 -z --branch`, `ls-tree -rz HEAD`, and `worktree list --porcelain -z` reads with `GIT_OPTIONAL_LOCKS=0`; no mutating Git command is legal. Missing remote, detached Main, malformed NUL records, or an escaped path MUST return `CT_GIT_IDENTITY_DRIFT`.

#### Scenario: Git observation
- GIVEN valid fixed-command output and a matching selected Main
- WHEN the Git manifest is captured
- THEN complete records are returned without a mutating command

#### Scenario: Forbidden or malformed Git result
- GIVEN a mutating request, malformed output, or an escaped worktree
- WHEN Git data is requested
- THEN the fixed failure is returned and Git is unchanged

### Requirement: Read trace, witness, Support privacy, and non-mutation

Support MUST emit `read_trace_v1` with contiguous `seq`, fixed operation IDs, normalized targets, and canonical argument/result digests. Only `fs.lstat|readdir|readlink|readFile`, the fixed Git reads, `sqlite.open|pragma_query_only|begin_deferred|select|commit|rollback`, and witness capture are allowed. It MUST capture surfaces in this exact order: `registry`, `filesystem`, `git`, `tower-db-files`, `queue`, `locks`, `delivery`, `workers`, `sessions`, `worktrees`, before and after all ports. Queue output MUST contain only `{id,recipient,sender,created_at,consumed_at,text_length,text_digest}` ordered by id; raw message text MUST never appear in output, errors, traces, or diagnostics. Writes, renames, unlinks, chmod/mkdir, journal changes, arbitrary SQL, and mutating Git are forbidden.

`witness_v1` MUST contain `{kind,version,surface_names,surfaces,trace_digest,unchanged}`. Stable equality of every surface and an allowed trace is the only success. Changed surfaces return `CT_SUPPORT_SNAPSHOT_RACED` with `classification:"EXTERNAL_OR_UNATTRIBUTABLE"`; incomplete capture returns `CT_SUPPORT_INDETERMINATE`; a forbidden operation returns `CT_SUPPORT_MUTATION_DETECTED` even if digests match. Atime MUST be excluded and mtime MUST remain included.

#### Scenario: Stable private report
- GIVEN allowed reads complete and every before/after projection is equal
- WHEN Support closes
- THEN the exact report, trace, witness, surface order, and digest-only queue projection are returned

#### Scenario: Race, forbidden operation, or incomplete capture
- GIVEN a changed surface, forbidden operation, or disappearing/unreadable object
- WHEN Support finalizes
- THEN the corresponding fixed error is returned and no stable or partial report is accepted

### Requirement: Documented Bun read-only SQLite contract

Support MUST derive `<live_git_common_dir>/control-tower/tower.db` from live Main and MUST NOT use `core.open()`, `locate()`, Main Store authority, or an arbitrary registry DB path. An absent DB MUST return `availability:"ABSENT"`, `continuation:null`, and empty arrays without creating a directory, DB, WAL, or SHM. A present DB MUST use Bun `{readonly:true,create:false}`, immediately verify `PRAGMA query_only`, and make no immutable-SQLite claim. Exactly one `BEGIN DEFERRED` MUST precede the first `sqlite_master(type,name,tbl_name,sql)` query; fixed SELECTs run in that snapshot; success commits, errors roll back, and the handle closes. Only the allowlisted `sqlite_master`, `agent`, `message`, `lock`, continuation, claimant, Main binding, delivery, and claim column projections are legal; no `SELECT *`, caller identifiers, other PRAGMA, DDL, writes, journal changes, or busy retry is allowed. Legacy schema and exact versions 1–5 MUST validate against `core.mjs`; drift, malformed rows, unsupported version, busy, or read-only failure return the fixed Support error.

#### Scenario: Absent or valid DB
- GIVEN the derived DB is absent or has the exact allowlisted schema
- WHEN SQLite Support runs
- THEN absence is empty and presence follows the exact flags, transaction, queries, and no-sidecar rule

#### Scenario: Schema, busy, or authority failure
- GIVEN schema drift, malformed rows, busy SQLite, failed `query_only`, or a writer/core path
- WHEN Support runs
- THEN it returns the corresponding fixed error without retry, mutation, creation, or success claim

### Requirement: Platform and filesystem capability diagnostic before mutation

Before guard initialization, helper activation, journal creation, target temp creation, or registry mutation, the operation MUST classify the exact closed `registry_classifier_input_v1` record: `{target_path:string,effective_uid:integer,platform:{os:"linux"|"darwin"|"windows"|"wsl"|"other",arch:"x86_64"|"aarch64"|"arm64",libc:"glibc"|"musl"|"none"|null,wsl_version:2|null},filesystem:{fstype:string,source:string,local:boolean,remote:boolean,mount_id:string},guard:{exists:boolean,device:string|null,inode:string|null,uid:integer|null,mode:integer|null,type:"regular"|"symlink"|"other"|null}}`. `target_path` MUST be absolute and realpath-normalized without following the guard; `device`, `inode`, and `mount_id` MUST be decimal strings. The classifier MUST use only read-only `realpath`, `lstat`, `statfs/statvfs`, `uname`, WSL-release metadata, and mount-table reads. If a guard exists it MAY open it `O_RDONLY|O_NOFOLLOW`, attempt a nonblocking advisory lock, and immediately unlock; it MUST never create, write, chmod, unlink, rename, or probe with a temporary file. An absent guard is classified without a lock probe and receives `ALLOW_UNINITIALIZED` only for the allowlisted triple/filesystem; initialization supplies the first real lock proof.

The exact allow/deny table is: Linux+glibc or Linux+musl with `fstype` `ext4|xfs|btrfs`, `local:true`, `remote:false` → `ALLOW`; macOS with `fstype:"apfs"`, `local:true`, `remote:false` → `ALLOW`; WSL version 2 with Linux `fstype:"ext4"`, `source` not DrvFS/remote, `local:true`, `remote:false` → `ALLOW`; native Windows → `CT_REGISTRY_PLATFORM_UNSUPPORTED{platform:"windows",reason:"NATIVE_WINDOWS"}`; NFS → `CT_REGISTRY_FILESYSTEM_UNSUPPORTED{filesystem:"nfs",reason:"REMOTE_FILESYSTEM"}`; SMB/CIFS → the same with `filesystem:"smb"` or `"cifs"`; DrvFS → `filesystem:"drvfs",reason:"EMULATED_FILESYSTEM"`; unknown fstype, source, mount locality, WSL status, architecture, libc, or unavailable metadata → `CT_REGISTRY_FILESYSTEM_UNSUPPORTED{filesystem:"unknown",reason:"UNVERIFIED_MOUNT"}` or the corresponding platform error. Any existing-guard lock probe that fails for reasons other than contention returns `CT_REGISTRY_LOCK_UNAVAILABLE`.

#### Scenario: Supported preflight
- GIVEN the exact classifier input identifies Linux glibc/musl on ext4/xfs/btrfs, macOS on APFS, or WSL2 on verified local ext4
- WHEN diagnostics run before enrollment
- THEN it returns `ALLOW` or `ALLOW_UNINITIALIZED`, and no path, byte, metadata, or kernel-lock residue remains changed

#### Scenario: Every denied platform/filesystem
- GIVEN native Windows, NFS, SMB/CIFS, DrvFS, unknown mounts, unknown WSL locality, unsupported libc/architecture, or unavailable mount metadata
- WHEN diagnostics run
- THEN the exact table error is returned before any guard/helper mutation and no destructive probe is attempted

#### Scenario: Existing guard lock probe
- GIVEN an existing guard on an allowlisted filesystem
- WHEN the classifier opens it no-follow and probes the advisory lock
- THEN it unlocks without writing; a held lock is `CT_REGISTRY_LOCK_BUSY`, and any other probe failure is `CT_REGISTRY_LOCK_UNAVAILABLE`

### Requirement: Permanent canonical guard inode and advisory-lock ownership

The validated XDG directory MUST be an owner-UID, no-symlink directory mode `0700`; `project-registry.json` MUST be an owner-only regular file mode `0600`. `project-registry.json.guard` MUST be an owner-only no-follow regular file mode `0600`. Its exact immutable identity record MUST be the closed JCS object `{kind:"project-registry-guard-v1",version:1,path:"project-registry.json.guard",device:string,inode:string,owner_uid:integer,mode:integer,type:"regular"}`; `mode` MUST be `384` (`0600`), `type` MUST be `regular`, and `device`/`inode` MUST equal the decimal `fstat` values of that inode. This payload is diagnostic identity only; the kernel lock is the authority and mutable payload fields MUST NOT grant ownership.

If absent, initialization MUST execute exactly: no-write classifier; `open(O_CREAT|O_EXCL|O_WRONLY|O_NOFOLLOW,0600)`; `fstat` and owner/type/mode validation; acquire nonblocking kernel advisory exclusive lock; write the exact identity record; `fsync` the guard; `fsync` the parent directory; then re-open no-follow and revalidate path/device/inode/uid/mode/type. A failure before the record is durable MUST NOT unlink or replace the inode. If any guard-file or directory fsync result is unknown, it MUST return `CT_REGISTRY_GUARD_INIT_UNCERTAIN{phase:"guard_fsync"|"directory_fsync",reason:string}` and preserve the inode. The next compliant operation MUST acquire the same lock, validate the existing inode, complete only the missing in-place identity write/fsync, and revalidate; a different inode/path/type/owner/mode returns `CT_REGISTRY_GUARD_UNSAFE` without cleanup.

Every compliant enrollment, rollback, and recovery MUST open that exact inode with no-follow owner/type/mode/device/inode validation and obtain a nonblocking kernel advisory exclusive lock. Successful lock acquisition is ownership linearization. The native helper MUST keep the lock descriptor open for the entire mutation worker. If the worker is a child, it MUST inherit the descriptor and keep it until exit; the helper MUST supervise it and keep a control channel open. The worker MUST stop before its next mutation when the channel closes. The helper MUST NOT be a detached broker, shell wrapper, or dynamically resolved command. A worker/helper crash closes all descriptors eventually and permits the next compliant owner to acquire the inode; no stale test, unlink, takeover rename, or second recovery guard is legal. Advisory locking coordinates compliant writers only; an uncooperative same-UID writer is outside the fence. The final pre-rename CAS detects an observed change, but MUST NOT be described as a universal CAS against such a writer.

#### Scenario: First durable initialization and lock
- GIVEN a supported filesystem and an absent guard
- WHEN the first compliant operation initializes and acquires it
- THEN the exact identity record matches `fstat`, both fsyncs complete, the helper holds the kernel lock through worker exit, and the same inode remains afterward

#### Scenario: Contention and lock unavailable
- GIVEN another compliant worker holds the inode, or the kernel cannot provide the required lock
- WHEN a contender runs
- THEN it returns `CT_REGISTRY_LOCK_BUSY` or `CT_REGISTRY_LOCK_UNAVAILABLE` without reading mutable journal evidence or cleaning residue

#### Scenario: Helper or worker crash
- GIVEN the helper exits early, the helper crashes while the worker is live, or the worker crashes
- WHEN supervision observes the failure
- THEN `CT_REGISTRY_HELPER_EARLY_EXIT` is returned where applicable, the worker performs no further mutation after control-channel loss, and the next contender can acquire only after descriptors close

#### Scenario: Guard inode/path replacement
- GIVEN the guard path is replaced by a symlink, different inode, wrong type, owner, or mode
- WHEN a registry operation opens it
- THEN `CT_REGISTRY_GUARD_UNSAFE` is returned and neither replacement nor cleanup is attempted

#### Scenario: Guard initialization fsync uncertainty
- GIVEN guard-file or parent-directory fsync returns an unknown result during first initialization
- WHEN the operation reports the outcome
- THEN it returns `CT_REGISTRY_GUARD_INIT_UNCERTAIN`, preserves the inode, and the next lock holder completes only a validated in-place identity recovery

#### Scenario: Two recovery contenders
- GIVEN two processes observe the same journal/residue
- WHEN both request recovery
- THEN exactly one can acquire the canonical inode lock, the other returns `CT_REGISTRY_LOCK_BUSY`, and only the owner may inspect or finalize evidence

### Requirement: Versioned helper packaging, integrity, compatibility, and activation

Exactly one integrity mechanism is permitted: a detached Ed25519 signature verified against the helper's embedded release public key. `helper_release_manifest_v1` MUST be the closed JCS object `{kind:"helper_release_manifest_v1",version:1,key_id:"ct-release-ed25519-v1",signature_algorithm:"Ed25519",releases:Release[]}`. Each `Release` MUST be exactly `{helper,os,arch,libc,abi,helper_version,protocol_version,build_id,binary_sha256,signature}` where `helper`, `os`, `arch`, `libc`, `abi`, `helper_version`, `protocol_version`, and `build_id` are strings, `binary_sha256` is `sha256:` plus 64 lowercase hex characters, and `signature` is 128 lowercase hex characters. `key_id` MUST equal the compiled-in public key identity `ct-release-ed25519-v1`; no package checksum, certificate, or alternative trust path is accepted.

The only supported triples are `(linux,x86_64,glibc)`, `(linux,x86_64,musl)`, `(linux,aarch64,glibc)`, `(linux,aarch64,musl)`, `(darwin,x86_64,none)`, and `(darwin,arm64,none)`. WSL2 selects the corresponding Linux triple. Release entries MUST be unique and byte-sorted by `(os,arch,libc,helper_version,build_id)`. The signature covers the JCS bytes of the Release with `signature` omitted; the public key is compiled into the release and selected only by the exact `key_id`.

Preflight MUST verify in this order: manifest closed schema/JCS and exact key identity; runtime triple and exactly one release; helper path no-follow regular-file owner/mode/type; raw binary SHA-256 against `binary_sha256`; Ed25519 signature against the embedded key; then fixed no-write helper probe output `{helper,abi,protocol_version,helper_version,build_id}` against the Release. Missing release/helper returns `CT_REGISTRY_HELPER_ABSENT`; malformed manifest returns `CT_REGISTRY_HELPER_MANIFEST_INVALID`; digest mismatch returns `CT_REGISTRY_HELPER_TAMPERED`; signature/key failure returns `CT_REGISTRY_HELPER_SIGNATURE_INVALID`; and probe version, ABI, or protocol mismatch returns its named fixed error. None MAY initialize or lock a new guard.

Helper installation MUST use immutable owner-only paths `helpers/<os>-<arch>-<libc>/<helper_version>-<build_id>/helper`, with directory mode `0700` and executable mode `0700`; an installed path MUST never be modified or replaced. The sole selection pointer MUST be the owner-only regular `helpers/active` file, whose exact record is `{kind:"helper_activation_v1",version:1,release_key:string,binary_path:string,binary_sha256:string,helper_version:string,protocol_version:string,build_id:string}`. Activation MUST also create a known journal `.helper-activation-v1-<nonce>.json` exactly `{kind:"helper_activation_journal_v1",version:1,nonce:string,from:Activation|null,to:Activation,phase:"staged"|"selected"|"rolled_back"}`. `Activation` is the exact `helper_activation_v1` record.

Activation MUST verify the release, stage only within the helpers directory, fsync the staged file, fsync its version directory, rename it once to the immutable versioned path, fsync the helpers directory, reread `active` and compare its expected source digest, write/fsync a no-follow `active.tmp-<nonce>`, rename it to `active` (the selection linearization point), fsync the helpers directory, then mark/finalize the journal and fsync the directory. Before pointer rename, failures remove only the known staged residue and leave the old pointer unchanged. After pointer rename, any fsync/journal failure returns `CT_REGISTRY_HELPER_ACTIVATION_UNCERTAIN{phase,nonce}`; the next activation diagnostic compares exact `from`/`to` records and completes or rolls back under the same pointer CAS. Rollback requires an intact verified `from` release, an `active` record exactly equal to `to`, and no registry worker; it atomically selects `from`, fsyncs the directory, marks the journal `rolled_back`, and removes only proven journal residue. A pointer mismatch returns `CT_REGISTRY_HELPER_ACTIVATION_CAS_MISMATCH`; missing/invalid previous release returns `CT_REGISTRY_HELPER_ROLLBACK_UNAVAILABLE`. Unknown residue is preserved.

#### Scenario: Verified helper activation
- GIVEN a manifest-matching helper, one supported triple, an immutable verified install path, and an expected old `active` record or absent pointer
- WHEN activation runs
- THEN the exact record is staged, fsynced, atomically selected by `active` rename, directory-fsynced, and the journal is finalized

#### Scenario: Helper manifest or signature failure
- GIVEN the manifest is malformed, key identity is wrong, the helper digest differs, or Ed25519 verification fails
- WHEN preflight runs
- THEN it returns `CT_REGISTRY_HELPER_MANIFEST_INVALID`, `CT_REGISTRY_HELPER_TAMPERED`, or `CT_REGISTRY_HELPER_SIGNATURE_INVALID` and performs no activation or guard mutation

#### Scenario: Helper version, ABI, protocol, or absence failure
- GIVEN no exact release exists, or the fixed helper probe differs in version, ABI, or protocol
- WHEN preflight runs
- THEN it returns the corresponding deterministic helper error and executes no helper worker

#### Scenario: Activation rollback
- GIVEN activation fails before pointer rename, or pointer rename succeeded and later fsync/journal finalization is uncertain
- WHEN rollback runs
- THEN pre-pointer residue is removed only when known, post-pointer state is resolved by exact `from`/`to` CAS, the verified previous selection is restored or `CT_REGISTRY_HELPER_ROLLBACK_UNAVAILABLE` is returned, and no unverified helper is executable

#### Scenario: Activation pointer contention or residue
- GIVEN `active` differs from the expected source or an unknown activation residue exists
- WHEN activation or recovery runs
- THEN it returns `CT_REGISTRY_HELPER_ACTIVATION_CAS_MISMATCH`, preserves all residue, and does not replace the pointer

### Requirement: Durable enrollment, journal, pre-rename CAS, and commit linearization

Under the held canonical lock, enrollment MUST validate current registry schema/CAS, compute the next monotonic revision, and durably write exact JCS `.txn-<nonce>.json` containing source bytes/CAS and target bytes/CAS. It MUST write/fsync/close a no-follow `0600` target temp, reread current CAS immediately before `rename(temp,target)`, and return `CT_REGISTRY_CAS_MISMATCH` without rename when the CAS differs. Target rename is the sole commit linearization point. Directory fsync, journal finalization, and all known residue handling MUST occur under the same lock. Unknown residue MUST never be deleted.

#### Scenario: Durable enrollment
- GIVEN valid source CAS/schema, verified helper, and the canonical lock
- WHEN enrollment completes target rename and finalization
- THEN target bytes are complete old-or-new bytes, revision is monotonic, journal evidence is finalized, and the permanent guard remains

#### Scenario: Pre-rename failure
- GIVEN invalid schema, journal/temp write or fsync failure, helper early exit, or pre-rename CAS mismatch
- WHEN enrollment aborts
- THEN it returns `ABORTED` or the named deterministic error, removes only proven known temporary residue, and leaves source bytes byte-identical

### Requirement: Post-rename uncertainty and automatic source/target proof recovery

Any failure after target rename, including target-directory fsync, journal rename, journal fsync, helper/worker crash, or final directory fsync, MUST return `CT_REGISTRY_COMMIT_UNCERTAIN` with exact target evidence and MUST NOT claim ordinary abort or durable success. The next compliant operation MUST acquire the same canonical lock and automatically inspect the validated journal and known residue. If current CAS equals source, it MAY remove only proven residue and return `ABORTED_RETRYABLE`; if current CAS equals target, it MUST complete required durability/finalization and return `COMMITTED,replayed:true`. Any other CAS, malformed/foreign journal, unknown residue, or unsafe owner/path evidence MUST return `CT_REGISTRY_RECOVERY_REQUIRED` without mutation. This is automatic proof recovery, not manual stale-lock recovery; no command MAY delete a stale guard because it appears old or its PID appears dead.

#### Scenario: Commit rename then target-directory fsync failure
- GIVEN target rename succeeded and target-directory fsync failed
- WHEN the caller receives the result and the next operation recovers
- THEN the first result is uncertain, the next lock holder proves source/target, and it returns only `ABORTED_RETRYABLE`, `COMMITTED,replayed:true`, or recovery-required

#### Scenario: Commit journal rename or journal fsync failure
- GIVEN target rename and directory fsync succeeded but journal rename or journal fsync fails
- WHEN recovery runs under the canonical lock
- THEN it preserves evidence, proves source/target, and never reports an ordinary abort

#### Scenario: Commit final-directory fsync failure
- GIVEN target and journal finalization completed but final directory fsync fails
- WHEN recovery runs
- THEN it replays durability/finalization only from validated evidence and returns deterministic uncertainty/recovery results

#### Scenario: Ambiguous recovery evidence
- GIVEN current CAS matches neither source nor target, or residue/journal is malformed, foreign, or unknown
- WHEN automatic recovery runs
- THEN it returns `CT_REGISTRY_RECOVERY_REQUIRED`, performs no cleanup, and preserves every byte and the permanent inode

### Requirement: Guarded rollback and rollback crash windows

Rollback MUST acquire the same canonical lock and require current CAS exactly equal to the journal target CAS with no revision advance. It MUST create, fsync, and close a rollback temp from captured prior bytes, then rename it (or unlink only when prior state was absent) and fsync the directory. The rollback journal and source/target evidence MUST remain sufficient for automatic proof recovery. A mismatch MUST return `CT_REGISTRY_ROLLBACK_CAS_MISMATCH` without mutation. Enrollment and rollback MUST NOT overlap.

#### Scenario: Safe rollback
- GIVEN a validated rollback journal and current target CAS exactly matches
- WHEN rollback completes
- THEN prior bytes or prior absence is restored durably under the canonical lock and the permanent guard remains

#### Scenario: Rollback pre-rename failure
- GIVEN rollback temp write/fsync failure or a target CAS mismatch before rollback rename/unlink
- WHEN rollback aborts
- THEN it returns the fixed error, leaves registry bytes unchanged, and removes only proven temporary residue

#### Scenario: Rollback rename/unlink then directory-fsync failure
- GIVEN rollback rename or prior-absence unlink succeeded but directory fsync fails
- WHEN the next operation recovers
- THEN it returns uncertainty first and then proves source/target under the same lock before `ROLLED_BACK,replayed:true` or recovery-required

#### Scenario: Rollback finalization failure
- GIVEN rollback directory fsync succeeded but journal finalization or final directory fsync fails
- WHEN automatic recovery runs
- THEN it never guesses, never deletes the permanent guard, and returns only a proof-based replay or recovery-required result

### Requirement: Complete non-mutation proof

A successful Support report MUST include the canonical report, `read_trace_v1`, and `witness_v1`; all database-derived surfaces and `tower.db`, `tower.db-wal`, and `tower.db-shm` projections MUST be equal before and after. Support MUST never call `core.open()`, register, acquire the registry writer lock, consume, deliver, mutate state/Git, or create execution resources.

#### Scenario: Complete proof
- GIVEN all fixed reads succeed, the trace is allowlisted, and every surface digest is equal
- WHEN Support returns
- THEN the witness proves zero Support-attributed mutation across registry, filesystem, Git, DB files, queue, locks, delivery, workers, sessions, and worktrees

#### Scenario: Proof failure
- GIVEN any forbidden operation, changed digest, created sidecar, or incomplete capture
- WHEN Support finalizes
- THEN it returns the prescribed mutation/race/indeterminate error and never reports stable success
