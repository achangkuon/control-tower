import { failContract } from "../contracts/errors.mjs"
import {
  reconciledCheckpointDigest, reconciledCheckpointIdentity, validate, validateCheckpointProvenancePair,
} from "../contracts/validate.mjs"
import { assertCanonicalCheckpointCapture } from "./checkpoint.mjs"

const invalid = (message) => failContract("CT_SCHEMA_INVALID", message)
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
const exactKeys = (value, keys) => record(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child)
    Object.freeze(value)
  }
  return value
}
const assertFrozenPlain = (value) => {
  if (!record(value) || Object.getPrototypeOf(value) !== Object.prototype || !Object.isFrozen(value)) return false
  const inspect = (child) => {
    if (!child || typeof child !== "object") return true
    if (!Object.isFrozen(child) || !Array.isArray(child) && Object.getPrototypeOf(child) !== Object.prototype) return false
    return Object.values(child).every(inspect)
  }
  return Object.values(value).every(inspect)
}
const evidenceKeys = [
  "project_id", "assignment_id", "generation", "repository_root", "git_common_dir", "base", "result",
  "manifest_ref", "candidate_ref", "ledger_digest", "runtime_projection_revision", "host_epoch", "jornada_id",
  "jornada_revision", "registry_revision", "capability_revision",
]
const assertEvidence = (capture, evidence) => {
  if (!exactKeys(evidence, evidenceKeys)) invalid("Reconciliation evidence must use the closed required contract")
  const mismatch = evidence.project_id !== capture.project_id || evidence.assignment_id !== capture.assignment_id ||
    evidence.generation !== capture.generation || evidence.repository_root !== capture.repository_root ||
    evidence.git_common_dir !== capture.git_common_dir || !exactKeys(evidence.base, ["commit", "tree"]) ||
    !exactKeys(evidence.result, ["commit", "tree"]) || evidence.base.commit !== capture.base.commit ||
    evidence.base.tree !== capture.base.tree || evidence.result.commit !== capture.result.commit ||
    evidence.result.tree !== capture.result.tree
  if (mismatch) invalid("Reconciliation evidence does not bind the exact canonical capture")
}

class CanonicalReconciledCheckpoint {
  #origin = true
  constructor(value) { Object.assign(this, value) }
  static owns(value) { return value !== null && (typeof value === "object" || typeof value === "function") && #origin in value }
}
const materialize = (value) => {
  const artifact = new CanonicalReconciledCheckpoint(value)
  Object.setPrototypeOf(artifact, Object.prototype)
  return freeze(artifact)
}

export const assertCanonicalReconciledCheckpoint = (value) => {
  if (!CanonicalReconciledCheckpoint.owns(value)) failContract("CT_PROVENANCE_ORIGIN_INVALID", "Reconciliation lacks exact live producer origin")
  if (!assertFrozenPlain(value)) failContract("CT_PROVENANCE_ORIGIN_INVALID", "Reconciliation transport is not deeply frozen and plain")
  validate("reconciledCheckpoint", value)
  return value
}

export const reconcileCheckpoint = (input) => {
  const capture = input?.capture
  assertCanonicalCheckpointCapture(capture)
  if (!exactKeys(input, ["capture", "evidence"])) invalid("Reconciliation input must contain only capture and evidence")
  const { evidence } = input
  assertEvidence(capture, evidence)
  const content = {
    schema: "reconciled-checkpoint", schema_version: 1, state: "VALID",
    capture: { checkpoint_id: capture.checkpoint_id, digest: capture.digest },
    project_id: capture.project_id, assignment_id: capture.assignment_id, generation: capture.generation,
    repository_root: capture.repository_root, git_common_dir: capture.git_common_dir,
    base: capture.base, result: capture.result,
    evidence: {
      manifest_ref: evidence.manifest_ref, candidate_ref: evidence.candidate_ref, ledger_digest: evidence.ledger_digest,
      runtime_projection_revision: evidence.runtime_projection_revision, host_epoch: evidence.host_epoch,
      jornada_id: evidence.jornada_id, jornada_revision: evidence.jornada_revision,
      registry_revision: evidence.registry_revision, capability_revision: evidence.capability_revision,
    },
  }
  const reconciliation_id = reconciledCheckpointIdentity(content)
  const digest = reconciledCheckpointDigest({ ...content, reconciliation_id })
  const { schema, schema_version, ...bindings } = content
  const candidate = { schema, schema_version, reconciliation_id, digest, ...bindings }
  const validated = validate("reconciledCheckpoint", candidate)
  validateCheckpointProvenancePair(capture, validated)
  return assertCanonicalReconciledCheckpoint(materialize(validated))
}
