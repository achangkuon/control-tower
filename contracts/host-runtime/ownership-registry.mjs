import { failContract } from "../errors.mjs"
import { resolveExactContext } from "./binding-context.mjs"

const fail = (code, message, category) => failContract(code, message, [{ component: "ownership", category }])
const metadata = ([identity, worktree, process, incarnation, binding]) => Object.freeze({
  binding_id: binding.binding_id,
  runtime_id: identity.runtime_id,
  worktree_id: worktree.worktree_id,
  process_id: process.process_id,
  incarnation_id: incarnation.incarnation_id,
  loopback_port: binding.loopback_port,
})
const ownerKey = (record) => `${record.runtime_id}\u0000${record.worktree_id}\u0000${record.process_id}`
const equal = (left, right) => Object.keys(left).every((key) => left[key] === right[key])

export const createHostRuntimeOwnership = ({ resolveContexts } = {}) => {
  if (typeof resolveContexts !== "function") throw new TypeError("resolveContexts must be a function")
  const activeByOwner = new Map(), activeByPort = new Map()
  const bindingHistory = new Map(), incarnationHistory = new Set()

  const activate = (binding) => {
    const record = metadata(resolveExactContext(binding, resolveContexts))
    const priorBinding = bindingHistory.get(record.binding_id)
    if (priorBinding && !equal(priorBinding, record)) fail("CT_HOST_RUNTIME_BINDING_CROSSED", "Binding history does not match", "crossed")
    if (priorBinding || incarnationHistory.has(record.incarnation_id)) fail("CT_HOST_RUNTIME_STALE", "Binding or incarnation is retired", "stale")
    if (activeByOwner.has(ownerKey(record))) fail("CT_HOST_RUNTIME_BINDING_ACTIVE", "Owner already has an active binding", "active")
    if (activeByPort.has(record.loopback_port)) fail("CT_HOST_RUNTIME_PORT_RESERVED", "Port already has an active binding", "active")

    bindingHistory.set(record.binding_id, record)
    incarnationHistory.add(record.incarnation_id)
    activeByOwner.set(ownerKey(record), record)
    activeByPort.set(record.loopback_port, record)
  }

  const release = (binding) => {
    const record = metadata(resolveExactContext(binding, resolveContexts))
    const active = activeByOwner.get(ownerKey(record))
    if (!active || !equal(active, record) || activeByPort.get(record.loopback_port) !== active) {
      fail("CT_HOST_RUNTIME_NOT_OWNER", "Binding is not the exact current owner", "not-owner")
    }
    activeByOwner.delete(ownerKey(record))
    activeByPort.delete(record.loopback_port)
  }

  return Object.freeze({ activate, release })
}
