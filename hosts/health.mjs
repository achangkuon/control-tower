import { ROOT_AGENT, canonicalRootSessionId } from "./root-identity.mjs"

// REQUIREMENTS 14.3 defaults. They are versioned on purpose: changing them never alters an active jornada.
export const HEARTBEAT_INTERVAL_MS = 15_000
// Three consecutive intervals must elapse before three heartbeats are actually absent. At exactly this
// point the third is only due, so the host is still LIVE; past it, three have been missed.
export const SUSPECTED_AFTER_MS = HEARTBEAT_INTERVAL_MS * 3
export const UNAVAILABLE_AFTER_MS = 60_000

const BINDING_KEYS = Object.freeze(["agent", "assignment_ref", "backend_pid", "backend_url", "host_epoch", "project_id", "root_session_id", "worktree"])
const INPUT_KEYS = Object.freeze(["binding", "last_heartbeat_at"])
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
      const { binding, last_heartbeat_at } = input
      if (last_heartbeat_at !== null && !positive(last_heartbeat_at)) fail("CT_HOST_HEALTH_INVALID", "Host heartbeat timestamp is invalid")
      const now = clock()
      if (!positive(now)) fail("CT_HOST_HEALTH_INVALID", "Host health clock is unusable")
      // A host we have never heard from is maximal silence, not proof of death, so the probe still decides.
      const elapsed_ms = last_heartbeat_at === null ? null : now - last_heartbeat_at
      // A heartbeat from the future means the elapsed time is meaningless, so it fails closed rather than guess.
      if (elapsed_ms !== null && elapsed_ms < 0) fail("CT_HOST_HEALTH_INVALID", "Host heartbeat precedes the observed clock")
      // Silence is the only thing that can justify probing, and an absent heartbeat is the widest silence there is.
      const silent = elapsed_ms === null || elapsed_ms >= UNAVAILABLE_AFTER_MS
      if (!silent) return Object.freeze({ state: elapsed_ms <= SUSPECTED_AFTER_MS ? "LIVE" : "SUSPECTED", elapsed_ms, probe: "SKIPPED" })
      // UNAVAILABLE requires silence AND a failed probe. Silence alone leaves the host merely SUSPECTED.
      let reachable
      try { reachable = await probe({ backend_url: binding.backend_url, root_session_id: binding.root_session_id, worktree: binding.worktree }) } catch { reachable = false }
      // A probe that resolves with something other than a verdict is a broken port, not a dead host. Reporting
      // UNAVAILABLE for it would turn our own defect into evidence about someone else's process.
      if (typeof reachable !== "boolean") fail("CT_HOST_HEALTH_INVALID", "Host health probe did not return a verdict")
      return Object.freeze(reachable
        ? { state: "SUSPECTED", elapsed_ms, probe: "PASSED" }
        : { state: "UNAVAILABLE", elapsed_ms, probe: "FAILED" })
    },
  })
}
