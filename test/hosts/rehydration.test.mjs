import { describe, expect, test } from "bun:test"

import { createRehydration } from "../../hosts/rehydration.mjs"
import { ROOT_AGENT } from "../../hosts/root-identity.mjs"

const sessionId = `ses_${"a".repeat(26)}`
const binding = Object.freeze({
  agent: ROOT_AGENT, assignment_ref: "assignment-a", backend_pid: 4321,
  backend_url: "http://127.0.0.1:4096", host_epoch: 3, project_id: "project-a",
  root_session_id: sessionId, worktree: "/work/a",
})
const claim = Object.freeze({ assignment_ref: "assignment-a", host_epoch: 3, project_id: "project-a", worktree: "/work/a" })
const code = (operation) => { try { operation() } catch (error) { return error.code }; return null }
const setup = ({ read = () => binding } = {}) => {
  const calls = []
  const store = new Proxy({ read: (ref) => { calls.push(["read", ref]); return read(ref) } }, {
    get: (target, key) => target[key] ?? ((...args) => { calls.push([key, ...args]); throw new Error("mutation attempted") }),
  })
  return { calls, rehydration: createRehydration({ rootBinding: store }) }
}

describe("Root projection rehydration", () => {
  test("requires the binding store port", () => {
    for (const broken of [undefined, {}, { rootBinding: {} }, { rootBinding: { read: 1 } }]) expect(() => createRehydration(broken)).toThrow(TypeError)
    expect(() => createRehydration({ rootBinding: { read: () => binding } })).not.toThrow()
  })

  test("restores the durable projection of the exact bound backend, process and root", () => {
    const { calls, rehydration } = setup()
    const projection = rehydration.rehydrate(claim)
    expect(projection).toEqual(binding)
    expect(Object.isFrozen(projection)).toBe(true)
    expect(calls).toEqual([["read", "assignment-a"]])
  })

  // Rehydration is a read. It never creates or replaces a root, and it holds no port that could.
  test("exposes only rehydrate and performs no write on the binding store", () => {
    const { calls, rehydration } = setup()
    rehydration.rehydrate(claim)
    expect(Object.keys(rehydration)).toEqual(["rehydrate"])
    for (const key of ["bind", "release", "start", "stop", "attach"]) expect(typeof rehydration[key]).toBe("undefined")
    expect(calls.every(([operation]) => operation === "read")).toBe(true)
  })

  test("never returns a pane, view, terminal or any state outside the binding", () => {
    const { rehydration } = setup()
    const projection = rehydration.rehydrate(claim)
    expect(Object.keys(projection).sort()).toEqual(["agent", "assignment_ref", "backend_pid", "backend_url", "host_epoch", "project_id", "root_session_id", "worktree"])
  })

  test("refuses a claim about another project, worktree or assignment", () => {
    for (const value of [{ ...claim, project_id: "project-b" }, { ...claim, worktree: "/work/b" }]) {
      const { rehydration } = setup()
      expect(code(() => rehydration.rehydrate(value))).toBe("CT_REHYDRATION_FOREIGN")
    }
    const { rehydration } = setup({ read: () => ({ ...binding, assignment_ref: "assignment-b" }) })
    expect(code(() => rehydration.rehydrate(claim))).toBe("CT_REHYDRATION_FOREIGN")
  })

  // CT-V1-08: an old epoch has lost its authority, so its projection may never come back as if it were active.
  test("refuses a stale epoch and a superseding one alike", () => {
    for (const host_epoch of [2, 4]) {
      const { rehydration } = setup()
      expect(code(() => rehydration.rehydrate({ ...claim, host_epoch }))).toBe("CT_ASSIGNMENT_STALE")
    }
  })

  // A foreign claim is refused as foreign even when its epoch is also wrong: it was never ours to be stale about.
  test("reports a foreign claim as foreign even when its epoch is stale too", () => {
    const { rehydration } = setup()
    expect(code(() => rehydration.rehydrate({ ...claim, host_epoch: 2, worktree: "/work/b" }))).toBe("CT_REHYDRATION_FOREIGN")
  })

  test("refuses an inexact or malformed claim without touching the store", () => {
    for (const value of [undefined, null, "assignment-a", [claim], { ...claim, extra: 1 }, { assignment_ref: "assignment-a" }, { ...claim, host_epoch: 0 }, { ...claim, host_epoch: "3" }, { ...claim, worktree: "work/a" }, { ...claim, assignment_ref: "../escape" }]) {
      const { calls, rehydration } = setup()
      expect(code(() => rehydration.rehydrate(value))).toBe("CT_REHYDRATION_INVALID")
      expect(calls).toEqual([])
    }
  })

  test("propagates the binding store's typed failure instead of inventing a projection", () => {
    const { rehydration } = setup({ read: () => { throw Object.assign(new Error("gone"), { code: "CT_ROOT_BINDING_INVALID" }) } })
    expect(code(() => rehydration.rehydrate(claim))).toBe("CT_ROOT_BINDING_INVALID")
  })

  // An untyped read failure is our defect, so it is never reported as a fact about the assignment.
  test("normalizes an untyped store failure instead of leaking it", () => {
    const { rehydration } = setup({ read: () => { throw new TypeError("boom") } })
    expect(code(() => rehydration.rehydrate(claim))).toBe("CT_REHYDRATION_INVALID")
  })
})
