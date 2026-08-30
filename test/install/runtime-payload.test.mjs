import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { RUNTIME_PAYLOAD_FILES, readRuntimePayload, validateRuntimePayload } from "../../install/runtime-payload.mjs"

const roots = []
const CANONICAL_RUNTIME_PAYLOAD = [
  "bin/torre",
  "schemas/agent-capability-registry-v1.schema.json",
  "schemas/artifact-ref-v1.schema.json",
  "schemas/assignment-v1.schema.json",
  "schemas/assignment-v2.schema.json",
  "schemas/authorization-v1.schema.json",
  "schemas/binding-delta-v1.schema.json",
  "schemas/campaign-v1.schema.json",
  "schemas/candidate-revision-v1.schema.json",
  "schemas/checkpoint-capture-v1.schema.json",
  "schemas/completed-work-binding-v1.schema.json",
  "schemas/delivery-policy-v1.schema.json",
  "schemas/delivery-record-v1.schema.json",
  "schemas/jornada-v1.schema.json",
  "schemas/parked-checkpoint-binding-v1.schema.json",
  "schemas/parked-decision-response-v1.schema.json",
  "schemas/parked-decision-v1.schema.json",
  "schemas/plan-catalog-v1.schema.json",
  "schemas/plan-manifest-v1.schema.json",
  "schemas/policy-report-v1.schema.json",
  "schemas/policy-report-v2.schema.json",
  "schemas/project-registry-v1.schema.json",
  "schemas/reconciled-checkpoint-v1.schema.json",
  "schemas/recovery-proof-v1.schema.json",
  "schemas/session-plan-snapshot-v1.schema.json",
  "schemas/support-proposal-v1.schema.json",
  "console/executor.mjs",
  "console/validate.mjs",
  "console/vocabulary.mjs",
  "contracts/candidate-revision.mjs",
  "contracts/canonicalize.mjs",
  "contracts/completed-work-binding.mjs",
  "contracts/errors.mjs",
  "contracts/parked-checkpoint-binding.mjs",
  "contracts/parked-decision.mjs",
  "contracts/schema-registry.mjs",
  "contracts/session-plan-snapshot.mjs",
  "contracts/validate.mjs",
  "core.mjs",
  "hosts/candidate-fence.mjs",
  "hosts/epoch-enforcement.mjs",
  "hosts/herdr-topology.mjs",
  "hosts/launch-worker-cli.mjs",
  "hosts/launch-worker.mjs",
  "hosts/opencode-attach-helper.mjs",
  "hosts/opencode-credential-channel.mjs",
  "hosts/opencode-server.mjs",
  "hosts/opencode-view.mjs",
  "hosts/production-provider.mjs",
  "hosts/root-binding.mjs",
  "hosts/root-identity.mjs",
  "hosts/seat-cli.mjs",
  "install/active-pointer.mjs",
  "install/lifecycle.mjs",
  "install/runtime-payload.mjs",
  "install/version-store.mjs",
  "jornada/lifecycle.mjs",
  "main-store/launch-consumer.mjs",
  "workspace/seat-inventory.mjs",
]
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-runtime-payload-"))
  roots.push(root)
  for (const path of RUNTIME_PAYLOAD_FILES) {
    const file = join(root, path)
    mkdirSync(join(file, ".."), { recursive: true })
    writeFileSync(file, `${path}\n`)
  }
  return root
}
const payload = () => Object.fromEntries(RUNTIME_PAYLOAD_FILES.map((path) => [path, Buffer.from(`${path}\n`)]))

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

describe("runtime payload closure", () => {
  test("accepts exactly the packaged CLI and host runtime files", () => {
    expect(RUNTIME_PAYLOAD_FILES).toEqual(CANONICAL_RUNTIME_PAYLOAD)
    const files = validateRuntimePayload(payload())
    expect(Object.keys(files)).toEqual(CANONICAL_RUNTIME_PAYLOAD)
    expect(readRuntimePayload(fixture())).toEqual(files)
  })

  test("rejects every missing canonical member with a stable incomplete error", () => {
    for (const missing of RUNTIME_PAYLOAD_FILES) {
      const files = payload()
      delete files[missing]
      expect(() => validateRuntimePayload(files)).toThrow("CT_RUNTIME_PAYLOAD_INCOMPLETE")
    }
  })

  test("rejects extra, traversal, checkout-copy, node_modules, and secret members", () => {
    for (const extra of [
      "extra.mjs",
      "../core.mjs",
      "checkout/core.mjs",
      "node_modules/unsafe.mjs",
      ".env",
      ".manifest",
    ]) {
      expect(() => validateRuntimePayload({ ...payload(), [extra]: Buffer.from("unsafe") })).toThrow("CT_RUNTIME_PAYLOAD_")
    }
  })

  test("rejects a symlink in the source closure", () => {
    const root = fixture()
    rmSync(join(root, "core.mjs"))
    symlinkSync(join(root, "bin/torre"), join(root, "core.mjs"))
    expect(() => readRuntimePayload(root)).toThrow("CT_RUNTIME_PAYLOAD_")
  })

  test("rejects extra files in the source closure", () => {
    const root = fixture()
    writeFileSync(join(root, ".manifest"), "forbidden")
    expect(() => readRuntimePayload(root)).toThrow("CT_RUNTIME_PAYLOAD_")
  })
})
