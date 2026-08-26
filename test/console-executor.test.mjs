import { describe, expect, test } from "bun:test"
import { createConsoleExecutor } from "../console/executor.mjs"
import { COMMAND_VOCABULARY, VERBS } from "../console/vocabulary.mjs"
import { CONFIRMATION_TTL_MS, validateConfirmation, validateProposal } from "../console/validate.mjs"

const agent = (state, extra = {}) => ({ state, ...extra })
const context = () => ({
  registry: { alpha: {
    tower_id: "alpha", tower_digest: "digest-alpha", active: true,
    agents: {
      any: agent("COMPLETE"), planned: agent("PLANNED"), assigned: agent("ASSIGNED"),
      working: agent("WORKING", { has_worktree: true }), ready: agent("READY", { has_worktree: true }),
      delivering: agent("DELIVERING"), blocked: agent("BLOCKED"),
      pr: agent("PR_OPEN", { pr_url: "https://example.test/pr/1" }),
    },
  } },
  escalations: { answer: { tower_id: "alpha", agent: "blocked", status: "OPEN", claimed_by_console: true } },
  pendingConfirmations: {},
})

const params = {
  CV_STATUS: {}, CV_INSPECT: { agent: "any" }, CV_REQUEST_CONTEXT: { agent: "any", question: "status?" },
  CV_ASSIGN: { agent: "planned", task: "do work" }, CV_PAUSE: { agent: "assigned", reason: "hold" },
  CV_RESUME: { agent: "blocked", note: "continue" }, CV_RUN_TESTS: { agent: "working" },
  CV_GRANT_DELIVERY: { agent: "ready" }, CV_HOLD_DELIVERY: { agent: "delivering", reason: "wait" },
  CV_STOP_DELIVERY: { agent: "delivering", reason: "stop" },
  CV_ANSWER: { escalation_id: "answer", verdict: "APPROVE", note: "approved" },
  CV_MERGE_MAIN: { agent: "pr", pr_url: "https://example.test/pr/1" },
  CV_DB_PUSH: { agent: "ready", environment: "production" },
}

const proposalResult = (verb, state = context()) =>
  validateProposal({ verb, tower_id: "alpha", params: params[verb] }, state)

const confirmedResult = (verb) => {
  const proposed = proposalResult(verb)
  const issuedAt = 1_000
  const state = context()
  state.pendingConfirmations.alpha = {
    tower_id: "alpha", token: `token-${verb}`, issued_at: issuedAt,
    expires_at: issuedAt + CONFIRMATION_TTL_MS, command: proposed.confirmation.command,
  }
  return validateConfirmation(
    { tower_id: "alpha", token: `token-${verb}` },
    { ...state, now: issuedAt },
  )
}

const executableResult = (verb) =>
  COMMAND_VOCABULARY[verb].risk === "R2" ? confirmedResult(verb) : proposalResult(verb)

describe("console command executor", () => {
  test("sends every agent-directed verb exactly once to only the validated target", () => {
    const calls = []
    const executor = createConsoleExecutor({
      send: (directive) => { calls.push(directive); return { queued_for: directive.to } },
      readStatus: () => { throw new Error("agent commands must not read local status") },
    })

    for (const verb of VERBS.filter((candidate) => candidate !== "CV_STATUS")) {
      const validation = executableResult(verb)
      const before = calls.length
      const result = executor.execute(validation)
      expect(calls).toHaveLength(before + 1)
      expect(calls.at(-1)).toEqual({
        to: validation.command.target_agent,
        text: JSON.stringify(validation.command),
      })
      expect(result).toEqual({ ok: true, command: validation.command, result: { queued_for: validation.command.target_agent } })
    }
    expect(calls).toHaveLength(12)
  })

  test("executes CV_STATUS as the sole Tower-wide local read", () => {
    const status = Object.freeze({ active: false, agents: [], locks: [] })
    let reads = 0
    const executor = createConsoleExecutor({
      send: () => { throw new Error("CV_STATUS must not send") },
      readStatus: () => { reads++; return status },
    })
    const validation = proposalResult("CV_STATUS")

    expect(executor.execute(validation)).toEqual({ ok: true, command: validation.command, result: status })
    expect(reads).toBe(1)
    expect(validation.command).not.toHaveProperty("target_agent")
  })

  test("does not execute validation refusals or unconfirmed R2 proposals", () => {
    let effects = 0
    const executor = createConsoleExecutor({ send: () => effects++, readStatus: () => effects++ })
    const unknown = validateProposal({ verb: "CV_UNKNOWN", tower_id: "alpha", params: {} }, context())
    const unconfirmed = proposalResult("CV_MERGE_MAIN")

    expect(executor.execute(unknown)).toBe(unknown)
    expect(executor.execute(unconfirmed)).toBe(unconfirmed)
    expect(effects).toBe(0)
  })

  test("fails before effects when a successful command has no validated destination", () => {
    let effects = 0
    const executor = createConsoleExecutor({ send: () => effects++, readStatus: () => effects++ })
    const command = Object.freeze({ verb: "CV_ASSIGN", tower_id: "alpha", tower_digest: "digest-alpha", params: {} })
    const malformedSuccess = Object.freeze({ ok: true, command })

    expect(() => executor.execute(malformedSuccess)).toThrow("Validated target agent is required")
    expect(effects).toBe(0)
  })
})
