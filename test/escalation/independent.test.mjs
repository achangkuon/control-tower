import { describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createParkedLoop } from "../../escalation/parked.mjs"

const error = (code) => Object.assign(new Error(code), { code })
const throwsCode = (run, code) => { try { run() } catch (failure) { expect(failure.code).toBe(code); return } throw new Error(`Expected ${code}`) }
const expected = { plan_enumeration_digest: "plan", ledger_digest: "ledger", worker_claim: "claim" }
const executable = ({ rejectAlternative = false } = {}) => {
  const root = mkdtempSync(join(tmpdir(), "ct-independent-")), record = join(root, "proposal.json"), calls = { read: 0, default: 0, alternative: [], dispatch: 0 }
  writeFileSync(record, JSON.stringify({ boundary: { caller_role: "MAIN", ...expected, expires_at: "2026-01-02T00:00:01.000Z", state: "EXECUTABLE" } }), "utf8")
  const continuation = {
    continueDefault() { calls.default++; calls.dispatch++; return Object.freeze({ binding_ref: "binding-1" }) },
    continueAlternativeAt(index) { calls.alternative.push(index); if (rejectAlternative) throw error("CT_SUPPORT_WORK_NOT_NAMED"); calls.dispatch++; return Object.freeze({ binding_ref: "binding-2" }) },
  }
  const proposals = { read() { calls.read++; return { ...JSON.parse(readFileSync(record, "utf8")), continuation } } }
  const loop = createParkedLoop({ parking: { park() {} }, decisionRequests: { emit() {} }, proposals, now: () => Date.parse("2026-01-02T00:00:00.000Z") })
  return { calls, loop, bytes: () => readFileSync(record, "utf8"), dispose: () => rmSync(root, { recursive: true, force: true }) }
}

describe("independent continuation", () => {
  test("uses exactly one opaque default or named-alternative capability against byte-backed proposal records", () => {
    const primary = executable(), alternative = executable()
    try {
      const primaryBefore = primary.bytes(), alternativeBefore = alternative.bytes()
      expect(primary.loop.continueIndependent({ proposal_ref: "ref", expected, selection: { kind: "DEFAULT" } })).toEqual({ binding_ref: "binding-1" })
      expect(alternative.loop.continueIndependent({ proposal_ref: "ref", expected, selection: { kind: "ALTERNATIVE", index: 2 } })).toEqual({ binding_ref: "binding-2" })
      expect(primary.bytes()).toBe(primaryBefore)
      expect(alternative.bytes()).toBe(alternativeBefore)
      expect(primary.calls).toEqual({ read: 1, default: 1, alternative: [], dispatch: 1 })
      expect(alternative.calls).toEqual({ read: 1, default: 0, alternative: [2], dispatch: 1 })
    } finally { primary.dispose(); alternative.dispose() }
  })

  test("leaves dispatch at zero and byte-backed proposal unchanged when the opaque capability rejects an unnamed alternative", () => {
    const f = executable({ rejectAlternative: true })
    try {
      const before = f.bytes()
      throwsCode(() => f.loop.continueIndependent({ proposal_ref: "ref", expected, selection: { kind: "ALTERNATIVE", index: 8 } }), "CT_SUPPORT_WORK_NOT_NAMED")
      expect(f.bytes()).toBe(before)
      expect(f.calls).toEqual({ read: 1, default: 0, alternative: [8], dispatch: 0 })
    } finally { f.dispose() }
  })

  test("returns frozen PARKED for NO_SCOPE without accessing continuation or accepting work input", () => {
    const root = mkdtempSync(join(tmpdir(), "ct-no-scope-")), record = join(root, "proposal.json"), calls = { read: 0 }
    writeFileSync(record, JSON.stringify({ boundary: { caller_role: "MAIN", ...expected, expires_at: "2026-01-02T00:00:01.000Z", state: "NO_SCOPE" } }), "utf8")
    const loop = createParkedLoop({ parking: { park() {} }, decisionRequests: { emit() {} }, proposals: { read() { calls.read++; return { ...JSON.parse(readFileSync(record, "utf8")), get continuation() { throw error("FORBIDDEN_CONTINUATION") } } } }, now: () => Date.parse("2026-01-02T00:00:00.000Z") })
    try {
      const before = readFileSync(record, "utf8"), outcome = loop.continueIndependent({ proposal_ref: "ref", expected, selection: { kind: "DEFAULT" } })
      expect(outcome).toEqual({ state: "PARKED", reason: "NO_SCOPE" })
      expect(Object.isFrozen(outcome)).toBe(true)
      expect(readFileSync(record, "utf8")).toBe(before)
      expect(calls).toEqual({ read: 1 })
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
})
