import { describe, expect, test } from "bun:test"

import { createPiAdapterGate } from "../../../adapters/pi/contract.mjs"

const id = (kind, digit) => `ct_${kind}_${digit.repeat(32)}`
const context = (digit = "1") => {
  const identity = { schema_version: "control-tower.host-runtime.identity/v1", runtime_id: id("runtime", digit) }
  const worktree = { schema_version: "control-tower.host-runtime.worktree/v1", worktree_id: id("worktree", digit) }
  const process = { schema_version: "control-tower.host-runtime.process/v1", process_id: id("process", digit) }
  const incarnation = { schema_version: "control-tower.host-runtime.incarnation/v1", incarnation_id: id("incarnation", digit) }
  const binding = {
    schema_version: "control-tower.host-runtime.binding/v1", binding_id: id("binding", digit),
    runtime_id: identity.runtime_id, worktree_id: worktree.worktree_id, process_id: process.process_id,
    incarnation_id: incarnation.incarnation_id, loopback_port: 43101,
  }
  return [identity, worktree, process, incarnation, binding]
}
const exact = (value, keys) => Object.keys(value).sort().join(",") === [...keys].sort().join(",")
const receipt = (name = "receipt-a") => Object.freeze({ transport: "intercom", wire: { message: name }, authority: "claimed" })
const grant = (tuple, opaque, overrides = {}) => ({
  receipt_identity: opaque,
  binding_id: tuple[4].binding_id,
  worktree_id: tuple[1].worktree_id,
  scope_id: "plan-1.s1-17",
  endpoint_epoch: "endpoint-epoch-7",
  role: "IMPLEMENTER",
  capabilities: ["read", "write", "edit", "bash"],
  ...overrides,
})
const fixture = ({ tuples, verify } = {}) => {
  const current = tuples ?? [context()]
  const verifyTowerReceipt = verify ?? ((opaque) => grant(current[0], opaque))
  const gate = createPiAdapterGate({
    resolveContexts: (binding) => current.filter((tuple) => tuple[4].binding_id === binding.binding_id),
    verifyTowerReceipt,
  })
  return { current, gate }
}
const input = (tuple, opaque = receipt(), requestedCapabilities = ["read", "write", "edit", "bash"]) => ({ binding: tuple[4], receipt: opaque, requestedCapabilities })
const code = async (operation) => { try { await operation(); return "NO_ERROR" } catch (error) { return error?.code ?? error?.name } }
const deferred = () => {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

describe("S1.17 dormant Pi adapter authorization gate", () => {
  test("requires exactly the two constructor capabilities and exposes only frozen authorize", () => {
    const resolver = () => [], verifier = () => {}
    for (const dependencies of [undefined, {}, { resolveContexts: resolver }, { verifyTowerReceipt: verifier }, { resolveContexts: resolver, verifyTowerReceipt: verifier, transport: {} }]) {
      expect(() => createPiAdapterGate(dependencies)).toThrow()
    }
    const gate = createPiAdapterGate({ resolveContexts: resolver, verifyTowerReceipt: verifier })
    expect(Object.keys(gate)).toEqual(["authorize"])
    expect(Object.isFrozen(gate)).toBe(true)
  })

  test("accepts only binding, receipt, and requested capabilities from the caller", async () => {
    const { current, gate } = fixture(), valid = input(current[0])
    for (const malformed of [{}, { ...valid, extra: true }]) expect(await code(() => gate.authorize(malformed))).toBe("CT_PI_AUTH_INPUT_INVALID")
    for (const field of ["role", "capabilities", "scope_id", "endpoint_epoch", "worktree", "incarnation", "incarnation_id", "owner", "authority"]) {
      expect(await code(() => gate.authorize({ ...valid, [field]: "claimed" }))).toBe("CT_PI_AUTH_INPUT_INVALID")
    }
  })

  test("fails closed for invalid, absent, ambiguous, and crossed neutral binding contexts", async () => {
    const one = context("1"), crossed = context("2"), opaque = receipt()
    expect(await code(() => fixture().gate.authorize({ ...input(one, opaque), binding: { ...one[4], adapter: "pi" } }))).toBe("CT_HOST_RUNTIME_SCHEMA_INVALID")
    expect(await code(() => fixture({ tuples: [] }).gate.authorize(input(one, opaque)))).toBe("CT_HOST_RUNTIME_CONTEXT_MISSING")
    const ambiguous = createPiAdapterGate({ resolveContexts: () => [one, one], verifyTowerReceipt: () => grant(one, opaque) })
    expect(await code(() => ambiguous.authorize(input(one, opaque)))).toBe("CT_HOST_RUNTIME_CONTEXT_AMBIGUOUS")
    const crossedGate = createPiAdapterGate({ resolveContexts: () => [crossed], verifyTowerReceipt: () => grant(one, opaque) })
    expect(await code(() => crossedGate.authorize(input(one, opaque)))).toBe("CT_HOST_RUNTIME_BINDING_CROSSED")
  })

  test("requires the exact plain Tower grant bound to receipt, current binding, and worktree", async () => {
    const tuple = context(), opaque = receipt(), other = receipt("other")
    const cases = [
      [null, "CT_PI_TOWER_GRANT_INVALID"],
      [{ ...grant(tuple, opaque), extra: true }, "CT_PI_TOWER_GRANT_INVALID"],
      [Object.assign(Object.create(null), grant(tuple, opaque)), "CT_PI_TOWER_GRANT_INVALID"],
      [grant(tuple, other), "CT_PI_RECEIPT_STALE"],
      [grant(tuple, opaque, { binding_id: id("binding", "2") }), "CT_PI_BINDING_MISMATCH"],
      [grant(tuple, opaque, { worktree_id: id("worktree", "2") }), "CT_PI_WORKTREE_MISMATCH"],
    ]
    for (const [towerGrant, expected] of cases) {
      const { gate } = fixture({ tuples: [tuple], verify: () => towerGrant })
      expect(await code(() => gate.authorize(input(tuple, opaque)))).toBe(expected)
    }
  })

  test("keeps scope, endpoint epoch, capabilities, and incarnation as distinct facts", async () => {
    const tuple = context(), opaque = receipt()
    const { gate } = fixture({ tuples: [tuple], verify: () => grant(tuple, opaque, { scope_id: "broker-scope-9", endpoint_epoch: "connection-42" }) })
    const result = await gate.authorize(input(tuple, opaque, ["read", "bash"]))
    expect(result.scope_id).toBe("broker-scope-9")
    expect(result.endpoint_epoch).toBe("connection-42")
    expect(result.incarnation_id).toBe(tuple[3].incarnation_id)
    expect(result.endpoint_epoch).not.toBe(result.incarnation_id)
    expect(result.capabilities).toEqual(["read", "bash"])
  })

  test("rejects malformed broker scope, endpoint epoch, and capability grants", async () => {
    const tuple = context()
    const malformed = [
      [{ scope_id: "" }, "CT_PI_SCOPE_ID_INVALID"], [{ scope_id: "scope with spaces" }, "CT_PI_SCOPE_ID_INVALID"], [{ scope_id: {} }, "CT_PI_SCOPE_ID_INVALID"],
      [{ endpoint_epoch: "" }, "CT_PI_ENDPOINT_EPOCH_INVALID"], [{ endpoint_epoch: "epoch\n2" }, "CT_PI_ENDPOINT_EPOCH_INVALID"], [{ endpoint_epoch: 2 }, "CT_PI_ENDPOINT_EPOCH_INVALID"],
      [{ capabilities: ["read", "read"] }, "CT_PI_CAPABILITY_INVALID"], [{ capabilities: "read" }, "CT_PI_CAPABILITY_INVALID"],
    ]
    for (const [overrides, expected] of malformed) {
      const opaque = receipt(JSON.stringify(overrides)), { gate } = fixture({ tuples: [tuple], verify: () => grant(tuple, opaque, overrides) })
      expect(await code(() => gate.authorize(input(tuple, opaque, ["read"])))).toBe(expected)
    }
  })

  test("enforces the closed role capability matrix and exact requested subset", async () => {
    const tuple = context()
    for (const [role, capabilities] of [["IMPLEMENTER", ["read", "write", "edit", "bash"]], ["COORDINATOR", ["read"]], ["SUPPORT", ["read"]]]) {
      const opaque = receipt(role), { gate } = fixture({ tuples: [tuple], verify: () => grant(tuple, opaque, { role, capabilities }) })
      expect((await gate.authorize(input(tuple, opaque, capabilities))).capabilities).toEqual(capabilities)
    }
    for (const [role, capabilities] of [["COORDINATOR", ["read", "bash"]], ["SUPPORT", ["read", "write"]], ["READER", ["read"]], ["IMPLEMENTER", ["read", "authority"]]]) {
      const opaque = receipt(`${role}-${capabilities}`), { gate } = fixture({ tuples: [tuple], verify: () => grant(tuple, opaque, { role, capabilities }) })
      expect(await code(() => gate.authorize(input(tuple, opaque, ["read"])))).toBe("CT_PI_CAPABILITY_INVALID")
    }
    for (const requested of [["read", "read"], ["read", "network"], "read", { read: true }]) {
      const opaque = receipt(String(requested)), { gate } = fixture({ tuples: [tuple], verify: () => grant(tuple, opaque) })
      expect(await code(() => gate.authorize(input(tuple, opaque, requested)))).toBe("CT_PI_CAPABILITY_REQUEST_INVALID")
    }
  })

  test("keeps receipts opaque and clears rejected or invalid in-flight reservations for retry", async () => {
    const tuple = context(), firstReceipt = receipt("rejected"), retryReceipt = receipt("retry"), barrier = deferred(), failure = new Error("tower unavailable")
    let calls = 0, seen
    const { gate } = fixture({ tuples: [tuple], verify: (opaque) => { calls++; seen = opaque; return calls === 1 ? barrier.promise : grant(tuple, opaque) } })
    const rejected = gate.authorize(input(tuple, firstReceipt, ["read"]))
    barrier.reject(failure)
    await expect(rejected).rejects.toBe(failure)
    expect(seen).toBe(firstReceipt)
    expect((await gate.authorize(input(tuple, retryReceipt, ["read"]))).capabilities).toEqual(["read"])
    expect(calls).toBe(2)

    let syncCalls = 0
    const syncGate = fixture({ tuples: [tuple], verify: (opaque) => { if (++syncCalls === 1) throw failure; return grant(tuple, opaque) } }).gate
    await expect(syncGate.authorize(input(tuple, receipt("sync-reject"), ["read"]))).rejects.toBe(failure)
    expect((await syncGate.authorize(input(tuple, receipt("sync-retry"), ["read"]))).role).toBe("IMPLEMENTER")

    let validationCalls = 0
    const validationGate = fixture({ tuples: [tuple], verify: (opaque) => grant(tuple, opaque, validationCalls++ === 0 ? { scope_id: "" } : {}) }).gate
    expect(await code(() => validationGate.authorize(input(tuple, receipt("invalid"), ["read"])))).toBe("CT_PI_SCOPE_ID_INVALID")
    expect((await validationGate.authorize(input(tuple, receipt("valid"), ["read"]))).scope_id).toBe("plan-1.s1-17")
  })

  test("coalesces exact replay and reserves a binding before concurrent takeover verification", async () => {
    const tuple = context(), firstReceipt = receipt("first"), secondReceipt = receipt("second"), barrier = deferred()
    let calls = 0
    const { gate } = fixture({ tuples: [tuple], verify: async (opaque) => { calls++; await barrier.promise; return grant(tuple, opaque) } })
    const request = input(tuple, firstReceipt, ["read"]), first = gate.authorize(request), replay = gate.authorize(request)
    const takeoverCode = await code(() => gate.authorize(input(tuple, secondReceipt, ["read"])))
    expect(takeoverCode).toBe("CT_PI_TAKEOVER_REJECTED")
    expect(calls).toBe(1)
    barrier.resolve()
    expect(await replay).toBe(await first)
    expect(await gate.authorize(request)).toBe(await first)
    expect(await code(() => gate.authorize(input(tuple, firstReceipt, ["bash"])))).toBe("CT_PI_REPLAY_DIVERGED")
    expect(await code(() => gate.authorize(input(tuple, secondReceipt, ["read"])))).toBe("CT_PI_TAKEOVER_REJECTED")
    expect(calls).toBe(1)
  })

  test("returns only the exact deeply frozen private authorization result", async () => {
    const tuple = context(), opaque = receipt(), { gate } = fixture({ tuples: [tuple] })
    const result = await gate.authorize(input(tuple, opaque, ["read", "bash"]))
    expect(exact(result, ["binding_id", "worktree_id", "incarnation_id", "scope_id", "endpoint_epoch", "role", "capabilities"])).toBe(true)
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.capabilities)).toBe(true)
    expect(JSON.stringify(result)).not.toMatch(/intercom|wire|receipt|transport|authority/i)
  })
})
