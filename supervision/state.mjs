import { createHash, randomBytes } from "node:crypto"
import { constants } from "node:fs"
import { chmod, lstat, mkdir, open, rename, unlink } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

const CODE = "CT_SUPERVISION_STATE"
const FIELDS = ["project_id", "repository_identity", "worktree", "base_sha", "sesion_id", "contract_digest", "expires_at"]
const EXPECTED = FIELDS.filter((field) => !["project_id", "expires_at"].includes(field))
const PROJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const SHA = /^[0-9a-f]{40}$/
const DIGEST = /^[0-9a-f]{64}$/
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

const fail = (message, cause) => {
  const error = new Error(message, cause === undefined ? undefined : { cause })
  error.code = CODE
  throw error
}
const canonical = (value) => value === null || typeof value !== "object" ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
const digest = (value) => createHash("sha256").update(canonical(value)).digest("hex")
const regularOwnerOnly = (stat, mode) => stat.isFile() && !stat.isSymbolicLink()
  && (stat.mode & 0o777) === mode && (typeof process.getuid !== "function" || stat.uid === process.getuid())
const directoryOwnerOnly = (stat) => stat.isDirectory() && !stat.isSymbolicLink()
  && (stat.mode & 0o777) === 0o700 && (typeof process.getuid !== "function" || stat.uid === process.getuid())
const statOrNull = async (path) => {
  try { return await lstat(path) }
  catch (error) { if (error?.code === "ENOENT") return null; throw error }
}
const validateBinding = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== FIELDS.length || FIELDS.some((field) => !Object.hasOwn(value, field))
    || !PROJECT_ID.test(value.project_id) || typeof value.repository_identity !== "string" || value.repository_identity.length === 0
    || typeof value.worktree !== "string" || !value.worktree.startsWith("/") || !SHA.test(value.base_sha)
    || typeof value.sesion_id !== "string" || value.sesion_id.length === 0 || !DIGEST.test(value.contract_digest)
    || typeof value.expires_at !== "string" || !RFC3339.test(value.expires_at)
    || !Number.isFinite(Date.parse(value.expires_at))) fail("Malformed supervision state")
  return value
}
const safeDirectory = async (path, create = false) => {
  if (create) {
    try { await mkdir(path, { recursive: true, mode: 0o700 }) } catch (error) { fail("Cannot create supervision directory", error) }
  }
  let stat
  try { stat = await lstat(path) } catch (error) { fail("Supervision directory is absent", error) }
  if (!directoryOwnerOnly(stat)) fail("Unsafe supervision directory")
}
const safeFile = async (path, mode = 0o600) => {
  let stat
  try { stat = await lstat(path) } catch (error) { fail("Supervision state is absent", error) }
  if (!regularOwnerOnly(stat, mode)) fail("Unsafe supervision file")
}
const removeLock = async (path) => {
  try { await unlink(path) } catch (error) { if (error?.code !== "ENOENT") fail("Cannot release supervision writer lock", error) }
}

export const createSupervisionState = ({ root, projectId, now = Date.now } = {}) => {
  if (!PROJECT_ID.test(projectId ?? "")) fail("Invalid supervision project id")
  const stateBase = root ?? join(process.env.XDG_STATE_HOME || join(homedir(), ".local/state"), "control-tower/supervision")
  const projectRoot = join(stateBase, projectId)
  const statePath = join(projectRoot, "state.json")
  const lockPath = join(projectRoot, "writer.lock")
  const clock = () => typeof now === "function" ? now() : now

  const read = async (evidence) => {
    try {
      if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)
        || evidence.project_id !== projectId || !DIGEST.test(evidence.evidence_digest ?? "")) fail("Foreign supervision evidence")
      await safeDirectory(projectRoot)
      await safeFile(statePath)
      const handle = await open(statePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
      let text
      try { text = await handle.readFile("utf8") } finally { await handle.close() }
      let stored
      try { stored = JSON.parse(text) } catch (error) { fail("Malformed supervision state", error) }
      validateBinding(stored)
      if (stored.project_id !== projectId || digest(stored) !== evidence.evidence_digest) fail("Divergent supervision evidence")
      return Object.freeze(structuredClone(stored))
    } catch (error) { if (error?.code === CODE) throw error; fail("Cannot read supervision state", error) }
  }

  const validate = (stored, expected, at = clock()) => {
    try {
      validateBinding(stored)
      if (stored.project_id !== projectId || !expected || typeof expected !== "object" || Array.isArray(expected)
        || EXPECTED.some((field) => stored[field] !== expected[field]) || Date.parse(stored.expires_at) <= at) fail("Supervision state is foreign, expired, or divergent")
      return Object.freeze({ valid: true, ...Object.fromEntries(EXPECTED.map((field) => [field, stored[field]])), expires_at: stored.expires_at, evidence_digest: digest(stored) })
    } catch (error) { if (error?.code === CODE) throw error; fail("Cannot validate supervision state", error) }
  }

  const publish = async (binding) => {
    try {
      validateBinding(binding)
      if (binding.project_id !== projectId) fail("Foreign supervision state")
      await safeDirectory(projectRoot, true)
      const existing = await statOrNull(statePath)
      if (existing && !regularOwnerOnly(existing, 0o600)) fail("Unsafe supervision file")
      let lock
      try { lock = await open(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0), 0o600) }
      catch (error) { fail("Supervision writer lock is occupied or unsafe", error) }
      const tempPath = join(projectRoot, `.state-${process.pid}-${randomBytes(8).toString("hex")}.tmp`)
      try {
        await lock.writeFile(String(process.pid)); await lock.sync(); await lock.close(); lock = null
        const temp = await open(tempPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0), 0o600)
        try { await temp.writeFile(`${canonical(binding)}\n`); await temp.sync() } finally { await temp.close() }
        await chmod(tempPath, 0o600)
        await rename(tempPath, statePath)
        const directory = await open(projectRoot, constants.O_RDONLY)
        try { await directory.sync() } finally { await directory.close() }
      } catch (error) {
        try { await unlink(tempPath) } catch {}
        fail("Cannot atomically publish supervision state", error)
      } finally {
        if (lock) await lock.close().catch(() => {})
        await removeLock(lockPath)
      }
      return Object.freeze({ project_id: projectId, evidence_digest: digest(binding) })
    } catch (error) { if (error?.code === CODE) throw error; fail("Cannot publish supervision state", error) }
  }

  const verifySupervision = async (evidence, expected, at = clock()) => validate(await read(evidence), expected, at)
  return Object.freeze({ root: projectRoot, publish, read, validate, verifySupervision })
}
