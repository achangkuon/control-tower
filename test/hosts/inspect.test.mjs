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
  agent: ROOT_AGENT, backend_pid: 4321, backend_url: "http://127.0.0.1:4096", host_epoch: 3,
  last_heartbeat_at: NOW, observed_since: NOW - 600_000, root_session_id: sessionId, worktree: "/work/a",
})
const verdict = Object.freeze({ state: "LIVE", elapsed_ms: 0, probe: "SKIPPED", probe_cause: null })
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
      elapsed_ms: 0, host_epoch: 3, probe: "SKIPPED", probe_cause: null, project_id: "project-a",
      root_session_id: sessionId, state: "LIVE", worktree: "/work/a",
    })
    expect(Object.isFrozen(report)).toBe(true)
    expect(observed).toEqual([{ backend_pid: 4321, backend_url: "http://127.0.0.1:4096", root_session_id: sessionId, worktree: "/work/a" }])
    expect(classified).toEqual([{ binding, last_heartbeat_at: NOW, observed_since: NOW - 600_000 }])
  })

  // The verdict is what an operator acts on, so every state and its cause must survive composition intact.
  test("composes a degraded verdict into the report without altering the bound identity", async () => {
    const degraded = [
      { state: "SUSPECTED", elapsed_ms: 45_001, probe: "SKIPPED", probe_cause: null },
      { state: "SUSPECTED", elapsed_ms: 60_000, probe: "PASSED", probe_cause: null },
      { state: "UNAVAILABLE", elapsed_ms: 90_000, probe: "FAILED", probe_cause: "connect ECONNREFUSED" },
    ]
    for (const value of degraded) {
      const { inspector } = setup({ classify: async () => value })
      const report = await inspector.inspect("assignment-a")
      expect(report.state).toBe(value.state)
      expect(report.elapsed_ms).toBe(value.elapsed_ms)
      expect(report.probe).toBe(value.probe)
      expect(report.probe_cause).toBe(value.probe_cause)
      expect(report.backend_pid).toBe(binding.backend_pid)
      expect(report.root_session_id).toBe(binding.root_session_id)
      expect(report.worktree).toBe(binding.worktree)
    }
  })

  // The health port is injected, so its answer is checked like any other port output rather than trusted —
  // otherwise a verdict carrying bound-identity keys would overwrite the very fields we just verified.
  test("refuses a malformed health verdict instead of letting it overwrite the bound identity", async () => {
    const malformed = [
      { ...verdict, worktree: "/work/b" },
      { ...verdict, state: "DEAD" },
      { ...verdict, probe: "MAYBE" },
      { ...verdict, elapsed_ms: -1 },
      { ...verdict, probe_cause: 7 },
      { state: "LIVE", elapsed_ms: 0 },
      null,
    ]
    for (const value of malformed) {
      const { inspector } = setup({ classify: async () => value })
      expect(await code(() => inspector.inspect("assignment-a"))).toBe("CT_HOST_INSPECT_INVALID")
    }
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

  test("refuses an observation whose shape is inexact or malformed", async () => {
    const invalid = [
      { ...observation, extra: true },
      { agent: ROOT_AGENT, backend_pid: 4321 },
      null,
      "observation",
      [observation],
      { ...observation, last_heartbeat_at: undefined },
      { ...observation, observed_since: null },
    ]
    for (const value of invalid) {
      const { inspector } = setup({ observe: async () => value })
      expect(await code(() => inspector.inspect("assignment-a"))).toBe("CT_HOST_INSPECT_INVALID")
    }
  })

  // A host we cannot reach is a different operator problem from a host that answered nonsense.
  test("separates an unreachable host from a malformed answer, and keeps the cause", async () => {
    const { inspector } = setup({ observe: async () => { throw new Error("host unreachable") } })
    let failure
    try { await inspector.inspect("assignment-a") } catch (error) { failure = error }
    expect(failure.code).toBe("CT_HOST_INSPECT_UNAVAILABLE")
    expect(failure.cause?.message).toBe("host unreachable")
  })

  // The observe port's own typed refusal is already a finding; restating it as ours would lose it.
  test("propagates a typed failure from the observation port unchanged", async () => {
    const { inspector } = setup({ observe: async () => { throw Object.assign(new Error("fenced"), { code: "CT_BACKEND_REJECTED" }) } })
    expect(await code(() => inspector.inspect("assignment-a"))).toBe("CT_BACKEND_REJECTED")
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
})
