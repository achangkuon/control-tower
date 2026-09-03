import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { parseSuiteSummary, radiografia } from "../radiografia/cli.mjs"
import { defaults } from "../radiografia/config.mjs"

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
  write(root, "openspec/plans/master-index.md", [
    "# Índice", "", "## 🎯 Cola de ejecución", "", "`#1 S5.2` — hoy.", "",
    "**Avance global**: 3/11 Planes cerrados (27%) · Sesiones cerradas en planes activos: 35/50 (70%).", "",
    "| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |",
    "|----|------|--------|---|------|-------|-----------|-----|",
    "| P0 | Documentación | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |", "",
  ].join("\n"))
  write(root, "core.mjs", "export const a = 1\n")
  write(root, "install/runtime-payload.mjs", 'export const RUNTIME_PAYLOAD_FILES = [\n  "core.mjs",\n]\n')
  write(root, "radiografia.json", JSON.stringify({ project: "Fixture", title: "Radiografía de prueba", payload: { manifest: "install/runtime-payload.mjs" } }))
  write(root, "openspec/plans/radiografia.md", "---\nverified_against: pendiente\nverified_at: 2026-08-20\nstandfirst: Semilla.\n---\n\n{{instrumentos}}\n\n## Avance\n\n{{avance}}\n")
  git(root, "add", "-A"); git(root, "commit", "-qm", "docs(plans): seed")
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
