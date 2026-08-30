import { isAbsolute } from "node:path"

// Decision: the seat topology is a lock, not a reminder. Every rule that used to live in
// `skills/torre-control/SKILL.md` prose — which tab a worker is born in and how the panes are
// laid out — is enforced here, so a compacted orchestrator cannot forget it. This module never
// reads Tower `ACTIVE`: the same enforcement serves the manual seat CLI while the Tower is off
// and `hosts/production-provider.mjs` once it is on.
export const AGENTS_TAB_LABEL = "AGENTES"
export const SEAT_SPLIT_DIRECTION = "right"
export const PERMANENT_SEATS = Object.freeze(["implementer-1", "implementer-2", "implementer-3"])

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const identifier = (value) => typeof value === "string" && value.length > 0 && !value.includes("\0")
const seatPath = (value) => identifier(value) && isAbsolute(value)
const projected = ({ pane_id, cwd, foreground_cwd }) => ({ pane_id, cwd, foreground_cwd })
const byPaneId = (left, right) => (left.pane_id < right.pane_id ? -1 : left.pane_id > right.pane_id ? 1 : 0)

export const createHerdrTopology = ({ run } = {}) => {
  if (typeof run !== "function") throw new TypeError("A Herdr control port is required")
  const call = async (args) => {
    let answer
    try { answer = await run(args) } catch { fail("CT_TOPOLOGY_UNAVAILABLE", `Herdr control did not answer \`${args.join(" ")}\``) }
    const result = answer?.result
    if (!result || typeof result !== "object") fail("CT_TOPOLOGY_UNAVAILABLE", `Herdr control returned no result for \`${args.join(" ")}\``)
    return result
  }
  const listing = async (args, key) => {
    const values = (await call(args))[key]
    if (!Array.isArray(values)) fail("CT_TOPOLOGY_UNAVAILABLE", `Herdr control returned no ${key}`)
    return values
  }
  const agentsTabId = async () => {
    const matches = (await listing(["tab", "list"], "tabs")).filter((tab) => tab?.label === AGENTS_TAB_LABEL)
    if (matches.length > 1) fail("CT_TOPOLOGY_REJECTED", `More than one \`${AGENTS_TAB_LABEL}\` tab is open; topology is ambiguous`)
    return matches.length === 1 && identifier(matches[0].tab_id) ? matches[0].tab_id : null
  }
  const panesOf = async (tabId) => (await listing(["pane", "list"], "panes")).filter((pane) => pane?.tab_id === tabId).sort(byPaneId)

  return Object.freeze({
    async readAgentsTab() {
      const tabId = await agentsTabId()
      return { tab_id: tabId, panes: tabId ? (await panesOf(tabId)).map(projected) : [] }
    },
    async openSeatPane({ cwd } = {}) {
      if (!seatPath(cwd)) fail("CT_TOPOLOGY_REJECTED", "A seat pane needs an absolute worktree path")
      let tabId = await agentsTabId(), record
      if (tabId === null) {
        // A fresh tab is born holding this seat, so the first worker does not leave an idle shell
        // column beside the three approved seats.
        const created = (await call(["tab", "create", "--label", AGENTS_TAB_LABEL, "--cwd", cwd, "--no-focus"])).tab
        if (!identifier(created?.tab_id)) fail("CT_TOPOLOGY_UNAVAILABLE", `Herdr did not create the \`${AGENTS_TAB_LABEL}\` tab`)
        tabId = created.tab_id
        const own = await panesOf(tabId)
        if (own.length !== 1) fail("CT_TOPOLOGY_REJECTED", `A fresh \`${AGENTS_TAB_LABEL}\` tab must hold exactly one pane`)
        record = own[0]
      } else {
        const anchor = (await panesOf(tabId)).at(-1)
        if (!anchor || !identifier(anchor.pane_id)) fail("CT_TOPOLOGY_REJECTED", `The \`${AGENTS_TAB_LABEL}\` tab has no pane to split`)
        const split = (await call(["pane", "split", anchor.pane_id, "--direction", SEAT_SPLIT_DIRECTION, "--cwd", cwd, "--no-focus"])).pane
        if (!identifier(split?.pane_id)) fail("CT_TOPOLOGY_UNAVAILABLE", "Herdr did not create a fresh seat pane")
        record = (await panesOf(tabId)).find((pane) => pane.pane_id === split.pane_id)
          ?? { pane_id: split.pane_id, tab_id: null, cwd: null, foreground_cwd: null }
      }
      if (record.tab_id !== tabId || record.cwd !== cwd || record.foreground_cwd !== cwd) {
        try { await call(["pane", "close", record.pane_id]) } catch {}
        fail("CT_TOPOLOGY_REJECTED", `Seat pane ${record.pane_id} did not read back inside \`${AGENTS_TAB_LABEL}\` at ${cwd}`)
      }
      return Object.freeze({ tab_id: tabId, pane_id: record.pane_id })
    },
  })
}
