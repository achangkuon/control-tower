// The Pi adapter for the Chanks controls: it turns a Pi `tool_call` event into one of the
// S143 core's decisions, and turns that decision into the shape Pi understands.
//
// S143 proved the controls decide correctly. This layer exists because deciding is not
// preventing. Pi can stop a tool before it runs — `ToolCallEventResult.block` — but its own
// documentation is explicit that it ships no sandbox, so a command that is allowed can spawn a
// process that writes anywhere. The block covers the decision; the confinement covers the
// effect, and a tool whose effects cannot be covered by either is refused.
//
// The core checks file scope; this adapter also blocks shared declarations when no trusted
// reservation/acquisition evidence exists.

import { existsSync, lstatSync, realpathSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { isAbsolute } from "node:path"

import { bloqueado, mutacionPermitida, permitido } from "./controls.mjs"

// Reading has no effect, so there is nothing for a control to prevent. Blocking it would be
// theatre, and theatre is what this Sesión exists to replace.
const SIN_EFECTO = ["read", "grep", "find", "ls"]

// The core checks the exact declared path. pi-authority.mjs separately binds the actual
// built-in write/edit effect to a retained descriptor; path approval alone is not confinement.
const MUTAN_UNA_RUTA = ["write", "edit"]

// Shell tools have no path to check: their effect is whatever the command does, including
// whatever it spawns. They are governed by the confinement, never by a path.
const EJECUTAN_SHELL = ["bash"]

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
    const cimientos = Array.isArray(autoridad?.cimientos) ? autoridad.cimientos : []
    const recursos = recursosDeclarados(autoridad)
    if (cimientos.length || (Array.isArray(recursos) && recursos.length)) {
      return bloqueado("mutacion", "Cimiento/Recurso declarado: falta evidencia de reserva/adquisición antes de mutar",
        [...cimientos, ...(Array.isArray(recursos) ? recursos : ["Recurso inválido"])])
    }
    return mutacionPermitida(autoridadParaMutar(autoridad), evidenciaDeMutacion(autoridad, [ruta]))
  }

  if (EJECUTAN_SHELL.includes(herramienta)) {
    const comando = evento?.input?.command
    if (typeof comando !== "string" || comando.trim() === "") {
      return bloqueado("mutacion", `${herramienta} no declara el comando que va a ejecutar`, ["command"])
    }
    // Shell has no writable file binding. Its only permitted effect is read-only inspection.
    // Permitted here means "permitted to be confined", not "permitted to run loose". The caller
    // must honour `exigeConfinamiento`; a decision that is passed on without it is a bug in the
    // caller, not a licence in this module.
    return {
      ...permitido("mutacion", `${herramienta} sólo puede inspeccionar en un confinamiento de sólo lectura; no puede mutar archivos`),
      exigeConfinamiento: true,
    }
  }

  if (herramienta === "powershell") {
    return bloqueado(
      "mutacion",
      "PowerShell no tiene confinamiento Linux equivalente, así que una mutación se rechaza sin salida permisiva",
      ["powershell"],
    )
  }

  return bloqueado(
    "mutacion",
    `los efectos de «${herramienta}» no se pueden controlar, así que la operación se rechaza sin salida permisiva`,
    [herramienta],
  )
}

// `crearAutoridadPi` owns the opaque live authority and invokes this adapter only from its
// capability. This adapter retains neither that authority nor a copy of a Cimiento grant.
const recursosDeclarados = (autoridad) => {
  if (!Array.isArray(autoridad?.recursos)) return autoridad?.recurso
  const ids = autoridad.recursos.map((recurso) => recurso?.id)
  return ids.every((id) => typeof id === "string" && id.trim() !== "") ? ids : ["recursos inválidos"]
}

const autoridadParaMutar = (autoridad) => ({
  vinculo: autoridad?.vinculo,
  archivos: autoridad?.archivos,
  cimientos: autoridad?.cimientos,
  recurso: recursosDeclarados(autoridad),
})

const evidenciaDeMutacion = (autoridad, mutaciones) => ({
  vinculo: autoridad?.vinculo,
  mutaciones,
  reservas: [],
  recursoConfirmado: false,
})

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

// The stage transition owns the 💪 mark. Tool refusals and legacy decision announcements
// never claim a stage transition or borrow that mark.
const MARCA = "Chanks"

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
// to run inside it. This module only probes Bubblewrap's availability and builds argv; Pi's own
// bash tool runs the untrusted command we hand back, which keeps the decision layer free of the
// effects it governs.
//
// The shell room is read-only with no network and no writable file binds. It cannot commit,
// publish or modify repository files. A scratch-only /var/tmp exists for inspection tools.
const BASE_DEL_CUARTO = [
  "/usr/bin/bwrap",
  "--ro-bind", "/", "/",
  "--dev", "/dev",
  "--proc", "/proc",
  // Deliberately NOT `--tmpfs /tmp`. Masking /tmp made a forbidden write there *succeed*
  // into a throwaway filesystem: the host file stayed intact, but the command reported 0 and
  // the worker believed it had written. A silent fake success is worse than a refusal, because
  // nothing downstream knows to stop. /tmp stays read-only like everything else, so such a
  // write fails loudly, and real scratch space lives at its own path instead.
  "--tmpfs", "/var/tmp",
  "--setenv", "TMPDIR", "/var/tmp",
  "--unshare-all",
  "--unshare-net",
  "--die-with-parent",
]

// confinarComando returns the argv that runs `comando` inside the room, or says why it cannot.
//
// The legacy writable-path parameter is rejected even for declared files; never mount
// a pathname-racy writable bind. A missing Bubblewrap also fails closed.
const bwrapDisponible = (ruta) => {
  try {
    return rutaMontable(ruta, existsSync) && (lstatSync(ruta).mode & 0o111) !== 0
      && spawnSync(ruta, ["--version"], { stdio: "ignore" }).status === 0
  } catch {
    return false
  }
}

const rutaMontable = (ruta, hayRuta) => {
  if (typeof ruta !== "string" || ruta.trim() === "" || !isAbsolute(ruta)) return false
  try {
    if (!hayRuta(ruta)) return false
    const stat = lstatSync(ruta)
    return stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && realpathSync(ruta) === ruta
  } catch {
    return false
  }
}

// Pi's bash tool accepts a command string. Quoting every argv element makes that string an exact
// serialization of the validated argv: metacharacters in an authorized path or command remain
// data for bwrap/bash rather than becoming syntax in Pi's outer shell.
const serializarArgv = (argv) => argv.map((argumento) => `'${argumento.replaceAll("'", "'\"'\"'")}'`).join(" ")

export const confinarComando = (comando, { escribibles = [], existe = null, bwrapPath = "/usr/bin/bwrap" } = {}) => {
  if (typeof comando !== "string" || comando.trim() === "") {
    return { confinable: false, motivo: "no hay comando que confinar" }
  }
  if (!bwrapDisponible(bwrapPath)) {
    return { confinable: false, motivo: "Bubblewrap confiable no está disponible para construir el confinamiento" }
  }
  if (!Array.isArray(escribibles) || escribibles.length !== 0) {
    return { confinable: false, motivo: "bash no admite rutas escribibles; sólo lectura" }
  }
  const argv = [bwrapPath, ...BASE_DEL_CUARTO.slice(1)]
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

  // Shell never receives writable file binds, regardless of caller-provided options.
  const confinado = confinarComando(evento?.input?.command, { escribibles: [] })
  if (!confinado.confinable) {
    const rechazo = bloqueado(
      "mutacion",
      `los efectos de este comando no se pueden confinar, así que se rechaza sin salida permisiva: ${confinado.motivo}`,
      confinado.detalle ?? [],
    )
    return { decision: rechazo, pi: aPi(rechazo) }
  }

  // T3 assigns this exact field to event.input. `argv` remains available for an executor that
  // preserves argv boundaries; `entradaPi.command` is the safe equivalent for Pi's string API.
  return {
    decision,
    pi: aPi(decision),
    comandoConfinado: confinado,
    entradaPi: Object.freeze({ command: serializarArgv(confinado.argv) }),
  }
}
