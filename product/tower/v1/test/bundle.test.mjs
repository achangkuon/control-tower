import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, statSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { BUNDLE_MEMBERS, BUNDLE_SCHEMA, validateBundle, validateDestination } from "../bundle.mjs";

const radar = "agent-workflows/tools/radar/";
const copiloto = "agent-workflows/tools/copiloto/";
const piloto = "agent-workflows/tools/piloto/";
const skill = "product/tower/v1/skills/control-tower/";
const go = ["archivar", "avance", "check", "encargo", "etapa", "faltan", "git", "ledger", "main", "partition", "plan", "render", "roadmap", "safety", "sesion", "snapshot", "state"];
const vendorNames = [
  "vendor/modules.txt",
  ...["LICENSE", "NOTICE", "README.md", "apic.go", "decode.go", "emitterc.go", "encode.go", "parserc.go",
    "readerc.go", "resolve.go", "scannerc.go", "sorter.go", "writerc.go", "yaml.go", "yamlh.go", "yamlprivateh.go"]
    .map(name => `vendor/gopkg.in/yaml.v3/${name}`),
];
const radarNames = ["go.mod", "go.sum", ...go.map((name) => `${name}.go`), ...vendorNames];
// Copiloto has no dependencies and no vendor tree: only plain Go sources ship.
const copilotoNames = ["go.mod", "main.go", "foco.go", "tarjeta.go"];
// Piloto travels like copiloto: dependency-free Go sources, no vendor, tests never ship.
const pilotoNames = ["go.mod", "main.go", "aterrizaje.go", "marca.go", "revision.go", "vuelo.go", "worktree.go"];
const skillNames = ["SKILL.md", "references/adoption.md", "references/authority-and-questions.md"];
// Independent reviewed roster: deliberately not derived from production membership.
const workflowNames = [
  "_shared/plan-naming-convention.md",
  "analisis-por-tramos/SKILL.md",
  "analisis-por-tramos/references/estructura.md",
  "analisis-por-tramos/references/medios.md",
  "chanks-0-explicalo-simple/SKILL.md",
  "chanks-0-explicalo-simple/references/formato.md",
  "chanks-0-mensajes-visibles/SKILL.md",
  "chanks-0-session-context-loader/SKILL.md",
  "chanks-0-skill-composer/SKILL.md",
  "chanks-1-adopcion/SKILL.md",
  "chanks-1-adopcion/references/errores-conocidos.md",
  "chanks-1-autoridad/SKILL.md",
  "chanks-1-brain-dump/SKILL.md",
  "chanks-1-cierre-de-decisiones/SKILL.md",
  "chanks-1-cierre-de-decisiones/assets/resolution-entry.md",
  "chanks-1-cierre-de-decisiones/references/decision-extraction.md",
  "chanks-1-descubrimiento/SKILL.md",
  "chanks-1-feature/SKILL.md",
  "chanks-1-heredado/SKILL.md",
  "chanks-1-heredado/references/ubicacion-y-cruces.md",
  "chanks-1-prd/SKILL.md",
  "chanks-1-project-kickoff/SKILL.md",
  "chanks-1-requirements/SKILL.md",
  "chanks-1-rfc/SKILL.md",
  "chanks-1-terreno/SKILL.md",
  "chanks-2-planificador-granular/SKILL.md",
  "chanks-2-planificador-granular/references/juicio-de-ruta.md",
  "chanks-3-paralelo/SKILL.md",
  "chanks-4-puente/SKILL.md",
  "chanks-4-puente/references/review-recovery.md",
  "chanks-4-puente/references/session-readiness.md",
  "chanks-4-puente/scripts/prepare_new_change.py",
  "chanks-5-politica-de-entrega/SKILL.md",
  "chanks-5-session-doc/SKILL.md",
  "chanks-5-session-doc/assets/session-doc.schema.json",
  "chanks-5-session-doc/references/notion-closure.md",
  "skill-orchestrator/SKILL.md",
  "skill-orchestrator/references/ejemplar.md",
];
const workflows = "agent-workflows/skills/";
const excluded = workflows + "chanks-5-session-doc/assets/project-notion-map.json";
const expected = [...radarNames.map((name) => [radar + name, "radar/" + name]),
  ...copilotoNames.map((name) => [copiloto + name, "copiloto/" + name]),
  ...pilotoNames.map((name) => [piloto + name, "piloto/" + name]),
  ...skillNames.map((name) => [skill + name, "skills/control-tower/" + name]),
  ...workflowNames.map((name) => [workflows + name, "skills/" + name]),
  ...["global-pointer.md", "project-agents.md"].map((name) => ["product/tower/v1/instructions/" + name, "instructions/" + name]),
  ["agent-workflows/chanks/torre-firma.mjs", "signatures/torre-firma.mjs"],
  ...["chanks-etapa.sh", "torre-firma.sh"].map((name) => ["agent-workflows/tools/hooks/" + name, "signatures/" + name])];

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

(Bun.which("go") ? test : test.skip)("real bundled Radar compiles offline with empty module and build caches", () => {
  const root = mkdtempSync(join(tmpdir(), "tower-vendor-build-"));
  const cwd = join(root, "radar"), home = join(root, "home");
  const env = { PATH: process.env.PATH, HOME: home, TMPDIR: join(root, "tmp"),
    GOCACHE: join(root, "cache"), GOMODCACHE: join(root, "modules"), GOPATH: join(root, "gopath"),
    GOFLAGS: "-mod=vendor", GOPROXY: "off", GOSUMDB: "off", GOWORK: "off", GOENV: "off",
    GOTOOLCHAIN: "local", GOTELEMETRY: "off", CGO_ENABLED: "0" };
  try {
    for (const key of ["HOME", "TMPDIR", "GOCACHE", "GOMODCACHE", "GOPATH"]) mkdirSync(env[key]);
    expect(readdirSync(env.GOMODCACHE)).toEqual([]); expect(readdirSync(env.GOCACHE)).toEqual([]);
    for (const member of BUNDLE_MEMBERS.filter(m => m.destination.startsWith("radar/")))
      put(cwd, member.destination.slice(6), readFileSync(new URL(`../../../../${member.source}`, import.meta.url)));
    const binary = join(root, "radar-bin");
    const result = spawnSync("go", ["build", "-trimpath", "-ldflags", "-s -w -buildid=", "-o", binary, "."], { cwd, env, encoding: "utf8", timeout: 180_000, maxBuffer: 1024 * 1024 });
    expect(result.error).toBeUndefined(); expect(result.stderr).toBe(""); expect(result.status).toBe(0);
    expect(statSync(binary).size).toBeGreaterThan(0);
    expect(readdirSync(env.GOMODCACHE)).toEqual([]);
    expect(spawnSync(binary, ["help"], { cwd, env, timeout: 10_000, maxBuffer: 64 * 1024 }).status).toBe(0);
  } finally { rmSync(root, { recursive: true, force: true }); }
}, 180_000);

describe("closed Tower V1 release bundle", () => {
  test("reviewed workflow roster is sorted and the real checkout has no missing or unlisted files", () => {
    expect(workflowNames).toEqual([...workflowNames].sort());
    const result = validateBundle(new URL("../../../..", import.meta.url).pathname);
    expect(result.members.map(({ source, destination }) => [source, destination])).toEqual(expected);
    expect(result.members.some(({ source }) => source === excluded)).toBe(false);
    expect(result.members.every(({ byteLength }) => byteLength <= 1024 * 1024)).toBe(true);
    expect(result.members.reduce((sum, entry) => sum + entry.byteLength, 0)).toBeLessThan(8 * 1024 * 1024);
  });

  test("every vendored file is required and vendor membership is closed against additions and links", () => {
    for (const name of vendorNames) fixture(({ sources }) => {
      rmSync(join(sources, radar + name)); expect(() => validateBundle(sources)).toThrow();
    });
    for (const extra of ["vendor/extra.txt", "vendor/gopkg.in/other/file.go", "vendor/gopkg.in/yaml.v3/extra.go"]) fixture(({ sources }) => {
      put(sources, radar + extra); expect(() => validateBundle(sources)).toThrow();
    });
    fixture(({ sources }) => {
      const target = join(sources, radar + "vendor/gopkg.in/yaml.v3/yaml.go");
      rmSync(target); symlinkSync(join(sources, radar + "main.go"), target);
      expect(() => validateBundle(sources)).toThrow();
    });
    fixture(({ sources, destination }) => {
      const bundle = validateBundle(sources); put(destination, "radar/vendor/unlisted.go");
      expect(() => validateDestination(destination, bundle)).toThrow();
    });
  });

  test("every listed workflow file is required; every skill directory rejects unlisted files", () => {
    for (const name of workflowNames) fixture(({ sources }) => {
      rmSync(join(sources, workflows + name));
      expect(() => validateBundle(sources)).toThrow();
    });
    for (const name of new Set(workflowNames.filter(name => !name.startsWith("_shared/"))
      .map(name => name.split("/")[0]))) {
      for (const extra of ["unlisted.md", "new/nested.md", "references/unlisted.md"]) fixture(({ sources }) => {
        put(sources, `${workflows}${name}/${extra}`);
        expect(() => validateBundle(sources)).toThrow();
      });
    }
  });

  test("personal Notion map is optional, never bundled, and not an open-ended exclusion", () => fixture(({ sources }) => {
    put(sources, excluded, "not read or shipped");
    const result = validateBundle(sources);
    expect(result.members).toHaveLength(95);
    expect(result.members.some(({ source }) => source === excluded)).toBe(false);
    put(sources, workflows + "chanks-5-session-doc/assets/other.json");
    expect(() => validateBundle(sources)).toThrow();
  }));

  test("new workflow members reject symlinks and non-regular files", () => {
    for (const kind of ["link", "directory"]) fixture(({ sources }) => {
      const path = join(sources, workflows + "chanks-4-puente/scripts/prepare_new_change.py");
      rmSync(path);
      if (kind === "link") symlinkSync(join(sources, radar + "main.go"), path);
      else mkdirSync(path);
      expect(() => validateBundle(sources)).toThrow();
    });
  });
  test("one versioned positive membership source yields exact, immutable, in-memory bytes", () => fixture(({ sources }) => {
    expect(BUNDLE_SCHEMA).toBe("tower.v1.bundle/1");
    expect(BUNDLE_MEMBERS.map(({ source, destination }) => [source, destination])).toEqual(expected);
    expect(new Set(BUNDLE_MEMBERS.map((member) => member.destination)).size).toBe(95);
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

  test("copiloto Go sources ship without their tests and the source tree is closed to drift", () => {
    expect(copilotoNames).toEqual(["go.mod", "main.go", "foco.go", "tarjeta.go"]);
    const result = validateBundle(new URL("../../../..", import.meta.url).pathname);
    expect(result.members.filter(({ destination }) => destination.startsWith("copiloto/"))
      .map(({ source, destination }) => [source, destination]))
      .toEqual(copilotoNames.map((name) => [copiloto + name, "copiloto/" + name]));
    // The real source tree has tests beside the sources; they are never members.
    for (const name of ["foco_test.go", "main_test.go", "tarjeta_test.go"]) {
      expect(result.members.some(({ source }) => source === copiloto + name)).toBe(false);
    }
    for (const name of copilotoNames) fixture(({ sources }) => {
      rmSync(join(sources, copiloto + name));
      expect(() => validateBundle(sources)).toThrow();
    });
    for (const extra of ["extra.go", "vendor/modules.txt", "README.md"]) fixture(({ sources }) => {
      put(sources, copiloto + extra);
      expect(() => validateBundle(sources)).toThrow();
    });
    // Go tests may exist in the checkout but never enter the bundle.
    fixture(({ sources }) => {
      put(sources, copiloto + "foco_test.go");
      expect(() => validateBundle(sources)).not.toThrow();
    });
    fixture(({ sources }) => {
      const target = join(sources, copiloto + "tarjeta.go");
      rmSync(target); symlinkSync(join(sources, copiloto + "main.go"), target);
      expect(() => validateBundle(sources)).toThrow();
    });
    fixture(({ sources, destination }) => {
      put(destination, "copiloto/unlisted.go");
      expect(() => validateDestination(destination, validateBundle(sources))).toThrow();
    });
  });

  test("piloto Go sources ship without their tests and the source tree is closed to drift", () => {
    expect(pilotoNames).toEqual(["go.mod", "main.go", "aterrizaje.go", "marca.go", "revision.go", "vuelo.go", "worktree.go"]);
    const result = validateBundle(new URL("../../../..", import.meta.url).pathname);
    expect(result.members.filter(({ destination }) => destination.startsWith("piloto/"))
      .map(({ source, destination }) => [source, destination]))
      .toEqual(pilotoNames.map((name) => [piloto + name, "piloto/" + name]));
    // The real source tree has tests beside the sources; they are never members.
    for (const name of ["aterrizaje_test.go", "main_test.go", "marca_test.go", "revision_test.go", "vuelo_test.go", "worktree_test.go"]) {
      expect(result.members.some(({ source }) => source === piloto + name)).toBe(false);
    }
    for (const name of pilotoNames) fixture(({ sources }) => {
      rmSync(join(sources, piloto + name));
      expect(() => validateBundle(sources)).toThrow();
    });
    for (const extra of ["extra.go", "vendor/modules.txt", "README.md", "go.sum"]) fixture(({ sources }) => {
      put(sources, piloto + extra);
      expect(() => validateBundle(sources)).toThrow();
    });
    // Go tests may exist in the checkout but never enter the bundle.
    fixture(({ sources }) => {
      put(sources, piloto + "vuelo_test.go");
      expect(() => validateBundle(sources)).not.toThrow();
    });
    fixture(({ sources }) => {
      const target = join(sources, piloto + "worktree.go");
      rmSync(target); symlinkSync(join(sources, piloto + "main.go"), target);
      expect(() => validateBundle(sources)).toThrow();
    });
    fixture(({ sources, destination }) => {
      put(destination, "piloto/unlisted.go");
      expect(() => validateDestination(destination, validateBundle(sources))).toThrow();
    });
  });

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
