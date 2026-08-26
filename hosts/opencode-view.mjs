const TARGET_KEYS = Object.freeze(["backend_url", "credential_ref", "root_session_id", "worktree"])
const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exact = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...TARGET_KEYS].sort().join("\0")
const bounded = (value) => typeof value === "string" && value.length > 0 && value.length <= 512 && !value.includes("\0")
const loopback = (value) => bounded(value) && Number(/^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(value)?.[1] ?? NaN) <= 65535
const rootSession = (value) => typeof value === "string" && /^ses_[A-Za-z0-9]{26}$/.test(value)
const credentialRef = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(value)
const paneIdentifier = (value) => typeof value === "string" && /^w[123456789ABCDEFGHJKMNPQRSTVWXYZ0]+:p[123456789ABCDEFGHJKMNPQRSTVWXYZ0]+$/.test(value)
const target = (value) => {
  if (!exact(value) || !loopback(value.backend_url) || !credentialRef(value.credential_ref) || !rootSession(value.root_session_id)
    || !bounded(value.worktree) || !value.worktree.startsWith("/")) fail("CT_VIEW_REJECTED", "View target is foreign or ambiguous")
  return value
}

export const createOpenCodeView = ({ openPane, closePane, helperCommand } = {}) => {
  if ([openPane, closePane].some((port) => typeof port !== "function") || !Array.isArray(helperCommand) || helperCommand.length !== 2
    || helperCommand.some((part) => !bounded(part))) throw new TypeError("OpenCode view ports are required")
  const command = Object.freeze([...helperCommand]), owned = new Set()
  return Object.freeze({
    async attach(value) {
      const { worktree } = target(value)
      let pane
      try { pane = await openPane({ command, cwd: worktree }) } catch { pane = null }
      if (!pane || typeof pane !== "object" || !paneIdentifier(pane.pane_id) || owned.has(pane.pane_id)) fail("CT_VIEW_UNAVAILABLE", "Visible view could not be opened")
      owned.add(pane.pane_id)
      return Object.freeze({ pane_id: pane.pane_id })
    },
    close(paneId) {
      if (!owned.delete(paneId)) fail("CT_VIEW_REJECTED", "Pane is not owned by this view")
      return closePane(paneId) === true
    },
  })
}
