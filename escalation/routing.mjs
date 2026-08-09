import { randomUUID } from "node:crypto"
import { chmodSync, closeSync, constants, fchmodSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join, resolve } from "node:path"

const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const pause = (milliseconds) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
const owned = (stats) => typeof process.getuid !== "function" || stats.uid === process.getuid()
const mode = (stats) => stats.mode & 0o777
const LOCK_TIMEOUT_MS = 5_000
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
const stateFailure = (message, cause) => fail("CT_ESCALATION_STATE_WRITE_FAILED", message, cause)
const assertSafeDirectory = (path, stats) => {
  if (!stats.isDirectory() || stats.isSymbolicLink() || !owned(stats) || mode(stats) !== 0o700 || realpathSync(path) !== resolve(path)) {
    stateFailure("Routing state parent is unsafe")
  }
}
const inspectParent = (parent, { create = false } = {}) => {
  let stats
  try { stats = lstatSync(parent) } catch (error) {
    if (error?.code !== "ENOENT") stateFailure("Routing state parent inspection failed", error)
    if (!create) return false
    const missing = []
    let cursor = parent
    while (true) {
      try { stats = lstatSync(cursor); break } catch (cause) {
        if (cause?.code !== "ENOENT") stateFailure("Routing state parent inspection failed", cause)
        missing.push(cursor); cursor = dirname(cursor)
      }
    }
    assertSafeDirectory(cursor, stats)
    for (const path of missing.reverse()) {
      try { mkdirSync(path, { mode: 0o700 }); chmodSync(path, 0o700) }
      catch (cause) { stateFailure("Routing state parent creation failed", cause) }
      assertSafeDirectory(path, lstatSync(path))
    }
    return true
  }
  assertSafeDirectory(parent, stats)
  return true
}
const emptyRead = () => ({ state: null, bytes: null })
const readCurrent = (statePath, { strict = false } = {}) => {
  if (!isAbsolute(statePath ?? "")) return emptyRead()
  try { if (!inspectParent(dirname(statePath))) return emptyRead() }
  catch (error) { if (strict) throw error; return emptyRead() }
  let descriptor, bytes
  try {
    descriptor = openSync(statePath, constants.O_RDONLY | constants.O_NOFOLLOW)
    const stats = fstatSync(descriptor)
    if (!stats.isFile() || !owned(stats) || mode(stats) !== 0o600 || stats.nlink !== 1) stateFailure("Routing state file is unsafe")
    bytes = readFileSync(descriptor)
  } catch (error) {
    if (error?.code === "ENOENT") return emptyRead()
    if (strict) {
      if (error?.code === "CT_ESCALATION_STATE_WRITE_FAILED") throw error
      stateFailure("Routing state read failed", error)
    }
    return emptyRead()
  } finally { if (descriptor !== undefined) closeSync(descriptor) }
  try {
    const state = JSON.parse(bytes.toString("utf8"))
    return { state: exactState(state) ? state : null, bytes }
  } catch { return { state: null, bytes } }
}
const createFile = (path, bytes) => {
  let descriptor
  try {
    descriptor = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
    fchmodSync(descriptor, 0o600)
    const stats = fstatSync(descriptor)
    if (!stats.isFile() || !owned(stats) || mode(stats) !== 0o600 || stats.nlink !== 1) stateFailure("Routing temporary file is unsafe")
    writeFileSync(descriptor, bytes); fsyncSync(descriptor); closeSync(descriptor); descriptor = undefined
  } catch (error) {
    if (descriptor !== undefined) try { closeSync(descriptor) } catch {}
    try { rmSync(path, { force: true }) } catch {}
    if (error?.code === "CT_ESCALATION_STATE_WRITE_FAILED") throw error
    stateFailure("Routing temporary write failed", error)
  }
}
const syncParent = (parent) => {
  let descriptor
  try {
    descriptor = openSync(parent, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0) | constants.O_NOFOLLOW)
    assertSafeDirectory(parent, fstatSync(descriptor))
    fsyncSync(descriptor)
  } catch (error) {
    if (error?.code === "CT_ESCALATION_STATE_WRITE_FAILED") throw error
    stateFailure("Routing state directory sync failed", error)
  } finally { if (descriptor !== undefined) closeSync(descriptor) }
}
const acquireLock = (lockPath) => {
  const deadline = Date.now() + LOCK_TIMEOUT_MS
  while (true) {
    let descriptor
    try {
      descriptor = openSync(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
      fchmodSync(descriptor, 0o600)
      const stats = fstatSync(descriptor)
      if (!stats.isFile() || !owned(stats) || mode(stats) !== 0o600 || stats.nlink !== 1) stateFailure("Routing lock is unsafe")
      return descriptor
    } catch (error) {
      if (descriptor !== undefined) {
        try { closeSync(descriptor) } catch {}
        try { rmSync(lockPath, { force: true }) } catch {}
      }
      if (error?.code === "EEXIST") {
        if (Date.now() >= deadline) fail("CT_ESCALATION_STATE_BUSY", "Routing state is busy")
        pause(Math.min(2, Math.max(1, deadline - Date.now())))
        continue
      }
      if (error?.code === "CT_ESCALATION_STATE_WRITE_FAILED") throw error
      stateFailure("Routing lock failed", error)
    }
  }
}
const withLock = (statePath, operation) => {
  if (!isAbsolute(statePath ?? "")) stateFailure("Routing state path must be absolute")
  const parent = dirname(statePath), lockPath = `${statePath}.lock`
  inspectParent(parent, { create: true })
  const descriptor = acquireLock(lockPath)
  try { return operation() } finally {
    try { closeSync(descriptor) } catch {}
    try { rmSync(lockPath, { force: true }) } catch {}
  }
}
const sameBytes = (left, right) => left === null ? right === null : right !== null && left.equals(right)
const writeState = (statePath, state, expectedRevision, priorBytes) => {
  const parent = dirname(statePath)
  inspectParent(parent)
  const bytes = Buffer.from(`${JSON.stringify(state)}\n`)
  const temporary = join(parent, `.routing-mode.${randomUUID()}.tmp`)
  let renamed = false
  try {
    createFile(temporary, bytes)
    const observed = readCurrent(statePath, { strict: true })
    if ((observed.state?.revision ?? 0) !== expectedRevision || !sameBytes(observed.bytes, priorBytes)) {
      fail("CT_ESCALATION_CAS_MISMATCH", "Routing state changed before commit")
    }
    renameSync(temporary, statePath); renamed = true
    try { syncParent(parent) } catch (error) {
      try {
        if (priorBytes === null) rmSync(statePath, { force: true })
        else {
          const rollback = join(parent, `.routing-mode.${randomUUID()}.rollback`)
          createFile(rollback, priorBytes)
          try { renameSync(rollback, statePath) } finally { rmSync(rollback, { force: true }) }
        }
        syncParent(parent)
      } catch (rollbackError) { fail("CT_ESCALATION_DURABILITY_UNKNOWN", "Routing state durability is unknown", rollbackError) }
      stateFailure("Routing state directory sync failed", error)
    }
    return Object.freeze({ ...state, record_path: statePath })
  } catch (error) {
    if (error?.code?.startsWith("CT_")) throw error
    if (renamed) fail("CT_ESCALATION_DURABILITY_UNKNOWN", "Routing state durability is unknown", error)
    stateFailure("Routing state write failed", error)
  } finally { try { rmSync(temporary, { force: true }) } catch {} }
}

export const createRoutingController = ({ statePath, authenticateLocal, authenticateRemote } = {}) => Object.freeze({
  resolveMode({ identity } = {}) { return resolveFailClosed(readCurrent(statePath).state, identity) },
  switchMode({ actor, route, proof, mode: requestedMode } = {}) {
    if (actor !== "MAINTAINER") fail("CT_ESCALATION_ACTOR_DENIED", `Routing-mode switch rejected actor: ${String(actor)}`)
    if (!modes.has(requestedMode)) fail("CT_ESCALATION_MODE_INVALID", "Routing mode must be local or remoto")
    const authenticate = route === "LOCAL_CLI" ? authenticateLocal : route === "REMOTE_CALLBACK" ? authenticateRemote : null
    if (route === "REMOTE_CALLBACK" && typeof authenticate !== "function") fail("CT_ESCALATION_REMOTE_DISABLED", "Remote callback authentication is unavailable until S8.7")
    if (typeof authenticate !== "function") fail("CT_ESCALATION_IDENTITY_INVALID", "Authenticated maintainer identity is required")
    let identity
    try { identity = authenticate({ actor, route, proof }) } catch {}
    if (!exactIdentity(identity)) fail("CT_ESCALATION_IDENTITY_INVALID", "Maintainer identity is absent, invalid, or ambiguous")
    return withLock(statePath, () => {
      const current = readCurrent(statePath, { strict: true })
      if (current.state?.mode === requestedMode && current.state.maintainer_id === identity.subject_id) return Object.freeze({ ...current.state, record_path: statePath })
      return writeState(statePath, {
        schema: "routing-mode", schema_version: 1, mode: requestedMode,
        revision: (current.state?.revision ?? 0) + 1, maintainer_id: identity.subject_id,
      }, current.state?.revision ?? 0, current.bytes)
    })
  },
})

export const dispatchDecisionRequest = async ({ controller, request, identity, remoteTransport } = {}) => {
  if (!controller || typeof controller.resolveMode !== "function" || request?.state !== "PENDING") fail("CT_ESCALATION_REQUEST_INVALID", "A pending canonical decision request is required")
  const routingMode = controller.resolveMode({ identity })
  const pending = Object.freeze({ mode: routingMode, delivered: false, pending: true, recoverable_locally: true, request })
  if (routingMode === "local") return pending
  if (!remoteTransport || typeof remoteTransport.send !== "function") return Object.freeze({ ...pending, code: "CT_ESCALATION_TRANSPORT_UNAVAILABLE" })
  try {
    await remoteTransport.send(request)
    return Object.freeze({ ...pending, delivered: true })
  } catch { return Object.freeze({ ...pending, code: "CT_ESCALATION_TRANSPORT_UNAVAILABLE" }) }
}
