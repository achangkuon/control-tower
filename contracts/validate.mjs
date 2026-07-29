import { isAlias, isMap, isScalar, isSeq, parseDocument, visit } from "yaml"

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
