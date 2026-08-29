import { describe, expect, test } from "bun:test"
import { createHostRuntimeOwnership } from "../../../contracts/host-runtime/index.mjs"

const id = (kind, digit) => `ct_${kind}_${digit.repeat(32)}`
const context = ({ digit = "1", port = 43101, bindingId, incarnationId } = {}) => {
  const identity = { schema_version: "control-tower.host-runtime.identity/v1", runtime_id: id("runtime", digit) }
  const worktree = { schema_version: "control-tower.host-runtime.worktree/v1", worktree_id: id("worktree", digit) }
  const process = { schema_version: "control-tower.host-runtime.process/v1", process_id: id("process", digit) }
  const incarnation = { schema_version: "control-tower.host-runtime.incarnation/v1", incarnation_id: incarnationId ?? id("incarnation", digit) }
  const binding = {
    schema_version: "control-tower.host-runtime.binding/v1",
    binding_id: bindingId ?? id("binding", digit),
    runtime_id: identity.runtime_id,
    worktree_id: worktree.worktree_id,
    process_id: process.process_id,
    incarnation_id: incarnation.incarnation_id,
    loopback_port: port,
  }
  return [identity, worktree, process, incarnation, binding]
}

const expectCode = (operation, code) => {
  expect(operation).toThrow(expect.objectContaining({ name: "ContractError", code }))
  try { operation() } catch (error) {
    expect(error.diagnostics.every((item) => Object.keys(item).every((key) => ["component", "category"].includes(key)))).toBe(true)
    expect(JSON.stringify(error)).not.toMatch(/4310|ct_runtime|resolver|tuple|socket|listener|path/i)
  }
}

const rejectsCode = async (promise, code) => {
  const error = await promise.catch((failure) => failure)
  expect(error).toMatchObject({ name: "ContractError", code })
  expect(error.diagnostics.every((item) => Object.keys(item).every((key) => ["component", "category"].includes(key)))).toBe(true)
  expect(JSON.stringify(error)).not.toMatch(/4310|ct_runtime|resolver|tuple|socket|listener|path/i)
}

const serviceFor = (resolveContexts) => createHostRuntimeOwnership({ resolveContexts, acquireAtReservation: async () => async () => {} })

describe("exact host-runtime context", () => {
  test("rejects missing components instead of inferring them", async () => {
    const exact = context()
    for (const missing of [0, 1, 2, 3, 4]) {
      const candidate = [...exact]
      candidate[missing] = undefined
      await rejectsCode(serviceFor(() => [candidate]).reserve(exact[4]), "CT_HOST_RUNTIME_CONTEXT_MISSING")
    }
    await rejectsCode(serviceFor(() => []).reserve(exact[4]), "CT_HOST_RUNTIME_CONTEXT_MISSING")
  })

  test("fails closed for invalid bindings, resolver results, and constructor dependencies", async () => {
    const exact = context()
    await rejectsCode(serviceFor(() => [exact]).reserve({ ...exact[4], loopback_port: 0 }), "CT_HOST_RUNTIME_SCHEMA_INVALID")
    await rejectsCode(serviceFor(() => ({ first: exact })).reserve(exact[4]), "CT_HOST_RUNTIME_CONTEXT_MISSING")
    for (const candidate of [exact.slice(0, 4), [...exact, exact[4]]]) {
      await rejectsCode(serviceFor(() => [candidate]).reserve(exact[4]), "CT_HOST_RUNTIME_CONTEXT_MISSING")
    }
    for (const dependencies of [undefined, {}, { resolveContexts: null }]) {
      expect(() => createHostRuntimeOwnership(dependencies)).toThrow(new TypeError("resolveContexts must be a function"))
    }
  })

  test("rejects a supplied unpublished validator unless it is callable", () => {
    const resolveContexts = () => []
    for (const validateUnpublished of [null, false, {}, "validate"]) {
      expect(() => createHostRuntimeOwnership({ resolveContexts, validateUnpublished })).toThrow(
        new TypeError("validateUnpublished must be a function"),
      )
    }
  })

  test("validates every public component against its commit-1 schema", async () => {
    const exact = context()
    for (let component = 0; component < exact.length; component += 1) {
      const malformed = [...exact]
      malformed[component] = { ...malformed[component], inferred_host: "forbidden" }
      await rejectsCode(serviceFor(() => [malformed]).reserve(exact[4]), "CT_HOST_RUNTIME_SCHEMA_INVALID")
    }
  })

  test("rejects crossed tuples without sorting, normalization, or first-match selection", async () => {
    const one = context({ digit: "1" }), two = context({ digit: "2", port: 43102 })
    const crossed = [one[0], two[1], one[2], one[3], one[4]]
    await rejectsCode(serviceFor(() => [crossed]).reserve(one[4]), "CT_HOST_RUNTIME_BINDING_CROSSED")

    const normalized = [...one]
    normalized[0] = { ...one[0], runtime_id: one[0].runtime_id.toUpperCase() }
    await rejectsCode(serviceFor(() => [normalized]).reserve(one[4]), "CT_HOST_RUNTIME_SCHEMA_INVALID")

    await rejectsCode(serviceFor(() => [one, [...one]]).reserve(one[4]), "CT_HOST_RUNTIME_CONTEXT_AMBIGUOUS")
  })
})

describe("unpublished ownership validation", () => {
  test("preserves the no-hook reservation and service shapes", async () => {
    const exact = context(); let acquisitions = 0, closes = 0
    const ownership = createHostRuntimeOwnership({
      resolveContexts: () => [exact],
      acquireAtReservation: async () => { acquisitions += 1; return async () => { closes += 1 } },
    })

    const result = await ownership.reserve(exact[4])
    expect(result).toEqual({ binding_id: exact[4].binding_id, incarnation_id: exact[3].incarnation_id, loopback_port: exact[4].loopback_port })
    expect(Object.keys(ownership).sort()).toEqual(["dispose", "release", "reserve"])
    expect(acquisitions).toBe(1)
    await ownership.release(exact[4])
    expect(closes).toBe(1)
  })

  test("validates immutable neutral metadata after acquisition and before publication", async () => {
    const exact = context(), gate = Promise.withResolvers(), events = [], views = []
    let closes = 0
    const ownership = createHostRuntimeOwnership({
      resolveContexts: () => [exact],
      acquireAtReservation: async () => {
        events.push("acquire")
        return async () => { closes += 1 }
      },
      validateUnpublished: async (view) => {
        events.push("validate")
        views.push(view)
        expect(Object.isFrozen(view)).toBe(true)
        await rejectsCode(ownership.reserve(exact[4]), "CT_HOST_RUNTIME_PORT_RESERVED")
        await gate.promise
      },
    })

    const reservation = ownership.reserve(exact[4])
    await Promise.resolve()
    expect(events).toEqual(["acquire", "validate"])
    expect(views).toEqual([{
      binding_id: exact[4].binding_id,
      runtime_id: exact[0].runtime_id,
      worktree_id: exact[1].worktree_id,
      process_id: exact[2].process_id,
      incarnation_id: exact[3].incarnation_id,
      loopback_port: exact[4].loopback_port,
    }])
    expect(Object.keys(views[0]).sort()).toEqual(["binding_id", "incarnation_id", "loopback_port", "process_id", "runtime_id", "worktree_id"])
    expect(views[0].close).toBeUndefined()
    expect(views[0].release).toBeUndefined()
    expect(closes).toBe(0)
    await rejectsCode(Promise.resolve().then(() => ownership.release(exact[4])), "CT_HOST_RUNTIME_NOT_OWNER")
    expect(closes).toBe(0)
    gate.resolve()
    await reservation
    await ownership.release(exact[4])
    expect(closes).toBe(1)
  })

  test("closes the exact unpublished acquisition after synchronous validation failure", async () => {
    const exact = context(); let exactClose, closes = 0
    const ownership = createHostRuntimeOwnership({
      resolveContexts: () => [exact],
      acquireAtReservation: async () => exactClose = async () => { closes += 1 },
      validateUnpublished: () => { throw new Error("private validation detail") },
    })

    await rejectsCode(ownership.reserve(exact[4]), "CT_HOST_RUNTIME_ACQUISITION_FAILED")
    expect(closes).toBe(1)
    await rejectsCode(Promise.resolve().then(() => ownership.release(exact[4])), "CT_HOST_RUNTIME_NOT_OWNER")
    expect(exactClose).toBeInstanceOf(Function)
  })

  test("does not publish or acknowledge after disposal begins during validation", async () => {
    const exact = context(), validation = Promise.withResolvers(); let closes = 0
    const ownership = createHostRuntimeOwnership({
      resolveContexts: () => [exact],
      acquireAtReservation: async () => async () => { closes += 1 },
      validateUnpublished: async () => validation.promise,
    })

    const reservation = ownership.reserve(exact[4])
    await Promise.resolve()
    const disposal = ownership.dispose()
    validation.resolve()
    await rejectsCode(reservation, "CT_HOST_RUNTIME_CLEANUP_FAILED")
    await disposal
    expect(closes).toBe(1)
    await rejectsCode(Promise.resolve().then(() => ownership.release(exact[4])), "CT_HOST_RUNTIME_NOT_OWNER")
  })

  test("publishes only one same-owner reservation after concurrent validation", async () => {
    const first = context({ port: 43101 }), second = context({ digit: "2", port: 43102 })
    second[0] = first[0]; second[1] = first[1]; second[2] = first[2]
    Object.assign(second[4], { runtime_id: first[4].runtime_id, worktree_id: first[4].worktree_id, process_id: first[4].process_id })
    const tuples = new Map([[first[4], first], [second[4], second]])
    const gates = new Map([[first[4].loopback_port, Promise.withResolvers()], [second[4].loopback_port, Promise.withResolvers()]])
    const validating = [], closes = new Map()
    const ownership = createHostRuntimeOwnership({
      resolveContexts: (binding) => [tuples.get(binding)],
      acquireAtReservation: async (_, port) => async () => closes.set(port, (closes.get(port) ?? 0) + 1),
      validateUnpublished: async (record) => { validating.push(record.loopback_port); await gates.get(record.loopback_port).promise },
    })

    const winner = ownership.reserve(first[4]), loser = ownership.reserve(second[4])
    await Promise.resolve()
    expect(validating.sort()).toEqual([43101, 43102])
    gates.get(43101).resolve()
    expect(await winner).toMatchObject({ loopback_port: 43101 })
    gates.get(43102).resolve()
    await rejectsCode(loser, "CT_HOST_RUNTIME_CLEANUP_FAILED")
    expect(closes.get(43102)).toBe(1)
    await rejectsCode(Promise.resolve().then(() => ownership.release(second[4])), "CT_HOST_RUNTIME_NOT_OWNER")
    await ownership.release(first[4])
    expect(closes.get(43101)).toBe(1)
  })
})

describe("private current and retired ownership", () => {
  test("rejects binding-id movement and a second binding for an active owner", async () => {
    const first = context(), moved = context({ port: 43102, bindingId: first[4].binding_id })
    const second = context({ digit: "2", port: 43102 })
    second[0] = first[0]; second[1] = first[1]; second[2] = first[2]
    Object.assign(second[4], { runtime_id: first[4].runtime_id, worktree_id: first[4].worktree_id, process_id: first[4].process_id })
    const candidates = new Map([[first[4], [first]], [moved[4], [moved]], [second[4], [second]]])
    const ownership = serviceFor((binding) => candidates.get(binding))
    await ownership.reserve(first[4])
    await rejectsCode(ownership.reserve(moved[4]), "CT_HOST_RUNTIME_BINDING_CROSSED")
    await rejectsCode(ownership.reserve(second[4]), "CT_HOST_RUNTIME_BINDING_ACTIVE")
  })

  test("rejects active-port collisions between distinct owners", async () => {
    const first = context(), collision = context({ digit: "2", port: first[4].loopback_port })
    const ownership = serviceFor((binding) => [[first, collision].find((tuple) => tuple[4] === binding)])
    await ownership.reserve(first[4])
    await rejectsCode(ownership.reserve(collision[4]), "CT_HOST_RUNTIME_PORT_RESERVED")
  })

  test("rejects foreign, stale-incarnation, and already-released release attempts", async () => {
    const current = context(), foreign = context({ digit: "2", port: current[4].loopback_port })
    const stale = context({ digit: "3", port: current[4].loopback_port })
    stale[0] = current[0]; stale[1] = current[1]; stale[2] = current[2]
    Object.assign(stale[4], { runtime_id: current[4].runtime_id, worktree_id: current[4].worktree_id, process_id: current[4].process_id })
    const tuples = [current, foreign, stale]
    const ownership = serviceFor((binding) => [tuples.find((tuple) => tuple[4] === binding)])

    await ownership.reserve(current[4])
    await rejectsCode(Promise.resolve().then(() => ownership.release(foreign[4])), "CT_HOST_RUNTIME_NOT_OWNER")
    await rejectsCode(Promise.resolve().then(() => ownership.release(stale[4])), "CT_HOST_RUNTIME_NOT_OWNER")
    await ownership.release(current[4])
    await rejectsCode(Promise.resolve().then(() => ownership.release(current[4])), "CT_HOST_RUNTIME_NOT_OWNER")
  })

  test("preserves immutable history and rejects stale replay after release and port reuse", async () => {
    const first = context(), replayBinding = { ...first[4] }
    const replacement = context({ digit: "2", port: first[4].loopback_port })
    replacement[0] = first[0]; replacement[1] = first[1]; replacement[2] = first[2]
    Object.assign(replacement[4], { runtime_id: first[4].runtime_id, worktree_id: first[4].worktree_id, process_id: first[4].process_id })
    const staleIncarnation = context({ digit: "3", port: 43103, incarnationId: first[3].incarnation_id })
    const tuples = [first, replacement, staleIncarnation]
    const ownership = serviceFor((binding) => tuples.filter((tuple) => tuple[4] === binding || tuple[4].binding_id === binding.binding_id))

    await ownership.reserve(first[4])
    await ownership.release(first[4])
    await ownership.reserve(replacement[4])
    await rejectsCode(ownership.reserve(replayBinding), "CT_HOST_RUNTIME_STALE")
    await rejectsCode(ownership.reserve(staleIncarnation[4]), "CT_HOST_RUNTIME_STALE")
    await ownership.release(replacement[4])
    await rejectsCode(ownership.reserve(first[4]), "CT_HOST_RUNTIME_STALE")
  })
})
