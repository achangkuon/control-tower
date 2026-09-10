import { describe, expect, test } from "bun:test"

import * as topologyModule from "../../hosts/herdr-topology.mjs"

const { AGENTS_TAB_LABEL, PERMANENT_SEATS, SEAT_SPLIT_DIRECTION, createHerdrTopology } = topologyModule
const MAIN_TAB_LABEL = "MAIN"
const pane = (paneId, tabId, cwd, workspaceId = "w1") => ({ pane_id: paneId, tab_id: tabId, cwd, foreground_cwd: cwd, workspace_id: workspaceId })
const tab = (tabId, label, workspaceId = "w1") => ({ tab_id: tabId, label, workspace_id: workspaceId })
const errorCode = async (operation) => {
  try { await operation() } catch (error) { return error.code }
  return null
}
// Scripted Herdr control: each entry answers the next call whose argv starts with its key.
const control = (script, current = pane("w1:p1", "w1:t1", "/main")) => {
  const calls = []
  const run = (args) => {
    const command = args.join(" ")
    calls.push(command)
    if (command.startsWith("pane current --current")) return { result: { pane: current } }
    const key = Object.keys(script).find((prefix) => command.startsWith(prefix))
    if (!key) throw Object.assign(new Error(`unscripted: ${command}`), { code: "CT_TEST" })
    const answer = script[key]
    return { result: typeof answer === "function" ? answer() : answer }
  }
  return { calls, run }
}
const topology = (run, workspaceId = "w1") => createHerdrTopology({ run, mainPath: "/main", workspaceId })
const hasPaneEffect = (calls) => calls.some((call) => /^pane (split|close|run)\b/.test(call))

describe("herdr topology", () => {
  test("pins the approved topology constants", () => {
    expect(topologyModule.MAIN_TAB_LABEL).toBe(MAIN_TAB_LABEL)
    expect(AGENTS_TAB_LABEL).toBe("AGENTES")
    expect(SEAT_SPLIT_DIRECTION).toBe("right")
    expect(PERMANENT_SEATS).toEqual(["implementer-1", "implementer-2", "implementer-3"])
    expect(Object.isFrozen(PERMANENT_SEATS)).toBe(true)
  })

  test("requires an explicit valid workspace before touching Herdr", async () => {
    for (const workspaceId of ["", "  ", "w1\0other"]) {
      const { calls, run } = control({})
      expect(await errorCode(() => createHerdrTopology({ run, mainPath: "/main", workspaceId }).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_REJECTED")
      expect(calls).toEqual([])
    }
    const previous = process.env.HERDR_WORKSPACE_ID, absent = control({})
    try {
      delete process.env.HERDR_WORKSPACE_ID
      expect(await errorCode(() => createHerdrTopology({ run: absent.run, mainPath: "/main" }).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_REJECTED")
      expect(absent.calls).toEqual([])
    } finally {
      if (previous === undefined) delete process.env.HERDR_WORKSPACE_ID
      else process.env.HERDR_WORKSPACE_ID = previous
    }
  })

  test("rejects same-label tabs from another workspace instead of selecting by label", async () => {
    const { calls, run } = control({
      "tab list": { tabs: [tab("w1:t1", MAIN_TAB_LABEL), tab("w2:t3", AGENTS_TAB_LABEL, "w2")] },
    })

    expect(await errorCode(() => topology(run).readAgentsTab())).toBe("CT_TOPOLOGY_REJECTED")
    expect(calls).toEqual(["tab list --workspace w1"])
  })

  test("renames the invoking pane's default numeric tab to MAIN and reads the label back", async () => {
    let label = "1"
    const { calls, run } = control({
      "tab list": () => ({ tabs: [tab("w1:t1", label)] }),
      "tab rename": () => { label = MAIN_TAB_LABEL; return { tab: tab("w1:t1", label) } },
    })

    expect(await topology(run).readAgentsTab()).toEqual({ tab_id: null, panes: [] })
    expect(calls).toContain(`tab rename w1:t1 ${MAIN_TAB_LABEL} --workspace w1`)
    expect(calls.filter((call) => call === "tab list --workspace w1")).toHaveLength(2)
  })

  test("leaves an already-canonical MAIN tab unchanged", async () => {
    const { calls, run } = control({ "tab list": { tabs: [tab("w1:t1", MAIN_TAB_LABEL)] } })

    expect(await topology(run).readAgentsTab()).toEqual({ tab_id: null, panes: [] })
    expect(calls.some((call) => call.startsWith("tab rename"))).toBe(false)
  })

  test("rejects a duplicate MAIN before renaming or opening a seat", async () => {
    const duplicate = control({ "tab list": { tabs: [tab("w1:t1", "1"), tab("w1:t2", MAIN_TAB_LABEL)] } })

    expect(await errorCode(() => topology(duplicate.run).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_REJECTED")
    expect(duplicate.calls.some((call) => call.startsWith("tab rename"))).toBe(false)
    expect(hasPaneEffect(duplicate.calls)).toBe(false)
  })

  test("rejects an invoking pane outside canonical Main before renaming or opening a seat", async () => {
    const wrong = control(
      { "tab list": { tabs: [tab("w1:t1", "1")] } },
      pane("w1:p1", "w1:t1", "/elsewhere"),
    )

    expect(await errorCode(() => topology(wrong.run).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_REJECTED")
    expect(wrong.calls.some((call) => call.startsWith("tab rename"))).toBe(false)
    expect(hasPaneEffect(wrong.calls)).toBe(false)
  })

  test("rejects missing identity, foreground cwd drift, and a non-default invoking label without effects", async () => {
    const cases = [
      { pane_id: null, tab_id: "w1:t1", cwd: "/main", foreground_cwd: "/main" },
      { ...pane("w1:p1", "w1:t1", "/main"), foreground_cwd: "/elsewhere" },
      pane("w1:p1", "w1:t1", "/main", "w2"),
      pane("w1:p1", "w1:t1", "/main"),
    ]
    const labels = ["1", "1", "1", "feature"]
    for (let index = 0; index < cases.length; index += 1) {
      const rejected = control({ "tab list": { tabs: [tab("w1:t1", labels[index])] } }, cases[index])
      expect(await errorCode(() => topology(rejected.run).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_REJECTED")
      expect(rejected.calls.some((call) => call.startsWith("tab rename"))).toBe(false)
      expect(hasPaneEffect(rejected.calls)).toBe(false)
    }
  })

  test("requires an explicit absolute canonical Main path before touching control", async () => {
    const { calls, run } = control({})
    for (const mainPath of [undefined, "", "relative/path", "/main\0"]) {
      expect(await errorCode(() => createHerdrTopology({ run, mainPath }).readAgentsTab())).toBe("CT_TOPOLOGY_REJECTED")
    }
    expect(calls).toEqual([])
  })

  test("creates the AGENTES tab with the seat cwd when it is absent, never splitting the current pane", async () => {
    let created = false
    const { calls, run } = control({
      "tab list": () => (created ? { tabs: [tab("w1:t1", MAIN_TAB_LABEL), tab("w1:t2", AGENTS_TAB_LABEL)] } : { tabs: [tab("w1:t1", MAIN_TAB_LABEL)] }),
      "tab create": () => { created = true; return { tab: tab("w1:t2", AGENTS_TAB_LABEL) } },
      "pane list": () => ({ panes: [pane("w1:p1", "w1:t1", "/main"), pane("w1:p9", "w1:t2", "/work/ag-1")] }),
    })
    const opened = await topology(run).openSeatPane({ cwd: "/work/ag-1" })

    expect(opened).toEqual({ tab_id: "w1:t2", pane_id: "w1:p9" })
    expect(calls).toContain(`tab create --workspace w1 --label ${AGENTS_TAB_LABEL} --cwd /work/ag-1 --no-focus`)
    expect(calls.filter((call) => call.includes("--current"))).toEqual(["pane current --current --workspace w1"])
  })

  test("rejects an aliased tab-create ID from another workspace tab without closing it", async () => {
    const { calls, run } = control({
      "tab list": { tabs: [tab("w1:t1", MAIN_TAB_LABEL), tab("w1:t8", "ARCHIVE")] },
      "tab create": { tab: tab("w1:t8", AGENTS_TAB_LABEL) },
      "pane list": { panes: [pane("w1:p1", "w1:t1", "/main")] },
      "tab close": {},
    })

    expect(await errorCode(() => topology(run).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_REJECTED")
    expect(calls.some((call) => call.startsWith("tab close"))).toBe(false)
    expect(calls.some((call) => call.startsWith("pane close"))).toBe(false)
  })

  test("rejects a tab-create response from another workspace without closing it", async () => {
    const { calls, run } = control({
      "tab list": { tabs: [tab("w1:t1", MAIN_TAB_LABEL)] },
      "tab create": { tab: tab("w2:t9", AGENTS_TAB_LABEL, "w2") },
      "tab close": {},
    })

    expect(await errorCode(() => topology(run).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_REJECTED")
    expect(calls.some((call) => call.startsWith("tab close"))).toBe(false)
    expect(calls.some((call) => call.startsWith("pane close"))).toBe(false)
  })

  test("closes a newly proven tab when its pane readback diverges", async () => {
    const { calls, run } = control({
      "tab list": { tabs: [tab("w1:t1", MAIN_TAB_LABEL)] },
      "tab create": { tab: tab("w1:t9", AGENTS_TAB_LABEL) },
      "pane list": { panes: [pane("w1:p1", "w1:t1", "/main")] },
      "tab close": {},
    })

    expect(await errorCode(() => topology(run).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_REJECTED")
    expect(calls).toContain("tab close w1:t9 --workspace w1")
  })

  // The new pane exists only after the split, so the anchor listing must not already contain it.
  const afterSplit = (before, after) => {
    let split = false
    return {
      "tab list": { tabs: [tab("w1:t1", MAIN_TAB_LABEL), tab("w1:t3", AGENTS_TAB_LABEL)] },
      "pane split": () => { split = true; return { pane: { pane_id: "w1:p7", workspace_id: "w1" } } },
      "pane list": () => ({ panes: split ? after : before }),
      "pane close": {},
    }
  }
  const seated = [pane("w1:p1", "w1:t1", "/main"), pane("w1:p5", "w1:t3", "/work/ag-1")]

  test("splits the last pane of the existing AGENTES tab, sideways and unfocused", async () => {
    const { calls, run } = control(afterSplit(seated, [...seated, pane("w1:p7", "w1:t3", "/work/ag-2")]))
    const opened = await topology(run).openSeatPane({ cwd: "/work/ag-2" })

    expect(opened).toEqual({ tab_id: "w1:t3", pane_id: "w1:p7" })
    expect(calls).toContain(`pane split w1:p5 --workspace w1 --direction ${SEAT_SPLIT_DIRECTION} --cwd /work/ag-2 --no-focus`)
    expect(calls.filter((call) => call.includes("--current"))).toEqual(["pane current --current --workspace w1"])
  })

  test("closes the pane it opened when the readback lands on the wrong tab, workspace or cwd", async () => {
    for (const wrong of [pane("w1:p7", "w1:t1", "/work/ag-2"), pane("w1:p7", "w1:t3", "/main"), pane("w1:p7", "w1:t3", "/work/ag-2", "w2")]) {
      const { calls, run } = control(afterSplit(seated, [...seated, wrong]))
      expect(await errorCode(() => topology(run).openSeatPane({ cwd: "/work/ag-2" }))).toBe("CT_TOPOLOGY_REJECTED")
      expect(calls).toContain("pane close w1:p7 --workspace w1")
      expect(calls.some((call) => call.startsWith("tab close"))).toBe(false)
    }
  })

  test("rejects an aliased split ID from another tab without closing it", async () => {
    const aliased = [...seated, pane("w1:p7", "w1:t1", "/existing")]
    const { calls, run } = control({
      "tab list": { tabs: [tab("w1:t1", MAIN_TAB_LABEL), tab("w1:t3", AGENTS_TAB_LABEL)] },
      "pane list": { panes: aliased },
      "pane split": { pane: { pane_id: "w1:p7", workspace_id: "w1" } },
      "pane close": {},
    })

    expect(await errorCode(() => topology(run).openSeatPane({ cwd: "/work/ag-2" }))).toBe("CT_TOPOLOGY_REJECTED")
    expect(calls.some((call) => call.startsWith("pane close"))).toBe(false)
    expect(calls.some((call) => call.startsWith("tab close"))).toBe(false)
  })

  test("rejects a split response from another workspace without closing it", async () => {
    const script = afterSplit(seated, [...seated, pane("w1:p7", "w1:t3", "/work/ag-2")])
    script["pane split"] = () => ({ pane: { pane_id: "w1:p7", workspace_id: "w2" } })
    const { calls, run } = control(script)

    expect(await errorCode(() => topology(run).openSeatPane({ cwd: "/work/ag-2" }))).toBe("CT_TOPOLOGY_REJECTED")
    expect(calls.some((call) => call.startsWith("pane close"))).toBe(false)
  })

  test("closes the pane it opened when the foreground process moved away from the seat", async () => {
    const drifted = { ...pane("w1:p7", "w1:t3", "/work/ag-2"), foreground_cwd: "/elsewhere" }
    const { calls, run } = control(afterSplit(seated, [...seated, drifted]))
    expect(await errorCode(() => topology(run).openSeatPane({ cwd: "/work/ag-2" }))).toBe("CT_TOPOLOGY_REJECTED")
    expect(calls).toContain("pane close w1:p7 --workspace w1")
  })

  test("refuses an ambiguous or unreadable topology without any pane effect", async () => {
    const ambiguous = control({ "tab list": { tabs: [tab("w1:t1", MAIN_TAB_LABEL), tab("w1:t2", AGENTS_TAB_LABEL), tab("w1:t3", AGENTS_TAB_LABEL)] } })
    expect(await errorCode(() => topology(ambiguous.run).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_REJECTED")
    expect(hasPaneEffect(ambiguous.calls)).toBe(false)

    const offline = { run: () => { throw new Error("socket closed") } }
    expect(await errorCode(() => createHerdrTopology({ ...offline, mainPath: "/main" }).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_UNAVAILABLE")

    const malformed = control({ "tab list": { tabs: "not-a-list" } })
    expect(await errorCode(() => topology(malformed.run).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_UNAVAILABLE")
  })

  test("rejects a missing or non-absolute seat cwd before touching control", async () => {
    const { calls, run } = control({ "tab list": { tabs: [] } })
    const herdrTopology = topology(run)
    for (const cwd of [undefined, "", "relative/path", "/work/ag\0"]) {
      expect(await errorCode(() => herdrTopology.openSeatPane({ cwd }))).toBe("CT_TOPOLOGY_REJECTED")
    }
    expect(calls).toEqual([])
  })

  test("reports the live AGENTES occupancy without mutating anything", async () => {
    const { calls, run } = control({
      "tab list": { tabs: [tab("w1:t1", MAIN_TAB_LABEL), tab("w1:t3", AGENTS_TAB_LABEL)] },
      "pane list": { panes: [pane("w1:p1", "w1:t1", "/main"), pane("w1:p5", "w1:t3", "/work/ag-1")] },
    })
    expect(await topology(run).readAgentsTab()).toEqual({
      tab_id: "w1:t3",
      panes: [{ pane_id: "w1:p5", cwd: "/work/ag-1", foreground_cwd: "/work/ag-1" }],
    })
    expect(calls.every((call) => call.endsWith("--workspace w1") || call === "pane current --current --workspace w1")).toBe(true)
  })

  test("reports an absent AGENTES tab as absent instead of creating one", async () => {
    const { calls, run } = control({ "tab list": { tabs: [tab("w1:t1", MAIN_TAB_LABEL)] } })
    expect(await topology(run).readAgentsTab()).toEqual({ tab_id: null, panes: [] })
    expect(calls.some((call) => call.startsWith("tab create"))).toBe(false)
  })
})
