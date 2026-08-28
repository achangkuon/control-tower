import { describe, expect, test } from "bun:test"
import { createRuntimeHealth, createRuntimeObserve } from "../../hosts/runtime-observe.mjs"

const id = (kind, digit) => `ct_${kind}_${digit.repeat(32)}`
const context = ({ digit = "1", port = 43101 } = {}) => {
  const identity = { schema_version: "control-tower.host-runtime.identity/v1", runtime_id: id("runtime", digit) }
  const worktree = { schema_version: "control-tower.host-runtime.worktree/v1", worktree_id: id("worktree", digit) }
  const process = { schema_version: "control-tower.host-runtime.process/v1", process_id: id("process", digit) }
  const incarnation = { schema_version: "control-tower.host-runtime.incarnation/v1", incarnation_id: id("incarnation", digit) }
  const binding = {
    schema_version: "control-tower.host-runtime.binding/v1", binding_id: id("binding", digit),
    runtime_id: identity.runtime_id, worktree_id: worktree.worktree_id,
    process_id: process.process_id, incarnation_id: incarnation.incarnation_id, loopback_port: port,
  }
  return [identity, worktree, process, incarnation, binding]
}
const challengeFor = (tuple, operation, overrides = {}) => Object.freeze({
  operation, producer_ref: "producer-1", challenge_ref: `${operation.toLowerCase()}-1`,
  runtime_id: tuple[0].runtime_id, worktree_id: tuple[1].worktree_id,
  process_id: tuple[2].process_id, binding_id: tuple[4].binding_id,
  incarnation_id: tuple[3].incarnation_id, loopback_port: tuple[4].loopback_port,
  ...overrides,
})
const proofFor = (challenge, value, overrides = {}) => Object.freeze({
  ...challenge,
  ...(challenge.operation === "OBSERVE" ? { evidence: value } : { state: value }),
  ...overrides,
})
const fixture = ({ operation, outcome = "HEALTHY", proofOverrides, issueError } = {}) => {
  const tuple = context(), unavailable = issueError || outcome instanceof Error || outcome == null
  const create = operation === "OBSERVE" ? createRuntimeObserve : createRuntimeHealth
  const input = {
    operation, binding_id: tuple[4].binding_id, incarnation_id: tuple[4].incarnation_id,
    status: unavailable ? "UNAVAILABLE" : "MATCHED",
    outcome: unavailable ? null : proofOverrides ? { outcome, ...proofOverrides } : outcome,
  }
  return {
    tuple, operation: async () => create(input),
    counts: () => ({ issueCount: 1, callCount: issueError ? 0 : 1 }),
  }
}
const exactFrozen = (value, expected) => {
  expect(value).toEqual(expected)
  expect(Object.keys(value)).toEqual(Object.keys(expected))
  expect(Object.isFrozen(value)).toBe(true)
  expect(JSON.stringify(value)).not.toMatch(/producer_ref|challenge_ref|challenge|43101/i)
}

 describe("host-neutral runtime observe and health", () => {
  test("keeps missing, disconnected, timed-out, and silent observation evidence unproven", async () => {
    for (const unavailable of [new Error("missing"), new Error("disconnected"), new Error("timed out"), null]) {
      const f = fixture({ operation: "OBSERVE", outcome: unavailable })
      exactFrozen(await f.operation({ binding: f.tuple[4] }), {
        operation: "OBSERVE", binding_id: f.tuple[4].binding_id,
        incarnation_id: f.tuple[4].incarnation_id, evidence: null, uncertainty: "EVIDENCE_UNAVAILABLE",
      })
      expect(f.counts()).toEqual({ issueCount: 1, callCount: 1 })
    }
    const issuance = fixture({ operation: "OBSERVE", issueError: new Error("unavailable") })
    expect((await issuance.operation({ binding: issuance.tuple[4] })).uncertainty).toBe("EVIDENCE_UNAVAILABLE")
    expect(issuance.counts()).toEqual({ issueCount: 1, callCount: 0 })
  })

  test("returns bounded matching observation evidence only", async () => {
    const f = fixture({ operation: "OBSERVE", outcome: "OBSERVED" })
    exactFrozen(await f.operation({ binding: f.tuple[4] }), {
      operation: "OBSERVE", binding_id: f.tuple[4].binding_id,
      incarnation_id: f.tuple[4].incarnation_id, evidence: "MATCHING_PRODUCER_PROOF", uncertainty: null,
    })
  })

  test("maps only matching producer health proof to the three exact states", async () => {
    expect(() => createRuntimeHealth({ producer: {}, resolveContexts: () => [] })).toThrow(TypeError)
    for (const [outcome, state] of [["HEALTHY", "PROVEN_HEALTHY"], ["DEAD", "PROVEN_DEAD"], [new Error("disconnected"), "DISCONNECTED_UNKNOWN"], [null, "DISCONNECTED_UNKNOWN"]]) {
      const f = fixture({ operation: "HEALTH", outcome })
      exactFrozen(await f.operation({ binding: f.tuple[4] }), {
        operation: "HEALTH", binding_id: f.tuple[4].binding_id,
        incarnation_id: f.tuple[4].incarnation_id, state,
      })
    }
  })

  test("foreign, self-reported, crossed, challenge-mismatched, and extra-field proof cannot prove", async () => {
    const cases = [
      { producer_ref: "foreign" },
      { self_report: true },
      { operation: "OBSERVE" },
      { binding_id: id("binding", "2") },
      { incarnation_id: id("incarnation", "2") },
      { challenge_ref: "foreign-challenge" },
      { state: undefined },
      { extra: "value" },
    ]
    for (const proofOverrides of cases) {
      const f = fixture({ operation: "HEALTH", outcome: "HEALTHY", proofOverrides })
      const error = await f.operation({ binding: f.tuple[4] }).catch((failure) => failure)
      expect(error.code).toBe("CT_HOST_RUNTIME_PROOF_MISMATCH")
      expect(f.counts()).toEqual({ issueCount: 1, callCount: 1 })
    }
  })
})
