import { test, expect } from "bun:test"
import { Database } from "bun:sqlite"
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { mkdtempSync } from "node:fs"

const sourceRoot = resolve(import.meta.dir, "..")
const git = (cwd, ...args) => {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" })
  expect(result.status).toBe(0)
  return result.stdout.trim()
}

// All state, including the executable, lives in a disposable repository outside Main.
test("compiled semaphore runs without Bun and preserves the shared tower_* contract", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "tower-semaphore-"))
  const main = join(sandbox, "Main")
  const worker = join(sandbox, "worker")
  const binary = join(sandbox, "torre-semaphore")
  mkdirSync(main)
  git(main, "init", "-b", "master")
  git(main, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-m", "fixture")
  git(main, "worktree", "add", "-b", "worker", worker)

  const built = spawnSync(process.execPath, [join(sourceRoot, "scripts/build-semaphore.mjs"), binary], { cwd: sourceRoot, encoding: "utf8" })
  expect(built.status).toBe(0)
  expect(existsSync(binary)).toBe(true)
  expect(readFileSync(binary).includes(Buffer.from("ct_continuation_state"))).toBe(false)
  const expectedRevision = git(sourceRoot, "rev-parse", "HEAD")
  const env = { ...process.env, PATH: "/usr/bin:/bin" }
  const run = (cwd, operation, args = {}) => {
    const result = spawnSync(binary, [], { cwd, env, input: JSON.stringify({ operation, args }), encoding: "utf8" })
    expect(result.status).toBe(0)
    return JSON.parse(result.stdout)
  }

  const version = run(main, "version")
  expect(version).toEqual({ version: "1", sourceRevision: expectedRevision })
  expect(run(main, "tower_status").result).toMatchObject({ active: false, you: "Main", agents: [], locks: [] })
  expect(existsSync(join(main, ".git/control-tower/tower.db"))).toBe(false)

  const towerRoot = join(main, ".git/control-tower")
  mkdirSync(towerRoot)
  writeFileSync(join(towerRoot, "ACTIVE"), "")
  expect(run(main, "tower_register", { role: "orchestrator" }).result.agents).toHaveLength(1)
  expect(run(worker, "tower_register", { role: "agent" }).result.agents).toHaveLength(2)
  expect(run(worker, "tower_set_state", { state: "WORKING", task: "fixture" }).result.agents.find((agent) => agent.name === "worker").state).toBe("WORKING")
  expect(run(main, "tower_send", { to: "missing", text: "lost" }).error.code).toBe("CT_SEMAPHORE_OPERATION_FAILED")
  expect(run(main, "tower_send", { to: "worker", text: "handoff" }).result).toEqual({ queued_for: "worker" })
  expect(run(worker, "tower_status").result.agents.find((agent) => agent.name === "worker").pending).toBe(1)
  expect(run(worker, "tower_receive").result).toMatchObject({ sender: "Main", text: "handoff" })
  expect(run(worker, "tower_receive").result).toEqual({ message: null })

  expect(run(main, "tower_acquire", { lock: "git-delivery" }).result).toEqual({ granted: true, holder: "Main" })
  expect(run(main, "tower_transfer", { lock: "git-delivery", to: "missing" }).result).toEqual({ transferred: false, reason: '"missing" is not registered' })
  expect(run(worker, "tower_acquire", { lock: "git-delivery" }).result).toEqual({ granted: false, holder: "Main" })
  expect(run(main, "tower_transfer", { lock: "git-delivery", to: "worker" }).result).toEqual({ transferred: true, holder: "worker" })
  expect(run(main, "tower_release", { lock: "git-delivery" }).result).toEqual({ released: false, reason: "held by worker" })
  expect(run(worker, "tower_release", { lock: "git-delivery" }).result).toEqual({ released: true })
  expect(run(main, "tower_status").result).toMatchObject({ active: true, locks: [], agents: [{ name: "Main" }, { name: "worker" }] })
  expect(readFileSync(join(towerRoot, "ACTIVE"), "utf8")).toBe("")
  expect(existsSync(join(towerRoot, "tower.db"))).toBe(true)
  const db = new Database(join(towerRoot, "tower.db"), { readonly: true })
  try {
    expect(db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({ name }) => name)).toEqual(["agent", "lock", "message"])
  } finally {
    db.close()
  }

  const unsupported = run(main, "continuation", { operation: "status" })
  expect(unsupported.error).toMatchObject({ code: "CT_CONTINUATION_UNSUPPORTED" })
  expect(unsupported.result).toBeUndefined()
  expect(run(main, "tower_status").result.agents).toHaveLength(2)
})
