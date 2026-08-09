const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exactText = (value) => typeof value === "string" && value.length > 0 && value === value.trim()
const exactOrigin = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const keys = Object.keys(value).sort()
  return keys.join("\0") === "module_id\0session_id\0task_id"
    && keys.every((key) => exactText(value[key]))
}

export const emitDecisionRequest = ({ authorizationStore, authorization, target, origin } = {}) => {
  if (!exactText(target)) fail("CT_ESCALATION_TARGET_INVALID", "Decision target must be exact")
  if (!exactOrigin(origin)) fail("CT_ESCALATION_ORIGIN_INVALID", "Decision origin must identify one exact task")
  const createdAt = Date.parse(authorization?.created_at)
  const expiresAt = Date.parse(authorization?.expires_at)
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || expiresAt <= createdAt) {
    fail("CT_ESCALATION_EXPIRY_INVALID", "Decision request expiry must follow creation")
  }
  if (!authorizationStore || typeof authorizationStore.createAuthorization !== "function") {
    fail("CT_ESCALATION_STORE_INVALID", "S5.1 authorization-store port is required")
  }
  return authorizationStore.createAuthorization({
    ...authorization,
    actor: "MAIN",
    extensions: {
      ...(authorization.extensions ?? {}),
      "control-tower/decision-target": target,
      "control-tower/decision-origin": structuredClone(origin),
    },
  })
}
