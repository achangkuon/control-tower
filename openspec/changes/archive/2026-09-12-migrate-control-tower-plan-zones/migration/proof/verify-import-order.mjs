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
  batch,
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
  const hasBatch = batch !== undefined
  const validHash = (value) => typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value)
  const validIds = Array.isArray(batch?.ids) && batch.ids.length > 0
    && batch.ids.every((id) => typeof id === "string" && id.trim()) && new Set(batch.ids).size === batch.ids.length

  if (!Array.isArray(inventory.value?.sessions)) failures.push("inventory-sessions: expected array")
  if (!Array.isArray(lineage.value?.closure_contract?.serialization?.imported_ids)) failures.push("lineage-imported-ids: expected array")
  if (!Array.isArray(candidate.value?.sesiones)) failures.push("candidate-sessions: expected array")
  if (hasBatch && (!batch || typeof batch !== "object" || Array.isArray(batch))) failures.push("batch: expected object")
  if (hasBatch && !validIds) failures.push("batch-ids: expected nonblank unique strings")
  for (const [field, actual, label] of [
    ["sourceHash", hash(inventoryText), "inventory"],
    ["lineageHash", hash(lineageText), "lineage"],
    ["priorCandidateHash", hash(priorCandidateText), "prior candidate"],
  ]) {
    const value = batch?.[field]
    const name = field.replace("Hash", "-hash").replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    if (hasBatch && !validHash(value)) failures.push(`batch-${name}: expected sha256:<64 lowercase hex>`)
    else if (hasBatch && value !== actual) failures.push(`batch-${name}: does not match ${label}`)
  }
  if (hasBatch && expectedCandidateCount !== undefined) failures.push("batch-count: expectedCandidateCount cannot be combined with batch")
  if (expectedInventoryCount !== undefined && inventoryIds.length !== expectedInventoryCount) {
    failures.push(`inventory-count: expected ${expectedInventoryCount}, observed ${inventoryIds.length}`)
  }
  const expectedNextCount = hasBatch && validIds ? priorCandidateIds.length + batch.ids.length : expectedCandidateCount ?? priorCandidateIds.length + 1
  if (candidateIds.length !== expectedNextCount && (!hasBatch || validIds)) {
    failures.push(`candidate-count: expected ${expectedNextCount}, observed ${candidateIds.length}`)
  }
  if (hasBatch && validIds) {
    const appendedIds = candidateIds.slice(priorCandidateIds.length)
    if (appendedIds.join("\0") !== batch.ids.join("\0")) {
      failures.push(`batch-ids: expected ${batch.ids.join(",")}, observed ${appendedIds.join(",")}`)
    }
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
      ...(hasBatch && validIds ? { batchIds: batch.ids } : {}),
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

// This proof validates batch structure and immutable input identity, not field meaning or delivery provenance.
export const parseCliArguments = (args) => {
  if (args.length === 0) return { batch: undefined, failures: [] }
  if (args.length === 1 && args[0] === "--batch-json") return { batch: null, failures: ["cli-args: missing --batch-json value"] }
  if (args.length !== 2 || args[0] !== "--batch-json") return { batch: null, failures: ["cli-args: unknown arguments"] }
  try {
    return { batch: JSON.parse(args[1]), failures: [] }
  } catch {
    return { batch: null, failures: ["cli-args: malformed --batch-json"] }
  }
}

if (import.meta.main) {
  const cli = parseCliArguments(process.argv.slice(2))
  const result = verifyImportOrder({ ...readCurrentProofInputs(), batch: cli.batch })
  const failures = [...result.failures, ...cli.failures]
  console.log(JSON.stringify({ ...result, ok: failures.length === 0, failures }))
  if (failures.length > 0) process.exitCode = 1
}
