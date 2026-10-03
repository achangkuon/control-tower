import { spawnSync } from "node:child_process";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { chmodSync, closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readSync, renameSync, writeFileSync } from "node:fs";
import { isAbsolute, join, parse, resolve, sep } from "node:path";

export const MAX_RELEASE_BYTES = 16 * 1024 * 1024;

const defaultRunner = (command, argv, { maxBuffer }) =>
  spawnSync(command, argv, { maxBuffer, timeout: 60_000, encoding: "buffer" });

function validOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options) || Object.getPrototypeOf(options) !== Object.prototype || Object.getOwnPropertySymbols(options).length) return false;
  const keys = Reflect.ownKeys(options).sort();
  const required = ["asset", "repository", "sha256", "tag"];
  if (JSON.stringify(keys) !== JSON.stringify(required) && JSON.stringify(keys) !== JSON.stringify([...required, "runner"].sort())) return false;
  if (keys.some((key) => !("value" in Object.getOwnPropertyDescriptor(options, key)))) return false;
  const { repository, tag, asset, sha256, runner } = options;
  const parts = typeof repository === "string" ? repository.split("/") : [];
  return [repository, tag, asset, sha256].every(value => typeof value === "string" && !/[\r\n]/.test(value)) &&
    parts.length === 2 && parts[0].length <= 100 && parts[1].length <= 100 &&
    /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(parts[0]) && !parts[0].endsWith("-") &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(parts[1]) && !parts[1].endsWith(".") &&
    typeof tag === "string" && tag.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(tag) &&
    !tag.includes("..") && !tag.endsWith(".") && tag.toLowerCase() !== "latest" &&
    typeof asset === "string" && asset.length <= 256 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(asset) &&
    !asset.includes("..") && !asset.endsWith(".") && !/^(?:install|setup)\.sh$/i.test(asset) &&
    typeof sha256 === "string" && /^[a-f0-9]{64}$/.test(sha256) &&
    (runner === undefined && !keys.includes("runner") || typeof runner === "function");
}

function execute(runner, argv, limit = MAX_RELEASE_BYTES) {
  let result;
  try {
    result = runner("gh", argv, { maxBuffer: limit + 1 });
  } catch {
    throw new Error("GitHub Release command failed");
  }
  if (!result || result.status !== 0 || !Buffer.isBuffer(result.stdout) || result.stdout.length > limit) throw new Error("GitHub Release command failed");
  return result.stdout;
}

const latestAsset = "tower-v1.json";
const TUI_LIMIT = 64 * 1024 * 1024;
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const tuiFailure = (reason, text) => { throw Object.assign(new Error(text), { tuiReason: reason }); };

export function tuiPlatformKey(platform = process.platform, arch = process.arch) {
  return ["linux", "darwin"].includes(platform) && ["x64", "arm64"].includes(arch) ?
    `${platform}-${arch === "x64" ? "amd64" : arch}` : null;
}

// Mirror the standalone install.mjs guards: that asset cannot import repository
// modules, and adding it to the engine envelope would change historical rosters.
function tuiDirectory(path, home, create = false) {
  let current = parse(path).root;
  for (const part of path.slice(current.length).split(sep)) {
    current = join(current, part);
    let stat;
    try { stat = lstatSync(current); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (!stat && create && (current === home || current.startsWith(home + sep))) {
      mkdirSync(current, { mode: 0o755 }); chmodSync(current, 0o755); stat = lstatSync(current);
    }
    if (!stat && !create) return false;
    if (!stat?.isDirectory() || stat.isSymbolicLink() ||
        (current === home || current.startsWith(home + sep)) && (stat.uid !== process.getuid() || stat.mode & 0o022)) {
      tuiFailure("unsafe", "Directorio de la interfaz inseguro; se conservó la interfaz anterior.");
    }
  }
  return true;
}
function tuiRead(path, limit) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || stat.mode & 0o022 || stat.size > limit) {
      tuiFailure("unsafe", "Archivo de la interfaz inseguro; se conservó la interfaz anterior.");
    }
    const bytes = Buffer.alloc(stat.size + 1), count = readSync(fd, bytes, 0, bytes.length, 0);
    if (count !== stat.size) tuiFailure("unsafe", "El archivo de la interfaz cambió durante la lectura.");
    return { bytes: bytes.subarray(0, count), mode: stat.mode & 0o7777 };
  } finally { closeSync(fd); }
}
function tuiChecksum(bytes, asset) {
  const sha256 = /^([a-f0-9]{64})  [^\n]+\n$/.exec(bytes.toString("ascii"))?.[1];
  if (!sha256 || !bytes.equals(Buffer.from(`${sha256}  ${asset}\n`))) {
    tuiFailure("checksum", "La huella SHA-256 publicada de la interfaz tiene un formato no válido; se conservó la interfaz anterior.");
  }
  return sha256;
}
function tuiCurrent(home, platform, sha256) {
  const store = join(home, ".local/share/torre-control/tui"), path = join(store, sha256, "torre-tui");
  if (!tuiDirectory(store, home)) return false;
  let record;
  try { record = JSON.parse(tuiRead(join(store, "current.json"), 4096).bytes.toString("utf8")); }
  catch (error) { if (error.code === "ENOENT" || error instanceof SyntaxError) return false; throw error; }
  if (record?.schema !== "tower.v1.tui/1" || Object.keys(record).sort().join() !== "path,platform,schema,sha256" ||
      record.sha256 !== sha256 || record.platform !== platform || record.path !== path || !tuiDirectory(join(store, sha256), home)) return false;
  try {
    const file = tuiRead(path, TUI_LIMIT);
    return file.mode === 0o755 && digest(file.bytes) === sha256;
  } catch (error) { if (error.code === "ENOENT") return false; throw error; }
}
function publishTui(bytes, sha256, platform, home) {
  // Verify at the write boundary, including local intake. Never publish from a
  // trusted-looking filename or record alone, nor alter the previous pointer first.
  if (!bytes.length || bytes.length > TUI_LIMIT || digest(bytes) !== sha256) {
    tuiFailure("mismatch", "La huella SHA-256 de la interfaz no coincide; se conservó la interfaz anterior. El motor sigue actualizado.");
  }
  const store = join(home, ".local/share/torre-control/tui"), directory = join(store, sha256);
  tuiDirectory(directory, home, true);
  const path = join(directory, "torre-tui");
  let existing;
  try { existing = tuiRead(path, TUI_LIMIT); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing) {
    if (digest(existing.bytes) !== sha256 || existing.mode !== 0o755) tuiFailure("unsafe", "El binario de la interfaz existente fue alterado; no se reemplazó la interfaz anterior.");
  } else {
    writeFileSync(path, bytes, { flag: "wx", mode: 0o755 }); chmodSync(path, 0o755);
  }
  // Verify the installed bytes before activation, not just the download buffer.
  const installed = tuiRead(path, TUI_LIMIT);
  if (installed.mode !== 0o755 || digest(installed.bytes) !== sha256) tuiFailure("unsafe", "No se pudo verificar la interfaz instalada.");
  const current = join(store, "current.json");
  try { tuiRead(current, 4096); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const next = join(store, `.current-${randomUUID()}`);
  writeFileSync(next, JSON.stringify({ schema: "tower.v1.tui/1", sha256, path, platform }), { flag: "wx", mode: 0o644 });
  chmodSync(next, 0o644); renameSync(next, current);
  // Retain prior content-addressed binaries, as in the standalone installer.
}

/** Best-effort second lifecycle, invoked only after engine success. Uses the same
 * pinned tag as the engine, with S199's published same-origin checksum trust.
 * Missing legacy assets are silent; verification/safety errors are Spanish warnings.
 */
export function updateTui({ home, repository, tag, runner = defaultRunner, checkout,
  platform = process.platform, arch = process.arch, stderr = process.stderr }) {
  const key = tuiPlatformKey(platform, arch);
  if (!key) return "unavailable:platform";
  try {
    if (!isAbsolute(home ?? "") || resolve(home) !== home || home === parse(home).root || /[\0\r\n\\]/.test(home)) {
      tuiFailure("unsafe", "HOME de la interfaz no es seguro.");
    }
    const asset = `torre-tui-${key}`;
    let checksum;
    const download = (name, limit) => execute(runner, ["release", "download", tag, "--repo", repository,
      "--pattern", name, "--output", "-"], limit);
    if (checkout) {
      if (!tuiDirectory(checkout, home)) return "unavailable:checkout";
      try { checksum = tuiRead(join(checkout, asset + ".sha256"), 1024).bytes; }
      catch (error) { if (error.code === "ENOENT") return "unavailable:checkout"; throw error; }
    } else {
      if (!validOptions({ repository, tag, asset, sha256: "0".repeat(64), runner })) throw new TypeError("Invalid TUI acquisition options");
      try { checksum = download(asset + ".sha256", 1024); } catch { return "unavailable:assets"; }
    }
    const sha256 = tuiChecksum(checksum, asset);
    if (tuiCurrent(home, key, sha256)) return "unchanged";
    let bytes;
    if (checkout) {
      try { bytes = tuiRead(join(checkout, asset), TUI_LIMIT).bytes; }
      catch (error) { if (error.code === "ENOENT") return "unavailable:checkout"; throw error; }
    } else {
      try { bytes = download(asset, TUI_LIMIT); } catch { return "unavailable:download"; }
    }
    publishTui(bytes, sha256, key, home);
    return "updated";
  } catch (error) {
    // No engine rollback or nonzero exit: it already completed successfully.
    stderr.write(`Interfaz no actualizada: ${error.tuiReason ? error.message : "No se pudo instalar la interfaz; se conservó la anterior."}\n`);
    return `unavailable:${error.tuiReason ?? "install"}`;
  }
}

/** Authenticated same-origin checksum trust is explicit for automatic updates.
 * Discover once, pin that exact tag, and verify raw package bytes before returning.
 * No filesystem effects or interpretation of package contents occur here.
 */
export function acquireLatestRelease(options) {
  const allowed = ["repository", "installedTag", "runner"];
  if (!options || Object.getPrototypeOf(options) !== Object.prototype ||
      Object.getOwnPropertySymbols(options).length || Reflect.ownKeys(options).some(key =>
        !allowed.includes(key) || !("value" in Object.getOwnPropertyDescriptor(options, key)))) {
    throw new TypeError("Invalid latest GitHub Release options");
  }
  const { repository, installedTag = null, runner = defaultRunner } = options;
  const identity = { repository, tag: installedTag ?? "v1", asset: latestAsset, sha256: "0".repeat(64), runner };
  if (!validOptions(identity)) throw new TypeError("Invalid latest GitHub Release options");
  execute(runner, ["auth", "status", "--active", "--hostname", "github.com"]);
  const metadata = execute(runner, ["release", "view", "--repo", repository, "--json", "tagName"], 1024);
  let tag;
  try { tag = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(metadata)).tagName; } catch {}
  if (!validOptions({ ...identity, tag })) throw new Error("La última release tiene una etiqueta de versión no válida.");
  if (tag === installedTag) return Object.freeze({ status: "up-to-date", tag });
  let checksum;
  try {
    checksum = execute(runner, ["release", "download", tag, "--repo", repository,
      "--pattern", latestAsset + ".sha256", "--output", "-"], 1024);
  } catch {
    throw new Error("No se pudo descargar la huella SHA-256 (tower-v1.json.sha256). La release debe publicarla; no se cambió la instalación.");
  }
  // Exact ASCII sha256sum shape: one lower-case digest, two spaces, exact name, LF.
  const match = /^([a-f0-9]{64})  tower-v1\.json\n$/.exec(checksum.toString("ascii"));
  if (!match || !checksum.equals(Buffer.from(`${match[1]}  ${latestAsset}\n`))) {
    throw new Error("La huella SHA-256 publicada tiene un formato no válido; no se cambió la instalación.");
  }
  const sha256 = match[1];
  const bytes = acquireVerifiedRelease({ repository, tag, asset: latestAsset, sha256, runner });
  return Object.freeze({ status: "available", tag, asset: latestAsset, sha256, bytes });
}

// The manual caller supplies a SHA-256 obtained independently of the release download.
// No asset decoding, parsing, or filesystem writes occur here.
export function acquireVerifiedRelease(options) {
  if (!validOptions(options)) throw new TypeError("Invalid GitHub Release acquisition options");
  const { repository, tag, asset, sha256, runner = defaultRunner } = options;
  execute(runner, ["auth", "status", "--active", "--hostname", "github.com"]);
  const bytes = execute(runner, ["release", "download", tag, "--repo", repository, "--pattern", asset, "--output", "-"]);
  if (bytes.length === 0 || bytes.length > MAX_RELEASE_BYTES) throw new Error("Invalid GitHub Release asset size");
  const actual = createHash("sha256").update(bytes).digest();
  if (!timingSafeEqual(actual, Buffer.from(sha256, "hex"))) throw new Error("GitHub Release SHA-256 mismatch");
  return Buffer.from(bytes);
}
