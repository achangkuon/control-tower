import { createHash } from "node:crypto"
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { bindDependencyEnvironment, verifyDependencyEnvironmentBinding } from "./dependency-environment.mjs"

const validVersion = /^[0-9A-Za-z][0-9A-Za-z._-]*$/
const reserved = new Set([".dependency-environment.json", "node_modules"])
const entriesForStorage = (files) => Object.entries(files ?? {}).filter(([path]) => path !== ".manifest")
const validateFiles = (files) => {
  if (!files || typeof files !== "object" || Array.isArray(files)) throw new Error("CT_VERSION_FILES_INVALID")
  for (const [path, contents] of Object.entries(files)) {
    if (!path || path.startsWith("/") || path.split("/").includes("..") || reserved.has(path)) throw new Error("CT_VERSION_PATH_INVALID")
    if (!(typeof contents === "string" || Buffer.isBuffer(contents) || contents instanceof Uint8Array)) throw new Error("CT_VERSION_FILES_INVALID")
  }
}
const digest = (files, dependencyDigest) => {
  const entries = entriesForStorage(files).sort(([left], [right]) => left.localeCompare(right)).map(([path, contents]) => [path, Buffer.from(contents).toString("base64")])
  if (dependencyDigest) entries.push([".dependency-environment", dependencyDigest])
  return createHash("sha256").update(JSON.stringify(entries)).digest("hex")
}
const immutable = () => { throw new Error("CT_VERSION_IMMUTABLE") }

export function verifyVersion(dataRoot, version, files, { dependencyDigest } = {}) {
  if (!validVersion.test(version)) throw new Error("CT_VERSION_INVALID")
  validateFiles(files)
  const target = join(dataRoot, "versions", version), manifest = `${digest(files, dependencyDigest)}\n`
  try {
    const root = lstatSync(target); if (!root.isDirectory() || root.isSymbolicLink() || readFileSync(join(target, ".manifest"), "utf8") !== manifest) immutable()
    for (const [path, contents] of entriesForStorage(files)) { const info = lstatSync(join(target, path)); if (!info.isFile() || info.isSymbolicLink() || !readFileSync(join(target, path)).equals(Buffer.from(contents))) immutable() }
    if (dependencyDigest) return { version, path: target, ...verifyDependencyEnvironmentBinding({ dataRoot, versionRoot: target, digest: dependencyDigest }) }
    if (existsSync(join(target, ".dependency-environment.json")) || existsSync(join(target, "node_modules"))) immutable()
    return { version, path: target }
  } catch (error) { if (error.code === "CT_DEPENDENCY_BINDING_INVALID" || error.message === "CT_VERSION_IMMUTABLE") throw error; immutable() }
}

export function readVersionDependencyEnvironment(dataRoot, version) {
  if (!validVersion.test(version)) throw new Error("CT_VERSION_INVALID")
  const versionRoot = join(dataRoot, "versions", version), record = join(versionRoot, ".dependency-environment.json"), link = join(versionRoot, "node_modules")
  try {
    const root = lstatSync(versionRoot); if (!root.isDirectory() || root.isSymbolicLink()) throw new Error("CT_DEPENDENCY_BINDING_INVALID")
    const hasRecord = existsSync(record), hasLink = existsSync(link)
    if (!hasRecord && !hasLink) {
      if (existsSync(join(versionRoot, "install/dependency-environment.mjs"))) throw new Error("CT_DEPENDENCY_BINDING_INVALID")
      return { legacy: true, dependencyDigest: null }
    }
    if (!hasRecord || !hasLink) throw new Error("CT_DEPENDENCY_BINDING_INVALID")
    const metadata = JSON.parse(readFileSync(record, "utf8")), digest = metadata?.digest
    return { legacy: false, ...verifyDependencyEnvironmentBinding({ dataRoot, versionRoot, digest }) }
  } catch (error) { if (error.code === "CT_DEPENDENCY_BINDING_INVALID" || error.message === "CT_DEPENDENCY_BINDING_INVALID") throw error; throw new Error("CT_DEPENDENCY_BINDING_INVALID") }
}

export function storeVersion(dataRoot, version, files, options = {}) {
  if (!validVersion.test(version)) throw new Error("CT_VERSION_INVALID")
  validateFiles(files)
  const versions = join(dataRoot, "versions"), target = join(versions, version), manifest = `${digest(files, options.dependencyDigest)}\n`
  if (existsSync(target)) return { ...verifyVersion(dataRoot, version, files, options), created: false }
  mkdirSync(versions, { recursive: true, mode: 0o700 })
  const temporary = join(versions, `.tmp-${version}-${process.pid}`)
  rmSync(temporary, { recursive: true, force: true })
  try {
    mkdirSync(temporary, { mode: 0o700 })
    for (const [path, contents] of entriesForStorage(files)) { const destination = join(temporary, path); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, contents, { mode: 0o500 }) }
    if (options.dependencyDigest) bindDependencyEnvironment({ dataRoot, versionRoot: temporary, digest: options.dependencyDigest })
    writeFileSync(join(temporary, ".manifest"), manifest, { mode: 0o400 }); renameSync(temporary, target)
  } catch (error) { rmSync(temporary, { recursive: true, force: true }); throw error }
  return { version, path: target, created: true, ...(options.dependencyDigest ? { dependencyDigest: options.dependencyDigest } : {}) }
}

export function denyV2Only(operation) {
  const error = new Error(`CT_V2_ONLY: ${operation}`)
  error.code = "CT_V2_ONLY"
  throw error
}
