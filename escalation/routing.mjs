import { randomUUID } from "node:crypto"
import { chmodSync, closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join } from "node:path"

const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const modes = new Set(["local", "remoto"])
const stateKeys = ["maintainer_id", "mode", "revision", "schema", "schema_version"]
const exactIdentity = (identity) => identity?.status === "VALID"
  && typeof identity.subject_id === "string"
  && identity.subject_id.length > 0
  && identity.subject_id === identity.subject_id.trim()
const exactState = (state) => state
  && typeof state === "object"
  && !Array.isArray(state)
  && Object.keys(state).sort().join("\0") === stateKeys.join("\0")
  && state.schema === "routing-mode"
  && state.schema_version === 1
  && modes.has(state.mode)
  && Number.isInteger(state.revision)
  && state.revision >= 1
  && typeof state.maintainer_id === "string"
  && state.maintainer_id.length > 0
const resolveFailClosed = (state, identity) => exactState(state)
  && exactIdentity(identity)
  && identity.subject_id === state.maintainer_id
  ? state.mode
  : "local"

const readState = (statePath) => {
  if (!isAbsolute(statePath ?? "") || !existsSync(statePath)) return null
  try {
    const stats = lstatSync(statePath)
    const owned = typeof process.getuid !== "function" || stats.uid === process.getuid()
    if (!stats.isFile() || stats.isSymbolicLink() || !owned || (stats.mode & 0o777) !== 0o600) return null
    const state = JSON.parse(readFileSync(statePath, "utf8"))
    return exactState(state) ? state : null
  } catch { return null }
}

const writeState = (statePath, state) => {
  if (!isAbsolute(statePath ?? "")) fail("CT_ESCALATION_STATE_WRITE_FAILED", "Routing state path must be absolute")
  const parent = dirname(statePath)
  let temporary, descriptor
  try {
    mkdirSync(parent, { recursive: true, mode: 0o700 })
    chmodSync(parent, 0o700)
    const parentStats = lstatSync(parent)
    if (!parentStats.isDirectory() || parentStats.isSymbolicLink()) fail("CT_ESCALATION_STATE_WRITE_FAILED", "Routing state parent is unsafe")
    temporary = join(parent, `.routing-mode.${randomUUID()}.tmp`)
    descriptor = openSync(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
    writeFileSync(descriptor, `${JSON.stringify(state)}\n`)
    fsyncSync(descriptor)
    closeSync(descriptor); descriptor = undefined
    renameSync(temporary, statePath); temporary = undefined
    const parentDescriptor = openSync(parent, constants.O_RDONLY)
    try { fsyncSync(parentDescriptor) } finally { closeSync(parentDescriptor) }
    return Object.freeze({ ...state, record_path: statePath })
  } catch (error) {
    if (descriptor !== undefined) { try { closeSync(descriptor) } catch {} }
    if (temporary) { try { rmSync(temporary, { force: true }) } catch {} }
    if (error?.code === "CT_ESCALATION_STATE_WRITE_FAILED") throw error
    fail("CT_ESCALATION_STATE_WRITE_FAILED", "Routing state write failed", error)
  }
}

export const createRoutingController = ({ statePath, authenticateLocal, authenticateRemote } = {}) => Object.freeze({
  resolveMode({ identity } = {}) { return resolveFailClosed(readState(statePath), identity) },
  switchMode({ actor, route, proof, mode } = {}) {
    if (actor !== "MAINTAINER") fail("CT_ESCALATION_ACTOR_DENIED", `Routing-mode switch rejected actor: ${String(actor)}`)
    if (!modes.has(mode)) fail("CT_ESCALATION_MODE_INVALID", "Routing mode must be local or remoto")
    const authenticate = route === "LOCAL_CLI"
      ? authenticateLocal
      : route === "REMOTE_CALLBACK"
        ? authenticateRemote
        : null
    if (route === "REMOTE_CALLBACK" && typeof authenticate !== "function") fail("CT_ESCALATION_REMOTE_DISABLED", "Remote callback authentication is unavailable until S8.7")
    if (typeof authenticate !== "function") fail("CT_ESCALATION_IDENTITY_INVALID", "Authenticated maintainer identity is required")
    let identity
    try { identity = authenticate({ actor, route, proof }) } catch {}
    if (!exactIdentity(identity)) fail("CT_ESCALATION_IDENTITY_INVALID", "Maintainer identity is absent, invalid, or ambiguous")
    const current = readState(statePath)
    if (current?.mode === mode && current.maintainer_id === identity.subject_id) return Object.freeze({ ...current, record_path: statePath })
    return writeState(statePath, {
      schema: "routing-mode",
      schema_version: 1,
      mode,
      revision: (current?.revision ?? 0) + 1,
      maintainer_id: identity.subject_id,
    })
  },
})

export const dispatchDecisionRequest = ({ controller, request, identity, remoteTransport } = {}) => {
  if (!controller || typeof controller.resolveMode !== "function" || request?.state !== "PENDING") {
    fail("CT_ESCALATION_REQUEST_INVALID", "A pending canonical decision request is required")
  }
  const mode = controller.resolveMode({ identity })
  const pending = Object.freeze({ mode, delivered: false, pending: true, recoverable_locally: true, request })
  if (mode === "local") return pending
  if (!remoteTransport || typeof remoteTransport.send !== "function") return Object.freeze({ ...pending, code: "CT_ESCALATION_TRANSPORT_UNAVAILABLE" })
  try {
    remoteTransport.send(request)
    return Object.freeze({ ...pending, delivered: true })
  } catch {
    return Object.freeze({ ...pending, code: "CT_ESCALATION_TRANSPORT_UNAVAILABLE" })
  }
}
