import { expect, test, spyOn } from "bun:test";
import * as childProcess from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { BUNDLE_MEMBERS } from "../bundle.mjs";
import { bootstrapVerifiedRelease } from "../bootstrap.mjs";
import { buildRelease, main, stampInstaller } from "../release-build.mjs";
import { main as towerCli } from "../cli.mjs";

const paths = [...BUNDLE_MEMBERS.map(({ source }) => source), ...[
  "adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli", "runtime-config", "release-build",
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
  const saved = process.env.HOME;
  process.env.HOME = join(root, "home"); mkdirSync(process.env.HOME, { mode: 0o700 });
  try {
    mkdirSync(repo);
    git(repo, "init", "--quiet");
    for (const path of paths) {
      mkdirSync(dirname(join(repo, path)), { recursive: true });
      writeFileSync(join(repo, path), Buffer.from([0, 255, 1, 2]));
    }
    const installer = "product/tower/v1/install.mjs";
    writeFileSync(join(repo, installer), readFileSync(new URL("../install.mjs", import.meta.url)));
    mkdirSync(join(repo, "product/tower/v1/tui"));
    writeFileSync(join(repo, "product/tower/v1/tui/go.mod"), "module fixture\n\ngo 1.20\n");
    writeFileSync(join(repo, "product/tower/v1/tui/main.go"), 'package main\nfunc main() {}\n');
    change(repo);
    git(repo, "add", ".");
    git(repo, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture");
    return run({ root, repo, commit: git(repo, "rev-parse", "HEAD"), out: join(root, "tower-v1.json") });
  } finally {
    if (saved === undefined) delete process.env.HOME; else process.env.HOME = saved;
    rmSync(root, { recursive: true, force: true });
  }
}

test("clean committed checkout installs locally without publishing through the real release builder", () => fixture(({ repo, commit }) => {
  let stdout = "", stderr = "";
  const env = { HOME: process.env.HOME, PATH: process.env.PATH };
  const runner = (command, argv) => {
    if (command === "gentle-ai") return { status: 0, stdout: "gentle-ai 4.0.0" };
    if (command !== "go") throw new Error("local install must not acquire over GitHub");
    if (argv[0] === "env") return { status: 0, stdout: join(env.HOME, "modules") };
    writeFileSync(argv[5], "fixture radar", { mode: 0o755 }); return { status: 0 };
  };
  const deps = { env, runner, stdout: { write: text => { stdout += text; } }, stderr: { write: text => { stderr += text; } } };
  expect(towerCli(["install", "--from-checkout", repo], deps)).toBe(0);
  expect(stderr).toBe(""); expect(JSON.parse(stdout).status).toBe("installed");
  expect(readFileSync(join(env.HOME, ".claude/CLAUDE.md"), "utf8")).toContain(`checkout-${commit.slice(0, 12)}`);
  writeFileSync(join(repo, "untracked"), "dirty"); stdout = "";
  expect(towerCli(["update", "--from-checkout", repo], deps)).toBe(1);
  expect(stderr).toContain("clean worktree");
}, repo => {
  for (const path of paths) writeFileSync(join(repo, path), readFileSync(new URL(`../../../../${path}`, import.meta.url)));
}));

test("TUI builds exported commit sources offline and stamps deterministic binaries", () => fixture(({ repo, root, out, commit }) => {
  writeFileSync(join(repo, "product/tower/v1/tui/main.go"), "newer working source");
  git(repo, "add", "."); git(repo, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "newer");
  const calls = [];
  const builder = (command, argv, options) => {
    calls.push([command, argv, options]);
    expect(options.env).toMatchObject({ GOWORK: "off", GOENV: "off", GOFLAGS: "-mod=readonly", GOPROXY: "off" });
    const allowed = ["PATH", "HOME", "TMPDIR", "GOCACHE", "GOPATH", "GOMODCACHE", "GOFLAGS", "GOPROXY", "GOSUMDB", "GOWORK", "GOTOOLCHAIN", "GOENV", "GOTELEMETRY", "CGO_ENABLED", "GOOS", "GOARCH"];
    expect(Object.keys(options.env).filter(key => !allowed.includes(key))).toEqual([]);
    for (const key of ["GOINSECURE", "GONOSUMDB", "GONOSUMCHECK", "GOPRIVATE", "GONOPROXY"]) expect(options.env[key]).toBeUndefined();
    if (argv[0] === "env") return { status: 0, stdout: Buffer.from("/operator/cache\n") };
    expect(readFileSync(join(options.cwd, "main.go"), "utf8")).toContain("func main() {}");
    expect(options.cwd).not.toStartWith(repo);
    expect(options.env).toMatchObject({ CGO_ENABLED: "0", GOFLAGS: "-mod=readonly", GOPROXY: "off", GOTOOLCHAIN: "local", GOMODCACHE: "/operator/cache" });
    expect(argv).toEqual(["build", "-trimpath", "-ldflags", "-s -w -buildid=", "-o", argv[5], "."]);
    writeFileSync(argv[5], `${options.env.GOOS}-${options.env.GOARCH}`);
    return { status: 0, stdout: Buffer.alloc(0) };
  };
  const build = (suffix, output) => buildRelease({ repo, commit, out: output, tag: "v1-test",
    "installer-out": join(root, `installer-${suffix}.mjs`), "tui-out-dir": join(root, `tui-${suffix}`) }, { builder });
  mkdirSync(join(root, "second"));
  const first = build("one", out), second = build("two", join(root, "second/tower-v1.json"));
  expect(first.tui).toEqual(second.tui);
  expect(first.installerSha256).toBe(second.installerSha256);
  expect(Object.keys(first.tui)).toEqual(["linux-amd64", "linux-arm64", "darwin-amd64", "darwin-arm64"]);
  for (const pin of Object.values(first.tui)) {
    const path = join(root, "tui-one", pin.asset);
    expect(digest(readFileSync(path))).toBe(pin.sha256);
    expect(lstatSync(path).mode & 0o777).toBe(0o755);
  }
  const stamped = JSON.parse(readFileSync(join(root, "installer-one.mjs"), "utf8").match(/^const PINNED = (.+);$/m)[1]);
  expect(stamped.tui).toEqual(first.tui);
  expect(calls.every(([, , options]) => options.timeout > 0 && options.timeout <= 180_000)).toBe(true);
}));

test("missing offline modules fail before publishing any TUI output", () => fixture(({ repo, root, out }) => {
  const tui = join(root, "tui");
  expect(() => buildRelease({ repo, out, tag: "v1", "installer-out": join(root, "installer"), "tui-out-dir": tui },
    { builder: (_command, argv) => argv[0] === "env" ? { status: 0, stdout: Buffer.from("/operator/cache") } : { status: 1 } })).toThrow(/offline/);
  expect(existsSync(tui)).toBe(false); expect(existsSync(out)).toBe(false);
}));

(Bun.which("go") ? test : test.skip)("real Go ignores ancestor workspace malicious dependency replacement", () => fixture(({ repo, root, out }) => {
  const tui = join(root, "tui");
  const builder = (command, argv, options) => {
    if (argv[0] === "env") {
      // Private fixture ancestor, never /tmp/go.work or any operator workspace.
      const ancestor = join(options.cwd, "../../../..");
      mkdirSync(join(ancestor, "malicious"));
      writeFileSync(join(ancestor, "malicious/go.mod"), "module example.invalid/dependency\n\ngo 1.20\n");
      writeFileSync(join(ancestor, "malicious/code.go"), 'package dependency\nconst Marker = "attacker"\n');
      writeFileSync(join(ancestor, "go.work"), "go 1.20\nuse ./product/tower/v1/tui\nreplace example.invalid/dependency v1.0.0 => ./malicious\n");
    }
    return childProcess.spawnSync(command, argv, options);
  };
  // The dependency is deliberately absent offline. A workspace redirect would
  // compile successfully from attacker code; ignoring it must fail closed.
  expect(() => buildRelease({ repo, out, tag: "v1", "installer-out": join(root, "installer"), "tui-out-dir": tui }, { builder })).toThrow(/offline/);
  expect(existsSync(tui)).toBe(false); expect(existsSync(out)).toBe(false);
}, repo => {
  writeFileSync(join(repo, "product/tower/v1/tui/go.mod"), "module fixture\n\ngo 1.20\nrequire example.invalid/dependency v1.0.0\n");
  writeFileSync(join(repo, "product/tower/v1/tui/main.go"), 'package main\nimport "example.invalid/dependency"\nfunc main() { println(dependency.Marker) }\n');
}), 180_000);

// Opt-in integration: normal unit runs use the injected deterministic builder above.
const realGo = process.env.TOWER_REAL_TUI_BUILD === "1" && Bun.which("go");
(realGo ? test : test.skip)("optional real tiny Go cross-build", () => fixture(({ repo, root, out }) => {
  const receipt = buildRelease({ repo, out, tag: "v1", "installer-out": join(root, "installer"), "tui-out-dir": join(root, "tui") });
  expect(Object.values(receipt.tui).every(pin => pin.bytes > 0)).toBe(true);
}), 180_000);

test("TUI output requires installer pins and an absent external directory", () => fixture(({ repo, root, out }) => {
  for (const directory of [repo, "relative", root]) {
    expect(() => buildRelease({ repo, out, tag: "v1", "installer-out": join(root, "installer"), "tui-out-dir": directory })).toThrow();
    expect(existsSync(out)).toBe(false);
  }
  expect(() => buildRelease({ repo, out, "tui-out-dir": join(root, "tui") })).toThrow();
}));

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
  expect(envelope.members).toHaveLength(74);
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

test("release and installer pins carry global-only members and exclude the personal Notion map", () => fixture(({ repo, root, out }) => {
  const receipt = buildRelease({ repo, out, tag: "v1", "installer-out": join(root, "installer.mjs") });
  const envelope = JSON.parse(readFileSync(out));
  const pinned = JSON.parse(readFileSync(join(root, "installer.mjs"), "utf8").match(/^const PINNED = (.+);$/m)[1]);
  const expected = ["agent-workflows/skills/chanks-1-adopcion/SKILL.md",
    "agent-workflows/skills/chanks-4-puente/scripts/prepare_new_change.py",
    "agent-workflows/skills/_shared/plan-naming-convention.md",
    "product/tower/v1/instructions/project-agents.md", "product/tower/v1/instructions/global-pointer.md",
    "agent-workflows/chanks/torre-firma.mjs", "agent-workflows/tools/hooks/torre-firma.sh",
    "agent-workflows/tools/hooks/chanks-etapa.sh"];
  for (const path of expected) {
    expect(envelope.members.map(entry => entry.path)).toContain(path);
    expect(pinned.paths).toContain(path);
  }
  const excluded = "agent-workflows/skills/chanks-5-session-doc/assets/project-notion-map.json";
  expect(envelope.members.map(entry => entry.path)).not.toContain(excluded);
  expect(pinned.paths).not.toContain(excluded);
  expect(pinned.paths).toHaveLength(74);
  expect(pinned.sha256).toBe(receipt.sha256);
}, repo => {
  const excluded = join(repo, "agent-workflows/skills/chanks-5-session-doc/assets/project-notion-map.json");
  mkdirSync(dirname(excluded), { recursive: true });
  writeFileSync(excluded, "never shipped");
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
