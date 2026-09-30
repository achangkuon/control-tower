import { describe, expect, test, spyOn } from "bun:test";
import { createHash } from "node:crypto";
import { BUNDLE_MEMBERS, BUNDLE_SCHEMA } from "../bundle.mjs";
import { MAX_RELEASE_BYTES } from "../release.mjs";
import { bootstrapVerifiedRelease } from "../bootstrap.mjs";

const schema = "tower.v1.release/1";
const paths = [...BUNDLE_MEMBERS.map(({ source }) => source), ...[
  "adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli",
].map((name) => `product/tower/v1/${name}.mjs`)];
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

describe("bounded verified global release intake", () => {
  test("accepts exactly 30 canonical source-layout files independently of ordering", () => {
    expect(BUNDLE_MEMBERS.length).toBe(22);
    expect(new Set(paths).size).toBe(30);
    for (const members of [fixture().members, fixture().members.reverse()]) {
      const bytes = encode({ schema, members });
      const original = Buffer.from(bytes);
      const { run, calls } = intake(bytes);
      const result = run();
      expect(result.manifest.schema).toBe(schema);
      expect(result.manifest.members.map(({ path }) => path).sort()).toEqual([...paths].sort());
      expect(result.manifest.members.length).toBe(30);
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
