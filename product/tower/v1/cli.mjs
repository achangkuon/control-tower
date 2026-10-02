#!/usr/bin/env bun
import { chmodSync, lstatSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, isAbsolute, join, parse, resolve, sep } from "node:path";
import { installGlobal, updateGlobal, doctorGlobal, rollbackGlobal } from "./global.mjs";
import { initRegisteredProject, doctorRegisteredProject, uninstallRegisteredProject,
  cleanupRegisteredProject, listProjects } from "./projects.mjs";

const operations = { installGlobal, updateGlobal, doctorGlobal, rollbackGlobal,
  initRegisteredProject, doctorRegisteredProject, uninstallRegisteredProject,
  cleanupRegisteredProject, listProjects };
const globals = { install: "installGlobal", update: "updateGlobal", doctor: "doctorGlobal", rollback: "rollbackGlobal" };
const projects = { init: "initRegisteredProject", doctor: "doctorRegisteredProject",
  uninstall: "uninstallRegisteredProject", cleanup: "cleanupRegisteredProject" };
const common = ["--state", "--launcher", "--registry"];
const usage = (reason) => { throw new Error(`usage: ${reason}`); };
const owns = (object, key) => Object.hasOwn(object, key);

// Commands/subcommands are positional; flag/value pairs are closed and order-independent.
function parseArguments(argv) {
  if (!Array.isArray(argv) || argv.some((arg) => typeof arg !== "string")) usage("string arguments required");
  const [command, ...tail] = argv;
  if (!command) usage("command required (install, update, doctor, rollback, project, list)");
  let subcommand;
  if (command === "project") {
    subcommand = tail.shift();
    if (!owns(projects, subcommand)) usage("unknown or missing project command");
  } else if (!owns(globals, command) && command !== "list") usage("unknown command");
  const required = command === "project" ? ["--project", ...(subcommand === "init" ? ["--trust"] : [])] :
    ["install", "update"].includes(command) ? ["--tag", "--asset", "--sha256"] : [];
  const allowed = new Set([...common, ...required]);
  const flags = Object.create(null);
  for (let index = 0; index < tail.length; index += 2) {
    const flag = tail[index], value = tail[index + 1];
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
  failure(stderr, prefix + message(error));
  if (error instanceof AggregateError) {
    const errors = error.errors.slice(0, 8).map((inner) =>
      String(inner?.message ?? inner).split(/[\r\n\u2028\u2029]/, 1)[0].slice(0, 240));
    stderr.write(`${JSON.stringify({ type: "tower.cli.recovery/1", errors,
      omitted: Math.max(0, error.errors.length - errors.length) })}\n`);
  }
}

// One selection, one invocation of the same closed dispatcher. No menu-only operations.
async function runMenu(deps) {
  const { stdin = process.stdin, stdout = process.stdout, stderr = process.stderr } = deps;
  let reader;
  try {
    const readLine = deps.readLine ?? (() => {
      reader = createInterface({ input: stdin, terminal: false });
      const lines = reader[Symbol.asyncIterator]();
      return async () => { const line = await lines.next(); return line.done ? null : line.value; };
    })();
    const ask = async (prompt) => {
      stdout.write(`${prompt}\n`);
      const answer = await readLine(prompt);
      if (typeof answer !== "string" || !answer || answer.length > 4096 || /[\0\r\n]/.test(answer))
        usage("menu input missing or invalid; aborted");
      return answer;
    };
    const entries = [["install"], ["update"], ["doctor"], ["rollback"],
      ["project", "init"], ["project", "doctor"], ["project", "uninstall"],
      ["project", "cleanup"], ["list"]];
    stdout.write(entries.map((args, index) => `${index + 1}. ${args.join(" ")}`).join("\n") + "\n10. exit\n");
    const choice = await ask("Choice: ");
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
    return main(argv, deps);
  } catch (error) {
    reportError(stderr, error);
    return 1;
  } finally { reader?.close(); }
}

/** Testable dispatcher: injected environment, output sinks, gh runner and operation doubles.
 * Returns an exit code (a Promise for the interactive menu); never sets process.exitCode.
 * Production filesystem effects belong to the selected lifecycle and default-parent preparation.
 */
export function main(argv, deps = {}) {
  const { env = process.env, stdout = process.stdout, stderr = process.stderr, runner } = deps;
  try {
    if (Array.isArray(argv) && argv.length === 0 &&
        (deps.stdin ?? process.stdin).isTTY === true && stdout.isTTY === true) return runMenu(deps);
    const { command, subcommand, flags } = parseArguments(argv);
    const home = homePath(env);
    const share = join(home, ".local", "share", "torre-control");
    const stateRoot = flags["--state"] ?? join(share, "v1");
    const launcherPath = flags["--launcher"] ?? join(home, ".local", "bin", "torre-control");
    // Global inspect owns all stateRoot entries; the informational registry must be a sibling.
    const registryRoot = flags["--registry"] ?? join(share, "projects");
    const api = { ...operations, ...deps.operations };
    let result;
    if (command === "project" || command === "list") {
      // Registered project doctor writes membership; it is intentionally not read-only.
      const missing = !owns(flags, "--registry") &&
        !defaultParent(home, dirname(registryRoot), command !== "list");
      result = command === "list" ? missing ? [] : api.listProjects({ registryRoot }) :
        api[projects[subcommand]]({ registryRoot, projectRoot: flags["--project"],
          ...(subcommand === "init" ? { trustResolution: "trusted" } : {}) });
    } else {
      const absent = command === "doctor" && absentGlobalDefaults(home, stateRoot, launcherPath, flags);
      if (command !== "doctor") {
        if (!owns(flags, "--state")) defaultParent(home, dirname(stateRoot));
        if (!owns(flags, "--launcher")) defaultParent(home, dirname(launcherPath));
      }
      const acquiring = command === "install" || command === "update";
      const acquire = acquiring ? { repository: "achangkuon/control-tower", tag: flags["--tag"],
        asset: flags["--asset"], sha256: flags["--sha256"], ...(runner === undefined ? {} : { runner }) } : null;
      result = absent ? { status: "absent", active: null, previous: null } :
        api[globals[command]]({ stateRoot, launcherPath, ...(acquiring ? { acquire } : {}) });
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
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
