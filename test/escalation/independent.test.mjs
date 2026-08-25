import { describe, expect, test } from "bun:test"

import { sessionPlanSnapshotDigest } from "../../contracts/session-plan-snapshot.mjs"
import { readIndependentEligibility } from "../../escalation/parked.mjs"

const digest = `sha256:${"a".repeat(64)}`
const target = (session_id, overrides = {}) => ({ session_id, title: session_id, status: "LISTO", depends_on: [],
  area: [`work/${session_id}.mjs`], resource: "—", decisions: [], acceptance_criteria: [{ checked: false, text: "works" }], ...overrides })
const snapshot = (value) => {
  const identity = { schema: "session-plan-snapshot", schema_version: 1, source: { digest_mode: "raw-bytes", content_digest: digest }, target: value,
    graph: { local_session_ids: ["S5.5", "S5.6", "S5.7"], external_session_ids: [], edges: [] } }
  return { ...identity, snapshot_digest: sessionPlanSnapshotDigest(identity) }
}
const blocked = snapshot(target("S5.5", { area: ["escalation/**"], resource: "parking-ledger" }))

describe("Main-consumable independent Session eligibility", () => {
  test("returns only read-only eligible evidence and never selects or assigns", () => {
    const candidates = [snapshot(target("S5.6", { status: "PLANIFICADO" })), snapshot(target("S5.7"))]
    const before = JSON.stringify({ blocked, candidates })
    const result = readIndependentEligibility({ current_plan_digest: digest, blocked_snapshot: blocked, candidate_snapshots: candidates })
    expect(result).toEqual({ state: "ELIGIBLE", candidates: [candidates[1]] })
    expect("session_id" in result).toBeFalse()
    expect("assignment" in result.candidates[0]).toBeFalse()
    expect(JSON.stringify({ blocked, candidates })).toBe(before)
  })

  test("reports a read-only stop when no current candidate is compatible", () => {
    expect(readIndependentEligibility({ current_plan_digest: digest, blocked_snapshot: blocked,
      candidate_snapshots: [snapshot(target("S5.6", { status: "BLOQUEADO" }))] })).toEqual({ state: "STOP", reason: "NO_ELIGIBLE_SESSION" })
  })
})
