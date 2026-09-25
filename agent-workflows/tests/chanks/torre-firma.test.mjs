import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { firmaHerramienta } from "../../chanks/torre-firma.mjs"

const hook = fileURLToPath(new URL("../../tools/hooks/torre-firma.sh", import.meta.url))
const pi = (toolName, input) => ({ toolName, input })

const cases = [
  ["bash", { command: "$HOME/.local/bin/radar status --json -C ." }, "🗼 Torre · radar status"],
  ["bash", { command: "radar sesion S163 -C ." }, "🗼 Torre · radar sesion"],
  ["bash", { command: "./jornada.sh" }, "🗼 Torre · jornada.sh"],
  ["bash", { command: "./jornada.sh --ejecutar" }, "🗼 Torre · jornada.sh --ejecutar"],
  ["bash", { command: "./jornada.sh --sin-fetch" }, "🗼 Torre · jornada.sh --sin-fetch"],
  ["bash", { command: "false && radar status" }, null],
  ["bash", { command: "true && radar status" }, null],
  ["bash", { command: "radar admite S163" }, null],
  ["bash", { command: "echo listo && jornada.sh --ejecutar" }, null],
  ["bash", { command: "echo ok | radar status" }, null],
  ["bash", { command: "if true; then radar status; fi" }, null],
  ["bash", { command: "radar status; echo listo" }, null],
  ["bash", { command: "echo ok; # commentary; radar status" }, null],
  ["bash", { command: "echo ok; # commentary; radar status\nradar sesion S163" }, null],
  ["bash", { command: "printf '# quoted'; radar status" }, null],
  ["bash", { command: "echo foo#bar; radar status" }, null],
  ["bash", { command: "./jornada.sh abrir" }, null],
  ["bash", { command: "./jornada.sh cerrar" }, null],
  ["write", { path: "openspec/plan.yaml", content: "x" }, "🗼 Torre · plan.yaml write"],
  ["edit", { path: "/work/repo/openspec/plan.yaml", edits: [] }, "🗼 Torre · plan.yaml edit"],
  ["bash", { command: "echo radar status" }, null],
  ["bash", { command: "printf 'radar sesion'" }, null],
  ["bash", { command: "./not-radar status" }, null],
  ["bash", { command: "radar" }, null],
  ["bash", { command: "jornada.sh" }, null],
  ["write", { path: "openspec/plan.yaml.bak" }, null],
  ["edit", { path: "elsewhere/plan.yaml" }, null],
  ["read", { path: "openspec/plan.yaml" }, null],
  ["bash", { command: "torre estado" }, null],
  ["bash", { command: "echo 🗼 Torre" }, null],
  ["write", { path: 42 }, null],
]

describe("visible Tower tool identity", () => {
  for (const [tool, input, expected] of cases) {
    test(`Pi ${tool}: ${JSON.stringify(input)} → ${expected}`, () => {
      expect(firmaHerramienta(pi(tool, input))).toBe(expected)
    })
    test(`Claude ${tool}: ${JSON.stringify(input)} → ${expected}`, () => {
      const claude = { tool_name: { bash: "Bash", write: "Write", edit: "Edit" }[tool] ?? tool,
        tool_input: tool === "bash" ? input : { file_path: input.path } }
      const result = spawnSync("sh", [hook], { input: JSON.stringify(claude), encoding: "utf8" })
      expect(result.status).toBe(0)
      expect(result.stdout.trim()).toBe(expected ?? "")
    })
  }

  test("malformed events remain silent, non-blocking", () => {
    for (const raw of ["", "{", "null", "[]", JSON.stringify({ tool_name: "Bash", tool_input: {} })]) {
      const result = spawnSync("sh", [hook], { input: raw, encoding: "utf8" })
      expect(result.status).toBe(0)
      expect(result.stdout).toBe("")
    }
    expect(firmaHerramienta(null)).toBeNull()
  })
})
