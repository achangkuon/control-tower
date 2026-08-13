import { describe, expect, test } from "bun:test"

import { createParkingComposition } from "../../escalation/parking-composition.mjs"

const parkedDecision = Object.freeze({ parked_decision_id: "parked-a" })
const checkpointRequest = Object.freeze({ project_id: "project-a" })
const reconciliationEvidence = Object.freeze({ manifest_ref: "evidence/manifest.json" })
const request = (overrides = {}) => ({
  parked_decision: parkedDecision,
  checkpoint_request: checkpointRequest,
  reconciliation_evidence: reconciliationEvidence,
  ...overrides,
})
const error = (operation) => {
  try { operation() } catch (cause) { return cause }
  return null
}

const setup = () => {
  const calls = []
  const capture = Object.freeze({ checkpoint_id: "checkpoint-a", project_id: "project-a" })
  const reconciliation = Object.freeze({ reconciliation_id: "reconciliation-a" })
  const result = Object.freeze({ replayed: false })
  const checkpointProducer = (input) => { calls.push(["capture", input]); return capture }
  const reconciliationProducer = (input) => { calls.push(["reconcile", input]); return reconciliation }
  const parkingStore = { parkDecision(input) { calls.push(["park", input]); return result } }
  return { calls, capture, reconciliation, result, checkpointProducer, reconciliationProducer, parkingStore }
}

describe("Main-owned checkpoint parking composition", () => {
  test("binds all three capabilities in the constructor and exposes one frozen operation", () => {
    const value = setup()
    for (const missing of ["checkpointProducer", "reconciliationProducer", "parkingStore"]) {
      const capabilities = { checkpointProducer: value.checkpointProducer, reconciliationProducer: value.reconciliationProducer, parkingStore: value.parkingStore }
      delete capabilities[missing]
      expect(error(() => createParkingComposition(capabilities))?.code).toBe("CT_PARKING_COMPOSITION_INVALID")
    }
    expect(error(() => createParkingComposition({ ...value, parkingStore: {} }))?.code).toBe("CT_PARKING_COMPOSITION_INVALID")

    const composition = createParkingComposition(value)
    expect(Object.keys(composition)).toEqual(["park"])
    expect(Object.isFrozen(composition)).toBeTrue()
  })

  test("rejects caller provenance and partial inputs before invoking any capability", () => {
    const value = setup()
    const composition = createParkingComposition(value)
    for (const invalid of [
      null,
      { parked_decision: parkedDecision, checkpoint_request: checkpointRequest },
      request({ checkpoint_capture: value.capture }),
      request({ reconciled_checkpoint: value.reconciliation }),
      request({ provenance: {} }),
    ]) expect(error(() => composition.park(invalid))?.code).toBe("CT_PARKING_INPUT_INVALID")
    expect(value.calls).toEqual([])
  })

  test("invokes capture, reconciliation, then parking exactly once with unchanged references", () => {
    const value = setup()
    const capabilities = { checkpointProducer: value.checkpointProducer, reconciliationProducer: value.reconciliationProducer, parkingStore: value.parkingStore }
    const composition = createParkingComposition(capabilities)
    capabilities.checkpointProducer = () => { throw new Error("late replacement") }
    capabilities.parkingStore.parkDecision = () => { throw new Error("late replacement") }

    expect(composition.park(request())).toBe(value.result)
    expect(value.calls).toEqual([
      ["capture", checkpointRequest],
      ["reconcile", { capture: value.capture, evidence: reconciliationEvidence }],
      ["park", { actor: "MAIN", project_id: "project-a", parked_decision: parkedDecision, checkpoint_capture: value.capture, reconciled_checkpoint: value.reconciliation }],
    ])
  })

  test("fails without fallback when either producer fails", () => {
    const captureFailure = setup()
    const captureError = new Error("capture failed")
    captureFailure.checkpointProducer = () => { throw captureError }
    expect(error(() => createParkingComposition(captureFailure).park(request()))).toBe(captureError)
    expect(captureFailure.calls).toEqual([])

    const reconciliationFailure = setup()
    const reconciliationError = new Error("reconciliation failed")
    reconciliationFailure.reconciliationProducer = () => { throw reconciliationError }
    expect(error(() => createParkingComposition(reconciliationFailure).park(request()))).toBe(reconciliationError)
    expect(reconciliationFailure.calls).toEqual([["capture", checkpointRequest]])
  })
})
