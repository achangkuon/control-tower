import { afterEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createAgentCapabilityRegistry } from "../../capabilities/registry.mjs"
import * as tower from "../../core.mjs"
import { bindMainAuthority } from "../../main-store/authority.mjs"
import { git as runGit } from "../helpers/git.mjs"

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

const git = (cwd, args) => runGit(cwd, args, { encoding: "utf8" }).trim()
const capabilityDocument = () => ({
  schema: "agent-capability-registry", schema_version: 1, project_id: "project-a", main_identity: "main-session-a", registry_revision: 1,
  capabilities: [{
    agent_identity: "support-a", agent_role: "SUPPORT", capability: "support-proposal",
    input_schema: "support-proposal", output_schema: "policy-report",
    source_ref: "capabilities/support.mjs", source_digest: `sha256:${"a".repeat(64)}`,
    jornada_id: "jornada-a", jornada_revision: 1, expires_at: "2099-01-01T00:00:00.000Z", registry_entry_revision: 1,
  }],
})
const canonicalIsolationResources = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-plugin-canonical-"))
  directories.push(root)
  const main = join(root, "Main"), worker = join(root, "Worker")
  mkdirSync(main)
  git(main, ["init", "-q", "-b", "master"])
  git(main, ["config", "user.email", "tower@example.invalid"])
  git(main, ["config", "user.name", "Tower Test"])
  writeFileSync(join(main, "README.md"), "canonical isolation fixture\n")
  git(main, ["add", "README.md"])
  git(main, ["commit", "-q", "-m", "fixture"])
  git(main, ["worktree", "add", "-q", "-b", "worker", worker])

  const place = tower.locate(main)
  mkdirSync(place.root, { recursive: true, mode: 0o700 })
  writeFileSync(join(place.root, "ACTIVE"), "", { mode: 0o600 })
  const mainHandle = tower.open(main), workerHandle = tower.open(worker)
  tower.register(mainHandle, "MAIN")
  tower.setState(mainHandle, { state: "READY", task: "canonical witness" })
  tower.register(workerHandle, "WORKER")
  tower.setState(workerHandle, { state: "WORKING", task: "worker witness" })
  expect(tower.acquire(mainHandle, "git-delivery")).toEqual({ granted: true, holder: "Main" })
  expect(tower.acquire(workerHandle, "db-writer")).toEqual({ granted: true, holder: "Worker" })
  workerHandle.db.close()
  mainHandle.db.close()

  const dbPath = join(place.root, "tower.db")
  const database = new Database(dbPath)
  database.run("PRAGMA wal_checkpoint(TRUNCATE)")
  const agents = database.query("SELECT name, role, state, task FROM agent ORDER BY name").all()
  const locks = database.query("SELECT name, holder FROM lock ORDER BY name").all()
  database.close()
  expect(agents).toEqual([
    { name: "Main", role: "MAIN", state: "READY", task: "canonical witness" },
    { name: "Worker", role: "WORKER", state: "WORKING", task: "worker witness" },
  ])
  expect(locks).toEqual([
    { name: "db-writer", holder: "Worker" },
    { name: "git-delivery", holder: "Main" },
  ])

  const storeRoot = join(root, "main-store"), registryPath = join(root, "state", "capabilities.json")
  const binding = {
    project_id: "project-a", revision: 1, repository_root: main, git_common_dir: dirname(place.root),
    remote: "git@example.invalid:a.git", branch: "master", main_session_id: "main-session-a", store_path: storeRoot, epoch: 3,
  }
  const authority = bindMainAuthority({ trustedBindingProvider: () => binding, rederiveBinding: () => ({ ...binding }) })
  const registry = createAgentCapabilityRegistry({ registryPath, authority, capability: authority.capability })
  registry.save({ document: capabilityDocument(), expectedRevision: 0 })
  expect(registry.load()).toEqual(capabilityDocument())
  return { root, main, worker, dbPath, registryPath, storeRoot, binding }
}
const canonicalSnapshot = ({ dbPath, registryPath }) => ({
  tower: readFileSync(dbPath),
  registry: readFileSync(registryPath),
})
const expectCanonicalSnapshot = ({ dbPath, registryPath }, snapshot) => {
  expect(readFileSync(dbPath)).toEqual(snapshot.tower)
  expect(readFileSync(registryPath)).toEqual(snapshot.registry)
}

const loadPlugin = async ({ client, omitProvider = false, providerError, providerValue, drift = false, resources } = {}) => {
  const root = resources?.storeRoot ?? mkdtempSync(join(tmpdir(), "ct-plugin-"))
  if (!resources) directories.push(root)
  const worktree = resources?.main ?? projectRoot
  const binding = resources?.binding ?? {
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
    client: client ?? defaultClient(calls), project: { id: "project-a" }, directory: worktree, worktree,
    experimental_workspace: { register: () => {} }, serverUrl: new URL("http://127.0.0.1"), $: {},
  }
  const { TowerSpikePlugin } = await import("../../plugin/tower-spike.js")
  const plugin = await TowerSpikePlugin(input, omitProvider ? {} : { trustedBindingProvider })
  return { binding, calls, plugin, providerCalls: () => providerCalls, root }
}

const execute = (plugin, input = proposal(), sessionID = "main-session-a", abort = new AbortController().signal, worktree = projectRoot) =>
  plugin.tool.control_tower_support.execute({ proposal: input }, {
    sessionID, messageID: "message-main", agent: "main", directory: worktree, worktree, abort,
    metadata: () => {}, ask: async () => {},
  })

afterEach(() => directories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })))

describe("OpenCode Support bridge", () => {
  test("does not expose in-session root launching", async () => {
    const loaded = await loadPlugin()
    expect(loaded.plugin.launchVisibleRoot).toBeUndefined()
  })

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

  test("never sends authority to Support and preserves canonical Tower and capability registry bytes", async () => {
    const successResources = canonicalIsolationResources()
    const success = await loadPlugin({ resources: successResources })
    const successBytes = canonicalSnapshot(successResources)
    await execute(success.plugin, proposal(), "main-session-a", new AbortController().signal, successResources.main)
    expectCanonicalSnapshot(successResources, successBytes)
    const promptBytes = success.calls.find(([name]) => name === "prompt")[1].body.parts[0].text
    expect(promptBytes).not.toMatch(/main_store|capability|authority/i)

    const rejectedResources = canonicalIsolationResources()
    const rejected = await loadPlugin({ resources: rejectedResources })
    const rejectedBytes = canonicalSnapshot(rejectedResources)
    const poisoned = { context: { main_store: { path: "/forbidden" }, capability: "forbidden", authority: "forbidden" } }
    expect(await code(() => execute(rejected.plugin, poisoned, "main-session-a", new AbortController().signal, rejectedResources.main))).toBe("CT_AUTH_INVALID")
    expect(rejected.calls).toEqual([])
    expectCanonicalSnapshot(rejectedResources, rejectedBytes)
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
