import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { BUNDLE_MEMBERS, BUNDLE_SCHEMA, validateBundle, validateDestination } from "../bundle.mjs";

const radar = "agent-workflows/tools/radar/";
const skill = "product/tower/v1/skills/control-tower/";
const go = ["archivar", "avance", "check", "encargo", "etapa", "faltan", "git", "ledger", "main", "partition", "plan", "render", "roadmap", "safety", "sesion", "snapshot", "state"];
const radarNames = ["go.mod", "go.sum", ...go.map((name) => `${name}.go`)];
const skillNames = ["SKILL.md", "references/adoption.md", "references/authority-and-questions.md"];
const expected = [...radarNames.map((name) => [radar + name, "radar/" + name]),
  ...skillNames.map((name) => [skill + name, "skills/control-tower/" + name])];

function put(root, path, content = path) {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}
function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), "tower-bundle-"));
  const sources = join(root, "sources");
  const destination = join(root, "destination");
  try {
    for (const [source, target] of expected) {
      put(sources, source, `source:${source}\0`);
      put(destination, target, `source:${source}\0`);
    }
    return fn({ root, sources, destination });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const changed = (members, index, patch) => members.map((member, i) => i === index ? { ...member, ...patch } : member);

describe("project-local Tower V1 bundle", () => {
  test("one versioned positive membership source yields exact, immutable, in-memory bytes", () => fixture(({ sources }) => {
    expect(BUNDLE_SCHEMA).toBe("tower.v1.bundle/1");
    expect(BUNDLE_MEMBERS.map(({ source, destination }) => [source, destination])).toEqual(expected);
    expect(new Set(BUNDLE_MEMBERS.map((member) => member.destination)).size).toBe(22);
    const result = validateBundle(sources);
    expect(result.schema).toBe(BUNDLE_SCHEMA);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.members)).toBe(true);
    for (const [i, member] of result.members.entries()) {
      const bytes = readFileSync(join(sources, member.source));
      expect(Object.isFrozen(member)).toBe(true);
      expect([member.source, member.destination]).toEqual(expected[i]);
      expect(member.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
      expect(member.bytes).toBe(bytes.toString("base64"));
      expect(member.encoding).toBe("base64");
      expect(member.byteLength).toBe(bytes.length);
    }
    expect(() => { result.members[0].destination = "other"; }).toThrow();
    expect(() => { result.members.push({}); }).toThrow();
  }));

  test("ignores excluded Radar artifacts but rejects new, missing or unexpected production members", () => fixture(({ sources }) => {
    for (const name of ["README.md", "borrador-control-tower.yaml", "radar", "extra_test.go"]) put(sources, radar + name);
    put(sources, radar + "testdata/sample.txt");
    expect(() => validateBundle(sources)).not.toThrow();
    put(sources, radar + "new.go");
    expect(() => validateBundle(sources)).toThrow();
  }));

  test("missing production Radar and skill files fail independently", () => {
    for (const path of [radar + "go.sum", radar + "main.go", skill + "references/adoption.md"]) {
      fixture(({ sources }) => {
        rmSync(join(sources, path));
        expect(() => validateBundle(sources)).toThrow();
      });
    }
  });

  test("skill surface is closed to extra files, directories and unexpected filesystem types", () => {
    for (const path of [skill + "extra.md", skill + "references/extra.md", skill + "new/nested.md"]) {
      fixture(({ sources }) => {
        put(sources, path);
        expect(() => validateBundle(sources)).toThrow();
      });
    }
  });

  test("rejects symlinked source root, ancestor, member, and non-regular member", () => {
    fixture(({ root, sources }) => {
      const link = join(root, "link");
      symlinkSync(sources, link, "dir");
      expect(() => validateBundle(link)).toThrow();
    });
    fixture(({ root, sources }) => {
      const nested = join(root, "nested");
      mkdirSync(nested);
      symlinkSync(sources, join(nested, "source-link"), "dir");
      expect(() => validateBundle(join(nested, "source-link"))).toThrow();
      rmSync(join(sources, radar + "main.go"));
      symlinkSync(join(sources, radar + "plan.go"), join(sources, radar + "main.go"));
      expect(() => validateBundle(sources)).toThrow();
    });
    fixture(({ sources }) => {
      const path = join(sources, "agent-workflows/tools");
      const replacement = join(sources, "real-tools");
      // Rename only inside this isolated fixture, then put a link at the canonical ancestor.
      renameSync(path, replacement);
      symlinkSync(replacement, path, "dir");
      expect(() => validateBundle(sources)).toThrow();
    });
    fixture(({ sources }) => {
      rmSync(join(sources, skill + "SKILL.md"));
      mkdirSync(join(sources, skill + "SKILL.md"));
      expect(() => validateBundle(sources)).toThrow();
    });
  });

  test("rejects schema drift, malformed, absolute, escaping and duplicate paths", () => fixture(({ sources, destination }) => {
    const baseline = validateBundle(sources);
    const bad = (members, schema = BUNDLE_SCHEMA) =>
      expect(() => validateDestination(destination, { ...baseline, schema, members })).toThrow();
    bad(baseline.members, "tower.v1.bundle/2");
    expect(() => validateDestination(destination, { ...baseline, unexpected: true })).toThrow();
    bad(changed(baseline.members, 0, { unexpected: true }));
    for (const path of ["/absolute", "../escape", "radar/../escape", "radar//main.go", "radar\\main.go", "./radar/main.go", ""]) {
      bad(changed(baseline.members, 0, { source: path }));
      bad(changed(baseline.members, 0, { destination: path }));
    }
    bad(changed(baseline.members, 1, { source: baseline.members[0].source }));
    bad(changed(baseline.members, 1, { destination: baseline.members[0].destination }));
    bad(changed(baseline.members, 0, { destination: "skills/control-tower/go.mod" }));
    bad(changed(baseline.members, 0, { sha256: "0".repeat(64) }));
    bad(changed(baseline.members, 0, { bytes: "YmFk" }));
    bad(baseline.members.slice(1));
    bad([...baseline.members, baseline.members[0]]);
  }));

  for (const [level, extra] of [
    ["root", "unexpected.txt"],
    ["radar", "radar/extra.go"],
    ["skills", "skills/other-skill/SKILL.md"],
    ["control-tower", "skills/control-tower/extra.md"],
    ["references", "skills/control-tower/references/extra.md"],
  ]) {
    test(`destination rejects an extra at ${level}`, () => fixture(({ sources, destination }) => {
      put(destination, extra);
      expect(() => validateDestination(destination, validateBundle(sources))).toThrow();
    }));
  }

  test("destination rejects an extra symlink", () => fixture(({ sources, destination }) => {
    symlinkSync(join(destination, "radar/main.go"), join(destination, "radar/alias.go"));
    expect(() => validateDestination(destination, validateBundle(sources))).toThrow();
  }));

  test("destination validation checks actual bytes and claimed digest, without writing", () => fixture(({ sources, destination, root }) => {
    const snapshot = () => readdirSync(root, { recursive: true }).sort();
    const before = snapshot();
    const result = validateBundle(sources);
    expect(validateDestination(destination, result)).toBe(true);
    expect(snapshot()).toEqual(before);
    expect(existsSync(join(root, "installed"))).toBe(false);
    put(destination, "radar/main.go", "divergent");
    expect(() => validateDestination(destination, result)).toThrow();
    put(destination, "radar/main.go", Buffer.from(result.members.find((m) => m.destination === "radar/main.go").bytes, "base64"));
    const tampered = result.members.map((member, i) => i === 0 ? { ...member, sha256: "0".repeat(64) } : member);
    expect(() => validateDestination(destination, { ...result, members: tampered })).toThrow();
    rmSync(join(destination, "radar/go.sum"));
    expect(() => validateDestination(destination, result)).toThrow();
    put(destination, "radar/go.sum", Buffer.from(result.members.find((m) => m.destination === "radar/go.sum").bytes, "base64"));
    rmSync(join(destination, "skills/control-tower/SKILL.md"));
    symlinkSync(join(destination, "skills/control-tower/references/adoption.md"), join(destination, "skills/control-tower/SKILL.md"));
    expect(() => validateDestination(destination, result)).toThrow();
  }));
});
