import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { instructionProblems } from "../release-build.mjs";

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
const problems = (rule, file = "") => instructionProblems({
  project: readTemplate("project-agents.md"), pointer: readTemplate("global-pointer.md"),
  bundleSource: readFileSync(new URL("../bundle.mjs", import.meta.url), "utf8"),
  radarSource: readFileSync(new URL("tools/radar/main.go", workflowsRoot), "utf8"),
}).filter(problem => problem.rule === rule && problem.message.includes(file));

describe("Control Tower V1 instruction templates", () => {
  for (const { file } of templates) {
    test(`${file} has exactly one bounded Control Tower block`, () => {
      expect(problems("markers", file)).toEqual([]);
    });

    test(`${file} has one version placeholder and no Gentle AI markers`, () => {
      expect(problems("version", file)).toEqual([]);
      expect(problems("forbidden", file).filter(({ message }) => message.includes("gentle-ai:"))).toEqual([]);
    });

    test(`${file} excludes obsolete machinery and personal context`, () => {
      expect(problems("forbidden", file)).toEqual([]);
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

  test("referenced skills belong to the shipped V1 roster and cover its stage entry points", () => {
    expect(problems("skills")).toEqual([]);
  });

  test("Radar references exist in shipped usage and switch and cover required commands", () => {
    expect(problems("radar")).toEqual([]);
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

describe("instruction gate review regressions", () => {
  const real = () => ({
    project: readTemplate("project-agents.md"), pointer: readTemplate("global-pointer.md"),
    bundleSource: readFileSync(new URL("../bundle.mjs", import.meta.url), "utf8"),
    radarSource: readFileSync(new URL("tools/radar/main.go", workflowsRoot), "utf8"),
  });

  test("a commented-out Radar case does not count as an implemented command", () => {
    const inputs = real();
    inputs.radarSource = inputs.radarSource.replace(/\n(\t*)case "zonas":/, "\n$1// case \"zonas\":");
    expect(inputs.radarSource).toContain('// case "zonas":');
    expect(instructionProblems(inputs).map(p => p.message))
      .toContain("radar zonas: no existe en el switch de Radar publicado (main.go).");
  });

  test("skills referenced in the global pointer are checked against the V1 roster", () => {
    const inputs = real();
    inputs.pointer = inputs.pointer.replace("Otherwise ignore", "Load `chanks-9-unpublished`. Otherwise ignore");
    expect(instructionProblems(inputs).map(p => p.message))
      .toContain("global-pointer.md: la skill chanks-9-unpublished no está en el roster V1 de bundle.mjs.");
  });
});
