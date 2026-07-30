import { execFileSync } from "node:child_process"
import { realpathSync } from "node:fs"
import { isAbsolute, normalize, relative, resolve, sep } from "node:path"

import { digestArtifact } from "./canonicalize.mjs"
import { failContract } from "./errors.mjs"
import { validate } from "./validate.mjs"

const invalid = (message) => failContract("CT_ARTIFACT_REF_INVALID", message)
const frozen = (value) => Object.freeze({ ...value })
const text = (value) => Buffer.isBuffer(value) ? value.toString("utf8") : String(value)
const isStructuredMedia = (mediaType) => mediaType === "application/json" || mediaType.endsWith("+json")
  || ["application/yaml", "text/yaml", "application/x-yaml"].includes(mediaType)

const safePath = (path) => {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.includes("\0") || path.includes("\\")) invalid("Artifact path must be repository-relative")
  const normalized = normalize(path)
  if (normalized !== path || normalized === ".." || normalized.startsWith(`..${sep}`)) invalid("Artifact path escapes the repository")
  return normalized
}

export const verifyArtifactRef = (input, context) => {
  try {
    const ref = validate("artifactRef", input)
    if (!context || ref.repository_id !== context.repositoryId) invalid("Artifact repository identity does not match")
    if (context.artifactId && ref.artifact_id !== context.artifactId) invalid("Artifact identity does not match")
    if (context.artifactRevision && ref.artifact_revision !== context.artifactRevision) invalid("Artifact revision does not match")
    if ((ref.digest_mode === "rfc8785-jcs") !== isStructuredMedia(ref.media_type)) invalid("Digest mode does not match artifact media type")
    const path = safePath(ref.repo_relative_path)
    if (context.artifactRefPath && path === safePath(context.artifactRefPath)) invalid("ArtifactRef cannot digest itself")

    const suppliedRoot = resolve(context.repositoryRoot)
    const root = realpathSync(suppliedRoot)
    if (root !== suppliedRoot) invalid("Repository root aliases and symlinks are forbidden")
    if (context.expectedRepositoryRoot && root !== realpathSync(resolve(context.expectedRepositoryRoot))) invalid("Foreign repository root")
    if (relative(root, resolve(root, path)).startsWith("..")) invalid("Artifact path escapes the repository")

    const run = context.execFile ?? execFileSync
    const git = (args, options = { encoding: "utf8" }) => run("git", ["-C", root, ...args], { stdio: ["ignore", "pipe", "pipe"], ...options })
    const gitRoot = text(git(["rev-parse", "--path-format=absolute", "--show-toplevel"])).trim()
    if (realpathSync(gitRoot) !== root) invalid("Git repository does not match bound root")
    git(["cat-file", "-e", `${ref.source_commit}^{commit}`])

    const parts = path.split("/")
    for (let index = 1; index <= parts.length; index += 1) {
      const candidate = parts.slice(0, index).join("/")
      const entry = text(git(["ls-tree", "-z", ref.source_commit, "--", candidate], { encoding: null }))
      if (!entry) invalid("Artifact path is absent from source commit")
      const [metadata, listedPath] = entry.replace(/\0$/, "").split("\t")
      const [mode, type, oid] = metadata.split(" ")
      if (listedPath !== candidate || mode === "120000") invalid("Artifact path contains a symlink")
      if (index < parts.length && type !== "tree") invalid("Artifact path parent is not a tree")
      if (index === parts.length) {
        if (type !== "blob") invalid("Artifact path is not a blob")
        const bytes = git(["cat-file", "blob", oid], { encoding: null })
        const content = ref.digest_mode === "rfc8785-jcs" ? new TextDecoder("utf-8", { fatal: true }).decode(bytes) : bytes
        if (digestArtifact(content, ref.digest_mode) !== ref.content_digest) invalid("Artifact content digest does not match")
      }
    }
    return frozen(ref)
  } catch (error) {
    if (error?.code === "CT_ARTIFACT_REF_INVALID") throw error
    invalid("ArtifactRef verification failed")
  }
}
