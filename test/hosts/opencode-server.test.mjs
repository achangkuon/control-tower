import { describe, expect, test } from "bun:test"

import { createOpenCodeBackendHost } from "../../hosts/opencode-server.mjs"
import { ROOT_AGENT } from "../../hosts/root-identity.mjs"

const sessionId = (letter) => `ses_${letter.repeat(26)}`
const request = Object.freeze({ assignment_ref: "assignment-a", host_epoch: 3, project_id: "project-a", worktree: "/work/a" })
const other = Object.freeze({ assignment_ref: "assignment-b", host_epoch: 3, project_id: "project-a", worktree: "/work/b" })
const code = (operation) => { try { operation() } catch (error) { return error.code }; return null }

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
    ...overrides,
  }
}

describe("Main-owned OpenCode backend host", () => {
  test("starts one isolated backend per worktree and returns a bindable record", () => {
    const host = createOpenCodeBackendHost(ports())
    const started = host.start(request)
    expect(Object.keys(started).sort()).toEqual(["assignment_ref", "backend_pid", "backend_url", "host_epoch", "project_id", "root_identity", "worktree"])
    expect(started.backend_url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    expect(started.backend_pid).toBeGreaterThan(0)
    expect(started.root_identity).toEqual({ agent: ROOT_AGENT, root_session_id: sessionId("a") })
    expect(Object.isFrozen(started)).toBe(true)
  })

  test("never shares a process, port, secret or root across worktrees", () => {
    const wiring = ports()
    const host = createOpenCodeBackendHost(wiring)
    const a = host.start(request), b = host.start(other)
    for (const key of ["backend_pid", "backend_url", "worktree", "assignment_ref"]) expect(a[key]).not.toBe(b[key])
    expect(a.root_identity.root_session_id).not.toBe(b.root_identity.root_session_id)
    expect(wiring.spawned[0].secret).not.toBe(wiring.spawned[1].secret)
    expect(wiring.spawned.map(({ worktree }) => worktree)).toEqual(["/work/a", "/work/b"])
  })

  test("refuses a second backend for a worktree or assignment already owned", () => {
    const host = createOpenCodeBackendHost(ports())
    host.start(request)
    expect(code(() => host.start(request))).toBe("CT_BACKEND_EXISTS")
    expect(code(() => host.start({ ...request, assignment_ref: "assignment-c" }))).toBe("CT_BACKEND_EXISTS")
    expect(code(() => host.start({ ...other, assignment_ref: request.assignment_ref }))).toBe("CT_BACKEND_EXISTS")
  })

  test("rejects a backend the runtime reported as shared, foreign or off loopback", () => {
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
      expect(code(() => host.start(request))).toBe("CT_BACKEND_REJECTED")
      expect(host.owns(request.worktree)).toBe(false)
    }
  })

  test("rejects a weak or reused secret before any process is spawned", () => {
    for (const randomSecret of [() => "short", () => "", () => null, () => "a".repeat(4097), () => 42]) {
      const wiring = ports({ randomSecret })
      const host = createOpenCodeBackendHost(wiring)
      expect(code(() => host.start(request))).toBe("CT_BACKEND_REJECTED")
      expect(wiring.spawned).toEqual([])
    }
    const fixed = ports({ randomSecret: () => `secret-${"z".repeat(48)}` })
    const host = createOpenCodeBackendHost(fixed)
    host.start(request)
    expect(code(() => host.start(other))).toBe("CT_BACKEND_REJECTED")
  })

  test("refuses a root the backend did not prove parentless, and stops the backend it started", () => {
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
      expect(code(() => host.start(request))).toBe("CT_BACKEND_REJECTED")
      expect(wiring.stopped).toEqual(["/work/a"])
      expect(host.owns(request.worktree)).toBe(false)
    }
  })

  test("creates the root against its own backend, never a caller supplied endpoint", () => {
    const seen = []
    const wiring = ports({ createRoot: (input) => { seen.push(input); return { agent: ROOT_AGENT, id: sessionId("a"), parentID: null } } })
    const host = createOpenCodeBackendHost(wiring)
    const started = host.start(request)
    expect(seen).toEqual([{ secret: wiring.spawned[0].secret, url: started.backend_url, worktree: "/work/a" }])
  })

  test("exposes no view, pane or terminal surface at all", () => {
    const host = createOpenCodeBackendHost(ports())
    expect(Object.isFrozen(host)).toBe(true)
    expect(Object.keys(host).sort()).toEqual(["owns", "start", "stop"])
    expect(JSON.stringify(Object.keys(host))).not.toMatch(/pane|view|terminal|herdr|attach/i)
  })

  // Decision 39: the view is not the root. Nothing a view can do reaches the backend, because the
  // backend host has no view surface to reach through — losing a pane cannot express a stop here.
  test("keeps the backend alive and owned when a visible view would have died", () => {
    const wiring = ports()
    const host = createOpenCodeBackendHost(wiring)
    const started = host.start(request)
    // The only way to stop a backend is to name the worktree it belongs to. A view has no such handle,
    // so its death is not expressible here — which is exactly why it cannot take the backend with it.
    expect(host.owns(request.worktree)).toBe(true)
    expect(wiring.stopped).toEqual([])
    expect(code(() => host.stop(started.backend_url))).toBe("CT_BACKEND_REJECTED")
    expect(code(() => host.stop(String(started.backend_pid)))).toBe("CT_BACKEND_REJECTED")
    expect(host.owns(request.worktree)).toBe(true)
    expect(wiring.stopped).toEqual([])
  })

  test("stops only a backend it owns and forgets it exactly once", () => {
    const wiring = ports()
    const host = createOpenCodeBackendHost(wiring)
    host.start(request)
    expect(host.stop(request.worktree)).toBe(true)
    expect(wiring.stopped).toEqual(["/work/a"])
    expect(host.owns(request.worktree)).toBe(false)
    for (const worktree of [request.worktree, "/work/unknown", "--help", "", null]) {
      expect(code(() => host.stop(worktree))).toBe("CT_BACKEND_REJECTED")
    }
    expect(wiring.stopped).toEqual(["/work/a"])
  })

  test("rejects an ambiguous start request before spawning anything", () => {
    const wiring = ports()
    const host = createOpenCodeBackendHost(wiring)
    const { host_epoch, ...missing } = request
    for (const invalid of [null, undefined, "", [request], missing, { ...request, extra: true }, { ...request, worktree: "relative" }, { ...request, worktree: "" }, { ...request, assignment_ref: "../escape" }, { ...request, assignment_ref: "--help" }, { ...request, project_id: "" }, { ...request, host_epoch: 0 }, { ...request, host_epoch: -1 }]) {
      expect(code(() => host.start(invalid))).toBe("CT_BACKEND_REJECTED")
    }
    expect(wiring.spawned).toEqual([])
  })

  test("requires every port and grants no default wiring", () => {
    const full = ports()
    for (const key of ["spawn", "randomSecret", "createRoot"]) {
      const partial = { ...full }
      delete partial[key]
      expect(() => createOpenCodeBackendHost(partial)).toThrow(TypeError)
    }
    expect(() => createOpenCodeBackendHost()).toThrow(TypeError)
    for (const port of [null, "spawn", 42, {}, []]) {
      expect(() => createOpenCodeBackendHost({ ...full, spawn: port })).toThrow(TypeError)
    }
  })
})
