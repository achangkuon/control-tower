import { afterEach, describe, expect, test } from "bun:test"
import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createHash } from "node:crypto"
import { createServer } from "node:net"
import { dependencyEnvironmentRetention, materializeDependencyEnvironment } from "../../install/dependency-environment.mjs"

const roots = [], temp = () => { const path = mkdtempSync(join(tmpdir(), "ct-deps-")); roots.push(path); return path }
const json = (value) => Buffer.from(JSON.stringify(value)), sha = (value) => createHash("sha256").update(value).digest("hex")
const lock = (packages = { a: ["a@1.0.0", "", {}] }) => json({ lockfileVersion: 1, workspaces: { "": { dependencies: { a: "1.0.0" } } }, packages })
const source = (root, name = "a", version = "1.0.0") => { const path = join(root, `${name}@${version}`); mkdirSync(path, { recursive: true }); writeFileSync(join(path, "package.json"), JSON.stringify({ name, version })); writeFileSync(join(path, "index.js"), "export default 1\n"); return path }
const setup = (options = {}) => {
  const root = temp(), cache = join(root, "cache"), dataRoot = join(root, "data"); mkdirSync(cache)
  const packageBytes = json({ name: "fixture", dependencies: { a: "1.0.0" } }), lockBytes = options.lockBytes ?? lock(), entries = options.entries ?? [source(cache)]
  let calls = 0
  const run = options.run ?? (async ({ cwd, policy }) => {
    calls++; expect(policy.args).toEqual(["install", `--cache-dir=${join(cwd, "../private-cache")}`, "--registry=http://127.0.0.1:1", "--frozen-lockfile", "--linker=hoisted", "--backend=copyfile", "--ignore-scripts", "--no-save"])
    expect(policy.timeoutMs).toBe(30_000); expect(policy.maxBuffer).toBe(1024 * 1024); expect(policy.env.BUN_CONFIG_REGISTRY).toBe("http://127.0.0.1:1"); expect(policy.env.HTTPS_PROXY).toBe(policy.env.ALL_PROXY)
    for (const key of ["NODE_PATH", "npm_config_registry", "NPM_CONFIG_USERCONFIG", "INIT_CWD", "PWD"]) expect(policy.env[key]).toBeUndefined()
    const modules = join(cwd, "node_modules/a"); mkdirSync(modules, { recursive: true }); writeFileSync(join(modules, "package.json"), JSON.stringify({ name: "a", version: "1.0.0" })); writeFileSync(join(modules, "index.js"), "export default 1\n"); return { exitCode: 0 }
  })
  const adapters = { discover: async () => entries, run, ...options.adapters }; if (options.defaultDiscover) delete adapters.discover
  return { input: { dataRoot, packageBytes, lockBytes, bun: { version: "1.3.14", bytes: Buffer.from("bun"), path: "/exact/bun" }, host: { os: "linux", cpu: "x64" } }, adapters, calls: () => calls, root, cache }
}
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))
const code = async (promise) => { try { await promise; return "NO_ERROR" } catch (error) { return error.code ?? error.message } }

describe("dependency environment owner", () => {
  test("binds exact input bytes and publishes deterministic attestations with offline policy", async () => {
    const f = setup(), result = await materializeDependencyEnvironment(f.input, f.adapters)
    expect(result.created).toBe(true); expect(result.digest).toBe(sha(f.input.lockBytes)); expect(result.metadata.packageDigest).toBe(sha(f.input.packageBytes)); expect(result.metadata.bun).toEqual({ version: "1.3.14", digest: sha(Buffer.from("bun")) })
    expect(result.metadata.host).toEqual({ os: "linux", cpu: "x64" }); expect(result.metadata.topology).toEqual([{ name: "a", version: "1.0.0" }]); expect(readFileSync(join(result.path, "metadata.json"), "utf8")).toBe(`${JSON.stringify(result.metadata)}\n`)
  })

  test("allows an absent optional only when the lock excludes this host", async () => {
    const f = setup({ lockBytes: lock({ a: ["a@1.0.0", "", {}], native: ["native@2.0.0", "", { os: "darwin", cpu: "arm64" }] }) })
    expect((await materializeDependencyEnvironment(f.input, f.adapters)).metadata.topology).toEqual([{ name: "a", version: "1.0.0" }])
  })

  test("accepts confined .bin links and inventories nested packages", async () => {
    const f = setup({ lockBytes: lock({ a: ["a@1.0.0", "", {}], yaml: ["yaml@2.9.0", "", {}] }), run: async ({ cwd }) => {
      const a = join(cwd, "node_modules/a"), yaml = join(a, "node_modules/yaml"), bin = join(a, "node_modules/.bin")
      mkdirSync(yaml, { recursive: true }); mkdirSync(bin); writeFileSync(join(a, "package.json"), JSON.stringify({ name: "a", version: "1.0.0" })); writeFileSync(join(yaml, "package.json"), JSON.stringify({ name: "yaml", version: "2.9.0" })); writeFileSync(join(yaml, "cli.js"), "cli\n"); symlinkSync("../yaml/cli.js", join(bin, "yaml")); return { exitCode: 0 }
    } })
    f.adapters.discover = async () => [join(f.cache, "a@1.0.0"), source(f.cache, "yaml", "2.9.0")]
    const result = await materializeDependencyEnvironment(f.input, f.adapters)
    expect(result.metadata.topology).toEqual([{ name: "a", version: "1.0.0" }, { name: "yaml", version: "2.9.0" }]); expect(result.metadata.treeDigest).toMatch(/^[a-f0-9]{64}$/)
  })

  test("discovers shared cache through exact Bun process and ignores unrelated cache shapes", async () => {
    let fixture
    const f = setup({ defaultDiscover: true, adapters: { cacheRun: async ({ bunPath, args }) => {
      expect(bunPath).toBe("/exact/bun"); expect(args).toEqual(["pm", "cache"]); writeFileSync(join(fixture.cache, "artifact.npm"), "cache artifact"); mkdirSync(join(fixture.cache, ".tmp")); source(fixture.cache, "unrelated", "9.0.0")
      const scoped = join(fixture.cache, "@opencode-ai", "unrelated@2.0.0"); mkdirSync(scoped, { recursive: true }); writeFileSync(join(scoped, "package.json"), JSON.stringify({ name: "@opencode-ai/unrelated", version: "2.0.0" }))
      return { exitCode: 0, stdout: `${fixture.cache}\n` }
    } } }); fixture = f
    expect((await materializeDependencyEnvironment(f.input, f.adapters)).metadata.topology).toEqual([{ name: "a", version: "1.0.0" }])
  })

  test("rejects invalid inputs and cache entries with stable errors", async () => {
    const cases = []
    { const f = setup(); f.input.bun.version = "1.3.13"; cases.push([f, "CT_DEPENDENCY_INPUT_INVALID"]) }
    { const f = setup({ entries: [] }); cases.push([f, "CT_DEPENDENCY_CACHE_INCOMPLETE"]) }
    { const f = setup(); const wrong = source(f.cache, "a", "9.0.0"); f.adapters.discover = async () => [wrong]; cases.push([f, "CT_DEPENDENCY_CACHE_INVALID"]) }
    { const f = setup(); writeFileSync(join(f.cache, "a@1.0.0/package.json"), "{"); cases.push([f, "CT_DEPENDENCY_CACHE_INVALID"]) }
    { const f = setup(); const second = source(f.cache, "a-copy", "1.0.0"); writeFileSync(join(second, "package.json"), JSON.stringify({ name: "a", version: "1.0.0" })); f.adapters.discover = async () => [join(f.cache, "a@1.0.0"), second]; cases.push([f, "CT_DEPENDENCY_CACHE_INVALID"]) }
    { const f = setup(); const original = join(f.cache, "a@1.0.0"), target = join(f.cache, "real"); mkdirSync(target); rmSync(original, { recursive: true }); symlinkSync(target, original); cases.push([f, "CT_DEPENDENCY_CACHE_INVALID"]) }
    { const f = setup(); symlinkSync("index.js", join(f.cache, "a@1.0.0/nested-link")); cases.push([f, "CT_DEPENDENCY_CACHE_INVALID"]) }
    { const f = setup(); chmodSync(join(f.cache, "a@1.0.0/index.js"), 0o000); cases.push([f, "CT_DEPENDENCY_CACHE_INVALID"]) }
    for (const [fixture, expected] of cases) expect(await code(materializeDependencyEnvironment(fixture.input, fixture.adapters))).toBe(expected)
    const f = setup(), socketPath = join(f.cache, "a@1.0.0/socket"), server = createServer(); await new Promise((resolve, reject) => server.once("error", reject).listen(socketPath, resolve)); expect(await code(materializeDependencyEnvironment(f.input, f.adapters))).toBe("CT_DEPENDENCY_CACHE_INVALID"); await new Promise((resolve) => server.close(resolve))
  })

  test("detects source mutation, timeout, process failure, and invalid output", async () => {
    const changed = setup(), originalRun = changed.adapters.run; changed.adapters.run = async (context) => { writeFileSync(join(changed.cache, "a@1.0.0/index.js"), "changed"); return originalRun(context) }
    expect(await code(materializeDependencyEnvironment(changed.input, changed.adapters))).toBe("CT_DEPENDENCY_SOURCE_CHANGED")
    const variants = [
      [async ({ cwd }) => { writeFileSync(join(cwd, "../private-cache/a@1.0.0/index.js"), "changed"); return { exitCode: 0 } }, "CT_DEPENDENCY_SOURCE_CHANGED"],
      [async () => { const error = new Error("timeout"); error.name = "TimeoutError"; throw error }, "CT_DEPENDENCY_MATERIALIZATION_TIMEOUT"], [async () => ({ exitCode: 2 }), "CT_DEPENDENCY_MATERIALIZATION_FAILED"],
      [async ({ cwd }) => { mkdirSync(join(cwd, "node_modules/a"), { recursive: true }); writeFileSync(join(cwd, "node_modules/a/package.json"), JSON.stringify({ name: "a", version: "9.0.0" })); return { exitCode: 0 } }, "CT_DEPENDENCY_ENV_INVALID"],
    ]
    for (const [run, expected] of variants) { const f = setup({ run }); expect(await code(materializeDependencyEnvironment(f.input, f.adapters))).toBe(expected) }
  })

  test("accepts only confined regular-file .bin links and rejects invalid topology", async () => {
    const variants = [
      async ({ cwd }) => { mkdirSync(join(cwd, "node_modules")); symlinkSync("../x", join(cwd, "node_modules/a")) },
      async ({ cwd }) => { mkdirSync(join(cwd, "node_modules/a"), { recursive: true }); writeFileSync(join(cwd, "node_modules/a/package.json"), JSON.stringify({ name: "a", version: "1.0.0" })); symlinkSync("package.json", join(cwd, "node_modules/a/link")) },
      async ({ cwd }) => { mkdirSync(join(cwd, "node_modules/a/.bin"), { recursive: true }); writeFileSync(join(cwd, "node_modules/a/package.json"), JSON.stringify({ name: "a", version: "1.0.0" })); writeFileSync(join(cwd, "escape"), "x"); symlinkSync("../../../escape", join(cwd, "node_modules/a/.bin/escape")) },
      async ({ cwd }) => { mkdirSync(join(cwd, "node_modules/a/.bin"), { recursive: true }); writeFileSync(join(cwd, "node_modules/a/package.json"), JSON.stringify({ name: "a", version: "1.0.0" })); symlinkSync("../missing", join(cwd, "node_modules/a/.bin/dangling")) },
      async ({ cwd }) => { for (const [name, version] of [["a", "1.0.0"], ["extra", "1.0.0"]]) { mkdirSync(join(cwd, `node_modules/${name}`), { recursive: true }); writeFileSync(join(cwd, `node_modules/${name}/package.json`), JSON.stringify({ name, version })) } },
      async ({ cwd }) => { mkdirSync(join(cwd, "node_modules/a"), { recursive: true }); writeFileSync(join(cwd, "node_modules/a/package.json"), JSON.stringify({ name: "a", version: "1.0.0" })); linkSync(join(cwd, "../private-cache/a@1.0.0/index.js"), join(cwd, "node_modules/a/index.js")) },
    ]
    for (const body of variants) { const f = setup({ run: async (context) => { await body(context); return { exitCode: 0 } } }); expect(await code(materializeDependencyEnvironment(f.input, f.adapters))).toBe("CT_DEPENDENCY_ENV_INVALID") }
  })

  test("reuses valid environments, converges publishers, and rejects changed attestations", async () => {
    const f = setup(), [left, right] = await Promise.all([materializeDependencyEnvironment(f.input, f.adapters), materializeDependencyEnvironment(f.input, f.adapters)])
    expect([left.created, right.created].sort()).toEqual([false, true]); expect(left.metadata.treeDigest).toBe(right.metadata.treeDigest)
    const reused = await materializeDependencyEnvironment(f.input, { ...f.adapters, discover: async () => { throw new Error("copied twice") }, run: async () => { throw new Error("ran twice") } }); expect(reused.created).toBe(false); expect(f.calls()).toBe(2)
    chmodSync(join(reused.path, "metadata.json"), 0o600); const changed = { ...reused.metadata, sources: [{ ...reused.metadata.sources[0], digest: "0".repeat(64) }] }; writeFileSync(join(reused.path, "metadata.json"), `${JSON.stringify(changed)}\n`)
    expect(await code(materializeDependencyEnvironment(f.input, f.adapters))).toBe("CT_DEPENDENCY_ENV_IMMUTABLE")
  })

  test("retention scans every real version binding and never selects a referenced environment", async () => {
    const left = setup(), right = setup({ lockBytes: lock({ a: ["a@2.0.0", "", {}] }), entries: [] })
    right.input.dataRoot = left.input.dataRoot; right.adapters.discover = async () => [source(right.cache, "a", "2.0.0")]; right.adapters.run = async ({ cwd }) => { const path = join(cwd, "node_modules/a"); mkdirSync(path, { recursive: true }); writeFileSync(join(path, "package.json"), JSON.stringify({ name: "a", version: "2.0.0" })); return { exitCode: 0 } }
    const first = await materializeDependencyEnvironment(left.input, left.adapters), second = await materializeDependencyEnvironment(right.input, right.adapters)
    const spare = setup({ lockBytes: lock({ a: ["a@3.0.0", "", {}] }), entries: [] }); spare.input.dataRoot = left.input.dataRoot; spare.adapters.discover = async () => [source(spare.cache, "a", "3.0.0")]; spare.adapters.run = async ({ cwd }) => { const path = join(cwd, "node_modules/a"); mkdirSync(path, { recursive: true }); writeFileSync(join(path, "package.json"), JSON.stringify({ name: "a", version: "3.0.0" })); return { exitCode: 0 } }; const unused = (await materializeDependencyEnvironment(spare.input, spare.adapters)).digest
    for (const [version, digest] of [["one", first.digest], ["two", first.digest], ["three", second.digest]]) { const root = join(left.input.dataRoot, "versions", version); mkdirSync(root, { recursive: true }); writeFileSync(join(root, ".dependency-environment.json"), `${JSON.stringify({ schema: 1, digest })}\n`, { mode: 0o400 }); symlinkSync(`../../dependency-environments/${digest}/node_modules`, join(root, "node_modules")) }
    const temporary = `.tmp-${unused}-00000000-0000-4000-8000-000000000000`; mkdirSync(join(left.input.dataRoot, "dependency-environments", temporary))
    expect(dependencyEnvironmentRetention(left.input.dataRoot)).toEqual({ referenced: [first.digest, second.digest].sort(), candidates: [unused], temporaries: [temporary] })
    symlinkSync(join(left.input.dataRoot, "versions/one"), join(left.input.dataRoot, "versions/linked"))
    expect(() => dependencyEnvironmentRetention(left.input.dataRoot)).toThrow("CT_DEPENDENCY_RETENTION_INVALID")
  })

  test("retention fails closed for bound-capable versions with missing binding artifacts", () => {
    for (const dangling of [false, true]) {
      const f = setup(), version = join(f.input.dataRoot, "versions", dangling ? "dangling" : "missing")
      mkdirSync(join(version, "install"), { recursive: true }); writeFileSync(join(version, "install/dependency-environment.mjs"), "owner\n")
      if (dangling) symlinkSync("../../dependency-environments/missing/node_modules", join(version, "node_modules"))
      expect(() => dependencyEnvironmentRetention(f.input.dataRoot)).toThrow("CT_DEPENDENCY_RETENTION_INVALID")
    }
  })
})
