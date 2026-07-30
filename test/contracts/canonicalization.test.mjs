import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { canonicalize, digestArtifact, parseStructured } from "../../contracts/canonicalize.mjs"

const fixtures = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../fixtures/contracts/canonicalization-v1.json"), "utf8"))
const errorCode = (operation) => { try { operation() } catch (error) { return error.code } return null }

describe("RFC 8785 canonicalization", () => {
  test("equivalent YAML and JSON documents have one digest", () => {
    const [yaml, json] = fixtures.equivalent
    const first = digestArtifact(yaml, "rfc8785-jcs")
    const second = digestArtifact(json, "rfc8785-jcs")
    expect(first).toEqual(second)
    expect(first).toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  test("orders object names by UTF-16 code units and emits RFC numbers", () => {
    expect(canonicalize(fixtures.utf16_order)).toBe('{"😀":"astral","":"bmp"}')
    expect(canonicalize(fixtures.rfc_number_sample)).toBe('{"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27]}')
    expect(canonicalize({ "€": "Euro Sign", "\r": "Carriage Return", "😀": "Emoji: Grinning Face", "1": "One", "\u0080": "Control", "ö": "Latin Small Letter O With Diaeresis" }))
      .toBe('{"\\r":"Carriage Return","1":"One","":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face"}')
  })

  test("raw mode hashes exact opaque bytes", () => {
    expect(digestArtifact(Buffer.from([0, 255, 10]), "raw-bytes"))
      .toBe("sha256:712450d3c4a79eea9509e75dc1dacdeff58034df538536cfae2da882bd8a0c50")
    expect(digestArtifact(Buffer.from("a\n"), "raw-bytes")).not.toBe(digestArtifact(Buffer.from("a\r\n"), "raw-bytes"))
    expect(digestArtifact(new Uint8Array([0, 255, 10]), "raw-bytes"))
      .toBe("sha256:712450d3c4a79eea9509e75dc1dacdeff58034df538536cfae2da882bd8a0c50")
    for (const value of ["bytes", { value: 1 }, null, 42]) {
      expect(errorCode(() => digestArtifact(value, "raw-bytes"))).toBe("CT_SCHEMA_INVALID")
    }
  })

  test("returns deeply immutable structured values and rejects cycles stably", () => {
    const parsed = parseStructured("nested:\n  values: [1, 2]\n")
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(parsed.nested)).toBe(true)
    expect(Object.isFrozen(parsed.nested.values)).toBe(true)

    const cyclic = { value: 1 }
    cyclic.self = cyclic
    expect(errorCode(() => parseStructured(cyclic))).toBe("CT_SCHEMA_INVALID")
    expect(errorCode(() => canonicalize(cyclic))).toBe("CT_SCHEMA_INVALID")
  })

  test("rejects forbidden YAML, unsafe values, and invalid Unicode", () => {
    for (const source of ["value: &x 1\ncopy: *x\n", "created: 2026-07-30\n", "unsafe: 9007199254740993\n"]) {
      expect(errorCode(() => parseStructured(source))).toBe("CT_SCHEMA_INVALID")
    }
    for (const value of [NaN, Infinity, 9007199254740992, undefined, 1n, "\ud800", { bad: undefined }]) {
      expect(errorCode(() => canonicalize(value))).toBe("CT_SCHEMA_INVALID")
    }
    expect(errorCode(() => canonicalize({ "\udc00": "invalid key" }))).toBe("CT_SCHEMA_INVALID")
    expect(errorCode(() => canonicalize(new Date("2026-07-30T00:00:00Z")))).toBe("CT_SCHEMA_INVALID")
  })
})
