import { COMMAND_VOCABULARY } from "./vocabulary.mjs"

export const CONFIRMATION_TTL_MS = 600_000

const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
const exactKeys = (value, keys) => {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}
const own = (value, key) => record(value) && Object.hasOwn(value, key) ? value[key] : undefined
const deepFreeze = (value) => {
  if (record(value) && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}
const refusal = (code, details = {}) => ({ ok: false, code, ...details })
const validValue = (value, schema) => {
  if (Array.isArray(schema)) return schema.includes(value)
  if (schema === "non-empty-string") return typeof value === "string" && value.length > 0
  return typeof value === schema
}

const validateParams = (params, spec) => {
  if (!record(params)) return refusal("CV_MALFORMED")
  for (const name of Object.keys(spec.required)) {
    if (!Object.hasOwn(params, name)) return refusal("CV_MISSING_PARAM", { param: name })
  }
  const allowed = [...Object.keys(spec.required), ...Object.keys(spec.optional)]
  if (Object.keys(params).some((name) => !allowed.includes(name))) return refusal("CV_MALFORMED")
  for (const [name, value] of Object.entries(params)) {
    if (!validValue(value, spec.required[name] ?? spec.optional[name])) return refusal("CV_MALFORMED", { param: name })
  }
  return null
}

const validatedCommand = (proposal, tower, spec, targetAgent) => deepFreeze({
  verb: proposal.verb,
  tower_id: proposal.tower_id,
  tower_digest: tower.tower_digest,
  params: Object.fromEntries(
    [...Object.keys(spec.required), ...Object.keys(spec.optional)]
      .filter((name) => Object.hasOwn(proposal.params, name))
      .map((name) => [name, proposal.params[name]]),
  ),
  ...(targetAgent === undefined ? {} : { target_agent: targetAgent }),
})

const snapshotCommand = (command) => {
  if (!record(command) || !exactKeys(command, ["verb", "tower_id", "tower_digest", "params", "target_agent"]) ||
      !Object.hasOwn(COMMAND_VOCABULARY, command.verb) || typeof command.tower_id !== "string" ||
      typeof command.tower_digest !== "string" || typeof command.target_agent !== "string") return null
  const spec = COMMAND_VOCABULARY[command.verb]
  if (spec.risk !== "R2" || validateParams(command.params, spec) || command.target_agent !== command.params.agent) return null
  return validatedCommand(command, command, spec, command.target_agent)
}

const snapshotPending = (pending) => {
  if (!record(pending) || !exactKeys(pending, ["tower_id", "token", "issued_at", "expires_at", "command"]) ||
      typeof pending.tower_id !== "string" || typeof pending.token !== "string") return null
  const command = snapshotCommand(pending.command)
  if (!command) return null
  return deepFreeze({ tower_id: pending.tower_id, token: pending.token,
    issued_at: pending.issued_at, expires_at: pending.expires_at, command })
}

export const validateProposal = (proposal, context) => {
  if (!record(proposal) || !exactKeys(proposal, ["verb", "tower_id", "params"])) return refusal("CV_MALFORMED")
  if (typeof proposal.verb !== "string" || !Object.hasOwn(COMMAND_VOCABULARY, proposal.verb)) return refusal("CV_UNKNOWN_VERB")
  if (typeof proposal.tower_id !== "string") return refusal("CV_MALFORMED")
  const spec = COMMAND_VOCABULARY[proposal.verb]
  const invalidParams = validateParams(proposal.params, spec)
  if (invalidParams) return invalidParams

  const tower = own(context?.registry, proposal.tower_id)
  if (!tower) return refusal("CV_UNKNOWN_TOWER")
  if (tower.tower_id !== proposal.tower_id) return refusal("CV_TOWER_MISMATCH")
  if (typeof tower.tower_digest !== "string") return refusal("CV_MALFORMED")
  if (!["CV_STATUS", "CV_INSPECT"].includes(proposal.verb) && tower.active !== true) return refusal("CV_TOWER_INACTIVE")

  let agentName = proposal.params.agent
  if (proposal.verb === "CV_ANSWER") {
    const escalation = own(context?.escalations, proposal.params.escalation_id)
    if (!record(escalation) || escalation.status !== "OPEN" || escalation.claimed_by_console !== true) return refusal("CV_MALFORMED")
    if (escalation.tower_id !== proposal.tower_id) return refusal("CV_TOWER_MISMATCH")
    agentName = escalation.agent
  }

  let targetAgent
  if (spec.legalStates.length > 0) {
    targetAgent = own(tower.agents, agentName)
    if (!targetAgent) return refusal("CV_UNKNOWN_AGENT", { agents: Object.keys(tower.agents ?? {}) })
    if (!spec.legalStates.includes(targetAgent.state)) {
      return refusal("CV_ILLEGAL_STATE", { currentState: targetAgent.state, legalStates: spec.legalStates })
    }
  }
  if (proposal.verb === "CV_RUN_TESTS" && targetAgent.has_worktree !== true) return refusal("CV_MALFORMED")
  if (proposal.verb === "CV_MERGE_MAIN" && targetAgent.pr_url !== proposal.params.pr_url) return refusal("CV_MALFORMED")

  const command = validatedCommand(proposal, tower, spec, agentName)
  if (spec.risk !== "R2") return deepFreeze({ ok: true, command })
  const pending = own(context?.pendingConfirmations, proposal.tower_id)
  if (pending) return refusal("CV_CONFIRMATION_PENDING", { pendingVerb: pending.command?.verb })
  return deepFreeze(refusal("CV_CONFIRMATION_REQUIRED", {
    confirmation: {
      command,
      evidenceRequirements: spec.evidence,
      tokenLifetimeMs: CONFIRMATION_TTL_MS,
    },
  }))
}

export const validateConfirmation = (event, context) => {
  if (!record(event) || !exactKeys(event, ["tower_id", "token"]) ||
      typeof event.tower_id !== "string" || typeof event.token !== "string") return refusal("CV_MALFORMED")
  const pending = record(context?.pendingConfirmations) ? context.pendingConfirmations : {}
  const matchElsewhere = Object.values(pending).some((item) => item?.token === event.token && item?.tower_id !== event.tower_id)
  const rawIssued = own(pending, event.tower_id)
  if (matchElsewhere) return refusal("CV_TOWER_MISMATCH")
  if (!record(rawIssued) || rawIssued.token !== event.token) return refusal("CV_CONFIRMATION_REQUIRED")
  if (rawIssued.tower_id !== event.tower_id || rawIssued.command?.tower_id !== event.tower_id) return refusal("CV_TOWER_MISMATCH")
  const issued = snapshotPending(rawIssued)
  if (!issued || !Number.isFinite(context?.now) || !Number.isFinite(issued.issued_at) ||
      !Number.isFinite(issued.expires_at) || issued.expires_at - issued.issued_at !== CONFIRMATION_TTL_MS ||
      context.now < issued.issued_at) return refusal("CV_MALFORMED")
  if (context.now >= issued.expires_at) return refusal("CV_TOKEN_EXPIRED")
  const remaining = {}
  for (const [towerId, item] of Object.entries(pending)) {
    if (towerId === event.tower_id) continue
    const copy = snapshotPending(item)
    if (!copy) return refusal("CV_MALFORMED")
    remaining[towerId] = copy
  }
  return deepFreeze({ ok: true, command: issued.command, pendingConfirmations: remaining })
}
