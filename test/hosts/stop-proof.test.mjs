import { describe, expect, test } from "bun:test"

import { ROOT_AGENT } from "../../hosts/root-identity.mjs"
import { createStopProofBinder } from "../../hosts/stop-proof.mjs"

const sessionId = `ses_${"a".repeat(26)}`
const binding = Object.freeze({
  agent: ROOT_AGENT, assignment_ref: "assignment-a", backend_pid: 4321,
  backend_url: "http://127.0.0.1:4096", host_epoch: 3, project_id: "project-a",
  root_session_id: sessionId, worktree: "/work/a",
})
const proof = Object.freeze({
  schema: "recovery-proof", schema_version: 1, proof_id: "stop-proof-a", project_id: "project-a",
  old_claim_ref: "claim-a", old_delivery_ref: "delivery-a", old_assignment_ref: "assignment-a", generation: 4,
  disposition: "ROLLED_BACK", host_epoch: 3, termination_pairing_ref: "pairing-a", effect_readback: {}, repository_root: "/repo",
  workspace_path: "/work/a", base_sha: "0".repeat(40), mode: "ON", runtime_binding_ref: "runtime-a", role_binding_ref: "role-a",
})
const request = Object.freeze({ assignment_ref: "assignment-a", termination_proof_ref: "stop-proof-a" })
const code = (operation) => { try { operation() } catch (error) { return error.code }; return null }
const setup = ({ resolve = () => proof, read = () => binding } = {}) => {
  const resolved = []
  const binder = createStopProofBinder({
    resolveTerminationProof: (ref) => { resolved.push(ref); return resolve(ref) },
    rootBinding: { read: (ref) => read(ref) },
  })
  return { binder, resolved }
}

describe("Canonical stop proof bound to the Main-owned root", () => {
  test("requires the canonical proof and binding ports", () => {
    const ports = { resolveTerminationProof: () => proof, rootBinding: { read: () => binding } }
    for (const broken of [undefined, {}, { ...ports, resolveTerminationProof: "resolve" }, { ...ports, rootBinding: {} }, { ...ports, rootBinding: { read: 1 } }]) {
      expect(() => createStopProofBinder(broken)).toThrow(TypeError)
    }
    expect(() => createStopProofBinder(ports)).not.toThrow()
  })

  // What the proof actually cross-checks is project, assignment and workspace. The backend, root and
  // epoch in the record come from the binding: the canonical proof carries no such field to check them against.
  test("binds a positive canonical proof to the project, assignment and workspace it names", () => {
    const { binder, resolved } = setup()
    const bound = binder.bind(request)
    expect(bound).toEqual({
      assignment_ref: "assignment-a", backend_pid: 4321, backend_url: "http://127.0.0.1:4096",
      disposition: "ROLLED_BACK", generation: 4, host_epoch: 3, project_id: "project-a",
      root_session_id: sessionId, termination_proof_ref: "stop-proof-a", worktree: "/work/a",
    })
    expect(Object.isFrozen(bound)).toBe(true)
    expect(resolved).toEqual(["stop-proof-a"])
  })

  // This module consumes the canonical proof; it must never become a second writer of termination truth.
  test("accepts only a proof reference, never a proof value the caller assembled", () => {
    const { binder } = setup()
    for (const input of [{ assignment_ref: "assignment-a", termination_proof: proof }, { ...request, termination_proof: proof }, { ...request, extra: 1 }, { assignment_ref: "assignment-a" }, { termination_proof_ref: "stop-proof-a" }, undefined, null, "assignment-a"]) {
      expect(code(() => binder.bind(input))).toBe("CT_STOP_PROOF_INVALID")
    }
    expect(typeof binder.mint).toBe("undefined")
    expect(typeof binder.record).toBe("undefined")
    expect(Object.keys(binder)).toEqual(["bind"])
  })

  test("requires a resolvable, present and unambiguous proof", () => {
    const unresolvable = setup({ resolve: () => { throw new Error("no such proof") } })
    expect(code(() => unresolvable.binder.bind(request))).toBe("CT_STOP_PROOF_REQUIRED")
    for (const value of [null, undefined, "stop-proof-a", { ...proof, status: "AMBIGUOUS" }, Promise.resolve(proof)]) {
      const { binder } = setup({ resolve: () => value })
      expect(code(() => binder.bind(request))).toBe("CT_STOP_PROOF_REQUIRED")
    }
  })

  test("refuses a resolved value that does not satisfy the canonical recovery-proof contract", () => {
    for (const value of [{ ...proof, schema: "termination-receipt" }, { ...proof, disposition: "TERMINATED" }, { ...proof, base_sha: "abc" }, { proof_id: "stop-proof-a" }]) {
      const { binder } = setup({ resolve: () => value })
      expect(code(() => binder.bind(request))).toBe("CT_STOP_PROOF_INVALID")
    }
  })

  // Provenance and ownership: a real proof about somebody else's assignment is still not our proof.
  test("refuses a valid proof whose provenance, project, assignment or workspace is not ours", () => {
    const foreign = [
      { ...proof, proof_id: "stop-proof-b" },
      { ...proof, project_id: "project-b" },
      { ...proof, old_assignment_ref: "assignment-b" },
      { ...proof, workspace_path: "/work/b" },
    ]
    for (const value of foreign) {
      const { binder } = setup({ resolve: () => value })
      expect(code(() => binder.bind(request))).toBe("CT_STOP_PROOF_INVALID")
    }
  })

  // Decision 43. The same assignment_ref and worktree can be re-bound at a new host epoch after a release,
  // and S4.4 creates its successor in that same worktree, so provenance alone cannot tell a proof about the
  // live host from a proof about the predecessor it replaced. Only the epoch can.
  test("refuses a proof from any host epoch other than the bound one", () => {
    for (const host_epoch of [2, 4]) {
      const { binder } = setup({ resolve: () => ({ ...proof, host_epoch }) })
      expect(code(() => binder.bind(request))).toBe("CT_STOP_PROOF_INVALID")
    }
  })

  test("refuses a proof that carries no host epoch at all", () => {
    const { host_epoch, ...epochless } = proof
    const { binder } = setup({ resolve: () => epochless })
    expect(code(() => binder.bind(request))).toBe("CT_STOP_PROOF_INVALID")
  })

  test("refuses a ref that is not canonical and never resolves anything for it", () => {
    for (const ref of ["", "../escape", "a/b", "proof ref", "a".repeat(129), 7, null]) {
      const invalidProof = setup()
      expect(code(() => invalidProof.binder.bind({ ...request, termination_proof_ref: ref }))).toBe("CT_STOP_PROOF_INVALID")
      expect(invalidProof.resolved).toEqual([])
      const invalidAssignment = setup()
      expect(code(() => invalidAssignment.binder.bind({ ...request, assignment_ref: ref }))).toBe("CT_STOP_PROOF_INVALID")
      expect(invalidAssignment.resolved).toEqual([])
    }
  })

  test("propagates the binding store's typed failure and never resolves a proof for a foreign binding", () => {
    const missing = setup({ read: () => { throw Object.assign(new Error("gone"), { code: "CT_ROOT_BINDING_INVALID" }) } })
    expect(code(() => missing.binder.bind(request))).toBe("CT_ROOT_BINDING_INVALID")
    expect(missing.resolved).toEqual([])
    const mismatched = setup({ read: () => ({ ...binding, assignment_ref: "assignment-b" }) })
    expect(code(() => mismatched.binder.bind(request))).toBe("CT_STOP_PROOF_FOREIGN")
    expect(mismatched.resolved).toEqual([])
  })
})
