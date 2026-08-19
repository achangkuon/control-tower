import { closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { isAbsolute, join } from "node:path"

import { ROOT_AGENT, assertRootIdentity, canonicalRootSessionId } from "./root-identity.mjs"

// What is persisted. `agent` and `root_session_id` are flattened from a proven identity, never taken loose.
const BINDING_KEYS = Object.freeze(["agent", "assignment_ref", "backend_pid", "backend_url", "host_epoch", "project_id", "root_session_id", "worktree"])
// What a caller may supply. `root_identity` can only be minted by `parseRootIdentity`.
const INPUT_KEYS = Object.freeze(["assignment_ref", "backend_pid", "backend_url", "host_epoch", "project_id", "root_identity", "worktree"])
const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
// Refs address a file inside our own directory, so traversal, separators and option shapes are excluded by grammar.
const validRef = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) && !value.includes("..")
const bounded = (value) => typeof value === "string" && value.length > 0 && value.length <= 512 && !value.includes("\0")
const positive = (value) => Number.isSafeInteger(value) && value > 0
// Decision 38: each worktree owns an isolated loopback backend. A non-loopback origin is never this backend.
// The grammar alone would admit 99999, which is not a port. 65535 is the last one there is, so the
// range is checked numerically rather than spelled out as an unreadable alternation.
const loopback = (value) => bounded(value) && Number(/^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(value)?.[1] ?? NaN) <= 65535
const owned = (stats) => stats.uid === process.getuid() && !stats.isSymbolicLink()

// Shared field rules. The root identity is validated separately, because only its brand proves primary-vs-child.
const validFields = (value) => validRef(value.assignment_ref) && bounded(value.project_id)
  && bounded(value.worktree) && isAbsolute(value.worktree)
  && loopback(value.backend_url) && positive(value.backend_pid) && positive(value.host_epoch)

const validRecord = (value) => exact(value, BINDING_KEYS) && validFields(value)
  && value.agent === ROOT_AGENT && canonicalRootSessionId(value.root_session_id)

const safeDirectory = (path, create = false) => {
  if (create && !existsSync(path)) mkdirSync(path, { recursive: true, mode: 0o700 })
  if (!existsSync(path)) fail("CT_ROOT_BINDING_INVALID", "Root binding store is unavailable")
  const stats = lstatSync(path)
  if (!stats.isDirectory() || !owned(stats) || (stats.mode & 0o777) !== 0o700) fail("CT_ROOT_BINDING_INVALID", "Root binding store is unsafe")
  return path
}

export const createRootBindingStore = ({ root } = {}) => {
  if (typeof root !== "string" || !isAbsolute(root)) fail("CT_ROOT_BINDING_INVALID", "Root binding store path is invalid")
  safeDirectory(root)
  const bindings = () => safeDirectory(join(root, "root-bindings"), true)
  const pathFor = (ref) => {
    if (!validRef(ref)) fail("CT_ROOT_BINDING_INVALID", "Root binding assignment ref is invalid")
    return join(bindings(), `${ref}.json`)
  }
  const readSafely = (path, ref) => {
    let descriptor
    try {
      const before = lstatSync(path)
      if (!before.isFile() || !owned(before) || (before.mode & 0o777) !== 0o600 || before.nlink !== 1) fail("CT_ROOT_BINDING_INVALID", "Root binding is stored unsafely")
      descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)
      const opened = fstatSync(descriptor), bytes = readFileSync(descriptor, "utf8"), after = lstatSync(path)
      if (opened.dev !== before.dev || opened.ino !== before.ino || after.ino !== before.ino) fail("CT_ROOT_BINDING_INVALID", "Root binding changed during read")
      let record
      try { record = JSON.parse(bytes) } catch { fail("CT_ROOT_BINDING_INVALID", "Root binding is malformed") }
      if (!validRecord(record) || record.assignment_ref !== ref) fail("CT_ROOT_BINDING_INVALID", "Root binding is ambiguous or foreign")
      return Object.freeze(record)
    } catch (error) {
      if (error?.code?.startsWith("CT_")) throw error
      fail("CT_ROOT_BINDING_INVALID", "Root binding is unavailable")
    } finally { if (descriptor !== undefined) closeSync(descriptor) }
  }
  return Object.freeze({
    // Exactly one primary root per assignment: O_EXCL makes a second bind fail closed, replay included.
    // The root can only arrive as a proven identity, so a child session id cannot be smuggled in as a root.
    bind(input) {
      if (!exact(input, INPUT_KEYS) || !validFields(input)) fail("CT_ROOT_BINDING_INVALID", "Root binding record is invalid")
      const identity = assertRootIdentity(input.root_identity)
      const path = pathFor(input.assignment_ref)
      const flattened = { ...input, agent: identity.agent, root_session_id: identity.root_session_id }
      const record = Object.freeze(Object.fromEntries(BINDING_KEYS.map((key) => [key, flattened[key]])))
      if (!validRecord(record)) fail("CT_ROOT_BINDING_INVALID", "Root binding record is invalid")
      let descriptor
      try {
        descriptor = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
        writeFileSync(descriptor, `${JSON.stringify(record)}\n`)
        fsyncSync(descriptor)
      } catch (error) {
        if (error?.code === "EEXIST") fail("CT_ROOT_BINDING_EXISTS", "Assignment already has a primary root binding")
        fail("CT_ROOT_BINDING_INVALID", "Root binding could not be persisted")
      } finally { if (descriptor !== undefined) closeSync(descriptor) }
      return record
    },
    read(ref) { return readSafely(pathFor(ref), ref) },
    // Owner-only cleanup: the ref names our own file and the record must validate before anything is removed.
    release(ref) {
      const path = pathFor(ref)
      readSafely(path, ref)
      rmSync(path)
      return true
    },
  })
}
