import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { freezeCandidate } from "../../contracts/candidate-revision.mjs"
import { validate } from "../../contracts/validate.mjs"
import {
  assertCompletedWorkBinding,
  completedWorkBindingDigest,
  createCompletedWorkBinding,
} from "../../contracts/completed-work-binding.mjs"

const fixtures = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../fixtures/contracts/schema-cases-v1.json"), "utf8"))
// The work must live inside the decision's frozen scope, so the candidate is the S5.7 work that decision froze.
const candidate = () => { const { candidate_revision: _frozen, ...identity } = fixtures.candidateRevision; return { ...identity, session_id: "S5.7" } }
const assumption = () => ({
  statement: "No maintainer option applied, so the work proceeded under the frozen scope only.",
  origin: { session_id: "S5.7", module_id: "M5.7.2" },
})
const underOption = () => ({ candidate: candidate(), parked_decision: fixtures.parkedDecision, parked_decision_response: fixtures.parkedDecisionResponse })
const underAssumption = () => ({ candidate: candidate(), parked_decision: fixtures.parkedDecision, assumption: assumption() })
const code = (operation) => { try { operation() } catch (error) { return error.code } return null }
const reseal = (binding, mutate) => {
  const changed = structuredClone(binding)
  mutate(changed)
  changed.binding_digest = completedWorkBindingDigest(changed)
  return changed
}

describe("completed work binding", () => {
  // T5.10.1.1 — the gap this Sesión closes, demonstrated against the code as it stands.
  test("frozen completed work carries no parked decision and no option or assumption of its own", () => {
    const frozen = freezeCandidate(candidate())
    expect(frozen.candidate_revision).toMatch(/^sha256:[a-f0-9]{64}$/)
    for (const key of ["parked_decision_id", "parked_decision_digest", "option_id", "assumption", "assumption_digest", "governed_by"]) {
      expect(Object.hasOwn(frozen, key)).toBe(false)
    }
  })

  test("derives the binding from an enumerated option, sealing the work identity it names", () => {
    const binding = createCompletedWorkBinding(underOption())
    expect(binding.schema).toBe("completed-work-binding")
    expect(binding.schema_version).toBe(1)
    expect(binding.governed_by).toBe("OPTION")
    expect(binding.option_id).toBe(fixtures.parkedDecisionResponse.option_id)
    expect(binding.candidate_revision).toBe(freezeCandidate(candidate()).candidate_revision)
    expect(binding.parked_decision_id).toBe(fixtures.parkedDecision.parked_decision_id)
    expect(binding.parked_decision_digest).toBe(fixtures.parkedDecision.parked_decision_digest)
    expect(binding.session_plan_snapshot_digest).toBe(fixtures.parkedDecision.frozen_scope.session_plan_snapshot_digest)
    expect(completedWorkBindingDigest(binding)).toBe(binding.binding_digest)
    expect(Object.isFrozen(binding)).toBeTrue()
  })

  test("derives the binding from an explicit assumption, digesting the assumption it records", () => {
    const binding = createCompletedWorkBinding(underAssumption())
    expect(binding.governed_by).toBe("ASSUMPTION")
    expect(binding.assumption).toEqual(assumption())
    expect(binding.assumption_digest).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(completedWorkBindingDigest(binding)).toBe(binding.binding_digest)
  })

  // Decision 30: exactly one genus, never both and never neither. The record has no state that leaves it open.
  test("refuses both genera at once and neither genus at all", () => {
    expect(code(() => createCompletedWorkBinding({ ...underOption(), assumption: assumption() }))).toBe("CT_SCHEMA_INVALID")
    expect(code(() => createCompletedWorkBinding({ candidate: candidate(), parked_decision: fixtures.parkedDecision }))).toBe("CT_SCHEMA_INVALID")
  })

  test("keeps the two genera structurally disjoint in the persisted record", () => {
    const option = createCompletedWorkBinding(underOption())
    for (const key of ["assumption", "assumption_digest"]) expect(Object.hasOwn(option, key)).toBe(false)
    const assumed = createCompletedWorkBinding(underAssumption())
    expect(Object.hasOwn(assumed, "option_id")).toBe(false)
  })

  // T5.10.1.2 — binary rejection. Every source mismatch fails closed, and a reseal cannot launder it.
  test("rejects an option the parked decision never enumerated", () => {
    const response = { ...fixtures.parkedDecisionResponse, option_id: "option-z" }
    expect(code(() => createCompletedWorkBinding({ ...underOption(), parked_decision_response: response }))).toBe("CT_SCHEMA_INVALID")
  })

  test("rejects a response bound to another decision, digest or snapshot", () => {
    for (const mutate of [
      (v) => { v.parked_decision_id = "parked-other" },
      (v) => { v.parked_decision_digest = `sha256:${"0".repeat(64)}` },
      (v) => { v.session_plan_snapshot_digest = `sha256:${"1".repeat(64)}` },
    ]) {
      const response = structuredClone(fixtures.parkedDecisionResponse)
      mutate(response)
      expect(code(() => createCompletedWorkBinding({ ...underOption(), parked_decision_response: response }))).toBe("CT_SCHEMA_INVALID")
    }
  })

  test("rejects a candidate whose declared revision contradicts its own frozen identity", () => {
    const forged = { ...candidate(), candidate_revision: `sha256:${"0".repeat(64)}` }
    expect(code(() => createCompletedWorkBinding({ ...underOption(), candidate: forged }))).toBe("CT_SCHEMA_INVALID")
  })

  test("rejects an assumption that is empty, malformed or carries extra state", () => {
    for (const value of [
      {}, { statement: "" }, { statement: "x" }, { origin: { session_id: "S5.10", module_id: "M5.10.1" } },
      { ...assumption(), extra: true }, { ...assumption(), statement: 7 }, null, "assumed",
    ]) {
      expect(code(() => createCompletedWorkBinding({ ...underAssumption(), assumption: value }))).toBe("CT_SCHEMA_INVALID")
    }
  })

  test("refuses any resealed mutation of a derived field, so the digest cannot launder a change", () => {
    const binding = createCompletedWorkBinding(underOption())
    for (const mutate of [
      (v) => { v.candidate_revision = `sha256:${"0".repeat(64)}` },
      (v) => { v.parked_decision_id = "parked-other" },
      (v) => { v.parked_decision_digest = `sha256:${"0".repeat(64)}` },
      (v) => { v.option_id = "option-b" },
      (v) => { v.session_plan_snapshot_digest = `sha256:${"1".repeat(64)}` },
      (v) => { v.project_id = "other-project" },
      (v) => { v.assignment_id = "assignment-other" },
    ]) {
      expect(code(() => assertCompletedWorkBinding(reseal(binding, mutate), underOption()))).toBe("CT_SCHEMA_INVALID")
    }
    expect(assertCompletedWorkBinding(binding, underOption())).toEqual(binding)
  })

  // Three-way agreement: the decision's own origin is already held to its frozen scope by assertParkedDecision,
  // and the work and the assumption that governed it must sit in that same scope or nothing is sealed.
  test("refuses work whose Sesión lies outside the decision's frozen scope", () => {
    const foreign = { ...candidate(), session_id: "S7.3" }
    expect(code(() => createCompletedWorkBinding({ ...underOption(), candidate: foreign }))).toBe("CT_SCHEMA_INVALID")
    expect(code(() => createCompletedWorkBinding({ ...underAssumption(), candidate: foreign }))).toBe("CT_SCHEMA_INVALID")
  })

  test("refuses an assumption raised by a Sesión the decision never froze", () => {
    const foreign = { ...assumption(), origin: { session_id: "S7.3", module_id: "M7.3.1" } }
    expect(code(() => createCompletedWorkBinding({ ...underAssumption(), assumption: foreign }))).toBe("CT_SCHEMA_INVALID")
  })

  // Load-bearing invariant: widening binding_id would let two contradictory attributions of one candidate
  // live under different store paths instead of colliding into a divergent replay.
  test("derives binding_id from the work revision alone, so both genera name the same binding", () => {
    const option = createCompletedWorkBinding(underOption()), assumed = createCompletedWorkBinding(underAssumption())
    expect(option.binding_id).toBe(`completed-work-${option.candidate_revision.slice("sha256:".length)}`)
    expect(assumed.binding_id).toBe(option.binding_id)
    expect(option.governed_by).not.toBe(assumed.governed_by)
  })

  // The schema is the last line of defence for a record that never came through createCompletedWorkBinding.
  test("the schema itself refuses a hybrid or genus-less record, independently of the contract", () => {
    const option = createCompletedWorkBinding(underOption()), assumed = createCompletedWorkBinding(underAssumption())
    const hybrid = { ...option, assumption: assumed.assumption, assumption_digest: assumed.assumption_digest }
    const { option_id: _dropped, ...genusless } = option
    for (const value of [hybrid, genusless, { ...assumed, option_id: "option-a" }, { ...option, governed_by: "ASSUMPTION" }]) {
      expect(code(() => validate("completedWorkBinding", value))).toBe("CT_SCHEMA_INVALID")
    }
  })

  // A standalone consumer validates the record and trusts the seal, so validate must enforce it on its own.
  test("validate alone refuses a forged seal, without needing the sources", () => {
    const option = createCompletedWorkBinding(underOption()), assumed = createCompletedWorkBinding(underAssumption())
    expect(validate("completedWorkBinding", option)).toEqual(option)
    expect(code(() => validate("completedWorkBinding", { ...option, binding_digest: `sha256:${"0".repeat(64)}` }))).toBe("CT_SCHEMA_INVALID")
    expect(code(() => validate("completedWorkBinding", { ...assumed, assumption_digest: `sha256:${"0".repeat(64)}` }))).toBe("CT_SCHEMA_INVALID")
  })

  test("refuses a binding whose digest does not match its own content", () => {
    const binding = createCompletedWorkBinding(underOption())
    expect(code(() => assertCompletedWorkBinding({ ...binding, binding_digest: `sha256:${"0".repeat(64)}` }, underOption()))).toBe("CT_SCHEMA_INVALID")
  })
})
