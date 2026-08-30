import { basename } from "node:path"

import { PERMANENT_SEATS } from "../hosts/herdr-topology.mjs"

// A seat outside the approved pool is legitimate but temporary: it must not accumulate. Disposal is
// irreversible, so this module never decides to delete — it decides whether deleting COULD be safe,
// and names the exact reason when it could not. Uncommitted work outranks every other blocker
// because it is the only state git cannot recover on its own.
export { PERMANENT_SEATS }
export const SUPPORT_SEAT = "support-agent"

const parseWorktrees = (porcelain) => porcelain.split("\n\n").flatMap((block) => {
  const path = /^worktree (.+)$/m.exec(block)?.[1]
  if (!path) return []
  return [{ path, branch: /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? null }]
})
const classify = (name, isMain) => isMain ? "main"
  : name === SUPPORT_SEAT ? "support"
  : PERMANENT_SEATS.includes(name) ? "permanent" : "temporary"
const PROTECTED = Object.freeze({ main: "main-worktree", support: "support-seat", permanent: "permanent-seat" })

export const createSeatInventory = ({ git, trunk = "master", readOccupied = () => [] } = {}) => {
  if (typeof git !== "function") throw new TypeError("A git port is required")
  return Object.freeze({
    async read(mainPath) {
      const worktrees = parseWorktrees(await git(["worktree", "list", "--porcelain"]))
      const occupied = new Set(await readOccupied())
      return worktrees.map(({ path, branch }) => {
        const name = basename(path), kind = classify(name, path === mainPath)
        const seat = { name, path, branch, kind, disposable: false, blocked_by: PROTECTED[kind] ?? null }
        if (kind !== "temporary") return seat
        // Only temporary seats are inspected: a permanent seat is never a disposal candidate, so
        // running git inside it would be cost without a decision to inform.
        if (branch === null) return { ...seat, blocked_by: "detached-head" }
        if ((git(["-C", path, "status", "--porcelain"]) ?? "").trim() !== "") return { ...seat, blocked_by: "uncommitted-changes" }
        if (occupied.has(path)) return { ...seat, blocked_by: "occupied-pane" }
        if ((git(["-C", path, "cherry", trunk, branch]) ?? "").trim() !== "") return { ...seat, blocked_by: "unmerged-commits" }
        return { ...seat, disposable: true, blocked_by: null }
      })
    },
  })
}
