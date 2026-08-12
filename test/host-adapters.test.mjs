import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { createOpenCodeLifecycleAdapter } from "../plugin/tower-spike.js"
import { defineHostAdapterConformance } from "./helpers/host-adapter-conformance.mjs"
const ROOT = "root-session"
const CHILD = "child-session"
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
