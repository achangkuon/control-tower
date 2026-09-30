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
  return parts.length === 2 && parts[0].length <= 100 && parts[1].length <= 100 &&
    /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(parts[0]) && !parts[0].endsWith("-") &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(parts[1]) && !parts[1].endsWith(".") &&
    typeof tag === "string" && tag.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(tag) &&
    !tag.includes("..") && !tag.endsWith(".") && tag.toLowerCase() !== "latest" &&
    typeof asset === "string" && asset.length <= 256 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(asset) &&
    !asset.includes("..") && !asset.endsWith(".") && !/^(?:install|setup)\.sh$/i.test(asset) &&
    typeof sha256 === "string" && /^[a-f0-9]{64}$/.test(sha256) &&
    (runner === undefined && !keys.includes("runner") || typeof runner === "function");
}

function execute(runner, argv) {
  let result;
  try {
    result = runner("gh", argv, { maxBuffer: MAX_RELEASE_BYTES + 1 });
  } catch {
    throw new Error("GitHub Release command failed");
  }
  if (!result || result.status !== 0 || !Buffer.isBuffer(result.stdout) || result.stdout.length > MAX_RELEASE_BYTES) throw new Error("GitHub Release command failed");
  return result.stdout;
}

// The caller supplies a SHA-256 obtained independently of the release download.
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
