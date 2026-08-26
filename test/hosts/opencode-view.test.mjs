import { describe, expect, test } from "bun:test"

import { createOpenCodeView } from "../../hosts/opencode-view.mjs"

const rootId = `ses_${"a".repeat(26)}`
const binding = Object.freeze({ backend_url: "http://127.0.0.1:4096", credential_ref: "r".repeat(43), root_session_id: rootId, worktree: "/work/a" })
const helperCommand = Object.freeze([process.execPath, "/runtime/hosts/opencode-attach-helper.mjs"])
const code = async (operation) => { try { await operation() } catch (error) { return error.code }; return null }

const ports = (overrides = {}) => {
  const opened = [], closed = []
  return {
    opened, closed, helperCommand,
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
    expect(wiring.opened).toEqual([{ command: helperCommand, cwd: "/work/a" }])
    expect(attached).toEqual({ pane_id: "w1:p1" })
    expect(Object.isFrozen(attached)).toBe(true)
  })

  // The private helper replaces the raw attach fallback without widening the view surface.

  test("fails without leaking a command, secret or credential ref", async () => {
    expect(Object.keys(createOpenCodeView(ports()))).not.toContain("manualCommand")
    for (const openPane of [() => { throw new Error("herdr down") }, () => null, () => ({}), () => ({ pane_id: "--help" }), () => ({ pane_id: "foreign" })]) {
      const view = createOpenCodeView(ports({ openPane }))
      const fallback = await view.attach(binding).catch((error) => error)
      expect(fallback.code).toBe("CT_VIEW_UNAVAILABLE")
      // Failure carries no executable or credential material.
      expect(JSON.stringify(fallback)).not.toMatch(/manual|attach|credential|secret|rrrr/)
    }
  })

  test("refuses a foreign, ambiguous or off-loopback target before opening anything", async () => {
    const wiring = ports()
    const view = createOpenCodeView(wiring)
    const { worktree, ...missing } = binding
    for (const invalid of [null, undefined, "", [binding], missing, { ...binding, extra: true }, { ...binding, root_session_id: "root-a" }, { ...binding, root_session_id: "--help" }, { ...binding, root_session_id: `ses_${"a".repeat(27)}` }, { ...binding, backend_url: "http://10.0.0.5:4096" }, { ...binding, backend_url: "https://127.0.0.1:4096" }, { ...binding, backend_url: "--help" }, { ...binding, worktree: "relative" }, { ...binding, worktree: "" }]) {
      expect(await code(() => view.attach(invalid))).toBe("CT_VIEW_REJECTED")
      expect(Object.keys(view)).not.toContain("manualCommand")
    }
    expect(wiring.opened).toEqual([])
  })

  // Decision 39 again: the pane is not the root and Intercom is not transport. The view cannot
  // dispatch, authorise, prompt, bind or mutate an epoch, because it has no such surface to offer.
  test("exposes no authority surface at all", () => {
    const view = createOpenCodeView(ports())
    expect(Object.isFrozen(view)).toBe(true)
    expect(Object.keys(view).sort()).toEqual(["attach", "close"])
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

  test("uses the same fixed helper after pane replacement", async () => {
    const wiring = ports()
    const view = createOpenCodeView(wiring)
    const first = await view.attach(binding)
    view.close(first.pane_id)
    const again = await view.attach(binding)
    expect(again.pane_id).toBe(first.pane_id)
    expect(wiring.opened.every(({ command }) => JSON.stringify(command) === JSON.stringify(helperCommand))).toBe(true)
    expect(wiring.opened).toHaveLength(2)
  })

  test("requires both pane ports and grants no default wiring", () => {
    const full = ports()
    for (const key of ["openPane", "closePane", "helperCommand"]) {
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
