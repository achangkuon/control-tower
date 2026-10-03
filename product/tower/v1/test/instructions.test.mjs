import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const instructionsRoot = new URL("../instructions/", import.meta.url);
const workflowsRoot = new URL("../../../../agent-workflows/", import.meta.url);
const templates = [
  { file: "project-agents.md", marker: "project-workflow" },
  { file: "global-pointer.md", marker: "pointer" },
];
const readTemplate = (file) => {
  const path = new URL(file, instructionsRoot);
  expect(existsSync(path), `${file} template must exist`).toBe(true);
  return readFileSync(path, "utf8");
};
const documents = () => templates.map(({ file }) => readTemplate(file));
const v1Skills = new Set([
  "chanks-1-adopcion", "chanks-1-autoridad", "chanks-1-brain-dump",
  "chanks-1-cierre-de-decisiones", "chanks-1-descubrimiento", "chanks-1-feature",
  "chanks-1-heredado", "chanks-1-prd", "chanks-1-project-kickoff",
  "chanks-1-requirements", "chanks-1-rfc", "chanks-1-terreno",
  "chanks-2-planificador-granular", "chanks-3-paralelo", "chanks-4-puente",
  "chanks-5-politica-de-entrega", "chanks-5-session-doc",
  "chanks-0-explicalo-simple", "chanks-0-session-context-loader",
  "chanks-0-mensajes-visibles", "chanks-0-skill-composer",
  "analisis-por-tramos", "skill-orchestrator",
]);
const v1Commands = new Set([
  "etapa", "faltan", "status", "sesion", "check", "render", "archivar", "zonas",
]);

describe("Control Tower V1 instruction templates", () => {
  for (const { file, marker } of templates) {
    test(`${file} has exactly one bounded Control Tower block`, () => {
      const text = readTemplate(file);
      const opening = `<!-- control-tower:${marker} -->`;
      const closing = `<!-- /control-tower:${marker} -->`;
      expect(text.startsWith(`${opening}\n`)).toBe(true);
      expect(text.endsWith(`${closing}\n`)).toBe(true);
      expect(text.split(opening)).toHaveLength(2);
      expect(text.split(closing)).toHaveLength(2);
    });

    test(`${file} has one version placeholder and no Gentle AI markers`, () => {
      const text = readTemplate(file);
      expect(text.match(/\{\{TOWER_VERSION\}\}/g) ?? []).toHaveLength(1);
      expect(text).not.toMatch(/gentle-ai:/i);
    });

    test(`${file} excludes obsolete machinery and personal context`, () => {
      expect(readTemplate(file)).not.toMatch(/jornada|herdr|admission|admisión|marcar|session-kickoff|Emilio|Notion/i);
    });

    test(`${file} ends with exactly one trailing newline`, () => {
      const text = readTemplate(file);
      expect(text.endsWith("\n")).toBe(true);
      expect(text.endsWith("\n\n")).toBe(false);
    });
  }

  test("project instructions contain the complete V1 flow and resume branch", () => {
    const text = readTemplate("project-agents.md");
    for (const line of [
      "radar etapa", "Stage 1 Define scope", "Stage 2 Prepare until LISTO",
      "radar check (validate the plan)", "Resume", "radar status",
      "Stage 3 · human approves the lot → subagents in parallel",
      "Stage 4 → Gentle AI implements and reviews",
      "Stage 5 · deliver per repo policy (human authorizes)",
      "radar archivar → check → render",
    ]) {
      expect(text).toContain(line);
    }
  });

  test("every referenced skill is an existing V1 skill directory", () => {
    const text = documents().join("\n");
    const referenced = [...text.matchAll(/`((?:chanks-[0-9]-[a-z0-9-]+)|analisis-por-tramos|skill-orchestrator)`/g)]
      .map((match) => match[1]);
    expect(referenced.length).toBeGreaterThan(0);
    const directories = new Set(readdirSync(new URL("skills/", workflowsRoot), { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name));
    for (const name of referenced) {
      expect(v1Skills.has(name), `${name} must be in the V1 roster`).toBe(true);
      expect(directories.has(name), `${name} must exist as a skill directory`).toBe(true);
    }
  });

  test("every referenced Radar subcommand is V1 and documented in Radar usage", () => {
    const text = documents().join("\n");
    const referenced = [...text.matchAll(/\bradar[ \t]+([a-z][a-z0-9-]*)\b/g)]
      .map((match) => match[1]);
    expect(referenced.length).toBeGreaterThan(0);
    const source = readFileSync(new URL("tools/radar/main.go", workflowsRoot), "utf8");
    const usage = /const uso = `([\s\S]*?)`/.exec(source);
    expect(usage, "Radar usage must exist").not.toBeNull();
    const documented = new Set([...usage[1].matchAll(/\bradar[ \t]+([a-z][a-z0-9-]*)\b/g)]
      .map((match) => match[1]));
    for (const command of v1Commands) {
      expect(documented.has(command), `radar ${command} must exist in usage`).toBe(true);
    }
    for (const command of referenced) {
      expect(v1Commands.has(command), `radar ${command} must be a V1 command`).toBe(true);
      expect(documented.has(command), `radar ${command} must exist in usage`).toBe(true);
    }
  });

  test("project instructions defer to Gentle AI and bound plan reading", () => {
    const text = readTemplate("project-agents.md");
    expect(text).toContain("Gentle AI wins");
    expect(text).toContain("### Reading the plan");
    expect(text).toContain("Never read `openspec/plan.yaml` whole");
  });

  test("global pointer is at most eight lines", () => {
    const text = readTemplate("global-pointer.md");
    expect(text.trimEnd().split("\n").length).toBeLessThanOrEqual(8);
  });
});
