import { afterEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import {
  SNAPSHOT_SCHEMA,
  measureRepository,
  readPlanSnapshot,
  readTestCache,
} from "../radiografia/measure.mjs"
import { defaults } from "../radiografia/config.mjs"

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

// A stand-in for Radar. The engine's contract with the planning tool is the JSON
// on stdout, so the tests pin exactly that boundary — asserting against a Go
// toolchain would test the toolchain, not the contract.
const RADAR_STUB = `import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
const here = dirname(new URL(import.meta.url).pathname)
writeFileSync(join(here, "radar-args.json"), JSON.stringify(process.argv.slice(2)))
const fixture = JSON.parse(readFileSync(join(here, "radar-fixture.json"), "utf8"))
if (fixture.stderr) process.stderr.write(fixture.stderr)
if (fixture.stdout !== undefined) process.stdout.write(fixture.stdout)
process.exit(fixture.exitCode ?? 0)
`

const SNAPSHOT = Object.freeze({
  schema: SNAPSHOT_SCHEMA,
  producto: "control-tower",
  head: "0".repeat(40),
  avance: { cerradas: 7, total: 14 },
  zonas: [
    // No enumerated Sesión at all: measurable progress does not exist here yet.
    { id: "archivo", nombre: "Archivo", cerradas: 0, total: 0, cola: [] },
    {
      id: "hosts", nombre: "Hosts", cerradas: 3, total: 9,
      cola: [
        { posicion: 1, sesion: "S1.2", estado: "LISTO", resultado: "Adaptador de host neutral" },
        { posicion: 2, sesion: "S1.3", estado: "PLANIFICADO", resultado: "Compatibilidad OpenCode" },
      ],
    },
    { id: "metodo", nombre: "Método", cerradas: 4, total: 5, cola: [{ posicion: 1, sesion: "S9.1", estado: "BLOQUEADO", resultado: "Ciclo de vida de asientos" }] },
  ],
  sesiones: [
    { id: "S1.2", zona: "hosts", estado: "LISTO", resultado: "Adaptador de host neutral" },
    { id: "S9.1", zona: "metodo", estado: "BLOQUEADO", resultado: "Ciclo de vida de asientos" },
  ],
  asientos: ["hosts"],
  territorio_pendiente: 2,
})

const stubRadar = (root, { snapshot = SNAPSHOT, stdout, exitCode = 0, stderr = "" } = {}) => {
  // The stub records the arguments it was called with, so it must stay outside
  // the measurement: an untracked scratch file would read as a dirty tree.
  write(root, ".gitignore", ".radar-stub/\n")
  write(root, ".radar-stub/radar-stub.mjs", RADAR_STUB)
  write(root, ".radar-stub/radar-fixture.json", JSON.stringify({
    stdout: stdout ?? `${JSON.stringify(snapshot, null, 2)}\n`,
    exitCode,
    stderr,
  }))
}

const cfg = (over = {}) => ({
  ...defaults(),
  radar: { command: ["bun", ".radar-stub/radar-stub.mjs"], cwd: "." },
  payload: { manifest: "install/runtime-payload.mjs" },
  ...over,
})

const radarArgs = (root) => JSON.parse(readFileSync(join(root, ".radar-stub/radar-args.json"), "utf8"))

describe("readPlanSnapshot", () => {
  test("asks Radar for the plan it was pointed at, in the repository being measured", () => {
    const root = repo(); stubRadar(root)
    write(root, "openspec/plan.yaml", "schema: plan\n")

    const snapshot = readPlanSnapshot(root, cfg())

    expect(snapshot.avance).toEqual({ cerradas: 7, total: 14 })
    const args = radarArgs(root)
    expect(args.slice(0, 2)).toEqual(["status", "--json"])
    expect(args).toContain("-f")
    expect(args[args.indexOf("-f") + 1]).toBe(join(root, "openspec/plan.yaml"))
    expect(args[args.indexOf("-C") + 1]).toBe(root)
  })

  test("fails closed when the plan itself is absent instead of asking Radar about nothing", () => {
    const root = repo(); stubRadar(root)
    expect(() => readPlanSnapshot(root, cfg())).toThrow(/CT_RADIOGRAFIA_NO_PLAN\b/)
  })

  test("surfaces Radar's own refusal rather than reporting numbers it declined to stand behind", () => {
    const root = repo(); stubRadar(root, { exitCode: 1, stdout: "", stderr: "✗ status no disponible: la validación falló con 3 error(es)" })
    write(root, "openspec/plan.yaml", "schema: plan\n")

    expect(() => readPlanSnapshot(root, cfg())).toThrow(/CT_RADIOGRAFIA_RADAR_FAILED/)
    expect(() => readPlanSnapshot(root, cfg())).toThrow(/validación falló con 3 error/)
  })

  test("refuses output that is not JSON instead of rendering a blank report", () => {
    const root = repo(); stubRadar(root, { stdout: "control-tower — 51% (7/14 S)\n" })
    write(root, "openspec/plan.yaml", "schema: plan\n")
    expect(() => readPlanSnapshot(root, cfg())).toThrow(/CT_RADIOGRAFIA_RADAR_BAD_JSON/)
  })

  // The schema is the whole point of asking a tool instead of parsing a document:
  // an unrecognised shape must stop, never be guessed at field by field.
  test("refuses a snapshot schema it does not know", () => {
    const root = repo(); stubRadar(root, { snapshot: { ...SNAPSHOT, schema: "radar.snapshot/v9" } })
    write(root, "openspec/plan.yaml", "schema: plan\n")
    expect(() => readPlanSnapshot(root, cfg())).toThrow(/CT_RADIOGRAFIA_RADAR_SCHEMA/)
  })

  test("returns a frozen snapshot so no consumer can edit the measured facts", () => {
    const root = repo(); stubRadar(root)
    write(root, "openspec/plan.yaml", "schema: plan\n")
    expect(Object.isFrozen(readPlanSnapshot(root, cfg()))).toBe(true)
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
    stubRadar(root)
    write(root, "openspec/plan.yaml", "schema: plan\n")
    write(root, "core.mjs", "export const a = 1\n")
    write(root, "install/runtime-payload.mjs", 'export const RUNTIME_PAYLOAD_FILES = [\n  "core.mjs",\n]\n')
    write(root, "contracts/unwired.mjs", "export const b = 2\nexport const c = 3\n")
    write(root, "scripts/tooling.mjs", "// tooling, not product\n")
    write(root, "test/sample.test.mjs", "test('x', () => {})\n")
  }

  test("measures code, Zonas, and git state from the repository itself", () => {
    const root = repo(); seed(root)
    const head = commit(root, "docs(plan): seed")
    const m = measureRepository(root, { config: cfg() })
    expect(m.git.head).toBe(head)
    expect(m.git.clean).toBe(true)
    expect(m.global).toEqual({ zonas_cerradas: 0, zonas_total: 2, sesiones_cerradas: 7, sesiones_total: 14 })
    expect(m.zonas).toHaveLength(3)
    expect(m.code.shipping.installed_files).toBe(1)
    expect(m.code.shipping.installed_lines).toBe(1)
    expect(Object.isFrozen(m)).toBe(true)
  })

  test("carries each Zona's queue so the report can say what is next without recomputing it", () => {
    const root = repo(); seed(root); commit(root, "docs(plan): seed")
    const { zonas } = measureRepository(root, { config: cfg() })
    const hosts = zonas.find((zona) => zona.id === "hosts")
    expect(hosts).toMatchObject({ nombre: "Hosts", cerradas: 3, total: 9, pct: 33 })
    expect(hosts.cola[0]).toMatchObject({ posicion: 1, sesion: "S1.2", estado: "LISTO" })
  })

  // A Zona with nothing enumerated has no auditable percentage. Reporting 0%
  // would read as "not started" and 100% as "done"; both are claims nobody made.
  test("leaves a Zona with no enumerated Sesión unmeasured instead of inventing a percentage", () => {
    const root = repo(); seed(root); commit(root, "docs(plan): seed")
    const archivo = measureRepository(root, { config: cfg() }).zonas.find((zona) => zona.id === "archivo")
    expect(archivo.pct).toBeNull()
    expect(archivo.unmeasured_reason).toMatch(/sin Sesiones enumeradas/i)
  })

  test("counts only Zonas with enumerated work in the closed-Zona denominator", () => {
    const root = repo(); stubRadar(root, {
      snapshot: {
        ...SNAPSHOT,
        zonas: [
          { id: "archivo", nombre: "Archivo", cerradas: 0, total: 0, cola: [] },
          { id: "metodo", nombre: "Método", cerradas: 5, total: 5, cola: [] },
          { id: "hosts", nombre: "Hosts", cerradas: 3, total: 9, cola: [] },
        ],
      },
    })
    write(root, "openspec/plan.yaml", "schema: plan\n")
    write(root, "core.mjs", "export const a = 1\n")
    commit(root, "docs(plan): seed")

    expect(measureRepository(root, { config: cfg({ payload: null }) }).global).toMatchObject({ zonas_cerradas: 1, zonas_total: 2 })
  })

  test("keeps the seats and the Sesiones without a Zona visible instead of dropping them", () => {
    const root = repo(); seed(root); commit(root, "docs(plan): seed")
    const m = measureRepository(root, { config: cfg() })
    expect(m.asientos).toEqual(["hosts"])
    expect(m.territorio_pendiente).toBe(2)
  })

  test("excludes tooling and tests from the product count so the installed share is not flattered", () => {
    const root = repo(); seed(root); commit(root, "docs(plan): seed")
    const m = measureRepository(root, { config: cfg() })
    expect(m.code.product_files).toBe(3)
    expect(m.code.product_lines).toBe(6)
    expect(m.code.shipping.installed_pct).toBe(17)
    expect(m.code.test_files).toBe(1)
  })

  test("counts the modules the installed payload does not import, which is the real gap", () => {
    const root = repo(); seed(root); commit(root, "docs(plan): seed")
    const m = measureRepository(root, { config: cfg() })
    expect(m.code.shipping.unshipped_files).toBe(2)
    expect(m.code.shipping.unshipped_imported_by_payload).toBe(0)
  })

  test("resolves a payload import to a repo path instead of matching on the file name", () => {
    const root = repo(); seed(root)
    write(root, "core.mjs", 'import { b } from "./contracts/unwired.mjs"\nexport const a = b\n')
    write(root, "policy/unwired.mjs", "export const decoy = 1\n")
    commit(root, "docs(plan): seed")
    const m = measureRepository(root, { config: cfg() })
    expect(m.code.shipping.unshipped_files).toBe(3)
    expect(m.code.shipping.unshipped_imported_by_payload).toBe(1)
  })

  test("counts only files git tracks, so an untracked scratch file never inflates the product", () => {
    const root = repo(); seed(root); commit(root, "docs(plan): seed")
    const before = measureRepository(root, { config: cfg() }).code.product_files
    write(root, "scratch-notes.mjs", "export const noise = 1\n".repeat(200))
    expect(measureRepository(root, { config: cfg() }).code.product_files).toBe(before)
  })

  test("never walks into a dot-directory that only holds agent or tool configuration", () => {
    const root = repo(); seed(root)
    write(root, ".opencode/plugin/vendored.mjs", "export const vendored = 1\n".repeat(50))
    commit(root, "docs(plan): seed")
    expect(measureRepository(root, { config: cfg() }).code.product_files).toBe(3)
  })

  test("separates documentation commits from code commits over the recent window", () => {
    const root = repo(); seed(root)
    commit(root, "docs(plan): seed")
    write(root, "core.mjs", "export const a = 2\n"); commit(root, "fix(core): bump")
    write(root, "openspec/notes.md", "x\n"); commit(root, "docs(plan): note")
    const m = measureRepository(root, { config: cfg() })
    expect(m.git.recent).toMatchObject({ docs: 2, code: 1, total: 3 })
  })

  test("reports a dirty tree as dirty so a stale render is never signed as verified", () => {
    const root = repo(); seed(root); commit(root, "docs(plan): seed")
    write(root, "core.mjs", "export const a = 99\n")
    expect(measureRepository(root, { config: cfg() }).git.clean).toBe(false)
  })
})

describe("measureRepository — judgment drift", () => {
  const seedFor = (root) => {
    stubRadar(root)
    write(root, "openspec/plan.yaml", "schema: plan\n")
    write(root, "core.mjs", "export const a = 1\n")
    write(root, "openspec/plans/radiografia.md", "---\nverified_against: x\n---\n")
  }

  test("does not call the judgment drifted when the only commit since touched the judgment itself", () => {
    const root = repo(); seedFor(root)
    const stamped = commit(root, "docs(plan): seed")
    write(root, "openspec/plans/radiografia.md", "---\nverified_against: y\n---\n\nrevisado\n")
    commit(root, "docs(radiografia): actualizar el juicio")
    const drift = measureRepository(root, { config: cfg(), judgmentSha: stamped }).git.judgment
    expect(drift.known).toBe(true)
    expect(drift.drifted).toBe(false)
  })

  test("calls the judgment drifted when product code landed after it was written", () => {
    const root = repo(); seedFor(root)
    const stamped = commit(root, "docs(plan): seed")
    write(root, "core.mjs", "export const a = 2\n")
    commit(root, "fix(core): bump")
    const drift = measureRepository(root, { config: cfg(), judgmentSha: stamped }).git.judgment
    expect(drift.drifted).toBe(true)
    expect(drift.commits).toBe(1)
  })

  test("treats a stamp the repository does not contain as unknown, never as current", () => {
    const root = repo(); seedFor(root); commit(root, "docs(plan): seed")
    const drift = measureRepository(root, { config: cfg(), judgmentSha: "0".repeat(40) }).git.judgment
    expect(drift.known).toBe(false)
    expect(drift.drifted).toBe(true)
  })
})

describe("measureRepository — proyectos sin payload instalable", () => {
  const seedPlain = (root, extensions) => {
    stubRadar(root)
    write(root, "openspec/plan.yaml", "schema: plan\n")
    return { ...defaults(), radar: { command: ["bun", ".radar-stub/radar-stub.mjs"], cwd: "." }, code: { ...defaults().code, extensions, exclude: ["openspec", "test"] } }
  }

  test("omits the shipped-share block entirely instead of reporting a meaningless zero", () => {
    const root = repo()
    const config = seedPlain(root, [".ts"])
    write(root, "src/app.ts", "export const a = 1\n")
    commit(root, "docs(plan): seed")
    const m = measureRepository(root, { config })
    expect(m.code.shipping).toBeNull()
    expect(m.code.product_files).toBe(1)
  })

  test("counts the extensions the project actually uses, not a hardcoded pair", () => {
    const root = repo()
    const config = seedPlain(root, [".ts", ".tsx"])
    write(root, "src/app.tsx", "export const A = () => null\n")
    write(root, "src/util.mjs", "export const b = 1\n")
    commit(root, "docs(plan): seed")
    expect(measureRepository(root, { config }).code.product_files).toBe(1)
  })
})
