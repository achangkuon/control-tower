import { describe, expect, test } from "bun:test"

import { createPiRuntimeAdapter } from "../../../adapters/pi/runtime.mjs"

const deferred = () => {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
const code = async (operation) => { try { await operation(); return "NO_ERROR" } catch (error) { return error?.code ?? error?.name } }
const identity = (overrides = {}) => ({ pid: 4101, cwd: "/repo/worktree", nonce: "nonce-a", endpointEpoch: "epoch-7", ...overrides })

const fixture = (overrides = {}) => {
  let current = identity()
  const calls = { launch: [], inspect: [], observe: [], health: [], stop: [], send: [] }
  const processes = {
    async launch(request) { calls.launch.push(request); current = identity({ cwd: request.cwd, nonce: request.nonce, endpointEpoch: request.endpointEpoch }); return { pid: current.pid } },
    async inspect(pid) { calls.inspect.push(pid); return current?.pid === pid ? { ...current } : null },
    async observe(expected) { calls.observe.push(expected); return { state: "running", pid: expected.pid } },
    async health(expected) { calls.health.push(expected); return { status: "healthy", pid: expected.pid } },
    async stop(expected) { calls.stop.push(expected); current = null },
    ...overrides.processes,
  }
  const intercom = {
    async send(recipient, envelope) {
      calls.send.push([recipient, envelope])
      return { dispatch_id: envelope.dispatch_id, acknowledged: true, persisted: true, retry_owned: true }
    },
    ...overrides.intercom,
  }
  const ids = [...(overrides.ids ?? ["dispatch-a", "dispatch-b"])]
  const adapter = createPiRuntimeAdapter({ processes, intercom, randomUUID: () => ids.shift() })
  return { adapter, calls, processes, setCurrent: (value) => { current = value } }
}

const onDispatch = (overrides = {}) => ({
  assignmentId: "assignment-1",
  recipient: "worker-1",
  payload: { session: "S1.18" },
  modeContext: { mode: "ON", binding: { scope_id: "scope-1", endpoint_epoch: "epoch-7", persisted: true, retry_owned: true } },
  ...overrides,
})

const offDispatch = (overrides = {}) => ({
  assignmentId: "assignment-off",
  recipient: "worker-live",
  payload: { session: "S1.18" },
  modeContext: { mode: "OFF", peer: { live: true, maintainer_approved: true } },
  ...overrides,
})

describe("S1.18.1 Pi runtime lifecycle", () => {
  test("launches and returns only a frozen Tower-owned identity proven through process inspection", async () => {
    const { adapter, calls } = fixture()
    const handle = await adapter.launch({ cwd: "/repo/worktree", nonce: "nonce-a", endpointEpoch: "epoch-7" })
    expect(handle).toEqual(identity())
    expect(Object.isFrozen(handle)).toBe(true)
    expect(calls.launch).toEqual([{ cwd: "/repo/worktree", nonce: "nonce-a", endpointEpoch: "epoch-7" }])
    expect(calls.inspect).toEqual([4101])
  })

  test("fails closed when launch or attach sees crossed cwd, nonce, epoch, or absent process", async () => {
    for (const observed of [null, identity({ cwd: "/other" }), identity({ nonce: "stale" }), identity({ endpointEpoch: "old" }), identity({ pid: 9999 })]) {
      const { adapter } = fixture({ processes: { inspect: async () => observed } })
      expect(await code(() => adapter.launch({ cwd: "/repo/worktree", nonce: "nonce-a", endpointEpoch: "epoch-7" }))).toBe("CT_PI_PROCESS_OWNERSHIP_INVALID")
      expect(await code(() => adapter.attach(identity()))).toBe("CT_PI_PROCESS_OWNERSHIP_INVALID")
    }
  })

  test("observes and checks health only after revalidating exact PID/cwd identity", async () => {
    const { adapter, calls, setCurrent } = fixture()
    const handle = await adapter.attach(identity())
    expect(await adapter.observe(handle)).toEqual({ state: "running", pid: 4101 })
    expect(await adapter.health(handle)).toEqual({ status: "healthy", pid: 4101 })
    setCurrent(identity({ cwd: "/foreign" }))
    expect(await code(() => adapter.observe(handle))).toBe("CT_PI_PROCESS_OWNERSHIP_INVALID")
    expect(await code(() => adapter.health(handle))).toBe("CT_PI_PROCESS_OWNERSHIP_INVALID")
    expect(calls.observe).toEqual([identity()])
    expect(calls.health).toEqual([identity()])
  })

  test("validates ownership before stop and treats proven disappearance after stop as success", async () => {
    const { adapter, calls, setCurrent } = fixture()
    const handle = await adapter.attach(identity())
    expect(await adapter.stop(handle)).toEqual({ stopped: true, pid: 4101 })
    expect(calls.stop).toEqual([identity()])

    const foreign = fixture()
    const attached = await foreign.adapter.attach(identity())
    foreign.setCurrent(identity({ cwd: "/foreign" }))
    expect(await code(() => foreign.adapter.stop(attached))).toBe("CT_PI_PROCESS_OWNERSHIP_INVALID")
    expect(foreign.calls.stop).toEqual([])
  })
})

describe("S1.18.1 acknowledged dispatch", () => {
  test("generates one stable random dispatch id and exact replay sends only once", async () => {
    const { adapter, calls } = fixture()
    const input = onDispatch(), first = await adapter.dispatch(input), replay = await adapter.dispatch(input)
    expect(first).toBe(replay)
    expect(first).toEqual({ dispatch_id: "dispatch-a", acknowledged: true })
    expect(calls.send).toHaveLength(1)
    expect(calls.send[0][1]).toMatchObject({ kind: "DISPATCH", dispatch_id: "dispatch-a", assignment_id: "assignment-1", mode: "ON" })
    expect(Object.isFrozen(calls.send[0][1])).toBe(true)
    expect(await code(() => adapter.dispatch({ ...input, recipient: "other" }))).toBe("CT_PI_DISPATCH_REPLAY_DIVERGED")
  })

  test("returns after send acknowledgment without awaiting ordinary worker completion", async () => {
    const ordinaryWork = deferred()
    const { adapter } = fixture({ intercom: { send: async (_recipient, envelope) => ({ dispatch_id: envelope.dispatch_id, acknowledged: true, persisted: true, retry_owned: true, ordinaryWork: ordinaryWork.promise }) } })
    expect(await adapter.dispatch(onDispatch())).toEqual({ dispatch_id: "dispatch-a", acknowledged: true })
    ordinaryWork.resolve("later")
  })

  test("enforces Tower-owned ON guarantees and maintainer-approved live peers at the OFF boundary", async () => {
    expect((await fixture().adapter.dispatch(onDispatch())).acknowledged).toBe(true)
    expect((await fixture().adapter.dispatch(offDispatch())).acknowledged).toBe(true)
    for (const modeContext of [
      { mode: "ON", binding: { scope_id: "scope-1", endpoint_epoch: "epoch-7", persisted: false, retry_owned: true } },
      { mode: "ON", binding: { scope_id: "scope-1", endpoint_epoch: "epoch-7", persisted: true, retry_owned: false } },
      { mode: "OFF", peer: { live: false, maintainer_approved: true } },
      { mode: "OFF", peer: { live: true, maintainer_approved: false } },
    ]) expect(await code(() => fixture().adapter.dispatch(onDispatch({ modeContext })))).toBe("CT_PI_MODE_BOUNDARY_INVALID")

    const missingAck = fixture({ intercom: { send: async () => ({ acknowledged: false }) } })
    expect(await code(() => missingAck.adapter.dispatch(onDispatch()))).toBe("CT_PI_DISPATCH_UNACKNOWLEDGED")
  })

  test("rejects random id collisions across distinct assignments", async () => {
    const { adapter } = fixture({ ids: ["same-id", "same-id"] })
    await adapter.dispatch(onDispatch())
    expect(await code(() => adapter.dispatch(onDispatch({ assignmentId: "assignment-2" })))).toBe("CT_PI_DISPATCH_ID_COLLISION")
  })
})
