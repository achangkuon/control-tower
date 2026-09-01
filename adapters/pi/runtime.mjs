import { failContract } from "../../contracts/errors.mjs"

const CONSTRUCTOR_KEYS = Object.freeze(["processes", "intercom", "randomUUID"])
const PROCESS_KEYS = Object.freeze(["launch", "inspect", "observe", "health", "stop"])
const HANDLE_KEYS = Object.freeze(["pid", "cwd", "nonce", "endpointEpoch"])
const DISPATCH_KEYS = Object.freeze(["assignmentId", "recipient", "payload", "modeContext"])

const fail = (code, message) => failContract(code, message)
const plainExact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
  && Reflect.ownKeys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key))
const nonempty = (value) => typeof value === "string" && value.length > 0
const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}
const snapshot = (value) => deepFreeze(structuredClone(value))
const validHandle = (value) => plainExact(value, HANDLE_KEYS)
  && Number.isSafeInteger(value.pid) && value.pid > 0
  && nonempty(value.cwd) && nonempty(value.nonce) && nonempty(value.endpointEpoch)
const sameIdentity = (observed, expected) => observed !== null && typeof observed === "object"
  && observed.pid === expected.pid && observed.cwd === expected.cwd
  && observed.nonce === expected.nonce && observed.endpointEpoch === expected.endpointEpoch
const validModeContext = (context) => {
  if (context?.mode === "ON") {
    const binding = context.binding
    return binding && nonempty(binding.scope_id) && nonempty(binding.endpoint_epoch)
      && binding.persisted === true && binding.retry_owned === true
  }
  if (context?.mode === "OFF") return context.peer?.live === true && context.peer?.maintainer_approved === true
  return false
}

export const createPiRuntimeAdapter = (dependencies) => {
  if (!plainExact(dependencies, CONSTRUCTOR_KEYS)
    || !plainExact(dependencies.processes, PROCESS_KEYS)
    || !PROCESS_KEYS.every((key) => typeof dependencies.processes[key] === "function")
    || dependencies.intercom === null || typeof dependencies.intercom !== "object"
    || typeof dependencies.intercom.send !== "function"
    || typeof dependencies.randomUUID !== "function") {
    throw new TypeError("Exactly processes, intercom, and randomUUID capabilities are required")
  }

  const { processes, intercom, randomUUID } = dependencies
  const dispatches = new Map()
  const assignmentsById = new Map()

  const inspectOwned = async (handle) => {
    if (!validHandle(handle)) fail("CT_PI_PROCESS_IDENTITY_INVALID", "Process identity is invalid")
    const observed = await processes.inspect(handle.pid)
    if (!sameIdentity(observed, handle)) fail("CT_PI_PROCESS_OWNERSHIP_INVALID", "Process is absent or not Tower-owned")
    return observed
  }
  const frozenHandle = (value) => Object.freeze({ pid: value.pid, cwd: value.cwd, nonce: value.nonce, endpointEpoch: value.endpointEpoch })

  const adapter = {
    async launch(input) {
      if (!plainExact(input, ["cwd", "nonce", "endpointEpoch"])
        || !nonempty(input.cwd) || !nonempty(input.nonce) || !nonempty(input.endpointEpoch)) {
        fail("CT_PI_LAUNCH_INPUT_INVALID", "Launch requires exact cwd, nonce, and endpointEpoch")
      }
      const launched = await processes.launch(snapshot(input))
      const handle = frozenHandle({ pid: launched?.pid, ...input })
      await inspectOwned(handle)
      return handle
    },

    async attach(input) {
      const handle = validHandle(input) ? frozenHandle(input) : input
      await inspectOwned(handle)
      return handle
    },

    async observe(handle) {
      await inspectOwned(handle)
      return processes.observe(handle)
    },

    async health(handle) {
      await inspectOwned(handle)
      return processes.health(handle)
    },

    async stop(handle) {
      await inspectOwned(handle)
      await processes.stop(handle)
      let observed = null
      try { observed = await processes.inspect(handle.pid) } catch (error) {
        if (error?.code !== "ENOENT" && error?.code !== "ESRCH") throw error
      }
      if (sameIdentity(observed, handle)) fail("CT_PI_PROCESS_STOP_INCOMPLETE", "Tower-owned process remains after stop")
      return Object.freeze({ stopped: true, pid: handle.pid })
    },

    async dispatch(input) {
      if (!plainExact(input, DISPATCH_KEYS) || !nonempty(input.assignmentId) || !nonempty(input.recipient) || !validModeContext(input.modeContext)) {
        fail(input?.modeContext && !validModeContext(input.modeContext) ? "CT_PI_MODE_BOUNDARY_INVALID" : "CT_PI_DISPATCH_INPUT_INVALID", "Dispatch input or mode boundary is invalid")
      }
      const request = snapshot(input)
      const fingerprint = JSON.stringify(request)
      let record = dispatches.get(request.assignmentId)
      if (record && record.fingerprint !== fingerprint) fail("CT_PI_DISPATCH_REPLAY_DIVERGED", "Assignment replay diverged")
      if (!record) {
        const dispatchId = randomUUID()
        if (!nonempty(dispatchId)) fail("CT_PI_DISPATCH_ID_INVALID", "Dispatch id generator returned an invalid id")
        if (assignmentsById.has(dispatchId)) fail("CT_PI_DISPATCH_ID_COLLISION", "Dispatch id collides with another assignment")
        record = { fingerprint, dispatchId, pending: null, result: null }
        dispatches.set(request.assignmentId, record)
        assignmentsById.set(dispatchId, request.assignmentId)
      }
      if (record.result) return record.result
      if (record.pending) return record.pending

      const envelope = deepFreeze({
        kind: "DISPATCH", dispatch_id: record.dispatchId, assignment_id: request.assignmentId,
        mode: request.modeContext.mode, mode_context: request.modeContext, payload: request.payload,
      })
      const pending = (async () => {
        const acknowledgment = await intercom.send(request.recipient, envelope)
        const onGuarantees = request.modeContext.mode !== "ON" || (acknowledgment?.persisted === true && acknowledgment?.retry_owned === true)
        if (acknowledgment?.acknowledged !== true || acknowledgment?.dispatch_id !== record.dispatchId || !onGuarantees) {
          fail("CT_PI_DISPATCH_UNACKNOWLEDGED", "Dispatch lacks its required acknowledgment")
        }
        record.result = Object.freeze({ dispatch_id: record.dispatchId, acknowledged: true })
        return record.result
      })()
      record.pending = pending
      try { return await pending } finally { if (record.pending === pending) record.pending = null }
    },
  }
  return Object.freeze(adapter)
}
