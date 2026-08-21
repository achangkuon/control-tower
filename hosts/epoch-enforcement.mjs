const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exact = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
const digest = (value) => typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value)
const ref = (value) => typeof value === "string" && value.length > 0 && !value.includes("\0")

const inspectIdentity = (value) => {
  const keys = ["project_id", "assignment_ref", "candidate_revision", "host_epoch"]
  if (!exact(value, keys) || !ref(value.project_id) || !ref(value.assignment_ref) || !digest(value.candidate_revision)
    || !Number.isSafeInteger(value.host_epoch) || value.host_epoch < 1) fail("CT_FENCE_INVALID", "Exact host identity is invalid")
  return Object.freeze({ ...value })
}

export const createEpochEnforcement = ({ candidateFence } = {}) => {
  if (typeof candidateFence?.assertExactCurrent !== "function") throw new TypeError("Candidate-fence authority is required")
  const assertCurrent = (identity) => candidateFence.assertExactCurrent(inspectIdentity(identity))
  return Object.freeze({
    assertCurrent,
    publishSuccessor(input = {}) {
      if (!exact(input, ["mode", "predecessorIdentity", "successorIdentity", "publication"]) || !["verified", "forced"].includes(input.mode)
        || !input.publication || typeof input.publication !== "object" || Array.isArray(input.publication)) fail("CT_FENCE_INVALID", "Successor publication is invalid")
      const predecessor = inspectIdentity(input.predecessorIdentity), successor = inspectIdentity(input.successorIdentity)
      if (successor.project_id !== predecessor.project_id || successor.host_epoch !== predecessor.host_epoch + 1
        || successor.assignment_ref === predecessor.assignment_ref || successor.candidate_revision === predecessor.candidate_revision) {
        fail("CT_FENCE_INVALID", "Successor lineage is invalid")
      }
      assertCurrent(predecessor)
      const publish = input.mode === "verified" ? candidateFence.admit : candidateFence.forceTakeover
      if (typeof publish !== "function") throw new TypeError("Candidate-fence publication port is required")
      const result = publish.call(candidateFence, input.publication)
      if (result?.revision !== successor.host_epoch) fail("CT_FENCE_INVALID", "Successor publication did not reach its terminal epoch")
      assertCurrent(successor)
      return result
    },
  })
}
