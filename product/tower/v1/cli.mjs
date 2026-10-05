#!/usr/bin/env bun
import { accessSync, chmodSync, closeSync, constants, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync, readSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { basename, delimiter, dirname, isAbsolute, join, parse, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { installGlobal, updateGlobal, doctorGlobal, rollbackGlobal, uninstallGlobal } from "./global.mjs";
import { requireGentleAi, doctorRuntime, preflightRuntimeHome, uninstallRuntime } from "./runtime-config.mjs";
import { buildRelease } from "./release-build.mjs";
import { preflightProjectAdoption, INSTRUCTION_PATHS } from "./adoption.mjs";
import { validateBundle } from "./bundle.mjs";
import { acquireLatestRelease, checkLatestRelease, updateTui } from "./release.mjs";
import { initRegisteredProject, doctorRegisteredProject, uninstallRegisteredProject,
  cleanupRegisteredProject, updateRegisteredProject, listProjects, refreshRegisteredProjects } from "./projects.mjs";

const operations = { installGlobal, updateGlobal, doctorGlobal, rollbackGlobal, uninstallGlobal,
  initRegisteredProject, doctorRegisteredProject, uninstallRegisteredProject,
  cleanupRegisteredProject, updateRegisteredProject, listProjects };
const globals = { install: "installGlobal", update: "updateGlobal", doctor: "doctorGlobal", rollback: "rollbackGlobal", uninstall: "uninstallGlobal" };
const projects = { init: "initRegisteredProject", doctor: "doctorRegisteredProject", update: "updateRegisteredProject",
  uninstall: "uninstallRegisteredProject", cleanup: "cleanupRegisteredProject" };
const common = ["--state", "--launcher", "--registry"];
const usage = (reason) => { throw new Error(`usage: ${reason}`); };
const owns = (object, key) => Object.hasOwn(object, key);

// Commands/subcommands are positional; flag/value pairs are closed and order-independent.
function parseArguments(argv) {
  if (!Array.isArray(argv) || argv.some((arg) => typeof arg !== "string")) usage("string arguments required");
  const [command, ...tail] = argv;
  if (!command) usage("command required (install, update, doctor, rollback, project, list, status)");
  let subcommand;
  if (command === "project") {
    subcommand = tail.shift();
    if (!owns(projects, subcommand)) usage("unknown or missing project command");
  } else if (!owns(globals, command) && !["list", "status"].includes(command)) usage("unknown command");
  const latest = ["install", "update"].includes(command) && tail.includes("--latest");
  const fromCheckout = ["install", "update"].includes(command) && tail.includes("--from-checkout");
  const check = command === "update" && tail.includes("--check");
  const required = check ? ["--check"] : latest ? ["--latest"] : fromCheckout ? ["--from-checkout"] : command === "project" ? ["--project", ...(subcommand === "init" ? ["--trust"] : [])] :
    ["install", "update"].includes(command) ? ["--tag", "--asset", "--sha256"] : [];
  const allowed = new Set([...common, ...required, ...(!check && (["install", "update"].includes(command) || command === "project" && ["init", "update", "doctor"].includes(subcommand)) ? ["--fix-permissions"] : [])]);
  const flags = Object.create(null);
  for (let index = 0; index < tail.length;) {
    const flag = tail[index], value = tail[index + 1];
    if ((flag === "--check" && check || flag === "--latest" && latest && !check || flag === "--fix-permissions" && allowed.has(flag)) && !owns(flags, flag)) {
      flags[flag] = true;
      index++;
      continue;
    }
    index += 2;
    if (!allowed.has(flag) || owns(flags, flag) || !value || value.startsWith("--")) usage("invalid, duplicate or missing flag/value");
    flags[flag] = value;
  }
  if (required.some((flag) => !owns(flags, flag))) usage("required flags missing");
  if (subcommand === "init" && flags["--trust"] !== "trusted") usage("trust must be trusted");
  return { command, subcommand, flags };
}

function homePath(env) {
  const home = env.HOME;
  if (typeof home !== "string" || !isAbsolute(home) || resolve(home) !== home || home === parse(home).root ||
      home.length > 4096 || /[\0\r\n\\]/.test(home)) usage("HOME must be an absolute canonical directory");
  return home;
}

// Only prepare selected default parents, never override parents or lifecycle-owned roots.
// Walk without recursive mkdir so a pre-existing symlink cannot redirect preparation.
function defaultParent(home, target, create = true) {
  let current = parse(home).root;
  for (const part of target.slice(current.length).split(sep)) {
    current = join(current, part);
    let entry;
    try { entry = lstatSync(current); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    if (!entry && !create && current.startsWith(home + sep)) return false;
    if (!entry && current.startsWith(home + sep)) {
      mkdirSync(current, { mode: 0o755 });
      // Normalize only directories we just created; umask must not choose their final mode.
      chmodSync(current, 0o755);
      entry = lstatSync(current);
    }
    if (!entry?.isDirectory() || entry.isSymbolicLink()) throw new Error("unsafe default directory or ancestor");
    if (current === home || current.startsWith(home + sep)) {
      if (process.getuid && entry.uid !== process.getuid()) {
        throw new Error(`default directory ${current} is owned by another user`);
      }
      if (entry.mode & 0o022) {
        const fixPath = /^[A-Za-z0-9_./-]+$/.test(current) ? current : `'${current.replaceAll("'", "'\\''")}'`;
        throw new Error(`default directory ${current} is group- or world-writable ` +
          `(mode ${(entry.mode & 0o7777).toString(8)}); run: chmod 755 ${fixPath} (or set umask 022 before installing)`);
      }
    }
  }
  return true;
}

// Lifecycles require existing ancestors. Missing default ancestors mean absent storage,
// not permission to create it. Never hide a partially present installation or bad override.
function absentGlobalDefaults(home, stateRoot, launcherPath, flags) {
  for (const path of [stateRoot, launcherPath]) homePath({ HOME: path });
  if (stateRoot === launcherPath || stateRoot.startsWith(launcherPath + sep) ||
      launcherPath.startsWith(stateRoot + sep)) usage("overlapping paths");
  let missing = false;
  for (const [flag, path] of [["--state", stateRoot], ["--launcher", launcherPath]]) {
    const present = defaultParent(home, dirname(path), false);
    if (!present && owns(flags, flag)) throw new Error("unsafe override ancestor");
    missing ||= !present;
  }
  if (missing) {
    for (const path of [stateRoot, launcherPath]) {
      try { lstatSync(path); throw new Error("incomplete installation ancestors"); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
  }
  return missing;
}

function message(error) {
  const text = String(error?.message ?? error).split(/[\r\n\u2028\u2029]/, 1)[0].slice(0, 440);
  return `${text || "operation failed"}${error instanceof AggregateError ? "; AggregateError carries recovery evidence" : ""}`;
}
const failure = (stderr, text) => stderr.write(`Invalid Tower CLI: ${text}\n`);
function reportError(stderr, error, prefix = "") {
  failure(stderr, prefix + (Array.isArray(error?.permissionPaths) ? error.message : message(error)));
  if (error instanceof AggregateError) {
    const errors = error.errors.slice(0, 8).map((inner) =>
      String(inner?.message ?? inner).split(/[\r\n\u2028\u2029]/, 1)[0].slice(0, 240));
    stderr.write(`${JSON.stringify({ type: "tower.cli.recovery/1", errors,
      omitted: Math.max(0, error.errors.length - errors.length) })}\n`);
  }
}

const statusProbes = {
  executable: (name, env) => (env.PATH ?? "").split(delimiter).some((directory) => {
    const path = join(directory || ".", name);
    try { accessSync(path, constants.X_OK); return statSync(path).isFile(); } catch { return false; }
  }),
  config: (path) => {
    try { return statSync(path).isDirectory(); } catch { return false; }
  },
};

/** Read-only snapshot; runner receives bounded spawn options, fs probes never execute agents. */
export function collectStatus({ home, stateRoot, launcherPath, registryRoot, flags = {} }, deps = {}) {
  const { env = process.env, runner = spawnSync, bunVersion = process.versions.bun,
    enginePath = fileURLToPath(import.meta.url) } = deps;
  const api = { ...operations, ...deps.operations }, fs = { ...statusProbes, ...deps.fsProbes };
  let engine, projectList;
  try {
    const result = absentGlobalDefaults(home, stateRoot, launcherPath, flags) ?
      { status: "absent", active: null, previous: null } : api.doctorGlobal({ stateRoot, launcherPath, home, env, ...(deps.runner ? { runner: deps.runner } : {}) });
    engine = { installed: result.status === "healthy", ...result };
  } catch (error) {
    engine = { installed: false, status: "error", active: null, previous: null, error: message(error) };
  }
  try {
    const missing = !owns(flags, "--registry") && !defaultParent(home, dirname(registryRoot), false);
    projectList = missing ? [] : api.listProjects({ registryRoot }).map(({ projectRoot, status, towerState, error }) =>
      ({ projectRoot, status, ...(towerState ? { towerState } : {}),
        ...(Array.isArray(error?.permissionPaths) ? { permissionError: true } : {}) }));
  } catch (error) { projectList = { error: message(error) }; }
  const probe = (command, args) => {
    try {
      const result = runner(command, args, { env, encoding: "utf8", timeout: 2000,
        killSignal: "SIGKILL", maxBuffer: 64 * 1024, stdio: ["ignore", "pipe", "pipe"] });
      if (result.error || result.status !== 0) return {
        present: result.error?.code !== "ENOENT", error: message(result.error ??
          new Error(`${command} probe failed (${result.signal ?? result.status})`)) };
      return { present: true, output: String(result.stdout ?? "").slice(0, 64 * 1024) };
    } catch (error) { return { present: false, error: message(error) }; }
  };
  const prerequisite = (name, args, pattern) => {
    const result = name === "bun" && bunVersion ? { present: true, output: bunVersion } : probe(name, args);
    if (result.error) return result;
    const version = result.output.trim().match(pattern)?.[1];
    return { present: true, ...(version ? { version } : { error: "unrecognized version output" }) };
  };
  const gh = prerequisite("gh", ["--version"], /\bgh version\s+(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)/);
  const auth = probe("gh", ["auth", "status", "--hostname", "github.com"]);
  gh.authenticated = !auth.error;
  if (auth.error && !gh.error) gh.error = auth.error;
  const prerequisites = { gh,
    bun: prerequisite("bun", ["--version"], /^(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)/),
    git: prerequisite("git", ["--version"], /\bgit version\s+(\d+\.\d+(?:\.[\w.-]+)?)/),
    go: prerequisite("go", ["version"], /\bgo version go(\d+\.\d+(?:\.\d+)?(?:rc\d+|beta\d+)?)/),
    gentleAi: prerequisite("gentle-ai", ["version"], /^gentle-ai\s+(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)/) };
  const safe = (fn) => { try { return Boolean(fn()); } catch { return false; } };
  const agents = Object.fromEntries([["claude", ".claude"], ["pi", ".pi"], ["codex", ".codex"],
    ["opencode", ".config/opencode"]].map(([name, path]) => [name, {
    executable: safe(() => fs.executable(name, env)), config: safe(() => fs.config(join(home, path))) }]));
  return { schema: "tower.v1.status/1", engine, projects: projectList, prerequisites, agents,
    system: { os: process.platform, arch: process.arch, shell: env.SHELL ? basename(env.SHELL) : null },
    version: engine.active && enginePath === join(stateRoot, "versions", engine.active, "product/tower/v1/cli.mjs") ? engine.active : null };
}

const cancelled = Symbol("menu cancelled");
const restoreScreen = "\x1b[?25h\x1b[?1049l";

// One byte queue spans selection and prompts, including CR LF split across data events.
function menuInput(stdin, stdout) {
  let queue = [], wake, ended = false, error, skipLF = false, raw = false, screen = false, closed = false;
  const notify = () => { wake?.(); };
  const data = (chunk) => {
    for (const char of String(chunk)) {
      if (skipLF && char === "\n") { skipLF = false; continue; }
      skipLF = char === "\r";
      queue.push(char === "\r" ? "\n" : char);
    }
    if (queue.length > 65536) { error = new Error("menu input too large; aborted"); queue = []; }
    if (queue.length || error) notify();
  };
  const end = () => { ended = true; notify(); };
  const failed = (cause) => { error = cause; notify(); };
  const restore = () => {
    // Independent best-effort restoration: a failed tty call must not hide the cursor.
    if (raw) { raw = false; try { stdin.setRawMode(false); } catch {} }
    if (screen) { screen = false; try { stdout.write(restoreScreen); } catch {} }
  };
  const stop = () => { restore(); error = cancelled; queue = []; notify(); };
  stdin.setEncoding("utf8");
  stdin.on("data", data).on("end", end).on("error", failed);
  process.on("SIGINT", stop);
  process.on("exit", stop);
  const next = async (timeout) => {
    if (!queue.length && !ended && !error) await new Promise((resolve) => {
      let timer;
      wake = () => { clearTimeout(timer); wake = undefined; resolve(); };
      if (timeout !== undefined) timer = setTimeout(wake, timeout);
    });
    if (error) throw error;
    return queue.shift() ?? null;
  };
  return {
    next, restore,
    raw: () => {
      if (typeof stdin.setRawMode !== "function") return false;
      raw = true;
      try { stdin.setRawMode(true); return true; }
      catch { restore(); return false; }
    },
    screen: () => { screen = true; stdout.write("\x1b[?1049h\x1b[?25l"); },
    line: async (echo) => {
      let answer = "";
      while (true) {
        const char = await next();
        if (char === null) return null;
        if (char === "\x03" || char === "\x04") throw cancelled;
        if (char === "\n") { if (echo) stdout.write("\r\n"); return answer; }
        if (char === "\x7f" || char === "\b") {
          if (answer) { answer = [...answer].slice(0, -1).join(""); if (echo) stdout.write("\b \b"); }
        } else if (char >= " " && char !== "\x7f") {
          answer += char;
          if (answer.length > 4096) usage("menu input too large; aborted");
          if (echo) stdout.write(char);
        } else usage("invalid menu input; aborted");
      }
    },
    close: () => {
      if (closed) return;
      closed = true;
      restore();
      stdin.off("data", data).off("end", end).off("error", failed);
      stdin.pause();
      process.off("SIGINT", stop);
      process.off("exit", stop);
    },
  };
}

async function selectMenu(input, stdout, entries, env) {
  let selected = 0;
  const draw = () => {
    const color = !owns(env, "NO_COLOR");
    stdout.write("\x1b[H\x1b[K Tower V1\r\n" + entries.map((args, index) =>
      `\x1b[K ${index === selected ? ">" : " "} ${color && index === selected ? "\x1b[1;36m" : ""}` +
      args.join(" ") + `${color && index === selected ? "\x1b[0m" : ""}\r\n`).join("") +
      "\x1b[K Up/Down or k/j · Enter select · q/Esc exit\r\n\x1b[J");
  };
  input.screen();
  try {
    while (true) {
      draw();
      let key = await input.next();
      if (key === null) usage("menu input missing; aborted");
      if (key === "q" || key === "\x03") return "10";
      if (key === "\n") return String(selected + 1);
      if (key === "\x1b") {
        const prefix = await input.next(60);
        if (prefix !== "[" && prefix !== "O") return "10";
        key = await input.next(60);
      }
      if (key === "A" || key === "k") selected = (selected + entries.length - 1) % entries.length;
      if (key === "B" || key === "j") selected = (selected + 1) % entries.length;
    }
  } finally { input.restore(); }
}

// One selection, one invocation of the same closed dispatcher. No menu-only operations.
async function runMenu(deps) {
  const { stdin = process.stdin, stdout = process.stdout, stderr = process.stderr, env = process.env } = deps;
  let input, raw = false;
  try {
    if (!deps.readLine) {
      input = menuInput(stdin, stdout);
      raw = env.TERM !== "dumb" && input.raw();
    }
    const readLine = deps.readLine ?? (() => input.line(raw));
    const ask = async (prompt) => {
      // Raw empty answers abort immediately. Cooked mode permits at most two retries:
      // icrnl can turn CR LF into LF LF; a blank line must never confirm an action.
      for (let attempt = 0; attempt < (raw || deps.readLine ? 1 : 3); attempt++) {
        stdout.write(prompt + (raw ? "\r\n" : "\n"));
        const answer = await readLine(prompt);
        if (answer === "" && !raw && !deps.readLine) continue;
        if (typeof answer !== "string" || !answer || answer.length > 4096 || /[\0\r\n]/.test(answer))
          usage("menu input missing or invalid; aborted");
        return answer;
      }
      usage("menu input missing or invalid; aborted");
    };
    const entries = [["install"], ["update"], ["doctor"], ["rollback"],
      ["project", "init"], ["project", "doctor"], ["project", "uninstall"],
      ["project", "cleanup"], ["list"]];
    let choice;
    if (raw && env.TERM !== "dumb" && env.TOWER_MENU !== "plain") {
      choice = await selectMenu(input, stdout, [...entries, ["exit"]], env);
      // Selection restores cooked mode and scrollback before any text prompts.
      if (choice !== "10" && !["3", "9"].includes(choice)) raw = input.raw();
    } else {
      const newline = raw ? "\r\n" : "\n";
      stdout.write(entries.map((args, index) => `${index + 1}. ${args.join(" ")}`).join(newline) +
        `${newline}10. exit${newline}`);
      choice = await ask("Choice: ");
    }
    if (choice === "10") return 0;
    if (!/^[1-9]$/.test(choice)) usage("invalid menu choice; aborted");
    const argv = [...entries[Number(choice) - 1]], [command, subcommand] = argv;
    if (["install", "update"].includes(command)) {
      for (const [flag, prompt] of [["--tag", "Tag: "], ["--asset", "Asset: "],
        ["--sha256", "SHA256 (type the trusted digest): "]]) argv.push(flag, await ask(prompt));
    }
    if (command === "project") {
      const root = await ask("Project root (explicit absolute path): ");
      homePath({ HOME: root }); // Validate before any default-parent preparation.
      argv.push("--project", root);
      if (subcommand === "init") argv.push("--trust", await ask("Type trusted to accept project trust: "));
    }
    parseArguments(argv);
    const action = command === "project" ? subcommand : command;
    if (["update", "rollback", "uninstall", "cleanup"].includes(action)) {
      const word = action.toUpperCase();
      if (await ask(`Type ${word} to confirm: `) !== word) usage("confirmation declined; aborted");
    }
    input?.close(); // No raw mode or signal handler may survive into lifecycle dispatch.
    return main(argv, deps);
  } catch (error) {
    if (error === cancelled) return 0;
    reportError(stderr, error);
    return 1;
  } finally { input?.close(); }
}

function verifiedTuiFile(path, limit, fs) {
  const fd = fs.openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || stat.mode & 0o022 || stat.size > limit) throw new Error("unsafe interface file");
    const bytes = Buffer.alloc(stat.size + 1), count = fs.readSync(fd, bytes, 0, bytes.length, 0);
    if (count !== stat.size) throw new Error("interface file changed");
    return bytes.subarray(0, count);
  } finally { fs.closeSync(fd); }
}
function runTui(deps) {
  const { env = process.env, tuiSpawn = spawnSync, cliPath = fileURLToPath(import.meta.url) } = deps;
  const home = homePath(env), store = join(home, ".local/share/torre-control/tui");
  const fs = { openSync, fstatSync, readSync, closeSync, ...deps.tuiFs };
  let record;
  try {
    if (!defaultParent(home, store, false)) throw new Error("missing interface store");
    record = JSON.parse(verifiedTuiFile(join(store, "current.json"), 4096, fs).toString("utf8"));
    const platform = `${process.platform}-${process.arch === "x64" ? "amd64" : process.arch}`;
    if (record?.schema !== "tower.v1.tui/1" || Object.keys(record).sort().join() !== "path,platform,schema,sha256" ||
        !/^[a-f0-9]{64}$/.test(record.sha256) || record.platform !== platform || record.path !== join(store, record.sha256, "torre-tui")) throw new Error("invalid interface record");
    defaultParent(home, dirname(record.path), false);
    const bytes = verifiedTuiFile(record.path, 64 * 1024 * 1024, fs);
    if (createHash("sha256").update(bytes).digest("hex") !== record.sha256) throw new Error("interface hash mismatch");
  } catch { return null; }
  let temporary;
  try {
    // Ambient TORRE_CONTROL_CLI is not authority to select executable code.
    // Only direct TUI-binary developer launches honor that override.
    let launcher;
    const versions = join(home, ".local/share/torre-control/v1/versions") + sep;
    if (cliPath.startsWith(versions)) launcher = join(home, ".local/bin/torre-control");
    else {
      // Checkout .mjs and installed source members are not executable. A private
      // Bun shim preserves this exact invocation without changing global launcher bytes.
      temporary = mkdtempSync(join(tmpdir(), "tower-cli-tui-"));
      launcher = join(temporary, "torre-control");
      writeFileSync(launcher, `#!${process.execPath}\nimport {spawnSync} from "node:child_process";\nconst r=spawnSync(${JSON.stringify(process.execPath)},[${JSON.stringify(cliPath)},...process.argv.slice(2)],{stdio:"inherit",timeout:300000});\nprocess.exit(r.status??1);\n`, { flag: "wx", mode: 0o755 });
      chmodSync(launcher, 0o755);
    }
    const result = tuiSpawn(record.path, [], { stdio: "inherit", env: { ...env, TORRE_CONTROL_CLI: launcher }, timeout: 24 * 60 * 60 * 1000 });
    if (result.error) throw result.error;
    return result.status ?? 1;
  } catch (error) {
    if (["ENOENT", "EACCES"].includes(error.code)) return null;
    throw error;
  } finally { if (temporary) rmSync(temporary, { recursive: true, force: true }); }
}

/** Testable dispatcher: injected environment, output sinks, gh runner and operation doubles.
 * Returns an exit code (a Promise for the interactive menu); never sets process.exitCode.
 * Production filesystem effects belong to the selected lifecycle and default-parent preparation.
 */
export function main(argv, deps = {}) {
  const { env = process.env, stdout = process.stdout, stderr = process.stderr, runner } = deps;
  let localTemporary;
  try {
    if (Array.isArray(argv) && argv.length === 1 && ["--help", "help"].includes(argv[0])) {
      stdout.write("torre-control install|update --latest  (authenticated published checksum)\n" +
        "torre-control install|update --tag <tag> --asset <asset> --sha256 <trusted-digest>\n" +
        "torre-control install|update --from-checkout <repo>  (clean committed tree; offline release-build and digest verification)\n" +
        "Agregá --fix-permissions a install|update para quitar sólo go-w de las rutas propias informadas dentro de HOME.\n" +
        "torre-control update --check  (read-only JSON, 8s metadata budget; different tags count as available, including checkout-*)\n" +
        "torre-control doctor | status | rollback | uninstall\n" +
        "torre-control project init|update|doctor --project <absolute-path> [--fix-permissions] (init requiere --trust trusted)\n" +
        "uninstall removes owned global resources and restores backups; Gentle AI and projects remain untouched.\n");
      return 0;
    }
    if (Array.isArray(argv) && argv.length === 0 &&
        (deps.stdin ?? process.stdin).isTTY === true && stdout.isTTY === true) {
      if (env.TOWER_MENU !== "plain") {
        const result = runTui(deps);
        if (result !== null) return result;
        stderr.write("Interface not verified or unavailable; falling back to built-in menu.\n");
      }
      return runMenu(deps);
    }
    const { command, subcommand, flags } = parseArguments(argv);
    const home = homePath(env);
    const share = join(home, ".local", "share", "torre-control");
    const stateRoot = flags["--state"] ?? join(share, "v1");
    const launcherPath = flags["--launcher"] ?? join(home, ".local", "bin", "torre-control");
    // Global inspect owns all stateRoot entries; the informational registry must be a sibling.
    const registryRoot = flags["--registry"] ?? join(share, "projects");
    const api = { ...operations, ...deps.operations };
    let result;
    if (flags["--check"]) {
      try {
        // Inspect only the engine receipt: no runtime/prerequisite probes or writes.
        const installed = absentGlobalDefaults(home, stateRoot, launcherPath, flags) ?
          { status: "absent" } : api.doctorGlobal({ stateRoot, launcherPath });
        result = checkLatestRelease({ repository: "achangkuon/control-tower",
          installedTag: installed.status === "healthy" ? installed.activeTag : null,
          runner: runner ?? ((command, args, options) => spawnSync(command, args,
            { ...options, env, encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] })) });
      } catch {
        result = { status: "unknown", reason: "No se pudo determinar la versión instalada." };
      }
    } else if (command === "status") {
      for (const path of [stateRoot, launcherPath, registryRoot]) homePath({ HOME: path });
      if (stateRoot === launcherPath || stateRoot.startsWith(launcherPath + sep) ||
          launcherPath.startsWith(stateRoot + sep)) usage("overlapping paths");
      result = collectStatus({ home, stateRoot, launcherPath, registryRoot, flags }, deps);
    } else if (command === "project" || command === "list") {
      // Project permission admission precedes every registry/default-parent write.
      const permissionsChanged = command === "project" && ["init", "update", "doctor"].includes(subcommand) ?
        preflightProjectAdoption({ projectRoot: flags["--project"], fixPermissions: flags["--fix-permissions"] === true,
          ...(subcommand === "doctor" && flags["--fix-permissions"] !== true ? { groupWritableOk: INSTRUCTION_PATHS } : {}),
          onPermissionsFixed: paths => stderr.write(`Permisos corregidos (sólo go-w):\n${paths.map(path => `- ${path}`).join("\n")}\n`) }) : [];
      // Registered project doctor writes membership; it is intentionally not read-only.
      const missing = !owns(flags, "--registry") &&
        !defaultParent(home, dirname(registryRoot), command !== "list");
      result = command === "list" ? missing ? [] : api.listProjects({ registryRoot }) :
        api[projects[subcommand]]({ registryRoot, projectRoot: flags["--project"],
          ...(subcommand === "init" ? { trustResolution: "trusted" } : {}) });
      if (flags["--fix-permissions"]) result = { ...result, permissionsChanged };
    } else {
      const absent = ["doctor", "uninstall"].includes(command) && absentGlobalDefaults(home, stateRoot, launcherPath, flags);
      const acquiring = command === "install" || command === "update";
      if (acquiring) {
        for (const path of [stateRoot, launcherPath, registryRoot]) homePath({ HOME: path });
        if (stateRoot === launcherPath || stateRoot.startsWith(launcherPath + sep) || launcherPath.startsWith(stateRoot + sep)) usage("overlapping paths");
      }
      // Permission admission (and explicit repair) precedes probes, acquisition,
      // checkout builds and default-parent creation, including --latest's fast path.
      const permissionsChanged = acquiring ? preflightRuntimeHome({ home, stateRoot, launcherPath, registryRoot,
        fixPermissions: flags["--fix-permissions"] === true,
        onPermissionsFixed: paths => stderr.write(`Permisos corregidos (sólo go-w):\n${paths.map(path => `- ${path}`).join("\n")}\n`) }) : [];
      const refreshTui = options => updateTui({ home, stderr, ...options,
        ...(runner === undefined ? {} : { runner }),
        ...(deps.platform === undefined ? {} : { platform: deps.platform }),
        ...(deps.arch === undefined ? {} : { arch: deps.arch }) });
      let latestRelease, checkoutTui;
      if (flags["--latest"]) {
        const missing = absentGlobalDefaults(home, stateRoot, launcherPath, flags);
        // Doctor validates cached provenance and launcher before trusting the installed tag.
        const installed = missing ? { status: "absent" } : api.doctorGlobal({ stateRoot, launcherPath });
        latestRelease = acquireLatestRelease({ repository: "achangkuon/control-tower",
          installedTag: installed.status === "healthy" ? installed.activeTag : null,
          ...(runner === undefined ? {} : { runner }) });
        if (latestRelease.status === "up-to-date") {
          const tui = refreshTui({ repository: "achangkuon/control-tower", tag: latestRelease.tag });
          // Even an unchanged global release must repair intact older project copies.
          // Use the verified active root, never this possibly older CLI's bundle.
          let projects = [];
          if (defaultParent(home, dirname(registryRoot), false)) {
            try {
              const bundleRoot = join(stateRoot, "versions", installed.active);
              const manifest = validateBundle(bundleRoot);
              const template = manifest.members.find(m => m.destination === "instructions/project-agents.md");
              const block = new TextDecoder("utf8", { fatal: true }).decode(Buffer.from(template.bytes, "base64"))
                .replaceAll("{{TOWER_VERSION}}", latestRelease.tag).trimEnd();
              projects = refreshRegisteredProjects({ registryRoot, version: latestRelease.tag, block, bundleRoot });
            } catch (error) { projects = [{ projectRoot: null, status: `skipped:${message(error)}` }]; }
          }
          stdout.write(`${JSON.stringify({ status: "up-to-date", tag: latestRelease.tag, tui, projects,
            ...(flags["--fix-permissions"] ? { permissionsChanged } : {}) })}\n`);
          return 0;
        }
      }
      if (acquiring) {
        requireGentleAi({ env, runner }); // Before parent preparation or local build.
        for (const [flag, path] of [["--state", stateRoot], ["--launcher", launcherPath]])
          if (!owns(flags, flag)) defaultParent(home, dirname(path), false);
      }
      let acquire = acquiring ? { repository: "achangkuon/control-tower", tag: flags["--tag"],
        asset: flags["--asset"], sha256: flags["--sha256"], ...(runner === undefined ? {} : { runner }) } : null;
      if (latestRelease) {
        const { tag, asset, sha256, bytes } = latestRelease;
        // Replay only the pinned verified receipt through the existing bootstrap/global
        // path; no second network download may substitute the admitted package bytes.
        const auth = ["auth", "status", "--active", "--hostname", "github.com"];
        const download = ["release", "download", tag, "--repo", "achangkuon/control-tower", "--pattern", asset, "--output", "-"];
        acquire = { repository: "achangkuon/control-tower", tag, asset, sha256,
          runner: (command, args) => {
            if (command !== "gh") throw new Error("Unexpected verified receipt command");
            if (JSON.stringify(args) === JSON.stringify(auth)) return { status: 0, stdout: Buffer.alloc(0) };
            if (JSON.stringify(args) === JSON.stringify(download)) return { status: 0, stdout: Buffer.from(bytes) };
            throw new Error("Unexpected verified receipt arguments");
          } };
      }
      if (flags["--from-checkout"]) {
        localTemporary = mkdtempSync(join(tmpdir(), "tower-local-install-"));
        const out = join(localTemporary, "tower-v1.json");
        checkoutTui = join(localTemporary, "tui");
        const receipt = (deps.buildRelease ?? buildRelease)({ repo: flags["--from-checkout"], out, "tui-out-dir": checkoutTui },
        { allowTuiFailure: true, ...(runner === undefined ? {} : { builder: runner }) });
        const bytes = readFileSync(out);
        acquire = { repository: "achangkuon/control-tower", tag: `checkout-${receipt.commit.slice(0, 12)}`,
          asset: "tower-v1.json", sha256: receipt.sha256,
          runner: (_command, args) => ({ status: 0, stdout: args[0] === "auth" ? Buffer.alloc(0) : Buffer.from(bytes) }) };
      }
      if (command !== "doctor" && !absent) {
        if (!owns(flags, "--state")) defaultParent(home, dirname(stateRoot));
        if (!owns(flags, "--launcher")) defaultParent(home, dirname(launcherPath));
      }
      result = absent ? command === "uninstall" ? uninstallRuntime({ home }) :
        { status: "absent", active: null, previous: null, components: doctorRuntime({ home, env, runner }) } :
        api[globals[command]]({ stateRoot, launcherPath, home, env, ...(runner ? { runner } : {}), ...(acquiring ? { acquire, registryRoot } : {}) });
      if (latestRelease) result = { ...result, tag: latestRelease.tag,
        tui: refreshTui({ repository: "achangkuon/control-tower", tag: latestRelease.tag }) };
      if (checkoutTui) result = { ...result, tui: refreshTui({ checkout: checkoutTui }) };
      if (flags["--fix-permissions"]) result = { ...result, permissionsChanged };
    }
    stdout.write(`${JSON.stringify(result)}\n`);
    if (command === "project" && result.registry.status === "failed") {
      reportError(stderr, result.registry.error, "local operation succeeded but registry publication failed: ");
      return 1;
    }
    return 0;
  } catch (error) {
    reportError(stderr, error);
    return 1;
  } finally { if (localTemporary) rmSync(localTemporary, { recursive: true, force: true }); }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
