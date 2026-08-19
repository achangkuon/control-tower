import { closeSync, constants, fstatSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

import { validate } from "../contracts/validate.mjs"

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const terminal = new Set(["DELIVERED", "UNRECONCILED"])
const owner = typeof process.getuid === "function" ? process.getuid() : null
const directoryName = (candidateRevision) => {
  if (!/^sha256:[a-f0-9]{64}$/.test(candidateRevision ?? "")) fail("CT_DELIVERY_INVALID", "Frozen candidate revision is required")
  return candidateRevision.slice("sha256:".length)
}
const statOrNull = (path) => { try { return lstatSync(path) } catch (error) { if (error?.code === "ENOENT") return null; throw error } }
const secureStat = (stat, kind) => {
  const validKind = kind === "directory" ? stat.isDirectory() : stat.isFile()
  const expectedMode = kind === "directory" ? 0o700 : 0o600
  if (!validKind || stat.isSymbolicLink() || owner !== null && stat.uid !== owner || (stat.mode & 0o777) !== expectedMode || kind === "record" && stat.nlink !== 1) {
    fail("CT_DELIVERY_LEDGER_UNSAFE", `Unsafe delivery ledger ${kind}`)
  }
  return stat
}
const secureDirectory = (path) => secureStat(lstatSync(path), "directory")
const syncDirectory = (path) => {
  const fd = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0) | constants.O_NOFOLLOW)
  try { secureStat(fstatSync(fd), "directory"); fsyncSync(fd) } finally { closeSync(fd) }
}
const readRecord = (path) => {
  let fd
  try { fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW) }
  catch { fail("CT_DELIVERY_LEDGER_UNSAFE", "Unsafe delivery ledger record") }
  try { secureStat(fstatSync(fd), "record"); return JSON.parse(readFileSync(fd, "utf8")) }
  catch (error) { if (error?.code === "CT_DELIVERY_LEDGER_UNSAFE") throw error; fail("CT_DELIVERY_LEDGER_UNSAFE", "Unreadable delivery ledger record") }
  finally { closeSync(fd) }
}
const holderAlive = (pid) => { try { process.kill(pid, 0); return true } catch (error) { return error?.code !== "ESRCH" } }
// The lock writes {pid, candidate_revision}; read it back so a holder killed before its `finally`
// does not strand its candidate_revision forever. A soft read: anything unreadable stays held.
const readLockHolder = (path) => {
  let fd
  try { fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW) } catch { return null }
  try {
    const stat = fstatSync(fd)
    if (stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600 || owner !== null && stat.uid !== owner) return null
    const holder = JSON.parse(readFileSync(fd, "utf8"))
    if (!Number.isSafeInteger(holder?.pid) || holder.pid <= 0) return null
    return { pid: holder.pid, candidateRevision: holder.candidate_revision, dev: stat.dev, ino: stat.ino }
  } catch { return null } finally { closeSync(fd) }
}
const validateRoot = (root) => {
  if (typeof root !== "string" || !root.startsWith("/") || root !== resolve(root)) fail("CT_DELIVERY_LEDGER_UNSAFE", "Canonical delivery ledger root is required")
  try {
    secureDirectory(root)
    if (realpathSync(root) !== root) fail("CT_DELIVERY_LEDGER_UNSAFE", "Delivery ledger root cannot contain symlinks")
  } catch (error) { if (error?.code === "CT_DELIVERY_LEDGER_UNSAFE") throw error; fail("CT_DELIVERY_LEDGER_UNSAFE", "Delivery ledger root is unavailable") }
}

export const createDeliveryLedger = ({ root, clock = () => new Date().toISOString() } = {}) => {
  validateRoot(root)
  if (typeof clock !== "function") fail("CT_DELIVERY_INVALID", "Delivery ledger clock is required")
  const held = new Set()
  const history = async (candidateRevision) => {
    const directory = join(root, directoryName(candidateRevision)), stat = statOrNull(directory)
    if (!stat) return Object.freeze([])
    secureStat(stat, "directory")
    const names = readdirSync(directory).sort()
    if (names.some((name) => !/^\d{6}\.json$/.test(name))) fail("CT_DELIVERY_LEDGER_UNSAFE", "Unexpected delivery ledger entry")
    const records = names.map((name) => validate("deliveryRecord", readRecord(join(directory, name))))
    records.forEach((record, index) => {
      if (record.candidate_revision !== candidateRevision || record.revision !== index + 1) fail("CT_DELIVERY_LEDGER_INVALID", "Delivery ledger history is not contiguous")
    })
    return Object.freeze(records)
  }
  const withCandidateLock = async (candidateRevision, operation) => {
    const key = directoryName(candidateRevision)
    if (typeof operation !== "function" || held.has(key)) fail("CT_DELIVERY_LEDGER_UNSAFE", "Candidate lock operation is invalid")
    const path = join(root, `.${key}.lock`), deadline = Date.now() + 5_000
    let fd
    while (fd === undefined) {
      try { fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600) }
      catch (error) {
        if (error?.code !== "EEXIST") fail("CT_DELIVERY_LEDGER_UNSAFE", "Candidate lock cannot be acquired")
        const lock = statOrNull(path)
        if (!lock) continue
        secureStat(lock, "record")
        const holder = readLockHolder(path)
        if (holder?.candidateRevision === candidateRevision && !holderAlive(holder.pid)) {
          const stale = statOrNull(path)
          if (stale && stale.dev === holder.dev && stale.ino === holder.ino) { unlinkSync(path); syncDirectory(root) }
          continue
        }
        if (Date.now() >= deadline) fail("CT_DELIVERY_LEDGER_BUSY", "Candidate delivery is locked")
        await Bun.sleep(10)
      }
    }
    const identity = secureStat(fstatSync(fd), "record")
    try {
      writeFileSync(fd, `${JSON.stringify({ pid: process.pid, candidate_revision: candidateRevision })}\n`); fsyncSync(fd); syncDirectory(root)
      held.add(key)
      return await operation()
    } finally {
      held.delete(key); closeSync(fd)
      const current = statOrNull(path)
      if (!current || current.dev !== identity.dev || current.ino !== identity.ino) fail("CT_DELIVERY_LEDGER_UNSAFE", "Candidate lock identity changed")
      unlinkSync(path); syncDirectory(root)
    }
  }
  const appendUnlocked = async (input, expectedRevision) => {
    const records = await history(input?.candidate_revision)
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== records.length) fail("CT_CAS_MISMATCH", "Delivery ledger revision changed")
    if (terminal.has(records.at(-1)?.state)) fail("CT_DELIVERY_TERMINAL", "Delivery is terminal")
    const record = validate("deliveryRecord", {
      schema: "delivery-record", schema_version: 1, candidate_revision: input.candidate_revision,
      revision: records.length + 1, previous_revision: records.length, state: input.state,
      shape: input.shape, authorization_ref: input.authorization_ref, attempt: input.attempt,
      ...(input.classification ? { classification: input.classification } : {}),
      ...(typeof input.reconciled === "boolean" ? { reconciled: input.reconciled } : {}), created_at: clock(),
    })
    const directory = join(root, directoryName(input.candidate_revision))
    if (!statOrNull(directory)) { mkdirSync(directory, { mode: 0o700 }); syncDirectory(root) }
    secureDirectory(directory)
    const finalPath = join(directory, `${String(record.revision).padStart(6, "0")}.json`)
    if (statOrNull(finalPath)) fail("CT_CAS_MISMATCH", "Delivery ledger revision changed")
    const temporaryPath = join(directory, `.${String(record.revision).padStart(6, "0")}.${process.pid}.tmp`)
    let fd
    try {
      fd = openSync(temporaryPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
      secureStat(fstatSync(fd), "record"); writeFileSync(fd, `${JSON.stringify(record)}\n`); fsyncSync(fd); closeSync(fd); fd = undefined
      try { linkSync(temporaryPath, finalPath) } catch (error) { if (error?.code === "EEXIST") fail("CT_CAS_MISMATCH", "Delivery ledger revision changed"); throw error }
      unlinkSync(temporaryPath); syncDirectory(directory)
    } catch (error) {
      if (fd !== undefined) closeSync(fd)
      const temporary = statOrNull(temporaryPath)
      if (temporary?.isFile() && temporary.uid === owner && temporary.nlink === 1) unlinkSync(temporaryPath)
      throw error
    }
    return validate("deliveryRecord", readRecord(finalPath))
  }
  const append = async (input, expectedRevision) => held.has(directoryName(input?.candidate_revision))
    ? appendUnlocked(input, expectedRevision)
    : withCandidateLock(input?.candidate_revision, () => appendUnlocked(input, expectedRevision))
  return Object.freeze({ append, history, withCandidateLock })
}
