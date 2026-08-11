import { candidateRevision, freezeCandidate } from "../contracts/candidate-revision.mjs"
import { readDeliveryPolicy } from "../policy/delivery-policy.mjs"
import { deliverWithReconciliation } from "./reconciliation.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const digest = (value) => typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value)
const authorizationMatches = ({ candidate, authorization, authorizationId, shape }) => authorization?.authorization_id === authorizationId
  && authorization.project_id === candidate.project_id
  && authorization.plan_id === candidate.plan_id && authorization.registry_revision === candidate.registry_revision
  && authorization.jornada_id === candidate.jornada_id && authorization.jornada_revision === candidate.jornada_revision
  && digest(candidate.policy_report_digest) && authorization.policy_report_digest === candidate.policy_report_digest
  && authorization.required_checks_digest === candidate.required_checks_digest && authorization.delivery?.shape === shape
  && authorization.delivery.repository === candidate.target.repository && authorization.delivery.target_branch === candidate.target.branch
  && authorization.delivery.base_sha === candidate.base_sha && authorization.delivery.head_sha === candidate.head_sha

export const executeDelivery = async ({ candidate_input, policy_request, authorization_store, authorization_id, ledger, commit, verify, reconcile, effects } = {}) => {
  if (typeof commit !== "function" || typeof verify !== "function" || typeof reconcile !== "function"
    || typeof ledger?.append !== "function" || typeof ledger?.history !== "function" || typeof ledger?.withCandidateLock !== "function"
    || typeof authorization_store?.readAuthorization !== "function" || typeof authorization_store?.admitCandidateEffect !== "function"
    || typeof authorization_id !== "string") fail("CT_DELIVERY_INVALID", "Delivery workflow dependencies are required")
  const policy = readDeliveryPolicy(policy_request), shape = policy.delivery.shape
  if (!digest(candidate_input?.policy_report_digest) || candidate_input?.policy_revision !== policy_request?.revision) fail("CT_DELIVERY_AUTH_MISMATCH", "Candidate policy binding does not match")
  if (candidate_input?.target?.branch !== policy.delivery.target_branch) fail("CT_DELIVERY_TARGET_MISMATCH", "Candidate target does not match delivery policy")
  const effect = shape === "direct-push" ? effects?.directPush : effects?.pullRequest
  if (typeof effect !== "function") fail("CT_DELIVERY_INVALID", "Declared delivery adapter is unavailable")
  const identity = candidateRevision(candidate_input)

  return ledger.withCandidateLock(identity, async () => {
    const existing = await ledger.history(identity)
    const committed = existing.length === 0 ? await commit() : { commit_sha: candidate_input.commit_sha, tree_sha: candidate_input.tree_sha }
    if (committed?.commit_sha !== candidate_input.commit_sha || committed.commit_sha !== candidate_input.head_sha
      || committed?.tree_sha !== candidate_input.tree_sha) fail("CT_DELIVERY_CANDIDATE_MISMATCH", "Commit and tree do not match the candidate input")
    if (await verify(Object.freeze({ commit_sha: committed.commit_sha, tree_sha: committed.tree_sha })) !== true) fail("CT_DELIVERY_VERIFICATION_FAILED", "Commit and tree verification failed")
    const candidate = freezeCandidate(candidate_input)
    const authorization = await authorization_store.readAuthorization(authorization_id)
    if (!authorizationMatches({ candidate, authorization, authorizationId: authorization_id, shape })) fail("CT_DELIVERY_AUTH_MISMATCH", "Authorization does not match the frozen delivery candidate")
    authorization_store.admitCandidateEffect({ actor: "MAIN", project_id: candidate.project_id, authorization_id, candidate_revision: candidate.candidate_revision })

    const terminal = existing.at(-1)
    if (terminal?.state === "DELIVERED") return Object.freeze({ status: "DELIVERED", candidate_revision: identity, attempts: terminal.attempt, reconciled: terminal.reconciled, tower_blocked: false, shape, policy_resolved: policy.resolved })
    if (terminal?.state === "UNRECONCILED") return Object.freeze({ status: "UNRECONCILED", code: "CT_DELIVERY_UNRECONCILED", candidate_revision: identity, candidate_frozen: true, tower_blocked: false, attempts: terminal.attempt, shape, policy_resolved: policy.resolved })
    const record = async (event) => {
      const revision = (await ledger.history(identity)).length
      return ledger.append({ ...event, shape, authorization_ref: authorization_id }, revision)
    }
    const outcome = await deliverWithReconciliation({ candidate_revision: identity,
      reconcile: () => reconcile(Object.freeze({ candidate, shape, policy })),
      mutate: (_revision, attempt) => effect(Object.freeze({ candidate, shape, policy, attempt })), record,
      initial_attempts: existing.reduce((maximum, item) => Math.max(maximum, item.attempt), 0) })
    return Object.freeze({ ...outcome, candidate_revision: identity, shape, policy_resolved: policy.resolved })
  })
}
