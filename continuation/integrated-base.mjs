const fail = (code, message) => {
  throw Object.freeze(Object.assign(new Error(message), { code }))
}

const frozen = (value) => Object.freeze(value)
const requiredDependencies = Object.freeze(["reconcile", "support", "policy", "dispatch", "escalate"])
const nextModule = (moduleId) => {
  const match = /^(M\d+\.\d+\.)(\d+)$/u.exec(moduleId ?? "")
  return match ? `${match[1]}${Number(match[2]) + 1}` : null
}

const validateAuthorityAndEvidence = ({ caller_role, integrated_base, evidence }) => {
  if (caller_role !== "MAIN") fail("CT_ROLE_FORBIDDEN", "Only Main may continue an integrated base")
  if (typeof integrated_base?.base_id !== "string" || typeof integrated_base.digest !== "string"
    || evidence?.fresh !== true || evidence.base_id !== integrated_base.base_id || evidence.base_digest !== integrated_base.digest) {
    fail("CT_EVIDENCE_STALE", "Continuation evidence is not fresh and bound to the integrated base")
  }
}

const validatePlanning = ({ integrated_base, planning }) => {
  const expectedNext = nextModule(integrated_base.module_id)
  if (planning?.horizon !== 2 || planning.horizon_ceiling !== 2
    || planning.implement_module_id !== integrated_base.module_id
    || planning.prepare_module_id !== expectedNext || planning.prepare_through !== "TAREAS") {
    fail("CT_HORIZON_EXCEEDED", "Continuation must execute N and prepare only N+1 through Tareas")
  }
  return frozen({ module_id: planning.prepare_module_id, through: "TAREAS", horizon: 2 })
}

export const continueIntegratedBase = ({ caller_role, integrated_base, evidence, planning, successor, dependencies } = {}) => {
  validateAuthorityAndEvidence({ caller_role, integrated_base, evidence })
  const planningScope = validatePlanning({ integrated_base, planning })
  if (requiredDependencies.some((name) => typeof dependencies?.[name] !== "function")) {
    fail("CT_HOST_CAPABILITY_MISSING", "Continuation dependencies are unavailable")
  }

  const reconciliation = dependencies.reconcile({ integrated_base, successor, evidence })
  if (reconciliation?.status === "DIVERGENT") {
    const escalation = dependencies.escalate({
      status: "UNRECONCILED",
      base_id: integrated_base.base_id,
      successor_bytes: successor?.bytes,
      evidence: reconciliation.evidence,
    })
    return frozen({
      status: "UNRECONCILED",
      code: "CT_CONTINUATION_UNRECONCILED",
      base_id: integrated_base.base_id,
      successor_bytes: successor?.bytes,
      evidence: reconciliation.evidence,
      escalation_id: escalation?.escalation_id,
    })
  }
  if (reconciliation?.status !== "INTEGRATED" || reconciliation.base_id !== integrated_base.base_id) {
    fail("CT_EVIDENCE_STALE", "Reconciliation did not attest the integrated base")
  }

  const proposal = dependencies.support({ integrated_base, planning: planningScope, evidence })
  if (proposal?.state !== "EXECUTABLE") fail("CT_NO_EXECUTABLE_SCOPE", "Support produced no executable scope")
  const decision = dependencies.policy({ integrated_base, planning: planningScope, proposal, evidence })
  if (decision?.decision !== "ALLOW") fail("CT_POLICY_DENIED", "Policy denied continuation scope")
  const dispatched = dependencies.dispatch({
    module_id: planning.implement_module_id,
    base_id: integrated_base.base_id,
    base_digest: integrated_base.digest,
    proposal,
    decision,
  })
  return frozen({
    status: "DISPATCHED",
    base_id: integrated_base.base_id,
    planned_module_id: planning.prepare_module_id,
    dispatched_module_id: planning.implement_module_id,
    dispatch_id: dispatched?.dispatch_id,
  })
}
