const KEYS = Object.freeze(["assignment_ref", "brief", "brief_ref", "candidate_revision", "fence_path", "host_epoch", "project_id", "worktree"])
const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const same = (left, right) => KEYS.every((key) => left[key] === right[key])
const exact = (value) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("\0") === [...KEYS].sort().join("\0")
const rootId = (value) => typeof value === "string" && value.length > 0 && !value.includes("\0")

export const createHostLauncher = ({ approvedBinding, herdr, opencode } = {}) => {
  if (typeof approvedBinding !== "function" || typeof herdr?.createPane !== "function" || typeof herdr?.bindRoot !== "function" || typeof opencode?.startRoot !== "function") throw new TypeError("Trusted launch ports are required")
  return async (input = {}) => {
    let approved
    try { approved = approvedBinding() } catch { fail("CT_LAUNCH_REJECTED", "Approved launch binding is unavailable") }
    if (!exact(input) || !exact(approved) || !same(input, approved)) fail("CT_LAUNCH_REJECTED", "Launch input does not match the approved binding")
    let pane
    try {
      pane = await herdr.createPane({ worktree: approved.worktree })
      if (typeof pane?.pane_id !== "string" || !pane.pane_id) fail("CT_LAUNCH_FAILED", "Herdr did not create a fresh pane")
      const root = await opencode.startRoot({ pane_id: pane.pane_id, worktree: approved.worktree, brief: approved.brief, brief_ref: approved.brief_ref })
      if (!rootId(root?.root_session_id)) fail("CT_LAUNCH_FAILED", "OpenCode did not return a root identity")
      const record = Object.freeze({ ...approved, pane_id: pane.pane_id, root_session_id: root.root_session_id })
      if (await herdr.bindRoot(record) !== true) fail("CT_LAUNCH_FAILED", "Herdr rejected the root binding")
      return record
    } catch (error) {
      if (pane?.pane_id && typeof pane.close === "function") await pane.close(pane.pane_id)
      if (error?.code) throw error
      fail("CT_LAUNCH_FAILED", "Visible root launch failed")
    }
  }
}
