import { createHash } from "node:crypto"
import { describe, expect, test } from "bun:test"

import * as proof from "./verify-activation-partition.mjs"

const { verifyActivationPartition, DEFAULT_SATISFIED_HISTORY_IDS } = proof

const COMMIT = "a".repeat(40)
const ASSIGN_PATH = "agent-workflows/ASIGNACION-24-SESIONES.md"
const ASSIGN_BLOB = "c".repeat(40)
const LEGACY_PATH = "openspec/plans/plan-1/STATUS.md"
const LEGACY_BLOB = "b".repeat(40)

const locate = (raw, path, blob, lineStart, lineEnd) => {
  const lines = raw.split("\n")
  const before = lines.slice(0, lineStart - 1).join("\n") + (lineStart > 1 ? "\n" : "")
  const through = `${lines.slice(0, lineEnd).join("\n")}\n`
  const byte_start = Buffer.byteLength(before, "utf8")
  const byte_end = Buffer.byteLength(through, "utf8")
  return {
    commit: COMMIT, path, blob, line_start: lineStart, line_end: lineEnd, byte_start, byte_end,
    fragment_sha256: createHash("sha256").update(Buffer.from(raw, "utf8").subarray(byte_start, byte_end)).digest("hex"),
  }
}
const consumerHeading = (id) => `## Consumidor de ${id}`

// One shared, size-parameterized fixture builder reused at three scales: a small
// horizon/mapping fixture, a small satisfied-history fixture, and the active 75/7/4 scale.
// `importedIds` are dummy full Sessions; the first `satisfiedHistoryIds.length` of them
// each prove one immutable `Depende de` edge to their historical reference.
const buildFixture = ({ importedCount, successorIds, satisfiedHistoryIds }) => {
  const importedIds = Array.from({ length: importedCount }, (_, i) => `I${i + 1}`)
  const successors = successorIds.map((id, i) => ({
    id, resultado: `Result ${id}`, zona: "entrega",
    dependencies: i === 0 ? [] : [successorIds[i - 1]], cimientos: [], reemplaza: ["S5.14"],
  }))
  const horizonSelected = successorIds.slice(0, 2)
  const horizonDeferred = successorIds.slice(2)
  const assignmentRaw = `${horizonDeferred.map((id) => `Row ${id}`).join("\n")}\n`
  const futureRefs = horizonDeferred.map((id, idx) => {
    const s = successors.find((x) => x.id === id)
    return {
      id, reason: "outside-approved-horizon", result: s.resultado, zone: s.zona,
      dependencies: s.dependencies, foundations: s.cimientos, replaces: s.reemplaza,
      assignment_source: locate(assignmentRaw, ASSIGN_PATH, ASSIGN_BLOB, idx + 1, idx + 1),
    }
  })
  const s100s101 = horizonSelected.map((id) => {
    const s = successors.find((x) => x.id === id)
    return { id, resultado: s.resultado, zona: s.zona, depende_de: s.dependencies, cimientos: s.cimientos, reemplaza: s.reemplaza }
  })
  // Two lines per historical block (heading, terminal status), then two lines per
  // consumer block (its own heading, its own `Depende de` edge) — separate Markdown
  // sections so the consumer proof is independent of the terminal-fragment proof.
  const statusById = Object.fromEntries(satisfiedHistoryIds.map((id, i) => [id, i % 2 === 0 ? "COMPLETO" : "ARCHIVADO"]))
  const legacyLines = satisfiedHistoryIds.flatMap((id) => [`## ${id} — legacy Session`, `Estado: ${statusById[id]}`])
  legacyLines.push(...satisfiedHistoryIds.flatMap((id) => [consumerHeading(id), `Depende de: ${id}`]))
  const legacyRaw = `${legacyLines.join("\n")}\n`
  const satisfiedRefs = satisfiedHistoryIds.map((id, i) => ({
    id, reason: "omitted-completed-import-dependency", terminal_source: locate(legacyRaw, LEGACY_PATH, LEGACY_BLOB, 2 * i + 1, 2 * i + 2),
  }))
  const consumerOf = Object.fromEntries(satisfiedHistoryIds.map((id, i) => [importedIds[i], id]))
  const fullSessions = importedIds.map((id) => (consumerOf[id] === undefined ? { id } : {
    id, depende_de: [consumerOf[id]],
    importacion_legacy: { origen_commit: COMMIT, origen_ruta: LEGACY_PATH, origen_blob: LEGACY_BLOB, origen_encabezado: consumerHeading(consumerOf[id]) },
  }))
  const lineageValue = {
    closure_contract: { imported_mapping_rows: importedCount, required_successors: successorIds, serialization: { imported_ids: importedIds } },
    successors, dependency_rewrites: [],
  }
  const candidateValue = { sesiones: [...fullSessions, ...s100s101], references: { future_successors: futureRefs, satisfied_history: satisfiedRefs } }
  const rawByPath = { [ASSIGN_PATH]: assignmentRaw, [LEGACY_PATH]: legacyRaw }
  return {
    lineageText: Bun.YAML.stringify(lineageValue), candidateText: Bun.YAML.stringify(candidateValue),
    resolveFragment: (loc) => (rawByPath[loc.path] === undefined ? null : { mode: "100644", blobOid: loc.blob, raw: rawByPath[loc.path] }),
    satisfiedHistoryIds,
  }
}
const withCandidate = (values, mutate) => {
  const candidate = Bun.YAML.parse(values.candidateText)
  mutate(candidate)
  return { ...values, candidateText: Bun.YAML.stringify(candidate) }
}

describe("horizon derivation and mapping proof", () => {
  const futureFixture = (successorIds) => buildFixture({ importedCount: 2, successorIds, satisfiedHistoryIds: [] })
  const mutateFuture = (mutate) => withCandidate(futureFixture(["S100", "S101", "S102", "S103"]), mutate)

  test("accepts an exact horizon selection with matching canonical fields", () => {
    const result = verifyActivationPartition(futureFixture(["S100", "S101", "S102", "S103"]))
    expect(result).toMatchObject({ ok: true, observed: { fullSessionCount: 4, futureReferenceCount: 2, satisfiedHistoryCount: 0 }, failures: [] })
  })

  test("derives S100/S101 from the exact required-successor order, not declaration order", () => {
    expect(verifyActivationPartition(futureFixture(["S200", "S201", "S202"])).ok).toBe(true)
  })

  test("rejects a reordered future-reference listing", () => {
    const result = verifyActivationPartition(mutateFuture((c) => {
      const [a, b] = c.references.future_successors
      c.references.future_successors = [b, a]
    }))
    expect(result.failures.some((f) => f.startsWith("future-reference-order"))).toBe(true)
  })

  test("rejects a future reference whose canonical fields drift from the lineage ledger", () => {
    const result = verifyActivationPartition(mutateFuture((c) => { c.references.future_successors[0].zone = "hosts" }))
    expect(result.failures).toContain("canonical-zone:S102")
  })

  test("rejects a tampered assignment-source hash and mismatched line/byte bounds", () => {
    const hash = verifyActivationPartition(mutateFuture((c) => { c.references.future_successors[0].assignment_source.fragment_sha256 = "0".repeat(64) }))
    const bounds = verifyActivationPartition(mutateFuture((c) => { c.references.future_successors[0].assignment_source.byte_end += 1 }))
    expect(hash.failures.some((f) => f.includes("-hash"))).toBe(true)
    expect(bounds.failures.some((f) => f.includes("-bounds"))).toBe(true)
  })
})

describe("satisfied-history fragment and imported-consumer proof", () => {
  const satisfiedFixture = () => buildFixture({ importedCount: 1, successorIds: [], satisfiedHistoryIds: ["S1.9"] })
  const legacyRaw = "## S1.9 — legacy Session\nEstado: COMPLETO\n"
  // Recomputes the terminal_source locator against a rewritten fragment, so a content
  // mutation is exercised in isolation instead of also tripping the bounds/hash checks.
  const withTerminalRaw = (raw) => {
    const values = withCandidate(satisfiedFixture(), (c) => {
      c.references.satisfied_history[0].terminal_source = locate(raw, LEGACY_PATH, LEGACY_BLOB, 1, 2)
    })
    return { ...values, resolveFragment: (loc) => (loc.path === LEGACY_PATH ? { mode: "100644", blobOid: loc.blob, raw } : null) }
  }

  test("accepts a proven terminal fragment with an imported consumer edge", () => {
    const result = verifyActivationPartition(satisfiedFixture())
    expect(result).toMatchObject({ ok: true, observed: { satisfiedHistoryCount: 1 } })
  })

  test("rejects a terminal fragment missing the exact reference ID", () => {
    const result = verifyActivationPartition(withTerminalRaw(legacyRaw.replace("S1.9 — legacy Session", "legacy Session")))
    expect(result.failures.some((f) => f.startsWith("satisfied-history-id"))).toBe(true)
  })

  test("rejects a terminal fragment with zero or ambiguous status tokens", () => {
    const zero = verifyActivationPartition(withTerminalRaw(legacyRaw.replace("Estado: COMPLETO", "Estado: pendiente")))
    const ambiguous = verifyActivationPartition(withTerminalRaw(legacyRaw.replace("Estado: COMPLETO", "Estado: COMPLETO ARCHIVADO")))
    expect(zero.failures.some((f) => f.startsWith("satisfied-history-token"))).toBe(true)
    expect(ambiguous.failures.some((f) => f.startsWith("satisfied-history-token"))).toBe(true)
  })

  test("rejects a satisfied-history reference with no proven imported-consumer edge", () => {
    const result = verifyActivationPartition(withCandidate(satisfiedFixture(), (c) => { c.sesiones[0].depende_de = [] }))
    expect(result.failures.some((f) => f.startsWith("satisfied-history-consumer"))).toBe(true)
  })

  test("rejects an unresolvable fragment locator", () => {
    const result = verifyActivationPartition({ ...satisfiedFixture(), resolveFragment: () => null })
    expect(result.failures.some((f) => f.includes("-resolve"))).toBe(true)
  })
})

describe("exact 75/7/4 activation partition", () => {
  const SUCCESSOR_IDS = ["S100", "S101", "S102", "S103", "S104", "S105", "S106", "S107", "S108"]
  const finalFixture = () => buildFixture({ importedCount: 73, successorIds: SUCCESSOR_IDS, satisfiedHistoryIds: DEFAULT_SATISFIED_HISTORY_IDS })

  test("accepts the exact 75/7/4 partition as 86 activation records", () => {
    const result = verifyActivationPartition(finalFixture())
    expect(result).toMatchObject({
      ok: true,
      observed: { fullSessionCount: 75, futureReferenceCount: 7, satisfiedHistoryCount: 4, activationRecordCount: 86 },
      failures: [],
    })
  })

  test("reports 73/0/0 against a candidate that has no references yet", () => {
    const values = withCandidate(finalFixture(), (c) => {
      c.sesiones = c.sesiones.filter((s) => !["S100", "S101"].includes(s.id))
      delete c.references
    })
    const result = verifyActivationPartition(values)
    expect(result.ok).toBe(false)
    expect(result.observed).toMatchObject({ fullSessionCount: 73, futureReferenceCount: 0, satisfiedHistoryCount: 0 })
  })

  test("rejects a missing full Session, an invented future reference, and a duplicated identity", () => {
    const values = finalFixture()
    const missing = verifyActivationPartition(withCandidate(values, (c) => { c.sesiones.pop() }))
    const invented = verifyActivationPartition(withCandidate(values, (c) => {
      c.references.future_successors.push({ ...c.references.future_successors[0], id: "S999" })
    }))
    const duplicate = verifyActivationPartition(withCandidate(values, (c) => { c.references.satisfied_history[0].id = c.sesiones[0].id }))

    expect(missing.failures.some((f) => f.startsWith("full-session-order"))).toBe(true)
    expect(invented.failures.some((f) => f.startsWith("future-reference-order"))).toBe(true)
    expect(duplicate.failures.some((f) => f.startsWith("identity-duplicate"))).toBe(true)
  })

  test("rejects an unapplied active dependency rewrite", () => {
    const values = finalFixture()
    const lineage = Bun.YAML.parse(values.lineageText)
    lineage.dependency_rewrites = [{ session: "I2", lifecycle: "active", old_dependencies: ["S9.5"], new_dependencies: ["S108"] }]
    const result = verifyActivationPartition({ ...values, lineageText: Bun.YAML.stringify(lineage) })
    expect(result.failures.some((f) => f.startsWith("dependency-rewrite:I2"))).toBe(true)
  })
})
