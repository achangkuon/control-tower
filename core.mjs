// Control Tower — store.
//
// One SQLite database per repository, at <git-common-dir>/control-tower/tower.db.
// All worktrees of a repo share it; separate repos never do. It lives inside
// .git, so it is never versioned and never dirties a branch.
//
// This file is the only place that touches the database. The MCP server and the
// OpenCode plugin both go through it, so there is one definition of what a
// legal state transition is.
//
// Why SQLite and not Engram: the delivery token needs "grant only if nobody
// holds it" to be ONE atomic step. Engram's mem_update is a blind overwrite
// with no conditional update, so read-decide-write leaves a window where two
// callers both see "free" and both take it — the same shape of bug as two
// agents overwriting a single-file mailbox. `BEGIN IMMEDIATE` closes it.
// Engram remains the right home for narrative: why we decided things, what
// happened last session. The tower holds only what is true right now.

import { Database } from "bun:sqlite"
import { execFileSync } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import {
  appendFileSync, chmodSync, closeSync, constants, existsSync, fchmodSync, fsyncSync, linkSync,
  lstatSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync,
} from "node:fs"
import { basename, isAbsolute, join, normalize } from "node:path"

export const STATES = [
  "PLANNED",
  "ASSIGNED",
  "WORKING",
  "READY",
  "DELIVERING",
  "PR_OPEN",
  "MERGED",
  "BLOCKED",
  "WAITING_HUMAN",
  "COMPLETE",
]

// Held by at most one agent at a time. Parallel WORK is fine and expected;
// what serializes is delivery and schema mutation. Two agents with zero file
// overlap still share one remote and one database, so disjoint scope does not
// make simultaneous delivery safe.
export const LOCKS = ["git-delivery", "db-writer"]

export const INACTIVE_ERROR = "control tower is off for this repository; run `torre on` to enable it"

const now = () => new Date().toISOString()

// States that mean the loop stopped and is waiting on a person. They are
// marked in the trace so `torre log` shows the one thing you cannot infer from
// watching messages fly past: that nothing is coming next.
export const NEEDS_HUMAN = ["BLOCKED", "WAITING_HUMAN"]

/**
 * Append one line to the shared trace. Every actor writes here — plugin, MCP,
 * both sides of a handoff — so the log is the whole story of the run and not
 * just the wakes. Best-effort: a trace that cannot be written must never take
 * down the operation it was describing.
 */
export const trace = (root, actor, line, flag = "") => {
  try {
    appendFileSync(join(root, "tower.log"), `${now()} ${actor} ${flag}${line}\n`)
  } catch {
    // nothing sensible to do; losing a log line beats failing the caller
  }
}

const git = (cwd, args) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim()

const ctError = (code, cause) => Object.assign(new Error(code, { cause }), { code })
const jcs = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(jcs).join(",")}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(",")}}`
}
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const rfc3339Milliseconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const isBase64url32 = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value) &&
  Buffer.from(value, "base64url").length === 32 && Buffer.from(value, "base64url").toString("base64url") === value
const ANCHOR_NAME = "main_authority_anchor_v1.json"

export const MIGRATION_001_SQL = `CREATE TABLE ct_schema_migration (
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
`
export const MIGRATION_001_CHECKSUM = sha256(Buffer.from(MIGRATION_001_SQL))
export const SUPERSEDED_MIGRATION_001_CHECKSUM = "sha256:47f63b10e516ac977e1cc26723b064eb037a4a2cdb84246b1c183903b909eb41"
export const MIGRATION_002_SQL = `CREATE TABLE ct_claimant_binding (
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
`
export const MIGRATION_002_CHECKSUM = sha256(Buffer.from(MIGRATION_002_SQL))
const MANIFEST_SQL = `SELECT type, name, tbl_name, sql
FROM sqlite_master
WHERE name IN ('agent','message','message_pending','lock',
               'ct_schema_migration','ct_continuation_state','ct_idempotency')
   OR (name GLOB 'ct_*' AND name NOT LIKE 'sqlite_%')
ORDER BY type, name;`
const normalizeSchemaSql = (sql) => sql.replace(/\s+/g, " ").replace(/\s*([(),])\s*/g, "$1").trim()
const LEGACY_SQL = new Map([
  ["table:agent:agent", "CREATE TABLE agent(name TEXT PRIMARY KEY,role TEXT NOT NULL,worktree TEXT NOT NULL,branch TEXT,state TEXT NOT NULL,task TEXT,note TEXT,pr_url TEXT,updated_at TEXT NOT NULL)"],
  ["table:message:message", "CREATE TABLE message(id INTEGER PRIMARY KEY AUTOINCREMENT,recipient TEXT NOT NULL,sender TEXT NOT NULL,text TEXT NOT NULL,created_at TEXT NOT NULL,consumed_at TEXT)"],
  ["index:message_pending:message", "CREATE INDEX message_pending ON message(recipient,id)WHERE consumed_at IS NULL"],
  ["table:lock:lock", "CREATE TABLE lock(name TEXT PRIMARY KEY,holder TEXT,acquired_at TEXT)"],
])
const schemaObjects = (sql) => {
  const db = new Database(":memory:")
  try {
    db.run(sql)
    return new Map(db.query(`SELECT type,name,tbl_name,sql FROM sqlite_master
      WHERE name GLOB 'ct_*' AND name NOT LIKE 'sqlite_%' ORDER BY type,name`).all().map((row) => [row.name, row]))
  } finally { db.close() }
}
const V1_OBJECTS = schemaObjects(MIGRATION_001_SQL)
const V2_OBJECTS = new Map([...V1_OBJECTS, ...schemaObjects(MIGRATION_002_SQL)])
const SCHEMA_MANIFESTS = new Map([
  [1, { objects: V1_OBJECTS, migrations: new Map([[1, MIGRATION_001_CHECKSUM]]) }],
  [2, { objects: V2_OBJECTS, migrations: new Map([[1, MIGRATION_001_CHECKSUM], [2, MIGRATION_002_CHECKSUM]]) }],
])

export const deriveCanonicalMainContext = (cwd) => {
  const common = normalize(realpathSync(git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"])))
  const candidates = execFileSync("git", ["worktree", "list", "--porcelain", "-z"], { cwd, encoding: "utf8" })
    .split("\0").filter((line) => line.startsWith("worktree ")).map((line) => line.slice(9))
  const mains = candidates.filter((path) => normalize(realpathSync(git(path, ["rev-parse", "--path-format=absolute", "--absolute-git-dir"]))) === common)
  if (mains.length !== 1) throw new Error("canonical Main is missing or ambiguous")
  const main = normalize(realpathSync(mains[0]))
  const branch = git(main, ["symbolic-ref", "--short", "HEAD"])
  if (!branch) throw new Error("canonical Main branch is detached or ambiguous")
  return { canonical_repo: main, git_common_dir: common, main_worktree: main, branch, trusted_uid: process.geteuid() }
}

export const isSafeAnchorEntry = (entry, expected) =>
  entry.uid === expected.uid && entry.mode === expected.mode && entry.type === expected.type &&
  (!expected.singleLink || entry.nlink === 1)
const entrySafe = (stats, type, mode, uid, singleLink = false) => isSafeAnchorEntry(
  { type: stats.isSymbolicLink() ? "symlink" : stats.isDirectory() ? "directory" : stats.isFile() ? "file" : "other", uid: stats.uid, mode: stats.mode & 0o777, nlink: stats.nlink },
  { type, mode, uid, singleLink },
)
const ensureRuntime = (context, create) => {
  const commonStats = lstatSync(context.git_common_dir)
  if (!commonStats.isDirectory() || commonStats.isSymbolicLink()) throw ctError("CT_ANCHOR_MISMATCH")
  const root = join(context.git_common_dir, "control-tower")
  if (!existsSync(root) && create) {
    mkdirSync(root, { mode: 0o700 })
    chmodSync(root, 0o700)
  }
  if (!existsSync(root)) throw ctError("CT_ANCHOR_REQUIRED")
  if (!entrySafe(lstatSync(root), "directory", 0o700, context.trusted_uid)) throw ctError("CT_ANCHOR_MISMATCH")
  return root
}
const configDigest = (context) => sha256(Buffer.from(jcs(context)))
const requestDigest = (value) => sha256(Buffer.from(jcs(value)))
const anchorResponse = (anchor, replayed) => ({ anchor_id: anchor.anchor_id, anchor_epoch: 1, state: "PROVISIONED", replayed })
const readAnchor = (context) => {
  const root = ensureRuntime(context, false)
  const path = join(root, ANCHOR_NAME)
  if (!existsSync(path)) throw ctError("CT_ANCHOR_REQUIRED")
  if (!entrySafe(lstatSync(path), "file", 0o600, context.trusted_uid, true)) throw ctError("CT_ANCHOR_MISMATCH")
  try {
    const bytes = readFileSync(path, "utf8")
    const anchor = JSON.parse(bytes)
    const keys = ["anchor_epoch","anchor_id","anchor_secret","config_digest","context","created_at","kind","provision_request_digest","provision_request_identity","version"]
    if (bytes !== `${jcs(anchor)}\n` || JSON.stringify(Object.keys(anchor).sort()) !== JSON.stringify(keys) ||
        anchor.kind !== "main_authority_anchor_v1" || anchor.version !== 1 || anchor.anchor_epoch !== 1 ||
        anchor.config_digest !== configDigest(context) || jcs(anchor.context) !== jcs(context) ||
        !isBase64url32(anchor.anchor_id) || !isBase64url32(anchor.anchor_secret) ||
        anchor.anchor_id === anchor.anchor_secret || !rfc3339Milliseconds.test(anchor.created_at) ||
        new Date(anchor.created_at).toISOString() !== anchor.created_at) throw new Error("anchor mismatch")
    return { anchor, bytes, root, path }
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    throw ctError("CT_ANCHOR_MISMATCH", error)
  }
}

export const provisionMainAuthorityAnchor = (request, cwd = process.cwd()) => {
  let context
  try { context = deriveCanonicalMainContext(cwd) } catch (error) { throw ctError("CT_ANCHOR_MISMATCH", error) }
  const expected = configDigest(context)
  if (!uuid.test(request?.request_identity ?? "") || request?.expected_config_digest !== expected) throw ctError("CT_ANCHOR_MISMATCH")
  let root
  try { root = ensureRuntime(context, true) } catch (error) { throw error.code ? error : ctError("CT_ANCHOR_MISMATCH", error) }
  const path = join(root, ANCHOR_NAME)
  if (existsSync(path)) {
    const { anchor } = readAnchor(context)
    const digest = requestDigest({ request_identity: request.request_identity, expected_config_digest: expected })
    if (anchor.provision_request_identity !== request.request_identity || anchor.provision_request_digest !== digest) throw ctError("CT_ANCHOR_MISMATCH")
    return anchorResponse(anchor, true)
  }
  const anchor = {
    kind: "main_authority_anchor_v1", version: 1,
    anchor_id: randomBytes(32).toString("base64url"), anchor_secret: randomBytes(32).toString("base64url"), anchor_epoch: 1,
    context, config_digest: expected, provision_request_identity: request.request_identity,
    provision_request_digest: requestDigest({ request_identity: request.request_identity, expected_config_digest: expected }),
    created_at: new Date().toISOString(),
  }
  const temp = join(root, `.${ANCHOR_NAME}.${randomBytes(12).toString("hex")}`)
  let fd
  try {
    fd = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
    fchmodSync(fd, 0o600)
    writeFileSync(fd, `${jcs(anchor)}\n`); fsyncSync(fd); closeSync(fd); fd = undefined
    linkSync(temp, path); unlinkSync(temp)
    readAnchor(context)
    const dir = openSync(root, constants.O_RDONLY | constants.O_DIRECTORY); fsyncSync(dir); closeSync(dir)
    return anchorResponse(anchor, false)
  } catch (error) {
    if (fd !== undefined) closeSync(fd)
    rmSync(temp, { force: true })
    if (error?.code === "EEXIST" || existsSync(path)) throw ctError("CT_ANCHOR_MISMATCH", error)
    throw error
  }
}

const inspectSchema = (db) => {
  const rows = db.query(MANIFEST_SQL).all()
  const legacy = rows.filter(({ name }) => !name.startsWith("ct_"))
  if (legacy.length !== 4 || legacy.some((row) =>
    LEGACY_SQL.get(`${row.type}:${row.name}:${row.tbl_name}`) !== normalizeSchemaSql(row.sql),
  )) throw ctError("CT_SCHEMA_INVALID")
  const continuation = rows.filter(({ name }) => name.startsWith("ct_"))
  if (continuation.length === 0) return 0
  const migrationTable = continuation.find(({ type, name, tbl_name }) =>
    type === "table" && name === "ct_schema_migration" && tbl_name === name)
  if (!migrationTable) throw ctError("CT_SCHEMA_INVALID")
  const migrations = db.query("SELECT version,ddl_checksum FROM ct_schema_migration ORDER BY version").all()
  if (migrations.some(({ version, ddl_checksum }) =>
    version === 1 && ddl_checksum === SUPERSEDED_MIGRATION_001_CHECKSUM)) {
    throw ctError("CT_SCHEMA_INVALID", new Error("SUPERSEDED_MIGRATION_001"))
  }
  const version = migrations.at(-1)?.version
  const manifest = SCHEMA_MANIFESTS.get(version)
  if (!manifest || migrations.length !== manifest.migrations.size || migrations.some(({ version: migrationVersion, ddl_checksum }) =>
    manifest.migrations.get(migrationVersion) !== ddl_checksum)) throw ctError("CT_SCHEMA_INVALID")
  if (continuation.length !== manifest.objects.size || continuation.some((row) => {
    const expected = manifest.objects.get(row.name)
    return !expected || row.type !== expected.type || row.tbl_name !== expected.tbl_name || row.sql !== expected.sql
  })) throw ctError("CT_SCHEMA_INVALID")
  return version
}
const continuationState = (db, authority, expectedVersion) => {
  const rows = db.query("SELECT * FROM ct_continuation_state").all()
  if (rows.length !== 1 || rows[0].id !== 1 || rows[0].schema_version !== expectedVersion) throw ctError("CT_SCHEMA_INVALID")
  const state = rows[0]
  if (state.anchor_id !== authority.anchor.anchor_id ||
      state.anchor_secret_digest !== sha256(Buffer.from(authority.anchor.anchor_secret, "base64url")) ||
      state.config_digest !== authority.anchor.config_digest) throw ctError("CT_ANCHOR_MISMATCH")
  if (state.anchor_epoch !== 1 || !["OFF", "ON", "ROLLING_BACK"].includes(state.mode)) throw ctError("CT_FENCE_MISMATCH")
  return state
}
const validateContinuationState = (db, authority, version = 1) => {
  const state = continuationState(db, authority, version)
  if (state.mode !== "OFF") throw ctError("CT_FENCE_MISMATCH")
  return state
}
const busy = (error) => error?.code === "SQLITE_BUSY" || /locked|busy/i.test(error?.message ?? "")

export const bootstrapAdmin = (request, cwd = process.cwd()) => {
  let context, authority
  try { context = deriveCanonicalMainContext(cwd); authority = readAnchor(context) }
  catch (error) { throw error.code ? error : ctError("CT_ANCHOR_MISMATCH", error) }
  if (!uuid.test(request?.request_identity ?? "") || request.expected_mode !== "OFF" || ![1, 2].includes(request.target_schema_version)) throw ctError("CT_SCHEMA_INVALID")
  const dbPath = join(authority.root, "tower.db")
  if (!existsSync(dbPath)) throw ctError("CT_SCHEMA_INVALID")
  const db = new Database(dbPath); db.run("PRAGMA busy_timeout = 250")
  const target = request.target_schema_version
  const scope = target === 1 ? "admin-bootstrap" : "schema:1->2"
  const requestValue = { request_identity: request.request_identity, expected_anchor_id: request.expected_anchor_id, expected_schema_version: request.expected_schema_version, target_schema_version: target, expected_mode: "OFF" }
  const request_digest = requestDigest(requestValue)
  const casValue = { expected_anchor_id: request.expected_anchor_id, expected_schema_version: request.expected_schema_version, target_schema_version: target, expected_mode: "OFF", derived_anchor_epoch: 1, derived_config_digest: authority.anchor.config_digest }
  if (target === 2) Object.assign(casValue, { expected_rollback_epoch: 0, expected_lease_version: 0, expected_lease_status: "NONE" })
  const cas_digest = requestDigest(casValue)
  try {
    const apply = db.transaction(() => {
      const version = inspectSchema(db)
      if (version === target) {
        const row = db.query("SELECT * FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key=?").get(scope)
        if (!row || row.request_identity !== request.request_identity || row.request_digest !== request_digest || row.cas_digest !== cas_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        validateContinuationState(db, authority, target)
        if (target === 2) validateLease(db)
        return { ...JSON.parse(row.response_json), replayed: true }
      }
      if (target === 1) {
        if (version !== 0) throw ctError("CT_SCHEMA_INVALID")
        if (request.expected_anchor_id !== authority.anchor.anchor_id || request.expected_schema_version !== 0) throw ctError("CT_FENCE_MISMATCH")
        const response = { anchor_id: authority.anchor.anchor_id, schema_version: 1, mode: "OFF", replayed: false }
        db.run(MIGRATION_001_SQL)
        const applied = new Date().toISOString()
        db.run("INSERT INTO ct_schema_migration VALUES (1,?,?)", [MIGRATION_001_CHECKSUM, applied])
        db.run("INSERT INTO ct_continuation_state VALUES (1,?,?,?,?,1,'OFF')", [authority.anchor.anchor_id, 1, sha256(Buffer.from(authority.anchor.anchor_secret, "base64url")), authority.anchor.config_digest])
        db.run("INSERT INTO ct_idempotency VALUES ('bootstrapAdmin','admin-bootstrap',?,?,?,?,?)", [request.request_identity, request_digest, cas_digest, jcs(response), applied])
        assertAdminCommit(db, authority, 1)
        return response
      }
      if (version !== 1) throw ctError("CT_SCHEMA_INVALID")
      if (db.query("SELECT 1 FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key=?").get(scope)) throw ctError("CT_IDEMPOTENCY_CONFLICT")
      validateContinuationState(db, authority, 1)
      if (request.expected_anchor_id !== authority.anchor.anchor_id || request.expected_schema_version !== 1) throw ctError("CT_FENCE_MISMATCH")
      db.run(MIGRATION_002_SQL)
      db.run("INSERT INTO ct_rollback_lease VALUES (1,0,'NONE',0,NULL,NULL)")
      if (db.run("UPDATE ct_continuation_state SET schema_version=2 WHERE id=1 AND schema_version=1").changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      const applied = new Date().toISOString()
      db.run("INSERT INTO ct_schema_migration VALUES (2,?,?)", [MIGRATION_002_CHECKSUM, applied])
      const response = { anchor_id: authority.anchor.anchor_id, schema_version: 2, mode: "OFF", replayed: false }
      db.run("INSERT INTO ct_idempotency VALUES ('bootstrapAdmin',?,?,?,?,?,?)", [scope, request.request_identity, request_digest, cas_digest, jcs(response), applied])
      assertAdminCommit(db, authority, 2); validateLease(db)
      return response
    })
    return apply.immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  } finally { db.close() }
}

const assertAdminCommit = (db, authority, version) => {
  if (readFileSync(authority.path, "utf8") !== authority.bytes) throw ctError("CT_ANCHOR_MISMATCH")
  if (inspectSchema(db) !== version) throw ctError("CT_SCHEMA_INVALID")
  validateContinuationState(db, authority, version)
}
const validateLease = (db) => {
  const rows = db.query("SELECT * FROM ct_rollback_lease").all()
  if (rows.length !== 1) throw ctError("CT_SCHEMA_INVALID")
  const lease = rows[0]
  if (!Number.isSafeInteger(lease.rollback_epoch) || lease.rollback_epoch < 0 || !Number.isSafeInteger(lease.lease_version) || lease.lease_version < 0 ||
      !["NONE", "ACTIVE", "EXPIRED"].includes(lease.lease_status) ||
      (lease.lease_status === "NONE" ? lease.owner_main_binding_id !== null || lease.lease_expires_at !== null : typeof lease.owner_main_binding_id !== "string" || !rfc3339Milliseconds.test(lease.lease_expires_at ?? ""))) throw ctError("CT_SCHEMA_INVALID")
  return lease
}

const opaque = (value, limit = 256) => typeof value === "string" && Buffer.byteLength(value) >= 1 && Buffer.byteLength(value) <= limit && !value.includes("\0")
const absolutePath = (value) => typeof value === "string" && value.length > 0 && !value.includes("\0") && isAbsolute(value) && normalize(value) === value
const safeEpoch = (value) => Number.isSafeInteger(value) && value >= 0
const forbiddenCtxKeys = new Set(["ctx", "actor", "role", "session", "effective_uid", "canonical_repo", "git_common_dir", "worktree", "branch", "host_process_instance", "plugin_instance", "root_session_id", "mcp_process_instance", "pid_start_marker", "binding_epoch"])
const registrationKeys = ["expected_binding_epoch", "expected_binding_state", "request_identity"]
const bindingFields = ["effective_uid", "canonical_repo", "git_common_dir", "worktree", "branch", "host_process_instance", "plugin_instance", "root_session_id", "mcp_process_instance", "pid_start_marker", "binding_epoch"]
const sameRootFields = bindingFields.filter((field) => !["mcp_process_instance", "pid_start_marker", "binding_epoch"].includes(field))
const makeId = () => randomBytes(32).toString("base64url")
const tuple = (ctx, epoch = ctx.binding_epoch) => Object.fromEntries(bindingFields.map((field) => [field, field === "binding_epoch" ? epoch : ctx[field]]))
const scope = (ctx) => ({ effective_uid: ctx.effective_uid, canonical_repo: ctx.canonical_repo, git_common_dir: ctx.git_common_dir, plugin_instance: ctx.plugin_instance })
const equalFields = (left, right, fields) => fields.every((field) => left[field] === right[field])
const freezeCtx = (value) => Object.freeze(Object.assign(Object.create(null), value))

const continuationAuthority = (cwd) => {
  try {
    const canonical = deriveCanonicalMainContext(cwd)
    return { authority: readAnchor(canonical), cwd }
  } catch (error) { throw error.code ? error : ctError("CT_ANCHOR_MISMATCH", error) }
}
const continuationHandle = (cwd, payloadInvalid = false) => {
  const resolved = continuationAuthority(cwd)
  const dbPath = join(resolved.authority.root, "tower.db")
  if (!existsSync(dbPath)) throw ctError("CT_SCHEMA_INVALID")
  const db = new Database(dbPath); db.run("PRAGMA busy_timeout = 250")
  return { ...resolved, db, payloadInvalid }
}
const gateContinuation = ({ db, authority }) => {
  if (inspectSchema(db) !== 2) throw ctError("CT_SCHEMA_INVALID")
  const state = continuationState(db, authority, 2)
  const lease = validateLease(db)
  if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
  if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
  if (lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
  return lease
}
const assertRegisterRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(registrationKeys) || !uuid.test(request.request_identity ?? "") ||
      !safeEpoch(request.expected_binding_epoch) || !["ABSENT", "ACTIVE"].includes(request.expected_binding_state)) throw ctError("CT_PAYLOAD_INVALID")
}
const createCtxFactory = ({ trustedMetadata, processIdentity, cwd, authority }, stableProcess) => () => {
  let host, processSnapshot, derived
  try {
    host = trustedMetadata.snapshot(); processSnapshot = processIdentity.snapshot()
    const git_common_dir = normalize(realpathSync(git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"])))
    const worktree = normalize(realpathSync(git(cwd, ["rev-parse", "--show-toplevel"])))
    const branch = git(cwd, ["symbolic-ref", "--short", "HEAD"])
    derived = { effective_uid: process.geteuid(), canonical_repo: authority.anchor.context.canonical_repo, git_common_dir, worktree, branch }
    if (git_common_dir !== authority.anchor.context.git_common_dir) throw new Error("wrong repository")
  } catch (error) { throw ctError("CT_SESSION_ISOLATION_UNPROVEN", error) }
  const copiedProcess = { mcp_process_instance: processSnapshot?.mcp_process_instance, pid_start_marker: processSnapshot?.pid_start_marker }
  const copiedHost = { host_process_instance: host?.host_process_instance, plugin_instance: host?.plugin_instance, root_session_id: host?.root_session_id, binding_epoch: host?.binding_epoch }
  if (![copiedHost.host_process_instance, copiedHost.plugin_instance, copiedHost.root_session_id].every((value) => opaque(value)) || !safeEpoch(copiedHost.binding_epoch) ||
      !isBase64url32(copiedProcess.mcp_process_instance) || !opaque(copiedProcess.pid_start_marker, 128) || !Number.isSafeInteger(derived.effective_uid) || derived.effective_uid < 0 ||
      ![derived.canonical_repo, derived.git_common_dir, derived.worktree].every(absolutePath) || !opaque(derived.branch, 255)) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
  if (stableProcess.value && !equalFields(stableProcess.value, copiedProcess, ["mcp_process_instance", "pid_start_marker"])) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
  stableProcess.value ??= copiedProcess
  return freezeCtx({ ...derived, ...copiedHost, ...copiedProcess })
}

export const createContinuationDispatcher = ({ cwd = process.cwd(), trustedMetadata, processIdentity }) => {
  if (!trustedMetadata?.snapshot || !processIdentity?.snapshot) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
  const stableProcess = { value: null }
  return (operation, request) => {
    if (!["register", "receive"].includes(operation)) throw ctError("CT_PAYLOAD_INVALID")
    const handle = continuationHandle(cwd, operation === "receive" && request !== undefined && (typeof request !== "object" || request === null || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).length > 0))
    const ctx = createCtxFactory({ trustedMetadata, processIdentity, cwd: handle.cwd, authority: handle.authority }, stableProcess)
    try { return operation === "register" ? continuationRegister(handle, ctx, request) : continuationReceive(handle, ctx) }
    finally { handle.db.close() }
  }
}

export const assertClaimantBinding = (row, authority) => {
  if (!row || !isBase64url32(row.binding_id) || !safeEpoch(row.binding_epoch) || row.binding_epoch === 0 || !["ACTIVE", "RETIRED", "MULTIPLEXED"].includes(row.binding_status) ||
      !Number.isSafeInteger(row.effective_uid) || row.effective_uid < 0 || row.canonical_repo !== authority.anchor.context.canonical_repo || row.git_common_dir !== authority.anchor.context.git_common_dir ||
      ![row.canonical_repo, row.git_common_dir, row.worktree].every(absolutePath) || !opaque(row.branch, 255) ||
      ![row.host_process_instance, row.plugin_instance, row.root_session_id].every((value) => opaque(value)) || !isBase64url32(row.mcp_process_instance) || !opaque(row.pid_start_marker, 128) ||
      !/^sha256:[0-9a-f]{64}$/.test(row.identity_digest) || !rfc3339Milliseconds.test(row.created_at) ||
      (row.binding_status === "ACTIVE" ? row.ended_at !== null : !rfc3339Milliseconds.test(row.ended_at ?? ""))) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
  if (row.identity_digest !== requestDigest(tuple(row))) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
  return row
}
const scopeBindings = (db, ctx, authority) => db.query(`SELECT * FROM ct_claimant_binding
  WHERE effective_uid=? AND canonical_repo=? AND git_common_dir=? AND plugin_instance=? ORDER BY binding_epoch`).all(ctx.effective_uid, ctx.canonical_repo, ctx.git_common_dir, ctx.plugin_instance).map((row) => assertClaimantBinding(row, authority))
const throwStored = (response) => { if (response.error) throw ctError(response.error); return { ...response, replayed: true } }

export const continuationRegister = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    const result = db.transaction(() => {
      const lease = gateContinuation(handle)
      assertRegisterRequest(request)
      const ctx = ctxFactory()
      const pluginScopeDigest = requestDigest(scope(ctx))
      const target = tuple(ctx, request.expected_binding_epoch + 1)
      const request_digest = requestDigest(request)
      const cas_digest = requestDigest({ plugin_scope_digest: pluginScopeDigest, ctx_identity_digest: requestDigest(tuple(ctx)), target_identity_digest: requestDigest(target), expected_binding_epoch: request.expected_binding_epoch, expected_binding_state: request.expected_binding_state, mode: "ON", observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE" })
      const scopeKey = `claimant:${pluginScopeDigest}:epoch:${target.binding_epoch}`
      const committed = db.query("SELECT * FROM ct_idempotency WHERE operation='register' AND request_identity=?").all(request.request_identity)
      if (committed.length) {
        if (committed.length !== 1 || committed[0].scope_key !== scopeKey || committed[0].request_digest !== request_digest || committed[0].cas_digest !== cas_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        return throwStored(JSON.parse(committed[0].response_json))
      }
      const bindings = scopeBindings(db, ctx, authority)
      if (bindings.some(({ binding_status }) => binding_status === "MULTIPLEXED")) throw ctError("CT_SESSION_MULTIPLEXED")
      if (bindings.length === 0) {
        if (ctx.binding_epoch !== 0 || request.expected_binding_epoch !== 0 || request.expected_binding_state !== "ABSENT") throw ctError("CT_FENCE_MISMATCH")
        return insertActive(db, target, request, request_digest, cas_digest, scopeKey)
      }
      const active = bindings.filter(({ binding_status }) => binding_status === "ACTIVE")
      if (active.length !== 1) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
      const incumbent = active[0]
      if (ctx.binding_epoch !== incumbent.binding_epoch || request.expected_binding_epoch !== incumbent.binding_epoch || request.expected_binding_state !== "ACTIVE") throw ctError("CT_FENCE_MISMATCH")
      if (equalFields(incumbent, ctx, sameRootFields)) {
        if (incumbent.mcp_process_instance === ctx.mcp_process_instance || incumbent.pid_start_marker === ctx.pid_start_marker) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
        db.run("UPDATE ct_claimant_binding SET binding_status='RETIRED',ended_at=? WHERE binding_id=?", [now(), incumbent.binding_id])
        return insertActive(db, target, request, request_digest, cas_digest, scopeKey)
      }
      return insertConflict(db, incumbent, target, request, request_digest, cas_digest, scopeKey, pluginScopeDigest)
    }).immediate()
    if (result?.error) throw ctError(result.error)
    return result
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SESSION_ISOLATION_UNPROVEN", error)
  }
}
const insertBinding = (db, target, status, endedAt = null, bindingId = makeId()) => {
  const values = [bindingId, ...bindingFields.map((field) => target[field]), status, requestDigest(target), now(), endedAt]
  db.run(`INSERT INTO ct_claimant_binding(binding_id,${bindingFields.join(",")},binding_status,identity_digest,created_at,ended_at) VALUES (${values.map(() => "?").join(",")})`, values)
  return bindingId
}
const storeRegister = (db, scopeKey, request, request_digest, cas_digest, response) => db.run("INSERT INTO ct_idempotency VALUES ('register',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(response), now()])
const insertActive = (db, target, request, request_digest, cas_digest, scopeKey) => {
  const response = { binding_id: insertBinding(db, target, "ACTIVE"), binding_epoch: target.binding_epoch, binding_status: "ACTIVE", replayed: false }
  storeRegister(db, scopeKey, request, request_digest, cas_digest, response)
  return response
}
const insertConflict = (db, incumbent, target, request, request_digest, cas_digest, scopeKey, pluginScopeDigest) => {
  const detected = now(), attemptedId = makeId(), conflictId = makeId()
  db.run("UPDATE ct_claimant_binding SET binding_status='MULTIPLEXED',ended_at=? WHERE binding_id=?", [detected, incumbent.binding_id])
  insertBinding(db, target, "MULTIPLEXED", detected, attemptedId)
  const conflict = { plugin_scope_digest: pluginScopeDigest, incumbent_binding_id: incumbent.binding_id, attempted_binding_id: attemptedId, incumbent_identity_digest: incumbent.identity_digest, attempted_identity_digest: requestDigest(target), request_identity: request.request_identity, request_digest, cas_digest }
  db.run(`INSERT INTO ct_claimant_conflict(conflict_id,${Object.keys(conflict).join(",")},conflict_digest,detected_at) VALUES (${Array(Object.keys(conflict).length + 3).fill("?").join(",")})`, [conflictId, ...Object.values(conflict), requestDigest(conflict), detected])
  storeRegister(db, scopeKey, request, request_digest, cas_digest, { error: "CT_SESSION_MULTIPLEXED" })
  return { error: "CT_SESSION_MULTIPLEXED" }
}

export const continuationReceive = (handle, ctxFactory) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      gateContinuation(handle)
      if (handle.payloadInvalid) throw ctError("CT_PAYLOAD_INVALID")
      const ctx = ctxFactory(), pluginScopeDigest = requestDigest(scope(ctx))
      if (db.query("SELECT 1 FROM ct_claimant_conflict WHERE plugin_scope_digest=? LIMIT 1").get(pluginScopeDigest)) throw ctError("CT_SESSION_MULTIPLEXED")
      const bindings = scopeBindings(db, ctx, authority)
      if (bindings.some(({ binding_status }) => binding_status === "MULTIPLEXED")) throw ctError("CT_SESSION_MULTIPLEXED")
      const active = bindings.filter(({ binding_status }) => binding_status === "ACTIVE")
      if (active.length !== 1) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
      if (active[0].binding_epoch !== ctx.binding_epoch) throw ctError("CT_FENCE_MISMATCH")
      if (!equalFields(active[0], ctx, bindingFields)) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
      return { delivery: null }
    })()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SESSION_ISOLATION_UNPROVEN", error)
  }
}

/** Repo-scoped paths and this session's identity, derived from a directory. */
export const locate = (cwd) => {
  const commonDir = git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"])
  const worktree = git(cwd, ["rev-parse", "--show-toplevel"])
  let branch = ""
  try {
    branch = git(cwd, ["branch", "--show-current"])
  } catch {
    // detached HEAD is not our problem here
  }
  return {
    root: join(commonDir, "control-tower"),
    // Identity is the worktree PATH, never the branch: jornada scripts recycle
    // a worktree across branches, so the branch is not stable between sessions.
    name: basename(worktree),
    worktree,
    branch,
  }
}

export const isActive = ({ place }) => existsSync(join(place.root, "ACTIVE"))

export const assertActive = (handle) => {
  if (!isActive(handle)) throw new Error(INACTIVE_ERROR)
}

// Guarded operations and `torre off` serialize through the same SQLite writer
// lock. The second check runs after BEGIN IMMEDIATE, so removing ACTIVE can
// never race between a stale check and the operation's commit.
const activeWrite = ({ db, place }, operation) => {
  assertActive({ place })
  return db.transaction(() => {
    assertActive({ place })
    return operation()
  }).immediate()
}

export const open = (cwd) => {
  const place = locate(cwd)
  const dbPath = join(place.root, "tower.db")

  // A guarded call against a fresh, disarmed repository must not initialize
  // tower state merely so it can be rejected. Read-only/recovery operations
  // understand this empty handle and remain available while off.
  if (!existsSync(dbPath) && !isActive({ place })) return { db: null, place }

  mkdirSync(place.root, { recursive: true })

  const db = new Database(dbPath)
  // WAL lets the orchestrator read while an agent writes, instead of one
  // blocking the other; busy_timeout makes concurrent writers wait their turn
  // rather than failing outright.
  db.run("PRAGMA journal_mode = WAL")
  db.run("PRAGMA busy_timeout = 5000")
  db.run(`
    CREATE TABLE IF NOT EXISTS agent (
      name       TEXT PRIMARY KEY,
      role       TEXT NOT NULL,
      worktree   TEXT NOT NULL,
      branch     TEXT,
      state      TEXT NOT NULL,
      task       TEXT,
      note       TEXT,
      pr_url     TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS message (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient   TEXT NOT NULL,
      sender      TEXT NOT NULL,
      text        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      consumed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS message_pending
      ON message (recipient, id) WHERE consumed_at IS NULL;
    CREATE TABLE IF NOT EXISTS lock (
      name        TEXT PRIMARY KEY,
      holder      TEXT,
      acquired_at TEXT
    );
  `)
  return { db, place }
}

export const register = ({ db, place }, role) => {
  activeWrite({ db, place }, () => {
    db.run(
      `INSERT INTO agent (name, role, worktree, branch, state, updated_at)
       VALUES (?, ?, ?, ?, 'PLANNED', ?)
       ON CONFLICT(name) DO UPDATE SET
         role = excluded.role,
         worktree = excluded.worktree,
         branch = excluded.branch,
         updated_at = excluded.updated_at`,
      [place.name, role, place.worktree, place.branch, now()],
    )
  })
  return status({ db, place })
}

export const setState = ({ db, place }, { state, task, note, prUrl }) => {
  assertActive({ place })
  if (!STATES.includes(state)) {
    throw new Error(`unknown state "${state}" — one of: ${STATES.join(", ")}`)
  }
  const changed = activeWrite({ db, place }, () =>
    db.run(
      `UPDATE agent SET
         state = ?,
         task = COALESCE(?, task),
         note = COALESCE(?, note),
         pr_url = COALESCE(?, pr_url),
         updated_at = ?
       WHERE name = ?`,
      [state, task ?? null, note ?? null, prUrl ?? null, now(), place.name],
    ),
  )
  if (changed.changes === 0) throw new Error(`"${place.name}" is not registered — call tower_register first`)
  trace(
    place.root,
    place.name,
    `→ ${state}${note ? ` · ${note}` : ""}`,
    NEEDS_HUMAN.includes(state) ? "TE NECESITA: " : "",
  )
  return status({ db, place })
}

export const send = ({ db, place }, { to, text }) => {
  activeWrite({ db, place }, () => {
    const known = db.query("SELECT 1 FROM agent WHERE name = ?").get(to)
    // Refusing unknown recipients turns a typo into an error instead of a
    // message that is queued forever and silently never read.
    if (!known) {
      trace(place.root, place.name, `no existe el destinatario "${to}"`, "TE NECESITA: ")
      throw new Error(`no agent named "${to}" is registered`)
    }
    db.run(
      "INSERT INTO message (recipient, sender, text, created_at) VALUES (?, ?, ?, ?)",
      [to, place.name, text, now()],
    )
  })
  trace(place.root, place.name, `→ ${to}: ${text.split("\n")[0].slice(0, 90)}`)
  return { queued_for: to }
}

/** Atomically claim the oldest unread message. Returns null when the inbox is empty. */
export const receive = ({ db, place }) => {
  return activeWrite({ db, place }, () => {
    const next = db
      .query(
        `SELECT id, sender, text, created_at FROM message
         WHERE recipient = ? AND consumed_at IS NULL
         ORDER BY id LIMIT 1`,
      )
      .get(place.name)
    if (!next) return null
    db.run("UPDATE message SET consumed_at = ? WHERE id = ?", [now(), next.id])
    return next
  })
}

/**
 * Take a named lock. The whole check-and-take is one transaction — this is the
 * entire reason the store is SQLite. Returns {granted, holder}.
 */
export const acquire = ({ db, place }, name) => {
  assertActive({ place })
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  const result = activeWrite({ db, place }, () => {
    // An unregistered session has no row in `agent`, so it never appears in
    // tower_status. Letting it hold a lock would name a holder nobody can see,
    // leaving `torre unlock` as the only way out. Observers read; they do not hold.
    const registered = db.query("SELECT 1 FROM agent WHERE name = ?").get(place.name)
    if (!registered) throw new Error(`"${place.name}" is not registered — call tower_register first`)
    const row = db.query("SELECT holder FROM lock WHERE name = ?").get(name)
    if (row?.holder && row.holder !== place.name) return { granted: false, holder: row.holder }
    db.run(
      `INSERT INTO lock (name, holder, acquired_at) VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET holder = excluded.holder, acquired_at = excluded.acquired_at`,
      [name, place.name, now()],
    )
    return { granted: true, holder: place.name }
  })
  trace(
    place.root,
    place.name,
    result.granted ? `tomó el lock ${name}` : `esperando ${name}, lo tiene ${result.holder}`,
  )
  return result
}

export const release = ({ db, place }, name) => {
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  if (!db) return { released: false, reason: "nobody holds it" }
  const give = db.transaction(() => {
    const row = db.query("SELECT holder FROM lock WHERE name = ?").get(name)
    // Only the holder may release, so a confused agent cannot hand another
    // agent's token to someone else.
    if (!row?.holder) return { released: false, reason: "nobody holds it" }
    if (row.holder !== place.name) return { released: false, reason: `held by ${row.holder}` }
    db.run("UPDATE lock SET holder = NULL, acquired_at = NULL WHERE name = ?", [name])
    return { released: true }
  })
  const result = give.immediate()
  if (result.released) trace(place.root, place.name, `soltó el lock ${name}`)
  else trace(place.root, place.name, `no pudo soltar ${name}: ${result.reason}`, "TE NECESITA: ")
  return result
}

/**
 * Hand a lock to another agent without ever letting go of it.
 *
 * The Tower reserves delivery, fixes the order, and passes the token to the unit
 * whose turn it is. Releasing so that agent can acquire would leave the lock free
 * for the moment in between — an open window in the one operation this whole
 * store exists to serialize. Transferring closes it.
 *
 * It also keeps `holder` naming whoever is actually delivering, so `tower_status`
 * and `torre unlock` point at the session that would need rescuing, instead of at
 * the orchestrator that merely granted the turn.
 *
 * Only the holder may transfer, exactly as with release.
 */
export const transfer = ({ db, place }, name, to) => {
  assertActive({ place })
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  if (to === place.name) throw new Error(`"${to}" already holds ${name}`)
  const result = activeWrite({ db, place }, () => {
    // An unregistered target would strand the token on a name no session can
    // release, leaving `torre unlock` as the only way out. Refuse the typo.
    if (!db.query("SELECT 1 FROM agent WHERE name = ?").get(to)) {
      return { transferred: false, reason: `"${to}" is not registered` }
    }
    const row = db.query("SELECT holder FROM lock WHERE name = ?").get(name)
    if (!row?.holder) return { transferred: false, reason: "nobody holds it" }
    if (row.holder !== place.name) return { transferred: false, reason: `held by ${row.holder}` }
    db.run("UPDATE lock SET holder = ?, acquired_at = ? WHERE name = ?", [to, now(), name])
    return { transferred: true, holder: to }
  })
  if (result.transferred) trace(place.root, place.name, `pasó el lock ${name} a ${to}`)
  else trace(place.root, place.name, `no pudo pasar ${name} a ${to}: ${result.reason}`, "TE NECESITA: ")
  return result
}

/**
 * Human override: drop a lock regardless of who holds it.
 *
 * Deliberately NOT exposed as an MCP tool. Agents must never be able to take a
 * token from each other — that is the whole guarantee. But a session that dies
 * holding one would otherwise block delivery forever, with `torre reset` (which
 * destroys state, queue and locks) as the only escape. This is the small door,
 * and only a person standing at a terminal can open it.
 */
export const forceRelease = ({ db, place }, name) => {
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  if (!db) return { released: false, reason: "nobody holds it" }
  const row = db.query("SELECT holder, acquired_at FROM lock WHERE name = ?").get(name)
  if (!row?.holder) return { released: false, reason: "nobody holds it" }
  db.run("UPDATE lock SET holder = NULL, acquired_at = NULL WHERE name = ?", [name])
  trace(place.root, "humano", `liberó ${name} a la fuerza (lo tenía ${row.holder})`, "TE NECESITA: ")
  return { released: true, was: row.holder, since: row.acquired_at }
}

/**
 * Remove ACTIVE only after every guarded writer that started first has
 * committed. New guarded writers either see ACTIVE missing before they begin or
 * recheck it after acquiring the writer lock and abort.
 */
export const deactivate = ({ db, place }) => {
  const activePath = join(place.root, "ACTIVE")
  if (!db) {
    rmSync(activePath, { force: true })
    return { active: false }
  }

  const stop = db.transaction(() => {
    rmSync(activePath, { force: true })
    return { active: false }
  })
  const deadline = Date.now() + 5000
  let waitingLogged = false

  // Disable SQLite's own opaque wait so we can bound it explicitly and leave
  // ACTIVE intact if an in-flight operation never finishes.
  db.run("PRAGMA busy_timeout = 0")
  try {
    while (true) {
      try {
        return stop.immediate()
      } catch (error) {
        const busy = error?.code === "SQLITE_BUSY" || error?.message?.includes("database is locked")
        if (!busy) throw error
        if (!waitingLogged) {
          waitingLogged = true
          trace(place.root, "humano", "torre off waiting for an in-flight guarded operation")
        }
        if (Date.now() >= deadline) {
          throw new Error("torre off timed out waiting for an in-flight guarded operation")
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)
      }
    }
  } finally {
    db.run("PRAGMA busy_timeout = 5000")
  }
}

/**
 * The whole truth in one call. The orchestrator is meant to read this instead
 * of remembering — that is what keeps its context flat across a long session
 * and makes compaction harmless.
 */
export const status = ({ db, place }) => ({
  active: isActive({ place }),
  you: place.name,
  agents: db
    ? db
        .query(
          `SELECT a.name, a.role, a.branch, a.state, a.task, a.note, a.pr_url,
                  (SELECT COUNT(*) FROM message m
                   WHERE m.recipient = a.name AND m.consumed_at IS NULL) AS pending
           FROM agent a ORDER BY a.role DESC, a.name`,
        )
        .all()
    : [],
  locks: db
    ? db.query("SELECT name, holder, acquired_at FROM lock WHERE holder IS NOT NULL").all()
    : [],
})
