import { describe, expect, test } from "bun:test"

import { createLaunchWorkerRuntime } from "../../hosts/launch-worker.mjs"

const binding = Object.freeze({
  assignment_ref: "assignments/a.json", brief: "Approved work only", brief_ref: "briefs/a.json",
  candidate_revision: `sha256:${"a".repeat(64)}`, host_epoch: 3, project_id: "project-a", worktree: "/work/a",
})

describe("packaged launch-worker runtime", () => {
  test("consumes the opaque Main binding once and composes one visible root", async () => {
    const calls = []
    const runtime = createLaunchWorkerRuntime({
      consumeBinding: async (requestRef) => { calls.push(["consume", requestRef]); return binding },
      herdr: {
        createPane: async ({ worktree }) => { calls.push(["pane", worktree]); return { pane_id: "pane-a", close: async () => {} } },
        bindRoot: async (receipt) => { calls.push(["bind", receipt]); return true },
      },
      opencode: { startRoot: async ({ brief }) => { calls.push(["root", brief]); return { root_session_id: "root-a" } } },
    })

    await expect(runtime.launchWorker({ request_ref: "request-a" })).resolves.toEqual({ ...binding, pane_id: "pane-a", root_session_id: "root-a" })
    expect(calls).toEqual([
      ["consume", "request-a"], ["pane", "/work/a"], ["root", "Approved work only"],
      ["bind", { ...binding, pane_id: "pane-a", root_session_id: "root-a" }],
    ])
  })

  test("rejects caller bindings and unavailable Main consumption before host effects", async () => {
    let effects = 0
    const runtime = createLaunchWorkerRuntime({
      consumeBinding: async () => { throw Object.assign(new Error("missing"), { code: "CT_LAUNCH_BINDING_INVALID" }) },
      herdr: { createPane: async () => { effects += 1 }, bindRoot: async () => true },
      opencode: { startRoot: async () => ({ root_session_id: "root" }) },
    })
    await expect(runtime.launchWorker({ request_ref: "request-a", binding })).rejects.toMatchObject({ code: "CT_LAUNCH_REJECTED" })
    await expect(runtime.launchWorker({ request_ref: "request-a" })).rejects.toMatchObject({ code: "CT_LAUNCH_BINDING_INVALID" })
    expect(effects).toBe(0)
  })
})
