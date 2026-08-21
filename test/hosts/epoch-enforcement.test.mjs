import { describe, expect, test } from "bun:test"

import { createEpochEnforcement } from "../../hosts/epoch-enforcement.mjs"

const identity = (host_epoch, candidate_revision = `sha256:${String(host_epoch).repeat(64)}`) => ({
  project_id: "project-a", assignment_ref: `assignments/host-${host_epoch}.json`, candidate_revision, host_epoch,
})

describe("host epoch enforcement", () => {
  test("publishes a validated successor before the predecessor can remain current", () => {
    let current = identity(1), released = false
    const fence = {
      assertExactCurrent(value) {
        if (JSON.stringify(value) !== JSON.stringify(current)) throw Object.assign(new Error("stale"), { code: "CT_ASSIGNMENT_STALE" })
        return true
      },
      admit(input) {
        expect(input).toEqual({ expectedRevision: 1 })
        current = identity(2)
        return { revision: 2 }
      },
    }
    const enforcement = createEpochEnforcement({ candidateFence: fence })
    expect(enforcement.publishSuccessor({ mode: "verified", predecessorIdentity: identity(1), successorIdentity: identity(2), publication: { expectedRevision: 1 } })).toEqual({ revision: 2 })
    expect(() => enforcement.assertCurrent(identity(1))).toThrowError(expect.objectContaining({ code: "CT_ASSIGNMENT_STALE" }))
    expect(enforcement.assertCurrent(identity(2))).toBeTrue()
    expect(released).toBeFalse()
  })

  test("fails closed on missing ports, broken lineage, and nonterminal publication", () => {
    expect(() => createEpochEnforcement()).toThrow(TypeError)
    const calls = []
    const enforcement = createEpochEnforcement({ candidateFence: {
      assertExactCurrent(value) { calls.push(["assert", value]); return true },
      admit(input) { calls.push(["publish", input]); return { revision: 1 } },
    } })
    expect(() => enforcement.publishSuccessor({ mode: "verified", predecessorIdentity: identity(1), successorIdentity: identity(3), publication: {} })).toThrowError(expect.objectContaining({ code: "CT_FENCE_INVALID" }))
    expect(calls).toEqual([])
    expect(() => enforcement.publishSuccessor({ mode: "unknown", predecessorIdentity: identity(1), successorIdentity: identity(2), publication: {} })).toThrowError(expect.objectContaining({ code: "CT_FENCE_INVALID" }))
  })
})
