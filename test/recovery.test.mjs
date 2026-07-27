import { afterEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { execFileSync } from "node:child_process"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import * as tower from "../core.mjs"
import { createMcpHandler } from "../mcp.mjs"

// P6-C proof plane: recordTerminationReceipt (server-only observation,
// pairing, freshness, PID-reuse rejection) and the quiescence_v1/
// frozen_inventory_v1 pure derivation. RED scenario ownership: CT-R7-S1
// (insufficient proof) and CT-R7-S5 (freshness verification). Every fixture
// is real, non-synthetic P3/P4 history built through the actual dispatcher
// inside an isolated mkdtempSync git root; Tower is never activated for real.

const temporaryDirectories = []
const git = (repository, args) =>
  execFileSync("git", args, { cwd: repository, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
}
const digest = (value) => `sha256:${createHash("sha256").update(Buffer.from(value)).digest("hex")}`
const errorCode = (operation) => {
  try {
    operation()
  } catch (error) {
    return error.code
  }
  return null
}
const createMainFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "control-tower-recovery-"))
  const main = join(root, "main")
  temporaryDirectories.push(root)
  mkdirSync(main)
  git(main, ["init", "-q", "-b", "main"])
  git(main, ["config", "user.email", "tower-test@example.invalid"])
  git(main, ["config", "user.name", "Tower Test"])
  git(main, ["commit", "-q", "--allow-empty", "-m", "initial"])
  return { root, main }
}
const seedLegacy = (main) => {
  const runtime = join(main, ".git", "control-tower")
  mkdirSync(runtime, { recursive: true, mode: 0o700 })
  const db = new Database(join(runtime, "tower.db"))
  db.run(`CREATE TABLE agent (name TEXT PRIMARY KEY, role TEXT NOT NULL, worktree TEXT NOT NULL, branch TEXT, state TEXT NOT NULL, task TEXT, note TEXT, pr_url TEXT, updated_at TEXT NOT NULL);
CREATE TABLE message (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT NOT NULL, sender TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL, consumed_at TEXT);
CREATE INDEX message_pending ON message (recipient, id) WHERE consumed_at IS NULL;
CREATE TABLE lock (name TEXT PRIMARY KEY, holder TEXT, acquired_at TEXT);`)
  db.close()
}
const opaqueProcess = () => ({ mcp_process_instance: randomBytes(32).toString("base64url"), pid_start_marker: `pid-start-${randomBytes(8).toString("hex")}` })
const capability = (overrides = {}) => ({ host_process_instance: "host-process-a", plugin_instance: "plugin-a", root_session_id: "root-a", binding_epoch: 0, ...overrides })
const dispatcher = (main, metadata, identity, processObserver) => tower.createContinuationDispatcher({
  cwd: main, trustedMetadata: { snapshot: () => metadata }, processIdentity: { snapshot: () => identity }, processObserver,
})
const mainRequest = (anchor, epoch = 0, request_identity = randomUUID()) => ({ request_identity, expected_anchor_id: anchor.anchor_id, expected_binding_epoch: epoch })
const registerRequest = (epoch = 0, state = "ABSENT", request_identity = randomUUID()) => ({ request_identity, expected_binding_epoch: epoch, expected_binding_state: state })
const activationRequest = (epoch = 1, evidence_digest = digest("p6c-activation-evidence"), request_identity = randomUUID()) => ({ request_identity, expected_mode: "OFF", expected_binding_epoch: epoch, evidence_digest })
const singleObserver = (result) => ({ observe: () => result })
const effect = (effect_index = 0) => ({ effect_index, target_kind: "FILESYSTEM", target: `p6d-effect-${effect_index}`, operation: "write",
  observability: "OBSERVABLE", compensatability: "COMPENSATABLE", pre_state_digest: digest(`p6d-pre-state-${effect_index}`) })
const effectManifest = (id, generation, effects = [effect()]) => ({
  kind: "effect_manifest_v1", version: 1, id, generation, effects,
  pre_start_boundary_digest: digest(canonical({ kind: "effect_boundary_v1", version: 1, id, generation,
    effects: effects.map(({ effect_index, target_kind, target, pre_state_digest }) => ({ effect_index, target_kind, target, pre_state_digest })) })),
})
const rollbackProof = (manifest, overrides = {}) => {
  const receipts = manifest.effects.map((row) => ({ kind: "compensation_receipt_v1", version: 1, id: manifest.id, generation: manifest.generation,
    effect_index: row.effect_index, target_kind: row.target_kind, target: row.target, compensation_operation: `undo-${row.operation}`,
    read_back_digest: row.pre_state_digest, read_back_matches_pre_state: true, occurred_at: new Date().toISOString() }))
  const observed_boundary_digest = digest(canonical({ kind: "effect_boundary_v1", version: 1, id: manifest.id, generation: manifest.generation,
    effects: receipts.map(({ effect_index, target_kind, target, read_back_digest }) => ({ effect_index, target_kind, target, pre_state_digest: read_back_digest })) }))
  return { kind: "rollback_proof_v1", version: 1, id: manifest.id, generation: manifest.generation,
    pre_start_boundary_digest: manifest.pre_start_boundary_digest, receipts, observed_boundary_digest, boundary_equal: true, ...overrides }
}

// Real bootstrapAdmin 1->2->3->4->5, mirroring P6-A/B's own fixtures.
const provisionV5 = () => {
  const { main } = createMainFixture()
  const context = tower.deriveCanonicalMainContext(main)
  const anchor = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
  seedLegacy(main)
  for (const [expected_schema_version, target_schema_version] of [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]) {
    tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version, target_schema_version, expected_mode: "OFF" }, main)
  }
  return { main, context, anchor, dbPath: join(context.git_common_dir, "control-tower", "tower.db") }
}

// Real bootstrapMain + activate under mode ON, real claimant registration,
// and a real create->validate->publish->claim leaving the handoff CLAIMED
// with exactly one LIVE claim — the crashed-claimant precondition CT-R7-S1
// and CT-R7-S5 both describe.
const buildClaimedFixture = ({ claim = true } = {}) => {
  const fixture = provisionV5()
  const mainIdentity = opaqueProcess(), mainMetadata = capability()
  const mainDispatch = dispatcher(fixture.main, mainMetadata, mainIdentity)
  const main = mainDispatch("bootstrapMain", mainRequest(fixture.anchor))
  mainMetadata.binding_epoch = main.binding_epoch
  mainDispatch("activate", activationRequest(main.binding_epoch))

  const workerIdentity = opaqueProcess(), workerMetadata = capability({ plugin_instance: "worker-plugin", root_session_id: "worker-root" })
  const workerDispatch = dispatcher(fixture.main, workerMetadata, workerIdentity)
  const registered = workerDispatch("register", registerRequest())
  workerMetadata.binding_epoch = registered.binding_epoch

  writeFileSync(join(fixture.main, "p6c-unit.txt"), "p6-c fixture unit contents\n")
  git(fixture.main, ["add", "p6c-unit.txt"])
  git(fixture.main, ["commit", "-q", "-m", "add p6-c fixture file"])
  const headOid = git(fixture.main, ["rev-parse", "HEAD"])
  const fileDigest = digest(readFileSync(join(fixture.main, "p6c-unit.txt")))
  const lineageId = randomUUID()
  const sourceMerge = { sha: headOid, url: "https://example.invalid/p6c-merge" }
  const payload = {
    kind: "control_tower_handoff_v1", version: 1,
    lineage: { lineage_id: lineageId, revision: 1 },
    repository: {
      repository_fingerprint: digest(canonical({ kind: "canonical_repo_v1", path: fixture.context.canonical_repo })),
      git_common_dir_fingerprint: digest(canonical({ kind: "git_common_dir_v1", path: fixture.context.git_common_dir })),
      source_merge: sourceMerge,
    },
    next_unit: { unit_id: "p6c-unit", scope: "p6-c fixture scope", dependencies: [], references: [{ kind: "FILE", value: "p6c-unit.txt", digest: fileDigest }] },
    snapshots: [{ name: "p6c-snapshot", digest: digest("p6c-snapshot") }],
    provenance: { source_kind: "TEST", source_ref: "p6c-fixture", source_digest: digest(canonical({ source_kind: "TEST", source_ref: "p6c-fixture", source_merge_sha: sourceMerge.sha, source_merge_url: sourceMerge.url })) },
    decision_summary: "p6-c fixture decision",
  }
  const payload_digest = digest(canonical(payload))
  const created = workerDispatch("create", { request_identity: randomUUID(), lineage_id: lineageId, revision: 1, payload, payload_digest })
  mainDispatch("validate", { request_identity: randomUUID(), id: created.id, es: "DRAFT", eg: created.generation, payload_digest })
  mainDispatch("publish", { request_identity: randomUUID(), id: created.id, es: "VALIDATED", eg: created.generation })
  const before = new Database(fixture.dbPath, { readonly: true })
  const deliveryId = before.query("SELECT delivery_id FROM ct_delivery WHERE handoff_id=?").get(created.id).delivery_id
  before.close()
  const claimed = claim ? workerDispatch("claim", { request_identity: randomUUID(), delivery_id: deliveryId, id: created.id, es: "PUBLISHED", eg: created.generation, purpose: "WORK" }) : null

  const rows = new Database(fixture.dbPath, { readonly: true })
  const workerRow = rows.query("SELECT * FROM ct_claimant_binding WHERE binding_id=?").get(registered.binding_id)
  const mainRow = rows.query("SELECT * FROM ct_main_binding WHERE main_binding_id=?").get(main.main_binding_id)
  const claimRow = rows.query("SELECT claim_id FROM ct_claim WHERE handoff_id=? AND generation=?").get(created.id, created.generation)
  rows.close()

  return {
    fixture, mainDispatch, mainMetadata, mainIdentity, mainBindingId: main.main_binding_id, mainBindingEpoch: main.binding_epoch, mainIdentityDigest: mainRow.identity_digest,
    workerDispatch, workerMetadata, workerIdentity,
    workerBindingId: registered.binding_id, workerBindingEpoch: registered.binding_epoch, workerIdentityDigest: workerRow.identity_digest,
    handoffId: created.id, generation: claimed?.generation ?? created.generation, deliveryId, claimId: claimRow?.claim_id ?? null, token: claimed?.token ?? null,
  }
}
// Adds one more DRAFT handoff (same claimant) and immediately rejects it,
// so a frozen inventory can be proven to exclude the terminal REJECTED
// handoff while still naming the live CLAIMED one from the base fixture.
const addRejectedDraftHandoff = (built) => {
  writeFileSync(join(built.fixture.main, "p6c-second-unit.txt"), "p6-c second fixture unit contents\n")
  git(built.fixture.main, ["add", "p6c-second-unit.txt"])
  git(built.fixture.main, ["commit", "-q", "-m", "add p6-c second fixture file"])
  const headOid = git(built.fixture.main, ["rev-parse", "HEAD"])
  const fileDigest = digest(readFileSync(join(built.fixture.main, "p6c-second-unit.txt")))
  const lineageId = randomUUID()
  const sourceMerge = { sha: headOid, url: "https://example.invalid/p6c-second-merge" }
  const payload = {
    kind: "control_tower_handoff_v1", version: 1,
    lineage: { lineage_id: lineageId, revision: 1 },
    repository: {
      repository_fingerprint: digest(canonical({ kind: "canonical_repo_v1", path: built.fixture.context.canonical_repo })),
      git_common_dir_fingerprint: digest(canonical({ kind: "git_common_dir_v1", path: built.fixture.context.git_common_dir })),
      source_merge: sourceMerge,
    },
    next_unit: { unit_id: "p6c-second-unit", scope: "p6-c second fixture scope", dependencies: [], references: [{ kind: "FILE", value: "p6c-second-unit.txt", digest: fileDigest }] },
    snapshots: [{ name: "p6c-second-snapshot", digest: digest("p6c-second-snapshot") }],
    provenance: { source_kind: "TEST", source_ref: "p6c-second-fixture", source_digest: digest(canonical({ source_kind: "TEST", source_ref: "p6c-second-fixture", source_merge_sha: sourceMerge.sha, source_merge_url: sourceMerge.url })) },
    decision_summary: "p6-c second fixture decision",
  }
  const payload_digest = digest(canonical(payload))
  const created = built.workerDispatch("create", { request_identity: randomUUID(), lineage_id: lineageId, revision: 1, payload, payload_digest })
  built.mainDispatch("reject", { request_identity: randomUUID(), id: created.id, es: "DRAFT", eg: created.generation })
  return created.id
}
const claimantRequest = (built, process_role, request_identity = randomUUID()) => ({
  request_identity, subject_kind: "CLAIMANT", subject_binding_id: built.workerBindingId, subject_binding_epoch: built.workerBindingEpoch, process_role,
})
const bootId = () => `boot-${randomBytes(8).toString("hex")}`
const sessionId = () => `session-${randomBytes(8).toString("hex")}`
const recordClaimantPair = (built) => {
  const boot = bootId(), session = sessionId()
  const dispatch = dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity,
    singleObserver({ status: "ABSENT", observed_start_marker: null, os_boot_id: boot, os_session_id: session }))
  dispatch("recordTerminationReceipt", claimantRequest(built, "HOST"))
  dispatch("recordTerminationReceipt", claimantRequest(built, "MCP"))
}
const insertStoredTerminationPair = (built, { observedAt = new Date().toISOString(), recordedAt = observedAt, receiptJsonFor = canonical } = {}) => {
  const db = new Database(built.fixture.dbPath)
  const subject = db.query("SELECT * FROM ct_claimant_binding WHERE binding_id=?").get(built.workerBindingId)
  const boot = bootId(), session = sessionId()
  const pairingValue = { kind: "termination_pairing_v1", version: 1, subject_binding_id: subject.binding_id, subject_identity_digest: subject.identity_digest,
    subject_binding_epoch: subject.binding_epoch, rollback_epoch: 0, generation: built.generation, os_boot_id: boot, os_session_id: session, roles: ["HOST", "MCP"] }
  const pairingDigest = digest(canonical(pairingValue))
  for (const role of ["HOST", "MCP"]) {
    const receiptValue = {
      kind: "termination_receipt_v1", version: 1,
      subject: { kind: "CLAIMANT", binding_id: subject.binding_id, identity_digest: subject.identity_digest, binding_epoch: subject.binding_epoch },
      process: { role, host_process_instance: subject.host_process_instance, plugin_instance: subject.plugin_instance, root_session_id: subject.root_session_id,
        mcp_process_instance: subject.mcp_process_instance, pid_start_marker: subject.pid_start_marker, observed_start_marker: null },
      proof: { issuer: "CT_MAIN_OBSERVER_V1", verifier: "CT_MAIN_VERIFIER_V1", method: "OS_PROCESS_TABLE_V1", observation: "ABSENT", os_boot_id: boot, os_session_id: session, terminated: true },
      binding: { rollback_epoch: 0, lease_version: 0, generation: built.generation, handoff_id: built.handoffId }, observed_at: observedAt,
    }
    db.run(`INSERT INTO ct_termination_receipt(receipt_id,subject_kind,subject_binding_id,subject_identity_digest,subject_binding_epoch,process_role,pairing_digest,
      issuer,verifier,method,observation,terminated,os_boot_id,os_session_id,host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,
      observed_start_marker,rollback_epoch,lease_version,generation,handoff_id,receipt_json,receipt_digest,observed_at,recorded_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [randomBytes(32).toString("base64url"), "CLAIMANT", subject.binding_id, subject.identity_digest, subject.binding_epoch, role, pairingDigest,
        "CT_MAIN_OBSERVER_V1", "CT_MAIN_VERIFIER_V1", "OS_PROCESS_TABLE_V1", "ABSENT", boot, session, subject.host_process_instance, subject.plugin_instance,
        subject.root_session_id, subject.mcp_process_instance, subject.pid_start_marker, null, 0, 0, built.generation, built.handoffId,
        receiptJsonFor(receiptValue), digest(canonical(receiptValue)), observedAt, recordedAt])
  }
  db.close()
}
const recoverRequest = (built, action, overrides = {}) => ({
  request_identity: randomUUID(), id: built.handoffId, es: action === "ROLLED_BACK" ? "STARTED" : "CLAIMED", eg: built.generation,
  action, expected_rollback_epoch: 0, delivery_id: built.deliveryId, claim_id: built.claimId, rollback_proof: null, ...overrides,
})
const ackStarted = (built) => {
  const manifest = effectManifest(built.handoffId, built.generation)
  built.workerDispatch("ack", { request_identity: randomUUID(), delivery_id: built.deliveryId, id: built.handoffId, es: "CLAIMED", eg: built.generation,
    purpose: "WORK", token: built.token, effect_manifest: manifest })
  return manifest
}
const recoverClaimedHistory = (action) => {
  const built = buildClaimedFixture()
  const manifest = action === "ROLLED_BACK" ? ackStarted(built) : null
  recordClaimantPair(built)
  const request = recoverRequest(built, action, { rollback_proof: manifest ? rollbackProof(manifest) : null })
  built.mainDispatch("recover", request)
  expect(built.mainDispatch("status", undefined).schema_version).toBe(5)
  return built
}
const mutableTerminationHistory = (built) => {
  const db = new Database(built.fixture.dbPath)
  db.run("DROP TRIGGER ct_termination_receipt_no_update")
  db.run("DROP TRIGGER ct_termination_receipt_no_delete")
  // Raw-history fixtures intentionally remove the record-operation envelopes:
  // RECOVER must prove its own non-null digest from canonical source rows.
  db.run("DELETE FROM ct_idempotency WHERE operation='recordTerminationReceipt'")
  return db
}
const sealTerminationHistory = (db) => {
  db.run(`CREATE TRIGGER ct_termination_receipt_no_update
BEFORE UPDATE ON ct_termination_receipt
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_TERMINATION_RECEIPT');
END`)
  db.run(`CREATE TRIGGER ct_termination_receipt_no_delete
BEFORE DELETE ON ct_termination_receipt
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_TERMINATION_RECEIPT');
END`)
  db.close()
}

describe("P6-C proof plane: recordTerminationReceipt", () => {
  test("records a fresh ABSENT receipt for a crashed CLAIMED claimant, exposes only the pinned public shape, and replays idempotently", () => {
    const built = buildClaimedFixture()
    const boot = bootId(), session = sessionId()
    const dispatch = dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "ABSENT", observed_start_marker: null, os_boot_id: boot, os_session_id: session }))
    const request = claimantRequest(built, "HOST")
    const response = dispatch("recordTerminationReceipt", request)
    expect(response).toEqual({ subject_kind: "CLAIMANT", process_role: "HOST", recorded: true, replayed: false })

    const db = new Database(built.fixture.dbPath, { readonly: true })
    const row = db.query("SELECT * FROM ct_termination_receipt").get()
    db.close()
    expect(row.subject_kind).toBe("CLAIMANT")
    expect(row.subject_binding_id).toBe(built.workerBindingId)
    expect(row.subject_identity_digest).toBe(built.workerIdentityDigest)
    expect(row.observation).toBe("ABSENT")
    expect(row.observed_start_marker).toBeNull()
    expect(row.handoff_id).toBe(built.handoffId)
    expect(row.generation).toBe(built.generation)
    expect(row.terminated).toBe(1)

    const replay = dispatch("recordTerminationReceipt", request)
    expect(replay).toEqual({ subject_kind: "CLAIMANT", process_role: "HOST", recorded: true, replayed: true })
    const afterReplay = new Database(built.fixture.dbPath, { readonly: true })
    expect(afterReplay.query("SELECT COUNT(*) AS count FROM ct_termination_receipt").get().count).toBe(1)
    afterReplay.close()

    expect(errorCode(() => dispatch("recordTerminationReceipt", { ...claimantRequest(built, "MCP"), request_identity: request.request_identity }))).toBe("CT_IDEMPOTENCY_CONFLICT")
  })

  test("CT-R7-S1 — a live (PRESENT) process is rejected with CT_RECOVERY_REQUIRED and no row is written", () => {
    const built = buildClaimedFixture()
    const dispatch = dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "PRESENT", observed_start_marker: null, os_boot_id: bootId(), os_session_id: sessionId() }))
    expect(errorCode(() => dispatch("recordTerminationReceipt", claimantRequest(built, "HOST")))).toBe("CT_RECOVERY_REQUIRED")
    const db = new Database(built.fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_termination_receipt").get().count).toBe(0)
    db.close()
  })

  test("CT-R7-S5 — an ambiguous (reused-PID) observation is rejected with CT_RECOVERY_REQUIRED and no row is written", () => {
    const built = buildClaimedFixture()
    const dispatch = dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "AMBIGUOUS", observed_start_marker: null, os_boot_id: bootId(), os_session_id: sessionId() }))
    expect(errorCode(() => dispatch("recordTerminationReceipt", claimantRequest(built, "MCP")))).toBe("CT_RECOVERY_REQUIRED")
    const db = new Database(built.fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_termination_receipt").get().count).toBe(0)
    db.close()
  })

  test("CT-R7-S1 — recordTerminationReceipt fails closed without a processObserver capability, and the tool is not listed", () => {
    const built = buildClaimedFixture()
    const dispatch = dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, undefined)
    expect(errorCode(() => dispatch("recordTerminationReceipt", claimantRequest(built, "HOST")))).toBe("CT_RECOVERY_REQUIRED")
    const db = new Database(built.fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_termination_receipt").get().count).toBe(0)
    db.close()

    const withoutObserver = createMcpHandler({ cwd: built.fixture.main, trustedMetadata: { snapshot: () => built.mainMetadata }, processIdentity: { snapshot: () => built.mainIdentity } })
    const listedWithout = withoutObserver({ method: "tools/list" }).tools.map((tool) => tool.name)
    expect(listedWithout).not.toContain("recordTerminationReceipt")

    const withObserver = createMcpHandler({ cwd: built.fixture.main, trustedMetadata: { snapshot: () => built.mainMetadata }, processIdentity: { snapshot: () => built.mainIdentity }, processObserver: singleObserver({ status: "ABSENT" }) })
    const listedWith = withObserver({ method: "tools/list" }).tools.map((tool) => tool.name)
    expect(listedWith).toContain("recordTerminationReceipt")
  })

  test("records a MAIN-subject receipt naming the persisted Main binding, generation 0, handoff_id null", () => {
    const built = buildClaimedFixture()
    const dispatch = dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "REPLACED", observed_start_marker: "replaced-marker", os_boot_id: bootId(), os_session_id: sessionId() }))
    const request = { request_identity: randomUUID(), subject_kind: "MAIN", subject_binding_id: built.mainBindingId, subject_binding_epoch: built.mainBindingEpoch, process_role: "MCP" }
    expect(dispatch("recordTerminationReceipt", request)).toEqual({ subject_kind: "MAIN", process_role: "MCP", recorded: true, replayed: false })
    const db = new Database(built.fixture.dbPath, { readonly: true })
    const row = db.query("SELECT * FROM ct_termination_receipt WHERE subject_kind='MAIN'").get()
    db.close()
    expect(row.subject_identity_digest).toBe(built.mainIdentityDigest)
    expect(row.handoff_id).toBeNull()
    expect(row.generation).toBe(0)
    expect(row.observation).toBe("REPLACED")
    expect(row.observed_start_marker).toBe("replaced-marker")
  })

  test("rejects the exact accepted key allowlist and a bare/absent process_role", () => {
    const built = buildClaimedFixture()
    const dispatch = dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "ABSENT", observed_start_marker: null, os_boot_id: bootId(), os_session_id: sessionId() }))
    const base = claimantRequest(built, "HOST")
    expect(errorCode(() => dispatch("recordTerminationReceipt", { ...base, extra: "x" }))).toBe("CT_PAYLOAD_INVALID")
    expect(errorCode(() => dispatch("recordTerminationReceipt", { ...base, process_role: "ORCHESTRATOR" }))).toBe("CT_PAYLOAD_INVALID")
    expect(errorCode(() => dispatch("recordTerminationReceipt", { ...base, subject_kind: "WORKER" }))).toBe("CT_PAYLOAD_INVALID")
    const { subject_binding_epoch, ...missingEpoch } = base
    expect(errorCode(() => dispatch("recordTerminationReceipt", missingEpoch))).toBe("CT_PAYLOAD_INVALID")
  })

  test("rejects a subject_binding_epoch that does not match the persisted binding row with CT_SCHEMA_INVALID, and an unknown subject_binding_id with CT_NOT_FOUND", () => {
    const built = buildClaimedFixture()
    const dispatch = dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "ABSENT", observed_start_marker: null, os_boot_id: bootId(), os_session_id: sessionId() }))
    expect(errorCode(() => dispatch("recordTerminationReceipt", { ...claimantRequest(built, "HOST"), subject_binding_epoch: built.workerBindingEpoch + 1 }))).toBe("CT_SCHEMA_INVALID")
    expect(errorCode(() => dispatch("recordTerminationReceipt", { ...claimantRequest(built, "HOST"), subject_binding_id: randomBytes(32).toString("base64url") }))).toBe("CT_NOT_FOUND")
  })
})

describe("P6-C proof plane: validTerminationPairing (reused unmodified by later units)", () => {
  const pairingArgs = (built) => ({
    subjectBindingId: built.workerBindingId, subjectBindingEpoch: built.workerBindingEpoch, subjectIdentityDigest: built.workerIdentityDigest,
    rollbackEpoch: 0, generation: built.generation,
  })
  const openDb = (built) => new Database(built.fixture.dbPath, { readonly: true })

  test("CT-R7-S1 — bare/absent proof: zero receipts is rejected with CT_RECOVERY_REQUIRED", () => {
    const built = buildClaimedFixture()
    const db = openDb(built)
    expect(errorCode(() => tower.validTerminationPairing(db, pairingArgs(built)))).toBe("CT_RECOVERY_REQUIRED")
    db.close()
  })

  test("CT-R7-S5 — unpaired proof: only one role recorded is rejected with CT_RECOVERY_REQUIRED", () => {
    const built = buildClaimedFixture()
    const boot = bootId(), session = sessionId()
    const dispatch = dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "ABSENT", observed_start_marker: null, os_boot_id: boot, os_session_id: session }))
    dispatch("recordTerminationReceipt", claimantRequest(built, "HOST"))
    const db = openDb(built)
    expect(errorCode(() => tower.validTerminationPairing(db, pairingArgs(built)))).toBe("CT_RECOVERY_REQUIRED")
    db.close()
  })

  test("a valid HOST+MCP pairing recomputes exactly and is accepted", () => {
    const built = buildClaimedFixture()
    const boot = bootId(), session = sessionId()
    dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "ABSENT", observed_start_marker: null, os_boot_id: boot, os_session_id: session }))("recordTerminationReceipt", claimantRequest(built, "HOST"))
    dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "ABSENT", observed_start_marker: null, os_boot_id: boot, os_session_id: session }))("recordTerminationReceipt", claimantRequest(built, "MCP"))
    const db = openDb(built)
    const result = tower.validTerminationPairing(db, pairingArgs(built))
    db.close()
    expect(result.host.process_role).toBe("HOST")
    expect(result.mcp.process_role).toBe("MCP")
    expect(result.pairing_digest).toBe(result.host.pairing_digest)
  })

  test("accepts a canonically stored receipt pair inside the freshness boundary", () => {
    const built = buildClaimedFixture()
    insertStoredTerminationPair(built, { observedAt: new Date(Date.now() - 29_000).toISOString() })
    const db = openDb(built)
    expect(tower.validTerminationPairing(db, pairingArgs(built)).pairing_digest).toMatch(/^sha256:[0-9a-f]{64}$/)
    db.close()
  })

  for (const [name, options] of [
    ["invalid observed_at", { observedAt: "x".repeat(24) }],
    ["future observed_at", { observedAt: new Date(Date.now() + 10_000).toISOString() }],
    ["receipt_json mismatch", { receiptJsonFor: () => "{}" }],
  ]) test(`rejects ${name} with CT_RECOVERY_REQUIRED`, () => {
    const built = buildClaimedFixture()
    insertStoredTerminationPair(built, options)
    const db = openDb(built)
    expect(errorCode(() => tower.validTerminationPairing(db, pairingArgs(built)))).toBe("CT_RECOVERY_REQUIRED")
    db.close()
  })

  test("CT-R7-S5 — mismatched os_boot_id between HOST and MCP rows is rejected with CT_RECOVERY_REQUIRED", () => {
    const built = buildClaimedFixture()
    const session = sessionId()
    dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "ABSENT", observed_start_marker: null, os_boot_id: bootId(), os_session_id: session }))("recordTerminationReceipt", claimantRequest(built, "HOST"))
    dispatcher(built.fixture.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "ABSENT", observed_start_marker: null, os_boot_id: bootId(), os_session_id: session }))("recordTerminationReceipt", claimantRequest(built, "MCP"))
    const db = openDb(built)
    expect(errorCode(() => tower.validTerminationPairing(db, pairingArgs(built)))).toBe("CT_RECOVERY_REQUIRED")
    db.close()
  })

  test("CT-R7-S5 — a receipt older than 30 seconds is rejected as stale even with a structurally valid pairing", () => {
    const built = buildClaimedFixture()
    const boot = bootId(), session = sessionId()
    // No real recordTerminationReceipt call precedes this: observed_at is
    // always the live server clock at record time, so staleness can only be
    // proven by directly persisting two isolated, trigger-restored, exact
    // rows built from the same persisted claimant_binding fields the real
    // handler would read, at a deliberately old observed_at/recorded_at.
    const rowsDb = new Database(built.fixture.dbPath)
    const subject = rowsDb.query("SELECT * FROM ct_claimant_binding WHERE binding_id=?").get(built.workerBindingId)
    const oldObservedAt = new Date(Date.now() - 45_000).toISOString().replace(/(\.\d{3})\d*Z$/, "$1Z")
    for (const role of ["HOST", "MCP"]) {
      const receiptValue = {
        kind: "termination_receipt_v1", version: 1,
        subject: { kind: "CLAIMANT", binding_id: subject.binding_id, identity_digest: subject.identity_digest, binding_epoch: subject.binding_epoch },
        process: { role, host_process_instance: subject.host_process_instance, plugin_instance: subject.plugin_instance, root_session_id: subject.root_session_id,
          mcp_process_instance: subject.mcp_process_instance, pid_start_marker: subject.pid_start_marker, observed_start_marker: null },
        proof: { issuer: "CT_MAIN_OBSERVER_V1", verifier: "CT_MAIN_VERIFIER_V1", method: "OS_PROCESS_TABLE_V1", observation: "ABSENT", os_boot_id: boot, os_session_id: session, terminated: true },
        binding: { rollback_epoch: 0, lease_version: 0, generation: built.generation, handoff_id: built.handoffId },
        observed_at: oldObservedAt,
      }
      const pairingValue = { kind: "termination_pairing_v1", version: 1, subject_binding_id: subject.binding_id, subject_identity_digest: subject.identity_digest,
        subject_binding_epoch: subject.binding_epoch, rollback_epoch: 0, generation: built.generation, os_boot_id: boot, os_session_id: session, roles: ["HOST", "MCP"] }
      const receiptDigest = digest(canonical(receiptValue)), pairingDigest = digest(canonical(pairingValue))
      rowsDb.run(`INSERT INTO ct_termination_receipt(receipt_id,subject_kind,subject_binding_id,subject_identity_digest,subject_binding_epoch,process_role,pairing_digest,
        issuer,verifier,method,observation,terminated,os_boot_id,os_session_id,host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,
        observed_start_marker,rollback_epoch,lease_version,generation,handoff_id,receipt_json,receipt_digest,observed_at,recorded_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [randomBytes(32).toString("base64url"), "CLAIMANT", subject.binding_id, subject.identity_digest, subject.binding_epoch, role, pairingDigest,
          "CT_MAIN_OBSERVER_V1", "CT_MAIN_VERIFIER_V1", "OS_PROCESS_TABLE_V1", "ABSENT", boot, session,
          subject.host_process_instance, subject.plugin_instance, subject.root_session_id, subject.mcp_process_instance, subject.pid_start_marker,
          null, 0, 0, built.generation, built.handoffId,
          canonical(receiptValue), receiptDigest, oldObservedAt, oldObservedAt])
    }
    rowsDb.close()

    const db = openDb(built)
    expect(db.query("SELECT COUNT(*) AS count FROM ct_termination_receipt").get().count).toBe(2)
    expect(errorCode(() => tower.validTerminationPairing(db, pairingArgs(built)))).toBe("CT_RECOVERY_REQUIRED")
    db.close()
  })

  test("CT-R7-S5 — a stored receipt_digest that does not recompute from its own row is rejected with CT_RECOVERY_REQUIRED", () => {
    const built = buildClaimedFixture()
    const boot = bootId(), session = sessionId()
    // The immutability triggers reject any UPDATE, so a non-recomputing
    // digest is proven by directly inserting one isolated row whose stored
    // receipt_digest is a well-formed but wrong sha256 value — never by
    // mutating an already-committed row.
    const rowsDb = new Database(built.fixture.dbPath)
    const subject = rowsDb.query("SELECT * FROM ct_claimant_binding WHERE binding_id=?").get(built.workerBindingId)
    const observedAt = new Date().toISOString()
    const pairingValue = { kind: "termination_pairing_v1", version: 1, subject_binding_id: subject.binding_id, subject_identity_digest: subject.identity_digest,
      subject_binding_epoch: subject.binding_epoch, rollback_epoch: 0, generation: built.generation, os_boot_id: boot, os_session_id: session, roles: ["HOST", "MCP"] }
    const pairingDigest = digest(canonical(pairingValue))
    for (const role of ["HOST", "MCP"]) {
      const wrongDigest = digest(`not-the-real-receipt-${role}`)
      rowsDb.run(`INSERT INTO ct_termination_receipt(receipt_id,subject_kind,subject_binding_id,subject_identity_digest,subject_binding_epoch,process_role,pairing_digest,
        issuer,verifier,method,observation,terminated,os_boot_id,os_session_id,host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,
        observed_start_marker,rollback_epoch,lease_version,generation,handoff_id,receipt_json,receipt_digest,observed_at,recorded_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [randomBytes(32).toString("base64url"), "CLAIMANT", subject.binding_id, subject.identity_digest, subject.binding_epoch, role, pairingDigest,
          "CT_MAIN_OBSERVER_V1", "CT_MAIN_VERIFIER_V1", "OS_PROCESS_TABLE_V1", "ABSENT", boot, session,
          subject.host_process_instance, subject.plugin_instance, subject.root_session_id, subject.mcp_process_instance, subject.pid_start_marker,
          null, 0, 0, built.generation, built.handoffId,
          "{}", wrongDigest, observedAt, observedAt])
    }
    rowsDb.close()
    const db = openDb(built)
    expect(errorCode(() => tower.validTerminationPairing(db, pairingArgs(built)))).toBe("CT_RECOVERY_REQUIRED")
    db.close()
  })
})

describe("P6-D ON-mode recovery dispositions", () => {
  test("CT-R7-S2/S12 — NOT_STARTED atomically fences CLAIMED, closes the old claim/delivery, republishes at generation +1, and replays exactly", () => {
    const built = buildClaimedFixture()
    recordClaimantPair(built)
    const request = recoverRequest(built, "NOT_STARTED")
    expect(built.mainDispatch("recover", request)).toEqual({ id: built.handoffId, state: "PUBLISHED", generation: 1, replayed: false })
    expect(built.mainDispatch("recover", request)).toEqual({ id: built.handoffId, state: "PUBLISHED", generation: 1, replayed: true })

    const db = new Database(built.fixture.dbPath, { readonly: true })
    const handoff = db.query("SELECT state,generation FROM ct_handoff WHERE id=?").get(built.handoffId)
    const deliveries = db.query("SELECT delivery_id,generation,delivery_state,purpose,claim_id FROM ct_delivery WHERE handoff_id=? ORDER BY generation").all(built.handoffId)
    const claim = db.query("SELECT claim_state,closed_at FROM ct_claim WHERE claim_id=?").get(built.claimId)
    const disposition = db.query("SELECT * FROM ct_recovery_disposition WHERE handoff_id=?").get(built.handoffId)
    const transitions = db.query("SELECT operation,from_state,to_state,generation FROM ct_handoff_transition WHERE handoff_id=? AND operation='RECOVER'").all(built.handoffId)
    const idempotency = db.query("SELECT COUNT(*) AS count FROM ct_idempotency WHERE operation='recover'").get().count
    const proofRows = db.query("SELECT COUNT(*) AS count FROM ct_termination_receipt").get().count
    db.close()
    expect(handoff).toEqual({ state: "PUBLISHED", generation: 1 })
    expect(deliveries).toEqual([
      { delivery_id: built.deliveryId, generation: 0, delivery_state: "CLOSED", purpose: "WORK", claim_id: built.claimId },
      { delivery_id: disposition.created_delivery_id, generation: 1, delivery_state: "PENDING", purpose: "WORK", claim_id: null },
    ])
    expect(claim.claim_state).toBe("CLOSED")
    expect(claim.closed_at).toBe(disposition.occurred_at)
    expect(disposition.disposition).toBe("NOT_STARTED")
    expect(disposition.termination_pairing_digest).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(transitions).toEqual([{ operation: "RECOVER", from_state: "CLAIMED", to_state: "PUBLISHED", generation: 1 }])
    expect(idempotency).toBe(1)
    expect(proofRows).toBe(2)
  })

  test("CT-R7-S6 — ROLLED_BACK recomputes a complete compensation boundary and republishes STARTED exactly once", () => {
    const built = buildClaimedFixture()
    const manifest = ackStarted(built)
    recordClaimantPair(built)
    const request = recoverRequest(built, "ROLLED_BACK", { rollback_proof: rollbackProof(manifest) })
    expect(built.mainDispatch("recover", request)).toEqual({ id: built.handoffId, state: "PUBLISHED", generation: 1, replayed: false })
    const db = new Database(built.fixture.dbPath, { readonly: true })
    const disposition = db.query("SELECT disposition,from_state,to_state,from_generation,to_generation,rollback_proof_digest,created_delivery_id FROM ct_recovery_disposition").get()
    const fresh = db.query("SELECT purpose,delivery_state,generation FROM ct_delivery WHERE delivery_id=?").get(disposition.created_delivery_id)
    db.close()
    expect(disposition).toEqual({ disposition: "ROLLED_BACK", from_state: "STARTED", to_state: "PUBLISHED", from_generation: 0, to_generation: 1,
      rollback_proof_digest: digest(canonical(request.rollback_proof)), created_delivery_id: disposition.created_delivery_id })
    expect(fresh).toEqual({ purpose: "WORK", delivery_state: "PENDING", generation: 1 })
  })

  test("CT-R7-S3 — absent or unequal rollback proof refuses republish and leaves STARTED state untouched", () => {
    for (const proofKind of ["absent", "unequal"]) {
      const built = buildClaimedFixture()
      const manifest = ackStarted(built)
      recordClaimantPair(built)
      const proof = proofKind === "absent" ? null : rollbackProof(manifest, { boundary_equal: false })
      expect(errorCode(() => built.mainDispatch("recover", recoverRequest(built, "ROLLED_BACK", { rollback_proof: proof })))).toBe("CT_RECOVERY_REQUIRED")
      const db = new Database(built.fixture.dbPath, { readonly: true })
      expect(db.query("SELECT state,generation FROM ct_handoff WHERE id=?").get(built.handoffId)).toEqual({ state: "STARTED", generation: 0 })
      expect(db.query("SELECT COUNT(*) AS count FROM ct_recovery_disposition").get().count).toBe(0)
      expect(db.query("SELECT COUNT(*) AS count FROM ct_delivery WHERE delivery_state='PENDING'").get().count).toBe(0)
      db.close()
    }
  })

  test("CT-R7-S4 — stale generation, wrong claim fence, missing pairing, and consumed attestation reject without a disposition", () => {
    const stale = buildClaimedFixture()
    recordClaimantPair(stale)
    expect(errorCode(() => stale.mainDispatch("recover", recoverRequest(stale, "NOT_STARTED", { eg: stale.generation + 1 })))).toBe("CT_FENCE_MISMATCH")
    expect(errorCode(() => stale.mainDispatch("recover", recoverRequest(stale, "NOT_STARTED", { claim_id: randomBytes(32).toString("base64url") })))).toBe("CT_FENCE_MISMATCH")

    const unpaired = buildClaimedFixture()
    const liveObserver = dispatcher(unpaired.fixture.main, unpaired.mainMetadata, unpaired.mainIdentity,
      singleObserver({ status: "PRESENT", observed_start_marker: null, os_boot_id: bootId(), os_session_id: sessionId() }))
    expect(errorCode(() => liveObserver("recordTerminationReceipt", claimantRequest(unpaired, "HOST")))).toBe("CT_RECOVERY_REQUIRED")
    expect(errorCode(() => unpaired.mainDispatch("recover", recoverRequest(unpaired, "NOT_STARTED")))).toBe("CT_RECOVERY_REQUIRED")

    const consumed = buildClaimedFixture()
    ackStarted(consumed)
    const attested = consumed.mainDispatch("attestCompletion", { request_identity: randomUUID(), id: consumed.handoffId, es: "STARTED", eg: consumed.generation })
    const rows = new Database(consumed.fixture.dbPath, { readonly: true })
    const attestationDigest = rows.query("SELECT decision_digest FROM ct_handoff_transition WHERE handoff_id=? AND operation='ATTEST_COMPLETION'").get(consumed.handoffId).decision_digest
    rows.close()
    consumed.workerDispatch("complete", { request_identity: randomUUID(), delivery_id: consumed.deliveryId, id: consumed.handoffId, es: attested.state,
      eg: consumed.generation, purpose: "WORK", token: consumed.token, attestation_digest: attestationDigest,
      committed_result: { kind: "committed_result_v1", version: 1, id: consumed.handoffId, generation: consumed.generation, attestation_digest: attestationDigest,
        result_ref: "p6d-consumed", result_digest: digest("p6d-result"), effect_settlement_digest: digest("p6d-settlement") } })
    expect(errorCode(() => consumed.mainDispatch("recover", recoverRequest(consumed, "CANCELLED", { es: "COMPLETION_ATTESTED" })))).toBe("CT_INVALID_TRANSITION")
    for (const built of [stale, unpaired, consumed]) {
      const db = new Database(built.fixture.dbPath, { readonly: true })
      expect(db.query("SELECT COUNT(*) AS count FROM ct_recovery_disposition").get().count).toBe(0)
      db.close()
    }
  })

  test("CT-R7-S12 — CANCELLED closes live work with proof while POISONED fences unclaimed PUBLISHED work without creating delivery", () => {
    const cancelled = buildClaimedFixture()
    recordClaimantPair(cancelled)
    expect(cancelled.mainDispatch("recover", recoverRequest(cancelled, "CANCELLED"))).toEqual({ id: cancelled.handoffId, state: "CANCELLED", generation: 0, replayed: false })
    const poisoned = buildClaimedFixture({ claim: false })
    const poisonRequest = recoverRequest(poisoned, "POISONED", { es: "PUBLISHED", claim_id: null })
    expect(poisoned.mainDispatch("recover", poisonRequest)).toEqual({ id: poisoned.handoffId, state: "POISONED", generation: 0, replayed: false })
    for (const [built, expected] of [[cancelled, "CANCELLED"], [poisoned, "POISONED"]]) {
      const db = new Database(built.fixture.dbPath, { readonly: true })
      expect(db.query("SELECT state,generation FROM ct_handoff WHERE id=?").get(built.handoffId)).toEqual({ state: expected, generation: 0 })
      expect(db.query("SELECT COUNT(*) AS count FROM ct_delivery WHERE handoff_id=? AND delivery_state<>'CLOSED'").get(built.handoffId).count).toBe(0)
      expect(db.query("SELECT COUNT(*) AS count FROM ct_recovery_disposition WHERE handoff_id=?").get(built.handoffId).count).toBe(1)
      db.close()
    }
  })

  for (const [name, action, mutate] of [
    ["zero source receipts", "NOT_STARTED", (db) => db.run("DELETE FROM ct_termination_receipt")],
    ["only one source role", "CANCELLED", (db) => db.run("DELETE FROM ct_termination_receipt WHERE process_role='MCP'")],
    ["wrong source identity", "CANCELLED", (db) => db.run("UPDATE ct_termination_receipt SET subject_identity_digest=?", [digest("wrong-claimant")])],
    ["wrong source pairing", "POISONED", (db) => db.run("UPDATE ct_termination_receipt SET pairing_digest=?", [digest("wrong-pairing")])],
    ["noncanonical source receipt_json", "NOT_STARTED", (db) => db.run("UPDATE ct_termination_receipt SET receipt_json='{}' WHERE process_role='HOST'")],
  ]) test(`historical ${action} rejects ${name} despite a self-consistent recovery envelope`, () => {
    const built = recoverClaimedHistory(action)
    const db = mutableTerminationHistory(built)
    mutate(db)
    sealTerminationHistory(db)
    expect(errorCode(() => built.mainDispatch("status", undefined))).toBe("CT_SCHEMA_INVALID")
  })

  test("historical claim-bearing recovery accepts a canonical source pair after its live 30-second window expires", () => {
    const built = recoverClaimedHistory("POISONED")
    const db = mutableTerminationHistory(built)
    const oldObservedAt = new Date(Date.now() - 60_000).toISOString()
    for (const row of db.query("SELECT receipt_id,receipt_json FROM ct_termination_receipt").all()) {
      const receipt = JSON.parse(row.receipt_json)
      receipt.observed_at = oldObservedAt
      db.run("UPDATE ct_termination_receipt SET receipt_json=?,receipt_digest=?,observed_at=?,recorded_at=? WHERE receipt_id=?",
        [canonical(receipt), digest(canonical(receipt)), oldObservedAt, oldObservedAt, row.receipt_id])
    }
    sealTerminationHistory(db)
    expect(built.mainDispatch("status", undefined).schema_version).toBe(5)
  })

  test("recover is capability-gated through MCP with the exact nine-field schema and no processObserver requirement", () => {
    const built = buildClaimedFixture()
    recordClaimantPair(built)
    const handler = createMcpHandler({ cwd: built.fixture.main, trustedMetadata: { snapshot: () => built.mainMetadata }, processIdentity: { snapshot: () => built.mainIdentity } })
    const tool = handler({ method: "tools/list" }).tools.find(({ name }) => name === "recover")
    expect(tool.inputSchema.required.slice().sort()).toEqual(["action", "claim_id", "delivery_id", "eg", "es", "expected_rollback_epoch", "id", "request_identity", "rollback_proof"])
    expect(tool.inputSchema.additionalProperties).toBe(false)
    const result = handler({ method: "tools/call", params: { name: "recover", arguments: recoverRequest(built, "NOT_STARTED") } })
    expect(result.isError).toBeUndefined()
    expect(JSON.parse(result.content[0].text)).toEqual({ id: built.handoffId, state: "PUBLISHED", generation: 1, replayed: false })
  })
})

describe("P6-C proof plane: deriveFrozenInventory / deriveQuiescenceSnapshot (pure derivation only)", () => {
  test("frozen inventory names every non-terminal handoff ascending by id, generation, and state, excluding terminal REJECTED", () => {
    const built = buildClaimedFixture()
    const rejectedId = addRejectedDraftHandoff(built)
    const db = new Database(built.fixture.dbPath, { readonly: true })
    const rejectedRow = db.query("SELECT state FROM ct_handoff WHERE id=?").get(rejectedId)
    const inventory = tower.deriveFrozenInventory(db, 0)
    db.close()
    expect(rejectedRow.state).toBe("REJECTED")
    expect(inventory.kind).toBe("frozen_inventory_v1")
    expect(inventory.rollback_epoch).toBe(0)
    expect(inventory.handoffs).toEqual([{ id: built.handoffId, state: "CLAIMED", generation: built.generation }])
  })

  test("quiescence snapshot's live/pending counts match status()'s own counts and the digest changes when live state changes", () => {
    const built = buildClaimedFixture()
    const db = new Database(built.fixture.dbPath, { readonly: true })
    const status = built.mainDispatch("status")
    const snapshotBefore = tower.deriveQuiescenceSnapshot(db, {
      snapshotKind: "ROLLBACK_FREEZE", rollbackEpoch: 0, leaseVersion: 0,
      owner: { main_binding_id: built.mainBindingId, binding_epoch: built.mainBindingEpoch, identity_digest: built.mainIdentityDigest },
      observedAt: "2026-01-01T00:00:00.000Z",
    })
    db.close()
    expect(snapshotBefore.value.live_counts).toEqual(status.live_counts)
    expect(snapshotBefore.value.pending_counts).toEqual(status.pending_counts)
    expect(snapshotBefore.value.polling_plane).toBe("UNAVAILABLE_BEFORE_P7")
    expect(snapshotBefore.value.frozen_inventory_digest).toBe(digest(canonical(tower.deriveFrozenInventory(new Database(built.fixture.dbPath, { readonly: true }), 0))))

    // Triangulate: reject the claimed handoff's counterpart by building a
    // second, independent PUBLISHED handoff and rejecting it — this changes
    // deliveries/live workers is untouched, but live_counts.claims/deliveries
    // must still be recomputed live rather than hardcoded, proven by a
    // second independent fixture below with zero claims.
    const emptyFixture = buildFreshEmptyMainFixture()
    const emptyDb = new Database(emptyFixture.dbPath, { readonly: true })
    const emptySnapshot = tower.deriveQuiescenceSnapshot(emptyDb, {
      snapshotKind: "ROLLBACK_FREEZE", rollbackEpoch: 0, leaseVersion: 0,
      owner: { main_binding_id: emptyFixture.mainBindingId, binding_epoch: emptyFixture.mainBindingEpoch, identity_digest: emptyFixture.mainIdentityDigest },
      observedAt: "2026-01-01T00:00:00.000Z",
    })
    emptyDb.close()
    expect(emptySnapshot.value.live_counts).toEqual({ claims: 0, deliveries: 0, workers: 0 })
    expect(emptySnapshot.value.pending_counts).toEqual({ work: 0, attestation: 0 })
    expect(emptySnapshot.digest).not.toBe(snapshotBefore.digest)
  })
})

// A Main-only fixture (no claimant, no handoff) proves live/pending counts
// are computed from real (empty) state rather than hardcoded to match the
// claimed fixture above.
const buildFreshEmptyMainFixture = () => {
  const fixture = provisionV5()
  const mainIdentity = opaqueProcess(), mainMetadata = capability()
  const mainDispatch = dispatcher(fixture.main, mainMetadata, mainIdentity)
  const main = mainDispatch("bootstrapMain", mainRequest(fixture.anchor))
  mainMetadata.binding_epoch = main.binding_epoch
  mainDispatch("activate", activationRequest(main.binding_epoch))
  const rows = new Database(fixture.dbPath, { readonly: true })
  const mainRow = rows.query("SELECT * FROM ct_main_binding WHERE main_binding_id=?").get(main.main_binding_id)
  rows.close()
  return { ...fixture, mainDispatch, mainMetadata, mainIdentity, mainBindingId: main.main_binding_id, mainBindingEpoch: main.binding_epoch, mainIdentityDigest: mainRow.identity_digest }
}

// P6-E rollback plane and suspension: beginRollback/rebindMain/finishRollback
// transfer authority and the singleton lease across a real ROLLING_BACK
// window; SUSPEND_PENDING/SUSPEND_ATTESTATION extend continuationRecover's
// mode gate to ROLLING_BACK for exactly those two dispositions. RED scenario
// ownership: CT-R7-S7, the rollback/rebind/finish projection of CT-R11-S3,
// CT-R11-S4, and CT-R11-S5. Every fixture is real, non-synthetic P3-P6 history.
//
// CT-R7-S8's claim-present rung (CT_RECOVERY_CLAIM_PRESENT) is implemented in
// continuationRecover exactly as design.md:1803 requires, but this unit does
// not exercise it with an integration test: a genuinely PUBLISHED handoff can
// never carry a live OR closed claim at its own current generation through
// any real flow (claiming always moves the handoff to CLAIMED; UNIQUE
// (handoff_id, generation) on ct_claim forecloses any same-generation
// leftover), and every attempt to fabricate that state with a synthetic row
// was independently rejected by validateSchema4Persistence's own exhaustive
// claim/transition/envelope cross-checks — the same invariant machinery this
// rung's precondition depends on. This mirrors P6-C's own honestly-flagged
// gap (the ROLLING_BACK branch of recoveryMainAuthority, structurally present
// and untested until this unit's own real ROLLING_BACK fixtures exercised
// it) and is recorded in apply-progress.md rather than shipped with an
// invariant-violating fixture.
const beginRollbackRequest = (built, overrides = {}) => ({
  request_identity: randomUUID(), expected_mode: "ON", expected_binding_epoch: built.mainBindingEpoch, expected_activation_epoch: 1, ...overrides,
})
const rebindMainRequest = (rollback_epoch, lease_version, expected_binding_epoch, overrides = {}) => ({
  request_identity: randomUUID(), expected_rollback_epoch: rollback_epoch, expected_lease_version: lease_version, expected_binding_epoch, ...overrides,
})
const finishRollbackRequest = (rollback_epoch, lease_version, expected_binding_epoch, overrides = {}) => ({
  request_identity: randomUUID(), expected_rollback_epoch: rollback_epoch, expected_lease_version: lease_version, expected_binding_epoch, ...overrides,
})
const recordMainPair = (built) => {
  const boot = bootId(), session = sessionId()
  const dispatch = dispatcher(built.main, built.mainMetadata, built.mainIdentity, singleObserver({ status: "ABSENT", observed_start_marker: null, os_boot_id: boot, os_session_id: session }))
  for (const process_role of ["HOST", "MCP"]) {
    dispatch("recordTerminationReceipt", { request_identity: randomUUID(), subject_kind: "MAIN", subject_binding_id: built.mainBindingId, subject_binding_epoch: built.mainBindingEpoch, process_role })
  }
}
const expireLease = (built) => {
  const db = new Database(built.dbPath)
  db.run("UPDATE ct_rollback_lease SET lease_expires_at=? WHERE id=1", [new Date(Date.now() - 1_000).toISOString()])
  db.close()
}

describe("P6-E rollback plane: beginRollback / rebindMain / finishRollback", () => {
  test("beginRollback freezes inventory, opens rollback_epoch 1, transitions ON to ROLLING_BACK, and replays idempotently", () => {
    const built = buildFreshEmptyMainFixture()
    const request = beginRollbackRequest(built)
    const response = built.mainDispatch("beginRollback", request)
    expect(response.mode).toBe("ROLLING_BACK")
    expect(response.rollback_epoch).toBe(1)
    expect(response.lease_version).toBe(1)
    expect(response.replayed).toBe(false)
    expect(built.mainDispatch("status").mode).toBe("ROLLING_BACK")

    const db = new Database(built.dbPath, { readonly: true })
    const epochRow = db.query("SELECT epoch_state,begin_owner_main_binding_id FROM ct_rollback_epoch WHERE rollback_epoch=1").get()
    const snapshot = db.query("SELECT snapshot_kind,rollback_epoch FROM ct_quiescence_snapshot WHERE snapshot_kind='ROLLBACK_FREEZE'").get()
    const lease = db.query("SELECT rollback_epoch,lease_status,lease_version,owner_main_binding_id FROM ct_rollback_lease WHERE id=1").get()
    db.close()
    expect(epochRow).toEqual({ epoch_state: "OPEN", begin_owner_main_binding_id: built.mainBindingId })
    expect(snapshot).toEqual({ snapshot_kind: "ROLLBACK_FREEZE", rollback_epoch: 1 })
    expect(lease).toEqual({ rollback_epoch: 1, lease_status: "ACTIVE", lease_version: 1, owner_main_binding_id: built.mainBindingId })

    const replay = built.mainDispatch("beginRollback", request)
    expect(replay).toEqual({ ...response, replayed: true })
  })

  test("beginRollback rejects a stale expected_activation_epoch with CT_FENCE_MISMATCH and a second, differently-identified attempt with CT_IDEMPOTENCY_CONFLICT", () => {
    const built = buildFreshEmptyMainFixture()
    expect(errorCode(() => built.mainDispatch("beginRollback", beginRollbackRequest(built, { expected_activation_epoch: 2 })))).toBe("CT_FENCE_MISMATCH")
    built.mainDispatch("beginRollback", beginRollbackRequest(built))
    // The already-open epoch is the only reachable scope under ROLLING_BACK,
    // so a second, differently-identified attempt collides with the
    // already-committed scope rather than reporting a generic in-progress code.
    expect(errorCode(() => built.mainDispatch("beginRollback", beginRollbackRequest(built)))).toBe("CT_IDEMPOTENCY_CONFLICT")
  })

  test("CT-R7-S7 — SUSPEND_PENDING closes the PENDING WORK delivery and moves an unclaimed PUBLISHED handoff to non-live WORK_SUSPENDED", () => {
    const built = buildClaimedFixture({ claim: false })
    const begin = built.mainDispatch("beginRollback", beginRollbackRequest(built))
    const request = recoverRequest(built, "SUSPEND_PENDING", { es: "PUBLISHED", claim_id: null, expected_rollback_epoch: begin.rollback_epoch })
    expect(built.mainDispatch("recover", request)).toEqual({ id: built.handoffId, state: "WORK_SUSPENDED", generation: 0, replayed: false })
    const db = new Database(built.fixture.dbPath, { readonly: true })
    const handoff = db.query("SELECT state,generation FROM ct_handoff WHERE id=?").get(built.handoffId)
    const delivery = db.query("SELECT delivery_state FROM ct_delivery WHERE delivery_id=?").get(built.deliveryId)
    const disposition = db.query("SELECT disposition,termination_pairing_digest,frozen_inventory_digest,created_delivery_id FROM ct_recovery_disposition WHERE handoff_id=?").get(built.handoffId)
    db.close()
    expect(handoff).toEqual({ state: "WORK_SUSPENDED", generation: 0 })
    expect(delivery.delivery_state).toBe("CLOSED")
    expect(disposition.disposition).toBe("SUSPEND_PENDING")
    expect(disposition.termination_pairing_digest).toBeNull()
    expect(disposition.frozen_inventory_digest).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(disposition.created_delivery_id).toBeNull()
  })

  test("SUSPEND_ATTESTATION closes the CLAIMED delivery and LIVE claim, preserves the attestation, and requires a fresh termination pairing", () => {
    const built = buildClaimedFixture()
    const manifest = ackStarted(built)
    const attested = built.mainDispatch("attestCompletion", { request_identity: randomUUID(), id: built.handoffId, es: "STARTED", eg: built.generation })
    const begin = built.mainDispatch("beginRollback", beginRollbackRequest(built))
    recordClaimantPair(built)
    const request = recoverRequest(built, "SUSPEND_ATTESTATION", { es: attested.state, expected_rollback_epoch: begin.rollback_epoch })
    expect(built.mainDispatch("recover", request)).toEqual({ id: built.handoffId, state: "ATTESTATION_SUSPENDED", generation: 0, replayed: false })
    const db = new Database(built.fixture.dbPath, { readonly: true })
    const handoff = db.query("SELECT state,generation FROM ct_handoff WHERE id=?").get(built.handoffId)
    const claim = db.query("SELECT claim_state FROM ct_claim WHERE claim_id=?").get(built.claimId)
    const delivery = db.query("SELECT delivery_state FROM ct_delivery WHERE delivery_id=?").get(built.deliveryId)
    const disposition = db.query("SELECT disposition,termination_pairing_digest,frozen_inventory_digest,preserved_attestation_digest,attestation_source_generation FROM ct_recovery_disposition WHERE handoff_id=?").get(built.handoffId)
    const attestDecision = db.query("SELECT decision_digest FROM ct_handoff_transition WHERE handoff_id=? AND operation='ATTEST_COMPLETION'").get(built.handoffId)
    db.close()
    expect(handoff).toEqual({ state: "ATTESTATION_SUSPENDED", generation: 0 })
    expect(claim.claim_state).toBe("CLOSED")
    expect(delivery.delivery_state).toBe("CLOSED")
    expect(disposition.disposition).toBe("SUSPEND_ATTESTATION")
    expect(disposition.termination_pairing_digest).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(disposition.frozen_inventory_digest).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(disposition.preserved_attestation_digest).toBe(attestDecision.decision_digest)
    expect(disposition.attestation_source_generation).toBe(built.generation)
  })

  // Corrective rerun (automatic gate FAIL, one authorized retry): design.md:1794-1795
  // name CANCELLED/POISONED mode as "ON or ROLLING_BACK, ACTIVE or rollback-owner
  // Main" and design.md:1801 forbids only NOT_STARTED/ROLLED_BACK/REDELIVER_WORK/
  // REDELIVER_ATTESTATION under ROLLING_BACK — CANCELLED/POISONED were never meant
  // to be forbidden there. These reuse the existing P6-D CANCELLED/POISONED path
  // unchanged; only the mode gate and the historical writer-fence acceptance widen.
  test("corrective — CANCELLED is legal under ROLLING_BACK with rollback-owner Main authority, requires a LIVE-claim termination pairing, and creates no delivery", () => {
    const built = buildClaimedFixture()
    const begin = built.mainDispatch("beginRollback", beginRollbackRequest(built))
    recordClaimantPair(built)
    const request = recoverRequest(built, "CANCELLED", { es: "CLAIMED", expected_rollback_epoch: begin.rollback_epoch })
    expect(built.mainDispatch("recover", request)).toEqual({ id: built.handoffId, state: "CANCELLED", generation: 0, replayed: false })
    const db = new Database(built.fixture.dbPath, { readonly: true })
    const handoff = db.query("SELECT state,generation FROM ct_handoff WHERE id=?").get(built.handoffId)
    const claim = db.query("SELECT claim_state FROM ct_claim WHERE claim_id=?").get(built.claimId)
    const delivery = db.query("SELECT delivery_state FROM ct_delivery WHERE delivery_id=?").get(built.deliveryId)
    const disposition = db.query("SELECT disposition,mode,termination_pairing_digest,frozen_inventory_digest,created_delivery_id FROM ct_recovery_disposition WHERE handoff_id=?").get(built.handoffId)
    db.close()
    expect(handoff).toEqual({ state: "CANCELLED", generation: 0 })
    expect(claim.claim_state).toBe("CLOSED")
    expect(delivery.delivery_state).toBe("CLOSED")
    expect(disposition).toEqual({ disposition: "CANCELLED", mode: "ROLLING_BACK", termination_pairing_digest: disposition.termination_pairing_digest, frozen_inventory_digest: null, created_delivery_id: null })
    expect(disposition.termination_pairing_digest).toMatch(/^sha256:[0-9a-f]{64}$/)
    // Historical replay: status() re-runs validateSchema4Persistence's RECOVER
    // reconstruction, proving the widened ROLLING_BACK/ACTIVE writer fence for
    // this disposition is accepted rather than rejected as CT_SCHEMA_INVALID.
    expect(built.mainDispatch("status").schema_version).toBe(5)
  })

  test("corrective — POISONED is legal under ROLLING_BACK without a claim, requires no termination pairing, and creates no delivery", () => {
    const built = buildClaimedFixture({ claim: false })
    const begin = built.mainDispatch("beginRollback", beginRollbackRequest(built))
    const request = recoverRequest(built, "POISONED", { es: "PUBLISHED", claim_id: null, expected_rollback_epoch: begin.rollback_epoch })
    expect(built.mainDispatch("recover", request)).toEqual({ id: built.handoffId, state: "POISONED", generation: 0, replayed: false })
    const db = new Database(built.fixture.dbPath, { readonly: true })
    const handoff = db.query("SELECT state,generation FROM ct_handoff WHERE id=?").get(built.handoffId)
    const disposition = db.query("SELECT disposition,mode,termination_pairing_digest,frozen_inventory_digest,created_delivery_id FROM ct_recovery_disposition WHERE handoff_id=?").get(built.handoffId)
    db.close()
    expect(handoff).toEqual({ state: "POISONED", generation: 0 })
    expect(disposition).toEqual({ disposition: "POISONED", mode: "ROLLING_BACK", termination_pairing_digest: null, frozen_inventory_digest: null, created_delivery_id: null })
    expect(built.mainDispatch("status").schema_version).toBe(5)
  })

  test("corrective — NOT_STARTED and ROLLED_BACK remain forbidden under ROLLING_BACK with CT_RECOVERY_DISPOSITION_FORBIDDEN", () => {
    const built = buildClaimedFixture()
    const begin = built.mainDispatch("beginRollback", beginRollbackRequest(built))
    expect(errorCode(() => built.mainDispatch("recover", recoverRequest(built, "NOT_STARTED", { expected_rollback_epoch: begin.rollback_epoch })))).toBe("CT_RECOVERY_DISPOSITION_FORBIDDEN")
    expect(errorCode(() => built.mainDispatch("recover", recoverRequest(built, "ROLLED_BACK", { es: "STARTED", expected_rollback_epoch: begin.rollback_epoch })))).toBe("CT_RECOVERY_DISPOSITION_FORBIDDEN")
    const db = new Database(built.fixture.dbPath, { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_recovery_disposition").get().count).toBe(0)
    db.close()
  })

  test("CT-R11-S3/S5 — rebindMain waits only for an expired lease, retires the old Main, binds a fresh one, and transfers the lease under a fresh termination proof", () => {
    const built = buildFreshEmptyMainFixture()
    const begin = built.mainDispatch("beginRollback", beginRollbackRequest(built))
    expect(errorCode(() => built.mainDispatch("rebindMain", rebindMainRequest(begin.rollback_epoch, begin.lease_version, built.mainBindingEpoch)))).toBe("CT_ROLLBACK_LEASE_ACTIVE")
    recordMainPair(built)
    expireLease(built)

    const newIdentity = opaqueProcess(), newMetadata = capability({ binding_epoch: built.mainBindingEpoch })
    const newDispatch = dispatcher(built.main, newMetadata, newIdentity)
    const rebindRequest = rebindMainRequest(begin.rollback_epoch, begin.lease_version, built.mainBindingEpoch)
    const rebound = newDispatch("rebindMain", rebindRequest)
    expect(rebound.binding_epoch).toBe(built.mainBindingEpoch + 1)
    expect(rebound.rollback_epoch).toBe(begin.rollback_epoch)
    expect(rebound.lease_version).toBe(begin.lease_version + 1)
    expect(rebound.replayed).toBe(false)

    const db = new Database(built.dbPath, { readonly: true })
    const oldMain = db.query("SELECT binding_status FROM ct_main_binding WHERE main_binding_id=?").get(built.mainBindingId)
    const newMain = db.query("SELECT binding_status,binding_epoch FROM ct_main_binding WHERE main_binding_id=?").get(rebound.main_binding_id)
    const rebind = db.query("SELECT old_main_binding_id,new_main_binding_id,lease_version_before,lease_version_after FROM ct_main_rebind").get()
    const lease = db.query("SELECT owner_main_binding_id,lease_version FROM ct_rollback_lease WHERE id=1").get()
    db.close()
    expect(oldMain.binding_status).toBe("RETIRED")
    expect(newMain).toEqual({ binding_status: "ACTIVE", binding_epoch: built.mainBindingEpoch + 1 })
    expect(rebind).toEqual({ old_main_binding_id: built.mainBindingId, new_main_binding_id: rebound.main_binding_id, lease_version_before: begin.lease_version, lease_version_after: begin.lease_version + 1 })
    expect(lease).toEqual({ owner_main_binding_id: rebound.main_binding_id, lease_version: begin.lease_version + 1 })

    const replay = newDispatch("rebindMain", rebindRequest)
    expect(replay).toEqual({ ...rebound, replayed: true })
    newMetadata.binding_epoch = rebound.binding_epoch

    // CT-R11-S3/S4 finish projection: zero live/pending rows lets the new
    // Main finish the rollback and transition ROLLING_BACK back to OFF.
    const finished = newDispatch("finishRollback", finishRollbackRequest(begin.rollback_epoch, rebound.lease_version, rebound.binding_epoch))
    expect(finished.mode).toBe("OFF")
    expect(finished.rollback_epoch).toBe(begin.rollback_epoch)
    expect(finished.quiescence_digest).toMatch(/^sha256:[0-9a-f]{64}$/)
    const statusAfter = newDispatch("status")
    expect(statusAfter.mode).toBe("OFF")
    const leaseAfter = new Database(built.dbPath, { readonly: true })
    const leaseRow = leaseAfter.query("SELECT lease_status,owner_main_binding_id,lease_expires_at FROM ct_rollback_lease WHERE id=1").get()
    const epochRow = leaseAfter.query("SELECT epoch_state,finish_lease_version FROM ct_rollback_epoch WHERE rollback_epoch=?").get(begin.rollback_epoch)
    leaseAfter.close()
    expect(leaseRow).toEqual({ lease_status: "NONE", owner_main_binding_id: null, lease_expires_at: null })
    expect(epochRow).toEqual({ epoch_state: "FINISHED", finish_lease_version: rebound.lease_version + 1 })
  })

  test("CT-R11-S4 — finishRollback refuses CT_NOT_QUIESCENT while live/pending rows remain, even after the pending work itself is suspended", () => {
    // The registered claimant binding alone keeps live_counts.workers nonzero
    // for the rest of this fixture's lifetime (no operation retires it), so
    // this proves finishRollback's zero-live-workers requirement independently
    // of pending work; the CT-R11-S3/S5 test above proves the zero-live/zero-
    // pending success path with a worker-free fixture.
    const built = buildClaimedFixture({ claim: false })
    const begin = built.mainDispatch("beginRollback", beginRollbackRequest(built))
    expect(errorCode(() => built.mainDispatch("finishRollback", finishRollbackRequest(begin.rollback_epoch, begin.lease_version, built.mainBindingEpoch)))).toBe("CT_NOT_QUIESCENT")
    const request = recoverRequest(built, "SUSPEND_PENDING", { es: "PUBLISHED", claim_id: null, expected_rollback_epoch: begin.rollback_epoch })
    built.mainDispatch("recover", request)
    expect(errorCode(() => built.mainDispatch("finishRollback", finishRollbackRequest(begin.rollback_epoch, begin.lease_version, built.mainBindingEpoch)))).toBe("CT_NOT_QUIESCENT")
  })

  test("non-owner Main triangulation — finishRollback rejects a caller whose identity is not the current lease-owner Main", () => {
    const built = buildFreshEmptyMainFixture()
    const begin = built.mainDispatch("beginRollback", beginRollbackRequest(built))
    const otherIdentity = opaqueProcess(), otherMetadata = capability({ plugin_instance: "other-main-plugin", root_session_id: "other-main-root", binding_epoch: built.mainBindingEpoch })
    const otherDispatch = dispatcher(built.main, otherMetadata, otherIdentity)
    expect(errorCode(() => otherDispatch("finishRollback", finishRollbackRequest(begin.rollback_epoch, begin.lease_version, built.mainBindingEpoch)))).toBe("CT_WORKFLOW_MAIN_REQUIRED")
  })
})

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    execFileSync("rm", ["-rf", directory])
  }
})
