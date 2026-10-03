import { lstatSync, mkdirSync, readFileSync, rmSync, chmodSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { validateBundle } from "./bundle.mjs";
import { captureProjectFiles, compareProjectFiles, restoreProjectFiles, validateProjectFiles, PROJECT_FILES_SCHEMA } from "./project-files.mjs";

const SCHEMA = "tower.v1.adoption/1";
const JOURNAL = ".control-tower-adoption-v1";
const TARGETS = Object.freeze([".control-tower/radar", ".agents/skills/control-tower", ".claude/skills/control-tower"]);
const PATHS = [...TARGETS].sort();
const sourceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const fail = (reason) => { throw new Error(`Invalid Tower adoption: ${reason}`); };
const keys = (value, names) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join() === names.sort().join();

function gitRoot(projectRoot) {
  // The snapshot call validates the exact absolute root and every ancestor without following links.
  captureProjectFiles(projectRoot, [JOURNAL]);
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

function snapshotPaths(snapshot) {
  validateProjectFiles(snapshot);
  if (!isDeepStrictEqual(snapshot.destinations.map((entry) => entry.path), PATHS)) fail("destination paths");
}
function installedSnapshot(manifest) {
  const trees = expectedTrees(manifest);
  const snapshot = { schema: PROJECT_FILES_SCHEMA, destinations: PATHS.map((path) =>
    ({ path, absentAncestors: [], tree: trees.get(path) })) };
  validateProjectFiles(snapshot);
  return snapshot;
}
function preflight(projectRoot, requireCanonical = false) {
  gitRoot(projectRoot);
  const journal = captureProjectFiles(projectRoot, [JOURNAL]).destinations[0].tree;
  if (journal.type !== "directory" || journal.mode !== 0o700 || journal.entries.length !== 1 ||
      journal.entries[0].name !== "state.json" || journal.entries[0].tree.type !== "file" ||
      journal.entries[0].tree.mode !== 0o600) fail("journal tree");
  let state;
  try { state = JSON.parse(Buffer.from(journal.entries[0].tree.bytes, "base64").toString("utf8")); }
  catch { fail("journal JSON"); }
  if (!keys(state, ["schema", "original", "installed"]) || state.schema !== SCHEMA) fail("journal schema");
  snapshotPaths(state.original);
  snapshotPaths(state.installed);
  if (requireCanonical && !isDeepStrictEqual(state.installed, installedSnapshot(validateBundle(sourceRoot)))) {
    fail("installed journal snapshot");
  }
  if (!compareProjectFiles(projectRoot, state.installed)) fail("installed destination drift");
  return state;
}

/** Explicitly trusted, project-local installation; never touches host trust or global state. */
export function initProject(options) {
  if (!keys(options, ["projectRoot", "trustResolution"]) || options.trustResolution !== "trusted") fail("explicit trust required");
  const { projectRoot } = options;
  gitRoot(projectRoot);
  const manifest = validateBundle(sourceRoot);
  const original = captureProjectFiles(projectRoot, TARGETS);
  if (captureProjectFiles(projectRoot, [JOURNAL]).destinations[0].tree.type !== "absent") fail("journal already exists");
  const installed = installedSnapshot(manifest);
  let ownsJournal = false;
  try {
    mkdirSync(join(projectRoot, JOURNAL), { mode: 0o700 });
    ownsJournal = true;
    chmodSync(join(projectRoot, JOURNAL), 0o700);
    restoreProjectFiles(projectRoot, installed);
    if (!compareProjectFiles(projectRoot, installed)) fail("installation drift");
    const state = { schema: SCHEMA, original, installed };
    writeFileSync(join(projectRoot, JOURNAL, "state.json"), JSON.stringify(state), { flag: "wx", mode: 0o600 });
    chmodSync(join(projectRoot, JOURNAL, "state.json"), 0o600);
  } catch (error) {
    if (ownsJournal) {
      try {
        restoreProjectFiles(projectRoot, original);
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
  preflight(options.projectRoot, true);
  return Object.freeze({ status: "healthy" });
}

/** Refuse all drift before removing anything; restore the exact original destination trees. */
export function uninstallProject(options) {
  if (!keys(options, ["projectRoot"])) fail("uninstall options");
  const { original, installed } = preflight(options.projectRoot);
  try {
    restoreProjectFiles(options.projectRoot, original);
  } catch (error) {
    try {
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
  if (!keys(state, ["schema", "original", "installed"]) || state.schema !== SCHEMA) fail("journal schema");
  snapshotPaths(state.original);
  snapshotPaths(state.installed);
  if (isDeepStrictEqual(state.original, state.installed)) fail("identical snapshots");
  if (!compareProjectFiles(projectRoot, state.original)) fail("original destination drift");
  rmSync(join(projectRoot, JOURNAL), { recursive: true });
  return Object.freeze({ status: "cleaned" });
}

// The positional CLI is deliberately closed: no source, global, or legacy override flags.
function parseCli(args) {
  const [command, projectFlag, projectRoot, trustFlag, trust] = args;
  if (!command) throw new Error("command required");
  if (!["init", "doctor", "uninstall", "cleanup"].includes(command)) throw new Error("unknown command");
  if (projectFlag !== "--project" || !projectRoot || projectRoot.startsWith("--")) throw new Error("invalid arguments");
  if (command === "init") {
    if (args.length !== 5 || trustFlag !== "--trust" || !trust || trust.startsWith("--")) throw new Error("invalid arguments");
    if (trust !== "trusted") throw new Error("trust must be trusted");
  } else if (args.length !== 3) throw new Error("invalid arguments");
  return { command, projectRoot };
}

if (import.meta.main) {
  try {
    const { command, projectRoot } = parseCli(process.argv.slice(2));
    const result = command === "init" ? initProject({ projectRoot, trustResolution: "trusted" }) :
      command === "doctor" ? doctorProject({ projectRoot }) :
      command === "uninstall" ? uninstallProject({ projectRoot }) : cleanupProject({ projectRoot });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`Invalid Tower adoption CLI: ${String(error.message).split(/[\r\n]/, 1)[0]}\n`);
    process.exitCode = 1;
  }
}
