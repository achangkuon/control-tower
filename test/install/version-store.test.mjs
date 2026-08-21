import { afterEach, describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"

import { readActivePointer, replaceActivePointer, rollbackActivePointer } from "../../install/active-pointer.mjs"
import { denyV2Only, readVersionDependencyEnvironment, storeVersion, verifyVersion } from "../../install/version-store.mjs"

const roots = [], sha = (bytes) => createHash("sha256").update(bytes).digest("hex"), canonical = (value) => `${JSON.stringify(value)}\n`
const fixture = () => { const root = mkdtempSync(join(tmpdir(), "ct-version-")); roots.push(root); return root }
const commandPolicy = { args: ["install", "--cache-dir=<private-cache>", "--registry=http://127.0.0.1:1", "--frozen-lockfile", "--linker=hoisted", "--backend=copyfile", "--ignore-scripts", "--no-save"], timeoutMs: 30_000, maxBuffer: 1024 * 1024, env: { HOME: "<private-home>", XDG_CACHE_HOME: "<private-home>/.cache", TMPDIR: "<private-home>/tmp", BUN_INSTALL_CACHE_DIR: "<private-cache>", BUN_CONFIG_REGISTRY: "http://127.0.0.1:1", HTTP_PROXY: "http://127.0.0.1:1", HTTPS_PROXY: "http://127.0.0.1:1", ALL_PROXY: "http://127.0.0.1:1", http_proxy: "http://127.0.0.1:1", https_proxy: "http://127.0.0.1:1", all_proxy: "http://127.0.0.1:1", NO_PROXY: "", no_proxy: "" } }
const writeMetadata = (target, metadata) => { const attested = { ...metadata }, path = join(target, "metadata.json"); attested.integrity = sha(canonical(attested)); if (existsSync(path)) chmodSync(path, 0o600); writeFileSync(path, canonical(attested), { mode: 0o400 }); chmodSync(path, 0o400); return attested }
const environment = (root, digest = "a".repeat(64)) => {
  const target = join(root, "dependency-environments", digest), modules = join(target, "node_modules/synthetic-binding"), topology = [{ name: "synthetic-binding", version: "1.0.0" }]
  mkdirSync(modules, { recursive: true }); writeFileSync(join(modules, "package.json"), JSON.stringify({ ...topology[0], type: "module" })); writeFileSync(join(modules, "index.js"), "export default 'isolated'\n")
  const tree = createHash("sha256"), visit = (path, rel = "") => { const info = lstatSync(path); if (info.isDirectory()) { tree.update(`d\0${rel}\0${info.mode & 0o777}\0`); for (const name of ["synthetic-binding", "index.js", "package.json"].filter((name) => existsSync(join(path, name)))) visit(join(path, name), rel ? `${rel}/${name}` : name) } else tree.update(`f\0${rel}\0${info.mode & 0o777}\0`).update(readFileSync(path)) }; visit(join(target, "node_modules"))
  const metadata = writeMetadata(target, { schema: 1, lockDigest: digest, packageDigest: "b".repeat(64), bun: { version: "1.3.14", digest: "c".repeat(64) }, host: { os: "linux", cpu: "x64" }, commandPolicy, topology, treeDigest: tree.digest("hex"), sources: [{ ...topology[0], path: "synthetic-binding@1.0.0", digest: "d".repeat(64) }] }); return { digest, target, metadata }
}
const binding = (dependencyDigest) => ({ dependencyDigest })
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

describe("immutable version store", () => {
  test("stores a version once and preserves old versions", () => {
    const root = fixture()
    expect(storeVersion(root, "1.0.0", { "runtime.mjs": "one\n" }).created).toBe(true)
    expect(storeVersion(root, "1.0.0", { "runtime.mjs": "one\n" }).created).toBe(false)
    storeVersion(root, "1.1.0", { "runtime.mjs": "two\n" })
    expect(readFileSync(join(root, "versions/1.0.0/runtime.mjs"), "utf8")).toBe("one\n")
    expect(readFileSync(join(root, "versions/1.1.0/runtime.mjs"), "utf8")).toBe("two\n")
  })

  test("rejects traversal and changed bytes for an existing version", () => {
    const root = fixture()
    storeVersion(root, "1.0.0", { "runtime.mjs": "one" })
    expect(() => storeVersion(root, "1.0.0", { "runtime.mjs": "changed" })).toThrow("CT_VERSION_IMMUTABLE")
    expect(() => storeVersion(root, "../escape", { "runtime.mjs": "bad" })).toThrow("CT_VERSION_INVALID")
  })

  test("rejects invalid members before creating a version root", () => {
    const root = fixture()
    expect(() => storeVersion(root, "1.0.0", { "../escape": "bad" })).toThrow("CT_VERSION_PATH_INVALID")
    expect(existsSync(join(root, "versions"))).toBe(false)
  })

  test("does not include a supplied manifest in the immutable digest", () => {
    const root = fixture()
    storeVersion(root, "1.0.0", { "runtime.mjs": "one", ".manifest": "ignored" })
    expect(() => storeVersion(root, "1.0.0", { "runtime.mjs": "one", ".manifest": "different" })).not.toThrow()
  })

  test("binds two immutable versions to one digest and resolves a bare import in isolation", () => {
    const root = fixture(), env = environment(root), runtime = 'import value from "synthetic-binding"; console.log(value)\n'
    for (const version of ["1.0.0", "1.1.0"]) storeVersion(root, version, { "runtime.mjs": runtime }, binding(env.digest))
    const versions = ["1.0.0", "1.1.0"].map((version) => join(root, "versions", version))
    for (const [index, version] of versions.entries()) {
      expect(JSON.parse(readFileSync(join(version, ".dependency-environment.json"), "utf8"))).toEqual({ schema: 1, digest: env.digest })
      expect(readlinkSync(join(version, "node_modules"))).toBe(relative(version, join(env.target, "node_modules")))
      expect(verifyVersion(root, ["1.0.0", "1.1.0"][index], { "runtime.mjs": runtime }, binding(env.digest)).dependencyDigest).toBe(env.digest)
    }
    const isolated = fixture(), outcome = Bun.spawnSync([process.execPath, join(versions[1], "runtime.mjs")], { cwd: isolated, env: { HOME: isolated, XDG_DATA_HOME: join(isolated, "data"), PATH: "" }, stdout: "pipe", stderr: "pipe" })
    expect(outcome.exitCode).toBe(0); expect(outcome.stdout.toString()).toBe("isolated\n")
  })

  test("rejects canonical environment metadata that is incomplete even with recomputed integrity", () => {
    for (const forge of [
      (metadata) => ({ schema: metadata.schema, lockDigest: metadata.lockDigest, treeDigest: metadata.treeDigest }),
      (metadata) => { const incomplete = { ...metadata }; delete incomplete.host; delete incomplete.integrity; return incomplete },
    ]) {
      const root = fixture(), env = environment(root); writeMetadata(env.target, forge(env.metadata))
      expect(() => storeVersion(root, "1.0.0", { "runtime.mjs": "one" }, binding(env.digest))).toThrow("CT_DEPENDENCY_BINDING_INVALID")
    }
  })

  test("rejects missing, wrong, corrupt, mutable, absolute, escaping, and replaced bindings", () => {
    const mutations = [
      (version) => rmSync(join(version, "node_modules")),
      (version) => { rmSync(join(version, "node_modules")); symlinkSync("../../dependency-environments/" + "b".repeat(64) + "/node_modules", join(version, "node_modules")) },
      (version) => { rmSync(join(version, ".dependency-environment.json")); writeFileSync(join(version, ".dependency-environment.json"), "{}\n", { mode: 0o400 }) },
      (version) => { rmSync(join(version, ".dependency-environment.json")); writeFileSync(join(version, ".dependency-environment.json"), `${JSON.stringify({ schema: 1, digest: "a".repeat(64) })}\n`, { mode: 0o600 }) },
      (version) => { rmSync(join(version, "node_modules")); symlinkSync("/tmp", join(version, "node_modules")) },
      (version) => { rmSync(join(version, "node_modules")); symlinkSync("../../../escape", join(version, "node_modules")) },
      (version, env) => { rmSync(join(env.target, "node_modules"), { recursive: true }); symlinkSync("elsewhere", join(env.target, "node_modules")) },
    ]
    for (const mutate of mutations) { const root = fixture(), env = environment(root); storeVersion(root, "1.0.0", { "runtime.mjs": "one" }, binding(env.digest)); mutate(join(root, "versions/1.0.0"), env); expect(() => verifyVersion(root, "1.0.0", { "runtime.mjs": "one" }, binding(env.digest))).toThrow("CT_DEPENDENCY_BINDING_INVALID") }
  })

  test("classifies only owner-free versions as legacy when dependency binding is absent", () => {
    const root = fixture(), env = environment(root)
    storeVersion(root, "legacy", { "runtime.mjs": "old" }); expect(readVersionDependencyEnvironment(root, "legacy")).toEqual({ legacy: true, dependencyDigest: null })
    storeVersion(root, "bound", { "install/dependency-environment.mjs": "owner" }, binding(env.digest)); rmSync(join(root, "versions/bound/.dependency-environment.json")); rmSync(join(root, "versions/bound/node_modules"))
    expect(() => readVersionDependencyEnvironment(root, "bound")).toThrow("CT_DEPENDENCY_BINDING_INVALID")
  })

  test("rejects reserved binding members and an environment-root symlink", () => {
    const root = fixture(), env = environment(root)
    for (const path of ["node_modules", ".dependency-environment.json"]) expect(() => storeVersion(root, `bad-${path.length}`, { [path]: "forged" }, binding(env.digest))).toThrow("CT_VERSION_PATH_INVALID")
    const realRoot = join(root, "real-environments"); mkdirSync(realRoot); rmSync(join(root, "dependency-environments"), { recursive: true }); symlinkSync(realRoot, join(root, "dependency-environments"))
    expect(() => storeVersion(root, "1.0.0", { "runtime.mjs": "one" }, binding(env.digest))).toThrow("CT_DEPENDENCY_BINDING_INVALID")
  })
})

describe("validated atomic active pointer", () => {
  test("advances and rolls back while retaining pointer history", () => {
    const root = fixture()
    storeVersion(root, "1.0.0", { "runtime.mjs": "one" })
    storeVersion(root, "1.1.0", { "runtime.mjs": "two" })
    replaceActivePointer(root, "1.0.0")
    replaceActivePointer(root, "1.1.0")
    expect(readActivePointer(root)).toEqual({ version: "1.1.0", previous: "1.0.0" })
    expect(rollbackActivePointer(root)).toEqual({ version: "1.0.0", previous: "1.1.0" })
  })

  test("keeps the old pointer when temp write, fsync, or rename fails", () => {
    for (const failAt of ["temp", "fsync", "rename"]) {
      const root = fixture()
      storeVersion(root, "1.0.0", { "runtime.mjs": "one" })
      storeVersion(root, "1.1.0", { "runtime.mjs": "two" })
      replaceActivePointer(root, "1.0.0")
      expect(() => replaceActivePointer(root, "1.1.0", { failAt })).toThrow(`CT_POINTER_${failAt.toUpperCase()}_FAILED`)
      expect(readActivePointer(root)).toEqual({ version: "1.0.0", previous: null })
    }
  })

  test("denies V2 automation without changing the pointer", () => {
    const root = fixture()
    storeVersion(root, "1.0.0", { "runtime.mjs": "one" })
    replaceActivePointer(root, "1.0.0")
    expect(() => denyV2Only("launch-worker")).toThrow("CT_V2_ONLY")
    expect(readActivePointer(root).version).toBe("1.0.0")
  })
})
