import { ROOT_AGENT, canonicalRootSessionId } from "./root-identity.mjs"

// REQUIREMENTS 14.3 defaults, v1. Per-jornada pinning of these values is NOT implemented here: they are plain
// module constants, so changing one changes the verdict for every host immediately. The requirement that
// changing them must not alter an active jornada needs a jornada-scoped snapshot, which no owner provides yet.
export const HEARTBEAT_INTERVAL_MS = 15_000
// Three consecutive intervals must elapse before three heartbeats are actually absent. At exactly this
// point the third is only due, so the host is still LIVE; past it, three have been missed.
export const SUSPECTED_AFTER_MS = HEARTBEAT_INTERVAL_MS * 3
export const UNAVAILABLE_AFTER_MS = 60_000

const BINDING_KEYS = Object.freeze(["agent", "assignment_ref", "backend_pid", "backend_url", "host_epoch", "project_id", "root_session_id", "worktree"])
const INPUT_KEYS = Object.freeze(["binding", "last_heartbeat_at", "observed_since"])
const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
const validRef = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) && !value.includes("..")
const bounded = (value) => typeof value === "string" && value.length > 0 && value.length <= 512 && !value.includes("\0")
const positive = (value) => Number.isSafeInteger(value) && value > 0
const loopback = (value) => bounded(value) && /^http:\/\/127\.0\.0\.1:(?:[1-9][0-9]{0,4})$/.test(value)

// The same record the Main-owned binding store persists, checked here so no other host can be classified.
const validBinding = (value) => exact(value, BINDING_KEYS)
  && value.agent === ROOT_AGENT && canonicalRootSessionId(value.root_session_id)
  && validRef(value.assignment_ref) && bounded(value.project_id)
  && bounded(value.worktree) && value.worktree.startsWith("/")
  && loopback(value.backend_url) && positive(value.backend_pid) && positive(value.host_epoch)

export const createHostHealth = ({ clock, probe } = {}) => {
  if (typeof clock !== "function" || typeof probe !== "function") throw new TypeError("Host health ports are required")
  return Object.freeze({
    async classify(input) {
      if (!exact(input, INPUT_KEYS) || !validBinding(input.binding)) fail("CT_HOST_HEALTH_INVALID", "Host health input is invalid")
      const { binding, last_heartbeat_at, observed_since } = input
      if (last_heartbeat_at !== null && !positive(last_heartbeat_at)) fail("CT_HOST_HEALTH_INVALID", "Host heartbeat timestamp is invalid")
      // REQUIREMENTS 14.3 conditions UNAVAILABLE on sixty seconds of silence, so silence must be MEASURED.
      // A host that has never sent a heartbeat is measured from when we began observing it, never assumed silent.
      if (!positive(observed_since)) fail("CT_HOST_HEALTH_INVALID", "Host observation origin is invalid")
      let now
      try { now = clock() } catch { fail("CT_HOST_HEALTH_INVALID", "Host health clock is unusable") }
      if (!positive(now)) fail("CT_HOST_HEALTH_INVALID", "Host health clock is unusable")
      const elapsed_ms = now - (last_heartbeat_at ?? observed_since)
      // Clock skew makes elapsed time meaningless, so it fails closed rather than report a state it cannot justify.
      if (elapsed_ms < 0) fail("CT_HOST_HEALTH_INVALID", "Host silence precedes the observed clock")
      if (elapsed_ms < UNAVAILABLE_AFTER_MS) {
        return Object.freeze({ state: elapsed_ms <= SUSPECTED_AFTER_MS ? "LIVE" : "SUSPECTED", elapsed_ms, probe: "SKIPPED", probe_cause: null })
      }
      // UNAVAILABLE requires measured silence AND a failed probe. Silence alone leaves the host merely SUSPECTED.
      let reachable, probe_cause = null
      // A probe that reports unreachable is a dead host; a probe that BLOWS UP may be our own adapter defect.
      // Both are FAILED, but the cause is preserved so an operator can tell one from the other.
      try { reachable = await probe({ backend_url: binding.backend_url, root_session_id: binding.root_session_id, worktree: binding.worktree }) }
      catch (error) { reachable = false; probe_cause = String(error?.message ?? "unknown").slice(0, 512) }
      // A probe that resolves with something other than a verdict is a broken port, not a dead host. Reporting
      // UNAVAILABLE for it would turn our own defect into evidence about someone else's process.
      if (typeof reachable !== "boolean") fail("CT_HOST_HEALTH_INVALID", "Host health probe did not return a verdict")
      return Object.freeze(reachable
        ? { state: "SUSPECTED", elapsed_ms, probe: "PASSED", probe_cause: null }
        : { state: "UNAVAILABLE", elapsed_ms, probe: "FAILED", probe_cause })
    },
  })
}
