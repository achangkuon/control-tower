import { afterEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { execFileSync } from "node:child_process"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import * as tower from "../core.mjs"

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const temporaryDirectories = []
const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
const canonical = (value) => value === null || typeof value !== "object"
  ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`
const errorCode = (operation) => { try { operation() } catch (error) { return error.code } return null }
const opaqueProcess = () => ({
  mcp_process_instance: randomBytes(32).toString("base64url"),
  pid_start_marker: `pid-start-${randomBytes(8).toString("hex")}`,
})
const registerRequest = (epoch = 0, state = "ABSENT", request_identity = randomUUID()) => ({
  request_identity, expected_binding_epoch: epoch, expected_binding_state: state,
})

const createFixture = ({ mode = "ON", schema = 2 } = {}) => {
  const root = mkdtempSync(join(tmpdir(), "control-tower-identity-"))
  const main = join(root, "main")
  temporaryDirectories.push(root)
  mkdirSync(main)
  git(main, ["init", "-q", "-b", "main"])
  git(main, ["config", "user.email", "tower-test@example.invalid"])
  git(main, ["config", "user.name", "Tower Test"])
  git(main, ["commit", "-q", "--allow-empty", "-m", "initial"])
  const context = tower.deriveCanonicalMainContext(main)
  const anchor = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
  const dbPath = join(context.git_common_dir, "control-tower", "tower.db")
  const db = new Database(dbPath)
  db.run(`CREATE TABLE agent (name TEXT PRIMARY KEY, role TEXT NOT NULL, worktree TEXT NOT NULL, branch TEXT, state TEXT NOT NULL, task TEXT, note TEXT, pr_url TEXT, updated_at TEXT NOT NULL);
CREATE TABLE message (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT NOT NULL, sender TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL, consumed_at TEXT);
CREATE INDEX message_pending ON message (recipient, id) WHERE consumed_at IS NULL;
CREATE TABLE lock (name TEXT PRIMARY KEY, holder TEXT, acquired_at TEXT);`)
  db.run("INSERT INTO agent VALUES ('legacy','agent','/tmp/legacy','legacy','READY',NULL,NULL,NULL,'before')")
  db.run("INSERT INTO message(recipient,sender,text,created_at) VALUES ('legacy','sender','must remain pending','before')")
  db.close()
  tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }, main)
  if (schema === 2) tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version: 1, target_schema_version: 2, expected_mode: "OFF" }, main)
  if (mode !== "OFF") {
    const writable = new Database(dbPath)
    writable.run("UPDATE ct_continuation_state SET mode=?", [mode])
    writable.close()
  }
  return { main, dbPath }
}
const capability = (overrides = {}) => ({
  host_process_instance: "host-process-a",
  plugin_instance: "plugin-a",
  root_session_id: "root-a",
  binding_epoch: 0,
  ...overrides,
})
const dispatcher = (main, metadata, identity = opaqueProcess()) => tower.createContinuationDispatcher({
  cwd: main,
  trustedMetadata: { snapshot: () => metadata },
  processIdentity: { snapshot: () => identity },
})
const legacyMessage = (dbPath) => {
  const db = new Database(dbPath, { readonly: true })
  const message = db.query("SELECT consumed_at FROM message WHERE text='must remain pending'").get()
  db.close()
  return message
}
const rows = (dbPath) => {
  const db = new Database(dbPath, { readonly: true })
  const result = {
    bindings: db.query("SELECT binding_id,binding_epoch,binding_status,root_session_id,mcp_process_instance,pid_start_marker,ended_at FROM ct_claimant_binding ORDER BY binding_epoch").all(),
    conflicts: db.query("SELECT * FROM ct_claimant_conflict ORDER BY detected_at").all(),
    message: db.query("SELECT consumed_at FROM message WHERE text='must remain pending'").get(),
  }
  db.close()
  return result
}

afterEach(() => { for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true }) })

describe("P2 constructor-owned claimant identity", () => {
  test("CT-R4-S1 first registration creates the immutable full tuple and receive peeks", () => {
    const fixture = createFixture()
    const metadata = capability()
    const processIdentity = opaqueProcess()
    const dispatch = dispatcher(fixture.main, metadata, processIdentity)
    const request = registerRequest()

    const registered = dispatch("register", request)
    expect(dispatch("register", request)).toEqual({ ...registered, replayed: true })
    metadata.binding_epoch = registered.binding_epoch

    expect(registered).toMatchObject({ binding_epoch: 1, binding_status: "ACTIVE", replayed: false })
    expect(registered.binding_id).toHaveLength(43)
    expect(dispatch("receive")).toEqual({ delivery: null })
    const db = new Database(fixture.dbPath)
    expect(db.query("SELECT effective_uid,canonical_repo,git_common_dir,worktree,branch,host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,binding_epoch,binding_status FROM ct_claimant_binding").get()).toEqual({
      effective_uid: process.geteuid(), canonical_repo: fixture.main, git_common_dir: join(fixture.main, ".git"), worktree: fixture.main, branch: "main",
      host_process_instance: metadata.host_process_instance, plugin_instance: metadata.plugin_instance, root_session_id: metadata.root_session_id,
      mcp_process_instance: processIdentity.mcp_process_instance, pid_start_marker: processIdentity.pid_start_marker, binding_epoch: 1, binding_status: "ACTIVE",
    })
    expect(() => db.run(`INSERT INTO ct_claimant_binding
      SELECT ?,effective_uid,canonical_repo,git_common_dir,worktree,branch,host_process_instance,
             plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,binding_epoch+1,
             binding_status,?,created_at,ended_at FROM ct_claimant_binding`,
    [randomBytes(32).toString("base64url"), digest("duplicate-active")])).toThrow()
    db.close()
    expect(legacyMessage(fixture.dbPath)).toEqual({ consumed_at: null })
  })

  test("CT-R4-S2 same-root rebind increments the fence and rejects the old generation", () => {
    const fixture = createFixture()
    const firstMetadata = capability()
    const first = dispatcher(fixture.main, firstMetadata)
    const initial = first("register", registerRequest())
    firstMetadata.binding_epoch = 1
    const nextMetadata = capability({ binding_epoch: 1 })
    const nextProcess = opaqueProcess()
    const next = dispatcher(fixture.main, nextMetadata, nextProcess)

    const rebound = next("register", registerRequest(1, "ACTIVE"))
    nextMetadata.binding_epoch = 2

    expect(rebound).toMatchObject({ binding_epoch: 2, binding_status: "ACTIVE", replayed: false })
    expect(rows(fixture.dbPath).bindings.map(({ binding_epoch, binding_status }) => ({ binding_epoch, binding_status }))).toEqual([
      { binding_epoch: initial.binding_epoch, binding_status: "RETIRED" },
      { binding_epoch: rebound.binding_epoch, binding_status: "ACTIVE" },
    ])
    expect(errorCode(() => first("receive"))).toBe("CT_FENCE_MISMATCH")
    const epochOnlyStale = dispatcher(fixture.main, capability({ binding_epoch: 1 }), nextProcess)
    expect(errorCode(() => epochOnlyStale("receive"))).toBe("CT_FENCE_MISMATCH")
    expect(next("receive")).toEqual({ delivery: null })
  })

  test("CT-R4-S3 exact-CAS second root commits one immutable multiplex conflict and replays it", () => {
    const fixture = createFixture()
    const aMetadata = capability()
    const a = dispatcher(fixture.main, aMetadata)
    a("register", registerRequest())
    aMetadata.binding_epoch = 1
    const bMetadata = capability({ root_session_id: "root-b", binding_epoch: 1 })
    const b = dispatcher(fixture.main, bMetadata)
    const request = registerRequest(1, "ACTIVE")

    expect(errorCode(() => b("register", request))).toBe("CT_SESSION_MULTIPLEXED")
    const committed = rows(fixture.dbPath)
    expect(committed.bindings.map(({ binding_status }) => binding_status)).toEqual(["MULTIPLEXED", "MULTIPLEXED"])
    expect(committed.conflicts).toHaveLength(1)
    expect(errorCode(() => b("register", request))).toBe("CT_SESSION_MULTIPLEXED")
    expect(rows(fixture.dbPath)).toEqual(committed)
    expect(errorCode(() => a("receive"))).toBe("CT_SESSION_MULTIPLEXED")

    const db = new Database(fixture.dbPath)
    expect(() => db.run("UPDATE ct_claimant_conflict SET detected_at=detected_at")).toThrow("CT_IMMUTABLE_CONFLICT")
    expect(() => db.run("DELETE FROM ct_claimant_conflict")).toThrow("CT_IMMUTABLE_CONFLICT")
    db.close()
    expect(legacyMessage(fixture.dbPath)).toEqual({ consumed_at: null })
  })

  test("CT-R4-S4/S5/S6 missing identity, invalid first CAS, and stale same-root CAS are non-mutating", () => {
    const missing = createFixture()
    expect(errorCode(() => dispatcher(missing.main, capability())("receive"))).toBe("CT_SESSION_ISOLATION_UNPROVEN")
    expect(legacyMessage(missing.dbPath)).toEqual({ consumed_at: null })
    for (const request of [registerRequest(1, "ABSENT"), registerRequest(0, "ACTIVE")]) {
      const fixture = createFixture()
      const dispatch = dispatcher(fixture.main, capability())
      expect(errorCode(() => dispatch("register", request))).toBe("CT_FENCE_MISMATCH")
      expect(rows(fixture.dbPath).bindings).toEqual([])
    }
    const fixture = createFixture()
    const metadata = capability()
    const first = dispatcher(fixture.main, metadata)
    first("register", registerRequest())
    metadata.binding_epoch = 1
    const before = rows(fixture.dbPath)
    expect(errorCode(() => dispatcher(fixture.main, capability({ binding_epoch: 1 }))("register", registerRequest(0, "ACTIVE")))).toBe("CT_FENCE_MISMATCH")
    expect(errorCode(() => dispatcher(fixture.main, capability({ root_session_id: "wrong-root", binding_epoch: 1 }))("receive"))).toBe("CT_SESSION_ISOLATION_UNPROVEN")
    expect(rows(fixture.dbPath)).toEqual(before)
  })

  test("CT-R9-S1 forbids request identity authority and rejects malformed trusted roots", () => {
    const fixture = createFixture()
    for (const forbidden of ["ctx", "actor", "role", "session", "effective_uid", "canonical_repo", "git_common_dir", "worktree", "branch", "host_process_instance", "plugin_instance", "root_session_id", "mcp_process_instance", "pid_start_marker", "binding_epoch"]) {
      expect(errorCode(() => dispatcher(fixture.main, capability())("register", { ...registerRequest(), [forbidden]: "claimed" }))).toBe("CT_PAYLOAD_INVALID")
    }
    expect(rows(fixture.dbPath).bindings).toEqual([])
    expect(errorCode(() => dispatcher(fixture.main, capability({ root_session_id: "bad\0root" }))("register", registerRequest()))).toBe("CT_SESSION_ISOLATION_UNPROVEN")
    expect(rows(fixture.dbPath).bindings).toEqual([])
  })

  test("CT-R11-S1 and CT-R8-S2 gate OFF, ROLLING_BACK, lease, old schema, and consume zero legacy messages", () => {
    for (const [options, expected] of [
      [{ mode: "OFF" }, "CT_CONTINUATION_OFF"],
      [{ mode: "ROLLING_BACK" }, "CT_ROLLBACK_IN_PROGRESS"],
      [{ schema: 1 }, "CT_SCHEMA_INVALID"],
    ]) {
      const fixture = createFixture(options)
      const dispatch = dispatcher(fixture.main, capability())
      expect(errorCode(() => dispatch("register", registerRequest()))).toBe(expected)
      expect(errorCode(() => dispatch("receive"))).toBe(expected)
      expect(legacyMessage(fixture.dbPath)).toEqual({ consumed_at: null })
    }
    const fixture = createFixture()
    const db = new Database(fixture.dbPath)
    db.run("UPDATE ct_rollback_lease SET lease_status='ACTIVE',owner_main_binding_id='owner',lease_expires_at='2026-07-22T00:00:00.000Z'")
    db.close()
    const dispatch = dispatcher(fixture.main, capability())
    expect(errorCode(() => dispatch("register", registerRequest()))).toBe("CT_SCHEMA_INVALID")
    expect(errorCode(() => dispatch("receive"))).toBe("CT_SCHEMA_INVALID")
    expect(legacyMessage(fixture.dbPath)).toEqual({ consumed_at: null })
  })

  test("argument-free receive and direct continuation MCP calls fail closed before database access", async () => {
    const fixture = createFixture()
    expect(errorCode(() => dispatcher(fixture.main, capability())("receive", { ctx: {} }))).toBe("CT_PAYLOAD_INVALID")
    expect(errorCode(() => dispatcher(fixture.main, capability())("receive", []))).toBe("CT_PAYLOAD_INVALID")
    const mode = lstatSync(fixture.dbPath).mode & 0o777
    chmodSync(fixture.dbPath, 0)
    const child = Bun.spawn([process.execPath, join(packageRoot, "mcp.mjs")], { cwd: fixture.main, stdin: "pipe", stdout: "pipe", stderr: "pipe" })
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })}\n`)
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "register", arguments: registerRequest() } })}\n`)
    child.stdin.end()
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
    chmodSync(fixture.dbPath, mode)
    expect(code).toBe(0)
    expect(stderr).toBe("")
    const [listed, called] = stdout.trim().split("\n").map(JSON.parse)
    expect(listed.result.tools.map(({ name }) => name)).toEqual([
      "tower_register", "tower_status", "tower_send", "tower_set_state",
      "tower_acquire", "tower_release", "tower_transfer", "tower_receive",
    ])
    expect(called.result.isError).toBe(true)
    expect(called.result.content[0].text).toBe('ERROR: unknown tool "register"')
    expect(rows(fixture.dbPath).bindings).toEqual([])
  })
})
