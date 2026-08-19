import { digestArtifact } from "./canonicalize.mjs"
import { freezeCandidate } from "./candidate-revision.mjs"
import { failContract } from "./errors.mjs"
import { validate } from "./validate.mjs"

const invalid = (message) => failContract("CT_SCHEMA_INVALID", message)
const withoutDigest = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Binding must be an object")
  const { binding_digest: _digest, ...binding } = value
  return binding
}

export const completedWorkBindingDigest = (value) => digestArtifact({
  domain: "control-tower/completed-work-binding/artifact/v1",
  binding: withoutDigest(value),
}, "rfc8785-jcs")

// The assumption is digested as its own canonical artifact, so the binding names a value it derived rather
// than a string a caller handed it. It stays inside the standalone record: there is no second artifact to fetch.
export const explicitAssumptionDigest = (assumption) => digestArtifact({
  domain: "control-tower/explicit-assumption/artifact/v1",
  assumption,
}, "rfc8785-jcs")

// Exactly one genus governs the work. Supplying both, or neither, is refused before anything is derived,
// so the record can never exist in a state where it is unknown which one applied.
const genus = ({ parked_decision_response, assumption }) => {
  const hasOption = parked_decision_response !== undefined, hasAssumption = assumption !== undefined
  if (hasOption === hasAssumption) invalid("Completed work is governed by exactly one enumerated option or one explicit assumption")
  return hasOption ? "OPTION" : "ASSUMPTION"
}

const sources = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid("Binding sources must be an object")
  const kind = genus(input)
  const parked = validate("parkedDecision", input.parked_decision)
  // Sealing happens at the freeze, not afterwards: the identity is computed here from the work itself, so a
  // caller cannot present a completed candidate and declare retrospectively which decision governed it.
  const candidate = freezeCandidate(input.candidate)
  if (kind === "OPTION") {
    const response = validate("parkedDecisionResponse", input.parked_decision_response)
    if (response.parked_decision_id !== parked.parked_decision_id) invalid("Response names another parked decision")
    if (response.parked_decision_digest !== parked.parked_decision_digest) invalid("Response carries another parked decision digest")
    if (response.session_plan_snapshot_digest !== parked.frozen_scope.session_plan_snapshot_digest) invalid("Response carries another frozen scope snapshot")
    if (!parked.options.some(({ option_id }) => option_id === response.option_id)) invalid("Response selects an option the parked decision never enumerated")
    return { candidate, kind, parked, option_id: response.option_id }
  }
  return { candidate, kind, parked, assumption: input.assumption }
}

const derived = ({ candidate, kind, parked, option_id, assumption }) => ({
  schema: "completed-work-binding", schema_version: 1,
  binding_id: `completed-work-${candidate.candidate_revision.slice("sha256:".length)}`,
  candidate_revision: candidate.candidate_revision,
  project_id: candidate.project_id, plan_id: candidate.plan_id, session_id: candidate.session_id,
  assignment_id: candidate.assignment_id, base_sha: candidate.base_sha, result_sha: candidate.result_sha,
  tree_sha: candidate.tree_sha, parked_decision_id: parked.parked_decision_id,
  parked_decision_digest: parked.parked_decision_digest,
  session_plan_snapshot_digest: parked.frozen_scope.session_plan_snapshot_digest,
  governed_by: kind,
  ...(kind === "OPTION" ? { option_id } : { assumption, assumption_digest: explicitAssumptionDigest(assumption) }),
})

export const createCompletedWorkBinding = (input) => {
  const binding = derived(sources(input))
  return validate("completedWorkBinding", { ...binding, binding_digest: completedWorkBindingDigest(binding) })
}

export const assertCompletedWorkBinding = (bindingInput, input) => {
  const binding = validate("completedWorkBinding", bindingInput)
  const expected = createCompletedWorkBinding(input)
  if (JSON.stringify(binding) !== JSON.stringify(expected)) invalid("Binding does not match its exact canonical sources")
  return binding
}
