#!/usr/bin/env bun
import * as childProcess from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, fchmodSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BUNDLE_MEMBERS } from "./bundle.mjs";
import { bootstrapVerifiedRelease } from "./bootstrap.mjs";
import { MAX_RELEASE_BYTES } from "./release.mjs";

const defaultRepo = fileURLToPath(new URL("../../../", import.meta.url));
const memberLimit = 1024 * 1024;
const aggregateLimit = 8 * memberLimit;
const optionNames = ["repo", "commit", "out", "tag", "installer-out", "tui-out-dir"];
const installerPath = "product/tower/v1/install.mjs";
const bundleMemberPath = "product/tower/v1/bundle.mjs";
const moduleNames = ["adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli", "runtime-config", "release-build"];
const runningBundlePath = fileURLToPath(new URL("./bundle.mjs", import.meta.url));
// ASCII paths: default sort is bytewise, never locale-sensitive. Serialization key order
// is schema,members and path,type,encoding,byteLength,sha256,bytes; no timestamps/newline.
const paths = [...new Set([...BUNDLE_MEMBERS.map(({ source }) => source),
  ...moduleNames.map((name) => `product/tower/v1/${name}.mjs`)])].sort();
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (reason) => { throw new Error(reason); };

const stageSkills = [
  "chanks-1-adopcion", "chanks-1-project-kickoff", "chanks-1-autoridad",
  "chanks-2-planificador-granular", "chanks-3-paralelo", "chanks-4-puente",
  "chanks-5-politica-de-entrega", "chanks-5-session-doc", "chanks-0-session-context-loader",
];
const requiredRadar = ["etapa", "faltan", "status", "sesion", "check", "render", "archivar", "zonas"];
const forbiddenTerms = ["jornada", "herdr", "admission", "admisión", "marcar", "session-kickoff", "Emilio", "Notion", "gentle-ai:"];
class InstructionsError extends Error {}
class RosterError extends Error {}

// A checkout's roster is its own explicit review record, never the running CLI's
// BUNDLE_MEMBERS (issue #156: --from-checkout used the installed 91-path roster with
// newer contents and produced a version that could not self-bootstrap).
function canonicalRosterPath(path) {
  return typeof path === "string" && path.length > 0 && path.length <= 512 &&
    !path.startsWith("/") && !/^[A-Za-z]:/.test(path) && !path.includes("\\") && !path.includes("\0") &&
    path.split("/").every((part) => part && part !== "." && part !== "..");
}
// Load the checkout's bundle.mjs, the only faithful source of its roster. A checkout
// byte-identical to the running bundle short-circuits, so the ordinary release
// pipeline (repo == this checkout) never spawns a process or evaluates anything.
// The spawned evaluator uses the module-top `childProcess` import (node:child_process).
function loadCheckoutRoster(source) {
  let base;
  try {
    base = mkdtempSync(join(realpathSync(tmpdir()), "tower-roster-"));
    const file = join(base, "bundle.mjs");
    writeFileSync(file, source, { mode: 0o600 });
    const script = `import { BUNDLE_MEMBERS } from ${JSON.stringify(pathToFileURL(file).href)};\n` +
      "process.stdout.write(JSON.stringify(BUNDLE_MEMBERS.map(({ source }) => source)));";
    const result = childProcess.spawnSync(process.execPath, ["-e", script],
      { encoding: "buffer", timeout: 10_000, maxBuffer: memberLimit,
        env: { PATH: process.env.PATH, HOME: process.env.HOME } });
    if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout) || result.stdout.length > memberLimit) {
      throw new RosterError("El roster de la release no se pudo leer desde product/tower/v1/bundle.mjs del checkout.");
    }
    const sources = JSON.parse(result.stdout.toString("utf8"));
    if (!Array.isArray(sources) || !sources.length || sources.some((path) => !canonicalRosterPath(path))) {
      throw new RosterError("El roster de product/tower/v1/bundle.mjs del checkout no es válido para construir la release.");
    }
    return [...new Set([...sources, ...moduleNames.map((name) => `product/tower/v1/${name}.mjs`)])].sort();
  } catch (error) {
    if (error instanceof RosterError) throw error;
    throw new RosterError("El roster de la release no se pudo determinar desde el bundle.mjs del checkout.");
  } finally {
    if (base) rmSync(base, { recursive: true, force: true });
  }
}
function checkoutRoster(root, sha) {
  let source;
  try { source = git(root, ["show", `${sha}:${bundleMemberPath}`]); }
  catch { throw new RosterError("El roster de la release no se pudo leer desde product/tower/v1/bundle.mjs del checkout."); }
  if (source.equals(readFileSync(runningBundlePath))) return paths;
  return loadCheckoutRoster(source);
}

/** Pure structural contract shared with tests. Parse the shipped source, never import/eval it.
 * The roster is deliberately a literal workflowNames array; unsupported source shapes fail closed.
 * Output order is fixed by rule/template order and bytewise-sorted unique references.
 */
export function instructionProblems({ project, pointer, bundleSource, radarSource }) {
  const problems = [];
  const add = (rule, message) => problems.push({ rule, message });
  for (const [file, marker, text] of [["project-agents.md", "project-workflow", project], ["global-pointer.md", "pointer", pointer]]) {
    const opening = `<!-- control-tower:${marker} -->`, closing = `<!-- /control-tower:${marker} -->`;
    if (text.split(opening).length !== 2 || text.split(closing).length !== 2 ||
        !text.startsWith(opening + "\n") || !text.endsWith(closing + "\n")) {
      add("markers", `${file}: debe tener exactamente un par válido y ordenado de marcadores control-tower:${marker}.`);
    }
    if ((text.match(/\{\{TOWER_VERSION\}\}/g) ?? []).length !== 1) {
      add("version", `${file}: debe tener exactamente un placeholder {{TOWER_VERSION}} (la versión se completa al instalar desde el tag).`);
    }
    for (const term of forbiddenTerms) if (text.toLowerCase().includes(term.toLowerCase())) {
      add("forbidden", `${file}: término prohibido «${term}».`);
    }
  }

  const declarations = [...bundleSource.matchAll(/\bconst workflowNames\s*=\s*\[([\s\S]*?)\];/g)];
  let names;
  try {
    if (declarations.length !== 1 || !/\bconst workflowRoot\s*=\s*"agent-workflows\/skills";/.test(bundleSource)) throw new Error();
    names = JSON.parse(`[${declarations[0][1].replace(/,\s*$/, "")}]`);
    if (!Array.isArray(names) || !names.length || names.some(name => typeof name !== "string")) throw new Error();
  } catch {
    add("skills", "No se pudo leer el roster literal de skills V1 en bundle.mjs.");
    names = [];
  }
  const roster = new Set(names.filter(name => /^[a-z0-9-]+\/SKILL\.md$/.test(name)).map(name => name.split("/")[0]));
  // Chanks references may be bare; other skill names use inline-code kebab-case.
  // The skill-loading table also admits simple names, without treating `check`
  // and `render` shorthand elsewhere as skills.
  const skillReferences = text => [...text.matchAll(/\b(chanks-[0-9]-[a-z0-9-]+)\b|`([a-z][a-z0-9]*(?:-[a-z0-9]+)+)`/g)]
    .map(match => match[1] ?? match[2]);
  const skillTable = /### Which skill to load\n([\s\S]*?)(?:\n### |$)/.exec(project)?.[1] ?? "";
  const referencedSkills = new Set([
    ...skillReferences(project),
    ...[...skillTable.matchAll(/`([a-z][a-z0-9-]*)`/g)].map(match => match[1]),
  ]);
  // Both templates are shipped instructions: every skill either names must exist.
  for (const [file, names] of [["project-agents.md", referencedSkills], ["global-pointer.md", new Set(skillReferences(pointer))]]) {
    for (const name of [...names].sort()) if (!roster.has(name)) {
      add("skills", `${file}: la skill ${name} no está en el roster V1 de bundle.mjs.`);
    }
  }
  for (const name of stageSkills) if (roster.has(name) && !referencedSkills.has(name)) {
    add("skills", `project-agents.md: falta la skill de entrada de etapa ${name}.`);
  }

  const usages = [...radarSource.matchAll(/\bconst uso\s*=\s*`([\s\S]*?)`/g)];
  const switches = [...radarSource.matchAll(/\bswitch comando\s*\{([\s\S]*?)\n\tdefault:/g)];
  if (usages.length !== 1) add("radar", "No se pudo leer el uso de Radar en main.go.");
  if (switches.length !== 1) add("radar", "No se pudo leer el switch de comandos de Radar en main.go.");
  const radarReferences = text => [...text.matchAll(/\bradar[ \t]+([a-z][a-z0-9-]*)\b/g)].map(match => match[1]);
  const documented = new Set(radarReferences(usages.length === 1 ? usages[0][1] : ""));
  // Commented-out cases are not dispatched; strip Go comments before reading labels.
  const switchBody = (switches.length === 1 ? switches[0][1] : "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const implemented = new Set([...switchBody.matchAll(/\bcase "([a-z][a-z0-9-]*)":/g)]
    .map(match => match[1]));
  const referencedRadar = new Set(radarReferences(project + "\n" + pointer));
  for (const command of [...referencedRadar].sort()) {
    if (!documented.has(command)) add("radar", `radar ${command}: no existe en el uso de Radar publicado (main.go).`);
    if (!implemented.has(command)) add("radar", `radar ${command}: no existe en el switch de Radar publicado (main.go).`);
  }
  for (const command of requiredRadar) if (!referencedRadar.has(command)) {
    add("radar", `project-agents.md/global-pointer.md: falta el comando obligatorio radar ${command}.`);
  }
  return problems;
}

function git(repo, argv, maxBuffer = memberLimit + 1) {
  // Never let inherited Git overrides redirect commit reads or status inspection.
  // Optional locks off prevents status from refreshing the caller's index on disk.
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
    GIT_OPTIONAL_LOCKS: "0" };
  const result = childProcess.spawnSync("git", ["--no-replace-objects", "-C", repo,
    "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", ...argv],
  { encoding: "buffer", timeout: 10_000, maxBuffer, env });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout) || result.stdout.length > maxBuffer) {
    fail("git command failed or exceeded its bound");
  }
  return result.stdout;
}
function clean(repo) {
  if (git(repo, ["status", "--porcelain=v1", "--untracked-files=all", "--ignore-submodules=none"]).length) {
    fail("a clean worktree is required (tracked or untracked changes found)");
  }
}
function outputPath(out, repo) {
  if (typeof out !== "string" || !isAbsolute(out) || /[\0\r\n]/.test(out)) fail("out must be an absolute file path");
  const target = join(realpathSync(dirname(out)), basename(out));
  if (target === repo || target.startsWith(repo + sep)) fail("out must be outside the repository worktree");
  try { lstatSync(target); }
  catch (error) { if (error.code === "ENOENT") return target; throw error; }
  fail("out already exists; overwrite is forbidden");
}

/** Deterministic standalone asset; a unique, exact sentinel prevents accidental restamping. */
export function stampInstaller(source, { tag, sha256, tui, roster = paths }) {
  if (typeof tag !== "string" || tag.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(tag) ||
      tag.includes("..") || tag.endsWith(".") || tag.toLowerCase() === "latest" || !/^[a-f0-9]{64}$/.test(sha256)) {
    fail("invalid installer stamp tag or SHA-256");
  }
  if (typeof source !== "string" || source.match(/^const PINNED = null;$/gm)?.length !== 1) fail("unstamped installer marker must occur exactly once");
  const pinned = { repository: "achangkuon/control-tower", tag, asset: "tower-v1.json", sha256, paths: roster, ...(tui ? { tui } : {}) };
  return source.replace(/^const PINNED = null;$/m, () => `const PINNED = ${JSON.stringify(pinned)};`);
}

/** Offline cross-build seam: builder is injected only by tests, never by CLI flags. */
function buildTui({ repo, commit, out }, { builder = childProcess.spawnSync } = {}) {
  const source = "product/tower/v1/tui";
  const tree = git(repo, ["ls-tree", "-rlz", commit, "--", source], 4 * memberLimit).toString();
  if (!tree || tree.split("\0").filter(Boolean).some(line => !/^100(?:644|755) blob /.test(line))) fail("unsafe TUI commit tree");
  const base = mkdtempSync(join(realpathSync(tmpdir()), "tower-tui-build-"));
  const run = (command, argv, options) => {
    const result = builder(command, argv, { timeout: 180_000, maxBuffer: memberLimit, encoding: "buffer", ...options });
    if (result?.error || result?.status !== 0) fail("offline TUI build failed (Go and cached modules required)");
    return result.stdout?.toString().trim();
  };
  try {
    const archive = git(repo, ["archive", "--format=tar", commit, source], 8 * memberLimit);
    const extracted = childProcess.spawnSync("tar", ["-xf", "-", "-C", base], { input: archive, timeout: 10_000, maxBuffer: memberLimit });
    if (extracted.error || extracted.status !== 0) fail("TUI archive extraction failed");
    const cwd = join(base, source);
    // Neither ancestor workspaces nor ambient Go configuration may redirect
    // commit dependencies. Only the operator's module-cache location is reused.
    const policy = { GOFLAGS: "-mod=readonly", GOPROXY: "off", GOSUMDB: "off", GOWORK: "off",
      GOTOOLCHAIN: "local", GOENV: "off", GOTELEMETRY: "off", CGO_ENABLED: "0" };
    const cache = run("go", ["env", "GOMODCACHE"], { cwd, env: { PATH: process.env.PATH, HOME: process.env.HOME,
      ...policy, ...(process.env.GOMODCACHE ? { GOMODCACHE: process.env.GOMODCACHE } : {}) } });
    if (!isAbsolute(cache ?? "") || /[\0\r\n]/.test(cache)) fail("invalid operator module cache");
    const env = { PATH: process.env.PATH, HOME: join(base, "home"), TMPDIR: join(base, "tmp"),
      GOCACHE: join(base, "cache"), GOPATH: join(base, "gopath"), GOMODCACHE: cache,
      ...policy };
    for (const key of ["HOME", "TMPDIR", "GOCACHE", "GOPATH"]) mkdirSync(env[key]);
    const binaries = [], tui = {};
    for (const os of ["linux", "darwin"]) for (const arch of ["amd64", "arm64"]) {
      const asset = `torre-tui-${os}-${arch}`, target = join(base, asset);
      run("go", ["build", "-trimpath", "-ldflags", "-s -w -buildid=", "-o", target, "."], { cwd, env: { ...env, GOOS: os, GOARCH: arch } });
      const stat = lstatSync(target);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 64 * memberLimit) fail("invalid TUI build output");
      const bytes = readFileSync(target);
      tui[`${os}-${arch}`] = { asset, sha256: digest(bytes), bytes: bytes.length };
      binaries.push({ asset, bytes });
    }
    clean(repo);
    mkdirSync(out, { mode: 0o755 });
    for (const { asset, bytes } of binaries) {
      const fd = openSync(join(out, asset), "wx", 0o755);
      try { writeFileSync(fd, bytes); fchmodSync(fd, 0o755); } finally { closeSync(fd); }
      const checksumFd = openSync(join(out, asset + ".sha256"), "wx", 0o644);
      try { writeFileSync(checksumFd, `${digest(bytes)}  ${asset}\n`); fchmodSync(checksumFd, 0o644); }
      finally { closeSync(checksumFd); }
    }
    return tui;
  } finally { rmSync(base, { recursive: true, force: true }); }
}

/** Build from immutable commit-tree blobs; bootstrap is the final wire-format authority.
 * No network, working-file reads, Git mutations, or filesystem writes before admission.
 * Returns the receipt; only main prints it. The output parents must already exist.
 */
export function buildRelease(options, deps = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options) ||
      Object.keys(options).some((key) => !optionNames.includes(key))) fail("invalid build options");
  const { repo = defaultRepo, commit = "HEAD", out, tag, "installer-out": installerOut, "tui-out-dir": tuiOut } = options;
  const withInstaller = Object.hasOwn(options, "tag") || Object.hasOwn(options, "installer-out");
  if (withInstaller && (!tag || !installerOut)) fail("--tag and --installer-out must be supplied together");
  if (withInstaller && basename(out ?? "") !== "tower-v1.json") fail("installer requires envelope asset name tower-v1.json");
  if (typeof repo !== "string" || !repo || typeof commit !== "string" || !commit ||
      commit.startsWith("-") || /[\0\r\n]/.test(commit)) fail("invalid repository or commit");
  const root = realpathSync(resolve(repo));
  if (git(root, ["rev-parse", "--show-toplevel"]).toString("utf8").trim() !== root) fail("repo must be a worktree root");
  const target = outputPath(out, root);
  const checksumTarget = outputPath(out + ".sha256", root);
  const installerTarget = withInstaller ? outputPath(installerOut, root) : null;
  if (tuiOut && !withInstaller && !deps.allowTuiFailure) fail("TUI requires --tag and --installer-out");
  const tuiTarget = tuiOut ? outputPath(tuiOut, root) : null;
  const outputs = [target, checksumTarget, installerTarget, tuiTarget].filter(Boolean);
  if (new Set(outputs).size !== outputs.length) fail("outputs must differ");
  clean(root);
  const sha = git(root, ["rev-parse", "--verify", "--end-of-options", `${commit}^{commit}`]).toString("utf8").trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(sha)) fail("git returned an invalid commit");
  // The envelope carries the CHECKOUT's roster, so the installed version can always
  // self-validate its own release.json regardless of the running CLI's roster.
  const releasePaths = checkoutRoster(root, sha);
  const entries = new Map();
  const readPaths = withInstaller ? [...releasePaths, installerPath] : releasePaths;
  // Include the whole vendor subtree in metadata admission so newly committed
  // dependency files cannot be silently omitted by the explicit release roster.
  const tree = git(root, ["ls-tree", "-rlz", "--full-tree", sha, "--", ...readPaths, "agent-workflows/tools/radar/vendor"]).toString("utf8");
  for (const record of tree.split("\0").filter(Boolean)) {
    const match = record.match(/^(100644|100755) blob [a-f0-9]+ +([0-9]+)\t(.+)$/);
    if (!match || !readPaths.includes(match[3]) || entries.has(match[3])) fail("unreviewed or non-regular release member");
    entries.set(match[3], Number(match[2]));
  }
  let aggregate = 0;
  for (const path of releasePaths) {
    const size = entries.get(path);
    if (size === undefined) fail(`missing release member: ${path}`);
    if (!Number.isSafeInteger(size) || size < 0 || size > memberLimit) fail(`release member size limit: ${path}`);
    if ((aggregate += size) > aggregateLimit) fail("release aggregate size limit");
  }
  const members = releasePaths.map((path) => {
    const bytes = git(root, ["show", `${sha}:${path}`]);
    if (bytes.length !== entries.get(path)) fail(`release member size divergence: ${path}`);
    return { path, type: "file", encoding: "base64", byteLength: bytes.length,
      sha256: digest(bytes), bytes: bytes.toString("base64") };
  });
  const text = path => Buffer.from(members.find(member => member.path === path).bytes, "base64").toString("utf8");
  const problems = instructionProblems({
    project: text("product/tower/v1/instructions/project-agents.md"),
    pointer: text("product/tower/v1/instructions/global-pointer.md"),
    bundleSource: text("product/tower/v1/bundle.mjs"),
    radarSource: text("agent-workflows/tools/radar/main.go"),
  });
  if (problems.length) throw new InstructionsError(`Las instrucciones de la release no están al día:\n${problems.map(({ message }) => `- ${message}`).join("\n")}`);
  const bytes = Buffer.from(JSON.stringify({ schema: "tower.v1.release/1", members }));
  if (bytes.length > MAX_RELEASE_BYTES) fail("release encoded size limit");
  const sha256 = digest(bytes);
  bootstrapVerifiedRelease({ repository: "example/control-tower", tag: "v1", asset: "tower-v1.json", sha256,
    runner: (_command, argv) => ({ status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : bytes }) });
  let installer, installerSource;
  if (withInstaller) {
    const size = entries.get(installerPath);
    if (!Number.isSafeInteger(size) || size < 0 || size > memberLimit) fail("missing or oversized installer member");
    const source = git(root, ["show", `${sha}:${installerPath}`]);
    if (source.length !== size) fail("installer size divergence");
    installerSource = new TextDecoder("utf-8", { fatal: true }).decode(source);
    stampInstaller(installerSource, { tag, sha256, roster: releasePaths }); // Admit source and pins before any TUI publication.
  }
  let tui = null;
  if (tuiTarget) {
    try { tui = buildTui({ repo: root, commit: sha, out: tuiTarget }, deps); }
    catch (error) {
      // Checkout engine installs may proceed without optional offline Go output.
      // Published builds remain all-or-nothing; final clean(root) still runs.
      if (!deps.allowTuiFailure) throw error;
    }
  }
  if (installerSource) installer = Buffer.from(stampInstaller(installerSource, { tag, sha256, tui, roster: releasePaths }));
  clean(root);
  const fd = openSync(target, "wx", 0o644);
  try { writeFileSync(fd, bytes); fchmodSync(fd, 0o644); } finally { closeSync(fd); }
  const checksumFd = openSync(checksumTarget, "wx", 0o644);
  try { writeFileSync(checksumFd, `${sha256}  ${basename(target)}\n`); fchmodSync(checksumFd, 0o644); }
  finally { closeSync(checksumFd); }
  if (installer) {
    const installerFd = openSync(installerTarget, "wx", 0o644);
    try { writeFileSync(installerFd, installer); fchmodSync(installerFd, 0o644); } finally { closeSync(installerFd); }
  }
  return { schema: "tower.v1.release-build/1", commit: sha, asset: basename(out), bytes: bytes.length, sha256,
    ...(installer ? { installerSha256: digest(installer) } : {}), ...(tui ? { tui } : {}) };
}

export function main(argv, io = {}) {
  const { stdout = process.stdout, stderr = process.stderr } = io;
  try {
    if (!Array.isArray(argv) || argv.some((arg) => typeof arg !== "string")) fail("string arguments required");
    const options = {};
    for (let index = 0; index < argv.length; index += 2) {
      const flag = argv[index], value = argv[index + 1];
      if (!flag.startsWith("--") || !optionNames.includes(flag.slice(2)) || Object.hasOwn(options, flag.slice(2)) ||
          !value || value.startsWith("--")) fail("invalid, duplicate or missing flag/value");
      options[flag.slice(2)] = value;
    }
    if (!Object.hasOwn(options, "out")) fail("--out is required");
    stdout.write(`${JSON.stringify(buildRelease(options))}\n`);
    return 0;
  } catch (error) {
    if (error instanceof InstructionsError || error instanceof RosterError) {
      stderr.write(`No se pudo construir la release de Tower: ${error.message}\n`);
      return 1;
    }
    const message = String(error?.message ?? error).split(/[\r\n\u2028\u2029]/, 1)[0].slice(0, 440);
    stderr.write(`Invalid Tower release build: ${message || "operation failed"}\n`);
    return 1;
  }
}
if (import.meta.main) process.exitCode = main(process.argv.slice(2));
