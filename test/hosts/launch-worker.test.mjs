import { describe, expect, test } from "bun:test"

import { createLaunchWorkerRuntime as createRuntime } from "../../hosts/launch-worker.mjs"

const assertCurrentHost = () => true
const createLaunchWorkerRuntime = (options) => createRuntime({ assertCurrentHost, ...options })
const binding = Object.freeze({
  assignment_ref: "assignments/a.json", brief: "Approved work only", brief_ref: "briefs/a.json",
  candidate_revision: `sha256:${"a".repeat(64)}`, fence_path: "/runtime/fence-a", host_epoch: 3, project_id: "project-a", worktree: "/work/a",
})
const degradedView = { status: "DEGRADED", code: "CT_VIEW_UNVERIFIED", retryable: true }

describe("packaged launch-worker runtime", () => {
  test("starts and binds the Main-owned root while reporting only a degraded public view", async () => {
    const calls = []
    const runtime = createLaunchWorkerRuntime({
      consumeBinding: async (requestRef) => { calls.push(["consume", requestRef]); return binding },
      backend: { start: async (request) => { calls.push(["start", request]); return { assignment_ref: binding.assignment_ref, backend_pid: 42, backend_url: "http://127.0.0.1:4096", credential_ref: "r".repeat(43), host_epoch: binding.host_epoch, project_id: binding.project_id, root_identity: { agent: "gentle-orchestrator", root_session_id: `ses_${"a".repeat(26)}` }, worktree: binding.worktree } }, stop: async () => { calls.push(["stop"]) } },
      rootBinding: { bind: (record) => { calls.push(["bind", record]); return { ...record, agent: "gentle-orchestrator", root_session_id: record.root_identity.root_session_id } } },
      view: { attach: async (target) => { calls.push(["attach", target]); return { status: "ATTACHED", pane_id: "w1:p1", helper_ref: "private" } } },
    })

    const result = await runtime.launchWorker({ request_ref: "request-a" })
    expect(result).toEqual({ ...binding, backend_pid: 42, backend_url: "http://127.0.0.1:4096", root_session_id: `ses_${"a".repeat(26)}`, view: degradedView })
    expect(Object.keys(result.view).sort()).toEqual(["code", "retryable", "status"])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.view)).toBe(true)
    expect(Object.getPrototypeOf(result.view)).toBe(Object.prototype)
    expect(calls).toEqual([
      ["consume", "request-a"], ["start", { assignment_ref: "assignments/a.json", brief: "Approved work only", brief_ref: "briefs/a.json", host_epoch: 3, project_id: "project-a", worktree: "/work/a" }],
      ["bind", { assignment_ref: "assignments/a.json", backend_pid: 42, backend_url: "http://127.0.0.1:4096", host_epoch: 3, project_id: "project-a", root_identity: { agent: "gentle-orchestrator", root_session_id: `ses_${"a".repeat(26)}` }, worktree: "/work/a" }],
      ["attach", { backend_url: "http://127.0.0.1:4096", credential_ref: "r".repeat(43), root_session_id: `ses_${"a".repeat(26)}`, worktree: "/work/a" }],
    ])
  })

  test("does not bind or attach until backend brief admission settles", async () => {
    const calls = []
    let admit
    const runtime = createLaunchWorkerRuntime({
      consumeBinding: async () => binding,
      backend: { start: (request) => new Promise((resolve) => { calls.push(["start", request]); admit = () => resolve({ worktree: binding.worktree }) }), stop: async () => {} },
      rootBinding: { bind: (record) => { calls.push("bind"); return record } },
      view: { attach: async () => { calls.push("attach"); return {} } },
    })
    const launching = runtime.launchWorker({ request_ref: "request-a" })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(calls).toEqual([["start", { assignment_ref: binding.assignment_ref, brief: binding.brief, brief_ref: binding.brief_ref, host_epoch: binding.host_epoch, project_id: binding.project_id, worktree: binding.worktree }]])
    admit(); await launching
    expect(calls.slice(1)).toEqual(["bind", "attach"])
  })

  test("rejects a consumed binding superseded before the immediate pre-effect check", async () => {
    const calls = []
    const runtime = createLaunchWorkerRuntime({
      consumeBinding: async () => { calls.push("consume"); return binding },
      assertCurrentHost: () => { calls.push("assert"); throw Object.assign(new Error("superseded"), { code: "CT_ASSIGNMENT_STALE" }) },
      backend: { start: async () => { calls.push("backend") }, stop: async () => {} },
      rootBinding: { bind: () => { calls.push("root") } }, view: { attach: async () => { calls.push("view") } },
    })
    await expect(runtime.launchWorker({ request_ref: "request-a" })).rejects.toMatchObject({ code: "CT_ASSIGNMENT_STALE" })
    expect(calls).toEqual(["consume", "assert"])
  })

  test("rejects caller bindings and unavailable Main consumption before host effects", async () => {
    let effects = 0
    const runtime = createLaunchWorkerRuntime({
      consumeBinding: async () => { throw Object.assign(new Error("missing"), { code: "CT_LAUNCH_BINDING_INVALID" }) },
      backend: { start: async () => { effects += 1 }, stop: async () => {} }, rootBinding: { bind: () => true }, view: { attach: async () => true },
    })
    for (const assertion of [{ binding }, { ack: true }, { proof_file: "/tmp/proof" }, { nonce: "caller" }, { view_status: "ATTACHED" }]) {
      await expect(runtime.launchWorker({ request_ref: "request-a", ...assertion })).rejects.toMatchObject({ code: "CT_LAUNCH_REJECTED" })
    }
    await expect(runtime.launchWorker({ request_ref: "request-a" })).rejects.toMatchObject({ code: "CT_LAUNCH_BINDING_INVALID" })
    expect(effects).toBe(0)
  })

  test("leaves the binding unconsumed when runtime preflight fails, then reports a bounded final attempt", async () => {
    let consumed = 0
    const invalid = createLaunchWorkerRuntime({ preflight: () => { throw Object.assign(new Error("invalid runtime"), { code: "CT_LAUNCH_REJECTED" }) }, consumeBinding: () => { consumed += 1; return binding }, backend: { start: async () => {}, stop: async () => {} }, rootBinding: { bind: () => {} }, view: { attach: async () => {} } })
    await expect(invalid.launchWorker({ request_ref: "request-a" })).rejects.toMatchObject({ code: "CT_LAUNCH_REJECTED" })
    expect(consumed).toBe(0)
    const final = createLaunchWorkerRuntime({ preflight: () => () => {}, consumeBinding: () => binding, backend: { start: async () => { throw Object.assign(new Error("timeout"), { code: "CT_BACKEND_REJECTED" }) }, stop: async () => {} }, rootBinding: { bind: () => true }, view: { attach: async () => true } })
    await expect(final.launchWorker({ request_ref: "request-a" })).rejects.toMatchObject({ code: "CT_LAUNCH_FINAL_ATTEMPT_FAILED", evidence: { request_ref: "request-a", replacement_binding_required: true } })
  })

  test("stops an unbound backend without masking a binding failure", async () => {
    const calls = [], bindingError = Object.assign(new Error("binding failed"), { code: "CT_ROOT_BINDING_INVALID" })
    const runtime = createLaunchWorkerRuntime({
      consumeBinding: async () => binding,
      backend: { start: async () => { calls.push("start"); return { worktree: binding.worktree } }, stop: async (worktree) => { calls.push(["stop", worktree]); throw new Error("cleanup failed") } },
      rootBinding: { bind: () => { calls.push("bind"); throw bindingError } },
      view: { attach: async () => { calls.push("attach") } },
    })

    await expect(runtime.launchWorker({ request_ref: "request-a" })).rejects.toMatchObject({ code: "CT_LAUNCH_FINAL_ATTEMPT_FAILED", evidence: { cause: "CT_ROOT_BINDING_INVALID", request_ref: "request-a", replacement_binding_required: true } })
    expect(calls).toEqual(["start", "bind", ["stop", "/work/a"]])
  })

  test("preserves the admitted root when the private view fails and leaks no execution data", async () => {
    const calls = [], root_session_id = `ses_${"a".repeat(26)}`, backend_url = "http://127.0.0.1:4096"
    const runtime = createLaunchWorkerRuntime({
      consumeBinding: async () => binding,
      backend: { start: async () => ({ assignment_ref: binding.assignment_ref, backend_pid: 42, backend_url, credential_ref: "r".repeat(43), host_epoch: binding.host_epoch, project_id: binding.project_id, root_identity: {}, worktree: binding.worktree }), stop: async () => { calls.push("stop") } },
      rootBinding: { bind: () => ({ backend_pid: 42, backend_url, root_session_id, worktree: binding.worktree }) },
      view: { attach: async (input) => { expect(input.credential_ref).toBe("r".repeat(43)); throw Object.assign(new Error("attach private-command --token private-token"), { code: "CT_VIEW_UNAVAILABLE", secret: "do-not-copy", pane_id: "w1:p1" }) } },
    })

    const result = await runtime.launchWorker({ request_ref: "request-a" })
    expect(result).toEqual({ ...binding, backend_pid: 42, backend_url, root_session_id, view: degradedView })
    expect(JSON.stringify(result)).not.toMatch(/pane_id|helper|credential|secret|command|copy|paste|token|w1:p1|r{43}|do-not-copy/i)
    expect(calls).toEqual([])
  })
})
