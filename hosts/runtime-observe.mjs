const INPUT_KEYS = ["operation", "binding_id", "incarnation_id", "status", "outcome"]
const REF = /^[A-Za-z0-9._:-]{1,128}$/
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
const exact = (value) => plain(value) && Object.keys(value).length === INPUT_KEYS.length
  && INPUT_KEYS.every((key) => Object.hasOwn(value, key))
const freezeResult = (input, fields) => Object.freeze({
  operation: input.operation,
  binding_id: input.binding_id,
  incarnation_id: input.incarnation_id,
  ...fields,
})
const invalid = (message) => { throw Object.assign(new TypeError(message), { code: "CT_HOST_RUNTIME_PROOF_MISMATCH" }) }

const mapOutcome = (operation, input) => {
  if (!exact(input) || input.operation !== operation || !REF.test(input.binding_id ?? "")
    || !REF.test(input.incarnation_id ?? "") || !["MATCHED", "UNAVAILABLE"].includes(input.status)) {
    invalid("normalized runtime outcome is required")
  }
  if (input.status === "UNAVAILABLE" && input.outcome !== null) invalid("unavailable outcome must be empty")
  if (operation === "OBSERVE") {
    if (input.status === "MATCHED" && input.outcome !== "OBSERVED") invalid("matching observation outcome is invalid")
    return freezeResult(input, input.status === "MATCHED"
      ? { evidence: "MATCHING_PRODUCER_PROOF", uncertainty: null }
      : { evidence: null, uncertainty: "EVIDENCE_UNAVAILABLE" })
  }
  if (operation === "HEALTH") {
    if (input.status === "MATCHED" && !["HEALTHY", "DEAD"].includes(input.outcome)) invalid("matching health outcome is invalid")
    return freezeResult(input, { state: input.status === "UNAVAILABLE" ? "DISCONNECTED_UNKNOWN" : input.outcome === "HEALTHY" ? "PROVEN_HEALTHY" : "PROVEN_DEAD" })
  }
  if (operation === "STOP") {
    if (input.status === "UNAVAILABLE") return freezeResult(input, { request: "NOT_ACKNOWLEDGED", state: "DISCONNECTED_UNKNOWN" })
    const outcome = input.outcome
    if (!plain(outcome) || Object.keys(outcome).length !== 2 || typeof outcome.request_acknowledged !== "boolean" || !["STOPPED", "DEAD", "UNKNOWN"].includes(outcome.state)) invalid("matching stop outcome is invalid")
    return freezeResult(input, { request: outcome.request_acknowledged ? "ACKNOWLEDGED" : "NOT_ACKNOWLEDGED", state: outcome.state === "STOPPED" ? "PROVEN_STOPPED" : outcome.state === "DEAD" ? "PROVEN_DEAD" : "DISCONNECTED_UNKNOWN" })
  }
  if (input.status !== "MATCHED" || input.outcome !== true) invalid("matching attach outcome is required")
  return freezeResult(input, { acknowledged: true })
}

export const createRuntimeObserve = (input) => mapOutcome("OBSERVE", input)
export const createRuntimeHealth = (input) => mapOutcome("HEALTH", input)
export const createRuntimeStop = (input) => mapOutcome("STOP", input)
export const createRuntimeAttach = (input) => mapOutcome("ATTACH", input)
