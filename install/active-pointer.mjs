import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

export function readActivePointer(dataRoot) {
  const path = join(dataRoot, "active.json")
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null
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
