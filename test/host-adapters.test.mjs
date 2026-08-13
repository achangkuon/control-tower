import { describe, expect, mock, test } from "bun:test"
import { readFileSync } from "node:fs"
import { defineHostAdapterConformance } from "./helpers/host-adapter-conformance.mjs"

const tool = Object.assign((definition) => definition, { schema: { unknown: () => ({}) } })
const actualSupport = await import("../continuation/support.mjs")
mock.module("@opencode-ai/plugin", () => ({ tool }))
mock.module("../continuation/support.mjs", () => actualSupport)
const towerSpike = await import("../plugin/tower-spike.js")
const { createOpenCodeLifecycleAdapter } = towerSpike

const ROOT = "root-session"
const CHILD = "child-session"
const POLICY = Object.freeze({
  pollIntervalMs: 2_000,
  wakeWindowMs: 5 * 60_000,
  maxWakeAttemptsPerWindow: 15,
  retryDelaysMs: Object.freeze([1_000, 2_000, 4_000]),
})
const deferred = () => {
  let reject
  let resolve
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, reject, resolve }
}
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}
const createTransportFixture = ({ pending = null, peek } = {}) => {
  let root = ROOT
  let epoch = 1
  const queue = []
  const calls = { cancel: [], peek: [], prompt: [], trace: [] }
  const capability = Object.freeze({
    get binding_epoch() { return epoch },
    get root_session_id() { return root },
    async peek(input) {
      const call = { input, result: undefined }
      calls.peek.push(call)
      call.result = peek ? await peek(input) : pending
      return call.result
    },
  })
  const client = { session: { promptAsync: async (input) => { calls.prompt.push(input) } } }
  const ports = {
    cancel(handle) { calls.cancel.push(handle); handle.canceled = true },
    client,
    continuationCapability: capability,
    now: () => 0,
    policy: POLICY,
    schedule(callback, delayMs) {
      const handle = { callback, canceled: false, delayMs }
      queue.push(handle)
      return handle
    },
    trace(event, attributes) { calls.trace.push({ event, attributes }) },
  }
  return {
    calls,
    capability,
    create: () => towerSpike.createOpenCodeAdapter(ports),
    drift: ({ bindingEpoch = epoch, rootSessionId = root } = {}) => {
      epoch = bindingEpoch
      root = rootSessionId
    },
    ports,
    queue,
    runNext: () => queue.shift().callback(),
  }
}
const createController = (calls) => Object.freeze({
  bindRoot(id) { calls.push(["bind-root", id]); return true },
  dispose(reason) { calls.push(["dispose-plugin", reason]) },
  rootDeleted(id) { calls.push(["delete-root", id]); return true },
  rootSettled(id) { calls.push(["settle-root", id]); return true },
})
const created = (id, parentID) => ({ type: "session.created", properties: { info: { id, parentID } } })
const deleted = (id, extra = {}) => ({ type: "session.deleted", properties: { info: { id }, ...extra } })
const idle = (sessionID, extra = {}) => ({ type: "session.idle", properties: { sessionID, ...extra } })
const createFixture = () => {
  const calls = []
  const adapter = createOpenCodeLifecycleAdapter({
    controller: createController(calls),
    provenRootSessionId: ROOT,
  })
  return {
    actions: Object.freeze({
      createChild: () => adapter.event(created(CHILD, ROOT)),
      deleteChild: () => adapter.event(deleted(CHILD)),
      deleteRoot: () => adapter.event(deleted(ROOT)),
      dispose: () => adapter.dispose(),
      idleChild: () => adapter.event(idle(CHILD)),
      settleRoot: () => adapter.event(idle(ROOT)),
    }),
    adapter,
    calls,
    observe: () => calls.map(([name]) => name),
  }
}
defineHostAdapterConformance({ host: "OpenCode", createFixture })
describe("OpenCode lifecycle classification", () => {
  test("binds the proven root exactly once and forwards exact root effects", () => {
    const { adapter, calls } = createFixture()
    adapter.event(idle(ROOT))
    adapter.event(idle(ROOT))
    adapter.event(deleted(ROOT))
    expect(calls).toEqual([
      ["bind-root", ROOT],
      ["settle-root", ROOT],
      ["settle-root", ROOT],
      ["delete-root", ROOT],
    ])
  })
  test("unknown event order never promotes an identity to root", () => {
    const { adapter, calls } = createFixture()
    adapter.event(deleted(CHILD))
    adapter.event(idle(CHILD))
    adapter.event(created(CHILD, ROOT))
    adapter.event(idle(ROOT))
    expect(calls).toEqual([["bind-root", ROOT], ["settle-root", ROOT]])
  })
  test("foreign parent identities stay unknown and preserve the exact disposal reason", () => {
    const NativeSet = globalThis.Set
    const cacheOperations = []
    globalThis.Set = class ObservableSet extends NativeSet {
      add(value) { cacheOperations.push(["add", value]); return super.add(value) }
      delete(value) { cacheOperations.push(["delete", value]); return super.delete(value) }
    }
    let fixture
    try { fixture = createFixture() } finally {
      globalThis.Set = NativeSet
    }
    fixture.adapter.event(created(CHILD, "foreign-root"))
    fixture.adapter.event(idle(CHILD))
    fixture.adapter.event(deleted(CHILD))
    fixture.adapter.event(idle(ROOT))
    fixture.adapter.dispose()
    expect({ cacheOperations, calls: fixture.calls }).toEqual({
      cacheOperations: [],
      calls: [
        ["bind-root", ROOT],
        ["settle-root", ROOT],
        ["dispose-plugin", "plugin-dispose"],
      ],
    })
  })
  test("incomplete and malformed metadata fail closed", () => {
    for (const event of [
      null,
      {},
      { type: "session.created" },
      { type: "session.created", properties: { info: { id: CHILD } } },
      { type: "session.created", properties: { info: { id: CHILD, parentID: "" } } },
      { type: "session.idle", properties: {} },
      { type: "session.idle", properties: { sessionID: 7 } },
      { type: "session.deleted", properties: { info: {} } },
    ]) {
      const { adapter, calls } = createFixture()
      adapter.event(event)
      expect(calls).toEqual([["bind-root", ROOT]])
    }
  })
  test("conflicting event identities are unknown rather than root", () => {
    const { adapter, calls } = createFixture()
    adapter.event(idle(ROOT, { info: { id: CHILD, parentID: ROOT } }))
    adapter.event(deleted(CHILD, { sessionID: ROOT }))
    adapter.event(created(ROOT, ROOT))
    expect(calls).toEqual([["bind-root", ROOT]])
  })
  test("child cleanup cannot stop later root polling", () => {
    const { adapter, calls } = createFixture()
    adapter.event(created(CHILD, ROOT))
    adapter.event(idle(ROOT))
    adapter.event(deleted(CHILD))
    adapter.event(idle(ROOT))
    expect(calls).toEqual([
      ["bind-root", ROOT],
      ["settle-root", ROOT],
      ["settle-root", ROOT],
    ])
  })
  test("disposal and matching deletion invalidate during the call", () => {
    for (const action of ["deleteRoot", "dispose"]) {
      const fixture = createFixture()
      let returned = false
      fixture.actions[action]()
      returned = true
      expect(returned).toBe(true)
      expect(fixture.observe()).toEqual(action === "deleteRoot"
        ? ["bind-root", "delete-root"]
        : ["bind-root", "dispose-plugin"])
    }
  })
  test("root deletion suppresses every later lifecycle effect", () => {
    const { adapter, calls } = createFixture()
    adapter.event(deleted(ROOT))
    adapter.event(idle(ROOT))
    adapter.dispose()
    expect(calls).toEqual([["bind-root", ROOT], ["delete-root", ROOT]])
  })
  test("generic conformance helper contains no host-specific field names", () => {
    const source = readFileSync(new URL("./helpers/host-adapter-conformance.mjs", import.meta.url), "utf8")
    expect(source).not.toMatch(/OpenCode|sessionID|parentID|properties|session\./)
  })
  test("adapter source has no storage, consuming receive, or delivery claim path", () => {
    const source = readFileSync(new URL("../plugin/tower-spike.js", import.meta.url), "utf8")
    expect(source).not.toMatch(/SQLite|core\.mjs|mcp\.mjs|\.receive\s*\(|\.claim\s*\(/)
  })
})

describe("OpenCode continuation transport", () => {
  test("exports the internal adapter and composes polling in the plugin", async () => {
    expect(typeof towerSpike.createOpenCodeAdapter).toBe("function")
    const fixture = createTransportFixture()
    const plugin = await towerSpike.TowerSpikePlugin({ client: fixture.ports.client }, fixture.ports)
    plugin.event({ event: idle(ROOT) })
    expect(fixture.queue.map(({ delayMs }) => delayMs)).toEqual([0])
  })

  test("keeps Support available without a valid continuation capability", () => {
    const base = createTransportFixture().ports
    expect(towerSpike.createOpenCodeAdapter({ ...base, continuationCapability: undefined })).toBeNull()
    for (const continuationCapability of [
      { peek() {}, root_session_id: "", binding_epoch: 1 },
      { peek() {}, root_session_id: ROOT, binding_epoch: 0 },
      { peek() {}, root_session_id: ROOT, binding_epoch: 1.5 },
      { root_session_id: ROOT, binding_epoch: 1 },
    ]) {
      expect(towerSpike.createOpenCodeAdapter({ ...base, continuationCapability })).toBeNull()
    }
  })

  test("keeps Support available without polling when the peek accessor throws", async () => {
    const fixture = createTransportFixture()
    const continuationCapability = {
      binding_epoch: 1,
      root_session_id: ROOT,
      get peek() { throw new Error("invalid capability shape") },
    }
    const plugin = await towerSpike.TowerSpikePlugin(
      { client: fixture.ports.client },
      { ...fixture.ports, continuationCapability },
    )
    expect(plugin.tool.control_tower_support).toBeDefined()
    plugin.event({ event: idle(ROOT) })
    expect(fixture.queue).toHaveLength(0)
  })

  test("invalidates root or epoch drift before peek and after async settlement", async () => {
    const before = createTransportFixture({ pending: Object.freeze({ pending: true }) })
    const beforeAdapter = before.create()
    beforeAdapter.event(idle(ROOT))
    before.drift({ rootSessionId: "other-root" })
    await before.runNext()
    expect(before.calls.peek).toHaveLength(0)
    expect(before.calls.prompt).toHaveLength(0)
    expect(before.calls.trace).toContainEqual(expect.objectContaining({
      attributes: expect.objectContaining({ code: "CT_AUTH_INVALID" }),
    }))
    expect(beforeAdapter.event(idle(ROOT))).toBe(false)

    const pendingPeek = deferred()
    const after = createTransportFixture({ peek: () => pendingPeek.promise })
    const afterAdapter = after.create()
    afterAdapter.event(idle(ROOT))
    const running = after.runNext()
    await flush()
    expect(after.calls.peek).toHaveLength(1)
    after.drift({ bindingEpoch: 2 })
    pendingPeek.resolve(Object.freeze({ pending: true }))
    await running
    expect(after.calls.prompt).toHaveLength(0)
    expect(after.calls.trace).toContainEqual(expect.objectContaining({
      attributes: expect.objectContaining({ code: "CT_AUTH_INVALID" }),
    }))
    expect(afterAdapter.event(idle(ROOT))).toBe(false)
  })

  test("invalidates authority drift after a deferred wake before loop effects", async () => {
    const pendingWake = deferred()
    const fixture = createTransportFixture({ pending: Object.freeze({ pending: true }) })
    fixture.ports.client.session.promptAsync = (input) => {
      fixture.calls.prompt.push(input)
      return pendingWake.promise
    }
    const adapter = fixture.create()
    adapter.event(idle(ROOT))
    const running = fixture.runNext()
    await flush()
    expect(fixture.calls.prompt).toHaveLength(1)
    fixture.drift({ bindingEpoch: 2 })
    pendingWake.resolve()
    await running
    expect(fixture.calls.trace).toContainEqual(expect.objectContaining({
      attributes: expect.objectContaining({ code: "CT_AUTH_INVALID" }),
    }))
    expect(fixture.queue).toHaveLength(0)
    expect(adapter.event(idle(ROOT))).toBe(false)
  })

  test("wakes a later pending item once with the exact generic prompt", async () => {
    const sentinel = Object.freeze({ task: "do not interpolate me" })
    let polls = 0
    const fixture = createTransportFixture({ peek: async () => (++polls === 1 ? null : sentinel) })
    const adapter = fixture.create()
    adapter.event(idle(ROOT))
    await fixture.runNext()
    expect(fixture.calls.prompt).toHaveLength(0)
    expect(fixture.queue.at(-1).delayMs).toBe(2_000)
    await fixture.runNext()
    expect(fixture.calls.prompt).toEqual([{
      path: { id: ROOT },
      body: { parts: [{ type: "text", text: "Continue from the pending task in Control Tower." }] },
    }])
    expect(JSON.stringify(fixture.calls.prompt)).not.toContain(sentinel.task)
  })

  test("retries a rejected wake without consuming the pending sentinel", async () => {
    const sentinel = Object.freeze({ pending: "same-object" })
    const fixture = createTransportFixture({ pending: sentinel })
    fixture.ports.client.session.promptAsync = async (input) => {
      fixture.calls.prompt.push(input)
      throw Object.assign(new Error("offline"), { code: "CT_HOST_CAPABILITY_MISSING" })
    }
    const adapter = fixture.create()
    adapter.event(idle(ROOT))
    await fixture.runNext()
    expect(fixture.queue.at(-1).delayMs).toBe(1_000)
    expect(fixture.calls.trace).toContainEqual({
      event: "poll.wake_failed",
      attributes: expect.objectContaining({ code: "CT_HOST_CAPABILITY_MISSING" }),
    })
    await fixture.runNext()
    expect(fixture.calls.peek).toHaveLength(2)
    expect(fixture.calls.peek.map(({ result }) => result)).toEqual([sentinel, sentinel])
    expect(fixture.calls.prompt).toHaveLength(2)
    expect(fixture.calls.prompt[0]).toEqual(fixture.calls.prompt[1])
  })
})
