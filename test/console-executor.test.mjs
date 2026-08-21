import { describe, expect, test } from "bun:test"
import { VERBS } from "../console/vocabulary.mjs"

// Decisión 60 — el camino de comando del operador está escrito hasta la mitad.
//
// `console/vocabulary.mjs` declara los verbos y `console/validate.mjs` los valida
// por completo: resuelve el agente destino, verifica sus estados legales y exige
// evidencia con confirmación para los verbos irreversibles. Lo que NO existe es el
// ejecutor: nada traduce un `{ ok: true, command }` validado en llamadas a las
// primitivas de `core.mjs`, y `bin/torre` no expone un solo verbo del vocabulario.
//
// Este archivo mantiene ese hueco visible en cada corrida de la suite, en vez de
// dejarlo en un documento que hay que acordarse de leer. No falla: los `todo` no
// cuentan como error.
//
// CÓMO SE MANTIENE: cuando un verbo consigue ejecutor, se agrega a EXECUTED y su
// pendiente desaparece solo. Cuando estén los trece, este archivo se borra.
//
// Prerrequisito de todos ellos, y por eso ninguno se puede tachar todavía:
// `core.mjs:4418` define `setState({ db, place }, …)`. El sujeto es `place` —la
// identidad derivada del directorio de trabajo— y no hay parámetro `agent`, así que
// un comando validado no tiene a qué llamar. Ese verbo faltante es materia de la
// auditoría exclusiva de P4; el ejecutor y la superficie, de la de P8.

const EXECUTED = new Set()

describe("camino de comando del operador", () => {
  test("EXECUTED sólo nombra verbos que existen en el vocabulario", () => {
    const unknown = [...EXECUTED].filter((verb) => !VERBS.includes(verb))
    expect(unknown).toEqual([])
  })

  test("el vocabulario declara al menos un verbo", () => {
    expect(VERBS.length).toBeGreaterThan(0)
  })

  for (const verb of VERBS) {
    if (EXECUTED.has(verb)) continue
    test.todo(`${verb} — validado pero sin ejecutor (decisión 60)`)
  }
})
