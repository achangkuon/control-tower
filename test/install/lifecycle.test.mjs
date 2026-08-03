import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { lifecycle, runCli } from "../../install/lifecycle.mjs"
import { RUNTIME_PAYLOAD_FILES } from "../../install/runtime-payload.mjs"

const roots = [], repoRoot = resolve(import.meta.dir, "../..")
const snapshotPath = (path) => {
  const entries = []
  const visit = (current) => {
    let stat
    try { stat = lstatSync(current) } catch { entries.push({ path: current, type: "missing" }); return }
    const entry = { path: current, mode: stat.mode & 0o777, type: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : stat.isSymbolicLink() ? "symlink" : "other" }
    if (stat.isFile()) entry.sha256 = createHash("sha256").update(readFileSync(current)).digest("hex")
    if (stat.isSymbolicLink()) entry.target = readlinkSync(current)
    entries.push(entry)
    if (stat.isDirectory()) readdirSync(current).sort().forEach((child) => visit(join(current, child)))
  }
  visit(path)
  return entries
}
const legacyCheckout = (root, name = "checkout") => {
  const path = join(root, name)
  mkdirSync(join(path, "bin"), { recursive: true })
  for (const file of ["mcp.mjs", "core.mjs", "install.sh", "bin/torre"]) writeFileSync(join(path, file), file)
  return join(path, "mcp.mjs")
}
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-lifecycle-")); roots.push(root)
  const paths = { dataRoot: join(root, "data/control-tower"), configRoot: join(root, "config/control-tower"), stateRoot: join(root, "state/control-tower") }
  mkdirSync(paths.configRoot, { recursive: true }); writeFileSync(join(paths.configRoot, "config.yaml"), "owner: user\n")
  mkdirSync(join(root, "repo/.git/control-tower"), { recursive: true }); writeFileSync(join(root, "repo/.git/control-tower/history"), "keep\n")
  return { root, paths }
}
afterEach(() => {
  roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }))
})

describe("lifecycle operations", () => {
  test("install and diagnose are idempotent", () => {
    const { paths } = fixture(), input = { ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } }
    expect(lifecycle(input).changed).toBe(true)
    expect(lifecycle(input).changed).toBe(false)
    expect(lifecycle({ ...paths, action: "diagnose" })).toMatchObject({ healthy: true, active: "1.0.0" })
  })

  test("failed upgrade preserves active version, configuration, history, and rollback safety", () => {
    const { root, paths } = fixture()
    lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
    expect(() => lifecycle({ ...paths, action: "upgrade", version: "1.1.0", files: { "runtime.mjs": "bad" }, failValidation: true })).toThrow("CT_UPGRADE_VALIDATION_FAILED")
    expect(lifecycle({ ...paths, action: "diagnose" }).active).toBe("1.0.0")
    expect(readFileSync(join(paths.configRoot, "config.yaml"), "utf8")).toBe("owner: user\n")
    expect(readFileSync(join(root, "repo/.git/control-tower/history"), "utf8")).toBe("keep\n")
    expect(existsSync(join(paths.dataRoot, "versions/1.1.0"))).toBe(false)
    lifecycle({ ...paths, action: "upgrade", version: "1.2.0", files: { "runtime.mjs": "two" } })
    expect(lifecycle({ ...paths, action: "rollback" }).active).toBe("1.0.0")
  })

  test("pointer failure is audited and leaves the active version safe", () => {
    const { paths } = fixture()
    lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
    expect(() => lifecycle({ ...paths, action: "upgrade", version: "1.1.0", files: { "runtime.mjs": "two" }, pointerOptions: { failAt: "rename" } })).toThrow("CT_POINTER_RENAME_FAILED")
    expect(lifecycle({ ...paths, action: "diagnose" }).active).toBe("1.0.0")
    expect(existsSync(join(paths.dataRoot, "versions/1.1.0"))).toBe(false)
    expect(readFileSync(join(paths.stateRoot, "audit/lifecycle.ndjson"), "utf8")).toContain('"outcome":"pointer-failed"')
  })

  test("diagnose reports unhealthy when an installed version is missing expected members", () => {
    const { paths } = fixture()
    const complete = { "bin/torre": "t", "core.mjs": "c", "install/active-pointer.mjs": "a", "install/lifecycle.mjs": "l", "install/version-store.mjs": "v" }
    const expectedMembers = Object.keys(complete)
    lifecycle({ ...paths, action: "install", version: "1.0.0", files: complete })
    expect(lifecycle({ ...paths, action: "diagnose", expectedMembers })).toMatchObject({ healthy: true, active: "1.0.0" })

    rmSync(join(paths.dataRoot, "versions/1.0.0/core.mjs"), { force: true })
    const degraded = lifecycle({ ...paths, action: "diagnose", expectedMembers })
    expect(degraded).toMatchObject({ healthy: false, active: "1.0.0" })
    expect(degraded.missing).toEqual(["core.mjs"])
  })

  test("diagnose without expected members keeps reporting manifest-only health", () => {
    const { paths } = fixture()
    lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
    expect(lifecycle({ ...paths, action: "diagnose" })).toMatchObject({ healthy: true, active: "1.0.0" })
  })

  test("uninstall is idempotent and preserves configuration, versions, audit, and repository history", () => {
    const { root, paths } = fixture()
    lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
    expect(lifecycle({ ...paths, action: "uninstall" }).changed).toBe(true)
    expect(lifecycle({ ...paths, action: "uninstall" }).changed).toBe(false)
    expect(existsSync(join(paths.dataRoot, "active.json"))).toBe(false)
    expect(existsSync(join(paths.dataRoot, "versions/1.0.0/.manifest"))).toBe(true)
    expect(existsSync(join(paths.stateRoot, "audit/lifecycle.ndjson"))).toBe(true)
    expect(readFileSync(join(root, "repo/.git/control-tower/history"), "utf8")).toBe("keep\n")
  })
})

test("thin torre wiring runs lifecycle outside a Git repository", () => {
  const { root } = fixture(), env = { ...process.env, XDG_DATA_HOME: join(root, "data"), XDG_CONFIG_HOME: join(root, "config"), XDG_STATE_HOME: join(root, "state") }
  const output = execFileSync(join(repoRoot, "bin/torre"), ["diagnose"], { cwd: root, env, encoding: "utf8" })
  expect(JSON.parse(output)).toMatchObject({ operation: "diagnose", healthy: false, active: null })
})

test("source payload rejection is atomic before creating temporary roots", () => {
  const { root, paths } = fixture(), source = join(root, "invalid-release")
  mkdirSync(source)
  writeFileSync(join(source, "core.mjs"), "incomplete\n")
  const env = { ...process.env, XDG_DATA_HOME: join(root, "xdg-data"), XDG_CONFIG_HOME: join(root, "xdg-config"), XDG_STATE_HOME: join(root, "xdg-state") }
  expect(() => runCli(["install", "1.0.0", source], env)).toThrow("CT_RUNTIME_PAYLOAD_INCOMPLETE")
  expect(existsSync(join(root, "xdg-data"))).toBe(false)
  expect(existsSync(join(root, "xdg-state"))).toBe(false)
})

test("V2-only CLI automation requests fail closed before repository mutation", () => {
  const { root } = fixture(), repo = join(root, "repo")
  for (const command of ["launch-worker", "create-session", "create-worktree"]) {
    const result = spawnSync(join(repoRoot, "bin/torre"), [command], { cwd: repo, encoding: "utf8" })
    expect(result.status).toBe(1)
    expect(result.stderr.trim()).toBe(`CT_V2_ONLY: ${command}`)
  }
  expect(existsSync(join(repo, ".git/control-tower/ACTIVE"))).toBe(false)
  expect(existsSync(join(repo, ".git/control-tower/tower.db"))).toBe(false)
})

test("upgrade journals a verified checkout installer backup without changing user state", () => {
  const { root, paths } = fixture(), legacyConfigPath = join(root, "opencode/opencode.json")
  mkdirSync(join(root, "opencode"), { recursive: true })
  const legacy = `${JSON.stringify({ theme: "dark", mcp: { "control-tower": { command: ["bun", legacyCheckout(root)], type: "local" } } })}\n`
  writeFileSync(legacyConfigPath, legacy)
  lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
  lifecycle({ ...paths, action: "upgrade", version: "1.1.0", files: { "runtime.mjs": "two" }, legacyConfigPath })
  expect(readFileSync(legacyConfigPath, "utf8")).toBe(legacy)
  expect(readFileSync(join(paths.stateRoot, "install-journal/legacy-opencode.json"), "utf8")).toBe(legacy)
  expect(readFileSync(join(paths.stateRoot, "install-journal/migration.ndjson"), "utf8")).toContain('"outcome":"backed-up"')
  expect(readFileSync(join(root, "repo/.git/control-tower/history"), "utf8")).toBe("keep\n")
})

test("legacy runtime is adopted into a new XDG root without changing configuration or history", () => {
  const { root, paths } = fixture(), legacyConfigPath = join(root, "opencode/opencode.json")
  mkdirSync(join(root, "opencode"), { recursive: true })
  const legacy = `${JSON.stringify({ theme: "dark", mcp: { "control-tower": { command: ["bun", legacyCheckout(root)] } } })}\n`
  writeFileSync(legacyConfigPath, legacy)

  expect(existsSync(paths.dataRoot)).toBe(false)
  const result = lifecycle({ ...paths, action: "upgrade", version: "1.0.0", files: { "runtime.mjs": "one" }, legacyConfigPath })

  expect(result).toMatchObject({ operation: "upgrade", active: "1.0.0", changed: true })
  expect(readFileSync(legacyConfigPath, "utf8")).toBe(legacy)
  expect(readFileSync(join(root, "repo/.git/control-tower/history"), "utf8")).toBe("keep\n")
  expect(existsSync(join(paths.dataRoot, "active.json"))).toBe(true)
  expect(existsSync(join(paths.dataRoot, "versions/1.0.0/runtime.mjs"))).toBe(true)
})

test("first adoption rollback restores the complete legacy fixture by bytes, paths, and modes", () => {
  const { root, paths } = fixture(), legacyConfigPath = join(root, "opencode/opencode.json")
  mkdirSync(join(root, "opencode"), { recursive: true })
  const mcpPath = legacyCheckout(root)
  chmodSync(join(root, "checkout"), 0o750)
  chmodSync(join(root, "checkout/core.mjs"), 0o640)
  chmodSync(join(root, "checkout/bin/torre"), 0o755)
  const legacy = `${JSON.stringify({ theme: "dark", mcp: { "control-tower": { command: ["bun", mcpPath] } } })}\n`
  writeFileSync(legacyConfigPath, legacy, { mode: 0o640 })
  const before = JSON.stringify([snapshotPath(legacyConfigPath), snapshotPath(join(root, "checkout"))])

  lifecycle({ ...paths, action: "upgrade", version: "1.0.0", files: { "runtime.mjs": "one" }, legacyConfigPath })
  writeFileSync(legacyConfigPath, "adoption changed\n")
  rmSync(join(root, "checkout/core.mjs"))
  writeFileSync(join(root, "checkout/extra.mjs"), "not legacy\n")

  expect(lifecycle({ ...paths, action: "rollback" })).toMatchObject({ operation: "rollback", active: null, changed: true })
  expect(JSON.stringify([snapshotPath(legacyConfigPath), snapshotPath(join(root, "checkout"))])).toBe(before)
  expect(existsSync(join(paths.dataRoot, "active.json"))).toBe(false)
})

test("reinstall is byte-idempotent and rollback preserves configuration and history", () => {
  const { root, paths } = fixture()
  lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
  const firstInstallState = JSON.stringify([snapshotPath(paths.dataRoot), snapshotPath(paths.stateRoot)])

  const second = lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
  expect(second).toMatchObject({ operation: "install", active: "1.0.0", changed: false, stored: false })
  expect(JSON.stringify([snapshotPath(paths.dataRoot), snapshotPath(paths.stateRoot)])).toBe(firstInstallState)

  const configurationBeforeRollback = snapshotPath(paths.configRoot)
  const historyBeforeRollback = snapshotPath(join(root, "repo/.git/control-tower"))
  lifecycle({ ...paths, action: "upgrade", version: "1.1.0", files: { "runtime.mjs": "two" } })
  expect(lifecycle({ ...paths, action: "rollback" })).toMatchObject({ operation: "rollback", active: "1.0.0", changed: true })
  expect(snapshotPath(paths.configRoot)).toEqual(configurationBeforeRollback)
  expect(snapshotPath(join(root, "repo/.git/control-tower"))).toEqual(historyBeforeRollback)
})

test("upgrade rejects unknown checkout installer state without storing or activating a version", () => {
  const { root, paths } = fixture(), legacyConfigPath = join(root, "opencode/opencode.json")
  mkdirSync(join(root, "opencode"), { recursive: true })
  writeFileSync(legacyConfigPath, '{"mcp":{"control-tower":{"command":"unsafe shell"}}}\n')
  lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
  expect(() => lifecycle({ ...paths, action: "upgrade", version: "1.1.0", files: { "runtime.mjs": "two" }, legacyConfigPath }))
    .toThrow("CT_LEGACY_STATE_UNKNOWN")
  expect(lifecycle({ ...paths, action: "diagnose" }).active).toBe("1.0.0")
  expect(existsSync(join(paths.dataRoot, "versions/1.1.0"))).toBe(false)
  expect(readFileSync(legacyConfigPath, "utf8")).toContain("unsafe shell")
})

test("upgrade rejects nonexistent and symlinked legacy checkout paths before storage", () => {
  for (const unsafePath of [
    join(fixture().root, "missing/mcp.mjs"),
    (() => { const item = fixture(), target = legacyCheckout(item.root, "outside"), link = join(item.root, "linked-mcp.mjs"); symlinkSync(target, link); return link })(),
    (() => { const item = fixture(), path = join(item.root, "incomplete/mcp.mjs"); mkdirSync(join(item.root, "incomplete")); writeFileSync(path, "mcp"); return path })(),
  ]) {
    const item = fixture(), legacyConfigPath = join(item.root, "legacy.json")
    const legacy = `${JSON.stringify({ mcp: { "control-tower": { command: ["bun", unsafePath] } } })}\n`
    writeFileSync(legacyConfigPath, legacy)
    lifecycle({ ...item.paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
    const auditBefore = readFileSync(join(item.paths.stateRoot, "audit/lifecycle.ndjson"), "utf8")
    expect(() => lifecycle({ ...item.paths, action: "upgrade", version: "1.1.0", files: { "runtime.mjs": "two" }, legacyConfigPath }))
      .toThrow("CT_LEGACY_STATE_UNKNOWN")
    expect(lifecycle({ ...item.paths, action: "diagnose" }).active).toBe("1.0.0")
    expect(existsSync(join(item.paths.dataRoot, "versions/1.1.0"))).toBe(false)
    expect(readFileSync(legacyConfigPath, "utf8")).toBe(legacy)
    expect(readFileSync(join(item.paths.stateRoot, "audit/lifecycle.ndjson"), "utf8")).toBe(auditBefore)
  }
})

test("upgrade refuses invalid JSON and a changed legacy config after backup", () => {
  const invalid = fixture(), invalidPath = join(invalid.root, "legacy.json")
  writeFileSync(invalidPath, "{broken\n")
  expect(() => lifecycle({ ...invalid.paths, action: "upgrade", version: "1.0.0", files: { "runtime.mjs": "one" }, legacyConfigPath: invalidPath }))
    .toThrow("CT_LEGACY_STATE_UNKNOWN")
  expect(existsSync(join(invalid.paths.dataRoot, "versions/1.0.0"))).toBe(false)

  const changed = fixture(), changedPath = join(changed.root, "legacy.json")
  const legacy = (path) => `${JSON.stringify({ mcp: { "control-tower": { command: ["bun", path] } } })}\n`
  writeFileSync(changedPath, legacy(legacyCheckout(changed.root, "one")))
  lifecycle({ ...changed.paths, action: "upgrade", version: "1.0.0", files: { "runtime.mjs": "one" }, legacyConfigPath: changedPath })
  writeFileSync(changedPath, legacy(legacyCheckout(changed.root, "two")))
  expect(() => lifecycle({ ...changed.paths, action: "upgrade", version: "1.1.0", files: { "runtime.mjs": "two" }, legacyConfigPath: changedPath }))
    .toThrow("CT_LEGACY_STATE_UNKNOWN")
  expect(lifecycle({ ...changed.paths, action: "diagnose" }).active).toBe("1.0.0")
})

test("installer and publisher use the same immutable lifecycle", () => {
  const { root } = fixture(), source = join(root, "release"), data = join(root, "published")
  mkdirSync(join(source, "bin"), { recursive: true })
  mkdirSync(join(source, "install"), { recursive: true })
  for (const file of RUNTIME_PAYLOAD_FILES) {
    writeFileSync(join(source, file), `release:${file}\n`)
  }
  const env = { ...process.env, XDG_DATA_HOME: join(root, "data"), XDG_CONFIG_HOME: join(root, "config"), XDG_STATE_HOME: join(root, "state") }
  const installed = execFileSync(join(repoRoot, "install.sh"), ["install", "2.0.0", source], { env, encoding: "utf8" })
  expect(JSON.parse(installed)).toMatchObject({ active: "2.0.0", changed: true })
  const published = execFileSync("bun", [join(repoRoot, "scripts/publish-runtime.mjs"), "2.0.0", data], { encoding: "utf8" })
  expect(JSON.parse(published)).toMatchObject({ version: "2.0.0", created: true })
  expect(existsSync(join(data, "versions/2.0.0/install/lifecycle.mjs"))).toBe(true)
})

test("stored torre diagnoses and installs autonomously from an isolated unrelated cwd", () => {
  const root = mkdtempSync(join(tmpdir(), "ct-staged-runtime-")); roots.push(root)
  const release = join(root, "detached-release"), publication = join(root, "xdg-data/control-tower")
  const cwd = join(root, "unrelated-cwd"), home = join(root, "home"), config = join(root, "xdg-config")
  const state = join(root, "xdg-state"), cache = join(root, "xdg-cache"), temporary = join(root, "tmp")
  for (const directory of [release, cwd, home, config, state, cache, temporary]) mkdirSync(directory, { recursive: true })
  for (const file of RUNTIME_PAYLOAD_FILES) {
    const destination = join(release, file)
    mkdirSync(join(destination, ".."), { recursive: true })
    copyFileSync(join(repoRoot, file), destination)
  }

  const realTargets = [
    join(process.env.HOME, ".local/share/control-tower"),
    join(process.env.XDG_DATA_HOME ?? join(process.env.HOME, ".local/share"), "control-tower"),
    join(process.env.XDG_CONFIG_HOME ?? join(process.env.HOME, ".config"), "control-tower"),
    join(process.env.XDG_STATE_HOME ?? join(process.env.HOME, ".local/state"), "control-tower"),
  ]
  const realBefore = realTargets.map(snapshotPath)
  const env = { PATH: process.env.PATH, HOME: home, XDG_DATA_HOME: join(root, "xdg-data"), XDG_CONFIG_HOME: config,
    XDG_STATE_HOME: state, XDG_CACHE_HOME: cache, TMPDIR: temporary }
  expect(Object.hasOwn(env, "CONTROL_TOWER_LIFECYCLE")).toBe(false)
  expect(Object.hasOwn(env, "CONTROL_TOWER_CORE")).toBe(false)
  expect(Object.hasOwn(env, "NODE_PATH")).toBe(false)

  execFileSync("bun", [join(repoRoot, "scripts/publish-runtime.mjs"), "9.9.9", publication], { cwd, env, encoding: "utf8" })
  const stagedTorre = join(publication, "versions/9.9.9/bin/torre")
  const diagnose = spawnSync(stagedTorre, ["diagnose"], { cwd, env, encoding: "utf8" })
  expect({ status: diagnose.status, stderr: diagnose.stderr }).toEqual({ status: 0, stderr: "" })
  // `missing` lo agregó M8.8.5, posterior a la rama de la que se rescató este test.
  // Sin versión activa la lista va vacía: no hay payload contra el cual comparar.
  expect(JSON.parse(diagnose.stdout)).toEqual({ operation: "diagnose", healthy: false, active: null, missing: [] })

  const installed = spawnSync(stagedTorre, ["install", "10.0.0", release], { cwd, env, encoding: "utf8" })
  expect({ status: installed.status, stderr: installed.stderr }).toEqual({ status: 0, stderr: "" })
  expect(JSON.parse(installed.stdout)).toMatchObject({ operation: "install", active: "10.0.0", changed: true, stored: true })
  expect(JSON.parse(readFileSync(join(publication, "active.json"), "utf8"))).toEqual({ version: "10.0.0", previous: null })
  expect(readdirSync(join(publication, "versions/10.0.0")).sort()).toEqual([".manifest", "bin", "core.mjs", "install"])

  const files = Object.fromEntries(RUNTIME_PAYLOAD_FILES.map((file) => [file, readFileSync(join(release, file))]))
  const expectedManifest = createHash("sha256").update(JSON.stringify(Object.entries(files).sort(([left], [right]) => left.localeCompare(right))
    .map(([path, contents]) => [path, Buffer.from(contents).toString("base64")]))).digest("hex")
  expect(readFileSync(join(publication, "versions/10.0.0/.manifest"), "utf8")).toBe(`${expectedManifest}\n`)
  expect(realTargets.map(snapshotPath)).toEqual(realBefore)

  rmSync(root, { recursive: true, force: true })
  roots.splice(roots.indexOf(root), 1)
  expect(existsSync(root)).toBe(false)
})
