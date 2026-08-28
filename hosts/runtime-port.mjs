import { failContract } from "../contracts/errors.mjs"
import { resolveExactContext } from "../contracts/host-runtime/binding-context.mjs"

const OPERATIONS = new Set(["OBSERVE", "HEALTH", "STOP", "ATTACH"])
const CONTEXT_KEYS = ["runtime_id", "worktree_id", "process_id", "binding_id", "incarnation_id", "loopback_port"]
const CHALLENGE_KEYS = ["operation", "producer_ref", "challenge_ref", ...CONTEXT_KEYS]
const PROOF_FIELDS = Object.freeze({ OBSERVE: ["evidence"], HEALTH: ["state"], STOP: ["request_acknowledged", "state"], ATTACH: ["attached"] })
const REF = /^[A-Za-z0-9._:-]{1,128}$/
const fail = (code, message, component, category) => failContract(code, message, [{ component, category }])
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
const exactKeys = (value, keys) => plain(value)
  && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key))
const same = (left, right, keys) => keys.every((key) => left[key] === right[key])

const snapshot = ([identity, worktree, process, incarnation, binding]) => Object.freeze({
  runtime_id: identity.runtime_id,
  worktree_id: worktree.worktree_id,
  process_id: process.process_id,
  binding_id: binding.binding_id,
  incarnation_id: incarnation.incarnation_id,
  loopback_port: binding.loopback_port,
})

const copyBinding = (binding) => Object.freeze({
  schema_version: binding.schema_version,
  binding_id: binding.binding_id,
  runtime_id: binding.runtime_id,
  worktree_id: binding.worktree_id,
  process_id: binding.process_id,
  incarnation_id: binding.incarnation_id,
  loopback_port: binding.loopback_port,
})

const assertCurrent = (binding, resolveContexts, expected) => {
  const current = snapshot(resolveExactContext(binding, resolveContexts))
  if (!same(current, expected, CONTEXT_KEYS)) {
    fail("CT_HOST_RUNTIME_BINDING_CROSSED", "Host-runtime context is crossed", "context", "crossed")
  }
}

const validChallenge = (challenge, request) => exactKeys(challenge, CHALLENGE_KEYS)
  && Object.isFrozen(challenge)
  && REF.test(challenge.challenge_ref)
  && same(challenge, request, ["operation", "producer_ref", ...CONTEXT_KEYS])

const validProof = (proof, challenge) => {
  const fields = PROOF_FIELDS[challenge.operation]
  if (!exactKeys(proof, [...CHALLENGE_KEYS, ...fields]) || !same(proof, challenge, CHALLENGE_KEYS)) return false
  if (challenge.operation === "OBSERVE") return proof.evidence === "OBSERVED"
  if (challenge.operation === "HEALTH") return proof.state === "HEALTHY" || proof.state === "DEAD"
  if (challenge.operation === "STOP") return typeof proof.request_acknowledged === "boolean" && ["STOPPED", "DEAD", "UNKNOWN"].includes(proof.state)
  return proof.attached === true
}

export const createHostRuntimeProofPort = (dependencies = {}) => {
  const { operation, resolveContexts, producer } = dependencies
  if (!OPERATIONS.has(operation)) throw new TypeError("operation must be a supported runtime operation")
  if (typeof resolveContexts !== "function") throw new TypeError("resolveContexts must be a function")
  if (!plain(producer) || !REF.test(producer.producer_ref ?? "")
    || typeof producer.issueChallenge !== "function" || typeof producer.call !== "function") {
    throw new TypeError("producer must provide bounded proof authority")
  }

  const inFlightChallenges = new WeakSet()
  const consumedChallenges = new WeakSet()

  const execute = async (input) => {
    if (!exactKeys(input, ["binding"])) {
      fail("CT_HOST_RUNTIME_OPERATION_INVALID", "Runtime operation input is invalid", "operation", "input")
    }
    const initial = snapshot(resolveExactContext(input.binding, resolveContexts))
    const binding = copyBinding(input.binding)
    const request = Object.freeze({ operation, producer_ref: producer.producer_ref, ...initial })

    let challenge
    try {
      challenge = await producer.issueChallenge(request)
    } catch {
      fail("CT_HOST_RUNTIME_PRODUCER_UNAVAILABLE", "Runtime proof producer is unavailable", "producer", "unavailable")
    }
    assertCurrent(binding, resolveContexts, initial)

    if (!plain(challenge)) fail("CT_HOST_RUNTIME_CHALLENGE_INVALID", "Runtime challenge is invalid", "challenge", "invalid")
    if (inFlightChallenges.has(challenge) || consumedChallenges.has(challenge)) {
      fail("CT_HOST_RUNTIME_CHALLENGE_REUSED", "Runtime challenge was already used", "challenge", "reused")
    }
    if (!validChallenge(challenge, request)) {
      consumedChallenges.add(challenge)
      fail("CT_HOST_RUNTIME_CHALLENGE_INVALID", "Runtime challenge is invalid", "challenge", "invalid")
    }

    inFlightChallenges.add(challenge)
    try {
      let proof
      try {
        proof = await producer.call(Object.freeze({ challenge }))
      } catch {
        fail("CT_HOST_RUNTIME_PRODUCER_UNAVAILABLE", "Runtime proof producer is unavailable", "producer", "unavailable")
      }
      if (!validProof(proof, challenge)) {
        fail("CT_HOST_RUNTIME_PROOF_MISMATCH", "Runtime proof does not match", "proof", "mismatch")
      }
      assertCurrent(binding, resolveContexts, initial)
      return Object.freeze({ operation, binding_id: initial.binding_id, incarnation_id: initial.incarnation_id, status: "MATCHED" })
    } finally {
      inFlightChallenges.delete(challenge)
      consumedChallenges.add(challenge)
    }
  }

  return Object.freeze({ execute })
}
