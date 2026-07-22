import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import {
  chmodSync,
  existsSync,
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

import {
  restoreFrozenSnapshot,
  snapshotRuntimeBoundary,
  verifyTrackedEntry,
} from "./helpers/restore-fixture.mjs"

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
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

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
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
