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

const serviceFor = (resolveContexts) => createHostRuntimeOwnership({ resolveContexts })

describe("exact host-runtime context", () => {
  test("rejects missing components instead of inferring them", () => {
    const exact = context()
    for (const missing of [0, 1, 2, 3, 4]) {
      const candidate = [...exact]
      candidate[missing] = undefined
      expectCode(() => serviceFor(() => [candidate]).activate(exact[4]), "CT_HOST_RUNTIME_CONTEXT_MISSING")
    }
    expectCode(() => serviceFor(() => []).activate(exact[4]), "CT_HOST_RUNTIME_CONTEXT_MISSING")
  })

  test("fails closed for invalid bindings, resolver results, and constructor dependencies", () => {
    const exact = context()
    expectCode(() => serviceFor(() => [exact]).activate({ ...exact[4], loopback_port: 0 }), "CT_HOST_RUNTIME_SCHEMA_INVALID")
    expectCode(() => serviceFor(() => ({ first: exact })).activate(exact[4]), "CT_HOST_RUNTIME_CONTEXT_MISSING")
    for (const candidate of [exact.slice(0, 4), [...exact, exact[4]]]) {
      expectCode(() => serviceFor(() => [candidate]).activate(exact[4]), "CT_HOST_RUNTIME_CONTEXT_MISSING")
    }
    for (const dependencies of [undefined, {}, { resolveContexts: null }]) {
      expect(() => createHostRuntimeOwnership(dependencies)).toThrow(new TypeError("resolveContexts must be a function"))
    }
  })

  test("validates every public component against its commit-1 schema", () => {
    const exact = context()
    for (let component = 0; component < exact.length; component += 1) {
      const malformed = [...exact]
      malformed[component] = { ...malformed[component], inferred_host: "forbidden" }
      expectCode(() => serviceFor(() => [malformed]).activate(exact[4]), "CT_HOST_RUNTIME_SCHEMA_INVALID")
    }
  })

  test("rejects crossed tuples without sorting, normalization, or first-match selection", () => {
    const one = context({ digit: "1" }), two = context({ digit: "2", port: 43102 })
    const crossed = [one[0], two[1], one[2], one[3], one[4]]
    expectCode(() => serviceFor(() => [crossed]).activate(one[4]), "CT_HOST_RUNTIME_BINDING_CROSSED")

    const normalized = [...one]
    normalized[0] = { ...one[0], runtime_id: one[0].runtime_id.toUpperCase() }
    expectCode(() => serviceFor(() => [normalized]).activate(one[4]), "CT_HOST_RUNTIME_SCHEMA_INVALID")

    expectCode(() => serviceFor(() => [one, [...one]]).activate(one[4]), "CT_HOST_RUNTIME_CONTEXT_AMBIGUOUS")
  })
})

describe("private current and retired ownership", () => {
  test("rejects binding-id movement and a second binding for an active owner", () => {
    const first = context(), moved = context({ port: 43102, bindingId: first[4].binding_id })
    const second = context({ digit: "2", port: 43102 })
    second[0] = first[0]; second[1] = first[1]; second[2] = first[2]
    Object.assign(second[4], { runtime_id: first[4].runtime_id, worktree_id: first[4].worktree_id, process_id: first[4].process_id })
    const candidates = new Map([[first[4], [first]], [moved[4], [moved]], [second[4], [second]]])
    const ownership = serviceFor((binding) => candidates.get(binding))
    ownership.activate(first[4])
    expectCode(() => ownership.activate(moved[4]), "CT_HOST_RUNTIME_BINDING_CROSSED")
    expectCode(() => ownership.activate(second[4]), "CT_HOST_RUNTIME_BINDING_ACTIVE")
  })

  test("rejects active-port collisions between distinct owners", () => {
    const first = context(), collision = context({ digit: "2", port: first[4].loopback_port })
    const ownership = serviceFor((binding) => [[first, collision].find((tuple) => tuple[4] === binding)])
    ownership.activate(first[4])
    expectCode(() => ownership.activate(collision[4]), "CT_HOST_RUNTIME_PORT_RESERVED")
  })

  test("rejects foreign, stale-incarnation, and already-released release attempts", () => {
    const current = context(), foreign = context({ digit: "2", port: current[4].loopback_port })
    const stale = context({ digit: "3", port: current[4].loopback_port })
    stale[0] = current[0]; stale[1] = current[1]; stale[2] = current[2]
    Object.assign(stale[4], { runtime_id: current[4].runtime_id, worktree_id: current[4].worktree_id, process_id: current[4].process_id })
    const tuples = [current, foreign, stale]
    const ownership = serviceFor((binding) => [tuples.find((tuple) => tuple[4] === binding)])

    ownership.activate(current[4])
    expectCode(() => ownership.release(foreign[4]), "CT_HOST_RUNTIME_NOT_OWNER")
    expectCode(() => ownership.release(stale[4]), "CT_HOST_RUNTIME_NOT_OWNER")
    ownership.release(current[4])
    expectCode(() => ownership.release(current[4]), "CT_HOST_RUNTIME_NOT_OWNER")
  })

  test("preserves immutable history and rejects stale replay after release and port reuse", () => {
    const first = context(), replayBinding = { ...first[4] }
    const replacement = context({ digit: "2", port: first[4].loopback_port })
    replacement[0] = first[0]; replacement[1] = first[1]; replacement[2] = first[2]
    Object.assign(replacement[4], { runtime_id: first[4].runtime_id, worktree_id: first[4].worktree_id, process_id: first[4].process_id })
    const staleIncarnation = context({ digit: "3", port: 43103, incarnationId: first[3].incarnation_id })
    const tuples = [first, replacement, staleIncarnation]
    const ownership = serviceFor((binding) => tuples.filter((tuple) => tuple[4] === binding || tuple[4].binding_id === binding.binding_id))

    ownership.activate(first[4])
    ownership.release(first[4])
    ownership.activate(replacement[4])
    expectCode(() => ownership.activate(replayBinding), "CT_HOST_RUNTIME_STALE")
    expectCode(() => ownership.activate(staleIncarnation[4]), "CT_HOST_RUNTIME_STALE")
    ownership.release(replacement[4])
    expectCode(() => ownership.activate(first[4]), "CT_HOST_RUNTIME_STALE")
  })
})
