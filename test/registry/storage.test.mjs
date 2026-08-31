import { afterEach, describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import * as nodeFs from "node:fs"
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

import * as registry from "../../registry/index.mjs"
import { git } from "../helpers/git.mjs"

const roots = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true }) })
const root = () => { const value = mkdtempSync(join(tmpdir(), "ct-registry-")); roots.push(value); return value }
const code = (operation) => { try { operation() } catch (error) { return error.code } return null }
const project = (project_id = "alpha", revision = 1) => ({
  project_id, aliases: [project_id], canonical_root: `/projects/${project_id}`,
  git_common_dir: `/projects/${project_id}/.git`, expected_remote: `git@example.invalid:${project_id}.git`,
  main_branch: "main", main_session: `${project_id}-main`, manifest_path: "openspec/plans/manifest.yaml",
  roadmap_path: "openspec/plans/master-index.md", main_store_path: `/state/${project_id}`,
  allowed_hosts: ["opencode"], registry_entry_revision: revision,
})
const document = (registry_revision, projects = [project()]) => ({ schema: "project-registry", schema_version: 1, registry_revision, projects })
const makeStore = (options = {}) => {
  const home = root()
  const registryPath = join(home, ".config/control-tower/projects.yaml")
  return { home, registryPath, store: registry.createProjectRegistryStore({ registryPath, ...options }) }
}
const residue = (path) => readdirSync(dirname(path)).filter((name) => name.includes(".tmp") || name.endsWith(".lock"))

describe("project registry path", () => {
  test("uses absolute XDG or HOME roots and is independent of cwd", () => {
    const home = root(), xdg = root()
    expect(registry.resolveProjectRegistryPath({ env: { HOME: home, XDG_CONFIG_HOME: xdg } })).toBe(join(xdg, "control-tower/projects.yaml"))
    expect(registry.resolveProjectRegistryPath({ env: { HOME: home, XDG_CONFIG_HOME: "" } })).toBe(join(home, ".config/control-tower/projects.yaml"))
  })

  test("rejects unusable roots without filesystem writes", () => {
    for (const env of [{}, { HOME: "" }, { HOME: "relative" }, { HOME: root(), XDG_CONFIG_HOME: "relative" }]) {
      expect(code(() => registry.resolveProjectRegistryPath({ env }))).toBe("CT_REGISTRY_PATH_INVALID")
    }
  })
})

describe("project registry load and validation", () => {
  test("returns null for absence without creating directories", () => {
    const { registryPath, store } = makeStore()
    expect(store.load()).toBeNull()
    expect(nodeFs.existsSync(dirname(registryPath))).toBe(false)
  })

  test("round-trips canonical bytes with owner-only modes and immutable output", () => {
    const { registryPath, store } = makeStore()
    const saved = store.save({ document: document(1), expectedRevision: 0 })
    expect(saved).toEqual(document(1))
    expect(Object.isFrozen(saved.projects[0])).toBe(true)
    expect(statSync(dirname(registryPath)).mode & 0o777).toBe(0o700)
    expect(statSync(registryPath).mode & 0o777).toBe(0o600)
    expect(store.load()).toEqual(document(1))
    expect(readFileSync(registryPath, "utf8")).toEndWith("\n")
  })

  test("rejects unsafe files and strict contract violations without replacing bytes", () => {
    const { registryPath, store } = makeStore()
    store.save({ document: document(1), expectedRevision: 0 })
    const before = readFileSync(registryPath, "utf8")
    const unknown = { ...document(2), unexpected: true }
    const duplicateIds = document(2, [project("alpha"), project("alpha")])
    const duplicateAliases = document(2, [project("alpha"), { ...project("beta"), aliases: ["alpha"] }])
    expect(code(() => store.save({ document: unknown, expectedRevision: 1 }))).toBe("CT_SCHEMA_INVALID")
    expect(code(() => store.save({ document: duplicateIds, expectedRevision: 1 }))).toBe("CT_MANIFEST_INVALID")
    expect(code(() => store.save({ document: duplicateAliases, expectedRevision: 1 }))).toBe("CT_MANIFEST_INVALID")
    expect(readFileSync(registryPath, "utf8")).toBe(before)
    nodeFs.chmodSync(registryPath, 0o644)
    expect(code(() => store.load())).toBe("CT_REGISTRY_UNSAFE")
  })

  test("rejects a symlink target", () => {
    const home = root(), target = join(home, "target"), registryPath = join(home, "config/control-tower/projects.yaml")
    mkdirSync(dirname(registryPath), { recursive: true, mode: 0o700 }); writeFileSync(target, "{}", { mode: 0o600 }); symlinkSync(target, registryPath)
    expect(code(() => registry.createProjectRegistryStore({ registryPath }).load())).toBe("CT_REGISTRY_UNSAFE")
  })
})

describe("project registry atomic revisions", () => {
  test("enforces CAS and exact registry and entry revision transitions", () => {
    const { registryPath, store } = makeStore()
    store.save({ document: document(1), expectedRevision: 0 })
    const before = readFileSync(registryPath, "utf8")
    expect(code(() => store.save({ document: document(2), expectedRevision: 0 }))).toBe("CT_CAS_MISMATCH")
    expect(code(() => store.save({ document: document(3), expectedRevision: 1 }))).toBe("CT_CAS_MISMATCH")
    expect(code(() => store.save({ document: document(2, [project("alpha", 2)]), expectedRevision: 1 }))).toBe("CT_CAS_MISMATCH")
    expect(readFileSync(registryPath, "utf8")).toBe(before)
    const changed = document(2, [{ ...project("alpha", 2), main_branch: "next" }, project("beta", 1)])
    expect(store.save({ document: changed, expectedRevision: 1 })).toEqual(changed)
    expect(residue(registryPath)).toEqual([])
  })

  test("allows exactly one winner for candidates sharing an expected revision", () => {
    const { store } = makeStore()
    store.save({ document: document(1), expectedRevision: 0 })
    const candidates = ["next", "release"].map((main_branch) => document(2, [{ ...project("alpha", 2), main_branch }]))
    const results = candidates.map((candidate) => code(() => store.save({ document: candidate, expectedRevision: 1 })) ?? "won")
    expect(results.sort()).toEqual(["CT_CAS_MISMATCH", "won"])
  })

  test("reports lock contention and removes its temporary file", () => {
    const { registryPath, store } = makeStore({ lockTimeoutMs: 0 })
    mkdirSync(dirname(registryPath), { recursive: true, mode: 0o700 }); writeFileSync(`${registryPath}.lock`, "", { mode: 0o600 })
    expect(code(() => store.save({ document: document(1), expectedRevision: 0 }))).toBe("CT_REGISTRY_BUSY")
    expect(readdirSync(dirname(registryPath)).filter((name) => name.includes(".tmp"))).toEqual([])
  })

  test("preserves prior bytes for injected pre-rename failures", () => {
    for (const failingMethod of ["writeFileSync", "fsyncSync", "renameSync"]) {
      const seeded = makeStore(); seeded.store.save({ document: document(1), expectedRevision: 0 })
      const before = readFileSync(seeded.registryPath, "utf8"), real = nodeFs[failingMethod]
      let failed = false
      const fs = { ...nodeFs, [failingMethod]: (...args) => { if (!failed) { failed = true; throw Object.assign(new Error("injected"), { code: "EIO" }) } return real(...args) } }
      const store = registry.createProjectRegistryStore({ registryPath: seeded.registryPath, fs })
      expect(code(() => store.save({ document: document(2), expectedRevision: 1 }))).toBe("CT_REGISTRY_WRITE_FAILED")
      expect(readFileSync(seeded.registryPath, "utf8")).toBe(before)
      expect(residue(seeded.registryPath)).toEqual([])
    }
  })

  test("rolls back a post-rename directory fsync failure", () => {
    const seeded = makeStore(); seeded.store.save({ document: document(1), expectedRevision: 0 })
    const before = readFileSync(seeded.registryPath, "utf8")
    let directoryFsyncs = 0
    const fs = { ...nodeFs, fsyncSync: (fd) => {
      if (nodeFs.fstatSync(fd).isDirectory() && directoryFsyncs++ === 0) throw Object.assign(new Error("injected"), { code: "EIO" })
      return nodeFs.fsyncSync(fd)
    } }
    const store = registry.createProjectRegistryStore({ registryPath: seeded.registryPath, fs })
    expect(code(() => store.save({ document: document(2), expectedRevision: 1 }))).toBe("CT_REGISTRY_WRITE_FAILED")
    expect(readFileSync(seeded.registryPath, "utf8")).toBe(before)
    expect(residue(seeded.registryPath)).toEqual([])
  })

  test("normalizes parent, temporary, lock, and installed modes under a restrictive umask", () => {
    const home = root(), registryPath = join(home, "nested/config/control-tower/projects.yaml")
    const script = `
      import { statSync } from "node:fs";
      import { createProjectRegistryStore } from ${JSON.stringify(resolve(import.meta.dir, "../../registry/store.mjs"))};
      const path = ${JSON.stringify(registryPath)};
      const document = ${JSON.stringify(document(1))};
      process.umask(0o277);
      let tempMode, lockMode;
      const store = createProjectRegistryStore({ registryPath: path, beforeCommit() {
        const names = require("node:fs").readdirSync(require("node:path").dirname(path));
        tempMode = statSync(require("node:path").join(require("node:path").dirname(path), names.find((name) => name.endsWith(".tmp")))).mode & 0o777;
        lockMode = statSync(path + ".lock").mode & 0o777;
      }});
      store.save({ document, expectedRevision: 0 });
      console.log(JSON.stringify({ parentMode: statSync(require("node:path").dirname(path)).mode & 0o777, tempMode, lockMode, fileMode: statSync(path).mode & 0o777, loaded: store.load().registry_revision }));
    `
    const child = spawnSync(process.execPath, ["-e", script], { encoding: "utf8" })
    if (child.status !== 0) throw new Error(child.stderr.trim())
    expect(child.status).toBe(0)
    expect(JSON.parse(child.stdout.trim())).toEqual({ parentMode: 0o700, tempMode: 0o600, lockMode: 0o600, fileMode: 0o600, loaded: 1 })
  })

  test("reports durability unknown when post-rename rollback also fails", () => {
    const seeded = makeStore(); seeded.store.save({ document: document(1), expectedRevision: 0 })
    let renames = 0
    const fs = { ...nodeFs,
      fsyncSync: (fd) => { if (nodeFs.fstatSync(fd).isDirectory()) throw Object.assign(new Error("injected"), { code: "EIO" }); return nodeFs.fsyncSync(fd) },
      renameSync: (...args) => { renames += 1; if (renames > 1) throw Object.assign(new Error("rollback failed"), { code: "EIO" }); return nodeFs.renameSync(...args) },
    }
    const store = registry.createProjectRegistryStore({ registryPath: seeded.registryPath, fs })
    expect(code(() => store.save({ document: document(2), expectedRevision: 1 }))).toBe("CT_REGISTRY_DURABILITY_UNKNOWN")
  })

  test("exports only the narrow surface and never touches the runtime database", () => {
    expect(Object.keys(registry).sort()).toEqual(["createProjectRegistryStore", "resolveProjectRegistryPath"])
    const repository = resolve(import.meta.dir, "../..")
    const gitCommonDirectory = git(repository, ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim()
    const runtime = join(gitCommonDirectory, "control-tower/tower.db")
    expect(nodeFs.existsSync(runtime)).toBe(true)
    const before = statSync(runtime, { bigint: true })
    const { store } = makeStore(); store.save({ document: document(1), expectedRevision: 0 }); store.load()
    const after = statSync(runtime, { bigint: true })
    expect([after.ino, after.size, after.mtimeNs, after.ctimeNs]).toEqual([before.ino, before.size, before.mtimeNs, before.ctimeNs])
  })
})
