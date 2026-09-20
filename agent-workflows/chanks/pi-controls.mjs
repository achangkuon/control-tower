// The Pi adapter for the Chanks controls: it turns a Pi `tool_call` event into one of the
// S143 core's decisions, and turns that decision into the shape Pi understands.
//
// S143 proved the controls decide correctly. This layer exists because deciding is not
// preventing. Pi can stop a tool before it runs — `ToolCallEventResult.block` — but its own
// documentation is explicit that it ships no sandbox, so a command that is allowed can spawn a
// process that writes anywhere. The block covers the decision; the confinement covers the
// effect, and a tool whose effects cannot be covered by either is refused.
//
// This module re-decides nothing. Every verdict and every wording comes from `controls.mjs`,
// because a second implementation of a rule is a second answer, and the two drift while both
// look right.

import { existsSync } from "node:fs"

import { bloqueado, mutacionPermitida, permitido } from "./controls.mjs"

// Reading has no effect, so there is nothing for a control to prevent. Blocking it would be
// theatre, and theatre is what this Sesión exists to replace.
const SIN_EFECTO = ["read", "grep", "find", "ls"]

// Tools whose effect is exactly one declared path. The path is known before anything happens,
// so control 4 answers completely and no confinement is needed.
const MUTAN_UNA_RUTA = ["write", "edit"]

// Shell tools have no path to check: their effect is whatever the command does, including
// whatever it spawns. They are governed by the confinement, never by a path.
const EJECUTAN_SHELL = ["bash", "powershell"]

// decidirHerramienta maps one Pi tool call to the control that governs it.
//
// The default branch refuses. An unknown tool is precisely the case the Encargo names — "una
// operación cuyos efectos no puedan controlarse se rechaza sin salida permisiva alternativa" —
// and defaulting to permitted is how a gate quietly stops being one.
export const decidirHerramienta = (autoridad, evento) => {
  const herramienta = evento?.toolName
  if (typeof herramienta !== "string" || herramienta === "") {
    return bloqueado("mutacion", "el evento no declara qué herramienta se va a ejecutar", ["toolName"])
  }

  if (SIN_EFECTO.includes(herramienta)) {
    return permitido("mutacion", `${herramienta} no produce efectos, así que no hay efecto que impedir`)
  }

  if (MUTAN_UNA_RUTA.includes(herramienta)) {
    const ruta = evento?.input?.path
    if (typeof ruta !== "string" || ruta.trim() === "") {
      return bloqueado("mutacion", `${herramienta} no declara la ruta que va a mutar`, ["path"])
    }
    return mutacionPermitida(autoridad, { vinculo: autoridad?.vinculo, mutaciones: [ruta], recursoConfirmado: true })
  }

  if (EJECUTAN_SHELL.includes(herramienta)) {
    const comando = evento?.input?.command
    if (typeof comando !== "string" || comando.trim() === "") {
      return bloqueado("mutacion", `${herramienta} no declara el comando que va a ejecutar`, ["command"])
    }
    // Permitted here means "permitted to be confined", not "permitted to run loose". The caller
    // must honour `exigeConfinamiento`; a decision that is passed on without it is a bug in the
    // caller, not a licence in this module.
    return {
      ...permitido("mutacion", `${herramienta} sólo puede ejecutarse dentro del confinamiento autorizado`),
      exigeConfinamiento: true,
    }
  }

  return bloqueado(
    "mutacion",
    `los efectos de «${herramienta}» no se pueden controlar, así que la operación se rechaza sin salida permisiva`,
    [herramienta],
  )
}

// aPi translates a decision into the result Pi expects.
//
// A permitted decision returns an empty object rather than `block: false`. Pi reads an absent
// `block` as "go ahead", and an empty result cannot be misread by a future version that only
// checks for the field's presence.
export const aPi = (decision) => {
  if (decision?.permitido !== false) return {}
  const evidencia = Array.isArray(decision.detalle) && decision.detalle.length > 0
    ? ` (${decision.detalle.join(", ")})`
    : ""
  // The reason reaches the model. Without the offending evidence the agent retries blindly,
  // and a block it cannot learn from becomes a loop.
  return { block: true, reason: `${MARCA} · bloqueado · ${decision.motivo}${evidencia}` }
}

// The visible mark. Exactly "💪 Chanks" — the manual method running with the Tower off must
// not borrow the Tower's identity, because a transcript that misattributes what ran stops
// being evidence of anything.
const MARCA = "💪 Chanks"

// crearActivaciones builds one announcer per session.
//
// The announcements belong to significant transitions, not to tool calls. A gate that narrates
// every call trains the reader to skip it, and a mark nobody reads protects nothing — so the
// same transition announces once and then stays quiet until something actually changes.
//
// State lives in the closure rather than at module scope: two sessions sharing a memo would
// silence each other's first announcement, which is the one that matters most.
export const crearActivaciones = () => {
  const anunciadas = new Set()

  return {
    anunciar(transicion) {
      const decision = transicion?.decision
      const resultado = decision?.permitido === false ? "bloqueado" : "permitido"
      const evidencia = Array.isArray(decision?.detalle) ? decision.detalle.join(", ") : ""
      const clave = `${decision?.control}|${resultado}|${transicion?.accion}|${evidencia}`
      if (anunciadas.has(clave)) return null
      anunciadas.add(clave)

      // The result is its own field between separators rather than an adjective inside the
      // sentence, so someone scanning the transcript sees permitted or blocked without
      // reading prose. And the line says what was decided, never that it happened: an
      // authorization is not an execution, a publication or a closure.
      const partes = [MARCA, resultado, `${transicion?.sesion ?? "sin Sesión"} · ${transicion?.accion ?? "acción sin declarar"}`]
      if (decision?.motivo) partes.push(decision.motivo)
      if (evidencia) partes.push(evidencia)
      return partes.join(" · ")
    },
  }
}

// The confinement. Pi ships no sandbox by design — its own docs say real isolation has to come
// from the operating system — so the room is built with bubblewrap and the command is rewritten
// to run inside it. This module builds the argv and executes nothing: Pi's own bash tool runs
// what we hand back, which keeps the decision layer free of the effects it governs.
//
// The room Emilio approved is the small one: the whole filesystem read-only, exactly the
// Session's authorized files mounted writable over it, and no network. It is deliberately too
// small to commit or publish from — the last two controls still decide about delivery, but the
// delivery itself happens outside, in the human's hands. Saying otherwise would be claiming a
// coverage this rehearsal does not have.
const BASE_DEL_CUARTO = [
  "bwrap",
  "--ro-bind", "/", "/",
  "--dev", "/dev",
  "--proc", "/proc",
  "--tmpfs", "/tmp",
  "--unshare-all",
  "--unshare-net",
  "--die-with-parent",
]

// confinarComando returns the argv that runs `comando` inside the room, or says why it cannot.
//
// A writable path that does not exist is refused rather than widened: mounting its parent
// directory instead would quietly make every sibling writable, which is a bigger room than the
// one that was authorized. That refusal is the contract's rule, not an implementation shortcut
// — an operation whose effects cannot be confined has no permissive alternative.
export const confinarComando = (comando, { escribibles = [], existe = null } = {}) => {
  if (typeof comando !== "string" || comando.trim() === "") {
    return { confinable: false, motivo: "no hay comando que confinar" }
  }
  const rutas = Array.isArray(escribibles) ? escribibles.filter((r) => typeof r === "string" && r.trim() !== "") : []
  if (rutas.length === 0) {
    return { confinable: false, motivo: "no hay ninguna ruta escribible autorizada, así que no hay nada que el comando pueda cambiar" }
  }

  // The existence probe is injected so the builder itself stays testable without a filesystem,
  // and so a caller can supply the project's own view of what exists.
  const hayRuta = existe ?? ((ruta) => existsSync(ruta))
  const faltantes = rutas.filter((ruta) => !hayRuta(ruta))
  if (faltantes.length > 0) {
    return {
      confinable: false,
      motivo: "una ruta autorizada no existe y no se puede montar sin ensanchar el cuarto más allá de lo aprobado",
      detalle: faltantes,
    }
  }

  const argv = [...BASE_DEL_CUARTO]
  for (const ruta of rutas) argv.push("--bind", ruta, ruta)
  argv.push("bash", "-c", comando)
  return { confinable: true, argv }
}

// gobernar is the whole adapter in one call: decide, and when the decision needs the room,
// build it or refuse.
//
// The refusal is the point. A shell command whose effects cannot be confined does not fall
// back to running loose with a warning — that fallback is exactly what turns a control into a
// suggestion, and it is what this Sesión exists to remove.
export const gobernar = (autoridad, evento, opciones = {}) => {
  const decision = decidirHerramienta(autoridad, evento)
  if (decision.permitido === false || !decision.exigeConfinamiento) {
    return { decision, pi: aPi(decision) }
  }

  const confinado = confinarComando(evento?.input?.command, opciones)
  if (!confinado.confinable) {
    const rechazo = bloqueado(
      "mutacion",
      `los efectos de este comando no se pueden confinar, así que se rechaza sin salida permisiva: ${confinado.motivo}`,
      confinado.detalle ?? [],
    )
    return { decision: rechazo, pi: aPi(rechazo) }
  }

  return { decision, pi: aPi(decision), comandoConfinado: confinado }
}
