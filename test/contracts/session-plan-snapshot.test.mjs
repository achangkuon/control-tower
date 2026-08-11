import { describe, expect, test } from "bun:test"

import { digestArtifact } from "../../contracts/canonicalize.mjs"
import { ContractError } from "../../contracts/errors.mjs"

const source = `# Plan

## Sesión 5.6 — Canonical identity

**Estado:** 🟢 LISTO
**Depende de:** —
**Área:** \`contracts/session-plan-snapshot.mjs\`
**Recurso:** canonical contract registry
**Decisiones:** —

**Criterios de aceptación de S5.6**

- [ ] Exact bytes remain authoritative.
`
const bytes = Buffer.from(source)
const loadParser = () => import("../../contracts/session-plan-snapshot.mjs")
const captured = async (operation) => {
  try { await operation() } catch (error) { return error }
  return null
}

describe("session plan snapshot identity", () => {
  test("initializes the parser and validator in either Bun ESM import order", () => {
    const imports = [
      `await import("./contracts/session-plan-snapshot.mjs"); await import("./contracts/validate.mjs")`,
      `await import("./contracts/validate.mjs"); await import("./contracts/session-plan-snapshot.mjs")`,
    ]
    for (const script of imports) {
      const result = Bun.spawnSync({ cmd: ["bun", "-e", script], cwd: process.cwd(), stdout: "pipe", stderr: "pipe" })
      expect(result.exitCode).toBe(0)
    }
  })

  test("binds exact raw bytes and a distinct self-excluding snapshot digest", async () => {
    const { parseSessionPlanSnapshot, sessionPlanSnapshotDigest } = await loadParser()
    const snapshot = parseSessionPlanSnapshot({ plan_bytes: bytes, target_session_id: "S5.6" })

    expect(snapshot.source.content_digest).toBe(digestArtifact(bytes, "raw-bytes"))
    const otherBytes = Buffer.from(source.replace("Canonical identity", "Second canonical identity"))
    const other = parseSessionPlanSnapshot({ plan_bytes: otherBytes, target_session_id: "S5.6" })
    expect(snapshot.snapshot_digest).toBe(sessionPlanSnapshotDigest(snapshot))
    expect(snapshot.snapshot_digest).not.toBe(snapshot.source.content_digest)
    expect(other.snapshot_digest).not.toBe(snapshot.snapshot_digest)
    expect(Object.isFrozen(snapshot.target.acceptance_criteria[0])).toBe(true)
  })

  test("rejects one-byte drift and a stale claimed source digest", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const expected = digestArtifact(bytes, "raw-bytes")
    const drifted = Buffer.concat([bytes, Buffer.from(" ")])
    const error = await captured(() => parseSessionPlanSnapshot({
      plan_bytes: drifted, target_session_id: "S5.6", expected_plan_digest: expected,
    }))

    expect(error).toBeInstanceOf(ContractError)
    expect(error.code).toBe("CT_SCHEMA_INVALID")
    expect(Object.isFrozen(error)).toBe(true)
  })

  test("accepts Buffer bytes and rejects fatal UTF-8 without mutating input", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const invalid = Buffer.from([0xc3, 0x28])
    const before = Buffer.from(invalid)
    const error = await captured(() => parseSessionPlanSnapshot({ plan_bytes: invalid, target_session_id: "S5.6" }))

    expect(error.code).toBe("CT_SCHEMA_INVALID")
    expect(invalid).toEqual(before)
  })

  test("rejects a missing target or required identity field without a partial snapshot", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const missingTarget = await captured(() => parseSessionPlanSnapshot({ plan_bytes: bytes, target_session_id: "S5.7" }))
    const missingResource = Buffer.from(source.replace("**Recurso:** canonical contract registry\n", ""))
    const incomplete = await captured(() => parseSessionPlanSnapshot({ plan_bytes: missingResource, target_session_id: "S5.6" }))

    expect(missingTarget.code).toBe("CT_SCHEMA_INVALID")
    expect(incomplete.code).toBe("CT_SCHEMA_INVALID")
  })
})
