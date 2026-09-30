import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { parseDocument } from "yaml";

const skillRoot = new URL("../skills/control-tower/", import.meta.url);
const skillsRoot = new URL("../skills/", import.meta.url);
const readSkill = (path) => readFileSync(new URL(path, skillRoot), "utf8");
const names = (url) => readdirSync(url, { withFileTypes: true })
  .map((entry) => ({ name: entry.name, kind: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other" }))
  .sort((a, b) => a.name.localeCompare(b.name));
const entry = () => readSkill("SKILL.md");

function frontmatter(markdown) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  expect(match, "frontmatter must open and close before the body").not.toBeNull();
  const document = parseDocument(match[1], { strict: true, uniqueKeys: true });
  expect(document.errors).toEqual([]);
  expect(document.warnings).toEqual([]);
  expect(document.toJS()).toEqual({
    name: "control-tower",
    description: expect.any(String),
  });
  expect(document.toJS().description.trim().length).toBeGreaterThan(0);
  return markdown.slice(match[0].length);
}

// Only positive obligations count; explanatory prohibitions must remain legal.
const obligation = /\b(?:must|needs?\s+to|requires?(?:\s+to)?|install|configure|enable|create|add|use|uses|load|route(?:s)?\s+(?:via|through)|write|ship|depends?\s+on)\b/gi;
const forbiddenTarget = /\b(?:runtime[- ](?:integrations?|rout(?:er|ing))|cross-host router|semaphore|Pi packages?|role profiles?|continuation|V2|stage UI|global config(?:uration)?|(?:managed\s+)?(?:instruction\s+)?blocks?\s+(?:in|to|for)\s+(?:AGENTS|CLAUDE)\.md|(?:AGENTS|CLAUDE)\.md\s+managed blocks?)\b/i;
const negativeCue = /\b(?:no|not|never|without|don't|does not|do not|must not|should not|except)\b/i;
function clauses(markdown) {
  return markdown.split(/(?:[.!?](?=\s|$)|[;:,\n–—])/)
    .flatMap((part) => part.split(/\b(?:and|but|then|yet|while|however)\b/i))
    .map((part) => part.trim()).filter(Boolean);
}
function prohibitedDependencies(markdown) {
  return clauses(markdown).filter((clause) =>
    [...clause.matchAll(obligation)].some((match) => {
      if (negativeCue.test(clause.slice(0, match.index))) return false;
      const object = clause.slice(match.index + match[0].length);
      const target = forbiddenTarget.exec(object);
      return target !== null && !negativeCue.test(object.slice(0, target.index));
    }));
}

function expectLazyRouting(body) {
  const section = body.split(/^## Lazy references\s*$/m)[1]?.split(/^## /m)[0];
  expect(section, "a bounded lazy references section is required").toBeDefined();
  const bullets = section.match(/^[-*] .+$/gm) ?? [];
  expect(bullets).toHaveLength(2);
  const adoption = bullets.find((line) => /\badoption intent\b/i.test(line));
  const authority = bullets.find((line) => /\bauthority or question intent\b/i.test(line));
  expect(adoption).toMatch(/\bload only\b.*\bwhen adoption is requested\b/i);
  expect(authority).toMatch(/\bload only\b.*\bwhen selection or a decision is needed\b/i);
  expect(adoption.match(/references\/[\w./-]+\.md/g)).toEqual(["references/adoption.md"]);
  expect(authority.match(/references\/[\w./-]+\.md/g)).toEqual(["references/authority-and-questions.md"]);
  expect(section).toMatch(/load each reference only for its matching intent/i);
  expect(section).toMatch(/never load both at startup/i);
}

// Contract tests for the public skill, not an installer or runtime router.
describe("public control-tower V1 skill", () => {
  test("has exactly one public skill surface and parseable, closed YAML frontmatter", () => {
    expect(names(skillsRoot)).toEqual([{ name: "control-tower", kind: "directory" }]);
    expect(names(skillRoot)).toEqual([
      { name: "references", kind: "directory" },
      { name: "SKILL.md", kind: "file" },
    ]);
    expect(frontmatter(entry()).trimStart()).toMatch(/^# Control Tower V1/m);
    expect(() => frontmatter("---\nname: control-tower\n# missing closing delimiter")).toThrow();
    expect(() => frontmatter("---\nname: control-tower\nname: duplicate\n---\n# Body")).toThrow();
  });

  test("has exactly two lazy links and exactly two reference files", () => {
    const body = frontmatter(entry());
    expect(body).toMatch(/(?:entry|activate|use).*control tower/i);
    const paths = body.match(/references\/[\w./-]+\.md/g) ?? [];
    expect(paths.sort()).toEqual([
      "references/adoption.md",
      "references/authority-and-questions.md",
    ]);
    expectLazyRouting(body);
    const swapped = body.replace(
      /For adoption intent, load only `references\/adoption\.md`/,
      "For adoption intent, load only `references/authority-and-questions.md`",
    ).replace(
      /For authority or question intent, load only `references\/authority-and-questions\.md`/,
      "For authority or question intent, load only `references/adoption.md`",
    );
    expect(() => expectLazyRouting(swapped)).toThrow();
    expect(names(new URL("references/", skillRoot))).toEqual([
      { name: "adoption.md", kind: "file" },
      { name: "authority-and-questions.md", kind: "file" },
    ]);
  });

  test("distinguishes ordinary questions from authorization to execute", () => {
    const authority = readSkill("references/authority-and-questions.md");
    for (const text of [entry(), authority]) {
      expect(text).toMatch(/ordinary questions?.*free text/is);
      expect(text).toMatch(/execut.*product work.*bounded.*human/is);
      expect(text).toMatch(/ODD.*default/is);
      expect(text).toMatch(/SDD.*explicit.*human/is);
    }
  });

  test("keeps adoption and in-session delegation native to each host", () => {
    const adoption = readSkill("references/adoption.md");
    expect(adoption).toMatch(/adopt/i);
    expect(entry()).toMatch(/Pi.*native subagent.*\.agents\/skills\/.*trusted projects/is);
    expect(entry()).toMatch(/Claude Code.*native subagent.*\.claude\/skills\/.*CLAUDE\.md/is);
    expect(adoption).toMatch(/\.agents\/skills\/.*trusted projects/is);
    expect(adoption).toMatch(/\.claude\/skills\/.*CLAUDE\.md/is);
  });

  test("does not introduce positive dependencies on excluded V1 machinery", () => {
    const docs = [entry(), readSkill("references/adoption.md"), readSkill("references/authority-and-questions.md")];
    expect(docs.flatMap(prohibitedDependencies)).toEqual([]);
    expect(prohibitedDependencies("Do not install a Pi package\nNever use runtime routing\nUse native subagents, not a semaphore\nWe do not need to use a Pi package")).toEqual([]);
    expect(prohibitedDependencies("Do not install a Pi package, and use global config"))
      .toEqual(["use global config"]);
    expect(prohibitedDependencies("Do not install a Pi package, then use global config"))
      .toEqual(["use global config"]);
    expect(prohibitedDependencies("Do not install a Pi package: use global config"))
      .toEqual(["use global config"]);
    for (const separator of [".", "!", "?", ";", ":", ",", "\n", "–", "—"]) {
      const text = `Do not install a Pi package${separator} use global config`;
      expect(prohibitedDependencies(text), text).toEqual(["use global config"]);
    }
    for (const transition of ["and", "but", "then", "yet", "while", "however"]) {
      for (const comma of ["", ","]) {
        const text = `Do not install a Pi package${comma} ${transition} use global config`;
        expect(prohibitedDependencies(text), text).toEqual(["use global config"]);
      }
    }
    for (const instruction of [
      "Install a Pi package", "Must use runtime routing", "Require runtime integrations",
      "Use a semaphore", "Add role profiles", "Enable continuation", "Ship V2",
      "Use stage UI", "Configure global configuration", "Use global config", "Write managed blocks in AGENTS.md",
      "Write managed blocks in CLAUDE.md", "The workflow requires a Pi package",
    ]) {
      expect(prohibitedDependencies(instruction), instruction).toEqual([instruction]);
    }
  });
});
