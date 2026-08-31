import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  chmodSync,
  lstatSync,
  readFileSync,
  readlinkSync,
  readdirSync,
} from "node:fs"
import { join, relative, resolve } from "node:path"

import { git as runGit } from "./git.mjs"

const git = (repository, args, options = {}) =>
  runGit(repository, args, {
    encoding: options.encoding,
    input: options.input,
    stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
  })

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")
const regularModes = new Map([
  ["100644", 0o644],
  ["100755", 0o755],
])

const listTrackedEntries = (repository, commit) =>
  git(repository, ["ls-tree", "-rz", commit])
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const [metadata, path] = record.split("\t")
      const [mode, type, objectId] = metadata.split(" ")
      return { mode, type, objectId, path }
    })
    .sort((left, right) => left.path.localeCompare(right.path))

const listRestoredPaths = (root, directory = root) =>
  readdirSync(directory).flatMap((name) => {
    const absolutePath = join(directory, name)
    const stats = lstatSync(absolutePath)
    if (stats.isDirectory()) {
      return listRestoredPaths(root, absolutePath)
    }
    return [relative(root, absolutePath)]
  })

export const verifyTrackedEntry = (repository, commit, destination, entry) => {
  const restoredPath = join(destination, entry.path)
  const stats = lstatSync(restoredPath)
  const expectedBytes = git(repository, ["cat-file", "blob", `${commit}:${entry.path}`])
  const isSymlink = entry.mode === "120000"
  const expectedMode = regularModes.get(entry.mode)
  if (entry.type !== "blob" || (!isSymlink && expectedMode === undefined)) {
    throw new Error(`unsupported tracked entry: ${entry.path} (${entry.mode} ${entry.type})`)
  }
  const actualBytes = isSymlink
    ? Buffer.from(readlinkSync(restoredPath))
    : readFileSync(restoredPath)
  const contentMatches = actualBytes.equals(expectedBytes)
  const modeMatches = isSymlink
    ? stats.isSymbolicLink()
    : (stats.mode & 0o177777) === (0o100000 | expectedMode)

  if (!contentMatches || !modeMatches) {
    throw new Error(`restored entry mismatch: ${entry.path}`)
  }

  return { ...entry, contentMatches, modeMatches }
}

const runtimeEntryKind = (stats) => {
  if (stats.isFile()) return "file"
  if (stats.isDirectory()) return "directory"
  if (stats.isSymbolicLink()) return "symlink"
  if (stats.isFIFO()) return "fifo"
  if (stats.isSocket()) return "socket"
  if (stats.isBlockDevice()) return "block-device"
  if (stats.isCharacterDevice()) return "character-device"
  return "unknown"
}

const assertRuntimeInactive = (runtimeRoot) => {
  try {
    lstatSync(join(runtimeRoot, "ACTIVE"))
  } catch (error) {
    if (error?.code === "ENOENT") return
    throw error
  }
  throw new Error("Control Tower must be OFF: .git/control-tower/ACTIVE is present")
}

const resolveRuntimeRoot = (repository) => {
  const gitCommonDirectory = git(repository, ["rev-parse", "--git-common-dir"], {
    encoding: "utf8",
  }).trim()
  if (gitCommonDirectory.length === 0 || gitCommonDirectory.includes("\0")) {
    throw new Error("invalid Git common directory")
  }
  return join(resolve(repository, gitCommonDirectory), "control-tower")
}

export const snapshotRuntimeBoundary = (repository, testHooks = {}) => {
  const runtimeRoot = resolveRuntimeRoot(repository)
  try {
    lstatSync(runtimeRoot)
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [{ path: relative(repository, runtimeRoot), exists: false }]
    }
    throw error
  }
  assertRuntimeInactive(runtimeRoot)
  const listChildNames = (path) =>
    readdirSync(path).sort((left, right) => left.localeCompare(right))

  const snapshotEntry = (path) => {
    testHooks.beforeEntrySnapshot?.(path)
    const stats = lstatSync(path, { bigint: true })
    const kind = runtimeEntryKind(stats)
    const entry = {
      path: relative(repository, path),
      exists: true,
      kind,
      mode: Number(stats.mode & 0o177777n),
      size: stats.size.toString(),
      mtimeNs: stats.mtimeNs.toString(),
      sha256: kind === "file" ? sha256(readFileSync(path)) : null,
      target: kind === "symlink" ? readlinkSync(path) : null,
    }
    if (kind !== "directory") return [entry]

    const childNamesBefore = listChildNames(path)
    const descendants = childNamesBefore.flatMap((name) => {
      if (path === runtimeRoot && name === "ACTIVE") {
        throw new Error("Control Tower must be OFF: .git/control-tower/ACTIVE is present")
      }
      return snapshotEntry(join(path, name))
    })
    const childNamesAfter = listChildNames(path)
    if (JSON.stringify(childNamesAfter) !== JSON.stringify(childNamesBefore)) {
      throw new Error("unstable Control Tower runtime snapshot: directory entries changed")
    }
    return [entry, ...descendants]
  }

  try {
    const snapshot = snapshotEntry(runtimeRoot)
    assertRuntimeInactive(runtimeRoot)
    return snapshot
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("unstable Control Tower runtime snapshot: descendant disappeared", {
        cause: error,
      })
    }
    throw error
  }
}

export const restoreFrozenSnapshot = ({ repository, destination, ref }) => {
  if (readdirSync(destination).length !== 0) {
    throw new Error("restore destination must be empty")
  }

  const commit = git(repository, ["rev-parse", `${ref}^{commit}`], { encoding: "utf8" }).trim()
  const tree = git(repository, ["rev-parse", `${ref}^{tree}`], { encoding: "utf8" }).trim()
  const archive = git(repository, ["archive", "--format=tar", commit])
  const archiveSha256 = sha256(archive)
  const expectedEntries = listTrackedEntries(repository, commit)

  execFileSync("tar", ["-xf", "-", "-C", destination], {
    input: archive,
    stdio: ["pipe", "pipe", "pipe"],
  })

  for (const entry of expectedEntries) {
    const expectedMode = regularModes.get(entry.mode)
    if (expectedMode !== undefined) {
      chmodSync(join(destination, entry.path), expectedMode)
    }
  }

  const restoredPaths = listRestoredPaths(destination).sort((left, right) => left.localeCompare(right))
  const expectedPaths = expectedEntries.map(({ path }) => path)
  if (JSON.stringify(restoredPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error("restored path set does not match the tracked snapshot")
  }

  const trackedEntries = expectedEntries.map((entry) =>
    verifyTrackedEntry(repository, commit, destination, entry),
  )

  return { commit, tree, archiveSha256, trackedFiles: trackedEntries.length, trackedEntries }
}
