import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { join } from "node:path"

const workspace = process.cwd()
const script = join(import.meta.dir, "reproduce-c08.sh")
const scratch = []

const temp = () => {
  const path = mkdtempSync(join(workspace, ".tmp-c08-"))
  scratch.push(path)
  return path
}

const run = (...args) => {
  try {
    return { status: 0, stdout: execFileSync(script, args, { encoding: "utf8" }), stderr: "" }
  } catch (error) {
    return { status: error.status, stdout: error.stdout?.toString() ?? "", stderr: error.stderr?.toString() ?? "" }
  }
}

afterEach(() => scratch.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })))

describe("reproduce-c08 preconditions", () => {
  test("documents its two portable inputs", () => {
    const result = run("--help")
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("ROOT WORK_ROOT")
  })

  test("rejects a wrong argument count", () => {
    expect(run().status).toBe(64)
    expect(run("a").status).toBe(64)
    expect(run("a", "b", "c").status).toBe(64)
  })

  test("rejects a relative or missing ROOT before touching WORK_ROOT", () => {
    const work = join(temp(), "fresh")
    const relative = run("not/absolute", work)
    expect(relative.status).toBe(64)
    expect(relative.stderr).toContain("ROOT must be an existing absolute directory")
    expect(existsSync(work)).toBe(false)

    const missing = run(join(workspace, "does-not-exist-c08"), work)
    expect(missing.status).toBe(64)
    expect(existsSync(work)).toBe(false)
  })

  test("rejects a nonempty WORK_ROOT without modifying it", () => {
    const work = temp()
    writeFileSync(join(work, "keep"), "unchanged")
    const result = run(workspace, work)
    expect(result.status).toBe(64)
    expect(result.stderr).toContain("WORK_ROOT must be absent or empty")
    expect(readFileSync(join(work, "keep"), "utf8")).toBe("unchanged")
    expect(existsSync(join(work, ".c08-private-git"))).toBe(false)
  })

  test("rejects a relative WORK_ROOT", () => {
    const result = run(workspace, "relative/work")
    expect(result.status).toBe(64)
    expect(result.stderr).toContain("WORK_ROOT must be an absolute directory")
  })

  test("never names a package identity in its own source", () => {
    const source = readFileSync(script, "utf8")
    expect(source).toContain("package_identity: not-computed")
    expect(source).not.toMatch(/final_package_identity=\$\(/)
  })

  test("accepts an empty WORK_ROOT and moves past the argument gate", () => {
    // ROOT is a real directory that is not a repository, so the script clears both argument
    // gates and then fails fast on its repository preconditions. Passing the workspace here
    // would run the whole reproduction, which is far slower than a unit test should be.
    const root = temp()
    const work = join(temp(), "absent")
    mkdirSync(work)
    const result = run(root, work)
    expect(result.status).not.toBe(64)
    expect(result.stderr).not.toContain("WORK_ROOT must be absent or empty")
    expect(result.stderr).not.toContain("WORK_ROOT must be an absolute directory")
  })
})
