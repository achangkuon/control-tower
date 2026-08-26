const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const DEGRADED_VIEW = Object.freeze({ status: "DEGRADED", code: "CT_VIEW_UNVERIFIED", retryable: true })
const exact = (value) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).length === 1 && Object.hasOwn(value, "request_ref")

export const createLaunchWorkerRuntime = ({ preflight = () => () => {}, consumeBinding, assertCurrentHost, backend, rootBinding, view } = {}) => {
  if (typeof consumeBinding !== "function" || typeof assertCurrentHost !== "function" || typeof backend?.start !== "function" || typeof backend?.stop !== "function" || typeof rootBinding?.bind !== "function" || typeof view?.attach !== "function") {
    throw new TypeError("Main-owned launch ports are required")
  }
  return Object.freeze({
    async launchWorker(input) {
      if (!exact(input) || typeof input.request_ref !== "string" || input.request_ref.length === 0 || input.request_ref.includes("\0")) {
        fail("CT_LAUNCH_REJECTED", "Launch worker accepts only an opaque request ref")
      }
      const release = await preflight()
      let consumed = false, persisted
      try {
        const binding = await consumeBinding(input.request_ref); consumed = true
        await assertCurrentHost(binding)
        const started = await backend.start({ assignment_ref: binding.assignment_ref, brief: binding.brief, brief_ref: binding.brief_ref, host_epoch: binding.host_epoch, project_id: binding.project_id, worktree: binding.worktree })
        const { credential_ref, ...bindable } = started
        try { persisted = rootBinding.bind(bindable) } catch (error) {
          try { await backend.stop(binding.worktree) } catch {}
          throw error
        }
        try {
          await view.attach({ backend_url: persisted.backend_url, credential_ref, root_session_id: persisted.root_session_id, worktree: persisted.worktree })
        } catch {}
        return Object.freeze({ ...binding, backend_pid: persisted.backend_pid, backend_url: persisted.backend_url, root_session_id: persisted.root_session_id, view: DEGRADED_VIEW })
      } catch (error) {
        if (error?.code === "CT_ASSIGNMENT_STALE") throw error
        if (consumed) throw Object.assign(new Error(`Launch binding was consumed; Main must issue a new binding (${error?.message ?? "host failure"})`), { code: "CT_LAUNCH_FINAL_ATTEMPT_FAILED", evidence: { request_ref: input.request_ref, replacement_binding_required: true, cause: error?.code ?? "CT_LAUNCH_FAILED" } })
        throw error
      } finally { await release?.() }
    },
  })
}
