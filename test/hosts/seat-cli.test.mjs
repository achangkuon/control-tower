import { describe, expect, test } from "bun:test"

import { runSeatCli } from "../../hosts/seat-cli.mjs"

const MAIN = "/p/Main"
const layout = [
  { path: MAIN, branch: "master" },
  { path: "/p/Worktrees/support-agent", branch: "support/read-only" },
  { path: "/p/Worktrees/implementer-1", branch: "feat/a" },
  { path: "/p/Worktrees/implementer-2", branch: "feat/b" },
  { path: "/p/Worktrees/implementer-3", branch: "feat/c" },
  { path: "/p/Worktrees/temp-clean", branch: "spike/clean" },
  { path: "/p/Worktrees/temp-dirty", branch: "spike/dirty" },
]
const errorCode = async (operation) => {
  try { await operation() } catch (error) { return error.code }
  return null
}
const ports = ({ panes = [], herdrDown = false } = {}) => {
  const gitCalls = [], herdrCalls = []
  const git = (args) => {
    gitCalls.push(args.join(" "))
    if (args[0] === "worktree" && args[1] === "list") {
      return layout.map(({ path, branch }) => `worktree ${path}\nHEAD ${"a".repeat(40)}\nbranch refs/heads/${branch}\n`).join("\n")
    }
    if (args[2] === "status") return args[1].endsWith("temp-dirty") ? " M a.txt\n" : ""
    if (args[2] === "cherry") return ""
    if (args[0] === "for-each-ref" && args.at(-1) === "refs/heads/feat/c") return "a".repeat(40)
    return ""
  }
  let opened = null
  const herdr = (args) => {
    herdrCalls.push(args.join(" "))
    if (herdrDown) throw new Error("socket closed")
    if (args[0] === "tab") return args[1] === "list"
      ? { result: { tabs: [{ tab_id: "w1:t1", label: "MAIN", workspace_id: "w1" }, { tab_id: "w1:t3", label: "AGENTES", workspace_id: "w1" }] } }
      : { result: { tab: { tab_id: "w1:t3", label: "AGENTES", workspace_id: "w1" } } }
    if (args[0] === "pane" && args[1] === "current") {
      return { result: { pane: { pane_id: "w1:p1", tab_id: "w1:t1", cwd: MAIN, foreground_cwd: MAIN, workspace_id: "w1" } } }
    }
    if (args[1] === "list") return { result: { panes: [
      ...panes, { pane_id: "w1:p9", tab_id: "w1:t3", workspace_id: "w1", cwd: "/p/Worktrees/implementer-1", foreground_cwd: "/p/Worktrees/implementer-1" },
      ...(opened ? [{ pane_id: "w1:p4", tab_id: "w1:t3", workspace_id: "w1", cwd: opened, foreground_cwd: opened }] : []),
    ] } }
    // The pane exists only after the split; `--cwd` carries the seat the caller asked for.
    if (args[1] === "split") { opened = args[args.indexOf("--cwd") + 1]; return { result: { pane: { pane_id: "w1:p4", workspace_id: "w1" } } } }
    return { result: {} }
  }
  return { gitCalls, herdrCalls, git, herdr, mainPath: MAIN, workspaceId: "w1" }
}

describe("torre asiento", () => {
  test("lists every seat with its kind and the live AGENTES tab", async () => {
    const listed = await runSeatCli(["list"], ports())
    expect(listed.tab).toBe("w1:t3")
    expect(listed.topology).toBe("ok")
    expect(listed.seats.map(({ name, kind }) => `${name}:${kind}`)).toEqual([
      "Main:main", "support-agent:support", "implementer-1:permanent", "implementer-2:permanent",
      "implementer-3:permanent", "temp-clean:temporary", "temp-dirty:temporary",
    ])
    expect(listed.seats.find(({ name }) => name === "implementer-1").blocked_by).toBe("permanent-seat")
  })

  test("defaults to listing and still answers when Herdr control is down", async () => {
    const listed = await runSeatCli([], ports({ herdrDown: true }))
    expect(listed.operation).toBe("list")
    expect(listed.topology).toBe("CT_TOPOLOGY_UNAVAILABLE")
    expect(listed.tab).toBeNull()
  })

  test("opens a seat pane inside the explicitly bound AGENTES workspace", async () => {
    const { herdrCalls, ...rest } = ports()
    expect(await runSeatCli(["abrir", "temp-clean"], { herdrCalls, ...rest })).toEqual({
      operation: "abrir", seat: "temp-clean", temporary: true, tab_id: "w1:t3", pane_id: "w1:p4",
    })
    expect(herdrCalls.filter((call) => call.includes("--current"))).toEqual(["pane current --current --workspace w1", "pane current --current --workspace w1"])
      expect(herdrCalls.filter((call) => /\b(list|split)\b/.test(call)).every((call) => call.includes("--workspace w1"))).toBe(true)
  })

  test("rejects a missing workspace binding before Herdr or unrelated mutation", async () => {
      const unbound = ports()
      unbound.workspaceId = ""
      expect(await errorCode(() => runSeatCli(["abrir", "temp-clean"], unbound))).toBe("CT_TOPOLOGY_REJECTED")
      expect(unbound.herdrCalls).toEqual([])
      expect(unbound.gitCalls.some((call) => call.startsWith("worktree remove"))).toBe(false)
    })

    test("refuses Main, Support, an unknown seat, an occupied seat and a blind topology", async () => {
    for (const args of [["abrir", "Main"], ["abrir", "support-agent"], ["abrir", "nope"], ["abrir"]]) {
      expect(await errorCode(() => runSeatCli(args, ports()))).toBe("CT_SEAT_REJECTED")
    }
    expect(await errorCode(() => runSeatCli(["abrir", "implementer-1"], ports()))).toBe("CT_SEAT_REJECTED")
    expect(await errorCode(() => runSeatCli(["abrir", "temp-clean"], ports({ herdrDown: true })))).toBe("CT_TOPOLOGY_UNAVAILABLE")
  })

  test("previews disposal without removing anything until --confirmar is given", async () => {
    const preview = ports()
    expect(await runSeatCli(["limpiar"], preview)).toEqual({
      operation: "limpiar", dry_run: true, would_remove: ["temp-clean"],
      refused: [{ name: "temp-dirty", path: "/p/Worktrees/temp-dirty", blocked_by: "uncommitted-changes" }],
    })
    expect(preview.gitCalls.some((call) => call.includes("worktree remove"))).toBe(false)
  })

  test("removes only provably safe temporary seats and never a permanent one", async () => {
    const confirmed = ports()
    const result = await runSeatCli(["limpiar", "--confirmar"], confirmed)
    expect(result).toMatchObject({ dry_run: false, removed: ["temp-clean"] })
    expect(result.refused.map(({ name }) => name)).toEqual(["temp-dirty"])
    expect(confirmed.gitCalls.filter((call) => call.startsWith("worktree remove"))).toEqual(["worktree remove /p/Worktrees/temp-clean"])
  })

  test("refuses to dispose at all when seat occupancy cannot be read", async () => {
    expect(await errorCode(() => runSeatCli(["limpiar", "--confirmar"], ports({ herdrDown: true })))).toBe("CT_TOPOLOGY_UNAVAILABLE")
  })

  test("keeps a temporary seat that currently holds a pane", async () => {
    const busy = ports({ panes: [{ pane_id: "w1:p2", tab_id: "w1:t3", workspace_id: "w1", cwd: "/p/Worktrees/temp-clean", foreground_cwd: "/p/Worktrees/temp-clean" }] })
    const result = await runSeatCli(["limpiar", "--confirmar"], busy)
    expect(result.removed).toEqual([])
    expect(result.refused).toContainEqual({ name: "temp-clean", path: "/p/Worktrees/temp-clean", blocked_by: "occupied-pane" })
  })

  test("rejects an unknown subcommand before touching git or Herdr", async () => {
    const unknown = ports()
    expect(await errorCode(() => runSeatCli(["borrar-todo"], unknown))).toBe("CT_SEAT_REJECTED")
    expect(unknown.gitCalls).toEqual([])
    expect(unknown.herdrCalls).toEqual([])
  })

  // The pool is a git fact, so these two never need Herdr and must not be blocked when it is down.
  test("reports pool occupancy without Herdr, and provisions only what is missing", async () => {
    const down = ports({ herdrDown: true })
    expect(await runSeatCli(["pool"], down)).toEqual({
      operation: "pool",
      seats: [
        { name: "implementer-1", path: "/p/Worktrees/implementer-1", branch: "feat/a", free: true, blocked_by: null },
        { name: "implementer-2", path: "/p/Worktrees/implementer-2", branch: "feat/b", free: true, blocked_by: null },
        { name: "implementer-3", path: "/p/Worktrees/implementer-3", branch: "feat/c", free: true, blocked_by: null },
      ],
    })
    expect(down.herdrCalls).toEqual([])

    expect(await runSeatCli(["provisionar"], ports({ herdrDown: true }))).toEqual({ operation: "provisionar", created: [], present: ["implementer-1", "implementer-2", "implementer-3"] })
  })

  test("binds an assignment to a deterministic free seat and echoes no seat state it did not verify", async () => {
    const bound = await runSeatCli(
      ["asignar", "--role", "implementation", "--lane", "apply", "--branch", "feat/s9.1-seat-pool", "--base-sha", "a".repeat(40)],
      ports({ herdrDown: true }),
    )
    expect(bound).toEqual({
      operation: "asignar", seat: "implementer-1", path: "/p/Worktrees/implementer-1",
      role: "implementation", lane: "apply", branch: "feat/s9.1-seat-pool", base_sha: "a".repeat(40),
    })
  })

  test("refuses an assignment with a malformed flag pair or a missing value", async () => {
    for (const args of [
      ["asignar", "--role", "implementation", "--lane", "apply", "--branch", "nope", "--base-sha", "a".repeat(40)],
      ["asignar", "--role", "review", "--lane", "apply", "--branch", "feat/s9.1-x", "--base-sha", "a".repeat(40)],
      ["asignar", "--role", "implementation", "--lane", "apply", "--branch", "feat/s9.1-x"],
      ["asignar", "--role"],
    ]) expect(await errorCode(() => runSeatCli(args, ports({ herdrDown: true })))).toBe("CT_SEAT_REJECTED")
  })

  test("requires the complete confirmed materialization binding before Git or Herdr", async () => {
    const valid = ["materializar", "--seat", "implementer-3", "--role", "implementation", "--lane", "apply", "--branch", "feat/s9.10-seat-materialization", "--base-sha", "b".repeat(40), "--confirmar"]
    for (const args of [valid.slice(0, -1), [...valid, "--confirmar"], [...valid, "--unknown", "value"], [...valid, "--confirmar=value"], [...valid, "extra"]]) {
      const value = ports({ herdrDown: true })
      expect(await errorCode(() => runSeatCli(args, value))).toBe("CT_SEAT_REJECTED")
      expect(value.gitCalls).toEqual([])
      expect(value.herdrCalls).toEqual([])
    }
  })

  test("materializes only through the confirmed full binding without Herdr", async () => {
    const value = ports({ herdrDown: true }), target = "b".repeat(40)
    const original = value.git; let switched = false
    value.git = (args) => {
      if (args[2] === "switch") { switched = true; return "" }
      if (args[2] === "rev-parse") return target
      if (args[0] === "for-each-ref" && args.at(-1) === "refs/heads/feat/s9.10-seat-materialization") return switched ? target : ""
      if (args[0] === "worktree" && args[1] === "list" && switched) return layout.map(({ path, branch }) => `worktree ${path}\nHEAD ${path.endsWith("implementer-3") ? target : "a".repeat(40)}\nbranch refs/heads/${path.endsWith("implementer-3") ? "feat/s9.10-seat-materialization" : branch}\n`).join("\n")
      return original(args)
    }
    const result = await runSeatCli(["materializar", "--seat", "implementer-3", "--role", "implementation", "--lane", "apply", "--branch", "feat/s9.10-seat-materialization", "--base-sha", target, "--confirmar"], value)
    expect(result).toMatchObject({ operation: "materializar", binding: { seat: "implementer-3", role: "implementation", lane: "apply", branch: "feat/s9.10-seat-materialization", base_sha: target } })
    expect(value.herdrCalls).toEqual([])
  })

  test("keeps post-mutation diagnostics safe and actionable at the CLI boundary", async () => {
    const value = ports({ herdrDown: true }), target = "b".repeat(40), original = value.git
    value.git = (args) => {
      if (args[2] === "switch") throw new Error("arbitrary git output")
      if (args[2] === "rev-parse") return target
      return original(args)
    }
    try { await runSeatCli(["materializar", "--seat", "implementer-3", "--role", "implementation", "--lane", "apply", "--branch", "feat/s9.10-cli-failure", "--base-sha", target, "--confirmar"], value) } catch (error) {
      expect(error.code).toBe("CT_SEAT_MUTATION_FAILED")
      expect(error.message).toBe("Seat implementer-3; displaced feat/c; requested feat/s9.10-cli-failure; rollback not-required")
    }
    expect(value.herdrCalls).toEqual([])
  })
})
