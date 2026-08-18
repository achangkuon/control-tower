import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

import { lifecycle, readHostRuntimeIdentity, runCli, validateActiveHostRuntime } from "../../install/lifecycle.mjs"
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
  const herdrBin = join(root, "bin/herdr"), opencodeBin = join(root, "bin/opencode")
  mkdirSync(dirname(herdrBin), { recursive: true })
  writeFileSync(herdrBin, "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then printf 'herdr 0.8.0\\n'; fi\n", { mode: 0o700 })
  writeFileSync(opencodeBin, "#!/bin/sh\nexit 0\n", { mode: 0o700 })
  paths.herdrBin = herdrBin
  paths.opencodeBin = opencodeBin
  mkdirSync(paths.configRoot, { recursive: true }); writeFileSync(join(paths.configRoot, "config.yaml"), "owner: user\n")
  mkdirSync(join(root, "repo/.git/control-tower"), { recursive: true }); writeFileSync(join(root, "repo/.git/control-tower/history"), "keep\n")
  return { root, paths }
}
const hostArgs = ({ herdrBin, opencodeBin }) => ["--herdr-bin", herdrBin, "--opencode-bin", opencodeBin]
const testEnv = (root, extra = {}) => ({
  PATH: process.env.PATH,
  HOME: join(root, "home"),
  XDG_DATA_HOME: join(root, "xdg-data"),
  XDG_CONFIG_HOME: join(root, "xdg-config"),
  XDG_STATE_HOME: join(root, "xdg-state"),
  XDG_CACHE_HOME: join(root, "xdg-cache"),
  TMPDIR: join(root, "tmp"),
  ...extra,
})
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
    expect(readHostRuntimeIdentity(paths.dataRoot, "1.2.0").runtimeVersion).toBe("1.2.0")
    expect(lifecycle({ ...paths, action: "rollback" }).active).toBe("1.0.0")
    expect(readHostRuntimeIdentity(paths.dataRoot, "1.0.0").runtimeVersion).toBe("1.0.0")
  })

  test("pointer failure is audited and leaves the active version safe", () => {
    const { paths } = fixture()
    lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
    expect(() => lifecycle({ ...paths, action: "upgrade", version: "1.1.0", files: { "runtime.mjs": "two" }, pointerOptions: { failAt: "rename" } })).toThrow("CT_POINTER_RENAME_FAILED")
    expect(lifecycle({ ...paths, action: "diagnose" }).active).toBe("1.0.0")
    expect(existsSync(join(paths.dataRoot, "versions/1.1.0"))).toBe(false)
    expect(existsSync(join(paths.dataRoot, "versions/1.1.0/host-runtime.json"))).toBe(false)
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
  const { root } = fixture(), env = testEnv(root, { XDG_DATA_HOME: join(root, "data"), XDG_CONFIG_HOME: join(root, "config"), XDG_STATE_HOME: join(root, "state") })
  const output = execFileSync(join(repoRoot, "bin/torre"), ["diagnose"], { cwd: root, env, encoding: "utf8" })
  expect(JSON.parse(output)).toMatchObject({ operation: "diagnose", healthy: false, active: null })
})

test("source payload rejection is atomic before creating temporary roots", () => {
  const { root, paths } = fixture(), source = join(root, "invalid-release")
  mkdirSync(source)
  writeFileSync(join(source, "core.mjs"), "incomplete\n")
  const env = testEnv(root)
  expect(() => runCli(["install", "1.0.0", source], env)).toThrow("CT_RUNTIME_PAYLOAD_INCOMPLETE")
  expect(existsSync(join(root, "xdg-data"))).toBe(false)
  expect(existsSync(join(root, "xdg-state"))).toBe(false)
})

test("attended installs require explicit Herdr and OpenCode executable identities", () => {
  const { root } = fixture(), env = testEnv(root)

  expect(() => runCli(["install", "1.0.0", repoRoot], env)).toThrow("CT_HOST_RUNTIME_REQUIRED")
  expect(existsSync(join(env.XDG_DATA_HOME, "control-tower"))).toBe(false)
})

test("installer accepts pinned Herdr 0.8.0 without the unavailable root-observation command", () => {
  const { root, paths } = fixture(), env = testEnv(root)
  writeFileSync(paths.herdrBin, "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then printf 'herdr 0.8.0\\n'; else exit 64; fi\n", { mode: 0o700 })

  expect(runCli(["install", "1.0.0", repoRoot, ...hostArgs(paths)], env)).toMatchObject({ active: "1.0.0" })
})

test("installer rejects Herdr without the required 0.8.0 compatibility version before storing a runtime", () => {
  const { root, paths } = fixture(), env = testEnv(root)
  writeFileSync(paths.herdrBin, "#!/bin/sh\nprintf 'herdr unknown\\n'\n", { mode: 0o700 })

  expect(() => runCli(["install", "1.0.0", repoRoot, ...hostArgs(paths)], env)).toThrow("CT_HOST_RUNTIME_CONTRACT")
  expect(existsSync(join(env.XDG_DATA_HOME, "control-tower"))).toBe(false)
})

test("installer rejects malformed, failed, timed-out, and incompatible Herdr versions", () => {
  for (const script of [
    "#!/bin/sh\nprintf 'bad\\n'\n",
    "#!/bin/sh\nexit 2\n",
    "#!/bin/sh\nsleep 2\n",
    "#!/bin/sh\nprintf 'herdr 0.9.0\\n'\n",
  ]) {
    const { root, paths } = fixture(), env = testEnv(root)
    writeFileSync(paths.herdrBin, script, { mode: 0o700 })
    expect(() => runCli(["install", "1.0.0", repoRoot, ...hostArgs(paths)], env)).toThrow("CT_HOST_RUNTIME_CONTRACT")
    expect(existsSync(join(env.XDG_DATA_HOME, "control-tower"))).toBe(false)
  }
})

test("installer rejects ambiguous or oversized Herdr version output", () => {
  for (const output of [
    "herdr 0.8.0\\nherdr 0.8.0",
    "x".repeat(4_097),
  ]) {
    const { root, paths } = fixture(), env = testEnv(root)
    writeFileSync(paths.herdrBin, `#!/bin/sh\nprintf '%s\\n' '${output}'\n`, { mode: 0o700 })
    expect(() => runCli(["install", "1.0.0", repoRoot, ...hostArgs(paths)], env)).toThrow("CT_HOST_RUNTIME_CONTRACT")
  }
})

test("attended CLI rejects unsafe or mismatched executable inputs before installing", () => {
  const item = fixture(), env = testEnv(item.root), relative = "bin/herdr", link = join(item.root, "bin/herdr-link")
  symlinkSync(item.paths.herdrBin, link)
  chmodSync(item.paths.opencodeBin, 0o600)
  for (const args of [
    ["--opencode-bin", item.paths.opencodeBin],
    ["--herdr-bin", relative, "--opencode-bin", item.paths.opencodeBin],
    ["--herdr-bin", link, "--opencode-bin", item.paths.opencodeBin],
    ["--herdr-bin", dirname(item.paths.herdrBin), "--opencode-bin", item.paths.opencodeBin],
  ]) {
    expect(() => runCli(["install", "1.0.0", repoRoot, ...args], env)).toThrow("CT_HOST_RUNTIME_")
    expect(existsSync(join(env.XDG_DATA_HOME, "control-tower"))).toBe(false)
  }
  chmodSync(item.paths.opencodeBin, 0o700)
  expect(() => runCli(["install", "1.0.0", repoRoot, "--herdr-bin", item.paths.opencodeBin, "--opencode-bin", item.paths.opencodeBin], env)).toThrow("CT_HOST_RUNTIME_INVALID")
})

  test("installs an immutable owner-protected versioned host-runtime record", () => {
  const item = fixture(), env = testEnv(item.root)
  expect(runCli(["install", "1.0.0", repoRoot, ...hostArgs(item.paths)], env)).toMatchObject({ active: "1.0.0" })
  const record = join(env.XDG_DATA_HOME, "control-tower/versions/1.0.0/host-runtime.json"), stored = JSON.parse(readFileSync(record, "utf8"))
  expect(stored).toMatchObject({ schema: "control-tower.host-runtime/v1", runtimeVersion: "1.0.0", herdr: { path: item.paths.herdrBin }, opencode: { path: item.paths.opencodeBin }, herdr_runtime: { schema: "control-tower.herdr-runtime/v1", version: "0.8.0" } })
  expect(stored.herdr_contract).toBeUndefined()
  expect(lstatSync(record).mode & 0o777).toBe(0o600)
  })

  test("revalidates the active exact executable identity and compatibility before host effects", () => {
    const { paths } = fixture()
    lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
    const runtime = join(paths.dataRoot, "versions/1.0.0")
    expect(validateActiveHostRuntime(paths.dataRoot, "1.0.0", runtime)).toMatchObject({ herdr: paths.herdrBin, opencode: paths.opencodeBin })
    writeFileSync(paths.herdrBin, "#!/bin/sh\nexit 1\n", { mode: 0o700 })
    expect(() => validateActiveHostRuntime(paths.dataRoot, "1.0.0", runtime)).toThrow("CT_HOST_RUNTIME_CHANGED")
  })

  test("rejects Herdr that replaces itself while the compatibility probe is running", () => {
    const { paths } = fixture()
    lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
    const runtime = join(paths.dataRoot, "versions/1.0.0"), marker = `${paths.herdrBin}.mutate`
    writeFileSync(paths.herdrBin, "#!/bin/sh\nif [ -f " + marker + " ]; then printf '#!/bin/sh\\nexit 99\\n' > \"$0\"; fi\nif [ \"$1\" = \"--version\" ]; then printf 'herdr 0.8.0\\n'; fi\n", { mode: 0o700 })
    // Reinstall records the initially valid bytes; only the compatibility subprocess mutates them.
    lifecycle({ ...paths, action: "install", version: "1.0.1", files: { "runtime.mjs": "two" } })
    writeFileSync(marker, "mutate\n")
    expect(() => validateActiveHostRuntime(paths.dataRoot, "1.0.1", join(paths.dataRoot, "versions/1.0.1"))).toThrow("CT_HOST_RUNTIME_CHANGED")
    expect(readFileSync(paths.herdrBin, "utf8")).toContain("exit 99")
  })

  test("rejects a runtime root that is not the version named by active.json", () => {
    const { paths } = fixture()
    lifecycle({ ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } })
    expect(() => validateActiveHostRuntime(paths.dataRoot, "other", join(paths.dataRoot, "versions/other"))).toThrow("CT_HOST_RUNTIME_ACTIVE_MISMATCH")
  })

test("reentrant installs retain the winning immutable host-runtime record", () => {
  const { paths } = fixture(), nested = { ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } }
  let reentrant = 0
  const outer = lifecycle({ ...nested, hostRuntimeOptions: { beforePublish: () => { reentrant += 1; lifecycle(nested) } } })

  expect(reentrant).toBe(1)
  expect(outer.active).toBe("1.0.0")
  expect(readHostRuntimeIdentity(paths.dataRoot, "1.0.0").runtimeVersion).toBe("1.0.0")
})

test("conflicting reentrant installs preserve the winner and active pointer", () => {
  const { root, paths } = fixture(), alternateHerdr = join(root, "alternate/herdr")
  mkdirSync(dirname(alternateHerdr), { recursive: true })
  writeFileSync(alternateHerdr, "#!/bin/sh\n# alternate\nif [ \"$1\" = \"--version\" ]; then printf 'herdr 0.8.0\\n'; fi\n", { mode: 0o700 })
  const nested = { ...paths, herdrBin: alternateHerdr, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" } }
  const outer = { ...paths, action: "install", version: "1.0.0", files: { "runtime.mjs": "one" }, hostRuntimeOptions: { beforePublish: () => lifecycle(nested) } }

  expect(() => lifecycle(outer)).toThrow("CT_HOST_RUNTIME_IMMUTABLE")
  expect(lifecycle({ ...paths, action: "diagnose" }).active).toBe("1.0.0")
  expect(readHostRuntimeIdentity(paths.dataRoot, "1.0.0").herdr.path).toBe(alternateHerdr)
})

test("install accepts a checkout source and stores exactly the runtime payload", () => {
  const { root, paths } = fixture()
  const env = testEnv(root)

  expect(runCli(["install", "checkout-v1", repoRoot, ...hostArgs(paths)], env)).toMatchObject({ active: "checkout-v1", stored: true })
  const storedRoot = join(env.XDG_DATA_HOME, "control-tower/versions/checkout-v1")
  expect(RUNTIME_PAYLOAD_FILES.map((path) => readFileSync(join(storedRoot, path)))).toEqual(RUNTIME_PAYLOAD_FILES.map((path) => readFileSync(join(repoRoot, path))))
  expect(readdirSync(storedRoot).sort()).toEqual([".manifest", "bin", "core.mjs", "host-runtime.json", "hosts", "install", "jornada", "main-store"])
})

test("install keeps strict payload validation for a staging source with an extra member", () => {
  const { root } = fixture(), source = join(root, "staging")
  for (const file of RUNTIME_PAYLOAD_FILES) {
    const destination = join(source, file)
    mkdirSync(join(destination, ".."), { recursive: true })
    copyFileSync(join(repoRoot, file), destination)
  }
  writeFileSync(join(source, "extra.mjs"), "unexpected\n")
  const env = testEnv(root)

  expect(() => runCli(["install", "staging-v1", source], env)).toThrow("CT_RUNTIME_PAYLOAD_INVALID")
  expect(existsSync(join(env.XDG_DATA_HOME, "control-tower"))).toBe(false)
})

test("install keeps strict payload validation for a staging source with a synthetic Git marker", () => {
  const { root } = fixture(), source = join(root, "staging")
  for (const file of RUNTIME_PAYLOAD_FILES) {
    const destination = join(source, file)
    mkdirSync(join(destination, ".."), { recursive: true })
    copyFileSync(join(repoRoot, file), destination)
  }
  writeFileSync(join(source, ".git"), "gitdir: not-a-checkout\n")
  writeFileSync(join(source, "extra.mjs"), "unexpected\n")
  const env = testEnv(root)

  expect(() => runCli(["install", "fake-git-v1", source], env)).toThrow("CT_RUNTIME_PAYLOAD_INVALID")
  expect(existsSync(join(env.XDG_DATA_HOME, "control-tower"))).toBe(false)
})

test("install creates an optional PATH shim pointing into the active version", () => {
  const { root, paths } = fixture(), bin = join(root, "bin")
  const env = testEnv(root, { TORRE_BIN_DIR: bin })

  expect(runCli(["install", "shim-v1", repoRoot, ...hostArgs(paths), "--shim"], env)).toMatchObject({ active: "shim-v1" })
  const shim = join(bin, "torre")
  expect(lstatSync(shim).isSymbolicLink()).toBe(true)
  expect(realpathSync(shim)).toBe(join(env.XDG_DATA_HOME, "control-tower/versions/shim-v1/bin/torre"))
})

test("install backs up a pre-existing PATH shim target before replacement", () => {
  const { root, paths } = fixture(), bin = join(root, "bin"), shim = join(bin, "torre")
  mkdirSync(bin, { recursive: true })
  writeFileSync(shim, "legacy-torre\n")
  const env = testEnv(root, { TORRE_BIN_DIR: bin })

  const result = runCli(["install", "backup-v1", repoRoot, ...hostArgs(paths), "--shim"], env)
  expect(result.shim.backup).toBe(`${shim}.legacy-backup-v1`)
  expect(readFileSync(result.shim.backup, "utf8")).toBe("legacy-torre\n")
  rmSync(shim)
  copyFileSync(result.shim.backup, shim)
  expect(readFileSync(shim, "utf8")).toBe("legacy-torre\n")
})

test("install does not write a PATH shim without the explicit option", () => {
  const { root, paths } = fixture(), bin = join(root, "bin")
  mkdirSync(bin, { recursive: true })
  const before = snapshotPath(bin)
  const env = testEnv(root, { TORRE_BIN_DIR: bin })

  expect(runCli(["install", "no-shim-v1", repoRoot, ...hostArgs(paths)], env)).toMatchObject({ active: "no-shim-v1" })
  expect(snapshotPath(bin)).toEqual(before)
})

test("V2-only CLI automation requests fail closed before repository mutation", () => {
  const { root } = fixture(), repo = join(root, "repo")
  const env = testEnv(root)
  for (const command of ["create-session", "create-worktree"]) {
    const result = spawnSync(join(repoRoot, "bin/torre"), [command], { cwd: repo, env, encoding: "utf8" })
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
  const { root, paths } = fixture(), source = join(root, "release"), data = join(root, "published")
  mkdirSync(join(source, "bin"), { recursive: true })
  mkdirSync(join(source, "install"), { recursive: true })
  for (const file of RUNTIME_PAYLOAD_FILES) {
    mkdirSync(dirname(join(source, file)), { recursive: true })
    writeFileSync(join(source, file), `release:${file}\n`)
  }
  const env = testEnv(root, { XDG_DATA_HOME: join(root, "data"), XDG_CONFIG_HOME: join(root, "config"), XDG_STATE_HOME: join(root, "state") })
  const installed = execFileSync(join(repoRoot, "install.sh"), ["install", "2.0.0", source, ...hostArgs(paths)], { env, encoding: "utf8" })
  expect(JSON.parse(installed)).toMatchObject({ active: "2.0.0", changed: true })
  const published = execFileSync("bun", [join(repoRoot, "scripts/publish-runtime.mjs"), "2.0.0", data], { env, encoding: "utf8" })
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
  const herdrBin = join(root, "bin/herdr"), opencodeBin = join(root, "bin/opencode")
  mkdirSync(dirname(herdrBin), { recursive: true })
  writeFileSync(herdrBin, "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then printf 'herdr 0.8.0\\n'; fi\n", { mode: 0o700 })
  writeFileSync(opencodeBin, "#!/bin/sh\nexit 0\n", { mode: 0o700 })

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

  const installed = spawnSync(stagedTorre, ["install", "10.0.0", release, "--herdr-bin", herdrBin, "--opencode-bin", opencodeBin], { cwd, env, encoding: "utf8" })
  expect({ status: installed.status, stderr: installed.stderr }).toEqual({ status: 0, stderr: "" })
  expect(JSON.parse(installed.stdout)).toMatchObject({ operation: "install", active: "10.0.0", changed: true, stored: true })
  expect(JSON.parse(readFileSync(join(publication, "active.json"), "utf8"))).toEqual({ version: "10.0.0", previous: null })
  expect(readdirSync(join(publication, "versions/10.0.0")).sort()).toEqual([".manifest", "bin", "core.mjs", "host-runtime.json", "hosts", "install", "jornada", "main-store"])

  const files = Object.fromEntries(RUNTIME_PAYLOAD_FILES.map((file) => [file, readFileSync(join(release, file))]))
  const expectedManifest = createHash("sha256").update(JSON.stringify(Object.entries(files).sort(([left], [right]) => left.localeCompare(right))
    .map(([path, contents]) => [path, Buffer.from(contents).toString("base64")]))).digest("hex")
  expect(readFileSync(join(publication, "versions/10.0.0/.manifest"), "utf8")).toBe(`${expectedManifest}\n`)
  rmSync(root, { recursive: true, force: true })
  roots.splice(roots.indexOf(root), 1)
  expect(existsSync(root)).toBe(false)
})
