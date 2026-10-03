import { spawnSync } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";

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
