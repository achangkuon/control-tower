import { describe, expect, test } from "bun:test"

import { createOpenCodeLauncher } from "../../hosts/opencode-launcher.mjs"

describe("OpenCode root launcher", () => {
  test("requires the named profile and a fresh top-level root before prompting the approved brief", async () => {
    const calls = []
    const launcher = createOpenCodeLauncher({
      profileAvailable: (name) => name === "gentle-orchestrator",
    start: async (input) => { calls.push(input); return { id: "root-a", terminal_id: "terminal-a" } },
      prompt: async (input) => calls.push(input),
    })
    const root = await launcher.startRoot({ pane_id: "pane-a", worktree: "/work/a", brief: "Approved work only", brief_ref: "briefs/a.json" })
    expect(root).toEqual({ root_session_id: "root-a", terminal_id: "terminal-a" })
    expect(calls).toEqual([
      { agent: "gentle-orchestrator", pane_id: "pane-a", worktree: "/work/a" },
      { root_session_id: "root-a", brief: "Approved work only" },
    ])
  })

  test("rejects absent profiles and child or malformed root identities", async () => {
    const unavailable = createOpenCodeLauncher({ profileAvailable: () => false, start: async () => ({ id: "root", terminal_id: "terminal" }), prompt: async () => {} })
    await expect(unavailable.startRoot({ pane_id: "pane-a", worktree: "/work/a", brief: "x", brief_ref: "b" })).rejects.toMatchObject({ code: "CT_LAUNCH_REJECTED" })
    const child = createOpenCodeLauncher({ profileAvailable: () => true, start: async () => ({ id: "root", terminal_id: "terminal", parentID: "parent" }), prompt: async () => {} })
    await expect(child.startRoot({ pane_id: "pane-a", worktree: "/work/a", brief: "x", brief_ref: "b" })).rejects.toMatchObject({ code: "CT_LAUNCH_REJECTED" })
  })
})
