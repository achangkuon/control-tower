import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { delimiter, join } from "node:path"

import { git } from "./git.mjs"

const roots = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

const gitRoutingVariables = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_PREFIX",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_QUARANTINE_PATH",
]

const fakeGit = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-git-helper-"))
  roots.push(root)
  const executable = join(root, "git")
  writeFileSync(executable, `#!${process.execPath}\nconst chunks = []\nfor await (const chunk of process.stdin) chunks.push(chunk)\nconst routing = ${JSON.stringify(gitRoutingVariables)}\nprocess.stdout.write(JSON.stringify({\n  argv: process.argv.slice(2),\n  input: Buffer.concat(chunks).toString("utf8"),\n  override: process.env.CT_CALLER_OVERRIDE,\n  routing: Object.fromEntries(routing.map((name) => [name, process.env[name] ?? null])),\n}))\n`)
  chmodSync(executable, 0o755)
  return { root, executable }
}

test("removes inherited Git routing while preserving caller process options", () => {
  const { root } = fakeGit()
  const env = {
    ...process.env,
    PATH: `${root}:${process.env.PATH}`,
    CT_CALLER_OVERRIDE: "preserved",
    ...Object.fromEntries(gitRoutingVariables.map((name) => [name, `/decoy/${name}`])),
  }

  const output = git(root, ["status", "--short"], {
    env,
    encoding: "utf8",
    input: "fixture-input",
    stdio: ["pipe", "pipe", "pipe"],
  })

  expect(JSON.parse(output)).toEqual({
    argv: ["status", "--short"],
    input: "fixture-input",
    override: "preserved",
    routing: Object.fromEntries(gitRoutingVariables.map((name) => [name, null])),
  })
})

test("preserves Buffer output when the caller omits encoding", () => {
  const { root } = fakeGit()
  const output = git(root, ["rev-parse", "HEAD"], {
    env: { ...process.env, PATH: `${root}:${process.env.PATH}` },
    stdio: ["ignore", "pipe", "pipe"],
  })

  expect(Buffer.isBuffer(output)).toBe(true)
})

test("avoids proxy recursion with a caller-provided minimal environment", () => {
  const result = git(process.cwd(), ["--version"], {
    result: true,
    env: { PATH: process.env.PATH },
    encoding: "utf8",
    timeout: 1_000,
  })

  expect({ status: result.status, signal: result.signal }).toEqual({ status: 0, signal: null })
  expect(result.stdout).toMatch(/^git version /)
})

test("proxy avoids recursion when its routing variable is absent", () => {
  const env = { ...process.env }
  delete env.CT_GIT_PROXY_DIR
  expect(env.PATH?.split(delimiter)[0]).toBe(join(import.meta.dir, "bin"))
  expect(env.CT_GIT_PROXY_DIR).toBeUndefined()

  const result = spawnSync("git", ["--version"], { env, encoding: "utf8", timeout: 250 })

  expect({ status: result.status, signal: result.signal }).toEqual({ status: 0, signal: null })
  expect(result.stdout).toMatch(/^git version /)
})
