import { expect, test, spyOn } from "bun:test";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { BUNDLE_MEMBERS } from "../bundle.mjs";
import { prepareRuntime, installRuntime, doctorRuntime, uninstallRuntime, preflightRuntimeHome } from "../runtime-config.mjs";

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
const sha256 = value => createHash("sha256").update(value).digest("hex");
const fileSnapshot = path => ({ kind: "file", sha256: sha256(fs.readFileSync(path)), mode: fs.statSync(path).mode & 0o777 });
const linkSnapshot = path => { const target = fs.readlinkSync(path); return { kind: "link", target, sha256: sha256(target) }; };
const holdsBytes = (dir, content) => fs.readdirSync(dir).some(name => {
  const path = join(dir, name), s = fs.lstatSync(path);
  return s.isDirectory() ? holdsBytes(path, content) : s.isFile() && fs.readFileSync(path, "utf8") === content;
});

test("S205 preflight lists every writable owned destination with exact shell-quoted fixes, without chmod", () => fixture(({ home, write }) => {
  write(".claude/settings.json", "{}");
  write(".agents/skills/chanks-1-prd/personal's.md", "keep");
  const paths = [join(home, ".claude"), join(home, ".claude/settings.json"), join(home, ".agents/skills/chanks-1-prd/personal's.md")].sort();
  for (const path of paths) fs.chmodSync(path, 0o777);
  let error; try { preflightRuntimeHome({ home }); } catch (e) { error = e; }
  expect(error?.message).toBe("Tower runtime: Permisos inseguros: estas rutas permiten escritura de grupo u otros.\n" +
    paths.map(path => `- ${path}\n  chmod go-w '${path.replaceAll("'", "'\\''")}'`).join("\n") +
    "\nCorregí los permisos y volvé a intentar, o ejecutá el mismo comando con --fix-permissions.");
  for (const path of paths) expect(fs.statSync(path).mode & 0o777).toBe(0o777);
}));

test("S205 fix removes only go-w bits from admitted paths, preserving unrelated siblings", () => fixture(({ home, write, install }) => {
  write(".claude/settings.json", "{}"); write(".claude/unrelated", "keep");
  fs.chmodSync(join(home, ".claude"), 0o777);
  fs.chmodSync(join(home, ".claude/settings.json"), 0o662);
  fs.chmodSync(join(home, ".claude/unrelated"), 0o666);
  const changed = preflightRuntimeHome({ home, fixPermissions: true });
  expect(changed).toEqual([join(home, ".claude"), join(home, ".claude/settings.json")]);
  expect(fs.statSync(join(home, ".claude")).mode & 0o777).toBe(0o755);
  expect(fs.statSync(join(home, ".claude/settings.json")).mode & 0o777).toBe(0o640);
  expect(fs.statSync(join(home, ".claude/unrelated")).mode & 0o777).toBe(0o666);
  install();
}));

test("#176 a cached version holding explicitly retired members is admitted; unknown members still fail", () => {
  const home = fs.mkdtempSync("/tmp/tower-retired-store-");
  try {
    const stateRoot = join(home, ".local/share/torre-control/v1");
    const cached = join(stateRoot, "versions", "4".repeat(64));
    const seedFile = relative => {
      const path = join(cached, relative);
      fs.mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      fs.writeFileSync(path, "cached bytes", { mode: 0o600 });
    };
    seedFile("provenance.json");
    seedFile("release.json");
    seedFile("agent-workflows/tools/radar/main.go");
    seedFile("agent-workflows/skills/chanks-0-comunicacion-agentes/SKILL.md");
    seedFile("agent-workflows/skills/chanks-0-comunicacion-agentes/references/casos-herdr.md");
    fs.mkdirSync(stateRoot, { recursive: true, mode: 0o700 });
    fs.writeFileSync(join(stateRoot, "state.json"), JSON.stringify({ schema: "tower.v1.global/1" }), { mode: 0o600 });
    fs.writeFileSync(join(home, "launcher"), "#!/usr/bin/env bun\n", { mode: 0o700 });
    const options = { home, stateRoot, launcherPath: join(home, "launcher") };
    expect(() => preflightRuntimeHome(options)).not.toThrow();
    seedFile("agent-workflows/skills/chanks-9-ghost/SKILL.md");
    expect(() => preflightRuntimeHome(options)).toThrow(/unknown version member/);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test("S205 explicit repair reports changes before the normal preflight can reject settings", () => fixture(({ home, write }) => {
  write(".claude/settings.json", "{bad"); fs.chmodSync(join(home, ".claude/settings.json"), 0o666);
  const reported = [];
  expect(() => preflightRuntimeHome({ home, fixPermissions: true, onPermissionsFixed: paths => reported.push(paths) })).toThrow(/JSON/);
  expect(reported).toEqual([[join(home, ".claude/settings.json")]]);
  expect(fs.statSync(join(home, ".claude/settings.json")).mode & 0o777).toBe(0o644);
}));

test("S205 repairs HOME and global destinations but not unrelated siblings or paths outside HOME", () => fixture(({ home, write }) => {
  write(".local/share/torre-control/v1/state.json", "{}"); write("sentinel", "keep");
  const stateRoot = join(home, ".local/share/torre-control/v1"), stateFile = join(stateRoot, "state.json");
  const outside = fs.mkdtempSync("/tmp/tower-outside-");
  try {
    for (const path of [home, stateRoot, stateFile, join(home, "sentinel"), outside]) fs.chmodSync(path, 0o777);
    expect(preflightRuntimeHome({ home, stateRoot, launcherPath: join(outside, "launcher"), fixPermissions: true })).toEqual([home, stateRoot, stateFile]);
    for (const path of [home, stateRoot, stateFile]) expect(fs.statSync(path).mode & 0o777).toBe(0o755);
    expect(fs.statSync(join(home, "sentinel")).mode & 0o777).toBe(0o777);
    expect(fs.statSync(outside).mode & 0o777).toBe(0o777);
  } finally { fs.rmSync(outside, { recursive: true, force: true }); }
}));

test("S205 no-follow repair refuses replaced or hardlinked files before chmod", () => fixture(({ home, write }) => {
  write(".claude/settings.json", "{}"); write("sentinel", "keep");
  const path = join(home, ".claude/settings.json"), sentinel = join(home, "sentinel");
  fs.chmodSync(path, 0o666); fs.chmodSync(sentinel, 0o666);
  const open = fs.openSync;
  const spy = spyOn(fs, "openSync").mockImplementation((target, ...args) => {
    if (target === path) { fs.unlinkSync(path); fs.symlinkSync(sentinel, path); }
    return open(target, ...args);
  });
  try { expect(() => preflightRuntimeHome({ home, fixPermissions: true })).toThrow(); }
  finally { spy.mockRestore(); }
  expect(fs.statSync(sentinel).mode & 0o777).toBe(0o666);
  fs.unlinkSync(path); fs.linkSync(sentinel, path);
  expect(() => preflightRuntimeHome({ home, fixPermissions: true })).toThrow(/unsafe/);
  expect(fs.statSync(sentinel).mode & 0o777).toBe(0o666);
}));

test("S205 permission repair refuses unknown global entries before touching their modes", () => fixture(({ home, write }) => {
  write(".local/share/torre-control/v1/unrelated", "keep");
  const stateRoot = join(home, ".local/share/torre-control/v1"), unrelated = join(stateRoot, "unrelated");
  fs.chmodSync(unrelated, 0o666);
  expect(() => preflightRuntimeHome({ home, stateRoot, fixPermissions: true })).toThrow(/unknown/);
  expect(fs.statSync(unrelated).mode & 0o777).toBe(0o666);
}));

test("S205 hard refusals never offer or apply permission repairs", () => {
  for (const foreign of [false, true]) fixture(({ home, write }) => {
    write(".claude/settings.json", "{}"); fs.chmodSync(join(home, ".claude"), 0o777);
    if (!foreign) fs.symlinkSync("/tmp", join(home, ".agents"));
    const owner = foreign ? spyOn(process, "getuid").mockReturnValue(process.getuid() + 1) : null;
    try {
      for (const fixPermissions of [false, true]) {
        let error; try { preflightRuntimeHome({ home, fixPermissions }); } catch (e) { error = e; }
        expect(error?.message).toContain("unsafe path or symlink:");
        expect(error?.message).not.toContain("chmod"); expect(error?.message).not.toContain("--fix-permissions");
        expect(fs.statSync(join(home, ".claude")).mode & 0o777).toBe(0o777);
      }
    } finally { owner?.mockRestore(); }
  });
});

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
  expect(builds).toHaveLength(3);
  const radar = builds.find(([, , options]) => options.cwd.endsWith("/radar"));
  expect(radar).toBeDefined();
  const [, , options] = radar;
  expect(options.env).toMatchObject({ GOWORK: "off", GOENV: "off", GOPROXY: "off", GOFLAGS: "-mod=vendor", GOTOOLCHAIN: "local" });
  expect(Object.keys(options.env).sort()).toEqual(["PATH", "HOME", "TMPDIR", "GOCACHE", "GOPATH", "GOMODCACHE", "GOFLAGS", "GOPROXY", "GOSUMDB", "GOWORK", "GOTOOLCHAIN", "GOENV", "GOTELEMETRY", "CGO_ENABLED"].sort());
  expect(options.env.HOME).not.toBe("/home/<usuario>");
  expect(options.env.GOMODCACHE).not.toBe(join(home, "ambient-modules"));
  expect(options.env.GOCACHE).not.toBe(join(home, "ambient-cache"));
  expect(dirname(options.env.GOMODCACHE)).toBe(dirname(options.env.HOME));
  expect(dirname(options.env.GOCACHE)).toBe(dirname(options.env.HOME));
  expect(fs.existsSync(join(options.cwd, "vendor/modules.txt"))).toBe(false); // private build tree was cleaned
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
  uninstallRuntime({ home });
  expect(JSON.parse(read(home, ".claude/settings.json"))).toEqual(original);
}));

test("copiloto is built offline from shipped sources and installed as an owned 0o755 binary", () => fixture(({ home, calls, install }) => {
  install();
  const builds = calls.filter(([command]) => command === "go");
  expect(builds).toHaveLength(3);
  const copiloto = builds.find(([, , options]) => options.cwd.endsWith("/copiloto"));
  expect(copiloto).toBeDefined();
  const [, , options] = copiloto;
  // No vendor tree and no ambient Go overrides: a plain, sanitized offline build.
  expect(options.env).toMatchObject({ GOFLAGS: "-mod=readonly", GOPROXY: "off", GOWORK: "off", GOENV: "off", GOTOOLCHAIN: "local" });
  expect(options.env.GOMODCACHE).not.toBe(join(home, "ambient-modules"));
  expect(options.env.GOCACHE).not.toBe(join(home, "ambient-cache"));
  expect(dirname(options.env.GOMODCACHE)).toBe(dirname(options.env.HOME));
  expect(fs.statSync(join(home, ".local/bin/copiloto")).mode & 0o777).toBe(0o755);
  const entry = manifest(home).entries.find(e => e.path === ".local/bin/copiloto");
  expect(entry).toMatchObject({ component: "copiloto", installed: { kind: "file", mode: 0o755 } });
  expect(doctorRuntime({ home, runner: () => ({ status: 0, stdout: "gentle-ai 4.0.0" }) }).copiloto).toBe("ok");
  expect(fs.existsSync(options.cwd)).toBe(false); // private build tree was cleaned
}));

(Bun.which("go") ? test : test.skip)("real runtime copiloto build compiles solely from the shipped Go sources", () => fixture(({ home, options }) => {
  options.runner = (command, argv, spawnOptions) => {
    if (command === "gentle-ai") return { status: 0, stdout: "gentle-ai 4.0.0" };
    expect(command).toBe("go"); expect(argv[0]).toBe("build");
    if (!spawnOptions.cwd.endsWith("/copiloto")) { fs.writeFileSync(argv[5], "fixture radar", { mode: 0o755 }); return { status: 0 }; }
    // Only the reviewed, non-test Go sources reach the private build directory.
    expect(fs.readdirSync(spawnOptions.cwd).sort()).toEqual(["foco.go", "go.mod", "main.go", "tarjeta.go"]);
    expect(spawnOptions.env.GOFLAGS).toBe("-mod=readonly");
    const result = spawnSync(command, argv, spawnOptions);
    expect(String(result.stderr ?? "")).toBe(""); expect(result.status).toBe(0);
    return result;
  };
  const plan = prepareRuntime(options);
  expect(plan.desired.find(item => item.path === ".local/bin/copiloto").files[""].bytes.length).toBeGreaterThan(0);
}), 180_000);

test("copiloto build output must be a regular file; a substituted symlink is refused", () => fixture(({ home, options, write }) => {
  write("sentinel", "unchanged"); fs.chmodSync(join(home, "sentinel"), 0o600);
  options.runner = (command, argv, spawnOptions) => {
    if (command === "gentle-ai") return { status: 0, stdout: "gentle-ai 4.0.0" };
    if (spawnOptions.cwd.endsWith("/copiloto")) { fs.symlinkSync(join(home, "sentinel"), argv[5]); return { status: 0 }; }
    fs.writeFileSync(argv[5], "fixture radar", { mode: 0o755 }); return { status: 0 };
  };
  expect(() => prepareRuntime(options)).toThrow();
  expect(read(home, "sentinel")).toBe("unchanged");
  expect(fs.statSync(join(home, "sentinel")).mode & 0o777).toBe(0o600);
}));

test("a failing Go build surfaces the compiler diagnostic instead of a generic Go required message", () => fixture(({ options }) => {
  options.runner = (command, argv, spawnOptions) => {
    if (command === "gentle-ai") return { status: 0, stdout: "gentle-ai 4.0.0" };
    if (spawnOptions.cwd.endsWith("/radar")) return { status: 1, stderr: Buffer.from("go: go.mod requires go >= 1.26 (running 'go 1.25.12')\n") };
    fs.writeFileSync(argv[5], "fixture radar", { mode: 0o755 }); return { status: 0 };
  };
  let error; try { prepareRuntime(options); } catch (e) { error = e; }
  expect(error?.message).toBe("Tower runtime: Radar offline build failed: go: go.mod requires go >= 1.26 (running 'go 1.25.12')");
}));

test("a Go build that never spawns keeps the generic Go required message", () => fixture(({ options }) => {
  options.runner = (command) => command === "gentle-ai" ? { status: 0, stdout: "gentle-ai 4.0.0" } : { error: new Error("spawn go ENOENT") };
  let error; try { prepareRuntime(options); } catch (e) { error = e; }
  expect(error?.message).toBe("Tower runtime: Radar offline build failed (Go required): spawn go ENOENT");
}));

test("piloto build output must be a regular file; a substituted symlink is refused", () => fixture(({ home, options, write }) => {
  write("sentinel", "unchanged"); fs.chmodSync(join(home, "sentinel"), 0o600);
  options.runner = (command, argv, spawnOptions) => {
    if (command === "gentle-ai") return { status: 0, stdout: "gentle-ai 4.0.0" };
    if (spawnOptions.cwd.endsWith("/piloto")) { fs.symlinkSync(join(home, "sentinel"), argv[5]); return { status: 0 }; }
    fs.writeFileSync(argv[5], "fixture radar", { mode: 0o755 }); return { status: 0 };
  };
  expect(() => prepareRuntime(options)).toThrow();
  expect(read(home, "sentinel")).toBe("unchanged");
  expect(fs.statSync(join(home, "sentinel")).mode & 0o777).toBe(0o600);
}));

test("piloto is built offline from shipped sources and installed as an owned 0o755 binary", () => fixture(({ home, calls, install }) => {
  install();
  const builds = calls.filter(([command]) => command === "go");
  expect(builds).toHaveLength(3);
  const piloto = builds.find(([, , options]) => options.cwd.endsWith("/piloto"));
  expect(piloto).toBeDefined();
  const [, , options] = piloto;
  // No vendor tree and no ambient Go overrides: a plain, sanitized offline build.
  expect(options.env).toMatchObject({ GOFLAGS: "-mod=readonly", GOPROXY: "off", GOWORK: "off", GOENV: "off", GOTOOLCHAIN: "local" });
  expect(options.env.GOMODCACHE).not.toBe(join(home, "ambient-modules"));
  expect(options.env.GOCACHE).not.toBe(join(home, "ambient-cache"));
  expect(dirname(options.env.GOMODCACHE)).toBe(dirname(options.env.HOME));
  expect(fs.statSync(join(home, ".local/bin/piloto")).mode & 0o777).toBe(0o755);
  const entry = manifest(home).entries.find(e => e.path === ".local/bin/piloto");
  expect(entry).toMatchObject({ component: "piloto", installed: { kind: "file", mode: 0o755 } });
  expect(doctorRuntime({ home, runner: () => ({ status: 0, stdout: "gentle-ai 4.0.0" }) }).piloto).toBe("ok");
  expect(fs.existsSync(options.cwd)).toBe(false); // private build tree was cleaned
}));

(Bun.which("go") ? test : test.skip)("real runtime piloto build compiles solely from the shipped Go sources", () => fixture(({ home, options }) => {
  options.runner = (command, argv, spawnOptions) => {
    if (command === "gentle-ai") return { status: 0, stdout: "gentle-ai 4.0.0" };
    expect(command).toBe("go"); expect(argv[0]).toBe("build");
    if (!spawnOptions.cwd.endsWith("/piloto")) { fs.writeFileSync(argv[5], "fixture radar", { mode: 0o755 }); return { status: 0 }; }
    // Only the reviewed, non-test Go sources reach the private build directory.
    expect(fs.readdirSync(spawnOptions.cwd).sort()).toEqual(["aterrizaje.go", "go.mod", "main.go", "marca.go", "revision.go", "vuelo.go", "worktree.go"]);
    expect(spawnOptions.env.GOFLAGS).toBe("-mod=readonly");
    const result = spawnSync(command, argv, spawnOptions);
    expect(String(result.stderr ?? "")).toBe(""); expect(result.status).toBe(0);
    return result;
  };
  const plan = prepareRuntime(options);
  expect(plan.desired.find(item => item.path === ".local/bin/piloto").files[""].bytes.length).toBeGreaterThan(0);
}), 180_000);

test("generated Pi extension injects the copiloto card per turn, bounded and fail-soft", () => fixture(({ home, install }) => {
  install();
  const pi = read(home, ".pi/agent/extensions/chanks-notices.ts");
  expect(pi).toContain('pi.on("before_agent_start"');
  expect(pi).toContain('spawnSync');
  expect(pi).toContain('"copiloto"');
  expect(pi).toContain('args.push("-C", cwd)');
  expect(pi).toContain('"--conversacion"');
  expect(pi).toContain('sessionManager?.sessionId');
  expect(pi).toContain("timeout: 10_000");
  expect(pi).toContain("maxBuffer: 64 * 1024");
  expect(pi).toContain('customType: "copiloto-card"');
  expect(pi).toContain("ctx.ui.notify");
  expect(pi).toContain("catch { return null }");
}));

test("generated Pi module loads passively, shows notices, and injects no card without the tool", () => fixture(({ home, install }) => {
  install();
  // A fresh process binds os.homedir() to this fixture's HOME at startup. PATH keeps
  // no reachable copiloto so the fail-soft branch is observed, not simulated.
  const empty = join(home, "empty-bin"); fs.mkdirSync(empty, { recursive: true, mode: 0o755 });
  const script = `const extension = await import(${JSON.stringify(pathToFileURL(join(home, ".pi/agent/extensions/chanks-notices.ts")).href)});
    const home = process.env.HOME; const handlers = new Map(); const notices = [];
    extension.default({ on: (event, callback) => { if (!["tool_result", "before_agent_start"].includes(event)) throw new Error("unexpected event"); handlers.set(event, callback); } });
    const ctx = { hasUI: true, cwd: home, ui: { notify: text => notices.push(text) } };
    const radar = { toolName: "bash", input: { command: "radar sesion S195" } };
    const passive = handlers.get("tool_result")(radar, ctx) === undefined;
    handlers.get("tool_result")({ toolName: "read", input: { path: home + "/.agents/skills/control-tower/SKILL.md" } }, ctx);
    handlers.get("tool_result")({ ...radar, isError: true }, ctx);
    handlers.get("tool_result")({ toolName: "bash", input: { command: "echo radar sesion S195" } }, ctx);
    handlers.get("tool_result")({ toolName: "bash", input: { command: "radar sesion S195 && echo later" } }, ctx);
    handlers.get("tool_result")(radar, { ...ctx, hasUI: false });
    const noCard = handlers.get("before_agent_start")({ type: "before_agent_start", prompt: "hola" }, ctx) === undefined;
    process.stdout.write(JSON.stringify({ passive, noCard, notices }));`;
  const result = spawnSync(process.execPath, ["--eval", script], { env: { HOME: home, PATH: empty }, encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024 });
  expect(result.status).toBe(0); expect(result.stderr).toBe("");
  expect(JSON.parse(result.stdout)).toEqual({ passive: true, noCard: true, notices: ["🗼 Torre · radar sesion", "💪 Chanks · control-tower · lectura completada"] });
}));

test("generated Pi extension injects and shows the copiloto card when the tool is installed", () => fixture(({ home, install }) => {
  install();
  const bin = join(home, "fake-bin"); fs.mkdirSync(bin, { recursive: true, mode: 0o755 });
  // The shim proves the exact argv and working directory and prints the card.
  fs.writeFileSync(join(bin, "copiloto"), "#!/bin/sh\nprintf 'DIR=%s ARGS=%s\\n' \"$(pwd)\" \"$*\"\n", { mode: 0o755 });
  const script = `const extension = await import(${JSON.stringify(pathToFileURL(join(home, ".pi/agent/extensions/chanks-notices.ts")).href)});
    const home = process.env.HOME; const handlers = new Map(); const notices = [];
    extension.default({ on: (event, callback) => handlers.set(event, callback) });
    const ctx = { hasUI: true, cwd: home, sessionManager: { sessionId: "sm-01_X.9" }, ui: { notify: (text, level) => notices.push([text, level]) } };
    const result = handlers.get("before_agent_start")({ type: "before_agent_start", prompt: "hola" }, ctx);
    const hidden = handlers.get("before_agent_start")({ type: "before_agent_start", prompt: "hola" }, { ...ctx, hasUI: false });
    const unnamed = handlers.get("before_agent_start")({ type: "before_agent_start", prompt: "hola" }, { ...ctx, sessionManager: {} });
    const unsafe = handlers.get("before_agent_start")({ type: "before_agent_start", prompt: "hola" }, { ...ctx, sessionManager: { sessionId: "a b/c" } });
    process.stdout.write(JSON.stringify({ result, hidden, unnamed, unsafe, notices }));`;
  const result = spawnSync(process.execPath, ["--eval", script], { env: { HOME: home, PATH: bin }, encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024 });
  expect(result.status).toBe(0); expect(result.stderr).toBe("");
  const card = `DIR=${home} ARGS=tarjeta --conversacion sm-01_X.9 -C ${home}`;
  const plain = `DIR=${home} ARGS=tarjeta -C ${home}`;
  expect(JSON.parse(result.stdout)).toEqual({ result: { message: { customType: "copiloto-card", content: card, display: false } },
    hidden: { message: { customType: "copiloto-card", content: card, display: false } },
    unnamed: { message: { customType: "copiloto-card", content: plain, display: false } },
    unsafe: { message: { customType: "copiloto-card", content: plain, display: false } },
    notices: [[`🧭 Copiloto\n${card}`, "info"], [`🧭 Copiloto\n${plain}`, "info"], [`🧭 Copiloto\n${plain}`, "info"]] });
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

test("settings edited between installs survive a reinstall followed by uninstall", () => {
  fixture(({ home, write, install }) => {
    install();
    const edited = JSON.parse(read(home, ".claude/settings.json"));
    edited.personal = "kept";
    write(".claude/settings.json", JSON.stringify(edited));
    install();
    uninstallRuntime({ home });
    expect(JSON.parse(read(home, ".claude/settings.json"))).toEqual({ personal: "kept" });
  });
  fixture(({ home, write, install }) => {
    write(".claude/settings.json", JSON.stringify({ theme: "dark" }));
    install();
    const edited = JSON.parse(read(home, ".claude/settings.json"));
    edited.personal = "kept";
    write(".claude/settings.json", JSON.stringify(edited));
    install();
    uninstallRuntime({ home });
    expect(JSON.parse(read(home, ".claude/settings.json"))).toEqual({ theme: "dark", personal: "kept" });
  });
});
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

test("doctor detects missing new-runtime pointers and accepts subset ownership records", () => fixture(({ home, options, install }) => {
  install(); fs.mkdirSync(join(home, ".codex"), { mode: 0o755 });
  expect(doctorRuntime({ home, runner: options.runner }).pointers).toBe("missing");
  const record = manifest(home); record.entries.pop();
  fs.writeFileSync(join(home, ".local/share/torre-control/runtime-ownership.json"), JSON.stringify(record));
  expect(doctorRuntime({ home, runner: options.runner })).toMatchObject({ skills: "ok", radar: "ok", copiloto: "ok", piloto: "missing", pointers: "missing" });
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

test("S225 grows a subset manifest back to the full running roster", () => fixture(({ home, install }) => {
  install();
  const full = manifest(home).entries.length;
  const name = "control-tower", agent = `.agents/skills/${name}`, claude = `.claude/skills/${name}`;
  fs.rmSync(join(home, agent), { recursive: true, force: true });
  fs.unlinkSync(join(home, claude));
  const record = manifest(home); record.entries = record.entries.filter(entry => entry.path !== agent && entry.path !== claude);
  expect(record.entries.length).toBe(full - 2);
  fs.writeFileSync(join(home, ".local/share/torre-control/runtime-ownership.json"), JSON.stringify(record));
  install();
  expect(manifest(home).entries).toHaveLength(full);
  expect(fs.readlinkSync(join(home, claude))).toBe("../../.agents/skills/control-tower");
  expect(fs.existsSync(join(home, agent, "SKILL.md"))).toBe(true);
  expect(doctorRuntime({ home, runner: () => ({ status: 0, stdout: "gentle-ai 4.0.0" }) }).skills).toBe("ok");
}));

test("S225 retires a skill that left the roster with a backup and keeps doctor and uninstall working", () => fixture(({ home, options, install }) => {
  install();
  const agent = ".agents/skills/legacy-skill", claude = ".claude/skills/legacy-skill";
  fs.mkdirSync(join(home, agent), { recursive: true, mode: 0o755 });
  fs.writeFileSync(join(home, agent, "SKILL.md"), "legacy bytes", { mode: 0o644 });
  fs.symlinkSync("../../.agents/skills/legacy-skill", join(home, claude));
  const record = manifest(home);
  record.entries.push({ path: agent, component: "skills", installed: { kind: "directory", children: { "SKILL.md": fileSnapshot(join(home, agent, "SKILL.md")) } } });
  record.entries.push({ path: claude, component: "skills", installed: linkSnapshot(join(home, claude)) });
  record.directories.push(agent);
  fs.writeFileSync(join(home, ".local/share/torre-control/runtime-ownership.json"), JSON.stringify(record));
  install();
  expect(fs.existsSync(join(home, agent))).toBe(false);
  expect(fs.existsSync(join(home, claude))).toBe(false);
  expect(manifest(home).entries.some(entry => entry.path === agent || entry.path === claude)).toBe(false);
  expect(holdsBytes(join(home, ".local/share/torre-control/backups"), "legacy bytes")).toBe(true);
  expect(doctorRuntime({ home, runner: options.runner })).toMatchObject({ skills: "ok", radar: "ok", signatures: "ok", pointers: "ok" });
  expect(uninstallRuntime({ home })).toEqual({ status: "uninstalled" });
}));

test("S225 subset tolerance still rejects non-ownable and mis-owned manifest destinations", () => {
  for (const [path, component] of [[".ssh", "skills"], [".agents/skills/legacy-skill", "radar"], [".agents/skills/legacy-skill/SKILL.md", "skills"], [".agents/skills/_shared", "skills"], [".agents/skills/..", "skills"]]) fixture(({ home, write, install }) => {
    install();
    const record = manifest(home);
    record.entries.push({ path, component, installed: { kind: "file", sha256: "deadbeef", mode: 0o644 } });
    write(".local/share/torre-control/runtime-ownership.json", JSON.stringify(record));
    expect(install).toThrow(/invalid manifest destination/);
  });
});

test("S225 refuses a retired entry that no longer matches its recorded snapshot instead of deleting it", () => fixture(({ home, install }) => {
  install();
  const agent = ".agents/skills/legacy-skill";
  fs.mkdirSync(join(home, agent), { recursive: true, mode: 0o755 });
  fs.writeFileSync(join(home, agent, "SKILL.md"), "recorded", { mode: 0o644 });
  const record = manifest(home);
  record.entries.push({ path: agent, component: "skills", installed: { kind: "directory", children: { "SKILL.md": fileSnapshot(join(home, agent, "SKILL.md")) } } });
  fs.writeFileSync(join(home, ".local/share/torre-control/runtime-ownership.json"), JSON.stringify(record));
  fs.writeFileSync(join(home, agent, "SKILL.md"), "tampered", { mode: 0o644 });
  expect(install).toThrow(/modified owned entry/);
  expect(read(home, `${agent}/SKILL.md`)).toBe("tampered");
}));

test("S225 drops an already-absent retired entry without failing the upgrade", () => fixture(({ home, install }) => {
  install();
  const agent = ".agents/skills/legacy-skill";
  const record = manifest(home);
  record.entries.push({ path: agent, component: "skills", installed: { kind: "directory", children: {} } });
  fs.writeFileSync(join(home, ".local/share/torre-control/runtime-ownership.json"), JSON.stringify(record));
  install();
  expect(manifest(home).entries.some(entry => entry.path === agent)).toBe(false);
  expect(doctorRuntime({ home, runner: () => ({ status: 0, stdout: "gentle-ai 4.0.0" }) }).skills).toBe("ok");
}));

test("#176 a retired skill's nested directories in the ownership manifest do not block the upgrade", () => fixture(({ home, install }) => {
  install();
  const agent = ".agents/skills/chanks-0-comunicacion-agentes";
  fs.mkdirSync(join(home, agent, "references"), { recursive: true, mode: 0o755 });
  fs.writeFileSync(join(home, agent, "SKILL.md"), "recorded", { mode: 0o644 });
  fs.writeFileSync(join(home, agent, "references/casos-herdr.md"), "recorded", { mode: 0o644 });
  const record = manifest(home);
  record.entries.push({ path: agent, component: "skills", installed: { kind: "directory", children: {
    "SKILL.md": fileSnapshot(join(home, agent, "SKILL.md")),
    references: { kind: "directory", children: { "casos-herdr.md": fileSnapshot(join(home, agent, "references/casos-herdr.md")) } },
  } } });
  record.directories.push(`${agent}/references`);
  fs.writeFileSync(join(home, ".local/share/torre-control/runtime-ownership.json"), JSON.stringify(record));
  install();
  // The upgrade drops the retired entry and removes the Tower-owned retired bytes;
  // machines that already replaced them (absent on disk) take the drop-only path.
  expect(manifest(home).entries.some(entry => entry.path === agent)).toBe(false);
  expect(fs.existsSync(join(home, agent))).toBe(false);
}));

test("pointer insertion tolerates real gentle-ai blocks with unpaired start/end notes and nesting", () => fixture(({ home, write, install }) => {
  const claude = "<!-- gentle-ai:orchestrator -->\n<!-- authority-first-terminal-procedure:start -->\nsteps\n" +
    "<!-- authority-first-terminal-procedure:end -->\n<!-- /gentle-ai:orchestrator -->\n" +
    "<!-- gentle-ai:agent-routing -->\nrouting\n<!-- gentle-ai:remote-authorization -->\nremote\n" +
    "<!-- /gentle-ai:remote-authorization -->\n<!-- /gentle-ai:agent-routing -->\n" +
    "<!-- chanks:doc-guard-rule -->\npersonal\n<!-- /chanks:doc-guard-rule -->\n";
  write(".claude/CLAUDE.md", claude);
  install();
  const after = read(home, ".claude/CLAUDE.md");
  expect(after.startsWith(claude)).toBe(true);
  expect(after.match(/<!-- control-tower:pointer -->/g)).toHaveLength(1);
  uninstallRuntime({ home });
  expect(read(home, ".claude/CLAUDE.md")).toBe(claude);
}));
