const validRoot = (value) =>
  typeof value === "string" && value.length > 0 && !value.includes("\0")
const validReason = (value) =>
  typeof value === "string" && /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(value)
const requirePort = (name, value) => {
  if (typeof value !== "function") throw new TypeError(`${name} port must be a function`)
  return value
}

const POLICY_KEYS = Object.freeze(["maxWakeAttemptsPerWindow", "pollIntervalMs", "retryDelaysMs", "wakeWindowMs"])
const BASELINE_RETRIES = Object.freeze([1_000, 2_000, 4_000])
const requirePolicy = (value) => {
  const keys = value && typeof value === "object" ? Object.keys(value).sort() : []
  const retries = value?.retryDelaysMs
  const exact = keys.length === POLICY_KEYS.length
    && keys.every((key, index) => key === POLICY_KEYS[index])
    && value.pollIntervalMs === 2_000
    && value.wakeWindowMs === 5 * 60_000
    && value.maxWakeAttemptsPerWindow === 15
    && Array.isArray(retries)
    && retries.length === BASELINE_RETRIES.length
    && retries.every((delay, index) => delay === BASELINE_RETRIES[index])
  if (!exact || !Object.isFrozen(value) || !Object.isFrozen(retries)) {
    throw new TypeError("policy must be the exact deeply frozen baseline")
  }
  return value
}

export const createPollingLoop = ({ cancel, now, peek, policy, schedule, trace, wake } = {}) => {
  const config = requirePolicy(policy)
  const ports = Object.freeze(Object.fromEntries(
    Object.entries({ cancel, now, peek, schedule, trace, wake })
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
  let lastNow = null
  let cycleAttempts = 0
  const wakeAttempts = []

  const safeTrace = (event, attributes = {}) => {
    try { ports.trace(event, Object.freeze({ ...attributes })) } catch {}
  }
  const errorName = (error) => typeof error?.name === "string"
    && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name) ? error.name : "Error"
  const current = (captured) =>
    state !== "DISPOSED" && captured === generation && aborter?.signal.aborted === false
  const pauseForClock = (reason) => {
    state = "PAUSED"
    ticking = false
    waking = false
    safeTrace("poll.clock_invalid", { generation, reason, state })
  }
  const readNow = () => {
    let value
    try {
      value = ports.now()
    } catch {
      pauseForClock("exception")
      return null
    }
    if (!Number.isSafeInteger(value) || value < 0) {
      pauseForClock("malformed")
      return null
    }
    if (lastNow !== null && value < lastNow) {
      pauseForClock("regressed")
      return null
    }
    lastNow = value
    return value
  }
  const pruneWindow = (time) => {
    const cutoff = time - config.wakeWindowMs
    while (wakeAttempts.length > 0 && wakeAttempts[0] <= cutoff) wakeAttempts.shift()
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
  const scheduleRetryOrExhaust = (error) => {
    waking = false
    ticking = false
    safeTrace("poll.wake_failed", {
      cycle_attempt: cycleAttempts,
      generation,
      name: errorName(error),
      state: "WAKING",
      window_attempts: wakeAttempts.length,
    })
    if (cycleAttempts <= config.retryDelaysMs.length) {
      state = "RETRY_WAIT"
      scheduleTick(config.retryDelaysMs[cycleAttempts - 1])
      return
    }
    state = "RETRY_EXHAUSTED"
    safeTrace("poll.retry_exhausted", {
      cycle_attempt: cycleAttempts, generation, state, window_attempts: wakeAttempts.length,
    })
  }

  const runTick = async (captured) => {
    if (!current(captured) || ticking || waking) {
      safeTrace("poll.stale_callback", { generation: captured, state })
      return
    }
    const tickTime = readNow()
    if (tickTime === null || !current(captured)) return
    pruneWindow(tickTime)
    if (wakeAttempts.length >= config.maxWakeAttemptsPerWindow) {
      const delayMs = config.wakeWindowMs - (tickTime - wakeAttempts[0])
      state = "THROTTLED"
      safeTrace("poll.throttled", {
        delay_ms: delayMs,
        generation,
        state,
        window_attempts: wakeAttempts.length,
      })
      scheduleTick(delayMs)
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
        state = "POLLING"
        safeTrace("poll.peek_failed", { generation, name: errorName(error), state })
        scheduleTick(config.pollIntervalMs)
      }
      return
    }
    if (!current(captured)) return
    if (descriptor === null || descriptor === undefined) {
      cycleAttempts = 0
      ticking = false
      state = "POLLING"
      safeTrace("poll.peek_empty", { generation, state })
      scheduleTick(config.pollIntervalMs)
      return
    }

    const attemptTime = readNow()
    if (attemptTime === null || !current(captured)) return
    pruneWindow(attemptTime)
    wakeAttempts.push(attemptTime)
    cycleAttempts += 1
    state = "WAKING"
    waking = true
    safeTrace("poll.wake_attempted", {
      cycle_attempt: cycleAttempts,
      generation,
      state,
      window_attempts: wakeAttempts.length,
    })
    try {
      await ports.wake({ rootSessionId: root, descriptor, generation: captured, signal })
    } catch (error) {
      if (current(captured)) scheduleRetryOrExhaust(error)
      return
    }
    if (!current(captured)) return
    state = "AWAITING_SETTLE"
    waking = false
    ticking = false
    safeTrace("poll.wake_succeeded", {
      cycle_attempt: cycleAttempts, generation, state, window_attempts: wakeAttempts.length,
    })
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
      windowAttempts: wakeAttempts.length,
      cycleAttempts,
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
      cycleAttempts = 0
      state = "POLLING"
      safeTrace("poll.cycle_started", { generation, state })
      scheduleTick(0)
      return true
    },
  })
}
