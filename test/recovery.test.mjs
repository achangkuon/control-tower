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
const buildClaimedFixture = () => {
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
  const claimed = workerDispatch("claim", { request_identity: randomUUID(), delivery_id: deliveryId, id: created.id, es: "PUBLISHED", eg: created.generation, purpose: "WORK" })

  const rows = new Database(fixture.dbPath, { readonly: true })
  const workerRow = rows.query("SELECT * FROM ct_claimant_binding WHERE binding_id=?").get(registered.binding_id)
  const mainRow = rows.query("SELECT * FROM ct_main_binding WHERE main_binding_id=?").get(main.main_binding_id)
  rows.close()

  return {
    fixture, mainDispatch, mainMetadata, mainIdentity, mainBindingId: main.main_binding_id, mainBindingEpoch: main.binding_epoch, mainIdentityDigest: mainRow.identity_digest,
    workerDispatch, workerMetadata, workerIdentity,
    workerBindingId: registered.binding_id, workerBindingEpoch: registered.binding_epoch, workerIdentityDigest: workerRow.identity_digest,
    handoffId: created.id, generation: claimed.generation,
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
  return { ...fixture, mainBindingId: main.main_binding_id, mainBindingEpoch: main.binding_epoch, mainIdentityDigest: mainRow.identity_digest }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    execFileSync("rm", ["-rf", directory])
  }
})
