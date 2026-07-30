import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { lifecycle } from "../../install/lifecycle.mjs"

const roots = [], repoRoot = resolve(import.meta.dir, "../..")
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
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

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
    expect(existsSync(join(paths.dataRoot, "versions/1.1.0/.manifest"))).toBe(true)
    lifecycle({ ...paths, action: "upgrade", version: "1.2.0", files: { "runtime.mjs": "two" } })
    expect(lifecycle({ ...paths, action: "rollback" }).active).toBe("1.0.0")
  })

  test("pointer failure is audited and leaves the active version safe", () => {
    const { paths } = fixture()
    lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
    expect(() => lifecycle({ ...paths, action: "upgrade", version: "1.1.0", files: { "runtime.mjs": "two" }, pointerOptions: { failAt: "rename" } })).toThrow("CT_POINTER_RENAME_FAILED")
    expect(lifecycle({ ...paths, action: "diagnose" }).active).toBe("1.0.0")
    expect(readFileSync(join(paths.stateRoot, "audit/lifecycle.ndjson"), "utf8")).toContain('"outcome":"pointer-failed"')
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
  mkdirSync(source); writeFileSync(join(source, "runtime.mjs"), "release\n")
  const env = { ...process.env, XDG_DATA_HOME: join(root, "data"), XDG_CONFIG_HOME: join(root, "config"), XDG_STATE_HOME: join(root, "state") }
  const installed = execFileSync(join(repoRoot, "install.sh"), ["install", "2.0.0", source], { env, encoding: "utf8" })
  expect(JSON.parse(installed)).toMatchObject({ active: "2.0.0", changed: true })
  const published = execFileSync("bun", [join(repoRoot, "scripts/publish-runtime.mjs"), "2.0.0", data], { encoding: "utf8" })
  expect(JSON.parse(published)).toMatchObject({ version: "2.0.0", created: true })
  expect(existsSync(join(data, "versions/2.0.0/install/lifecycle.mjs"))).toBe(true)
})
