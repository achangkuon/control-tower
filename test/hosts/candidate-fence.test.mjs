import { afterEach, describe, expect, test } from "bun:test"
import * as nodeFs from "node:fs"
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import * as fenceModule from "../../hosts/candidate-fence.mjs"

const roots = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true }) })

const error = (operation) => {
  try { operation() } catch (cause) { return { code: cause.code, message: cause.message } }
  return { code: null, message: null }
}
const sha = (letter) => `sha256:${letter.repeat(64)}`
const candidate = (hostId, overrides = {}) => ({
  project_id: "project-a",
  candidate_revision: sha(hostId === "host-a" ? "a" : "b"),
  host_id: hostId,
  base_sha: (hostId === "host-a" ? "a" : "b").repeat(40),
  runtime_binding_ref: `bindings/${hostId}-runtime.json`,
  role_binding_ref: `bindings/${hostId}-role.json`,
  assignment_ref: `assignments/${hostId}.json`,
  work_ref: `work/${hostId}.json`,
  ...overrides,
})
const predecessor = (value, hostEpoch = 1, overrides = {}) => ({
  host_id: value.host_id,
  host_epoch: hostEpoch,
  base_sha: value.base_sha,
  runtime_binding_ref: value.runtime_binding_ref,
  role_binding_ref: value.role_binding_ref,
  assignment_ref: value.assignment_ref,
  ...overrides,
})
const terminationProof = (value, overrides = {}) => ({
  schema: "recovery-proof",
  schema_version: 1,
  proof_id: `proof-${value.host_id}`,
  project_id: value.project_id,
  old_claim_ref: `claims/${value.host_id}.json`,
  old_delivery_ref: `deliveries/${value.host_id}.json`,
  old_assignment_ref: value.assignment_ref,
  generation: 1,
  disposition: "NOT_STARTED",
  termination_pairing_ref: `termination/${value.host_id}.json`,
  effect_readback: {},
  repository_root: "/repository",
  workspace_path: `/worktrees/${value.host_id}`,
  base_sha: value.base_sha,
  mode: "safe",
  runtime_binding_ref: value.runtime_binding_ref,
  role_binding_ref: value.role_binding_ref,
  ...overrides,
})
const fixture = (options = {}) => {
  const root = mkdtempSync(join(tmpdir(), "ct-host-fence-"))
  roots.push(root)
  const ledgerPath = join(root, "state/hosts/candidate-fence.json")
  return {
    root,
    ledgerPath,
    store: fenceModule.createCandidateFenceStore({ ledgerPath, ...options }),
  }
}
const residue = (path) => nodeFs.existsSync(dirname(path))
  ? readdirSync(dirname(path)).filter((name) => name.includes(".tmp") || name.endsWith(".lock"))
  : []

const admitInitial = (store, value = candidate("host-a")) => store.admit({ candidate: value, expectedRevision: 0 })

describe("single-host candidate fence", () => {
  test("exports one narrow store and admits the first host at monotonic epoch one", () => {
    expect(Object.keys(fenceModule)).toEqual(["createCandidateFenceStore"])
    const { ledgerPath, store } = fixture()
    const first = candidate("host-a")

    expect(store.read()).toBeNull()
    expect(nodeFs.existsSync(dirname(ledgerPath))).toBeFalse()
    const ledger = admitInitial(store, first)

    expect(ledger).toEqual({
      schema: "candidate-fence-ledger",
      schema_version: 1,
      project_id: "project-a",
      revision: 1,
      events: [{
        event: "HOST_ADMITTED",
        exclusivity: "VERIFIED",
        host_epoch: 1,
        candidate: first,
        predecessor: null,
        termination_proof_ref: null,
        frozen_work: null,
        maintainer_decision_ref: null,
      }],
    })
    expect(Object.isFrozen(ledger.events[0].candidate)).toBeTrue()
    expect(statSync(dirname(ledgerPath)).mode & 0o777).toBe(0o700)
    expect(statSync(ledgerPath).mode & 0o777).toBe(0o600)
    expect(readFileSync(ledgerPath, "utf8")).toEndWith("\n")
  })

  test("requires positive termination proof and never treats silence as proof", () => {
    const { ledgerPath, store } = fixture()
    const oldHost = candidate("host-a"), nextHost = candidate("host-b")
    admitInitial(store, oldHost)
    const before = readFileSync(ledgerPath)

    for (const termination_proof of [undefined, null, { state: "ABSENT" }, { state: "PRESENT" }, { state: "AMBIGUOUS" }]) {
      const result = error(() => store.admit({
        candidate: nextHost,
        predecessor: predecessor(oldHost),
        terminationProof: termination_proof,
        expectedRevision: 1,
      }))
      expect(result.code).toBe("CT_STOP_PROOF_REQUIRED")
      expect(result.message).toContain("termination proof")
      expect(readFileSync(ledgerPath)).toEqual(before)
    }
    expect(residue(ledgerPath)).toEqual([])
  })

  test("advances only with matching ownership, host, base, runtime, role, and proof", () => {
    const driftCases = [
      ["host", { host_id: "host-z" }, {}, "CT_HOST_DRIFT"],
      ["base", { base_sha: "c".repeat(40) }, {}, "CT_BASE_DRIFT"],
      ["runtime", { runtime_binding_ref: "bindings/other-runtime.json" }, {}, "CT_RUNTIME_DRIFT"],
      ["role", { role_binding_ref: "bindings/other-role.json" }, {}, "CT_ROLE_DRIFT"],
      ["proof base", {}, { base_sha: "c".repeat(40) }, "CT_BASE_DRIFT"],
      ["proof runtime", {}, { runtime_binding_ref: "bindings/other-runtime.json" }, "CT_RUNTIME_DRIFT"],
      ["proof role", {}, { role_binding_ref: "bindings/other-role.json" }, "CT_ROLE_DRIFT"],
    ]
    for (const [_label, predecessorOverride, proofOverride, expected] of driftCases) {
      const { ledgerPath, store } = fixture()
      const oldHost = candidate("host-a"), nextHost = candidate("host-b")
      admitInitial(store, oldHost)
      const before = readFileSync(ledgerPath)
      expect(error(() => store.admit({
        candidate: nextHost,
        predecessor: predecessor(oldHost, 1, predecessorOverride),
        terminationProof: terminationProof(oldHost, proofOverride),
        expectedRevision: 1,
      })).code).toBe(expected)
      expect(readFileSync(ledgerPath)).toEqual(before)
    }

    const { store } = fixture()
    const oldHost = candidate("host-a"), nextHost = candidate("host-b")
    admitInitial(store, oldHost)
    const admitted = store.admit({
      candidate: nextHost,
      predecessor: predecessor(oldHost),
      terminationProof: terminationProof(oldHost),
      expectedRevision: 1,
    })
    expect(admitted.revision).toBe(2)
    expect(admitted.events.map(({ host_epoch }) => host_epoch)).toEqual([1, 2])
    expect(admitted.events[1]).toMatchObject({
      event: "HOST_ADMITTED",
      exclusivity: "VERIFIED",
      host_epoch: 2,
      candidate: nextHost,
      predecessor: predecessor(oldHost),
      termination_proof_ref: "proof-host-a",
    })
  })

  test("names uncertain ownership and rejects stale epochs and proof assignment drift", () => {
    const { ledgerPath, store } = fixture()
    const oldHost = candidate("host-a"), nextHost = candidate("host-b")
    admitInitial(store, oldHost)
    const before = readFileSync(ledgerPath)

    const missing = error(() => store.admit({ candidate: nextHost, terminationProof: terminationProof(oldHost), expectedRevision: 1 }))
    expect(missing).toEqual({ code: "CT_OWNERSHIP_UNCERTAIN", message: expect.stringContaining("predecessor") })
    const stale = error(() => store.admit({ candidate: nextHost, predecessor: predecessor(oldHost, 0), terminationProof: terminationProof(oldHost), expectedRevision: 1 }))
    expect(stale).toEqual({ code: "CT_OWNERSHIP_UNCERTAIN", message: expect.stringContaining("host epoch") })
    const wrongAssignment = error(() => store.admit({
      candidate: nextHost,
      predecessor: predecessor(oldHost),
      terminationProof: terminationProof(oldHost, { old_assignment_ref: "assignments/other.json" }),
      expectedRevision: 1,
    }))
    expect(wrongAssignment).toEqual({ code: "CT_STOP_PROOF_INVALID", message: expect.stringContaining("assignment") })
    expect(readFileSync(ledgerPath)).toEqual(before)
  })

  test("permits only an explicit maintainer takeover and exposes the broken-exclusive segment", () => {
    for (const actor of [undefined, "MAIN", "WORKER", "SUPPORT", "SYSTEM"]) {
      const { ledgerPath, store } = fixture()
      const oldHost = candidate("host-a")
      admitInitial(store, oldHost)
      const before = readFileSync(ledgerPath)
      expect(error(() => store.forceTakeover({
        actor,
        candidate: candidate("host-b"),
        predecessor: predecessor(oldHost),
        maintainerDecisionRef: "decisions/takeover-a.json",
        expectedRevision: 1,
      })).code).toBe("CT_MAINTAINER_REQUIRED")
      expect(readFileSync(ledgerPath)).toEqual(before)
    }

    const { store } = fixture()
    const oldHost = candidate("host-a"), nextHost = candidate("host-b")
    admitInitial(store, oldHost)
    const ledger = store.forceTakeover({
      actor: "MAINTAINER",
      candidate: nextHost,
      predecessor: predecessor(oldHost),
      maintainerDecisionRef: "decisions/takeover-a.json",
      expectedRevision: 1,
    })

    expect(ledger.events[1]).toEqual({
      event: "TAKEOVER_FORCED",
      exclusivity: "BROKEN",
      host_epoch: 2,
      candidate: nextHost,
      predecessor: predecessor(oldHost),
      termination_proof_ref: null,
      frozen_work: {
        state: "FROZEN",
        candidate_revision: oldHost.candidate_revision,
        base_sha: oldHost.base_sha,
        work_ref: oldHost.work_ref,
      },
      maintainer_decision_ref: "decisions/takeover-a.json",
    })
    expect(store.read().events[1].exclusivity).toBe("BROKEN")
    expect(error(() => store.assertBaseUsable({ projectId: "project-a", baseSha: oldHost.base_sha }))).toEqual({
      code: "CT_FROZEN_WORK_UNRESOLVED",
      message: expect.stringContaining(oldHost.work_ref),
    })
    expect(store.assertBaseUsable({ projectId: "project-a", baseSha: nextHost.base_sha })).toBeTrue()
  })

  test("rejects a later candidate whose base carries frozen work from a forced segment", () => {
    const { ledgerPath, store } = fixture()
    const oldHost = candidate("host-a"), takeoverHost = candidate("host-b")
    admitInitial(store, oldHost)
    store.forceTakeover({
      actor: "MAINTAINER",
      candidate: takeoverHost,
      predecessor: predecessor(oldHost),
      maintainerDecisionRef: "decisions/takeover-a.json",
      expectedRevision: 1,
    })
    const before = readFileSync(ledgerPath)
    const contaminated = candidate("host-c", {
      candidate_revision: sha("c"),
      base_sha: oldHost.base_sha,
      runtime_binding_ref: "bindings/host-c-runtime.json",
      role_binding_ref: "bindings/host-c-role.json",
      assignment_ref: "assignments/host-c.json",
      work_ref: "work/host-c.json",
    })

    expect(error(() => store.admit({
      candidate: contaminated,
      predecessor: predecessor(takeoverHost, 2),
      terminationProof: terminationProof(takeoverHost),
      expectedRevision: 2,
    }))).toEqual({
      code: "CT_FROZEN_WORK_UNRESOLVED",
      message: expect.stringContaining(oldHost.work_ref),
    })
    expect(readFileSync(ledgerPath)).toEqual(before)
  })

  test("keeps an append-only CAS ledger and leaves prior bytes intact on every failure", () => {
    const { ledgerPath, store } = fixture()
    const oldHost = candidate("host-a"), nextHost = candidate("host-b")
    const first = admitInitial(store, oldHost)
    const firstBytes = readFileSync(ledgerPath)

    expect(error(() => store.admit({
      candidate: nextHost,
      predecessor: predecessor(oldHost),
      terminationProof: terminationProof(oldHost),
      expectedRevision: 0,
    })).code).toBe("CT_CAS_MISMATCH")
    expect(readFileSync(ledgerPath)).toEqual(firstBytes)

    const second = store.admit({
      candidate: nextHost,
      predecessor: predecessor(oldHost),
      terminationProof: terminationProof(oldHost),
      expectedRevision: 1,
    })
    expect(second.events.slice(0, first.events.length)).toEqual(first.events)
    expect(residue(ledgerPath)).toEqual([])
  })

  test("rejects a ledger whose append-only predecessor chain was tampered", () => {
    const { ledgerPath, store } = fixture()
    const oldHost = candidate("host-a"), nextHost = candidate("host-b")
    admitInitial(store, oldHost)
    store.admit({
      candidate: nextHost,
      predecessor: predecessor(oldHost),
      terminationProof: terminationProof(oldHost),
      expectedRevision: 1,
    })
    const tampered = JSON.parse(readFileSync(ledgerPath, "utf8"))
    tampered.events[1].predecessor.host_id = "host-z"
    nodeFs.writeFileSync(ledgerPath, `${JSON.stringify(tampered)}\n`)

    expect(error(() => store.read())).toEqual({
      code: "CT_FENCE_INVALID",
      message: expect.stringContaining("predecessor chain"),
    })
  })

  test("rolls back injected persistence failure without residue or an automatic takeover", () => {
    let failCommit = false
    const { ledgerPath, store } = fixture({ beforeCommit() {
      if (failCommit) throw Object.assign(new Error("injected"), { code: "EIO" })
    } })
    const oldHost = candidate("host-a"), nextHost = candidate("host-b")
    admitInitial(store, oldHost)
    const before = readFileSync(ledgerPath)
    failCommit = true

    expect(error(() => store.admit({
      candidate: nextHost,
      predecessor: predecessor(oldHost),
      terminationProof: terminationProof(oldHost),
      expectedRevision: 1,
    })).code).toBe("CT_FENCE_WRITE_FAILED")
    expect(readFileSync(ledgerPath)).toEqual(before)
    expect(residue(ledgerPath)).toEqual([])
  })
})
