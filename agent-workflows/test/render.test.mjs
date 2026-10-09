import { describe, expect, test } from "bun:test"

import { parseAuthored, renderReport } from "../radiografia/render.mjs"

const MEASUREMENTS = Object.freeze({
  measured_at: "2026-08-20T18:00:00.000Z",
  source: { project: "Control Tower", title: "Radiografía de la Torre", plan: "openspec/plan.yaml", producto: "control-tower" },
  git: { head: "d43c09a616bf57483ea55b9a92fc28dd03577f34", short: "d43c09a", clean: true, recent: { docs: 20, code: 9, total: 29, window_hours: 24 } },
  code: { product_files: 72, product_lines: 11620, test_files: 65, test_lines: 16891, doc_lines: 26441, doc_ratio: 2.28, shipping: { installed_files: 18, installed_lines: 6260, installed_pct: 54, unshipped_files: 54, unshipped_imported_by_payload: 0 } },
  zonas: [
    { id: "contratos", nombre: "Contratos", cerradas: 3, total: 3, pct: 100, unmeasured_reason: null, cola: [] },
    { id: "hosts", nombre: "Hosts", cerradas: 2, total: 9, pct: 22, unmeasured_reason: null, cola: [{ posicion: 1, sesion: "S5.2", estado: "LISTO", resultado: "Parking y retoma del loop" }] },
    { id: "archivo", nombre: "Archivo", cerradas: null, total: null, pct: null, unmeasured_reason: "sin Sesiones enumeradas", cola: [] },
  ],
  asientos: ["hosts"],
  territorio_pendiente: 2,
  global: { zonas_cerradas: 1, zonas_total: 2, sesiones_cerradas: 35, sesiones_total: 50 },
  tests: { pass: 862, fail: 0, expectations: 5173, files: 62, measured_at: "2026-08-20T17:00:00.000Z", recorded_head: "d43c09a616bf57483ea55b9a92fc28dd03577f34", at_head: true },
})

const AUTHORED = `---
verified_against: d43c09a616bf57483ea55b9a92fc28dd03577f34
verified_at: 2026-08-20
standfirst: Dónde está el producto hoy.
---

{{instrumentos}}

## El veredicto

Prosa suelta de la sección.

### A · crítico · El escalamiento está apagado

Lo técnico: \`escalation/\` no tiene un solo llamador.
En simple: la Torre sabe armar la pregunta y nadie se la pide.
Evidencia: escalation/routing.mjs:203

## Avance

{{avance}}

## Decisiones

#### 1 · define la versión 1 · Dónde se te muestra una decisión pendiente

El contexto: falta la superficie donde la ves.

- A · **Agregar un comando.** Es lo mínimo que te la hace ver. → recomendada
- B · **Decidir después.** Queda visible sólo leyendo el archivo.
`

const render = (authored = AUTHORED, measurements = MEASUREMENTS) =>
  renderReport(parseAuthored(authored), measurements)

describe("parseAuthored", () => {
  test("reads the front matter that stamps when the judgment was written", () => {
    const doc = parseAuthored(AUTHORED)
    expect(doc.meta.verified_against).toBe("d43c09a616bf57483ea55b9a92fc28dd03577f34")
    expect(doc.meta.standfirst).toBe("Dónde está el producto hoy.")
  })

  test("strips the authoring instructions so they never reach the reader", () => {
    const authored = AUTHORED.replace("{{instrumentos}}", "<!--\ncómo se escribe: {{avance}}\n-->\n\n{{instrumentos}}")
    const html = renderReport(parseAuthored(authored), MEASUREMENTS)
    expect(html).not.toContain("cómo se escribe")
    expect(html).not.toContain("&lt;!--")
  })

  test("fails closed when the judgment does not say what it was verified against", () => {
    expect(() => parseAuthored("# sin front matter\n")).toThrow(/CT_RADIOGRAFIA_UNSTAMPED/)
  })
})

describe("renderReport — derived figures", () => {
  test("takes every number from the measurement, never from the authored prose", () => {
    const html = render()
    expect(html).toContain("54%")
    expect(html).toContain("862")
    expect(html).toContain("35 de 50")
    expect(html).toContain("d43c09a")
  })

  test("replaces the placeholders and leaves none behind", () => {
    const html = render()
    expect(html).not.toMatch(/\{\{\s*\w+\s*\}\}/)
    expect(html).toContain("instruments")
    expect(html).toContain("Contratos")
  })

  test("renders a Zona with no enumerated Sesión as unmeasured, not as zero", () => {
    const html = render()
    expect(html).toContain("sin medir")
    expect(html).not.toContain("0% 0/0")
  })
})

describe("renderReport — honest reporting", () => {
  test("says the suite was never measured instead of reporting zero passing", () => {
    const html = render(AUTHORED, { ...MEASUREMENTS, tests: null })
    expect(html).toContain("sin medir")
    expect(html).not.toMatch(/<b>0<\/b>\s*<span>tests/)
  })

  test("marks a suite recorded at another commit as stale, and names the commit", () => {
    const stale = { ...MEASUREMENTS, tests: { ...MEASUREMENTS.tests, at_head: false, recorded_head: "0".repeat(40) } }
    const html = render(AUTHORED, stale)
    expect(html).toMatch(/tests.*0000000|0000000.*tests/s)
    expect(html.toLowerCase()).toContain("desactualizad")
  })

  test("warns when the written judgment is older than the commit it is rendered against", () => {
    const html = render(AUTHORED, { ...MEASUREMENTS, git: { ...MEASUREMENTS.git, head: "f".repeat(40), short: "fffffff" } })
    expect(html.toLowerCase()).toContain("se escribió contra otro commit")
  })

  test("says the tree was dirty so a render is never signed as verified when it is not", () => {
    const html = render(AUTHORED, { ...MEASUREMENTS, git: { ...MEASUREMENTS.git, clean: false } })
    expect(html.toLowerCase()).toContain("árbol sucio")
  })
})

describe("renderReport — authored blocks", () => {
  test("renders a finding with both layers and its evidence", () => {
    const html = render()
    expect(html).toContain("Lo técnico")
    expect(html).toContain("En simple")
    expect(html).toContain("no tiene un solo llamador")
    expect(html).toContain("escalation/routing.mjs:203")
    expect(html).toContain('class="chip c-stop"')
  })

  test("renders a decision with its options and marks the recommendation", () => {
    const html = render()
    expect(html).toContain("Dónde se te muestra una decisión pendiente")
    expect(html).toContain("El contexto")
    expect(html).toContain('class="rec"')
    expect(html).toContain("Agregar un comando")
    expect(html).not.toContain("→ recomendada")
  })

  test("converts inline code and bold from the authored markdown", () => {
    const html = render()
    expect(html).toContain("<code>escalation/</code>")
    expect(html).toContain("<strong>Agregar un comando.</strong>")
  })

  test("escapes authored angle brackets so prose can never inject markup", () => {
    const authored = AUTHORED.replace("Prosa suelta de la sección.", "Prosa con <script>alert(1)</script> adentro.")
    const html = render(authored)
    expect(html).not.toContain("<script>alert(1)</script>")
    expect(html).toContain("&lt;script&gt;")
  })
})

describe("renderReport — document shape", () => {
  test("emits a self-contained page with a stable title and balanced sections", () => {
    const html = render()
    expect(html).toContain("<title>Radiografía de la Torre</title>")
    expect(html).not.toContain("<html")
    expect(html).not.toContain("<body")
    expect((html.match(/<section>/g) ?? []).length).toBe((html.match(/<\/section>/g) ?? []).length)
    expect((html.match(/<div/g) ?? []).length).toBe((html.match(/<\/div>/g) ?? []).length)
  })

  test("inlines the stylesheet so the page needs no host but Google Fonts", () => {
    const html = render()
    expect(html).toContain("--paper:")
    expect(html).toContain('prefers-color-scheme: dark')
    expect(html.match(/https:\/\/(?!fonts\.)/g)).toBeNull()
  })
})

describe("renderReport — proyectos sin payload", () => {
  const noShip = { ...MEASUREMENTS, code: { ...MEASUREMENTS.code, shipping: null } }

  test("omits the shipped-share instruments and footer lines rather than printing zeros", () => {
    const html = renderReport(parseAuthored(AUTHORED), noShip)
    expect(html).not.toContain("del código llega a instalarse")
    expect(html).not.toContain("módulos sin enviar")
    expect(html).toContain("Zonas con Sesiones enumeradas")
  })

  test("names the project and title from the measurement, not from a hardcoded string", () => {
    const other = { ...noShip, source: { project: "Proyecto Alpha", title: "Radiografía de Proyecto Alpha", plan: "openspec/plan.yaml", producto: "proyecto-alpha" } }
    const html = renderReport(parseAuthored(AUTHORED), other)
    expect(html).toContain("<title>Radiografía de Proyecto Alpha</title>")
    expect(html).toContain("Proyecto Alpha ·")
    expect(html).not.toContain("Radiografía de la Torre")
  })

  test("counts how many Zonas carry an auditable Sesión fraction", () => {
    const html = renderReport(parseAuthored(AUTHORED), noShip)
    expect(html).toContain("2/3")
  })
})
