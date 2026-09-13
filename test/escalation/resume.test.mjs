import { describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createParkedCheckpointBinding } from "../../contracts/parked-checkpoint-binding.mjs"
import { validate } from "../../contracts/validate.mjs"
import { createResumeLoop } from "../../escalation/resume.mjs"

const fixtures = JSON.parse(readFileSync(new URL("../fixtures/contracts/schema-cases-v1.json", import.meta.url), "utf8"))
const error = (code) => Object.assign(new Error(code), { code })
const throwsCode = (run, code) => { try { run() } catch (failure) { expect(failure.code).toBe(code); return } throw new Error(`Expected ${code}`) }
const canonicalBinding = () => createParkedCheckpointBinding({ parked_decision: fixtures.parkedDecision, checkpoint_capture: fixtures.checkpointCapture, reconciled_checkpoint: fixtures.reconciledCheckpoint })
const blocked = { state: "RECONCILIATION_REQUIRED", code: "CT_RESUME_RECONCILIATION_REQUIRED" }

const fixture = (options = {}) => {
  const { assertFor = () => Object.freeze({ receipt: "terminal" }) } = options
  const root = mkdtempSync(join(tmpdir(), "ct-resume-")), record = join(root, "binding.json"), binding = canonicalBinding(), calls = { read: 0, asserted: [], reconciled: [], resumed: [] }
  const reconciliation = Object.hasOwn(options, "reconciliation") ? options.reconciliation : { status: "CURRENT", ...binding }
  writeFileSync(record, JSON.stringify(binding), "utf8")
  const loop = createResumeLoop({
    parkedBindings: { readParkedCheckpointBinding(id) {
      calls.read++
      const readback = validate("parkedCheckpointBinding", JSON.parse(readFileSync(record, "utf8")))
      return id === readback.parked_decision_id ? readback : null
    } },
    terminalResponses: { assertFor(value) { calls.asserted.push(value); return assertFor(value) } },
    reconcile(value) { calls.reconciled.push(value); return reconciliation },
    resumeCheckpoint(value) { calls.resumed.push(value); return Object.freeze({ state: "RESUMED" }) },
  })
  return { binding, calls, loop, bytes: () => readFileSync(record, "utf8"), dispose: () => rmSync(root, { recursive: true, force: true }) }
}

describe("exact checkpoint resume", () => {
  test("uses only constructor-bound Main terminal authority and resumes the exact canonical binding coordinates", () => {
    const f = fixture()
    try {
      const outcome = f.loop.resume({ parked_decision_id: f.binding.parked_decision_id })
      expect(outcome).toEqual({ state: "RESUMED" })
      expect(f.calls).toEqual({
        read: 1,
        asserted: [{ parked_decision_id: f.binding.parked_decision_id, parked_decision_digest: f.binding.parked_decision_digest }],
        reconciled: [{ binding: f.binding, response_receipt: { receipt: "terminal" } }],
        resumed: [{ parked_checkpoint: f.binding.parked_checkpoint, repository: f.binding.repository, project_id: f.binding.project_id, assignment_id: f.binding.assignment_id, generation: f.binding.generation, base_sha: f.binding.base_sha, result_sha: f.binding.result_sha, response_receipt: { receipt: "terminal" } }],
      })
    } finally { f.dispose() }
  })

  test("rejects raw response, capability, and authority fields before any constructor port call", () => {
    for (const extra of [{ terminal_response: {} }, { response: {} }, { capability: {} }, { authority: {} }]) {
      const f = fixture()
      try {
        const before = f.bytes()
        throwsCode(() => f.loop.resume({ parked_decision_id: f.binding.parked_decision_id, ...extra }), "CT_RESUME_RESPONSE_INVALID")
        expect(f.bytes()).toBe(before)
        expect(f.calls).toEqual({ read: 0, asserted: [], reconciled: [], resumed: [] })
      } finally { f.dispose() }
    }
  })

  test("requires fresh exact-current reconciliation including project_id and preserves invalid-resume bytes", () => {
    for (const reconciliation of [
      { status: "STALE" }, null, { status: "UNKNOWN" },
      ...["repository", "project_id", "assignment_id", "generation", "base_sha", "result_sha"].map((key) => ({ status: "CURRENT", ...canonicalBinding(), [key]: key === "generation" ? 4 : "changed" })),
    ]) {
      const f = fixture({ reconciliation })
      try {
        const before = f.bytes()
        expect(f.loop.resume({ parked_decision_id: f.binding.parked_decision_id })).toEqual(blocked)
        expect(f.bytes()).toBe(before)
        expect(f.calls.resumed).toEqual([])
      } finally { f.dispose() }
    }
  })

  test("keeps byte-backed canonical binding unchanged when constructor terminal authority rejects", () => {
    for (const code of ["UNVALIDATED", "EXPIRED_AT_CONSUMPTION", "WRONG_ORIGIN", "WRONG_DECISION"]) {
      const f = fixture({ assertFor() { throw error(code) } })
      try {
        const before = f.bytes()
        throwsCode(() => f.loop.resume({ parked_decision_id: f.binding.parked_decision_id }), "CT_RESUME_RESPONSE_INVALID")
        expect(f.bytes()).toBe(before)
        expect(f.calls).toMatchObject({ read: 1, reconciled: [], resumed: [] })
      } finally { f.dispose() }
    }
  })
})
