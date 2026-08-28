import { describe, expect, test } from "bun:test"
import { createHostRuntimeProofPort } from "../../hosts/runtime-port.mjs"

const id = (kind, digit) => `ct_${kind}_${digit.repeat(32)}`
const context = ({ digit = "1", port = 43101 } = {}) => {
  const identity = { schema_version: "control-tower.host-runtime.identity/v1", runtime_id: id("runtime", digit) }
  const worktree = { schema_version: "control-tower.host-runtime.worktree/v1", worktree_id: id("worktree", digit) }
  const process = { schema_version: "control-tower.host-runtime.process/v1", process_id: id("process", digit) }
  const incarnation = { schema_version: "control-tower.host-runtime.incarnation/v1", incarnation_id: id("incarnation", digit) }
  const binding = {
    schema_version: "control-tower.host-runtime.binding/v1", binding_id: id("binding", digit),
    runtime_id: identity.runtime_id, worktree_id: worktree.worktree_id,
    process_id: process.process_id, incarnation_id: incarnation.incarnation_id, loopback_port: port,
  }
  return [identity, worktree, process, incarnation, binding]
}
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const challengeFor = (tuple, challenge_ref = "challenge-1") => Object.freeze({
  operation: "HEALTH", producer_ref: "producer-1", challenge_ref,
  runtime_id: tuple[0].runtime_id, worktree_id: tuple[1].worktree_id,
  process_id: tuple[2].process_id, binding_id: tuple[4].binding_id,
  incarnation_id: tuple[3].incarnation_id, loopback_port: tuple[4].loopback_port,
})
const proofFor = (challenge) => Object.freeze({ ...challenge, state: "HEALTHY" })
const codeOf = async (promise) => (await promise.catch((error) => error)).code
const fixture = ({ challenges, call, resolveContexts } = {}) => {
  const tuple = context(), issued = challenges ?? [challengeFor(tuple)]
  let issueCount = 0, callCount = 0
  const requests = [], calls = []
  const producer = Object.freeze({
    producer_ref: "producer-1",
    async issueChallenge(request) { requests.push(request); return issued[Math.min(issueCount++, issued.length - 1)] },
    async call(request) { callCount += 1; calls.push(request); return call ? call(request, callCount) : proofFor(request.challenge) },
  })
  const port = createHostRuntimeProofPort({
    operation: "HEALTH", producer,
    resolveContexts: resolveContexts ?? (() => [tuple]),
  })
  return { tuple, issued, port, requests, calls, counts: () => ({ issueCount, callCount }) }
}

describe("host-neutral runtime proof port", () => {
  test("binds producer authority and accepts only closed binding input", async () => {
    for (const dependencies of [undefined, {}, { operation: "HEALTH", resolveContexts: () => [] }]) {
      expect(() => createHostRuntimeProofPort(dependencies)).toThrow(TypeError)
    }
    const f = fixture()
    for (const input of [undefined, {}, { binding: f.tuple[4], proof: {} }, { binding: f.tuple[4], producer: {} }]) {
      expect(await codeOf(f.port.execute(input))).toBe("CT_HOST_RUNTIME_OPERATION_INVALID")
    }
    expect(f.counts()).toEqual({ issueCount: 0, callCount: 0 })
    expect(Object.keys(f.port)).toEqual(["execute"])
    expect(Object.isFrozen(f.port)).toBe(true)
  })

  test("issues exact frozen context and returns only a bounded frozen match", async () => {
    const f = fixture()
    const result = await f.port.execute({ binding: f.tuple[4] })
    expect(f.counts()).toEqual({ issueCount: 1, callCount: 1 })
    const { challenge_ref: _challengeRef, ...expectedRequest } = f.issued[0]
    expect(f.requests[0]).toEqual(expectedRequest)
    expect(Object.keys(f.requests[0])).toEqual(["operation", "producer_ref", "runtime_id", "worktree_id", "process_id", "binding_id", "incarnation_id", "loopback_port"])
    expect(Object.isFrozen(f.requests[0])).toBe(true)
    expect(f.calls[0]).toEqual({ challenge: f.issued[0] })
    expect(Object.isFrozen(f.calls[0])).toBe(true)
    expect(result).toEqual({ operation: "HEALTH", binding_id: f.tuple[4].binding_id, incarnation_id: f.tuple[4].incarnation_id, status: "MATCHED" })
    expect(Object.isFrozen(result)).toBe(true)
    expect(JSON.stringify(result)).not.toMatch(/producer|challenge|proof|function|43101/i)
  })

  test("rejects undeclared and malformed binding fields with bounded frozen contract errors", async () => {
    const f = fixture()
    const bindings = [
      { ...f.tuple[4], undeclared: "value" },
      null,
      undefined,
      {},
      "malformed",
    ]

    for (const binding of bindings) {
      const error = await f.port.execute({ binding }).catch((failure) => failure)
      expect(error.name).toBe("ContractError")
      expect(error.code).toBe("CT_HOST_RUNTIME_SCHEMA_INVALID")
      expect(error.diagnostics).toEqual([{ component: "binding", category: "schema" }])
      expect(Object.isFrozen(error.diagnostics[0])).toBe(true)
      expect(Object.isFrozen(error.diagnostics)).toBe(true)
      expect(Object.isFrozen(error)).toBe(true)
    }
    expect(f.counts()).toEqual({ issueCount: 0, callCount: 0 })
  })

  test("rejects invalid context and crossed challenges with zero proof calls", async () => {
    const missing = fixture({ resolveContexts: () => [] })
    expect(await codeOf(missing.port.execute({ binding: missing.tuple[4] }))).toBe("CT_HOST_RUNTIME_CONTEXT_MISSING")
    expect(missing.counts()).toEqual({ issueCount: 0, callCount: 0 })

    const tuple = context(), crossed = Object.freeze({ ...challengeFor(tuple), incarnation_id: id("incarnation", "2") })
    const f = fixture({ challenges: [crossed] })
    expect(await codeOf(f.port.execute({ binding: f.tuple[4] }))).toBe("CT_HOST_RUNTIME_CHALLENGE_INVALID")
    expect(f.counts()).toEqual({ issueCount: 1, callCount: 0 })
    expect(await codeOf(f.port.execute({ binding: f.tuple[4] }))).toBe("CT_HOST_RUNTIME_CHALLENGE_REUSED")
  })

  test("allows one concurrent winner and one proof call for a shared challenge", async () => {
    const gate = deferred(), f = fixture({ call: () => gate.promise })
    const first = f.port.execute({ binding: f.tuple[4] })
    await Promise.resolve(); await Promise.resolve()
    const second = f.port.execute({ binding: f.tuple[4] })
    expect(await codeOf(second)).toBe("CT_HOST_RUNTIME_CHALLENGE_REUSED")
    expect(f.counts().callCount).toBe(1)
    gate.resolve(proofFor(f.issued[0]))
    await expect(first).resolves.toMatchObject({ status: "MATCHED" })
    expect(await codeOf(f.port.execute({ binding: f.tuple[4] }))).toBe("CT_HOST_RUNTIME_CHALLENGE_REUSED")
  })

  test("terminally consumes valid, error, and mismatched proof and permits only a fresh retry", async () => {
    for (const terminal of ["valid", "error", "mismatch"]) {
      const tuple = context(), first = challengeFor(tuple, `challenge-${terminal}`), fresh = challengeFor(tuple, `fresh-${terminal}`)
      const f = fixture({ challenges: [first, first, fresh], call: (request, count) => {
        if (count > 1 || terminal === "valid") return proofFor(request.challenge)
        if (terminal === "error") throw new Error("private detail")
        return Object.freeze({ ...proofFor(request.challenge), producer_ref: "foreign" })
      } })
      const firstResult = await f.port.execute({ binding: f.tuple[4] }).catch((error) => error)
      expect(terminal === "valid" ? firstResult.status : firstResult.code).toBe(terminal === "valid" ? "MATCHED" : terminal === "error" ? "CT_HOST_RUNTIME_PRODUCER_UNAVAILABLE" : "CT_HOST_RUNTIME_PROOF_MISMATCH")
      expect(await codeOf(f.port.execute({ binding: f.tuple[4] }))).toBe("CT_HOST_RUNTIME_CHALLENGE_REUSED")
      await expect(f.port.execute({ binding: f.tuple[4] })).resolves.toMatchObject({ status: "MATCHED" })
      expect(f.counts().callCount).toBe(2)
    }
  })

  test("revalidates current context after issuance and after proof settlement", async () => {
    for (const driftPoint of ["issuance", "proof"]) {
      const tuple = context(), issueGate = deferred(), proofGate = deferred()
      let current = tuple, issueCount = 0, callCount = 0
      const producer = Object.freeze({ producer_ref: "producer-1", issueChallenge: async () => { issueCount += 1; return issueGate.promise }, call: async () => { callCount += 1; return proofGate.promise } })
      const port = createHostRuntimeProofPort({ operation: "HEALTH", producer, resolveContexts: () => [current] })
      const pending = port.execute({ binding: tuple[4] })
      if (driftPoint === "issuance") current = context({ digit: "2", port: 43102 })
      issueGate.resolve(challengeFor(tuple))
      for (let turn = 0; driftPoint === "proof" && callCount === 0 && turn < 10; turn += 1) await Promise.resolve()
      if (driftPoint === "proof") current = context({ digit: "2", port: 43102 })
      proofGate.resolve(proofFor(challengeFor(tuple)))
      expect(await codeOf(pending)).toBe("CT_HOST_RUNTIME_BINDING_CROSSED")
      expect(callCount).toBe(driftPoint === "issuance" ? 0 : 1)
      expect(issueCount).toBe(1)
    }
  })
})
