#!/usr/bin/env bun
import { appendFileSync, existsSync, fsyncSync, mkdirSync, openSync, closeSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

import { readActivePointer, replaceActivePointer, rollbackActivePointer } from "./active-pointer.mjs"
import { storeVersion } from "./version-store.mjs"

const audit = (stateRoot, record) => {
  const directory = join(stateRoot, "audit"), path = join(directory, "lifecycle.ndjson")
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  appendFileSync(path, `${JSON.stringify(record)}\n`, { mode: 0o600 })
  const fd = openSync(path, "r"); try { fsyncSync(fd) } finally { closeSync(fd) }
}

const verifyLegacyCheckout = (path) => {
  if (!isAbsolute(path)) throw new Error("CT_LEGACY_STATE_UNKNOWN: checkout path must be absolute")
  let resolved
  try { resolved = realpathSync(path) } catch { throw new Error("CT_LEGACY_STATE_UNKNOWN: checkout path does not exist") }
  const root = dirname(resolved)
  if (resolved !== path || !["core.mjs", "install.sh", "bin/torre"].every((item) => existsSync(join(root, item)))) {
    throw new Error("CT_LEGACY_STATE_UNKNOWN: checkout root is not verifiable")
  }
}

const migrateLegacyInstaller = (stateRoot, legacyConfigPath) => {
  if (!legacyConfigPath || !existsSync(legacyConfigPath)) return
  const bytes = readFileSync(legacyConfigPath, "utf8")
  let config
  try { config = JSON.parse(bytes) } catch { throw new Error("CT_LEGACY_STATE_UNKNOWN: invalid OpenCode configuration") }
  const command = config?.mcp?.["control-tower"]?.command
  if (command === undefined) return
  if (!Array.isArray(command) || command.length < 2 || typeof command[1] !== "string" || !command[1].endsWith("/mcp.mjs")) {
    throw new Error("CT_LEGACY_STATE_UNKNOWN: control-tower command is not verifiable")
  }
  verifyLegacyCheckout(command[1])
  const directory = join(stateRoot, "install-journal"), backup = join(directory, "legacy-opencode.json")
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  if (existsSync(backup) && readFileSync(backup, "utf8") !== bytes) {
    throw new Error("CT_LEGACY_STATE_UNKNOWN: backup differs from current configuration")
  }
  if (readFileSync(legacyConfigPath, "utf8") !== bytes) throw new Error("CT_LEGACY_STATE_UNKNOWN: configuration changed during migration")
  if (!existsSync(backup)) writeFileSync(backup, bytes, { mode: 0o600 })
  appendFileSync(join(directory, "migration.ndjson"), `${JSON.stringify({ operation: "checkout-installer-migration", outcome: "backed-up", source: legacyConfigPath })}\n`, { mode: 0o600 })
}

export function lifecycle({ action, version, files, dataRoot, configRoot, stateRoot, legacyConfigPath, failValidation = false, pointerOptions }) {
  const before = readActivePointer(dataRoot)
  if (action === "diagnose") {
    const healthy = Boolean(before && existsSync(join(dataRoot, "versions", before.version, ".manifest")))
    return { operation: action, healthy, active: before?.version ?? null }
  }
  if (action === "install" || action === "upgrade") {
    if (action === "upgrade") migrateLegacyInstaller(stateRoot, legacyConfigPath)
    const stored = storeVersion(dataRoot, version, files)
    if (failValidation) {
      audit(stateRoot, { operation: action, version, outcome: "validation-failed", active: before?.version ?? null })
      throw new Error("CT_UPGRADE_VALIDATION_FAILED")
    }
    let pointer
    try { pointer = replaceActivePointer(dataRoot, version, pointerOptions) }
    catch (error) {
      audit(stateRoot, { operation: action, version, outcome: "pointer-failed", active: before?.version ?? null, code: error.message })
      throw error
    }
    const changed = before?.version !== pointer.version
    if (!changed && !stored.created) return { operation: action, active: pointer.version, changed, stored: stored.created }
    audit(stateRoot, { operation: action, version, outcome: "active", previous: pointer.previous, changed })
    return { operation: action, active: pointer.version, changed, stored: stored.created }
  }
  if (action === "rollback") {
    const pointer = rollbackActivePointer(dataRoot, pointerOptions)
    audit(stateRoot, { operation: action, version: pointer.version, outcome: "active", previous: pointer.previous })
    return { operation: action, active: pointer.version, changed: true }
  }
  if (action === "uninstall") {
    const changed = existsSync(join(dataRoot, "active.json"))
    rmSync(join(dataRoot, "active.json"), { force: true })
    audit(stateRoot, { operation: action, outcome: "preserved", changed })
    return { operation: action, active: null, changed, preserved: [configRoot, join(dataRoot, "versions"), stateRoot] }
  }
  throw new Error("CT_LIFECYCLE_ACTION_INVALID")
}

const filesFrom = (root) => Object.fromEntries(readdirSync(root, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile()).map((entry) => {
    const path = join(entry.parentPath, entry.name)
    return [relative(root, path), readFileSync(path)]
  }))

export function runCli([action = "diagnose", version, source], env = process.env) {
  const roots = {
    dataRoot: join(env.XDG_DATA_HOME ?? join(env.HOME, ".local/share"), "control-tower"),
    configRoot: join(env.XDG_CONFIG_HOME ?? join(env.HOME, ".config"), "control-tower"),
    stateRoot: join(env.XDG_STATE_HOME ?? join(env.HOME, ".local/state"), "control-tower"),
  }
  const files = source ? filesFrom(source) : undefined
  return lifecycle({ ...roots, action, version, files, legacyConfigPath: join(env.XDG_CONFIG_HOME ?? join(env.HOME, ".config"), "opencode/opencode.json"), failValidation: env.CT_FAIL_VALIDATION === "1" })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(runCli(process.argv.slice(2)))) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
