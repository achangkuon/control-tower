import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

import { createPollingLoop } from "../host/loop.mjs"

const POLICY = Object.freeze({
  pollIntervalMs: 2_000,
  wakeWindowMs: 5 * 60_000,
  maxWakeAttemptsPerWindow: 15,
  retryDelaysMs: Object.freeze([1_000, 2_000, 4_000]),
})

const deferred = () => {
  let reject
  let resolve
  const promise = new Promise((resolvePromise, rejectPromise) => {
    reject = rejectPromise
    resolve = resolvePromise
  })
  return { promise, reject, resolve }
}

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const createHarness = ({
  cancelThrows = false,
  nowPort,
  peek = async () => null,
  policy = POLICY,
  scheduleThrows = false,
  traceThrows = false,
  wake = async () => {},
} = {}) => {
  const calls = { cancel: [], now: [], peek: [], schedule: [], trace: [], wake: [] }
  const queue = []
  let now = 0

  const loop = createPollingLoop({
    cancel(handle) {
      calls.cancel.push({ handle, state: loop.getState().state })
      handle.canceled = true
      if (cancelThrows) throw new Error("cancel failed")
    },
    now() {
      const value = nowPort ? nowPort() : now
      calls.now.push(value)
      return value
    },
    peek(input) {
      calls.peek.push(input)
      return peek(input)
    },
    policy,
    schedule(callback, delayMs) {
      if (scheduleThrows) throw new Error("schedule failed")
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
  const setNow = (value) => { now = value }
  return { calls, loop, queue, runNext, setNow }
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

describe("polling and wake safety", () => {
  test("requires the exact deeply frozen baseline policy", () => {
    const mutable = { ...POLICY, retryDelaysMs: [1_000, 2_000, 4_000] }
    const wrong = Object.freeze({ ...POLICY, pollIntervalMs: 1_999 })
    const shallow = Object.freeze({ ...mutable })

    for (const policy of [null, mutable, shallow, wrong]) {
      expect(() => createHarness({ policy })).toThrow(TypeError)
    }
    expect(() => createPollingLoop({
      cancel() {}, now() { return 0 }, peek() {}, schedule() {}, trace() {}, wake() {},
    })).toThrow(TypeError)
    expect(() => createHarness()).not.toThrow()
  })

  test("ordinary polling schedules after empty and rejected peeks", async () => {
    let attempt = 0
    const harness = createHarness({
      peek: async () => {
        attempt += 1
        if (attempt === 1) return null
        throw Object.assign(new Error("transport private"), { name: "TransportError" })
      },
    })
    bindAndSettle(harness)

    await harness.runNext()
    expect(harness.calls.schedule.map(({ delayMs }) => delayMs)).toEqual([0, 2_000])
    expect(harness.loop.getState()).toMatchObject({ cycleAttempts: 0, state: "POLLING" })

    await harness.runNext()
    expect(harness.calls.schedule.map(({ delayMs }) => delayMs)).toEqual([0, 2_000, 2_000])
    expect(harness.calls.wake).toHaveLength(0)
    expect(harness.calls.trace.at(-2)).toMatchObject({
      attributes: { name: "TransportError" },
      event: "poll.peek_failed",
    })
  })

  test("records one attempt before a serialized wake invocation", async () => {
    const pendingWake = deferred()
    const descriptor = Object.freeze({ opaque: "pending" })
    let observed
    let harness
    harness = createHarness({
      peek: async () => descriptor,
      wake: () => {
        observed = harness.loop.getState()
        return pendingWake.promise
      },
    })
    bindAndSettle(harness)
    const duplicate = harness.queue[0].callback

    const running = harness.runNext()
    await flush()
    await duplicate()
    expect(observed).toMatchObject({
      cycleAttempts: 1,
      state: "WAKING",
      wakeInFlight: true,
      windowAttempts: 1,
    })
    expect(harness.calls.peek).toHaveLength(1)
    expect(harness.calls.wake).toHaveLength(1)
    expect(harness.loop.rootSettled("root-A")).toBe(true)
    expect(harness.calls.schedule).toHaveLength(1)

    pendingWake.resolve()
    await running
    expect(harness.loop.getState()).toMatchObject({
      state: "AWAITING_SETTLE",
      wakeInFlight: false,
    })
  })

  test("contains synchronous throws and asynchronous rejections without consuming pending work", async () => {
    const pending = Object.freeze({ marker: "still-pending" })
    const store = [pending]
    const failures = [
      () => { throw new Error("sync private") },
      async () => { throw new Error("async private") },
    ]

    for (const wake of failures) {
      const harness = createHarness({ peek: async () => store[0], wake })
      bindAndSettle(harness)
      await expect(harness.runNext()).resolves.toBeUndefined()
      expect(harness.loop.getState()).toMatchObject({
        cycleAttempts: 1, state: "RETRY_WAIT", wakeInFlight: false, windowAttempts: 1,
      })
      expect(harness.calls.schedule.at(-1).delayMs).toBe(1_000)
      expect(harness.calls.wake[0].descriptor).toBe(pending)
      expect(store).toEqual([pending])
    }
  })

  test("re-peeks for exact bounded retries and exhausts on the fourth failure", async () => {
    let sequence = 0
    const harness = createHarness({
      peek: async () => Object.freeze({ sequence: sequence += 1 }),
      wake: async () => { throw new Error("offline") },
    })
    bindAndSettle(harness)

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await harness.runNext()
      expect(harness.loop.getState().cycleAttempts).toBe(attempt)
    }

    expect(harness.calls.schedule.map(({ delayMs }) => delayMs)).toEqual([
      0,
      1_000,
      2_000,
      4_000,
    ])
    expect(harness.calls.peek).toHaveLength(4)
    expect(new Set(harness.calls.wake.map(({ descriptor }) => descriptor)).size).toBe(4)
    expect(harness.loop.getState()).toMatchObject({
      cycleAttempts: 4,
      state: "RETRY_EXHAUSTED",
      timerScheduled: false,
      windowAttempts: 4,
    })
    expect(harness.queue).toHaveLength(0)
    expect(harness.calls.trace.at(-1).event).toBe("poll.retry_exhausted")
  })

  test("retains the global window across settle and reopens at the exact boundary", async () => {
    const pending = Object.freeze({ pending: true })
    const harness = createHarness({ peek: async () => pending })
    expect(harness.loop.bindRoot("root-A")).toBe(true)

    for (let attempt = 0; attempt < 15; attempt += 1) {
      expect(harness.loop.rootSettled("root-A")).toBe(true)
      await harness.runNext()
      expect(harness.loop.getState().state).toBe("AWAITING_SETTLE")
    }
    expect(harness.calls.peek).toHaveLength(15)
    expect(harness.loop.getState().windowAttempts).toBe(15)

    expect(harness.loop.rootSettled("root-A")).toBe(true)
    await harness.runNext()
    expect(harness.loop.getState()).toMatchObject({ state: "THROTTLED", windowAttempts: 15 })
    expect(harness.calls.peek).toHaveLength(15)
    expect(harness.calls.schedule.at(-1).delayMs).toBe(300_000)

    await harness.runNext()
    expect(harness.calls.peek).toHaveLength(16)
    expect(harness.calls.wake).toHaveLength(16)
    expect(harness.loop.getState()).toMatchObject({ state: "AWAITING_SETTLE", windowAttempts: 1 })
  })

  test("pauses on malformed or regressing time before another peek", async () => {
    const malformed = createHarness({ nowPort: () => Number.NaN })
    bindAndSettle(malformed)
    await malformed.runNext()
    expect(malformed.calls.peek).toHaveLength(0)
    expect(malformed.loop.getState().state).toBe("PAUSED")

    const times = [10, 9]
    const regressing = createHarness({ nowPort: () => times.shift() })
    bindAndSettle(regressing)
    await regressing.runNext()
    expect(regressing.calls.peek).toHaveLength(1)
    await regressing.runNext()
    expect(regressing.calls.peek).toHaveLength(1)
    expect(regressing.loop.getState().state).toBe("PAUSED")
    expect(regressing.calls.trace.at(-1).event).toBe("poll.clock_invalid")
  })

  test("pauses when scheduling fails before storage access", () => {
    const harness = createHarness({ scheduleThrows: true })
    expect(harness.loop.bindRoot("root-A")).toBe(true)
    expect(harness.loop.rootSettled("root-A")).toBe(true)
    expect(harness.loop.getState()).toMatchObject({ state: "PAUSED", timerScheduled: false })
    expect(harness.calls.peek).toHaveLength(0)
    expect(harness.calls.wake).toHaveLength(0)
  })
})
