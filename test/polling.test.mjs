import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

import { createPollingLoop } from "../host/loop.mjs"

const deferred = () => {
  let resolve
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const createHarness = ({
  cancelThrows = false,
  peek = async () => null,
  traceThrows = false,
  wake = async () => {},
} = {}) => {
  const calls = { cancel: [], peek: [], schedule: [], trace: [], wake: [] }
  const queue = []
  let now = 0

  const loop = createPollingLoop({
    cancel(handle) {
      calls.cancel.push({ handle, state: loop.getState().state })
      handle.canceled = true
      if (cancelThrows) throw new Error("cancel failed")
    },
    now: () => now,
    peek(input) {
      calls.peek.push(input)
      return peek(input)
    },
    schedule(callback, delayMs) {
      const handle = { at: now + delayMs, callback, canceled: false, delayMs }
      calls.schedule.push(handle)
      queue.push(handle)
      return handle
    },
    trace(event, attributes) {
      calls.trace.push({ attributes, event })
      if (traceThrows) throw new Error("trace failed")
    },
    wake(input) {
      calls.wake.push(input)
      return wake(input)
    },
  })
  const runNext = () => {
    const handle = queue.shift()
    if (!handle) throw new Error("no callback scheduled")
    now = handle.at
    return handle.callback()
  }
  return { calls, loop, queue, runNext }
}
const bindAndSettle = (harness, root = "root-A") => {
  expect(harness.loop.bindRoot(root)).toBe(true)
  expect(harness.loop.rootSettled(root)).toBe(true)
}
describe("host-neutral polling lifecycle", () => {
  test("binds the first valid opaque root once without scheduling", () => {
    const { calls, loop } = createHarness()
    for (const invalid of [undefined, null, "", "\0", "root\0child", 42, {}]) {
      expect(loop.bindRoot(invalid)).toBe(false)
    }
    expect(loop.getState()).toMatchObject({ rootBound: false, state: "UNBOUND" })
    expect(loop.bindRoot("root-A")).toBe(true)
    expect(loop.bindRoot("root-A")).toBe(true)
    expect(loop.bindRoot("root-B")).toBe(false)
    expect(loop.getState()).toMatchObject({ rootBound: true, state: "BOUND" })
    expect(calls.schedule).toHaveLength(0)
    expect(calls.trace.map(({ event }) => event)).toEqual([
      "poll.root_bound",
      "poll.root_conflict",
    ])
  })
  test("starts one immediate one-shot callback only for the exact settled root", () => {
    const harness = createHarness()
    const { calls, loop } = harness
    expect(loop.rootSettled("root-A")).toBe(false)
    expect(loop.bindRoot("root-A")).toBe(true)
    expect(loop.rootSettled("root-B")).toBe(false)
    expect(loop.rootSettled("root-A")).toBe(true)
    expect(loop.rootSettled("root-A")).toBe(true)
    expect(calls.schedule).toHaveLength(1)
    expect(calls.schedule[0].delayMs).toBe(0)
    expect(loop.getState()).toMatchObject({
      generation: 2,
      state: "POLLING",
      timerScheduled: true,
    })
  })
  test("generation rotation makes a replayed one-shot callback stale", async () => {
    const harness = createHarness({ peek: async () => Object.freeze({ pending: true }) })
    bindAndSettle(harness)
    const stale = harness.queue[0].callback
    await harness.runNext()
    expect(harness.loop.getState().state).toBe("AWAITING_SETTLE")
    expect(harness.loop.rootSettled("root-A")).toBe(true)
    await stale()
    expect(harness.calls.peek).toHaveLength(1)
    expect(harness.calls.schedule).toHaveLength(2)
  })
  test("matching root deletion synchronously invalidates queued work", async () => {
    const harness = createHarness()
    bindAndSettle(harness)
    expect(harness.loop.rootDeleted("root-B")).toBe(false)
    expect(harness.loop.rootDeleted("root-A")).toBe(true)
    expect(harness.loop.getState()).toMatchObject({
      state: "DISPOSED",
      timerScheduled: false,
    })
    expect(harness.calls.cancel).toHaveLength(1)
    await harness.runNext()
    expect(harness.calls.peek).toHaveLength(0)
    expect(harness.calls.wake).toHaveLength(0)
    expect(harness.loop.rootDeleted("root-A")).toBe(false)
  })
  test("plugin disposal is synchronous, idempotent, and makes queued callbacks stale", async () => {
    const harness = createHarness()
    bindAndSettle(harness)
    expect(harness.loop.dispose("plugin-dispose")).toBeUndefined()
    const disposed = harness.loop.getState()
    harness.loop.dispose("plugin-dispose-again")
    expect(harness.loop.getState()).toEqual(disposed)
    expect(harness.calls.cancel).toHaveLength(1)
    expect(harness.calls.trace.filter(({ event }) => event === "poll.disposed")).toHaveLength(1)
    await harness.runNext()
    expect(harness.calls.peek).toHaveLength(0)
  })
  test("disposal during deferred peek prevents a later wake", async () => {
    const pendingPeek = deferred()
    const harness = createHarness({ peek: () => pendingPeek.promise })
    bindAndSettle(harness)
    const running = harness.runNext()
    await flush()
    expect(harness.calls.peek).toHaveLength(1)
    harness.loop.dispose("during-peek")
    expect(harness.calls.peek[0].signal.aborted).toBe(true)
    pendingPeek.resolve(Object.freeze({ private: "descriptor" }))
    await running
    expect(harness.calls.wake).toHaveLength(0)
    expect(harness.loop.getState().state).toBe("DISPOSED")
  })
  test("disposal during deferred wake makes its completion inert", async () => {
    const pendingWake = deferred()
    const descriptor = Object.freeze({ private: "descriptor" })
    const harness = createHarness({
      peek: async () => descriptor,
      wake: () => pendingWake.promise,
    })
    bindAndSettle(harness)
    const running = harness.runNext()
    await flush()
    expect(harness.calls.wake).toHaveLength(1)
    harness.loop.dispose("during-wake")
    expect(harness.calls.wake[0].signal.aborted).toBe(true)
    pendingWake.resolve()
    await running

    expect(harness.calls.peek).toHaveLength(1)
    expect(harness.calls.wake).toHaveLength(1)
    expect(harness.calls.schedule).toHaveLength(1)
    expect(harness.loop.getState()).toMatchObject({
      state: "DISPOSED",
      tickInFlight: false,
      wakeInFlight: false,
    })
  })

  test("cancellation and trace failures cannot reverse synchronous disposal", async () => {
    const harness = createHarness({ cancelThrows: true, traceThrows: true })

    expect(() => bindAndSettle(harness)).not.toThrow()
    expect(() => harness.loop.dispose("host-failure")).not.toThrow()
    expect(harness.loop.getState().state).toBe("DISPOSED")
    expect(harness.calls.cancel[0].state).toBe("DISPOSED")
    expect(harness.calls.trace.at(-1)).toMatchObject({ attributes: { state: "DISPOSED" } })
    await harness.runNext()
    expect(harness.calls.peek).toHaveLength(0)
  })

  test("diagnostic state is frozen and exposes no root or descriptor", () => {
    const descriptor = Object.freeze({ secret: "never expose" })
    const harness = createHarness({ peek: async () => descriptor })
    expect(harness.loop.bindRoot("secret-root")).toBe(true)

    const state = harness.loop.getState()
    expect(Object.isFrozen(state)).toBe(true)
    expect(Object.keys(state).sort()).toEqual([
      "cycleAttempts",
      "generation",
      "rootBound",
      "state",
      "tickInFlight",
      "timerScheduled",
      "wakeInFlight",
      "windowAttempts",
    ])
    expect(JSON.stringify(state)).not.toContain("secret-root")
    expect(JSON.stringify(state)).not.toContain("never expose")
  })

  test("controller source has no host, persistence, receive, or claim dependency", () => {
    const source = readFileSync(new URL("../host/loop.mjs", import.meta.url), "utf8")
    expect(source).not.toMatch(/(?:opencode|sqlite|core\.mjs|mcp\.mjs)/i)
    expect(source).not.toMatch(/\.(?:receive|claim)\s*\(/)
  })
})
