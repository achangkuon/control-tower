import { describe, expect, test } from "bun:test"

import { sessionPlanSnapshotDigest } from "../../contracts/session-plan-snapshot.mjs"
import { createParkingFacade, evaluateDeclaredCompatibility } from "../../escalation/parked.mjs"

const error = (operation) => { try { operation() } catch (cause) { return cause }; return null }
const digest = (char) => `sha256:${char.repeat(64)}`
const target = (overrides = {}) => ({
  session_id: "S5.6", title: "Candidate", status: "LISTO", depends_on: [], area: ["workspace/next.mjs"],
  resource: "—", decisions: [], acceptance_criteria: [{ checked: false, text: "works" }], ...overrides,
})
const snapshot = (value, source = digest("a"), edges = []) => {
  const identity = { schema: "session-plan-snapshot", schema_version: 1,
    source: { digest_mode: "raw-bytes", content_digest: source }, target: value,
    graph: { local_session_ids: ["S5.5", "S5.6"], external_session_ids: [], edges } }
  return { ...identity, snapshot_digest: sessionPlanSnapshotDigest(identity) }
}
const classes = ["contrato visible del producto", "operaciones irreversibles", "migraciones o pérdida de datos", "API pública", "seguridad y permisos", "dinero, precios o cuotas", "expansión de alcance", "dependencias o evidencia contradictorias"]

describe("parked decision facade", () => {
  test("delegates unchanged canonical inputs and rejects caller-owned provenance", () => {
    const calls = [], parked_decision = Object.freeze({ parked_decision_id: "parked-a" })
    const ports = {
      checkpointProducer: (input) => { calls.push(["checkpoint", input]); return Object.freeze({ project_id: "project-a" }) },
      reconciliationProducer: (input) => { calls.push(["reconciliation", input]); return Object.freeze({ state: "VALID" }) },
      parkingStore: { parkDecision(input) { calls.push(["parking", input]); return Object.freeze({ replayed: false }) } },
    }
    const facade = createParkingFacade(ports)
    expect(facade.park({ parked_decision, checkpoint_request: { project_id: "project-a" }, reconciliation_evidence: { manifest_ref: "evidence/a.json" } })).toEqual({ replayed: false })
    expect(calls.map(([name]) => name)).toEqual(["checkpoint", "reconciliation", "parking"])
    const cause = error(() => facade.park({ parked_decision: {}, checkpoint_request: {}, reconciliation_evidence: {}, checkpoint_capture: {} }))
    expect(cause?.code).toBe("CT_PARKING_INPUT_INVALID")
  })
})

describe("declared Session compatibility", () => {
  const blocked = () => snapshot(target({ session_id: "S5.5", area: ["escalation/**"], resource: "parking-ledger" }))
  const evaluate = (candidate, current_plan_digest = digest("a"), blocked_snapshot = blocked()) =>
    evaluateDeclaredCompatibility({ current_plan_digest, blocked_snapshot, candidate_snapshot: candidate })

  test("accepts canonical current snapshots read-only and rejects every declared conflict", () => {
    const candidate = snapshot(target()), before = JSON.stringify({ blocked: blocked(), candidate })
    expect(evaluate(candidate)).toEqual({ eligible: true, reasons: [] })
    const cases = [target({ status: "PLANIFICADO" }), target({ depends_on: ["S5.5"] }),
      target({ area: ["escalation/resume.mjs"] }), target({ resource: "parking-ledger" })]
    for (const value of cases) expect(evaluate(snapshot(value, digest("a"), value.depends_on.length ? [{ from: "S5.5", to: value.session_id }] : [])).eligible).toBeFalse()
    expect(JSON.stringify({ blocked: blocked(), candidate })).toBe(before)
  })

  test("rejects stale identities, all eight open escalation classes, and contamination of the blocked Session", () => {
    expect(evaluate(snapshot(target(), digest("b"))).reasons).toContain("STALE_SNAPSHOT")
    for (const escalationClass of classes) {
      const decision = { kind: "escala", body: "open", classes: [escalationClass], resolution: "open", contamination: { state: "none", session_ids: [] } }
      expect(evaluate(snapshot(target({ decisions: [decision] }))).reasons).toContain("DECISION_CONFLICT")
    }
    const decision = { kind: "escala", body: "impact", classes: [classes[0]], resolution: "resolved", contamination: { state: "active", session_ids: ["S5.5"] } }
    expect(evaluate(snapshot(target({ decisions: [decision] }))).reasons).toContain("DECISION_CONFLICT")
    const blocker = snapshot(target({ session_id: "S5.5", area: ["escalation/**"], resource: "parking-ledger", decisions: [{ ...decision, contamination: { state: "active", session_ids: ["S5.6"] } }] }))
    expect(evaluate(snapshot(target()), digest("a"), blocker).reasons).toContain("DECISION_CONFLICT")
  })

  test("fails closed unless Área and Recurso disjointness is provable", () => {
    const occupied = snapshot(target({ session_id: "S5.5", area: ["workspace/a.mjs"], resource: "Main / ledger" }))
    expect(evaluate(snapshot(target({ area: ["workspace/b.mjs"] })), digest("a"), occupied).reasons).toContain("AREA_CONFLICT")
    expect(evaluate(snapshot(target({ area: ["contracts/a.mjs"], resource: "Main / other" })), digest("a"), occupied).reasons).toContain("RESOURCE_CONFLICT")
  })
})
