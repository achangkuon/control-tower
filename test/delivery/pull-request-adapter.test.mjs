import { describe, expect, test } from "bun:test"

import { createPullRequestAdapter } from "../../delivery/pull-request-adapter.mjs"

const input = Object.freeze({ repository: "owner/repository", head: "feature/s5-2", base: "master", env: { GH_TOKEN: "secret" } })
const code = async (operation) => {
  try { await operation() } catch (error) { return error.code }
  return null
}

describe("argv-only pull request adapter", () => {
  test("passes repository, head, and base explicitly while keeping environment separate", async () => {
    const calls = []
    const adapter = createPullRequestAdapter({ run: async (invocation) => {
      calls.push(invocation)
      return calls.length === 1
        ? { exitCode: 0, stdout: "[]", stderr: "" }
        : { exitCode: 0, stdout: "https://github.com/owner/repository/pull/42", stderr: "" }
    } })

    // A pull request that did not exist a moment ago cannot have passing checks or an
    // approving review yet, so creating one is never itself a delivered state.
    const created = await adapter.create(input)
    expect(created).toMatchObject({ status: "checks_pending", reconciled: true, mutated: true })
    expect(calls).toEqual([
      { command: "gh", argv: ["pr", "list", "--repo", "owner/repository", "--head", "feature/s5-2", "--base", "master", "--state", "all", "--json", "number,headRefName,baseRefName,state,isDraft,mergeStateStatus,statusCheckRollup,reviewDecision,mergedAt"], env: { GH_TOKEN: "secret" } },
      { command: "gh", argv: ["pr", "create", "--repo", "owner/repository", "--head", "feature/s5-2", "--base", "master", "--fill"], env: { GH_TOKEN: "secret" } },
    ])
  })

  test("reconciles an existing exact pull request without creating another", async () => {
    const calls = []
    const adapter = createPullRequestAdapter({ run: async (invocation) => {
      calls.push(invocation)
      return { exitCode: 0, stdout: '[{"number":42,"headRefName":"feature/s5-2","baseRefName":"master","state":"OPEN","isDraft":false,"mergeStateStatus":"CLEAN","statusCheckRollup":[{"status":"COMPLETED","conclusion":"SUCCESS"}],"reviewDecision":"APPROVED","mergedAt":null}]', stderr: "" }
    } })

    expect(await adapter.create(input)).toEqual({ status: "delivered", reconciled: true, mutated: false, number: 42 })
    expect(calls).toHaveLength(1)
  })

  test("blocks closed-unmerged and incomplete-check pull requests without creating another", async () => {
    const outcomes = [
      [{ state: "CLOSED", mergedAt: null, isDraft: false, statusCheckRollup: [], reviewDecision: "APPROVED" }, "unknown"],
      [{ state: "OPEN", mergedAt: null, isDraft: false, statusCheckRollup: [{ status: "IN_PROGRESS", conclusion: null }], reviewDecision: "APPROVED" }, "checks_pending"],
      [{ state: "OPEN", mergedAt: null, isDraft: false, statusCheckRollup: [{ status: "COMPLETED", conclusion: "SUCCESS" }], reviewDecision: "REVIEW_REQUIRED" }, "checks_pending"],
    ]
    for (const [evidence, status] of outcomes) {
      const calls = []
      const adapter = createPullRequestAdapter({ run: async (invocation) => { calls.push(invocation); return { exitCode: 0, stdout: JSON.stringify([{ number: 42, headRefName: input.head, baseRefName: input.base, mergeStateStatus: "CLEAN", ...evidence }]), stderr: "" } } })
      expect((await adapter.create(input)).status).toBe(status)
      expect(calls).toHaveLength(1)
    }
  })

  test("rejects command composition, hostile environment, and a missing head before execution", async () => {
    const calls = []
    const adapter = createPullRequestAdapter({ run: async (invocation) => { calls.push(invocation); return { exitCode: 0 } } })

    expect(await code(() => adapter.create({ ...input, repository: "owner/repository; rm -rf /" }))).toBe("CT_DELIVERY_COMMAND_INVALID")
    expect(await code(() => adapter.create({ ...input, head: "GH_TOKEN=x gh pr create" }))).toBe("CT_DELIVERY_COMMAND_INVALID")
    expect(await code(() => adapter.create({ repository: input.repository, base: input.base, env: input.env }))).toBe("CT_DELIVERY_COMMAND_INVALID")
    expect(await code(() => adapter.create({ ...input, env: { ...input.env, GH_HOST: "attacker.invalid" } }))).toBe("CT_DELIVERY_COMMAND_INVALID")
    expect(await code(() => adapter.create({ ...input, env: { ...input.env, PATH: "/tmp/hostile" } }))).toBe("CT_DELIVERY_COMMAND_INVALID")
    expect(calls).toEqual([])
  })
})
