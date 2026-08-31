import { expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

import { git } from "./helpers/git.mjs"

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))

const snapshotRepository = (repository) => {
  const worktreeIdentities = git(repository, ["worktree", "list", "--porcelain"], { encoding: "utf8" })
    .trim()
    .split("\n\n")
    .filter(Boolean)

  return {
    coreBare: git(repository, ["config", "--local", "--get", "core.bare"], { encoding: "utf8" }).trim(),
    worktreeCount: worktreeIdentities.length,
    worktreeIdentities,
  }
}

const snapshotDecoy = (repository) => ({
  head: git(repository, ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  worktrees: git(repository, ["worktree", "list", "--porcelain"], { encoding: "utf8" }),
  config: git(repository, ["config", "--local", "--list", "--null"], { encoding: "utf8" }),
})

test("a contaminated Git environment cannot redirect Git operations", () => {
  const decoy = mkdtempSync(join(tmpdir(), "ct-git-decoy-"))
  const target = mkdtempSync(join(tmpdir(), "ct-git-target-"))
  try {
    git(decoy, ["init", "-q", "-b", "main"])
    git(decoy, ["config", "user.email", "tower-test@example.invalid"])
    git(decoy, ["config", "user.name", "Tower Test"])
    git(decoy, ["commit", "-q", "--allow-empty", "-m", "decoy baseline"])
    git(target, ["init", "-q", "-b", "main"])
    const repositoryBefore = snapshotRepository(packageRoot)
    const decoyBefore = snapshotDecoy(decoy)

    expect(repositoryBefore.coreBare).toBe("false")

    const probe = [
      'import { spawnSync } from "node:child_process"',
      'const result = spawnSync("git", ["config", "--local", "isolation.marker", "target"], { cwd: process.argv[1] })',
      'process.exit(result.status ?? 1)',
    ].join("; ")
    const nested = spawnSync(process.execPath, ["--preload=./test/helpers/git.mjs", "-e", probe, target], {
      cwd: packageRoot,
      env: { ...process.env, GIT_DIR: join(decoy, ".git") },
      encoding: "utf8",
      timeout: 5_000,
    })

    expect({ status: nested.status, signal: nested.signal }).toEqual({ status: 0, signal: null })
    expect(git(target, ["config", "--local", "--get", "isolation.marker"], { encoding: "utf8" }).trim()).toBe("target")
    expect(snapshotDecoy(decoy)).toEqual(decoyBefore)
    expect(snapshotRepository(packageRoot)).toEqual(repositoryBefore)
  } finally {
    rmSync(decoy, { recursive: true, force: true })
    rmSync(target, { recursive: true, force: true })
  }
}, 10_000)
