// P5-A: `ack` (CLAIMED -> STARTED) gated on a complete persisted effect
// manifest and its recomputed pre-start boundary. Every fixture here is real
// P4 state produced by actually running create -> validate -> publish ->
// claim; no synthetic CLAIMED/STARTED row is ever inserted directly.
import { afterEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import * as tower from "../core.mjs"
import { createMcpHandler } from "../mcp.mjs"
import { git as runGit } from "./helpers/git.mjs"

const temporaryDirectories = []
const git = (cwd, args) => runGit(cwd, args, { encoding: "utf8" }).trim()
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
const mainRequest = (anchor, epoch = 0, request_identity = randomUUID()) => ({
  request_identity, expected_anchor_id: anchor.anchor_id, expected_binding_epoch: epoch,
})
const registerRequest = (epoch = 0, state = "ABSENT", request_identity = randomUUID()) => ({
  request_identity, expected_binding_epoch: epoch, expected_binding_state: state,
})
const activationRequest = (epoch = 1, evidence_digest = digest("activation-evidence"), request_identity = randomUUID()) => ({
  request_identity, expected_mode: "OFF", expected_binding_epoch: epoch, evidence_digest,
})
const mcpResult = (response) => {
  if (response.isError) throw new Error(response.content[0].text)
  return JSON.parse(response.content[0].text)
}
const capability = (overrides = {}) => ({
  host_process_instance: "host-process-a", plugin_instance: "plugin-a", root_session_id: "root-a", binding_epoch: 0, ...overrides,
})
const dispatcher = (main, metadata, identity = opaqueProcess()) => tower.createContinuationDispatcher({
  cwd: main, trustedMetadata: { snapshot: () => metadata }, processIdentity: { snapshot: () => identity },
})
const createFixture = ({ mode = "OFF" } = {}) => {
  const root = mkdtempSync(join(tmpdir(), "control-tower-lifecycle-"))
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
  db.close()
  for (let version = 0; version < 4; version++)
    tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version: version, target_schema_version: version + 1, expected_mode: "OFF" }, main)
  if (mode !== "OFF") {
    const writable = new Database(dbPath)
    writable.run("UPDATE ct_continuation_state SET mode=?", [mode])
    writable.close()
  }
  // `validate` reads live Git state, so the fixture needs a real resolvable
  // commit and a real tracked file, exactly as P4-A3's own fixtures do.
  writeFileSync(join(main, "unit.txt"), "lifecycle fixture unit contents\n")
  git(main, ["add", "unit.txt"])
  git(main, ["commit", "-q", "-m", "add fixture file"])
  const headOid = git(main, ["rev-parse", "HEAD"])
  const fileDigest = digest(readFileSync(join(main, "unit.txt")))
  return { root, main, context, anchor, dbPath, headOid, fileDigest }
}
const validPayload = (fixture, overrides = {}) => {
  const sourceMerge = { sha: fixture.headOid, url: "https://example.invalid/merge" }
  const referenceValue = "https://example.invalid/reference"
  const nextUnit = {
    unit_id: "ack-unit", scope: "ack test scope", dependencies: [],
    references: [
      { kind: "COMMIT", value: fixture.headOid, digest: digest("commit-marker") },
      { kind: "FILE", value: "unit.txt", digest: fixture.fileDigest },
      { kind: "URL", value: referenceValue, digest: digest(referenceValue) },
    ],
  }
  const snapshots = [{ name: "snapshot-a", digest: digest("snapshot-a") }]
  const sourceDigest = digest(canonical({ source_kind: "TEST", source_ref: "fixture", source_merge_sha: sourceMerge.sha, source_merge_url: sourceMerge.url }))
  return {
    kind: "control_tower_handoff_v1", version: 1,
    lineage: { lineage_id: randomUUID(), revision: 1 },
    repository: {
      repository_fingerprint: digest(canonical({ kind: "canonical_repo_v1", path: fixture.context.canonical_repo })),
      git_common_dir_fingerprint: digest(canonical({ kind: "git_common_dir_v1", path: fixture.context.git_common_dir })),
      source_merge: sourceMerge,
    },
    next_unit: nextUnit, snapshots,
    provenance: { source_kind: "TEST", source_ref: "fixture", source_digest: sourceDigest },
    decision_summary: "ack fixture decision",
    ...overrides,
  }
}
const createPayloadRequest = (payload, request_identity = randomUUID()) =>
  ({ request_identity, lineage_id: payload.lineage.lineage_id, revision: payload.lineage.revision, payload, payload_digest: digest(canonical(payload)) })
const validateRequest = (created, payload_digest, overrides = {}) =>
  ({ request_identity: randomUUID(), id: created.id, es: "DRAFT", eg: created.generation, payload_digest, ...overrides })
const publishRequest = (handoffId, generation, overrides = {}) =>
  ({ request_identity: randomUUID(), id: handoffId, es: "VALIDATED", eg: generation, ...overrides })
const claimRequest = (handoffId, deliveryId, generation, overrides = {}) =>
  ({ request_identity: randomUUID(), delivery_id: deliveryId, id: handoffId, es: "PUBLISHED", eg: generation, purpose: "WORK", ...overrides })

// Real P4 chain: create -> validate -> publish, stopping short of claim so
// tests can exercise ack against a legal-but-wrong (not yet CLAIMED) state.
const setupPublishedFixture = () => {
  const fixture = createFixture()
  const mainMetadata = capability(), mainIdentity = opaqueProcess(), mainDispatch = dispatcher(fixture.main, mainMetadata, mainIdentity)
  const main = mainDispatch("bootstrapMain", mainRequest(fixture.anchor))
  mainMetadata.binding_epoch = main.binding_epoch
  mainDispatch("activate", activationRequest(main.binding_epoch))
  const workerMetadata = capability({ plugin_instance: "worker-plugin", root_session_id: "worker-root" })
  const workerIdentity = opaqueProcess()
  const workerDispatch = dispatcher(fixture.main, workerMetadata, workerIdentity)
  const registered = workerDispatch("register", registerRequest())
  workerMetadata.binding_epoch = registered.binding_epoch

  const payload = validPayload(fixture)
  const createReq = createPayloadRequest(payload)
  const created = workerDispatch("create", createReq)
  mainDispatch("validate", validateRequest(created, createReq.payload_digest))
  const published = mainDispatch("publish", publishRequest(created.id, 0))
  const db = new Database(fixture.dbPath, { readonly: true })
  const deliveryId = db.query("SELECT delivery_id FROM ct_delivery WHERE handoff_id=?").get(created.id).delivery_id
  db.close()
  return { ...fixture, mainDispatch, mainMetadata, mainIdentity, workerDispatch, workerMetadata, workerIdentity, created, published, deliveryId }
}
// Full P4 chain: create -> validate -> publish -> claim, all real. Returns
// the fresh bearer token and everything ack needs.
const setupClaimedFixture = () => {
  const fixture = setupPublishedFixture()
  const claimed = fixture.workerDispatch("claim", claimRequest(fixture.created.id, fixture.deliveryId, 0))
  return { ...fixture, token: claimed.token }
}
// Real P4+P5-A chain: create -> validate -> publish -> claim -> ack, all
// real. Returns the STARTED handoff attestCompletion acts on.
const setupStartedFixture = () => {
  const fixture = setupClaimedFixture()
  const started = fixture.workerDispatch("ack", ackRequest(fixture))
  return { ...fixture, started }
}

const effect = (index, overrides = {}) => ({
  effect_index: index, target_kind: "DATABASE", target: `table:unit-${index}`, operation: "UPDATE",
  observability: "OBSERVABLE", compensatability: "COMPENSATABLE", pre_state_digest: digest(`pre-state-${index}`), ...overrides,
})
const boundaryDigest = (id, generation, effects) => digest(canonical({ kind: "effect_boundary_v1", version: 1, id, generation,
  effects: effects.map(({ effect_index, target_kind, target, pre_state_digest }) => ({ effect_index, target_kind, target, pre_state_digest })) }))
const effectManifest = (id, generation, effects = [effect(0)]) =>
  ({ kind: "effect_manifest_v1", version: 1, id, generation, effects, pre_start_boundary_digest: boundaryDigest(id, generation, effects) })
const ackRequest = (fixture, overrides = {}) => ({
  request_identity: randomUUID(), delivery_id: fixture.deliveryId, id: fixture.created.id, es: "CLAIMED", eg: 0,
  purpose: "WORK", token: fixture.token, effect_manifest: effectManifest(fixture.created.id, 0), ...overrides,
})

afterEach(() => { for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true }) })

describe("P5-A effects and ack", () => {
  test("CT-R1-S1/CT-R12-S2 ack records the effect manifest and moves CLAIMED to STARTED", () => {
    const fixture = setupClaimedFixture()
    const request = ackRequest(fixture)

    const response = fixture.workerDispatch("ack", request)
    expect(response).toEqual({ id: fixture.created.id, state: "STARTED", generation: 0, replayed: false })

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT state FROM ct_handoff WHERE id=?").get(fixture.created.id).state).toBe("STARTED")
    expect(db.query("SELECT delivery_state FROM ct_delivery WHERE delivery_id=?").get(fixture.deliveryId).delivery_state).toBe("CLAIMED")
    expect(db.query("SELECT claim_state FROM ct_claim WHERE delivery_id=?").get(fixture.deliveryId).claim_state).toBe("LIVE")
    const transition = db.query("SELECT * FROM ct_handoff_transition WHERE operation='ACK'").get()
    expect(transition).toMatchObject({ from_state: "CLAIMED", to_state: "STARTED", authority_kind: "CLAIMANT", generation: 0 })
    const envelope = JSON.parse(db.query("SELECT response_json FROM ct_idempotency WHERE operation='ack'").get().response_json)
    expect(envelope.kind).toBe("ack_response_envelope_v1")
    expect(envelope.evidence.request.effect_manifest).toEqual(request.effect_manifest)
    expect(envelope.evidence.request.token).toBeUndefined()
    expect(JSON.stringify(envelope)).not.toContain(fixture.token)
    db.close()

    // Every subsequent schema-4 read re-verifies this exact ACK row.
    expect(fixture.mainDispatch("status")).toMatchObject({ mode: "ON", schema_version: 4 })
  })

  test("CT-R3-S1 exact ack replay returns replayed:true; a changed tuple or new identity for the same scope is CT_IDEMPOTENCY_CONFLICT", () => {
    const fixture = setupClaimedFixture()
    const request = ackRequest(fixture)
    const first = fixture.workerDispatch("ack", request)
    expect(first.replayed).toBe(false)

    const replay = fixture.workerDispatch("ack", request)
    expect(replay).toEqual({ id: fixture.created.id, state: "STARTED", generation: 0, replayed: true })

    const changedManifest = { ...request, effect_manifest: effectManifest(fixture.created.id, 0, [effect(0), effect(1)]) }
    expect(errorCode(() => fixture.workerDispatch("ack", changedManifest))).toBe("CT_IDEMPOTENCY_CONFLICT")
    const sameScope = { ...request, request_identity: randomUUID() }
    expect(errorCode(() => fixture.workerDispatch("ack", sameScope))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff_transition WHERE operation='ACK'").get().count).toBe(1)
    db.close()
  })

  test("CT-R12-S1 an incomplete, malformed, or boundary-mismatched manifest is CT_EFFECT_MANIFEST_INVALID without STARTED or any effect", () => {
    const variants = {
      missing: undefined,
      "not-an-object": ["array-not-object"],
      "wrong-id": (_fixture) => effectManifest(randomBytes(32).toString("base64url"), 0),
      "wrong-generation": (fixture) => effectManifest(fixture.created.id, 1),
      "empty-effects": (fixture) => ({ ...effectManifest(fixture.created.id, 0), effects: [] }),
      "non-contiguous-index": (fixture) => effectManifest(fixture.created.id, 0, [effect(0), effect(2)]),
      "extra-key": (fixture) => ({ ...effectManifest(fixture.created.id, 0), extra: true }),
      "bad-target-kind": (fixture) => effectManifest(fixture.created.id, 0, [effect(0, { target_kind: "MEMORY" })]),
      "bad-digest": (fixture) => effectManifest(fixture.created.id, 0, [effect(0, { pre_state_digest: "not-a-digest" })]),
      "wrong-boundary": (fixture) => ({ ...effectManifest(fixture.created.id, 0), pre_start_boundary_digest: digest("wrong-boundary") }),
    }
    for (const [name, build] of Object.entries(variants)) {
      const fixture = setupClaimedFixture()
      const before = readFileSync(fixture.dbPath)
      const effect_manifest = typeof build === "function" ? build(fixture) : build
      expect({ name, code: errorCode(() => fixture.workerDispatch("ack", ackRequest(fixture, { effect_manifest }))) }).toEqual({ name, code: "CT_EFFECT_MANIFEST_INVALID" })
      expect(readFileSync(fixture.dbPath)).toEqual(before)
    }
  })

  test("CT-R1-S5 ack fails closed and mutates nothing on wrong token, wrong state, or ATTESTATION_REDELIVERY purpose", () => {
    const wrongToken = setupClaimedFixture()
    const beforeToken = readFileSync(wrongToken.dbPath)
    expect(errorCode(() => wrongToken.workerDispatch("ack", ackRequest(wrongToken, { token: randomBytes(32).toString("base64url") })))).toBe("CT_TOKEN_MISMATCH")
    expect(readFileSync(wrongToken.dbPath)).toEqual(beforeToken)

    // Published but never claimed: handoff.state is PUBLISHED, not CLAIMED —
    // a legal-but-wrong state, not an idempotency collision.
    const notClaimed = setupPublishedFixture()
    const beforeNotClaimed = readFileSync(notClaimed.dbPath)
    const placeholderToken = randomBytes(32).toString("base64url")
    expect(errorCode(() => notClaimed.workerDispatch("ack", ackRequest({ ...notClaimed, token: placeholderToken })))).toBe("CT_INVALID_TRANSITION")
    expect(readFileSync(notClaimed.dbPath)).toEqual(beforeNotClaimed)

    const redelivery = setupClaimedFixture()
    const beforeRedelivery = readFileSync(redelivery.dbPath)
    expect(errorCode(() => redelivery.workerDispatch("ack", ackRequest(redelivery, { purpose: "ATTESTATION_REDELIVERY" })))).toBe("CT_PAYLOAD_INVALID")
    expect(readFileSync(redelivery.dbPath)).toEqual(beforeRedelivery)
  })

  test("orders ack request shape before claimant authority before delivery/handoff existence before the CAS/manifest bucket", () => {
    const fixture = setupClaimedFixture()
    expect(errorCode(() => fixture.workerDispatch("ack", { ...ackRequest(fixture), extra: true }))).toBe("CT_PAYLOAD_INVALID")

    const strangerMetadata = capability({ plugin_instance: "stranger-plugin", root_session_id: "stranger-root" })
    const strangerDispatch = dispatcher(fixture.main, strangerMetadata)
    expect(errorCode(() => strangerDispatch("ack", ackRequest(fixture)))).toBe("CT_SESSION_ISOLATION_UNPROVEN")

    expect(errorCode(() => fixture.workerDispatch("ack", ackRequest(fixture, { delivery_id: randomBytes(32).toString("base64url") })))).toBe("CT_NOT_FOUND")
    expect(errorCode(() => fixture.workerDispatch("ack", ackRequest(fixture, { id: randomBytes(32).toString("base64url") })))).toBe("CT_NOT_FOUND")

    // Wrong generation: existence resolves, but the fence check runs before
    // the manifest bucket.
    const beforeWrongGeneration = readFileSync(fixture.dbPath)
    expect(errorCode(() => fixture.workerDispatch("ack", ackRequest(fixture, { eg: 1 })))).toBe("CT_FENCE_MISMATCH")
    expect(readFileSync(fixture.dbPath)).toEqual(beforeWrongGeneration)
  })

  test("CT-R6-S1/S4-equivalent: OFF and ROLLING_BACK are gated before ack request/authority checks", () => {
    const fixture = setupClaimedFixture()
    const db = new Database(fixture.dbPath)
    db.run("UPDATE ct_continuation_state SET mode='OFF'")
    db.close()
    expect(errorCode(() => fixture.workerDispatch("ack", ackRequest(fixture)))).toBe("CT_CONTINUATION_OFF")

    const rolling = new Database(fixture.dbPath)
    rolling.run("UPDATE ct_continuation_state SET mode='ROLLING_BACK'")
    rolling.close()
    expect(errorCode(() => fixture.workerDispatch("ack", ackRequest(fixture)))).toBe("CT_ROLLBACK_IN_PROGRESS")
  })

  test("MCP ack tool round-trips through JSON and never discloses the bearer", () => {
    const fixture = setupClaimedFixture()
    // Reuse the exact registered worker identity: ack requires the same
    // ACTIVE claimant binding that performed the claim.
    const enabled = createMcpHandler({ cwd: fixture.main, trustedMetadata: { snapshot: () => fixture.workerMetadata }, processIdentity: { snapshot: () => fixture.workerIdentity } })
    const request = ackRequest(fixture)
    const response = mcpResult(enabled({ id: 9, method: "tools/call", params: { name: "ack", arguments: request } }))
    expect(response).toEqual({ id: fixture.created.id, state: "STARTED", generation: 0, replayed: false })
    const status = mcpResult(enabled({ id: 10, method: "tools/call", params: { name: "status", arguments: {} } }))
    expect(JSON.stringify(status)).not.toContain(fixture.token)
  })
})

const attestRequest = (fixture, overrides = {}) => ({
  request_identity: randomUUID(), id: fixture.created.id, es: "STARTED", eg: 0, ...overrides,
})

describe("P5-B attestation", () => {
  test("CT-R1-S2 Main attestCompletion moves STARTED to COMPLETION_ATTESTED with server-derived evidence", () => {
    const fixture = setupStartedFixture()
    const request = attestRequest(fixture)

    const response = fixture.mainDispatch("attestCompletion", request)
    expect(response).toEqual({ id: fixture.created.id, state: "COMPLETION_ATTESTED", generation: 0, replayed: false })

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT state FROM ct_handoff WHERE id=?").get(fixture.created.id).state).toBe("COMPLETION_ATTESTED")
    expect(db.query("SELECT claim_state FROM ct_claim WHERE delivery_id=?").get(fixture.deliveryId).claim_state).toBe("LIVE")
    expect(db.query("SELECT delivery_state FROM ct_delivery WHERE delivery_id=?").get(fixture.deliveryId).delivery_state).toBe("CLAIMED")
    const transition = db.query("SELECT * FROM ct_handoff_transition WHERE operation='ATTEST_COMPLETION'").get()
    expect(transition).toMatchObject({ from_state: "STARTED", to_state: "COMPLETION_ATTESTED", authority_kind: "MAIN", generation: 0 })
    expect(transition.decision_digest).toMatch(/^sha256:[0-9a-f]{64}$/)
    const claimRow = db.query("SELECT claim_id FROM ct_claim WHERE delivery_id=?").get(fixture.deliveryId)
    const envelope = JSON.parse(db.query("SELECT response_json FROM ct_idempotency WHERE operation='attestCompletion'").get().response_json)
    expect(envelope.kind).toBe("attestCompletion_response_envelope_v1")
    expect(envelope.evidence.attestation_digest).toBe(transition.decision_digest)
    expect(envelope.evidence.attestation_evidence.kind).toBe("attestation_evidence_v1")
    expect(envelope.evidence.attestation_evidence.claim.claim_id).toBe(claimRow.claim_id)
    expect(envelope.evidence.attestation_evidence.id).toBe(fixture.created.id)
    expect(envelope.evidence.claim_id).toBe(claimRow.claim_id)
    db.close()

    // Every subsequent schema-4 read re-verifies this exact ATTEST_COMPLETION
    // row and the preceding ACK row it depends on.
    expect(fixture.mainDispatch("status")).toMatchObject({ mode: "ON", schema_version: 4 })
  })

  test("attestCompletion response discloses no evidence, digest, or authority", () => {
    const fixture = setupStartedFixture()
    const response = fixture.mainDispatch("attestCompletion", attestRequest(fixture))
    expect(Object.keys(response).sort()).toEqual(["generation", "id", "replayed", "state"])
  })

  test("CT-R3-S5(P5-B) exact attestCompletion replay returns replayed:true; a changed tuple or new identity for the same scope is CT_IDEMPOTENCY_CONFLICT; exactly one attestation is ever persisted", () => {
    const fixture = setupStartedFixture()
    const request = attestRequest(fixture)
    const first = fixture.mainDispatch("attestCompletion", request)
    expect(first.replayed).toBe(false)

    const replay = fixture.mainDispatch("attestCompletion", request)
    expect(replay).toEqual({ id: fixture.created.id, state: "COMPLETION_ATTESTED", generation: 0, replayed: true })

    // A fresh request_identity against the same single-use attest scope key
    // (handoff:<id>:generation:<eg>:attest) is CT_IDEMPOTENCY_CONFLICT before
    // any state is re-examined — the scope key alone is exactly one-shot.
    const sameScope = { ...request, request_identity: randomUUID() }
    expect(errorCode(() => fixture.mainDispatch("attestCompletion", sameScope))).toBe("CT_IDEMPOTENCY_CONFLICT")
    const freshAttempt = { request_identity: randomUUID(), id: fixture.created.id, es: "STARTED", eg: 0 }
    expect(errorCode(() => fixture.mainDispatch("attestCompletion", freshAttempt))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff_transition WHERE operation='ATTEST_COMPLETION'").get().count).toBe(1)
    db.close()
  })

  test("CT-R1-S5 attestCompletion fails closed and mutates nothing on non-STARTED state or a non-Main actor", () => {
    const notStarted = setupClaimedFixture() // handoff.state === CLAIMED, not STARTED
    const beforeNotStarted = readFileSync(notStarted.dbPath)
    expect(errorCode(() => notStarted.mainDispatch("attestCompletion", attestRequest(notStarted)))).toBe("CT_INVALID_TRANSITION")
    expect(readFileSync(notStarted.dbPath)).toEqual(beforeNotStarted)

    const wrongActor = setupStartedFixture()
    const beforeWrongActor = readFileSync(wrongActor.dbPath)
    expect(errorCode(() => wrongActor.workerDispatch("attestCompletion", attestRequest(wrongActor)))).toBe("CT_WORKFLOW_MAIN_REQUIRED")
    expect(readFileSync(wrongActor.dbPath)).toEqual(beforeWrongActor)
  })

  test("orders attestCompletion request shape before Main authority before handoff existence before the state/generation fence", () => {
    const fixture = setupStartedFixture()
    expect(errorCode(() => fixture.mainDispatch("attestCompletion", { ...attestRequest(fixture), extra: true }))).toBe("CT_PAYLOAD_INVALID")
    expect(errorCode(() => fixture.workerDispatch("attestCompletion", attestRequest(fixture)))).toBe("CT_WORKFLOW_MAIN_REQUIRED")
    expect(errorCode(() => fixture.mainDispatch("attestCompletion", attestRequest(fixture, { id: randomBytes(32).toString("base64url") })))).toBe("CT_NOT_FOUND")

    const beforeWrongGeneration = readFileSync(fixture.dbPath)
    expect(errorCode(() => fixture.mainDispatch("attestCompletion", attestRequest(fixture, { eg: 1 })))).toBe("CT_FENCE_MISMATCH")
    expect(readFileSync(fixture.dbPath)).toEqual(beforeWrongGeneration)
  })

  test("CT-R6-S1/S4-equivalent: OFF and ROLLING_BACK are gated before attestCompletion request/authority checks", () => {
    const fixture = setupStartedFixture()
    const db = new Database(fixture.dbPath)
    db.run("UPDATE ct_continuation_state SET mode='OFF'")
    db.close()
    expect(errorCode(() => fixture.mainDispatch("attestCompletion", attestRequest(fixture)))).toBe("CT_CONTINUATION_OFF")

    const rolling = new Database(fixture.dbPath)
    rolling.run("UPDATE ct_continuation_state SET mode='ROLLING_BACK'")
    rolling.close()
    expect(errorCode(() => fixture.mainDispatch("attestCompletion", attestRequest(fixture)))).toBe("CT_ROLLBACK_IN_PROGRESS")
  })

  test("MCP attestCompletion tool round-trips through JSON and preserves the ack route", () => {
    const fixture = setupStartedFixture()
    const enabled = createMcpHandler({ cwd: fixture.main, trustedMetadata: { snapshot: () => fixture.mainMetadata }, processIdentity: { snapshot: () => fixture.mainIdentity } })
    const request = attestRequest(fixture)
    const response = mcpResult(enabled({ id: 11, method: "tools/call", params: { name: "attestCompletion", arguments: request } }))
    expect(response).toEqual({ id: fixture.created.id, state: "COMPLETION_ATTESTED", generation: 0, replayed: false })
    const status = mcpResult(enabled({ id: 12, method: "tools/call", params: { name: "status", arguments: {} } }))
    expect(status).toMatchObject({ mode: "ON", schema_version: 4 })
  })

  test("a persisted ATTEST_COMPLETION row whose evidence does not re-derive exactly is CT_SCHEMA_INVALID on the next read, never repaired", () => {
    const mismatchedDigest = setupStartedFixture()
    mismatchedDigest.mainDispatch("attestCompletion", attestRequest(mismatchedDigest))
    const tamperedDigest = new Database(mismatchedDigest.dbPath)
    tamperedDigest.run("UPDATE ct_idempotency SET cas_digest=? WHERE operation='attestCompletion'", [digest("tampered-cas-digest")])
    tamperedDigest.close()
    expect(errorCode(() => mismatchedDigest.mainDispatch("status"))).toBe("CT_SCHEMA_INVALID")

    const mismatchedEvidence = setupStartedFixture()
    mismatchedEvidence.mainDispatch("attestCompletion", attestRequest(mismatchedEvidence))
    const tamperedEvidence = new Database(mismatchedEvidence.dbPath)
    const row = tamperedEvidence.query("SELECT response_json FROM ct_idempotency WHERE operation='attestCompletion'").get()
    const envelope = JSON.parse(row.response_json)
    envelope.evidence.attestation_evidence.claim.claimant_identity_digest = digest("tampered-claimant")
    tamperedEvidence.run("UPDATE ct_idempotency SET response_json=? WHERE operation='attestCompletion'", [JSON.stringify(envelope)])
    tamperedEvidence.close()
    expect(errorCode(() => mismatchedEvidence.mainDispatch("status"))).toBe("CT_SCHEMA_INVALID")
  })
})

// P5-C: `complete` (COMPLETION_ATTESTED -> COMPLETED) consumes the single-use
// attestation, closes the claim and delivery, and persists the committed
// result. Every fixture here is real P4+P5-A+P5-B state produced by actually
// running create -> validate -> publish -> claim -> ack -> attestCompletion;
// no synthetic COMPLETION_ATTESTED/COMPLETED row is ever inserted directly.
const setupAttestedFixture = () => {
  const fixture = setupStartedFixture()
  const attested = fixture.mainDispatch("attestCompletion", attestRequest(fixture))
  const db = new Database(fixture.dbPath, { readonly: true })
  const attestationDigest = db.query("SELECT decision_digest FROM ct_handoff_transition WHERE operation='ATTEST_COMPLETION' AND handoff_id=?").get(fixture.created.id).decision_digest
  db.close()
  return { ...fixture, attested, attestationDigest }
}
const committedResult = (id, generation, attestationDigest, overrides = {}) => ({
  kind: "committed_result_v1", version: 1, id, generation, attestation_digest: attestationDigest,
  result_digest: digest("committed-result"), result_ref: "https://example.invalid/result", effect_settlement_digest: digest("effect-settlement"), ...overrides,
})
const completeRequest = (fixture, overrides = {}) => ({
  request_identity: randomUUID(), delivery_id: fixture.deliveryId, id: fixture.created.id, es: "COMPLETION_ATTESTED", eg: 0,
  purpose: "WORK", token: fixture.token, attestation_digest: fixture.attestationDigest,
  committed_result: committedResult(fixture.created.id, 0, fixture.attestationDigest), ...overrides,
})
const coreModuleUrl = new URL("../core.mjs", import.meta.url).href
const completeInSubprocess = (fixture, request, readyPath) => {
  const script = `
    import { writeFileSync } from "node:fs";
    import { createContinuationDispatcher } from ${JSON.stringify(coreModuleUrl)};
    const metadata = JSON.parse(process.env.CT_METADATA);
    const identity = JSON.parse(process.env.CT_IDENTITY);
    const request = JSON.parse(process.env.CT_REQUEST);
    const dispatch = createContinuationDispatcher({
      cwd: process.env.CT_CWD,
      trustedMetadata: { snapshot: () => metadata },
      processIdentity: { snapshot: () => identity },
    });
    writeFileSync(process.env.CT_READY, "ready");
    try {
      console.log(JSON.stringify({ ok: true, value: dispatch("complete", request) }));
    } catch (error) {
      console.log(JSON.stringify({ ok: false, code: error.code, message: error.message }));
    }
  `
  const child = Bun.spawn([process.execPath, "-e", script], {
    env: {
      ...process.env,
      CT_CWD: fixture.main,
      CT_METADATA: JSON.stringify(fixture.workerMetadata),
      CT_IDENTITY: JSON.stringify(fixture.workerIdentity),
      CT_REQUEST: JSON.stringify(request),
      CT_READY: readyPath,
    },
    stdout: "pipe",
    stderr: "pipe",
  })
  return Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]).then(([exitCode, stdout, stderr]) => {
    if (exitCode !== 0) throw new Error(`complete subprocess exited ${exitCode}: ${stderr}`)
    return JSON.parse(stdout.trim())
  })
}

describe("P5-C completion and compensation", () => {
  test("CT-R1-S3/CT-R3-S5(P5-C) complete consumes the attestation, closes claim+delivery, and persists the committed result", () => {
    const fixture = setupAttestedFixture()
    const request = completeRequest(fixture)

    const response = fixture.workerDispatch("complete", request)
    expect(response).toEqual({ id: fixture.created.id, state: "COMPLETED", generation: 0, replayed: false })

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT state FROM ct_handoff WHERE id=?").get(fixture.created.id).state).toBe("COMPLETED")
    const claimRow = db.query("SELECT claim_state, closed_at FROM ct_claim WHERE delivery_id=?").get(fixture.deliveryId)
    expect(claimRow.claim_state).toBe("CLOSED")
    expect(claimRow.closed_at).not.toBeNull()
    const deliveryRow = db.query("SELECT delivery_state, closed_at FROM ct_delivery WHERE delivery_id=?").get(fixture.deliveryId)
    expect(deliveryRow.delivery_state).toBe("CLOSED")
    expect(deliveryRow.closed_at).not.toBeNull()
    const transition = db.query("SELECT * FROM ct_handoff_transition WHERE operation='COMPLETE'").get()
    expect(transition).toMatchObject({ from_state: "COMPLETION_ATTESTED", to_state: "COMPLETED", authority_kind: "CLAIMANT", generation: 0 })
    const envelope = JSON.parse(db.query("SELECT response_json FROM ct_idempotency WHERE operation='complete'").get().response_json)
    expect(envelope.kind).toBe("complete_response_envelope_v1")
    expect(envelope.evidence.committed_result).toEqual(request.committed_result)
    expect(envelope.evidence.attestation_digest).toBe(fixture.attestationDigest)
    expect(envelope.evidence.request.token).toBeUndefined()
    expect(JSON.stringify(envelope)).not.toContain(fixture.token)
    db.close()

    // Every subsequent schema-4 read re-verifies this exact COMPLETE row and
    // the ACK/ATTEST_COMPLETION rows it depends on.
    expect(fixture.mainDispatch("status")).toMatchObject({ mode: "ON", schema_version: 4 })
  })

  test("complete response discloses no token, attestation, or committed-result evidence", () => {
    const fixture = setupAttestedFixture()
    const response = fixture.workerDispatch("complete", completeRequest(fixture))
    expect(Object.keys(response).sort()).toEqual(["generation", "id", "replayed", "state"])
  })

  test("CT-R6-S3 exactly one complete ever wins: exact replay returns replayed:true; a changed tuple or a distinct identity for the same single-use scope is CT_IDEMPOTENCY_CONFLICT", () => {
    const fixture = setupAttestedFixture()
    const request = completeRequest(fixture)
    const first = fixture.workerDispatch("complete", request)
    expect(first.replayed).toBe(false)

    const replay = fixture.workerDispatch("complete", request)
    expect(replay).toEqual({ id: fixture.created.id, state: "COMPLETED", generation: 0, replayed: true })

    // A changed accepted request against the exact same request_identity is a
    // committed-scope mismatch, not a fresh attempt.
    const changedResult = { ...request, committed_result: committedResult(fixture.created.id, 0, fixture.attestationDigest, { result_ref: "https://example.invalid/different-result" }) }
    expect(errorCode(() => fixture.workerDispatch("complete", changedResult))).toBe("CT_IDEMPOTENCY_CONFLICT")

    // A fresh request_identity against the same single-use complete scope key
    // (handoff:<id>:generation:<eg>:complete) is CT_IDEMPOTENCY_CONFLICT
    // before any state is re-examined — the scope key alone is exactly
    // one-shot, the same structural pattern P5-B established for
    // attestCompletion's single-use scope key.
    const sameScope = { ...request, request_identity: randomUUID() }
    expect(errorCode(() => fixture.workerDispatch("complete", sameScope))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff_transition WHERE operation='COMPLETE'").get().count).toBe(1)
    expect(db.query("SELECT claim_state FROM ct_claim WHERE delivery_id=?").get(fixture.deliveryId).claim_state).toBe("CLOSED")
    expect(db.query("SELECT delivery_state FROM ct_delivery WHERE delivery_id=?").get(fixture.deliveryId).delivery_state).toBe("CLOSED")
    db.close()
  })

  test("CT-R6-S3 two complete processes waiting on the same writer barrier serialize to one fresh commit and one exact replay", async () => {
    const fixture = setupAttestedFixture()
    const request = completeRequest(fixture)
    const firstReady = join(fixture.root, "complete-racer-1.ready")
    const secondReady = join(fixture.root, "complete-racer-2.ready")
    const barrier = new Database(fixture.dbPath)
    barrier.run("PRAGMA busy_timeout = 1000")
    barrier.run("BEGIN IMMEDIATE")

    const first = completeInSubprocess(fixture, request, firstReady)
    const second = completeInSubprocess(fixture, request, secondReady)
    try {
      const deadline = Date.now() + 2000
      while (!(await Bun.file(firstReady).exists()) || !(await Bun.file(secondReady).exists())) {
        if (Date.now() >= deadline) throw new Error("complete racers did not reach the writer barrier")
        await Bun.sleep(10)
      }
    } finally {
      barrier.run("COMMIT")
      barrier.close()
    }

    const outcomes = await Promise.all([first, second])
    expect(outcomes.every(({ ok }) => ok)).toBe(true)
    expect(outcomes.map(({ value }) => value.replayed).sort()).toEqual([false, true])
    expect(outcomes.map(({ value }) => value.state)).toEqual(["COMPLETED", "COMPLETED"])

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_handoff_transition WHERE operation='COMPLETE'").get().count).toBe(1)
    expect(db.query("SELECT COUNT(*) AS count FROM ct_idempotency WHERE operation='complete'").get().count).toBe(1)
    db.close()
  })

  test("CT-R1-S5 complete fails closed and mutates nothing on missing attestation, wrong bearer, or a mismatched attestation digest", () => {
    const missingAttestation = setupStartedFixture() // handoff.state === STARTED, not yet attested
    const beforeMissing = readFileSync(missingAttestation.dbPath)
    const placeholderDigest = digest("placeholder-attestation")
    expect(errorCode(() => missingAttestation.workerDispatch("complete", completeRequest({ ...missingAttestation, attestationDigest: placeholderDigest })))).toBe("CT_INVALID_TRANSITION")
    expect(readFileSync(missingAttestation.dbPath)).toEqual(beforeMissing)

    const wrongToken = setupAttestedFixture()
    const beforeWrongToken = readFileSync(wrongToken.dbPath)
    expect(errorCode(() => wrongToken.workerDispatch("complete", completeRequest(wrongToken, { token: randomBytes(32).toString("base64url") })))).toBe("CT_TOKEN_MISMATCH")
    expect(readFileSync(wrongToken.dbPath)).toEqual(beforeWrongToken)

    const wrongDigest = setupAttestedFixture()
    const beforeWrongDigest = readFileSync(wrongDigest.dbPath)
    const mismatchedRequest = completeRequest(wrongDigest, { attestation_digest: digest("wrong-attestation-digest") })
    mismatchedRequest.committed_result = committedResult(wrongDigest.created.id, 0, digest("wrong-attestation-digest"))
    expect(errorCode(() => wrongDigest.workerDispatch("complete", mismatchedRequest))).toBe("CT_FENCE_MISMATCH")
    expect(readFileSync(wrongDigest.dbPath)).toEqual(beforeWrongDigest)
  })

  test("the redelivery-completion path is exercised fail-closed: an ATTESTATION_REDELIVERY purpose against the live WORK delivery is CT_FENCE_MISMATCH", () => {
    const fixture = setupAttestedFixture()
    const before = readFileSync(fixture.dbPath)
    const request = completeRequest(fixture, { purpose: "ATTESTATION_REDELIVERY" })
    expect(errorCode(() => fixture.workerDispatch("complete", request))).toBe("CT_FENCE_MISMATCH")
    expect(readFileSync(fixture.dbPath)).toEqual(before)
  })

  test("orders complete request shape before claimant authority before delivery/handoff existence before the fence/token/attestation bucket", () => {
    const fixture = setupAttestedFixture()
    expect(errorCode(() => fixture.workerDispatch("complete", { ...completeRequest(fixture), extra: true }))).toBe("CT_PAYLOAD_INVALID")

    const strangerMetadata = capability({ plugin_instance: "stranger-plugin", root_session_id: "stranger-root" })
    const strangerDispatch = dispatcher(fixture.main, strangerMetadata)
    expect(errorCode(() => strangerDispatch("complete", completeRequest(fixture)))).toBe("CT_SESSION_ISOLATION_UNPROVEN")

    expect(errorCode(() => fixture.workerDispatch("complete", completeRequest(fixture, { delivery_id: randomBytes(32).toString("base64url") })))).toBe("CT_NOT_FOUND")
    const missingId = randomBytes(32).toString("base64url")
    const missingHandoff = completeRequest(fixture, {
      id: missingId,
      committed_result: committedResult(missingId, 0, fixture.attestationDigest),
    })
    expect(errorCode(() => fixture.workerDispatch("complete", missingHandoff))).toBe("CT_NOT_FOUND")

    const beforeWrongGeneration = readFileSync(fixture.dbPath)
    const wrongGeneration = completeRequest(fixture, {
      eg: 1,
      committed_result: committedResult(fixture.created.id, 1, fixture.attestationDigest),
    })
    expect(errorCode(() => fixture.workerDispatch("complete", wrongGeneration))).toBe("CT_FENCE_MISMATCH")
    expect(readFileSync(fixture.dbPath)).toEqual(beforeWrongGeneration)
  })

  test("CT-R6-S1/S4-equivalent: OFF and ROLLING_BACK are gated before complete request/authority checks", () => {
    const fixture = setupAttestedFixture()
    const db = new Database(fixture.dbPath)
    db.run("UPDATE ct_continuation_state SET mode='OFF'")
    db.close()
    expect(errorCode(() => fixture.workerDispatch("complete", completeRequest(fixture)))).toBe("CT_CONTINUATION_OFF")

    const rolling = new Database(fixture.dbPath)
    rolling.run("UPDATE ct_continuation_state SET mode='ROLLING_BACK'")
    rolling.close()
    expect(errorCode(() => fixture.workerDispatch("complete", completeRequest(fixture)))).toBe("CT_ROLLBACK_IN_PROGRESS")
  })

  test("MCP complete tool round-trips through JSON and never discloses the bearer", () => {
    const fixture = setupAttestedFixture()
    const enabled = createMcpHandler({ cwd: fixture.main, trustedMetadata: { snapshot: () => fixture.workerMetadata }, processIdentity: { snapshot: () => fixture.workerIdentity } })
    const request = completeRequest(fixture)
    const response = mcpResult(enabled({ id: 13, method: "tools/call", params: { name: "complete", arguments: request } }))
    expect(response).toEqual({ id: fixture.created.id, state: "COMPLETED", generation: 0, replayed: false })
    const status = mcpResult(enabled({ id: 14, method: "tools/call", params: { name: "status", arguments: {} } }))
    expect(JSON.stringify(status)).not.toContain(fixture.token)
  })

  test("a persisted COMPLETE row whose evidence does not re-derive exactly is CT_SCHEMA_INVALID on the next read, never repaired", () => {
    const mismatchedDigest = setupAttestedFixture()
    mismatchedDigest.workerDispatch("complete", completeRequest(mismatchedDigest))
    const tamperedDigest = new Database(mismatchedDigest.dbPath)
    tamperedDigest.run("UPDATE ct_idempotency SET cas_digest=? WHERE operation='complete'", [digest("tampered-cas-digest")])
    tamperedDigest.close()
    expect(errorCode(() => mismatchedDigest.mainDispatch("status"))).toBe("CT_SCHEMA_INVALID")

    const mismatchedResult = setupAttestedFixture()
    mismatchedResult.workerDispatch("complete", completeRequest(mismatchedResult))
    const tamperedResult = new Database(mismatchedResult.dbPath)
    const row = tamperedResult.query("SELECT response_json FROM ct_idempotency WHERE operation='complete'").get()
    const envelope = JSON.parse(row.response_json)
    envelope.evidence.committed_result.result_ref = "https://example.invalid/tampered-result"
    tamperedResult.run("UPDATE ct_idempotency SET response_json=? WHERE operation='complete'", [JSON.stringify(envelope)])
    tamperedResult.close()
    expect(errorCode(() => mismatchedResult.mainDispatch("status"))).toBe("CT_SCHEMA_INVALID")

    const closureTimeDrift = setupAttestedFixture()
    closureTimeDrift.workerDispatch("complete", completeRequest(closureTimeDrift))
    const tamperedClosure = new Database(closureTimeDrift.dbPath)
    const driftedClosedAt = new Date(new Date(tamperedClosure.query("SELECT closed_at FROM ct_claim WHERE handoff_id=?").get(closureTimeDrift.created.id).closed_at).getTime() + 10).toISOString()
    expect(() => tamperedClosure.run("UPDATE ct_claim SET closed_at=? WHERE handoff_id=?", [driftedClosedAt, closureTimeDrift.created.id])).toThrow("CT_IMMUTABLE_CLAIM")
    tamperedClosure.close()
    expect(closureTimeDrift.mainDispatch("status")).toMatchObject({ mode: "ON", schema_version: 4 })
  })
})

// P5-C (CT-R12-S3/S4): compensation_receipt_v1/rollback_proof_v1 are pure
// shapes and a pure boundary-equality rule — RECOVER (the operation that
// would produce a real independent read-back) is P6-owned, so these are
// exercised as direct unit coverage of the exported validators, never
// through a dispatcher route.
describe("P5-C compensation and read-back shapes", () => {
  const id = randomBytes(32).toString("base64url"), generation = 0
  const manifestEffect = (index, overrides = {}) => ({
    effect_index: index, target_kind: "DATABASE", target: `table:compensation-${index}`, operation: "UPDATE",
    observability: "OBSERVABLE", compensatability: "COMPENSATABLE", pre_state_digest: digest(`pre-state-${index}`), ...overrides,
  })
  const receipt = (effectRow, overrides = {}) => ({
    kind: "compensation_receipt_v1", version: 1, id, generation, effect_index: effectRow.effect_index,
    target_kind: effectRow.target_kind, target: effectRow.target, compensation_operation: "REVERSE_UPDATE",
    read_back_digest: effectRow.pre_state_digest, read_back_matches_pre_state: true, occurred_at: "2026-01-01T00:00:00.000Z", ...overrides,
  })

  test("CT-R12-S3 a fully declared, observable, compensatable manifest with matching receipts and boundary is a provable rollback proof", () => {
    const effects = [manifestEffect(0), manifestEffect(1)], receipts = effects.map((effectRow) => receipt(effectRow))
    const boundary = readBackBoundary(effects, receipts)
    const manifest = { kind: "effect_manifest_v1", version: 1, id, generation, effects, pre_start_boundary_digest: boundary }
    const proof = { kind: "rollback_proof_v1", version: 1, id, generation, pre_start_boundary_digest: boundary,
      receipts, observed_boundary_digest: boundary, boundary_equal: true }
    expect(tower.validRollbackProof(proof, id, generation, manifest, manifest.pre_start_boundary_digest)).toBe(true)
    expect(tower.rollbackProofDigest(proof)).toBe(digest(canonical(proof)))
  })

  test("CT-R12-S4 an unobservable or non-compensatable effect forbids a provable rollback proof even with matching receipts", () => {
    const effects = [manifestEffect(0, { observability: "UNOBSERVABLE" }), manifestEffect(1)], receipts = effects.map((effectRow) => receipt(effectRow))
    const boundary = readBackBoundary(effects, receipts)
    const manifest = { kind: "effect_manifest_v1", version: 1, id, generation, effects, pre_start_boundary_digest: boundary }
    const falselyProven = { kind: "rollback_proof_v1", version: 1, id, generation, pre_start_boundary_digest: boundary,
      receipts, observed_boundary_digest: boundary, boundary_equal: true }
    expect(tower.validRollbackProof(falselyProven, id, generation, manifest, manifest.pre_start_boundary_digest)).toBe(false)

    const honestlyBlocked = { ...falselyProven, boundary_equal: false }
    expect(tower.validRollbackProof(honestlyBlocked, id, generation, manifest, manifest.pre_start_boundary_digest)).toBe(true)

    const nonCompensatable = [manifestEffect(0, { compensatability: "NON_COMPENSATABLE" })], nonCompReceipts = nonCompensatable.map((effectRow) => receipt(effectRow))
    const nonCompBoundary = readBackBoundary(nonCompensatable, nonCompReceipts)
    const nonCompManifest = { kind: "effect_manifest_v1", version: 1, id, generation, effects: nonCompensatable, pre_start_boundary_digest: nonCompBoundary }
    const nonCompProof = { kind: "rollback_proof_v1", version: 1, id, generation, pre_start_boundary_digest: nonCompBoundary,
      receipts: nonCompReceipts, observed_boundary_digest: nonCompBoundary, boundary_equal: true }
    expect(tower.validRollbackProof(nonCompProof, id, generation, nonCompManifest, nonCompManifest.pre_start_boundary_digest)).toBe(false)
  })

  test("CT-R12-S4 a read-back mismatch or an undeclared/missing receipt forbids a provable rollback proof", () => {
    const effects = [manifestEffect(0), manifestEffect(1)]
    const manifest = { kind: "effect_manifest_v1", version: 1, id, generation, effects, pre_start_boundary_digest: digest("pre-start-boundary") }

    const mismatchedReadBack = [receipt(effects[0]), receipt(effects[1], { read_back_matches_pre_state: false })]
    const mismatchedProof = { kind: "rollback_proof_v1", version: 1, id, generation, pre_start_boundary_digest: manifest.pre_start_boundary_digest,
      receipts: mismatchedReadBack, observed_boundary_digest: manifest.pre_start_boundary_digest, boundary_equal: true }
    expect(tower.validRollbackProof(mismatchedProof, id, generation, manifest, manifest.pre_start_boundary_digest)).toBe(false)

    const undeclaredCount = { ...mismatchedProof, receipts: [receipt(effects[0])] } // one receipt for two declared effects
    expect(tower.validRollbackProof(undeclaredCount, id, generation, manifest, manifest.pre_start_boundary_digest)).toBe(false)

    const wrongObservedBoundary = { kind: "rollback_proof_v1", version: 1, id, generation, pre_start_boundary_digest: manifest.pre_start_boundary_digest,
      receipts: effects.map((effectRow) => receipt(effectRow)), observed_boundary_digest: digest("wrong-observed-boundary"), boundary_equal: true }
    expect(tower.validRollbackProof(wrongObservedBoundary, id, generation, manifest, manifest.pre_start_boundary_digest)).toBe(false)
  })

  test("compensation_receipt_v1 rejects extra keys, wrong effect binding, or a malformed read-back digest", () => {
    const effectRow = manifestEffect(0)
    expect(tower.validCompensationReceipt({ ...receipt(effectRow), extra: true }, id, generation, effectRow)).toBe(false)
    expect(tower.validCompensationReceipt({ ...receipt(effectRow), target: "table:different" }, id, generation, effectRow)).toBe(false)
    expect(tower.validCompensationReceipt({ ...receipt(effectRow), read_back_digest: "not-a-digest" }, id, generation, effectRow)).toBe(false)
    expect(tower.validCompensationReceipt(receipt(effectRow), id, generation, effectRow)).toBe(true)
  })

  const readBackBoundary = (effects, receipts) => digest(canonical({ kind: "effect_boundary_v1", version: 1, id, generation,
    effects: effects.map(({ effect_index, target_kind, target }, index) => ({ effect_index, target_kind, target, pre_state_digest: receipts[index].read_back_digest })) }))

  test("CT-JD-S5-002 rejects a claimed per-effect match when read_back_digest differs from pre_state_digest", () => {
    const effects = [manifestEffect(0)], receipts = [receipt(effects[0], { read_back_digest: digest("wrong-read-back"), read_back_matches_pre_state: true })]
    const boundary = digest(canonical({ kind: "effect_boundary_v1", version: 1, id, generation,
      effects: effects.map(({ effect_index, target_kind, target, pre_state_digest }) => ({ effect_index, target_kind, target, pre_state_digest })) }))
    const manifest = { kind: "effect_manifest_v1", version: 1, id, generation, effects, pre_start_boundary_digest: boundary }
    const proof = { kind: "rollback_proof_v1", version: 1, id, generation, pre_start_boundary_digest: boundary,
      receipts, observed_boundary_digest: boundary, boundary_equal: true }
    expect(tower.validRollbackProof(proof, id, generation, manifest, boundary)).toBe(false)
  })

  test("CT-JD-S5-002 rejects a declared mismatch when read_back_digest actually equals pre_state_digest", () => {
    const effects = [manifestEffect(0)], receipts = [receipt(effects[0], { read_back_matches_pre_state: false })]
    const boundary = readBackBoundary(effects, receipts)
    const manifest = { kind: "effect_manifest_v1", version: 1, id, generation, effects, pre_start_boundary_digest: boundary }
    const proof = { kind: "rollback_proof_v1", version: 1, id, generation, pre_start_boundary_digest: boundary,
      receipts, observed_boundary_digest: boundary, boundary_equal: false }
    expect(tower.validRollbackProof(proof, id, generation, manifest, boundary)).toBe(false)
  })

  test("CT-JD-S5-002 accepts an honest mismatch only with its independently recomputed observed boundary", () => {
    const effects = [manifestEffect(0)], receipts = [receipt(effects[0], { read_back_digest: digest("observed-drift"), read_back_matches_pre_state: false })]
    const preStart = digest(canonical({ kind: "effect_boundary_v1", version: 1, id, generation,
      effects: effects.map(({ effect_index, target_kind, target, pre_state_digest }) => ({ effect_index, target_kind, target, pre_state_digest })) }))
    const manifest = { kind: "effect_manifest_v1", version: 1, id, generation, effects, pre_start_boundary_digest: preStart }
    const proof = { kind: "rollback_proof_v1", version: 1, id, generation, pre_start_boundary_digest: preStart,
      receipts, observed_boundary_digest: readBackBoundary(effects, receipts), boundary_equal: false }
    expect(tower.validRollbackProof(proof, id, generation, manifest, preStart)).toBe(true)
    expect(tower.validRollbackProof({ ...proof, observed_boundary_digest: preStart }, id, generation, manifest, preStart)).toBe(false)
  })
})

// P5-D fixtures use real P4 operations and real P5-D reject; no REJECTED or
// revised DRAFT row is inserted directly.
const setupSafeStateFixture = (targetState = "DRAFT") => {
  const fixture = createFixture()
  const mainMetadata = capability(), mainIdentity = opaqueProcess(), mainDispatch = dispatcher(fixture.main, mainMetadata, mainIdentity)
  const main = mainDispatch("bootstrapMain", mainRequest(fixture.anchor))
  mainMetadata.binding_epoch = main.binding_epoch
  mainDispatch("activate", activationRequest(main.binding_epoch))
  const workerMetadata = capability({ plugin_instance: "worker-plugin", root_session_id: "worker-root" })
  const workerIdentity = opaqueProcess(), workerDispatch = dispatcher(fixture.main, workerMetadata, workerIdentity)
  const registered = workerDispatch("register", registerRequest())
  workerMetadata.binding_epoch = registered.binding_epoch
  const payload = validPayload(fixture), createReq = createPayloadRequest(payload)
  const created = workerDispatch("create", createReq)
  if (["VALIDATED", "PUBLISHED"].includes(targetState)) mainDispatch("validate", validateRequest(created, createReq.payload_digest))
  if (targetState === "PUBLISHED") mainDispatch("publish", publishRequest(created.id, 0))
  const db = new Database(fixture.dbPath, { readonly: true })
  const deliveryId = db.query("SELECT delivery_id FROM ct_delivery WHERE handoff_id=?").get(created.id)?.delivery_id ?? null
  db.close()
  return { ...fixture, mainDispatch, mainMetadata, mainIdentity, workerDispatch, workerMetadata, workerIdentity, payload, created, deliveryId }
}
const rejectRequest = (fixture, es, overrides = {}) => ({ request_identity: randomUUID(), id: fixture.created.id, es, eg: 0, ...overrides })
const setupRejectedFixture = (fromState = "DRAFT") => {
  const fixture = setupSafeStateFixture(fromState)
  fixture.mainDispatch("reject", rejectRequest(fixture, fromState))
  return fixture
}
const revisedPayload = (fixture, revision = fixture.payload.lineage.revision + 1, overrides = {}) => ({
  ...fixture.payload,
  lineage: { lineage_id: fixture.payload.lineage.lineage_id, revision },
  next_unit: { ...fixture.payload.next_unit, unit_id: `revised-unit-${revision}`, scope: `revised scope ${revision}` },
  decision_summary: `revised fixture decision ${revision}`,
  ...overrides,
})
const reviseRequest = (fixture, payload = revisedPayload(fixture), overrides = {}) => ({
  request_identity: randomUUID(), source_id: fixture.created.id, lineage_id: payload.lineage.lineage_id,
  revision: payload.lineage.revision, payload, payload_digest: digest(canonical(payload)), ...overrides,
})

describe("P5-D rejection and revision", () => {
  test("CT-R1-S4 Main rejects exactly DRAFT, VALIDATED, or unclaimed PUBLISHED and closes only the PENDING delivery", () => {
    for (const state of ["DRAFT", "VALIDATED", "PUBLISHED"]) {
      const fixture = setupSafeStateFixture(state)
      expect(fixture.mainDispatch("reject", rejectRequest(fixture, state))).toEqual({ id: fixture.created.id, state: "REJECTED", generation: 0, replayed: false })
      const db = new Database(fixture.dbPath, { readonly: true })
      const transition = db.query("SELECT * FROM ct_handoff_transition WHERE operation='REJECT'").get()
      expect(db.query("SELECT state FROM ct_handoff WHERE id=?").get(fixture.created.id).state).toBe("REJECTED")
      expect(transition).toMatchObject({ from_state: state, to_state: "REJECTED", authority_kind: "MAIN", generation: 0 })
      const envelope = JSON.parse(db.query("SELECT response_json FROM ct_idempotency WHERE operation='reject'").get().response_json)
      expect(envelope.evidence.scope_key).toBe(`handoff:${fixture.created.id}:generation:0:reject`)
      expect(Object.keys(envelope.evidence.cas_input).sort()).toEqual([
        "delivery_id", "expected_delivery", "expected_generation", "expected_state", "handoff_fingerprint",
        "id", "kind", "main_authority_v1", "version", "writer_fence_v1",
      ])
      expect(envelope.evidence.cas_input).toMatchObject({
        expected_delivery: state === "PUBLISHED" ? "PENDING_UNCLAIMED" : "ABSENT",
        delivery_id: state === "PUBLISHED" ? fixture.deliveryId : null,
      })
      if (state === "PUBLISHED") {
        expect(db.query("SELECT delivery_state,claim_id,closed_at FROM ct_delivery WHERE handoff_id=?").get(fixture.created.id)).toEqual({ delivery_state: "CLOSED", claim_id: null, closed_at: transition.occurred_at })
        expect(envelope.evidence.closed_delivery_id).toBe(fixture.deliveryId)
      } else {
        expect(db.query("SELECT COUNT(*) AS count FROM ct_delivery WHERE handoff_id=?").get(fixture.created.id).count).toBe(0)
        expect(envelope.evidence.closed_delivery_id).toBeNull()
      }
      db.close()
      expect(fixture.mainDispatch("status")).toMatchObject({ mode: "ON", schema_version: 4 })
    }
  })

  test("reject replays exactly and refuses claimed work, a conflicting scope identity, or a non-Main actor", () => {
    const fixture = setupSafeStateFixture("DRAFT"), request = rejectRequest(fixture, "DRAFT")
    expect(fixture.mainDispatch("reject", request).replayed).toBe(false)
    expect(fixture.mainDispatch("reject", request)).toEqual({ id: fixture.created.id, state: "REJECTED", generation: 0, replayed: true })
    expect(errorCode(() => fixture.mainDispatch("reject", { ...request, request_identity: randomUUID() }))).toBe("CT_IDEMPOTENCY_CONFLICT")
    const claimed = setupClaimedFixture(), beforeClaimed = readFileSync(claimed.dbPath)
    expect(errorCode(() => claimed.mainDispatch("reject", rejectRequest(claimed, "PUBLISHED")))).toBe("CT_INVALID_TRANSITION")
    expect(readFileSync(claimed.dbPath)).toEqual(beforeClaimed)
    const started = setupStartedFixture(), beforeStarted = readFileSync(started.dbPath)
    expect(errorCode(() => started.mainDispatch("reject", rejectRequest(started, "PUBLISHED")))).toBe("CT_INVALID_TRANSITION")
    expect(readFileSync(started.dbPath)).toEqual(beforeStarted)
    const completed = setupAttestedFixture(); completed.workerDispatch("complete", completeRequest(completed))
    const beforeCompleted = readFileSync(completed.dbPath)
    expect(errorCode(() => completed.mainDispatch("reject", rejectRequest(completed, "PUBLISHED")))).toBe("CT_INVALID_TRANSITION")
    expect(readFileSync(completed.dbPath)).toEqual(beforeCompleted)
    const wrongActor = setupSafeStateFixture("DRAFT"), beforeWrongActor = readFileSync(wrongActor.dbPath)
    expect(errorCode(() => wrongActor.workerDispatch("reject", rejectRequest(wrongActor, "DRAFT")))).toBe("CT_WORKFLOW_MAIN_REQUIRED")
    expect(readFileSync(wrongActor.dbPath)).toEqual(beforeWrongActor)
  })

  test("CT-R1-S6 revise creates one immutable DRAFT N+1 from the exact REJECTED source and replays without overwriting history", () => {
    const fixture = setupRejectedFixture("PUBLISHED"), payload = revisedPayload(fixture), request = reviseRequest(fixture, payload)
    const sourceDb = new Database(fixture.dbPath, { readonly: true }), sourceBefore = sourceDb.query("SELECT * FROM ct_handoff WHERE id=?").get(fixture.created.id); sourceDb.close()
    const response = fixture.mainDispatch("revise", request)
    expect(response).toMatchObject({ state: "DRAFT", generation: 0, revision: 2, replayed: false })
    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT * FROM ct_handoff WHERE id=?").get(fixture.created.id)).toEqual(sourceBefore)
    expect(db.query("SELECT state,generation,lineage_id,revision,payload_json FROM ct_handoff WHERE id=?").get(response.id)).toEqual({ state: "DRAFT", generation: 0, lineage_id: fixture.payload.lineage.lineage_id, revision: 2, payload_json: canonical(payload) })
    expect(db.query("SELECT * FROM ct_handoff_transition WHERE operation='REVISE'").get()).toMatchObject({ handoff_id: response.id, from_state: null, to_state: "DRAFT", authority_kind: "MAIN", generation: 0 })
    const evidence = JSON.parse(db.query("SELECT response_json FROM ct_idempotency WHERE operation='revise'").get().response_json).evidence
    expect(evidence).toMatchObject({ source_id: fixture.created.id, source_revision: 1, new_id: response.id })
    expect(evidence.scope_key).toBe(`handoff:${fixture.payload.lineage.lineage_id}:revision:2`)
    expect(Object.keys(evidence.cas_input).sort()).toEqual([
      "expected_lineage_revision", "handoff_fingerprint", "kind", "lineage_id", "main_authority_v1", "payload_digest",
      "source_expected_state", "source_id", "source_revision", "target_revision", "version", "writer_fence_v1",
    ])
    expect(evidence.cas_input).toMatchObject({
      lineage_id: fixture.payload.lineage.lineage_id, target_revision: 2, source_id: fixture.created.id, source_revision: 1,
      source_expected_state: "REJECTED", payload_digest: request.payload_digest, handoff_fingerprint: evidence.new_handoff_fingerprint,
      expected_lineage_revision: "ABSENT",
    })
    db.close()
    expect(fixture.mainDispatch("revise", request)).toEqual({ ...response, replayed: true })
    expect(errorCode(() => fixture.mainDispatch("revise", { ...request, request_identity: randomUUID() }))).toBe("CT_IDEMPOTENCY_CONFLICT")
    expect(fixture.mainDispatch("validate", validateRequest(response, request.payload_digest))).toEqual({ id: response.id, state: "VALIDATED", generation: 0, replayed: false })
    expect(fixture.mainDispatch("revise", request)).toEqual({ ...response, replayed: true })
    expect(fixture.mainDispatch("status")).toMatchObject({ mode: "ON", schema_version: 4 })
  })

  test("revise refuses non-REJECTED, occupied, non-adjacent, or mismatched exact sources without mutation", () => {
    const nonRejected = setupSafeStateFixture("DRAFT"), beforeNonRejected = readFileSync(nonRejected.dbPath)
    expect(errorCode(() => nonRejected.mainDispatch("revise", reviseRequest(nonRejected)))).toBe("CT_INVALID_TRANSITION")
    expect(readFileSync(nonRejected.dbPath)).toEqual(beforeNonRejected)

    const occupied = setupRejectedFixture("DRAFT"), targetPayload = revisedPayload(occupied)
    occupied.workerDispatch("create", createPayloadRequest(targetPayload))
    const beforeOccupied = readFileSync(occupied.dbPath)
    expect(errorCode(() => occupied.mainDispatch("revise", reviseRequest(occupied, targetPayload)))).toBe("CT_IDEMPOTENCY_CONFLICT")
    expect(readFileSync(occupied.dbPath)).toEqual(beforeOccupied)

    const nonAdjacent = setupRejectedFixture("DRAFT"), revisionThree = revisedPayload(nonAdjacent, 3), beforeNonAdjacent = readFileSync(nonAdjacent.dbPath)
    expect(errorCode(() => nonAdjacent.mainDispatch("revise", reviseRequest(nonAdjacent, revisionThree)))).toBe("CT_FENCE_MISMATCH")
    expect(readFileSync(nonAdjacent.dbPath)).toEqual(beforeNonAdjacent)

    const mismatch = setupRejectedFixture("DRAFT"), beforeMismatch = readFileSync(mismatch.dbPath)
    expect(errorCode(() => mismatch.mainDispatch("revise", reviseRequest(mismatch, revisedPayload(mismatch), { lineage_id: randomUUID() })))).toBe("CT_FENCE_MISMATCH")
    expect(readFileSync(mismatch.dbPath)).toEqual(beforeMismatch)
  })

  test("reject/revise precedence and OFF/ROLLING_BACK gates are deterministic and non-mutating", () => {
    const rejectFixture = setupSafeStateFixture("DRAFT")
    expect(errorCode(() => rejectFixture.mainDispatch("reject", { ...rejectRequest(rejectFixture, "DRAFT"), extra: true }))).toBe("CT_PAYLOAD_INVALID")
    expect(errorCode(() => rejectFixture.workerDispatch("reject", rejectRequest(rejectFixture, "DRAFT")))).toBe("CT_WORKFLOW_MAIN_REQUIRED")
    expect(errorCode(() => rejectFixture.mainDispatch("reject", rejectRequest(rejectFixture, "DRAFT", { id: randomBytes(32).toString("base64url") })))).toBe("CT_NOT_FOUND")
    expect(errorCode(() => rejectFixture.mainDispatch("reject", rejectRequest(rejectFixture, "DRAFT", { eg: 1 })))).toBe("CT_FENCE_MISMATCH")

    const reviseFixture = setupRejectedFixture("DRAFT")
    expect(errorCode(() => reviseFixture.mainDispatch("revise", { ...reviseRequest(reviseFixture), extra: true }))).toBe("CT_PAYLOAD_INVALID")
    expect(errorCode(() => reviseFixture.workerDispatch("revise", reviseRequest(reviseFixture)))).toBe("CT_WORKFLOW_MAIN_REQUIRED")
    expect(errorCode(() => reviseFixture.mainDispatch("revise", reviseRequest(reviseFixture, undefined, { source_id: randomBytes(32).toString("base64url") })))).toBe("CT_NOT_FOUND")
    const malformedPayload = revisedPayload(reviseFixture, 2, { kind: "wrong-kind" })
    expect(errorCode(() => reviseFixture.mainDispatch("revise", reviseRequest(reviseFixture, malformedPayload)))).toBe("CT_PAYLOAD_INVALID")

    const off = setupSafeStateFixture("DRAFT"), offDb = new Database(off.dbPath)
    offDb.run("UPDATE ct_continuation_state SET mode='OFF'"); offDb.close()
    expect(errorCode(() => off.mainDispatch("reject", { extra: true }))).toBe("CT_CONTINUATION_OFF")
    const rolling = setupRejectedFixture("DRAFT"), rollingDb = new Database(rolling.dbPath)
    rollingDb.run("UPDATE ct_continuation_state SET mode='ROLLING_BACK'"); rollingDb.close()
    expect(errorCode(() => rolling.mainDispatch("revise", { extra: true }))).toBe("CT_ROLLBACK_IN_PROGRESS")
  })

  test("MCP reject/revise round-trip preserves exact response families", () => {
    const fixture = setupSafeStateFixture("PUBLISHED")
    const enabled = createMcpHandler({ cwd: fixture.main, trustedMetadata: { snapshot: () => fixture.mainMetadata }, processIdentity: { snapshot: () => fixture.mainIdentity } })
    expect(mcpResult(enabled({ id: 15, method: "tools/call", params: { name: "reject", arguments: rejectRequest(fixture, "PUBLISHED") } }))).toEqual({ id: fixture.created.id, state: "REJECTED", generation: 0, replayed: false })
    const payload = revisedPayload(fixture)
    expect(mcpResult(enabled({ id: 16, method: "tools/call", params: { name: "revise", arguments: reviseRequest(fixture, payload) } }))).toMatchObject({ state: "DRAFT", generation: 0, revision: 2, replayed: false })
    expect(mcpResult(enabled({ id: 17, method: "tools/call", params: { name: "status", arguments: {} } }))).toMatchObject({ mode: "ON", schema_version: 4 })
  })

  test("persisted reject/revise envelopes whose exact cross-row evidence drifts fail closed on the next read", () => {
    const rejectFixture = setupRejectedFixture("DRAFT"), rejectDb = new Database(rejectFixture.dbPath)
    const rejectEnvelope = JSON.parse(rejectDb.query("SELECT response_json FROM ct_idempotency WHERE operation='reject'").get().response_json)
    rejectEnvelope.evidence.closed_delivery_id = randomBytes(32).toString("base64url")
    rejectDb.run("UPDATE ct_idempotency SET response_json=? WHERE operation='reject'", [canonical(rejectEnvelope)]); rejectDb.close()
    expect(errorCode(() => rejectFixture.mainDispatch("status"))).toBe("CT_SCHEMA_INVALID")

    const reviseFixture = setupRejectedFixture("DRAFT")
    reviseFixture.mainDispatch("revise", reviseRequest(reviseFixture))
    const reviseDb = new Database(reviseFixture.dbPath)
    const reviseEnvelope = JSON.parse(reviseDb.query("SELECT response_json FROM ct_idempotency WHERE operation='revise'").get().response_json)
    reviseEnvelope.evidence.source_id = randomBytes(32).toString("base64url")
    reviseDb.run("UPDATE ct_idempotency SET response_json=? WHERE operation='revise'", [canonical(reviseEnvelope)]); reviseDb.close()
    expect(errorCode(() => reviseFixture.mainDispatch("status"))).toBe("CT_SCHEMA_INVALID")
  })
})

const rebindClaimant = (fixture) => {
  const reboundDispatch = dispatcher(fixture.main, fixture.workerMetadata, opaqueProcess())
  const rebound = reboundDispatch("register", registerRequest(fixture.workerMetadata.binding_epoch, "ACTIVE"))
  fixture.workerMetadata.binding_epoch = rebound.binding_epoch
  return reboundDispatch
}
const forgeMixedClaimAuthorityHistory = (fixture, operation) => {
  const db = new Database(fixture.dbPath)
  const active = db.query("SELECT * FROM ct_claimant_binding WHERE binding_status='ACTIVE'").get()
  const bindingFields = ["effective_uid", "canonical_repo", "git_common_dir", "worktree", "branch", "host_process_instance", "plugin_instance", "root_session_id", "mcp_process_instance", "pid_start_marker", "binding_epoch"]
  const ctxDigest = digest(canonical(Object.fromEntries(bindingFields.map((field) => [field, active[field]]))))
  const stored = db.query("SELECT response_json FROM ct_idempotency WHERE operation=?").get(operation)
  const envelope = JSON.parse(stored.response_json)
  envelope.evidence.cas_input.claimant_authority_v1 = { binding_id: active.binding_id, identity_digest: active.identity_digest, ctx_digest: ctxDigest }
  envelope.evidence.cas_digest = digest(canonical(envelope.evidence.cas_input))
  db.run("UPDATE ct_idempotency SET cas_digest=?,response_json=? WHERE operation=?", [envelope.evidence.cas_digest, canonical(envelope), operation])
  const triggerSql = db.query("SELECT sql FROM sqlite_master WHERE type='trigger' AND name='ct_handoff_transition_no_update'").get().sql
  db.run("DROP TRIGGER ct_handoff_transition_no_update")
  db.run("UPDATE ct_handoff_transition SET authority_binding_id=?,authority_identity_digest=?,cas_digest=? WHERE operation=?",
    [active.binding_id, active.identity_digest, envelope.evidence.cas_digest, operation === "ack" ? "ACK" : "COMPLETE"])
  db.run(triggerSql)
  db.close()
}

describe("Judgment Day Slice 5 confirmed corrections", () => {
  test("CT-JD-S5-001 ack rejects a retired claim token after same-root claimant rebind", () => {
    const fixture = setupClaimedFixture(), reboundDispatch = rebindClaimant(fixture), before = readFileSync(fixture.dbPath)
    expect(errorCode(() => reboundDispatch("ack", ackRequest(fixture)))).toBe("CT_FENCE_MISMATCH")
    expect(readFileSync(fixture.dbPath)).toEqual(before)
  })

  test("CT-JD-S5-001 complete rejects a retired claim token after same-root claimant rebind", () => {
    const fixture = setupAttestedFixture(), reboundDispatch = rebindClaimant(fixture), before = readFileSync(fixture.dbPath)
    expect(errorCode(() => reboundDispatch("complete", completeRequest(fixture)))).toBe("CT_FENCE_MISMATCH")
    expect(readFileSync(fixture.dbPath)).toEqual(before)
  })

  test("CT-JD-S5-001 historical ACK and COMPLETE authorities must equal the owning claim tuple", () => {
    const ackFixture = setupClaimedFixture()
    ackFixture.workerDispatch("ack", ackRequest(ackFixture))
    rebindClaimant(ackFixture)
    forgeMixedClaimAuthorityHistory(ackFixture, "ack")
    expect(errorCode(() => ackFixture.mainDispatch("status"))).toBe("CT_SCHEMA_INVALID")

    const completeFixture = setupAttestedFixture()
    completeFixture.workerDispatch("complete", completeRequest(completeFixture))
    rebindClaimant(completeFixture)
    forgeMixedClaimAuthorityHistory(completeFixture, "complete")
    expect(errorCode(() => completeFixture.mainDispatch("status"))).toBe("CT_SCHEMA_INVALID")
  })
})
