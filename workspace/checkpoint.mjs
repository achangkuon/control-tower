import { execFileSync } from "node:child_process"
import { isAbsolute, normalize, relative } from "node:path"

import { digestArtifact } from "../contracts/canonicalize.mjs"

const fail = (message, cause) => { throw Object.assign(new Error(message, { cause }), { code: "CT_CHECKPOINT_UNSAFE" }) }
const oid = /^[a-f0-9]{40,64}$/u
const defaultGit = (cwd, args) => execFileSync("git", args, {
  cwd,
  stdio: ["ignore", "pipe", "pipe"],
})
const gitRead = (git, cwd, args, label) => {
  try { return git(cwd, args) }
  catch (error) { fail(`Cannot inspect ${label}`, error) }
}
const gitText = (git, cwd, args, label) => Buffer.from(gitRead(git, cwd, args, label)).toString("utf8").trim()
const gitBytes = (git, cwd, args, label) => {
  const value = gitRead(git, cwd, args, label)
  if (!(value instanceof Uint8Array)) fail(`Cannot inspect ${label}`)
  return Buffer.from(value)
}
const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child)
    Object.freeze(value)
  }
  return value
}
const assertRoot = (root) => {
  if (typeof root !== "string" || root.includes("\0") || !isAbsolute(root) || normalize(root) !== root) fail("Repository root must be a normalized absolute path")
  return root
}
const assertIdentity = (identity, label, git, root) => {
  if (!identity || typeof identity !== "object" || !oid.test(identity.commit) || !oid.test(identity.tree)) fail(`${label} must use full commit and tree OIDs`)
  const commit = gitText(git, root, ["rev-parse", `${identity.commit}^{commit}`], `${label} commit`)
  const tree = gitText(git, root, ["rev-parse", `${identity.commit}^{tree}`], `${label} tree`)
  if (commit !== identity.commit || tree !== identity.tree) fail(`${label} identity does not resolve exactly`)
  return { commit, tree }
}
const assertPath = (path) => {
  if (typeof path !== "string" || path.length === 0 || path.includes("\0") || isAbsolute(path)) fail("Evidence file path is unsafe")
  const resolved = normalize(path)
  if (resolved === ".." || resolved.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || relative(".", resolved) !== resolved) fail("Evidence file path escapes the repository")
  return resolved
}
const stagedArtifact = (git, root, path) => {
  const index = gitBytes(git, root, ["ls-files", "--stage", "-z", "--", path], `staged ${path}`).toString("utf8")
  const match = /^([0-7]{6}) ([a-f0-9]{40,64}) 0\t([^\0]+)\0$/u.exec(index)
  if (!match || match[3] !== path) fail(`Cannot inspect staged ${path}`)
  return { git_mode: match[1], bytes: gitBytes(git, root, ["cat-file", "blob", match[2]], `staged blob ${path}`) }
}
const evidence = (files, git, root) => {
  if (!Array.isArray(files) || files.length === 0) fail("Checkpoint requires explicit evidence files")
  const seen = new Set()
  return files.map(({ path, bytes, mode }) => {
    const safePath = assertPath(path)
    if (seen.has(safePath)) fail("Evidence file paths must be unique")
    seen.add(safePath)
    if (mode !== "raw-bytes" && mode !== "rfc8785-jcs") fail("Evidence digest mode is unsafe")
    if (!(bytes instanceof Uint8Array)) fail("Evidence bytes must be raw bytes")
    const staged = stagedArtifact(git, root, safePath)
    if (!Buffer.from(bytes).equals(staged.bytes)) fail("Evidence bytes differ from the staged result")
    const content = mode === "raw-bytes" ? staged.bytes : staged.bytes.toString("utf8")
    return { path: safePath, mode, git_mode: staged.git_mode, digest: digestArtifact(content, mode) }
  }).sort((left, right) => left.path.localeCompare(right.path))
}

export const captureCheckpoint = ({ repositoryRoot, base, result, files }, { git = defaultGit } = {}) => {
  const root = assertRoot(repositoryRoot)
  const canonicalRoot = gitText(git, root, ["rev-parse", "--show-toplevel"], "repository root")
  if (!isAbsolute(canonicalRoot) || normalize(canonicalRoot) !== canonicalRoot || canonicalRoot !== root) fail("Repository root does not match Git canonical root")

  const canonicalBase = assertIdentity(base, "Base", git, root)
  const canonicalResult = assertIdentity(result, "Result", git, root)
  const staged = gitText(git, root, ["diff", "--cached", "--name-only", "--no-renames", canonicalBase.commit, "--"], "staged files").split("\n").filter(Boolean).sort()
  if (staged.length === 0) fail("Checkpoint requires a non-empty staged index")
  const resultDrift = gitText(git, root, ["diff", "--cached", "--name-only", "--no-renames", canonicalResult.commit, "--"], "staged result")
  if (resultDrift !== "") fail("Staged index differs from the explicit result tree")

  const artifacts = evidence(files, git, root)
  if (staged.join("\0") !== artifacts.map(({ path }) => path).join("\0")) fail("Explicit evidence files differ from staged files")
  const checkpoint = {
    repository_root: root,
    base: canonicalBase,
    result: canonicalResult,
    files: artifacts,
  }
  return freeze({ ...checkpoint, digest: digestArtifact(checkpoint, "rfc8785-jcs") })
}
