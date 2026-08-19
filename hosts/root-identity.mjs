const SESSION_KEYS = Object.freeze(["agent", "id", "parentID"])
const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")

// The primary root agent. Allowlisted children may execute under it, but no child ever occupies this binding.
export const ROOT_AGENT = "gentle-orchestrator"

// Canonical OpenCode session grammar. Reports shape only: it grants no authority on its own, and a child
// session satisfies exactly the same grammar as a root, which is why the brand below exists.
export const canonicalRootSessionId = (value) => typeof value === "string" && /^ses_[A-Za-z0-9]{26}$/.test(value)

// Unforgeable origin. A caller cannot construct or clone this brand, so only a session that actually passed
// the parentless proof below can be presented as a root.
class ProvenRootIdentity {
  #origin = true
  constructor(value) { Object.assign(this, value) }
  static owns(value) { return value !== null && typeof value === "object" && #origin in value }
}

export const assertRootIdentity = (value) => {
  if (!ProvenRootIdentity.owns(value) || !Object.isFrozen(value)) fail("CT_ROOT_IDENTITY_INVALID", "Root identity lacks exact primary-root origin")
  if (value.agent !== ROOT_AGENT || !canonicalRootSessionId(value.root_session_id)) fail("CT_ROOT_IDENTITY_INVALID", "Root identity is not a canonical primary root")
  return value
}

// A root is proven, never inferred: `parentID` must be present and explicitly null, because an absent
// field cannot distinguish "has no parent" from "the parent was not reported".
export const parseRootIdentity = (session) => {
  if (!exact(session, SESSION_KEYS) || !Object.hasOwn(session, "parentID") || session.parentID !== null) fail("CT_ROOT_IDENTITY_INVALID", "Session is not a proven parentless root")
  if (session.agent !== ROOT_AGENT || !canonicalRootSessionId(session.id)) fail("CT_ROOT_IDENTITY_INVALID", "Session is not a canonical primary root identity")
  const identity = new ProvenRootIdentity({ agent: ROOT_AGENT, root_session_id: session.id })
  Object.setPrototypeOf(identity, Object.prototype)
  return Object.freeze(identity)
}
