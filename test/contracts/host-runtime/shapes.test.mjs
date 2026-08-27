import { describe, expect, test } from "bun:test"
import {
  createHostRuntimeIdentifier,
  hostRuntimeSchemaNames,
  validateHostRuntimeBinding,
  validateHostRuntimeIdentity,
  validateHostRuntimeIncarnation,
  validateHostRuntimeProcess,
  validateHostRuntimeWorktree,
} from "../../../contracts/host-runtime/index.mjs"

const hex = "0123456789abcdef0123456789abcdef"
const ids = Object.freeze({
  runtime_id: `ct_runtime_${hex}`,
  worktree_id: `ct_worktree_${hex}`,
  process_id: `ct_process_${hex}`,
  incarnation_id: `ct_incarnation_${hex}`,
  binding_id: `ct_binding_${hex}`,
})
const cases = [
  ["identity", validateHostRuntimeIdentity, { schema_version: "control-tower.host-runtime.identity/v1", runtime_id: ids.runtime_id }],
  ["worktree", validateHostRuntimeWorktree, { schema_version: "control-tower.host-runtime.worktree/v1", worktree_id: ids.worktree_id }],
  ["process", validateHostRuntimeProcess, { schema_version: "control-tower.host-runtime.process/v1", process_id: ids.process_id }],
  ["incarnation", validateHostRuntimeIncarnation, { schema_version: "control-tower.host-runtime.incarnation/v1", incarnation_id: ids.incarnation_id }],
  ["binding", validateHostRuntimeBinding, {
    schema_version: "control-tower.host-runtime.binding/v1", ...ids, loopback_port: 1,
  }],
]

describe("Decision 89 host-runtime public shapes", () => {
  test("publishes exactly five closed v1 validators", () => {
    expect(hostRuntimeSchemaNames).toEqual(cases.map(([name]) => name))
    for (const [, validate, value] of cases) {
      expect(validate(value)).toBe(true)
      expect(validate({ ...value, adapter: "pi" })).toBe(false)
      const required = Object.keys(value).find((field) => field !== "schema_version")
      const missing = { ...value }
      delete missing[required]
      expect(validate(missing)).toBe(false)
      expect(validate({ ...value, schema_version: `${value.schema_version}-wrong` })).toBe(false)
    }
  })

  test("rejects non-canonical identifiers for every kind", () => {
    for (const [, validate, value] of cases) {
      const idFields = Object.keys(value).filter((field) => field.endsWith("_id"))
      for (const field of idFields) {
        const malformed = [value[field].toUpperCase(), value[field].slice(0, -1), ` ${value[field]}`, value[field].replace(/^ct_[^_]+_/, "ct_wrong_")]
        for (const candidate of malformed) expect(validate({ ...value, [field]: candidate })).toBe(false)
      }
    }
  })

  test("accepts only integer loopback ports from 1 through 65535", () => {
    const binding = cases.at(-1)[2]
    for (const port of [1, 65535]) expect(validateHostRuntimeBinding({ ...binding, loopback_port: port })).toBe(true)
    for (const port of [0, 65536, 1.5, "3000"]) expect(validateHostRuntimeBinding({ ...binding, loopback_port: port })).toBe(false)
  })

  test("creates neutral kind-separated identifiers from exactly 16 injected bytes", () => {
    for (const kind of ["runtime", "worktree", "process", "incarnation", "binding"]) {
      expect(createHostRuntimeIdentifier(kind, { randomBytes: () => Uint8Array.from({ length: 16 }, (_, index) => index) }))
        .toBe(`ct_${kind}_000102030405060708090a0b0c0d0e0f`)
    }
    for (const bytes of [new Uint8Array(15), new Uint8Array(17), "sixteen bytes!!!", [0, 1]]) {
      expect(() => createHostRuntimeIdentifier("runtime", { randomBytes: () => bytes })).toThrow()
    }
    expect(() => createHostRuntimeIdentifier("adapter", { randomBytes: () => new Uint8Array(16) })).toThrow()
  })
})
