import { describe, expect, test } from "bun:test"

import { verifyImportOrder } from "./verify-import-order.mjs"

const fixture = () => {
  const priorCandidateText = "sesiones:\n  - id: S1\n  - id: S2\n"
  return {
    inventoryText: "sessions:\n  - session_id: S1\n  - session_id: S2\n  - session_id: S3\n",
    lineageText: "closure_contract:\n  serialization:\n    imported_ids: [S1, S2, S3]\n",
    candidateText: `${priorCandidateText}  - id: S3\n`,
    priorCandidateText,
    expectedInventoryCount: 3,
    expectedCandidateCount: 3,
  }
}
const yaml = (text) => Bun.YAML.parse(text)

const withCandidate = (mutate) => {
  const values = fixture()
  const candidate = yaml(values.candidateText)
  mutate(candidate.sesiones)
  return { ...values, candidateText: Bun.YAML.stringify(candidate) }
}

describe("S9.7 dormant import-order proof", () => {
  test("accepts a schema fixture without discovery and reports its next cursor", () => {
    const values = fixture()
    expect(yaml(values.inventoryText).discovery).toBeUndefined()

    expect(verifyImportOrder(values)).toMatchObject({
      ok: true,
      observed: { inventoryCount: 3, candidateCount: 3, lastCandidateId: "S3", nextCursor: null },
      hashes: {
        source: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
        candidate: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      },
      failures: [],
    })
  })

  test("rejects a wrong expected candidate count", () => {
    const result = verifyImportOrder({ ...fixture(), expectedCandidateCount: 2 })
    expect(result).toMatchObject({ ok: false, failures: ["candidate-count: expected 2, observed 3"] })
  })

  test("rejects a candidate that violates the approved imported order", () => {
    const result = verifyImportOrder(withCandidate((sessions) => [sessions[1], sessions[2]] = [sessions[2], sessions[1]]))
    expect(result.ok).toBe(false)
    expect(result.failures).toContain("candidate-order: expected S2 at position 2, observed S3")
  })

  test("rejects duplicate and invented candidate IDs", () => {
    const duplicate = verifyImportOrder(withCandidate((sessions) => sessions.push(structuredClone(sessions.at(-1)))))
    const invented = verifyImportOrder(withCandidate((sessions) => { sessions.at(-1).id = "S999" }))

    expect(duplicate.failures).toContain("candidate-duplicate: S3")
    expect(invented.failures).toContain("candidate-invented: S999")
  })

  test("rejects a changed committed candidate prefix", () => {
    const values = fixture()
    const result = verifyImportOrder({
      ...values,
      priorCandidateText: values.priorCandidateText.replace("S2", "S0"),
    })

    expect(result.failures).toContain("prior-prefix: candidate does not preserve committed HEAD bytes")
  })
})
