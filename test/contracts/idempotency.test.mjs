import { describe, expect, test } from "bun:test"

import { deriveIdempotencyIdentity, inspectIdempotentRetry } from "../../contracts/idempotency.mjs"

const input = Object.freeze({ project_id: "control-tower", plan_id: "contracts", slice_id: "canonicalization", assignment_revision: 2, attempt: 1, epoch: 7, operation: "VERIFY_ARTIFACT", target: "artifact:requirements" })
const errorCode = async (operation) => { try { await operation() } catch (error) { return error.code } return null }

describe("idempotency identity and retry inspection", () => {
  test("derives the same ctv1 identity for equivalent input", () => {
    const reordered = { target: input.target, operation: input.operation, epoch: 7, attempt: 1, assignment_revision: 2, slice_id: input.slice_id, plan_id: input.plan_id, project_id: input.project_id }
    expect(deriveIdempotencyIdentity(input)).toBe(deriveIdempotencyIdentity(reordered))
    expect(deriveIdempotencyIdentity(input)).toMatch(/^ctv1:[0-9a-f]{64}$/)
  })

  test("changed bound input conflicts with an existing identity", async () => {
    const identity = deriveIdempotencyIdentity(input)
    expect(await errorCode(() => inspectIdempotentRetry({ identity, input: { ...input, attempt: 2 }, inspect: async () => null })))
      .toBe("CT_IDEMPOTENCY_CONFLICT")
  })

  test("a timed-out retry inspects and returns existing evidence without replay", async () => {
    const identity = deriveIdempotencyIdentity(input)
    let inspections = 0
    const evidence = { report_ref: "reports/verified.json", terminal: true }
    const result = await inspectIdempotentRetry({ identity, input, inspect: async () => { inspections += 1; return evidence } })
    expect(result).toEqual({ status: "EVIDENCE_FOUND", replay: false, identity, evidence })
    expect(inspections).toBe(1)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.evidence)).toBe(true)
  })

  test("an unknown effect remains inspection-required and is never replayed", async () => {
    const identity = deriveIdempotencyIdentity(input)
    const result = await inspectIdempotentRetry({ identity, input, inspect: async () => null })
    expect(result).toEqual({ status: "UNKNOWN_EFFECT", replay: false, identity, evidence: null })
  })
})
