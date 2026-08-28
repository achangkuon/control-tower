import { afterEach, describe, expect, test } from "bun:test"
import { createServer } from "node:net"
import { createHostRuntimeOwnership } from "../../../contracts/host-runtime/index.mjs"
import { acquireNodeLoopbackAtReservation } from "../../../contracts/host-runtime/node-loopback-acquisition.mjs"

const id = (kind, digit) => `ct_${kind}_${digit.repeat(32)}`
const context = (digit = "1", port = 43101) => {
  const identity = { schema_version: "control-tower.host-runtime.identity/v1", runtime_id: id("runtime", digit) }
  const worktree = { schema_version: "control-tower.host-runtime.worktree/v1", worktree_id: id("worktree", digit) }
  const process = { schema_version: "control-tower.host-runtime.process/v1", process_id: id("process", digit) }
  const incarnation = { schema_version: "control-tower.host-runtime.incarnation/v1", incarnation_id: id("incarnation", digit) }
  const binding = { schema_version: "control-tower.host-runtime.binding/v1", binding_id: id("binding", digit), runtime_id: identity.runtime_id, worktree_id: worktree.worktree_id, process_id: process.process_id, incarnation_id: incarnation.incarnation_id, loopback_port: port }
  return [identity, worktree, process, incarnation, binding]
}
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const closeServer = (server) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
const listen = (port = 0) => new Promise((resolve, reject) => {
  const server = createServer().once("error", reject).listen({ host: "127.0.0.1", port, exclusive: true }, () => resolve(server))
})
const rejectsCode = async (promise, code) => expect(promise).rejects.toMatchObject({ name: "ContractError", code })
const services = []
afterEach(async () => { await Promise.allSettled(services.splice(0).map((service) => service.dispose())) })
const serviceFor = (tuples, acquireAtReservation) => {
  const service = createHostRuntimeOwnership({ resolveContexts: (binding) => tuples.filter((tuple) => tuple[4] === binding), ...(acquireAtReservation ? { acquireAtReservation } : {}) })
  services.push(service)
  return service
}

describe("final loopback listener acquisition", () => {
  test("exposes no acquisition-free ownership path", () => {
    const exact = context()
    const service = serviceFor([exact], async () => async () => {})
    expect(Object.keys(service).sort()).toEqual(["dispose", "release", "reserve"])
    expect(service.activate).toBeUndefined()
  })

  test("keeps a cleanup-pending port unavailable to later reservations", async () => {
    const first = context("b", 43111), uncertain = context("c", 43112), replacement = context("d", 43112)
    first[0] = uncertain[0]; first[1] = uncertain[1]; first[2] = uncertain[2]
    Object.assign(first[4], { runtime_id: uncertain[4].runtime_id, worktree_id: uncertain[4].worktree_id, process_id: uncertain[4].process_id })
    const firstGate = deferred(), secondGate = deferred()
    const service = serviceFor([first, uncertain, replacement], async (_, port) => {
      if (port === first[4].loopback_port) { await firstGate.promise; return async () => {} }
      await secondGate.promise
      return async () => { throw new Error("uncertain") }
    })
    const one = service.reserve(first[4]), two = service.reserve(uncertain[4])
    firstGate.resolve(); await one
    secondGate.resolve(); await rejectsCode(two, "CT_HOST_RUNTIME_CLEANUP_FAILED")
    await rejectsCode(service.reserve(replacement[4]), "CT_HOST_RUNTIME_PORT_RESERVED")
  })

  test("serializes pending ownership and passes the exact context once without a handoff", async () => {
    const exact = context(), gate = deferred(), calls = [], events = []
    const service = serviceFor([exact], async (received, port) => {
      calls.push([received, port]); events.push("held"); await gate.promise
      return async () => { events.push("closed") }
    })
    const reservation = service.reserve(exact[4])
    await Promise.resolve()
    await rejectsCode(service.reserve(exact[4]), "CT_HOST_RUNTIME_PORT_RESERVED")
    expect(calls).toEqual([[exact, exact[4].loopback_port]])
    expect(events).toEqual(["held"])
    gate.resolve()
    expect(await reservation).toEqual({ binding_id: exact[4].binding_id, incarnation_id: exact[3].incarnation_id, loopback_port: exact[4].loopback_port })
    expect(events).toEqual(["held"])
    await service.release(exact[4])
    expect(events).toEqual(["held", "closed"])
    expect(Object.keys(service).sort()).toEqual(["dispose", "release", "reserve"])
  })

  test("holds the real final listener until exact release and returns bounded metadata", async () => {
    const probe = await listen(), port = probe.address().port
    await closeServer(probe)
    const exact = context("2", port), foreign = context("3", port), service = serviceFor([exact, foreign])
    const result = await service.reserve(exact[4])
    expect(Object.keys(result).sort()).toEqual(["binding_id", "incarnation_id", "loopback_port"])
    await expect(listen(port)).rejects.toMatchObject({ code: "EADDRINUSE" })
    await rejectsCode(Promise.resolve().then(() => service.release(foreign[4])), "CT_HOST_RUNTIME_NOT_OWNER")
    await expect(listen(port)).rejects.toMatchObject({ code: "EADDRINUSE" })
    expect(await service.release(exact[4])).toEqual(result)
    const reusable = await listen(port)
    await closeServer(reusable)
  })

  test("maps an externally occupied ephemeral port and acquisition failures closed", async () => {
    const occupied = await listen(), exact = context("4", occupied.address().port)
    const service = serviceFor([exact])
    await rejectsCode(service.reserve(exact[4]), "CT_HOST_RUNTIME_PORT_OCCUPIED")
    await closeServer(occupied)
    const broken = serviceFor([exact], async () => { throw new Error("private detail") })
    await rejectsCode(broken.reserve(exact[4]), "CT_HOST_RUNTIME_ACQUISITION_FAILED")
  })

  test("keeps cleanup uncertainty fail-closed while dispose races pending acquisition", async () => {
    const exact = context("5"), gate = deferred(); let closes = 0
    const service = serviceFor([exact], async () => { await gate.promise; return async () => { closes++; throw new Error("uncertain") } })
    const pending = service.reserve(exact[4])
    await Promise.resolve()
    const pendingCheck = pending.catch((error) => error)
    const disposal = service.dispose().catch((error) => error)
    gate.resolve()
    expect(await pendingCheck).toMatchObject({ code: "CT_HOST_RUNTIME_CLEANUP_FAILED" })
    expect(await disposal).toMatchObject({ code: "CT_HOST_RUNTIME_CLEANUP_FAILED" })
    expect(closes).toBe(2)
  })

  test("rejects reservations that start after the terminal disposal gate", async () => {
    const exact = context("9"); let acquisitions = 0
    const service = serviceFor([exact], async () => { acquisitions++; return async () => {} })
    const disposal = service.dispose()
    await rejectsCode(service.reserve(exact[4]), "CT_HOST_RUNTIME_CLEANUP_FAILED")
    await disposal
    expect(acquisitions).toBe(0)
    await rejectsCode(service.reserve(exact[4]), "CT_HOST_RUNTIME_CLEANUP_FAILED")
    expect(acquisitions).toBe(0)
  })

  test("rejects stale and already-released authority without closing, and retries active close failure", async () => {
    const first = context("6"), replacement = context("7", first[4].loopback_port); let closes = 0
    const service = serviceFor([first, replacement], async () => async () => { if (++closes === 1) throw new Error("transient") })
    await service.reserve(first[4])
    await rejectsCode(service.release(first[4]), "CT_HOST_RUNTIME_CLEANUP_FAILED")
    expect(closes).toBe(1)
    await service.release(first[4])
    expect(closes).toBe(2)
    await rejectsCode(Promise.resolve().then(() => service.release(first[4])), "CT_HOST_RUNTIME_NOT_OWNER")
    await rejectsCode(service.reserve(first[4]), "CT_HOST_RUNTIME_STALE")
    expect(closes).toBe(2)
    await service.reserve(replacement[4]); await service.release(replacement[4])
  })

  test("coalesces concurrent exact release and Node close calls", async () => {
    const exact = context("8"), gate = deferred(); let closes = 0
    const service = serviceFor([exact], async () => async () => { closes++; await gate.promise })
    await service.reserve(exact[4])
    const first = service.release(exact[4]), second = service.release(exact[4])
    await Promise.resolve()
    expect(closes).toBe(1)
    gate.resolve()
    expect(await first).toEqual(await second)

    const probe = await listen(), port = probe.address().port
    await closeServer(probe)
    const close = await acquireNodeLoopbackAtReservation([], port)
    await Promise.all([close(), close()])
    const reusable = await listen(port)
    await closeServer(reusable)
  })

  test("coalesces concurrent dispose and exact release through one close", async () => {
    const exact = context("a"), gate = deferred(); let closes = 0
    const service = serviceFor([exact], async () => async () => { closes++; await gate.promise })
    await service.reserve(exact[4])
    const disposal = service.dispose()
    await Promise.resolve()
    const release = service.release(exact[4])
    await Promise.resolve()
    expect(closes).toBe(1)
    gate.resolve()
    expect(await release).toEqual({ binding_id: exact[4].binding_id, incarnation_id: exact[3].incarnation_id, loopback_port: exact[4].loopback_port })
    expect(await disposal).toBeUndefined()
    expect(closes).toBe(1)
    await rejectsCode(Promise.resolve().then(() => service.release(exact[4])), "CT_HOST_RUNTIME_NOT_OWNER")
  })
})
