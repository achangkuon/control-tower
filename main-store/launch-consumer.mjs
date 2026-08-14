import { closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { isAbsolute, join } from "node:path"

import { resolveJornadaLifecycle } from "../jornada/lifecycle.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const parse = (path) => JSON.parse(readFileSync(path, "utf8"))
const exact = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
const validRef = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)
const bindingKeys = ["request_ref", "authorization_id", "brief", "brief_ref", "assignment_ref", "worktree", "candidate_revision", "host_epoch", "fence_path", "project_id", "jornada_id", "jornada_revision", "active_epoch"]
const epochKeys = ["epoch", "project_id"]

export const createLaunchBindingConsumer = ({ root } = {}) => {
  if (!isAbsolute(root ?? "") || !existsSync(root)) fail("CT_LAUNCH_BINDING_INVALID", "Main launch store is unavailable")
  const rootStats = lstatSync(root)
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink() || rootStats.uid !== process.getuid() || (rootStats.mode & 0o777) !== 0o700) fail("CT_LAUNCH_BINDING_INVALID", "Main launch store is unsafe")
  const directory = (name, create = false) => {
    const path = join(root, name)
    if (create) mkdirSync(path, { recursive: true, mode: 0o700 })
    if (!existsSync(path)) fail("CT_LAUNCH_BINDING_INVALID", "Main launch binding is unavailable")
    const stats = lstatSync(path)
    if (!stats.isDirectory() || stats.isSymbolicLink() || stats.uid !== process.getuid() || (stats.mode & 0o777) !== 0o700) fail("CT_LAUNCH_BINDING_INVALID", "Main launch store is unsafe")
    return path
  }
  const bindings = directory("launch-bindings"), consumptions = directory("launch-consumptions", true)
  const safeEpochRecord = (path) => {
    let descriptor
    try {
      const before = lstatSync(path)
      if (!before.isFile() || before.isSymbolicLink() || before.uid !== process.getuid() || (before.mode & 0o777) !== 0o600 || before.nlink !== 1) fail("CT_LAUNCH_BINDING_STALE", "Main epoch authority is unsafe")
      descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)
      const opened = fstatSync(descriptor), bytes = readFileSync(descriptor, "utf8"), after = lstatSync(path)
      if (opened.dev !== before.dev || opened.ino !== before.ino || after.dev !== before.dev || after.ino !== before.ino || after.uid !== before.uid || (after.mode & 0o777) !== 0o600 || after.nlink !== 1) fail("CT_LAUNCH_BINDING_STALE", "Main epoch authority changed during read")
      try { return JSON.parse(bytes) } catch { fail("CT_LAUNCH_BINDING_STALE", "Main epoch authority is malformed") }
    } catch (error) {
      if (error?.code?.startsWith("CT_")) throw error
      fail("CT_LAUNCH_BINDING_STALE", "Main epoch authority is unavailable")
    } finally { if (descriptor !== undefined) closeSync(descriptor) }
  }
  return Object.freeze({
    consume(requestRef) {
      if (!validRef(requestRef)) fail("CT_LAUNCH_BINDING_INVALID", "Launch request ref is invalid")
      const bindingPath = join(bindings, `${requestRef}.json`), consumptionPath = join(consumptions, `${requestRef}.json`)
      if (!existsSync(bindingPath)) fail("CT_LAUNCH_BINDING_INVALID", "Launch binding is unavailable")
      const record = parse(bindingPath)
      if (!exact(record, bindingKeys) || record.request_ref !== requestRef) fail("CT_LAUNCH_BINDING_STALE", "Launch binding is stale")
      const pointer = safeEpochRecord(join(root, "current-epoch.json"))
      if (!exact(pointer, epochKeys) || !Number.isSafeInteger(pointer.epoch) || pointer.epoch < 1 || pointer.project_id !== record.project_id) fail("CT_LAUNCH_BINDING_STALE", "Current Main epoch is invalid")
      const published = safeEpochRecord(join(directory("epoch-records"), `${pointer.epoch}.json`))
      if (!exact(published, epochKeys) || published.epoch !== pointer.epoch || published.project_id !== pointer.project_id || record.active_epoch !== pointer.epoch) fail("CT_LAUNCH_BINDING_STALE", "Launch binding epoch is stale")
      const authorization = parse(join(directory("authorizations"), `${record.authorization_id}.json`))
      if (authorization.state !== "APPROVED" || authorization.project_id !== record.project_id || authorization.jornada_id !== record.jornada_id || authorization.jornada_revision !== record.jornada_revision || authorization.extensions?.["control-tower/candidate-revision"] !== record.candidate_revision || Date.parse(authorization.expires_at) <= Date.now()) fail("CT_LAUNCH_BINDING_STALE", "Launch binding authorization is stale")
      const jornada = resolveJornadaLifecycle(parse(join(directory("jornadas"), `${record.jornada_id}.json`)))
      if (jornada.state !== "ACTIVE" || jornada.jornada_revision !== record.jornada_revision) fail("CT_LAUNCH_BINDING_STALE", "Launch binding Jornada is stale")
      let descriptor
      try {
        descriptor = openSync(consumptionPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
        writeFileSync(descriptor, `${JSON.stringify({ request_ref: requestRef, binding_path: bindingPath })}\n`)
        fsyncSync(descriptor)
      } catch (error) {
        if (error?.code === "EEXIST") fail("CT_LAUNCH_BINDING_CONSUMED", "Launch binding was already consumed")
        fail("CT_LAUNCH_BINDING_INVALID", "Launch binding consumption failed")
      } finally { if (descriptor !== undefined) closeSync(descriptor) }
      return Object.freeze({ assignment_ref: record.assignment_ref, brief: record.brief, brief_ref: record.brief_ref, candidate_revision: record.candidate_revision, fence_path: record.fence_path, host_epoch: record.host_epoch, project_id: record.project_id, worktree: record.worktree })
    },
  })
}
