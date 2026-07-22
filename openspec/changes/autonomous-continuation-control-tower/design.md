# Design: Autonomous Continuation — Control Tower

## Technical Approach

Slice 1 adds only an owner-provisioned authority anchor and additive schema version 1. Continuation remains `OFF`; `ACTIVE`, legacy tables/rows, eight MCP tools, and fail-closed behavior remain unchanged. Revision 11 specs define later behavior.

## Slice 1 Authority Contract

`<git-common-dir>/control-tower/main_authority_anchor_v1.json` is the sole persisted canonical-Main configuration; there is no caller-controlled secondary config. Before first write, `torre provision-main --repo PATH --request-identity UUID --expected-config-digest sha256:HEX` derives configuration from `PATH`, not request claims. `install.sh --provision-main ...` delegates to that CLI; ordinary installation provisions nothing.

`deriveCanonicalMainContext(cwd)` runs Git via argument arrays: absolute `--git-common-dir`, `worktree list --porcelain -z`, each candidate’s `--absolute-git-dir`, and Main’s `symbolic-ref --short HEAD`. The unique candidate whose Git dir equals the common dir is Main. `realpath` then `normalize` produces absolute, separator-trimmed, case-sensitive `canonical_repo=main_worktree`, `git_common_dir`, and `main_worktree`; branch is the exact short ref (detached/ambiguous fails); `trusted_uid=process.geteuid()`. Runtime freshly derives `Ctx`; its current worktree/branch are server values. Anchor values are comparison targets. Caller actor, role, session, UID, branch, or path fields are forbidden and ignored for authority. This works identically when CLI starts in a linked worktree.

The canonical JSON (JCS plus newline) has exactly:

```text
{kind:"main_authority_anchor_v1",version:1,anchor_id,anchor_secret,anchor_epoch:1,
 context:{canonical_repo,git_common_dir,main_worktree,branch,trusted_uid},config_digest,
 provision_request_identity,provision_request_digest,created_at}
```

`config_digest` hashes UTF-8 JCS of `context`; `provision_request_digest` hashes UTF-8 JCS of the two request fields. `created_at` is UTC RFC3339 milliseconds. `anchor_id` and secret are independent base64url(no-padding) 32-byte CSPRNG values; only raw `anchor_secret` is secret and never returned/stored in SQLite. The runtime directory and file must be owned by `trusted_uid`, real single-link entries, and exactly `0700`/`0600`; every existing component from resolved common dir is `lstat`-checked. Provisioning refuses unsafe or mismatching state. Creation uses a sibling `wx`/`0600` temporary, complete write, file `fsync`, atomic no-replace rename, directory `fsync`; failure removes only the temporary. Exact safe replay performs no write.

## Migration 001

`core.mjs` owns immutable LF-normalized `MIGRATION_001_SQL`; `ddl_checksum` is `sha256:<lowercase hex>` over its UTF-8 bytes with exactly one terminal LF. Bootstrap first verifies the unchanged Plan A objects `agent`, `message`, `message_pending`, and `lock`. Version `0` means no `ct_*` object; any partial/unknown object is drift.

Migration 001 creates exactly:

| Object | Columns / constraints |
|---|---|
| `ct_schema_migration` | `version INTEGER PRIMARY KEY CHECK(version=1)`, `ddl_checksum TEXT NOT NULL UNIQUE`, `applied_at TEXT NOT NULL` |
| `ct_continuation_state` | `id INTEGER PRIMARY KEY CHECK(id=1)`, `anchor_id TEXT NOT NULL UNIQUE`, `anchor_epoch INTEGER NOT NULL CHECK(anchor_epoch=1)`, `anchor_secret_digest TEXT NOT NULL`, `config_digest TEXT NOT NULL`, `schema_version INTEGER NOT NULL CHECK(schema_version=1)`, `mode TEXT NOT NULL DEFAULT 'OFF' CHECK(mode IN ('OFF','ON','ROLLING_BACK'))` |
| `ct_idempotency` | `operation,scope_key,request_identity,request_digest,cas_digest,response_json,committed_at TEXT NOT NULL`; PK `(operation,scope_key)`; UNIQUE `(operation,request_identity)` |

One `BEGIN IMMEDIATE` validates anchor/config/SHA-256 secret digest, creates all three tables, inserts migration/state (`mode='OFF'`)/bootstrap-idempotency rows, re-reads the anchor identity/hash, and commits. No `ALTER`, `DROP`, or legacy row update occurs. Stored checksum and exact type/name/SQL-sorted `sqlite_master` manifest are checked on every bootstrap. DDL/insert/check failure rolls back every Slice 1 object/row; pre-existing legacy bytes remain. Later binding, lifecycle, delivery, evidence, lease, rollback, polling tables/columns are additive and absent; `ON`/`ROLLING_BACK` values are reserved only.

## APIs, CAS, and Failures

`provisionMainAuthorityAnchor({request_identity,expected_config_digest})` is core-backed CLI-only filesystem persistence; `bootstrapAdmin({request_identity,expected_anchor_id,expected_schema_version,target_schema_version,expected_mode:"OFF"})` is core-backed CLI-only SQLite persistence. Neither is MCP-exposed. Responses are exactly `{anchor_id,anchor_epoch,state:"PROVISIONED",replayed}` and `{anchor_id,schema_version,mode:"OFF",replayed}`.

Canonical UUID identity grants no authority. Provision replay compares the anchor’s operation identity plus request/config digest. Bootstrap uses scope `admin-bootstrap`; after integrity/authority checks, exact identity+request+CAS digest replays stored response with only `replayed:true`; changed tuple or new identity after this single-use transition is `CT_IDEMPOTENCY_CONFLICT`. First bootstrap CAS is schema `0→1`, mode `OFF→OFF`; any other target is `CT_SCHEMA_INVALID`.

Evaluation/mapping is deterministic and non-mutating: malformed/unresolvable config, unsafe owner/mode/symlink, or config/existing-anchor mismatch → `CT_ANCHOR_MISMATCH`; missing bootstrap anchor → `CT_ANCHOR_REQUIRED`; schema version/checksum/object drift or DDL failure → `CT_SCHEMA_INVALID`; mode CAS → `CT_FENCE_MISMATCH`; committed tuple conflict → `CT_IDEMPOTENCY_CONFLICT`; bounded SQLite contention → `CT_BUSY`.

## Ownership, Tests, and Rollback

`core.mjs`: derivation, safe anchor IO, admin open, migration/checksum/CAS. `bin/torre`: `main-config`, `provision-main`, `bootstrap-admin` and strict flags. `install.sh`: optional explicit delegation only. `mcp.mjs`: unchanged. `test/helpers/tower-fixture.mjs`: temporary main+linked worktrees and runtime roots; no environment authority override. `test/migration.test.mjs` owns CT-R8, unsafe-file, replay/conflict, DDL rollback, legacy-preservation, inert named-path, and relative/absolute/`git -C` RED cases. Actual Tower stays OFF; P0 snapshots prove no actual DB/anchor/`ACTIVE` mutation.

| Threat boundary | Applicability / RED |
|---|---|
| Documentation-like paths | Applicable: one inert/fail-closed RED each for `requirements.txt`, `CMakeLists.txt`, executable MD/MDX, `README.sh` |
| Git repository selection | Applicable: relative, absolute, and `git -C` must derive identical fingerprints or fail unchanged |
| Commit / push / PR | N/A: Slice 1 performs none |

Rollback reverts only Slice 1 code/tests. Additive `ct_*` tables and anchor remain inert and OFF rather than being destructively down-migrated; legacy continues. Until later slices, `bootstrapMain`, activation, continuation status/identity, handoffs, delivery/claim, attestation, recovery/rollback, polling, and all continuation MCP tools are unavailable; `start` never exists.
