import { describe, expect, test } from "bun:test"

import { createHerdrAdapter } from "../../hosts/herdr.mjs"

const receipt = Object.freeze({ brief: "Approved work only", brief_ref: "briefs/a.json", assignment_ref: "assignments/a.json", project_id: "project-a", candidate_revision: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", fence_path: "/runtime/fence-a", worktree: "/work/a", host_epoch: 3, pane_id: "w1:p1", terminal_id: "terminal-a", root_session_id: "root-a" })
const code = async (operation) => { try { await operation() } catch (error) { return error.code }; return null }
const observation = Object.freeze({ schema: "control-tower.herdr-root-custody", schema_version: 1, pane_id: "w1:p1", terminal_id: "terminal-a", source: "herdr:opencode", agent: "opencode", session_id: "root-a" })

describe("Herdr visible root adapter", () => {
  test("creates only a fresh pane at the assigned cwd and never closes a foreign pane", async () => {
    const calls = []
    const herdr = createHerdrAdapter({ createPane: async (input) => { calls.push(input); return { pane_id: "w1:p1" } }, closePane: async (id) => calls.push(["close", id]), projectRoot: async () => observation, publish: async () => true })
    const pane = await herdr.createPane({ worktree: "/work/a" })
    expect(calls).toEqual([{ cwd: "/work/a" }])
    expect(await code(() => herdr.createPane({ worktree: "/work/a" }))).toBe("CT_LAUNCH_REJECTED")
    expect(await code(() => herdr.closePane("foreign"))).toBe("CT_LAUNCH_REJECTED")
    expect(await pane.close("w1:p1")).toBe(true)
    expect(calls).toEqual([{ cwd: "/work/a" }, { cwd: "/work/a" }, ["close", "w1:p1"]])
  })

  test("publishes only exact validated custody, never an extra or wrong assignment/epoch", async () => {
    const published = []
    const herdr = createHerdrAdapter({ createPane: async () => ({ pane_id: "w1:p1" }), closePane: async () => {}, projectRoot: async () => observation, publish: async (value) => { published.push(value); return true } })
    await herdr.createPane({ worktree: "/work/a" })
    expect(await herdr.bindRoot(receipt)).toBe(true)
    expect(published).toEqual([receipt])
    for (const input of [{ ...receipt, host_epoch: 4 }, { ...receipt, assignment_ref: "assignments/other.json" }]) expect(await code(() => herdr.bindRoot(Object.freeze(input)))).toBe("CT_LAUNCH_REJECTED")
    expect(published).toEqual([receipt])
    const child = createHerdrAdapter({ createPane: async () => ({ pane_id: "w1:p1" }), closePane: async () => {}, projectRoot: async () => ({ ...observation, parent_id: "parent" }), publish: async (value) => published.push(value) })
    await child.createPane({ worktree: "/work/a" })
    expect(await code(() => child.bindRoot(receipt))).toBe("CT_LAUNCH_REJECTED")
    expect(published).toEqual([receipt])
  })

  test("closes its fresh pane when projection fails and leaves no visible root state", async () => {
    const closed = [], published = []
    const herdr = createHerdrAdapter({ createPane: async () => ({ pane_id: "w1:p1" }), closePane: async (id) => closed.push(id), projectRoot: async () => observation, publish: async (value) => { published.push(value); return false } })
    await herdr.createPane({ worktree: "/work/a" })
    expect(await code(() => herdr.bindRoot(receipt))).toBe("CT_LAUNCH_FAILED")
    expect(closed).toEqual(["w1:p1"])
    expect(published).toEqual([receipt])
  })

  test("rejects missing, malformed, extra, oversized, and mismatched custody observations before projection", async () => {
    for (const observed of [null, { ...observation, parent_id: "parent" }, { ...observation, pane_id: "other" }, { ...observation, terminal_id: "other" }, { ...observation, session_id: "other" }, { ...observation, source: "caller" }, { ...observation, capabilities: ["pane_bound", "pane_bound"] }, { ...observation, session_id: "x".repeat(513) }]) {
      const closed = [], published = []
      const herdr = createHerdrAdapter({ createPane: async () => ({ pane_id: "w1:p1" }), closePane: async (id) => closed.push(id), projectRoot: async () => observed, publish: async (value) => { published.push(value); return true } })
      await herdr.createPane({ worktree: "/work/a" })
      expect(await code(() => herdr.bindRoot(receipt))).toBe("CT_LAUNCH_REJECTED")
      expect(closed).toEqual(["w1:p1"])
      expect(published).toEqual([])
    }
  })

  test("rejects option-shaped or foreign pane identifiers before any cleanup command", async () => {
    for (const pane_id of ["--help", "-x", "pane-a", "w1:pI"]) {
      const herdr = createHerdrAdapter({ createPane: async () => ({ pane_id }), closePane: async () => { throw new Error("foreign cleanup") }, projectRoot: async () => observation, publish: async () => true })
      expect(await code(() => herdr.createPane({ worktree: "/work/a" }))).toBe("CT_LAUNCH_REJECTED")
    }
  })
})
