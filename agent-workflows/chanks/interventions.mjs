// Coordination of Cimiento interventions and file-level parallel work, for the manual method
// with the Tower off.
//
// S145 made the alternatives readable: which Sesiones could be worked at once, and on which
// exact files. S143 and S144 made a "no" actually prevent the effect. What was missing is the
// hard case in between — two Sesiones in the same Zona that need to touch the same shared file.
// Today that gets solved by vetoing both, which is precisely what the contract forbids: a
// shared Cimiento is a condition of coordinated intervention, not a veto.
//
// The whole protocol is one rule: **all or nothing**. A worker asks for the complete set of
// Cimientos it needs, bound to its work and its base, and Main grants the set entire or grants
// nothing. That is what makes a circular wait impossible — if partial grants could accumulate,
// two workers would each end up holding half of what the other needs, waiting forever.
//
// This is not a lock manager, and it deliberately does not become one. The grants live in one
// Main session's memory and die with it: there is no persistent queue, no continuity storage,
// no receipts API and no technical executor. Radar acquires no live reservation either, and
// none of this evidence grants authority to itself.

import { bloqueado, permitido } from "./controls.mjs"

const declarado = (valor) => typeof valor === "string" && valor.trim() !== ""

const lista = (valor) => (Array.isArray(valor) ? valor.filter(declarado).map((v) => v.trim()) : [])

// The closed set of reasons that stop an intervention. It is a list rather than a free string
// so that "me parece" cannot stop one: a stop freezes a shared file until a human acts, which
// is too expensive to trigger on an opinion.
const MOTIVOS_DE_PARADA = ["conflicto", "cambio-de-alcance", "cambio-de-base", "desconexion", "evidencia-faltante"]

const comunes = (a, b) => {
  const set = new Set(b)
  return a.filter((v) => set.has(v))
}

// paraleloPorArchivos answers whether two Sesiones can advance at the same time, from the
// fingerprints S145 already publishes. It recomputes nothing about the plan.
//
// Three properties have to hold together: the fingerprint must be complete, current against
// the same base, and disjoint from the other. Missing any one of them is not permission with a
// caveat — an unknown fingerprint is unknown, and unknown never enables parallel.
export const paraleloPorArchivos = (a, b) => {
  const incompletas = [a, b].filter((h) => lista(h?.archivos).length === 0).map((h) => h?.sesion ?? "sin Sesión")
  if (incompletas.length > 0) {
    return bloqueado(
      "mutacion",
      "una huella desconocida o incompleta no habilita paralelo: lo que no se declaró no se lee como vacío",
      incompletas,
    )
  }
  if (!declarado(a?.base) || a.base !== b?.base) {
    return bloqueado("mutacion", "las huellas no están vigentes sobre la misma base integrada", ["base"])
  }

  // A Cimiento is shared on purpose, so an overlap there is not a collision — it is the
  // condition. Only overlaps outside the shared foundations actually collide.
  const cimientos = comunes(comunes(lista(a.cimientos), lista(b.cimientos)), comunes(lista(a.archivos), lista(b.archivos)))
  const choques = comunes(lista(a.archivos), lista(b.archivos)).filter((f) => !cimientos.includes(f))
  if (choques.length > 0) {
    return bloqueado("mutacion", "las dos Sesiones declaran el mismo archivo propio", choques)
  }

  // Sharing a Zona is not a conflict. That was S145's finding and this module must not undo it.
  if (cimientos.length > 0) {
    return {
      ...permitido("mutacion", "pueden avanzar en sus archivos propios; el Cimiento compartido se coordina aparte"),
      condicion: "el archivo compartido exige intervención coordinada, no el veto de ambas Sesiones",
      detalle: cimientos,
    }
  }

  return permitido("mutacion", "huellas completas, vigentes y disjuntas")
}

// crearCoordinacion holds the grants of one Main session.
//
// State lives in the closure, not on disk. A durable store here would be the "gestor de locks
// artificial" the contract rules out, and it would outlive the coordination it describes —
// which is how a stale lock ends up blocking work nobody is doing.
export const crearCoordinacion = ({ base } = {}) => {
  const porArchivo = new Map() // archivo -> sesión que lo tiene
  const porSesion = new Map() // sesión -> archivos concedidos
  const detenidas = new Map() // sesión -> { motivo, evidencia }

  const concedidosA = (sesion) => [...(porSesion.get(sesion) ?? [])]

  return {
    concedidosA,

    solicitar(solicitud) {
      if (!declarado(solicitud?.sesion) || !declarado(solicitud?.worker)) {
        return bloqueado("mutacion", "la solicitud no declara su Sesión y su worker", ["sesion", "worker"])
      }
      // The intervention runs on the full current integrated base. Copying a loose Cimiento in
      // its place would mean working against a tree that never existed as a whole.
      if (!declarado(solicitud?.base) || solicitud.base !== base) {
        return bloqueado(
          "mutacion",
          "la solicitud no está ligada a la base integrada vigente, y un Cimiento suelto no sustituye esa base",
          ["base"],
        )
      }

      const pedidos = lista(solicitud?.cimientos)
      if (pedidos.length === 0) {
        return bloqueado("mutacion", "una solicitud sin Cimientos no es una intervención", ["cimientos"])
      }

      // A session that already holds a set does not add to it. Growing a live set is how a
      // request stops being the complete, coherent thing that was granted.
      const yaTiene = concedidosA(solicitud.sesion)
      if (yaTiene.length > 0) {
        return bloqueado(
          "mutacion",
          `${solicitud.sesion} ya tiene un conjunto concedido y no se amplía en silencio: liberá el actual y pedí el completo`,
          yaTiene,
        )
      }

      const tomados = pedidos.filter((archivo) => porArchivo.has(archivo) && porArchivo.get(archivo) !== solicitud.sesion)
      if (tomados.length > 0) {
        // Nothing is held. Granting the uncontested part of the set is exactly the partial
        // grant that makes a circular wait possible, so the whole request fails.
        return bloqueado("mutacion", "el conjunto no está completo: otra Sesión tiene parte de él, y no se concede nada", tomados)
      }

      for (const archivo of pedidos) porArchivo.set(archivo, solicitud.sesion)
      porSesion.set(solicitud.sesion, [...pedidos])
      return { ...permitido("mutacion", `conjunto coherente completo concedido a ${solicitud.sesion}`), concedido: [...pedidos] }
    },

    // Release happens only after confirmed integration, per the delivery flow. The two states
    // this rule exists to refuse are the ones people actually mistake for "done": the worker
    // finished editing, and the worker went quiet. Neither says the work landed anywhere.
    liberar(liberacion) {
      const sesion = liberacion?.sesion
      const tiene = concedidosA(sesion)
      if (tiene.length === 0) {
        return bloqueado("mutacion", "no se libera lo que no se tiene: sólo se sueltan los recursos efectivamente adquiridos", ["sesion"])
      }
      if (detenidas.has(sesion)) {
        return bloqueado(
          "mutacion",
          `la intervención de ${sesion} está detenida y no se reanuda sola: resolvela y volvé a coordinar`,
          [detenidas.get(sesion).motivo],
        )
      }
      const integracion = liberacion?.integracion
      if (integracion?.confirmada !== true || !declarado(integracion?.commit)) {
        return bloqueado(
          "mutacion",
          "sólo libera una integración confirmada con su commit: ni terminar la edición local ni el silencio del worker lo son",
          ["integracion"],
        )
      }

      for (const archivo of tiene) porArchivo.delete(archivo)
      porSesion.delete(sesion)
      return { ...permitido("mutacion", `conjunto liberado tras la integración ${integracion.commit.trim()}`), liberado: tiene }
    },

    // A stop preserves. It does not release, retry, remap, re-permission or resume — every one
    // of those would be this module deciding on its own that the problem is over. Handing a
    // half-finished shared file to the next worker is the damage the protocol exists to avoid,
    // and the price is that a human has to resolve it.
    detener(parada) {
      const sesion = parada?.sesion
      if (!MOTIVOS_DE_PARADA.includes(parada?.motivo)) {
        return bloqueado("mutacion", `«${parada?.motivo}» no está en el conjunto acordado de motivos de parada`, ["motivo"])
      }
      detenidas.set(sesion, { motivo: parada.motivo, evidencia: lista(parada?.evidencia) })
      return bloqueado(
        "mutacion",
        `intervención de ${sesion} detenida por ${parada.motivo}; se preservan trabajo y evidencia y no se dispara nada automático`,
        concedidosA(sesion),
      )
    },

    detenida: (sesion) => detenidas.get(sesion) ?? null,
  }
}

// escribiblesPara is where this protocol meets S144's room: the writable set is the Sesión's
// own files plus exactly the Cimientos it was granted — never the ones it merely asked for.
//
// That is what turns a refusal into an absence rather than a message. A Sesión whose request
// was denied simply has no door to that file, so the write does not happen, including from a
// process the command spawns. A stopped intervention keeps its grant, so its room does not
// shrink either: the work is preserved, not confiscated.
export const escribiblesPara = (coordinacion, sesion, archivosPropios = []) => [
  ...lista(archivosPropios),
  ...coordinacion.concedidosA(sesion),
]
