import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

import { RUNTIME_PAYLOAD_FILES } from "../../install/runtime-payload.mjs"
import { RUNTIME_PAYLOAD_ASSETS, RUNTIME_PAYLOAD_ROOTS, computePayloadClosure, renderRuntimePayloadDeclaration, runtimePayloadDrift } from "../../scripts/payload-closure.mjs"

const repoRoot = resolve(import.meta.dir, "../..")
const fixtures = []

const fixture = (files) => {
  const root = mkdtempSync(join(tmpdir(), "ct-payload-closure-"))
  fixtures.push(root)
  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, contents)
  }
  return root
}

afterEach(() => fixtures.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

describe("author-time runtime payload closure", () => {
  test("declares only bin/torre as an explicit non-JavaScript asset", () => {
    expect(RUNTIME_PAYLOAD_ASSETS).toEqual(["bin/torre"])
  })

  test("declares exactly the four approved runtime roots", () => {
    expect(RUNTIME_PAYLOAD_ROOTS).toEqual([
      "install/active-pointer.mjs",
      "install/lifecycle.mjs",
      "core.mjs",
      "hosts/launch-worker-cli.mjs",
    ])
  })

  test("resolves transitive static relative imports in stable sorted order", () => {
    const root = fixture({
      "entry.mjs": [
        'import "./z.mjs"',
        'import value from "node:path"',
        'export { child } from "./nested/child.mjs"',
        'const ignored = import("./dynamic.mjs")',
      ].join("\n"),
      "z.mjs": 'import "./nested/leaf.mjs"\n',
      "nested/child.mjs": 'throw new Error("analyzed modules must not execute")\nexport const child = true\n',
      "nested/leaf.mjs": "export const leaf = true\n",
    })

    expect(computePayloadClosure(root, { roots: ["entry.mjs"] })).toEqual([
      "entry.mjs",
      "nested/child.mjs",
      "nested/leaf.mjs",
      "z.mjs",
    ])
  })

  test("is deterministic and byte-idempotent", () => {
    const root = fixture({
      "entry.mjs": 'import "./dependency.mjs"\n',
      "dependency.mjs": "export const dependency = true\n",
    })

    const first = JSON.stringify(computePayloadClosure(root, { roots: ["entry.mjs"] }))
    const second = JSON.stringify(computePayloadClosure(root, { roots: ["entry.mjs"] }))
    expect(second).toBe(first)
  })

  test("fails explicitly for a missing root", () => {
    const root = fixture({})
    expect(() => computePayloadClosure(root, { roots: ["missing.mjs"] }))
      .toThrow("CT_PAYLOAD_ROOT_MISSING: missing.mjs")
  })

  test("fails explicitly for an unresolved relative import", () => {
    const root = fixture({ "entry.mjs": 'import "./missing.mjs"\n' })
    expect(() => computePayloadClosure(root, { roots: ["entry.mjs"] }))
      .toThrow("CT_PAYLOAD_IMPORT_UNRESOLVED: entry.mjs -> ./missing.mjs")
  })

  test("computes the repository closure from the declared roots without executing modules", () => {
    const closure = computePayloadClosure(repoRoot)
    expect(closure).toContain("install/runtime-payload.mjs")
    expect(closure).toContain("install/dependency-environment.mjs")
    expect(closure).toContain("hosts/launch-worker-cli.mjs")
    expect(closure).not.toContain("hosts/launcher.mjs")
  })

  test("keeps the committed payload equal to the computed closure in both directions", () => {
    const closure = computePayloadClosure(repoRoot)
    expect(RUNTIME_PAYLOAD_FILES).toEqual([...RUNTIME_PAYLOAD_ASSETS, ...closure])
    expect(runtimePayloadDrift(RUNTIME_PAYLOAD_FILES, closure)).toEqual({ extras: [], missing: [] })
  })

  test("reports extra and missing payload members separately", () => {
    const closure = computePayloadClosure(repoRoot)
    const expected = [...RUNTIME_PAYLOAD_ASSETS, ...closure]
    expect(runtimePayloadDrift([...expected, "extra.mjs"], closure)).toEqual({ extras: ["extra.mjs"], missing: [] })
    expect(runtimePayloadDrift(expected.slice(1), closure)).toEqual({ extras: [], missing: ["bin/torre"] })
  })

  test("keeps the generated literal and exact regeneration command committed", () => {
    const source = readFileSync(join(repoRoot, "install/runtime-payload.mjs"), "utf8")
    expect(source).toContain(renderRuntimePayloadDeclaration(computePayloadClosure(repoRoot)))
    expect(source).toContain("BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun scripts/payload-closure.mjs --write")
  })
})
