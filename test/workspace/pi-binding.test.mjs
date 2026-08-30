import { describe, expect, test } from "bun:test"

import { createPiBindingVerifier } from "../../workspace/pi-binding.mjs"

const hex = (seed) => seed.repeat(32).slice(0, 32)
const RUNTIME = `ct_runtime_${hex("a")}`, WORKTREE = `ct_worktree_${hex("b")}`
const PROCESS = `ct_process_${hex("c")}`, INCARNATION = `ct_incarnation_${hex("d")}`
const BINDING = `ct_binding_${hex("e")}`
const version = (name) => `control-tower.host-runtime.${name}/v1`
const binding = Object.freeze({
  schema_version: version("binding"), binding_id: BINDING, runtime_id: RUNTIME,
  worktree_id: WORKTREE, process_id: PROCESS, incarnation_id: INCARNATION, loopback_port: 43101,
})
const context = (overrides = {}) => {
  const merged = { ...binding, ...overrides }
  return [
    { schema_version: version("identity"), runtime_id: merged.runtime_id },
    { schema_version: version("worktree"), worktree_id: merged.worktree_id },
    { schema_version: version("process"), process_id: merged.process_id },
    { schema_version: version("incarnation"), incarnation_id: merged.incarnation_id },
    merged,
  ]
}
const errorCode = async (operation) => {
  try { await operation() } catch (error) { return error.code }
  return null
}
// `resolveContexts` answers with the next scripted view each time it is called, so a test can make
// the world change underneath an in-flight boundary.
const verifier = (...views) => {
  const seen = []
  const resolveContexts = () => {
    seen.push(views.length > 1 ? views.shift() : views[0])
    return seen.at(-1)
  }
  return { seen, verify: createPiBindingVerifier({ binding, resolveContexts }) }
}
const current = [context()]

describe("exact Pi binding verifier", () => {
  test("refuses a missing resolver, a malformed binding and a non-function boundary", async () => {
    expect(() => createPiBindingVerifier()).toThrow(TypeError)
    expect(() => createPiBindingVerifier({ binding, resolveContexts: "nope" })).toThrow(TypeError)
    for (const invalid of [
      undefined, {}, { ...binding, binding_id: "b1" }, { ...binding, loopback_port: 0 },
      { ...binding, schema_version: "control-tower.host-runtime.binding/v2" }, { ...binding, extra: true },
    ]) {
      expect(await errorCode(async () => createPiBindingVerifier({ binding: invalid, resolveContexts: () => current })))
        .toBe("CT_HOST_RUNTIME_SCHEMA_INVALID")
    }
    const { seen, verify } = verifier(current)
    for (const boundary of ["not a function", null, undefined]) {
      await expect(verify.verifyBoundary(boundary)).rejects.toThrow(TypeError)
    }
    // Building a verifier and refusing a bad boundary must observe nothing.
    expect(seen).toEqual([])
  })

  test("resolves the exact context on both sides of the boundary and returns its value", async () => {
    const { seen, verify } = verifier(current)
    const order = []
    const value = await verify.verifyBoundary(async () => { order.push("boundary"); return "done" })

    expect(value).toBe("done")
    expect(seen).toHaveLength(2)
    expect(order).toEqual(["boundary"])
  })

  test("short-circuits before the boundary runs when the binding is already lost", async () => {
    let ran = false
    const { verify } = verifier([context({ process_id: `ct_process_${hex("9")}` })])
    expect(await errorCode(() => verify.verifyBoundary(async () => { ran = true }))).toBe("CT_HOST_RUNTIME_BINDING_CROSSED")
    expect(ran).toBe(false)
  })

  test("fails closed when the context goes stale, ambiguous or crossed across the await", async () => {
    for (const [after, code] of [
      [[], "CT_HOST_RUNTIME_CONTEXT_MISSING"],
      [[context(), context()], "CT_HOST_RUNTIME_CONTEXT_AMBIGUOUS"],
      [[context({ incarnation_id: `ct_incarnation_${hex("9")}` })], "CT_HOST_RUNTIME_BINDING_CROSSED"],
      [[context({ worktree_id: `ct_worktree_${hex("9")}` })], "CT_HOST_RUNTIME_BINDING_CROSSED"],
      [[context({ loopback_port: 43102 })], "CT_HOST_RUNTIME_BINDING_CROSSED"],
    ]) {
      const { seen, verify } = verifier(current, after)
      expect(await errorCode(() => verify.verifyBoundary(async () => "done"))).toBe(code)
      expect(seen).toHaveLength(2)
    }
  })

  test("propagates the boundary's own failure unchanged while the binding still holds", async () => {
    const { verify } = verifier(current)
    const failure = Object.assign(new Error("broker refused"), { code: "CT_PI_BROKER_REFUSED" })
    expect(await errorCode(() => verify.verifyBoundary(async () => { throw failure }))).toBe("CT_PI_BROKER_REFUSED")
  })

  test("lets the lost binding win over the boundary's failure, and records that both happened", async () => {
    const { verify } = verifier(current, [context({ runtime_id: `ct_runtime_${hex("9")}` })])
    let raised
    try { await verify.verifyBoundary(async () => { throw new Error("broker refused") }) } catch (error) { raised = error }

    expect(raised.code).toBe("CT_HOST_RUNTIME_BINDING_CROSSED")
    expect(raised.diagnostics).toContainEqual({ component: "boundary", category: "failed" })
  })

  test("verifies the binding it was given, not one the caller mutates afterwards", async () => {
    const mutable = { ...binding }
    const resolved = []
    const verify = createPiBindingVerifier({ binding: mutable, resolveContexts: (asked) => { resolved.push(asked); return current } })
    mutable.loopback_port = 43102
    mutable.process_id = `ct_process_${hex("9")}`

    await verify.verifyBoundary(async () => "done")
    expect(resolved.every((asked) => asked.loopback_port === 43101 && asked.process_id === PROCESS)).toBe(true)
  })

  test("acquires nothing: it exposes one frozen verification seam and no cleanup capability", async () => {
    const { verify } = verifier(current)
    expect(Object.keys(verify)).toEqual(["verifyBoundary"])
    expect(Object.isFrozen(verify)).toBe(true)
    expect(await verify.verifyBoundary(async () => undefined)).toBeUndefined()
  })

  test("gives each concurrent boundary its own pair of checks", async () => {
    const { seen, verify } = verifier(current)
    await Promise.all([verify.verifyBoundary(async () => "a"), verify.verifyBoundary(async () => "b")])
    expect(seen).toHaveLength(4)
  })

  test("rejects a context whose components are incomplete or fail their own schema", async () => {
    const [identity, worktree, process, incarnation, exact] = context()
    for (const [broken, code] of [
      [[[identity, worktree, process, incarnation]], "CT_HOST_RUNTIME_CONTEXT_MISSING"],
      [[[identity, worktree, process, undefined, exact]], "CT_HOST_RUNTIME_CONTEXT_MISSING"],
      [["not-an-array"], "CT_HOST_RUNTIME_CONTEXT_MISSING"],
      [[[{ schema_version: version("identity"), runtime_id: "r1" }, worktree, process, incarnation, exact]], "CT_HOST_RUNTIME_SCHEMA_INVALID"],
      [[[identity, { schema_version: version("worktree") }, process, incarnation, exact]], "CT_HOST_RUNTIME_SCHEMA_INVALID"],
    ]) {
      const { verify } = verifier(broken)
      expect(await errorCode(() => verify.verifyBoundary(async () => "done"))).toBe(code)
    }
  })

  test("treats a resolver that answers with nothing usable as a missing context, never as success", async () => {
    for (const empty of [null, undefined, [], "candidates"]) {
      const verify = createPiBindingVerifier({ binding, resolveContexts: () => empty })
      expect(await errorCode(() => verify.verifyBoundary(async () => "done"))).toBe("CT_HOST_RUNTIME_CONTEXT_MISSING")
    }
  })

  test("keeps a non-contract failure from the after-check intact instead of dressing it as one", async () => {
    let calls = 0
    const verify = createPiBindingVerifier({
      binding,
      resolveContexts: () => { calls += 1; if (calls === 2) throw new RangeError("resolver exploded"); return current },
    })
    await expect(verify.verifyBoundary(async () => "done")).rejects.toThrow(RangeError)
  })

  test("returns whatever the boundary returns, including falsy values and rejections it recovers from", async () => {
    for (const value of [0, "", false, null]) {
      const { verify } = verifier(current)
      expect(await verify.verifyBoundary(async () => value)).toBe(value)
    }
    const { verify } = verifier(current)
    expect(await verify.verifyBoundary(async () => Promise.reject(new Error("x")).catch(() => "recovered"))).toBe("recovered")
  })

  test("does not record a boundary failure when the boundary succeeded but the binding was lost", async () => {
    const { verify } = verifier(current, [context({ binding_id: `ct_binding_${hex("9")}` })])
    let raised
    try { await verify.verifyBoundary(async () => "done") } catch (error) { raised = error }

    expect(raised.code).toBe("CT_HOST_RUNTIME_BINDING_CROSSED")
    expect(raised.diagnostics).not.toContainEqual({ component: "boundary", category: "failed" })
  })
})
