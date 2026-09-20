import { describe, expect, test } from "bun:test"

import { aPi, confinarComando, crearActivaciones, decidirHerramienta, gobernar } from "../../chanks/pi-controls.mjs"

// The real shapes Pi hands an extension, from
// @earendil-works/pi-coding-agent/dist/core/tools/{bash,write,edit}.d.ts.
const vinculo = (extra = {}) => ({
  repositorio: "control-tower",
  sesion: "S144",
  candidato: "99d29a359b04cca85d5dba7c86948c739552757e",
  base: "99d29a359b04cca85d5dba7c86948c739552757e",
  ...extra,
})

const autoridad = (extra = {}) => ({
  vinculo: vinculo(),
  archivos: ["agent-workflows/chanks/pi-controls.mjs", "agent-workflows/tests/chanks/pi-controls.test.mjs"],
  cimientos: [],
  recurso: [],
  ...extra,
})

const evento = (toolName, input) => ({ type: "tool_call", toolCallId: "tc-1", toolName, input })

describe("de un evento de Pi a una decisión", () => {
  // Reading has no effect, so there is nothing for a control to prevent. Blocking it would be
  // theatre, and theatre is what this Sesión exists to replace.
  for (const herramienta of ["read", "grep", "find", "ls"]) {
    test(`${herramienta} no tiene efecto y no se bloquea`, () => {
      const d = decidirHerramienta(autoridad(), evento(herramienta, { path: "core.mjs" }))
      expect(d.permitido).toBe(true)
    })
  }

  test("write dentro de los archivos autorizados se permite", () => {
    const d = decidirHerramienta(autoridad(), evento("write", { path: "agent-workflows/chanks/pi-controls.mjs", content: "x" }))
    expect(d.permitido).toBe(true)
    expect(d.control).toBe("mutacion")
  })

  test("write fuera de los archivos autorizados se bloquea y nombra la ruta", () => {
    const d = decidirHerramienta(autoridad(), evento("write", { path: "core.mjs", content: "x" }))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("core.mjs")
  })

  test("edit fuera de los archivos autorizados se bloquea", () => {
    const d = decidirHerramienta(
      autoridad(),
      evento("edit", { path: "install/lifecycle.mjs", edits: [{ oldText: "a", newText: "b" }] }),
    )
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("install/lifecycle.mjs")
  })

  // The adapter must not re-decide anything: the verdict and its wording come from the S143
  // core. A second implementation would be a second answer.
  test("el veredicto y su motivo vienen del núcleo de S143", () => {
    const d = decidirHerramienta(autoridad(), {
      ...evento("write", { path: "core.mjs", content: "x" }),
    })
    expect(d.motivo).toMatch(/fuera de los archivos autorizados/i)
  })

  test("un vínculo roto bloquea antes de mirar la herramienta", () => {
    const a = autoridad({ vinculo: vinculo({ base: "a".repeat(40) }) })
    const d = decidirHerramienta(a, evento("write", { path: "core.mjs", content: "x" }), { vinculo: vinculo() })
    expect(d.permitido).toBe(false)
  })

  // "Una operación cuyos efectos no puedan controlarse se rechaza sin salida permisiva
  // alternativa." An unknown tool is exactly that case, and defaulting to permitted is how a
  // gate quietly stops being one.
  test("una herramienta desconocida se rechaza, no se permite por defecto", () => {
    const d = decidirHerramienta(autoridad(), evento("teletransportar", { destino: "marte" }))
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/no se pueden controlar|desconocida/i)
  })

  test("un evento sin herramienta se rechaza", () => {
    for (const basura of [null, undefined, {}, { type: "tool_call" }]) {
      expect(decidirHerramienta(autoridad(), basura).permitido).toBe(false)
    }
  })

  // bash is not decided by a path, because it has none. Its effects are governed by the
  // confinement, which T3 builds; here it only has to stop being waved through.
  test("bash no se resuelve por ruta: queda sujeto al confinamiento", () => {
    const d = decidirHerramienta(autoridad(), evento("bash", { command: "bun test" }))
    expect(d.exigeConfinamiento).toBe(true)
  })

  test("write no exige confinamiento: su ruta exacta ya se comprobó", () => {
    const d = decidirHerramienta(autoridad(), evento("write", { path: "agent-workflows/chanks/pi-controls.mjs", content: "x" }))
    expect(d.exigeConfinamiento).toBeFalsy()
  })
})

describe("la traducción a la forma de Pi", () => {
  // Pi reads an absent `block` as "go ahead". Returning `block: false` would work too, but an
  // empty result cannot be misread by a future version that only checks presence.
  test("una decisión permitida no pide bloqueo", () => {
    const pi = aPi({ permitido: true, control: "mutacion", motivo: "ok", detalle: [] })
    expect(pi.block).toBeUndefined()
  })

  test("una decisión bloqueada pide bloqueo y explica por qué", () => {
    const pi = aPi({ permitido: false, control: "mutacion", motivo: "fuera de alcance", detalle: ["core.mjs"] })
    expect(pi.block).toBe(true)
    expect(pi.reason).toMatch(/fuera de alcance/)
  })

  // The blocked reason reaches the model, so it has to carry the offending evidence or the
  // agent retries blindly.
  test("el motivo del bloqueo incluye la evidencia exacta", () => {
    const pi = aPi({ permitido: false, control: "mutacion", motivo: "fuera de alcance", detalle: ["core.mjs"] })
    expect(pi.reason).toContain("core.mjs")
  })
})

// --- T2: el mensaje visible ------------------------------------------------

const transicion = (extra = {}) => ({
  sesion: "S144",
  accion: "mutar agent-workflows/chanks/pi-controls.mjs",
  decision: { permitido: true, control: "mutacion", motivo: "dentro de lo autorizado", detalle: [] },
  ...extra,
})

const bloqueo = (detalle = ["core.mjs"]) => transicion({
  accion: "mutar core.mjs",
  decision: { permitido: false, control: "mutacion", motivo: "fuera de los archivos autorizados", detalle },
})

describe("el mensaje visible", () => {
  test("muestra exactamente 💪 Chanks", () => {
    expect(crearActivaciones().anunciar(transicion())).toContain("💪 Chanks")
  })

  // "Main manual no se etiqueta como 🗼 Torre." The manual method running with the Tower off
  // must not borrow the Tower's identity, or the transcript stops saying what actually ran.
  test("nunca se etiqueta como 🗼 Torre", () => {
    const a = crearActivaciones()
    expect(a.anunciar(transicion())).not.toContain("🗼")
    expect(a.anunciar(bloqueo())).not.toContain("Torre")
  })

  test("nombra la acción real del método", () => {
    expect(crearActivaciones().anunciar(transicion())).toContain("mutar agent-workflows/chanks/pi-controls.mjs")
  })

  // The result is a separate field, not an adjective buried in the sentence: someone scanning
  // the transcript has to see permitted or blocked without parsing prose.
  test("el resultado va separado de la acción", () => {
    expect(crearActivaciones().anunciar(transicion())).toMatch(/·\s*permitido\s*·/)
    expect(crearActivaciones().anunciar(bloqueo())).toMatch(/·\s*bloqueado\s*·/)
  })

  test("lleva contexto suficiente: la Sesión y el motivo", () => {
    const linea = crearActivaciones().anunciar(bloqueo())
    expect(linea).toContain("S144")
    expect(linea).toContain("fuera de los archivos autorizados")
    expect(linea).toContain("core.mjs")
  })

  // "Una autorización no afirma ejecución, publicación ni cierre; la marca visible no sustituye
  // la comprobación de efectos."
  test("una autorización no afirma que algo se ejecutó, publicó o cerró", () => {
    const linea = crearActivaciones().anunciar(transicion())
    for (const verbo of ["ejecutado", "publicado", "cerrado", "entregado"]) {
      expect(linea).not.toContain(verbo)
    }
  })
})

describe("el mensaje no se duplica por cada llamada de herramienta", () => {
  test("la misma transición repetida se anuncia una sola vez", () => {
    const a = crearActivaciones()
    expect(a.anunciar(transicion())).toBeTruthy()
    expect(a.anunciar(transicion())).toBeNull()
    expect(a.anunciar(transicion())).toBeNull()
  })

  test("una transición distinta sí se anuncia", () => {
    const a = crearActivaciones()
    a.anunciar(transicion())
    expect(a.anunciar(bloqueo())).toBeTruthy()
  })

  test("bloquear otro archivo es otra transición significativa", () => {
    const a = crearActivaciones()
    a.anunciar(bloqueo(["core.mjs"]))
    expect(a.anunciar(bloqueo(["install/lifecycle.mjs"]))).toBeTruthy()
  })

  test("dos emisores no comparten memoria: cada sesión arranca limpia", () => {
    crearActivaciones().anunciar(transicion())
    expect(crearActivaciones().anunciar(transicion())).toBeTruthy()
  })
})

// --- T3: construir el cuarto chico -----------------------------------------

import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const cuarto = () => {
  const raiz = mkdtempSync(join(tmpdir(), "chanks-s144-"))
  mkdirSync(join(raiz, "agent-workflows", "chanks"), { recursive: true })
  mkdirSync(join(raiz, "prohibido"), { recursive: true })
  writeFileSync(join(raiz, "agent-workflows", "chanks", "permitido.mjs"), "original\n")
  writeFileSync(join(raiz, "prohibido", "testigo.txt"), "original\n")
  return raiz
}

describe("construir el cuarto chico", () => {
  test("monta todo sólo lectura y sólo lo autorizado como escribible", () => {
    const raiz = cuarto()
    try {
      const escribible = join(raiz, "agent-workflows", "chanks", "permitido.mjs")
      const c = confinarComando("echo hola", { escribibles: [escribible] })
      expect(c.confinable).toBe(true)
      expect(c.argv).toContain("--ro-bind")
      // Read-only root first, then the exact writable paths mounted over it.
      expect(c.argv.join(" ")).toContain(`--bind ${escribible} ${escribible}`)
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  test("la red queda apagada", () => {
    const raiz = cuarto()
    try {
      const c = confinarComando("echo hola", { escribibles: [join(raiz, "prohibido", "testigo.txt")] })
      expect(c.argv).toContain("--unshare-net")
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  test("preserva el comando original sin reinterpretarlo", () => {
    const raiz = cuarto()
    try {
      const c = confinarComando("echo 'hola mundo' && ls -la", { escribibles: [join(raiz, "prohibido", "testigo.txt")] })
      expect(c.argv.at(-1)).toBe("echo 'hola mundo' && ls -la")
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  // "Una operación cuyos efectos no puedan controlarse se rechaza sin salida permisiva."
  // A path that does not exist cannot be mounted, and mounting its parent directory instead
  // would quietly widen the room past what was authorized.
  test("una ruta autorizada que no existe hace el comando no confinable", () => {
    const raiz = cuarto()
    try {
      const c = confinarComando("echo hola", { escribibles: [join(raiz, "todavia-no.mjs")] })
      expect(c.confinable).toBe(false)
      expect(c.motivo).toMatch(/no existe/i)
      expect(c.argv).toBeUndefined()
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  test("sin ninguna ruta escribible el comando no es confinable", () => {
    const c = confinarComando("echo hola", { escribibles: [] })
    expect(c.confinable).toBe(false)
  })

  test("un comando vacío no es confinable", () => {
    const raiz = cuarto()
    try {
      for (const basura of ["", "   ", null, undefined]) {
        expect(confinarComando(basura, { escribibles: [join(raiz, "prohibido", "testigo.txt")] }).confinable).toBe(false)
      }
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  test("construir dos veces da exactamente lo mismo", () => {
    const raiz = cuarto()
    try {
      const opciones = { escribibles: [join(raiz, "prohibido", "testigo.txt")] }
      expect(confinarComando("bun test", opciones)).toEqual(confinarComando("bun test", opciones))
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })
})

// --- T4: lo no confinable se rechaza ---------------------------------------

describe("gobernar una llamada de herramienta", () => {
  test("write autorizado pasa y no pide confinamiento", () => {
    const g = gobernar(autoridad(), evento("write", { path: "agent-workflows/chanks/pi-controls.mjs", content: "x" }))
    expect(g.decision.permitido).toBe(true)
    expect(g.pi.block).toBeUndefined()
    expect(g.comandoConfinado).toBeUndefined()
  })

  test("write fuera de alcance se bloquea y Pi lo recibe como bloqueo", () => {
    const g = gobernar(autoridad(), evento("write", { path: "core.mjs", content: "x" }))
    expect(g.decision.permitido).toBe(false)
    expect(g.pi.block).toBe(true)
  })

  test("bash confinable se reescribe para correr dentro del cuarto", () => {
    const raiz = cuarto()
    try {
      const permitidoRuta = join(raiz, "agent-workflows", "chanks", "permitido.mjs")
      const g = gobernar(autoridad(), evento("bash", { command: "echo hola" }), { escribibles: [permitidoRuta] })
      expect(g.decision.permitido).toBe(true)
      expect(g.pi.block).toBeUndefined()
      expect(g.comandoConfinado.argv).toContain("bwrap")
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  // The rule the whole Sesión turns on: no permissive alternative. If the effects cannot be
  // confined, the operation is refused — it does not fall back to running loose with a warning.
  test("bash no confinable se rechaza, sin salida permisiva", () => {
    const g = gobernar(autoridad(), evento("bash", { command: "echo hola" }), { escribibles: [] })
    expect(g.decision.permitido).toBe(false)
    expect(g.pi.block).toBe(true)
    expect(g.comandoConfinado).toBeUndefined()
  })

  test("una herramienta desconocida se rechaza aunque haya cuarto disponible", () => {
    const raiz = cuarto()
    try {
      const g = gobernar(autoridad(), evento("teletransportar", {}), { escribibles: [join(raiz, "prohibido", "testigo.txt")] })
      expect(g.pi.block).toBe(true)
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })
})

// --- T5: la demostración en el runtime real --------------------------------
//
// This is what separates S144 from S143. Everything above proves the decision is right; these
// prove the effect does not happen. They run bubblewrap for real, and they fail rather than
// skip when it is missing: without it the guarantee does not hold on this machine, and a
// silent skip would claim a coverage nobody has.

const correr = (argv) => spawnSync(argv[0], argv.slice(1), { encoding: "utf8" })

describe("el efecto prohibido no ocurre (runtime real)", () => {
  test("bubblewrap está disponible, o esta garantía no existe acá", () => {
    const r = spawnSync("bwrap", ["--version"], { encoding: "utf8" })
    expect(r.error).toBeUndefined()
    expect(r.status).toBe(0)
  })

  test("una escritura directa fuera del cuarto no ocurre", () => {
    const raiz = cuarto()
    try {
      const permitidoRuta = join(raiz, "agent-workflows", "chanks", "permitido.mjs")
      const testigo = join(raiz, "prohibido", "testigo.txt")
      const c = confinarComando(`echo mutado > ${testigo}`, { escribibles: [permitidoRuta] })
      const r = correr(c.argv)
      expect(r.status).not.toBe(0)
      expect(readFileSync(testigo, "utf8")).toBe("original\n")
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  // "…incluidas escrituras por herramientas, órdenes y procesos derivados". This is the case
  // Pi's own block cannot cover, and the reason the confinement exists at all.
  test("una escritura desde un PROCESO DERIVADO tampoco ocurre", () => {
    const raiz = cuarto()
    try {
      const permitidoRuta = join(raiz, "agent-workflows", "chanks", "permitido.mjs")
      const testigo = join(raiz, "prohibido", "testigo.txt")
      const c = confinarComando(`python3 -c "open('${testigo}','w').write('derivado')"`, { escribibles: [permitidoRuta] })
      const r = correr(c.argv)
      expect(r.status).not.toBe(0)
      expect(readFileSync(testigo, "utf8")).toBe("original\n")
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  test("la escritura dentro del cuarto sí ocurre: el confinamiento no rompe el trabajo real", () => {
    const raiz = cuarto()
    try {
      const permitidoRuta = join(raiz, "agent-workflows", "chanks", "permitido.mjs")
      const c = confinarComando(`echo trabajado > ${permitidoRuta}`, { escribibles: [permitidoRuta] })
      const r = correr(c.argv)
      expect(r.status).toBe(0)
      expect(readFileSync(permitidoRuta, "utf8")).toBe("trabajado\n")
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  // The approved room has no network, and the rehearsal has to show it rather than assert it.
  test("la red está apagada adentro", () => {
    const raiz = cuarto()
    try {
      const permitidoRuta = join(raiz, "agent-workflows", "chanks", "permitido.mjs")
      const c = confinarComando("getent hosts github.com", { escribibles: [permitidoRuta] })
      expect(correr(c.argv).status).not.toBe(0)
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })
})
