import { describe, expect, test } from "bun:test"

import { digestArtifact } from "../../contracts/canonicalize.mjs"
import { compareWorkerClaim, deriveNextModule } from "../../continuation/derivation.mjs"

const code = (operation) => {
  try { operation() } catch (error) { return error.code }
  return null
}
const planBytes = Buffer.from("## Sesión 5.1\n\n### Módulo M5.1.1 — Candidate\n\n### Módulo M5.1.2 — Derivación\n")
const planDigest = digestArtifact(planBytes, "raw-bytes")
const modules = ["M5.1.1", "M5.1.2"]

const mainStore = () => {
  const coordinates = new Map([["handoff-complete", { module_id: "M5.1.1" }], ["handoff-next", { module_id: "M5.1.2" }]])
  const claims = []
  return {
    readHandoffCoordinate: (handoff_id) => coordinates.get(handoff_id),
    recordWorkerClaim: (record) => { claims.push(record); return record },
    claims,
  }
}

describe("next Module derivation", () => {
  test("uses an unchanged plan digest and read-only delivery/claim fulfillment", () => {
    const store = mainStore()
    const result = deriveNextModule({
      plan_bytes: planBytes, expected_plan_digest: planDigest,
      ledger: { readDeliveryClaims: () => [{ handoff_id: "handoff-complete", delivery_state: "CLOSED", claim_state: "CLOSED" }] },
      main_store: store,
    })
    expect(result.module_id).toBe("M5.1.2")
    expect(result.plan_digest).toBe(planDigest)
  })

  test("does not advance from narrative memory, fabricated modules, or changed plan bytes", () => {
    const store = mainStore()
    const emptyLedger = { readDeliveryClaims: () => [] }
    expect(deriveNextModule({ plan_bytes: planBytes, expected_plan_digest: planDigest, ledger: emptyLedger, main_store: store, narrative: { completed: modules } }).module_id).toBe("M5.1.1")
    expect(deriveNextModule({ plan_bytes: planBytes, expected_plan_digest: planDigest, modules: ["M9.9.9"], ledger: emptyLedger, main_store: store }).module_id).toBe("M5.1.1")
    expect(code(() => deriveNextModule({ plan_bytes: Buffer.from("changed"), expected_plan_digest: planDigest, modules, ledger: emptyLedger, main_store: store }))).toBe("CT_NO_EXECUTABLE_SCOPE")
  })

  test("records a matching Worker claim as evidence and fails closed on disagreement", () => {
    const store = mainStore()
    const mismatched = () => compareWorkerClaim({ project_id: "project-a", actual_claim: "M5.1.3", handoff_id: "handoff-next", main_store: store })
    expect(code(mismatched)).toBe("CT_CLAIM_MISMATCH")
    expect(mismatched).toThrow("expected M5.1.2, actual M5.1.3")
    expect(store.claims).toEqual([])
    expect(compareWorkerClaim({ project_id: "project-a", actual_claim: "M5.1.2", handoff_id: "handoff-next", main_store: store })).toMatchObject({ expected_claim: "M5.1.2", actual_claim: "M5.1.2", handoff_id: "handoff-next" })
    expect(store.claims).toEqual([{ actor: "MAIN", project_id: "project-a", expected_claim: "M5.1.2", actual_claim: "M5.1.2", handoff_id: "handoff-next" }])
  })
})
