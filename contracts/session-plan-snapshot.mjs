import { digestArtifact } from "./canonicalize.mjs"
import { failContract } from "./errors.mjs"
import { validate } from "./validate.mjs"

const invalid = (message, reason, path) => failContract("CT_SCHEMA_INVALID", message, [{ reason, path }])
const sessionIdPattern = /^S[1-9][0-9]*\.[1-9][0-9]*$/u
const statuses = new Map([
  ["📋", "PLANIFICADO"], ["🟢", "LISTO"], ["🔵", "EN CURSO"], ["🔴", "BLOQUEADO"],
  ["🟡", "DIFERIDO"], ["✅", "COMPLETO"], ["📚", "ARCHIVADO"],
])

const exactlyOne = (source, pattern, path) => {
  const matches = [...source.matchAll(pattern)]
  if (matches.length !== 1) invalid(`Expected exactly one ${path}`, matches.length ? "duplicate" : "missing", path)
  return matches[0]
}

const decodePlan = (bytes) => {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes) }
  catch { invalid("Plan bytes must be valid UTF-8", "encoding", "plan_bytes") }
}

const minimalTarget = (text, targetSessionId) => {
  const headings = [...text.matchAll(/^## Sesión ([1-9][0-9]*\.[1-9][0-9]*) — (.+)$/gmu)]
    .filter((match) => `S${match[1]}` === targetSessionId)
  if (headings.length !== 1) invalid("Target Session heading must resolve exactly once", headings.length ? "duplicate" : "unresolved", "target_session_id")
  const heading = headings[0]
  const nextHeading = text.indexOf("\n## ", heading.index + heading[0].length)
  const section = text.slice(heading.index, nextHeading < 0 ? text.length : nextHeading)
  const state = exactlyOne(section, /^\*\*Estado:\*\* (\S+) (PLANIFICADO|LISTO|EN CURSO|BLOQUEADO|DIFERIDO|COMPLETO|ARCHIVADO)$/gmu, "target.status")
  if (statuses.get(state[1]) !== state[2]) invalid("Status marker does not match status", "conflict", "target.status")
  exactlyOne(section, /^\*\*(?:Depende de|Dependencias):\*\* —$/gmu, "target.depends_on")
  const areaLine = exactlyOne(section, /^\*\*Área:\*\* (.+)$/gmu, "target.area")[1]
  const area = [...areaLine.matchAll(/`([^`]+)`/gu)].map((match) => match[1]).sort()
  if (!area.length || areaLine.replace(/`[^`]+`/gu, "").trim()) invalid("Area must contain only path tokens", "type", "target.area")
  const resource = exactlyOne(section, /^\*\*Recurso:\*\* (.+)$/gmu, "target.resource")[1].trim()
  exactlyOne(section, /^\*\*Decisiones:\*\* —$/gmu, "target.decisions")
  const criteriaHeader = exactlyOne(section, /^\*\*Criterios de aceptación de (S[1-9][0-9]*\.[1-9][0-9]*)\*\*$/gmu, "target.acceptance_criteria")
  if (criteriaHeader[1] !== targetSessionId) invalid("Criteria heading must match target", "conflict", "target.acceptance_criteria")
  const criteriaSource = section.slice(criteriaHeader.index + criteriaHeader[0].length)
  const acceptanceCriteria = [...criteriaSource.matchAll(/^- \[([ xX])\] (.+)$/gmu)]
    .map((match) => ({ checked: match[1].toLowerCase() === "x", text: match[2].trim() }))
  if (!acceptanceCriteria.length) invalid("At least one binary acceptance criterion is required", "missing", "target.acceptance_criteria")
  return {
    session_id: targetSessionId, title: heading[2].trim(), status: state[2], depends_on: [], area,
    resource, decisions: [], acceptance_criteria: acceptanceCriteria,
  }
}

export function sessionPlanSnapshotDigest(snapshot) {
  const { snapshot_digest: _snapshotDigest, ...identity } = snapshot
  return digestArtifact(identity, "rfc8785-jcs")
}

export function parseSessionPlanSnapshot(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid("Parser input must be an object", "type", "input")
  const { plan_bytes: planBytes, target_session_id: targetSessionId, expected_plan_digest: expectedDigest } = input
  if (!(planBytes instanceof Uint8Array)) invalid("Plan content must be bytes", "type", "plan_bytes")
  if (!sessionIdPattern.test(targetSessionId)) invalid("Target Session ID is invalid", "type", "target_session_id")
  const contentDigest = digestArtifact(planBytes, "raw-bytes")
  if (expectedDigest !== undefined && expectedDigest !== contentDigest) invalid("Plan digest does not match exact bytes", "digest_mismatch", "expected_plan_digest")
  const target = minimalTarget(decodePlan(planBytes), targetSessionId)
  const identity = {
    schema: "session-plan-snapshot", schema_version: 1,
    source: { digest_mode: "raw-bytes", content_digest: contentDigest },
    target, graph: { local_session_ids: [targetSessionId], external_session_ids: [], edges: [] },
  }
  return validate("sessionPlanSnapshot", { ...identity, snapshot_digest: sessionPlanSnapshotDigest(identity) })
}
