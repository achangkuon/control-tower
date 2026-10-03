import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireLatestRelease, acquireVerifiedRelease, MAX_RELEASE_BYTES, updateTui } from "../release.mjs";

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

describe("S207 verified TUI refresh", () => {
  function fixture(run) {
    const home = mkdtempSync(join(tmpdir(), "tower-tui-refresh-"));
    try { return run(home); } finally { rmSync(home, { recursive: true, force: true }); }
  }
  function refresh(home, { platform = "linux", arch = "x64", wire = bytes, checksum,
    asset = `torre-tui-${platform}-${arch === "x64" ? "amd64" : arch}` } = {}) {
    const calls = [], warnings = [];
    const result = updateTui({ home, repository: input.repository, tag: input.tag, platform, arch,
      stderr: { write: text => warnings.push(text) }, runner: (command, argv, options) => {
        calls.push({ command, argv, options });
        expect(command).toBe("gh"); expect(argv.slice(0, 5)).toEqual(["release", "download", input.tag, "--repo", input.repository]);
        if (argv.includes(asset + ".sha256")) return { status: 0, stdout: checksum ?? Buffer.from(`${sha256}  ${asset}\n`) };
        return { status: 0, stdout: wire };
      } });
    return { result, calls, warnings };
  }
  for (const platform of ["linux", "darwin"]) for (const arch of ["x64", "arm64"]) {
    test(`${platform}/${arch} uses exact platform asset, bounded binary intake and an intact unchanged shortcut`, () => fixture(home => {
      const first = refresh(home, { platform, arch });
      expect(first.result).toBe("updated"); expect(first.warnings).toEqual([]);
      expect(first.calls.map(call => call.options.maxBuffer)).toEqual([1025, 64 * 1024 * 1024 + 1]);
      const current = join(home, ".local/share/torre-control/tui/current.json"), before = readFileSync(current);
      const record = JSON.parse(before);
      expect(record.platform).toBe(`${platform}-${arch === "x64" ? "amd64" : arch}`);
      const second = refresh(home, { platform, arch });
      expect(second.result).toBe("unchanged"); expect(second.calls).toHaveLength(1);
      expect(readFileSync(current)).toEqual(before);
    }));
  }
  test("unsupported platforms never acquire or create storage", () => fixture(home => {
    for (const options of [{ platform: "win32" }, { arch: "ia32" }]) {
      const h = refresh(home, options); expect(h.result).toBe("unavailable:platform"); expect(h.calls).toEqual([]);
    }
    expect(existsSync(join(home, ".local"))).toBe(false);
  }));
  test("strict checksum rejects alternate names, spacing, high-bit ASCII aliases and extra lines before binary intake", () => fixture(home => {
    const asset = "torre-tui-linux-amd64", good = Buffer.from(`${sha256}  ${asset}\n`), highBit = Buffer.from(good);
    highBit[0] |= 0x80;
    for (const checksum of [highBit, ...[`${sha256}  other\n`, `${sha256} ${asset}\n`, `${sha256.toUpperCase()}  ${asset}\n`, `${sha256}  ${asset}\nextra\n`].map(value => Buffer.from(value))]) {
      const h = refresh(home, { checksum }); expect(h.result).toBe("unavailable:checksum"); expect(h.calls).toHaveLength(1);
    }
    expect(existsSync(join(home, ".local"))).toBe(false);
  }));
  test("unsafe store, pointer, binary and version directory never follow links or replace the old pointer", () => {
    for (const scenario of ["store-link", "pointer-link", "binary-link", "directory-link", "binary-hardlink", "writable-pointer", "writable-store"]) fixture(home => {
      expect(refresh(home).result).toBe("updated");
      const store = join(home, ".local/share/torre-control/tui"), current = join(store, "current.json"), previous = readFileSync(current);
      const record = JSON.parse(previous), foreign = join(home, "foreign");
      // Mutate only disposable fixture objects, never an operator's files.
      if (scenario === "store-link") { mkdirSync(foreign); rmSync(store, { recursive: true }); symlinkSync(foreign, store); }
      if (scenario === "pointer-link") { writeFileSync(foreign, previous, { mode: 0o644 }); rmSync(current); symlinkSync(foreign, current); }
      if (scenario === "binary-link") { writeFileSync(foreign, bytes, { mode: 0o755 }); rmSync(record.path); symlinkSync(foreign, record.path); }
      if (scenario === "directory-link") { mkdirSync(foreign); rmSync(join(store, sha256), { recursive: true }); symlinkSync(foreign, join(store, sha256)); }
      if (scenario === "binary-hardlink") linkSync(record.path, foreign);
      if (scenario === "writable-pointer") chmodSync(current, 0o666);
      if (scenario === "writable-store") chmodSync(store, 0o777);
      const h = refresh(home); expect(h.result).toMatch(/^unavailable:/); expect(h.warnings).toHaveLength(1);
      if (scenario !== "store-link") expect(readFileSync(current)).toEqual(previous);
      else expect(existsSync(join(foreign, "current.json"))).toBe(false);
    });
  });
  test("a same-SHA pointer without an intact binary does not claim unchanged", () => fixture(home => {
    expect(refresh(home).result).toBe("updated");
    const current = join(home, ".local/share/torre-control/tui/current.json"), before = readFileSync(current), record = JSON.parse(before);
    rmSync(record.path);
    const restored = refresh(home); expect(restored.result).toBe("updated"); expect(restored.calls).toHaveLength(2);
    expect(readFileSync(record.path)).toEqual(bytes);
    writeFileSync(record.path, "drift");
    const drift = refresh(home); expect(drift.result).toBe("unavailable:unsafe"); expect(drift.calls).toHaveLength(2);
    expect(readFileSync(current)).toEqual(before);
  }));
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
