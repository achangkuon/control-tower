import { failContract } from "../errors.mjs"
import { resolveExactContext } from "./binding-context.mjs"
import { acquireNodeLoopbackAtReservation } from "./node-loopback-acquisition.mjs"

const fail = (code, message, category) => failContract(code, message, [{ component: "ownership", category }])
const metadata = ([identity, worktree, process, incarnation, binding]) => Object.freeze({
  binding_id: binding.binding_id,
  runtime_id: identity.runtime_id,
  worktree_id: worktree.worktree_id,
  process_id: process.process_id,
  incarnation_id: incarnation.incarnation_id,
  loopback_port: binding.loopback_port,
})
const acknowledgement = ({ binding_id, incarnation_id, loopback_port }) => Object.freeze({ binding_id, incarnation_id, loopback_port })
const ownerKey = (record) => `${record.runtime_id}\u0000${record.worktree_id}\u0000${record.process_id}`
const equal = (left, right) => Object.keys(right).every((key) => left[key] === right[key])

export const createHostRuntimeOwnership = ({ resolveContexts, acquireAtReservation = acquireNodeLoopbackAtReservation } = {}) => {
  if (typeof resolveContexts !== "function") throw new TypeError("resolveContexts must be a function")
  if (typeof acquireAtReservation !== "function") throw new TypeError("acquireAtReservation must be a function")
  const activeByOwner = new Map(), activeByPort = new Map(), pendingByPort = new Map()
  const bindingHistory = new Map(), incarnationHistory = new Set(), cleanupPending = new Set()
  const pendingOperations = new Set(), releaseInFlight = new Map()
  let lifecycle = "accepting", disposal

  const preflight = (binding) => {
    const exactContext = resolveExactContext(binding, resolveContexts), record = metadata(exactContext)
    const priorBinding = bindingHistory.get(record.binding_id)
    if (priorBinding && !equal(priorBinding, record)) fail("CT_HOST_RUNTIME_BINDING_CROSSED", "Binding history does not match", "crossed")
    if (priorBinding || incarnationHistory.has(record.incarnation_id)) fail("CT_HOST_RUNTIME_STALE", "Binding or incarnation is retired", "stale")
    if (activeByOwner.has(ownerKey(record))) fail("CT_HOST_RUNTIME_BINDING_ACTIVE", "Owner already has an active binding", "active")
    const cleanupOccupiesPort = [...cleanupPending].some((held) => held.loopback_port === record.loopback_port)
    if (activeByPort.has(record.loopback_port) || pendingByPort.has(record.loopback_port) || cleanupOccupiesPort) fail("CT_HOST_RUNTIME_PORT_RESERVED", "Port already has an active, pending, or cleanup-pending binding", "active")
    return { exactContext, record }
  }

  const publish = (record, close) => {
    const held = Object.freeze({ ...record, close })
    bindingHistory.set(record.binding_id, record)
    incarnationHistory.add(record.incarnation_id)
    activeByOwner.set(ownerKey(record), held)
    activeByPort.set(record.loopback_port, held)
  }

  const reserveOperation = async (binding) => {
    const { exactContext, record } = preflight(binding)
    pendingByPort.set(record.loopback_port, record)
    let close
    try {
      close = await acquireAtReservation(exactContext, record.loopback_port)
      if (typeof close !== "function") throw new TypeError("acquisition did not return a close capability")
      if (lifecycle !== "accepting" || pendingByPort.get(record.loopback_port) !== record || activeByOwner.has(ownerKey(record)) || activeByPort.has(record.loopback_port)) {
        try { await close() } catch { cleanupPending.add(Object.freeze({ ...record, close })) }
        fail("CT_HOST_RUNTIME_CLEANUP_FAILED", "Acquired listener could not be published safely", "cleanup")
      }
      publish(record, close)
      return acknowledgement(record)
    } catch (error) {
      if (error?.code?.startsWith("CT_HOST_RUNTIME_")) throw error
      if (error?.code === "EADDRINUSE") fail("CT_HOST_RUNTIME_PORT_OCCUPIED", "Loopback port is occupied", "occupied")
      fail("CT_HOST_RUNTIME_ACQUISITION_FAILED", "Final listener acquisition failed", "acquisition")
    } finally {
      if (pendingByPort.get(record.loopback_port) === record) pendingByPort.delete(record.loopback_port)
    }
  }

  const reserve = (binding) => {
    if (lifecycle !== "accepting") return Promise.resolve().then(() => fail("CT_HOST_RUNTIME_CLEANUP_FAILED", "Ownership registry is disposing or disposed", "cleanup"))
    const operation = reserveOperation(binding)
    pendingOperations.add(operation)
    operation.then(() => pendingOperations.delete(operation), () => pendingOperations.delete(operation))
    return operation
  }

  const closeRecord = (record) => {
    if (releaseInFlight.has(record)) return releaseInFlight.get(record)
    const operation = Promise.resolve().then(() => record.close()).then(() => {
      activeByOwner.delete(ownerKey(record)); activeByPort.delete(record.loopback_port); cleanupPending.delete(record)
      releaseInFlight.delete(record)
      return acknowledgement(record)
    }, () => {
      releaseInFlight.delete(record)
      fail("CT_HOST_RUNTIME_CLEANUP_FAILED", "Final listener close could not be confirmed", "cleanup")
    })
    releaseInFlight.set(record, operation)
    return operation
  }

  const release = (binding) => {
    const record = metadata(resolveExactContext(binding, resolveContexts))
    const active = activeByOwner.get(ownerKey(record))
    if (!active || !equal(active, record) || activeByPort.get(record.loopback_port) !== active) fail("CT_HOST_RUNTIME_NOT_OWNER", "Binding is not the exact current owner", "not-owner")
    if (!active.close) {
      activeByOwner.delete(ownerKey(record)); activeByPort.delete(record.loopback_port); return
    }
    return closeRecord(active)
  }

  const dispose = () => {
    if (disposal) return disposal
    lifecycle = "disposing"
    disposal = (async () => {
      try {
        await Promise.allSettled([...pendingOperations])
        const held = new Set([...activeByPort.values(), ...cleanupPending])
        const outcomes = await Promise.allSettled([...held].filter(({ close }) => close).map(closeRecord))
        if (outcomes.some(({ status }) => status === "rejected")) fail("CT_HOST_RUNTIME_CLEANUP_FAILED", "One or more final listeners could not be closed", "cleanup")
        activeByOwner.clear(); activeByPort.clear(); cleanupPending.clear()
      } finally {
        lifecycle = "disposed"
      }
    })()
    return disposal
  }

  return Object.freeze({ dispose, release, reserve })
}
