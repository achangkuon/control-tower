import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import * as nodeFs from "node:fs"

import { enrollProject, validateEnrollmentLayout } from "../../enroll/index.mjs"
import { createProjectRegistryStore } from "../../registry/store.mjs"
import { git as runGit } from "../helpers/git.mjs"

const roots = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true }) })
const temporaryRoot = () => { const root = mkdtempSync(join(tmpdir(), "ct-enroll-")); roots.push(root); return root }
const git = (cwd, args) => runGit(cwd, args, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim()
const errorCode = (operation) => { try { operation() } catch (error) { return error.code } return null }

const fixture = ({ linkedWorktree = true } = {}) => {
  const root = temporaryRoot()
  const projectRoot = join(root, "alpha")
  const main = join(projectRoot, "Main")
  const worktrees = join(projectRoot, "Worktrees")
  const registryPath = join(root, "config", "control-tower", "projects.yaml")
  mkdirSync(main, { recursive: true })
  mkdirSync(worktrees)
  git(main, ["init", "-q", "-b", "main"])
  git(main, ["config", "user.email", "tower-test@example.invalid"])
  git(main, ["config", "user.name", "Tower Test"])
  git(main, ["remote", "add", "origin", "https://example.invalid/alpha.git"])
  git(main, ["commit", "-q", "--allow-empty", "-m", "initial"])
  if (linkedWorktree) git(main, ["worktree", "add", "-q", "-b", "worker", join(worktrees, "worker")])
  const request = {
    project_id: "alpha",
    aliases: ["alpha"],
    project_root: projectRoot,
    expected_remote: "https://example.invalid/alpha.git",
    main_branch: "main",
    main_session: "alpha-main",
    manifest_path: "openspec/plans/manifest.yaml",
    roadmap_path: "openspec/plans/master-index.md",
    allowed_hosts: ["opencode"],
  }
  return { root, projectRoot, main, worktrees, registryPath, request }
}

describe("explicit project enrollment", () => {
  test("validates Main and Worktrees before publishing isolated identity and state", () => {
    const value = fixture()
    const mainHead = git(value.main, ["rev-parse", "HEAD"])
    const beforeEntries = readdirSync(value.projectRoot).sort()

    const enrolled = enrollProject(value.request, { registryPath: value.registryPath })

    expect(enrolled).toMatchObject({
      project_id: "alpha",
      canonical_root: value.projectRoot,
      expected_remote: value.request.expected_remote,
      main_branch: "main",
      main_store_path: join(value.main, ".git", "control-tower", "tower.db"),
    })
    expect(enrolled.git_common_dir).toBe(join(value.main, ".git"))
    expect(readdirSync(value.projectRoot).sort()).toEqual(beforeEntries)
    expect(git(value.main, ["rev-parse", "HEAD"])).toBe(mainHead)
    expect(existsSync(enrolled.main_store_path)).toBe(false)
    expect(lstatSync(value.registryPath).mode & 0o777).toBe(0o600)
  })

  test("requires an explicit complete request and performs no registry mutation on refusal", () => {
    const value = fixture()
    const { project_id: _projectId, ...incomplete } = value.request
    expect(errorCode(() => enrollProject(incomplete, { registryPath: value.registryPath }))).toBe("CT_ENROLLMENT_INVALID")
    expect(existsSync(dirname(value.registryPath))).toBe(false)
  })

  test("refuses identity reuse and preserves the authoritative registry bytes", () => {
    const value = fixture()
    enrollProject(value.request, { registryPath: value.registryPath })
    const before = readFileSync(value.registryPath)

    expect(errorCode(() => enrollProject(value.request, { registryPath: value.registryPath }))).toBe("CT_ENROLLMENT_CONFLICT")
    expect(readFileSync(value.registryPath)).toEqual(before)
  })
})

describe("safe owner layout", () => {
  test.each([
    ["remote mismatch", (value) => { value.request.expected_remote = "https://example.invalid/other.git" }],
    ["detached Main", (value) => { git(value.main, ["checkout", "-q", "--detach"]) }],
    ["foreign worktree", (value) => { git(value.main, ["worktree", "add", "-q", "-b", "foreign", join(value.projectRoot, "Foreign")]) }],
  ])("fails closed for %s before creating registry state", (_name, makeUnsafe) => {
    const value = fixture()
    makeUnsafe(value)
    expect(errorCode(() => enrollProject(value.request, { registryPath: value.registryPath }))).toBe("CT_LAYOUT_UNSAFE")
    expect(existsSync(dirname(value.registryPath))).toBe(false)
  })

  test("rejects a symlinked Worktrees directory", () => {
    const value = fixture({ linkedWorktree: false })
    rmSync(value.worktrees, { recursive: true })
    const target = join(value.root, "worktrees-target")
    mkdirSync(target)
    symlinkSync(target, value.worktrees)

    expect(errorCode(() => validateEnrollmentLayout(value.request))).toBe("CT_LAYOUT_UNSAFE")
    expect(existsSync(dirname(value.registryPath))).toBe(false)
  })

  test("rejects a layout path not owned by the current user", () => {
    const value = fixture()
    const fs = {
      ...nodeFs,
      lstatSync(path) {
        const stats = nodeFs.lstatSync(path)
        return path === value.worktrees ? new Proxy(stats, { get: (target, key) => key === "uid" ? target.uid + 1 : target[key] }) : stats
      },
    }
    expect(errorCode(() => validateEnrollmentLayout(value.request, { fs }))).toBe("CT_LAYOUT_UNSAFE")
  })

  test("does not expose a mutation-capable Git command surface", () => {
    const value = fixture()
    const calls = []
    validateEnrollmentLayout(value.request, {
      git(cwd, args) { calls.push(args); return git(cwd, args) },
    })
    expect(calls).toEqual([
      ["rev-parse", "--show-toplevel"],
      ["rev-parse", "--git-common-dir"],
      ["remote", "get-url", "origin"],
      ["symbolic-ref", "--quiet", "--short", "HEAD"],
      ["worktree", "list", "--porcelain"],
      ["rev-parse", "--git-common-dir"],
      ["rev-parse", "--git-common-dir"],
    ])
  })

  test("publishes through the existing registry CAS boundary", () => {
    const value = fixture()
    let saves = 0
    const base = createProjectRegistryStore({ registryPath: value.registryPath })
    const store = { load: () => base.load(), save(input) { saves += 1; return base.save(input) } }
    enrollProject(value.request, { registryPath: value.registryPath, store })
    expect(saves).toBe(1)
  })
})
