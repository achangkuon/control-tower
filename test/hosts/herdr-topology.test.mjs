import { describe, expect, test } from "bun:test"

import { AGENTS_TAB_LABEL, PERMANENT_SEATS, SEAT_SPLIT_DIRECTION, createHerdrTopology } from "../../hosts/herdr-topology.mjs"

const pane = (paneId, tabId, cwd) => ({ pane_id: paneId, tab_id: tabId, cwd, foreground_cwd: cwd, workspace_id: "w1" })
const tab = (tabId, label) => ({ tab_id: tabId, label, workspace_id: "w1" })
const errorCode = async (operation) => {
  try { await operation() } catch (error) { return error.code }
  return null
}
// Scripted Herdr control: each entry answers the next call whose argv starts with its key.
const control = (script) => {
  const calls = []
  const run = (args) => {
    calls.push(args.join(" "))
    const key = Object.keys(script).find((prefix) => args.join(" ").startsWith(prefix))
    if (!key) throw Object.assign(new Error(`unscripted: ${args.join(" ")}`), { code: "CT_TEST" })
    const answer = script[key]
    return { result: typeof answer === "function" ? answer() : answer }
  }
  return { calls, run }
}

describe("herdr topology", () => {
  test("pins the approved topology constants", () => {
    expect(AGENTS_TAB_LABEL).toBe("AGENTES")
    expect(SEAT_SPLIT_DIRECTION).toBe("right")
    expect(PERMANENT_SEATS).toEqual(["implementer-1", "implementer-2", "implementer-3"])
    expect(Object.isFrozen(PERMANENT_SEATS)).toBe(true)
  })

  test("creates the AGENTES tab with the seat cwd when it is absent, never splitting the current pane", async () => {
    let created = false
    const { calls, run } = control({
      "tab list": () => (created ? { tabs: [tab("w1:t1", "1"), tab("w1:t2", AGENTS_TAB_LABEL)] } : { tabs: [tab("w1:t1", "1")] }),
      "tab create": () => { created = true; return { tab: tab("w1:t2", AGENTS_TAB_LABEL) } },
      "pane list": () => ({ panes: [pane("w1:p1", "w1:t1", "/main"), pane("w1:p9", "w1:t2", "/work/ag-1")] }),
    })
    const opened = await createHerdrTopology({ run }).openSeatPane({ cwd: "/work/ag-1" })

    expect(opened).toEqual({ tab_id: "w1:t2", pane_id: "w1:p9" })
    expect(calls).toContain(`tab create --label ${AGENTS_TAB_LABEL} --cwd /work/ag-1 --no-focus`)
    expect(calls.some((call) => call.includes("--current"))).toBe(false)
  })

  // The new pane exists only after the split, so the anchor listing must not already contain it.
  const afterSplit = (before, after) => {
    let split = false
    return {
      "tab list": { tabs: [tab("w1:t1", "MAIN"), tab("w1:t3", AGENTS_TAB_LABEL)] },
      "pane split": () => { split = true; return { pane: { pane_id: "w1:p7" } } },
      "pane list": () => ({ panes: split ? after : before }),
      "pane close": {},
    }
  }
  const seated = [pane("w1:p1", "w1:t1", "/main"), pane("w1:p5", "w1:t3", "/work/ag-1")]

  test("splits the last pane of the existing AGENTES tab, sideways and unfocused", async () => {
    const { calls, run } = control(afterSplit(seated, [...seated, pane("w1:p7", "w1:t3", "/work/ag-2")]))
    const opened = await createHerdrTopology({ run }).openSeatPane({ cwd: "/work/ag-2" })

    expect(opened).toEqual({ tab_id: "w1:t3", pane_id: "w1:p7" })
    expect(calls).toContain(`pane split w1:p5 --direction ${SEAT_SPLIT_DIRECTION} --cwd /work/ag-2 --no-focus`)
    expect(calls.some((call) => call.includes("--current"))).toBe(false)
  })

  test("closes the pane it opened when the readback lands on the wrong tab or cwd", async () => {
    for (const wrong of [pane("w1:p7", "w1:t1", "/work/ag-2"), pane("w1:p7", "w1:t3", "/main")]) {
      const { calls, run } = control(afterSplit(seated, [...seated, wrong]))
      expect(await errorCode(() => createHerdrTopology({ run }).openSeatPane({ cwd: "/work/ag-2" }))).toBe("CT_TOPOLOGY_REJECTED")
      expect(calls).toContain("pane close w1:p7")
    }
  })

  test("closes the pane it opened when the foreground process moved away from the seat", async () => {
    const drifted = { ...pane("w1:p7", "w1:t3", "/work/ag-2"), foreground_cwd: "/elsewhere" }
    const { calls, run } = control(afterSplit(seated, [...seated, drifted]))
    expect(await errorCode(() => createHerdrTopology({ run }).openSeatPane({ cwd: "/work/ag-2" }))).toBe("CT_TOPOLOGY_REJECTED")
    expect(calls).toContain("pane close w1:p7")
  })

  test("refuses an ambiguous or unreadable topology without any pane effect", async () => {
    const ambiguous = control({ "tab list": { tabs: [tab("w1:t2", AGENTS_TAB_LABEL), tab("w1:t3", AGENTS_TAB_LABEL)] } })
    expect(await errorCode(() => createHerdrTopology(ambiguous).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_REJECTED")
    expect(ambiguous.calls.some((call) => call.startsWith("pane"))).toBe(false)

    const offline = { run: () => { throw new Error("socket closed") } }
    expect(await errorCode(() => createHerdrTopology(offline).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_UNAVAILABLE")

    const malformed = control({ "tab list": { tabs: "not-a-list" } })
    expect(await errorCode(() => createHerdrTopology(malformed).openSeatPane({ cwd: "/work/ag-1" }))).toBe("CT_TOPOLOGY_UNAVAILABLE")
  })

  test("rejects a missing or non-absolute seat cwd before touching control", async () => {
    const { calls, run } = control({ "tab list": { tabs: [] } })
    const topology = createHerdrTopology({ run })
    for (const cwd of [undefined, "", "relative/path", "/work/ag\0"]) {
      expect(await errorCode(() => topology.openSeatPane({ cwd }))).toBe("CT_TOPOLOGY_REJECTED")
    }
    expect(calls).toEqual([])
  })

  test("reports the live AGENTES occupancy without mutating anything", async () => {
    const { calls, run } = control({
      "tab list": { tabs: [tab("w1:t1", "MAIN"), tab("w1:t3", AGENTS_TAB_LABEL)] },
      "pane list": { panes: [pane("w1:p1", "w1:t1", "/main"), pane("w1:p5", "w1:t3", "/work/ag-1")] },
    })
    expect(await createHerdrTopology({ run }).readAgentsTab()).toEqual({
      tab_id: "w1:t3",
      panes: [{ pane_id: "w1:p5", cwd: "/work/ag-1", foreground_cwd: "/work/ag-1" }],
    })
    expect(calls.every((call) => call.endsWith("list"))).toBe(true)
  })

  test("reports an absent AGENTES tab as absent instead of creating one", async () => {
    const { calls, run } = control({ "tab list": { tabs: [tab("w1:t1", "MAIN")] } })
    expect(await createHerdrTopology({ run }).readAgentsTab()).toEqual({ tab_id: null, panes: [] })
    expect(calls.some((call) => call.startsWith("tab create"))).toBe(false)
  })
})
