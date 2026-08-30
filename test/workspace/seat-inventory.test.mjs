import { describe, expect, test } from "bun:test"

import { PERMANENT_SEATS, SUPPORT_SEAT, createSeatInventory } from "../../workspace/seat-inventory.mjs"

const porcelain = (entries) => entries.map(({ path, branch }) =>
  `worktree ${path}\nHEAD ${"a".repeat(40)}\n${branch ? `branch refs/heads/${branch}` : "detached"}\n`).join("\n")

const inventory = ({ entries, dirty = [], unmerged = [], occupied = [] }) => {
  const calls = []
  const git = (args) => {
    calls.push(args.join(" "))
    if (args[0] === "worktree") return porcelain(entries)
    const path = args[1]
    if (args[2] === "status") return dirty.includes(path) ? " M file.txt\n" : ""
    if (args[2] === "cherry") return unmerged.includes(path) ? `+ ${"b".repeat(40)}\n` : ""
    throw new Error(`unscripted git: ${args.join(" ")}`)
  }
  return { calls, inventory: createSeatInventory({ git, trunk: "master", readOccupied: () => occupied }) }
}

const seats = [
  { path: "/p/Main", branch: "master" },
  { path: "/p/Worktrees/support-agent", branch: "support/read-only" },
  { path: "/p/Worktrees/implementer-1", branch: "feat/a" },
  { path: "/p/Worktrees/implementer-2", branch: "feat/b" },
  { path: "/p/Worktrees/implementer-3", branch: "feat/c" },
]

describe("seat inventory", () => {
  test("pins the permanent seat names shared with the topology", () => {
    expect(PERMANENT_SEATS).toEqual(["implementer-1", "implementer-2", "implementer-3"])
    expect(SUPPORT_SEAT).toBe("support-agent")
  })

  test("classifies the main worktree, the permanent pool and everything else as temporary", async () => {
    const { inventory: seatInventory } = inventory({ entries: [...seats, { path: "/p/Worktrees/plan-1", branch: "spike" }] })
    const read = await seatInventory.read("/p/Main")

    expect(read.map(({ name, kind }) => [name, kind])).toEqual([
      ["Main", "main"],
      ["support-agent", "support"],
      ["implementer-1", "permanent"],
      ["implementer-2", "permanent"],
      ["implementer-3", "permanent"],
      ["plan-1", "temporary"],
    ])
  })

  test("never proposes the main, support or permanent seats for disposal", async () => {
    const { inventory: seatInventory } = inventory({ entries: seats })
    const read = await seatInventory.read("/p/Main")

    expect(read.every((seat) => seat.disposable === false)).toBe(true)
    expect(read.map((seat) => seat.blocked_by)).toEqual(["main-worktree", "support-seat", "permanent-seat", "permanent-seat", "permanent-seat"])
  })

  test("disposes a temporary seat only when it is clean, fully merged and unoccupied", async () => {
    const temporary = [
      { path: "/p/Worktrees/temp-clean", branch: "spike/clean" },
      { path: "/p/Worktrees/temp-dirty", branch: "spike/dirty" },
      { path: "/p/Worktrees/temp-unmerged", branch: "spike/unmerged" },
      { path: "/p/Worktrees/temp-busy", branch: "spike/busy" },
    ]
    const { inventory: seatInventory } = inventory({
      entries: [...seats, ...temporary],
      dirty: ["/p/Worktrees/temp-dirty"],
      unmerged: ["/p/Worktrees/temp-unmerged"],
      occupied: ["/p/Worktrees/temp-busy"],
    })
    const disposal = Object.fromEntries((await seatInventory.read("/p/Main")).map((seat) => [seat.name, [seat.disposable, seat.blocked_by]]))

    expect(disposal["temp-clean"]).toEqual([true, null])
    expect(disposal["temp-dirty"]).toEqual([false, "uncommitted-changes"])
    expect(disposal["temp-unmerged"]).toEqual([false, "unmerged-commits"])
    expect(disposal["temp-busy"]).toEqual([false, "occupied-pane"])
  })

  test("reports uncommitted work ahead of unmerged commits so nothing silently outranks a dirty tree", async () => {
    const { inventory: seatInventory } = inventory({
      entries: [...seats, { path: "/p/Worktrees/temp-both", branch: "spike/both" }],
      dirty: ["/p/Worktrees/temp-both"],
      unmerged: ["/p/Worktrees/temp-both"],
    })
    const seat = (await seatInventory.read("/p/Main")).find(({ name }) => name === "temp-both")
    expect(seat).toMatchObject({ disposable: false, blocked_by: "uncommitted-changes" })
  })

  test("treats a detached temporary seat as unmergeable rather than assuming it is safe", async () => {
    const { calls, inventory: seatInventory } = inventory({ entries: [...seats, { path: "/p/Worktrees/temp-detached", branch: null }] })
    const seat = (await seatInventory.read("/p/Main")).find(({ name }) => name === "temp-detached")

    expect(seat).toMatchObject({ branch: null, disposable: false, blocked_by: "detached-head" })
    expect(calls.some((call) => call.includes("cherry") && call.includes("temp-detached"))).toBe(false)
  })

  test("inspects only temporary seats, never running git inside the permanent pool", async () => {
    const { calls, inventory: seatInventory } = inventory({ entries: [...seats, { path: "/p/Worktrees/temp-clean", branch: "spike/clean" }] })
    await seatInventory.read("/p/Main")

    expect(calls.some((call) => call.includes("implementer-"))).toBe(false)
    expect(calls.filter((call) => call.includes("temp-clean")).length).toBe(2)
  })
})
