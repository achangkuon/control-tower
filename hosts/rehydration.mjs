// A projection carries exactly the durable binding and nothing else: no pane, view, terminal or in-flight state.
const PROJECTION_KEYS = Object.freeze(["agent", "assignment_ref", "backend_pid", "backend_url", "host_epoch", "project_id", "root_session_id", "worktree"])
const CLAIM_KEYS = Object.freeze(["assignment_ref", "host_epoch", "project_id", "worktree"])
// Identity before authority: a claim about someone else's assignment was never ours to call stale.
const OWNERSHIP_KEYS = Object.freeze(["assignment_ref", "project_id", "worktree"])

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
const validRef = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) && !value.includes("..")
const bounded = (value) => typeof value === "string" && value.length > 0 && value.length <= 512 && !value.includes("\0")
const positive = (value) => Number.isSafeInteger(value) && value > 0

const validClaim = (value) => exact(value, CLAIM_KEYS) && validRef(value.assignment_ref)
  && bounded(value.project_id) && bounded(value.worktree) && value.worktree.startsWith("/") && positive(value.host_epoch)

export const createRehydration = ({ rootBinding } = {}) => {
  if (typeof rootBinding?.read !== "function") throw new TypeError("Root binding read port is required")
  return Object.freeze({
    // Rehydration restores a view of durable authority. It holds no port that could create or replace a root,
    // so a rehydrated assignment can never resurrect a backend, a session or a pane as a side effect.
    rehydrate(claim) {
      if (!validClaim(claim)) fail("CT_REHYDRATION_INVALID", "Rehydration claim is invalid")
      let binding
      try { binding = rootBinding.read(claim.assignment_ref) } catch (error) {
        // The store's own typed refusal is the finding. Anything untyped is our failure to read, not evidence.
        if (error?.code?.startsWith("CT_")) throw error
        fail("CT_REHYDRATION_INVALID", "Root binding could not be read")
      }
      if (OWNERSHIP_KEYS.some((key) => binding?.[key] !== claim[key])) fail("CT_REHYDRATION_FOREIGN", "Rehydration claim names another assignment, project or worktree")
      // CT-V1-08: an epoch that is not the bound one has no authority, whether it is older or newer.
      if (binding.host_epoch !== claim.host_epoch) fail("CT_ASSIGNMENT_STALE", "Rehydration claim carries a different host epoch")
      return Object.freeze(Object.fromEntries(PROJECTION_KEYS.map((key) => [key, binding[key]])))
    },
  })
}
