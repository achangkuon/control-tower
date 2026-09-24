import { describe, expect, test } from "bun:test"
import { closeSync, constants, linkSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { crearAutoridadPi } from "../../chanks/pi-authority.mjs"

const BASE = "51d2a2ee460685a54ba88206597bf8e0636aab75"
const DIGEST = "30b0e6a8f90d3ebfebd57cfb3fdd1805eee37802bad2fd9d042617958ab891de"
const SESSION_DIGEST = "6729f4c51df5f5e539d47cbd8db786a4993361a65e6521dcef4f11737515cfca"

const terreno = () => {
  const root = mkdtempSync(join(tmpdir(), "chanks-pi-authority-"))
  const source = join(root, "source.mjs")
  const foundation = join(root, "foundation.mjs")
  writeFileSync(source, "export const source = true\n")
  writeFileSync(foundation, "export const foundation = true\n")
  return { root, source, foundation, dispose: () => rmSync(root, { recursive: true, force: true }) }
}

const identidad = (root, extra = {}) => ({
  repositoryRoot: root,
  sessionId: "S151",
  baseCommit: BASE,
  candidateDigest: DIGEST,
  runtimeIdentity: "pi:isolated:worker-1",
  ...extra,
})

const admision = (site, extra = {}) => ({
  ...identidad(site.root),
  radar: { statusDigest: DIGEST, sessionDigest: SESSION_DIGEST },
  authorizedFiles: [site.source, site.foundation],
  cimientoGrants: [site.foundation],
  resources: [{ id: "pi-runtime", mode: "exclusive", confirmed: true }],
  ...extra,
})

const crear = (site, current = identidad(site.root), dependencies) => {
  let vigente = current
  return {
    authority: crearAutoridadPi({ identidadActual: () => vigente }, dependencies),
    cambiarIdentidad: (next) => { vigente = next },
  }
}

const writeEvent = (path) => ({ toolName: "write", input: { path, content: "x" } })
const descriptorCount = () => readdirSync("/proc/self/fd").length

describe("la autoridad efímera de Pi", () => {
  test("queda pendiente hasta que el host la acepta y expone sólo la evidencia validada", () => {
    const site = terreno()
    try {
      const { authority } = crear(site)
      const request = authority.solicitar(admision(site))
      expect(request.estado).toBe("pendiente")
      expect(typeof request.solicitud).toBe("string")
      expect(authority.estado()).toBe("pendiente")
      expect(authority.capacidad()).toBeNull()

      expect(authority.aceptar(request.solicitud)).toBe(true)
      const capability = authority.capacidad()
      expect(authority.estado()).toBe("activa")
      expect(Object.isFrozen(capability)).toBe(true)
      expect(capability.vinculo).toBeUndefined()
      expect(capability.gobernar(writeEvent(site.source)).pi.block).toBeUndefined()
    } finally {
      site.dispose()
    }
  })

  test("el rechazo, la ausencia de aceptación y la invalidación idempotente fallan cerrados", () => {
    const site = terreno()
    try {
      const { authority } = crear(site)
      const request = authority.solicitar(admision(site))
      expect(authority.capacidad()).toBeNull()
      expect(authority.rechazar(request.solicitud)).toBe(true)
      expect(authority.estado()).toBe("rechazada")
      expect(authority.aceptar(request.solicitud)).toBe(false)
      expect(authority.capacidad()).toBeNull()
      expect(authority.invalidar()).toBe(true)
      expect(authority.invalidar()).toBe(false)
      expect(authority.estado()).toBe("invalidada")
    } finally {
      site.dispose()
    }
  })

  test("una nueva solicitud reemplaza e invalida la autoridad previa", () => {
    const site = terreno()
    try {
      const { authority, cambiarIdentidad } = crear(site)
      const request = authority.solicitar(admision(site))
      authority.aceptar(request.solicitud)
      expect(authority.capacidad()).not.toBeNull()

      cambiarIdentidad(identidad(site.root, { sessionId: "S152" }))
      authority.solicitar(admision(site, { sessionId: "S152" }))
      expect(authority.estado()).toBe("pendiente")
      expect(authority.capacidad()).toBeNull()
    } finally {
      site.dispose()
    }
  })

  test("una respuesta vieja no puede aceptar ni rechazar la solicitud que la reemplazó", () => {
    const site = terreno()
    try {
      const { authority } = crear(site)
      const first = authority.solicitar(admision(site))
      const second = authority.solicitar(admision(site))
      expect(first.solicitud).not.toBe(second.solicitud)
      expect(authority.aceptar(first.solicitud)).toBe(false)
      expect(authority.estado()).toBe("invalidada")
      expect(authority.aceptar(second.solicitud)).toBe(false)
      expect(authority.capacidad()).toBeNull()
    } finally {
      site.dispose()
    }
  })
})

describe("validación de la admisión del host", () => {
  test("exige cada campo del bundle sin defaults permisivos", () => {
    const site = terreno()
    try {
      for (const field of ["repositoryRoot", "sessionId", "baseCommit", "candidateDigest", "runtimeIdentity", "radar", "authorizedFiles", "cimientoGrants", "resources"]) {
        const input = admision(site)
        delete input[field]
        expect(() => crear(site).authority.solicitar(input)).toThrow()
      }
      expect(() => crearAutoridadPi()).toThrow()
    } finally {
      site.dispose()
    }
  })

  test("rechaza hashes y Session ID malformados sin recalcular el estado de Radar", () => {
    const site = terreno()
    try {
      for (const input of [
        admision(site, { sessionId: "151" }),
        admision(site, { baseCommit: BASE.slice(0, 12) }),
        admision(site, { candidateDigest: "not-a-digest" }),
        admision(site, { radar: { statusDigest: DIGEST, sessionDigest: "bad" } }),
      ]) {
        expect(() => crear(site).authority.solicitar(input)).toThrow()
      }
    } finally {
      site.dispose()
    }
  })

  test("rechaza rutas relativas, escapadas, duplicadas, enlaces simbólicos y objetivos no regulares", () => {
    const site = terreno()
    let escapedRoot
    try {
      const outside = join(tmpdir(), "outside.mjs")
      escapedRoot = mkdtempSync(join(tmpdir(), "chanks-pi-authority-escaped-"))
      const escaped = join(escapedRoot, "source.mjs")
      writeFileSync(escaped, "outside\n")
      const directory = join(site.root, "directory")
      const link = join(site.root, "linked.mjs")
      mkdirSync(directory)
      symlinkSync(site.source, link)
      expect(lstatSync(link).isSymbolicLink()).toBe(true)

      for (const files of [
        ["source.mjs"],
        [outside],
        [escaped],
        [site.source, site.source],
        [link],
        [directory],
      ]) {
        expect(() => crear(site).authority.solicitar(admision(site, { authorizedFiles: files, cimientoGrants: [] }))).toThrow()
      }
    } finally {
      if (escapedRoot) rmSync(escapedRoot, { recursive: true, force: true })
      site.dispose()
    }
  })

  test("usa el separador nativo para rechazar un padre fuera del repositorio", () => {
    const source = readFileSync(new URL("../../chanks/pi-authority.mjs", import.meta.url), "utf8")
    expect(source).toContain("contained.startsWith(`..${sep}`)")
  })

  test("falla cerrada sin O_NOFOLLOW antes de abrir archivos autorizados", () => {
    const site = terreno()
    try {
      let opens = 0
      const { authority } = crear(site, identidad(site.root), {
        uuid: () => "request", noFollow: undefined, close: closeSync,
        open: () => { opens += 1; throw new Error("no debe abrir") },
      })
      expect(() => authority.solicitar(admision(site))).toThrow()
      expect(opens).toBe(0)
    } finally {
      site.dispose()
    }
  })

  test("una Sesión sin recursos declarados no tiene nada que confirmar", () => {
    const site = terreno()
    try {
      const { authority } = crear(site)
      const request = authority.solicitar(admision(site, { resources: [] }))
      expect(request.estado).toBe("pendiente")
      expect(authority.aceptar(request.solicitud)).toBe(true)
      expect(authority.capacidad()).not.toBeNull()
    } finally {
      site.dispose()
    }
  })

  test("rechaza archivos con hard links tanto en archivos como en Cimientos", () => {
    const site = terreno()
    try {
      const hardLink = join(site.root, "source-link.mjs")
      linkSync(site.source, hardLink)
      expect(lstatSync(site.source).nlink).toBe(2)
      expect(() => crear(site).authority.solicitar(admision(site))).toThrow()
      expect(() => crear(site).authority.solicitar(admision(site, {
        authorizedFiles: [site.foundation], cimientoGrants: [hardLink],
      }))).toThrow()
    } finally {
      site.dispose()
    }
  })

  test("rechaza grants Cimiento ambiguos o fuera de los archivos exactos", () => {
    const site = terreno()
    try {
      expect(() => crear(site).authority.solicitar(admision(site, { cimientoGrants: [site.foundation, site.foundation] }))).toThrow()
      expect(() => crear(site).authority.solicitar(admision(site, { cimientoGrants: [join(site.root, "missing.mjs")] }))).toThrow()
    } finally {
      site.dispose()
    }
  })

  test("rechaza cada recurso declarado que no está confirmado para uso exclusivo o serial", () => {
    const site = terreno()
    try {
      for (const resources of [
        [{ id: "pi-runtime", mode: "exclusive", confirmed: false }],
        [{ id: "pi-runtime", mode: "shared", confirmed: true }],
        [{ id: "", mode: "serial", confirmed: true }],
        [{ id: "pi-runtime", mode: "serial", confirmed: true }, { id: "pi-runtime", mode: "serial", confirmed: true }],
      ]) {
        expect(() => crear(site).authority.solicitar(admision(site, { resources }))).toThrow()
      }
    } finally {
      site.dispose()
    }
  })
})

describe("revalidación antes de entregar autoridad activa", () => {
  test("la deriva de repositorio, Sesión, base, candidato o runtime invalida sin devolver autoridad", () => {
    const site = terreno()
    try {
      const otherRoot = mkdtempSync(join(tmpdir(), "chanks-pi-authority-other-"))
      try {
        const drift = {
          repositoryRoot: otherRoot,
          sessionId: "S152",
          baseCommit: "a".repeat(40),
          candidateDigest: "b".repeat(64),
          runtimeIdentity: "pi:isolated:worker-2",
        }
        for (const field of Object.keys(drift)) {
          const controller = crear(site)
          const request = controller.authority.solicitar(admision(site))
          controller.authority.aceptar(request.solicitud)
          const capability = controller.authority.capacidad()
          controller.cambiarIdentidad(identidad(site.root, { [field]: drift[field] }))
          expect(capability.gobernar(writeEvent(site.source)).pi.block).toBe(true)
          expect(controller.authority.capacidad()).toBeNull()
          expect(controller.authority.estado()).toBe("invalidada")
        }
      } finally {
        rmSync(otherRoot, { recursive: true, force: true })
      }
    } finally {
      site.dispose()
    }
  })

  test("la deriva de un archivo autorizado también invalida la autoridad", () => {
    const site = terreno()
    try {
      const { authority } = crear(site)
      const request = authority.solicitar(admision(site))
      authority.aceptar(request.solicitud)
      rmSync(site.source)
      symlinkSync(site.foundation, site.source)
      expect(authority.capacidad()).toBeNull()
      expect(authority.estado()).toBe("invalidada")
    } finally {
      site.dispose()
    }
  })

  test("reemplazar un archivo regular por otro invalida su identidad autorizada", () => {
    const site = terreno()
    try {
      const { authority } = crear(site)
      const before = descriptorCount()
      const request = authority.solicitar(admision(site))
      authority.aceptar(request.solicitud)
      const capability = authority.capacidad()
      expect(descriptorCount()).toBeGreaterThan(before)
      rmSync(site.source)
      writeFileSync(site.source, "export const replacement = true\n")
      expect(capability.gobernar(writeEvent(site.source)).pi.block).toBe(true)
      expect(descriptorCount()).toBe(before)
      expect(authority.estado()).toBe("invalidada")
    } finally {
      site.dispose()
    }
  })

  test("un UUID fallido cierra los handles nuevos y preserva la autoridad previa", () => {
    const site = terreno()
    try {
      const closed = []
      let calls = 0
      const { authority } = crear(site, identidad(site.root), {
        uuid: () => { calls += 1; if (calls === 2) throw new Error("UUID failed"); return "first" }, noFollow: constants.O_NOFOLLOW,
        open: openSync, close: (descriptor) => { closed.push(descriptor); closeSync(descriptor) },
      })
      const first = authority.solicitar(admision(site))
      authority.aceptar(first.solicitud)
      const capability = authority.capacidad()
      expect(() => authority.solicitar(admision(site))).toThrow("UUID failed")
      expect(closed).toHaveLength(2)
      expect(capability.gobernar(writeEvent(site.source)).pi.block).toBeUndefined()
      authority.invalidar()
      expect(closed).toHaveLength(4)
    } finally {
      site.dispose()
    }
  })

  test("una apertura parcial fallida cierra cada handle previo una sola vez", () => {
    const site = terreno()
    try {
      let opens = 0
      const closed = []
      const { authority } = crear(site, identidad(site.root), {
        uuid: () => "request", noFollow: constants.O_NOFOLLOW,
        open: (path, flags) => {
          opens += 1
          if (opens === 2) throw new Error("second open failed")
          return openSync(path, flags)
        },
        close: (descriptor) => { closed.push(descriptor); closeSync(descriptor) },
      })
      expect(() => authority.solicitar(admision(site))).toThrow("second open failed")
      expect(closed).toHaveLength(1)
      expect(authority.estado()).toBe("inactiva")
    } finally {
      site.dispose()
    }
  })

  test("una capacidad retenida se bloquea tras invalidación explícita", () => {
    const site = terreno()
    try {
      const { authority } = crear(site)
      const request = authority.solicitar(admision(site))
      authority.aceptar(request.solicitud)
      const capability = authority.capacidad()
      authority.invalidar()
      expect(capability.gobernar(writeEvent(site.source)).pi.block).toBe(true)
    } finally {
      site.dispose()
    }
  })

  test("rechazar e invalidar ciclos no deja descriptores retenidos", () => {
    const site = terreno()
    try {
      const { authority } = crear(site)
      const before = descriptorCount()
      for (let cycle = 0; cycle < 3; cycle += 1) {
        const rejected = authority.solicitar(admision(site))
        authority.rechazar(rejected.solicitud)
        const active = authority.solicitar(admision(site))
        authority.aceptar(active.solicitud)
        authority.invalidar()
      }
      expect(descriptorCount()).toBe(before)
    } finally {
      site.dispose()
    }
  })
})

describe("la llave de planificación", () => {
  const planificacion = (site, extra = {}) => ({
    repositoryRoot: site.root,
    kind: "planning",
    sessionId: "PLANNING",
    baseCommit: BASE,
    candidateDigest: DIGEST,
    runtimeIdentity: "pi:isolated:worker-1",
    radar: { statusDigest: DIGEST },
    authorizedFiles: [site.source, site.foundation],
    cimientoGrants: [],
    resources: [],
    ...extra,
  })

  test("se activa sin forma de Session ID ni digest de Sesión", () => {
    const site = terreno()
    try {
      const { authority } = crear(site, { repositoryRoot: site.root, kind: "planning", sessionId: "PLANNING", baseCommit: BASE, candidateDigest: DIGEST, runtimeIdentity: "pi:isolated:worker-1" })
      const request = authority.solicitar(planificacion(site))
      expect(request.estado).toBe("pendiente")
      expect(authority.aceptar(request.solicitud)).toBe(true)
      expect(authority.capacidad()).not.toBeNull()
    } finally {
      site.dispose()
    }
  })

  test("rechaza un digest de Sesión colado en una admisión de planificación", () => {
    const site = terreno()
    try {
      const { authority } = crear(site)
      expect(() => authority.solicitar(planificacion(site, {
        radar: { statusDigest: DIGEST, sessionDigest: SESSION_DIGEST },
      }))).toThrow()
    } finally {
      site.dispose()
    }
  })

  test("rechaza un kind desconocido", () => {
    const site = terreno()
    try {
      const { authority } = crear(site)
      expect(() => authority.solicitar(planificacion(site, { kind: "otra-cosa" }))).toThrow()
    } finally {
      site.dispose()
    }
  })

  test("una deriva de kind entre la admisión y la identidad viva invalida la autoridad", () => {
    const site = terreno()
    try {
      const { authority, cambiarIdentidad } = crear(site, { repositoryRoot: site.root, kind: "planning", sessionId: "PLANNING", baseCommit: BASE, candidateDigest: DIGEST, runtimeIdentity: "pi:isolated:worker-1" })
      const request = authority.solicitar(planificacion(site))
      authority.aceptar(request.solicitud)
      const capability = authority.capacidad()
      cambiarIdentidad({ repositoryRoot: site.root, sessionId: "PLANNING", baseCommit: BASE, candidateDigest: DIGEST, runtimeIdentity: "pi:isolated:worker-1" })
      expect(capability.gobernar(writeEvent(site.source)).pi.block).toBe(true)
      expect(authority.estado()).toBe("invalidada")
    } finally {
      site.dispose()
    }
  })
})
