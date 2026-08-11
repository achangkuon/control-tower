import { describe, expect, test } from "bun:test"

import { createGitAdapter } from "../../delivery/git-adapter.mjs"

const sha = "a".repeat(40)
const base = "b".repeat(40)
const input = Object.freeze({
  repository_root: "/tmp/repository",
  remote: "origin",
  refspec: `${sha}:refs/heads/master`,
  head: sha,
  expected_base: base,
  target: { remote: "origin", branch: "master" },
})
const code = async (operation) => {
  try { await operation() } catch (error) { return error.code }
  return null
}

describe("explicit git delivery adapter", () => {
  test("reconciles the declared remote target before its first explicit push", async () => {
    const calls = []
    const adapter = createGitAdapter({ run: async (invocation) => {
      calls.push(invocation)
      return calls.length === 1 ? { exitCode: 0, stdout: `${base}\trefs/heads/master\n`, stderr: "" } : { exitCode: 0, stdout: "ok", stderr: "" }
    } })

    expect((await adapter.push(input)).status).toBe("delivered")
    expect(calls).toEqual([
      { command: "git", argv: ["-C", "/tmp/repository", "ls-remote", "--exit-code", "origin", "refs/heads/master"], env: {} },
      { command: "git", argv: ["-C", "/tmp/repository", "push", "--porcelain", "origin", `${sha}:refs/heads/master`], env: {} },
    ])
  })

  test("treats the frozen head as already delivered without a second effect", async () => {
    const calls = []
    const adapter = createGitAdapter({ run: async (invocation) => {
      calls.push(invocation)
      return { exitCode: 0, stdout: `${sha}\trefs/heads/master\n`, stderr: "" }
    } })

    expect(await adapter.push(input)).toEqual({ status: "delivered", reconciled: true, mutated: false })
    expect(calls).toHaveLength(1)
  })

  test("advances an existing declared base exactly once and rejects a stale remote base", async () => {
    const calls = []
    const adapter = createGitAdapter({ run: async (invocation) => {
      calls.push(invocation)
      return calls.length === 1 ? { exitCode: 0, stdout: `${base}\trefs/heads/master\n`, stderr: "" } : { exitCode: 0, stdout: "ok", stderr: "" }
    } })
    expect(await adapter.push(input)).toMatchObject({ status: "delivered", mutated: true })
    expect(calls.filter(({ argv }) => argv.includes("push"))).toHaveLength(1)

    calls.length = 0
    const stale = createGitAdapter({ run: async (invocation) => { calls.push(invocation); return { exitCode: 0, stdout: `${"c".repeat(40)}\trefs/heads/master\n`, stderr: "" } } })
    expect(await stale.push(input)).toEqual({ status: "diverged", reconciled: true, mutated: false })
    expect(calls).toHaveLength(1)
  })

  test("blocks an undeclared or option-shaped remote and refspec before emitting anything", async () => {
    const calls = []
    const adapter = createGitAdapter({ run: async (invocation) => { calls.push(invocation); return { exitCode: 0 } } })

    expect(await code(() => adapter.push({ ...input, remote: "tracking" }))).toBe("CT_DELIVERY_TARGET_MISMATCH")
    expect(await code(() => adapter.push({ ...input, refspec: `${sha}:refs/heads/other` }))).toBe("CT_DELIVERY_TARGET_MISMATCH")
    expect(await code(() => adapter.push({ ...input, remote: "--help", target: { ...input.target, remote: "--help" } }))).toBe("CT_DELIVERY_INVALID")
    expect(calls).toEqual([])
  })
})
