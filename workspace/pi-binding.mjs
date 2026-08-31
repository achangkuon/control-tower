import { isAbsolute } from "node:path"

import { ContractError, failContract } from "../contracts/errors.mjs"
import { resolveExactContext } from "../contracts/host-runtime/binding-context.mjs"
import { validateHostRuntimeBinding } from "../contracts/host-runtime/schema-registry.mjs"

// M9.4.1 — the exact binding must hold on BOTH sides of every async boundary the Pi supervisor
// crosses. `resolveExactContext` already proves currency against a given binding: it fails stale
// (context missing), conflicting (ambiguous) and lost (crossed), and it compares every identifying
// field, so a context that resolves after the await is the same one that resolved before it.
//
// What this seam adds is the discipline `resolveExactContext` cannot enforce on its own: the
// expected binding is frozen at construction so it cannot be swapped mid-flight, and the second
// check is guaranteed to run even when the boundary throws — an inline pair of calls would skip it
// on exactly the path where a lost binding matters most. Callers get one named seam instead of a
// rule they must remember at every call site.
//
// It is pure verification: it acquires no socket, listener, lock or reservation, and it returns no
// close or release capability. Ownership stays with `S4.10`.
const BOUNDARY_FAILED = Object.freeze({ component: "boundary", category: "failed" })
const processNotCurrent = () => failContract(
  "CT_PI_PROCESS_NOT_CURRENT", "Kernel process evidence is absent, malformed, or no longer current",
  [{ component: "process", category: "currentness" }],
)

export const createPiBindingVerifier = ({ binding, resolveContexts, observeProcess, expectedCwd } = {}) => {
  if (typeof resolveContexts !== "function") throw new TypeError("An exact host-runtime context resolver is required")
  const expected = Object.freeze({ ...binding })
  // Schema only: a malformed binding is refused at construction without consulting the world, so
  // building a verifier observes nothing and the boundary's own checks stay the first reads.
  if (!validateHostRuntimeBinding(expected)) {
    failContract("CT_HOST_RUNTIME_SCHEMA_INVALID", "Binding schema is invalid", [{ component: "binding", category: "schema" }])
  }
  if (typeof observeProcess !== "function") throw new TypeError("A kernel process observer is required")
  if (typeof expectedCwd !== "string" || !isAbsolute(expectedCwd) || expectedCwd.includes("\0")) {
    throw new TypeError("An absolute expected process cwd is required")
  }

  const observeCurrentProcess = async () => {
    let observed
    try { observed = await observeProcess() } catch { processNotCurrent() }
    try {
      if (observed === null || typeof observed !== "object" || Array.isArray(observed)
        || Reflect.ownKeys(observed).length !== 3
        || !Object.hasOwn(observed, "pid") || !Object.hasOwn(observed, "cwd") || !Object.hasOwn(observed, "start_token")
        || !Number.isSafeInteger(observed.pid) || observed.pid <= 0
        || observed.cwd !== expectedCwd
        || typeof observed.start_token !== "string" || !/^[0-9]+$/.test(observed.start_token)) processNotCurrent()
      return Object.freeze({ pid: observed.pid, cwd: observed.cwd, start_token: observed.start_token })
    } catch (error) {
      if (error instanceof ContractError) throw error
      processNotCurrent()
    }
  }
  const assertCurrent = async (before) => {
    resolveExactContext(expected, resolveContexts)
    const observed = await observeCurrentProcess()
    if (before && (observed.pid !== before.pid || observed.cwd !== before.cwd || observed.start_token !== before.start_token)) {
      processNotCurrent()
    }
    return observed
  }

  return Object.freeze({
    async verifyBoundary(boundary) {
      if (typeof boundary !== "function") throw new TypeError("An async boundary function is required")
      const before = await assertCurrent()
      let value, failure, failed = false
      try { value = await boundary() } catch (error) { failure = error; failed = true }
      try {
        await assertCurrent(before)
      } catch (error) {
        // Fail closed on identity: a lost binding or replaced kernel process outranks whatever the
        // boundary reported. The boundary's own failure is still recorded so neither event is lost.
        if (!failed || !(error instanceof ContractError)) throw error
        throw new ContractError(error.code, error.message, [...error.diagnostics, BOUNDARY_FAILED])
      }
      if (failed) throw failure
      return value
    },
  })
}
