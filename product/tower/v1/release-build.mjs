#!/usr/bin/env bun
import * as childProcess from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, fchmodSync, lstatSync, openSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { BUNDLE_MEMBERS } from "./bundle.mjs";
import { bootstrapVerifiedRelease } from "./bootstrap.mjs";
import { MAX_RELEASE_BYTES } from "./release.mjs";

const defaultRepo = fileURLToPath(new URL("../../../", import.meta.url));
const memberLimit = 1024 * 1024;
const aggregateLimit = 8 * memberLimit;
const optionNames = ["repo", "commit", "out"];
// ASCII paths: default sort is bytewise, never locale-sensitive. Serialization key order
// is schema,members and path,type,encoding,byteLength,sha256,bytes; no timestamps/newline.
const paths = [...new Set([...BUNDLE_MEMBERS.map(({ source }) => source), ...[
  "adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli",
].map((name) => `product/tower/v1/${name}.mjs`)])].sort();
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (reason) => { throw new Error(reason); };

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

/** Build from immutable commit-tree blobs; bootstrap is the final wire-format authority.
 * No network, working-file reads, Git mutations, or filesystem writes before admission.
 * Returns the receipt; only main prints it. The output parent must already exist.
 */
export function buildRelease(options) {
  if (!options || typeof options !== "object" || Array.isArray(options) ||
      Object.keys(options).some((key) => !optionNames.includes(key))) fail("invalid build options");
  const { repo = defaultRepo, commit = "HEAD", out } = options;
  if (typeof repo !== "string" || !repo || typeof commit !== "string" || !commit ||
      commit.startsWith("-") || /[\0\r\n]/.test(commit)) fail("invalid repository or commit");
  const root = realpathSync(resolve(repo));
  if (git(root, ["rev-parse", "--show-toplevel"]).toString("utf8").trim() !== root) fail("repo must be a worktree root");
  const target = outputPath(out, root);
  clean(root);
  const sha = git(root, ["rev-parse", "--verify", "--end-of-options", `${commit}^{commit}`]).toString("utf8").trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(sha)) fail("git returned an invalid commit");
  const entries = new Map();
  const tree = git(root, ["ls-tree", "-rlz", "--full-tree", sha, "--", ...paths]).toString("utf8");
  for (const record of tree.split("\0").filter(Boolean)) {
    const match = record.match(/^(100644|100755) blob [a-f0-9]+ +([0-9]+)\t(.+)$/);
    if (!match || !paths.includes(match[3]) || entries.has(match[3])) fail("release member is not a regular file");
    entries.set(match[3], Number(match[2]));
  }
  let aggregate = 0;
  for (const path of paths) {
    const size = entries.get(path);
    if (size === undefined) fail(`missing release member: ${path}`);
    if (!Number.isSafeInteger(size) || size < 0 || size > memberLimit) fail(`release member size limit: ${path}`);
    if ((aggregate += size) > aggregateLimit) fail("release aggregate size limit");
  }
  const members = paths.map((path) => {
    const bytes = git(root, ["show", `${sha}:${path}`]);
    if (bytes.length !== entries.get(path)) fail(`release member size divergence: ${path}`);
    return { path, type: "file", encoding: "base64", byteLength: bytes.length,
      sha256: digest(bytes), bytes: bytes.toString("base64") };
  });
  const bytes = Buffer.from(JSON.stringify({ schema: "tower.v1.release/1", members }));
  if (bytes.length > MAX_RELEASE_BYTES) fail("release encoded size limit");
  const sha256 = digest(bytes);
  bootstrapVerifiedRelease({ repository: "example/control-tower", tag: "v1", asset: "tower-v1.json", sha256,
    runner: (_command, argv) => ({ status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : bytes }) });
  clean(root);
  const fd = openSync(target, "wx", 0o644);
  try { writeFileSync(fd, bytes); fchmodSync(fd, 0o644); } finally { closeSync(fd); }
  return { schema: "tower.v1.release-build/1", commit: sha, asset: basename(out), bytes: bytes.length, sha256 };
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
    const message = String(error?.message ?? error).split(/[\r\n\u2028\u2029]/, 1)[0].slice(0, 440);
    stderr.write(`Invalid Tower release build: ${message || "operation failed"}\n`);
    return 1;
  }
}
if (import.meta.main) process.exitCode = main(process.argv.slice(2));
