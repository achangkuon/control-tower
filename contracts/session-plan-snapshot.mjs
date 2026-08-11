import { digestArtifact } from "./canonicalize.mjs"
import { failContract } from "./errors.mjs"
import { validate } from "./validate.mjs"

const invalid = (message, reason, path) => failContract("CT_SCHEMA_INVALID", message, [{ reason, path }])
const sessionIdPattern = /^S[1-9][0-9]*\.[1-9][0-9]*$/u
const statuses = new Map([
  ["📋", "PLANIFICADO"], ["🟢", "LISTO"], ["🔵", "EN CURSO"], ["🔴", "BLOQUEADO"],
  ["🟡", "DIFERIDO"], ["✅", "COMPLETO"], ["📚", "ARCHIVADO"],
])
const escalationClasses = [
  "dependencias o evidencia contradictorias", "contrato visible del producto", "migraciones o pérdida de datos",
  "operaciones irreversibles", "seguridad y permisos", "dinero, precios o cuotas", "expansión de alcance", "API pública",
]

const exactlyOne = (source, pattern, path) => {
  const matches = [...source.matchAll(pattern)]
  if (matches.length !== 1) invalid(`Expected exactly one ${path}`, matches.length ? "duplicate" : "missing", path)
  return matches[0]
}
const sortedUnique = (values, path) => {
  if (new Set(values).size !== values.length) invalid(`${path} must be unique`, "duplicate", path)
  return [...values].sort()
}
const decodePlan = (bytes) => {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes) }
  catch { invalid("Plan bytes must be valid UTF-8", "encoding", "plan_bytes") }
}

const sessionSections = (text) => {
  const headings = [...text.matchAll(/^## Sesión ([1-9][0-9]*\.[1-9][0-9]*) — (.+)$/gmu)]
  const sections = new Map()
  for (const heading of headings) {
    const id = `S${heading[1]}`
    if (sections.has(id)) invalid("Plan-local Session heading must be unique", "duplicate", id)
    const next = text.indexOf("\n## ", heading.index + heading[0].length)
    sections.set(id, { id, title: heading[2].trim(), source: text.slice(heading.index, next < 0 ? text.length : next) })
  }
  return sections
}

const parseGraph = (text, sections) => {
  const heading = exactlyOne(text, /^## Grafo de dependencias$/gmu, "graph.section")
  const next = text.indexOf("\n## ", heading.index + heading[0].length)
  const section = text.slice(heading.index, next < 0 ? text.length : next)
  const fence = exactlyOne(section, /^```mermaid[ \t]*\n([\s\S]*?)^```[ \t]*$/gmu, "graph.mermaid")
  const lines = fence[1].split("\n").map((line) => line.trim()).filter(Boolean)
  if (!/^graph (?:LR|RL|TB|TD|BT)$/u.test(lines.shift() ?? "")) invalid("Graph direction is invalid", "type", "graph.direction")
  const aliases = new Map(), declaredIds = new Set(), unresolvedEdges = []
  for (const line of lines) {
    const declarations = [...line.matchAll(/([A-Za-z][A-Za-z0-9_]*)\["([^"]+)"\]/gu)]
    for (const declaration of declarations) {
      const [, alias, label] = declaration
      const id = label.match(/^(S[1-9][0-9]*\.[1-9][0-9]*)(?:\s|$)/u)?.[1]
      if (!id) invalid("Graph label must start with a Session ID", "type", "graph.nodes")
      if (aliases.has(alias) || declaredIds.has(id)) invalid("Graph node declarations must be unique", "duplicate", "graph.nodes")
      aliases.set(alias, id); declaredIds.add(id)
    }
    const endpoints = line.split(/\s*-->\s*/u)
    if (endpoints.length > 2) invalid("Graph edge must have two endpoints", "ambiguous", "graph.edges")
    if (endpoints.length === 2) {
      const edge = endpoints.map((part) => part.match(/^([A-Za-z][A-Za-z0-9_]*)/u)?.[1])
      if (edge.some((alias) => !alias)) invalid("Graph edge endpoint is malformed", "type", "graph.edges")
      unresolvedEdges.push(edge)
    } else if (!declarations.length) invalid("Graph line is not a node or edge", "type", "graph")
  }
  const edges = unresolvedEdges.map(([fromAlias, toAlias]) => {
    const from = aliases.get(fromAlias), to = aliases.get(toAlias)
    if (!from || !to) invalid("Graph edge endpoint must resolve", "unresolved", "graph.edges")
    return { from, to }
  }).sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to))
  const ids = [...declaredIds]
  return {
    local_session_ids: ids.filter((id) => sections.has(id)).sort(),
    external_session_ids: ids.filter((id) => !sections.has(id)).sort(),
    edges,
  }
}

const parseDependencies = (section) => {
  const field = exactlyOne(section, /^\*\*(?:Depende de|Dependencias):\*\* (.+)$/gmu, "target.depends_on")[1].trim()
  if (field === "—") return []
  const ids = [...field.matchAll(/`(S[1-9][0-9]*\.[1-9][0-9]*)`/gu)].map((match) => match[1])
  if (!ids.length) invalid("Dependencies must declare Session IDs", "missing", "target.depends_on")
  return sortedUnique(ids, "target.depends_on")
}

const decisionItems = (section, decisionField, criteriaHeader) => {
  if (decisionField[1].trim() === "—") return []
  if (decisionField[1].trim()) invalid("Decisions field suffix is invalid", "type", "target.decisions")
  const block = section.slice(decisionField.index + decisionField[0].length, criteriaHeader.index)
    .split(/^### /mu)[0]
  const items = []
  for (const line of block.split("\n")) {
    if (/^- `/u.test(line)) items.push(line.trim())
    else if (line.trim() && items.length) items[items.length - 1] += ` ${line.trim()}`
  }
  if (!items.length) invalid("Decisions must be declared or explicitly empty", "missing", "target.decisions")
  return items
}

const parseClasses = (item) => {
  const label = exactlyOne(item, /\*\*Clase:\*\*/gu, "target.decisions.classes")
  const classText = item.slice(label.index + label[0].length).split(/\.(?:\s|$)/u)[0].trim()
  const found = escalationClasses.map((value) => ({ value, index: classText.indexOf(value) }))
    .filter(({ index }) => index >= 0).sort((left, right) => left.index - right.index).map(({ value }) => value)
  let residue = classText
  for (const value of found) residue = residue.replace(value, "")
  if (!found.length || residue.replace(/\s|,|\by\b|\be\b/gu, "")) invalid("Escalation class is invalid", "type", "target.decisions.classes")
  return found
}

const parseDecision = (item) => {
  const prefix = item.match(/^- `([^`]+)` — (.+)$/u)
  if (!prefix || !["derivable", "escala"].includes(prefix[1])) invalid("Decision kind is invalid", "type", "target.decisions")
  const kind = prefix[1], content = prefix[2]
  if (kind === "derivable") {
    const criterion = exactlyOne(content, /\*\*Criterio:\*\*/gu, "target.decisions.criterion")
    const authority = exactlyOne(content, /\*\*Autoridad:\*\*/gu, "target.decisions.authority")
    if (criterion.index >= authority.index) invalid("Decision labels are out of order", "conflict", "target.decisions")
    const body = content.slice(0, criterion.index).trim()
    const criterionText = content.slice(criterion.index + criterion[0].length, authority.index).trim()
    const authorityText = content.slice(authority.index + authority[0].length).trim()
    if (!body || !criterionText || !authorityText) invalid("Derivable decision is incomplete", "missing", "target.decisions")
    return { kind, body, criterion: criterionText, authority: authorityText }
  }
  const classLabel = exactlyOne(content, /\*\*Clase:\*\*/gu, "target.decisions.classes")
  const body = content.slice(0, classLabel.index).trim()
  if (!body) invalid("Escalating decision body is missing", "missing", "target.decisions")
  const contaminationLabels = [...content.matchAll(/\*\*(Contamina|Contaminaba):\*\*/gu)]
  if (contaminationLabels.length > 1) invalid("Contamination label is ambiguous", "duplicate", "target.decisions.contamination")
  let contamination = { state: "none", session_ids: [] }
  if (contaminationLabels.length) {
    const label = contaminationLabels[0]
    const tail = content.slice(label.index + label[0].length)
    const tokens = [...tail.matchAll(/`([^`]+)`/gu)].map((match) => match[1])
    if (!tokens.length || tokens.some((id) => !sessionIdPattern.test(id))) invalid("Contamination references are invalid", "unresolved", "target.decisions.contamination")
    contamination = { state: label[1] === "Contamina" ? "active" : "historical", session_ids: sortedUnique(tokens, "target.decisions.contamination") }
  }
  return { kind, body, classes: parseClasses(content), resolution: /\*\*RESUELT[AO]\b/u.test(content) ? "resolved" : "open", contamination }
}

const parseTarget = (record) => {
  const section = record.source
  const state = exactlyOne(section, /^\*\*Estado:\*\* (\S+) (PLANIFICADO|LISTO|EN CURSO|BLOQUEADO|DIFERIDO|COMPLETO|ARCHIVADO)(?:\s+—.*)?$/gmu, "target.status")
  if (statuses.get(state[1]) !== state[2]) invalid("Status marker does not match status", "conflict", "target.status")
  const areaField = exactlyOne(section, /^\*\*Área:\*\* (.+)$/gmu, "target.area")[1]
  const area = sortedUnique([...areaField.matchAll(/`([^`]+)`/gu)].map((match) => match[1]), "target.area")
  if (!area.length) invalid("Area must declare path tokens", "missing", "target.area")
  const resource = exactlyOne(section, /^\*\*Recurso:\*\* (.+)$/gmu, "target.resource")[1].trim()
  const criteriaHeader = exactlyOne(section, /^\*\*Criterios de aceptación de (S[1-9][0-9]*\.[1-9][0-9]*)\*\*(?:\s+—.*)?$/gmu, "target.acceptance_criteria")
  if (criteriaHeader[1] !== record.id) invalid("Criteria heading must match target", "conflict", "target.acceptance_criteria")
  const criteriaBlock = section.slice(criteriaHeader.index + criteriaHeader[0].length)
  const checkboxLines = criteriaBlock.split("\n").filter((line) => /^- \[/u.test(line))
  const acceptanceCriteria = checkboxLines.map((line) => {
    const match = line.match(/^- \[([ xX])\] (.+)$/u)
    if (!match) invalid("Acceptance criterion must be binary", "type", "target.acceptance_criteria")
    return { checked: match[1].toLowerCase() === "x", text: match[2].trim() }
  })
  if (!acceptanceCriteria.length) invalid("At least one binary acceptance criterion is required", "missing", "target.acceptance_criteria")
  const decisionField = exactlyOne(section, /^\*\*Decisiones:\*\*(.*)$/gmu, "target.decisions")
  const decisions = decisionItems(section, decisionField, criteriaHeader).map(parseDecision)
  return {
    session_id: record.id, title: record.title, status: state[2], depends_on: parseDependencies(section), area,
    resource, decisions, acceptance_criteria: acceptanceCriteria,
  }
}

export function sessionPlanSnapshotDigest(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) invalid("Snapshot must be an object", "type", "snapshot")
  const { snapshot_digest: _snapshotDigest, ...identity } = snapshot
  return digestArtifact(identity, "rfc8785-jcs")
}

export function parseSessionPlanSnapshot(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid("Parser input must be an object", "type", "input")
  const { plan_bytes: planBytes, target_session_id: targetSessionId, expected_plan_digest: expectedDigest } = input
  if (!(planBytes instanceof Uint8Array)) invalid("Plan content must be bytes", "type", "plan_bytes")
  if (typeof targetSessionId !== "string" || !sessionIdPattern.test(targetSessionId)) invalid("Target Session ID is invalid", "type", "target_session_id")
  const contentDigest = digestArtifact(planBytes, "raw-bytes")
  if (expectedDigest !== undefined && expectedDigest !== contentDigest) invalid("Plan digest does not match exact bytes", "digest_mismatch", "expected_plan_digest")
  const text = decodePlan(planBytes), sections = sessionSections(text), record = sections.get(targetSessionId)
  if (!record) invalid("Target Session heading must resolve exactly once", "unresolved", "target_session_id")
  const graph = parseGraph(text, sections)
  const identity = {
    schema: "session-plan-snapshot", schema_version: 1,
    source: { digest_mode: "raw-bytes", content_digest: contentDigest },
    target: parseTarget(record), graph,
  }
  return validate("sessionPlanSnapshot", { ...identity, snapshot_digest: sessionPlanSnapshotDigest(identity) })
}
