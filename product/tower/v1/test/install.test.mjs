import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BUNDLE_MEMBERS } from "../bundle.mjs";
import { main } from "../install.mjs";
import { stampInstaller } from "../release-build.mjs";

const paths = [...BUNDLE_MEMBERS.map(({ source }) => source), ...[
  "adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli",
].map((name) => `product/tower/v1/${name}.mjs`)].sort();
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function envelope() {
  return { schema: "tower.v1.release/1", members: paths.map((path) => {
    const bytes = Buffer.from("// verified fixture\n");
    return { path, type: "file", encoding: "base64", byteLength: bytes.length,
      bytes: bytes.toString("base64"), sha256: digest(bytes) };
  }) };
}
function fixture(run, mutate = () => {}, overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "tower-install-test-"));
  const oldMask = process.umask(), calls = [];
  try {
    const manifest = envelope(); mutate(manifest);
    const bytes = Buffer.from(JSON.stringify(manifest));
    const pinned = { repository: "achangkuon/control-tower", tag: "v1.0.1", asset: "tower-v1.json",
      sha256: digest(bytes), paths, ...overrides };
    let stdout = "", stderr = "";
    const deps = { pinned, tempRoot: root, stdout: { write: (text) => { stdout += text; } },
      stderr: { write: (text) => { stderr += text; } }, runner: (command, argv, options) => {
        calls.push([command, argv, options]);
        if (argv[0] === "release") return { status: 0, stdout: bytes };
        if (argv[1] === "install") {
          expect(process.umask()).toBe(0o022);
          expect(lstatSync(options.cwd).mode & 0o777).toBe(0o700);
          for (const member of manifest.members) expect(readFileSync(join(options.cwd, member.path))).toEqual(Buffer.from(member.bytes, "base64"));
        }
        return { status: 0, stdout: Buffer.from("1.3.0\n") };
      } };
    return run({ root, calls, deps, output: () => ({ stdout, stderr }) });
  } finally { process.umask(oldMask); rmSync(root, { recursive: true, force: true }); }
}

test("unstamped source and unknown flags refuse before any command", () => {
  const deps = { runner: () => { throw new Error("must not run"); }, stderr: { write() {} } };
  expect(main([], deps)).toBe(1);
  fixture(({ deps, calls, output }) => {
    expect(main(["--latest"], deps)).toBe(1); expect(calls).toHaveLength(0);
    expect(output().stderr).toContain("arguments");
  });
});
test("verified extraction hands exact pins to S174, inherits stdio, cleans and prints next steps", () => fixture(({ deps, calls, output }) => {
  process.umask(0o077);
  expect(main([], deps)).toBe(0);
  expect(process.umask()).toBe(0o077);
  expect(calls.map(([command]) => command)).toEqual(["gh", "bun", "git", "go", "gh", "bun"]);
  expect(calls[0][1]).toEqual(["auth", "status", "--active", "--hostname", "github.com"]);
  expect(calls[4][1]).toEqual(["release", "download", "v1.0.1", "--repo", deps.pinned.repository, "--pattern", "tower-v1.json", "--output", "-"]);
  expect(calls[5][1].slice(1)).toEqual(["install", "--tag", "v1.0.1", "--asset", "tower-v1.json", "--sha256", deps.pinned.sha256]);
  expect(calls[5][2].stdio).toBe("inherit");
  expect(existsSync(calls[5][2].cwd)).toBe(false);
  expect(calls.every(([, , options]) => options.timeout > 0 && options.timeout <= 180_000)).toBe(true);
  expect(output().stdout).toContain('export PATH="$HOME/.local/bin:$PATH"');
  expect(output().stdout).toContain("--trust trusted"); expect(output().stdout).toContain("pi --approve");
}));
test("canonicalizes symlinked TMPDIR (macOS /var) and removes intake even on parse failure", () => fixture(({ root, deps, calls }) => {
  symlinkSync(root, join(root, "alias")); deps.tempRoot = join(root, "alias");
  expect(main(["--dry-run"], deps)).toBe(0);
  expect(calls[4][2].cwd.startsWith(realpathSync(root) + "/torre-install-")).toBe(true);
  const original = deps.runner, malformed = Buffer.from("not JSON"); deps.pinned.sha256 = digest(malformed);
  deps.runner = (command, argv, options) => argv[0] === "release" ? { status: 0, stdout: malformed } : original(command, argv, options);
  expect(main([], deps)).toBe(1); expect(readdirSync(root)).toEqual(["alias"]);
}));
test("dry-run skips install; nonzero install status is propagated without success message", () => fixture(({ deps, calls, output }) => {
  expect(main(["--dry-run"], deps)).toBe(0); expect(calls).toHaveLength(5);
  const original = deps.runner;
  deps.runner = (command, argv, options) => argv[1] === "install" ? { status: 7 } : original(command, argv, options);
  expect(main([], deps)).toBe(7); expect(output().stdout).not.toContain("project init");
}));
test("names every missing prerequisite with macOS/Linux guidance and authentication hint", () => {
  for (const missing of ["gh", "bun", "git", "go"]) fixture(({ deps, output }) => {
    const original = deps.runner;
    deps.runner = (command, ...args) => command === missing ? { status: 1 } : original(command, ...args);
    expect(main([], deps)).toBe(1);
    expect(output().stderr).toContain(missing); expect(output().stderr).toContain("brew");
    expect(output().stderr).toContain("Linux");
    if (missing === "gh") expect(output().stderr).toContain("gh auth login");
  });
});
test("rejects checksum before JSON parsing, oversized/failed downloads, malformed envelope and members", () => {
  fixture(({ deps, output }) => { expect(main([], deps)).toBe(1); expect(output().stderr).toContain("SHA-256"); }, () => {}, { sha256: "0".repeat(64) });
  for (const result of [{ status: 1 }, { status: null, error: new Error("timeout") },
    { status: 0, stdout: Buffer.alloc(16 * 1024 * 1024 + 1) }, { status: 0, stdout: Buffer.alloc(0) }]) {
    fixture(({ deps }) => { const original = deps.runner;
      deps.runner = (command, argv, options) => argv[0] === "release" ? result : original(command, argv, options);
      expect(main([], deps)).toBe(1);
    });
  }
  for (const mutate of [e => { e.schema = "wrong"; }, e => { e.members.pop(); },
    e => { e.members[0].path = "/absolute"; }, e => { e.members[0].path = "product/tower/v1/../cli.mjs"; },
    e => { e.members[0].path = "product/tower/v1/extra.mjs"; }, e => { e.members[0].path = e.members[1].path; },
    e => { e.members[0].sha256 = "0".repeat(64); }, e => { e.members[0].bytes = "!!!!"; },
    e => { e.members[0].byteLength = 1024 * 1024 + 1; }]) fixture(({ deps, calls }) => {
      expect(main([], deps)).toBe(1); expect(calls).toHaveLength(5);
    }, mutate);
});
test("standalone stamped asset runs offline dry-run with fake gh and disposable HOME", () => fixture(({ root, deps }) => {
  const bin = join(root, "bin"), home = join(root, "home"); mkdirSync(bin); mkdirSync(home);
  const asset = join(root, "tower-v1.json"), installer = join(root, "torre-install.mjs");
  writeFileSync(asset, JSON.stringify(envelope()));
  writeFileSync(installer, stampInstaller(readFileSync(new URL("../install.mjs", import.meta.url), "utf8"), deps.pinned));
  writeFileSync(join(bin, "gh"), `#!${process.execPath}\nimport {readFileSync} from 'node:fs';\nif(process.argv[2]==='release') process.stdout.write(readFileSync(${JSON.stringify(asset)}));\n`, { mode: 0o755 });
  const proxy = join(process.cwd(), "test/helpers/bin");
  const path = [proxy, bin, ...process.env.PATH.split(":").filter(entry => entry !== proxy)].join(":");
  const result = spawnSync(process.execPath, [installer, "--dry-run"], { timeout: 20_000, maxBuffer: 1024 * 1024,
    env: { ...process.env, HOME: home, TMPDIR: root, PATH: path } });
  expect(result.error).toBeUndefined(); expect(result.stderr.toString()).toBe(""); expect(result.status).toBe(0);
  expect(result.stdout.toString()).toContain("dry-run"); expect(existsSync(join(home, ".local"))).toBe(false);
}), 25_000);
