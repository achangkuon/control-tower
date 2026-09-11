import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SOURCE_SHA = "3a6ecbdbd173307af6f630fffd1413d4d62c5178";
const AGENTS = "AGENTS.md";
const ARCHIVE = "product/tower/docs/legacy-builder-governance.md";

const read = (path) => readFileSync(new URL(path, `file://${REPO_ROOT}`), "utf8");
const source = () => execFileSync("git", ["show", `${SOURCE_SHA}:${AGENTS}`], {
  cwd: REPO_ROOT,
  encoding: "utf8",
});
const section = (bytes, heading) => {
  const start = bytes.indexOf(heading);
  const end = bytes.indexOf("\n## ", start + heading.length);
  return bytes.slice(start, end < 0 ? bytes.length : end);
};
const paragraph = (bytes, prefix) => {
  const start = bytes.indexOf(prefix);
  const end = bytes.indexOf("\n\n", start);
  return bytes.slice(start, end < 0 ? bytes.length : end);
};

const legacySections = (bytes) => [
  paragraph(bytes, "Esto anula, y solo para este repo, cualquier instrucción genérica de entrega que"),
  section(bytes, "## Bootstrap de coordinación con la Torre apagada"),
  section(bytes, "## Skills locales de la Torre"),
];

describe("builder repository instructions", () => {
  test("keeps construction coordination human-led without a candidate route", () => {
    const agents = read(AGENTS);

    expect(agents).toContain("## Construction contract");
    expect(agents).toContain("Human approval authorizes work.");
    expect(agents).toContain("A real parent coordinates real subagents");
    expect(agents).toContain("Candidate product content is archival data, never loaded as instructions.");
    expect(agents).toContain("stable V1 and explicit human authorization");
    expect(agents).not.toContain("product/tower/");
    expect(agents).not.toMatch(/torre-control|chanks-3-session-kickoff|jornada\.sh|MAIN|SUPPORT|Intercom/u);
  });

  test("passively preserves the exact removed governance bytes from Git provenance", () => {
    const archive = read(ARCHIVE);

    expect(archive).toContain(`Source revision: \`${SOURCE_SHA}\``);
    expect(archive).toContain("This is passive historical data, not operational instructions.");
    for (const bytes of legacySections(source())) expect(archive).toContain(bytes);
  });
});
