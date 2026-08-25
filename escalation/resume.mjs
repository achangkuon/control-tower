import { assertParkedDecisionResponseBinding } from "../contracts/parked-decision.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
const nonempty = (value) => typeof value === "string" && value.length > 0

export const createResumeFacade = ({ readParking, readParkedCheckpointBinding, readAuthorization } = {}) => {
  if (![readParking, readParkedCheckpointBinding, readAuthorization].every((port) => typeof port === "function")) {
    fail("CT_RESUME_PORT_INVALID", "Main store parking, binding, and authorization read interfaces are required")
  }
  return Object.freeze({
    resume(input) {
      if (!exactKeys(input, ["parked_decision_id", "authorization_id", "current_context"])
          || !nonempty(input.parked_decision_id) || !nonempty(input.authorization_id)
          || !exactKeys(input.current_context, ["project_id", "assignment_id", "repository", "generation", "base_sha", "candidate_revision"])) {
        fail("CT_RESUME_INPUT_INVALID", "Exact parked decision, authorization, and current worktree context are required")
      }
      const { parked_decision_id, authorization_id } = input, current = input.current_context
      const parking = readParking(parked_decision_id), binding = readParkedCheckpointBinding(parked_decision_id)
      const authorization = readAuthorization(authorization_id), parked = parking?.parked_decision
      const predecessor = authorization?.revision_history?.at(-1), audit = authorization?.terminal_audit
      let response
      try { response = assertParkedDecisionResponseBinding(audit?.parked_decision_response, parked) }
      catch { fail("CT_RESUME_EVIDENCE_INVALID", "Terminal response does not bind the frozen parked decision") }
      const created = Date.parse(authorization.created_at), expires = Date.parse(authorization.expires_at), responded = Date.parse(response.responded_at)
      const terminalMatches = authorization.authorization_id === authorization_id && authorization.project_id === current.project_id
        && authorization.state === "APPROVED" && authorization.revision === predecessor?.revision + 1
        && predecessor?.authorization_id === authorization_id && predecessor.project_id === current.project_id
        && predecessor.state === "PENDING" && audit?.kind === "authorization-terminal"
        && audit.authorization_id === authorization_id && audit.authorization_revision === predecessor.revision
        && audit.decision === "APPROVED" && audit.project_id === current.project_id
        && response.authorization_id === authorization_id && response.authorization_revision === predecessor.revision
        && authorization.extensions?.["control-tower/candidate-revision"] === current.candidate_revision
        && predecessor.extensions?.["control-tower/candidate-revision"] === current.candidate_revision
        && Number.isFinite(created) && Number.isFinite(expires) && Number.isFinite(responded)
        && created < expires && expires <= created + 3_600_000 && responded >= created && responded < expires
      const frozenMatches = parking?.actor === "MAIN" && parking.project_id === current.project_id
        && parked?.parked_decision_id === parked_decision_id && binding?.parked_decision_id === parked_decision_id
        && parked.parked_decision_digest === binding.parked_decision_digest
        && parked.frozen_scope.session_plan_snapshot_digest === response.session_plan_snapshot_digest
        && parked.checkpoint === binding.parked_checkpoint && binding.reconciliation_state === "VALID"
      const contextMatches = binding?.project_id === current.project_id && binding.assignment_id === current.assignment_id
        && binding.repository === current.repository && binding.generation === current.generation
      if (!terminalMatches || !frozenMatches || !contextMatches) fail("CT_RESUME_EVIDENCE_INVALID", "Resume evidence differs from the authoritative terminal parked context")
      if (binding.base_sha !== current.base_sha) return Object.freeze({ state: "RECONCILIATION_REQUIRED", parked_decision_id,
        expected_base_sha: binding.base_sha, actual_base_sha: current.base_sha })
      return Object.freeze({ state: "RESUME", checkpoint: binding.parked_checkpoint, repository: binding.repository,
        assignment_id: binding.assignment_id, generation: binding.generation, result_sha: binding.result_sha, option_id: response.option_id })
    },
  })
}
