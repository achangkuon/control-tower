import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { deriveCanonicalMainContext } from "../core.mjs"
import { validateActiveHostRuntime } from "../install/lifecycle.mjs"
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

const installedRuntime = () => {
  const root = dirname(dirname(fileURLToPath(import.meta.url))), versions = dirname(root), dataRoot = dirname(versions)
  return { dataRoot, version: root.slice(versions.length + 1), root }
}

export const createProductionProvider = ({ run = (command, args, options) => spawnSync(command, args, { ...options, encoding: "utf8" }) } = {}) => {
  const installed = installedRuntime()
  const context = deriveCanonicalMainContext(process.cwd())
  const consumer = createLaunchBindingConsumer({ root: join(context.git_common_dir, "control-tower", "main-store") })
  const command = (name, args) => {
    const identity = validateActiveHostRuntime(installed.dataRoot, installed.version, installed.root)
    return run(identity[name], args, { cwd: process.cwd(), env: identity.environment })
  }
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
      parse(command("herdr", ["pane", "report-agent-session", "--source", "control-tower", "--agent", "opencode", "--agent-session-id", record.root_session_id, "--session-start-source", "control-tower", record.pane_id]))
      parse(command("herdr", ["pane", "report-agent", "--source", "control-tower", "--agent", "opencode", "--state", "working", "--agent-session-id", record.root_session_id, record.pane_id]))
      return Boolean(name)
    },
  })
  const opencode = createOpenCodeLauncher({
    profileAvailable: (name) => name === "gentle-orchestrator" && command("opencode", ["agent", "list"]).stdout.includes(name),
    start: ({ agent, pane_id: paneId }) => {
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
  return Object.freeze({ consumeBinding: (requestRef) => consumer.consume(requestRef), herdr, opencode })
}
