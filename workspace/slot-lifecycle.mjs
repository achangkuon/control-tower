import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import * as nodeFs from "node:fs"
import { isAbsolute, normalize, relative, resolve, sep } from "node:path"
import { digestArtifact } from "../contracts/canonicalize.mjs"

const REQUEST_KEYS = ["schema", "schema_version", "operation", "project_id", "registry_revision", "repository_root", "git_common_dir", "slot_id", "target_path", "prior_binding_digest", "jornada_id", "jornada_revision", "jornada_state_digest", "occupancy_digest", "assignment_revision", "requested_branch", "base_oid"]
const AUTHORITY_KEYS = REQUEST_KEYS.slice(3)
const OID = /^[0-9a-f]{40}$/u, DIGEST = /^sha256:[0-9a-f]{64}$/u, NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/u
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key)
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => own(value, key))
const canonicalPath = value => typeof value === "string" && !value.includes("\0") && isAbsolute(value) && normalize(value) === value
const inside = (root, path) => path === root || path.startsWith(`${root}${sep}`)
const freeze = value => { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value) } return value }
const output = (reason, before = null, after = null) => freeze({ state: "UNSAFE", reasons: [reason], before, after })
const fail = reason => { const error = new Error(reason); error.reason = reason; throw error }

const validRequest = value => exact(value, REQUEST_KEYS) && value.schema === "physical-slot-foundation" && value.schema_version === 1 && value.operation === "REPLACE" &&
  NAME.test(value.project_id) && Number.isSafeInteger(value.registry_revision) && value.registry_revision >= 0 && canonicalPath(value.repository_root) && canonicalPath(value.git_common_dir) &&
  canonicalPath(value.target_path) && inside(value.repository_root, value.target_path) && NAME.test(value.slot_id) && (value.prior_binding_digest === null || DIGEST.test(value.prior_binding_digest)) &&
  NAME.test(value.jornada_id) && Number.isSafeInteger(value.jornada_revision) && value.jornada_revision >= 0 && DIGEST.test(value.jornada_state_digest) && DIGEST.test(value.occupancy_digest) &&
  (value.assignment_revision === null || Number.isSafeInteger(value.assignment_revision) && value.assignment_revision >= 0) && NAME.test(value.requested_branch) && !value.requested_branch.startsWith("refs/") && value.requested_branch !== "main" && OID.test(value.base_oid)
const authoritySnapshot = (request, authority) => {
  if (!plain(authority)) fail("AUTHORITY_MISMATCH")
  const snapshot = {}
  for (const key of AUTHORITY_KEYS) {
    const value = authority[key]
    if (!own(authority, key) || value !== null && !["string", "number", "boolean"].includes(typeof value) || value !== request[key]) fail("AUTHORITY_MISMATCH")
    snapshot[key] = value
  }
  return snapshot
}
const ns = value => String(Math.trunc(value * 1e6))
const identity = stat => ({ dev: stat.dev, ino: stat.ino, uid: stat.uid, mode: stat.mode & 0o7777, nlink: stat.nlink, size: stat.size, mtime_ns: ns(stat.mtimeMs), ctime_ns: ns(stat.ctimeMs) })
const same = (left, right) => Object.keys(left).every(key => left[key] === right[key])
const contentDigest = bytes => `sha256:${createHash("sha256").update(bytes).digest("hex")}`

const defaultGit = (cwd, argv, options) => execFileSync("git", argv, { cwd, ...options }).toString("utf8").trim()
const gitOptions = () => ({ env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" }, stdio: ["ignore", "pipe", "pipe"] })
const parseWorktrees = source => {
  const seen = new Set()
  return source.split(/\n\n+/u).filter(Boolean).map(block => {
    const fields = {}
    for (const line of block.split("\n")) { const at = line.indexOf(" "), key = at < 0 ? line : line.slice(0, at), value = at < 0 ? true : line.slice(at + 1); if (own(fields, key)) fail("GIT_EVIDENCE_INVALID"); fields[key] = value }
    if (!canonicalPath(fields.worktree) || !OID.test(fields.HEAD) || fields.bare || fields.detached || typeof fields.branch !== "string" || !/^refs\/heads\/[a-z0-9][a-z0-9/-]*$/u.test(fields.branch) || seen.has(fields.worktree)) fail("GIT_EVIDENCE_INVALID")
    seen.add(fields.worktree); return { path: fields.worktree, oid: fields.HEAD, branch: fields.branch }
  })
}
const parseRefs = source => {
  const seen = new Set()
  return source ? source.split("\n").map(line => { const match = /^([0-9a-f]{40}) (HEAD|refs\/[A-Za-z0-9._/-]+)$/u.exec(line); if (!match || seen.has(match[2])) fail("GIT_EVIDENCE_INVALID"); seen.add(match[2]); return { oid: match[1], ref: match[2] } }) : []
}

const observePath = (anchor, path, fs) => {
  if (!canonicalPath(anchor) || !canonicalPath(path) || !inside(anchor, path) || relative(anchor, path).split(sep).includes("..")) fail("FILESYSTEM_UNSAFE")
  const components = []; let cursor = anchor
  for (const part of ["", ...relative(anchor, path).split(sep).filter(Boolean)]) {
    if (part) cursor = resolve(cursor, part)
    let stat
    try { stat = fs.lstatSync(cursor) } catch (error) { if (error?.code === "ENOENT") { components.push({ path: cursor, type: "absent" }); continue } throw error }
    const type = stat.isSymbolicLink() ? "symlink" : stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other", found = identity(stat)
    if (stat.uid !== process.getuid() || type === "symlink" || type === "other" || type === "directory" && (found.mode & 0o002) && !(found.mode & 0o1000) || type === "file" && (found.mode !== 0o600 || found.nlink !== 1)) fail("FILESYSTEM_UNSAFE")
    const observed = { path: cursor, type, identity: found }
    if (type === "file") {
      let fd
      try {
        fd = fs.openSync(cursor, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW)
        const opened = identity(fs.fstatSync(fd)); if (!same(found, opened)) fail("FILESYSTEM_UNSAFE")
        const bytes = fs.readFileSync(fd), after = identity(fs.fstatSync(fd)); if (!same(opened, after)) fail("FILESYSTEM_UNSAFE")
        observed.descriptor = { ...opened, content_digest: contentDigest(bytes) }
      } finally { if (fd !== undefined) fs.closeSync(fd) }
    }
    components.push(observed)
  }
  return components
}

const observe = (request, resolveAuthority, git, fs) => {
  const authority = authoritySnapshot(request, resolveAuthority())
  const read = argv => String(git(request.repository_root, argv, gitOptions())).trim()
  const repositoryRoot = read(["rev-parse", "--show-toplevel"]), commonRaw = read(["rev-parse", "--git-common-dir"]), gitCommonDir = isAbsolute(commonRaw) ? normalize(commonRaw) : resolve(repositoryRoot, commonRaw)
  const head = read(["rev-parse", "HEAD"]), baseOid = read(["rev-parse", `${request.base_oid}^{commit}`]), branch = read(["symbolic-ref", "-q", "HEAD"])
  if (!canonicalPath(repositoryRoot) || !canonicalPath(gitCommonDir) || !OID.test(head) || !OID.test(baseOid) || head !== request.base_oid || baseOid !== request.base_oid || !branch.startsWith("refs/heads/")) fail("GIT_EVIDENCE_INVALID")
  const worktrees = parseWorktrees(read(["worktree", "list", "--porcelain"])), worktree = worktrees.find(item => item.path === repositoryRoot), refs = parseRefs(read(["show-ref", "--head"]))
  if (!worktree || worktree.oid !== head || worktree.branch !== branch || refs.filter(item => item.ref === "HEAD" || item.ref === branch).some(item => item.oid !== head) || !refs.some(item => item.ref === branch && item.oid === head)) fail("GIT_EVIDENCE_INVALID")
  if (refs.some(item => item.ref === `refs/heads/${request.requested_branch}`)) fail("GIT_EVIDENCE_INVALID")
  const evidence = { authority, repository_root: repositoryRoot, git_common_dir: gitCommonDir, head, base_oid: baseOid, branch, worktree, worktrees, refs, status: read(["status", "--porcelain=v1"]), target_components: observePath(repositoryRoot, request.target_path, fs), state_components: observePath(gitCommonDir, resolve(gitCommonDir, "control-tower/workspace-slots/v1"), fs) }
  return { digest: digestArtifact({ request, evidence }, "rfc8785-jcs"), evidence }
}

export const createPhysicalSlotLifecycle = ({ resolveAuthoritativeContext, git = defaultGit, fs = nodeFs } = {}) => {
  if (typeof resolveAuthoritativeContext !== "function" || typeof git !== "function" || typeof fs?.lstatSync !== "function") throw new TypeError("Foundation dependencies are required")
  return freeze({ inspect(request) {
    if (!validRequest(request)) return output("REQUEST_INVALID")
    let before, after
    try {
      before = observe(request, resolveAuthoritativeContext, git, fs); after = observe(request, resolveAuthoritativeContext, git, fs)
      if (before.digest !== after.digest) return output("OBSERVATION_DIVERGED", before, after)
      if (before.evidence.repository_root !== request.repository_root || before.evidence.git_common_dir !== request.git_common_dir) return output("GIT_IDENTITY_MISMATCH", before, after)
      return output("SEMANTIC_PROOF_REQUIRED", before, after)
    } catch (error) { return output(error?.reason ?? "EVIDENCE_UNVERIFIABLE", before, after) }
  } })
}
