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

// The decision's frozen scope is what makes it THIS work's decision rather than merely a real one. Without
// this, any candidate binds to any parked decision and the record asserts a relation nothing ever verified.
// `assertParkedDecision` already holds the parked decision's own origin to its frozen scope; this holds the
// work to the same scope, so all three agree or nothing is sealed.
const withinFrozenScope = (parked, session_id, subject) => {
  if (!parked.frozen_scope.session_ids.includes(session_id)) invalid(`${subject} lies outside the parked decision's frozen scope`)
}

const sources = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid("Binding sources must be an object")
  const kind = genus(input)
  const parked = validate("parkedDecision", input.parked_decision)
  // The identity is computed here from the work itself rather than accepted from the caller, so the record
  // always names the work it actually describes. What forbids attributing that work to a SECOND decision is
  // the store: `binding_id` derives from this revision alone, so a re-attribution collides on one path and
  // fails as a divergent replay. See `bindCompletedWork` in main-store/store.mjs.
  const candidate = freezeCandidate(input.candidate)
  withinFrozenScope(parked, candidate.session_id, "Completed work")
  if (kind === "OPTION") {
    const response = validate("parkedDecisionResponse", input.parked_decision_response)
    if (response.parked_decision_id !== parked.parked_decision_id) invalid("Response names another parked decision")
    if (response.parked_decision_digest !== parked.parked_decision_digest) invalid("Response carries another parked decision digest")
    if (response.session_plan_snapshot_digest !== parked.frozen_scope.session_plan_snapshot_digest) invalid("Response carries another frozen scope snapshot")
    if (!parked.options.some(({ option_id }) => option_id === response.option_id)) invalid("Response selects an option the parked decision never enumerated")
    return { candidate, kind, parked, option_id: response.option_id }
  }
  const assumption = input.assumption
  // An assumption is only explicit if we can say who made it, and that origin must be inside the same scope
  // as the work: an assumption raised by an unrelated Sesión never governed this candidate.
  if (!assumption || typeof assumption !== "object" || Array.isArray(assumption)) invalid("Explicit assumption must be an object")
  withinFrozenScope(parked, assumption.origin?.session_id, "Explicit assumption origin")
  return { candidate, kind, parked, assumption }
}

const derived = ({ candidate, kind, parked, option_id, assumption }) => ({
  schema: "completed-work-binding", schema_version: 1,
  // Load-bearing: the id derives from the work's revision ALONE. That is what makes the OPTION and the
  // ASSUMPTION record for one candidate collide on a single store path, so re-attributing finished work
  // surfaces as a divergent replay instead of a second record. Widening this with the decision, the genus or
  // anything else would let two contradictory attributions of the same work coexist. Pinned by test.
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
