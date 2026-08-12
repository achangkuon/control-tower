import { describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { canonicalize, digestArtifact } from "../../contracts/canonicalize.mjs"
import { ContractError } from "../../contracts/errors.mjs"

const source = `# Plan

## Grafo de dependencias

\`\`\`mermaid
graph LR
  S56["S5.6 canonical identity · 🟢"]
\`\`\`

## Sesión 5.6 — Canonical identity

**Estado:** 🟢 LISTO
**Depende de:** —
**Área:** \`contracts/session-plan-snapshot.mjs\`
**Recurso:** canonical contract registry
**Decisiones:** —

**Criterios de aceptación de S5.6**

- [ ] Exact bytes remain authoritative.
`
const richSource = `# Plan

## Grafo de dependencias

\`\`\`mermaid
graph TD
  S57["S5.7 future · 📋"]
  S54["S5.4 routing · ✅"] --> S56["S5.6 canonical parser · 🟢"]
  S55["S5.5 continuation · 📋"]
  S56 --> S57
\`\`\`

## Sesión 5.6 — Canonical parser

**Estado:** 🟢 LISTO — ready
**Depende de:** \`S5.4\` ✅
**Área:** \`z/path\`, \`a/path\`
**Recurso:** canonical registry
**Decisiones:**
- \`derivable\` — choose identity. **Criterio:** exact bytes. **Autoridad:** approved contract.
- \`escala\` — active impact. **Clase:** seguridad y permisos. **Contamina:** \`S5.7\`.
- \`escala\` — resolved impact. **Clase:** dependencias o evidencia contradictorias. **RESUELTA por el maintainer.** **Contaminaba:** \`S5.5\`.
- \`escala\` — no semantic impact. **Clase:** operaciones irreversibles.

### Módulo 5.6.2 — Parser
- [ ] Tarea 5.6.2.1 — this is not an acceptance criterion.

**Criterios de aceptación de S5.6** — required
- [ ] First observable result.
- [x] Second observable result.

## Sesión 5.7 — Future
`
const bytes = Buffer.from(source)
const plan5Url = new URL("../../openspec/plans/plan-5/STATUS.md", import.meta.url)
const plan5Bytes = readFileSync(plan5Url)
const loadParser = () => import("../../contracts/session-plan-snapshot.mjs")
const captured = async (operation) => {
  try { await operation() } catch (error) { return error }
  return null
}

describe("session plan snapshot identity", () => {
  test("executes parser and validator semantics in either Bun ESM import order", () => {
    const exercise = (imports) => `${imports}; const bytes=Buffer.from(${JSON.stringify(source)}); const snapshot=parseSessionPlanSnapshot({plan_bytes:bytes,target_session_id:"S5.6"}); const checked=validate("sessionPlanSnapshot",snapshot); if(checked.target.session_id!=="S5.6"||!Object.isFrozen(checked))throw new Error("semantic assertion failed")`
    const imports = [
      exercise(`const {parseSessionPlanSnapshot}=await import("./contracts/session-plan-snapshot.mjs"); const {validate}=await import("./contracts/validate.mjs")`),
      exercise(`const {validate}=await import("./contracts/validate.mjs"); const {parseSessionPlanSnapshot}=await import("./contracts/session-plan-snapshot.mjs")`),
    ]
    for (const script of imports) {
      const result = Bun.spawnSync({ cmd: ["bun", "-e", script], cwd: process.cwd(), stdout: "pipe", stderr: "pipe" })
      expect(result.exitCode).toBe(0)
    }
  })

  test("binds exact raw bytes and a distinct self-excluding snapshot digest", async () => {
    const { parseSessionPlanSnapshot, sessionPlanSnapshotDigest } = await loadParser()
    const snapshot = parseSessionPlanSnapshot({ plan_bytes: bytes, target_session_id: "S5.6" })

    expect(snapshot.source.content_digest).toBe(digestArtifact(bytes, "raw-bytes"))
    const otherBytes = Buffer.from(source.replace("Canonical identity", "Second canonical identity"))
    const other = parseSessionPlanSnapshot({ plan_bytes: otherBytes, target_session_id: "S5.6" })
    expect(snapshot.snapshot_digest).toBe(sessionPlanSnapshotDigest(snapshot))
    expect(snapshot.snapshot_digest).not.toBe(snapshot.source.content_digest)
    expect(other.snapshot_digest).not.toBe(snapshot.snapshot_digest)
    expect(Object.isFrozen(snapshot.target.acceptance_criteria[0])).toBe(true)
  })

  test("rejects one-byte drift and a stale claimed source digest", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const expected = digestArtifact(bytes, "raw-bytes")
    const drifted = Buffer.concat([bytes, Buffer.from(" ")])
    const error = await captured(() => parseSessionPlanSnapshot({
      plan_bytes: drifted, target_session_id: "S5.6", expected_plan_digest: expected,
    }))

    expect(error).toBeInstanceOf(ContractError)
    expect(error.code).toBe("CT_SCHEMA_INVALID")
    expect(Object.isFrozen(error)).toBe(true)
  })

  test("rejects line-ending byte drift as CT_SCHEMA_INVALID without a partial value", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const expected = digestArtifact(bytes, "raw-bytes")
    const crlf = Buffer.from(source.replaceAll("\n", "\r\n"))
    const error = await captured(() => parseSessionPlanSnapshot({ plan_bytes: crlf, target_session_id: "S5.6", expected_plan_digest: expected }))

    expect(error).toBeInstanceOf(ContractError)
    expect(error.code).toBe("CT_SCHEMA_INVALID")
  })

  test("accepts Buffer bytes and rejects fatal UTF-8 without mutating input", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const invalid = Buffer.from([0xc3, 0x28])
    const before = Buffer.from(invalid)
    const error = await captured(() => parseSessionPlanSnapshot({ plan_bytes: invalid, target_session_id: "S5.6" }))

    expect(error.code).toBe("CT_SCHEMA_INVALID")
    expect(invalid).toEqual(before)
  })

  test("guards public null, primitive, and Symbol inputs with frozen contract errors", async () => {
    const { parseSessionPlanSnapshot, sessionPlanSnapshotDigest } = await loadParser()
    const operations = [
      () => sessionPlanSnapshotDigest(null), () => sessionPlanSnapshotDigest(7), () => sessionPlanSnapshotDigest(Symbol("snapshot")),
      () => parseSessionPlanSnapshot(null), () => parseSessionPlanSnapshot(7), () => parseSessionPlanSnapshot(Symbol("input")),
      () => parseSessionPlanSnapshot({ plan_bytes: bytes, target_session_id: null }),
      () => parseSessionPlanSnapshot({ plan_bytes: bytes, target_session_id: 7 }),
      () => parseSessionPlanSnapshot({ plan_bytes: bytes, target_session_id: Symbol("target") }),
    ]
    for (const operation of operations) {
      const error = await captured(operation)
      expect(error).toBeInstanceOf(ContractError)
      expect(error.code).toBe("CT_SCHEMA_INVALID")
      expect(Object.isFrozen(error)).toBe(true)
    }
  })

  test("rejects a missing target or required identity field without a partial snapshot", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const missingTarget = await captured(() => parseSessionPlanSnapshot({ plan_bytes: bytes, target_session_id: "S5.7" }))
    const missingResource = Buffer.from(source.replace("**Recurso:** canonical contract registry\n", ""))
    const incomplete = await captured(() => parseSessionPlanSnapshot({ plan_bytes: missingResource, target_session_id: "S5.6" }))

    expect(missingTarget.code).toBe("CT_SCHEMA_INVALID")
    expect(incomplete.code).toBe("CT_SCHEMA_INVALID")
  })

  test("parses the authoritative Plan 5 target with external graph-only references", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const snapshot = parseSessionPlanSnapshot({ plan_bytes: plan5Bytes, target_session_id: "S5.6" })

    expect(snapshot.target.session_id).toBe("S5.6")
    expect(snapshot.target.depends_on).toEqual(["S5.4"])
    expect(snapshot.target.decisions).toHaveLength(4)
    expect(snapshot.target.decisions[0]).toMatchObject({ kind: "escala", resolution: "resolved", contamination: { state: "historical", session_ids: ["S5.5"] } })
    expect(snapshot.target.acceptance_criteria).toHaveLength(10)
    expect(snapshot.graph.external_session_ids).toEqual(["S3.2", "S3.3", "S3.4", "S4.1"])
    expect(snapshot.graph.local_session_ids).toEqual(["S5.1", "S5.10", "S5.11", "S5.12", "S5.2", "S5.3", "S5.4", "S5.5", "S5.6", "S5.7", "S5.8", "S5.9"])
    expect(snapshot.graph.edges).toHaveLength(15)
  })

  test("preserves complete target semantics and all contamination states", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const snapshot = parseSessionPlanSnapshot({ plan_bytes: Buffer.from(richSource), target_session_id: "S5.6" })

    expect(snapshot.target).toMatchObject({ status: "LISTO", depends_on: ["S5.4"], area: ["a/path", "z/path"], resource: "canonical registry" })
    expect(snapshot.target.decisions.map(({ kind }) => kind)).toEqual(["derivable", "escala", "escala", "escala"])
    expect(snapshot.target.decisions[1].contamination).toEqual({ state: "active", session_ids: ["S5.7"] })
    expect(snapshot.target.decisions[2]).toMatchObject({ resolution: "resolved", contamination: { state: "historical", session_ids: ["S5.5"] } })
    expect(snapshot.target.decisions[3].contamination).toEqual({ state: "none", session_ids: [] })
    expect(snapshot.target.acceptance_criteria).toEqual([{ checked: false, text: "First observable result." }, { checked: true, text: "Second observable result." }])
    expect(snapshot.graph).toEqual({
      local_session_ids: ["S5.6", "S5.7"], external_session_ids: ["S5.4", "S5.5"],
      edges: [{ from: "S5.4", to: "S5.6" }, { from: "S5.6", to: "S5.7" }],
    })
  })

  test("accepts both dependency labels and the seven closed statuses", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    expect(parseSessionPlanSnapshot({ plan_bytes: Buffer.from(richSource.replace("**Depende de:**", "**Dependencias:**")), target_session_id: "S5.6" }).target.depends_on).toEqual(["S5.4"])
    const statuses = [["📋", "PLANIFICADO"], ["🟢", "LISTO"], ["🔵", "EN CURSO"], ["🔴", "BLOQUEADO"], ["🟡", "DIFERIDO"], ["✅", "COMPLETO"], ["📚", "ARCHIVADO"]]
    for (const [marker, status] of statuses) {
      const plan = richSource.replace("🟢 LISTO — ready", `${marker} ${status} — ready`)
      expect(parseSessionPlanSnapshot({ plan_bytes: Buffer.from(plan), target_session_id: "S5.6" }).target.status).toBe(status)
    }
  })

  test("fails closed for the complete graph, target, decision, and criteria rejection matrix", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const graph = source.slice(source.indexOf("## Grafo"), source.indexOf("## Sesión"))
    const target = source.slice(source.indexOf("## Sesión"))
    const cases = [
      ["missing graph", source.replace(graph, "")], ["duplicate graph", `${graph}${source}`],
      ["multiple fence", source.replace("```\n\n## Sesión", "```\n```mermaid\ngraph LR\n```\n\n## Sesión")],
      ["unresolved alias", source.replace("S56[", "UNKNOWN --> S56[")],
      ["duplicate node", source.replace("  S56[\"S5.6 canonical identity · 🟢\"]", "  S56[\"S5.6 canonical identity · 🟢\"]\n  ALT[\"S5.6 duplicate · 🟢\"]")],
      ["duplicate target", `${source}\n${target}`],
      ["duplicate field", source.replace("**Recurso:** canonical contract registry", "**Recurso:** canonical contract registry\n**Recurso:** duplicate")],
      ["unsupported status", source.replace("🟢 LISTO", "🟢 READY")],
      ["non-binary criterion", source.replace("- [ ] Exact", "- [~] Exact")],
      ["duplicate edge", richSource.replace("  S56 --> S57", "  S56 --> S57\n  S56 --> S57")],
      ["cycle", richSource.replace("  S56 --> S57", "  S56 --> S57\n  S57 --> S56")],
      ["dependency mismatch", richSource.replace("S54[\"S5.4 routing · ✅\"] --> S56", "S54[\"S5.4 routing · ✅\"] --> S57")],
      ["unresolved contamination", richSource.replace("**Contamina:** `S5.7`", "**Contamina:** `S9.9`")],
      ["malformed class", richSource.replace("**Clase:** seguridad y permisos", "**Clase:** unknown")],
      ["duplicate criterion", richSource.replace("- [x] Second observable result.", "- [x] Second observable result.\n- [x] Second observable result.")],
    ]
    for (const [name, text] of cases) {
      const input = Buffer.from(text), before = Buffer.from(input)
      const error = await captured(() => parseSessionPlanSnapshot({ plan_bytes: input, target_session_id: name === "graph-only target" ? "S5.4" : "S5.6" }))
      expect(`${name}:${error?.code}`).toBe(`${name}:CT_SCHEMA_INVALID`)
      expect(error).toBeInstanceOf(ContractError)
      expect(Object.isFrozen(error)).toBe(true)
      expect(input).toEqual(before)
    }
    const graphOnly = await captured(() => parseSessionPlanSnapshot({ plan_bytes: Buffer.from(richSource), target_session_id: "S5.4" }))
    expect(graphOnly.code).toBe("CT_SCHEMA_INVALID")
  })

  test("orders set-like output and remains deterministic for identical bytes", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const input = Buffer.from(richSource)
    const first = parseSessionPlanSnapshot({ plan_bytes: input, target_session_id: "S5.6" })
    const second = parseSessionPlanSnapshot({ plan_bytes: input, target_session_id: "S5.6" })
    expect(canonicalize(first)).toBe(canonicalize(second))
    expect(first.snapshot_digest).toBe(second.snapshot_digest)
  })

  test("leaves Plan 5, input, DB, WAL, SHM, and Tower witnesses unchanged on success and rejection", async () => {
    const { parseSessionPlanSnapshot } = await loadParser()
    const expectedPlanDigest = digestArtifact(plan5Bytes, "raw-bytes")
    const cases = [
      { name: "success", input: Buffer.from(plan5Bytes), expectedError: false },
      { name: "CRLF rejection", input: Buffer.from(plan5Bytes.toString("utf8").replaceAll("\n", "\r\n")), expectedError: true },
    ]
    for (const { name, input, expectedError } of cases) {
      const root = mkdtempSync(join(tmpdir(), "s5-6-read-only-"))
      try {
        const sentinels = new Map([
          [join(root, "control-tower.db"), Buffer.from("DB_SENTINEL_V1")],
          [join(root, "control-tower.db-wal"), Buffer.from("WAL_SENTINEL_V1")],
          [join(root, "control-tower.db-shm"), Buffer.from("SHM_SENTINEL_V1")],
          [join(root, "tower-state"), Buffer.from("TOWER_SENTINEL_V1")],
        ])
        for (const [path, content] of sentinels) writeFileSync(path, content)
        const planBefore = readFileSync(plan5Url), inputBefore = Buffer.from(input)
        const sentinelBefore = new Map([...sentinels].map(([path]) => [path, readFileSync(path)]))
        const error = await captured(() => parseSessionPlanSnapshot({
          plan_bytes: input, target_session_id: "S5.6", expected_plan_digest: expectedPlanDigest,
        }))

        expect(`${name}:${error?.code ?? "accepted"}`).toBe(`${name}:${expectedError ? "CT_SCHEMA_INVALID" : "accepted"}`)
        expect(readFileSync(plan5Url)).toEqual(planBefore)
        expect(input).toEqual(inputBefore)
        for (const [path, content] of sentinelBefore) expect(readFileSync(path)).toEqual(content)
      } finally { rmSync(root, { recursive: true, force: true }) }
    }
  })

  test("keeps parser imports canonical and excludes fallback, runtime, and writer routes", () => {
    const parserSource = readFileSync(new URL("../../contracts/session-plan-snapshot.mjs", import.meta.url), "utf8")
    const imports = [...parserSource.matchAll(/^import .* from "([^"]+)"$/gmu)].map((match) => match[1])
    expect(imports).toEqual(["./canonicalize.mjs", "./errors.mjs", "./validate.mjs"])
    const forbidden = [
      "continuation/", "engram", "main-store", "delivery/", "escalation/", "core.mjs", "mcp.mjs",
      "node:fs", "writeFile", "appendFile", "unlinkSync", "rmSync", "Bun.write", "Database",
    ]
    for (const token of forbidden) expect(parserSource.includes(token)).toBe(false)
  })
})
