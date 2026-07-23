# Design: Autonomous Continuation — Control Tower

## Technical Approach

Slice 1 adds only an owner-provisioned authority anchor and additive schema version 1. Later slices extend the host-neutral SQLite authority, then add one host-neutral polling/wake controller and thin OpenCode, Pi, and Claude adapters. Continuation remains `OFF`; `ACTIVE`, legacy tables/rows, eight MCP tools, and fail-closed behavior remain unchanged until their named slices. Revision 11 specs remain authoritative.

## Slice 1 Authority Contract

`<git-common-dir>/control-tower/main_authority_anchor_v1.json` is the sole persisted canonical-Main configuration; there is no caller-controlled secondary config. Before first write, `torre provision-main --repo PATH --request-identity UUID --expected-config-digest sha256:HEX` derives configuration from `PATH`, not request claims. `install.sh --provision-main ...` delegates to that CLI; ordinary installation provisions nothing.

`deriveCanonicalMainContext(cwd)` runs Git via argument arrays: absolute `--git-common-dir`, `worktree list --porcelain -z`, each candidate’s `--absolute-git-dir`, and Main’s `symbolic-ref --short HEAD`. The unique candidate whose Git dir equals the common dir is Main. `realpath` then `normalize` produces absolute, separator-trimmed, case-sensitive `canonical_repo=main_worktree`, `git_common_dir`, and `main_worktree`; branch is the exact short ref (detached/ambiguous fails); `trusted_uid=process.geteuid()`. Runtime freshly derives `Ctx`; its current worktree/branch are server values. Anchor values are comparison targets. Caller actor, role, session, UID, branch, or path fields are forbidden and ignored for authority. This works identically when CLI starts in a linked worktree.

Anchor path predicates are exact. `git_common_dir` is an absolute `realpath`; its final entry MUST be an actual directory, never a symlink. `<git_common_dir>/control-tower` is either absent or an `lstat`-verified directory owned by `trusted_uid` with mode exactly `0700`. The anchor is either absent or an `lstat`-verified regular file owned by `trusted_uid`, mode exactly `0600`, and `nlink=1`. The temporary and final anchor names are opened relative to the verified runtime directory with no-follow/exclusive semantics; a failed predicate is non-mutating. Directory link count is not constrained. Parent directories above `git_common_dir` are outside the anchor ownership predicate.

The canonical JSON (JCS plus newline) has exactly:

```text
{kind:"main_authority_anchor_v1",version:1,anchor_id,anchor_secret,anchor_epoch:1,
 context:{canonical_repo,git_common_dir,main_worktree,branch,trusted_uid},config_digest,
 provision_request_identity,provision_request_digest,created_at}
```

`config_digest` hashes UTF-8 JCS of `context`; `provision_request_digest` hashes UTF-8 JCS of the two request fields. `created_at` is UTC RFC3339 milliseconds. `anchor_id` and secret are independent base64url(no-padding) 32-byte CSPRNG values; only raw `anchor_secret` is secret and never returned/stored in SQLite. The runtime directory and file must be owned by `trusted_uid`, real single-link entries, and exactly `0700`/`0600`; every existing component from resolved common dir is `lstat`-checked. Provisioning refuses unsafe or mismatching state. Creation uses a sibling `wx`/`0600` temporary, complete write, file `fsync`, atomic no-replace rename, directory `fsync`; failure removes only the temporary. Exact safe replay performs no write.

## Migration 001

> **Frozen Slice 1 history.** The text and SQL below describe the approved Slice 1 target and remain as review evidence. The P2 correction at the end of this document identifies a real forward-compatibility defect in its two `CHECK(... = 1)` constraints. P2 MUST NOT start until prerequisite P1-FC replaces those two constraints in fresh-install Migration 001, reruns Slice 1 verification, and receives a bounded re-judgment. No old-version database is rewritten in place.

`core.mjs` owns immutable LF-normalized `MIGRATION_001_SQL`; `ddl_checksum` is `sha256:<lowercase hex>` over its UTF-8 bytes with exactly one terminal LF. Bootstrap first verifies the unchanged Plan A objects `agent`, `message`, `message_pending`, and `lock`. Version `0` means no `ct_*` object; any partial/unknown object is drift.

Migration 001 SQL bytes are exactly the following code block encoded as UTF-8 with LF line endings and one terminal LF:

```sql
CREATE TABLE ct_schema_migration (
  version INTEGER PRIMARY KEY CHECK(version = 1),
  ddl_checksum TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);
CREATE TABLE ct_continuation_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  anchor_id TEXT NOT NULL UNIQUE,
  anchor_epoch INTEGER NOT NULL CHECK(anchor_epoch = 1),
  anchor_secret_digest TEXT NOT NULL,
  config_digest TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK(schema_version = 1),
  mode TEXT NOT NULL DEFAULT 'OFF' CHECK(mode IN ('OFF', 'ON', 'ROLLING_BACK'))
);
CREATE TABLE ct_idempotency (
  operation TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  request_identity TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  cas_digest TEXT NOT NULL,
  response_json TEXT NOT NULL,
  committed_at TEXT NOT NULL,
  PRIMARY KEY (operation, scope_key),
  UNIQUE (operation, request_identity)
);
```

Schema validation runs this exact filter and ordering:

```sql
SELECT type, name, tbl_name, sql
FROM sqlite_master
WHERE name IN ('agent','message','message_pending','lock',
               'ct_schema_migration','ct_continuation_state','ct_idempotency')
   OR (name GLOB 'ct_*' AND name NOT LIKE 'sqlite_%')
ORDER BY type, name;
```

Version 0 requires exactly the four Plan A rows and zero `ct_*` rows. Version 1 requires those four rows plus exactly the three named `ct_*` tables; any extra `ct_*` table/index/trigger/view, missing row, type/name/table mismatch, or SQL mismatch is drift. One `BEGIN IMMEDIATE` validates anchor/config/SHA-256 secret digest, creates all three tables, inserts migration/state (`mode='OFF'`)/bootstrap-idempotency rows, re-reads the anchor identity/hash, and commits. No `ALTER`, `DROP`, or legacy row update occurs. DDL/insert/check failure rolls back every Slice 1 object/row; pre-existing legacy bytes remain. Later binding, lifecycle, delivery, evidence, lease, rollback, polling tables/columns are additive and absent; `ON`/`ROLLING_BACK` values are reserved only.

## APIs, CAS, and Failures

`provisionMainAuthorityAnchor({request_identity,expected_config_digest})` is core-backed CLI-only filesystem persistence; `bootstrapAdmin({request_identity,expected_anchor_id,expected_schema_version,target_schema_version,expected_mode:"OFF"})` is core-backed CLI-only SQLite persistence. Neither is MCP-exposed. Responses are exactly `{anchor_id,anchor_epoch,state:"PROVISIONED",replayed}` and `{anchor_id,schema_version,mode:"OFF",replayed}`.

Canonical UUID identity grants no authority. Provision request digest is SHA-256 over JCS `{request_identity,expected_config_digest}` and provision replay compares the persisted operation identity, request digest, and derived config digest. Bootstrap uses operation/scope `bootstrapAdmin/admin-bootstrap`; its request digest is SHA-256 over JCS `{request_identity,expected_anchor_id,expected_schema_version,target_schema_version,expected_mode}` and its CAS digest is SHA-256 over JCS `{expected_anchor_id,expected_schema_version,target_schema_version,expected_mode,derived_anchor_epoch:1,derived_config_digest}`. After integrity/authority checks, exact operation+scope+identity+request+CAS digest replays stored `response_json` with only `replayed:true`; any changed tuple or new identity after this single-use transition is `CT_IDEMPOTENCY_CONFLICT`. First bootstrap CAS is schema `0→1`, mode `OFF→OFF`; any other target is `CT_SCHEMA_INVALID`.

Evaluation order is anchor safety/config, schema manifest/checksum, committed idempotency tuple, CAS, then bounded writer acquisition. Mapping is deterministic and non-mutating: malformed/unresolvable Git/config, unsafe owner/mode/type/link, atomic-create collision, or config/existing-anchor mismatch → `CT_ANCHOR_MISMATCH`; missing bootstrap anchor → `CT_ANCHOR_REQUIRED`; schema version/checksum/object/SQL drift, invalid target, or DDL failure → `CT_SCHEMA_INVALID`; mode/epoch CAS mismatch → `CT_FENCE_MISMATCH`; committed tuple conflict → `CT_IDEMPOTENCY_CONFLICT`; SQLite busy/locked after the bounded wait → `CT_BUSY`. Unknown filesystem or SQLite failures retain their original cause and create no Slice 1 object.

## Host-Neutral Loop and Adapters

`host/loop.mjs` owns the CT-R5 state machine only: bind one proven root, start one poller after the host root settles, use non-consuming peek, enforce wake throttling, serialize wake attempts, and synchronously mark the controller disposed before any later wake/receive callback can run. It depends on injected `{peek,wake,schedule,cancel,trace}` ports and imports no host SDK or SQLite implementation. Consumption remains in the guarded receive/claim APIs, never in lifecycle callbacks.

Adapters are thin mappings:

| Host | Start/settled signal | Terminal signal | Wake primitive |
|---|---|---|---|
| OpenCode | root `session.idle` | root `session.deleted` or plugin `dispose` | `client.session.promptAsync` |
| Pi | root `agent_settled` with `ctx.isIdle()` | `session_shutdown` | `pi.sendMessage(...,{deliverAs:"followUp",triggerTurn:true})` |
| Claude | `Stop` command hook | `SessionEnd` | bounded command hook with `asyncRewake:true`; exit 2 only after a pending peek |

OpenCode child sessions are identified by `parentID`; Pi adapter instances bind only their current root session; Claude subagent/teammate hook inputs are ignored. Each adapter supplies stable host/root/process evidence to registration, refuses ambiguous identity, and runs the unchanged CT-R5 scenarios. A host-specific wake failure leaves delivery pending and restarts only through the controller’s bounded retry policy.

## Versioned Runtime and Cutover

`scripts/publish-runtime.mjs` stages one immutable candidate at `~/.local/share/opencode/control-tower/releases/<git-sha>.tmp-<nonce>`, copies only the allowlisted runtime manifest, records SHA-256/mode metadata, runs isolated MCP/CLI/adapter checks with Tower OFF, fsyncs files/directories, then renames to `releases/<git-sha>`. Existing release bytes must match or publication fails. Only a verified release may atomically replace the `current` symlink through a sibling temporary symlink and rename.

Host configuration updates are a later explicit cutover: OpenCode points MCP/plugin paths at `current`; Pi installs a global extension that imports from `current`; Claude installs plugin hooks/scripts that resolve `current`. Every config is backed up and semantically diff-checked before replacement. `~/.config/opencode/control-tower` is neither modified nor removed until all three host probes pass from `current`; rollback restores config backups and the prior `current` target.

## Ownership, Tests, and Rollback

`core.mjs`: derivation, safe anchor IO, admin open, migration/checksum/CAS and later host-neutral authority. `host/loop.mjs`: host-neutral CT-R5 controller. `bin/torre`: `main-config`, `provision-main`, `bootstrap-admin` and strict flags. `install.sh`: explicit versioned publication/cutover delegation only. `plugin/tower-spike.js`, `adapters/pi/`, `adapters/claude/`: host mappings only. `test/helpers/tower-fixture.mjs`: temporary main+linked worktrees and runtime roots; no environment authority override. `test/migration.test.mjs` owns CT-R8-S1/S3/S4, unsafe-file, replay/conflict, DDL rollback, legacy-preservation, inert named-path, and relative/absolute/`git -C` RED cases. CT-R8-S2 belongs to identity/mode; CT-R8-S5 belongs to Main/API. `test/host-adapters.test.mjs` runs CT-R5 for all three adapters. Actual Tower stays OFF; P0 snapshots prove no actual DB/anchor/`ACTIVE` mutation.

| Threat boundary | Applicability / RED |
|---|---|
| Documentation-like paths | Applicable: one inert/fail-closed RED each for `requirements.txt`, `CMakeLists.txt`, executable MD/MDX, `README.sh` |
| Git repository selection | Applicable: relative, absolute, and `git -C` derive identical fingerprints or fail unchanged |
| Commit | N/A: no slice creates a commit |
| Push | N/A: no slice contacts a remote |
| PR | N/A: no slice creates or updates a PR |

Rollback reverts only the current slice code/tests. Additive `ct_*` tables and anchor remain inert and OFF rather than being destructively down-migrated; legacy continues. Adapter rollback removes only that adapter while the host-neutral authority remains intact. Publication rollback restores the prior `current` target and config backups. Until later slices, `bootstrapMain`, activation, continuation status/identity, handoffs, delivery/claim, attestation, recovery/rollback, polling, and all continuation MCP tools are unavailable; `start` never exists.

---

# P2 Design Correction: Trusted Identity and Additive Schema

## Decision summary

P2 is implementation-ready only after a bounded P1-FC prerequisite. There is **no purely additive upgrade from the already-approved Migration 001 schema**: SQLite cannot broaden `CHECK(version = 1)` or `CHECK(schema_version = 1)` with `ALTER TABLE`, and rebuilding either table would be a destructive table replacement. Because no runtime was published or bootstrapped in the actual Tower, the smallest safe correction is to fix Migration 001 for fresh installations, reject databases carrying its superseded checksum, re-run all Slice 1 tests, and re-judge only that correction. P2 then applies byte-defined Migration 002 additively.

P2 adds a capability-based, server-owned `Ctx` ingress and internal continuation dispatch. It does not publish continuation MCP tools. The eight legacy MCP tools and the legacy core calls `register(handle, role)` and consuming `receive(handle)` remain byte-for-byte behaviorally unchanged.

## P1-FC prerequisite: fresh-install forward compatibility

P1-FC changes exactly two SQL predicates in the frozen Migration 001 byte stream:

```sql
CREATE TABLE ct_schema_migration (
  version INTEGER PRIMARY KEY CHECK(version >= 1),
  ddl_checksum TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);
CREATE TABLE ct_continuation_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  anchor_id TEXT NOT NULL UNIQUE,
  anchor_epoch INTEGER NOT NULL CHECK(anchor_epoch = 1),
  anchor_secret_digest TEXT NOT NULL,
  config_digest TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK(schema_version >= 1),
  mode TEXT NOT NULL DEFAULT 'OFF' CHECK(mode IN ('OFF', 'ON', 'ROLLING_BACK'))
);
CREATE TABLE ct_idempotency (
  operation TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  request_identity TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  cas_digest TEXT NOT NULL,
  response_json TEXT NOT NULL,
  committed_at TEXT NOT NULL,
  PRIMARY KEY (operation, scope_key),
  UNIQUE (operation, request_identity)
);
```

The code block is UTF-8, LF-only, with exactly one terminal LF and no leading or trailing blank line. `MIGRATION_001_CHECKSUM` is the lowercase `sha256:` digest of those exact bytes and MUST be generated from the constant, then pinned independently by the RED test. The old approved checksum `sha256:47f63b10e516ac977e1cc26723b064eb037a4a2cdb84246b1c183903b909eb41` becomes the explicit `SUPERSEDED_MIGRATION_001_CHECKSUM` detection value.

P1-FC does not migrate an existing old-checksum database. Schema inspection returns `CT_SCHEMA_INVALID` non-mutating with an internal reason of `SUPERSEDED_MIGRATION_001`; neither `DROP`, table rename, copy, nor delete is permitted. Isolated fixtures may be discarded and recreated. If any non-fixture old-checksum database is discovered, P2 stops for an owner-approved export/reprovision plan; this design makes no automatic conversion claim.

Version-specific manifest validation replaces the former “three objects forever” rule:

| Schema | Required `ct_*` objects | Migration rows | State |
|---|---|---|---|
| 0 | none | none | none |
| 1 | exactly `ct_schema_migration`, `ct_continuation_state`, `ct_idempotency` | exactly corrected v1 checksum | `schema_version=1`, `mode=OFF` during P1 bootstrap validation |
| 2 | exact v1 objects plus the Migration 002 objects below | exactly corrected v1 and exact v2 checksums | `schema_version=2`; mode/lease consistency validated separately |

Unknown, missing, wrong-type, wrong-`tbl_name`, or SQL-mismatching `ct_*` objects remain `CT_SCHEMA_INVALID`. The Plan A four-object manifest remains exact and unchanged.

### P1-FC workload and rollback

P1-FC may edit only `core.mjs`, the Migration 001 block/tests in `test/migration.test.mjs`, this design/tasks evidence, and its new bounded Judgment Day evidence. It must preserve all P0/P1 checkmarks and the original Slice 1 ledger. It is a prerequisite work unit with its own ≤400 authored-line target and re-judgment; it is not folded into P2. Rollback reverts only P1-FC and consequently leaves P2 blocked. No database down-migration is part of rollback.

## Trusted `Ctx` ingress

### Capability boundary

P2 introduces a host-neutral continuation dispatcher constructed once with two non-request capabilities:

```text
createContinuationDispatcher({cwd, trustedMetadata, processIdentity})
trustedMetadata.snapshot() -> {
  host_process_instance,
  plugin_instance,
  root_session_id,
  binding_epoch
}
processIdentity.snapshot() -> {
  mcp_process_instance,
  pid_start_marker
}
dispatch(operation, request?) -> exact Revision 11 result/error
```

The dispatcher closes over both providers. `dispatch` accepts only an operation and its domain request; it has no `ctx`, actor, role, session, UID, repository, path, branch, process, PID marker, or epoch override parameter. It passes a closed, single-use context factory—not metadata values—to the core operation. After the core has validated schema/anchor and the persisted mode/lease gate, it invokes that factory exactly once inside the operation snapshot, copies primitive provider values, derives the remaining fields, creates a null-prototype object, and recursively freezes it before actor/binding evaluation. Provider mutation after the snapshot cannot change that call's `Ctx`; OFF/ROLLING_BACK precedence does not depend on untrusted or unavailable session metadata.

`trustedMetadata` is a constructor capability supplied by a host adapter in P7–P9, not an environment variable, command-line flag, stdio field, MCP tool argument, or database value. `processIdentity` is server-owned: the MCP process creates a fresh 32-byte base64url `mcp_process_instance` at process start and obtains `pid_start_marker` from an injected read-only OS process probe. After schema/mode precedence, a provider failure, ambiguous root, detached branch, invalid format, or changed process observation returns `CT_SESSION_ISOLATION_UNPROVEN` before actor/binding/idempotency/delivery data is read or changed.

P2 tests use a fixture-only provider passed directly to the constructor. Production `mcp.mjs` is constructed without `trustedMetadata`, so it lists and dispatches only the existing eight legacy tools. A continuation MCP operation cannot be listed or called until a P7–P9 adapter supplies the capability. This is cooperative same-UID isolation, not protection from a malicious local process importing code or replacing the adapter.

### Field ownership and derivation

| Immutable `Ctx` field | Sole source |
|---|---|
| `effective_uid` | `process.geteuid()` at dispatch; non-negative safe integer |
| `canonical_repo` | realpath of the anchor's canonical Main worktree |
| `git_common_dir` | realpath from `git rev-parse --path-format=absolute --git-common-dir`, equal to anchor context |
| `worktree` | realpath from `git rev-parse --show-toplevel` for constructor `cwd`; it must share `git_common_dir` |
| `branch` | exact non-empty short symbolic ref of `worktree`; detached or ambiguous fails |
| `host_process_instance` | host adapter capability snapshot |
| `plugin_instance` | host adapter capability snapshot |
| `root_session_id` | host adapter capability snapshot after root proof |
| `mcp_process_instance` | one server-generated base64url(no-padding) 32-byte value per MCP process |
| `pid_start_marker` | server OS-probe observation for the MCP PID, stable across the process lifetime |
| `binding_epoch` | host adapter's fenced state, initially `0`, then only the last committed registration epoch accepted by that adapter |

Opaque host/process/session strings are 1–256 UTF-8 bytes, contain no NUL, and are compared byte-for-byte. `pid_start_marker` is 1–128 UTF-8 bytes. Derived paths are non-empty, NUL-free absolute normalized realpaths; branch is 1–255 UTF-8 bytes and NUL-free. `binding_epoch` is a non-negative safe integer. The provider must not derive any value from tool arguments. Request keys named `ctx`, `actor`, `role`, `session`, or any of the eleven `Ctx` members are forbidden and map to `CT_PAYLOAD_INVALID`; they never participate in authority. SQLite `CHECK`s enforce structural non-emptiness and fixed identifier/digest/timestamp lengths; the transaction's row validator additionally enforces UTF-8 byte limits, NUL absence, canonical UUID/base64url/lowercase-SHA-256/RFC3339 syntax, and path/anchor equality on every read.

## Internal and public dispatch boundaries

There is no overload by arity, argument type, or continuation mode.

| Boundary | Exact call/name | P2 visibility |
|---|---|---|
| Legacy core | `register(handle, role)` | unchanged |
| Legacy core | `receive(handle)` | unchanged and consuming |
| Legacy MCP | `tower_register`, `tower_receive`, and the other six current tools | unchanged/listed |
| Continuation core | `continuationRegister(handle, ctx, request)` | new internal export |
| Continuation core | `continuationReceive(handle, ctx)` | new internal export; non-consuming |
| Continuation dispatcher | operation `register` with one request; operation `receive` with no request | implemented and fixture-tested, not publicly listed |
| Eventual adapter-enabled MCP | exact continuation operation names from Revision 11 | unavailable until adapter capability exists |

The continuation dispatcher owns one explicit routing table whose eventual key set is exactly `provisionMainAuthorityAnchor`, `bootstrapAdmin`, `bootstrapMain`, `activate`, `register`, `create`, `validate`, `publish`, `receive`, `claim`, `ack`, `attestCompletion`, `complete`, `reject`, `revise`, `recover`, `beginRollback`, `rebindMain`, `finishRollback`, `status`. `start` is absent. `provisionMainAuthorityAnchor` and `bootstrapAdmin` remain enabled only on the CLI/admin transport even though they are members of the aggregate Revision 11 API. P2 populates only the internal `register` and `receive` handlers; unsupported continuation operations are not advertised. P3–P6 fill the same table, and P7–P9 enable adapter-backed publication without renaming it.

`mcp.mjs` keeps `LEGACY_TOOLS` and `CONTINUATION_TOOLS` as disjoint maps. Legacy lookup is always by the existing `tower_*` name. Once and only once a trusted adapter capability exists, `tools/list` appends the implemented runtime continuation names exactly as written above (excluding the two CLI-only admin operations), and `tools/call` dispatches those exact unprefixed names only through the continuation map. Before that gate, a direct call such as name `register` is the same unknown-tool result as any unlisted name. A continuation handler can never fall through to the legacy switch, and a `tower_*` handler can never enter continuation dispatch.

Argument-free means the continuation `receive` route rejects any non-empty argument object with `CT_PAYLOAD_INVALID`. This never reaches the legacy switch. Legacy dispatch continues to call `tower.register(handle, args.role)` and `tower.receive(handle)` exactly as today.

## Migration 002: identity, rollback epoch, and lease foundation

`MIGRATION_002_SQL` is the following UTF-8 byte stream with LF line endings and exactly one terminal LF:

```sql
CREATE TABLE ct_claimant_binding (
  binding_id TEXT PRIMARY KEY CHECK(length(binding_id) = 43),
  effective_uid INTEGER NOT NULL CHECK(effective_uid >= 0),
  canonical_repo TEXT NOT NULL CHECK(length(canonical_repo) > 0),
  git_common_dir TEXT NOT NULL CHECK(length(git_common_dir) > 0),
  worktree TEXT NOT NULL CHECK(length(worktree) > 0),
  branch TEXT NOT NULL CHECK(length(branch) > 0),
  host_process_instance TEXT NOT NULL CHECK(length(host_process_instance) > 0),
  plugin_instance TEXT NOT NULL CHECK(length(plugin_instance) > 0),
  root_session_id TEXT NOT NULL CHECK(length(root_session_id) > 0),
  mcp_process_instance TEXT NOT NULL CHECK(length(mcp_process_instance) > 0),
  pid_start_marker TEXT NOT NULL CHECK(length(pid_start_marker) > 0),
  binding_epoch INTEGER NOT NULL CHECK(binding_epoch > 0),
  binding_status TEXT NOT NULL CHECK(binding_status IN ('ACTIVE', 'RETIRED', 'MULTIPLEXED')),
  identity_digest TEXT NOT NULL UNIQUE CHECK(length(identity_digest) = 71),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  ended_at TEXT,
  CHECK((binding_status = 'ACTIVE' AND ended_at IS NULL) OR
        (binding_status IN ('RETIRED', 'MULTIPLEXED') AND ended_at IS NOT NULL)),
  UNIQUE(effective_uid, canonical_repo, git_common_dir, plugin_instance, binding_epoch)
);
CREATE UNIQUE INDEX ct_claimant_binding_one_active
ON ct_claimant_binding(effective_uid, canonical_repo, git_common_dir, plugin_instance)
WHERE binding_status = 'ACTIVE';
CREATE INDEX ct_claimant_binding_context_lookup
ON ct_claimant_binding(effective_uid, canonical_repo, git_common_dir, plugin_instance,
                       binding_status, binding_epoch);
CREATE TABLE ct_claimant_conflict (
  conflict_id TEXT PRIMARY KEY CHECK(length(conflict_id) = 43),
  plugin_scope_digest TEXT NOT NULL CHECK(length(plugin_scope_digest) = 71),
  incumbent_binding_id TEXT NOT NULL CHECK(length(incumbent_binding_id) = 43),
  attempted_binding_id TEXT NOT NULL CHECK(length(attempted_binding_id) = 43),
  incumbent_identity_digest TEXT NOT NULL CHECK(length(incumbent_identity_digest) = 71),
  attempted_identity_digest TEXT NOT NULL CHECK(length(attempted_identity_digest) = 71),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  conflict_digest TEXT NOT NULL UNIQUE CHECK(length(conflict_digest) = 71),
  detected_at TEXT NOT NULL CHECK(length(detected_at) = 24),
  CHECK(incumbent_binding_id <> attempted_binding_id),
  CHECK(incumbent_identity_digest <> attempted_identity_digest)
);
CREATE INDEX ct_claimant_conflict_scope_history
ON ct_claimant_conflict(plugin_scope_digest, detected_at, conflict_id);
CREATE TRIGGER ct_claimant_conflict_no_update
BEFORE UPDATE ON ct_claimant_conflict
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_CONFLICT');
END;
CREATE TRIGGER ct_claimant_conflict_no_delete
BEFORE DELETE ON ct_claimant_conflict
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_CONFLICT');
END;
CREATE TABLE ct_rollback_lease (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  rollback_epoch INTEGER NOT NULL DEFAULT 0 CHECK(rollback_epoch >= 0),
  lease_status TEXT NOT NULL DEFAULT 'NONE' CHECK(lease_status IN ('NONE', 'ACTIVE', 'EXPIRED')),
  lease_version INTEGER NOT NULL DEFAULT 0 CHECK(lease_version >= 0),
  owner_main_binding_id TEXT,
  lease_expires_at TEXT,
  CHECK((lease_status = 'NONE' AND owner_main_binding_id IS NULL AND lease_expires_at IS NULL) OR
        (lease_status IN ('ACTIVE', 'EXPIRED') AND owner_main_binding_id IS NOT NULL AND lease_expires_at IS NOT NULL))
);
```

`MIGRATION_002_CHECKSUM` is `sha256:<lowercase hex>` over exactly those bytes. The implementation computes it from the immutable constant; `test/migration.test.mjs` independently pins its byte length and digest. No checksum is accepted by configuration or request.

The exact v2 `ct_*` manifest is the three v1 tables plus tables `ct_claimant_binding`, `ct_claimant_conflict`, `ct_rollback_lease`; indexes `ct_claimant_binding_one_active`, `ct_claimant_binding_context_lookup`, `ct_claimant_conflict_scope_history`; and triggers `ct_claimant_conflict_no_update`, `ct_claimant_conflict_no_delete`. No other `ct_*` object is valid at schema 2. The migration table contains exactly versions `1` and `2`, each with its computed checksum.

### Migration transaction and bootstrap CAS

P2 extends CLI-only `bootstrapAdmin` with one legal transition: `{expected_schema_version:1,target_schema_version:2,expected_mode:"OFF"}`. Its operation/scope is `bootstrapAdmin/schema:1->2`; the historical v1 scope remains `bootstrapAdmin/admin-bootstrap`. Request and CAS digests are:

```text
request_digest = SHA-256(UTF8(JCS({
  request_identity, expected_anchor_id,
  expected_schema_version:1, target_schema_version:2, expected_mode:"OFF"
})))
cas_digest = SHA-256(UTF8(JCS({
  expected_anchor_id, expected_schema_version:1,
  target_schema_version:2, expected_mode:"OFF",
  derived_anchor_epoch:1, derived_config_digest,
  expected_rollback_epoch:0, expected_lease_version:0,
  expected_lease_status:"NONE"
})))
```

After anchor safety and a `BEGIN IMMEDIATE` writer acquisition, evaluation is exact: inspect the version-specific legacy/continuation manifest. If schema is 2, require the exact committed `bootstrapAdmin/schema:1->2` identity/request/CAS tuple, validate anchor/state/lease, and replay; a missing or changed tuple is `CT_IDEMPOTENCY_CONFLICT`. If schema is 1, require no committed v2 scope row, corrected v1 checksum, matching anchor/config, mode `OFF`, and request CAS; then execute `MIGRATION_002_SQL` → insert singleton lease `(1,0,'NONE',0,NULL,NULL)` → update exactly one continuation-state row `schema_version 1→2` → insert migration row `(2,MIGRATION_002_CHECKSUM,applied_at)` → insert the idempotency response → reread anchor bytes and validate exact v2 manifest/state/lease → commit. Any other schema is `CT_SCHEMA_INVALID`. The response is exactly `{anchor_id,schema_version:2,mode:"OFF",replayed}`.

DDL, seed, update-count, checksum, or validation failure rolls back all v2 objects/rows and maps to `CT_SCHEMA_INVALID`; a committed tuple mismatch maps to `CT_IDEMPOTENCY_CONFLICT`; anchor mismatch, CAS mismatch, and bounded lock failure map to the existing `CT_ANCHOR_*`, `CT_FENCE_MISMATCH`, and `CT_BUSY` errors. No legacy row or v1 object is altered except the intended `schema_version` update and new migration/idempotency rows.

## Registration data flow and digests

`register` accepts exactly `{request_identity,expected_binding_epoch,expected_binding_state}` with canonical UUID `request_identity`, safe-integer epoch, `expected_binding_state` in `ABSENT|ACTIVE`, and no additional keys.

```text
plugin_scope = {
  effective_uid, canonical_repo, git_common_dir, plugin_instance
}
ctx_identity_tuple = {
  effective_uid, canonical_repo, git_common_dir, worktree, branch,
  host_process_instance, plugin_instance, root_session_id,
  mcp_process_instance, pid_start_marker, binding_epoch
}
target_identity_tuple = {
  ...ctx_identity_tuple, binding_epoch: expected_binding_epoch + 1
}
plugin_scope_digest = SHA-256(UTF8(JCS(plugin_scope)))
ctx_identity_digest = SHA-256(UTF8(JCS(ctx_identity_tuple)))
target_identity_digest = SHA-256(UTF8(JCS(target_identity_tuple)))
request_digest = SHA-256(UTF8(JCS({
  request_identity, expected_binding_epoch, expected_binding_state
})))
cas_digest = SHA-256(UTF8(JCS({
  plugin_scope_digest, ctx_identity_digest, target_identity_digest,
  expected_binding_epoch, expected_binding_state,
  mode:"ON", observed_rollback_epoch, observed_lease_version,
  observed_lease_status:"NONE"
})))
scope_key = "claimant:" + plugin_scope_digest + ":epoch:" +
            decimal(expected_binding_epoch + 1)
```

The persisted binding row uses `target_identity_digest`, because its epoch is the returned epoch; `ctx_identity_digest` fences the ingress that requested the transition. `binding_id`, attempted `binding_id`, and `conflict_id` are independent base64url(no-padding) 32-byte CSPRNG values. `conflict_digest` is SHA-256 over JCS `{plugin_scope_digest,incumbent_binding_id,attempted_binding_id,incumbent_identity_digest,attempted_identity_digest:target_identity_digest,request_identity,request_digest,cas_digest}`. Timestamps are UTC RFC3339 milliseconds. The epoch-qualified `scope_key` allows later rebinds while the existing `UNIQUE(operation,request_identity)` still prevents one identity from naming two registration transitions.

One `BEGIN IMMEDIATE` transaction evaluates: exact v2 schema/anchor → mode and lease (`ON`, any persisted non-negative rollback epoch, lease `NONE`) → immutable ingress validity → committed idempotency outcome → plugin-scope binding set → expected epoch/state CAS → same-root or different-root decision. The transaction snapshots `observed_rollback_epoch` and `observed_lease_version` from the singleton lease row into the CAS digest; callers never supply them. P2 fixtures begin at epoch/version `0`, while later post-rollback ON operation remains possible at a higher observed epoch/version.

- **First registration:** requires Ctx epoch `0` and request `ABSENT/0`; inserts one epoch-1 ACTIVE row and idempotency success.
- **Same-root rebind:** requires exactly one ACTIVE row, Ctx/request epoch `E`, request state `ACTIVE`, and equality of UID/repository/common-dir/worktree/branch/host/plugin/root. MCP instance and PID marker must differ from the incumbent. It retires the incumbent, inserts one epoch `E+1` ACTIVE row, and commits one success.
- **Different-root registration:** only after exact ACTIVE/E CAS, it changes the incumbent to `MULTIPLEXED`, inserts the attempted epoch `E+1` row as `MULTIPLEXED`, appends one immutable conflict row, and stores an idempotent exceptional outcome. It commits, then returns `CT_SESSION_MULTIPLEXED`. Exact retry returns the same error without another row; no ACTIVE row remains.
- **Already multiplexed:** returns `CT_SESSION_MULTIPLEXED` non-mutating unless replaying the exact committed conflict outcome.
- **Stale/malformed/duplicate state:** returns `CT_FENCE_MISMATCH`, `CT_SESSION_ISOLATION_UNPROVEN`, or `CT_SESSION_MULTIPLEXED` as applicable. A constraint error is re-read under the writer lock and mapped to one of those stable errors; raw SQLite constraint text is never public.

Success is exactly `{binding_id,binding_epoch,binding_status:"ACTIVE",replayed}`. Stored exceptional idempotency JSON is exactly `{error:"CT_SESSION_MULTIPLEXED"}` and is never returned as a success response.

“Same root” is the full equality predicate above excluding only MCP instance, PID marker, and epoch. Caller data cannot turn a different root into a same-root rebind.

## Non-consuming continuation receive

Continuation `receive` accepts no request object. One read-only deferred SQLite transaction provides a single snapshot while it validates exact v2 schema/anchor, mode/lease, and the immutable `Ctx`, then queries the plugin scope. It never acquires an IMMEDIATE writer lock.

1. Mode `OFF` → `CT_CONTINUATION_OFF`; `ROLLING_BACK` → `CT_ROLLBACK_IN_PROGRESS`.
2. Any conflict history or any `MULTIPLEXED` binding in scope → `CT_SESSION_MULTIPLEXED`.
3. Zero or more than one ACTIVE binding → `CT_SESSION_ISOLATION_UNPROVEN`. Against the sole ACTIVE binding, a stale `ctx.binding_epoch` → `CT_FENCE_MISMATCH` before remaining tuple classification; any equal-epoch non-epoch mismatch → `CT_SESSION_ISOLATION_UNPROVEN`.
4. With one exact ACTIVE binding and no delivery schema yet, P2 returns exactly `{delivery:null}`.

P2 receive performs no `BEGIN IMMEDIATE`, update, budget use, or legacy `message` query; the deferred read transaction commits or rolls back without changing pages. P4 replaces only the final null lookup with the persisted continuation-delivery peek. It never calls legacy consuming `receive(handle)`.

## Error precedence and P2 exposure

| Order | Register | Continuation receive |
|---:|---|---|
| 1 | `CT_SCHEMA_INVALID` / `CT_ANCHOR_*` | same |
| 2 | `CT_CONTINUATION_OFF` / `CT_ROLLBACK_IN_PROGRESS` / lease-state schema failure | same |
| 3 | `CT_PAYLOAD_INVALID` request shape, then ingress isolation | non-empty args `CT_PAYLOAD_INVALID`, then ingress isolation |
| 4 | committed success/exceptional idempotency outcome | multiplexed history |
| 5 | binding existence and CAS | ACTIVE cardinality/full tuple |
| 6 | commit or deterministic identity error | `{delivery:null}` |
| writer | bounded writer failure → `CT_BUSY` | read busy → `CT_BUSY` only after the same bounded wait |

P2 does not alter legacy inactive errors, ACTIVE-file behavior, messages, locks, status, or MCP descriptions. Continuation OFF is independent of the legacy `ACTIVE` marker: it gates only continuation operations.

## Focused test ownership

`test/migration.test.mjs` owns P1-FC and Migration 002 byte/checksum/manifest, old-checksum refusal, atomic rollback, replay/conflict, bounded busy, exact lease seed, and legacy preservation. `test/identity.test.mjs` owns the following P2 scenarios without creating IDs:

| Scenario | P2 proof |
|---|---|
| `CT-R4-S1` | first registration plus direct shared full-tuple predicate checks used later by claim/recovery |
| `CT-R4-S2` | same-root MCP/PID rebind, epoch increment, old-Ctx fence |
| `CT-R4-S3` | exact-CAS second root commits two MULTIPLEXED rows, one immutable conflict, zero ACTIVE |
| `CT-R4-S4` | missing/mismatched/multiple/multiplexed receive never touches continuation or legacy messages |
| `CT-R4-S5` | every non-`ABSENT/0` first CAS is non-mutating |
| `CT-R4-S6` | stale same-root is non-mutating; exact-CAS different-root takes only the audited multiplex transition |
| `CT-R8-S2` | unique ACTIVE constraint and inactive continuation receive are atomic/non-consuming; attestation single-use remains owned by `CT-R6-S3` in P5 |
| `CT-R9-S1` | forbidden caller identity fields, wrong trusted root, stale epoch, and cooperative/no-hostile-security wording |
| `CT-R11-S1` | OFF rejects P2 continuation register/receive and preserves every `ct_*` and legacy row byte-for-byte |

P4 and P6 must reuse the P2 `assertClaimantBinding` predicate and add operation-specific claim/recovery coverage; they do not rename or duplicate `CT-R4-S1`. P2 test helpers may seed isolated schema-2 mode `ON` directly to exercise identity because explicit activation is P3; production receives no test-only activation path.

Required P2 verification is `bun test test/migration.test.mjs test/identity.test.mjs test/fail-closed.test.mjs`, followed by syntax and diff checks. Actual and legacy Tower remain OFF and absent/unchanged. No adapter, polling, runtime publication, cutover, commit, push, PR, or delivery occurs.

## P2 file and rollback boundary

P2 may change only `core.mjs`, `mcp.mjs`, `test/identity.test.mjs`, the Migration 002/P1-FC additions in `test/migration.test.mjs`, and cumulative OpenSpec evidence. Host adapters, legacy functions/tool schemas, lifecycle/delivery tables, and runtime paths are out of scope.

P2 rollback reverts Migration 002, continuation core/dispatcher routes, and P2 tests/evidence. It does not drop tables from any real database; schema-2 records remain inert with mode OFF. P1-FC remains as the forward-compatible fresh-install baseline. If P1-FC itself is rolled back, P2 is again blocked.
