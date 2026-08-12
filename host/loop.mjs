const validRoot = (value) =>
  typeof value === "string" && value.length > 0 && !value.includes("\0")
const validReason = (value) =>
  typeof value === "string" && /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(value)
const requirePort = (name, value) => {
  if (typeof value !== "function") throw new TypeError(`${name} port must be a function`)
  return value
}

export const createPollingLoop = ({ cancel, peek, schedule, trace, wake } = {}) => {
  const ports = Object.freeze(Object.fromEntries(
    Object.entries({ cancel, peek, schedule, trace, wake })
      .map(([name, value]) => [name, requirePort(name, value)]),
  ))
  let state = "UNBOUND"
  let generation = 0
  let root = null
  let timer = null
  let timerOwner = null
  let ticking = false
  let waking = false
  let aborter = null

  const safeTrace = (event, attributes = {}) => {
    try { ports.trace(event, Object.freeze({ ...attributes })) } catch {}
  }
  const errorName = (error) => typeof error?.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name) ? error.name : "Error"
  const current = (captured) =>
    state !== "DISPOSED" && captured === generation && aborter?.signal.aborted === false

  const runTick = async (captured) => {
    if (!current(captured) || ticking || waking) {
      safeTrace("poll.stale_callback", { generation: captured, state })
      return
    }
    ticking = true
    const signal = aborter.signal
    let descriptor
    try {
      descriptor = await ports.peek({ rootSessionId: root, generation: captured, signal })
    } catch (error) {
      if (current(captured)) {
        ticking = false
        safeTrace("poll.peek_failed", { generation, name: errorName(error), state })
      }
      return
    }
    if (!current(captured)) return
    if (descriptor === null || descriptor === undefined) {
      ticking = false
      safeTrace("poll.peek_empty", { generation, state })
      return
    }
    state = "WAKING"
    waking = true
    safeTrace("poll.wake_attempted", { generation, state })
    try {
      await ports.wake({ rootSessionId: root, descriptor, generation: captured, signal })
    } catch (error) {
      if (current(captured)) {
        state = "POLLING"
        waking = false
        ticking = false
        safeTrace("poll.wake_failed", { generation, name: errorName(error), state })
      }
      return
    }
    if (!current(captured)) return
    state = "AWAITING_SETTLE"
    waking = false
    ticking = false
    safeTrace("poll.wake_succeeded", { generation, state })
  }
  const scheduleTick = (delayMs) => {
    const captured = generation
    const owner = Object.freeze({ generation: captured })
    timerOwner = owner
    try {
      const handle = ports.schedule(() => {
        if (timerOwner === owner) {
          timerOwner = null
          timer = null
        }
        return runTick(captured)
      }, delayMs)
      if (timerOwner === owner) timer = handle
      safeTrace("poll.scheduled", { delay_ms: delayMs, generation, state })
      return true
    } catch (error) {
      if (timerOwner === owner) {
        timerOwner = null
        timer = null
      }
      state = "PAUSED"
      safeTrace("poll.schedule_failed", { generation, name: errorName(error), state })
      return false
    }
  }
  const dispose = (reason) => {
    if (state === "DISPOSED") return
    state = "DISPOSED"
    generation += 1
    aborter?.abort()
    const handle = timer
    const hadTimer = timerOwner !== null
    timer = null
    timerOwner = null
    ticking = false
    waking = false
    if (hadTimer) {
      try { ports.cancel(handle) } catch {}
    }
    safeTrace("poll.disposed", {
      generation,
      reason: validReason(reason) ? reason : "disposed",
      state,
    })
  }

  return Object.freeze({
    bindRoot(candidate) {
      if (state === "DISPOSED" || !validRoot(candidate)) return false
      if (root !== null) {
        if (candidate === root) return true
        safeTrace("poll.root_conflict", { generation, state })
        return false
      }
      root = candidate
      generation = 1
      aborter = new AbortController()
      state = "BOUND"
      safeTrace("poll.root_bound", { generation, state })
      return true
    },
    dispose,
    getState: () => Object.freeze({
      state,
      generation,
      rootBound: root !== null,
      timerScheduled: timerOwner !== null,
      tickInFlight: ticking,
      wakeInFlight: waking,
      windowAttempts: 0,
      cycleAttempts: 0,
    }),
    rootDeleted(candidate) {
      if (state === "DISPOSED" || root === null || candidate !== root) return false
      dispose("root-deleted")
      return true
    },
    rootSettled(candidate) {
      if (state === "DISPOSED" || candidate !== root) return false
      if (["POLLING", "THROTTLED", "RETRY_WAIT", "WAKING"].includes(state)) return true
      if (!["BOUND", "AWAITING_SETTLE", "RETRY_EXHAUSTED", "PAUSED"].includes(state)) return false
      aborter?.abort()
      generation += 1
      aborter = new AbortController()
      state = "POLLING"
      safeTrace("poll.cycle_started", { generation, state })
      scheduleTick(0)
      return true
    },
  })
}
