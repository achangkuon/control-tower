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
