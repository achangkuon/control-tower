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

---

# P3 Design Correction: Main Binding and Explicit Activation

## Decision summary

P3 uses **Migration 003**. It adds only canonical Main-binding history and immutable activation history; it does not create lifecycle, delivery, recovery-proof, rollback-inventory, or polling state. `bootstrapAdmin` owns the exact schema-2→3 transition while continuation remains OFF. `bootstrapMain`, `activate`, and `status` join the internal constructor-capability dispatcher beside P2 `register` and `receive`; production MCP still advertises only the eight legacy tools until a P7–P9 adapter supplies trusted metadata.

Completion scenarios `CT-R3-S1/S3/S4` and the attestation single-use completion race `CT-R6-S3` remain normative but move to P5, where handoff, attestation, claim, and committed-result persistence exist. P4 retains `CT-R6-S1/S2/S4/S5/S6`. `CT-R11-S4/S5` move to P6, where rollback inventory, termination receipts, and quiescence persistence are introduced. P3 deliberately provides only the Main identity and activation foundations those later transitions reference.

## Migration 003: Main and activation persistence

`core.mjs` owns immutable `MIGRATION_003_SQL`. The exact UTF-8 byte stream has LF line endings, one terminal LF, no leading/trailing blank line, byte length **2457**, and checksum **`sha256:c382e9322a5934f1db3cb9685a345d8141a6263102ef9f027ca03396338a65b6`**:

```sql
CREATE TABLE ct_main_binding (
  main_binding_id TEXT PRIMARY KEY CHECK(length(main_binding_id) = 43),
  anchor_id TEXT NOT NULL CHECK(length(anchor_id) = 43),
  anchor_epoch INTEGER NOT NULL CHECK(anchor_epoch = 1),
  config_digest TEXT NOT NULL CHECK(length(config_digest) = 71),
  host_process_instance TEXT NOT NULL CHECK(length(host_process_instance) > 0),
  plugin_instance TEXT NOT NULL CHECK(length(plugin_instance) > 0),
  root_session_id TEXT NOT NULL CHECK(length(root_session_id) > 0),
  mcp_process_instance TEXT NOT NULL CHECK(length(mcp_process_instance) = 43),
  pid_start_marker TEXT NOT NULL CHECK(length(pid_start_marker) > 0),
  binding_epoch INTEGER NOT NULL CHECK(binding_epoch > 0),
  main_session_id TEXT NOT NULL CHECK(length(main_session_id) > 0),
  binding_status TEXT NOT NULL CHECK(binding_status IN ('ACTIVE', 'RETIRED')),
  identity_digest TEXT NOT NULL UNIQUE CHECK(length(identity_digest) = 71),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  ended_at TEXT,
  CHECK(main_session_id = root_session_id),
  CHECK((binding_status = 'ACTIVE' AND ended_at IS NULL) OR
        (binding_status = 'RETIRED' AND ended_at IS NOT NULL)),
  UNIQUE(anchor_id, binding_epoch)
);
CREATE UNIQUE INDEX ct_main_binding_one_active
ON ct_main_binding(anchor_id)
WHERE binding_status = 'ACTIVE';
CREATE INDEX ct_main_binding_history
ON ct_main_binding(anchor_id, binding_epoch, binding_status);
CREATE TABLE ct_activation (
  activation_epoch INTEGER PRIMARY KEY CHECK(activation_epoch > 0),
  main_binding_id TEXT NOT NULL CHECK(length(main_binding_id) = 43),
  main_binding_epoch INTEGER NOT NULL CHECK(main_binding_epoch > 0),
  evidence_digest TEXT NOT NULL CHECK(length(evidence_digest) = 71),
  precondition_digest TEXT NOT NULL CHECK(length(precondition_digest) = 71),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  activation_digest TEXT NOT NULL UNIQUE CHECK(length(activation_digest) = 71),
  activated_at TEXT NOT NULL CHECK(length(activated_at) = 24),
  UNIQUE(main_binding_id, activation_epoch)
);
CREATE TRIGGER ct_activation_no_update
BEFORE UPDATE ON ct_activation
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_ACTIVATION');
END;
CREATE TRIGGER ct_activation_no_delete
BEFORE DELETE ON ct_activation
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_ACTIVATION');
END;
```

`MIGRATION_003_CHECKSUM` MUST be computed from the constant. `test/migration.test.mjs` owns an independent literal byte stream, byte-length assertion, pinned checksum, exact SQLite object SQL, atomic rollback, and legacy/P2 preservation. Neither request data nor configuration may supply a migration checksum.

The exact schema-3 manifest is schema 2 plus tables `ct_main_binding` and `ct_activation`; indexes `ct_main_binding_one_active` and `ct_main_binding_history`; and triggers `ct_activation_no_update` and `ct_activation_no_delete`. It contains exactly migration rows 1, 2, and 3 with their computed checksums and no other `ct_*` object. Schema 2 remains a valid P2 manifest: P2 `register`/`receive` keep their existing behavior on schema 2, and accept schema 3 without changing identity semantics. P3 operations require schema 3. Every schema version preserves the four exact legacy objects and all legacy rows.

### Schema-2→3 bootstrap transaction

`bootstrapAdmin` adds the sole transition `{expected_schema_version:2,target_schema_version:3,expected_mode:"OFF"}` under operation/scope `bootstrapAdmin/schema:2->3`. Its request digest remains the SHA-256 of JCS:

```text
{request_identity,expected_anchor_id,expected_schema_version:2,
 target_schema_version:3,expected_mode:"OFF"}
```

Its CAS digest is the SHA-256 of JCS:

```text
{expected_anchor_id,expected_schema_version:2,target_schema_version:3,
 expected_mode:"OFF",derived_anchor_epoch:1,derived_config_digest,
 expected_rollback_epoch:0,expected_lease_version:0,
 expected_lease_status:"NONE",expected_main_binding_state:"ABSENT",
 expected_activation_epoch:0}
```

After anchor/config validation and bounded `BEGIN IMMEDIATE`, order is exact: schema-2 manifest/checksums → OFF continuation state → singleton lease exactly `(rollback_epoch=0,lease_status='NONE',lease_version=0,owner=NULL,expires=NULL)` → absence of the committed target scope → request CAS → execute `MIGRATION_003_SQL` → update exactly one continuation-state row `schema_version 2→3` → insert migration row 3 → insert the idempotency response → reread anchor bytes and validate the exact schema-3 manifest/state/lease plus zero Main and activation rows → commit. Response is exactly `{anchor_id,schema_version:3,mode:"OFF",replayed}`.

At schema 3, an exact committed tuple replays only while persisted mode is still OFF and schema/anchor/state remain valid. A changed tuple or new identity for the committed scope is `CT_IDEMPOTENCY_CONFLICT`. Wrong version/mode/anchor CAS is `CT_FENCE_MISMATCH`; manifest/checksum/DDL/seed/update-count/cross-row failure is `CT_SCHEMA_INVALID`; lock expiry is `CT_BUSY`. Any failure rolls back every Migration 003 object/row, the schema-version update, and the idempotency row. Schema-2 claimant/conflict/lease data and all legacy bytes remain unchanged.

## Exact `main_binding_v1`

### Trusted inputs and persisted identity

`bootstrapMain` accepts exactly `{request_identity,expected_anchor_id,expected_binding_epoch}`. The UUID and expected values are idempotency/CAS inputs only; they grant no authority. Caller `Ctx`, actor, role, session, UID, path, branch, process, PID, epoch, or extra keys are `CT_PAYLOAD_INVALID`.

Authority comes only from a single immutable `Ctx` snapshot created by the P2 constructor capability. Before Main evaluation it MUST match the anchor context exactly:

```text
effective_uid  == anchor.context.trusted_uid
canonical_repo == anchor.context.canonical_repo
 git_common_dir == anchor.context.git_common_dir
worktree       == anchor.context.main_worktree
branch         == anchor.context.branch
```

Malformed/ambiguous trusted metadata is `CT_SESSION_ISOLATION_UNPROVEN`; a well-formed non-canonical context is `CT_ADMIN_REQUIRED`. No request field can repair either error.

The canonical digest input is:

```text
main_binding_v1 = {
  kind:"main_binding_v1",version:1,
  anchor_id,anchor_epoch:1,config_digest,
  authority_context:{canonical_repo,git_common_dir,main_worktree,branch,trusted_uid},
  identity:{host_process_instance,plugin_instance,root_session_id,
            mcp_process_instance,pid_start_marker,binding_epoch,
            main_session_id:root_session_id}
}
identity_digest = SHA-256(UTF8(JCS(main_binding_v1)))
```

The row persists every identity member, `main_session_id=root_session_id`, anchor/config binding, ACTIVE/RETIRED status, digest, and timestamps. Opaque host/plugin/root/session strings retain the P2 1–256 UTF-8-byte/NUL-free rules; MCP identity is canonical 32-byte base64url; PID marker is 1–128 bytes; epoch is a positive safe integer; digests and timestamps use the existing lowercase-SHA-256 and RFC3339-millisecond validators. Row validation recomputes `identity_digest` with the current safe anchor. Exactly one ACTIVE row per anchor is permitted.

### Bootstrap digests and transition

For target epoch `E+1`:

```text
request_digest = SHA-256(UTF8(JCS({
  request_identity,expected_anchor_id,expected_binding_epoch:E
})))
target_identity_digest = SHA-256(UTF8(JCS(main_binding_v1(E+1))))
cas_digest = SHA-256(UTF8(JCS({
  expected_anchor_id,expected_binding_epoch:E,target_binding_epoch:E+1,
  target_identity_digest,schema_version:3,mode:"OFF",
  observed_rollback_epoch,observed_lease_version,
  observed_lease_status:"NONE",observed_active_main_binding_id,
  observed_active_main_binding_epoch
})))
scope_key = "main:" + anchor_id + ":epoch:" + decimal(E+1)
```

For first binding, the CAS values are exactly `observed_active_main_binding_id:null` and `observed_active_main_binding_epoch:0`. For same-root rebind they are exactly the sole ACTIVE incumbent ID and epoch E. No empty string, omitted value, inferred target ID, or caller value is accepted for either field.

After safe anchor/config resolution, failure to acquire the bounded writer returns `CT_BUSY`. Once `BEGIN IMMEDIATE` is held, `bootstrapMain` uses this total order:

1. Exact schema-3 manifest/migrations and structurally valid continuation/Main/lease rows; malformed rows or digest/history SQL drift → `CT_SCHEMA_INVALID`, while continuation anchor/config/secret mismatch → `CT_ANCHOR_MISMATCH`.
2. Mode: `ROLLING_BACK` → `CT_ROLLBACK_IN_PROGRESS`; `ON` → `CT_FENCE_MISMATCH`; only `OFF` continues.
3. OFF lease: `NONE` with null owner/expiry continues at any valid persisted rollback epoch/lease version; `ACTIVE` → `CT_ROLLBACK_LEASE_ACTIVE`; `EXPIRED` → `CT_FENCE_MISMATCH`; invalid status/owner/expiry combinations → `CT_SCHEMA_INVALID`.
4. Exact request shape; malformed/extra/forbidden fields → `CT_PAYLOAD_INVALID`.
5. Immutable canonical-Main `Ctx`; malformed trusted metadata → `CT_SESSION_ISOLATION_UNPROVEN`, well-formed non-canonical context → `CT_ADMIN_REQUIRED`.
6. Committed request/scope idempotency; changed identity/tuple or a new identity for a committed epoch scope → `CT_IDEMPOTENCY_CONFLICT`.
7. Main-row cardinality and expected epoch CAS; malformed rows → `CT_SCHEMA_INVALID`, well-formed conflicting/non-unique history → `CT_MAIN_BINDING_CONFLICT`, stale Ctx/request epoch or wrong `expected_anchor_id` → `CT_FENCE_MISMATCH`.
8. Identity decision and commit.

First binding requires no history, `Ctx.binding_epoch=0`, and expected epoch 0. A same-root OFF rebind requires one ACTIVE row at E, `Ctx.binding_epoch=E`, equal host/plugin/root/Main-session identity, and both a new MCP instance and new PID-start marker; it retires the incumbent and inserts E+1 ACTIVE atomically. A different host/plugin/root/Main session or duplicate process identity is `CT_MAIN_BINDING_CONFLICT` without a new row.

The committed response is exactly `{main_binding_id,binding_epoch,state:"ACTIVE",replayed}`. Exact replay reconstructs the original CAS pre-state from the committed target and its immediate predecessor (or ABSENT/0), verifies the stored request/CAS/response plus target identity, and accepts only the same non-epoch trusted Ctx with `Ctx.binding_epoch` equal to E (lost-result retry) or E+1 (already-observed result). It returns the stored response with only `replayed:true` and performs no retire/insert. Changed identity/tuple or a new identity for the committed scope is `CT_IDEMPOTENCY_CONFLICT`. Main binding creates no claimant, delivery, activation, lease, or legacy mutation.

### Main-gated predicate

Every P3 Main-gated call revalidates the safe anchor and all Main rows. It requires exactly one ACTIVE row, exact canonical-Main `Ctx` context, equality of host/plugin/root/MCP/PID/Main-session fields, and `Ctx.binding_epoch=row.binding_epoch`. No ACTIVE row or a non-epoch identity mismatch is `CT_WORKFLOW_MAIN_REQUIRED`; duplicate/conflicting Main history is `CT_MAIN_BINDING_CONFLICT`; an otherwise matching stale epoch is `CT_FENCE_MISMATCH`. Request-shape failure precedes this predicate only after schema/mode validation; no authority error mutates state.

## Explicit activation and read-only status

### Activation state, digests, and quiescence

`activate` accepts one plain object with exactly `{request_identity,expected_mode:"OFF",expected_binding_epoch,evidence_digest}`. Invalid UUID/epoch/mode, extra/forbidden keys, arrays, null, or foreign prototypes are `CT_PAYLOAD_INVALID`. Missing or non-canonical lowercase `sha256:` evidence is specifically `CT_ACTIVATION_EVIDENCE_REQUIRED`. `evidence_digest` is an opaque integrity reference supplied by authorized Main, not authority or Tower-side policy interpretation.

The logical transition selector intentionally excludes `request_identity` and uses only request plus persisted authority/lease fields:

```text
activation_transition_v1 = {
  kind:"activation_transition_v1",version:1,
  anchor_id,config_digest,expected_mode:"OFF",expected_binding_epoch,
  main_binding_id,main_identity_digest,evidence_digest,
  observed_rollback_epoch,observed_lease_version
}
transition_digest = SHA-256(UTF8(JCS(activation_transition_v1)))
operation = "activate"
scope_key = "activation:" + transition_digest
request_digest = SHA-256(UTF8(JCS({
  request_identity,expected_mode:"OFF",expected_binding_epoch,evidence_digest
})))
```

Within the same writer snapshot P3 derives:

```text
activation_precondition_v1 = {
  kind:"activation_precondition_v1",version:1,
  schema_version:3,mode:"OFF",anchor_id,config_digest,
  rollback_epoch:observed_rollback_epoch,
  lease_version:observed_lease_version,lease_status:"NONE",
  main_binding_id,main_binding_epoch,main_identity_digest,
  prior_activation_epoch,
  active_claimant_bindings:0,
  multiplexed_claimant_bindings:<observed non-live count>,
  claimant_conflicts:<observed immutable count>,
  delivery_plane:"ABSENT_SCHEMA_3",
  polling_plane:"UNAVAILABLE_BEFORE_P7"
}
precondition_digest = SHA-256(UTF8(JCS(activation_precondition_v1)))
target_activation_epoch = prior_activation_epoch + 1
cas_digest = SHA-256(UTF8(JCS({
  transition_digest,expected_mode:"OFF",expected_binding_epoch,
  main_binding_id,main_identity_digest,evidence_digest,
  observed_rollback_epoch,observed_lease_version,
  observed_lease_status:"NONE",prior_activation_epoch,
  target_activation_epoch,precondition_digest
})))
```

P3 quiescence is intentionally pre-delivery and exact: lease NONE, one matching ACTIVE Main, zero ACTIVE claimant rows, and the exact schema-3 manifest proving no lifecycle/delivery/polling objects exist. RETIRED/MULTIPLEXED claimant rows, immutable claimant-conflict history, retired Main rows, and prior activation rows are retained non-live audit data; their observed counts are bound into the precondition rather than required to be zero. Failure is `CT_NOT_QUIESCENT`; it is not a claim that P3 implements rollback quiescence.

`prior_activation_epoch` is the maximum immutable activation epoch, or 0 when none exists; committed `activation_epoch` is exactly `prior_activation_epoch+1`. `activation_digest` is SHA-256 over JCS `{kind:"activation_v1",version:1,activation_epoch,main_binding_id,main_binding_epoch,evidence_digest,precondition_digest,request_identity,request_digest,cas_digest,activated_at}`. Success inserts one immutable activation row, inserts idempotency at operation/scope above, updates exactly one continuation-state row OFF→ON, rereads all three, and returns only `{mode:"ON",activation_epoch,replayed}`. It creates no claimant, handoff, delivery, claim, wake, recovery, or legacy row.

### Total activation lookup and classification

After safe anchor/config resolution, failure to acquire the bounded writer is `CT_BUSY`. Under `BEGIN IMMEDIATE`, validate exact schema-3/state/lease/Main/activation/idempotency structure first; malformed persisted rows, missing operation/scope pairs, or digest/response mismatches are `CT_SCHEMA_INVALID`, and continuation anchor/config drift is `CT_ANCHOR_MISMATCH`. `ROLLING_BACK` then returns `CT_ROLLBACK_IN_PROGRESS`. OFF and ON both require lease `NONE` with null owner/expiry; any ACTIVE/EXPIRED or cross-field lease state in those modes is `CT_SCHEMA_INVALID`. OFF and ON use these deterministic lanes after exact payload/evidence and trusted Main validation:

**OFF lane**

1. Derive incoming transition/scope/request/CAS digests from the current persisted Main, rollback epoch, lease version, and precondition.
2. Lookup `activate` by `request_identity` and by exact `scope_key`. If either valid committed row exists, return `CT_IDEMPOTENCY_CONFLICT`; an old ON result never replays while current mode is OFF. If both lookups disagree structurally, return `CT_SCHEMA_INVALID`.
3. Require `expected_binding_epoch` and trusted `Ctx.binding_epoch` to equal the ACTIVE Main epoch; mismatch is `CT_FENCE_MISMATCH`.
4. Evaluate evidence/quiescence and commit.

**ON lane**

1. Require exactly one latest activation row, one matching `activate` idempotency row at its recomputed transition scope, exact stored request/CAS/response, and an ACTIVE Main/lease matching that row. Any mismatch is `CT_SCHEMA_INVALID` or, for well-formed conflicting Main cardinality, `CT_MAIN_BINDING_CONFLICT`.
2. Recompute the incoming transition/scope and request digest from the incoming request plus current persisted Main/lease. Lookup `activate` by incoming `request_identity` and by incoming scope.
3. **Exact replay:** identity lookup is the current committed row, incoming scope is its scope, request digest matches, and CAS recomputed from the immutable stored `precondition_digest`, `activation_epoch-1`, and `activation_epoch` matches. Return the stored response with only `replayed:true`.
4. **Stale/changed request:** the request identity names any activation row but request/scope/CAS is not the exact current tuple, or the incoming scope names a prior activation; return `CT_IDEMPOTENCY_CONFLICT`.
5. **Same logical transition conflict:** no identity row exists but incoming scope equals the current committed scope (therefore only `request_identity` differs); return `CT_IDEMPOTENCY_CONFLICT`.
6. **Unrelated ON request:** neither identity nor scope is committed and incoming scope differs from the current transition; return `CT_FENCE_MISMATCH`.

These cases are exhaustive because operation/request identity is unique, operation/scope is primary-keyed, and every valid ON state has exactly one latest activation/idempotency pair. No ON classification inserts or updates a row.

### P3 `status()` shape

P3 `status(request?)` accepts only omitted `request` (`undefined`) or a plain `Object.prototype` object with zero own keys. Null, arrays, non-empty objects, and foreign/null prototypes return `CT_PAYLOAD_INVALID` before filesystem or database access. Status is read-only and valid in OFF, ON, or ROLLING_BACK at exact schema 3.

Its total validation/error order is:

1. Request shape → `CT_PAYLOAD_INVALID` as above.
2. Safe anchor/context: missing anchor → `CT_ANCHOR_REQUIRED`; unsafe/malformed anchor, Git/context mismatch, or anchor/config drift → `CT_ANCHOR_MISMATCH`.
3. Database and exact schema-3 migration/object manifest → `CT_SCHEMA_INVALID` on missing DB, wrong version/checksum, unknown/missing object, or SQL mismatch.
4. Singleton continuation state, lease row, Main rows, activation rows, and their idempotency rows: malformed field/digest/timestamp/status, wrong anchor/config reference, or missing/mismatched activation/idempotency pair → `CT_SCHEMA_INVALID`.
5. Mode/lease coherence: OFF or ON requires lease `NONE` with null owner/expiry; ROLLING_BACK requires valid `ACTIVE|EXPIRED` lease with non-null owner/expiry. Any other combination → `CT_SCHEMA_INVALID`.
6. Main cross-row coherence: more than one ACTIVE row, ACTIVE not at the maximum binding epoch, contradictory well-formed history, ON without exactly one ACTIVE Main, or ROLLING_BACK lease owner not equal to the sole ACTIVE Main → `CT_MAIN_BINDING_CONFLICT`. OFF may report zero or one ACTIVE Main.
7. ON activation coherence: latest immutable activation must reference the sole ACTIVE Main/epoch and exact current activation idempotency row; mismatch → `CT_SCHEMA_INVALID`.
8. Read lock still busy after the bounded wait → `CT_BUSY`; otherwise return the response.

The exact response is:

```text
{
  mode,schema_version:3,rollback_epoch,lease_status,
  main_binding_status:"ABSENT"|"ACTIVE",
  live_counts:{claims:0,deliveries:0,workers:<ACTIVE claimant count>},
  pending_counts:{work:0,attestation:0}
}
```

The zero claim/delivery/pending values are structural schema-3 facts, not fabricated lifecycle evidence. Later migrations may populate the same keys without changing shape. Status never returns IDs, identity tuples, evidence digests, tokens, anchor secret, or idempotency data, and never repairs state.

## Dispatcher and exposure boundary

P3's internal supported set is exactly `bootstrapMain`, `activate`, `status`, `register`, and `receive`. `provisionMainAuthorityAnchor` and `bootstrapAdmin` remain CLI/admin-only. A capability-backed continuation tool surface may list those five runtime operations with their exact schemas; without both trusted-metadata and process-identity constructor capabilities, `CONTINUATION_TOOLS` remains empty and production `mcp.mjs` lists only the eight legacy `tower_*` tools. P4–P6 operation names, including `complete`, `beginRollback`, `rebindMain`, and `finishRollback`, remain unlisted and direct dispatch returns `CT_PAYLOAD_INVALID` before database access. `start` remains absent in every mode.

## Deferred scenario ownership without weakened requirements

- `CT-R3-S1/S3/S4` and `CT-R6-S3` are P5-owned because only P5 has completion attestation, claim/token, and committed-result rows. P4 owns `CT-R6-S1/S2/S4/S5/S6` only. P3/P4 MUST NOT seed fake completion state or claim the single-use completion race. P5 isolated fixtures begin with exact P4 delivery/claim state plus an unused/missing/mismatched P5 attestation as each scenario requires.
- `CT-R3-S5` is cumulative: P3 proves only administrative/binding/status shapes; P4 proves handoff/delivery; P5 proves attestation/completion. The stable requirement is complete only after P5.
- `CT-R11-S3` is cumulative: P3 owns status/bootstrap/activation effects; P6 owns beginRollback/rebind/finish effects.
- `CT-R11-S4/S5` are P6-owned. Migration 003 intentionally has no termination-receipt or rollback-quiescence table. P3 persists the old/new Main identity digest and immutable activation history that P6 proof rows must reference. Before P6, rollback/rebind/finish are unavailable and therefore cannot accept request-supplied proof.
- P6 must introduce its own byte-checksummed additive migration before RED. Its isolated preconditions must persist `termination_receipt_v1` against the exact old `main_binding_id`/identity digest and a `quiescence_v1` snapshot against rollback epoch/lease version, live/pending counts, frozen inventory, and a trusted polling witness. A pre-P7 fixture may use only the explicit server-owned witness `polling_plane:"UNAVAILABLE_BEFORE_P7"`; request booleans or digests cannot prove termination/quiescence.

## P3 rollback, preservation, and workload

Migration failure rolls back to byte-identical schema 2. After a committed schema-3 migration, no automatic down-migration, `DROP`, table rebuild, row copy, or checksum alias exists. Reverting P3 code leaves schema-3 continuation data inert and rejected as `CT_SCHEMA_INVALID` by older code while the legacy queue remains usable; actual runtime activation is outside this work unit. P2 schema-2 fixtures and behavior remain supported, and schema-3 `register`/`receive` reuse the unchanged P2 identity predicate.

P3 implementation/test scope is `core.mjs`, `mcp.mjs`, `test/migration.test.mjs`, and `test/identity.test.mjs`, plus cumulative OpenSpec evidence. Forecast: 650–800 authored implementation/test changed lines. Before production edits, any forecast above 800 MUST split into independently green chained boundaries: P3-A is Migration 003 + `bootstrapMain` (`CT-R8-S5` bootstrap, `CT-R10-S1..S5`); P3-B is `activate` + `status` + capability-gated MCP (P3 projections of `CT-R3-S2/S5`, `CT-R10-S6`, `CT-R11-S3`). No lifecycle, delivery, recovery, polling, adapter, publication, runtime, commit, push, or PR work belongs to P3.

---

# P4 Design Amendment: Delivery/Claim Chained Green Units

## Decision summary

P4 executes through six active chained units plus the preserved A1c baseline, each under its own 800-authored-line ceiling. **P4-A1a** pins the exact Migration 004 SQL constant, checksum, manifest definitions, and independent constant/manifest tests without enabling schema 4; forecast **480–620 implementation/test lines**. **P4-A1b** depends on A1a and owns fresh schema 3→4 migration, empty schema-4 replay, rollback/busy behavior, and P3 compatibility; forecast **560–760**. The existing **P4-A1c** validator work depends on A1b and is preserved as an **unapproved prerequisite baseline** at **588 implementation/test lines**; repeated gate failure means it is not complete. **P4-A1c-R1** depends on that baseline and owns exact reverse transition/idempotency links plus immutable historical CAS/fence validation; its preserved incremental forecast is **360–520**. **P4-A2** starts only after a fresh final **A1c P4-only gate** passes over the baseline plus R1 and owns canonical immutable payload/provenance plus `create`; forecast **380–560**. **P4-A3** depends on A2 and owns authoritative server-derived `validate`, `publish`, and durable PENDING WORK delivery; forecast **430–620**. **P4-B** depends on A3 and owns schema-4 delivery peek plus atomic `claim`, claimant/token provenance, and one-unit session-budget accounting/races; forecast **520–720**. A1a ends at schema 3 with inert constants only, A1b ends at an empty schema 4, the A1c baseline remains fail-closed but unapproved, R1 closes exact P4 reverse commitments, A2 may leave DRAFT rows, and A3 may leave published deliveries intentionally undiscoverable through the null-only receive until B lands. Each unit preserves prior green behavior and is rollbackable without removing its predecessors. Neither task `4.1`, `4.2`, `4.3`, nor parent-owned `4.4` is complete until every mapped P4 boundary is green; the final A1c P4-only gate has not passed yet.

P4 covers `CT-R2-S1..S3`, `CT-R6-S1..S2`, `CT-R6-S4..S6`, and only the handoff/delivery response projection of `CT-R3-S5`. Normative completion/attestation race `CT-R6-S3` and the attestation/completion response projection remain P5-owned. ACK, ATTEST_COMPLETION, COMPLETE, and REJECT persistence/validation acceptance remains P5-owned; RECOVER persistence/validation acceptance remains P6-owned. Until those owning slices add their exact persistence and validation contracts, P4 rejects their rows fail-closed rather than assigning them provisional schema-4 semantics. P4 does not add `ack`, `attestCompletion`, `complete`, `reject`, `revise`, `recover`, rollback, polling, effects, attestation, or committed-result behavior, and never adds `start`.

## Migration 004: immutable handoff, delivery, claim, and budget foundation

`core.mjs` will own immutable `MIGRATION_004_SQL`. Its exact UTF-8 byte stream is the following block with LF line endings, no leading/trailing blank line, exactly one terminal LF, byte length **12159**, exactly **215 lines**, and checksum **`sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57`**. The implementation computes the checksum from the constant. P4-A1a owns an independently copied literal plus byte-length, line-count, checksum, exact `sqlite_master.sql`, and manifest-definition assertions, but MUST NOT add a schema-4 execution branch. P4-A1b owns execution, rollback/busy, empty replay, and preservation proofs; P4-A1c owns evolved/non-empty validation/retry proofs. Requests/configuration cannot supply or alias the checksum.

```sql
CREATE TABLE ct_handoff (
  id TEXT PRIMARY KEY CHECK(length(id) = 43),
  lineage_id TEXT NOT NULL CHECK(length(lineage_id) = 36),
  revision INTEGER NOT NULL CHECK(revision >= 1),
  state TEXT NOT NULL CHECK(state IN ('DRAFT', 'VALIDATED', 'PUBLISHED', 'CLAIMED', 'STARTED', 'COMPLETION_ATTESTED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'POISONED', 'WORK_SUSPENDED', 'ATTESTATION_SUSPENDED')),
  generation INTEGER NOT NULL DEFAULT 0 CHECK(generation >= 0),
  payload_json TEXT NOT NULL CHECK(length(CAST(payload_json AS BLOB)) BETWEEN 1 AND 65536),
  payload_digest TEXT NOT NULL CHECK(length(payload_digest) = 71),
  handoff_fingerprint TEXT NOT NULL UNIQUE CHECK(length(handoff_fingerprint) = 71),
  repository_fingerprint TEXT NOT NULL CHECK(length(repository_fingerprint) = 71),
  git_common_dir_fingerprint TEXT NOT NULL CHECK(length(git_common_dir_fingerprint) = 71),
  source_merge_sha TEXT NOT NULL CHECK(length(source_merge_sha) IN (40, 64)),
  source_merge_url TEXT NOT NULL CHECK(length(source_merge_url) BETWEEN 1 AND 2048),
  next_unit_scope_digest TEXT NOT NULL CHECK(length(next_unit_scope_digest) = 71),
  dependencies_digest TEXT NOT NULL CHECK(length(dependencies_digest) = 71),
  references_digest TEXT NOT NULL CHECK(length(references_digest) = 71),
  snapshots_digest TEXT NOT NULL CHECK(length(snapshots_digest) = 71),
  provenance_digest TEXT NOT NULL CHECK(length(provenance_digest) = 71),
  decision_summary_digest TEXT NOT NULL CHECK(length(decision_summary_digest) = 71),
  producer_binding_id TEXT NOT NULL CHECK(length(producer_binding_id) = 43),
  producer_identity_digest TEXT NOT NULL CHECK(length(producer_identity_digest) = 71),
  producer_ctx_json TEXT NOT NULL CHECK(length(CAST(producer_ctx_json AS BLOB)) BETWEEN 1 AND 4096),
  producer_ctx_digest TEXT NOT NULL CHECK(length(producer_ctx_digest) = 71),
  validation_evidence_json TEXT CHECK(validation_evidence_json IS NULL OR length(CAST(validation_evidence_json AS BLOB)) BETWEEN 1 AND 65536),
  validation_digest TEXT CHECK(validation_digest IS NULL OR length(validation_digest) = 71),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  validated_at TEXT CHECK(validated_at IS NULL OR length(validated_at) = 24),
  published_at TEXT CHECK(published_at IS NULL OR length(published_at) = 24),
  UNIQUE(lineage_id, revision)
);
CREATE INDEX ct_handoff_state_order
ON ct_handoff(state, created_at, id);
CREATE TRIGGER ct_handoff_immutable_content
BEFORE UPDATE ON ct_handoff
WHEN NEW.id IS NOT OLD.id
  OR NEW.lineage_id IS NOT OLD.lineage_id
  OR NEW.revision IS NOT OLD.revision
  OR NEW.payload_json IS NOT OLD.payload_json
  OR NEW.payload_digest IS NOT OLD.payload_digest
  OR NEW.handoff_fingerprint IS NOT OLD.handoff_fingerprint
  OR NEW.repository_fingerprint IS NOT OLD.repository_fingerprint
  OR NEW.git_common_dir_fingerprint IS NOT OLD.git_common_dir_fingerprint
  OR NEW.source_merge_sha IS NOT OLD.source_merge_sha
  OR NEW.source_merge_url IS NOT OLD.source_merge_url
  OR NEW.next_unit_scope_digest IS NOT OLD.next_unit_scope_digest
  OR NEW.dependencies_digest IS NOT OLD.dependencies_digest
  OR NEW.references_digest IS NOT OLD.references_digest
  OR NEW.snapshots_digest IS NOT OLD.snapshots_digest
  OR NEW.provenance_digest IS NOT OLD.provenance_digest
  OR NEW.decision_summary_digest IS NOT OLD.decision_summary_digest
  OR NEW.producer_binding_id IS NOT OLD.producer_binding_id
  OR NEW.producer_identity_digest IS NOT OLD.producer_identity_digest
  OR NEW.producer_ctx_json IS NOT OLD.producer_ctx_json
  OR NEW.producer_ctx_digest IS NOT OLD.producer_ctx_digest
  OR NEW.created_at IS NOT OLD.created_at
  OR (OLD.validation_evidence_json IS NOT NULL AND NEW.validation_evidence_json IS NOT OLD.validation_evidence_json)
  OR (OLD.validation_digest IS NOT NULL AND NEW.validation_digest IS NOT OLD.validation_digest)
  OR (OLD.validated_at IS NOT NULL AND NEW.validated_at IS NOT OLD.validated_at)
  OR (OLD.published_at IS NOT NULL AND NEW.published_at IS NOT OLD.published_at)
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_HANDOFF');
END;
CREATE TRIGGER ct_handoff_no_delete
BEFORE DELETE ON ct_handoff
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_HANDOFF');
END;
CREATE TABLE ct_handoff_transition (
  transition_id TEXT PRIMARY KEY CHECK(length(transition_id) = 43),
  handoff_id TEXT NOT NULL CHECK(length(handoff_id) = 43),
  generation INTEGER NOT NULL CHECK(generation >= 0),
  operation TEXT NOT NULL CHECK(operation IN ('CREATE', 'VALIDATE', 'PUBLISH', 'CLAIM', 'ACK', 'ATTEST_COMPLETION', 'COMPLETE', 'REJECT', 'REVISE', 'RECOVER')),
  from_state TEXT CHECK(from_state IS NULL OR from_state IN ('DRAFT', 'VALIDATED', 'PUBLISHED', 'CLAIMED', 'STARTED', 'COMPLETION_ATTESTED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'POISONED', 'WORK_SUSPENDED', 'ATTESTATION_SUSPENDED')),
  to_state TEXT NOT NULL CHECK(to_state IN ('DRAFT', 'VALIDATED', 'PUBLISHED', 'CLAIMED', 'STARTED', 'COMPLETION_ATTESTED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'POISONED', 'WORK_SUSPENDED', 'ATTESTATION_SUSPENDED')),
  authority_kind TEXT NOT NULL CHECK(authority_kind IN ('PRODUCER', 'MAIN', 'CLAIMANT')),
  authority_binding_id TEXT NOT NULL CHECK(length(authority_binding_id) = 43),
  authority_identity_digest TEXT NOT NULL CHECK(length(authority_identity_digest) = 71),
  request_identity TEXT NOT NULL CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  decision_digest TEXT CHECK(decision_digest IS NULL OR length(decision_digest) = 71),
  response_digest TEXT NOT NULL CHECK(length(response_digest) = 71),
  occurred_at TEXT NOT NULL CHECK(length(occurred_at) = 24),
  UNIQUE(operation, request_identity)
);
CREATE INDEX ct_handoff_transition_history
ON ct_handoff_transition(handoff_id, generation, occurred_at, transition_id);
CREATE TRIGGER ct_handoff_transition_no_update
BEFORE UPDATE ON ct_handoff_transition
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_HANDOFF_TRANSITION');
END;
CREATE TRIGGER ct_handoff_transition_no_delete
BEFORE DELETE ON ct_handoff_transition
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_HANDOFF_TRANSITION');
END;
CREATE TABLE ct_delivery (
  delivery_id TEXT PRIMARY KEY CHECK(length(delivery_id) = 43),
  handoff_id TEXT NOT NULL CHECK(length(handoff_id) = 43),
  generation INTEGER NOT NULL CHECK(generation >= 0),
  purpose TEXT NOT NULL CHECK(purpose IN ('WORK', 'ATTESTATION_REDELIVERY')),
  delivery_state TEXT NOT NULL CHECK(delivery_state IN ('PENDING', 'CLAIMED', 'CLOSED')),
  handoff_state_snapshot TEXT NOT NULL CHECK(handoff_state_snapshot IN ('PUBLISHED', 'COMPLETION_ATTESTED')),
  claim_id TEXT CHECK(claim_id IS NULL OR length(claim_id) = 43),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  claimed_at TEXT CHECK(claimed_at IS NULL OR length(claimed_at) = 24),
  closed_at TEXT CHECK(closed_at IS NULL OR length(closed_at) = 24),
  UNIQUE(handoff_id, generation),
  CHECK((delivery_state = 'PENDING' AND claim_id IS NULL AND claimed_at IS NULL AND closed_at IS NULL) OR
        (delivery_state = 'CLAIMED' AND claim_id IS NOT NULL AND claimed_at IS NOT NULL AND closed_at IS NULL) OR
        (delivery_state = 'CLOSED' AND closed_at IS NOT NULL))
);
CREATE INDEX ct_delivery_pending_order
ON ct_delivery(delivery_state, created_at, delivery_id);
CREATE TRIGGER ct_delivery_immutable_identity
BEFORE UPDATE ON ct_delivery
WHEN NEW.delivery_id IS NOT OLD.delivery_id
  OR NEW.handoff_id IS NOT OLD.handoff_id
  OR NEW.generation IS NOT OLD.generation
  OR NEW.purpose IS NOT OLD.purpose
  OR NEW.handoff_state_snapshot IS NOT OLD.handoff_state_snapshot
  OR NEW.created_at IS NOT OLD.created_at
  OR (OLD.claim_id IS NOT NULL AND NEW.claim_id IS NOT OLD.claim_id)
  OR (OLD.claimed_at IS NOT NULL AND NEW.claimed_at IS NOT OLD.claimed_at)
  OR (OLD.closed_at IS NOT NULL AND NEW.closed_at IS NOT OLD.closed_at)
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_DELIVERY');
END;
CREATE TRIGGER ct_delivery_no_delete
BEFORE DELETE ON ct_delivery
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_DELIVERY');
END;
CREATE TABLE ct_claim (
  claim_id TEXT PRIMARY KEY CHECK(length(claim_id) = 43),
  delivery_id TEXT NOT NULL UNIQUE CHECK(length(delivery_id) = 43),
  handoff_id TEXT NOT NULL CHECK(length(handoff_id) = 43),
  generation INTEGER NOT NULL CHECK(generation >= 0),
  purpose TEXT NOT NULL CHECK(purpose IN ('WORK', 'ATTESTATION_REDELIVERY')),
  claimant_binding_id TEXT NOT NULL CHECK(length(claimant_binding_id) = 43),
  claimant_identity_digest TEXT NOT NULL CHECK(length(claimant_identity_digest) = 71),
  claimant_ctx_json TEXT NOT NULL CHECK(length(CAST(claimant_ctx_json AS BLOB)) BETWEEN 1 AND 4096),
  claimant_ctx_digest TEXT NOT NULL CHECK(length(claimant_ctx_digest) = 71),
  claimant_fence_digest TEXT NOT NULL UNIQUE CHECK(length(claimant_fence_digest) = 71),
  token_salt TEXT NOT NULL UNIQUE CHECK(length(token_salt) = 43),
  token_hash TEXT NOT NULL UNIQUE CHECK(length(token_hash) = 71),
  budget_scope_digest TEXT NOT NULL CHECK(length(budget_scope_digest) = 71),
  budget_sequence INTEGER NOT NULL CHECK(budget_sequence >= 1),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  claim_state TEXT NOT NULL CHECK(claim_state IN ('LIVE', 'CLOSED')),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  closed_at TEXT CHECK(closed_at IS NULL OR length(closed_at) = 24),
  UNIQUE(handoff_id, generation),
  CHECK((claim_state = 'LIVE' AND closed_at IS NULL) OR
        (claim_state = 'CLOSED' AND closed_at IS NOT NULL))
);
CREATE INDEX ct_claim_state_lookup
ON ct_claim(claim_state, handoff_id, generation);
CREATE TRIGGER ct_claim_immutable_identity
BEFORE UPDATE ON ct_claim
WHEN NEW.claim_id IS NOT OLD.claim_id
  OR NEW.delivery_id IS NOT OLD.delivery_id
  OR NEW.handoff_id IS NOT OLD.handoff_id
  OR NEW.generation IS NOT OLD.generation
  OR NEW.purpose IS NOT OLD.purpose
  OR NEW.claimant_binding_id IS NOT OLD.claimant_binding_id
  OR NEW.claimant_identity_digest IS NOT OLD.claimant_identity_digest
  OR NEW.claimant_ctx_json IS NOT OLD.claimant_ctx_json
  OR NEW.claimant_ctx_digest IS NOT OLD.claimant_ctx_digest
  OR NEW.claimant_fence_digest IS NOT OLD.claimant_fence_digest
  OR NEW.token_salt IS NOT OLD.token_salt
  OR NEW.token_hash IS NOT OLD.token_hash
  OR NEW.budget_scope_digest IS NOT OLD.budget_scope_digest
  OR NEW.budget_sequence IS NOT OLD.budget_sequence
  OR NEW.request_identity IS NOT OLD.request_identity
  OR NEW.request_digest IS NOT OLD.request_digest
  OR NEW.cas_digest IS NOT OLD.cas_digest
  OR NEW.created_at IS NOT OLD.created_at
  OR (OLD.closed_at IS NOT NULL AND NEW.closed_at IS NOT OLD.closed_at)
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_CLAIM');
END;
CREATE TRIGGER ct_claim_no_delete
BEFORE DELETE ON ct_claim
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_CLAIM');
END;
CREATE TABLE ct_session_budget (
  budget_scope_digest TEXT PRIMARY KEY CHECK(length(budget_scope_digest) = 71),
  budget_scope_json TEXT NOT NULL CHECK(length(CAST(budget_scope_json AS BLOB)) BETWEEN 1 AND 4096),
  budget_limit INTEGER NOT NULL DEFAULT 1 CHECK(budget_limit = 1),
  consumed_count INTEGER NOT NULL DEFAULT 0 CHECK(consumed_count BETWEEN 0 AND budget_limit),
  last_claim_id TEXT CHECK(last_claim_id IS NULL OR length(last_claim_id) = 43),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  updated_at TEXT NOT NULL CHECK(length(updated_at) = 24),
  CHECK((consumed_count = 0 AND last_claim_id IS NULL) OR
        (consumed_count > 0 AND last_claim_id IS NOT NULL))
);
CREATE TRIGGER ct_session_budget_immutable_scope
BEFORE UPDATE ON ct_session_budget
WHEN NEW.budget_scope_digest IS NOT OLD.budget_scope_digest
  OR NEW.budget_scope_json IS NOT OLD.budget_scope_json
  OR NEW.budget_limit IS NOT OLD.budget_limit
  OR NEW.created_at IS NOT OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_SESSION_BUDGET');
END;
CREATE TRIGGER ct_session_budget_no_delete
BEFORE DELETE ON ct_session_budget
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_SESSION_BUDGET');
END;
```

### Exact schema-4 manifest

Schema 4 contains the exact schema-3 manifest plus these objects and no other `ct_*` object:

- tables: `ct_handoff`, `ct_handoff_transition`, `ct_delivery`, `ct_claim`, `ct_session_budget`;
- indexes: `ct_handoff_state_order`, `ct_handoff_transition_history`, `ct_delivery_pending_order`, `ct_claim_state_lookup`;
- triggers: `ct_handoff_immutable_content`, `ct_handoff_no_delete`, `ct_handoff_transition_no_update`, `ct_handoff_transition_no_delete`, `ct_delivery_immutable_identity`, `ct_delivery_no_delete`, `ct_claim_immutable_identity`, `ct_claim_no_delete`, `ct_session_budget_immutable_scope`, `ct_session_budget_no_delete`.

The complete manifest therefore has **36 named `ct_*` objects**: the 17 exact schema-3 objects, the five tables/four indexes/ten triggers above, and no view. `ct_schema_migration` contains exactly versions `1..4` with the already-pinned v1/v2/v3 checksums and the Migration 004 checksum. SQLite-owned `sqlite_autoindex_*` rows, including the autoindex for transition `UNIQUE(operation,request_identity)`, remain excluded by the existing manifest query. New tables contain zero rows immediately after migration. The full lifecycle state/purpose/operation `CHECK`s are dormant forward-compatibility only; P4 implements only the transitions named in this amendment and cannot seed P5+ rows.

### Schema-3→4 bootstrap and preservation

CLI-only `bootstrapAdmin` adds exactly `{expected_schema_version:3,target_schema_version:4,expected_mode:"OFF"}` under operation/scope `bootstrapAdmin/schema:3->4`. The accepted request remains exactly `{request_identity,expected_anchor_id,expected_schema_version,target_schema_version,expected_mode}`. Digests are:

```text
request_digest = SHA-256(UTF8(JCS({
  request_identity,expected_anchor_id,expected_schema_version:3,
  target_schema_version:4,expected_mode:"OFF"
})))
cas_digest = SHA-256(UTF8(JCS({
  expected_anchor_id,expected_schema_version:3,target_schema_version:4,
  expected_mode:"OFF",derived_anchor_epoch:1,derived_config_digest,
  observed_rollback_epoch,observed_lease_version,observed_lease_status:"NONE",
  observed_active_main_binding_id,observed_active_main_binding_epoch,
  observed_activation_epoch:0,active_claimant_bindings:0,
  delivery_plane:"ABSENT_SCHEMA_3"
})))
```

`observed_active_main_binding_id` is `null` with epoch `0` when Main is absent, otherwise the sole structurally valid ACTIVE Main ID/epoch; callers do not supply either. Retired/MULTIPLEXED claimant history and immutable conflict history are preserved, but ACTIVE claimant count must be zero. Schema-3 OFF can have no committed activation under the implemented P1–P3 transition set, so any activation row is `CT_SCHEMA_INVALID` for this transition rather than silently discarded.

P4-A1b implements the **schema-3 fresh lane** after safe anchor/config validation and bounded `BEGIN IMMEDIATE`: schema-3 manifest/checksums → singleton continuation state and OFF mode → coherent NONE lease → coherent zero-activation Main/claimant history → committed target-scope classification → request CAS. A fresh transition executes Migration 004, updates exactly one continuation-state row `3→4`, inserts migration row 4, rereads unchanged anchor bytes, and validates the exact schema-4 manifest and zero new-table rows. For each side it derives `schema_manifest_evidence_v1 = {kind:"schema_manifest_evidence_v1",version:1,schema_version,objects:[{type,name,tbl_name,sql}],migrations:[{version,ddl_checksum}]}`, with `objects` in the existing manifest query order and migrations by ascending version, then `schema_<N>_manifest_digest = SHA-256(UTF8(JCS(schema_manifest_evidence_v1)))`. It persists canonical JCS in the migration idempotency `response_json` as `{kind:"bootstrap_schema4_response_v1",version:1,public_response:{anchor_id,schema_version:4,mode:"OFF",replayed:false},evidence:{request,request_digest,cas_input,cas_digest,migration_004_checksum,schema_3_manifest_digest,schema_4_manifest_digest}}`, where `request` and `cas_input` are exactly the objects above. The public adapter returns only `public_response`; the evidence envelope is never accepted from a caller. A1b's replay proof covers the exact empty schema-4 successor only.

P4-A1c supplies the preserved **schema-4 retry-lane baseline** for empty and P4-owned evolved data, but repeated gate failure leaves it unapproved. Replay eligibility still requires: exact current schema-4 manifest/checksums; one coherent continuation row at schema 4; current mode `OFF`; coherent lease `NONE`; a valid full schema-4 cross-row state within the P4 operation/history subset; migration row 4 with the pinned checksum; and exactly one `bootstrapAdmin/schema:3->4` idempotency envelope whose canonical request/request digest, historical `cas_input`/CAS digest, both manifest digests, checksum, and false public response all recompute exactly. The incoming operation-scoped identity, request, scope, and historical CAS must equal that evidence. A valid non-empty P4 delivery plane, Main history, claimant history, activation history, CREATE/VALIDATE/PUBLISH/CLAIM transitions, claims, and budget history do **not** invalidate replay and are never cleared: emptiness was a fresh-lane commit condition recorded by the predecessor/successor manifest evidence, not a permanent schema-4 invariant. Replay returns only `{anchor_id,schema_version:4,mode:"OFF",replayed:true}` and writes nothing. A2 remains blocked until a fresh final A1c P4-only gate passes after R1; this design correction does not mark that gate passed.

### P4-A1c-R1: exact reverse commitments and immutable historical fences

R1 starts from the preserved 588-line A1c implementation/test snapshot after A1b; that snapshot is a prerequisite, not an approved unit. R1 ends only when the read-only validator proves every relationship in both directions:

- every handoff has exactly one CREATE transition and matching operation-qualified idempotency row; validation fields exist iff one VALIDATE transition/envelope exists; publication fields and every WORK delivery exist iff one PUBLISH transition/envelope exists for that handoff/generation;
- every transition names an existing handoff and exact generation, authority kind/binding/identity, request identity/digest, CAS digest, decision digest, response digest, scope, and operation-qualified idempotency row; no orphan transition, envelope, handoff state, or duplicate semantic operation is accepted;
- every delivery names the exact handoff/generation and causal PUBLISH transition; every PUBLISH that commits delivery has exactly one matching WORK delivery, and delivery purpose/state/snapshot/claim/timestamps agree in both directions;
- every claim names exactly one delivery and handoff/generation/purpose, and every claimed delivery names exactly one claim; each claim has exactly one CLAIM transition and one CLAIM idempotency envelope with equal request/scope/CAS, claimant authority, fence, budget, token-hash, decision, response, and timestamps.

Historical validation never substitutes the current continuation lease, rollback epoch, Main epoch, claimant binding, delivery state, or handoff state into an old CAS. CREATE, VALIDATE, PUBLISH, and CLAIM `ct_idempotency.response_json` values are canonical token-free operation envelopes containing `{kind,version,public_response,evidence:{request,request_digest,scope_key,cas_input,cas_digest}}` plus the operation-specific immutable evidence already defined. The validator recomputes each historical CAS and authority/fence exclusively from that persisted envelope and immutable rows that the envelope names, then separately validates current mode/lease for replay eligibility. Envelope-vs-current drift is valid history when both states are individually coherent; missing, non-canonical, current-state-derived, or contradictory historical evidence is `CT_SCHEMA_INVALID`.

R1 differential coverage must include valid histories whose current lease/version/Main/claimant metadata differs from the committed historical envelope while replay remains valid, paired with malformed cases that change exactly one reverse link, scope, request/CAS member, authority, decision/response digest, fence, budget/token commitment, or timestamp and remain read-only `CT_SCHEMA_INVALID`. Incremental implementation/test forecast is **360–520 authored lines**, independently below 800. Rollback removes only R1 validator helpers and R1 tests/evidence; it restores the unapproved A1c baseline, preserves A1a/A1b and every schema-4 row byte-for-byte, and does not authorize A2.

### Final A1c P4-only gate after R1

The former P4-A1c-R2 work unit is cancelled. The final A1c gate validates only the schema-4 commitments owned by P4 and already covered by the baseline plus approved R1 scope. It accepts only coherent prefixes of the P4-native history: `CREATE null→DRAFT` at generation 0 by PRODUCER; optional `VALIDATE DRAFT→VALIDATED` and `PUBLISH VALIDATED→PUBLISHED` at generation 0 by MAIN; and optional WORK `CLAIM PUBLISHED→CLAIMED` at generation 0 by CLAIMANT. A PENDING WORK delivery must be the exact reverse-linked PUBLISH result with no claim; a CLAIMED WORK delivery must have exactly one reverse-linked LIVE claim and CLAIM transition/envelope. The payload, provenance, validation, transition, delivery, claim, budget/token, authority, operation-qualified idempotency, timestamp, reverse-link, immutable historical CAS, and fence invariants defined by the baseline plus R1 remain mandatory.

P4 classifies any unsupported future history as `CT_SCHEMA_INVALID`, read-only and before migration replay succeeds. This exact unsupported class includes: any `ct_handoff_transition.operation` outside `CREATE|VALIDATE|PUBLISH|CLAIM`; any handoff state outside the corresponding `DRAFT|VALIDATED|PUBLISHED|CLAIMED` P4 prefix; any nonzero handoff/transition/delivery/claim generation; any delivery purpose other than WORK; and any delivery/claim close state, close timestamp, generation rollover, or cross-row shape that requires ACK, ATTEST_COMPLETION, COMPLETE, REJECT, REVISE, RECOVER, or another later-slice operation to explain it. The validator does not infer, synthesize, normalize, partially accept, or assign authority/ordering/closure semantics to those rows. SQL representability is not P4 acceptance.

P5 owns the future acceptance rules, persistence, fixtures, and validation evidence for ACK, ATTEST_COMPLETION, COMPLETE, and REJECT histories. P6 owns them for RECOVER histories. Other non-P4 operation/history rows remain with their already assigned later slice. Each owning slice may replace the fail-closed classification only when it adds the exact supporting persistence and total validation contract. The final A1c P4-only gate must freshly prove the supported P4 rows and safe refusal of every unsupported class after R1. It owns no new implementation work unit, forecast, route, mutation, stable CT scenario, or P5/P6 acceptance evidence. A2 may start only after that fresh gate passes; it has not passed yet.

Precedence in either lane is consistent with Migration 003: anchor/config safety → version-selected manifest/checksums and structural cross-row validity → continuation mode/lease fence → committed target-scope evidence/classification → incoming request/CAS → bounded commit work. Thus malformed or missing schema-4 migration evidence, checksum/object/SQL/cross-row drift, or malformed non-empty data is `CT_SCHEMA_INVALID`; current `ON`/`ROLLING_BACK`, non-NONE lease, or wrong requested version/mode is `CT_FENCE_MISMATCH`; a valid committed envelope with a changed same-operation identity/tuple, or a new identity naming its scope, is `CT_IDEMPOTENCY_CONFLICT`; anchor/config drift is `CT_ANCHOR_*`; writer expiry is `CT_BUSY`. A schema greater than 4 or a schema-4 request without valid commit evidence is never treated as a fresh migration and never triggers drop/rebuild/copy/cleanup.

Any fresh-lane failure rolls back every v4 object, migration/state/idempotency change, and leaves schema 3 byte-identical; every retry-lane failure is read-only. Migration 004 never alters/deletes a schema-1/2/3 table, index, trigger, row, payload, legacy row, Main/activation history, claimant history, lease, `ACTIVE`, or runtime file. Reverting P4-A1a removes only inert constants/tests; reverting A1b or A1c never down-migrates: schema-4 data remains inert and older code rejects it `CT_SCHEMA_INVALID` while legacy behavior remains available.

## Canonical handoff payload and immutable provenance

### Accepted `create` content

`payload` is one plain `Object.prototype` object with exactly this shape and field presence; optional fields do not exist in v1:

```text
{
  kind:"control_tower_handoff_v1",
  version:1,
  lineage:{lineage_id,revision},
  repository:{
    repository_fingerprint,
    git_common_dir_fingerprint,
    source_merge:{sha,url}
  },
  next_unit:{
    unit_id,
    scope,
    dependencies:[{id,digest}],
    references:[{kind:"FILE"|"COMMIT"|"URL",value,digest}]
  },
  snapshots:[{name,digest}],
  provenance:{source_kind,source_ref,source_digest},
  decision_summary
}
```

Top-level `lineage_id` and `revision` MUST equal `payload.lineage.*`. `lineage_id` is a lowercase canonical UUID; revision is a safe integer `1..9007199254740991`. `unit_id`, dependency IDs, snapshot names, `source_kind`, and `source_ref` are NUL-free UTF-8 strings of respectively 1–128, 1–128, 1–128, 1–64, and 1–1024 bytes. `scope` and `decision_summary` are NUL-free and 1–4096 and 1–8192 bytes. Source URL/reference values are NUL-free 1–2048 bytes. FILE values are canonical POSIX repository-relative paths, 1–1024 bytes, with no empty, `.`, `..`, absolute, backslash, or NUL segment. Lowercase Git SHA is exactly 40 or 64 hex characters. Every digest is canonical `sha256:` plus 64 lowercase hex characters.

The JCS payload is at most **65536 UTF-8 bytes**. Dependencies are at most 64, references at most 128, and snapshots at most 64. Each array is duplicate-free and strictly sorted by the UTF-8 byte ordering of `(id,digest)`, `(kind,value,digest)`, or `(name,digest)` respectively. JSON accepts no extra/missing keys, arrays in object positions, foreign/null prototypes, `undefined`, bigint, non-finite/-0 numbers, NUL, or unpaired Unicode surrogates. Canonicalization is RFC 8785 JCS over the parsed value with no newline. Persisted `payload_json` is exactly that JCS and `payload_digest = SHA-256(UTF8(payload_json))`; supplied `payload_digest` must equal it.

Derived content digests are exact:

```text
repository_fingerprint = SHA-256(UTF8(JCS({kind:"canonical_repo_v1",path:Ctx.canonical_repo})))
git_common_dir_fingerprint = SHA-256(UTF8(JCS({kind:"git_common_dir_v1",path:Ctx.git_common_dir})))
next_unit_scope_digest = SHA-256(UTF8(JCS({unit_id,scope})))
dependencies_digest = SHA-256(UTF8(JCS(dependencies)))
references_digest = SHA-256(UTF8(JCS(references)))
snapshots_digest = SHA-256(UTF8(JCS(snapshots)))
source_digest = SHA-256(UTF8(JCS({source_kind,source_ref,
  source_merge_sha:sha,source_merge_url:url})))
provenance_digest = SHA-256(UTF8(JCS({source_digest,references_digest,snapshots_digest})))
decision_summary_digest = SHA-256(UTF8(decision_summary))
```

`payload.provenance.source_digest` must equal the derived value. The producer `Ctx` snapshot is JCS of exactly the eleven approved immutable `Ctx` fields in their canonical names; `producer_ctx_digest` hashes it. The row stores the ACTIVE claimant `binding_id` and recomputed `identity_digest`. `handoff_fingerprint` is SHA-256 over JCS `{kind:"handoff_fingerprint_v1",version:1,id,lineage_id,revision,payload_digest,repository_fingerprint,git_common_dir_fingerprint,next_unit_scope_digest,dependencies_digest,references_digest,snapshots_digest,provenance_digest,decision_summary_digest,producer_binding_id,producer_identity_digest,producer_ctx_digest}`. IDs are independent 32-byte CSPRNG base64url(no-padding) strings. All persisted timestamps are server-generated UTC RFC3339 milliseconds (24 bytes); requests never contain timestamps.

Authoritative validation produces one exact token-free proof value before generating `validated_at`:

```text
validation_evidence_v1 = {
  kind:"handoff_validation_evidence_v1",version:1,id,lineage_id,revision,
  payload_digest,handoff_fingerprint,repository_fingerprint,
  git_common_dir_fingerprint,
  content:{next_unit_scope_digest,dependencies_digest,references_digest,
           snapshots_digest,decision_summary_digest},
  provenance:{source_digest,provenance_digest,producer_binding_id,
              producer_identity_digest,producer_ctx_digest},
  source_merge:{requested_sha,resolved_oid,url,main_head_oid,is_ancestor:true},
  references:[
    {kind:"FILE",value,digest,observed_digest,node_type:"REGULAR"} |
    {kind:"COMMIT",value,digest,resolved_oid,observed_digest} |
    {kind:"URL",value,digest,observed_digest,fetch:"NONE"}
  ],
  validator:{main_binding_id,main_binding_epoch,main_identity_digest}
}
validation_evidence_json = JCS(validation_evidence_v1)
validation_digest = SHA-256(UTF8(validation_evidence_json))
```

The evidence `references` array preserves payload order. For FILE, `observed_digest` hashes the bytes read through the no-follow walk; for COMMIT, `resolved_oid` is lowercase and `observed_digest` hashes its UTF-8 bytes; for URL, `observed_digest` hashes the exact UTF-8 URL and `fetch:"NONE"` proves no fetch. `requested_sha`, source `resolved_oid`, and `main_head_oid` are lowercase full OIDs of the repository's hash width. Every top-level content/provenance member above must equal the immutable handoff row; no timestamp, request identity, bearer, environment value, or unvalidated payload field is a member. Fresh `validate` derives the evidence and `validation_digest` inside its writer transaction from the constructor-owned current Main/Ctx authority, immutable handoff payload/provenance, and these exact live Git/filesystem observations. No request, preview, helper route, or caller-provided value supplies or predicts `validation_digest`. The server persists the canonical evidence JSON and digest atomically, and every later read reparses JCS and recomputes the digest and all row links. Exact VALIDATE replay verifies persisted evidence/transition/idempotency only and does not re-read mutable Git/filesystem state; a changed accepted request conflicts, while malformed evidence is `CT_SCHEMA_INVALID`. PUBLISH derives its fence from the persisted/reverified digest and evidence and never asks the caller for or regenerates either.

`create` performs structural/JCS/bounds/digest checks and repository/common-dir fingerprint equality but does not interpret source policy. `validate` repeats those checks under Main and performs authoritative inert verification: source SHA resolves through argument-array Git as a commit and is an ancestor of canonical Main HEAD; COMMIT references resolve as commits and hash the lowercase OID bytes; URL references hash their exact string and are never fetched; FILE references walk from the canonical repository using no-follow `lstat`, reject symlink/non-file/escape components, read bytes only, and match their digest. Executable-looking names/extensions are accepted if otherwise safe and are never executed, sourced, imported, parsed as code, or passed to a shell. Snapshots and dependency entries are integrity records only and are not executed or fetched. Any structural, provenance, path, reference, JCS, digest, fingerprint, or limit failure is `CT_PAYLOAD_INVALID` with no mutation.

The SQL trigger protects content/provenance/creation columns from UPDATE and all handoffs from DELETE. Validation/publication metadata is null→value only and cannot later change. `ct_handoff_transition` records immutable CREATE/VALIDATE/PUBLISH/CLAIM audit rows; its P5+ operation values are dormant. Application validation recomputes every JSON/digest/fingerprint/timestamp and cross-row invariant on every schema-4 read. A well-formed but contradictory row is `CT_SCHEMA_INVALID`, never repaired.

## P4-A2/A3 exact operations: `create|validate|publish`

All requests reject extra or forbidden identity/authority/Ctx/time fields `CT_PAYLOAD_INVALID`. Every call uses the P2 constructor-owned single-use `Ctx` factory only after schema/mode/request-shape gates. `create` requires the exact ACTIVE claimant predicate and treats it as PRODUCER. `validate`/`publish` require the exact ACTIVE Main predicate. Every mutation is one bounded `BEGIN IMMEDIATE` transaction and appends exactly one immutable transition plus one `ct_idempotency` row.

### Digest and scope membership

For every operation `request_digest = SHA-256(UTF8(JCS(the exact accepted request including request_identity)))`. Define:

```text
writer_fence_v1 = {
  schema_version:4,mode:"ON",anchor_id,config_digest,
  observed_rollback_epoch,observed_lease_version,observed_lease_status:"NONE"
}
producer_authority_v1 = {binding_id,identity_digest,ctx_digest}
main_authority_v1 = {main_binding_id,binding_epoch,identity_digest}
```

Exact scope/CAS membership is:

| Operation | Scope key | CAS digest input |
|---|---|---|
| `create` | `handoff:<lineage_id>:revision:<revision>` | `{kind:"create_cas_v1",version:1,writer_fence_v1,producer_authority_v1,lineage_id,revision,payload_digest,expected_lineage_revision:"ABSENT"}` |
| `validate` | `handoff:<id>:generation:<eg>:validate` | server-derived `{kind:"validate_cas_v1",version:1,writer_fence_v1,main_authority_v1,id,expected_state:"DRAFT",expected_generation:eg,payload_digest,handoff_fingerprint,validation_digest}` |
| `publish` | `handoff:<id>:generation:<eg>:publish` | server-derived `{kind:"publish_cas_v1",version:1,writer_fence_v1,main_authority_v1,id,expected_state:"VALIDATED",expected_generation:eg,payload_digest,handoff_fingerprint,validation_digest,expected_delivery:"ABSENT"}` |

`cas_digest` is SHA-256 of UTF-8 JCS of the named object. Scope strings use lowercase canonical UUID/base64url IDs and base-10 integers without sign/leading zero. For fresh VALIDATE, the server reads and verifies the immutable handoff, performs the approved live observations, constructs `validation_evidence_v1`, derives `validation_digest`, and only then constructs the complete `validate_cas_v1`; none of those derived members is accepted from the request. For PUBLISH, the server reparses and verifies persisted evidence and derives its existing `validation_digest` member before constructing `publish_cas_v1`. The idempotency table remains unique by `(operation,request_identity)` and primary-keyed by `(operation,scope_key)`. Transition history matches that domain with `UNIQUE(operation,request_identity)`; `request_identity` is intentionally **not** globally unique across different operations. All identity lookups are qualified by operation. Reusing the same canonical UUID for CREATE then VALIDATE, PUBLISH, or CLAIM is legal and has no cross-operation replay/conflict meaning; within one operation, exact identity+scope+accepted-request+persisted-server-CAS replays, while either qualified lookup pointing elsewhere, another identity naming a committed single-use scope, a missing/mismatched transition pair, or reuse with a changed accepted request is `CT_IDEMPOTENCY_CONFLICT` (structurally corrupt pairs are `CT_SCHEMA_INVALID`).

### Requests, transactions, and responses

- `create` accepts exactly `{request_identity,lineage_id,revision,payload,payload_digest}`. It requires schema 4, ON/NONE lease, one exact ACTIVE producer binding, no handoff at `(lineage_id,revision)`, and valid canonical content. It inserts one DRAFT generation-0 handoff and CREATE transition. Response is exactly `{id,state:"DRAFT",generation:0,replayed}`. The generated ID and timestamp come only after all deterministic checks under the writer lock.
- `validate` accepts exactly `{request_identity,id,es:"DRAFT",eg,payload_digest}`. It accepts no `validation_digest`, evidence, Main/Ctx, observation, timestamp, or preview member. After current Main authorization and immutable handoff fences, the server performs authoritative inert reads, derives the canonical evidence/digest and complete CAS input, CASes DRAFT→VALIDATED without changing generation, sets `validation_evidence_json/validation_digest/validated_at` once, and appends VALIDATE. Response is exactly `{id,state:"VALIDATED",generation:eg,replayed}` and exposes neither evidence, digest, authority, nor observation details.
- `publish` accepts exactly `{request_identity,id,es:"VALIDATED",eg}`. It accepts no `validation_digest` or authority member. The server requires and fully reverifies the persisted evidence/digest, derives the PUBLISH CAS, requires no delivery/claim at that handoff generation, CASes VALIDATED→PUBLISHED without changing generation, sets `published_at` once, creates one CSPRNG delivery ID and exactly one PENDING WORK delivery with `handoff_state_snapshot:"PUBLISHED"`, and appends PUBLISH. Response is exactly `{id,state:"PUBLISHED",generation:eg,replayed}`; it intentionally returns no validation digest, delivery ID, authority, or token.

For CREATE, VALIDATE, and PUBLISH, `response_digest` hashes UTF-8 JCS of the replayed-false public response. `decision_digest` is null for CREATE, the server-derived `validation_digest` for VALIDATE, and the persisted/reverified validation digest for PUBLISH. CREATE persists canonical `response_json` as `{kind:"create_response_envelope_v1",version:1,public_response:{id,state:"DRAFT",generation:0,replayed:false},evidence:{request,request_digest,scope_key,cas_input,cas_digest}}`. VALIDATE persists `{kind:"validate_response_envelope_v1",version:1,public_response:{id,state:"VALIDATED",generation:eg,replayed:false},evidence:{request,request_digest,scope_key,cas_input,cas_digest,validation_digest}}`. PUBLISH persists `{kind:"publish_response_envelope_v1",version:1,public_response:{id,state:"PUBLISHED",generation:eg,replayed:false},evidence:{request,request_digest,scope_key,cas_input,cas_digest,validation_digest,delivery_id}}`. In every envelope `request` is exactly the accepted caller request, while every CAS/digest/authority/delivery member is server-derived and stored only for immutable historical replay verification; adapters return only `public_response`. R1 validates these envelopes bidirectionally and never reconstructs historical fence members from current lease/Main/claimant metadata.

Exact VALIDATE/PUBLISH replay first requires current Main authorization, then parses canonical envelope JCS and verifies operation-qualified identity/scope, accepted request/request digest, historical CAS input/digest, public response/response digest, decision digest, transition authority, handoff evidence/digest, and for PUBLISH the delivery cross-row. It returns the stored public response with only `replayed:true`, creates no row, and never reruns VALIDATE live observations. A changed accepted request or another identity naming the committed scope is `CT_IDEMPOTENCY_CONFLICT`; a missing, non-canonical, or contradictory envelope/evidence/transition pair is `CT_SCHEMA_INVALID`.

After safe anchor resolution, lock acquisition can return `CT_BUSY`. Under the lock, deterministic precedence for all three is: exact schema-4/anchor/state/lease structure (`CT_SCHEMA_INVALID|CT_ANCHOR_MISMATCH`) → OFF/ROLLING_BACK (`CT_CONTINUATION_OFF|CT_ROLLBACK_IN_PROGRESS`) → exact request shape/JCS and request digest (`CT_PAYLOAD_INVALID`) → current producer/Main authority (`CT_SESSION_*|CT_FENCE_MISMATCH` or `CT_WORKFLOW_MAIN_REQUIRED|CT_MAIN_BINDING_CONFLICT`) → operation-qualified idempotency pair classification (exact persisted replay, `CT_IDEMPOTENCY_CONFLICT`, or malformed-pair `CT_SCHEMA_INVALID`) → handoff existence (`CT_NOT_FOUND`, except create's absent scope) → state/generation/request-owned payload digest/delivery fences (`CT_INVALID_TRANSITION` for wrong legal state, otherwise `CT_FENCE_MISMATCH`) → full payload/provenance proof and, for fresh VALIDATE only, live inert observations (`CT_PAYLOAD_INVALID`) → server derivation of evidence/validation/CAS members → commit constraints (`CT_SCHEMA_INVALID`). PUBLISH's persisted evidence verification occurs at its payload/proof step and never accepts caller digest input. Any error rolls back all handoff/delivery/transition/idempotency changes.

## P4-B exact non-consuming receive and atomic `claim`

### Receive selection and projection

Continuation `receive` still accepts only omitted/`undefined` or one plain empty object; null, arrays, foreign/null prototypes, and any key are `CT_PAYLOAD_INVALID`. It remains one deferred read transaction and never takes an IMMEDIATE lock, writes, consumes budget, creates tokens, or touches legacy `message` rows. It preserves P2 precedence and full `assertClaimantBinding`: schema/anchor → ON/NONE mode/lease → argument shape → immutable `Ctx` → conflict/MULTIPLEXED history → exactly one ACTIVE binding → epoch then remaining tuple.

After identity succeeds, it validates every PENDING delivery/handoff cross-row in the repository/common-dir fingerprints of that Ctx. Eligible pairs are exactly: same schema-4 repository/common-dir fingerprints; matching `handoff_id` and generation; no claim row; PENDING delivery; and either `(purpose=WORK,handoff state=PUBLISHED,handoff_state_snapshot=PUBLISHED)` or `(purpose=ATTESTATION_REDELIVERY,handoff state=COMPLETION_ATTESTED,handoff_state_snapshot=COMPLETION_ATTESTED)`. Any malformed/contradictory candidate is `CT_SCHEMA_INVALID`, not silently skipped. Selection is deterministic `ORDER BY ct_delivery.created_at ASC, ct_delivery.delivery_id ASC LIMIT 1`, with no purpose priority. Return is exactly `{delivery:null}` or `{delivery:{delivery_id,id,state,generation,purpose}}`; `state` is handoff state. A simultaneous claim may commit before or after the deferred snapshot, so receive may return the just-claimed delivery from its older snapshot; this is safe because only claim consumes and rechecks under a writer lock. Crash after receive leaves the same row PENDING.

### Session budget, claimant provenance, and claim token

The budget is Tower safety, not plan selection. Scope is one trusted root session across same-root MCP rebinds:

```text
budget_scope_v1 = {kind:"session_budget_v1",version:1,
  effective_uid,canonical_repo,git_common_dir,plugin_instance,root_session_id}
budget_scope_json = JCS(budget_scope_v1)
budget_scope_digest = SHA-256(UTF8(budget_scope_json))
budget_limit = 1
```

No request sets/resets/increases a budget. On the first otherwise-valid claim, the transaction inserts the absent scope with `{limit:1,consumed:0}` then conditionally updates `0→1`, sets `last_claim_id`, and records `budget_sequence:1`. Existing consumed count 1 returns `CT_SESSION_BUDGET_EXHAUSTED`; the attempted claim, delivery, handoff, transition, idempotency, and any absent-row seed all remain unchanged because the transaction rolls back. Same-root process rebind keeps the scope and remaining budget; a distinct root session gets a distinct scope only after valid registration.

The claim row snapshots canonical JCS of all eleven immutable `Ctx` fields, its digest, ACTIVE binding ID/identity digest, and:

```text
claimant_fence_v1 = {kind:"claimant_fence_v1",version:1,
  delivery_id,id,generation,purpose,
  claimant_binding_id,claimant_identity_digest,claimant_ctx_digest,
  observed_rollback_epoch,observed_lease_version,budget_scope_digest,budget_sequence:1}
claimant_fence_digest = SHA-256(UTF8(JCS(claimant_fence_v1)))
```

`claim_id` and `token_salt` are independent 32-byte CSPRNG base64url strings. Raw token is never stored in SQLite:

```text
token_material_v1 = {kind:"claim_token_v1",version:1,claim_id,delivery_id,id,
  generation,purpose,claimant_fence_digest,token_salt}
token = base64url_no_padding(HMAC-SHA256(raw_anchor_secret,
  UTF8(JCS(token_material_v1))))
token_hash = SHA-256(UTF8(token))
```

The claim row stores only salt and hash. CLAIM's exact token-free public response template is `claim_response_template_v1 = {kind:"claim_response_v1",version:1,id,state,generation,delivery_id,purpose,replayed:false}`. `ct_idempotency.response_json` stores canonical `{kind:"claim_response_envelope_v1",version:1,public_response:claim_response_template_v1,evidence:{request,request_digest,scope_key,cas_input,cas_digest,claim_id,claimant_fence_digest,budget_scope_digest,budget_sequence:1,token_hash}}`; the CLAIM transition `response_digest = SHA-256(UTF8(JCS(claim_response_template_v1)))`. Neither value hashes or contains the fresh public bearer response or raw bearer. R1 recomputes the historical CLAIM CAS/fence from this immutable envelope and its exact claim/delivery/budget rows, never from current lease or claimant metadata. The CLAIM decision is exact:

```text
claim_decision_v1 = {kind:"claim_decision_v1",version:1,
  delivery_id,id,from_state:es,to_state:state,generation,purpose,claim_id,
  claimant_fence_digest,budget_scope_digest,budget_sequence:1,token_hash}
decision_digest = SHA-256(UTF8(JCS(claim_decision_v1)))
```

On first commit, `token_hash` is computed once as SHA-256 of the UTF-8 public token and the same value is placed in the claim row and decision input. Only that fresh successful claim constructs `{id,state,generation,replayed:false,delivery_id,purpose,token}`. Exact replay parses the token-free template and verifies its JCS, response digest, decision digest, operation-qualified identity/scope/request/CAS, and equality of claim/delivery/handoff/fence/budget/token-hash commitments. It then returns exactly `{id,state,generation,replayed:true,delivery_id,purpose}` without reconstructing or redisclosing the bearer. Later P5 authority accepts the caller-provided bearer, hashes its UTF-8 bytes once, and constant-time compares that hash with the persisted `token_hash`; the server never rediscloses it. The implementation never hashes a serialized public response, hashes an existing hash, stores the bearer, or accepts bearer material on claim. Status, receive, handoff rows, events, errors, logs, and MCP schemas never expose token/salt/hash. Anchor mismatch precedes replay.

### Claim request, CAS, transaction, and races

`claim` accepts exactly `{request_identity,delivery_id,id,es,eg,purpose}` with canonical UUID/base64url IDs, safe non-negative generation, purpose `WORK|ATTESTATION_REDELIVERY`, and `es` exactly `PUBLISHED` for WORK or `COMPLETION_ATTESTED` for redelivery. Scope is `delivery:<delivery_id>:claim`. Request digest hashes exact request JCS. CAS is SHA-256 over JCS:

```text
{kind:"claim_cas_v1",version:1,writer_fence_v1,
 claimant_authority_v1:{binding_id,identity_digest,ctx_digest},
 delivery_id,id,expected_delivery_state:"PENDING",expected_handoff_state:es,
 expected_generation:eg,purpose,handoff_fingerprint,budget_scope_digest,
 budget_limit:1,observed_budget_consumed:0,target_budget_sequence:1,
 token_scheme:"hmac-sha256-anchor-v1"}
```

One bounded `BEGIN IMMEDIATE` transaction rechecks exact schema/anchor, ON/NONE lease, request shape, full ACTIVE claimant tuple, idempotency, delivery/handoff existence and repository fingerprints, purpose/state/generation/fingerprint fence, no claim, and budget. It then generates IDs/salt/token, inserts LIVE claim, updates delivery PENDING→CLAIMED with claim/timestamp, consumes exactly one budget, appends CLAIM transition, and for WORK CASes handoff PUBLISHED→CLAIMED without changing generation. ATTESTATION_REDELIVERY keeps handoff state COMPLETION_ATTESTED. The fresh successful public response is exactly `{id,state,generation,replayed:false,delivery_id,purpose,token}`; no `claim_id`, hash, salt, identity, timestamp, or budget member is returned.

Exact CLAIM operation+identity+scope+request+CAS retry verifies the persisted commitments and returns exactly `{id,state,generation,replayed:true,delivery_id,purpose}` without consuming another unit or returning a token. The same UUID used by CREATE/VALIDATE/PUBLISH is irrelevant because idempotency and transition uniqueness are operation-scoped. The same identity with a changed CLAIM tuple or another identity naming the committed delivery scope is `CT_IDEMPOTENCY_CONFLICT`; it gets no token. Two claims serialize under `BEGIN IMMEDIATE`: the winner alone changes handoff/delivery/budget, creates one claim/token commitment, and receives the bearer; the committed-scope loser is idempotency conflict, while a stale different/uncommitted delivery is `CT_FENCE_MISMATCH` or `CT_NOT_FOUND` as classified below. Token-generation/constraint failure rolls back the budget and every state change. There is at most one delivery and claim per handoff generation by exact constraints.

After safe anchor resolution, writer acquisition failure is `CT_BUSY`. Under the lock claim precedence is: exact schema-4/anchor/state/lease → OFF/ROLLING_BACK → request shape and purpose/es relation → immutable claimant Ctx/binding → idempotency identity/scope pair → delivery then handoff existence (`CT_NOT_FOUND`) → repository/purpose/state/generation/fingerprint/no-claim CAS (`CT_INVALID_TRANSITION` for incompatible handoff state/purpose, otherwise `CT_FENCE_MISMATCH`) → budget (`CT_SESSION_BUDGET_EXHAUSTED`) → token/insert/update-count/cross-row validation (`CT_SCHEMA_INVALID`). No later error masks an earlier one and every failure is non-mutating.

## Exact P3-route lift from schema 3 to schema 4

Migration 004 does not strand or silently reinterpret P3 authority. Schema 3 remains accepted by the unchanged P2/P3 operation implementations; schema 4 is an explicit version branch with the same request/authority/response/error contracts and these exact persistence differences:

- `bootstrapMain` fresh schema-4 binding/rebind uses the existing P3 scope and digest definitions with only `schema_version:4` replacing `3` in its CAS member. A committed schema-3 bootstrap scope preserved by Migration 004 remains exactly replayable on schema 4: after current schema/anchor/OFF/NONE/Main authority validation, core recomputes the historical schema-3 CAS from the immutable target/predecessor and accepts only the exact stored request/CAS/response and approved migration-4 successor state. It never rewrites that idempotency row. A fresh tuple at the occupied scope remains `CT_IDEMPOTENCY_CONFLICT`; a new epoch uses the schema-4 CAS.
- `activate` on schema 4 keeps `activation_transition_v1`, request/scope, Main predicate, response, and OFF/ON classifications. Its precondition replaces `schema_version:3` and `delivery_plane:"ABSENT_SCHEMA_3"` with `schema_version:4`, `delivery_plane:"SCHEMA_4_EMPTY"`, and exact counts `handoffs:0,transitions:0,deliveries:0,claims:0,budget_scopes:0`. All must be zero before first schema-4 activation; nonzero/malformed rows are `CT_NOT_QUIESCENT|CT_SCHEMA_INVALID` under the existing proof/structure distinction. `precondition_digest`, CAS, activation row, and idempotency row bind those members. Activation still creates no work or delivery.
- `register` uses the unchanged P2 request/scope/CAS and binding transition on schema 4. It does not seed/reset budget; P4-B's first successful claim transaction owns the absent budget seed. Exact P2 registration replay remains valid because its CAS already binds mode/lease/identity rather than a schema number.
- P4-A1b `receive` accepts empty schema 4 and deliberately returns `{delivery:null}` after the unchanged P2 identity predicate; A1c replaces only its manifest/cross-row validator with the total evolved-state validator while preserving that result. The null-only result remains through A2/A3 even when A3 has a PENDING delivery. P4-B replaces only that final result with the selection algorithm above. Schema-2/3 receive remains unchanged.
- `status` selects the exact manifest validator by observed schema. Schema-3 response remains byte-for-shape identical with `schema_version:3` and structural zero delivery counts. Schema-4 returns `schema_version:4` and the factual counts defined below; request, anchor, mode/lease, Main/activation coherence, token non-disclosure, and errors are unchanged. Schema-4 activation validation recomputes the schema-4 precondition rather than accepting a schema-3 digest.

P4-A1b RED pins fresh/empty schema-4 bootstrapMain replay/CAS, activation precondition/digest, register compatibility, receive-null behavior, and exact empty status counts. The preserved P4-A1c baseline pins P4-owned evolved/non-empty counts and total migration retry but remains unapproved. R1 adds exact bidirectional transition/idempotency/envelope/CAS/fence commitments. The fresh final A1c P4-only gate must prove those commitments and fail-closed refusal of unsupported future histories before A2 starts; it has not passed yet. No P3 row is deleted, normalized, or checksum-aliased. A2 and A3 inherit A1b plus the gate-passed P4-only A1c suite and may add only their named handlers/routes.

## Capability-gated core/MCP exposure

The aggregate name set remains Revision 11's set without `start`; unsupported P5+ names fail `CT_PAYLOAD_INVALID` before database access. Constructor capabilities remain the sole route to continuation dispatch and `Ctx`; requests cannot supply authority.

- Default `createMcpHandler()` has no trusted adapter capability, lists exactly the eight legacy `tower_*` tools, and direct unprefixed calls remain unknown. Legacy `register(handle,role)` and consuming `receive(handle)` never enter continuation dispatch.
- P4-A1a changes no route or schema acceptance. P4-A1b keeps exactly P3's `bootstrapMain|activate|status|register|receive` runtime continuation set while lifting it to empty schema 4; the A1c baseline and R1 change only schema-4 validator/retry support and add no business route or mutation. The final A1c P4-only gate adds no implementation or route. A2 adds only `create`; A3 adds only `validate|publish`, with request schemas that contain no `validation_digest`. At A3, those eight runtime continuation names are appended only when both trusted-metadata and process-identity capabilities exist. `provisionMainAuthorityAnchor|bootstrapAdmin` remain CLI-only; `claim` and P5+ routes remain absent.
- P4-B adds only `claim` and replaces only continuation receive's final schema-4 null lookup with the deterministic peek. All P3 and P4-A1a/A1b/A1c/A2/A3 names/shapes remain unchanged.
- MCP JSON Schemas use `additionalProperties:false`, exact required fields/enums/limits above, and preserve explicit-null rejection. Schema acceptance is not authority; core repeats all checks.

P4 status keeps the P3 response shape and changes only factual counts after exact schema-4 validation: `live_counts.claims` counts LIVE claims, `live_counts.deliveries` counts PENDING+CLAIMED deliveries, workers retains ACTIVE claimant count; pending work/attestation count PENDING by purpose. It never exposes IDs or token material. P4-A3 status may report PENDING work before P4-B receive can return it.

## Chained verification, ownership, and rollback

| Unit | Starts from / dependency | GREEN end state | Scenario/test ownership | Independent ceiling | Rollback boundary |
|---|---|---|---|---:|---|
| P4-A1a | committed P3 HEAD `f20d6a369b18b46890e8e98263dbf97d6973c427`; no P4 predecessor | exact SQL/checksum/manifest constants and independent tests exist; runtime still accepts at most schema 3 | Migration 004 LF bytes/lines/checksum, all 19 new object definitions, complete 36-object manifest definitions; no migration/replay/scenario completion claim | 480–620 | revert only A1a constants/manifest definitions/tests/evidence; schema and runtime behavior remain P3 |
| P4-A1b | green A1a | fresh schema 3→4 and exact empty schema-4 replay are atomic; P3 routes green on schema 3/4 | fresh/empty migration, DDL rollback, bounded busy, zero-row successor evidence, and schema-4 preservation projection of `CT-R8-S5` only (P3 retains completion ownership) | 560–760 | revert A1b migration execution/version branches/routes/tests/evidence; never down-migrate a real schema-4 DB; preserve A1a constants |
| P4-A1c baseline | green A1b; preserved implementation snapshot | current read-only validator/retry implementation remains available but unapproved after repeated gate failure | existing 588 implementation/test lines and 78/549 historical evidence only; no completion or approval claim | 588 actual | do not remove or rewrite during replan; any later rollback preserves A1a/A1b and leaves this fail-closed baseline intact |
| P4-A1c-R1 | preserved A1c baseline | exact handoff↔transition, delivery↔PUBLISH/history, and claim↔CLAIM/idempotency reverse commitments; historical CAS/fences derive only from immutable persisted envelopes | paired valid/malformed reverse-link, authority, operation-scope, envelope, CAS/fence, decision/response, budget/token, and timestamp differential coverage; no CT scenario completion claim | 360–520 incremental | revert only R1 validator helpers/tests/evidence to the unapproved A1c baseline; preserve A1a/A1b and schema-4 rows byte-for-byte |
| P4-A2 | fresh final A1c P4-only gate passed after R1; gate currently pending | immutable canonical DRAFT handoff plus capability-gated `create`; no validation or delivery | create-side structural/provenance portions of `CT-R2-S1..S3`; partial coverage only, not duplicate scenario completion | 380–560 | revert A2 create handler/route/tests/evidence; preserve schema 4 and all A1 compatibility |
| P4-A3 | green A2 | DRAFT→VALIDATED→PUBLISHED with server-derived persisted validation evidence and one durable PENDING WORK delivery | authoritative validation/publication remainder completing `CT-R2-S1..S3` after A2; P4 handoff/publication response projection of `CT-R3-S5` | 430–620 | revert A3 validate/publish/delivery handlers/routes/tests/evidence; preserve schema 4 and A2 DRAFT rows |
| P4-B | green A3 | deterministic non-consuming receive; atomic PENDING→CLAIMED; claimant fence/token commitment; one-unit root-session budget | `CT-R6-S1..S2`, `CT-R6-S4..S6`, and delivery/claim response projection of `CT-R3-S5`; no `CT-R6-S3` claim | 520–720 | revert B receive/claim/budget-accounting/routes/tests/evidence; preserve A3 published rows |

Strict TDD is independent for each implementation unit: preserve the prior green safety net; record a genuine RED before each unit's production edits, complete its GREEN/triangulation under 800, and start the next unit only from the prior gate-passed boundary. Tests stay with their behavior; each unit records focused/full/fail-closed, syntax/diff, runtime N/A, preservation, exact authored line count, start/end/dependency, and rollback evidence. A1a records exact migration bytes/lines/checksum without enabling schema 4; A1b records SQLite execution syntax through its focused migration behavior; the existing A1c evidence remains historical but unapproved; R1 retains its own incremental RED/GREEN evidence and **360–520** forecast. The final A1c P4-only gate validates the completed P4-only boundary without creating a new implementation budget. If any concrete forecast exceeds 800 before its RED/production boundary, stop and split that unit further; budgets are never borrowed.

A1a triangulates only SQL/manifest constant identity and cannot enable schema 4. A1b triangulates the fresh and empty-replay lanes, wrong mode/lease, DDL/busy rollback, P1–P3/legacy preservation, and schema-4 P3 compatibility. The A1c baseline remains the preserved read-only validator/retry prerequisite. R1 owns exact reverse links and immutable historical envelope-derived CAS/fences. The final A1c P4-only gate owns only fresh validation of supported P4 prefixes and `CT_SCHEMA_INVALID` refusal of unsupported future histories. Every later rollback removes only that unit's handlers/routes/tests/evidence; persisted rows remain structurally validated and inert under the predecessor boundary. A2 triangulates malformed JCS/Unicode, all structural limits, immutable content/DELETE, duplicate lineage/revision, operation-scoped replay/conflict, CREATE envelopes, default eight tools, and unsupported routes. A3 triangulates fingerprint/source/reference mismatch, executable-looking inert files, server-derived canonical validation evidence, immutable validation metadata, canonical replay envelopes, changed-request conflicts, publish replay, non-disclosure, and durable delivery rollback. B triangulates receive snapshots/order, stale/rebound/full-tuple claimant fences, concurrent claims, fresh-only bearer issuance, token-free exact envelope replay, cross-operation same-identity acceptance, same-operation conflict, token non-disclosure, budget exhaustion/rollback, purpose/es mismatch, and no legacy consumption. ACK, ATTEST_COMPLETION, COMPLETE, and REJECT acceptance remains P5-owned; RECOVER acceptance remains P6-owned. `CT-R6-S3`, completion, attestation, ack/effects, proof-bound recovery, rollback, redelivery mutation, polling, runtime activation/publication, commit, push, and PR remain outside P4.

## P5 Slice 5 exact lifecycle operations: `ack|attestCompletion|complete|reject|revise`

P5 is **core/MCP only**. It adds **no migration object and alters no Migration 004 byte or checksum**. Migration 004 already created every lifecycle table/index/trigger with the dormant `ct_handoff.state`/`ct_handoff_transition.operation`/`ct_delivery.handoff_state_snapshot`/`ct_delivery.purpose` CHECK members that P5 now activates; P5 seeds no schema object and depends on the exact 36-object schema-4 manifest defined above. There is no `start` API and there must never be one: `ack` is the sole start. Producers submit immutable content only; `attestCompletion`, `reject`, and `revise` require the ACTIVE Main identity; `ack` and `complete` require the ACTIVE claimant identity. Each mutation is exactly one bounded `BEGIN IMMEDIATE` transaction that appends exactly one immutable `ct_handoff_transition` row plus one `ct_idempotency` row, and mutates only the columns named below. Every P5 read revalidates the full schema-4 cross-row invariant set and treats a well-formed but contradictory row as `CT_SCHEMA_INVALID`, never repaired.

### Persistence binding to the dormant schema-4 objects (no new tables)

There is no `ct_attestation`, `ct_effect`, or `ct_committed_result` table and none is created. P5 binds each concept to columns that already exist:

- **Attestation** is the immutable `ct_handoff_transition` row with `operation='ATTEST_COMPLETION'`, `from_state='STARTED'`, `to_state='COMPLETION_ATTESTED'`, `authority_kind='MAIN'`, and `decision_digest = attestation_digest`, paired with its `ct_idempotency` row `(operation='attestCompletion', scope_key='handoff:<id>:generation:<eg>:attest')` whose `response_json` carries the canonical `attestation_evidence_v1`. The attested state is `ct_handoff.state='COMPLETION_ATTESTED'`. "Unused" means no `ct_handoff_transition` row with `operation='COMPLETE'` names that handoff/generation yet; single-use is enforced structurally because `complete` CASes `ct_handoff.state` `COMPLETION_ATTESTED→COMPLETED` exactly once.
- **Effect manifest and pre-start boundary** are the immutable `ct_handoff_transition` row with `operation='ACK'`, `from_state='CLAIMED'`, `to_state='STARTED'`, `authority_kind='CLAIMANT'`, and `decision_digest = ack_decision_digest` (which binds `effect_manifest_digest` and `pre_start_boundary_digest`), paired with its `ct_idempotency` row `(operation='ack', scope_key='handoff:<id>:generation:<eg>:ack')` whose `response_json.evidence` carries the complete `effect_manifest_v1` recorded against `ct_handoff.id`+`generation`. No separate effect table exists; the persisted `ack` envelope is the durable effect record (CT-R12-S2).
- **Committed result** is the immutable `ct_handoff_transition` row with `operation='COMPLETE'`, `from_state='COMPLETION_ATTESTED'`, `to_state='COMPLETED'`, `authority_kind='CLAIMANT'`, and `decision_digest = complete_decision_digest`, paired with its `ct_idempotency` row `(operation='complete', scope_key='handoff:<id>:generation:<eg>:complete')` whose `response_json.evidence` carries the canonical `committed_result_v1`. Completion also sets `ct_handoff.state='COMPLETED'`, `ct_claim.claim_state='CLOSED'`+`ct_claim.closed_at`, and `ct_delivery.delivery_state='CLOSED'`+`ct_delivery.closed_at` for the consumed claim/delivery.
- **Rejection/revision** use `ct_handoff.state` (`DRAFT|VALIDATED|PUBLISHED→REJECTED`), the `ct_delivery` close columns for a rejected `PUBLISHED` PENDING delivery, and a brand-new `ct_handoff` row at the next `revision` for `revise` (`operation='REVISE'`, `from_state IS NULL`, `to_state='DRAFT'`, `authority_kind='MAIN'`). The `REVISE` transition names the new handoff id; the REJECTED source row is never rewritten.

All P5 generation values are `0`, identical to the P4 generation-0 world; the redelivery generation axis and any `ct_delivery.handoff_state_snapshot='COMPLETION_ATTESTED'` row belong to P6 recovery, not P5.

### Shared P5 request, authority, digest, and token rules

P5 reuses the P4 fence and authority envelopes verbatim: `writer_fence_v1 = {schema_version:4,mode:"ON",anchor_id,config_digest,observed_rollback_epoch,observed_lease_version,observed_lease_status:"NONE"}`, `main_authority_v1 = {main_binding_id,binding_epoch,identity_digest}`, and `claimant_authority_v1 = {binding_id,identity_digest,ctx_digest}`. Every P5 call requires schema 4, mode `ON`, lease `NONE`, and the exact single ACTIVE Main (for `attestCompletion|reject|revise`) or single ACTIVE claimant (for `ack|complete`) predicate already implemented for P3/P4, using the constructor-owned single-use `Ctx` factory only after the schema/mode/request-shape gates. Requests reject any extra or forbidden identity/authority/`Ctx`/timestamp field `CT_PAYLOAD_INVALID`; all JSON is `additionalProperties:false` with explicit-null rejection. IDs are lowercase canonical UUID (`request_identity`, `lineage_id`) or base64url-no-padding (`id`, `delivery_id`); `eg` is a safe non-negative integer; scope strings use base-10 integers without sign or leading zero. Server-generated UTC RFC3339-millisecond (24-byte) timestamps are the only timestamps; requests never contain one.

For the non-token operations (`attestCompletion`, `reject`, `revise`) `request_digest = SHA-256(UTF8(JCS(the exact accepted request including request_identity)))`, exactly as P4. For the two token-bearing claimant operations (`ack`, `complete`) the raw bearer is never stored or re-hashed against a stored hash: define `token_hash = SHA-256(UTF8(token))` (the P4 `token_hash` scheme) and the token-free `authenticated_request = {the accepted request with the `token` member removed, plus token_hash}`; then `request_digest = SHA-256(UTF8(JCS(authenticated_request)))`, and the persisted `ct_idempotency.response_json.evidence.request` is exactly `authenticated_request`. The server hashes the caller bearer's UTF-8 bytes once, constant-time compares that hash to the persisted `ct_claim.token_hash`, and on mismatch fails `CT_TOKEN_MISMATCH` without redisclosing salt, hash, or token. Replay recomputes `token_hash` from the resent bearer, rebuilds `authenticated_request`, and compares `request_digest`; the raw token is never persisted, returned, logged, or placed in any transition/decision/response value.

Exact single-use scope keys and CAS inputs (`cas_digest = SHA-256(UTF8(JCS(named object)))`; the `ct_idempotency` table stays unique by `(operation,request_identity)` and primary-keyed by `(operation,scope_key)`; `request_identity` is intentionally not globally unique across operations, and reusing a UUID across `create/validate/publish/claim/ack/attestCompletion/complete/reject/revise` has no cross-operation replay/conflict meaning):

| Operation | Scope key | CAS digest input |
|---|---|---|
| `ack` | `handoff:<id>:generation:<eg>:ack` | server-derived `{kind:"ack_cas_v1",version:1,writer_fence_v1,claimant_authority_v1,delivery_id,id,expected_delivery_state:"CLAIMED",expected_handoff_state:"CLAIMED",expected_generation:eg,purpose:"WORK",claim_id,claimant_fence_digest,token_hash,handoff_fingerprint,effect_manifest_digest,pre_start_boundary_digest}` |
| `attestCompletion` | `handoff:<id>:generation:<eg>:attest` | server-derived `{kind:"attest_cas_v1",version:1,writer_fence_v1,main_authority_v1,id,expected_state:"STARTED",expected_generation:eg,handoff_fingerprint,claim_id,claimant_fence_digest,effect_manifest_digest,pre_start_boundary_digest,attestation_digest,expected_attestation:"ABSENT"}` |
| `complete` | `handoff:<id>:generation:<eg>:complete` | server-derived `{kind:"complete_cas_v1",version:1,writer_fence_v1,claimant_authority_v1,delivery_id,id,expected_delivery_state:"CLAIMED",expected_handoff_state:"COMPLETION_ATTESTED",expected_generation:eg,purpose,claim_id,claimant_fence_digest,token_hash,attestation_digest,expected_claim_state:"LIVE",result_digest}` |
| `reject` | `handoff:<id>:generation:<eg>:reject` | server-derived `{kind:"reject_cas_v1",version:1,writer_fence_v1,main_authority_v1,id,expected_state:es,expected_generation:eg,handoff_fingerprint,expected_delivery:(es="PUBLISHED"?"PENDING_UNCLAIMED":"ABSENT"),delivery_id}` |
| `revise` | `handoff:<lineage_id>:revision:<target_revision>` | server-derived `{kind:"revise_cas_v1",version:1,writer_fence_v1,main_authority_v1,lineage_id,target_revision,source_id,source_revision,source_expected_state:"REJECTED",payload_digest,handoff_fingerprint,expected_lineage_revision:"ABSENT"}` |

For `revise`, `target_revision = source_revision + 1`; `delivery_id` in the `reject` CAS is the resolved PENDING WORK delivery id when `es="PUBLISHED"` and `null` otherwise. Every derived member (`claim_id`, `claimant_fence_digest`, `token_hash`, `handoff_fingerprint`, `effect_manifest_digest`, `pre_start_boundary_digest`, `attestation_digest`, `result_digest`) is computed by the server from immutable rows and the accepted request; none is accepted as a caller CAS input.

### Effect manifest and pre-start boundary (CT-R12)

`ack` accepts a caller `effect_manifest` that is one plain `Object.prototype` object with exactly this shape (optional fields do not exist):

```text
effect_manifest_v1 = {
  kind:"effect_manifest_v1", version:1, id, generation,
  effects:[{
    effect_index,                                   // 0-based, contiguous, strictly ascending
    target_kind:"DATABASE"|"EXTERNAL_API"|"FILESYSTEM",
    target,                                         // NUL-free UTF-8, 1..1024 bytes
    operation,                                      // NUL-free UTF-8 declared mutation verb, 1..128 bytes
    observability:"OBSERVABLE"|"UNOBSERVABLE",
    compensatability:"COMPENSATABLE"|"NON_COMPENSATABLE",
    pre_state_digest                                // sha256: + 64 lowercase hex
  }],
  pre_start_boundary_digest                         // sha256: + 64 lowercase hex
}
```

`id` and `generation` MUST equal the request `id`/`eg`. `effects` has 1..256 entries, is duplicate-free, and is strictly sorted with contiguous `effect_index` values `0..n-1`. The JCS manifest is at most 65536 UTF-8 bytes and rejects extra/missing keys, arrays in object positions, foreign/null prototypes, `undefined`, bigint, non-finite/`-0`, NUL, or unpaired surrogates. The server recomputes `pre_start_boundary_digest = SHA-256(UTF8(JCS({kind:"effect_boundary_v1",version:1,id,generation,effects:[{effect_index,target_kind,target,pre_state_digest}]})))` over the effects in manifest order and requires the caller value to equal it; `effect_manifest_digest = SHA-256(UTF8(JCS(effect_manifest_v1)))` is computed over the accepted manifest. A "complete" manifest is one that is structurally complete under these rules and persisted atomically inside `ack` **before** `ct_handoff.state` becomes `STARTED`; an incomplete/malformed manifest or a mismatched boundary is `CT_EFFECT_MANIFEST_INVALID` with no `STARTED` and no effect (CT-R12-S1). Declaring an effect `UNOBSERVABLE` or `NON_COMPENSATABLE` is permitted honesty and does not block `ack`, but it does forbid later republish (below).

P5 also fixes the compensation and read-back envelope shapes and digests that a later STARTED rollback must satisfy; the STARTED-rollback operation itself (`RECOVER`) executes in **P6**, bound to these exact P5-owned shapes and to the `pre_start_boundary_digest` P5 persisted at `ack`:

```text
compensation_receipt_v1 = {
  kind:"compensation_receipt_v1", version:1, id, generation, effect_index,
  target_kind, target, compensation_operation,
  read_back_digest, read_back_matches_pre_state:true|false, occurred_at
}
rollback_proof_v1 = {
  kind:"rollback_proof_v1", version:1, id, generation, pre_start_boundary_digest,
  receipts:[compensation_receipt_v1 ...],                 // ordered, one per declared effect
  observed_boundary_digest, boundary_equal:true|false
}
rollback_proof_digest = SHA-256(UTF8(JCS(rollback_proof_v1)))
```

Rollback proof succeeds only if `boundary_equal` is `true` (i.e. `observed_boundary_digest` recomputed by an independent read-back equals `pre_start_boundary_digest`) and every `receipts[i].read_back_matches_pre_state` is `true` for a fully declared, `OBSERVABLE`, `COMPENSATABLE` effect set (CT-R12-S3). Any undeclared, `UNOBSERVABLE`, `NON_COMPENSATABLE`, or read-back-mismatching effect makes `boundary_equal` false and forbids republish: the row stays `STARTED`/blocked or becomes `WORK_SUSPENDED`, and an unprovable boundary becomes `UNKNOWN/POISONED` (`ct_handoff.state='POISONED'`) (CT-R12-S4). P5 owns these definitions and the fail-closed `ack` persistence; P5 emits no `RECOVER` transition.

### Attestation evidence (CT-R1-S2)

`attestCompletion` derives one canonical token-free proof value from immutable rows only (no caller evidence or digest), exactly as P4 `validate` does:

```text
attestation_evidence_v1 = {
  kind:"attestation_evidence_v1", version:1,
  id, lineage_id, revision, generation, handoff_fingerprint,
  repository_fingerprint, git_common_dir_fingerprint,
  source_merge:{sha, url},                                 // ct_handoff.source_merge_sha/source_merge_url
  content:{next_unit_scope_digest, provenance_digest, decision_summary_digest},
  claim:{claim_id, delivery_id, purpose:"WORK", claimant_fence_digest, claimant_identity_digest},
  effects:{effect_manifest_digest, pre_start_boundary_digest},
  attestor:{main_binding_id, binding_epoch, main_identity_digest}
}
attestation_evidence_json = JCS(attestation_evidence_v1)
attestation_digest = SHA-256(UTF8(attestation_evidence_json))
```

Every `id/lineage_id/revision/generation/handoff_fingerprint/repository_fingerprint/git_common_dir_fingerprint/source_merge/content` member MUST equal the immutable `ct_handoff` row; `claim.*` MUST equal the live `ct_claim` row that ACKed the work; `effects.*` MUST equal the persisted `ACK` envelope's `effect_manifest_digest`/`pre_start_boundary_digest`. This binds the attestation to the exact unit, repository/common-dir fingerprints, worktree/branch/base (via the immutable provenance and the claimant `Ctx` captured in the claim), merge SHA/URL, source, generation, claimant fence, JCS digest, and effects required by CT-R1-S2. The server persists `attestation_evidence_json` in the `attestCompletion` idempotency `response_json` and sets the `ATTEST_COMPLETION` transition `decision_digest = attestation_digest`. No request, preview, or caller value supplies or predicts `attestation_digest`.

### `ack` (CLAIMED→STARTED, CLAIMANT)

`ack` accepts exactly `{request_identity, delivery_id, id, es:"CLAIMED", eg, purpose:"WORK", token, effect_manifest}`. Under the writer lock it requires schema 4/ON/NONE, the single ACTIVE claimant, its idempotency pair, the existing `ct_delivery` (`purpose='WORK'`, `delivery_state='CLAIMED'`, `claim_id` set) and `ct_handoff` (`state='CLAIMED'`, matching generation and repository/common-dir fingerprints), the LIVE `ct_claim` named by that delivery whose `token_hash` matches the presented bearer, and a complete persisted-before-STARTED effect manifest. It then CASes `ct_handoff.state` `CLAIMED→STARTED` (no generation change), appends the `ACK` transition, and inserts the `ack` idempotency envelope. The `ct_delivery` stays `CLAIMED` and the `ct_claim` stays `LIVE` while work is in progress. `ack_decision_v1 = {kind:"ack_decision_v1",version:1,delivery_id,id,from_state:"CLAIMED",to_state:"STARTED",generation:eg,claim_id,claimant_fence_digest,token_hash,effect_manifest_digest,pre_start_boundary_digest}` and `decision_digest = SHA-256(UTF8(JCS(ack_decision_v1)))`. Response is exactly `{id,state:"STARTED",generation:eg,replayed}`.

### `attestCompletion` (STARTED→COMPLETION_ATTESTED, MAIN)

`attestCompletion` accepts exactly `{request_identity, id, es:"STARTED", eg}` — no caller evidence, digest, authority, or timestamp member. Under the writer lock it requires schema 4/ON/NONE, the single ACTIVE Main, its idempotency pair, the `ct_handoff` (`state='STARTED'`, matching generation/fingerprint), and the LIVE `ct_claim`+persisted `ACK` effect envelope it references. It derives `attestation_evidence_v1`/`attestation_digest`, constructs `attest_cas_v1`, CASes `ct_handoff.state` `STARTED→COMPLETION_ATTESTED` (no generation change), appends the `ATTEST_COMPLETION` transition with `decision_digest=attestation_digest`, and inserts the `attestCompletion` idempotency envelope carrying `attestation_evidence_json`. Exactly one attestation exists because the state CAS moves `STARTED→COMPLETION_ATTESTED` once and the single-use scope key blocks a second attest. Response is exactly `{id,state:"COMPLETION_ATTESTED",generation:eg,replayed}`; it exposes no evidence, digest, or authority.

### `complete` (COMPLETION_ATTESTED→COMPLETED, CLAIMANT)

`complete` accepts exactly `{request_identity, delivery_id, id, es:"COMPLETION_ATTESTED", eg, purpose, token, attestation_digest, committed_result}` with `purpose ∈ {WORK, ATTESTATION_REDELIVERY}`. `committed_result` is one plain object `committed_result_v1 = {kind:"committed_result_v1",version:1,id,generation,attestation_digest,result_digest,result_ref,effect_settlement_digest}` where `id/generation/attestation_digest` mirror the request, `result_digest`/`effect_settlement_digest` are `sha256:`+64hex, and `result_ref` is NUL-free UTF-8 1..2048 bytes; `result_digest` is the server CAS member. Under the writer lock it requires schema 4/ON/NONE, the single ACTIVE claimant, its idempotency pair, the `ct_delivery` (`delivery_state='CLAIMED'`, matching purpose/generation) and its LIVE `ct_claim` whose `token_hash` matches the presented bearer, `ct_handoff.state='COMPLETION_ATTESTED'`, and a request `attestation_digest` equal to the persisted `ATTEST_COMPLETION` transition `decision_digest`. It then CASes `ct_handoff.state` `COMPLETION_ATTESTED→COMPLETED`, closes the claim (`claim_state='CLOSED'`+`closed_at`) and the delivery (`delivery_state='CLOSED'`+`closed_at`), appends the `COMPLETE` transition, and inserts the `complete` idempotency envelope carrying `committed_result_v1`. `complete_decision_v1 = {kind:"complete_decision_v1",version:1,delivery_id,id,from_state:"COMPLETION_ATTESTED",to_state:"COMPLETED",generation:eg,purpose,claim_id,claimant_fence_digest,token_hash,attestation_digest,result_digest}` and `decision_digest = SHA-256(UTF8(JCS(complete_decision_v1)))`. Response is exactly `{id,state:"COMPLETED",generation:eg,replayed}` and returns no token.

This is the `CT-R6-S3` completion race: two `complete` calls serialize under `BEGIN IMMEDIATE`; the winner alone moves `COMPLETION_ATTESTED→COMPLETED` and closes the single-use attestation, claim, and delivery; the committed-scope loser with the same identity is `CT_IDEMPOTENCY_CONFLICT`, and a distinct identity finds `ct_handoff.state='COMPLETED'` (not `COMPLETION_ATTESTED`) and is `CT_INVALID_TRANSITION`. The redelivery reconciliation is exact: `complete` accepts either the original live `WORK` claim (the P4-B generation-0 claim, the only path with real P5 fixtures) or a live `ATTESTATION_REDELIVERY` claim; the creation of any `ATTESTATION_REDELIVERY` delivery/claim (at a distinct generation, `ct_delivery.handoff_state_snapshot='COMPLETION_ATTESTED'`) is P6-owned, so P5 defines and fail-closed-tests the redelivery acceptance but exercises completion only through the `WORK` claim.

### `reject` (DRAFT|VALIDATED|PUBLISHED→REJECTED, MAIN)

`reject` accepts exactly `{request_identity, id, es, eg}` with `es ∈ {DRAFT, VALIDATED, PUBLISHED}`. It requires the single ACTIVE Main, an unclaimed handoff, and the exact safe state. For `DRAFT`/`VALIDATED` no `ct_delivery`/`ct_claim` may exist for that handoff/generation. For `PUBLISHED` exactly one `ct_delivery` must exist with `purpose='WORK'`, `delivery_state='PENDING'`, `claim_id IS NULL`, and no `ct_claim`; `reject` closes it (`delivery_state='PENDING'→'CLOSED'`+`closed_at`) so it can never be claimed. Any LIVE claim or `CLAIMED`+ state is `CT_INVALID_TRANSITION`. It CASes `ct_handoff.state` `es→REJECTED` (no generation change), appends the `REJECT` transition (`authority_kind='MAIN'`, `decision_digest = SHA-256(UTF8(JCS({kind:"reject_decision_v1",version:1,id,from_state:es,to_state:"REJECTED",generation:eg,closed_delivery_id})))`, `closed_delivery_id` null unless a PENDING delivery was closed), and inserts the `reject` idempotency envelope. Response is exactly `{id,state:"REJECTED",generation:eg,replayed}`.

### `revise` (new immutable DRAFT revision N+1, MAIN)

`revise` accepts exactly `{request_identity, source_id, lineage_id, revision, payload, payload_digest}`, where `revision = source_revision + 1` and `payload` obeys the identical canonical `control_tower_handoff_v1` shape, bounds, digests, and provenance rules defined for `create`, with `payload.lineage.lineage_id = lineage_id` and `payload.lineage.revision = revision`. It requires the single ACTIVE Main, the source `ct_handoff` at `(lineage_id, source_revision)` in state `REJECTED` (`CT_NOT_FOUND` if absent, `CT_INVALID_TRANSITION` if the source is not `REJECTED`), and no handoff at `(lineage_id, revision)`. It inserts one new immutable `ct_handoff` row at the target `revision` in `state='DRAFT'`, `generation=0`, with a fresh id/`handoff_fingerprint`, `producer_binding_id`/`producer_identity_digest`/`producer_ctx_json`/`producer_ctx_digest` recording the reviser Main binding, and appends the `REVISE` transition (`from_state IS NULL`, `to_state='DRAFT'`, `authority_kind='MAIN'`, handoff_id = the new id, `decision_digest = SHA-256(UTF8(JCS({kind:"revise_decision_v1",version:1,new_id,lineage_id,revision,source_id,source_revision,new_handoff_fingerprint})))`). The REJECTED source row and every prior revision are untouched (CT-R1-S6). Response is exactly `{id:<new_id>,state:"DRAFT",generation:0,revision,replayed}`.

### P5 envelopes, replay, and immutable evidence

For every P5 operation `response_digest = SHA-256(UTF8(JCS(the replayed-false public response)))`, and `ct_idempotency.response_json` stores canonical `{kind:"<op>_response_envelope_v1",version:1,public_response,evidence:{request,request_digest,scope_key,cas_input,cas_digest, <op-specific>}}`, where for `ack`/`complete` `request` is the token-free `authenticated_request`. The operation-specific evidence members are: `ack` → `{claim_id,claimant_fence_digest,token_hash,effect_manifest_digest,pre_start_boundary_digest}` (the full `effect_manifest_v1` lives inside `evidence.request.effect_manifest`); `attestCompletion` → `{attestation_digest,attestation_evidence:attestation_evidence_v1,claim_id,effect_manifest_digest,pre_start_boundary_digest}`; `complete` → `{attestation_digest,committed_result:committed_result_v1,result_digest,claim_id,delivery_id,token_hash}`; `reject` → `{closed_delivery_id}`; `revise` → `{new_id,new_handoff_fingerprint,source_id,source_revision}`. Adapters return only `public_response`; every CAS/digest/authority/token-hash/attestation/result member is server-derived and stored only for immutable historical replay. No raw token appears in any envelope, decision, response, transition, status, event, log, or MCP schema.

Exact replay first re-establishes the current Main (for `attestCompletion|reject|revise`) or claimant (for `ack|complete`) authority, then parses the canonical envelope JCS and verifies operation-qualified identity/scope, accepted request/request digest (for `ack`/`complete` recomputed from the resent bearer's `token_hash`), historical CAS input/digest, public response/response digest, decision digest, transition authority, and the exact cross-row commitments the envelope names (handoff/claim/delivery/attestation/effect rows). It returns the stored public response with only `replayed:true`, creates no row, reddiscloses no bearer, and re-reads no mutable Git/filesystem state. A changed accepted request or another identity naming the committed single-use scope is `CT_IDEMPOTENCY_CONFLICT`; a missing, non-canonical, current-state-derived, or contradictory envelope/evidence/transition pair is `CT_SCHEMA_INVALID`. Anchor mismatch precedes replay.

### P5 precedence ladders and error taxonomy

After safe anchor resolution, writer-lock acquisition failure is `CT_BUSY`. Under the lock every P5 operation follows this deterministic ladder; no later rung masks an earlier one and every failure is non-mutating:

1. exact schema-4/anchor/state/lease structure → `CT_SCHEMA_INVALID | CT_ANCHOR_MISMATCH`;
2. `OFF`/`ROLLING_BACK` → `CT_CONTINUATION_OFF | CT_ROLLBACK_IN_PROGRESS`;
3. exact request shape/JCS and request digest (for `ack`/`complete`, the token-free `authenticated_request` digest) → `CT_PAYLOAD_INVALID`;
4. current authority — Main for `attestCompletion|reject|revise` (`CT_WORKFLOW_MAIN_REQUIRED | CT_MAIN_BINDING_CONFLICT | CT_FENCE_MISMATCH`), claimant for `ack|complete` (`CT_SESSION_* | CT_FENCE_MISMATCH`);
5. operation-qualified idempotency pair → exact persisted replay, `CT_IDEMPOTENCY_CONFLICT`, or malformed-pair `CT_SCHEMA_INVALID`;
6. delivery then handoff (and, for `revise`, source handoff) existence → `CT_NOT_FOUND` (except `revise`'s absent target scope);
7. legal-state/generation/purpose/fingerprint/claim/delivery fences → `CT_INVALID_TRANSITION` for a wrong-but-legal state (handoff not `CLAIMED`/`STARTED`/`COMPLETION_ATTESTED`/safe/`REJECTED-source`, claim not `LIVE`, delivery not `CLAIMED`/`PENDING_UNCLAIMED`), otherwise `CT_FENCE_MISMATCH`;
8. for `ack`/`complete`, constant-time bearer `token_hash` comparison → `CT_TOKEN_MISMATCH`;
9. for `complete`, request `attestation_digest` equality with the persisted `ATTEST_COMPLETION` `decision_digest` → `CT_FENCE_MISMATCH` (missing/consumed attestation already resolved at rung 7 by `CT_INVALID_TRANSITION`);
10. for `ack`, structural completeness/JCS/bounds/boundary of `effect_manifest_v1` → `CT_EFFECT_MANIFEST_INVALID`; for `revise`, full `create`-grade payload/provenance proof → `CT_PAYLOAD_INVALID`;
11. server derivation of evidence/attestation/decision/CAS members → commit constraints → `CT_SCHEMA_INVALID`.

P5 introduces exactly two new fail-closed codes — `CT_TOKEN_MISMATCH` (bearer hash mismatch on `ack`/`complete`) and `CT_EFFECT_MANIFEST_INVALID` (incomplete/malformed/boundary-mismatched `ack` manifest) — and reuses the existing taxonomy for every other rung. Any error rolls back all handoff/delivery/claim/transition/idempotency changes.

### P5 fixtures (real state only)

Every P5 precondition is built by actually running the P4 operations, never by inserting synthetic earlier-slice rows. A P5-isolated fixture starts from a real P4 boundary and layers real P5 persistence:

- `ack`: real `CLAIMED` handoff produced by `create→validate→publish→claim(WORK)`, plus the fresh bearer returned by that claim and a well-formed `effect_manifest`; the negative uses an incomplete/malformed manifest, a wrong-boundary manifest, or a wrong bearer.
- `attestCompletion`: the `ack` fixture advanced by a real `ack` to `STARTED`, attested under the real ACTIVE Main; the negatives use a non-`STARTED` state or a non-Main actor.
- `complete`: the `attestCompletion` fixture at `COMPLETION_ATTESTED` with an **unused** attestation and the live `WORK` claim's bearer and persisted `attestation_digest`; the negatives use a **missing** attestation (state `STARTED` → `CT_INVALID_TRANSITION`), a **consumed** attestation (a second `complete` after `COMPLETED` → `CT_INVALID_TRANSITION`/`CT_IDEMPOTENCY_CONFLICT`), a **mismatched** attestation digest (`CT_FENCE_MISMATCH`), and a wrong bearer (`CT_TOKEN_MISMATCH`).
- `reject`: a real unclaimed `DRAFT`/`VALIDATED`/`PUBLISHED` handoff (`create`, `create→validate`, or `create→validate→publish` with no `claim`); the negative attempts a `CLAIMED`+ or claimed handoff.
- `revise`: a real `REJECTED` handoff at revision N produced by `reject`; the negative revises a non-`REJECTED` source or targets an occupied `(lineage_id, N+1)`.

No fixture fabricates a `STARTED`, `COMPLETION_ATTESTED`, `COMPLETED`, `REJECTED`, attestation, effect, or committed-result row directly; all arise from real P5 operations over real P4 state.

### P5 capability-gated exposure

The five names `ack|attestCompletion|complete|reject|revise` join the existing continuation dispatcher allow-list (`core.mjs` `createContinuationDispatcher`, alongside `bootstrapMain|activate|status|register|receive|create|validate|publish|claim`) and the `CONTINUATION_TOOL_DEFINITIONS` map (`mcp.mjs`), each with `additionalProperties:false` schemas encoding the exact required fields/enums/limits and explicit-null rejection above. Default `createMcpHandler()` (no trusted-metadata and no process-identity capability) still lists exactly the eight legacy `tower_*` tools; the continuation names — now thirteen — are exposed only when both capabilities exist, unchanged from P4-B's gate. No route is renamed; `provisionMainAuthorityAnchor|bootstrapAdmin` remain CLI-only; unsupported names (any `start` or later-slice name) fail `CT_PAYLOAD_INVALID` before database access. Schema acceptance is not authority; core repeats every check.

### P5 chained verification, ownership, forecast, and rollback

P5 plausibly exceeds 800 authored lines (five operations plus effect-manifest, attestation, committed-result, and compensation-shape machinery, each comparable to a P4-B-scale unit), so it is split into four sequential chained implementation units with independent ≤800 ceilings that cannot be borrowed. Dependencies P5-A→P5-B→P5-C→P5-D; each records its own RED/GREEN/triangulation, focused/full/fail-closed, syntax/diff, preservation, exact authored line count, start/end/dependency, and rollback evidence, and starts only from the prior gate-passed boundary:

| Unit | Starts from / dependency | GREEN end state | Scenario ownership | Forecast | Rollback boundary |
|---|---|---|---|---:|---|
| P5-A Effects & Ack | green P4-B | `ack` CLAIMED→STARTED with a complete persisted effect manifest and pre-start boundary; no attestation/completion | `CT-R12-S1..S2`, `CT-R1-S1`, `CT-R3-S1`, and the ack portion of `CT-R1-S5` | 380–540 | revert only P5-A `ack`/manifest handler/route/tests/evidence; schema-4 rows stay inert; P4 rows byte-for-byte |
| P5-B Attestation | green P5-A | `attestCompletion` STARTED→COMPLETION_ATTESTED with server-derived `attestation_evidence_v1`; single unused attestation | `CT-R1-S2` and the attestation portion of `CT-R1-S5` | 320–460 | revert only P5-B `attestCompletion`/evidence handler/route/tests/evidence; preserve P5-A `STARTED` rows |
| P5-C Completion & Compensation | green P5-B | `complete` COMPLETION_ATTESTED→COMPLETED, single-use attestation consumed, claim+delivery closed, committed result persisted; token authority; compensation/read-back envelope definitions | `CT-R1-S3`, `CT-R6-S3`, `CT-R12-S3..S4` shapes, and the completion projection of `CT-R3-S5` | 420–600 | revert only P5-C `complete`/token/committed-result/compensation-shape handler/route/tests/evidence; preserve P5-A/B rows |
| P5-D Rejection & Revision | green P5-C | `reject` safe→REJECTED (PENDING delivery closed) and `revise` new immutable DRAFT N+1; exact source | `CT-R1-S4`, `CT-R1-S6`, `CT-R3-S3..S4` | 320–460 | revert only P5-D `reject`/`revise` handler/route/tests/evidence; preserve P5-A/B/C rows |

Total P5 forecast is 1,440–2,060 authored lines across the four units in `core.mjs`, `mcp.mjs`, and `test/lifecycle.test.mjs`; each unit is independently ≤800. If any concrete pre-RED forecast crosses 800, stop and split that unit further (e.g. separate the compensation-shape definitions from `complete` within P5-C); budgets are never borrowed. The overall P5 rollback boundary reverts only P5 handlers/routes/tests/evidence: the dormant schema-4 rows return to inert (older code rejects any `STARTED`/`COMPLETION_ATTESTED`/`COMPLETED`/`REJECTED`/attestation/effect/committed-result row as an unsupported future history `CT_SCHEMA_INVALID`), every P4 handoff/delivery/claim/transition/idempotency/budget row is preserved byte-for-byte, and there is no down-migration and no Migration 004 byte change. `RECOVER`, STARTED-rollback execution, redelivery mutation, proof-bound quiescence, polling, activation, commit, push, and PR remain outside P5.

---

# P6 Design Amendment: Proof-Bound Recovery, Rollback, and Quiescence

## Decision summary

P6 introduces its **own additive Migration 005** and executes through **six sequential chained units** (P6-A … P6-F), each under its own independent 800-authored-line ceiling that can never be borrowed. Migration 005 adds exactly **22 new named `ct_*` objects** — five tables (`ct_termination_receipt`, `ct_quiescence_snapshot`, `ct_rollback_epoch`, `ct_main_rebind`, `ct_recovery_disposition`), seven indexes, ten triggers — producing an exact **58-object schema-5 manifest**. It alters **no Migration 004 byte and no Migration 004 checksum**, drops nothing, rebuilds nothing, and never down-migrates. P6 adds exactly **two new fail-closed codes** — `CT_RECOVERY_REQUIRED` and `CT_RECOVERY_DISPOSITION_FORBIDDEN` — named by `CT-R7-S1/S4` and `CT-R11-S2`; `CT-R7-S8` is malformed persisted history and therefore reuses `CT_SCHEMA_INVALID` at structural validation precedence. P6 adds exactly five runtime operations: `recordTerminationReceipt`, `recover`, `beginRollback`, `rebindMain`, `finishRollback`.

The lifecycle CHECK members P6 needs are **already dormant in Migration 004** and are activated exactly as P5 activated its own: `ct_handoff.state` and `ct_handoff_transition.from_state`/`to_state` already contain `CANCELLED`, `POISONED`, `WORK_SUSPENDED`, and `ATTESTATION_SUSPENDED`; `ct_handoff_transition.operation` already contains `RECOVER`; `ct_delivery.purpose` and `ct_claim.purpose` already contain `ATTESTATION_REDELIVERY`; `ct_delivery.handoff_state_snapshot` already contains `COMPLETION_ATTESTED`. Three members named by the requirement text are **genuinely absent** from Migration 004 and are therefore *not* persisted handoff states: `ROLLING_BACK` is a `ct_continuation_state.mode` value (Migration 001), never a handoff state; `ROLLED_BACK` is a **disposition label**, so `CT-R7-S6`'s `STARTED→ROLLED_BACK→PUBLISHED` is persisted as one `RECOVER` transition `from_state='STARTED', to_state='PUBLISHED'` whose disposition is `ROLLED_BACK`; `UNKNOWN` is the unprovable-boundary outcome that P5 already mapped to `ct_handoff.state='POISONED'` (see the CT-R12-S4 rule above), and P6 keeps that mapping. Migration 005 adds no state, no operation, and no purpose member: every new object is a new table, index, or trigger.

P6 covers `CT-R7-S1..S12`, `CT-R11-S2`, `CT-R11-S4`, `CT-R11-S5`, and the rollback/rebind/finish projection of `CT-R11-S3`. The polling plane (`P7`), host adapters (`P8`/`P9`), and the versioned runtime/cutover (`P10`) stay **entirely outside P6**: P6 persists only the explicit server-owned witness `polling_plane:"UNAVAILABLE_BEFORE_P7"` and never a real polling observation, never a host adapter, never a release artifact, and never a runtime activation.

## Migration 005: proof, quiescence, rollback-epoch, rebind, and disposition foundation

`core.mjs` will own immutable `MIGRATION_005_SQL`. Its exact UTF-8 byte stream is the following block with LF line endings, no leading or trailing blank line, exactly one terminal LF, byte length **14996**, exactly **231 lines**, and checksum **`sha256:9bd43721486bee4a23f2e4428fd0cb2c1813729f4eb89b7d500bd486ce237b98`**. Every byte is ASCII, so the byte length equals the character count of that literal. `MIGRATION_005_CHECKSUM = sha256(Buffer.from(MIGRATION_005_SQL))` is computed by the implementation from the constant, exactly as `MIGRATION_004_CHECKSUM` is; the literal below and the three pinned numbers above agree by construction, and the literal remains the normative byte source. **P6-A's first RED assertion** independently copies this literal and asserts all three pinned values — byte length, line count, and checksum — as constants, recording them in `apply-progress.md`; any later byte, line, or checksum drift is a RED failure. Requests and configuration can never supply, alias, override, or influence the checksum: it is derived from the frozen constant inside the process, and no accepted request shape in P1–P6 contains a checksum, DDL, object name, or manifest member.

```sql
CREATE TABLE ct_termination_receipt (
  receipt_id TEXT PRIMARY KEY CHECK(length(receipt_id) = 43),
  subject_kind TEXT NOT NULL CHECK(subject_kind IN ('CLAIMANT', 'MAIN')),
  subject_binding_id TEXT NOT NULL CHECK(length(subject_binding_id) = 43),
  subject_identity_digest TEXT NOT NULL CHECK(length(subject_identity_digest) = 71),
  subject_binding_epoch INTEGER NOT NULL CHECK(subject_binding_epoch > 0),
  process_role TEXT NOT NULL CHECK(process_role IN ('HOST', 'MCP')),
  pairing_digest TEXT NOT NULL CHECK(length(pairing_digest) = 71),
  issuer TEXT NOT NULL CHECK(issuer = 'CT_MAIN_OBSERVER_V1'),
  verifier TEXT NOT NULL CHECK(verifier = 'CT_MAIN_VERIFIER_V1'),
  method TEXT NOT NULL CHECK(method = 'OS_PROCESS_TABLE_V1'),
  observation TEXT NOT NULL CHECK(observation IN ('ABSENT', 'REPLACED')),
  terminated INTEGER NOT NULL CHECK(terminated = 1),
  os_boot_id TEXT NOT NULL CHECK(length(os_boot_id) BETWEEN 1 AND 256),
  os_session_id TEXT NOT NULL CHECK(length(os_session_id) BETWEEN 1 AND 256),
  host_process_instance TEXT NOT NULL CHECK(length(host_process_instance) > 0),
  plugin_instance TEXT NOT NULL CHECK(length(plugin_instance) > 0),
  root_session_id TEXT NOT NULL CHECK(length(root_session_id) > 0),
  mcp_process_instance TEXT NOT NULL CHECK(length(mcp_process_instance) = 43),
  pid_start_marker TEXT NOT NULL CHECK(length(pid_start_marker) BETWEEN 1 AND 128),
  observed_start_marker TEXT CHECK(observed_start_marker IS NULL OR length(observed_start_marker) BETWEEN 1 AND 128),
  rollback_epoch INTEGER NOT NULL CHECK(rollback_epoch >= 0),
  lease_version INTEGER NOT NULL CHECK(lease_version >= 0),
  generation INTEGER NOT NULL CHECK(generation >= 0),
  handoff_id TEXT CHECK(handoff_id IS NULL OR length(handoff_id) = 43),
  receipt_json TEXT NOT NULL CHECK(length(CAST(receipt_json AS BLOB)) BETWEEN 1 AND 8192),
  receipt_digest TEXT NOT NULL UNIQUE CHECK(length(receipt_digest) = 71),
  observed_at TEXT NOT NULL CHECK(length(observed_at) = 24),
  recorded_at TEXT NOT NULL CHECK(length(recorded_at) = 24),
  CHECK(recorded_at >= observed_at),
  CHECK((subject_kind = 'CLAIMANT' AND handoff_id IS NOT NULL) OR
        (subject_kind = 'MAIN' AND handoff_id IS NULL AND generation = 0)),
  CHECK((observation = 'ABSENT' AND observed_start_marker IS NULL) OR
        (observation = 'REPLACED' AND observed_start_marker IS NOT NULL AND observed_start_marker <> pid_start_marker)),
  UNIQUE(subject_binding_id, subject_binding_epoch, process_role, rollback_epoch, generation)
);
CREATE INDEX ct_termination_receipt_subject_lookup
ON ct_termination_receipt(subject_binding_id, subject_binding_epoch, rollback_epoch, generation, process_role);
CREATE INDEX ct_termination_receipt_pairing
ON ct_termination_receipt(pairing_digest, process_role);
CREATE TRIGGER ct_termination_receipt_no_update
BEFORE UPDATE ON ct_termination_receipt
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_TERMINATION_RECEIPT');
END;
CREATE TRIGGER ct_termination_receipt_no_delete
BEFORE DELETE ON ct_termination_receipt
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_TERMINATION_RECEIPT');
END;
CREATE TABLE ct_quiescence_snapshot (
  snapshot_id TEXT PRIMARY KEY CHECK(length(snapshot_id) = 43),
  snapshot_kind TEXT NOT NULL CHECK(snapshot_kind IN ('ROLLBACK_FREEZE', 'ROLLBACK_FINISH')),
  rollback_epoch INTEGER NOT NULL CHECK(rollback_epoch > 0),
  lease_version INTEGER NOT NULL CHECK(lease_version > 0),
  owner_main_binding_id TEXT NOT NULL CHECK(length(owner_main_binding_id) = 43),
  owner_main_binding_epoch INTEGER NOT NULL CHECK(owner_main_binding_epoch > 0),
  owner_main_identity_digest TEXT NOT NULL CHECK(length(owner_main_identity_digest) = 71),
  live_claims INTEGER NOT NULL CHECK(live_claims >= 0),
  live_deliveries INTEGER NOT NULL CHECK(live_deliveries >= 0),
  live_workers INTEGER NOT NULL CHECK(live_workers >= 0),
  pending_work INTEGER NOT NULL CHECK(pending_work >= 0),
  pending_attestation INTEGER NOT NULL CHECK(pending_attestation >= 0),
  frozen_inventory_json TEXT NOT NULL CHECK(length(CAST(frozen_inventory_json AS BLOB)) BETWEEN 1 AND 65536),
  frozen_inventory_digest TEXT NOT NULL CHECK(length(frozen_inventory_digest) = 71),
  polling_witness TEXT NOT NULL CHECK(polling_witness = 'UNAVAILABLE_BEFORE_P7'),
  quiescence_json TEXT NOT NULL CHECK(length(CAST(quiescence_json AS BLOB)) BETWEEN 1 AND 65536),
  quiescence_digest TEXT NOT NULL UNIQUE CHECK(length(quiescence_digest) = 71),
  observed_at TEXT NOT NULL CHECK(length(observed_at) = 24),
  CHECK(snapshot_kind = 'ROLLBACK_FREEZE' OR
        (live_claims = 0 AND live_deliveries = 0 AND live_workers = 0 AND pending_work = 0 AND pending_attestation = 0)),
  UNIQUE(rollback_epoch, snapshot_kind)
);
CREATE INDEX ct_quiescence_snapshot_epoch
ON ct_quiescence_snapshot(rollback_epoch, snapshot_kind, observed_at);
CREATE TRIGGER ct_quiescence_snapshot_no_update
BEFORE UPDATE ON ct_quiescence_snapshot
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_QUIESCENCE_SNAPSHOT');
END;
CREATE TRIGGER ct_quiescence_snapshot_no_delete
BEFORE DELETE ON ct_quiescence_snapshot
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_QUIESCENCE_SNAPSHOT');
END;
CREATE TABLE ct_rollback_epoch (
  rollback_epoch INTEGER PRIMARY KEY CHECK(rollback_epoch > 0),
  epoch_state TEXT NOT NULL CHECK(epoch_state IN ('OPEN', 'FINISHED')),
  begin_owner_main_binding_id TEXT NOT NULL CHECK(length(begin_owner_main_binding_id) = 43),
  begin_owner_main_binding_epoch INTEGER NOT NULL CHECK(begin_owner_main_binding_epoch > 0),
  begin_owner_main_identity_digest TEXT NOT NULL CHECK(length(begin_owner_main_identity_digest) = 71),
  prior_activation_epoch INTEGER NOT NULL CHECK(prior_activation_epoch > 0),
  begin_lease_version INTEGER NOT NULL CHECK(begin_lease_version > 0),
  begin_lease_expires_at TEXT NOT NULL CHECK(length(begin_lease_expires_at) = 24),
  freeze_quiescence_digest TEXT NOT NULL CHECK(length(freeze_quiescence_digest) = 71),
  finish_lease_version INTEGER CHECK(finish_lease_version IS NULL OR finish_lease_version > 0),
  finish_quiescence_digest TEXT CHECK(finish_quiescence_digest IS NULL OR length(finish_quiescence_digest) = 71),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  rollback_digest TEXT NOT NULL UNIQUE CHECK(length(rollback_digest) = 71),
  begun_at TEXT NOT NULL CHECK(length(begun_at) = 24),
  finished_at TEXT CHECK(finished_at IS NULL OR length(finished_at) = 24),
  CHECK((epoch_state = 'OPEN' AND finish_lease_version IS NULL AND finish_quiescence_digest IS NULL AND finished_at IS NULL) OR
        (epoch_state = 'FINISHED' AND finish_lease_version IS NOT NULL AND finish_quiescence_digest IS NOT NULL AND finished_at IS NOT NULL))
);
CREATE UNIQUE INDEX ct_rollback_epoch_one_open
ON ct_rollback_epoch(epoch_state)
WHERE epoch_state = 'OPEN';
CREATE TRIGGER ct_rollback_epoch_immutable_begin
BEFORE UPDATE ON ct_rollback_epoch
WHEN NEW.rollback_epoch IS NOT OLD.rollback_epoch
  OR NEW.begin_owner_main_binding_id IS NOT OLD.begin_owner_main_binding_id
  OR NEW.begin_owner_main_binding_epoch IS NOT OLD.begin_owner_main_binding_epoch
  OR NEW.begin_owner_main_identity_digest IS NOT OLD.begin_owner_main_identity_digest
  OR NEW.prior_activation_epoch IS NOT OLD.prior_activation_epoch
  OR NEW.begin_lease_version IS NOT OLD.begin_lease_version
  OR NEW.begin_lease_expires_at IS NOT OLD.begin_lease_expires_at
  OR NEW.freeze_quiescence_digest IS NOT OLD.freeze_quiescence_digest
  OR NEW.request_identity IS NOT OLD.request_identity
  OR NEW.request_digest IS NOT OLD.request_digest
  OR NEW.cas_digest IS NOT OLD.cas_digest
  OR NEW.rollback_digest IS NOT OLD.rollback_digest
  OR NEW.begun_at IS NOT OLD.begun_at
  OR OLD.epoch_state = 'FINISHED'
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_ROLLBACK_EPOCH');
END;
CREATE TRIGGER ct_rollback_epoch_no_delete
BEFORE DELETE ON ct_rollback_epoch
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_ROLLBACK_EPOCH');
END;
CREATE TABLE ct_main_rebind (
  rebind_id TEXT PRIMARY KEY CHECK(length(rebind_id) = 43),
  rollback_epoch INTEGER NOT NULL CHECK(rollback_epoch > 0),
  old_main_binding_id TEXT NOT NULL CHECK(length(old_main_binding_id) = 43),
  old_main_binding_epoch INTEGER NOT NULL CHECK(old_main_binding_epoch > 0),
  old_main_identity_digest TEXT NOT NULL CHECK(length(old_main_identity_digest) = 71),
  new_main_binding_id TEXT NOT NULL CHECK(length(new_main_binding_id) = 43),
  new_main_binding_epoch INTEGER NOT NULL CHECK(new_main_binding_epoch > 0),
  new_main_identity_digest TEXT NOT NULL CHECK(length(new_main_identity_digest) = 71),
  termination_pairing_digest TEXT NOT NULL CHECK(length(termination_pairing_digest) = 71),
  lease_version_before INTEGER NOT NULL CHECK(lease_version_before > 0),
  lease_version_after INTEGER NOT NULL CHECK(lease_version_after > 0),
  lease_expires_at TEXT NOT NULL CHECK(length(lease_expires_at) = 24),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  rebind_digest TEXT NOT NULL UNIQUE CHECK(length(rebind_digest) = 71),
  occurred_at TEXT NOT NULL CHECK(length(occurred_at) = 24),
  CHECK(old_main_binding_id <> new_main_binding_id),
  CHECK(new_main_binding_epoch = old_main_binding_epoch + 1),
  CHECK(lease_version_after = lease_version_before + 1),
  UNIQUE(rollback_epoch, new_main_binding_id)
);
CREATE INDEX ct_main_rebind_epoch
ON ct_main_rebind(rollback_epoch, occurred_at, rebind_id);
CREATE TRIGGER ct_main_rebind_no_update
BEFORE UPDATE ON ct_main_rebind
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_MAIN_REBIND');
END;
CREATE TRIGGER ct_main_rebind_no_delete
BEFORE DELETE ON ct_main_rebind
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_MAIN_REBIND');
END;
CREATE TABLE ct_recovery_disposition (
  disposition_id TEXT PRIMARY KEY CHECK(length(disposition_id) = 43),
  handoff_id TEXT NOT NULL CHECK(length(handoff_id) = 43),
  disposition TEXT NOT NULL CHECK(disposition IN ('NOT_STARTED', 'ROLLED_BACK', 'CANCELLED', 'POISONED', 'SUSPEND_PENDING', 'REDELIVER_WORK', 'SUSPEND_ATTESTATION', 'REDELIVER_ATTESTATION')),
  from_state TEXT NOT NULL CHECK(from_state IN ('PUBLISHED', 'CLAIMED', 'STARTED', 'COMPLETION_ATTESTED', 'WORK_SUSPENDED', 'ATTESTATION_SUSPENDED')),
  to_state TEXT NOT NULL CHECK(to_state IN ('PUBLISHED', 'CANCELLED', 'POISONED', 'WORK_SUSPENDED', 'ATTESTATION_SUSPENDED', 'COMPLETION_ATTESTED')),
  from_generation INTEGER NOT NULL CHECK(from_generation >= 0),
  to_generation INTEGER NOT NULL CHECK(to_generation >= 0),
  mode TEXT NOT NULL CHECK(mode IN ('ON', 'ROLLING_BACK')),
  rollback_epoch INTEGER NOT NULL CHECK(rollback_epoch >= 0),
  lease_version INTEGER NOT NULL CHECK(lease_version >= 0),
  main_binding_id TEXT NOT NULL CHECK(length(main_binding_id) = 43),
  main_binding_epoch INTEGER NOT NULL CHECK(main_binding_epoch > 0),
  main_identity_digest TEXT NOT NULL CHECK(length(main_identity_digest) = 71),
  termination_pairing_digest TEXT CHECK(termination_pairing_digest IS NULL OR length(termination_pairing_digest) = 71),
  rollback_proof_digest TEXT CHECK(rollback_proof_digest IS NULL OR length(rollback_proof_digest) = 71),
  frozen_inventory_digest TEXT CHECK(frozen_inventory_digest IS NULL OR length(frozen_inventory_digest) = 71),
  preserved_attestation_digest TEXT CHECK(preserved_attestation_digest IS NULL OR length(preserved_attestation_digest) = 71),
  attestation_source_generation INTEGER CHECK(attestation_source_generation IS NULL OR attestation_source_generation >= 0),
  closed_delivery_id TEXT CHECK(closed_delivery_id IS NULL OR length(closed_delivery_id) = 43),
  closed_claim_id TEXT CHECK(closed_claim_id IS NULL OR length(closed_claim_id) = 43),
  created_delivery_id TEXT CHECK(created_delivery_id IS NULL OR length(created_delivery_id) = 43),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  disposition_digest TEXT NOT NULL UNIQUE CHECK(length(disposition_digest) = 71),
  occurred_at TEXT NOT NULL CHECK(length(occurred_at) = 24),
  CHECK(to_generation = from_generation + (CASE WHEN disposition IN ('NOT_STARTED', 'ROLLED_BACK', 'REDELIVER_WORK', 'REDELIVER_ATTESTATION') THEN 1 ELSE 0 END)),
  CHECK((disposition = 'NOT_STARTED' AND from_state = 'CLAIMED' AND to_state = 'PUBLISHED') OR
        (disposition = 'ROLLED_BACK' AND from_state = 'STARTED' AND to_state = 'PUBLISHED') OR
        (disposition = 'REDELIVER_WORK' AND from_state = 'WORK_SUSPENDED' AND to_state = 'PUBLISHED') OR
        (disposition = 'SUSPEND_PENDING' AND from_state = 'PUBLISHED' AND to_state = 'WORK_SUSPENDED') OR
        (disposition = 'SUSPEND_ATTESTATION' AND from_state = 'COMPLETION_ATTESTED' AND to_state = 'ATTESTATION_SUSPENDED') OR
        (disposition = 'REDELIVER_ATTESTATION' AND from_state = 'ATTESTATION_SUSPENDED' AND to_state = 'COMPLETION_ATTESTED') OR
        (disposition = 'CANCELLED' AND to_state = 'CANCELLED') OR
        (disposition = 'POISONED' AND to_state = 'POISONED')),
  CHECK(disposition NOT IN ('NOT_STARTED', 'ROLLED_BACK', 'SUSPEND_ATTESTATION') OR termination_pairing_digest IS NOT NULL),
  CHECK(disposition NOT IN ('SUSPEND_PENDING', 'REDELIVER_WORK', 'REDELIVER_ATTESTATION') OR termination_pairing_digest IS NULL),
  CHECK((disposition = 'ROLLED_BACK') = (rollback_proof_digest IS NOT NULL)),
  CHECK((disposition IN ('SUSPEND_PENDING', 'SUSPEND_ATTESTATION')) = (frozen_inventory_digest IS NOT NULL)),
  CHECK((disposition IN ('SUSPEND_ATTESTATION', 'REDELIVER_ATTESTATION')) = (preserved_attestation_digest IS NOT NULL)),
  CHECK((preserved_attestation_digest IS NOT NULL) = (attestation_source_generation IS NOT NULL)),
  CHECK((disposition IN ('NOT_STARTED', 'ROLLED_BACK', 'REDELIVER_WORK', 'REDELIVER_ATTESTATION')) = (created_delivery_id IS NOT NULL)),
  CHECK(closed_claim_id IS NULL OR closed_delivery_id IS NOT NULL),
  CHECK(mode = 'ON' OR disposition NOT IN ('NOT_STARTED', 'ROLLED_BACK', 'REDELIVER_WORK', 'REDELIVER_ATTESTATION')),
  CHECK(mode = 'ROLLING_BACK' OR disposition NOT IN ('SUSPEND_PENDING', 'SUSPEND_ATTESTATION')),
  CHECK(mode = 'ON' OR (rollback_epoch > 0 AND lease_version > 0)),
  UNIQUE(handoff_id, from_generation, disposition)
);
CREATE INDEX ct_recovery_disposition_history
ON ct_recovery_disposition(handoff_id, from_generation, occurred_at, disposition_id);
CREATE INDEX ct_recovery_disposition_epoch
ON ct_recovery_disposition(rollback_epoch, disposition, occurred_at);
CREATE TRIGGER ct_recovery_disposition_no_update
BEFORE UPDATE ON ct_recovery_disposition
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_RECOVERY_DISPOSITION');
END;
CREATE TRIGGER ct_recovery_disposition_no_delete
BEFORE DELETE ON ct_recovery_disposition
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_RECOVERY_DISPOSITION');
END;
```

Three DDL choices are deliberate and load-bearing rather than decorative:

- `ct_quiescence_snapshot.polling_witness CHECK(polling_witness = 'UNAVAILABLE_BEFORE_P7')` makes any other witness value **unrepresentable** at schema 5. P7 must add its own byte-checksummed migration before a real polling witness can ever be stored; P6 never widens it.
- The `ROLLBACK_FINISH` CHECK makes a finish snapshot with any nonzero live claim, delivery, worker, or pending count **unrepresentable**, so `CT-R11-S4` is enforced by the schema and not only by the handler.
- `ct_termination_receipt.observation IN ('ABSENT','REPLACED')` plus `terminated = 1` plus the `observed_start_marker` CHECK make a receipt that records a **live** process, an ambiguous observation, or a same-incarnation PID unrepresentable. A non-terminating observation can never become a persisted proof row.

### Exact schema-5 manifest

Schema 5 contains the exact 36-object schema-4 manifest plus these objects and no other `ct_*` object:

- tables: `ct_termination_receipt`, `ct_quiescence_snapshot`, `ct_rollback_epoch`, `ct_main_rebind`, `ct_recovery_disposition`;
- indexes: `ct_termination_receipt_subject_lookup`, `ct_termination_receipt_pairing`, `ct_quiescence_snapshot_epoch`, `ct_rollback_epoch_one_open`, `ct_main_rebind_epoch`, `ct_recovery_disposition_history`, `ct_recovery_disposition_epoch`;
- triggers: `ct_termination_receipt_no_update`, `ct_termination_receipt_no_delete`, `ct_quiescence_snapshot_no_update`, `ct_quiescence_snapshot_no_delete`, `ct_rollback_epoch_immutable_begin`, `ct_rollback_epoch_no_delete`, `ct_main_rebind_no_update`, `ct_main_rebind_no_delete`, `ct_recovery_disposition_no_update`, `ct_recovery_disposition_no_delete`.

The complete manifest therefore has **58 named `ct_*` objects**: the 36 exact schema-4 objects, the five tables/seven indexes/ten triggers above, and no view. `ct_schema_migration` contains exactly versions `1..5` with the already-pinned v1/v2/v3/v4 checksums plus the Migration 005 checksum, and `SCHEMA_MANIFESTS` gains a `5` entry built as `new Map([...V4_OBJECTS, ...schemaObjects(MIGRATION_005_SQL)])` exactly as `V4_OBJECTS` was built. SQLite-owned `sqlite_autoindex_*` rows created by the new `UNIQUE(...)` table constraints remain excluded by the existing manifest query; `ct_rollback_epoch_one_open` is a **named** partial unique index and is therefore inside the manifest. All five new tables contain zero rows immediately after migration.

### Schema-4→5 bootstrap, fresh lane, retry lane, and rollback-on-failure

CLI-only `bootstrapAdmin` accepts `target_schema_version: 5` under operation/scope `bootstrapAdmin/schema:4->5`, with the same accepted request `{request_identity,expected_anchor_id,expected_schema_version,target_schema_version,expected_mode}` and the same exact-key/`Object.prototype` rejection the target-4 lane already applies. Digests are:

```text
request_digest = SHA-256(UTF8(JCS({
  request_identity,expected_anchor_id,expected_schema_version:4,
  target_schema_version:5,expected_mode:"OFF"
})))
cas_digest = SHA-256(UTF8(JCS({
  expected_anchor_id,expected_schema_version:4,target_schema_version:5,
  expected_mode:"OFF",derived_anchor_epoch:1,derived_config_digest,
  observed_rollback_epoch,observed_lease_version,observed_lease_status:"NONE",
  observed_active_main_binding_id,observed_active_main_binding_epoch,
  observed_activation_epoch,active_claimant_bindings:0,
  delivery_plane:"SCHEMA_4_VALIDATED",recovery_plane:"ABSENT_SCHEMA_4"
})))
```

Unlike the 3→4 lane, the 4→5 lane does **not** require an empty delivery plane: a schema-4 database with real handoff/transition/delivery/claim/budget history migrates in place, and `observed_activation_epoch` is the real committed activation epoch rather than the forced `0`. It does require `mode='OFF'`, lease `NONE`, zero ACTIVE claimant bindings, and a fully valid schema-4 cross-row state under the existing P4/P5 validator. `observed_active_main_binding_id` is `null` with epoch `0` when Main is absent, otherwise the sole structurally valid ACTIVE Main; callers supply neither.

**Fresh lane** (P6-B), after safe anchor/config validation and bounded `BEGIN IMMEDIATE`: exact schema-4 manifest/checksums → singleton continuation state at schema 4 and mode `OFF` → coherent `NONE` lease → the full schema-4 commit-evidence and persistence validators → zero ACTIVE claimants → no committed `schema:4->5` scope → request CAS. It then executes `MIGRATION_005_SQL`, updates exactly one continuation-state row `4→5`, inserts migration row 5, rereads the unchanged anchor bytes, revalidates `inspectSchema(db) === 5` against the exact 58-object manifest, and asserts **zero rows in all five new tables**. It derives `schema_4_manifest_digest`/`schema_5_manifest_digest` with the existing `schema_manifest_evidence_v1` shape and persists canonical JCS in the migration idempotency `response_json` as `{kind:"bootstrap_schema5_response_v1",version:1,public_response:{anchor_id,schema_version:5,mode:"OFF",replayed:false},evidence:{request,request_digest,cas_input,cas_digest,migration_005_checksum,schema_4_manifest_digest,schema_5_manifest_digest}}`. The public adapter returns only `public_response`; the evidence envelope is never accepted from a caller.

**Retry lane** (P6-B): replay requires the exact current schema-5 manifest/checksums, one coherent continuation row at schema 5, mode `OFF`, lease `NONE`, migration row 5 with the pinned checksum, a valid full schema-5 cross-row state, and exactly one `bootstrapAdmin/schema:4->5` envelope whose canonical request, request digest, historical `cas_input`, CAS digest, both manifest digests, checksum, and `replayed:false` public response all recompute exactly. A valid **non-empty** recovery plane — receipts, snapshots, rollback epochs, rebinds, dispositions — does not invalidate replay and is never cleared: emptiness was a fresh-lane commit condition recorded in the predecessor/successor manifest evidence, not a permanent schema-5 invariant. Replay returns only `{anchor_id,schema_version:5,mode:"OFF",replayed:true}` and writes nothing.

Precedence in either lane matches Migrations 003/004: anchor/config safety → version-selected manifest/checksums and structural cross-row validity → continuation mode/lease fence → committed target-scope evidence/classification → incoming request/CAS → bounded commit work. Malformed or missing migration evidence, checksum/object/SQL/cross-row drift is `CT_SCHEMA_INVALID`; `ON`/`ROLLING_BACK`, non-`NONE` lease, nonzero ACTIVE claimants, or a wrong requested version/mode is `CT_FENCE_MISMATCH`; a valid committed envelope with a changed same-operation identity or tuple is `CT_IDEMPOTENCY_CONFLICT`; anchor/config drift is `CT_ANCHOR_*`; writer expiry is `CT_BUSY`. **Any fresh-lane failure rolls back every v5 object plus the migration/state/idempotency changes and leaves schema 4 byte-identical; every retry-lane failure is read-only.** Migration 005 never alters or deletes a schema-1/2/3/4 table, index, trigger, row, payload, legacy row, Main/activation history, claimant history, lease, `ACTIVE` file, or runtime file. A schema greater than 5, or a schema-5 database without valid commit evidence, is never treated as a fresh migration and never triggers drop, rebuild, copy, or cleanup.

## `termination_receipt_v1`: versioned proof bound to persisted identity

`recordTerminationReceipt` is a capability-gated continuation operation requiring the ACTIVE Main (mode `ON`) or the rollback-owner Main at the matching epoch (mode `ROLLING_BACK`). It accepts exactly `{request_identity, subject_kind, subject_binding_id, subject_binding_epoch, process_role}` — **no digest, timestamp, PID, boolean, observation, issuer, verifier, method, or witness member exists in the request**, so a caller cannot assert termination at all; it can only name which persisted binding and which process role the server must observe for itself. Every other member is server-derived from (a) the immutable persisted binding row (`ct_claimant_binding` for `CLAIMANT`, `ct_main_binding` for `MAIN`), (b) the constructor-owned `processObserver` capability, and (c) the server clock.

`processObserver` is a third constructor capability alongside the existing `trustedMetadata` and `processIdentity`, injected by `createContinuationDispatcher` and never reachable from a request. It exposes exactly `observe({role, host_process_instance, plugin_instance, root_session_id, mcp_process_instance, pid_start_marker})` returning `{status:"ABSENT"|"REPLACED"|"PRESENT"|"AMBIGUOUS", observed_start_marker, os_boot_id, os_session_id}`. `pid_start_marker` remains opaque to the Tower exactly as it is in P2/P3 — a stable OS-probe observation for the named PID — and the observer, not the Tower, re-probes it. Without a `processObserver`, `recordTerminationReceipt` fails closed `CT_RECOVERY_REQUIRED`, the route is not listed, and every recovery disposition that requires proof is unavailable.

```text
termination_receipt_v1 = {
  kind:"termination_receipt_v1", version:1,
  subject:{kind:"CLAIMANT"|"MAIN", binding_id, identity_digest, binding_epoch},
  process:{role:"HOST"|"MCP", host_process_instance, plugin_instance, root_session_id,
           mcp_process_instance, pid_start_marker, observed_start_marker},
  proof:{issuer:"CT_MAIN_OBSERVER_V1", verifier:"CT_MAIN_VERIFIER_V1",
         method:"OS_PROCESS_TABLE_V1", observation:"ABSENT"|"REPLACED",
         os_boot_id, os_session_id, terminated:true},
  binding:{rollback_epoch, lease_version, generation, handoff_id},
  observed_at
}
receipt_json   = JCS(termination_receipt_v1)
receipt_digest = SHA-256(UTF8(receipt_json))
termination_pairing_v1 = {
  kind:"termination_pairing_v1", version:1,
  subject_binding_id, subject_identity_digest, subject_binding_epoch,
  rollback_epoch, generation, os_boot_id, os_session_id, roles:["HOST","MCP"]
}
pairing_digest = SHA-256(UTF8(JCS(termination_pairing_v1)))
```

Derivation and rejection rules, all server-side and all non-mutating on failure:

- **Identity binding.** `subject.identity_digest`, `subject.binding_epoch`, and every `process.*` tuple member are read from the persisted binding row; a request naming a binding id whose epoch, status, or identity digest does not reconstruct is `CT_SCHEMA_INVALID`. For `subject_kind='MAIN'` the row must be the **exact old** `main_binding_id` with its `identity_digest` — this is the P3-persisted old-Main identity that `design.md`'s P3 handoff note requires P6 proof rows to reference — and `handoff_id` is `NULL` with `generation = 0`. For `subject_kind='CLAIMANT'` the row must be the claimant named by the live `ct_claim` at the target handoff/generation, and `handoff_id`/`generation` are that claim's, not the caller's.
- **Observation allowlist.** `PRESENT` (same incarnation still alive) is `CT_RECOVERY_REQUIRED` with no row — this is `CT-R7-S4`'s "live process". `AMBIGUOUS` (a process occupies the PID but its start marker cannot be read, i.e. possible PID reuse) is `CT_RECOVERY_REQUIRED` with no row — this is `CT-R7-S5`'s reused-PID rejection. Only `ABSENT` and `REPLACED` may be persisted, and `REPLACED` additionally requires `observed_start_marker <> pid_start_marker`, so a same-incarnation "termination" is unrepresentable.
- **Freshness.** `observed_at` is the observer's own server-clock instant and `recorded_at` is the commit instant; recording refuses when `recorded_at - observed_at > 30_000 ms`. Freshness is re-verified **at every use**: a disposition, rebind, or finish that consumes a pairing recomputes `now - receipt.observed_at` for both rows and refuses `CT_RECOVERY_REQUIRED` when either exceeds 30 seconds. A receipt is therefore never a durable licence; it is a 30-second window.
- **Epoch/lease/generation binding.** `binding.rollback_epoch`, `binding.lease_version`, and `binding.generation` are read from the live singleton lease and the target row. A receipt recorded at rollback epoch *E* or lease version *V* can never satisfy a disposition evaluated at a different epoch or lease version: the pairing digest changes, so the lookup simply finds nothing and the result is `CT_RECOVERY_REQUIRED`.
- **Pairing validation.** A pairing is valid only when **exactly two** receipt rows share the `pairing_digest`, their `process_role` values are exactly `HOST` and `MCP`, their subject binding/epoch/identity digest, `os_boot_id`, `os_session_id`, `rollback_epoch`, and `generation` are identical, each row's recomputed `receipt_digest` equals its stored value, and both are fresh. One row, three rows, mixed roles, mixed boot ids, or a digest that does not recompute is `CT_RECOVERY_REQUIRED` — `CT-R7-S4`'s "invalid receipt pairing" and `CT-R7-S5`'s issuer/verifier/method/time/marker/epoch/generation mismatch class.
- **Response.** `{subject_kind, process_role, recorded:true, replayed}` and nothing else: no digest, no PID, no marker, no identity tuple, no `os_boot_id`. Scope key is `termination:<subject_binding_id>:epoch:<subject_binding_epoch>:generation:<generation>:<process_role>` under operation `recordTerminationReceipt`; replay returns the stored public response with `replayed:true` and writes nothing.

## `quiescence_v1`: snapshot bound to epoch, lease, inventory, and witness

```text
frozen_inventory_v1 = {
  kind:"frozen_inventory_v1", version:1, rollback_epoch,
  handoffs:[{id, state, generation}]              // every non-terminal handoff, ascending by id
}
frozen_inventory_digest = SHA-256(UTF8(JCS(frozen_inventory_v1)))
quiescence_v1 = {
  kind:"quiescence_v1", version:1,
  snapshot_kind:"ROLLBACK_FREEZE"|"ROLLBACK_FINISH",
  rollback_epoch, lease_version,
  owner:{main_binding_id, binding_epoch, main_identity_digest},
  live_counts:{claims, deliveries, workers},
  pending_counts:{work, attestation},
  frozen_inventory_digest,
  polling_plane:"UNAVAILABLE_BEFORE_P7",
  observed_at
}
quiescence_digest = SHA-256(UTF8(JCS(quiescence_v1)))
```

`live_counts` and `pending_counts` are computed by the same queries `status()` already uses — LIVE claims, `PENDING`+`CLAIMED` deliveries, ACTIVE claimant bindings, and PENDING deliveries split by purpose — inside the same writer snapshot, so a snapshot can never disagree with the status a caller could observe in that transaction. `owner` is the lease owner at snapshot time, which is the beginning Main for `ROLLBACK_FREEZE` and the possibly-rebound Main for `ROLLBACK_FINISH`. The exact preconditions each kind must prove:

| Snapshot kind | Written by | Must prove |
|---|---|---|
| `ROLLBACK_FREEZE` | `beginRollback` | mode was `ON` with lease `NONE`; the new epoch is `prior + 1`; the frozen inventory names every non-terminal handoff with its exact state/generation; the server-owned polling witness is present |
| `ROLLBACK_FINISH` | `finishRollback` | mode is `ROLLING_BACK` at the matching epoch; `live_counts.claims = live_counts.deliveries = live_counts.workers = 0`; `pending_counts.work = pending_counts.attestation = 0`; the server-owned polling witness is present |

`finishRollback` refuses `CT_NOT_QUIESCENT` whenever any of those counts is nonzero, and the DDL makes a stored `ROLLBACK_FINISH` snapshot with a nonzero count impossible, so a fabricated finish proof cannot be persisted even by a defective handler. That is `CT-R11-S4`'s "OFF requires zero live rows and an atomic transition".

## Trusted polling witness: structurally, not rhetorically, server-owned

Design note P3 line 716 is binding and P6 satisfies it in three independent layers:

1. **No request member exists.** `recordTerminationReceipt`, `recover`, `beginRollback`, `rebindMain`, and `finishRollback` each declare an exact sorted key allowlist checked with the existing `JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(keys)` pattern plus the `forbiddenCtxKeys` guard. None of those key sets contains a polling, witness, liveness, quiesced, terminated, boolean, or proof-digest member. A caller cannot express the concept, so it cannot be forbidden-but-attempted; it is `CT_PAYLOAD_INVALID` at the request-shape rung before any database read.
2. **No MCP schema member exists.** The five new `CONTINUATION_TOOL_DEFINITIONS` entries use `additionalProperties:false` with exactly those properties and explicit-null rejection, so the transport cannot carry one either.
3. **No storable alternative value exists.** `ct_quiescence_snapshot.polling_witness` admits only the literal `'UNAVAILABLE_BEFORE_P7'`, written by the server. Even a compromised handler cannot persist a different witness without a new migration.

Termination is proven only by server-observed `ct_termination_receipt` pairings; quiescence is proven only by server-derived `ct_quiescence_snapshot` rows. A request-supplied boolean or digest can never prove either, and the only caller-supplied evidence anywhere in P6 — the `rollback_proof_v1` for `ROLLED_BACK` — is fully recomputed server-side against the persisted `ACK` effect manifest before it is believed (below).

## The eight recovery dispositions

`recover` accepts exactly nine keys, always all present: `{request_identity, id, es, eg, action, expected_rollback_epoch, delivery_id, claim_id, rollback_proof}`. `action` is one of the eight dispositions; `es` is the exact expected pre-transition handoff state; `eg` is the exact expected pre-transition generation; `delivery_id`, `claim_id`, and `rollback_proof` are `null` exactly when the disposition names none. `expected_rollback_epoch` is mandatory in every mode: its absence is impossible (exact key set) and a stale value under `ROLLING_BACK` is `CT_ROLLBACK_IN_PROGRESS`, which together with the unchanged `gateContinuation` behaviour for ordinary writers gives `CT-R11-S2`'s "omission and stale attempts return `CT_ROLLBACK_IN_PROGRESS` without mutation".

Each disposition is exactly one bounded `BEGIN IMMEDIATE` transaction that appends exactly one immutable `ct_handoff_transition` row with `operation='RECOVER'` and `authority_kind='MAIN'`, one immutable `ct_recovery_disposition` row, and one `ct_idempotency` row, and mutates only the columns named below. **Recovery never completes a handoff and never calls the claimant-only `complete`**, and this is structural, not advisory: `to_state='COMPLETED'` is outside the `ct_recovery_disposition.to_state` CHECK, `COMPLETE` is a different `operation` value written only by `continuationComplete`, and every disposition's state CAS names its own exact target.

| Disposition | Mode / authority | Pre-state → post-state | Generation | Delivery / claim effect | Required proof |
|---|---|---|---|---|---|
| `NOT_STARTED` | `ON`, ACTIVE Main | `CLAIMED` → `PUBLISHED` | `eg` → `eg+1` | close old `CLAIMED` delivery and LIVE claim; create one fresh `PENDING` `WORK` delivery at `eg+1` | termination pairing for the claim's claimant |
| `ROLLED_BACK` | `ON`, ACTIVE Main | `STARTED` → `PUBLISHED` | `eg` → `eg+1` | close old delivery and claim; create one fresh `PENDING` `WORK` delivery at `eg+1` | termination pairing **and** `rollback_proof_v1` with recomputed `boundary_equal = true` |
| `CANCELLED` | `ON` or `ROLLING_BACK`, ACTIVE or rollback-owner Main | any of `PUBLISHED`/`CLAIMED`/`STARTED`/`COMPLETION_ATTESTED` → `CANCELLED` | unchanged | close any delivery and claim; **create none** | termination pairing iff a LIVE claim exists |
| `POISONED` | `ON` or `ROLLING_BACK`, ACTIVE or rollback-owner Main | same pre-states → `POISONED` | unchanged | close any delivery and claim; **create none** | termination pairing iff a LIVE claim exists |
| `SUSPEND_PENDING` | `ROLLING_BACK` only, rollback-owner Main at matching epoch | `PUBLISHED` → `WORK_SUSPENDED` | unchanged | close the `PENDING` `WORK` delivery; **create none** | frozen inventory of the open epoch; valid structural history necessarily has no claim because atomic `claim` changes PUBLISHED/PENDING to CLAIMED |
| `REDELIVER_WORK` | `ON` only, ACTIVE Main | `WORK_SUSPENDED` → `PUBLISHED` | `eg` → `eg+1` | create one fresh `PENDING` `WORK` delivery at `eg+1` | none (the row is already non-live and claimless) |
| `SUSPEND_ATTESTATION` | `ROLLING_BACK` only, rollback-owner Main at matching epoch | `COMPLETION_ATTESTED` → `ATTESTATION_SUSPENDED` | unchanged | close the `CLAIMED` delivery and LIVE claim; **create none**; preserve the attestation | termination pairing; frozen inventory |
| `REDELIVER_ATTESTATION` | `ON` only, ACTIVE Main | `ATTESTATION_SUSPENDED` → `COMPLETION_ATTESTED` | `eg` → `eg+1` | create one fresh `PENDING` `ATTESTATION_REDELIVERY` delivery at `eg+1` with `handoff_state_snapshot='COMPLETION_ATTESTED'` | none (the row is already non-live and claimless) |

The mode column is enforced twice: by the handler's disposition/mode rung and by the `ct_recovery_disposition` mode CHECKs, which make an `ON`-only disposition recorded under `ROLLING_BACK` — or the reverse — unrepresentable. This is `CT-R11-S2` in the schema: under `ROLLING_BACK`, `NOT_STARTED`, `ROLLED_BACK`, `REDELIVER_WORK`, and `REDELIVER_ATTESTATION` return `CT_RECOVERY_DISPOSITION_FORBIDDEN` with no mutation and no `PENDING` delivery. Under `OFF`, every disposition is `CT_CONTINUATION_OFF`.

`CT-R7-S8` is a structural-invalidity characterization, not a reachable recovery rung. Atomic `claim` changes the handoff and delivery from `PUBLISHED`/`PENDING` to `CLAIMED` in the same transaction that creates the claim, so valid persisted history cannot contain a `PUBLISHED`/`PENDING` pair with a claim for that delivery. If tampered history presents that contradiction, the schema-5 cross-row validator returns `CT_SCHEMA_INVALID` without mutation at precedence rung 1, before mode, request, authority, idempotency, recovery fences, or proof semantics. P6 introduces no reservation/pre-claim state and does not reorder validation to make malformed history appear valid.

`CT-R7-S3` is exact: `ROLLED_BACK` requires a structurally complete `rollback_proof_v1` for the handoff and generation whose `receipts` array has one entry per declared effect in the persisted `ACK` manifest. The server re-derives `pre_start_boundary_digest` from the persisted `ack` envelope, recomputes `observed_boundary_digest` and every `read_back_matches_pre_state` from the caller's read-back digests using the exported P5-C `validRollbackProof` rule, and requires `boundary_equal = true`. A proof that omits the handoff, the generation, or the pre-start boundary — or that names an `UNOBSERVABLE`, `NON_COMPENSATABLE`, undeclared, or mismatching effect — fails the recomputation and returns `CT_RECOVERY_REQUIRED` with the row still `STARTED`, never republished. Main's only remaining moves for such a row are `CANCELLED` or `POISONED`, which is the `UNKNOWN/POISONED` outcome `CT-R7-S3` and `CT-R12-S4` name. The caller's booleans are never trusted: `validRollbackProof` compares every asserted flag against the server's own recomputation and rejects disagreement.

### RECOVER envelopes, digests, and the superseded dormant expectation

```text
scope_key    = "handoff:<id>:generation:<eg>:<action lowercased>"          // eg = PRE-transition generation
request_digest = SHA-256(UTF8(JCS(the exact accepted nine-key request)))
<action>_cas_v1 = {
  kind:"<action lowercased>_cas_v1", version:1,
  writer_fence_v1, main_authority_v1,
  id, disposition, expected_state:es, expected_generation:eg, target_generation,
  expected_rollback_epoch, expected_lease_version, expected_lease_status,
  expected_delivery_state, expected_claim_state,
  delivery_id, claim_id, handoff_fingerprint,
  termination_pairing_digest, rollback_proof_digest,
  frozen_inventory_digest, preserved_attestation_digest
}
cas_digest = SHA-256(UTF8(JCS(<action>_cas_v1)))
recover_decision_v1 = {
  kind:"recover_decision_v1", version:1, disposition, id,
  from_state, to_state, from_generation, to_generation, rollback_epoch,
  closed_delivery_id, closed_claim_id, created_delivery_id,
  termination_pairing_digest, rollback_proof_digest,
  frozen_inventory_digest, preserved_attestation_digest
}
decision_digest = SHA-256(UTF8(JCS(recover_decision_v1)))
```

Every derived member (`handoff_fingerprint`, `termination_pairing_digest`, `rollback_proof_digest`, `frozen_inventory_digest`, `preserved_attestation_digest`, `target_generation`, `created_delivery_id`) is computed by the server from immutable rows and the accepted request; none is accepted as a caller CAS input. The public response is exactly `{id, state:<to_state>, generation:<to_generation>, replayed}` and exposes no digest, authority, delivery id, claim id, receipt, or inventory. The stored envelope is `{kind:"<action lowercased>_response_envelope_v1",version:1,public_response,evidence:{request,request_digest,scope_key,cas_input,cas_digest,disposition_id,closed_delivery_id,closed_claim_id,created_delivery_id,termination_pairing_digest,rollback_proof,rollback_proof_digest,frozen_inventory_digest,preserved_attestation_digest,attestation_source_generation}}`, with `rollback_proof` present as `null` except for `ROLLED_BACK`.

The `RECOVER` transition row is written at the **post-transition** generation, because the existing validator chain rule requires `row.generation = previous.generation + increment` and the last transition's generation to equal `ct_handoff.generation`. The scope key uses the **pre-transition** generation, because that is the only generation a caller can know before the server decides. Both are pinned here.

**P6 supersedes the dormant `dormantOperations` expectation that P4/P5 left in `validateSchema4Persistence`.** That block encodes three forward-compatibility guesses that are unreachable today (`futureHistoryPresent` rejects every `RECOVER` row and every `operation='recover'` idempotency row before it runs) and that are wrong as written: it infers the disposition from `from_state` alone, which cannot distinguish `SUSPEND_PENDING` from `CANCELLED`/`POISONED` at `PUBLISHED`; its CAS shape has no proof member; and it expects `evidence.request.delivery_id` to name the **newly created** delivery, which no caller can supply. Because no persisted row can exist under those rules, replacing them changes the meaning of exactly zero bytes on disk. P6-B replaces that block with a real `RECOVER` validator built on the total `(from_state,to_state) → disposition` map — `(CLAIMED,PUBLISHED)=NOT_STARTED`, `(STARTED,PUBLISHED)=ROLLED_BACK`, `(PUBLISHED,WORK_SUSPENDED)=SUSPEND_PENDING`, `(WORK_SUSPENDED,PUBLISHED)=REDELIVER_WORK`, `(COMPLETION_ATTESTED,ATTESTATION_SUSPENDED)=SUSPEND_ATTESTATION`, `(ATTESTATION_SUSPENDED,COMPLETION_ATTESTED)=REDELIVER_ATTESTATION`, `(*,CANCELLED)=CANCELLED`, `(*,POISONED)=POISONED` — each pair being unique, so the disposition is derivable from the immutable row and cross-checked against the reverse-linked `ct_recovery_disposition` row.

Four further validator extensions are required and are each confined to schema 5:

- `schema4Transition` accepts `CLAIM` only as `PUBLISHED→CLAIMED`. An `ATTESTATION_REDELIVERY` claim leaves `ct_handoff.state='COMPLETION_ATTESTED'` (see `continuationClaim`, which mutates handoff state only when `purpose === 'WORK'`), so its `CLAIM` row is `COMPLETION_ATTESTED→COMPLETION_ATTESTED`. P6-F adds exactly that pair, gated on `purpose='ATTESTATION_REDELIVERY'`.
- `validHistoricalWriterFence` requires `mode:"ON"`, `observed_lease_status:"NONE"`, and `schema_version:4`. P6 extends it to accept `schema_version ∈ {4,5}` for every operation, and `{mode:"ROLLING_BACK", observed_lease_status:"ACTIVE"}` **only** for `RECOVER` rows whose disposition is `SUSPEND_PENDING`, `SUSPEND_ATTESTATION`, `CANCELLED`, or `POISONED`. Historical schema-4 rows keep `schema_version:4` in their frozen CAS input and are never rewritten; new rows written at schema 5 carry `schema_version:5`.
- The delivery reverse-link loop currently covers only `WORK` deliveries. P6 adds: every `ATTESTATION_REDELIVERY` delivery must reverse-link to exactly one `REDELIVER_ATTESTATION` disposition row at its generation, and every `WORK` delivery at a nonzero generation must reverse-link to exactly one `NOT_STARTED`, `ROLLED_BACK`, or `REDELIVER_WORK` disposition row.
- The `futureHistoryPresent` gate stays **byte-for-byte unchanged at schema 4** and is replaced only on the schema-5 path. A schema-4 database under P6 code therefore behaves exactly as it does under P5 code, which is what makes the P6 rollback boundary trivially safe.

### Attestation carry-forward across redelivery

`continuationComplete` resolves the attestation by looking up the `ATTEST_COMPLETION` transition at `(id, eg)`. After `REDELIVER_ATTESTATION` the handoff sits at `eg+1` while the attestation was recorded at the source generation, so that lookup would find nothing and return `CT_FENCE_MISMATCH`. P6-F therefore extends exactly that one rung: when no `ATTEST_COMPLETION` transition exists at `(id, eg)`, resolve the unique `ct_recovery_disposition` row with `disposition='REDELIVER_ATTESTATION'`, `handoff_id=id`, `to_generation=eg`, require `request.attestation_digest = row.preserved_attestation_digest`, and require that digest to equal the `decision_digest` of the `ATTEST_COMPLETION` transition at `(id, row.attestation_source_generation)`. No other `complete` rung changes; the token, claim, delivery, state CAS, closure, and envelope rules are P5's, unmodified.

`CT-R7-S11` needs **no** code change and is derived from what already exists: `assertAckRequest` accepts only `purpose:"WORK"` and `es:"CLAIMED"`, so an `ack` naming `ATTESTATION_REDELIVERY` is `CT_PAYLOAD_INVALID` at the request-shape rung, and the only state-legal `ack` shape finds `ct_handoff.state='COMPLETION_ATTESTED' ≠ 'CLAIMED'` and returns `CT_INVALID_TRANSITION` — the scenario's normative outcome. `WORK` redelivery keeps `ack`/execute unchanged because its handoff really is `PUBLISHED→CLAIMED`.

## The rollback plane: `beginRollback`, `rebindMain`, `finishRollback`

All three are Main-authority operations with exact request key sets, single bounded `BEGIN IMMEDIATE` transactions, and the response shapes `CT-R11` pins verbatim.

**`beginRollback`** accepts exactly `{request_identity, expected_mode:"ON", expected_binding_epoch, expected_activation_epoch}`. It requires schema 5, mode `ON`, lease `NONE`, the single ACTIVE Main at the expected epoch, and the latest activation epoch equal to `expected_activation_epoch`. It writes one `ROLLBACK_FREEZE` snapshot, inserts one `ct_rollback_epoch` row at `prior + 1` in state `OPEN`, and updates the singleton lease to `{rollback_epoch: prior+1, lease_status:'ACTIVE', lease_version: prior_version+1, owner_main_binding_id: <this Main>, lease_expires_at}` and `ct_continuation_state.mode` `ON→ROLLING_BACK`. The `ct_rollback_epoch_one_open` partial unique index makes a second concurrent open epoch impossible. Scope key `rollback:<target_rollback_epoch>:begin`; response `{mode:"ROLLING_BACK", rollback_epoch, lease_version, lease_expires_at, replayed}`.

**`rebindMain`** accepts exactly `{request_identity, expected_rollback_epoch, expected_lease_version, expected_binding_epoch}`. It requires schema 5, mode `ROLLING_BACK` at the matching epoch, a lease whose `lease_expires_at` is in the past — an `ACTIVE`, unexpired lease is `CT_ROLLBACK_LEASE_ACTIVE`, the existing code — and a fresh valid `MAIN` termination pairing for the old owner recorded at this exact rollback epoch. It waits only inside the existing bounded writer window; expiry is `CT_BUSY`. In one transaction it retires the old `ct_main_binding` row, inserts the new ACTIVE Main at `old_epoch + 1` under the canonical Main `Ctx` predicate, transfers the lease to the new owner with `lease_version + 1`, inserts one immutable `ct_main_rebind` row, and leaves every delivery closed and every handoff untouched. Scope key `rollback:<rollback_epoch>:rebind:<new_binding_epoch>`; response `{main_binding_id, binding_epoch, rollback_epoch, lease_version, lease_expires_at, replayed}`. That is `CT-R11-S5` exactly.

**`finishRollback`** accepts exactly `{request_identity, expected_rollback_epoch, expected_lease_version, expected_binding_epoch}`. It requires schema 5, mode `ROLLING_BACK` at the matching epoch and lease version, and the current lease-owner Main at the expected binding epoch. It recomputes `quiescence_v1` with `snapshot_kind:"ROLLBACK_FINISH"` inside the same snapshot and refuses `CT_NOT_QUIESCENT` unless every live and pending count is zero. On success it writes the `ROLLBACK_FINISH` snapshot, updates the `ct_rollback_epoch` row to `FINISHED` with its finish lease version, quiescence digest, and timestamp, sets the lease back to `{lease_status:'NONE', owner_main_binding_id: NULL, lease_expires_at: NULL, lease_version + 1}` keeping `rollback_epoch`, and CASes `ct_continuation_state.mode` `ROLLING_BACK→OFF`. Scope key `rollback:<rollback_epoch>:finish`; response `{mode:"OFF", rollback_epoch, quiescence_digest, replayed}`. Suspended rows remain as non-live audit inventory; `finishRollback` never deletes, repairs, or completes one.

`status()` keeps its exact `CT-R11` shape in every mode at schema 5 and changes only factual counts. `WORK_SUSPENDED`, `ATTESTATION_SUSPENDED`, `CANCELLED`, and `POISONED` handoffs are non-live: they contribute to no live or pending count, and they never make `status()` fail.

## P6 precedence ladder and error taxonomy

After safe anchor resolution, writer-lock acquisition failure is `CT_BUSY`. Under the lock every P6 mutation follows this deterministic ladder; no later rung masks an earlier one and every failure is non-mutating:

1. exact schema-5/anchor/state/lease structure and full cross-row validity → `CT_SCHEMA_INVALID | CT_ANCHOR_MISMATCH`; this includes CT-R7-S8's impossible PUBLISHED/PENDING plus same-delivery claim history;
2. mode gate — `OFF` → `CT_CONTINUATION_OFF` for every P6 operation, including recovery (`CT-R7`/`CT-R11`: OFF rejects recovery);
3. exact request shape/JCS/key allowlist and request digest → `CT_PAYLOAD_INVALID`;
4. rollback-epoch fence — under `ROLLING_BACK`, a stale or non-matching `expected_rollback_epoch` → `CT_ROLLBACK_IN_PROGRESS`; under `ON`, a non-matching one → `CT_FENCE_MISMATCH`;
5. disposition/mode legality → `CT_RECOVERY_DISPOSITION_FORBIDDEN`;
6. current authority — ACTIVE Main under `ON`, lease-owner Main at the matching epoch under `ROLLING_BACK` → `CT_WORKFLOW_MAIN_REQUIRED | CT_MAIN_BINDING_CONFLICT | CT_FENCE_MISMATCH`; `rebindMain`'s unexpired-lease case → `CT_ROLLBACK_LEASE_ACTIVE`;
7. operation-qualified idempotency pair → exact persisted replay, `CT_IDEMPOTENCY_CONFLICT`, or malformed-pair `CT_SCHEMA_INVALID`;
8. handoff, delivery, claim, rollback-epoch, or binding existence → `CT_NOT_FOUND`;
9. legal-state/generation/purpose/fingerprint/claim/delivery fences → `CT_INVALID_TRANSITION` for a wrong-but-legal state (including a consumed attestation whose handoff is already `COMPLETED`), otherwise `CT_FENCE_MISMATCH` (including a stale generation);
10. termination-pairing derivation, cardinality, role/boot/session/epoch/generation agreement, digest recomputation, liveness, PID-reuse ambiguity, and ≤30 s freshness → `CT_RECOVERY_REQUIRED`;
11. `ROLLED_BACK` rollback-proof structure and recomputed `boundary_equal` → `CT_RECOVERY_REQUIRED`;
12. `finishRollback` quiescence → `CT_NOT_QUIESCENT`;
13. server derivation of inventory/quiescence/decision/CAS members → commit constraints → `CT_SCHEMA_INVALID`.

P6 introduces exactly two new fail-closed codes — `CT_RECOVERY_REQUIRED` (bare, stale, unavailable, absent, ambiguous, live-process, unpaired, or unprovable proof) and `CT_RECOVERY_DISPOSITION_FORBIDDEN` (a disposition attempted in the wrong mode) — and reuses `CT_FENCE_MISMATCH`, `CT_INVALID_TRANSITION`, `CT_ROLLBACK_IN_PROGRESS`, `CT_ROLLBACK_LEASE_ACTIVE`, `CT_NOT_QUIESCENT`, `CT_CONTINUATION_OFF`, `CT_MAIN_BINDING_CONFLICT`, `CT_WORKFLOW_MAIN_REQUIRED`, `CT_IDEMPOTENCY_CONFLICT`, `CT_PAYLOAD_INVALID`, `CT_NOT_FOUND`, `CT_SCHEMA_INVALID`, `CT_ANCHOR_*`, and `CT_BUSY` for every other rung. CT-R7-S8 belongs to the existing `CT_SCHEMA_INVALID` structural bucket. Any error rolls back every handoff, delivery, claim, transition, receipt, snapshot, epoch, rebind, disposition, and idempotency change.

## P6 fixtures (real persisted state only)

Every valid P6 recovery precondition is produced by actually running the earlier operations; no fixture inserts a synthetic receipt, snapshot, or disposition. CT-R7-S8 is the sole malformed-history characterization: it starts from a real atomic claim, uses an isolated temporary database to restore only the contradictory PUBLISHED/PENDING projection while retaining that same-delivery claim, restores the disabled trigger, and invokes the public recovery path to prove structural `CT_SCHEMA_INVALID` precedence and table-level non-mutation.

- **Schema.** Real `bootstrapAdmin` `1→2→3→4→5`, real `provisionMainAuthorityAnchor`, real `bootstrapMain`, real `activate`.
- **Old-Main identity.** The persisted `ct_main_binding` row created by the real `bootstrapMain`, with its real `identity_digest` and `binding_epoch`; `rebindMain` fixtures bind their `MAIN` receipts to exactly that row.
- **Termination receipts.** The claimant fixture registers under a **real spawned child process** whose observation feeds the binding's `pid_start_marker`; the fixture then terminates that process and calls the real `recordTerminationReceipt` twice (`HOST`, `MCP`) through a real `processObserver`. Negatives use a still-running process (`PRESENT`), a recycled PID with an unreadable marker (`AMBIGUOUS`), a single unpaired role, mismatched boot/session ids, a receipt older than 30 seconds, and a pairing recorded at a different rollback epoch or generation.
- **Frozen inventory and lease.** Produced by a real `beginRollback` over real published/claimed/started/attested rows; the frozen inventory is the server's own snapshot of those rows, never a literal.
- **Trusted polling witness.** Only the server-owned `polling_plane:"UNAVAILABLE_BEFORE_P7"` written by the server; no test ever supplies, patches, or asserts an alternative value into a request.
- **Lifecycle state.** `CLAIMED` from real `create→validate→publish→claim`; `STARTED` from a real `ack` with a real effect manifest; `COMPLETION_ATTESTED` from a real `attestCompletion`; `WORK_SUSPENDED`/`ATTESTATION_SUSPENDED` only from real `SUSPEND_PENDING`/`SUSPEND_ATTESTATION` dispositions; redelivered rows only from real `REDELIVER_WORK`/`REDELIVER_ATTESTATION`.

## P6 capability-gated exposure

The five names `recordTerminationReceipt|recover|beginRollback|rebindMain|finishRollback` join the continuation dispatcher allow-list in `core.mjs` `createContinuationDispatcher` (alongside `bootstrapMain|activate|status|register|receive|create|validate|publish|claim|ack|attestCompletion|complete|reject|revise`) and the `CONTINUATION_TOOL_DEFINITIONS` map in `mcp.mjs`, each with `additionalProperties:false` schemas encoding the exact required fields, enums, and limits above and preserving explicit-null rejection. Default `createMcpHandler()` still lists exactly the eight legacy `tower_*` tools; the continuation names — now nineteen — are exposed only when the trusted-metadata and process-identity capabilities exist, and `recordTerminationReceipt` additionally requires the `processObserver` capability. `provisionMainAuthorityAnchor|bootstrapAdmin` remain CLI-only; `start` remains absent in every mode; unsupported names still fail `CT_PAYLOAD_INVALID` before database access. Schema acceptance is not authority; core repeats every check.

## P6 chained verification, ownership, forecast, and rollback

P6 far exceeds 800 authored lines (one migration plus five operations plus eight dispositions plus a proof plane), so it is split into six sequential chained units with independent ≤800 ceilings that cannot be borrowed. Dependencies P6-A→P6-B→P6-C→P6-D→P6-E→P6-F; P6-A starts from green P5-D. Each unit records its own RED/GREEN/triangulation, focused/full/fail-closed, syntax/diff, preservation, exact authored line count, start/end/dependency, and rollback evidence in `apply-progress.md`, and starts only from the prior gate-passed boundary.

| Unit | Starts from / dependency | GREEN end state | RED scenario ownership | Forecast | Triangulation / rollback boundary |
|---|---|---|---|---:|---|
| P6-A Migration 005 pinning | green P5-D; no P6 predecessor | exact SQL literal, byte length, line count, checksum, 22 object definitions, and the complete 58-object schema-5 manifest are pinned; runtime still accepts at most schema 4 | none — constants only, no CT scenario completion claim | 460–620 | byte/line/checksum/object/manifest drift; revert only A constants/manifest definitions/tests/evidence; schema and runtime stay at P5 |
| P6-B Fresh 4→5 migration, schema-5 validator, compatibility | green P6-A | atomic fresh `4→5`, exact schema-5 replay, DDL rollback, bounded busy, `RECOVER` history acceptance at schema 5 only, all P3/P4/P5 routes green on schema 4 **and** 5 | none — migration/validator only, no CT scenario completion claim | 560–760 | wrong mode/lease/claimant, DDL/busy/rollback, non-empty preservation, schema-4 behaviour byte-identical; revert B execution/version branches/validator/tests; never down-migrate a real schema 5 |
| P6-C Proof plane | green P6-B | `recordTerminationReceipt` with server-only observation, pairing, freshness, PID-reuse rejection; `quiescence_v1`/`frozen_inventory_v1` derivation; `CT_RECOVERY_REQUIRED` | `CT-R7-S1`, `CT-R7-S5` | 480–660 | bare/stale/unavailable/absent/ambiguous/live/unpaired proof; revert only C observer capability/receipt/quiescence handlers/route/tests; preserve schema-5 rows byte-for-byte |
| P6-D ON-mode dispositions | green P6-C | `recover` with `NOT_STARTED`, `ROLLED_BACK`, `CANCELLED`, `POISONED`; atomic republish/fence; `RECOVER` transition + disposition rows | `CT-R7-S2`, `CT-R7-S3`, `CT-R7-S4`, `CT-R7-S6`, `CT-R7-S12` | 560–760 | stale generation, wrong claimant, invalid pairing, consumed attestation, live process, absent/unequal rollback boundary; revert only D `recover` handler/route/tests; preserve C proof rows |
| P6-E Rollback plane and suspension | green P6-D | `beginRollback`, `rebindMain`, `finishRollback`, `SUSPEND_PENDING`, `SUSPEND_ATTESTATION`; lease/epoch transfer; zero-live finish | `CT-R7-S7`, `CT-R7-S8`, `CT-R11-S3` rollback/rebind/finish projection, `CT-R11-S4`, `CT-R11-S5` | 580–780 | malformed claim-present history is `CT_SCHEMA_INVALID` before recovery semantics; unexpired lease, stale epoch/lease version, nonzero live/pending finish, non-owner Main; revert only E rollback-plane handlers/routes/tests; preserve C/D rows and leave any open epoch inert |
| P6-F Redelivery and forbidden-mode closure | green P6-E | `REDELIVER_WORK`, `REDELIVER_ATTESTATION`, attestation carry-forward in `complete`, redelivery `CLAIM` acceptance, complete `CT-R11-S2` ladder | `CT-R7-S9`, `CT-R7-S10`, `CT-R7-S11`, `CT-R11-S2` | 420–600 | forbidden dispositions in `ROLLING_BACK`, redelivery `ack` rejection, missing/mismatched preserved attestation, duplicate redelivery scope; revert only F redelivery/`complete`-rung/`CLAIM`-pair changes/tests; preserve C/D/E rows |

Total P6 forecast is **3,060–4,180 authored lines** across the six units in `core.mjs`, `mcp.mjs`, `test/recovery.test.mjs`, and `test/migration.test.mjs`; each unit is independently ≤800. If any concrete pre-RED forecast crosses 800, stop and split that unit further — the natural further splits are P6-C into receipts vs. quiescence, P6-D into republish vs. fence-only dispositions, and P6-E into `beginRollback`/`finishRollback` vs. `rebindMain` — and budgets are never borrowed. Strict TDD is independent per unit: preserve the prior green safety net, record a genuine RED before each unit's production edits, complete GREEN and triangulation under 800, and start the next unit only from the prior gate-passed boundary.

### Scenario ownership map

| Scenario | Unit | Scenario | Unit |
|---|---|---|---|
| `CT-R7-S1` Insufficient proof | P6-C | `CT-R7-S8` Malformed claim-present history rejected structurally | P6-E |
| `CT-R7-S2` Valid disposition | P6-D | `CT-R7-S9` ON-only work redelivery | P6-F |
| `CT-R7-S3` Absent rollback proof | P6-D | `CT-R7-S10` Attestation suspension and redelivery | P6-F |
| `CT-R7-S4` Stale or invalid recovery | P6-D | `CT-R7-S11` Redelivery claimant cannot ack | P6-F |
| `CT-R7-S5` Freshness verification | P6-C | `CT-R7-S12` Atomic dispositions | P6-D |
| `CT-R7-S6` Compensated republish | P6-D | `CT-R11-S2` Recovery disposition gates | P6-F |
| `CT-R7-S7` Pending work suspended | P6-E | `CT-R11-S3` rollback/rebind/finish projection | P6-E |
| `CT-R11-S4` OFF follows quiescence | P6-E | `CT-R11-S5` Rebind uses expired lease and proof | P6-E |

Every one of the sixteen assignments is owned by exactly one unit; none is unassigned and none is double-claimed. `CT-R11-S3` stays cumulative: P3 already owns its status/bootstrap/activation effects and P6-E adds only the rollback/rebind/finish effects. `CT-R7-S10` spans suspension and redelivery but is a single scenario, and P6-F owns it end to end because only P6-F can prove the redelivery half; P6-E records the `SUSPEND_ATTESTATION` half as fail-closed evidence without claiming the scenario.

### Rollback boundary and explicit out-of-scope

Reverting P6-A removes only inert constants and tests. Reverting P6-B or any later unit **never down-migrates**: schema-5 data stays inert, older code rejects it `CT_SCHEMA_INVALID`, and legacy behaviour remains available. Reverting any implementation unit removes only that unit's handlers, routes, capability wiring, tests, and evidence, and preserves byte-for-byte: every Migration 004 byte and checksum; every P3 anchor, Main, activation, lease, and claimant row; every P4 handoff, transition, delivery, claim, budget, and idempotency row; every P5 `STARTED`/`COMPLETION_ATTESTED`/`COMPLETED`/`REJECTED` row, attestation, effect manifest, and committed result; and every already-committed P6 receipt, snapshot, rollback epoch, rebind, and disposition row. The schema-4 code path is untouched by construction, so a schema-4 database under reverted P6 code behaves exactly as it did under P5.

Explicitly outside P6: the polling plane and host-neutral loop (`P7`), the OpenCode/Pi/Claude adapters (`P7`/`P8`/`P9`), the versioned runtime and verified cutover (`P10`), any real polling witness value, any `start` API, any runtime activation of the Tower, any `ACTIVE` file or `tower.db` mutation outside a test's temporary root, and any commit, push, or PR. P6 also does not widen `ct_quiescence_snapshot.polling_witness`, does not add a state, operation, or purpose CHECK member, and does not touch a single byte of Migration 001, 002, 003, or 004.
