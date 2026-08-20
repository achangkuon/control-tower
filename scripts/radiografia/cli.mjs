import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { GENERATED, measureRepository } from "./measure.mjs"
import { parseAuthored, renderReport } from "./render.mjs"

export const REPORT = "radiografia.html"
export const CACHE = ".radiografia-cache.json"
const AUTHORED = "openspec/plans/radiografia.md"

export function parseSuiteSummary(output) {
  const pass = output.match(/^\s*(\d+)\s+pass\s*$/m)
  const fail = output.match(/^\s*(\d+)\s+fail\s*$/m)
  if (!pass || !fail) return null
  const expectations = output.match(/(\d+)\s+expect\(\)\s+calls/)
  const files = output.match(/across\s+(\d+)\s+files?/)
  return {
    pass: Number(pass[1]),
    fail: Number(fail[1]),
    expectations: expectations ? Number(expectations[1]) : null,
    files: files ? Number(files[1]) : null,
  }
}

// Bun exits non-zero on a failing suite; a red suite is a result to report, not a crash.
export const runSuite = (root) => {
  const run = spawnSync("bun", ["test"], { cwd: root, encoding: "utf8", timeout: 600_000 })
  return parseSuiteSummary(`${run.stdout ?? ""}\n${run.stderr ?? ""}`)
}

// Both generated files must be ignored for the report to be stable: a tracked report would
// dirty the tree it is measuring, and every regeneration would change the commit it names.
const ensureIgnored = (root) => {
  const path = join(root, ".gitignore")
  const body = existsSync(path) ? readFileSync(path, "utf8") : ""
  const lines = body.split("\n").map((line) => line.trim())
  const missing = GENERATED.filter((name) => !lines.includes(`/${name}`) && !lines.includes(name))
  if (!missing.length) return
  const block = `${body && !body.endsWith("\n") ? "\n" : ""}# Generado por scripts/radiografia.mjs — no se commitea\n${missing.map((name) => `/${name}`).join("\n")}\n`
  writeFileSync(path, `${body}${block}`)
}

export function radiografia({ root, suite = null, check = false, out = REPORT } = {}) {
  const authoredPath = join(root, AUTHORED)
  if (!existsSync(authoredPath)) {
    throw Object.assign(new Error(`CT_RADIOGRAFIA_NO_AUTHORED: missing ${AUTHORED}`), { code: "CT_RADIOGRAFIA_NO_AUTHORED" })
  }

  // Recording happens before measuring so the render sees the run it just performed.
  let recorded = false
  if (suite && !check) {
    const summary = suite(root)
    if (summary) {
      const head = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim()
      writeFileSync(join(root, CACHE), `${JSON.stringify({ ...summary, head, measured_at: new Date().toISOString() }, null, 2)}\n`)
      recorded = true
    }
  }

  ensureIgnored(root)
  const doc = parseAuthored(readFileSync(authoredPath, "utf8"))
  const measurements = measureRepository(root, { judgmentSha: doc.meta.verified_against })
  const html = renderReport(doc, measurements)
  const target = join(root, out)
  const current = existsSync(target) ? readFileSync(target, "utf8") : null

  // The timestamp changes on every run, so freshness compares everything except it.
  const withoutClock = (text) => text?.replace(/^\s*<span>\d{4}-\d{2}-\d{2}<\/span>$/m, "").replace(/Medido automáticamente el \d{4}-\d{2}-\d{2}/, "")
  const stale = withoutClock(current) !== withoutClock(html)

  if (check) return { written: false, stale, path: target }
  if (stale) writeFileSync(target, html)
  return { written: true, stale, recorded, path: target, measurements }
}
