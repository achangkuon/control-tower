import { expect, test, spyOn } from "bun:test";
import * as childProcess from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { BUNDLE_MEMBERS } from "../bundle.mjs";
import { bootstrapVerifiedRelease } from "../bootstrap.mjs";
import { buildRelease, main, stampInstaller } from "../release-build.mjs";

const paths = [...BUNDLE_MEMBERS.map(({ source }) => source), ...[
  "adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli",
].map((name) => `product/tower/v1/${name}.mjs`)].sort();
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function git(repo, ...argv) {
  const result = childProcess.spawnSync("git", ["-C", repo, ...argv], {
    timeout: 10_000, maxBuffer: 2 * 1024 * 1024, encoding: "buffer",
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
      GIT_CONFIG_COUNT: "2", GIT_CONFIG_KEY_0: "user.name", GIT_CONFIG_VALUE_0: "Release test",
      GIT_CONFIG_KEY_1: "user.email", GIT_CONFIG_VALUE_1: "release@example.invalid" },
  });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) throw new Error("fixture git failed");
  return result.stdout.toString().trim();
}
function fixture(run, change = () => {}) {
  const root = mkdtempSync(join(tmpdir(), "tower-release-build-")), repo = join(root, "repo");
  try {
    mkdirSync(repo);
    git(repo, "init", "--quiet");
    for (const path of paths) {
      mkdirSync(dirname(join(repo, path)), { recursive: true });
      writeFileSync(join(repo, path), Buffer.from([0, 255, 1, 2]));
    }
    const installer = "product/tower/v1/install.mjs";
    writeFileSync(join(repo, installer), readFileSync(new URL("../install.mjs", import.meta.url)));
    change(repo);
    git(repo, "add", ".");
    git(repo, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture");
    return run({ root, repo, commit: git(repo, "rev-parse", "HEAD"), out: join(root, "tower-v1.json") });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test("stamping is exact once, pins immutable envelope and emits deterministic separate installer", () => fixture(({ repo, out, root, commit }) => {
  const installerOut = join(root, "torre-install.mjs");
  const receipt = buildRelease({ repo, out, tag: "v1.0.1", "installer-out": installerOut });
  const source = readFileSync(installerOut, "utf8");
  const pinned = JSON.parse(source.match(/^const PINNED = (.+);$/m)[1]);
  expect(pinned).toEqual({ repository: "achangkuon/control-tower", tag: "v1.0.1", asset: "tower-v1.json", sha256: receipt.sha256, paths });
  expect(receipt.installerSha256).toBe(digest(source));
  expect(lstatSync(installerOut).mode & 0o777).toBe(0o644);
  expect(JSON.parse(readFileSync(out)).members.some(({ path }) => path.endsWith("/install.mjs"))).toBe(false);
  mkdirSync(join(root, "second"));
  const second = buildRelease({ repo, commit, out: join(root, "second/tower-v1.json"), tag: "v1.0.1", "installer-out": installerOut + ".second" });
  expect(second.installerSha256).toBe(receipt.installerSha256);
  expect(readFileSync(installerOut + ".second", "utf8")).toBe(source);
  expect(() => stampInstaller(source, pinned)).toThrow(/stamp/i);
  expect(() => stampInstaller("const PINNED = null;\nconst PINNED = null;", pinned)).toThrow(/stamp/i);
}));

test("installer flags and source admission fail before writing either output", () => {
  for (const kind of ["tag-only", "out-only", "latest", "path", "exists", "missing", "symlink", "unstampable"]) fixture(({ repo, out, root }) => {
    const installerOut = kind === "path" ? join(repo, "installer.mjs") : join(root, "installer.mjs");
    if (kind === "exists") writeFileSync(installerOut, "preserve");
    const options = { repo, out, tag: kind === "latest" ? "latest" : "v1.0.1", "installer-out": installerOut };
    if (kind === "tag-only") delete options["installer-out"];
    if (kind === "out-only") delete options.tag;
    expect(() => buildRelease(options)).toThrow();
    expect(existsSync(out)).toBe(false);
  }, (repo) => {
    const file = join(repo, "product/tower/v1/install.mjs");
    if (["missing", "symlink"].includes(kind)) rmSync(file);
    if (kind === "symlink") symlinkSync("cli.mjs", file);
    if (kind === "unstampable") writeFileSync(file, "// no stamp marker");
  });
});

test("deterministic bytes, fixed keys and exact membership admitted by bootstrap", () => fixture(({ repo, commit, out, root }) => {
  const first = buildRelease({ repo, out }), second = buildRelease({ repo, commit, out: join(root, "second.json") });
  const bytes = readFileSync(out);
  expect(readFileSync(join(root, "second.json"))).toEqual(bytes);
  expect(first).toEqual({ schema: "tower.v1.release-build/1", commit, asset: "tower-v1.json", bytes: bytes.length, sha256: digest(bytes) });
  expect(second.sha256).toBe(first.sha256);
  expect(lstatSync(out).mode & 0o777).toBe(0o644);
  const envelope = JSON.parse(bytes);
  expect(Object.keys(envelope)).toEqual(["schema", "members"]);
  expect(envelope.members.map(({ path }) => path)).toEqual(paths);
  expect(envelope.members).toHaveLength(30);
  expect(Object.keys(envelope.members[0])).toEqual(["path", "type", "encoding", "byteLength", "sha256", "bytes"]);
  const calls = [];
  const result = bootstrapVerifiedRelease({ repository: "example/control-tower", tag: "v1", asset: "tower-v1.json",
    sha256: first.sha256, runner: (command, argv, options) => {
      calls.push([command, argv, options]);
      return { status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : bytes };
    } });
  expect(calls.map(([command]) => command)).toEqual(["gh", "gh"]);
  expect(calls[0][1]).toEqual(["auth", "status", "--active", "--hostname", "github.com"]);
  expect(result.manifest.members.every(({ bytes }) => bytes.equals(Buffer.from([0, 255, 1, 2])))).toBe(true);
}));

test("reads the requested commit, not clean but newer working files", () => fixture(({ repo, commit, out }) => {
  writeFileSync(join(repo, paths[0]), "new working content");
  git(repo, "add", ".");
  git(repo, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "newer");
  expect(buildRelease({ repo, commit, out }).commit).toBe(commit);
  expect(JSON.parse(readFileSync(out)).members[0].bytes).toBe("AP8BAg==");
}));

test("refuses tracked and untracked changes without creating output", () => {
  for (const path of [paths[0], "untracked"]) fixture(({ repo, out }) => {
    writeFileSync(join(repo, path), "dirty");
    expect(() => buildRelease({ repo, out })).toThrow(/clean|dirty/i);
    expect(existsSync(out)).toBe(false);
  });
});

test("rejects missing, symlink, submodule and oversized commit members", () => {
  for (const kind of ["missing", "symlink", "submodule", "member", "aggregate"]) fixture(({ repo, out }) => {
    expect(() => buildRelease({ repo, out })).toThrow(/member|regular|limit|size/i);
    expect(existsSync(out)).toBe(false);
  }, (repo) => {
    const target = join(repo, paths[0]);
    if (["missing", "symlink", "submodule"].includes(kind)) rmSync(target);
    if (kind === "symlink") symlinkSync("go.sum", target);
    if (kind === "submodule") {
      mkdirSync(target);
      git(target, "init", "--quiet");
      writeFileSync(join(target, "file"), "submodule");
      git(target, "add", ".");
      git(target, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "submodule");
    }
    if (kind === "member") writeFileSync(target, Buffer.alloc(1024 * 1024 + 1));
    if (kind === "aggregate") for (const path of paths.slice(0, 9)) writeFileSync(join(repo, path), Buffer.alloc(1024 * 1024));
  });
});

test("accepts exact per-member and aggregate bounds with empty members", () => fixture(({ repo, out }) => {
  buildRelease({ repo, out });
  const members = JSON.parse(readFileSync(out)).members;
  expect(members.reduce((sum, member) => sum + member.byteLength, 0)).toBe(8 * 1024 * 1024);
  expect(members[0].byteLength).toBe(1024 * 1024);
  expect(members.at(-1).bytes).toBe("");
}, (repo) => {
  paths.forEach((path, index) => writeFileSync(join(repo, path), Buffer.alloc(index < 8 ? 1024 * 1024 : 0)));
}));

test("bootstrap rejection occurs before the exclusive output write", () => fixture(({ repo, out }) => {
  const decoder = spyOn(TextDecoder.prototype, "decode").mockImplementation(() => { throw new Error("reject envelope"); });
  try {
    expect(() => buildRelease({ repo, out })).toThrow(/bounded JSON envelope/);
    expect(decoder).toHaveBeenCalledTimes(1);
    expect(existsSync(out)).toBe(false);
  } finally { decoder.mockRestore(); }
}));

test("output must be absolute, outside canonical worktree, and absent (including symlinks)", () => fixture(({ root, repo, out }) => {
  writeFileSync(out, "preserve");
  symlinkSync(repo, join(root, "alias"));
  symlinkSync(join(root, "absent"), join(root, "dangling.json"));
  for (const target of ["relative.json", join(repo, "asset.json"), join(root, "alias", "asset.json"), out, join(root, "dangling.json")]) {
    expect(() => buildRelease({ repo, out: target })).toThrow();
  }
  expect(readFileSync(out, "utf8")).toBe("preserve");
  expect(existsSync(join(repo, "asset.json"))).toBe(false);
}));

test("closed CLI prints one receipt or one bounded prefixed error; bad revisions fail closed", () => fixture(({ repo, out }) => {
  let stdout = "", stderr = "";
  const io = { stdout: { write: (text) => { stdout += text; } }, stderr: { write: (text) => { stderr += text; } } };
  expect(main(["--repo", repo, "--out", out], io)).toBe(0);
  expect(stdout.split("\n")).toHaveLength(2);
  expect(JSON.parse(stdout).sha256).toBe(digest(readFileSync(out)));
  expect(stderr).toBe("");
  for (const argv of [[], ["--unknown", "x"], ["--out"], ["--out", out, "--out", out],
    ["--repo", repo, "--out", out + ".bad", "--commit", "not-a-revision"],
    ["--repo", repo, "--out", out + ".bad", "--commit", "--all"]]) {
    stdout = ""; stderr = "";
    expect(main(argv, io)).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toMatch(/^Invalid Tower release build: [^\r\n]+\n$/);
    expect(existsSync(out + ".bad")).toBe(false);
  }
}));

test("all git subprocesses are bounded and timeout/nonzero/invalid responses fail closed", () => fixture(({ repo, out }) => {
  const original = childProcess.spawnSync, calls = [];
  const spy = spyOn(childProcess, "spawnSync").mockImplementation((command, argv, options) => {
    calls.push([command, options]);
    return original(command, argv, options);
  });
  try {
    buildRelease({ repo, out });
    expect(calls.length).toBeGreaterThan(30);
    expect(calls.every(([command, options]) => command === "git" && options.timeout > 0 && options.timeout <= 10_000)).toBe(true);
    for (const result of [{ status: null, stdout: Buffer.alloc(0), error: new Error("timeout") },
      { status: 1, stdout: Buffer.alloc(0) }, { status: 0, stdout: "invalid" }]) {
      spy.mockReturnValue(result);
      expect(() => buildRelease({ repo, out: out + ".bad" })).toThrow(/git/i);
      expect(existsSync(out + ".bad")).toBe(false);
    }
  } finally { spy.mockRestore(); }
}));
