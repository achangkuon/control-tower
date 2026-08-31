import { describe, expect, test } from "bun:test"

import { createPiSupervisor } from "../../workspace/pi-supervisor.mjs"

const WORKTREE = "/repo/a", DESIRED = "desired-a"
const version = (name) => `control-tower.host-runtime.${name}/v1`
const contextFor = (binding) => [
  { schema_version: version("identity"), runtime_id: binding.runtime_id },
  { schema_version: version("worktree"), worktree_id: binding.worktree_id },
  { schema_version: version("process"), process_id: binding.process_id },
  { schema_version: version("incarnation"), incarnation_id: binding.incarnation_id },
  binding,
]
const errorCode = async (operation) => {
  try { await operation() } catch (error) { return error.code ?? error.constructor.name }
  return null
}

const world = (overrides = {}) => {
  let byte = 0, port = 43100
  const calls = [], closed = [], state = { closeFails: false, drift: null, ...overrides.state }
  const ports = {
    randomBytes: () => Uint8Array.from({ length: 16 }, () => (byte = (byte + 7) % 251)),
    selectLoopbackPort: async () => ++port,
    inspectWorktree: async (path) => ({ canonical_path: path, symlink: false }),
    observeProcess: async () => ({ pid: 4242, cwd: WORKTREE, start_token: "991827" }),
    // Drift is armed by broker.start, so the binding is lost only after the first effect — the one
    // window where the supervisor holds a live broker and must consume its exact close.
    resolveContexts: (binding) => [contextFor(state.drifted ? { ...binding, ...state.driftAfterStart } : binding)],
    runtimeRoute: { prepare: (input) => { calls.push("route.prepare"); return { route_ref: `route-${input.binding.binding_id}` } } },
    broker: {
      start: async (request) => {
        calls.push(["broker.start", request.loopback_port])
        if (state.driftAfterStart) state.drifted = true
        return { close: async () => { calls.push("broker.close"); closed.push(request.loopback_port); if (state.closeFails) throw new Error("close refused") } }
      },
    },
    keepalive: { register: async () => { calls.push("keepalive.register") }, unregister: async () => { calls.push("keepalive.unregister") } },
    ...overrides,
  }
  delete ports.state
  return { calls, closed, state, supervisor: createPiSupervisor(ports) }
}
const started = (calls) => calls.filter((call) => Array.isArray(call) && call[0] === "broker.start")

describe("Tower-owned Pi supervisor", () => {
  test("accepts exactly the two-key input and refuses anything else before any effect", async () => {
    const { calls, supervisor } = world()
    for (const input of [
      undefined, {}, { worktree: WORKTREE }, { desired_ref: DESIRED },
      { desired_ref: DESIRED, worktree: WORKTREE, extra: 1 },
      { desired_ref: "", worktree: WORKTREE }, { desired_ref: DESIRED, worktree: "relative/path" },
    ]) expect(await errorCode(() => supervisor.reconcile(input))).toBe("CT_PI_SUPERVISOR_REJECTED")
    expect(calls).toEqual([])
  })

  test("refuses a route producer that offers a release port, because a route is data", () => {
    expect(() => world({ runtimeRoute: { prepare: () => ({}), release: async () => {} } }))
      .toThrow(TypeError)
  })

  test("runs broker.start as the first effect and returns the exact close to S4.10", async () => {
    const { calls, supervisor } = world()
    const acknowledged = await supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE })

    expect(calls[0]).toBe("route.prepare")
    expect(started(calls)).toHaveLength(1)
    expect(calls.indexOf("keepalive.register")).toBeGreaterThan(calls.findIndex((call) => Array.isArray(call)))
    expect(Object.keys(acknowledged).sort()).toEqual(["binding_id", "desired_ref", "loopback_port", "worktree"])
    expect(Object.isFrozen(acknowledged)).toBe(true)
  })

  test("mints unpredictable identifiers instead of deriving them from the input", async () => {
    const first = await world().supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE })
    expect(first.binding_id).toMatch(/^ct_binding_[0-9a-f]{32}$/)
    expect(JSON.stringify(first)).not.toContain(DESIRED.replace("desired-", "@"))
  })

  test("refuses an aliased or non-canonical worktree with zero broker starts", async () => {
    for (const inspect of [
      async (path) => ({ canonical_path: path, symlink: true }),
      async () => ({ canonical_path: "/repo/elsewhere", symlink: false }),
      async () => ({ canonical_path: WORKTREE }),
      async () => { throw new Error("stat failed") },
    ]) {
      const { calls, supervisor } = world({ inspectWorktree: inspect })
      expect(await errorCode(() => supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE }))).toBe("CT_PI_SUPERVISOR_REJECTED")
      expect(started(calls)).toEqual([])
    }
  })

  test("rejects missing or untrustworthy kernel evidence before broker, keepalive, or publication", async () => {
    for (const observeProcess of [
      undefined,
      async () => "UNKNOWN",
      async () => "ABSENT",
      async () => ({ pid: 4242, cwd: "/caller/asserted", start_token: "991827" }),
      async () => ({ pid: 4242, cwd: WORKTREE, start_token: "" }),
      async () => { throw new Error("proc unreadable") },
    ]) {
      if (observeProcess === undefined) {
        expect(() => world({ observeProcess })).toThrow(TypeError)
        continue
      }
      const { calls, supervisor } = world({ observeProcess })
      expect(await errorCode(() => supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE }))).toBe("CT_PI_PROCESS_NOT_CURRENT")
      expect(started(calls)).toEqual([])
      expect(calls).not.toContain("keepalive.register")
    }
  })

  test("treats a malformed or effectful route as data failure: zero broker starts, zero cleanup", async () => {
    for (const prepare of [
      () => undefined,
      () => "route",
      () => Promise.resolve({ route_ref: "r" }),
      () => ({ route_ref: "r", release: async () => {} }),
      () => { throw new Error("route invalid") },
    ]) {
      const { calls, closed, supervisor } = world({ runtimeRoute: { prepare } })
      expect(await errorCode(() => supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE }))).toBe("CT_PI_SUPERVISOR_REJECTED")
      expect(started(calls)).toEqual([])
      expect(closed).toEqual([])
    }
  })

  test("disposal before start produces zero broker starts and needs no cleanup", async () => {
    const { calls, closed, supervisor } = world()
    await supervisor.dispose()
    expect(await errorCode(() => supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE }))).toBe("CT_PI_SUPERVISOR_DISPOSED")
    expect(started(calls)).toEqual([])
    expect(closed).toEqual([])
  })

  test("converges: the same desired ref and worktree never start a second broker", async () => {
    const { calls, supervisor } = world()
    const input = { desired_ref: DESIRED, worktree: WORKTREE }
    const first = await supervisor.reconcile(input)
    const again = await supervisor.reconcile(input)
    const [concurrentA, concurrentB] = await Promise.all([supervisor.reconcile(input), supervisor.reconcile(input)])

    expect(started(calls)).toHaveLength(1)
    expect(calls.filter((call) => call === "keepalive.register")).toHaveLength(1)
    expect(again).toEqual(first)
    expect(concurrentA).toEqual(first)
    expect(concurrentB).toEqual(first)
  })

  test("fails closed when a different desired ref claims a worktree that already has a broker", async () => {
    const { calls, supervisor } = world()
    await supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE })
    expect(await errorCode(() => supervisor.reconcile({ desired_ref: "desired-b", worktree: WORKTREE }))).toBe("CT_PI_SUPERVISOR_CONFLICT")
    expect(started(calls)).toHaveLength(1)
  })

  // S4.10 owns the acquisition failure vocabulary: anything raised inside acquireAtReservation that
  // is not already a CT_HOST_RUNTIME_ code comes back normalized. These tests therefore assert the
  // observable consequence — whether the exact close was consumed — not a supervisor-invented code.
  test("consumes the exact close when the binding is lost after start", async () => {
    const { calls, closed, supervisor } = world({ state: { driftAfterStart: { process_id: `ct_process_${"9".repeat(32)}` } } })
    expect(await errorCode(() => supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE }))).toBe("CT_HOST_RUNTIME_BINDING_CROSSED")
    expect(started(calls)).toHaveLength(1)
    expect(closed).toHaveLength(1)
    expect(supervisor.quarantined()).toEqual([])
  })

  test("consumes the exact close when keepalive refuses after start", async () => {
    const { calls, closed, supervisor } = world({ keepalive: { register: async () => { throw new Error("keepalive refused") }, unregister: async () => {} } })
    expect(await errorCode(() => supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE }))).toBe("CT_HOST_RUNTIME_ACQUISITION_FAILED")
    expect(started(calls)).toHaveLength(1)
    expect(closed).toHaveLength(1)
    expect(supervisor.quarantined()).toEqual([])
  })

  test("quarantines when the exact close cannot be confirmed, and blocks replacement", async () => {
    const { calls, supervisor } = world({
      state: { closeFails: true },
      keepalive: { register: async () => { throw new Error("keepalive refused") }, unregister: async () => {} },
    })
    await errorCode(() => supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE }))
    expect(supervisor.quarantined()).toEqual([{ worktree: WORKTREE, loopback_port: 43101 }])
    expect(Object.isFrozen(supervisor.quarantined())).toBe(true)

    // Replacement is refused before any effect, and by the supervisor's own vocabulary this time.
    expect(await errorCode(() => supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE }))).toBe("CT_PI_SUPERVISOR_QUARANTINED")
    expect(started(calls)).toHaveLength(1)
  })

  test("never reconstructs cleanup: a broker that refuses to start leaves nothing to close", async () => {
    const { calls, closed, supervisor } = world({ broker: { start: async () => { calls.push("broker.start.failed"); throw new Error("refused") } } })
    expect(await errorCode(() => supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE }))).toBe("CT_HOST_RUNTIME_ACQUISITION_FAILED")
    expect(closed).toEqual([])
    expect(supervisor.quarantined()).toEqual([])
  })

  test("rejects a broker that resolves without an exact close capability", async () => {
    const { calls, closed, supervisor } = world({ broker: { start: async () => { calls.push(["broker.start", 0]); return { close: "not-callable" } } } })
    expect(await errorCode(() => supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE }))).toBe("CT_HOST_RUNTIME_ACQUISITION_FAILED")
    expect(closed).toEqual([])
    expect(supervisor.quarantined()).toEqual([])
  })

  test("adds no durable messaging: the supervisor exposes only reconcile, quarantined and dispose", () => {
    const { supervisor } = world()
    expect(Object.keys(supervisor).sort()).toEqual(["dispose", "quarantined", "reconcile"])
    expect(Object.isFrozen(supervisor)).toBe(true)
  })

  test("honours a disposal that lands while an attempt is already in flight", async () => {
    let release
    const gate = new Promise((resolve) => { release = resolve })
    const { calls, closed, supervisor } = world({ selectLoopbackPort: async () => { await gate; return 43101 } })
    const attempt = supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE })
    await supervisor.dispose()
    release()

    expect(await errorCode(() => attempt)).toBe("CT_HOST_RUNTIME_ACQUISITION_FAILED")
    expect(started(calls)).toEqual([])
    expect(closed).toEqual([])
    expect(supervisor.quarantined()).toEqual([])
  })

  test("keeps one broker per worktree, not one in total", async () => {
    let kernelCwd = WORKTREE
    const { calls, supervisor } = world({ observeProcess: async () => ({ pid: 4242, cwd: kernelCwd, start_token: "991827" }) })
    const first = await supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE })
    kernelCwd = "/repo/b"
    const second = await supervisor.reconcile({ desired_ref: "desired-b", worktree: "/repo/b" })

    expect(started(calls)).toHaveLength(2)
    expect(second.loopback_port).not.toBe(first.loopback_port)
    expect(second.binding_id).not.toBe(first.binding_id)
  })

  test("does not settle a failed attempt, so a later reconcile may still succeed", async () => {
    let refuse = true
    const { calls, supervisor } = world({
      keepalive: { register: async () => { if (refuse) throw new Error("keepalive refused") }, unregister: async () => {} },
    })
    await errorCode(() => supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE }))
    refuse = false
    const acknowledged = await supervisor.reconcile({ desired_ref: DESIRED, worktree: WORKTREE })

    expect(acknowledged.worktree).toBe(WORKTREE)
    expect(started(calls)).toHaveLength(2)
  })

  test("gives concurrent callers the same failure without starting a second broker", async () => {
    const { calls, supervisor } = world({ keepalive: { register: async () => { throw new Error("keepalive refused") }, unregister: async () => {} } })
    const input = { desired_ref: DESIRED, worktree: WORKTREE }
    const [a, b] = await Promise.all([errorCode(() => supervisor.reconcile(input)), errorCode(() => supervisor.reconcile(input))])

    expect(a).toBe("CT_HOST_RUNTIME_ACQUISITION_FAILED")
    expect(b).toBe(a)
    expect(started(calls)).toHaveLength(1)
  })

  test("requires every port it will call, refusing construction rather than failing mid-acquisition", () => {
    for (const missing of ["randomBytes", "selectLoopbackPort", "inspectWorktree", "observeProcess", "resolveContexts", "runtimeRoute", "broker", "keepalive"]) {
      expect(() => world({ [missing]: undefined })).toThrow(TypeError)
    }
  })
})
