import { describe, expect, test, spyOn } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { BUNDLE_MEMBERS, BUNDLE_SCHEMA } from "../bundle.mjs";
import { MAX_RELEASE_BYTES } from "../release.mjs";
import { bootstrapVerifiedRelease, bootstrapCachedRelease, ABSOLUTE_MEMBER_LIMIT } from "../bootstrap.mjs";

const schema = "tower.v1.release/1";
const paths = [...BUNDLE_MEMBERS.map(({ source }) => source), ...[
  "adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli", "runtime-config", "release-build",
].map((name) => `product/tower/v1/${name}.mjs`)];
// Exact source-layout roster shared by published v1.0.0, v1.0.1, v1.0.2 and v1.1.0.
// Independent of bootstrap's allowlist so a future roster change cannot change this fixture.
const publishedPaths = [
  "agent-workflows/tools/radar/archivar.go",
  "agent-workflows/tools/radar/avance.go",
  "agent-workflows/tools/radar/check.go",
  "agent-workflows/tools/radar/encargo.go",
  "agent-workflows/tools/radar/etapa.go",
  "agent-workflows/tools/radar/faltan.go",
  "agent-workflows/tools/radar/git.go",
  "agent-workflows/tools/radar/go.mod",
  "agent-workflows/tools/radar/go.sum",
  "agent-workflows/tools/radar/ledger.go",
  "agent-workflows/tools/radar/main.go",
  "agent-workflows/tools/radar/partition.go",
  "agent-workflows/tools/radar/plan.go",
  "agent-workflows/tools/radar/render.go",
  "agent-workflows/tools/radar/roadmap.go",
  "agent-workflows/tools/radar/safety.go",
  "agent-workflows/tools/radar/sesion.go",
  "agent-workflows/tools/radar/snapshot.go",
  "agent-workflows/tools/radar/state.go",
  "product/tower/v1/adoption.mjs",
  "product/tower/v1/bootstrap.mjs",
  "product/tower/v1/bundle.mjs",
  "product/tower/v1/cli.mjs",
  "product/tower/v1/global.mjs",
  "product/tower/v1/project-files.mjs",
  "product/tower/v1/projects.mjs",
  "product/tower/v1/release.mjs",
  "product/tower/v1/skills/control-tower/SKILL.md",
  "product/tower/v1/skills/control-tower/references/adoption.md",
  "product/tower/v1/skills/control-tower/references/authority-and-questions.md",
];
const memberLimit = 1024 * 1024;
const aggregateLimit = 8 * memberLimit;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const encode = (value) => Buffer.from(JSON.stringify(value));

function member(path, bytes = Buffer.from([0, 255, 1, 2])) {
  return { path, type: "file", encoding: "base64", byteLength: bytes.length,
    sha256: digest(bytes), bytes: bytes.toString("base64") };
}

// All contents, including future installer modules, are opaque synthetic bytes.
function fixture() {
  return { schema, members: paths.map((path) => member(path)) };
}

function intake(bytes, overrides = {}) {
  const calls = [];
  const options = { repository: "example/control-tower", tag: "v1.2.3", asset: "tower-v1.json",
    sha256: digest(bytes), runner: (command, argv, settings) => {
      calls.push({ command, argv, settings });
      return { status: 0, stdout: calls.length === 1 ? Buffer.alloc(0) : bytes };
    }, ...overrides };
  return { run: () => bootstrapVerifiedRelease(options), calls };
}

function rejects(value, pattern = /release/i) {
  const { run, calls } = intake(Buffer.isBuffer(value) ? value : encode(value));
  expect(run).toThrow(pattern);
  expect(calls.length).toBe(2);
}

test("intake admits a member count above the running roster and still rejects a runaway count", () => {
  // The running roster is 93; a 94th canonical member is a newer, larger published roster.
  // The absolute parse bound must not be derived from the running CLI's own roster.
  const grown = [...paths, "agent-workflows/skills/chanks-9-nueva/SKILL.md"];
  expect(intake(encode({ schema, members: grown.map((path) => member(path)) })).run().manifest.members).toHaveLength(94);
  // At the documented absolute cap the envelope is still parsed and admitted...
  const atCap = [...paths, ...Array.from({ length: ABSOLUTE_MEMBER_LIMIT - paths.length }, (_, index) => `product/tower/v1/gen/${index}.mjs`)];
  expect(atCap).toHaveLength(ABSOLUTE_MEMBER_LIMIT);
  expect(intake(encode({ schema, members: atCap.map((path) => member(path)) })).run().manifest.members).toHaveLength(ABSOLUTE_MEMBER_LIMIT);
  // ...and one object beyond it is refused before JSON.parse allocates the structure.
  const beyond = [...atCap, "product/tower/v1/gen/overflow.mjs"];
  expect(beyond).toHaveLength(ABSOLUTE_MEMBER_LIMIT + 1);
  rejects({ schema, members: beyond.map((path) => member(path)) });
});

test("a roster-91 CLI installs a published 93-member envelope (issue #156 bridge)", () => {
  const bootstrapPath = resolve(import.meta.dir, "../bootstrap.mjs");
  const bundlePath = resolve(import.meta.dir, "../bundle.mjs");
  // v1.2.5's 81 shipped files preceded the two chanks-0-comunicacion-agentes members.
  const retired = new Set(["agent-workflows/skills/chanks-0-comunicacion-agentes/SKILL.md",
    "agent-workflows/skills/chanks-0-comunicacion-agentes/references/casos-herdr.md"]);
  const running91 = BUNDLE_MEMBERS.filter(({ source }) => !retired.has(source));
  expect(running91).toHaveLength(81); // + ten engine modules = the 91-path running roster
  const envelope = encode({ schema, members: paths.map((path) => member(path)) });
  const script = `
    import { mock } from "bun:test";
    import { createHash } from "node:crypto";
    const bundle = await import(${JSON.stringify(bundlePath)});
    mock.module(${JSON.stringify(bundlePath)}, () => ({ ...bundle, BUNDLE_MEMBERS: ${JSON.stringify(running91)} }));
    const { bootstrapVerifiedRelease } = await import(${JSON.stringify(bootstrapPath)});
    const bytes = Buffer.from(${JSON.stringify(envelope.toString("base64"))}, "base64");
    const result = bootstrapVerifiedRelease({ repository: "example/control-tower", tag: "v1.3.0",
      asset: "tower-v1.json", sha256: createHash("sha256").update(bytes).digest("hex"),
      runner: (_command, argv) => ({ status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : bytes }) });
    process.stdout.write(String(result.manifest.members.length));
  `;
  const run = spawnSync(process.execPath, ["-e", script], { encoding: "utf8" });
  expect(run.stderr).toBe("");
  expect(run.status).toBe(0);
  expect(run.stdout).toBe("93");
});

test("cached S194/S195 releases are admitted by pinned digest; intake still requires the running roster", () => {
  const preVendor = fixture().members.filter(m => !m.path.startsWith("agent-workflows/tools/radar/vendor/"));
  for (const count of [74, 76]) {
    const old = { schema, members: count === 76 ? preVendor : preVendor.filter(m => !["product/tower/v1/runtime-config.mjs", "product/tower/v1/release-build.mjs"].includes(m.path)) };
    const bytes = encode(old), options = { repository: "example/control-tower", tag: `v1-cache-${count}`, asset: "tower-v1.json", sha256: digest(bytes), runner: (_command, argv) => ({ status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : bytes }) };
    expect(bootstrapCachedRelease(options).manifest.members.length).toBe(count);
    expect(() => bootstrapVerifiedRelease(options)).toThrow(/membership/);
    expect(() => bootstrapCachedRelease({ ...options, sha256: "0".repeat(64) })).toThrow(/SHA-256/);
    // A cache is admitted by its own verified pinned digest, so a historical roster
    // (and an absent member) is still self-consistent. Digest integrity stays strict.
    old.members.pop(); const missing = encode(old);
    expect(bootstrapCachedRelease({ ...options, sha256: digest(missing), runner: (_command, argv) => ({ status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : missing }) }).manifest.members.length).toBe(count - 1);
  }
  // A 91-member mixed-generation cache (93 minus two engine modules) matches no named
  // roster; it must still be admitted by digest instead of failing inspect.
  const hybrid = fixture(); hybrid.members = hybrid.members.filter(m => !["product/tower/v1/runtime-config.mjs", "product/tower/v1/release-build.mjs"].includes(m.path));
  const bytes = encode(hybrid);
  expect(bootstrapCachedRelease({ repository: "example/control-tower", tag: "v1", asset: "tower-v1.json", sha256: digest(bytes), runner: (_command, argv) => ({ status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : bytes }) }).manifest.members.length).toBe(91);
});

test("published 30-member receipts stay cached-only and are admitted by digest and structure", () => {
  const cached = (value, overrides = {}) => {
    const bytes = encode(value);
    return { repository: "example/control-tower", tag: "v1.1.0", asset: "tower-v1.json",
      sha256: digest(bytes), runner: (_command, argv) => ({ status: 0,
        stdout: argv[0] === "auth" ? Buffer.alloc(0) : bytes }), ...overrides };
  };
  const published = () => ({ schema, members: publishedPaths.map(path => member(path)) });
  for (const reverse of [false, true]) {
    const old = published(); if (reverse) old.members.reverse();
    expect(bootstrapCachedRelease(cached(old)).manifest.members.map(m => m.path).sort()).toEqual(publishedPaths);
    expect(() => bootstrapVerifiedRelease(cached(old))).toThrow(/membership/);
    expect(() => bootstrapCachedRelease(cached(old, { sha256: "0".repeat(64) }))).toThrow(/SHA-256/);
  }
  for (const change of [
    old => { old.schema = "unknown"; },
    old => { old.members.push(member("extra.mjs")); },
    old => { old.members[0].path = old.members[1].path; },
    old => { old.members[0].path = "../archivar.go"; },
    old => { old.members[0].type = "symlink"; },
    old => { old.members[0].sha256 = "0".repeat(64); },
  ]) {
    const old = published(); change(old);
    expect(() => bootstrapCachedRelease(cached(old))).toThrow(/release/i);
  }
  // A truncated historical cache is still admitted by its own pinned digest.
  const truncated = published(); truncated.members.pop();
  expect(bootstrapCachedRelease(cached(truncated)).manifest.members).toHaveLength(publishedPaths.length - 1);
});

describe("bounded verified global release intake", () => {
  test("accepts exactly 91 canonical source-layout files independently of ordering", () => {
    expect(BUNDLE_MEMBERS.length).toBe(83);
    expect(new Set(paths).size).toBe(93);
    for (const members of [fixture().members, fixture().members.reverse()]) {
      const bytes = encode({ schema, members });
      const original = Buffer.from(bytes);
      const { run, calls } = intake(bytes);
      const result = run();
      expect(result.manifest.schema).toBe(schema);
      expect(result.manifest.members.map(({ path }) => path).sort()).toEqual([...paths].sort());
      expect(result.manifest.members.length).toBe(93);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.manifest.members)).toBe(true);
      for (const entry of result.manifest.members) {
        expect(Object.isFrozen(entry)).toBe(true);
        expect(entry.type).toBe("file");
        expect(Buffer.isBuffer(entry.bytes)).toBe(true);
        expect(entry.bytes).toEqual(Buffer.from([0, 255, 1, 2]));
        expect(entry.byteLength).toBe(4);
        expect(entry.sha256).toBe(digest(entry.bytes));
      }
      expect(result.bytes).toEqual(original);
      expect(calls.map(({ command }) => command)).toEqual(["gh", "gh"]);
      expect(calls[0].argv).toEqual(["auth", "status", "--active", "--hostname", "github.com"]);
      expect(calls[1].argv).toEqual(["release", "download", "v1.2.3", "--repo",
        "example/control-tower", "--pattern", "tower-v1.json", "--output", "-"]);
      expect(calls.every(({ settings }) => settings.maxBuffer === MAX_RELEASE_BYTES + 1)).toBe(true);
      bytes.fill(0);
      expect(result.bytes).toEqual(original);
      result.bytes.fill(1);
      expect(result.manifest.members[0].bytes).toEqual(Buffer.from([0, 255, 1, 2]));
      result.manifest.members[0].bytes.fill(2); // Buffers are caller-owned, not immutable.
      expect(result.manifest.members[1].bytes).toEqual(Buffer.from([0, 255, 1, 2]));
      expect(run).toThrow(/SHA-256 mismatch/);
    }
  });

  test("vendor membership rejects missing and substituted vendor files before use", () => {
    const vendor = fixture().members.filter(m => m.path.startsWith("agent-workflows/tools/radar/vendor/"));
    expect(vendor).toHaveLength(17);
    for (const member of vendor) {
      const missing = fixture(); missing.members = missing.members.filter(m => m.path !== member.path); rejects(missing);
      const changed = fixture(); changed.members.find(m => m.path === member.path).path += ".extra"; rejects(changed);
    }
    // A new canonical member is a legitimate newer roster and is admitted by digest;
    // the build-side gate ("committed vendor drift ...") still forbids vendor growth.
    const extra = fixture(); extra.members.push(member("agent-workflows/tools/radar/vendor/extra.go"));
    expect(intake(encode(extra)).run().manifest.members).toHaveLength(94);
  });

  test("requires global skills, templates and signature sources but rejects the personal Notion map", () => {
    const required = ["agent-workflows/skills/chanks-4-puente/scripts/prepare_new_change.py",
      "agent-workflows/skills/_shared/plan-naming-convention.md",
      "product/tower/v1/instructions/project-agents.md", "product/tower/v1/instructions/global-pointer.md",
      "agent-workflows/chanks/torre-firma.mjs", "agent-workflows/tools/hooks/chanks-etapa.sh",
      "agent-workflows/tools/hooks/torre-firma.sh"];
    for (const path of required) {
      expect(paths).toContain(path);
      const value = fixture();
      value.members = value.members.filter(entry => entry.path !== path);
      rejects(value);
    }
    const excluded = "agent-workflows/skills/chanks-5-session-doc/assets/project-notion-map.json";
    expect(paths).not.toContain(excluded);
    const value = fixture();
    value.members[0] = member(excluded);
    rejects(value);
    const tampered = fixture();
    tampered.members.find(entry => entry.path === required[0]).sha256 = "0".repeat(64);
    rejects(tampered, /SHA-256/);
  });

  test("rejects outer digest mismatch before UTF8 decoding or JSON parsing", () => {
    const { run } = intake(Buffer.from([255, 0, 123]), { sha256: "0".repeat(64) });
    const decode = spyOn(TextDecoder.prototype, "decode");
    const parse = spyOn(JSON, "parse");
    try {
      expect(run).toThrow(/SHA-256 mismatch/);
      expect(decode).not.toHaveBeenCalled();
      expect(parse).not.toHaveBeenCalled();
    } finally {
      decode.mockRestore();
      parse.mockRestore();
    }
  });

  test("preserves acquisition failures with no fallback or host-state mutation", () => {
    const state = [process.cwd(), process.env.HOME, process.env.XDG_DATA_HOME, process.env.XDG_CONFIG_HOME];
    for (const failAt of [1, 2]) {
      const calls = [];
      const { run } = intake(encode(fixture()), { runner: (...args) => {
        calls.push(args);
        return { status: calls.length === failAt ? 1 : 0, stdout: Buffer.alloc(0) };
      } });
      expect(run).toThrow(/GitHub Release command failed/);
      expect(calls.length).toBe(failAt);
    }
    expect([process.cwd(), process.env.HOME, process.env.XDG_DATA_HOME, process.env.XDG_CONFIG_HOME]).toEqual(state);
  });

  test("rejects local bundles, wrong envelopes and missing/extra/duplicate membership", () => {
    for (const value of [null, [], true, {}, { ...fixture(), schema: BUNDLE_SCHEMA },
      { ...fixture(), extra: true }, { members: fixture().members }, { schema },
      { schema, members: null }, { schema, members: fixture().members.slice(1) },
      { schema, members: [...fixture().members, member("extra.mjs")] },
      { schema, members: [fixture().members[1], ...fixture().members.slice(1)] }]) rejects(value);
  });

  test("rejects noncanonical paths, destinations, unsupported types and symlink metadata", () => {
    for (const path of [null, 4, "", "../x", "/etc/file", "C:/file", "a\\b", "a\0b", "a//b",
      "./" + paths[0], paths[0] + "/", "a/../" + paths[0], BUNDLE_MEMBERS[0].destination]) {
      const value = fixture();
      value.members[0].path = path;
      rejects(value);
    }
    for (const changes of [{ type: "symlink" }, { type: "directory" }, { type: null },
      { type: "hardlink" }, { linkTarget: paths[1] }, { mode: 0o777 },
      { destination: "radar/go.mod" }, { source: paths[0] }]) {
      const value = fixture();
      Object.assign(value.members[0], changes);
      rejects(value);
    }
  });

  test("requires exact member fields and strict scalar length, encoding and digest types", () => {
    for (const key of Object.keys(member(paths[0]))) {
      const value = fixture();
      delete value.members[0][key];
      rejects(value);
    }
    for (const changes of [{ byteLength: -1 }, { byteLength: 1.5 }, { byteLength: "4" },
      { byteLength: null }, { byteLength: Number.MAX_SAFE_INTEGER + 1 }, { byteLength: 3 },
      { encoding: "utf8" }, { encoding: null }, { bytes: null }, { bytes: [] },
      { bytes: "AP8BAg" }, { bytes: "AP8BAg==\n" }, { bytes: "AP8BAh==" },
      { bytes: "____" }, { bytes: "%%%%" }, { sha256: 0 }, { sha256: null },
      { sha256: "0".repeat(64) }, { sha256: "F".repeat(64) }, { sha256: "0".repeat(63) }]) {
      const value = fixture();
      Object.assign(value.members[0], changes);
      rejects(value);
    }
    for (const invalid of [null, [], "member", 1]) {
      const value = fixture();
      value.members[0] = invalid;
      rejects(value);
    }
  });

  test("rejects duplicate JSON keys, malformed UTF8/JSON and deep or wide structures", () => {
    const text = JSON.stringify(fixture());
    for (const bytes of [Buffer.from([0xff]), Buffer.from([0xc0, 0xaf]),
      Buffer.from(text.replace('"schema":', '"schema":"ignored","schema":')),
      Buffer.from(text.replace('"path":', '"p\\u0061th":"ignored","path":')),
      Buffer.from(text.replace('"type":', '"type":"file","type":')),
      Buffer.from("{"), Buffer.from(text + " trailing"), Buffer.from(text.replace('"byteLength":4', '"byteLength":NaN')),
      Buffer.from("[".repeat(10000) + "0" + "]".repeat(10000)),
      Buffer.from('{"schema":"x","members":[' + '"",'.repeat(10000) + '""]}')]) rejects(bytes);
  });

  test("bounds wire, encoded, declared decoded, per-file and aggregate bytes before large decode", () => {
    rejects(Buffer.alloc(MAX_RELEASE_BYTES + 1), /GitHub Release command failed/);
    for (const changes of [{ byteLength: memberLimit + 1 },
      { bytes: "A".repeat(4 * Math.ceil(memberLimit / 3) + 4) },
      { byteLength: memberLimit, bytes: Buffer.alloc(memberLimit + 1).toString("base64") }]) {
      const value = fixture();
      Object.assign(value.members[0], changes);
      rejects(value, /size|length|limit/i);
    }
    const value = fixture();
    for (let index = 0; index < 9; index++) value.members[index] = member(paths[index], Buffer.alloc(memberLimit));
    const { run } = intake(encode(value));
    const decode = spyOn(Buffer, "from");
    try {
      expect(run).toThrow(/aggregate|limit/i);
      expect(decode.mock.calls.some(([, encoding]) => encoding === "base64")).toBe(false);
    } finally {
      decode.mockRestore();
    }
    // Boundary success: eight full members, all other members empty.
    value.members = paths.map((path, index) => member(path, Buffer.alloc(index < 8 ? memberLimit : 0)));
    const result = intake(encode(value)).run();
    expect(result.manifest.members.reduce((sum, entry) => sum + entry.byteLength, 0)).toBe(aggregateLimit);
    const wire = encode(fixture());
    const atLimit = Buffer.concat([wire, Buffer.alloc(MAX_RELEASE_BYTES - wire.length, 32)]);
    expect(intake(atLimit).run().bytes.length).toBe(MAX_RELEASE_BYTES);
  });
});
