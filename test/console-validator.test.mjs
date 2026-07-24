import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { COMMAND_VOCABULARY, VERBS } from "../console/vocabulary.mjs"
import { validateConfirmation, validateProposal } from "../console/validate.mjs"

const agent = (state, extra = {}) => ({ state, ...extra })
const baseContext = () => ({
  registry: {
    alpha: {
      tower_id: "alpha",
      tower_digest: "digest-alpha",
      active: true,
      agents: {
        any: agent("COMPLETE"), planned: agent("PLANNED"), assigned: agent("ASSIGNED"),
        working: agent("WORKING", { has_worktree: true }), ready: agent("READY", { has_worktree: true }),
        delivering: agent("DELIVERING"), blocked: agent("BLOCKED"), pr: agent("PR_OPEN", { pr_url: "https://example.test/pr/1" }),
      },
    },
    beta: { tower_id: "beta", tower_digest: "digest-beta", active: true, agents: { ready: agent("READY", { has_worktree: true }) } },
  },
  escalations: {
    "opaque:id": { tower_id: "alpha", agent: "blocked", status: "OPEN", claimed_by_console: true },
  },
  pendingConfirmations: {},
})

const proposals = {
  CV_STATUS: {}, CV_INSPECT: { agent: "any" },
  CV_REQUEST_CONTEXT: { agent: "any", question: "status?" },
  CV_ASSIGN: { agent: "planned", task: "do work" }, CV_PAUSE: { agent: "assigned", reason: "hold" },
  CV_RESUME: { agent: "blocked", note: "continue" }, CV_RUN_TESTS: { agent: "working" },
  CV_GRANT_DELIVERY: { agent: "ready" }, CV_HOLD_DELIVERY: { agent: "delivering", reason: "wait" },
  CV_STOP_DELIVERY: { agent: "delivering", reason: "stop" },
  CV_ANSWER: { escalation_id: "opaque:id", verdict: "APPROVE", note: "ok" },
  CV_MERGE_MAIN: { agent: "pr", pr_url: "https://example.test/pr/1" },
  CV_DB_PUSH: { agent: "ready", environment: "production" },
}
const submit = (verb, context = baseContext(), params = proposals[verb]) =>
  validateProposal({ verb, tower_id: "alpha", params }, context)

const boundMerge = {
  verb: "CV_MERGE_MAIN", tower_id: "alpha", tower_digest: "digest-alpha",
  params: proposals.CV_MERGE_MAIN,
}
const pending = (overrides = {}) => ({
  tower_id: "alpha", token: "OK-7F3A", issued_at: 1_000, expires_at: 601_000,
  command: boundMerge, ...overrides,
})

describe("closed vocabulary", () => {
  test("contains exactly the thirteen designed verbs with canonical state subsets", () => {
    expect(VERBS).toEqual(Object.keys(proposals))
    expect(VERBS).toHaveLength(13)
    expect(VERBS).not.toContain("CV_FORCE_UNLOCK")
    for (const entry of Object.values(COMMAND_VOCABULARY)) {
      expect(["R0", "R1", "R2"]).toContain(entry.risk)
      expect(Object.isFrozen(entry)).toBe(true)
      expect(Object.isFrozen(entry.required)).toBe(true)
      expect(Object.isFrozen(entry.legalStates)).toBe(true)
    }
  })

  test("is deeply immutable", () => {
    expect(Object.isFrozen(COMMAND_VOCABULARY)).toBe(true)
    expect(() => COMMAND_VOCABULARY.CV_STATUS.required.push("x")).toThrow()
    expect(() => { COMMAND_VOCABULARY.CV_STATUS.risk = "R2" }).toThrow()
  })
})

describe("proposal validation", () => {
  test("validates every verb and injects only the trusted tower digest", () => {
    for (const verb of VERBS) {
      const result = submit(verb)
      if (COMMAND_VOCABULARY[verb].risk === "R2") {
        expect(result.code).toBe("CV_CONFIRMATION_REQUIRED")
        expect(result.confirmation.command.tower_digest).toBe("digest-alpha")
      } else {
        expect(result).toEqual({ ok: true, command: {
          verb, tower_id: "alpha", tower_digest: "digest-alpha", params: proposals[verb],
        } })
      }
    }
  })

  test("detaches and freezes validated R1 and R2 commands from model proposals", () => {
    for (const [verb, params] of [
      ["CV_ASSIGN", { ...proposals.CV_ASSIGN }],
      ["CV_MERGE_MAIN", { ...proposals.CV_MERGE_MAIN }],
    ]) {
      const proposal = { verb, tower_id: "alpha", params }
      const result = validateProposal(proposal, baseContext())
      const command = result.command ?? result.confirmation.command
      params.agent = "mutated"; params.injected = true
      expect(command.params.agent).toBe(proposals[verb].agent)
      expect(command.params).not.toHaveProperty("injected")
      expect(Object.isFrozen(command)).toBe(true)
      expect(Object.isFrozen(command.params)).toBe(true)
      expect(() => { command.params.agent = "changed" }).toThrow()
    }
  })

  test("fails closed on unknown verbs, malformed envelopes, and parameter errors", () => {
    expect(submit("CV_FORCE_UNLOCK", baseContext(), {})).toMatchObject({ ok: false, code: "CV_UNKNOWN_VERB" })
    expect(submit("toString", baseContext(), {})).toMatchObject({ ok: false, code: "CV_UNKNOWN_VERB" })
    expect(validateProposal([{ verb: "CV_STATUS", tower_id: "alpha", params: {} }], baseContext())).toMatchObject({ code: "CV_MALFORMED" })
    expect(validateProposal({ verb: "CV_STATUS", tower_id: "alpha", params: {}, confidence: 1 }, baseContext())).toMatchObject({ code: "CV_MALFORMED" })
    expect(validateProposal({ verb: "CV_STATUS", tower_id: "alpha", tower_digest: "forged", params: {} }, baseContext())).toMatchObject({ code: "CV_MALFORMED" })
    expect(submit("CV_ASSIGN", baseContext(), { agent: "planned" })).toMatchObject({ code: "CV_MISSING_PARAM" })
    expect(submit("CV_ASSIGN", baseContext(), { agent: "planned", task: 4 })).toMatchObject({ code: "CV_MALFORMED" })
    expect(submit("CV_ASSIGN", baseContext(), { agent: "planned", task: "x", extra: true })).toMatchObject({ code: "CV_MALFORMED" })
    expect(submit("CV_ASSIGN", baseContext(), { agent: "planned", task: "" })).toMatchObject({ code: "CV_MALFORMED" })
    expect(submit("CV_ANSWER", baseContext(), { escalation_id: "opaque:id", verdict: "YES" })).toMatchObject({ code: "CV_MALFORMED" })
    expect(submit("CV_MERGE_MAIN", baseContext(), { ...proposals.CV_MERGE_MAIN, confirm_token: "forged" })).toMatchObject({ code: "CV_MALFORMED" })
  })

  test("enforces missing, extra, and wrong-type parameters across all verbs", () => {
    for (const verb of VERBS) {
      const spec = COMMAND_VOCABULARY[verb]
      const required = Object.keys(spec.required)[0]
      if (required) {
        const { [required]: omitted, ...missing } = proposals[verb]
        expect(submit(verb, baseContext(), missing).code).toBe("CV_MISSING_PARAM")
        expect(submit(verb, baseContext(), { ...proposals[verb], [required]: 42 }).code).toBe("CV_MALFORMED")
      } else {
        expect(validateProposal({ verb, tower_id: "alpha", params: [] }, baseContext()).code).toBe("CV_MALFORMED")
      }
      expect(submit(verb, baseContext(), { ...proposals[verb], extra: true }).code).toBe("CV_MALFORMED")
    }
  })

  test("requires exact injected tower and agent addressing", () => {
    expect(validateProposal({ verb: "CV_STATUS", tower_id: "missing", params: {} }, baseContext())).toMatchObject({ code: "CV_UNKNOWN_TOWER" })
    expect(validateProposal({ verb: "CV_STATUS", tower_id: "toString", params: {} }, baseContext())).toMatchObject({ code: "CV_UNKNOWN_TOWER" })
    const mismatch = baseContext(); mismatch.registry.alpha.tower_id = "beta"
    expect(submit("CV_STATUS", mismatch)).toMatchObject({ code: "CV_TOWER_MISMATCH" })
    expect(submit("CV_INSPECT", baseContext(), { agent: "Any" })).toMatchObject({ code: "CV_UNKNOWN_AGENT" })
    expect(submit("CV_INSPECT", baseContext(), { agent: "toString" })).toMatchObject({ code: "CV_UNKNOWN_AGENT" })
  })

  test("rejects inactive towers and illegal agent states deterministically", () => {
    const inactive = baseContext(); inactive.registry.alpha.active = false
    expect(submit("CV_STATUS", inactive)).toMatchObject({ ok: true })
    expect(submit("CV_INSPECT", inactive)).toMatchObject({ ok: true })
    expect(submit("CV_REQUEST_CONTEXT", inactive)).toMatchObject({ code: "CV_TOWER_INACTIVE" })
    expect(submit("CV_ASSIGN", inactive)).toMatchObject({ code: "CV_TOWER_INACTIVE" })
    expect(submit("CV_PAUSE", baseContext(), { agent: "delivering", reason: "pause" })).toMatchObject({
      code: "CV_ILLEGAL_STATE", currentState: "DELIVERING",
    })
  })

  test("binds CV_ANSWER only through an injected opaque escalation record", () => {
    expect(submit("CV_ANSWER")).toMatchObject({ ok: true, command: { params: { escalation_id: "opaque:id" } } })
    const crossTower = baseContext(); crossTower.escalations["opaque:id"].tower_id = "beta"
    expect(submit("CV_ANSWER", crossTower)).toMatchObject({ code: "CV_TOWER_MISMATCH" })
    expect(submit("CV_ANSWER", baseContext(), { escalation_id: "alpha:invented", verdict: "APPROVE" })).toMatchObject({ code: "CV_MALFORMED" })
  })

  test("checks fixed worktree and PR bindings without executing them", () => {
    const noWorktree = baseContext(); noWorktree.registry.alpha.agents.working.has_worktree = false
    expect(submit("CV_RUN_TESTS", noWorktree)).toMatchObject({ code: "CV_MALFORMED" })
    expect(submit("CV_MERGE_MAIN", baseContext(), { agent: "pr", pr_url: "https://wrong.test/pr/2" })).toMatchObject({ code: "CV_MALFORMED" })
  })

  test("reports R2 requirements and enforces injected single-flight state", () => {
    expect(submit("CV_MERGE_MAIN")).toMatchObject({
      code: "CV_CONFIRMATION_REQUIRED", confirmation: { tokenLifetimeMs: 600_000, command: boundMerge },
    })
    const context = baseContext(); context.pendingConfirmations.alpha = pending()
    expect(submit("CV_DB_PUSH", context)).toMatchObject({ code: "CV_CONFIRMATION_PENDING", pendingVerb: "CV_MERGE_MAIN" })
    expect(validateProposal({ verb: "CV_DB_PUSH", tower_id: "beta", params: proposals.CV_DB_PUSH }, context)).toMatchObject({ code: "CV_CONFIRMATION_REQUIRED" })
    expect(submit("CV_DB_PUSH", context, proposals.CV_DB_PUSH)).not.toHaveProperty("command")
  })
})

describe("pure confirmation validation", () => {
  const contextWith = (record = pending()) => {
    const context = baseContext(); context.pendingConfirmations.alpha = record; return context
  }

  test("accepts one exact current token and returns consumed pure state without mutation", () => {
    const context = contextWith(); const before = structuredClone(context); let executed = 0
    context.execute = () => executed++
    const result = validateConfirmation({ tower_id: "alpha", token: "OK-7F3A" }, { ...context, now: 600_999 })
    expect(result).toEqual({ ok: true, command: boundMerge, pendingConfirmations: {} })
    expect(context.pendingConfirmations).toEqual(before.pendingConfirmations)
    expect(executed).toBe(0)
  })

  test("detaches and freezes the confirmed command from injected pending metadata", () => {
    const issued = pending({ command: { ...boundMerge, params: { ...boundMerge.params } } })
    const result = validateConfirmation({ tower_id: "alpha", token: "OK-7F3A" }, { ...contextWith(issued), now: 1_000 })
    issued.command.params.agent = "mutated"; issued.command.injected = true
    expect(result.command).toEqual(boundMerge)
    expect(result.command).not.toHaveProperty("injected")
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.command.params)).toBe(true)
  })

  test("enforces inclusive issuance and exclusive expiry bounds", () => {
    expect(validateConfirmation({ tower_id: "alpha", token: "OK-7F3A" }, { ...contextWith(), now: 999 })).toMatchObject({ code: "CV_MALFORMED" })
    expect(validateConfirmation({ tower_id: "alpha", token: "OK-7F3A" }, { ...contextWith(), now: 1_000 })).toMatchObject({ ok: true })
    expect(validateConfirmation({ tower_id: "alpha", token: "OK-7F3A" }, { ...contextWith(), now: 601_000 })).toMatchObject({ code: "CV_TOKEN_EXPIRED" })
  })

  test("rejects wrong, expired, cross-tower, replayed, and malformed confirmations", () => {
    expect(validateConfirmation({ tower_id: "alpha", token: "ok-7f3a" }, { ...contextWith(), now: 2_000 })).toMatchObject({ code: "CV_CONFIRMATION_REQUIRED" })
    expect(validateConfirmation({ tower_id: "alpha", token: "OK-7F3A" }, { ...contextWith(), now: 601_000 })).toMatchObject({ code: "CV_TOKEN_EXPIRED" })
    expect(validateConfirmation({ tower_id: "beta", token: "OK-7F3A" }, { ...contextWith(), now: 2_000 })).toMatchObject({ code: "CV_TOWER_MISMATCH" })
    expect(validateConfirmation({ tower_id: "alpha", token: "OK-7F3A" }, { ...baseContext(), now: 2_000 })).toMatchObject({ code: "CV_CONFIRMATION_REQUIRED" })
    expect(validateConfirmation({ tower_id: "alpha", token: "OK-7F3A", confidence: 1 }, { ...contextWith(), now: 2_000 })).toMatchObject({ code: "CV_MALFORMED" })
  })
})

test("new modules have no execution or ambient dependency boundary", () => {
  for (const path of ["console/vocabulary.mjs", "console/validate.mjs"]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
    expect(source).not.toMatch(/node:(?:fs|child_process|sqlite|net|http|https|os)|process\.|Bun\.|Date\.|Math\.random|exec|spawn/)
  }
})
