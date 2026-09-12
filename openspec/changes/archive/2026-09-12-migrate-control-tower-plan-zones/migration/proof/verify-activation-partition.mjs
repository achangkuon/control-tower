import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// This is the final lineage-aware verifier: it owns the migration-specific exactness
// that generic Radar deliberately does not (design.md "Bounded reference architecture
// amendment"). It never mutates lineage.yaml or candidate/plan.yaml.
export const DEFAULT_SATISFIED_HISTORY_IDS = ["S1.9", "S1.10", "S2.4", "S8.10"]
const TERMINAL_TOKENS = /\b(COMPLETO|ARCHIVADO)\b/g

const parse = (text, label) => {
  try {
    return { value: Bun.YAML.parse(text), failures: [] }
  } catch (error) {
    return { value: null, failures: [`${label}: ${error.message}`] }
  }
}

const eq = (a, b) => JSON.stringify(a ?? []) === JSON.stringify(b ?? [])

// Byte offset where each 1-indexed line starts, mirroring Radar's validateFragmentLocator.
const lineStarts = (raw) => {
  const bytes = Buffer.from(raw, "utf8")
  const starts = [0]
  for (let i = 0; i < bytes.length; i++) if (bytes[i] === 10) starts.push(i + 1)
  return { bytes, starts }
}

// Generic immutable fragment authentication: commit/path/blob shape, exact regular blob
// resolution, agreeing nonempty line/byte bounds, and an exact byte-for-byte hash.
const authenticateLocator = (loc, resolveFragment, label) => {
  const hex40 = (v) => typeof v === "string" && /^[0-9a-f]{40}$/.test(v)
  const safePath = (v) => typeof v === "string" && v.length > 0 && !v.startsWith("/") && !v.split("/").includes("..")
  if (!loc || typeof loc !== "object") return { failures: [`${label}: missing locator`] }
  if (!hex40(loc.commit)) return { failures: [`${label}-commit: expected 40-hex commit`] }
  if (!safePath(loc.path)) return { failures: [`${label}-path: expected safe repository-relative path`] }
  if (!hex40(loc.blob)) return { failures: [`${label}-blob: expected 40-hex blob`] }
  const resolved = resolveFragment?.(loc)
  if (!resolved || resolved.blobOid !== loc.blob || !["100644", "100755"].includes(resolved.mode)) {
    return { failures: [`${label}-resolve: locator does not prove an exact regular blob`] }
  }
  const { bytes, starts } = lineStarts(resolved.raw)
  const { line_start: ls, line_end: le, byte_start: bs, byte_end: be, fragment_sha256: want } = loc
  const boundsSane = Number.isInteger(ls) && ls >= 1 && Number.isInteger(le) && le >= ls
    && Number.isInteger(bs) && bs >= 0 && Number.isInteger(be) && be > bs && be <= bytes.length
  if (!boundsSane) return { failures: [`${label}-bounds: invalid line or byte bounds`] }
  const failures = []
  const lineEndByte = le < starts.length ? starts[le] : bytes.length
  if (le > starts.length || starts[ls - 1] !== bs || lineEndByte !== be) {
    failures.push(`${label}-bounds: line interval does not match byte interval`)
  }
  const digest = createHash("sha256").update(bytes.subarray(bs, be)).digest("hex")
  if (digest !== want) failures.push(`${label}-hash: sha256 does not match exact bytes`)
  return { failures, text: bytes.subarray(bs, be).toString("utf8") }
}

// Historical terminal fragments: the located bytes must contain the exact reference ID
// and exactly one terminal status token from the closed COMPLETO|ARCHIVADO set.
const authenticateSatisfiedHistory = (entry, resolveFragment) => {
  const label = `satisfied_history[${entry?.id ?? "?"}].terminal_source`
  const { failures, text } = authenticateLocator(entry?.terminal_source, resolveFragment, label)
  if (failures.length || text === undefined) return failures
  if (!text.includes(entry.id)) failures.push(`satisfied-history-id:${entry.id}: fragment omits the exact reference ID`)
  const tokens = text.match(TERMINAL_TOKENS) ?? []
  if (tokens.length !== 1) failures.push(`satisfied-history-token:${entry.id}: expected exactly one terminal status token, observed ${tokens.length}`)
  return failures
}

// Imported-consumer edges: a consumer's own bounded, provenance-proven frozen Session
// source must literally contain the exact `Depende de` edge to this historical ID.
const provesConsumerEdge = (sessions, resolveFragment, id) => sessions
  .filter((s) => Array.isArray(s.depende_de) && s.depende_de.includes(id) && s.importacion_legacy)
  .some((s) => {
    const { origen_commit: commit, origen_ruta: path, origen_blob: blob, origen_encabezado: heading } = s.importacion_legacy
    const resolved = resolveFragment?.({ commit, path, blob })
    if (!resolved || typeof heading !== "string") return false
    const at = resolved.raw.indexOf(heading)
    if (at === -1) return false
    const level = heading.match(/^#+/)?.[0].length ?? 1
    const rest = resolved.raw.slice(at + heading.length)
    const next = rest.search(new RegExp(`\\n#{1,${level}}[^#]`))
    const section = next === -1 ? rest : rest.slice(0, next)
    return section.split("\n").some((line) => /Depende de/i.test(line) && line.includes(id))
  })

// Assignment-to-lineage mapping proof: raw assignment Markdown is never normalized; the
// lineage ledger's canonical future fields are the sole authority, compared byte-for-byte.
const compareCanonical = (id, actual, successor) => {
  const failures = []
  if (actual.result !== successor?.resultado) failures.push(`canonical-result:${id}`)
  if (actual.zone !== successor?.zona) failures.push(`canonical-zone:${id}`)
  if (!eq(actual.dependencies, successor?.dependencies)) failures.push(`canonical-dependencies:${id}`)
  if (!eq(actual.foundations, successor?.cimientos)) failures.push(`canonical-foundations:${id}`)
  if (!eq(actual.replaces, successor?.reemplaza)) failures.push(`canonical-replaces:${id}`)
  return failures
}

export const verifyActivationPartition = ({
  lineageText,
  candidateText,
  resolveFragment,
  satisfiedHistoryIds = DEFAULT_SATISFIED_HISTORY_IDS,
  horizonCeiling = 2,
}) => {
  const lineage = parse(lineageText, "lineage")
  const candidate = parse(candidateText, "candidate")
  const failures = [...lineage.failures, ...candidate.failures]
  const sessions = Array.isArray(candidate.value?.sesiones) ? candidate.value.sesiones : []
  const future = Array.isArray(candidate.value?.references?.future_successors) ? candidate.value.references.future_successors : []
  const satisfied = Array.isArray(candidate.value?.references?.satisfied_history) ? candidate.value.references.satisfied_history : []
  const importedIds = Array.isArray(lineage.value?.closure_contract?.serialization?.imported_ids) ? lineage.value.closure_contract.serialization.imported_ids : []
  const required = Array.isArray(lineage.value?.closure_contract?.required_successors) ? lineage.value.closure_contract.required_successors : []
  const horizonSelected = required.slice(0, horizonCeiling)
  const horizonDeferred = required.slice(horizonCeiling)
  const successorsById = new Map((lineage.value?.successors ?? []).map((s) => [s.id, s]))
  const sessionIds = sessions.map((s) => s.id)
  const futureIds = future.map((f) => f.id)
  const satisfiedIds = satisfied.map((s) => s.id)

  const seen = new Set()
  for (const id of [...sessionIds, ...futureIds, ...satisfiedIds]) {
    if (seen.has(id)) failures.push(`identity-duplicate: ${id}`)
    seen.add(id)
  }

  // A length difference always changes the joined string too, so one ordered-identity
  // comparison proves both the exact IDs/order and the exact count in a single check.
  const expectedSessionIds = [...importedIds, ...horizonSelected]
  if (sessionIds.join("\0") !== expectedSessionIds.join("\0")) {
    failures.push(`full-session-order: expected ${expectedSessionIds.length} imported-then-horizon IDs, observed ${sessionIds.length}`)
  }
  if (futureIds.join("\0") !== horizonDeferred.join("\0")) {
    failures.push(`future-reference-order: expected ${horizonDeferred.join(",")}, observed ${futureIds.join(",")}`)
  }
  if (satisfiedIds.join("\0") !== satisfiedHistoryIds.join("\0")) {
    failures.push(`satisfied-history-order: expected ${satisfiedHistoryIds.join(",")}, observed ${satisfiedIds.join(",")}`)
  }

  for (const f of future) {
    const label = `future_successors[${f?.id ?? "?"}].assignment_source`
    failures.push(...authenticateLocator(f?.assignment_source, resolveFragment, label).failures)
    failures.push(...compareCanonical(f?.id, f ?? {}, successorsById.get(f?.id)))
  }
  for (const id of horizonSelected) {
    const session = sessions.find((s) => s.id === id)
    const successor = successorsById.get(id)
    if (session && successor) {
      failures.push(...compareCanonical(id, {
        result: session.resultado, zone: session.zona, dependencies: session.depende_de, foundations: session.cimientos, replaces: session.reemplaza,
      }, successor))
    }
  }
  for (const s of satisfied) {
    failures.push(...authenticateSatisfiedHistory(s, resolveFragment))
    if (!provesConsumerEdge(sessions, resolveFragment, s.id)) {
      failures.push(`satisfied-history-consumer:${s.id}: no proven imported consumer contains the Depende de edge`)
    }
  }

  const byId = new Map(sessions.map((s) => [s.id, s]))
  for (const rewrite of lineage.value?.dependency_rewrites ?? []) {
    if (rewrite.lifecycle !== "active") continue
    const session = byId.get(rewrite.session)
    if (session && !eq(session.depende_de, rewrite.new_dependencies)) {
      failures.push(`dependency-rewrite:${rewrite.session}: expected ${JSON.stringify(rewrite.new_dependencies)}, observed ${JSON.stringify(session.depende_de ?? [])}`)
    }
  }

  return {
    ok: failures.length === 0,
    observed: {
      fullSessionCount: sessionIds.length,
      futureReferenceCount: futureIds.length,
      satisfiedHistoryCount: satisfiedIds.length,
      activationRecordCount: sessionIds.length + futureIds.length + satisfiedIds.length,
      horizonSelected,
      horizonDeferred,
    },
    failures,
  }
}

const root = resolve(import.meta.dir, "../../../../..")
const read = (path) => readFileSync(resolve(root, path), "utf8")

const gitResolveFragment = (loc) => {
  try {
    const entry = execFileSync("git", ["-C", root, "ls-tree", loc.commit, "--", loc.path], { encoding: "utf8" }).trim()
    const [mode, type, blobOid] = entry.split(/\s+/)
    if (type !== "blob") return null
    const raw = execFileSync("git", ["-C", root, "cat-file", "blob", loc.blob], { encoding: "utf8" })
    return { mode, blobOid, raw }
  } catch {
    return null
  }
}

export const readCurrentProofInputs = () => ({
  lineageText: read("openspec/changes/migrate-control-tower-plan-zones/migration/lineage.yaml"),
  candidateText: read("openspec/changes/migrate-control-tower-plan-zones/migration/candidate/plan.yaml"),
  resolveFragment: gitResolveFragment,
})

if (import.meta.main) {
  const result = verifyActivationPartition(readCurrentProofInputs())
  console.log(JSON.stringify(result))
  if (!result.ok) process.exitCode = 1
}
