const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")

export const createParkingComposition = ({ checkpointProducer, reconciliationProducer, parkingStore } = {}) => {
  if (typeof checkpointProducer !== "function" || typeof reconciliationProducer !== "function"
      || !parkingStore || typeof parkingStore.parkDecision !== "function") {
    fail("CT_PARKING_COMPOSITION_INVALID", "Checkpoint, reconciliation, and parking capabilities are required")
  }
  const parkDecision = parkingStore.parkDecision.bind(parkingStore)

  return Object.freeze({
    park(input) {
      if (!exactKeys(input, ["parked_decision", "checkpoint_request", "reconciliation_evidence"])) {
        fail("CT_PARKING_INPUT_INVALID", "Parking input must not assert producer-owned provenance")
      }
      const checkpoint_capture = checkpointProducer(input.checkpoint_request)
      const reconciled_checkpoint = reconciliationProducer({ capture: checkpoint_capture, evidence: input.reconciliation_evidence })
      return parkDecision({
        actor: "MAIN",
        project_id: checkpoint_capture?.project_id,
        parked_decision: input.parked_decision,
        checkpoint_capture,
        reconciled_checkpoint,
      })
    },
  })
}
