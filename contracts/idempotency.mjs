import { digestArtifact } from "./canonicalize.mjs"
import { failContract } from "./errors.mjs"

const fields = Object.freeze(["project_id", "plan_id", "slice_id", "assignment_revision", "attempt", "epoch", "operation", "target"])
const invalid = (message) => failContract("CT_SCHEMA_INVALID", message)
const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value)
  }
  return value
}

const assertInput = (input) => {
  if (!input || Object.getPrototypeOf(input) !== Object.prototype || Object.keys(input).sort().join("\0") !== [...fields].sort().join("\0")) invalid("Idempotency input must contain the exact bound fields")
  for (const field of ["project_id", "plan_id", "slice_id", "operation", "target"]) if (typeof input[field] !== "string" || !input[field]) invalid(`Invalid idempotency field: ${field}`)
  for (const field of ["assignment_revision", "attempt", "epoch"]) if (!Number.isSafeInteger(input[field]) || input[field] < 1) invalid(`Invalid idempotency field: ${field}`)
}

export const deriveIdempotencyIdentity = (input) => {
  assertInput(input); return `ctv1:${digestArtifact(input, "rfc8785-jcs").slice("sha256:".length)}`
}

export const inspectIdempotentRetry = async ({ identity, input, inspect }) => {
  if (identity !== deriveIdempotencyIdentity(input)) failContract("CT_IDEMPOTENCY_CONFLICT", "Idempotency identity does not match bound input")
  if (typeof inspect !== "function") invalid("Retry inspection function is required")
  const evidence = await inspect(identity)
  return deepFreeze({ status: evidence === null || evidence === undefined ? "UNKNOWN_EFFECT" : "EVIDENCE_FOUND", replay: false, identity, evidence: evidence ?? null })
}
