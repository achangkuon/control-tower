import { expect, spyOn, test as bunTest } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { PassThrough } from "node:stream";
import { chmodSync, existsSync, fstatSync, lstatSync, readlinkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync,
  rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { main } from "../cli.mjs";
import { BUNDLE_MEMBERS } from "../bundle.mjs";
import { initRegisteredProject, doctorRegisteredProject } from "../projects.mjs";
import { captureProjectFiles, restoreProjectFiles } from "../project-files.mjs";
import { updateGlobal } from "../global.mjs";

// Every fixture, including loop-created ones, is reclaimed even on assertion failure.
const roots = [];
const environmentKeys = ["HOME", "XDG_DATA_HOME", "XDG_CONFIG_HOME", "XDG_CACHE_HOME",
  "GH_CONFIG_DIR", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "GIT_CONFIG_NOSYSTEM"];
const test = (name, fn) => bunTest(name, async () => {
  const mask = process.umask(0o022);
  const environment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
  try { await fn(); }
  finally {
    try { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); }
    finally {
      process.umask(mask);
      for (const key of environmentKeys) {
        if (environment[key] === undefined) delete process.env[key];
        else process.env[key] = environment[key];
      }
    }
  }
});

const entry = new URL("../cli.mjs", import.meta.url).pathname;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
// Only disposable roots are used, including subprocess HOME, Git and GitHub configuration.
function fixture() {
  const root = mkdtempSync("/tmp/tower-cli-");
  roots.push(root);
  const home = join(root, "home");
  mkdirSync(home, { mode: 0o700 });
  const env = { PATH: process.env.PATH, HOME: home, XDG_DATA_HOME: join(root, "data"),
    XDG_CONFIG_HOME: join(root, "config"), XDG_CACHE_HOME: join(root, "cache"),
    GH_CONFIG_DIR: join(root, "gh"), GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  // Adoption's Git subprocesses inherit process.env, unlike the injected gh runner.
  for (const key of environmentKeys) process.env[key] = env[key];
  const share = join(home, ".local", "share", "torre-control");
  return { root, home, env, share, state: join(share, "v1"),
    registry: join(share, "projects"), launcher: join(home, ".local", "bin", "torre-control") };
}
function ready(f) {
  mkdirSync(join(f.home, ".local", "bin"), { recursive: true, mode: 0o700 });
  mkdirSync(f.share, { recursive: true, mode: 0o700 });
}
function invoke(f, argv, extra = {}) {
  let stdout = "", stderr = "";
  const code = main(argv, { env: f.env, stdout: { write: (text) => { stdout += text; } },
    stderr: { write: (text) => { stderr += text; } }, runner: () => ({ status: 0, stdout: "gentle-ai 4.0.0" }), ...extra });
  return { code, stdout, stderr, value: stdout ? JSON.parse(stdout) : undefined };
}
function failed(result) {
  expect(result.code).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toMatch(/^Invalid Tower CLI: [^\r\n]+\n$/);
  expect(result.stderr).not.toContain("\n    at ");
}
function success(result) {
  expect(result.code).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.stdout).toBe(`${JSON.stringify(result.value)}\n`);
}
function release(label = "a") {
  const paths = [...BUNDLE_MEMBERS.map(({ source }) => source),
    ...["adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli", "runtime-config", "release-build"]
      .map((name) => `product/tower/v1/${name}.mjs`)];
  const members = paths.map((path) => {
    const bytes = Buffer.concat([readFileSync(new URL(`../../../../${path}`, import.meta.url)), path.endsWith("/cli.mjs") ? Buffer.from(`\n// fixture ${label}\n`) : Buffer.alloc(0)]);
    return { path, type: "file", encoding: "base64", byteLength: bytes.length,
      sha256: digest(bytes), bytes: bytes.toString("base64") };
  });
  const wire = Buffer.from(JSON.stringify({ schema: "tower.v1.release/1", members }));
  const calls = [];
  return { wire, sha: digest(wire), calls, runner: (command, argv) => {
    if (command === "gentle-ai") return { status: 0, stdout: "gentle-ai 4.0.0" };
    if (command === "go" && argv[0] === "env") return { status: 0, stdout: "/fixture/modules" };
    if (command === "go" && argv[0] === "build") { writeFileSync(argv[5], "fixture radar", { mode: 0o755 }); return { status: 0 }; }
    calls.push([command, argv]);
    return { status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : wire };
  } };
}
const pinned = (command, r) => [command, "--tag", "v1-test", "--asset", "tower.json", "--sha256", r.sha];
function project(f) {
  const path = join(f.root, "project");
  mkdirSync(path);
  expect(spawnSync("git", ["init", "--quiet", path], { env: f.env, timeout: 10_000 }).status).toBe(0);
  writeFileSync(join(path, "sentinel"), "unrelated");
  return path;
}

test("S211 project permissions are actionable before registry writes and repair is explicit", () => {
  const f = fixture(), path = project(f);
  mkdirSync(join(path, ".agents/skills"), { recursive: true }); mkdirSync(join(path, ".claude"));
  symlinkSync("../.agents/skills", join(path, ".claude/skills"));
  for (const name of [".agents", ".agents/skills", ".claude"]) chmodSync(join(path, name), 0o775);
  writeFileSync(join(path, "CLAUDE.md"), "my rules", { mode: 0o664 }); chmodSync(join(path, "CLAUDE.md"), 0o664);
  const argv = ["project", "init", "--project", path, "--trust", "trusted"], before = snapshot(f);
  const refused = invoke(f, argv);
  expect(refused.code).toBe(1); expect(refused.stderr).toContain(`chmod go-w '${join(path, "CLAUDE.md")}'`);
  expect(snapshot(f)).toEqual(before);
  const adopted = invoke(f, [...argv, "--fix-permissions"]);
  expect(adopted.code).toBe(0); expect(adopted.stderr).toContain("Permisos corregidos (sólo go-w):");
  expect(invoke(f, ["project", "doctor", "--project", path]).value.localResult.status).toBe("healthy");
  chmodSync(join(path, ".claude"), 0o775);
  expect(invoke(f, ["project", "update", "--project", path]).stderr).toContain(`chmod go-w '${join(path, ".claude")}'`);
  expect(invoke(f, ["project", "update", "--project", path, "--fix-permissions"]).code).toBe(0);
  success(invoke(f, ["project", "uninstall", "--project", path]));
  expect(readlinkSync(join(path, ".claude/skills"))).toBe("../.agents/skills");
  for (const op of ["doctor", "cleanup", "uninstall"]) failed(invoke(f, ["project", op, "--project", path, "--fix-permissions"]));
});

const invalid = [[], ["unknown"], ["toString"], ["__proto__"], ["uninstall", "--unexpected", "x"], ["project"], ["project", "unknown"],
  ["doctor", "extra"], ["doctor", "--tag", "v1"], ["list", "--project", "/tmp/x"],
  ["install"], ["update", "--tag", "v1", "--asset", "tower.json"],
  ["install", "--tag", "--asset", "tower.json", "--sha256", "a".repeat(64)],
  ["install", "--tag", "v1", "--tag", "v2", "--asset", "tower.json", "--sha256", "a".repeat(64)],
  ["doctor", "--state"], ["doctor", "--state", "x", "--state", "y"],
  ["list", "--repository", "other/repo"], ["doctor", "--registry=x"],
  ["project", "init", "--project", "/tmp/x"],
  ["project", "init", "--project", "/tmp/x", "--trust", "unknown"],
  ["project", "doctor"], ["project", "doctor", "--project", "/tmp/x", "--trust", "trusted"],
  ["project", "cleanup", "--project", "/tmp/x", "extra"]];
for (const argv of invalid) test(`closed usage rejects ${JSON.stringify(argv)}`, () => {
  const f = fixture();
  failed(invoke(f, argv));
  expect(readdirSync(f.home)).toEqual([]);
});

const tuiPlatform = `${process.platform}-${process.arch === "x64" ? "amd64" : process.arch}`;
const tuiAsset = `torre-tui-${tuiPlatform}`;
function latestRunner(r, tag, { checksum = `${r.sha}  tower-v1.json\n`, missing = false,
  tui = null, tuiChecksum = tui && `${digest(tui)}  ${tuiAsset}\n`, tuiDownload = tui } = {}) {
  const calls = [];
  return { calls, runner: (command, argv, options) => {
    if (command !== "gh") return r.runner(command, argv, options);
    calls.push(argv);
    if (argv[0] === "auth") return { status: 0, stdout: Buffer.alloc(0) };
    if (argv[1] === "view") return { status: 0, stdout: Buffer.from(JSON.stringify({ tagName: tag })) };
    if (argv.includes("tower-v1.json.sha256")) return { status: missing ? 1 : 0, stdout: Buffer.from(checksum) };
    if (argv.includes(tuiAsset + ".sha256")) return { status: tuiChecksum ? 0 : 1, stdout: Buffer.from(tuiChecksum ?? "") };
    if (argv.includes(tuiAsset)) return { status: tuiDownload ? 0 : 1, stdout: tuiDownload ?? Buffer.alloc(0) };
    return { status: 0, stdout: r.wire };
  } };
}

test("S209 check reports tags without writes, downloads, prerequisites or lifecycle mutation", () => {
  const f = fixture(), r = release();
  success(invoke(f, pinned("install", r), { runner: r.runner }));
  for (const [tag, status] of [["v1.2.2", "available"], ["v1-test", "up-to-date"]]) {
    const before = snapshot(f), h = latestRunner(r, tag);
    const checked = invoke(f, ["update", "--check"], { runner: h.runner,
      operations: { updateGlobal: () => { throw new Error("must not update"); } } });
    success(checked); expect(checked.value).toEqual({ status, installed: "v1-test", latest: tag });
    expect(snapshot(f)).toEqual(before);
    expect(h.calls.map(args => args.slice(0, 2))).toEqual([["auth", "status"], ["release", "view"]]);
  }
  const before = snapshot(f);
  const unknown = invoke(f, ["update", "--check"], { runner: () => ({ status: null, error: { code: "ETIMEDOUT" } }) });
  success(unknown); expect(unknown.value.status).toBe("unknown"); expect(unknown.value.reason).toBeString();
  expect(snapshot(f)).toEqual(before);
});

test("S209 check with no installation is unknown and never prepares default parents", () => {
  const f = fixture(), before = snapshot(f);
  const result = invoke(f, ["update", "--check"], { runner: () => { throw new Error("must not probe absent installation"); } });
  success(result); expect(result.value.status).toBe("unknown");
  expect(snapshot(f)).toEqual(before); expect(readdirSync(f.home)).toEqual([]);
  for (const argv of [["install", "--check"], ["update", "--check", "--latest"], ["update", "--check", "--fix-permissions"], ["update", "--check", "--tag", "v1"], ["update", "--check", "--check"]]) failed(invoke(f, argv));
});

test("S207 latest installs and switches verified TUI even when engine tag is already current", async () => {
  const f = fixture(), r = release(), first = Buffer.from("first interface"), second = Buffer.from("second interface");
  const install = invoke(f, ["install", "--latest"], { runner: latestRunner(r, "v1-test", { tui: first }).runner });
  success(install); expect(install.value.tui).toBe("updated");
  const current = join(f.share, "tui/current.json"), old = JSON.parse(readFileSync(current));
  expect(readFileSync(old.path)).toEqual(first); expect(statSync(old.path).mode & 0o7777).toBe(0o755);
  const equal = latestRunner(r, "v1-test", { tui: first }), before = snapshot(f);
  const unchanged = invoke(f, ["update", "--latest"], { runner: equal.runner });
  success(unchanged); expect(unchanged.value).toMatchObject({ status: "up-to-date", tui: "unchanged" });
  expect(equal.calls.some(args => args.includes(tuiAsset))).toBe(false); expect(snapshot(f)).toEqual(before);
  const newer = latestRunner(r, "v1-test", { tui: second });
  const updated = invoke(f, ["update", "--latest"], { runner: newer.runner });
  success(updated); expect(updated.value).toMatchObject({ status: "up-to-date", tui: "updated" });
  const record = JSON.parse(readFileSync(current));
  expect(record.sha256).toBe(digest(second)); expect(readFileSync(record.path)).toEqual(second);
  expect(readFileSync(old.path)).toEqual(first);
  const launched = await main([], { env: f.env, stdin: { isTTY: true }, stdout: { isTTY: true, write() {} },
    cliPath: join(f.state, "versions", r.sha, "product/tower/v1/cli.mjs"),
    tuiSpawn: path => { expect(path).toBe(record.path); return { status: 0 }; } });
  expect(launched).toBe(0);
});

test("S207 TUI failures keep previous pointer and do not hide successful engine activation", () => {
  for (const scenario of ["old-release", "checksum", "mismatch", "download"]) {
    const f = fixture(), r = release(), binary = Buffer.from("previous interface"), next = Buffer.from("new interface");
    success(invoke(f, ["install", "--latest"], { runner: latestRunner(r, "v1-test", { tui: binary }).runner }));
    const current = join(f.share, "tui/current.json"), previous = readFileSync(current);
    const second = release(scenario), options = scenario === "old-release" ? {} : { tui: next,
      ...(scenario === "checksum" ? { tuiChecksum: `${digest(next)} ${tuiAsset}\n` } : {}),
      ...(scenario === "mismatch" ? { tuiDownload: Buffer.from("tampered") } : {}),
      ...(scenario === "download" ? { tuiDownload: null } : {}) };
    const result = invoke(f, ["update", "--latest"], { runner: latestRunner(second, "v2-test", options).runner });
    expect(result.code).toBe(0); expect(result.value.active).toBe(second.sha);
    expect(result.value.tui).toBe(`unavailable:${scenario === "old-release" ? "assets" : scenario}`);
    expect(readFileSync(current)).toEqual(previous); expect(readFileSync(JSON.parse(previous).path)).toEqual(binary);
    if (scenario === "mismatch") expect(result.stderr).toContain("La huella SHA-256 de la interfaz no coincide");
    expect(invoke(f, ["doctor"]).value.activeTag).toBe("v2-test");
  }
});

test("S207 engine failure never downloads or activates the new TUI", () => {
  const f = fixture(), r = release(), binary = Buffer.from("previous interface"), next = Buffer.from("next interface");
  success(invoke(f, ["install", "--latest"], { runner: latestRunner(r, "v1-test", { tui: binary }).runner }));
  const before = snapshot(f), h = latestRunner(release("next"), "v2-test", { tui: next });
  const result = invoke(f, ["update", "--latest"], { runner: h.runner,
    operations: { updateGlobal: () => { throw new Error("engine activation refused"); } } });
  failed(result); expect(snapshot(f)).toEqual(before);
  expect(h.calls.some(args => args.includes(tuiAsset) || args.includes(tuiAsset + ".sha256"))).toBe(false);
});

test("S207 checkout requests TUI outputs and installs only verified local platform bytes", () => {
  for (const scenario of ["available", "missing", "mismatch"]) {
    const f = fixture(), r = release(), binary = Buffer.from("local interface");
    const result = invoke(f, ["install", "--from-checkout", f.root], { runner: r.runner, buildRelease: options => {
      expect(options["tui-out-dir"]).toBeString();
      writeFileSync(options.out, r.wire);
      if (scenario !== "missing") {
        mkdirSync(options["tui-out-dir"]);
        writeFileSync(join(options["tui-out-dir"], tuiAsset), binary, { mode: 0o755 });
        writeFileSync(join(options["tui-out-dir"], tuiAsset + ".sha256"), `${scenario === "mismatch" ? "0".repeat(64) : digest(binary)}  ${tuiAsset}\n`, { mode: 0o644 });
      }
      return { commit: "a".repeat(40), sha256: r.sha };
    } });
    expect(result.code).toBe(0); expect(result.value.status).toBe("installed");
    expect(result.value.tui).toBe(scenario === "available" ? "updated" : `unavailable:${scenario === "missing" ? "checkout" : "mismatch"}`);
    expect(r.calls).toEqual([]);
    const current = join(f.share, "tui/current.json");
    expect(existsSync(current)).toBe(scenario === "available");
    if (scenario === "available") expect(readFileSync(JSON.parse(readFileSync(current)).path)).toEqual(binary);
  }
});

test("latest install and update retain verified provenance; equal tag only downloads the TUI checksum", () => {
  const f = fixture(), first = release("first"), h = latestRunner(first, "v1-test");
  const installed = invoke(f, ["install", "--latest"], { runner: h.runner });
  success(installed); expect(installed.value.tag).toBe("v1-test");
  expect(installed.value.active).toBe(first.sha);
  const before = snapshot(f), equal = latestRunner(first, "v1-test");
  const unchanged = invoke(f, ["update", "--latest"], { runner: equal.runner });
  success(unchanged); expect(unchanged.value.status).toBe("up-to-date");
  expect(equal.calls.filter(args => args[1] === "download").map(args => args[args.indexOf("--pattern") + 1])).toEqual([tuiAsset + ".sha256"]);
  expect(snapshot(f)).toEqual(before);
  const second = release("second"), newer = latestRunner(second, "v2-test");
  const updated = invoke(f, ["update", "--latest"], { runner: newer.runner });
  success(updated); expect(updated.value.tag).toBe("v2-test"); expect(updated.value.active).toBe(second.sha);
  expect(invoke(f, ["doctor"]).value.activeTag).toBe("v2-test");
});

test("S205 checkout promotion by latest becomes up-to-date on the next invocation", () => {
  const f = fixture(), r = release();
  success(invoke(f, ["install", "--from-checkout", f.root], { runner: r.runner, buildRelease: options => {
    writeFileSync(options.out, r.wire); return { commit: "a".repeat(40), sha256: r.sha };
  } }));
  const latest = latestRunner(r, "v1.2.0");
  const promoted = invoke(f, ["update", "--latest"], { runner: latest.runner });
  success(promoted); expect(promoted.value).toMatchObject({ status: "promoted", tag: "v1.2.0", active: r.sha, previous: null });
  const before = snapshot(f), again = latestRunner(r, "v1.2.0");
  const unchanged = invoke(f, ["update", "--latest"], { runner: again.runner });
  success(unchanged); expect(unchanged.value.status).toBe("up-to-date");
  expect(again.calls.filter(args => args[1] === "download").map(args => args[args.indexOf("--pattern") + 1])).toEqual([tuiAsset + ".sha256"]);
  expect(snapshot(f)).toEqual(before);
});

test("S205 permission fixes run before acquisition for pinned, latest and checkout install/update", () => {
  for (const mode of ["pinned", "latest", "checkout"]) for (const command of ["install", "update"]) {
    const f = fixture(), r = release(), dir = join(f.home, ".claude"), settings = join(dir, "settings.json");
    if (command === "update") success(invoke(f, pinned("install", r), { runner: r.runner }));
    else { mkdirSync(dir); writeFileSync(settings, "{}"); }
    writeFileSync(join(dir, "unrelated"), "keep");
    chmodSync(dir, 0o777); chmodSync(settings, 0o662); chmodSync(join(dir, "unrelated"), 0o666);
    let builds = 0;
    const h = latestRunner(r, "v1-test");
    const argv = mode === "pinned" ? pinned(command, r) : mode === "latest" ? [command, "--latest"] : [command, "--from-checkout", f.root];
    const extra = { runner: (...args) => {
      expect(statSync(dir).mode & 0o777).toBe(0o755);
      expect(statSync(settings).mode & 0o777).toBe(0o640);
      return (mode === "latest" ? h.runner : r.runner)(...args);
    }, buildRelease: options => {
      builds++; writeFileSync(options.out, r.wire); return { commit: "a".repeat(40), sha256: r.sha };
    }, ...(command === "update" && mode === "checkout" ? { operations: { updateGlobal: () => ({ status: "unchanged" }) } } : {}) };
    const before = snapshot(f), refusal = invoke(f, argv, extra);
    expect(refusal.code).toBe(1); expect(refusal.stderr).toContain(`chmod go-w '${dir}'`);
    expect(refusal.stderr).toContain(`chmod go-w '${settings}'`); expect(snapshot(f)).toEqual(before);
    const fixed = invoke(f, [...argv, "--fix-permissions"], extra);
    expect(fixed.code).toBe(0);
    expect(fixed.stderr).toBe(`Permisos corregidos (sólo go-w):\n- ${dir}\n- ${settings}\n`);
    expect(fixed.value.permissionsChanged).toEqual([dir, settings]);
    expect(statSync(join(dir, "unrelated")).mode & 0o777).toBe(0o666);
    expect(builds).toBe(mode === "checkout" ? 1 : 0);
  }
});

test("S205 CLI reports explicit repairs even when the rerun refuses invalid settings", () => {
  const f = fixture(), r = release(), dir = join(f.home, ".claude"), path = join(dir, "settings.json");
  mkdirSync(dir, { mode: 0o755 }); writeFileSync(path, "{bad"); chmodSync(path, 0o666);
  const result = invoke(f, [...pinned("install", r), "--fix-permissions"], { runner: r.runner });
  expect(result.code).toBe(1); expect(result.stdout).toBe("");
  expect(result.stderr).toBe(`Permisos corregidos (sólo go-w):\n- ${path}\nInvalid Tower CLI: Tower runtime: settings.json no es JSON válido; no se escribió nada\n`);
  expect(statSync(path).mode & 0o777).toBe(0o644); expect(r.calls).toEqual([]);
});

test("S205 fix flag is valueless, unique and restricted to install/update", () => {
  for (const argv of [["doctor", "--fix-permissions"], ["install", "--latest", "--fix-permissions", "yes"], ["update", "--latest", "--fix-permissions", "--fix-permissions"]]) {
    const f = fixture(); failed(invoke(f, argv)); expect(readdirSync(f.home)).toEqual([]);
  }
});

test("latest refusals preserve both fresh and installed homes", () => {
  for (const installed of [false, true]) for (const options of [{ missing: true }, { checksum: "malformed" }, { checksum: `${"0".repeat(64)}  tower-v1.json\n` }, { tag: "latest" }, { tag: "v..2" }]) {
    const f = fixture(), r = release();
    if (installed) success(invoke(f, pinned("install", r), { runner: r.runner }));
    const before = snapshot(f), h = latestRunner(r, options.tag ?? "v2-test", options);
    const result = invoke(f, [installed ? "update" : "install", "--latest"], { runner: h.runner });
    failed(result); expect(snapshot(f)).toEqual(before);
    if (options.missing) expect(result.stderr).toContain("No se pudo descargar la huella SHA-256");
  }
});

test("latest flags are valueless, closed and exclusive with manual and checkout modes", () => {
  for (const argv of [["doctor", "--latest"], ["install", "--latest", "--latest"], ["install", "--latest", "yes"], ["install", "--latest", "--tag", "v1"], ["update", "--latest", "--from-checkout", "/repo"]]) {
    const f = fixture(); failed(invoke(f, argv)); expect(readdirSync(f.home)).toEqual([]);
  }
});

test("global uninstall on an absent installation is read-only and idempotent", () => {
  const f = fixture(), before = snapshot(f);
  success(invoke(f, ["uninstall"])); success(invoke(f, ["uninstall"]));
  expect(snapshot(f)).toEqual(before);
});

test("local checkout uses release-build receipt and the same digest verification; global uninstall round trip", () => {
  const f = fixture(), r = release(); let builds = 0;
  const result = invoke(f, ["install", "--from-checkout", f.root], { runner: r.runner, buildRelease: options => {
    expect(options.repo).toBe(f.root); builds++;
    writeFileSync(options.out, r.wire, { mode: 0o644 });
    return { commit: "a".repeat(40), sha256: r.sha };
  } });
  success(result); expect(builds).toBe(1); expect(r.calls).toEqual([]);
  expect(readFileSync(join(f.home, ".claude/CLAUDE.md"), "utf8")).toContain("checkout-aaaaaaaaaaaa");
  success(invoke(f, ["uninstall"]));
  expect(existsSync(f.launcher)).toBe(false); expect(existsSync(f.state)).toBe(false);
  expect(existsSync(join(f.home, ".agents/skills/control-tower"))).toBe(false);
  const other = fixture();
  const mismatch = invoke(other, ["install", "--from-checkout", other.root], { runner: r.runner, buildRelease: options => {
    writeFileSync(options.out, r.wire); return { commit: "a".repeat(40), sha256: "0".repeat(64) };
  } });
  failed(mismatch); expect(mismatch.stderr).toContain("SHA-256"); expect(existsSync(other.state)).toBe(false);
  const dirty = fixture();
  const refusal = invoke(dirty, ["install", "--from-checkout", dirty.root], { runner: r.runner, buildRelease: () => { throw new Error("a clean worktree is required"); } });
  failed(refusal); expect(refusal.stderr).toContain("clean worktree"); expect(readdirSync(dirty.home)).toEqual([]);
});

test("help documents explicit clean-checkout installation and global uninstall", () => {
  const f = fixture(); let output = "";
  expect(main(["--help"], { env: f.env, stdout: { write: text => { output += text; } } })).toBe(0);
  expect(output).toContain("--from-checkout"); expect(output).toContain("clean"); expect(output).toContain("uninstall");
  expect(readdirSync(f.home)).toEqual([]);
});

test("invalid runtime settings refuse CLI install without preparing global parents", () => {
  const f = fixture(), r = release();
  mkdirSync(join(f.home, ".claude"), { mode: 0o755 });
  writeFileSync(join(f.home, ".claude/settings.json"), "{invalid", { mode: 0o644 });
  const before = snapshot(f), result = invoke(f, pinned("install", r), { runner: r.runner });
  failed(result); expect(result.stderr).toContain("settings.json"); expect(snapshot(f)).toEqual(before);
});

test("CLI refuses missing Gentle AI before parent creation or dispatch", () => {
  const f = fixture(), r = release(); let called = false;
  const result = invoke(f, pinned("install", r), { runner: () => ({ status: 1 }), operations: { installGlobal: () => { called = true; } } });
  expect(result.code).toBe(1); expect(result.stderr).toContain("Gentle AI"); expect(called).toBe(false);
  expect(readdirSync(f.home)).toEqual([]);
});

test("verified interface ignores ambient TORRE_CONTROL_CLI for installed and checkout launch; plain bypasses", async () => {
  const f = fixture(), binary = Buffer.from("native interface"), sha256 = digest(binary);
  const store = join(f.share, "tui"), path = join(store, sha256, "torre-tui");
  mkdirSync(join(store, sha256), { recursive: true, mode: 0o755 });
  writeFileSync(path, binary, { mode: 0o755 });
  writeFileSync(join(store, "current.json"), JSON.stringify({ schema: "tower.v1.tui/1", sha256, path, platform: `${process.platform}-${process.arch === "x64" ? "amd64" : process.arch}` }));
  chmodSync(join(store, "current.json"), 0o644);
  const calls = [];
  const extra = { env: { ...f.env, TOWER_MENU: "", TORRE_CONTROL_CLI: "/tmp/attacker" }, tuiSpawn: (target, argv, options) => { calls.push([target, argv, options]); return { status: 7 }; },
    cliPath: join(f.state, "versions", "a".repeat(64), "product/tower/v1/cli.mjs") };
  const result = await menu(f, [], extra);
  expect(result.code).toBe(7); expect(result.stderr).toBe(""); expect(result.stdout).toBe("");
  expect(calls[0]).toEqual([path, [], expect.objectContaining({ stdio: "inherit", env: expect.objectContaining({ TORRE_CONTROL_CLI: f.launcher }) })]);
  expect((await menu(f, ["10"], { ...extra, env: { ...f.env, TOWER_MENU: "plain" } })).code).toBe(0);
  expect(calls).toHaveLength(1);
  const sourceInvocation = await menu(f, [], { ...extra, cliPath: entry, tuiSpawn: (_target, _argv, options) => {
    const shim = options.env.TORRE_CONTROL_CLI;
    expect(shim).not.toBe("/tmp/attacker");
    expect(readFileSync(shim, "utf8")).toContain(JSON.stringify(entry));
    expect(statSync(shim).mode & 0o777).toBe(0o755);
    return { status: 0 };
  } });
  expect(sourceInvocation.code).toBe(0);
  for (const override of [{ uid: process.getuid() + 1 }, { size: 4097 }, { nlink: 2 }]) {
    const prior = calls.length;
    const rejected = await menu(f, ["10"], { ...extra, tuiFs: { fstatSync: fd => Object.assign(fstatSync(fd), override) } });
    expect(rejected.code).toBe(0); expect(rejected.stderr).toContain("Interface not verified");
    expect(calls).toHaveLength(prior);
  }
  for (const kind of ["hash", "record", "permissions", "symlink", "spawn", "access"]) {
    writeFileSync(path, binary); chmodSync(path, 0o755);
    const record = join(store, "current.json");
    writeFileSync(record, JSON.stringify({ schema: "tower.v1.tui/1", sha256, path, platform: `${process.platform}-${process.arch === "x64" ? "amd64" : process.arch}` }));
    chmodSync(record, 0o644);
    if (kind === "hash") writeFileSync(path, "tampered");
    if (kind === "record") writeFileSync(record, "{}");
    if (kind === "permissions") chmodSync(record, 0o666);
    if (kind === "symlink") { rmSync(record); symlinkSync(path, record); }
    const prior = calls.length;
    const fallback = await menu(f, ["10"], { ...extra, tuiSpawn: (...args) => { calls.push(args); return { error: Object.assign(new Error("missing"), { code: kind === "access" ? "EACCES" : "ENOENT" }) }; } });
    expect(fallback.code).toBe(0); expect(fallback.stderr).toContain("Interface not verified");
    expect(calls.length - prior).toBe(["spawn", "access"].includes(kind) ? 1 : 0);
    rmSync(record);
  }
  const missing = await menu(f, ["10"], extra);
  expect(missing.stderr).toContain("Interface not verified");
});

test("status reports the closed schema without changing disposable HOME", () => {
  const f = fixture(), before = snapshot(f), calls = [];
  const outputs = { gh: "gh version 2.90.1 (2026-01-01)", bun: "1.3.9\n",
    git: "git version 2.54.0", go: "go version go1.26.4 linux/amd64", "gentle-ai": "gentle-ai 4.0.0" };
  const result = invoke(f, ["status"], { bunVersion: null,
    runner: (command, args, options) => {
      calls.push([command, args]);
      expect(options.env.HOME).toBe(f.home);
      expect(options.timeout).toBeGreaterThan(0);
      expect(options.timeout).toBeLessThanOrEqual(3000);
      return { status: 0, stdout: outputs[command] };
    }, fsProbes: { executable: (name) => name === "pi", config: (path) => path === join(f.home, ".pi") } });
  success(result);
  expect(result.value).toEqual({ schema: "tower.v1.status/1",
    engine: { installed: false, status: "absent", active: null, previous: null }, projects: [],
    prerequisites: { gh: { present: true, version: "2.90.1", authenticated: true },
      bun: { present: true, version: "1.3.9" }, git: { present: true, version: "2.54.0" },
      go: { present: true, version: "1.26.4" }, gentleAi: { present: true, version: "4.0.0" } },
    agents: { claude: { executable: false, config: false }, pi: { executable: true, config: true },
      codex: { executable: false, config: false }, opencode: { executable: false, config: false } },
    system: { os: process.platform, arch: process.arch, shell: null }, version: null });
  expect(calls).toEqual([["gh", ["--version"]], ["gh", ["auth", "status", "--hostname", "github.com"]],
    ["bun", ["--version"]], ["git", ["--version"]], ["go", ["version"]], ["gentle-ai", ["version"]]]);
  expect(snapshot(f)).toEqual(before);
});

test("status isolates failed probes, bounds errors and never calls registered doctor", () => {
  const f = fixture(); ready(f);
  const before = snapshot(f), calls = [];
  const result = invoke(f, ["status"], { bunVersion: "1.3.14", operations: {
    doctorGlobal: () => { throw new Error("engine\nprivate"); },
    listProjects: () => { throw new Error("x".repeat(2000)); },
    doctorRegisteredProject: () => { throw new Error("must not publish"); },
  }, runner: (name, args) => {
    calls.push([name, args]);
    if (name === "gh" && args[0] === "--version") return { status: 0, stdout: "gh version 2.9.0 (date)" };
    if (name === "gh") return { status: 1 };
    if (name === "git") return { status: null, error: Object.assign(new Error("timeout\nsecret"), { code: "ETIMEDOUT" }) };
    throw new Error("missing\nsecret");
  }, fsProbes: { executable: () => { throw new Error("denied"); }, config: () => false } });
  success(result);
  expect(result.value.engine).toEqual({ installed: false, status: "error", active: null, previous: null, error: "engine" });
  expect(result.value.projects.error).toHaveLength(440);
  expect(result.value.prerequisites).toEqual({ gh: { present: true, version: "2.9.0", authenticated: false,
    error: "gh probe failed (1)" }, bun: { present: true, version: "1.3.14" },
    git: { present: true, error: "timeout" }, go: { present: false, error: "missing" }, gentleAi: { present: false, error: "missing" } });
  expect(calls.map(([name]) => name)).toEqual(["gh", "gh", "git", "go", "gentle-ai"]);
  expect(snapshot(f)).toEqual(before);
});

test("status overrides, engine identity and project projection are exact", () => {
  const f = fixture(), stateRoot = join(f.root, "state"), launcherPath = join(f.root, "launcher");
  const registryRoot = join(f.root, "registry"), sha = "a".repeat(64), seen = [];
  const deps = { env: { ...f.env, SHELL: "/bin/zsh" },
    runner: () => ({ status: 0, stdout: "unknown" }), operations: {
      doctorGlobal: (options) => { seen.push(options); return { status: "healthy", active: sha, previous: null }; },
      listProjects: (options) => { seen.push(options); return [{ projectRoot: "/example", registered: true, status: "missing", error: new Error("ignored") }]; },
    }, fsProbes: { executable: () => false, config: () => false } };
  const argv = ["status", "--registry", registryRoot, "--launcher", launcherPath, "--state", stateRoot];
  const result = invoke(f, argv, { ...deps, enginePath: join(stateRoot, "versions", sha, "product/tower/v1/cli.mjs") });
  success(result);
  expect(seen).toEqual([{ stateRoot, launcherPath, home: f.home, env: deps.env, runner: deps.runner }, { registryRoot }]);
  expect(result.value.engine.installed).toBe(true);
  expect(result.value.version).toBe(sha);
  expect(result.value.projects).toEqual([{ projectRoot: "/example", status: "missing" }]);
  expect(result.value.system.shell).toBe("zsh");
  expect(result.value.prerequisites.git).toEqual({ present: true, error: "unrecognized version output" });
  expect(invoke(f, argv, deps).value.version).toBeNull();
  expect(readdirSync(f.home)).toEqual([]);
});

test("status PATH lookup checks executable files and known config directories without execution", () => {
  const f = fixture(), bin = join(f.home, "bin"); mkdirSync(bin);
  writeFileSync(join(bin, "claude"), "must not execute", { mode: 0o755 });
  writeFileSync(join(bin, "codex"), "not executable", { mode: 0o600 });
  mkdirSync(join(bin, "pi"));
  mkdirSync(join(f.home, ".claude")); mkdirSync(join(f.home, ".config"));
  mkdirSync(join(f.home, ".config", "opencode")); writeFileSync(join(f.home, ".codex"), "not a directory");
  const before = snapshot(f);
  const result = invoke(f, ["status"], { env: { ...f.env, PATH: `${new URL("../../../../test/helpers/bin", import.meta.url).pathname}:${bin}` },
    runner: () => ({ status: 0, stdout: "unknown" }) });
  success(result);
  expect(result.value.agents).toEqual({ claude: { executable: true, config: true },
    pi: { executable: false, config: false }, codex: { executable: false, config: false },
    opencode: { executable: false, config: true } });
  expect(snapshot(f)).toEqual(before);
});

test("status live-reconciles installed engine and projects without changing any bytes", () => {
  const f = fixture(), r = release(), root = project(f);
  success(invoke(f, pinned("install", r), { runner: r.runner }));
  success(invoke(f, ["project", "init", "--project", root, "--trust", "trusted"]));
  writeFileSync(join(root, ".control-tower-adoption-v1", "state.json"), "{}");
  const before = snapshot(f);
  const result = invoke(f, ["status"], { runner: () => ({ status: 0, stdout: "unknown" }) });
  success(result);
  expect(result.value.engine).toEqual({ installed: true, status: "healthy", active: r.sha, previous: null,
    activeTag: "v1-test", previousTag: null,
    components: { skills: "ok", radar: "ok", signatures: "ok", pointers: "ok", gentleAi: { status: "missing", version: null } } });
  expect(result.value.projects).toEqual([{ projectRoot: root, status: "invalid" }]);
  expect(snapshot(f)).toEqual(before);
});

for (const args of [["extra"], ["--tag", "v1"], ["--project", "/tmp/x"], ["--registry"],
  ["--state", "relative"], ["--launcher", "/"], ["--registry", "relative"],
  ["--state", "/same", "--launcher", "/same"], ["--state", "/x", "--state", "/y"]]) {
  test(`status rejects invalid usage ${JSON.stringify(args)} before probing`, () => {
    const f = fixture(); let calls = 0;
    failed(invoke(f, ["status", ...args], { runner: () => { calls++; } }));
    expect(calls).toBe(0); expect(readdirSync(f.home)).toEqual([]);
  });
}

test("status accepts alternate version formats and reports absent executables", () => {
  const f = fixture();
  const result = invoke(f, ["status"], { bunVersion: null, runner: (name) => name === "git" ?
    { status: null, error: Object.assign(new Error("not found"), { code: "ENOENT" }) } :
    { status: 0, stdout: { gh: "gh version 2.90.1-pre.2 (date)", bun: " 1.4.0-canary.1\n",
      go: "go version go1.27rc1 linux/amd64", "gentle-ai": "gentle-ai 4.1.0-pre.1" }[name] } });
  success(result);
  expect(result.value.prerequisites).toEqual({ gh: { present: true, version: "2.90.1-pre.2", authenticated: true },
    bun: { present: true, version: "1.4.0-canary.1" }, git: { present: false, error: "not found" },
    go: { present: true, version: "1.27rc1" }, gentleAi: { present: true, version: "4.1.0-pre.1" } });
});

test("status unexpected output errors exit 1", () => {
  const f = fixture(); let stderr = "";
  expect(main(["status"], { env: f.env, runner: () => ({ status: 1 }),
    stdout: { write: () => { throw new Error("output failure"); } },
    stderr: { write: (text) => { stderr += text; } } })).toBe(1);
  expect(stderr).toBe("Invalid Tower CLI: output failure\n");
});

test("HOME is explicit, absolute and safe even with all overrides", () => {
  for (const HOME of [undefined, "", "relative", "/", "/tmp/../tmp", "/tmp/line\nbreak"]) {
    const f = fixture();
    failed(invoke(f, ["list", "--registry", join(f.root, "registry")], { env: { ...f.env, HOME } }));
    expect(readdirSync(f.home)).toEqual([]);
  }
});

test("pinned install, update, offline doctor and rollback use real global lifecycle", () => {
  const f = fixture(), first = release(), second = release("b");
  const installed = invoke(f, pinned("install", first), { runner: first.runner });
  success(installed);
  expect(installed.value).toMatchObject({ status: "installed", active: first.sha });
  expect(first.calls).toEqual([["gh", ["auth", "status", "--active", "--hostname", "github.com"]],
    ["gh", ["release", "download", "v1-test", "--repo", "achangkuon/control-tower",
      "--pattern", "tower.json", "--output", "-"]]]);
  success(invoke(f, ["doctor"]));
  const updated = invoke(f, pinned("update", second), { runner: second.runner });
  success(updated);
  expect(updated.value).toMatchObject({ active: second.sha, previous: first.sha });
  const offline = { runner: (command, ...args) => {
    if (command === "gh") throw new Error("must not acquire");
    return first.runner(command, ...args);
  } };
  expect(invoke(f, ["doctor"], offline).value.status).toBe("healthy");
  const rolled = invoke(f, ["rollback"], offline);
  success(rolled);
  expect(rolled.value.active).toBe(first.sha);
  expect(existsSync(f.registry)).toBe(false);
});

test("SHA mismatch and unavailable gh never publish state or fall back", () => {
  for (const unavailable of [false, true]) {
    const f = fixture(), r = release();
    const argv = pinned("install", { sha: "0".repeat(64) });
    const result = invoke(f, argv, { runner: unavailable ? () => ({ status: 1, stdout: Buffer.alloc(0) }) : r.runner });
    failed(result);
    expect(existsSync(f.state)).toBe(false);
    expect(existsSync(f.launcher)).toBe(false);
    if (!unavailable) expect(r.calls.length).toBe(2);
  }
});

test("invalid pinned identity fails without gh calls", () => {
  for (const [flag, value] of [["--tag", "latest"], ["--tag", "LATEST"],
    ["--asset", "setup.sh"], ["--sha256", "bad"], ["--sha256", "A".repeat(64)]]) {
    const f = fixture(), r = release(), argv = pinned("install", r);
    argv[argv.indexOf(flag) + 1] = value;
    failed(invoke(f, argv, { runner: r.runner }));
    expect(r.calls).toEqual([]);
    expect(existsSync(f.state)).toBe(false);
  }
});

test("global overrides are passed unchanged and missing override parents are never created", () => {
  const f = fixture(), r = release();
  const state = join(f.root, "custom-state"), launcher = join(f.root, "custom-command");
  const argv = [...pinned("install", r), "--state", state, "--launcher", launcher];
  success(invoke(f, argv, { runner: r.runner }));
  expect(existsSync(state)).toBe(true);
  expect(existsSync(launcher)).toBe(true);
  expect(existsSync(join(f.home, ".agents/skills/control-tower/SKILL.md"))).toBe(true);
  const other = fixture();
  failed(invoke(other, ["doctor", "--state", join(other.root, "missing", "state"),
    "--launcher", join(other.root, "command")]));
  expect(existsSync(join(other.root, "missing"))).toBe(false);
});

test("underlying modules reject malformed or overlapping overrides", () => {
  for (const flags of [["--state", "relative"], ["--launcher", "relative"],
    ["--state", "/"], ["--state", "/tmp/shared", "--launcher", "/tmp/shared/command"]]) {
    const f = fixture();
    failed(invoke(f, ["doctor", ...flags]));
  }
  const f = fixture(), path = project(f);
  failed(invoke(f, ["project", "init", "--project", path, "--trust", "trusted", "--registry", path]));
  expect(readdirSync(path).sort()).toEqual([".git", "sentinel"]);
  failed(invoke(f, ["list", "--registry", "relative"]));
});

test("default directory preparation never follows a symlink", () => {
  const f = fixture(), external = join(f.root, "external");
  mkdirSync(external);
  symlinkSync(external, join(f.home, ".local"));
  failed(invoke(f, ["list"]));
  expect(readdirSync(external)).toEqual([]);
});

test("writable default directories name the path, mode and fix without changing permissions", () => {
  for (const mode of [0o775, 0o757]) {
    const f = fixture(), r = release(), path = join(f.home, ".local");
    mkdirSync(path);
    chmodSync(path, mode);
    const before = snapshot(f);
    for (const argv of [["doctor"], ["list"]]) {
      const result = invoke(f, argv, { runner: r.runner });
      failed(result);
      expect(result.stderr).toBe(`Invalid Tower CLI: default directory ${path} is group- or world-writable ` +
        `(mode ${mode.toString(8)}); run: chmod 755 ${path} (or set umask 022 before installing)\n`);
      expect(snapshot(f)).toEqual(before);
    }
    expect(r.calls).toEqual([]);
  }
});

test("default directory ownership mismatch identifies the directory and another user", () => {
  const f = fixture(), before = snapshot(f), uid = process.getuid();
  const owner = spyOn(process, "getuid").mockReturnValue(uid + 1);
  try {
    const result = invoke(f, ["list"]);
    failed(result);
    expect(result.stderr).toBe(`Invalid Tower CLI: default directory ${f.home} is owned by another user\n`);
  } finally { owner.mockRestore(); }
  expect(snapshot(f)).toEqual(before);
});

test("created default parents are 755 under umask 002 and 077; existing directories retain their modes", () => {
  for (const mask of [0o002, 0o077]) {
    const f = fixture(), r = release(), existing = join(f.home, ".local");
    mkdirSync(existing, { mode: 0o700 });
    chmodSync(existing, 0o700);
    const previous = process.umask(mask);
    try { success(invoke(f, pinned("install", r), { runner: r.runner })); }
    finally { process.umask(previous); }
    expect(statSync(f.home).mode & 0o777).toBe(0o700);
    expect(statSync(existing).mode & 0o777).toBe(0o700);
    for (const path of [join(existing, "share"), f.share, join(existing, "bin")]) {
      expect(statSync(path).mode & 0o777).toBe(0o755);
    }
    success(invoke(f, ["doctor"]));
  }
});

test("registered init, doctor, list and uninstall preserve local results and reconcile live state", () => {
  const f = fixture(), path = project(f);
  const local = (op) => ["project", op, "--project", path];
  const installed = invoke(f, [...local("init"), "--trust", "trusted"]);
  success(installed);
  expect(installed.value).toMatchObject({ localResult: { status: "installed" }, registry: { status: "recorded" } });
  const checked = invoke(f, local("doctor"));
  success(checked);
  expect(checked.value.localResult.status).toBe("healthy");
  const before = readFileSync(join(f.registry, "registry.json"));
  expect(invoke(f, ["list"]).value).toEqual([{ projectRoot: path, registered: true, status: "healthy", towerState: "needs-plan" }]);
  success(invoke(f, local("uninstall")));
  expect(invoke(f, ["list"]).value).toEqual([{ projectRoot: path, registered: true, status: "unadopted", towerState: "skills-only" }]);
  expect(readFileSync(join(f.registry, "registry.json"))).toEqual(before);
  expect(readFileSync(join(path, "sentinel"), "utf8")).toBe("unrelated");
  // Uninstall already removed the journal: cleanup must fail closed, not invent residue.
  failed(invoke(f, local("cleanup")));
});

test("cleanup wrapper delegates for fully restored journal residue", () => {
  const f = fixture(), path = project(f);
  success(invoke(f, ["project", "init", "--project", path, "--trust", "trusted"]));
  const state = JSON.parse(readFileSync(join(path, ".control-tower-adoption-v1", "state.json")));
  restoreProjectFiles(path, state.original);
  restoreProjectFiles(path, state.instructions.original);
  const result = invoke(f, ["project", "cleanup", "--project", path]);
  success(result);
  expect(result.value.localResult.status).toBe("cleaned");
});

test("S196 activation refreshes the explicit CLI registry rather than the default", () => {
  const f = fixture(), path = project(f), registry = join(f.root, "index");
  success(invoke(f, ["project", "init", "--registry", registry, "--project", path, "--trust", "trusted"]));
  const r = release("s196");
  const installed = invoke(f, [...pinned("install", r), "--registry", registry], { runner: r.runner });
  success(installed);
  expect(installed.value.projects).toEqual([{ projectRoot: path, status: "refreshed" }]);
  expect(readFileSync(join(path, "AGENTS.md"), "utf8")).toContain("Control Tower v1-test;");
  const updated = invoke(f, [...pinned("update", r), "--registry", registry], { runner: r.runner });
  success(updated);
  expect(updated.value.projects).toEqual([{ projectRoot: path, status: "unchanged" }]);
  expect(existsSync(f.registry)).toBe(false);
});

test("registry override is exact; project root is never inferred or normalized", () => {
  const f = fixture(), path = project(f), registry = join(f.root, "index");
  success(invoke(f, ["project", "init", "--registry", registry, "--project", path, "--trust", "trusted"]));
  expect(readdirSync(f.home)).toEqual([]);
  expect(invoke(f, ["list", "--registry", registry]).value[0].status).toBe("healthy");
  failed(invoke(f, ["project", "doctor", "--project", "relative", "--registry", registry]));
  failed(invoke(f, ["project", "doctor", "--project", `${path}/../project`, "--registry", registry]));
  failed(invoke(f, ["list", "--registry", join(f.root, "missing", "registry")]));
  expect(existsSync(join(f.root, "missing"))).toBe(false);
});

test("publication failure reports local success, JSON evidence and nonzero status without rollback claims", () => {
  const f = fixture(), path = project(f);
  const result = invoke(f, ["project", "init", "--project", path, "--trust", "trusted"], {
    operations: { initRegisteredProject: (options) => initRegisteredProject({ ...options,
      fault: (point) => { if (point === "before-rename") throw new Error("publication\nfailed"); } }) },
  });
  expect(result.code).toBe(1);
  expect(result.value).toMatchObject({ localResult: { status: "installed" }, registry: { status: "failed", published: false } });
  expect(result.stdout).toBe(`${JSON.stringify(result.value)}\n`);
  expect(result.stderr).toMatch(/^Invalid Tower CLI: local operation succeeded but registry publication failed[^\r\n]*\n$/);
  expect(result.stderr.toLowerCase()).not.toContain("rollback");
  expect(existsSync(join(path, ".control-tower-adoption-v1"))).toBe(true);
  expect(doctorRegisteredProject({ projectRoot: path, registryRoot: f.registry }).localResult.status).toBe("healthy");
});

test("published-but-unlock-failed is still nonzero and retains recovery evidence", () => {
  const f = fixture(), path = project(f);
  const result = invoke(f, ["project", "init", "--project", path, "--trust", "trusted"], {
    operations: { initRegisteredProject: (options) => initRegisteredProject({ ...options,
      fault: (point) => { if (point === "before-unlock") throw new Error("lock cleanup failed"); } }) },
  });
  expect(result.code).toBe(1);
  expect(result.value.registry).toMatchObject({ status: "failed", published: true });
  expect(result.value.localResult.status).toBe("installed");
  expect(result.stderr).toContain("local operation succeeded but registry publication failed");
  expect(existsSync(join(f.registry, ".lock"))).toBe(true);
  failed(invoke(f, ["list"]));
});

for (const error of [new TypeError("type\r\nstack"), new Error("x".repeat(2000)),
  new AggregateError([new Error("inner")], "compensation\nfailed")]) {
  test(`bounded single-line thrown ${error.name}`, () => {
    const f = fixture();
    ready(f);
    const result = invoke(f, ["doctor"], { operations: { doctorGlobal: () => { throw error; } } });
    if (error instanceof AggregateError) {
      expect(result.code).toBe(1);
      expect(result.stdout).toBe("");
      const lines = result.stderr.trimEnd().split("\n");
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain("carries recovery evidence");
      expect(JSON.parse(lines[1])).toEqual({ type: "tower.cli.recovery/1", errors: ["inner"], omitted: 0 });
    } else failed(result);
    expect(result.stderr.length).toBeLessThanOrEqual(600);
  });
}

test("real entrypoint: usage failure and empty list use only isolated environment", () => {
  const f = fixture();
  const usage = spawnSync(process.execPath, [entry], { env: f.env, encoding: "utf8", timeout: 10_000 });
  failed({ code: usage.status, stdout: usage.stdout, stderr: usage.stderr });
  expect(readdirSync(f.home)).toEqual([]);
  const listed = spawnSync(process.execPath, [entry, "list"], { env: f.env, encoding: "utf8", timeout: 10_000 });
  expect(listed.status).toBe(0);
  expect(listed.stdout).toBe("[]\n");
  expect(listed.stderr).toBe("");
  expect(existsSync(f.registry)).toBe(false);
});

const snapshot = (f) => {
  const tree = path => {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) return { link: readlinkSync(path) };
    if (stat.isDirectory()) return { mode: stat.mode & 0o777, entries: Object.fromEntries(readdirSync(path).sort().map(name => [name, tree(join(path, name))])) };
    return { mode: stat.mode & 0o777, bytes: readFileSync(path).toString("base64") };
  };
  return tree(f.root);
};
async function menu(f, lines, extra = {}) {
  let stdout = "", stderr = "";
  const prompts = [];
  const code = await main([], { env: { ...f.env, TOWER_MENU: "plain" },
    stdin: { isTTY: true }, stdout: { isTTY: true, write: (text) => { stdout += text; } },
    stderr: { write: (text) => { stderr += text; } },
    readLine: (prompt) => { prompts.push(prompt); return lines.shift() ?? null; }, ...extra });
  const last = stdout.trimEnd().split("\n").at(-1);
  return { code, stdout, stderr, prompts, value: last?.startsWith("{") || last?.startsWith("[") ? JSON.parse(last) : undefined };
}

test("fresh default doctor and list do not prepare HOME", () => {
  const f = fixture(), before = snapshot(f);
  const checked = invoke(f, ["doctor"]);
  success(checked);
  expect(checked.value).toEqual({ status: "absent", active: null, previous: null, components: { skills: "missing", radar: "missing", signatures: "missing", pointers: "missing", gentleAi: { status: "ok", version: "4.0.0" } } });
  success(invoke(f, ["list"]));
  expect(snapshot(f)).toEqual(before);
});

test("read-only defaults validate existing ancestors without creating missing siblings", () => {
  const f = fixture();
  mkdirSync(join(f.home, ".local"), { mode: 0o700 });
  const before = snapshot(f);
  success(invoke(f, ["doctor"]));
  success(invoke(f, ["list"]));
  expect(snapshot(f)).toEqual(before);
});

test("project doctor remains a registered writer at the CLI level", () => {
  const f = fixture(), path = project(f);
  success(invoke(f, ["project", "init", "--project", path, "--trust", "trusted",
    "--registry", join(f.root, "separate-registry")]));
  expect(existsSync(f.registry)).toBe(false);
  const checked = invoke(f, ["project", "doctor", "--project", path]);
  success(checked);
  expect(checked.value.registry.status).toBe("recorded");
  expect(existsSync(join(f.registry, "registry.json"))).toBe(true);
});

test("SHA mismatch on update leaves complete installed state and launcher untouched", () => {
  const f = fixture(), first = release(), second = release("b");
  success(invoke(f, pinned("install", first), { runner: first.runner }));
  const before = snapshot(f);
  failed(invoke(f, pinned("update", { sha: "0".repeat(64) }), { runner: second.runner }));
  expect(snapshot(f)).toEqual(before);
});

test("activation failure after state rename compensates launcher, pointers and publication", () => {
  const f = fixture(), first = release(), second = release("b");
  success(invoke(f, pinned("install", first), { runner: first.runner }));
  const before = snapshot(f);
  failed(invoke(f, pinned("update", second), { runner: second.runner,
    operations: { updateGlobal: (options) => updateGlobal({ ...options,
      fault: (point) => { if (point === "state-active") throw new Error("activation failed"); } }) } }));
  expect(snapshot(f)).toEqual(before);
  expect(invoke(f, ["doctor"]).value.active).toBe(first.sha);
});

test("unknown default launcher is preserved and blocks installation", () => {
  const f = fixture(), r = release();
  mkdirSync(join(f.home, ".local", "bin"), { recursive: true, mode: 0o700 });
  mkdirSync(join(f.home, ".local", "share", "torre-control"), { recursive: true, mode: 0o700 });
  writeFileSync(f.launcher, "unknown launcher\n", { mode: 0o755 });
  const before = snapshot(f);
  failed(invoke(f, pinned("install", r), { runner: r.runner }));
  expect(snapshot(f)).toEqual(before);
});

test("real compensation failure emits inner errors and retains journal evidence", () => {
  const f = fixture(), first = release(), second = release("b");
  success(invoke(f, pinned("install", first), { runner: first.runner }));
  const result = invoke(f, pinned("update", second), { runner: second.runner,
    operations: { updateGlobal: (options) => updateGlobal({ ...options,
      fault: (point) => { if (["state-active", "compensation"].includes(point)) throw new Error(`injected ${point}`); } }) } });
  expect(result.code).toBe(1);
  const lines = result.stderr.trimEnd().split("\n");
  expect(lines).toHaveLength(2);
  expect(JSON.parse(lines[1])).toEqual({ type: "tower.cli.recovery/1",
    errors: ["injected state-active", "injected compensation"], omitted: 0 });
  expect(result.stderr).not.toContain("\n    at ");
  expect(existsSync(join(f.state, ".transaction", "recovery.json"))).toBe(true);
});

test("AggregateError evidence bounds count, message length and line breaks", () => {
  const f = fixture();
  ready(f);
  const error = new AggregateError(Array.from({ length: 20 }, () => new Error("x".repeat(1000) + "\nprivate stack")), "failure");
  const result = invoke(f, ["doctor"], { operations: { doctorGlobal: () => { throw error; } } });
  expect(result.code).toBe(1);
  const lines = result.stderr.trimEnd().split("\n");
  expect(lines).toHaveLength(2);
  const evidence = JSON.parse(lines[1]);
  expect(evidence.errors).toHaveLength(8);
  expect(evidence.omitted).toBe(12);
  expect(evidence.errors.every((text) => text.length === 240 && !/[\r\n]/.test(text))).toBe(true);
  expect(result.stderr.length).toBeLessThan(2600);
});

test("no-argument menu requires both TTYs; explicit commands never read a menu", async () => {
  const f = fixture();
  for (const [input, output] of [[false, false], [false, true], [true, false]]) {
    const result = await menu(f, ["10"], { stdin: { isTTY: input },
      stdout: { isTTY: output, write: () => {} } });
    expect(result.code).toBe(1);
    expect(result.prompts).toEqual([]);
  }
  success(invoke(f, ["list"], { stdin: { isTTY: true },
    readLine: () => { throw new Error("scriptable command opened menu"); } }));
  expect(readdirSync(f.home)).toEqual([]);
});

test("menu install uses typed pinned SHA and never adopts a project", async () => {
  const f = fixture(), r = release();
  const result = await menu(f, ["1", "v1-test", "tower.json", r.sha], { runner: r.runner });
  expect(result.code).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.value).toMatchObject({ status: "installed", active: r.sha });
  expect(result.prompts).toEqual(["Choice: ", "Tag: ", "Asset: ", "SHA256 (type the trusted digest): "]);
  expect(existsSync(f.registry)).toBe(false);
});

test("menu entries are only closed dispatch commands with exact required inputs", async () => {
  const entries = [
    ["2", ["v1-test", "tower.json", "a".repeat(64), "UPDATE"], "updateGlobal"],
    ["3", [], "doctorGlobal"], ["4", ["ROLLBACK"], "rollbackGlobal"],
    ["5", ["/explicit/project", "trusted"], "initRegisteredProject"],
    ["6", ["/explicit/project"], "doctorRegisteredProject"],
    ["7", ["/explicit/project", "UNINSTALL"], "uninstallRegisteredProject"],
    ["8", ["/explicit/project", "CLEANUP"], "cleanupRegisteredProject"],
    ["9", [], "listProjects"],
  ];
  for (const [choice, answers, operation] of entries) {
    const f = fixture(), calls = [], path = project(f);
    ready(f);
    const result = await menu(f, [choice, ...answers.map(answer => answer === "/explicit/project" ? path : answer)], { operations: { [operation]: (options) => {
      calls.push(options);
      return operation.endsWith("Project") ? { localResult: {}, registry: { status: "recorded" } } : {};
    } } });
    expect(result.code).toBe(0);
    expect(calls).toHaveLength(1);
    expect(result.prompts).toHaveLength(1 + answers.length);
    if (choice === "2") expect(calls[0].acquire.sha256).toBe("a".repeat(64));
    if (["5", "6", "7", "8"].includes(choice)) expect(calls[0].projectRoot).toBe(path);
  }
});

test("destructive menu actions decline without any effect or acquisition", async () => {
  for (const [choice, answers] of [["2", ["v1-test", "tower.json", "a".repeat(64)]],
    ["4", []], ["7", ["/explicit/project"]], ["8", ["/explicit/project"]]]) {
    for (const confirmation of ["yes", "", null]) {
      const f = fixture(), r = release();
      success(invoke(f, pinned("install", r), { runner: r.runner }));
      const before = snapshot(f), calls = r.calls.length;
      const result = await menu(f, [choice, ...answers, confirmation], { runner: r.runner });
      expect(result.code).toBe(1);
      expect(snapshot(f)).toEqual(before);
      expect(r.calls).toHaveLength(calls);
    }
  }
});

test("exit, EOF, invalid choices and incomplete menu inputs never dispatch", async () => {
  for (const lines of [["10"], [], ["unknown"], ["0"], ["11"], ["1"],
    ["1", "v1-test", "tower.json", ""], ["5", "relative", "trusted"], ["5", "/explicit/project", "yes"]]) {
    const f = fixture(), before = snapshot(f), r = release();
    const explicitExit = lines[0] === "10";
    const result = await menu(f, lines, { runner: r.runner });
    expect(result.code).toBe(explicitExit ? 0 : 1);
    expect(snapshot(f)).toEqual(before);
    expect(r.calls).toEqual([]);
  }
});

test("read-only missing defaults never hide foreign launchers or unsafe overrides", () => {
  const f = fixture();
  mkdirSync(join(f.home, ".local", "bin"), { recursive: true, mode: 0o700 });
  writeFileSync(f.launcher, "foreign launcher", { mode: 0o755 });
  const before = snapshot(f);
  failed(invoke(f, ["doctor"]));
  failed(invoke(f, ["doctor", "--state", "relative"]));
  failed(invoke(f, ["doctor", "--state", join(f.root, "missing", "state")]));
  expect(snapshot(f)).toEqual(before);
});

test("successful empty read-only overrides do not prepare defaults", () => {
  const f = fixture(), before = snapshot(f);
  success(invoke(f, ["doctor", "--state", join(f.root, "state"), "--launcher", join(f.root, "launcher")]));
  success(invoke(f, ["list", "--registry", join(f.root, "registry")]));
  expect(snapshot(f)).toEqual(before);
});

test("registry compensation AggregateError also prints bounded recovery errors", () => {
  const f = fixture(), path = project(f);
  const result = invoke(f, ["project", "init", "--project", path, "--trust", "trusted"], {
    operations: { initRegisteredProject: (options) => initRegisteredProject({ ...options,
      fault: (point) => { if (["before-rename", "before-temp-cleanup"].includes(point)) throw new Error(`injected ${point}`); } }) },
  });
  expect(result.code).toBe(1);
  expect(result.value).toMatchObject({ localResult: { status: "installed" }, registry: { status: "failed" } });
  const lines = result.stderr.trimEnd().split("\n");
  expect(lines).toHaveLength(2);
  expect(JSON.parse(lines[1]).errors).toEqual(["injected before-rename", "injected before-temp-cleanup"]);
  expect(result.stderr).not.toContain("\n    at ");
});

test("menu confirmation accepted dispatches a real rollback", async () => {
  const f = fixture(), first = release(), second = release("b");
  success(invoke(f, pinned("install", first), { runner: first.runner }));
  success(invoke(f, pinned("update", second), { runner: second.runner }));
  const result = await menu(f, ["4", "ROLLBACK"], { runner: second.runner });
  expect(result.code).toBe(0);
  expect(result.value).toMatchObject({ active: first.sha, previous: second.sha });
  expect(invoke(f, ["doctor"]).value.active).toBe(first.sha);
});

// Emit bytes only after the menu has subscribed; each run has a bounded EOF.
async function ttyMenu(f, chunks, extra = {}) {
  const stdin = extra.stdin ?? new PassThrough();
  stdin.isTTY = true;
  const modes = [];
  if (!extra.stdin) stdin.setRawMode = (mode) => { modes.push(mode); stdin.isRaw = mode; };
  let stdout = "", stderr = "";
  const pending = main([], { env: { ...f.env, TERM: "xterm" }, stdin,
    stdout: { isTTY: true, write: (text) => { stdout += text; } },
    stderr: { write: (text) => { stderr += text; } }, ...extra });
  for (const chunk of chunks) {
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (typeof chunk === "function") await chunk(stdin);
    else stdin.write(chunk);
  }
  stdin.end();
  const code = await pending;
  return { code, stdout, stderr, modes, stdin };
}
function restored(result) {
  expect(result.modes.at(-1)).toBe(false);
  expect(result.stdout).toContain("\x1b[?25h\x1b[?1049l");
  expect(result.stdin.listenerCount("data")).toBe(0);
}

test("visual arrows and CR LF select list, restore before dispatch and honor NO_COLOR", async () => {
  for (const noColor of [false, true]) {
    const f = fixture(), before = snapshot(f);
    const result = await ttyMenu(f, ["\x1b[B".repeat(8), "\r", "\n"], {
      env: { ...f.env, TERM: "xterm", ...(noColor ? { NO_COLOR: "" } : {}) },
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("[]\n");
    expect(/\x1b\[[0-9;]*m/.test(result.stdout)).toBe(!noColor);
    restored(result);
    expect(snapshot(f)).toEqual(before);
  }
});

test("visual SS3/split arrows and edited project root tolerate split CR LF", async () => {
  const f = fixture(), calls = [], path = project(f);
  const result = await ttyMenu(f, ["\x1b", "O", "B", "j".repeat(5), "\x1bOA", "\r", "\n",
    `${path}X\x7f\r`, "\n"], { operations: {
    doctorRegisteredProject: (options) => { calls.push(options); return { registry: { status: "recorded" } }; },
  } });
  expect(result.stderr).toContain("Interface not verified");
  expect(result.code).toBe(0);
  expect(calls).toHaveLength(1);
  expect(calls[0].projectRoot).toBe(path);
  restored(result);
});

for (const key of ["q", "\x1b", "\x03"]) test(`visual cancellation ${JSON.stringify(key)} has no effect`, async () => {
  const f = fixture(), before = snapshot(f);
  const result = await ttyMenu(f, [key]);
  expect(result.code).toBe(0);
  restored(result);
  expect(snapshot(f)).toEqual(before);
});

test("visual exceptions, EOF, SIGINT and process exit restore the terminal", async () => {
  for (const event of ["error", "end", "SIGINT", "exit"]) {
    const f = fixture(), before = snapshot(f);
    const counts = [process.listenerCount("SIGINT"), process.listenerCount("exit")];
    const result = await ttyMenu(f, [(stdin) => {
      if (event === "error") stdin.emit("error", new Error("injected input error"));
      else if (event === "end") stdin.end();
      else process.emit(event);
    }]);
    expect(result.code).toBe(event === "error" || event === "end" ? 1 : 0);
    restored(result);
    expect([process.listenerCount("SIGINT"), process.listenerCount("exit")]).toEqual(counts);
    expect(snapshot(f)).toEqual(before);
  }
});

test("numbered fallback fixes CR LF and cooked icrnl double LF for project doctor", async () => {
  for (const mode of ["plain", "dumb", "missing", "throws"]) {
    const f = fixture(), calls = [], path = project(f);
    const cooked = mode === "missing" || mode === "throws";
    const result = await ttyMenu(f, [cooked ? "6\n\n" : "6\r\n", `${path}\r\n`], {
      env: { ...f.env, TERM: mode === "dumb" ? "dumb" : "xterm", TOWER_MENU: mode === "plain" ? "plain" : "" },
      ...(cooked ? { stdin: Object.assign(new PassThrough(), { isTTY: true,
        ...(mode === "throws" ? { setRawMode: () => { throw new Error("unavailable"); } } : {}) }) } : {}),
      operations: { doctorRegisteredProject: (options) => {
        calls.push(options); return { registry: { status: "recorded" } };
      } },
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("6. project doctor");
    expect(result.stdout).not.toContain("\x1b[?1049h");
    expect(calls[0].projectRoot).toBe(path);
  }
});

test("raw confirmations decline and bounded empty answers/EOF never dispatch", async () => {
  for (const chunks of [["jjj\r\n", "no\r\n"], ["jjj\n", "\n\n\n"], ["jjj\r"]]) {
    const f = fixture(), before = snapshot(f);
    const result = await ttyMenu(f, chunks, { operations: {
      rollbackGlobal: () => { throw new Error("must not dispatch"); },
    } });
    expect(result.code).toBe(1);
    restored(result);
    expect(snapshot(f)).toEqual(before);
  }
});

test("selection restores before dispatch even when the selected operation throws", async () => {
  const f = fixture();
  ready(f);
  const stdin = Object.assign(new PassThrough(), { isTTY: true });
  let raw = false, output = "", errors = "", called = false;
  stdin.setRawMode = (mode) => { raw = mode; };
  const pending = main([], { env: { ...f.env, TERM: "xterm" }, stdin,
    stdout: { isTTY: true, write: (text) => { output += text; } },
    stderr: { write: (text) => { errors += text; } }, operations: {
      listProjects: () => {
        called = true;
        expect(raw).toBe(false);
        expect(output.endsWith("\x1b[?25h\x1b[?1049l")).toBe(true);
        expect(stdin.listenerCount("data")).toBe(0);
        throw new Error("dispatch failed");
      },
    } });
  stdin.write("j".repeat(8) + "\r\n");
  expect(await pending).toBe(1);
  expect(called).toBe(true);
  expect(errors).toContain("dispatch failed");
  expect(raw).toBe(false);
  stdin.end();
});

test("standalone Esc timeout, raw prompt Ctrl-C and cooked empty retry bound", async () => {
  for (const chunks of [["\x1b", async () => { await new Promise((resolve) => setTimeout(resolve, 80)); }],
    ["jjj\r\n", "\x03"]]) {
    const f = fixture(), before = snapshot(f);
    const result = await ttyMenu(f, chunks);
    expect(result.code).toBe(0);
    restored(result);
    expect(snapshot(f)).toEqual(before);
  }
  const f = fixture(), before = snapshot(f);
  const result = await ttyMenu(f, ["\n\n\n"], {
    stdin: Object.assign(new PassThrough(), { isTTY: true }),
  });
  expect(result.code).toBe(1);
  expect(result.stdout.match(/Choice: /g)).toHaveLength(3);
  expect(snapshot(f)).toEqual(before);
});

test("passive import performs no filesystem, subprocess or output I/O", () => {
  const f = fixture();
  const script = `import { spyOn } from 'bun:test';
    const fs = await import('node:fs');
    const cp = await import('node:child_process');
    const spies = ['mkdirSync','lstatSync','readFileSync','openSync','writeFileSync'].map(k => spyOn(fs,k));
    spies.push(spyOn(cp,'spawnSync'),spyOn(process.stdout,'write'),spyOn(process.stderr,'write'));
    await import(${JSON.stringify(entry)});
    if (spies.some(s => s.mock.calls.length)) process.exitCode = 9;`;
  const result = spawnSync(process.execPath, ["--eval", script], { env: f.env, encoding: "utf8", timeout: 10_000 });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
  expect(readdirSync(f.home)).toEqual([]);
});
