import { afterEach, describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative, resolve } from "node:path"

import { RUNTIME_PAYLOAD_FILES } from "../../install/runtime-payload.mjs"

const repoRoot = resolve(import.meta.dir, "../..")
const entrypoint = join(repoRoot, "bin/torre")
const pointerModule = join(repoRoot, "install/active-pointer.mjs")
const payloadMembers = RUNTIME_PAYLOAD_FILES
const roots = []
const canonical = (value) => `${JSON.stringify(value)}\n`
const dependencyPolicy = { args: ["install", "--cache-dir=<private-cache>", "--registry=http://127.0.0.1:1", "--frozen-lockfile", "--linker=hoisted", "--backend=copyfile", "--ignore-scripts", "--no-save"], timeoutMs: 30_000, maxBuffer: 1024 * 1024, env: { HOME: "<private-home>", XDG_CACHE_HOME: "<private-home>/.cache", TMPDIR: "<private-home>/tmp", BUN_INSTALL_CACHE_DIR: "<private-cache>", BUN_CONFIG_REGISTRY: "http://127.0.0.1:1", HTTP_PROXY: "http://127.0.0.1:1", HTTPS_PROXY: "http://127.0.0.1:1", ALL_PROXY: "http://127.0.0.1:1", http_proxy: "http://127.0.0.1:1", https_proxy: "http://127.0.0.1:1", all_proxy: "http://127.0.0.1:1", NO_PROXY: "", no_proxy: "" } }
const installDependencyBinding = (dataRoot, versionRoot) => {
  const digest = "a".repeat(64), target = join(dataRoot, "dependency-environments", digest), modules = join(target, "node_modules")
  mkdirSync(modules, { recursive: true }); const tree = createHash("sha256").update(`d\0\0${lstatSync(modules).mode & 0o777}\0`).digest("hex")
  const metadata = { schema: 1, lockDigest: digest, packageDigest: "b".repeat(64), bun: { version: "1.3.14", digest: "c".repeat(64) }, host: { os: process.platform, cpu: process.arch }, commandPolicy: dependencyPolicy, topology: [], treeDigest: tree, sources: [] }
  metadata.integrity = createHash("sha256").update(canonical(metadata)).digest("hex"); writeFileSync(join(target, "metadata.json"), canonical(metadata), { mode: 0o400 })
  writeFileSync(join(versionRoot, ".dependency-environment.json"), canonical({ schema: 1, digest }), { mode: 0o400 }); symlinkSync(relative(versionRoot, modules), join(versionRoot, "node_modules"))
}

const isolated = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-entrypoint-"))
  roots.push(root)
  const home = join(root, "home")
  const xdgData = join(root, "xdg-data")
  const xdgConfig = join(root, "xdg-config")
  const xdgState = join(root, "xdg-state")
  mkdirSync(home, { recursive: true })
  return {
    root,
    dataRoot: join(xdgData, "control-tower"),
    env: {
      PATH: process.env.PATH,
      HOME: home,
      XDG_DATA_HOME: xdgData,
      XDG_CONFIG_HOME: xdgConfig,
      XDG_STATE_HOME: xdgState,
      XDG_CACHE_HOME: join(root, "xdg-cache"),
      TMPDIR: join(root, "tmp"),
    },
  }
}

const run = (target, args, env, cwd = repoRoot) => spawnSync(target, args, { cwd, env, encoding: "utf8" })

const installLegacyCore = (home) => {
  const path = join(home, ".config/opencode/control-tower/core.mjs")
  mkdirSync(join(path, ".."), { recursive: true })
  writeFileSync(path, 'export function deriveCanonicalMainContext() { return { source: "legacy-core" } }\n')
}

const installActiveVersion = (dataRoot, version = "active-v1", { omit = [] } = {}) => {
  const versionRoot = join(dataRoot, "versions", version)
  for (const member of payloadMembers) {
    if (omit.includes(member)) continue
    const path = join(versionRoot, member)
    mkdirSync(join(path, ".."), { recursive: true })
    const contents = member === "core.mjs"
      ? 'export function deriveCanonicalMainContext() { return { source: "active-core" } }\n'
      : member === "install/lifecycle.mjs"
        ? 'console.log(JSON.stringify({ source: "active-lifecycle", action: process.argv[2] }))\n'
        : `payload:${member}\n`
    writeFileSync(path, contents)
  }
  mkdirSync(versionRoot, { recursive: true })
  writeFileSync(join(versionRoot, ".manifest"), "fixture\n")
    installDependencyBinding(dataRoot, versionRoot)
  mkdirSync(dataRoot, { recursive: true })
  writeFileSync(join(dataRoot, "active.json"), `${JSON.stringify({ version, previous: "previous-v1" })}\n`)
}

const snapshot = (path) => {
  const entries = []
  const visit = (current) => {
    let stat
    try { stat = lstatSync(current) } catch { entries.push({ path: current, type: "missing" }); return }
    const entry = {
      path: current,
      type: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : stat.isSymbolicLink() ? "symlink" : "other",
      mode: stat.mode & 0o777,
    }
    if (entry.type === "file") entry.sha256 = createHash("sha256").update(readFileSync(current)).digest("hex")
    if (entry.type === "symlink") entry.target = readlinkSync(current)
    entries.push(entry)
    if (entry.type === "directory") readdirSync(current).sort().forEach((child) => visit(join(current, child)))
  }
  visit(path)
  return entries
}

const externalWitnesses = () => [
  snapshot(join(process.env.HOME, ".local/share/control-tower")),
  snapshot(join(process.env.HOME, ".config/opencode/control-tower")),
  snapshot(join(process.env.HOME, ".config/control-tower")),
]

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

describe("entrypoint runtime resolution", () => {
  test("without active.json preserves the legacy core and checkout lifecycle paths", () => {
    const item = isolated()
    installLegacyCore(item.env.HOME)

    const core = run(entrypoint, ["main-config"], item.env)
    expect({ status: core.status, stderr: core.stderr }).toEqual({ status: 0, stderr: "" })
    expect(JSON.parse(core.stdout)).toEqual({ context: { source: "legacy-core" } })

    const lifecycle = run(entrypoint, ["diagnose"], item.env)
    expect({ status: lifecycle.status, stderr: lifecycle.stderr }).toEqual({ status: 0, stderr: "" })
    expect(JSON.parse(lifecycle.stdout)).toEqual({ operation: "diagnose", healthy: false, active: null, missing: [] })
  })

  test("an isolated copied entrypoint without active-pointer falls back to the legacy core", () => {
    const item = isolated()
    const copiedEntrypoint = join(item.root, "bin/torre")
    mkdirSync(join(copiedEntrypoint, ".."), { recursive: true })
    copyFileSync(entrypoint, copiedEntrypoint)
    installLegacyCore(item.env.HOME)

    const result = run(copiedEntrypoint, ["main-config"], item.env)
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" })
    expect(JSON.parse(result.stdout)).toEqual({ context: { source: "legacy-core" } })
  })

  test("a broken active-pointer module in a copied entrypoint propagates its error", () => {
    const item = isolated()
    const copiedEntrypoint = join(item.root, "bin/torre")
    const copiedPointer = join(item.root, "install/active-pointer.mjs")
    mkdirSync(join(copiedEntrypoint, ".."), { recursive: true })
    mkdirSync(join(copiedPointer, ".."), { recursive: true })
    copyFileSync(entrypoint, copiedEntrypoint)
    writeFileSync(copiedPointer, "this is not valid JavaScript")
    installLegacyCore(item.env.HOME)

    const result = run(copiedEntrypoint, ["main-config"], item.env)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("active-pointer.mjs")
    expect(result.stdout).not.toContain("legacy-core")
  })

  test("with a valid active pointer resolves core and lifecycle inside the active version", () => {
    const item = isolated()
    installLegacyCore(item.env.HOME)
    installActiveVersion(item.dataRoot)

    const core = run(entrypoint, ["main-config"], item.env)
    expect(JSON.parse(core.stdout)).toEqual({ context: { source: "active-core" } })

    const lifecycle = run(entrypoint, ["diagnose"], item.env)
    expect(JSON.parse(lifecycle.stdout)).toEqual({ source: "active-lifecycle", action: "diagnose" })
    expect(core.stdout).not.toContain("legacy-core")
  })

  test("an incomplete active version fails closed without falling back to legacy", () => {
    const item = isolated()
    installLegacyCore(item.env.HOME)
    installActiveVersion(item.dataRoot, "broken-v1", { omit: ["core.mjs"] })

    const result = run(entrypoint, ["diagnose"], item.env)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("core.mjs")
    expect(result.stderr).toContain("CT_ACTIVE_RUNTIME_INCOMPLETE")
    expect(result.stderr).not.toContain("legacy-core")
  })

  test("corrupt active dependencies fail before core or lifecycle top-level code runs", () => {
    const item = isolated(), version = "corrupt-v1", versionRoot = join(item.dataRoot, "versions", version)
    installActiveVersion(item.dataRoot, version)
    writeFileSync(join(versionRoot, "core.mjs"), 'console.log("CORE_TOP_LEVEL_MARKER")\n')
    writeFileSync(join(versionRoot, "install/lifecycle.mjs"), 'console.log("LIFECYCLE_TOP_LEVEL_MARKER")\n')
    writeFileSync(join(versionRoot, "node_modules/corrupt"), "corrupt")

    for (const command of ["main-config", "diagnose"]) {
      const result = run(entrypoint, [command], item.env)
      expect(result.status).toBe(1)
      expect(result.stderr).toContain("CT_DEPENDENCY_BINDING_INVALID")
      expect(`${result.stdout}${result.stderr}`).not.toContain("TOP_LEVEL_MARKER")
    }
  })

  test("a symlinked entrypoint keeps lifecycle resolution inside the active installation", () => {
    const item = isolated()
    installActiveVersion(item.dataRoot, "symlink-v1")
    const shimDirectory = join(item.root, "bin")
    const unrelatedCwd = join(item.root, "unrelated")
    mkdirSync(shimDirectory, { recursive: true })
    mkdirSync(unrelatedCwd, { recursive: true })
    const shim = join(shimDirectory, "torre")
    symlinkSync(entrypoint, shim)

    const result = run(shim, ["diagnose"], item.env, unrelatedCwd)
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" })
    expect(JSON.parse(result.stdout)).toEqual({ source: "active-lifecycle", action: "diagnose" })
  })

  test("active-pointer recovery exposes previous without the torre entrypoint", () => {
    const item = isolated()
    installActiveVersion(item.dataRoot, "recovery-v1")

    const result = run("bun", [pointerModule, item.dataRoot], item.env)
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" })
    expect(JSON.parse(result.stdout)).toEqual({ version: "recovery-v1", previous: "previous-v1" })
  })

  test("isolated resolution leaves external runtime witnesses byte-identical", () => {
    const item = isolated()
    installLegacyCore(item.env.HOME)
    installActiveVersion(item.dataRoot, "witness-v1")
    const before = externalWitnesses()
    const dataBefore = snapshot(item.dataRoot)

    expect(run(entrypoint, ["main-config"], item.env).status).toBe(0)
    expect(run(entrypoint, ["diagnose"], item.env).status).toBe(0)

    expect(externalWitnesses()).toEqual(before)
    expect(snapshot(item.dataRoot)).toEqual(dataBefore)
  })
})
