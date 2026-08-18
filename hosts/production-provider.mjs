import { spawnSync } from "node:child_process"
import { closeSync, constants, existsSync, fstatSync, openSync, readFileSync, readSync } from "node:fs"
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
const agentName = (paneId) => `ctopencode-${String(paneId).replace(/[^a-z0-9]/gi, "").toLowerCase()}`
const paneIdentifier = (value) => typeof value === "string" && /^w[123456789ABCDEFGHJKMNPQRSTVWXYZ0]+:p[123456789ABCDEFGHJKMNPQRSTVWXYZ0]+$/.test(value)
const sessionIdentifier = (value) => typeof value === "string" && /^ses_[A-Za-z0-9]{26}$/.test(value)
const terminalIdentifier = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")

export const parseOpenCodeAgent = (value, expected) => {
  const result = value?.result, agent = result?.agent, session = agent?.agent_session
  if (!exactKeys(expected, ["name", "pane_id", "type", "worktree"]) || result?.type !== expected.type
    || agent?.name !== expected.name || agent?.agent !== "opencode" || agent?.cwd !== expected.worktree
    || agent?.pane_id !== expected.pane_id || !terminalIdentifier(agent?.terminal_id)
    || !exactKeys(session, ["agent", "kind", "source", "value"])
    || session.source !== "herdr:opencode" || session.agent !== "opencode" || session.kind !== "id"
    || !sessionIdentifier(session.value)) fail("CT_LAUNCH_REJECTED", "Herdr did not report canonical OpenCode custody")
  return Object.freeze({ name: agent.name, pane_id: agent.pane_id, terminal_id: agent.terminal_id, session_id: session.value, worktree: agent.cwd })
}
// Kept separate to test the descriptor boundary without exposing it to CLI callers.
export const createPinnedHostRuntime = (installed) => {
  if (process.platform !== "linux" || !existsSync("/proc/self/fd")) fail("CT_LAUNCH_REJECTED", "Linux procfs is required for host execution")
  let active
  try { active = JSON.parse(readFileSync(join(installed.dataRoot, "active.json"), "utf8")) } catch { fail("CT_LAUNCH_REJECTED", "Active host runtime is invalid") }
  if (!active || active.version !== installed.version || installed.root !== join(installed.dataRoot, "versions", installed.version)) fail("CT_LAUNCH_REJECTED", "Active host runtime is invalid")
  const record = readHostRuntimeIdentity(installed.dataRoot, installed.version), descriptors = {}
  const readPinned = (descriptor, size) => {
    const bytes = Buffer.alloc(size), length = readSync(descriptor, bytes, 0, size, 0)
    return bytes.subarray(0, length)
  }
  const matches = (name, stat, bytes) => ["dev", "ino", "size", "uid", "nlink"].every((key) => stat[key] === record[name][key])
    && (stat.mode & 0o777) === record[name].mode
    && createHash("sha256").update(bytes).digest("hex") === record[name].sha256
  try {
    for (const name of ["herdr", "opencode"]) {
      const descriptor = openSync(record[name].path, constants.O_RDONLY | constants.O_NOFOLLOW)
      const stat = fstatSync(descriptor), bytes = readPinned(descriptor, stat.size)
      if (!stat.isFile() || !matches(name, stat, bytes)) fail("CT_LAUNCH_REJECTED", "Pinned host executable is invalid")
      descriptors[name] = descriptor
    }
    const run = (name, args) => {
      const descriptor = descriptors[name], before = fstatSync(descriptor), bytes = readPinned(descriptor, before.size)
      if (!before.isFile() || !matches(name, before, bytes)) fail("CT_LAUNCH_REJECTED", "Pinned host executable changed")
      const result = spawnSync("/proc/self/fd/3", args, { cwd: process.cwd(), env: { PATH: "" }, encoding: "utf8", timeout: 1_000, maxBuffer: 65_536, killSignal: "SIGKILL", stdio: ["ignore", "pipe", "pipe", descriptor] })
      if (result.error || result.signal || String(result.stdout ?? "").length > 65_536 || String(result.stderr ?? "").length > 65_536) fail("CT_LAUNCH_REJECTED", "Pinned host process exceeded its boundary")
      return result
    }
    const compatibility = record.herdr_runtime
      ? run("herdr", ["--version"])
      : run("herdr", ["contract", "agent-root-observation", "--json"])
    const expected = record.herdr_runtime
      ? "herdr 0.8.0\n"
      : '{"schema":"herdr.agent_root_observation","schema_version":1,"capabilities":["pane_bound","opencode_session_lineage"]}\n'
    if (compatibility.status !== 0 || compatibility.stderr !== "" || compatibility.stdout !== expected) fail("CT_LAUNCH_REJECTED", "Pinned Herdr compatibility failed")
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
      const expected = sessions.get(paneId)
      if (!expected) fail("CT_LAUNCH_REJECTED", "OpenCode root custody is unavailable")
      const observed = parseOpenCodeAgent(parse(command("herdr", ["agent", "get", expected.name])), { type: "agent_info", name: expected.name, pane_id: paneId, worktree: expected.worktree })
      if (observed.session_id !== expected.session_id || observed.terminal_id !== expected.terminal_id) fail("CT_LAUNCH_REJECTED", "Herdr root custody changed")
      return Object.freeze({ schema: "control-tower.herdr-root-custody", schema_version: 1, pane_id: observed.pane_id, terminal_id: observed.terminal_id, source: "herdr:opencode", agent: "opencode", session_id: observed.session_id })
    },
    publish: (record) => {
      const session = sessions.get(record.pane_id)
      if (!paneIdentifier(record.pane_id) || !session) fail("CT_LAUNCH_REJECTED", "Herdr pane identifier is invalid")
      parse(command("herdr", ["pane", "report-agent", record.pane_id, "--source", "control-tower", "--agent", "opencode", "--state", "working", "--agent-session-id", record.root_session_id]))
      return true
    },
  })
  const opencode = createOpenCodeLauncher({
    profileAvailable: (name) => name === "gentle-orchestrator" && command("opencode", ["agent", "list"]).stdout.includes(name),
    start: ({ agent, pane_id: paneId, worktree }) => {
      if (!paneIdentifier(paneId)) fail("CT_LAUNCH_REJECTED", "Herdr pane identifier is invalid")
      const name = agentName(paneId)
      const started = parseOpenCodeAgent(parse(command("herdr", ["agent", "start", name, "--kind", "opencode", "--pane", paneId, "--", "--agent", agent])), { type: "agent_started", name, pane_id: paneId, worktree })
      const session = Object.freeze({ name, worktree, session_id: started.session_id, terminal_id: started.terminal_id })
      sessions.set(paneId, session)
      roots.set(started.session_id, session)
      return { id: started.session_id, terminal_id: started.terminal_id }
    },
    prompt: ({ root_session_id: rootId, brief }) => {
      const session = roots.get(rootId)
      if (!session) fail("CT_LAUNCH_REJECTED", "OpenCode root session is unavailable")
      parse(command("herdr", ["agent", "prompt", session.name, brief]))
    },
  })
  return Object.freeze({
    preflight: () => { runtime = createPinnedHostRuntime(installed); return runtime.close },
    consumeBinding: (requestRef) => consumer.consume(requestRef), herdr, opencode,
  })
}
