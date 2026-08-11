import { describe, expect, test } from "bun:test"

import { validate } from "../../contracts/validate.mjs"
import {
  assertParkedDecisionResponseBinding, createParkedDecision, createParkedDecisionResponse,
  parkedDecisionDigest, parkedDecisionResponseDigest,
} from "../../contracts/parked-decision.mjs"

const sha = (character) => `sha256:${character.repeat(64)}`
const input = () => ({
  schema: "parked-decision", schema_version: 1, parked_decision_id: "parked-s5-7-001",
  question: "Which canonical option should resume S5.7?",
  evidence: [{ path: "openspec/plans/plan-5/STATUS.md", line_start: 501, line_end: 556, contradiction: "Execution cannot continue without one selected option." }],
  options: [
    { option_id: "option-a", label: "Resume", consequence: "Resume only the frozen scope." },
    { option_id: "option-b", label: "Stop", consequence: "Keep the scope blocked." },
  ],
  origin: { session_id: "S5.7", module_id: "M5.7.2" }, checkpoint: "Before response persistence.",
  decision_class: "seguridad y permisos", created_at: "2026-08-11T13:00:00Z",
  frozen_scope: { session_plan_snapshot_digest: sha("a"), session_ids: ["S5.7"], area: ["contracts/parked-decision.mjs"], resources: ["canonical contract registry"] },
})
const errorCode = (operation) => { try { operation() } catch (error) { return error.code } return null }

const responseInput = (parked) => ({
  parked_decision: parked, response_id: "response-s5-7-001", authorization_id: "auth-s5-7-001",
  authorization_revision: 2, option_id: "option-a", responded_at: "2026-08-11T13:05:00Z",
})

describe("parked-decision-v1", () => {
  test("freezes every §11 field, scope binding, and canonical identity", () => {
    const parked = createParkedDecision(input())
    expect(parked.parked_decision_digest).toBe(parkedDecisionDigest(parked))
    expect(parked.frozen_scope.session_plan_snapshot_digest).toBe(sha("a"))
    expect(Object.isFrozen(parked.options[0])).toBe(true)
    const reordered = Object.fromEntries(Object.entries(parked).reverse())
    expect(parkedDecisionDigest(reordered)).toBe(parked.parked_decision_digest)
  })

  test("rejects missing fields, invalid options, and inverted evidence", () => {
    for (const field of ["question", "evidence", "options", "origin", "checkpoint", "decision_class", "created_at", "frozen_scope"]) { const value = input(); delete value[field]; expect(errorCode(() => createParkedDecision(value))).toBe("CT_SCHEMA_INVALID") }
    const duplicate = input(); duplicate.options[1].option_id = "option-a"
    const missingId = input(); delete missingId.options[0].option_id
    const missingConsequence = input(); delete missingConsequence.options[0].consequence
    const inverted = input(); inverted.evidence[0].line_start = 557
    for (const value of [duplicate, missingId, missingConsequence, inverted]) expect(errorCode(() => createParkedDecision(value))).toBe("CT_SCHEMA_INVALID")
  })
})

describe("parked-decision-response-v1", () => {
  test("binds one enumerated option to exact decision, snapshot, and authorization identities", () => {
    const parked = createParkedDecision(input()), response = createParkedDecisionResponse(responseInput(parked))
    expect(response).toMatchObject({ parked_decision_id: parked.parked_decision_id, parked_decision_digest: parked.parked_decision_digest, option_id: "option-a", session_plan_snapshot_digest: sha("a"), authorization_id: "auth-s5-7-001", authorization_revision: 2 })
    expect(response.response_digest).toBe(parkedDecisionResponseDigest(response))
    expect(parkedDecisionResponseDigest(Object.fromEntries(Object.entries(response).reverse()))).toBe(response.response_digest)
    expect(assertParkedDecisionResponseBinding(response, parked)).toEqual(response)
  })

  test("rejects label substitution, unknown IDs, and every unsealed binding drift", () => {
    const parked = createParkedDecision(input())
    for (const option_id of ["Resume", "option-c", 0]) expect(errorCode(() => createParkedDecisionResponse({ ...responseInput(parked), option_id }))).toBe("CT_SCHEMA_INVALID")
    const response = createParkedDecisionResponse(responseInput(parked))
    for (const [field, value] of [["authorization_id", "auth-other"], ["authorization_revision", 3], ["parked_decision_id", "parked-other"], ["parked_decision_digest", sha("b")], ["option_id", "option-b"], ["session_plan_snapshot_digest", sha("c")]]) {
      expect(errorCode(() => validate("parkedDecisionResponse", { ...response, [field]: value }))).toBe("CT_SCHEMA_INVALID")
    }
  })

  test("rejects a resealed response against a different parked record", () => {
    const parked = createParkedDecision(input()), other = createParkedDecision({ ...input(), parked_decision_id: "parked-other" })
    const response = createParkedDecisionResponse(responseInput(parked))
    expect(errorCode(() => assertParkedDecisionResponseBinding(response, other))).toBe("CT_SCHEMA_INVALID")
  })
})
