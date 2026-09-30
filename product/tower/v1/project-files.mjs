import { createHash } from "node:crypto";
import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, rmdirSync, rmSync, writeFileSync, chmodSync, constants } from "node:fs";
import { dirname, isAbsolute, join, parse, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";

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
