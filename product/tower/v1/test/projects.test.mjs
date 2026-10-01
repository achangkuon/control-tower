import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, cpSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { BUNDLE_MEMBERS } from "../bundle.mjs";
import { captureProjectFiles, restoreProjectFiles } from "../project-files.mjs";
import { initRegisteredProject, doctorRegisteredProject, uninstallRegisteredProject,
  cleanupRegisteredProject, listProjects, projectStatus } from "../projects.mjs";

const journal = ".control-tower-adoption-v1";
const schema = "tower.v1.projects/1";
const source = new URL("../../../..", import.meta.url).pathname;
const encode = (roots) => JSON.stringify({ schema, roots });
function put(path, bytes, mode = 0o600) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes, { mode });
  chmodSync(path, mode);
}
function fixture(fn) {
  const base = mkdtempSync(join(tmpdir(), "tower-projects-"));
  const projectRoot = join(base, "project"), registryRoot = join(base, "registry");
  const home = join(base, "home");
  mkdirSync(home); mkdirSync(projectRoot);
  put(join(home, "sentinel"), "untouched home");
  const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: home, GH_CONFIG_DIR: home,
    GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" };
  expect(spawnSync("git", ["init", "--quiet", projectRoot], { env }).status).toBe(0);
  put(join(projectRoot, "AGENTS.md"), "unrelated project instructions");
  const untouched = captureProjectFiles(base, ["home", "project/AGENTS.md"]);
  const options = { projectRoot, registryRoot };
  const trusted = { ...options, trustResolution: "trusted" };
  try { return fn({ base, home, env, options, trusted, projectRoot, registryRoot }); }
  finally {
    expect(captureProjectFiles(base, ["home", "project/AGENTS.md"])).toEqual(untouched);
    rmSync(base, { recursive: true, force: true });
  }
}
function registry(root, bytes) {
  mkdirSync(root, { mode: 0o700 });
  put(join(root, "registry.json"), bytes);
}
const snapshot = (root) => captureProjectFiles(root, readdirSync(root));

test("empty list and live absent status never create storage or adopt", () => fixture(({ options, registryRoot, projectRoot }) => {
  const before = snapshot(projectRoot);
  expect(listProjects({ registryRoot })).toEqual([]);
  expect(projectStatus(options)).toMatchObject({ projectRoot, registered: false, status: "unadopted" });
  expect(existsSync(registryRoot)).toBe(false);
  expect(snapshot(projectRoot)).toEqual(before);
}));

test("real init, doctor and uninstall delegate, retaining informational membership", () => fixture(({ options, trusted, registryRoot, projectRoot }) => {
  expect(initRegisteredProject(trusted)).toMatchObject({ localResult: { status: "installed" }, registry: { status: "recorded", published: true } });
  expect(doctorRegisteredProject(options).localResult).toEqual({ status: "healthy" });
  const before = snapshot(projectRoot), index = snapshot(registryRoot);
  expect(listProjects({ registryRoot })).toEqual([{ projectRoot, registered: true, status: "healthy" }]);
  expect(projectStatus(options).status).toBe("healthy");
  expect(snapshot(projectRoot)).toEqual(before);
  expect(snapshot(registryRoot)).toEqual(index);
  expect(uninstallRegisteredProject(options).localResult.status).toBe("uninstalled");
  expect(listProjects({ registryRoot })[0].status).toBe("unadopted");
  expect(readFileSync(join(registryRoot, "registry.json"), "utf8")).toBe(encode([projectRoot]));
}));

test("cleanup delegates only for fully restored residue", () => fixture(({ options, trusted, projectRoot }) => {
  initRegisteredProject(trusted);
  const state = JSON.parse(readFileSync(join(projectRoot, journal, "state.json")));
  restoreProjectFiles(projectRoot, state.original);
  expect(cleanupRegisteredProject(options).localResult.status).toBe("cleaned");
  expect(projectStatus(options).status).toBe("unadopted");
  expect(() => cleanupRegisteredProject(options)).toThrow();
}));

test("closed plain options, canonical roots and explicit trust fail before mutations", () => fixture(({ options, trusted, projectRoot, registryRoot }) => {
  const before = snapshot(projectRoot);
  for (const value of [undefined, null, [], {}, options, { ...trusted, trustResolution: "unknown" },
    { ...trusted, sourceRoot: source }, { ...trusted, status: "healthy" },
    { ...trusted, projectRoot: "relative" }, { ...trusted, projectRoot: `${projectRoot}/../project` },
    { ...trusted, registryRoot: projectRoot }, { ...trusted, registryRoot: join(projectRoot, "index") },
    { ...trusted, registryRoot: "x" }, { ...trusted, projectRoot: "/" },
    Object.assign(Object.create({}), trusted), { ...trusted, [Symbol("extra")]: true },
    { ...trusted, get unexpected() { throw new Error("getter executed"); } }]) {
    expect(() => initRegisteredProject(value)).toThrow();
  }
  expect(snapshot(projectRoot)).toEqual(before);
  expect(existsSync(registryRoot)).toBe(false);
  expect(() => listProjects({ registryRoot, trustResolution: "trusted" })).toThrow();
  expect(() => projectStatus({ ...options, fault() {} })).toThrow();
}));

test("local failure never records a successful operation or infers trust from membership", () => fixture(({ options, trusted, registryRoot }) => {
  initRegisteredProject(trusted);
  const before = snapshot(registryRoot);
  expect(() => initRegisteredProject(options)).toThrow();
  expect(() => initRegisteredProject(trusted)).toThrow();
  expect(() => cleanupRegisteredProject(options)).toThrow();
  expect(snapshot(registryRoot)).toEqual(before);
}));

test("stale, unsafe, inaccessible and drift entries remain read-only with error evidence", () => fixture(({ base, options, trusted, registryRoot, projectRoot }) => {
  initRegisteredProject(trusted);
  put(join(projectRoot, ".control-tower/radar/main.go"), "drift", 0o644);
  const missing = join(base, "missing"), alias = join(base, "alias"), denied = join(base, "denied");
  symlinkSync(projectRoot, alias); mkdirSync(denied, { mode: 0o000 });
  put(join(registryRoot, "registry.json"), encode([alias, denied, missing, projectRoot].sort()));
  const before = snapshot(registryRoot), local = snapshot(projectRoot);
  const rows = listProjects({ registryRoot });
  expect(rows.map((row) => row.status)).toEqual(["unsafe", "inaccessible", "missing", "invalid"]);
  expect(rows.every((row) => row.error instanceof Error)).toBe(true);
  expect(rows.at(-1).error.message).toContain("drift");
  expect(snapshot(registryRoot)).toEqual(before); expect(snapshot(projectRoot)).toEqual(local);
  chmodSync(denied, 0o700);
}));

for (const bytes of ["not JSON", '{"schema":"tower.v1.projects/1","roots":[],"extra":true}',
  '{"schema":"tower.v1.projects/1","schema":"tower.v1.projects/1","roots":[]}',
  encode(["relative"]), encode(["/tmp/../alias"]), encode(["/tmp/\uD800"]), encode(["/tmp/z", "/tmp/a"]),
  encode(["/tmp/a", "/tmp/a"]), encode(["/" + "a".repeat(4096)]),
  encode(Array.from({ length: 129 }, (_, i) => `/tmp/p${i}`)), " ".repeat(65537)]) {
  test("corrupt or unbounded registry blocks before local adoption", () => fixture(({ registryRoot, trusted, projectRoot }) => {
    registry(registryRoot, bytes);
    const before = snapshot(projectRoot), index = snapshot(registryRoot);
    expect(() => initRegisteredProject(trusted)).toThrow();
    expect(() => listProjects({ registryRoot })).toThrow();
    expect(snapshot(projectRoot)).toEqual(before); expect(snapshot(registryRoot)).toEqual(index);
  }));
}

for (const kind of ["symlink-file", "hardlink-file", "directory-file", "public-file", "public-directory", "extra", "orphan", "lock", "symlink-root", "symlink-ancestor"]) {
  test(`unsafe owned storage ${kind} fails closed`, () => fixture(({ base, trusted, registryRoot, projectRoot }) => {
    registry(registryRoot, encode([]));
    const file = join(registryRoot, "registry.json");
    if (["symlink-file", "hardlink-file", "directory-file"].includes(kind)) {
      rmSync(file); put(join(base, "foreign"), encode([]));
      if (kind === "symlink-file") symlinkSync(join(base, "foreign"), file);
      if (kind === "hardlink-file") linkSync(join(base, "foreign"), file);
      if (kind === "directory-file") mkdirSync(file);
    }
    if (kind === "public-file") chmodSync(file, 0o644);
    if (kind === "public-directory") chmodSync(registryRoot, 0o755);
    if (["extra", "orphan", "lock"].includes(kind)) {
      const name = kind === "lock" ? ".lock" : kind === "orphan" ? ".tmp-foreign" : "state.json";
      put(join(registryRoot, name), "foreign");
    }
    let root = registryRoot;
    if (kind === "symlink-root") { root = join(base, "alias"); symlinkSync(registryRoot, root); }
    if (kind === "symlink-ancestor") { symlinkSync(base, join(base, "alias")); root = join(base, "alias", "registry"); }
    const before = snapshot(projectRoot);
    expect(() => initRegisteredProject({ ...trusted, registryRoot: root })).toThrow();
    expect(snapshot(projectRoot)).toEqual(before);
  }));
}

for (const stage of ["before-write", "before-rename"]) {
  test(`${stage} failure preserves local success and prior index bytes`, () => fixture(({ options, trusted, registryRoot, projectRoot }) => {
    registry(registryRoot, encode([]));
    const before = snapshot(registryRoot), faultError = new Error(stage);
    const result = initRegisteredProject({ ...trusted, fault(point) { if (point === stage) throw faultError; } });
    expect(result.localResult.status).toBe("installed");
    expect(result.registry).toMatchObject({ status: "failed", published: false, error: faultError });
    expect(projectStatus(options)).toMatchObject({ registered: false, status: "healthy" });
    expect(snapshot(registryRoot)).toEqual(before);
    expect(existsSync(join(projectRoot, journal))).toBe(true);
  }));
}

test("publication and cleanup errors both survive, with owned residue blocking reuse", () => fixture(({ trusted, registryRoot }) => {
  const first = new Error("publication"), second = new Error("cleanup");
  const result = initRegisteredProject({ ...trusted, fault(point) {
    if (point === "before-rename") throw first;
    if (point === "before-temp-cleanup") throw second;
  } });
  expect(result.localResult.status).toBe("installed");
  expect(result.registry.error.errors).toEqual([first, second]);
  expect(result.registry.published).toBe(false);
  expect(readdirSync(registryRoot).some((name) => name.startsWith(".tmp-"))).toBe(true);
  expect(() => listProjects({ registryRoot })).toThrow();
}));

test("failed lock release reports successful publication honestly", () => fixture(({ trusted, registryRoot }) => {
  const error = new Error("lock cleanup");
  const result = initRegisteredProject({ ...trusted, fault(point) { if (point === "before-unlock") throw error; } });
  expect(result.registry).toMatchObject({ status: "failed", published: true, error });
  expect(existsSync(join(registryRoot, ".lock"))).toBe(true);
}));

test("held lock excludes concurrent operations; subsequent writes retain sorted unique roots", () => fixture(({ base, trusted, options, registryRoot, projectRoot, env }) => {
  const other = join(base, "other"); mkdirSync(other);
  expect(spawnSync("git", ["init", "--quiet", other], { env }).status).toBe(0);
  initRegisteredProject({ ...trusted, fault(point) {
    if (point === "before-write") {
      expect(() => initRegisteredProject({ ...trusted, projectRoot: other })).toThrow();
      expect(existsSync(join(other, journal))).toBe(false);
      const program = `import { initRegisteredProject } from ${JSON.stringify(join(source, "product/tower/v1/projects.mjs"))};
        try { initRegisteredProject(${JSON.stringify({ ...trusted, projectRoot: other })}); process.exitCode = 1; }
        catch (error) { if (!error.message.includes("lock")) throw error; }`;
      const child = spawnSync(process.execPath, ["--eval", program], { env, cwd: base });
      expect(child.stderr.toString()).toBe(""); expect(child.status).toBe(0);
      expect(existsSync(join(other, journal))).toBe(false);
    }
  } });
  initRegisteredProject({ ...trusted, projectRoot: other });
  doctorRegisteredProject(options);
  expect(JSON.parse(readFileSync(join(registryRoot, "registry.json"))).roots).toEqual([other, projectRoot].sort());
}));

test("noncooperating index change is detected rather than overwritten", () => fixture(({ trusted, registryRoot, base }) => {
  registry(registryRoot, encode([]));
  const replacement = encode([join(base, "other")]);
  const result = initRegisteredProject({ ...trusted, fault(point) {
    if (point === "before-rename") put(join(registryRoot, "registry.json"), replacement);
  } });
  expect(result.registry.status).toBe("failed");
  expect(result.registry.error.message).toContain("changed");
  expect(readFileSync(join(registryRoot, "registry.json"), "utf8")).toBe(replacement);
}));

test("doctor reports earlier intact installation invalid but uninstall still restores it", () => fixture(({ options, trusted, projectRoot }) => {
  initRegisteredProject(trusted);
  const statePath = join(projectRoot, journal, "state.json"), state = JSON.parse(readFileSync(statePath));
  const radar = state.installed.destinations.find((entry) => entry.path === ".control-tower/radar");
  const file = radar.tree.entries.find((entry) => entry.name === "main.go").tree;
  const bytes = Buffer.from("earlier intact release");
  Object.assign(file, { bytes: bytes.toString("base64"), byteLength: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex") });
  put(statePath, JSON.stringify(state)); put(join(projectRoot, ".control-tower/radar/main.go"), bytes, 0o644);
  expect(projectStatus(options).status).toBe("invalid");
  expect(() => doctorRegisteredProject(options)).toThrow("installed journal snapshot");
  expect(uninstallRegisteredProject(options).localResult.status).toBe("uninstalled");
}));

test("worktree-style root delegates without registering its Git directory or ancestors", () => fixture(({ base, options, trusted, registryRoot, projectRoot }) => {
  const gitdir = join(base, "worktree-gitdir");
  renameSync(join(projectRoot, ".git"), gitdir);
  put(join(projectRoot, ".git"), `gitdir: ${gitdir}\n`);
  const before = snapshot(gitdir);
  initRegisteredProject(trusted);
  expect(doctorRegisteredProject(options).localResult.status).toBe("healthy");
  expect(listProjects({ registryRoot }).map((row) => row.projectRoot)).toEqual([projectRoot]);
  expect(uninstallRegisteredProject(options).localResult.status).toBe("uninstalled");
  expect(snapshot(gitdir)).toEqual(before);
}));

test("invalid journal remains invalid rather than appearing uninstalled", () => fixture(({ trusted, options, projectRoot, registryRoot }) => {
  initRegisteredProject(trusted);
  put(join(projectRoot, journal, "state.json"), "broken journal");
  const before = snapshot(projectRoot), index = snapshot(registryRoot);
  const result = projectStatus(options);
  expect(result.status).toBe("invalid"); expect(result.error.message).toContain("journal JSON");
  expect(() => doctorRegisteredProject(options)).toThrow();
  expect(snapshot(projectRoot)).toEqual(before); expect(snapshot(registryRoot)).toEqual(index);
}));

test("non-round-tripping Unicode paths cannot alias another filesystem root", () => fixture(({ base, trusted, projectRoot }) => {
  const actual = join(base, "\uFFFD"), alias = `${base}/\uD800`;
  mkdirSync(actual);
  cpSync(join(projectRoot, ".git"), join(actual, ".git"), { recursive: true });
  const before = snapshot(actual);
  expect(() => initRegisteredProject({ ...trusted, projectRoot: alias })).toThrow();
  expect(snapshot(actual)).toEqual(before);
}));

test("Node rejects malformed Unicode options and persisted roots without alias mutations", () => fixture(({ base, env, trusted, projectRoot }) => {
  const aliasProject = join(base, "project-\uFFFD"), aliasRegistry = join(base, "registry-\uFFFD");
  const unicodeProject = join(base, "café-😀"), unicodeRegistry = join(base, "registry-é");
  mkdirSync(aliasProject); mkdirSync(unicodeProject);
  cpSync(join(projectRoot, ".git"), join(aliasProject, ".git"), { recursive: true });
  put(join(aliasProject, "sentinel"), "untouched local state");
  registry(aliasRegistry, encode([])); registry(unicodeRegistry, encode([unicodeProject]));
  const before = snapshot(base);
  const program = String.raw`
    import assert from "node:assert/strict";
    import { readFileSync, writeFileSync } from "node:fs";
    import { resolve } from "node:path";
    const { initRegisteredProject, listProjects, projectStatus } = await import(process.argv[1]);
    const [base, trusted, unicodeProject, unicodeRegistry] = JSON.parse(process.argv[2]);
    const registryFile = unicodeRegistry + "/registry.json";
    const original = readFileSync(registryFile);
    for (const surrogate of ["\uD800", "\uDC00"]) {
      const projectRoot = base + "/project-" + surrogate, registryRoot = base + "/registry-" + surrogate;
      assert.equal(resolve(projectRoot), projectRoot, "Node preserves lone surrogates");
      assert.throws(() => listProjects({ registryRoot }), /options, paths/);
      assert.throws(() => initRegisteredProject({ ...trusted, registryRoot }), /options, paths/);
      assert.throws(() => initRegisteredProject({ ...trusted, projectRoot }), /options, paths/);
      assert.throws(() => projectStatus({ registryRoot: unicodeRegistry, projectRoot }), /options, paths/);
      writeFileSync(registryFile, JSON.stringify({ schema: "tower.v1.projects/1", roots: [projectRoot] }));
      const malformed = readFileSync(registryFile);
      assert.throws(() => listProjects({ registryRoot: unicodeRegistry }), /schema or roots/);
      assert.throws(() => initRegisteredProject({ ...trusted, registryRoot: unicodeRegistry }), /schema or roots/);
      assert.deepEqual(readFileSync(registryFile), malformed);
      writeFileSync(registryFile, original);
    }
    assert.deepEqual(listProjects({ registryRoot: unicodeRegistry }),
      [{ projectRoot: unicodeProject, registered: true, status: "unadopted" }]);
    assert.equal(projectStatus({ registryRoot: unicodeRegistry, projectRoot: unicodeProject }).status, "unadopted");`;
  const child = spawnSync("node", ["--input-type=module", "--eval", program,
    join(source, "product/tower/v1/projects.mjs"), JSON.stringify([base, trusted, unicodeProject, unicodeRegistry])], { env, cwd: base });
  expect(child.stderr.toString()).toBe(""); expect(child.status).toBe(0);
  expect(snapshot(base)).toEqual(before);
}));

test("storage cannot be rooted under a writable unowned-by-policy parent", () => fixture(({ base, trusted, projectRoot }) => {
  const before = snapshot(projectRoot);
  chmodSync(base, 0o777);
  try { expect(() => initRegisteredProject(trusted)).toThrow("parent ownership"); }
  finally { chmodSync(base, 0o700); }
  expect(snapshot(projectRoot)).toEqual(before);
}));

test("local and lock-cleanup errors are both retained without success publication", () => fixture(({ base, trusted, registryRoot }) => {
  const noGit = join(base, "no-git"); mkdirSync(noGit);
  const cleanupError = new Error("lock release failed");
  let caught;
  try { initRegisteredProject({ ...trusted, projectRoot: noGit, fault(point) {
    if (point === "before-unlock") throw cleanupError;
  } }); } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(AggregateError);
  expect(caught.errors[0].message).toContain("missing Git marker");
  expect(caught.errors[1]).toBe(cleanupError);
  expect(existsSync(join(registryRoot, "registry.json"))).toBe(false);
  expect(existsSync(join(registryRoot, ".lock"))).toBe(true);
}));

test("initial local failure leaves no registry record and does not publish membership", () => fixture(({ base, trusted, registryRoot }) => {
  const noGit = join(base, "no-git"); mkdirSync(noGit);
  expect(() => initRegisteredProject({ ...trusted, projectRoot: noGit })).toThrow("missing Git marker");
  expect(readdirSync(registryRoot)).toEqual([]);
  expect(listProjects({ registryRoot })).toEqual([]);
  expect(readdirSync(noGit)).toEqual([]);
}));

test("capacity and aggregate bounds reject before local installation", () => fixture(({ base, trusted, registryRoot, projectRoot }) => {
  registry(registryRoot, encode(Array.from({ length: 128 }, (_, i) => join(base, `root-${i.toString().padStart(3, "0")}`))));
  const before = snapshot(projectRoot);
  expect(() => initRegisteredProject(trusted)).toThrow("capacity");
  expect(snapshot(projectRoot)).toEqual(before);
  put(join(registryRoot, "registry.json"), encode(Array.from({ length: 20 }, (_, i) => `/tmp/${i.toString().padStart(3, "0")}${"x".repeat(3500)}`)));
  expect(() => initRegisteredProject(trusted)).toThrow("size");
  expect(snapshot(projectRoot)).toEqual(before);
}));

test("trusted copied release layout derives adoption sources from installed module location", () => fixture(({ base, trusted, env }) => {
  const release = join(base, "release");
  for (const path of [...BUNDLE_MEMBERS.map((member) => member.source),
    ...["adoption", "bundle", "project-files", "projects"].map((name) => `product/tower/v1/${name}.mjs`)]) {
    mkdirSync(dirname(join(release, path)), { recursive: true });
    cpSync(join(source, path), join(release, path));
  }
  const program = `import { initRegisteredProject, doctorRegisteredProject, uninstallRegisteredProject } from ${JSON.stringify(join(release, "product/tower/v1/projects.mjs"))};
    const options = ${JSON.stringify(trusted)};
    if (initRegisteredProject(options).localResult.status !== "installed") throw Error("init");
    delete options.trustResolution;
    if (doctorRegisteredProject(options).localResult.status !== "healthy") throw Error("doctor");
    if (uninstallRegisteredProject(options).localResult.status !== "uninstalled") throw Error("uninstall");`;
  const result = spawnSync(process.execPath, ["--eval", program], { env, cwd: base });
  expect(result.stderr.toString()).toBe(""); expect(result.status).toBe(0);
}));
