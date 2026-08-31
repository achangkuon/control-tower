import { afterEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { createHash } from "node:crypto"
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { createSupportBrief } from "../../support/agent.mjs"
import { resolveSupportManifest } from "../../support/manifest.mjs"
import { captureSupportSnapshot } from "../../support/snapshot.mjs"
import { git as runGit } from "../helpers/git.mjs"

const roots = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true }) })
const temporaryRoot = () => { const root = mkdtempSync(join(tmpdir(), "ct-support-")); roots.push(root); return root }
const git = (cwd, args) => runGit(cwd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
const errorCode = (operation) => { try { operation() } catch (error) { return error.code } return null }
const witness = (path) => {
  try {
    const stats = lstatSync(path, { bigint: true })
    return { exists: true, bytes: stats.isFile() ? readFileSync(path).toString("hex") : null, mode: stats.mode, ino: stats.ino,
      size: stats.size, mtimeNs: stats.mtimeNs, ctimeNs: stats.ctimeNs }
  } catch (error) { if (error.code === "ENOENT") return { exists: false }; throw error }
}

const fixture = ({ database = true } = {}) => {
  const root = temporaryRoot(), project = join(root, "alpha"), plans = join(project, "openspec", "plans")
  const registryPath = join(root, "projects.yaml"), roadmap = join(plans, "master-index.md")
  const manifestPath = join(plans, "manifest.yaml"), status2 = join(plans, "plan-2", "STATUS.md"), status10 = join(plans, "plan-10", "STATUS.md")
  const gitDir = join(project, ".git"), dbPath = join(gitDir, "control-tower", "tower.db")
  mkdirSync(dirname(status2), { recursive: true }); mkdirSync(dirname(status10), { recursive: true }); mkdirSync(dirname(dbPath), { recursive: true })
  writeFileSync(registryPath, "registry-v1\n", { mode: 0o600 }); writeFileSync(manifestPath, "schema: plan-manifest\n")
  writeFileSync(roadmap, "| Plan | Ref |\n|---|---|\n| P10 | [STATUS](plan-10/STATUS.md) |\n| P2 | [STATUS](plan-2/STATUS.md) |\n")
  writeFileSync(status2, "# Plan 2\n\n| ID | Estado |\n|---|---|\n| S2.1 | ✅ COMPLETO |\n")
  writeFileSync(status10, "# Plan 10\n\n| ID | Estado |\n|---|---|\n| S10.1 | 🔵 EN CURSO |\n")
  git(project, ["init", "-q", "-b", "master"]); git(project, ["config", "user.email", "support@example.invalid"]); git(project, ["config", "user.name", "Support Test"])
  git(project, ["add", "."]); git(project, ["commit", "-qm", "fixture"])
  if (database) {
    const db = new Database(dbPath)
    db.exec("CREATE TABLE agent(name TEXT PRIMARY KEY, role TEXT NOT NULL, worktree TEXT NOT NULL, branch TEXT, state TEXT NOT NULL, task TEXT, note TEXT, pr_url TEXT, updated_at TEXT NOT NULL); CREATE TABLE lock(name TEXT PRIMARY KEY, holder TEXT, acquired_at TEXT); INSERT INTO agent VALUES ('main','orchestrator','/alpha/Main','master','WORKING','S2.1',NULL,NULL,'2026-01-01T00:00:00Z'); INSERT INTO lock VALUES ('git-delivery',NULL,NULL),('db-writer',NULL,NULL)")
    db.close()
  }
  const entry = { project_id: "alpha", canonical_root: project, git_common_dir: gitDir,
    manifest_path: "openspec/plans/manifest.yaml", roadmap_path: "openspec/plans/master-index.md", registry_entry_revision: 1 }
  const registry = { schema: "project-registry", schema_version: 1, registry_revision: 1, projects: [entry] }
  const calls = []
  const ports = {
    loadRegistry() { calls.push("loadRegistry"); return registry },
    readText(path) { calls.push(["readText", path]); return readFileSync(path, "utf8") },
    inspectGit(path) { calls.push(["inspectGit", path]); return { head: git(path, ["rev-parse", "HEAD"]),
      porcelain: git(path, ["status", "--porcelain=v1"]), worktrees: git(path, ["worktree", "list", "--porcelain"]) } },
    openDatabase(path, options) { calls.push(["openDatabase", path, options]); return new Database(path, options) },
  }
  const tracked = [registryPath, dbPath, `${dbPath}-wal`, `${dbPath}-shm`, manifestPath, roadmap, status2, status10]
  return { root, project, registryPath, roadmap, manifestPath, status2, status10, dbPath, entry, registry, ports, calls, tracked }
}

const request = (overrides = {}) => ({ schema: "support-request", schema_version: 1, project_id: "alpha", report_type: "decomposition", ...overrides })
const databaseState = (path) => {
  if (!witness(path).exists) return null
  const db = new Database(path, { readonly: true, create: false })
  try { return { agents: db.query("SELECT * FROM agent ORDER BY name").all(), locks: db.query("SELECT * FROM lock ORDER BY name").all() } }
  finally { db.close() }
}
const fullWitness = (value) => ({ files: value.tracked.map((path) => [path, witness(path)]),
  git: git(value.project, ["status", "--porcelain=v1"]), worktrees: git(value.project, ["worktree", "list", "--porcelain"]),
  database: databaseState(value.dbPath) })
const rejectWithoutMutation = (value, operation, code) => {
  const before = fullWitness(value)
  expect(errorCode(operation)).toBe(code)
  expect(fullWitness(value)).toEqual(before)
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex")

describe("read-only Support brief", () => {
  test("resolves roadmap Ref links numerically and returns the exact deterministic schema", () => {
    const value = fixture()
    const before = fullWitness(value)
    const result = createSupportBrief(request(), value.ports)
    expect(Object.keys(result)).toEqual(["schema", "schema_version", "project_id", "registry_entry_revision", "report_type", "sources", "observations"])
    expect(result).toMatchObject({ schema: "support-brief", schema_version: 1, project_id: "alpha", registry_entry_revision: 1, report_type: "decomposition" })
    expect(result.sources.map(({ path }) => path)).toEqual([...result.sources.map(({ path }) => path)].sort())
    expect(result.sources.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256))).toBe(true)
    expect(result.observations.length).toBeGreaterThan(1)
    expect(result.observations).toEqual([...result.observations].sort((a, b) => a.code.localeCompare(b.code) || a.subject.localeCompare(b.subject)))
    expect(value.calls.find((call) => Array.isArray(call) && call[0] === "openDatabase").slice(1)).toEqual([value.dbPath, { readonly: true, create: false }])
    expect(fullWitness(value)).toEqual(before)
  })

  test.each(["decomposition", "conflict", "capacity"])("produces source-traceable %s observations", (report_type) => {
    const value = fixture(), result = createSupportBrief(request({ report_type }), value.ports)
    expect(result.report_type).toBe(report_type)
    expect(result.observations.length).toBeGreaterThan(0)
    expect(result.observations.every((item) => Object.keys(item).join(",") === "code,subject,detail")).toBe(true)
  })

  test("rejects V2 requests before invoking any port", () => {
    const value = fixture(), before = fullWitness(value), calls = [], ports = new Proxy({}, { ownKeys: () => ["loadRegistry", "readText", "inspectGit", "openDatabase"],
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }), get: () => () => calls.push("called") })
    expect(errorCode(() => createSupportBrief({ ...request(), create_workers: true }, ports))).toBe("CT_V2_ONLY")
    expect(calls).toEqual([])
    expect(fullWitness(value)).toEqual(before)
  })

  test("captures every text source once and hashes the same immutable values used for observations", () => {
    const value = fixture(), reads = new Map(), original = value.ports.readText
    value.ports.readText = (path) => { reads.set(path, (reads.get(path) ?? 0) + 1); return original(path) }
    const result = createSupportBrief(request(), value.ports)
    expect([...reads.entries()].sort()).toEqual([
      [value.manifestPath, 1], [value.roadmap, 1], [value.status10, 1], [value.status2, 1],
    ].sort())
    for (const path of [value.manifestPath, value.roadmap, value.status2, value.status10])
      expect(result.sources.find((source) => source.path === path)?.sha256).toBe(sha256(readFileSync(path, "utf8")))
  })

  test("hashes DB evidence from the exact fixed-query transaction used for observations", () => {
    const value = fixture(), result = createSupportBrief(request({ report_type: "capacity" }), value.ports)
    const schema = [
      { type: "table", name: "agent", tbl_name: "agent", sql: "CREATE TABLE agent(name TEXT PRIMARY KEY, role TEXT NOT NULL, worktree TEXT NOT NULL, branch TEXT, state TEXT NOT NULL, task TEXT, note TEXT, pr_url TEXT, updated_at TEXT NOT NULL)" },
      { type: "table", name: "lock", tbl_name: "lock", sql: "CREATE TABLE lock(name TEXT PRIMARY KEY, holder TEXT, acquired_at TEXT)" },
    ]
    const evidence = { schema, agents: databaseState(value.dbPath).agents, locks: databaseState(value.dbPath).locks }
    expect(result.sources.find(({ path }) => path === value.dbPath)?.sha256).toBe(sha256(JSON.stringify(evidence)))
  })

  test("rejects schema, identity, and ports with full mutation witnesses", () => {
    const value = fixture()
    rejectWithoutMutation(value, () => createSupportBrief({ ...request(), extra: true }, value.ports), "CT_SUPPORT_REQUEST_INVALID")
    rejectWithoutMutation(value, () => createSupportBrief(request({ project_id: "missing" }), value.ports), "CT_SUPPORT_PROJECT_INVALID")
    rejectWithoutMutation(value, () => createSupportBrief(request(), { ...value.ports, writeText() {} }), "CT_SUPPORT_PORTS_INVALID")
  })

  test.each([
    ["duplicate exact links", (v) => writeFileSync(v.roadmap, "| Plan | Ref |\n|---|---|\n| P2 | [STATUS](plan-2/STATUS.md) [STATUS](plan-2/STATUS.md) |\n")],
    ["normalized duplicate IDs", (v) => writeFileSync(v.roadmap, "| Plan | Ref |\n|---|---|\n| P02 | [STATUS](plan-2/STATUS.md) |\n| P2 | [STATUS](plan-2/STATUS.md) |\n")],
    ["multiple Ref tables", (v) => writeFileSync(v.roadmap, "| Plan | Ref |\n|---|---|\n| P2 | [STATUS](plan-2/STATUS.md) |\n\n| Plan | Ref |\n|---|---|\n| P10 | [STATUS](plan-10/STATUS.md) |\n")],
    ["subsequent unrelated Ref table", (v) => writeFileSync(v.roadmap, "| Plan | Ref |\n|---|---|\n| P2 | [STATUS](plan-2/STATUS.md) |\n\ntext\n\n| Other | Ref |\n|---|---|\n| note | [STATUS](plan-10/STATUS.md) |\n")],
    ["malformed target", (v) => writeFileSync(v.roadmap, "| Plan | Ref |\n|---|---|\n| P2 | [STATUS](plan-02/STATUS.md) |\n")],
    ["escaping target", (v) => writeFileSync(v.roadmap, "| Plan | Ref |\n|---|---|\n| P2 | [STATUS](../../STATUS.md) |\n")],
    ["missing source", (v) => rmSync(v.status2)],
    ["non-regular source", (v) => { rmSync(v.status2); mkdirSync(v.status2) }],
    ["symlink component", (v) => { const target = join(v.root, "outside"); mkdirSync(target); writeFileSync(join(target, "STATUS.md"), "# outside\n"); rmSync(dirname(v.status2), { recursive: true }); symlinkSync(target, dirname(v.status2)) }],
  ])("rejects %s and preserves every mutation witness", (_name, corrupt) => {
    const value = fixture(); corrupt(value)
    rejectWithoutMutation(value, () => resolveSupportManifest(value.entry, value.ports), "CT_SUPPORT_ROADMAP_INVALID")
  })

  test.each([
    ["altered constraints", "ALTER TABLE agent ADD COLUMN surprise TEXT"],
    ["unknown incompatible table", "CREATE TABLE surprise(value TEXT)"],
  ])("rejects %s DB schema before observations with full witnesses", (_name, sql) => {
    const value = fixture(), db = new Database(value.dbPath); db.exec(sql); db.close()
    rejectWithoutMutation(value, () => createSupportBrief(request(), value.ports), "CT_SUPPORT_DB_SCHEMA_INVALID")
  })

  test("an absent database creates no DB, WAL, or SHM", () => {
    const value = fixture({ database: false })
    rejectWithoutMutation(value, () => createSupportBrief(request({ report_type: "capacity" }), value.ports), "CT_SUPPORT_DB_UNAVAILABLE")
  })

  test("exposes only the three contracted module exports", async () => {
    expect(Object.keys(await import("../../support/agent.mjs"))).toEqual(["createSupportBrief"])
    expect(Object.keys(await import("../../support/manifest.mjs"))).toEqual(["resolveSupportManifest"])
    expect(Object.keys(await import("../../support/snapshot.mjs"))).toEqual(["captureSupportSnapshot"])
  })

  test("snapshot refuses a database that cannot prove query_only is active", () => {
    const value = fixture(), manifest = resolveSupportManifest(value.entry, value.ports)
    const ports = { ...value.ports, openDatabase: () => ({ exec() {}, query: () => ({ get: () => ({ query_only: 0 }) }), close() {} }) }
    rejectWithoutMutation(value, () => captureSupportSnapshot(manifest, ports), "CT_SUPPORT_DB_READONLY_REQUIRED")
  })
})
