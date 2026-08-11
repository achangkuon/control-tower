import { digestArtifact } from "./canonicalize.mjs"
import { failContract } from "./errors.mjs"
import { validate } from "./validate.mjs"

const invalid = (message) => failContract("CT_SCHEMA_INVALID", message)
const identity = (value, digestField) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Contract value must be an object")
  const { [digestField]: _digest, ...rest } = value
  return rest
}
const digest = (value, field) => digestArtifact(identity(value, field), "rfc8785-jcs")

export const parkedDecisionDigest = (value) => digest(value, "parked_decision_digest")
export const parkedDecisionResponseDigest = (value) => digest(value, "response_digest")

export const createParkedDecision = (input) => {
  const value = identity(input, "parked_decision_digest"), parked_decision_digest = parkedDecisionDigest(value)
  if (input.parked_decision_digest !== undefined && input.parked_decision_digest !== parked_decision_digest) invalid("Parked decision digest does not match its identity")
  return validate("parkedDecision", { ...value, parked_decision_digest })
}

export const createParkedDecisionResponse = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid("Response input must be an object")
  const parked = validate("parkedDecision", input.parked_decision)
  if (typeof input.option_id !== "string" || !parked.options.some(({ option_id }) => option_id === input.option_id)) invalid("Response option must be enumerated by the parked decision")
  const value = {
    schema: "parked-decision-response", schema_version: 1, response_id: input.response_id,
    authorization_id: input.authorization_id, authorization_revision: input.authorization_revision,
    parked_decision_id: parked.parked_decision_id, parked_decision_digest: parked.parked_decision_digest,
    option_id: input.option_id, session_plan_snapshot_digest: parked.frozen_scope.session_plan_snapshot_digest,
    responded_at: input.responded_at,
  }
  return validate("parkedDecisionResponse", { ...value, response_digest: parkedDecisionResponseDigest(value) })
}

export const assertParkedDecisionResponseBinding = (response, parkedDecision) => {
  const bound = validate("parkedDecisionResponse", response), parked = validate("parkedDecision", parkedDecision)
  if (bound.parked_decision_id !== parked.parked_decision_id || bound.parked_decision_digest !== parked.parked_decision_digest ||
      bound.session_plan_snapshot_digest !== parked.frozen_scope.session_plan_snapshot_digest ||
      !parked.options.some(({ option_id }) => option_id === bound.option_id)) invalid("Response does not match the frozen parked decision")
  return bound
}
