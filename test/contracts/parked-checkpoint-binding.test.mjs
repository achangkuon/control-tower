import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  assertParkedCheckpointBinding,
  createParkedCheckpointBinding,
  parkedCheckpointBindingDigest,
} from "../../contracts/parked-checkpoint-binding.mjs"

const fixtures = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../fixtures/contracts/schema-cases-v1.json"), "utf8"))
const inputs = () => ({
  parked_decision: fixtures.parkedDecision,
  checkpoint_capture: fixtures.checkpointCapture,
  reconciled_checkpoint: fixtures.reconciledCheckpoint,
})
const code = (operation) => { try { operation() } catch (error) { return error.code } return null }

const reseal = (binding, mutate) => {
  const changed = structuredClone(binding)
  mutate(changed)
  changed.binding_digest = parkedCheckpointBindingDigest(changed)
  return changed
}

describe("parked checkpoint binding", () => {
  test("derives the complete immutable binding from exact canonical sources", () => {
    const binding = createParkedCheckpointBinding(inputs())
    expect(binding).toEqual(fixtures.parkedCheckpointBinding)
    expect(parkedCheckpointBindingDigest(binding)).toBe(binding.binding_digest)
    expect(Object.isFrozen(binding)).toBeTrue()
    expect(binding.reconciliation_state).toBe("VALID")
  })

  test("rejects every independently resealed source mismatch and contract substitution", () => {
    const source = inputs(), binding = createParkedCheckpointBinding(source)
    for (const mutate of [
      (v) => { v.parked_decision_id = "parked-other" },
      (v) => { v.parked_decision_digest = `sha256:${"0".repeat(64)}` },
      (v) => { v.parked_checkpoint += " " },
      (v) => { v.capture_checkpoint_id = `checkpoint-${"0".repeat(64)}` },
      (v) => { v.capture_checkpoint_digest = `sha256:${"0".repeat(64)}` },
      (v) => { v.reconciled_checkpoint_id = `reconciliation-${"0".repeat(64)}` },
      (v) => { v.reconciled_checkpoint_digest = `sha256:${"0".repeat(64)}` },
      (v) => { v.reconciliation_state = "INVALID" },
      (v) => { v.repository = "/tmp/other" }, (v) => { v.project_id = "other" },
      (v) => { v.assignment_id = "other" }, (v) => { v.generation += 1 },
      (v) => { v.base_sha = "0".repeat(40) }, (v) => { v.result_sha = "0".repeat(40) },
    ]) expect(code(() => assertParkedCheckpointBinding(reseal(binding, mutate), source))).toBe("CT_SCHEMA_INVALID")

    expect(code(() => assertParkedCheckpointBinding({ ...binding, binding_digest: `sha256:${"0".repeat(64)}` }, source))).toBe("CT_SCHEMA_INVALID")
    expect(code(() => assertParkedCheckpointBinding({ ...binding, extra: true }, source))).toBe("CT_SCHEMA_INVALID")
    expect(code(() => assertParkedCheckpointBinding({ schema: "parked-checkpoint-binding", schema_version: 1, extensions: { claimed: binding } }, source))).toBe("CT_SCHEMA_INVALID")
  })
})
