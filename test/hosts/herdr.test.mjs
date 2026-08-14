import { describe, expect, test } from "bun:test"

import { createHerdrAdapter } from "../../hosts/herdr.mjs"

const receipt = Object.freeze({ brief: "Approved work only", brief_ref: "briefs/a.json", assignment_ref: "assignments/a.json", project_id: "project-a", candidate_revision: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", fence_path: "/runtime/fence-a", worktree: "/work/a", host_epoch: 3, pane_id: "pane-a", root_session_id: "root-a" })
const code = async (operation) => { try { await operation() } catch (error) { return error.code }; return null }

describe("Herdr visible root adapter", () => {
  test("creates only a fresh pane at the assigned cwd and never closes a foreign pane", async () => {
    const calls = []
    const herdr = createHerdrAdapter({ createPane: async (input) => { calls.push(input); return { pane_id: "pane-a" } }, closePane: async (id) => calls.push(["close", id]), projectRoot: async () => ({ root_session_id: "root-a", state: "ROOT" }), publish: async () => true })
    const pane = await herdr.createPane({ worktree: "/work/a" })
    expect(calls).toEqual([{ cwd: "/work/a" }])
    expect(await code(() => herdr.createPane({ worktree: "/work/a" }))).toBe("CT_LAUNCH_REJECTED")
    expect(await code(() => herdr.closePane("foreign"))).toBe("CT_LAUNCH_REJECTED")
    expect(await pane.close("pane-a")).toBe(true)
    expect(calls).toEqual([{ cwd: "/work/a" }, { cwd: "/work/a" }, ["close", "pane-a"]])
  })

  test("publishes only an exact proven root, never a child or wrong assignment/epoch", async () => {
    const published = []
    const herdr = createHerdrAdapter({ createPane: async () => ({ pane_id: "pane-a" }), closePane: async () => {}, projectRoot: async () => ({ root_session_id: "root-a", state: "ROOT" }), publish: async (value) => { published.push(value); return true } })
    await herdr.createPane({ worktree: "/work/a" })
    expect(await herdr.bindRoot(receipt)).toBe(true)
    expect(published).toEqual([receipt])
    for (const input of [{ ...receipt, host_epoch: 4 }, { ...receipt, assignment_ref: "assignments/other.json" }]) expect(await code(() => herdr.bindRoot(Object.freeze(input)))).toBe("CT_LAUNCH_REJECTED")
    expect(published).toEqual([receipt])
    const child = createHerdrAdapter({ createPane: async () => ({ pane_id: "pane-a" }), closePane: async () => {}, projectRoot: async () => ({ root_session_id: "root-a", parentID: "parent", state: "ROOT" }), publish: async (value) => published.push(value) })
    await child.createPane({ worktree: "/work/a" })
    expect(await code(() => child.bindRoot(receipt))).toBe("CT_LAUNCH_REJECTED")
    expect(published).toEqual([receipt])
  })

  test("closes its fresh pane when projection fails and leaves no visible root state", async () => {
    const closed = [], published = []
    const herdr = createHerdrAdapter({ createPane: async () => ({ pane_id: "pane-a" }), closePane: async (id) => closed.push(id), projectRoot: async () => ({ root_session_id: "root-a", state: "ROOT" }), publish: async (value) => { published.push(value); return false } })
    await herdr.createPane({ worktree: "/work/a" })
    expect(await code(() => herdr.bindRoot(receipt))).toBe("CT_LAUNCH_FAILED")
    expect(closed).toEqual(["pane-a"])
    expect(published).toEqual([receipt])
  })
})
