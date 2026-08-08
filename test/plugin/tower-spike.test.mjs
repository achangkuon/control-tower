import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../..")
const directories = []
const proposal = () => ({
  schema: "support-proposal", schema_version: 1, proposal_id: "proposal-plugin", project_id: "project-a", caller_role: "MAIN",
  checkpoint_ref: "evidence/checkpoint.json", plan_enumeration_digest: `sha256:${"a".repeat(64)}`, ledger_digest: `sha256:${"b".repeat(64)}`,
  worker_claim: "claim-a", primary: { module_id: "M5.1.2", task_ids: ["T5.1.2.1"] }, alternatives: [], conflicts: [], evidence_refs: [],
  expires_at: "2099-01-01T00:00:00.000Z", state: "EXECUTABLE",
})

const code = async (operation) => {
  try { await operation() } catch (error) { return error.code }
  return null
}

const defaultClient = (calls, output = proposal()) => ({
  session: {
    create: async (input) => { calls.push(["create", input]); return { data: { id: "child-a" } } },
    prompt: async (input) => {
      calls.push(["prompt", input])
      return { data: { info: { id: "message-a" }, parts: [{ type: "text", text: JSON.stringify(output) }] } }
    },
  },
})

const loadPlugin = async ({ client, omitProvider = false, providerError, providerValue, drift = false } = {}) => {
  const root = mkdtempSync(join(tmpdir(), "ct-plugin-"))
  directories.push(root)
  const binding = {
    project_id: "project-a", revision: 7, repository_root: projectRoot, git_common_dir: join(projectRoot, ".git"),
    remote: "git@example.invalid:a.git", branch: "master", main_session_id: "main-session-a", store_path: root, epoch: 3,
  }
  let providerCalls = 0
  const trustedBindingProvider = () => {
    providerCalls += 1
    if (providerError) throw Object.assign(new Error("provider failed"), { code: "CT_AUTH_INVALID" })
    if (providerValue !== undefined) return providerValue
    return structuredClone(drift && providerCalls > 1 ? { ...binding, epoch: 4 } : binding)
  }
  const calls = []
  const input = {
    client: client ?? defaultClient(calls), project: { id: "project-a" }, directory: projectRoot, worktree: projectRoot,
    experimental_workspace: { register: () => {} }, serverUrl: new URL("http://127.0.0.1"), $: {},
  }
  const { TowerSpikePlugin } = await import("../../plugin/tower-spike.js")
  const plugin = await TowerSpikePlugin(input, omitProvider ? {} : { trustedBindingProvider })
  return { binding, calls, plugin, providerCalls: () => providerCalls, root }
}

const execute = (plugin, input = proposal(), sessionID = "main-session-a", abort = new AbortController().signal) =>
  plugin.tool.control_tower_support.execute({ proposal: input }, {
    sessionID, messageID: "message-main", agent: "main", directory: projectRoot, worktree: projectRoot, abort,
    metadata: () => {}, ask: async () => {},
  })

const sentinelSnapshot = (root) => {
  const files = ["board.json", "locks.json", "worker.json", "registry.json"]
  for (const file of files) writeFileSync(join(root, file), `${file}:unchanged\n`)
  return Object.fromEntries(files.map((file) => [file, readFileSync(join(root, file), "utf8")]))
}
const expectSentinels = (root, snapshot) => {
  for (const [file, bytes] of Object.entries(snapshot)) expect(readFileSync(join(root, file), "utf8")).toBe(bytes)
}

afterEach(() => directories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })))

describe("OpenCode Support bridge", () => {
  test("declares a real restricted Support subagent and runtime plugin entrypoint", () => {
    const agentPath = join(projectRoot, ".opencode/agent/support-agent.md")
    const entrypoint = join(projectRoot, ".opencode/plugins/tower-spike.js")
    const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"))
    expect(readFileSync(entrypoint, "utf8")).toContain("TowerSpikePlugin as default")
    const source = readFileSync(agentPath, "utf8")
    expect(source).toContain("mode: subagent")
    for (const permission of ["read: deny", "glob: deny", "grep: deny", "list: deny", "task: deny", "bash: deny", "edit: deny", "write: deny", "external_directory: deny"]) expect(source).toContain(permission)
    expect(source).toContain("structured support-proposal output only")
    expect(packageJson.dependencies).toMatchObject({ "@opencode-ai/plugin": "1.18.13", "@opencode-ai/sdk": "1.18.13" })
  })

  test("injects trusted Main binding before store access, spawn, or persistence", async () => {
    for (const options of [{ omitProvider: true }, { providerError: true }, { providerValue: null }, { providerValue: {} }, { drift: true }]) {
      let creates = 0
      const client = { session: { create: async () => { creates += 1; return { data: { id: "child" } } }, prompt: async () => { throw new Error("must not prompt") } } }
      const loaded = await loadPlugin({ ...options, client })
      expect(await code(() => execute(loaded.plugin))).toBe("CT_AUTH_INVALID")
      expect(creates).toBe(0)
      expect(existsSync(join(loaded.root, "support-proposals"))).toBe(false)
    }
  })

  test("rejects a foreign session before spawn or persistence and names it", async () => {
    const loaded = await loadPlugin()
    const error = await execute(loaded.plugin, proposal(), "foreign-session").catch((caught) => caught)
    expect(error.code).toBe("CT_AUTH_INVALID")
    expect(error.message).toContain("foreign-session")
    expect(loaded.calls).toEqual([])
    expect(loaded.providerCalls()).toBe(1)
    expect(existsSync(join(loaded.root, "support-proposals"))).toBe(false)
  })

  test("uses the pinned SDK request shape, isolated agent, denied tools, and validated JSON output", async () => {
    const loaded = await loadPlugin()
    const result = JSON.parse(await execute(loaded.plugin))
    expect(result).toMatchObject({ proposal_id: "proposal-plugin", caller_role: "MAIN" })
    expect(loaded.providerCalls()).toBe(2)
    expect(loaded.calls).toEqual([
      ["create", { body: { parentID: "main-session-a", title: "Control Tower Support" }, query: { directory: projectRoot } }],
      ["prompt", {
        path: { id: "child-a" }, query: { directory: projectRoot },
        body: expect.objectContaining({ agent: "support-agent", tools: expect.objectContaining({ read: false, task: false, bash: false, write: false }), parts: [expect.objectContaining({ type: "text" })] }),
      }],
    ])
    expect(readdirSync(join(loaded.root, "support-proposals"))).toHaveLength(1)
  })

  test("never sends authority to Support and preserves board, locks, Worker, and registry bytes", async () => {
    const success = await loadPlugin()
    const successBytes = sentinelSnapshot(success.root)
    await execute(success.plugin)
    expectSentinels(success.root, successBytes)
    const promptBytes = success.calls.find(([name]) => name === "prompt")[1].body.parts[0].text
    expect(promptBytes).not.toMatch(/main_store|capability|authority/i)

    const rejected = await loadPlugin()
    const rejectedBytes = sentinelSnapshot(rejected.root)
    const poisoned = { context: { main_store: { path: "/forbidden" }, capability: "forbidden", authority: "forbidden" } }
    expect(await code(() => execute(rejected.plugin, poisoned))).toBe("CT_AUTH_INVALID")
    expect(rejected.calls).toEqual([])
    expectSentinels(rejected.root, rejectedBytes)
  })

  test("fails closed without isolated host APIs or valid structured output, with no inline fallback", async () => {
    const missing = await loadPlugin({ client: {} })
    expect(await code(() => execute(missing.plugin))).toBe("CT_HOST_CAPABILITY_MISSING")

    const malformedCalls = []
    const malformed = await loadPlugin({ client: defaultClient(malformedCalls, "not-json") })
    expect(await code(() => execute(malformed.plugin))).toBe("CT_HOST_CAPABILITY_MISSING")
    expect(existsSync(join(malformed.root, "support-proposals"))).toBe(false)

    const unauthorizedCalls = []
    const unauthorized = proposal()
    unauthorized.alternatives = [{ nested: { authority: "forbidden" } }]
    const invalid = await loadPlugin({ client: defaultClient(unauthorizedCalls, unauthorized) })
    expect(await code(() => execute(invalid.plugin))).toBe("CT_STORE_INVALID")
    expect(existsSync(join(invalid.root, "support-proposals"))).toBe(false)
    expect(invalid.plugin).not.toHaveProperty("invokeSupport")
  })
})
