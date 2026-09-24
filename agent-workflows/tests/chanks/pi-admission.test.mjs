import { describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import {
  chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { delimiter, join } from "node:path"

import { buildAdmission, resolveExecutable } from "../../chanks/pi-admission.mjs"
import { crearAutoridadPi } from "../../chanks/pi-authority.mjs"

const BASE = "51d2a2ee460685a54ba88206597bf8e0636aab75"
const CANDIDATE = "30b0e6a8f90d3ebfebd57cfb3fdd1805eee37802bad2fd9d042617958ab891de"

const site = () => {
  const root = mkdtempSync(join(tmpdir(), "chanks-pi-admission-"))
  const runtime = mkdtempSync(join(tmpdir(), "chanks-pi-admission-runtime-"))
  const bin = mkdtempSync(join(tmpdir(), "chanks-pi-admission-bin-"))
  const files = ["a.mjs", "b.mjs", "cimiento.mjs"]
  for (const relative of files) writeFileSync(join(root, relative), `export const ${relative.split(".")[0]} = true\n`)
  const git = join(bin, "git")
  writeFileSync(git, `#!/bin/sh\necho ${BASE}\n`)
  chmodSync(git, 0o755)
  const dispose = () => {
    rmSync(root, { recursive: true, force: true })
    rmSync(runtime, { recursive: true, force: true })
    rmSync(bin, { recursive: true, force: true })
  }
  return { root, runtime, bin, git, dispose }
}

const radarScript = (statusRows, sessionText = "") => `#!/bin/sh
case "$1" in
  status) cat <<'JSON'
${JSON.stringify({ schema: "radar.snapshot/v1", sesiones: statusRows })}
JSON
  ;;
  sesion) printf '%s' ${JSON.stringify(sessionText)}
  ;;
  *) exit 64 ;;
esac
`

const withRadar = (place, statusRows, sessionText) => {
  const radar = join(place, "radar")
  writeFileSync(radar, radarScript(statusRows, sessionText))
  chmodSync(radar, 0o755)
  return radar
}

describe("buildAdmission — llave de Sesión", () => {
  test("arma un bundle listo para pi-authority a partir de git y Radar", () => {
    const s = site()
    try {
      const radar = withRadar(s.bin, [{
        id: "S200", estado: "LISTO", archivos: ["a.mjs", "cimiento.mjs"],
        cimientos: ["cimiento.mjs"], recurso: ["runtime aislado exclusivo"],
      }], "S200 — contrato")
      const admission = buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S200",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })
      expect(admission.bundle.sessionId).toBe("S200")
      expect(admission.bundle.authorizedFiles).toEqual([join(s.root, "a.mjs"), join(s.root, "cimiento.mjs")])
      expect(admission.bundle.cimientoGrants).toEqual([join(s.root, "cimiento.mjs")])
      expect(admission.bundle.resources).toEqual([{ id: "runtime aislado exclusivo", mode: "exclusive", confirmed: true }])
      expect(admission.bundle.radar.sessionDigest).toMatch(/^[a-f0-9]{64}$/)

      const authority = crearAutoridadPi({ identidadActual: admission.identidadActual })
      const request = authority.solicitar(admission.bundle)
      expect(authority.aceptar(request.solicitud)).toBe(true)
      expect(authority.capacidad()).not.toBeNull()
      expect(existsSync(admission.proofPath)).toBe(true)
      admission.cerrar()
    } finally {
      s.dispose()
    }
  })

  test("rechaza una Sesión que no está LISTO ni EN CURSO", () => {
    const s = site()
    try {
      const radar = withRadar(s.bin, [{ id: "S200", estado: "BLOQUEADO", archivos: ["a.mjs"] }], "S200")
      expect(() => buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S200",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })).toThrow(/LISTO/)
    } finally {
      s.dispose()
    }
  })

  test("rechaza una Sesión ausente en radar status", () => {
    const s = site()
    try {
      const radar = withRadar(s.bin, [], "")
      expect(() => buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S999",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })).toThrow()
    } finally {
      s.dispose()
    }
  })

  test("rechaza un Cimiento que no está entre los archivos autorizados", () => {
    const s = site()
    try {
      const radar = withRadar(s.bin, [{
        id: "S200", estado: "LISTO", archivos: ["a.mjs"], cimientos: ["cimiento.mjs"],
      }], "S200")
      expect(() => buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S200",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })).toThrow(/Cimiento/)
    } finally {
      s.dispose()
    }
  })

  test("rechaza una Sesión cuyo único archivo declarado no existe todavía", () => {
    const s = site()
    try {
      const radar = withRadar(s.bin, [{ id: "S200", estado: "LISTO", archivos: ["nuevo.mjs"] }], "S200")
      expect(() => buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S200",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })).toThrow(/archivos existentes/)
    } finally {
      s.dispose()
    }
  })

  test("un archivo declarado que aún no existe no bloquea la admisión de los que sí existen", () => {
    const s = site()
    try {
      const radar = withRadar(s.bin, [{
        id: "S200", estado: "LISTO", archivos: ["a.mjs", "todavia-no-existe.mjs"],
      }], "S200")
      const admission = buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S200",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })
      expect(admission.bundle.authorizedFiles).toEqual([join(s.root, "a.mjs")])
      expect(admission.bundle.newFiles).toEqual([join(s.root, "todavia-no-existe.mjs")])

      const authority = crearAutoridadPi({ identidadActual: admission.identidadActual })
      const request = authority.solicitar(admission.bundle)
      expect(authority.aceptar(request.solicitud)).toBe(true)
      admission.cerrar()
    } finally {
      s.dispose()
    }
  })

  test("un archivo nuevo cuyo directorio todavía no existe se rechaza", () => {
    const s = site()
    try {
      const radar = withRadar(s.bin, [{
        id: "S200", estado: "LISTO", archivos: ["a.mjs", "carpeta-inexistente/nuevo.mjs"],
      }], "S200")
      expect(() => buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S200",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })).toThrow()
    } finally {
      s.dispose()
    }
  })

  test("un archivo nuevo que escapa del repositorio se rechaza aunque no exista", () => {
    const s = site()
    try {
      const radar = withRadar(s.bin, [{
        id: "S200", estado: "LISTO", archivos: ["a.mjs", "../fuera-del-repo.mjs"],
      }], "S200")
      expect(() => buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S200",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })).toThrow(/escapa/)
    } finally {
      s.dispose()
    }
  })

  test("identidadActual falla cerrado cuando el estado vivo se aparta del capturado", () => {
    const s = site()
    try {
      const rows = [{ id: "S200", estado: "LISTO", archivos: ["a.mjs"] }]
      const radar = withRadar(s.bin, rows, "S200")
      const admission = buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S200",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })
      expect(admission.identidadActual()).toBeTruthy()
      writeFileSync(s.git, "#!/bin/sh\necho " + "e".repeat(40) + "\n")
      expect(() => admission.identidadActual()).toThrow()
    } finally {
      s.dispose()
    }
  })

  test("una Sesión ajena que cambia en el plan no tira la llave, y la revalidación nunca vuelve a leer radar status", () => {
    const s = site()
    try {
      const calls = join(s.runtime, "calls.log")
      writeFileSync(calls, "")
      const radar = join(s.bin, "radar")
      const script = (statusRows, sessionText) => `#!/bin/sh
echo "$1" >> ${JSON.stringify(calls)}
case "$1" in
  status) cat <<'JSON'
${JSON.stringify({ schema: "radar.snapshot/v1", sesiones: statusRows })}
JSON
  ;;
  sesion) printf '%s' ${JSON.stringify(sessionText)}
  ;;
  *) exit 64 ;;
esac
`
      writeFileSync(radar, script([{ id: "S200", estado: "LISTO", archivos: ["a.mjs"] }], "S200 — Estado: LISTO"))
      chmodSync(radar, 0o755)
      const admission = buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S200",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })
      // An unrelated Session S201 appears in the plan; S200's own contract text is untouched.
      writeFileSync(radar, script([
        { id: "S200", estado: "LISTO", archivos: ["a.mjs"] },
        { id: "S201", estado: "EN CURSO", archivos: ["b.mjs"] },
      ], "S200 — Estado: LISTO"))
      chmodSync(radar, 0o755)
      writeFileSync(calls, "")
      expect(admission.identidadActual()).toBeTruthy()
      const invocations = readFileSync(calls, "utf8").trim().split("\n").filter(Boolean)
      expect(invocations).not.toContain("status")
      expect(invocations).toContain("sesion")
    } finally {
      s.dispose()
    }
  })

  test("un cambio de estado o archivos de la propia Sesión sí tira la llave", () => {
    const s = site()
    try {
      const radar = join(s.bin, "radar")
      const script = (sessionText) => `#!/bin/sh
case "$1" in
  status) cat <<'JSON'
${JSON.stringify({ schema: "radar.snapshot/v1", sesiones: [{ id: "S200", estado: "LISTO", archivos: ["a.mjs"] }] })}
JSON
  ;;
  sesion) printf '%s' ${JSON.stringify(sessionText)}
  ;;
  *) exit 64 ;;
esac
`
      writeFileSync(radar, script("S200 — Estado: LISTO"))
      chmodSync(radar, 0o755)
      const admission = buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S200",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })
      writeFileSync(radar, script("S200 — Estado: EN CURSO"))
      chmodSync(radar, 0o755)
      expect(() => admission.identidadActual()).toThrow()
    } finally {
      s.dispose()
    }
  })
})

describe("buildAdmission — llave de planificación", () => {
  test("autoriza exactamente plan.yaml y ROADMAP.md, sin Cimientos ni recursos", () => {
    const s = site()
    try {
      mkdirSync(join(s.root, "openspec"), { recursive: true })
      writeFileSync(join(s.root, "openspec", "plan.yaml"), "sesiones: []\n")
      writeFileSync(join(s.root, "openspec", "ROADMAP.md"), "# roadmap\n")
      const radar = withRadar(s.bin, [])
      const admission = buildAdmission({
        repositoryRoot: s.root, kind: "planning",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })
      expect(admission.bundle.sessionId).toBe("PLANNING")
      expect(admission.bundle.authorizedFiles).toEqual([
        join(s.root, "openspec", "plan.yaml"), join(s.root, "openspec", "ROADMAP.md"),
      ])
      expect(admission.bundle.cimientoGrants).toEqual([])
      expect(admission.bundle.resources).toEqual([])
      expect(admission.bundle.radar.sessionDigest).toBeUndefined()

      const authority = crearAutoridadPi({ identidadActual: admission.identidadActual })
      const request = authority.solicitar(admission.bundle)
      expect(authority.aceptar(request.solicitud)).toBe(true)
    } finally {
      s.dispose()
    }
  })

  test("rechaza planificación sin openspec/plan.yaml presente", () => {
    const s = site()
    try {
      const radar = withRadar(s.bin, [])
      expect(() => buildAdmission({
        repositoryRoot: s.root, kind: "planning",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })).toThrow()
    } finally {
      s.dispose()
    }
  })

  test("autoriza sólo plan.yaml cuando ROADMAP.md todavía no existe", () => {
    const s = site()
    try {
      mkdirSync(join(s.root, "openspec"), { recursive: true })
      writeFileSync(join(s.root, "openspec", "plan.yaml"), "sesiones: []\n")
      const radar = withRadar(s.bin, [])
      const admission = buildAdmission({
        repositoryRoot: s.root, kind: "planning",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })
      expect(admission.bundle.authorizedFiles).toEqual([join(s.root, "openspec", "plan.yaml")])
    } finally {
      s.dispose()
    }
  })

  test("la llave de planificación sobrevive a escribir plan.yaml, porque nunca vuelve a leer Radar", () => {
    const s = site()
    try {
      mkdirSync(join(s.root, "openspec"), { recursive: true })
      writeFileSync(join(s.root, "openspec", "plan.yaml"), "sesiones: []\n")
      const radar = join(s.bin, "radar")
      writeFileSync(radar, "#!/bin/sh\nexit 64\n")
      chmodSync(radar, 0o755)
      const admission = buildAdmission({
        repositoryRoot: s.root, kind: "planning",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime },
      })
      // Simulate the write this key exists to authorize: plan.yaml changes shape entirely.
      writeFileSync(join(s.root, "openspec", "plan.yaml"), "sesiones:\n  - id: S999\n")
      expect(admission.identidadActual()).toBeTruthy()
    } finally {
      s.dispose()
    }
  })
})

describe("timeouts de ejecución", () => {
  test("cada invocación de git o radar lleva un timeout, para fallar cerrado ante un proceso colgado", () => {
    const s = site()
    try {
      const seen = []
      const execFile = (executable, args, options) => {
        seen.push(options)
        return execFileSync(executable, args, options)
      }
      const radar = withRadar(s.bin, [{ id: "S200", estado: "LISTO", archivos: ["a.mjs"] }], "S200")
      buildAdmission({
        repositoryRoot: s.root, kind: "session", sessionId: "S200",
        runtimeIdentity: "pi:test:1", candidateDigest: CANDIDATE,
        dependencies: { git: s.git, radar, runtimeDirectory: s.runtime, execFile },
      })
      expect(seen.length).toBeGreaterThan(0)
      for (const options of seen) expect(typeof options.timeout).toBe("number")
    } finally {
      s.dispose()
    }
  })
})

describe("resolveExecutable", () => {
  test("nunca resuelve un ejecutable dentro del propio repositorio", () => {
    const s = site()
    try {
      const inside = join(s.root, "git")
      writeFileSync(inside, "#!/bin/sh\necho fake\n")
      chmodSync(inside, 0o755)
      const found = resolveExecutable("git", s.root, { pathEnv: `${s.root}${delimiter}/usr/bin` })
      expect(found).not.toBe(inside)
    } finally {
      s.dispose()
    }
  })

  test("rechaza un candidato simbólico y sigue buscando", () => {
    const s = site()
    try {
      const real = join(s.bin, "real-tool")
      writeFileSync(real, "#!/bin/sh\necho ok\n")
      chmodSync(real, 0o755)
      const linkDir = mkdtempSync(join(tmpdir(), "chanks-pi-admission-link-"))
      const linked = join(linkDir, "real-tool")
      symlinkSync(real, linked)
      const path = `${linkDir}${delimiter}${s.bin}`
      expect(resolveExecutable("real-tool", s.root, { pathEnv: path })).toBe(real)
      rmSync(linkDir, { recursive: true, force: true })
    } finally {
      s.dispose()
    }
  })

  test("falla cerrado cuando nada resuelve", () => {
    expect(() => resolveExecutable("no-existe-esto", tmpdir(), { pathEnv: "" })).toThrow()
  })
})
