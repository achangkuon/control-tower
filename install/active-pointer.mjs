import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { RUNTIME_PAYLOAD_FILES } from "./runtime-payload.mjs"
import { readVersionDependencyEnvironment } from "./version-store.mjs"

export function resolveDataRoot(env = process.env) {
  return join(env.XDG_DATA_HOME ?? join(env.HOME, ".local/share"), "control-tower")
}

export function readActivePointer(dataRoot = resolveDataRoot()) {
  const path = join(dataRoot, "active.json")
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null
}

export function resolveActiveRuntime(dataRoot = resolveDataRoot()) {
  const pointer = readActivePointer(dataRoot)
  if (!pointer) return null
  if (!pointer.version || pointer.version.includes("/") || pointer.version.includes("\\")) {
    throw new Error("CT_ACTIVE_POINTER_INVALID")
  }
  const root = join(dataRoot, "versions", pointer.version)
  const missing = RUNTIME_PAYLOAD_FILES.filter((member) => !existsSync(join(root, member)))
  if (missing.length) throw new Error(`CT_ACTIVE_RUNTIME_INCOMPLETE: missing ${missing.join(",")}`)
  const dependencyEnvironment = readVersionDependencyEnvironment(dataRoot, pointer.version)
  return {
    version: pointer.version,
    previous: pointer.previous ?? null,
    root,
    core: join(root, "core.mjs"),
    lifecycle: join(root, "install/lifecycle.mjs"),
    launchWorker: join(root, "hosts/launch-worker-cli.mjs"),
    dependencyEnvironment,
  }
}

const assertStored = (dataRoot, version) => {
  if (!version || !existsSync(join(dataRoot, "versions", version, ".manifest"))) throw new Error("CT_POINTER_VERSION_INVALID")
}

export function replaceActivePointer(dataRoot, version, { failAt } = {}) {
  assertStored(dataRoot, version)
  const path = join(dataRoot, "active.json"), current = readActivePointer(dataRoot)
  if (current?.version === version) return current
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = `${path}.tmp-${process.pid}`
  try {
    if (failAt === "temp") throw new Error("CT_POINTER_TEMP_FAILED")
    writeFileSync(temporary, `${JSON.stringify({ version, previous: current?.version ?? null })}\n`, { mode: 0o600 })
    const file = openSync(temporary, "r")
    try {
      if (failAt === "fsync") throw new Error("CT_POINTER_FSYNC_FAILED")
      fsyncSync(file)
    } finally { closeSync(file) }
    if (failAt === "rename") throw new Error("CT_POINTER_RENAME_FAILED")
    renameSync(temporary, path)
    const directory = openSync(dirname(path), "r")
    try { fsyncSync(directory) } finally { closeSync(directory) }
    return readActivePointer(dataRoot)
  } catch (error) {
    rmSync(temporary, { force: true })
    throw error
  }
}

export function rollbackActivePointer(dataRoot, options) {
  const current = readActivePointer(dataRoot)
  if (!current?.previous) throw new Error("CT_ROLLBACK_UNAVAILABLE")
  return replaceActivePointer(dataRoot, current.previous, options)
}

export function clearActivePointer(dataRoot) {
  const path = join(dataRoot, "active.json")
  const changed = existsSync(path)
  rmSync(path, { force: true })
  return changed
}

// Recovery does not require the installed `torre` entrypoint: run this module
// directly with the data-root to inspect active.json and its `previous` version.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(readActivePointer(process.argv[2] || resolveDataRoot()))) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
