import { spawnSync } from "node:child_process"
import { join } from "node:path"

import { deriveCanonicalMainContext } from "../core.mjs"
import { createLaunchBindingConsumer } from "../main-store/launch-consumer.mjs"
import { createHerdrAdapter } from "./herdr.mjs"
import { createOpenCodeLauncher } from "./opencode-launcher.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const parse = (result) => {
  if (result?.status !== 0) fail("CT_LAUNCH_REJECTED", "Host process prerequisite failed")
  try { return JSON.parse(result.stdout) } catch { fail("CT_LAUNCH_REJECTED", "Host process returned invalid JSON") }
}
const sessionId = (value) => value?.result?.agent?.agent_session_id ?? value?.result?.agent?.session_id
const agentName = (paneId) => `ctopencode-${String(paneId).replace(/[^a-z0-9]/gi, "").toLowerCase()}`

export const createProductionProvider = ({ cwd = process.cwd(), environment = process.env, run = (command, args, options) => spawnSync(command, args, { ...options, encoding: "utf8" }) } = {}) => {
  if (environment.HERDR_ENV !== "1") fail("CT_LAUNCH_REJECTED", "Herdr-managed process context is required")
  const context = deriveCanonicalMainContext(cwd)
  const consumer = createLaunchBindingConsumer({ root: join(context.git_common_dir, "control-tower", "main-store") })
  const command = (name, args) => run(name, args, { cwd })
  const sessions = new Map(), roots = new Map()
  const herdr = createHerdrAdapter({
    createPane: ({ cwd: worktree }) => ({ pane_id: parse(command("herdr", ["pane", "split", "--current", "--direction", "right", "--cwd", worktree, "--no-focus"]))?.result?.pane?.pane_id }),
    closePane: (paneId) => parse(command("herdr", ["pane", "close", paneId])),
    projectRoot: ({ pane_id: paneId }) => {
      const observed = parse(command("herdr", ["agent", "get", sessions.get(paneId)]))
      return { root_session_id: sessionId(observed), state: "ROOT" }
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
      return { id }
    },
    prompt: ({ root_session_id: rootId, brief }) => {
      const name = roots.get(rootId)
      if (!name) fail("CT_LAUNCH_REJECTED", "OpenCode root session is unavailable")
      parse(command("herdr", ["agent", "prompt", name, brief]))
    },
  })
  return Object.freeze({ consumeBinding: (requestRef) => consumer.consume(requestRef), herdr, opencode })
}
