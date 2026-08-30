import { isAbsolute } from "node:path"

import { failContract } from "../contracts/errors.mjs"
import { createHostRuntimeIdentifier } from "../contracts/host-runtime/identifiers.mjs"
import { createHostRuntimeOwnership } from "../contracts/host-runtime/ownership-registry.mjs"
import { createPiBindingVerifier } from "./pi-binding.mjs"

// M9.4.2 — one Tower-owned broker per exact worktree.
//
// The route is DATA (Engram 9747). Preparing and validating it creates no socket, file, listener,
// lock, reservation or close capability, so an invalid route or a disposal during preparation needs
// no release and no quarantine: there is nothing to release yet. That is why `runtimeRoute` may not
// even offer a `release` port — accepting one would reintroduce the pre-broker resource whose
// absence this design depends on.
//
// `broker.start` is the first effect, and it runs inside `S4.10 acquireAtReservation` so the exact
// close it returns is retained by S4.10 as owner. The window between start and returning that close
// is the only place this module can strand a live broker, so every failure there consumes the exact
// close or records explicit quarantine. No layer ever reconstructs or guesses a cleanup.
const fail = (code, message, category) => failContract(code, message, [{ component: "supervisor", category }])
const INPUT_KEYS = ["desired_ref", "worktree"]
const text = (value) => typeof value === "string" && value.length > 0 && !value.includes("\0")
const sameKeys = (input) => {
  const keys = Object.keys(input).sort()
  return keys.length === INPUT_KEYS.length && keys.every((key, index) => key === INPUT_KEYS[index])
}
const exactInput = (input) => input !== null && typeof input === "object" && !Array.isArray(input) && sameKeys(input)
  && text(input.desired_ref) && text(input.worktree) && isAbsolute(input.worktree)
const thenable = (value) => value !== null && ["object", "function"].includes(typeof value) && typeof value.then === "function"
// Route data only: an object with no capability on it. A function-valued member would be a resource
// handle wearing a data shape.
const routeData = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && !thenable(value) && Object.values(value).every((member) => typeof member !== "function")

export const createPiSupervisor = ({
  resolveContexts, runtimeRoute, broker, keepalive, inspectWorktree, selectLoopbackPort, randomBytes,
  createOwnership = createHostRuntimeOwnership,
} = {}) => {
  for (const [name, port] of [
    ["resolveContexts", resolveContexts], ["inspectWorktree", inspectWorktree],
    ["selectLoopbackPort", selectLoopbackPort], ["randomBytes", randomBytes],
    ["runtimeRoute.prepare", runtimeRoute?.prepare], ["broker.start", broker?.start],
    ["keepalive.register", keepalive?.register], ["keepalive.unregister", keepalive?.unregister],
    ["createOwnership", createOwnership],
  ]) if (typeof port !== "function") throw new TypeError(`${name} must be a function`)
  if (runtimeRoute.release !== undefined) throw new TypeError("A runtime route is data and must not offer a release port")

  const settled = new Map(), inFlight = new Map(), quarantine = new Map()
  let disposed = false

  const identifier = (kind) => createHostRuntimeIdentifier(kind, { randomBytes })
  const mintBinding = (loopback_port) => Object.freeze({
    schema_version: "control-tower.host-runtime.binding/v1",
    binding_id: identifier("binding"), runtime_id: identifier("runtime"), worktree_id: identifier("worktree"),
    process_id: identifier("process"), incarnation_id: identifier("incarnation"), loopback_port,
  })

  const canonicalWorktree = async (worktree) => {
    let observed
    try { observed = await inspectWorktree(worktree) } catch { fail("CT_PI_SUPERVISOR_REJECTED", "Worktree could not be inspected", "worktree") }
    if (observed?.symlink !== false || observed.canonical_path !== worktree) {
      fail("CT_PI_SUPERVISOR_REJECTED", "Worktree is aliased or not canonical", "worktree")
    }
  }

  const prepareRoute = (binding, input) => {
    let route
    // Synchronous by contract: no await here means no window in which an effect could occur.
    try { route = runtimeRoute.prepare({ binding, ...input }) } catch { fail("CT_PI_SUPERVISOR_REJECTED", "Route data is invalid", "route") }
    if (!routeData(route)) fail("CT_PI_SUPERVISOR_REJECTED", "Route producer did not return plain route data", "route")
    return Object.freeze({ ...route })
  }

  // Runs as S4.10's acquireAtReservation: the first effect, and the only owner of the exact close
  // until it hands that close back to the registry.
  const acquire = (binding, route, input, verify) => async (_exactContext, requestedPort) => {
    if (disposed) fail("CT_PI_SUPERVISOR_DISPOSED", "Supervisor was disposed before acquisition", "disposed")
    let started
    try { started = await broker.start({ ...route, loopback_port: requestedPort, worktree: input.worktree }) }
    catch { fail("CT_PI_SUPERVISOR_START_FAILED", "Broker refused to start", "start") }
    if (typeof started?.close !== "function") fail("CT_PI_SUPERVISOR_START_FAILED", "Broker did not return an exact close capability", "start")
    try {
      // Both post-start obligations live here, while the exact close is still ours to consume.
      await verify.verifyBoundary(async () => keepalive.register({ ...binding, worktree: input.worktree }))
      return started.close
    } catch (error) {
      try { await started.close() } catch {
        quarantine.set(input.worktree, Object.freeze({ worktree: input.worktree, loopback_port: requestedPort }))
        fail("CT_PI_SUPERVISOR_QUARANTINED", "Exact close could not be confirmed after start", "quarantine")
      }
      if (error?.code) throw error
      fail("CT_PI_SUPERVISOR_START_FAILED", "Acquisition failed after start", "start")
    }
  }

  const acquireOnce = async (input) => {
    await canonicalWorktree(input.worktree)
    const loopback_port = await selectLoopbackPort()
    const binding = mintBinding(loopback_port)
    const route = prepareRoute(binding, input)
    const verify = createPiBindingVerifier({ binding, resolveContexts })
    const ownership = createOwnership({ resolveContexts, acquireAtReservation: acquire(binding, route, input, verify) })
    await ownership.reserve(binding)
    return Object.freeze({ desired_ref: input.desired_ref, worktree: input.worktree, binding_id: binding.binding_id, loopback_port })
  }

  return Object.freeze({
    async reconcile(input) {
      if (!exactInput(input)) fail("CT_PI_SUPERVISOR_REJECTED", "Reconcile accepts exactly a desired ref and an absolute worktree", "input")
      if (disposed) fail("CT_PI_SUPERVISOR_DISPOSED", "Supervisor is disposed", "disposed")
      if (quarantine.has(input.worktree)) fail("CT_PI_SUPERVISOR_QUARANTINED", "Worktree is quarantined and blocks replacement", "quarantine")
      // Convergence is per worktree, because the resource is one broker per worktree. A different
      // desired ref for a worktree that already has one is a conflict, never a takeover.
      const held = settled.get(input.worktree) ?? inFlight.get(input.worktree)
      if (held) {
        const acknowledged = await held
        if (acknowledged.desired_ref !== input.desired_ref) fail("CT_PI_SUPERVISOR_CONFLICT", "Worktree already serves another desired ref", "conflict")
        return acknowledged
      }
      const attempt = acquireOnce(input)
      inFlight.set(input.worktree, attempt)
      try {
        const acknowledged = await attempt
        settled.set(input.worktree, Promise.resolve(acknowledged))
        return acknowledged
      } finally { inFlight.delete(input.worktree) }
    },
    quarantined: () => Object.freeze([...quarantine.values()]),
    async dispose() { disposed = true },
  })
}
