import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { BUNDLE_MEMBERS, validateBundle } from "../bundle.mjs";
import { captureProjectFiles, compareProjectFiles } from "../project-files.mjs";
import { initProject, doctorProject, uninstallProject } from "../adoption.mjs";

const journal = ".control-tower-adoption-v1";
const targets = [".control-tower/radar", ".agents/skills/control-tower", ".claude/skills/control-tower"];
const observed = [".control-tower", ".agents", ".claude", "AGENTS.md", "CLAUDE.md", journal];
const source = new URL("../../../..", import.meta.url).pathname;
function put(root, name, bytes, mode = 0o640) {
  const path = join(root, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  chmodSync(path, mode);
}
function fixture(fn) {
  const base = mkdtempSync(join(tmpdir(), "tower-adoption-"));
  const projectRoot = join(base, "project");
  const home = join(base, "home");
  mkdirSync(projectRoot); mkdirSync(home);
  const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: join(base, "xdg"), TMPDIR: join(base, "tmp") };
  mkdirSync(env.XDG_CONFIG_HOME); mkdirSync(env.TMPDIR);
  put(home, "sentinel", Buffer.from([0, 255]));
  put(env.XDG_CONFIG_HOME, "sentinel", "xdg unchanged");
  put(env.TMPDIR, "sentinel", "tmp unchanged");
  const git = spawnSync("git", ["init", "--quiet", projectRoot], { env });
  if (git.status !== 0) throw new Error(`git init failed: ${git.stderr}`);
  put(projectRoot, "AGENTS.md", "leave agents alone");
  put(projectRoot, "CLAUDE.md", "leave claude alone");
  const outside = [home, env.XDG_CONFIG_HOME, env.TMPDIR];
  const sentinels = outside.map((root) => captureProjectFiles(root, ["sentinel"]));
  const outsideTrees = outside.map((root) => captureProjectFiles(root, readdirSync(root)));
  try { return fn({ projectRoot, base, env }); }
  finally {
    for (const [i, root] of outside.entries()) {
      expect(captureProjectFiles(root, ["sentinel"])).toEqual(sentinels[i]);
      expect(captureProjectFiles(root, readdirSync(root))).toEqual(outsideTrees[i]);
    }
    rmSync(base, { recursive: true, force: true });
  }
}
const snapshot = (root) => captureProjectFiles(root, observed);
const trusted = (projectRoot) => ({ projectRoot, trustResolution: "trusted" });
const unchangedFailure = (root, action) => {
  const before = snapshot(root);
  expect(action).toThrow();
  expect(snapshot(root)).toEqual(before);
};

describe("project-local lifecycle API", () => {
  test("trusted absent-destination round trip installs exact bundle and leaves host instructions and HOME untouched", () => fixture(({ projectRoot }) => {
    const before = snapshot(projectRoot);
    const manifest = validateBundle(source);
    expect(Object.isFrozen(initProject(trusted(projectRoot)))).toBe(true);
    const state = JSON.parse(readFileSync(join(projectRoot, journal, "state.json"), "utf8"));
    expect(Object.keys(state).sort()).toEqual(["installed", "original", "schema"]);
    expect(state.schema).toBe("tower.v1.adoption/1");
    expect(state.original.destinations.map((d) => d.path)).toEqual([...targets].sort());
    expect(state.installed.destinations.map((d) => d.path)).toEqual([...targets].sort());
    for (const member of BUNDLE_MEMBERS) {
      const destination = member.destination.startsWith("radar/") ? targets[0] : targets[1];
      const name = member.destination.startsWith("radar/") ? member.destination.slice(6) : member.destination.slice("skills/control-tower/".length);
      const canonical = readFileSync(join(source, member.source));
      expect(readFileSync(join(projectRoot, destination, name))).toEqual(canonical);
      if (destination !== targets[0]) expect(readFileSync(join(projectRoot, targets[2], name))).toEqual(canonical);
    }
    expect(readdirSync(join(projectRoot, targets[0])).length).toBe(19);
    for (const target of targets.slice(1)) {
      expect(readdirSync(join(projectRoot, target)).sort()).toEqual(["SKILL.md", "references"]);
      expect(readdirSync(join(projectRoot, target, "references")).sort()).toEqual(["adoption.md", "authority-and-questions.md"]);
    }
    const installed = snapshot(projectRoot);
    expect(Object.isFrozen(doctorProject({ projectRoot }))).toBe(true);
    expect(snapshot(projectRoot)).toEqual(installed);
    expect(Object.isFrozen(uninstallProject({ projectRoot }))).toBe(true);
    expect(snapshot(projectRoot)).toEqual(before);
  }));

  test("restores pre-existing files and directories with arbitrary binary bytes and modes", () => fixture(({ projectRoot }) => {
    put(projectRoot, targets[0], Buffer.from([0, 255, 23]), 0o600);
    put(projectRoot, `${targets[1]}/unknown.bin`, Buffer.from([255, 0, 4]), 0o444);
    mkdirSync(join(projectRoot, targets[2]), { recursive: true });
    chmodSync(join(projectRoot, targets[1]), 0o750);
    chmodSync(join(projectRoot, targets[2]), 0o700);
    const before = snapshot(projectRoot);
    initProject(trusted(projectRoot));
    doctorProject({ projectRoot });
    uninstallProject({ projectRoot });
    expect(snapshot(projectRoot)).toEqual(before);
  }));

  test("trust, malformed options, roots and git identity fail before writes", () => fixture(({ projectRoot, base }) => {
    for (const options of [undefined, null, "bad", [], {}, { projectRoot },
      ...["untrusted", "unknown", null, true].map((trustResolution) => ({ projectRoot, trustResolution })),
      { ...trusted(projectRoot), sourceRoot: base }, { projectRoot: "relative", trustResolution: "trusted" },
      { projectRoot: `${projectRoot}/../project`, trustResolution: "trusted" },
      { projectRoot: base, trustResolution: "trusted" }]) unchangedFailure(projectRoot, () => initProject(options));
    const other = join(base, "missing-git"); mkdirSync(other);
    expect(() => initProject(trusted(other))).toThrow();
  }));

  test("existing journal and second init reject with zero mutation", () => fixture(({ projectRoot }) => {
    put(projectRoot, `${journal}/sentinel`, "already here");
    unchangedFailure(projectRoot, () => initProject(trusted(projectRoot)));
    rmSync(join(projectRoot, journal), { recursive: true });
    initProject(trusted(projectRoot));
    unchangedFailure(projectRoot, () => initProject(trusted(projectRoot)));
  }));

  test("doctor and uninstall reject missing, extra or divergent Radar and skill members without mutation", () => {
    for (const [path, mutate] of [
      [targets[0] + "/main.go", (p) => rmSync(p)],
      [targets[0] + "/extra.go", (p) => writeFileSync(p, "extra")],
      [targets[0] + "/main.go", (p) => writeFileSync(p, "drift")],
      [targets[1] + "/SKILL.md", (p) => writeFileSync(p, "drift")],
      [targets[2] + "/references/adoption.md", (p) => rmSync(p)],
      [targets[2] + "/references/extra.md", (p) => writeFileSync(p, "extra")],
      [targets[1] + "/references/authority-and-questions.md", (p) => writeFileSync(p, "divergent")],
    ]) fixture(({ projectRoot }) => {
      initProject(trusted(projectRoot)); mutate(join(projectRoot, path));
      unchangedFailure(projectRoot, () => doctorProject({ projectRoot }));
      unchangedFailure(projectRoot, () => uninstallProject({ projectRoot }));
    });
  });

  test("journal missing, extra, malformed schema and backup digest drift fail closed", () => {
    for (const mutate of [
      (p) => rmSync(join(p, journal), { recursive: true }),
      (p) => writeFileSync(join(p, journal, "extra"), "extra"),
      (p) => tamper(p, (s) => { s.schema = "unknown"; }),
      (p) => tamper(p, (s) => { s.extra = true; }),
      (p) => tamper(p, (s) => { s.original.destinations[0].tree.sha256 = "0".repeat(64); }),
      (p) => tamper(p, (s) => { s.installed.destinations[0].path = "../escape"; }),
    ]) fixture(({ projectRoot }) => {
      put(projectRoot, targets[0], "original");
      initProject(trusted(projectRoot)); mutate(projectRoot);
      unchangedFailure(projectRoot, () => doctorProject({ projectRoot }));
      unchangedFailure(projectRoot, () => uninstallProject({ projectRoot }));
    });
  });

  test("a valid noncanonical journal installation is reversible but doctor diagnoses it read-only", () => fixture(({ projectRoot }) => {
    put(projectRoot, targets[0], Buffer.from([0, 255]), 0o600);
    put(projectRoot, `${targets[1]}/unknown`, "untouched", 0o444);
    const before = snapshot(projectRoot);
    initProject(trusted(projectRoot));
    const bytes = Buffer.from("valid earlier installed version");
    tamper(projectRoot, (state) => {
      const radar = state.installed.destinations.find((entry) => entry.path === targets[0]).tree;
      const file = radar.entries.find((entry) => entry.name === "main.go").tree;
      file.bytes = bytes.toString("base64");
      file.byteLength = bytes.length;
      file.sha256 = createHash("sha256").update(bytes).digest("hex");
    });
    writeFileSync(join(projectRoot, targets[0], "main.go"), bytes);
    const state = JSON.parse(readFileSync(join(projectRoot, journal, "state.json"), "utf8"));
    expect(compareProjectFiles(projectRoot, state.installed)).toBe(true);
    unchangedFailure(projectRoot, () => doctorProject({ projectRoot }));
    expect(Object.isFrozen(uninstallProject({ projectRoot }))).toBe(true);
    expect(snapshot(projectRoot)).toEqual(before);
  }));

  test("doctor and uninstall reject non-object or extra-key options without mutation", () => fixture(({ projectRoot }) => {
    initProject(trusted(projectRoot));
    for (const options of [undefined, null, "bad", [], {}, { projectRoot, extra: true },
      { projectRoot, trustResolution: "trusted" }]) {
      unchangedFailure(projectRoot, () => doctorProject(options));
      unchangedFailure(projectRoot, () => uninstallProject(options));
    }
  }));

  test("regular worktree-style .git marker accepts a valid gitdir and rejects malformed text", () => fixture(({ projectRoot, base }) => {
    const gitdir = join(base, "gitdir");
    renameSync(join(projectRoot, ".git"), gitdir);
    put(projectRoot, ".git", `gitdir: ${gitdir}\n`);
    const before = snapshot(projectRoot);
    initProject(trusted(projectRoot)); doctorProject({ projectRoot }); uninstallProject({ projectRoot });
    expect(snapshot(projectRoot)).toEqual(before);
    writeFileSync(join(projectRoot, ".git"), "not a gitdir");
    unchangedFailure(projectRoot, () => initProject(trusted(projectRoot)));
    writeFileSync(join(projectRoot, ".git"), "gitdir: missing\n");
    unchangedFailure(projectRoot, () => initProject(trusted(projectRoot)));
    symlinkSync(base, join(base, "bridge"));
    writeFileSync(join(projectRoot, ".git"), `gitdir: ${join(base, "bridge", "gitdir")}\n`);
    unchangedFailure(projectRoot, () => initProject(trusted(projectRoot)));
  }));

  test("a write failure after journal reservation rolls back only its own changes", () => fixture(({ projectRoot }) => {
    if (process.getuid?.() === 0) return; // Root bypasses directory write permissions.
    mkdirSync(join(projectRoot, ".control-tower"), { mode: 0o555 });
    chmodSync(join(projectRoot, ".control-tower"), 0o555);
    unchangedFailure(projectRoot, () => initProject(trusted(projectRoot)));
  }));

  test("hardlinked destination and unsafe journal member reject without changing other destinations", () => fixture(({ projectRoot }) => {
    put(projectRoot, "foreign", "outside");
    mkdirSync(join(projectRoot, ".control-tower"));
    linkSync(join(projectRoot, "foreign"), join(projectRoot, targets[0]));
    const before = captureProjectFiles(projectRoot, ["AGENTS.md", "CLAUDE.md", journal, targets[1], targets[2]]);
    expect(() => initProject(trusted(projectRoot))).toThrow();
    expect(captureProjectFiles(projectRoot, ["AGENTS.md", "CLAUDE.md", journal, targets[1], targets[2]])).toEqual(before);
    rmSync(join(projectRoot, targets[0]));
    initProject(trusted(projectRoot));
    symlinkSync("state.json", join(projectRoot, journal, "extra"));
    const installed = captureProjectFiles(projectRoot, targets);
    expect(() => uninstallProject({ projectRoot })).toThrow();
    expect(captureProjectFiles(projectRoot, targets)).toEqual(installed);
    expect(readlinkSync(join(projectRoot, journal, "extra"))).toBe("state.json");
  }));

  test("no journal, unsafe destination, unsafe ancestor or unsafe git marker never mutates", () => fixture(({ projectRoot, base }) => {
    unchangedFailure(projectRoot, () => uninstallProject({ projectRoot }));
    for (const [path, to] of [[".agents", base], [targets[0], "foreign"], [".git", base]]) {
      if (path === targets[0]) { put(projectRoot, "foreign", "foreign"); mkdirSync(join(projectRoot, ".control-tower")); }
      if (path === ".git") rmSync(join(projectRoot, ".git"), { recursive: true });
      symlinkSync(to, join(projectRoot, path));
      const entries = readdirSync(projectRoot).sort();
      const safe = captureProjectFiles(projectRoot, ["AGENTS.md", "CLAUDE.md", journal]);
      expect(() => initProject(trusted(projectRoot))).toThrow();
      expect(readdirSync(projectRoot).sort()).toEqual(entries);
      expect(captureProjectFiles(projectRoot, ["AGENTS.md", "CLAUDE.md", journal])).toEqual(safe);
      expect(readlinkSync(join(projectRoot, path))).toBe(to);
      rmSync(join(projectRoot, path));
    }
  }));
});

const cli = resolve(import.meta.dir, "../adoption.mjs");
const runCli = (env, ...args) => spawnSync(process.execPath, [cli, ...args], { env, encoding: "utf8" });
const success = (run, status) => {
  expect(run.status).toBe(0);
  expect(run.stdout).toBe(`${JSON.stringify({ status })}\n`);
  expect(run.stderr).toBe("");
};
const rejected = (run, message) => {
  expect(run.status).not.toBe(0);
  expect(run.stdout).toBe("");
  expect(run.stderr).toBe(`Invalid Tower adoption CLI: ${message}\n`);
};

describe("project-local CLI (real isolated Bun processes)", () => {
  test("init, fresh-process doctor and uninstall preserve exact original trees and identical canonical skill bytes", () => fixture(({ projectRoot, env }) => {
    put(projectRoot, targets[0], Buffer.from([0, 255, 23]), 0o600);
    put(projectRoot, `${targets[1]}/unknown.bin`, Buffer.from([255, 0, 4]), 0o444);
    mkdirSync(join(projectRoot, targets[2]), { recursive: true });
    chmodSync(join(projectRoot, targets[1]), 0o750);
    chmodSync(join(projectRoot, targets[2]), 0o700);
    const before = snapshot(projectRoot);
    success(runCli(env, "init", "--project", projectRoot, "--trust", "trusted"), "installed");
    const manifest = validateBundle(source);
    for (const member of manifest.members.filter((entry) => entry.destination.startsWith("skills/"))) {
      const name = member.destination.slice("skills/control-tower/".length);
      const canonical = readFileSync(join(source, member.source));
      expect(readFileSync(join(projectRoot, targets[1], name))).toEqual(canonical);
      expect(readFileSync(join(projectRoot, targets[2], name))).toEqual(canonical);
    }
    const installed = snapshot(projectRoot);
    success(runCli(env, "doctor", "--project", projectRoot), "healthy");
    expect(snapshot(projectRoot)).toEqual(installed);
    success(runCli(env, "uninstall", "--project", projectRoot), "uninstalled");
    expect(snapshot(projectRoot)).toEqual(before);
  }));

  test("malformed commands, flags and trust reject before lifecycle mutation", () => {
    const invalid = [
      [[], "command required"],
      [["update", "--project", "ROOT"], "unknown command"],
      [["init", "--project"], "invalid arguments"],
      [["init", "--project", "--trust", "trusted"], "invalid arguments"],
      [["init", "--project", "ROOT"], "invalid arguments"],
      [["init", "--project", "ROOT", "--trust"], "invalid arguments"],
      [["init", "--project", "ROOT", "--trust", "denied"], "trust must be trusted"],
      [["init", "--project", "ROOT", "--trust", "unknown"], "trust must be trusted"],
      [["init", "--trust", "trusted", "--project", "ROOT"], "invalid arguments"],
      [["init", "--project", "ROOT", "--project", "ROOT"], "invalid arguments"],
      [["init", "--project", "ROOT", "--trust", "trusted", "--trust", "trusted"], "invalid arguments"],
      [["init", "--project", "ROOT", "--trust", "trusted", "extra"], "invalid arguments"],
      [["init", "--project", "ROOT", "--source", "elsewhere", "--trust", "trusted"], "invalid arguments"],
      [["init", "--project", "ROOT", "--trust", "trusted", "--source", "elsewhere"], "invalid arguments"],
      [["init", "--project", "ROOT", "--trust", "trusted", "--source-root", "elsewhere"], "invalid arguments"],
      [["init", "--project", "ROOT", "--trust", "--source"], "invalid arguments"],
      [["doctor", "--project"], "invalid arguments"],
      [["doctor", "--project", "--trust"], "invalid arguments"],
      [["doctor", "--project", "ROOT", "--trust", "trusted"], "invalid arguments"],
      [["uninstall", "--project", "ROOT", "--trust", "trusted"], "invalid arguments"],
      [["doctor", "--project", "ROOT", "--source", "elsewhere"], "invalid arguments"],
      [["uninstall", "--project", "ROOT", "extra"], "invalid arguments"],
      [["uninstall", "--project", "ROOT", "--global"], "invalid arguments"],
      [["doctor", "--project", "ROOT", "--project", "ROOT"], "invalid arguments"],
    ];
    for (const [args, message] of invalid) fixture(({ projectRoot, env }) => {
      const before = snapshot(projectRoot);
      rejected(runCli(env, ...args.map((arg) => arg === "ROOT" ? projectRoot : arg)), message);
      expect(snapshot(projectRoot)).toEqual(before);
    });
  });

  test("API failure prints one error line without stack or stdout", () => fixture(({ projectRoot, env }) => {
    const before = snapshot(projectRoot);
    rejected(runCli(env, "doctor", "--project", projectRoot), "Invalid Tower adoption: journal tree");
    expect(snapshot(projectRoot)).toEqual(before);
  }));

  test("importing the API in a fresh process is passive", () => fixture(({ projectRoot, env }) => {
    const before = snapshot(projectRoot);
    const run = spawnSync(process.execPath, ["-e", `import ${JSON.stringify(cli)}`], { env, encoding: "utf8" });
    expect(run.status).toBe(0);
    expect(run.stdout).toBe("");
    expect(run.stderr).toBe("");
    expect(snapshot(projectRoot)).toEqual(before);
  }));
});

function tamper(root, update) {
  const path = join(root, journal, "state.json");
  const state = JSON.parse(readFileSync(path, "utf8"));
  update(state);
  writeFileSync(path, JSON.stringify(state));
}
