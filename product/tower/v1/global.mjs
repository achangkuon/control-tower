import { createHash, randomUUID } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, opendirSync,
  readSync, renameSync, rmdirSync, unlinkSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, isAbsolute, join, parse, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapVerifiedRelease, bootstrapCachedRelease } from "./bootstrap.mjs";
import { MAX_RELEASE_BYTES } from "./release.mjs";
import { prepareRuntime, installRuntime, doctorRuntime, uninstallRuntime, preflightRuntimeHome } from "./runtime-config.mjs";
import { refreshRegisteredProjects } from "./projects.mjs";

const SCHEMA = "tower.v1.global/1";
const RECORD_LIMIT = 16 * 1024;
const VERSION_LIMIT = 16; // Retention is bounded; no automatic deletion of old versions.
const legacyRepository = fileURLToPath(new URL("../../../agent-workflows", import.meta.url));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const encode = (value) => Buffer.from(JSON.stringify(value));
const idOK = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const fail = (reason) => { throw new Error(`Invalid Tower global lifecycle: ${reason}`); };
const keys = (value, expected) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join() === expected.split(",").sort().join();
const sameIdentity = (a, b) => a && b && a.dev === b.dev && a.ino === b.ino;
const ownedByUser = (stat) => !process.getuid || stat.uid === process.getuid();

function stat(path) {
  try { return lstatSync(path); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
function canonical(path) {
  return typeof path === "string" && path.length <= 4096 && isAbsolute(path) && resolve(path) === path &&
    path !== parse(path).root && !/[\0\r\n\\]/.test(path);
}
function ancestors(path) {
  let current = parse(path).root;
  for (const part of path.slice(current.length).split(sep).slice(0, -1)) {
    current = join(current, part);
    directory(current);
  }
}
function directory(path, owned = false) {
  const value = stat(path);
  if (!value?.isDirectory() || value.isSymbolicLink() || (owned && (!ownedByUser(value) || value.mode & 0o022))) {
    fail("unsafe directory or ancestor");
  }
  return value;
}
function names(path, maximum = 64) {
  const handle = opendirSync(path);
  const result = [];
  try {
    let entry;
    while ((entry = handle.readSync())) {
      if (result.length >= maximum) fail("directory membership bound");
      result.push(entry.name);
    }
  } finally { handle.closeSync(); }
  return result.sort();
}

// Never allocate from an unchecked size, follow a link, or block opening a swapped FIFO.
// These checks bound hostile filesystem data; they are not a same-UID adversarial sandbox.
function read(path, limit = RECORD_LIMIT) {
  ancestors(path);
  const before = stat(path);
  if (!before) return null;
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || !ownedByUser(before)) fail("unsafe regular file ownership");
  if (before.size > limit) fail("file size bound");
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const opened = fstatSync(fd);
    if (!sameIdentity(before, opened) || !opened.isFile() || opened.nlink !== 1 || opened.size > limit) fail("file identity or size bound");
    const bytes = Buffer.alloc(opened.size + 1);
    let length = 0, count;
    while (length < bytes.length && (count = readSync(fd, bytes, length, bytes.length - length, null))) length += count;
    const after = fstatSync(fd);
    if (length !== opened.size || after.size !== opened.size || after.nlink !== 1) fail("file changed during bounded read");
    return { dev: opened.dev, ino: opened.ino, mode: opened.mode & 0o7777, bytes: Buffer.from(bytes.subarray(0, length)) };
  } finally { closeSync(fd); }
}
function json(record) {
  if (!record) fail("missing record");
  let value;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(record.bytes)); }
  catch { fail("malformed bounded JSON"); }
  // Our records are canonical JSON; this rejects duplicate keys, whitespace and alternate encodings.
  if (!encode(value).equals(record.bytes)) fail("noncanonical JSON record");
  return value;
}
function equalRecord(a, b, identity = false) {
  return a === null && b === null || a && b && a.mode === b.mode && a.bytes.equals(b.bytes) &&
    (!identity || sameIdentity(a, b));
}
function plain(value) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length ||
      Reflect.ownKeys(value).some((key) => !("value" in Object.getOwnPropertyDescriptor(value, key)))) fail("options must be plain data");
  return { ...value };
}
function optionsFor(value, operation) {
  const options = plain(value);
  const required = ["stateRoot", "launcherPath"];
  const allowed = [...required, "knownLegacyRepository", "home", "env", "runner", ...(["install", "update"].includes(operation) ? ["registryRoot"] : []), ...(operation === "doctor" ? [] : ["fault"]),
    ...(["install", "update"].includes(operation) ? ["acquire"] : [])];
  if (required.some((key) => !(key in options)) || Object.keys(options).some((key) => !allowed.includes(key)) ||
      !canonical(options.stateRoot) || !canonical(options.launcherPath) ||
      options.launcherPath.startsWith(options.stateRoot + sep) || options.stateRoot.startsWith(options.launcherPath + sep) ||
      options.stateRoot === options.launcherPath || ("fault" in options && typeof options.fault !== "function")) fail("options or overlapping paths");
  if (!("knownLegacyRepository" in options)) options.knownLegacyRepository = legacyRepository;
  if (!canonical(options.knownLegacyRepository) || /["`$]/.test(options.knownLegacyRepository)) fail("known legacy repository options");
  ancestors(options.stateRoot);
  ancestors(options.launcherPath);
  return options;
}
function legacy(options) {
  return Buffer.from('#!/usr/bin/env bash\n# Generated by agent-workflows/tools/setup.sh — do not edit.\n' +
    `exec "${options.knownLegacyRepository}/tools/setup.sh" "$@"\n`);
}
function original(record, options) {
  if (!record) return { kind: "absent" };
  if (!record.bytes.equals(legacy(options))) fail("unknown launcher");
  return { kind: "legacy", mode: record.mode, bytes: record.bytes.toString("base64"), sha256: hash(record.bytes) };
}
function originalRecord(value) {
  if (keys(value, "kind") && value.kind === "absent") return null;
  if (!keys(value, "kind,mode,bytes,sha256") || value.kind !== "legacy" ||
      !Number.isInteger(value.mode) || value.mode < 0 || value.mode > 0o7777 ||
      typeof value.bytes !== "string") fail("retained launcher backup");
  const bytes = Buffer.from(value.bytes, "base64");
  if (value.bytes !== bytes.toString("base64") || value.sha256 !== hash(bytes)) fail("retained launcher backup");
  // Retained v1.0.0 evidence belongs to the original checkout, not this module's location.
  // Extract only an inert canonical path, then require the entire exact three-line shape.
  const match = /\nexec "([^"`$\r\n]+)\/tools\/setup\.sh" "\$@"\n$/.exec(bytes.toString("utf8"));
  if (!match || !canonical(match[1]) ||
      !bytes.equals(legacy({ knownLegacyRepository: match[1] }))) fail("retained launcher backup");
  return { mode: value.mode, bytes };
}

// The stable launcher reads exactly one state record. It never evaluates state-derived code
// or interpolates a target into a shell command. cli.mjs itself is a later delivery unit.
function launcher(options) {
  return Buffer.from(`#!/usr/bin/env bun
import { constants, openSync, fstatSync, readSync, closeSync, lstatSync } from "node:fs";
import { join, parse, sep } from "node:path";
import { spawnSync } from "node:child_process";
const root = ${JSON.stringify(options.stateRoot)};
let ancestor = parse(root).root;
for (const part of root.slice(ancestor.length).split(sep)) {
  ancestor = join(ancestor, part);
  const s = lstatSync(ancestor);
  if (!s.isDirectory() || s.isSymbolicLink()) throw new Error("Unsafe state ancestor");
}
const fd = openSync(join(root, "state.json"), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
let state;
try {
  const s = fstatSync(fd);
  if (!s.isFile() || s.nlink !== 1 || s.size > 16384) throw new Error("Unsafe global state");
  const bytes = Buffer.alloc(s.size + 1);
  const count = readSync(fd, bytes, 0, bytes.length, 0);
  if (count !== s.size) throw new Error("Global state changed");
  state = JSON.parse(bytes.subarray(0, count).toString("utf8"));
} finally { closeSync(fd); }
if (state.schema !== "${SCHEMA}" || Object.keys(state).sort().join() !== "active,original,previous,provenance,schema" ||
    typeof state.active !== "string" || !/^[a-f0-9]{64}$/.test(state.active) ||
    !(state.previous === null || typeof state.previous === "string" && /^[a-f0-9]{64}$/.test(state.previous))) throw new Error("Invalid activation");
let target = root;
for (const part of ["versions", state.active, "product", "tower", "v1", "cli.mjs"]) {
  target = join(target, part);
  const s = lstatSync(target);
  if (s.isSymbolicLink() || (part === "cli.mjs" ? !s.isFile() || s.nlink !== 1 : !s.isDirectory())) throw new Error("Unsafe runtime path");
}
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
`);
}
function identity(acquire) {
  return { schema: "tower.v1.provenance/1", repository: acquire.repository,
    tag: acquire.tag, asset: acquire.asset, sha256: acquire.sha256 };
}
function acquireRelease(value) {
  const acquire = plain(value); // Snapshot pinned identity BEFORE invoking the supplied runner.
  const receipt = bootstrapVerifiedRelease(acquire);
  return { provenance: identity(acquire), bytes: Buffer.from(receipt.bytes),
    members: receipt.manifest.members.map((member) => ({ ...member, bytes: Buffer.from(member.bytes) })) };
}
function validateVersion(path, id) {
  directory(path, true);
  const provenanceRecord = read(join(path, "provenance.json"), 1024);
  const provenance = json(provenanceRecord);
  if (!keys(provenance, "schema,repository,tag,asset,sha256") || provenance.schema !== "tower.v1.provenance/1" ||
      provenance.sha256 !== id || provenanceRecord.mode !== 0o400) fail("unknown version provenance");
  const wire = read(join(path, "release.json"), MAX_RELEASE_BYTES);
  if (!wire || wire.mode !== 0o400) fail("missing version release");
  // Cached revalidation uses the retained originally pinned identity, NOT fresh GitHub authentication.
  const receipt = bootstrapCachedRelease({ repository: provenance.repository, tag: provenance.tag,
    asset: provenance.asset, sha256: provenance.sha256,
    runner: (_command, argv) => ({ status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : wire.bytes }) });
  const files = new Map(receipt.manifest.members.map((member) => [member.path, member]));
  files.set("provenance.json", { bytes: provenanceRecord.bytes });
  files.set("release.json", { bytes: wire.bytes });
  const tree = new Map([["", new Set()]]);
  for (const name of files.keys()) {
    const parts = name.split("/");
    for (let index = 0; index < parts.length; index++) {
      const parent = parts.slice(0, index).join("/");
      if (!tree.has(parent)) tree.set(parent, new Set());
      tree.get(parent).add(parts[index]);
    }
  }
  for (const [relative, children] of tree) {
    const target = join(path, relative);
    directory(target, true);
    if (JSON.stringify(names(target)) !== JSON.stringify([...children].sort())) fail("version member missing or extra");
  }
  for (const [relative, expected] of files) {
    const actual = read(join(path, relative), expected.bytes.length);
    if (!actual || actual.mode !== 0o400 || !actual.bytes.equals(expected.bytes)) fail("version member byte or mode drift");
  }
  return provenance;
}
function inspect(options, transaction = null, restoredOriginal) {
  const { stateRoot, launcherPath } = options;
  for (const path of [join(stateRoot, ".lock"), join(stateRoot, ".transaction"), launcherPath + ".tower-v1-lock"]) {
    if (stat(path)) {
      if (!transaction?.owned.has(path)) fail("exclusive lock or recovery evidence exists");
      transaction.verify(path);
    }
  }
  const rootStat = stat(stateRoot);
  const versions = new Map();
  let stateRecord = null;
  if (rootStat) {
    directory(stateRoot, true);
    const allowed = ["versions", "state.json", ...(transaction ? [".lock", ".transaction"] : [])];
    if (names(stateRoot, 4).some((name) => !allowed.includes(name))) fail("unknown state-root entry");
    const store = join(stateRoot, "versions");
    if (stat(store)) {
      directory(store, true);
      for (const id of names(store, VERSION_LIMIT)) {
        if (!idOK(id)) fail("foreign version-store entry");
        versions.set(id, validateVersion(join(store, id), id));
      }
    }
    stateRecord = read(join(stateRoot, "state.json"));
  }
  const launcherRecord = read(launcherPath);
  let state = null;
  if (stateRecord) {
    state = json(stateRecord);
    if (stateRecord.mode !== 0o600 || !keys(state, "schema,active,previous,original,provenance") || state.schema !== SCHEMA ||
        !idOK(state.active) || !(state.previous === null || idOK(state.previous)) || state.previous === state.active ||
        !versions.has(state.active) || state.previous !== null && !versions.has(state.previous)) fail("state or pointer drift");
    const expectedProvenance = [...versions.values()].sort((a, b) => a.sha256.localeCompare(b.sha256));
    if (!Array.isArray(state.provenance) || !encode(state.provenance).equals(encode(expectedProvenance))) fail("activated provenance drift");
    originalRecord(state.original);
    if (!launcherRecord || launcherRecord.mode !== 0o755 || !launcherRecord.bytes.equals(launcher(options))) fail("active launcher drift");
  } else if (restoredOriginal !== undefined) {
    // Rollback readback must use the same retained evidence as restoration, not install-time discovery.
    if (!equalRecord(launcherRecord, originalRecord(restoredOriginal))) fail("restored launcher drift");
  } else original(launcherRecord, options);
  return { state, stateRecord, launcherRecord, versions, rootStat };
}

// Ownership includes inode, bytes and mode, not just a path or generated-looking name.
// On a failed compensation, keep the journal and locks. Never infer automatic recovery authority.
function transactionFor(options, operation, before, next) {
  const token = randomUUID();
  const transactionPath = join(options.stateRoot, ".transaction");
  const temporaryLauncher = options.launcherPath + `.tower-v1-${token}`;
  const owned = new Map();
  const anchors = new Map([dirname(options.stateRoot), dirname(options.launcherPath), options.stateRoot,
    join(options.stateRoot, "versions")].filter((path) => stat(path)).map((path) => [path, directory(path)]));
  const guard = (path) => {
    ancestors(path);
    for (const [parent, expected] of [...anchors, ...owned]) {
      if (path.startsWith(parent + sep) && (expected.bytes === null || anchors.has(parent))) {
        const actual = directory(parent);
        if (!sameIdentity(expected, actual) || (expected.mode & 0o7777) !== (actual.mode & 0o7777)) fail("transaction ancestor drift");
      }
    }
  };
  const context = Object.freeze({ stateRoot: options.stateRoot, launcherPath: options.launcherPath,
    transactionPath, temporaryLauncher });
  const notify = (step) => options.fault?.(step, context);
  const remember = (path, bytes = null) => {
    const value = stat(path);
    owned.set(path, { dev: value.dev, ino: value.ino, mode: value.mode & 0o7777, bytes });
  };
  const verify = (path) => {
    guard(path);
    const expected = owned.get(path);
    const actual = expected?.bytes === null ? stat(path) : read(path, expected?.bytes.length ?? 0);
    if (!expected || !sameIdentity(expected, actual) || expected.mode !== (actual.mode & 0o7777) ||
        (expected.bytes && !equalRecord(expected, actual))) fail("transaction ownership drift");
    if (expected.bytes === null) {
      const children = [...owned.keys()].filter((item) => dirname(item) === path).map((item) => item.slice(path.length + 1)).sort();
      if (JSON.stringify(names(path)) !== JSON.stringify(children)) fail("foreign transaction artifact");
    }
  };
  const makeDirectory = (path) => { guard(path); mkdirSync(path, { mode: 0o700 }); remember(path); };
  const write = (path, bytes, mode = 0o600) => {
    guard(path);
    writeFileSync(path, bytes, { flag: "wx", mode });
    remember(path, Buffer.from(bytes));
    chmodSync(path, mode);
    owned.get(path).mode = mode;
  };
  const move = (source, destination, retain = true) => {
    verify(source);
    guard(destination);
    const isDirectory = owned.get(source).bytes === null;
    renameSync(source, destination);
    for (const [path, record] of [...owned]) if (path === source || path.startsWith(source + sep)) {
      owned.delete(path);
      if (retain) owned.set(destination + path.slice(source.length), record);
    }
    return isDirectory ? null : read(destination);
  };
  const remove = (selected) => {
    for (const path of selected) verify(path); // Complete preflight before removing any owned object.
    for (const path of [...selected].sort((a, b) => b.split(sep).length - a.split(sep).length)) {
      const record = owned.get(path);
      if (record.bytes === null) rmdirSync(path); else unlinkSync(path);
      owned.delete(path);
    }
  };
  const journal = encode({ schema: "tower.v1.transaction/1", operation, token,
    stateRoot: options.stateRoot, launcherPath: options.launcherPath, temporaryLauncher,
    beforeState: before.stateRecord?.bytes.toString("base64") ?? null,
    beforeProvenance: before.promotionProvenance ?? null,
    beforeLauncher: before.launcherRecord ? { bytes: before.launcherRecord.bytes.toString("base64"), mode: before.launcherRecord.mode } : null,
    nextState: next ? encode(next).toString("base64") : null });
  if (journal.length > 128 * 1024) fail("recovery record bound");
  return { owned, verify, guard, notify, remember, makeDirectory, write, move, remove,
    transactionPath, temporaryLauncher, journal };
}
// A verified published tag may replace the recorded tag of byte-identical content:
// a local checkout (S205) or an earlier published tag of an interface-only release.
function promotesCheckout(before, release) {
  const prior = before.versions.get(release?.provenance.sha256), next = release?.provenance;
  return Boolean(before.state && prior && !next.tag.startsWith("checkout-") && prior.tag !== next.tag &&
    (prior.tag.startsWith("checkout-") || prior.repository === next.repository && prior.asset === next.asset));
}
function mutate(options, operation, release = null) {
  const before = inspect(options);
  const promotion = promotesCheckout(before, release);
  if (operation === "install" ? before.state !== null && !promotion : before.state === null) fail("installation state for operation");
  const id = release?.provenance.sha256;
  if (release && before.versions.has(id) && !encode(before.versions.get(id)).equals(encode(release.provenance)) && !promotion) fail("version provenance conflict");
  if (!promotion && operation === "update" && before.state.active === id) return Object.freeze({ status: "unchanged", active: id });
  if (release && !before.versions.has(id) && before.versions.size >= VERSION_LIMIT) fail("version retention bound");
  const next = promotion ? { ...before.state,
    provenance: before.state.provenance.map(p => p.sha256 === id ? release.provenance : p) } :
    operation === "uninstall" ? null : operation === "rollback" ? before.state.previous === null ? null :
    { ...before.state, active: before.state.previous, previous: before.state.active } :
    { schema: SCHEMA, active: id, previous: before.state?.active ?? null,
      original: before.state?.original ?? original(before.launcherRecord, options),
      provenance: [...before.versions.values(), ...(before.versions.has(id) ? [] : [release.provenance])]
        .sort((a, b) => a.sha256.localeCompare(b.sha256)) };
  if (next && encode(next).length > RECORD_LIMIT) fail("state record bound");
  const provenancePath = promotion ? join(options.stateRoot, "versions", id, "provenance.json") : null;
  const beforeProvenance = promotion ? read(provenancePath, 1024) : null;
  if (promotion) before.promotionProvenance = { path: provenancePath, bytes: beforeProvenance.bytes.toString("base64"), mode: beforeProvenance.mode };
  const t = transactionFor(options, operation, before, next);
  let afterProvenance = beforeProvenance;
  const statePath = join(options.stateRoot, "state.json");
  const store = join(options.stateRoot, "versions");
  const published = id ? join(store, id) : null;
  let afterState = before.stateRecord, afterLauncher = before.launcherRecord;
  let ownsRoot = false, ownsStore = false, publishedNew = false, ownsLocks = false;
  const assertCurrent = (path, expected) => {
    if (!equalRecord(read(path), expected, true)) fail("activation destination ownership drift");
  };
  const replace = (path, bytes, mode, expected, temporary) => {
    assertCurrent(path, expected);
    if (bytes === null) { if (expected) unlinkSync(path); return null; }
    t.write(temporary, bytes, mode);
    assertCurrent(path, expected);
    return t.move(temporary, path, false);
  };
  try {
    if (!before.rootStat) { t.makeDirectory(options.stateRoot); ownsRoot = true; }
    else if (!sameIdentity(before.rootStat, directory(options.stateRoot, true))) fail("state-root changed");
    const lockBytes = encode({ schema: "tower.v1.lock/1", token: JSON.parse(t.journal).token, stateRoot: options.stateRoot });
    t.write(join(options.stateRoot, ".lock"), lockBytes);
    t.write(options.launcherPath + ".tower-v1-lock", lockBytes);
    ownsLocks = true;
    // Recheck after ownership acquisition, before constructing any installation tree.
    inspect(options, t);
    t.notify("locked");
    t.makeDirectory(t.transactionPath);
    t.write(join(t.transactionPath, "recovery.json"), t.journal);
    t.notify("journal");
    if (!stat(store)) { t.makeDirectory(store); ownsStore = true; }
    if (release && !before.versions.has(id)) {
      const stage = join(t.transactionPath, "version");
      t.makeDirectory(stage);
      t.write(join(stage, "provenance.json"), encode(release.provenance), 0o400);
      t.write(join(stage, "release.json"), release.bytes, 0o400);
      for (const member of release.members) {
        let parent = stage;
        for (const part of member.path.split("/").slice(0, -1)) {
          parent = join(parent, part);
          if (!stat(parent)) t.makeDirectory(parent);
        }
        t.write(join(stage, member.path), member.bytes, 0o400);
      }
      validateVersion(stage, id);
      t.notify("stage");
      t.notify("publish");
      t.guard(published);
      if (stat(published)) fail("foreign publication destination");
      // Publishing immutable bytes is separate from command-visible activation.
      for (const path of t.owned.keys()) if (path === stage || path.startsWith(stage + sep)) t.verify(path);
      t.move(stage, published);
      publishedNew = true;
      t.notify("published");
    } else t.notify("stage");
    t.notify("activation");
    if (promotion) {
      afterProvenance = replace(provenancePath, encode(release.provenance), beforeProvenance.mode,
        afterProvenance, join(t.transactionPath, "provenance.next"));
      t.notify("provenance-promoted");
    }
    if (next === null) {
      // First rollback: restore/remove command first, then retire state; compensate in reverse.
      t.notify("launcher");
      const restored = originalRecord(before.state.original);
      afterLauncher = replace(options.launcherPath, restored?.bytes ?? null, restored?.mode ?? 0o755,
        afterLauncher, t.temporaryLauncher);
      afterState = replace(statePath, null, 0o600, afterState, join(t.transactionPath, "state.next"));
    } else {
      // Updates/previous-version rollbacks activate at this single atomic state rename.
      afterState = replace(statePath, encode(next), 0o600, afterState, join(t.transactionPath, "state.next"));
      t.notify("state-active");
      if (!before.state) {
        // First install is an ordered two-resource transition, NOT a two-rename atomic operation.
        // Its command-visible boundary is the launcher rename, after valid state publication.
        t.notify("launcher");
        afterLauncher = replace(options.launcherPath, launcher(options), 0o755, afterLauncher, t.temporaryLauncher);
      }
    }
    t.notify("readback");
    inspect(options, t, operation === "rollback" && next === null ? before.state.original : undefined);
    t.notify("finish");
    // Keep published versions, but release only artifacts whose ownership still matches.
    const retained = new Set([options.stateRoot, store]);
    const cleanup = [...t.owned.keys()].filter((path) => !retained.has(path) && !(publishedNew && (path === published || path.startsWith(published + sep))));
    t.remove(cleanup);
    return Object.freeze({ status: promotion ? "promoted" : next ? operation === "install" ? "installed" : "activated" : "restored",
      ...(promotion ? { tag: release.provenance.tag } : {}),
      active: next?.active ?? null, previous: next?.previous ?? null });
  } catch (error) {
    if (!t.owned.size) throw error;
    try {
      // A failed acquisition of either lock must never modify somebody else's state.
      if (ownsLocks) {
        t.notify("compensation");
        const restoreState = () => {
          if (!equalRecord(afterState, before.stateRecord, true)) afterState = replace(statePath,
            before.stateRecord?.bytes ?? null, before.stateRecord?.mode ?? 0o600, afterState, join(t.transactionPath, "state.restore"));
          else assertCurrent(statePath, afterState);
        };
        const restoreLauncher = () => {
          if (!equalRecord(afterLauncher, before.launcherRecord, true)) afterLauncher = replace(options.launcherPath,
            before.launcherRecord?.bytes ?? null, before.launcherRecord?.mode ?? 0o755, afterLauncher, t.temporaryLauncher);
          else assertCurrent(options.launcherPath, afterLauncher);
        };
        if (next === null) { restoreState(); restoreLauncher(); } else { restoreLauncher(); restoreState(); }
        if (promotion && !equalRecord(afterProvenance, beforeProvenance, true)) afterProvenance = replace(provenancePath,
          beforeProvenance.bytes, beforeProvenance.mode, afterProvenance, join(t.transactionPath, "provenance.restore"));
      }
      // Check created containers before releasing any evidence or locks.
      if (ownsStore) t.verify(store);
      if (ownsRoot) t.verify(options.stateRoot);
      const cleanup = [...t.owned.keys()].filter((path) => path !== options.stateRoot && path !== store);
      t.remove(cleanup);
      if (ownsStore) { t.verify(store); rmdirSync(store); t.owned.delete(store); }
      if (ownsRoot) { t.verify(options.stateRoot); rmdirSync(options.stateRoot); t.owned.delete(options.stateRoot); }
    } catch (compensationError) {
      // Journal is normally already present; an early failure still gets bounded recovery evidence.
      try {
        if (ownsLocks && !stat(t.transactionPath)) t.makeDirectory(t.transactionPath);
        if (ownsLocks && !stat(join(t.transactionPath, "recovery.json"))) t.write(join(t.transactionPath, "recovery.json"), t.journal);
      } catch (evidenceError) { throw new AggregateError([error, compensationError, evidenceError], "Global compensation and evidence retention failed"); }
      throw new AggregateError([error, compensationError], "Global compensation failed; retained owned recovery evidence");
    }
    throw error;
  }
}

/** Acquisition and privately owned bootstrap validation precede every filesystem mutation. */
function configureRelease(options, operation) {
  if (options.home) preflightRuntimeHome(options);
  const before = inspect(options);
  const release = acquireRelease(options.acquire);
  const promotion = promotesCheckout(before, release);
  const plan = options.home && !promotion ? prepareRuntime({ home: options.home, env: options.env, runner: options.runner,
    members: release.members, version: release.provenance.tag || release.provenance.sha256.slice(0, 12) }) : null;
  const result = mutate(options, operation === "install" && before.state && options.home ? "update" : operation, release);
  // The exact acquired receipt is now the active, readback-verified release.
  if (plan) installRuntime(plan);
  const version = release.provenance.tag || release.provenance.sha256.slice(0, 12);
  const template = release.members.find(m => m.path === "product/tower/v1/instructions/project-agents.md");
  // A project failure is informational only: activation is already successful.
  let projects;
  try {
    const block = new TextDecoder("utf8", { fatal: true }).decode(template?.bytes ?? Buffer.alloc(0)).replaceAll("{{TOWER_VERSION}}", version).trimEnd();
    projects = refreshRegisteredProjects({ registryRoot: options.registryRoot ??
      (options.home ? join(options.home, ".local/share/torre-control/projects") : join(dirname(options.stateRoot), "projects")), version, block,
      bundleRoot: join(options.stateRoot, "versions", release.provenance.sha256) });
  } catch (error) { projects = [{ projectRoot: null, status: `skipped:${String(error.message).split(/[\r\n]/, 1)[0]}` }]; }
  return Object.freeze({ ...result, projects });
}
export function installGlobal(value) {
  return configureRelease(optionsFor(value, "install"), "install");
}
export function updateGlobal(value) {
  return configureRelease(optionsFor(value, "update"), "update");
}
/** Read-only, offline verification; never repairs, activates, or imports legacy engine state. */
export function doctorGlobal(value) {
  const result = inspect(optionsFor(value, "doctor"));
  return Object.freeze({ status: result.state ? "healthy" : "absent", active: result.state?.active ?? null,
    previous: result.state?.previous ?? null,
    activeTag: result.versions.get(result.state?.active)?.tag || null,
    previousTag: result.versions.get(result.state?.previous)?.tag || null,
    ...(value.home ? { components: doctorRuntime({ home: value.home, env: value.env, runner: value.runner }) } : {}) });
}
export function rollbackGlobal(value) {
  const options = optionsFor(value, "rollback"), before = inspect(options);
  let plan, runtimeKept = false;
  if (before.state?.previous) {
    const id = before.state.previous, provenance = before.versions.get(id);
    const cachedMembers = sha => {
      const p = before.versions.get(sha), wire = read(join(options.stateRoot, "versions", sha, "release.json"), MAX_RELEASE_BYTES).bytes;
      return bootstrapCachedRelease({ repository: p.repository, tag: p.tag, asset: p.asset, sha256: sha,
        runner: (_command, argv) => ({ status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : wire }) }).manifest.members;
    };
    const members = cachedMembers(id);
    // Exact cached-roster validation already ran in inspect. Only the published
    // pre-runtime roster lacks the pointer template; S194's missing runtime-config
    // module does NOT imply it lacks runtime content. Older CLIs cannot manage the
    // installed runtime, so leave it wholly untouched, without admission or builds.
    runtimeKept = !members.some(m => m.path === "product/tower/v1/instructions/global-pointer.md");
    if (options.home && !runtimeKept) {
      // Reverify each donor's receipt, preferring the active release, without
      // downloading or trusting loose files.
      const vendorReleases = members.some(m => m.path.startsWith("agent-workflows/tools/radar/vendor/")) ? [] :
        [...new Set([before.state.active, ...before.versions.keys()])].filter(sha => sha !== id).map(cachedMembers);
      plan = prepareRuntime({ home: options.home, env: options.env, runner: options.runner,
        members, vendorReleases, version: provenance.tag || id.slice(0, 12) });
    }
  }
  if (options.home && before.state && !before.state.previous) uninstallRuntime({ home: options.home });
  const result = mutate(options, "rollback");
  if (plan) installRuntime(plan);
  return runtimeKept ? Object.freeze({ ...result, runtime: "kept" }) : result;
}
export function uninstallGlobal(value) {
  const options = optionsFor(value, "uninstall"), before = inspect(options);
  if (options.home) uninstallRuntime({ home: options.home });
  if (!before.state) return { status: "absent", active: null };
  mutate(options, "uninstall");
  // Retire only trees validated byte-for-byte; never recursively delete unknown entries.
  const retire = path => {
    directory(path, true);
    for (const name of names(path, 2048)) {
      const child = join(path, name);
      if (stat(child).isDirectory()) retire(child); else { read(child, MAX_RELEASE_BYTES); unlinkSync(child); }
    }
    rmdirSync(path);
  };
  for (const id of before.versions.keys()) {
    validateVersion(join(options.stateRoot, "versions", id), id);
    retire(join(options.stateRoot, "versions", id));
  }
  retire(join(options.stateRoot, "versions"));
  if (!names(options.stateRoot).length) rmdirSync(options.stateRoot);
  return { status: "uninstalled", active: null };
}
