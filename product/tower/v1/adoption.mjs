import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { markerRange } from "./runtime-config.mjs";
import { realpathSync, lstatSync, mkdirSync, readFileSync, rmSync, chmodSync, writeFileSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { validateBundle } from "./bundle.mjs";
import { preflightProjectPaths, sharedProjectSkills, captureProjectFiles, compareProjectFiles, restoreProjectFiles, validateProjectFiles, PROJECT_FILES_SCHEMA,
  projectInstructionSnapshot, projectInstructionState, removeProjectInstructions, replaceProjectInstructionBlock } from "./project-files.mjs";

const SCHEMA = "tower.v1.adoption/1";
const JOURNAL = ".control-tower-adoption-v1";
const TARGETS = Object.freeze([".control-tower/radar", ".agents/skills/control-tower", ".claude/skills/control-tower"]);
const PATHS = [...TARGETS].sort();
const sharedPaths = PATHS.filter(path => !path.startsWith(".claude/"));
const pathsFor = shared => shared ? sharedPaths : PATHS;
const sourceRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const fail = (reason) => { throw new Error(`Invalid Tower adoption: ${reason}`); };
const keys = (value, names) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join() === names.sort().join();

function gitRoot(projectRoot) {
  // The snapshot call validates the exact absolute root and every ancestor without following links.
  captureProjectFiles(projectRoot, [".control-tower-admission"]);
  let git;
  try { git = lstatSync(join(projectRoot, ".git")); } catch (error) {
    if (error.code !== "ENOENT") throw error;
    fail("missing Git marker");
  }
  let gitdir = join(projectRoot, ".git");
  if (!git.isDirectory()) {
    if (!git.isFile() || git.nlink !== 1 || !(git.mode & 0o444)) fail("unsafe Git marker");
    const marker = readFileSync(gitdir, "utf8").match(/^gitdir: ([^\r\n\0]+)\r?\n?$/);
    if (!marker) fail("unsafe Git marker");
    gitdir = resolve(projectRoot, marker[1]);
    try { if (!lstatSync(gitdir).isDirectory()) fail("unsafe Git directory"); }
    catch (error) { if (error.code !== "ENOENT") throw error; fail("missing Git directory"); }
  }
  // Includes every gitdir ancestor and HEAD; a worktree marker may point outside the project.
  captureProjectFiles(gitdir, ["HEAD"]);
  const result = spawnSync("git", ["-C", projectRoot, "rev-parse", "--git-common-dir"], {
    env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" }, encoding: "utf8", timeout: 10_000,
  });
  if (result.status !== 0 || !result.stdout.trim() || /[\0\r\n]/.test(result.stdout.trim())) fail("Git common directory");
  const common = resolve(projectRoot, result.stdout.trim());
  captureProjectFiles(common, ["info/exclude"]);
  return common;
}

/** Public CLI admission runs before registry/default-parent writes. */
export function preflightProjectAdoption({ projectRoot, fixPermissions = false, onPermissionsFixed, groupWritableOk }) {
  const shared = sharedProjectSkills(projectRoot);
  const common = gitRoot(projectRoot), exclude = relative(projectRoot, join(common, "info/exclude"));
  // A missing leaf checks .claude itself without traversing unrelated skills or the admitted alias.
  return preflightProjectPaths(projectRoot, [...pathsFor(shared), JOURNAL, ...INSTRUCTION_PATHS,
    ...(shared ? [".claude/.control-tower-admission"] : []),
    ...(!exclude.startsWith(`..${sep}`) ? [exclude.split(sep).join("/")] : [])], { fixPermissions, onPermissionsFixed, groupWritableOk });
}

const excludePaths = ["/.control-tower/", "/.control-tower-adoption-v1/", "/.agents/skills/control-tower/", "/.claude/skills/control-tower/"];
const excludeStart = "# control-tower:project-exclude", excludeEnd = "# /control-tower:project-exclude";
const excludeBytes = snapshot => {
  const tree = snapshot.destinations[0].tree;
  if (tree.type === "absent") return Buffer.alloc(0);
  if (tree.type !== "file") fail("exclude file");
  return Buffer.from(tree.bytes, "base64");
};
function excludeSnapshot(snapshot, bytes) {
  const next = structuredClone(snapshot), entry = next.destinations[0];
  entry.absentAncestors = [];
  entry.tree = { type: "file", mode: entry.tree.mode ?? 0o644, encoding: "base64", bytes: bytes.toString("base64"),
    byteLength: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  return next;
}
function planExclude(original) {
  const before = excludeBytes(original), text = before.toString("latin1");
  if (text.includes(excludeStart) || text.includes(excludeEnd)) fail("unowned exclude marker");
  const lines = text.split(/\r?\n/), missing = excludePaths.filter(path => !lines.includes(path));
  const block = missing.length ? `${before.length && before.at(-1) !== 10 ? "\n" : ""}${excludeStart}\n${missing.join("\n")}\n${excludeEnd}\n` : "";
  return { original, installed: block ? excludeSnapshot(original, Buffer.concat([before, Buffer.from(block)])) : original, block };
}
function validateExclude(value) {
  if (!keys(value, ["original", "installed", "block"])) fail("exclude journal");
  for (const snapshot of [value.original, value.installed]) {
    validateProjectFiles(snapshot);
    if (!isDeepStrictEqual(snapshot.destinations.map(e => e.path), ["info/exclude"])) fail("exclude paths");
  }
  if (!isDeepStrictEqual(value, planExclude(value.original))) fail("exclude snapshot");
}
function removeExclude(live, value) {
  if (!value.block) return live;
  const bytes = excludeBytes(live), block = Buffer.from(value.block), index = bytes.indexOf(block);
  if (index < 0 || bytes.indexOf(block, index + 1) >= 0) fail("modified exclude block");
  const next = Buffer.concat([bytes.subarray(0, index), bytes.subarray(index + block.length)]);
  return !next.length && value.original.destinations[0].tree.type === "absent" ? value.original : excludeSnapshot(live, next);
}
function excludePreflight(projectRoot, state) {
  const root = gitRoot(projectRoot);
  preflightProjectPaths(root, ["info/exclude"]);
  const live = captureProjectFiles(root, ["info/exclude"]);
  if (state?.exclude) removeExclude(live, state.exclude);
  return { root, live };
}

function verifySharedSkill(projectRoot, shared) {
  if (sharedProjectSkills(projectRoot) !== shared) fail("shared skill layout drift");
  if (shared && realpathSync(join(projectRoot, TARGETS[2])) !== join(projectRoot, TARGETS[1])) fail("shared skill resolution drift");
}

function expectedTrees(manifest) {
  const trees = new Map(TARGETS.map((path) => [path, { type: "directory", mode: 0o755, entries: [] }]));
  for (const member of manifest.members) {
    const radar = member.destination.startsWith("radar/");
    // The release also ships global skills, instructions and signatures. These are
    // not project-local adoption targets, even when they share a skills/ prefix.
    if (!radar && !member.destination.startsWith("skills/control-tower/")) continue;
    const name = radar ? member.destination.slice("radar/".length) : member.destination.slice("skills/control-tower/".length);
    const file = { type: "file", mode: 0o644, encoding: "base64", bytes: member.bytes,
      byteLength: member.byteLength, sha256: member.sha256 };
    for (const path of radar ? TARGETS.slice(0, 1) : TARGETS.slice(1)) {
      let tree = trees.get(path);
      const parts = name.split("/");
      for (const part of parts.slice(0, -1)) {
        let entry = tree.entries.find((item) => item.name === part);
        if (!entry) { entry = { name: part, tree: { type: "directory", mode: 0o755, entries: [] } }; tree.entries.push(entry); }
        tree = entry.tree;
      }
      tree.entries.push({ name: parts.at(-1), tree: file });
    }
  }
  const sortTree = (tree) => {
    if (tree.type === "directory") {
      tree.entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      for (const entry of tree.entries) sortTree(entry.tree);
    }
  };
  for (const tree of trees.values()) sortTree(tree);
  return trees;
}

function snapshotPaths(snapshot, shared = false) {
  validateProjectFiles(snapshot);
  if (!isDeepStrictEqual(snapshot.destinations.map((entry) => entry.path), pathsFor(shared))) fail("destination paths");
}
function installedSnapshot(manifest, shared = false) {
  const trees = expectedTrees(manifest);
  const snapshot = { schema: PROJECT_FILES_SCHEMA, destinations: pathsFor(shared).map((path) =>
    ({ path, absentAncestors: [], tree: trees.get(path) })) };
  validateProjectFiles(snapshot);
  return snapshot;
}
export const INSTRUCTION_PATHS = ["AGENTS.md", "CLAUDE.md"];
const versionOK = value => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
function activeVersion() {
  const tree = captureProjectFiles(sourceRoot, ["provenance.json"]).destinations[0].tree;
  if (tree.type !== "absent") {
    if (tree.type !== "file") fail("release provenance");
    let provenance;
    try { provenance = JSON.parse(Buffer.from(tree.bytes, "base64")); } catch { fail("release provenance JSON"); }
    const version = provenance.tag || provenance.sha256?.slice(0, 12);
    if (!versionOK(version)) fail("release version");
    return version;
  }
  const result = spawnSync("git", ["-C", sourceRoot, "rev-parse", "--short=12", "HEAD"], {
    env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" }, encoding: "utf8", timeout: 10_000,
  });
  if (result.status !== 0 || !/^[a-f0-9]{7,40}$/.test(result.stdout.trim())) fail("missing release version or Git sha");
  return result.stdout.trim();
}
function renderInstructions(manifest, version) {
  const member = manifest.members.find(m => m.destination === "instructions/project-agents.md");
  if (!member) fail("missing project instructions template");
  return new TextDecoder("utf8", { fatal: true }).decode(Buffer.from(member.bytes, "base64"))
    .replaceAll("{{TOWER_VERSION}}", version).trimEnd();
}
function instructionBlock(snapshot) {
  validateProjectFiles(snapshot);
  const bytes = Buffer.from(snapshot.destinations[0].tree.bytes ?? "", "base64");
  const range = markerRange(bytes.toString("latin1"), "control-tower:project-workflow");
  if (!range) fail("installed instruction range");
  return bytes.subarray(range.begin, range.finish).toString("utf8");
}
function validateState(state) {
  const optional = ["instructions", "sharedSkills", "exclude"].filter(key => Object.hasOwn(state ?? {}, key));
  if (!keys(state, ["schema", "original", "installed", ...optional]) || state.schema !== SCHEMA) fail("journal schema");
  if ("sharedSkills" in state && state.sharedSkills !== "../.agents/skills") fail("shared skill journal");
  snapshotPaths(state.original, Boolean(state.sharedSkills)); snapshotPaths(state.installed, Boolean(state.sharedSkills));
  if (state.exclude) validateExclude(state.exclude);
  if ("instructions" in state) {
    const value = state.instructions;
    if (!keys(value, ["version", "original", "installed"]) || !versionOK(value.version)) fail("instruction journal schema");
    const expected = projectInstructionSnapshot(value.original, instructionBlock(value.installed));
    if (!isDeepStrictEqual(expected, value.installed)) fail("instruction journal snapshot");
  }
}
function writeState(projectRoot, state) {
  // Admission above rejects links/hardlinks before updating our private journal.
  writeFileSync(join(projectRoot, JOURNAL, "state.json"), JSON.stringify(state), { mode: 0o600 });
}
function preflight(projectRoot, { groupWritableOk } = {}) {
  preflightProjectAdoption({ projectRoot, groupWritableOk });
  gitRoot(projectRoot);
  const journal = captureProjectFiles(projectRoot, [JOURNAL]).destinations[0].tree;
  if (journal.type !== "directory" || journal.mode !== 0o700 || journal.entries.length !== 1 ||
      journal.entries[0].name !== "state.json" || journal.entries[0].tree.type !== "file" ||
      journal.entries[0].tree.mode !== 0o600) fail("journal tree");
  let state;
  try { state = JSON.parse(Buffer.from(journal.entries[0].tree.bytes, "base64").toString("utf8")); }
  catch { fail("journal JSON"); }
  validateState(state);
  verifySharedSkill(projectRoot, Boolean(state.sharedSkills));
  excludePreflight(projectRoot, state);
  if (!compareProjectFiles(projectRoot, state.installed, { groupWritableOk })) fail("installed destination drift");
  return state;
}

/** Explicitly trusted, project-local installation; never touches host trust or global state. */
export function initProject(options) {
  if ((!keys(options, ["projectRoot", "trustResolution"]) && !keys(options, ["projectRoot", "trustResolution", "fixPermissions"])) ||
      options.trustResolution !== "trusted" || "fixPermissions" in options && typeof options.fixPermissions !== "boolean") fail("explicit trust required");
  const { projectRoot } = options;
  preflightProjectAdoption(options);
  const shared = sharedProjectSkills(projectRoot);
  const { root: excludeRoot, live: excludeOriginal } = excludePreflight(projectRoot);
  const exclude = planExclude(excludeOriginal);
  const manifest = validateBundle(sourceRoot);
  const original = captureProjectFiles(projectRoot, pathsFor(shared));
  if (captureProjectFiles(projectRoot, [JOURNAL]).destinations[0].tree.type !== "absent") fail("journal already exists");
  const installed = installedSnapshot(manifest, shared);
  const version = activeVersion(), instructionOriginal = captureProjectFiles(projectRoot, INSTRUCTION_PATHS);
  const instructions = { version, original: instructionOriginal,
    installed: projectInstructionSnapshot(instructionOriginal, renderInstructions(manifest, version)) };
  let ownsJournal = false;
  try {
    mkdirSync(join(projectRoot, JOURNAL), { mode: 0o700 });
    ownsJournal = true;
    chmodSync(join(projectRoot, JOURNAL), 0o700);
    restoreProjectFiles(projectRoot, installed);
    restoreProjectFiles(projectRoot, instructions.installed);
    if (!compareProjectFiles(projectRoot, installed) || !compareProjectFiles(projectRoot, instructions.installed)) fail("installation drift");
    verifySharedSkill(projectRoot, shared);
    restoreProjectFiles(excludeRoot, exclude.installed);
    const state = { schema: SCHEMA, original, installed, instructions, exclude,
      ...(shared ? { sharedSkills: "../.agents/skills" } : {}) };
    writeFileSync(join(projectRoot, JOURNAL, "state.json"), JSON.stringify(state), { flag: "wx", mode: 0o600 });
    chmodSync(join(projectRoot, JOURNAL, "state.json"), 0o600);
  } catch (error) {
    if (ownsJournal) {
      try {
        restoreProjectFiles(projectRoot, original);
        restoreProjectFiles(projectRoot, instructionOriginal);
        restoreProjectFiles(excludeRoot, excludeOriginal);
        rmSync(join(projectRoot, JOURNAL), { recursive: true });
      } catch (rollbackError) { throw new AggregateError([error, rollbackError], "Adoption rollback failed"); }
    }
    throw error;
  }
  return Object.freeze({ status: "installed" });
}

/** Strictly read-only verification of journal, installed bytes, modes, and membership. */
export function doctorProject(options) {
  if (!keys(options, ["projectRoot"])) fail("doctor options");
  const state = preflight(options.projectRoot, { groupWritableOk: INSTRUCTION_PATHS });
  const outdated = !state.instructions || !isDeepStrictEqual(state.installed, installedSnapshot(validateBundle(sourceRoot), Boolean(state.sharedSkills)));
  let instructions = state.instructions ? projectInstructionState(captureProjectFiles(options.projectRoot, INSTRUCTION_PATHS), state.instructions.installed) : "outdated version";
  if (instructions === "ok" && (state.instructions.version !== activeVersion() ||
      instructionBlock(state.instructions.installed) !== renderInstructions(validateBundle(sourceRoot), activeVersion()))) instructions = "outdated version";
  return Object.freeze({ status: outdated ? "outdated" : "healthy", instructions });
}

/** Refuse all drift before removing anything; restore the exact original destination trees. */
export function uninstallProject(options) {
  if (!keys(options, ["projectRoot"])) fail("uninstall options");
  const state = preflight(options.projectRoot), { original, installed, instructions } = state;
  const { root: excludeRoot, live: excludeLive } = excludePreflight(options.projectRoot, state);
  const excludeRemoved = state.exclude ? removeExclude(excludeLive, state.exclude) : null;
  const live = instructions ? captureProjectFiles(options.projectRoot, INSTRUCTION_PATHS) : null;
  const removed = instructions ? removeProjectInstructions(live, instructions.original, instructions.installed) : null;
  try {
    restoreProjectFiles(options.projectRoot, original);
    if (removed) restoreProjectFiles(options.projectRoot, removed);
    if (excludeRemoved) restoreProjectFiles(excludeRoot, excludeRemoved);
  } catch (error) {
    try {
      if (live) restoreProjectFiles(options.projectRoot, live);
      restoreProjectFiles(excludeRoot, excludeLive);
      for (const destination of installed.destinations) {
        const snapshot = { schema: installed.schema, destinations: [destination] };
        if (!compareProjectFiles(options.projectRoot, snapshot)) restoreProjectFiles(options.projectRoot, snapshot);
      }
      if (!compareProjectFiles(options.projectRoot, installed)) fail("installation compensation drift");
    } catch (compensationError) {
      throw new AggregateError([error, compensationError], "Adoption uninstall compensation failed");
    }
    throw error;
  }
  rmSync(join(options.projectRoot, JOURNAL), { recursive: true });
  return Object.freeze({ status: "uninstalled" });
}

/** Remove only an intact journal left after the original destination trees were fully restored. */
export function cleanupProject(options) {
  if (!keys(options, ["projectRoot"])) fail("cleanup options");
  const { projectRoot } = options;
  gitRoot(projectRoot);
  const journal = captureProjectFiles(projectRoot, [JOURNAL]).destinations[0].tree;
  if (journal.type !== "directory" || journal.mode !== 0o700 || journal.entries.length !== 1 ||
      journal.entries[0].name !== "state.json" || journal.entries[0].tree.type !== "file" ||
      journal.entries[0].tree.mode !== 0o600) fail("journal tree");
  let state;
  try { state = JSON.parse(Buffer.from(journal.entries[0].tree.bytes, "base64").toString("utf8")); }
  catch { fail("journal JSON"); }
  validateState(state);
  if (isDeepStrictEqual(state.original, state.installed)) fail("identical snapshots");
  if (!compareProjectFiles(projectRoot, state.original) || state.instructions && !compareProjectFiles(projectRoot, state.instructions.original)) fail("original destination drift");
  const { root: excludeRoot, live: excludeLive } = excludePreflight(projectRoot, state);
  if (state.exclude) restoreProjectFiles(excludeRoot, removeExclude(excludeLive, state.exclude));
  rmSync(join(projectRoot, JOURNAL), { recursive: true });
  return Object.freeze({ status: "cleaned" });
}

/** Refresh intact adoption targets and owned ranges in one compensated transaction.
 * Global activation supplies its verified release root, not the old caller's bundle.
 * Like adoption, this is exception-atomic, not a power-loss or concurrent-writer guarantee.
 */
export function refreshProjectInstructions(options) {
  if ((!keys(options, ["projectRoot", "version", "block"]) && !keys(options, ["projectRoot", "version", "block", "bundleRoot"])) ||
      !versionOK(options.version) || typeof options.block !== "string") fail("refresh options");
  const { projectRoot, version, block } = options, state = preflight(projectRoot);
  const installed = installedSnapshot(validateBundle(options.bundleRoot ?? sourceRoot), Boolean(state.sharedSkills));
  const { root: excludeRoot, live: excludeLive } = excludePreflight(projectRoot, state);
  const exclude = state.exclude ?? planExclude(excludeLive);
  const upgraded = !isDeepStrictEqual(state.installed, installed);
  const live = captureProjectFiles(projectRoot, INSTRUCTION_PATHS);
  const prior = state.instructions;
  if (prior && projectInstructionState(live, prior.installed) !== "ok") fail("missing or modified project instruction block");
  // Admit the CLAUDE import too without changing it; modified owned imports are
  // not healthy adoption and must never be silently endorsed by an update.
  if (prior) removeProjectInstructions(live, prior.original, prior.installed);
  const original = prior?.original ?? live;
  const baseline = prior ? replaceProjectInstructionBlock(prior.installed, block) : projectInstructionSnapshot(original, block);
  const next = prior ? replaceProjectInstructionBlock(live, block) : baseline;
  const instructions = { version, original, installed: baseline };
  validateState({ ...state, installed, instructions, exclude });
  if (state.exclude && !upgraded && prior?.version === version && isDeepStrictEqual(prior.installed, baseline) && isDeepStrictEqual(live, next)) return { status: "unchanged" };
  try {
    if (upgraded) restoreProjectFiles(projectRoot, installed);
    restoreProjectFiles(projectRoot, next);
    if (!compareProjectFiles(projectRoot, installed) || !compareProjectFiles(projectRoot, next)) fail("upgrade readback drift");
    verifySharedSkill(projectRoot, Boolean(state.sharedSkills));
    if (!state.exclude) restoreProjectFiles(excludeRoot, exclude.installed);
    writeState(projectRoot, { ...state, installed, instructions, exclude });
  } catch (error) {
    try {
      restoreProjectFiles(projectRoot, live);
      restoreProjectFiles(excludeRoot, excludeLive);
      if (upgraded) for (const destination of state.installed.destinations) {
        const snapshot = { schema: state.installed.schema, destinations: [destination] };
        if (!compareProjectFiles(projectRoot, snapshot)) restoreProjectFiles(projectRoot, snapshot);
      }
      writeState(projectRoot, state);
    } catch (rollbackError) { throw new AggregateError([error, rollbackError], "Project refresh rollback failed"); }
    throw error;
  }
  return { status: upgraded ? "upgraded" : "refreshed" };
}

/** Explicit single-project update; trust comes only from the intact adoption journal. */
export function updateProject(options) {
  if ((!keys(options, ["projectRoot"]) && !keys(options, ["projectRoot", "fixPermissions"])) ||
      "fixPermissions" in options && typeof options.fixPermissions !== "boolean") fail("update options");
  preflightProjectAdoption(options);
  const version = activeVersion();
  return Object.freeze(refreshProjectInstructions({ projectRoot: options.projectRoot, version,
    block: renderInstructions(validateBundle(sourceRoot), version) }));
}

// The positional CLI is deliberately closed: no source, global, or legacy override flags.
function parseCli(args) {
  const fixPermissions = args.at(-1) === "--fix-permissions";
  if (fixPermissions) args = args.slice(0, -1);
  const [command, projectFlag, projectRoot, trustFlag, trust] = args;
  if (!command) throw new Error("command required");
  if (!["init", "doctor", "update", "uninstall", "cleanup"].includes(command)) throw new Error("unknown command");
  if (projectFlag !== "--project" || !projectRoot || projectRoot.startsWith("--")) throw new Error("invalid arguments");
  if (command === "init") {
    if (args.length !== 5 || trustFlag !== "--trust" || !trust || trust.startsWith("--")) throw new Error("invalid arguments");
    if (trust !== "trusted") throw new Error("trust must be trusted");
  } else if (args.length !== 3) throw new Error("invalid arguments");
  if (fixPermissions && !["init", "update"].includes(command)) throw new Error("invalid arguments");
  return { command, projectRoot, fixPermissions };
}

if (import.meta.main) {
  try {
    const { command, projectRoot, fixPermissions } = parseCli(process.argv.slice(2));
    const result = command === "init" ? initProject({ projectRoot, trustResolution: "trusted", ...(fixPermissions ? { fixPermissions } : {}) }) :
      command === "doctor" ? doctorProject({ projectRoot }) :
      command === "update" ? updateProject({ projectRoot, ...(fixPermissions ? { fixPermissions } : {}) }) :
      command === "uninstall" ? uninstallProject({ projectRoot }) : cleanupProject({ projectRoot });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`Invalid Tower adoption CLI: ${Array.isArray(error.permissionPaths) ? error.message : String(error.message).split(/[\r\n]/, 1)[0]}\n`);
    process.exitCode = 1;
  }
}
