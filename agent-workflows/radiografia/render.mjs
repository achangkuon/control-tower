import { readFileSync } from "node:fs"
import { join } from "node:path"

const fail = (code, detail) => { throw Object.assign(new Error(`${code}: ${detail}`), { code }) }

const STYLE = readFileSync(join(import.meta.dir, "style.css"), "utf8")
const CHIPS = { sólido: "c-ok", crítico: "c-stop", estructural: "c-stop", nuevo: "c-stop", deuda: "c-wait", ritmo: "c-wait", resuelto: "c-ok" }
const STATE_CLASS = { COMPLETO: "s-ok", "EN CURSO": "s-wait", BLOQUEADO: "s-stop", FRENADO: "s-stop", PLANIFICADO: "s-flat", DIFERIDO: "s-wait" }

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// Inline markdown is applied only after escaping, so authored prose can never inject markup.
const inline = (text) => escape(text)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")

const number = (value) => value === null || value === undefined ? "—" : value.toLocaleString("es-AR")

export function parseAuthored(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) fail("CT_RADIOGRAFIA_UNSTAMPED", "the authored judgment has no front matter")
  const meta = {}
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([a-z_]+):\s*(.*)$/)
    if (pair) meta[pair[1]] = pair[2].trim()
  }
  if (!meta.verified_against) fail("CT_RADIOGRAFIA_UNSTAMPED", "front matter must declare `verified_against`")
  // HTML comments carry the authoring instructions for this file; they document the
  // conventions and must never reach the reader as escaped prose.
  const body = match[2].replace(/<!--[\s\S]*?-->/g, "")
  return Object.freeze({ meta: Object.freeze(meta), body })
}

const instruments = (m) => {
  const ship = m.code.shipping
  const enumerated = m.plans.filter((plan) => plan.total !== null).length
  const cells = [
    { value: `${Math.round((m.global.plans_closed / m.global.plans_total) * 100)}%`, label: `Planes cerrados · ${m.global.plans_closed} de ${m.global.plans_total}`, tone: "" },
    { value: `${Math.round((m.global.sessions_closed / m.global.sessions_total) * 100)}%`, label: `Sesiones cerradas · ${m.global.sessions_closed} de ${m.global.sessions_total}`, tone: "" },
    m.tests
      ? { value: number(m.tests.pass), label: m.tests.fail ? `tests en verde · ${m.tests.fail} rojos` : "tests en verde · 0 rojos", tone: m.tests.fail ? "i-stop" : "i-ok" }
      : { value: "—", label: "suite sin medir en este commit", tone: "i-wait" },
    // Plans without a `(n/m S)` fraction cannot report an auditable percentage. Surfacing
    // the count makes planning debt visible instead of hiding it behind a bare number.
    { value: `${enumerated}/${m.plans.length}`, label: "Planes con Sesiones enumeradas", tone: enumerated === m.plans.length ? "i-ok" : "i-wait" },
    { value: `${m.code.doc_ratio}×`, label: "se documenta más de lo que se construye", tone: "i-wait" },
  ]
  if (ship) cells.splice(2, 0,
    { value: `${ship.installed_pct}%`, label: "del código llega a instalarse", tone: "i-wait" },
    { value: number(ship.unshipped_imported_by_payload), label: `de ${ship.unshipped_files} módulos sin enviar los usa el producto`, tone: "i-stop" })
  return `<div class="instruments">\n${cells.map((cell) =>
    `    <div${cell.tone ? ` class="${cell.tone}"` : ""}><b>${cell.value}</b><span>${escape(cell.label)}</span></div>`).join("\n")}\n  </div>`
}

const planRows = (m) => m.plans.map((plan) => {
  const measured = plan.total !== null
  const width = measured ? plan.pct : 100
  const label = measured ? `${plan.pct}% ${plan.closed}/${plan.total}` : "sin medir"
  return `        <tr><td class="mono">${escape(plan.id)}</td><td>${escape(plan.name)}</td>` +
    `<td><div class="meter"><div class="track"><div class="fill${measured ? "" : " zero"}" style="width:${width}%"></div></div><span class="pct">${escape(label)}</span></div></td>` +
    `<td><span class="state ${STATE_CLASS[plan.state] ?? "s-flat"}">${escape(plan.state)}</span></td>` +
    `<td>${inline(measured ? plan.remaining : plan.unmeasured_reason ?? plan.remaining)}</td></tr>`
}).join("\n")

const progressTable = (m) => `<div class="scroll">
      <table>
        <thead><tr><th>Plan</th><th>Qué resuelve</th><th>Avance</th><th>Estado</th><th>Qué queda</th></tr></thead>
        <tbody>
${planRows(m)}
        </tbody>
      </table>
    </div>`

const queueList = (m) => m.queue.length === 0
  ? `<p class="lede">La cola de ejecución está vacía en el índice maestro.</p>`
  : `<div class="queue">\n${m.queue.map((item) =>
      `      <div class="queue-item"><span class="pos">${item.pos}</span><span class="sid">${escape(item.session)}</span><span class="desc">—</span></div>`).join("\n")}\n    </div>`

const DERIVED = { instrumentos: instruments, avance: progressTable, cola: queueList }

const warnings = (doc, m) => {
  const notes = []
  if (!m.git.clean) notes.push("<strong>Árbol sucio</strong> al medir: hay cambios sin commitear, así que esta radiografía no describe exactamente lo que está entregado.")
  const judgment = m.git.judgment
  const stamp = escape(doc.meta.verified_against.slice(0, 7))
  if (judgment && !judgment.known) notes.push(`El juicio dice haberse verificado contra <code>${stamp}</code>, un commit que <strong>este repositorio no contiene</strong>. No se puede saber contra qué se escribió.`)
  else if (judgment?.drifted) notes.push(`El juicio <strong>se escribió contra otro commit</strong> (<code>${stamp}</code>) y desde entonces entraron ${judgment.commits} commits que cambiaron el producto. Los números están al día; el juicio puede no estarlo.`)
  else if (!judgment && doc.meta.verified_against !== m.git.head) notes.push(`El juicio <strong>se escribió contra otro commit</strong> (<code>${stamp}</code>) y se está mostrando sobre <code>${escape(m.git.short)}</code>.`)
  if (m.tests && !m.tests.at_head) notes.push(`El resultado de los tests está <strong>desactualizado</strong>: se registró en <code>${escape((m.tests.recorded_head ?? "").slice(0, 7))}</code>, no en este commit.`)
  if (!m.tests) notes.push("La suite <strong>nunca se registró</strong> para este commit. No se reporta un número inventado.")
  if (!notes.length) return ""
  return `  <section>\n    <div class="correction">\n      <h3>Advertencias de esta medición</h3>\n${notes.map((note) => `      <p>${note}</p>`).join("\n")}\n    </div>\n  </section>\n\n`
}

const optionBlock = (text) => {
  const parsed = text.match(/^([A-Z])\s*·\s*(.+)$/s)
  if (!parsed) return `<div class="option"><span class="letter">·</span><span class="text">${inline(text)}</span></div>`
  const recommended = /→\s*recomendada/.test(parsed[2])
  const body = parsed[2].replace(/→\s*recomendada\s*$/, "").trim()
  const split = body.match(/^(\*\*[^*]+\*\*)\s*(.*)$/s)
  const head = split ? inline(split[1]) : inline(body)
  const rest = split ? split[2].trim() : ""
  const rec = recommended ? ` <span class="rec">— es la que recomiendo</span>` : ""
  return `<div class="option"><span class="letter">${escape(parsed[1])}</span><span class="text">${head}` +
    `${rest || recommended ? `<span class="consequence">${inline(rest)}${rec}</span>` : ""}</span></div>`
}

// A block is a heading plus the lines under it. Anything the shapes below do not claim
// renders as plain prose rather than being dropped.
const renderBlocks = (body, m) => {
  const out = []
  let openSection = false
  const close = () => { if (openSection) { out.push("  </section>\n"); openSection = false } }
  const chunks = body.split(/\n(?=#{2,4}\s|\{\{)/)

  for (const chunk of chunks) {
    const trimmed = chunk.trim()
    if (!trimmed) continue

    const placeholder = trimmed.match(/^\{\{\s*(\w+)\s*\}\}$/)
    if (placeholder) {
      const build = DERIVED[placeholder[1]]
      out.push(build ? `  ${build(m)}\n` : `  <p class="lede">${escape(trimmed)}</p>\n`)
      continue
    }

    const lines = trimmed.split("\n")
    const heading = lines[0].match(/^(#{2,4})\s+(.*)$/)
    const rest = lines.slice(1).join("\n").trim()

    if (heading && heading[1] === "##") {
      close()
      out.push(`  <section>\n    <h2>${inline(heading[2])}</h2>\n`)
      openSection = true
      if (rest) out.push(`    <p class="lede">${inline(rest)}</p>\n`)
      continue
    }

    if (heading && heading[1] === "###") {
      const parts = heading[2].split("·").map((part) => part.trim())
      const [id, chip, ...title] = parts.length >= 3 ? parts : ["", "", ...parts]
      const layers = { "Lo técnico": [], "En simple": [], Evidencia: [] }
      const loose = []
      for (const line of rest.split("\n").map((line) => line.trim()).filter(Boolean)) {
        const tagged = line.match(/^(Lo técnico|En simple|Evidencia):\s*(.*)$/)
        if (tagged) layers[tagged[1]].push(tagged[2]); else loose.push(line)
      }
      out.push(`    <div class="strip">
      <div class="rail"><span class="id">${inline(id)}</span><span class="chip ${CHIPS[chip] ?? "c-flat"}">${inline(chip)}</span></div>
      <div class="strip-body">
        <h3>${inline(title.join(" · "))}</h3>
${layers["Lo técnico"].length ? `        <div class="tech"><span class="tag">Lo técnico</span>${layers["Lo técnico"].map((text) => `<p>${inline(text)}</p>`).join("")}</div>\n` : ""}${layers["En simple"].length ? `        <div class="simple"><span class="tag">En simple</span>${layers["En simple"].map((text) => `<p>${inline(text)}</p>`).join("")}</div>\n` : ""}${loose.map((text) => `        <p class="tech">${inline(text)}</p>\n`).join("")}${layers.Evidencia.length ? `        <p class="evidence">${inline(layers.Evidencia.join(" · "))}</p>\n` : ""}      </div>
    </div>\n`)
      continue
    }

    if (heading && heading[1] === "####") {
      const parts = heading[2].split("·").map((part) => part.trim())
      const num = parts.length > 1 ? parts.slice(0, -1).join(" · ") : ""
      const title = parts[parts.length - 1]
      const why = []
      const options = []
      for (const line of rest.split("\n").map((line) => line.trim()).filter(Boolean)) {
        if (line.startsWith("- ")) options.push(optionBlock(line.slice(2).trim()))
        else why.push(line)
      }
      out.push(`    <div class="decision">
      <div class="decision-head"><span class="num">${inline(num)}</span><h3>${inline(title)}</h3></div>
${why.map((text) => `      <p class="why">${inline(text)}</p>`).join("\n")}
${options.length ? `      <div class="options">\n        ${options.join("\n        ")}\n      </div>\n` : ""}    </div>\n`)
      continue
    }

    out.push(`    <p class="lede">${inline(trimmed)}</p>\n`)
  }
  close()
  return out.join("")
}

const footer = (doc, m) => `  <footer>
    Medido automáticamente el ${escape(m.measured_at.slice(0, 10))} contra <code>${escape(m.git.short)}</code>${m.git.clean ? ", árbol limpio" : ", <strong>árbol sucio</strong>"} ·
    Suite: ${m.tests ? `${number(m.tests.pass)} pass, ${number(m.tests.fail)} fail, ${number(m.tests.expectations)} comprobaciones, ${number(m.tests.files)} archivos${m.tests.at_head ? "" : " — <strong>registrada en otro commit</strong>"}` : "<strong>sin registrar en este commit</strong>"} ·
    Producto: ${number(m.code.product_lines)} líneas en ${number(m.code.product_files)} archivos que git trackea, excluyendo <code>test/</code>, <code>openspec/</code>, <code>scripts/</code> y los directorios ocultos ·
${m.code.shipping ? `    Instalado: ${number(m.code.shipping.installed_lines)} líneas en ${number(m.code.shipping.installed_files)} archivos (${m.code.shipping.installed_pct}%) ·
    Módulos sin enviar: ${number(m.code.shipping.unshipped_files)}, de los cuales el producto instalado importa ${number(m.code.shipping.unshipped_imported_by_payload)} ·
` : ""}    Documentación: ${number(m.code.doc_lines)} líneas, ratio ${m.code.doc_ratio}× sobre producto ·
    Últimas ${m.git.recent.window_hours} h: ${number(m.git.recent.total)} commits, ${number(m.git.recent.docs)} de documentación y ${number(m.git.recent.code)} de código ·
    Juicio escrito el ${escape(doc.meta.verified_at ?? "—")} contra <code>${escape(doc.meta.verified_against.slice(0, 7))}</code> ·
    Fuente de las cifras de planificación: <code>${escape(m.source.masterIndex)}</code>. Este documento se regenera solo; no lo edites a mano.
  </footer>`

export function renderReport(doc, m) {
  return `<title>${escape(m.source.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">

<style>
${STYLE}</style>

<div class="wrap">

  <header class="masthead">
    <div class="eyebrow">${escape(m.source.project)} · seguimiento de producto · generado automáticamente</div>
    <h1>${escape(m.source.title)}</h1>
    <p class="standfirst">${inline(doc.meta.standfirst ?? "Dónde está el producto hoy, verificado contra el código.")}</p>
    <div class="meta">
      <span>${escape(m.measured_at.slice(0, 10))}</span>
      <span>master@${escape(m.git.short)}</span>
      <span>${m.tests ? `${number(m.tests.pass)} pass / ${number(m.tests.fail)} fail` : "suite sin medir"}</span>
      <span>${number(m.code.product_files)} archivos de producto</span>
      <span>${number(m.code.test_files)} archivos de test</span>
    </div>
  </header>

${warnings(doc, m)}${renderBlocks(doc.body, m)}
${footer(doc, m)}

</div>
`
}
