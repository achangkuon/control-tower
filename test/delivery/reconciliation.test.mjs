import { describe, expect, test } from "bun:test"

import { classifyDeliveryResult, deliverWithReconciliation } from "../../delivery/reconciliation.mjs"

const revision = `sha256:${"a".repeat(64)}`

describe("delivery result classification", () => {
  test("classifies quota, provider, pending checks, and ambiguous outcomes", () => {
    expect(classifyDeliveryResult({ statusCode: 429, message: "quota exceeded" }).classification).toBe("quota_exhausted")
    expect(classifyDeliveryResult({ message: "billing limit reached" }).classification).toBe("quota_exhausted")
    expect(classifyDeliveryResult({ statusCode: 503 }).classification).toBe("provider_unavailable")
    expect(classifyDeliveryResult({ timedOut: true }).classification).toBe("provider_unavailable")
    expect(classifyDeliveryResult({ checks: "incomplete" }).classification).toBe("checks_pending")
    expect(classifyDeliveryResult({ message: "connection ended" })).toEqual({ classification: "unknown", blocked: true })
  })
})

describe("bounded reconciliation", () => {
  test("reconciles before every attempt and stops after the third failed mutation", async () => {
    const events = [], calls = []
    const result = await deliverWithReconciliation({
      candidate_revision: revision,
      reconcile: async () => { calls.push("reconcile"); return { status: "absent" } },
      mutate: async () => { calls.push("mutate"); return { delivered: false, statusCode: 503 } },
      record: async (event) => events.push(event),
    })

    expect(result).toEqual({ status: "ESCALATED", candidate_revision: revision, attempts: 3, classification: "provider_unavailable", tower_blocked: false })
    expect(calls).toEqual(["reconcile", "mutate", "reconcile", "mutate", "reconcile", "mutate"])
    expect(events.filter(({ state }) => state === "ATTEMPT_FAILED")).toHaveLength(3)

    const resumed = []
    const final = await deliverWithReconciliation({ candidate_revision: revision, initial_attempts: 2,
      reconcile: async () => { resumed.push("reconcile"); return { status: "absent" } },
      mutate: async () => { resumed.push("mutate"); return { delivered: false, statusCode: 503 } }, record: async () => {} })
    expect(final.attempts).toBe(3)
    expect(resumed).toEqual(["reconcile", "mutate"])
  })

  test("a lost response that reconciles as delivered never emits a second mutation", async () => {
    let inspections = 0, mutations = 0
    const result = await deliverWithReconciliation({
      candidate_revision: revision,
      reconcile: async () => ({ status: inspections++ === 0 ? "absent" : "delivered" }),
      mutate: async () => { mutations += 1; return { delivered: false, message: "connection ended" } },
      record: async () => {},
    })

    expect(result.status).toBe("DELIVERED")
    expect(result.reconciled).toBe(true)
    expect(mutations).toBe(1)
  })

  test("an irreconcilable ambiguity freezes only that delivery with no further mutation", async () => {
    let mutations = 0
    const events = []
    const result = await deliverWithReconciliation({
      candidate_revision: revision,
      reconcile: async () => ({ status: "unknown", evidence: "remote unavailable" }),
      mutate: async () => { mutations += 1; return { delivered: true } },
      record: async (event) => events.push(event),
    })

    expect(result).toEqual({ status: "UNRECONCILED", code: "CT_DELIVERY_UNRECONCILED", candidate_revision: revision, candidate_frozen: true, tower_blocked: false, attempts: 0 })
    expect(mutations).toBe(0)
    expect(events.at(-1).state).toBe("UNRECONCILED")
  })
})
