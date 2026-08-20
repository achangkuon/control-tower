import { describe, expect, test } from "bun:test"

import { continueIntegratedBase } from "../../continuation/integrated-base.mjs"

const failure = (operation) => {
  try { operation() } catch (error) { return error }
  return null
}

const baseInput = (overrides = {}) => ({
  caller_role: "MAIN",
  integrated_base: { base_id: "base-n", digest: "sha256:base-n", module_id: "M5.3.1" },
  evidence: { base_id: "base-n", base_digest: "sha256:base-n", fresh: true },
  planning: { horizon: 2, horizon_ceiling: 2, implement_module_id: "M5.3.1", prepare_module_id: "M5.3.2", prepare_through: "TAREAS" },
  successor: null,
  ...overrides,
})

const harness = (overrides = {}) => {
  const calls = []
  const dependencies = {
    reconcile: (input) => { calls.push(["reconcile", input]); return { status: "INTEGRATED", base_id: input.integrated_base.base_id } },
    support: (input) => { calls.push(["support", input]); return { state: "EXECUTABLE", scope: input.planning } },
    policy: (input) => { calls.push(["policy", input]); return { decision: "ALLOW" } },
    dispatch: (input) => { calls.push(["dispatch", input]); return { dispatch_id: "dispatch-n" } },
    escalate: (input) => { calls.push(["escalate", input]); return { escalation_id: "escalation-n" } },
    ...overrides,
  }
  return { calls, dependencies }
}

const expectNoDispatch = (calls) => expect(calls.filter(([name]) => name === "dispatch")).toEqual([])

describe("integrated-base continuation", () => {
  test("prepares only N+1 through Tareas and dispatches only N in canonical order", () => {
    const { calls, dependencies } = harness()
    const result = continueIntegratedBase({ ...baseInput(), dependencies })

    expect(calls.map(([name]) => name).join(" → ")).toBe("reconcile → support → policy → dispatch")
    expect(calls[1][1].planning).toEqual({ module_id: "M5.3.2", through: "TAREAS", horizon: 2 })
    expect(calls[3][1]).toMatchObject({ module_id: "M5.3.1", base_id: "base-n", base_digest: "sha256:base-n" })
    expect(result).toEqual({ status: "DISPATCHED", base_id: "base-n", planned_module_id: "M5.3.2", dispatched_module_id: "M5.3.1", dispatch_id: "dispatch-n" })
    expect(Object.isFrozen(result)).toBe(true)
  })

  test("rejects every non-Main authority before invoking any dependency", () => {
    for (const caller_role of ["WAKE", "WORKER", "SUPPORT", "UI", "HUMAN", undefined]) {
      const { calls, dependencies } = harness()
      const error = failure(() => continueIntegratedBase({ ...baseInput({ caller_role }), dependencies }))
      expect(error?.code).toBe("CT_ROLE_FORBIDDEN")
      expect(Object.isFrozen(error)).toBe(true)
      expect(calls).toEqual([])
    }
  })

  test("fails closed before callbacks when enabling evidence is stale or not bound to the integrated base", () => {
    for (const evidence of [
      { base_id: "base-n", base_digest: "sha256:base-n", fresh: false },
      { base_id: "base-old", base_digest: "sha256:base-n", fresh: true },
      { base_id: "base-n", base_digest: "sha256:base-old", fresh: true },
    ]) {
      const { calls, dependencies } = harness()
      const error = failure(() => continueIntegratedBase({ ...baseInput({ evidence }), dependencies }))
      expect(error?.code).toBe("CT_EVIDENCE_STALE")
      expect(calls).toEqual([])
    }
  })

  test("rejects horizon overflow, drift, and malformed N/N+1 scope before callbacks", () => {
    const invalidPlanning = [
      { ...baseInput().planning, horizon: 3 },
      { ...baseInput().planning, horizon_ceiling: 3 },
      { ...baseInput().planning, implement_module_id: "M5.3.9" },
      { ...baseInput().planning, prepare_module_id: "M5.3.3" },
      { ...baseInput().planning, prepare_through: "MODULES" },
    ]
    for (const planning of invalidPlanning) {
      const { calls, dependencies } = harness()
      const error = failure(() => continueIntegratedBase({ ...baseInput({ planning }), dependencies }))
      expect(error?.code).toBe("CT_HORIZON_EXCEEDED")
      expect(calls).toEqual([])
    }
  })

  test("returns typed failures with zero dispatch for NO_SCOPE and policy denial", () => {
    const noScope = harness({ support: (input) => { noScope.calls.push(["support", input]); return { state: "NO_SCOPE" } } })
    let error = failure(() => continueIntegratedBase({ ...baseInput(), dependencies: noScope.dependencies }))
    expect(error?.code).toBe("CT_NO_EXECUTABLE_SCOPE")
    expect(noScope.calls.map(([name]) => name)).toEqual(["reconcile", "support"])
    expectNoDispatch(noScope.calls)

    const denied = harness({ policy: (input) => { denied.calls.push(["policy", input]); return { decision: "DENY" } } })
    error = failure(() => continueIntegratedBase({ ...baseInput(), dependencies: denied.dependencies }))
    expect(error?.code).toBe("CT_POLICY_DENIED")
    expect(denied.calls.map(([name]) => name)).toEqual(["reconcile", "support", "policy"])
    expectNoDispatch(denied.calls)
  })

  test("preserves a divergent successor byte-for-byte, marks it UNRECONCILED, and escalates evidence", () => {
    const bytes = Buffer.from([0, 255, 17, 42, 99])
    const before = Buffer.from(bytes)
    const { calls, dependencies } = harness({
      reconcile: (input) => { calls.push(["reconcile", input]); return { status: "DIVERGENT", evidence: { head: "successor-head", base: "base-n" } } },
    })
    const result = continueIntegratedBase({ ...baseInput({ successor: { bytes } }), dependencies })

    expect(Buffer.compare(bytes, before)).toBe(0)
    expect(calls.map(([name]) => name)).toEqual(["reconcile", "escalate"])
    expect(calls[1][1]).toMatchObject({ status: "UNRECONCILED", evidence: { head: "successor-head", base: "base-n" } })
    expect(calls[1][1].successor_bytes).toBe(bytes)
    expect(result).toEqual({ status: "UNRECONCILED", code: "CT_CONTINUATION_UNRECONCILED", base_id: "base-n", successor_bytes: bytes, evidence: { head: "successor-head", base: "base-n" }, escalation_id: "escalation-n" })
    expect(Object.isFrozen(result)).toBe(true)
    expectNoDispatch(calls)
  })

  test("fails closed when reconciliation does not attest the integrated base", () => {
    for (const reconciliation of [null, { status: "STALE" }, { status: "INTEGRATED", base_id: "another-base" }]) {
      const { calls, dependencies } = harness({ reconcile: (input) => { calls.push(["reconcile", input]); return reconciliation } })
      const error = failure(() => continueIntegratedBase({ ...baseInput(), dependencies }))
      expect(error?.code).toBe("CT_EVIDENCE_STALE")
      expect(calls.map(([name]) => name)).toEqual(["reconcile"])
      expectNoDispatch(calls)
    }
  })
})
