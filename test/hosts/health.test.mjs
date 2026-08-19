import { describe, expect, test } from "bun:test"

import { HEARTBEAT_INTERVAL_MS, SUSPECTED_AFTER_MS, UNAVAILABLE_AFTER_MS, createHostHealth } from "../../hosts/health.mjs"
import { ROOT_AGENT } from "../../hosts/root-identity.mjs"

const sessionId = `ses_${"a".repeat(26)}`
const binding = Object.freeze({
  agent: ROOT_AGENT, assignment_ref: "assignment-a", backend_pid: 4321,
  backend_url: "http://127.0.0.1:4096", host_epoch: 3, project_id: "project-a",
  root_session_id: sessionId, worktree: "/work/a",
})
const NOW = 1_700_000_000_000
const since = (elapsed) => NOW - elapsed
const code = async (operation) => { try { await operation() } catch (error) { return error.code }; return null }
const setup = ({ clock = () => NOW, probe = async () => true } = {}) => {
  const probed = []
  const health = createHostHealth({ clock, probe: (input) => { probed.push(input); return probe(input) } })
  return { health, probed }
}

describe("Bound host liveness classification", () => {
  test("publishes the versioned REQUIREMENTS 14.3 defaults", () => {
    expect(HEARTBEAT_INTERVAL_MS).toBe(15_000)
    expect(SUSPECTED_AFTER_MS).toBe(45_000)
    expect(UNAVAILABLE_AFTER_MS).toBe(60_000)
  })

  test("requires both ports", () => {
    for (const ports of [undefined, {}, { clock: () => NOW }, { probe: async () => true }, { clock: NOW, probe: async () => true }, { clock: () => NOW, probe: true }]) {
      expect(() => createHostHealth(ports)).toThrow(TypeError)
    }
  })

  test("stays LIVE while heartbeats arrive, and never probes a live host", async () => {
    const { health, probed } = setup()
    for (const elapsed of [0, 1, HEARTBEAT_INTERVAL_MS, SUSPECTED_AFTER_MS - 1]) {
      expect(await health.classify({ binding, last_heartbeat_at: since(elapsed) })).toEqual({ state: "LIVE", elapsed_ms: elapsed, probe: "SKIPPED" })
    }
    expect(probed).toEqual([])
  })

  // The third heartbeat is due at exactly 45s, so it has not been missed yet. Only past it are three absent.
  test("treats exactly three heartbeat intervals as still LIVE and the next millisecond as SUSPECTED", async () => {
    const { health, probed } = setup()
    expect(await health.classify({ binding, last_heartbeat_at: since(SUSPECTED_AFTER_MS) })).toEqual({ state: "LIVE", elapsed_ms: SUSPECTED_AFTER_MS, probe: "SKIPPED" })
    expect(await health.classify({ binding, last_heartbeat_at: since(SUSPECTED_AFTER_MS + 1) })).toEqual({ state: "SUSPECTED", elapsed_ms: SUSPECTED_AFTER_MS + 1, probe: "SKIPPED" })
    expect(probed).toEqual([])
  })

  // The decisive REQUIREMENTS 14.3 clause: UNAVAILABLE needs 60s AND a failed probe, never the silence alone.
  test("keeps a silent but reachable host SUSPECTED at and beyond sixty seconds", async () => {
    const { health, probed } = setup({ probe: async () => true })
    for (const elapsed of [UNAVAILABLE_AFTER_MS, UNAVAILABLE_AFTER_MS + 600_000]) {
      expect(await health.classify({ binding, last_heartbeat_at: since(elapsed) })).toEqual({ state: "SUSPECTED", elapsed_ms: elapsed, probe: "PASSED" })
    }
    expect(probed).toHaveLength(2)
  })

  test("declares UNAVAILABLE only when silence and a failed probe agree", async () => {
    for (const probe of [async () => false, async () => { throw new Error("unreachable") }, () => { throw new Error("sync") }]) {
      const { health } = setup({ probe })
      expect(await health.classify({ binding, last_heartbeat_at: since(UNAVAILABLE_AFTER_MS) })).toEqual({ state: "UNAVAILABLE", elapsed_ms: UNAVAILABLE_AFTER_MS, probe: "FAILED" })
    }
  })

  // A port that answers with something other than a verdict is our defect, not evidence about the host.
  test("refuses a probe that resolves with anything but a boolean verdict", async () => {
    for (const probe of [async () => "true", async () => null, async () => undefined, async () => 1, async () => ({ ok: true })]) {
      const { health } = setup({ probe })
      expect(await code(() => health.classify({ binding, last_heartbeat_at: since(UNAVAILABLE_AFTER_MS) }))).toBe("CT_HOST_HEALTH_INVALID")
    }
  })

  test("probes exactly the bound backend and root, and nothing else", async () => {
    const { health, probed } = setup()
    await health.classify({ binding, last_heartbeat_at: since(UNAVAILABLE_AFTER_MS) })
    expect(probed).toEqual([{ backend_url: binding.backend_url, root_session_id: binding.root_session_id, worktree: binding.worktree }])
  })

  // A host we have never heard from is not evidence of death; the probe still decides.
  test("treats an absent heartbeat as maximal silence and lets the probe decide", async () => {
    const passing = setup({ probe: async () => true })
    expect(await passing.health.classify({ binding, last_heartbeat_at: null })).toEqual({ state: "SUSPECTED", elapsed_ms: null, probe: "PASSED" })
    const failing = setup({ probe: async () => false })
    expect(await failing.health.classify({ binding, last_heartbeat_at: null })).toEqual({ state: "UNAVAILABLE", elapsed_ms: null, probe: "FAILED" })
  })

  // Clock skew makes elapsed time meaningless, so it fails closed instead of reporting a state it cannot justify.
  test("refuses a heartbeat from the future without probing", async () => {
    const { health, probed } = setup()
    expect(await code(() => health.classify({ binding, last_heartbeat_at: NOW + 1 }))).toBe("CT_HOST_HEALTH_INVALID")
    expect(probed).toEqual([])
  })

  test("refuses an unusable clock, foreign binding shape, or non-integer heartbeat", async () => {
    const { health } = setup({ clock: () => "now" })
    expect(await code(() => health.classify({ binding, last_heartbeat_at: NOW }))).toBe("CT_HOST_HEALTH_INVALID")
    const { health: sane } = setup()
    const invalid = [
      { binding: { ...binding, extra: 1 }, last_heartbeat_at: NOW },
      { binding: { ...binding, agent: "child" }, last_heartbeat_at: NOW },
      { binding: { ...binding, backend_url: "http://10.0.0.1:4096" }, last_heartbeat_at: NOW },
      { binding: { ...binding, root_session_id: "ses_short" }, last_heartbeat_at: NOW },
      { binding, last_heartbeat_at: 1.5 },
      { binding, last_heartbeat_at: "1700000000000" },
      { binding, last_heartbeat_at: undefined },
      { binding, last_heartbeat_at: NOW, extra: true },
      { last_heartbeat_at: NOW },
      undefined,
    ]
    for (const input of invalid) expect(await code(() => sane.classify(input))).toBe("CT_HOST_HEALTH_INVALID")
  })

  test("returns a frozen verdict that never names a view, pane or terminal", async () => {
    const { health } = setup()
    const verdict = await health.classify({ binding, last_heartbeat_at: since(0) })
    expect(Object.isFrozen(verdict)).toBe(true)
    expect(Object.keys(verdict).sort()).toEqual(["elapsed_ms", "probe", "state"])
  })
})
