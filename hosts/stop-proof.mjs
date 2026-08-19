import { validate } from "../contracts/validate.mjs"

// The projection this module derives. It is a binding between an already-canonical proof and a root binding.
const PROOF_BINDING_KEYS = Object.freeze(["assignment_ref", "backend_pid", "backend_url", "disposition", "generation", "host_epoch", "project_id", "root_session_id", "termination_proof_ref", "worktree"])
const REQUEST_KEYS = Object.freeze(["assignment_ref", "termination_proof_ref"])

const fail = (code, message, cause) => { throw Object.assign(new Error(message), { code, ...(cause === undefined ? {} : { cause }) }) }
const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
const validRef = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) && !value.includes("..")

export const createStopProofBinder = ({ resolveTerminationProof, rootBinding } = {}) => {
  if (typeof resolveTerminationProof !== "function" || typeof rootBinding?.read !== "function") throw new TypeError("Canonical stop proof ports are required")
  return Object.freeze({
    // Termination truth is owned elsewhere and observed there, so nothing here can mint, assert or weaken a
    // proof. What this DOES prove is narrower than the record it returns: the canonical proof carries no
    // backend, session or epoch field, so only project, assignment and workspace are actually cross-checked.
    // The backend_pid, backend_url and root_session_id below are copied from the binding and are NOT proven
    // by the proof to have stopped; the host epoch, however, is cross-checked under decision 43.
    bind(request) {
      if (!exact(request, REQUEST_KEYS) || !validRef(request.assignment_ref) || !validRef(request.termination_proof_ref)) {
        fail("CT_STOP_PROOF_INVALID", "Stop proof binding accepts only an assignment and a canonical proof reference")
      }
      const { assignment_ref, termination_proof_ref } = request
      let binding
      try { binding = rootBinding.read(assignment_ref) } catch (error) {
        if (error?.code?.startsWith("CT_")) throw error
        fail("CT_STOP_PROOF_INVALID", "Root binding could not be read", error)
      }
      if (binding?.assignment_ref !== assignment_ref) fail("CT_STOP_PROOF_FOREIGN", "Root binding answers for another assignment")
      let value
      try { value = resolveTerminationProof(termination_proof_ref) } catch (error) { fail("CT_STOP_PROOF_REQUIRED", "Canonical termination proof could not be resolved", error) }
      // An unresolved, deferred or ambiguous observation is not proof that anything stopped.
      if (!value || typeof value !== "object" || typeof value.then === "function" || value.status === "AMBIGUOUS") fail("CT_STOP_PROOF_REQUIRED", "Canonical positive termination proof is required")
      let proof
      try { proof = validate("recoveryProof", value) } catch (error) { fail("CT_STOP_PROOF_INVALID", "Canonical termination proof is invalid", error) }
      if (proof.proof_id !== termination_proof_ref || proof.project_id !== binding.project_id || proof.old_assignment_ref !== assignment_ref) {
        fail("CT_STOP_PROOF_INVALID", "Termination proof provenance or ownership does not match the root binding")
      }
      // The worktree is what makes the proof ours rather than merely well-formed: an isolated backend per
      // worktree (decision 38) means a proof about another workspace stopped another host entirely.
      if (proof.workspace_path !== binding.worktree) fail("CT_STOP_PROOF_INVALID", "Termination proof stopped another workspace")
      // Decision 43. Provenance is not freshness: the same assignment and worktree can be re-bound at a new
      // epoch after a release, and S4.4 puts its successor in that same worktree. Without this, a proof about
      // the predecessor would bind to the live host and assert that the running backend had stopped.
      if (proof.host_epoch !== binding.host_epoch) fail("CT_STOP_PROOF_INVALID", "Termination proof belongs to another host epoch")
      const bound = { ...binding, disposition: proof.disposition, generation: proof.generation, termination_proof_ref }
      return Object.freeze(Object.fromEntries(PROOF_BINDING_KEYS.map((key) => [key, bound[key]])))
    },
  })
}
