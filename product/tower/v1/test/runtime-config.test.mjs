import { expect, test } from "bun:test";
import * as fs from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { BUNDLE_MEMBERS } from "../bundle.mjs";
import { prepareRuntime, installRuntime, doctorRuntime, uninstallRuntime } from "../runtime-config.mjs";

function fixture(run) {
  const home = fs.mkdtempSync("/tmp/tower-runtime-");
  const savedHome = process.env.HOME;
  process.env.HOME = home;
  const env = { PATH: process.env.PATH, HOME: home, GOFLAGS: "attacker", GOWORK: "/attacker", GOENV: "/attacker", GOMODCACHE: join(home, "ambient-modules"), GOCACHE: join(home, "ambient-cache") };
  const members = BUNDLE_MEMBERS.map(({ source: path }) => ({ path, bytes: fs.readFileSync(new URL(`../../../../${path}`, import.meta.url)) }));
  const calls = [];
  const runner = (command, argv, options) => {
    calls.push([command, argv, options]);
    if (command === "gentle-ai") return { status: 0, stdout: "gentle-ai 4.0.0\n" };
    if (argv[0] === "build") fs.writeFileSync(argv[5], "fixture radar", { mode: 0o755 });
    return { status: 0, stdout: "" };
  };
  const options = { home, env, runner, members, version: "v1-test" };
  const write = (path, bytes) => { fs.mkdirSync(dirname(join(home, path)), { recursive: true, mode: 0o755 }); fs.writeFileSync(join(home, path), bytes, { mode: 0o644 }); };
  const install = () => installRuntime(prepareRuntime(options));
  try { return run({ home, options, calls, write, install }); }
  finally {
    if (savedHome === undefined) delete process.env.HOME; else process.env.HOME = savedHome;
    fs.rmSync(home, { recursive: true, force: true });
  }
}
const read = (home, path) => fs.readFileSync(join(home, path), "utf8");
const manifest = (home) => JSON.parse(read(home, ".local/share/torre-control/runtime-ownership.json"));

test("installs exact V1 skills and relative Claude links, adopts identical content, never touches other skills", () => fixture(({ home, write, install }) => {
  write(".agents/skills/gentle-ai/SKILL.md", "gentle sentinel");
  const source = fs.readFileSync(new URL("../../../../agent-workflows/skills/chanks-1-prd/SKILL.md", import.meta.url));
  write(".agents/skills/chanks-1-prd/SKILL.md", source);
  install();
  expect(fs.existsSync(join(home, ".agents/skills/control-tower/SKILL.md"))).toBe(true);
  expect(fs.readFileSync(join(home, ".agents/skills/chanks-1-prd/SKILL.md"))).toEqual(source);
  expect(fs.readlinkSync(join(home, ".claude/skills/chanks-1-prd"))).toBe("../../.agents/skills/chanks-1-prd");
  expect(read(home, ".agents/skills/gentle-ai/SKILL.md")).toBe("gentle sentinel");
  const before = manifest(home);
  install();
  expect(manifest(home)).toEqual(before);
  expect(doctorRuntime({ home, runner: () => ({ status: 0, stdout: "gentle-ai 4.0.0" }) }).skills).toBe("ok");
}));

test("backs up foreign skill directories, links and Radar and restores them on uninstall", () => fixture(({ home, write, install }) => {
  write(".agents/skills/chanks-1-prd/SKILL.md", "foreign skill");
  write(".agents/skills/chanks-1-prd/personal.md", "extra");
  write(".local/bin/radar", "foreign radar");
  write(".claude/skills/chanks-1-prd/SKILL.md", "old Claude directory");
  install();
  expect(read(home, ".local/bin/radar")).toBe("fixture radar");
  expect(manifest(home).entries.filter(e => e.backup).length).toBe(3);
  uninstallRuntime({ home });
  expect(read(home, ".agents/skills/chanks-1-prd/SKILL.md")).toBe("foreign skill");
  expect(read(home, ".agents/skills/chanks-1-prd/personal.md")).toBe("extra");
  expect(read(home, ".claude/skills/chanks-1-prd/SKILL.md")).toBe("old Claude directory");
  expect(read(home, ".local/bin/radar")).toBe("foreign radar");
  expect(fs.existsSync(join(home, ".agents/skills/control-tower"))).toBe(false);
}));

test("Radar builds with the exact restricted environment and no inherited Go overrides", () => fixture(({ home, calls, install }) => {
  install();
  const builds = calls.filter(([command]) => command === "go");
  expect(builds).toHaveLength(1);
  for (const [, , options] of builds) {
    expect(options.env).toMatchObject({ GOWORK: "off", GOENV: "off", GOPROXY: "off", GOFLAGS: "-mod=vendor", GOTOOLCHAIN: "local" });
    expect(Object.keys(options.env).sort()).toEqual(["PATH", "HOME", "TMPDIR", "GOCACHE", "GOPATH", "GOMODCACHE", "GOFLAGS", "GOPROXY", "GOSUMDB", "GOWORK", "GOTOOLCHAIN", "GOENV", "GOTELEMETRY", "CGO_ENABLED"].sort());
    expect(options.env.HOME).not.toBe("/home/emili");
    expect(options.env.GOMODCACHE).not.toBe(join(home, "ambient-modules"));
    expect(options.env.GOCACHE).not.toBe(join(home, "ambient-cache"));
    expect(dirname(options.env.GOMODCACHE)).toBe(dirname(options.env.HOME));
    expect(dirname(options.env.GOCACHE)).toBe(dirname(options.env.HOME));
    expect(fs.existsSync(join(options.cwd, "vendor/modules.txt"))).toBe(false); // private build tree was cleaned
  }
  expect(fs.statSync(join(home, ".local/bin/radar")).mode & 0o777).toBe(0o755);
}));

(Bun.which("go") ? test : test.skip)("real runtime Radar build ignores ambient caches and compiles solely from vendored release members", () => fixture(({ home, options }) => {
  options.runner = (command, argv, spawnOptions) => {
    if (command === "gentle-ai") return { status: 0, stdout: "gentle-ai 4.0.0" };
    expect(command).toBe("go"); expect(argv[0]).toBe("build");
    expect(fs.readdirSync(spawnOptions.env.GOMODCACHE)).toEqual([]);
    expect(fs.readdirSync(spawnOptions.env.GOCACHE)).toEqual([]);
    expect(spawnOptions.env.GOMODCACHE).not.toBe(options.env.GOMODCACHE);
    const result = spawnSync(command, argv, spawnOptions);
    expect(String(result.stderr ?? "")).toBe(""); expect(result.status).toBe(0);
    expect(fs.readdirSync(spawnOptions.env.GOMODCACHE)).toEqual([]);
    return result;
  };
  const plan = prepareRuntime(options);
  expect(plan.desired.find(item => item.path === ".local/bin/radar").files[""].bytes.length).toBeGreaterThan(0);
  expect(fs.existsSync(join(home, "ambient-modules"))).toBe(false);
  expect(fs.existsSync(join(home, "ambient-cache"))).toBe(false);
}), 180_000);

test("normalizing Radar build permissions never follows a substituted output symlink", () => fixture(({ home, options, write }) => {
  write("sentinel", "unchanged"); fs.chmodSync(join(home, "sentinel"), 0o600);
  options.runner = (command, argv) => {
    if (command === "gentle-ai") return { status: 0, stdout: "gentle-ai 4.0.0" };
    fs.symlinkSync(join(home, "sentinel"), argv[5]); return { status: 0 };
  };
  expect(() => prepareRuntime(options)).toThrow();
  expect(read(home, "sentinel")).toBe("unchanged");
  expect(fs.statSync(join(home, "sentinel")).mode & 0o777).toBe(0o600);
}));

test("signatures merge settings without duplicates; passive Pi imports the installed absolute URL", () => fixture(({ home, write, install }) => {
  const original = { personal: { enabled: true }, hooks: { Stop: [{ matcher: "", hooks: [{ type: "command", command: "personal" }] }] } };
  write(".claude/settings.json", JSON.stringify(original));
  install(); install();
  const settings = JSON.parse(read(home, ".claude/settings.json"));
  expect(settings.personal).toEqual(original.personal);
  expect(settings.hooks.Stop).toEqual(original.hooks.Stop);
  expect(settings.hooks.UserPromptSubmit).toEqual([{ matcher: "", hooks: [{ type: "command", command: 'sh "$HOME/.claude/hooks/chanks-etapa.sh"', timeout: 15 }] }]);
  expect(settings.hooks.PreToolUse[0].matcher).toBe("Bash");
  const pi = read(home, ".pi/agent/extensions/chanks-notices.ts");
  expect(pi).toContain("file://" + home + "/.local/share/torre-control/torre-firma.mjs");
  expect(pi).toContain('pi.on("tool_result"');
  expect(pi).not.toContain("spawn");
  uninstallRuntime({ home });
  expect(JSON.parse(read(home, ".claude/settings.json"))).toEqual(original);
}));

test("generated Pi module loads passively and notices only successful direct calls and installed roster reads", () => fixture(({ home, install }) => {
  install();
  // A fresh process binds os.homedir() to this fixture's HOME at startup.
  const script = `const extension = await import(${JSON.stringify(pathToFileURL(join(home, ".pi/agent/extensions/chanks-notices.ts")).href)});
    const home = process.env.HOME; let handler; const notices = [];
    extension.default({ on: (event, callback) => { if (event !== "tool_result") throw new Error("unexpected event"); handler = callback; } });
    const ctx = { hasUI: true, cwd: home, ui: { notify: text => notices.push(text) } };
    const radar = { toolName: "bash", input: { command: "radar sesion S195" } };
    const passive = handler(radar, ctx) === undefined;
    handler({ toolName: "read", input: { path: home + "/.agents/skills/control-tower/SKILL.md" } }, ctx);
    handler({ ...radar, isError: true }, ctx);
    handler({ toolName: "bash", input: { command: "echo radar sesion S195" } }, ctx);
    handler({ toolName: "bash", input: { command: "radar sesion S195 && echo later" } }, ctx);
    handler(radar, { ...ctx, hasUI: false });
    process.stdout.write(JSON.stringify({ passive, notices }));`;
  const result = spawnSync(process.execPath, ["--eval", script], { env: { HOME: home, PATH: process.env.PATH }, encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024 });
  expect(result.status).toBe(0); expect(result.stderr).toBe("");
  expect(JSON.parse(result.stdout)).toEqual({ passive: true, notices: ["🗼 Torre · radar sesion", "💪 Chanks · control-tower · lectura completada"] });
}));

test("invalid settings JSON refuses before any install write", () => fixture(({ home, write, install }) => {
  write(".claude/settings.json", "{broken");
  expect(install).toThrow(/settings.json.*JSON/);
  expect(read(home, ".claude/settings.json")).toBe("{broken");
  expect(fs.existsSync(join(home, ".agents"))).toBe(false);
  expect(fs.existsSync(join(home, ".local"))).toBe(false);
}));

test("pointer blocks preserve unrelated bytes for all present runtimes and restore existing blocks", () => fixture(({ home, write, install }) => {
  const personal = "personal\r\n<!-- gentle-ai:rules -->\nkeep exact\n<!-- /gentle-ai:rules -->\n";
  for (const path of [".claude/CLAUDE.md", ".codex/AGENTS.md", ".config/opencode/AGENTS.md", ".pi/agent/APPEND_SYSTEM.md"]) write(path, personal);
  install(); install();
  for (const path of [".claude/CLAUDE.md", ".codex/AGENTS.md", ".config/opencode/AGENTS.md", ".pi/agent/APPEND_SYSTEM.md"]) {
    expect(read(home, path).startsWith(personal)).toBe(true);
    expect(read(home, path)).toContain("Control Tower v1-test");
  }
  fs.appendFileSync(join(home, ".codex/AGENTS.md"), "later personal\n");
  uninstallRuntime({ home });
  expect(read(home, ".claude/CLAUDE.md")).toBe(personal);
  expect(read(home, ".codex/AGENTS.md")).toBe(personal + "later personal\n");
}));

test("nested or duplicate pointer markers and symlink escapes refuse before any write", () => {
  for (const text of ["<!-- control-tower:pointer -->\nx\n<!-- /control-tower:pointer -->\n<!-- control-tower:pointer -->\nx\n<!-- /control-tower:pointer -->",
    "<!-- gentle-ai:rules -->\n<!-- control-tower:pointer -->\nx\n<!-- /control-tower:pointer -->\n<!-- /gentle-ai:rules -->"]) fixture(({ home, write, install }) => {
      write(".claude/CLAUDE.md", text);
      expect(install).toThrow(/marker|nested/);
      expect(fs.existsSync(join(home, ".local"))).toBe(false);
    });
  for (const target of [".agents", ".claude", ".local"]) fixture(({ home, install }) => {
    fs.symlinkSync("/tmp", join(home, target));
    expect(install).toThrow(/unsafe|symlink/);
  });
});

test("identical skill bytes are adopted even with private file modes; shared siblings survive", () => fixture(({ home, write, install }) => {
  write(".agents/skills/chanks-1-prd/SKILL.md", fs.readFileSync(new URL("../../../../agent-workflows/skills/chanks-1-prd/SKILL.md", import.meta.url)));
  fs.chmodSync(join(home, ".agents/skills/chanks-1-prd/SKILL.md"), 0o600);
  write(".agents/skills/_shared/personal.md", "keep");
  install();
  expect(manifest(home).entries.find(e => e.path === ".agents/skills/chanks-1-prd").backup).toBeNull();
  uninstallRuntime({ home });
  expect(read(home, ".agents/skills/_shared/personal.md")).toBe("keep");
}));

test("uninstall preserves later settings and empty unrelated hooks; restores an earlier pointer block", () => fixture(({ home, write, install }) => {
  const original = "prefix\n<!-- control-tower:pointer -->\nold tower\n<!-- /control-tower:pointer -->\nsuffix\n";
  write(".claude/CLAUDE.md", original);
  install();
  const config = JSON.parse(read(home, ".claude/settings.json"));
  config.personal = "later";
  config.hooks.UserPromptSubmit.push({ matcher: "personal", hooks: [] });
  write(".claude/settings.json", JSON.stringify(config));
  uninstallRuntime({ home });
  expect(read(home, ".claude/CLAUDE.md")).toBe(original);
  expect(JSON.parse(read(home, ".claude/settings.json"))).toEqual({ personal: "later", hooks: { UserPromptSubmit: [{ matcher: "personal", hooks: [] }] } });
}));

test("semantically identical existing hooks are not duplicated; private instruction and settings modes stay private", () => fixture(({ home, write, install }) => {
  write(".claude/settings.json", JSON.stringify({ hooks: { UserPromptSubmit: [{ matcher: "", hooks: [{ timeout: 15, command: 'sh \"$HOME/.claude/hooks/chanks-etapa.sh\"', type: "command" }] }] } }));
  write(".claude/CLAUDE.md", "private instructions\n");
  fs.chmodSync(join(home, ".claude/settings.json"), 0o600);
  fs.chmodSync(join(home, ".claude/CLAUDE.md"), 0o600);
  install(); install();
  expect(JSON.parse(read(home, ".claude/settings.json")).hooks.UserPromptSubmit).toHaveLength(1);
  expect(fs.statSync(join(home, ".claude/settings.json")).mode & 0o777).toBe(0o600);
  expect(fs.statSync(join(home, ".claude/CLAUDE.md")).mode & 0o777).toBe(0o600);
  uninstallRuntime({ home });
  expect(fs.statSync(join(home, ".claude/settings.json")).mode & 0o777).toBe(0o600);
}));

test("doctor detects missing new-runtime pointers and incomplete ownership records", () => fixture(({ home, options, install }) => {
  install(); fs.mkdirSync(join(home, ".codex"), { mode: 0o755 });
  expect(doctorRuntime({ home, runner: options.runner }).pointers).toBe("missing");
  const record = manifest(home); record.entries.pop();
  fs.writeFileSync(join(home, ".local/share/torre-control/runtime-ownership.json"), JSON.stringify(record));
  expect(doctorRuntime({ home, runner: options.runner }).skills).toBe("modified");
}));

test("a failed runtime write retains bounded ownership recovery evidence and refuses automatic reentry", () => fixture(({ home, options }) => {
  const plan = prepareRuntime(options);
  plan.fault = () => { throw new Error("injected runtime failure"); };
  expect(() => installRuntime(plan)).toThrow(/runtime failure/);
  expect(fs.existsSync(join(home, ".local/share/torre-control/.runtime-lock"))).toBe(true);
  expect(() => prepareRuntime(options)).toThrow(/recovery|lock/);
  expect(doctorRuntime({ home, runner: options.runner }).skills).toBe("modified");
}));

test("Gentle AI is required before any change; doctor exposes its version and component drift", () => fixture(({ home, options, install, write }) => {
  const good = options.runner;
  options.runner = () => ({ error: { code: "ENOENT" }, status: null });
  expect(install).toThrow(/Gentle AI.*instal/i);
  expect(fs.readdirSync(home)).toEqual([]);
  options.runner = good;
  install();
  expect(doctorRuntime({ home, runner: good })).toMatchObject({ skills: "ok", radar: "ok", signatures: "ok", pointers: "ok", gentleAi: { status: "ok", version: "4.0.0" } });
  write(".agents/skills/chanks-1-prd/SKILL.md", "edited");
  fs.unlinkSync(join(home, ".local/bin/radar"));
  expect(doctorRuntime({ home, runner: good })).toMatchObject({ skills: "modified", radar: "missing" });
  expect(() => uninstallRuntime({ home })).toThrow(/modified/);
  expect(read(home, ".agents/skills/chanks-1-prd/SKILL.md")).toBe("edited");
}));
