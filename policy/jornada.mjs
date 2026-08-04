import { validate } from "../contracts/validate.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const expired = (value, now) => typeof value !== "string" || !Number.isFinite(Date.parse(value)) || Date.parse(value) <= now
const frozen = (value) => Object.freeze(value)
const executionHosts = new Set(["pi", "opencode", "claude"])
const sameJornada = (jornada, report) => typeof jornada?.jornada_id === "string" && jornada.jornada_id.length > 0
  && Number.isSafeInteger(jornada.jornada_revision) && jornada.jornada_revision > 0
  && report?.jornada_id === jornada.jornada_id && report?.jornada_revision === jornada.jornada_revision
const canonicalAuthorization = (authorization) => {
  try { return validate("authorization", authorization) } catch { return null }
}
const pendingMergeAuthorization = (authorization, jornada) => {
  authorization = canonicalAuthorization(authorization)
  return authorization?.schema === "authorization"
  && authorization.schema_version === 1 && authorization.state === "PENDING" && authorization.action === "MERGE"
  && authorization.project_id === jornada.project_id && authorization.jornada_id === jornada.jornada_id
  && authorization.jornada_revision === jornada.jornada_revision
}

// Policy determines whether the supplied scope is eligible. It deliberately has
// no assignment or dispatch dependency; Main retains both authorities.
export const resolveEligibility = ({ caller_role, jornada, proposal, report, policy, worker_claim, horizon, action, execution_host, host_capable = true, now = Date.now() } = {}) => {
  if (caller_role !== "MAIN") fail("CT_ROLE_FORBIDDEN", "Only Main may resolve eligibility")
  if (!policy?.resolved) fail("CT_POLICY_UNRESOLVED", "Delivery policy is unresolved")
  if (jornada?.state !== "ACTIVE" || expired(jornada.expires_at, now)) fail("CT_REPORT_STALE", "Jornada is inactive or expired")
  if (expired(report?.expires_at, now)) fail("CT_REPORT_STALE", "Policy report is stale")
  if (proposal?.state !== "EXECUTABLE") fail("CT_NO_EXECUTABLE_SCOPE", "Support proposal has no executable scope")
  if (proposal.project_id !== jornada.project_id || report?.project_id !== jornada.project_id || !sameJornada(jornada, report)) fail("CT_REPORT_STALE", "Policy artifacts are not bound to the current Jornada")
  if (proposal.worker_claim !== worker_claim) fail("CT_CLAIM_MISMATCH", "Worker claim does not match the proposal")
  if (report?.decision !== "ALLOW") fail("CT_POLICY_DENIED", "Policy report denied the scope")
  if (!host_capable || !executionHosts.has(jornada.execution_host) || !executionHosts.has(execution_host) || execution_host !== jornada.execution_host) fail("CT_HOST_CAPABILITY_MISSING", "Host cannot execute the approved capability")
  const ceiling = policy.planning?.horizon_ceiling
  if (!Number.isSafeInteger(ceiling) || ceiling < 1) fail("CT_POLICY_UNRESOLVED", "Policy horizon is unresolved")
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > ceiling) fail("CT_HORIZON_EXCEEDED", "Planning horizon exceeds the policy ceiling")
  if (action?.irreversible && !pendingMergeAuthorization(action.authorization, jornada)) fail("CT_POLICY_DENIED", "Irreversible action requires a bound pending authorization")
  return frozen({ eligible: true, project_id: jornada.project_id, proposal_id: proposal.proposal_id, horizon })
}
