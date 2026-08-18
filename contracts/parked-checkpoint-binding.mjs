import { digestArtifact } from "./canonicalize.mjs"
import { failContract } from "./errors.mjs"
import { validate, validateCheckpointProvenancePair } from "./validate.mjs"

const invalid = (message) => failContract("CT_SCHEMA_INVALID", message)
const withoutDigest = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Binding must be an object")
  const { binding_digest: _digest, ...binding } = value
  return binding
}

export const parkedCheckpointBindingDigest = (value) => digestArtifact({
  domain: "control-tower/parked-checkpoint-binding/artifact/v1",
  binding: withoutDigest(value),
}, "rfc8785-jcs")

const sources = ({ parked_decision, checkpoint_capture, reconciled_checkpoint }) => {
  const parked = validate("parkedDecision", parked_decision)
  const { capture, reconciliation } = validateCheckpointProvenancePair(checkpoint_capture, reconciled_checkpoint)
  return { parked, capture, reconciliation }
}

const derived = ({ parked, capture, reconciliation }) => ({
  schema: "parked-checkpoint-binding", schema_version: 1,
  parked_decision_id: parked.parked_decision_id, parked_decision_digest: parked.parked_decision_digest,
  parked_checkpoint: parked.checkpoint, capture_checkpoint_id: capture.checkpoint_id,
  capture_checkpoint_digest: capture.digest, reconciled_checkpoint_id: reconciliation.reconciliation_id,
  reconciled_checkpoint_digest: reconciliation.digest, reconciliation_state: reconciliation.state,
  repository: capture.repository_root, project_id: capture.project_id, assignment_id: capture.assignment_id,
  generation: capture.generation, base_sha: capture.base.commit, result_sha: capture.result.commit,
})

export const createParkedCheckpointBinding = (input) => {
  const binding = derived(sources(input))
  return validate("parkedCheckpointBinding", { ...binding, binding_digest: parkedCheckpointBindingDigest(binding) })
}

export const assertParkedCheckpointBinding = (bindingInput, input) => {
  const binding = validate("parkedCheckpointBinding", bindingInput)
  const expected = createParkedCheckpointBinding(input)
  if (JSON.stringify(binding) !== JSON.stringify(expected)) invalid("Binding does not match its exact canonical sources")
  return binding
}
