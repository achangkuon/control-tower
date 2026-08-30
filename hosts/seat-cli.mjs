import { spawnSync } from "node:child_process"

import { createHerdrTopology } from "./herdr-topology.mjs"
import { createSeatInventory } from "../workspace/seat-inventory.mjs"
import { createSlotPool } from "../workspace/slots.mjs"

// `torre asiento` is the Tower-off door to Tower-owned seat rules. It never reads `ACTIVE`, so it
// works while the Tower is deliberately down during its own implementation, and it shares
// `hosts/herdr-topology.mjs` with `hosts/production-provider.mjs` so turning the Tower on changes
// who calls the rule, never the rule.
const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const USAGE = "Usage: torre asiento [list | pool | provisionar | abrir <asiento> | asignar <flags> | limpiar [--confirmar]]"
const COMMANDS = ["list", "pool", "provisionar", "abrir", "asignar", "limpiar"]
const flags = (rest) => {
  const parsed = {}
  for (let index = 0; index < rest.length; index += 2) {
    if (!rest[index]?.startsWith("--") || rest[index + 1] === undefined) fail("CT_SEAT_REJECTED", USAGE)
    parsed[rest[index].slice(2).replaceAll("-", "_")] = rest[index + 1]
  }
  return parsed
}

export const runSeatCli = async (args, { git, herdr, mainPath } = {}) => {
  if ([git, herdr].some((port) => typeof port !== "function") || typeof mainPath !== "string") throw new TypeError("Seat CLI ports are required")
  const [command = "list", ...rest] = args
  if (!COMMANDS.includes(command)) fail("CT_SEAT_REJECTED", USAGE)

  // The pool is a git fact. These three never consult Herdr, so a dead control socket cannot
  // stop Main from seeing free seats or binding one.
  if (["pool", "provisionar", "asignar"].includes(command)) {
    const pool = createSlotPool({ git })
    if (command === "pool") return Object.freeze({ operation: "pool", seats: pool.list(mainPath) })
    if (command === "provisionar") return Object.freeze({ operation: "provisionar", ...pool.ensure(mainPath) })
    return Object.freeze({ operation: "asignar", ...pool.assign(mainPath, flags(rest)) })
  }

  const topology = createHerdrTopology({ run: herdr })
  let agents = null, unavailable = null
  try { agents = await topology.readAgentsTab() } catch (error) { unavailable = error.code ?? "CT_TOPOLOGY_UNAVAILABLE" }
  const occupied = agents?.panes.map(({ cwd }) => cwd) ?? []
  const seats = await createSeatInventory({ git, readOccupied: () => occupied }).read(mainPath)

  if (command === "list") return Object.freeze({ operation: "list", tab: agents?.tab_id ?? null, topology: unavailable ?? "ok", seats })

  if (command === "abrir") {
    const seat = seats.find(({ name }) => name === rest[0])
    if (!seat) fail("CT_SEAT_REJECTED", `Unknown seat: ${rest[0] ?? "(none)"}`)
    if (seat.kind === "main" || seat.kind === "support") fail("CT_SEAT_REJECTED", `${seat.name} is not a worker seat`)
    if (unavailable) fail(unavailable, "Herdr control is unavailable; seat topology cannot be verified")
    if (occupied.includes(seat.path)) fail("CT_SEAT_REJECTED", `${seat.name} already holds a pane in AGENTES`)
    return Object.freeze({ operation: "abrir", seat: seat.name, temporary: seat.kind === "temporary", ...(await topology.openSeatPane({ cwd: seat.path })) })
  }

  // Occupancy is a disposal input, so an unreadable topology fails closed instead of deleting a
  // seat whose agent simply could not be seen.
  if (unavailable) fail(unavailable, "Seat occupancy cannot be verified; refusing to dispose")
  const temporary = seats.filter(({ kind }) => kind === "temporary")
  const refused = temporary.filter(({ disposable }) => !disposable).map(({ name, path, blocked_by }) => ({ name, path, blocked_by }))
  const disposable = temporary.filter(({ disposable }) => disposable)
  if (!rest.includes("--confirmar")) {
    return Object.freeze({ operation: "limpiar", dry_run: true, would_remove: disposable.map(({ name }) => name), refused })
  }
  const removed = []
  for (const seat of disposable) { await git(["worktree", "remove", seat.path]); removed.push(seat.name) }
  return Object.freeze({ operation: "limpiar", dry_run: false, removed, refused })
}

const run = (executable) => (args) => {
  const result = spawnSync(executable, args, { encoding: "utf8" })
  if (result.status !== 0) fail("CT_SEAT_UNAVAILABLE", `\`${executable} ${args.join(" ")}\` failed`)
  return result.stdout
}

if (import.meta.main) {
  const git = run("git"), herdr = (args) => JSON.parse(run("herdr")(args))
  try {
    // Git always lists the main worktree first, so the pool root needs no configuration.
    const mainPath = /^worktree (.+)$/m.exec(git(["worktree", "list", "--porcelain"]))?.[1]
    if (!mainPath) fail("CT_SEAT_UNAVAILABLE", "This directory is not inside a git worktree")
    console.log(JSON.stringify(await runSeatCli(Bun.argv.slice(2), { git, herdr, mainPath })))
  } catch (error) {
    console.error(`${error.code ?? "CT_SEAT_REJECTED"}: ${error.message}`)
    process.exitCode = 1
  }
}
