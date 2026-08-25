import { sessionPlanSnapshotDigest } from "../contracts/session-plan-snapshot.mjs"
import { createParkingComposition } from "./parking-composition.mjs"

export const createParkingFacade = (ports) => {
  const { park } = createParkingComposition(ports)
  return Object.freeze({ park })
}

const escalationClasses = new Set(["contrato visible del producto", "operaciones irreversibles", "migraciones o pérdida de datos", "API pública", "seguridad y permisos", "dinero, precios o cuotas", "expansión de alcance", "dependencias o evidencia contradictorias"])
const strings = (values, empty = true) => Array.isArray(values) && (empty || values.length > 0)
  && values.every((value) => typeof value === "string" && value.length > 0) && new Set(values).size === values.length
const contamination = (value) => value && ["none", "active", "historical"].includes(value.state)
  && strings(value.session_ids) && (value.state === "none" ? value.session_ids.length === 0 : value.session_ids.length > 0)
const decisionsValid = (values) => Array.isArray(values) && values.every((decision) => {
  if (decision?.kind === "derivable") return [decision.body, decision.criterion, decision.authority].every((value) => typeof value === "string" && value.length > 0)
  return decision?.kind === "escala" && typeof decision.body === "string" && decision.body.length > 0
    && strings(decision.classes, false) && decision.classes.every((value) => escalationClasses.has(value))
    && ["open", "resolved"].includes(decision.resolution) && contamination(decision.contamination)
})
const inspect = (snapshot, currentDigest) => {
  if (snapshot?.schema !== "session-plan-snapshot" || snapshot.schema_version !== 1
      || snapshot.source?.digest_mode !== "raw-bytes" || typeof snapshot.source.content_digest !== "string"
      || snapshot.snapshot_digest !== sessionPlanSnapshotDigest(snapshot)) return { error: "MALFORMED_DECLARATION" }
  if (snapshot.source.content_digest !== currentDigest) return { error: "STALE_SNAPSHOT" }
  const target = snapshot.target, edges = snapshot.graph?.edges
  if (typeof target?.session_id !== "string" || typeof target.title !== "string" || typeof target.status !== "string"
      || !strings(target.depends_on) || !strings(target.area, false) || typeof target.resource !== "string" || !target.resource
      || !decisionsValid(target.decisions) || !Array.isArray(target.acceptance_criteria)
      || !Array.isArray(edges) || !edges.every((edge) => typeof edge?.from === "string" && typeof edge?.to === "string")) return { error: "MALFORMED_DECLARATION" }
  return { target, graph: snapshot.graph }
}
const root = (path) => typeof path === "string" && !/[\*{}]/u.test(path.split("/")[0]) ? path.split("/")[0] : null
const provablyDisjointArea = (left, right) => left.every((a) => right.every((b) => root(a) && root(b) && root(a) !== root(b)))
const reaches = (edges, from, to) => {
  const pending = [from], seen = new Set()
  while (pending.length) {
    const current = pending.pop()
    if (current === to) return true
    if (seen.has(current)) continue
    seen.add(current)
    for (const edge of edges) if (edge.from === current) pending.push(edge.to)
  }
  return false
}
const activeFor = (decisions, sessionId) => decisions.some((decision) => decision.kind === "escala"
  && decision.contamination.state === "active" && decision.contamination.session_ids.includes(sessionId))

export const evaluateDeclaredCompatibility = ({ current_plan_digest, blocked_snapshot, candidate_snapshot } = {}) => {
  if (typeof current_plan_digest !== "string") return Object.freeze({ eligible: false, reasons: ["MALFORMED_DECLARATION"] })
  let blocked, candidate
  try { blocked = inspect(blocked_snapshot, current_plan_digest); candidate = inspect(candidate_snapshot, current_plan_digest) }
  catch { return Object.freeze({ eligible: false, reasons: ["MALFORMED_DECLARATION"] }) }
  const identityErrors = [blocked.error, candidate.error].filter(Boolean)
  if (identityErrors.length) return Object.freeze({ eligible: false, reasons: Object.freeze([...new Set(identityErrors)]) })
  const reasons = [], edges = candidate.graph.edges
  if (JSON.stringify(blocked.graph) !== JSON.stringify(candidate.graph)) reasons.push("STALE_SNAPSHOT")
  if (candidate.target.status !== "LISTO") reasons.push("STATUS_NOT_LISTO")
  if (candidate.target.depends_on.includes(blocked.target.session_id) || blocked.target.depends_on.includes(candidate.target.session_id)
      || reaches(edges, blocked.target.session_id, candidate.target.session_id) || reaches(edges, candidate.target.session_id, blocked.target.session_id)) reasons.push("DEPENDENCY_CONFLICT")
  if (!provablyDisjointArea(blocked.target.area, candidate.target.area)) reasons.push("AREA_CONFLICT")
  if (blocked.target.resource !== "—" && candidate.target.resource !== "—") reasons.push("RESOURCE_CONFLICT")
  if (candidate.target.decisions.some((decision) => decision.kind === "escala" && decision.resolution === "open")
      || activeFor(blocked.target.decisions, candidate.target.session_id) || activeFor(candidate.target.decisions, blocked.target.session_id)) reasons.push("DECISION_CONFLICT")
  return Object.freeze({ eligible: reasons.length === 0, reasons: Object.freeze(reasons) })
}

const freeze = (value) => {
  if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value) }
  return value
}
export const readIndependentEligibility = ({ current_plan_digest, blocked_snapshot, candidate_snapshots } = {}) => {
  if (!Array.isArray(candidate_snapshots)) throw Object.assign(new Error("Candidate snapshots are required"), { code: "CT_INDEPENDENT_SELECTION_INVALID" })
  const candidates = candidate_snapshots.filter((candidate_snapshot) => evaluateDeclaredCompatibility({ current_plan_digest, blocked_snapshot, candidate_snapshot }).eligible)
  if (!candidates.length) return Object.freeze({ state: "STOP", reason: "NO_ELIGIBLE_SESSION" })
  return freeze({ state: "ELIGIBLE", candidates: structuredClone(candidates) })
}
