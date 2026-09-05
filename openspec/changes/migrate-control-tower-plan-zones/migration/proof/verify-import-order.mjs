import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`
const parse = (text, label) => {
  try {
    return { value: Bun.YAML.parse(text), failures: [] }
  } catch (error) {
    return { value: null, failures: [`${label}: ${error.message}`] }
  }
}

export const verifyImportOrder = ({
  inventoryText,
  lineageText,
  candidateText,
  priorCandidateText,
  expectedInventoryCount,
  expectedCandidateCount,
}) => {
  const inventory = parse(inventoryText, "inventory")
  const lineage = parse(lineageText, "lineage")
  const candidate = parse(candidateText, "candidate")
  const priorCandidate = parse(priorCandidateText, "prior-candidate")
  const failures = [...inventory.failures, ...lineage.failures, ...candidate.failures, ...priorCandidate.failures]
  const inventoryIds = Array.isArray(inventory.value?.sessions) ? inventory.value.sessions.map(({ session_id }) => session_id) : []
  const importedIds = Array.isArray(lineage.value?.closure_contract?.serialization?.imported_ids)
    ? lineage.value.closure_contract.serialization.imported_ids
    : []
  const candidateIds = Array.isArray(candidate.value?.sesiones) ? candidate.value.sesiones.map(({ id }) => id) : []
  const priorCandidateIds = Array.isArray(priorCandidate.value?.sesiones) ? priorCandidate.value.sesiones.map(({ id }) => id) : []
  const expectedNextCount = expectedCandidateCount ?? priorCandidateIds.length + 1

  if (!Array.isArray(inventory.value?.sessions)) failures.push("inventory-sessions: expected array")
  if (!Array.isArray(lineage.value?.closure_contract?.serialization?.imported_ids)) failures.push("lineage-imported-ids: expected array")
  if (!Array.isArray(candidate.value?.sesiones)) failures.push("candidate-sessions: expected array")
  if (expectedInventoryCount !== undefined && inventoryIds.length !== expectedInventoryCount) {
    failures.push(`inventory-count: expected ${expectedInventoryCount}, observed ${inventoryIds.length}`)
  }
  if (candidateIds.length !== expectedNextCount) {
    failures.push(`candidate-count: expected ${expectedNextCount}, observed ${candidateIds.length}`)
  }
  if (inventoryIds.join("\0") !== importedIds.join("\0")) failures.push("source-order: inventory and lineage imported IDs differ")

  const seen = new Set()
  for (const id of candidateIds) {
    if (seen.has(id)) failures.push(`candidate-duplicate: ${id}`)
    seen.add(id)
  }
  for (const [index, id] of candidateIds.entries()) {
    const expected = importedIds[index]
    if (!importedIds.includes(id)) failures.push(`candidate-invented: ${id}`)
    if (expected !== id) failures.push(`candidate-order: expected ${expected ?? "end"} at position ${index + 1}, observed ${id}`)
  }
  if (!candidateText.startsWith(priorCandidateText)) {
    failures.push("prior-prefix: candidate does not preserve committed HEAD bytes")
  }

  return {
    ok: failures.length === 0,
    observed: {
      inventoryCount: inventoryIds.length,
      priorCandidateCount: priorCandidateIds.length,
      candidateCount: candidateIds.length,
      lastCandidateId: candidateIds.at(-1) ?? null,
      nextCursor: importedIds[candidateIds.length] ?? null,
    },
    hashes: {
      source: hash(inventoryText),
      lineage: hash(lineageText),
      priorCandidate: hash(priorCandidateText),
      candidate: hash(candidateText),
    },
    failures,
  }
}

const root = resolve(import.meta.dir, "../../../../..")
const relative = (path) => resolve(root, path)
const read = (path) => readFileSync(relative(path), "utf8")
const priorCandidate = () => execFileSync("git", [
  "show",
  "HEAD:openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml",
], { cwd: root, encoding: "utf8" })

export const readCurrentProofInputs = () => ({
  inventoryText: read("openspec/changes/migrate-control-tower-plan-zones/migration/source-inventory.yaml"),
  lineageText: read("openspec/changes/migrate-control-tower-plan-zones/migration/lineage.yaml"),
  candidateText: read("openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml"),
  priorCandidateText: priorCandidate(),
})

if (import.meta.main) {
  const result = verifyImportOrder(readCurrentProofInputs())
  console.log(JSON.stringify(result))
  if (!result.ok) process.exitCode = 1
}
