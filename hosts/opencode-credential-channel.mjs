import { createHash, randomBytes } from "node:crypto"
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { isAbsolute, join, resolve } from "node:path"

const fail = () => { throw Object.assign(new Error("Credential channel rejected foreign or expired authority"), { code: "CT_CREDENTIAL_REJECTED" }) }
const bounded = (value, limit = 512) => typeof value === "string" && value.length > 0 && value.length <= limit && !value.includes("\0")
const refValue = (value) => bounded(value, 128) && /^[A-Za-z0-9_-]{32,128}$/.test(value)
const targetValue = ({ backend_url, root_session_id, worktree } = {}) => /^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(backend_url ?? "")
  && /^ses_[A-Za-z0-9]{26}$/.test(root_session_id ?? "") && bounded(worktree) && isAbsolute(worktree)
const nameFor = (worktree) => `${createHash("sha256").update(worktree).digest("hex")}.json`

export const createOpenCodeCredentialChannel = ({ root = join(tmpdir(), `control-tower-opencode-${process.getuid()}`), uid = process.getuid(), now = Date.now, randomRef = () => randomBytes(32).toString("base64url"), maxAgeMs = 60_000, writeCredential = writeFileSync } = {}) => {
  root = resolve(root)
  mkdirSync(root, { recursive: true, mode: 0o700 })
  const secureRoot = () => {
    let stat
    try { stat = lstatSync(root) } catch { fail() }
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid || (stat.mode & 0o777) !== 0o700) fail()
  }
  const read = (worktree) => {
    secureRoot()
    const path = join(root, nameFor(worktree))
    let fd, before, bytes, after
    try {
      fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)
      before = fstatSync(fd); bytes = readFileSync(fd, "utf8"); after = fstatSync(fd)
    } catch { fail() } finally { if (fd !== undefined) closeSync(fd) }
    if (!before.isFile() || before.uid !== uid || before.nlink !== 1 || (before.mode & 0o777) !== 0o600
      || !["dev", "ino", "size", "uid", "mode", "nlink"].every((key) => before[key] === after[key])) fail()
    let value
    try { value = JSON.parse(bytes) } catch { fail() }
    if (!value || Object.keys(value).sort().join("\0") !== ["backend_url", "created_at", "credential_ref", "root_session_id", "secret", "worktree"].sort().join("\0")
      || !targetValue(value) || value.worktree !== worktree || !refValue(value.credential_ref) || !bounded(value.secret, 4096) || value.secret.length < 32) fail()
    return { path, value }
  }
  const consume = (worktree, expected) => {
    const record = read(worktree), value = record.value
    if ((expected && (value.credential_ref !== expected.credential_ref || value.backend_url !== expected.backend_url || value.root_session_id !== expected.root_session_id))
      || !Number.isSafeInteger(value.created_at) || now() - value.created_at > maxAgeMs || now() < value.created_at) {
      if (!expected || value.credential_ref === expected.credential_ref) try { unlinkSync(record.path) } catch {}
      fail()
    }
    unlinkSync(record.path)
    return value
  }
  return Object.freeze({
    issue(input) {
      secureRoot()
      if (!targetValue(input) || !bounded(input?.secret, 4096) || input.secret.length < 32) fail()
      const credential_ref = randomRef()
      if (!refValue(credential_ref)) fail()
      const path = join(root, nameFor(input.worktree)), bytes = `${JSON.stringify({ credential_ref, backend_url: input.backend_url, root_session_id: input.root_session_id, worktree: input.worktree, secret: input.secret, created_at: now() })}\n`
      let fd, rejected = false
      try { fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600); writeCredential(fd, bytes) }
      catch { rejected = true } finally { if (fd !== undefined) closeSync(fd) }
      if (rejected) {
        if (fd !== undefined) try { unlinkSync(path) } catch {}
        fail()
      }
      return credential_ref
    },
    redeem(input) {
      if (!input || Object.keys(input).sort().join("\0") !== ["backend_url", "credential_ref", "root_session_id", "worktree"].sort().join("\0") || !targetValue(input) || !refValue(input.credential_ref)) fail()
      const value = consume(input.worktree, input)
      return value.secret
    },
    take(worktree) { if (!bounded(worktree) || !isAbsolute(worktree)) fail(); return consume(worktree) },
    revoke(credentialRef, worktree) {
      if (!refValue(credentialRef) || !bounded(worktree) || !isAbsolute(worktree)) fail()
      secureRoot()
      const path = join(root, nameFor(worktree))
      try { lstatSync(path) } catch (error) { if (error?.code === "ENOENT") return true; fail() }
      const record = read(worktree)
      if (record.value.credential_ref !== credentialRef) fail()
      unlinkSync(record.path); return true
    },
  })
}
