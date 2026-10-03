import { randomUUID } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, opendirSync,
  readSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, parse, resolve, sep } from "node:path";
import { initProject, doctorProject, uninstallProject, cleanupProject, updateProject, refreshProjectInstructions } from "./adoption.mjs";

const SCHEMA = "tower.v1.projects/1";
const MAX_BYTES = 65536;
const MAX_ROOTS = 128;
const JOURNAL = ".control-tower-adoption-v1";
const encode = (roots) => Buffer.from(JSON.stringify({ schema: SCHEMA, roots }));
const fail = (reason) => { throw new Error(`Invalid Tower project registry: ${reason}`); };
const identity = (a, b) => a && b && a.dev === b.dev && a.ino === b.ino;
const owned = (stat) => !process.getuid || stat.uid === process.getuid();
function stat(path) {
  try { return lstatSync(path); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
function canonical(path) {
  return typeof path === "string" && Buffer.from(path, "utf8").toString("utf8") === path &&
    Buffer.byteLength(path) <= 4096 && isAbsolute(path) &&
    path !== parse(path).root && resolve(path) === path && !/[\0\r\n\\]/.test(path);
}
function plain(value) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).some((key) => typeof key !== "string" ||
        !("value" in Object.getOwnPropertyDescriptor(value, key)))) fail("plain options required");
  return { ...value };
}
function optionsFor(value, operation) {
  const options = plain(value);
  const required = operation === "list" ? ["registryRoot"] : ["registryRoot", "projectRoot"];
  if (operation === "init") required.push("trustResolution");
  const allowed = [...required, ...(["init", "doctor", "uninstall", "cleanup"].includes(operation) ? ["fault"] : [])];
  if (required.some((key) => !(key in options)) || Object.keys(options).some((key) => !allowed.includes(key)) ||
      !canonical(options.registryRoot) || (operation !== "list" && !canonical(options.projectRoot)) ||
      (operation === "init" && options.trustResolution !== "trusted") ||
      ("fault" in options && typeof options.fault !== "function")) fail("options, paths or explicit trust");
  if (options.projectRoot && (options.registryRoot === options.projectRoot ||
      options.registryRoot.startsWith(options.projectRoot + sep) ||
      options.projectRoot.startsWith(options.registryRoot + sep))) fail("overlapping storage and project roots");
  return options;
}
function ancestors(path) {
  let current = parse(path).root;
  for (const part of path.slice(current.length).split(sep).slice(0, -1)) {
    current = join(current, part);
    if (!stat(current)?.isDirectory()) fail("unsafe storage ancestor");
  }
  const parent = stat(dirname(path));
  if (!owned(parent) || parent.mode & 0o022) fail("storage parent ownership");
}
function storage(root, allowed = []) {
  ancestors(root);
  const value = stat(root);
  if (!value) return null;
  if (!value.isDirectory() || !owned(value) || (value.mode & 0o7777) !== 0o700) fail("owned storage directory required");
  const handle = opendirSync(root);
  try {
    let entry, count = 0;
    while ((entry = handle.readSync())) {
      if (++count > 1 + allowed.length || !["registry.json", ...allowed].includes(entry.name)) fail("storage membership or lock");
    }
  } finally { handle.closeSync(); }
  return value;
}
// Bounded regular-file reads do not follow links or open a swapped FIFO in blocking mode.
// Ownership checks and cooperative locking are not a malicious same-UID sandbox.
function read(root) {
  const path = join(root, "registry.json"), before = stat(path);
  if (!before) return null;
  if (!before.isFile() || before.nlink !== 1 || !owned(before) ||
      (before.mode & 0o7777) !== 0o600 || before.size > MAX_BYTES) fail("unsafe registry file or size");
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const opened = fstatSync(fd);
    if (!identity(before, opened) || !opened.isFile() || opened.nlink !== 1 || !owned(opened) ||
        (opened.mode & 0o7777) !== 0o600 || opened.size > MAX_BYTES) fail("registry identity or size");
    const bytes = Buffer.alloc(opened.size + 1);
    let length = 0, count;
    while (length < bytes.length && (count = readSync(fd, bytes, length, bytes.length - length, null))) length += count;
    const after = fstatSync(fd);
    if (length !== opened.size || after.size !== opened.size || after.nlink !== 1 ||
        after.mode !== opened.mode || !identity(after, stat(path))) fail("registry changed during read");
    return { dev: opened.dev, ino: opened.ino, bytes: bytes.subarray(0, length) };
  } finally { closeSync(fd); }
}
function load(root, lock = null) {
  const directory = storage(root, lock ? [".lock"] : []);
  if (lock && !identity(lock, stat(join(root, ".lock")))) fail("lock identity changed");
  const record = directory ? read(root) : null;
  if (!record) return { directory, record, roots: [] };
  let value;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(record.bytes)); }
  catch { fail("malformed registry JSON"); }
  if (!value || Object.keys(value).sort().join() !== "roots,schema" || value.schema !== SCHEMA ||
      !Array.isArray(value.roots) || value.roots.length > MAX_ROOTS ||
      value.roots.some((root, i) => !canonical(root) || (i > 0 && value.roots[i - 1] >= root)) ||
      !encode(value.roots).equals(record.bytes)) fail("closed canonical registry schema or roots");
  return { directory, record, roots: value.roots };
}
function sameRecord(a, b) {
  return a === null && b === null || a && b && identity(a, b) && a.bytes.equals(b.bytes);
}
function removeOwned(path, expected) {
  if (!identity(expected, stat(path))) fail("publication cleanup identity changed");
  unlinkSync(path);
}
const errorsTogether = (errors) => errors.length === 1 ? errors[0] : new AggregateError(errors, "Project registry publication/cleanup failed");

function registeredOperation(value, operation, local) {
  const options = optionsFor(value, operation), root = options.registryRoot;
  const initial = load(root); // Reject corrupt or foreign storage before any local mutation.
  if (!initial.directory) mkdirSync(root, { mode: 0o700 });
  const directory = storage(root);
  const lockPath = join(root, ".lock");
  const lockFd = openSync(lockPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  const lock = fstatSync(lockFd);
  closeSync(lockFd);
  const fault = (point) => options.fault?.(point);
  let localResult, localSucceeded = false, published = false, temporary = null, tempIdentity;
  const errors = [];
  try {
    const before = load(root, lock);
    if (!identity(directory, before.directory)) fail("storage changed before local operation");
    const roots = [...new Set([...before.roots, options.projectRoot])].sort();
    const bytes = encode(roots);
    if (roots.length > MAX_ROOTS || bytes.length > MAX_BYTES) fail("registry capacity");
    const localOptions = { projectRoot: options.projectRoot };
    if (operation === "init") localOptions.trustResolution = options.trustResolution;
    localResult = local(localOptions);
    localSucceeded = true;
    temporary = join(root, `.tmp-${randomUUID()}`);
    const fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    tempIdentity = fstatSync(fd);
    try {
      fault("before-write");
      writeFileSync(fd, bytes);
    } finally { closeSync(fd); }
    fault("before-rename");
    if (!identity(directory, storage(root, [".lock", temporary.slice(root.length + 1)])) ||
        !identity(lock, stat(lockPath)) || !identity(tempIdentity, stat(temporary)) ||
        !sameRecord(before.record, read(root))) fail("registry or publication identity changed");
    renameSync(temporary, join(root, "registry.json"));
    temporary = null;
    published = true;
  } catch (error) { errors.push(error); }
  finally {
    if (temporary && tempIdentity) {
      try { fault("before-temp-cleanup"); removeOwned(temporary, tempIdentity); }
      catch (error) { errors.push(error); }
    }
    try { fault("before-unlock"); removeOwned(lockPath, lock); }
    catch (error) { errors.push(error); }
  }
  if (!localSucceeded) throw errorsTogether(errors);
  // The local lifecycle and informational registry are separate resources, not an atomic transaction.
  // No fsync/power-loss durability guarantee is made. Retained residue is never auto-reclaimed.
  return Object.freeze({ localResult, registry: Object.freeze(errors.length ?
    { status: "failed", published, error: errorsTogether(errors) } : { status: "recorded", published }) });
}

export const initRegisteredProject = (options) => registeredOperation(options, "init", initProject);
export const doctorRegisteredProject = (options) => registeredOperation(options, "doctor", doctorProject);
export const uninstallRegisteredProject = (options) => registeredOperation(options, "uninstall", uninstallProject);
export const cleanupRegisteredProject = (options) => registeredOperation(options, "cleanup", cleanupProject);
export const updateRegisteredProject = (options) => registeredOperation(options, "update", updateProject);

function liveStatus(projectRoot, registered) {
  const result = (status, error, towerState) => Object.freeze({ projectRoot, registered, status,
    ...(towerState ? { towerState } : {}), ...(error ? { error } : {}) });
  let current = parse(projectRoot).root;
  try {
    for (const part of projectRoot.slice(current.length).split(sep)) {
      current = join(current, part);
      const entry = stat(current);
      if (!entry) return result("missing", new Error(`Missing project root component: ${current}`));
      if (!entry.isDirectory()) return result("unsafe", new Error(`Unsafe project root component: ${current}`));
      if (!(entry.mode & 0o444) || !(entry.mode & 0o111)) return result("inaccessible", new Error(`Inaccessible project root component: ${current}`));
    }
    if (!stat(join(projectRoot, JOURNAL))) return result("unadopted", null, registered ? "skills-only" : undefined);
  } catch (error) { return result(error.code === "EACCES" || error.code === "EPERM" ? "inaccessible" : "unsafe", error); }
  let status;
  try {
    const doctor = doctorProject({ projectRoot });
    status = doctor.status;
    if (["missing", "modified"].includes(doctor.instructions)) return result("invalid", new Error(`Project instructions ${doctor.instructions}`));
  } catch (error) { return result(error.code === "EACCES" || error.code === "EPERM" ? "inaccessible" : "invalid", error); }
  try {
    // Inspect each component without following links; plan contents are not needed.
    const directory = stat(join(projectRoot, "openspec"));
    if (!directory) return result(status, null, "needs-plan");
    if (!directory.isDirectory()) return result("unsafe", new Error("Unsafe openspec directory"));
    if (!(directory.mode & 0o444) || !(directory.mode & 0o111)) return result("inaccessible", new Error("Inaccessible openspec directory"));
    const plan = stat(join(projectRoot, "openspec/plan.yaml"));
    if (plan && !plan.isFile()) return result("unsafe", new Error("Unsafe plan.yaml file"));
    return result(status, null, plan ? "active" : "needs-plan");
  } catch (error) { return result(error.code === "EACCES" || error.code === "EPERM" ? "inaccessible" : "unsafe", error); }
}

/** Read-only live reconciliation; membership grants neither trust nor cached health. */
export function listProjects(value) {
  const options = optionsFor(value, "list");
  return Object.freeze(load(options.registryRoot).roots.map((root) => liveStatus(root, true)));
}
/** Best-effort refresh: registration grants no adoption or overwrite authority. */
export function refreshRegisteredProjects({ registryRoot, version, block, bundleRoot }) {
  let roots;
  try {
    if (!canonical(registryRoot)) fail("refresh registry path");
    roots = load(registryRoot).roots;
  } catch (error) {
    return [{ projectRoot: null, status: `skipped:registry:${String(error.message).split(/[\r\n]/, 1)[0]}` }];
  }
  return roots.map(projectRoot => {
    try {
      const result = refreshProjectInstructions({ projectRoot, version, block, ...(bundleRoot ? { bundleRoot } : {}) });
      return { projectRoot, status: result.status };
    } catch (error) {
      const reason = String(error.message).split(/[\r\n]/, 1)[0];
      return { projectRoot, status: /drift|missing or modified project instruction block|modified CLAUDE/.test(reason) ? "skipped:drift" : `skipped:${reason}` };
    }
  });
}

export function projectStatus(value) {
  const options = optionsFor(value, "status");
  const { roots } = load(options.registryRoot);
  return liveStatus(options.projectRoot, roots.includes(options.projectRoot));
}
