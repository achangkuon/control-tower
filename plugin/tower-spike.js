// Control Tower OpenCode bridge: isolated Support tooling plus an optional,
// capability-proven lifecycle adapter. Transport composition is supplied later.

import { tool } from "@opencode-ai/plugin"

import { persistSupportResult } from "../continuation/support.mjs"
import { bindMainAuthority } from "../main-store/authority.mjs"
import { createMainStore } from "../main-store/store.mjs"
import { createPollingLoop } from "../hosts/loop.mjs"

const SUPPORT_TOOLS = Object.freeze(Object.fromEntries([
  "read", "glob", "grep", "list", "task", "bash", "edit", "write", "todowrite", "question",
  "webfetch", "websearch", "lsp", "skill", "external_directory",
].map((name) => [name, false])))
const forbiddenSupportKey = /^(?:main_store|store|capability|authority|privilege|lock|worker)$/i

const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const assertIsolatedSupportInput = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object") return
  if (seen.has(value)) fail("CT_AUTH_INVALID", "Cyclic Support input is forbidden")
  seen.add(value)
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenSupportKey.test(key)) fail("CT_AUTH_INVALID", "Support input cannot carry Main authority")
    assertIsolatedSupportInput(child, seen)
  }
  seen.delete(value)
}
const parseSupportOutput = (response) => {
  const parts = response?.data?.parts
  const text = Array.isArray(parts)
    ? parts.filter((part) => part?.type === "text" && typeof part.text === "string").map((part) => part.text).join("").trim()
    : ""
  if (!text) fail("CT_HOST_CAPABILITY_MISSING", "Isolated Support subagent returned no structured proposal")
  try {
    const output = JSON.parse(text)
    if (!output || typeof output !== "object" || Array.isArray(output)) throw new Error("Support output is not an object")
    return output
  } catch (error) {
    if (error?.code?.startsWith("CT_")) throw error
    fail("CT_HOST_CAPABILITY_MISSING", "Isolated Support subagent returned invalid JSON", error)
  }
}

const validSessionId = (value) =>
  typeof value === "string" && value.length > 0 && !value.includes("\0")
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

export const createOpenCodeLifecycleAdapter = ({ controller, provenRootSessionId } = {}) => {
  if (!validSessionId(provenRootSessionId)) throw new TypeError("provenRootSessionId must be a valid session identity")
  for (const method of ["bindRoot", "dispose", "rootDeleted", "rootSettled"]) {
    if (typeof controller?.[method] !== "function") throw new TypeError(`controller.${method} must be a function`)
  }
  if (controller.bindRoot(provenRootSessionId) !== true) throw new Error("controller rejected the proven root identity")

  const children = new Set()
  let terminated = false
  const classify = (event) => {
    if (!event || typeof event !== "object" || !event.properties || typeof event.properties !== "object") return null
    const info = event.properties.info
    if (info !== undefined && (!info || typeof info !== "object" || Array.isArray(info))) return null
    const infoId = validSessionId(info?.id) ? info.id : null
    const directId = validSessionId(event.properties.sessionID) ? event.properties.sessionID : null
    if (info?.id !== undefined && infoId === null) return null
    if (event.properties.sessionID !== undefined && directId === null) return null
    if (infoId && directId && infoId !== directId) return null
    const id = infoId ?? directId
    if (!id) return null
    if (info && own(info, "parentID")) {
      if (!validSessionId(info.parentID) || info.parentID === id) return null
      return { id, role: info.parentID === provenRootSessionId ? "child" : "unknown" }
    }
    if (id === provenRootSessionId) return { id, role: "root" }
    if (children.has(id)) return { id, role: "child" }
    return { id, role: "unknown" }
  }

  return Object.freeze({
    dispose() {
      if (terminated) return false
      terminated = true
      controller.dispose("plugin-dispose")
      return true
    },
    event(event) {
      if (terminated) return false
      const identity = classify(event)
      if (!identity) return false
      if (event.type === "session.created") {
        if (identity.role !== "child" || identity.id === provenRootSessionId) return false
        children.add(identity.id)
        return false
      }
      if (event.type === "session.idle") {
        return identity.role === "root" ? controller.rootSettled(provenRootSessionId) : false
      }
      if (event.type !== "session.deleted") return false
      if (identity.role === "child") {
        children.delete(identity.id)
        return false
      }
      if (identity.role !== "root") return false
      terminated = true
      return controller.rootDeleted(provenRootSessionId)
    },
  })
}

const validBindingEpoch = (value) => Number.isSafeInteger(value) && value > 0

export const createOpenCodeAdapter = ({
  cancel, client, continuationCapability, now, policy, schedule, trace,
} = {}) => {
  let bindingEpoch
  let peek
  let rootSessionId
  try {
    bindingEpoch = continuationCapability?.binding_epoch
    peek = continuationCapability?.peek
    rootSessionId = continuationCapability?.root_session_id
  } catch {
    return null
  }
  if (typeof peek !== "function"
    || !validSessionId(rootSessionId)
    || !validBindingEpoch(bindingEpoch)) return null

  let controller
  const safeTrace = (event, attributes) => {
    try { trace(event, Object.freeze(attributes)) } catch {}
  }
  const authorityCurrent = () => {
    try {
      return continuationCapability.root_session_id === rootSessionId
        && continuationCapability.binding_epoch === bindingEpoch
    } catch {
      return false
    }
  }
  const assertAuthority = () => {
    if (authorityCurrent()) return
    controller.dispose("auth-invalid")
    safeTrace("opencode.auth_invalid", { code: "CT_AUTH_INVALID" })
    fail("CT_AUTH_INVALID", "OpenCode continuation authority changed")
  }
  const settleUnderAuthority = async (operation) => {
    assertAuthority()
    let failed = false
    let failure
    let value
    try { value = await operation() } catch (error) { failed = true; failure = error }
    assertAuthority()
    if (failed) throw failure
    return value
  }

  controller = createPollingLoop({
    cancel,
    now,
    policy,
    schedule,
    trace,
    peek: (input) => settleUnderAuthority(() => peek.call(continuationCapability, input)),
    wake: () => settleUnderAuthority(() => client.session.promptAsync({
      path: { id: rootSessionId },
      body: { parts: [{ type: "text", text: "Continue from the pending task in Control Tower." }] },
    })),
  })
  return createOpenCodeLifecycleAdapter({ controller, provenRootSessionId: rootSessionId })
}

export const TowerSpikePlugin = async (
  { client, directory, worktree },
  { lifecycle, trustedBindingProvider, ...transport } = {},
) => {
  const lifecycleAdapter = lifecycle
    ? createOpenCodeLifecycleAdapter(lifecycle)
    : createOpenCodeAdapter({ ...transport, client })
  // Native subagents live and die inside this session. The tower must never
  // see them, and we must never wake one by mistake.
  const childSessions = new Set()

  const invokeSupport = async ({ sessionID, proposal, signal, callDirectory } = {}) => {
    if (typeof sessionID !== "string" || sessionID.length === 0) fail("CT_AUTH_INVALID", "Main session is required")
    if (typeof trustedBindingProvider !== "function") fail("CT_AUTH_INVALID", "Trusted Main binding provider is unavailable")

    let binding
    try { binding = trustedBindingProvider() } catch (error) { fail("CT_AUTH_INVALID", "Canonical Main binding is unavailable", error) }
    if (!binding || sessionID !== binding.main_session_id) fail("CT_AUTH_INVALID", `Rejected Main session: ${sessionID}`)

    let mainStore
    try {
      const authority = bindMainAuthority({
        trustedBindingProvider: () => binding,
        rederiveBinding: () => trustedBindingProvider(),
      })
      const capability = authority.capability
      mainStore = createMainStore({ root: binding.store_path, authority, capability })
    } catch (error) {
      fail("CT_AUTH_INVALID", "Canonical Main binding is unavailable", error)
    }

    assertIsolatedSupportInput(proposal)
    if (childSessions.has(sessionID) || typeof client?.session?.create !== "function" || typeof client.session.prompt !== "function" || signal?.aborted) {
      fail("CT_HOST_CAPABILITY_MISSING", "Host cannot delegate to an isolated Support subagent")
    }

    try {
      const query = { directory: callDirectory ?? directory ?? worktree }
      const child = await client.session.create({
        body: { parentID: sessionID, title: "Control Tower Support" },
        query,
      })
      if (typeof child?.data?.id !== "string" || child.data.id.length === 0) throw new Error("Missing child session")
      childSessions.add(child.data.id)
      const response = await client.session.prompt({
        path: { id: child.data.id },
        query,
        body: {
          agent: "support-agent",
          system: "Return exactly one JSON object satisfying support-proposal-v1. Do not wrap it in Markdown.",
          tools: SUPPORT_TOOLS,
          parts: [{ type: "text", text: JSON.stringify(proposal) }],
        },
      })
      if (signal?.aborted) throw new Error("Support delegation aborted")
      return JSON.stringify(persistSupportResult({ output: parseSupportOutput(response), main_store: mainStore }))
    } catch (error) {
      if (error?.code?.startsWith("CT_")) throw error
      fail("CT_HOST_CAPABILITY_MISSING", "Isolated Support subagent failed", error)
    }
  }

  const supportTool = tool({
    description: "Ask isolated Support to return a read-only structured proposal",
    args: { proposal: tool.schema.unknown() },
    execute: ({ proposal }, context) => invokeSupport({
      sessionID: context.sessionID,
      proposal,
      signal: context.abort,
      callDirectory: context.directory,
    }),
  })

  return {
    tool: { control_tower_support: supportTool },
    dispose: () => lifecycleAdapter?.dispose() ?? false,
    event: ({ event }) => {
      const info = event?.properties?.info
      if (validSessionId(info?.id) && validSessionId(info.parentID)) childSessions.add(info.id)
      return lifecycleAdapter?.event(event) ?? false
    },
  }
}
