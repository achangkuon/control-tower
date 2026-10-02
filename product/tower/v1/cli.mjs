#!/usr/bin/env bun
import { lstatSync, mkdirSync } from "node:fs";
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
function prepareDefaultParent(home, target) {
  let current = parse(home).root;
  for (const part of target.slice(current.length).split(sep)) {
    current = join(current, part);
    let entry;
    try { entry = lstatSync(current); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    if (!entry && current.startsWith(home + sep)) {
      mkdirSync(current, { mode: 0o700 });
      entry = lstatSync(current);
    }
    if (!entry?.isDirectory() || entry.isSymbolicLink()) throw new Error("unsafe default directory or ancestor");
    if ((current === home || current.startsWith(home + sep)) &&
        ((process.getuid && entry.uid !== process.getuid()) || entry.mode & 0o022)) {
      throw new Error("unsafe default directory ownership or permissions");
    }
  }
}

function message(error) {
  const text = String(error?.message ?? error).split(/[\r\n\u2028\u2029]/, 1)[0].slice(0, 440);
  return `${text || "operation failed"}${error instanceof AggregateError ? "; AggregateError carries recovery evidence" : ""}`;
}
const failure = (stderr, text) => stderr.write(`Invalid Tower CLI: ${text}\n`);

/** Testable dispatcher: injected environment, output sinks, gh runner and operation doubles.
 * Returns an exit code; importing or calling it never sets process.exitCode.
 * Production filesystem effects belong to the selected lifecycle and default-parent preparation.
 */
export function main(argv, deps = {}) {
  const { env = process.env, stdout = process.stdout, stderr = process.stderr, runner } = deps;
  try {
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
      if (!owns(flags, "--registry")) prepareDefaultParent(home, dirname(registryRoot));
      result = command === "list" ? api.listProjects({ registryRoot }) :
        api[projects[subcommand]]({ registryRoot, projectRoot: flags["--project"],
          ...(subcommand === "init" ? { trustResolution: "trusted" } : {}) });
    } else {
      if (!owns(flags, "--state")) prepareDefaultParent(home, dirname(stateRoot));
      if (!owns(flags, "--launcher")) prepareDefaultParent(home, dirname(launcherPath));
      const acquiring = command === "install" || command === "update";
      const acquire = acquiring ? { repository: "achangkuon/control-tower", tag: flags["--tag"],
        asset: flags["--asset"], sha256: flags["--sha256"], ...(runner === undefined ? {} : { runner }) } : null;
      result = api[globals[command]]({ stateRoot, launcherPath, ...(acquiring ? { acquire } : {}) });
    }
    stdout.write(`${JSON.stringify(result)}\n`);
    if (command === "project" && result.registry.status === "failed") {
      failure(stderr, `local operation succeeded but registry publication failed: ${message(result.registry.error)}`);
      return 1;
    }
    return 0;
  } catch (error) {
    failure(stderr, message(error));
    return 1;
  }
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
