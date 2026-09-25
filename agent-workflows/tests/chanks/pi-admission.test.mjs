import { describe, expect, test } from "bun:test"
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildAdmission, readDispatch, resolveExecutable } from "../../chanks/pi-admission.mjs"

const HEAD = "51d2a2ee460685a54ba88206597bf8e0636aab75"
const site = () => {
  const root = mkdtempSync(join(tmpdir(), "chanks-worker-"))
  const common = mkdtempSync(join(tmpdir(), "chanks-common-"))
  const dir = join(common, "chanks", "despachos")
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(root, "own.mjs"), "original")
  const state = {
    head: HEAD, branch: "refs/heads/work/S200", session: "S200 — native contract",
    rows: [{ id: "S200", estado: "LISTO", archivos: ["own.mjs"] }],
    calls: [], onCall: null,
  }
  const marker = (name = "S200", extra = {}) => {
    writeFileSync(join(dir, `${name}.json`), JSON.stringify({ schema: "radar.despacho/v1", sesion: name,
      worker: "implementer-1", worktree: root, branch: state.branch, ...extra }))
  }
  const deps = { git: "/usr/bin/git", radar: "/usr/bin/radar", execFile(executable, args, options) {
    expect(options.timeout).toBe(10_000)
    state.calls.push([executable, ...args])
    state.onCall?.(executable, args, state.calls.length)
    if (executable === deps.git) {
      if (args[0] === "symbolic-ref") return Buffer.from(`${state.branch}\n`)
      if (args.includes("--show-toplevel")) return Buffer.from(`${root}\n`)
      if (args.includes("--git-common-dir")) return Buffer.from(`${common}\n`)
      if (args.includes("HEAD")) return Buffer.from(`${state.head}\n`)
    }
    if (executable === deps.radar) {
      if (args[0] === "status") return Buffer.from(JSON.stringify({ schema: "radar.snapshot/v1", sesiones: state.rows }))
      if (args[0] === "sesion") return Buffer.from(state.session)
    }
    throw new Error("unexpected invocation")
  } }
  const admission = (extra = {}) => buildAdmission({ repositoryRoot: root, dependencies: deps, ...extra })
  const dispose = () => { rmSync(root, { recursive: true, force: true }); rmSync(common, { recursive: true, force: true }) }
  return { root, common, dir, state, marker, admission, dispose, deps }
}

describe("automatic dispatch admission", () => {
  test("rejects caller Session/planning selection, absence and another branch", () => {
    const s = site()
    try {
      expect(() => s.admission({ sessionId: "S200" })).toThrow(/selecci/)
      expect(() => s.admission({ kind: "planning" })).toThrow(/selecci/)
      expect(() => s.admission()).toThrow(/marcador|despacho/)
      s.marker("S200", { branch: "refs/heads/other" })
      expect(() => s.admission()).toThrow(/despacho/)
    } finally { s.dispose() }
  })

  test("exact marker binds ordinary LISTO Session; newly declared file remains blocked", () => {
    const s = site()
    try {
      s.marker()
      s.state.rows[0].archivos.push("new.mjs")
      const result = s.admission()
      expect(result.bundle.sessionId).toBe("S200")
      expect(result.bundle.authorizedFiles).toEqual([join(s.root, "own.mjs")])
      expect(result.bundle.newFiles).toEqual([join(s.root, "new.mjs")])
      expect(result.identidadActual()).toEqual(expect.objectContaining({ sessionId: "S200", baseCommit: HEAD }))
      s.state.rows[0].archivos.push("another.mjs")
      expect(() => result.recapture()).toThrow(/deriva/)
    } finally { s.dispose() }
  })

  test("ambiguous, invalid, symlinked and racing marker evidence fails closed", () => {
    const s = site()
    try {
      s.marker()
      s.marker("S201", { sesion: "S201" })
      expect(() => s.admission()).toThrow(/más de un/)
      rmSync(join(s.dir, "S201.json"))
      const original = join(s.dir, "S200.json")
      renameSync(original, join(s.dir, "retained"))
      symlinkSync(join(s.dir, "retained"), original)
      expect(() => s.admission()).toThrow(/marcador/)
      rmSync(original)
      writeFileSync(original, '{"schema":"radar.despacho/v1","schema":"radar.despacho/v1"}')
      expect(() => s.admission()).toThrow(/duplicadas|inválido/)
    } finally { s.dispose() }
  })

  test("invalid review witness cannot masquerade as a dispatch; valid witness is scoped", () => {
    const s = site()
    try {
      s.marker("S200", { review_ready: { transport: "intercom", type: "listo para revisión",
        message_id: "receipt-1", sesion: "S201", received_at: "2026-09-12T12:00:00Z",
        worker: "implementer-1", worktree: s.root, branch: s.state.branch } })
      expect(() => s.admission()).toThrow(/testigo/)
      s.marker("S200", { review_ready: { transport: "intercom", type: "listo para revisión",
        message_id: "receipt-1", sesion: "S200", received_at: "2026-09-12T12:00:00Z",
        worker: "implementer-1", worktree: s.root, branch: s.state.branch } })
      expect(s.admission().bundle.sessionId).toBe("S200")
    } finally { s.dispose() }
  })

  test("marker path/descriptor races are rejected even when JSON bytes look valid", () => {
    const s = site()
    try {
      s.marker()
      const path = join(s.dir, "S200.json")
      let swapped = false
      expect(() => readDispatch(s.common, s.root, s.state.branch, {
        read(fd, buffer, offset, length, position) {
          const count = readSync(fd, buffer, offset, length, position)
          if (!swapped) { swapped = true; renameSync(path, `${path}.old`); writeFileSync(path, readFileSync(`${path}.old`)) }
          return count
        },
      })).toThrow(/marcador/)
    } finally { s.dispose() }
  })

  test("in-place marker mutation during read is rejected, not mistaken for stable inode evidence", () => {
    const s = site()
    try {
      s.marker()
      const path = join(s.dir, "S200.json")
      let changed = false
      expect(() => readDispatch(s.common, s.root, s.state.branch, {
        read(fd, buffer, offset, length, position) {
          const count = readSync(fd, buffer, offset, length, position)
          if (!changed) { changed = true; writeFileSync(path, readFileSync(path, "utf8").replace("implementer-1", "implementer-2")) }
          return count
        },
      })).toThrow(/marcador/)
    } finally { s.dispose() }
  })

  test("Radar state, resource/foundation declarations and ambiguous rows fail closed", () => {
    const s = site()
    try {
      s.marker()
      s.state.rows[0].estado = "BLOQUEADO"
      expect(() => s.admission()).toThrow(/admisible/)
      s.state.rows[0].estado = "EN CURSO"
      s.state.rows[0].cimientos = ["own.mjs"]
      expect(() => s.admission()).toThrow(/reserva/)
      s.state.rows[0].cimientos = []
      s.state.rows[0].recurso = ["serial"]
      expect(() => s.admission()).toThrow(/adquisición/)
      s.state.rows[0].recurso = "exclusive"
      expect(() => s.admission()).toThrow(/declaración/)
      s.state.rows[0].recurso = []
      s.state.rows[0].cimientos = "shared"
      expect(() => s.admission()).toThrow(/declaración/)
      s.state.rows[0].cimientos = []
      s.state.rows.push({ ...s.state.rows[0] })
      expect(() => s.admission()).toThrow(/ambigua/)
    } finally { s.dispose() }
  })

  test("transient middle capture and subsequent HEAD/Radar/receipt drift fail closed", () => {
    const s = site()
    try {
      s.marker()
      let statusSeen = false
      s.state.onCall = (_exe, args) => {
        if (args[0] === "status") statusSeen = true
        if (statusSeen && args.includes("HEAD")) s.state.head = "a".repeat(40)
      }
      expect(() => s.admission()).toThrow(/HEAD cambió/)
      s.state.onCall = (_exe, args) => { if (args[0] === "status") s.state.branch = "refs/heads/work/S201" }
      s.state.head = HEAD
      expect(() => s.admission()).toThrow(/inestable/)
      s.state.onCall = null; s.state.branch = "refs/heads/work/S200"
      const result = s.admission()
      s.state.session = "S200 changed"
      expect(() => result.recapture()).toThrow(/deriva/)
      s.state.session = "S200 — native contract"
      s.state.head = "b".repeat(40)
      expect(() => result.recapture()).toThrow(/deriva/)
    } finally { s.dispose() }
  })

  test("same exact bytes recapture succeeds; missing-only declarations never unlock", () => {
    const s = site()
    try {
      s.marker()
      const admission = s.admission()
      expect(admission.recapture().sessionId).toBe("S200")
      s.state.rows[0].archivos = ["new.mjs"]
      expect(() => s.admission()).toThrow(/ningún archivo existente/)
    } finally { s.dispose() }
  })
})

describe("installed executable resolution", () => {
  test("refuses repo binaries and missing executables", () => {
    const s = site()
    try {
      const executable = join(s.root, "radar")
      writeFileSync(executable, "#!/bin/sh\n")
      chmodSync(executable, 0o755)
      expect(() => resolveExecutable("radar", s.root, { pathEnv: s.root })).toThrow(/fuera/)
      expect(() => resolveExecutable("radar", s.root, { pathEnv: "" })).toThrow(/fuera/)
      const otherCheckout = join(s.common, "another-checkout")
      mkdirSync(join(otherCheckout, ".git"), { recursive: true })
      const otherBinary = join(otherCheckout, "radar")
      writeFileSync(otherBinary, "#!/bin/sh\n")
      chmodSync(otherBinary, 0o755)
      expect(() => resolveExecutable("radar", s.root, { pathEnv: otherCheckout })).toThrow(/fuera/)
    } finally { s.dispose() }
  })
})
