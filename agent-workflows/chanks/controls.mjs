// The procedural core of the Chanks method: seven controls that consume authority and
// evidence and permit or block a transition, without ever executing its effects.
//
// This module decides. It does not write files, touch Git, launch workers, or publish — and
// that is a checked property, not an intention: it imports nothing that could. A decision
// engine able to reach the filesystem is one refactor away from performing the very effect it
// exists to gate, and at that point the control and the effect share a failure.
//
// It also computes no plan state. Installed Radar owns that calculation and
// `openspec/plan.yaml` owns the editable authority; a second implementation here would be a
// second answer, and the two would drift while both looked right.
//
// What these functions prove is that a procedural decision was correct. They do NOT prove the
// forbidden effect was prevented — demonstrating effective control in a real runtime is S144,
// and presenting this module as that proof is exactly the confusion S143's structured decision
// discards.

// The seven, in the order the method walks them. There is deliberately no eighth: the route is
// validated inside `admision`, where the existing admission already happens.
export const CONTROLES = ["alcance", "delta", "admision", "mutacion", "resultado", "entrega", "cierre"]

export const permitido = (control, motivo) => ({ control, permitido: true, motivo, detalle: [] })

// `permitido` is always present and always a boolean. A caller that tests the object instead of
// the field must not accidentally read a block as a pass.
export const bloqueado = (control, motivo, detalle = []) => ({ control, permitido: false, motivo, detalle })

const CAMPOS_DEL_VINCULO = ["repositorio", "sesion", "candidato", "base"]

const declarado = (valor) => typeof valor === "string" && valor.trim() !== ""

const esObjeto = (valor) => Boolean(valor) && typeof valor === "object" && !Array.isArray(valor)

// vinculoRoto ties authority and evidence to one repository, one Sesión, one candidate and one
// base, and reports every field that fails rather than only the first: a caller fixing them one
// round-trip at a time learns less each time than the evidence already showed.
//
// It returns `null` when the binding holds, so a control reads as `if (roto) return bloqueado(...)`.
// An absent field is not an empty one. Treating a missing declaration as "nothing to check" is
// how a control ends up approving work it never identified, which is the failure the whole
// binding exists to prevent.
export const vinculoRoto = (esperado, provisto) => {
  if (!esObjeto(provisto)) {
    return { motivo: "la evidencia no declara su vínculo con repositorio, Sesión, candidato y base", detalle: [...CAMPOS_DEL_VINCULO] }
  }

  const faltantes = CAMPOS_DEL_VINCULO.filter((campo) => !declarado(provisto[campo]))
  if (faltantes.length > 0) {
    return { motivo: "el vínculo está incompleto, y una declaración ausente no se lee como vacía ni como segura", detalle: faltantes }
  }

  const distintos = CAMPOS_DEL_VINCULO.filter((campo) => provisto[campo].trim() !== String(esperado?.[campo] ?? "").trim())
  if (distintos.length === 0) return null

  // A stale base earns its own wording. The work may be perfectly genuine and still answer
  // about a repository state that no longer exists, which is a different mistake from evidence
  // belonging to someone else's work — and the two get fixed differently.
  const soloBase = distintos.length === 1 && distintos[0] === "base"
  const motivo = soloBase
    ? "base desactualizada: la evidencia responde sobre un estado del repositorio que ya no es el vigente"
    : "la evidencia pertenece a otro trabajo: no coincide con el repositorio, la Sesión o el candidato en curso"

  return { motivo, detalle: distintos }
}

// Every control opens the same way: identify the work, or decide nothing about it. Returning
// the block here keeps each control's own body about its own rule.
const vinculoBloquea = (control, autoridad, evidencia) => {
  const roto = vinculoRoto(autoridad?.vinculo, evidencia?.vinculo)
  return roto ? bloqueado(control, roto.motivo, roto.detalle) : null
}

// Only a human approves scope. `huella` and `agente` are named explicitly rather than falling
// through a generic check, because they are the two things that actually show up and try to
// pass as approval: an agent asserting it understood the request, and a file fingerprint
// offered as if matching bytes implied someone consented to them.
const ORIGEN_HUMANO = "humano"

// Control 1 — nothing gets planned without approved scope.
export const alcanceAprobado = (autoridad, evidencia) => {
  const roto = vinculoBloquea("alcance", autoridad, evidencia)
  if (roto) return roto

  const alcance = autoridad?.alcance
  if (!esObjeto(alcance)) {
    return bloqueado("alcance", "no hay alcance declarado, y planificar sin alcance es inventarlo", ["alcance"])
  }
  if (alcance.origen !== ORIGEN_HUMANO) {
    return bloqueado(
      "alcance",
      "el alcance no lo aprobó un humano: una afirmación del agente o una huella de archivos no fabrica aprobación",
      ["origen"],
    )
  }
  if (alcance.aprobado !== true) {
    return bloqueado("alcance", "el alcance existe pero nadie lo aprobó todavía", ["aprobado"])
  }
  // An approval nobody can look up later is an approval nobody can dispute later.
  if (!declarado(alcance.referencia)) {
    return bloqueado("alcance", "la aprobación no cita una referencia trazable", ["referencia"])
  }

  return permitido("alcance", `alcance aprobado por el humano, según ${alcance.referencia.trim()}`)
}

// Control 2 — nothing gets recorded without the exact, validated delta.
export const deltaValidado = (autoridad, evidencia) => {
  const roto = vinculoBloquea("delta", autoridad, evidencia)
  if (roto) return roto

  const delta = autoridad?.delta
  if (!esObjeto(delta)) {
    return bloqueado("delta", "no hay delta declarado, y registrar sin delta es escribir a ciegas", ["delta"])
  }

  // "Exacto" means both sides are on the table. A delta that states only what it wants cannot
  // be compared against what is actually there, so it cannot be validated at all.
  const incompletos = ["anterior", "nuevo"].filter((campo) => !declarado(delta[campo]))
  if (incompletos.length > 0) {
    return bloqueado("delta", "el delta no es exacto: falta uno de sus dos lados", incompletos)
  }
  if (delta.anterior.trim() === delta.nuevo.trim()) {
    return bloqueado("delta", "el delta no cambia nada, así que no hay nada que registrar", ["anterior", "nuevo"])
  }
  if (delta.validado !== true) {
    return bloqueado("delta", "el delta no fue validado antes de registrar", ["validado"])
  }
  // An unnamed validator is an unverifiable claim, which is worth exactly as much as no
  // validation at all.
  if (!declarado(delta.validadoPor)) {
    return bloqueado("delta", "la validación no nombra quién validó, así que no se puede comprobar", ["validadoPor"])
  }

  return permitido("delta", `delta exacto validado por ${delta.validadoPor.trim()}`)
}

const INTENCIONES = ["start", "continue", "resume"]
const ESTADOS_PARA_START = ["LISTO"]
// `continue` and `resume` accept EN CURSO because the work is already underway; `start` does
// not, because starting something already started is how two agents end up on one Sesión.
const ESTADOS_PARA_RETOMA = ["LISTO", "EN CURSO"]
const RUTAS = ["odd", "sdd"]

// Control 3 — nothing starts without human admission over fresh Radar evidence.
//
// The route is validated here, inside the admission that already happens, rather than as its
// own step. An eighth control would be a second place to forget.
export const admisionHumana = (autoridad, evidencia) => {
  const roto = vinculoBloquea("admision", autoridad, evidencia)
  if (roto) return roto

  const admision = autoridad?.admision
  if (!esObjeto(admision)) {
    return bloqueado("admision", "no hay admisión declarada", ["admision"])
  }
  if (!INTENCIONES.includes(admision.intencion)) {
    return bloqueado("admision", `la intención debe ser una de ${INTENCIONES.join(", ")}`, ["intencion"])
  }
  // Radar proposes; it never chooses. A Sesión the agent picked for itself has no admission at
  // all, however well the rest of the bundle is formed.
  if (admision.seleccionadaPor !== ORIGEN_HUMANO) {
    return bloqueado("admision", "la Sesión no la eligió un humano: Radar propone y nunca elige trabajo", ["seleccionadaPor"])
  }

  const admisibles = admision.intencion === "start" ? ESTADOS_PARA_START : ESTADOS_PARA_RETOMA
  if (!admisibles.includes(admision.estado)) {
    return bloqueado(
      "admision",
      `«${admision.intencion}» sólo admite ${admisibles.join(" o ")}, y la Sesión está en ${admision.estado ?? "un estado sin declarar"}`,
      ["estado"],
    )
  }

  const radar = evidencia?.radar
  if (!esObjeto(radar)) {
    return bloqueado("admision", "no hay evidencia de Radar que respalde la admisión", ["radar"])
  }
  const sinDigest = ["estadoDigest", "sesionDigest"].filter((campo) => !declarado(radar[campo]))
  if (sinDigest.length > 0) {
    return bloqueado("admision", "la admisión no liga los bytes exactos que Radar devolvió", sinDigest)
  }
  // Two captures that disagree do not mean the reader was careless; they mean the plan moved
  // while it was being read. That is evidence of a race, not fresh evidence.
  if (radar.recapturaCoincide !== true) {
    return bloqueado("admision", "las dos capturas de Radar no coinciden, así que la evidencia no es fresca", ["recapturaCoincide"])
  }
  if (String(radar.head ?? "").trim() !== String(autoridad.vinculo?.base ?? "").trim()) {
    return bloqueado("admision", "el bundle se capturó sobre otro HEAD: la evidencia está desactualizada", ["head"])
  }

  if (!RUTAS.includes(admision.ruta)) {
    return bloqueado("admision", `la ruta debe ser una de ${RUTAS.join(", ")}`, ["ruta"])
  }
  // ODD is the native default. SDD is never inferred from complexity, size, or an agent's
  // preference — only an explicit human request selects it.
  if (admision.ruta === "sdd" && admision.solicitudSDD !== true) {
    return bloqueado("admision", "SDD sólo entra por solicitud humana explícita; ODD es la ruta nativa", ["ruta"])
  }

  return permitido("admision", `admisión humana sobre Radar fresco: ${admision.intencion} en ${admision.estado}, ruta ${admision.ruta}`)
}

const lista = (valor) => (Array.isArray(valor) ? valor.filter(declarado).map((v) => v.trim()) : [])

// Control 4 — nothing is mutated outside the authorized files and resources.
export const mutacionPermitida = (autoridad, evidencia) => {
  const roto = vinculoBloquea("mutacion", autoridad, evidencia)
  if (roto) return roto

  // An authority declaring no files has not authorized everything; it has authorized nothing
  // yet. Reading the empty list as "no restriction" inverts the control into a pass-through.
  const autorizados = lista(autoridad?.archivos)
  if (autorizados.length === 0) {
    return bloqueado("mutacion", "la autoridad no declara archivos, y una declaración ausente no autoriza todo", ["archivos"])
  }

  const mutaciones = lista(evidencia?.mutaciones)
  if (mutaciones.length === 0) {
    return bloqueado("mutacion", "la evidencia no dice qué archivos va a mutar", ["mutaciones"])
  }

  const fuera = mutaciones.filter((archivo) => !autorizados.includes(archivo))
  if (fuera.length > 0) {
    return bloqueado("mutacion", "hay mutaciones fuera de los archivos autorizados", fuera)
  }

  // A Cimiento is shared territory. Being inside the authorized list is necessary and not
  // sufficient: the crossing itself needs an exact, confirmed reservation for that file.
  const cimientos = lista(autoridad?.cimientos)
  const reservas = lista(evidencia?.reservas)
  const sinReserva = mutaciones.filter((archivo) => cimientos.includes(archivo) && !reservas.includes(archivo))
  if (sinReserva.length > 0) {
    return bloqueado("mutacion", "hay un Cimiento compartido sin su reserva exacta confirmada", sinReserva)
  }

  // "La declaración de Recurso no equivale a adquisición." Declaring it opens the obligation;
  // only confirmed exclusive or serial use closes it, and only before the first effect.
  const recurso = lista(autoridad?.recurso)
  if (recurso.length > 0 && evidencia?.recursoConfirmado !== true) {
    return bloqueado(
      "mutacion",
      "el Recurso declarado exige uso exclusivo confirmado antes de mutar: declararlo no equivale a adquirirlo",
      recurso,
    )
  }

  return permitido("mutacion", `${mutaciones.length} mutación(es) dentro de los archivos y recursos autorizados`)
}

// The four shapes that most want to be read as success and are none of them. They are listed
// by name rather than caught by a default branch, so adding a fifth is a deliberate edit.
const NO_SON_PASS = ["desconocido", "indisponible", "vacio"]
const VEREDICTOS = ["pass", "fail", "declinado", ...NO_SON_PASS]

// Control 5 — nothing is consumed as a technical result unless it is genuine.
//
// Chanks validates identity, provenance, currency and coverage of a result someone else
// produced. It does not evaluate the work, store the result, or run anything: there is no
// second executor, no receipts API and no per-Módulo review here.
export const resultadoGenuino = (autoridad, evidencia) => {
  const roto = vinculoBloquea("resultado", autoridad, evidencia)
  if (roto) return roto

  const resultado = evidencia?.resultado
  if (!esObjeto(resultado)) {
    return bloqueado("resultado", "no hay resultado técnico que consumir", ["resultado"])
  }
  // Identity first: without knowing what produced it, none of the other three questions have
  // a subject.
  if (!declarado(resultado.identidad)) {
    return bloqueado("resultado", "el resultado no declara qué lo produjo", ["identidad"])
  }
  if (!VEREDICTOS.includes(resultado.veredicto)) {
    return bloqueado("resultado", `el veredicto debe ser uno de ${VEREDICTOS.join(", ")}`, ["veredicto"])
  }
  // Currency: a genuine result computed over a base that is no longer current answers a
  // question nobody is asking any more.
  if (String(resultado.base ?? "").trim() !== String(autoridad.vinculo?.base ?? "").trim()) {
    return bloqueado("resultado", "el resultado no es actual: se calculó sobre otra base", ["base"])
  }

  // A decline is neither a failure nor a pass. Reading it as failure invents an unconditional
  // block the provider never asked for; reading it as success is the exact fabrication this
  // control exists to stop. It lets the work continue along the provider's own alternative
  // path, and says plainly that nothing passed.
  if (resultado.veredicto === "declinado") {
    if (!declarado(resultado.caminoAlternativo)) {
      return bloqueado("resultado", "la revisión se declinó y no hay camino alternativo aplicable declarado", ["caminoAlternativo"])
    }
    return {
      control: "resultado",
      permitido: true,
      motivo: `la revisión se declinó: no es un PASS, y se sigue por ${resultado.caminoAlternativo.trim()}`,
      detalle: ["declinado"],
    }
  }

  if (NO_SON_PASS.includes(resultado.veredicto)) {
    return bloqueado("resultado", `un resultado ${resultado.veredicto} no es un PASS`, ["veredicto"])
  }
  if (resultado.veredicto === "fail") {
    return bloqueado("resultado", `${resultado.identidad.trim()} devolvió fail`, ["veredicto"])
  }

  // Coverage last: a real PASS over the wrong subject is the quietest of these failures,
  // because every other field looks right.
  const huecos = lista(evidencia?.cubre).filter((objetivo) => !lista(resultado.cobertura).includes(objetivo))
  if (huecos.length > 0) {
    return bloqueado("resultado", "el resultado no cubre todo lo que se le atribuye", huecos)
  }

  return permitido("resultado", `PASS genuino de ${resultado.identidad.trim()}, actual y con cobertura suficiente`)
}

// Control 6 — nothing is delivered without authorization for the exact candidate.
//
// This is permission, and only permission. It says nothing about whether the publication then
// happened: that distinction is the whole reason control 7 exists separately.
export const entregaAutorizada = (autoridad, evidencia) => {
  const roto = vinculoBloquea("entrega", autoridad, evidencia)
  if (roto) return roto

  const autorizacion = evidencia?.autorizacion
  if (!esObjeto(autorizacion)) {
    return bloqueado("entrega", "no hay autorización de entrega", ["autorizacion"])
  }
  if (autorizacion.otorgadaPor !== ORIGEN_HUMANO) {
    return bloqueado("entrega", "la entrega no la autorizó un humano, y un agente no se autoriza a sí mismo", ["otorgadaPor"])
  }
  // An authorization naming a different candidate authorizes different bytes. The word
  // "approved" survives a rebase; the approval does not.
  if (String(autorizacion.candidato ?? "").trim() !== String(autoridad.vinculo?.candidato ?? "").trim()) {
    return bloqueado("entrega", "la autorización es de otro candidato: autoriza otros bytes", ["candidato"])
  }
  if (evidencia?.metodo !== autoridad?.politica) {
    return bloqueado(
      "entrega",
      `la política del repositorio es «${autoridad?.politica ?? "sin declarar"}» y se intenta entregar por «${evidencia?.metodo ?? "sin declarar"}»`,
      ["metodo"],
    )
  }
  // Serialisation is about the destination, not about who is asking. Two different candidates
  // writing the same branch is exactly the collision this prevents, and being a different
  // candidate is not an exemption from it.
  if (declarado(evidencia?.destinoOcupadoPor)) {
    return bloqueado(
      "entrega",
      `el destino ${autoridad?.destino ?? ""} ya tiene una operación incompatible de ${evidencia.destinoOcupadoPor.trim()}: se serializa`,
      ["destinoOcupadoPor"],
    )
  }

  return permitido("entrega", "entrega autorizada para el candidato exacto; el permiso no afirma que se haya publicado")
}

// Control 7 — nothing is closed without proven publication, its record and its documentation.
export const cierreComprobado = (autoridad, evidencia) => {
  const roto = vinculoBloquea("cierre", autoridad, evidencia)
  if (roto) return roto

  const publicacion = evidencia?.publicacion
  if (!esObjeto(publicacion) || publicacion.comprobada !== true) {
    return bloqueado("cierre", "no hay evidencia de publicación efectiva: un permiso o un commit local no lo son", ["publicacion"])
  }
  if (String(publicacion.candidato ?? "").trim() !== String(autoridad?.vinculo?.candidato ?? "").trim()) {
    return bloqueado("cierre", "lo publicado no es el candidato exacto de esta Sesión", ["candidato"])
  }

  // Publication succeeded and the record did not. That distinction is preserved rather than
  // resolved: closure is not declared, and neither a second publication nor an automatic
  // revert is triggered, because both would turn a bookkeeping gap into a repository change.
  if (!esObjeto(evidencia?.registro) || evidencia.registro.hecho !== true) {
    return bloqueado(
      "cierre",
      "la publicación se logró y el registro falló: no se declara el cierre, no se vuelve a publicar y no se revierte automáticamente",
      ["registro"],
    )
  }
  if (!esObjeto(evidencia?.documentacion) || evidencia.documentacion.hecha !== true) {
    return bloqueado("cierre", "falta la documentación correspondiente al cierre", ["documentacion"])
  }

  return permitido("cierre", "publicación comprobada del candidato exacto, con su registro y su documentación")
}
