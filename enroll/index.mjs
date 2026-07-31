import * as nodeFs from "node:fs"
import { execFileSync } from "node:child_process"
import { isAbsolute, join, normalize, relative, resolve, sep } from "node:path"

import { preflightLegacyImport } from "../registry/legacy-import.mjs"
import { resolveProjectRegistryPath } from "../registry/path.mjs"
import { createProjectRegistryStore } from "../registry/store.mjs"

const REQUEST_FIELDS = Object.freeze([
  "project_id", "aliases", "project_root", "expected_remote", "main_branch", "main_session",
  "manifest_path", "roadmap_path", "allowed_hosts",
])

const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const own = (stats) => typeof process.getuid !== "function" || stats.uid === process.getuid()
const inside = (parent, candidate) => {
  const path = relative(parent, candidate)
  return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}
const realpath = (fs, path) => (fs.realpathSync.native ?? fs.realpathSync)(path)

const assertRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype
      || Object.keys(request).sort().join("\0") !== [...REQUEST_FIELDS].sort().join("\0")) {
    fail("CT_ENROLLMENT_INVALID", "Enrollment requires the exact explicit fields")
  }
  if (!isAbsolute(request.project_root) || normalize(request.project_root) !== request.project_root
      || request.project_root.includes("\0")) fail("CT_ENROLLMENT_INVALID", "Project root must be a normalized absolute path")
}

const defaultGit = (cwd, args) => execFileSync("git", args, {
  cwd,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim()

const safeDirectory = (fs, path, label) => {
  let stats
  try { stats = fs.lstatSync(path) }
  catch (error) { fail("CT_LAYOUT_UNSAFE", `${label} is unavailable`, error) }
  if (!stats.isDirectory() || stats.isSymbolicLink() || !own(stats)) fail("CT_LAYOUT_UNSAFE", `${label} is unsafe`)
  let canonical
  try { canonical = realpath(fs, path) }
  catch (error) { fail("CT_LAYOUT_UNSAFE", `${label} cannot be canonicalized`, error) }
  if (canonical !== path) fail("CT_LAYOUT_UNSAFE", `${label} must not traverse aliases or symlinks`)
  return canonical
}

const gitRead = (git, cwd, args, label) => {
  try { return git(cwd, args) }
  catch (error) { fail("CT_LAYOUT_UNSAFE", `Cannot inspect ${label}`, error) }
}

const assertWorktreePath = (fs, worktreesPath, worktreePath) => {
  if (!inside(worktreesPath, worktreePath)) fail("CT_LAYOUT_UNSAFE", "Git worktree is outside Worktrees")
  let cursor = worktreePath
  while (cursor !== worktreesPath) {
    safeDirectory(fs, cursor, "Git worktree path")
    cursor = resolve(cursor, "..")
  }
}

export const validateEnrollmentLayout = (request, { fs = nodeFs, git = defaultGit } = {}) => {
  assertRequest(request)
  const projectRoot = safeDirectory(fs, request.project_root, "Project root")
  const mainPath = safeDirectory(fs, join(projectRoot, "Main"), "Main clone")
  const worktreesPath = safeDirectory(fs, join(projectRoot, "Worktrees"), "Worktrees directory")

  const topLevel = resolve(mainPath, gitRead(git, mainPath, ["rev-parse", "--show-toplevel"], "Main repository"))
  if (topLevel !== mainPath) fail("CT_LAYOUT_UNSAFE", "Main must be the owner clone root")

  const commonOutput = gitRead(git, mainPath, ["rev-parse", "--git-common-dir"], "Git common directory")
  const commonDir = safeDirectory(fs, resolve(mainPath, commonOutput), "Git common directory")
  if (!inside(mainPath, commonDir)) fail("CT_LAYOUT_UNSAFE", "Main must own its Git common directory")

  const remote = gitRead(git, mainPath, ["remote", "get-url", "origin"], "origin remote")
  if (remote !== request.expected_remote) fail("CT_LAYOUT_UNSAFE", "Origin remote does not match enrollment")
  const branch = gitRead(git, mainPath, ["symbolic-ref", "--quiet", "--short", "HEAD"], "Main branch")
  if (branch !== request.main_branch) fail("CT_LAYOUT_UNSAFE", "Main branch does not match enrollment")

  const listed = gitRead(git, mainPath, ["worktree", "list", "--porcelain"], "Git worktrees")
    .split("\n").filter((line) => line.startsWith("worktree ")).map((line) => line.slice(9))
  if (!listed.includes(mainPath)) fail("CT_LAYOUT_UNSAFE", "Main is absent from the Git worktree registry")
  for (const listedPath of listed) {
    let canonical
    try { canonical = realpath(fs, listedPath) }
    catch (error) { fail("CT_LAYOUT_UNSAFE", "Git worktree path is unavailable", error) }
    if (canonical !== mainPath) assertWorktreePath(fs, worktreesPath, canonical)
    const candidateCommon = safeDirectory(fs, resolve(canonical,
      gitRead(git, canonical, ["rev-parse", "--git-common-dir"], "worktree Git common directory")), "Worktree Git common directory")
    if (candidateCommon !== commonDir) fail("CT_LAYOUT_UNSAFE", "Git common directory differs across worktrees")
  }

  return Object.freeze({
    canonical_root: projectRoot,
    main_path: mainPath,
    worktrees_path: worktreesPath,
    git_common_dir: commonDir,
    main_store_path: join(commonDir, "control-tower", "tower.db"),
    expected_remote: remote,
    main_branch: branch,
  })
}

export const enrollProject = (request, {
  fs = nodeFs,
  git = defaultGit,
  registryPath = resolveProjectRegistryPath(),
  store = createProjectRegistryStore({ registryPath }),
} = {}) => {
  const layout = validateEnrollmentLayout(request, { fs, git })
  const entry = {
    project_id: request.project_id,
    aliases: request.aliases,
    canonical_root: layout.canonical_root,
    git_common_dir: layout.git_common_dir,
    expected_remote: layout.expected_remote,
    main_branch: layout.main_branch,
    main_session: request.main_session,
    manifest_path: request.manifest_path,
    roadmap_path: request.roadmap_path,
    main_store_path: layout.main_store_path,
    allowed_hosts: request.allowed_hosts,
    registry_entry_revision: 1,
  }
  const preflight = preflightLegacyImport([
    { id: request.project_id, kind: "project", name: request.project_id, root: layout.canonical_root },
  ], { deriveFacts: () => ({ status: "verified", entry }), registryReader: store })
  if (!preflight.ok) fail("CT_ENROLLMENT_CONFLICT", "Enrollment conflicts with registry authority")

  const current = store.load()
  const expectedRevision = current?.registry_revision ?? 0
  const document = {
    schema: "project-registry",
    schema_version: 1,
    registry_revision: expectedRevision + 1,
    projects: [...(current?.projects ?? []), entry].sort((left, right) => left.project_id.localeCompare(right.project_id)),
  }
  return store.save({ document, expectedRevision }).projects.find(({ project_id }) => project_id === request.project_id)
}
