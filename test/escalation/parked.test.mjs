import { describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createParkedDecision } from "../../contracts/parked-decision.mjs"
import { createParkedCheckpointBinding } from "../../contracts/parked-checkpoint-binding.mjs"
import { createParkedLoop } from "../../escalation/parked.mjs"
import { createParkingComposition } from "../../escalation/parking-composition.mjs"

const fixtures = JSON.parse(readFileSync(new URL("../fixtures/contracts/schema-cases-v1.json", import.meta.url), "utf8"))
const error = (code) => Object.assign(new Error(code), { code })
const throwsCode = (run, code) => { try { run() } catch (failure) { expect(failure.code).toBe(code); return } throw new Error(`Expected ${code}`) }
const canonicalDecision = () => createParkedDecision(structuredClone(fixtures.parkedDecision))
const input = (parked_decision = canonicalDecision()) => ({
  parking_input: { parked_decision, checkpoint_request: { checkpoint: "c" }, reconciliation_evidence: { evidence: "r" } },
  decision_request: Object.freeze({ opaque: "S5.4" }),
})

const parkingFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-parked-")), record = join(root, "parking.json"), calls = { store: [], requests: [] }
  writeFileSync(record, "", "utf8")
  const parking = createParkingComposition({
    checkpointProducer() { return fixtures.checkpointCapture },
    reconciliationProducer() { return fixtures.reconciledCheckpoint },
    parkingStore: { parkDecision(value) {
      calls.store.push(value)
      const parked = createParkedDecision(value.parked_decision)
      createParkedCheckpointBinding({ parked_decision: parked, checkpoint_capture: value.checkpoint_capture, reconciled_checkpoint: value.reconciled_checkpoint })
      writeFileSync(record, JSON.stringify(parked), "utf8")
      return Object.freeze({ parked_decision_id: parked.parked_decision_id })
    } },
  })
  const loop = createParkedLoop({ parking, decisionRequests: { emit(value) { calls.requests.push(value); return Object.freeze({ request_id: "request-1" }) } }, proposals: { read() {} } })
  return { calls, loop, bytes: () => readFileSync(record, "utf8"), dispose: () => rmSync(root, { recursive: true, force: true }) }
}

const proposalFixture = ({ boundary = {}, now = () => Date.parse("2026-01-02T00:00:00.000Z") } = {}) => {
  const root = mkdtempSync(join(tmpdir(), "ct-proposal-")), record = join(root, "proposal.json"), calls = { read: 0, default: 0, alternative: 0 }
  const stored = { caller_role: "MAIN", plan_enumeration_digest: "plan", ledger_digest: "ledger", worker_claim: "claim", expires_at: "2026-01-02T00:00:01.000Z", state: "EXECUTABLE", ...boundary }
  writeFileSync(record, JSON.stringify({ boundary: stored }), "utf8")
  const continuation = { continueDefault() { calls.default++; return Object.freeze({ binding_ref: "s5.10" }) }, continueAlternativeAt(index) { calls.alternative++; return Object.freeze({ index }) } }
  const proposals = { read() {
    calls.read++
    const view = { ...JSON.parse(readFileSync(record, "utf8")), continuation }
    for (const key of ["primary", "alternatives", "conflicts"]) Object.defineProperty(view, key, { get() { throw error(`FORBIDDEN_${key}`) } })
    return view
  } }
  const loop = createParkedLoop({ parking: { park() {} }, decisionRequests: { emit() {} }, proposals, now })
  return { calls, loop, bytes: () => readFileSync(record, "utf8"), dispose: () => rmSync(root, { recursive: true, force: true }) }
}

const expected = { plan_enumeration_digest: "plan", ledger_digest: "ledger", worker_claim: "claim" }

describe("parked loop parking", () => {
  test("rejects malformed constructor ports before any capability can run", () => {
    throwsCode(() => createParkedLoop({}), "CT_PARKED_LOOP_PORT_INVALID")
  })

  test("passes one canonical parked-decision-v1 unchanged through the existing parking boundary before its opaque S5.4 request", () => {
    const f = parkingFixture()
    try {
      const value = input(), outcome = f.loop.park(value)
      expect(f.calls.store[0].parked_decision).toBe(value.parking_input.parked_decision)
      expect(JSON.parse(f.bytes())).toEqual(value.parking_input.parked_decision)
      expect(f.calls.requests).toEqual([value.decision_request])
      expect(outcome).toEqual({ state: "PARKED", parking: { parked_decision_id: value.parking_input.parked_decision.parked_decision_id }, request: { request_id: "request-1" } })
      expect(Object.isFrozen(outcome)).toBe(true)
    } finally { f.dispose() }
  })

  test("independently rejects every removed canonical field before request emission and preserves byte-backed parking", () => {
    for (const field of ["question", "evidence", "options", "origin", "checkpoint", "decision_class", "created_at", "frozen_scope"]) {
      const f = parkingFixture()
      try {
        const decision = structuredClone(canonicalDecision()); delete decision[field]
        const value = input(decision), before = f.bytes()
        throwsCode(() => f.loop.park(value), "CT_SCHEMA_INVALID")
        expect(f.bytes()).toBe(before)
        expect(f.calls.requests).toEqual([])
      } finally { f.dispose() }
    }
  })
})

describe("parked loop Support boundary", () => {
  test("accepts a future canonical ISO timestamp without reading forbidden proposal content", () => {
    const f = proposalFixture()
    try {
      const before = f.bytes()
      expect(f.loop.continueIndependent({ proposal_ref: "opaque", expected, selection: { kind: "DEFAULT" } })).toEqual({ binding_ref: "s5.10" })
      expect(f.bytes()).toBe(before)
      expect(f.calls).toEqual({ read: 1, default: 1, alternative: 0 })
    } finally { f.dispose() }
  })

  test("rejects elapsed, malformed, and claim-mismatched ISO-boundary records before continuation", () => {
    for (const [boundary, code] of [
      [{ expires_at: "2026-01-02T00:00:00.000Z" }, "CT_SUPPORT_PROPOSAL_EXPIRED"],
      [{ expires_at: "not-a-timestamp" }, "CT_SUPPORT_PROPOSAL_EXPIRED"],
      [{ state: "CLAIM_MISMATCH" }, "CT_SUPPORT_PROPOSAL_CLAIM_MISMATCH"],
      [{ caller_role: "WORKER" }, "CT_SUPPORT_PROPOSAL_ROLE_MISMATCH"],
      [{ plan_enumeration_digest: "other" }, "CT_SUPPORT_PROPOSAL_PLAN_MISMATCH"],
      [{ ledger_digest: "other" }, "CT_SUPPORT_PROPOSAL_LEDGER_MISMATCH"],
      [{ worker_claim: "other" }, "CT_SUPPORT_PROPOSAL_CLAIM_MISMATCH"],
      [{ state: "STALE" }, "CT_SUPPORT_PROPOSAL_STALE"],
      [{ state: "UNKNOWN" }, "CT_SUPPORT_PROPOSAL_INVALID"],
    ]) {
      const f = proposalFixture({ boundary })
      try {
        const before = f.bytes()
        throwsCode(() => f.loop.continueIndependent({ proposal_ref: "opaque", expected, selection: { kind: "DEFAULT" } }), code)
        expect(f.bytes()).toBe(before)
        expect(f.calls).toEqual({ read: 1, default: 0, alternative: 0 })
      } finally { f.dispose() }
    }
  })
})
