import { afterEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { execFileSync } from "node:child_process"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import * as tower from "../core.mjs"
import { createMcpHandler } from "../mcp.mjs"

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
const mainRequest = (anchor, epoch = 0, request_identity = randomUUID()) => ({
  request_identity, expected_anchor_id: anchor.anchor_id, expected_binding_epoch: epoch,
})
const activationRequest = (epoch = 1, evidence_digest = digest("activation-evidence"), request_identity = randomUUID()) => ({
  request_identity, expected_mode: "OFF", expected_binding_epoch: epoch, evidence_digest,
})
const mcpResult = (response) => {
  if (response.isError) throw new Error(response.content[0].text)
  return JSON.parse(response.content[0].text)
}

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
  if (schema >= 2) tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version: 1, target_schema_version: 2, expected_mode: "OFF" }, main)
  if (schema >= 3) tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version: 2, target_schema_version: 3, expected_mode: "OFF" }, main)
  if (mode !== "OFF") {
    const writable = new Database(dbPath)
    writable.run("UPDATE ct_continuation_state SET mode=?", [mode])
    writable.close()
  }
  return { root, main, context, anchor, dbPath }
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


describe("P3-B activation, status, and capability-gated MCP", () => {
  test("CT-R10-S6 and CT-R3-S5 persist selector-bound activation and exact status", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const metadata = capability()
    const processIdentity = opaqueProcess()
    const dispatch = dispatcher(fixture.main, metadata, processIdentity)
    const main = dispatch("bootstrapMain", mainRequest(fixture.anchor))
    metadata.binding_epoch = main.binding_epoch
    const request = activationRequest(main.binding_epoch)

    const activated = dispatch("activate", request)
    expect(activated).toEqual({ mode: "ON", activation_epoch: 1, replayed: false })
    expect(dispatch("activate", request)).toEqual({ ...activated, replayed: true })
    expect(dispatch("status")).toEqual({
      mode: "ON", schema_version: 3, rollback_epoch: 0, lease_status: "NONE", main_binding_status: "ACTIVE",
      live_counts: { claims: 0, deliveries: 0, workers: 0 }, pending_counts: { work: 0, attestation: 0 },
    })

    const db = new Database(fixture.dbPath, { readonly: true })
    const mainRow = db.query("SELECT * FROM ct_main_binding WHERE binding_status='ACTIVE'").get()
    const activation = db.query("SELECT * FROM ct_activation").get()
    const committed = db.query("SELECT * FROM ct_idempotency WHERE operation='activate'").get()
    db.close()
    const transition = {
      kind: "activation_transition_v1", version: 1, anchor_id: fixture.anchor.anchor_id,
      config_digest: digest(canonical(fixture.context)), expected_mode: "OFF", expected_binding_epoch: 1,
      main_binding_id: main.main_binding_id, main_identity_digest: mainRow.identity_digest,
      evidence_digest: request.evidence_digest, observed_rollback_epoch: 0, observed_lease_version: 0,
    }
    const precondition = {
      kind: "activation_precondition_v1", version: 1, schema_version: 3, mode: "OFF",
      anchor_id: fixture.anchor.anchor_id, config_digest: digest(canonical(fixture.context)),
      rollback_epoch: 0, lease_version: 0, lease_status: "NONE", main_binding_id: main.main_binding_id,
      main_binding_epoch: 1, main_identity_digest: mainRow.identity_digest, prior_activation_epoch: 0,
      active_claimant_bindings: 0, multiplexed_claimant_bindings: 0, claimant_conflicts: 0,
      delivery_plane: "ABSENT_SCHEMA_3", polling_plane: "UNAVAILABLE_BEFORE_P7",
    }
    const preconditionDigest = digest(canonical(precondition))
    const transitionDigest = digest(canonical(transition))
    const requestDigest = digest(canonical(request))
    const casDigest = digest(canonical({
      transition_digest: transitionDigest, expected_mode: "OFF", expected_binding_epoch: 1,
      main_binding_id: main.main_binding_id, main_identity_digest: mainRow.identity_digest,
      evidence_digest: request.evidence_digest, observed_rollback_epoch: 0, observed_lease_version: 0,
      observed_lease_status: "NONE", prior_activation_epoch: 0, target_activation_epoch: 1, precondition_digest: preconditionDigest,
    }))
    expect(committed).toMatchObject({
      scope_key: `activation:${transitionDigest}`, request_identity: request.request_identity,
      request_digest: requestDigest, cas_digest: casDigest, response_json: canonical(activated),
    })
    expect(activation).toMatchObject({
      activation_epoch: 1, main_binding_id: main.main_binding_id, main_binding_epoch: 1,
      evidence_digest: request.evidence_digest, precondition_digest: preconditionDigest,
      request_identity: request.request_identity, request_digest: requestDigest, cas_digest: casDigest,
    })
    expect(activation.activation_digest).toBe(digest(canonical({
      kind: "activation_v1", version: 1, activation_epoch: 1, main_binding_id: main.main_binding_id,
      main_binding_epoch: 1, evidence_digest: request.evidence_digest, precondition_digest: preconditionDigest,
      request_identity: request.request_identity, request_digest: requestDigest, cas_digest: casDigest,
      activated_at: activation.activated_at,
    })))
    expect(legacyMessage(fixture.dbPath)).toEqual({ consumed_at: null })
  })

  test("CT-R3-S2 total ON classification covers replay, identity/scope conflicts, and unrelated fences", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const metadata = capability()
    const dispatch = dispatcher(fixture.main, metadata)
    const main = dispatch("bootstrapMain", mainRequest(fixture.anchor))
    metadata.binding_epoch = main.binding_epoch
    const first = activationRequest()
    dispatch("activate", first)

    expect(errorCode(() => dispatch("activate", { ...first, request_identity: randomUUID() }))).toBe("CT_IDEMPOTENCY_CONFLICT")
    expect(errorCode(() => dispatch("activate", { ...first, evidence_digest: digest("changed") }))).toBe("CT_IDEMPOTENCY_CONFLICT")
    expect(errorCode(() => dispatch("activate", activationRequest(1, digest("unrelated"))))).toBe("CT_FENCE_MISMATCH")

    const db = new Database(fixture.dbPath)
    db.run("UPDATE ct_continuation_state SET mode='OFF'")
    db.close()
    const second = activationRequest(1, digest("second-transition"))
    expect(dispatch("activate", second)).toEqual({ mode: "ON", activation_epoch: 2, replayed: false })
    expect(errorCode(() => dispatch("activate", { ...first, request_identity: randomUUID() }))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const immutable = new Database(fixture.dbPath)
    expect(() => immutable.run("UPDATE ct_activation SET activated_at=activated_at")).toThrow("CT_IMMUTABLE_ACTIVATION")
    expect(() => immutable.run("DELETE FROM ct_activation")).toThrow("CT_IMMUTABLE_ACTIVATION")
    immutable.close()
  })

  test("status maps malformed Git after valid omitted or empty payload", () => {
    const invalid = dispatcher("/definitely/missing", capability())
    expect(errorCode(() => invalid("status"))).toBe("CT_ANCHOR_MISMATCH")
    expect(errorCode(() => invalid("status", {}))).toBe("CT_ANCHOR_MISMATCH")
  })

  test("P3 status is read-only with payload, drift, cross-row, and mode/lease precedence", () => {
    const invalid = dispatcher("/definitely/missing", capability())
    for (const payload of [null, [], { extra: true }, Object.create(null)]) {
      expect(errorCode(() => invalid("status", payload))).toBe("CT_PAYLOAD_INVALID")
    }
    const clean = createFixture({ mode: "OFF", schema: 3 })
    expect(dispatcher(clean.main, capability())("status", {})).toEqual({
      mode: "OFF", schema_version: 3, rollback_epoch: 0, lease_status: "NONE", main_binding_status: "ABSENT",
      live_counts: { claims: 0, deliveries: 0, workers: 0 }, pending_counts: { work: 0, attestation: 0 },
    })

    const malformed = createFixture({ mode: "ROLLING_BACK", schema: 3 })
    const malformedDispatch = dispatcher(malformed.main, capability())
    expect(errorCode(() => malformedDispatch("status"))).toBe("CT_SCHEMA_INVALID")

    const conflict = createFixture({ mode: "OFF", schema: 3 })
    const conflictDispatch = dispatcher(conflict.main, capability())
    conflictDispatch("bootstrapMain", mainRequest(conflict.anchor))
    const conflictDb = new Database(conflict.dbPath)
    conflictDb.run("UPDATE ct_main_binding SET binding_status='RETIRED',ended_at='2026-07-22T00:00:00.000Z'")
    conflictDb.close()
    expect(errorCode(() => conflictDispatch("status"))).toBe("CT_MAIN_BINDING_CONFLICT")

    const drift = createFixture({ mode: "OFF", schema: 3 })
    const driftDb = new Database(drift.dbPath)
    driftDb.run("UPDATE ct_continuation_state SET config_digest=?", [digest("drift")])
    driftDb.close()
    expect(errorCode(() => dispatcher(drift.main, capability())("status"))).toBe("CT_ANCHOR_MISMATCH")

    const selector = createFixture({ mode: "OFF", schema: 3 })
    const selectorMetadata = capability()
    const selectorDispatch = dispatcher(selector.main, selectorMetadata)
    selectorDispatch("bootstrapMain", mainRequest(selector.anchor))
    selectorMetadata.binding_epoch = 1
    selectorDispatch("activate", activationRequest())
    const selectorDb = new Database(selector.dbPath)
    selectorDb.run("UPDATE ct_idempotency SET scope_key=? WHERE operation='activate'", [`activation:${digest("selector-drift")}`])
    selectorDb.close()
    expect(errorCode(() => selectorDispatch("status"))).toBe("CT_SCHEMA_INVALID")
  })

  test("activation rejects malformed evidence, wrong Main fences, and non-quiescent claimant state", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const metadata = capability()
    const processIdentity = opaqueProcess()
    const dispatch = dispatcher(fixture.main, metadata, processIdentity)
    dispatch("bootstrapMain", mainRequest(fixture.anchor))
    metadata.binding_epoch = 1
    expect(errorCode(() => dispatch("activate", { ...activationRequest(), evidence_digest: undefined }))).toBe("CT_ACTIVATION_EVIDENCE_REQUIRED")
    expect(errorCode(() => dispatch("activate", { ...activationRequest(), actor: "main" }))).toBe("CT_PAYLOAD_INVALID")
    metadata.binding_epoch = 0
    expect(errorCode(() => dispatch("activate", activationRequest()))).toBe("CT_FENCE_MISMATCH")
    metadata.binding_epoch = 1
    dispatch("activate", activationRequest())
    const claimant = dispatcher(fixture.main, capability({ plugin_instance: "worker-plugin", root_session_id: "worker-root" }))
    claimant("register", registerRequest())
    const db = new Database(fixture.dbPath)
    db.run("UPDATE ct_continuation_state SET mode='OFF'")
    db.close()
    expect(errorCode(() => dispatch("activate", activationRequest(1, digest("next"))))).toBe("CT_NOT_QUIESCENT")
    expect(dispatch("status").live_counts.workers).toBe(1)
  })

  test("retained non-live claimant conflict history is bound into activation without blocking it", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const metadata = capability()
    const dispatch = dispatcher(fixture.main, metadata)
    const main = dispatch("bootstrapMain", mainRequest(fixture.anchor))
    metadata.binding_epoch = main.binding_epoch
    const db = new Database(fixture.dbPath)
    db.run("UPDATE ct_continuation_state SET mode='ON'")
    db.close()

    const incumbentMetadata = capability({ plugin_instance: "worker-plugin", root_session_id: "worker-a" })
    const incumbent = dispatcher(fixture.main, incumbentMetadata)
    incumbent("register", registerRequest())
    incumbentMetadata.binding_epoch = 1
    const attempted = dispatcher(fixture.main, capability({ plugin_instance: "worker-plugin", root_session_id: "worker-b", binding_epoch: 1 }))
    expect(errorCode(() => attempted("register", registerRequest(1, "ACTIVE")))).toBe("CT_SESSION_MULTIPLEXED")

    const off = new Database(fixture.dbPath)
    off.run("UPDATE ct_continuation_state SET mode='OFF'")
    off.close()
    expect(dispatch("activate", activationRequest())).toEqual({ mode: "ON", activation_epoch: 1, replayed: false })

    const retained = new Database(fixture.dbPath, { readonly: true })
    expect(retained.query("SELECT binding_status FROM ct_claimant_binding ORDER BY binding_epoch").all()).toEqual([
      { binding_status: "MULTIPLEXED" }, { binding_status: "MULTIPLEXED" },
    ])
    expect(retained.query("SELECT COUNT(*) AS count FROM ct_claimant_conflict").get().count).toBe(1)
    expect(retained.query("SELECT COUNT(*) AS count FROM ct_claimant_binding WHERE binding_status='ACTIVE'").get().count).toBe(0)
    const mainRow = retained.query("SELECT identity_digest FROM ct_main_binding WHERE binding_status='ACTIVE'").get()
    const activation = retained.query("SELECT precondition_digest FROM ct_activation WHERE activation_epoch=1").get()
    expect(activation.precondition_digest).toBe(digest(canonical({
      kind: "activation_precondition_v1", version: 1, schema_version: 3, mode: "OFF",
      anchor_id: fixture.anchor.anchor_id, config_digest: digest(canonical(fixture.context)),
      rollback_epoch: 0, lease_version: 0, lease_status: "NONE",
      main_binding_id: main.main_binding_id, main_binding_epoch: main.binding_epoch,
      main_identity_digest: mainRow.identity_digest, prior_activation_epoch: 0,
      active_claimant_bindings: 0, multiplexed_claimant_bindings: 2, claimant_conflicts: 1,
      delivery_plane: "ABSENT_SCHEMA_3", polling_plane: "UNAVAILABLE_BEFORE_P7",
    })))
    retained.close()
  })

  test("status reads a coherent ROLLING_BACK lease without exposing authority data", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const metadata = capability()
    const dispatch = dispatcher(fixture.main, metadata)
    const main = dispatch("bootstrapMain", mainRequest(fixture.anchor))
    metadata.binding_epoch = main.binding_epoch
    dispatch("activate", activationRequest())
    const db = new Database(fixture.dbPath)
    db.run("UPDATE ct_continuation_state SET mode='ROLLING_BACK'")
    db.run("UPDATE ct_rollback_lease SET rollback_epoch=1,lease_status='ACTIVE',lease_version=1,owner_main_binding_id=?,lease_expires_at='2026-07-22T00:00:00.000Z'", [main.main_binding_id])
    db.close()
    expect(dispatch("status")).toEqual({
      mode: "ROLLING_BACK", schema_version: 3, rollback_epoch: 1, lease_status: "ACTIVE", main_binding_status: "ACTIVE",
      live_counts: { claims: 0, deliveries: 0, workers: 0 }, pending_counts: { work: 0, attestation: 0 },
    })
  })

  test("MCP preserves omitted and empty status arguments but rejects explicit null", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const metadata = capability()
    const processIdentity = opaqueProcess()
    const enabled = createMcpHandler({ cwd: fixture.main, trustedMetadata: { snapshot: () => metadata }, processIdentity: { snapshot: () => processIdentity } })
    expect(mcpResult(enabled({ id: 1, method: "tools/call", params: { name: "status" } })).mode).toBe("OFF")
    expect(mcpResult(enabled({ id: 2, method: "tools/call", params: { name: "status", arguments: {} } })).mode).toBe("OFF")
    const explicitNull = enabled({ id: 3, method: "tools/call", params: { name: "status", arguments: null } })
    expect(explicitNull.isError).toBe(true)
    expect(explicitNull.content[0].text).toBe("ERROR: CT_PAYLOAD_INVALID")
  })

  test("capability gate exposes exactly five P3 routes while preserving legacy and future-route fences", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const metadata = capability()
    const processIdentity = opaqueProcess()
    const enabled = createMcpHandler({ cwd: fixture.main, trustedMetadata: { snapshot: () => metadata }, processIdentity: { snapshot: () => processIdentity } })
    const disabled = createMcpHandler({ cwd: fixture.main })
    const list = (handler) => handler({ id: 1, method: "tools/list", params: {} }).tools.map(({ name }) => name)
    expect(list(disabled)).toEqual([
      "tower_register", "tower_status", "tower_send", "tower_set_state",
      "tower_acquire", "tower_release", "tower_transfer", "tower_receive",
    ])
    expect(list(enabled)).toEqual([
      ...list(disabled), "bootstrapMain", "activate", "status", "register", "receive",
    ])
    for (const name of ["start", "create", "complete", "beginRollback", "rebindMain", "finishRollback"]) {
      expect(enabled({ id: 2, method: "tools/call", params: { name, arguments: {} } }).isError).toBe(true)
    }
    const bootstrap = mcpResult(enabled({ id: 3, method: "tools/call", params: { name: "bootstrapMain", arguments: mainRequest(fixture.anchor) } }))
    metadata.binding_epoch = bootstrap.binding_epoch
    expect(mcpResult(enabled({ id: 4, method: "tools/call", params: { name: "status", arguments: {} } })).mode).toBe("OFF")
    expect(mcpResult(enabled({ id: 5, method: "tools/call", params: { name: "activate", arguments: activationRequest() } }))).toEqual({ mode: "ON", activation_epoch: 1, replayed: false })
    expect(mcpResult(enabled({ id: 6, method: "tools/call", params: { name: "status", arguments: {} } })).mode).toBe("ON")
  })
})


// P3-A covers Migration 003 and persisted Main bootstrap; P3-B tests above
// own activation, status, and capability-gated exposure.
describe("P3-A persisted canonical Main bootstrap", () => {
  test("CT-R8-S5 and CT-R10-S1/S5 persist exact first-Main null/0 CAS without activation", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const metadata = capability()
    const processIdentity = opaqueProcess()
    const dispatch = dispatcher(fixture.main, metadata, processIdentity)
    const request = mainRequest(fixture.anchor)

    const result = dispatch("bootstrapMain", request)

    expect(result).toMatchObject({ binding_epoch: 1, state: "ACTIVE", replayed: false })
    expect(result.main_binding_id).toHaveLength(43)
    const identity = {
      host_process_instance: metadata.host_process_instance,
      plugin_instance: metadata.plugin_instance,
      root_session_id: metadata.root_session_id,
      mcp_process_instance: processIdentity.mcp_process_instance,
      pid_start_marker: processIdentity.pid_start_marker,
      binding_epoch: 1,
      main_session_id: metadata.root_session_id,
    }
    const mainBinding = {
      kind: "main_binding_v1", version: 1,
      anchor_id: fixture.anchor.anchor_id, anchor_epoch: 1,
      config_digest: digest(canonical(fixture.context)),
      authority_context: fixture.context,
      identity,
    }
    const targetIdentityDigest = digest(canonical(mainBinding))
    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT anchor_id,anchor_epoch,config_digest,host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,binding_epoch,main_session_id,binding_status,identity_digest,ended_at FROM ct_main_binding").get()).toEqual({
      anchor_id: fixture.anchor.anchor_id, anchor_epoch: 1, config_digest: digest(canonical(fixture.context)),
      ...identity, binding_status: "ACTIVE", identity_digest: targetIdentityDigest, ended_at: null,
    })
    expect(db.query("SELECT * FROM ct_activation").all()).toEqual([])
    expect(db.query("SELECT * FROM ct_claimant_binding").all()).toEqual([])
    const committed = db.query("SELECT scope_key,request_digest,cas_digest,response_json FROM ct_idempotency WHERE operation='bootstrapMain'").get()
    db.close()
    expect(committed).toEqual({
      scope_key: `main:${fixture.anchor.anchor_id}:epoch:1`,
      request_digest: digest(canonical(request)),
      cas_digest: digest(canonical({
        expected_anchor_id: fixture.anchor.anchor_id, expected_binding_epoch: 0, target_binding_epoch: 1,
        target_identity_digest: targetIdentityDigest, schema_version: 3, mode: "OFF",
        observed_rollback_epoch: 0, observed_lease_version: 0, observed_lease_status: "NONE",
        observed_active_main_binding_id: null, observed_active_main_binding_epoch: 0,
      })),
      response_json: canonical(result),
    })
    expect(legacyMessage(fixture.dbPath)).toEqual({ consumed_at: null })
    expect(dispatch("bootstrapMain", request)).toEqual({ ...result, replayed: true })
    metadata.binding_epoch = 1
    expect(dispatch("bootstrapMain", request)).toEqual({ ...result, replayed: true })
  })

  test("CT-R10-S1/S3 rotate same-root Main and fence stale or conflicting identities", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const firstMetadata = capability()
    const firstProcess = opaqueProcess()
    const first = dispatcher(fixture.main, firstMetadata, firstProcess)
    const initialRequest = mainRequest(fixture.anchor)
    const initial = first("bootstrapMain", initialRequest)
    firstMetadata.binding_epoch = 1

    expect(errorCode(() => dispatcher(fixture.main, capability({ binding_epoch: 1 }), firstProcess)("bootstrapMain", mainRequest(fixture.anchor, 1)))).toBe("CT_MAIN_BINDING_CONFLICT")
    expect(errorCode(() => dispatcher(fixture.main, capability({ binding_epoch: 1, root_session_id: "other-root" }))("bootstrapMain", mainRequest(fixture.anchor, 1)))).toBe("CT_MAIN_BINDING_CONFLICT")
    expect(errorCode(() => dispatcher(fixture.main, capability({ binding_epoch: 0 }))("bootstrapMain", mainRequest(fixture.anchor, 0)))).toBe("CT_IDEMPOTENCY_CONFLICT")
    expect(errorCode(() => dispatcher(fixture.main, capability({ binding_epoch: 0 }))("bootstrapMain", mainRequest(fixture.anchor, 2)))).toBe("CT_FENCE_MISMATCH")
    expect(errorCode(() => first("bootstrapMain", { ...initialRequest, expected_anchor_id: "changed" }))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const secondMetadata = capability({ binding_epoch: 1 })
    const second = dispatcher(fixture.main, secondMetadata)
    const rebound = second("bootstrapMain", mainRequest(fixture.anchor, 1))
    expect(rebound).toMatchObject({ binding_epoch: 2, state: "ACTIVE", replayed: false })
    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT main_binding_id,binding_epoch,binding_status,ended_at FROM ct_main_binding ORDER BY binding_epoch").all()).toEqual([
      { main_binding_id: initial.main_binding_id, binding_epoch: 1, binding_status: "RETIRED", ended_at: expect.any(String) },
      { main_binding_id: rebound.main_binding_id, binding_epoch: 2, binding_status: "ACTIVE", ended_at: null },
    ])
    expect(db.query("SELECT * FROM ct_activation").all()).toEqual([])
    db.close()
  })

  test("CT-R10-S2 enforces payload and canonical-Main authority after mode/lease precedence", () => {
    const invalid = { request_identity: "invalid" }
    for (const [state, expected] of [
      [{ mode: "ON" }, "CT_FENCE_MISMATCH"],
      [{ mode: "ROLLING_BACK" }, "CT_ROLLBACK_IN_PROGRESS"],
      [{ lease: "ACTIVE" }, "CT_ROLLBACK_LEASE_ACTIVE"],
      [{ lease: "EXPIRED" }, "CT_FENCE_MISMATCH"],
      [{}, "CT_PAYLOAD_INVALID"],
    ]) {
      const fixture = createFixture({ mode: "OFF", schema: 3 })
      const db = new Database(fixture.dbPath)
      if (state.mode) db.run("UPDATE ct_continuation_state SET mode=?", [state.mode])
      if (state.lease) db.run("UPDATE ct_rollback_lease SET lease_status=?,owner_main_binding_id=?,lease_expires_at='2026-07-22T00:00:00.000Z'", [state.lease, "x".repeat(43)])
      db.close()
      expect(errorCode(() => dispatcher(fixture.main, capability())("bootstrapMain", invalid))).toBe(expected)
    }

    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const dispatch = dispatcher(fixture.main, capability())
    for (const payload of [null, [], { ...mainRequest(fixture.anchor), ctx: {} }, { ...mainRequest(fixture.anchor), actor: "main" }]) {
      expect(errorCode(() => dispatch("bootstrapMain", payload))).toBe("CT_PAYLOAD_INVALID")
    }
    const linked = join(fixture.root, "linked")
    git(fixture.main, ["worktree", "add", "-q", "-b", "linked", linked])
    expect(errorCode(() => dispatcher(linked, capability())("bootstrapMain", mainRequest(fixture.anchor)))).toBe("CT_ADMIN_REQUIRED")
  })

  test("schema 3 preserves P2 identity semantics while P3 status rejects incoherent ON state", () => {
    const fixture = createFixture({ schema: 3 })
    const metadata = capability()
    const dispatch = dispatcher(fixture.main, metadata)
    const registered = dispatch("register", registerRequest())
    metadata.binding_epoch = registered.binding_epoch
    expect(dispatch("receive")).toEqual({ delivery: null })
    expect(errorCode(() => dispatch("activate", {}))).toBe("CT_PAYLOAD_INVALID")
    expect(errorCode(() => dispatch("status"))).toBe("CT_MAIN_BINDING_CONFLICT")
    expect(legacyMessage(fixture.dbPath)).toEqual({ consumed_at: null })
  })

  test("CT-R10-S4 classifies persisted drift before request errors and preserves all rows", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const dispatch = dispatcher(fixture.main, capability())
    dispatch("bootstrapMain", mainRequest(fixture.anchor))
    const db = new Database(fixture.dbPath)
    db.run("UPDATE ct_main_binding SET identity_digest=?", [digest("malformed-main")])
    const before = db.query("SELECT * FROM ct_main_binding").all()
    db.close()

    expect(errorCode(() => dispatch("bootstrapMain", null))).toBe("CT_SCHEMA_INVALID")
    const after = new Database(fixture.dbPath, { readonly: true })
    expect(after.query("SELECT * FROM ct_main_binding").all()).toEqual(before)
    expect(after.query("SELECT * FROM ct_activation").all()).toEqual([])
    after.close()
  })
})
