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
