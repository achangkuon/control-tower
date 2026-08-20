import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import {
  measureRepository,
  parseGlobalProgress,
  parsePlanTable,
  parseQueue,
  readTestCache,
} from "../../scripts/radiografia/measure.mjs"

const roots = []
const git = (root, ...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim()
const write = (root, path, body) => {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), body)
}
const repo = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-radiografia-")); roots.push(root)
  git(root, "init", "-q", "-b", "master")
  git(root, "config", "user.email", "test@example.com"); git(root, "config", "user.name", "Test")
  return root
}
const commit = (root, message) => { git(root, "add", "-A"); git(root, "commit", "-qm", message); return git(root, "rev-parse", "HEAD") }
afterEach(() => { while (roots.length) rmSync(roots.pop(), { recursive: true, force: true }) })

const PLAN_TABLE = `
| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P2 | Contratos | 🔵 EN CURSO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 67% (6/9 S) | — | Maintainer | \`S8.9\` 🟢 LISTO | [STATUS](plan-8/STATUS.md) |
`

describe("parsePlanTable", () => {
  test("reads id, name, state, and the fraction the percentage derives from", () => {
    const plans = parsePlanTable(PLAN_TABLE)
    expect(plans).toHaveLength(3)
    expect(plans[0]).toMatchObject({ id: "P0", name: "Documentación canónica", state: "COMPLETO", closed: 3, total: 3, pct: 100 })
    expect(plans[2]).toMatchObject({ id: "P8", state: "EN CURSO", closed: 6, total: 9, pct: 67 })
  })

  test("keeps a plan without an enumerable denominator instead of inventing one", () => {
    const [, p2] = parsePlanTable(PLAN_TABLE)
    expect(p2.id).toBe("P2")
    expect(p2.closed).toBeNull()
    expect(p2.total).toBeNull()
    expect(p2.pct).toBeNull()
    expect(p2.unmeasured_reason).toContain("sin Sesiones enumeradas")
  })

  test("returns a frozen list and rejects a document with no plan table", () => {
    expect(Object.isFrozen(parsePlanTable(PLAN_TABLE))).toBe(true)
    expect(() => parsePlanTable("# sin tabla\n")).toThrow(/CT_RADIOGRAFIA_NO_PLAN_TABLE/)
  })
})

describe("parseQueue", () => {
  test("reads the ordered execution queue", () => {
    const queue = parseQueue("## 🎯 Cola de ejecución\n\n`#1 S5.2` · `#2 S8.9` · `#3 S4.4` — recalculada hoy.\n")
    expect(queue).toEqual([{ pos: 1, session: "S5.2" }, { pos: 2, session: "S8.9" }, { pos: 3, session: "S4.4" }])
  })

  test("returns an empty queue rather than guessing when the section is absent", () => {
    expect(parseQueue("# nada\n")).toEqual([])
  })
})

describe("parseGlobalProgress", () => {
  test("reads both figures, never collapsing them into one", () => {
    const line = "**Avance global**: 3/11 Planes cerrados (27%) · Sesiones cerradas en planes activos: 35/50 (70%)."
    expect(parseGlobalProgress(line)).toEqual({ plans_closed: 3, plans_total: 11, sessions_closed: 35, sessions_total: 50 })
  })

  test("fails closed when the line is missing", () => {
    expect(() => parseGlobalProgress("# nada\n")).toThrow(/CT_RADIOGRAFIA_NO_GLOBAL_PROGRESS/)
  })
})

describe("readTestCache", () => {
  test("reports a cache recorded at a different commit as stale, never as current", () => {
    const root = repo()
    write(root, "README.md", "seed\n")
    const head = commit(root, "seed")
    write(root, ".radiografia-cache.json", JSON.stringify({ head: "0".repeat(40), pass: 862, fail: 0, expectations: 5173, files: 62, measured_at: "2026-08-20T00:00:00Z" }))
    const cache = readTestCache(root, head)
    expect(cache.pass).toBe(862)
    expect(cache.at_head).toBe(false)
    expect(cache.recorded_head).toBe("0".repeat(40))
  })

  test("marks a cache recorded at HEAD as current", () => {
    const root = repo()
    write(root, "README.md", "seed\n")
    const head = commit(root, "seed")
    write(root, ".radiografia-cache.json", JSON.stringify({ head, pass: 5, fail: 0, expectations: 9, files: 1, measured_at: "2026-08-20T00:00:00Z" }))
    expect(readTestCache(root, head).at_head).toBe(true)
  })

  test("returns null when no suite has ever been recorded, instead of reporting zero passing", () => {
    const root = repo()
    write(root, "README.md", "seed\n")
    expect(readTestCache(root, commit(root, "seed"))).toBeNull()
  })
})

describe("measureRepository", () => {
  const seed = (root) => {
    write(root, "openspec/plans/master-index.md", `# Índice\n\n## 🎯 Cola de ejecución\n\n\`#1 S5.2\` · \`#2 S8.9\` — hoy.\n\n**Avance global**: 3/11 Planes cerrados (27%) · Sesiones cerradas en planes activos: 35/50 (70%).\n${PLAN_TABLE}`)
    write(root, "core.mjs", "export const a = 1\n")
    write(root, "install/runtime-payload.mjs", 'export const RUNTIME_PAYLOAD_FILES = [\n  "core.mjs",\n]\n')
    write(root, "contracts/unwired.mjs", "export const b = 2\nexport const c = 3\n")
    write(root, "scripts/radiografia.mjs", "// tooling, not product\n")
    write(root, "test/sample.test.mjs", "test('x', () => {})\n")
  }

  test("measures code, plans, and git state from the repository itself", () => {
    const root = repo(); seed(root)
    const head = commit(root, "docs(plans): seed")
    const m = measureRepository(root)
    expect(m.git.head).toBe(head)
    expect(m.git.clean).toBe(true)
    expect(m.global).toEqual({ plans_closed: 3, plans_total: 11, sessions_closed: 35, sessions_total: 50 })
    expect(m.queue).toHaveLength(2)
    expect(m.plans).toHaveLength(3)
    expect(m.code.installed_files).toBe(1)
    expect(m.code.installed_lines).toBe(1)
    expect(Object.isFrozen(m)).toBe(true)
  })

  test("excludes tooling and tests from the product count so the installed share is not flattered", () => {
    const root = repo(); seed(root); commit(root, "docs(plans): seed")
    const m = measureRepository(root)
    expect(m.code.product_files).toBe(3)
    expect(m.code.product_lines).toBe(6)
    expect(m.code.installed_pct).toBe(17)
    expect(m.code.test_files).toBe(1)
  })

  test("counts the modules the installed payload does not import, which is the real gap", () => {
    const root = repo(); seed(root); commit(root, "docs(plans): seed")
    const m = measureRepository(root)
    expect(m.code.unshipped_files).toBe(2)
    expect(m.code.unshipped_imported_by_payload).toBe(0)
  })

  test("resolves a payload import to a repo path instead of matching on the file name", () => {
    const root = repo(); seed(root)
    write(root, "core.mjs", 'import { b } from "./contracts/unwired.mjs"\nexport const a = b\n')
    write(root, "policy/unwired.mjs", "export const decoy = 1\n")
    commit(root, "docs(plans): seed")
    const m = measureRepository(root)
    expect(m.code.unshipped_files).toBe(3)
    expect(m.code.unshipped_imported_by_payload).toBe(1)
  })

  test("counts only files git tracks, so an untracked scratch file never inflates the product", () => {
    const root = repo(); seed(root); commit(root, "docs(plans): seed")
    const before = measureRepository(root).code.product_files
    write(root, "scratch-notes.mjs", "export const noise = 1\n".repeat(200))
    expect(measureRepository(root).code.product_files).toBe(before)
  })

  test("never walks into a dot-directory that only holds agent or tool configuration", () => {
    const root = repo(); seed(root)
    write(root, ".opencode/plugin/vendored.mjs", "export const vendored = 1\n".repeat(50))
    commit(root, "docs(plans): seed")
    expect(measureRepository(root).code.product_files).toBe(3)
  })

  test("separates documentation commits from code commits over the recent window", () => {
    const root = repo(); seed(root)
    commit(root, "docs(plans): seed")
    write(root, "core.mjs", "export const a = 2\n"); commit(root, "fix(core): bump")
    write(root, "openspec/plans/notes.md", "x\n"); commit(root, "docs(plans): note")
    const m = measureRepository(root)
    expect(m.git.recent).toMatchObject({ docs: 2, code: 1, total: 3 })
  })

  test("reports a dirty tree as dirty so a stale render is never signed as verified", () => {
    const root = repo(); seed(root); commit(root, "docs(plans): seed")
    write(root, "core.mjs", "export const a = 99\n")
    expect(measureRepository(root).git.clean).toBe(false)
  })
})

describe("measureRepository — judgment drift", () => {
  const seedFor = (root) => {
    write(root, "openspec/plans/master-index.md", `# Índice\n\n**Avance global**: 1/2 Planes cerrados (50%) · Sesiones cerradas en planes activos: 1/2 (50%).\n${PLAN_TABLE}`)
    write(root, "core.mjs", "export const a = 1\n")
    write(root, "openspec/plans/radiografia.md", "---\nverified_against: x\n---\n")
  }

  test("does not call the judgment drifted when the only commit since touched the judgment itself", () => {
    const root = repo(); seedFor(root)
    const stamped = commit(root, "docs(plans): seed")
    write(root, "openspec/plans/radiografia.md", "---\nverified_against: y\n---\n\nrevisado\n")
    commit(root, "docs(radiografia): actualizar el juicio")
    const drift = measureRepository(root, { judgmentSha: stamped }).git.judgment
    expect(drift.known).toBe(true)
    expect(drift.drifted).toBe(false)
  })

  test("calls the judgment drifted when product code landed after it was written", () => {
    const root = repo(); seedFor(root)
    const stamped = commit(root, "docs(plans): seed")
    write(root, "core.mjs", "export const a = 2\n")
    commit(root, "fix(core): bump")
    const drift = measureRepository(root, { judgmentSha: stamped }).git.judgment
    expect(drift.drifted).toBe(true)
    expect(drift.commits).toBe(1)
  })

  test("treats a stamp the repository does not contain as unknown, never as current", () => {
    const root = repo(); seedFor(root); commit(root, "docs(plans): seed")
    const drift = measureRepository(root, { judgmentSha: "0".repeat(40) }).git.judgment
    expect(drift.known).toBe(false)
    expect(drift.drifted).toBe(true)
  })
})

// Formatos reales tomados de Finanzas-Personales, Servi-Task-U y ecom-ecuador.
describe("parsePlanTable — variantes reales de otros proyectos", () => {
  test("reads a state cell that carries a dash-appended note without swallowing it into the state", () => {
    const table = "| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |\n|--|--|--|--|--|--|--|--|\n| P6 | Calendario | 🔵 EN CURSO — S6.6 bloqueada por gate manual | 83% (5/6 S) | — | Daniel | x | [c](y) |\n"
    const [plan] = parsePlanTable(table)
    expect(plan.state).toBe("EN CURSO")
    expect(plan.state_note).toBe("S6.6 bloqueada por gate manual")
  })

  test("treats a bare percentage with no session fraction as unmeasured, because the standard derives it", () => {
    const table = "| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |\n|--|--|--|--|--|--|--|--|\n| P1 | Backend | 📚 ARCHIVADO | 100% | 4.5–5 h | — | — | [p](q) |\n"
    const [plan] = parsePlanTable(table)
    expect(plan.pct).toBeNull()
    expect(plan.closed).toBeNull()
    expect(plan.unmeasured_reason).toMatch(/sin fracción/i)
  })

  test("recognises every state in the closed vocabulary of seven", () => {
    const states = ["📋 PLANIFICADO", "🟢 LISTO", "🔵 EN CURSO", "🔴 BLOQUEADO", "🟡 DIFERIDO", "✅ COMPLETO", "📚 ARCHIVADO"]
    const rows = states.map((state, index) => `| P${index} | Plan | ${state} | 50% (1/2 S) | — | — | — | [r](s) |`).join("\n")
    const parsed = parsePlanTable(`| ID |\n|--|\n${rows}\n`)
    expect(parsed.map((plan) => plan.state)).toEqual(["PLANIFICADO", "LISTO", "EN CURSO", "BLOQUEADO", "DIFERIDO", "COMPLETO", "ARCHIVADO"])
  })
})

describe("parseGlobalProgress — variantes reales", () => {
  test("reads the colon inside the bold, as three of the five projects write it", () => {
    const line = "**Avance global:** 3/5 Planes cerrados (60%) · Sesiones cerradas en Planes activos: 4/13 (31%)."
    expect(parseGlobalProgress(line)).toEqual({ plans_closed: 3, plans_total: 5, sessions_closed: 4, sessions_total: 13 })
  })

  test("reads a much larger portfolio without truncating either figure", () => {
    const line = "**Avance global**: 15/26 Planes cerrados (58%) · Sesiones cerradas en planes activos: 20/68 (29%)."
    expect(parseGlobalProgress(line)).toEqual({ plans_closed: 15, plans_total: 26, sessions_closed: 20, sessions_total: 68 })
  })
})
