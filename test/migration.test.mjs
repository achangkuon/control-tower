import { afterEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { execFileSync } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import {
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import * as tower from "../core.mjs"
import {
  restoreFrozenSnapshot,
  snapshotRuntimeBoundary,
  verifyTrackedEntry,
} from "./helpers/restore-fixture.mjs"

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const torrePath = join(packageRoot, "bin", "torre")
const installPath = join(packageRoot, "install.sh")
const evidencePath = join(
  packageRoot,
  "openspec",
  "changes",
  "autonomous-continuation-control-tower",
  "evidence",
  "p0-baseline-freeze.md",
)
const temporaryDirectories = []
const git = (repository, args) =>
  execFileSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
const expectedTrackedPaths = [
  ".gitignore",
  "bin/torre",
  "core.mjs",
  "core.mjs.bak.20260721-161315",
  "install.sh",
  "mcp.mjs",
  "plugin/tower-spike.js",
  "README.md",
  "ROADMAP.md",
  "test/fail-closed.test.mjs",
  "test/fixtures/paused-send.mjs",
  "validate-compact-message.py",
]
const actualRuntimeRoot = join(packageRoot, ".git", "control-tower")
const actualActivePath = join(actualRuntimeRoot, "ACTIVE")
const expectedAbsentRuntimeBoundary = [{ path: ".git/control-tower", exists: false }]
const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
}
const digest = (value) =>
  `sha256:${createHash("sha256").update(Buffer.from(value)).digest("hex")}`
const errorCode = (operation) => {
  try {
    operation()
  } catch (error) {
    return error.code
  }
  return null
}
const createMainFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "control-tower-main-"))
  const main = join(root, "main")
  const linked = join(root, "linked")
  temporaryDirectories.push(root)
  mkdirSync(main)
  git(main, ["init", "-q", "-b", "main"])
  git(main, ["config", "user.email", "tower-test@example.invalid"])
  git(main, ["config", "user.name", "Tower Test"])
  git(main, ["commit", "-q", "--allow-empty", "-m", "initial"])
  git(main, ["worktree", "add", "-q", "-b", "linked", linked])
  return { root, main, linked }
}
const seedLegacy = (main) => {
  const runtime = join(main, ".git", "control-tower")
  mkdirSync(runtime, { recursive: true, mode: 0o700 })
  const db = new Database(join(runtime, "tower.db"))
  db.run(`CREATE TABLE agent (name TEXT PRIMARY KEY, role TEXT NOT NULL, worktree TEXT NOT NULL, branch TEXT, state TEXT NOT NULL, task TEXT, note TEXT, pr_url TEXT, updated_at TEXT NOT NULL);
CREATE TABLE message (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT NOT NULL, sender TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL, consumed_at TEXT);
CREATE INDEX message_pending ON message (recipient, id) WHERE consumed_at IS NULL;
CREATE TABLE lock (name TEXT PRIMARY KEY, holder TEXT, acquired_at TEXT);`)
  db.run("INSERT INTO agent VALUES ('legacy','agent','/tmp/legacy','legacy','READY',NULL,NULL,NULL,'before')")
  db.close()
}
const runConcurrentBootstraps = async (root, main, requests) => {
  const runner = join(root, "concurrent-bootstrap.mjs")
  writeFileSync(runner, `import { Database } from "bun:sqlite"
import { existsSync, writeFileSync } from "node:fs"

const options = JSON.parse(Bun.argv.at(-1))
const transaction = Database.prototype.transaction
Database.prototype.transaction = function (callback) {
  const operation = transaction.call(this, callback)
  return {
    immediate(...args) {
      writeFileSync(options.ready, "")
      while (!existsSync(options.release)) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5)
      }
      return operation.immediate(...args)
    },
  }
}
const tower = await import(options.core)
try {
  console.log(JSON.stringify({ value: tower.bootstrapAdmin(options.request, options.main) }))
} catch (error) {
  console.log(JSON.stringify({ code: error.code }))
}
`)
  const children = requests.map((request, index) => {
    const ready = join(root, `bootstrap-ready-${index}`)
    const release = join(root, `release-bootstrap-${index}`)
    const child = Bun.spawn([
      process.execPath,
      runner,
      JSON.stringify({
        core: new URL("../core.mjs", import.meta.url).href,
        main,
        ready,
        release,
        request,
      }),
    ], { stdout: "pipe", stderr: "pipe" })
    return { child, ready, release }
  })
  const deadline = Date.now() + 5000
  while (children.some(({ ready }) => !existsSync(ready))) {
    if (Date.now() >= deadline) throw new Error("concurrent bootstraps did not reach the writer transaction")
    await Bun.sleep(5)
  }
  const results = []
  for (const { child, release } of children) {
    writeFileSync(release, "")
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    results.push(JSON.parse(stdout.trim()))
  }
  return results
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe("P1 owner-provisioned anchor and Migration 001", () => {
  test("CT-R8-S3 derives one Main and provisions exact owner-only authority", () => {
    const { root, main, linked } = createMainFixture()
    const absolute = tower.deriveCanonicalMainContext(main)
    const relative = tower.deriveCanonicalMainContext(join(root, "main", "..", "main"))
    const fromLinked = tower.deriveCanonicalMainContext(linked)
    const configDigest = digest(canonical(absolute))
    const marker = join(root, "executed")
    for (const name of ["requirements.txt", "CMakeLists.txt", "guide.mdx", "README.sh"]) {
      writeFileSync(join(main, name), `#!/bin/sh\ntouch ${marker}\n`, { mode: 0o755 })
    }

    expect(relative).toEqual(absolute)
    expect(fromLinked).toEqual(absolute)
    expect(absolute).toMatchObject({ canonical_repo: main, main_worktree: main, branch: "main" })
    const request_identity = randomUUID()
    const created = tower.provisionMainAuthorityAnchor(
      { request_identity, expected_config_digest: configDigest },
      linked,
    )
    const anchorPath = join(absolute.git_common_dir, "control-tower", "main_authority_anchor_v1.json")
    const stats = lstatSync(anchorPath)
    const anchor = JSON.parse(readFileSync(anchorPath, "utf8"))

    expect(created).toEqual({ anchor_id: anchor.anchor_id, anchor_epoch: 1, state: "PROVISIONED", replayed: false })
    expect(stats.mode & 0o777).toBe(0o600)
    expect(stats.nlink).toBe(1)
    expect(anchor).toMatchObject({ kind: "main_authority_anchor_v1", version: 1, context: absolute, config_digest: configDigest })
    expect(created.anchor_secret).toBeUndefined()
    expect(existsSync(marker)).toBe(false)
    expect(tower.provisionMainAuthorityAnchor({ request_identity, expected_config_digest: configDigest }, main)).toEqual({ ...created, replayed: true })
    expect(errorCode(() => tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: configDigest }, main))).toBe("CT_ANCHOR_MISMATCH")
  })

  test("provisioning enforces exact owner-only modes under a restrictive umask", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const request = {
      request_identity: randomUUID(),
      expected_config_digest: digest(canonical(context)),
    }
    const previousUmask = process.umask(0o777)

    try {
      expect(tower.provisionMainAuthorityAnchor(request, main)).toMatchObject({
        state: "PROVISIONED",
        replayed: false,
      })
    } finally {
      process.umask(previousUmask)
    }

    const runtime = join(context.git_common_dir, "control-tower")
    const anchor = join(runtime, "main_authority_anchor_v1.json")
    expect(lstatSync(runtime).mode & 0o777).toBe(0o700)
    expect(lstatSync(anchor).mode & 0o777).toBe(0o600)
    expect(lstatSync(anchor).nlink).toBe(1)
  })

  test("CT-R8-S1 migrates exact bytes once, replays, fences CAS, and preserves legacy", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const configDigest = digest(canonical(context))
    const anchor = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: configDigest }, main)
    seedLegacy(main)
    const request = { request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }
    expect(errorCode(() => tower.bootstrapAdmin({ ...request, expected_anchor_id: "wrong" }, main))).toBe("CT_FENCE_MISMATCH")
    const first = tower.bootstrapAdmin(request, main)
    const db = new Database(join(context.git_common_dir, "control-tower", "tower.db"))

    expect(tower.MIGRATION_001_SQL).toHaveLength(852)
    expect(tower.MIGRATION_001_CHECKSUM).toBe("sha256:47f63b10e516ac977e1cc26723b064eb037a4a2cdb84246b1c183903b909eb41")
    expect(first).toEqual({ anchor_id: anchor.anchor_id, schema_version: 1, mode: "OFF", replayed: false })
    expect(db.query("SELECT name FROM sqlite_master WHERE name GLOB 'ct_*' ORDER BY name").all()).toEqual([
      { name: "ct_continuation_state" }, { name: "ct_idempotency" }, { name: "ct_schema_migration" },
    ])
    expect(db.query("SELECT name,state FROM agent").get()).toEqual({ name: "legacy", state: "READY" })
    db.close()
    expect(tower.bootstrapAdmin(request, main)).toEqual({ ...first, replayed: true })
    expect(errorCode(() => tower.bootstrapAdmin({ ...request, request_identity: randomUUID(), expected_schema_version: 1 }, main))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const drifted = new Database(join(context.git_common_dir, "control-tower", "tower.db"))
    drifted.run("UPDATE ct_continuation_state SET mode='ON' WHERE id=1")
    drifted.close()
    expect(errorCode(() => tower.bootstrapAdmin(request, main))).toBe("CT_FENCE_MISMATCH")
  })

  test("simultaneous identical bootstraps commit once and replay once", async () => {
    const { root, main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }

    const results = await runConcurrentBootstraps(root, main, [request, request])

    expect(results.map(({ code }) => code)).toEqual([undefined, undefined])
    expect(results.map(({ value }) => value?.replayed).sort()).toEqual([false, true])
    const db = new Database(join(context.git_common_dir, "control-tower", "tower.db"), { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_schema_migration").get()).toEqual({ count: 1 })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_idempotency").get()).toEqual({ count: 1 })
    db.close()
  })

  test("a changed concurrent bootstrap conflicts without partial state", async () => {
    const { root, main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }
    const changed = { ...request, request_identity: randomUUID(), expected_schema_version: 1 }

    const results = await runConcurrentBootstraps(root, main, [request, changed])

    expect(results).toEqual([
      { value: { anchor_id: provisioned.anchor_id, schema_version: 1, mode: "OFF", replayed: false } },
      { code: "CT_IDEMPOTENCY_CONFLICT" },
    ])
    const db = new Database(join(context.git_common_dir, "control-tower", "tower.db"), { readonly: true })
    expect(db.query("SELECT version FROM ct_schema_migration").all()).toEqual([{ version: 1 }])
    expect(db.query("SELECT request_identity FROM ct_idempotency").all()).toEqual([{ request_identity: request.request_identity }])
    expect(db.query("SELECT schema_version,mode FROM ct_continuation_state").all()).toEqual([{ schema_version: 1, mode: "OFF" }])
    expect(db.query("SELECT name,state FROM agent").all()).toEqual([{ name: "legacy", state: "READY" }])
    db.close()
  })

  test("legacy object drift is rejected before additive DDL", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const dbPath = join(context.git_common_dir, "control-tower", "tower.db")
    const drifted = new Database(dbPath)
    drifted.run("ALTER TABLE agent ADD COLUMN drift TEXT")
    drifted.close()
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }

    expect(errorCode(() => tower.bootstrapAdmin(request, main))).toBe("CT_SCHEMA_INVALID")

    const after = new Database(dbPath)
    expect(after.query("SELECT name FROM sqlite_master WHERE name GLOB 'ct_*'").all()).toEqual([])
    expect(after.query("SELECT state FROM agent WHERE name='legacy'").get()).toEqual({ state: "READY" })
    after.close()
  })

  test("provision/bootstrap stay CLI-only and install delegates only when explicit", () => {
    const { root, main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const configDigest = digest(canonical(context))
    const requestIdentity = randomUUID()
    const env = { ...process.env, HOME: root, CONTROL_TOWER_CORE: join(packageRoot, "core.mjs"), OPENCODE_CONFIG_DIR: join(root, "missing") }
    const provisioned = JSON.parse(execFileSync("bash", [installPath, "--provision-main", "--repo", main, "--request-identity", requestIdentity, "--expected-config-digest", configDigest], { encoding: "utf8", env }))
    seedLegacy(main)
    const bootstrapped = JSON.parse(execFileSync("bash", [torrePath, "bootstrap-admin", "--repo", main, "--request-identity", randomUUID(), "--expected-anchor-id", provisioned.anchor_id, "--expected-schema-version", "0", "--target-schema-version", "1", "--expected-mode", "OFF"], { encoding: "utf8", env }))

    expect(provisioned).toMatchObject({ state: "PROVISIONED", replayed: false })
    expect(bootstrapped).toEqual({ anchor_id: provisioned.anchor_id, schema_version: 1, mode: "OFF", replayed: false })
    expect(readFileSync(join(root, "main", ".git", "control-tower", "main_authority_anchor_v1.json"), "utf8")).not.toContain("role")
  })

  test("unsafe type, link, owner, and mode predicates fail closed", () => {
    const uid = process.geteuid()
    expect(tower.isSafeAnchorEntry({ type: "file", uid: uid + 1, mode: 0o600, nlink: 1 }, { type: "file", uid, mode: 0o600, singleLink: true })).toBe(false)
    for (const unsafe of [
      (path) => chmodSync(path, 0o644),
      (path) => { const copy = `${path}.link`; linkSync(path, copy) },
      (path) => { rmSync(path); symlinkSync("missing", path) },
    ]) {
      const { main } = createMainFixture()
      const context = tower.deriveCanonicalMainContext(main)
      const request = { request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }
      tower.provisionMainAuthorityAnchor(request, main)
      const path = join(context.git_common_dir, "control-tower", "main_authority_anchor_v1.json")
      unsafe(path)
      expect(errorCode(() => tower.provisionMainAuthorityAnchor(request, main))).toBe("CT_ANCHOR_MISMATCH")
    }
  })

  test("unsafe runtime directory type, symlink, and mode are non-mutating", () => {
    for (const arrange of [
      (root) => mkdirSync(root, { mode: 0o755 }),
      (root) => writeFileSync(root, "not a directory\n"),
      (root) => {
        const target = `${root}-target`
        mkdirSync(target, { mode: 0o700 })
        symlinkSync(target, root)
      },
    ]) {
      const { main } = createMainFixture()
      const context = tower.deriveCanonicalMainContext(main)
      const runtime = join(context.git_common_dir, "control-tower")
      arrange(runtime)
      const request = { request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }

      expect(errorCode(() => tower.provisionMainAuthorityAnchor(request, main))).toBe("CT_ANCHOR_MISMATCH")
      const anchorPath = join(runtime, "main_authority_anchor_v1.json")
      expect(existsSync(anchorPath)).toBe(false)
    }
  })

  test("canonical anchors reject padded secrets and malformed creation timestamps", () => {
    for (const mutate of [
      (anchor) => { anchor.anchor_secret = `${anchor.anchor_secret}=` },
      (anchor) => { anchor.created_at = "2026-07-22T00:00:00Z" },
    ]) {
      const { main } = createMainFixture()
      const context = tower.deriveCanonicalMainContext(main)
      const request = { request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }
      tower.provisionMainAuthorityAnchor(request, main)
      const anchorPath = join(context.git_common_dir, "control-tower", "main_authority_anchor_v1.json")
      const anchor = JSON.parse(readFileSync(anchorPath, "utf8"))
      mutate(anchor)
      writeFileSync(anchorPath, `${canonical(anchor)}\n`)

      expect(errorCode(() => tower.provisionMainAuthorityAnchor(request, main))).toBe("CT_ANCHOR_MISMATCH")
    }
  })

  test("DDL failure rolls back every Slice 1 object and preserves legacy bytes", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const dbPath = join(context.git_common_dir, "control-tower", "tower.db")
    const before = new Database(dbPath)
    const legacyBefore = before.query("SELECT * FROM agent WHERE name='legacy'").get()
    before.close()
    const originalMode = lstatSync(dbPath).mode & 0o777
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }

    chmodSync(dbPath, 0o400)
    try {
      expect(errorCode(() => tower.bootstrapAdmin(request, main))).toBe("CT_SCHEMA_INVALID")
    } finally {
      chmodSync(dbPath, originalMode)
    }

    const after = new Database(dbPath)
    expect(after.query("SELECT name FROM sqlite_master WHERE name GLOB 'ct_*'").all()).toEqual([])
    expect(after.query("SELECT * FROM agent WHERE name='legacy'").get()).toEqual(legacyBefore)
    after.close()
  })

  test("a bounded busy writer leaves Migration 001 replayable", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const dbPath = join(context.git_common_dir, "control-tower", "tower.db")
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }
    const locker = new Database(dbPath)
    locker.run("BEGIN IMMEDIATE")
    const started = Date.now()
    expect(errorCode(() => tower.bootstrapAdmin(request, main))).toBe("CT_BUSY")
    const elapsed = Date.now() - started
    expect(elapsed).toBeGreaterThanOrEqual(200)
    expect(elapsed).toBeLessThan(1500)
    locker.run("ROLLBACK"); locker.close()
    expect(tower.bootstrapAdmin(request, main)).toMatchObject({ schema_version: 1, mode: "OFF" })
  })

  test("CT-R8-S4 missing anchor and schema drift fail without provisioning or partial DDL", () => {
    const { main } = createMainFixture()
    expect(errorCode(() => tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: "missing", expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }, main))).toBe("CT_ANCHOR_REQUIRED")
    expect(existsSync(join(main, ".git", "control-tower"))).toBe(false)

    const context = tower.deriveCanonicalMainContext(main)
    const configDigest = digest(canonical(context))
    tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: configDigest }, main)
    seedLegacy(main)
    const dbPath = join(context.git_common_dir, "control-tower", "tower.db")
    const db = new Database(dbPath)
    db.run("CREATE TABLE ct_drift (id INTEGER)")
    db.close()
    expect(errorCode(() => tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: "unused", expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }, main))).toBe("CT_SCHEMA_INVALID")
    const after = new Database(dbPath)
    expect(after.query("SELECT name FROM sqlite_master WHERE name IN ('ct_schema_migration','ct_continuation_state','ct_idempotency')").all()).toEqual([])
    expect(after.query("SELECT state FROM agent WHERE name='legacy'").get()).toEqual({ state: "READY" })
    after.close()
  })
})

describe("P0 frozen snapshot restore", () => {
  test("recursively manifests unknown nested runtime entries and full special modes", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-runtime-manifest-"))
    temporaryDirectories.push(repository)
    git(repository, ["init", "-q"])
    const nestedDirectory = join(repository, ".git", "control-tower", "unknown", "nested")
    const nestedFile = join(nestedDirectory, "state.bin")
    mkdirSync(nestedDirectory, { recursive: true })
    writeFileSync(nestedFile, "runtime state\n", { mode: 0o644 })
    execFileSync("chmod", ["4644", nestedFile])

    const manifest = snapshotRuntimeBoundary(repository)

    expect(manifest.map(({ path }) => path)).toEqual([
      ".git/control-tower",
      ".git/control-tower/unknown",
      ".git/control-tower/unknown/nested",
      ".git/control-tower/unknown/nested/state.bin",
    ])
    expect(manifest.at(-1)).toMatchObject({ kind: "file", mode: 0o104644 })
  })

  test("fails closed when the runtime ACTIVE marker is present", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-runtime-active-"))
    temporaryDirectories.push(repository)
    git(repository, ["init", "-q"])
    const runtimeRoot = join(repository, ".git", "control-tower")
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(join(runtimeRoot, "ACTIVE"), "")

    expect(() => snapshotRuntimeBoundary(repository)).toThrow(
      "Control Tower must be OFF: .git/control-tower/ACTIVE is present",
    )
  })

  test("selects the shared Git common-directory runtime from a linked worktree", () => {
    const root = mkdtempSync(join(tmpdir(), "control-tower-linked-runtime-"))
    const main = join(root, "main")
    const linked = join(root, "linked")
    temporaryDirectories.push(root)
    mkdirSync(main)
    git(main, ["init", "-q", "-b", "main"])
    git(main, ["config", "user.email", "tower-test@example.invalid"])
    git(main, ["config", "user.name", "Tower Test"])
    git(main, ["commit", "-q", "--allow-empty", "-m", "initial"])
    git(main, ["worktree", "add", "-q", "-b", "linked", linked])
    const sharedRuntimeRoot = join(main, ".git", "control-tower")
    mkdirSync(sharedRuntimeRoot)
    writeFileSync(join(sharedRuntimeRoot, "shared-state"), "authoritative\n")

    const manifest = snapshotRuntimeBoundary(linked)

    expect(manifest.map(({ path }) => path)).toEqual([
      "../main/.git/control-tower",
      "../main/.git/control-tower/shared-state",
    ])
    expect(manifest.at(-1)).toMatchObject({ kind: "file", sha256: expect.any(String) })
  })

  test("fails closed when a descendant disappears during a runtime snapshot", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-unstable-runtime-"))
    temporaryDirectories.push(repository)
    git(repository, ["init", "-q"])
    const runtimeRoot = join(repository, ".git", "control-tower")
    const disappearingPath = join(runtimeRoot, "disappearing-state")
    mkdirSync(runtimeRoot)
    writeFileSync(disappearingPath, "transient\n")

    expect(() =>
      snapshotRuntimeBoundary(repository, {
        beforeEntrySnapshot(path) {
          if (path === disappearingPath) rmSync(path)
        },
      }),
    ).toThrow("unstable Control Tower runtime snapshot")
  })

  test("fails closed when a directory gains an entry during a runtime snapshot", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-growing-runtime-"))
    temporaryDirectories.push(repository)
    git(repository, ["init", "-q"])
    const runtimeRoot = join(repository, ".git", "control-tower")
    const existingPath = join(runtimeRoot, "existing-state")
    mkdirSync(runtimeRoot)
    writeFileSync(existingPath, "stable before listing\n")

    expect(() =>
      snapshotRuntimeBoundary(repository, {
        beforeEntrySnapshot(path) {
          if (path === existingPath) {
            writeFileSync(join(runtimeRoot, "concurrent-state"), "added after listing\n")
          }
        },
      }),
    ).toThrow("unstable Control Tower runtime snapshot")
  })

  test("fails closed when a nested runtime directory gains an entry after listing", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-growing-nested-runtime-"))
    temporaryDirectories.push(repository)
    git(repository, ["init", "-q"])
    const nestedDirectory = join(repository, ".git", "control-tower", "nested")
    const existingPath = join(nestedDirectory, "existing-state")
    mkdirSync(nestedDirectory, { recursive: true })
    writeFileSync(existingPath, "stable before listing\n")

    expect(() =>
      snapshotRuntimeBoundary(repository, {
        beforeEntrySnapshot(path) {
          if (path === existingPath) {
            writeFileSync(join(nestedDirectory, "concurrent-state"), "added after listing\n")
          }
        },
      }),
    ).toThrow("unstable Control Tower runtime snapshot")
  })

  for (const snapshot of [
    {
      ref: "f583df7",
      commit: "f583df7187252f92d4a63c06e4fa6f160d21e9d9",
      tree: "f3cd37a342543a557a2d251a640f553dcfa40d06",
      archiveSha256: "d2d522bf458c06af8098c47e431c3d4c59969c8dceff331a420fc40ae10764e5",
    },
    {
      ref: "71ab571",
      commit: "71ab5714dc967942fb202576a75fa93b75f45c1b",
      tree: "02e38b90318e5fa06d0baa4bd912654e77040e3f",
      archiveSha256: "98a80cddf8507deca8fc199d8c8be6d6600481ac0a7cc6a7f11c4a84b005b0f2",
    },
  ]) {
    test(`restores ${snapshot.ref} into an isolated root with exact tracked bytes`, () => {
      const destination = mkdtempSync(join(tmpdir(), `control-tower-restore-${snapshot.ref}-`))
      temporaryDirectories.push(destination)
      const runtimeBefore = snapshotRuntimeBoundary(packageRoot)

      expect(runtimeBefore).toEqual(expectedAbsentRuntimeBoundary)
      expect(existsSync(actualActivePath)).toBe(false)

      const restored = restoreFrozenSnapshot({
        repository: packageRoot,
        destination,
        ref: snapshot.ref,
      })

      expect({
        commit: restored.commit,
        tree: restored.tree,
        archiveSha256: restored.archiveSha256,
        trackedFiles: restored.trackedFiles,
      }).toEqual({
        commit: snapshot.commit,
        tree: snapshot.tree,
        archiveSha256: snapshot.archiveSha256,
        trackedFiles: 12,
      })
      expect(restored.trackedEntries).toHaveLength(12)
      expect(restored.trackedEntries.map(({ path }) => path)).toEqual(expectedTrackedPaths)
      expect(restored.trackedEntries.every(({ contentMatches }) => contentMatches)).toBe(true)
      expect(restored.trackedEntries.every(({ modeMatches }) => modeMatches)).toBe(true)
      expect(snapshotRuntimeBoundary(packageRoot)).toEqual(expectedAbsentRuntimeBoundary)
      expect(existsSync(actualActivePath)).toBe(false)
      expect(readFileSync(evidencePath, "utf8")).toContain(snapshot.archiveSha256)
    })
  }

  test("restores exact regular-file permissions under a restrictive umask", () => {
    const destination = mkdtempSync(join(tmpdir(), "control-tower-restore-umask-"))
    temporaryDirectories.push(destination)
    const previousUmask = process.umask(0o077)

    try {
      const restored = restoreFrozenSnapshot({
        repository: packageRoot,
        destination,
        ref: "71ab571",
      })

      for (const entry of restored.trackedEntries) {
        const expectedMode = entry.mode === "100755" ? 0o755 : 0o644
        expect(lstatSync(join(destination, entry.path)).mode & 0o777).toBe(expectedMode)
      }
    } finally {
      process.umask(previousUmask)
    }
  })

  test("restores 100644, 100755, and 120000 entries with exact identity", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-mode-repository-"))
    const destination = mkdtempSync(join(tmpdir(), "control-tower-mode-restore-"))
    temporaryDirectories.push(repository, destination)
    mkdirSync(join(repository, "nested"))
    writeFileSync(join(repository, "regular.txt"), "regular bytes\n", { mode: 0o644 })
    writeFileSync(join(repository, "nested", "executable.sh"), "#!/bin/sh\nexit 0\n", {
      mode: 0o755,
    })
    symlinkSync("nested/executable.sh", join(repository, "command-link"))
    git(repository, ["init", "-q"])
    git(repository, ["config", "user.email", "tower-test@example.invalid"])
    git(repository, ["config", "user.name", "Tower Test"])
    git(repository, ["add", "."])
    git(repository, ["commit", "-q", "-m", "mode fixture"])

    const restored = restoreFrozenSnapshot({ repository, destination, ref: "HEAD" })

    expect(restored.trackedEntries.map(({ mode, path }) => ({ mode, path }))).toEqual([
      { mode: "120000", path: "command-link" },
      { mode: "100755", path: "nested/executable.sh" },
      { mode: "100644", path: "regular.txt" },
    ])
    expect(lstatSync(join(destination, "regular.txt")).mode & 0o777).toBe(0o644)
    expect(lstatSync(join(destination, "nested", "executable.sh")).mode & 0o777).toBe(0o755)
    expect(lstatSync(join(destination, "command-link")).isSymbolicLink()).toBe(true)
    expect(readlinkSync(join(destination, "command-link"))).toBe("nested/executable.sh")
  })

  test("rejects exact-mode drift after restoration", () => {
    const destination = mkdtempSync(join(tmpdir(), "control-tower-mode-drift-"))
    temporaryDirectories.push(destination)
    const restored = restoreFrozenSnapshot({
      repository: packageRoot,
      destination,
      ref: "71ab571",
    })
    const regularEntry = restored.trackedEntries.find(({ mode }) => mode === "100644")
    chmodSync(join(destination, regularEntry.path), 0o600)

    expect(() =>
      verifyTrackedEntry(packageRoot, restored.commit, destination, regularEntry),
    ).toThrow(`restored entry mismatch: ${regularEntry.path}`)
  })

  test("rejects special permission bits on restored regular files", () => {
    const destination = mkdtempSync(join(tmpdir(), "control-tower-special-mode-drift-"))
    temporaryDirectories.push(destination)
    const restored = restoreFrozenSnapshot({
      repository: packageRoot,
      destination,
      ref: "71ab571",
    })

    for (const [gitMode, driftMode, driftModeText] of [
      ["100644", 0o4644, "4644"],
      ["100755", 0o4755, "4755"],
    ]) {
      const entry = restored.trackedEntries.find(({ mode }) => mode === gitMode)
      execFileSync("chmod", [driftModeText, join(destination, entry.path)])

      expect(lstatSync(join(destination, entry.path)).mode & 0o7777).toBe(driftMode)
      expect(() => verifyTrackedEntry(packageRoot, restored.commit, destination, entry)).toThrow(
        `restored entry mismatch: ${entry.path}`,
      )
    }
  })
})
