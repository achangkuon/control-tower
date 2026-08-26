import { describe, expect, test } from "bun:test"

import { createOpenCodeBackendHost } from "../../hosts/opencode-server.mjs"
import { ROOT_AGENT } from "../../hosts/root-identity.mjs"

const sessionId = (letter) => `ses_${letter.repeat(26)}`
const request = Object.freeze({ assignment_ref: "assignment-a", brief: "Approved work only", brief_ref: "briefs/a.json", host_epoch: 3, project_id: "project-a", worktree: "/work/a" })
const other = Object.freeze({ assignment_ref: "assignment-b", brief: "Other approved work", brief_ref: "briefs/b.json", host_epoch: 3, project_id: "project-a", worktree: "/work/b" })
const code = async (operation) => { try { await operation() } catch (error) { return error.code }; return null }

const ports = (overrides = {}) => {
  const spawned = [], stopped = []
  let seq = 0
  return {
    spawned, stopped,
    randomSecret: () => `secret-${(seq += 1).toString().padStart(48, "0")}`,
    spawn: ({ worktree, secret }) => {
      spawned.push({ worktree, secret })
      return { pid: 4300 + seq, url: `http://127.0.0.1:${4096 + seq}`, stop: () => stopped.push(worktree) }
    },
    createRoot: ({ worktree }) => ({ agent: ROOT_AGENT, id: sessionId(worktree.endsWith("b") ? "b" : "a"), parentID: null }),
    admitBrief: ({ root_session_id, brief_ref, brief }) => ({ root_session_id, brief_ref, brief }),
    credentialChannel: { issue: () => `ref-${seq}-${"r".repeat(32)}`, revoke: () => true },
    ...overrides,
  }
}

describe("Main-owned OpenCode backend host", () => {
  test("starts one isolated backend per worktree and returns a bindable record", async () => {
    const host = createOpenCodeBackendHost(ports())
    const started = await host.start(request)
    expect(Object.keys(started).sort()).toEqual(["assignment_ref", "backend_pid", "backend_url", "credential_ref", "host_epoch", "project_id", "root_identity", "worktree"])
    expect(started.backend_url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    expect(started.backend_pid).toBeGreaterThan(0)
    expect(started.root_identity).toEqual({ agent: ROOT_AGENT, root_session_id: sessionId("a") })
    expect(Object.isFrozen(started)).toBe(true)
  })

  test("never shares a process, port, secret or root across worktrees", async () => {
    const wiring = ports()
    const host = createOpenCodeBackendHost(wiring)
    const a = await host.start(request), b = await host.start(other)
    for (const key of ["backend_pid", "backend_url", "worktree", "assignment_ref"]) expect(a[key]).not.toBe(b[key])
    expect(a.root_identity.root_session_id).not.toBe(b.root_identity.root_session_id)
    expect(wiring.spawned[0].secret).not.toBe(wiring.spawned[1].secret)
    expect(wiring.spawned.map(({ worktree }) => worktree)).toEqual(["/work/a", "/work/b"])
  })

  test("refuses a second backend for a worktree or assignment already owned", async () => {
    const host = createOpenCodeBackendHost(ports())
    await host.start(request)
    expect(await code(() => host.start(request))).toBe("CT_BACKEND_EXISTS")
    expect(await code(() => host.start({ ...request, assignment_ref: "assignment-c" }))).toBe("CT_BACKEND_EXISTS")
    expect(await code(() => host.start({ ...other, assignment_ref: request.assignment_ref }))).toBe("CT_BACKEND_EXISTS")
  })

  test("rejects a backend the runtime reported as shared, foreign or off loopback", async () => {
    for (const spawn of [
      () => ({ pid: 4301, url: "http://10.0.0.5:4096", stop: () => {} }),
      () => ({ pid: 4301, url: "http://0.0.0.0:4096", stop: () => {} }),
      () => ({ pid: 4301, url: "https://127.0.0.1:4096", stop: () => {} }),
      () => ({ pid: 4301, url: "http://127.0.0.1", stop: () => {} }),
      () => ({ pid: 4301, url: "--help", stop: () => {} }),
      () => ({ pid: 0, url: "http://127.0.0.1:4096", stop: () => {} }),
      () => ({ pid: -1, url: "http://127.0.0.1:4096", stop: () => {} }),
      () => ({ pid: 1.5, url: "http://127.0.0.1:4096", stop: () => {} }),
      () => ({ pid: 4301, url: "http://127.0.0.1:4096" }),
      () => ({ pid: 4301, url: "http://127.0.0.1:4096", stop: "close" }),
      () => null,
      () => { throw new Error("spawn failed") },
    ]) {
      const host = createOpenCodeBackendHost(ports({ spawn }))
      expect(await code(() => host.start(request))).toBe("CT_BACKEND_REJECTED")
      expect(host.owns(request.worktree)).toBe(false)
    }
  })

  test("rejects a weak or reused secret before any process is spawned", async () => {
    for (const randomSecret of [() => "short", () => "", () => null, () => "a".repeat(4097), () => 42]) {
      const wiring = ports({ randomSecret })
      const host = createOpenCodeBackendHost(wiring)
      expect(await code(() => host.start(request))).toBe("CT_BACKEND_REJECTED")
      expect(wiring.spawned).toEqual([])
    }
    const fixed = ports({ randomSecret: () => `secret-${"z".repeat(48)}` })
    const host = createOpenCodeBackendHost(fixed)
    await host.start(request)
    expect(await code(() => host.start(other))).toBe("CT_BACKEND_REJECTED")
  })

  test("refuses a root the backend did not prove parentless, and stops the backend it started", async () => {
    for (const createRoot of [
      () => ({ agent: ROOT_AGENT, id: sessionId("a"), parentID: sessionId("z") }),
      () => ({ agent: "build", id: sessionId("a"), parentID: null }),
      () => ({ agent: ROOT_AGENT, id: "root-a", parentID: null }),
      () => ({ agent: ROOT_AGENT, id: sessionId("a") }),
      () => ({ agent: ROOT_AGENT, root_session_id: sessionId("a") }),
      () => null,
      () => { throw new Error("root failed") },
    ]) {
      const wiring = ports({ createRoot })
      const host = createOpenCodeBackendHost(wiring)
      expect(await code(() => host.start(request))).toBe("CT_BACKEND_REJECTED")
      expect(wiring.stopped).toEqual(["/work/a"])
      expect(host.owns(request.worktree)).toBe(false)
    }
  })

  test("publishes ownership only after exact brief admission", async () => {
    let settle
    const wiring = ports({ admitBrief: (input) => new Promise((resolve) => { settle = () => resolve({ root_session_id: input.root_session_id, brief_ref: input.brief_ref, brief: input.brief }) }) })
    const host = createOpenCodeBackendHost(wiring), starting = host.start(request)
    await Promise.resolve(); await Promise.resolve()
    expect(host.owns(request.worktree)).toBe(false)
    settle(); await starting
    expect(host.owns(request.worktree)).toBe(true)
  })

  test("fails closed and cleans up on rejected or drifted admission receipts", async () => {
    for (const admitBrief of [
      () => ({ root_session_id: sessionId("b"), brief_ref: request.brief_ref, brief: request.brief }),
      () => ({ root_session_id: sessionId("a"), brief_ref: "briefs/foreign.json", brief: request.brief }),
      () => ({ root_session_id: sessionId("a"), brief_ref: request.brief_ref, brief: "drift" }),
      () => ({ root_session_id: sessionId("a"), brief_ref: request.brief_ref, brief: request.brief, extra: true }),
      () => null,
      () => { throw Object.assign(new Error("4xx, 5xx, network or timeout"), { code: "CT_BACKEND_REJECTED" }) },
    ]) {
      const wiring = ports({ admitBrief }), host = createOpenCodeBackendHost(wiring)
      expect(await code(() => host.start(request))).toBe("CT_BACKEND_REJECTED")
      expect(wiring.stopped).toEqual([request.worktree])
      expect(host.owns(request.worktree)).toBe(false)
    }
  })

  test("does not let admission cleanup failure mask the rejection", async () => {
    const wiring = ports({
      admitBrief: () => { throw Object.assign(new Error("network"), { code: "CT_BACKEND_REJECTED" }) },
      spawn: ({ worktree }) => ({ pid: 4301, url: "http://127.0.0.1:4097", stop: () => { wiring.stopped.push(worktree); throw new Error("cleanup") } }),
    })
    expect(await code(() => createOpenCodeBackendHost(wiring).start(request))).toBe("CT_BACKEND_REJECTED")
    expect(wiring.stopped).toEqual([request.worktree])
  })

  test("creates the root against its own backend, never a caller supplied endpoint", async () => {
    const seen = []
    const wiring = ports({ createRoot: (input) => { seen.push(input); return { agent: ROOT_AGENT, id: sessionId("a"), parentID: null } } })
    const host = createOpenCodeBackendHost(wiring)
    const started = await host.start(request)
    expect(seen).toEqual([{ secret: wiring.spawned[0].secret, url: started.backend_url, worktree: "/work/a" }])
  })

  test("exposes no view, pane or terminal surface at all", async () => {
    const host = createOpenCodeBackendHost(ports())
    expect(Object.isFrozen(host)).toBe(true)
    expect(Object.keys(host).sort()).toEqual(["owns", "start", "stop"])
    expect(JSON.stringify(Object.keys(host))).not.toMatch(/pane|view|terminal|herdr|attach/i)
  })

  // Decision 39: the view is not the root. Nothing a view can do reaches the backend, because the
  // backend host has no view surface to reach through — losing a pane cannot express a stop here.
  test("keeps the backend alive and owned when a visible view would have died", async () => {
    const wiring = ports()
    const host = createOpenCodeBackendHost(wiring)
    const started = await host.start(request)
    // The only way to stop a backend is to name the worktree it belongs to. A view has no such handle,
    // so its death is not expressible here — which is exactly why it cannot take the backend with it.
    expect(host.owns(request.worktree)).toBe(true)
    expect(wiring.stopped).toEqual([])
    expect(await code(() => host.stop(started.backend_url))).toBe("CT_BACKEND_REJECTED")
    expect(await code(() => host.stop(String(started.backend_pid)))).toBe("CT_BACKEND_REJECTED")
    expect(host.owns(request.worktree)).toBe(true)
    expect(wiring.stopped).toEqual([])
  })

  test("stops only a backend it owns and revokes its credential exactly once", async () => {
    const revoked = [], wiring = ports({ credentialChannel: { issue: () => "r".repeat(43), revoke: (...args) => { revoked.push(args); return true } } })
    const host = createOpenCodeBackendHost(wiring)
    await host.start(request)
    expect(host.stop(request.worktree)).toBe(true)
    expect(wiring.stopped).toEqual(["/work/a"])
    expect(revoked).toEqual([["r".repeat(43), "/work/a"]])
    expect(host.owns(request.worktree)).toBe(false)
    for (const worktree of [request.worktree, "/work/unknown", "--help", "", null]) {
      expect(await code(() => host.stop(worktree))).toBe("CT_BACKEND_REJECTED")
    }
    expect(wiring.stopped).toEqual(["/work/a"])
  })

  test("retains ownership to retry a failed credential revocation", async () => {
    const revoked = []
    let attempts = 0
    const wiring = ports({
      credentialChannel: { issue: () => "r".repeat(43), revoke: (...args) => { revoked.push(args); if (++attempts === 1) throw new Error("revoke failed"); return true } },
      spawn: ({ worktree }) => ({ pid: 4301, url: "http://127.0.0.1:4097", stop: () => { wiring.stopped.push(worktree); throw new Error("already stopped") } }),
    })
    const host = createOpenCodeBackendHost(wiring)
    await host.start(request)
    expect(() => host.stop(request.worktree)).toThrow("revoke failed")
    expect(host.owns(request.worktree)).toBe(true)
    expect(wiring.stopped).toEqual([request.worktree])
    expect(() => host.stop(request.worktree)).toThrow("already stopped")
    expect(host.owns(request.worktree)).toBe(false)
    expect(revoked).toEqual([["r".repeat(43), "/work/a"], ["r".repeat(43), "/work/a"]])
    expect(wiring.stopped).toEqual([request.worktree, request.worktree])
  })

  test("rejects an ambiguous start request before spawning anything", async () => {
    const wiring = ports()
    const host = createOpenCodeBackendHost(wiring)
    const { host_epoch, ...missing } = request
    for (const invalid of [null, undefined, "", [request], missing, { ...request, extra: true }, { ...request, brief: "" }, { ...request, brief: "bad\0brief" }, { ...request, brief_ref: "" }, { ...request, brief_ref: "bad\0ref" }, { ...request, worktree: "relative" }, { ...request, worktree: "" }, { ...request, assignment_ref: "../escape" }, { ...request, assignment_ref: "--help" }, { ...request, project_id: "" }, { ...request, host_epoch: 0 }, { ...request, host_epoch: -1 }]) {
      expect(await code(() => host.start(invalid))).toBe("CT_BACKEND_REJECTED")
    }
    expect(wiring.spawned).toEqual([])
  })

  test("cleans up when credential isolation fails before publishing ownership", async () => {
    const wiring = ports({ credentialChannel: { issue: () => { throw new Error("unsafe channel") }, revoke: () => true } })
    const host = createOpenCodeBackendHost(wiring)
    expect(await code(() => host.start(request))).toBe("CT_BACKEND_REJECTED")
    expect(wiring.stopped).toEqual([request.worktree])
    expect(host.owns(request.worktree)).toBe(false)
  })

  test("requires every port and grants no default wiring", async () => {
    const full = ports()
    for (const key of ["spawn", "randomSecret", "createRoot", "admitBrief", "credentialChannel"]) {
      const partial = { ...full }
      delete partial[key]
      expect(() => createOpenCodeBackendHost(partial)).toThrow(TypeError)
    }
    expect(() => createOpenCodeBackendHost()).toThrow(TypeError)
    for (const port of [null, "spawn", 42, {}, []]) {
      expect(() => createOpenCodeBackendHost({ ...full, spawn: port })).toThrow(TypeError)
    }
  })

  test("refuses a spawned backend announcing a port that cannot exist", async () => {
    for (const port of [65536, 99999]) {
      const wiring = ports({ spawn: ({ worktree }) => ({ pid: 4321, url: `http://127.0.0.1:${port}`, stop: () => wiring.stopped.push(worktree) }) })
      expect(await code(() => createOpenCodeBackendHost(wiring).start(request))).toBe("CT_BACKEND_REJECTED")
    }
  })
})
