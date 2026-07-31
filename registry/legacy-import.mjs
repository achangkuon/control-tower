import { canonicalize } from "../contracts/canonicalize.mjs"
import { validate } from "../contracts/validate.mjs"

const HINT_FIELDS = Object.freeze(["id", "kind", "name", "root"])
const ENTRY_FIELDS = Object.freeze(["project_id", "aliases", "canonical_root", "git_common_dir", "expected_remote",
  "main_branch", "main_session", "manifest_path", "roadmap_path", "main_store_path", "allowed_hosts",
  "registry_entry_revision", "extensions"])
const CONFLICTS = Object.freeze([
  ["project_id", "PROJECT_ID_CONFLICT"], ["aliases", "ALIAS_CONFLICT"],
  ["canonical_root", "CANONICAL_ROOT_CONFLICT"], ["git_common_dir", "GIT_COMMON_DIR_CONFLICT"],
  ["main_store_path", "MAIN_STORE_PATH_CONFLICT"],
])
const CODE_ORDER = Object.freeze([
  "INVALID_REQUEST", "MALFORMED_RECORD", "DUPLICATE_ID", "DERIVATION_INVALID", "DERIVATION_FAILED",
  "INCOMPLETE_FACTS", "CONTRACT_REJECTED", "REGISTRY_READ_FAILED", "REGISTRY_INVALID", ...CONFLICTS.map(([, code]) => code),
])
const codeRank = new Map(CODE_ORDER.map((code, index) => [code, index]))
const classRank = (code) => code === "DERIVATION_FAILED" ? codeRank.get("DERIVATION_INVALID")
  : code === "REGISTRY_INVALID" ? codeRank.get("REGISTRY_READ_FAILED") : codeRank.get(code)
const fieldRank = new Map(ENTRY_FIELDS.map((field, index) => [field, index]))
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
const exactKeys = (value, expected) => plain(value) && Object.keys(value).length === expected.length
  && expected.every((key) => Object.hasOwn(value, key))
const issue = (code, index, field, kind) => ({ code, index, field, kind })
const item = (index, status = "rejected", candidate = null, canonical = null) => ({ index, status, candidate, canonical })
const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}
const validHint = (value) => exactKeys(value, HINT_FIELDS) && HINT_FIELDS.every((field) => typeof value[field] === "string")
const validIncomplete = (outcome) => {
  if (!exactKeys(outcome, ["status", "missing", "unverifiable"]) || outcome.status !== "incomplete"
      || !Array.isArray(outcome.missing) || !Array.isArray(outcome.unverifiable)) return false
  const fields = [...outcome.missing, ...outcome.unverifiable]
  return fields.length > 0 && new Set(fields).size === fields.length && fields.every((field) => ENTRY_FIELDS.includes(field))
}
const sortIssues = (issues) => issues.sort((left, right) => {
  const category = classRank(left.code) - classRank(right.code)
  if (category) return category
  if (left.kind === "derivation") {
    const index = left.index - right.index
    return index || codeRank.get(left.code) - codeRank.get(right.code)
  }
  if (left.code === "INCOMPLETE_FACTS") {
    const index = left.index - right.index
    if (index) return index
    const kind = (left.kind === "missing" ? 0 : 1) - (right.kind === "missing" ? 0 : 1)
    if (kind) return kind
    const field = fieldRank.get(left.field) - fieldRank.get(right.field)
    if (field) return field
  }
  return codeRank.get(left.code) - codeRank.get(right.code) || (left.index ?? -1) - (right.index ?? -1)
})

export const preflightLegacyImport = (records, { deriveFacts, registryReader } = {}) => {
  const issues = [], items = []
  const registry = { status: "not-requested", revision: null }
  const evidence = { authoritative_writes: 0, registry_operation: "none" }
  if (!Array.isArray(records)) return deepFreeze({ ok: false, items,
    issues: [issue("INVALID_REQUEST", null, "records", "request")], registry, evidence })

  const seen = new Set()
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (!validHint(record)) {
      items.push(item(index)); issues.push(issue("MALFORMED_RECORD", index, "record", "record")); continue
    }
    if (seen.has(record.id)) {
      items.push(item(index)); issues.push(issue("DUPLICATE_ID", index, "record", "duplicate")); continue
    }
    seen.add(record.id)
    let outcome
    try { outcome = deriveFacts(deepFreeze({ ...record }), { index }) }
    catch { items.push(item(index)); issues.push(issue("DERIVATION_FAILED", index, null, "derivation")); continue }
    if (validIncomplete(outcome)) {
      items.push(item(index))
      for (const kind of ["missing", "unverifiable"]) for (const field of outcome[kind]) {
        issues.push(issue("INCOMPLETE_FACTS", index, field, kind))
      }
      continue
    }
    if (exactKeys(outcome, ["status"]) && outcome.status === "invalid") {
      items.push(item(index)); issues.push(issue("DERIVATION_INVALID", index, null, "derivation")); continue
    }
    if (!exactKeys(outcome, ["status", "entry"]) || outcome.status !== "verified") {
      items.push(item(index)); issues.push(issue("DERIVATION_INVALID", index, null, "derivation")); continue
    }
    try {
      const wrapper = validate("projectRegistry", { schema: "project-registry", schema_version: 1,
        registry_revision: 1, projects: [outcome.entry] })
      const candidate = wrapper.projects[0]
      items.push(item(index, "ready", candidate, canonicalize(candidate)))
    } catch { items.push(item(index)); issues.push(issue("CONTRACT_REJECTED", index, null, "contract")) }
  }

  let current = null
  if (registryReader !== undefined) {
    evidence.registry_operation = "load"
    let loaded
    try {
      loaded = registryReader.load()
    } catch {
      registry.status = "failed"
      issues.push(issue("REGISTRY_READ_FAILED", null, null, "registry"))
      for (let index = 0; index < items.length; index += 1) if (items[index].status === "ready") items[index] = item(index)
    }
    if (registry.status !== "failed") {
      if (loaded === null) registry.status = "empty"
      else try { current = validate("projectRegistry", loaded); registry.status = "loaded"; registry.revision = current.registry_revision }
      catch { registry.status = "invalid"; issues.push(issue("REGISTRY_INVALID", null, null, "registry"));
        for (let index = 0; index < items.length; index += 1) if (items[index].status === "ready") items[index] = item(index) }
    }
  }

  if (current) for (let index = 0; index < items.length; index += 1) {
    const candidate = items[index].candidate
    if (!candidate) continue
    let conflicted = false
    for (const [field, code] of CONFLICTS) {
      const match = field === "aliases"
        ? candidate.aliases.some((alias) => current.projects.some((project) => project.aliases.includes(alias)))
        : current.projects.some((project) => project[field] === candidate[field])
      if (match) { conflicted = true; issues.push(issue(code, index, field, "conflict")) }
    }
    if (conflicted) items[index] = item(index, "conflict")
  }

  sortIssues(issues)
  return deepFreeze({ ok: issues.length === 0 && items.every(({ status }) => status === "ready"), items, issues, registry, evidence })
}
