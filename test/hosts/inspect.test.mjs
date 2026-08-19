import { describe, expect, test } from "bun:test"

import { createHostInspector } from "../../hosts/inspect.mjs"
import { ROOT_AGENT } from "../../hosts/root-identity.mjs"

const sessionId = `ses_${"a".repeat(26)}`
const foreignId = `ses_${"b".repeat(26)}`
const binding = Object.freeze({
  agent: ROOT_AGENT, assignment_ref: "assignment-a", backend_pid: 4321,
  backend_url: "http://127.0.0.1:4096", host_epoch: 3, project_id: "project-a",
  root_session_id: sessionId, worktree: "/work/a",
})
const NOW = 1_700_000_000_000
const observation = Object.freeze({
  agent: ROOT_AGENT, backend_pid: 4321, backend_url: "http://127.0.0.1:4096",
  host_epoch: 3, last_heartbeat_at: NOW, root_session_id: sessionId, worktree: "/work/a",
})
const verdict = Object.freeze({ state: "LIVE", elapsed_ms: 0, probe: "SKIPPED" })
const code = async (operation) => { try { await operation() } catch (error) { return error.code }; return null }
const setup = ({ observe = async () => observation, read = () => binding, classify = async () => verdict } = {}) => {
  const observed = [], classified = []
  const inspector = createHostInspector({
    health: { classify: (input) => { classified.push(input); return classify(input) } },
    observe: (input) => { observed.push(input); return observe(input) },
    rootBinding: { read: (ref) => read(ref) },
  })
  return { classified, inspector, observed }
}

describe("Bound host inspection", () => {
  test("requires the binding, observation and health ports", () => {
    const ports = { health: { classify: async () => verdict }, observe: async () => observation, rootBinding: { read: () => binding } }
    for (const broken of [undefined, {}, { ...ports, health: {} }, { ...ports, health: { classify: true } }, { ...ports, observe: "observe" }, { ...ports, rootBinding: {} }, { ...ports, rootBinding: { read: 1 } }]) {
      expect(() => createHostInspector(broken)).toThrow(TypeError)
    }
    expect(() => createHostInspector(ports)).not.toThrow()
  })

  test("reads the assignment's own binding and reports the exact bound host", async () => {
    const { inspector, observed, classified } = setup()
    const report = await inspector.inspect("assignment-a")
    expect(report).toEqual({
      assignment_ref: "assignment-a", backend_pid: 4321, backend_url: "http://127.0.0.1:4096",
      elapsed_ms: 0, host_epoch: 3, probe: "SKIPPED", project_id: "project-a",
      root_session_id: sessionId, state: "LIVE", worktree: "/work/a",
    })
    expect(Object.isFrozen(report)).toBe(true)
    expect(observed).toEqual([{ backend_pid: 4321, backend_url: "http://127.0.0.1:4096", root_session_id: sessionId, worktree: "/work/a" }])
    expect(classified).toEqual([{ binding, last_heartbeat_at: NOW }])
  })

  // Foreign evidence is never softened into a degraded state: a report about another host is not a report about ours.
  test("refuses an observation that names any backend, process, root, epoch or worktree other than the bound one", async () => {
    const foreign = [
      { ...observation, backend_pid: 4322 },
      { ...observation, backend_url: "http://127.0.0.1:4097" },
      { ...observation, root_session_id: foreignId },
      { ...observation, worktree: "/work/b" },
      { ...observation, host_epoch: 4 },
      { ...observation, agent: "gentle-implementer" },
    ]
    for (const value of foreign) {
      const { inspector, classified } = setup({ observe: async () => value })
      expect(await code(() => inspector.inspect("assignment-a"))).toBe("CT_HOST_INSPECT_FOREIGN")
      expect(classified).toEqual([])
    }
  })

  test("refuses an observation whose shape is inexact, malformed or unavailable", async () => {
    const invalid = [
      { ...observation, extra: true },
      { agent: ROOT_AGENT, backend_pid: 4321 },
      null,
      "observation",
      [observation],
      { ...observation, last_heartbeat_at: undefined },
    ]
    for (const value of invalid) {
      const { inspector } = setup({ observe: async () => value })
      expect(await code(() => inspector.inspect("assignment-a"))).toBe("CT_HOST_INSPECT_INVALID")
    }
    const { inspector } = setup({ observe: async () => { throw new Error("host unreachable") } })
    expect(await code(() => inspector.inspect("assignment-a"))).toBe("CT_HOST_INSPECT_INVALID")
  })

  test("refuses a ref that is not a canonical assignment ref, without touching the store", async () => {
    for (const ref of [undefined, "", "../escape", "a/b", "assignment a", `${"a".repeat(129)}`, 7, null]) {
      const reads = []
      const { inspector } = setup({ read: (value) => { reads.push(value); return binding } })
      expect(await code(() => inspector.inspect(ref))).toBe("CT_HOST_INSPECT_INVALID")
      expect(reads).toEqual([])
    }
  })

  test("propagates the binding store's own typed failure instead of masking it", async () => {
    const { inspector, observed } = setup({ read: () => { throw Object.assign(new Error("gone"), { code: "CT_ROOT_BINDING_INVALID" }) } })
    expect(await code(() => inspector.inspect("assignment-a"))).toBe("CT_ROOT_BINDING_INVALID")
    expect(observed).toEqual([])
  })

  test("refuses a binding whose stored record does not answer for the requested assignment", async () => {
    const { inspector } = setup({ read: () => ({ ...binding, assignment_ref: "assignment-b" }) })
    expect(await code(() => inspector.inspect("assignment-a"))).toBe("CT_HOST_INSPECT_FOREIGN")
  })

  // A missing or broken view is not a health signal, so no view, pane or terminal can reach this module at all.
  test("never accepts or reports a view, pane or terminal", async () => {
    const { inspector, observed } = setup()
    const report = await inspector.inspect("assignment-a")
    for (const key of ["pane_id", "terminal_id", "view", "attached", "manual_command"]) expect(Object.hasOwn(report, key)).toBe(false)
    expect(Object.keys(observed[0]).some((key) => /pane|view|terminal|herdr/i.test(key))).toBe(false)
  })
})
