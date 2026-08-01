import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const validVersion = /^[0-9A-Za-z][0-9A-Za-z._-]*$/
const entriesForStorage = (files) => Object.entries(files ?? {}).filter(([path]) => path !== ".manifest")
const validateFiles = (files) => {
  if (!files || typeof files !== "object" || Array.isArray(files)) throw new Error("CT_VERSION_FILES_INVALID")
  for (const [path, contents] of Object.entries(files)) {
    if (!path || path.startsWith("/") || path.split("/").includes("..")) throw new Error("CT_VERSION_PATH_INVALID")
    if (!(typeof contents === "string" || Buffer.isBuffer(contents) || contents instanceof Uint8Array)) {
      throw new Error("CT_VERSION_FILES_INVALID")
    }
  }
}
const digest = (files) => createHash("sha256")
  .update(JSON.stringify(entriesForStorage(files).sort(([left], [right]) => left.localeCompare(right))
    .map(([path, contents]) => [path, Buffer.from(contents).toString("base64")]))).digest("hex")

export function storeVersion(dataRoot, version, files) {
  if (!validVersion.test(version)) throw new Error("CT_VERSION_INVALID")
  validateFiles(files)
  const versions = join(dataRoot, "versions"), target = join(versions, version)
  const manifest = `${digest(files)}\n`
  if (existsSync(target)) {
    if (readFileSync(join(target, ".manifest"), "utf8") !== manifest) throw new Error("CT_VERSION_IMMUTABLE")
    return { version, path: target, created: false }
  }
  mkdirSync(versions, { recursive: true, mode: 0o700 })
  const temporary = join(versions, `.tmp-${version}-${process.pid}`)
  rmSync(temporary, { recursive: true, force: true })
  try {
    mkdirSync(temporary, { mode: 0o700 })
    for (const [path, contents] of entriesForStorage(files)) {
      const destination = join(temporary, path)
      mkdirSync(dirname(destination), { recursive: true })
      writeFileSync(destination, contents, { mode: 0o500 })
    }
    writeFileSync(join(temporary, ".manifest"), manifest, { mode: 0o400 })
    renameSync(temporary, target)
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true })
    throw error
  }
  return { version, path: target, created: true }
}

export function denyV2Only(operation) {
  const error = new Error(`CT_V2_ONLY: ${operation}`)
  error.code = "CT_V2_ONLY"
  throw error
}
