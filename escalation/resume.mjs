const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const object = (value) => value && typeof value === "object" && !Array.isArray(value)
const blocked = Object.freeze({ state: "RECONCILIATION_REQUIRED", code: "CT_RESUME_RECONCILIATION_REQUIRED" })
const coordinates = ["repository", "project_id", "assignment_id", "generation", "base_sha", "result_sha"]
const exactKeys = (value, keys) => object(value) && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")

export const createResumeLoop = ({ parkedBindings, terminalResponses, reconcile, resumeCheckpoint } = {}) => {
  if (!parkedBindings || typeof parkedBindings.readParkedCheckpointBinding !== "function" || !terminalResponses || typeof terminalResponses.assertFor !== "function" || typeof reconcile !== "function" || typeof resumeCheckpoint !== "function") {
    fail("CT_RESUME_PORT_INVALID", "Parked binding, terminal response, reconciliation, and resume ports are required")
  }

  return Object.freeze({
    resume(input = {}) {
      if (!exactKeys(input, ["parked_decision_id"]) || typeof input.parked_decision_id !== "string") fail("CT_RESUME_RESPONSE_INVALID", "Resume input must contain only a parked decision ID")
      const binding = parkedBindings.readParkedCheckpointBinding(input.parked_decision_id)
      if (!object(binding)) return blocked
      let response_receipt
      try {
        response_receipt = terminalResponses.assertFor({ parked_decision_id: binding.parked_decision_id, parked_decision_digest: binding.parked_decision_digest })
        if (response_receipt === undefined) throw new Error("Terminal response receipt is required")
      } catch {
        fail("CT_RESUME_RESPONSE_INVALID", "Terminal response capability is invalid")
      }
      let current
      try { current = reconcile({ binding, response_receipt }) } catch { return blocked }
      if (!object(current) || current.status !== "CURRENT" || coordinates.some((key) => current[key] !== binding[key])) return blocked
      return resumeCheckpoint({ parked_checkpoint: binding.parked_checkpoint, ...Object.fromEntries(coordinates.map((key) => [key, binding[key]])), response_receipt })
    },
  })
}
