const TERMINAL_STATES = new Set(["REJECTED", "EXPIRED", "REVOKED", "COMPLETED"])
const TRANSITIONS = new Map([
  ["DRAFT", new Set(["PENDING_AUTHORIZATION"])],
  ["PENDING_AUTHORIZATION", new Set(["ACTIVE", "REJECTED", "EXPIRED"])],
  ["ACTIVE", new Set(["PAUSED", "BLOCKED", "EXPIRED", "REVOKED", "COMPLETED"])],
  ["PAUSED", new Set(["ACTIVE", "EXPIRED", "REVOKED"])],
  ["BLOCKED", new Set(["ACTIVE", "EXPIRED", "REVOKED"])],
])

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const expired = (jornada, increment = false) => ({ ...jornada, state: "EXPIRED", jornada_revision: jornada.jornada_revision + (increment ? 1 : 0) })

export const resolveJornadaLifecycle = (jornada, { state, now = Date.now() } = {}) => {
  if (TERMINAL_STATES.has(jornada.state)) {
    if (state !== undefined) fail("CT_JORNADA_TERMINAL", "Jornada is terminal")
    return jornada
  }
  const expiresAt = Date.parse(jornada.expires_at)
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return expired(jornada, state !== undefined)
  if (state === undefined) return jornada
  if (!TRANSITIONS.get(jornada.state)?.has(state)) fail("CT_JORNADA_TRANSITION", "Jornada transition is not permitted")
  return { ...jornada, state, jornada_revision: jornada.jornada_revision + 1 }
}
