import { parseRootIdentity } from "./root-identity.mjs"

const REQUEST_KEYS = Object.freeze(["assignment_ref", "brief", "brief_ref", "host_epoch", "project_id", "worktree"])
const RECEIPT_KEYS = Object.freeze(["brief", "brief_ref", "root_session_id"])
const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
const validRef = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) && !value.includes("..")
const bounded = (value) => typeof value === "string" && value.length > 0 && value.length <= 512 && !value.includes("\0")
const positive = (value) => Number.isSafeInteger(value) && value > 0
const absolute = (value) => bounded(value) && value.startsWith("/")
// Decision 38: the backend is reachable only from this machine, on its own loopback port.
// The grammar alone would admit 99999, which is not a port. 65535 is the last one there is, so the
// range is checked numerically rather than spelled out as an unreadable alternation.
const loopback = (value) => bounded(value) && Number(/^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(value)?.[1] ?? NaN) <= 65535
// Long enough that it cannot be guessed, bounded so it cannot be used to smuggle a payload.
const secretValue = (value) => typeof value === "string" && value.length >= 32 && value.length <= 4096 && !value.includes("\0")

const text = (value, limit) => typeof value === "string" && value.length > 0 && value.length <= limit && !value.includes("\0")
const validRequest = (value) => exact(value, REQUEST_KEYS)
  && validRef(value.assignment_ref) && text(value.brief, 1_048_576) && text(value.brief_ref, 512)
  && bounded(value.project_id) && absolute(value.worktree) && positive(value.host_epoch)

export const createOpenCodeBackendHost = ({ spawn, randomSecret, createRoot, admitBrief } = {}) => {
  if ([spawn, randomSecret, createRoot, admitBrief].some((port) => typeof port !== "function")) throw new TypeError("OpenCode backend ports are required")
  // Identity is owned per worktree; every value below is checked for reuse so nothing is ever shared.
  const backends = new Map()
  const taken = (pick) => [...backends.values()].some(pick)
  return Object.freeze({
    async start(request) {
      if (!validRequest(request)) fail("CT_BACKEND_REJECTED", "Backend start request is invalid")
      const { assignment_ref, brief, brief_ref, host_epoch, project_id, worktree } = request
      if (backends.has(worktree) || taken((backend) => backend.assignment_ref === assignment_ref)) fail("CT_BACKEND_EXISTS", "Worktree or assignment already owns a backend")
      const secret = randomSecret()
      if (!secretValue(secret) || taken((backend) => backend.secret === secret)) fail("CT_BACKEND_REJECTED", "Backend secret is weak or already in use")
      let started
      try { started = await spawn({ worktree, secret }) } catch { fail("CT_BACKEND_REJECTED", "Backend process could not be started") }
      const cleanup = async () => { try { await started?.stop?.() } catch {} }
      if (!started || typeof started !== "object" || typeof started.stop !== "function"
        || !positive(started.pid) || !loopback(started.url)
        || taken((backend) => backend.pid === started.pid || backend.url === started.url)) {
        await cleanup()
        fail("CT_BACKEND_REJECTED", "Backend process is shared, foreign or not on loopback")
      }
      let identity
      try { identity = parseRootIdentity(await createRoot({ secret, url: started.url, worktree })) } catch { identity = null }
      if (identity === null) {
        await cleanup()
        fail("CT_BACKEND_REJECTED", "Backend did not create a proven primary root")
      }
      let receipt
      try { receipt = await admitBrief({ secret, url: started.url, root_session_id: identity.root_session_id, brief_ref, brief }) } catch {}
      if (!exact(receipt, RECEIPT_KEYS) || receipt.root_session_id !== identity.root_session_id || receipt.brief_ref !== brief_ref || receipt.brief !== brief) {
        await cleanup()
        fail("CT_BACKEND_REJECTED", "Backend did not admit the approved brief")
      }
      backends.set(worktree, Object.freeze({ assignment_ref, pid: started.pid, secret, stop: started.stop, url: started.url }))
      return Object.freeze({ assignment_ref, backend_pid: started.pid, backend_url: started.url, host_epoch, project_id, root_identity: identity, worktree })
    },
    owns(worktree) { return absolute(worktree) && backends.has(worktree) },
    // Only a worktree names a backend. A url, pid or pane is not a handle, so no view can reach this.
    stop(worktree) {
      const backend = absolute(worktree) ? backends.get(worktree) : undefined
      if (backend === undefined) fail("CT_BACKEND_REJECTED", "Backend is not owned by this host")
      backends.delete(worktree)
      backend.stop()
      return true
    },
  })
}
