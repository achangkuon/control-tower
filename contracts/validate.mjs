import { isAlias, isMap, isScalar, isSeq, parseDocument, visit } from "yaml"

import { digestArtifact } from "./canonicalize.mjs"
import { candidateRevision } from "./candidate-revision.mjs"
import { parkedDecisionDigest, parkedDecisionResponseDigest } from "./parked-decision.mjs"
import { parkedCheckpointBindingDigest } from "./parked-checkpoint-binding.mjs"
import { sessionPlanSnapshotDigest } from "./session-plan-snapshot.mjs"
import { failContract } from "./errors.mjs"
import { validatorFor } from "./schema-registry.mjs"

const invalid = (message, diagnostics = []) => failContract("CT_SCHEMA_INVALID", message, diagnostics)
const invalidManifest = (message) => failContract("CT_MANIFEST_INVALID", message)
const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}
const captureContent = (value) => ({
  schema: value.schema, schema_version: value.schema_version,
  project_id: value.project_id, assignment_id: value.assignment_id, generation: value.generation,
  repository_root: value.repository_root, git_common_dir: value.git_common_dir,
  base: value.base, result: value.result, files: value.files,
})
export const checkpointCaptureIdentity = (value) => `checkpoint-${digestArtifact({
  domain: "control-tower/checkpoint-capture/identity/v1", content: captureContent(value),
}, "rfc8785-jcs").slice("sha256:".length)}`
export const checkpointCaptureDigest = (value) => digestArtifact({
  domain: "control-tower/checkpoint-capture/artifact/v1",
  artifact: { ...captureContent(value), checkpoint_id: checkpointCaptureIdentity(value) },
}, "rfc8785-jcs")
const reconciliationContent = (value) => ({
  schema: value.schema, schema_version: value.schema_version, state: value.state, capture: value.capture,
  project_id: value.project_id, assignment_id: value.assignment_id, generation: value.generation,
  repository_root: value.repository_root, git_common_dir: value.git_common_dir,
  base: value.base, result: value.result, evidence: value.evidence,
})
export const reconciledCheckpointIdentity = (value) => `reconciliation-${digestArtifact({
  domain: "control-tower/reconciled-checkpoint/identity/v1", content: reconciliationContent(value),
}, "rfc8785-jcs").slice("sha256:".length)}`
export const reconciledCheckpointDigest = (value) => digestArtifact({
  domain: "control-tower/reconciled-checkpoint/artifact/v1",
  artifact: { ...reconciliationContent(value), reconciliation_id: reconciledCheckpointIdentity(value) },
}, "rfc8785-jcs")
const inspectYamlNode = (_key, node) => {
  if (isAlias(node) || node?.anchor || node?.tag) invalid("YAML aliases, anchors, and tags are forbidden")
  if (isMap(node)) {
    for (const pair of node.items) {
      if (!isScalar(pair.key) || typeof pair.key.value !== "string" || pair.key.value === "<<") {
        invalid("YAML keys must be non-merge strings")
      }
    }
  }
  if (isSeq(node) || isScalar(node)) return
}
const parseInput = (input) => {
  if (typeof input !== "string") return structuredClone(input)
  const document = parseDocument(input, { schema: "json", version: "1.2", uniqueKeys: true, merge: false })
  if (document.errors.length > 0 || document.warnings.length > 0) {
    invalid("Structured document is not JSON-compatible YAML 1.2", [...document.errors, ...document.warnings].map(({ code, message }) => ({ code, message })))
  }
  visit(document, inspectYamlNode)
  const value = document.toJS({ mapAsMap: false, maxAliasCount: 0 })
  const inspectValue = (candidate) => {
    if (typeof candidate === "number" && (!Number.isFinite(candidate) || !Number.isSafeInteger(candidate) && Number.isInteger(candidate))) {
      invalid("Structured numbers must be finite and safe")
    }
    if (candidate && typeof candidate === "object") for (const child of Object.values(candidate)) inspectValue(child)
  }
  inspectValue(value)
  return value
}
const assertUnique = (items, key, message) => {
  const values = items.map((item) => item[key])
  if (new Set(values).size !== values.length) invalidManifest(message)
}
const assertDag = (items, idKey, dependencyKey) => {
  const ids = new Set(items.map((item) => item[idKey]))
  const visiting = new Set(), visited = new Set()
  const byId = new Map(items.map((item) => [item[idKey], item]))
  const walk = (id) => {
    if (visiting.has(id)) invalidManifest("Dependency graph must be acyclic")
    if (visited.has(id)) return
    visiting.add(id)
    for (const dependency of byId.get(id)[dependencyKey]) {
      if (!ids.has(dependency)) invalidManifest("Dependency must resolve")
      walk(dependency)
    }
    visiting.delete(id); visited.add(id)
  }
  for (const id of ids) walk(id)
}
const hasManifestRuntimeState = (value) => {
  if (!value || typeof value !== "object") return false
  const runtimeFields = ["session_id", "worktree", "lease", "lock", "attempt", "heartbeat", "host_epoch"]
  return runtimeFields.some((field) => Object.hasOwn(value, field))
}
const assertSessionSnapshot = (value) => {
  if (sessionPlanSnapshotDigest(value) !== value.snapshot_digest) invalid("Session snapshot digest must match its frozen identity")
  const local = new Set(value.graph.local_session_ids), external = new Set(value.graph.external_session_ids)
  if ([...local].some((id) => external.has(id))) invalid("Session graph identity domains must be disjoint")
  if (!local.has(value.target.session_id) || external.has(value.target.session_id)) invalid("Session snapshot target must be plan-local")
  const nodes = new Set([...local, ...external]), edgeKeys = new Set(), inbound = []
  const adjacency = new Map([...nodes].map((id) => [id, []]))
  for (const edge of value.graph.edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) invalid("Session graph edge endpoint must resolve")
    const key = `${edge.from}\0${edge.to}`
    if (edgeKeys.has(key)) invalid("Session graph edges must be unique")
    edgeKeys.add(key); adjacency.get(edge.from).push(edge.to)
    if (edge.to === value.target.session_id) inbound.push(edge.from)
  }
  const visiting = new Set(), visited = new Set()
  const walk = (id) => {
    if (visiting.has(id)) invalid("Session dependency graph must be acyclic")
    if (visited.has(id)) return
    visiting.add(id); for (const next of adjacency.get(id)) walk(next); visiting.delete(id); visited.add(id)
  }
  for (const id of nodes) walk(id)
  if (JSON.stringify([...new Set(inbound)].sort()) !== JSON.stringify([...value.target.depends_on].sort())) invalid("Target dependencies must equal inbound graph edges")
  const contamination = value.target.decisions.flatMap((decision) => decision.kind === "escala" ? decision.contamination.session_ids : [])
  if (contamination.some((id) => !nodes.has(id))) invalid("Decision contamination must resolve in the Session graph")
  if (new Set(value.target.decisions.map(({ body }) => body)).size !== value.target.decisions.length) invalid("Decision bodies must be unique")
  if (new Set(value.target.acceptance_criteria.map(({ text }) => text)).size !== value.target.acceptance_criteria.length) invalid("Acceptance criteria must be unique")
}
const assertParkedDecision = (value) => {
  if (parkedDecisionDigest(value) !== value.parked_decision_digest) invalid("Parked decision digest must match its frozen identity")
  const optionIds = value.options.map(({ option_id }) => option_id)
  if (new Set(optionIds).size !== optionIds.length) invalid("Parked decision option IDs must be unique")
  if (value.evidence.some(({ line_start, line_end }) => line_start > line_end)) invalid("Parked decision evidence range must be ordered")
  if (!value.frozen_scope.session_ids.includes(value.origin.session_id)) invalid("Parked decision origin must belong to its frozen scope")
}
const assertParkedDecisionResponse = (value) => {
  if (parkedDecisionResponseDigest(value) !== value.response_digest) invalid("Parked decision response digest must match its frozen identity")
}
const assertCheckpointCapture = (value) => {
  if (checkpointCaptureIdentity(value) !== value.checkpoint_id) invalid("Checkpoint identity must match its canonical content")
  if (checkpointCaptureDigest(value) !== value.digest) invalid("Checkpoint digest must match its canonical artifact")
  const paths = value.files.map(({ path }) => path)
  if (new Set(paths).size !== paths.length) invalid("Checkpoint file paths must be unique")
  if (JSON.stringify(paths) !== JSON.stringify([...paths].sort())) invalid("Checkpoint files must be sorted by path")
}
const assertReconciledCheckpoint = (value) => {
  if (reconciledCheckpointIdentity(value) !== value.reconciliation_id) invalid("Reconciliation identity must match its canonical content")
  if (reconciledCheckpointDigest(value) !== value.digest) invalid("Reconciliation digest must match its canonical artifact")
}
const invariants = Object.freeze({
  projectRegistry: (value) => {
    assertUnique(value.projects, "project_id", "Project IDs must be unique")
    const aliases = value.projects.flatMap(({ aliases }) => aliases)
    if (new Set(aliases).size !== aliases.length) invalidManifest("Aliases must resolve uniquely")
  },
  planCatalog: (value) => {
    assertUnique(value.plans, "plan_id", "Catalog plan IDs must be unique")
    if (value.plans.some(({ manifest_ref }) => typeof manifest_ref === "string" && manifest_ref.length === 0)) invalidManifest("Manifest refs must resolve")
  },
  planManifest: (value) => {
    assertUnique(value.slices, "slice_id", "Slice IDs must be unique"); assertDag(value.slices, "slice_id", "dependencies")
  },
  bindingDelta: (value) => {
    const previous = value.inputs.previous_delta
    if (value.artifact_revision === 1 && previous !== null) invalidManifest("Initial delta cannot link a previous revision")
    if (value.artifact_revision > 1 && previous?.artifact_revision !== value.artifact_revision - 1) invalidManifest("Delta correction must link the previous revision")
  },
  campaign: (value) => { assertUnique(value.steps, "step_id", "Campaign step IDs must be unique"); assertDag(value.steps, "step_id", "depends_on") },
  agentCapabilityRegistry: (value) => {
    const keys = value.capabilities.map(({ agent_role, capability }) => `${agent_role}\0${capability}`)
    if (new Set(keys).size !== keys.length) invalidManifest("Role capabilities must resolve uniquely")
  },
  candidateRevision: (value) => {
    if (candidateRevision(value) !== value.candidate_revision) invalid("Candidate revision must match its frozen identity")
  },
  sessionPlanSnapshot: assertSessionSnapshot,
  parkedDecision: assertParkedDecision,
  parkedDecisionResponse: assertParkedDecisionResponse,
  checkpointCapture: assertCheckpointCapture,
  reconciledCheckpoint: assertReconciledCheckpoint,
  parkedCheckpointBinding: (value) => {
    if (parkedCheckpointBindingDigest(value) !== value.binding_digest) invalid("Parked checkpoint binding digest must match its canonical content")
  },
})

export const validate = (schemaName, input) => {
  const validator = validatorFor(schemaName)
  if (!validator) invalid(`Unknown schema: ${schemaName}`)
  const value = parseInput(input)
  if (schemaName === "planManifest" && hasManifestRuntimeState(value)) invalidManifest("Manifest must exclude mutable runtime state")
  if (!validator(value)) {
    const errors = validator.errors ?? []
    const manifestError = ["planCatalog", "planManifest"].includes(schemaName)
      && !errors.some(({ keyword, params }) => keyword === "additionalProperties" && params.additionalProperty !== "session_id")
    if (manifestError) invalidManifest("Manifest payload is invalid")
    invalid("Payload does not satisfy its contract", errors)
  }
  invariants[schemaName]?.(value)
  return deepFreeze(value)
}

export const validateCheckpointProvenancePair = (captureInput, reconciliationInput) => {
  const capture = validate("checkpointCapture", captureInput)
  const reconciliation = validate("reconciledCheckpoint", reconciliationInput)
  const mismatch = reconciliation.capture.checkpoint_id !== capture.checkpoint_id || reconciliation.capture.digest !== capture.digest ||
    reconciliation.project_id !== capture.project_id || reconciliation.assignment_id !== capture.assignment_id ||
    reconciliation.generation !== capture.generation || reconciliation.repository_root !== capture.repository_root ||
    reconciliation.git_common_dir !== capture.git_common_dir || reconciliation.base.commit !== capture.base.commit ||
    reconciliation.base.tree !== capture.base.tree || reconciliation.result.commit !== capture.result.commit ||
    reconciliation.result.tree !== capture.result.tree
  if (mismatch) invalid("Checkpoint capture and reconciliation must bind the exact same checkpoint")
  return deepFreeze({ capture, reconciliation })
}
