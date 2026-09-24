import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { effectiveSwitch, gitCommonDir, setSwitch, switchStatus } from "../../chanks/pi-switch.mjs"

const git = (cwd, ...args) => execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] })

const initRepo = () => {
  const root = mkdtempSync(join(tmpdir(), "pi-switch-"))
  git(root, "init", "--quiet")
  git(root, "config", "user.email", "test@example.com")
  git(root, "config", "user.name", "Test")
  writeFileSync(join(root, "README.md"), "seed\n")
  git(root, "add", "README.md")
  git(root, "commit", "--quiet", "-m", "seed")
  return root
}

const withPlan = (root) => {
  mkdirSync(join(root, "openspec"), { recursive: true })
  writeFileSync(join(root, "openspec", "plan.yaml"), "sesiones: []\n")
}

describe("pi-switch", () => {
  let root

  beforeEach(() => {
    root = initRepo()
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  test("default is off with no state file", () => {
    const status = switchStatus(root)
    expect(status.on).toBe(false)
    expect(status.effective).toBe(false)
    expect(effectiveSwitch(root)).toBe(false)
  })

  test("on is refused when openspec/plan.yaml is missing", () => {
    expect(() => setSwitch(root, true)).toThrow(/plan\.yaml/)
    expect(switchStatus(root).on).toBe(false)
  })

  test("on succeeds and becomes effective when the plan exists", () => {
    withPlan(root)
    const status = setSwitch(root, true)
    expect(status.on).toBe(true)
    expect(status.effective).toBe(true)
    expect(effectiveSwitch(root)).toBe(true)
  })

  test("off turns the switch back off", () => {
    withPlan(root)
    setSwitch(root, true)
    const status = setSwitch(root, false)
    expect(status.on).toBe(false)
    expect(effectiveSwitch(root)).toBe(false)
  })

  test("effective drops to false the moment the plan disappears, even while state stays on", () => {
    withPlan(root)
    setSwitch(root, true)
    rmSync(join(root, "openspec", "plan.yaml"))
    const status = switchStatus(root)
    expect(status.on).toBe(true)
    expect(status.planExists).toBe(false)
    expect(status.effective).toBe(false)
  })

  test("state lives outside the versioned tree, under the git common directory", () => {
    withPlan(root)
    const status = setSwitch(root, true)
    expect(status.path.startsWith(gitCommonDir(root))).toBe(true)
    const tracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root }).toString("utf8")
    expect(tracked).not.toContain("switch.json")
  })

  test("a corrupted state file is treated as off, never as a crash", () => {
    withPlan(root)
    setSwitch(root, true)
    const status = switchStatus(root)
    writeFileSync(status.path, "not json")
    expect(switchStatus(root).on).toBe(false)
  })

  test("worktrees of the same repository share the switch state", () => {
    withPlan(root)
    git(root, "add", "openspec/plan.yaml")
    git(root, "commit", "--quiet", "-m", "plan")
    setSwitch(root, true)
    const worktree = join(root, "..", `${root.split("/").pop()}-wt`)
    git(root, "worktree", "add", "--quiet", "-b", "pi-switch-wt", worktree)
    try {
      expect(gitCommonDir(worktree)).toBe(gitCommonDir(root))
      expect(effectiveSwitch(worktree)).toBe(true)
      setSwitch(worktree, false)
      expect(effectiveSwitch(root)).toBe(false)
    } finally {
      git(root, "worktree", "remove", "--force", worktree)
    }
  })

  test("rejects a non-absolute repository root", () => {
    expect(() => switchStatus("relative/path")).toThrow()
  })

  test("CLI prints JSON status without mutating state", () => {
    withPlan(root)
    const before = execFileSync(
      "bun",
      ["run", join(import.meta.dir, "..", "..", "chanks", "pi-switch.mjs"), "status", "-C", root],
    ).toString("utf8")
    expect(JSON.parse(before).on).toBe(false)

    execFileSync(
      "bun",
      ["run", join(import.meta.dir, "..", "..", "chanks", "pi-switch.mjs"), "on", "-C", root],
    )
    expect(effectiveSwitch(root)).toBe(true)

    execFileSync(
      "bun",
      ["run", join(import.meta.dir, "..", "..", "chanks", "pi-switch.mjs"), "off", "-C", root],
    )
    expect(effectiveSwitch(root)).toBe(false)
  })
})
