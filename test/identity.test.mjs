import { afterEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { execFileSync } from "node:child_process"
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto"
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

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
const validPayload = (context, overrides = {}) => {
  const sourceMerge = { sha: "a".repeat(40), url: "https://example.invalid/merge" }
  const referenceValue = "https://example.invalid/reference"
  const nextUnit = {
    unit_id: "create-unit", scope: "create test scope",
    dependencies: [{ id: "dep-a", digest: digest("dep-a") }, { id: "dep-b", digest: digest("dep-b") }],
    references: [{ kind: "URL", value: referenceValue, digest: digest(referenceValue) }],
  }
  const snapshots = [{ name: "snapshot-a", digest: digest("snapshot-a") }]
  const sourceDigest = digest(canonical({ source_kind: "TEST", source_ref: "fixture", source_merge_sha: sourceMerge.sha, source_merge_url: sourceMerge.url }))
  return {
    kind: "control_tower_handoff_v1", version: 1,
    lineage: { lineage_id: randomUUID(), revision: 1 },
    repository: {
      repository_fingerprint: digest(canonical({ kind: "canonical_repo_v1", path: context.canonical_repo })),
      git_common_dir_fingerprint: digest(canonical({ kind: "git_common_dir_v1", path: context.git_common_dir })),
      source_merge: sourceMerge,
    },
    next_unit: nextUnit, snapshots,
    provenance: { source_kind: "TEST", source_ref: "fixture", source_digest: sourceDigest },
    decision_summary: "fixture decision",
    ...overrides,
  }
}
const createPayloadRequest = (payload, request_identity = randomUUID()) =>
  ({ request_identity, lineage_id: payload.lineage.lineage_id, revision: payload.lineage.revision, payload, payload_digest: digest(canonical(payload)) })
const setupCreateFixture = () => {
  const fixture = createFixture({ mode: "OFF", schema: 4 })
  const mainMetadata = capability(), mainDispatch = dispatcher(fixture.main, mainMetadata)
  const main = mainDispatch("bootstrapMain", mainRequest(fixture.anchor))
  mainMetadata.binding_epoch = main.binding_epoch
  mainDispatch("activate", activationRequest(main.binding_epoch))
  const workerMetadata = capability({ plugin_instance: "worker-plugin", root_session_id: "worker-root" })
  const workerDispatch = dispatcher(fixture.main, workerMetadata)
  const registered = workerDispatch("register", registerRequest())
  workerMetadata.binding_epoch = registered.binding_epoch
  return { ...fixture, mainDispatch, workerDispatch, producerBindingId: registered.binding_id }
}
// P4-A3: `validate` reads live Git/filesystem state from the canonical repo,
// so the fixture needs a real resolvable commit and a real tracked file.
const setupValidateFixture = () => {
  const fixture = setupCreateFixture()
  writeFileSync(join(fixture.main, "unit.txt"), "fixture unit contents\n")
  git(fixture.main, ["add", "unit.txt"])
  git(fixture.main, ["commit", "-q", "-m", "add fixture file"])
  const headOid = git(fixture.main, ["rev-parse", "HEAD"])
  const fileDigest = digest(readFileSync(join(fixture.main, "unit.txt")))
  return { ...fixture, headOid, fileDigest }
}
const validateReadyPayload = (fixture, overrides = {}) => {
  const urlValue = "https://example.invalid/reference"
  const references = [
    { kind: "COMMIT", value: fixture.headOid, digest: digest("commit-marker") },
    { kind: "FILE", value: "unit.txt", digest: fixture.fileDigest },
    { kind: "URL", value: urlValue, digest: digest(urlValue) },
  ]
  const sourceMerge = { sha: fixture.headOid, url: "https://example.invalid/merge" }
  const sourceDigest = digest(canonical({ source_kind: "TEST", source_ref: "fixture", source_merge_sha: sourceMerge.sha, source_merge_url: sourceMerge.url }))
  return validPayload(fixture.context, {
    repository: {
      repository_fingerprint: digest(canonical({ kind: "canonical_repo_v1", path: fixture.context.canonical_repo })),
      git_common_dir_fingerprint: digest(canonical({ kind: "git_common_dir_v1", path: fixture.context.git_common_dir })),
      source_merge: sourceMerge,
    },
    next_unit: { unit_id: "validate-unit", scope: "validate test scope", dependencies: [], references },
    provenance: { source_kind: "TEST", source_ref: "fixture", source_digest: sourceDigest },
    ...overrides,
  })
}
const badReferencePayload = (fixture, reference) => validPayload(fixture.context, {
  repository: {
    repository_fingerprint: digest(canonical({ kind: "canonical_repo_v1", path: fixture.context.canonical_repo })),
    git_common_dir_fingerprint: digest(canonical({ kind: "git_common_dir_v1", path: fixture.context.git_common_dir })),
    source_merge: { sha: fixture.headOid, url: "https://example.invalid/merge" },
  },
  next_unit: { unit_id: "bad-ref-unit", scope: "bad reference scope", dependencies: [], references: [reference] },
  provenance: { source_kind: "TEST", source_ref: "fixture", source_digest: digest(canonical({ source_kind: "TEST", source_ref: "fixture", source_merge_sha: fixture.headOid, source_merge_url: "https://example.invalid/merge" })) },
})
const createReadyHandoff = (fixture, overrides = {}) => {
  const payload = validateReadyPayload(fixture, overrides)
  const request = createPayloadRequest(payload)
  const created = fixture.workerDispatch("create", request)
  return { payload, request, created }
}
const validateRequest = (created, payload_digest, overrides = {}) =>
  ({ request_identity: randomUUID(), id: created.id, es: "DRAFT", eg: created.generation, payload_digest, ...overrides })
const publishRequest = (handoffId, generation, overrides = {}) =>
  ({ request_identity: randomUUID(), id: handoffId, es: "VALIDATED", eg: generation, ...overrides })
const expectPayloadInvalidAndNoMutation = (fixture, payload) => {
  const request = createPayloadRequest(payload)
  const created = fixture.workerDispatch("create", request)
  const vRequest = validateRequest(created, request.payload_digest)
  expect(errorCode(() => fixture.mainDispatch("validate", vRequest))).toBe("CT_PAYLOAD_INVALID")
  const db = new Database(fixture.dbPath, { readonly: true })
  const handoff = db.query("SELECT state,validation_digest FROM ct_handoff WHERE id=?").get(created.id)
  expect(handoff.state).toBe("DRAFT")
  expect(handoff.validation_digest).toBeNull()
  expect(db.query("SELECT COUNT(*) AS count FROM ct_idempotency WHERE operation='validate'").get().count).toBe(0)
  db.close()
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
  if (schema >= 4) tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version: 3, target_schema_version: 4, expected_mode: "OFF" }, main)
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

  test("capability gate exposes P3/P4/P5/P6-D/P6-E routes while preserving legacy and future-route fences", () => {
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
      ...list(disabled), "bootstrapMain", "activate", "status", "register", "receive", "create", "validate", "publish", "claim", "ack", "attestCompletion", "complete", "reject", "revise", "recover",
      "beginRollback", "rebindMain", "finishRollback",
    ])
    // "create"/"validate"/"publish"/"claim"/"ack"/"attestCompletion"/
    // "complete"/"reject"/"revise"/"recover"/"beginRollback"/"rebindMain"/
    // "finishRollback" are capability-gated but still require schema 4 or 5
    // (the rollback-plane trio requires schema 5 exactly); on this schema-3
    // fixture they fail CT_SCHEMA_INVALID rather than "unknown tool".
    for (const name of ["start", "beginRollback", "rebindMain", "finishRollback"]) {
      expect(enabled({ id: 2, method: "tools/call", params: { name, arguments: {} } }).isError).toBe(true)
    }
    expect(enabled({ id: 20, method: "tools/call", params: { name: "create", arguments: {} } }).isError).toBe(true)
    expect(enabled({ id: 21, method: "tools/call", params: { name: "validate", arguments: {} } }).isError).toBe(true)
    expect(enabled({ id: 22, method: "tools/call", params: { name: "publish", arguments: {} } }).isError).toBe(true)
    expect(enabled({ id: 23, method: "tools/call", params: { name: "claim", arguments: {} } }).isError).toBe(true)
    expect(enabled({ id: 24, method: "tools/call", params: { name: "ack", arguments: {} } }).isError).toBe(true)
    expect(enabled({ id: 25, method: "tools/call", params: { name: "attestCompletion", arguments: {} } }).isError).toBe(true)
    expect(enabled({ id: 26, method: "tools/call", params: { name: "complete", arguments: {} } }).isError).toBe(true)
    expect(enabled({ id: 27, method: "tools/call", params: { name: "reject", arguments: {} } }).isError).toBe(true)
    expect(enabled({ id: 28, method: "tools/call", params: { name: "revise", arguments: {} } }).isError).toBe(true)
      expect(enabled({ id: 29, method: "tools/call", params: { name: "recover", arguments: {} } }).isError).toBe(true)
    const bootstrap = mcpResult(enabled({ id: 3, method: "tools/call", params: { name: "bootstrapMain", arguments: mainRequest(fixture.anchor) } }))
    metadata.binding_epoch = bootstrap.binding_epoch
    expect(mcpResult(enabled({ id: 4, method: "tools/call", params: { name: "status", arguments: {} } })).mode).toBe("OFF")
    expect(mcpResult(enabled({ id: 5, method: "tools/call", params: { name: "activate", arguments: activationRequest() } }))).toEqual({ mode: "ON", activation_epoch: 1, replayed: false })
    expect(mcpResult(enabled({ id: 6, method: "tools/call", params: { name: "status", arguments: {} } })).mode).toBe("ON")
  })
})


describe("P4-A1b empty schema-4 P3 compatibility", () => {
  test("fresh bootstrapMain, activation, register, receive, and status bind schema-4 facts", () => {
    const fixture = createFixture({ mode: "OFF", schema: 4 })
    const metadata = capability(), processIdentity = opaqueProcess()
    const dispatch = dispatcher(fixture.main, metadata, processIdentity)
    expect(dispatch("status")).toEqual({
      mode: "OFF", schema_version: 4, rollback_epoch: 0, lease_status: "NONE", main_binding_status: "ABSENT",
      live_counts: { claims: 0, deliveries: 0, workers: 0 }, pending_counts: { work: 0, attestation: 0 },
    })
    const mainRequestValue = mainRequest(fixture.anchor)
    const main = dispatch("bootstrapMain", mainRequestValue)
    expect(dispatch("bootstrapMain", mainRequestValue)).toEqual({ ...main, replayed: true })
    metadata.binding_epoch = main.binding_epoch
    const activation = activationRequest(main.binding_epoch)
    expect(dispatch("activate", activation)).toEqual({ mode: "ON", activation_epoch: 1, replayed: false })
    const workerMetadata = capability({ plugin_instance: "worker-plugin", root_session_id: "worker-root", binding_epoch: 0 })
    const worker = dispatcher(fixture.main, workerMetadata)
    const registered = worker("register", registerRequest())
    workerMetadata.binding_epoch = registered.binding_epoch
    expect(worker("receive")).toEqual({ delivery: null })
    expect(dispatch("status")).toEqual({
      mode: "ON", schema_version: 4, rollback_epoch: 0, lease_status: "NONE", main_binding_status: "ACTIVE",
      live_counts: { claims: 0, deliveries: 0, workers: 1 }, pending_counts: { work: 0, attestation: 0 },
    })

    const db = new Database(fixture.dbPath, { readonly: true })
    const mainRow = db.query("SELECT identity_digest FROM ct_main_binding WHERE binding_epoch=1").get()
    const mainCommit = db.query("SELECT cas_digest FROM ct_idempotency WHERE operation='bootstrapMain'").get()
    expect(mainCommit.cas_digest).toBe(digest(canonical({
      expected_anchor_id: fixture.anchor.anchor_id, expected_binding_epoch: 0, target_binding_epoch: 1,
      target_identity_digest: mainRow.identity_digest, schema_version: 4, mode: "OFF",
      observed_rollback_epoch: 0, observed_lease_version: 0, observed_lease_status: "NONE",
      observed_active_main_binding_id: null, observed_active_main_binding_epoch: 0,
    })))
    const activeMain = db.query("SELECT * FROM ct_main_binding WHERE binding_status='ACTIVE'").get()
    const activationRow = db.query("SELECT precondition_digest FROM ct_activation").get()
    expect(activationRow.precondition_digest).toBe(digest(canonical({
      kind: "activation_precondition_v1", version: 1, schema_version: 4, mode: "OFF",
      anchor_id: fixture.anchor.anchor_id, config_digest: digest(canonical(fixture.context)),
      rollback_epoch: 0, lease_version: 0, lease_status: "NONE",
      main_binding_id: main.main_binding_id, main_binding_epoch: 1, main_identity_digest: activeMain.identity_digest,
      prior_activation_epoch: 0, active_claimant_bindings: 0, multiplexed_claimant_bindings: 0, claimant_conflicts: 0,
      delivery_plane: "SCHEMA_4_EMPTY", handoffs: 0, transitions: 0, deliveries: 0, claims: 0, budget_scopes: 0,
      polling_plane: "UNAVAILABLE_BEFORE_P7",
    })))
    db.close()
    expect(legacyMessage(fixture.dbPath)).toEqual({ consumed_at: null })
  })

  test("schema-3 Main replay remains exact after empty migration and fresh epoch uses schema 4", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const firstMetadata = capability(), firstProcess = opaqueProcess()
    const first = dispatcher(fixture.main, firstMetadata, firstProcess)
    const request = mainRequest(fixture.anchor), main = first("bootstrapMain", request)
    const before = new Database(fixture.dbPath, { readonly: true })
    const historicalCas = before.query("SELECT cas_digest FROM ct_idempotency WHERE operation='bootstrapMain'").get().cas_digest
    before.close()
    tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: fixture.anchor.anchor_id, expected_schema_version: 3, target_schema_version: 4, expected_mode: "OFF" }, fixture.main)
    expect(first("bootstrapMain", request)).toEqual({ ...main, replayed: true })
    firstMetadata.binding_epoch = 1
    const second = dispatcher(fixture.main, capability({ binding_epoch: 1 }))
    expect(second("bootstrapMain", mainRequest(fixture.anchor, 1))).toMatchObject({ binding_epoch: 2, replayed: false })
    const after = new Database(fixture.dbPath, { readonly: true })
    expect(after.query("SELECT cas_digest FROM ct_idempotency WHERE operation='bootstrapMain' AND scope_key LIKE '%epoch:1'").get().cas_digest).toBe(historicalCas)
    expect(after.query("SELECT COUNT(*) AS count FROM ct_handoff").get().count).toBe(0)
    after.close()

    const missingEvidence = createFixture({ mode: "OFF", schema: 4 })
    const malformed = new Database(missingEvidence.dbPath)
    malformed.run("DELETE FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'")
    malformed.close()
    expect(errorCode(() => dispatcher(missingEvidence.main, capability())("status"))).toBe("CT_SCHEMA_INVALID")
  })

  test("rejects schema-3 and schema-4 Main CAS aliases across the persisted migration boundary", () => {
    const fixture = createFixture({ mode: "OFF", schema: 3 })
    const firstMetadata = capability(), first = dispatcher(fixture.main, firstMetadata)
    first("bootstrapMain", mainRequest(fixture.anchor))
    tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: fixture.anchor.anchor_id, expected_schema_version: 3, target_schema_version: 4, expected_mode: "OFF" }, fixture.main)
    firstMetadata.binding_epoch = 1
    dispatcher(fixture.main, capability({ binding_epoch: 1 }))("bootstrapMain", mainRequest(fixture.anchor, 1))

    const db = new Database(fixture.dbPath)
    const mainRows = db.query("SELECT * FROM ct_main_binding ORDER BY binding_epoch").all()
    const commits = db.query("SELECT scope_key,cas_digest FROM ct_idempotency WHERE operation='bootstrapMain' ORDER BY scope_key").all()
    const alternateCas = (target, predecessor, schema_version) => digest(canonical({
      expected_anchor_id: fixture.anchor.anchor_id, expected_binding_epoch: target.binding_epoch - 1,
      target_binding_epoch: target.binding_epoch, target_identity_digest: target.identity_digest,
      schema_version, mode: "OFF", observed_rollback_epoch: 0, observed_lease_version: 0,
      observed_lease_status: "NONE", observed_active_main_binding_id: predecessor?.main_binding_id ?? null,
      observed_active_main_binding_epoch: predecessor?.binding_epoch ?? 0,
    }))
    const historicalAlias = alternateCas(mainRows[0], null, 4)
    const freshAlias = alternateCas(mainRows[1], mainRows[0], 3)
    db.run("UPDATE ct_idempotency SET cas_digest=? WHERE operation='bootstrapMain' AND scope_key=?", [historicalAlias, commits[0].scope_key])
    db.close()
    expect(errorCode(() => first("status"))).toBe("CT_SCHEMA_INVALID")

    const restore = new Database(fixture.dbPath)
    restore.run("UPDATE ct_idempotency SET cas_digest=? WHERE operation='bootstrapMain' AND scope_key=?", [commits[0].cas_digest, commits[0].scope_key])
    restore.run("UPDATE ct_idempotency SET cas_digest=? WHERE operation='bootstrapMain' AND scope_key=?", [freshAlias, commits[1].scope_key])
    restore.close()
    expect(errorCode(() => first("status"))).toBe("CT_SCHEMA_INVALID")
  })
})


describe("P4-A1c evolved schema-4 validation and total replay", () => {
  const setupEvolved = (fault = null, terminal = "CLAIMED") => {
    const fixture = createFixture({ mode: "OFF", schema: 4 })
    const mainMetadata = capability(), mainDispatch = dispatcher(fixture.main, mainMetadata)
    const main = mainDispatch("bootstrapMain", mainRequest(fixture.anchor))
    mainMetadata.binding_epoch = main.binding_epoch
    mainDispatch("activate", activationRequest(main.binding_epoch))
    const workerMetadata = capability({ plugin_instance: "worker-plugin", root_session_id: "worker-root" })
    const workerDispatch = dispatcher(fixture.main, workerMetadata)
    const registered = workerDispatch("register", registerRequest())
    workerMetadata.binding_epoch = registered.binding_epoch

    const db = new Database(fixture.dbPath)
    const binding = db.query("SELECT * FROM ct_claimant_binding WHERE binding_id=?").get(registered.binding_id)
    const mainRow = db.query("SELECT * FROM ct_main_binding WHERE main_binding_id=?").get(main.main_binding_id)
    const activationRow = db.query("SELECT * FROM ct_activation WHERE main_binding_id=?").get(main.main_binding_id)
    const authorityTime = [binding.created_at, mainRow.created_at, activationRow.activated_at].sort().at(-1)
    const later = (milliseconds) => new Date(new Date(authorityTime).getTime() + milliseconds).toISOString()
    const times = { CREATE: later(10), VALIDATE: later(20), PUBLISH: later(30), DELIVERY: later(fault === "delivery-publish-reverse" ? 35 : 30), CLAIM: later(40) }
    const id = randomBytes(32).toString("base64url"), deliveryId = randomBytes(32).toString("base64url")
    const claimId = randomBytes(32).toString("base64url")
    const ctxKeys = ["effective_uid", "canonical_repo", "git_common_dir", "worktree", "branch", "host_process_instance", "plugin_instance", "root_session_id", "mcp_process_instance", "pid_start_marker", "binding_epoch"]
    const ctx = Object.fromEntries(ctxKeys.map((key) => [key, binding[key]]))
    const repositoryFingerprint = digest(canonical({ kind: "canonical_repo_v1", path: fixture.context.canonical_repo }))
    const commonDirFingerprint = digest(canonical({ kind: "git_common_dir_v1", path: fixture.context.git_common_dir }))
    const sourceMerge = { sha: "a".repeat(40), url: "https://example.invalid/merge" }, referenceValue = "https://example.invalid/reference"
    const nextUnit = { unit_id: "fixture-unit", scope: fault === "payload-bound" ? "x".repeat(4097) : "validator fixture",
      dependencies: [{ id: "dep-a", digest: digest("dep-a") }, { id: "dep-b", digest: digest("dep-b") }],
      references: [{ kind: "URL", value: referenceValue, digest: digest(referenceValue) }] }
    if (fault === "payload-sort") nextUnit.dependencies.reverse()
    if (fault === "payload-member") nextUnit.dependencies[0] = { ...nextUnit.dependencies[0], extra: true }
    const snapshots = [{ name: "snapshot-a", digest: digest("snapshot-a") }]
    const sourceDigest = digest(canonical({ source_kind: "TEST", source_ref: "fixture", source_merge_sha: sourceMerge.sha, source_merge_url: sourceMerge.url }))
    const payload = { kind: "control_tower_handoff_v1", version: 1, lineage: { lineage_id: randomUUID(), revision: 1 },
      repository: { repository_fingerprint: repositoryFingerprint, git_common_dir_fingerprint: commonDirFingerprint, source_merge: sourceMerge },
      next_unit: nextUnit, snapshots, provenance: { source_kind: "TEST", source_ref: "fixture", source_digest: sourceDigest }, decision_summary: "fixture decision" }
    const payloadJson = canonical(payload)
    const producerCtxJson = canonical(ctx)
    const payloadDigest = fault === "payload" ? `sha256:${"f".repeat(64)}` : digest(payloadJson)
    const producerCtxDigest = fault === "producer-ctx" ? `sha256:${"e".repeat(64)}` : digest(producerCtxJson)
    const handoff = {
      id, lineage_id: payload.lineage.lineage_id, revision: 1, state: fault === "recover-target" ? "DRAFT" : terminal, generation: fault === "transition-generation" ? 1 : 0,
      payload_json: payloadJson, payload_digest: payloadDigest,
      repository_fingerprint: repositoryFingerprint, git_common_dir_fingerprint: commonDirFingerprint,
      source_merge_sha: sourceMerge.sha, source_merge_url: sourceMerge.url,
      next_unit_scope_digest: digest(canonical({ unit_id: nextUnit.unit_id, scope: nextUnit.scope })), dependencies_digest: digest(canonical(nextUnit.dependencies)), references_digest: digest(canonical(nextUnit.references)),
      snapshots_digest: digest(canonical(snapshots)), provenance_digest: digest(canonical({ source_digest: sourceDigest, references_digest: digest(canonical(nextUnit.references)), snapshots_digest: digest(canonical(snapshots)) })), decision_summary_digest: digest(payload.decision_summary),
      producer_binding_id: binding.binding_id, producer_identity_digest: binding.identity_digest,
      producer_ctx_json: producerCtxJson, producer_ctx_digest: producerCtxDigest,
      validation_evidence_json: null, validation_digest: null,
      created_at: times.CREATE, validated_at: terminal === "DRAFT" ? null : fault === "timestamp-order" ? later(5) : times.VALIDATE,
      published_at: ["DRAFT", "VALIDATED"].includes(terminal) ? null : times.PUBLISH,
    }
    if (fault === "provenance") handoff.provenance_digest = digest("wrong-provenance")
    const fingerprintKeys = ["id", "lineage_id", "revision", "payload_digest", "repository_fingerprint", "git_common_dir_fingerprint", "next_unit_scope_digest", "dependencies_digest", "references_digest", "snapshots_digest", "provenance_digest", "decision_summary_digest", "producer_binding_id", "producer_identity_digest", "producer_ctx_digest"]
    handoff.handoff_fingerprint = digest(canonical({ kind: "handoff_fingerprint_v1", version: 1,
      ...Object.fromEntries(fingerprintKeys.map((key) => [key, handoff[key]])) }))
    const validation = { kind: "handoff_validation_evidence_v1", version: 1, id, lineage_id: handoff.lineage_id, revision: 1,
      payload_digest: handoff.payload_digest, handoff_fingerprint: handoff.handoff_fingerprint, repository_fingerprint: repositoryFingerprint, git_common_dir_fingerprint: commonDirFingerprint,
      content: Object.fromEntries(["next_unit_scope_digest", "dependencies_digest", "references_digest", "snapshots_digest", "decision_summary_digest"].map((key) => [key, handoff[key]])),
      provenance: { source_digest: sourceDigest, provenance_digest: handoff.provenance_digest, producer_binding_id: binding.binding_id, producer_identity_digest: binding.identity_digest, producer_ctx_digest: producerCtxDigest },
      source_merge: { requested_sha: sourceMerge.sha, resolved_oid: sourceMerge.sha, url: sourceMerge.url, main_head_oid: sourceMerge.sha, is_ancestor: true },
      references: [{ ...nextUnit.references[0], observed_digest: digest(referenceValue), fetch: fault === "evidence-reference" ? "GET" : "NONE" }],
      validator: { main_binding_id: mainRow.main_binding_id, main_binding_epoch: mainRow.binding_epoch, main_identity_digest: mainRow.identity_digest } }
    if (fault === "validation-link") validation.source_merge.requested_sha = "b".repeat(40)
    if (fault === "evidence-resolved") validation.source_merge.resolved_oid = "b".repeat(40)
    if (terminal !== "DRAFT") {
      handoff.validation_evidence_json = canonical(validation)
      handoff.validation_digest = digest(handoff.validation_evidence_json)
    }
    db.run(`INSERT INTO ct_handoff(${Object.keys(handoff).join(",")}) VALUES (${Object.keys(handoff).map(() => "?").join(",")})`, Object.values(handoff))

    const generation = handoff.generation
    const budgetJson = canonical({ kind: "session_budget_v1", version: 1, effective_uid: binding.effective_uid,
      canonical_repo: binding.canonical_repo, git_common_dir: binding.git_common_dir, plugin_instance: binding.plugin_instance, root_session_id: binding.root_session_id })
    const budgetDigest = fault === "budget" ? `sha256:${"b".repeat(64)}` : digest(budgetJson)
    const ctxDigest = digest(producerCtxJson), tokenSalt = randomBytes(32).toString("base64url")
    const fenceValue = { kind: "claimant_fence_v1", version: 1, delivery_id: deliveryId, id, generation, purpose: "WORK",
      claimant_binding_id: binding.binding_id, claimant_identity_digest: binding.identity_digest, claimant_ctx_digest: ctxDigest,
      observed_rollback_epoch: 0, observed_lease_version: 0, budget_scope_digest: budgetDigest, budget_sequence: 1 }
    const fenceDigest = fault === "claim-fence" ? digest("wrong-fence") : digest(canonical(fenceValue))
    const tokenMaterial = { kind: "claim_token_v1", version: 1, claim_id: claimId, delivery_id: deliveryId, id, generation, purpose: "WORK", claimant_fence_digest: fenceDigest, token_salt: tokenSalt }
    const anchor = JSON.parse(readFileSync(join(fixture.context.git_common_dir, "control-tower", "main_authority_anchor_v1.json"), "utf8"))
    const token = createHmac("sha256", Buffer.from(anchor.anchor_secret, "base64url")).update(canonical(tokenMaterial)).digest("base64url")
    const tokenHash = fault === "claim-token" ? digest("wrong-token") : digest(token)
    const writer_fence_v1 = { schema_version: 4, mode: "ON", anchor_id: fixture.anchor.anchor_id,
      config_digest: fault === "envelope-cas-member" ? digest("wrong-config") : digest(canonical(fixture.context)),
      observed_rollback_epoch: 0, observed_lease_version: 0, observed_lease_status: "NONE" }
    const producer_authority_v1 = { binding_id: binding.binding_id, identity_digest: binding.identity_digest, ctx_digest: producerCtxDigest }
    const main_authority_v1 = { main_binding_id: mainRow.main_binding_id, binding_epoch: mainRow.binding_epoch, identity_digest: mainRow.identity_digest }
    const claimant_authority_v1 = { binding_id: binding.binding_id, identity_digest: binding.identity_digest, ctx_digest: ctxDigest }
    const persistTransition = (operation, from_state, to_state, authority_kind, authorityRow, request, scope, casInput, responseJson, decision) => {
      const response = responseJson.public_response ?? responseJson
      const row = { transition_id: randomBytes(32).toString("base64url"), handoff_id: id, generation: operation === "CREATE" ? 0 : generation,
        operation, from_state, to_state, authority_kind, authority_binding_id: authorityRow.binding_id ?? authorityRow.main_binding_id,
        authority_identity_digest: fault === "transition-authority" && operation === "CLAIM" ? digest("wrong-authority") : authorityRow.identity_digest,
        request_identity: request.request_identity, request_digest: digest(canonical(request)), cas_digest: digest(canonical(casInput)), decision_digest: decision,
        response_digest: fault === "transition-response" && operation === "CLAIM" ? digest("wrong-response") : digest(canonical(response)), occurred_at: times[operation] ?? times.CLAIM }
      db.run("INSERT INTO ct_idempotency VALUES (?,?,?,?,?,?,?)", [operation.toLowerCase(), scope, row.request_identity, row.request_digest, row.cas_digest, canonical(responseJson), row.occurred_at])
      db.run(`INSERT INTO ct_handoff_transition(${Object.keys(row).join(",")}) VALUES (${Object.keys(row).map(() => "?").join(",")})`, Object.values(row)); return row
    }
    const createRequest = { request_identity: randomUUID(), lineage_id: handoff.lineage_id, revision: 1, payload, payload_digest: handoff.payload_digest }
    const createScope = `handoff:${handoff.lineage_id}:revision:1`
    const createCas = { kind: "create_cas_v1", version: 1, writer_fence_v1, producer_authority_v1, lineage_id: handoff.lineage_id, revision: 1, payload_digest: handoff.payload_digest, expected_lineage_revision: "ABSENT" }
    const createPublic = { id, state: "DRAFT", generation: 0, replayed: false }
    const createEnvelope = { kind: "create_response_envelope_v1", version: 1, public_response: createPublic,
      evidence: { request: createRequest, request_digest: digest(canonical(createRequest)), scope_key: createScope, cas_input: createCas, cas_digest: digest(canonical(createCas)) } }
    if (fault === "initial-history") {
      persistTransition("REVISE", "REJECTED", "DRAFT", "MAIN", mainRow, { request_identity: createRequest.request_identity }, `handoff:${id}:revise`, { kind: "revise_cas_v1", version: 1 }, createPublic, digest("revise"))
    } else persistTransition("CREATE", null, "DRAFT", "PRODUCER", binding, createRequest, createScope, createCas, createEnvelope, null)
    const validateRequest = { request_identity: randomUUID(), id, es: "DRAFT", eg: generation, payload_digest: fault === "transition-request" ? digest("wrong-request-payload") : handoff.payload_digest }
    const validateScope = `handoff:${id}:generation:${generation}:validate`
    const validateCommittedDigest = fault === "validation-validate-reverse" ? digest("detached-validation-link") : handoff.validation_digest
    const validateCas = { kind: "validate_cas_v1", version: 1, writer_fence_v1, main_authority_v1, id, expected_state: "DRAFT", expected_generation: generation, payload_digest: handoff.payload_digest, handoff_fingerprint: handoff.handoff_fingerprint, validation_digest: validateCommittedDigest }
    const validatePublic = { id, state: "VALIDATED", generation, replayed: false }
    const validateEnvelopeRequest = fault === "envelope-request" ? { ...validateRequest, payload_digest: digest("wrong-envelope-request") } : validateRequest
    const validateEnvelope = { kind: "validate_response_envelope_v1", version: 1, public_response: validatePublic,
      evidence: { request: validateEnvelopeRequest, request_digest: digest(canonical(validateEnvelopeRequest)), scope_key: validateScope, cas_input: validateCas, cas_digest: digest(canonical(validateCas)), validation_digest: validateCommittedDigest } }
    if (terminal !== "DRAFT" && fault !== "orphan-validation") persistTransition("VALIDATE", "DRAFT", "VALIDATED", "MAIN", mainRow, validateRequest, validateScope, validateCas, validateEnvelope, validateCommittedDigest)
    const publishRequest = { request_identity: randomUUID(), id, es: "VALIDATED", eg: generation }, publishScope = `handoff:${id}:generation:${generation}:publish`
    const publishCas = { kind: "publish_cas_v1", version: 1, writer_fence_v1, main_authority_v1, id, expected_state: "VALIDATED", expected_generation: generation, payload_digest: handoff.payload_digest, handoff_fingerprint: handoff.handoff_fingerprint, validation_digest: handoff.validation_digest, expected_delivery: "ABSENT" }
    const publishPublic = { id, state: "PUBLISHED", generation, replayed: false }
    const publishEnvelope = { kind: "publish_response_envelope_v1", version: 1, public_response: publishPublic, evidence: { request: publishRequest, request_digest: digest(canonical(publishRequest)), scope_key: publishScope, cas_input: publishCas, cas_digest: digest(canonical(publishCas)), validation_digest: handoff.validation_digest, delivery_id: deliveryId } }
    if (!["DRAFT", "VALIDATED"].includes(terminal) && fault !== "missing-publish-transition") persistTransition("PUBLISH", "VALIDATED", "PUBLISHED", "MAIN", mainRow, publishRequest, publishScope, publishCas, publishEnvelope, handoff.validation_digest)
    const claimRequest = { request_identity: randomUUID(), delivery_id: deliveryId, id, es: "PUBLISHED", eg: generation, purpose: "WORK" }
    const claimScope = fault === "transition-scope" ? `delivery:${randomBytes(32).toString("base64url")}:claim` : `delivery:${deliveryId}:claim`
    const claimCas = { kind: "claim_cas_v1", version: 1, writer_fence_v1, claimant_authority_v1, delivery_id: deliveryId, id, expected_delivery_state: "PENDING", expected_handoff_state: "PUBLISHED", expected_generation: generation, purpose: "WORK", handoff_fingerprint: handoff.handoff_fingerprint, budget_scope_digest: budgetDigest, budget_limit: 1, observed_budget_consumed: 0, target_budget_sequence: 1, token_scheme: "hmac-sha256-anchor-v1" }
    const claimPublic = { kind: "claim_response_v1", version: 1, id, state: "CLAIMED", generation, delivery_id: deliveryId, purpose: "WORK", replayed: false }
    const claimEnvelope = { kind: "claim_response_envelope_v1", version: 1, public_response: claimPublic,
      evidence: { request: claimRequest, request_digest: digest(canonical(claimRequest)), scope_key: claimScope, cas_input: claimCas, cas_digest: digest(canonical(claimCas)),
        claim_id: claimId, claimant_fence_digest: fenceDigest, budget_scope_digest: budgetDigest, budget_sequence: 1,
        token_hash: fault === "claim-commitment-reverse" ? digest("detached-token-link") : tokenHash } }
    const claimDecision = digest(canonical({ kind: "claim_decision_v1", version: 1, delivery_id: deliveryId, id, from_state: "PUBLISHED", to_state: "CLAIMED", generation, purpose: "WORK", claim_id: claimId, claimant_fence_digest: fenceDigest, budget_scope_digest: budgetDigest, budget_sequence: 1, token_hash: tokenHash }))
    if (terminal === "CLAIMED") {
      const claimTransition = fault === "recover-target"
        ? persistTransition("RECOVER", "PUBLISHED", "DRAFT", "MAIN", mainRow, claimRequest, `handoff:${id}:recover`, { kind: "recover_cas_v1", version: 1 }, { id, state: "DRAFT", generation, replayed: false }, claimDecision)
        : fault === "missing-claim-transition"
          ? { request_identity: claimRequest.request_identity, request_digest: digest(canonical(claimRequest)), cas_digest: digest(canonical(claimCas)) }
          : persistTransition("CLAIM", "PUBLISHED", "CLAIMED", "CLAIMANT", binding, claimRequest, claimScope, claimCas, claimEnvelope, fault === "transition-decision" ? digest("wrong-decision") : claimDecision)
      db.run("INSERT INTO ct_session_budget VALUES (?,?,1,1,?,?,?)", [budgetDigest, budgetJson, claimId, times.CLAIM, times.CLAIM])
      db.run("INSERT INTO ct_delivery VALUES (?,?,?,?,?,?,?,?,?,?)", [deliveryId, id, generation, "WORK", "CLAIMED", "PUBLISHED", claimId, times.DELIVERY, times.CLAIM, null])
      db.run("INSERT INTO ct_claim VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [claimId, deliveryId, id, generation, "WORK", binding.binding_id, binding.identity_digest,
        producerCtxJson, ctxDigest, fenceDigest, tokenSalt, tokenHash, budgetDigest, 1, claimTransition.request_identity,
        fault === "claim-transition-link" ? digest("wrong-claim-request") : claimTransition.request_digest, claimTransition.cas_digest, "LIVE", times.CLAIM, null])
      if (fault === "closed-delivery") db.run("UPDATE ct_delivery SET delivery_state='CLOSED',closed_at=? WHERE delivery_id=?", [times.CLAIM, deliveryId])
    } else if (terminal === "PUBLISHED") {
      db.run("INSERT INTO ct_delivery VALUES (?,?,?,?,?,?,?,?,?,?)", [deliveryId, id, generation, "WORK", "PENDING", "PUBLISHED", null, times.DELIVERY, null, null])
    }
    if (fault === "missing-commit") db.run("DELETE FROM ct_idempotency WHERE operation='claim'")
    if (fault === "wrong-operation-idempotency") db.run("UPDATE ct_idempotency SET operation='ack' WHERE operation='validate'")
    if (fault === "orphan-delivery") db.run("INSERT INTO ct_delivery VALUES (?,?,?,?,?,?,?,?,?,?)", [randomBytes(32).toString("base64url"), randomBytes(32).toString("base64url"), 0, "WORK", "PENDING", "PUBLISHED", null, times.PUBLISH, null, null])
    if (fault === "orphan-claim") db.run("INSERT INTO ct_claim VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [randomBytes(32).toString("base64url"), randomBytes(32).toString("base64url"), randomBytes(32).toString("base64url"), 0, "WORK", binding.binding_id, binding.identity_digest,
      producerCtxJson, ctxDigest, digest("orphan-fence"), randomBytes(32).toString("base64url"), digest("orphan-token"), budgetDigest, 1, randomUUID(), digest("orphan-request"), digest("orphan-cas"), "LIVE", times.CLAIM, null])
    db.run("UPDATE ct_continuation_state SET mode='OFF'")
    db.run("UPDATE ct_rollback_lease SET rollback_epoch=7,lease_version=11")
    const migrationRequest = JSON.parse(db.query("SELECT response_json FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'").get().response_json).evidence.request
    db.close()
    return { ...fixture, mainDispatch, workerDispatch, migrationRequest }
  }

  const setupDormant = (history, fault = null) => {
    const rejectSource = history.startsWith("REJECT_") ? history.slice("REJECT_".length) : "PUBLISHED"
    const publishedStart = history === "RECOVER" || history.startsWith("REJECT")
    const fixture = setupEvolved(null, publishedStart ? rejectSource : "CLAIMED")
    const db = new Database(fixture.dbPath)
    const handoff = db.query("SELECT * FROM ct_handoff").get()
    const delivery = db.query("SELECT * FROM ct_delivery WHERE handoff_id=? ORDER BY generation").get(handoff.id)
    const claim = db.query("SELECT * FROM ct_claim WHERE handoff_id=?").get(handoff.id)
    const main = db.query("SELECT * FROM ct_main_binding WHERE binding_status='ACTIVE'").get()
    const claimant = db.query("SELECT * FROM ct_claimant_binding WHERE binding_status='ACTIVE'").get()
    const last = db.query("SELECT occurred_at FROM ct_handoff_transition WHERE handoff_id=? ORDER BY occurred_at DESC,transition_id DESC").get(handoff.id)
    let tick = new Date(last.occurred_at).getTime()
    const at = () => new Date(tick += 10).toISOString()
    const writer_fence_v1 = JSON.parse(db.query("SELECT response_json FROM ct_idempotency WHERE operation='create'").get().response_json).evidence.cas_input.writer_fence_v1
    const claimant_authority_v1 = claim && { binding_id: claim.claimant_binding_id, identity_digest: claim.claimant_identity_digest, ctx_digest: claim.claimant_ctx_digest }
    const main_authority_v1 = { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
    const persist = ({ operation, from, to, generation, authority, authorityValue, deliveryId = null, claimId = null, disposition = null, occurredAt = at() }) => {
      const action = operation === "RECOVER" ? disposition : operation
      const request_identity = randomUUID()
      const request = { request_identity, id: handoff.id, es: from, eg: generation, action, delivery_id: deliveryId, claim_id: claimId }
      const scope = `handoff:${handoff.id}:generation:${generation}:${action.toLowerCase()}`
      const authorityKey = authority === "MAIN" ? "main_authority_v1" : "claimant_authority_v1"
      const cas = { kind: `${action.toLowerCase()}_cas_v1`, version: 1, writer_fence_v1, [authorityKey]: authorityValue,
        id: handoff.id, expected_state: from, expected_generation: generation, delivery_id: deliveryId, claim_id: claimId }
      const publicResponse = { id: handoff.id, state: to, generation, replayed: false }
      const decision = digest(canonical({ kind: "dormant_transition_decision_v1", version: 1, operation, disposition, id: handoff.id,
        from_state: from, to_state: to, generation, delivery_id: deliveryId, claim_id: claimId }))
      const targetOperation = history === "ATTEST" ? "ATTEST_COMPLETION" : history.startsWith("REJECT") ? "REJECT" : history
      const envelopeRequest = fault === "wrong-commitment" && operation === targetOperation ? { ...request, id: randomBytes(32).toString("base64url") } : request
      const response = { kind: `${action.toLowerCase()}_response_envelope_v1`, version: 1, public_response: publicResponse,
        evidence: { request: envelopeRequest, request_digest: digest(canonical(envelopeRequest)), scope_key: scope, cas_input: cas, cas_digest: digest(canonical(cas)) } }
      const row = { transition_id: fault === "equal-time-order" && operation === "ACK" ? "-".repeat(43) : randomBytes(32).toString("base64url"), handoff_id: handoff.id,
        generation, operation, from_state: from, to_state: to, authority_kind: authority, authority_binding_id: authority === "MAIN" ? main.main_binding_id : claimant.binding_id,
        authority_identity_digest: authority === "MAIN" ? main.identity_digest : claimant.identity_digest, request_identity,
        request_digest: digest(canonical(request)), cas_digest: digest(canonical(cas)), decision_digest: decision,
        response_digest: digest(canonical(publicResponse)), occurred_at: occurredAt }
      const idempotencyOperation = operation === "ATTEST_COMPLETION" ? "attestCompletion" : operation.toLowerCase()
      db.run("INSERT INTO ct_idempotency VALUES (?,?,?,?,?,?,?)", [idempotencyOperation, fault === "wrong-scope" && operation === targetOperation ? `${scope}:wrong` : scope,
        request_identity, row.request_digest, row.cas_digest, canonical(response), occurredAt])
      db.run(`INSERT INTO ct_handoff_transition(${Object.keys(row).join(",")}) VALUES (${Object.keys(row).map(() => "?").join(",")})`, Object.values(row))
      return { row, decision }
    }
    const ackAt = fault === "equal-time-order" ? last.occurred_at : at()
    const addAck = () => persist({ operation: "ACK", from: "CLAIMED", to: "STARTED", generation: 0, authority: "CLAIMANT", authorityValue: claimant_authority_v1,
      deliveryId: delivery.delivery_id, claimId: claim.claim_id, occurredAt: ackAt })
    if (["ACK", "ATTEST", "COMPLETE"].includes(history)) {
      addAck()
      db.run("UPDATE ct_handoff SET state='STARTED' WHERE id=?", [handoff.id])
    }
    if (["ATTEST", "COMPLETE"].includes(history)) {
      persist({ operation: "ATTEST_COMPLETION", from: "STARTED", to: "COMPLETION_ATTESTED", generation: 0, authority: "MAIN", authorityValue: main_authority_v1,
        deliveryId: delivery.delivery_id, claimId: claim.claim_id })
      db.run("UPDATE ct_handoff SET state='COMPLETION_ATTESTED' WHERE id=?", [handoff.id])
    }
    if (history === "COMPLETE") {
      const completedAt = at()
      persist({ operation: "COMPLETE", from: "COMPLETION_ATTESTED", to: "COMPLETED", generation: 0, authority: "CLAIMANT", authorityValue: claimant_authority_v1,
        deliveryId: delivery.delivery_id, claimId: claim.claim_id, occurredAt: completedAt })
      const closedAt = fault === "closure-time" ? new Date(new Date(completedAt).getTime() + 10).toISOString() : completedAt
      db.run("UPDATE ct_delivery SET delivery_state='CLOSED',closed_at=? WHERE delivery_id=?", [closedAt, delivery.delivery_id])
      db.run("UPDATE ct_claim SET claim_state='CLOSED',closed_at=? WHERE claim_id=?", [closedAt, claim.claim_id])
      db.run("UPDATE ct_handoff SET state='COMPLETED' WHERE id=?", [handoff.id])
      if (fault === "illegal-terminal-successor") {
        persist({ operation: "REJECT", from: "COMPLETED", to: "REJECTED", generation: 0, authority: "MAIN", authorityValue: main_authority_v1,
          deliveryId: delivery.delivery_id, claimId: claim.claim_id })
        db.run("UPDATE ct_handoff SET state='REJECTED' WHERE id=?", [handoff.id])
      }
    } else if (history.startsWith("REJECT")) {
      const rejectedAt = at(), deliveryId = delivery?.delivery_id ?? null
      persist({ operation: "REJECT", from: rejectSource, to: "REJECTED", generation: 0, authority: "MAIN", authorityValue: main_authority_v1,
        deliveryId, occurredAt: rejectedAt })
      if (delivery) db.run("UPDATE ct_delivery SET delivery_state='CLOSED',closed_at=? WHERE delivery_id=?", [rejectedAt, delivery.delivery_id])
      db.run("UPDATE ct_handoff SET state='REJECTED' WHERE id=?", [handoff.id])
    } else if (history === "RECOVER") {
      const suspendedAt = at()
      persist({ operation: "RECOVER", disposition: "SUSPEND_PENDING", from: "PUBLISHED", to: "WORK_SUSPENDED", generation: 0, authority: "MAIN", authorityValue: main_authority_v1,
        deliveryId: delivery.delivery_id, occurredAt: suspendedAt })
      db.run("UPDATE ct_delivery SET delivery_state='CLOSED',closed_at=? WHERE delivery_id=?", [suspendedAt, delivery.delivery_id])
      const freshDeliveryId = randomBytes(32).toString("base64url"), redeliveredAt = at()
      persist({ operation: "RECOVER", disposition: "REDELIVER_WORK", from: "WORK_SUSPENDED", to: "PUBLISHED", generation: 1, authority: "MAIN", authorityValue: main_authority_v1,
        deliveryId: freshDeliveryId, occurredAt: redeliveredAt })
      if (fault !== "missing-fresh-delivery") {
        const createdAt = fault === "fresh-delivery-time" ? new Date(new Date(redeliveredAt).getTime() + 10).toISOString() : redeliveredAt
        db.run("INSERT INTO ct_delivery VALUES (?,?,?,?,?,?,?,?,?,?)", [freshDeliveryId, handoff.id, 1, "WORK", "PENDING", "PUBLISHED", null, createdAt, null, null])
      }
      db.run("UPDATE ct_handoff SET state='PUBLISHED',generation=1 WHERE id=?", [handoff.id])
    } else if (history === "UNRESTRICTED_RECOVER") {
      const recoveredAt = at(), freshDeliveryId = randomBytes(32).toString("base64url")
      persist({ operation: "RECOVER", disposition: "REDELIVER_WORK", from: "CLAIMED", to: "PUBLISHED", generation: 1, authority: "MAIN", authorityValue: main_authority_v1,
        deliveryId: freshDeliveryId, occurredAt: recoveredAt })
      db.run("UPDATE ct_delivery SET delivery_state='CLOSED',closed_at=? WHERE delivery_id=?", [recoveredAt, delivery.delivery_id])
      db.run("UPDATE ct_claim SET claim_state='CLOSED',closed_at=? WHERE claim_id=?", [recoveredAt, claim.claim_id])
      db.run("INSERT INTO ct_delivery VALUES (?,?,?,?,?,?,?,?,?,?)", [freshDeliveryId, handoff.id, 1, "WORK", "PENDING", "PUBLISHED", null, recoveredAt, null, null])
      db.run("UPDATE ct_handoff SET state='PUBLISHED',generation=1 WHERE id=?", [handoff.id])
    }
    if (fault === "orphan-idempotency") {
      const committed = db.query("SELECT * FROM ct_idempotency WHERE operation='ack' ORDER BY committed_at DESC").get()
      db.run("INSERT INTO ct_idempotency VALUES (?,?,?,?,?,?,?)", [committed.operation, `${committed.scope_key}:orphan`, randomUUID(), committed.request_digest,
        committed.cas_digest, committed.response_json, new Date(new Date(committed.committed_at).getTime() + 1).toISOString()])
    }
    db.run("UPDATE ct_continuation_state SET mode='OFF'")
    db.close()
    return fixture
  }

  test("P4-only gate rejects coherent future P5/P6 histories read-only", () => {
    for (const [operation, history] of [["ACK", "ACK"], ["ATTEST_COMPLETION", "ATTEST"], ["COMPLETE", "COMPLETE"],
      ["REJECT", "REJECT_DRAFT"], ["REJECT", "REJECT_VALIDATED"], ["REJECT", "REJECT_PUBLISHED"], ["RECOVER", "RECOVER"]]) {
      const fixture = setupDormant(history)
      const before = readFileSync(fixture.dbPath)
      expect({ operation, statusCode: errorCode(() => fixture.mainDispatch("status")) }).toEqual({ operation, statusCode: "CT_SCHEMA_INVALID" })
      expect(errorCode(() => tower.bootstrapAdmin(fixture.migrationRequest, fixture.main))).toBe("CT_SCHEMA_INVALID")
      expect(readFileSync(fixture.dbPath)).toEqual(before)
    }
  })

  test("P4-only gate accepts coherent CREATE/VALIDATE/PUBLISH/CLAIM prefixes read-only", () => {
    for (const terminal of ["DRAFT", "VALIDATED", "PUBLISHED", "CLAIMED"]) {
      const fixture = setupEvolved(null, terminal)
      const before = readFileSync(fixture.dbPath)
      expect({ terminal, statusCode: errorCode(() => fixture.mainDispatch("status")) }).toEqual({ terminal, statusCode: null })
      expect(fixture.mainDispatch("status").schema_version).toBe(4)
      expect(tower.bootstrapAdmin(fixture.migrationRequest, fixture.main)).toMatchObject({ schema_version: 4, replayed: true })
      expect(readFileSync(fixture.dbPath)).toEqual(before)
    }
  })

  test("R2 RED rejects causal tuple, closure timestamp, scope, commitment, row, and unrestricted recovery drift", () => {
    for (const [history, fault] of [["ACK", "equal-time-order"], ["ACK", "wrong-commitment"], ["ACK", "wrong-scope"], ["ACK", "orphan-idempotency"],
      ["COMPLETE", "closure-time"], ["COMPLETE", "illegal-terminal-successor"], ["RECOVER", "fresh-delivery-time"], ["RECOVER", "missing-fresh-delivery"], ["UNRESTRICTED_RECOVER", null]]) {
      const fixture = setupDormant(history, fault)
      expect(errorCode(() => fixture.mainDispatch("status"))).toBe("CT_SCHEMA_INVALID")
      expect(errorCode(() => tower.bootstrapAdmin(fixture.migrationRequest, fixture.main))).toBe("CT_SCHEMA_INVALID")
    }
  })

  test("accepts coherent historical envelopes across later lease evolution and replays read-only", () => {
    const fixture = setupEvolved()
    const before = new Database(fixture.dbPath, { readonly: true })
    const snapshot = ["ct_handoff", "ct_handoff_transition", "ct_delivery", "ct_claim", "ct_session_budget"].map((table) => before.query(`SELECT * FROM ${table} ORDER BY rowid`).all())
    before.close()
    expect(fixture.mainDispatch("status")).toMatchObject({ mode: "OFF", schema_version: 4,
      live_counts: { claims: 1, deliveries: 1, workers: 1 }, pending_counts: { work: 0, attestation: 0 } })
    const chronology = new Database(fixture.dbPath, { readonly: true })
    const lease = chronology.query("SELECT rollback_epoch,lease_version,lease_status FROM ct_rollback_lease").get()
    const authorityTimes = [chronology.query("SELECT MAX(created_at) AS value FROM ct_main_binding").get().value,
      chronology.query("SELECT MAX(activated_at) AS value FROM ct_activation").get().value,
      chronology.query("SELECT MAX(created_at) AS value FROM ct_claimant_binding").get().value]
    const transitions = chronology.query("SELECT operation,occurred_at FROM ct_handoff_transition ORDER BY occurred_at,rowid").all()
    const writerFences = chronology.query("SELECT response_json FROM ct_idempotency WHERE operation IN ('create','validate','publish','claim') ORDER BY operation").all()
      .map(({ response_json }) => JSON.parse(response_json).evidence.cas_input.writer_fence_v1)
    chronology.close()
    expect(lease).toEqual({ rollback_epoch: 7, lease_version: 11, lease_status: "NONE" })
    expect(authorityTimes.every((value) => value < transitions[0].occurred_at)).toBe(true)
    expect(transitions.map(({ operation }) => operation)).toEqual(["CREATE", "VALIDATE", "PUBLISH", "CLAIM"])
    expect(writerFences.every(({ observed_rollback_epoch, observed_lease_version }) => observed_rollback_epoch === 0 && observed_lease_version === 0)).toBe(true)
    expect(tower.bootstrapAdmin(fixture.migrationRequest, fixture.main)).toMatchObject({ schema_version: 4, replayed: true })
    expect(errorCode(() => tower.bootstrapAdmin({ ...fixture.migrationRequest, request_identity: randomUUID() }, fixture.main))).toBe("CT_IDEMPOTENCY_CONFLICT")
    const after = new Database(fixture.dbPath)
    expect(["ct_handoff", "ct_handoff_transition", "ct_delivery", "ct_claim", "ct_session_budget"].map((table) => after.query(`SELECT * FROM ${table} ORDER BY rowid`).all())).toEqual(snapshot)
    after.run("UPDATE ct_continuation_state SET mode='ON'")
    after.close()
    expect(errorCode(() => tower.bootstrapAdmin(fixture.migrationRequest, fixture.main))).toBe("CT_FENCE_MISMATCH")
    expect(fixture.workerDispatch("receive")).toEqual({ delivery: null })
  })

  const rejectsReadOnly = (fault) => {
    const fixture = setupEvolved(fault)
    const before = new Database(fixture.dbPath, { readonly: true }), rowsBefore = before.query("SELECT * FROM ct_handoff").all(); before.close()
    expect(errorCode(() => fixture.mainDispatch("status"))).toBe("CT_SCHEMA_INVALID")
    expect(errorCode(() => tower.bootstrapAdmin(fixture.migrationRequest, fixture.main))).toBe("CT_SCHEMA_INVALID")
    const after = new Database(fixture.dbPath, { readonly: true }); expect(after.query("SELECT * FROM ct_handoff").all()).toEqual(rowsBefore); after.close()
  }

  test("rejects valid-format wrong claimant-fence and anchor-secret token commitments", () => {
    for (const fault of ["claim-fence", "claim-token"]) rejectsReadOnly(fault)
  })

  test("rejects orphan metadata, deliveries, claims, and missing reverse transitions", () => {
    for (const fault of ["orphan-validation", "orphan-delivery", "orphan-claim", "missing-publish-transition", "missing-claim-transition"]) rejectsReadOnly(fault)
  })

  test("rejects operation commitment, reverse idempotency, and transition history drift", () => {
    for (const fault of ["transition-request", "transition-scope", "transition-authority", "transition-decision", "transition-response", "envelope-request", "envelope-cas-member", "claim-transition-link", "transition-generation", "initial-history", "recover-target", "missing-commit", "wrong-operation-idempotency"]) rejectsReadOnly(fault)
  })

  test("dedicated reverse validators reject otherwise coherent validation, delivery, and claim links", () => {
    for (const fault of ["validation-validate-reverse", "delivery-publish-reverse", "claim-commitment-reverse"]) rejectsReadOnly(fault)
  })

  test("controlled mutations prove each dedicated reverse check is discriminating", async () => {
    for (const [fault, operation] of [["validation-validate-reverse", "VALIDATE"], ["delivery-publish-reverse", "PUBLISH"], ["claim-commitment-reverse", "CLAIM"]]) {
      const fixture = setupEvolved(fault)
      expect(errorCode(() => tower.bootstrapAdmin(fixture.migrationRequest, fixture.main))).toBe("CT_SCHEMA_INVALID")
      const mutationRoot = mkdtempSync(join(tmpdir(), "control-tower-reverse-mutation-")); temporaryDirectories.push(mutationRoot)
      const seam = "const schema4ReverseLinkValid = (_operation, valid) => valid"
      const source = readFileSync(join(packageRoot, "core.mjs"), "utf8")
      expect(source.includes(seam)).toBe(true)
      const mutatedPath = join(mutationRoot, `core-without-${operation.toLowerCase()}-reverse.mjs`)
      writeFileSync(mutatedPath, source.replace(seam, `const schema4ReverseLinkValid = (candidate, valid) => candidate === "${operation}" ? true : valid`))
      const mutatedTower = await import(`${pathToFileURL(mutatedPath).href}?${randomUUID()}`)
      expect(mutatedTower.bootstrapAdmin(fixture.migrationRequest, fixture.main)).toMatchObject({ schema_version: 4, replayed: true })
    }
  })

  test("rejects exact payload, evidence, timestamp, digest, budget, and delivery drift", () => {
    for (const fault of ["payload-bound", "payload-sort", "payload-member", "evidence-reference", "evidence-resolved", "timestamp-order", "payload", "provenance", "producer-ctx", "validation-link", "budget", "closed-delivery"]) rejectsReadOnly(fault)
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

describe("P4-A2 canonical payload, provenance, and create", () => {
  test("CT-R2-S1 creates an immutable DRAFT generation-0 handoff and replays exactly", () => {
    const fixture = setupCreateFixture()
    const payload = validPayload(fixture.context)
    const request = createPayloadRequest(payload)

    const response = fixture.workerDispatch("create", request)
    expect(response).toMatchObject({ state: "DRAFT", generation: 0, replayed: false })
    expect(response.id).toHaveLength(43)

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff").get().count).toBe(1)
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff_transition").get().count).toBe(1)
    const handoff = db.query("SELECT * FROM ct_handoff").get()
    expect(handoff.state).toBe("DRAFT")
    expect(handoff.generation).toBe(0)
    expect(handoff.lineage_id).toBe(payload.lineage.lineage_id)
    expect(handoff.producer_binding_id).toBe(fixture.producerBindingId)
    db.close()

    expect(fixture.workerDispatch("create", request)).toEqual({ ...response, replayed: true })
    const after = new Database(fixture.dbPath, { readonly: true })
    expect(after.query("SELECT COUNT(*) AS count FROM ct_handoff").get().count).toBe(1)
    expect(after.query("SELECT COUNT(*) AS count FROM ct_handoff_transition").get().count).toBe(1)
    after.close()

    // The full R1 schema-4 validator recomputes the CREATE reverse link,
    // envelope, and every derived digest/fingerprint on read.
    expect(fixture.mainDispatch("status")).toMatchObject({ mode: "ON", schema_version: 4 })
  })

  test("CT-R2-S2 rejects a changed accepted request at the same identity and a new identity naming the same scope", () => {
    const fixture = setupCreateFixture()
    const payload = validPayload(fixture.context)
    const request = createPayloadRequest(payload)
    fixture.workerDispatch("create", request)

    const changedPayload = validPayload(fixture.context, { lineage: payload.lineage, decision_summary: "different decision" })
    const changed = { ...request, payload: changedPayload, payload_digest: digest(canonical(changedPayload)) }
    expect(errorCode(() => fixture.workerDispatch("create", changed))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const otherIdentity = { ...request, request_identity: randomUUID() }
    expect(errorCode(() => fixture.workerDispatch("create", otherIdentity))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff").get().count).toBe(1)
    db.close()
  })

  test("CT-R2-S3 rejects the malformed-payload matrix and digest/fingerprint mismatches without mutation", () => {
    const fixture = setupCreateFixture()
    const mutations = [
      (payload) => ({ ...payload, kind: "wrong_kind" }),
      (payload) => ({ ...payload, lineage: { ...payload.lineage, lineage_id: "not-a-uuid" } }),
      (payload) => ({ ...payload, lineage: { ...payload.lineage, revision: 0 } }),
      (payload) => ({ ...payload, decision_summary: "" }),
      (payload) => ({ ...payload, next_unit: { ...payload.next_unit, dependencies: [...payload.next_unit.dependencies].reverse() } }),
      (payload) => ({ ...payload, next_unit: { ...payload.next_unit, unit_id: "x".repeat(129) } }),
      (payload) => ({ ...payload, repository: { ...payload.repository, repository_fingerprint: digest("wrong-repo") } }),
      (payload) => ({ ...payload, repository: { ...payload.repository, git_common_dir_fingerprint: digest("wrong-common-dir") } }),
      (payload) => ({ ...payload, provenance: { ...payload.provenance, source_digest: digest("wrong-source") } }),
      (payload) => ({ ...payload, extra_field: true }),
    ]
    for (const mutate of mutations) {
      const payload = mutate(validPayload(fixture.context))
      const request = createPayloadRequest(payload)
      expect(errorCode(() => fixture.workerDispatch("create", request))).toBe("CT_PAYLOAD_INVALID")
    }
    const wrongDigest = { ...createPayloadRequest(validPayload(fixture.context)), payload_digest: `sha256:${"0".repeat(64)}` }
    expect(errorCode(() => fixture.workerDispatch("create", wrongDigest))).toBe("CT_PAYLOAD_INVALID")

    const mismatchedTop = createPayloadRequest(validPayload(fixture.context))
    mismatchedTop.revision = 2
    expect(errorCode(() => fixture.workerDispatch("create", mismatchedTop))).toBe("CT_PAYLOAD_INVALID")

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff").get().count).toBe(0)
    expect(db.query("SELECT COUNT(*) AS count FROM ct_idempotency WHERE operation='create'").get().count).toBe(0)
    db.close()
  })

  test("CT-R2-S1 gates OFF and ROLLING_BACK before payload/authority checks", () => {
    const off = setupCreateFixture()
    const offDb = new Database(off.dbPath)
    offDb.run("UPDATE ct_continuation_state SET mode='OFF'")
    offDb.close()
    expect(errorCode(() => off.workerDispatch("create", createPayloadRequest(validPayload(off.context))))).toBe("CT_CONTINUATION_OFF")

    const rolling = setupCreateFixture()
    const rollingDb = new Database(rolling.dbPath)
    const activeMain = rollingDb.query("SELECT main_binding_id FROM ct_main_binding WHERE binding_status='ACTIVE'").get()
    rollingDb.run("UPDATE ct_continuation_state SET mode='ROLLING_BACK'")
    rollingDb.run("UPDATE ct_rollback_lease SET rollback_epoch=1,lease_status='ACTIVE',lease_version=1,owner_main_binding_id=?,lease_expires_at='2026-07-22T00:00:00.000Z'", [activeMain.main_binding_id])
    rollingDb.close()
    expect(errorCode(() => rolling.workerDispatch("create", createPayloadRequest(validPayload(rolling.context))))).toBe("CT_ROLLBACK_IN_PROGRESS")
  })

  test("CT-R2-S1 rejects a non-ACTIVE, multiplexed, or stale-epoch producer", () => {
    const fixture = createFixture({ mode: "OFF", schema: 4 })
    const mainMetadata = capability(), mainDispatch = dispatcher(fixture.main, mainMetadata)
    const main = mainDispatch("bootstrapMain", mainRequest(fixture.anchor))
    mainMetadata.binding_epoch = main.binding_epoch
    mainDispatch("activate", activationRequest(main.binding_epoch))
    const workerMetadata = capability({ plugin_instance: "worker-plugin", root_session_id: "worker-root" })
    const workerDispatch = dispatcher(fixture.main, workerMetadata)

    // never registered: no ACTIVE binding at all
    expect(errorCode(() => workerDispatch("create", createPayloadRequest(validPayload(fixture.context))))).toBe("CT_SESSION_ISOLATION_UNPROVEN")

    const registered = workerDispatch("register", registerRequest())
    workerMetadata.binding_epoch = registered.binding_epoch

    const stale = dispatcher(fixture.main, capability({ plugin_instance: "worker-plugin", root_session_id: "worker-root", binding_epoch: 999 }))
    expect(errorCode(() => stale("create", createPayloadRequest(validPayload(fixture.context))))).toBe("CT_FENCE_MISMATCH")

    // a second identity sharing the plugin scope but a different root session
    // is a genuine conflict (same-root reconnects retire+replace instead).
    const conflictMetadata = capability({ plugin_instance: "worker-plugin", root_session_id: "other-worker-root", binding_epoch: registered.binding_epoch })
    expect(errorCode(() => dispatcher(fixture.main, conflictMetadata)("register", registerRequest(registered.binding_epoch, "ACTIVE")))).toBe("CT_SESSION_MULTIPLEXED")
    expect(errorCode(() => workerDispatch("create", createPayloadRequest(validPayload(fixture.context))))).toBe("CT_SESSION_MULTIPLEXED")
  })

  test("CT-R2-S1 orders request shape before producer authority before full payload proof", () => {
    const fixture = setupCreateFixture()
    const validRequest = createPayloadRequest(validPayload(fixture.context))
    const unregistered = dispatcher(fixture.main, capability({ plugin_instance: "ghost-plugin", root_session_id: "ghost-root" }))

    expect(errorCode(() => unregistered("create", { ...validRequest, extra: true }))).toBe("CT_PAYLOAD_INVALID")

    const malformedPayload = { ...validRequest, payload: { ...validRequest.payload, kind: "wrong_kind" } }
    expect(errorCode(() => unregistered("create", malformedPayload))).toBe("CT_SESSION_ISOLATION_UNPROVEN")
  })

  test("MCP create tool round-trips through JSON with matching registered producer identity", () => {
    const fixture = createFixture({ mode: "OFF", schema: 4 })
    const mainMetadata = capability(), mainDispatch = dispatcher(fixture.main, mainMetadata)
    const main = mainDispatch("bootstrapMain", mainRequest(fixture.anchor))
    mainMetadata.binding_epoch = main.binding_epoch
    mainDispatch("activate", activationRequest(main.binding_epoch))

    const metadata = capability({ plugin_instance: "mcp-worker", root_session_id: "mcp-root" })
    const processIdentity = opaqueProcess()
    const enabled = createMcpHandler({ cwd: fixture.main, trustedMetadata: { snapshot: () => metadata }, processIdentity: { snapshot: () => processIdentity } })
    const registered = mcpResult(enabled({ id: 0, method: "tools/call", params: { name: "register", arguments: registerRequest() } }))
    metadata.binding_epoch = registered.binding_epoch

    const payload = validPayload(fixture.context)
    const request = createPayloadRequest(payload)
    const first = mcpResult(enabled({ id: 1, method: "tools/call", params: { name: "create", arguments: request } }))
    expect(first).toMatchObject({ state: "DRAFT", generation: 0, replayed: false })
    const second = mcpResult(enabled({ id: 2, method: "tools/call", params: { name: "create", arguments: request } }))
    expect(second).toEqual({ ...first, replayed: true })
  })
})

describe("P4-A3 server-derived validate/publish and durable delivery", () => {
  test("CT-R2-S1..S3/CT-R3-S5 validates a DRAFT handoff to VALIDATED without changing generation and replays exactly", () => {
    const fixture = setupValidateFixture()
    const { request: createRequest, created } = createReadyHandoff(fixture)
    const vRequest = validateRequest(created, createRequest.payload_digest)

    const response = fixture.mainDispatch("validate", vRequest)
    expect(response).toMatchObject({ id: created.id, state: "VALIDATED", generation: 0, replayed: false })

    const db = new Database(fixture.dbPath, { readonly: true })
    const handoff = db.query("SELECT * FROM ct_handoff WHERE id=?").get(created.id)
    expect(handoff.state).toBe("VALIDATED")
    expect(handoff.generation).toBe(0)
    expect(handoff.validation_digest).not.toBeNull()
    expect(handoff.validated_at).not.toBeNull()
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff_transition WHERE operation='VALIDATE'").get().count).toBe(1)
    db.close()

    expect(fixture.mainDispatch("validate", vRequest)).toEqual({ ...response, replayed: true })
    const after = new Database(fixture.dbPath, { readonly: true })
    expect(after.query("SELECT COUNT(*) AS count FROM ct_handoff_transition WHERE operation='VALIDATE'").get().count).toBe(1)
    after.close()

    // The full R1 schema-4 validator recomputes the VALIDATE reverse link,
    // envelope, and evidence/digest on read.
    expect(fixture.mainDispatch("status")).toMatchObject({ mode: "ON", schema_version: 4 })
  })

  test("CT-R2-S1..S3/CT-R3-S5 publishes a VALIDATED handoff to PUBLISHED, creates one PENDING WORK delivery, and replays exactly", () => {
    const fixture = setupValidateFixture()
    const { request: createRequest, created } = createReadyHandoff(fixture)
    fixture.mainDispatch("validate", validateRequest(created, createRequest.payload_digest))

    const pRequest = publishRequest(created.id, 0)
    const response = fixture.mainDispatch("publish", pRequest)
    expect(response).toMatchObject({ id: created.id, state: "PUBLISHED", generation: 0, replayed: false })

    const db = new Database(fixture.dbPath, { readonly: true })
    const handoff = db.query("SELECT * FROM ct_handoff WHERE id=?").get(created.id)
    expect(handoff.state).toBe("PUBLISHED")
    expect(handoff.published_at).not.toBeNull()
    const deliveries = db.query("SELECT * FROM ct_delivery WHERE handoff_id=?").all(created.id)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]).toMatchObject({ purpose: "WORK", delivery_state: "PENDING", handoff_state_snapshot: "PUBLISHED", claim_id: null, generation: 0 })
    expect(deliveries[0].delivery_id).toHaveLength(43)
    db.close()

    expect(fixture.mainDispatch("publish", pRequest)).toEqual({ ...response, replayed: true })
    const after = new Database(fixture.dbPath, { readonly: true })
    expect(after.query("SELECT COUNT(*) AS count FROM ct_delivery").get().count).toBe(1)
    after.close()

    // Continuation `receive` is a non-consuming peek; P4-B projects this
    // fresh PENDING WORK delivery instead of the pre-B {delivery:null}.
    expect(fixture.workerDispatch("receive")).toEqual({ delivery: { delivery_id: deliveries[0].delivery_id, id: created.id, state: "PUBLISHED", generation: 0, purpose: "WORK" } })

    expect(fixture.mainDispatch("status")).toMatchObject({ mode: "ON", schema_version: 4 })
  })

  test("CT-R2-S1..S3 rejects a changed accepted validate/publish request and a new identity naming the same committed scope", () => {
    const fixture = setupValidateFixture()
    const { request: createRequest, created } = createReadyHandoff(fixture)
    const vRequest = validateRequest(created, createRequest.payload_digest)
    fixture.mainDispatch("validate", vRequest)

    const changedValidate = { ...vRequest, payload_digest: `sha256:${"0".repeat(64)}` }
    expect(errorCode(() => fixture.mainDispatch("validate", changedValidate))).toBe("CT_IDEMPOTENCY_CONFLICT")
    const sameScopeValidate = { ...vRequest, request_identity: randomUUID() }
    expect(errorCode(() => fixture.mainDispatch("validate", sameScopeValidate))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const pRequest = publishRequest(created.id, 0)
    fixture.mainDispatch("publish", pRequest)
    const changedPublish = { ...pRequest, eg: 1 }
    expect(errorCode(() => fixture.mainDispatch("publish", changedPublish))).toBe("CT_IDEMPOTENCY_CONFLICT")
    const sameScopePublish = { ...pRequest, request_identity: randomUUID() }
    expect(errorCode(() => fixture.mainDispatch("publish", sameScopePublish))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff_transition WHERE operation='VALIDATE'").get().count).toBe(1)
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff_transition WHERE operation='PUBLISH'").get().count).toBe(1)
    expect(db.query("SELECT COUNT(*) AS count FROM ct_delivery").get().count).toBe(1)
    db.close()
  })

  test("CT-R2-S1..S3 distinguishes wrong legal state (CT_INVALID_TRANSITION) from generation/payload fences (CT_FENCE_MISMATCH)", () => {
    const fixture = setupValidateFixture()
    const { request: createRequest, created } = createReadyHandoff(fixture)

    // publish before validate: wrong legal state, never having consumed a
    // publish scope for this handoff/generation.
    expect(errorCode(() => fixture.mainDispatch("publish", publishRequest(created.id, 0)))).toBe("CT_INVALID_TRANSITION")

    // wrong generation on an otherwise-correct DRAFT validate request
    expect(errorCode(() => fixture.mainDispatch("validate", validateRequest(created, createRequest.payload_digest, { eg: 1 })))).toBe("CT_FENCE_MISMATCH")
    // wrong payload_digest on an otherwise-correct DRAFT validate request
    expect(errorCode(() => fixture.mainDispatch("validate", validateRequest(created, `sha256:${"1".repeat(64)}`)))).toBe("CT_FENCE_MISMATCH")

    const validated = fixture.mainDispatch("validate", validateRequest(created, createRequest.payload_digest))
    expect(validated.state).toBe("VALIDATED")

    // wrong generation on an otherwise-correct VALIDATED publish request
    expect(errorCode(() => fixture.mainDispatch("publish", publishRequest(created.id, 1)))).toBe("CT_FENCE_MISMATCH")

    const published = fixture.mainDispatch("publish", publishRequest(created.id, 0))
    expect(published.state).toBe("PUBLISHED")

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff WHERE state='PUBLISHED'").get().count).toBe(1)
    expect(db.query("SELECT COUNT(*) AS count FROM ct_delivery").get().count).toBe(1)
    db.close()
  })

  test("CT-R3-S5 requires the exact ACTIVE Main identity for validate and publish", () => {
    const fixture = createFixture({ mode: "OFF", schema: 4 })
    const mainMetadata = capability(), mainProcess = opaqueProcess()
    const mainDispatch = dispatcher(fixture.main, mainMetadata, mainProcess)
    const main = mainDispatch("bootstrapMain", mainRequest(fixture.anchor))
    mainMetadata.binding_epoch = main.binding_epoch
    mainDispatch("activate", activationRequest(main.binding_epoch))
    const workerMetadata = capability({ plugin_instance: "worker-plugin", root_session_id: "worker-root" })
    const workerDispatch = dispatcher(fixture.main, workerMetadata)
    const registered = workerDispatch("register", registerRequest())
    workerMetadata.binding_epoch = registered.binding_epoch

    writeFileSync(join(fixture.main, "unit.txt"), "fixture unit contents\n")
    git(fixture.main, ["add", "unit.txt"])
    git(fixture.main, ["commit", "-q", "-m", "add fixture file"])
    const headOid = git(fixture.main, ["rev-parse", "HEAD"])
    const fileDigest = digest(readFileSync(join(fixture.main, "unit.txt")))

    const payload = validateReadyPayload({ context: fixture.context, headOid, fileDigest })
    const createRequest = createPayloadRequest(payload)
    const created = workerDispatch("create", createRequest)
    const vRequest = validateRequest(created, createRequest.payload_digest)

    // the registered worker (PRODUCER/CLAIMANT identity) is not Main
    expect(errorCode(() => workerDispatch("validate", vRequest))).toBe("CT_WORKFLOW_MAIN_REQUIRED")

    // same exact host/plugin/root/process identity as Main, but a stale epoch
    const liveEpoch = mainMetadata.binding_epoch
    mainMetadata.binding_epoch = 999
    expect(errorCode(() => mainDispatch("validate", vRequest))).toBe("CT_FENCE_MISMATCH")
    mainMetadata.binding_epoch = liveEpoch

    const validated = mainDispatch("validate", vRequest)
    expect(validated.state).toBe("VALIDATED")

    const pRequest = publishRequest(created.id, 0)
    expect(errorCode(() => workerDispatch("publish", pRequest))).toBe("CT_WORKFLOW_MAIN_REQUIRED")
    const published = mainDispatch("publish", pRequest)
    expect(published.state).toBe("PUBLISHED")

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff WHERE state='PUBLISHED'").get().count).toBe(1)
    db.close()
  })

  test("P4-A3 fresh validate rejects unresolved ancestry, a missing commit, a symlinked FILE, and digest mismatches without mutation", () => {
    const fixture = setupValidateFixture()

    // missing/nonexistent COMMIT reference
    expectPayloadInvalidAndNoMutation(fixture, badReferencePayload(fixture, { kind: "COMMIT", value: "f".repeat(40), digest: digest("missing-commit") }))

    // FILE reference through a symlink is rejected even though the link
    // target's bytes would otherwise match the declared digest
    const linkPath = join(fixture.main, "linked.txt")
    symlinkSync(join(fixture.main, "unit.txt"), linkPath)
    expectPayloadInvalidAndNoMutation(fixture, badReferencePayload(fixture, { kind: "FILE", value: "linked.txt", digest: fixture.fileDigest }))

    // FILE reference whose declared digest does not match the actual bytes
    expectPayloadInvalidAndNoMutation(fixture, badReferencePayload(fixture, { kind: "FILE", value: "unit.txt", digest: digest("wrong-content") }))

    // source_merge.sha resolves to a real commit that is not an ancestor of
    // canonical Main HEAD
    const unrelatedRoot = mkdtempSync(join(tmpdir(), "control-tower-unrelated-"))
    temporaryDirectories.push(unrelatedRoot)
    git(unrelatedRoot, ["init", "-q", "-b", "main"])
    git(unrelatedRoot, ["config", "user.email", "tower-test@example.invalid"])
    git(unrelatedRoot, ["config", "user.name", "Tower Test"])
    git(unrelatedRoot, ["commit", "-q", "--allow-empty", "-m", "unrelated"])
    git(fixture.main, ["fetch", "-q", unrelatedRoot, "main"])
    const unrelatedOid = git(fixture.main, ["rev-parse", "FETCH_HEAD"])
    const unrelatedSourceDigest = digest(canonical({ source_kind: "TEST", source_ref: "fixture", source_merge_sha: unrelatedOid, source_merge_url: "https://example.invalid/merge" }))
    expectPayloadInvalidAndNoMutation(fixture, validPayload(fixture.context, {
      repository: {
        repository_fingerprint: digest(canonical({ kind: "canonical_repo_v1", path: fixture.context.canonical_repo })),
        git_common_dir_fingerprint: digest(canonical({ kind: "git_common_dir_v1", path: fixture.context.git_common_dir })),
        source_merge: { sha: unrelatedOid, url: "https://example.invalid/merge" },
      },
      provenance: { source_kind: "TEST", source_ref: "fixture", source_digest: unrelatedSourceDigest },
    }))

    // source_merge.sha that never resolves to any commit at all
    const missingSha = "e".repeat(40)
    const missingSourceDigest = digest(canonical({ source_kind: "TEST", source_ref: "fixture", source_merge_sha: missingSha, source_merge_url: "https://example.invalid/merge" }))
    expectPayloadInvalidAndNoMutation(fixture, validPayload(fixture.context, {
      repository: {
        repository_fingerprint: digest(canonical({ kind: "canonical_repo_v1", path: fixture.context.canonical_repo })),
        git_common_dir_fingerprint: digest(canonical({ kind: "git_common_dir_v1", path: fixture.context.git_common_dir })),
        source_merge: { sha: missingSha, url: "https://example.invalid/merge" },
      },
      provenance: { source_kind: "TEST", source_ref: "fixture", source_digest: missingSourceDigest },
    }))
  })

  test("CT-R2-S1/CT-R3-S5 gates OFF and ROLLING_BACK before validate/publish authority checks", () => {
    const off = setupValidateFixture()
    const { request: offCreateRequest, created: offCreated } = createReadyHandoff(off)
    const offDb = new Database(off.dbPath)
    offDb.run("UPDATE ct_continuation_state SET mode='OFF'")
    offDb.close()
    expect(errorCode(() => off.mainDispatch("validate", validateRequest(offCreated, offCreateRequest.payload_digest)))).toBe("CT_CONTINUATION_OFF")
    expect(errorCode(() => off.mainDispatch("publish", publishRequest(offCreated.id, 0)))).toBe("CT_CONTINUATION_OFF")

    const rolling = setupValidateFixture()
    const { request: rollingCreateRequest, created: rollingCreated } = createReadyHandoff(rolling)
    const rollingDb = new Database(rolling.dbPath)
    const activeMain = rollingDb.query("SELECT main_binding_id FROM ct_main_binding WHERE binding_status='ACTIVE'").get()
    rollingDb.run("UPDATE ct_continuation_state SET mode='ROLLING_BACK'")
    rollingDb.run("UPDATE ct_rollback_lease SET rollback_epoch=1,lease_status='ACTIVE',lease_version=1,owner_main_binding_id=?,lease_expires_at='2026-07-22T00:00:00.000Z'", [activeMain.main_binding_id])
    rollingDb.close()
    expect(errorCode(() => rolling.mainDispatch("validate", validateRequest(rollingCreated, rollingCreateRequest.payload_digest)))).toBe("CT_ROLLBACK_IN_PROGRESS")
    expect(errorCode(() => rolling.mainDispatch("publish", publishRequest(rollingCreated.id, 0)))).toBe("CT_ROLLBACK_IN_PROGRESS")
  })

  test("MCP validate and publish tools round-trip through JSON and complete the WORK delivery projection", () => {
    const fixture = createFixture({ mode: "OFF", schema: 4 })
    const mainMetadata = capability(), mainProcess = opaqueProcess()
    const mainDispatch = dispatcher(fixture.main, mainMetadata, mainProcess)
    const main = mainDispatch("bootstrapMain", mainRequest(fixture.anchor))
    mainMetadata.binding_epoch = main.binding_epoch
    mainDispatch("activate", activationRequest(main.binding_epoch))

    writeFileSync(join(fixture.main, "unit.txt"), "fixture unit contents\n")
    git(fixture.main, ["add", "unit.txt"])
    git(fixture.main, ["commit", "-q", "-m", "add fixture file"])
    const headOid = git(fixture.main, ["rev-parse", "HEAD"])
    const fileDigest = digest(readFileSync(join(fixture.main, "unit.txt")))

    const workerMetadata = capability({ plugin_instance: "mcp-worker", root_session_id: "mcp-root" })
    const workerProcess = opaqueProcess()
    const workerEnabled = createMcpHandler({ cwd: fixture.main, trustedMetadata: { snapshot: () => workerMetadata }, processIdentity: { snapshot: () => workerProcess } })
    const registered = mcpResult(workerEnabled({ id: 0, method: "tools/call", params: { name: "register", arguments: registerRequest() } }))
    workerMetadata.binding_epoch = registered.binding_epoch

    const payload = validateReadyPayload({ context: fixture.context, headOid, fileDigest })
    const createRequest = createPayloadRequest(payload)
    const created = mcpResult(workerEnabled({ id: 1, method: "tools/call", params: { name: "create", arguments: createRequest } }))
    expect(created).toMatchObject({ state: "DRAFT", generation: 0 })

    const mainEnabled = createMcpHandler({ cwd: fixture.main, trustedMetadata: { snapshot: () => mainMetadata }, processIdentity: { snapshot: () => mainProcess } })
    const vRequest = validateRequest(created, createRequest.payload_digest)
    const validated = mcpResult(mainEnabled({ id: 2, method: "tools/call", params: { name: "validate", arguments: vRequest } }))
    expect(validated).toMatchObject({ state: "VALIDATED", generation: 0, replayed: false })
    expect(mcpResult(mainEnabled({ id: 3, method: "tools/call", params: { name: "validate", arguments: vRequest } }))).toEqual({ ...validated, replayed: true })

    const pRequest = publishRequest(created.id, 0)
    const published = mcpResult(mainEnabled({ id: 4, method: "tools/call", params: { name: "publish", arguments: pRequest } }))
    expect(published).toMatchObject({ state: "PUBLISHED", generation: 0, replayed: false })
    expect(mcpResult(mainEnabled({ id: 5, method: "tools/call", params: { name: "publish", arguments: pRequest } }))).toEqual({ ...published, replayed: true })

    // P4-B projects the fresh PENDING WORK delivery instead of the pre-B
    // {delivery:null}.
    expect(mcpResult(workerEnabled({ id: 6, method: "tools/call", params: { name: "receive" } }))).toMatchObject({ delivery: { id: created.id, state: "PUBLISHED", generation: 0, purpose: "WORK" } })
  })
})

describe("P4-B exact non-consuming receive and atomic claim", () => {
  const absentId = () => randomBytes(32).toString("base64url")
  const publishedHandoff = (fixture) => {
    const { payload, request: createRequest, created } = createReadyHandoff(fixture)
    fixture.mainDispatch("validate", validateRequest(created, createRequest.payload_digest))
    const published = fixture.mainDispatch("publish", publishRequest(created.id, 0))
    const db = new Database(fixture.dbPath, { readonly: true })
    const deliveryId = db.query("SELECT delivery_id FROM ct_delivery WHERE handoff_id=?").get(created.id).delivery_id
    db.close()
    return { payload, created, published, deliveryId }
  }
  const claimRequest = (handoffId, deliveryId, generation, overrides = {}) =>
    ({ request_identity: randomUUID(), delivery_id: deliveryId, id: handoffId, es: "PUBLISHED", eg: generation, purpose: "WORK", ...overrides })

  test("CT-R6-S4 receive projects the PENDING WORK delivery after publish, stays a non-mutating peek, and returns null once claimed", () => {
    const fixture = setupValidateFixture()
    const { created, deliveryId } = publishedHandoff(fixture)

    const peek = fixture.workerDispatch("receive")
    expect(peek).toEqual({ delivery: { delivery_id: deliveryId, id: created.id, state: "PUBLISHED", generation: 0, purpose: "WORK" } })

    // CT-R6-S5: receive again — the same delivery is still PENDING/claimable,
    // with no budget, claim, or delivery mutation from the peek itself.
    expect(fixture.workerDispatch("receive")).toEqual(peek)
    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT delivery_state FROM ct_delivery WHERE delivery_id=?").get(deliveryId).delivery_state).toBe("PENDING")
    expect(db.query("SELECT COUNT(*) AS count FROM ct_claim").get().count).toBe(0)
    expect(db.query("SELECT COUNT(*) AS count FROM ct_session_budget").get().count).toBe(0)
    db.close()

    const claimed = fixture.workerDispatch("claim", claimRequest(created.id, deliveryId, 0))
    expect(claimed).toMatchObject({ id: created.id, state: "CLAIMED", generation: 0, replayed: false, delivery_id: deliveryId, purpose: "WORK" })
    expect(fixture.workerDispatch("receive")).toEqual({ delivery: null })
  })

  test("CT-R6-S6 claim atomically creates one LIVE claim, CLAIMED delivery/handoff, and consumes one budget unit; exact replay withholds the token and consumes no extra unit", () => {
    const fixture = setupValidateFixture()
    const { created, deliveryId } = publishedHandoff(fixture)
    const request = claimRequest(created.id, deliveryId, 0)

    const response = fixture.workerDispatch("claim", request)
    expect(response).toMatchObject({ id: created.id, state: "CLAIMED", generation: 0, replayed: false, delivery_id: deliveryId, purpose: "WORK" })
    expect(response.token).toMatch(/^[A-Za-z0-9_-]{43}$/)

    const db = new Database(fixture.dbPath, { readonly: true })
    const claim = db.query("SELECT * FROM ct_claim WHERE delivery_id=?").get(deliveryId)
    expect(claim.claim_state).toBe("LIVE")
    expect(claim.token_hash).toBe(digest(Buffer.from(response.token)))
    expect(claim.token_salt).not.toBe(response.token)
    const delivery = db.query("SELECT * FROM ct_delivery WHERE delivery_id=?").get(deliveryId)
    expect(delivery.delivery_state).toBe("CLAIMED")
    expect(delivery.claim_id).toBe(claim.claim_id)
    expect(db.query("SELECT state FROM ct_handoff WHERE id=?").get(created.id).state).toBe("CLAIMED")
    const budget = db.query("SELECT * FROM ct_session_budget").get()
    expect(budget.consumed_count).toBe(1)
    expect(budget.last_claim_id).toBe(claim.claim_id)
    db.close()

    const replay = fixture.workerDispatch("claim", request)
    expect(replay).toEqual({ id: created.id, state: "CLAIMED", generation: 0, replayed: true, delivery_id: deliveryId, purpose: "WORK" })
    expect(replay.token).toBeUndefined()

    const after = new Database(fixture.dbPath, { readonly: true })
    expect(after.query("SELECT COUNT(*) AS count FROM ct_claim").get().count).toBe(1)
    expect(after.query("SELECT consumed_count FROM ct_session_budget").get().consumed_count).toBe(1)
    after.close()

    // The full R1 schema-4 validator recomputes the CLAIM reverse link,
    // envelope, claimant fence, token-hash commitment, and budget on read.
    expect(fixture.mainDispatch("status")).toMatchObject({ mode: "ON", schema_version: 4 })
  })

  test("claim response/envelope keys never carry token/salt/hash beyond the one fresh public bearer", () => {
    const fixture = setupValidateFixture()
    const { created, deliveryId } = publishedHandoff(fixture)
    const request = claimRequest(created.id, deliveryId, 0)

    const fresh = fixture.workerDispatch("claim", request)
    expect(Object.keys(fresh).sort()).toEqual(["delivery_id", "generation", "id", "purpose", "replayed", "state", "token"])
    const replay = fixture.workerDispatch("claim", request)
    expect(Object.keys(replay).sort()).toEqual(["delivery_id", "generation", "id", "purpose", "replayed", "state"])

    expect(JSON.stringify(fixture.mainDispatch("status"))).not.toContain(fresh.token)
    expect(fixture.workerDispatch("receive")).toEqual({ delivery: null })
  })

  test("CT-R6-S2 exhausts the one-claim session budget on a second distinct claim in the same root session scope", () => {
    const fixture = setupValidateFixture()
    const first = publishedHandoff(fixture)
    fixture.workerDispatch("claim", claimRequest(first.created.id, first.deliveryId, 0))

    const second = publishedHandoff(fixture)
    expect(errorCode(() => fixture.workerDispatch("claim", claimRequest(second.created.id, second.deliveryId, 0)))).toBe("CT_SESSION_BUDGET_EXHAUSTED")

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_claim").get().count).toBe(1)
    expect(db.query("SELECT delivery_state FROM ct_delivery WHERE delivery_id=?").get(second.deliveryId).delivery_state).toBe("PENDING")
    expect(db.query("SELECT state FROM ct_handoff WHERE id=?").get(second.created.id).state).toBe("PUBLISHED")
    expect(db.query("SELECT COUNT(*) AS count FROM ct_idempotency WHERE operation='claim'").get().count).toBe(1)
    expect(db.query("SELECT consumed_count FROM ct_session_budget").get().consumed_count).toBe(1)
    db.close()
  })

  test("CT-R6-S1 two-claim serialization: a changed accepted request and a new identity naming the same committed delivery scope are CT_IDEMPOTENCY_CONFLICT", () => {
    const fixture = setupValidateFixture()
    const { created, deliveryId } = publishedHandoff(fixture)
    const winner = claimRequest(created.id, deliveryId, 0)
    const first = fixture.workerDispatch("claim", winner)
    expect(first.replayed).toBe(false)

    const changedTuple = { ...winner, purpose: "ATTESTATION_REDELIVERY", es: "COMPLETION_ATTESTED" }
    expect(errorCode(() => fixture.workerDispatch("claim", changedTuple))).toBe("CT_IDEMPOTENCY_CONFLICT")
    const sameScopeClaim = { ...winner, request_identity: randomUUID() }
    expect(errorCode(() => fixture.workerDispatch("claim", sameScopeClaim))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_claim").get().count).toBe(1)
    expect(db.query("SELECT COUNT(*) AS count FROM ct_idempotency WHERE operation='claim'").get().count).toBe(1)
    db.close()
  })

  test("distinguishes incompatible handoff state/purpose (CT_INVALID_TRANSITION) from generation fences (CT_FENCE_MISMATCH), and CT_NOT_FOUND for an absent delivery or handoff", () => {
    const fixture = setupValidateFixture()
    const { created, deliveryId } = publishedHandoff(fixture)

    // purpose/es naming ATTESTATION_REDELIVERY/COMPLETION_ATTESTED against a
    // real WORK/PUBLISHED delivery: incompatible handoff state and purpose.
    expect(errorCode(() => fixture.workerDispatch("claim", claimRequest(created.id, deliveryId, 0, { purpose: "ATTESTATION_REDELIVERY", es: "COMPLETION_ATTESTED" }))))
      .toBe("CT_INVALID_TRANSITION")

    // otherwise-correct request, wrong generation
    expect(errorCode(() => fixture.workerDispatch("claim", claimRequest(created.id, deliveryId, 1)))).toBe("CT_FENCE_MISMATCH")

    // absent delivery, real handoff
    expect(errorCode(() => fixture.workerDispatch("claim", claimRequest(created.id, absentId(), 0)))).toBe("CT_NOT_FOUND")
    // real delivery, absent handoff id
    expect(errorCode(() => fixture.workerDispatch("claim", claimRequest(absentId(), deliveryId, 0)))).toBe("CT_NOT_FOUND")

    const claimed = fixture.workerDispatch("claim", claimRequest(created.id, deliveryId, 0))
    expect(claimed.state).toBe("CLAIMED")

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_claim").get().count).toBe(1)
    db.close()
  })

  test("orders claim request shape before claimant authority before delivery/handoff existence before the CAS bucket", () => {
    const fixture = setupValidateFixture()
    const { created, deliveryId } = publishedHandoff(fixture)
    const unregistered = dispatcher(fixture.main, capability({ plugin_instance: "ghost-plugin", root_session_id: "ghost-root" }))

    // malformed shape wins even for an unregistered identity
    expect(errorCode(() => unregistered("claim", { ...claimRequest(created.id, deliveryId, 0), extra: true }))).toBe("CT_PAYLOAD_INVALID")
    // well-formed but unregistered identity wins over an absent delivery
    expect(errorCode(() => unregistered("claim", claimRequest(created.id, absentId(), 0)))).toBe("CT_SESSION_ISOLATION_UNPROVEN")

    // registered claimant: delivery existence before handoff existence before CAS
    expect(errorCode(() => fixture.workerDispatch("claim", claimRequest(created.id, absentId(), 0)))).toBe("CT_NOT_FOUND")
    expect(errorCode(() => fixture.workerDispatch("claim", claimRequest(absentId(), deliveryId, 0)))).toBe("CT_NOT_FOUND")
    expect(errorCode(() => fixture.workerDispatch("claim", claimRequest(created.id, deliveryId, 1)))).toBe("CT_FENCE_MISMATCH")
  })

  test("CT-R6-S1/S4 gates OFF and ROLLING_BACK before claim request/authority checks", () => {
    const off = setupValidateFixture()
    const { created: offCreated, deliveryId: offDeliveryId } = publishedHandoff(off)
    const offDb = new Database(off.dbPath)
    offDb.run("UPDATE ct_continuation_state SET mode='OFF'")
    offDb.close()
    expect(errorCode(() => off.workerDispatch("claim", claimRequest(offCreated.id, offDeliveryId, 0)))).toBe("CT_CONTINUATION_OFF")

    const rolling = setupValidateFixture()
    const { created: rollingCreated, deliveryId: rollingDeliveryId } = publishedHandoff(rolling)
    const rollingDb = new Database(rolling.dbPath)
    const activeMain = rollingDb.query("SELECT main_binding_id FROM ct_main_binding WHERE binding_status='ACTIVE'").get()
    rollingDb.run("UPDATE ct_continuation_state SET mode='ROLLING_BACK'")
    rollingDb.run("UPDATE ct_rollback_lease SET rollback_epoch=1,lease_status='ACTIVE',lease_version=1,owner_main_binding_id=?,lease_expires_at='2026-07-22T00:00:00.000Z'", [activeMain.main_binding_id])
    rollingDb.close()
    expect(errorCode(() => rolling.workerDispatch("claim", claimRequest(rollingCreated.id, rollingDeliveryId, 0)))).toBe("CT_ROLLBACK_IN_PROGRESS")
  })

  test("MCP claim tool round-trips through JSON, returns a fresh bearer once, and receive projects then clears the delivery", () => {
    const fixture = createFixture({ mode: "OFF", schema: 4 })
    const mainMetadata = capability(), mainProcess = opaqueProcess()
    const mainDispatch = dispatcher(fixture.main, mainMetadata, mainProcess)
    const main = mainDispatch("bootstrapMain", mainRequest(fixture.anchor))
    mainMetadata.binding_epoch = main.binding_epoch
    mainDispatch("activate", activationRequest(main.binding_epoch))

    writeFileSync(join(fixture.main, "unit.txt"), "fixture unit contents\n")
    git(fixture.main, ["add", "unit.txt"])
    git(fixture.main, ["commit", "-q", "-m", "add fixture file"])
    const headOid = git(fixture.main, ["rev-parse", "HEAD"])
    const fileDigest = digest(readFileSync(join(fixture.main, "unit.txt")))

    const workerMetadata = capability({ plugin_instance: "mcp-worker", root_session_id: "mcp-root" })
    const workerProcess = opaqueProcess()
    const workerEnabled = createMcpHandler({ cwd: fixture.main, trustedMetadata: { snapshot: () => workerMetadata }, processIdentity: { snapshot: () => workerProcess } })
    const registered = mcpResult(workerEnabled({ id: 0, method: "tools/call", params: { name: "register", arguments: registerRequest() } }))
    workerMetadata.binding_epoch = registered.binding_epoch

    const payload = validateReadyPayload({ context: fixture.context, headOid, fileDigest })
    const createRequest = createPayloadRequest(payload)
    const created = mcpResult(workerEnabled({ id: 1, method: "tools/call", params: { name: "create", arguments: createRequest } }))

    const mainEnabled = createMcpHandler({ cwd: fixture.main, trustedMetadata: { snapshot: () => mainMetadata }, processIdentity: { snapshot: () => mainProcess } })
    mcpResult(mainEnabled({ id: 2, method: "tools/call", params: { name: "validate", arguments: validateRequest(created, createRequest.payload_digest) } }))
    mcpResult(mainEnabled({ id: 3, method: "tools/call", params: { name: "publish", arguments: publishRequest(created.id, 0) } }))

    const peek = mcpResult(workerEnabled({ id: 4, method: "tools/call", params: { name: "receive" } }))
    expect(peek.delivery).toMatchObject({ id: created.id, state: "PUBLISHED", generation: 0, purpose: "WORK" })

    const cRequest = claimRequest(created.id, peek.delivery.delivery_id, 0)
    const claimed = mcpResult(workerEnabled({ id: 5, method: "tools/call", params: { name: "claim", arguments: cRequest } }))
    expect(claimed).toMatchObject({ state: "CLAIMED", generation: 0, replayed: false, delivery_id: peek.delivery.delivery_id, purpose: "WORK" })
    expect(typeof claimed.token).toBe("string")

    const replayed = mcpResult(workerEnabled({ id: 6, method: "tools/call", params: { name: "claim", arguments: cRequest } }))
    expect(replayed).toEqual({ id: claimed.id, state: claimed.state, generation: claimed.generation, replayed: true, delivery_id: claimed.delivery_id, purpose: claimed.purpose })

    expect(mcpResult(workerEnabled({ id: 7, method: "tools/call", params: { name: "receive" } }))).toEqual({ delivery: null })
  })
})
