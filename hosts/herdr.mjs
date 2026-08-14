const RECEIPT_KEYS = Object.freeze(["assignment_ref", "brief", "brief_ref", "candidate_revision", "host_epoch", "pane_id", "project_id", "root_session_id", "worktree"])
const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const exact = (value) => value && typeof value === "object" && Object.isFrozen(value)
  && Object.keys(value).sort().join("\0") === [...RECEIPT_KEYS].sort().join("\0")
const root = (value) => typeof value === "string" && value.length > 0 && !value.includes("\0")

export const createHerdrAdapter = ({ createPane, closePane, projectRoot, publish } = {}) => {
  if ([createPane, closePane, projectRoot, publish].some((port) => typeof port !== "function")) throw new TypeError("Herdr ports are required")
  const owned = new Set()
  let binding = null
  const closeOwned = async (pane_id) => {
    if (!owned.delete(pane_id)) fail("CT_LAUNCH_REJECTED", "Pane is not owned by this launch")
    await closePane(pane_id)
    return true
  }
  return Object.freeze({
    async createPane({ worktree } = {}) {
      if (typeof worktree !== "string" || !worktree) fail("CT_LAUNCH_REJECTED", "Assigned worktree is required")
      const pane = await createPane({ cwd: worktree })
      if (!root(pane?.pane_id) || owned.has(pane.pane_id)) fail("CT_LAUNCH_REJECTED", "Herdr did not create a fresh pane")
      owned.add(pane.pane_id)
      return Object.freeze({ pane_id: pane.pane_id, close: closeOwned })
    },
    closePane: closeOwned,
    async bindRoot(record) {
      if (!exact(record) || binding !== null || !owned.has(record.pane_id)) fail("CT_LAUNCH_REJECTED", "Root receipt is not a current owned launch")
      const observed = await projectRoot({ pane_id: record.pane_id })
      if (observed?.root_session_id !== record.root_session_id || observed?.parentID !== undefined && observed.parentID !== null || observed?.state !== "ROOT") fail("CT_LAUNCH_REJECTED", "Herdr root observation does not match the launch")
      try {
        if (await publish(record) !== true) fail("CT_LAUNCH_FAILED", "Herdr root projection failed")
        binding = record
        return true
      } catch (error) {
        await closeOwned(record.pane_id)
        if (error?.code) throw error
        fail("CT_LAUNCH_FAILED", "Herdr root projection failed")
      }
    },
  })
}
