import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmodSync, closeSync, constants, fchmodSync, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync,
  readdirSync, readlinkSync, readSync, realpathSync, renameSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, parse, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { BUNDLE_MEMBERS, RETIRED_MEMBERS } from "./bundle.mjs";

const schema = "tower.v1.runtime/1";
const share = ".local/share/torre-control";
const manifestPath = `${share}/runtime-ownership.json`;
const settingsPath = ".claude/settings.json";
const pointerPaths = [".claude/CLAUDE.md", ".codex/AGENTS.md", ".config/opencode/AGENTS.md", ".pi/agent/APPEND_SYSTEM.md"];
const start = "<!-- control-tower:pointer -->", end = "<!-- /control-tower:pointer -->";
export const V1_SKILLS = Object.freeze([...new Set(BUNDLE_MEMBERS.filter(m => m.destination.startsWith("skills/") && !m.destination.startsWith("skills/_shared/")).map(m => m.destination.split("/")[1]))].sort());
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const encode = value => JSON.stringify(value);
const fail = text => { throw new Error(`Tower runtime: ${text}`); };
const plain = value => value && typeof value === "object" && !Array.isArray(value);
const hooks = [
  { event: "UserPromptSubmit", matcher: "", hook: { type: "command", command: 'sh "$HOME/.claude/hooks/chanks-etapa.sh"', timeout: 15 } },
  { event: "PreToolUse", matcher: "Bash", hook: { type: "command", command: 'sh "$HOME/.claude/hooks/torre-firma.sh"', timeout: 15 } },
];
function stat(path) { try { return lstatSync(path); } catch (e) { if (e.code === "ENOENT") return null; throw e; } }
function homeFor(home, check = true) {
  if (typeof home !== "string" || !isAbsolute(home) || resolve(home) !== home || home === parse(home).root || /[\0\r\n\\]/.test(home)) fail("unsafe HOME");
  if (check) safe(home, home); return home;
}
function safe(home, path, leafLink = false) {
  let current = parse(path).root;
  const parts = path.slice(current.length).split(sep);
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const s = stat(current);
    if (!s) continue;
    const leaf = index === parts.length - 1;
    if (s.isSymbolicLink() && !(leaf && leafLink) || !leaf && !s.isDirectory() ||
        (current === home || current.startsWith(home + sep)) && (s.uid !== process.getuid() || !s.isSymbolicLink() && s.mode & 0o022)) fail(`unsafe path or symlink: ${current}`);
  }
}
function read(home, path, limit = 2 * 1024 * 1024) {
  safe(home, path);
  if (!stat(path)) return null;
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const s = fstatSync(fd);
    if (!s.isFile() || s.nlink !== 1 || s.size > limit) fail("unsafe file or size bound");
    const bytes = Buffer.alloc(s.size + 1), count = readSync(fd, bytes, 0, bytes.length, 0);
    if (count !== s.size) fail("file changed while reading");
    return bytes.subarray(0, count);
  } finally { closeSync(fd); }
}
function snapshot(home, path, leafLink = false, budget = { count: 0 }) {
  safe(home, path, leafLink);
  const s = stat(path); if (!s) return null;
  if (++budget.count > 2048) fail("tree membership bound");
  if (s.isSymbolicLink() && leafLink) return { kind: "link", target: readlinkSync(path), sha256: hash(readlinkSync(path)) };
  if (s.isDirectory()) return { kind: "directory", children: Object.fromEntries(readdirSync(path).sort().map(name => [name, snapshot(home, join(path, name), false, budget)])) };
  return { kind: "file", sha256: hash(read(home, path, 64 * 1024 * 1024)), mode: s.mode & 0o777 };
}
function directories(home, path, created) {
  safe(home, path);
  if (stat(path)) { if (!stat(path).isDirectory()) fail("expected directory"); return; }
  directories(home, dirname(path), created);
  mkdirSync(path, { mode: 0o755 }); chmodSync(path, 0o755);
  if (created && path.startsWith(home + sep)) created.add(path.slice(home.length + 1));
}
function atomic(home, path, bytes, mode = 0o644, created) {
  safe(home, path); directories(home, dirname(path), created);
  const temporary = path + `.tower-${randomUUID()}`;
  writeFileSync(temporary, bytes, { flag: "wx", mode }); chmodSync(temporary, mode);
  renameSync(temporary, path);
}
function remove(home, path, expected) {
  if (encode(snapshot(home, path, expected?.kind === "link")) !== encode(expected)) fail("modified owned entry");
  if (!expected) return;
  if (expected.kind === "directory") {
    for (const [name, child] of Object.entries(expected.children)) remove(home, join(path, name), child);
    rmdirSync(path);
  } else unlinkSync(path);
}
export function gentleAiVersion({ runner = spawnSync, env = process.env } = {}) {
  let result;
  try { result = runner("gentle-ai", ["version"], { env, encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024, stdio: ["ignore", "pipe", "pipe"] }); } catch {}
  const version = !result?.error && result?.status === 0 && String(result.stdout ?? "").trim().match(/^gentle-ai\s+(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)$/)?.[1];
  return version ? { status: "ok", version } : { status: "missing", version: null };
}
export function requireGentleAi(options) {
  const value = gentleAiVersion(options);
  if (value.status !== "ok") fail("Gentle AI es obligatorio. Instalá Gentle AI siguiendo https://github.com/Gentleman-Programming/gentle-ai y verificá `gentle-ai version` antes de instalar la Torre.");
  return value;
}
function allowedEntries() {
  return new Map([
    ...V1_SKILLS.flatMap(name => [[`.agents/skills/${name}`, "skills"], [`.claude/skills/${name}`, "skills"]]),
    [".agents/skills/_shared/plan-naming-convention.md", "skills"], [".local/bin/radar", "radar"],
    [".local/bin/copiloto", "copiloto"],
    [".local/bin/piloto", "piloto"],
    [`${share}/torre-firma.mjs`, "signatures"], [".pi/agent/extensions/chanks-notices.ts", "signatures"],
    [".claude/hooks/chanks-etapa.sh", "signatures"], [".claude/hooks/torre-firma.sh", "signatures"],
  ]);
}
// A skill destination the running roster no longer owns. Only these may be absent
// from allowedEntries(); every other unknown destination stays rejected so a
// corrupted manifest can never name an arbitrary path for removal.
function retiredSkill(path) {
  const match = typeof path === "string" && /^\.(?:agents|claude)\/skills\/([^/]+)$/.exec(path);
  // `_shared` hosts owned roster files (e.g. the plan-naming convention) and never retires;
  // treating it as removable would let a corrupted manifest delete a live owned parent.
  return match && match[1] !== "_shared" && match[1] !== "." && match[1] !== ".." && !V1_SKILLS.includes(match[1]) ? match[1] : null;
}
// Nested directories recorded under a retired skill's root (issue #176): an older
// install owns them whole, so the directories check must tolerate them exactly where
// the entries check already tolerates the retired root itself. No other unknown path
// is admitted.
function retiredSkillChild(path) {
  const match = typeof path === "string" && /^(\.(?:agents|claude)\/skills\/[^/]+)\//.exec(path);
  return match ? retiredSkill(match[1]) : null;
}
function load(home) {
  const bytes = read(home, join(home, manifestPath)); if (!bytes) return null;
  let value; try { value = JSON.parse(bytes); } catch { fail("invalid ownership manifest JSON"); }
  const allowed = allowedEntries();
  if (value?.schema !== schema || !Array.isArray(value.entries) || !Array.isArray(value.pointers) || !Array.isArray(value.directories) || !plain(value.settings)) fail("invalid ownership manifest");
  const seen = new Set();
  for (const entry of value.entries) {
    // Entries may be a subset of the running roster: an older release installed fewer
    // skills, or retired one that a newer release no longer ships (issue #157).
    const retired = entry.component === "skills" && retiredSkill(entry.path);
    if (seen.has(entry.path) || allowed.get(entry.path) !== entry.component && !retired || !entry.installed ||
        entry.backup && (!/^\.local\/share\/torre-control\/backups\/[A-Za-z0-9T_.:-]+\/[0-9]+$/.test(entry.backup.path) || !entry.backup.content)) fail("invalid manifest destination");
    seen.add(entry.path);
  }
  if (value.pointers.some(p => !pointerPaths.includes(p.path) || typeof p.block !== "string" || typeof p.before !== "string" || typeof p.separator !== "string") || new Set(value.pointers.map(p => p.path)).size !== value.pointers.length) fail("invalid pointer manifest");
  const parents = new Set();
  const skillFiles = BUNDLE_MEMBERS.filter(m => m.destination.startsWith("skills/")).map(m => `.agents/${m.destination}`);
  for (const path of [...allowed.keys(), ...skillFiles, ...pointerPaths, manifestPath, settingsPath]) {
    let parent = dirname(path); while (parent !== ".") { parents.add(parent); parent = dirname(parent); }
  }
  if (value.directories.some(p => !parents.has(p) && p !== `${share}/backups` && !retiredSkill(p) && !retiredSkillChild(p) &&
      !(typeof p === "string" && /^\.local\/share\/torre-control\/backups\/[A-Za-z0-9T_.:-]+$/.test(p) && !p.split("/").includes("..")))) fail("invalid directory manifest");
  return value;
}
function settings(home) {
  const bytes = read(home, join(home, settingsPath));
  let value; try { value = bytes ? JSON.parse(new TextDecoder("utf8", { fatal: true }).decode(bytes)) : {}; } catch { fail("settings.json no es JSON válido; no se escribió nada"); }
  if (!plain(value) || value.hooks !== undefined && !plain(value.hooks)) fail("settings.json hooks must be an object");
  for (const { event } of hooks) {
    if (value.hooks?.[event] !== undefined && (!Array.isArray(value.hooks[event]) || value.hooks[event].some(e => !plain(e) || !Array.isArray(e.hooks)))) fail("settings.json invalid hook list");
  }
  return { bytes, value, mode: bytes ? stat(join(home, settingsPath)).mode & 0o777 : 0o644 };
}
// Shared by global pointers and project instructions; offsets also work on latin1
// strings, allowing callers to preserve arbitrary non-owned bytes exactly.
export function markerRange(text, name = "control-tower:pointer") {
  const start = `<!-- ${name} -->`, end = `<!-- /${name} -->`;
  const label = name.split(":").at(-1);
  const markerFail = reason => fail(reason.replaceAll("pointer", label));
  const all = [...text.matchAll(/<!--\s*(\/?)\s*([\w-]+:[\w:.-]+)[^>]*-->/g)];
  // Only comments that open and close as a pair form blocks; unpaired notes such as
  // gentle-ai's `...:start` / `...:end` are plain text. The owned name is always checked.
  const paired = new Set(all.filter(t => t[1]).map(t => t[2]).filter(n => all.some(t => !t[1] && t[2] === n)));
  const tokens = all.filter(t => t[2] === name || paired.has(t[2]));
  const stack = []; let range = null, count = 0;
  for (const token of tokens) {
    const owned = token[2] === name;
    if (owned && token[0] !== (token[1] ? end : start)) markerFail("malformed pointer marker");
    if (!token[1]) {
      if (owned && (stack.length || ++count > 1)) markerFail("nested or duplicated pointer marker");
      if (!owned && stack.some(t => t[2] === name)) markerFail("nested pointer marker");
      stack.push(token);
    } else {
      const opening = stack.pop();
      if (!opening || opening[2] !== token[2]) markerFail("malformed marker nesting");
      if (owned) range = { begin: opening.index, finish: token.index + token[0].length };
    }
  }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (stack.length || (text.match(new RegExp(`<!--\\s*\\/?\\s*${escaped}\\b`, "g")) ?? []).length !== count * 2) markerFail("unclosed pointer marker");
  if (range && (range.begin && text[range.begin - 1] !== "\n" || range.finish < text.length && !["\r", "\n"].includes(text[range.finish]))) markerFail("pointer markers must be line-delimited");
  return range;
}
const pointerRange = text => markerRange(text);
function notices(home) {
  return `// Generated by Control Tower. Cosmetic result observer plus a bounded per-turn copiloto card.\nimport { spawnSync } from "node:child_process"\nimport { realpathSync, statSync } from "node:fs"\nimport { homedir } from "node:os"\nimport { resolve } from "node:path"\nimport { radarDirecto } from ${JSON.stringify(pathToFileURL(join(home, share, "torre-firma.mjs")).href)}\nconst CHANKS_SKILLS = new Set(${JSON.stringify(V1_SKILLS)})\nfunction installedSkill(path, cwd) {\n  if (typeof path !== "string") return null\n  try {\n    const home = realpathSync(homedir()), installed = resolve(home, ".agents/skills")\n    if (realpathSync(installed) !== installed) return null\n    const requested = resolve(cwd, path.startsWith("~/") ? resolve(home, path.slice(2)) : path)\n    const target = realpathSync(requested)\n    if (target !== requested || !statSync(target).isFile()) return null\n    for (const name of CHANKS_SKILLS) if (requested === resolve(installed, name, "SKILL.md")) return name\n  } catch {}\n  return null\n}\nfunction executableOnPath(name) {\n  const path = process.env.PATH ?? ""\n  const separator = process.platform === "win32" ? ";" : ":"\n  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""]\n  for (const root of path.split(separator)) {\n    if (!root) continue\n    for (const extension of extensions) {\n      const candidate = resolve(root, name + extension)\n      try { if (statSync(candidate).isFile()) return candidate } catch {}\n    }\n  }\n  return null\n}\nfunction copilotoTarjeta(cwd, sessionId) {\n  try {\n    if (typeof cwd !== "string" || !cwd) return null\n    const binary = executableOnPath("copiloto")\n    if (!binary) return null\n    const conversacion = typeof sessionId === "string" && sessionId.length > 0 && sessionId.length <= 128 && /^[A-Za-z0-9._-]+$/.test(sessionId) ? sessionId : null\n    const args = ["tarjeta"]\n    if (conversacion) args.push("--conversacion", conversacion)\n    args.push("-C", cwd)\n    const result = spawnSync(binary, args, { cwd, timeout: 10_000, maxBuffer: 64 * 1024, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })\n    if (result.error || result.status !== 0) return null\n    const card = String(result.stdout ?? "").trim()\n    return card && card.length <= 4096 ? card : null\n  } catch { return null }\n}\nexport default function chanksNotices(pi) {\n  pi.on("tool_result", (event, ctx) => {\n    if (!ctx.hasUI || event.isError) return undefined\n    try {\n      if (event.toolName === "read") {\n        const name = installedSkill(event.input.path, ctx.cwd)\n        if (name) ctx.ui.notify(\`💪 Chanks · \${name} · lectura completada\`, "info")\n      } else if (event.toolName === "bash") {\n        const radar = radarDirecto(event.input.command)\n        if (radar) ctx.ui.notify(\`🗼 Torre · radar \${radar.subcommand}\`, "info")\n      }\n    } catch {}\n    return undefined\n  })\n  pi.on("before_agent_start", (_event, ctx) => {\n    try {\n      const card = copilotoTarjeta(ctx.cwd, ctx.sessionManager?.sessionId)\n      if (!card) return undefined\n      if (ctx.hasUI) ctx.ui.notify("🧭 Copiloto\\n" + card, "info")\n      return { message: { customType: "copiloto-card", content: card, display: false } }\n    } catch { return undefined }\n  })\n}\n`;
}
// Both Go tools share one bounded, offline build: private empty caches, no ambient
// Go configuration, and a no-follow permission normalization of the fresh output.
// Radar vendors its single dependency; copiloto is dependency-free.
function buildGoTool({ env, runner, members, destination, name, label, goflags }) {
  const temporary = mkdtempSync(join(realpathSync(tmpdir()), `tower-${name}-`));
  const run = (argv, options) => {
    const result = runner("go", argv, { timeout: 180_000, maxBuffer: 1024 * 1024, encoding: "buffer", ...options });
    if (result?.error || result?.status !== 0) {
      // Surface what Go actually said (issue #164): a version-mismatch build
      // failure with GOTOOLCHAIN=local must not collapse into a generic
      // "Go required" hint when the compiler named the real cause. Bounded to
      // one compact line; keeps the generic hint whenever Go produced no
      // output (not found, or failed silently), with the spawn cause appended.
      const outputs = [result?.stderr, result?.stdout].map(v => String(v ?? "").trim()).filter(Boolean);
      const detail = [...outputs, result?.error ? String(result.error.message).trim() : ""].filter(Boolean).join(" | ").replace(/\s+/g, " ").slice(0, 2000);
      fail(`${label} offline build failed${outputs.length ? "" : " (Go required)"}${detail ? `: ${detail}` : ""}`);
    }
    return String(result.stdout ?? "").trim();
  };
  try {
    const cwd = join(temporary, name); mkdirSync(cwd);
    for (const member of BUNDLE_MEMBERS.filter(m => m.destination.startsWith(destination) && members.has(m.source))) {
      const target = join(cwd, member.destination.slice(destination.length));
      mkdirSync(dirname(target), { recursive: true, mode: 0o755 });
      writeFileSync(target, members.get(member.source));
    }
    const policy = { GOFLAGS: goflags, GOPROXY: "off", GOSUMDB: "off", GOWORK: "off", GOTOOLCHAIN: "local", GOENV: "off", GOTELEMETRY: "off", CGO_ENABLED: "0" };
    // Every cache is private and initially empty. No ambient Go env/cache probe,
    // network access, or dependency on the operator's module cache is needed.
    const buildEnv = { PATH: env.PATH, HOME: join(temporary, "home"), TMPDIR: join(temporary, "tmp"), GOCACHE: join(temporary, "cache"), GOPATH: join(temporary, "gopath"), GOMODCACHE: join(temporary, "modules"), ...policy };
    for (const key of ["HOME", "TMPDIR", "GOCACHE", "GOPATH", "GOMODCACHE"]) mkdirSync(buildEnv[key], { mode: 0o700 });
    const output = join(temporary, `${name}-bin`);
    run(["build", "-trimpath", "-ldflags", "-s -w -buildid=", "-o", output, "."], { cwd, env: buildEnv });
    // Go honors ambient umask. Normalize only our newly generated regular output,
    // using a no-follow descriptor so chmod cannot escape through a swapped link.
    const fd = openSync(output, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const built = fstatSync(fd);
      if (!built.isFile() || built.nlink !== 1 || built.uid !== process.getuid() || built.size > 64 * 1024 * 1024) fail(`unsafe ${label} build output`);
      fchmodSync(fd, 0o755);
    } finally { closeSync(fd); }
    const bytes = read(temporary, output, 64 * 1024 * 1024);
    if (!bytes?.length) fail(`missing ${label} build output`);
    return bytes;
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
function buildRadar({ env, runner, members }) {
  return buildGoTool({ env, runner, members, destination: "radar/", name: "radar", label: "Radar", goflags: "-mod=vendor" });
}
function buildCopiloto({ env, runner, members }) {
  return buildGoTool({ env, runner, members, destination: "copiloto/", name: "copiloto", label: "copiloto", goflags: "-mod=readonly" });
}
function buildPiloto({ env, runner, members }) {
  return buildGoTool({ env, runner, members, destination: "piloto/", name: "piloto", label: "piloto", goflags: "-mod=readonly" });
}

// Separate discovery from safe(): admission never relaxes its permission rule.
// Only selected destinations and their ancestors are inspected, not unrelated HOME siblings.
function permissionPaths(home, { stateRoot, launcherPath, registryRoot }) {
  const writable = new Map(); let count = 0;
  const check = (path, leafLink = false) => {
    let current = parse(path).root;
    const parts = path.slice(current.length).split(sep);
    for (const [index, part] of parts.entries()) {
      current = join(current, part);
      const s = stat(current); if (!s) continue;
      const leaf = index === parts.length - 1, inside = current === home || current.startsWith(home + sep);
      if (s.isSymbolicLink() && !(leaf && leafLink) || !leaf && !s.isDirectory() || inside && s.uid !== process.getuid()) fail(`unsafe path or symlink: ${current}`);
      if (inside && !s.isSymbolicLink() && s.mode & 0o022) {
        if (!s.isDirectory() && (!s.isFile() || s.nlink !== 1)) fail(`unsafe path or symlink: ${current}`);
        writable.set(current, s);
      }
    }
  };
  const visit = (path, tree = false, leafLink = false) => {
    if (++count > 65536) fail("permission tree membership bound");
    check(path, leafLink);
    if (tree && stat(path)?.isDirectory()) for (const name of readdirSync(path).sort()) visit(join(path, name), true);
  };
  visit(home);
  for (const path of [manifestPath, settingsPath, `${share}/backups`, ...pointerPaths]) visit(join(home, path));
  for (const [path] of allowedEntries()) visit(join(home, path), true, path.startsWith(".claude/skills/"));
  for (const path of [stateRoot, launcherPath, registryRoot]) {
    if (!path) continue;
    if (typeof path !== "string" || !isAbsolute(path) || resolve(path) !== path || /[\0\r\n\\]/.test(path)) fail("unsafe lifecycle destination");
    visit(path);
  }
  if (registryRoot && stat(registryRoot) && !stat(registryRoot).isDirectory()) fail("unsafe registry directory");
  if (stateRoot && stat(stateRoot)) {
    if (!stat(stateRoot).isDirectory()) fail("unsafe state directory");
    const rootNames = readdirSync(stateRoot);
    if (rootNames.some(name => !["state.json", "versions"].includes(name))) fail("unknown state-root entry or recovery evidence");
    visit(join(stateRoot, "state.json"));
    const store = join(stateRoot, "versions"); visit(store);
    if (stat(store)) {
      if (!stat(store).isDirectory()) fail("unsafe version store");
      const ids = readdirSync(store).sort();
      if (ids.length > 16 || ids.some(id => !/^[a-f0-9]{64}$/.test(id))) fail("unknown version-store entry or membership bound");
      // Every supported cached roster is a subset of this closed source layout,
      // plus the explicitly retired members (RETIRED_MEMBERS) that older cached
      // rosters may still contain for rollback (issue #176). Never repair an extra
      // file that normal lifecycle admission would reject.
      const files = new Set(["provenance.json", "release.json", ...BUNDLE_MEMBERS.map(m => m.source), ...RETIRED_MEMBERS,
        ...["adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli", "runtime-config", "release-build"].map(name => `product/tower/v1/${name}.mjs`)]);
      const parents = new Set([""]);
      for (const file of files) { let parent = dirname(file); while (parent !== ".") { parents.add(parent); parent = dirname(parent); } }
      const version = (path, relative = "") => {
        visit(path);
        const s = stat(path);
        if (s?.isDirectory() && parents.has(relative)) for (const name of readdirSync(path).sort()) version(join(path, name), relative ? `${relative}/${name}` : name);
        else if (!s?.isFile() || !files.has(relative)) fail("unknown version member");
      };
      for (const id of ids) version(join(store, id));
    }
  }
  return [...writable].sort(([a], [b]) => a.localeCompare(b));
}
function repairPermissions(home, paths, destinations) {
  const descriptors = [];
  try {
    // Rewalk all ancestors before opening no-follow descriptors. Validate every
    // inode before the first chmod, including regular-file hardlink isolation.
    const current = permissionPaths(home, destinations);
    if (current.length !== paths.length || current.some(([path, s], i) => path !== paths[i][0] || s.dev !== paths[i][1].dev || s.ino !== paths[i][1].ino || s.mode !== paths[i][1].mode)) fail("permission preflight changed");
    for (const [path, before] of paths) {
      const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      descriptors.push(fd);
      const s = fstatSync(fd);
      if (s.dev !== before.dev || s.ino !== before.ino || s.mode !== before.mode || s.uid !== process.getuid() ||
          !s.isDirectory() && (!s.isFile() || s.nlink !== 1)) fail(`unsafe path or symlink: ${path}`);
    }
    for (const [index, [, s]] of paths.entries()) fchmodSync(descriptors[index], (s.mode & 0o7777) & ~0o022);
  } finally { for (const fd of descriptors) closeSync(fd); }
}

/** Read-only destination admission unless the caller explicitly requests go-w repair. */
export function preflightRuntimeHome({ home, fixPermissions = false, onPermissionsFixed, ...destinations }) {
  home = homeFor(home, false);
  if (onPermissionsFixed !== undefined && typeof onPermissionsFixed !== "function") fail("invalid permission reporter");
  const paths = permissionPaths(home, destinations);
  if (paths.length && !fixPermissions) {
    const error = new Error("Tower runtime: Permisos inseguros: estas rutas permiten escritura de grupo u otros.\n" +
      paths.map(([path]) => `- ${path}\n  chmod go-w '${path.replaceAll("'", "'\\''")}'`).join("\n") +
      "\nCorregí los permisos y volvé a intentar, o ejecutá el mismo comando con --fix-permissions.");
    error.permissionPaths = paths.map(([path]) => path);
    throw error;
  }
  if (paths.length) {
    repairPermissions(home, paths, destinations);
    onPermissionsFixed?.(paths.map(([path]) => path));
  }
  home = homeFor(home);
  if (stat(join(home, share, ".runtime-lock"))) fail("runtime lock or recovery evidence exists");
  const prior = load(home);
  settings(home);
  // Retired skills are owned paths the running roster no longer ships. Every
  // recorded entry, current or retired, is verified before any install write.
  for (const entry of prior?.entries ?? []) {
    const actual = snapshot(home, join(home, entry.path), entry.installed.kind === "link");
    if (actual && encode(actual) !== encode(entry.installed)) fail(`modified owned entry: ${entry.path}`);
  }
  for (const path of pointerPaths) {
    const bytes = read(home, join(home, path));
    if (bytes) pointerRange(new TextDecoder("utf8", { fatal: true }).decode(bytes));
  }
  return paths.map(([path]) => path);
}

/** Prepare all bounded reads, runtime conflict checks and offline build before global activation. */
export function prepareRuntime({ home, members: releaseMembers, vendorReleases = [], version, env = process.env, runner = spawnSync }) {
  preflightRuntimeHome({ home });
  home = homeFor(home); requireGentleAi({ runner, env: { ...env, HOME: home } });
  const prior = load(home), config = settings(home), members = new Map(releaseMembers.map(m => [m.path, Buffer.from(m.bytes)]));
  const allowed = allowedEntries();
  const retired = (prior?.entries ?? []).filter(entry => !allowed.has(entry.path) && retiredSkill(entry.path));
  const radar = "agent-workflows/tools/radar/", vendor = BUNDLE_MEMBERS.filter(m => m.source.startsWith(radar + "vendor/"));
  if (vendor.every(m => !members.has(m.source))) {
    // Donors are cached-release receipts verified by the global lifecycle. Only
    // vendor bytes may be borrowed; all Radar program sources remain the target's.
    const donor = vendorReleases.map(release => new Map(release.map(m => [m.path, Buffer.from(m.bytes)])))
      .find(candidate => vendor.every(m => candidate.has(m.source)) && ["go.mod", "go.sum"]
        .every(name => candidate.has(radar + name) && members.get(radar + name)?.equals(candidate.get(radar + name))));
    if (!donor) fail("No se puede reconstruir Radar: falta vendor verificado con go.mod y go.sum idénticos");
    for (const { source } of vendor) members.set(source, donor.get(source));
  }
  for (const { source } of BUNDLE_MEMBERS) if (!members.has(source)) fail(`missing verified runtime member: ${source}`);
  const desired = [];
  const file = (path, bytes, component, mode = 0o644) => desired.push({ path, component, files: { "": { bytes: Buffer.from(bytes), mode } } });
  for (const name of V1_SKILLS) {
    desired.push({ path: `.agents/skills/${name}`, component: "skills", files: Object.fromEntries(BUNDLE_MEMBERS.filter(m => m.destination.startsWith(`skills/${name}/`)).map(m => [m.destination.slice(`skills/${name}/`.length), { bytes: members.get(m.source), mode: m.destination.endsWith(".py") ? 0o755 : 0o644 }])) });
    desired.push({ path: `.claude/skills/${name}`, component: "skills", link: `../../.agents/skills/${name}` });
  }
  file(".agents/skills/_shared/plan-naming-convention.md", members.get("agent-workflows/skills/_shared/plan-naming-convention.md"), "skills");
  file(`${share}/torre-firma.mjs`, members.get("agent-workflows/chanks/torre-firma.mjs"), "signatures");
  file(".pi/agent/extensions/chanks-notices.ts", notices(home), "signatures");
  for (const name of ["chanks-etapa.sh", "torre-firma.sh"]) file(`.claude/hooks/${name}`, members.get(`agent-workflows/tools/hooks/${name}`), "signatures", 0o755);
  // Destination preflight precedes the build and any installation writes.
  for (const item of [...desired, { path: ".local/bin/radar" }, { path: ".local/bin/copiloto" }, { path: ".local/bin/piloto" }]) {
    item.before = snapshot(home, join(home, item.path), item.path.startsWith(".claude/skills/"));
    const owned = prior?.entries.find(e => e.path === item.path);
    if (owned && item.before && encode(item.before) !== encode(owned.installed)) fail(`modified owned entry: ${item.path}`);
  }
  safe(home, join(home, share, "backups")); safe(home, join(home, manifestPath));
  const block = new TextDecoder("utf8", { fatal: true }).decode(members.get("product/tower/v1/instructions/global-pointer.md")).replaceAll("{{TOWER_VERSION}}", version).trimEnd();
  if (pointerRange(block)?.begin !== 0 || !block.endsWith(end)) fail("invalid pointer template");
  const pointers = [];
  for (const path of pointerPaths) {
    safe(home, join(home, dirname(path)));
    // Claude and Pi will exist after installing their skills/hooks/extension.
    if (![".claude/CLAUDE.md", ".pi/agent/APPEND_SYSTEM.md"].includes(path) && !stat(join(home, dirname(path)))) continue;
    const bytes = read(home, join(home, path)), text = bytes ? new TextDecoder("utf8", { fatal: true }).decode(bytes) : "", range = pointerRange(text);
    const owned = prior?.pointers.find(p => p.path === path);
    if (owned && (!range || text.slice(range.begin, range.finish) !== owned.block)) fail(`modified pointer: ${path}`);
    const separator = text && !text.endsWith("\n") ? "\n\n" : text && !text.endsWith("\n\n") ? "\n" : "";
    pointers.push({ path, block, sha256: hash(block), before: owned?.before ?? (range ? text.slice(range.begin, range.finish) : ""), separator: owned?.separator ?? (range ? "" : separator), existed: owned?.existed ?? bytes !== null, mode: bytes ? stat(join(home, path)).mode & 0o777 : 0o644,
      suffix: owned?.suffix ?? (range ? "" : "\n"), priorBytes: bytes,
      next: range ? text.slice(0, range.begin) + block + text.slice(range.finish) : text + separator + block + "\n" });
  }
  const added = [...(prior?.settings.added ?? [])];
  const nextSettings = structuredClone(config.value);
  for (const registration of hooks) {
    const entries = nextSettings.hooks?.[registration.event] ?? [];
    const matches = entries.flatMap(entry => entry.hooks.filter(h => h.command === registration.hook.command).map(h => ({ entry, h })));
    if (matches.length > 1 || matches.some(({ entry, h }) => entry.matcher !== registration.matcher || !isDeepStrictEqual(h, registration.hook))) fail("modified or duplicate Tower hook registration");
    if (!matches.length) {
      nextSettings.hooks ??= {}; nextSettings.hooks[registration.event] ??= [];
      nextSettings.hooks[registration.event].push({ matcher: registration.matcher, hooks: [registration.hook] });
      if (!added.includes(registration.event)) added.push(registration.event);
    }
  }
  const radarBefore = snapshot(home, join(home, ".local/bin/radar"));
  file(".local/bin/radar", buildRadar({ env, runner, members }), "radar", 0o755);
  desired.at(-1).before = radarBefore;
  const copilotoBefore = snapshot(home, join(home, ".local/bin/copiloto"));
  file(".local/bin/copiloto", buildCopiloto({ env, runner, members }), "copiloto", 0o755);
  desired.at(-1).before = copilotoBefore;
  const pilotoBefore = snapshot(home, join(home, ".local/bin/piloto"));
  file(".local/bin/piloto", buildPiloto({ env, runner, members }), "piloto", 0o755);
  desired.at(-1).before = pilotoBefore;
  return { home, prior, desired, retired, pointers, config, nextSettings, added };
}
export function installRuntime(plan) {
  const { home, prior, desired, retired = [], pointers, config, nextSettings, added } = plan;
  // Recheck every observed destination before the first mutation.
  if (encode(load(home)) !== encode(prior) || !(read(home, join(home, settingsPath)) ?? Buffer.alloc(0)).equals(config.bytes ?? Buffer.alloc(0))) fail("runtime preflight changed");
  for (const item of desired) if (encode(snapshot(home, join(home, item.path), Boolean(item.link))) !== encode(item.before)) fail("runtime destination changed");
  // Only retired paths still present are displaced; a missing one is already gone.
  const presentRetired = retired.filter(entry => {
    const actual = snapshot(home, join(home, entry.path), entry.installed.kind === "link");
    if (actual && encode(actual) !== encode(entry.installed)) fail("runtime destination changed");
    return actual !== null;
  });
  for (const p of pointers) if (!(read(home, join(home, p.path)) ?? Buffer.alloc(0)).equals(p.priorBytes ?? Buffer.alloc(0))) fail("pointer changed");
  const created = new Set(prior?.directories ?? []), entries = [];
  directories(home, join(home, share), created);
  const lock = join(home, share, ".runtime-lock");
  const recovery = { schema: "tower.v1.runtime-recovery/1", prior, entries: [], pending: null,
    settings: config.bytes?.toString("base64") ?? null,
    pointers: pointers.map(p => ({ path: p.path, bytes: p.priorBytes?.toString("base64") ?? null })) };
  let lockBytes = Buffer.from(encode(recovery));
  writeFileSync(lock, lockBytes, { flag: "wx", mode: 0o600 }); chmodSync(lock, 0o600);
  const persist = () => {
    if (!read(home, lock).equals(lockBytes)) fail("runtime lock ownership changed");
    const next = Buffer.from(encode(recovery));
    if (next.length > 2 * 1024 * 1024) fail("runtime recovery record bound");
    atomic(home, lock, next, 0o600); lockBytes = next;
  };
  const displaced = [];
  try {
    const stamp = new Date().toISOString().replaceAll(":", "-") + "-" + randomUUID();
    for (const [index, item] of desired.entries()) {
      const target = join(home, item.path), owned = prior?.entries.find(e => e.path === item.path);
      let installed;
      if (item.link) installed = { kind: "link", target: item.link, sha256: hash(item.link) };
      else {
        const leaf = item.files[""];
        if (leaf) installed = { kind: "file", sha256: hash(leaf.bytes), mode: leaf.mode };
        else {
          installed = { kind: "directory", children: {} };
          for (const [path, file] of Object.entries(item.files).sort()) {
            let tree = installed;
            const parts = path.split("/");
            for (const part of parts.slice(0, -1)) { tree.children[part] ??= { kind: "directory", children: {} }; tree = tree.children[part]; }
            tree.children[parts.at(-1)] = { kind: "file", sha256: hash(file.bytes), mode: file.mode };
          }
        }
      }
      // Canonical child ordering is independent of source-roster ordering.
      const equal = (a, b) => {
        if (a?.kind === "directory" && b?.kind === "directory") return Object.keys(a.children).sort().join() === Object.keys(b.children).sort().join() && Object.keys(a.children).every(k => equal(a.children[k], b.children[k]));
        if (item.component === "skills" && a?.kind === "file" && b?.kind === "file") return a.sha256 === b.sha256;
        return encode(a) === encode(b);
      };
      let backup = owned?.backup ?? null;
      if (!equal(item.before, installed)) {
        if (item.before && !owned) {
          const path = `${share}/backups/${stamp}/${index}`;
          directories(home, dirname(join(home, path)), created);
          recovery.pending = { path: item.path, displaced: path, content: item.before }; persist();
          renameSync(target, join(home, path)); backup = { path, content: item.before };
        } else if (item.before) {
          const path = `${share}/backups/${stamp}/update-${index}`;
          directories(home, dirname(join(home, path)), created);
          recovery.pending = { path: item.path, displaced: path, content: item.before }; persist();
          renameSync(target, join(home, path)); displaced.push({ path, content: item.before });
        }
        recovery.pending ??= { path: item.path, backup, content: item.before }; persist();
        directories(home, dirname(target), created);
        if (item.link) symlinkSync(item.link, target);
        else for (const [path, file] of Object.entries(item.files)) atomic(home, path ? join(target, path) : target, file.bytes, file.mode, created);
      }
      entries.push({ path: item.path, component: item.component, installed: snapshot(home, target, Boolean(item.link)), backup });
      recovery.entries = entries; recovery.pending = null; persist();
      plan.fault?.("resource-installed");
    }
    for (const [index, entry] of presentRetired.entries()) {
      // Preserve the retired owned content in the standard backups layout before removing it.
      const path = `${share}/backups/${stamp}/${desired.length + index}`;
      directories(home, dirname(join(home, path)), created);
      recovery.pending = { path: entry.path, displaced: path, content: entry.installed }; persist();
      renameSync(join(home, entry.path), join(home, path));
      recovery.pending = null; persist();
    }
    const settingsBytes = encode(nextSettings) === encode(config.value) ? config.bytes : Buffer.from(JSON.stringify(nextSettings, null, 2) + "\n");
    if (settingsBytes && !settingsBytes.equals(config.bytes ?? Buffer.alloc(0))) atomic(home, join(home, settingsPath), settingsBytes, config.mode, created);
    for (const p of pointers) if (p.next !== p.priorBytes?.toString("utf8")) atomic(home, join(home, p.path), p.next, p.mode, created);
    // Settings edited since the previous install make the original snapshot stale: uninstall
    // must then remove only the Tower hooks instead of restoring or deleting the file.
    const surgical = Boolean(prior && (prior.settings.surgical || (config.bytes?.toString("base64") ?? null) !== prior.settings.installed));
    const retiredPaths = new Set(retired.map(entry => entry.path));
    const record = { schema, entries, pointers: pointers.map(({ priorBytes, next, ...p }) => p), directories: [...created].filter(path => !retiredPaths.has(path)).sort(),
      settings: { original: prior ? prior.settings.original : config.bytes?.toString("base64") ?? null, originalMode: prior?.settings.originalMode ?? config.mode, installed: settingsBytes?.toString("base64") ?? null, surgical,
        hookDigests: Object.fromEntries(hooks.filter(h => added.includes(h.event)).map(h => [h.event, hash(encode({ matcher: h.matcher, hook: h.hook }))])), added } };
    atomic(home, join(home, manifestPath), encode(record), 0o600);
    for (const item of displaced) remove(home, join(home, item.path), item.content);
    if (!read(home, lock).equals(lockBytes)) fail("runtime lock ownership changed");
    unlinkSync(lock);
    return { status: "configured" };
  } catch (error) {
    throw new AggregateError([error], `runtime failure: ${error.message}; retained ownership recovery evidence in .runtime-lock`);
  }
}
function entryStatus(home, entry) {
  try { const actual = snapshot(home, join(home, entry.path), entry.installed.kind === "link"); return !actual ? "missing" : encode(actual) === encode(entry.installed) ? "ok" : "modified"; } catch { return "modified"; }
}
export function doctorRuntime({ home, runner = spawnSync, env = process.env }) {
  home = homeFor(home);
  const gentleAi = gentleAiVersion({ runner, env: { ...env, HOME: home } });
  let record; try { if (stat(join(home, share, ".runtime-lock"))) fail("runtime recovery evidence"); record = load(home); } catch { return { skills: "modified", radar: "modified", signatures: "modified", copiloto: "modified", piloto: "modified", pointers: "modified", gentleAi }; }
  const result = { skills: "missing", radar: "missing", signatures: "missing", copiloto: "missing", piloto: "missing", pointers: "missing", gentleAi };
  if (!record) return result;
  const aggregate = values => values.includes("modified") ? "modified" : values.includes("missing") || !values.length ? "missing" : "ok";
  for (const name of ["skills", "radar", "signatures", "copiloto", "piloto"]) result[name] = aggregate(record.entries.filter(e => e.component === name).map(e => entryStatus(home, e)));
  const expectedPointers = pointerPaths.filter(path => stat(join(home, dirname(path))));
  result.pointers = aggregate(expectedPointers.map(path => {
    const p = record.pointers.find(p => p.path === path); if (!p) return "missing";
    try { const bytes = read(home, join(home, p.path)); if (!bytes) return "missing"; const text = bytes.toString("utf8"), range = pointerRange(text); return !range ? "missing" : text.slice(range.begin, range.finish) === p.block ? "ok" : "modified"; } catch { return "modified"; }
  }));
  try {
    const value = settings(home).value;
    const statuses = hooks.map(({ event, matcher, hook }) => {
      const matches = (value.hooks?.[event] ?? []).flatMap(e => e.hooks.filter(h => h.command === hook.command).map(h => ({ e, h })));
      return !matches.length ? "missing" : matches.length === 1 && matches[0].e.matcher === matcher && isDeepStrictEqual(matches[0].h, hook) ? "ok" : "modified";
    });
    result.signatures = aggregate([result.signatures, ...statuses]);
  } catch { result.signatures = "modified"; }
  return result;
}
export function uninstallRuntime({ home }) {
  home = homeFor(home);
  if (stat(join(home, share, ".runtime-lock"))) fail("runtime lock or recovery evidence exists");
  const record = load(home); if (!record) return { status: "absent" };
  const config = settings(home), next = structuredClone(config.value);
  for (const entry of record.entries) {
    if (entryStatus(home, entry) === "modified") fail(`modified owned entry: ${entry.path}`);
    if (entry.backup && encode(snapshot(home, join(home, entry.backup.path), entry.backup.content.kind === "link")) !== encode(entry.backup.content)) fail("modified backup");
  }
  const pointerChanges = record.pointers.map(p => {
    const bytes = read(home, join(home, p.path)); if (!bytes) return { p, bytes: null };
    const text = bytes.toString("utf8"), range = pointerRange(text);
    if (!range || text.slice(range.begin, range.finish) !== p.block) fail("modified pointer");
    let begin = range.begin;
    if (!p.before && p.separator && text.slice(begin - p.separator.length, begin) === p.separator) begin -= p.separator.length;
    const finish = !p.before && p.suffix && text.slice(range.finish, range.finish + p.suffix.length) === p.suffix ? range.finish + p.suffix.length : range.finish;
    return { p, bytes: Buffer.from(text.slice(0, begin) + p.before + text.slice(finish)) };
  });
  for (const event of record.settings.added) {
    const registration = hooks.find(h => h.event === event); if (!registration) fail("invalid owned hook");
    const entries = next.hooks?.[event] ?? [];
    for (const entry of entries) for (const h of entry.hooks) if (h.command === registration.hook.command && (entry.matcher !== registration.matcher || !isDeepStrictEqual(h, registration.hook))) fail("modified owned hook");
    const remaining = entries.flatMap(entry => {
      const kept = entry.hooks.filter(h => h.command !== registration.hook.command);
      if (kept.length === entry.hooks.length) return [entry]; // Includes unrelated empty entries.
      if (kept.length || Object.keys(entry).some(key => !["matcher", "hooks"].includes(key))) return [{ ...entry, hooks: kept }];
      return [];
    });
    if (remaining.length) next.hooks[event] = remaining; else if (next.hooks) delete next.hooks[event];
  }
  if (next.hooks && !Object.keys(next.hooks).length) delete next.hooks;
  for (const entry of record.entries) {
    const target = join(home, entry.path), actual = snapshot(home, target, entry.installed.kind === "link");
    if (actual) remove(home, target, entry.installed);
    if (entry.backup) { directories(home, dirname(target)); renameSync(join(home, entry.backup.path), target); }
  }
  const identical = !record.settings.surgical && config.bytes?.toString("base64") === record.settings.installed;
  if (identical && record.settings.original === null) { if (config.bytes) unlinkSync(join(home, settingsPath)); }
  else if (identical) atomic(home, join(home, settingsPath), Buffer.from(record.settings.original, "base64"), record.settings.originalMode ?? config.mode);
  else if (encode(next) !== encode(config.value)) atomic(home, join(home, settingsPath), JSON.stringify(next, null, 2) + "\n", config.mode);
  for (const { p, bytes } of pointerChanges) {
    if (!bytes) continue;
    if (!p.existed && !bytes.length) unlinkSync(join(home, p.path)); else atomic(home, join(home, p.path), bytes, stat(join(home, p.path)).mode & 0o777);
  }
  unlinkSync(join(home, manifestPath));
  for (const path of [...record.directories].sort((a, b) => b.split("/").length - a.split("/").length)) {
    const target = join(home, path); safe(home, target);
    if (stat(target)?.isDirectory() && !readdirSync(target).length) rmdirSync(target);
  }
  return { status: "uninstalled" };
}
