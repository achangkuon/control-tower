import { spawnSync } from "node:child_process"
import { closeSync, constants, existsSync, fstatSync, openSync, readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { deriveCanonicalMainContext } from "../core.mjs"
import { readHostRuntimeIdentity } from "../install/lifecycle.mjs"
import { createLaunchBindingConsumer } from "../main-store/launch-consumer.mjs"
import { createHerdrAdapter } from "./herdr.mjs"
import { createOpenCodeLauncher } from "./opencode-launcher.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const duplicates = (input) => {
  let index = 0
  const whitespace = () => { while (/\s/.test(input[index] ?? "")) index += 1 }
  const string = () => {
    const start = index++
    while (index < input.length) {
      if (input[index] === "\\") { index += 2; continue }
      if (input[index++] === '"') return JSON.parse(input.slice(start, index))
    }
    throw new SyntaxError("unterminated string")
  }
  const value = () => {
    whitespace()
    if (input[index] === "{") return object()
    if (input[index] === "[") {
      index += 1; whitespace()
      if (input[index] === "]") { index += 1; return }
      while (true) { value(); whitespace(); if (input[index] === "]") { index += 1; return }; if (input[index++] !== ",") throw new SyntaxError("array") }
    }
    if (input[index] === '"') return string()
    const start = index
    while (index < input.length && !/[\s,\]}]/.test(input[index])) index += 1
    if (start === index) throw new SyntaxError("value")
  }
  const object = () => {
    index += 1; whitespace()
    const keys = new Set()
    if (input[index] === "}") { index += 1; return }
    while (true) {
      whitespace(); if (input[index] !== '"') throw new SyntaxError("key")
      const key = string(); if (keys.has(key)) throw new SyntaxError("duplicate key"); keys.add(key)
      whitespace(); if (input[index++] !== ":") throw new SyntaxError("colon")
      value(); whitespace(); if (input[index] === "}") { index += 1; return }; if (input[index++] !== ",") throw new SyntaxError("object")
    }
  }
  value(); whitespace()
  if (index !== input.length) throw new SyntaxError("trailing")
}
export const parseHostOutput = (result) => {
  if (result?.status !== 0) fail("CT_LAUNCH_REJECTED", "Host process prerequisite failed")
  if (typeof result.stdout !== "string" || result.stdout.length > 65_536) fail("CT_LAUNCH_REJECTED", "Host process returned unsafe output")
  try { duplicates(result.stdout); return JSON.parse(result.stdout) } catch { fail("CT_LAUNCH_REJECTED", "Host process returned invalid JSON") }
}
const parse = parseHostOutput
const sessionId = (value) => value?.result?.agent?.agent_session_id ?? value?.result?.agent?.session_id
const agentName = (paneId) => `ctopencode-${String(paneId).replace(/[^a-z0-9]/gi, "").toLowerCase()}`
const paneIdentifier = (value) => typeof value === "string" && /^w[123456789ABCDEFGHJKMNPQRSTVWXYZ0]+:p[123456789ABCDEFGHJKMNPQRSTVWXYZ0]+$/.test(value)
const pinRuntime = (installed) => {
  if (process.platform !== "linux" || !existsSync("/proc/self/fd")) fail("CT_LAUNCH_REJECTED", "Linux procfs is required for host execution")
  let active
  try { active = JSON.parse(readFileSync(join(installed.dataRoot, "active.json"), "utf8")) } catch { fail("CT_LAUNCH_REJECTED", "Active host runtime is invalid") }
  if (!active || active.version !== installed.version || installed.root !== join(installed.dataRoot, "versions", installed.version)) fail("CT_LAUNCH_REJECTED", "Active host runtime is invalid")
  const record = readHostRuntimeIdentity(installed.dataRoot, installed.version), descriptors = {}
  const matches = (name, stat, bytes) => ["dev", "ino", "size", "uid", "nlink"].every((key) => stat[key] === record[name][key])
    && (stat.mode & 0o777) === record[name].mode
    && createHash("sha256").update(bytes).digest("hex") === record[name].sha256
  try {
    for (const name of ["herdr", "opencode"]) {
      const descriptor = openSync(record[name].path, constants.O_RDONLY | constants.O_NOFOLLOW)
      const stat = fstatSync(descriptor), bytes = readFileSync(`/proc/self/fd/${descriptor}`)
      if (!stat.isFile() || !matches(name, stat, bytes)) fail("CT_LAUNCH_REJECTED", "Pinned host executable is invalid")
      descriptors[name] = descriptor
    }
    const run = (name, args) => {
      const descriptor = descriptors[name], before = fstatSync(descriptor), bytes = readFileSync(`/proc/self/fd/${descriptor}`)
      if (!before.isFile() || !matches(name, before, bytes)) fail("CT_LAUNCH_REJECTED", "Pinned host executable changed")
      const result = spawnSync("/proc/self/fd/3", args, { cwd: process.cwd(), env: { PATH: "" }, encoding: "utf8", timeout: 1_000, maxBuffer: 65_536, killSignal: "SIGKILL", stdio: ["ignore", "pipe", "pipe", descriptor] })
      if (result.error || result.signal || String(result.stdout ?? "").length > 65_536 || String(result.stderr ?? "").length > 65_536) fail("CT_LAUNCH_REJECTED", "Pinned host process exceeded its boundary")
      return result
    }
    const contract = run("herdr", ["contract", "agent-root-observation", "--json"])
    if (contract.status !== 0 || contract.stdout !== '{"schema":"herdr.agent_root_observation","schema_version":1,"capabilities":["pane_bound","opencode_session_lineage"]}\n') fail("CT_LAUNCH_REJECTED", "Pinned Herdr conformance failed")
    return Object.freeze({ run, close: () => Object.values(descriptors).forEach(closeSync) })
  } catch (error) { Object.values(descriptors).forEach(closeSync); throw error }
}

const installedRuntime = () => {
  const root = dirname(dirname(fileURLToPath(import.meta.url))), versions = dirname(root), dataRoot = dirname(versions)
  return { dataRoot, version: root.slice(versions.length + 1), root }
}

export const createProductionProvider = ({ } = {}) => {
  const installed = installedRuntime()
  const context = deriveCanonicalMainContext(process.cwd())
  const consumer = createLaunchBindingConsumer({ root: join(context.git_common_dir, "control-tower", "main-store") })
  let runtime
  const command = (name, args) => runtime.run(name, args)
  const sessions = new Map(), roots = new Map()
  const herdr = createHerdrAdapter({
    createPane: ({ cwd: worktree }) => ({ pane_id: parse(command("herdr", ["pane", "split", "--current", "--direction", "right", "--cwd", worktree, "--no-focus"]))?.result?.pane?.pane_id }),
    closePane: (paneId) => parse(command("herdr", ["pane", "close", paneId])),
    projectRoot: ({ pane_id: paneId }) => {
      const observed = parse(command("herdr", ["agent", "get", sessions.get(paneId)]))
      return observed?.result?.agent?.agent_root_observation
    },
    publish: (record) => {
      const name = sessions.get(record.pane_id)
      if (!paneIdentifier(record.pane_id)) fail("CT_LAUNCH_REJECTED", "Herdr pane identifier is invalid")
      parse(command("herdr", ["pane", "report-agent", record.pane_id, "--source", "control-tower", "--agent", "opencode", "--state", "working", "--agent-session-id", record.root_session_id]))
      return Boolean(name)
    },
  })
  const opencode = createOpenCodeLauncher({
    profileAvailable: (name) => name === "gentle-orchestrator" && command("opencode", ["agent", "list"]).stdout.includes(name),
    start: ({ agent, pane_id: paneId }) => {
      if (!paneIdentifier(paneId)) fail("CT_LAUNCH_REJECTED", "Herdr pane identifier is invalid")
      const name = agentName(paneId), started = parse(command("herdr", ["agent", "start", name, "--kind", "opencode", "--pane", paneId, "--", "--agent", agent]))
      const id = sessionId(started)
      if (typeof id !== "string" || id.length === 0) fail("CT_LAUNCH_REJECTED", "Herdr did not report an OpenCode root session")
      sessions.set(paneId, name)
      roots.set(id, name)
      const terminal_id = started?.result?.agent?.terminal_id
      if (typeof terminal_id !== "string" || !terminal_id || terminal_id.includes("\0")) fail("CT_LAUNCH_REJECTED", "Herdr did not report an OpenCode terminal")
      return { id, terminal_id }
    },
    prompt: ({ root_session_id: rootId, brief }) => {
      const name = roots.get(rootId)
      if (!name) fail("CT_LAUNCH_REJECTED", "OpenCode root session is unavailable")
      parse(command("herdr", ["agent", "prompt", name, brief]))
    },
  })
  return Object.freeze({
    preflight: () => { runtime = pinRuntime(installed); return runtime.close },
    consumeBinding: (requestRef) => consumer.consume(requestRef), herdr, opencode,
  })
}
