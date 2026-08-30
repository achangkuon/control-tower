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

export const createPiBindingVerifier = ({ binding, resolveContexts } = {}) => {
  if (typeof resolveContexts !== "function") throw new TypeError("An exact host-runtime context resolver is required")
  const expected = Object.freeze({ ...binding })
  // Schema only: a malformed binding is refused at construction without consulting the world, so
  // building a verifier observes nothing and the boundary's own checks stay the first reads.
  if (!validateHostRuntimeBinding(expected)) {
    failContract("CT_HOST_RUNTIME_SCHEMA_INVALID", "Binding schema is invalid", [{ component: "binding", category: "schema" }])
  }

  return Object.freeze({
    async verifyBoundary(boundary) {
      if (typeof boundary !== "function") throw new TypeError("An async boundary function is required")
      resolveExactContext(expected, resolveContexts)
      let value, failure, failed = false
      try { value = await boundary() } catch (error) { failure = error; failed = true }
      try {
        resolveExactContext(expected, resolveContexts)
      } catch (error) {
        // Fail closed on identity: a lost binding outranks whatever the boundary reported, because
        // the caller can no longer trust the context that failure describes. The boundary's own
        // failure is still recorded so neither event is silently dropped.
        if (!failed || !(error instanceof ContractError)) throw error
        throw new ContractError(error.code, error.message, [...error.diagnostics, BOUNDARY_FAILED])
      }
      if (failed) throw failure
      return value
    },
  })
}
