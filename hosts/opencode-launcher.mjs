const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const rootId = (value) => typeof value === "string" && value.length > 0 && !value.includes("\0")

export const createOpenCodeLauncher = ({ profileAvailable, start, prompt } = {}) => {
  if (typeof profileAvailable !== "function" || typeof start !== "function" || typeof prompt !== "function") throw new TypeError("OpenCode launch ports are required")
  return Object.freeze({
    async startRoot({ pane_id, worktree, brief, brief_ref } = {}) {
      if (profileAvailable("gentle-orchestrator") !== true || !rootId(pane_id) || typeof worktree !== "string" || !worktree || typeof brief !== "string" || !brief || typeof brief_ref !== "string" || !brief_ref) {
        fail("CT_LAUNCH_REJECTED", "Approved OpenCode root launch prerequisites are missing")
      }
      const result = await start({ agent: "gentle-orchestrator", pane_id, worktree })
      if (!rootId(result?.id) || !rootId(result?.terminal_id) || result.parentID !== undefined && result.parentID !== null) fail("CT_LAUNCH_REJECTED", "OpenCode launch did not create a top-level root")
      await prompt({ root_session_id: result.id, brief })
      return Object.freeze({ root_session_id: result.id, terminal_id: result.terminal_id })
    },
  })
}
