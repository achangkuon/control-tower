import { describe, expect, test } from "bun:test"

import { createOpenCodeView } from "../../hosts/opencode-view.mjs"

const rootId = `ses_${"a".repeat(26)}`
const binding = Object.freeze({ backend_url: "http://127.0.0.1:4096", root_session_id: rootId, worktree: "/work/a" })
const manual = `opencode attach http://127.0.0.1:4096 --session ${rootId}`
const code = async (operation) => { try { await operation() } catch (error) { return error.code }; return null }

const ports = (overrides = {}) => {
  const opened = [], closed = []
  return {
    opened, closed,
    openPane: ({ command, cwd }) => { opened.push({ command, cwd }); return { pane_id: "w1:p1" } },
    closePane: (paneId) => { closed.push(paneId); return true },
    ...overrides,
  }
}

describe("Non-authoritative OpenCode view", () => {
  test("attaches a pane to the exact root session on its own backend", async () => {
    const wiring = ports()
    const view = createOpenCodeView(wiring)
    const attached = await view.attach(binding)
    expect(wiring.opened).toEqual([{ command: ["opencode", "attach", "http://127.0.0.1:4096", "--session", rootId], cwd: "/work/a" }])
    expect(attached).toEqual({ manual_command: manual, pane_id: "w1:p1" })
    expect(Object.isFrozen(attached)).toBe(true)
  })

  // Decision 39: the operator must always be able to attach by hand, so the fallback is not a
  // consolation prize for failure — it is available whether the launcher worked or not.
  test("always yields the manual fallback, and yields it even when the pane cannot open", async () => {
    expect(createOpenCodeView(ports()).manualCommand(binding)).toBe(manual)
    for (const openPane of [() => { throw new Error("herdr down") }, () => null, () => ({}), () => ({ pane_id: "--help" }), () => ({ pane_id: "foreign" })]) {
      const view = createOpenCodeView(ports({ openPane }))
      const fallback = await view.attach(binding).catch((error) => error)
      expect(fallback.code).toBe("CT_VIEW_UNAVAILABLE")
      // A failed view is never fatal: it hands back the exact command the operator can run instead.
      expect(fallback.manual_command).toBe(manual)
    }
  })

  test("refuses a foreign, ambiguous or off-loopback target before opening anything", async () => {
    const wiring = ports()
    const view = createOpenCodeView(wiring)
    const { worktree, ...missing } = binding
    for (const invalid of [null, undefined, "", [binding], missing, { ...binding, extra: true }, { ...binding, root_session_id: "root-a" }, { ...binding, root_session_id: "--help" }, { ...binding, root_session_id: `ses_${"a".repeat(27)}` }, { ...binding, backend_url: "http://10.0.0.5:4096" }, { ...binding, backend_url: "https://127.0.0.1:4096" }, { ...binding, backend_url: "--help" }, { ...binding, worktree: "relative" }, { ...binding, worktree: "" }]) {
      expect(await code(() => view.attach(invalid))).toBe("CT_VIEW_REJECTED")
      expect(() => view.manualCommand(invalid)).toThrow()
    }
    expect(wiring.opened).toEqual([])
  })

  // Decision 39 again: the pane is not the root and Intercom is not transport. The view cannot
  // dispatch, authorise, prompt, bind or mutate an epoch, because it has no such surface to offer.
  test("exposes no authority surface at all", () => {
    const view = createOpenCodeView(ports())
    expect(Object.isFrozen(view)).toBe(true)
    expect(Object.keys(view).sort()).toEqual(["attach", "close", "manualCommand"])
    expect(JSON.stringify(Object.keys(view))).not.toMatch(/dispatch|authori|prompt|bind|epoch|intercom|stop|start|kill/i)
  })

  test("closing the view touches only the pane, never a backend, root or epoch", async () => {
    const wiring = ports()
    const view = createOpenCodeView(wiring)
    await view.attach(binding)
    expect(view.close("w1:p1")).toBe(true)
    expect(wiring.closed).toEqual(["w1:p1"])
    // Nothing about the backend or the root is reachable from here, so nothing about them can change.
    for (const handle of [binding.backend_url, binding.root_session_id, binding.worktree, "w1:p2", "--help", "", null]) {
      expect(await code(() => view.close(handle))).toBe("CT_VIEW_REJECTED")
    }
    expect(wiring.closed).toEqual(["w1:p1"])
  })

  test("a lost or re-attached view never changes the root it points at", async () => {
    const wiring = ports()
    const view = createOpenCodeView(wiring)
    const first = await view.attach(binding)
    view.close(first.pane_id)
    const again = await view.attach(binding)
    expect(again.manual_command).toBe(first.manual_command)
    expect(wiring.opened.every(({ command }) => command.includes(rootId))).toBe(true)
    expect(wiring.opened).toHaveLength(2)
  })

  test("requires both pane ports and grants no default wiring", () => {
    const full = ports()
    for (const key of ["openPane", "closePane"]) {
      const partial = { ...full }
      delete partial[key]
      expect(() => createOpenCodeView(partial)).toThrow(TypeError)
    }
    expect(() => createOpenCodeView()).toThrow(TypeError)
  })

  test("refuses a target whose port cannot exist", async () => {
    for (const port of [65536, 99999]) {
      const view = createOpenCodeView(ports())
      expect(await code(() => view.attach({ ...binding, backend_url: `http://127.0.0.1:${port}` }))).toBe("CT_VIEW_REJECTED")
    }
  })
})
