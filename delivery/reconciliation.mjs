const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const frozen = (value) => Object.freeze(value)

export const classifyDeliveryResult = (result = {}) => {
  const message = String(result.message ?? result.stderr ?? "").toLowerCase()
  if (result.statusCode === 429 || /quota|billing|payment required/.test(message)) return frozen({ classification: "quota_exhausted", blocked: false })
  if (result.timedOut === true || Number(result.statusCode) >= 500 || /timeout|unavailable|service down/.test(message)) return frozen({ classification: "provider_unavailable", blocked: false })
  if (result.checks === "incomplete" || result.checks_pending === true) return frozen({ classification: "checks_pending", blocked: false })
  return frozen({ classification: "unknown", blocked: true })
}

export const deliverWithReconciliation = async ({ candidate_revision, reconcile, mutate, record, initial_attempts = 0 } = {}) => {
  if (!/^sha256:[a-f0-9]{64}$/.test(candidate_revision ?? "") || typeof reconcile !== "function"
    || typeof mutate !== "function" || typeof record !== "function" || !Number.isSafeInteger(initial_attempts)
    || initial_attempts < 0 || initial_attempts > 3) fail("CT_DELIVERY_INVALID", "Bounded delivery inputs are required")
  let lastClassification = "unknown"
  for (let attempt = initial_attempts + 1; attempt <= 3; attempt += 1) {
    const inspection = await reconcile(candidate_revision)
    if (inspection?.status === "delivered") {
      await record({ candidate_revision, state: "DELIVERED", attempt: attempt - 1, reconciled: true })
      return frozen({ status: "DELIVERED", candidate_revision, attempts: attempt - 1, reconciled: true, tower_blocked: false })
    }
    if (inspection?.status !== "absent") {
      await record({ candidate_revision, state: "UNRECONCILED", attempt: attempt - 1, classification: "unknown", evidence: inspection?.evidence ?? null })
      return frozen({ status: "UNRECONCILED", code: "CT_DELIVERY_UNRECONCILED", candidate_revision, candidate_frozen: true, tower_blocked: false, attempts: attempt - 1 })
    }
    const effect = await mutate(candidate_revision, attempt)
    if (effect?.delivered === true) {
      await record({ candidate_revision, state: "DELIVERED", attempt, reconciled: false })
      return frozen({ status: "DELIVERED", candidate_revision, attempts: attempt, reconciled: false, tower_blocked: false })
    }
    lastClassification = classifyDeliveryResult(effect).classification
    await record({ candidate_revision, state: "ATTEMPT_FAILED", attempt, classification: lastClassification })
  }
  return frozen({ status: "ESCALATED", candidate_revision, attempts: 3, classification: lastClassification, tower_blocked: false })
}
