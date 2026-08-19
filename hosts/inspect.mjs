import { canonicalRootSessionId } from "./root-identity.mjs"

// What a host observation may report. `last_heartbeat_at` and `observed_since` are the only fields the binding
// does not already fix: the first is the last sign of life, the second is when this host began being observed.
const OBSERVATION_KEYS = Object.freeze(["agent", "backend_pid", "backend_url", "host_epoch", "last_heartbeat_at", "observed_since", "root_session_id", "worktree"])
// Every field that must be byte-identical to the binding, or the observation is about some other host.
const BOUND_KEYS = Object.freeze(["agent", "backend_pid", "backend_url", "host_epoch", "root_session_id", "worktree"])
const VERDICT_KEYS = Object.freeze(["elapsed_ms", "probe", "probe_cause", "state"])
const STATES = Object.freeze(["LIVE", "SUSPECTED", "UNAVAILABLE"])
const PROBES = Object.freeze(["SKIPPED", "PASSED", "FAILED"])
// The report is liveness, not durable authority: it carries the identity needed to act plus the verdict.
// `agent` is deliberately absent — it is the invariant primary-root agent, already enforced by the foreign
// check below, and repeating it would suggest the report varies by agent. The durable projection is rehydration's.
const REPORT_KEYS = Object.freeze(["assignment_ref", "backend_pid", "backend_url", "elapsed_ms", "host_epoch", "probe", "probe_cause", "project_id", "root_session_id", "state", "worktree"])

const fail = (code, message, cause) => { throw Object.assign(new Error(message), { code, ...(cause === undefined ? {} : { cause }) }) }
const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
const validRef = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) && !value.includes("..")
const bounded = (value) => typeof value === "string" && value.length > 0 && value.length <= 512 && !value.includes("\0")
const positive = (value) => Number.isSafeInteger(value) && value > 0

// Structure only. Whether the observation is OURS is decided by comparison against the binding, never by shape.
const validObservation = (value) => exact(value, OBSERVATION_KEYS)
  && bounded(value.agent) && positive(value.backend_pid) && bounded(value.backend_url)
  && positive(value.host_epoch) && canonicalRootSessionId(value.root_session_id)
  && bounded(value.worktree) && value.worktree.startsWith("/")
  && positive(value.observed_since) && (value.last_heartbeat_at === null || positive(value.last_heartbeat_at))

// The health port is injected, so its answer is checked like any other port output rather than trusted.
const validVerdict = (value) => exact(value, VERDICT_KEYS)
  && STATES.includes(value.state) && PROBES.includes(value.probe)
  && Number.isSafeInteger(value.elapsed_ms) && value.elapsed_ms >= 0
  && (value.probe_cause === null || bounded(value.probe_cause))

export const createHostInspector = ({ health, observe, rootBinding } = {}) => {
  if (typeof health?.classify !== "function" || typeof observe !== "function" || typeof rootBinding?.read !== "function") {
    throw new TypeError("Host inspection ports are required")
  }
  return Object.freeze({
    // Inspection answers for exactly one assignment. There is no handle here for a pane, a view or a terminal,
    // so a missing or broken view cannot reach this module, let alone change what it reports.
    async inspect(assignment_ref) {
      if (!validRef(assignment_ref)) fail("CT_HOST_INSPECT_INVALID", "Host inspection assignment ref is invalid")
      let binding
      try { binding = rootBinding.read(assignment_ref) } catch (error) {
        // The store's own typed refusal is the finding. Anything untyped is our failure to read, not evidence.
        if (error?.code?.startsWith("CT_")) throw error
        fail("CT_HOST_INSPECT_INVALID", "Root binding could not be read", error)
      }
      if (binding?.assignment_ref !== assignment_ref) fail("CT_HOST_INSPECT_FOREIGN", "Root binding answers for another assignment")
      let observation
      try { observation = await observe({ backend_pid: binding.backend_pid, backend_url: binding.backend_url, root_session_id: binding.root_session_id, worktree: binding.worktree }) }
      catch (error) {
        if (error?.code?.startsWith("CT_")) throw error
        // A host we cannot reach is a different operator problem from a host that answered nonsense.
        fail("CT_HOST_INSPECT_UNAVAILABLE", "Host observation could not be taken", error)
      }
      if (!validObservation(observation)) fail("CT_HOST_INSPECT_INVALID", "Host observation is malformed")
      if (BOUND_KEYS.some((key) => observation[key] !== binding[key])) fail("CT_HOST_INSPECT_FOREIGN", "Host observation names a backend, process or root that is not bound to this assignment")
      const verdict = await health.classify({ binding, last_heartbeat_at: observation.last_heartbeat_at, observed_since: observation.observed_since })
      if (!validVerdict(verdict)) fail("CT_HOST_INSPECT_INVALID", "Host health verdict is malformed")
      const report = { ...binding, ...verdict }
      return Object.freeze(Object.fromEntries(REPORT_KEYS.map((key) => [key, report[key]])))
    },
  })
}
