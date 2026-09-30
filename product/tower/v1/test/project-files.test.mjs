import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { captureProjectFiles, compareProjectFiles, restoreProjectFiles, validateProjectFiles } from "../project-files.mjs";

function fixture(fn) {
  const base = mkdtempSync(join(tmpdir(), "tower-files-"));
  const root = join(base, "project");
  mkdirSync(root);
  try { return fn(root, base); } finally { rmSync(base, { recursive: true, force: true }); }
}
function put(root, path, bytes = "original", mode = 0o640) {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, bytes, { mode });
  chmodSync(full, mode);
}
const mode = (path) => lstatSync(path).mode & 0o7777;
const clone = (value) => JSON.parse(JSON.stringify(value));

describe("project file snapshots", () => {
  test("absent, file and complete directory round-trip binary bytes, modes and stable ordering", () => fixture((root) => {
    put(root, "file", Buffer.from([0, 255, 1]), 0o600);
    put(root, "dir/z", Buffer.from([2, 0]), 0o444);
    put(root, "dir/a", "a", 0o644);
    chmodSync(join(root, "dir"), 0o750);
    const snapshot = captureProjectFiles(root, ["dir", "missing/path", "file"]);
    expect(validateProjectFiles(clone(snapshot))).toBe(true);
    expect(snapshot.destinations.map((entry) => entry.path)).toEqual(["dir", "file", "missing/path"]);
    expect(captureProjectFiles(root, ["file", "dir", "missing/path"])).toEqual(snapshot);
    expect(compareProjectFiles(root, snapshot)).toBe(true);
    put(root, "missing/path", "new");
    put(root, "dir/extra", "new");
    put(root, "file", "changed");
    expect(compareProjectFiles(root, snapshot)).toBe(false);
    restoreProjectFiles(root, clone(snapshot));
    expect(compareProjectFiles(root, snapshot)).toBe(true);
    expect(readFileSync(join(root, "file"))).toEqual(Buffer.from([0, 255, 1]));
    expect(readFileSync(join(root, "dir/z"))).toEqual(Buffer.from([2, 0]));
    expect(mode(join(root, "file"))).toBe(0o600);
    expect(mode(join(root, "dir"))).toBe(0o750);
    expect(mode(join(root, "dir/z"))).toBe(0o444);
    expect(existsSync(join(root, "missing"))).toBe(false);
  }));

  test("only absent ancestors that remain empty are removed; unknown siblings survive", () => fixture((root) => {
    const snapshot = captureProjectFiles(root, ["new/target", "other/target"]);
    put(root, "new/target", "installed");
    put(root, "new/sibling", "keep");
    put(root, "other/target", "installed");
    restoreProjectFiles(root, snapshot);
    expect(readFileSync(join(root, "new/sibling"), "utf8")).toBe("keep");
    expect(existsSync(join(root, "new/target"))).toBe(false);
    expect(existsSync(join(root, "other"))).toBe(false);
  }));

  test("rejects invalid paths, duplicate or overlapping destinations and unsafe roots", () => fixture((root, base) => {
    for (const path of ["", ".", "..", "/absolute", "a/../b", "a//b", "./a", "a\\b", "C:foo", "a/\0b"]) {
      expect(() => captureProjectFiles(root, [path])).toThrow();
    }
    for (const paths of [["a", "a"], ["a", "a/b"]]) expect(() => captureProjectFiles(root, paths)).toThrow();
    expect(() => captureProjectFiles("relative", ["a"])).toThrow();
    expect(() => captureProjectFiles(join(base, "missing"), ["a"])).toThrow();
    symlinkSync(root, join(base, "link"), "dir");
    expect(() => captureProjectFiles(join(base, "link"), ["a"])).toThrow();
    expect(() => restoreProjectFiles(join(base, "link"), captureProjectFiles(root, ["a"]))).toThrow();
  }));

  test("intervening lexicographic destinations cannot hide overlapping ancestor paths", () => fixture((root) => {
    expect(() => captureProjectFiles(root, ["a", "a-", "a/b"])).toThrow();
    const snapshot = captureProjectFiles(root, ["a", "a-"]);
    const overlap = { ...snapshot, destinations: [...snapshot.destinations,
      { path: "a/b", absentAncestors: ["a"], tree: { type: "absent" } }] };
    expect(() => validateProjectFiles(overlap)).toThrow();
    put(root, "a-", "untouched");
    expect(() => restoreProjectFiles(root, overlap)).toThrow();
    expect(readFileSync(join(root, "a-"), "utf8")).toBe("untouched");
  }));

  test("comparison ignores object key insertion order at every snapshot level", () => fixture((root) => {
    put(root, "tree/leaf", Buffer.from([0, 255]));
    const snapshot = captureProjectFiles(root, ["missing/leaf", "tree"]);
    const reverseKeys = (value) => Array.isArray(value) ? value.map(reverseKeys) :
      value && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse().map(
        ([key, item]) => [key, reverseKeys(item)])) : value;
    const reordered = reverseKeys(snapshot);
    expect(validateProjectFiles(reordered)).toBe(true);
    expect(compareProjectFiles(root, reordered)).toBe(true);
  }));

  test("schema, path, structural and digest tampering fail before any mutation", () => fixture((root) => {
    put(root, "safe", "original");
    const snapshot = captureProjectFiles(root, ["safe", "absent/target"]);
    put(root, "safe", "installed");
    const bad = [
      { ...snapshot, schema: "unknown" },
      { ...snapshot, extra: true },
      { ...snapshot, destinations: [{ ...snapshot.destinations[0], path: "../escape" }, snapshot.destinations[1]] },
      { ...snapshot, destinations: snapshot.destinations.map((d) => d.path === "safe" ? { ...d, tree: { ...d.tree, sha256: "0".repeat(64) } } : d) },
      { ...snapshot, destinations: snapshot.destinations.map((d) => d.path === "safe" ? { ...d, tree: { ...d.tree, bytes: "!!!" } } : d) },
    ];
    for (const tampered of bad) {
      expect(() => restoreProjectFiles(root, tampered)).toThrow();
      expect(readFileSync(join(root, "safe"), "utf8")).toBe("installed");
    }
  }));

  test("rejects symlink ancestors and members, hardlinks, and file ancestor obstruction", () => fixture((root) => {
    put(root, "source");
    symlinkSync("source", join(root, "link"));
    expect(() => captureProjectFiles(root, ["link"])).toThrow();
    expect(() => captureProjectFiles(root, ["link/child"])).toThrow();
    mkdirSync(join(root, "tree"));
    symlinkSync("../source", join(root, "tree/member"));
    expect(() => captureProjectFiles(root, ["tree"])).toThrow();
    linkSync(join(root, "source"), join(root, "hard"));
    expect(() => captureProjectFiles(root, ["source"])).toThrow();
    expect(() => captureProjectFiles(root, ["hard"])).toThrow();
    put(root, "blocked");
    expect(() => captureProjectFiles(root, ["blocked/child"])).toThrow();
    const snapshot = captureProjectFiles(root, ["clear/child"]);
    put(root, "clear/child", "untouched");
    symlinkSync("source", join(root, "unsafe"));
    expect(() => restoreProjectFiles(root, { ...snapshot, destinations: [...snapshot.destinations, { ...snapshot.destinations[0], path: "unsafe" }] })).toThrow();
    expect(readFileSync(join(root, "clear/child"), "utf8")).toBe("untouched");
  }));

  test("rejects unsafe live member before restoring any other destination", () => fixture((root) => {
    const snapshot = captureProjectFiles(root, ["a", "z"]);
    put(root, "a", "keep");
    symlinkSync("a", join(root, "z"));
    expect(() => restoreProjectFiles(root, snapshot)).toThrow();
    expect(readFileSync(join(root, "a"), "utf8")).toBe("keep");
  }));

  test("malformed directory trees, modes, absent ancestors and unreadable entries are rejected", () => fixture((root) => {
    put(root, "tree/leaf", "original");
    const snapshot = captureProjectFiles(root, ["tree", "new/leaf"]);
    const mutated = (path, tree) => ({ ...snapshot, destinations: snapshot.destinations.map((entry) =>
      entry.path === path ? { ...entry, tree } : entry) });
    const tree = snapshot.destinations.find((entry) => entry.path === "tree").tree;
    for (const tampered of [
      mutated("tree", { ...tree, mode: -1 }),
      mutated("tree", { ...tree, entries: [...tree.entries, tree.entries[0]] }),
      mutated("tree", { ...tree, entries: [{ name: "../escape", tree: tree.entries[0].tree }] }),
      mutated("tree", { ...tree, entries: [{ name: "leaf", tree: { type: "absent" } }] }),
      { ...snapshot, destinations: snapshot.destinations.map((entry) => entry.path === "new/leaf" ?
        { ...entry, absentAncestors: ["elsewhere"] } : entry) },
    ]) expect(() => restoreProjectFiles(root, tampered)).toThrow();
    expect(readFileSync(join(root, "tree/leaf"), "utf8")).toBe("original");
    chmodSync(join(root, "tree/leaf"), 0o000);
    expect(() => captureProjectFiles(root, ["tree"])).toThrow();
  }));

  test("restoration rejects obstructed ancestors and hardlinks before changing other targets", () => fixture((root) => {
    const snapshot = captureProjectFiles(root, ["a", "z/child"]);
    put(root, "a", "keep");
    put(root, "z", "obstruction");
    expect(() => restoreProjectFiles(root, snapshot)).toThrow();
    expect(readFileSync(join(root, "a"), "utf8")).toBe("keep");
    rmSync(join(root, "z"));
    linkSync(join(root, "a"), join(root, "linked"));
    expect(() => restoreProjectFiles(root, snapshot)).toThrow();
    expect(readFileSync(join(root, "a"), "utf8")).toBe("keep");
  }));

  test("FIFO members fail closed when mkfifo is available", () => fixture((root) => {
    const fifo = join(root, "fifo");
    const result = spawnSync("mkfifo", [fifo]);
    if (result.error?.code === "ENOENT" || result.status !== 0) return;
    expect(() => captureProjectFiles(root, ["fifo"])).toThrow();
  }));
});
