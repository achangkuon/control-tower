import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { acquireLatestRelease, acquireVerifiedRelease, MAX_RELEASE_BYTES } from "../release.mjs";

const bytes = Buffer.from([0, 255, 10, 31, 0x1f, 0x8b]);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const input = { repository: "example/control-tower", tag: "v1.2.3", asset: "tower-v1.tar.gz", sha256 };
const auth = ["auth", "status", "--active", "--hostname", "github.com"];
const download = ["release", "download", "v1.2.3", "--repo", "example/control-tower", "--pattern", "tower-v1.tar.gz", "--output", "-"];

function harness(responses = [{ status: 0, stdout: Buffer.from("private auth output") }, { status: 0, stdout: bytes }]) {
  const calls = [];
  const runner = (command, argv, options) => {
    calls.push({ command, argv, options });
    return responses[calls.length - 1];
  };
  return { calls, runner };
}

describe("latest private release", () => {
  function latest({ tag = "v2", checksum = `${sha256}  tower-v1.json\n`, missing = false, wire = bytes } = {}) {
    const calls = [];
    const runner = (command, argv) => {
      calls.push([command, argv]);
      if (argv[0] === "auth") return { status: 0, stdout: Buffer.alloc(0) };
      if (argv[1] === "view") return { status: 0, stdout: Buffer.from(JSON.stringify({ tagName: tag })) };
      if (argv.includes("tower-v1.json.sha256")) return { status: missing ? 1 : 0, stdout: Buffer.from(checksum) };
      return { status: 0, stdout: wire };
    };
    return { calls, runner };
  }
  test("equal tag authenticates and discovers without any download", () => {
    const h = latest();
    expect(acquireLatestRelease({ repository: input.repository, installedTag: "v2", runner: h.runner })).toEqual({ status: "up-to-date", tag: "v2" });
    expect(h.calls.map(([, args]) => args)).toEqual([auth, ["release", "view", "--repo", input.repository, "--json", "tagName"]]);
  });
  test("different tag downloads exact checksum and package and verifies raw bytes", () => {
    const h = latest();
    const result = acquireLatestRelease({ repository: input.repository, installedTag: "v1", runner: h.runner });
    expect(result).toEqual({ status: "available", tag: "v2", asset: "tower-v1.json", sha256, bytes });
    expect(h.calls.filter(([, args]) => args[1] === "download").map(([, args]) => args)).toEqual(
      ["tower-v1.json.sha256", "tower-v1.json"].map(asset => ["release", "download", "v2", "--repo", input.repository, "--pattern", asset, "--output", "-"]));
  });
  test("missing or malformed checksum refuses before package download", () => {
    for (const options of [{ missing: true }, ...["", `${sha256}  wrong.json\n`, `${sha256.toUpperCase()}  tower-v1.json\n`, `${"a".repeat(63)}  tower-v1.json\n`, `${sha256} tower-v1.json\n`, `${sha256}  tower-v1.json\nextra\n`].map(checksum => ({ checksum }))]) {
      const h = latest(options);
      expect(() => acquireLatestRelease({ repository: input.repository, runner: h.runner })).toThrow(/huella SHA-256/);
      expect(h.calls.some(([, args]) => args.includes("tower-v1.json"))).toBe(false);
    }
  });
  test("package mismatch and unsafe latest tags fail closed", () => {
    const h = latest({ wire: Buffer.from("tampered") });
    expect(() => acquireLatestRelease({ repository: input.repository, runner: h.runner })).toThrow(/SHA-256 mismatch/);
    for (const tag of ["latest", "LATEST", "-v2", "v..2", "v2.", "v/2", "v*", "v2\n", "v".repeat(129)]) {
      const bad = latest({ tag });
      expect(() => acquireLatestRelease({ repository: input.repository, runner: bad.runner })).toThrow(/etiqueta/);
      expect(bad.calls).toHaveLength(2);
    }
    const invalid = latest();
    expect(() => acquireLatestRelease({ repository: input.repository, installedTag: "latest", runner: invalid.runner })).toThrow();
    expect(invalid.calls).toEqual([]);
  });
});

describe("private GitHub Release acquisition", () => {
  test("authenticates first, downloads exactly one asset via argv and verifies raw bytes before return", () => {
    const { calls, runner } = harness();
    const result = acquireVerifiedRelease({ ...input, runner });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result).toEqual(bytes);
    expect(calls.map(({ command, argv }) => [command, argv])).toEqual([["gh", auth], ["gh", download]]);
    expect(calls.every(({ options }) => options.maxBuffer === MAX_RELEASE_BYTES + 1)).toBe(true);
    expect(calls[0].argv).not.toContain("--show-token");
  });

  test("a mismatched digest rejects before bytes are returned, with no retry or fallback", () => {
    const { calls, runner } = harness();
    expect(() => acquireVerifiedRelease({ ...input, sha256: "0".repeat(64), runner })).toThrow(/SHA-256 mismatch/);
    expect(calls.map(({ argv }) => argv)).toEqual([auth, download]);
  });

  test("invalid options fail before auth or download", () => {
    const { calls, runner } = harness();
    const bad = [undefined, null, [], "bad", {}, { ...input, extra: true },
      ...[undefined, null, "", "owner", "-owner/repo", "owner/-repo", "owner/repo/extra", "owner/repo\nother", "owner/repo\0x", "a".repeat(102) + "/repo", 12].map((repository) => ({ ...input, repository })),
      ...[undefined, null, "", "latest", "LATEST", "-v1", "v*", "v?", "v[1]", "v/../x", "v1\n--help", "v1\0", "v".repeat(129), 1].map((tag) => ({ ...input, tag })),
      ...[undefined, null, "", "-output", "../asset", "asset*", "asset?", "asset[1]", "asset\\name", "asset\n--help", "asset\0", "install.sh", "setup.sh", "a".repeat(257), 2].map((asset) => ({ ...input, asset })),
      ...[undefined, null, "", sha256.toUpperCase(), "0".repeat(63), "0".repeat(65), "z".repeat(64), "0".repeat(32) + "\n" + "0".repeat(31), 3].map((sha256) => ({ ...input, sha256 })),
      { ...input, runner: "gh" }];
    for (const options of bad) {
      const candidate = options && typeof options === "object" && !Array.isArray(options)
        ? { ...options, runner: Object.hasOwn(options, "runner") ? options.runner : runner }
        : options;
      expect(() => acquireVerifiedRelease(candidate)).toThrow();
    }
    const hidden = { ...input, runner };
    Object.defineProperty(hidden, "extra", { value: true });
    expect(() => acquireVerifiedRelease(hidden)).toThrow();
    const accessor = { ...input, runner };
    Object.defineProperty(accessor, "tag", { get: () => { throw new Error("getter invoked"); } });
    expect(() => acquireVerifiedRelease(accessor)).toThrow(/Invalid GitHub Release acquisition options/);
    expect(calls).toEqual([]);
  });

  test("auth failure never downloads and does not leak auth output or thrown secrets", () => {
    for (const first of [
      { status: 1, stdout: Buffer.from("SECRET_AUTH_OUTPUT"), stderr: Buffer.from("SECRET_AUTH_STDERR") },
      { status: 0, stdout: "wrong type" },
      { status: 0, stdout: Buffer.alloc(MAX_RELEASE_BYTES + 1) },
      () => { throw new Error("SECRET_AUTH_EXCEPTION"); },
    ]) {
      const calls = [];
      const runner = (...args) => { calls.push(args); return typeof first === "function" ? first() : first; };
      let error;
      try { acquireVerifiedRelease({ ...input, runner }); } catch (caught) { error = caught; }
      expect(error).toBeInstanceOf(Error);
      expect(error.message).not.toContain("SECRET_AUTH");
      expect(calls.length).toBe(1);
    }
  });

  test("download failures, nonbinary output, empty and oversized bytes reject without returning data", () => {
    for (const second of [
      { status: 1, stdout: bytes, stderr: Buffer.from("SECRET_DOWNLOAD_STDERR") },
      { status: 0, stdout: "text" },
      { status: 0, stdout: Buffer.alloc(0) },
      { status: 0, stdout: Buffer.alloc(MAX_RELEASE_BYTES + 1) },
      () => { throw new Error("SECRET_DOWNLOAD_EXCEPTION"); },
    ]) {
      const { calls, runner: first } = harness();
      const runner = (...args) => calls.length === 0 ? first(...args) : (calls.push(args), typeof second === "function" ? second() : second);
      let error;
      try { acquireVerifiedRelease({ ...input, runner }); } catch (caught) { error = caught; }
      expect(error).toBeInstanceOf(Error);
      expect(error.message).not.toContain("SECRET_DOWNLOAD");
      expect(calls.length).toBe(2);
    }
  });
});
