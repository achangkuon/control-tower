import * as nodeFs from "node:fs"
import { randomUUID } from "node:crypto"
import { dirname, isAbsolute, join } from "node:path"

import { canonicalize } from "../contracts/canonicalize.mjs"
import { validate } from "../contracts/validate.mjs"

const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const pause = (milliseconds) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
const mode = (stats) => stats.mode & 0o777
const own = (stats) => typeof process.getuid !== "function" || stats.uid === process.getuid()
const withoutEntryRevision = ({ registry_entry_revision: _revision, ...entry }) => entry

export const createProjectRegistryStore = ({ registryPath, fs = nodeFs, beforeCommit, lockTimeoutMs = 5_000 } = {}) => {
  if (!isAbsolute(registryPath ?? "") || registryPath.includes("\0")) fail("CT_REGISTRY_PATH_INVALID", "Project registry path must be absolute")
  const parent = dirname(registryPath), lockPath = `${registryPath}.lock`
  const unsafe = (message, cause) => fail("CT_REGISTRY_UNSAFE", message, cause)
  const assertSafeDirectory = (stats) => {
    if (!stats.isDirectory() || stats.isSymbolicLink() || !own(stats) || mode(stats) !== 0o700) unsafe("Unsafe registry directory")
  }
  const normalizeCreatedFile = (descriptor) => {
    fs.fchmodSync(descriptor, 0o600)
    const stats = fs.fstatSync(descriptor)
    if (!stats.isFile() || !own(stats) || mode(stats) !== 0o600) unsafe("Unsafe registry temporary file")
  }

  const inspectParent = ({ create = false } = {}) => {
    if (create) {
      try {
        const missing = []
        let cursor = parent
        while (true) {
          try { fs.lstatSync(cursor); break }
          catch (error) {
            if (error?.code !== "ENOENT") throw error
            missing.push(cursor); cursor = dirname(cursor)
          }
        }
        for (const path of missing.reverse()) {
          fs.mkdirSync(path, { mode: 0o700 })
          fs.chmodSync(path, 0o700)
          assertSafeDirectory(fs.lstatSync(path))
        }
      }
      catch (error) {
        if (error?.code?.startsWith("CT_")) throw error
        fail("CT_REGISTRY_WRITE_FAILED", "Registry directory creation failed", error)
      }
    }
    let stats
    try { stats = fs.lstatSync(parent) }
    catch (error) {
      if (!create && error?.code === "ENOENT") return null
      fail(create ? "CT_REGISTRY_WRITE_FAILED" : "CT_REGISTRY_READ_FAILED", "Registry directory inspection failed", error)
    }
    if (!stats.isDirectory() || stats.isSymbolicLink() || !own(stats)) unsafe("Unsafe registry directory")
    if (mode(stats) !== 0o700) {
      if (!create) unsafe("Registry directory must be owner-only")
      try { fs.chmodSync(parent, 0o700) } catch (error) { unsafe("Registry directory permissions are unsafe", error) }
      stats = fs.lstatSync(parent)
    }
    assertSafeDirectory(stats)
    return stats
  }

  const readCurrent = () => {
    if (!inspectParent()) return { document: null, bytes: null }
    let stats
    try { stats = fs.lstatSync(registryPath) }
    catch (error) {
      if (error?.code === "ENOENT") return { document: null, bytes: null }
      fail("CT_REGISTRY_READ_FAILED", "Registry inspection failed", error)
    }
    if (!stats.isFile() || stats.isSymbolicLink() || !own(stats) || mode(stats) !== 0o600) unsafe("Unsafe registry file")
    let descriptor
    try {
      descriptor = fs.openSync(registryPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW)
      const opened = fs.fstatSync(descriptor)
      if (!opened.isFile() || !own(opened) || mode(opened) !== 0o600) unsafe("Unsafe opened registry file")
      const bytes = fs.readFileSync(descriptor)
      return { document: validate("projectRegistry", bytes.toString("utf8")), bytes }
    } catch (error) {
      if (error?.code?.startsWith("CT_")) throw error
      fail("CT_REGISTRY_READ_FAILED", "Registry read failed", error)
    } finally { if (descriptor !== undefined) fs.closeSync(descriptor) }
  }

  const checkRevisions = (candidate, current, expectedRevision) => {
    const actual = current?.registry_revision ?? 0
    if (!Number.isInteger(expectedRevision) || expectedRevision !== actual || candidate.registry_revision !== actual + 1) {
      fail("CT_CAS_MISMATCH", "Registry revision changed")
    }
    const prior = new Map((current?.projects ?? []).map((entry) => [entry.project_id, entry]))
    for (const entry of candidate.projects) {
      const previous = prior.get(entry.project_id)
      if (!previous) {
        if (entry.registry_entry_revision !== 1) fail("CT_CAS_MISMATCH", "New registry entries must start at revision one")
        continue
      }
      const changed = canonicalize(withoutEntryRevision(entry)) !== canonicalize(withoutEntryRevision(previous))
      const expected = previous.registry_entry_revision + (changed ? 1 : 0)
      if (entry.registry_entry_revision !== expected) fail("CT_CAS_MISMATCH", "Registry entry revision is invalid")
    }
  }

  const createTemp = (bytes, suffix = "tmp") => {
    const path = join(parent, `.projects.${randomUUID()}.${suffix}`)
    let descriptor
    try {
      descriptor = fs.openSync(path, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600)
      normalizeCreatedFile(descriptor)
      fs.writeFileSync(descriptor, bytes)
      fs.fsyncSync(descriptor)
      fs.closeSync(descriptor); descriptor = undefined
      return path
    } catch (error) {
      if (descriptor !== undefined) { try { fs.closeSync(descriptor) } catch {} }
      try { fs.rmSync(path, { force: true }) } catch {}
      fail("CT_REGISTRY_WRITE_FAILED", "Registry temporary write failed", error)
    }
  }

  const syncParent = () => {
    const descriptor = fs.openSync(parent, fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY ?? 0))
    try { fs.fsyncSync(descriptor) } finally { fs.closeSync(descriptor) }
  }

  const acquireLock = () => {
    const deadline = Date.now() + lockTimeoutMs
    while (true) {
      try {
        const descriptor = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600)
        try { normalizeCreatedFile(descriptor) } catch (error) { fs.closeSync(descriptor); fs.rmSync(lockPath, { force: true }); throw error }
        return descriptor
      }
      catch (error) {
        if (error?.code?.startsWith("CT_")) throw error
        if (error?.code !== "EEXIST") fail("CT_REGISTRY_WRITE_FAILED", "Registry lock failed", error)
        if (Date.now() >= deadline) fail("CT_REGISTRY_BUSY", "Project registry is busy")
        pause(Math.min(2, Math.max(1, deadline - Date.now())))
      }
    }
  }

  const rollback = (priorBytes) => {
    try {
      if (priorBytes === null) fs.rmSync(registryPath, { force: true })
      else {
        const rollbackPath = createTemp(priorBytes, "rollback")
        try { fs.renameSync(rollbackPath, registryPath) } finally { fs.rmSync(rollbackPath, { force: true }) }
      }
      syncParent()
    } catch (error) { fail("CT_REGISTRY_DURABILITY_UNKNOWN", "Registry durability is unknown; reload before retry", error) }
  }

  return Object.freeze({
    load() { return readCurrent().document },
    save({ document, expectedRevision } = {}) {
      const candidate = validate("projectRegistry", document)
      const bytes = Buffer.from(`${canonicalize(candidate)}\n`)
      inspectParent({ create: true })
      let temporary, lockDescriptor, renamed = false, priorBytes = null
      try {
        temporary = createTemp(bytes)
        lockDescriptor = acquireLock()
        const current = readCurrent()
        priorBytes = current.bytes
        checkRevisions(candidate, current.document, expectedRevision)
        beforeCommit?.(registryPath, candidate)
        fs.renameSync(temporary, registryPath); temporary = undefined; renamed = true
        try { syncParent() }
        catch (error) { rollback(priorBytes); fail("CT_REGISTRY_WRITE_FAILED", "Registry directory sync failed", error) }
        return candidate
      } catch (error) {
        if (error?.code?.startsWith("CT_")) throw error
        if (renamed) rollback(priorBytes)
        fail("CT_REGISTRY_WRITE_FAILED", "Atomic registry write failed", error)
      } finally {
        if (temporary) { try { fs.rmSync(temporary, { force: true }) } catch {} }
        if (lockDescriptor !== undefined) {
          try { fs.closeSync(lockDescriptor) } catch {}
          try { fs.rmSync(lockPath, { force: true }) } catch {}
        }
      }
    },
  })
}
