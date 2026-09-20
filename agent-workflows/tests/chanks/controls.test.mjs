import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { CONTROLES, admisionHumana, alcanceAprobado, bloqueado, cierreComprobado, deltaValidado, entregaAutorizada, mutacionPermitida, permitido, resultadoGenuino, vinculoRoto } from "../../chanks/controls.mjs"

const aqui = dirname(new URL(import.meta.url).pathname)
const fuente = () => readFileSync(join(aqui, "..", "..", "chanks", "controls.mjs"), "utf8")

// One binding every control shares. A control that accepted evidence without it would be
// deciding about work it cannot identify.
const vinculo = (extra = {}) => ({
  repositorio: "control-tower",
  sesion: "S143",
  candidato: "0b02b9c5f6fde6daa2a9061a7a95ba8fe0107f52",
  base: "0b02b9c5f6fde6daa2a9061a7a95ba8fe0107f52",
  ...extra,
})

describe("el vínculo compartido", () => {
  test("acepta un vínculo completo y exacto", () => {
    expect(vinculoRoto(vinculo(), vinculo())).toBeNull()
  })

  // An incomplete declaration is not an empty one. Reading a missing field as "nothing to
  // check" is how a control ends up approving work it never identified.
  for (const campo of ["repositorio", "sesion", "candidato", "base"]) {
    test(`exige ${campo} y lo nombra cuando falta`, () => {
      const provisto = vinculo()
      delete provisto[campo]
      const roto = vinculoRoto(vinculo(), provisto)
      expect(roto).not.toBeNull()
      expect(roto.detalle).toContain(campo)
    })

    test(`rechaza ${campo} vacío en vez de tratarlo como ausente inofensivo`, () => {
      const roto = vinculoRoto(vinculo(), vinculo({ [campo]: "   " }))
      expect(roto).not.toBeNull()
      expect(roto.detalle).toContain(campo)
    })
  }

  test("rechaza evidencia de otra Sesión", () => {
    const roto = vinculoRoto(vinculo(), vinculo({ sesion: "S144" }))
    expect(roto).not.toBeNull()
    expect(roto.detalle).toContain("sesion")
    expect(roto.motivo).toMatch(/otro trabajo/i)
  })

  test("rechaza evidencia de otro repositorio", () => {
    const roto = vinculoRoto(vinculo(), vinculo({ repositorio: "otro-repo" }))
    expect(roto.detalle).toContain("repositorio")
  })

  test("rechaza otro candidato aunque la base coincida", () => {
    const roto = vinculoRoto(vinculo(), vinculo({ candidato: "f".repeat(40) }))
    expect(roto.detalle).toContain("candidato")
  })

  // A stale base is its own rejection, named as such: the work may be genuine and still be
  // answering about a repository state that no longer exists.
  test("rechaza una base desactualizada y lo dice como tal", () => {
    const roto = vinculoRoto(vinculo(), vinculo({ base: "a".repeat(40) }))
    expect(roto.detalle).toContain("base")
    expect(roto.motivo).toMatch(/base desactualizada/i)
  })

  test("nombra todos los campos que no coinciden, no sólo el primero", () => {
    const roto = vinculoRoto(vinculo(), vinculo({ sesion: "S144", base: "a".repeat(40) }))
    expect(roto.detalle).toEqual(["sesion", "base"])
  })

  test("rechaza un vínculo que no es un objeto", () => {
    for (const basura of [null, undefined, "S143", 42, []]) {
      expect(vinculoRoto(vinculo(), basura)).not.toBeNull()
    }
  })
})

describe("la forma de una decisión", () => {
  test("una decisión permitida se lee permitida y nombra su control", () => {
    const d = permitido("alcance", "el humano aprobó el alcance")
    expect(d.permitido).toBe(true)
    expect(d.control).toBe("alcance")
    expect(d.motivo).toBeTruthy()
  })

  // The blocked shape must never be truthy by accident: a caller checking the object instead
  // of the field would read every block as a pass.
  test("una decisión bloqueada nunca se lee como permitida", () => {
    const d = bloqueado("alcance", "falta la aprobación", ["alcance"])
    expect(d.permitido).toBe(false)
    expect(d.detalle).toEqual(["alcance"])
  })

  test("una decisión bloqueada siempre explica por qué", () => {
    expect(bloqueado("alcance", "falta la aprobación").motivo).toBeTruthy()
  })

  test("enumera exactamente los siete controles, sin un octavo", () => {
    expect(CONTROLES).toEqual(["alcance", "delta", "admision", "mutacion", "resultado", "entrega", "cierre"])
  })
})

// "El núcleo no escribe archivos, modifica Git, lanza workers ni publica." That is a property
// of the module, not an intention in a document, so it is checked against the source itself.
// A decision engine that can reach the filesystem is one refactor away from executing the very
// effect it was built to gate.
describe("el núcleo no tiene efectos", () => {
  test("no importa nada capaz de tocar disco, procesos o la red", () => {
    const prohibidos = [
      "node:fs", "node:child_process", "node:net", "node:http", "node:https",
      "node:worker_threads", "node:vm", "node:dgram", "node:cluster", "node:module",
    ]
    const src = fuente()
    for (const modulo of prohibidos) {
      expect(src).not.toContain(modulo)
    }
  })

  test("no llama a fetch, exec, spawn ni escribe por process", () => {
    const src = fuente()
    for (const efecto of ["fetch(", "execSync", "execFileSync", "spawn(", "process.stdout", "process.exit", "Bun.write", "Bun.spawn"]) {
      expect(src).not.toContain(efecto)
    }
  })

  test("decidir dos veces con la misma entrada da lo mismo", () => {
    const a = vinculoRoto(vinculo(), vinculo({ sesion: "S144" }))
    const b = vinculoRoto(vinculo(), vinculo({ sesion: "S144" }))
    expect(a).toEqual(b)
  })

  test("no muta la autoridad ni la evidencia que recibe", () => {
    const esperado = vinculo()
    const provisto = vinculo({ sesion: "S144" })
    vinculoRoto(esperado, provisto)
    expect(esperado).toEqual(vinculo())
    expect(provisto).toEqual(vinculo({ sesion: "S144" }))
  })
})

// --- Control 1: no se planifica sin alcance aprobado ------------------------

const autoridadDeAlcance = (alcance = {}) => ({
  vinculo: vinculo(),
  alcance: { aprobado: true, origen: "humano", referencia: "Engram 11119", ...alcance },
})

describe("control 1 — alcance aprobado", () => {
  test("permite planificar cuando el humano aprobó el alcance", () => {
    const d = alcanceAprobado(autoridadDeAlcance(), { vinculo: vinculo() })
    expect(d.permitido).toBe(true)
    expect(d.control).toBe("alcance")
  })

  test("bloquea cuando no hay alcance declarado", () => {
    const d = alcanceAprobado({ vinculo: vinculo() }, { vinculo: vinculo() })
    expect(d.permitido).toBe(false)
  })

  test("bloquea cuando el alcance existe pero no está aprobado", () => {
    const d = alcanceAprobado(autoridadDeAlcance({ aprobado: false }), { vinculo: vinculo() })
    expect(d.permitido).toBe(false)
  })

  // "Una afirmación del agente o una huella de archivos no fabrica aprobación humana."
  // This is the control's whole reason to exist: everything else it checks is bookkeeping.
  for (const origen of ["agente", "huella", "inferido", "", undefined]) {
    test(`bloquea cuando el origen de la aprobación es ${JSON.stringify(origen)}`, () => {
      const d = alcanceAprobado(autoridadDeAlcance({ origen }), { vinculo: vinculo() })
      expect(d.permitido).toBe(false)
      expect(d.motivo).toMatch(/human/i)
    })
  }

  test("bloquea una aprobación humana sin referencia trazable", () => {
    const d = alcanceAprobado(autoridadDeAlcance({ referencia: "" }), { vinculo: vinculo() })
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("referencia")
  })

  test("bloquea por vínculo roto antes de mirar el alcance", () => {
    const d = alcanceAprobado(autoridadDeAlcance(), { vinculo: vinculo({ sesion: "S144" }) })
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("sesion")
  })
})

// --- Control 2: no se registra sin el delta exacto validado -----------------

const autoridadDeDelta = (delta = {}) => ({
  vinculo: vinculo(),
  delta: {
    anterior: "estado: PLANIFICADO",
    nuevo: "estado: LISTO",
    validado: true,
    validadoPor: "radar check",
    ...delta,
  },
})

describe("control 2 — delta exacto validado", () => {
  test("permite registrar un delta exacto y validado", () => {
    const d = deltaValidado(autoridadDeDelta(), { vinculo: vinculo() })
    expect(d.permitido).toBe(true)
    expect(d.control).toBe("delta")
  })

  test("bloquea cuando no hay delta declarado", () => {
    expect(deltaValidado({ vinculo: vinculo() }, { vinculo: vinculo() }).permitido).toBe(false)
  })

  // "Exacto" means both sides are on the table. A delta that only says what it wants cannot be
  // compared against what is actually there.
  for (const campo of ["anterior", "nuevo"]) {
    test(`bloquea un delta sin ${campo}: no es exacto`, () => {
      const d = deltaValidado(autoridadDeDelta({ [campo]: "" }), { vinculo: vinculo() })
      expect(d.permitido).toBe(false)
      expect(d.detalle).toContain(campo)
    })
  }

  test("bloquea un delta que no cambia nada", () => {
    const d = deltaValidado(autoridadDeDelta({ nuevo: "estado: PLANIFICADO" }), { vinculo: vinculo() })
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/no cambia/i)
  })

  test("bloquea cuando la validación no ocurrió", () => {
    expect(deltaValidado(autoridadDeDelta({ validado: false }), { vinculo: vinculo() }).permitido).toBe(false)
  })

  // An unnamed validator is an unverifiable claim, which is the same as no validation.
  test("bloquea una validación que no nombra quién validó", () => {
    const d = deltaValidado(autoridadDeDelta({ validadoPor: "" }), { vinculo: vinculo() })
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("validadoPor")
  })

  test("bloquea por base desactualizada antes de registrar", () => {
    const d = deltaValidado(autoridadDeDelta(), { vinculo: vinculo({ base: "a".repeat(40) }) })
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/base desactualizada/i)
  })
})

// --- Control 3: no se arranca sin admisión humana y Radar fresco ------------

const autoridadDeAdmision = (admision = {}) => ({
  vinculo: vinculo(),
  admision: { intencion: "start", estado: "LISTO", seleccionadaPor: "humano", ruta: "odd", ...admision },
})

const evidenciaDeRadar = (radar = {}) => ({
  vinculo: vinculo(),
  radar: {
    estadoDigest: "3971894b7d9594ed",
    sesionDigest: "5bc6c2100af18e94",
    recapturaCoincide: true,
    head: vinculo().base,
    ...radar,
  },
})

describe("control 3 — admisión humana con Radar fresco", () => {
  test("permite arrancar una Sesión LISTO que eligió el humano", () => {
    const d = admisionHumana(autoridadDeAdmision(), evidenciaDeRadar())
    expect(d.permitido).toBe(true)
    expect(d.control).toBe("admision")
  })

  test("bloquea start cuando la Sesión no está LISTO", () => {
    for (const estado of ["PLANIFICADO", "BLOQUEADO", "DIFERIDO", "EN CURSO", "COMPLETO", "ARCHIVADO"]) {
      expect(admisionHumana(autoridadDeAdmision({ estado }), evidenciaDeRadar()).permitido).toBe(false)
    }
  })

  test("continue y resume aceptan LISTO o EN CURSO, y nada más", () => {
    for (const intencion of ["continue", "resume"]) {
      for (const estado of ["LISTO", "EN CURSO"]) {
        expect(admisionHumana(autoridadDeAdmision({ intencion, estado }), evidenciaDeRadar()).permitido).toBe(true)
      }
      for (const estado of ["PLANIFICADO", "BLOQUEADO", "DIFERIDO", "COMPLETO"]) {
        expect(admisionHumana(autoridadDeAdmision({ intencion, estado }), evidenciaDeRadar()).permitido).toBe(false)
      }
    }
  })

  test("bloquea una intención que no es start, continue ni resume", () => {
    const d = admisionHumana(autoridadDeAdmision({ intencion: "empezar" }), evidenciaDeRadar())
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("intencion")
  })

  // Radar proposes; it never chooses. A Sesión selected by the agent is the failure this
  // control exists to catch, not a shortcut.
  test("bloquea cuando la Sesión la eligió el agente y no el humano", () => {
    for (const quien of ["agente", "radar", "memoria", "", undefined]) {
      const d = admisionHumana(autoridadDeAdmision({ seleccionadaPor: quien }), evidenciaDeRadar())
      expect(d.permitido).toBe(false)
      expect(d.motivo).toMatch(/human/i)
    }
  })

  for (const campo of ["estadoDigest", "sesionDigest"]) {
    test(`bloquea cuando falta ${campo}`, () => {
      const d = admisionHumana(autoridadDeAdmision(), evidenciaDeRadar({ [campo]: "" }))
      expect(d.permitido).toBe(false)
      expect(d.detalle).toContain(campo)
    })
  }

  // Two captures that disagree mean the plan moved under the reader's feet. That is not fresh
  // evidence, it is evidence of a race.
  test("bloquea cuando la recaptura no coincide", () => {
    const d = admisionHumana(autoridadDeAdmision(), evidenciaDeRadar({ recapturaCoincide: false }))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("recapturaCoincide")
  })

  test("bloquea cuando el bundle se capturó sobre otro HEAD", () => {
    const d = admisionHumana(autoridadDeAdmision(), evidenciaDeRadar({ head: "a".repeat(40) }))
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/fresc|desactualiz/i)
  })

  test("bloquea cuando no hay evidencia de Radar", () => {
    expect(admisionHumana(autoridadDeAdmision(), { vinculo: vinculo() }).permitido).toBe(false)
  })
})

// "La ruta se valida dentro de la admisión existente, sin añadir un octavo control."
describe("control 3 — la ruta se valida adentro", () => {
  test("ODD es la ruta nativa y no pide nada extra", () => {
    expect(admisionHumana(autoridadDeAdmision({ ruta: "odd" }), evidenciaDeRadar()).permitido).toBe(true)
  })

  test("SDD sin solicitud humana explícita se bloquea", () => {
    const d = admisionHumana(autoridadDeAdmision({ ruta: "sdd" }), evidenciaDeRadar())
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("ruta")
  })

  test("SDD con solicitud humana explícita se permite", () => {
    const d = admisionHumana(autoridadDeAdmision({ ruta: "sdd", solicitudSDD: true }), evidenciaDeRadar())
    expect(d.permitido).toBe(true)
  })

  test("una ruta desconocida se bloquea en vez de caer en un default permisivo", () => {
    expect(admisionHumana(autoridadDeAdmision({ ruta: "directo" }), evidenciaDeRadar()).permitido).toBe(false)
  })

  test("validar la ruta no agrega un octavo control", () => {
    expect(CONTROLES).toHaveLength(7)
    expect(CONTROLES).not.toContain("ruta")
  })
})

// --- Control 4: no se muta fuera de lo permitido ----------------------------

const autoridadDeMutacion = (extra = {}) => ({
  vinculo: vinculo(),
  archivos: ["agent-workflows/chanks/controls.mjs", "agent-workflows/tests/chanks/controls.test.mjs"],
  cimientos: [],
  recurso: [],
  ...extra,
})

const evidenciaDeMutacion = (extra = {}) => ({
  vinculo: vinculo(),
  mutaciones: ["agent-workflows/chanks/controls.mjs"],
  reservas: [],
  recursoConfirmado: false,
  ...extra,
})

describe("control 4 — mutación dentro de archivos y recursos permitidos", () => {
  test("permite mutar los archivos exactos que la Sesión declaró", () => {
    const d = mutacionPermitida(autoridadDeMutacion(), evidenciaDeMutacion())
    expect(d.permitido).toBe(true)
    expect(d.control).toBe("mutacion")
  })

  test("bloquea un archivo fuera de los declarados y lo nombra", () => {
    const d = mutacionPermitida(autoridadDeMutacion(), evidenciaDeMutacion({ mutaciones: ["core.mjs"] }))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("core.mjs")
  })

  test("nombra todos los archivos fuera de alcance, no sólo el primero", () => {
    const d = mutacionPermitida(
      autoridadDeMutacion(),
      evidenciaDeMutacion({ mutaciones: ["core.mjs", "agent-workflows/chanks/controls.mjs", "install/lifecycle.mjs"] }),
    )
    expect(d.detalle).toEqual(["core.mjs", "install/lifecycle.mjs"])
  })

  // An authority that declares no files has not authorized everything; it has authorized
  // nothing yet. Reading the empty list as "no restriction" inverts the control.
  test("bloquea cuando la autoridad no declara archivos", () => {
    const d = mutacionPermitida(autoridadDeMutacion({ archivos: [] }), evidenciaDeMutacion())
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/no declara/i)
  })

  test("bloquea cuando la evidencia no dice qué va a mutar", () => {
    expect(mutacionPermitida(autoridadDeMutacion(), evidenciaDeMutacion({ mutaciones: [] })).permitido).toBe(false)
  })

  test("un Cimiento compartido exige una reserva exacta confirmada", () => {
    const autoridad = autoridadDeMutacion({
      archivos: ["shared/base.mjs"],
      cimientos: ["shared/base.mjs"],
    })
    const d = mutacionPermitida(autoridad, evidenciaDeMutacion({ mutaciones: ["shared/base.mjs"] }))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("shared/base.mjs")
    expect(d.motivo).toMatch(/cimiento/i)
  })

  test("permite el Cimiento cuando su reserva exacta está confirmada", () => {
    const autoridad = autoridadDeMutacion({ archivos: ["shared/base.mjs"], cimientos: ["shared/base.mjs"] })
    const evidencia = evidenciaDeMutacion({ mutaciones: ["shared/base.mjs"], reservas: ["shared/base.mjs"] })
    expect(mutacionPermitida(autoridad, evidencia).permitido).toBe(true)
  })

  test("una reserva de otro archivo no habilita el Cimiento que se va a tocar", () => {
    const autoridad = autoridadDeMutacion({ archivos: ["shared/base.mjs"], cimientos: ["shared/base.mjs"] })
    const evidencia = evidenciaDeMutacion({ mutaciones: ["shared/base.mjs"], reservas: ["shared/otro.mjs"] })
    expect(mutacionPermitida(autoridad, evidencia).permitido).toBe(false)
  })

  // "La declaración de Recurso no equivale a adquisición." Declaring it is the beginning of
  // the obligation, not the end of it.
  test("un Recurso declarado exige uso exclusivo confirmado antes de mutar", () => {
    const autoridad = autoridadDeMutacion({ recurso: ["runtime Pi aislado"] })
    const d = mutacionPermitida(autoridad, evidenciaDeMutacion({ recursoConfirmado: false }))
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/exclusiv|adquisici/i)
  })

  test("permite cuando el uso exclusivo del Recurso está confirmado", () => {
    const autoridad = autoridadDeMutacion({ recurso: ["runtime Pi aislado"] })
    const d = mutacionPermitida(autoridad, evidenciaDeMutacion({ recursoConfirmado: true }))
    expect(d.permitido).toBe(true)
  })

  test("sin Recurso declarado no se exige confirmación de nada", () => {
    expect(mutacionPermitida(autoridadDeMutacion(), evidenciaDeMutacion({ recursoConfirmado: false })).permitido).toBe(true)
  })

  test("bloquea por vínculo roto antes de mirar los archivos", () => {
    const d = mutacionPermitida(autoridadDeMutacion(), evidenciaDeMutacion({ vinculo: vinculo({ candidato: "f".repeat(40) }) }))
    expect(d.detalle).toContain("candidato")
  })
})

// --- Control 5: no se consume un resultado que no sea genuino ---------------

const autoridadDeResultado = (extra = {}) => ({ vinculo: vinculo(), ...extra })

const evidenciaDeResultado = (resultado = {}, cubre = ["agent-workflows/chanks/controls.mjs"]) => ({
  vinculo: vinculo(),
  cubre,
  resultado: {
    identidad: "gentle-ai review",
    veredicto: "pass",
    base: vinculo().base,
    cobertura: ["agent-workflows/chanks/controls.mjs"],
    ...resultado,
  },
})

describe("control 5 — resultados técnicos genuinos", () => {
  test("permite consumir un PASS con identidad, procedencia, actualidad y cobertura", () => {
    const d = resultadoGenuino(autoridadDeResultado(), evidenciaDeResultado())
    expect(d.permitido).toBe(true)
    expect(d.control).toBe("resultado")
  })

  test("bloquea un veredicto fail", () => {
    expect(resultadoGenuino(autoridadDeResultado(), evidenciaDeResultado({ veredicto: "fail" })).permitido).toBe(false)
  })

  // "Un resultado desconocido, indisponible, vacío o declinado no se convierte en PASS."
  // These are the four shapes that most want to be read as success and are not.
  for (const veredicto of ["desconocido", "indisponible", "vacio"]) {
    test(`un resultado ${veredicto} nunca es PASS`, () => {
      const d = resultadoGenuino(autoridadDeResultado(), evidenciaDeResultado({ veredicto }))
      expect(d.permitido).toBe(false)
      expect(d.motivo).toMatch(/no es un PASS/i)
    })
  }

  test("un veredicto que no existe se bloquea en vez de caer en un default permisivo", () => {
    expect(resultadoGenuino(autoridadDeResultado(), evidenciaDeResultado({ veredicto: "aprobadisimo" })).permitido).toBe(false)
  })

  test("bloquea un resultado sin identidad: no se sabe qué lo produjo", () => {
    const d = resultadoGenuino(autoridadDeResultado(), evidenciaDeResultado({ identidad: "" }))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("identidad")
  })

  test("bloquea un resultado calculado sobre otra base: no es actual", () => {
    const d = resultadoGenuino(autoridadDeResultado(), evidenciaDeResultado({ base: "a".repeat(40) }))
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/actual|base/i)
  })

  test("bloquea cuando el resultado no cubre todo lo que se le atribuye, y nombra los huecos", () => {
    const d = resultadoGenuino(
      autoridadDeResultado(),
      evidenciaDeResultado({}, ["agent-workflows/chanks/controls.mjs", "agent-workflows/chanks/pi-controls.mjs"]),
    )
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("agent-workflows/chanks/pi-controls.mjs")
  })

  test("bloquea cuando no hay resultado", () => {
    expect(resultadoGenuino(autoridadDeResultado(), { vinculo: vinculo(), cubre: ["x"] }).permitido).toBe(false)
  })
})

// "La declinación de revisión respeta el camino alternativo aplicable del proveedor, sin
// inventar un bloqueo incondicional." A decline is not a failure and not a pass; turning it
// into either one is a different bug.
describe("control 5 — una declinación no es ni PASS ni bloqueo incondicional", () => {
  test("una declinación con camino alternativo deja seguir, y lo dice sin llamarlo PASS", () => {
    const d = resultadoGenuino(
      autoridadDeResultado(),
      evidenciaDeResultado({ veredicto: "declinado", caminoAlternativo: "política ordinaria del repositorio" }),
    )
    expect(d.permitido).toBe(true)
    expect(d.motivo).toMatch(/no es un PASS/i)
    expect(d.detalle).toContain("declinado")
  })

  test("una declinación sin camino alternativo aplicable sí bloquea", () => {
    const d = resultadoGenuino(autoridadDeResultado(), evidenciaDeResultado({ veredicto: "declinado" }))
    expect(d.permitido).toBe(false)
  })

  test("una declinación con camino alternativo no se convierte en bloqueo incondicional", () => {
    const d = resultadoGenuino(
      autoridadDeResultado(),
      evidenciaDeResultado({ veredicto: "declinado", caminoAlternativo: "política ordinaria del repositorio" }),
    )
    expect(d.permitido).not.toBe(false)
  })
})

// --- Control 6: no se entrega sin autorización del candidato exacto ---------

const autoridadDeEntrega = (extra = {}) => ({
  vinculo: vinculo(),
  politica: "commit-directo",
  destino: "master",
  ...extra,
})

const evidenciaDeEntrega = (extra = {}) => ({
  vinculo: vinculo(),
  autorizacion: { candidato: vinculo().candidato, otorgadaPor: "humano" },
  metodo: "commit-directo",
  destinoOcupadoPor: null,
  ...extra,
})

describe("control 6 — entrega autorizada", () => {
  test("permite entregar con autorización humana del candidato exacto y el método de la política", () => {
    const d = entregaAutorizada(autoridadDeEntrega(), evidenciaDeEntrega())
    expect(d.permitido).toBe(true)
    expect(d.control).toBe("entrega")
  })

  test("bloquea sin autorización", () => {
    expect(entregaAutorizada(autoridadDeEntrega(), evidenciaDeEntrega({ autorizacion: null })).permitido).toBe(false)
  })

  // An authorization for a different candidate is an authorization for different bytes.
  test("bloquea una autorización de otro candidato", () => {
    const d = entregaAutorizada(
      autoridadDeEntrega(),
      evidenciaDeEntrega({ autorizacion: { candidato: "f".repeat(40), otorgadaPor: "humano" } }),
    )
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("candidato")
  })

  test("bloquea una autorización que se dio el propio agente", () => {
    const d = entregaAutorizada(
      autoridadDeEntrega(),
      evidenciaDeEntrega({ autorizacion: { candidato: vinculo().candidato, otorgadaPor: "agente" } }),
    )
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/human/i)
  })

  test("bloquea un método que no es el de la política del repositorio", () => {
    const d = entregaAutorizada(autoridadDeEntrega(), evidenciaDeEntrega({ metodo: "pull-request" }))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("metodo")
  })

  // Serialisation is about the destination, not about who is asking: two different candidates
  // pushing the same branch is exactly the collision this prevents.
  test("bloquea cuando el destino ya tiene una operación incompatible, aunque sea de otro candidato", () => {
    const d = entregaAutorizada(autoridadDeEntrega(), evidenciaDeEntrega({ destinoOcupadoPor: "S144" }))
    expect(d.permitido).toBe(false)
    expect(d.motivo).toMatch(/serializ|destino/i)
  })

  // "El permiso de publicación se distingue de la evidencia de publicación efectiva."
  test("autorizar la entrega no afirma que se haya publicado", () => {
    const d = entregaAutorizada(autoridadDeEntrega(), evidenciaDeEntrega())
    expect(d.motivo).toMatch(/no afirma|no es evidencia/i)
  })
})

// --- Control 7: no se cierra sin publicación comprobada, registro y doc -----

const evidenciaDeCierre = (extra = {}) => ({
  vinculo: vinculo(),
  publicacion: { comprobada: true, candidato: vinculo().candidato },
  registro: { hecho: true },
  documentacion: { hecha: true },
  ...extra,
})

describe("control 7 — cierre comprobado", () => {
  test("permite cerrar con publicación comprobada, registro y documentación", () => {
    const d = cierreComprobado({ vinculo: vinculo() }, evidenciaDeCierre())
    expect(d.permitido).toBe(true)
    expect(d.control).toBe("cierre")
  })

  // A permit is not a publication, and neither is a local commit. Both are the states people
  // most often mistake for "shipped".
  test("bloquea cuando la publicación no está comprobada", () => {
    const d = cierreComprobado({ vinculo: vinculo() }, evidenciaDeCierre({ publicacion: { comprobada: false, candidato: vinculo().candidato } }))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("publicacion")
  })

  test("bloquea cuando lo publicado es otro candidato", () => {
    const d = cierreComprobado({ vinculo: vinculo() }, evidenciaDeCierre({ publicacion: { comprobada: true, candidato: "f".repeat(40) } }))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("candidato")
  })

  test("bloquea sin documentación", () => {
    const d = cierreComprobado({ vinculo: vinculo() }, evidenciaDeCierre({ documentacion: { hecha: false } }))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("documentacion")
  })

  // "Publicación exitosa con registro fallido conserva esa distinción: no declara cierre ni
  // vuelve a publicar o revierte automáticamente." Three claims, all of them testable.
  test("publicación lograda con registro fallido no declara cierre", () => {
    const d = cierreComprobado({ vinculo: vinculo() }, evidenciaDeCierre({ registro: { hecho: false } }))
    expect(d.permitido).toBe(false)
    expect(d.detalle).toContain("registro")
  })

  test("publicación lograda con registro fallido no pide republicar ni revertir", () => {
    const d = cierreComprobado({ vinculo: vinculo() }, evidenciaDeCierre({ registro: { hecho: false } }))
    expect(d.motivo).toMatch(/no se vuelve a publicar/i)
    expect(d.motivo).toMatch(/no se revierte/i)
    expect(d.motivo).not.toMatch(/revertí|volvé a publicar|republicar ahora/i)
  })
})

// "Chanks valida identidad, procedencia, actualidad y cobertura … sin crear otro ejecutor,
// almacenamiento, evaluador, API de recibos ni revisión por Módulo." The exported surface is
// where that promise either holds or quietly stops holding.
describe("la superficie exportada", () => {
  test("exporta los siete controles, los constructores de decisión y nada más", async () => {
    const modulo = await import("../../chanks/controls.mjs")
    expect(Object.keys(modulo).sort()).toEqual([
      "CONTROLES",
      "admisionHumana",
      "alcanceAprobado",
      "bloqueado",
      "cierreComprobado",
      "deltaValidado",
      "entregaAutorizada",
      "mutacionPermitida",
      "permitido",
      "resultadoGenuino",
      "vinculoRoto",
    ])
  })
})
