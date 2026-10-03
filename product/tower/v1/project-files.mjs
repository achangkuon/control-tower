import { createHash } from "node:crypto";
import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, rmdirSync, rmSync, writeFileSync, chmodSync, constants } from "node:fs";
import { dirname, isAbsolute, join, parse, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { markerRange } from "./runtime-config.mjs";

export const PROJECT_FILES_SCHEMA = "tower.v1.project-files/1";
const fail = () => { throw new Error("Unsafe project file snapshot or filesystem entry"); };
const keys = (value, expected) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join() === expected.split(",").sort().join();
const pathOK = (value) => typeof value === "string" && value.length > 0 && !isAbsolute(value) &&
  !value.includes("\\") && !/^[A-Za-z]:/.test(value) &&
  value.split("/").every((part) => part && part !== "." && part !== ".." && !part.includes("\0"));
const assertPath = (value) => { if (!pathOK(value)) fail(); return value; };
const modeOK = (mode) => Number.isInteger(mode) && mode >= 0 && mode <= 0o7777;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sorted = (array) => array.every((value, i) => i === 0 || array[i - 1] < value);
function overlapping(paths) {
  const all = new Set(paths);
  for (const path of paths) {
    let slash = path.lastIndexOf("/");
    while (slash !== -1) {
      if (all.has(path.slice(0, slash))) return true;
      slash = path.lastIndexOf("/", slash - 1);
    }
  }
  return false;
}

function stat(path) {
  try { return lstatSync(path); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
function safe(statValue, directory = false) {
  if (statValue?.isSymbolicLink() || (statValue && !(directory ? statValue.isDirectory() : statValue.isDirectory() || statValue.isFile())) ||
      (statValue?.isFile() && (statValue.nlink !== 1 || !(statValue.mode & 0o444))) ||
      (statValue?.isDirectory() && (!(statValue.mode & 0o444) || !(statValue.mode & 0o111)))) fail();
  return statValue;
}
function rootPath(root) {
  if (typeof root !== "string" || !isAbsolute(root) || resolve(root) !== root) fail();
  let current = parse(root).root;
  safe(stat(current), true);
  for (const part of root.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, part);
    if (!safe(stat(current), true)) fail();
  }
  return root;
}
function location(root, path) {
  const parts = assertPath(path).split("/");
  let current = root;
  const absentAncestors = [];
  for (const part of parts.slice(0, -1)) {
    current = join(current, part);
    const entry = safe(stat(current), true);
    if (!entry) absentAncestors.push(current.slice(root.length + (root.endsWith(sep) ? 0 : 1)).split(sep).join("/"));
  }
  return { absolute: join(root, ...parts), absentAncestors };
}
function readTree(path) {
  const entry = safe(stat(path));
  if (!entry) return { type: "absent" };
  const mode = entry.mode & 0o7777;
  if (entry.isDirectory()) {
    return { type: "directory", mode, entries: readdirSync(path).sort().map((name) => ({ name, tree: readTree(join(path, name)) })) };
  }
  // O_NOFOLLOW also rejects a link swapped in between inspection and opening.
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  let bytes;
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.nlink !== 1 || opened.dev !== entry.dev || opened.ino !== entry.ino) fail();
    bytes = readFileSync(fd);
  } finally { closeSync(fd); }
  return { type: "file", mode, encoding: "base64", bytes: bytes.toString("base64"), byteLength: bytes.length, sha256: hash(bytes) };
}
function validateTree(tree) {
  if (keys(tree, "type") && tree.type === "absent") return;
  if (tree?.type === "file" && keys(tree, "type,mode,encoding,bytes,byteLength,sha256") && modeOK(tree.mode) &&
      tree.encoding === "base64" && typeof tree.bytes === "string" &&
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(tree.bytes) &&
      Number.isSafeInteger(tree.byteLength) && tree.byteLength >= 0 && /^[a-f0-9]{64}$/.test(tree.sha256)) {
    const bytes = Buffer.from(tree.bytes, "base64");
    if (bytes.toString("base64") === tree.bytes && bytes.length === tree.byteLength && hash(bytes) === tree.sha256) return;
  }
  if (tree?.type === "directory" && keys(tree, "type,mode,entries") && modeOK(tree.mode) && Array.isArray(tree.entries)) {
    const names = tree.entries.map((entry) => entry?.name);
    if (names.every((name) => typeof name === "string" && name !== "." && name !== ".." && name.length && !name.includes("/") && !name.includes("\\") && !name.includes("\0")) && sorted(names)) {
      for (const entry of tree.entries) {
        if (!keys(entry, "name,tree") || entry.tree?.type === "absent") fail();
        validateTree(entry.tree);
      }
      return;
    }
  }
  fail();
}

/** Validate a serialized snapshot (including all file byte lengths and SHA-256 digests); no filesystem access. */
export function validateProjectFiles(snapshot) {
  if (!keys(snapshot, "schema,destinations") || snapshot.schema !== PROJECT_FILES_SCHEMA ||
      !Array.isArray(snapshot.destinations) || !snapshot.destinations.length) fail();
  const paths = snapshot.destinations.map((entry) => entry?.path);
  if (!paths.every(pathOK) || !sorted(paths) || overlapping(paths)) fail();
  for (const entry of snapshot.destinations) {
    if (!keys(entry, "path,absentAncestors,tree") || !Array.isArray(entry.absentAncestors)) fail();
    const ancestors = entry.path.split("/").slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join("/"));
    if (entry.absentAncestors.some((path) => !ancestors.includes(path)) ||
        JSON.stringify(entry.absentAncestors) !== JSON.stringify(ancestors.slice(ancestors.length - entry.absentAncestors.length)) ||
        (entry.absentAncestors.length > 0 && entry.tree?.type !== "absent")) fail();
    validateTree(entry.tree);
  }
  return true;
}

/** Capture exact non-overlapping project-relative destinations and their absent ancestors, without writing. */
export function captureProjectFiles(root, paths) {
  rootPath(root);
  if (!Array.isArray(paths) || !paths.length || !paths.every(pathOK)) fail();
  const ordered = [...paths].sort();
  if (!sorted(ordered) || overlapping(ordered)) fail();
  const destinations = ordered.map((path) => {
    const { absolute, absentAncestors } = location(root, path);
    return { path, absentAncestors, tree: readTree(absolute) };
  });
  const snapshot = { schema: PROJECT_FILES_SCHEMA, destinations };
  validateProjectFiles(snapshot);
  return snapshot;
}

/** Return whether the live destinations and ancestor presence exactly match a validated snapshot; unsafe entries throw. */
export function compareProjectFiles(root, snapshot) {
  validateProjectFiles(snapshot);
  return isDeepStrictEqual(captureProjectFiles(root, snapshot.destinations.map((entry) => entry.path)), snapshot);
}

const workflowMarker = "control-tower:project-workflow";
const importMarker = "control-tower:claude-import";
const importBlock = `<!-- ${importMarker} -->\n@AGENTS.md\n<!-- /${importMarker} -->`;
const instructionPaths = ["AGENTS.md", "CLAUDE.md"];
const separatorFor = bytes => !bytes.length || bytes.at(-1) === 10 && bytes.at(-2) === 10 ? "" : bytes.at(-1) === 10 ? "\n" : "\n\n";
function fileBytes(tree) {
  if (tree.type === "absent") return Buffer.alloc(0);
  if (tree.type !== "file") throw new Error("Project instructions must be regular files");
  return Buffer.from(tree.bytes, "base64");
}
function fileTree(bytes, mode = 0o644) {
  return { type: "file", mode, encoding: "base64", bytes: bytes.toString("base64"), byteLength: bytes.length, sha256: hash(bytes) };
}
function instructionSnapshot(snapshot) {
  validateProjectFiles(snapshot);
  if (!isDeepStrictEqual(snapshot.destinations.map(e => e.path), instructionPaths)) fail();
  for (const entry of snapshot.destinations) {
    const text = fileBytes(entry.tree).toString("latin1");
    markerRange(text, workflowMarker); markerRange(text, importMarker);
  }
}
const rangeFor = (bytes, name) => markerRange(bytes.toString("latin1"), name);
function spliceBlock(bytes, block, name) {
  const range = rangeFor(bytes, name), rendered = Buffer.from(block);
  return range ? Buffer.concat([bytes.subarray(0, range.begin), rendered, bytes.subarray(range.finish)]) :
    Buffer.concat([bytes, Buffer.from(separatorFor(bytes)), rendered, Buffer.from("\n")]);
}

/** Pure, byte-preserving instruction planning; all markers are admitted before writes. */
export function projectInstructionSnapshot(original, block) {
  instructionSnapshot(original);
  const rendered = Buffer.from(block), range = rangeFor(rendered, workflowMarker);
  if (!range || range.begin !== 0 || range.finish !== rendered.length) throw new Error("Invalid project workflow template");
  const installed = structuredClone(original);
  for (const entry of installed.destinations) {
    const bytes = fileBytes(entry.tree);
    let next;
    if (entry.path === "AGENTS.md") next = spliceBlock(bytes, block, workflowMarker);
    else if (/^@AGENTS\.md\r?$/m.test(bytes.toString("latin1"))) continue;
    else next = entry.tree.type === "absent" ? Buffer.from("@AGENTS.md\n") : spliceBlock(bytes, importBlock, importMarker);
    entry.tree = fileTree(next, entry.tree.mode);
  }
  validateProjectFiles(installed);
  return installed;
}

/** Compare only the owned workflow range, never unrelated user text. */
export function projectInstructionState(live, installed) {
  try {
    instructionSnapshot(live); instructionSnapshot(installed);
    const actual = fileBytes(live.destinations[0].tree), expected = fileBytes(installed.destinations[0].tree);
    const a = rangeFor(actual, workflowMarker), e = rangeFor(expected, workflowMarker);
    return !a ? "missing" : e && actual.subarray(a.begin, a.finish).equals(expected.subarray(e.begin, e.finish)) ? "ok" : "modified";
  } catch { return "modified"; }
}

/** Surgically restore owned ranges; delete only an originally absent, now empty file. */
export function removeProjectInstructions(live, original, installed) {
  for (const value of [live, original, installed]) instructionSnapshot(value);
  const next = structuredClone(live);
  for (const [index, entry] of next.destinations.entries()) {
    const beforeTree = original.destinations[index].tree, installedTree = installed.destinations[index].tree;
    const before = fileBytes(beforeTree), expected = fileBytes(installedTree), bytes = fileBytes(entry.tree);
    if (before.equals(expected) || entry.tree.type === "absent") continue;
    const name = index === 0 ? workflowMarker : importMarker;
    const owned = rangeFor(expected, name), range = rangeFor(bytes, name), prior = rangeFor(before, name);
    let result;
    if (!owned) {
      // CLAUDE.md created with the single unmarked import; own that line only.
      if (index !== 1 || beforeTree.type !== "absent" || !expected.equals(Buffer.from("@AGENTS.md\n"))) fail();
      const match = /^@AGENTS\.md(?:\r?\n|$)/m.exec(bytes.toString("latin1"));
      if (!match) throw new Error("Modified Tower CLAUDE import");
      result = Buffer.concat([bytes.subarray(0, match.index), bytes.subarray(match.index + match[0].length)]);
    } else {
      if (!range) continue; // Already removed; do not resurrect the block.
      if (!bytes.subarray(range.begin, range.finish).equals(expected.subarray(owned.begin, owned.finish))) throw new Error("Modified Tower instruction block or import");
      let begin = range.begin, finish = range.finish;
      if (!prior) {
        const separator = Buffer.from(separatorFor(before));
        if (begin >= separator.length && bytes.subarray(begin - separator.length, begin).equals(separator)) begin -= separator.length;
        if (bytes[finish] === 10) finish++;
      }
      result = Buffer.concat([bytes.subarray(0, begin), prior ? before.subarray(prior.begin, prior.finish) : Buffer.alloc(0), bytes.subarray(finish)]);
    }
    entry.tree = beforeTree.type === "absent" && !result.length ? { type: "absent" } : fileTree(result, entry.tree.mode);
  }
  validateProjectFiles(next);
  return next;
}

/** Refresh the stored baseline without claiming ownership of later edits elsewhere. */
export function replaceProjectInstructionBlock(snapshot, block) {
  instructionSnapshot(snapshot);
  const next = structuredClone(snapshot), entry = next.destinations[0];
  entry.tree = fileTree(spliceBlock(fileBytes(entry.tree), block, workflowMarker), entry.tree.mode);
  return next;
}

function createTree(path, tree) {
  if (tree.type === "absent") return;
  if (tree.type === "file") {
    writeFileSync(path, Buffer.from(tree.bytes, "base64"), { flag: "wx", mode: tree.mode });
  } else {
    mkdirSync(path);
    for (const entry of tree.entries) createTree(join(path, entry.name), entry.tree);
  }
  chmodSync(path, tree.mode);
}

/** Preflight all destinations, then replace only those trees; prune captured-absent ancestors only if empty. */
export function restoreProjectFiles(root, snapshot) {
  validateProjectFiles(snapshot); // Tampered snapshots never reach filesystem mutation.
  rootPath(root);
  const locations = snapshot.destinations.map((entry) => ({ entry, ...location(root, entry.path) }));
  for (const { absolute } of locations) readTree(absolute); // Reject unsafe members before the first removal.
  for (const { absolute, entry } of locations) {
    if (entry.tree.type !== "absent") mkdirSync(dirname(absolute), { recursive: true });
    if (stat(absolute)) rmSync(absolute, { recursive: true });
    createTree(absolute, entry.tree);
  }
  const absent = new Set(locations.flatMap(({ entry }) => entry.absentAncestors));
  for (const path of [...absent].sort((a, b) => b.length - a.length)) {
    const absolute = join(root, path);
    if (!stat(absolute)) continue;
    try { rmdirSync(absolute); } catch (error) { if (error.code !== "ENOTEMPTY" && error.code !== "EEXIST") throw error; }
  }
}
