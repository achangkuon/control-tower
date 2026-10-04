import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { parseSuiteSummary, radiografia } from "../radiografia/cli.mjs"
import { defaults } from "../radiografia/config.mjs"

// Radar is a separate tool with its own toolchain; the CLI's contract with it is
// the JSON on stdout, so the fixture project ships a stand-in that prints one.
const RADAR_STUB = `import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
const here = dirname(new URL(import.meta.url).pathname)
const fixture = JSON.parse(readFileSync(join(here, "radar-fixture.json"), "utf8"))
process.stdout.write(fixture.stdout)
`

const SNAPSHOT = {
  schema: "radar.snapshot/v1",
  producto: "fixture",
  head: "0".repeat(40),
  avance: { cerradas: 35, total: 50 },
  zonas: [
    { id: "contratos", nombre: "Contratos", cerradas: 3, total: 3, cola: [] },
    { id: "hosts", nombre: "Hosts", cerradas: 2, total: 9, cola: [{ posicion: 1, sesion: "S5.2", estado: "LISTO", resultado: "Parking y retoma del loop" }] },
  ],
  sesiones: [{ id: "S5.2", zona: "hosts", estado: "LISTO", resultado: "Parking y retoma del loop" }],
  asientos: ["hosts"],
  territorio_pendiente: 0,
}

const roots = []
const git = (root, ...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim()
const write = (root, path, body) => {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), body)
}
const project = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-radiografia-cli-")); roots.push(root)
  git(root, "init", "-q", "-b", "master")
  git(root, "config", "user.email", "test@example.com"); git(root, "config", "user.name", "Test")
  write(root, ".gitignore", ".radar-stub/\n")
  write(root, ".radar-stub/radar-stub.mjs", RADAR_STUB)
  write(root, ".radar-stub/radar-fixture.json", JSON.stringify({ stdout: `${JSON.stringify(SNAPSHOT)}\n` }))
  write(root, "openspec/plan.yaml", "schema: plan\nschema_version: 3\nproducto: fixture\n")
  write(root, "core.mjs", "export const a = 1\n")
  write(root, "install/runtime-payload.mjs", 'export const RUNTIME_PAYLOAD_FILES = [\n  "core.mjs",\n]\n')
  write(root, "radiografia.json", JSON.stringify({
    project: "Fixture",
    title: "Radiografía de prueba",
    radar: { command: ["bun", ".radar-stub/radar-stub.mjs"], cwd: "." },
    payload: { manifest: "install/runtime-payload.mjs" },
  }))
  write(root, "openspec/plans/radiografia.md", "---\nverified_against: pendiente\nverified_at: 2026-08-20\nstandfirst: Semilla.\n---\n\n{{instrumentos}}\n\n## Avance\n\n{{avance}}\n")
  git(root, "add", "-A"); git(root, "commit", "-qm", "docs(plan): seed")
  return root
}
afterEach(() => { while (roots.length) rmSync(roots.pop(), { recursive: true, force: true }) })

describe("parseSuiteSummary", () => {
  test("reads pass, fail, expectations and file count from bun test output", () => {
    const output = "bun test v1.3.14\n\n 862 pass\n 0 fail\n 5173 expect() calls\nRan 862 tests across 62 files. [64.67s]\n"
    expect(parseSuiteSummary(output)).toEqual({ pass: 862, fail: 0, expectations: 5173, files: 62 })
  })

  test("reads a failing run without rounding the failures away", () => {
    const output = " 100 pass\n 3 fail\n 900 expect() calls\nRan 103 tests across 10 files. [1.00s]\n"
    expect(parseSuiteSummary(output)).toMatchObject({ pass: 100, fail: 3 })
  })

  test("returns null when the output has no summary, instead of guessing zero", () => {
    expect(parseSuiteSummary("segmentation fault\n")).toBeNull()
  })
})

describe("radiografia", () => {
  test("writes a self-contained report measured against the current commit", () => {
    const root = project()
    const result = radiografia({ root })
    expect(result.written).toBe(true)
    const html = readFileSync(join(root, "radiografia.html"), "utf8")
    expect(html).toContain("<title>Radiografía de prueba</title>")
    expect(html).toContain(git(root, "rev-parse", "--short", "HEAD"))
    expect(html).toContain("Documentación")
  })

  test("keeps the generated report out of git, because it is a build artifact", () => {
    const root = project()
    radiografia({ root })
    expect(git(root, "status", "--porcelain", "--", "radiografia.html")).toBe("")
  })

  test("reports the suite as unmeasured when no run has ever been recorded", () => {
    const root = project()
    radiografia({ root })
    expect(readFileSync(join(root, "radiografia.html"), "utf8")).toContain("sin medir")
  })

  test("records a suite result so the next render can report it", () => {
    const root = project()
    radiografia({ root, suite: () => ({ pass: 12, fail: 0, expectations: 40, files: 3 }) })
    const cache = JSON.parse(readFileSync(join(root, ".radiografia-cache.json"), "utf8"))
    expect(cache).toMatchObject({ pass: 12, head: git(root, "rev-parse", "HEAD") })
    expect(readFileSync(join(root, "radiografia.html"), "utf8")).toContain("12")
  })

  test("still writes a report when the suite cannot be summarised, and says so", () => {
    const root = project()
    const result = radiografia({ root, suite: () => null })
    expect(result.written).toBe(true)
    expect(existsSync(join(root, ".radiografia-cache.json"))).toBe(false)
    expect(readFileSync(join(root, "radiografia.html"), "utf8")).toContain("sin medir")
  })

  test("reports the suite as unmeasured when the run has no summary and no cache exists", () => {
    const root = project()
    const result = radiografia({ root, suite: () => null })
    expect(result.measurements.tests).toBeNull()
  })

  test("invalidates the previous green when a new run on the same HEAD has no summary", () => {
    const root = project()
    radiografia({ root, suite: () => ({ pass: 12, fail: 0, expectations: 40, files: 3 }) })
    const result = radiografia({ root, suite: () => null })
    expect(result.measurements.tests).toBeNull()
    expect(readFileSync(join(root, "radiografia.html"), "utf8")).not.toContain("tests en verde")
    // The invalidation must survive a later render that does not run the suite at all.
    expect(radiografia({ root }).measurements.tests).toBeNull()
  })

  test("keeps a red summary red instead of invalidating it", () => {
    const root = project()
    const result = radiografia({ root, suite: () => ({ pass: 100, fail: 3, expectations: 900, files: 10 }) })
    expect(result.measurements.tests).toMatchObject({ pass: 100, fail: 3, at_head: true })
  })

  test("updates the recorded summary when a later run does produce one", () => {
    const root = project()
    radiografia({ root, suite: () => ({ pass: 12, fail: 0, expectations: 40, files: 3 }) })
    const result = radiografia({ root, suite: () => ({ pass: 20, fail: 1, expectations: 55, files: 4 }) })
    expect(result.measurements.tests).toMatchObject({ pass: 20, fail: 1, expectations: 55, at_head: true })
    expect(JSON.parse(readFileSync(join(root, ".radiografia-cache.json"), "utf8"))).toMatchObject({ pass: 20, fail: 1 })
  })

  test("leaves a record from another commit untouched when the new run has no summary", () => {
    const root = project()
    radiografia({ root, suite: () => ({ pass: 12, fail: 0, expectations: 40, files: 3 }) })
    write(root, "contracts/nuevo.mjs", "export const nuevo = 1\n")
    git(root, "add", "-A"); git(root, "commit", "-qm", "feat(contracts): add")
    const result = radiografia({ root, suite: () => null })
    expect(result.measurements.tests).toMatchObject({ pass: 12, at_head: false })
  })

  test("check mode reports staleness without writing anything", () => {
    const root = project()
    radiografia({ root })
    const before = readFileSync(join(root, "radiografia.html"), "utf8")
    write(root, "contracts/nuevo.mjs", "export const nuevo = 1\n")
    git(root, "add", "-A"); git(root, "commit", "-qm", "feat(contracts): add")
    const result = radiografia({ root, check: true })
    expect(result.written).toBe(false)
    expect(result.stale).toBe(true)
    expect(readFileSync(join(root, "radiografia.html"), "utf8")).toBe(before)
  })

  test("check mode is quiet when the report already matches the repository", () => {
    const root = project()
    radiografia({ root })
    expect(radiografia({ root, check: true })).toMatchObject({ written: false, stale: false })
  })
})
