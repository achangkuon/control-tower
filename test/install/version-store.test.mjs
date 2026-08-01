import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { readActivePointer, replaceActivePointer, rollbackActivePointer } from "../../install/active-pointer.mjs"
import { denyV2Only, storeVersion } from "../../install/version-store.mjs"

const roots = []
const fixture = () => { const root = mkdtempSync(join(tmpdir(), "ct-version-")); roots.push(root); return root }
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

describe("immutable version store", () => {
  test("stores a version once and preserves old versions", () => {
    const root = fixture()
    expect(storeVersion(root, "1.0.0", { "runtime.mjs": "one\n" }).created).toBe(true)
    expect(storeVersion(root, "1.0.0", { "runtime.mjs": "one\n" }).created).toBe(false)
    storeVersion(root, "1.1.0", { "runtime.mjs": "two\n" })
    expect(readFileSync(join(root, "versions/1.0.0/runtime.mjs"), "utf8")).toBe("one\n")
    expect(readFileSync(join(root, "versions/1.1.0/runtime.mjs"), "utf8")).toBe("two\n")
  })

  test("rejects traversal and changed bytes for an existing version", () => {
    const root = fixture()
    storeVersion(root, "1.0.0", { "runtime.mjs": "one" })
    expect(() => storeVersion(root, "1.0.0", { "runtime.mjs": "changed" })).toThrow("CT_VERSION_IMMUTABLE")
    expect(() => storeVersion(root, "../escape", { "runtime.mjs": "bad" })).toThrow("CT_VERSION_INVALID")
  })

  test("rejects invalid members before creating a version root", () => {
    const root = fixture()
    expect(() => storeVersion(root, "1.0.0", { "../escape": "bad" })).toThrow("CT_VERSION_PATH_INVALID")
    expect(existsSync(join(root, "versions"))).toBe(false)
  })

  test("does not include a supplied manifest in the immutable digest", () => {
    const root = fixture()
    storeVersion(root, "1.0.0", { "runtime.mjs": "one", ".manifest": "ignored" })
    expect(() => storeVersion(root, "1.0.0", { "runtime.mjs": "one", ".manifest": "different" })).not.toThrow()
  })
})

describe("validated atomic active pointer", () => {
  test("advances and rolls back while retaining pointer history", () => {
    const root = fixture()
    storeVersion(root, "1.0.0", { "runtime.mjs": "one" })
    storeVersion(root, "1.1.0", { "runtime.mjs": "two" })
    replaceActivePointer(root, "1.0.0")
    replaceActivePointer(root, "1.1.0")
    expect(readActivePointer(root)).toEqual({ version: "1.1.0", previous: "1.0.0" })
    expect(rollbackActivePointer(root)).toEqual({ version: "1.0.0", previous: "1.1.0" })
  })

  test("keeps the old pointer when temp write, fsync, or rename fails", () => {
    for (const failAt of ["temp", "fsync", "rename"]) {
      const root = fixture()
      storeVersion(root, "1.0.0", { "runtime.mjs": "one" })
      storeVersion(root, "1.1.0", { "runtime.mjs": "two" })
      replaceActivePointer(root, "1.0.0")
      expect(() => replaceActivePointer(root, "1.1.0", { failAt })).toThrow(`CT_POINTER_${failAt.toUpperCase()}_FAILED`)
      expect(readActivePointer(root)).toEqual({ version: "1.0.0", previous: null })
    }
  })

  test("denies V2 automation without changing the pointer", () => {
    const root = fixture()
    storeVersion(root, "1.0.0", { "runtime.mjs": "one" })
    replaceActivePointer(root, "1.0.0")
    expect(() => denyV2Only("launch-worker")).toThrow("CT_V2_ONLY")
    expect(readActivePointer(root).version).toBe("1.0.0")
  })
})
