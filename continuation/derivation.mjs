import { digestArtifact } from "../contracts/canonicalize.mjs"

const fail = (code, message, details = {}) => { throw Object.assign(new Error(message), { code, ...details }) }
const planDigest = (bytes) => digestArtifact(bytes, "raw-bytes")
const modulesFromPlan = (bytes) => [...Buffer.from(bytes).toString("utf8").matchAll(/^### Módulo (M\d+\.\d+\.\d+)\b/gmu)].map((match) => match[1])

export const deriveNextModule = ({ plan_bytes, expected_plan_digest, ledger, main_store } = {}) => {
  if (planDigest(plan_bytes) !== expected_plan_digest) fail("CT_NO_EXECUTABLE_SCOPE", "Plan document changed since the prior close")
  const modules = modulesFromPlan(plan_bytes)
  if (modules.length === 0 || typeof ledger?.readDeliveryClaims !== "function" || typeof main_store?.readHandoffCoordinate !== "function") fail("CT_NO_EXECUTABLE_SCOPE", "Derivation evidence is unavailable")
  const fulfilled = new Set()
  for (const entry of ledger.readDeliveryClaims()) {
    if (entry?.delivery_state !== "CLOSED" || entry.claim_state !== "CLOSED") continue
    const coordinate = main_store.readHandoffCoordinate(entry.handoff_id)
    if (!coordinate?.module_id) fail("CT_NO_EXECUTABLE_SCOPE", "Fulfilled handoff lacks a Main-owned coordinate")
    fulfilled.add(coordinate.module_id)
  }
  const module_id = modules.find((value) => !fulfilled.has(value))
  if (!module_id) fail("CT_NO_EXECUTABLE_SCOPE", "No executable Module remains")
  return Object.freeze({ module_id, plan_digest: expected_plan_digest })
}

export const compareWorkerClaim = ({ actual_claim, handoff_id, project_id, main_store } = {}) => {
  if (typeof actual_claim !== "string" || typeof handoff_id !== "string" || typeof project_id !== "string" || typeof main_store?.readHandoffCoordinate !== "function" || typeof main_store.recordWorkerClaim !== "function") fail("CT_CLAIM_MISMATCH", "Worker claim evidence is invalid")
  const expected_claim = main_store.readHandoffCoordinate(handoff_id)?.module_id
  if (typeof expected_claim !== "string" || expected_claim !== actual_claim) fail("CT_CLAIM_MISMATCH", `Worker claim mismatch: expected ${expected_claim}, actual ${actual_claim}`, { expected_claim, actual_claim })
  return main_store.recordWorkerClaim({ actor: "MAIN", project_id, handoff_id, expected_claim, actual_claim })
}
