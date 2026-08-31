import { failContract } from "../../contracts/errors.mjs"
import { resolveExactContext } from "../../contracts/host-runtime/binding-context.mjs"

const CONSTRUCTOR_KEYS = Object.freeze(["resolveContexts", "verifyTowerReceipt"])
const INPUT_KEYS = Object.freeze(["binding", "receipt", "requestedCapabilities"])
const GRANT_KEYS = Object.freeze([
  "receipt_identity", "binding_id", "worktree_id", "scope_id", "endpoint_epoch", "role", "capabilities",
])
const ROLE_CAPABILITIES = Object.freeze({
  IMPLEMENTER: Object.freeze(["read", "write", "edit", "bash"]),
  COORDINATOR: Object.freeze(["read"]),
  SUPPORT: Object.freeze(["read"]),
})
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u

const fail = (code, message, component, category) => failContract(code, message, [{ component, category }])
const plainExact = (value, keys) => {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false
  const own = Reflect.ownKeys(value)
  return own.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}
const validCapabilities = (capabilities) => Array.isArray(capabilities)
  && capabilities.every((capability) => typeof capability === "string" && capability.length > 0)
  && new Set(capabilities).size === capabilities.length
const validSafeId = (value) => typeof value === "string" && SAFE_ID.test(value)
const sameMembers = (left, right) => left.length === right.length && left.every((value) => right.includes(value))
const fingerprint = (binding, capabilities) => JSON.stringify([binding, capabilities])

export const createPiAdapterGate = (dependencies) => {
  if (!plainExact(dependencies, CONSTRUCTOR_KEYS)
    || typeof dependencies.resolveContexts !== "function"
    || typeof dependencies.verifyTowerReceipt !== "function") {
    throw new TypeError("Exactly resolveContexts and verifyTowerReceipt capabilities are required")
  }

  const { resolveContexts, verifyTowerReceipt } = dependencies
  const completedByReceipt = new Map()
  const pendingByReceipt = new Map()
  const ownerByBinding = new Map()
  const inFlightByBinding = new Map()

  const authorizeFresh = async ({ binding, receipt, requestedCapabilities }, requestFingerprint, initial) => {
    const towerGrant = await verifyTowerReceipt(receipt)
    const current = resolveExactContext(binding, resolveContexts)

    if (!plainExact(towerGrant, GRANT_KEYS)) {
      fail("CT_PI_TOWER_GRANT_INVALID", "Tower returned an invalid private grant", "tower-grant", "shape")
    }
    if (towerGrant.receipt_identity !== receipt) {
      fail("CT_PI_RECEIPT_STALE", "Tower grant is not bound to the current receipt", "receipt", "identity")
    }
    if (towerGrant.binding_id !== binding.binding_id) {
      fail("CT_PI_BINDING_MISMATCH", "Tower grant is bound to a different binding", "binding", "identity")
    }
    if (towerGrant.worktree_id !== current[1].worktree_id) {
      fail("CT_PI_WORKTREE_MISMATCH", "Tower grant is bound to a different worktree", "worktree", "identity")
    }
    if (initial[1].worktree_id !== current[1].worktree_id) {
      fail("CT_PI_WORKTREE_MISMATCH", "Host-runtime worktree changed during authorization", "worktree", "currentness")
    }
    if (!validSafeId(towerGrant.scope_id)) {
      fail("CT_PI_SCOPE_ID_INVALID", "Tower grant has an invalid broker scope identifier", "scope_id", "shape")
    }
    if (!validSafeId(towerGrant.endpoint_epoch)) {
      fail("CT_PI_ENDPOINT_EPOCH_INVALID", "Tower grant has an invalid endpoint epoch", "endpoint_epoch", "shape")
    }

    const rolePolicy = ROLE_CAPABILITIES[towerGrant.role]
    if (!rolePolicy || !validCapabilities(towerGrant.capabilities) || !sameMembers(towerGrant.capabilities, rolePolicy)) {
      fail("CT_PI_CAPABILITY_INVALID", "Tower grant violates the closed role capability policy", "capabilities", "policy")
    }
    if (!requestedCapabilities.every((capability) => towerGrant.capabilities.includes(capability))) {
      fail("CT_PI_CAPABILITY_REQUEST_INVALID", "Requested capabilities exceed the Tower grant", "capabilities", "escalation")
    }

    const result = Object.freeze({
      binding_id: binding.binding_id,
      worktree_id: current[1].worktree_id,
      incarnation_id: current[3].incarnation_id,
      scope_id: towerGrant.scope_id,
      endpoint_epoch: towerGrant.endpoint_epoch,
      role: towerGrant.role,
      capabilities: Object.freeze([...requestedCapabilities]),
    })
    ownerByBinding.set(binding.binding_id, receipt)
    completedByReceipt.set(receipt, Object.freeze({ fingerprint: requestFingerprint, result }))
    return result
  }

  const gate = {
    async authorize(input) {
      if (!plainExact(input, INPUT_KEYS)) {
        fail("CT_PI_AUTH_INPUT_INVALID", "Authorization input must contain exactly binding, receipt, and requestedCapabilities", "input", "shape")
      }
      if (!validCapabilities(input.requestedCapabilities)) {
        fail("CT_PI_CAPABILITY_REQUEST_INVALID", "Requested capabilities must be a duplicate-free string array", "capabilities", "shape")
      }

      const requestFingerprint = fingerprint(input.binding, input.requestedCapabilities)
      const completed = completedByReceipt.get(input.receipt)
      if (completed) {
        if (completed.fingerprint !== requestFingerprint) {
          fail("CT_PI_REPLAY_DIVERGED", "Receipt replay diverges from its first request", "receipt", "replay")
        }
        resolveExactContext(input.binding, resolveContexts)
        return completed.result
      }
      const pending = pendingByReceipt.get(input.receipt)
      if (pending) {
        if (pending.fingerprint !== requestFingerprint) {
          fail("CT_PI_REPLAY_DIVERGED", "Receipt replay diverges from its in-flight request", "receipt", "replay")
        }
        return pending.promise
      }

      const initial = resolveExactContext(input.binding, resolveContexts)
      const bindingId = input.binding.binding_id
      const owner = ownerByBinding.get(bindingId)
      const reservation = inFlightByBinding.get(bindingId)
      if ((owner !== undefined && owner !== input.receipt) || (reservation !== undefined && reservation.receipt !== input.receipt)) {
        fail("CT_PI_TAKEOVER_REJECTED", "Binding is already owned or reserved by another receipt", "binding", "takeover")
      }

      const token = Object.freeze({ receipt: input.receipt, fingerprint: requestFingerprint })
      inFlightByBinding.set(bindingId, token)
      const promise = authorizeFresh(input, requestFingerprint, initial)
      pendingByReceipt.set(input.receipt, Object.freeze({ fingerprint: requestFingerprint, promise }))
      try {
        return await promise
      } finally {
        if (pendingByReceipt.get(input.receipt)?.promise === promise) pendingByReceipt.delete(input.receipt)
        if (inFlightByBinding.get(bindingId) === token) inFlightByBinding.delete(bindingId)
      }
    },
  }
  return Object.freeze(gate)
}
