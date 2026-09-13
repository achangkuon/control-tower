const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const object = (value) => value && typeof value === "object" && !Array.isArray(value)
const frozen = (value) => Object.freeze(value)

export const createParkedLoop = ({ parking, decisionRequests, proposals, now = Date.now } = {}) => {
  if (!parking || typeof parking.park !== "function" || !decisionRequests || typeof decisionRequests.emit !== "function"
      || !proposals || typeof proposals.read !== "function" || typeof now !== "function") {
    fail("CT_PARKED_LOOP_PORT_INVALID", "Parking, request, proposal, and clock ports are required")
  }

  return frozen({
    park({ parking_input, decision_request } = {}) {
      const parked = parking.park(parking_input)
      const request = decisionRequests.emit(decision_request)
      return frozen({ state: "PARKED", parking: parked, request })
    },

    continueIndependent({ proposal_ref, expected, selection } = {}) {
      const view = proposals.read(proposal_ref), boundary = view?.boundary
      if (!object(boundary) || !object(expected)) fail("CT_SUPPORT_PROPOSAL_INVALID", "Support proposal boundary is required")
      if (boundary.caller_role !== "MAIN") fail("CT_SUPPORT_PROPOSAL_ROLE_MISMATCH", "Support proposal caller must be Main")
      if (boundary.plan_enumeration_digest !== expected.plan_enumeration_digest) fail("CT_SUPPORT_PROPOSAL_PLAN_MISMATCH", "Support plan digest does not match")
      if (boundary.ledger_digest !== expected.ledger_digest) fail("CT_SUPPORT_PROPOSAL_LEDGER_MISMATCH", "Support ledger digest does not match")
      if (boundary.worker_claim !== expected.worker_claim || boundary.state === "CLAIM_MISMATCH") fail("CT_SUPPORT_PROPOSAL_CLAIM_MISMATCH", "Support worker claim does not match")
      const expiresAt = Date.parse(boundary.expires_at)
      if (!Number.isFinite(expiresAt) || expiresAt <= now()) fail("CT_SUPPORT_PROPOSAL_EXPIRED", "Support proposal is expired")
      if (boundary.state === "STALE") fail("CT_SUPPORT_PROPOSAL_STALE", "Support proposal is stale")
      if (boundary.state === "NO_SCOPE") return frozen({ state: "PARKED", reason: "NO_SCOPE" })
      if (boundary.state !== "EXECUTABLE") fail("CT_SUPPORT_PROPOSAL_INVALID", "Support proposal state is invalid")
      const continuation = view.continuation
      if (!object(continuation)) fail("CT_SUPPORT_PROPOSAL_INVALID", "Support continuation is required")
      if (selection?.kind === "DEFAULT" && typeof continuation.continueDefault === "function") return continuation.continueDefault()
      if (selection?.kind === "ALTERNATIVE" && Number.isInteger(selection.index) && selection.index >= 0
          && typeof continuation.continueAlternativeAt === "function") return continuation.continueAlternativeAt(selection.index)
      fail("CT_SUPPORT_PROPOSAL_INVALID", "Support continuation selection is invalid")
    },
  })
}
