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
const ORIGIN = NOW - 3_600_000
const since = (elapsed) => NOW - elapsed
const heard = (elapsed) => ({ binding, last_heartbeat_at: since(elapsed), observed_since: ORIGIN })
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
      expect(await health.classify(heard(elapsed))).toEqual({ state: "LIVE", elapsed_ms: elapsed, probe: "SKIPPED", probe_cause: null })
    }
    expect(probed).toEqual([])
  })

  // The third heartbeat is due at exactly 45s, so it has not been missed yet. Only past it are three absent.
  test("treats exactly three heartbeat intervals as still LIVE and the next millisecond as SUSPECTED", async () => {
    const { health, probed } = setup()
    expect(await health.classify(heard(SUSPECTED_AFTER_MS))).toEqual({ state: "LIVE", elapsed_ms: SUSPECTED_AFTER_MS, probe: "SKIPPED", probe_cause: null })
    expect(await health.classify(heard(SUSPECTED_AFTER_MS + 1))).toEqual({ state: "SUSPECTED", elapsed_ms: SUSPECTED_AFTER_MS + 1, probe: "SKIPPED", probe_cause: null })
    expect(probed).toEqual([])
  })

  // The decisive REQUIREMENTS 14.3 clause: UNAVAILABLE needs 60s AND a failed probe, never the silence alone.
  test("keeps a silent but reachable host SUSPECTED at and beyond sixty seconds", async () => {
    const { health, probed } = setup({ probe: async () => true })
    for (const elapsed of [UNAVAILABLE_AFTER_MS, UNAVAILABLE_AFTER_MS + 600_000]) {
      expect(await health.classify(heard(elapsed))).toEqual({ state: "SUSPECTED", elapsed_ms: elapsed, probe: "PASSED", probe_cause: null })
    }
    expect(probed).toHaveLength(2)
  })

  test("declares UNAVAILABLE only when measured silence and a failed probe agree", async () => {
    const { health } = setup({ probe: async () => false })
    expect(await health.classify(heard(UNAVAILABLE_AFTER_MS))).toEqual({ state: "UNAVAILABLE", elapsed_ms: UNAVAILABLE_AFTER_MS, probe: "FAILED", probe_cause: null })
  })

  // A probe that reports unreachable and a probe that blew up are both FAILED, but an operator must be able
  // to tell a dead backend from a defect in our own adapter.
  test("preserves why a probe failed, and distinguishes a reported failure from a thrown one", async () => {
    const reported = setup({ probe: async () => false })
    expect((await reported.health.classify(heard(UNAVAILABLE_AFTER_MS))).probe_cause).toBe(null)
    for (const probe of [async () => { throw new Error("connect ECONNREFUSED") }, () => { throw new Error("connect ECONNREFUSED") }]) {
      const { health } = setup({ probe })
      expect(await health.classify(heard(UNAVAILABLE_AFTER_MS))).toEqual({ state: "UNAVAILABLE", elapsed_ms: UNAVAILABLE_AFTER_MS, probe: "FAILED", probe_cause: "connect ECONNREFUSED" })
    }
  })

  // A port that answers with something other than a verdict is our defect, not evidence about the host.
  test("refuses a probe that resolves with anything but a boolean verdict", async () => {
    for (const probe of [async () => "true", async () => null, async () => undefined, async () => 1, async () => ({ ok: true })]) {
      const { health } = setup({ probe })
      expect(await code(() => health.classify(heard(UNAVAILABLE_AFTER_MS)))).toBe("CT_HOST_HEALTH_INVALID")
    }
  })

  test("probes exactly the bound backend and root, and nothing else", async () => {
    const { health, probed } = setup()
    await health.classify(heard(UNAVAILABLE_AFTER_MS))
    expect(probed).toEqual([{ backend_url: binding.backend_url, root_session_id: binding.root_session_id, worktree: binding.worktree }])
  })

  // REQUIREMENTS 14.3 conditions UNAVAILABLE on sixty seconds of silence, so silence is measured even when
  // there has never been a heartbeat. A host bound moments ago is not silent yet, however the probe answers.
  test("measures silence from the observation origin when the host has never sent a heartbeat", async () => {
    const young = setup({ probe: async () => false })
    expect(await young.health.classify({ binding, last_heartbeat_at: null, observed_since: since(2_000) }))
      .toEqual({ state: "LIVE", elapsed_ms: 2_000, probe: "SKIPPED", probe_cause: null })
    expect(young.probed).toEqual([])
    const old = setup({ probe: async () => false })
    expect(await old.health.classify({ binding, last_heartbeat_at: null, observed_since: since(UNAVAILABLE_AFTER_MS) }))
      .toEqual({ state: "UNAVAILABLE", elapsed_ms: UNAVAILABLE_AFTER_MS, probe: "FAILED", probe_cause: null })
    const reachable = setup({ probe: async () => true })
    expect((await reachable.health.classify({ binding, last_heartbeat_at: null, observed_since: since(UNAVAILABLE_AFTER_MS) })).state).toBe("SUSPECTED")
  })

  // A heartbeat wins over the origin: the origin only answers for a host that has never reported.
  test("measures from the last heartbeat whenever there is one", async () => {
    const { health, probed } = setup()
    expect(await health.classify({ binding, last_heartbeat_at: since(0), observed_since: since(600_000) }))
      .toEqual({ state: "LIVE", elapsed_ms: 0, probe: "SKIPPED", probe_cause: null })
    expect(probed).toEqual([])
  })

  // Clock skew makes elapsed time meaningless, so it fails closed instead of reporting a state it cannot justify.
  test("refuses silence that precedes the clock, without probing", async () => {
    const { health, probed } = setup()
    expect(await code(() => health.classify({ binding, last_heartbeat_at: NOW + 1, observed_since: ORIGIN }))).toBe("CT_HOST_HEALTH_INVALID")
    expect(await code(() => health.classify({ binding, last_heartbeat_at: null, observed_since: NOW + 1 }))).toBe("CT_HOST_HEALTH_INVALID")
    expect(probed).toEqual([])
  })

  test("refuses an unusable clock, whether it answers wrongly or throws", async () => {
    for (const clock of [() => "now", () => 0, () => 1.5, () => { throw new Error("no clock") }]) {
      const { health, probed } = setup({ clock })
      expect(await code(() => health.classify(heard(0)))).toBe("CT_HOST_HEALTH_INVALID")
      expect(probed).toEqual([])
    }
  })

  test("refuses a foreign binding shape, a non-integer heartbeat or a missing observation origin", async () => {
    const { health } = setup()
    const invalid = [
      { ...heard(0), binding: { ...binding, extra: 1 } },
      { ...heard(0), binding: { ...binding, agent: "child" } },
      { ...heard(0), binding: { ...binding, backend_url: "http://10.0.0.1:4096" } },
      { ...heard(0), binding: { ...binding, root_session_id: "ses_short" } },
      { ...heard(0), last_heartbeat_at: 1.5 },
      { ...heard(0), last_heartbeat_at: "1700000000000" },
      { ...heard(0), last_heartbeat_at: undefined },
      { ...heard(0), observed_since: null },
      { ...heard(0), observed_since: 0 },
      { binding, last_heartbeat_at: NOW },
      { ...heard(0), extra: true },
      undefined,
    ]
    for (const input of invalid) expect(await code(() => health.classify(input))).toBe("CT_HOST_HEALTH_INVALID")
  })

  test("returns a frozen verdict that never names a view, pane or terminal", async () => {
    const { health } = setup()
    const verdict = await health.classify(heard(0))
    expect(Object.isFrozen(verdict)).toBe(true)
    expect(Object.keys(verdict).sort()).toEqual(["elapsed_ms", "probe", "probe_cause", "state"])
  })
})
