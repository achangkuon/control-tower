import { resolveSupportManifest } from "./manifest.mjs"
import { captureSupportSnapshot } from "./snapshot.mjs"

const PORT_KEYS = ["inspectGit", "loadRegistry", "openDatabase", "readText"]
const INPUT_KEYS = ["project_id", "report_type", "schema", "schema_version"]
const REPORT_TYPES = new Set(["decomposition", "conflict", "capacity"])
const V2_PATTERN = /(?:session|worktree|worker|assignment|launch|lock|commit|deliver|mutat|create)/i
const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exactKeys = (value, expected) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === expected.join("\0")
const requestsV2 = (value) => Object.entries(value ?? {}).some(([key, item]) => V2_PATTERN.test(key) || (typeof item === "string" && V2_PATTERN.test(item)))

const sessions = (manifest, snapshot) => manifest.plans.flatMap((plan) => {
  const body = snapshot.documents.get(plan.path)
  return [...body.matchAll(/\|\s*(S\d+\.\d+)\s*\|\s*([^|]+)\|/g)].map((match) => ({ id: match[1], state: match[2].trim(), path: plan.path }))
})
const observationsFor = (type, manifest, snapshot) => {
  if (type === "decomposition") return sessions(manifest, snapshot).map(({ id, state, path }) => ({
    code: "SUPPORT_SESSION", subject: id, detail: `${state} — source ${path}`,
  }))
  if (type === "conflict") return [
    ...snapshot.agents.map((agent) => ({ code: "SUPPORT_AGENT_STATE", subject: agent.task || agent.name, detail: `${agent.name}: ${agent.state} — source ${manifest.db_path}` })),
    ...snapshot.locks.filter(({ holder }) => holder).map((lock) => ({ code: "SUPPORT_LOCK_HELD", subject: lock.name, detail: `${lock.holder} — source ${manifest.db_path}` })),
  ]
  const busy = snapshot.agents.filter(({ state }) => !["COMPLETE", "MERGED", "READY"].includes(state)).length
  const held = snapshot.locks.filter(({ holder }) => holder).length
  return [{ code: "SUPPORT_CAPACITY", subject: manifest.project_id,
    detail: `${busy} active of ${snapshot.agents.length} agents; ${held} held of ${snapshot.locks.length} locks — source ${manifest.db_path}` }]
}

export const createSupportBrief = (input, ports) => {
  if (requestsV2(input)) fail("CT_V2_ONLY", "Requested capability is available only in Autonomous V2")
  if (!exactKeys(input, INPUT_KEYS) || input.schema !== "support-request" || input.schema_version !== 1
    || typeof input.project_id !== "string" || input.project_id.length === 0 || !REPORT_TYPES.has(input.report_type))
    fail("CT_SUPPORT_REQUEST_INVALID", "Invalid Support request")
  if (!exactKeys(ports, PORT_KEYS) || PORT_KEYS.some((key) => typeof ports[key] !== "function"))
    fail("CT_SUPPORT_PORTS_INVALID", "Invalid Support ports")
  const registry = ports.loadRegistry()
  if (registry?.schema !== "project-registry" || registry.schema_version !== 1 || !Array.isArray(registry.projects))
    fail("CT_SUPPORT_REGISTRY_INVALID", "Invalid project registry")
  const matches = registry.projects.filter(({ project_id }) => project_id === input.project_id)
  if (matches.length !== 1) fail("CT_SUPPORT_PROJECT_INVALID", "Support project identity is not unique")
  const manifest = resolveSupportManifest(matches[0], ports), snapshot = captureSupportSnapshot(manifest, ports)
  const observations = observationsFor(input.report_type, manifest, snapshot)
    .sort((a, b) => a.code.localeCompare(b.code) || a.subject.localeCompare(b.subject))
  return { schema: "support-brief", schema_version: 1, project_id: input.project_id,
    registry_entry_revision: manifest.registry_entry_revision, report_type: input.report_type,
    sources: [...snapshot.sources], observations }
}
