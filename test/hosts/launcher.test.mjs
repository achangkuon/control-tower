import { describe, expect, test } from "bun:test"

import { createHostLauncher } from "../../hosts/launcher.mjs"

const approved = Object.freeze({ brief: "Approved work only", brief_ref: "briefs/a.json", assignment_ref: "assignments/a.json", project_id: "project-a", candidate_revision: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", worktree: "/work/a", host_epoch: 3 })
const errorCode = async (operation) => {
  try { await operation() } catch (error) { return error.code }
  return null
}

describe("visible root host launcher", () => {
  test("rejects unapproved, mismatched, stale, and caller-authority launch input before pane effects", async () => {
    let panes = 0
    const launch = createHostLauncher({
      approvedBinding: () => approved,
      herdr: { createPane: async () => { panes += 1 }, bindRoot: async () => true },
      opencode: { startRoot: async () => ({ root_session_id: "root-unused" }) },
    })
    for (const input of [
      { ...approved, approved: false },
      { ...approved, worktree: "/work/other" },
      { ...approved, host_epoch: 4 },
      { ...approved, approvedBinding: () => approved },
    ]) expect(await errorCode(() => launch(input))).toBe("CT_LAUNCH_REJECTED")
    expect(panes).toBe(0)
  })

  test("closes only its new pane when starting the root fails", async () => {
    const closed = []
    const launch = createHostLauncher({
      approvedBinding: () => approved,
      herdr: { createPane: async () => ({ pane_id: "pane-new", close: async (id) => closed.push(id) }), bindRoot: async () => true },
      opencode: { startRoot: async () => { throw new Error("offline") } },
    })
    expect(await errorCode(() => launch(approved))).toBe("CT_LAUNCH_FAILED")
    expect(closed).toEqual(["pane-new"])
  })

  test("does not bind a malformed root and freezes an exact launch receipt", async () => {
    const closed = []
    const failed = createHostLauncher({ approvedBinding: () => approved, herdr: { createPane: async () => ({ pane_id: "pane-new", close: async (id) => closed.push(id) }), bindRoot: async () => true }, opencode: { startRoot: async () => ({}) } })
    expect(await errorCode(() => failed(approved))).toBe("CT_LAUNCH_FAILED")
    expect(closed).toEqual(["pane-new"])
    let projected
    const succeeded = createHostLauncher({ approvedBinding: () => approved, herdr: { createPane: async () => ({ pane_id: "pane-new", close: async () => {} }), bindRoot: async (record) => { projected = record; return true } }, opencode: { startRoot: async () => ({ root_session_id: "root-new" }) } })
    const receipt = await succeeded(approved)
    expect(Object.isFrozen(receipt)).toBeTrue()
    expect(receipt).toEqual(projected)
    expect(Object.keys(receipt).sort()).toEqual(["assignment_ref", "brief", "brief_ref", "candidate_revision", "host_epoch", "pane_id", "project_id", "root_session_id", "worktree"])
  })
})
