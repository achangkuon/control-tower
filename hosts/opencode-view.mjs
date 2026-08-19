const TARGET_KEYS = Object.freeze(["backend_url", "root_session_id", "worktree"])
const fail = (code, message, extra = {}) => { throw Object.assign(new Error(message), { code, ...extra }) }
const exact = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...TARGET_KEYS].sort().join("\0")
const bounded = (value) => typeof value === "string" && value.length > 0 && value.length <= 512 && !value.includes("\0")
// The grammar alone would admit 99999, which is not a port. 65535 is the last one there is, so the
// range is checked numerically rather than spelled out as an unreadable alternation.
const loopback = (value) => bounded(value) && Number(/^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(value)?.[1] ?? NaN) <= 65535
const rootSession = (value) => typeof value === "string" && /^ses_[A-Za-z0-9]{26}$/.test(value)
const paneIdentifier = (value) => typeof value === "string" && /^w[123456789ABCDEFGHJKMNPQRSTVWXYZ0]+:p[123456789ABCDEFGHJKMNPQRSTVWXYZ0]+$/.test(value)

const target = (value) => {
  if (!exact(value) || !loopback(value.backend_url) || !rootSession(value.root_session_id)
    || !bounded(value.worktree) || !value.worktree.startsWith("/")) fail("CT_VIEW_REJECTED", "View target is foreign or ambiguous")
  return value
}
// The exact command the operator can always run by hand. Decision 39 requires this fallback to exist
// whether or not the launcher works, so it is derived from the target, never from a launch result.
const attachCommand = ({ backend_url, root_session_id }) => ["opencode", "attach", backend_url, "--session", root_session_id]

// A replaceable, non-authoritative view over an already-running Main-owned root. It cannot start,
// stop, prompt, bind, dispatch or re-epoch anything: it holds no handle to a backend or a root, only
// to the pane it opened. Losing it is therefore never a lifecycle event.
export const createOpenCodeView = ({ openPane, closePane } = {}) => {
  if ([openPane, closePane].some((port) => typeof port !== "function")) throw new TypeError("OpenCode view ports are required")
  const owned = new Set()
  return Object.freeze({
    manualCommand(value) { return attachCommand(target(value)).join(" ") },
    async attach(value) {
      const { worktree } = target(value)
      const command = attachCommand(value), manual_command = command.join(" ")
      let pane
      try { pane = await openPane({ command, cwd: worktree }) } catch { pane = null }
      // A view that will not open is degraded, not fatal — hand back the manual equivalent instead.
      if (!pane || typeof pane !== "object" || !paneIdentifier(pane.pane_id) || owned.has(pane.pane_id)) {
        fail("CT_VIEW_UNAVAILABLE", "Visible view could not be opened; attach manually instead", { manual_command })
      }
      owned.add(pane.pane_id)
      return Object.freeze({ manual_command, pane_id: pane.pane_id })
    },
    // Only a pane this view opened is closable. A backend url, root id or worktree is not a handle.
    close(paneId) {
      if (!owned.delete(paneId)) fail("CT_VIEW_REJECTED", "Pane is not owned by this view")
      return closePane(paneId) === true
    },
  })
}
