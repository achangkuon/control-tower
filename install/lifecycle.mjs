#!/usr/bin/env bun
import { appendFileSync, chmodSync, copyFileSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, closeSync, readFileSync, readdirSync, realpathSync, rmSync, renameSync, symlinkSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { dirname, isAbsolute, join, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { clearActivePointer, readActivePointer, replaceActivePointer, rollbackActivePointer } from "./active-pointer.mjs"
import { isRuntimeCheckout, readRuntimePayload, RUNTIME_PAYLOAD_FILES } from "./runtime-payload.mjs"
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
  return root
}

const snapshotTree = (root) => {
  const entries = []
  const visit = (current, path = "") => {
    let stat
    try { stat = lstatSync(current) } catch { throw new Error("CT_LEGACY_STATE_UNKNOWN: checkout changed during migration") }
    if (stat.isSymbolicLink()) throw new Error("CT_LEGACY_STATE_UNKNOWN: checkout contains a symlink")
    const entry = { path, type: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other", mode: stat.mode & 0o777 }
    if (entry.type === "other") throw new Error("CT_LEGACY_STATE_UNKNOWN: checkout contains a special file")
    if (entry.type === "file") {
      const contents = readFileSync(current)
      entry.sha256 = createHash("sha256").update(contents).digest("hex")
    }
    entries.push(entry)
    if (entry.type === "directory") {
      for (const child of readdirSync(current).sort()) visit(join(current, child), path ? `${path}/${child}` : child)
    }
  }
  visit(root)
  return entries
}

const copyTree = (source, destination) => {
  const stat = lstatSync(source)
  if (stat.isSymbolicLink()) throw new Error("CT_LEGACY_STATE_UNKNOWN: journal contains a symlink")
  if (stat.isDirectory()) {
    mkdirSync(destination, { recursive: true, mode: stat.mode & 0o777 })
    chmodSync(destination, stat.mode & 0o777)
    for (const child of readdirSync(source).sort()) copyTree(join(source, child), join(destination, child))
    return
  }
  if (!stat.isFile()) throw new Error("CT_LEGACY_STATE_UNKNOWN: journal contains a special file")
  writeFileSync(destination, readFileSync(source), { mode: stat.mode & 0o777 })
  chmodSync(destination, stat.mode & 0o777)
}

const legacyJournalPaths = (stateRoot) => {
  const directory = join(stateRoot, "install-journal")
  return {
    directory,
    backup: join(directory, "legacy-opencode.json"),
    metadata: join(directory, "legacy-fixture.json"),
    checkout: join(directory, "legacy-checkout"),
  }
}

const prepareLegacyInstaller = (legacyConfigPath) => {
  if (!legacyConfigPath || !existsSync(legacyConfigPath)) return null
  let configStat
  try { configStat = lstatSync(legacyConfigPath) } catch { throw new Error("CT_LEGACY_STATE_UNKNOWN: configuration disappeared") }
  if (!configStat.isFile() || configStat.isSymbolicLink()) throw new Error("CT_LEGACY_STATE_UNKNOWN: configuration is not a regular file")
  const bytes = readFileSync(legacyConfigPath, "utf8")
  let config
  try { config = JSON.parse(bytes) } catch { throw new Error("CT_LEGACY_STATE_UNKNOWN: invalid OpenCode configuration") }
  const command = config?.mcp?.["control-tower"]?.command
  if (command === undefined) return
  if (!Array.isArray(command) || command.length < 2 || typeof command[1] !== "string" || !command[1].endsWith("/mcp.mjs")) {
    throw new Error("CT_LEGACY_STATE_UNKNOWN: control-tower command is not verifiable")
  }
  const checkoutPath = verifyLegacyCheckout(command[1])
  return {
    configPath: legacyConfigPath,
    configMode: configStat.mode & 0o777,
    configBytes: bytes,
    checkoutPath,
    checkout: snapshotTree(checkoutPath),
  }
}

const persistLegacyInstaller = (stateRoot, fixture) => {
  if (!fixture) return { created: false }
  const paths = legacyJournalPaths(stateRoot)
  const journalExists = existsSync(paths.metadata)
  if (journalExists) {
    let existing
    try { existing = JSON.parse(readFileSync(paths.metadata, "utf8")) } catch { throw new Error("CT_LEGACY_STATE_UNKNOWN: invalid migration journal") }
    if (existing.configPath !== fixture.configPath || existing.checkoutPath !== fixture.checkoutPath
      || existing.configBytes !== fixture.configBytes || existing.configMode !== fixture.configMode
      || JSON.stringify(existing.checkout) !== JSON.stringify(fixture.checkout)) {
      throw new Error("CT_LEGACY_STATE_UNKNOWN: backup differs from current configuration")
    }
    if (!existsSync(paths.backup) || !existsSync(paths.checkout)) throw new Error("CT_LEGACY_STATE_UNKNOWN: migration journal is incomplete")
    return { created: false }
  }
  mkdirSync(paths.directory, { recursive: true, mode: 0o700 })
  writeFileSync(paths.backup, fixture.configBytes, { mode: 0o600 })
  chmodSync(paths.backup, fixture.configMode)
  copyTree(fixture.checkoutPath, paths.checkout)
  const temporary = `${paths.metadata}.tmp-${process.pid}`
  try {
    writeFileSync(temporary, `${JSON.stringify(fixture)}\n`, { mode: 0o600 })
    renameSync(temporary, paths.metadata)
  } catch (error) {
    rmSync(temporary, { force: true })
    throw new Error(`CT_LEGACY_STATE_UNKNOWN: ${error.message}`)
  }
  appendFileSync(join(paths.directory, "migration.ndjson"), `${JSON.stringify({ operation: "checkout-installer-migration", outcome: "backed-up", source: fixture.configPath })}\n`, { mode: 0o600 })
  return { created: true, paths }
}

const restoreLegacyInstaller = (stateRoot) => {
  const paths = legacyJournalPaths(stateRoot)
  if (!existsSync(paths.metadata)) return null
  let fixture
  try { fixture = JSON.parse(readFileSync(paths.metadata, "utf8")) } catch { throw new Error("CT_LEGACY_STATE_UNKNOWN: invalid migration journal") }
  if (!isAbsolute(fixture.configPath) || !isAbsolute(fixture.checkoutPath) || !existsSync(paths.backup) || !existsSync(paths.checkout)) {
    throw new Error("CT_LEGACY_STATE_UNKNOWN: migration journal is incomplete")
  }
  const config = readFileSync(paths.backup)
  const checkout = snapshotTree(paths.checkout)
  if (JSON.stringify(checkout) !== JSON.stringify(fixture.checkout)) throw new Error("CT_LEGACY_STATE_UNKNOWN: migration journal changed")
  mkdirSync(dirname(fixture.configPath), { recursive: true })
  writeFileSync(fixture.configPath, config, { mode: fixture.configMode })
  chmodSync(fixture.configPath, fixture.configMode)
  rmSync(fixture.checkoutPath, { recursive: true, force: true })
  copyTree(paths.checkout, fixture.checkoutPath)
  return fixture
}

const installPathShim = (dataRoot, version, shimPath) => {
  if (!isAbsolute(shimPath)) throw new Error("CT_SHIM_PATH_INVALID")
  const target = join(dataRoot, "versions", version, "bin/torre")
  const versionsRoot = `${join(dataRoot, "versions")}${sep}`
  let backup = null
  try {
    const stat = lstatSync(shimPath)
    const existing = stat.isSymbolicLink() ? realpathSync(shimPath) : null
    if (existing === target) return { path: shimPath, backup }
    if (!existing?.startsWith(versionsRoot)) {
      backup = `${shimPath}.legacy-${version}`
      if (existsSync(backup)) throw new Error("CT_SHIM_BACKUP_EXISTS")
      if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error("CT_SHIM_TARGET_INVALID")
      copyFileSync(shimPath, backup)
    }
    rmSync(shimPath)
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
  mkdirSync(dirname(shimPath), { recursive: true })
  symlinkSync(target, shimPath)
  return { path: shimPath, backup }
}

export function lifecycle({ action, version, files, dataRoot, configRoot, stateRoot, legacyConfigPath, failValidation = false, pointerOptions, expectedMembers, shimPath }) {
  const before = readActivePointer(dataRoot)
  if (action === "diagnose") {
    const installed = before ? join(dataRoot, "versions", before.version) : null
    const manifested = Boolean(installed && existsSync(join(installed, ".manifest")))
    const missing = manifested && expectedMembers ? expectedMembers.filter((member) => !existsSync(join(installed, member))) : []
    return { operation: action, healthy: manifested && missing.length === 0, active: before?.version ?? null, missing }
  }
  if (action === "install" || action === "upgrade") {
    const legacy = action === "upgrade" ? prepareLegacyInstaller(legacyConfigPath) : null
    if (failValidation) {
      audit(stateRoot, { operation: action, version, outcome: "validation-failed", active: before?.version ?? null })
      throw new Error("CT_UPGRADE_VALIDATION_FAILED")
    }
    const stored = storeVersion(dataRoot, version, files)
    let journal
    try { journal = persistLegacyInstaller(stateRoot, legacy) }
    catch (error) {
      if (stored.created) rmSync(join(dataRoot, "versions", version), { recursive: true, force: true })
      throw error
    }
    let pointer
    try { pointer = replaceActivePointer(dataRoot, version, pointerOptions) }
    catch (error) {
      if (stored.created) rmSync(join(dataRoot, "versions", version), { recursive: true, force: true })
      if (journal?.created) rmSync(journal.paths.directory, { recursive: true, force: true })
      audit(stateRoot, { operation: action, version, outcome: "pointer-failed", active: before?.version ?? null, code: error.message })
      throw error
    }
    const changed = before?.version !== pointer.version
    const shim = shimPath ? installPathShim(dataRoot, pointer.version, shimPath) : undefined
    if (!changed && !stored.created) return { operation: action, active: pointer.version, changed, stored: stored.created, ...(shim ? { shim } : {}) }
    audit(stateRoot, { operation: action, version, outcome: "active", previous: pointer.previous, changed })
    return { operation: action, active: pointer.version, changed, stored: stored.created, ...(shim ? { shim } : {}) }
  }
  if (action === "rollback") {
    const current = readActivePointer(dataRoot)
    if (current?.previous === null) {
      const restored = restoreLegacyInstaller(stateRoot)
      if (restored) {
        const changed = clearActivePointer(dataRoot)
        audit(stateRoot, { operation: action, outcome: "legacy-restored", version: current.version, active: null })
        return { operation: action, active: null, changed, restored: restored.checkoutPath }
      }
    }
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

export function runCli([action = "diagnose", version, source, ...options], env = process.env) {
  const roots = {
    dataRoot: join(env.XDG_DATA_HOME ?? join(env.HOME, ".local/share"), "control-tower"),
    configRoot: join(env.XDG_CONFIG_HOME ?? join(env.HOME, ".config"), "control-tower"),
    stateRoot: join(env.XDG_STATE_HOME ?? join(env.HOME, ".local/state"), "control-tower"),
  }
  if (options.some((option) => option !== "--shim")) throw new Error("CT_LIFECYCLE_OPTION_INVALID")
  const files = source ? readRuntimePayload(source, { strict: !isRuntimeCheckout(source) }) : undefined
  const shimPath = options.includes("--shim") ? join(env.TORRE_BIN_DIR ?? join(env.HOME, ".local/bin"), "torre") : undefined
  return lifecycle({ ...roots, action, version, files, expectedMembers: RUNTIME_PAYLOAD_FILES, shimPath, legacyConfigPath: join(env.XDG_CONFIG_HOME ?? join(env.HOME, ".config"), "opencode/opencode.json"), failValidation: env.CT_FAIL_VALIDATION === "1" })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(runCli(process.argv.slice(2)))) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
