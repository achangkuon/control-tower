import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { RUNTIME_PAYLOAD_FILES, readRuntimePayload, validateRuntimePayload } from "../../install/runtime-payload.mjs"

const roots = []
const CANONICAL_RUNTIME_PAYLOAD = [
  "bin/torre",
  "core.mjs",
  "hosts/herdr.mjs",
  "hosts/launcher.mjs",
  "hosts/launch-worker-cli.mjs",
  "hosts/launch-worker.mjs",
  "hosts/opencode-launcher.mjs",
  "hosts/production-provider.mjs",
  "install/active-pointer.mjs",
  "install/lifecycle.mjs",
  "install/runtime-payload.mjs",
  "install/version-store.mjs",
  "jornada/lifecycle.mjs",
  "main-store/launch-consumer.mjs",
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
