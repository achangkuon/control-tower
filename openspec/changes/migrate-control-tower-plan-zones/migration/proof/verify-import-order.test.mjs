import { createHash } from "node:crypto"
import { describe, expect, test } from "bun:test"

import * as proof from "./verify-import-order.mjs"

const { verifyImportOrder } = proof

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

const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`
const batchFixture = () => {
  const priorCandidateText = "sesiones:\n  - id: S1\n  - id: S2\n"
  const inventoryText = "sessions:\n  - session_id: S1\n  - session_id: S2\n  - session_id: S3\n  - session_id: S4\n"
  const lineageText = "closure_contract:\n  serialization:\n    imported_ids: [S1, S2, S3, S4]\n"
  return {
    inventoryText,
    lineageText,
    candidateText: `${priorCandidateText}  - id: S3\n  - id: S4\n`,
    priorCandidateText,
    expectedInventoryCount: 4,
    batch: {
      ids: ["S3", "S4"],
      sourceHash: sha256(inventoryText),
      lineageHash: sha256(lineageText),
      priorCandidateHash: sha256(priorCandidateText),
    },
  }
}

describe("declared import batches", () => {
  test("accepts a complete two-ID batch and derives count from the declared IDs", () => {
    const result = verifyImportOrder(batchFixture())

    expect(result).toMatchObject({
      ok: true,
      observed: { priorCandidateCount: 2, candidateCount: 4, batchIds: ["S3", "S4"] },
      failures: [],
    })
  })

  test("rejects missing, malformed, mismatched, and ambiguous declarations", () => {
    const values = batchFixture()
    const malformed = verifyImportOrder({ ...values, batch: { ...values.batch, ids: ["S3", ""] } })
    const mismatched = verifyImportOrder({ ...values, batch: { ...values.batch, sourceHash: sha256("other") } })
    const ambiguous = verifyImportOrder({ ...values, expectedCandidateCount: 4 })

    expect(malformed.failures).toContain("batch-ids: expected nonblank unique strings")
    expect(mismatched.failures).toContain("batch-source-hash: does not match inventory")
    expect(ambiguous.failures).toContain("batch-count: expectedCandidateCount cannot be combined with batch")
  })

  test("rejects every missing, malformed, and mismatched identity pin", () => {
    const values = batchFixture()
    const pins = [
      ["sourceHash", "batch-source-hash: does not match inventory"],
      ["lineageHash", "batch-lineage-hash: does not match lineage"],
      ["priorCandidateHash", "batch-prior-candidate-hash: does not match prior candidate"],
    ]

    for (const [field, mismatch] of pins) {
      const missing = verifyImportOrder({ ...values, batch: { ...values.batch, [field]: undefined } })
      const malformed = verifyImportOrder({ ...values, batch: { ...values.batch, [field]: "sha256:bad" } })
      const mismatched = verifyImportOrder({ ...values, batch: { ...values.batch, [field]: sha256(field) } })

      expect(missing.failures).toContain(`batch-${field.replace("Hash", "-hash").replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: expected sha256:<64 lowercase hex>`)
      expect(malformed.ok).toBe(false)
      expect(mismatched.failures).toContain(mismatch)
    }
  })

  test("rejects wrong, reordered, duplicate, and extra appended IDs", () => {
    const values = batchFixture()
    const wrong = verifyImportOrder({ ...values, candidateText: values.candidateText.replace("S4", "S9") })
    const reordered = verifyImportOrder({ ...values, candidateText: values.candidateText.replace("S3\n  - id: S4", "S4\n  - id: S3") })
    const duplicate = verifyImportOrder({ ...values, batch: { ...values.batch, ids: ["S3", "S3"] } })
    const extra = verifyImportOrder({ ...values, candidateText: `${values.candidateText}  - id: S5\n` })

    expect(wrong.failures).toContain("batch-ids: expected S3,S4, observed S3,S9")
    expect(reordered.failures).toContain("batch-ids: expected S3,S4, observed S4,S3")
    expect(duplicate.failures).toContain("batch-ids: expected nonblank unique strings")
    expect(extra.failures).toContain("batch-ids: expected S3,S4, observed S3,S4,S5")
  })

  test("preserves no-batch legacy +1 and programmatic count override behavior", () => {
    const { expectedCandidateCount, ...legacyValues } = fixture()
    const legacy = verifyImportOrder(legacyValues)
    const override = verifyImportOrder({ ...fixture(), expectedCandidateCount: 2 })

    expect(legacy).toMatchObject({ ok: true, observed: { candidateCount: 3 } })
    expect(override.failures).toContain("candidate-count: expected 2, observed 3")
  })

  test("parses only no arguments or one complete --batch-json declaration", () => {
    const values = batchFixture()
    expect(proof.parseCliArguments([])).toEqual({ batch: undefined, failures: [] })
    expect(proof.parseCliArguments(["--batch-json", JSON.stringify(values.batch)])).toEqual({ batch: values.batch, failures: [] })
    expect(proof.parseCliArguments(["--batch-json"])).toMatchObject({ failures: ["cli-args: missing --batch-json value"] })
    expect(proof.parseCliArguments(["--unknown"])).toMatchObject({ failures: ["cli-args: unknown arguments"] })
    expect(proof.parseCliArguments(["--batch-json", "{"])).toMatchObject({ failures: ["cli-args: malformed --batch-json"] })
  })
})
