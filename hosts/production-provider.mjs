import { spawn, spawnSync } from "node:child_process"
import { closeSync, constants, existsSync, fstatSync, openSync, readFileSync, readSync } from "node:fs"
import { createHash, randomBytes } from "node:crypto"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { deriveCanonicalMainContext } from "../core.mjs"
import { readHostRuntimeIdentity } from "../install/lifecycle.mjs"
import { createLaunchBindingConsumer } from "../main-store/launch-consumer.mjs"
import { createCandidateFenceStore } from "./candidate-fence.mjs"
import { createEpochEnforcement } from "./epoch-enforcement.mjs"
import { createHerdrAdapter } from "./herdr.mjs"
import { createOpenCodeLauncher } from "./opencode-launcher.mjs"
import { createRootBindingStore } from "./root-binding.mjs"
import { createOpenCodeBackendHost } from "./opencode-server.mjs"
import { createOpenCodeView } from "./opencode-view.mjs"

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
// --- S4.5 / M4.5.2 — Main-owned backend wiring -------------------------------
// Decision A (maintainer, 2026-08-18): rootness is proven BY CONSTRUCTION. Main creates the session
// and `POST /api/session` structurally cannot be asked for a parent, so "no parent" is a fact about
// the call, not a reading of the response — which never reports `parentID` for a root. Three locks
// keep that honest, and each is enforced by one function below.
// Same bound as the host predicates: an announced 99999 is not a port this backend can be listening on.
const loopbackOrigin = (value) => typeof value === "string" && Number(/^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(value)?.[1] ?? NaN) <= 65535

// The backend announces its own address; the caller never supplies one.
export const parseServerAnnouncement = (output) => {
  if (typeof output !== "string" || output.length === 0 || output.length > 65_536) fail("CT_BACKEND_REJECTED", "Backend announcement is unreadable")
  const match = /^opencode server listening on (\S+)$/m.exec(output)
  if (!match || !loopbackOrigin(match[1])) fail("CT_BACKEND_REJECTED", "Backend did not announce a loopback address")
  return match[1]
}

// Lock 2 — the assumption behind decision A is checked, never assumed: if this endpoint ever gains a
// parent field, every root we mint afterwards would be unproven, so it must fail loudly right here.
export const assertParentlessSessionCreation = (schema) => {
  const properties = schema && typeof schema === "object" && !Array.isArray(schema) ? schema.properties : undefined
  if (schema?.additionalProperties !== false || !properties || typeof properties !== "object" || Array.isArray(properties)) fail("CT_BACKEND_REJECTED", "Session creation schema is not closed")
  const names = Object.keys(properties)
  if (names.length === 0 || names.some((name) => /parent/i.test(name))) fail("CT_BACKEND_REJECTED", "Session creation schema accepts a parent")
  return true
}

// Locks 1 and 3 — `expected` is the id this call just created, so a session merely looked up cannot be
// laundered into a root; and the agent is verified against a readback of that exact session. Only
// `parentID` is supplied, because Main produced the fact that there is none.
export const parseCreatedRoot = (created, readback, expected) => {
  const from = (value) => value && typeof value === "object" && !Array.isArray(value) ? value.data : undefined
  const one = from(created), two = from(readback)
  if (!sessionIdentifier(expected) || !one || !two || typeof one !== "object" || typeof two !== "object") fail("CT_BACKEND_REJECTED", "Session creation response is unreadable")
  if (one.id !== expected || two.id !== expected) fail("CT_BACKEND_REJECTED", "Session is not the one just created")
  if (two.agent !== "gentle-orchestrator") fail("CT_BACKEND_REJECTED", "Session does not run the primary root agent")
  // A root omits `parentID` in this API version. Seeing one at all means this is not a root.
  if (one.parentID !== undefined || two.parentID !== undefined) fail("CT_BACKEND_REJECTED", "Session reported a parent")
  return Object.freeze({ agent: "gentle-orchestrator", id: expected, parentID: null })
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
    // A daemon cannot go through `run`: that path is spawnSync with a 1s timeout and a bounded buffer.
    // `serve` keeps the same pinned descriptor, but long-lived and detached from any terminal.
    const serve = ({ worktree, secret }) => {
      const descriptor = descriptors.opencode, before = fstatSync(descriptor), bytes = readPinned(descriptor, before.size)
      if (!before.isFile() || !matches("opencode", before, bytes)) fail("CT_BACKEND_REJECTED", "Pinned OpenCode executable changed")
      const child = spawn("/proc/self/fd/3", ["serve", "--port", "0", "--hostname", "127.0.0.1"], {
        cwd: worktree, env: { PATH: "", OPENCODE_SERVER_PASSWORD: secret }, detached: true,
        stdio: ["ignore", "pipe", "ignore", descriptor],
      })
      return { child, stop: () => { try { child.kill("SIGTERM") } catch {} } }
    }
    const compatibility = record.herdr_runtime
      ? run("herdr", ["--version"])
      : run("herdr", ["contract", "agent-root-observation", "--json"])
    const expected = record.herdr_runtime
      ? "herdr 0.8.0\n"
      : '{"schema":"herdr.agent_root_observation","schema_version":1,"capabilities":["pane_bound","opencode_session_lineage"]}\n'
    if (compatibility.status !== 0 || compatibility.stderr !== "" || compatibility.stdout !== expected) fail("CT_LAUNCH_REJECTED", "Pinned Herdr compatibility failed")
    return Object.freeze({ run, serve, close: () => Object.values(descriptors).forEach(closeSync) })
  } catch (error) { Object.values(descriptors).forEach(closeSync); throw error }
}

const installedRuntime = () => {
  const root = dirname(dirname(fileURLToPath(import.meta.url))), versions = dirname(root), dataRoot = dirname(versions)
  return { dataRoot, version: root.slice(versions.length + 1), root }
}

export const createProductionProvider = ({ } = {}) => {
  const installed = installedRuntime()
  const context = deriveCanonicalMainContext(process.cwd())
  const mainStoreRoot = join(context.git_common_dir, "control-tower", "main-store")
  const assertCurrentHost = ({ fence_path, ...identity }) => createEpochEnforcement({ candidateFence: createCandidateFenceStore({
    rootPath: fence_path,
    resolveTerminationProof() { fail("CT_FENCE_PORT_REQUIRED", "Read-only launch authority cannot resolve termination proof") },
    authorizeMaintainerDecision() { fail("CT_FENCE_PORT_REQUIRED", "Read-only launch authority cannot authorize takeover") },
  }) }).assertCurrent(identity)
  const consumer = createLaunchBindingConsumer({ root: mainStoreRoot, assertCurrentHost })
  const rootBinding = createRootBindingStore({ root: mainStoreRoot })
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
  // Main-owned backend transport. Every fact it reports is either announced by the backend itself or
  // read back from it; the only thing Main supplies is the absence of a parent, which it produced.
  const call = async (url, secret, method, path, body) => {
    const response = await fetch(`${url}${path}`, {
      method, signal: AbortSignal.timeout(10_000),
      headers: { authorization: `Basic ${Buffer.from(`opencode:${secret}`).toString("base64")}`, ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) fail("CT_BACKEND_REJECTED", "Backend rejected a Main request")
    const text = await response.text()
    if (text.length > 1_048_576) fail("CT_BACKEND_REJECTED", "Backend returned an oversized response")
    try { return JSON.parse(text) } catch { fail("CT_BACKEND_REJECTED", "Backend returned invalid JSON") }
  }
  const announcement = (child) => new Promise((resolve, reject) => {
    let output = ""
    const timer = setTimeout(() => reject(Object.assign(new Error("Backend never announced an address"), { code: "CT_BACKEND_REJECTED" })), 30_000)
    const done = (settle, value) => { clearTimeout(timer); child.stdout.removeAllListeners("data"); settle(value) }
    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk) => {
      output += chunk
      if (output.length > 65_536) return done(reject, Object.assign(new Error("Backend announcement is unreadable"), { code: "CT_BACKEND_REJECTED" }))
      try { done(resolve, parseServerAnnouncement(output)) } catch { /* keep reading until the line completes */ }
    })
    child.once("error", (error) => done(reject, error))
    child.once("exit", () => done(reject, Object.assign(new Error("Backend exited before announcing"), { code: "CT_BACKEND_REJECTED" })))
  })
  const backend = createOpenCodeBackendHost({
    randomSecret: () => randomBytes(32).toString("base64url"),
    spawn: async ({ worktree, secret }) => {
      const { child, stop } = runtime.serve({ worktree, secret })
      try { return { pid: child.pid, url: await announcement(child), stop } } catch (error) { stop(); throw error }
    },
    createRoot: async ({ secret, url }) => {
      // Lock 2 runs before every creation: the assumption is re-checked against the live backend.
      const document = await call(url, secret, "GET", "/doc")
      assertParentlessSessionCreation(document?.paths?.["/api/session"]?.post?.requestBody?.content?.["application/json"]?.schema)
      const created = await call(url, secret, "POST", "/api/session", { agent: "gentle-orchestrator" })
      const id = created?.data?.id
      if (!sessionIdentifier(id)) fail("CT_BACKEND_REJECTED", "Backend did not return a canonical session")
      // Locks 1 and 3: the readback is of the exact id just created, and it carries the agent.
      return parseCreatedRoot(created, await call(url, secret, "GET", `/api/session/${id}`), id)
    },
  })
  // Decision 39: Herdr survives only as a replaceable launcher for a view. `pane run` executes a
  // command in a pane without touching Herdr's agent custody, so the visible root never becomes a
  // Herdr agent and the pane never becomes the root.
  const view = createOpenCodeView({
    openPane: ({ command: attach, cwd }) => {
      const pane = parse(command("herdr", ["pane", "split", "--current", "--direction", "right", "--cwd", cwd, "--no-focus"]))?.result?.pane?.pane_id
      if (!paneIdentifier(pane)) fail("CT_VIEW_UNAVAILABLE", "Herdr did not create a fresh view pane")
      parse(command("herdr", ["pane", "run", pane, ...attach]))
      return { pane_id: pane }
    },
    closePane: (paneId) => { parse(command("herdr", ["pane", "close", paneId])); return true },
  })
  return Object.freeze({
    preflight: () => { runtime = createPinnedHostRuntime(installed); return runtime.close },
    consumeBinding: (requestRef) => consumer.consume(requestRef), assertCurrentHost, backend, herdr, opencode, rootBinding, view,
  })
}
