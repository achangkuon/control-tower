import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { generatedPaths, measureRepository } from "./measure.mjs"
import { loadConfig } from "./config.mjs"
import { parseAuthored, renderReport } from "./render.mjs"


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
export const runSuite = (root, config) => {
  const command = config?.tests?.command
  if (!command?.length) return null
  const run = spawnSync(command[0], command.slice(1), { cwd: root, encoding: "utf8", timeout: 600_000 })
  return parseSuiteSummary(`${run.stdout ?? ""}\n${run.stderr ?? ""}`)
}

// Both generated files must be ignored for the report to be stable: a tracked report would
// dirty the tree it is measuring, and every regeneration would change the commit it names.
const ensureIgnored = (root, generated) => {
  const path = join(root, ".gitignore")
  const body = existsSync(path) ? readFileSync(path, "utf8") : ""
  const lines = body.split("\n").map((line) => line.trim())
  const missing = generated.filter((name) => !lines.includes(`/${name}`) && !lines.includes(name))
  if (!missing.length) return
  const block = `${body && !body.endsWith("\n") ? "\n" : ""}# Generado por scripts/radiografia.mjs — no se commitea\n${missing.map((name) => `/${name}`).join("\n")}\n`
  writeFileSync(path, `${body}${block}`)
}

// A run without a summary is «sin medir», never the previous green. The stale record is
// only relevant when it belongs to the HEAD being measured: another commit's history is
// left untouched so the cross-commit display keeps its own warning.
const cacheRecordsHead = (root, cacheFile, head) => {
  const path = join(root, cacheFile)
  if (!existsSync(path)) return false
  try { return JSON.parse(readFileSync(path, "utf8"))?.head === head } catch { return false }
}

export function radiografia({ root, suite = null, check = false, config = null } = {}) {
  const cfg = config ?? loadConfig(root)
  const authoredPath = join(root, cfg.judgment)
  if (!existsSync(authoredPath)) {
    throw Object.assign(new Error(`CT_RADIOGRAFIA_NO_AUTHORED: missing ${cfg.judgment}`), { code: "CT_RADIOGRAFIA_NO_AUTHORED" })
  }

  // Recording happens before measuring so the render sees the run it just performed.
  const cachePath = join(root, cfg.cache)
  let recorded = false
  if (suite && !check) {
    const summary = suite(root, cfg)
    const head = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim()
    if (summary) {
      writeFileSync(cachePath, `${JSON.stringify({ ...summary, head, measured_at: new Date().toISOString() }, null, 2)}\n`)
      recorded = true
    } else if (cacheRecordsHead(root, cfg.cache, head)) {
      // Keep the record's full shape but null the measurement: readTestCache ignores a
      // non-numeric pass, so the same HEAD now reports «sin medir» instead of the old green.
      const invalidated = { pass: null, fail: null, expectations: null, files: null, no_summary: true, head, measured_at: new Date().toISOString() }
      writeFileSync(cachePath, `${JSON.stringify(invalidated, null, 2)}\n`)
    }
  }

  ensureIgnored(root, generatedPaths(cfg))
  const doc = parseAuthored(readFileSync(authoredPath, "utf8"))
  const measurements = measureRepository(root, { config: cfg, judgmentSha: doc.meta.verified_against })
  const html = renderReport(doc, measurements)
  const target = join(root, cfg.out)
  const current = existsSync(target) ? readFileSync(target, "utf8") : null

  // The timestamp changes on every run, so freshness compares everything except it.
  const withoutClock = (text) => text?.replace(/^\s*<span>\d{4}-\d{2}-\d{2}<\/span>$/m, "").replace(/Medido automáticamente el \d{4}-\d{2}-\d{2}/, "")
  const stale = withoutClock(current) !== withoutClock(html)

  if (check) return { written: false, stale, path: target, measurements, config: cfg }
  if (stale) writeFileSync(target, html)
  return { written: true, stale, recorded, path: target, measurements, config: cfg }
}
