import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { main } from "../cli.mjs";
import { BUNDLE_MEMBERS } from "../bundle.mjs";
import { initRegisteredProject, doctorRegisteredProject } from "../projects.mjs";
import { restoreProjectFiles } from "../project-files.mjs";

const entry = new URL("../cli.mjs", import.meta.url).pathname;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
// Only disposable roots are used, including subprocess HOME, Git and GitHub configuration.
function fixture() {
  const root = mkdtempSync("/tmp/tower-cli-");
  const home = join(root, "home");
  mkdirSync(home, { mode: 0o700 });
  const env = { PATH: process.env.PATH, HOME: home, XDG_DATA_HOME: join(root, "data"),
    XDG_CONFIG_HOME: join(root, "config"), XDG_CACHE_HOME: join(root, "cache"),
    GH_CONFIG_DIR: join(root, "gh"), GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  const share = join(home, ".local", "share", "torre-control");
  return { root, home, env, share, state: join(share, "v1"),
    registry: join(share, "projects"), launcher: join(home, ".local", "bin", "torre-control") };
}
function invoke(f, argv, extra = {}) {
  let stdout = "", stderr = "";
  const code = main(argv, { env: f.env, stdout: { write: (text) => { stdout += text; } },
    stderr: { write: (text) => { stderr += text; } }, ...extra });
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
    ...["adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli"]
      .map((name) => `product/tower/v1/${name}.mjs`)];
  const members = paths.map((path) => {
    const bytes = Buffer.from(`opaque ${label}: ${path}\n`);
    return { path, type: "file", encoding: "base64", byteLength: bytes.length,
      sha256: digest(bytes), bytes: bytes.toString("base64") };
  });
  const wire = Buffer.from(JSON.stringify({ schema: "tower.v1.release/1", members }));
  const calls = [];
  return { sha: digest(wire), calls, runner: (command, argv) => {
    calls.push([command, argv]);
    return { status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : wire };
  } };
}
const pinned = (command, r) => [command, "--tag", "v1-test", "--asset", "tower.json", "--sha256", r.sha];
function project(f) {
  const path = join(f.root, "project");
  mkdirSync(path);
  expect(spawnSync("git", ["init", "--quiet", path], { env: f.env }).status).toBe(0);
  writeFileSync(join(path, "sentinel"), "unrelated");
  return path;
}

const invalid = [[], ["unknown"], ["toString"], ["__proto__"], ["uninstall"], ["project"], ["project", "unknown"],
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
  const updated = invoke(f, pinned("update", second), { runner: second.runner });
  success(updated);
  expect(updated.value).toMatchObject({ active: second.sha, previous: first.sha });
  const offline = { runner: () => { throw new Error("must not acquire"); } };
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
  expect(readdirSync(f.home)).toEqual([]);
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
  expect(invoke(f, ["list"]).value).toEqual([{ projectRoot: path, registered: true, status: "healthy" }]);
  success(invoke(f, local("uninstall")));
  expect(invoke(f, ["list"]).value[0].status).toBe("unadopted");
  expect(readFileSync(join(f.registry, "registry.json"))).toEqual(before);
  expect(readFileSync(join(path, "sentinel"), "utf8")).toBe("unrelated");
});

test("cleanup wrapper delegates for fully restored journal residue", () => {
  const f = fixture(), path = project(f);
  success(invoke(f, ["project", "init", "--project", path, "--trust", "trusted"]));
  const state = JSON.parse(readFileSync(join(path, ".control-tower-adoption-v1", "state.json")));
  restoreProjectFiles(path, state.original);
  const result = invoke(f, ["project", "cleanup", "--project", path]);
  success(result);
  expect(result.value.localResult.status).toBe("cleaned");
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
    const result = invoke(f, ["doctor"], { operations: { doctorGlobal: () => { throw error; } } });
    failed(result);
    expect(result.stderr.length).toBeLessThanOrEqual(600);
    if (error instanceof AggregateError) expect(result.stderr).toContain("carries recovery evidence");
  });
}

test("real entrypoint: usage failure and empty list use only isolated environment", () => {
  const f = fixture();
  const usage = spawnSync(process.execPath, [entry], { env: f.env, encoding: "utf8" });
  failed({ code: usage.status, stdout: usage.stdout, stderr: usage.stderr });
  expect(readdirSync(f.home)).toEqual([]);
  const listed = spawnSync(process.execPath, [entry, "list"], { env: f.env, encoding: "utf8" });
  expect(listed.status).toBe(0);
  expect(listed.stdout).toBe("[]\n");
  expect(listed.stderr).toBe("");
  expect(existsSync(f.registry)).toBe(false);
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
  const result = spawnSync(process.execPath, ["--eval", script], { env: f.env, encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
  expect(readdirSync(f.home)).toEqual([]);
});
