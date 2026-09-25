import { describe, expect, test } from "bun:test"

import { crearCoordinacion, escribiblesPara, paraleloPorArchivos } from "../../chanks/interventions.mjs"

const BASE = "174a2d10ff60d5e36912af9bec272576d11d0c97"

// The shape S145 already publishes in `radar status --json`: each Sesión carries the exact
// files it is authorized to touch. This module consumes that evidence and never recomputes it.
const huella = (sesion, archivos, extra = {}) => ({
  sesion,
  zona: "metodo",
  archivos,
  cimientos: [],
  base: BASE,
  ...extra,
})

describe("T1 — paralelo por archivos", () => {
  test("dos Sesiones con archivos disjuntos avanzan en paralelo", () => {
    const d = paraleloPorArchivos(huella("S1", ["a.mjs"]), huella("S2", ["b.mjs"]))
    expect(d.permitido).toBe(true)
  })

  // The rule S145 established and this one must not undo: sharing territory is not a conflict.
  test("compartir Zona no es conflicto", () => {
    const d = paraleloPorArchivos(
      huella("S1", ["a.mjs"], { zona: "metodo" }),
      huella("S2", ["b.mjs"], { zona: "metodo" }),
    )
    expect(d.permitido).toBe(true)
  })

  test("archivos solapados no habilitan paralelo y se nombra el archivo", () => {
    const d = paraleloPorArchivos(huella("S1", ["a.mjs", "x.mjs"]), huella("S2", ["x.mjs"]))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("x.mjs")
  })

  // "Una huella desconocida no habilita paralelo." Unknown is not empty and not safe.
  test("una huella sin archivos declarados no habilita paralelo", () => {
    const d = paraleloPorArchivos(huella("S1", ["a.mjs"]), huella("S2", []))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("S2")
    expect(d.motivo).toMatch(/desconocida|incompleta/i)
  })

  test("una huella sobre otra base no está vigente y no habilita paralelo", () => {
    const d = paraleloPorArchivos(huella("S1", ["a.mjs"]), huella("S2", ["b.mjs"], { base: "f".repeat(40) }))
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/vigente|base/i)
  })

  // A shared Cimiento is a condition of coordinated intervention, never a veto on both
  // Sesiones' own disjoint work.
  test("un Cimiento compartido no veta el paralelo: lo condiciona", () => {
    const d = paraleloPorArchivos(
      huella("S1", ["a.mjs", "base.mjs"], { cimientos: ["base.mjs"] }),
      huella("S2", ["b.mjs", "base.mjs"], { cimientos: ["base.mjs"] }),
    )
    expect(d.permitido).toBe(true)
    expect(d.condicion).toMatch(/intervención coordinada/i)
    expect(d.detalle).toContain("base.mjs")
  })
})

// --- T2/T3: el conjunto coherente completo ---------------------------------

const solicitud = (extra = {}) => ({
  sesion: "S1",
  worker: "pi-a",
  base: BASE,
  alcance: ["a.mjs"],
  cimientos: ["base.mjs"],
  ...extra,
})

describe("T2 — todo o nada", () => {
  test("concede el conjunto completo cuando nadie lo tiene", () => {
    const c = crearCoordinacion({ base: BASE })
    const d = c.solicitar(solicitud())
    expect(d.permitido).toBe(true)
    expect(d.concedido).toEqual(["base.mjs"])
  })

  // The rule that makes circular waits impossible: a request is granted whole or not at all.
  // Partial grants are how two workers each end up holding half of what the other needs.
  test("si un solo archivo del conjunto está tomado, no concede ninguno", () => {
    const c = crearCoordinacion({ base: BASE })
    c.solicitar(solicitud({ cimientos: ["base.mjs"] }))
    const d = c.solicitar(solicitud({ sesion: "S2", worker: "pi-b", cimientos: ["base.mjs", "otro.mjs"] }))
    expect(d.permitido).toBe(false)
    expect(d.concedido).toBeUndefined()
    expect(d.detalle).toContain("base.mjs")
    // The uncontested file must NOT be held: a partial grant is the deadlock.
    expect(c.concedidosA("S2")).toEqual([])
  })

  test("no hay solapamiento sobre el mismo archivo entre dos Sesiones", () => {
    const c = crearCoordinacion({ base: BASE })
    expect(c.solicitar(solicitud()).permitido).toBe(true)
    expect(c.solicitar(solicitud({ sesion: "S2", worker: "pi-b" })).permitido).toBe(false)
  })

  test("un conjunto vacío no es una solicitud", () => {
    const c = crearCoordinacion({ base: BASE })
    expect(c.solicitar(solicitud({ cimientos: [] })).permitido).toBe(false)
  })

  // "No se amplía un conjunto silenciosamente": a second request from a session that already
  // holds a set is a new complete request, not an addition to the old one.
  test("una Sesión que ya tiene un conjunto no lo amplía en silencio", () => {
    const c = crearCoordinacion({ base: BASE })
    c.solicitar(solicitud())
    const d = c.solicitar(solicitud({ cimientos: ["base.mjs", "nuevo.mjs"] }))
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/amplia|ya tiene/i)
    expect(c.concedidosA("S1")).toEqual(["base.mjs"])
  })

  test("dos conjuntos disjuntos conviven", () => {
    const c = crearCoordinacion({ base: BASE })
    expect(c.solicitar(solicitud({ cimientos: ["uno.mjs"] })).permitido).toBe(true)
    expect(c.solicitar(solicitud({ sesion: "S2", worker: "pi-b", cimientos: ["dos.mjs"] })).permitido).toBe(true)
  })
})

describe("T3 — ligado al trabajo y a la base", () => {
  test("una base desactualizada detiene sin conceder", () => {
    const c = crearCoordinacion({ base: BASE })
    const d = c.solicitar(solicitud({ base: "f".repeat(40) }))
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/base/i)
    expect(c.concedidosA("S1")).toEqual([])
  })

  test("una solicitud que no declara su Sesión o su worker se detiene", () => {
    const c = crearCoordinacion({ base: BASE })
    for (const roto of [{ sesion: "" }, { worker: "" }]) {
      expect(c.solicitar(solicitud(roto)).permitido).toBe(false)
    }
  })

  // "Cada intervención usa la base integrada completa vigente… no sustituye esa base copiando
  // un Cimiento suelto."
  test("copiar un Cimiento suelto no sustituye la base integrada", () => {
    const c = crearCoordinacion({ base: BASE })
    const d = c.solicitar(solicitud({ base: null, cimientoCopiado: "base.mjs" }))
    expect(d.permitido).toBe(false)
  })
})

// --- T4: liberar sólo tras integración confirmada --------------------------

const conConjunto = () => {
  const c = crearCoordinacion({ base: BASE })
  c.solicitar(solicitud())
  return c
}

describe("T4 — la liberación", () => {
  test("libera tras integración confirmada conforme al flujo de entrega", () => {
    const c = conConjunto()
    const d = c.liberar({ sesion: "S1", integracion: { confirmada: true, commit: BASE } })
    expect(d.permitido).toBe(true)
    expect(c.concedidosA("S1")).toEqual([])
  })

  // The two states people mistake for "done", and the reason the rule is written at all.
  test("terminar la edición local no libera", () => {
    const c = conConjunto()
    const d = c.liberar({ sesion: "S1", edicionTerminada: true })
    expect(d.permitido).toBe(false)
    expect(c.concedidosA("S1")).toEqual(["base.mjs"])
  })

  test("el silencio del worker no libera", () => {
    const c = conConjunto()
    const d = c.liberar({ sesion: "S1" })
    expect(d.permitido).toBe(false)
    expect(c.concedidosA("S1")).toEqual(["base.mjs"])
  })

  test("una integración sin confirmar no libera", () => {
    const c = conConjunto()
    expect(c.liberar({ sesion: "S1", integracion: { confirmada: false, commit: BASE } }).permitido).toBe(false)
    expect(c.concedidosA("S1")).toEqual(["base.mjs"])
  })

  test("una integración sin commit no es evidencia de integración", () => {
    const c = conConjunto()
    expect(c.liberar({ sesion: "S1", integracion: { confirmada: true } }).permitido).toBe(false)
  })

  // "Liberar sólo los recursos efectivamente adquiridos."
  test("nadie libera lo que no tiene", () => {
    const c = conConjunto()
    expect(c.liberar({ sesion: "S2", integracion: { confirmada: true, commit: BASE } }).permitido).toBe(false)
    expect(c.concedidosA("S1")).toEqual(["base.mjs"])
  })

  test("tras liberar, otra Sesión puede pedir el mismo archivo", () => {
    const c = conConjunto()
    c.liberar({ sesion: "S1", integracion: { confirmada: true, commit: BASE } })
    expect(c.solicitar(solicitud({ sesion: "S2", worker: "pi-b" })).permitido).toBe(true)
  })
})

// --- T5: las detenciones preservan -----------------------------------------

describe("T5 — detener preserva y no dispara nada", () => {
  for (const motivo of ["conflicto", "cambio-de-alcance", "cambio-de-base", "desconexion", "evidencia-faltante"]) {
    test(`«${motivo}» detiene la intervención afectada`, () => {
      const c = conConjunto()
      const d = c.detener({ sesion: "S1", motivo })
      expect(d.permitido).toBe(false)
      expect(d.motivo).toContain(motivo)
    })
  }

  // A stop preserves the work and the evidence. Releasing on a stop would hand a half-finished
  // file to the next worker, which is the damage the whole protocol exists to avoid — even at
  // the price of needing a human to resolve it.
  test("una detención NO libera el conjunto: preserva el trabajo", () => {
    const c = conConjunto()
    c.detener({ sesion: "S1", motivo: "desconexion" })
    expect(c.concedidosA("S1")).toEqual(["base.mjs"])
  })

  test("una detención no habilita a otra Sesión a tomar el archivo", () => {
    const c = conConjunto()
    c.detener({ sesion: "S1", motivo: "desconexion" })
    expect(c.solicitar(solicitud({ sesion: "S2", worker: "pi-b" })).permitido).toBe(false)
  })

  // "…no disparan reintentos, remapeos, permisos, liberaciones ni reanudaciones automáticos."
  test("una intervención detenida no se reanuda sola", () => {
    const c = conConjunto()
    c.detener({ sesion: "S1", motivo: "conflicto" })
    const d = c.liberar({ sesion: "S1", integracion: { confirmada: true, commit: BASE } })
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/detenida/i)
  })

  test("la detención registra la evidencia en vez de descartarla", () => {
    const c = conConjunto()
    c.detener({ sesion: "S1", motivo: "evidencia-faltante", evidencia: ["falta el digest del worker"] })
    expect(c.detenida("S1").evidencia).toContain("falta el digest del worker")
  })

  test("un motivo que no está en el conjunto acordado no detiene por su cuenta", () => {
    const c = conConjunto()
    expect(c.detener({ sesion: "S1", motivo: "me parece" }).detalle).toContain("motivo")
  })
})

// --- T6: demostración en entorno aislado -----------------------------------
//
// "Los casos rechazados demuestran ausencia del efecto prohibido; mensajes y pruebas de
// cadenas de texto no sustituyen esa evidencia." So these run the confinement for real and
// check the Cimiento file afterwards, not the wording of a refusal.

import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { confinarComando } from "../../chanks/pi-controls.mjs"

const entorno = () => {
  const raiz = mkdtempSync(join(tmpdir(), "chanks-s146-"))
  mkdirSync(join(raiz, "propio"), { recursive: true })
  writeFileSync(join(raiz, "cimiento.mjs"), "original\n")
  writeFileSync(join(raiz, "propio", "mio.mjs"), "original\n")
  return raiz
}

describe("T6 — el efecto sobre el Cimiento", () => {
  test("una reserva de coordinación no desbloquea bash para escribir un Cimiento", () => {
    const raiz = entorno()
    try {
      const cimiento = join(raiz, "cimiento.mjs")
      const c = crearCoordinacion({ base: BASE })
      const concedido = c.solicitar(solicitud({ cimientos: [cimiento] }))
      expect(concedido.permitido).toBe(true)

      const cuarto = confinarComando(`echo intervenido > ${cimiento}`, {
        escribibles: escribiblesPara(c, "S1", [join(raiz, "propio", "mio.mjs")]),
      })
      expect(cuarto.confinable).toBe(false)
      expect(cuarto.motivo).toMatch(/sólo lectura/)
      expect(readFileSync(cimiento, "utf8")).toBe("original\n")
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  test("una intervención NO concedida no escribe el Cimiento: el archivo queda intacto", () => {
    const raiz = entorno()
    try {
      const cimiento = join(raiz, "cimiento.mjs")
      const c = crearCoordinacion({ base: BASE })
      c.solicitar(solicitud({ cimientos: [cimiento] }))
      // S2 asks for the same file and is refused, so its room never includes it.
      expect(c.solicitar(solicitud({ sesion: "S2", worker: "pi-b", cimientos: [cimiento] })).permitido).toBe(false)

      const cuarto = confinarComando(`echo colado > ${cimiento}`, {
        escribibles: escribiblesPara(c, "S2", [join(raiz, "propio", "mio.mjs")]),
      })
      expect(cuarto.confinable).toBe(false)
      expect(cuarto.argv).toBeUndefined()
      expect(readFileSync(cimiento, "utf8")).toBe("original\n")
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  // The case S144 proved matters most, now on a shared foundation.
  test("un proceso derivado tampoco cuela la escritura del Cimiento ajeno", () => {
    const raiz = entorno()
    try {
      const cimiento = join(raiz, "cimiento.mjs")
      const c = crearCoordinacion({ base: BASE })
      c.solicitar(solicitud({ cimientos: [cimiento] }))

      const cuarto = confinarComando(`python3 -c "open('${cimiento}','w').write('derivado')"`, {
        escribibles: escribiblesPara(c, "S2", [join(raiz, "propio", "mio.mjs")]),
      })
      expect(cuarto.confinable).toBe(false)
      expect(cuarto.argv).toBeUndefined()
      expect(readFileSync(cimiento, "utf8")).toBe("original\n")
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  test("una Sesión sin conjunto concedido conserva sus archivos propios escribibles", () => {
    const raiz = entorno()
    try {
      const mio = join(raiz, "propio", "mio.mjs")
      const c = crearCoordinacion({ base: BASE })
      expect(escribiblesPara(c, "S2", [mio])).toEqual([mio])
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  // A stopped intervention keeps its grant, so its room must not silently shrink either: the
  // work is preserved, not confiscated.
  test("una intervención detenida conserva su Cimiento en el cuarto", () => {
    const raiz = entorno()
    try {
      const cimiento = join(raiz, "cimiento.mjs")
      const c = crearCoordinacion({ base: BASE })
      c.solicitar(solicitud({ cimientos: [cimiento] }))
      c.detener({ sesion: "S1", motivo: "desconexion" })
      expect(escribiblesPara(c, "S1", [])).toEqual([cimiento])
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })
})
